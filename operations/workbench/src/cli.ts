#!/usr/bin/env bun

import { attachWorkspace } from "./attach";
import { initializeHome, loadHome } from "./home";
import { runCorrectionCommand, runInterventionCommand } from "./interventions";
import { migrateLegacyHome } from "./migration";
import { runMissionCommand } from "./missions";
import { listPreferences, retirePreference, setPreference } from "./preferences";
import { listProjects } from "./projects";
import { registerProject } from "./register";
import { resolveProject } from "./resolve";
import { addRoots, scanRoots } from "./roots";

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
    const workspaceRoots = repeatedOption(args.slice(1), "--workspace-root");
    const initialized = initializeHome(home);
    const roots = workspaceRoots.length > 0
      ? addRoots(initialized.home, initialized.roots, workspaceRoots)
      : initialized.roots;
    const index = workspaceRoots.length > 0
      ? scanRoots(initialized.home, roots)
      : initialized.index;
    console.log(JSON.stringify({
      home: initialized.home,
      initialized: true,
      writeAccess: initialized.writeAccess,
      workspaceRoots: roots.roots,
      indexedWorkspaces: index.entries.length,
    }, null, 2));
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
  } else if (args[0] === "mission") {
    const result = runMissionCommand(args.slice(1));
    if (result !== undefined) {
      console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    }
  } else if (args[0] === "intervention") {
    console.log(JSON.stringify(runInterventionCommand(args.slice(1), "", home), null, 2));
  } else if (args[0] === "correct") {
    console.log(JSON.stringify(runCorrectionCommand(args.slice(1)), null, 2));
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
  console.log("  init [--workspace-root PATH]...");
  console.log("  migrate [--from-home PATH]");
  console.log("  resolve <project>");
  console.log("  register <path> --id <stable-id> [--alias <alias>]...");
  console.log("  attach <project> <path>");
  console.log("  project list");
  console.log("  preference set <id> --statement <text> [--project <project>] [--reopen-when <condition>]");
  console.log("  preference list [--project <project>]");
  console.log("  preference retire <id> [--project <project>]");
  console.log("  mission [--root <path>] <init|add-branch|focus|suspend|resume|settle|check|status|list|close|prune> ...");
  console.log("  intervention observe [--state-root <path>]");
  console.log("  intervention status (--state-file <path> | --session-id <id> [--state-root <path>])");
  console.log("  correct --state-file <path> --rejected-assumption <text> --new-invariant <text> --affected-surface <name>... --next-probe <text>");
  console.log("  root list");
  console.log("  root add <path>...");
  console.log("  scan");
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
