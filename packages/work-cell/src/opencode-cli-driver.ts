import { realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { CellInput, CellUsage, DriverDescriptor } from "./contracts";
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

export interface OpenCodeCliDriverOptions {
  executable: string;
  model: string;
  reasoningEffort?: string;
  sessionId?: string;
  workspacePolicy: OpenCodeCliWorkspacePolicy;
  timeoutMs?: number;
  processAdapter?: OpenCodeCliProcessAdapter;
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
      readStdoutLines(child.stdout, request.onLine),
      new Response(child.stderr).text(),
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
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let stdout = "";
  let remainder = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text === "") continue;
    stdout += text;
    const combined = `${remainder}${text}`;
    const lastNewline = combined.lastIndexOf("\n");
    if (lastNewline === -1) {
      remainder = combined;
      continue;
    }
    for (const line of combined.slice(0, lastNewline).split("\n")) {
      onLine?.(stripLineBreak(line));
    }
    remainder = combined.slice(lastNewline + 1);
  }
  const tail = decoder.decode();
  if (tail !== "") {
    stdout += tail;
    remainder += tail;
  }
  if (remainder !== "") onLine?.(stripLineBreak(remainder));
  return stdout;
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

  constructor(private readonly options: OpenCodeCliDriverOptions) {
    this.executable = required(options.executable, "OpenCode CLI executable");
    const model = required(options.model, "OpenCode CLI model");
    this.reasoningEffort = optional(options.reasoningEffort, "OpenCode CLI reasoning effort");
    this.sessionId = optional(options.sessionId, "OpenCode CLI sessionId");
    if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error("OpenCode CLI timeoutMs must be a positive integer");
    }
    this.processAdapter = options.processAdapter ?? new BunOpenCodeCliProcessAdapter();
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
    const argv = [
      "run", prompt,
      "--pure", "--auto", "--format", "json", "--model", this.descriptor.model,
      // OpenCode names its provider-specific reasoning-effort option `--variant`.
      ...(this.reasoningEffort ? ["--variant", this.reasoningEffort] : []),
      ...(this.sessionId ? ["--session", this.sessionId] : []),
      "--dir", workspace,
    ];

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
        onLine(rawLine) {
          liveLines += 1;
          const event = accumulator.accept(rawLine);
          if (event === undefined) return;
          const progress = liveProgress(event);
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
      for (const rawLine of processResult.stdout.split(/\r?\n/u)) accumulator.accept(rawLine);
    }
    const parsed = accumulator.finish();
    for (const event of parsed.events) context.emit("opencode.cli.event", event);
    for (const entry of parsed.unparsed) context.emit("opencode.cli.stdout.unparsed", entry);
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
    if (parsed.finalText === undefined || !parsed.finalText.trim()) {
      throw new CellExecutionError("OpenCode CLI completed without final stopped-step text", parsed.usage);
    }

    return {
      terminalToolsCalled: [],
      finalText: parsed.finalText,
      usage: parsed.usage,
      rawSteps: [
        ...parsed.events,
        ...parsed.unparsed,
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
    ...(input.tasks === undefined
      ? []
      : [
        `Tasks:\nThe host already created these ordinary todos before this run. Adopt each one through your native todowrite tool as your first action, preserving its wording, and keep it updated as the work advances. They are ordinary work todos, not a separate startup phase or acceptance gate:\n${input.tasks.map((task) => `- ${task.subject}: ${task.description}`).join("\n")}`,
      ]),
    `Acceptance:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
    `Workspace policy:\n${JSON.stringify(input.workspace, null, 2)}`,
  ].join("\n");
}

interface ParsedOpenCodeOutput {
  events: Record<string, unknown>[];
  unparsed: Array<{ type: "opencode.cli.stdout.unparsed"; line: string }>;
  sessionId: string | undefined;
  sessionError: string | undefined;
  finalText: string | undefined;
  usage: CellUsage;
  observedCost: number;
}

/**
 * Incremental parse state over the JSONL stdout. `accept` consumes one
 * complete line exactly once and returns the parsed event when the line was
 * a valid JSON object, so live consumption and final aggregation share one
 * parse and can never double-count usage or duplicate events.
 */
class OpenCodeStdoutAccumulator {
  readonly events: Record<string, unknown>[] = [];
  readonly unparsed: ParsedOpenCodeOutput["unparsed"] = [];
  private readonly sessionIds = new Set<string>();
  private readonly usage: CellUsage = { ...EMPTY_USAGE };
  private observedCost = 0;
  private stepText = "";
  private finalText: string | undefined;
  private retainedBytes = 0;

  constructor(private readonly maxUnparsedBytes: number) {}

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
    this.events.push(event);
    if (typeof event.sessionID === "string" && event.sessionID.trim()) this.sessionIds.add(event.sessionID);
    const part = isRecord(event.part) ? event.part : undefined;
    if (event.type === "step_start") this.stepText = "";
    if (event.type === "text" && part && typeof part.text === "string") this.stepText += part.text;
    if (event.type === "step_finish" && part) {
      const tokens = isRecord(part.tokens) ? part.tokens : {};
      this.usage.inputTokens += nonnegative(tokens.input);
      this.usage.outputTokens += nonnegative(tokens.output);
      this.usage.totalTokens += nonnegative(tokens.total);
      const cache = isRecord(tokens.cache) ? tokens.cache : {};
      this.usage.cachedInputTokens += nonnegative(cache.read);
      this.observedCost += nonnegative(part.cost);
      if (part.reason === "stop") this.finalText = this.stepText;
    }
    return event;
  }

  finish(): ParsedOpenCodeOutput {
    const sessionId = this.sessionIds.size === 1 ? [...this.sessionIds][0] : undefined;
    const sessionError = this.sessionIds.size > 1
      ? `OpenCode CLI returned conflicting session ids: ${[...this.sessionIds].join(", ")}`
      : undefined;
    return {
      events: this.events,
      unparsed: this.unparsed,
      sessionId,
      sessionError,
      finalText: this.finalText,
      usage: { ...this.usage },
      observedCost: this.observedCost,
    };
  }

  private retainUnparsed(rawLine: string): void {
    const remaining = this.maxUnparsedBytes - this.retainedBytes;
    if (remaining <= 0) return;
    const retained = truncate(rawLine, remaining);
    this.retainedBytes += Buffer.byteLength(retained);
    this.unparsed.push({ type: "opencode.cli.stdout.unparsed", line: retained });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return bytes.subarray(0, Math.max(0, maxBytes)).toString("utf8");
}
