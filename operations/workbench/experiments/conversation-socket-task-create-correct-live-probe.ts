import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { loadPrincipalTasks } from "../src/tasks";
import { createConversationContextProvider } from "../src/conversation/context";
import { createConversationTaskOperationHost } from "../src/conversation/operations";
import {
  ConversationSocketRuntime,
  ServerFrameSchema,
  type ConversationSocketData,
} from "../src/conversation/transport";
import { createCoordinatorTurnOwner } from "../src/conversation/turn-owner";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";

const PROBE_ID = "conversation-socket-task-create-correct-live-probe";
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const defaultOutputPath = resolve(
  import.meta.dir,
  "evidence",
  `${new Date().toISOString().slice(0, 10)}-${PROBE_ID}.json`,
);
const outputPath = resolve(outputArgument ?? defaultOutputPath);
const apiKey = process.env.DEEPSEEK_API_KEY;

const TURN_DEADLINE_MS = 480_000;

const startedAt = new Date().toISOString();
const evidence: Record<string, unknown> = {
  probe: PROBE_ID,
  version: 1,
  intent: [
    "One authorized disposable-home local loopback Workbench conversation socket probe through the real production path:",
    "the socket runtime runs the production DeepSeek Pro/max coordinator turn owner, the canonical context provider, and the canonical Task operation host.",
    "The probe submits one create message and one correction message in a disposable OS temp Workbench home, then records the durable journal",
    "events, the canonical Task ID/revision lineage, and sanitized provider evidence. It does not touch the Principal's Rossovia home;",
    "the only writes are this evidence file and a disposable OS temp home.",
  ].join(" "),
  authorization: "P4a acceptance: one authorized disposable-home socket-to-DeepSeek live probe that creates then corrects one Task",
  startedAt,
  environment: {
    DEEPSEEK_API_KEY: apiKey === undefined ? "unset" : "set",
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL === undefined ? "unset" : "set",
    ROSSO_HOME: process.env.ROSSO_HOME === undefined ? "unset (principal home untouched)" : "set (probe refused)",
  },
};

if (process.env.ROSSO_HOME !== undefined) {
  evidence.status = "probe-error";
  evidence.finishedAt = new Date().toISOString();
  evidence.error = "ROSSO_HOME is set; the probe refuses to run against a shared home";
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(1);
}

function runGit(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

async function waitForTerminal(
  frames: Array<ReturnType<typeof ServerFrameSchema.parse>>,
  terminalCount: number,
): Promise<void> {
  const deadline = Date.now() + TURN_DEADLINE_MS;
  for (;;) {
    const terminals = frames.filter((frame) =>
      frame.type === "journal.event"
        && (frame.event.type === "coordinator.turn-settled"
          || frame.event.type === "coordinator.turn-failed"
          || frame.event.type === "coordinator.turn-interrupted"));
    if (terminals.length >= terminalCount) return;
    if (Date.now() > deadline) throw new Error(`probe timed out waiting for ${terminalCount} terminal turn(s)`);
    await Bun.sleep(100);
  }
}

const home = await mkdtemp(join(tmpdir(), "rossovia-conversation-task-probe-"));
try {
  initializeHome(home);

  const primary = join(home, "project");
  await mkdir(primary, { recursive: true });
  runGit(primary, "init", "-b", "main");
  runGit(primary, "config", "user.name", "Conversation Probe");
  runGit(primary, "config", "user.email", "probe@example.test");
  await writeFile(join(primary, "README.md"), "# Conversation task probe fixture\n");
  runGit(primary, "add", "README.md");
  runGit(primary, "commit", "-m", "initial");
  runGit(primary, "remote", "add", "origin", "https://example.test/lidessen/conversation-probe.git");
  const worktree = join(home, "worktree");
  runGit(primary, "worktree", "add", worktree);
  const projectId = "conversation-probe-fixture";
  registerProject(home, { path: primary, id: projectId, aliases: ["probe-fixture"] });
  const primaryHead = runGit(primary, "rev-parse", "HEAD");
  const worktreeHead = runGit(worktree, "rev-parse", "HEAD");
  evidence.fixture = {
    home: "disposable OS temp (removed after the probe)",
    projectId,
    primaryHead,
    worktreePath: worktree,
    worktreeHead,
  };

  const runtime = new ConversationSocketRuntime(home, {
    turnOwner: createCoordinatorTurnOwner(),
    projectionProvider: createConversationContextProvider(home),
    operationHost: createConversationTaskOperationHost(home),
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

  const createMessage = [
    `Create a local task for the registered project '${projectId}':`,
    `add a bounded probe marker file to the dedicated worktree at ${worktree}.`,
    "The task acceptance is that the marker file exists. Use the project and worktree selectors from the current projection.",
  ].join(" ");
  const createClientMessageId = randomUUID();
  socket.send(JSON.stringify({ type: "message.submit", clientMessageId: createClientMessageId, payload: createMessage }));
  await waitForTerminal(frames, 1);

  const correctMessage = [
    "Keep this same task, but the result must also preserve a second invariant:",
    "the probe marker file must contain exactly one line.",
    "Use the current taskId, sourceRevision, and revision from the current projection.",
  ].join(" ");
  const correctClientMessageId = randomUUID();
  socket.send(JSON.stringify({ type: "message.submit", clientMessageId: correctClientMessageId, payload: correctMessage }));
  await waitForTerminal(frames, 2);

  socket.close();
  server.stop(true);

  const events = await runtime.journal.readEvents(conversationId);
  const requestedActions = events.filter((event) => event.type === "action.requested");
  const settledActions = events.filter((event) => event.type === "action.settled");
  const failedActions = events.filter((event) => event.type === "action.failed");
  const uncertainActions = events.filter((event) => event.type === "action.uncertain");
  const terminals = events.filter((event) =>
    event.type === "coordinator.turn-settled"
    || event.type === "coordinator.turn-failed"
    || event.type === "coordinator.turn-interrupted");

  const tasks = loadPrincipalTasks(home);
  const canonical = tasks.tasks.length === 1
    ? {
      taskId: tasks.tasks[0]!.id,
      revision: tasks.tasks[0]!.revision,
      lifecycle: tasks.tasks[0]!.lifecycle,
      binding: tasks.tasks[0]!.binding,
      originSourceRef: tasks.tasks[0]!.origin.sourceRef,
      corrections: tasks.tasks[0]!.corrections.map((correction) => ({
        id: correction.id,
        statement: correction.statement,
        sourceRef: correction.sourceRef,
      })),
    }
    : undefined;

  evidence.finishedAt = new Date().toISOString();
  evidence.conversationId = conversationId;
  evidence.messages = [
    { clientMessageId: createClientMessageId, payload: createMessage },
    { clientMessageId: correctClientMessageId, payload: correctMessage },
  ];
  evidence.journalEvents = events.map((event) => ({
    sequence: event.sequence,
    type: event.type,
    at: event.at,
  }));
  evidence.requestedActions = requestedActions.map((event) =>
    event.type === "action.requested"
      ? { actionId: event.data.actionId, turnId: event.data.turnId, kind: event.data.kind, operation: event.data.operation }
      : undefined);
  evidence.settledActions = settledActions.map((event) =>
    event.type === "action.settled"
      ? { actionId: event.data.actionId, evidenceRefs: event.data.evidenceRefs }
      : undefined);
  evidence.failedActions = failedActions.map((event) =>
    event.type === "action.failed"
      ? { actionId: event.data.actionId, reason: event.data.reason }
      : undefined);
  evidence.uncertainActions = uncertainActions.map((event) =>
    event.type === "action.uncertain"
      ? { actionId: event.data.actionId, reason: event.data.reason }
      : undefined);
  evidence.turnStarts = events
    .filter((event) => event.type === "coordinator.turn-started")
    .map((event) => event.type === "coordinator.turn-started"
      ? {
        turnId: event.data.turnId,
        requestedPolicy: event.data.requestedPolicy,
        prompt: event.data.prompt,
        disclosedSources: event.data.disclosedSources,
        sourceRevisionSelectors: event.data.sourceRevisionSelectors,
      }
      : undefined);
  evidence.turnSettlements = terminals.map((event) =>
    event.type === "coordinator.turn-settled"
      ? { turnId: event.data.turnId, response: event.data.response, observedEvidence: event.data.observedEvidence }
      : event.type === "coordinator.turn-failed"
        ? { turnId: event.data.turnId, reason: event.data.reason }
        : { turnId: event.data.turnId, kind: "interrupted" });
  evidence.deltas = frames.filter((frame) => frame.type === "response.delta").map((frame) => frame.text).join("");
  evidence.deltaCount = frames.filter((frame) => frame.type === "response.delta").length;
  evidence.canonicalTasks = canonical;
  evidence.lineage = canonical === undefined
    ? undefined
    : {
      taskCount: tasks.tasks.length,
      createdAndCorrectedSameTaskId: tasks.tasks.length === 1 && canonical.corrections.length === 1,
      createActionSourceRefMatchesOrigin: requestedActions.length > 0
        && canonical.originSourceRef === `conversation:${conversationId}:action:${(requestedActions[0] as { data: { actionId: string } }).data.actionId}`,
      correctActionSourceRefMatchesCorrection: requestedActions.length > 1
        && canonical.corrections[0]!.sourceRef === `conversation:${conversationId}:action:${(requestedActions[1] as { data: { actionId: string } }).data.actionId}`,
      taskRevisionAfterCorrect: canonical.revision,
    };
  evidence.principalHomeUntouched = {
    mechanism: "the probe built its own disposable home with mkdtemp and initialized it there; ROSSO_HOME was unset",
  };
  evidence.status = canonical !== undefined && canonical.corrections.length === 1 && settledActions.length === 2
    ? "finished"
    : "mismatch";
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
