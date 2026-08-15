import { HarnessAgent, type HarnessAgentSession } from "@ai-sdk/harness/agent";
import type {
  HarnessV1,
  HarnessV1SandboxProvider,
} from "@ai-sdk/harness";
import { createPi, type PiHarnessSettings } from "@ai-sdk/harness-pi";
import { createJustBashSandbox } from "@ai-sdk/sandbox-just-bash";
import { tool, type Tool, type ToolSet } from "ai";
import { Sandbox } from "just-bash";
import { z } from "zod";
import {
  type CellInput,
  type CellUsage,
  type DriverDescriptor,
} from "./contracts";
import {
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "./driver";
import { compileOutputSchema } from "./output-schema";
import { normalizeAiSdkUsage as normalizeUsage } from "./ai-sdk-usage";
import { settleStructuredOutput, type StructuredSettlementResult } from "./structured-settlement";
import { TaskStore } from "./task-store";
import {
  BUDGET_CONTROL_TOOL_NAMES,
  createHostTools,
  EXECUTION_TOOL_NAMES,
  terminalActionRequired,
} from "./host-tools";
import {
  AiSdkDriverOptions,
  type TaskToolSet,
} from "./ai-sdk-driver";
import {
  createValidationModel,
  resolveValidationRoute,
  validationModelName,
  validationProviderName,
} from "./validation-model";
import {
  addUsage,
  asRecord,
  emptyUsage,
  renderExecutionInstructions,
  renderFirstUserInput,
  renderRecoveryEvidence,
  safeToolTarget,
  sanitize,
  taskToolNames,
} from "./driver-common";

/** The DeepSeek API base the pinned Pi model registry resolves against. */
const DEEPSEEK_PI_BASE_URL = "https://api.deepseek.com";
const MAX_AGENT_OUTPUT_TOKENS = 16_000;
const PI_SANDBOX_WORK_DIR = "rossovia-work-cell";

/** Exact retained mechanism identity for the in-process HarnessAgent + Pi path. */
export const PI_HARNESS_DRIVER_ADAPTER = "ai-sdk-harness-pi-v1";

export type PiHarnessDriverOptions = AiSdkDriverOptions & {
  /**
   * Harness adapter seam: replacing Pi with a neutral `HarnessV1` changes the
   * adapter, not the Work Cell execution-finalization mechanism. Defaults to
   * the pinned Pi adapter with every built-in disabled by the driver.
   */
  harness?: HarnessV1<ToolSet>;
  /** Test/substitution seam at the exact `createPi` settings boundary. */
  piHarnessFactory?: (settings: PiHarnessSettings) => HarnessV1<ToolSet>;
  /**
   * Causal event-loop handoff applied at this adapter boundary before any
   * host tool effect or result. The pinned harness-pi adapter can deliver
   * `tool_execution_start` to HarnessAgent before its
   * `buildUserToolDefinition` has installed the pending tool-result
   * registration for that call, so an immediately-resolving host tool (an
   * in-memory task update, a small read) submits an early result that the
   * adapter drops and the turn never completes. The default yields one
   * macrotask before the host effect so the registration barrier settles
   * first. Tests substitute a no-op handoff to prove the control (old
   * adapter boundary) drops early results.
   */
  toolEffectHandoff?: () => Promise<void>;
  /**
   * Sandbox provider seam. Defaults to an empty in-memory just-bash sandbox
   * that carries no repository content; model effects cross only the
   * host-executed Work Cell tools.
   */
  sandbox?: HarnessV1SandboxProvider;
};

interface PiHarnessTarget {
  readonly piModelId: string;
  readonly piAuth: {
    readonly customEnv: Record<string, string>;
  };
}

type PiThinkingLevel = NonNullable<PiHarnessSettings["thinkingLevel"]>;

/**
 * Translate the host-owned DeepSeek policy into Pi's smaller vocabulary.
 * `max` is Pi's `xhigh`; a disabled or omitted policy is explicitly `off`,
 * never Pi's mutable default.
 */
export function piThinkingLevelForPolicy(
  policy: PiHarnessDriverOptions["deepSeekInferencePolicy"],
): PiThinkingLevel {
  if (policy === undefined || policy.thinking === "disabled") return "off";
  switch (policy.reasoningEffort) {
    case "low": return "low";
    case "high": return "high";
    case "xhigh":
    case "max": return "xhigh";
  }
}

/**
 * Build one empty per-run just-bash sandbox with a real fixed work directory.
 * The pinned just-bash shell does not reliably expand HarnessAgent's default
 * `$WORK_DIR` mkdir command, so the host creates this directory structurally
 * before Pi synchronizes its session workspace.
 */
export async function createPiInMemorySandbox(): Promise<{
  sandbox: HarnessV1SandboxProvider;
  sandboxConfig: { workDir: string };
}> {
  const memory = await Sandbox.create();
  await memory.mkDir(`/home/user/${PI_SANDBOX_WORK_DIR}`, { recursive: true });
  return {
    sandbox: createJustBashSandbox({ sandbox: memory }),
    sandboxConfig: { workDir: PI_SANDBOX_WORK_DIR },
  };
}

/**
 * One macrotask yield at the Work Cell Pi adapter boundary. See
 * `PiHarnessDriverOptions["toolEffectHandoff"]` for the pinned adapter race
 * this closes.
 */
export function yieldEventLoopHandoff(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof setImmediate === "function") setImmediate(resolve);
    else setTimeout(resolve, 0);
  });
}

/**
 * Wrap one host tool so its effect and result can never outrun the pinned
 * adapter's next-turn registration barrier. Only the execution timing is
 * deferred; the tool's name, schema, evidence, and host ownership are exact.
 */
function withToolEffectHandoff<T extends Tool>(
  definition: T,
  handoff: () => Promise<void>,
): T {
  const execute = definition.execute;
  if (execute === undefined) return definition;
  return {
    ...definition,
    execute: (async (input, options) => {
      await handoff();
      return execute(input, options);
    }) as typeof execute,
  };
}

/**
 * Map the host-selected validation route into the Pi adapter's own provider
 * policy. The Pi harness serves exactly one DeepSeek route per run; any other
 * route or a multi-provider route fails closed with a visible error instead
 * of silently accepting a Pi default model.
 */
function piHarnessTarget(options: PiHarnessDriverOptions): PiHarnessTarget {
  const targets = resolveValidationRoute(options);
  if (targets.length !== 1) {
    throw new Error(
      "the Pi harness adapter serves exactly one provider/model per run; "
      + `route length ${targets.length} requires the AI SDK driver instead`,
    );
  }
  const target = targets[0]!;
  if (target.provider !== "deepseek") {
    throw new Error(
      `the Pi harness adapter cannot serve provider ${target.provider}; `
      + "select a DeepSeek worker or the AI SDK driver for this provider",
    );
  }
  const piModelId = target.model.startsWith("deepseek/")
    ? target.model.slice("deepseek/".length)
    : target.model;
  return {
    piModelId,
    piAuth: {
      customEnv: {
        DEEPSEEK_API_KEY: target.apiKey,
        DEEPSEEK_BASE_URL: target.baseURL ?? DEEPSEEK_PI_BASE_URL,
      },
    },
  };
}

/**
 * The ordinary production CellDriver: a Vercel AI SDK `HarnessAgent` with the
 * Pi adapter in-process and an empty in-memory just-bash sandbox. Every Pi
 * built-in tool is disabled; the model-visible tool set is exactly the
 * host-executed Work Cell surface (read/list, Pi-native exact batch edit,
 * create-new-only full write, allow-listed commands, host task tools, budget
 * and terminal tools). Provider/model identity, usage, tasks, and workspace
 * effects remain Work Cell evidence; the harness session identity is
 * observation only. Every host tool execution crosses one causal event-loop
 * handoff before its effect so an immediately-resolving result cannot
 * outrun the pinned adapter's next-turn registration barrier.
 */
export class PiHarnessCellDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  readonly budgetControl = "completed-step-v1" as const;
  protected readonly model;
  private readonly harness: HarnessV1<ToolSet>;
  private readonly sandbox: HarnessV1SandboxProvider | undefined;
  private readonly target: PiHarnessTarget;
  private readonly taskToolSet: NonNullable<PiHarnessDriverOptions["taskToolSet"]>;
  private readonly toolEffectHandoff: NonNullable<PiHarnessDriverOptions["toolEffectHandoff"]>;

  constructor(options: PiHarnessDriverOptions = {}) {
    if (options.harness !== undefined && options.piHarnessFactory !== undefined) {
      throw new Error("provide either harness or piHarnessFactory, not both");
    }
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.target = piHarnessTarget(options);
    this.taskToolSet = options.taskToolSet ?? "manage";
    this.toolEffectHandoff = options.toolEffectHandoff ?? yieldEventLoopHandoff;
    const createHarness = options.piHarnessFactory ?? createPi;
    this.harness = options.harness ?? createHarness({
      auth: this.target.piAuth,
      model: this.target.piModelId,
      thinkingLevel: piThinkingLevelForPolicy(options.deepSeekInferencePolicy),
    });
    this.sandbox = options.sandbox;
    this.descriptor = {
      adapter: PI_HARNESS_DRIVER_ADAPTER,
      provider: validationProviderName(selection),
      model: validationModelName(selection),
      ...(selection.pricing ? { pricing: selection.pricing } : {}),
    };
  }

  async run(
    input: CellInput,
    context: DriverContext,
  ): Promise<DriverResult> {
    const terminalToolsCalled = new Set<string>();
    const tasks = TaskStore.fromSeeds(input.tasks, input.id);
    context.emit("task.tools.projected", {
      taskToolSet: this.taskToolSet,
      tools: taskToolNames(this.taskToolSet),
    });
    let terminalProtocolError: string | undefined;
    let terminalOnly = false;
    const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
    const markTerminalTool = (name: string): boolean => {
      if (terminalToolsCalled.size > 0) {
        terminalProtocolError = `expected exactly one terminal tool call; received ${[
          ...terminalToolsCalled,
          name,
        ].join(", ")}`;
        context.emit("terminal.contract.violation", { error: terminalProtocolError });
        return false;
      }
      terminalToolsCalled.add(name);
      terminalOnly = true;
      return true;
    };
    const actionBlocked = () => {
      if (terminalOnly) return terminalActionRequired();
      if (context.budgetControl && context.budgetControl.phase !== "production") {
        return terminalActionRequired();
      }
      return undefined;
    };
    const hostTools = {
      ...createHostTools({
        input,
        context,
        tasks,
        taskToolSet: this.taskToolSet,
        actionBlocked,
        fullWriteMode: "create-new-only",
      }),
      ...Object.fromEntries((input.terminalTools ?? []).map((terminal) => [terminal.name, tool({
        description: terminal.description,
        inputSchema: z.fromJSONSchema(terminal.inputSchema),
        execute: async (value) => {
          if (!markTerminalTool(terminal.name)) return { accepted: false };
          context.emit("terminal.tool.called", { name: terminal.name, input: value });
          return { accepted: true };
        },
      })])),
    };
    const conflictingTerminalNames = (input.terminalTools ?? [])
      .map((terminal) => terminal.name)
      .filter((name) => EXECUTION_TOOL_NAMES.has(name) || BUDGET_CONTROL_TOOL_NAMES.has(name));
    if (conflictingTerminalNames.length > 0) {
      throw new Error(
        `terminal tool names conflict with AI SDK execution tools: ${conflictingTerminalNames.join(", ")}`,
      );
    }

    // Every Pi built-in is excluded from the model-visible surface; only the
    // host-executed Work Cell tools are allowed. The filtering is forwarded
    // into the harness start, so the underlying runtime never sees read,
    // write, edit, bash, grep, glob, or ls.
    const defaultSandbox = this.sandbox === undefined
      ? await createPiInMemorySandbox()
      : undefined;
    // One causal event-loop handoff before any host tool effect or result:
    // the pinned harness-pi adapter can deliver tool_execution_start to
    // HarnessAgent before buildUserToolDefinition has installed the pending
    // tool-result registration for that call, and an immediately-resolving
    // host tool would submit an early result the adapter drops. The handoff
    // changes timing only; tool names, schemas, evidence, and host ownership
    // are exact.
    const harnessTools: Record<string, Tool> = Object.fromEntries(
      Object.entries(hostTools).map(([name, definition]): [string, Tool] => [
        name,
        withToolEffectHandoff(definition, this.toolEffectHandoff),
      ]),
    );
    const agent = new HarnessAgent({
      id: input.id,
      harness: this.harness,
      sandbox: this.sandbox ?? defaultSandbox!.sandbox,
      ...(defaultSandbox ? { sandboxConfig: defaultSandbox.sandboxConfig } : {}),
      instructions: renderExecutionInstructions(input, {
        deferStructuredOutput: outputSchema !== undefined,
        taskToolSet: this.taskToolSet,
      }),
      tools: harnessTools,
      activeTools: Object.keys(harnessTools),
      permissionMode: "allow-all",
    });
    context.emit("harness.tool_surface.projected", {
      harnessId: this.harness.harnessId,
      tools: Object.keys(hostTools),
      builtinToolFiltering: { mode: "allow", toolNames: [] },
    });

    let observedUsage: CellUsage = emptyUsage();
    let observedSettlementUsage: CellUsage = emptyUsage();
    const session = await agent.createSession();
    let harnessSessionId: string | undefined;
    const stepBudgetAbort = new AbortController();
    const turnSignal = AbortSignal.any([context.signal, stepBudgetAbort.signal]);
    let completedSteps = 0;
    let stepBudgetExhausted = false;
    try {
      // Exact provider/model evidence: the adapter must resolve the exact
      // requested model; an unresolved or different model fails closed
      // instead of silently accepting a Pi default.
      const observedModelId = observedHarnessModelId(session);
      if (observedModelId !== this.target.piModelId) {
        throw new Error(
          `the Pi harness resolved model ${observedModelId ?? "none"} but the worker execution `
          + `profile requires ${this.target.piModelId}; refusing the mismatched adapter default`,
        );
      }
      harnessSessionId = session.sessionId;
      context.emit("harness.session.started", {
        harnessId: this.harness.harnessId,
        sessionId: harnessSessionId,
        modelId: observedModelId,
      });
      const prompt = await renderFirstUserInput(input, context);
      const streamed = await agent.stream({
        session,
        ...(typeof prompt === "string" ? { prompt } : { messages: [prompt] }),
        abortSignal: turnSignal,
      });
      const observeChunk = createHarnessStreamObserver({
        context,
        observeUsage: (usage) => {
          observedUsage = addUsage(observedUsage, usage);
          context.observeUsage(
            usage,
            context.budgetControl?.phase === "settlement" ? "settlement" : "execution",
          );
          if (context.budgetControl?.phase === "settlement") {
            observedSettlementUsage = addUsage(observedSettlementUsage, usage);
          }
        },
        onStepFinished: (finishReason) => {
          completedSteps += 1;
          if (context.budgetControl?.phase === "production") {
            const decisionPoint = context.budgetControl.completedStep();
            if (decisionPoint) context.emit("budget.decision_point", { completedSafeStep: true });
          } else if (
            context.budgetControl === undefined
            && completedSteps >= input.budget.maxSteps
            && finishReason === "tool-calls"
          ) {
            stepBudgetExhausted = true;
            stepBudgetAbort.abort(new Error(
              `Work Cell step budget exhausted after ${completedSteps} completed steps`,
            ));
          }
        },
      });
      try {
        for await (const chunk of streamed.stream) observeChunk(chunk);
      } catch (error) {
        if (!stepBudgetExhausted) throw error;
      }
      if (stepBudgetExhausted) {
        throw new CellExecutionError(
          `Work Cell step budget exhausted after ${completedSteps} completed steps`,
          observedUsage,
          observedSettlementUsage,
        );
      }
      const [text, usage, providerMetadata, steps] = await Promise.all([
        streamed.text,
        streamed.usage,
        streamed.providerMetadata,
        streamed.steps,
      ]);
      const normalizedUsage = normalizeUsage(usage, providerMetadata);
      // Harness aggregate usage supersedes the per-step observation. The
      // latter is retained only as a failure fallback when no aggregate was
      // materialized; never add both views of the same tokens.
      observedUsage = normalizedUsage.totalTokens > 0 ? normalizedUsage : observedUsage;
      if (terminalProtocolError) {
        throw new CellExecutionError(terminalProtocolError, observedUsage, observedSettlementUsage);
      }
      if (context.signal.aborted) {
        throw new CellExecutionError(
          context.signal.reason instanceof Error
            ? context.signal.reason.message
            : String(context.signal.reason ?? "Cell execution cancelled"),
          observedUsage,
          observedSettlementUsage,
        );
      }
      let settlement: StructuredSettlementResult | undefined;
      let output: unknown;
      if (outputSchema) {
        context.emit("structured.settlement.started", { mode: "tool-settlement" });
        settlement = await settleStructuredOutput({
          model: this.model,
          schema: outputSchema,
          intent: input.intent,
          acceptance: input.acceptance,
          retainedEvidence: [text, renderRecoveryEvidence(steps)]
            .filter((part): part is string => Boolean(part?.trim()))
            .join("\n\n"),
          context,
          maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
        });
        if (settlement.output === undefined) {
          const failedSettlementUsage = addUsage(observedSettlementUsage, settlement.usage);
          throw new CellExecutionError(
            settlement.error ?? "structured settlement produced no output",
            addUsage(normalizedUsage, settlement.usage),
            failedSettlementUsage,
          );
        }
        output = settlement.output;
        context.emit("structured.settlement.finished", { mode: "tool-settlement" });
      }
      const settlementUsage = settlement
        ? addUsage(observedSettlementUsage, settlement.usage)
        : observedSettlementUsage;
      return {
        terminalToolsCalled: [...terminalToolsCalled],
        ...(tasks.snapshot().length > 0 ? { tasks: tasks.snapshot() } : {}),
        finalText: text,
        ...(output === undefined ? {} : { output }),
        usage: settlement ? addUsage(normalizedUsage, settlement.usage) : normalizedUsage,
        ...(settlementUsage.totalTokens > 0 ? { settlementUsage } : {}),
        rawSteps: sanitize([...steps, ...(settlement?.rawSteps ?? [])]) as unknown[],
        providerMetadata: {
          ...asRecord(sanitize(providerMetadata)),
          // Harness session identity is observation only; ordinary
          // continuation remains exact prior-attempt lineage.
          sessionId: harnessSessionId,
        },
      };
    } catch (error) {
      if (error instanceof CellExecutionError) throw error;
      if (terminalProtocolError) {
        throw new CellExecutionError(terminalProtocolError, observedUsage, observedSettlementUsage);
      }
      throw new CellExecutionError(
        error instanceof Error ? error.message : String(error),
        observedUsage,
        observedSettlementUsage,
      );
    } finally {
      await destroyHarnessSession(session, harnessSessionId, context);
    }
  }
}

async function destroyHarnessSession(
  session: HarnessAgentSession,
  sessionId: string | undefined,
  context: DriverContext,
): Promise<void> {
  try {
    await session.destroy();
  } catch (error) {
    // Terminal settlement: the harness runtime and its sandbox are destroyed;
    // a destroy failure is retained as observation, never as a second owner.
    context.emit("harness.session.destroy_failed", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * The model the harness adapter actually resolved for the session, when it
 * declares one. Read from the pinned adapter session wrapper's underlying
 * session (stable at the pinned harness version); observation evidence only.
 */
function observedHarnessModelId(session: HarnessAgentSession): string | undefined {
  const underlying = (session as unknown as { underlyingSession?: { modelId?: string } }).underlyingSession;
  const modelId = underlying?.modelId;
  return typeof modelId === "string" && modelId.trim() ? modelId : undefined;
}

/**
 * Bounded live observation over the translated harness stream: step starts,
 * tool boundaries (attributable targets only), per-step usage, and finish
 * evidence. Raw file content, command output, and reasoning text never enter
 * the trace.
 */
function createHarnessStreamObserver(options: {
  context: DriverContext;
  observeUsage(usage: CellUsage): void;
  onStepFinished(finishReason: string): void;
}): (chunk: unknown) => void {
  const { context } = options;
  let stepNumber = 0;
  let activeTools: string[] | undefined;
  return (chunk: unknown): void => {
    const value = asRecord(chunk);
    const type = typeof value.type === "string" ? value.type : "";
    if (type === "step-start") {
      stepNumber += 1;
      activeTools = Array.isArray(value.activeTools) && value.activeTools.every(
        (item) => typeof item === "string",
      ) ? value.activeTools as string[] : undefined;
      context.emit("agent.step.started", {
        stepNumber,
        activeTools,
      });
      return;
    }
    if (type === "tool-call") {
      const name = typeof value.toolName === "string" ? value.toolName : "unknown";
      context.emit("agent.tool.started", {
        id: typeof value.toolCallId === "string" ? value.toolCallId : undefined,
        name,
        ...safeToolTarget(name, parseToolInput(value.input)),
      });
      return;
    }
    if (type === "tool-result") {
      context.emit("agent.tool.finished", {
        id: typeof value.toolCallId === "string" ? value.toolCallId : undefined,
        name: typeof value.toolName === "string" ? value.toolName : "unknown",
        outcome: value.isError === true ? "tool-error" : "tool-result",
      });
      return;
    }
    if (type === "finish-step") {
      const usage = normalizeUsage(value.usage);
      const finishReason = normalizeFinishReason(value.finishReason);
      options.observeUsage(usage);
      options.onStepFinished(finishReason);
      context.emit("agent.step.finished", {
        stepNumber,
        finishReason,
        usage,
        activeTools,
      });
      activeTools = undefined;
      return;
    }
    if (type === "finish") {
      context.emit("harness.turn.finished", {
        finishReason: normalizeFinishReason(value.finishReason),
        totalUsage: normalizeUsage(value.totalUsage),
      });
    }
  };
}

function parseToolInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeFinishReason(value: unknown): string {
  const record = asRecord(value);
  if (typeof record.unified === "string" && record.unified.trim()) return record.unified;
  if (typeof value === "string" && value.trim()) return value;
  return "unknown";
}
