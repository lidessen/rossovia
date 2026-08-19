import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { dirname } from "node:path";
import {
  MISSION_RUNNER_PROTOCOL_VERSION,
  MissionRunnerRequestSchema,
  MissionRunnerStatusSchema,
  missionRunnerSocketPath,
  missionRunnerStatusPath,
  type MissionRunnerStatus,
} from "../../src/mission-runner";

const args = process.argv.slice(2);
const home = option("--home");
const missionId = option("--mission");
const mismatchShutdownResponse = args.includes("--mismatch-shutdown-response");
const socketPath = missionRunnerSocketPath(home, missionId);
const startedAt = new Date().toISOString();
let status = MissionRunnerStatusSchema.parse({
  version: MISSION_RUNNER_PROTOCOL_VERSION,
  runnerId: randomUUID(),
  missionId,
  pid: process.pid,
  state: "input-pending",
  startedAt,
  updatedAt: startedAt,
  inputWatermark: 1,
  reconciledWatermark: 0,
  socketPath,
  stopReason: null,
});

await mkdir(dirname(socketPath), { recursive: true, mode: 0o700 });
await rm(socketPath, { force: true });
await writeStatus(status);

const server = createServer((socket) => receive(socket));
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(socketPath, resolve);
});
await new Promise<void>((resolve) => server.once("close", resolve));
await rm(socketPath, { force: true });

function receive(socket: Socket): void {
  socket.setEncoding("utf8");
  let content = "";
  socket.on("data", (chunk) => {
    content += chunk;
    const newline = content.indexOf("\n");
    if (newline < 0) return;
    void handle(socket, JSON.parse(content.slice(0, newline)));
  });
}

async function handle(socket: Socket, input: unknown): Promise<void> {
  const request = MissionRunnerRequestSchema.parse(input);
  if (request.kind === "status") {
    socket.end(`${JSON.stringify(success(request.requestId, status))}\n`);
    return;
  }
  if (request.kind !== "runner-shutdown") {
    socket.end(`${JSON.stringify({
      version: MISSION_RUNNER_PROTOCOL_VERSION,
      requestId: request.requestId,
      ok: false,
      error: `legacy fixture does not support ${request.kind}`,
    })}\n`);
    return;
  }
  status = MissionRunnerStatusSchema.parse({
    ...status,
    state: "stopped",
    updatedAt: new Date().toISOString(),
    stopReason: "runner-shutdown",
  });
  await writeStatus(status);
  const responseStatus = mismatchShutdownResponse
    ? MissionRunnerStatusSchema.parse({
      ...status,
      runnerId: randomUUID(),
    })
    : status;
  socket.end(
    `${JSON.stringify(success(request.requestId, responseStatus))}\n`,
    () => server.close(),
  );
}

function success(requestId: string, current: MissionRunnerStatus): unknown {
  return {
    version: MISSION_RUNNER_PROTOCOL_VERSION,
    requestId,
    ok: true,
    status: current,
  };
}

async function writeStatus(current: MissionRunnerStatus): Promise<void> {
  const path = missionRunnerStatusPath(home, missionId);
  const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function option(name: string): string {
  const index = args.indexOf(name);
  const value = args[index + 1];
  if (index < 0 || value === undefined) {
    throw new Error(`legacy Mission runner fixture requires ${name}`);
  }
  return value;
}
