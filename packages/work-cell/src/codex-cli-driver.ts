import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import type {
  CellInput,
  CellUsage,
  DriverDescriptor,
  OutputSchema,
  TerminalTool,
} from "./contracts";
import {
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "./driver";
import { compileOutputSchema } from "./output-schema";

export interface CodexCliWorkspacePolicy {
  /**
   * Select the caller-created disposable workspace for this invocation.
   * The selected directory must be the same canonical root used by Work Cell.
   */
  select(input: CellInput, context: DriverContext): string | Promise<string>;
}

export interface CodexCliProcessRequest {
  executable: string;
  argv: string[];
  cwd: string;
  environment: Record<string, string>;
  stdin: string;
  signal: AbortSignal;
}

export interface CodexCliProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface CodexCliProcessAdapter {
  run(request: CodexCliProcessRequest): Promise<CodexCliProcessResult>;
}

export interface CodexCliDriverOptions {
  /** Executable selection is host policy; the adapter never searches for Codex. */
  executable: string;
  /** Auth is copied into a fresh minimal CODEX_HOME for this invocation. */
  authFile: string;
  /** Model selection is explicit and never inherited from user configuration. */
  model: string;
  /** The host must supply a disposable workspace policy. */
  workspacePolicy: CodexCliWorkspacePolicy;
  /** Injectable process boundary for tests and non-Bun hosts. */
  processAdapter?: CodexCliProcessAdapter;
  /** Optional adapter-local ceiling; CellInput's duration budget still applies. */
  timeoutMs?: number;
}

interface CodexTerminalEnvelope {
  terminalTool: string;
  input: unknown;
  finalText: string;
}

interface ParsedCodexOutput {
  events: Record<string, unknown>[];
  unparsedLines: string[];
  finalMessage?: string;
}

const EMPTY_USAGE: CellUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedInputTokens: 0,
};

/**
 * The ordinary Bun process carrier. Bun.spawn receives an argv vector, so no
 * prompt, path, model, or executable value is interpolated through a shell.
 * The process receives only the small launcher allowlist needed to find its
 * installed auth carrier and system certificates. Model-visible execution
 * tools are disabled separately, so no child command can inspect that launcher
 * environment or read beyond the supplied terminal-decision prompt.
 */
export class BunCodexCliProcessAdapter implements CodexCliProcessAdapter {
  async run(request: CodexCliProcessRequest): Promise<CodexCliProcessResult> {
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

/**
 * A fresh, read-only Codex CLI execution carrier for terminal-tool Cells.
 *
 * Codex does not receive callable host tools. It returns one schema-constrained
 * terminal envelope; this adapter validates the selected terminal and its
 * input before emitting the real terminal.tool.called event.
 */
export class CodexCliDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  private readonly executable: string;
  private readonly processAdapter: CodexCliProcessAdapter;

  constructor(private readonly options: CodexCliDriverOptions) {
    const executable = options.executable.trim();
    const model = options.model.trim();
    if (!executable) throw new Error("Codex CLI executable must not be empty");
    if (!isAbsolute(options.authFile)) {
      throw new Error("Codex CLI authFile must be an absolute path");
    }
    if (!model) throw new Error("Codex CLI model must not be empty");
    if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new Error("Codex CLI timeoutMs must be a positive integer");
    }
    this.executable = executable;
    this.processAdapter = options.processAdapter ?? new BunCodexCliProcessAdapter();
    this.descriptor = {
      adapter: "codex-cli.v1",
      provider: "openai",
      model,
    };
  }

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    const terminalTools = input.terminalTools ?? [];
    if (terminalTools.length === 0) {
      throw new CellExecutionError(
        "Codex CLI driver requires at least one declared terminal tool",
        EMPTY_USAGE,
      );
    }

    const workspace = await this.resolveWorkspace(input, context);
    const outputSchema = createCodexCliOutputSchema(terminalTools);
    const prompt = createCodexCliPrompt(input);
    const schemaDirectory = await mkdtemp(join(tmpdir(), "work-cell-codex-schema-"));
    const runtimeHome = await mkdtemp(join(tmpdir(), "work-cell-codex-home-"));
    const schemaPath = join(schemaDirectory, "terminal-output.schema.json");
    try {
      await writeFile(
        join(runtimeHome, "auth.json"),
        await readFile(this.options.authFile),
        { mode: 0o600 },
      );
      await writeFile(schemaPath, `${JSON.stringify(outputSchema, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      await Promise.all([
        rm(schemaDirectory, { recursive: true, force: true }),
        rm(runtimeHome, { recursive: true, force: true }),
      ]);
      throw error;
    }

    const timeoutMs = Math.min(
      input.budget.maxDurationMs,
      this.options.timeoutMs ?? input.budget.maxDurationMs,
    );
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    const argv = [
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
      workspace,
      "--model",
      this.descriptor.model,
      "-c",
      "project_doc_max_bytes=0",
      "-c",
      'shell_environment_policy.inherit="none"',
      "-c",
      "allow_login_shell=false",
      "--json",
      "--output-schema",
      schemaPath,
      "-",
    ];

    context.emit("codex.cli.started", {
      adapter: this.descriptor.adapter,
      model: this.descriptor.model,
      workspace,
      timeoutMs,
    });

    let processResult: CodexCliProcessResult;
    try {
      processResult = await this.processAdapter.run({
        executable: this.executable,
        argv,
        cwd: workspace,
        environment: codexProcessEnvironment(runtimeHome),
        stdin: prompt,
        signal,
      });
    } catch (error) {
      const message = abortMessage(context.signal, timeoutSignal, timeoutMs, error);
      context.emit("codex.cli.error", { error: message });
      throw new CellExecutionError(message, EMPTY_USAGE);
    } finally {
      await Promise.all([
        rm(schemaDirectory, { recursive: true, force: true }),
        rm(runtimeHome, { recursive: true, force: true }),
      ]);
    }

    const parsed = parseCodexStdout(processResult.stdout);
    for (const event of parsed.events) {
      context.emit("codex.cli.event", event);
    }
    for (const line of parsed.unparsedLines) {
      context.emit("codex.cli.stdout.unparsed", { line: truncate(line, 2_000) });
    }
    if (processResult.stderr.trim()) {
      context.emit("codex.cli.stderr", {
        text: truncate(processResult.stderr.trim(), input.budget.maxCommandOutputBytes),
      });
    }

    const usage = codexUsage(parsed.events);
    context.observeUsage(usage);
    context.emit("codex.cli.finished", {
      exitCode: processResult.exitCode,
      durationMs: processResult.durationMs,
      usage,
    });

    if (signal.aborted) {
      throw new CellExecutionError(
        abortMessage(context.signal, timeoutSignal, timeoutMs),
        usage,
      );
    }
    if (processResult.exitCode !== 0) {
      const stderr = truncate(
        processResult.stderr.trim() || "no stderr",
        input.budget.maxCommandOutputBytes,
      );
      throw new CellExecutionError(
        `Codex CLI exited with code ${processResult.exitCode}: ${stderr}`,
        usage,
      );
    }
    if (!parsed.finalMessage) {
      const stdout = truncate(
        processResult.stdout.trim() || "no stdout",
        input.budget.maxCommandOutputBytes,
      );
      throw new CellExecutionError(
        `Codex CLI completed without a structured final message: ${stdout}`,
        usage,
      );
    }

    const envelope = parseTerminalEnvelope(parsed.finalMessage, terminalTools, usage);
    const selected = terminalTools.find((tool) => tool.name === envelope.terminalTool);
    if (!selected) {
      throw new CellExecutionError(
        `Codex CLI selected undeclared terminal tool: ${envelope.terminalTool}`,
        usage,
      );
    }
    const inputValidation = compileOutputSchema(selected.inputSchema).validate(envelope.input);
    if (!inputValidation.passed) {
      throw new CellExecutionError(
        `Codex CLI returned invalid input for terminal tool ${selected.name}: ${inputValidation.errors.join("; ")}`,
        usage,
      );
    }

    // This is the authority-bearing transition: only validated output becomes
    // an actual Work Cell terminal action.
    context.emit("terminal.tool.called", {
      name: selected.name,
      input: envelope.input,
    });

    return {
      terminalToolsCalled: [selected.name],
      finalText: envelope.finalText,
      usage,
      rawSteps: [
        ...parsed.events,
        ...parsed.unparsedLines.map((line) => ({
          type: "codex.cli.stdout.unparsed",
          line: truncate(line, 2_000),
        })),
        {
          type: "codex.cli.process",
          exitCode: processResult.exitCode,
          durationMs: processResult.durationMs,
          stderr: truncate(processResult.stderr.trim(), input.budget.maxCommandOutputBytes),
        },
      ],
      providerMetadata: {
        adapter: this.descriptor.adapter,
        exitCode: processResult.exitCode,
        durationMs: processResult.durationMs,
      },
    };
  }

  private async resolveWorkspace(input: CellInput, context: DriverContext): Promise<string> {
    const selected = await this.options.workspacePolicy.select(input, context);
    if (!isAbsolute(selected)) {
      throw new CellExecutionError(
        "Codex CLI workspace policy must select an absolute path",
        EMPTY_USAGE,
      );
    }
    const canonical = await realpath(selected);
    if (canonical !== context.workspace.root) {
      throw new CellExecutionError(
        "Codex CLI workspace policy must select the Work Cell canonical workspace root",
        EMPTY_USAGE,
      );
    }
    return canonical;
  }
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

export function createCodexCliOutputSchema(terminalTools: TerminalTool[]): OutputSchema {
  if (terminalTools.length === 0) {
    throw new Error("Codex CLI output schema requires at least one terminal tool");
  }
  const inputSchema = terminalTools.length === 1
    ? terminalTools[0]!.inputSchema
    : { anyOf: terminalTools.map((tool) => tool.inputSchema) };
  return {
    type: "object",
    properties: {
      terminalTool: {
        type: "string",
        enum: terminalTools.map((tool) => tool.name),
      },
      input: inputSchema,
      finalText: { type: "string" },
    },
    required: ["terminalTool", "input", "finalText"],
    additionalProperties: false,
  };
}

export function createCodexCliPrompt(input: CellInput): string {
  return [
    "Execute exactly one bounded Work Cell from the JSON packet below.",
    "Use only the packet and files in the supplied disposable workspace.",
    "Do not discover, load, or infer user or project instructions such as AGENTS.md.",
    "The workspace and command sandbox are read-only. Do not request approval or claim a write.",
    "Finish by returning only the JSON object required by the supplied output schema.",
    "terminalTool and input request one declared terminal action; the host validates and emits the real action.",
    "finalText is the concise final account of the bounded work.",
    "",
    "WORK_CELL_INPUT",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

function parseCodexStdout(stdout: string): ParsedCodexOutput {
  const events: Record<string, unknown>[] = [];
  const unparsedLines: string[] = [];
  let finalMessage: string | undefined;

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      unparsedLines.push(rawLine);
      continue;
    }
    if (!isRecord(value)) {
      unparsedLines.push(rawLine);
      continue;
    }
    events.push(value);
    const candidate = finalMessageFromEvent(value);
    if (candidate !== undefined) finalMessage = candidate;
  }
  return {
    events,
    unparsedLines,
    ...(finalMessage === undefined ? {} : { finalMessage }),
  };
}

function finalMessageFromEvent(event: Record<string, unknown>): string | undefined {
  if (typeof event.terminalTool === "string") return JSON.stringify(event);
  if (event.type === "item.completed" && isRecord(event.item)) {
    if (event.item.type === "agent_message" && typeof event.item.text === "string") {
      return event.item.text;
    }
  }
  if (event.type === "agent_message" && typeof event.text === "string") {
    return event.text;
  }
  return undefined;
}

function parseTerminalEnvelope(
  finalMessage: string,
  terminalTools: TerminalTool[],
  usage: CellUsage,
): CodexTerminalEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(finalMessage);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CellExecutionError(
      `Codex CLI final message is not valid JSON: ${detail}`,
      usage,
    );
  }
  if (!isRecord(value)) {
    throw new CellExecutionError("Codex CLI final message must be an object", usage);
  }
  const allowed = new Set(["terminalTool", "input", "finalText"]);
  const extra = Object.keys(value).filter((key) => !allowed.has(key));
  if (extra.length > 0) {
    throw new CellExecutionError(
      `Codex CLI final message contains undeclared fields: ${extra.join(", ")}`,
      usage,
    );
  }
  if (
    !Object.hasOwn(value, "terminalTool")
    || !Object.hasOwn(value, "input")
    || !Object.hasOwn(value, "finalText")
  ) {
    throw new CellExecutionError(
      "Codex CLI final message must contain terminalTool, input, and finalText",
      usage,
    );
  }
  if (typeof value.terminalTool !== "string") {
    throw new CellExecutionError("Codex CLI terminalTool must be a string", usage);
  }
  if (typeof value.finalText !== "string") {
    throw new CellExecutionError("Codex CLI finalText must be a string", usage);
  }
  if (!terminalTools.some((tool) => tool.name === value.terminalTool)) {
    throw new CellExecutionError(
      `Codex CLI selected undeclared terminal tool: ${value.terminalTool}`,
      usage,
    );
  }
  return {
    terminalTool: value.terminalTool,
    input: value.input,
    finalText: value.finalText,
  };
}

function codexUsage(events: Record<string, unknown>[]): CellUsage {
  let observed: CellUsage | undefined;
  for (const event of events) {
    if (!isRecord(event.usage)) continue;
    const inputTokens = numberField(event.usage, "input_tokens", "inputTokens");
    const outputTokens = numberField(event.usage, "output_tokens", "outputTokens");
    const cachedInputTokens = numberField(
      event.usage,
      "cached_input_tokens",
      "cachedInputTokens",
    );
    const totalTokens = numberField(event.usage, "total_tokens", "totalTokens")
      || inputTokens + outputTokens;
    observed = {
      inputTokens,
      outputTokens,
      totalTokens,
      cachedInputTokens,
    };
  }
  return observed ?? { ...EMPTY_USAGE };
}

function numberField(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function abortMessage(
  callerSignal: AbortSignal,
  timeoutSignal: AbortSignal,
  timeoutMs: number,
  error?: unknown,
): string {
  if (timeoutSignal.aborted && !callerSignal.aborted) {
    return `Codex CLI execution timed out after ${timeoutMs}ms`;
  }
  if (callerSignal.aborted) return "Codex CLI execution aborted";
  const detail = error instanceof Error ? error.message : error === undefined ? "" : String(error);
  return `Codex CLI process failed${detail ? `: ${detail}` : ""}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n[truncated]`;
}
