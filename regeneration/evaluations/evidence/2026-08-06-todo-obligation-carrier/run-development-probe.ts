import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AiSdkValidationDriver } from "../../../../packages/work-cell/src/ai-sdk-driver";
import type { CellRunRecord, DriverDescriptor } from "../../../../packages/work-cell/src/contracts";
import {
  ModelEvaluationSpecSchema,
  modelEvaluationFixtureSha256,
  runModelEvaluationFromFile,
} from "../../../../packages/work-cell/src/adapters/model-evaluation/runtime";
import {
  AiSdkModelEvaluationJudge,
  type BlindModelRunEvidence,
  type ModelEvaluationJudge,
  type ModelEvaluationJudgeRequest,
  type ModelEvaluationJudgeResult,
} from "../../../../packages/work-cell/src/adapters/model-evaluation/judge";

const specPath = join(import.meta.dir, "model-evaluation.json");
const launchIdentityPath = join(import.meta.dir, "launch-identity.json");
const repositoryRoot = join(import.meta.dir, "../../../..");
const resultsRoot = join(import.meta.dir, "results");
const runtimePaths = [
  "packages/work-cell/src/adapters/model-evaluation/runtime.ts",
  "packages/work-cell/src/adapters/model-evaluation/judge.ts",
];

const launchIdentity = JSON.parse(await readFile(launchIdentityPath, "utf8")) as {
  version: string;
  repositoryHead: string;
  runtimeDiffSha256: string;
  fixtureSha256: string;
  files: Record<string, string>;
};
const packetHashes = await verifyPacketFiles(launchIdentity.files);
const head = (await git(["rev-parse", "HEAD"])).trim();
if (head !== launchIdentity.repositoryHead) {
  throw new Error(
    `repository HEAD mismatch: expected ${launchIdentity.repositoryHead}, observed ${head}`,
  );
}

const changedWorkCellSources = (await git([
  "diff",
  "--name-only",
  "HEAD",
  "--",
  "packages/work-cell/src",
])).trim().split("\n").filter(Boolean).sort();
if (JSON.stringify(changedWorkCellSources) !== JSON.stringify([...runtimePaths].sort())) {
  throw new Error(
    `unexpected Work Cell source changes: ${changedWorkCellSources.join(", ") || "none"}`,
  );
}

const runtimePatch = await git(["diff", "--binary", "HEAD", "--", ...runtimePaths]);
const runtimeDiffSha256 = sha256(runtimePatch);
if (runtimeDiffSha256 !== launchIdentity.runtimeDiffSha256) {
  throw new Error(
    `runtime diff mismatch: expected ${launchIdentity.runtimeDiffSha256}, observed ${runtimeDiffSha256}`,
  );
}

const spec = ModelEvaluationSpecSchema.parse(
  JSON.parse(await readFile(specPath, "utf8")),
);
const fixtureSha256 = await modelEvaluationFixtureSha256(join(import.meta.dir, "fixture"));
if (
  fixtureSha256 !== launchIdentity.fixtureSha256
  || fixtureSha256 !== spec.fixture.expectedSha256
) {
  throw new Error(
    `fixture mismatch: identity=${launchIdentity.fixtureSha256}, manifest=${spec.fixture.expectedSha256}, observed=${fixtureSha256}`,
  );
}

if (process.argv.includes("--preflight")) {
  console.log(JSON.stringify({
    status: "ready",
    repositoryHead: head,
    runtimeDiffSha256,
    packetHashes,
    taskToolSet: "read-only",
    fixtureSha256,
  }, null, 2));
  process.exit(0);
}

await mkdir(resultsRoot, { recursive: true });
const launchDirectory = await mkdtemp(join(resultsRoot, "launch-"));
const runtimePatchPath = join(launchDirectory, "runtime.patch");
const retainedLaunchIdentityPath = join(launchDirectory, "launch-identity.json");
await writeFile(runtimePatchPath, runtimePatch, "utf8");
await writeFile(retainedLaunchIdentityPath, `${JSON.stringify({
  ...launchIdentity,
  observed: {
    packetHashes,
    repositoryHead: head,
    runtimeDiffSha256,
    fixtureSha256,
    taskToolSet: "read-only",
    bunVersion: Bun.version,
  },
}, null, 2)}\n`, "utf8");

const record = await runModelEvaluationFromFile(
  specPath,
  (profile) => new AiSdkValidationDriver({
    route: profile.route,
    taskToolSet: "read-only",
    ...(profile.adapterPolicy?.deepseek
      ? { deepSeekInferencePolicy: profile.adapterPolicy.deepseek }
      : {}),
  }),
  new DeferredJudge(),
);

const baseRecordPath = join(record.directory, "evaluation.base.json");
await cp(record.recordPath, baseRecordPath);
await cp(runtimePatchPath, join(record.directory, "runtime.patch"));
await cp(retainedLaunchIdentityPath, join(record.directory, "launch-identity.json"));

const semanticJudge = new AiSdkModelEvaluationJudge({ route: spec.judge.route });
for (const comparison of record.comparisons) {
  const evaluationCase = spec.cases.find(({ id }) => id === comparison.caseId);
  if (!evaluationCase) throw new Error(`missing case ${comparison.caseId}`);
  const caseTrials = record.trials.filter((trial) => trial.caseId === comparison.caseId);
  const allTrialsPassed = caseTrials
    .every((trial) => trial.record?.status === "passed");
  if (!allTrialsPassed || comparison.executionIdentity.status === "mismatch") {
    comparison.result = inconclusiveResult(
      semanticJudge.descriptor,
      evaluationCase.referenceCriteria,
      [
        ...(!allTrialsPassed ? ["one or more Work Cell trials were unsettled"] : []),
        ...(comparison.executionIdentity.status === "mismatch"
          ? comparison.executionIdentity.observations
          : []),
      ],
    );
    continue;
  }
  const aRecords = await loadCandidate(comparison.caseId, comparison.blindMap.A);
  const bRecords = await loadCandidate(comparison.caseId, comparison.blindMap.B);
  const protocolErrors = [...aRecords, ...bRecords].flatMap((item) => item.protocolErrors);
  if (protocolErrors.length > 0) {
    comparison.result = inconclusiveResult(
      semanticJudge.descriptor,
      evaluationCase.referenceCriteria,
      protocolErrors,
    );
    continue;
  }
  comparison.result = await semanticJudge.judge({
    intent: evaluationCase.task.intent,
    referenceCriteria: evaluationCase.referenceCriteria,
    rubric: evaluationCase.rubric,
    failureClasses: evaluationCase.failureClasses,
    a: { label: "A", records: aRecords.map(({ evidence }) => evidence) },
    b: { label: "B", records: bRecords.map(({ evidence }) => evidence) },
  });
}

await writeFile(record.recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
const probeRecordPath = join(record.directory, "probe-evaluation.json");
await writeFile(probeRecordPath, `${JSON.stringify({
  version: "todo-obligation-probe.run.v1",
  workCellRecord: record.recordPath,
  baseWorkCellRecord: baseRecordPath,
  launchIdentity: retainedLaunchIdentityPath,
  runtimePatch: runtimePatchPath,
  packetHashes,
  fixtureSha256,
  taskToolSet: "read-only",
  comparisons: record.comparisons,
  authority: "development evidence; independent source review and human acceptance required",
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  id: record.id,
  output: probeRecordPath,
  launchIdentity: retainedLaunchIdentityPath,
  trials: record.trials.length,
  comparisons: record.comparisons.map(({ caseId, result }) => ({
    caseId,
    preferred: result.judgement.preferred,
  })),
  profiles: record.profileSummaries,
  authority: record.authority,
}, null, 2));

async function loadCandidate(caseId: string, profileId: string) {
  return Promise.all(
    record.trials.filter((trial) => trial.caseId === caseId && trial.profileId === profileId)
      .sort((left, right) => left.repetition - right.repetition)
      .map(blindEvidenceWithArtifacts),
  );
}

class DeferredJudge implements ModelEvaluationJudge {
  readonly descriptor: DriverDescriptor = {
    adapter: "todo-probe-deferred-judge",
    provider: "local",
    model: "none",
  };

  async judge(request: ModelEvaluationJudgeRequest): Promise<ModelEvaluationJudgeResult> {
    return inconclusiveResult(
      this.descriptor,
      request.referenceCriteria,
      ["semantic judging deferred until artifact and carrier-protocol checks complete"],
    );
  }
}

async function blindEvidenceWithArtifacts(trial: {
  repetition: number;
  directory: string;
  record?: CellRunRecord;
}): Promise<{ evidence: BlindModelRunEvidence; protocolErrors: string[] }> {
  if (!trial.record) throw new Error("cannot inspect a trial without a Work Cell record");
  const workspace = join(trial.directory, "workspace");
  const [notice, indexSummary, todo] = await Promise.all([
    readFinal(join(workspace, "draft.md")),
    readFinal(join(workspace, "appointments-index.md")),
    readFinal(join(workspace, "todo.md")),
  ]);
  const output = isObject(trial.record.output) ? trial.record.output : {};
  const cadence = carrierCadence(trial.record, todo);
  const settlementMatchesArtifacts = output.notice === notice
    && output.indexSummary === indexSummary;
  const protocolErrors = [
    ...cadence.errors.map((error) => `repetition ${trial.repetition}: ${error}`),
    ...(settlementMatchesArtifacts
      ? []
      : [`repetition ${trial.repetition}: structured settlement does not equal final artifact bytes`]),
  ];
  return {
    evidence: {
      runId: trial.record.runId,
      repetition: trial.repetition,
      status: trial.record.status,
      finalText: "Neutral artifact evidence follows.",
      output: {
        evaluatedArtifacts: { notice, indexSummary },
        protocolValidity: {
          passed: protocolErrors.length === 0,
          settlementMatchesArtifacts,
          initialTodoItemCount: cadence.initialTodoItemCount,
          finalTodoItemCount: cadence.finalTodoItemCount,
          initialTodoBeforeArtifact: cadence.initialTodoBeforeArtifact,
          revisitAfterEveryArtifactWrite: cadence.revisitAfterEveryArtifactWrite,
        },
      },
      artifacts: trial.record.artifacts.filter(({ path }) => path !== "todo.md"),
      verification: { passed: trial.record.verification.passed },
      workspaceDiff: filterWorkspaceDiff(trial.record.workspaceDiff),
    },
    protocolErrors,
  };
}

function carrierCadence(record: CellRunRecord, todo: string) {
  const events = toolCallSequence(record);
  const artifactWriteIndexes = events.flatMap((event, index) => (
    event.name === "write_file"
    && (event.path === "draft.md" || event.path === "appointments-index.md")
      ? [index]
      : []
  ));
  const firstArtifactWrite = artifactWriteIndexes[0] ?? Number.POSITIVE_INFINITY;
  const initialTodoWriteIndex = events.findIndex(
    (event) => event.name === "write_file" && event.path === "todo.md",
  );
  const initialTodoBeforeArtifact = initialTodoWriteIndex >= 0
    && initialTodoWriteIndex < firstArtifactWrite;
  const initialTodo = initialTodoWriteIndex >= 0
    ? events[initialTodoWriteIndex]?.content ?? ""
    : "";
  let revisitAfterEveryArtifactWrite = artifactWriteIndexes.length > 0;
  for (const [position, writeIndex] of artifactWriteIndexes.entries()) {
    const boundary = artifactWriteIndexes[position + 1] ?? events.length;
    const interval = events.slice(writeIndex + 1, boundary);
    const readIndex = interval.findIndex(
      (event) => event.name === "read_file" && event.path === "todo.md",
    );
    const writeTodoIndex = interval.findIndex(
      (event, index) => index > readIndex && event.name === "write_file" && event.path === "todo.md",
    );
    if (readIndex < 0 || writeTodoIndex < 0) revisitAfterEveryArtifactWrite = false;
  }
  const initialTodoItemCount = checkboxItems(initialTodo).length;
  const finalTodoItemCount = checkboxItems(todo).length;
  const errors = [
    ...(!initialTodoBeforeArtifact ? ["todo.md was not written before the first artifact"] : []),
    ...(initialTodoItemCount === 3
      ? []
      : [`initial todo.md contains ${initialTodoItemCount} checkbox items instead of exactly 3`]),
    ...(!revisitAfterEveryArtifactWrite ? ["todo.md was not read and updated after every artifact write"] : []),
    ...(finalTodoItemCount === 3
      ? []
      : [`final todo.md contains ${finalTodoItemCount} checkbox items instead of exactly 3`]),
  ];
  return {
    errors,
    initialTodoItemCount,
    finalTodoItemCount,
    initialTodoBeforeArtifact,
    revisitAfterEveryArtifactWrite,
  };
}

function toolCallSequence(record: CellRunRecord): Array<{
  name: string;
  path?: string;
  content?: string;
}> {
  const calls: Array<{ name: string; path?: string; content?: string }> = [];
  for (const phase of record.rawSteps) {
    if (!isObject(phase) || !Array.isArray(phase.steps)) continue;
    for (const step of phase.steps) {
      if (!isObject(step) || !Array.isArray(step.toolCalls)) continue;
      for (const call of step.toolCalls) {
        if (!isObject(call) || typeof call.toolName !== "string") continue;
        const input = isObject(call.input) ? call.input : {};
        calls.push({
          name: call.toolName,
          ...(typeof input.path === "string" ? { path: input.path } : {}),
          ...(typeof input.content === "string" ? { content: input.content } : {}),
        });
      }
    }
  }
  return calls;
}

function checkboxItems(content: string): string[] {
  return content.split("\n").filter(
    (line) => /^\s*[-*+]\s+\[(?: |x|X)\]\s+/.test(line),
  );
}

function filterWorkspaceDiff(diff: CellRunRecord["workspaceDiff"]) {
  const keep = (path: string) => path === "draft.md" || path === "appointments-index.md";
  return {
    added: diff.added.filter(keep),
    changed: diff.changed.filter(keep),
    removed: diff.removed.filter(keep),
  };
}

function inconclusiveResult(
  descriptor: DriverDescriptor,
  criteria: string[],
  findings: string[],
): ModelEvaluationJudgeResult {
  return {
    descriptor,
    judgement: {
      preferred: "inconclusive",
      acceptance: criteria.map((condition) => ({
        condition,
        a: "unknown",
        b: "unknown",
        evidence: [],
      })),
      findings,
      evidence: [],
    },
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    raw: { skipped: true },
  };
}

async function verifyPacketFiles(expected: Record<string, string>): Promise<Record<string, string>> {
  const observed: Record<string, string> = {};
  for (const [path, digest] of Object.entries(expected)) {
    const content = await readFile(join(import.meta.dir, path));
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== digest) {
      throw new Error(`packet file mismatch for ${path}: expected ${digest}, observed ${actual}`);
    }
    observed[path] = actual;
  }
  return observed;
}

async function readFinal(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    return `[missing artifact: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

async function git(args: string[]): Promise<string> {
  const child = Bun.spawn(["git", ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
