import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "apps", "gateway", "rossovia");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(
  argv: string[],
  options: { cwd?: string; stdin?: string; env?: Record<string, string> } = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, {
    cwd: options.cwd ?? repositoryRoot,
    ...(options.stdin === undefined ? {} : { stdin: Buffer.from(options.stdin) }),
    ...(options.env === undefined ? {} : { env: options.env }),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function cli(
  args: string[],
  options: { cwd?: string; stdin?: string; env?: Record<string, string> } = {},
) {
  return command([launcher, ...args], options);
}

function temporary(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-help-sidechannel-"));
  temporaryRoots.push(root);
  return root;
}

/**
 * One contract-note expectation per side-channel help path. The substrings
 * are source facts from hooks.ts, interventions.ts, and statusline.ts, kept
 * coarse so help re-wording does not churn the test: each path must state
 * its input source, its state location or read boundary, its output shape,
 * and its platform/fallback boundary where one exists.
 */
const SIDE_CHANNEL_HELP_CONTRACT: Record<string, string[]> = {
  "hook": [
    "hook <intervention|artifact> <codex|claude|cursor> [post-tool-use|after-file-edit|stop]",
    "Platform validation is the usage boundary",
    "exits 2 with a help pointer",
    "Only a non-help invocation with a valid platform reads one JSON payload from stdin",
    "exit-0 fallback",
  ],
  "hook intervention": [
    "usage: rossovia hook intervention <codex|claude>",
    "platforms: codex and claude only",
    "cursor is not supported and takes the fallback path",
    "stdin: one JSON payload {session_id, turn_id?, cwd, prompt?}",
    "<home>/state/interventions/<workspace-key>/<session-digest>.json",
    '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":...}}',
    "advisory only: beyond the observation write above, it grants no permission",
    "never blocks already-authorized work",
    'failures return {"systemMessage":...} on stdout with exit 0',
    "cursor: a stderr note plus {}",
  ],
  "hook artifact": [
    "usage: rossovia hook artifact <codex|claude|cursor> <post-tool-use|after-file-edit|stop>",
    "session_id (codex/claude) or conversation_id (cursor) is required",
    "post-tool-use reads tool_name/tool_input/cwd",
    "after-file-edit reads file_path (cursor)",
    "stop reads loop_count (cursor)",
    "$TMPDIR/rossovia-hooks/artifact-consistency/<40-hex>.jsonl",
    "operating-system temporary state, not Workbench home state",
    "a post-tool-use or after-file-edit payload without relevant changed paths is a silent no-op (stop never appends)",
    "post-tool-use and after-file-edit succeed silently",
    'codex/claude {"systemMessage":...} and removes that session\'s file so later stops stay silent',
    'cursor with loop_count missing or 0 returns {"followup_message":...} and retains the file so another loop_count 0 stop notifies again',
    "a cursor stop with loop_count>0 removes the file silently, after which later stops are silent",
    "decision and additionalContext are never returned",
    "this hook never stops or denies a run",
  ],
  "intervention": [
    "Intervention state lives under a state root: <home>/state/interventions by default",
    "overridden by --state-root",
    "observe writes prompt evidence, correct appends a Principal correction",
    "status reads the intervention-local append-only record projection",
  ],
  "intervention observe": [
    "usage: rossovia intervention observe [--state-root <path>]",
    "stdin: one JSON payload {session_id, turn_id?, cwd, prompt?}",
    "Flags: only --state-root",
    "<state-root>/<workspace-key>/<session-digest>.json",
    "appends an observation witness under <file>.observations/",
    'output: {"statePath":..., "observation":{...}} on stdout, exit 0',
    "printf '{\"session_id\":\"s\",\"cwd\":\".\"}' | rossovia intervention observe",
    "unwritable state location exits 1 naming the exact path",
  ],
  "intervention status": [
    "usage: rossovia intervention status (--state-file <path> | --session-id <id> [--state-root <path>])",
    "input: flags only, no stdin",
    "--state-file cannot combine with --session-id or --state-root",
    "read boundary: never creates or mutates state",
    'output: {"statePath":..., "sessionId":..., "observations":<n>, "receipts":[...], "records":[...]} on stdout, exit 0',
    "nearest recovery is rossovia intervention observe",
    "use rossovia intervention correct --state-file <path> to append a receipt",
  ],
  "intervention correct": [
    "usage: rossovia intervention correct --state-file <path> --rejected-assumption <text> --new-invariant <text> --affected-surface <name>... --next-probe <text>",
    "input: flags only, no stdin",
    "--affected-surface <name> repeats",
    "appends one receipt witness under <state-file>.receipts/",
    'output: {"statePath":..., "receipt":{...}, "record":{...}} on stdout, exit 0',
    "A missing state file exits 1",
    "recover with rossovia intervention observe first",
  ],
  "statusline": [
    "usage: rossovia statusline [claude] [--cwd <path>]",
    "parses Claude's status-line JSON {session_name, workspace.current_dir|cwd}",
    "direct mode uses --cwd <path> or the default process cwd",
    "stdin is read only when it is not a TTY",
    "invalid or empty JSON degrades to the cwd label instead of failing",
    "one plain-text label on stdout",
    "never an absolute path",
    "empty stderr and exit 0",
    "never creates project, task, session, or runtime state",
    "that read failure degrades silently",
  ],
};

describe("Rossovia CLI side-channel help contract (T6)", () => {
  test("every side-channel help path states its input, state, output, and platform/fallback contract", () => {
    for (const [path, expected] of Object.entries(SIDE_CHANNEL_HELP_CONTRACT)) {
      const result = cli(["help", ...path.split(" ")], { stdin: "" });
      expect(result.exitCode, `help ${path}`).toBe(0);
      expect(result.stderr, `help ${path} stderr`).toBe("");
      for (const fragment of expected) {
        expect(result.stdout, `help ${path} must mention: ${fragment}`).toContain(fragment);
      }
      expect(result.stdout.split("\n")[0], `help ${path} usage line`).toMatch(/^usage: rossovia /);
    }
  }, { timeout: 60000 });

  test("the --help and -h spellings render the same side-channel notes as help <path>", () => {
    for (const path of Object.keys(SIDE_CHANNEL_HELP_CONTRACT)) {
      const spelled = cli(["help", ...path.split(" ")], { stdin: "" });
      const flagged = cli([...path.split(" "), "--help"], { stdin: "" });
      const short = cli([...path.split(" "), "-h"], { stdin: "" });
      expect(flagged.exitCode, `${path} --help`).toBe(0);
      expect(flagged.stdout, `${path} --help output`).toBe(spelled.stdout);
      expect(short.stdout, `${path} -h output`).toBe(spelled.stdout);
    }
  }, { timeout: 60000 });

  test("statusline behavior matches the help: claude JSON stdin, direct --cwd, and degradation", () => {
    const root = temporary();
    mkdirSync(root, { recursive: true });
    const nested = join(root, "nested");
    mkdirSync(nested, { recursive: true });

    const claudeMode = cli(["statusline", "claude"], {
      cwd: nested,
      stdin: JSON.stringify({ session_name: "probe-session", workspace: { current_dir: root } }),
    });
    expect(claudeMode.exitCode).toBe(0);
    expect(claudeMode.stderr).toBe("");
    expect(claudeMode.stdout.trim()).toBe("probe-session");

    const direct = cli(["statusline", "--cwd", nested], { stdin: "" });
    expect(direct.exitCode).toBe(0);
    expect(direct.stdout.trim()).toBe(basename(nested));

    const degraded = cli(["statusline"], { cwd: nested, stdin: "{not json" });
    expect(degraded.exitCode).toBe(0);
    expect(degraded.stderr).toBe("");
    expect(degraded.stdout.trim()).toBe(basename(nested));
  });

  test("hook help matches behavior: usage boundary, exit-0 JSON fallbacks, cursor fallback", () => {
    const missingPlatform = cli(["hook"], { stdin: "{}" });
    expect(missingPlatform.exitCode).toBe(2);
    expect(missingPlatform.stdout).toBe("");
    expect(missingPlatform.stderr).toContain("hook platform must be codex, claude, or cursor");
    expect(missingPlatform.stderr).toContain("run 'rossovia help hook' for usage");

    const invalidPlatformBeforeStdin = cli(["hook", "artifact", "bogus", "stop"], {
      stdin: "{not json that must never be parsed",
    });
    expect(invalidPlatformBeforeStdin.exitCode).toBe(2);
    expect(invalidPlatformBeforeStdin.stdout).toBe("");
    expect(invalidPlatformBeforeStdin.stderr).toContain("hook platform must be codex, claude, or cursor");
    expect(invalidPlatformBeforeStdin.stderr).not.toContain("JSON Parse error");

    const invalidPayload = cli(["hook", "artifact", "codex", "stop"], { stdin: "{}" });
    expect(invalidPayload.exitCode).toBe(0);
    expect(invalidPayload.stderr).toBe("");
    expect(JSON.parse(invalidPayload.stdout)).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("session_id is required"),
    }));

    const malformedJson = cli(["hook", "artifact", "codex", "stop"], {
      stdin: "{not json",
    });
    expect(malformedJson.exitCode).toBe(0);
    expect(malformedJson.stderr).toBe("");
    expect(JSON.parse(malformedJson.stdout)).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("JSON Parse error"),
    }));

    const malformedJsonCursor = cli(["hook", "artifact", "cursor", "stop"], {
      stdin: "{not json",
    });
    expect(malformedJsonCursor.exitCode).toBe(0);
    expect(malformedJsonCursor.stdout.trim()).toBe("{}");
    expect(malformedJsonCursor.stderr).toContain("Rossovia artifact unavailable");

    const cursorIntervention = cli(["hook", "intervention", "cursor"], {
      stdin: JSON.stringify({ conversation_id: "c1" }),
    });
    expect(cursorIntervention.exitCode).toBe(0);
    expect(cursorIntervention.stdout.trim()).toBe("{}");
    expect(cursorIntervention.stderr).toContain("intervention hooks are supported for codex and claude");
  });

  test("cursor stop lifecycle: loop-0 reminders twice with the file retained, loop-1 silent deletion, then silent stop", () => {
    const root = temporary();
    const stateDir = join(root, "hook-tmp");
    mkdirSync(stateDir, { recursive: true });
    const env = { ...process.env, TMPDIR: stateDir };
    const skill = join(repositoryRoot, "skills", "visual-design", "SKILL.md");

    const observed = cli(["hook", "artifact", "cursor", "after-file-edit"], {
      stdin: JSON.stringify({ conversation_id: "cursor-t6", cwd: repositoryRoot, file_path: skill }),
      env,
    });
    expect(observed.exitCode).toBe(0);
    expect(observed.stdout).toBe("");
    expect(observed.stderr).toBe("");
    const consistencyDir = join(stateDir, "rossovia-hooks", "artifact-consistency");
    const recorded = readdirSync(consistencyDir);
    expect(recorded).toHaveLength(1);
    const sessionFile = join(consistencyDir, recorded[0]!);
    expect(existsSync(sessionFile)).toBe(true);

    const firstStop = cli(["hook", "artifact", "cursor", "stop"], {
      stdin: JSON.stringify({ conversation_id: "cursor-t6" }),
      env,
    });
    expect(firstStop.exitCode).toBe(0);
    expect(firstStop.stderr).toBe("");
    expect(JSON.parse(firstStop.stdout).followup_message).toContain("skills/visual-design/SKILL.md");
    expect(existsSync(sessionFile)).toBe(true);

    const secondStop = cli(["hook", "artifact", "cursor", "stop"], {
      stdin: JSON.stringify({ conversation_id: "cursor-t6", loop_count: 0 }),
      env,
    });
    expect(secondStop.exitCode).toBe(0);
    expect(secondStop.stderr).toBe("");
    expect(JSON.parse(secondStop.stdout).followup_message).toContain("skills/visual-design/SKILL.md");
    expect(existsSync(sessionFile)).toBe(true);

    const continuing = cli(["hook", "artifact", "cursor", "stop"], {
      stdin: JSON.stringify({ conversation_id: "cursor-t6", loop_count: 1 }),
      env,
    });
    expect(continuing.exitCode).toBe(0);
    expect(continuing.stdout).toBe("");
    expect(continuing.stderr).toBe("");
    expect(existsSync(sessionFile)).toBe(false);

    const settled = cli(["hook", "artifact", "cursor", "stop"], {
      stdin: JSON.stringify({ conversation_id: "cursor-t6", loop_count: 0 }),
      env,
    });
    expect(settled.exitCode).toBe(0);
    expect(settled.stdout).toBe("");
    expect(settled.stderr).toBe("");
  });

  test("intervention observe/status/correct form one legal stdin-or-flags loop from help alone", () => {
    const root = temporary();
    const home = join(root, "home");
    const payload = JSON.stringify({
      session_id: "t6-session",
      turn_id: 7,
      cwd: repositoryRoot,
      prompt: "probe",
    });

    const observed = cli(["--home", home, "intervention", "observe"], { stdin: payload });
    expect(observed.exitCode).toBe(0);
    expect(observed.stderr).toBe("");
    const observedJson = JSON.parse(observed.stdout);
    expect(typeof observedJson.statePath).toBe("string");
    expect(observedJson.observation).toEqual(expect.objectContaining({ turnId: "7" }));
    expect(existsSync(observedJson.statePath)).toBe(true);

    const statusById = cli(["--home", home, "intervention", "status", "--session-id", "t6-session"], {
      stdin: "garbage that must not be read",
    });
    expect(statusById.exitCode).toBe(0);
    expect(JSON.parse(statusById.stdout)).toEqual(expect.objectContaining({
      statePath: observedJson.statePath,
      sessionId: "t6-session",
      observations: 1,
      receipts: [],
    }));

    const corrected = cli([
      "intervention", "correct",
      "--state-file", observedJson.statePath,
      "--rejected-assumption", "a1",
      "--new-invariant", "i1",
      "--affected-surface", "surface-x",
      "--next-probe", "p1",
    ], { stdin: "garbage that must not be read" });
    expect(corrected.exitCode).toBe(0);
    expect(corrected.stderr).toBe("");
    expect(JSON.parse(corrected.stdout)).toEqual(expect.objectContaining({
      statePath: observedJson.statePath,
      receipt: expect.objectContaining({
        rejectedAssumption: "a1",
        newInvariant: "i1",
        affectedSurfaces: ["surface-x"],
        nextProbe: "p1",
      }),
    }));

    const statusByFile = cli(["intervention", "status", "--state-file", observedJson.statePath]);
    const projected = JSON.parse(statusByFile.stdout);
    expect(projected.receipts).toHaveLength(1);
    expect(projected.receipts[0].rejectedAssumption).toBe("a1");

    const missing = cli(["intervention", "correct", "--state-file", join(root, "absent.json"),
      "--rejected-assumption", "a", "--new-invariant", "i",
      "--affected-surface", "s", "--next-probe", "p"]);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("intervention state not found");
  });

  test("hook artifact writes only its TMPDIR state and only for relevant in-repo paths", () => {
    const root = temporary();
    const stateDir = join(root, "hook-tmp");
    mkdirSync(stateDir, { recursive: true });
    const env = { ...process.env, TMPDIR: stateDir };
    const payload = JSON.stringify({
      session_id: "t6-artifact",
      cwd: repositoryRoot,
      tool_name: "apply_patch",
      tool_input: { command: "*** Update File: skills/context-engineering/SKILL.md\n@@ -1 +1 @@\n" },
    });

    const observedPath = cli(["hook", "artifact", "codex", "post-tool-use"], {
      stdin: payload,
      env,
    });
    expect(observedPath.exitCode).toBe(0);
    expect(observedPath.stdout).toBe("");
    expect(observedPath.stderr).toBe("");

    const consistencyDir = join(stateDir, "rossovia-hooks", "artifact-consistency");
    expect(existsSync(consistencyDir)).toBe(true);
    const recorded = readdirSync(consistencyDir);
    expect(recorded).toHaveLength(1);
    const sessionFile = join(consistencyDir, recorded[0]!);

    const stopped = cli(["hook", "artifact", "codex", "stop"], { stdin: payload, env });
    expect(stopped.exitCode).toBe(0);
    expect(JSON.parse(stopped.stdout)).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("skills/context-engineering/SKILL.md"),
    }));
    expect(existsSync(sessionFile)).toBe(false);
    expect(existsSync(join(root, "home"))).toBe(false);
  });

  test("help queries for the side-channel paths read no stdin and create no home or TMPDIR state", () => {
    const root = temporary();
    const home = join(root, "home");
    const stateDir = join(root, "hook-tmp");
    const env = { ...process.env, TMPDIR: stateDir, ROSSO_HOME: join(root, "rosso-home") };
    for (const path of Object.keys(SIDE_CHANNEL_HELP_CONTRACT)) {
      for (const args of [
        ["--home", home, "help", ...path.split(" ")],
        ["--home", home, ...path.split(" "), "--help"],
        ["--home", home, ...path.split(" "), "-h"],
      ]) {
        const result = cli(args, {
          stdin: JSON.stringify({ session_id: "help-probe", cwd: repositoryRoot }),
          env,
        });
        expect(result.exitCode, args.join(" ")).toBe(0);
        expect(result.stderr, args.join(" ")).toBe("");
      }
    }
    expect(existsSync(home)).toBe(false);
    expect(existsSync(stateDir)).toBe(false);
    expect(existsSync(env.ROSSO_HOME!)).toBe(false);
  }, { timeout: 60000 });

  test("T1-T5 compatibility: effect lines, usage errors, and state-failure exits do not regress", () => {
    const expectations: Array<[string, string]> = [
      ["hook intervention", "effect: writes-state"],
      ["hook artifact", "effect: starts-work"],
      ["intervention observe", "effect: writes-state"],
      ["intervention status", "effect: read-only"],
      ["intervention correct", "effect: writes-state"],
      ["statusline", "effect: read-only"],
    ];
    for (const [path, effectLine] of expectations) {
      const result = cli(["help", ...path.split(" ")], { stdin: "" });
      expect(result.stdout, path).toContain(effectLine);
      expect(result.stdout.split("\n").filter((line) => line.startsWith("effect: ")), path)
        .toEqual([effectLine]);
    }

    const badStatusline = cli(["statusline", "--bogus"]);
    expect(badStatusline.exitCode).toBe(2);
    expect(badStatusline.stderr).toBe(
      "rossovia: statusline accepts optional 'claude' and --cwd <path>\nrun 'rossovia help statusline' for usage\n",
    );

    const badCorrect = cli(["correct"]);
    expect(badCorrect.exitCode).toBe(2);
    expect(badCorrect.stderr).toContain("unknown command: correct");
    expect(badCorrect.stderr).toContain("run 'rossovia help' for usage");

    const badIntervention = cli(["intervention", "frobnicate"]);
    expect(badIntervention.exitCode).toBe(2);
    expect(badIntervention.stderr).toContain("unknown intervention command: frobnicate");
    expect(badIntervention.stderr).toContain("run 'rossovia help intervention' for usage");
  });
});
