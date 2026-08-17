import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import type { CellInput, CellRunRecord, CellUsage, TraceEvent } from "../src/contracts";
import { CellExecutionError, type DriverContext } from "../src/driver";
import { createLiveTraceFile } from "../src/live-trace-file";
import { runCell } from "../src/run-cell";
import {
  BunOpenCodeCliProcessAdapter,
  OpenCodeCliDriver,
  type OpenCodeCliProcessAdapter,
  type OpenCodeCliProcessRequest,
  type OpenCodeCliProcessResult,
  type OpenCodeCliServerAdapter,
  type OpenCodeCliServerHandle,
} from "../src/opencode-cli-driver";
import { createLocalHost } from "../src/workspace";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("OpenCode CLI driver", () => {
  test("uses exact fresh argv, canonical root, current environment, and bounded prompt", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let request: OpenCodeCliProcessRequest | undefined;
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      request = candidate;
      return success();
    }), { reasoningEffort: "high" });
    const observation = context(canonicalRoot);

    await driver.run(cellInput(root), observation.value);

    const prompt = request!.argv[1]!;
    expect(request!.executable).toBe("/fixture/bin/opencode");
    expect(request!.cwd).toBe(canonicalRoot);
    expect(request!.stdin).toBe("");
    expect(request!.environment.PATH).toBe(process.env.PATH);
    expect(request!.argv).toEqual([
      "run", prompt, "--pure", "--auto", "--format", "json", "--model", "anthropic/fixture",
      "--variant", "high", "--dir", canonicalRoot,
    ]);
    for (const text of [
      "Review the implementation.", "Follow the fixture instructions.", "Fixture evidence",
      "Return a concise result.", "Workspace policy", "Read repository guidance",
      "disposable worktree", "make only the requested changes", "Run the named checks",
      "changed files, checks, and remaining uncertainty",
    ]) expect(prompt).toContain(text);
    expect(prompt).not.toContain("ordinary todos");
    expect(prompt).not.toContain("todowrite");
    expect(driver.descriptor).toEqual({
      adapter: "opencode-cli.v1", provider: "anthropic", model: "anthropic/fixture",
    });
  });

  test("initializes seeded tasks as native session todos and attaches the CLI run to that session", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const requests: OpenCodeCliProcessRequest[] = [];
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      requests.push(candidate);
      if (candidate.argv[0] === "db") {
        return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      }
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [
      { subject: "Adopt the todos", description: "Adopt the todos through todowrite." },
      { subject: "Run the named checks", description: "Run the named checks." },
    ];

    await driver.run(input, context(canonicalRoot).value);

    const runRequest = requests.find((candidate) => candidate.argv[0] === "run")!;
    const seededId = runRequest.argv[runRequest.argv.indexOf("--session") + 1]!;
    expect(seededId).toBe("ses_fixture");
    expect(runRequest.argv).toContain("--attach");
    expect(runRequest.argv).toContain(server.url);
    expect(runRequest.argv.slice(-4)).toEqual(["--attach", server.url, "--dir", canonicalRoot]);
    const prompt = runRequest.argv[1]!;
    expect(prompt).not.toContain("ordinary todos");
    expect(prompt).not.toContain("todowrite");
    expect(prompt).not.toContain("already created");

    const native = new Database(dbPath);
    const rows = native.query(
      "select session_id, content, status, priority, position from todo order by position",
    ).all() as Array<Record<string, string | number>>;
    native.close();
    expect(rows.map((row) => row.content)).toEqual(["Adopt the todos", "Run the named checks"]);
    expect(rows.map((row) => row.position)).toEqual([0, 1]);
    for (const row of rows) {
      expect(row.session_id).toBe("ses_fixture");
      expect(row.status).toBe("pending");
      expect(row.priority).toBe("high");
    }
    expect(server.calls).toEqual([
      "POST /session",
      "GET /session/ses_fixture/todo",
      "GET /session/ses_fixture/todo",
    ]);
    expect(requests.map((candidate) => candidate.argv[0])).toEqual(["db", "run"]);
    expect(server.stopped).toBe(true);
  });

  test("fails visibly when the seeded todos cannot be verified and never launches the run", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, { todoResponse: () => [] });
    const requests: OpenCodeCliProcessRequest[] = [];
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      requests.push(candidate);
      if (candidate.argv[0] === "db") {
        return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      }
      return success();
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode todo initialization verification failed: expected [\"Adopt the todos\"] but the session reports []",
    });
    expect(server.calls).toEqual(["POST /session", "GET /session/ses_fixture/todo", "DELETE /session/ses_fixture"]);
    expect(requests.map((candidate) => candidate.argv[0])).toEqual(["db"]);
    expect(server.stopped).toBe(true);
  });

  test("deletes the created session when the native todo write fails, preserving the original failure", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = join(root, "opencode-broken.db");
    const broken = new Database(dbPath);
    broken.close();
    const server = await fakeOpenCodeServer(dbPath);
    const requests: OpenCodeCliProcessRequest[] = [];
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      requests.push(candidate);
      if (candidate.argv[0] === "db") {
        return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      }
      return success();
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: expect.stringContaining("OpenCode native todo initialization failed"),
    });
    expect(server.calls).toEqual(["POST /session", "DELETE /session/ses_fixture"]);
    expect(requests.map((candidate) => candidate.argv[0])).toEqual(["db"]);
    expect(server.stopped).toBe(true);
  });

  test("deletes the created session when the database path lookup fails, preserving the original failure", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const requests: OpenCodeCliProcessRequest[] = [];
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      requests.push(candidate);
      if (candidate.argv[0] === "db") {
        return { exitCode: 9, stdout: "", stderr: "fixture db path failure", durationMs: 1 };
      }
      return success();
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI db path exited with code 9: fixture db path failure",
    });
    expect(server.calls).toEqual(["POST /session", "DELETE /session/ses_fixture"]);
    expect(requests.map((candidate) => candidate.argv[0])).toEqual(["db"]);
    expect(server.stopped).toBe(true);
  });

  test("deletes the created session after a command failure and preserves the command error", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return {
        exitCode: 19,
        stdout: jsonLines(event("step_finish", { reason: "error", tokens: {} }, "ses_fixture")),
        stderr: "fixture command failure",
        durationMs: 3,
      };
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI exited with code 19: fixture command failure",
    });
    expect(server.calls.at(-1)).toBe("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("deletes the created session after a timeout and preserves the timeout error", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return await new Promise<OpenCodeCliProcessResult>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
      });
    }), { serverAdapter: server.adapter, timeoutMs: 200 });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI execution timed out after 200ms",
    });
    expect(server.calls.at(-1)).toBe("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("deletes the created session when successful exit lacks final text and preserves that error", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return {
        exitCode: 0,
        stdout: jsonLines(event("step_start", {}, "ses_fixture")),
        stderr: "",
        durationMs: 3,
      };
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI completed without final stopped-step text",
    });
    expect(server.calls.at(-1)).toBe("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("fails visibly when the loopback server cannot start, without a silent prompt fallback", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let runs = 0;
    const driver = openCodeDriver(root, fixtureProcess(async () => { runs += 1; return success(); }), {
      serverAdapter: {
        async start() {
          throw new Error("fixture serve failure");
        },
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI todo seeding could not start the loopback server: fixture serve failure",
    });
    expect(runs).toBe(0);
  });

  test("projects final native todos so runCell verifies supplied task completion", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        return [{ content: "Adopt the todos", status: call === 1 ? "pending" : "completed", priority: "high" }];
      },
    });
    const executable = await fixtureExecutable(root, [
      `if [ "$1" = "db" ]; then echo "${dbPath}"; exit 0; fi`,
      `printf '%s\\n' '{"type":"step_start","sessionID":"ses_fixture","part":{}}'`,
      `printf '%s\\n' '{"type":"text","sessionID":"ses_fixture","part":{"text":"Todos seeded."}}'`,
      `printf '%s\\n' '{"type":"step_finish","sessionID":"ses_fixture","part":{"reason":"stop","cost":0,"tokens":{"input":1,"output":1,"total":2,"cache":{"read":0}}}}'`,
    ]);
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = new OpenCodeCliDriver({
      executable,
      model: "anthropic/fixture",
      workspacePolicy: { select: () => canonicalRoot },
      processAdapter: new BunOpenCodeCliProcessAdapter(),
      serverAdapter: server.adapter,
    });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Todos seeded.");
    expect(record.verification.tasks).toMatchObject({ passed: true, completed: 1 });
    expect(record.tasks).toEqual([{
      id: "task-1",
      subject: "Adopt the todos",
      description: "Adopt the todos",
      status: "completed",
      owner: "opencode-fixture",
      blockedBy: [],
    }]);
    expect(server.stopped).toBe(true);
  });

  test("projects nonterminal native todos so runCell rejects an unsettled seeded task", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath);
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("verification_failed");
    expect(record.verification.tasks).toMatchObject({ passed: false, pending: 1 });
    expect(record.error).toContain("task cycle is unsettled");
    expect(server.calls).not.toContain("DELETE /session/ses_fixture");
  });

  test("projects worker-refined native todos at completion and settles mechanically", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) {
          return [
            { content: "Adopt the todos", status: "pending", priority: "high" },
            { content: "Run the named checks", status: "pending", priority: "high" },
          ];
        }
        return [{ content: "Refined: finish the bounded changes", status: "completed", priority: "high" }];
      },
    });
    const input = cellInput(root);
    input.tasks = [
      { subject: "Adopt the todos", description: "Adopt the todos through todowrite." },
      { subject: "Run the named checks", description: "Run the named checks." },
    ];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("passed");
    expect(record.verification.tasks).toMatchObject({ passed: true, completed: 1 });
    expect(record.tasks).toEqual([{
      id: "task-1",
      subject: "Refined: finish the bounded changes",
      description: "Refined: finish the bounded changes",
      status: "completed",
      owner: "opencode-fixture",
      blockedBy: [],
    }]);
    expect(server.calls).toEqual([
      "POST /session",
      "GET /session/ses_fixture/todo",
      "GET /session/ses_fixture/todo",
    ]);
    expect(server.stopped).toBe(true);
  });

  test("rejects a refined nonterminal native todo projection", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) return [{ content: "Adopt the todos", status: "pending", priority: "high" }];
        return [{ content: "Refined: still working", status: "in_progress", priority: "high" }];
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("verification_failed");
    expect(record.verification.tasks).toMatchObject({ passed: false, inProgress: 1 });
    expect(record.error).toContain("task cycle is unsettled");
    expect(server.calls).not.toContain("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("accepts a resumed session whose native todos no longer match the supplied seeds", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) return [{ content: "Refined: continue the bounded changes", status: "in_progress", priority: "high" }];
        return [{ content: "Refined: continue the bounded changes", status: "completed", priority: "high" }];
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("resume-123");
    }), { serverAdapter: server.adapter, sessionId: "resume-123" });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("passed");
    expect(record.verification.tasks).toMatchObject({ passed: true, completed: 1 });
    expect(record.tasks).toEqual([{
      id: "task-1",
      subject: "Refined: continue the bounded changes",
      description: "Refined: continue the bounded changes",
      status: "completed",
      owner: "opencode-fixture",
      blockedBy: [],
    }]);
    expect(server.calls).toEqual([
      "GET /session/resume-123/todo",
      "GET /session/resume-123/todo",
    ]);
    expect(server.stopped).toBe(true);
  });

  test("fails settlement when the final native todo projection is empty", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) return [{ content: "Adopt the todos", status: "pending", priority: "high" }];
        return [];
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("verification_failed");
    expect(record.tasks).toEqual([]);
    expect(record.verification.tasks).toEqual({
      passed: false,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      errors: ["driver completed with an empty task projection"],
    });
    expect(record.error).toBe("driver completed with an empty task projection");
    expect(server.calls).not.toContain("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("fails visibly on a malformed native todo status in the final projection", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) return [{ content: "Adopt the todos", status: "pending", priority: "high" }];
        return [{ content: "Finished todo", status: "done", priority: "high" }];
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode final todo projection returned invalid status at position 0: done");
    expect(server.calls.at(-1)).toBe("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("fails visibly on a native todo without content in the final projection", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const dbPath = await todoDatabase(root);
    const server = await fakeOpenCodeServer(dbPath, {
      todoResponse(call) {
        if (call === 1) return [{ content: "Adopt the todos", status: "pending", priority: "high" }];
        return [{ status: "completed", priority: "high" }];
      },
    });
    const input = cellInput(root);
    input.tasks = [{ subject: "Adopt the todos", description: "Adopt the todos through todowrite." }];
    const driver = openCodeDriver(root, fixtureProcess(async (request) => {
      if (request.argv[0] === "db") return { exitCode: 0, stdout: `${dbPath}\n`, stderr: "", durationMs: 1 };
      return success("ses_fixture");
    }), { serverAdapter: server.adapter });

    const record = await runCell(input, driver, { host: createLocalHost() });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode final todo projection returned a missing or empty todo at position 0");
    expect(server.calls.at(-1)).toBe("DELETE /session/ses_fixture");
    expect(server.stopped).toBe(true);
  });

  test("puts resume session before dir", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let request!: OpenCodeCliProcessRequest;
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      request = candidate;
      return success("resume-123");
    }), { sessionId: "resume-123" });

    await driver.run(cellInput(root), context(canonicalRoot).value);

    expect(request.argv.slice(-4)).toEqual(["--session", "resume-123", "--dir", canonicalRoot]);
  });

  test("retains events, session, stopped-step text, usage, cache, cost, stderr, and raw evidence", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: jsonLines(
        event("step_start", {}),
        event("text", { text: "First " }),
        event("text", { text: "result." }),
        event("step_finish", {
          reason: "stop", cost: 0.012,
          tokens: { input: 20, output: 7, total: 27, cache: { read: 9 } },
        }),
      ),
      stderr: "fixture warning",
      durationMs: 17,
    })));
    const observation = context(canonicalRoot);

    const result = await driver.run(cellInput(root), observation.value);

    expect(result.finalText).toBe("First result.");
    expect(result.terminalToolsCalled).toEqual([]);
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 7, totalTokens: 27, cachedInputTokens: 9 });
    expect(observation.usages).toEqual([result.usage]);
    expect(result.providerMetadata).toEqual({
      adapter: "opencode-cli.v1", sessionId: "session-1", exitCode: 0, durationMs: 17,
      observedCost: 0.012,
    });
    expect(observation.emitted.filter(({ type }) => type === "opencode.cli.event")).toHaveLength(4);
    expect(observation.emitted).toContainEqual({ type: "opencode.cli.stderr", data: { text: "fixture warning" } });
    expect(result.rawSteps).toContainEqual({
      type: "opencode.cli.process", exitCode: 0, durationMs: 17, stderr: "fixture warning",
    });
  });

  test("retains malformed stdout and fails without stopped-step text", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: `malformed\n${jsonLines(event("step_start", {}), event("text", { text: "unfinished" }))}`,
      stderr: "",
      durationMs: 2,
    })));
    const observation = context(canonicalRoot);

    await expect(driver.run(cellInput(root), observation.value)).rejects.toMatchObject({
      message: "OpenCode CLI completed without final stopped-step text",
    });
    expect(observation.emitted).toContainEqual({
      type: "opencode.cli.stdout.unparsed",
      data: { type: "opencode.cli.stdout.unparsed", line: "malformed" },
    });
    expect(observation.usages).toHaveLength(1);
  });

  test("rejects empty stopped-step text", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      ...success(),
      stdout: jsonLines(
        event("step_start", {}),
        event("text", { text: " \n\t" }),
        event("step_finish", { reason: "stop", tokens: {} }),
      ),
    })));

    await expect(driver.run(cellInput(root), context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI completed without final stopped-step text",
    });
  });

  test("rejects conflicting sessions", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      ...success(),
      stdout: jsonLines(
        event("step_start", {}, "one"),
        event("text", { text: "done" }, "two"),
        event("step_finish", { reason: "stop", tokens: {} }, "two"),
      ),
    })));

    await expect(driver.run(cellInput(root), context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI returned conflicting session ids: one, two",
    });
  });

  test("nonzero exit retains observed usage", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 19,
      stdout: jsonLines(event("step_finish", {
        reason: "error", cost: 0.2,
        tokens: { input: 13, output: 2, total: 15, cache: { read: 3 } },
      })),
      stderr: "provider rejected request",
      durationMs: 4,
    })));

    try {
      await driver.run(cellInput(root), context(canonicalRoot).value);
      throw new Error("expected driver failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CellExecutionError);
      expect((error as CellExecutionError).message).toBe("OpenCode CLI exited with code 19: provider rejected request");
      expect((error as CellExecutionError).usage).toEqual({
        inputTokens: 13, outputTokens: 2, totalTokens: 15, cachedInputTokens: 3,
      });
    }
  });

  test("propagates cancellation and enforces timeout", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let started!: () => void;
    const processStarted = new Promise<void>((resolve) => { started = resolve; });
    const blocking = fixtureProcess(async (request) => {
      started();
      return await new Promise<OpenCodeCliProcessResult>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
      });
    });
    const controller = new AbortController();
    const cancelled = openCodeDriver(root, blocking).run(cellInput(root), context(canonicalRoot, controller.signal).value);
    await processStarted;
    controller.abort(new Error("fixture cancellation"));
    await expect(cancelled).rejects.toMatchObject({ message: "fixture cancellation" });

    const timedOut = openCodeDriver(root, blocking, { timeoutMs: 5 }).run(
      cellInput(root), context(canonicalRoot).value,
    );
    await expect(timedOut).rejects.toMatchObject({ message: "OpenCode CLI execution timed out after 5ms" });
  });

  test("rejects unsupported contracts before process launch", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    for (const field of ["terminalTools", "outputSchema"] as const) {
      let runs = 0;
      const driver = openCodeDriver(root, fixtureProcess(async () => { runs += 1; return success(); }));
      const input = { ...cellInput(root), [field]: [] } as CellInput;
      await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
        message: `OpenCode CLI driver does not support ${field}`,
      });
      expect(runs).toBe(0);
    }
  });

  test("requires full-worktree change capture before process launch", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let runs = 0;
    const driver = openCodeDriver(root, fixtureProcess(async () => { runs += 1; return success(); }));
    const narrowInput = cellInput(root);
    narrowInput.workspace.writePaths = ["src"];

    await expect(driver.run(narrowInput, context(canonicalRoot).value)).rejects.toMatchObject({
      message: 'OpenCode CLI driver requires workspace.writePaths to include "." for full-worktree change capture',
    });
    expect(runs).toBe(0);

    await driver.run(cellInput(root), context(canonicalRoot).value);
    expect(runs).toBe(1);
  });

  test("delivers structured live progress to the trace JSONL before the child exits", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_start","sessionID":"slow-1","part":{}}'`,
      "sleep 1",
      `printf '%s\\n' '{"type":"text","sessionID":"slow-1","part":{"text":"Complete."}}'`,
      "sleep 1",
      `printf '%s\\n' '{"type":"step_finish","sessionID":"slow-1","part":{"reason":"stop","cost":0.01,"tokens":{"input":5,"output":3,"total":8,"cache":{"read":0}}}}'`,
    ]);
    const input = cellInput(root);
    input.budget.maxDurationMs = 15_000;
    const observed: TraceEvent[] = [];
    const liveTrace = createLiveTraceFile(join(root, "cell-input.json"), () => {});
    const startedAt = performance.now();
    const run = runCell(input, realDriver(root, executable), {
      host: createLocalHost(),
      onTrace(event) {
        observed.push(event);
        liveTrace.observe(event);
      },
    });

    const first = await waitFor(
      () => observed.find((event) => event.type === "opencode.cli.progress"),
      2_000,
    );
    const elapsedBeforeFirstProgress = performance.now() - startedAt;
    expect(elapsedBeforeFirstProgress).toBeLessThan(1_500);
    expect(first!.data).toEqual({ type: "step_start", sessionID: "slow-1" });
    expect(JSON.stringify(first!.data)).not.toContain("text");

    const record = await run;
    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Complete.");
    expect(record.executionObservation.sessionId).toBe("slow-1");
    expect(record.usage).toEqual({ inputTokens: 5, outputTokens: 3, totalTokens: 8, cachedInputTokens: 0 });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(3);
    expect(observed.filter((event) => event.type === "opencode.cli.event")).toHaveLength(3);
    expect(executionRawSteps(record).filter((step) => rawStepText(step) === "Complete.")).toHaveLength(1);

    const jsonlPath = liveTrace.availablePath();
    expect(jsonlPath).toBeDefined();
    const jsonl = await readFile(jsonlPath!, "utf8");
    const progressLines = jsonl.split("\n").filter((line) => line.includes('"opencode.cli.progress"'));
    expect(progressLines.length).toBeGreaterThanOrEqual(1);
    for (const line of progressLines) {
      const event = JSON.parse(line) as TraceEvent;
      const keys = Object.keys(event.data as Record<string, unknown>);
      expect(keys.every((key) => ["type", "sessionID", "tool"].includes(key))).toBe(true);
      expect(keys).not.toContain("part");
      expect(keys).not.toContain("text");
      expect(keys).not.toContain("reasoning");
      expect(keys).not.toContain("input");
      expect(keys).not.toContain("output");
    }
  });

  test("buffers stdout lines spanning chunk boundaries and parses each line exactly once", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s' '{"type":"step_start","sessionID":"chunked-1","part":{"note":"ignored"'`,
      "sleep 0.3",
      `printf '%s\\n' '}}'`,
      `printf '%s\\n' '{"type":"text","sessionID":"chunked-1","part":{"text":"Chunked."}}'`,
      `printf '%s' '{"type":"step_finish","sessionID":"chunked-1","part":{"reason":"stop","cost":0.02,"tokens":{"input":2,"output":4,"total":6,"cache":{"read":1}}}}'`,
    ]);
    const observed: TraceEvent[] = [];
    const record = await runCell(cellInput(root), realDriver(root, executable), {
      host: createLocalHost(),
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Chunked.");
    expect(record.usage).toEqual({ inputTokens: 2, outputTokens: 4, totalTokens: 6, cachedInputTokens: 1 });
    expect(observed.find((event) => event.type === "opencode.cli.progress")?.data).toEqual({
      type: "step_start",
      sessionID: "chunked-1",
    });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(3);
    expect(observed.filter((event) => event.type === "opencode.cli.event")).toHaveLength(3);
    expect(executionRawSteps(record).filter((step) => rawStepText(step) === "Chunked.")).toHaveLength(1);
  });

  test("projects the string tool name of a real-shape tool_use event without its state", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_start","sessionID":"tool-1","part":{}}'`,
      `printf '%s\\n' '{"type":"tool","sessionID":"tool-1","part":{"type":"tool","tool":"bash","state":{"input":{"command":"ls -la"},"output":"fixture result"}}}'`,
      `printf '%s\\n' '{"type":"text","sessionID":"tool-1","part":{"text":"Done."}}'`,
      `printf '%s\\n' '{"type":"step_finish","sessionID":"tool-1","part":{"reason":"stop","cost":0,"tokens":{"input":1,"output":1,"total":2,"cache":{"read":0}}}}'`,
    ]);
    const observed: TraceEvent[] = [];
    const record = await runCell(cellInput(root), realDriver(root, executable), {
      host: createLocalHost(),
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Done.");
    const progressData = observed
      .filter((event) => event.type === "opencode.cli.progress")
      .map((event) => event.data);
    expect(progressData).toContainEqual({
      type: "tool",
      sessionID: "tool-1",
      tool: "bash",
    });
    for (const data of progressData) {
      const keys = Object.keys(data as Record<string, unknown>);
      expect(keys).not.toContain("part");
      expect(keys).not.toContain("state");
      expect(keys).not.toContain("input");
      expect(keys).not.toContain("output");
    }
  });

  test("retains bounded unparsed evidence and usage when a live child emits malformed lines", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_start","sessionID":"u-1","part":{}}'`,
      `printf '%s\\n' '[1,2,3]'`,
      `printf '%s\\n' 'abcdefghij'`,
      `printf '%s\\n' '{"type":"step_finish","sessionID":"u-1","part":{"reason":"error","tokens":{"input":1,"output":1,"total":2,"cache":{"read":0}}}}'`,
    ]);
    const input = cellInput(root);
    input.budget.maxCommandOutputBytes = 8;
    const observed: TraceEvent[] = [];
    const record = await runCell(input, realDriver(root, executable), {
      host: createLocalHost(),
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode CLI completed without final stopped-step text");
    expect(record.usage).toEqual({ inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 });
    const unparsedData = observed
      .filter((event) => event.type === "opencode.cli.stdout.unparsed")
      .map((event) => event.data);
    expect(unparsedData).toContainEqual({ type: "opencode.cli.stdout.unparsed", line: "[1,2,3]" });
    expect(unparsedData).toContainEqual({ type: "opencode.cli.stdout.unparsed", line: "a" });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(2);
  });

  test("bounds long live JSONL retention without losing final session or usage evidence", async () => {
    const root = await fixture();
    const noisyEvent = JSON.stringify(event("tool", {
      type: "tool",
      tool: "bash",
      state: { output: "x".repeat(200) },
    }, "long-1"));
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '${JSON.stringify(event("step_start", {}, "long-1"))}'`,
      ...Array.from({ length: 200 }, () => `printf '%s\\n' '${noisyEvent}'`),
      `printf '%s\\n' '${JSON.stringify(event("text", { text: "Complete." }, "long-1"))}'`,
      `printf '%s\\n' '${JSON.stringify(event("step_finish", {
        reason: "stop",
        cost: 0.02,
        tokens: { input: 21, output: 8, total: 29, cache: { read: 5 } },
      }, "long-1"))}'`,
    ]);
    const input = cellInput(root);
    input.budget.maxCommandOutputBytes = 128;

    const record = await runCell(input, realDriver(root, executable), { host: createLocalHost() });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Complete.");
    expect(record.executionObservation.sessionId).toBe("long-1");
    expect(record.usage).toEqual({ inputTokens: 21, outputTokens: 8, totalTokens: 29, cachedInputTokens: 5 });
    const raw = executionRawSteps(record);
    expect(raw).toContainEqual(expect.objectContaining({
      type: "opencode.cli.retention",
      omittedEvents: expect.any(Number),
      omittedProgress: expect.any(Number),
      finalTextTruncated: false,
    }));
    const retention = raw.find(
      (step) => (step as Record<string, unknown>).type === "opencode.cli.retention",
    ) as Record<string, unknown>;
    expect(retention.omittedEvents).toBeGreaterThan(0);
    expect(retention.omittedProgress).toBeGreaterThan(0);
    expect(Buffer.byteLength(JSON.stringify(raw))).toBeLessThan(5_000);
    expect(Buffer.byteLength(JSON.stringify(record.trace))).toBeLessThan(10_000);
  });

  test("nonzero exit of a live child retains observed usage", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_finish","sessionID":"nz-1","part":{"reason":"error","cost":0.2,"tokens":{"input":13,"output":2,"total":15,"cache":{"read":3}}}}'`,
      `printf '%s' 'provider rejected request' >&2`,
    ], 19);
    const observed: TraceEvent[] = [];
    const record = await runCell(cellInput(root), realDriver(root, executable), {
      host: createLocalHost(),
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode CLI exited with code 19: provider rejected request");
    expect(record.usage).toEqual({ inputTokens: 13, outputTokens: 2, totalTokens: 15, cachedInputTokens: 3 });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(1);
  });
});

function openCodeDriver(
  root: string,
  processAdapter: OpenCodeCliProcessAdapter,
  options: { reasoningEffort?: string; sessionId?: string; timeoutMs?: number; serverAdapter?: OpenCodeCliServerAdapter } = {},
): OpenCodeCliDriver {
  return new OpenCodeCliDriver({
    executable: "/fixture/bin/opencode", model: "anthropic/fixture",
    workspacePolicy: { select: () => root }, processAdapter, ...options,
  });
}

function fixtureProcess(
  handler: (request: OpenCodeCliProcessRequest) => Promise<OpenCodeCliProcessResult>,
): OpenCodeCliProcessAdapter {
  return { run: handler };
}

function cellInput(root: string): CellInput {
  return {
    id: "opencode-fixture", intent: "Review the implementation.",
    workspace: { root, readPaths: ["."], writePaths: ["."], excludePaths: [], allowedCommands: ["bun test"] },
    instructions: ["Follow the fixture instructions."], capabilities: [], context: [{
      id: "evidence", title: "Fixture evidence", content: "The event stream is authoritative.", sources: [],
    }], capabilitiesRequired: [], acceptance: ["Return a concise result."],
    budget: { maxSteps: 3, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };
}

function context(root: string, signal = new AbortController().signal): {
  value: DriverContext;
  usages: CellUsage[];
  emitted: Array<{ type: string; data: unknown }>;
} {
  const usages: CellUsage[] = [];
  const emitted: Array<{ type: string; data: unknown }> = [];
  return {
    value: {
      workspace: { root } as DriverContext["workspace"], signal, liveObservation: true,
      observeUsage: (usage) => usages.push(usage), emit: (type, data) => emitted.push({ type, data }),
    },
    usages,
    emitted,
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-opencode-driver-test-"));
  temporaryRoots.push(root);
  return root;
}

async function todoDatabase(root: string): Promise<string> {
  const dbPath = join(root, "opencode.db");
  const db = new Database(dbPath);
  db.run(`CREATE TABLE todo (
    session_id text NOT NULL,
    content text NOT NULL,
    status text NOT NULL,
    priority text NOT NULL,
    position integer NOT NULL,
    time_created integer NOT NULL,
    time_updated integer NOT NULL,
    PRIMARY KEY (session_id, position)
  )`);
  db.close();
  return dbPath;
}

async function fakeOpenCodeServer(
  dbPath: string,
  options: { todoResponse?: (call: number) => unknown[] } = {},
): Promise<{ url: string; adapter: OpenCodeCliServerAdapter; calls: string[]; stopped: boolean }> {
  const calls: string[] = [];
  let todoCalls = 0;
  const db = new Database(dbPath);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      calls.push(`${request.method} ${url.pathname}`);
      if (request.method === "POST" && url.pathname === "/session") {
        return Response.json({ id: "ses_fixture" });
      }
      if (request.method === "GET" && url.pathname.startsWith("/session/") && url.pathname.endsWith("/todo")) {
        todoCalls += 1;
        if (options.todoResponse !== undefined) return Response.json(options.todoResponse(todoCalls));
        const rows = db.query("select content, status, priority from todo order by position")
          .all() as Array<{ content: string; status: string; priority: string }>;
        return Response.json(rows);
      }
      if (request.method === "DELETE" && url.pathname.startsWith("/session/")) {
        return Response.json(true);
      }
      return new Response("not found", { status: 404 });
    },
  });
  const url = `http://127.0.0.1:${server.port}`;
  let stopped = false;
  const adapter: OpenCodeCliServerAdapter = {
    async start(): Promise<OpenCodeCliServerHandle> {
      return {
        url,
        async stop() {
          stopped = true;
          server.stop(true);
          db.close();
        },
      };
    },
  };
  return { url, adapter, calls, get stopped() { return stopped; } };
}

function event(type: string, part: Record<string, unknown>, sessionID = "session-1"): unknown {
  return { type, sessionID, part };
}

function success(sessionID = "session-1"): OpenCodeCliProcessResult {
  return {
    exitCode: 0,
    stdout: jsonLines(
      event("step_start", {}, sessionID), event("text", { text: "Complete." }, sessionID),
      event("step_finish", { reason: "stop", cost: 0, tokens: { input: 1, output: 1, total: 2, cache: { read: 0 } } }, sessionID),
    ),
    stderr: "", durationMs: 3,
  };
}

function jsonLines(...events: unknown[]): string {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function realDriver(root: string, executable: string): OpenCodeCliDriver {
  return new OpenCodeCliDriver({
    executable,
    model: "anthropic/fixture",
    workspacePolicy: { select: () => root },
    processAdapter: new BunOpenCodeCliProcessAdapter(),
  });
}

async function fixtureExecutable(root: string, scriptLines: string[], exitCode = 0): Promise<string> {
  const executable = join(root, "fixture-opencode");
  await writeFile(executable, `${["#!/bin/sh", ...scriptLines, `exit ${exitCode}`].join("\n")}\n`, {
    mode: 0o755,
  });
  return executable;
}

async function waitFor<T>(probe: () => T | undefined, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = probe();
    if (found !== undefined) return found;
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function rawStepText(step: unknown): string | undefined {
  if (!step || typeof step !== "object") return undefined;
  const record = step as Record<string, unknown>;
  const part = record.part;
  return part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
    ? (part as Record<string, unknown>).text as string
    : undefined;
}

function executionRawSteps(record: CellRunRecord): unknown[] {
  const phase = record.rawSteps.find((entry) => (entry as Record<string, unknown>).phase === "execution");
  const steps = phase && typeof phase === "object"
    ? (phase as Record<string, unknown>).steps
    : undefined;
  return Array.isArray(steps) ? steps as unknown[] : [];
}
