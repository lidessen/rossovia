import { createHash } from "node:crypto";
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

const evidenceRoot = import.meta.dir;
const packetPath = join(evidenceRoot, "packet.json");
const packet = JSON.parse(await readFile(packetPath, "utf8")) as Packet;
if (packet.version !== "parent-evidence-admission.packet.v1") {
  throw new Error(`unsupported packet version: ${String(packet.version)}`);
}

const fixtureRoot = resolve(process.argv[3] ?? join(evidenceRoot, packet.sourceFixture));
const sourceEvidenceRoot = resolve(join(evidenceRoot, packet.sourceEvidence));
const packetSha256 = sha256(await readFile(packetPath));
const pinnedFiles = await verifyFiles(evidenceRoot, packet.files);
const sourceFiles = await verifyFiles(sourceEvidenceRoot, packet.sourceFiles);
const fixtureFiles = await verifyExactFixture(fixtureRoot, join(evidenceRoot, "fixture.sha256"));
const workCellSourceRoot = join(evidenceRoot, "../../../../packages/work-cell/src");
const observedWorkCellSourceTreeSha256 = await sha256RegularTree(workCellSourceRoot);
if (observedWorkCellSourceTreeSha256 !== packet.runtime.workCellSourceTreeSha256) {
  throw new Error(`Work Cell source tree mismatch: expected ${packet.runtime.workCellSourceTreeSha256}, observed ${observedWorkCellSourceTreeSha256}`);
}

const directRecord = JSON.parse(
  await readFile(join(sourceEvidenceRoot, "development-02/direct-record.json"), "utf8"),
) as CellRunRecord;
const childRecord = JSON.parse(
  await readFile(join(sourceEvidenceRoot, "development-02/nested-child-record.json"), "utf8"),
) as CellRunRecord;
const controlParentRecord = JSON.parse(
  await readFile(join(sourceEvidenceRoot, "development-02/nested-parent-record.json"), "utf8"),
) as CellRunRecord;
verifySourceRecords(directRecord, childRecord, controlParentRecord);
const childOutputSha256 = sha256(JSON.stringify(childRecord.output));
if (childOutputSha256 !== packet.childOutputSha256) {
  throw new Error(`child output mismatch: expected ${packet.childOutputSha256}, observed ${childOutputSha256}`);
}
verifyParentPartition(packet.parentFiles, Object.keys(fixtureFiles));
const candidateInput = parentInput(fixtureRoot, childRecord.output);
const contractComparison = compareParentContracts(controlParentRecord.input, candidateInput);
if (!contractComparison.passed) {
  throw new Error(`parent contract differs outside the declared treatment slot: ${contractComparison.errors.join("; ")}`);
}

if (process.argv[2] === "--preflight") {
  const route = ValidationRouteSchema.parse([{
    provider: packet.model.provider,
    credential: { source: "env", name: packet.model.credentialEnv },
    model: packet.model.id,
  }]);
  compileOutputSchema(finalOutputSchema);
  CellInputSchema.parse(candidateInput);
  console.log(JSON.stringify({
    status: "ready-for-explicit-parent-treatment",
    packetSha256,
    pinnedFiles,
    sourceFiles,
    fixtureFiles,
    childOutputSha256,
    directBaseline: summarizeRecord(directRecord),
    frozenChild: summarizeRecord(childRecord),
    controlParent: summarizeRecord(controlParentRecord),
    contractComparison,
    observedWorkCellSourceTreeSha256,
    credentialAvailable: Boolean(process.env[packet.model.credentialEnv]),
    route: route.map(({ provider, model }) => ({ provider, model })),
    disclosedToModel: {
      rawFixtureFiles: packet.parentFiles,
      retainedChildOutput: true,
    },
    externalModelCalled: false,
  }, null, 2));
  process.exit(0);
}

if (process.argv[2] !== "--run") {
  throw new Error("usage: bun run-parent-treatment.ts --preflight [fixture-root] | --run <fixture-root> <new-output-directory>");
}
const outputRoot = requiredAbsoluteNewOutput(process.argv[4], fixtureRoot);
await mkdir(outputRoot, { recursive: false });
const workspaceRoot = join(outputRoot, "workspace");
await copySubset(fixtureRoot, workspaceRoot, packet.parentFiles);

const driver = new AiSdkValidationDriver({
  route: [{
    provider: packet.model.provider,
    credential: { source: "env" as const, name: packet.model.credentialEnv },
    model: packet.model.id,
  }],
  model: packet.model.id,
  deepSeekInferencePolicy: packet.model.inferencePolicy,
  taskToolSet: "read-only",
});
const input = parentInput(workspaceRoot, childRecord.output);
const beforeSha256 = await sha256RegularTree(workspaceRoot);
const record = await runCell(input, driver, oneExtensionBudgetOptions());
const afterSha256 = await sha256RegularTree(workspaceRoot);
await writeFile(join(outputRoot, "parent-record.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");

const baselineRoutes = servingObservation(directRecord).selectedRoutes;
const mechanicalErrors = stageMechanicalErrors(record, beforeSha256, afterSha256, baselineRoutes);
const cumulativeUsage = addUsage(childRecord.usage, record.usage);
const cumulativeCost = addKnownCost(childRecord.estimatedCostUsd, record.estimatedCostUsd);
const result = {
  version: "parent-evidence-admission.result.v1",
  status: mechanicalErrors.length === 0 ? "mechanically-comparable" : "mechanically-inconclusive",
  packetSha256,
  sourcePacketSha256: packet.sourceFiles["packet.json"],
  sourceChildOutputSha256: childOutputSha256,
  treatmentHypothesis: "Explicit bounded evidence admission may let the parent preserve the exact case relation without granting child acceptance authority.",
  directBaseline: summarizeRecord(directRecord),
  frozenChild: summarizeRecord(childRecord),
  treatmentParent: summarizeRecord(record, { beforeSha256, afterSha256 }),
  reconstructedNestedTreatment: {
    totalUsage: cumulativeUsage,
    totalDurationMs: childRecord.durationMs + record.durationMs,
    estimatedCostUsd: cumulativeCost,
  },
  mechanicalErrors,
  externalSemanticReviewerRun: false,
  semanticDisposition: "withheld pending independent source review",
};
await writeFile(join(outputRoot, "summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
if (mechanicalErrors.length === 0) {
  await writeFile(join(outputRoot, "semantic-review-candidate.json"), `${JSON.stringify({
    version: "parent-evidence-admission.semantic-candidate.v1",
    rubricSha256: packet.files["evaluator-only/review.md"],
    output: record.output,
  }, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
if (mechanicalErrors.length > 0) process.exitCode = 3;

function parentInput(workspaceRoot: string, childOutput: unknown): CellInput {
  return {
    id: "northstar-evidence-admission-parent",
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
      packet.treatmentInstruction,
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
      id: "deepseek-v4-flash-low-parent-evidence-admission-v1",
      version: "execution-profile.v1",
      provider: packet.model.provider,
      model: packet.model.id,
      contextPolicy: "seven-raw-files-plus-admitted-child-report-v1",
      toolSurface: "read-only-structured-output-v1",
      parallelism: "serial",
      priceRevision: "deepseek-public-api-2026-07-31",
    },
  };
}

function verifySourceRecords(
  direct: CellRunRecord,
  child: CellRunRecord,
  controlParent: CellRunRecord,
) {
  for (const [name, record] of [
    ["direct", direct],
    ["child", child],
    ["control parent", controlParent],
  ] as const) {
    if (record.status !== "passed" || record.output === undefined || record.verification.output?.passed !== true) {
      throw new Error(`${name} source record is not a passed schema-valid Cell`);
    }
  }
  const directRoutes = servingObservation(direct).selectedRoutes;
  const childRoutes = servingObservation(child).selectedRoutes;
  if (directRoutes.length === 0 || JSON.stringify(directRoutes) !== JSON.stringify(childRoutes)) {
    throw new Error("source direct and child records do not share one observed serving route");
  }
  if (JSON.stringify(directRoutes) !== JSON.stringify(servingObservation(controlParent).selectedRoutes)) {
    throw new Error("source control parent does not share the direct serving route");
  }
}

function compareParentContracts(control: CellInput, treatment: CellInput) {
  const errors: string[] = [];
  if (control.instructions.length !== 4 || treatment.instructions.length !== 4) {
    errors.push("control and treatment must each contain exactly four instructions");
  }
  if (control.instructions[3] === treatment.instructions[3]) {
    errors.push("the declared fourth-instruction treatment did not change");
  }
  const normalizedControl = normalizeParentContract(control);
  const normalizedTreatment = normalizeParentContract(treatment);
  const controlSha256 = sha256(JSON.stringify(normalizedControl));
  const treatmentSha256 = sha256(JSON.stringify(normalizedTreatment));
  if (controlSha256 !== treatmentSha256) {
    errors.push("a parent contract field outside the declared treatment slot changed");
  }
  return {
    passed: errors.length === 0,
    errors,
    controlNormalizedSha256: controlSha256,
    treatmentNormalizedSha256: treatmentSha256,
    allowedDifferences: [
      "id",
      "workspace.root",
      "instructions[3]",
      "executionProfile.id",
      "executionProfile.contextPolicy",
    ],
    controlInstruction: control.instructions[3],
    treatmentInstruction: treatment.instructions[3],
  };
}

function normalizeParentContract(input: CellInput): unknown {
  return {
    ...input,
    id: "<parent-cell-id>",
    workspace: { ...input.workspace, root: "<workspace-root>" },
    instructions: input.instructions.map((instruction, index) => (
      index === 3 ? "<fourth-instruction-treatment-slot>" : instruction
    )),
    ...(input.executionProfile ? {
      executionProfile: {
        ...input.executionProfile,
        id: "<execution-profile-id>",
        contextPolicy: "<context-policy-id>",
      },
    } : {}),
  };
}

function verifyParentPartition(parentFiles: string[], fixtureFiles: string[]) {
  const expectedExcluded = new Set([
    "conformance/northstar-job-events-v2/case-07.json",
    "docs/northstar-job-events-v2.md",
  ]);
  const expectedParent = fixtureFiles.filter((path) => !expectedExcluded.has(path)).sort();
  if (JSON.stringify([...parentFiles].sort()) !== JSON.stringify(expectedParent)) {
    throw new Error("parent source partition must remain the prior seven-file set");
  }
}

function stageMechanicalErrors(
  record: CellRunRecord,
  beforeSha256: string,
  afterSha256: string,
  baselineRoutes: string[],
) {
  const errors: string[] = [];
  if (record.status !== "passed") errors.push(`parent status is ${record.status}`);
  if (record.output === undefined || record.verification.output?.passed !== true) {
    errors.push("parent lacks verified structured output");
  }
  if (
    record.workspaceDiff.added.length > 0
    || record.workspaceDiff.changed.length > 0
    || record.workspaceDiff.removed.length > 0
    || beforeSha256 !== afterSha256
  ) errors.push("parent changed its read-only workspace");
  const routes = servingObservation(record).selectedRoutes;
  if (routes.length === 0) errors.push("parent lacks observed serving route identity");
  if (JSON.stringify(routes) !== JSON.stringify(baselineRoutes)) {
    errors.push("parent serving route differs from frozen direct baseline");
  }
  return errors;
}

function summarizeRecord(
  record: CellRunRecord,
  workspaceTree?: { beforeSha256: string; afterSha256: string },
) {
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
    ...(workspaceTree ? {
      workspaceTree: {
        ...workspaceTree,
        unchanged: workspaceTree.beforeSha256 === workspaceTree.afterSha256,
      },
    } : {}),
    error: record.error,
  };
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
      return { decision: "deny" as const, reason: "bounded parent treatment allows one extension of at most four steps and sixty seconds" };
    },
  };
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
    throw new Error(`fixture file set mismatch: expected ${expectedPaths.join(", ")}; observed ${actualPaths.join(", ")}`);
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

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface Packet {
  version: "parent-evidence-admission.packet.v1";
  status: string;
  sourceFixture: string;
  sourceEvidence: string;
  runtime: { workCellSourceTreeSha256: string };
  files: Record<string, string>;
  sourceFiles: Record<string, string>;
  childOutputSha256: string;
  model: {
    provider: "deepseek";
    id: string;
    credentialEnv: string;
    inferencePolicy: { thinking: "enabled"; reasoningEffort: "low" };
  };
  parentFiles: string[];
  treatmentInstruction: string;
  budget: Budget & { estimatedTokens: number };
}
