import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ParseUsageError, UsageError } from "./cli-errors";
import { saveJson } from "./home";
import {
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "./mission-execution-proposal";
import { runCommand } from "./process";

type BranchKind = "implementation" | "investigation" | "review" | "correction";
type BranchStatus = "open" | "integrating" | "suspended" | "closed";
type Disposition = "integrate" | "no-change" | "abandon";

interface MissionBranch {
  id: string;
  parent?: string;
  kind: BranchKind;
  purpose: string;
  returnCondition: string;
  sources: string[];
  status: BranchStatus;
  reactivationSignal?: string;
  disposition?: Disposition;
  mainlineDelta?: string;
}

export interface MissionRecord {
  version: "mission-record.v1";
  id: string;
  title: string;
  sources: string[];
  createdAt: string;
  updatedAt: string;
  mainline: {
    contradiction: string;
    acceptance: string[];
    status: "active" | "settled";
    closureSources?: string[];
  };
  branches: MissionBranch[];
  currentFocus: string;
  executionProposal?: MissionExecutionProposal;
}

interface ParsedCommand {
  positionals: string[];
  options: Map<string, string[]>;
  flags: Set<string>;
}

const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const branchKinds = new Set<BranchKind>(["implementation", "investigation", "review", "correction"]);
const branchStatuses = new Set<BranchStatus>(["open", "integrating", "suspended", "closed"]);
const dispositions = new Set<Disposition>(["integrate", "no-change", "abandon"]);

const MISSION_SUBCOMMANDS = new Set([
  "init",
  "list",
  "add-branch",
  "status",
  "check",
  "focus",
  "suspend",
  "resume",
  "settle",
  "close",
  "prune",
]);

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function nonempty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function stringList(value: unknown, label: string, minimum = 0): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim())) {
    throw new Error(`${label} must be a list of non-empty strings`);
  }
  if (value.length < minimum) throw new Error(`${label} must have at least ${minimum} item(s)`);
  return value;
}

function validId(value: unknown, label: string): string {
  const id = nonempty(value, label);
  if (!idPattern.test(id)) throw new Error(`${label} must use lowercase letters, digits, and hyphens`);
  return id;
}

function missionPath(root: string, id: string): string {
  return join(root, `${validId(id, "mission id")}.json`);
}

function validateMission(value: unknown): asserts value is MissionRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("mission record must be a JSON object");
  }
  const record = value as Record<string, unknown>;
  if (record.version !== "mission-record.v1") throw new Error("version must be mission-record.v1");
  validId(record.id, "id");
  nonempty(record.title, "title");
  const sources = stringList(record.sources, "sources", 1);
  if (new Set(sources).size !== sources.length) throw new Error("sources must be unique");
  nonempty(record.createdAt, "createdAt");
  nonempty(record.updatedAt, "updatedAt");
  if (record.executionProposal !== undefined) {
    const result = MissionExecutionProposalSchema.safeParse(record.executionProposal);
    if (!result.success) {
      throw new Error(`executionProposal is invalid: ${result.error.issues[0]?.message ?? "schema mismatch"}`);
    }
  }

  if (record.mainline === null || typeof record.mainline !== "object" || Array.isArray(record.mainline)) {
    throw new Error("mainline must be an object");
  }
  const mainline = record.mainline as Record<string, unknown>;
  nonempty(mainline.contradiction, "mainline.contradiction");
  stringList(mainline.acceptance, "mainline.acceptance", 1);
  if (mainline.status !== "active" && mainline.status !== "settled") {
    throw new Error("mainline.status must be active or settled");
  }
  if (mainline.status === "settled" && record.executionProposal !== undefined) {
    throw new Error("a settled mainline may not retain a pending executionProposal");
  }

  if (!Array.isArray(record.branches)) throw new Error("branches must be a list");
  const branches = record.branches as Array<Record<string, unknown>>;
  const ids = new Set<string>();
  const byId = new Map<string, Record<string, unknown>>();
  for (const branch of branches) {
    if (branch === null || typeof branch !== "object" || Array.isArray(branch)) {
      throw new Error("each branch must be an object");
    }
    const id = validId(branch.id, "branch.id");
    if (ids.has(id)) throw new Error("branch IDs must be unique");
    ids.add(id);
    byId.set(id, branch);
    if (!branchKinds.has(branch.kind as BranchKind)) throw new Error(`branch ${id} has an invalid kind`);
    nonempty(branch.purpose, `branch ${id}.purpose`);
    nonempty(branch.returnCondition, `branch ${id}.returnCondition`);
    const branchSources = stringList(branch.sources, `branch ${id}.sources`, 1);
    if (new Set(branchSources).size !== branchSources.length) {
      throw new Error(`branch ${id}.sources must be unique`);
    }
    if (!branchStatuses.has(branch.status as BranchStatus)) throw new Error(`branch ${id} has an invalid status`);
    const parent = branch.parent ?? "mainline";
    if (parent !== "mainline" && typeof parent !== "string") {
      throw new Error(`branch ${id}.parent must be mainline or a branch ID`);
    }
    if (branch.status === "suspended") nonempty(branch.reactivationSignal, `branch ${id}.reactivationSignal`);
    if (branch.status === "closed") {
      if (!dispositions.has(branch.disposition as Disposition)) {
        throw new Error(`closed branch ${id} needs an allowed disposition`);
      }
      nonempty(branch.mainlineDelta, `closed branch ${id}.mainlineDelta`);
    }
  }

  for (const [id, branch] of byId) {
    let parent = (branch.parent ?? "mainline") as string;
    if (parent !== "mainline" && !byId.has(parent)) throw new Error(`branch ${id} names an unknown parent ${parent}`);
    if (parent === id) throw new Error(`branch ${id} cannot parent itself`);
    const seen = new Set([id]);
    while (parent !== "mainline") {
      if (seen.has(parent)) throw new Error(`branch parent cycle includes ${id}`);
      seen.add(parent);
      parent = (byId.get(parent)!.parent ?? "mainline") as string;
    }
  }

  for (const [id, branch] of byId) {
    if (branch.status !== "closed") continue;
    const activeChild = branches.some((candidate) =>
      (candidate.parent ?? "mainline") === id && candidate.status !== "closed");
    if (activeChild) throw new Error(`closed branch ${id} still has an active direct child`);
  }

  const focus = record.currentFocus;
  if (focus !== "mainline" && (typeof focus !== "string" || !byId.has(focus))) {
    throw new Error("currentFocus must be mainline or a branch ID");
  }
  if (focus !== "mainline" && !new Set(["open", "integrating"]).has(byId.get(focus)!.status as string)) {
    throw new Error("currentFocus may name only an open or integrating branch");
  }
  if (mainline.status === "settled") {
    stringList(mainline.closureSources, "mainline.closureSources", 1);
    if (branches.some((branch) => branch.status !== "closed")) {
      throw new Error("a settled mainline may not retain open, integrating, or suspended branches");
    }
  }
}

function loadMission(path: string): MissionRecord {
  if (!existsSync(path)) throw new Error(`mission record not found: ${path}`);
  let record: unknown;
  try {
    record = JSON.parse(readFileSync(path, "utf8"));
  } catch (error: unknown) {
    throw new Error(`invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseMissionRecord(record);
}

export function parseMissionRecord(value: unknown): MissionRecord {
  validateMission(value);
  return value;
}

export function loadMissionRecord(path: string): MissionRecord {
  return loadMission(path);
}

function saveMission(path: string, record: MissionRecord): void {
  validateMission(record);
  saveJson(path, record);
}

function branchById(record: MissionRecord, id: string): MissionBranch {
  const branch = record.branches.find((candidate) => candidate.id === id);
  if (!branch) throw new Error(`unknown branch: ${id}`);
  return branch;
}

function returnFocus(record: MissionRecord, branch: MissionBranch): string {
  let parent = branch.parent ?? "mainline";
  while (parent !== "mainline") {
    const candidate = branchById(record, parent);
    if (candidate.status === "open" || candidate.status === "integrating") return candidate.id;
    parent = candidate.parent ?? "mainline";
  }
  return "mainline";
}

function runGit(arguments_: string[], cwd: string, quiet = false): { exitCode: number; output: string; error: string } {
  const result = runCommand("git", ["-C", cwd, ...arguments_], { quiet });
  return {
    exitCode: result.exitCode,
    output: result.stdout,
    error: result.stderr,
  };
}

function requiredGit(arguments_: string[], cwd: string): string {
  const result = runGit(arguments_, cwd);
  if (result.exitCode !== 0) throw new Error(result.error.trim() || "git command failed");
  return result.output;
}

function gitState(path: string, requireCommitted: boolean): { repository: string; path: string; status: string } {
  const repository = requiredGit(["rev-parse", "--show-toplevel"], dirname(path)).trim();
  const relativePath = relative(realpathSync(repository), realpathSync(path));
  if (runGit(["ls-files", "--error-unmatch", "--", relativePath], repository, true).exitCode !== 0) {
    throw new Error(`mission record is not Git-tracked: git add -- ${relativePath}`);
  }
  if (requireCommitted && runGit(["diff", "--quiet", "HEAD", "--", relativePath], repository, true).exitCode !== 0) {
    throw new Error(`mission record is not committed at HEAD: ${relativePath}`);
  }
  const status = requiredGit(["status", "--short", "--", relativePath], repository).trim();
  return { repository, path: relativePath, status: status || "clean" };
}

function statusProjection(record: MissionRecord) {
  return {
    id: record.id,
    mainline: record.mainline.status,
    currentFocus: record.currentFocus,
    openBranches: record.branches
      .filter((branch) => branch.status !== "closed")
      .map((branch) => ({
        id: branch.id,
        status: branch.status,
        parent: branch.parent ?? "mainline",
        returnCondition: branch.returnCondition,
      })),
  };
}

function parseCommand(
  raw: string[],
  positionalCount: number,
  singles: string[] = [],
  multiples: string[] = [],
  flags: string[] = [],
): ParsedCommand {
  const positionals = raw.slice(0, positionalCount);
  if (positionals.length !== positionalCount || positionals.some((value) => value.startsWith("--"))) {
    throw new ParseUsageError("missing required mission command argument");
  }
  const allowedSingles = new Set(singles);
  const allowedMultiples = new Set(multiples);
  const allowedFlags = new Set(flags);
  const options = new Map<string, string[]>();
  const seenFlags = new Set<string>();
  for (let index = positionalCount; index < raw.length; index += 1) {
    const option = raw[index]!;
    if (allowedFlags.has(option)) {
      if (seenFlags.has(option)) throw new ParseUsageError(`duplicate option: ${option}`);
      seenFlags.add(option);
      continue;
    }
    if (!allowedSingles.has(option) && !allowedMultiples.has(option)) {
      throw new ParseUsageError(`invalid option: ${option}`);
    }
    const value = raw[index + 1];
    if (!value) throw new ParseUsageError(`${option} requires a value`);
    if (allowedSingles.has(option) && options.has(option)) throw new ParseUsageError(`duplicate option: ${option}`);
    options.set(option, [...(options.get(option) ?? []), value]);
    index += 1;
  }
  return { positionals, options, flags: seenFlags };
}

function one(parsed: ParsedCommand, option: string, fallback?: string): string {
  const value = parsed.options.get(option)?.[0] ?? fallback;
  if (value === undefined) throw new ParseUsageError(`missing required option: ${option}`);
  return value;
}

function many(parsed: ParsedCommand, option: string): string[] {
  const values = parsed.options.get(option);
  if (!values || values.length === 0) throw new ParseUsageError(`missing required option: ${option}`);
  return values;
}

export function runMissionCommand(rawArguments: string[]): unknown {
  let raw = [...rawArguments];
  let root = resolve("operations/missions");
  if (raw[0] === "--root") {
    if (!raw[1]) throw new UsageError("--root requires a path", ["mission"]);
    root = resolve(raw[1]);
    raw = raw.slice(2);
  }
  const command = raw.shift();
  if (!command) throw new UsageError("mission requires a subcommand", ["mission"]);
  if (!MISSION_SUBCOMMANDS.has(command)) {
    throw new UsageError(`unknown mission command: ${command}`, ["mission"]);
  }
  try {
    return dispatchMissionCommand(command, raw, root);
  } catch (error: unknown) {
    if (error instanceof ParseUsageError) {
      throw new UsageError(error.message, ["mission", command], { cause: error });
    }
    throw error;
  }
}

function dispatchMissionCommand(command: string, raw: string[], root: string): unknown {
  if (command === "init") {
    const parsed = parseCommand(raw, 1, ["--title", "--mainline"], ["--accept", "--source"]);
    const path = missionPath(root, parsed.positionals[0]!);
    if (existsSync(path)) throw new Error(`mission record already exists: ${path}`);
    const timestamp = now();
    saveMission(path, {
      version: "mission-record.v1",
      id: parsed.positionals[0]!,
      title: one(parsed, "--title"),
      sources: many(parsed, "--source"),
      createdAt: timestamp,
      updatedAt: timestamp,
      mainline: { contradiction: one(parsed, "--mainline"), acceptance: many(parsed, "--accept"), status: "active" },
      branches: [],
      currentFocus: "mainline",
    });
    return path;
  }

  if (command === "list") {
    parseCommand(raw, 0);
    if (!existsSync(root)) throw new Error(`mission root not found: ${root}`);
    const records = readdirSync(root)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => loadMission(join(root, name)));
    return {
      activeMissions: records
        .filter((record) => record.mainline.status === "active")
        .map((record) => ({
          id: record.id,
          title: record.title,
          mainline: record.mainline.status,
          currentFocus: record.currentFocus,
          openBranches: statusProjection(record).openBranches,
          updatedAt: record.updatedAt,
        })),
    };
  }

  if (command === "add-branch") {
    const parsed = parseCommand(
      raw,
      2,
      ["--parent", "--kind", "--purpose", "--return-condition"],
      ["--source"],
    );
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    if (record.mainline.status !== "active") throw new Error("cannot add a branch to a settled mission");
    const branchId = parsed.positionals[1]!;
    if (record.branches.some((branch) => branch.id === branchId)) throw new Error(`branch already exists: ${branchId}`);
    const kind = one(parsed, "--kind") as BranchKind;
    if (!branchKinds.has(kind)) throw new Error(`invalid branch kind: ${kind}`);
    record.branches.push({
      id: validId(branchId, "branch id"),
      parent: one(parsed, "--parent", "mainline"),
      kind,
      purpose: one(parsed, "--purpose"),
      returnCondition: one(parsed, "--return-condition"),
      sources: many(parsed, "--source"),
      status: "open",
    });
    record.currentFocus = branchId;
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "status") {
    const parsed = parseCommand(raw, 1);
    return statusProjection(loadMission(missionPath(root, parsed.positionals[0]!)));
  }

  if (command === "check") {
    const parsed = parseCommand(raw, 1, [], [], ["--git", "--require-committed"]);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    const output: Record<string, unknown> = { id: record.id, valid: true };
    if (parsed.flags.has("--git")) output.git = gitState(path, parsed.flags.has("--require-committed"));
    return output;
  }

  if (command === "focus") {
    const parsed = parseCommand(raw, 2);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    const target = parsed.positionals[1]!;
    if (target !== "mainline") {
      const branch = branchById(record, target);
      if (branch.status !== "open" && branch.status !== "integrating") {
        throw new Error("focus target must be open or integrating");
      }
    }
    record.currentFocus = target;
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "suspend") {
    const parsed = parseCommand(raw, 2, ["--reactivation-signal"]);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    const branch = branchById(record, parsed.positionals[1]!);
    if (branch.status === "closed") throw new Error("cannot suspend a closed branch");
    branch.status = "suspended";
    branch.reactivationSignal = one(parsed, "--reactivation-signal");
    if (record.currentFocus === branch.id) record.currentFocus = returnFocus(record, branch);
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "resume") {
    const parsed = parseCommand(raw, 2);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    const branch = branchById(record, parsed.positionals[1]!);
    if (branch.status !== "suspended") throw new Error("only a suspended branch may resume");
    branch.status = "open";
    delete branch.reactivationSignal;
    record.currentFocus = branch.id;
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "settle") {
    const parsed = parseCommand(raw, 2, ["--disposition", "--mainline-delta"]);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    const branch = branchById(record, parsed.positionals[1]!);
    if (branch.status === "closed") throw new Error("branch is already closed");
    if (record.branches.some((candidate) =>
      (candidate.parent ?? "mainline") === branch.id && candidate.status !== "closed")) {
      throw new Error("settle child branches before settling their parent");
    }
    const disposition = one(parsed, "--disposition") as Disposition;
    if (!dispositions.has(disposition)) throw new Error(`invalid disposition: ${disposition}`);
    branch.status = "closed";
    branch.disposition = disposition;
    branch.mainlineDelta = one(parsed, "--mainline-delta");
    delete branch.reactivationSignal;
    if (record.currentFocus === branch.id) record.currentFocus = returnFocus(record, branch);
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "close") {
    const parsed = parseCommand(raw, 1, [], ["--closure-source"]);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    if (record.executionProposal !== undefined) {
      throw new Error("cannot settle a mission while executionProposal awaits Principal authorization");
    }
    if (record.branches.some((branch) => branch.status !== "closed")) {
      throw new Error("close or resume every branch before settling the mission");
    }
    record.mainline.status = "settled";
    record.mainline.closureSources = many(parsed, "--closure-source");
    record.currentFocus = "mainline";
    record.updatedAt = now();
    saveMission(path, record);
    return;
  }

  if (command === "prune") {
    const parsed = parseCommand(raw, 1);
    const path = missionPath(root, parsed.positionals[0]!);
    const record = loadMission(path);
    if (record.executionProposal !== undefined) {
      throw new Error("cannot prune a mission while executionProposal awaits Principal authorization");
    }
    if (record.mainline.status !== "settled") throw new Error("only a settled mission may be pruned");
    gitState(path, true);
    rmSync(path);
    return path;
  }

  throw new ParseUsageError(`unknown mission command: ${command}`);
}
