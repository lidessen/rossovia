import { z } from "zod";

export const WORK_CELL_RECORD_VERSION = "work-cell.run.v3" as const;

export const BudgetSchema = z.object({
  maxSteps: z.number().int().positive().default(20),
  /** A caller's resource forecast, retained for post-run comparison; never a stop condition. */
  estimatedTokens: z.number().int().positive().optional(),
  /** Relative absolute-error tolerance, for example 0.5 means ±50%. */
  estimatedTokensTolerance: z.number().nonnegative().optional(),
  maxDurationMs: z.number().int().positive().default(300_000),
  maxCommandOutputBytes: z.number().int().positive().default(64_000),
}).strict();

export const WorkNodeSchema = z.object({
  id: z.string().min(1),
  requiredTransition: z.string().min(1),
  acceptance: z.string().min(1),
  dependsOn: z.array(z.string().min(1)).default([]),
});

export const DiscoveryBranchSchema = z.object({
  id: z.string().min(1),
  smallestWork: z.string().min(1),
  opensWhen: z.string().min(1),
  closesWhen: z.string().min(1),
});

export const WorkEstimateSchema = z.object({
  id: z.string().min(1),
  version: z.literal("work-estimate.v1"),
  decisionHorizon: z.enum(["direction", "capability", "mission"]),
  targetState: z.string().min(1),
  sources: z.array(z.string().min(1)).min(1),
  nodes: z.array(WorkNodeSchema).min(1),
  discoveryBranches: z.array(DiscoveryBranchSchema).default([]),
  reopeningObservation: z.string().min(1),
});

export const ExecutionProfileSchema = z.object({
  id: z.string().min(1),
  version: z.literal("execution-profile.v1"),
  provider: z.string().min(1),
  model: z.string().min(1),
  contextPolicy: z.string().min(1).optional(),
  toolSurface: z.string().min(1).optional(),
  parallelism: z.literal("serial").default("serial"),
  priceRevision: z.string().min(1).optional(),
});

export const WorkspacePolicySchema = z.object({
  root: z.string().min(1),
  readPaths: z.array(z.string().min(1)).default(["."]),
  writePaths: z.array(z.string().min(1)).default([]),
  excludePaths: z.array(z.string().min(1)).default([]),
  allowedCommands: z.array(z.string().min(1)).default([]),
});

// A serializable JSON Schema is the portable boundary for a cell's final
// structured output. It intentionally does not belong to a tool input schema.
export const OutputSchemaSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  if (value.type !== "object") {
    context.addIssue({ code: "custom", message: "outputSchema must describe an object at its root" });
  }
});

export const ArtifactRequirementSchema = z.object({
  path: z.string().min(1),
  instructions: z.string().min(1),
});

export const TerminalToolSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "terminal tool names use lowercase snake_case"),
  description: z.string().min(1),
  inputSchema: OutputSchemaSchema,
});

export const UsageSchema = z.object({
  inputTokens: z.number().nonnegative().default(0),
  outputTokens: z.number().nonnegative().default(0),
  totalTokens: z.number().nonnegative().default(0),
  cachedInputTokens: z.number().nonnegative().default(0),
});

export const CellContextSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  sources: z.array(z.string().min(1)).default([]),
}).strict();

/**
 * Evidence retained when an adapter prepares a generic executable Cell.
 * The core records this envelope but does not interpret adapter-specific data.
 */
export const CellPreparationSchema = z.object({
  adapter: z.string().min(1),
  usage: UsageSchema,
  rawSteps: z.array(z.unknown()).default([]),
  evidence: z.unknown().optional(),
}).strict();

export const CellInputSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  workspace: WorkspacePolicySchema,
  instructions: z.array(z.string().min(1)).min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  context: z.array(CellContextSchema).default([]),
  capabilitiesRequired: z.array(z.string().min(1)).default([]),
  acceptance: z.array(z.string().min(1)).min(1),
  terminalTools: z.array(TerminalToolSchema).min(1).optional(),
  outputSchema: OutputSchemaSchema.optional(),
  artifacts: z.array(ArtifactRequirementSchema).min(1).optional(),
  budget: BudgetSchema.default({
    maxSteps: 20,
    maxDurationMs: 300_000,
    maxCommandOutputBytes: 64_000,
  }),
  workEstimate: WorkEstimateSchema.optional(),
  executionProfile: ExecutionProfileSchema.optional(),
}).strict();

export const WorkspaceDiffSchema = z.object({
  added: z.array(z.string()),
  changed: z.array(z.string()),
  removed: z.array(z.string()),
});

export const ArtifactRecordSchema = z.object({
  path: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export type Budget = z.infer<typeof BudgetSchema>;
export type WorkEstimate = z.infer<typeof WorkEstimateSchema>;
export type ExecutionProfile = z.infer<typeof ExecutionProfileSchema>;
export type WorkspacePolicy = z.infer<typeof WorkspacePolicySchema>;
export type CellInput = z.infer<typeof CellInputSchema>;
export type CellContext = z.infer<typeof CellContextSchema>;
export type CellPreparation = z.infer<typeof CellPreparationSchema>;
export type OutputSchema = z.infer<typeof OutputSchemaSchema>;
export type ArtifactRequirement = z.infer<typeof ArtifactRequirementSchema>;
export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>;
export type TerminalTool = z.infer<typeof TerminalToolSchema>;
export type CellUsage = z.infer<typeof UsageSchema>;
export type WorkspaceDiff = z.infer<typeof WorkspaceDiffSchema>;

export type CellTerminalStatus =
  | "passed"
  | "failed"
  | "verification_failed"
  | "protocol_error"
  | "capability_mismatch"
  | "cancelled";

export interface TraceEvent {
  at: string;
  type: string;
  data: unknown;
}

export interface CellRunRecord {
  version: typeof WORK_CELL_RECORD_VERSION;
  runId: string;
  cellId: string;
  driver: DriverDescriptor;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: CellTerminalStatus;
  input: CellInput;
  preparation?: CellPreparation;
  finalText: string;
  output?: unknown;
  artifacts: ArtifactRecord[];
  verification: {
    passed: boolean;
    terminal: TerminalVerification;
    output?: OutputVerification;
    artifacts?: ArtifactVerification;
  };
  workspaceDiff: WorkspaceDiff;
  usage: CellUsage;
  usageByPhase: {
    preparation: CellUsage;
    execution: CellUsage;
  };
  executionObservation: {
    workEstimateId?: string;
    executionProfileId?: string;
    priceRevision?: string;
  };
  estimatedCostUsd?: number;
  estimateBasis?: string;
  trace: TraceEvent[];
  rawSteps: unknown[];
  error?: string;
}

export interface OutputVerification {
  passed: boolean;
  errors: string[];
}

export interface TerminalVerification {
  passed: boolean;
  required: string[];
  called: string[];
}

export interface ArtifactVerification {
  passed: boolean;
  errors: string[];
}

export interface DriverDescriptor {
  adapter: string;
  provider: string;
  model: string;
  pricing?: {
    inputPerMillionUsd: number;
    cachedInputPerMillionUsd?: number;
    outputPerMillionUsd: number;
    source: string;
    revision?: string;
  };
}

export const CellRunRecordSchema = z.object({
  version: z.literal(WORK_CELL_RECORD_VERSION),
  runId: z.string().min(1),
  cellId: z.string().min(1),
  driver: z.object({
    adapter: z.string().min(1),
    provider: z.string().min(1),
    model: z.string().min(1),
    pricing: z.object({
      inputPerMillionUsd: z.number().nonnegative(),
      cachedInputPerMillionUsd: z.number().nonnegative().optional(),
      outputPerMillionUsd: z.number().nonnegative(),
      source: z.string().min(1),
      revision: z.string().min(1).optional(),
    }).strict().optional(),
  }).strict(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().nonnegative(),
  status: z.enum([
    "passed",
    "failed",
    "verification_failed",
    "protocol_error",
    "capability_mismatch",
    "cancelled",
  ]),
  input: CellInputSchema,
  preparation: CellPreparationSchema.optional(),
  finalText: z.string(),
  output: z.unknown().optional(),
  artifacts: z.array(ArtifactRecordSchema),
  verification: z.object({
    passed: z.boolean(),
    terminal: z.object({
      passed: z.boolean(),
      required: z.array(z.string()),
      called: z.array(z.string()),
    }).strict(),
    output: z.object({
      passed: z.boolean(),
      errors: z.array(z.string()),
    }).strict().optional(),
    artifacts: z.object({
      passed: z.boolean(),
      errors: z.array(z.string()),
    }).strict().optional(),
  }).strict(),
  workspaceDiff: WorkspaceDiffSchema,
  usage: UsageSchema,
  usageByPhase: z.object({
    preparation: UsageSchema,
    execution: UsageSchema,
  }).strict(),
  executionObservation: z.object({
    workEstimateId: z.string().min(1).optional(),
    executionProfileId: z.string().min(1).optional(),
    priceRevision: z.string().min(1).optional(),
  }).strict(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  estimateBasis: z.string().min(1).optional(),
  trace: z.array(z.object({
    at: z.string().min(1),
    type: z.string().min(1),
    data: z.unknown(),
  }).strict()),
  rawSteps: z.array(z.unknown()),
  error: z.string().min(1).optional(),
}).strict();
