import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  AiSdkValidationDriver,
  TaskToolSetSchema,
  type TaskToolSet,
} from "./ai-sdk-driver";
import { AiSdkValidationSequenceDriver } from "./adapters/sequence/ai-sdk-driver";
import { CellInputSchema, type CellRunRecord, type TraceEvent } from "./contracts";
import { persistDeliberationRecord, runDeliberation } from "./adapters/deliberation/runtime";
import { runExperimentFromFile } from "./adapters/experiment/runtime";
import { AiSdkValidationJudge } from "./adapters/experiment/judge";
import {
  ModelEvaluationSpecSchema,
  runModelEvaluationFromFile,
} from "./adapters/model-evaluation/runtime";
import { AiSdkModelEvaluationJudge } from "./adapters/model-evaluation/judge";
import { latestProjectRun, lowerProjectProbe, persistProjectRun } from "./adapters/sequence/project";
import { prepareProjectDeliberation } from "./adapters/deliberation/project";
import { renderRunSummary } from "./adapters/sequence/presentation";
import { runCell } from "./run-cell";
import { createLiveTraceFile } from "./live-trace-file";
import { runSequenceCell } from "./adapters/sequence/runtime";
import { persistSwarmRecord, runSwarm } from "./swarm";
import { queryKimiCodingQuota, renderKimiCodingQuota } from "./providers/kimi-coding-quota";
import { observeCodex } from "./providers/codex-observer";
import {
  captureClaudeStatusline,
  observeClaude,
} from "./providers/claude-observer";
import { renderProviderObservation } from "./provider-observation";
import {
  defaultProviderProfilePath,
  discoverProviderCredentials,
  ProviderProfileSchema,
  type ProviderCredentialCandidate,
} from "./provider-profile";

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (!command) usage();

  if (command === "run") {
    const { path, taskToolSet } = parseExecutionArguments(rest, "run");
    const absolutePath = resolve(path);
    const raw = JSON.parse(await readFile(absolutePath, "utf8"));
    if (raw.workspace?.root && !isAbsolute(raw.workspace.root)) {
      raw.workspace.root = resolve(dirname(absolutePath), raw.workspace.root);
    }
    const input = CellInputSchema.parse(raw);
    const liveTrace = createLiveTraceFile(absolutePath, console.error);
    const record = await runCell(input, new AiSdkValidationDriver({ taskToolSet }), {
      onTrace(event) {
        liveTrace.observe(event);
        console.error(renderLiveEvent(event));
      },
    });
    const output = `${absolutePath.replace(/\.json$/, "")}.run.json`;
    await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, events: liveTrace.availablePath(), runId: record.runId, status: record.status, usage: record.usage }, null, 2));
    return;
  }

  if (command === "swarm") {
    const { path, taskToolSet } = parseExecutionArguments(rest, "swarm");
    const absolutePath = resolve(path);
    const raw = JSON.parse(await readFile(absolutePath, "utf8"));
    if (Array.isArray(raw.cells)) {
      for (const cell of raw.cells) {
        if (cell?.workspace?.root && !isAbsolute(cell.workspace.root)) {
          cell.workspace.root = resolve(dirname(absolutePath), cell.workspace.root);
        }
      }
    }
    const record = await runSwarm(raw, () => new AiSdkValidationDriver({ taskToolSet }));
    const persisted = await persistSwarmRecord(absolutePath, record);
    console.log(JSON.stringify({
      output: persisted.indexPath,
      directory: persisted.directory,
      runId: record.runId,
      swarmId: record.swarmId,
      concurrency: record.concurrency,
      cells: record.outcomes.length,
      summary: persisted.index.summary,
    }, null, 2));
    return;
  }

  if (command === "experiment") {
    const path = requiredPath(rest, "experiment");
    const record = await runExperimentFromFile(
      path,
      () => new AiSdkValidationSequenceDriver(),
      new AiSdkValidationJudge(),
    );
    console.log(
      JSON.stringify(
        {
          id: record.id,
          fixtureSnapshot: record.fixtureSnapshot,
          runs: record.runs.map((run) => ({
            variant: run.variantId,
            repetition: run.repetition,
            status: run.record.status,
            directory: run.directory,
          })),
          comparisons: record.comparisons.map((comparison) => ({
            repetition: comparison.repetition,
            blindMap: comparison.blindMap,
            preferred: comparison.judge.judgement.preferred,
            attribution: comparison.attribution,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "model") {
    const [action, ...modelRest] = rest;
    if (action !== "evaluate") usage();
    const path = requiredPath(modelRest, "model evaluate");
    const absolutePath = resolve(path);
    const spec = ModelEvaluationSpecSchema.parse(JSON.parse(await readFile(absolutePath, "utf8")));
    const record = await runModelEvaluationFromFile(
      absolutePath,
      (profile) => new AiSdkValidationDriver({ route: profile.route }),
      new AiSdkModelEvaluationJudge({ route: spec.judge.route }),
    );
    console.log(JSON.stringify({
      id: record.id,
      output: record.recordPath,
      trials: record.trials.length,
      comparisons: record.comparisons.map(({ caseId, result }) => ({
        caseId,
        status: result.judgement.preferred === "inconclusive" ? "inconclusive" : "recorded",
      })),
      profiles: record.profileSummaries,
      authority: record.authority,
    }, null, 2));
    return;
  }

  if (command === "deliberate") {
    const path = requiredPath(rest, "deliberate");
    const absolutePath = resolve(path);
    const manifest = JSON.parse(await readFile(absolutePath, "utf8"));
    await reconcileAbandonedAttempts(absolutePath);
    const attemptId = randomUUID();
    const receipt = `${absolutePath.replace(/\.json$/, "")}.${attemptId}.attempt.json`;
    await writeFile(receipt, `${JSON.stringify({ version: "work-cell.deliberation-attempt.v1", attemptId, manifest: absolutePath, pid: process.pid, status: "started", startedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    try {
      const record = await runDeliberation(manifest, () => new AiSdkValidationSequenceDriver());
      const output = await persistDeliberationRecord(absolutePath, record);
      await writeFile(receipt, `${JSON.stringify({ version: "work-cell.deliberation-attempt.v1", attemptId, manifest: absolutePath, status: "settled", startedAt: record.startedAt, finishedAt: record.finishedAt, record: output }, null, 2)}\n`, "utf8");
      console.log(JSON.stringify({ output, receipt, docketId: record.docket.id, summary: record.summary }, null, 2));
    } catch (error) {
      await writeFile(receipt, `${JSON.stringify({ version: "work-cell.deliberation-attempt.v1", attemptId, manifest: absolutePath, status: "failed", finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`, "utf8");
      throw error;
    }
    return;
  }

  if (command === "deliberate-probe") {
    const { execute, request } = parseDeliberationProbeArguments(rest);
    const prepared = await prepareProjectDeliberation(request);
    if (!execute) {
      console.log(JSON.stringify({
        prepared: true,
        executionStarted: false,
        directory: prepared.directory,
        manifest: prepared.manifestPath,
        evidence: prepared.evidencePath,
        docketId: prepared.manifest.id,
        budget: prepared.manifest.budget,
      }, null, 2));
      return;
    }
    const record = await runDeliberation(prepared.manifest, () => new AiSdkValidationSequenceDriver());
    const output = resolve(prepared.directory, `record-${record.runId}.json`);
    await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, evidence: prepared.evidencePath, docketId: record.docket.id, summary: record.summary }, null, 2));
    return;
  }

  if (command === "probe") {
    const input = await lowerProjectProbe(parseProbeArguments(rest));
    const record = await runSequenceCell(input, new AiSdkValidationSequenceDriver());
    const output = await persistProjectRun(record, input.workspace.root);
    console.log(renderRunSummary(record, output));
    if (record.status !== "passed") process.exitCode = 1;
    return;
  }

  if (command === "review") {
    const requested = rest[0];
    const path = requested ? resolve(requested) : await latestProjectRun();
    const record = JSON.parse(await readFile(path, "utf8")) as CellRunRecord;
    console.log(renderRunSummary(record, path));
    return;
  }

  if (command === "provider") {
    await providerCommand(rest);
    return;
  }

  usage();
}

function renderLiveEvent(event: TraceEvent): string {
  if (event.type === "cell.started") {
    const data = event.data as { cellId?: string; driver?: { provider?: string; model?: string } };
    return `[work-cell] started ${data.cellId ?? "unknown"} via ${data.driver?.provider ?? "unknown"}/${data.driver?.model ?? "unknown"}`;
  }
  if (event.type === "agent.step.started") {
    const data = event.data as { provider?: string; model?: string; stepNumber?: number; activeTools?: string[] };
    const tools = data.activeTools?.length ? ` tools=${data.activeTools.join(",")}` : "";
    return `[work-cell] model step=${data.stepNumber ?? "?"} ${data.provider ?? "unknown"}/${data.model ?? "unknown"}${tools}`;
  }
  if (event.type === "agent.step.finished") {
    const data = event.data as {
      cumulativeUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      finishReason?: string;
      providerMetadata?: { workCellRoute?: { servedBy?: string; model?: string } };
    };
    const usage = data.cumulativeUsage;
    const served = data.providerMetadata?.workCellRoute;
    const target = served?.servedBy
      ? ` ${served.servedBy}${served.model ? `/${served.model}` : ""}`
      : "";
    const tokens = usage
      ? ` input=${usage.inputTokens ?? 0} output=${usage.outputTokens ?? 0} total=${usage.totalTokens ?? 0}`
      : "";
    return `[work-cell] model settled${target} reason=${data.finishReason ?? "unknown"}${tokens}`;
  }
  if (event.type === "agent.tool.started") {
    const data = event.data as { name?: string; id?: string };
    return `[work-cell] tool started ${data.name ?? "unknown"}${data.id ? ` id=${data.id}` : ""}`;
  }
  if (event.type === "agent.tool.finished") {
    const data = event.data as { name?: string; id?: string; durationMs?: number; outcome?: string };
    return `[work-cell] tool finished ${data.name ?? "unknown"}${data.id ? ` id=${data.id}` : ""}${data.durationMs === undefined ? "" : ` duration=${data.durationMs}ms`}${data.outcome ? ` outcome=${data.outcome}` : ""}`;
  }
  if (event.type === "agent.reasoning.started") {
    const data = event.data as { phase?: string };
    return `[work-cell] thinking started${data.phase ? ` phase=${data.phase}` : ""}`;
  }
  if (event.type === "agent.reasoning.progress") {
    const data = event.data as { phase?: string; characters?: number };
    return `[work-cell] thinking${data.phase ? ` phase=${data.phase}` : ""} characters=${data.characters ?? 0}`;
  }
  if (event.type === "agent.reasoning.finished") {
    const data = event.data as { phase?: string; characters?: number };
    return `[work-cell] thinking finished${data.phase ? ` phase=${data.phase}` : ""} characters=${data.characters ?? 0}`;
  }
  if (event.type === "agent.response.started") {
    const data = event.data as { phase?: string };
    return `[work-cell] response started${data.phase ? ` phase=${data.phase}` : ""}`;
  }
  if (event.type === "agent.response.progress") {
    const data = event.data as { phase?: string; characters?: number };
    return `[work-cell] response${data.phase ? ` phase=${data.phase}` : ""} characters=${data.characters ?? 0}`;
  }
  if (event.type === "agent.response.finished") {
    const data = event.data as { phase?: string; characters?: number };
    return `[work-cell] response finished${data.phase ? ` phase=${data.phase}` : ""} characters=${data.characters ?? 0}`;
  }
  if (event.type === "cell.finished") {
    const data = event.data as { status?: string; usage?: { totalTokens?: number } };
    return `[work-cell] finished status=${data.status ?? "unknown"} total=${data.usage?.totalTokens ?? 0}`;
  }
  if (event.type.startsWith("task.") || event.type.startsWith("terminal.")) {
    return `[work-cell] ${event.type}`;
  }
  if (event.type === "tool.read_file") {
    const data = event.data as { path?: string; startLine?: number; endLine?: number; characters?: number };
    const lines = data.startLine === undefined
      ? ""
      : ` lines=${data.startLine}${data.endLine === undefined ? "+" : `-${data.endLine}`}`;
    return `[work-cell] read ${data.path ?? "unknown"}${lines} characters=${data.characters ?? 0}`;
  }
  if (event.type === "tool.list_files") {
    const data = event.data as { path?: string; count?: number };
    return `[work-cell] list ${data.path ?? "."} entries=${data.count ?? 0}`;
  }
  if (event.type === "tool.write_file") {
    const data = event.data as { path?: string; characters?: number };
    return `[work-cell] write ${data.path ?? "unknown"} characters=${data.characters ?? 0}`;
  }
  if (event.type === "tool.run_command") {
    const data = event.data as { argv?: string[]; cwd?: string; exitCode?: number; timedOut?: boolean };
    return `[work-cell] command ${(data.argv ?? []).join(" ") || "unknown"} cwd=${data.cwd ?? "."} exit=${data.exitCode ?? "?"}${data.timedOut ? " timed-out" : ""}`;
  }
  return `[work-cell] ${event.type}`;
}

async function reconcileAbandonedAttempts(manifestPath: string): Promise<void> {
  const directory = dirname(manifestPath);
  const prefix = `${manifestPath.slice(manifestPath.lastIndexOf("/") + 1).replace(/\.json$/, "")}.`;
  const entries = await readdir(directory).catch(() => []);
  for (const entry of entries.filter((name) => name.startsWith(prefix) && name.endsWith(".attempt.json"))) {
    const path = resolve(directory, entry);
    const receipt = JSON.parse(await readFile(path, "utf8")) as { status?: string; pid?: number };
    if (receipt.status !== "started") continue;
    let alive = typeof receipt.pid === "number";
    if (alive) {
      try { process.kill(receipt.pid!, 0); } catch { alive = false; }
    }
    if (!alive) await writeFile(path, `${JSON.stringify({ ...receipt, status: "abandoned", observedAt: new Date().toISOString(), reason: "runner process is no longer live; no terminal record was retained" }, null, 2)}\n`, "utf8");
  }
}

function parseProbeArguments(args: string[]) {
  const intent = args[0];
  if (!intent || intent.startsWith("-")) {
    throw new Error("probe requires an intent as its first argument");
  }
  const acceptance: string[] = [];
  const scopes: string[] = [];
  let id: string | undefined;
  let estimatedTokens: number | undefined;
  let estimatedTokensTolerance: number | undefined;
  let maxSteps: number | undefined;
  let maxDurationMs: number | undefined;
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value) throw new Error(`missing value for ${flag ?? "probe argument"}`);
    if (flag === "--accept") acceptance.push(value);
    else if (flag === "--scope") scopes.push(value);
    else if (flag === "--id") id = value;
    else if (flag === "--estimated-tokens") estimatedTokens = positiveInteger(flag, value);
    else if (flag === "--estimated-tokens-tolerance") estimatedTokensTolerance = nonnegativeNumber(flag, value);
    else if (flag === "--max-steps") maxSteps = positiveInteger(flag, value);
    else if (flag === "--timeout-ms") maxDurationMs = positiveInteger(flag, value);
    else throw new Error(`unknown probe option: ${flag}`);
    index += 1;
  }
  if (acceptance.length === 0) throw new Error("probe requires at least one --accept condition");
  return {
    intent,
    acceptance,
    ...(scopes.length ? { scopes } : {}),
    ...(id ? { id } : {}),
    ...(estimatedTokens || estimatedTokensTolerance !== undefined || maxSteps || maxDurationMs
      ? {
          budget: {
            ...(estimatedTokens ? { estimatedTokens } : {}),
            ...(estimatedTokensTolerance === undefined ? {} : { estimatedTokensTolerance }),
            ...(maxSteps ? { maxSteps } : {}),
            ...(maxDurationMs ? { maxDurationMs } : {}),
          },
        }
      : {}),
  };
}

function parseDeliberationProbeArguments(args: string[]) {
  const question = args[0];
  if (!question || question.startsWith("-")) {
    throw new Error("deliberate-probe requires a question as its first argument");
  }
  const options: Array<{ id: string; summary: string }> = [];
  const seats: Array<{ pid: string; role: string }> = [];
  const sources: string[] = [];
  let id: string | undefined;
  let budgetTokens: number | undefined;
  let memberEstimatedTokens: number | undefined;
  let budgetSource: string | undefined;
  let maxSourceChars: number | undefined;
  let plannedTotalTokens: number | undefined;
  let maxRecoveryAttempts: 1 | undefined;
  let execute = false;
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--execute") {
      execute = true;
      continue;
    }
    const value = args[index + 1];
    if (!flag || !value) throw new Error(`missing value for ${flag ?? "deliberate-probe argument"}`);
    if (flag === "--option") {
      const parsed = parseAssignment(flag, value, "id", "summary");
      options.push({ id: parsed.left, summary: parsed.right });
    }
    else if (flag === "--seat") {
      const parsed = parseAssignment(flag, value, "pid", "role");
      seats.push({ pid: parsed.left, role: parsed.right });
    }
    else if (flag === "--source") sources.push(value);
    else if (flag === "--id") id = value;
    else if (flag === "--budget-tokens") budgetTokens = positiveInteger(flag, value);
    else if (flag === "--member-estimated-tokens") memberEstimatedTokens = positiveInteger(flag, value);
    else if (flag === "--budget-source") budgetSource = value;
    else if (flag === "--max-source-chars") maxSourceChars = positiveInteger(flag, value);
    else if (flag === "--planned-tokens") plannedTotalTokens = positiveInteger(flag, value);
    else if (flag === "--recovery-attempts") { if (value !== "1") throw new Error("--recovery-attempts currently supports only 1"); maxRecoveryAttempts = 1; }
    else throw new Error(`unknown deliberate-probe option: ${flag}`);
    index += 1;
  }
  if (options.length < 2) throw new Error("deliberate-probe requires at least two --option entries");
  if (seats.length < 3) throw new Error("deliberate-probe requires three to five --seat entries");
  if (sources.length === 0) throw new Error("deliberate-probe requires at least one --source path");
  if (!budgetTokens || !memberEstimatedTokens || !budgetSource) {
    throw new Error("deliberate-probe requires --budget-tokens, --member-estimated-tokens, and --budget-source from an explicit human authorization");
  }
  return {
    execute,
    request: {
      question,
      options,
      seats,
      sources,
      ...(id ? { id } : {}),
      ...(maxSourceChars ? { maxSourceChars } : {}),
      budget: {
        envelope: { id: `deliberation-${id ?? "probe"}-allocation`, version: "budget-envelope.v1" as const, maxTotalTokens: budgetTokens, onExhaustion: "partial" as const },
        source: budgetSource,
        memberEstimatedTokens,
        ...(plannedTotalTokens ? { plannedTotalTokens } : {}),
        ...(maxRecoveryAttempts ? { maxRecoveryAttempts } : {}),
      },
    },
  };
}

function parseAssignment(
  flag: string,
  value: string,
  leftLabel: string,
  rightLabel: string,
): { left: string; right: string } {
  const separator = value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`${flag} must use ${leftLabel}=<${rightLabel}>`);
  }
  return { left: value.slice(0, separator), right: value.slice(separator + 1) };
}

function positiveInteger(flag: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer`);
  return parsed;
}

function nonnegativeNumber(flag: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number`);
  return parsed;
}

function requiredPath(args: string[], command: string): string {
  const path = args[0];
  if (!path) throw new Error(`${command} requires a JSON file path`);
  return path;
}

function parseExecutionArguments(
  args: string[],
  command: "run" | "swarm",
): { path: string; taskToolSet: TaskToolSet } {
  const path = requiredPath(args, command);
  let taskToolSet: TaskToolSet = "manage";
  let taskToolSetDeclared = false;
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value) throw new Error(`missing value for ${flag ?? `${command} option`}`);
    if (flag !== "--task-tools") throw new Error(`unknown ${command} option: ${flag}`);
    if (taskToolSetDeclared) throw new Error("--task-tools may be declared only once");
    const parsed = TaskToolSetSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error("--task-tools must be manage, read-update, or read-only");
    }
    taskToolSet = parsed.data;
    taskToolSetDeclared = true;
    index += 1;
  }
  return { path, taskToolSet };
}

function usage(): never {
  console.error([
    "Usage:",
    "  bun src/cli.ts run <cell.json> [--task-tools <manage|read-update|read-only>]",
    "  bun src/cli.ts swarm <swarm.json> [--task-tools <manage|read-update|read-only>]",
    "  bun src/cli.ts experiment <experiment.json>",
    "  bun src/cli.ts model evaluate <model-evaluation.json>",
    "  bun src/cli.ts deliberate <deliberation.json>",
    "  bun src/cli.ts deliberate-probe <question> --option A=<summary> --option B=<summary> --seat P04=<role> --seat P11=<role> --seat P15=<role> --source <path> --budget-tokens <n> --member-estimated-tokens <n> --budget-source <approval> [--execute]",
    "  bun src/cli.ts probe <intent> --accept <condition> [--scope <path> ...] [--estimated-tokens <n>] [--estimated-tokens-tolerance <ratio>]",
    "  bun src/cli.ts review [record.json]",
    "  bun src/cli.ts provider discover [--json]",
    "  bun src/cli.ts provider configure [--route <provider,...>] [--output <path>] [--yes]",
    "  bun src/cli.ts provider observe <kimi-coding|codex|claude> [--quota-file <path>] [--json]",
    "  bun src/cli.ts provider capture claude [--output <path>] [--forward <statusline-command>]",
  ].join("\n"));
  process.exit(2);
}

async function providerCommand(args: string[]): Promise<void> {
  const [action, ...rest] = args;
  if (action === "discover") {
    if (rest.length > 1 || (rest[0] && rest[0] !== "--json")) {
      throw new Error(`unknown provider discover option: ${rest[0]}`);
    }
    const candidates = discoverProviderCredentials();
    if (rest[0] === "--json") {
      console.log(JSON.stringify({ candidates }, null, 2));
      return;
    }
    for (const candidate of candidates) {
      console.log(`${candidate.present ? "found" : "missing"}\t${candidate.provider}\t${candidate.credential.name}`);
    }
    console.log("Discovery reports credential references only; it does not select or contact a provider.");
    return;
  }

  if (action === "configure") {
    await configureProviders(rest);
    return;
  }

  if (action === "observe") {
    const provider = rest[0];
    if (!provider) throw new Error("provider observe requires a provider id");
    let json = false;
    let quotaFile: string | undefined;
    for (let index = 1; index < rest.length; index += 1) {
      const flag = rest[index];
      if (flag === "--json") json = true;
      else if (flag === "--quota-file") quotaFile = requiredOptionValue(rest, index, flag), index += 1;
      else throw new Error(`unknown provider observe option: ${flag}`);
    }
    const observation = provider === "kimi-coding"
      ? await queryKimiCodingQuota()
      : provider === "codex"
        ? await observeCodex()
        : provider === "claude"
          ? await observeClaude({ ...(quotaFile ? { rateLimitsPath: resolve(quotaFile) } : {}) })
          : undefined;
    if (!observation) throw new Error(`provider observer is not implemented for ${provider}`);
    console.log(json ? JSON.stringify(observation, null, 2) : provider === "kimi-coding"
      ? renderKimiCodingQuota(observation)
      : renderProviderObservation(observation));
    return;
  }

  if (action === "capture") {
    const provider = rest[0];
    if (provider !== "claude") throw new Error("provider capture currently requires claude");
    let output: string | undefined;
    let forward: string | undefined;
    for (let index = 1; index < rest.length; index += 1) {
      const flag = rest[index];
      if (flag === "--output") output = resolve(requiredOptionValue(rest, index, flag)), index += 1;
      else if (flag === "--forward") forward = requiredOptionValue(rest, index, flag), index += 1;
      else throw new Error(`unknown provider capture option: ${flag}`);
    }
    const raw = await readStandardInput();
    await captureClaudeStatusline(JSON.parse(raw), { ...(output ? { path: output } : {}) });
    if (forward) process.stdout.write(await forwardStatusline(forward, raw));
    return;
  }

  throw new Error("provider requires discover, configure, observe, or capture");
}

async function configureProviders(args: string[]): Promise<void> {
  let routeArgument: string | undefined;
  let output = defaultProviderProfilePath();
  let assumeYes = false;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--route") routeArgument = requiredOptionValue(args, index, flag), index += 1;
    else if (flag === "--output") output = resolve(requiredOptionValue(args, index, flag)), index += 1;
    else if (flag === "--yes") assumeYes = true;
    else throw new Error(`unknown provider configure option: ${flag}`);
  }
  const candidates = discoverProviderCredentials().filter((candidate) => candidate.present);
  if (candidates.length === 0) {
    throw new Error("no supported provider credential references were discovered");
  }
  const selected = routeArgument
    ? selectRoute(routeArgument.split(","), candidates)
    : await promptForRoute(candidates);
  const profile = ProviderProfileSchema.parse({
    version: "work-cell.provider-profile.v1",
    routes: {
      validation: selected.map(({ provider, credential }) => ({ provider, credential })),
    },
  });
  console.log("Validation route:");
  for (const [index, target] of profile.routes.validation.entries()) {
    console.log(`  ${index + 1}. ${target.provider} via ${target.credential.name}`);
  }
  console.log(`Target: ${output}`);
  if (!assumeYes) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await prompt.question("Save this non-secret provider profile? [y/N] ")).trim().toLowerCase();
    prompt.close();
    if (answer !== "y" && answer !== "yes") {
      console.log("Provider profile was not changed.");
      return;
    }
  }
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(profile, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, output);
  console.log(`Saved ${output}`);
}

async function promptForRoute(
  candidates: ProviderCredentialCandidate[],
): Promise<ProviderCredentialCandidate[]> {
  console.log("Discovered credential references (no provider has been contacted):");
  candidates.forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.label} (${candidate.credential.name})`);
  });
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("Validation route in desired order (for example 1,3): ");
  prompt.close();
  const indexes = answer.split(",").map((value) => Number(value.trim()) - 1);
  if (indexes.some((index) => !Number.isInteger(index) || !candidates[index])) {
    throw new Error("route selection contains an invalid candidate number");
  }
  return selectRoute(indexes.map((index) => candidates[index]!.provider), candidates);
}

function selectRoute(
  providers: string[],
  candidates: ProviderCredentialCandidate[],
): ProviderCredentialCandidate[] {
  const byProvider = new Map(candidates.map((candidate) => [candidate.provider, candidate]));
  const selected: ProviderCredentialCandidate[] = [];
  const seen = new Set<string>();
  for (const raw of providers) {
    const provider = raw.trim();
    if (!provider) continue;
    if (seen.has(provider)) throw new Error(`provider route repeats ${provider}`);
    const candidate = byProvider.get(provider as ProviderCredentialCandidate["provider"]);
    if (!candidate) throw new Error(`provider ${provider} was not discovered with an available credential reference`);
    seen.add(provider);
    selected.push(candidate);
  }
  if (selected.length === 0) throw new Error("provider route must select at least one discovered provider");
  return selected;
}

function requiredOptionValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function forwardStatusline(command: string, input: string): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    const child = spawn(command, [], { stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveOutput(Buffer.concat(stdout).toString("utf8"));
      else reject(new Error(`forwarded statusline exited with ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`));
    });
    child.stdin.end(input);
  });
}
