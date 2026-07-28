import { createHash, randomUUID } from "node:crypto";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { FileMissionTimeline } from "./delegate-timeline";
import {
  MissionInputDraftSchema,
  MissionInputReceiptSchema,
  type MissionInputReceipt,
} from "./mission-input";
import {
  MissionReconciliationCommitSchema,
  verifyRetainedReconciliationEvidence,
  type MissionReconciliationCommit,
} from "./mission-reconciliation-commit";
import {
  MissionAnchorAdoptionSchema,
  type MissionAnchorAdoption,
  type MissionAnchorSeed,
} from "./mission-reconciliation";
import {
  startMissionExecution,
  type MissionExecutionHandle,
} from "./mission-execution-host";
import {
  MISSION_TURN_RECOVERY_VERSION,
  MissionTurnRecoveryCommandSchema,
  MissionTurnRecoverySchema,
  MissionTurnStartSchema,
  missionTurnNeedsRecovery,
  settlementFromExecution,
  type MissionTurnRecoveryCommand,
  type MissionTurnStart,
} from "./mission-turn";
import {
  MissionRuntimeRecoveryCapabilitiesSchema,
  type MissionRuntimeFactory,
  type MissionRuntimeRecoveryCapabilities,
} from "./mission-runtime";
import { stableStringify } from "./canonical-json";
import {
  missionRunnerDirectory,
  missionRunnerStatusPath,
} from "./mission-paths";

export {
  missionRunnerDirectory,
  missionRunnerStatusPath,
} from "./mission-paths";

export const MISSION_RUNNER_PROTOCOL_VERSION = "rosso.mission-runner.v1" as const;

export const MissionRunnerStateSchema = z.enum([
  "running",
  "idle",
  "anchor-pending",
  "paused",
  "input-pending",
  "interrupted",
  "mission-stopped",
  "stopped",
]);

export const MissionRunnerStatusSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  runnerId: z.string().min(1),
  missionId: z.string().min(1),
  pid: z.number().int().positive(),
  state: MissionRunnerStateSchema,
  startedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  inputWatermark: z.number().int().nonnegative(),
  reconciledWatermark: z.number().int().nonnegative(),
  runtimeMode: z.enum(["none", "configured"]).optional(),
  socketPath: z.string().min(1),
  stopReason: z.enum(["runner-shutdown", "mission-stop"]).nullable(),
}).strict();

export const MissionRecoveryCapabilitiesSchema = z.object({
  abandon: z.boolean(),
  resume: z.boolean(),
  replace: z.boolean(),
}).strict();

const ExpectedRunnerTargetFields = {
  expectedRunnerId: z.string().min(1).optional(),
  expectedState: MissionRunnerStateSchema.optional(),
};

const RequiredExpectedRunnerTargetFields = {
  expectedRunnerId: z.string().min(1),
  expectedState: MissionRunnerStateSchema,
};

const StatusRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("status"),
}).strict();

const InputRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("input"),
  input: MissionInputDraftSchema,
  ...ExpectedRunnerTargetFields,
}).strict();

const ShutdownRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("runner-shutdown"),
}).strict();

const RecoveryRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("recovery"),
  recovery: MissionTurnRecoveryCommandSchema,
  ...ExpectedRunnerTargetFields,
}).strict();

const ReconciliationCommitRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("reconciliation-commit"),
  commit: MissionReconciliationCommitSchema,
  ...RequiredExpectedRunnerTargetFields,
}).strict();

const AnchorAdoptionRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("anchor-adoption"),
  adoption: MissionAnchorAdoptionSchema,
  ...RequiredExpectedRunnerTargetFields,
}).strict();

const AnchorMigrationAdoptionRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("anchor-migration-adoption"),
  proposalDigest: z.string().regex(/^[a-f0-9]{64}$/),
  adoption: MissionAnchorAdoptionSchema,
  retireCarrier: z.literal(true),
  ...RequiredExpectedRunnerTargetFields,
}).strict().superRefine((request, context) => {
  if (
    request.adoption.sourceRef
    !== `anchor-migration-proposal:sha256:${request.proposalDigest}`
  ) {
    context.addIssue({
      code: "custom",
      path: ["adoption", "sourceRef"],
      message: "migration adoption sourceRef must bind the exact proposal digest",
    });
  }
});

export const MissionRunnerRequestSchema = z.discriminatedUnion("kind", [
  StatusRequestSchema,
  InputRequestSchema,
  ShutdownRequestSchema,
  RecoveryRequestSchema,
  ReconciliationCommitRequestSchema,
  AnchorAdoptionRequestSchema,
  AnchorMigrationAdoptionRequestSchema,
]);

const SuccessfulResponseSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  ok: z.literal(true),
  status: MissionRunnerStatusSchema,
  receipt: MissionInputReceiptSchema.optional(),
  recoveryCapabilities: MissionRecoveryCapabilitiesSchema.optional(),
}).strict();

const FailedResponseSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  ok: z.literal(false),
  error: z.string().min(1),
}).strict();

export const MissionRunnerResponseSchema = z.discriminatedUnion("ok", [
  SuccessfulResponseSchema,
  FailedResponseSchema,
]);

export type MissionRunnerState = z.infer<typeof MissionRunnerStateSchema>;
export type MissionRunnerStatus = z.infer<typeof MissionRunnerStatusSchema>;
export type MissionRecoveryCapabilities = z.infer<typeof MissionRecoveryCapabilitiesSchema>;
export type MissionRunnerRequest = z.infer<typeof MissionRunnerRequestSchema>;
export type MissionRunnerResponse = z.infer<typeof MissionRunnerResponseSchema>;
export interface MissionRunnerExpectedTarget {
  readonly expectedRunnerId?: string;
  readonly expectedState?: MissionRunnerState;
}
export type MissionRunnerRequestDraft =
  | { readonly kind: "status" }
  | { readonly kind: "runner-shutdown" }
  | { readonly kind: "recovery"; readonly recovery: MissionTurnRecoveryCommand }
    & MissionRunnerExpectedTarget
  | ({ readonly kind: "reconciliation-commit"; readonly commit: MissionReconciliationCommit }
    & Required<MissionRunnerExpectedTarget>)
  | ({ readonly kind: "anchor-adoption"; readonly adoption: MissionAnchorAdoption }
    & Required<MissionRunnerExpectedTarget>)
  | ({
    readonly kind: "anchor-migration-adoption";
    readonly proposalDigest: string;
    readonly adoption: MissionAnchorAdoption;
    readonly retireCarrier: true;
  } & Required<MissionRunnerExpectedTarget>)
  | ({ readonly kind: "input"; readonly input: z.infer<typeof MissionInputDraftSchema> }
    & MissionRunnerExpectedTarget);

export interface RunMissionRunnerOptions {
  readonly root: string;
  readonly missionId: string;
  readonly now?: () => string;
  readonly prepareExecution?: MissionRuntimeFactory;
  readonly runtimeRecoveryCapabilities?: MissionRuntimeRecoveryCapabilities;
  readonly initialAnchor?: MissionAnchorSeed;
}

export function missionRunnerSocketPath(root: string, missionId: string): string {
  const user = typeof process.getuid === "function" ? process.getuid() : "user";
  return join(
    tmpdir(),
    `rosso-${user}`,
    `${hash(`${resolve(root)}\0${missionId}`).slice(0, 24)}.sock`,
  );
}

export async function readMissionRunnerStatus(
  root: string,
  missionId: string,
): Promise<MissionRunnerStatus | undefined> {
  try {
    const status = MissionRunnerStatusSchema.parse(JSON.parse(
      await readFile(missionRunnerStatusPath(root, missionId), "utf8"),
    ));
    if (status.missionId !== missionId) {
      throw new Error(`runner status belongs to Mission ${status.missionId}, not ${missionId}`);
    }
    return status;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

/**
 * Runs one Mission-scoped background carrier. The event stream is semantic
 * authority; the status file is only a rebuildable operational projection.
 */
export async function runMissionRunner(options: RunMissionRunnerOptions): Promise<MissionRunnerStatus> {
  const root = resolve(options.root);
  const missionId = z.string().min(1).parse(options.missionId);
  const runtimeRecoveryCapabilities = options.prepareExecution === undefined
    ? undefined
    : MissionRuntimeRecoveryCapabilitiesSchema.parse(
      options.runtimeRecoveryCapabilities ?? { resume: false, replace: false },
    );
  const now = options.now ?? (() => new Date().toISOString());
  const runnerId = randomUUID();
  const startedAt = now();
  const socketPath = missionRunnerSocketPath(root, missionId);
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId), now);
  if (options.initialAnchor !== undefined) {
    if (options.initialAnchor.missionId !== missionId) {
      throw new Error(`Initial anchor belongs to Mission ${options.initialAnchor.missionId}, not ${missionId}`);
    }
    await timeline.seedAnchor(options.initialAnchor);
  }
  let status = await projectStatus({
    timeline,
    missionId,
    runnerId,
    startedAt,
    socketPath,
    now,
    hasLiveExecution: false,
    hasRuntime: options.prepareExecution !== undefined,
  });

  if (status.state === "mission-stopped") {
    await writeStatus(root, missionId, status);
    return status;
  }

  await mkdir(dirname(socketPath), { recursive: true, mode: 0o700 });
  await removeStaleMissionRunnerSocket(socketPath);

  const server = createServer();
  let execution: MissionExecutionHandle | undefined;
  let initialization: Promise<void> = Promise.resolve();
  let closing = false;
  let queue: Promise<void> = Promise.resolve();
  let settle!: (value: MissionRunnerStatus) => void;
  let reject!: (reason: unknown) => void;
  const completion = new Promise<MissionRunnerStatus>((resolveCompletion, rejectCompletion) => {
    settle = resolveCompletion;
    reject = rejectCompletion;
  });

  const closeServer = (): void => {
    server.close((error) => {
      if (error !== undefined) reject(error);
      else settle(status);
    });
  };
  const respondAndClose = (socket: Socket, response: MissionRunnerResponse): void => {
    closing = true;
    sendResponse(socket, response, closeServer);
  };
  const failRunner = (error: unknown): void => {
    if (closing) {
      reject(error);
      return;
    }
    closing = true;
    execution?.cancel("Mission runner failed to retain execution state");
    server.close(() => reject(error));
  };

  server.on("connection", (socket) => {
    receiveRequest(socket, (unparsedRequest) => {
      queue = queue
        .then(async () => {
          await initialization;
          let requestId = requestIdFromUnparsedRequest(unparsedRequest);
          try {
            const request = MissionRunnerRequestSchema.parse(unparsedRequest);
            requestId = request.requestId;
            if (closing) throw new Error(`Mission runner ${runnerId} is shutting down`);

            if (request.kind === "status") {
              sendResponse(socket, success(
                request.requestId,
                status,
                undefined,
                recoveryCapabilities(status, runtimeRecoveryCapabilities),
              ));
              return;
            }

            if (request.kind === "runner-shutdown") {
              const stopped = MissionRunnerStatusSchema.parse({
                ...status,
                state: "stopped",
                updatedAt: now(),
                stopReason: "runner-shutdown",
              });
              await writeStatus(root, missionId, stopped);
              status = stopped;
              execution?.cancel("Mission runner shutdown");
              respondAndClose(socket, success(request.requestId, status));
              return;
            }

            if (request.kind === "recovery") {
              if (status.state === "anchor-pending") {
                throw new Error(
                  `Mission ${missionId} has no authorized intent anchor; only status, shutdown, or guarded anchor adoption is allowed`,
                );
              }
              assertExpectedRunnerTarget(request, status);
              await recoverExecution(request.recovery);
              status = await projectStatus({
                timeline,
                missionId,
                runnerId,
                startedAt,
                socketPath,
                now,
                hasLiveExecution: execution !== undefined,
                hasRuntime: options.prepareExecution !== undefined,
              });
              await writeStatus(root, missionId, status);
              sendResponse(socket, success(request.requestId, status));
              return;
            }

            if (request.kind === "reconciliation-commit") {
              assertRequiredExpectedRunnerTarget(request, status);
              if (status.state === "anchor-pending") {
                throw new Error(
                  `Mission ${missionId} has no authorized intent anchor; reconciliation is unavailable`,
                );
              }
              if (execution !== undefined) {
                throw new Error(`Mission ${missionId} cannot commit reconciliation while a turn is still live`);
              }
              const proposalAnchor = request.commit.proposal.anchor;
              const sourceInput = (
                await timeline.readInputsAfter(
                  missionId,
                  proposalAnchor.reconciledWatermark,
                )
              ).find((input) =>
                input.inputId === request.commit.proposal.inputRef.inputId
                && input.watermark === request.commit.proposal.inputRef.watermark
              );
              if (sourceInput === undefined) {
                throw new Error(
                  `Mission ${missionId} cannot verify reconciliation evidence without its exact source input`,
                );
              }
              await verifyRetainedReconciliationEvidence({
                home: root,
                missionId,
                commit: request.commit,
                activeAnchor: proposalAnchor,
                input: sourceInput,
              });
              const previousWatermark = (
                await timeline.latestReconciledAnchor(missionId)
              )?.reconciledWatermark ?? 0;
              await timeline.commitReconciliation(request.commit);
              status = await projectStatus({
                timeline,
                missionId,
                runnerId,
                startedAt,
                socketPath,
                now,
                hasLiveExecution: false,
                hasRuntime: options.prepareExecution !== undefined,
              });
              await writeStatus(root, missionId, status);
              if (
                status.reconciledWatermark > previousWatermark
                && status.state === "running"
                && options.prepareExecution !== undefined
              ) {
                await startFreshExecution();
                status = await projectStatus({
                  timeline,
                  missionId,
                  runnerId,
                  startedAt,
                  socketPath,
                  now,
                  hasLiveExecution: execution !== undefined,
                  hasRuntime: options.prepareExecution !== undefined,
                });
                await writeStatus(root, missionId, status);
              }
              sendResponse(socket, success(request.requestId, status));
              return;
            }

            if (request.kind === "anchor-adoption") {
              assertRequiredExpectedRunnerTarget(request, status);
              if (execution !== undefined) {
                throw new Error(`Mission ${missionId} cannot adopt a legacy anchor while a turn is still live`);
              }
              if (options.prepareExecution !== undefined) {
                throw new Error(
                  `Mission ${missionId} legacy anchor adoption requires a no-runtime carrier`,
                );
              }
              if (request.adoption.missionId !== missionId) {
                throw new Error(
                  `Mission anchor adoption belongs to ${request.adoption.missionId}, not ${missionId}`,
                );
              }
              await timeline.adoptLegacyAnchor(request.adoption);
              status = await projectStatus({
                timeline,
                missionId,
                runnerId,
                startedAt,
                socketPath,
                now,
                hasLiveExecution: false,
                hasRuntime: options.prepareExecution !== undefined,
              });
              await writeStatus(root, missionId, status);
              sendResponse(socket, success(request.requestId, status));
              return;
            }

            if (request.kind === "anchor-migration-adoption") {
              assertRequiredExpectedRunnerTarget(request, status);
              if (execution !== undefined) {
                throw new Error(
                  `Mission ${missionId} cannot settle anchor migration while a turn is still live`,
                );
              }
              if (request.adoption.missionId !== missionId) {
                throw new Error(
                  `Mission anchor migration belongs to ${request.adoption.missionId}, not ${missionId}`,
                );
              }
              await timeline.adoptLegacyAnchor(request.adoption);
              // Adoption is the irreversible semantic boundary. From this
              // point the runtime-bearing carrier must never accept another
              // request, even if its rebuildable status write fails.
              closing = true;
              try {
                const adopted = await projectStatus({
                  timeline,
                  missionId,
                  runnerId,
                  startedAt,
                  socketPath,
                  now,
                  hasLiveExecution: false,
                  hasRuntime: options.prepareExecution !== undefined,
                });
                status = MissionRunnerStatusSchema.parse({
                  ...adopted,
                  state: "stopped",
                  updatedAt: now(),
                  stopReason: "runner-shutdown",
                });
                await writeStatus(root, missionId, status);
                sendResponse(socket, success(request.requestId, status), closeServer);
              } catch (error) {
                status = MissionRunnerStatusSchema.parse({
                  ...status,
                  state: "stopped",
                  updatedAt: now(),
                  stopReason: "runner-shutdown",
                });
                await writeStatus(root, missionId, status).catch(() => undefined);
                sendResponse(
                  socket,
                  failure(request.requestId, error),
                  closeServer,
                );
              }
              return;
            }

            assertExpectedRunnerTarget(request, status);
            if (status.state === "anchor-pending") {
              throw new Error(
                `Mission ${missionId} has no authorized intent anchor; only status, shutdown, or guarded anchor adoption is allowed`,
              );
            }
            const receipt = await timeline.appendInput(missionId, request.input);
            execution?.observeInput(receipt);
            status = await projectStatus({
              timeline,
              missionId,
              runnerId,
              startedAt,
              socketPath,
              now,
              hasLiveExecution: execution !== undefined,
              hasRuntime: options.prepareExecution !== undefined,
            });
            await writeStatus(root, missionId, status);
            const response = success(request.requestId, status, receipt);
            if (status.state === "mission-stopped") respondAndClose(socket, response);
            else sendResponse(socket, response);
          } catch (error) {
            sendResponse(socket, failure(requestId, error));
          }
        })
        .catch(failRunner);
    });
  });
  server.on("error", reject);

  await listen(server, socketPath);
  initialization = initializeExecution();
  try {
    await initialization;
  } catch (error) {
    await closeListeningServer(server);
    await rm(socketPath, { force: true });
    throw error;
  }
  await writeStatus(root, missionId, status);

  const stopForSignal = (): void => {
    if (closing) return;
    closing = true;
    execution?.cancel("Mission runner received a process signal");
    queue = queue
      .then(async () => {
        status = MissionRunnerStatusSchema.parse({
          ...status,
          state: "stopped",
          updatedAt: now(),
          stopReason: "runner-shutdown",
        });
        await writeStatus(root, missionId, status);
        closeServer();
      })
      .catch((error) => {
        server.close(() => reject(error));
      });
  };
  process.once("SIGINT", stopForSignal);
  process.once("SIGTERM", stopForSignal);

  try {
    return await completion;
  } finally {
    process.off("SIGINT", stopForSignal);
    process.off("SIGTERM", stopForSignal);
    await rm(socketPath, { force: true });
  }

  async function initializeExecution(): Promise<void> {
    if (options.prepareExecution === undefined) return;
    if (await timeline.latestReconciledAnchor(missionId) === undefined) {
      throw new Error(
        `Mission ${missionId} has no authorized intent anchor and cannot execute semantic work`,
      );
    }
    if (status.state === "interrupted" || status.state === "input-pending" || status.state === "paused") return;
    if (status.state !== "running") {
      throw new Error(`Mission ${missionId} cannot start a turn while its state is ${status.state}`);
    }
    await startFreshExecution();
  }

  async function startFreshExecution(): Promise<void> {
    if (options.prepareExecution === undefined) {
      throw new Error(`Mission ${missionId} has no runtime module for a fresh turn`);
    }
    if (execution !== undefined) throw new Error(`Mission ${missionId} already has a live turn`);
    if (await timeline.latestReconciledAnchor(missionId) === undefined) {
      throw new Error(
        `Mission ${missionId} has no authorized intent anchor and cannot start a fresh turn`,
      );
    }
    const prepared = await options.prepareExecution({ root, missionId, timeline });
    const turn = MissionTurnStartSchema.parse(prepared.turn);
    await timeline.startTurn(missionId, turn);
    hostExecution(turn, prepared.controller);
  }

  async function recoverExecution(command: MissionTurnRecoveryCommand): Promise<void> {
    const recorded = await timeline.findTurnRecovery(missionId, command.id);
    if (recorded !== undefined) {
      if (
        recorded.actorRef !== command.actorRef
        || recorded.sourceRef !== command.sourceRef
        || recorded.action.kind !== command.action
      ) throw new Error(`Mission recovery ${command.id} conflicts with its recorded event`);
      return;
    }
    if (execution !== undefined) throw new Error(`Mission ${missionId} already has a live turn`);
    if (status.state !== "interrupted") {
      throw new Error(`Mission ${missionId} cannot recover a turn while its state is ${status.state}`);
    }
    const interrupted = await timeline.latestTurn(missionId);
    if (interrupted === undefined || !missionTurnNeedsRecovery(interrupted)) {
      throw new Error(`Mission ${missionId} has no interrupted turn to recover`);
    }
    if (command.action === "abandon") {
      await timeline.recoverTurn(missionId, MissionTurnRecoverySchema.parse({
        version: MISSION_TURN_RECOVERY_VERSION,
        id: command.id,
        actorRef: command.actorRef,
        sourceRef: command.sourceRef,
        interruptedTurnId: interrupted.start.turnId,
        action: { kind: "abandon" },
      }));
      return;
    }
    if (await timeline.latestReconciledAnchor(missionId) === undefined) {
      throw new Error(
        `Mission ${missionId} has no authorized intent anchor and cannot recover semantic work`,
      );
    }
    if (options.prepareExecution === undefined) {
      throw new Error(`Mission ${missionId} recovery ${command.action} requires a runtime module`);
    }
    const prepared = await options.prepareExecution({
      root,
      missionId,
      timeline,
      recovery: { action: command.action, interruptedTurn: interrupted.start },
    });
    const turn = MissionTurnStartSchema.parse(prepared.turn);
    if (command.action === "resume" && stableStringify(turn) !== stableStringify(interrupted.start)) {
      throw new Error(`Mission ${missionId} resume must reconstruct interrupted turn ${interrupted.start.turnId}`);
    }
    if (command.action === "replace" && turn.turnId === interrupted.start.turnId) {
      throw new Error(`Mission ${missionId} replacement must use a new turn identity`);
    }
    await timeline.recoverTurn(missionId, MissionTurnRecoverySchema.parse({
      version: MISSION_TURN_RECOVERY_VERSION,
      id: command.id,
      actorRef: command.actorRef,
      sourceRef: command.sourceRef,
      interruptedTurnId: interrupted.start.turnId,
      action: command.action === "resume"
        ? { kind: "resume" }
        : { kind: "replace", replacement: turn },
    }));
    hostExecution(turn, prepared.controller);
  }

  function hostExecution(
    turn: MissionTurnStart,
    controller: Parameters<typeof startMissionExecution>[0],
  ): void {
    const handle = startMissionExecution(controller);
    execution = handle;
    void handle.settled.then((outcome) => {
      queue = queue.then(async () => {
        const settlement = settlementFromExecution(outcome);
        if (settlement !== undefined) await timeline.settleTurn(missionId, turn.turnId, settlement);
        if (execution === handle) execution = undefined;
        if (closing) return;
        status = await projectStatus({
          timeline,
          missionId,
          runnerId,
          startedAt,
          socketPath,
          now,
          hasLiveExecution: false,
          hasRuntime: options.prepareExecution !== undefined,
        });
        await writeStatus(root, missionId, status);
      }).catch(failRunner);
    }).catch(failRunner);
  }
}

export async function requestMissionRunner(
  root: string,
  missionId: string,
  unparsedRequest: MissionRunnerRequest,
  timeoutMs = 5_000,
): Promise<MissionRunnerResponse> {
  const request = MissionRunnerRequestSchema.parse(unparsedRequest);
  const socketPath = missionRunnerSocketPath(root, missionId);
  return await new Promise<MissionRunnerResponse>((resolveResponse, rejectResponse) => {
    const socket = createConnection(socketPath);
    let content = "";
    let settled = false;
    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      action();
    };
    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk) => {
      content += chunk;
      const newline = content.indexOf("\n");
      if (newline < 0) return;
      try {
        const response = MissionRunnerResponseSchema.parse(JSON.parse(content.slice(0, newline)));
        if (response.requestId !== request.requestId) {
          const detail = response.ok ? "" : `: ${response.error}`;
          throw new Error(
            `Mission runner response ${response.requestId} does not match request ${request.requestId}${detail}`,
          );
        }
        finish(() => resolveResponse(response));
      } catch (error) {
        finish(() => rejectResponse(error));
      }
    });
    socket.on("timeout", () => finish(() => rejectResponse(
      new Error(`Mission runner request ${request.requestId} timed out`),
    )));
    socket.on("error", (error) => finish(() => rejectResponse(error)));
    socket.on("end", () => {
      if (!settled) finish(() => rejectResponse(new Error("Mission runner closed without a response")));
    });
  });
}

export type MissionRunnerReachabilityFailure = {
  readonly standing: "unreachable" | "unknown";
  readonly code: string | null;
  readonly message: string;
  readonly socketPathStanding?: "present" | "absent" | "unverified";
};

/**
 * A missing socket or a refused connection proves that no carrier is accepting
 * requests at the Mission's exact socket. Permission failures, timeouts, and
 * malformed or missing responses only prove that this observer could not
 * establish reachability; callers must not lower those observations to
 * `live: false`.
 */
export function classifyMissionRunnerReachabilityFailure(
  error: unknown,
): MissionRunnerReachabilityFailure {
  const code = error !== null
      && typeof error === "object"
      && "code" in error
      && typeof error.code === "string"
    ? error.code
    : null;
  return {
    standing: code === "ENOENT" || code === "ECONNREFUSED"
      ? "unreachable"
      : "unknown",
    code,
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function classifyMissionRunnerReachabilityFailureAtSocket(
  error: unknown,
  socketPath: string,
): Promise<MissionRunnerReachabilityFailure> {
  const classified = classifyMissionRunnerReachabilityFailure(error);
  if (classified.code !== "ENOENT") return classified;
  try {
    await stat(socketPath);
    return {
      ...classified,
      standing: "unknown",
      socketPathStanding: "present",
    };
  } catch (pathError) {
    const pathCode = pathError !== null
        && typeof pathError === "object"
        && "code" in pathError
        && typeof pathError.code === "string"
      ? pathError.code
      : null;
    if (pathCode === "ENOENT") {
      return {
        ...classified,
        standing: "unreachable",
        socketPathStanding: "absent",
      };
    }
    return {
      ...classified,
      standing: "unknown",
      socketPathStanding: "unverified",
    };
  }
}

/**
 * Returns a live status only after an exact runner response. A definitively
 * absent/refused socket returns `undefined`; observer uncertainty remains an
 * error so mutation callers cannot treat it as carrier absence.
 */
export async function readVerifiedMissionRunnerIfReachable(
  root: string,
  missionId: string,
  timeoutMs = 300,
): Promise<MissionRunnerStatus | undefined> {
  try {
    const response = await requestMissionRunner(
      root,
      missionId,
      missionRunnerRequest({ kind: "status" }),
      timeoutMs,
    );
    if (!response.ok) throw new Error(response.error);
    return response.status;
  } catch (error) {
    const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
      error,
      missionRunnerSocketPath(root, missionId),
    );
    if (reachability.standing === "unknown") {
      throw new Error(
        `Mission ${missionId} runner reachability could not be verified: ${reachability.message}`,
        { cause: error },
      );
    }
    return undefined;
  }
}

export function missionRunnerRequest(
  request: MissionRunnerRequestDraft,
): MissionRunnerRequest {
  return MissionRunnerRequestSchema.parse({
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId: randomUUID(),
    ...request,
  });
}

async function projectStatus(input: {
  readonly timeline: FileMissionTimeline;
  readonly missionId: string;
  readonly runnerId: string;
  readonly startedAt: string;
  readonly socketPath: string;
  readonly now: () => string;
  readonly hasLiveExecution: boolean;
  readonly hasRuntime: boolean;
}): Promise<MissionRunnerStatus> {
  const receipts = await input.timeline.readInputsAfter(input.missionId, 0);
  const inputWatermark = receipts.at(-1)?.watermark ?? 0;
  const activeAnchor = await input.timeline.latestReconciledAnchor(input.missionId);
  const reconciledWatermark = activeAnchor?.reconciledWatermark ?? 0;
  let paused = false;
  let stopped = false;
  const turn = await input.timeline.latestTurn(input.missionId);
  for (const receipt of receipts) {
    if (receipt.payload.kind !== "control") continue;
    if (receipt.payload.command === "pause") paused = true;
    if (receipt.payload.command === "resume") paused = false;
    if (receipt.payload.command === "stop") stopped = true;
  }
  const state: MissionRunnerState = stopped
    ? "mission-stopped"
    : activeAnchor === undefined
      ? "anchor-pending"
      : paused
        ? "paused"
        : inputWatermark > reconciledWatermark
          ? "input-pending"
          : turn !== undefined && missionTurnNeedsRecovery(turn) && !input.hasLiveExecution
            ? "interrupted"
            : !input.hasRuntime && !input.hasLiveExecution
              ? "idle"
              : "running";
  return MissionRunnerStatusSchema.parse({
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    runnerId: input.runnerId,
    missionId: input.missionId,
    pid: process.pid,
    state,
    startedAt: input.startedAt,
    updatedAt: input.now(),
    inputWatermark,
    reconciledWatermark,
    runtimeMode: input.hasRuntime ? "configured" : "none",
    socketPath: input.socketPath,
    stopReason: stopped ? "mission-stop" : null,
  });
}

function success(
  requestId: string,
  status: MissionRunnerStatus,
  receipt?: MissionInputReceipt,
  capabilities?: MissionRecoveryCapabilities,
): MissionRunnerResponse {
  return MissionRunnerResponseSchema.parse({
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId,
    ok: true,
    status,
    ...(receipt === undefined ? {} : { receipt }),
    ...(capabilities === undefined ? {} : { recoveryCapabilities: capabilities }),
  });
}

function assertExpectedRunnerTarget(
  request: Extract<MissionRunnerRequest, {
    kind:
      | "input"
      | "recovery"
      | "reconciliation-commit"
      | "anchor-adoption"
      | "anchor-migration-adoption";
  }>,
  status: MissionRunnerStatus,
): void {
  const hasExpectedRunner = request.expectedRunnerId !== undefined;
  const hasExpectedState = request.expectedState !== undefined;
  if (hasExpectedRunner !== hasExpectedState) {
    throw new Error("guarded Mission action requires both expectedRunnerId and expectedState");
  }
  if (!hasExpectedRunner || !hasExpectedState) return;
  if (request.expectedRunnerId !== status.runnerId) {
    throw new Error(
      `Mission ${status.missionId} runner changed from ${request.expectedRunnerId} to ${status.runnerId}`,
    );
  }
  if (request.expectedState !== status.state) {
    throw new Error(
      `Mission ${status.missionId} state changed from ${request.expectedState} to ${status.state}`,
    );
  }
}

function assertRequiredExpectedRunnerTarget(
  request: Extract<MissionRunnerRequest, {
    kind: "reconciliation-commit" | "anchor-adoption" | "anchor-migration-adoption";
  }>,
  status: MissionRunnerStatus,
): void {
  if (request.expectedRunnerId === undefined || request.expectedState === undefined) {
    throw new Error(`${request.kind} requires expectedRunnerId and expectedState`);
  }
  assertExpectedRunnerTarget(request, status);
}

function recoveryCapabilities(
  status: MissionRunnerStatus,
  runtime: MissionRuntimeRecoveryCapabilities | undefined,
): MissionRecoveryCapabilities {
  const interrupted = status.state === "interrupted";
  return {
    abandon: interrupted,
    resume: interrupted && runtime?.resume === true,
    replace: interrupted && runtime?.replace === true,
  };
}

function failure(requestId: string, error: unknown): MissionRunnerResponse {
  return {
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

function requestIdFromUnparsedRequest(value: unknown): string {
  if (
    value !== null
    && typeof value === "object"
    && "requestId" in value
    && typeof value.requestId === "string"
    && value.requestId.length > 0
  ) {
    return value.requestId;
  }
  return "unparsed";
}

function receiveRequest(socket: Socket, receive: (request: unknown) => void): void {
  socket.setEncoding("utf8");
  let content = "";
  let received = false;
  socket.on("data", (chunk) => {
    if (received) return;
    content += chunk;
    const newline = content.indexOf("\n");
    if (newline < 0) return;
    received = true;
    try {
      receive(JSON.parse(content.slice(0, newline)));
    } catch (error) {
      sendResponse(socket, failure("unparsed", error));
    }
  });
  socket.on("end", () => {
    if (!received) sendResponse(socket, failure("unparsed", new Error("Mission runner request is incomplete")));
  });
}

function sendResponse(socket: Socket, response: MissionRunnerResponse, after?: () => void): void {
  socket.end(`${JSON.stringify(response)}\n`, after);
}

async function listen(server: Server, socketPath: string): Promise<void> {
  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      rejectListen(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(socketPath);
  });
}

async function closeListeningServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

export type MissionRunnerSocketAcceptanceProbe = (
  socketPath: string,
) => Promise<boolean>;

/**
 * Removes the exact socket only after proving it is not accepting requests.
 * The injectable probe is a narrow verification seam for masked filesystem
 * failures; production callers use the real Unix-socket probe.
 */
export async function removeStaleMissionRunnerSocket(
  socketPath: string,
  probe: MissionRunnerSocketAcceptanceProbe =
    probeMissionRunnerSocketAcceptance,
): Promise<void> {
  let accepting: boolean;
  try {
    accepting = await probe(socketPath);
  } catch (error) {
    const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
      error,
      socketPath,
    );
    if (reachability.standing === "unknown") {
      throw new Error(
        `Mission runner socket reachability could not be verified before stale-socket cleanup: ${reachability.message}`,
        { cause: error },
      );
    }
    accepting = false;
  }
  if (accepting) throw new Error(`Mission runner socket is already active at ${socketPath}`);
  await rm(socketPath, { force: true });
}

async function probeMissionRunnerSocketAcceptance(
  socketPath: string,
): Promise<boolean> {
  return await new Promise<boolean>((resolveAccepting, rejectAccepting) => {
    const socket = createConnection(socketPath);
    socket.once("connect", () => {
      socket.destroy();
      resolveAccepting(true);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      rejectAccepting(error);
    });
  });
}

async function writeStatus(root: string, missionId: string, status: MissionRunnerStatus): Promise<void> {
  const path = missionRunnerStatusPath(root, missionId);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(MissionRunnerStatusSchema.parse(status), null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
