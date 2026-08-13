import { realpath } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute } from "node:path";
import { Database } from "bun:sqlite";
import type { CellInput, CellUsage, DriverDescriptor, Task, TaskSeed, TaskStatus } from "./contracts";
import {
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "./driver";

export interface OpenCodeCliWorkspacePolicy {
  select(input: CellInput, context: DriverContext): string | Promise<string>;
}

export interface OpenCodeCliProcessRequest {
  executable: string;
  argv: string[];
  cwd: string;
  environment: Record<string, string>;
  stdin: string;
  signal: AbortSignal;
  /** Maximum bytes retained from either process output stream. */
  maxOutputBytes?: number;
  /**
   * Delivers each complete stdout line as it arrives, including the final
   * unterminated remainder. An adapter that calls this must deliver every
   * line of stdout exactly once; the driver then treats delivered lines as
   * the complete parse source instead of re-parsing the returned stdout.
   */
  onLine?: (line: string) => void;
}

export interface OpenCodeCliProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface OpenCodeCliProcessAdapter {
  run(request: OpenCodeCliProcessRequest): Promise<OpenCodeCliProcessResult>;
}

export interface OpenCodeCliServerRequest {
  executable: string;
  cwd: string;
  environment: Record<string, string>;
  signal: AbortSignal;
}

export interface OpenCodeCliServerHandle {
  url: string;
  stop(): Promise<void>;
}

export interface OpenCodeCliServerAdapter {
  start(request: OpenCodeCliServerRequest): Promise<OpenCodeCliServerHandle>;
}

export interface OpenCodeCliDriverOptions {
  executable: string;
  model: string;
  reasoningEffort?: string;
  sessionId?: string;
  workspacePolicy: OpenCodeCliWorkspacePolicy;
  timeoutMs?: number;
  processAdapter?: OpenCodeCliProcessAdapter;
  serverAdapter?: OpenCodeCliServerAdapter;
}

const EMPTY_USAGE: CellUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedInputTokens: 0,
};

export class BunOpenCodeCliProcessAdapter implements OpenCodeCliProcessAdapter {
  async run(request: OpenCodeCliProcessRequest): Promise<OpenCodeCliProcessResult> {
    const startedAt = performance.now();
    const child = Bun.spawn([request.executable, ...request.argv], {
      cwd: request.cwd,
      env: request.environment,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      signal: request.signal,
    });
    child.stdin.write(request.stdin);
    child.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([
      readStdoutLines(child.stdout, request.onLine, request.maxOutputBytes),
      readBoundedText(child.stderr, request.maxOutputBytes),
      child.exited,
    ]);
    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }
}

/**
 * Consume stdout as chunks arrive and deliver each complete line once.
 * Lines are split only on newline (a trailing carriage return is stripped),
 * so buffered output spanning chunk boundaries is joined before delivery and
 * the final unterminated line is delivered when the stream closes.
 */
async function readStdoutLines(
  stream: ReadableStream<Uint8Array>,
  onLine: ((line: string) => void) | undefined,
  maxOutputBytes = DEFAULT_PROCESS_OUTPUT_BYTES,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const maxLineBytes = Math.max(maxOutputBytes, MIN_STRUCTURAL_RETENTION_BYTES);
  // A live consumer is the parse sink. Do not retain a second copy of the
  // complete stream merely to return it after every line has been delivered.
  let stdout = "";
  let remainder = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text === "") continue;
    if (onLine === undefined) stdout = appendBounded(stdout, text, maxOutputBytes);
    let start = 0;
    for (;;) {
      const newline = text.indexOf("\n", start);
      if (newline === -1) break;
      remainder = appendBounded(remainder, text.slice(start, newline), maxLineBytes);
      onLine?.(stripLineBreak(remainder));
      remainder = "";
      start = newline + 1;
    }
    remainder = appendBounded(remainder, text.slice(start), maxLineBytes);
  }
  const tail = decoder.decode();
  if (tail !== "") {
    if (onLine === undefined) stdout = appendBounded(stdout, tail, maxOutputBytes);
    remainder = appendBounded(remainder, tail, maxLineBytes);
  }
  if (remainder !== "") onLine?.(stripLineBreak(remainder));
  return stdout;
}

async function readBoundedText(
  stream: ReadableStream<Uint8Array>,
  maxOutputBytes = DEFAULT_PROCESS_OUTPUT_BYTES,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text = appendBounded(text, decoder.decode(value, { stream: true }), maxOutputBytes);
  }
  return appendBounded(text, decoder.decode(), maxOutputBytes);
}

const SERVER_READY_TIMEOUT_MS = 10_000;
const SESSION_CLEANUP_TIMEOUT_MS = 2_000;
const DEFAULT_PROCESS_OUTPUT_BYTES = 64_000;
const MIN_STRUCTURAL_RETENTION_BYTES = 1_024;
const MAX_SESSION_ID_BYTES = 1_024;

export class BunOpenCodeCliServerAdapter implements OpenCodeCliServerAdapter {
  async start(request: OpenCodeCliServerRequest): Promise<OpenCodeCliServerHandle> {
    const port = await freeLoopbackPort();
    let child: ReturnType<typeof Bun.spawn>;
    try {
      child = Bun.spawn([request.executable, "serve", "--port", String(port), "--hostname", "127.0.0.1"], {
        cwd: request.cwd,
        env: request.environment,
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
    } catch (error) {
      throw new Error(`could not spawn opencode serve: ${errorMessage(error)}`);
    }
    const url = `http://127.0.0.1:${port}`;
    let stopped = false;
    const stop = async (): Promise<void> => {
      if (stopped) return;
      stopped = true;
      child.kill();
      const exited = await Promise.race([child.exited.then(() => true), sleep(2_000).then(() => false)]);
      if (!exited) child.kill("SIGKILL");
    };
    const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
    for (;;) {
      if (request.signal.aborted) {
        await stop();
        throw new Error("aborted before the opencode server became ready");
      }
      try {
        const response = await fetch(`${url}/doc`, { signal: request.signal });
        if (response.ok) return { url, stop };
      } catch {
        // not ready yet
      }
      if (Date.now() > deadline) {
        await stop();
        throw new Error("opencode serve did not become ready within 10s");
      }
      await sleep(100);
    }
  }
}

async function freeLoopbackPort(): Promise<number> {
  const server = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(typeof address === "object" && address !== null ? address.port : 0));
    });
  });
  if (port === 0) throw new Error("could not allocate a loopback port");
  return port;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripLineBreak(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

export class OpenCodeCliDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  private readonly executable: string;
  private readonly reasoningEffort: string | undefined;
  private readonly sessionId: string | undefined;
  private readonly processAdapter: OpenCodeCliProcessAdapter;
  private readonly serverAdapter: OpenCodeCliServerAdapter;

  constructor(private readonly options: OpenCodeCliDriverOptions) {
    this.executable = required(options.executable, "OpenCode CLI executable");
    const model = required(options.model, "OpenCode CLI model");
    this.reasoningEffort = optional(options.reasoningEffort, "OpenCode CLI reasoning effort");
    this.sessionId = optional(options.sessionId, "OpenCode CLI sessionId");
    if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error("OpenCode CLI timeoutMs must be a positive integer");
    }
    this.processAdapter = options.processAdapter ?? new BunOpenCodeCliProcessAdapter();
    this.serverAdapter = options.serverAdapter ?? new BunOpenCodeCliServerAdapter();
    this.descriptor = {
      adapter: "opencode-cli.v1",
      provider: model.split("/", 1)[0]!,
      model,
    };
  }

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    if (input.terminalTools) unsupported("terminalTools");
    if (input.outputSchema) unsupported("outputSchema");
    if (!input.workspace.writePaths.includes(".")) {
      throw new CellExecutionError(
        'OpenCode CLI driver requires workspace.writePaths to include "." for full-worktree change capture',
        EMPTY_USAGE,
      );
    }

    const workspace = await this.resolveWorkspace(input, context);
    const prompt = createOpenCodeCliPrompt(input);
    const timeoutMs = Math.min(
      input.budget.maxDurationMs,
      this.options.timeoutMs ?? input.budget.maxDurationMs,
    );
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    const seeds = input.tasks ?? [];
    let server: OpenCodeCliServerHandle | undefined;
    let createdSessionId: string | undefined;
    try {
      const argv = [
        "run", prompt,
        "--pure", "--auto", "--format", "json", "--model", this.descriptor.model,
        // OpenCode names its provider-specific reasoning-effort option `--variant`.
        ...(this.reasoningEffort ? ["--variant", this.reasoningEffort] : []),
      ];
      let taskSessionId: string | undefined;
      if (seeds.length > 0) {
        server = await this.startSeedServer(workspace, signal);
        taskSessionId = this.sessionId ?? await this.createSession(server.url, signal);
        if (this.sessionId === undefined) {
          createdSessionId = taskSessionId;
          const dbPath = await this.databasePath(
            workspace,
            signal,
            input.budget.maxCommandOutputBytes,
          );
          seedNativeTodos(dbPath, taskSessionId, seeds);
        }
        await this.nativeTaskProjection(
          server.url,
          taskSessionId,
          input.id,
          seeds,
          signal,
          this.sessionId === undefined ? "seeded" : "existing",
        );
        argv.push("--session", taskSessionId, "--attach", server.url, "--dir", workspace);
      } else {
        argv.push(...(this.sessionId ? ["--session", this.sessionId] : []), "--dir", workspace);
      }

      context.emit("opencode.cli.started", {
        adapter: this.descriptor.adapter,
        model: this.descriptor.model,
        workspace,
        timeoutMs,
      });

      let processResult: OpenCodeCliProcessResult;
      const accumulator = new OpenCodeStdoutAccumulator(input.budget.maxCommandOutputBytes);
      let liveLines = 0;
      try {
        processResult = await this.processAdapter.run({
          executable: this.executable,
          argv,
          cwd: workspace,
          environment: currentEnvironment(),
          stdin: "",
          signal,
          maxOutputBytes: input.budget.maxCommandOutputBytes,
          onLine(rawLine) {
            liveLines += 1;
            const progress = accumulator.accept(rawLine);
            if (progress !== undefined) context.emit("opencode.cli.progress", progress);
          },
        });
      } catch (error) {
        const usage = { ...EMPTY_USAGE };
        context.observeUsage(usage);
        throw new CellExecutionError(
          abortMessage(context.signal, timeoutSignal, timeoutMs, error),
          usage,
        );
      }

      if (liveLines === 0) {
        consumeStdoutLines(processResult.stdout, (rawLine) => accumulator.accept(rawLine));
      }
      const parsed = accumulator.finish();
      for (const event of parsed.events) context.emit("opencode.cli.event", event);
      for (const entry of parsed.unparsed) context.emit("opencode.cli.stdout.unparsed", entry);
      if (parsed.retention) context.emit("opencode.cli.retention", parsed.retention);
      const stderr = truncate(processResult.stderr.trim(), input.budget.maxCommandOutputBytes);
      if (stderr) context.emit("opencode.cli.stderr", { text: stderr });

      context.observeUsage(parsed.usage);
      context.emit("opencode.cli.finished", {
        exitCode: processResult.exitCode,
        durationMs: processResult.durationMs,
        usage: parsed.usage,
      });

      if (signal.aborted) {
        throw new CellExecutionError(abortMessage(context.signal, timeoutSignal, timeoutMs), parsed.usage);
      }
      if (processResult.exitCode !== 0) {
        throw new CellExecutionError(
          `OpenCode CLI exited with code ${processResult.exitCode}: ${stderr || "no stderr"}`,
          parsed.usage,
        );
      }
      if (parsed.sessionError) throw new CellExecutionError(parsed.sessionError, parsed.usage);
      if (!parsed.sessionId) {
        throw new CellExecutionError("OpenCode CLI completed without a session id", parsed.usage);
      }
      const expectedSessionId = taskSessionId ?? this.sessionId;
      if (expectedSessionId !== undefined && parsed.sessionId !== expectedSessionId) {
        throw new CellExecutionError(
          `OpenCode CLI returned session ${parsed.sessionId} for requested session ${expectedSessionId}`,
          parsed.usage,
        );
      }
      if (parsed.finalText === undefined || !parsed.finalText.trim()) {
        throw new CellExecutionError("OpenCode CLI completed without final stopped-step text", parsed.usage);
      }
      if (parsed.finalTextTruncated) {
        throw new CellExecutionError(
          `OpenCode CLI final stopped-step text exceeds maxCommandOutputBytes (${input.budget.maxCommandOutputBytes})`,
          parsed.usage,
        );
      }
      const tasks = taskSessionId && server
        ? await this.nativeTaskProjection(
            server.url,
            taskSessionId,
            input.id,
            seeds,
            signal,
            "final",
            parsed.usage,
          )
        : undefined;

      return {
        terminalToolsCalled: [],
        ...(tasks ? { tasks } : {}),
        finalText: parsed.finalText,
        usage: parsed.usage,
        rawSteps: [
          ...parsed.events,
          ...parsed.unparsed,
          ...(parsed.retention ? [parsed.retention] : []),
          {
            type: "opencode.cli.process",
            exitCode: processResult.exitCode,
            durationMs: processResult.durationMs,
            stderr,
          },
        ],
        providerMetadata: {
          adapter: this.descriptor.adapter,
          sessionId: parsed.sessionId,
          exitCode: processResult.exitCode,
          durationMs: processResult.durationMs,
          observedCost: parsed.observedCost,
        },
      };
    } catch (error) {
      if (server && createdSessionId) {
        const deleted = await this.deleteSession(server.url, createdSessionId);
        context.emit("opencode.cli.session_cleanup", { sessionId: createdSessionId, deleted });
      }
      try {
        await server?.stop();
      } catch {
        // Preserve the attributable execution failure after bounded cleanup.
      }
      server = undefined;
      throw error;
    } finally {
      await server?.stop();
    }
  }

  private async startSeedServer(workspace: string, signal: AbortSignal): Promise<OpenCodeCliServerHandle> {
    try {
      return await this.serverAdapter.start({
        executable: this.executable,
        cwd: workspace,
        environment: currentEnvironment(),
        signal,
      });
    } catch (error) {
      throw new CellExecutionError(
        `OpenCode CLI todo seeding could not start the loopback server: ${errorMessage(error)}`,
        EMPTY_USAGE,
      );
    }
  }

  private async createSession(url: string, signal: AbortSignal): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${url}/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Work Cell todo-seeded run",
          model: { id: this.descriptor.model, providerID: this.descriptor.provider },
        }),
        signal,
      });
    } catch (error) {
      throw new CellExecutionError(`OpenCode session creation failed: ${errorMessage(error)}`, EMPTY_USAGE);
    }
    if (!response.ok) {
      throw new CellExecutionError(`OpenCode session creation failed with HTTP ${response.status}`, EMPTY_USAGE);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new CellExecutionError("OpenCode session creation returned a non-JSON response", EMPTY_USAGE);
    }
    if (!isRecord(body) || typeof body.id !== "string" || body.id === "") {
      throw new CellExecutionError("OpenCode session creation returned no session id", EMPTY_USAGE);
    }
    return body.id;
  }

  private async databasePath(
    workspace: string,
    signal: AbortSignal,
    maxOutputBytes: number,
  ): Promise<string> {
    let result: OpenCodeCliProcessResult;
    try {
      result = await this.processAdapter.run({
        executable: this.executable,
        argv: ["db", "path"],
        cwd: workspace,
        environment: currentEnvironment(),
        stdin: "",
        signal,
        maxOutputBytes,
      });
    } catch (error) {
      throw new CellExecutionError(`OpenCode CLI db path failed: ${errorMessage(error)}`, EMPTY_USAGE);
    }
    if (result.exitCode !== 0) {
      throw new CellExecutionError(
        `OpenCode CLI db path exited with code ${result.exitCode}: ${result.stderr.trim() || "no stderr"}`,
        EMPTY_USAGE,
      );
    }
    const path = result.stdout.trim();
    if (!path) throw new CellExecutionError("OpenCode CLI db path returned an empty path", EMPTY_USAGE);
    return path;
  }

  private async deleteSession(url: string, sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/session/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(SESSION_CLEANUP_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      // Cleanup is bounded and must never replace the attributable execution
      // failure that caused it.
      return false;
    }
  }

  private async nativeTaskProjection(
    url: string,
    sessionId: string,
    owner: string,
    seeds: TaskSeed[],
    signal: AbortSignal,
    phase: "seeded" | "existing" | "final",
    usage: CellUsage = EMPTY_USAGE,
  ): Promise<Task[]> {
    const label = phase === "final"
      ? "OpenCode final todo projection"
      : "OpenCode todo initialization verification";
    let response: Response;
    try {
      response = await fetch(`${url}/session/${encodeURIComponent(sessionId)}/todo`, { signal });
    } catch (error) {
      throw new CellExecutionError(`${label} failed: ${errorMessage(error)}`, usage);
    }
    if (!response.ok) {
      throw new CellExecutionError(`${label} failed with HTTP ${response.status}`, usage);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new CellExecutionError(`${label} returned a non-JSON response`, usage);
    }
    if (!Array.isArray(body)) {
      throw new CellExecutionError(`${label} returned a non-array response`, usage);
    }
    const contents = body
      .map((todo) => (isRecord(todo) && typeof todo.content === "string" ? todo.content : undefined))
      .filter((content): content is string => content !== undefined);
    const expected = seeds.map((seed) => seed.subject);
    if (contents.length !== expected.length || expected.some((content, index) => content !== contents[index])) {
      throw new CellExecutionError(
        `${label} failed: expected ${JSON.stringify(expected)} but the session reports ${JSON.stringify(contents)}`,
        usage,
      );
    }
    const tasks = body.map((todo, index): Task => {
      const status = isRecord(todo) ? todo.status : undefined;
      if (!isTaskStatus(status)) {
        throw new CellExecutionError(
          `${label} returned invalid status at position ${index}: ${String(status)}`,
          usage,
        );
      }
      const seed = seeds[index]!;
      return {
        id: `task-${index + 1}`,
        subject: seed.subject,
        description: seed.description,
        status,
        owner,
        blockedBy: [],
      };
    });
    if (phase === "seeded" && tasks.some((task) => task.status !== "pending")) {
      throw new CellExecutionError(
        `${label} failed: newly seeded todos must all be pending`,
        usage,
      );
    }
    return tasks;
  }

  private async resolveWorkspace(input: CellInput, context: DriverContext): Promise<string> {
    const selected = await this.options.workspacePolicy.select(input, context);
    if (!isAbsolute(selected)) {
      throw new CellExecutionError("OpenCode CLI workspace policy must select an absolute path", EMPTY_USAGE);
    }
    const canonical = await realpath(selected);
    if (canonical !== context.workspace.root) {
      throw new CellExecutionError(
        "OpenCode CLI workspace policy must select the Work Cell canonical workspace root",
        EMPTY_USAGE,
      );
    }
    return canonical;
  }
}

export function createOpenCodeCliPrompt(input: CellInput): string {
  return [
    "Execute the bounded Work Cell described below.",
    "Read repository guidance. Stay inside the supplied disposable worktree and make only the requested changes.",
    "Run the named checks and report changed files, checks, and remaining uncertainty.",
    "",
    `Intent:\n${input.intent}`,
    `Instructions:\n${input.instructions.map((item) => `- ${item}`).join("\n")}`,
    `Context:\n${input.context.map((item) => `${item.title}: ${item.content}`).join("\n") || "(none)"}`,
    `Acceptance:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
    `Workspace policy:\n${JSON.stringify(input.workspace, null, 2)}`,
  ].join("\n");
}

function seedNativeTodos(dbPath: string, sessionId: string, seeds: TaskSeed[]): void {
  let db: Database;
  try {
    db = new Database(dbPath);
  } catch (error) {
    throw new CellExecutionError(
      `OpenCode native todo database could not be opened: ${errorMessage(error)}`,
      EMPTY_USAGE,
    );
  }
  try {
    const now = Date.now();
    const insert = db.prepare(
      "INSERT INTO todo (session_id, content, status, priority, position, time_created, time_updated) VALUES (?, ?, 'pending', 'high', ?, ?, ?)",
    );
    try {
      for (const [position, seed] of seeds.entries()) {
        insert.run(sessionId, seed.subject, position, now, now);
      }
    } finally {
      insert.finalize();
    }
  } catch (error) {
    throw new CellExecutionError(
      `OpenCode native todo initialization failed: ${errorMessage(error)}`,
      EMPTY_USAGE,
    );
  } finally {
    db.close();
  }
}

interface ParsedOpenCodeOutput {
  events: Record<string, unknown>[];
  unparsed: Array<{ type: "opencode.cli.stdout.unparsed"; line: string }>;
  retention: Record<string, unknown> | undefined;
  sessionId: string | undefined;
  sessionError: string | undefined;
  finalText: string | undefined;
  finalTextTruncated: boolean;
  usage: CellUsage;
  observedCost: number;
}

/**
 * Incremental parse state over the JSONL stdout. `accept` consumes one
 * complete line exactly once. It always accumulates fixed-size session and
 * usage evidence, while raw events, live progress, malformed output, and the
 * current final-step text each have explicit byte bounds.
 */
class OpenCodeStdoutAccumulator {
  readonly events: Record<string, unknown>[] = [];
  readonly unparsed: ParsedOpenCodeOutput["unparsed"] = [];
  private readonly usage: CellUsage = { ...EMPTY_USAGE };
  private readonly structuralLimit: number;
  private sessionIdValue: string | undefined;
  private sessionErrorValue: string | undefined;
  private observedCost = 0;
  private stepText = "";
  private finalText: string | undefined;
  private stepTextTruncated = false;
  private finalTextTruncated = false;
  private retainedEventBytes = 0;
  private retainedProgressBytes = 0;
  private retainedUnparsedBytes = 0;
  private omittedEvents = 0;
  private omittedProgress = 0;
  private omittedUnparsed = 0;

  constructor(private readonly maxOutputBytes: number) {
    this.structuralLimit = Math.max(maxOutputBytes, MIN_STRUCTURAL_RETENTION_BYTES);
  }

  accept(rawLine: string): Record<string, unknown> | undefined {
    const line = rawLine.trim();
    if (!line) return undefined;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      this.retainUnparsed(rawLine);
      return undefined;
    }
    if (!isRecord(event)) {
      this.retainUnparsed(rawLine);
      return undefined;
    }
    this.retainEvent(event);
    this.observeSession(event.sessionID);
    const part = isRecord(event.part) ? event.part : undefined;
    if (event.type === "step_start") {
      this.stepText = "";
      this.stepTextTruncated = false;
    }
    if (event.type === "text" && part && typeof part.text === "string") {
      const remaining = Math.max(0, this.maxOutputBytes - Buffer.byteLength(this.stepText));
      const retained = truncate(part.text, remaining);
      this.stepText += retained;
      if (retained !== part.text) this.stepTextTruncated = true;
    }
    if (event.type === "step_finish" && part) {
      const tokens = isRecord(part.tokens) ? part.tokens : {};
      this.usage.inputTokens += nonnegative(tokens.input);
      this.usage.outputTokens += nonnegative(tokens.output);
      this.usage.totalTokens += nonnegative(tokens.total);
      const cache = isRecord(tokens.cache) ? tokens.cache : {};
      this.usage.cachedInputTokens += nonnegative(cache.read);
      this.observedCost += nonnegative(part.cost);
      if (part.reason === "stop") {
        this.finalText = this.stepText;
        this.finalTextTruncated = this.stepTextTruncated;
      }
    }
    return this.retainProgress(event);
  }

  finish(): ParsedOpenCodeOutput {
    const hasOmissions = this.omittedEvents > 0
      || this.omittedProgress > 0
      || this.omittedUnparsed > 0
      || this.finalTextTruncated;
    return {
      events: this.events,
      unparsed: this.unparsed,
      retention: hasOmissions
        ? {
            type: "opencode.cli.retention",
            maxOutputBytes: this.maxOutputBytes,
            omittedEvents: this.omittedEvents,
            omittedProgress: this.omittedProgress,
            omittedUnparsed: this.omittedUnparsed,
            finalTextTruncated: this.finalTextTruncated,
          }
        : undefined,
      sessionId: this.sessionErrorValue ? undefined : this.sessionIdValue,
      sessionError: this.sessionErrorValue,
      finalText: this.finalText,
      finalTextTruncated: this.finalTextTruncated,
      usage: { ...this.usage },
      observedCost: this.observedCost,
    };
  }

  private observeSession(value: unknown): void {
    if (typeof value !== "string" || !value.trim() || this.sessionErrorValue) return;
    if (Buffer.byteLength(value) > MAX_SESSION_ID_BYTES) {
      this.sessionErrorValue = `OpenCode CLI returned a session id larger than ${MAX_SESSION_ID_BYTES} bytes`;
      return;
    }
    if (this.sessionIdValue === undefined) {
      this.sessionIdValue = value;
    } else if (this.sessionIdValue !== value) {
      this.sessionErrorValue = `OpenCode CLI returned conflicting session ids: ${this.sessionIdValue}, ${value}`;
    }
  }

  private retainEvent(event: Record<string, unknown>): void {
    const bytes = Buffer.byteLength(JSON.stringify(event));
    if (bytes > this.structuralLimit - this.retainedEventBytes) {
      this.omittedEvents += 1;
      return;
    }
    this.retainedEventBytes += bytes;
    this.events.push(event);
  }

  private retainProgress(event: Record<string, unknown>): Record<string, unknown> | undefined {
    const progress = liveProgress(event);
    if (progress === undefined) return undefined;
    const bytes = Buffer.byteLength(JSON.stringify(progress));
    if (bytes > this.structuralLimit - this.retainedProgressBytes) {
      this.omittedProgress += 1;
      return undefined;
    }
    this.retainedProgressBytes += bytes;
    return progress;
  }

  private retainUnparsed(rawLine: string): void {
    const remaining = this.maxOutputBytes - this.retainedUnparsedBytes;
    if (remaining <= 0) {
      this.omittedUnparsed += 1;
      return;
    }
    const retained = truncate(rawLine, remaining);
    this.retainedUnparsedBytes += Buffer.byteLength(retained);
    this.unparsed.push({ type: "opencode.cli.stdout.unparsed", line: retained });
    if (retained !== rawLine) this.omittedUnparsed += 1;
  }
}

/**
 * Project a parsed event onto the safe machine fields that may be shown to
 * an operator while the worker is still running: the event type (which names
 * the phase), the session identity, and the tool name carried as a string by
 * tool_use events. Text parts, reasoning, and tool input/output are never
 * projected.
 */
function liveProgress(event: Record<string, unknown>): Record<string, unknown> | undefined {
  if (typeof event.type !== "string" || event.type.trim() === "") return undefined;
  const part = isRecord(event.part) ? event.part : undefined;
  const tool = typeof part?.tool === "string" && part.tool.trim() !== "" ? part.tool : undefined;
  const progress: Record<string, unknown> = { type: event.type };
  if (typeof event.sessionID === "string" && event.sessionID.trim() !== "") {
    progress.sessionID = event.sessionID;
  }
  if (tool !== undefined) progress.tool = tool;
  return progress;
}

function currentEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function required(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} must not be empty`);
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function optional(value: string | undefined, label: string): string | undefined {
  if (value === undefined) return undefined;
  return required(value, label);
}

function unsupported(name: string): never {
  throw new CellExecutionError(`OpenCode CLI driver does not support ${name}`, EMPTY_USAGE);
}

function abortMessage(
  callerSignal: AbortSignal,
  timeoutSignal: AbortSignal,
  timeoutMs: number,
  error?: unknown,
): string {
  if (timeoutSignal.aborted && !callerSignal.aborted) return `OpenCode CLI execution timed out after ${timeoutMs}ms`;
  if (callerSignal.aborted) {
    const reason = callerSignal.reason;
    return reason instanceof Error ? reason.message : "OpenCode CLI execution aborted";
  }
  const detail = error instanceof Error ? error.message : error === undefined ? "" : String(error);
  return `OpenCode CLI process failed${detail ? `: ${detail}` : ""}`;
}

function nonnegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "pending" || value === "in_progress" || value === "completed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function consumeStdoutLines(stdout: string, accept: (line: string) => void): void {
  let start = 0;
  for (;;) {
    const newline = stdout.indexOf("\n", start);
    if (newline === -1) break;
    accept(stripLineBreak(stdout.slice(start, newline)));
    start = newline + 1;
  }
  if (start < stdout.length) accept(stripLineBreak(stdout.slice(start)));
}

function appendBounded(value: string, addition: string, maxBytes: number): string {
  const remaining = Math.max(0, maxBytes - Buffer.byteLength(value));
  return remaining === 0 ? value : value + truncate(addition, remaining);
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return bytes.subarray(0, Math.max(0, maxBytes)).toString("utf8");
}
