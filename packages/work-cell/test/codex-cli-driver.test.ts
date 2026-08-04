import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CodexCliDriver,
  type CodexCliProcessAdapter,
  type CodexCliProcessRequest,
  type CodexCliProcessResult,
} from "../src/codex-cli-driver";
import { runCell } from "../src/run-cell";

const temporaryRoots: string[] = [];

afterEach(async () => {
  delete process.env.ROSSO_SECRET_SENTINEL;
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("Codex CLI driver", () => {
  test("uses a fresh isolated argv invocation and writes the terminal contract as a strict schema", async () => {
    const root = await fixture();
    process.env.ROSSO_SECRET_SENTINEL = "must-not-reach-codex";
    let request: CodexCliProcessRequest | undefined;
    let schema: unknown;
    const processAdapter = fixtureProcess(async (candidate) => {
      request = candidate;
      const schemaPath = optionValue(candidate.argv, "--output-schema");
      schema = JSON.parse(await readFile(schemaPath, "utf8"));
      return successfulProcess({
        terminalTool: "submit_review",
        input: { verdict: "ready" },
        finalText: "Review submitted.",
      });
    });
    const driver = codexDriver(root, processAdapter);

    const record = await runCell(cellInput(root), driver);
    const canonicalRoot = await realpath(root);

    expect(record.status).toBe("passed");
    expect(request?.executable).toBe("/fixture/bin/codex");
    expect(request?.cwd).toBe(canonicalRoot);
    expect(request?.argv).toEqual([
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--strict-config",
      "--disable",
      "shell_tool",
      "--disable",
      "code_mode",
      "--disable",
      "code_mode_only",
      "--disable",
      "browser_use",
      "--disable",
      "browser_use_external",
      "--disable",
      "browser_use_full_cdp_access",
      "--disable",
      "in_app_browser",
      "--disable",
      "computer_use",
      "--disable",
      "apps",
      "--disable",
      "plugins",
      "--disable",
      "remote_plugin",
      "--disable",
      "multi_agent",
      "--disable",
      "multi_agent_v2",
      "--disable",
      "image_generation",
      "--disable",
      "hooks",
      "--disable",
      "memories",
      "--disable",
      "goals",
      "--disable",
      "auth_elicitation",
      "--disable",
      "request_permissions_tool",
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
      "-C",
      canonicalRoot,
      "--model",
      "gpt-fixture",
      "-c",
      "project_doc_max_bytes=0",
      "-c",
      'shell_environment_policy.inherit="none"',
      "-c",
      "allow_login_shell=false",
      "--json",
      "--output-schema",
      expect.stringContaining("terminal-output.schema.json"),
      "-",
    ]);
    expect(Object.keys(request?.environment ?? {}).sort()).toEqual(
      Object.keys(request?.environment ?? {}).sort().filter((key) =>
        [
          "CODEX_HOME",
          "HOME",
          "LANG",
          "LC_ALL",
          "PATH",
          "SSL_CERT_DIR",
          "SSL_CERT_FILE",
          "TMPDIR",
        ].includes(key)
      ),
    );
    expect(request?.environment.ROSSO_SECRET_SENTINEL).toBeUndefined();
    expect(request?.environment.HOME).toBe(request?.environment.CODEX_HOME);
    expect(request?.environment.HOME).not.toBe(process.env.HOME);
    expect(request?.stdin).toContain('"intent": "Review the bounded evidence."');
    expect(request?.stdin).toContain("Do not discover, load, or infer user or project instructions");
    expect(schema).toEqual({
      type: "object",
      properties: {
        terminalTool: {
          type: "string",
          enum: ["submit_review", "hold_review"],
        },
        input: {
          anyOf: [
            {
              type: "object",
              properties: { verdict: { type: "string", enum: ["ready"] } },
              required: ["verdict"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: { reason: { type: "string" } },
              required: ["reason"],
              additionalProperties: false,
            },
          ],
        },
        finalText: { type: "string" },
      },
      required: ["terminalTool", "input", "finalText"],
      additionalProperties: false,
    });
  });

  test("retains Codex events and usage, then emits the actual terminal call after validation", async () => {
    const root = await fixture();
    const driver = codexDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: jsonLines(
        { type: "thread.started", thread_id: "fixture-thread" },
        {
          type: "item.completed",
          item: {
            type: "agent_message",
            text: JSON.stringify({
              terminalTool: "submit_review",
              input: { verdict: "ready" },
              finalText: "Evidence is ready.",
            }),
          },
        },
        {
          type: "turn.completed",
          usage: {
            input_tokens: 120,
            cached_input_tokens: 40,
            output_tokens: 30,
          },
        },
      ),
      stderr: "fixture warning",
      durationMs: 17,
    })));

    const record = await runCell(cellInput(root), driver);

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Evidence is ready.");
    expect(record.usage).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150,
      cachedInputTokens: 40,
    });
    expect(record.verification.terminal).toEqual({
      passed: true,
      required: ["submit_review", "hold_review"],
      called: ["submit_review"],
    });
    expect(record.trace.filter((event) => event.type === "codex.cli.event")).toHaveLength(3);
    const terminalEvent = record.trace.find((event) => event.type === "terminal.tool.called");
    expect(terminalEvent?.data).toEqual({
      name: "submit_review",
      input: { verdict: "ready" },
    });
    expect(record.trace.findIndex((event) => event.type === "terminal.tool.called"))
      .toBeGreaterThan(record.trace.findIndex((event) => event.type === "codex.cli.finished"));
    expect(record.trace).toContainEqual(expect.objectContaining({
      type: "codex.cli.stderr",
      data: { text: "fixture warning" },
    }));
    expect(JSON.stringify(record.rawSteps)).toContain("fixture-thread");
  });

  test("rejects malformed terminal input without emitting a terminal action and retains usage", async () => {
    const root = await fixture();
    const driver = codexDriver(root, fixtureProcess(async () => successfulProcess({
      terminalTool: "submit_review",
      input: { verdict: "not-declared" },
      finalText: "This must not settle.",
    }, {
      input_tokens: 21,
      cached_input_tokens: 5,
      output_tokens: 8,
    })));

    const record = await runCell(cellInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toContain("invalid input for terminal tool submit_review");
    expect(record.usage).toEqual({
      inputTokens: 21,
      outputTokens: 8,
      totalTokens: 29,
      cachedInputTokens: 5,
    });
    expect(record.trace.some((event) => event.type === "terminal.tool.called")).toBe(false);
  });

  test("propagates caller cancellation to the process adapter", async () => {
    const root = await fixture();
    let started!: () => void;
    const processStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let observedSignal: AbortSignal | undefined;
    const driver = codexDriver(root, fixtureProcess(async (request) => {
      observedSignal = request.signal;
      started();
      return await new Promise<CodexCliProcessResult>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
      });
    }));
    const controller = new AbortController();

    const running = runCell(cellInput(root), driver, { signal: controller.signal });
    await processStarted;
    controller.abort(new Error("fixture cancellation"));
    const record = await running;

    expect(observedSignal?.aborted).toBe(true);
    expect(record.status).toBe("cancelled");
    expect(record.error).toBe("fixture cancellation");
  });

  test("enforces the adapter-local timeout", async () => {
    const root = await fixture();
    const driver = new CodexCliDriver({
      executable: "/fixture/bin/codex",
      authFile: join(root, "auth.json"),
      model: "gpt-fixture",
      workspacePolicy: { select: () => root },
      timeoutMs: 10,
      processAdapter: fixtureProcess(async (request) => (
        await new Promise<CodexCliProcessResult>((_resolve, reject) => {
          request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
        })
      )),
    });

    const record = await runCell(cellInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toBe("Codex CLI execution timed out after 10ms");
  });

  test("surfaces a non-zero exit with stderr and completed usage", async () => {
    const root = await fixture();
    const driver = codexDriver(root, fixtureProcess(async () => ({
      exitCode: 17,
      stdout: jsonLines({
        type: "turn.completed",
        usage: {
          input_tokens: 13,
          cached_input_tokens: 3,
          output_tokens: 2,
        },
      }),
      stderr: "fixture provider rejected the request",
      durationMs: 4,
    })));

    const record = await runCell(cellInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toBe(
      "Codex CLI exited with code 17: fixture provider rejected the request",
    );
    expect(record.usage).toEqual({
      inputTokens: 13,
      outputTokens: 2,
      totalTokens: 15,
      cachedInputTokens: 3,
    });
  });

  test("fails closed when stdout has no structured final agent message", async () => {
    const root = await fixture();
    const driver = codexDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: "not-json\n",
      stderr: "",
      durationMs: 1,
    })));

    const record = await runCell(cellInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toContain("completed without a structured final message");
    expect(record.trace).toContainEqual(expect.objectContaining({
      type: "codex.cli.stdout.unparsed",
      data: { line: "not-json" },
    }));
  });
});

function codexDriver(root: string, processAdapter: CodexCliProcessAdapter): CodexCliDriver {
  return new CodexCliDriver({
    executable: "/fixture/bin/codex",
    authFile: join(root, "auth.json"),
    model: "gpt-fixture",
    workspacePolicy: { select: () => root },
    processAdapter,
  });
}

function fixtureProcess(
  handler: (request: CodexCliProcessRequest) => Promise<CodexCliProcessResult>,
): CodexCliProcessAdapter {
  return { run: handler };
}

function cellInput(root: string): unknown {
  return {
    id: "codex-cli-fixture",
    intent: "Review the bounded evidence.",
    workspace: {
      root,
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: ["Use only the supplied evidence."],
    context: [{
      id: "evidence",
      title: "Bounded evidence",
      content: "The fixture contains all evidence required for the review.",
      sources: ["fixture"],
    }],
    acceptance: ["Return one declared terminal action with schema-valid input."],
    terminalTools: [
      {
        name: "submit_review",
        description: "Submit a ready review.",
        inputSchema: {
          type: "object",
          properties: { verdict: { type: "string", enum: ["ready"] } },
          required: ["verdict"],
          additionalProperties: false,
        },
      },
      {
        name: "hold_review",
        description: "Hold the review with a reason.",
        inputSchema: {
          type: "object",
          properties: { reason: { type: "string" } },
          required: ["reason"],
          additionalProperties: false,
        },
      },
    ],
    budget: {
      maxSteps: 2,
      maxDurationMs: 2_000,
      maxCommandOutputBytes: 4_000,
    },
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-codex-driver-test-"));
  await writeFile(join(root, "auth.json"), "{}\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  temporaryRoots.push(root);
  return root;
}

function successfulProcess(
  envelope: { terminalTool: string; input: unknown; finalText: string },
  usage = { input_tokens: 12, cached_input_tokens: 2, output_tokens: 4 },
): CodexCliProcessResult {
  return {
    exitCode: 0,
    stdout: jsonLines(
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: JSON.stringify(envelope),
        },
      },
      { type: "turn.completed", usage },
    ),
    stderr: "",
    durationMs: 3,
  };
}

function jsonLines(...events: unknown[]): string {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function optionValue(argv: string[], flag: string): string {
  const index = argv.indexOf(flag);
  const value = argv[index + 1];
  if (index < 0 || !value) throw new Error(`missing fixture option: ${flag}`);
  return value;
}
