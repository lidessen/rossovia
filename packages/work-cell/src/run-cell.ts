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
import type { CellHost, HostWorkspace } from "./host-port";
import {
  cellToolContractErrors,
  type CellTool,
  type CellToolSet,
  type CellToolSettledOutcome,
  type CellToolSurface,
} from "./tool-port";
import { compileOutputSchema } from "./output-schema";
import { TaskStore } from "./task-store";

export interface RunCellOptions {
  /**
   * The one injected host port. The caller supplies the implementation that
   * opens the workspace capability surface for this run; the core never
   * constructs a concrete filesystem, reads the process environment, or
   * starts a process on its own.
   */
  host: CellHost;
  signal?: AbortSignal;
  preparation?: CellPreparation;
  /** Observe the same bounded events retained in the final trace while the Cell is running. */
  onTrace?: (event: TraceEvent) => void;
  /**
   * Optional caller-injected, provider-neutral, non-serializable model-visible
   * tool set. The tools live outside `CellInput` because their implementations
   * are caller closures; the Cell retains only the sorted authorized names
   * and, per invocation, the name, exact toolCallId, and settled outcome. A
   * non-empty set requires a driver that declares the earned
   * `supportsCellTools: true` capability.
   */
  tools?: CellToolSet;
}

export async function runCell(
  unparsedInput: unknown,
  driver: CellDriver,
  options: RunCellOptions,
): Promise<CellRunRecord> {
  const input = CellInputSchema.parse(unparsedInput);
  // Bind one immutable per-execution tool capability snapshot synchronously,
  // before runCell's first await: the granted names plus each definition's
  // description, object-root input schema, and execute reference are copied
  // into a Cell-owned deep-frozen snapshot. Later caller or driver mutation
  // of the supplied set cannot change the model-visible schema or executable
  // authority, and the caller's object is never mutated.
  const boundCellTools = options.tools === undefined
    ? undefined
    : bindCellToolSnapshot(options.tools);
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
  let traceSealed = false;
  const emit = (type: string, data: unknown, terminal = false) => {
    if (traceSealed) return;
    const event = traceEvent(type, data);
    trace.push(event);
    // The terminal event seals observation as it is appended, before its
    // observer is invoked: an observer failure on cell.finished can never
    // append cell.observer.failed after the terminal event.
    if (terminal) traceSealed = true;
    if (!observerActive) return;
    try {
      options.onTrace?.(event);
    } catch (error) {
      observerActive = false;
      if (traceSealed) return;
      trace.push(traceEvent("cell.observer.failed", {
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };
  emit("cell.started", { runId, cellId: input.id, driver: driver.descriptor });
  // The host port is caller-injected: only the supplied implementation may
  // grant filesystem, command, snapshot, and artifact effects. A CellInput
  // capability declaration never opens a host surface on its own.
  const workspace = await options.host.createWorkspace(input.workspace, input.budget);
  // The Cell owns one host-effect admission gate around the injected
  // workspace. Every model-visible mutating effect — writes, exclusive
  // creates, and commands — is admitted through it. After the driver settles
  // (completion, failure, or cancellation) the gate closes so new effects
  // fail, and every already-admitted effect is joined before the workspace
  // snapshot and the immutable final: no host effect can remain live past
  // the returned record. The neutral port contract is unchanged; the
  // injected adapter never sees the gate.
  const admission = gateHostEffects(workspace);
  const before = await workspace.snapshot();
  const timeoutSignal = AbortSignal.timeout(input.budget.maxDurationMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  // Caller-injected cell tools cross the same C2 admission/termination
  // boundary as host effects: after the gate closes no new tool call starts,
  // every admitted call is joined before the final, and each execute promise
  // covers the call's full effect and its settled evidence. The caller's
  // implementation receives the Cell's exact combined signal. Only the
  // synchronously bound immutable snapshot is validated, projected, and
  // dispatched.
  const injectedCellTools = boundCellTools ?? {};
  const cellToolGate = Object.keys(injectedCellTools).length > 0
    ? gateCellTools(injectedCellTools, emit, signal)
    : undefined;
  // Close the host-effect admission gate synchronously from an abort
  // listener registered before the driver starts: during synchronous
  // AbortSignal dispatch a driver abort listener could otherwise start a
  // new workspace write before the rejection path reaches the outer catch.
  // The listener is removed as soon as the driver settles without aborting;
  // the close-and-drain final boundary below stays authoritative.
  const closeAdmissionOnAbort = () => {
    admission.close();
    cellToolGate?.close();
  };
  signal.addEventListener("abort", closeAdmissionOnAbort);
  const missingCapabilities = input.capabilitiesRequired.filter(
    (capability) => !input.capabilities.includes(capability),
  );
  const cellToolsUnsupported = Object.keys(injectedCellTools).length > 0
    && driver.supportsCellTools !== true;
  const injectedToolNames = () => Object.keys(injectedCellTools).sort();

  let status: CellTerminalStatus = "failed";
  let error: string | undefined;
  let driverResult: Awaited<ReturnType<CellDriver["run"]>> | undefined;
  // True once the provider was actually dispatched. Core contract
  // validation failures before dispatch keep their exact messages; a
  // caught driver/provider failure after dispatch is projected to one
  // stable status-based category for an injected-tool run.
  let driverDispatched = false;
  let failureUsage = emptyUsage();
  let failureSettlementUsage: CellUsage | undefined;
  let observedExecutionUsage = emptyUsage();
  let observedSettlementUsage: CellUsage | undefined;
  let verification = { passed: false, terminal: { passed: false, required: [] as string[], called: [] as string[] } };
  let outputVerification: OutputVerification | undefined;
  let artifactVerification: ArtifactVerification | undefined;
  let taskVerification: TaskVerification | undefined;
  let artifacts: ArtifactRecord[] = [];
  let after: Awaited<ReturnType<HostWorkspace["snapshot"]>> | undefined;

  if (missingCapabilities.length > 0 || cellToolsUnsupported) {
    status = "capability_mismatch";
    error = [
      ...(missingCapabilities.length > 0 ? [`missing capabilities: ${missingCapabilities.join(", ")}`] : []),
      ...(cellToolsUnsupported
        ? [`the supplied driver does not declare supportsCellTools; refusing to dispatch cell tools: ${injectedToolNames().join(", ")}`]
        : []),
    ].join("; ");
    emit("cell.capability_mismatch", {
      ...(missingCapabilities.length > 0 ? { missingCapabilities } : {}),
      ...(cellToolsUnsupported ? { cellTools: injectedToolNames() } : {}),
    });
  } else {
    try {
      // Neutral contract validation before dispatch: injected tools must
      // carry valid names, object-root schemas, executable implementations,
      // and no conflict with declared terminal tools. A name-keyed set cannot
      // carry a duplicate name. Active host/task-surface conflicts are
      // rejected by each driver before any provider dispatch.
      const cellToolErrors = Object.keys(injectedCellTools).length > 0
        ? cellToolContractErrors(
            injectedCellTools,
            input.terminalTools?.map((terminal) => terminal.name) ?? [],
          )
        : [];
      if (cellToolErrors.length > 0) {
        throw new Error(cellToolErrors.join("; "));
      }
      const context = {
        workspace: admission.workspace,
        signal,
        ...(cellToolGate ? { cellTools: cellToolGate.surface } : {}),
        liveObservation: observerActive,
        observeUsage(usage: CellUsage, phase?: "execution" | "settlement") {
          observedExecutionUsage = addUsage(observedExecutionUsage, usage);
          if (phase === "settlement") {
            observedSettlementUsage = addUsage(observedSettlementUsage ?? emptyUsage(), usage);
          }
        },
        emit(type: string, data: unknown) {
          // One core-owned retained-evidence projection for an injected-tool
          // run: no Integration-originated trace event is retained or
          // forwarded through the driver boundary. The core-owned evidence —
          // cell.started, cell.prepared, cell.tools.projected,
          // cell.tool.settled, cell.capability_mismatch, cell.error, and
          // cell.finished — is emitted through the core's own emit path and
          // stays. Runs without injected tools forward every driver event
          // unchanged.
          if (cellToolGate !== undefined) return;
          emit(type, data);
        },
      };
      if (options.preparation) {
        emit("cell.prepared", {
          adapter: options.preparation.adapter,
          usage: options.preparation.usage,
        });
      }
      if (cellToolGate) {
        // The actually authorized caller-injected tool surface, projected
        // before dispatch with sorted names.
        emit("cell.tools.projected", {
          tools: Object.keys(cellToolGate.surface.tools).sort(),
        });
      }
      // One canonical pre-driver CellInput is the caller contract. Terminal,
      // task, artifact, and output verification plus the final record derive
      // only from that canonical value; the supplied driver receives an
      // isolated immutable parsed copy it can never rewrite.
      try {
        driverDispatched = true;
        driverResult = await runWithSignal(() => driver.run(disposableCellInput(input), context), signal);
      } finally {
        // The driver settled without aborting: the synchronous gate-close
        // listener has no further role and is removed before the
        // close-and-drain boundary below.
        signal.removeEventListener("abort", closeAdmissionOnAbort);
      }
      // The driver settled normally: close the host-effect admission gate and
      // join every already-admitted effect before verification and the
      // workspace snapshot, so the final record reflects only settled effects.
      admission.close();
      cellToolGate?.close();
      await admission.drain();
      await cellToolGate?.drain();
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
      // For an injected-tool run a caught driver/provider failure is
      // projected to one stable status-based category before cell.error and
      // the final: the CellExecutionError/TerminalContractError carriers can
      // hold raw provider or adapter error text that echoes injected tool
      // inputs or results, and that text is never retained. Plain errors —
      // core contract validation and adapter fail-closed contract text,
      // including the caller's own abort reason — keep their exact messages.
      error = cellToolGate !== undefined && driverDispatched && caught instanceof CellExecutionError
        ? stableCellFailureMessage(status)
        : caught instanceof Error ? caught.message : String(caught);
      emit("cell.error", { status, error });
    }
  }

  // Whatever settled the driver — completion, failure, or cancellation — the
  // host-effect admission gate closes and every already-admitted effect is
  // joined before the workspace snapshot and the immutable final. When
  // quiescence cannot be proved the Cell returns no final at all, leaving
  // the existing no-final/unresolved/claim-retained O2 standing untouched.
  admission.close();
  cellToolGate?.close();
  await admission.drain();
  await cellToolGate?.drain();
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
  // Observation is sealed as the terminal event is appended, before its
  // observer runs: neither a stray tool completion nor a late driver
  // callback can append to the retained trace after cell.finished.
  emit("cell.finished", { status, usage }, true);

  const priceRevision = input.executionProfile?.priceRevision ?? driver.descriptor.pricing?.revision;
  // For an injected-tool run provider metadata is treated as unavailable:
  // neither a provider session id nor a provider fingerprint enters the
  // execution observation, because provider metadata can echo injected tool
  // inputs or results. The explicit unavailable standing stays truthful.
  const sessionId = cellToolGate === undefined
    ? observedSessionId(driverResult?.providerMetadata)
    : undefined;
  const fingerprintEvidence: {
    value?: string;
    standing: ProviderFingerprintStanding;
  } = cellToolGate === undefined
    ? providerFingerprintEvidence(driverResult?.providerMetadata)
    : {
        standing: {
          standing: "unavailable",
          reason: "an injected-tool run retains no provider metadata; no provider fingerprint could be observed",
        },
      };
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
    // For an injected-tool run the final rawSteps omit the driver execution
    // steps entirely: raw provider steps can echo injected tool inputs or
    // results. Caller-supplied preparation steps (not driver steps) stay.
    rawSteps: [
      ...(options.preparation ? [{ phase: "preparation", adapter: options.preparation.adapter, steps: options.preparation.rawSteps }] : []),
      ...(driverResult && cellToolGate === undefined ? [{ phase: "execution", steps: driverResult.rawSteps }] : []),
    ],
    ...(error ? { error } : {}),
  };
}

interface HostEffectAdmission {
  /** The gated workspace the driver and its host tools receive. */
  readonly workspace: HostWorkspace;
  /** Close the admission gate: any new mutating host effect fails immediately. */
  close(): void;
  /** Resolve once every already-admitted host effect has settled. */
  drain(): Promise<void>;
}

/**
 * The Cell-owned host-effect admission gate over the caller-injected
 * workspace. Mutating operations — writeText, createText, and runCommand —
 * are admitted through this wrapper; every other port operation delegates
 * unchanged. Once closed, already-admitted effects settle through their own
 * bounded behavior (writes complete or fail; commands carry their own
 * timeout plus the Cell abort signal) and `drain` joins them all. The
 * neutral port contract is unchanged: this is a Cell-side wrapper, and the
 * injected adapter never sees the gate.
 */
function gateHostEffects(workspace: HostWorkspace): HostEffectAdmission {
  let closed = false;
  const pending = new Set<Promise<unknown>>();
  const admit = <T>(start: () => Promise<T>): Promise<T> => {
    if (closed) {
      return Promise.reject(
        new Error("the Cell host-effect admission gate is closed; no new host effects may start"),
      );
    }
    const effect = Promise.resolve().then(start);
    pending.add(effect);
    const release = () => {
      pending.delete(effect);
    };
    effect.then(release, release);
    return effect;
  };
  return {
    workspace: {
      root: workspace.root,
      canRead: workspace.canRead,
      canWrite: workspace.canWrite,
      canRunCommands: workspace.canRunCommands,
      listFiles: (path, maxEntries) => workspace.listFiles(path, maxEntries),
      readText: (path, startLine, endLine) => workspace.readText(path, startLine, endLine),
      readBinary: (path) => workspace.readBinary(path),
      writeText: (path, content) => admit(() => workspace.writeText(path, content)),
      createText: (path, content) => admit(() => workspace.createText(path, content)),
      assertEditable: (path) => workspace.assertEditable(path),
      describeArtifact: (path) => workspace.describeArtifact(path),
      runCommand: (argv, cwd, timeoutMs, signal) =>
        admit(() => workspace.runCommand(argv, cwd, timeoutMs, signal)),
      snapshot: () => workspace.snapshot(),
      diff: (before, after) => workspace.diff(before, after),
    },
    close() {
      closed = true;
    },
    async drain() {
      // Join the currently admitted effects exactly once; effects admitted
      // after close are impossible, and settled effects release themselves
      // from the set.
      await Promise.allSettled([...pending]);
    },
  };
}

interface CellToolAdmission {
  /** The gated neutral surface the driver receives through `DriverContext.cellTools`. */
  readonly surface: CellToolSurface;
  /** Close the admission gate: any new tool call is refused without executing the caller implementation. */
  close(): void;
  /** Resolve once every already-admitted tool call has settled with its evidence retained. */
  drain(): Promise<void>;
}

/**
 * The Cell-owned admission gate over caller-injected cell tools. Each
 * invocation crosses the gate exactly like a host effect: after the gate
 * closes (driver settlement, failure, or cancellation) new calls are refused
 * before the caller's implementation can run, and every admitted call is
 * joined before the immutable final, so no tool effect or settled evidence
 * can outlive the returned record. The execute promise returned to the model
 * loop covers the call's full effect and its retained evidence: it resolves
 * only after the caller's implementation settles and the bounded
 * `cell.tool.settled` event — exactly `{ name, toolCallId, outcome }`, never
 * input, result, or implementation identity — is appended to the trace. The
 * caller implementation receives the Cell's exact combined execution signal
 * so cancellation stays observable to in-flight calls. The surface is frozen
 * against driver mutation, and `refuse` retains the same bounded evidence
 * for a model-issued invocation denied before caller execution (for example
 * after terminal action closure) without ever invoking the caller
 * implementation.
 */
function gateCellTools(
  tools: CellToolSet,
  emit: (type: string, data: unknown) => void,
  signal: AbortSignal,
): CellToolAdmission {
  let closed = false;
  const pending = new Set<Promise<unknown>>();
  const settled = (name: string, toolCallId: string, outcome: CellToolSettledOutcome) => {
    emit("cell.tool.settled", { name, toolCallId, outcome });
  };
  const execute = (name: string, input: unknown, toolCallId: string): Promise<unknown> => {
    const tool = tools[name];
    if (tool === undefined) {
      return Promise.reject(new Error(`unknown cell tool: ${name}`));
    }
    if (closed) {
      settled(name, toolCallId, "refused");
      return Promise.reject(
        new Error("the Cell tool admission gate is closed; no new tool calls may start"),
      );
    }
    const effect = Promise.resolve().then(() =>
      tool.execute(input, { signal, toolCallId }),
    );
    pending.add(effect);
    const covered = effect.then(
      (result) => {
        settled(name, toolCallId, "fulfilled");
        return result;
      },
      (error) => {
        settled(name, toolCallId, "rejected");
        throw error;
      },
    );
    covered.then(
      () => pending.delete(effect),
      () => pending.delete(effect),
    );
    return covered;
  };
  const refuse = (name: string, toolCallId: string): Promise<void> => {
    // One core-owned refusal: the invocation is denied before the caller
    // implementation can run and its bounded settled evidence is retained.
    settled(name, toolCallId, "refused");
    return Promise.resolve();
  };
  return {
    surface: Object.freeze({ tools, execute, refuse }),
    close() {
      closed = true;
    },
    async drain() {
      // Join the currently admitted calls exactly once; calls admitted after
      // close are impossible. When a caller implementation never settles,
      // this join never resolves and the Cell truthfully produces no final.
      await Promise.allSettled([...pending]);
    },
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

/**
 * Bind one immutable per-execution tool capability snapshot. The granted
 * names plus each definition's description, object-root input schema, and
 * execute reference are copied into a Cell-owned deep-frozen snapshot, so a
 * caller or driver mutation after the binding can never change the
 * model-visible schema or executable authority. The caller's object is
 * never mutated.
 */
function bindCellToolSnapshot(tools: CellToolSet): CellToolSet {
  const snapshot: Record<string, CellTool> = {};
  for (const name of Object.keys(tools)) {
    const definition = tools[name];
    if (definition === undefined) {
      // Retained only so the neutral contract reports the missing
      // definition with its existing message.
      snapshot[name] = undefined as unknown as CellTool;
      continue;
    }
    snapshot[name] = Object.freeze({
      description: definition.description,
      inputSchema: deepFreeze(structuredClone(definition.inputSchema)),
      execute: definition.execute,
    });
  }
  return Object.freeze(snapshot);
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
  workspace: HostWorkspace,
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

/**
 * The stable status-based category retained for a caught driver/provider
 * failure in an injected-tool run. Raw provider or adapter error text is
 * never retained; the Cell keeps only the truthful terminal-status category.
 */
function stableCellFailureMessage(status: CellTerminalStatus): string {
  switch (status) {
    case "cancelled":
      return "the Cell run was cancelled before completion";
    case "protocol_error":
      return "the declared terminal contract ended violated";
    default:
      return "the provider or driver failed during this run";
  }
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
