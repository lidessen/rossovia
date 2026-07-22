import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MissionInputDraft } from "./mission-input";
import { MissionReconciliationCommitSchema } from "./mission-reconciliation-commit";
import {
  missionRunnerRequest,
  readMissionRunnerStatus,
  requestMissionRunner,
  type MissionRunnerResponse,
  type MissionRunnerStatus,
} from "./mission-runner";

const parsed = parseArguments(process.argv.slice(2));

try {
  const result = await execute(parsed);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

interface CliArguments {
  readonly positionals: readonly string[];
  readonly home: string;
  readonly id: string;
  readonly actorRef: string;
  readonly sourceRef: string;
  readonly runtimeModule?: string;
  readonly anchorFile?: string;
}

async function execute(args: CliArguments): Promise<unknown> {
  const [area, action, missionId, ...rest] = args.positionals;
  if (area === "runner" && action === "start" && missionId !== undefined && rest.length === 0) {
    return await startRunner(args.home, missionId, args.runtimeModule, args.anchorFile);
  }
  if (
    area === "runner"
    && action === "status"
    && missionId !== undefined
    && rest.length === 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    try {
      return { live: true, ...(await requireSuccess(await requestMissionRunner(
        args.home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
      ))).status };
    } catch {
      const status = await readMissionRunnerStatus(args.home, missionId);
      return status === undefined ? { live: false, missionId, status: "not-found" } : { live: false, ...status };
    }
  }
  if (
    area === "runner"
    && action === "shutdown"
    && missionId !== undefined
    && rest.length === 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    return (await requireSuccess(await requestMissionRunner(
      args.home,
      missionId,
      missionRunnerRequest({ kind: "runner-shutdown" }),
    ))).status;
  }
  if (
    area === "mission"
    && action === "reconcile"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const commitPath = resolve(rest[0]!);
    const commit = MissionReconciliationCommitSchema.parse(JSON.parse(await readFile(commitPath, "utf8")));
    const response = requireSuccess(await requestMissionRunner(
      args.home,
      missionId,
      missionRunnerRequest({ kind: "reconciliation-commit", commit }),
    ));
    return {
      status: response.status,
      reconciliation: {
        proposalId: commit.proposal.id,
        inputWatermark: commit.proposal.inputRef.watermark,
        authorityRef: commit.acceptance.authorityRef,
      },
    };
  }
  if (
    area === "mission"
    && action === "input"
    && missionId !== undefined
    && rest.length > 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    return await sendInput(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      payload: { kind: "contribution", text: rest.join(" ") },
    });
  }
  if (
    area === "mission" &&
    action === "recover" &&
    missionId !== undefined &&
    rest.length === 1 &&
    args.runtimeModule === undefined &&
    args.anchorFile === undefined &&
    ["resume", "replace", "abandon"].includes(rest[0] ?? "")
  ) {
    return await recoverTurn(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      action: rest[0] as "resume" | "replace" | "abandon",
    });
  }
  if (
    area === "mission" &&
    action === "control" &&
    missionId !== undefined &&
    rest.length === 1 &&
    args.runtimeModule === undefined &&
    args.anchorFile === undefined &&
    ["pause", "resume", "stop", "approve-effect"].includes(rest[0] ?? "")
  ) {
    return await sendInput(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      payload: {
        kind: "control",
        command: rest[0] as "pause" | "resume" | "stop" | "approve-effect",
      },
    });
  }
  throw new Error(usage());
}

async function startRunner(
  home: string,
  missionId: string,
  runtimeModule?: string,
  anchorFile?: string,
): Promise<MissionRunnerStatus & { readonly live: boolean }> {
  let existing: Extract<MissionRunnerResponse, { ok: true }> | undefined;
  try {
    existing = requireSuccess(await requestMissionRunner(
      home,
      missionId,
      missionRunnerRequest({ kind: "status" }),
      500,
    ));
  } catch {
    // An unavailable socket is expected when starting or restarting a carrier.
  }
  if (existing !== undefined) {
    if (runtimeModule !== undefined || anchorFile !== undefined) {
      throw new Error(`Mission ${missionId} already has a live runner; runtime and initial anchor can only be selected at carrier start`);
    }
    return { live: true, ...existing.status };
  }

  const script = fileURLToPath(new URL("./mission-runner-process.ts", import.meta.url));
  const childArgs = [script, "--home", resolve(home), "--mission", missionId];
  if (runtimeModule !== undefined) childArgs.push("--runtime-module", resolve(runtimeModule));
  if (anchorFile !== undefined) childArgs.push("--anchor-file", resolve(anchorFile));
  const child = spawn(process.execPath, childArgs, {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  if (child.pid === undefined) throw new Error(`could not start Mission runner for ${missionId}`);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = requireSuccess(await requestMissionRunner(
        home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        300,
      ));
      if (response.status.pid === child.pid) return { live: true, ...response.status };
    } catch {
      const status = await readMissionRunnerStatus(home, missionId);
      if (status?.pid === child.pid && status.state === "mission-stopped") {
        return { live: false, ...status };
      }
    }
    await Bun.sleep(25);
  }
  throw new Error(`Mission runner for ${missionId} did not become ready`);
}

async function sendInput(home: string, missionId: string, input: MissionInputDraft): Promise<unknown> {
  const response = requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "input", input }),
  ));
  return { status: response.status, receipt: response.receipt };
}

async function recoverTurn(
  home: string,
  missionId: string,
  recovery: {
    readonly id: string;
    readonly actorRef: string;
    readonly sourceRef: string;
    readonly action: "resume" | "replace" | "abandon";
  },
): Promise<unknown> {
  const response = requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "recovery", recovery }),
  ));
  return { status: response.status, recovery };
}

function requireSuccess(response: MissionRunnerResponse): Extract<MissionRunnerResponse, { ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}

function parseArguments(args: readonly string[]): CliArguments {
  const positionals: string[] = [];
  let home = process.env.ATTHIS_HOME ?? join(homedir(), ".atthis");
  let id: string = randomUUID();
  let actorRef = "operator";
  let sourceRef = "cli";
  let runtimeModule: string | undefined;
  let anchorFile: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const value = args[index + 1];
    if (["--home", "--id", "--actor", "--source", "--runtime", "--anchor"].includes(argument)) {
      if (value === undefined) throw new Error(`missing value for ${argument}`);
      if (argument === "--home") home = value;
      if (argument === "--id") id = value;
      if (argument === "--actor") actorRef = value;
      if (argument === "--source") sourceRef = value;
      if (argument === "--runtime") runtimeModule = value;
      if (argument === "--anchor") anchorFile = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown option ${argument}`);
    positionals.push(argument);
  }
  return {
    positionals,
    home,
    id,
    actorRef,
    sourceRef,
    ...(runtimeModule === undefined ? {} : { runtimeModule }),
    ...(anchorFile === undefined ? {} : { anchorFile }),
  };
}

function usage(): string {
  return [
    "Usage:",
    "  autonomy runner start <mission-id> [--runtime <module-path>] [--anchor <seed.json>] [--home <path>]",
    "  autonomy runner status <mission-id> [--home <path>]",
    "  autonomy runner shutdown <mission-id> [--home <path>]",
    "  autonomy mission input <mission-id> <text> [--id <id>] [--actor <ref>] [--source <ref>]",
    "  autonomy mission reconcile <mission-id> <commit.json> [--home <path>]",
    "  autonomy mission control <mission-id> <pause|resume|stop|approve-effect> [input options]",
    "  autonomy mission recover <mission-id> <resume|replace|abandon> [--id <id>] [--actor <ref>] [--source <ref>]",
  ].join("\n");
}
