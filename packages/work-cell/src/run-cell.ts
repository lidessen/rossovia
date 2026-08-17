import { randomUUID } from "node:crypto";
import {
  CellInputSchema,
  WORK_CELL_RECORD_VERSION,
  type CellInput,
  type CellRunRecord,
  type CellTerminalStatus,
  type CellUsage,
  type ArtifactRecord,
  type ArtifactVerification,
  type OutputVerification,
  type TaskVerification,
  type CellPreparation,
  type TraceEvent,
  type ProviderFingerprintStanding,
} from "./contracts";
import type { CellDriver } from "./driver";
import { CellExecutionError, TerminalContractError, traceEvent } from "./driver";
import { Workspace } from "./workspace";
import { compileOutputSchema } from "./output-schema";
import { TaskStore } from "./task-store";

export interface RunCellOptions {
  signal?: AbortSignal;
  preparation?: CellPreparation;
  /** Observe the same bounded events retained in the final trace while the Cell is running. */
  onTrace?: (event: TraceEvent) => void;
}

export async function runCell(
  unparsedInput: unknown,
  driver: CellDriver,
  options: RunCellOptions = {},
): Promise<CellRunRecord> {
  const input = CellInputSchema.parse(unparsedInput);
  // A terminal-only Cell completes on its single allowed step: the accepted
  // terminal action is the final step and no separate output step exists.
  // Only a Cell that also declares a structured output contract needs a
  // second step for the final output.
  if (input.budget.maxSteps !== undefined
    && input.terminalTools?.length && input.outputSchema && input.budget.maxSteps < 2) {
    // Reached only when a structured-output contract needs a second step for
    // the final output; the exact public wording is unchanged for callers.
    throw new Error("terminal tools require at least two steps: one terminal action and one final output");
  }
  const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
  const runId = randomUUID();
  const startedAt = new Date();
  const trace: TraceEvent[] = [];
  let observerActive = options.onTrace !== undefined;
  const emit = (type: string, data: unknown) => {
    const event = traceEvent(type, data);
    trace.push(event);
    if (!observerActive) return;
    try {
      options.onTrace?.(event);
    } catch (error) {
      observerActive = false;
      trace.push(traceEvent("cell.observer.failed", {
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };
  emit("cell.started", { runId, cellId: input.id, driver: driver.descriptor });
  const workspace = await Workspace.create(input.workspace, input.budget);
  const before = await workspace.snapshot();
  const timeoutSignal = AbortSignal.timeout(input.budget.maxDurationMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const missingCapabilities = input.capabilitiesRequired.filter(
    (capability) => !input.capabilities.includes(capability),
  );

  let status: CellTerminalStatus = "failed";
  let error: string | undefined;
  let driverResult: Awaited<ReturnType<CellDriver["run"]>> | undefined;
  let failureUsage = emptyUsage();
  let failureSettlementUsage: CellUsage | undefined;
  let observedExecutionUsage = emptyUsage();
  let observedSettlementUsage: CellUsage | undefined;
  let verification = { passed: false, terminal: { passed: false, required: [] as string[], called: [] as string[] } };
  let outputVerification: OutputVerification | undefined;
  let artifactVerification: ArtifactVerification | undefined;
  let taskVerification: TaskVerification | undefined;
  let artifacts: ArtifactRecord[] = [];
  let after: Awaited<ReturnType<Workspace["snapshot"]>> | undefined;

  if (missingCapabilities.length > 0) {
    status = "capability_mismatch";
    error = `missing capabilities: ${missingCapabilities.join(", ")}`;
    emit("cell.capability_mismatch", { missingCapabilities });
  } else {
    try {
      const context = {
        workspace,
        signal,
        liveObservation: observerActive,
        observeUsage(usage: CellUsage, phase?: "execution" | "settlement") {
          observedExecutionUsage = addUsage(observedExecutionUsage, usage);
          if (phase === "settlement") {
            observedSettlementUsage = addUsage(observedSettlementUsage ?? emptyUsage(), usage);
          }
        },
        emit(type: string, data: unknown) {
          emit(type, data);
        },
      };
      if (options.preparation) {
        emit("cell.prepared", {
          adapter: options.preparation.adapter,
          usage: options.preparation.usage,
        });
      }
      // One canonical pre-driver CellInput is the caller contract. Terminal,
      // task, artifact, and output verification plus the final record derive
      // only from that canonical value; the supplied driver receives an
      // isolated immutable parsed copy it can never rewrite.
      driverResult = await runWithSignal(() => driver.run(disposableCellInput(input), context), signal);
      const terminalTools = input.terminalTools ?? [];
      const terminalResult = verifyTerminalContract(
        terminalTools.map((terminal) => terminal.name),
        driverResult.terminalToolsCalled,
      );
      // Supplied tasks are a generic Cell completion condition. A driver may
      // also expose a task cycle that emerged during execution, but it may not
      // make caller-supplied tasks disappear by omitting or emptying its final
      // projection.
      taskVerification = input.tasks !== undefined || driverResult.tasks !== undefined
        ? verifyTaskCycle(driverResult.tasks)
        : undefined;
      if (terminalResult.error) {
        emit("terminal.contract.violation", {
          error: terminalResult.error,
          required: terminalResult.verification.required,
          called: terminalResult.verification.called,
        });
      }
      after = await workspace.snapshot();
      const diff = workspace.diff(before, after);
      if (outputSchema) {
        outputVerification = driverResult.output === undefined
          ? { passed: false, errors: ["driver completed without the declared structured output"] }
          : outputSchema.validate(driverResult.output);
      }
      const artifactResult = await verifyArtifacts(input, workspace, diff);
      artifacts = artifactResult.artifacts;
      artifactVerification = artifactResult.verification;
      verification = {
        passed: terminalResult.verification.passed
          && (outputVerification?.passed ?? true)
          && artifactVerification.passed
          && (taskVerification?.passed ?? true),
        terminal: terminalResult.verification,
      };

      if (!terminalResult.verification.passed) {
        status = "protocol_error";
        error = terminalResult.error;
      } else if (outputVerification && !outputVerification.passed) {
        status = driverResult.output === undefined ? "protocol_error" : "verification_failed";
        error = outputVerification.errors.join("; ");
      } else if (!artifactVerification.passed) {
        status = "verification_failed";
        error = artifactVerification.errors.join("; ");
      } else if (taskVerification && !taskVerification.passed) {
        status = "verification_failed";
        error = taskVerification.errors.join("; ");
      } else {
        status = "passed";
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      if (caught instanceof CellExecutionError) {
        failureUsage = caught.usage;
        failureSettlementUsage = caught.settlementUsage ?? observedSettlementUsage;
      } else {
        failureUsage = observedExecutionUsage;
        failureSettlementUsage = observedSettlementUsage;
      }
      if (signal.aborted) status = "cancelled";
      else if (caught instanceof TerminalContractError) status = "protocol_error";
      else status = "failed";
      emit("cell.error", { status, error });
    }
  }

  after ??= await workspace.snapshot();
  const finishedAt = new Date();
  const usage = addUsage(
    options.preparation?.usage ?? emptyUsage(),
    driverResult?.usage ?? failureUsage,
  );
  const reportedSettlementUsage = driverResult?.settlementUsage ?? failureSettlementUsage;
  const settlementUsage = reportedSettlementUsage && reportedSettlementUsage.totalTokens > 0
    ? reportedSettlementUsage
    : undefined;
  const aggregateDriverUsage = driverResult?.usage ?? failureUsage;
  const executionUsage = settlementUsage
    ? subtractUsage(aggregateDriverUsage, settlementUsage)
    : aggregateDriverUsage;
  const estimate = estimateCost(usage, driver.descriptor.pricing);
  emit("cell.finished", { status, usage });

  const priceRevision = input.executionProfile?.priceRevision ?? driver.descriptor.pricing?.revision;
  const sessionId = observedSessionId(driverResult?.providerMetadata);
  const fingerprintEvidence = providerFingerprintEvidence(driverResult?.providerMetadata);
  const executionObservation: CellRunRecord["executionObservation"] = {
    ...(sessionId ? { sessionId } : {}),
    ...(input.workEstimate ? { workEstimateId: input.workEstimate.id } : {}),
    ...(input.executionProfile ? { executionProfileId: input.executionProfile.id } : {}),
    providerFingerprintStanding: fingerprintEvidence.standing,
  };
  if (fingerprintEvidence.value !== undefined) {
    executionObservation.providerFingerprint = fingerprintEvidence.value;
  }
  if (priceRevision) executionObservation.priceRevision = priceRevision;

  return {
    version: WORK_CELL_RECORD_VERSION,
    runId,
    cellId: input.id,
    driver: driver.descriptor,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    input,
    ...(options.preparation ? { preparation: options.preparation } : {}),
    finalText: driverResult?.finalText ?? "",
    ...(driverResult?.output === undefined ? {} : { output: driverResult.output }),
    artifacts,
    ...(driverResult?.tasks === undefined ? {} : { tasks: driverResult.tasks }),
    verification: {
      ...verification,
      ...(outputVerification ? { output: outputVerification } : {}),
      ...(artifactVerification ? { artifacts: artifactVerification } : {}),
      ...(taskVerification ? { tasks: taskVerification } : {}),
    },
    workspaceDiff: workspace.diff(before, after),
    usage,
    usageByPhase: {
      preparation: options.preparation?.usage ?? emptyUsage(),
      execution: executionUsage,
      ...(settlementUsage ? { settlement: settlementUsage } : {}),
    },
    executionObservation,
    ...(estimate ? { estimatedCostUsd: estimate.value, estimateBasis: estimate.basis } : {}),
    trace,
    rawSteps: [
      ...(options.preparation ? [{ phase: "preparation", adapter: options.preparation.adapter, steps: options.preparation.rawSteps }] : []),
      ...(driverResult ? [{ phase: "execution", steps: driverResult.rawSteps }] : []),
    ],
    ...(error ? { error } : {}),
  };
}

function verifyTaskCycle(tasks: CellRunRecord["tasks"]): TaskVerification {
  if (tasks === undefined) {
    return {
      passed: false,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      errors: ["driver completed without the enabled task state"],
    };
  }
  if (tasks.length === 0) {
    return {
      passed: false,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      errors: ["driver completed with an empty task projection"],
    };
  }
  let store: TaskStore;
  try {
    store = new TaskStore(tasks);
  } catch (error) {
    return {
      passed: false,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      errors: [`invalid task state: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  const counts = {
    pending: tasks.filter((task) => task.status === "pending").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    blocked: tasks.filter((task) => task.status !== "completed" && store.isBlocked(task)).length,
  };
  const errors = counts.pending > 0 || counts.inProgress > 0
    ? [`task cycle is unsettled: ${counts.pending} pending, ${counts.inProgress} in_progress, ${counts.blocked} blocked`]
    : [];
  return { passed: errors.length === 0, ...counts, errors };
}

function verifyTerminalContract(required: string[], called: string[]) {
  if (required.length === 0) {
    const error = called.length > 0
      ? `driver reported terminal tool calls without a declared contract: ${called.join(", ")}`
      : undefined;
    return {
      verification: { passed: error === undefined, required, called },
      ...(error ? { error } : {}),
    };
  }

  const declared = new Set(required);
  const error = called.length !== 1
    ? `expected exactly one declared terminal tool call; received ${called.length}${called.length > 0 ? `: ${called.join(", ")}` : ""}`
    : !declared.has(called[0]!)
      ? `driver reported undeclared terminal tool call: ${called[0]}`
      : undefined;
  return {
    verification: { passed: error === undefined, required, called },
    ...(error ? { error } : {}),
  };
}

/**
 * The supplied driver receives an isolated, deeply frozen parsed copy of the
 * canonical CellInput: a malicious or buggy driver can read the caller
 * contract freely, but any mutation attempt fails on the copy instead of
 * reaching the canonical value that verification and the final record derive
 * from.
 */
function disposableCellInput(input: CellInput): CellInput {
  return deepFreeze(structuredClone(input));
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  for (const key of Object.keys(object)) deepFreeze(object[key]);
  return Object.freeze(object) as T;
}

function runWithSignal<T>(start: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(start)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

async function verifyArtifacts(
  input: CellInput,
  workspace: Workspace,
  diff: CellRunRecord["workspaceDiff"],
): Promise<{ artifacts: ArtifactRecord[]; verification: ArtifactVerification }> {
  if (!input.artifacts?.length) return { artifacts: [], verification: { passed: true, errors: [] } };

  const changed = new Set([...diff.added, ...diff.changed]);
  const artifacts: ArtifactRecord[] = [];
  const errors: string[] = [];
  for (const requirement of input.artifacts) {
    try {
      const artifact = await workspace.describeArtifact(requirement.path);
      if (!changed.has(artifact.path)) {
        errors.push(`artifact was not created or changed by this run: ${artifact.path}`);
        continue;
      }
      artifacts.push(artifact);
    } catch (caught) {
      errors.push(caught instanceof Error ? caught.message : String(caught));
    }
  }
  return { artifacts, verification: { passed: errors.length === 0, errors } };
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function observedSessionId(providerMetadata: unknown): string | undefined {
  if (typeof providerMetadata !== "object" || providerMetadata === null || Array.isArray(providerMetadata)) {
    return undefined;
  }
  const value = (providerMetadata as Record<string, unknown>).sessionId;
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Truthful provider-fingerprint evidence. The AI SDK provider metadata
 * contract surfaces a provider backend fingerprint as `systemFingerprint`,
 * directly or under the provider namespace (for example
 * `{"openai-compatible": {systemFingerprint}}`). An observed value is
 * retained verbatim with an `observed` standing; when the provider emitted
 * no fingerprint — or no metadata at all — the record retains an explicit
 * `unavailable` standing with the reason instead of silence that could be
 * misread as a verified match. Nothing is fabricated, and volatile
 * session/response data is never hashed into an identity.
 */
function providerFingerprintEvidence(providerMetadata: unknown): {
  value?: string;
  standing: ProviderFingerprintStanding;
} {
  const value = systemFingerprintIn(providerMetadata);
  if (value !== undefined) return { value, standing: { standing: "observed" } };
  const metadataPresent = providerMetadata !== null
    && typeof providerMetadata === "object"
    && !Array.isArray(providerMetadata)
    && Object.keys(providerMetadata as Record<string, unknown>).length > 0;
  return {
    standing: {
      standing: "unavailable",
      reason: metadataPresent
        ? "provider metadata was retained but carried no system fingerprint"
        : "the driver retained no provider metadata for this route; the provider response exposed no system fingerprint",
    },
  };
}

function systemFingerprintIn(providerMetadata: unknown): string | undefined {
  if (typeof providerMetadata !== "object" || providerMetadata === null || Array.isArray(providerMetadata)) {
    return undefined;
  }
  const top = providerMetadata as Record<string, unknown>;
  const direct = typeof top.systemFingerprint === "string" ? top.systemFingerprint : undefined;
  if (direct && direct.trim()) return direct;
  for (const value of Object.values(top)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const nested = (value as Record<string, unknown>).systemFingerprint;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return undefined;
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function subtractUsage(total: CellUsage, part: CellUsage): CellUsage {
  return {
    inputTokens: Math.max(0, total.inputTokens - part.inputTokens),
    outputTokens: Math.max(0, total.outputTokens - part.outputTokens),
    totalTokens: Math.max(0, total.totalTokens - part.totalTokens),
    cachedInputTokens: Math.max(0, total.cachedInputTokens - part.cachedInputTokens),
  };
}

function estimateCost(
  usage: CellUsage,
  pricing: CellRunRecord["driver"]["pricing"],
): { value: number; basis: string } | undefined {
  if (!pricing) return undefined;
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const uncached = Math.max(0, usage.inputTokens - cached);
  const inputCost =
    (uncached / 1_000_000) * pricing.inputPerMillionUsd +
    (cached / 1_000_000) * (pricing.cachedInputPerMillionUsd ?? pricing.inputPerMillionUsd);
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMillionUsd;
  return {
    value: Number((inputCost + outputCost).toFixed(8)),
    basis: `estimated from token usage using ${pricing.source}`,
  };
}
