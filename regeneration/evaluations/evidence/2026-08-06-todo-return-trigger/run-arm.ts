import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { CellInput } from "../../../../packages/work-cell/src/contracts";
import { runCell } from "../../../../packages/work-cell/src/run-cell";
import {
  createReturnTriggerArmDriver,
  type ReturnTriggerArm,
} from "./return-trigger-driver";
import {
  classifyReturnTriggerDelivery,
  sha256RegularTree,
  verifyExactFixture,
} from "./runner-contract";

const packetPath = join(import.meta.dir, "packet.json");
const packet = JSON.parse(await readFile(packetPath, "utf8")) as Packet;
if (packet.version !== "todo-return-trigger.packet.v1") {
  throw new Error(`unsupported packet version: ${String(packet.version)}`);
}
const packetSha256 = sha256(await readFile(packetPath));
const verifiedFiles = await verifyFiles(packet.files);
const workCellSourceRoot = join(import.meta.dir, "../../../../packages/work-cell/src");
const observedWorkCellSourceTreeSha256 = await sha256RegularTree(workCellSourceRoot);
if (observedWorkCellSourceTreeSha256 !== packet.runtime.workCellSourceTreeSha256) {
  throw new Error(
    `Work Cell source tree mismatch: expected ${packet.runtime.workCellSourceTreeSha256}, observed ${observedWorkCellSourceTreeSha256}`,
  );
}

if (process.argv[2] === "--preflight") {
  const candidateRoot = process.argv[3]
    ? requiredAbsolutePath(process.argv[3], "workspace")
    : join(import.meta.dir, "fixture");
  console.log(JSON.stringify({
    status: "ready",
    packetSha256,
    verifiedFiles,
    observedWorkCellSourceTreeSha256,
    fixtureFiles: await verifyExactFixture(candidateRoot, join(import.meta.dir, "fixture.sha256")),
    externalModelCalled: false,
  }, null, 2));
  process.exit(0);
}

const arm = parseArm(process.argv[2]);
const workspaceRoot = requiredAbsolutePath(process.argv[3], "workspace");
const outputPath = requiredAbsolutePath(process.argv[4], "output");
const fixtureFiles = await verifyExactFixture(workspaceRoot, join(import.meta.dir, "fixture.sha256"));
const [task, todo] = await Promise.all([
  readFile(join(workspaceRoot, "TASK.md"), "utf8"),
  readFile(join(workspaceRoot, "todo.md"), "utf8"),
]);
const openCompanionObligation = todo.split("\n")[1];
if (!openCompanionObligation?.startsWith("[ ] ")) {
  throw new Error("fixture todo.md must retain the open companion obligation as line 2");
}

const input = cellInput(workspaceRoot, task, todo, packet);
const inputIdentitySha256 = sha256(JSON.stringify({
  ...input,
  workspace: { ...input.workspace, root: "<verified-fixture-copy>" },
}));
const driver = createDriver(arm, packet, openCompanionObligation);
const record = await runCell(input, driver);
const protocolValidity = classifyReturnTriggerDelivery(
  arm,
  record.trace,
  packet.primaryPath,
  sha256(openCompanionObligation),
  record.version,
);
const candidateArtifacts = {
  primary: await retainCandidate(workspaceRoot, packet.primaryPath),
  companion: await retainCandidate(workspaceRoot, packet.companionPath),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  version: "todo-return-trigger.arm-run.v1",
  arm,
  packetSha256,
  observedWorkCellSourceTreeSha256,
  inputIdentitySha256,
  fixtureFiles,
  protocolValidity,
  candidateArtifacts,
  record,
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  status: record.status,
  arm,
  output: outputPath,
  packetSha256,
  observedWorkCellSourceTreeSha256,
  inputIdentitySha256,
  runId: record.runId,
  protocolValidity,
  usage: record.usage,
}, null, 2));
if (protocolValidity.status === "invalid") process.exitCode = 3;

async function retainCandidate(root: string, path: string) {
  try {
    return { path, available: true as const, content: await readFile(join(root, path), "utf8") };
  } catch (error) {
    return {
      path,
      available: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createDriver(
  arm: ReturnTriggerArm,
  configuration: Packet,
  openCompanionObligation: string,
) {
  const options = {
    route: [{
      provider: "deepseek" as const,
      credential: { source: "env" as const, name: configuration.model.credentialEnv },
      model: configuration.model.id,
    }],
    model: configuration.model.id,
    deepSeekInferencePolicy: configuration.model.inferencePolicy,
    taskToolSet: "read-only" as const,
  };
  return createReturnTriggerArmDriver({
    driver: options,
    arm,
    primaryPath: configuration.primaryPath,
    openCompanionObligation,
  });
}

function cellInput(
  workspaceRoot: string,
  task: string,
  todo: string,
  configuration: Packet,
): CellInput {
  return {
    id: configuration.cell.id,
    intent: configuration.cell.intent,
    workspace: {
      root: workspaceRoot,
      readPaths: ["."],
      writePaths: [configuration.primaryPath, configuration.companionPath],
      excludePaths: [],
      allowedCommands: ["bun"],
    },
    instructions: [...configuration.cell.instructions],
    capabilities: ["read", "write", "command"],
    context: [
      { id: "task", title: "Worker task", content: task, sources: ["TASK.md"] },
      { id: "todo", title: "Open obligations", content: todo, sources: ["todo.md"] },
    ],
    capabilitiesRequired: ["read", "write", "command"],
    acceptance: [...configuration.cell.acceptance],
    artifacts: [
      { path: configuration.primaryPath, instructions: "Retain the final production adapter." },
      { path: configuration.companionPath, instructions: "Retain the final conformance example." },
    ],
    budget: { ...configuration.cell.budget },
    executionProfile: { ...configuration.executionProfile },
  };
}

async function verifyFiles(expected: Record<string, string>) {
  const observed: Record<string, string> = {};
  for (const [path, digest] of Object.entries(expected)) {
    const actual = sha256(await readFile(join(import.meta.dir, path)));
    if (actual !== digest) {
      throw new Error(`packet file mismatch for ${path}: expected ${digest}, observed ${actual}`);
    }
    observed[path] = actual;
  }
  return observed;
}

function requiredAbsolutePath(value: string | undefined, label: string): string {
  if (!value) throw new Error(`usage: bun run-arm.ts <control|treatment> <workspace> <output>`);
  const path = resolve(value);
  if (label === "output" && path === packetPath) {
    throw new Error("output must not overwrite packet.json");
  }
  return path;
}

function parseArm(value: string | undefined): ReturnTriggerArm {
  if (value === "control" || value === "treatment") return value;
  throw new Error("usage: bun run-arm.ts <control|treatment> <workspace> <output>");
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

interface Packet {
  version: "todo-return-trigger.packet.v1";
  files: Record<string, string>;
  runtime: { workCellSourceTreeSha256: string };
  primaryPath: string;
  companionPath: string;
  model: {
    id: string;
    credentialEnv: string;
    inferencePolicy: { thinking: "enabled"; reasoningEffort: "low" };
  };
  executionProfile: CellInput["executionProfile"] & {};
  cell: {
    id: string;
    intent: string;
    instructions: string[];
    acceptance: string[];
    budget: CellInput["budget"];
  };
}
