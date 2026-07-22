import type { CellRunRecord, CellInput } from "../../../packages/work-cell/src/contracts";
import { CellInputSchema } from "../../../packages/work-cell/src/contracts";
import type { CellDriver } from "../../../packages/work-cell/src/driver";
import { runCell } from "../../../packages/work-cell/src/run-cell";
import {
  SWARM_INPUT_VERSION,
  runSwarm,
  type SwarmInput,
  type SwarmRun,
} from "../../../packages/work-cell/src/swarm";

export type CapabilityDisposition =
  | "reliable-primitive"
  | "guarded"
  | "transform"
  | "unsupported-escalate";

export type CapabilityEvidenceStatus =
  | "admitted"
  | "provisional-observed"
  | "discovery-needed";

/** A compact host-owned reference to the Task Shape that prepared one contribution. */
export interface TaskShapeAdmission {
  readonly referenceProfile: {
    readonly id: string;
    readonly revision: string;
  };
  readonly evidence: {
    readonly status: CapabilityEvidenceStatus;
    readonly revision: string;
    readonly refs: readonly string[];
  };
  readonly disposition: CapabilityDisposition;
  readonly principalInstability: string;
  readonly guardRefs: readonly string[];
  readonly reconstructionOwner: string;
  readonly overloadDisposition: "repartition" | "escalate";
}

export interface PreparedDelegateContribution {
  readonly key: string;
  /** Host-owned coordination task that this contribution advances. */
  readonly taskId: string;
  /** Human-facing projection only. It has no admission authority. */
  readonly label?: string;
  readonly task: string;
  readonly sourceRefs: readonly string[];
  readonly obligationRefs: readonly string[];
  readonly acceptance: readonly string[];
  readonly capabilityNeed: string;
  /** The first slice admits only dependencies that have already settled. */
  readonly dependsOn: readonly string[];
  readonly taskShape: TaskShapeAdmission;
  readonly cell: unknown;
}

export interface PreparedDelegateBatch {
  readonly id: string;
  readonly whole: {
    readonly revision: string;
    readonly sourceRefs: readonly string[];
    readonly obligations: readonly string[];
    readonly settledContributionKeys: readonly string[];
    readonly guardRefs: readonly string[];
    readonly capabilityNeeds: readonly string[];
    readonly reconstructionOwner: string;
    readonly workspace: CellInput["workspace"];
  };
  readonly contributions: readonly PreparedDelegateContribution[];
}

export interface AdmittedDelegateContribution extends Omit<PreparedDelegateContribution, "cell"> {
  readonly cell: CellInput;
}

export interface AdmittedDelegateBatch extends Omit<PreparedDelegateBatch, "contributions"> {
  readonly contributions: readonly AdmittedDelegateContribution[];
  readonly unassignedObligations: readonly string[];
}

export class DelegateAdmissionError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`delegate batch admission failed:\n- ${issues.join("\n- ")}`);
    this.name = "DelegateAdmissionError";
  }
}

/**
 * Admits a complete prepared delegate step before any Cell can start.
 *
 * This is deliberately a Mission-side policy adapter. It does not infer a Task
 * Shape, and a contribution label cannot substitute for capability evidence.
 */
export function admitPreparedDelegateBatch(input: PreparedDelegateBatch): AdmittedDelegateBatch {
  const issues: string[] = [];
  requireText(input.id, "batch id", issues);
  requireText(input.whole.revision, "whole revision", issues);
  requireUniqueText(input.whole.sourceRefs, "whole source refs", issues);
  requireUniqueText(input.whole.obligations, "whole obligations", issues);
  requireUniqueText(input.whole.settledContributionKeys, "settled contribution keys", issues, true);
  requireUniqueText(input.whole.guardRefs, "whole guard refs", issues, true);
  requireUniqueText(input.whole.capabilityNeeds, "whole capability needs", issues);
  requireText(input.whole.reconstructionOwner, "whole reconstruction owner", issues);
  requireText(input.whole.workspace.root, "whole workspace root", issues);
  requireUniqueText(input.whole.workspace.readPaths, "whole workspace read paths", issues);
  requireUniqueText(input.whole.workspace.excludePaths, "whole workspace exclude paths", issues, true);
  if (input.whole.workspace.writePaths.length > 0 || input.whole.workspace.allowedCommands.length > 0) {
    issues.push("the first delegate slice requires a read-only, command-free whole workspace");
  }
  if (input.contributions.length === 0) issues.push("batch must contain at least one contribution");
  if (input.contributions.length > 256) issues.push("batch cannot contain more than 256 contributions");

  const sourceRefs = new Set(input.whole.sourceRefs);
  const obligations = new Set(input.whole.obligations);
  const settledKeys = new Set(input.whole.settledContributionKeys);
  const guardRefs = new Set(input.whole.guardRefs);
  const capabilityNeeds = new Set(input.whole.capabilityNeeds);
  const currentKeys = new Set(input.contributions.map((contribution) => contribution.key));
  const seenKeys = new Set<string>();
  const seenTaskIds = new Set<string>();
  const obligationOwners = new Map<string, string>();
  const admitted: AdmittedDelegateContribution[] = [];

  for (const [index, contribution] of input.contributions.entries()) {
    const path = `contributions[${index}]`;
    requireText(contribution.key, `${path}.key`, issues);
    requireText(contribution.taskId, `${path}.taskId`, issues);
    requireText(contribution.task, `${path}.task`, issues);
    if (seenKeys.has(contribution.key)) issues.push(`${path}.key duplicates ${contribution.key}`);
    seenKeys.add(contribution.key);
    if (seenTaskIds.has(contribution.taskId)) issues.push(`${path}.taskId duplicates ${contribution.taskId}`);
    seenTaskIds.add(contribution.taskId);
    requireUniqueText(contribution.sourceRefs, `${path}.sourceRefs`, issues);
    requireUniqueText(contribution.obligationRefs, `${path}.obligationRefs`, issues);
    requireUniqueText(contribution.acceptance, `${path}.acceptance`, issues);
    requireText(contribution.capabilityNeed, `${path}.capabilityNeed`, issues);
    requireUniqueText(contribution.dependsOn, `${path}.dependsOn`, issues, true);

    for (const sourceRef of contribution.sourceRefs) {
      if (!sourceRefs.has(sourceRef)) issues.push(`${path}.sourceRefs contains undeclared source ${sourceRef}`);
    }
    for (const obligationRef of contribution.obligationRefs) {
      if (!obligations.has(obligationRef)) {
        issues.push(`${path}.obligationRefs contains undeclared obligation ${obligationRef}`);
        continue;
      }
      const owner = obligationOwners.get(obligationRef);
      if (owner !== undefined) issues.push(`${path}.obligationRefs duplicates ownership by ${owner}: ${obligationRef}`);
      else obligationOwners.set(obligationRef, contribution.key);
    }
    for (const dependency of contribution.dependsOn) {
      if (currentKeys.has(dependency)) {
        issues.push(`${path}.dependsOn contains same-step dependency ${dependency}`);
      } else if (!settledKeys.has(dependency)) {
        issues.push(`${path}.dependsOn contains unsettled or unknown contribution ${dependency}`);
      }
    }
    if (!capabilityNeeds.has(contribution.capabilityNeed)) {
      issues.push(`${path}.capabilityNeed is not declared by the frozen whole: ${contribution.capabilityNeed}`);
    }

    validateTaskShape(contribution.taskShape, path, issues);
    for (const guardRef of contribution.taskShape.guardRefs) {
      if (!guardRefs.has(guardRef)) issues.push(`${path}.taskShape.guardRefs contains undeclared guard ${guardRef}`);
    }
    if (contribution.taskShape.reconstructionOwner !== input.whole.reconstructionOwner) {
      issues.push(`${path}.taskShape.reconstructionOwner does not match the frozen whole`);
    }
    const parsedCell = CellInputSchema.safeParse(contribution.cell);
    if (!parsedCell.success) {
      issues.push(`${path}.cell is not a valid CellInput: ${parsedCell.error.issues.map((issue) => issue.message).join("; ")}`);
      continue;
    }
    const cell = parsedCell.data;
    if (cell.intent !== contribution.task) issues.push(`${path}.cell intent does not preserve the delegate task`);
    if (!sameStrings(cell.acceptance, contribution.acceptance)) {
      issues.push(`${path}.cell acceptance does not preserve the delegate acceptance contract`);
    }
    if (!cell.capabilitiesRequired.includes(contribution.capabilityNeed)) {
      issues.push(`${path}.cell does not require the declared capability need ${contribution.capabilityNeed}`);
    }
    if (cell.executionProfile === undefined) {
      issues.push(`${path}.cell must name the execution profile selected by its Task Shape`);
    } else if (cell.executionProfile.id !== contribution.taskShape.referenceProfile.id) {
      issues.push(
        `${path}.cell execution profile ${cell.executionProfile.id} does not match Task Shape profile ${contribution.taskShape.referenceProfile.id}`,
      );
    }
    if (cell.workspace.writePaths.length > 0 || cell.workspace.allowedCommands.length > 0) {
      issues.push(`${path}.cell exceeds the first slice's read-only, command-free boundary`);
    }
    validateWorkspace(cell.workspace, input.whole.workspace, path, issues);
    if (
      cell.outputSchema === undefined
      && cell.terminalTools === undefined
      && cell.artifacts === undefined
    ) {
      issues.push(`${path}.cell requires at least one flat work-proof condition: terminal tool, output schema, or artifact`);
    }
    admitted.push({ ...contribution, cell });
  }

  if (issues.length > 0) throw new DelegateAdmissionError(issues);
  const unassignedObligations = input.whole.obligations.filter((obligation) => !obligationOwners.has(obligation));
  return { ...input, contributions: admitted, unassignedObligations };
}

function validateWorkspace(
  workspace: CellInput["workspace"],
  whole: CellInput["workspace"],
  path: string,
  issues: string[],
): void {
  if (workspace.root !== whole.root) issues.push(`${path}.cell workspace root does not match the frozen whole`);
  const allowedReads = new Set(whole.readPaths);
  for (const readPath of workspace.readPaths) {
    if (!allowedReads.has(readPath)) issues.push(`${path}.cell read path is outside the frozen whole: ${readPath}`);
  }
  const cellExcludes = new Set(workspace.excludePaths);
  for (const excludePath of whole.excludePaths) {
    if (!cellExcludes.has(excludePath)) issues.push(`${path}.cell omits frozen workspace exclusion: ${excludePath}`);
  }
}

export type LoweredDelegateBatch =
  | { readonly kind: "direct"; readonly input: CellInput }
  | { readonly kind: "swarm"; readonly manifest: SwarmInput };

export function lowerAdmittedDelegateBatch(
  batch: AdmittedDelegateBatch,
  concurrency: number,
): LoweredDelegateBatch {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 256) {
    throw new Error("delegate concurrency must be an integer between 1 and 256");
  }
  if (batch.contributions.length === 1) {
    return { kind: "direct", input: batch.contributions[0]!.cell };
  }
  return {
    kind: "swarm",
    manifest: {
      version: SWARM_INPUT_VERSION,
      id: batch.id,
      concurrency: Math.min(concurrency, batch.contributions.length),
      cells: batch.contributions.map((contribution) => contribution.cell),
    },
  };
}

export type DelegateBatchRun =
  | {
      readonly kind: "direct";
      readonly admission: AdmittedDelegateBatch;
      readonly record: CellRunRecord;
    }
  | {
      readonly kind: "swarm";
      readonly admission: AdmittedDelegateBatch;
      readonly record: SwarmRun;
    };

export async function runPreparedDelegateBatch(
  input: PreparedDelegateBatch,
  createDriver: () => CellDriver,
  options: { readonly concurrency: number; readonly signal?: AbortSignal },
): Promise<DelegateBatchRun> {
  const admission = admitPreparedDelegateBatch(input);
  return runAdmittedDelegateBatch(admission, createDriver, options);
}

/** Executes an already admitted batch without repeating or weakening admission. */
export async function runAdmittedDelegateBatch(
  admission: AdmittedDelegateBatch,
  createDriver: () => CellDriver,
  options: { readonly concurrency: number; readonly signal?: AbortSignal },
): Promise<DelegateBatchRun> {
  const lowered = lowerAdmittedDelegateBatch(admission, options.concurrency);
  if (lowered.kind === "direct") {
    const record = await runCell(
      lowered.input,
      createDriver(),
      options.signal === undefined ? {} : { signal: options.signal },
    );
    return { kind: "direct", admission, record };
  }
  const record = await runSwarm(lowered.manifest, createDriver, options.signal);
  return { kind: "swarm", admission, record };
}

function validateTaskShape(shape: TaskShapeAdmission, path: string, issues: string[]): void {
  requireText(shape.referenceProfile.id, `${path}.taskShape.referenceProfile.id`, issues);
  requireText(shape.referenceProfile.revision, `${path}.taskShape.referenceProfile.revision`, issues);
  requireText(shape.evidence.revision, `${path}.taskShape.evidence.revision`, issues);
  requireUniqueText(shape.evidence.refs, `${path}.taskShape.evidence.refs`, issues);
  requireText(shape.principalInstability, `${path}.taskShape.principalInstability`, issues);
  requireUniqueText(shape.guardRefs, `${path}.taskShape.guardRefs`, issues, true);
  requireText(shape.reconstructionOwner, `${path}.taskShape.reconstructionOwner`, issues);

  if (shape.evidence.status === "discovery-needed") {
    issues.push(`${path}.taskShape has discovery-needed evidence and cannot execute`);
  }
  if (shape.disposition === "reliable-primitive" && shape.evidence.status !== "admitted") {
    issues.push(`${path}.taskShape reliable-primitive requires admitted evidence`);
  }
  if (shape.disposition === "guarded" && shape.guardRefs.length === 0) {
    issues.push(`${path}.taskShape guarded execution requires at least one independently owned guard`);
  }
  if (shape.disposition === "transform") {
    issues.push(`${path}.taskShape must finish transformation and reclassify the resulting local unit before execution`);
  }
  if (shape.disposition === "unsupported-escalate") {
    issues.push(`${path}.taskShape unsupported-escalate cannot lower into an ordinary Work Cell`);
  }
}

function requireText(value: string, path: string, issues: string[]): void {
  if (value.trim().length === 0) issues.push(`${path} must be non-empty`);
}

function requireUniqueText(
  values: readonly string[],
  path: string,
  issues: string[],
  allowEmpty = false,
): void {
  if (!allowEmpty && values.length === 0) issues.push(`${path} must contain at least one entry`);
  const seen = new Set<string>();
  for (const value of values) {
    requireText(value, path, issues);
    if (seen.has(value)) issues.push(`${path} contains duplicate ${value}`);
    seen.add(value);
  }
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
