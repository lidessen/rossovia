import { createHash, randomUUID } from "node:crypto";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
  type MissionReconciliationCommit,
} from "./mission-reconciliation-commit";
import type { MissionAnchorSeed } from "./mission-reconciliation";
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
import type { MissionRuntimeFactory } from "./mission-runtime";
import { stableStringify } from "./canonical-json";

export const MISSION_RUNNER_PROTOCOL_VERSION = "atthis.mission-runner.v1" as const;

export const MissionRunnerStateSchema = z.enum([
  "running",
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
  socketPath: z.string().min(1),
  stopReason: z.enum(["runner-shutdown", "mission-stop"]).nullable(),
}).strict();

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
}).strict();

const ReconciliationCommitRequestSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  kind: z.literal("reconciliation-commit"),
  commit: MissionReconciliationCommitSchema,
}).strict();

export const MissionRunnerRequestSchema = z.discriminatedUnion("kind", [
  StatusRequestSchema,
  InputRequestSchema,
  ShutdownRequestSchema,
  RecoveryRequestSchema,
  ReconciliationCommitRequestSchema,
]);

const SuccessfulResponseSchema = z.object({
  version: z.literal(MISSION_RUNNER_PROTOCOL_VERSION),
  requestId: z.string().min(1),
  ok: z.literal(true),
  status: MissionRunnerStatusSchema,
  receipt: MissionInputReceiptSchema.optional(),
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
export type MissionRunnerRequest = z.infer<typeof MissionRunnerRequestSchema>;
export type MissionRunnerResponse = z.infer<typeof MissionRunnerResponseSchema>;
export type MissionRunnerRequestDraft =
  | { readonly kind: "status" }
  | { readonly kind: "runner-shutdown" }
  | { readonly kind: "recovery"; readonly recovery: MissionTurnRecoveryCommand }
  | { readonly kind: "reconciliation-commit"; readonly commit: MissionReconciliationCommit }
  | { readonly kind: "input"; readonly input: z.infer<typeof MissionInputDraftSchema> };

export interface RunMissionRunnerOptions {
  readonly root: string;
  readonly missionId: string;
  readonly now?: () => string;
  readonly prepareExecution?: MissionRuntimeFactory;
  readonly initialAnchor?: MissionAnchorSeed;
}

export function missionRunnerDirectory(root: string, missionId: string): string {
  return join(resolve(root), "missions", hash(missionId));
}

export function missionRunnerStatusPath(root: string, missionId: string): string {
  return join(missionRunnerDirectory(root, missionId), "runner-status.json");
}

export function missionRunnerSocketPath(root: string, missionId: string): string {
  const user = typeof process.getuid === "function" ? process.getuid() : "user";
  return join(
    tmpdir(),
    `atthis-${user}`,
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
  });

  if (status.state === "mission-stopped") {
    await writeStatus(root, missionId, status);
    return status;
  }

  await mkdir(dirname(socketPath), { recursive: true, mode: 0o700 });
  await removeStaleSocket(socketPath);

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
          let requestId = "unparsed";
          try {
            const request = MissionRunnerRequestSchema.parse(unparsedRequest);
            requestId = request.requestId;
            if (closing) throw new Error(`Mission runner ${runnerId} is shutting down`);

            if (request.kind === "status") {
              sendResponse(socket, success(request.requestId, status));
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
              await recoverExecution(request.recovery);
              status = await projectStatus({
                timeline,
                missionId,
                runnerId,
                startedAt,
                socketPath,
                now,
                hasLiveExecution: execution !== undefined,
              });
              await writeStatus(root, missionId, status);
              sendResponse(socket, success(request.requestId, status));
              return;
            }

            if (request.kind === "reconciliation-commit") {
              if (execution !== undefined) {
                throw new Error(`Mission ${missionId} cannot commit reconciliation while a turn is still live`);
              }
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
                });
                await writeStatus(root, missionId, status);
              }
              sendResponse(socket, success(request.requestId, status));
              return;
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
          throw new Error(`Mission runner response does not match request ${request.requestId}`);
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
}): Promise<MissionRunnerStatus> {
  const receipts = await input.timeline.readInputsAfter(input.missionId, 0);
  const inputWatermark = receipts.at(-1)?.watermark ?? 0;
  const reconciledWatermark = (
    await input.timeline.latestReconciledAnchor(input.missionId)
  )?.reconciledWatermark ?? 0;
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
    : paused
      ? "paused"
      : inputWatermark > reconciledWatermark
        ? "input-pending"
        : turn !== undefined && missionTurnNeedsRecovery(turn) && !input.hasLiveExecution
          ? "interrupted"
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
    socketPath: input.socketPath,
    stopReason: stopped ? "mission-stop" : null,
  });
}

function success(
  requestId: string,
  status: MissionRunnerStatus,
  receipt?: MissionInputReceipt,
): MissionRunnerResponse {
  return MissionRunnerResponseSchema.parse({
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId,
    ok: true,
    status,
    ...(receipt === undefined ? {} : { receipt }),
  });
}

function failure(requestId: string, error: unknown): MissionRunnerResponse {
  return {
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
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

async function removeStaleSocket(socketPath: string): Promise<void> {
  const accepting = await new Promise<boolean>((resolveAccepting, rejectAccepting) => {
    const socket = createConnection(socketPath);
    socket.once("connect", () => {
      socket.destroy();
      resolveAccepting(true);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      if (error.code === "ENOENT" || error.code === "ECONNREFUSED") resolveAccepting(false);
      else rejectAccepting(error);
    });
  });
  if (accepting) throw new Error(`Mission runner socket is already active at ${socketPath}`);
  await rm(socketPath, { force: true });
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
