import { afterEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "apps", "workbench", "src", "cli.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function runHook(
  temporary: string,
  platform: "codex" | "claude" | "cursor",
  event: "post-tool-use" | "after-file-edit" | "stop",
  payload: Record<string, unknown>,
): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cli, "hook", "artifact", platform, event], {
    cwd: repositoryRoot,
    env: { ...process.env, TMPDIR: temporary },
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function runHookAsync(
  temporary: string,
  platform: "codex" | "claude" | "cursor",
  event: "post-tool-use" | "after-file-edit" | "stop",
  payload: Record<string, unknown>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [cli, "hook", "artifact", platform, event], {
      cwd: repositoryRoot,
      env: { ...process.env, TMPDIR: temporary },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("close", (exitCode) => {
      resolvePromise({ exitCode: exitCode ?? 1, stdout, stderr });
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function postPayload(sessionId: string, command: string): Record<string, unknown> {
  return {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    cwd: repositoryRoot,
    tool_name: "apply_patch",
    tool_input: { command },
  };
}

function sessionStatePath(temporary: string, platform: string, sessionId: string): string {
  const identity = createHash("sha256")
    .update(`${repositoryRoot}\0${platform}\0${sessionId}`)
    .digest("hex")
    .slice(0, 40);
  return join(temporary, "rossovia-hooks", "artifact-consistency", `${identity}.jsonl`);
}

describe("Codex artifact-consistency hook", () => {
  test("records only relevant repository-relative artifacts and reminds once at stop", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const relevant = join(repositoryRoot, "skills", "visual-design", "SKILL.md");
    const asset = join(repositoryRoot, "skills", "visual-design", "assets", "preview.png");
    const agents = join(repositoryRoot, "AGENTS.md");
    const ordinary = join(repositoryRoot, "apps", "workbench", "src", "home.ts");
    const similarlyNamedOutsideRoot = `${repositoryRoot}-other/skills/example/SKILL.md`;
    const patch = [
      "*** Begin Patch",
      `*** Update File: ${ordinary}`,
      `*** Update File: ${relevant}`,
      `*** Update File: ${asset}`,
      `*** Update File: ${agents}`,
      `*** Update File: ${similarlyNamedOutsideRoot}`,
      "*** End Patch",
    ].join("\n");

    const observed = runHook(temporary, "codex", "post-tool-use", postPayload("session-a", patch));
    expect(observed.exitCode).toBe(0);
    expect(observed.stderr).toBe("");
    expect(observed.stdout).toBe("");

    const repeated = runHook(temporary, "codex", "post-tool-use", postPayload("session-a", patch));
    expect(repeated.exitCode).toBe(0);
    expect(repeated.stdout).toBe("");

    const otherSession = runHook(temporary, "codex", "stop", {
      hook_event_name: "Stop",
      session_id: "session-b",
      stop_hook_active: false,
    });
    expect(otherSession.stdout).toBe("");

    const stop = runHook(temporary, "codex", "stop", {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: false,
    });
    expect(stop.exitCode).toBe(0);
    const stopOutput = JSON.parse(stop.stdout);
    expect(stopOutput).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("skills/visual-design/SKILL.md"),
    }));
    expect(stopOutput.systemMessage).toContain("AGENTS.md");
    expect(stopOutput.systemMessage).toContain("Skill entries:");
    expect(stopOutput.systemMessage).toContain("Agent guidance:");
    expect(stopOutput.systemMessage).not.toContain("assets/preview.png");
    expect(stopOutput.systemMessage).not.toContain("apps/workbench/src/home.ts");
    expect(stopOutput.systemMessage).not.toContain("skills-other");
    expect(stopOutput).not.toHaveProperty("decision");
    expect(stopOutput).not.toHaveProperty("additionalContext");
    expect(stopOutput).not.toHaveProperty("continue");
    expect(existsSync(sessionStatePath(temporary, "codex", "session-a"))).toBe(false);

    const repeatedStop = runHook(temporary, "codex", "stop", {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: true,
    });
    expect(repeatedStop.stdout).toBe("");
    const settled = runHook(temporary, "codex", "stop", {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: false,
    });
    expect(settled.stdout).toBe("");
  });

  test("fails open with a visible warning when the runtime payload is invalid", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const result = runHook(temporary, "codex", "post-tool-use", { hook_event_name: "PostToolUse" });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).systemMessage).toContain("session_id is required");
  });

  test("retains observations from parallel subagents sharing one parent session", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const paths = Array.from({ length: 24 }, (_, index) => `skills/parallel-${index}/SKILL.md`);
    const observations = await Promise.all(paths.map((path) => runHookAsync(
      temporary,
      "codex",
      "post-tool-use",
      postPayload(
        "shared-parent-session",
        `*** Begin Patch\n*** Update File: ${join(repositoryRoot, path)}\n*** End Patch`,
      ),
    )));
    expect(observations.every((result) => result.exitCode === 0)).toBe(true);

    const stop = runHook(temporary, "codex", "stop", {
      hook_event_name: "Stop",
      session_id: "shared-parent-session",
      stop_hook_active: false,
    });
    expect(stop.exitCode).toBe(0);
    const systemMessage = JSON.parse(stop.stdout).systemMessage as string;
    expect(systemMessage).toContain("24 artifact(s)");
    expect(systemMessage).toContain("(+4 more)");
    expect(existsSync(sessionStatePath(temporary, "codex", "shared-parent-session"))).toBe(false);
  });

  test("normalizes Claude edits and Cursor file events without pretending output parity", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const skill = join(repositoryRoot, "skills", "visual-design", "SKILL.md");

    const claude = runHook(temporary, "claude", "post-tool-use", {
      session_id: "claude-session",
      cwd: repositoryRoot,
      tool_name: "Edit",
      tool_input: { file_path: skill },
    });
    expect(claude.stdout).toBe("");
    const claudeStop = runHook(temporary, "claude", "stop", {
      session_id: "claude-session",
      stop_hook_active: false,
    });
    expect(JSON.parse(claudeStop.stdout)).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("Skill entries:"),
    }));
    expect(existsSync(sessionStatePath(temporary, "claude", "claude-session"))).toBe(false);

    const cursor = runHook(temporary, "cursor", "after-file-edit", {
      conversation_id: "cursor-conversation",
      cwd: repositoryRoot,
      file_path: skill,
    });
    expect(cursor.stdout).toBe("");
    const cursorStop = runHook(temporary, "cursor", "stop", {
      conversation_id: "cursor-conversation",
      loop_count: 0,
    });
    expect(JSON.parse(cursorStop.stdout).followup_message).toContain("skills/visual-design/SKILL.md");
    const cursorContinuation = runHook(temporary, "cursor", "stop", {
      conversation_id: "cursor-conversation",
      loop_count: 1,
    });
    expect(cursorContinuation.stdout).toBe("");
  });
});
