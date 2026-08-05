#!/usr/bin/env node

import { attachWorkspace } from "./attach";
import { authorizeExecution, inspectExecution } from "./execution-authorization";
import { initializeHome, loadHome } from "./home";
import { runHookCommand } from "./hooks";
import { runCorrectionCommand, runInterventionCommand } from "./interventions";
import { createLocalTaskControlPlane } from "./local-task-control-plane";
import { migrateLegacyHome } from "./migration";
import { runMissionCommand } from "./missions";
import { listPreferences, retirePreference, setPreference } from "./preferences";
import { listProjects } from "./projects";
import { registerProject } from "./register";
import { resolveProject } from "./resolve";
import { addRoots, scanRoots } from "./roots";
import { applySetup, selectSetupModules, setupStatus } from "./setup";
import {
  renderStatusLine,
  statusLineHostContext,
  statusLineInput,
  statusLineProjection,
} from "./statusline";

try {
  const { args, home } = extractHome(process.argv.slice(2));
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    printUsage();
  } else if (args[0] === "resolve" && args.length === 2) {
    console.log(JSON.stringify(resolveProject(home, args[1]!), null, 2));
  } else if (args[0] === "project" && args[1] === "list" && args.length === 2) {
    const result = listProjects(home);
    console.log(JSON.stringify(result, null, 2));
    if (!result.complete) process.exitCode = 2;
  } else if (args[0] === "init") {
    const options = parseInit(args.slice(1));
    const initialized = initializeHome(home);
    const roots = options.workspaceRoots.length > 0
      ? addRoots(initialized.home, initialized.roots, options.workspaceRoots)
      : initialized.roots;
    const index = options.workspaceRoots.length > 0
      ? scanRoots(initialized.home, roots)
      : initialized.index;
    if (options.setup.length > 0) {
      selectSetupModules(initialized.home, options.setup);
      applySetup(initialized.home, {
        ...(options.targetRoot ? { targetRoot: options.targetRoot } : {}),
      });
    }
    console.log(JSON.stringify({
      home: initialized.home,
      initialized: true,
      writeAccess: initialized.writeAccess,
      workspaceRoots: roots.roots,
      indexedWorkspaces: index.entries.length,
      ...(options.setup.length > 0
        ? { setup: setupStatus(initialized.home, {
            ...(options.targetRoot ? { targetRoot: options.targetRoot } : {}),
          }) }
        : {}),
    }, null, 2));
  } else if (args[0] === "setup" && args[1] === "status") {
    console.log(JSON.stringify(setupStatus(home, parseSetupOptions(args.slice(2))), null, 2));
  } else if (args[0] === "setup" && args[1] === "apply") {
    console.log(JSON.stringify(applySetup(home, parseSetupOptions(args.slice(2))), null, 2));
  } else if (args[0] === "migrate") {
    console.log(JSON.stringify(migrateLegacyHome(home, optionalFromHome(args.slice(1))), null, 2));
  } else if (args[0] === "root" && args[1] === "list" && args.length === 2) {
    console.log(JSON.stringify(loadHome(home).roots, null, 2));
  } else if (args[0] === "root" && args[1] === "add" && args.length > 2) {
    const current = loadHome(home);
    const roots = addRoots(current.home, current.roots, args.slice(2));
    const index = scanRoots(current.home, roots);
    console.log(JSON.stringify({
      workspaceRoots: roots.roots,
      indexedWorkspaces: index.entries.length,
    }, null, 2));
  } else if (args[0] === "scan" && args.length === 1) {
    const current = loadHome(home);
    const index = scanRoots(current.home, current.roots);
    console.log(JSON.stringify({
      indexedWorkspaces: index.entries.length,
      index: `${current.home}/cache/workspaces.json`,
    }, null, 2));
  } else if (args[0] === "register") {
    console.log(JSON.stringify(registerProject(home, parseRegister(args.slice(1))), null, 2));
  } else if (args[0] === "attach" && args.length === 3) {
    console.log(JSON.stringify(attachWorkspace(home, args[1]!, args[2]!), null, 2));
  } else if (args[0] === "preference" && args[1] === "set") {
    console.log(JSON.stringify(setPreference(home, parsePreferenceSet(args.slice(2))), null, 2));
  } else if (args[0] === "preference" && args[1] === "list") {
    console.log(JSON.stringify(listPreferences(home, optionalProject(args.slice(2))), null, 2));
  } else if (args[0] === "preference" && args[1] === "retire") {
    console.log(JSON.stringify(retirePreference(home, parsePreferenceRetire(args.slice(2))), null, 2));
  } else if (args[0] === "execution" && args[1] === "inspect" && args.length === 4) {
    console.log(JSON.stringify(inspectExecution(home, args[2]!, args[3]!), null, 2));
  } else if (args[0] === "execution" && args[1] === "authorize") {
    console.log(JSON.stringify(authorizeExecution(home, parseExecutionAuthorize(args.slice(2))), null, 2));
  } else if (args[0] === "task") {
    console.log(JSON.stringify(runTaskCli(home, args.slice(1)), null, 2));
  } else if (args[0] === "mission") {
    const result = runMissionCommand(args.slice(1));
    if (result !== undefined) {
      console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    }
  } else if (args[0] === "intervention") {
    console.log(JSON.stringify(runInterventionCommand(args.slice(1), "", home), null, 2));
  } else if (args[0] === "correct") {
    console.log(JSON.stringify(runCorrectionCommand(args.slice(1)), null, 2));
  } else if (args[0] === "hook") {
    const result = runHookCommand(args.slice(1), "", home);
    if (result !== undefined) console.log(JSON.stringify(result));
  } else if (args[0] === "statusline") {
    const options = parseStatusLineOptions(args.slice(1));
    const input = statusLineInput(process.stdin.isTTY);
    const host = statusLineHostContext(input, options.cwd);
    console.log(renderStatusLine(statusLineProjection(home, host.cwd, host.projectName)));
  } else {
    throw new Error("invalid command; run rossovia --help");
  }
} catch (error: unknown) {
  console.error(`rosso: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}

function printUsage(): void {
  console.log("usage: rossovia [--home PATH] <command>");
  console.log("");
  console.log("commands:");
  console.log("  init [--workspace-root PATH]... [--setup MODULE]... [--target-root PATH]");
  console.log("  setup status [--target-root PATH]");
  console.log("  setup apply [--target-root PATH]");
  console.log("  migrate [--from-home PATH]");
  console.log("  resolve <project>");
  console.log("  register <path> --id <stable-id> [--alias <alias>]...");
  console.log("  attach <project> <path>");
  console.log("  project list");
  console.log("  preference set <id> --statement <text> [--project <project>] [--reopen-when <condition>]");
  console.log("  preference list [--project <project>]");
  console.log("  preference retire <id> [--project <project>]");
  console.log("  execution inspect <project> <mission-id>");
  console.log("  execution authorize <project> <mission-id> --proposal-id <id> --proposal-digest <sha256> --choice <decision-id>=<reply-key>... --actor-ref <principal:identity> --source-ref <kind:reference>");
  console.log("  task create --title <text> --objective <text> --accept <criterion>... --next-actor <principal|agent|external> --source-ref <reference> --expected-source-revision <n> [--project <project> [--worktree <path>] [--mission <id>]]");
  console.log("  task list");
  console.log("  task show <id>");
  console.log("  task assign <id> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task correct <id> --statement <text> --source-ref <reference> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task link-execution <id> --authorization-id <uuid> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task rebind-worktree <id> --expected-worktree <path> --worktree <path> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task submit <id> --summary <text> --evidence-ref <reference>... --source-ref <reference> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task accept <id> --source-ref <reference> --expected-source-revision <n> --expected-revision <n>");
  console.log("  task reopen <id> --statement <text> --source-ref <reference> --next-actor <principal|agent|external> --expected-source-revision <n> --expected-revision <n>");
  console.log("  mission [--root <path>] <init|add-branch|focus|suspend|resume|settle|check|status|list|close|prune> ...");
  console.log("  intervention observe [--state-root <path>]");
  console.log("  intervention status (--state-file <path> | --session-id <id> [--state-root <path>])");
  console.log("  correct --state-file <path> --rejected-assumption <text> --new-invariant <text> --affected-surface <name>... --next-probe <text>");
  console.log("  hook <intervention|artifact> <codex|claude|cursor> [post-tool-use|after-file-edit|stop]");
  console.log("  statusline [claude] [--cwd <path>]");
  console.log("  root list");
  console.log("  root add <path>...");
  console.log("  scan");
}

function parseStatusLineOptions(raw: string[]): { cwd?: string } {
  const args = raw[0] === "claude" ? raw.slice(1) : raw;
  if (args.length === 0) return {};
  if (args.length === 2 && args[0] === "--cwd" && args[1]?.trim()) return { cwd: args[1] };
  throw new Error("statusline accepts optional 'claude' and --cwd <path>");
}

function runTaskCli(home: string | undefined, raw: string[]): unknown {
  const controlPlane = createLocalTaskControlPlane(home);
  const command = raw[0];
  if (!command) throw new Error("task requires a subcommand");
  if (command === "list") {
    if (raw.length !== 1) throw new Error("task list accepts no arguments");
    return controlPlane.list();
  }
  if (command === "show") {
    if (raw.length !== 2) throw new Error("task show requires exactly one task id");
    return controlPlane.show(raw[1]!);
  }
  if (command === "create") {
    const parsed = parseTaskOptions(
      raw.slice(1),
      0,
      new Set([
        "--title",
        "--objective",
        "--next-actor",
        "--source-ref",
        "--expected-source-revision",
        "--project",
        "--worktree",
        "--mission",
      ]),
      new Set(["--accept"]),
    );
    return controlPlane.execute({
      kind: "create",
      arguments: {
        title: taskOption(parsed, "--title"),
        objective: taskOption(parsed, "--objective"),
        acceptance: taskOptions(parsed, "--accept"),
        nextActor: taskActor(parsed),
        sourceRef: taskOption(parsed, "--source-ref"),
        expectedSourceRevision: taskRevision(parsed, "--expected-source-revision", true),
        ...(parsed.values.has("--project") ? { project: taskOption(parsed, "--project") } : {}),
        ...(parsed.values.has("--worktree") ? { worktree: taskOption(parsed, "--worktree") } : {}),
        ...(parsed.values.has("--mission") ? { mission: taskOption(parsed, "--mission") } : {}),
      },
    });
  }

  const parsed = parseTaskOptions(
    raw.slice(1),
    1,
    new Set([
      "--next-actor",
      "--statement",
      "--summary",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
      "--authorization-id",
      "--expected-worktree",
      "--worktree",
    ]),
    new Set(["--evidence-ref"]),
  );
  const expectation = {
    id: parsed.positionals[0]!,
    expectedSourceRevision: taskRevision(parsed, "--expected-source-revision", true),
    expectedRevision: taskRevision(parsed, "--expected-revision", false),
  };
  if (command === "assign") {
    assertTaskOptions(parsed, new Set([
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "assign",
      arguments: {
        ...expectation,
        nextActor: taskActor(parsed),
      },
    });
  }
  if (command === "correct") {
    assertTaskOptions(parsed, new Set([
      "--statement",
      "--source-ref",
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "correct",
      arguments: {
        ...expectation,
        statement: taskOption(parsed, "--statement"),
        sourceRef: taskOption(parsed, "--source-ref"),
        nextActor: taskActor(parsed),
      },
    });
  }
  if (command === "link-execution") {
    assertTaskOptions(parsed, new Set([
      "--authorization-id",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "link-execution",
      arguments: {
        ...expectation,
        authorizationId: taskOption(parsed, "--authorization-id"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "rebind-worktree") {
    assertTaskOptions(parsed, new Set([
      "--expected-worktree",
      "--worktree",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "rebind-worktree",
      arguments: {
        ...expectation,
        expectedWorktreePath: taskOption(parsed, "--expected-worktree"),
        worktree: taskOption(parsed, "--worktree"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "submit") {
    assertTaskOptions(parsed, new Set([
      "--summary",
      "--evidence-ref",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "submit",
      arguments: {
        ...expectation,
        summary: taskOption(parsed, "--summary"),
        evidenceRefs: taskOptions(parsed, "--evidence-ref"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "accept") {
    assertTaskOptions(parsed, new Set([
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "accept",
      arguments: {
        ...expectation,
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "reopen") {
    assertTaskOptions(parsed, new Set([
      "--statement",
      "--source-ref",
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "reopen",
      arguments: {
        ...expectation,
        statement: taskOption(parsed, "--statement"),
        sourceRef: taskOption(parsed, "--source-ref"),
        nextActor: taskActor(parsed),
      },
    });
  }
  throw new Error(`unknown task command: ${command}`);
}

interface ParsedTaskOptions {
  positionals: string[];
  values: Map<string, string[]>;
}

function parseTaskOptions(
  raw: string[],
  positionalCount: number,
  singles: ReadonlySet<string>,
  repeated: ReadonlySet<string>,
): ParsedTaskOptions {
  const positionals = raw.slice(0, positionalCount);
  if (positionals.length !== positionalCount || positionals.some((value) => value.startsWith("--"))) {
    throw new Error("missing required task command argument");
  }
  const values = new Map<string, string[]>();
  for (let index = positionalCount; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (
      !option
      || (!singles.has(option) && !repeated.has(option))
      || !value
      || value.startsWith("--")
      || (singles.has(option) && values.has(option))
    ) {
      throw new Error(`invalid task option sequence: ${raw.join(" ")}`);
    }
    values.set(option, [...(values.get(option) ?? []), value]);
  }
  return { positionals, values };
}

function assertTaskOptions(parsed: ParsedTaskOptions, allowed: ReadonlySet<string>): void {
  for (const option of parsed.values.keys()) {
    if (!allowed.has(option)) throw new Error(`invalid task option: ${option}`);
  }
}

function taskOption(parsed: ParsedTaskOptions, option: string): string {
  const value = parsed.values.get(option)?.[0];
  if (!value) throw new Error(`task command requires ${option} <value>`);
  return value;
}

function taskOptions(parsed: ParsedTaskOptions, option: string): string[] {
  const values = parsed.values.get(option);
  if (!values?.length) throw new Error(`task command requires ${option} <value>`);
  return values;
}

function taskRevision(
  parsed: ParsedTaskOptions,
  option: string,
  allowZero: boolean,
): number {
  const raw = taskOption(parsed, option);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${option} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
  }
  return value;
}

function taskActor(
  parsed: ParsedTaskOptions,
): "principal" | "agent" | "external" {
  const value = taskOption(parsed, "--next-actor");
  if (value !== "principal" && value !== "agent" && value !== "external") {
    throw new Error("--next-actor must be principal, agent, or external");
  }
  return value;
}

function optionalFromHome(raw: string[]): string | undefined {
  const options = namedOptions(raw, new Set(["--from-home"]));
  return options.get("--from-home");
}

function parsePreferenceSet(raw: string[]): {
  id: string;
  statement: string;
  project?: string;
  reopenWhen?: string;
} {
  const id = positionalHead(raw, "preference set");
  const options = namedOptions(raw.slice(1), new Set(["--statement", "--project", "--reopen-when"]));
  const statement = options.get("--statement");
  if (!statement) throw new Error("preference set requires --statement <text>");
  return {
    id,
    statement,
    ...(options.has("--project") ? { project: options.get("--project")! } : {}),
    ...(options.has("--reopen-when") ? { reopenWhen: options.get("--reopen-when")! } : {}),
  };
}

function parsePreferenceRetire(raw: string[]): { id: string; project?: string } {
  const id = positionalHead(raw, "preference retire");
  const options = namedOptions(raw.slice(1), new Set(["--project"]));
  return { id, ...(options.has("--project") ? { project: options.get("--project")! } : {}) };
}

function optionalProject(raw: string[]): string | undefined {
  const options = namedOptions(raw, new Set(["--project"]));
  return options.get("--project");
}

function parseExecutionAuthorize(raw: string[]): {
  project: string;
  missionId: string;
  proposalId: string;
  proposalDigest: string;
  choices: string[];
  actorRef: string;
  sourceRef: string;
} {
  const project = raw[0];
  const missionId = raw[1];
  if (!project || project.startsWith("--") || !missionId || missionId.startsWith("--")) {
    throw new Error("execution authorize requires <project> <mission-id>");
  }
  const choices: string[] = [];
  const singles = new Map<string, string>();
  const allowedSingles = new Set(["--proposal-id", "--proposal-digest", "--actor-ref", "--source-ref"]);
  for (let index = 2; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !value || value.startsWith("--")) {
      throw new Error(`invalid execution authorize option sequence: ${raw.join(" ")}`);
    }
    if (option === "--choice") choices.push(value);
    else if (allowedSingles.has(option) && !singles.has(option)) singles.set(option, value);
    else throw new Error(`invalid execution authorize option sequence: ${raw.join(" ")}`);
  }
  const required = (option: string): string => {
    const value = singles.get(option);
    if (!value) throw new Error(`execution authorize requires ${option} <value>`);
    return value;
  };
  return {
    project,
    missionId,
    proposalId: required("--proposal-id"),
    proposalDigest: required("--proposal-digest"),
    choices,
    actorRef: required("--actor-ref"),
    sourceRef: required("--source-ref"),
  };
}

function positionalHead(raw: string[], command: string): string {
  const value = raw[0];
  if (!value || value.startsWith("--")) throw new Error(`${command} requires an id`);
  return value;
}

function namedOptions(raw: string[], allowed: Set<string>): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !allowed.has(option) || !value || value.startsWith("--") || result.has(option)) {
      throw new Error(`invalid option sequence: ${raw.join(" ")}`);
    }
    result.set(option, value);
  }
  return result;
}

function parseRegister(raw: string[]): { path: string; id: string; aliases: string[] } {
  let path: string | undefined;
  let id: string | undefined;
  const aliases: string[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const argument = raw[index]!;
    if (argument === "--id" || argument === "--alias") {
      const value = raw[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === "--id") id = value;
      else aliases.push(value);
      index += 1;
    } else if (argument.startsWith("--") || path !== undefined) {
      throw new Error(`invalid register argument: ${argument}`);
    } else {
      path = argument;
    }
  }
  if (!path || !id) throw new Error("register requires <path> and --id <stable-id>");
  return { path, id, aliases };
}

function repeatedOption(raw: string[], option: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== option || !raw[index + 1]) {
      throw new Error(`${option} requires a path and may be repeated`);
    }
    values.push(raw[index + 1]!);
    index += 1;
  }
  return values;
}

function parseInit(raw: string[]): {
  workspaceRoots: string[];
  setup: string[];
  targetRoot?: string;
} {
  const workspaceRoots: string[] = [];
  const setup: string[] = [];
  let targetRoot: string | undefined;
  for (let index = 0; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !value || value.startsWith("--")) throw new Error(`invalid init option sequence: ${raw.join(" ")}`);
    if (option === "--workspace-root") workspaceRoots.push(value);
    else if (option === "--setup") setup.push(value);
    else if (option === "--target-root" && targetRoot === undefined) targetRoot = value;
    else throw new Error(`invalid init option sequence: ${raw.join(" ")}`);
  }
  return {
    workspaceRoots,
    setup,
    ...(targetRoot ? { targetRoot } : {}),
  };
}

function parseSetupOptions(raw: string[]): { targetRoot?: string } {
  const options = namedOptions(raw, new Set(["--target-root"]));
  return {
    ...(options.has("--target-root") ? { targetRoot: options.get("--target-root")! } : {}),
  };
}

function extractHome(raw: string[]): { args: string[]; home: string | undefined } {
  let home: string | undefined;
  let index = 0;
  while (raw[index] === "--home") {
    const value = raw[index + 1];
    if (!value) throw new Error("--home requires a path");
    home = value;
    index += 2;
  }
  return { args: raw.slice(index), home };
}
