import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Budget, CellInput, WorkspacePolicy } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import { FilteredHost, FakeHost } from "../src/fake-host";
import { createLocalHost } from "../src/workspace";
import { runCell } from "../src/run-cell";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function writableCell(root: string, id: string): CellInput {
  return {
    id,
    intent: `Exercise the injected host port for ${id}.`,
    workspace: {
      root,
      readPaths: ["docs"],
      writePaths: ["docs"],
      excludePaths: ["docs/excluded.md"],
      allowedCommands: [],
    },
    instructions: ["Use only the granted host surface."],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["The run settles through the injected port alone."],
    artifacts: [{ path: "docs/report.md", instructions: "Write the bounded report inside the write scope." }],
    budget: { maxSteps: 4, maxDurationMs: 5_000, maxCommandOutputBytes: 4_000 },
  };
}

class WritesReportDriver implements CellDriver {
  readonly descriptor = { adapter: "host-port-regression", provider: "deterministic", model: "fixture" };

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    const source = await context.workspace.readText("docs/source.md");
    await context.workspace.writeText("docs/report.md", `# Report\n${source}`);
    return {
      terminalToolsCalled: [],
      finalText: "report written",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

class CapabilityProbeDriver implements CellDriver {
  readonly descriptor = { adapter: "capability-probe", provider: "deterministic", model: "fixture" };
  observed: { canRead: boolean; canWrite: boolean; canRunCommands: boolean } | undefined;
  writeError: string | undefined;

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    this.observed = {
      canRead: context.workspace.canRead,
      canWrite: context.workspace.canWrite,
      canRunCommands: context.workspace.canRunCommands,
    };
    try {
      await context.workspace.writeText("docs/report.md", "# Attempted\n");
    } catch (error) {
      this.writeError = error instanceof Error ? error.message : String(error);
    }
    return {
      terminalToolsCalled: [],
      finalText: "capability probe settled",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

async function realFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-host-port-real-"));
  temporaryRoots.push(root);
  return root;
}

describe("host port substitution", () => {
  test("one deterministic fake host and the real local adapter settle the same Cell contract", async () => {
    const realRoot = await realFixture();
    await mkdir(join(realRoot, "docs"), { recursive: true });
    await writeFile(join(realRoot, "docs", "source.md"), "grounded\n");
    const fakeRoot = "/fake-substitution";
    const fake = new FakeHost(fakeRoot);
    fake.seed("docs/source.md", "grounded\n");
    const input = writableCell(fakeRoot, "substitution");

    const [fakeRecord, realRecord] = await Promise.all([
      runCell(input, new WritesReportDriver(), { host: fake }),
      runCell(writableCell(realRoot, "substitution"), new WritesReportDriver(), {
        host: createLocalHost(),
      }),
    ]);

    expect(fakeRecord.status).toBe("passed");
    expect(realRecord.status).toBe("passed");
    expect(fakeRecord.artifacts).toEqual([{
      path: "docs/report.md",
      bytes: Buffer.byteLength("# Report\ngrounded\n"),
      sha256: realRecord.artifacts[0]!.sha256,
    }]);
    expect(fakeRecord.workspaceDiff).toEqual({ added: ["docs/report.md"], changed: [], removed: [] });
    expect(fakeRecord.workspaceDiff).toEqual(realRecord.workspaceDiff);
    expect(fakeRecord.usage).toEqual(realRecord.usage);
    expect(fakeRecord.finalText).toBe(realRecord.finalText);
    expect(fakeRecord.verification).toMatchObject({ passed: true, artifacts: { passed: true } });
  });
});

describe("self-declared capability is not host authority", () => {
  test("capabilitiesRequired satisfied by self-declared capabilities never opens a write or command surface", async () => {
    const fake = new FakeHost("/fake-capability");
    fake.seed("docs/source.md", "grounded\n");
    const input = writableCell("/fake-capability", "self-declared");
    input.workspace.writePaths = [];
    input.workspace.allowedCommands = [];
    // The Cell self-declares write and command capabilities, and declares
    // them required: the capability check passes, yet no host effect exists.
    input.capabilities = ["read", "write", "run_command"];
    input.capabilitiesRequired = ["read", "write", "run_command"];
    delete input.artifacts;

    const driver = new CapabilityProbeDriver();
    const record = await runCell(input, driver, { host: fake });

    expect(record.status).toBe("passed");
    expect(record.status).not.toBe("capability_mismatch");
    expect(driver.observed).toEqual({ canRead: true, canWrite: false, canRunCommands: false });
    expect(driver.writeError).toContain("outside declared scope");
    expect(record.workspaceDiff).toEqual({ added: [], changed: [], removed: [] });
  });

  test("a capability-filtered port removes the declared surface even when the policy allows it", async () => {
    const fake = new FakeHost("/fake-filtered");
    fake.seed("docs/source.md", "grounded\n");
    const input = writableCell("/fake-filtered", "filtered");
    const filtered = new FilteredHost(fake, { canWrite: false });

    const driver = new CapabilityProbeDriver();
    const record = await runCell(input, driver, { host: filtered });

    expect(record.status).toBe("passed");
    expect(driver.observed).toEqual({ canRead: true, canWrite: false, canRunCommands: false });
    // The delegated port still enforces the policy scope; the filtered flag
    // removed the model-visible capability but not the underlying scope law.
    expect(driver.writeError).toBeUndefined();
    const workspace = await filtered.createWorkspace(input.workspace, input.budget);
    expect(workspace.canWrite).toBe(false);
  });

  test("a filtered real local adapter preserves the complete HostWorkspace behavior", async () => {
    const realRoot = await realFixture();
    await mkdir(join(realRoot, "docs"), { recursive: true });
    await writeFile(join(realRoot, "docs", "source.md"), "grounded\n");
    const input = writableCell(realRoot, "filtered-local");
    // The local adapter workspace is a class instance whose methods live on
    // the prototype: a shallow-spread wrapper loses snapshot, readText, diff,
    // and every other method. The wrapper must delegate them explicitly.
    const filtered = new FilteredHost(createLocalHost(), { canWrite: false });
    const workspace = await filtered.createWorkspace(input.workspace, input.budget);

    expect(workspace.canRead).toBe(true);
    expect(workspace.canWrite).toBe(false);
    expect(workspace.canRunCommands).toBe(false);
    await expect(workspace.readText("docs/source.md")).resolves.toBe("grounded\n");
    await expect(workspace.listFiles("docs")).resolves.toEqual(["docs/source.md"]);
    const before = await workspace.snapshot();
    expect(before.get("docs/source.md")).toMatch(/^[a-f0-9]{64}$/);
    await workspace.createText("docs/added.md", "new\n");
    const after = await workspace.snapshot();
    expect(workspace.diff(before, after)).toEqual({ added: ["docs/added.md"], changed: [], removed: [] });
    await expect(workspace.assertEditable("docs/source.md")).resolves.toBe(
      join(await realpath(realRoot), "docs", "source.md"),
    );
  });

  test("a missing required capability still settles capability_mismatch without starting the driver", async () => {
    const fake = new FakeHost("/fake-mismatch");
    const input = writableCell("/fake-mismatch", "mismatch");
    input.capabilities = ["read"];
    input.capabilitiesRequired = ["read", "unavailable-capability"];
    let ran = false;
    const driver: CellDriver = {
      descriptor: { adapter: "never-starts", provider: "deterministic", model: "fixture" },
      async run() {
        ran = true;
        throw new Error("driver must not start");
      },
    };

    const record = await runCell(input, driver, { host: fake });

    expect(record.status).toBe("capability_mismatch");
    expect(record.error).toBe("missing capabilities: unavailable-capability");
    expect(ran).toBe(false);
  });
});

describe("fake-host deterministic command and root parity", () => {
  function commandCell(root: string, id: string, maxCommandOutputBytes = 4_000): CellInput {
    return {
      id,
      intent: `Exercise the deterministic fake command port for ${id}.`,
      workspace: {
        root,
        readPaths: ["."],
        writePaths: [],
        excludePaths: [],
        allowedCommands: ["git"],
      },
      instructions: ["Run only registered deterministic commands."],
      capabilities: [],
      context: [],
      capabilitiesRequired: [],
      acceptance: ["Command outcomes come from registered results alone."],
      budget: { maxSteps: 2, maxDurationMs: 5_000, maxCommandOutputBytes },
    };
  }

  test("an allowed but unregistered command fails visibly instead of inventing success", async () => {
    const fake = new FakeHost("/fake-command");
    const cell = commandCell("/fake-command", "unregistered");
    const workspace = await fake.createWorkspace(cell.workspace, cell.budget);

    await expect(workspace.runCommand(["git", "status"]))
      .rejects.toThrow("command is allowed but has no registered deterministic result: git status");
  });

  test("a registered deterministic command retains output truncation and caller abort behavior", async () => {
    const fake = new FakeHost("/fake-command-registered");
    fake.registerCommand(["git", "log"], { exitCode: 0, stdout: "x".repeat(1_000) });
    const cell = commandCell("/fake-command-registered", "registered", 64);
    const workspace = await fake.createWorkspace(cell.workspace, cell.budget);

    const result = await workspace.runCommand(["git", "log"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("[truncated]");
    expect(result.stdout.length).toBeLessThan(1_000);

    const controller = new AbortController();
    controller.abort(new Error("caller aborted command"));
    await expect(workspace.runCommand(["git", "log"], ".", 60_000, controller.signal))
      .rejects.toThrow("caller aborted command");
  });

  test("distinct argv arrays never share one registered command identity", async () => {
    const fake = new FakeHost("/fake-command-identity");
    fake.registerCommand(["git", "show a"], {
      exitCode: 0,
      stdout: "one-token argument result\n",
    });
    const cell = commandCell("/fake-command-identity", "command-identity");
    const workspace = await fake.createWorkspace(cell.workspace, cell.budget);

    // `["git", "show", "a"]` is a different argv array: registering
    // `["git", "show a"]` must never authorize or answer it, even though
    // both arrays display identically when space-joined.
    await expect(workspace.runCommand(["git", "show", "a"]))
      .rejects.toThrow("command is allowed but has no registered deterministic result: git show a");

    const result = await workspace.runCommand(["git", "show a"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("one-token argument result\n");
  });

  test("fake and local hosts reject a relative workspace root with the same refusal", async () => {
    const policy: WorkspacePolicy = {
      root: "relative/workspace",
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    };
    const budget: Budget = { maxDurationMs: 1_000, maxCommandOutputBytes: 4_000 };
    const fake = new FakeHost("/fake-root-parity");

    await expect(fake.createWorkspace(policy, budget))
      .rejects.toThrow("workspace.root must be absolute");
    await expect(createLocalHost().createWorkspace(policy, budget))
      .rejects.toThrow("workspace.root must be absolute");
  });
});

describe("fake-host scope, exclude, artifact, and diff regressions", () => {
  test("reads and writes stay inside the declared scopes and exclusions", async () => {
    const fake = new FakeHost("/fake-scope");
    fake.seed("docs/source.md", "grounded\n");
    fake.seed("docs/excluded.md", "hidden\n");
    const input = writableCell("/fake-scope", "scope");
    const workspace = await fake.createWorkspace(input.workspace, input.budget);

    await expect(workspace.readText("other.md")).rejects.toThrow("outside declared scope");
    await expect(workspace.writeText("other/report.md", "x")).rejects.toThrow("outside declared scope");
    await expect(workspace.readText("docs/excluded.md")).rejects.toThrow("excluded by workspace policy");
    await expect(workspace.readText("/docs/source.md")).rejects.toThrow("absolute workspace path is not allowed");
    await expect(workspace.readText("../escape.md")).rejects.toThrow("path escapes workspace");
    expect(await workspace.listFiles("docs")).toEqual(["docs/source.md"]);
  });

  test("a caller abort signal cancels the Cell through the fake host", async () => {
    const fake = new FakeHost("/fake-abort");
    const controller = new AbortController();
    const driver: CellDriver = {
      descriptor: { adapter: "abort-aware", provider: "deterministic", model: "fixture" },
      async run(_input, context) {
        return await new Promise<DriverResult>((_resolve, reject) => {
          context.signal.addEventListener("abort", () => reject(context.signal.reason), { once: true });
        });
      },
    };
    const input = writableCell("/fake-abort", "abort");
    delete input.artifacts;

    const running = runCell(input, driver, { host: fake, signal: controller.signal });
    await Promise.resolve();
    controller.abort(new Error("caller cancellation"));
    const record = await running;

    expect(record.status).toBe("cancelled");
    expect(record.error).toBe("caller cancellation");
  });

  test("an unchanged declared artifact fails verification while the diff stays truthful", async () => {
    const fake = new FakeHost("/fake-artifact");
    fake.seed("docs/source.md", "grounded\n");
    fake.seed("docs/report.md", "# Pre-existing\n");
    const input = writableCell("/fake-artifact", "unchanged-artifact");

    // A driver that performs no write: the declared artifact exists but was
    // not created or changed by this run.
    const driver: CellDriver = {
      descriptor: { adapter: "artifact-skip", provider: "deterministic", model: "fixture" },
      async run() {
        return {
          terminalToolsCalled: [],
          finalText: "no write performed",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
          rawSteps: [],
        };
      },
    };
    const record = await runCell(input, driver, { host: fake });

    expect(record.status).toBe("verification_failed");
    expect(record.verification.artifacts).toEqual({
      passed: false,
      errors: ["artifact was not created or changed by this run: docs/report.md"],
    });
    expect(record.workspaceDiff).toEqual({ added: [], changed: [], removed: [] });
  });

  test("added and changed paths are retained in the workspace diff while removed stays empty", async () => {
    const fake = new FakeHost("/fake-diff");
    fake.seed("docs/source.md", "before\n");
    fake.seed("docs/removed.md", "old\n");
    const input = writableCell("/fake-diff", "diff");
    delete input.artifacts;

    const driver: CellDriver = {
      descriptor: { adapter: "diff-exercise", provider: "deterministic", model: "fixture" },
      async run(_input, context) {
        await context.workspace.writeText("docs/source.md", "after\n");
        await context.workspace.createText("docs/added.md", "new\n");
        return {
          terminalToolsCalled: [],
          finalText: "diff exercised",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
          rawSteps: [],
        };
      },
    };
    const record = await runCell(input, driver, { host: fake });

    expect(record.status).toBe("passed");
    expect(record.workspaceDiff).toEqual({
      added: ["docs/added.md"],
      changed: ["docs/source.md"],
      removed: [],
    });
  });
});
