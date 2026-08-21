import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  SetupReceiptSchema,
  SetupSelectionSchema,
  type SetupReceipt,
  type SetupSelection,
  type SetupSelectionEntry,
} from "./contracts";
import { loadJson, resolveHome, saveJson } from "./home";
import { runCommand } from "./process";
import { setupAdapter } from "./setup-adapters";
import { multiAgentDelegationModule } from "./setup-modules";

const supportedSelection: SetupSelectionEntry = {
  module: "multi-agent-delegation",
  harness: "codex",
};
const changelogModule = multiAgentDelegationModule.changelogPrefix;

export interface SetupOptions {
  targetRoot?: string;
}

export interface SetupModuleStatus {
  module: SetupSelectionEntry["module"];
  harness: SetupSelectionEntry["harness"];
  status: "current" | "update-available" | "drifted" | "conflict" | "missing" | "baseline-unavailable";
  sourceRevision: string;
  appliedRevision: string | null;
  projectionPath: string;
  applicableChanges: string[];
}

export interface SetupStatus {
  version: "rosso.setup-status.v1";
  sourceRevision: string;
  modules: SetupModuleStatus[];
}

export function selectSetupModules(homeArgument: string | undefined, requested: string[]): SetupSelection {
  const home = resolveHome(homeArgument);
  const path = join(home, "config", "setup.json");
  const current = loadJson(path, SetupSelectionSchema);
  const selections = [...current.selections];
  for (const value of requested) {
    const parsed = parseSelection(value);
    if (!selections.some((entry) => entry.module === parsed.module && entry.harness === parsed.harness)) {
      selections.push(parsed);
    }
  }
  const next: SetupSelection = { version: "rosso.setup-selection.v1", selections };
  saveJson(path, next);
  return next;
}

export function setupStatus(homeArgument?: string, options: SetupOptions = {}): SetupStatus {
  const home = resolveHome(homeArgument);
  const sourceRoot = resolveSourceRoot();
  assertSetupSourceClean(sourceRoot);
  const sourceRevision = gitOutput(sourceRoot, ["rev-parse", "HEAD"], "resolve setup source revision");
  const selection = loadJson(join(home, "config", "setup.json"), SetupSelectionSchema);
  return {
    version: "rosso.setup-status.v1",
    sourceRevision,
    modules: selection.selections.map((entry) =>
      moduleStatus(home, entry, sourceRoot, sourceRevision, options.targetRoot)
    ),
  };
}

export function applySetup(homeArgument?: string, options: SetupOptions = {}): SetupStatus {
  const home = resolveHome(homeArgument);
  const sourceRoot = resolveSourceRoot();
  assertSetupSourceClean(sourceRoot);
  const sourceRevision = gitOutput(sourceRoot, ["rev-parse", "HEAD"], "resolve setup source revision");
  const selection = loadJson(join(home, "config", "setup.json"), SetupSelectionSchema);
  for (const entry of selection.selections) {
    applyModule(home, entry, sourceRoot, sourceRevision, options.targetRoot);
  }
  return setupStatus(home, options.targetRoot ? { targetRoot: options.targetRoot } : {});
}

function parseSelection(value: string): SetupSelectionEntry {
  if (value === "multi-agent-delegation" || value === "codex:multi-agent-delegation") {
    return supportedSelection;
  }
  throw new Error(`unsupported setup module: ${value}`);
}

/**
 * The tracked paths that identify a checkout as the Rossovia setup source.
 * A candidate root is accepted only when its Git checkout tracks these
 * definitions, so an unverifiable directory is never treated as the setup
 * source.
 */
export const SETUP_SOURCE_DEFINITION_PATHS: readonly string[] = [
  "CHANGELOG.md",
  "apps/workbench/src/setup.ts",
  "apps/workbench/src/setup-adapters.ts",
  "apps/workbench/src/setup-modules.ts",
];

export interface SetupSourceResolutionOptions {
  /** The running executable path; defaults to process.argv[1]. */
  readonly executable?: string;
  /** The explicit run root; defaults to process.cwd(). */
  readonly runRoot?: string;
}

export interface SetupSourceResolution {
  readonly sourceRoot: string;
  readonly basis: "executable" | "run-root";
}

/**
 * Resolve the Rossovia setup source root. The running executable keeps
 * priority when it is a verifiable part of a setup-source checkout — the
 * source `bun` launch path. When it is not (for example a compiled binary
 * installed under ~/.local/bin), the explicit run root is used instead, but
 * only after the same verification: its Git checkout must track the setup
 * definition files. An unverifiable path is rejected, never adopted as a
 * Git source.
 */
export function resolveSetupSourceRoot(
  options: SetupSourceResolutionOptions = {},
): SetupSourceResolution {
  const executable = options.executable ?? process.argv[1];
  if (executable !== undefined) {
    const fromExecutable = sourceRootFromExecutable(resolve(executable));
    if (fromExecutable !== null) {
      return { sourceRoot: fromExecutable, basis: "executable" };
    }
  }
  const runRoot = resolve(options.runRoot ?? process.cwd());
  return { sourceRoot: sourceRootFromRunRoot(runRoot), basis: "run-root" };
}

function sourceRootFromExecutable(executable: string): string | null {
  const rootResult = runCommand("git", ["rev-parse", "--show-toplevel"], {
    cwd: dirname(executable),
  });
  if (rootResult.exitCode !== 0 || rootResult.stdout.trim().length === 0) return null;
  const sourceRoot = resolve(rootResult.stdout.trim());
  const sourceRelative = relative(sourceRoot, executable);
  if (sourceRelative.startsWith("..") || sourceRelative.length === 0) return null;
  const tracked = runCommand("git", ["ls-files", "--error-unmatch", sourceRelative], {
    cwd: sourceRoot,
    quiet: true,
  });
  if (tracked.exitCode !== 0) return null;
  return tracksSetupSourceDefinition(sourceRoot) ? sourceRoot : null;
}

function sourceRootFromRunRoot(runRoot: string): string {
  const sourceRoot = gitOutput(
    runRoot,
    ["rev-parse", "--show-toplevel"],
    "resolve setup source root from the run root",
  );
  if (!tracksSetupSourceDefinition(sourceRoot)) {
    throw new Error(
      `cannot resolve setup source: the run-root Git checkout ${sourceRoot} does not track the `
      + `Rossovia setup definition (${SETUP_SOURCE_DEFINITION_PATHS.join(", ")}); `
      + "start the installed binary from the setup source checkout",
    );
  }
  return sourceRoot;
}

function tracksSetupSourceDefinition(sourceRoot: string): boolean {
  return SETUP_SOURCE_DEFINITION_PATHS.every((path) =>
    runCommand("git", ["ls-files", "--error-unmatch", path], {
      cwd: sourceRoot,
      quiet: true,
    }).exitCode === 0,
  );
}

function resolveSourceRoot(): string {
  return resolveSetupSourceRoot().sourceRoot;
}

function receiptPath(home: string, entry: SetupSelectionEntry): string {
  return join(home, "receipts", "setup", `${entry.harness}.${entry.module}.json`);
}

function readReceipt(home: string, entry: SetupSelectionEntry): SetupReceipt | null {
  const path = receiptPath(home, entry);
  return existsSync(path) ? loadJson(path, SetupReceiptSchema) : null;
}

function moduleStatus(
  home: string,
  entry: SetupSelectionEntry,
  sourceRoot: string,
  sourceRevision: string,
  targetRoot?: string,
): SetupModuleStatus {
  const adapter = setupAdapter(entry.harness);
  const path = adapter.projectionPath(targetRoot);
  const projection = adapter.render(multiAgentDelegationModule);
  const receipt = readReceipt(home, entry);
  if (!receipt) {
    return statusResult(entry, "missing", sourceRevision, null, path, []);
  }
  if (!gitSucceeds(sourceRoot, ["cat-file", "-e", `${receipt.sourceRevision}^{commit}`])) {
    return statusResult(entry, "baseline-unavailable", sourceRevision, receipt.sourceRevision, path, []);
  }
  const changes = applicableChanges(sourceRoot, receipt.sourceRevision, sourceRevision);
  const current = readManagedBlock(path, projection.startMarker, projection.endMarker);
  const drifted = current === null || digest(current) !== receipt.projectionDigest;
  const desiredChanged = receipt.projectionDigest !== digest(projection.content);
  if (drifted) {
    return statusResult(
      entry,
      desiredChanged || changes.length > 0 ? "conflict" : "drifted",
      sourceRevision,
      receipt.sourceRevision,
      path,
      changes,
    );
  }
  return statusResult(
    entry,
    desiredChanged || changes.length > 0 ? "update-available" : "current",
    sourceRevision,
    receipt.sourceRevision,
    path,
    changes,
  );
}

function statusResult(
  entry: SetupSelectionEntry,
  status: SetupModuleStatus["status"],
  sourceRevision: string,
  appliedRevision: string | null,
  path: string,
  applicableChanges: string[],
): SetupModuleStatus {
  return {
    module: entry.module,
    harness: entry.harness,
    status,
    sourceRevision,
    appliedRevision,
    projectionPath: path,
    applicableChanges,
  };
}

function applyModule(
  home: string,
  entry: SetupSelectionEntry,
  sourceRoot: string,
  sourceRevision: string,
  targetRoot?: string,
): void {
  const adapter = setupAdapter(entry.harness);
  const path = adapter.projectionPath(targetRoot);
  const projection = adapter.render(multiAgentDelegationModule);
  const receipt = readReceipt(home, entry);
  if (receipt && !gitSucceeds(sourceRoot, ["cat-file", "-e", `${receipt.sourceRevision}^{commit}`])) {
    throw new Error(
      `setup applied baseline is unavailable: ${receipt.sourceRevision}. `
      + "Rossovia will not apply until that Git commit is available for reconciliation.",
    );
  }
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const current = readManagedBlockFromText(existing, projection.startMarker, projection.endMarker);
  if (receipt && (current === null || digest(current) !== receipt.projectionDigest)) {
    throw new Error(
      `setup projection drift requires reconciliation before apply: ${path}. `
      + "Rossovia will not overwrite a missing or locally changed managed block.",
    );
  }
  if (!receipt && current !== null) {
    throw new Error(`unreceipted Rossovia managed block already exists: ${path}`);
  }
  const projectionChanged = current === null || current !== projection.content;
  const rollbackPath = projectionChanged && existing.length > 0 ? saveRollback(home, path, existing) : null;
  if (projectionChanged) {
    const next = current === null
      ? appendManagedBlock(existing, projection.content)
      : existing.replace(current, projection.content);
    writeTarget(path, next);
  }
  const nextReceipt: SetupReceipt = {
    version: "rosso.setup-receipt.v1",
    module: entry.module,
    harness: entry.harness,
    sourceRevision,
    sourceRoot,
    projectionPath: path,
    projectionDigest: digest(projection.content),
    appliedAt: now(),
    rollbackPath,
  };
  saveJson(receiptPath(home, entry), nextReceipt);
}

function appendManagedBlock(existing: string, projection: string): string {
  const prefix = existing.length === 0 ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${prefix}${projection}\n`;
}

function readManagedBlock(path: string, startMarker: string, endMarker: string): string | null {
  return existsSync(path)
    ? readManagedBlockFromText(readFileSync(path, "utf8"), startMarker, endMarker)
    : null;
}

function readManagedBlockFromText(value: string, startMarker: string, endMarker: string): string | null {
  const starts = occurrences(value, startMarker);
  const ends = occurrences(value, endMarker);
  if (starts.length === 0 && ends.length === 0) return null;
  if (starts.length !== 1 || ends.length !== 1 || starts[0]! >= ends[0]!) {
    throw new Error("Rossovia setup projection has ambiguous managed block markers");
  }
  return value.slice(starts[0]!, ends[0]! + endMarker.length);
}

function occurrences(value: string, needle: string): number[] {
  const result: number[] = [];
  let offset = 0;
  while (true) {
    const index = value.indexOf(needle, offset);
    if (index < 0) return result;
    result.push(index);
    offset = index + needle.length;
  }
}

function applicableChanges(sourceRoot: string, from: string, to: string): string[] {
  if (from === to) return [];
  const result = runCommand("git", ["diff", "--unified=0", `${from}..${to}`, "--", "CHANGELOG.md"], {
    cwd: sourceRoot,
  });
  if (result.exitCode !== 0) {
    throw new Error(`cannot inspect setup changelog diff: ${result.stderr.trim()}`);
  }
  const added = result.stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
  const entries: string[] = [];
  let current: string[] | null = null;
  for (const line of added) {
    if (line.startsWith("##")) {
      if (current !== null) entries.push(current.join("\n").trim());
      current = line.includes(changelogModule) ? [line] : null;
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current !== null) entries.push(current.join("\n").trim());
  return entries.filter((entry) => entry.length > 0);
}

function saveRollback(home: string, target: string, content: string): string {
  const path = join(home, "receipts", "setup", "backups", `${Date.now()}-${randomUUID()}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeTarget(path: string, content: string): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, content, "utf8");
    renameSync(temporary, path);
  } catch (error: unknown) {
    try {
      rmSync(temporary, { force: true });
    } catch {
      // Preserve the original target write failure.
    }
    throw new Error(
      `cannot apply setup projection at ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function assertSetupSourceClean(sourceRoot: string): void {
  // A compiled binary installed outside the source root (for example under
  // ~/.local/bin) is not part of the checkout, so it is excluded from the
  // cleanliness check; the tracked setup definition paths always remain.
  const entry = process.argv[1];
  const sourceRelative = entry === undefined ? null : relative(sourceRoot, resolve(entry));
  const executablePath =
    sourceRelative === null || sourceRelative.startsWith("..") || sourceRelative.length === 0
      ? null
      : sourceRelative;
  const result = runCommand("git", [
    "status",
    "--porcelain",
    "--",
    "CHANGELOG.md",
    "apps/workbench/src/setup.ts",
    "apps/workbench/src/setup-adapters.ts",
    "apps/workbench/src/setup-modules.ts",
    ...(executablePath === null ? [] : [executablePath]),
  ], { cwd: sourceRoot });
  if (result.exitCode !== 0 || result.stdout.trim().length > 0) {
    throw new Error(
      "setup source has uncommitted changes; commit or restore the setup definition and changelog "
      + "before recording an applied Git revision",
    );
  }
}

function gitOutput(cwd: string, args: string[], purpose: string): string {
  const result = runCommand("git", args, { cwd });
  if (result.exitCode !== 0 || result.stdout.trim().length === 0) {
    throw new Error(`cannot ${purpose}: ${result.stderr.trim() || "empty git output"}`);
  }
  return resolveGitPathOutput(args, result.stdout.trim());
}

function resolveGitPathOutput(args: string[], value: string): string {
  return args.includes("--show-toplevel") ? resolve(value) : value;
}

function gitSucceeds(cwd: string, args: string[]): boolean {
  return runCommand("git", args, { cwd, quiet: true }).exitCode === 0;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
