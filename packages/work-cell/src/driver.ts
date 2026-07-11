import type {
  CellInput,
  GeneExpression,
  CellSubmission,
  CellUsage,
  DriverDescriptor,
  TraceEvent,
} from "./contracts";
import type { ExpressedGenome, Genome } from "./genome";
import type { Workspace } from "./workspace";

export interface DriverContext {
  workspace: Workspace;
  signal: AbortSignal;
  maxTokens: number;
  emit(type: string, data: unknown): void;
}

export interface DriverResult {
  submission?: CellSubmission;
  finalText: string;
  usage: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export interface GeneSelectionResult {
  expression: GeneExpression;
  usage: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export interface CellDriver {
  readonly descriptor: DriverDescriptor;
  selectGenes(input: CellInput, genome: Genome, context: DriverContext): Promise<GeneSelectionResult>;
  run(input: CellInput, expressed: ExpressedGenome, context: DriverContext): Promise<DriverResult>;
}

export class CellBudgetExceededError extends Error {
  constructor(
    readonly observed: number,
    readonly limit: number,
    readonly usage?: CellUsage,
  ) {
    super(`token budget exceeded: observed ${observed}, limit ${limit}`);
    this.name = "CellBudgetExceededError";
  }
}

export function traceEvent(type: string, data: unknown): TraceEvent {
  return { at: new Date().toISOString(), type, data };
}
