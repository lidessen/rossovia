import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { AiSdkDeepSeekDriver } from "./ai-sdk-driver";
import { CellInputSchema, type CellRunRecord } from "./contracts";
import { runExperimentFromFile } from "./experiment";
import { AiSdkDeepSeekJudge } from "./judge";
import { latestProjectRun, lowerProjectProbe, persistProjectRun } from "./project";
import { renderRunSummary } from "./presentation";
import { runCell } from "./run-cell";

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

  if (command === "experiment") {
    const path = requiredPath(rest, "experiment");
    const record = await runExperimentFromFile(
      path,
      () => new AiSdkDeepSeekDriver(),
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
            statuses: run.tree.records.map((cell) => cell.status),
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

  if (command === "probe") {
    const input = await lowerProjectProbe(parseProbeArguments(rest));
    const record = await runCell(input, new AiSdkDeepSeekDriver());
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

function parseProbeArguments(args: string[]) {
  const intent = args[0];
  if (!intent || intent.startsWith("-")) {
    throw new Error("probe requires an intent as its first argument");
  }
  const acceptance: string[] = [];
  const scopes: string[] = [];
  let id: string | undefined;
  let maxTokens: number | undefined;
  let maxSteps: number | undefined;
  let maxDurationMs: number | undefined;
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value) throw new Error(`missing value for ${flag ?? "probe argument"}`);
    if (flag === "--accept") acceptance.push(value);
    else if (flag === "--scope") scopes.push(value);
    else if (flag === "--id") id = value;
    else if (flag === "--max-tokens") maxTokens = positiveInteger(flag, value);
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
    ...(maxTokens || maxSteps || maxDurationMs
      ? {
          budget: {
            ...(maxTokens ? { maxTokens } : {}),
            ...(maxSteps ? { maxSteps } : {}),
            ...(maxDurationMs ? { maxDurationMs } : {}),
          },
        }
      : {}),
  };
}

function positiveInteger(flag: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer`);
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
    "  bun src/cli.ts experiment <experiment.json>",
    "  bun src/cli.ts probe <intent> --accept <condition> [--scope <path> ...] [--max-tokens <n>]",
    "  bun src/cli.ts review [record.json]",
  ].join("\n"));
  process.exit(2);
}
