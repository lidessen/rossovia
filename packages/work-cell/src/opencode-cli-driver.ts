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
      new Response(child.stdout).text(),
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
    if (input.tasks) unsupported("tasks");
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
    try {
      processResult = await this.processAdapter.run({
        executable: this.executable,
        argv,
        cwd: workspace,
        environment: currentEnvironment(),
        stdin: "",
        signal,
      });
    } catch (error) {
      const usage = { ...EMPTY_USAGE };
      context.observeUsage(usage);
      throw new CellExecutionError(
        abortMessage(context.signal, timeoutSignal, timeoutMs, error),
        usage,
      );
    }

    const parsed = parseOpenCodeStdout(processResult.stdout, input.budget.maxCommandOutputBytes);
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

function parseOpenCodeStdout(stdout: string, maxUnparsedBytes: number): ParsedOpenCodeOutput {
  const events: Record<string, unknown>[] = [];
  const unparsed: ParsedOpenCodeOutput["unparsed"] = [];
  const sessionIds = new Set<string>();
  const usage = { ...EMPTY_USAGE };
  let observedCost = 0;
  let stepText = "";
  let finalText: string | undefined;
  let retainedBytes = 0;

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      const remaining = maxUnparsedBytes - retainedBytes;
      if (remaining > 0) {
        const retained = truncate(rawLine, remaining);
        retainedBytes += Buffer.byteLength(retained);
        unparsed.push({ type: "opencode.cli.stdout.unparsed", line: retained });
      }
      continue;
    }
    if (!isRecord(event)) {
      const remaining = maxUnparsedBytes - retainedBytes;
      if (remaining > 0) {
        const retained = truncate(rawLine, remaining);
        retainedBytes += Buffer.byteLength(retained);
        unparsed.push({ type: "opencode.cli.stdout.unparsed", line: retained });
      }
      continue;
    }
    events.push(event);
    if (typeof event.sessionID === "string" && event.sessionID.trim()) sessionIds.add(event.sessionID);
    const part = isRecord(event.part) ? event.part : undefined;
    if (event.type === "step_start") stepText = "";
    if (event.type === "text" && part && typeof part.text === "string") stepText += part.text;
    if (event.type === "step_finish" && part) {
      const tokens = isRecord(part.tokens) ? part.tokens : {};
      usage.inputTokens += nonnegative(tokens.input);
      usage.outputTokens += nonnegative(tokens.output);
      usage.totalTokens += nonnegative(tokens.total);
      const cache = isRecord(tokens.cache) ? tokens.cache : {};
      usage.cachedInputTokens += nonnegative(cache.read);
      observedCost += nonnegative(part.cost);
      if (part.reason === "stop") finalText = stepText;
    }
  }

  const sessionId = sessionIds.size === 1 ? [...sessionIds][0] : undefined;
  const sessionError = sessionIds.size > 1
    ? `OpenCode CLI returned conflicting session ids: ${[...sessionIds].join(", ")}`
    : undefined;
  return { events, unparsed, sessionId, sessionError, finalText, usage, observedCost };
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
