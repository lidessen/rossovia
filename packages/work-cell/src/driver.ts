import type {
  CellInput,
  CellUsage,
  BudgetApprovalResult,
  BudgetRequest,
  DriverDescriptor,
  Task,
  TraceEvent,
} from "./contracts";
import type { Workspace } from "./workspace";

export interface DriverContext {
  workspace: Workspace;
  signal: AbortSignal;
  /** The caller is consuming execution events while the driver is running. */
  liveObservation: boolean;
  /** Retain completed provider-step usage even if the outer Cell timeout wins the driver race. */
  observeUsage(usage: CellUsage, phase?: "execution" | "settlement"): void;
  /** Present only for drivers that enforce completed-step soft-budget approval. */
  budgetControl?: {
    readonly phase: "production" | "decision" | "settlement";
    completedStep(): boolean;
    settleNow(): void;
    requestBudget(request: Omit<BudgetRequest, "cellId" | "completedSteps" | "elapsedMs">): Promise<{
      request: BudgetRequest;
      result: BudgetApprovalResult;
    }>;
  };
  /** Creates the reserve allowance only when terminal/structured settlement starts. */
  settlementSignal?(): AbortSignal;
  emit(type: string, data: unknown): void;
}

export interface DriverResult {
  /** Actual terminal tools invoked by the adapter, retained separately from output. */
  terminalToolsCalled: string[];
  /** Final host-owned coordination state; task completion is never semantic acceptance. */
  tasks?: Task[];
  finalText: string;
  output?: unknown;
  usage: CellUsage;
  /** Usage spent after the soft-budget settlement transition; excluded from ordinary execution usage. */
  settlementUsage?: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export interface CellDriver {
  readonly descriptor: DriverDescriptor;
  readonly budgetControl?: "completed-step-v1";
  run(input: CellInput, context: DriverContext): Promise<DriverResult>;
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

export function traceEvent(type: string, data: unknown): TraceEvent {
  return { at: new Date().toISOString(), type, data };
}
