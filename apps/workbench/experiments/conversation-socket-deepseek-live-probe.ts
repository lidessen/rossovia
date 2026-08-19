import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  ConversationSocketRuntime,
  ServerFrameSchema,
  type ConversationSocketData,
} from "../src/conversation/transport";
import { createCoordinatorTurnOwner } from "../src/conversation/turn-owner";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../../gateway/src/ui-server";

const PROBE_ID = "conversation-socket-deepseek-live-probe";
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const defaultOutputPath = resolve(
  import.meta.dir,
  "evidence",
  `${new Date().toISOString().slice(0, 10)}-${PROBE_ID}.json`,
);
const outputPath = resolve(outputArgument ?? defaultOutputPath);
const apiKey = process.env.DEEPSEEK_API_KEY;

const startedAt = new Date().toISOString();
const evidence: Record<string, unknown> = {
  probe: PROBE_ID,
  version: 1,
  intent: [
    "One authorized read-only local loopback Workbench conversation socket inquiry through the real production path:",
    "the socket runtime runs the production DeepSeek Pro/max coordinator turn owner.",
    "The probe records the durable journal events, the provisional delta stream, and the retained settlement.",
    "It does not modify any Task, Mission, or project state; the only writes are this evidence file and a disposable OS temp home.",
  ].join(" "),
  authorization: "P3c acceptance: one authorized local loopback socket-to-DeepSeek read-only live probe",
  startedAt,
  environment: {
    DEEPSEEK_API_KEY: apiKey === undefined ? "unset" : "set",
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL === undefined ? "unset" : "set",
  },
};

const home = await mkdtemp(join(tmpdir(), "rossovia-conversation-probe-"));
try {
  const runtime = new ConversationSocketRuntime(home, {
    turnOwner: createCoordinatorTurnOwner(),
  });
  const handler = createWorkbenchRequestHandler(
    { port: 0, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: runtime },
  );
  const server: Bun.Server<ConversationSocketData> = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request, srv) => handler(request, srv),
    websocket: runtime.websocket,
  });
  evidence.loopback = { hostname: "127.0.0.1", port: server.port };

  const conversationId = randomUUID();
  const clientMessageId = randomUUID();
  const frames: Array<ReturnType<typeof ServerFrameSchema.parse>> = [];
  const socket = new WebSocket(
    `ws://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=-1`,
  );
  socket.addEventListener("message", (event) => {
    frames.push(ServerFrameSchema.parse(JSON.parse(String(event.data))));
  });
  await new Promise<void>((resolvePromise, reject) => {
    socket.addEventListener("open", () => resolvePromise());
    socket.addEventListener("error", () => reject(new Error("probe socket failed to open")));
  });

  socket.send(JSON.stringify({
    type: "message.submit",
    clientMessageId,
    payload: [
      "This is a read-only live probe through the Workbench conversation socket.",
      "State the provider, model, and reasoning effort disclosed for this turn, confirm that you took no action, and reply in one short sentence.",
    ].join(" "),
  }));

  const deadline = Date.now() + 180_000;
  for (;;) {
    if (frames.some((frame) =>
      frame.type === "journal.event"
        && (frame.event.type === "coordinator.turn-settled"
          || frame.event.type === "coordinator.turn-failed"
          || frame.event.type === "coordinator.turn-interrupted"))) {
      break;
    }
    if (Date.now() > deadline) throw new Error("probe timed out waiting for a terminal turn");
    await Bun.sleep(50);
  }
  socket.close();
  server.stop(true);

  const events = await runtime.journal.readEvents(conversationId);
  const started = events.find((event) => event.type === "coordinator.turn-started");
  const terminal = events.find((event) =>
    event.type === "coordinator.turn-settled"
    || event.type === "coordinator.turn-failed"
    || event.type === "coordinator.turn-interrupted");
  const deltas = frames.filter((frame) => frame.type === "response.delta");

  evidence.finishedAt = new Date().toISOString();
  evidence.status = terminal?.type === "coordinator.turn-settled"
    ? "finished"
    : terminal?.type === "coordinator.turn-failed"
      ? "failed"
      : terminal?.type === "coordinator.turn-interrupted"
        ? "interrupted"
        : "no-terminal";
  evidence.journalEvents = events.map((event) => ({
    sequence: event.sequence,
    type: event.type,
    at: event.at,
  }));
  evidence.turnStarted = started?.type === "coordinator.turn-started"
    ? {
      turnId: started.data.turnId,
      messageId: started.data.messageId,
      requestedPolicy: started.data.requestedPolicy,
      prompt: started.data.prompt,
      disclosedSources: started.data.disclosedSources,
      sourceRevisionSelectors: started.data.sourceRevisionSelectors,
    }
    : undefined;
  evidence.settlement = terminal?.type === "coordinator.turn-settled"
    ? { response: terminal.data.response, observedEvidence: terminal.data.observedEvidence }
    : terminal?.type === "coordinator.turn-failed"
      ? { reason: terminal.data.reason }
      : terminal?.type === "coordinator.turn-interrupted"
        ? { turnId: terminal.data.turnId }
        : undefined;
  evidence.provisionalDeltas = {
    count: deltas.length,
    text: deltas.map((frame) => frame.text).join(""),
  };
  evidence.conversationId = conversationId;
  evidence.clientMessageId = clientMessageId;
} catch (error) {
  evidence.status = "probe-error";
  evidence.finishedAt = new Date().toISOString();
  evidence.error = error instanceof Error ? error.message : String(error);
} finally {
  await rm(home, { recursive: true, force: true });
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify(evidence, null, 2));

if (evidence.status !== "finished") {
  process.exit(1);
}
