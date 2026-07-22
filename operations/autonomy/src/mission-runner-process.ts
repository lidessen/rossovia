import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runMissionRunner } from "./mission-runner";
import { loadMissionRuntimeFactory } from "./mission-runtime";
import { MissionAnchorSeedSchema } from "./mission-reconciliation";

const options = parseOptions(process.argv.slice(2));

try {
  const prepareExecution = options.runtimeModule === undefined
    ? undefined
    : await loadMissionRuntimeFactory(options.runtimeModule);
  const initialAnchor = options.anchorFile === undefined
    ? undefined
    : MissionAnchorSeedSchema.parse(JSON.parse(await readFile(resolve(options.anchorFile), "utf8")));
  await runMissionRunner({
    root: options.home,
    missionId: options.missionId,
    ...(prepareExecution === undefined ? {} : { prepareExecution }),
    ...(initialAnchor === undefined ? {} : { initialAnchor }),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseOptions(args: readonly string[]): {
  readonly home: string;
  readonly missionId: string;
  readonly runtimeModule?: string;
  readonly anchorFile?: string;
} {
  let home: string | undefined;
  let missionId: string | undefined;
  let runtimeModule: string | undefined;
  let anchorFile: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--home" && value !== undefined) {
      home = value;
      index += 1;
      continue;
    }
    if (argument === "--mission" && value !== undefined) {
      missionId = value;
      index += 1;
      continue;
    }
    if (argument === "--runtime-module" && value !== undefined) {
      runtimeModule = value;
      index += 1;
      continue;
    }
    if (argument === "--anchor-file" && value !== undefined) {
      anchorFile = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete Mission runner argument: ${argument ?? "<missing>"}`);
  }
  if (home === undefined || missionId === undefined) {
    throw new Error("Mission runner requires --home and --mission");
  }
  return {
    home,
    missionId,
    ...(runtimeModule === undefined ? {} : { runtimeModule }),
    ...(anchorFile === undefined ? {} : { anchorFile }),
  };
}
