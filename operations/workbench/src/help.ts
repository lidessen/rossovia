import { readFileSync } from "node:fs";
import { UsageError } from "./cli-errors";

/**
 * One shared help contract for the Workbench CLI. The top-level usage, the
 * per-family and per-verb usage text, and the `help <command-path>` resolver
 * all read this single table, so a command family needs no second parser to
 * expose help. The table is purely additive: no dispatch branch reads it.
 */

/**
 * The smallest effect classification, decided per verb from its dispatch
 * owner's source. The label describes what a success path may do; it is a
 * help-rendering fact only. No dispatch, permission, gate, or execution
 * path reads it, and it is not an authorization, a preview, or an
 * atomicity promise.
 *
 * - `read-only`: the success path writes no state and starts or controls
 *   no execution. It may run read-only observations (Git status, file
 *   reads).
 * - `writes-state`: the success path may write state — Workbench home
 *   state, session state, managed files, or Git-tracked Mission records —
 *   but it starts or controls no execution.
 * - `starts-work`: the success path may start or control an execution —
 *   launching or resuming a worker run, or returning a hook message that
 *   continues an active Agent run.
 */
export type EffectClass = "read-only" | "writes-state" | "starts-work";

export const EFFECT_CLASSES: readonly EffectClass[] = [
  "read-only",
  "writes-state",
  "starts-work",
];

export interface VerbHelp {
  kind: "verb";
  path: string[];
  usage: string;
  description: string;
  effect: EffectClass;
  topLevel: boolean;
}

export interface FamilyHelp {
  kind: "family";
  path: string[];
  summary: string;
  subcommands: string[];
  topLevel: boolean;
  notes?: string;
}

export type HelpEntry = VerbHelp | FamilyHelp;

const MISSION_ROOT_NOTE = "Default mission root: <cwd>/operations/missions, resolved to an absolute path. Pass --root <path> in exactly one of two family slots — one leading pair before the subcommand, or one final pair after all verb arguments — to override. Mission records are Git-tracked in the target repository; the Workbench --home never relocates them.";

export const HELP: HelpEntry[] = [  { kind: "verb", path: ["init"], topLevel: true,
    usage: "init [--workspace-root PATH]... [--setup MODULE]... [--target-root PATH]",
    description: "Prepare the Workbench home, verify write access on every write-bearing surface, optionally scan workspace roots, and apply selected setup modules.",
    effect: "writes-state" },
  { kind: "family", path: ["setup"], topLevel: false,
    summary: "setup <subcommand> [arguments]",
    subcommands: ["status", "apply"] },
  { kind: "verb", path: ["setup", "status"], topLevel: true,
    usage: "setup status [--target-root PATH]",
    description: "Report the applied state of the selected setup modules for the target root.",
    effect: "read-only" },
  { kind: "verb", path: ["setup", "apply"], topLevel: true,
    usage: "setup apply [--target-root PATH]",
    description: "Apply the selected setup modules to the target root.",
    effect: "writes-state" },
  { kind: "verb", path: ["migrate"], topLevel: true,
    usage: "migrate [--from-home PATH]",
    description: "Migrate a legacy home into the Rossovia Workbench home.",
    effect: "writes-state" },
  { kind: "verb", path: ["resolve"], topLevel: true,
    usage: "resolve <project>",
    description: "Resolve a project name to its verified current workspace and instruction files.",
    effect: "read-only" },
  { kind: "verb", path: ["register"], topLevel: true,
    usage: "register <path> --id <stable-id> [--alias <alias>]...",
    description: "Register a Git repository under a stable project id, with optional display aliases.",
    effect: "writes-state" },
  { kind: "verb", path: ["attach"], topLevel: true,
    usage: "attach <project> <path>",
    description: "Attach a worktree of a registered project to the local workspace.",
    effect: "writes-state" },
  { kind: "family", path: ["project"], topLevel: false,
    summary: "project <subcommand> [arguments]",
    subcommands: ["list"] },
  { kind: "verb", path: ["project", "list"], topLevel: true,
    usage: "project list",
    description: "List registered projects with availability and task-continuity status.",
    effect: "read-only" },
  { kind: "family", path: ["worker"], topLevel: false,
    summary: "worker <subcommand> [arguments]",
    subcommands: ["list"] },
  { kind: "verb", path: ["worker", "list"], topLevel: true,
    usage: "worker list",
    description: "List the host-owned worker descriptions and capabilities.",
    effect: "read-only" },
  { kind: "family", path: ["preference"], topLevel: false,
    summary: "preference <subcommand> [arguments]",
    subcommands: ["set", "list", "retire"] },
  { kind: "verb", path: ["preference", "set"], topLevel: true,
    usage: "preference set <id> --statement <text> [--project <project>] [--reopen-when <condition>]",
    description: "Remember a personal default, optionally limited to one registered project.",
    effect: "writes-state" },
  { kind: "verb", path: ["preference", "list"], topLevel: true,
    usage: "preference list [--project <project>]",
    description: "Show the applicable preferences, optionally for one registered project.",
    effect: "read-only" },
  { kind: "verb", path: ["preference", "retire"], topLevel: true,
    usage: "preference retire <id> [--project <project>]",
    description: "Forget the exact scoped preference.",
    effect: "writes-state" },
  { kind: "family", path: ["execution"], topLevel: false,
    summary: "execution <subcommand> [arguments]",
    subcommands: ["inspect", "authorize"] },
  { kind: "verb", path: ["execution", "inspect"], topLevel: true,
    usage: "execution inspect <project> <mission-id>",
    description: "Project the committed Mission execution proposal for one project and mission.",
    effect: "read-only" },
  { kind: "verb", path: ["execution", "authorize"], topLevel: true,
    usage: "execution authorize <project> <mission-id> --proposal-id <id> --proposal-digest <sha256> --choice <decision-id>=<reply-key>... --actor-ref <principal:identity> --source-ref <kind:reference>",
    description: "Create a local launch receipt after every pending decision is explicitly answered.",
    effect: "writes-state" },
  { kind: "family", path: ["task"], topLevel: false,
    summary: "task <subcommand> [arguments]",
    subcommands: ["create", "list", "show", "attempts", "reconcile-attempt", "run", "assign", "correct", "link-execution", "rebind-worktree", "submit", "append-review", "accept", "reopen"] },
  { kind: "verb", path: ["task", "create"], topLevel: true,
    usage: "task create --title <text> --objective <text> --accept <criterion>... [--todo <text>]... --next-actor <principal|agent|external> --source-ref <reference> --expected-source-revision <n> [--project <project> [--worktree <path>] [--mission <id>]]",
    description: "Create a Principal-attributed task from an explicit current request.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "list"], topLevel: true,
    usage: "task list",
    description: "List the Principal tasks in the home.",
    effect: "read-only" },
  { kind: "verb", path: ["task", "show"], topLevel: true,
    usage: "task show <id>",
    description: "Show one Principal task with its exact current state.",
    effect: "read-only" },
  { kind: "verb", path: ["task", "attempts"], topLevel: true,
    usage: "task attempts <id>",
    description: "Project one task's recorded run attempts read-only, with per-source standing.",
    effect: "read-only" },
  { kind: "verb", path: ["task", "reconcile-attempt"], topLevel: true,
    usage: "task reconcile-attempt <id> --attempt <attempt-id>",
    description: "Recover one crash-retained run attempt whose lease owner is verifiably dead.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "run"], topLevel: true,
    usage: "task run <id> --worker <worker-id> [--continue]",
    description: "Run an open project task in its exact worktree with the selected worker; --continue resumes the latest usable same-session attempt.",
    effect: "starts-work" },
  { kind: "verb", path: ["task", "assign"], topLevel: true,
    usage: "task assign <id> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>",
    description: "Set the next responsible actor for a task without launching any work.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "correct"], topLevel: true,
    usage: "task correct <id> --statement <text> --source-ref <reference> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>",
    description: "Record a correction on the task.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "link-execution"], topLevel: true,
    usage: "task link-execution <id> --authorization-id <uuid> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>",
    description: "Append a revalidated execution link as evidence, not launch authority.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "rebind-worktree"], topLevel: true,
    usage: "task rebind-worktree <id> --expected-worktree <path> --worktree <path> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>",
    description: "Rebind an unsettled task to a verified Git-clean worktree of the same registered project.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "submit"], topLevel: true,
    usage: "task submit <id> --summary <text> --evidence-ref <reference>... --source-ref <reference> --expected-source-revision <n> --expected-revision <n>",
    description: "Retain actor-supplied references as an unverified result claim.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "append-review"], topLevel: true,
    usage: "task append-review <id> --assessment-id <id> --result-claim-id <id> [--producer-attempt-id <id>] --reviewer-ref <reference> --independence-basis <independent-review-context|unproven> --independence-source-ref <reference> --candidate-commit <40-hex> --verdict <passed|failed> --finding <text>... --evidence-ref <reference>... --expected-source-revision <n> --expected-revision <n>",
    description: "Append a structured independent assessment against the exact current result claim.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "accept"], topLevel: true,
    usage: "task accept <id> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>",
    description: "Settle the task with an explicit, locally Principal-attributed acceptance.",
    effect: "writes-state" },
  { kind: "verb", path: ["task", "reopen"], topLevel: true,
    usage: "task reopen <id> --statement <text> --source-ref <reference> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>",
    description: "Reopen a settled task before new work.",
    effect: "writes-state" },
  { kind: "family", path: ["contribution"], topLevel: false,
    summary: "contribution <subcommand> [arguments]",
    subcommands: ["reconcile-lease"] },
  { kind: "verb", path: ["contribution", "reconcile-lease"], topLevel: true,
    usage: "contribution reconcile-lease <conversation-id> <batch-id> <key>",
    description: "Recover one retained contribution lease with its conversation, batch, and key.",
    effect: "writes-state" },
  { kind: "family", path: ["mission"], topLevel: true,
    summary: "mission [--root <path>] <init|add-branch|focus|suspend|resume|settle|check|status|list|close|prune> ...",
    subcommands: ["init", "list", "add-branch", "status", "check", "focus", "suspend", "resume", "settle", "close", "prune"],
    notes: `${MISSION_ROOT_NOTE} Every successful mission command prints one JSON object on stdout; mutating verbs print a receipt naming the action, mission, root, record path, and resulting state.` },
  { kind: "verb", path: ["mission", "init"], topLevel: false,
    usage: "mission [--root <path>] init <id> --title <text> --mainline <contradiction> --accept <criterion>... --source <reference>...",
    description: `Create a Mission Record under the mission root and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "list"], topLevel: false,
    usage: "mission [--root <path>] list",
    description: `Project the active Mission Records under the mission root. ${MISSION_ROOT_NOTE}`,
    effect: "read-only" },
  { kind: "verb", path: ["mission", "add-branch"], topLevel: false,
    usage: "mission [--root <path>] add-branch <mission-id> <branch-id> [--parent <branch|mainline>] --kind <implementation|investigation|review|correction> --purpose <text> --return-condition <text> --source <reference>...",
    description: `Add a branch to an active mission, focus it, and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "status"], topLevel: false,
    usage: "mission [--root <path>] status <mission-id>",
    description: `Project one mission's focus and open branches. ${MISSION_ROOT_NOTE}`,
    effect: "read-only" },
  { kind: "verb", path: ["mission", "check"], topLevel: false,
    usage: "mission [--root <path>] check <mission-id> [--git] [--require-committed]",
    description: `Validate a mission record; --git checks its Git tracking. ${MISSION_ROOT_NOTE}`,
    effect: "read-only" },
  { kind: "verb", path: ["mission", "focus"], topLevel: false,
    usage: "mission [--root <path>] focus <mission-id> <branch-id|mainline>",
    description: `Set the mission's current focus to an open or integrating branch or to mainline and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "suspend"], topLevel: false,
    usage: "mission [--root <path>] suspend <mission-id> <branch-id> --reactivation-signal <text>",
    description: `Suspend an open branch with a reactivation signal and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "resume"], topLevel: false,
    usage: "mission [--root <path>] resume <mission-id> <branch-id>",
    description: `Resume a suspended branch and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "settle"], topLevel: false,
    usage: "mission [--root <path>] settle <mission-id> <branch-id> --disposition <integrate|no-change|abandon> --mainline-delta <text>",
    description: `Close a branch with a disposition and a mainline delta and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "close"], topLevel: false,
    usage: "mission [--root <path>] close <mission-id> --closure-source <reference>...",
    description: `Settle the mission mainline with closure sources and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "verb", path: ["mission", "prune"], topLevel: false,
    usage: "mission [--root <path>] prune <mission-id>",
    description: `Delete a settled, committed mission record and print a JSON receipt. ${MISSION_ROOT_NOTE}`,
    effect: "writes-state" },
  { kind: "family", path: ["intervention"], topLevel: false,
    summary: "intervention <subcommand> [arguments]",
    subcommands: ["observe", "status"] },
  { kind: "verb", path: ["intervention", "observe"], topLevel: true,
    usage: "intervention observe [--state-root <path>]",
    description: "Record one intervention observation; reads a JSON payload from stdin.",
    effect: "writes-state" },
  { kind: "verb", path: ["intervention", "status"], topLevel: true,
    usage: "intervention status (--state-file <path> | --session-id <id> [--state-root <path>])",
    description: "Project the observations and receipts for one intervention state.",
    effect: "read-only" },
  { kind: "verb", path: ["correct"], topLevel: true,
    usage: "correct --state-file <path> --rejected-assumption <text> --new-invariant <text> --affected-surface <name>... --next-probe <text>",
    description: "Record a correction receipt into an intervention state file.",
    effect: "writes-state" },
  { kind: "family", path: ["hook"], topLevel: true,
    summary: "hook <intervention|artifact> <codex|claude|cursor> [post-tool-use|after-file-edit|stop]",
    subcommands: ["intervention", "artifact"] },
  { kind: "verb", path: ["hook", "intervention"], topLevel: false,
    usage: "hook intervention <codex|claude>",
    description: "Run the intervention hook for codex or claude; reads a JSON payload from stdin.",
    effect: "writes-state" },
  { kind: "verb", path: ["hook", "artifact"], topLevel: false,
    usage: "hook artifact <codex|claude|cursor> <post-tool-use|after-file-edit|stop>",
    description: "Run the artifact-consistency hook; reads a JSON payload from stdin.",
    effect: "starts-work" },
  { kind: "verb", path: ["statusline"], topLevel: true,
    usage: "statusline [claude] [--cwd <path>]",
    description: "Render the host session or registered-project label for a status line.",
    effect: "read-only" },
  { kind: "family", path: ["root"], topLevel: false,
    summary: "root <subcommand> [arguments]",
    subcommands: ["list", "add"] },
  { kind: "verb", path: ["root", "list"], topLevel: true,
    usage: "root list",
    description: "List the configured workspace roots.",
    effect: "read-only" },
  { kind: "verb", path: ["root", "add"], topLevel: true,
    usage: "root add <path>...",
    description: "Add workspace roots and rescan the bounded discovery.",
    effect: "writes-state" },
  { kind: "verb", path: ["scan"], topLevel: true,
    usage: "scan",
    description: "Rescan the configured roots and rebuild the workspace index.",
    effect: "writes-state" },
  { kind: "verb", path: ["help"], topLevel: false,
    usage: "help [<command-path>...]",
    description: "Print the usage of one command path, or the whole CLI when no path is given.",
    effect: "read-only" },
];

export function topLevelUsage(): string {
  const lines = [
    "usage: rossovia [--home PATH] <command>",
    "",
    "effect labels describe what a success path may do — not authorization, preview, or atomicity:",
    "  read-only     no state writes, no work start/control",
    "  writes-state  may write Workbench home, session, managed, or Mission state",
    "  starts-work   may start or control an execution",
    "",
    "commands:",
    ...HELP.filter((entry) => entry.topLevel)
      .map((entry) => `  ${entry.kind === "family" ? entry.summary : entry.usage} (${effectLabel(entry)})`),
    "",
    "run 'rossovia help <command>' for per-command usage; (mixed) families list each subcommand's effect there",
    "rossovia --version prints the @rosso/workbench package version (read-only)",
    "",
  ];
  return lines.join("\n");
}

function effectLabel(entry: HelpEntry): string {
  return entry.kind === "verb" ? entry.effect : familyEffect(entry);
}

/**
 * The subcommand verbs of one family: the verb entries one level below the
 * family path. A family's effect label is derived from them at render time,
 * so a family can never disagree with its own verbs.
 */
export function familyVerbs(entry: FamilyHelp): VerbHelp[] {
  const key = entry.path.join(" ");
  return HELP.filter(
    (candidate): candidate is VerbHelp =>
      candidate.kind === "verb"
      && candidate.path.length === entry.path.length + 1
      && candidate.path.slice(0, entry.path.length).join(" ") === key,
  );
}

/**
 * `read-only` or `writes-state` when every subcommand verb shares that
 * effect, `mixed` otherwise. `starts-work` alone is impossible today but is
 * preserved for a future single-verb family.
 */
export function familyEffect(entry: FamilyHelp): EffectClass | "mixed" {
  const verbs = familyVerbs(entry);
  const effects = new Set(verbs.map((verb) => verb.effect));
  if (effects.size === 0) return "mixed";
  if (effects.size === 1) return verbs[0]!.effect;
  return "mixed";
}

function familyUsage(entry: FamilyHelp): string {
  const label = entry.path.join(" ");
  const effect = familyEffect(entry);
  const lines = [
    `usage: rossovia ${entry.summary}`,
    effect === "mixed"
      ? "effect: mixed — each subcommand's effect is shown below"
      : `effect: ${effect}`,
    "",
    `${entry.path[0]} subcommands:`,
    ...wrapped(
      familyVerbs(entry).map((verb) => `${verb.path.at(-1)!} (${verb.effect})`),
      96,
    ).map((line) => `  ${line}`),
    "",
    `run 'rossovia help ${label} <subcommand>' for the full usage of one subcommand`,
    ...(entry.notes === undefined ? [] : ["", entry.notes]),
    "",
  ];
  return lines.join("\n");
}

function verbUsage(entry: VerbHelp): string {
  const lines = [
    `usage: rossovia ${entry.usage}`,
    `effect: ${entry.effect}`,
    "",
    entry.description,
    "",
  ];
  return lines.join("\n");
}

function wrapped(items: string[], width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const item of items) {
    const next = current === "" ? item : `${current}, ${item}`;
    if (current !== "" && next.length > width) {
      lines.push(current);
      current = item;
    } else {
      current = next;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

export function usageForPath(path: string[]): string | undefined {
  if (path.length === 0) return topLevelUsage();
  const key = path.join(" ");
  const entry = HELP.find((candidate) => candidate.path.join(" ") === key);
  if (entry === undefined) return undefined;
  return entry.kind === "family" ? familyUsage(entry) : verbUsage(entry);
}

/**
 * The nearest help path present in the usage table: the longest prefix of
 * `path` with a usage entry, or the empty top-level path. Structural prefix
 * resolution only; it never inspects error messages.
 */
export function nearestHelpPath(path: string[]): string[] {
  for (let length = path.length; length >= 1; length -= 1) {
    const candidate = path.slice(0, length);
    if (usageForPath(candidate) !== undefined) return candidate;
  }
  return [];
}

/**
 * Resolve a help request from raw CLI arguments. Returns the usage text to
 * print and exit 0, or undefined when the invocation is not a help request
 * and must proceed through the normal dispatch. A trailing `--help`/`-h` on
 * a known command path and the `help <command-path>` spelling are help
 * requests; a trailing `--help`/`-h` on an unknown path falls through so the
 * dispatch keeps its original error. An unknown path given to `help`
 * itself is an error here.
 */
export function helpForInvocation(args: string[]): string | undefined {
  if (args[0] === "help") {
    let target = args.slice(1);
    const tail = target[target.length - 1];
    if (tail === "--help" || tail === "-h") target = target.slice(0, -1);
    target = stripMissionRoot(target);
    const usage = usageForPath(target);
    if (usage === undefined) {
      throw new UsageError(
        `unknown help path: ${target.join(" ") || "(top level)"}`,
        nearestHelpPath(target),
      );
    }
    return usage;
  }
  const last = args[args.length - 1];
  if (last === "--help" || last === "-h") {
    return usageForPath(stripMissionRoot(args.slice(0, -1)));
  }
  return undefined;
}

/**
 * The composable mission grammar permits `--root <path>` in exactly one of
 * two family slots — one leading pair after `mission`, or one final pair
 * after all verb arguments. Help-path resolution ignores only those slots;
 * every other `--root` token belongs to the verb's own arguments.
 */
function stripMissionRoot(path: string[]): string[] {
  if (path[0] !== "mission") return path;
  const filtered = [...path];
  if (filtered[1] === "--root") {
    filtered.splice(1, filtered.length >= 3 ? 2 : 1);
  }
  if (filtered.length >= 2 && filtered[filtered.length - 2] === "--root") {
    filtered.splice(filtered.length - 2, 2);
  }
  return filtered;
}

let cachedVersion: string | undefined;

export function packageVersion(): string {
  if (cachedVersion === undefined) {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { name?: unknown; version?: unknown };
    if (typeof manifest.version !== "string" || manifest.version.length === 0) {
      throw new Error("package.json has no version");
    }
    cachedVersion = manifest.version;
  }
  return cachedVersion;
}

export function packageVersionLabel(): string {
  return `@rosso/workbench ${packageVersion()}`;
}
