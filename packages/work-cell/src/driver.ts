import type {
  CellInput,
  CellUsage,
  DriverDescriptor,
  Task,
  TraceEvent,
} from "./contracts";
import type { HostWorkspace } from "./host-port";
import type { CellToolSurface } from "./tool-port";

export interface DriverContext {
  workspace: HostWorkspace;
  signal: AbortSignal;
  /** The caller is consuming execution events while the driver is running. */
  liveObservation: boolean;
  /** Retain completed provider-step usage even if the outer Cell timeout wins the driver race. */
  observeUsage(usage: CellUsage, phase?: "execution" | "settlement"): void;
  emit(type: string, data: unknown): void;
  /**
   * The caller-injected cell tool surface admitted for this run, when tools
   * were supplied. Each `execute` covers the call's full effect and settled
   * evidence and rejects after the Cell admission gate closes.
   */
  cellTools?: CellToolSurface;
}

export interface DriverResult {
  /** Actual terminal tools invoked by the adapter, retained separately from output. */
  terminalToolsCalled: string[];
  /** Final host-owned coordination state; task completion is never semantic acceptance. */
  tasks?: Task[];
  finalText: string;
  output?: unknown;
  usage: CellUsage;
  /** Usage spent by the structured-output settlement phase; excluded from ordinary execution usage. */
  settlementUsage?: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export interface CellDriver {
  readonly descriptor: DriverDescriptor;
  /**
   * Declared optional cell-tool capability. A non-empty injected tool set
   * fails closed as `capability_mismatch` before dispatch when the supplied
   * driver does not declare `supportsCellTools: true`.
   */
  readonly supportsCellTools?: boolean;
  run(input: CellInput, context: DriverContext): Promise<DriverResult>;
}

/**
 * One shared monotonic, non-extendable explicit step allowance. Every
 * provider/model step — the main execution loop, terminal recovery, and
 * structured settlement alike — consumes one unit; a phase is never started
 * when no step remains. An omitted `maxSteps` installs no step-count ceiling
 * at all: `remaining` and `exhausted` stay unbounded and `consume` always
 * succeeds, so only `maxDurationMs` and the caller's abort signal remain.
 * Settlement usage stays usage attribution only and never extends the
 * allowance.
 */
export interface StepAllowance {
  readonly maxSteps: number | undefined;
  readonly consumed: number;
  /** Undefined when maxSteps was omitted: no step-count stop condition. */
  readonly remaining: number | undefined;
  /** False when maxSteps was omitted. */
  readonly exhausted: boolean;
  /** Consume one provider step; false only when an explicit allowance is exhausted. */
  consume(): boolean;
}

export function createStepAllowance(maxSteps: number | undefined): StepAllowance {
  let consumed = 0;
  return {
    get maxSteps() {
      return maxSteps;
    },
    get consumed() {
      return consumed;
    },
    get remaining() {
      return maxSteps === undefined ? undefined : Math.max(0, maxSteps - consumed);
    },
    get exhausted() {
      return maxSteps !== undefined && consumed >= maxSteps;
    },
    consume() {
      if (maxSteps !== undefined && consumed >= maxSteps) return false;
      consumed += 1;
      return true;
    },
  };
}

/** A driver failure that still carries observed provider usage for audit. */
export class CellExecutionError extends Error {
  constructor(
    message: string,
    readonly usage: CellUsage,
    readonly settlementUsage?: CellUsage,
  ) {
    super(message);
    this.name = "CellExecutionError";
  }
}

/**
 * A declared terminal-tool contract ended unsatisfied: a second terminal
 * call, an undeclared terminal call, or an explicit step allowance that ran
 * out before the required terminal tool was invoked. Canonical status
 * semantics stay identical to the run-cell verification path: the Cell ends
 * as `protocol_error`, never as a weakened ordinary failure.
 */
export class TerminalContractError extends CellExecutionError {
  constructor(
    message: string,
    usage: CellUsage,
    settlementUsage?: CellUsage,
  ) {
    super(message, usage, settlementUsage);
    this.name = "TerminalContractError";
  }
}

/**
 * One canonical exhaustion sentence shared by the AI SDK driver, the Pi
 * harness driver, and structured settlement. Every provider/model step — the
 * main execution loop, terminal recovery, and structured settlement alike —
 * consumes the same explicit maxSteps allowance, so the same truthful
 * wording reports its exhaustion everywhere.
 */
export function stepBudgetExhaustedMessage(consumed: number, reason: string): string {
  return `Work Cell step budget exhausted after ${consumed} steps; ${reason}`;
}

export function traceEvent(type: string, data: unknown): TraceEvent {
  return { at: new Date().toISOString(), type, data };
}
