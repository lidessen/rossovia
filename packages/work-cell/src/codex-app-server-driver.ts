import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import type {
  CellInput,
  CellUsage,
  DriverDescriptor,
  TerminalTool,
} from "./contracts";
import {
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "./driver";
import { compileOutputSchema } from "./output-schema";
import { createCodexCliOutputSchema } from "./codex-cli-driver";

type JsonObject = Record<string, unknown>;

export interface CodexAppServerWorkspacePolicy {
  /**
   * Select the caller-created disposable Work Cell workspace. The app-server
   * never receives this path; equality proves that the caller did not silently
   * substitute another Cell root while constructing the bounded packet.
   */
  select(input: CellInput, context: DriverContext): string | Promise<string>;
}

export interface CodexAppServerLaunchRequest {
  executable: string;
  argv: string[];
  cwd: string;
  environment: Record<string, string>;
  signal: AbortSignal;
}

export interface CodexAppServerCloseResult {
  exitCode: number | null;
  stderr: string;
  durationMs: number;
}

export interface CodexAppServerSession {
  request(method: string, params: JsonObject, signal: AbortSignal): Promise<unknown>;
  notify(method: string, params?: JsonObject): void;
  waitForNotification(
    method: string,
    predicate: (params: JsonObject) => boolean,
    signal: AbortSignal,
  ): Promise<JsonObject>;
  messages(): readonly JsonObject[];
  close(): Promise<CodexAppServerCloseResult>;
}

export interface CodexAppServerProcessAdapter {
  open(request: CodexAppServerLaunchRequest): Promise<CodexAppServerSession>;
}

export interface CodexAppServerDriverOptions {
  /** Executable selection is host policy; the adapter never searches PATH. */
  executable: string;
  /** Auth is copied into a fresh minimal CODEX_HOME for this invocation. */
  authFile: string;
  /** Model selection is explicit and never inherited from user configuration. */
  model: string;
  /** The host must supply the disposable Cell root used to bind the packet. */
  workspacePolicy: CodexAppServerWorkspacePolicy;
  /** Injectable JSON-RPC process boundary for tests and non-Bun hosts. */
  processAdapter?: CodexAppServerProcessAdapter;
  /** Optional adapter-local ceiling; CellInput's duration budget still applies. */
  timeoutMs?: number;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  cleanup(): void;
}

interface NotificationWaiter {
  method: string;
  predicate(params: JsonObject): boolean;
  resolve(params: JsonObject): void;
  reject(error: Error): void;
  cleanup(): void;
}

interface TerminalEnvelope {
  terminalTool: string;
  input: unknown;
  finalText: string;
}

const EMPTY_USAGE: CellUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedInputTokens: 0,
};

export const CODEX_APP_SERVER_TOOL_POLICY =
  "app-server-no-environment-structured-output-plan-only-v1" as const;

const ALLOWED_ITEM_TYPES = new Set([
  "userMessage",
  "reasoning",
  "plan",
  "agentMessage",
]);

const PROCESS_TERMINATION_GRACE_MS = 1_000;

/**
 * Newline-delimited JSON-RPC transport for `codex app-server --stdio`.
 *
 * The transport has no semantic authority. It retains every message and
 * rejects unexpected server requests so the driver can fail closed instead of
 * silently satisfying an approval, tool, or elicitation callback.
 */
export class BunCodexAppServerProcessAdapter
  implements CodexAppServerProcessAdapter
{
  async open(
    request: CodexAppServerLaunchRequest,
  ): Promise<CodexAppServerSession> {
    const startedAt = performance.now();
    const child = Bun.spawn([request.executable, ...request.argv], {
      cwd: request.cwd,
      env: request.environment,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      signal: request.signal,
    });
    const pending = new Map<number, PendingRequest>();
    const notifications: JsonObject[] = [];
    const waiters = new Set<NotificationWaiter>();
    const retainedMessages: JsonObject[] = [];
    const stderrPromise = new Response(child.stderr).text();
    let nextId = 1;
    let closed = false;
    let readError: Error | undefined;

    const send = (message: JsonObject): void => {
      if (closed) throw new Error("Codex app-server session is closed");
      child.stdin.write(`${JSON.stringify(message)}\n`);
    };

    const rejectAll = (error: Error): void => {
      for (const request_ of pending.values()) {
        request_.cleanup();
        request_.reject(error);
      }
      pending.clear();
      for (const waiter of waiters) {
        waiter.cleanup();
        waiter.reject(error);
      }
      waiters.clear();
    };

    const dispatch = (message: JsonObject): void => {
      retainedMessages.push(message);
      if (typeof message.id === "number" && !("method" in message)) {
        const request_ = pending.get(message.id);
        if (request_ === undefined) return;
        pending.delete(message.id);
        request_.cleanup();
        if (isRecord(message.error)) {
          request_.reject(new Error(
            `Codex app-server ${message.error.code ?? "error"}: ${
              String(message.error.message ?? "unknown error")
            }`,
          ));
        } else {
          request_.resolve(message.result);
        }
        return;
      }
      if (typeof message.method !== "string") return;
      if (typeof message.id === "number") {
        send({
          id: message.id,
          error: {
            code: -32601,
            message: `Work Cell rejects server request ${message.method}`,
          },
        });
        return;
      }
      const params = isRecord(message.params) ? message.params : {};
      const notification = { method: message.method, params };
      notifications.push(notification);
      for (const waiter of waiters) {
        if (waiter.method !== message.method || !waiter.predicate(params)) continue;
        waiters.delete(waiter);
        waiter.cleanup();
        waiter.resolve(params);
      }
    };

    const readLoop = (async (): Promise<void> => {
      const reader = child.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) dispatch(parseJsonRpcLine(line));
            newline = buffer.indexOf("\n");
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) dispatch(parseJsonRpcLine(buffer.trim()));
        if (!closed) {
          readError = new Error(
            "Codex app-server stdout closed before the host closed the session",
          );
          rejectAll(readError);
        }
      } catch (error) {
        readError = asError(error, "Codex app-server stdout failed");
        rejectAll(readError);
      }
    })();

    return {
      request: async (
        method: string,
        params: JsonObject,
        signal: AbortSignal,
      ): Promise<unknown> => {
        if (signal.aborted) {
          throw new Error(`Codex app-server request ${method} aborted`);
        }
        const id = nextId++;
        return await new Promise((resolve, reject) => {
          const abort = (): void => {
            const request_ = pending.get(id);
            if (request_ === undefined) return;
            pending.delete(id);
            request_.cleanup();
            request_.reject(new Error(
              `Codex app-server request ${method} aborted`,
            ));
          };
          signal.addEventListener("abort", abort, { once: true });
          const request_: PendingRequest = {
            resolve,
            reject,
            cleanup: () => signal.removeEventListener("abort", abort),
          };
          pending.set(id, request_);
          try {
            send({ id, method, params });
          } catch (error) {
            pending.delete(id);
            request_.cleanup();
            reject(asError(error, `Codex app-server request ${method} failed`));
          }
        });
      },
      notify: (method: string, params?: JsonObject): void => {
        send({ method, ...(params === undefined ? {} : { params }) });
      },
      waitForNotification: async (
        method: string,
        predicate: (params: JsonObject) => boolean,
        signal: AbortSignal,
      ): Promise<JsonObject> => {
        if (signal.aborted) {
          throw new Error(
            `Codex app-server notification ${method} wait aborted`,
          );
        }
        const retained = notifications.find((notification) =>
          notification.method === method
          && isRecord(notification.params)
          && predicate(notification.params)
        );
        if (retained !== undefined && isRecord(retained.params)) {
          return retained.params;
        }
        return await new Promise((resolve, reject) => {
          const abort = (): void => {
            waiters.delete(waiter);
            waiter.cleanup();
            waiter.reject(new Error(
              `Codex app-server notification ${method} wait aborted`,
            ));
          };
          const waiter: NotificationWaiter = {
            method,
            predicate,
            resolve,
            reject,
            cleanup: () => signal.removeEventListener("abort", abort),
          };
          signal.addEventListener("abort", abort, { once: true });
          waiters.add(waiter);
        });
      },
      messages: () => retainedMessages,
      close: async (): Promise<CodexAppServerCloseResult> => {
        if (!closed) {
          closed = true;
          child.stdin.end();
          child.kill("SIGTERM");
        }
        let exitCode = await waitForExit(
          child.exited,
          PROCESS_TERMINATION_GRACE_MS,
        );
        if (exitCode === undefined) {
          child.kill("SIGKILL");
          exitCode = await waitForExit(
            child.exited,
            PROCESS_TERMINATION_GRACE_MS,
          );
        }
        if (exitCode === undefined) {
          const error = new Error(
            "Codex app-server did not exit after SIGTERM and SIGKILL",
          );
          rejectAll(error);
          throw error;
        }
        await readLoop;
        const stderr = await stderrPromise;
        if (readError !== undefined) throw readError;
        rejectAll(new Error("Codex app-server session closed"));
        return {
          exitCode,
          stderr,
          durationMs: Math.round(performance.now() - startedAt),
        };
      },
    };
  }
}

/**
 * A no-environment Codex app-server carrier for terminal-decision Cells.
 *
 * Empty thread and turn environments are a protocol-level denial of local
 * environment access. The only remaining built-in callable surface is Codex's
 * non-I/O plan tool; final authority still crosses the terminal envelope
 * validator owned by Work Cell.
 */
export class CodexAppServerDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  private readonly executable: string;
  private readonly processAdapter: CodexAppServerProcessAdapter;

  constructor(private readonly options: CodexAppServerDriverOptions) {
    const executable = options.executable.trim();
    const model = options.model.trim();
    if (!executable || !isAbsolute(executable)) {
      throw new Error("Codex app-server executable must be an absolute path");
    }
    if (!isAbsolute(options.authFile)) {
      throw new Error("Codex app-server authFile must be an absolute path");
    }
    if (!model) throw new Error("Codex app-server model must not be empty");
    if (
      options.timeoutMs !== undefined
      && (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)
    ) {
      throw new Error("Codex app-server timeoutMs must be a positive integer");
    }
    this.executable = executable;
    this.processAdapter =
      options.processAdapter ?? new BunCodexAppServerProcessAdapter();
    this.descriptor = {
      adapter: "codex-app-server.v1",
      provider: "openai",
      model,
    };
  }

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    const terminalTools = input.terminalTools ?? [];
    if (terminalTools.length === 0) {
      throw new CellExecutionError(
        "Codex app-server driver requires at least one declared terminal tool",
        EMPTY_USAGE,
      );
    }
    await this.resolveWorkspace(input, context);

    const runtimeHome = await realpath(await mkdtemp(join(
      tmpdir(),
      "work-cell-codex-app-home-",
    )));
    const neutralCwd = await realpath(await mkdtemp(join(
      tmpdir(),
      "work-cell-codex-app-cwd-",
    )));
    try {
      await writeFile(
        join(runtimeHome, "auth.json"),
        await readFile(this.options.authFile),
        { mode: 0o600 },
      );
    } catch (error) {
      await Promise.all([
        rm(runtimeHome, { recursive: true, force: true }),
        rm(neutralCwd, { recursive: true, force: true }),
      ]);
      throw error;
    }

    const timeoutMs = Math.min(
      input.budget.maxDurationMs,
      this.options.timeoutMs ?? input.budget.maxDurationMs,
    );
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    const outputSchema = createCodexCliOutputSchema(terminalTools);
    const prompt = createCodexAppServerPrompt(input);
    const argv = codexAppServerArgv();

    context.emit("codex.app_server.started", {
      adapter: this.descriptor.adapter,
      model: this.descriptor.model,
      environmentAccess: "disabled",
      dynamicTools: 0,
      neutralCwd,
      timeoutMs,
    });

    let session: CodexAppServerSession | undefined;
    let usage = { ...EMPTY_USAGE };
    try {
      session = await this.processAdapter.open({
        executable: this.executable,
        argv,
        cwd: neutralCwd,
        environment: codexProcessEnvironment(runtimeHome),
        signal,
      });
      const initializeResult = requireRecord(await session.request("initialize", {
        clientInfo: {
          name: "rosso-work-cell",
          version: "0.1.0",
        },
        capabilities: codexInitializeCapabilities(),
      }, signal), "initialize result");
      if (initializeResult.codexHome !== runtimeHome) {
        throw new Error("Codex app-server did not use the fresh runtime home");
      }
      session.notify("initialized");

      const threadResult = requireRecord(await session.request(
        "thread/start",
        {
          ...codexThreadFixedBoundary(),
          model: this.descriptor.model,
          cwd: neutralCwd,
        },
        signal,
      ), "thread/start result");
      const threadId = validateThreadBoundary(
        threadResult,
        neutralCwd,
        this.descriptor.model,
      );

      const turnResult = requireRecord(await session.request(
        "turn/start",
        {
          ...codexTurnFixedBoundary(),
          threadId,
          input: [{ type: "text", text: prompt }],
          outputSchema,
          cwd: neutralCwd,
          model: this.descriptor.model,
        },
        signal,
      ), "turn/start result");
      const turn = requireRecord(turnResult.turn, "turn/start turn");
      const turnId = requireString(turn.id, "turn/start turn id");
      const completed = await session.waitForNotification(
        "turn/completed",
        (params) =>
          params.threadId === threadId
          && isRecord(params.turn)
          && params.turn.id === turnId,
        signal,
      );
      const completedTurn = requireRecord(
        completed.turn,
        "turn/completed turn",
      );

      const completedSession = session;
      const closeResult = await completedSession.close();
      session = undefined;
      if (closeResult.stderr.trim()) {
        context.emit("codex.app_server.stderr", {
          text: truncate(
            closeResult.stderr.trim(),
            input.budget.maxCommandOutputBytes,
          ),
        });
      }
      const messages = [...completedSession.messages()];
      validateNoEnvironmentOrIo(messages, threadId, turnId);
      usage = usageFromMessages(messages, threadId, turnId);
      context.observeUsage(usage);
      context.emit("codex.app_server.finished", {
        exitCode: closeResult.exitCode,
        durationMs: closeResult.durationMs,
        usage,
      });
      for (const message of messages) {
        context.emit("codex.app_server.message", message);
      }
      validateCompletedTurn(completedTurn);

      const finalMessage = finalAgentMessage(messages, completedTurn, turnId);
      if (finalMessage === undefined) {
        throw new CellExecutionError(
          "Codex app-server completed without an agent message",
          usage,
        );
      }
      const envelope = parseTerminalEnvelope(
        finalMessage,
        terminalTools,
        usage,
      );
      const selected = terminalTools.find(
        (tool) => tool.name === envelope.terminalTool,
      );
      if (selected === undefined) {
        throw new CellExecutionError(
          `Codex app-server selected undeclared terminal tool: ${envelope.terminalTool}`,
          usage,
        );
      }
      const inputValidation = compileOutputSchema(
        selected.inputSchema,
      ).validate(envelope.input);
      if (!inputValidation.passed) {
        throw new CellExecutionError(
          `Codex app-server returned invalid input for terminal tool ${selected.name}: ${
            inputValidation.errors.join("; ")
          }`,
          usage,
        );
      }

      context.emit("terminal.tool.called", {
        name: selected.name,
        input: envelope.input,
      });
      return {
        terminalToolsCalled: [selected.name],
        finalText: envelope.finalText,
        usage,
        rawSteps: messages,
        providerMetadata: {
          adapter: this.descriptor.adapter,
          threadId,
          turnId,
          environmentAccess: "disabled",
          dynamicTools: 0,
          builtInToolSurface: ["plan"],
        },
      };
    } catch (error) {
      const message = abortMessage(
        context.signal,
        timeoutSignal,
        timeoutMs,
        error,
      );
      context.emit("codex.app_server.error", { error: message });
      if (error instanceof CellExecutionError) throw error;
      throw new CellExecutionError(message, usage);
    } finally {
      if (session !== undefined) {
        try {
          const closeResult = await session.close();
          if (closeResult.stderr.trim()) {
            context.emit("codex.app_server.stderr", {
              text: truncate(
                closeResult.stderr.trim(),
                input.budget.maxCommandOutputBytes,
              ),
            });
          }
          context.emit("codex.app_server.finished", {
            exitCode: closeResult.exitCode,
            durationMs: closeResult.durationMs,
            usage,
          });
        } catch (error) {
          context.emit("codex.app_server.dispose_error", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      await Promise.all([
        rm(runtimeHome, { recursive: true, force: true }),
        rm(neutralCwd, { recursive: true, force: true }),
      ]);
    }
  }

  private async resolveWorkspace(
    input: CellInput,
    context: DriverContext,
  ): Promise<string> {
    const selected = await this.options.workspacePolicy.select(input, context);
    if (!isAbsolute(selected)) {
      throw new CellExecutionError(
        "Codex app-server workspace policy must select an absolute path",
        EMPTY_USAGE,
      );
    }
    const canonical = await realpath(selected);
    if (canonical !== context.workspace.root) {
      throw new CellExecutionError(
        "Codex app-server workspace policy must select the Work Cell canonical workspace root",
        EMPTY_USAGE,
      );
    }
    return canonical;
  }
}

export function createCodexAppServerPrompt(input: CellInput): string {
  if (
    input.artifacts !== undefined
    || input.tasks !== undefined
    || input.workEstimate !== undefined
  ) {
    throw new Error(
      "Codex app-server terminal-decision Cells cannot carry artifact, task, or work-estimate contracts",
    );
  }
  const packet = {
    id: input.id,
    intent: input.intent,
    instructions: input.instructions,
    capabilities: input.capabilities,
    context: input.context,
    capabilitiesRequired: input.capabilitiesRequired,
    acceptance: input.acceptance,
    terminalTools: input.terminalTools,
    ...(input.outputSchema === undefined
      ? {}
      : { outputSchema: input.outputSchema }),
    ...(input.executionProfile === undefined
      ? {}
      : { executionProfile: input.executionProfile }),
  };
  return [
    "Execute exactly one bounded Work Cell from the JSON packet below.",
    "Use only this packet. No local environment or dynamic tool is available.",
    "Do not discover, load, request, or infer user or project files.",
    "Finish with only the JSON object required by the supplied output schema.",
    "terminalTool and input request one declared terminal action; the host validates and emits the real action.",
    "finalText is the concise final account of the bounded judgment.",
    "",
    "WORK_CELL_INPUT",
    JSON.stringify(packet, null, 2),
  ].join("\n");
}

function codexInitializeCapabilities(): JsonObject {
  return {
    experimentalApi: true,
    requestAttestation: false,
    optOutNotificationMethods: [],
  };
}

function codexThreadFixedBoundary(): JsonObject {
  return {
    allowProviderModelFallback: false,
    approvalPolicy: "never",
    sandbox: "read-only",
    personality: "none",
    ephemeral: true,
    baseInstructions: codexBaseInstructions(),
    developerInstructions:
      "Judge only the supplied Work Cell packet. Never claim an effect outside the returned terminal envelope.",
    dynamicTools: [],
    environments: [],
    runtimeWorkspaceRoots: [],
    selectedCapabilityRoots: [],
    config: codexThreadConfig(),
  };
}

function codexTurnFixedBoundary(): JsonObject {
  return {
    environments: [],
    runtimeWorkspaceRoots: [],
    additionalContext: {},
    approvalPolicy: "never",
    personality: "none",
  };
}

export function codexAppServerArgv(): string[] {
  return ["app-server", "--stdio", "--strict-config"];
}

export function codexThreadConfig(): JsonObject {
  return {
    project_doc_max_bytes: 0,
    shell_environment_policy: { inherit: "none" },
    allow_login_shell: false,
    analytics: { enabled: false },
    web_search: "disabled",
    include_permissions_instructions: false,
    include_apps_instructions: false,
    include_collaboration_mode_instructions: false,
    include_environment_context: false,
    skills: { include_instructions: false },
    mcp_servers: {},
    features: {
      browser_use: false,
      browser_use_external: false,
      browser_use_full_cdp_access: false,
      in_app_browser: false,
      computer_use: false,
      enable_mcp_apps: false,
      apps: false,
      plugins: false,
      remote_plugin: false,
      multi_agent: false,
      multi_agent_v2: false,
      image_generation: false,
    },
  };
}

export function codexBaseInstructions(): string {
  return [
    "You are a bounded decision function inside a Work Cell.",
    "The user packet is the complete task context.",
    "You have no local environment and no I/O tool.",
    "A non-I/O plan tool may be available for private reasoning.",
    "Return only the output-schema object; the host alone owns effects.",
  ].join("\n");
}

function codexProcessEnvironment(runtimeHome: string): Record<string, string> {
  const environment: Record<string, string> = {
    CODEX_HOME: runtimeHome,
    HOME: runtimeHome,
  };
  for (const key of [
    "LANG",
    "LC_ALL",
    "PATH",
    "SSL_CERT_DIR",
    "SSL_CERT_FILE",
    "TMPDIR",
  ]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function validateThreadBoundary(
  result: JsonObject,
  neutralCwd: string,
  model: string,
): string {
  const thread = requireRecord(result.thread, "thread/start thread");
  const threadId = requireString(thread.id, "thread/start thread id");
  if (
    result.cwd !== neutralCwd
    || thread.cwd !== neutralCwd
    || result.model !== model
    || result.modelProvider !== "openai"
    || result.approvalPolicy !== "never"
    || thread.ephemeral !== true
    || thread.path !== null
  ) {
    throw new Error("Codex app-server thread boundary drifted");
  }
  if (
    !Array.isArray(result.instructionSources)
    || result.instructionSources.length !== 0
    || !Array.isArray(result.runtimeWorkspaceRoots)
    || result.runtimeWorkspaceRoots.length !== 0
  ) {
    throw new Error(
      "Codex app-server loaded instruction sources or runtime workspace roots",
    );
  }
  if (
    !isRecord(result.sandbox)
    || result.sandbox.type !== "readOnly"
    || result.sandbox.networkAccess !== false
  ) {
    throw new Error("Codex app-server sandbox boundary drifted");
  }
  return threadId;
}

function validateCompletedTurn(turn: JsonObject): void {
  if (turn.status !== "completed") {
    const detail = turn.error === undefined
      ? ""
      : `: ${safeJson(turn.error)}`;
    throw new Error(
      `Codex app-server turn did not complete: ${String(turn.status)}${detail}`,
    );
  }
  if (!Array.isArray(turn.items)) {
    throw new Error("Codex app-server completed turn lacks items");
  }
  for (const item of turn.items) validateItem(item);
}

function validateNoEnvironmentOrIo(
  messages: readonly JsonObject[],
  threadId: string,
  turnId: string,
): void {
  for (const message of messages) {
    if (message.method === "thread/environment/connected") {
      throw new Error("Codex app-server connected a forbidden environment");
    }
    if (typeof message.id === "number" && typeof message.method === "string") {
      throw new Error(
        `Codex app-server issued forbidden server request ${message.method}`,
      );
    }
    if (
      (message.method === "item/started" || message.method === "item/completed")
      && isRecord(message.params)
      && message.params.threadId === threadId
      && message.params.turnId === turnId
    ) {
      validateItem(message.params.item);
    }
  }
}

function validateItem(value: unknown): void {
  const item = requireRecord(value, "Codex app-server item");
  const type = requireString(item.type, "Codex app-server item type");
  if (!ALLOWED_ITEM_TYPES.has(type)) {
    throw new Error(`Codex app-server emitted undeclared item ${type}`);
  }
}

function finalAgentMessage(
  messages: readonly JsonObject[],
  completedTurn: JsonObject,
  turnId: string,
): string | undefined {
  let finalText: string | undefined;
  for (const message of messages) {
    if (
      message.method !== "item/completed"
      || !isRecord(message.params)
      || message.params.turnId !== turnId
      || !isRecord(message.params.item)
      || message.params.item.type !== "agentMessage"
      || typeof message.params.item.text !== "string"
    ) {
      continue;
    }
    finalText = message.params.item.text;
  }
  if (finalText !== undefined) return finalText;
  if (!Array.isArray(completedTurn.items)) return undefined;
  for (const value of completedTurn.items) {
    if (
      isRecord(value)
      && value.type === "agentMessage"
      && typeof value.text === "string"
    ) {
      finalText = value.text;
    }
  }
  return finalText;
}

function usageFromMessages(
  messages: readonly JsonObject[],
  threadId: string,
  turnId: string,
): CellUsage {
  let observed: CellUsage | undefined;
  for (const message of messages) {
    if (
      message.method !== "thread/tokenUsage/updated"
      || !isRecord(message.params)
      || message.params.threadId !== threadId
      || message.params.turnId !== turnId
      || !isRecord(message.params.tokenUsage)
      || !isRecord(message.params.tokenUsage.total)
    ) {
      continue;
    }
    const total = message.params.tokenUsage.total;
    observed = {
      inputTokens: numberField(total, "inputTokens"),
      outputTokens: numberField(total, "outputTokens"),
      totalTokens: numberField(total, "totalTokens"),
      cachedInputTokens: numberField(total, "cachedInputTokens"),
    };
  }
  return observed ?? { ...EMPTY_USAGE };
}

function parseTerminalEnvelope(
  finalMessage: string,
  terminalTools: TerminalTool[],
  usage: CellUsage,
): TerminalEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(finalMessage);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CellExecutionError(
      `Codex app-server final message is not valid JSON: ${detail}`,
      usage,
    );
  }
  if (!isRecord(value)) {
    throw new CellExecutionError(
      "Codex app-server final message must be an object",
      usage,
    );
  }
  const allowed = new Set(["terminalTool", "input", "finalText"]);
  const extra = Object.keys(value).filter((key) => !allowed.has(key));
  if (extra.length > 0) {
    throw new CellExecutionError(
      `Codex app-server final message contains undeclared fields: ${
        extra.join(", ")
      }`,
      usage,
    );
  }
  if (
    typeof value.terminalTool !== "string"
    || !Object.hasOwn(value, "input")
    || typeof value.finalText !== "string"
  ) {
    throw new CellExecutionError(
      "Codex app-server final message must contain terminalTool, input, and finalText",
      usage,
    );
  }
  if (!terminalTools.some((tool) => tool.name === value.terminalTool)) {
    throw new CellExecutionError(
      `Codex app-server selected undeclared terminal tool: ${value.terminalTool}`,
      usage,
    );
  }
  return {
    terminalTool: value.terminalTool,
    input: value.input,
    finalText: value.finalText,
  };
}

function parseJsonRpcLine(line: string): JsonObject {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (error) {
    throw asError(error, "Codex app-server emitted invalid JSON");
  }
  return requireRecord(value, "Codex app-server JSON-RPC message");
}

function requireRecord(value: unknown, label: string): JsonObject {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function numberField(record: JsonObject, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function abortMessage(
  callerSignal: AbortSignal,
  timeoutSignal: AbortSignal,
  timeoutMs: number,
  error?: unknown,
): string {
  if (timeoutSignal.aborted && !callerSignal.aborted) {
    return `Codex app-server execution timed out after ${timeoutMs}ms`;
  }
  if (callerSignal.aborted) return "Codex app-server execution aborted";
  const detail =
    error instanceof Error ? error.message : error === undefined ? "" : String(error);
  return `Codex app-server process failed${detail ? `: ${detail}` : ""}`;
}

function asError(error: unknown, prefix: string): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`${prefix}: ${detail}`);
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n[truncated]`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function waitForExit(
  exited: Promise<number>,
  timeoutMs: number,
): Promise<number | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      exited,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
