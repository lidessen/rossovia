import { createHash, randomBytes } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { AiSdkValidationDriver } from "../../../../packages/work-cell/src/ai-sdk-driver";
import type {
  Budget,
  CellInput,
  CellRunRecord,
  CellUsage,
} from "../../../../packages/work-cell/src/contracts";
import { CellInputSchema } from "../../../../packages/work-cell/src/contracts";
import { compileOutputSchema } from "../../../../packages/work-cell/src/output-schema";
import { ValidationRouteSchema } from "../../../../packages/work-cell/src/provider-profile";
import { runCell, type RunCellOptions } from "../../../../packages/work-cell/src/run-cell";

const findingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["artifact", "issue", "evidence", "smallestCorrection"],
  properties: {
    artifact: { type: "string", minLength: 1 },
    issue: { type: "string", minLength: 1 },
    evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    smallestCorrection: { type: "string", minLength: 1 },
  },
} as const;

const finalOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "findings", "preservedContracts", "mechanicalEvidence", "semanticReviewNeeded", "withheldAuthority", "uncertainties"],
  properties: {
    verdict: { type: "string", enum: ["compatible", "incompatible", "inconclusive"] },
    findings: { type: "array", minItems: 1, items: findingSchema },
    preservedContracts: { type: "array", items: { type: "string", minLength: 1 } },
    mechanicalEvidence: { type: "array", items: { type: "string", minLength: 1 } },
    semanticReviewNeeded: { type: "array", items: { type: "string", minLength: 1 } },
    withheldAuthority: { type: "string", minLength: 1 },
    uncertainties: { type: "array", items: { type: "string", minLength: 1 } },
  },
} as const;

const childOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["protocolRequirements", "caseAssessment", "evidence", "scopeBoundary", "uncertainties"],
  properties: {
    protocolRequirements: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    caseAssessment: { type: "string", minLength: 1 },
    evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    scopeBoundary: { type: "string", minLength: 1 },
    uncertainties: { type: "array", items: { type: "string", minLength: 1 } },
  },
} as const;

const evidenceRoot = import.meta.dir;
const packetPath = join(evidenceRoot, "packet.json");
const fixtureManifestPath = join(evidenceRoot, "fixture.sha256");
const packet = JSON.parse(await readFile(packetPath, "utf8")) as Packet;

if (packet.version !== "delegation-topology-probe.packet.v1") {
  throw new Error(`unsupported packet version: ${String(packet.version)}`);
}

const fixtureRoot = resolve(process.argv[3] ?? join(evidenceRoot, packet.sourceFixture));
const packetSha256 = sha256(await readFile(packetPath));
const pinnedFiles = await verifyPinnedFiles(packet.files);
const fixtureFiles = await verifyExactFixture(fixtureRoot, fixtureManifestPath);
const workCellSourceRoot = join(evidenceRoot, "../../../../packages/work-cell/src");
const observedWorkCellSourceTreeSha256 = await sha256RegularTree(workCellSourceRoot);
if (observedWorkCellSourceTreeSha256 !== packet.runtime.workCellSourceTreeSha256) {
  throw new Error(
    `Work Cell source tree mismatch: expected ${packet.runtime.workCellSourceTreeSha256}, observed ${observedWorkCellSourceTreeSha256}`,
  );
}
verifyTopology(packet.topology, Object.keys(fixtureFiles));

if (process.argv[2] === "--preflight") {
  const route = ValidationRouteSchema.parse([{
    provider: packet.model.provider,
    credential: { source: "env", name: packet.model.credentialEnv },
    model: packet.model.id,
  }]);
  compileOutputSchema(finalOutputSchema);
  compileOutputSchema(childOutputSchema);
  CellInputSchema.parse(finalInput("direct", fixtureRoot, packet.budget.direct));
  CellInputSchema.parse(childInput(fixtureRoot, packet.budget.child));
  CellInputSchema.parse(finalInput("nested-parent", fixtureRoot, packet.budget.parent, {
    protocolRequirements: ["preflight placeholder"],
    caseAssessment: "preflight placeholder",
    evidence: ["preflight placeholder"],
    scopeBoundary: "preflight placeholder",
    uncertainties: [],
  }));
  console.log(JSON.stringify({
    status: "ready-for-explicit-authorization",
    packetSha256,
    pinnedFiles,
    fixtureFiles,
    observedWorkCellSourceTreeSha256,
    credentialAvailable: Boolean(process.env[packet.model.credentialEnv]),
    plannedCells: ["direct", "nested-child", "nested-parent"],
    plannedEstimatedTokens: packet.budget.direct.estimatedTokens
      + packet.budget.child.estimatedTokens
      + packet.budget.parent.estimatedTokens,
    route: route.map(({ provider, model }) => ({ provider, model })),
    cellContractsParsed: true,
    outputSchemasCompiled: true,
    semanticJudgeIncluded: false,
    externalModelCalled: false,
  }, null, 2));
  process.exit(0);
}

if (process.argv[2] !== "--run") {
  throw new Error("usage: bun run-topology.ts --preflight [fixture-root] | --run <fixture-root> <new-output-directory>");
}
const outputRoot = requiredAbsoluteNewOutput(process.argv[4], fixtureRoot);
await mkdir(outputRoot, { recursive: false });

const workspaces = {
  direct: join(outputRoot, "workspaces/direct"),
  child: join(outputRoot, "workspaces/nested-child"),
  parent: join(outputRoot, "workspaces/nested-parent"),
};
await copySubset(fixtureRoot, workspaces.direct, packet.topology.directFiles);
await copySubset(fixtureRoot, workspaces.child, packet.topology.childFiles);
await copySubset(fixtureRoot, workspaces.parent, packet.topology.parentFiles);

const driverOptions = {
  route: [{
    provider: packet.model.provider,
    credential: { source: "env" as const, name: packet.model.credentialEnv },
    model: packet.model.id,
  }],
  model: packet.model.id,
  deepSeekInferencePolicy: packet.model.inferencePolicy,
  taskToolSet: "read-only" as const,
};

const direct = await runAndRetain(
  finalInput("direct", workspaces.direct, packet.budget.direct),
  new AiSdkValidationDriver(driverOptions),
  join(outputRoot, "direct-record.json"),
);
const directStageErrors = stageMechanicalErrors(direct);
if (directStageErrors.length > 0) {
  await retainIncompleteSummary(outputRoot, "invalid-direct-stage", { direct }, directStageErrors);
  throw new Error("direct Cell failed mechanical admission; nested arm was not started");
}
const child = await runAndRetain(
  childInput(workspaces.child, packet.budget.child),
  new AiSdkValidationDriver(driverOptions),
  join(outputRoot, "nested-child-record.json"),
);

const directRoutes = servingObservation(direct.record).selectedRoutes;
const childStageErrors = stageMechanicalErrors(child, directRoutes);
if (childStageErrors.length > 0) {
  await retainIncompleteSummary(outputRoot, "invalid-child-stage", { direct, child }, childStageErrors);
  throw new Error("nested child failed mechanical admission; parent was not started");
}

const parent = await runAndRetain(
  finalInput("nested-parent", workspaces.parent, packet.budget.parent, child.record.output),
  new AiSdkValidationDriver(driverOptions),
  join(outputRoot, "nested-parent-record.json"),
);
const topologyValidity = classifyTopologyValidity(direct, child, parent);
const result = {
  version: "delegation-topology-probe.result.v1",
  status: topologyValidity.valid ? "mechanically-comparable" : "mechanically-inconclusive",
  packetSha256,
  pinnedFiles,
  observedWorkCellSourceTreeSha256,
  fixtureFiles,
  topology: "host-constructed-child-report-to-parent-integration",
  causalScope: "information topology and coordination cost; not native autonomous re-delegation",
  direct: summarizeRun(direct),
  nested: {
    child: summarizeRun(child),
    parent: summarizeRun(parent),
    combinedUsage: addUsage(child.record.usage, parent.record.usage),
    combinedDurationMs: child.record.durationMs + parent.record.durationMs,
    childReportSha256: sha256(JSON.stringify(child.record.output)),
  },
  topologyValidity,
  externalSemanticJudgeRun: false,
  semanticDisposition: "withheld pending blinded independent review",
};
if (topologyValidity.valid) {
  await retainBlindReviewPacket(outputRoot, direct.record.output, parent.record.output);
}
await writeFile(join(outputRoot, "summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: result.status,
  output: outputRoot,
  direct: result.direct,
  nested: result.nested,
  topologyValidity,
  externalSemanticJudgeRun: false,
}, null, 2));
if (!topologyValidity.valid) process.exitCode = 3;

function finalInput(
  arm: "direct" | "nested-parent",
  workspaceRoot: string,
  budget: Budget,
  childReport?: unknown,
): CellInput {
  return {
    id: `northstar-topology-${arm}`,
    intent: "Review the frozen Northstar job-event maintenance candidate, identify every material compatibility defect, and recommend the smallest ownership-correct correction without editing files.",
    workspace: {
      root: workspaceRoot,
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: [
      "Ground every finding in the supplied evidence and inspect the complete granted source set before concluding.",
      "Preserve protocol text, public domain types, and tests; separate mechanically test-covered claims from semantic cross-artifact claims.",
      "Do not edit files, run commands, invent missing source, or claim durable acceptance authority.",
      ...(arm === "nested-parent"
        ? ["Treat the supplied child report as a bounded source report, reconstruct its claims against the parent-visible implementation evidence, and retain final judgment yourself."]
        : []),
    ],
    capabilities: ["read"],
    context: childReport === undefined ? [] : [{
      id: "nested-child-report",
      title: "Bounded protocol and conformance report from a child Cell",
      content: JSON.stringify(childReport, null, 2),
      sources: packet.topology.childFiles,
    }],
    capabilitiesRequired: ["read"],
    acceptance: [
      "Every material incompatibility among protocol, public domain type, adapter, tests, and conformance case is identified with source evidence.",
      "The recommended correction is the smallest one that satisfies the supplied task without changing protocol text, public domain types, or tests.",
      "The report states what evidence was mechanically checked, what still needs semantic review, and which acceptance authority remains withheld.",
    ],
    outputSchema: finalOutputSchema,
    budget,
    executionProfile: {
      id: `deepseek-v4-flash-low-topology-${arm}-v1`,
      version: "execution-profile.v1",
      provider: packet.model.provider,
      model: packet.model.id,
      contextPolicy: arm === "direct" ? "all-nine-raw-files-v1" : "seven-raw-files-plus-child-report-v1",
      toolSurface: "read-only-structured-output-v1",
      parallelism: "serial",
      priceRevision: "deepseek-public-api-2026-07-31",
    },
  };
}

function childInput(workspaceRoot: string, budget: Budget): CellInput {
  return {
    id: "northstar-topology-nested-child",
    intent: "Audit only the supplied Northstar v2 protocol and conformance case, then return a bounded source report to a parent reviewer.",
    workspace: {
      root: workspaceRoot,
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: [
      "Read both granted files and report protocol requirements, the case projection, exact source evidence, and uncertainty.",
      "Do not infer implementation behavior, propose edits outside the case file, or claim final compatibility or acceptance authority.",
      "Do not edit files or run commands.",
    ],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: ["read"],
    acceptance: [
      "The report faithfully states the protocol mapping for outcome, retry, identifiers, and occurrence time.",
      "The report judges the supplied case only against that protocol and cites the granted source paths.",
      "Implementation claims and final acceptance remain explicitly outside the child scope.",
    ],
    outputSchema: childOutputSchema,
    budget,
    executionProfile: {
      id: "deepseek-v4-flash-low-topology-child-v1",
      version: "execution-profile.v1",
      provider: packet.model.provider,
      model: packet.model.id,
      contextPolicy: "protocol-and-case-two-raw-files-v1",
      toolSurface: "read-only-structured-output-v1",
      parallelism: "serial",
      priceRevision: "deepseek-public-api-2026-07-31",
    },
  };
}

async function runAndRetain(input: CellInput, driver: AiSdkValidationDriver, outputPath: string) {
  const beforeSha256 = await sha256RegularTree(input.workspace.root);
  const options = oneExtensionBudgetOptions();
  const record = await runCell(input, driver, options);
  const afterSha256 = await sha256RegularTree(input.workspace.root);
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return {
    record,
    workspaceTree: {
      beforeSha256,
      afterSha256,
      unchanged: beforeSha256 === afterSha256,
    },
  };
}

function oneExtensionBudgetOptions(): RunCellOptions {
  let extensionUsed = false;
  return {
    settlementReserveMs: 30_000,
    hardLimitMs: 180_000,
    budgetApproval(request) {
      if (!extensionUsed && request.additionalSteps <= 4 && request.additionalDurationMs <= 60_000) {
        extensionUsed = true;
        return { decision: "allow" as const };
      }
      return {
        decision: "deny" as const,
        reason: extensionUsed
          ? "one bounded extension was already granted"
          : "requested extension exceeds the probe's bounded allowance",
      };
    },
  };
}

function summarizeRun(run: ObservedRun) {
  const { record } = run;
  return {
    runId: record.runId,
    cellId: record.cellId,
    status: record.status,
    durationMs: record.durationMs,
    configuredDriver: record.driver,
    servingObservation: servingObservation(record),
    usage: record.usage,
    outputAvailable: record.output !== undefined,
    outputVerification: record.verification.output,
    workspaceDiff: record.workspaceDiff,
    workspaceTree: run.workspaceTree,
    error: record.error,
  };
}

function classifyTopologyValidity(...runs: ObservedRun[]) {
  const errors = runs.flatMap((run) => stageMechanicalErrors(run));
  const records = runs.map(({ record }) => record);
  const configuredDrivers = new Set(records.map((record) => JSON.stringify(record.driver)));
  if (configuredDrivers.size !== 1) errors.push("configured driver identity differs across Cells");
  const serving = records.map((record) => JSON.stringify(servingObservation(record).selectedRoutes));
  if (new Set(serving).size !== 1) errors.push("observed serving identity differs across Cells");
  return { valid: errors.length === 0, errors };
}

function stageMechanicalErrors(run: ObservedRun, expectedRoutes?: string[]) {
  const { record } = run;
  const errors: string[] = [];
  if (record.status !== "passed") errors.push(`${record.cellId} status is ${record.status}`);
  if (record.output === undefined || record.verification.output?.passed !== true) {
    errors.push(`${record.cellId} lacks verified structured output`);
  }
  if (
    record.workspaceDiff.added.length > 0
    || record.workspaceDiff.changed.length > 0
    || record.workspaceDiff.removed.length > 0
    || !run.workspaceTree.unchanged
  ) errors.push(`${record.cellId} changed its read-only workspace`);
  const routes = servingObservation(record).selectedRoutes;
  if (routes.length === 0) errors.push(`${record.cellId} lacks observed serving route identity`);
  if (expectedRoutes && JSON.stringify(routes) !== JSON.stringify(expectedRoutes)) {
    errors.push(`${record.cellId} serving route differs from the admitted direct Cell`);
  }
  return errors;
}

function servingObservation(record: CellRunRecord) {
  const selectedRoutes = new Set<string>();
  const backendFingerprints = new Set<string>();
  for (const event of record.trace) {
    if (!isObject(event.data)) continue;
    const providerMetadata = event.data.providerMetadata;
    if (!isObject(providerMetadata)) continue;
    const route = providerMetadata.workCellRoute;
    if (isObject(route) && typeof route.servedBy === "string" && typeof route.model === "string") {
      selectedRoutes.add(`${record.driver.adapter}/${route.servedBy}/${route.model}`);
    }
    const deepseek = providerMetadata.deepseek;
    if (isObject(deepseek) && typeof deepseek.systemFingerprint === "string" && deepseek.systemFingerprint.trim()) {
      backendFingerprints.add(deepseek.systemFingerprint);
    }
  }
  return {
    selectedRoutes: [...selectedRoutes].sort(),
    backendFingerprints: [...backendFingerprints].sort(),
  };
}

async function retainIncompleteSummary(
  outputRoot: string,
  status: string,
  runs: Record<string, ObservedRun>,
  stageErrors: string[],
) {
  await writeFile(join(outputRoot, "summary.json"), `${JSON.stringify({
    version: "delegation-topology-probe.result.v1",
    status,
    packetSha256,
    observedWorkCellSourceTreeSha256,
    fixtureFiles,
    runs: Object.fromEntries(
      Object.entries(runs).map(([name, run]) => [name, summarizeRun(run)]),
    ),
    stageErrors,
    externalSemanticJudgeRun: false,
    semanticDisposition: "withheld because the execution topology did not complete mechanically",
  }, null, 2)}\n`, "utf8");
}

async function retainBlindReviewPacket(outputRoot: string, directOutput: unknown, nestedOutput: unknown) {
  const directIsA = (randomBytes(1)[0] ?? 0) % 2 === 0;
  const candidates = directIsA
    ? { A: directOutput, B: nestedOutput }
    : { A: nestedOutput, B: directOutput };
  await writeFile(join(outputRoot, "blind-review.json"), `${JSON.stringify({
    version: "delegation-topology-probe.blind-review.v1",
    rubricSha256: packet.files["evaluator-only/review.md"],
    candidates,
  }, null, 2)}\n`, "utf8");
  await writeFile(join(outputRoot, "blind-key.json"), `${JSON.stringify({
    version: "delegation-topology-probe.blind-key.v1",
    A: directIsA ? "direct" : "nested-parent",
    B: directIsA ? "nested-parent" : "direct",
  }, null, 2)}\n`, "utf8");
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

async function verifyPinnedFiles(expected: Record<string, string>) {
  const observed: Record<string, string> = {};
  for (const [path, digest] of Object.entries(expected)) {
    const actual = sha256(await readFile(join(evidenceRoot, path)));
    if (actual !== digest) {
      throw new Error(`packet file mismatch for ${path}: expected ${digest}, observed ${actual}`);
    }
    observed[path] = actual;
  }
  return observed;
}

async function verifyExactFixture(root: string, manifestPath: string) {
  const expected = new Map<string, string>();
  for (const line of (await readFile(manifestPath, "utf8")).trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`invalid fixture hash line: ${line}`);
    expected.set(match[2]!, match[1]!);
  }
  const actualPaths = await listRegularFiles(root);
  const expectedPaths = [...expected.keys()].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`fixture file set mismatch: expected ${expectedPaths.join(", ")}; observed ${actualPaths.join(", ")}`);
  }
  const observed: Record<string, string> = {};
  for (const path of expectedPaths) {
    const actual = sha256(await readFile(join(root, path)));
    if (actual !== expected.get(path)) {
      throw new Error(`fixture mismatch for ${path}: expected ${expected.get(path)}, observed ${actual}`);
    }
    observed[path] = actual;
  }
  return observed;
}

function verifyTopology(topology: Packet["topology"], fixturePaths: string[]) {
  const direct = [...topology.directFiles].sort();
  const child = [...topology.childFiles].sort();
  const parent = [...topology.parentFiles].sort();
  if (JSON.stringify(direct) !== JSON.stringify([...fixturePaths].sort())) {
    throw new Error("direct arm must receive every and only frozen fixture file");
  }
  const nested = [...child, ...parent].sort();
  if (new Set(nested).size !== nested.length || JSON.stringify(nested) !== JSON.stringify(direct)) {
    throw new Error("child and parent raw source partitions must be disjoint and cover the direct source set exactly");
  }
}

async function copySubset(sourceRoot: string, targetRoot: string, paths: string[]) {
  for (const path of paths) {
    const target = join(targetRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(sourceRoot, path), target);
  }
}

async function sha256RegularTree(root: string): Promise<string> {
  const digest = createHash("sha256");
  for (const path of await listRegularFiles(root)) {
    digest.update(path, "utf8");
    digest.update("\0");
    digest.update(await readFile(join(root, path)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

async function listRegularFiles(root: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`tree contains a symbolic link: ${path}`);
    if (entry.isDirectory()) files.push(...await listRegularFiles(root, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`tree contains a non-regular entry: ${path}`);
  }
  return files.sort();
}

function requiredAbsoluteNewOutput(value: string | undefined, fixture: string): string {
  if (!value || !isAbsolute(value)) {
    throw new Error("live run requires an absolute new output directory");
  }
  const output = resolve(value);
  if (isSameOrInside(output, fixture) || isSameOrInside(fixture, output)) {
    throw new Error("output and frozen fixture trees must not contain one another");
  }
  return output;
}

function isSameOrInside(candidate: string, parent: string) {
  const path = relative(parent, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface Packet {
  version: "delegation-topology-probe.packet.v1";
  status: string;
  sourceFixture: string;
  runtime: { workCellSourceTreeSha256: string };
  files: Record<string, string>;
  model: {
    provider: "deepseek";
    id: string;
    credentialEnv: string;
    inferencePolicy: { thinking: "enabled"; reasoningEffort: "low" };
  };
  topology: {
    directFiles: string[];
    childFiles: string[];
    parentFiles: string[];
  };
  budget: {
    direct: Budget & { estimatedTokens: number };
    child: Budget & { estimatedTokens: number };
    parent: Budget & { estimatedTokens: number };
  };
}

interface ObservedRun {
  record: CellRunRecord;
  workspaceTree: {
    beforeSha256: string;
    afterSha256: string;
    unchanged: boolean;
  };
}
