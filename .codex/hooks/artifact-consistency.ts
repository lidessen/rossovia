#!/usr/bin/env bun

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

const repositoryRoot = resolve(import.meta.dir, "../..");

interface HookPayload {
  hook_event_name?: unknown;
  session_id?: unknown;
  cwd?: unknown;
  stop_hook_active?: unknown;
  tool_name?: unknown;
  tool_input?: unknown;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required`);
  return value;
}

function sessionStatePath(sessionId: string): string {
  const identity = digest(`${repositoryRoot}\0${sessionId}`).slice(0, 40);
  return resolve(tmpdir(), "rossovia-codex-hooks", "artifact-consistency", `${identity}.jsonl`);
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

function rawChangedPaths(payload: HookPayload): string[] {
  if (payload.tool_name !== "apply_patch") return [];
  if (typeof payload.tool_input !== "object" || payload.tool_input === null) return [];
  const command = (payload.tool_input as { command?: unknown }).command;
  return typeof command === "string" ? patchPaths(command) : [];
}

function repositoryPath(rawPath: string, cwd: string): string | undefined {
  const absolute = isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath);
  const local = relative(repositoryRoot, absolute);
  if (!local || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) return undefined;
  return local.split(sep).join("/");
}

function isRelevant(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return path.startsWith("skills/")
    || name === "AGENTS.md"
    || name === "CLAUDE.md"
    || name === "README.md";
}

function summarizePaths(paths: string[], limit: number): string {
  const visible = paths.slice(0, limit);
  const remaining = paths.length - visible.length;
  return `${visible.join(", ")}${remaining > 0 ? ` (+${remaining} more)` : ""}`;
}

function postToolUse(payload: HookPayload, sessionId: string): unknown {
  const cwd = typeof payload.cwd === "string" ? payload.cwd : repositoryRoot;
  const paths = rawChangedPaths(payload)
    .map((path) => repositoryPath(path, cwd))
    .filter((path): path is string => path !== undefined && isRelevant(path));
  if (paths.length === 0) return undefined;

  const path = sessionStatePath(sessionId);
  const observed = readPaths(path);
  const additions = paths.filter((entry) => !observed.includes(entry));
  if (additions.length === 0) return undefined;
  appendPaths(path, additions);
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: (
        `Relevant project artifacts changed: ${summarizePaths(additions, 10)}. ` +
        "Check the owning artifact now: Skill prompts keep their trigger, principle expression, and progressive disclosure coherent; " +
        "README, AGENTS, or CLAUDE guidance keeps scope and references accurate."
      ),
    },
  };
}

function stop(payload: HookPayload, sessionId: string): unknown {
  const path = sessionStatePath(sessionId);
  if (payload.stop_hook_active === true) {
    rmSync(path, { force: true });
    return undefined;
  }
  const paths = readPaths(path);
  if (paths.length === 0) return undefined;
  return {
    decision: "block",
    reason: (
      `Before finishing, verify reference and structure consistency for ${paths.length} artifact(s) changed in this session: ` +
      `${summarizePaths(paths, 20)}. ` +
      "Record only information that must survive this session in its owning source."
    ),
  };
}

export function handleArtifactConsistency(payload: HookPayload): unknown {
  const event = requiredString(payload.hook_event_name, "hook_event_name");
  const sessionId = requiredString(payload.session_id, "session_id");
  if (event === "PostToolUse") return postToolUse(payload, sessionId);
  if (event === "Stop") return stop(payload, sessionId);
  return undefined;
}

if (import.meta.main) {
  try {
    const payload = JSON.parse(await Bun.stdin.text()) as HookPayload;
    const output = handleArtifactConsistency(payload);
    if (output !== undefined) console.log(JSON.stringify(output));
  } catch (error: unknown) {
    console.log(JSON.stringify({
      systemMessage: `Rossovia artifact-consistency hook unavailable: ${error instanceof Error ? error.message : String(error)}`,
    }));
  }
}
