import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const hook = join(repositoryRoot, ".codex", "hooks", "artifact-consistency.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function runHook(
  temporary: string,
  payload: Record<string, unknown>,
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync([process.execPath, hook], {
    cwd: repositoryRoot,
    env: { ...process.env, TMPDIR: temporary },
    stdin: Buffer.from(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

async function runHookAsync(
  temporary: string,
  payload: Record<string, unknown>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = Bun.spawn([process.execPath, hook], {
    cwd: repositoryRoot,
    env: { ...process.env, TMPDIR: temporary },
    stdin: new Blob([JSON.stringify(payload)]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    result.exited,
    new Response(result.stdout).text(),
    new Response(result.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
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

describe("Codex artifact-consistency hook", () => {
  test("records only relevant repository-relative artifacts and reminds once at stop", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const relevant = join(repositoryRoot, "skills", "visual-design", "SKILL.md");
    const agents = join(repositoryRoot, "AGENTS.md");
    const ordinary = join(repositoryRoot, "operations", "workbench", "src", "home.ts");
    const similarlyNamedOutsideRoot = `${repositoryRoot}-other/skills/example/SKILL.md`;
    const patch = [
      "*** Begin Patch",
      `*** Update File: ${ordinary}`,
      `*** Update File: ${relevant}`,
      `*** Update File: ${agents}`,
      `*** Update File: ${similarlyNamedOutsideRoot}`,
      "*** End Patch",
    ].join("\n");

    const observed = runHook(temporary, postPayload("session-a", patch));
    expect(observed.exitCode).toBe(0);
    expect(observed.stderr).toBe("");
    const context = JSON.parse(observed.stdout).hookSpecificOutput.additionalContext as string;
    expect(context).toContain("skills/visual-design/SKILL.md");
    expect(context).toContain("AGENTS.md");
    expect(context).not.toContain("operations/workbench/src/home.ts");
    expect(context).not.toContain("skills-other");

    const repeated = runHook(temporary, postPayload("session-a", patch));
    expect(repeated.exitCode).toBe(0);
    expect(repeated.stdout).toBe("");

    const otherSession = runHook(temporary, {
      hook_event_name: "Stop",
      session_id: "session-b",
      stop_hook_active: false,
    });
    expect(otherSession.stdout).toBe("");

    const stop = runHook(temporary, {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: false,
    });
    expect(stop.exitCode).toBe(0);
    expect(JSON.parse(stop.stdout)).toEqual(expect.objectContaining({
      decision: "block",
      reason: expect.stringContaining("skills/visual-design/SKILL.md"),
    }));

    const continuation = runHook(temporary, {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: true,
    });
    expect(continuation.stdout).toBe("");
    const settled = runHook(temporary, {
      hook_event_name: "Stop",
      session_id: "session-a",
      stop_hook_active: false,
    });
    expect(settled.stdout).toBe("");
  });

  test("fails open with a visible warning when the runtime payload is invalid", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const result = runHook(temporary, { hook_event_name: "PostToolUse" });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).systemMessage).toContain("session_id is required");
  });

  test("retains observations from parallel subagents sharing one parent session", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-artifact-hook-"));
    temporaryRoots.push(temporary);
    const paths = Array.from({ length: 24 }, (_, index) => `skills/parallel-${index}/SKILL.md`);
    const observations = await Promise.all(paths.map((path) => runHookAsync(
      temporary,
      postPayload(
        "shared-parent-session",
        `*** Begin Patch\n*** Update File: ${join(repositoryRoot, path)}\n*** End Patch`,
      ),
    )));
    expect(observations.every((result) => result.exitCode === 0)).toBe(true);

    const stop = runHook(temporary, {
      hook_event_name: "Stop",
      session_id: "shared-parent-session",
      stop_hook_active: false,
    });
    expect(stop.exitCode).toBe(0);
    const reason = JSON.parse(stop.stdout).reason as string;
    expect(reason).toContain("24 artifact(s)");
    expect(reason).toContain("(+4 more)");
  });
});
