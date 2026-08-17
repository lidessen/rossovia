import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Budget, CellInput, WorkspacePolicy } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import type { CellHost } from "../src/host-port";
import type { CellTool, CellToolExecutionContext } from "../src/tool-port";
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

describe("cancellation quiescence and the host-effect admission gate", () => {
  class CapturingReportDriver implements CellDriver {
    readonly descriptor = { adapter: "capturing-report", provider: "deterministic", model: "fixture" };
    savedContext: DriverContext | undefined;

    async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
      this.savedContext = context;
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

  class AbortWithInFlightWriteDriver implements CellDriver {
    readonly descriptor = { adapter: "abort-in-flight-write", provider: "deterministic", model: "fixture" };
    savedContext: DriverContext | undefined;
    abortListenerWrite: Promise<void> | undefined;

    async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
      this.savedContext = context;
      // Admit one host effect and leave it in flight: the driver never
      // awaits it, mirroring an admitted effect still live when
      // cancellation lands.
      void context.workspace.writeText("docs/late.md", "# Late\n");
      return await new Promise<DriverResult>((_resolve, reject) => {
        context.signal.addEventListener("abort", () => {
          // During synchronous AbortSignal dispatch this listener starts a
          // brand-new workspace write. The admission gate must already be
          // closed by runCell's earlier-registered abort listener, so the
          // write is refused and no file can land after return.
          this.abortListenerWrite = context.workspace.writeText("docs/aborted-new.md", "# New\n");
          reject(context.signal.reason);
        }, { once: true });
      });
    }
  }

  test("a normally admitted host effect reaches the final record and the gate closes after the driver settles", async () => {
    const fake = new FakeHost("/fake-admission");
    fake.seed("docs/source.md", "grounded\n");
    const input = writableCell("/fake-admission", "admission");
    const driver = new CapturingReportDriver();

    const record = await runCell(input, driver, { host: fake });

    expect(record.status).toBe("passed");
    expect(record.workspaceDiff).toEqual({ added: ["docs/report.md"], changed: [], removed: [] });
    expect(record.artifacts).toEqual([{
      path: "docs/report.md",
      bytes: Buffer.byteLength("# Report\ngrounded\n"),
      sha256: expect.any(String),
    }]);
    // The driver settled: the admission gate is closed, so no new
    // model-visible host effect can start after the final record.
    await expect(driver.savedContext!.workspace.writeText("docs/late.md", "late"))
      .rejects.toThrow("host-effect admission gate");
    // The final trace ends at the sealed terminal event.
    expect(record.trace[record.trace.length - 1]!.type).toBe("cell.finished");
  });

  test("a cancellation probe proves a late write cannot occur after return and the trace is sealed", async () => {
    const fake = new FakeHost("/fake-cancel");
    let writeStarted: (() => void) | undefined;
    let releaseWrite: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { writeStarted = resolve; });
    const deferredHost: CellHost = {
      async createWorkspace(policy, budget) {
        const base = await fake.createWorkspace(policy, budget);
        return {
          ...base,
          async writeText(path: string, content: string) {
            writeStarted?.();
            await new Promise<void>((resolve) => { releaseWrite = resolve; });
            return base.writeText(path, content);
          },
        };
      },
    };
    const input = writableCell("/fake-cancel", "cancel");
    delete input.artifacts;
    const controller = new AbortController();
    const driver = new AbortWithInFlightWriteDriver();

    // The trace observer fails exactly on the terminal event: sealing must
    // be literal, so the observer failure cannot append cell.observer.failed
    // after cell.finished.
    const running = runCell(input, driver, {
      host: deferredHost,
      signal: controller.signal,
      onTrace(event) {
        if (event.type === "cell.finished") throw new Error("observer failure at terminal event");
      },
    });
    // The write is admitted and its underlying effect is in flight.
    await started;
    controller.abort(new Error("caller cancellation"));
    // The driver's abort listener attempted a new write during synchronous
    // AbortSignal dispatch: the gate was already closed, so that promise
    // rejects and no file lands after return. The expectation is attached
    // before any await so the rejection is observed immediately.
    const abortedWrite = expect(driver.abortListenerWrite!).rejects.toThrow("host-effect admission gate");
    // The admitted write settles; the Cell joins it before the final.
    releaseWrite!();
    const record = await running;
    await abortedWrite;

    expect(record.status).toBe("cancelled");
    expect(record.error).toBe("caller cancellation");
    const workspace = await fake.createWorkspace(input.workspace, input.budget);
    await expect(workspace.readText("docs/aborted-new.md")).rejects.toThrow("file does not exist");
    // The admitted in-flight effect was joined before the snapshot: the
    // final truthfully retains it and nothing can land after return.
    expect(record.workspaceDiff).toEqual({ added: ["docs/late.md"], changed: [], removed: [] });
    await expect(workspace.readText("docs/late.md")).resolves.toBe("# Late\n");
    // After the final returned, the closed gate refuses every new
    // model-visible host effect.
    await expect(driver.savedContext!.workspace.writeText("docs/after.md", "after"))
      .rejects.toThrow("host-effect admission gate");
    await expect(workspace.readText("docs/after.md")).rejects.toThrow("file does not exist");
    // Observation is sealed as the terminal event is appended, before its
    // observer ran: the observer failure on cell.finished leaves no
    // cell.observer.failed after the terminal event, and nothing appends
    // through the driver's retained emit handle either.
    const lastEvent = record.trace[record.trace.length - 1]!;
    expect(lastEvent.type).toBe("cell.finished");
    expect(record.trace.some((event) => event.type === "cell.observer.failed")).toBe(false);
    const traceLength = record.trace.length;
    driver.savedContext!.emit("late.tool.event", { marker: true });
    expect(record.trace.length).toBe(traceLength);
    expect(record.trace.some((event) => event.type === "late.tool.event")).toBe(false);
  });

  test("an unchanged O2-style caller call settles the same record through the injected host", async () => {
    const fake = new FakeHost("/fake-compat");
    fake.seed("docs/source.md", "grounded\n");
    const input = writableCell("/fake-compat", "compat");

    // The exact unchanged call shape the O2 ordinary path uses:
    // runCell(cellInput, driver, { host }) with no additional options.
    const record = await runCell(input, new CapturingReportDriver(), { host: fake });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("report written");
    expect(record.trace[0]!.type).toBe("cell.started");
    expect(record.trace[record.trace.length - 1]!.type).toBe("cell.finished");
    expect(record.usage.totalTokens).toBe(2);
    expect(record.workspaceDiff).toEqual({ added: ["docs/report.md"], changed: [], removed: [] });
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

describe("caller-injected cell tools and the C2 admission boundary", () => {
  class AbortGateDriver implements CellDriver {
    readonly descriptor = { adapter: "abort-gate-fixture", provider: "deterministic", model: "fixture" };
    readonly supportsCellTools: true = true;
    events: string[] = [];
    savedContext: DriverContext | undefined;

    async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
      this.savedContext = context;
      // Admit one call; its settlement stays in the caller implementation's
      // hands, so quiescence is resolved only when the caller releases it.
      const admitted = context.cellTools!.execute("abort_probe", { phase: "admitted" }, "admitted-call");
      await new Promise<void>((resolve) => {
        if (context.signal.aborted) resolve();
        else context.signal.addEventListener("abort", () => resolve(), { once: true });
      });
      this.events.push("abort-observed");
      // After the abort the shared admission gate is closed: this new call
      // is refused before the caller implementation can run.
      await context.cellTools!.execute("abort_probe", { phase: "late" }, "late-call").then(
        () => {
          this.events.push("late-fulfilled");
        },
        () => {
          this.events.push("late-refused");
        },
      );
      await admitted.catch(() => {});
      return {
        terminalToolsCalled: [],
        finalText: "settled",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
        rawSteps: [],
      };
    }
  }

  test("abort closes the shared admission gate: an unsettled admitted call holds the final, a new call is refused without caller execution, and the drained cancelled final leaves no late effect or evidence", async () => {
    const fake = new FakeHost("/fake-cell-tool-abort");
    const input = writableCell("/fake-cell-tool-abort", "cell-tool-abort");
    delete input.artifacts;
    const controller = new AbortController();
    const executedInputs: unknown[] = [];
    const observedSignals: AbortSignal[] = [];
    let markAdmittedInFlight: (() => void) | undefined;
    let releaseAdmitted: (() => void) | undefined;
    const admittedInFlight = new Promise<void>((resolve) => { markAdmittedInFlight = resolve; });
    const admittedHold = new Promise<void>((resolve) => { releaseAdmitted = resolve; });
    const abortProbe: CellTool = {
      description: "Observe the combined execution signal until released.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async execute(probeInput: unknown, context: CellToolExecutionContext) {
        executedInputs.push(probeInput);
        observedSignals.push(context.signal);
        markAdmittedInFlight?.();
        // The caller implementation stays unsettled even after the signal
        // aborts: quiescence is proven only when the caller releases it.
        await admittedHold;
        return { aborted: context.signal.aborted };
      },
    };
    const driver = new AbortGateDriver();
    const recordPromise = runCell(input, driver, {
      host: fake,
      tools: { abort_probe: abortProbe },
      signal: controller.signal,
    });
    await admittedInFlight;
    controller.abort(new Error("caller cancelled the probe"));
    // One deterministic macrotask barrier: the driver observed the abort and
    // its post-abort call was refused by the already-closed gate without the
    // caller implementation ever running for it.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(driver.events).toEqual(["abort-observed", "late-refused"]);
    expect(executedInputs).toEqual([{ phase: "admitted" }]);
    // While the admitted call stays unsettled, quiescence is unproven and
    // the run truthfully produces no final.
    const whileHeld = await Promise.race([
      recordPromise.then(() => "final" as const, () => "rejected" as const),
      new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 100)),
    ]);
    expect(whileHeld).toBe("pending");
    // Release the admitted call: it settles with the Cell's exact combined
    // signal already aborted, the Cell drains it, and only then does the
    // cancelled final arrive.
    releaseAdmitted!();
    const record = await recordPromise;

    expect(record.status).toBe("cancelled");
    expect(record.error).toBe("caller cancelled the probe");
    expect(observedSignals[0]?.aborted).toBeTrue();
    expect(executedInputs).toEqual([{ phase: "admitted" }]);
    // Both the settled admitted evidence and the boundary refusal precede the
    // immutable final; nothing follows it.
    expect(record.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "abort_probe", toolCallId: "admitted-call", outcome: "fulfilled" },
    }));
    expect(record.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "abort_probe", toolCallId: "late-call", outcome: "refused" },
    }));
    const finishedIndex = record.trace.findIndex((event) => event.type === "cell.finished");
    expect(finishedIndex).toBe(record.trace.length - 1);
    expect(record.trace.slice(finishedIndex + 1)).toEqual([]);
    // After the final returned, the closed gate refuses every new call and
    // the sealed trace gains no late evidence: no effect and no event can
    // follow the final.
    const traceLength = record.trace.length;
    await expect(driver.savedContext!.cellTools!.execute("abort_probe", { phase: "post-final" }, "post-final-call"))
      .rejects.toThrow("tool admission gate is closed");
    expect(record.trace.length).toBe(traceLength);
    expect(executedInputs).toEqual([{ phase: "admitted" }]);
  });
});
