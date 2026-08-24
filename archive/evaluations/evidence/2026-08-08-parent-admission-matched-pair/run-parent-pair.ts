import { createHash, randomInt } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { AiSdkValidationDriver } from "../../../../packages/work-cell/src/ai-sdk-driver";
import {
  CellInputSchema,
  type Budget,
  type CellInput,
  type CellRunRecord,
  type CellUsage,
} from "../../../../packages/work-cell/src/contracts";
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

type Arm = "control" | "treatment";

const evidenceRoot = import.meta.dir;
const packetPath = join(evidenceRoot, "packet.json");
const packet = JSON.parse(await readFile(packetPath, "utf8")) as Packet;
if (packet.version !== "parent-admission-matched-pair.packet.v1") {
  throw new Error(`unsupported packet version: ${String(packet.version)}`);
}

const fixtureRoot = resolve(process.argv[3] ?? join(evidenceRoot, packet.sourceFixture));
const topologyEvidenceRoot = resolve(join(evidenceRoot, packet.sourceTopologyEvidence));
const treatmentEvidenceRoot = resolve(join(evidenceRoot, packet.sourceTreatmentEvidence));
const packetSha256 = sha256(await readFile(packetPath));
const pinnedFiles = await verifyFiles(evidenceRoot, packet.files);
const topologySourceFiles = await verifyFiles(topologyEvidenceRoot, packet.topologySourceFiles);
const treatmentSourceFiles = await verifyFiles(treatmentEvidenceRoot, packet.treatmentSourceFiles);
const fixtureFiles = await verifyExactFixture(fixtureRoot, join(evidenceRoot, "fixture.sha256"));

const workCellSourceRoot = join(evidenceRoot, "../../../../packages/work-cell/src");
const observedWorkCellSourceTreeSha256 = await sha256RegularTree(workCellSourceRoot);
if (observedWorkCellSourceTreeSha256 !== packet.runtime.workCellSourceTreeSha256) {
  throw new Error(`Work Cell source tree mismatch: expected ${packet.runtime.workCellSourceTreeSha256}, observed ${observedWorkCellSourceTreeSha256}`);
}

const directRecord = await readRecord(join(topologyEvidenceRoot, "development-02/direct-record.json"));
const childRecord = await readRecord(join(topologyEvidenceRoot, "development-02/nested-child-record.json"));
const oldControlRecord = await readRecord(join(topologyEvidenceRoot, "development-02/nested-parent-record.json"));
const oldTreatmentRecord = await readRecord(join(treatmentEvidenceRoot, "development-01/parent-record.json"));
verifySourceRecords(directRecord, childRecord, oldControlRecord, oldTreatmentRecord);
if (oldControlRecord.input.instructions[3] !== packet.controlInstruction) {
  throw new Error("packet control instruction does not match the frozen control parent");
}
if (oldTreatmentRecord.input.instructions[3] !== packet.treatmentInstruction) {
  throw new Error("packet treatment instruction does not match the frozen treatment parent");
}
const childOutputSha256 = sha256(JSON.stringify(childRecord.output));
if (childOutputSha256 !== packet.childOutputSha256) {
  throw new Error(`child output mismatch: expected ${packet.childOutputSha256}, observed ${childOutputSha256}`);
}
verifyParentPartition(packet.parentFiles, Object.keys(fixtureFiles));

const preflightControl = parentInput("control", fixtureRoot, childRecord.output);
const preflightTreatment = parentInput("treatment", fixtureRoot, childRecord.output);
const contractComparison = compareParentContracts(preflightControl, preflightTreatment);
if (!contractComparison.passed) {
  throw new Error(`parent contracts differ outside the declared treatment slot: ${contractComparison.errors.join("; ")}`);
}

if (process.argv[2] === "--preflight") {
  const route = ValidationRouteSchema.parse([{
    provider: packet.model.provider,
    credential: { source: "env", name: packet.model.credentialEnv },
    model: packet.model.id,
  }]);
  compileOutputSchema(finalOutputSchema);
  CellInputSchema.parse(preflightControl);
  CellInputSchema.parse(preflightTreatment);
  console.log(JSON.stringify({
    status: "ready-for-matched-parent-pair",
    packetSha256,
    pinnedFiles,
    topologySourceFiles,
    treatmentSourceFiles,
    fixtureFiles,
    childOutputSha256,
    contractComparison,
    observedWorkCellSourceTreeSha256,
    credentialAvailable: Boolean(process.env[packet.model.credentialEnv]),
    route: route.map(({ provider, model }) => ({ provider, model })),
    plannedArms: ["control", "treatment"],
    summedContractEstimateTokens: packet.budget.estimatedTokens * 2,
    evidenceBasedRunForecast: {
      basis: "sum of the pinned same-contract historical control and treatment parent observations; planning context, not a hard limit",
      totalTokens: oldControlRecord.usage.totalTokens + oldTreatmentRecord.usage.totalTokens,
      serialDurationMs: oldControlRecord.durationMs + oldTreatmentRecord.durationMs,
      estimatedCostUsd: addKnownCost(oldControlRecord.estimatedCostUsd, oldTreatmentRecord.estimatedCostUsd),
    },
    executionOrder: "randomized and retained before the first call",
    semanticJudgeIncluded: false,
    disclosedToEachModel: {
      rawFixtureFiles: packet.parentFiles,
      retainedChildOutput: true,
    },
    externalModelCalled: false,
  }, null, 2));
  process.exit(0);
}

if (process.argv[2] !== "--run") {
  throw new Error("usage: bun run-parent-pair.ts --preflight [fixture-root] | --run <fixture-root> <new-output-directory>");
}
const outputRoot = requiredAbsoluteNewOutput(process.argv[4], fixtureRoot);
await mkdir(outputRoot, { recursive: false });

const executionOrder: Arm[] = randomInt(2) === 0
  ? ["control", "treatment"]
  : ["treatment", "control"];
await writeFile(join(outputRoot, "execution-order.json"), `${JSON.stringify({
  version: "parent-admission-matched-pair.order.v1",
  order: executionOrder,
}, null, 2)}\n`, "utf8");

const workspaces: Record<Arm, string> = {
  control: join(outputRoot, "workspaces/control"),
  treatment: join(outputRoot, "workspaces/treatment"),
};
for (const arm of ["control", "treatment"] as const) {
  await copySubset(fixtureRoot, workspaces[arm], packet.parentFiles);
}

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
const runs = {} as Record<Arm, ObservedRun>;
for (const arm of executionOrder) {
  runs[arm] = await runAndRetain(
    parentInput(arm, workspaces[arm], childRecord.output),
    new AiSdkValidationDriver(driverOptions),
    join(outputRoot, `${arm}-parent-record.json`),
  );
}

const mechanicalComparison = classifyMechanicalComparison(
  runs.control,
  runs.treatment,
  servingObservation(directRecord).selectedRoutes,
);
const summary = {
  version: "parent-admission-matched-pair.result.v1",
  status: mechanicalComparison.valid ? "mechanically-comparable" : "mechanically-inconclusive",
  packetSha256,
  childOutputSha256,
  executionOrder,
  directBaseline: summarizeRecord(directRecord),
  frozenChild: summarizeRecord(childRecord),
  controlParent: summarizeRun(runs.control),
  treatmentParent: summarizeRun(runs.treatment),
  reconstructedNested: {
    control: reconstructNested(childRecord, runs.control.record),
    treatment: reconstructNested(childRecord, runs.treatment.record),
  },
  mechanicalComparison,
  externalSemanticJudgeRun: false,
  semanticDisposition: mechanicalComparison.valid
    ? "withheld pending independent label-masked review"
    : "withheld because the pair was not mechanically comparable",
};
if (mechanicalComparison.valid) {
  await retainLabelMaskedPacket(outputRoot, runs.control.record.output, runs.treatment.record.output);
}
await writeFile(join(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
if (!mechanicalComparison.valid) process.exitCode = 3;

function parentInput(arm: Arm, workspaceRoot: string, childOutput: unknown): CellInput {
  return {
    id: `northstar-admission-pair-${arm}`,
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
      arm === "control" ? packet.controlInstruction : packet.treatmentInstruction,
    ],
    capabilities: ["read"],
    context: [{
      id: "nested-child-report",
      title: "Bounded protocol and conformance report from a child Cell",
      content: JSON.stringify(childOutput, null, 2),
      sources: [
        "conformance/northstar-job-events-v2/case-07.json",
        "docs/northstar-job-events-v2.md",
      ],
    }],
    capabilitiesRequired: ["read"],
    acceptance: [
      "Every material incompatibility among protocol, public domain type, adapter, tests, and conformance case is identified with source evidence.",
      "The recommended correction is the smallest one that satisfies the supplied task without changing protocol text, public domain types, or tests.",
      "The report states what evidence was mechanically checked, what still needs semantic review, and which acceptance authority remains withheld.",
    ],
    outputSchema: finalOutputSchema,
    budget: packet.budget,
    executionProfile: {
      id: `deepseek-v4-flash-low-parent-admission-pair-${arm}-v1`,
      version: "execution-profile.v1",
      provider: packet.model.provider,
      model: packet.model.id,
      contextPolicy: `seven-raw-files-plus-child-report-${arm}-v1`,
      toolSurface: "read-only-structured-output-v1",
      parallelism: "serial",
      priceRevision: "deepseek-public-api-2026-07-31",
    },
  };
}

async function runAndRetain(input: CellInput, driver: AiSdkValidationDriver, outputPath: string): Promise<ObservedRun> {
  const beforeSha256 = await sha256RegularTree(input.workspace.root);
  const record = await runCell(input, driver, oneExtensionBudgetOptions());
  const afterSha256 = await sha256RegularTree(input.workspace.root);
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return {
    record,
    workspaceTree: { beforeSha256, afterSha256, unchanged: beforeSha256 === afterSha256 },
  };
}

function compareParentContracts(control: CellInput, treatment: CellInput) {
  const errors: string[] = [];
  if (control.instructions.length !== 4 || treatment.instructions.length !== 4) {
    errors.push("each parent must contain exactly four instructions");
  }
  if (control.instructions[3] === treatment.instructions[3]) {
    errors.push("the declared fourth-instruction treatment did not change");
  }
  const controlSha256 = sha256(JSON.stringify(normalizeParentContract(control)));
  const treatmentSha256 = sha256(JSON.stringify(normalizeParentContract(treatment)));
  if (controlSha256 !== treatmentSha256) {
    errors.push("a model-visible parent contract field outside instruction four changed");
  }
  return {
    passed: errors.length === 0,
    errors,
    controlNormalizedSha256: controlSha256,
    treatmentNormalizedSha256: treatmentSha256,
    allowedDifferences: ["id", "workspace.root", "instructions[3]", "executionProfile.id", "executionProfile.contextPolicy"],
    controlInstruction: control.instructions[3],
    treatmentInstruction: treatment.instructions[3],
  };
}

function normalizeParentContract(input: CellInput): unknown {
  return {
    ...input,
    id: "<parent-cell-id>",
    workspace: { ...input.workspace, root: "<workspace-root>" },
    instructions: input.instructions.map((instruction, index) => index === 3 ? "<instruction-four>" : instruction),
    ...(input.executionProfile ? {
      executionProfile: {
        ...input.executionProfile,
        id: "<execution-profile-id>",
        contextPolicy: "<context-policy-id>",
      },
    } : {}),
  };
}

function classifyMechanicalComparison(control: ObservedRun, treatment: ObservedRun, baselineRoutes: string[]) {
  const errors = [
    ...stageMechanicalErrors(control, baselineRoutes),
    ...stageMechanicalErrors(treatment, baselineRoutes),
  ];
  if (JSON.stringify(control.record.driver) !== JSON.stringify(treatment.record.driver)) {
    errors.push("configured driver identity differs across arms");
  }
  const controlRoutes = servingObservation(control.record).selectedRoutes;
  const treatmentRoutes = servingObservation(treatment.record).selectedRoutes;
  if (JSON.stringify(controlRoutes) !== JSON.stringify(treatmentRoutes)) {
    errors.push("observed serving route differs across arms");
  }
  return {
    valid: errors.length === 0,
    errors,
    contractComparison,
    backendFingerprints: {
      control: servingObservation(control.record).backendFingerprints,
      treatment: servingObservation(treatment.record).backendFingerprints,
    },
  };
}

function stageMechanicalErrors(run: ObservedRun, expectedRoutes: string[]) {
  const errors: string[] = [];
  const { record } = run;
  if (record.status !== "passed") errors.push(`${record.cellId} status is ${record.status}`);
  if (record.output === undefined || record.verification.output?.passed !== true) {
    errors.push(`${record.cellId} lacks verified structured output`);
  }
  if (record.workspaceDiff.added.length > 0 || record.workspaceDiff.changed.length > 0 || record.workspaceDiff.removed.length > 0 || !run.workspaceTree.unchanged) {
    errors.push(`${record.cellId} changed its read-only workspace`);
  }
  const routes = servingObservation(record).selectedRoutes;
  if (routes.length === 0) errors.push(`${record.cellId} lacks observed serving route identity`);
  if (JSON.stringify(routes) !== JSON.stringify(expectedRoutes)) {
    errors.push(`${record.cellId} serving route differs from the frozen direct baseline`);
  }
  return errors;
}

function summarizeRun(run: ObservedRun) {
  return { ...summarizeRecord(run.record), workspaceTree: run.workspaceTree };
}

function summarizeRecord(record: CellRunRecord) {
  return {
    runId: record.runId,
    cellId: record.cellId,
    status: record.status,
    durationMs: record.durationMs,
    configuredDriver: record.driver,
    servingObservation: servingObservation(record),
    usage: record.usage,
    estimatedCostUsd: record.estimatedCostUsd,
    outputAvailable: record.output !== undefined,
    outputVerification: record.verification.output,
    workspaceDiff: record.workspaceDiff,
    error: record.error,
  };
}

function reconstructNested(child: CellRunRecord, parent: CellRunRecord) {
  return {
    totalUsage: addUsage(child.usage, parent.usage),
    totalDurationMs: child.durationMs + parent.durationMs,
    estimatedCostUsd: addKnownCost(child.estimatedCostUsd, parent.estimatedCostUsd),
  };
}

function servingObservation(record: CellRunRecord) {
  const selectedRoutes = new Set<string>();
  const backendFingerprints = new Set<string>();
  for (const event of record.trace) {
    if (!isObject(event.data) || !isObject(event.data.providerMetadata)) continue;
    const route = event.data.providerMetadata.workCellRoute;
    if (isObject(route) && typeof route.servedBy === "string" && typeof route.model === "string") {
      selectedRoutes.add(`${record.driver.adapter}/${route.servedBy}/${route.model}`);
    }
    const deepseek = event.data.providerMetadata.deepseek;
    if (isObject(deepseek) && typeof deepseek.systemFingerprint === "string" && deepseek.systemFingerprint.trim()) {
      backendFingerprints.add(deepseek.systemFingerprint);
    }
  }
  return { selectedRoutes: [...selectedRoutes].sort(), backendFingerprints: [...backendFingerprints].sort() };
}

async function retainLabelMaskedPacket(outputRoot: string, controlOutput: unknown, treatmentOutput: unknown) {
  const controlIsA = randomInt(2) === 0;
  const candidates = controlIsA ? { A: controlOutput, B: treatmentOutput } : { A: treatmentOutput, B: controlOutput };
  await writeFile(join(outputRoot, "label-masked-review.json"), `${JSON.stringify({
    version: "parent-admission-matched-pair.masked-review.v1",
    rubricSha256: packet.files["evaluator-only/review.md"],
    candidates,
  }, null, 2)}\n`, "utf8");
  await writeFile(join(outputRoot, "label-key.json"), `${JSON.stringify({
    version: "parent-admission-matched-pair.label-key.v1",
    A: controlIsA ? "control" : "treatment",
    B: controlIsA ? "treatment" : "control",
  }, null, 2)}\n`, "utf8");
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
      return { decision: "deny" as const, reason: "each matched arm allows one extension of at most four steps and sixty seconds" };
    },
  };
}

function verifySourceRecords(...records: CellRunRecord[]) {
  for (const record of records) {
    if (record.status !== "passed" || record.output === undefined || record.verification.output?.passed !== true) {
      throw new Error(`${record.cellId} is not a passed schema-valid source Cell`);
    }
  }
  const routes = records.map((record) => JSON.stringify(servingObservation(record).selectedRoutes));
  if (routes.some((route) => route === "[]") || new Set(routes).size !== 1) {
    throw new Error("frozen source records do not share one observed serving route");
  }
}

function verifyParentPartition(parentFiles: string[], fixtureFiles: string[]) {
  const excluded = new Set(["conformance/northstar-job-events-v2/case-07.json", "docs/northstar-job-events-v2.md"]);
  const expected = fixtureFiles.filter((path) => !excluded.has(path)).sort();
  if (JSON.stringify([...parentFiles].sort()) !== JSON.stringify(expected)) {
    throw new Error("parent source partition must remain the frozen seven-file set");
  }
}

async function readRecord(path: string): Promise<CellRunRecord> {
  return JSON.parse(await readFile(path, "utf8")) as CellRunRecord;
}

async function verifyFiles(root: string, expected: Record<string, string>) {
  const observed: Record<string, string> = {};
  for (const [path, digest] of Object.entries(expected)) {
    const actual = sha256(await readFile(join(root, path)));
    if (actual !== digest) throw new Error(`file mismatch for ${path}: expected ${digest}, observed ${actual}`);
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
    throw new Error("fixture file set mismatch");
  }
  const observed: Record<string, string> = {};
  for (const path of expectedPaths) {
    const actual = sha256(await readFile(join(root, path)));
    if (actual !== expected.get(path)) throw new Error(`fixture mismatch for ${path}`);
    observed[path] = actual;
  }
  return observed;
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
  if (!value || !isAbsolute(value)) throw new Error("live run requires an absolute new output directory");
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

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function addKnownCost(left: number | undefined, right: number | undefined) {
  return left === undefined || right === undefined ? undefined : left + right;
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface ObservedRun {
  record: CellRunRecord;
  workspaceTree: { beforeSha256: string; afterSha256: string; unchanged: boolean };
}

interface Packet {
  version: "parent-admission-matched-pair.packet.v1";
  status: string;
  sourceFixture: string;
  sourceTopologyEvidence: string;
  sourceTreatmentEvidence: string;
  runtime: { workCellSourceTreeSha256: string };
  files: Record<string, string>;
  topologySourceFiles: Record<string, string>;
  treatmentSourceFiles: Record<string, string>;
  childOutputSha256: string;
  model: {
    provider: "deepseek";
    id: string;
    credentialEnv: string;
    inferencePolicy: { thinking: "enabled"; reasoningEffort: "low" };
  };
  parentFiles: string[];
  controlInstruction: string;
  treatmentInstruction: string;
  budget: Budget & { estimatedTokens: number };
}
