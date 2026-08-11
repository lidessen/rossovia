import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
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
  return command([process.execPath, cli, ...args]);
}

function commandAsync(argv: string[], stdin = ""): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), { cwd: repositoryRoot, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      resolveResult({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
    child.stdin.end(stdin);
  });
}

describe("intervention reconciliation", () => {
  test("retains only prompt evidence and binds receipts to one observed session", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-intervention-"));
    temporaryRoots.push(temporary);
    const stateRoot = join(temporary, "state");
    const prompt = "Do not retain this secret correction text";
    const observation = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
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

    const laterObservation = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "session-1", turn_id: "turn-2", cwd: repositoryRoot, prompt: "later" }) },
    );
    expect(laterObservation.exitCode).toBe(0);
    const laterStatus = workbench("intervention", "status", "--state-file", statePath);
    expect(JSON.parse(laterStatus.stdout)).toEqual(expect.objectContaining({
      observations: 2,
      receipts: [expect.objectContaining({ affectedSurfaces: ["contracts", "tests"] })],
    }));

    const otherSession = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
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
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
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

  test("retains concurrent observations and receipts as append-only witnesses", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-intervention-concurrent-"));
    temporaryRoots.push(temporary);
    const stateRoot = join(temporary, "state");
    const observation = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "concurrent", cwd: repositoryRoot, prompt: "parallel" }) },
    );
    expect(observation.exitCode).toBe(0);
    const statePath = JSON.parse(observation.stdout).statePath as string;
    const receiptCount = 32;
    const observationCount = 32;

    const corrections = Array.from({ length: receiptCount }, (_, index) => commandAsync([
      process.execPath,
      cli,
      "correct",
      "--state-file",
      statePath,
      "--rejected-assumption",
      `assumption-${index}`,
      "--new-invariant",
      `invariant-${index}`,
      "--affected-surface",
      `surface-${index}`,
      "--next-probe",
      `probe-${index}`,
    ]));
    const observations = Array.from({ length: observationCount }, (_, index) => commandAsync([
      process.execPath,
      cli,
      "intervention",
      "observe",
      "--state-root",
      stateRoot,
    ], JSON.stringify({ session_id: "concurrent", cwd: repositoryRoot, prompt: `parallel-${index}` })));

    const concurrent = await Promise.all([...corrections, ...observations]);

    expect(concurrent.every((result) => result.exitCode === 0)).toBe(true);
    const status = command([
      process.execPath,
      cli,
      "intervention",
      "status",
      "--state-file",
      statePath,
    ]);
    expect(status.exitCode).toBe(0);
    const projection = JSON.parse(status.stdout) as {
      observations: number;
      receipts: Array<{ rejectedAssumption: string }>;
    };
    const receipts = projection.receipts;
    expect(projection.observations).toBe(observationCount + 1);
    expect(receipts).toHaveLength(receiptCount);
    expect(readdirSync(`${statePath}.observations`).filter((entry) => entry.endsWith(".json"))).toHaveLength(
      observationCount + 1,
    );
    expect(readdirSync(`${statePath}.receipts`).filter((entry) => entry.endsWith(".json"))).toHaveLength(receiptCount);
    expect(new Set(receipts.map((receipt) => receipt.rejectedAssumption))).toEqual(
      new Set(Array.from({ length: receiptCount }, (_, index) => `assumption-${index}`)),
    );
  });

  test("failed corrections preserve the state boundary without residue", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-intervention-failure-boundary-"));
    temporaryRoots.push(temporary);
    const stateRoot = join(temporary, "state");
    const observation = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "recovery", cwd: repositoryRoot, prompt: "recover" }) },
    );
    expect(observation.exitCode).toBe(0);
    const statePath = JSON.parse(observation.stdout).statePath as string;
    const missingState = join(temporary, "not-created", "nested", "missing.json");
    const missing = command([
      process.execPath,
      cli,
      "correct",
      "--state-file",
      missingState,
      "--rejected-assumption",
      "missing",
      "--new-invariant",
      "missing",
      "--affected-surface",
      "missing",
      "--next-probe",
      "missing",
    ]);
    expect(missing.exitCode).toBe(2);
    expect(existsSync(join(temporary, "not-created"))).toBe(false);

    writeFileSync(statePath, "not-json");
    const malformed = command([
      process.execPath,
      cli,
      "correct",
      "--state-file",
      statePath,
      "--rejected-assumption",
      "malformed",
      "--new-invariant",
      "malformed",
      "--affected-surface",
      "malformed",
      "--next-probe",
      "malformed",
    ]);
    expect(malformed.exitCode).toBe(2);
    expect(malformed.stderr).toContain("JSON Parse error");
    expect(existsSync(`${statePath}.receipts`)).toBe(false);
  });

  test("Codex and Claude adapters use the Rossovia home across target switches", () => {
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
    const statePaths = ["codex", "claude"].map((platform) => {
      const result = command([process.execPath, cli, "hook", "intervention", platform], {
        stdin: JSON.stringify(payload),
        env: environment,
      });
      expect(result.exitCode).toBe(0);
      const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext as string;
      expect(context).toContain("compare it with the active task");
      expect(context).toContain("revises an assumption or constraint of a still-active task");
      expect(context).toContain("Starting a new task after the prior task was completed, paused, or handed off is not a correction");
      expect(context).toContain("advisory, not a mutation or authorization gate");
      expect(context).toContain("do not request broader filesystem permission");
      expect(context).toContain(`'${process.execPath}' '${cli}' 'correct'`);
      expect(context).not.toContain("dist/rossovia.mjs");

      const marker = "session-local `correct` command prefix `";
      const endpoint = context.split(marker, 2)[1]?.split("`", 1)[0];
      expect(endpoint).toBeDefined();
      const statePath = endpoint!.match(/'--state-file' '([^']+)'$/)?.[1];
      expect(statePath).toBeDefined();
      const endpointResult = command([
        "/bin/sh",
        "-c",
        endpoint!
          + " '--rejected-assumption' 'the generated carrier is opaque'"
          + " '--new-invariant' 'the correction endpoint names the Bun source carrier'"
          + " '--affected-surface' 'runtime endpoint'"
          + " '--next-probe' 'execute the injected endpoint'",
      ], { env: environment });
      expect(endpointResult.exitCode).toBe(0);
      expect(JSON.parse(endpointResult.stdout).statePath).toBe(statePath!);
      return statePath!;
    });
    expect(new Set(statePaths).size).toBe(2);

    const targets = [join(home, "second-repository"), join(home, "third-repository"), join(home, "second-repository")];
    for (const statePath of statePaths) {
      const paths: string[] = [];
      for (const target of targets) {
        const correction = command([
          process.execPath,
          cli,
          "correct",
          "--state-file",
          statePath,
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
      const status = command([
        process.execPath,
        cli,
        "intervention",
        "status",
        "--state-file",
        statePath,
      ], { env: environment });
      expect(status.exitCode).toBe(0);
      expect(JSON.parse(status.stdout).receipts.map(
        (receipt: { affectedSurfaces: string[] }) => receipt.affectedSurfaces,
      )).toEqual(
        [["runtime endpoint"], ...targets.map((target) => [target])],
      );
    }
    expect(existsSync(join(home, ".codex", "intervention-reconciliation"))).toBe(false);
  });

  test("reports the exact state capability when a correction receipt cannot be persisted", () => {
    if (process.platform === "win32") return;
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-correction-read-only-"));
    temporaryRoots.push(temporary);
    const stateRoot = join(temporary, "state");
    const observation = command(
      [process.execPath, cli, "intervention", "observe", "--state-root", stateRoot],
      { stdin: JSON.stringify({ session_id: "read-only", cwd: repositoryRoot, prompt: "Change the invariant" }) },
    );
    expect(observation.exitCode).toBe(0);
    const statePath = JSON.parse(observation.stdout).statePath as string;
    const directory = dirname(statePath);
    chmodSync(directory, 0o555);
    try {
      const correction = workbench(
        "correct",
        "--state-file",
        statePath,
        "--rejected-assumption",
        "readable state is writable state",
        "--new-invariant",
        "the current runtime must prove exact write capability",
        "--affected-surface",
        "intervention receipt",
        "--next-probe",
        "retry from a fresh session with the exact state root granted",
      );
      expect(correction.exitCode).toBe(2);
      expect(correction.stderr).toContain(`cannot persist Rossovia state at ${statePath}`);
      expect(correction.stderr).toContain("grant write access to this exact state location");
      expect(readdirSync(directory).some((entry) => entry.endsWith(".tmp"))).toBe(false);
    } finally {
      chmodSync(directory, 0o755);
    }
  });
});
