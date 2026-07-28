import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BunCodexAppServerProcessAdapter,
  CodexAppServerDriver,
  type CodexAppServerLaunchRequest,
  type CodexAppServerProcessAdapter,
  type CodexAppServerSession,
} from "../src/codex-app-server-driver";
import { runCell } from "../src/run-cell";

type JsonObject = Record<string, unknown>;

const temporaryRoots: string[] = [];

afterEach(async () => {
  delete process.env.ROSSO_SECRET_SENTINEL;
  await Promise.all(
    temporaryRoots.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    ),
  );
});

describe("Codex app-server driver", () => {
  test("binds a fresh no-environment thread and emits only validated terminal output", async () => {
    const root = await fixture();
    process.env.ROSSO_SECRET_SENTINEL = "must-not-reach-app-server";
    const fake = successfulAdapter();
    const driver = appServerDriver(root, fake.adapter);

    const record = await runCell(cellInput(root), driver);
    const launch = fake.launches[0]!;
    const thread = fake.requests.find((request) =>
      request.method === "thread/start"
    )!;
    const turn = fake.requests.find((request) =>
      request.method === "turn/start"
    )!;

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Review submitted.");
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
    expect(launch.executable).toBe("/fixture/bin/codex");
    expect(launch.cwd).not.toBe(await realpath(root));
    expect(launch.argv).toEqual([
      "app-server",
      "--stdio",
      "--strict-config",
    ]);
    expect(launch.environment.HOME).toBe(launch.environment.CODEX_HOME);
    expect(launch.environment.HOME).not.toBe(process.env.HOME);
    expect(fake.canonicalHomes).toEqual([true]);
    expect(launch.environment.ROSSO_SECRET_SENTINEL).toBeUndefined();
    expect(thread.params).toMatchObject({
      allowProviderModelFallback: false,
      cwd: launch.cwd,
      approvalPolicy: "never",
      sandbox: "read-only",
      personality: "none",
      ephemeral: true,
      dynamicTools: [],
      environments: [],
      runtimeWorkspaceRoots: [],
      selectedCapabilityRoots: [],
    });
    expect(turn.params).toMatchObject({
      threadId: "thread-fixture",
      environments: [],
      runtimeWorkspaceRoots: [],
      additionalContext: {},
      cwd: launch.cwd,
      approvalPolicy: "never",
      personality: "none",
    });
    expect(JSON.stringify(turn.params.input)).toContain(
      "No local environment or dynamic tool is available.",
    );
    expect(JSON.stringify(turn.params.input)).not.toContain(root);
    expect(JSON.stringify(turn.params.input)).not.toContain("maxDurationMs");
    expect(JSON.stringify(turn.params.input)).toContain(
      "codex-app-server-fixture",
    );
    expect(record.trace).toContainEqual(expect.objectContaining({
      type: "codex.app_server.started",
      data: expect.objectContaining({
        adapter: "codex-app-server.v1",
        environmentAccess: "disabled",
        dynamicTools: 0,
      }),
    }));
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(true);
  });

  test("fails before turn execution when thread/start exposes an instruction source", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      threadResult: {
        instructionSources: ["/fixture/AGENTS.md"],
      },
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain(
      "loaded instruction sources or runtime workspace roots",
    );
    expect(fake.requests.some((request) =>
      request.method === "turn/start"
    )).toBe(false);
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("fails closed when the server connects an environment", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      extraMessages: [{
        method: "thread/environment/connected",
        params: {
          threadId: "thread-fixture",
          environmentId: "forbidden-environment",
        },
      }],
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain("connected a forbidden environment");
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("drains and validates late protocol messages before emitting terminal authority", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      messagesOnClose: [{
        method: "item/completed",
        params: {
          threadId: "thread-fixture",
          turnId: "turn-fixture",
          item: {
            id: "late-file-change",
            type: "fileChange",
            changes: [],
            status: "completed",
          },
        },
      }],
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain("emitted undeclared item fileChange");
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("fails closed when any I/O item appears in the turn", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      completedItems: [{
        id: "command-fixture",
        type: "commandExecution",
        command: "pwd",
        commandActions: [],
        cwd: "/private/tmp",
        status: "completed",
      }],
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain(
      "emitted undeclared item commandExecution",
    );
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("retains usage but rejects schema-invalid terminal input", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      envelope: {
        terminalTool: "submit_review",
        input: { verdict: "not-declared" },
        finalText: "This must not settle.",
      },
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain(
      "invalid input for terminal tool submit_review",
    );
    expect(record.usage.totalTokens).toBe(150);
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("retains the app-server failure detail before rejecting a failed turn", async () => {
    const root = await fixture();
    const fake = successfulAdapter({
      completedStatus: "failed",
      completedError: {
        message: "fixture model unavailable",
        codexErrorInfo: "other",
      },
    });
    const record = await runCell(
      cellInput(root),
      appServerDriver(root, fake.adapter),
    );

    expect(record.status).toBe("failed");
    expect(record.error).toContain("fixture model unavailable");
    expect(record.usage.totalTokens).toBe(150);
    expect(record.trace.some((event) =>
      event.type === "terminal.tool.called"
    )).toBe(false);
  });

  test("rejects pending protocol work when the app-server exits early", async () => {
    const adapter = new BunCodexAppServerProcessAdapter();
    const session = await adapter.open({
      executable: "/usr/bin/false",
      argv: [],
      cwd: tmpdir(),
      environment: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
      },
      signal: new AbortController().signal,
    });

    await expect(
      session.request(
        "initialize",
        {},
        new AbortController().signal,
      ),
    ).rejects.toThrow(
      "stdout closed before the host closed the session",
    );
    await expect(session.close()).rejects.toThrow(
      "stdout closed before the host closed the session",
    );
  });

  test("rejects already-aborted requests and notification waits immediately", async () => {
    const adapter = new BunCodexAppServerProcessAdapter();
    const session = await adapter.open({
      executable: "/bin/sleep",
      argv: ["30"],
      cwd: tmpdir(),
      environment: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
      },
      signal: new AbortController().signal,
    });
    const aborted = new AbortController();
    aborted.abort();

    await expect(
      session.request("initialize", {}, aborted.signal),
    ).rejects.toThrow("request initialize aborted");
    await expect(
      session.waitForNotification("turn/completed", () => true, aborted.signal),
    ).rejects.toThrow("notification turn/completed wait aborted");
    await session.close();
  });

  test("bounds process shutdown and escalates past an ignored SIGTERM", async () => {
    const adapter = new BunCodexAppServerProcessAdapter();
    const session = await adapter.open({
      executable: "/bin/sh",
      argv: ["-c", "trap '' TERM; exec /bin/sleep 30"],
      cwd: tmpdir(),
      environment: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
      },
      signal: new AbortController().signal,
    });
    await Bun.sleep(50);
    const startedAt = performance.now();
    const result = await session.close();

    expect(performance.now() - startedAt).toBeLessThan(2_500);
    expect(result.exitCode).not.toBe(0);
  });
});

function appServerDriver(
  root: string,
  processAdapter: CodexAppServerProcessAdapter,
): CodexAppServerDriver {
  return new CodexAppServerDriver({
    executable: "/fixture/bin/codex",
    authFile: join(root, "auth.json"),
    model: "gpt-fixture",
    workspacePolicy: { select: () => root },
    processAdapter,
  });
}

function successfulAdapter(options: {
  envelope?: {
    terminalTool: string;
    input: unknown;
    finalText: string;
  };
  threadResult?: JsonObject;
  completedItems?: JsonObject[];
  completedStatus?: "completed" | "failed";
  completedError?: JsonObject;
  extraMessages?: JsonObject[];
  messagesOnClose?: JsonObject[];
} = {}): {
  adapter: CodexAppServerProcessAdapter;
  launches: CodexAppServerLaunchRequest[];
  requests: { method: string; params: JsonObject }[];
  canonicalHomes: boolean[];
} {
  const launches: CodexAppServerLaunchRequest[] = [];
  const requests: { method: string; params: JsonObject }[] = [];
  const canonicalHomes: boolean[] = [];
  const envelope = options.envelope ?? {
    terminalTool: "submit_review",
    input: { verdict: "ready" },
    finalText: "Review submitted.",
  };

  const adapter: CodexAppServerProcessAdapter = {
    open: async (launch) => {
      launches.push(launch);
      canonicalHomes.push(
        launch.environment.CODEX_HOME
          === await realpath(launch.environment.CODEX_HOME!),
      );
      const agentMessage = {
        id: "agent-message-fixture",
        type: "agentMessage",
        text: JSON.stringify(envelope),
      };
      const completedTurn = {
        id: "turn-fixture",
        status: options.completedStatus ?? "completed",
        items: [...(options.completedItems ?? []), agentMessage],
        ...(options.completedError === undefined
          ? {}
          : { error: options.completedError }),
      };
      const messages: JsonObject[] = [
        {
          method: "item/completed",
          params: {
            threadId: "thread-fixture",
            turnId: "turn-fixture",
            item: agentMessage,
          },
        },
        {
          method: "thread/tokenUsage/updated",
          params: {
            threadId: "thread-fixture",
            turnId: "turn-fixture",
            tokenUsage: {
              total: {
                inputTokens: 120,
                outputTokens: 30,
                totalTokens: 150,
                cachedInputTokens: 40,
                reasoningOutputTokens: 10,
              },
              last: {
                inputTokens: 120,
                outputTokens: 30,
                totalTokens: 150,
                cachedInputTokens: 40,
                reasoningOutputTokens: 10,
              },
            },
          },
        },
        ...(options.extraMessages ?? []),
      ];
      const session: CodexAppServerSession = {
        request: async (method, params) => {
          requests.push({ method, params });
          if (method === "initialize") {
            return {
              userAgent: "fixture",
              codexHome: launch.environment.CODEX_HOME,
              platformFamily: "unix",
              platformOs: "macos",
            };
          }
          if (method === "thread/start") {
            return {
              thread: {
                id: "thread-fixture",
                cwd: launch.cwd,
                ephemeral: true,
                path: null,
              },
              model: "gpt-fixture",
              modelProvider: "openai",
              cwd: launch.cwd,
              instructionSources: [],
              runtimeWorkspaceRoots: [],
              approvalPolicy: "never",
              sandbox: { type: "readOnly", networkAccess: false },
              ...options.threadResult,
            };
          }
          if (method === "turn/start") {
            return {
              turn: {
                id: "turn-fixture",
                status: "inProgress",
                items: [],
              },
            };
          }
          throw new Error(`unexpected fixture request ${method}`);
        },
        notify: () => {},
        waitForNotification: async (method) => {
          if (method !== "turn/completed") {
            throw new Error(`unexpected fixture notification ${method}`);
          }
          return {
            threadId: "thread-fixture",
            turn: completedTurn,
          };
        },
        messages: () => messages,
        close: async () => {
          messages.push(...(options.messagesOnClose ?? []));
          return {
            exitCode: 0,
            stderr: "",
            durationMs: 3,
          };
        },
      };
      return session;
    },
  };
  return { adapter, launches, requests, canonicalHomes };
}

function cellInput(root: string): unknown {
  return {
    id: "codex-app-server-fixture",
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
  const root = await mkdtemp(join(
    tmpdir(),
    "work-cell-codex-app-server-test-",
  ));
  await writeFile(join(root, "auth.json"), "{}\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  temporaryRoots.push(root);
  return root;
}
