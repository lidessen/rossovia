import { readdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import { AiSdkDeepSeekDriver } from "./ai-sdk-driver";
import { AiSdkDeepSeekSequenceDriver } from "./adapters/sequence/ai-sdk-driver";
import { CellInputSchema, type CellRunRecord } from "./contracts";
import { persistDeliberationRecord, runDeliberation } from "./adapters/deliberation/runtime";
import { runExperimentFromFile } from "./adapters/experiment/runtime";
import { AiSdkDeepSeekJudge } from "./adapters/experiment/judge";
import { latestProjectRun, lowerProjectProbe, persistProjectRun } from "./adapters/sequence/project";
import { prepareProjectDeliberation } from "./adapters/deliberation/project";
import { renderRunSummary } from "./adapters/sequence/presentation";
import { runCell } from "./run-cell";
import { runSequenceCell } from "./adapters/sequence/runtime";
import { persistSwarmRecord, runSwarm } from "./swarm";

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (!command) usage();

  if (command === "run") {
    const path = requiredPath(rest, "run");
    const absolutePath = resolve(path);
    const raw = JSON.parse(await readFile(absolutePath, "utf8"));
    if (raw.workspace?.root && !isAbsolute(raw.workspace.root)) {
      raw.workspace.root = resolve(dirname(absolutePath), raw.workspace.root);
    }
    const input = CellInputSchema.parse(raw);
    const record = await runCell(input, new AiSdkDeepSeekDriver());
    const output = `${absolutePath.replace(/\.json$/, "")}.run.json`;
    await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, runId: record.runId, status: record.status, usage: record.usage }, null, 2));
    return;
  }

  if (command === "swarm") {
    const path = requiredPath(rest, "swarm");
    const absolutePath = resolve(path);
    const raw = JSON.parse(await readFile(absolutePath, "utf8"));
    if (Array.isArray(raw.cells)) {
      for (const cell of raw.cells) {
        if (cell?.workspace?.root && !isAbsolute(cell.workspace.root)) {
          cell.workspace.root = resolve(dirname(absolutePath), cell.workspace.root);
        }
      }
    }
    const record = await runSwarm(raw, () => new AiSdkDeepSeekDriver());
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
      () => new AiSdkDeepSeekSequenceDriver(),
      new AiSdkDeepSeekJudge(),
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

  if (command === "deliberate") {
    const path = requiredPath(rest, "deliberate");
    const absolutePath = resolve(path);
    const manifest = JSON.parse(await readFile(absolutePath, "utf8"));
    await reconcileAbandonedAttempts(absolutePath);
    const attemptId = randomUUID();
    const receipt = `${absolutePath.replace(/\.json$/, "")}.${attemptId}.attempt.json`;
    await writeFile(receipt, `${JSON.stringify({ version: "work-cell.deliberation-attempt.v1", attemptId, manifest: absolutePath, pid: process.pid, status: "started", startedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    try {
      const record = await runDeliberation(manifest, () => new AiSdkDeepSeekSequenceDriver());
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
    const record = await runDeliberation(prepared.manifest, () => new AiSdkDeepSeekSequenceDriver());
    const output = resolve(prepared.directory, `record-${record.runId}.json`);
    await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, evidence: prepared.evidencePath, docketId: record.docket.id, summary: record.summary }, null, 2));
    return;
  }

  if (command === "probe") {
    const input = await lowerProjectProbe(parseProbeArguments(rest));
    const record = await runSequenceCell(input, new AiSdkDeepSeekSequenceDriver());
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

  usage();
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

function usage(): never {
  console.error([
    "Usage:",
    "  bun src/cli.ts run <cell.json>",
    "  bun src/cli.ts swarm <swarm.json>",
    "  bun src/cli.ts experiment <experiment.json>",
    "  bun src/cli.ts deliberate <deliberation.json>",
    "  bun src/cli.ts deliberate-probe <question> --option A=<summary> --option B=<summary> --seat P04=<role> --seat P11=<role> --seat P15=<role> --source <path> --budget-tokens <n> --member-estimated-tokens <n> --budget-source <approval> [--execute]",
    "  bun src/cli.ts probe <intent> --accept <condition> [--scope <path> ...] [--estimated-tokens <n>] [--estimated-tokens-tolerance <ratio>]",
    "  bun src/cli.ts review [record.json]",
  ].join("\n"));
  process.exit(2);
}
