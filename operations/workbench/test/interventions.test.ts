import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
const adapter = join(repositoryRoot, ".codex", "hooks", "intervention-reconciliation.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(
  argv: string[],
  options: { cwd?: string; stdin?: string; env?: Record<string, string | undefined> } = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, {
    cwd: options.cwd ?? repositoryRoot,
    ...(options.stdin === undefined ? {} : { stdin: Buffer.from(options.stdin) }),
    stdout: "pipe",
    stderr: "pipe",
    ...(options.env === undefined ? {} : { env: options.env }),
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function workbench(...args: string[]) {
  return command([process.execPath, bunCli, ...args]);
}

describe("intervention reconciliation", () => {
  test("retains only prompt evidence and binds receipts to one observed session", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-intervention-"));
    temporaryRoots.push(temporary);
    const stateRoot = join(temporary, "state");
    const prompt = "Do not retain this secret correction text";
    const observation = command(
      [process.execPath, bunCli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "session-1", turn_id: "turn-1", cwd: repositoryRoot, prompt }) },
    );
    expect(observation.exitCode).toBe(0);
    const statePath = JSON.parse(observation.stdout).statePath as string;
    expect(readFileSync(statePath, "utf8")).not.toContain(prompt);

    const correction = workbench(
      "correct",
      "--state-file",
      statePath,
      "--rejected-assumption",
      "terminal tool payload owns final output",
      "--new-invariant",
      "terminal tools and output schema are independent",
      "--affected-surface",
      "contracts",
      "--affected-surface",
      "tests",
      "--next-probe",
      "verify each condition independently",
    );
    expect(correction.exitCode).toBe(0);
    expect(JSON.parse(correction.stdout).statePath).toBe(statePath);
    const status = workbench("intervention", "status", "--state-file", statePath);
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(status.stdout)).toEqual(expect.objectContaining({
      observations: 1,
      receipts: [expect.objectContaining({ affectedSurfaces: ["contracts", "tests"] })],
    }));

    const otherSession = command(
      [process.execPath, bunCli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "session-2", cwd: repositoryRoot, prompt: "parallel" }) },
    );
    expect(otherSession.exitCode).toBe(0);
    const otherStatePath = JSON.parse(otherSession.stdout).statePath as string;
    expect(otherStatePath).not.toBe(statePath);

    const firstBySession = workbench(
      "intervention",
      "status",
      "--state-root",
      stateRoot,
      "--session-id",
      "session-1",
    );
    const secondBySession = workbench(
      "intervention",
      "status",
      "--state-root",
      stateRoot,
      "--session-id",
      "session-2",
    );
    expect(firstBySession.exitCode).toBe(0);
    expect(secondBySession.exitCode).toBe(0);
    expect(JSON.parse(firstBySession.stdout).statePath).toBe(statePath);
    expect(JSON.parse(secondBySession.stdout).statePath).toBe(otherStatePath);

    const unselected = workbench("intervention", "status", "--state-root", stateRoot);
    expect(unselected.exitCode).toBe(2);
    expect(unselected.stderr).toContain("requires --state-file or --session-id");

    const duplicateIdentity = command(
      [process.execPath, bunCli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "session-1", cwd: join(temporary, "other-workspace"), prompt: "parallel" }) },
    );
    expect(duplicateIdentity.exitCode).toBe(0);
    const ambiguousSession = workbench(
      "intervention",
      "status",
      "--state-root",
      stateRoot,
      "--session-id",
      "session-1",
    );
    expect(ambiguousSession.exitCode).toBe(2);
    expect(ambiguousSession.stderr).toContain("intervention session is ambiguous");
  });

  test("Codex adapter uses the Rossovia home across target switches", () => {
    const home = mkdtempSync(join(tmpdir(), "rossovia-hook-"));
    temporaryRoots.push(home);
    const rossoviaHome = join(home, "rossovia-home");
    const environment = { ...process.env, HOME: home, ROSSO_HOME: rossoviaHome };
    const payload = {
      session_id: "session-hook",
      turn_id: "turn-hook",
      cwd: repositoryRoot,
      prompt: "The previous boundary was wrong",
    };
    const result = command([process.execPath, adapter], {
      stdin: JSON.stringify(payload),
      env: environment,
    });
    expect(result.exitCode).toBe(0);
    const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext as string;
    expect(context).toContain("compare it with the active task");
    expect(context).toContain("advisory, not a mutation or authorization gate");
    expect(context).toContain("do not request broader filesystem permission");

    const marker = "session-local `correct` command prefix `";
    const endpoint = context.split(marker, 2)[1]?.split("`", 1)[0];
    expect(endpoint).toBeDefined();
    const statePath = endpoint!.match(/--state-file '([^']+)'$/)?.[1];
    expect(statePath).toBeDefined();

    const targets = [join(home, "second-repository"), join(home, "third-repository"), join(home, "second-repository")];
    const paths: string[] = [];
    for (const target of targets) {
      const correction = command([
        process.execPath,
        bunCli,
        "correct",
        "--state-file",
        statePath!,
        "--rejected-assumption",
        "the last repository remains the active target",
        "--new-invariant",
        "bind the receipt to the observed session across target switches",
        "--affected-surface",
        target,
        "--next-probe",
        "switch target repositories and return",
      ], { env: environment });
      expect(correction.exitCode).toBe(0);
      paths.push(JSON.parse(correction.stdout).statePath);
    }
    expect(new Set(paths).size).toBe(1);
    expect(statePath).toStartWith(join(realpathSync(home), "rossovia-home", "state", "interventions"));
    expect(existsSync(join(home, ".codex", "intervention-reconciliation"))).toBe(false);
    const state = JSON.parse(readFileSync(statePath!, "utf8"));
    expect(state.receipts.map((receipt: { affectedSurfaces: string[] }) => receipt.affectedSurfaces)).toEqual(
      targets.map((target) => [target]),
    );
  });
});
