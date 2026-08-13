import { realpathSync } from "node:fs";
import {
  ProjectProjectionSchema,
  TaskProjectionSchema,
  type CompactProjection,
} from "../../../autonomy/src/conversation-prompt";
import { loadHome, resolveHome, workspaceFor } from "../home";
import { expandPath } from "../paths";
import { loadPrincipalTasks } from "../tasks";
import { observeWorkspace, requiredGit } from "../workspace";
import { digest, parseTaskReceiptEvidenceRef, type ConversationEvent } from "./contracts";
import { FileConversationJournal } from "./journal";

const TASK_SOURCE_REF = "workbench:state/tasks.json";
const PROJECTS_SOURCE_REF = "workbench:config/projects.json";

/**
 * Builds the compact projection the coordinator reads against: the
 * conversation's current Task (from the latest settled task action receipt
 * re-read through the canonical Task source), the registered projects'
 * current primary heads, and their exact observed Worktrees. Every fact is
 * re-read from its canonical owner at projection time; nothing here is Task
 * state, conversation lifecycle, or semantic intent. The provider never
 * reads Principal message prose.
 */
export interface ConversationContextProvider {
  buildProjection(conversationId: string): Promise<CompactProjection>;
}

export function createConversationContextProvider(homeArgument?: string): ConversationContextProvider {
  const home = resolveHome(homeArgument);
  return new WorkbenchConversationContextProvider(home);
}

class WorkbenchConversationContextProvider implements ConversationContextProvider {
  private readonly home: string;
  private readonly journal: FileConversationJournal;

  constructor(home: string) {
    this.home = home;
    this.journal = new FileConversationJournal(home);
  }

  async buildProjection(conversationId: string): Promise<CompactProjection> {
    const events = await this.journal.readEvents(conversationId);
    const task = this.currentTaskProjection(events);
    const projects = this.registeredProjectProjections();
    return {
      ...(task === undefined ? {} : { task }),
      ...(projects.length === 0 ? {} : { projects }),
    };
  }

  private currentTaskProjection(events: readonly ConversationEvent[]): CompactProjection["task"] {
    const latest = latestSettledTaskAction(events);
    if (latest === undefined) return undefined;
    let tasks;
    try {
      tasks = loadPrincipalTasks(this.home);
    } catch {
      return undefined;
    }
    const task = tasks.tasks.find((candidate) => candidate.id.toLowerCase() === latest.taskId.toLowerCase());
    if (task === undefined) return undefined;
    const corrections = task.corrections
      .slice(-5)
      .map((correction) => ({ id: correction.id, summary: correction.statement.slice(0, 500) }));
    return TaskProjectionSchema.parse({
      id: task.id,
      sourceRevision: String(tasks.sourceRevision),
      revision: task.revision,
      source: { ref: TASK_SOURCE_REF, digest: digest(tasks) },
      summary: `${task.title}: ${task.objective}`.slice(0, 800),
      status: task.lifecycle === "settled" ? "settled" : "open",
      ...(corrections.length === 0 ? {} : { corrections }),
    });
  }

  private registeredProjectProjections(): NonNullable<CompactProjection["projects"]> {
    let current;
    try {
      current = loadHome(this.home);
    } catch {
      return [];
    }
    const projections: NonNullable<CompactProjection["projects"]> = [];
    for (const project of current.projects.projects) {
      try {
        const workspace = workspaceFor(current.workspaces, project.id);
        const observation = observeWorkspace(project, workspace);
        const worktrees = observedWorktrees(observation.path);
        if (worktrees.length === 0) continue;
        const name = project.aliases[0] ?? project.id;
        projections.push(ProjectProjectionSchema.parse({
          name,
          id: project.id,
          status: "registered",
          ...(observation.head === null ? {} : { primaryHead: observation.head }),
          source: { ref: PROJECTS_SOURCE_REF, digest: digest(current.projects) },
          worktrees,
        }));
      } catch {
        // A registered project whose current observation fails is unusable
        // for the coordinator; an attempt to use it still fails visibly at
        // the effect, where the host re-verifies against fresh sources.
      }
    }
    return projections;
  }
}

/** The most recent settled task create/correct receipt, by journal sequence. */
function latestSettledTaskAction(
  events: readonly ConversationEvent[],
): { taskId: string; sourceRevision: number } | undefined {
  const requestedKinds = new Map<string, "task_create" | "task_correct">();
  for (const event of events) {
    if (event.type !== "action.requested") continue;
    if (event.data.kind === "task_create" || event.data.kind === "task_correct") {
      requestedKinds.set(event.data.actionId, event.data.kind);
    }
  }
  let latest: { taskId: string; sourceRevision: number; sequence: number } | undefined;
  for (const event of events) {
    if (event.type !== "action.settled") continue;
    if (!requestedKinds.has(event.data.actionId)) continue;
    for (const ref of event.data.evidenceRefs) {
      const parsed = parseTaskReceiptEvidenceRef(ref);
      if (parsed === null) continue;
      if (latest === undefined || event.sequence > latest.sequence) {
        latest = { ...parsed, sequence: event.sequence };
      }
    }
  }
  return latest === undefined
    ? undefined
    : { taskId: latest.taskId, sourceRevision: latest.sourceRevision };
}

/** Exact observed Worktrees of one primary workspace, each at its current head. */
function observedWorktrees(primaryWorkspace: string): { path: string; head: string }[] {
  const records = requiredGit(["worktree", "list", "--porcelain"], primaryWorkspace)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => expandPath(line.slice("worktree ".length)));
  const worktrees: { path: string; head: string }[] = [];
  for (const record of records) {
    try {
      const path = realpathSync(record);
      const head = requiredGit(["rev-parse", "HEAD"], path);
      if (/^[0-9a-f]{40}$/u.test(head)) worktrees.push({ path, head });
    } catch {
      // A worktree without a readable current head cannot be bound exactly.
    }
  }
  worktrees.sort((left, right) => left.path.localeCompare(right.path));
  return worktrees;
}
