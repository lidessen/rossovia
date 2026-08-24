import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runInterventionCommand } from "./interventions";

type Platform = "codex" | "claude" | "cursor";
type ArtifactEvent = "post-tool-use" | "after-file-edit" | "stop";

interface HookPayload {
  hook_event_name?: unknown;
  session_id?: unknown;
  conversation_id?: unknown;
  turn_id?: unknown;
  cwd?: unknown;
  prompt?: unknown;
  stop_hook_active?: unknown;
  loop_count?: unknown;
  tool_name?: unknown;
  tool_input?: unknown;
  file_path?: unknown;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function runHookCommand(raw: string[], stdin: string, homeArgument?: string): unknown {
  const kind = raw[0];
  const platform = platformValue(raw[1]);
  try {
    const payload = JSON.parse(stdin || readFileSync(0, "utf8")) as HookPayload;
    if (kind === "intervention") {
      if (raw.length !== 2 || platform === "cursor") {
        throw new Error("intervention hooks are supported for codex and claude");
      }
      return interventionOutput(platform, payload, homeArgument);
    }
    if (kind === "artifact") {
      const event = artifactEvent(raw[2]);
      if (raw.length !== 3) throw new Error("artifact hook requires one event");
      return artifactOutput(platform, event, payload);
    }
    throw new Error("hook requires intervention or artifact");
  } catch (error: unknown) {
    const message = `Rossovia ${kind ?? "hook"} unavailable: ${
      error instanceof Error ? error.message : String(error)
    }`;
    if (platform === "cursor") {
      process.stderr.write(`${message}\n`);
      return {};
    }
    return { systemMessage: message };
  }
}

function platformValue(value: string | undefined): Platform {
  if (value === "codex" || value === "claude" || value === "cursor") return value;
  throw new Error("hook platform must be codex, claude, or cursor");
}

function artifactEvent(value: string | undefined): ArtifactEvent {
  if (value === "post-tool-use" || value === "after-file-edit" || value === "stop") return value;
  throw new Error("artifact hook event must be post-tool-use, after-file-edit, or stop");
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required`);
  return value;
}

function sessionId(platform: Platform, payload: HookPayload): string {
  const value = platform === "cursor" ? payload.conversation_id : payload.session_id;
  return requiredString(value, platform === "cursor" ? "conversation_id" : "session_id");
}

function interventionOutput(
  platform: Exclude<Platform, "cursor">,
  payload: HookPayload,
  homeArgument?: string,
): unknown {
  const normalized = {
    session_id: `${platform}:${sessionId(platform, payload)}`,
    turn_id: typeof payload.turn_id === "string" || typeof payload.turn_id === "number"
      ? payload.turn_id
      : "unknown",
    cwd: requiredString(payload.cwd, "cwd"),
    prompt: typeof payload.prompt === "string" ? payload.prompt : "",
  };
  const observed = runInterventionCommand(
    ["observe"],
    JSON.stringify(normalized),
    homeArgument,
  ) as { statePath: string };
  const receiptEndpoint = [
    ...currentInvocation(),
    "correct",
    "--state-file",
    observed.statePath,
  ].map(shellQuote).join(" ");
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: (
        "A Principal message has arrived. Before acting on it, compare it with the active task. " +
        "Only if it revises an assumption or constraint of a still-active task—including its target, " +
        "hard boundary, concept relation, authority, or acceptance condition—" +
        "run practice-cycle continue and record one correction with the session-local `correct` command prefix " +
        "`" + receiptEndpoint + "`. Starting a new task after the prior task was completed, paused, or handed off " +
        "is not a correction. Otherwise proceed without ceremony. `correct` requires " +
        "--rejected-assumption, --new-invariant, one or more --affected-surface, and --next-probe. " +
        "This binding is advisory, not a mutation or authorization gate. If the endpoint is unavailable " +
        "or denied, do not request broader filesystem permission and do not block already-authorized work; " +
        "retain the correction in the active task and report the receipt as unresolved."
      ),
    },
  };
}

function currentInvocation(): string[] {
  const entry = process.argv[1];
  if (!entry) return [process.execPath];
  return [process.execPath, resolve(entry)];
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sessionStatePath(platform: Platform, id: string): string {
  const identity = digest(`${repositoryRoot}\0${platform}\0${id}`).slice(0, 40);
  return resolve(tmpdir(), "rossovia-hooks", "artifact-consistency", `${identity}.jsonl`);
}

function readPaths(path: string): string[] {
  if (!existsSync(path)) return [];
  const paths = new Set<string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean)) {
    const value = JSON.parse(line) as unknown;
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      throw new Error(`invalid artifact-consistency evidence: ${path}`);
    }
    for (const entry of value) paths.add(entry);
  }
  return [...paths].sort();
}

function appendPaths(path: string, paths: string[]): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(paths)}\n`, "utf8");
}

function patchPaths(command: string): string[] {
  const result: string[] = [];
  for (const line of command.split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/)
      ?? line.match(/^\*\*\* Move to: (.+)$/);
    if (match?.[1]) result.push(match[1]);
  }
  return result;
}

function rawChangedPaths(platform: Platform, event: ArtifactEvent, payload: HookPayload): string[] {
  if (platform === "cursor" && event === "after-file-edit") {
    return typeof payload.file_path === "string" ? [payload.file_path] : [];
  }
  if (event !== "post-tool-use") return [];
  if (typeof payload.tool_input !== "object" || payload.tool_input === null) return [];
  const input = payload.tool_input as { command?: unknown; file_path?: unknown };
  if (platform === "codex" && payload.tool_name === "apply_patch") {
    return typeof input.command === "string" ? patchPaths(input.command) : [];
  }
  if (
    platform === "claude"
    && (payload.tool_name === "Write" || payload.tool_name === "Edit" || payload.tool_name === "NotebookEdit")
  ) {
    return typeof input.file_path === "string" ? [input.file_path] : [];
  }
  return [];
}

function repositoryPath(rawPath: string, cwd: string): string | undefined {
  const absolute = isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath);
  const local = relative(repositoryRoot, absolute);
  if (!local || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) return undefined;
  return local.split(sep).join("/");
}

function isRelevant(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return /^skills\/[^/]+\/SKILL\.md$/.test(path)
    || /^skills\/[^/]+\/(?:commands|references)\/.+\.md$/.test(path)
    || name === "AGENTS.md"
    || name === "CLAUDE.md"
    || name === "README.md";
}

type ArtifactKind = "skill-entry" | "skill-support" | "agent-guidance" | "readme";

function artifactKind(path: string): ArtifactKind {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (/^skills\/[^/]+\/SKILL\.md$/.test(path)) return "skill-entry";
  if (/^skills\/[^/]+\/(?:commands|references)\/.+\.md$/.test(path)) return "skill-support";
  if (name === "AGENTS.md" || name === "CLAUDE.md") return "agent-guidance";
  return "readme";
}

function consistencyChecks(paths: string[]): string {
  const kinds = new Set(paths.map(artifactKind));
  const checks: string[] = [];
  if (kinds.has("skill-entry")) {
    checks.push("Skill entries: verify trigger frontmatter, Principle expression, dispatch, and progressive disclosure");
  }
  if (kinds.has("skill-support")) {
    checks.push("Skill support: verify entry references, self-contained command/reference boundaries, and no duplicated doctrine");
  }
  if (kinds.has("agent-guidance")) {
    checks.push("Agent guidance: verify scope, commands, source ownership, and referenced paths");
  }
  if (kinds.has("readme")) {
    checks.push("README: verify audience, scope, commands, and links");
  }
  return checks.join("; ");
}

function summarizePaths(paths: string[], limit: number): string {
  const visible = paths.slice(0, limit);
  const remaining = paths.length - visible.length;
  return `${visible.join(", ")}${remaining > 0 ? ` (+${remaining} more)` : ""}`;
}

function artifactOutput(
  platform: Platform,
  event: ArtifactEvent,
  payload: HookPayload,
): unknown {
  const id = sessionId(platform, payload);
  const path = sessionStatePath(platform, id);
  if (event === "stop") return stopOutput(platform, payload, path);

  const cwd = typeof payload.cwd === "string" ? payload.cwd : repositoryRoot;
  const paths = rawChangedPaths(platform, event, payload)
    .map((entry) => repositoryPath(entry, cwd))
    .filter((entry): entry is string => entry !== undefined && isRelevant(entry));
  if (paths.length === 0) return undefined;

  const observed = readPaths(path);
  const additions = paths.filter((entry) => !observed.includes(entry));
  if (additions.length === 0) return undefined;
  appendPaths(path, additions);
  return undefined;
}

function stopOutput(
  platform: Platform,
  payload: HookPayload,
  path: string,
): unknown {
  const continuing = platform === "cursor"
    ? typeof payload.loop_count === "number" && payload.loop_count > 0
    : payload.stop_hook_active === true;
  if (continuing) {
    rmSync(path, { force: true });
    return undefined;
  }
  const paths = readPaths(path);
  if (paths.length === 0) return undefined;
  const reminder = (
    `Before finishing, verify reference and structure consistency for ${paths.length} artifact(s) changed in this session: ` +
    `${summarizePaths(paths, 20)}. ` +
    `${consistencyChecks(paths)}. Check only the applicable groups; do not expand into unrelated consistency work. ` +
    "Record only information that must survive this session in its owning source."
  );
  return platform === "cursor"
    ? { followup_message: reminder }
    : { decision: "block", reason: reminder };
}
