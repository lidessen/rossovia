import { realpathSync } from "node:fs";
import {
  ContributionProjectionSchema,
  ProjectProjectionSchema,
  TaskCardProjectionSchema,
  TaskProjectionSchema,
  type CarrierActivityProjection,
  type ChildSummary,
  type CompactProjection,
  type ContributionProjection,
  type TaskCardCollectionStanding,
  type TaskCardProjection,
  type WorkerCardProjection,
} from "../../../autonomy/src/conversation-prompt";
import type { WorkerCard, WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import { loadHome, resolveHome, workspaceFor } from "../home";
import {
  createLocalTaskControlPlane,
  type LocalTaskReadPort,
} from "../local-task-control-plane";
import { expandPath } from "../paths";
import { attemptLeaseStanding } from "../task-run";
import { readStrictTaskAttemptEvidence } from "../task-attempts";
import { observeWorkspace, requiredGit } from "../workspace";
import {
  digest,
  parseTaskReceiptEvidenceRef,
  taskActionSourceRef,
  type ConversationEvent,
} from "./contracts";
import { FileConversationJournal } from "./journal";
import type { PrincipalTask, PrincipalTasks } from "../contracts";
import {
  listAttemptDirectories,
  type ConversationExecutionCarrierRegistry,
} from "./execution-carrier";
import type { ConversationContributionRegistry } from "./contributions";


const TASK_SOURCE_REF = "workbench:state/tasks.json";
const PROJECTS_SOURCE_REF = "workbench:config/projects.json";

/** The bounded conversation-attributed Task card cap the projection discloses. */
export const DEFAULT_TASK_CARD_CAP = 8;

/**
 * Builds the compact projection the coordinator reads against: the
 * conversation's current Task (from the latest settled task action receipt
 * re-read through the canonical Task source), the bounded conversation-
 * attributed Task cards deduplicated from the settled Task action lineage and
 * re-read from the current Task source with an explicit completeness
 * standing, the registered projects' current primary heads, their exact
 * observed Worktrees, the bounded current worker catalog cards, and the
 * conversation's carriers (live only through an exact retained runtime
 * handle; a retained started attempt without that observation is liveness
 * unknown, never guessed running). Every fact is re-read from its canonical
 * owner at projection time; nothing here is Task state, conversation
 * lifecycle, or semantic intent. The provider never reads Principal message
 * prose.
 */
export interface ConversationContextProvider {
  buildProjection(conversationId: string): Promise<CompactProjection>;
  /**
   * Bounded summaries of the conversation's settled, still-current child
   * contributions. Full child evidence enters a turn only through an exact
   * keyed result-read.
   */
  buildChildren(conversationId: string): Promise<readonly ChildSummary[]>;
}

export interface ConversationContextProviderOptions {
  /** Create the canonical Task read port for this provider's resolved home. */
  readonly taskReadPortFactory?: (home: string) => LocalTaskReadPort;
  /** The exact retained carrier runtime; liveness is claimed only through it. */
  readonly carrierRegistry?: ConversationExecutionCarrierRegistry;
  /** The exact retained temporary contribution runtime. */
  readonly contributionRegistry?: ConversationContributionRegistry;
  /** Test seam: the exact catalog whose cards the projection discloses. */
  readonly catalog?: WorkerCatalog;
  /** Test seam: the bounded card cap; the default is the production policy cap. */
  readonly maxTaskCards?: number;
}

export function createConversationContextProvider(
  homeArgument?: string,
  options: ConversationContextProviderOptions = {},
): ConversationContextProvider {
  const home = resolveHome(homeArgument);
  return new WorkbenchConversationContextProvider(home, options);
}

class WorkbenchConversationContextProvider implements ConversationContextProvider {
  private readonly home: string;
  private readonly journal: FileConversationJournal;
  private readonly taskReadPort: LocalTaskReadPort;
  private readonly carrierRegistry: ConversationExecutionCarrierRegistry | undefined;
  private readonly contributionRegistry: ConversationContributionRegistry | undefined;
  private readonly catalog: WorkerCatalog | undefined;
  private readonly maxTaskCards: number;

  constructor(home: string, options: ConversationContextProviderOptions) {
    this.home = home;
    this.journal = new FileConversationJournal(home);
    const taskReadPortFactory = options.taskReadPortFactory ?? createLocalTaskControlPlane;
    this.taskReadPort = taskReadPortFactory(home);
    this.carrierRegistry = options.carrierRegistry;
    this.contributionRegistry = options.contributionRegistry;
    this.catalog = options.catalog;
    this.maxTaskCards = options.maxTaskCards ?? DEFAULT_TASK_CARD_CAP;
  }

  async buildProjection(conversationId: string): Promise<CompactProjection> {
    const events = await this.journal.readEvents(conversationId);
    let tasks: PrincipalTasks | undefined;
    try {
      tasks = this.taskReadPort.list();
    } catch {
      tasks = undefined;
    }
    const task = this.currentTaskProjection(events, tasks);
    const cards = this.taskCardProjections(conversationId, events, tasks);
    const projects = this.registeredProjectProjections();
    const carriers = this.carrierProjections(conversationId, tasks);
    const workers = this.workerCardProjections();
    const contributions = await this.contributionProjections(conversationId);
    return {
      ...(task === undefined ? {} : { task }),
      ...(cards.cards.length === 0 ? {} : { taskCards: cards.cards }),
      taskCardStanding: cards.standing,
      ...(projects.length === 0 ? {} : { projects }),
      ...(carriers.length === 0 ? {} : { carriers }),
      ...(workers.length === 0 ? {} : { workers }),
      ...(contributions.length === 0 ? {} : { contributions }),
    };
  }

  buildChildren(conversationId: string): Promise<readonly ChildSummary[]> {
    if (this.contributionRegistry === undefined) return Promise.resolve([]);
    return this.contributionRegistry.listSettledChildSummaries(conversationId);
  }

  /** Durable contribution liveness re-read through the exact contribution runtime. */
  private async contributionProjections(conversationId: string): Promise<ContributionProjection[]> {
    if (this.contributionRegistry === undefined) return [];
    const contributions = await this.contributionRegistry.listContributions(conversationId);
    return contributions.map((contribution) => ContributionProjectionSchema.parse({
      batchId: contribution.batchId,
      key: contribution.key,
      workerId: contribution.workerId,
      effectKind: contribution.effectKind,
      state: contribution.state,
      ...(contribution.status === undefined ? {} : { status: contribution.status }),
    }));
  }

  /**
   * Carriers attributable to this conversation, rebuilt from the retained
   * attempt evidence plus the exact runtime registry: a retained handle that
   * is still running claims live; a retained handle with durable terminal
   * settlement claims that settlement; a handle whose terminal evidence
   * retention failed claims a visible unresolved standing; a retained
   * started attempt without a matching runtime handle — for example after a
   * server restart — is liveness unknown. Attempt records are never guessed
   * into running state, and invalid or mismatched evidence is never guessed
   * into a settlement. The exact Task identity is correlated from the
   * runtime-retained carrier identity or strict available attempt evidence,
   * and its registered project identity is re-read from the current Task
   * source; without that support the carrier projects unknown/uninspectable
   * with no correlation, never guessed.
   */
  private carrierProjections(
    conversationId: string,
    tasks: PrincipalTasks | undefined,
  ): CarrierActivityProjection[] {
    const seen = new Set<string>();
    const projections: CarrierActivityProjection[] = [];
    for (const attemptId of listAttemptDirectories(this.home)) {
      const evidence = readStrictTaskAttemptEvidence(this.home, attemptId);
      if (evidence.attempt?.correlation?.conversationId !== conversationId) continue;
      seen.add(attemptId);
      projections.push(this.projectCarrier(attemptId, evidence, tasks));
    }
    for (const handle of this.carrierRegistry?.carriers() ?? []) {
      if (seen.has(handle.identity.carrierId)) continue;
      if (handle.identity.conversationId !== conversationId) continue;
      projections.push(projectLiveCarrier(handle, tasks));
    }
    projections.sort((left, right) => left.id.localeCompare(right.id));
    return projections;
  }

  private projectCarrier(
    attemptId: string,
    evidence: ReturnType<typeof readStrictTaskAttemptEvidence>,
    tasks: PrincipalTasks | undefined,
  ): CarrierActivityProjection {
    const handle = this.carrierRegistry?.carrier(attemptId);
    if (handle !== undefined) {
      const liveness = handle.liveness();
      if (liveness.state === "live") {
        return projectLiveCarrier(handle, tasks);
      }
      const correlation = taskProjectId(tasks, handle.identity.taskId);
      return {
        id: attemptId,
        state: liveness.state === "settled" ? liveness.settlement.status : "unresolved",
        taskId: handle.identity.taskId,
        ...(correlation === undefined ? {} : { projectId: correlation }),
      };
    }
    const taskId = evidence.standing === "available" && evidence.attempt !== undefined
      ? evidence.attempt.taskId
      : undefined;
    const state = this.carrierEvidenceState(attemptId, evidence);
    const projectId = taskId === undefined ? undefined : taskProjectId(tasks, taskId);
    return {
      id: attemptId,
      state,
      ...(taskId === undefined ? {} : { taskId }),
      ...(projectId === undefined ? {} : { projectId }),
    };
  }

  /** The carrier state from strict evidence alone, never guessed into settlement. */
  private carrierEvidenceState(
    attemptId: string,
    evidence: ReturnType<typeof readStrictTaskAttemptEvidence>,
  ): string {
    if (evidence.standing !== "available") {
      // Invalid or mismatched evidence projects unknown, never settled.
      return "unknown";
    }
    const attempt = evidence.attempt;
    if (attempt === undefined) {
      return "unknown";
    }
    if (evidence.settlement !== undefined) {
      // A valid settlement is terminal only after the exact lease release
      // succeeded; a still-retained exact lease is reconcile-required.
      const lease = attemptLeaseStanding(this.home, attempt.taskId, attemptId);
      return lease === "released" ? evidence.settlement.status : "unknown";
    }
    return "unknown";
  }

  /** Bounded current worker catalog cards; availability is copied, never guessed. */
  private workerCardProjections(): WorkerCardProjection[] {
    if (this.catalog !== undefined) {
      return this.catalog.list([]).map((card) => cardProjection(card));
    }
    let cards;
    try {
      cards = currentWorkerCards();
    } catch {
      return [];
    }
    return cards.map(cardProjection);
  }

  private currentTaskProjection(
    events: readonly ConversationEvent[],
    tasks: PrincipalTasks | undefined,
  ): CompactProjection["task"] {
    const latest = latestSettledTaskAction(events);
    if (latest === undefined || tasks === undefined) return undefined;
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
      status: task.lifecycle,
      ...(corrections.length === 0 ? {} : { corrections }),
      ...this.taskExecutionSelectors(task),
    });
  }

  /**
   * The bounded conversation-attributed Task card set plus its explicit
   * completeness standing, derived from the canonical settled Task action
   * lineage (task_create/task_correct/task_continue receipts) and re-read
   * from the current Task source. Every standing — cap-exceeded partial,
   * unreadable source, missing receipt, unresolvable receipt, or no lineage
   * — is disclosed explicitly; a bounded disclosure is never converted into
   * a factual claim that no Task exists.
   */
  private taskCardProjections(
    conversationId: string,
    events: readonly ConversationEvent[],
    tasks: PrincipalTasks | undefined,
  ): { cards: TaskCardProjection[]; standing: TaskCardCollectionStanding } {
    const entries = settledTaskActionEntries(events);
    const unresolved: string[] = [];
    const continueByIdentity = this.continueTaskIdentities();
    const byId = new Map<string, SettledTaskActionEntry>();
    for (const entry of entries) {
      if (entry.kind === "task_continue") {
        const identity = continueByIdentity.get(taskActionSourceRef(conversationId, entry.actionId));
        if (identity?.taskId === undefined) {
          unresolved.push(
            `the settled task_continue receipt of action ${entry.actionId} has no strict owner-backed Task identity`,
          );
          continue;
        }
        deduplicateLineage(byId, { ...entry, taskId: identity.taskId });
        continue;
      }
      if (entry.taskId === undefined) {
        unresolved.push(
          `the settled ${entry.kind} receipt of action ${entry.actionId} carries no canonical Task receipt reference`,
        );
        continue;
      }
      deduplicateLineage(byId, entry);
    }

    const known = byId.size;
    if (known === 0 && unresolved.length === 0) {
      return {
        cards: [],
        standing: {
          state: "omitted",
          reason: "the conversation has no settled Task action lineage",
          disclosed: 0,
        },
      };
    }
    if (tasks === undefined) {
      return {
        cards: [],
        standing: {
          state: "unavailable",
          reason: "the canonical Task source cannot be read; the conversation-attributed Tasks are not projected",
          known,
        },
      };
    }
    const ordered = [...byId.values()].sort((left, right) => right.sequence - left.sequence);
    const missing: string[] = [];
    const cards: TaskCardProjection[] = [];
    let omitted = 0;
    for (const entry of ordered) {
      const task = tasks.tasks.find(
        (candidate) => candidate.id.toLowerCase() === entry.taskId!.toLowerCase(),
      );
      if (task === undefined) {
        missing.push(`the lineage receipt for task ${entry.taskId} is missing from the current Task source`);
        continue;
      }
      if (cards.length >= this.maxTaskCards) {
        omitted += 1;
        continue;
      }
      cards.push(this.projectTaskCard(task, tasks));
    }
    const disclosed = cards.length;
    let standing: TaskCardCollectionStanding;
    if (unresolved.length > 0 || missing.length > 0) {
      standing = {
        state: "partial",
        reason: [...unresolved, ...missing].join("; "),
        cap: this.maxTaskCards,
        disclosed,
        known,
        ...(omitted === 0 ? {} : { omitted }),
      };
    } else if (omitted > 0) {
      standing = {
        state: "partial",
        reason: `the bounded card cap omits ${omitted} further conversation-attributed Task(s)`,
        cap: this.maxTaskCards,
        disclosed,
        known,
        omitted,
      };
    } else {
      standing = { state: "complete", cap: this.maxTaskCards, disclosed, known };
    }
    return { cards, standing };
  }

  /**
   * One strict read of every conversation-attributed Task attempt, mapping
   * the attempt's causal action source reference to its exact Task identity.
   * Only a strict available attempt evidence family supports the identity;
   * an invalid or mismatched family yields no identity, never a guess.
   */
  private continueTaskIdentities(): Map<string, { taskId?: string }> {
    const identities = new Map<string, { taskId?: string }>();
    for (const attemptId of listAttemptDirectories(this.home)) {
      const evidence = readStrictTaskAttemptEvidence(this.home, attemptId);
      const sourceRef = evidence.attempt?.correlation?.sourceRef;
      if (sourceRef === undefined) continue;
      if (identities.has(sourceRef)) continue;
      identities.set(sourceRef, {
        ...(evidence.standing === "available" && evidence.attempt !== undefined
          ? { taskId: evidence.attempt.taskId }
          : {}),
      });
    }
    return identities;
  }

  /**
   * One bounded conversation-attributed Task card re-read from the current
   * Task source: the exact task identity, current source and task revisions,
   * lifecycle standing, bounded summary, the registered project identity from
   * the canonical binding, and the exact execution selection only when it can
   * be re-read from the canonical owners.
   */
  private projectTaskCard(task: PrincipalTask, tasks: PrincipalTasks): TaskCardProjection {
    return TaskCardProjectionSchema.parse({
      id: task.id,
      sourceRevision: String(tasks.sourceRevision),
      revision: task.revision,
      source: { ref: TASK_SOURCE_REF, digest: digest(tasks) },
      summary: `${task.title}: ${task.objective}`.slice(0, 800),
      status: task.lifecycle,
      ...(task.binding.kind === "project-context" ? { projectId: task.binding.projectId } : {}),
      ...this.taskExecutionSelectors(task),
    });
  }

  /**
   * The exact execution selection a bound task exposes to the coordinator:
   * the registered project identity, its current primary head, the exact
   * observed Worktree path, and its current head. Selectors appear only when
   * every fact can be re-read from the canonical owners; a partial or
   * unreadable selection is omitted so the coordinator can never copy a
   * guessed route.
   */
  private taskExecutionSelectors(task: PrincipalTask): {
    projectId?: string;
    primaryHead?: string;
    worktreePath?: string;
    worktreeHead?: string;
  } {
    if (task.binding.kind !== "project-context") {
      return {};
    }
    const binding = task.binding;
    const configuredWorktree = binding.worktreePath;
    if (configuredWorktree === undefined) return {};
    let current;
    try {
      current = loadHome(this.home);
    } catch {
      return {};
    }
    const project = current.projects.projects.find(
      (candidate) => candidate.id === binding.projectId,
    );
    if (project === undefined) return {};
    try {
      const workspace = workspaceFor(current.workspaces, project.id);
      const observation = observeWorkspace(project, workspace);
      if (observation.head === null) return {};
      const worktrees = observedWorktrees(observation.path);
      const bound = worktrees.find(
        (candidate) => candidate.path === realpathSync(expandPath(configuredWorktree)),
      );
      if (bound === undefined) return {};
      return {
        projectId: project.id,
        primaryHead: observation.head,
        worktreePath: bound.path,
        worktreeHead: bound.head,
      };
    } catch {
      return {};
    }
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

/**
 * The most recent settled task create/correct receipt, by journal sequence:
 * the one journal-derived current Task identity shared by the coordinator's
 * projection and by any effect that must derive the conversation's current
 * Task immediately before acting.
 */
export function latestSettledTaskAction(
  events: readonly ConversationEvent[],
): { taskId: string; sourceRevision: number } | undefined {
  let latest: { taskId: string; sourceRevision: number } | undefined;
  for (const entry of settledTaskActionEntries(events)) {
    if (entry.kind === "task_continue") continue;
    if (entry.taskId === undefined || entry.sourceRevision === undefined) continue;
    latest = { taskId: entry.taskId, sourceRevision: entry.sourceRevision };
  }
  return latest;
}

/**
 * One settled Task-action lineage entry, by journal sequence: every settled
 * task_create/task_correct/task_continue receipt the conversation committed.
 * A create/correct receipt carries the canonical Task receipt reference;
 * a continue receipt's Task identity is resolved separately through its
 * strict owner-backed attempt evidence, so it stays without `taskId` here.
 */
export interface SettledTaskActionEntry {
  readonly actionId: string;
  readonly kind: "task_create" | "task_correct" | "task_continue";
  readonly sequence: number;
  readonly taskId?: string;
  readonly sourceRevision?: number;
}

export function settledTaskActionEntries(
  events: readonly ConversationEvent[],
): SettledTaskActionEntry[] {
  const requestedKinds = new Map<string, "task_create" | "task_correct" | "task_continue">();
  for (const event of events) {
    if (event.type !== "action.requested") continue;
    if (
      event.data.kind === "task_create"
      || event.data.kind === "task_correct"
      || event.data.kind === "task_continue"
    ) {
      requestedKinds.set(event.data.actionId, event.data.kind);
    }
  }
  const entries: SettledTaskActionEntry[] = [];
  for (const event of events) {
    if (event.type !== "action.settled") continue;
    const kind = requestedKinds.get(event.data.actionId);
    if (kind === undefined) continue;
    let taskId: string | undefined;
    let sourceRevision: number | undefined;
    if (kind === "task_create" || kind === "task_correct") {
      for (const ref of event.data.evidenceRefs) {
        const parsed = parseTaskReceiptEvidenceRef(ref);
        if (parsed === null) continue;
        taskId = parsed.taskId;
        sourceRevision = parsed.sourceRevision;
        break;
      }
    }
    entries.push({
      actionId: event.data.actionId,
      kind,
      sequence: event.sequence,
      ...(taskId === undefined ? {} : { taskId }),
      ...(sourceRevision === undefined ? {} : { sourceRevision }),
    });
  }
  entries.sort((left, right) => left.sequence - right.sequence);
  return entries;
}

/** Keep the lineage entry with the greatest journal sequence per Task identity. */
function deduplicateLineage(
  byId: Map<string, SettledTaskActionEntry>,
  entry: SettledTaskActionEntry,
): void {
  const key = entry.taskId!.toLowerCase();
  const prior = byId.get(key);
  if (prior === undefined || entry.sequence > prior.sequence) byId.set(key, entry);
}

/** The registered project identity of one Task re-read from the current source, when bound. */
function taskProjectId(tasks: PrincipalTasks | undefined, taskId: string): string | undefined {
  if (tasks === undefined) return undefined;
  const task = tasks.tasks.find((candidate) => candidate.id.toLowerCase() === taskId.toLowerCase());
  if (task === undefined || task.binding.kind !== "project-context") return undefined;
  return task.binding.projectId;
}

/**
 * Exact observed Worktrees of one primary workspace, each at its current
 * head with its exact role (`primary` for the registered project's primary
 * workspace, `linked` otherwise) and its current clean standing. Clean is
 * true only when the canonical Git status observation succeeded and reported
 * no change; an unreadable cleanliness is projected as not clean, never
 * guessed into a runnable selector.
 */
export function observedWorktrees(
  primaryWorkspace: string,
): { path: string; head: string; role: "primary" | "linked"; clean: boolean }[] {
  let primaryPath: string;
  try {
    primaryPath = realpathSync(expandPath(primaryWorkspace));
  } catch {
    primaryPath = expandPath(primaryWorkspace);
  }
  const records = requiredGit(["worktree", "list", "--porcelain"], primaryWorkspace)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => expandPath(line.slice("worktree ".length)));
  const worktrees: { path: string; head: string; role: "primary" | "linked"; clean: boolean }[] = [];
  for (const record of records) {
    try {
      const path = realpathSync(record);
      const head = requiredGit(["rev-parse", "HEAD"], path);
      if (!/^[0-9a-f]{40}$/u.test(head)) continue;
      let status: string | null;
      try {
        status = requiredGit(["status", "--porcelain"], path) ?? "";
      } catch {
        status = null;
      }
      worktrees.push({
        path,
        head,
        role: path === primaryPath ? "primary" : "linked",
        clean: status !== null && status.trim().length === 0,
      });
    } catch {
      // A worktree without a readable current head cannot be bound exactly.
    }
  }
  worktrees.sort((left, right) => left.path.localeCompare(right.path));
  return worktrees;
}

function projectLiveCarrier(
  handle: {
    identity: { carrierId: string; taskId: string };
    liveness(): { state: string; runId?: string };
  },
  tasks: PrincipalTasks | undefined,
): CarrierActivityProjection {
  const liveness = handle.liveness();
  const projectId = taskProjectId(tasks, handle.identity.taskId);
  return {
    id: handle.identity.carrierId,
    state: "live",
    ...(liveness.runId === undefined ? {} : { runId: liveness.runId }),
    taskId: handle.identity.taskId,
    ...(projectId === undefined ? {} : { projectId }),
  };
}

/** Current worker policy cards, loaded only when a projection needs them. */
function currentWorkerCards(): Array<{
  id: string;
  labels: readonly string[];
  description: string;
  executionProfile: { provider: string; model: string; reasoningEffort?: string };
  availability: { status: "available" | "unavailable"; reason?: string };
}> {
  return require("../../../autonomy/src/worker-policy").currentWorkerCards();
}

function cardProjection(card: {
  id: string;
  labels: readonly string[];
  description: string;
  executionProfile: { provider: string; model: string; reasoningEffort?: string | undefined };
  availability: { status: "available" | "unavailable"; reason?: string | undefined };
}): WorkerCardProjection {
  return {
    id: card.id,
    description: card.description,
    labels: [...card.labels],
    provider: card.executionProfile.provider,
    model: card.executionProfile.model,
    ...(card.executionProfile.reasoningEffort === undefined
      ? {}
      : { reasoningEffort: card.executionProfile.reasoningEffort }),
    availability: card.availability.status,
  };
}
