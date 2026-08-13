import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  ProjectProjectionSchema,
  TaskProjectionSchema,
  type CarrierActivityProjection,
  type CompactProjection,
  type WorkerCardProjection,
} from "../../../autonomy/src/conversation-prompt";
import { loadHome, resolveHome, workspaceFor } from "../home";
import { expandPath } from "../paths";
import { loadPrincipalTasks } from "../tasks";
import { observeWorkspace, requiredGit } from "../workspace";
import { digest, parseTaskReceiptEvidenceRef, type ConversationEvent } from "./contracts";
import { FileConversationJournal } from "./journal";
import {
  attemptCorrelationEvidence,
  listAttemptDirectories,
  type ConversationExecutionCarrierRegistry,
} from "./execution-carrier";

const requireFromHere = createRequire(import.meta.url);

const TASK_SOURCE_REF = "workbench:state/tasks.json";
const PROJECTS_SOURCE_REF = "workbench:config/projects.json";

/**
 * Builds the compact projection the coordinator reads against: the
 * conversation's current Task (from the latest settled task action receipt
 * re-read through the canonical Task source), the registered projects'
 * current primary heads, their exact observed Worktrees, the bounded current
 * worker catalog cards, and the conversation's carriers (live only through an
 * exact retained runtime handle; a retained started attempt without that
 * observation is liveness unknown, never guessed running). Every fact is
 * re-read from its canonical owner at projection time; nothing here is Task
 * state, conversation lifecycle, or semantic intent. The provider never
 * reads Principal message prose.
 */
export interface ConversationContextProvider {
  buildProjection(conversationId: string): Promise<CompactProjection>;
}

export interface ConversationContextProviderOptions {
  /** The exact retained carrier runtime; liveness is claimed only through it. */
  readonly carrierRegistry?: ConversationExecutionCarrierRegistry;
}

export function createConversationContextProvider(
  homeArgument?: string,
  options: ConversationContextProviderOptions = {},
): ConversationContextProvider {
  const home = resolveHome(homeArgument);
  return new WorkbenchConversationContextProvider(home, options.carrierRegistry);
}

class WorkbenchConversationContextProvider implements ConversationContextProvider {
  private readonly home: string;
  private readonly journal: FileConversationJournal;
  private readonly carrierRegistry: ConversationExecutionCarrierRegistry | undefined;

  constructor(home: string, carrierRegistry?: ConversationExecutionCarrierRegistry) {
    this.home = home;
    this.journal = new FileConversationJournal(home);
    this.carrierRegistry = carrierRegistry;
  }

  async buildProjection(conversationId: string): Promise<CompactProjection> {
    const events = await this.journal.readEvents(conversationId);
    const task = this.currentTaskProjection(events);
    const projects = this.registeredProjectProjections();
    const carriers = this.carrierProjections(conversationId);
    const workers = this.workerCardProjections();
    return {
      ...(task === undefined ? {} : { task }),
      ...(projects.length === 0 ? {} : { projects }),
      ...(carriers.length === 0 ? {} : { carriers }),
      ...(workers.length === 0 ? {} : { workers }),
    };
  }

  /**
   * Carriers attributable to this conversation, rebuilt from the retained
   * attempt evidence plus the exact runtime registry: a retained handle that
   * is still running claims live; a retained handle with terminal settlement
   * claims that settlement; a retained started attempt without a matching
   * runtime handle — for example after a server restart — is liveness
   * unknown. Attempt records are never guessed into running state.
   */
  private carrierProjections(conversationId: string): CarrierActivityProjection[] {
    const seen = new Set<string>();
    const projections: CarrierActivityProjection[] = [];
    for (const attemptId of listAttemptDirectories(this.home)) {
      const evidence = attemptCorrelationEvidence(this.home, attemptId);
      if (evidence.correlation?.conversationId !== conversationId) continue;
      seen.add(attemptId);
      projections.push(this.projectCarrier(attemptId, evidence));
    }
    for (const handle of this.carrierRegistry?.carriers() ?? []) {
      if (seen.has(handle.identity.carrierId)) continue;
      if (handle.identity.conversationId !== conversationId) continue;
      projections.push(projectLiveCarrier(handle));
    }
    projections.sort((left, right) => left.id.localeCompare(right.id));
    return projections;
  }

  private projectCarrier(
    attemptId: string,
    evidence: ReturnType<typeof attemptCorrelationEvidence>,
  ): CarrierActivityProjection {
    const handle = this.carrierRegistry?.carrier(attemptId);
    if (handle !== undefined) {
      const liveness = handle.liveness();
      if (liveness.state === "live") {
        return projectLiveCarrier(handle);
      }
      if (liveness.state === "settled") {
        return { id: attemptId, state: carrierSettlementState(liveness.settlement?.status ?? "runner-failed") };
      }
    }
    const settlementPath = join(this.home, "state", "task-attempts", attemptId, "settlement.json");
    if (existsSync(settlementPath)) {
      try {
        const value = JSON.parse(readFileSync(settlementPath, "utf8")) as { status?: unknown };
        if (
          value.status === "recorded"
          || value.status === "runner-failed"
          || value.status === "control-stopped"
        ) {
          return { id: attemptId, state: carrierSettlementState(value.status) };
        }
      } catch {
        // An unreadable settlement is not terminal evidence.
      }
    }
    return { id: attemptId, state: "unknown" };
  }

  /** Bounded current worker catalog cards; availability is copied, never guessed. */
  private workerCardProjections(): WorkerCardProjection[] {
    let cards;
    try {
      cards = currentWorkerCards();
    } catch {
      return [];
    }
    return cards.map((card) => ({
      id: card.id,
      description: card.description,
      labels: [...card.labels],
      provider: card.executionProfile.provider,
      model: card.executionProfile.model,
      ...(card.executionProfile.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: card.executionProfile.reasoningEffort }),
      availability: card.availability.status,
    }));
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

function projectLiveCarrier(handle: {
  identity: { carrierId: string };
  liveness(): { state: string; runId?: string };
}): CarrierActivityProjection {
  const liveness = handle.liveness();
  return {
    id: handle.identity.carrierId,
    state: "live",
    ...(liveness.runId === undefined ? {} : { runId: liveness.runId }),
  };
}

function carrierSettlementState(status: "recorded" | "runner-failed" | "control-stopped"): string {
  return status;
}

/** Current worker policy cards, loaded only when a projection needs them. */
function currentWorkerCards(): Array<{
  id: string;
  labels: readonly string[];
  description: string;
  executionProfile: { provider: string; model: string; reasoningEffort?: string };
  availability: { status: "available" | "unavailable"; reason?: string };
}> {
  return requireFromHere("../../../autonomy/src/worker-policy").currentWorkerCards();
}
