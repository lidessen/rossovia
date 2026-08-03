import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import {
  PrincipalTaskCorrectionDeliverySchema,
  PrincipalTaskResultEvidenceSchema,
  PrincipalTasksSchema,
  type AutonomyEffectVerificationSelector,
  type PrincipalTask,
  type PrincipalTaskBinding,
  type PrincipalTaskCorrectionDelivery,
  type PrincipalTaskResultEvidence,
  type PrincipalTaskResultClaim,
  type PrincipalTasks,
} from "./contracts";
import {
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
  type ExecutionAuthorizationReceipt,
} from "./execution-authorization";
import {
  executionAuthorizationClaimPath,
  ExecutionAuthorizationClaimSchema,
  validateExecutionAuthorizationClaim,
} from "./execution-authorization-claim";
import { loadHome, loadJson, resolveHome, saveJson, workspaceFor } from "./home";
import { loadMissionRecord } from "./missions";
import { expandPath } from "./paths";
import { registeredProjectByQuery } from "./projects";
import { requiredGit } from "./workspace";
import {
  sameWorkbenchTaskExecutionContextRef,
  workbenchTaskExecutionContextFor,
  workbenchTaskExecutionContextRef,
} from "./task-execution-context";

export interface TaskCreateArguments {
  title: string;
  objective: string;
  acceptance: string[];
  nextActor: Exclude<PrincipalTask["nextActor"], "none">;
  sourceRef: string;
  expectedSourceRevision: number;
  project?: string;
  worktree?: string;
  mission?: string;
}

interface TaskMutationExpectation {
  id: string;
  expectedSourceRevision: number;
  expectedRevision: number;
}

export interface TaskAssignArguments extends TaskMutationExpectation {
  nextActor: Exclude<PrincipalTask["nextActor"], "none">;
}

export interface TaskCorrectArguments extends TaskMutationExpectation {
  statement: string;
  sourceRef: string;
  nextActor: Exclude<PrincipalTask["nextActor"], "none">;
}

export interface TaskSubmitArguments extends TaskMutationExpectation {
  summary: string;
  evidenceRefs: string[];
  evidence?: PrincipalTaskResultEvidence;
  sourceRef: string;
}

export interface TaskAcceptArguments extends TaskMutationExpectation {
  sourceRef: string;
  runtimeVerificationSelector?: AutonomyEffectVerificationSelector;
}

export interface TaskReopenArguments extends TaskMutationExpectation {
  statement: string;
  sourceRef: string;
  nextActor: Exclude<PrincipalTask["nextActor"], "none">;
}

export interface TaskLinkExecutionArguments extends TaskMutationExpectation {
  authorizationId: string;
  sourceRef: string;
}

export interface TaskRebindWorktreeArguments extends TaskMutationExpectation {
  expectedWorktreePath: string;
  worktree: string;
  sourceRef: string;
}

export interface TaskRecordCorrectionDeliveryArguments extends TaskMutationExpectation {
  correctionId: string;
  authorizationId: string;
  proposalDigest: string;
  claimSourceRef: string;
  missionId: string;
  inputId: string;
  inputEventId: string;
  inputWatermark: number;
  payloadDigest: string;
  recordedAt: string;
  sourceRef: string;
  deliveredViaRunnerId: string;
}

export interface TaskMutationResult {
  sourceRevision: number;
  task: PrincipalTask;
}

export type PrincipalTaskErrorCode =
  | "task-not-found"
  | "task-drift"
  | "invalid-transition"
  | "source-unavailable";

export class PrincipalTaskError extends Error {
  constructor(
    readonly code: PrincipalTaskErrorCode,
    message: string,
    options: ErrorOptions = {},
  ) {
    super(message, options);
  }
}

export function principalTasksPath(homeArgument?: string): string {
  return join(resolveHome(homeArgument), "state", "tasks.json");
}

export function loadPrincipalTasks(homeArgument?: string): PrincipalTasks {
  return readPrincipalTaskSource(homeArgument).source;
}

export function listPrincipalTasks(homeArgument?: string): PrincipalTasks {
  return loadPrincipalTasks(homeArgument);
}

export function showPrincipalTask(homeArgument: string | undefined, idArgument: string): {
  sourceRevision: number;
  task: PrincipalTask;
} {
  const source = loadPrincipalTasks(homeArgument);
  return {
    sourceRevision: source.sourceRevision,
    task: taskById(source, idArgument),
  };
}

export function createPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskCreateArguments,
): TaskMutationResult {
  const { current, source } = readPrincipalTaskSource(homeArgument);
  assertSourceRevision(source, arguments_.expectedSourceRevision);
  const timestamp = now();
  const task: PrincipalTask = {
    id: randomUUID(),
    title: nonempty(arguments_.title, "task title"),
    objective: nonempty(arguments_.objective, "task objective"),
    acceptance: nonemptyList(arguments_.acceptance, "task acceptance"),
    origin: {
      kind: "principal-explicit",
      sourceRef: nonempty(arguments_.sourceRef, "task source ref"),
    },
    binding: bindingFor(
      current,
      arguments_.project,
      arguments_.worktree,
      arguments_.mission,
    ),
    lifecycle: "open",
    nextActor: arguments_.nextActor,
    revision: 1,
    corrections: [],
    resultClaims: [],
    executionLinks: [],
    worktreeRebindings: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  source.tasks.push(task);
  source.tasks.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  source.sourceRevision += 1;
  persistPrincipalTasks(current.home, source, current.projects.projects.map((project) => project.id));
  return { sourceRevision: source.sourceRevision, task };
}

export function assignPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskAssignArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task) => {
    assertUnsettled(task, "assign");
    if (task.lifecycle === "verifying") {
      throw new Error(`task ${task.id} has a submitted result awaiting Principal acceptance; correct it instead of reassigning it`);
    }
    task.nextActor = arguments_.nextActor;
  });
}

export function correctPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskCorrectArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp) => {
    assertUnsettled(task, "correct");
    supersedeSubmittedClaim(task, timestamp, "correction");
    task.corrections.push({
      id: randomUUID(),
      at: timestamp,
      statement: nonempty(arguments_.statement, "task correction"),
      sourceRef: nonempty(arguments_.sourceRef, "task correction source ref"),
      deliveries: [],
    });
    task.lifecycle = "open";
    task.nextActor = arguments_.nextActor;
  });
}

export function submitPrincipalTaskResult(
  homeArgument: string | undefined,
  arguments_: TaskSubmitArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp) => {
    assertUnsettled(task, "submit");
    if (task.lifecycle === "verifying" || submittedClaim(task) !== undefined) {
      throw new Error(`task ${task.id} already has a submitted result awaiting Principal acceptance`);
    }
    task.resultClaims.push({
      id: randomUUID(),
      submittedAt: timestamp,
      summary: nonempty(arguments_.summary, "task result summary"),
      evidenceRefs: nonemptyList(arguments_.evidenceRefs, "task result evidence"),
      evidence: PrincipalTaskResultEvidenceSchema.parse(
        arguments_.evidence ?? { kind: "agent-references-unverified" },
      ),
      sourceRef: nonempty(arguments_.sourceRef, "task result source ref"),
      standing: "submitted",
      resolution: null,
    });
    task.lifecycle = "verifying";
    task.nextActor = "principal";
  });
}

export function acceptPrincipalTaskResult(
  homeArgument: string | undefined,
  arguments_: TaskAcceptArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp) => {
    if (task.lifecycle !== "verifying") {
      throw new Error(`task ${task.id} is ${task.lifecycle}; only a verifying task may be accepted`);
    }
    const claim = submittedClaim(task);
    if (claim === undefined) {
      throw new Error(`task ${task.id} has no submitted result claim`);
    }
    if (claim.evidence.kind === "runtime-verified-effect") {
      if (
        arguments_.runtimeVerificationSelector === undefined
        || !sameRuntimeVerificationSelector(
          claim.evidence.selector,
          arguments_.runtimeVerificationSelector,
        )
      ) {
        throw new Error(
          `task ${task.id} runtime-verified result must be revalidated through the live Workbench before acceptance`,
        );
      }
    } else if (arguments_.runtimeVerificationSelector !== undefined) {
      throw new Error(
        `task ${task.id} unverified result claim cannot be accepted as runtime-verified`,
      );
    }
    claim.standing = "accepted";
    claim.resolution = {
      kind: "accepted",
      at: timestamp,
      sourceRef: nonempty(arguments_.sourceRef, "task acceptance source ref"),
      acceptanceBoundary: "workbench-local-task-only",
      basis: claim.evidence.kind === "runtime-verified-effect"
        ? "runtime-verified-effect"
        : "agent-claim",
    };
    task.lifecycle = "settled";
    task.nextActor = "none";
  });
}

export function reopenPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskReopenArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp) => {
    if (task.lifecycle !== "settled") {
      throw new Error(`task ${task.id} is ${task.lifecycle}; only a settled task may reopen`);
    }
    task.corrections.push({
      id: randomUUID(),
      at: timestamp,
      statement: nonempty(arguments_.statement, "task reopen statement"),
      sourceRef: nonempty(arguments_.sourceRef, "task reopen source ref"),
      deliveries: [],
    });
    task.lifecycle = "open";
    task.nextActor = arguments_.nextActor;
  });
}

export function linkPrincipalTaskExecution(
  homeArgument: string | undefined,
  arguments_: TaskLinkExecutionArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp, home, source) => {
    if (task.binding.kind !== "project-context" || task.binding.missionId === undefined) {
      throw new PrincipalTaskError(
        "invalid-transition",
        `task ${task.id} requires exact registered project and Mission context before execution can be linked`,
      );
    }
    if (task.lifecycle === "settled" || task.lifecycle === "verifying") {
      throw new PrincipalTaskError(
        "invalid-transition",
        `task ${task.id} is ${task.lifecycle}; execution may link only while work remains active`,
      );
    }
    if (task.executionLinks.some((link) => link.authorizationId === arguments_.authorizationId)) {
      throw new PrincipalTaskError(
        "invalid-transition",
        `task ${task.id} already links execution authorization ${arguments_.authorizationId}`,
      );
    }

    const claimPath = executionAuthorizationClaimPath(home, arguments_.authorizationId);
    const claim = readExecutionEvidence(
      claimPath,
      ExecutionAuthorizationClaimSchema,
      "claim",
    );
    const receiptPath = join(home, claim.receipt.ref);
    const expectedReceiptPath = executionAuthorizationReceiptPath(
      home,
      task.binding.projectId,
      task.binding.missionId,
      claim.proposalId,
    );
    if (receiptPath !== expectedReceiptPath) {
      throw new Error(
        `execution authorization receipt source mismatch: expected ${expectedReceiptPath}, observed ${receiptPath}`,
      );
    }
    const receipt = readExecutionEvidence(
      receiptPath,
      ExecutionAuthorizationReceiptSchema,
      "receipt",
    );
    const validated = validateExecutionAuthorizationClaim(claim, {
      home,
      claimPath,
      receiptPath,
      receipt,
      projectId: task.binding.projectId,
      missionId: task.binding.missionId,
      proposalId: receipt.proposalId,
      proposalDigest: receipt.proposalDigest,
    });
    if (validated.authorizationId !== arguments_.authorizationId) {
      throw new Error(
        `execution authorization ID mismatch: expected ${arguments_.authorizationId}, observed ${validated.authorizationId}`,
      );
    }
    if (
      validated.projectId !== task.binding.projectId
      || validated.missionId !== task.binding.missionId
    ) {
      throw new Error(
        `execution authorization does not belong to task ${task.id} project and Mission context`,
      );
    }
    const expectedTaskContext = workbenchTaskExecutionContextRef(
      workbenchTaskExecutionContextFor(task, {
        authorizationId: validated.authorizationId,
        proposalDigest: validated.proposalDigest,
      }),
    );
    if (
      claim.workbenchTaskContext === undefined
      || !sameWorkbenchTaskExecutionContextRef(
        claim.workbenchTaskContext,
        expectedTaskContext,
      )
    ) {
      throw new PrincipalTaskError(
        "invalid-transition",
        `execution authorization ${validated.authorizationId} was not consumed for the exact current context of task ${task.id}`,
      );
    }
    task.executionLinks.push({
      authorizationId: validated.authorizationId,
      proposalDigest: validated.proposalDigest,
      claimSourceRef: relative(home, claimPath),
      taskContext: expectedTaskContext,
      linkedAt: timestamp,
      sourceRef: nonempty(arguments_.sourceRef, "task execution link source ref"),
    });
  });
}

export function rebindPrincipalTaskWorktree(
  homeArgument: string | undefined,
  arguments_: TaskRebindWorktreeArguments,
): TaskMutationResult {
  return mutateTask(homeArgument, arguments_, (task, timestamp) => {
    assertUnsettled(task, "rebind Worktree for");
    if (
      task.binding.kind !== "project-context"
      || task.binding.missionId === undefined
      || task.binding.worktreePath === undefined
    ) {
      throw new Error(
        `task ${task.id} requires exact registered project, Mission, and current Worktree context before Worktree rebinding`,
      );
    }
    const expectedWorktreePath = nonempty(
      arguments_.expectedWorktreePath,
      "expected task Worktree path",
    );
    if (task.binding.worktreePath !== expectedWorktreePath) {
      throw new PrincipalTaskError(
        "task-drift",
        `task Worktree is stale for ${task.id}: expected ${expectedWorktreePath}, current ${task.binding.worktreePath}`,
      );
    }
    const current = loadHome(homeArgument);
    const primaryWorkspace = workspaceFor(current.workspaces, task.binding.projectId);
    const toWorktreePath = observedWorktree(primaryWorkspace.path, arguments_.worktree);
    if (toWorktreePath === task.binding.worktreePath) {
      throw new Error(`task ${task.id} is already bound to Worktree ${toWorktreePath}`);
    }
    const replacementStatus =
      requiredGit(["status", "--porcelain"], toWorktreePath) ?? "";
    if (replacementStatus.trim().length > 0) {
      throw new Error(
        `task ${task.id} replacement Worktree is not clean: ${toWorktreePath}`,
      );
    }
    (task.worktreeRebindings ??= []).push({
      fromWorktreePath: task.binding.worktreePath,
      toWorktreePath,
      reboundAt: timestamp,
      sourceRef: nonempty(arguments_.sourceRef, "task Worktree rebind source ref"),
    });
    task.binding.worktreePath = toWorktreePath;
  });
}

/**
 * Retain the exact Mission timeline receipt returned by a live correction
 * delivery. This function records evidence only; it does not send Mission
 * input or change task work state.
 */
export function recordPrincipalTaskCorrectionDelivery(
  homeArgument: string | undefined,
  arguments_: TaskRecordCorrectionDeliveryArguments,
): TaskMutationResult {
  const { current, source } = readPrincipalTaskSource(homeArgument);
  const projectIds = current.projects.projects.map((project) => project.id);
  const task = taskById(source, arguments_.id);
  const correction = correctionById(task, arguments_.correctionId);
  const delivery = PrincipalTaskCorrectionDeliverySchema.parse({
    authorizationId: arguments_.authorizationId,
    proposalDigest: arguments_.proposalDigest,
    claimSourceRef: arguments_.claimSourceRef,
    missionId: arguments_.missionId,
    inputId: arguments_.inputId,
    inputEventId: arguments_.inputEventId,
    inputWatermark: arguments_.inputWatermark,
    payloadDigest: arguments_.payloadDigest,
    recordedAt: arguments_.recordedAt,
    sourceRef: arguments_.sourceRef,
    deliveredViaRunnerId: arguments_.deliveredViaRunnerId,
  });

  if (
    task.binding.kind !== "project-context"
    || task.binding.missionId === undefined
    || task.binding.missionId !== delivery.missionId
  ) {
    throw new Error(
      `task ${task.id} correction delivery requires its exact registered project and Mission context`,
    );
  }
  const executionLink = task.executionLinks.find(
    (link) => link.authorizationId === delivery.authorizationId,
  );
  if (executionLink === undefined) {
    throw new Error(
      `task ${task.id} has no execution link for correction delivery authorization ${delivery.authorizationId}`,
    );
  }
  if (
    executionLink.proposalDigest !== delivery.proposalDigest
    || executionLink.claimSourceRef !== delivery.claimSourceRef
  ) {
    throw new Error(
      `task ${task.id} correction delivery does not match its exact execution link selector`,
    );
  }

  const retained = retainedDeliveryByInputId(task, delivery.inputId);
  if (retained !== undefined) {
    if (
      retained.correction.id === correction.id
      && exactCorrectionDelivery(retained.delivery, delivery)
    ) {
      return { sourceRevision: source.sourceRevision, task };
    }
    throw new Error(
      `task ${task.id} Mission input ${delivery.inputId} conflicts with its retained correction delivery`,
    );
  }
  if (retainedDeliveryByEventId(task, delivery.inputEventId) !== undefined) {
    throw new Error(
      `task ${task.id} Mission input event ${delivery.inputEventId} is already retained by another correction delivery`,
    );
  }

  // The Mission input already happened before this append. Revisions guarded
  // the prepare/send boundary; later local task mutations must not erase the
  // exact external receipt. Identity and selector checks above remain the
  // admission boundary for this evidence-only append.
  correction.deliveries.push(delivery);
  task.revision += 1;
  task.updatedAt = now();
  source.sourceRevision += 1;
  persistPrincipalTasks(current.home, source, projectIds);
  return { sourceRevision: source.sourceRevision, task };
}

function mutateTask(
  homeArgument: string | undefined,
  expectation: TaskMutationExpectation,
  change: (
    task: PrincipalTask,
    timestamp: string,
    home: string,
    source: PrincipalTasks,
  ) => void,
): TaskMutationResult {
  const { current, source } = readPrincipalTaskSource(homeArgument);
  const projectIds = current.projects.projects.map((project) => project.id);
  assertSourceRevision(source, expectation.expectedSourceRevision);
  const task = taskById(source, expectation.id);
  if (task.revision !== expectation.expectedRevision) {
    throw new PrincipalTaskError(
      "task-drift",
      `task revision is stale for ${task.id}: expected ${expectation.expectedRevision}, current ${task.revision}`,
    );
  }
  const timestamp = now();
  change(task, timestamp, current.home, source);
  task.revision += 1;
  task.updatedAt = timestamp;
  source.sourceRevision += 1;
  persistPrincipalTasks(current.home, source, projectIds);
  return { sourceRevision: source.sourceRevision, task };
}

function persistPrincipalTasks(home: string, source: PrincipalTasks, projectIds: string[]): void {
  try {
    const validated = validatePrincipalTasks(
      PrincipalTasksSchema.parse(source),
      new Set(projectIds),
    );
    saveJson(principalTasksPath(home), validated);
  } catch (error: unknown) {
    if (error instanceof PrincipalTaskError) throw error;
    throw new PrincipalTaskError(
      "source-unavailable",
      errorMessage(error),
      { cause: error },
    );
  }
}

function readPrincipalTaskSource(homeArgument?: string): {
  current: ReturnType<typeof loadHome>;
  source: PrincipalTasks;
} {
  try {
    const current = loadHome(homeArgument);
    return {
      current,
      source: validatePrincipalTasks(
        loadJson(principalTasksPath(current.home), PrincipalTasksSchema),
        new Set(current.projects.projects.map((project) => project.id)),
      ),
    };
  } catch (error: unknown) {
    if (error instanceof PrincipalTaskError) throw error;
    throw new PrincipalTaskError(
      "source-unavailable",
      errorMessage(error),
      { cause: error },
    );
  }
}

function validatePrincipalTasks(source: PrincipalTasks, projectIds: ReadonlySet<string>): PrincipalTasks {
  const taskIds = new Set<string>();
  const executionAuthorizationOwners = new Map<string, string>();
  for (const task of source.tasks) {
    const taskKey = task.id.toLowerCase();
    if (taskIds.has(taskKey)) throw new Error(`duplicate Principal task id: ${task.id}`);
    taskIds.add(taskKey);
    if (task.binding.kind === "project-context" && !projectIds.has(task.binding.projectId)) {
      throw new Error(
        `Principal task ${task.id} references unknown registered project id: ${task.binding.projectId}`,
      );
    }
    assertUniqueIds(task.corrections, `Principal task ${task.id} correction`);
    assertUniqueIds(task.resultClaims, `Principal task ${task.id} result claim`);
    const deliveryInputIds = new Set<string>();
    const deliveryEventIds = new Set<string>();
    for (const correction of task.corrections) {
      for (const delivery of correction.deliveries) {
        if (deliveryInputIds.has(delivery.inputId)) {
          throw new Error(
            `duplicate Principal task ${task.id} correction delivery input: ${delivery.inputId}`,
          );
        }
        deliveryInputIds.add(delivery.inputId);
        if (deliveryEventIds.has(delivery.inputEventId)) {
          throw new Error(
            `duplicate Principal task ${task.id} correction delivery event: ${delivery.inputEventId}`,
          );
        }
        deliveryEventIds.add(delivery.inputEventId);
      }
    }
    const authorizationIds = new Set<string>();
    for (const link of task.executionLinks) {
      if (authorizationIds.has(link.authorizationId)) {
        throw new Error(
          `duplicate Principal task ${task.id} execution authorization: ${link.authorizationId}`,
        );
      }
      authorizationIds.add(link.authorizationId);
      const priorOwner = executionAuthorizationOwners.get(link.authorizationId);
      if (priorOwner !== undefined) {
        throw new Error(
          `execution authorization ${link.authorizationId} is linked to both Principal task ${priorOwner} and ${task.id}`,
        );
      }
      executionAuthorizationOwners.set(link.authorizationId, task.id);
    }
  }
  return source;
}

function readExecutionEvidence<T>(
  path: string,
  schema: { parse(value: unknown): T },
  kind: "claim" | "receipt",
): T {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch (error: unknown) {
    throw new PrincipalTaskError(
      "source-unavailable",
      `cannot read execution authorization ${kind} ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  try {
    return schema.parse(JSON.parse(source));
  } catch (error: unknown) {
    throw new PrincipalTaskError(
      "source-unavailable",
      `invalid execution authorization ${kind} ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

function assertUniqueIds(entries: readonly { id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    const key = entry.id.toLowerCase();
    if (ids.has(key)) throw new Error(`duplicate ${label} id: ${entry.id}`);
    ids.add(key);
  }
}

function bindingFor(
  current: ReturnType<typeof loadHome>,
  projectQuery?: string,
  worktreeArgument?: string,
  missionArgument?: string,
): PrincipalTaskBinding {
  if (projectQuery === undefined) {
    if (worktreeArgument !== undefined) {
      throw new Error("task worktree context requires a registered project");
    }
    if (missionArgument !== undefined) {
      throw new Error("task Mission context requires a registered project");
    }
    return { kind: "independent" };
  }
  const project = registeredProjectByQuery(current.projects, projectQuery);
  const workspace = workspaceFor(current.workspaces, project.id);
  return {
    kind: "project-context",
    projectId: project.id,
    ...(worktreeArgument === undefined
      ? {}
      : { worktreePath: observedWorktree(workspace.path, worktreeArgument) }),
    ...(missionArgument === undefined
      ? {}
      : { missionId: primaryMissionContext(workspace.path, missionArgument) }),
  };
}

function primaryMissionContext(primaryWorkspace: string, missionArgument: string): string {
  const missionId = nonempty(missionArgument, "task Mission context");
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(missionId)) {
    throw new Error("task Mission context must use lowercase letters, digits, and hyphens");
  }
  const path = join(
    primaryWorkspace,
    "operations",
    "missions",
    `${missionId}.json`,
  );
  const mission = loadMissionRecord(path);
  if (mission.id !== missionId) {
    throw new Error(
      `task Mission context id mismatch: expected ${missionId}, observed ${mission.id}`,
    );
  }
  return mission.id;
}

function observedWorktree(primaryWorkspace: string, worktreeArgument: string): string {
  const candidate = expandPath(worktreeArgument);
  if (!existsSync(candidate)) throw new Error(`task worktree context does not exist: ${candidate}`);
  const canonical = realpathSync(candidate);
  const observed = requiredGit(["worktree", "list", "--porcelain"], primaryWorkspace)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => realpathSync(line.slice("worktree ".length)));
  if (!observed.includes(canonical)) {
    throw new Error(
      `task worktree context is not an observed worktree of the registered project: ${canonical}`,
    );
  }
  return canonical;
}

function taskById(source: PrincipalTasks, idArgument: string): PrincipalTask {
  const id = nonempty(idArgument, "task id");
  const folded = id.toLowerCase();
  const matches = source.tasks.filter((task) => task.id.toLowerCase() === folded);
  if (matches.length === 0) {
    throw new PrincipalTaskError("task-not-found", `Principal task not found: ${id}`);
  }
  if (matches.length > 1) throw new Error(`Principal task id is ambiguous: ${id}`);
  return matches[0]!;
}

function correctionById(
  task: PrincipalTask,
  idArgument: string,
): PrincipalTask["corrections"][number] {
  const id = nonempty(idArgument, "task correction id");
  const folded = id.toLowerCase();
  const matches = task.corrections.filter(
    (correction) => correction.id.toLowerCase() === folded,
  );
  if (matches.length === 0) {
    throw new Error(`Principal task correction not found: ${id}`);
  }
  if (matches.length > 1) {
    throw new Error(`Principal task correction id is ambiguous: ${id}`);
  }
  return matches[0]!;
}

function retainedDeliveryByInputId(
  task: PrincipalTask,
  inputId: string,
): {
  correction: PrincipalTask["corrections"][number];
  delivery: PrincipalTaskCorrectionDelivery;
} | undefined {
  for (const correction of task.corrections) {
    const delivery = correction.deliveries.find(
      (candidate) => candidate.inputId === inputId,
    );
    if (delivery !== undefined) return { correction, delivery };
  }
  return undefined;
}

function retainedDeliveryByEventId(
  task: PrincipalTask,
  inputEventId: string,
): PrincipalTaskCorrectionDelivery | undefined {
  for (const correction of task.corrections) {
    const delivery = correction.deliveries.find(
      (candidate) => candidate.inputEventId === inputEventId,
    );
    if (delivery !== undefined) return delivery;
  }
  return undefined;
}

function exactCorrectionDelivery(
  left: PrincipalTaskCorrectionDelivery,
  right: PrincipalTaskCorrectionDelivery,
): boolean {
  return left.authorizationId === right.authorizationId
    && left.proposalDigest === right.proposalDigest
    && left.claimSourceRef === right.claimSourceRef
    && left.missionId === right.missionId
    && left.inputId === right.inputId
    && left.inputEventId === right.inputEventId
    && left.inputWatermark === right.inputWatermark
    && left.payloadDigest === right.payloadDigest
    && left.recordedAt === right.recordedAt
    && left.sourceRef === right.sourceRef
    && left.deliveredViaRunnerId === right.deliveredViaRunnerId;
}

function assertSourceRevision(source: PrincipalTasks, expected: number): void {
  if (!Number.isSafeInteger(expected) || expected < 0) {
    throw new Error("expected source revision must be a non-negative integer");
  }
  if (source.sourceRevision !== expected) {
    throw new PrincipalTaskError(
      "task-drift",
      `Principal task source revision is stale: expected ${expected}, current ${source.sourceRevision}`,
    );
  }
}

function assertUnsettled(task: PrincipalTask, action: string): void {
  if (task.lifecycle === "settled") {
    throw new Error(`cannot ${action} settled task ${task.id}; reopen it first`);
  }
}

function submittedClaim(task: PrincipalTask): PrincipalTaskResultClaim | undefined {
  return task.resultClaims.find((claim) => claim.standing === "submitted");
}

function supersedeSubmittedClaim(
  task: PrincipalTask,
  timestamp: string,
  reason: "correction" | "reopen",
): void {
  const claim = submittedClaim(task);
  if (claim === undefined) return;
  claim.standing = "superseded";
  claim.resolution = {
    kind: "superseded",
    at: timestamp,
    reason,
  };
}

function nonempty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

function nonemptyList(values: readonly string[], label: string): string[] {
  if (values.length === 0) throw new Error(`${label} must contain at least one item`);
  return values.map((value) => nonempty(value, label));
}

function sameRuntimeVerificationSelector(
  left: AutonomyEffectVerificationSelector,
  right: AutonomyEffectVerificationSelector,
): boolean {
  return left.kind === right.kind
    && left.effectId === right.effectId
    && left.verificationEventId === right.verificationEventId;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
