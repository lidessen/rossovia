import { z } from "zod";
import { intentLineagePresentation } from "../../ui/operational-semantics.js";

export const RunnerTargetSchema = z.object({
  missionId: z.string().min(1),
  runnerId: z.string().min(1),
  expectedState: z.enum([
    "running",
    "idle",
    "anchor-pending",
    "paused",
    "input-pending",
    "interrupted",
    "mission-stopped",
    "stopped",
  ]),
  projectKey: z.string().min(1).optional(),
}).strict();

export type RunnerTarget = z.infer<typeof RunnerTargetSchema>;

export interface ContributionAttribution {
  readonly inputId: string;
  readonly actorRef: string;
  readonly sourceRef: string;
}

export const WorkbenchActionRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contribution"),
    target: RunnerTargetSchema,
    text: z.string().trim().min(1).max(20_000),
  }).strict(),
  z.object({
    kind: z.literal("control"),
    target: RunnerTargetSchema,
    command: z.enum(["pause", "resume"]),
  }).strict(),
  z.object({
    kind: z.literal("recovery"),
    target: RunnerTargetSchema,
    command: z.enum(["resume", "replace", "abandon"]),
  }).strict(),
]);

export type WorkbenchActionRequest = z.infer<typeof WorkbenchActionRequestSchema>;

export interface RunnerStatusProof {
  readonly live: boolean | null;
  readonly missionId: string;
  readonly runnerId?: string;
  readonly state?: string;
  readonly recoveryCapabilities?: {
    readonly abandon: boolean;
    readonly resume: boolean;
    readonly replace: boolean;
  };
}

export interface MissionRunnerActionClient {
  status(missionId: string): Promise<RunnerStatusProof>;
  activity(missionId: string): Promise<unknown>;
  contribute(
    target: RunnerTarget,
    text: string,
    attribution?: ContributionAttribution,
  ): Promise<unknown>;
  /**
   * `resume` releases the durable pause. It does not reconcile the pause/resume
   * inputs or claim production restarted; the runner normally returns
   * `input-pending` until that reconciliation occurs.
   */
  control(target: RunnerTarget, command: "pause" | "resume"): Promise<unknown>;
  recover(target: RunnerTarget, command: "resume" | "replace" | "abandon"): Promise<unknown>;
}

export class WorkbenchActionError extends Error {
  constructor(
    readonly status: number,
    readonly code: "invalid-action" | "target-drift" | "unsupported-action",
    message: string,
  ) {
    super(message);
  }
}

export async function executeWorkbenchAction(
  unparsed: unknown,
  client: MissionRunnerActionClient,
  contributionAttribution?: ContributionAttribution,
  recoveryActivityVerifier?: (activity: unknown) => void,
): Promise<unknown> {
  const parsed = WorkbenchActionRequestSchema.safeParse(unparsed);
  if (!parsed.success) {
    throw new WorkbenchActionError(400, "invalid-action", z.prettifyError(parsed.error));
  }

  const action = parsed.data;
  const observed = await client.status(action.target.missionId);
  assertCurrentTarget(action.target, observed);
  let activity: unknown;
  try {
    activity = await client.activity(action.target.missionId);
  } catch (error: unknown) {
    throw new WorkbenchActionError(
      409,
      "unsupported-action",
      `Mission ${action.target.missionId} intent lineage could not be verified: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const lineage = intentLineagePresentation(activity);
  if (lineage.blocksSemanticWork) {
    throw new WorkbenchActionError(
      409,
      "unsupported-action",
      lineage.standing === "legacy-unanchored"
        ? `Mission ${action.target.missionId} retains legacy history without an authorized intent anchor; Workbench ordinary actions remain disabled until a separate guarded migration decision settles`
        : `Mission ${action.target.missionId} intent lineage is ${lineage.standing}; Workbench ordinary actions remain disabled until an authorized anchor is verified`,
    );
  }
  if (observed.state === "anchor-pending") {
    throw new WorkbenchActionError(
      409,
      "unsupported-action",
      `Mission ${action.target.missionId} has no authorized intent anchor; Workbench ordinary actions remain disabled until guarded anchor adoption or migration settles`,
    );
  }

  if (action.kind === "contribution") {
    return await client.contribute(
      action.target,
      action.text,
      contributionAttribution,
    );
  }
  if (action.kind === "control") {
    const requiredState = action.command === "pause" ? "running" : "paused";
    if (observed.state !== requiredState) {
      throw new WorkbenchActionError(
        409,
        "unsupported-action",
        `Mission ${action.target.missionId} is ${observed.state}; control ${action.command} applies only to a ${requiredState} runner`,
      );
    }
    return await client.control(action.target, action.command);
  }
  if (observed.state !== "interrupted") {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      `Mission ${action.target.missionId} is ${observed.state}; turn recovery applies only to an interrupted runner`,
    );
  }
  if (observed.recoveryCapabilities?.[action.command] !== true) {
    throw new WorkbenchActionError(
      409,
      "unsupported-action",
      `Mission ${action.target.missionId} carrier does not support recovery ${action.command}`,
    );
  }
  recoveryActivityVerifier?.(activity);
  return await client.recover(action.target, action.command);
}

function assertCurrentTarget(
  target: RunnerTarget,
  observed: RunnerStatusProof,
): void {
  if (observed.live !== true) {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      observed.live === false
        ? `Mission ${target.missionId} has no live runner; cached state cannot authorize an action`
        : `Mission ${target.missionId} runner reachability is unverified; cached state cannot authorize an action`,
    );
  }
  if (observed.missionId !== target.missionId) {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      `Runner status belongs to Mission ${observed.missionId}, not ${target.missionId}`,
    );
  }
  if (observed.runnerId !== target.runnerId) {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      `Mission ${target.missionId} runner changed from ${target.runnerId} to ${observed.runnerId ?? "unknown"}`,
    );
  }
  if (observed.state !== target.expectedState) {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      `Mission ${target.missionId} state changed from ${target.expectedState} to ${observed.state ?? "unknown"}`,
    );
  }
  if (observed.state === "mission-stopped" || observed.state === "stopped") {
    throw new WorkbenchActionError(
      409,
      "target-drift",
      `Mission ${target.missionId} runner is ${observed.state}; start a new authorized session instead`,
    );
  }
}
