import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCell } from "../../../../packages/work-cell/src/run-cell";
import {
  RETURN_TRIGGER_EVENT,
  createReturnTriggerArmDriver,
  type ReturnTriggerArm,
} from "./return-trigger-driver";
import {
  classifyReturnTriggerDelivery,
  verifyExactFixture,
} from "./runner-contract";

const primaryPath = "src/adapters/northstar-job-event.ts";
const companionObligation = "[ ] Reconcile conformance/northstar-job-events-v2/case-07.json: valid v2 input/expected pair consistent with repaired adapter; complete when independent semantic review accepts protocol truth and cross-artifact consistency.";
const roots: string[] = [];

try {
  const control = await runWriteScenario("control", [primaryPath]);
  const treatment = await runWriteScenario("treatment", [primaryPath]);

  assert.deepEqual(
    treatment.requests[0],
    control.requests[0],
    "the arms must have byte-equivalent initial model requests",
  );
  assert.equal(count(treatment.requests[0], companionObligation), 1);
  assert.equal(count(control.requests[0], companionObligation), 1);
  assert.equal(count(treatment.requests[1], companionObligation), 2);
  assert.equal(count(control.requests[1], companionObligation), 1);
  assert.equal(count(treatment.requests[1], '"returnTrigger"'), 1);
  assert.equal(count(control.requests[1], '"returnTrigger"'), 0);
  assert.deepEqual(treatment.deliveryOrder, [
    "agent.tool.started",
    "tool.write_file",
    RETURN_TRIGGER_EVENT,
    "agent.tool.finished",
  ]);
  assert.equal(control.deliveryEvents, 0);

  const duplicate = await runWriteScenario("treatment", [primaryPath, primaryPath]);
  assert.equal(duplicate.deliveryEvents, 1);
  assert.equal(count(duplicate.requests.at(-1), companionObligation), 2);

  const failed = await runWriteScenario("treatment", ["../outside.ts"]);
  assert.equal(failed.deliveryEvents, 0);

  const early = await runEarlySettlementScenario();
  assert.equal(early.deliveryEvents, 0);

  const contaminated = await freshFixture();
  await writeFile(join(contaminated, "prior-output.txt"), "stale run evidence\n", "utf8");
  await assert.rejects(
    verifyExactFixture(contaminated, join(import.meta.dir, "fixture.sha256")),
    /fixture file set mismatch/,
  );

  const invalid = classifyReturnTriggerDelivery(
    "control",
    [{
      at: new Date(0).toISOString(),
      type: RETURN_TRIGGER_EVENT,
      data: {
        version: "unknown-version",
        primaryPath,
        obligationSha256: obligationSha256(companionObligation),
      },
    }],
    primaryPath,
    obligationSha256(companionObligation),
    "work-cell.run.v4",
  );
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.eventCount, 1);

  console.log(JSON.stringify({
    status: "passed",
    checks: {
      initialRequestsMatched: true,
      treatmentPresentedOnceAfterSuccessfulPrimaryWrite: true,
      controlUnchanged: true,
      duplicateWriteDidNotRepeatTrigger: true,
      failedWriteDidNotTrigger: true,
      earlySettlementDidNotTrigger: true,
      extraFixtureFileRejected: true,
      protocolInvalidityClassifiedWithoutThrowing: true,
    },
  }, null, 2));
} finally {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}

async function runWriteScenario(arm: ReturnTriggerArm, paths: string[]) {
  const root = await freshFixture();
  const requests: unknown[] = [];
  const original = await readFile(join(root, primaryPath), "utf8");
  let call = 0;
  const model = mockModel(async (options) => {
      requests.push(options);
      const path = paths[call];
      call += 1;
      if (path) {
        return response([{
          type: "tool-call",
          toolCallId: `write-${call}`,
          toolName: "write_file",
          input: JSON.stringify({ path, content: original }),
        }], "tool-calls");
      }
      return response([{ type: "text", text: "Work branch ended." }], "stop");
  });
  const driver = makeDriver(arm, model);
  const record = await runCell(await input(root, paths.length + 1), driver);
  const relevant = record.trace
    .filter((event) => [
      "agent.tool.started",
      "tool.write_file",
      RETURN_TRIGGER_EVENT,
      "agent.tool.finished",
    ].includes(event.type))
    .map((event) => event.type);
  return {
    requests,
    deliveryEvents: record.trace.filter((event) => event.type === RETURN_TRIGGER_EVENT).length,
    deliveryOrder: relevant.slice(0, 4),
  };
}

async function runEarlySettlementScenario() {
  const root = await freshFixture();
  const model = mockModel(async () => (
    response([{ type: "text", text: "Settled before writing." }], "stop")
  ));
  const record = await runCell(await input(root, 1), makeDriver("treatment", model));
  return {
    deliveryEvents: record.trace.filter((event) => event.type === RETURN_TRIGGER_EVENT).length,
  };
}

function makeDriver(arm: ReturnTriggerArm, model: object) {
  const driverOptions = {
    route: [{
      provider: "deepseek" as const,
      credential: { source: "env" as const, name: "DEEPSEEK_TEST_KEY" },
    }],
    deepSeekApiKey: "not-used",
    model: "mock-return-trigger",
  };
  const driver = createReturnTriggerArmDriver({
    driver: driverOptions,
    arm,
    primaryPath,
    openCompanionObligation: companionObligation,
  });
  Object.defineProperty(driver, "model", { value: model });
  return driver;
}

async function input(root: string, maxSteps: number) {
  const [task, todo] = await Promise.all([
    readFile(join(root, "TASK.md"), "utf8"),
    readFile(join(root, "todo.md"), "utf8"),
  ]);
  return {
    id: "todo-return-trigger-action-probe",
    intent: "Exercise the same bounded maintenance task in both arms.",
    workspace: {
      root,
      readPaths: ["."],
      writePaths: [primaryPath],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: ["Complete the bounded maintenance task while preserving its declared contracts."],
    context: [
      { id: "task", title: "Worker task", content: task, sources: ["TASK.md"] },
      { id: "todo", title: "Open obligations", content: todo, sources: ["todo.md"] },
    ],
    capabilities: ["read", "write"],
    capabilitiesRequired: ["read", "write"],
    acceptance: ["The local action probe observes mechanics only; it does not judge artifact truth."],
    budget: {
      maxSteps,
      estimatedTokens: 1_000,
      maxDurationMs: 10_000,
      maxCommandOutputBytes: 4_000,
    },
  };
}

async function freshFixture() {
  const root = await mkdtemp(join(tmpdir(), "todo-return-trigger-action-"));
  roots.push(root);
  await cp(join(import.meta.dir, "fixture"), root, { recursive: true });
  return root;
}

function count(value: unknown, needle: string): number {
  return JSON.stringify(value).split(needle).length - 1;
}

function obligationSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function response(
  content: unknown[],
  finish: "stop" | "tool-calls",
) {
  return {
    content,
    finishReason: { unified: finish, raw: finish },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  };
}

function mockModel(doGenerate: (options: unknown) => Promise<unknown>) {
  return {
    specificationVersion: "v3" as const,
    provider: "mock-provider",
    modelId: "mock-model-id",
    get supportedUrls() {
      return Promise.resolve({});
    },
    doGenerate,
    async doStream() {
      throw new Error("streaming is not used by this action probe");
    },
  };
}
