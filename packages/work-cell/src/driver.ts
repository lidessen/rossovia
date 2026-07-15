import type {
  CellInput,
  CellUsage,
  DriverDescriptor,
  TraceEvent,
} from "./contracts";
import type { Workspace } from "./workspace";

export interface DriverContext {
  workspace: Workspace;
  signal: AbortSignal;
  emit(type: string, data: unknown): void;
}

export interface DriverResult {
  /** Actual terminal tools invoked by the adapter, retained separately from output. */
  terminalToolsCalled: string[];
  finalText: string;
  output?: unknown;
  usage: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export interface CellDriver {
  readonly descriptor: DriverDescriptor;
  run(input: CellInput, context: DriverContext): Promise<DriverResult>;
}

/** A driver failure that still carries observed provider usage for audit. */
export class CellExecutionError extends Error {
  constructor(message: string, readonly usage: CellUsage) {
    super(message);
    this.name = "CellExecutionError";
  }
}

export function traceEvent(type: string, data: unknown): TraceEvent {
  return { at: new Date().toISOString(), type, data };
}
