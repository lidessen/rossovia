import { z } from "zod";

export const WORK_CELL_RECORD_VERSION = "work-cell.run.v1" as const;

export const BudgetSchema = z.object({
  maxSteps: z.number().int().positive().default(20),
  maxTokens: z.number().int().positive().default(100_000),
  tokenControl: z.enum(["audit", "hard"]).optional(),
  maxDurationMs: z.number().int().positive().default(300_000),
  maxCommandOutputBytes: z.number().int().positive().default(64_000),
});

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
  decisionHorizon: z.enum(["direction", "capability", "mission", "cell-tree"]),
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
  parallelism: z.enum(["serial", "tree"]).default("serial"),
  priceRevision: z.string().min(1).optional(),
});

export const BudgetEnvelopeSchema = z.object({
  id: z.string().min(1),
  version: z.literal("budget-envelope.v1"),
  maxTotalTokens: z.number().int().positive(),
  onExhaustion: z.literal("partial").default("partial"),
});

export const WorkspacePolicySchema = z.object({
  root: z.string().min(1),
  readPaths: z.array(z.string().min(1)).default(["."]),
  writePaths: z.array(z.string().min(1)).default([]),
  excludePaths: z.array(z.string().min(1)).default([]),
  allowedCommands: z.array(z.string().min(1)).default([]),
});

export const DnaSchema = z.object({
  baseInstructions: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
});

const PidSchema = z.string().regex(/^P\d{2,}$/, "expected a P-ID such as P04");

export const GenomeSchema = z.object({
  sequencePath: z.string().min(1),
  interpretationsDir: z.string().min(1),
  inheritedLineage: z
    .object({
      primary: PidSchema,
      supporting: z.array(PidSchema).max(3).default([]),
    })
    .optional(),
});

export const GeneExpressionSchema = z
  .object({
    lead: PidSchema,
    supports: z.array(PidSchema).max(3).default([]),
    principalContradiction: z.string().min(1),
    contributions: z
      .array(
        z.object({
          pid: PidSchema,
          decision: z.string().min(1),
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((value, context) => {
    const selected = [value.lead, ...value.supports];
    if (new Set(selected).size !== selected.length) {
      context.addIssue({ code: "custom", path: ["supports"], message: "selected P-IDs must be unique" });
    }
    const contributed = new Set(value.contributions.map((item) => item.pid));
    for (const pid of selected) {
      if (!contributed.has(pid)) {
        context.addIssue({
          code: "custom",
          path: ["contributions"],
          message: `missing decision contribution for ${pid}`,
        });
      }
    }
    for (const pid of contributed) {
      if (!selected.includes(pid)) {
        context.addIssue({
          code: "custom",
          path: ["contributions"],
          message: `contribution references unselected ${pid}`,
        });
      }
    }
  });

export const TreatmentSchema = z.object({
  id: z.string().min(1),
  instructions: z.string().min(1),
});

export const CheckStepSchema = z.object({
  id: z.string().min(1),
  argv: z.array(z.string()).min(1),
  cwd: z.string().default("."),
  expectExit: z.number().int().default(0),
  timeoutMs: z.number().int().positive().default(60_000),
});

export const CheckPlanSchema = z.object({
  steps: z.array(CheckStepSchema).default([]),
});

export const EvidenceSchema = z.object({
  claim: z.string().min(1),
  source: z.string().min(1),
});

export const StructuredResultSchema = z.object({
  schema: z.string().min(1),
  value: z.unknown(),
});

export const ChildCellSpecSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  capabilitiesRequired: z.array(z.string().min(1)).default([]),
  acceptance: z.array(z.string().min(1)).min(1),
  terminalTools: z.array(z.string().min(1)).min(1).optional(),
  budget: BudgetSchema.partial().optional(),
});

export const CellSubmissionSchema = z
  .object({
    outcome: z.enum(["completed", "partial", "split", "failed"]),
    artifact: z.object({
      summary: z.string().min(1),
      files: z.array(z.string().min(1)).default([]),
    }),
    evidence: z.array(EvidenceSchema).default([]),
    checkPlan: CheckPlanSchema.default({ steps: [] }),
    children: z.array(ChildCellSpecSchema).default([]),
    blockers: z.array(z.string().min(1)).default([]),
    result: StructuredResultSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.outcome === "split" && value.children.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["children"],
        message: "split submissions require at least one child",
      });
    }
    if (value.outcome !== "split" && value.children.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["children"],
        message: "only split submissions may declare children",
      });
    }
  });

export const CellInputSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  workspace: WorkspacePolicySchema,
  genome: GenomeSchema,
  dna: DnaSchema,
  capabilitiesRequired: z.array(z.string().min(1)).default([]),
  acceptance: z.array(z.string().min(1)).min(1),
  terminalTools: z.array(z.string().min(1)).min(1).optional(),
  budget: BudgetSchema.default({
    maxSteps: 20,
    maxTokens: 100_000,
    maxDurationMs: 300_000,
    maxCommandOutputBytes: 64_000,
  }),
  workEstimate: WorkEstimateSchema.optional(),
  executionProfile: ExecutionProfileSchema.optional(),
  budgetEnvelope: BudgetEnvelopeSchema.optional(),
  treatment: TreatmentSchema.optional(),
  lineage: z
    .object({
      parentRunId: z.string().optional(),
      depth: z.number().int().nonnegative().default(0),
    })
    .default({ depth: 0 }),
});

export const UsageSchema = z.object({
  inputTokens: z.number().nonnegative().default(0),
  outputTokens: z.number().nonnegative().default(0),
  totalTokens: z.number().nonnegative().default(0),
  cachedInputTokens: z.number().nonnegative().default(0),
});

export const CheckResultSchema = z.object({
  id: z.string(),
  argv: z.array(z.string()),
  exitCode: z.number(),
  expectedExit: z.number(),
  passed: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().nonnegative(),
});

export const WorkspaceDiffSchema = z.object({
  added: z.array(z.string()),
  changed: z.array(z.string()),
  removed: z.array(z.string()),
});

export type Budget = z.infer<typeof BudgetSchema>;
export type WorkEstimate = z.infer<typeof WorkEstimateSchema>;
export type ExecutionProfile = z.infer<typeof ExecutionProfileSchema>;
export type BudgetEnvelope = z.infer<typeof BudgetEnvelopeSchema>;
export type WorkspacePolicy = z.infer<typeof WorkspacePolicySchema>;
export type CellInput = z.infer<typeof CellInputSchema>;
export type GeneExpression = z.infer<typeof GeneExpressionSchema>;
export type CellSubmission = z.infer<typeof CellSubmissionSchema>;
export type StructuredResult = z.infer<typeof StructuredResultSchema>;
export type ChildCellSpec = z.infer<typeof ChildCellSpecSchema>;
export type CheckStep = z.infer<typeof CheckStepSchema>;
export type CheckResult = z.infer<typeof CheckResultSchema>;
export type CellUsage = z.infer<typeof UsageSchema>;
export type WorkspaceDiff = z.infer<typeof WorkspaceDiffSchema>;

export type CellTerminalStatus =
  | "passed"
  | "split"
  | "partial"
  | "failed"
  | "verification_failed"
  | "protocol_error"
  | "capability_mismatch"
  | "budget_exceeded"
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
  parentRunId?: string;
  depth: number;
  driver: DriverDescriptor;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: CellTerminalStatus;
  input: CellInput;
  geneExpression?: GeneExpression;
  loadedInterpretations: string[];
  submission?: CellSubmission;
  verification: {
    passed: boolean;
    results: CheckResult[];
  };
  workspaceDiff: WorkspaceDiff;
  usage: CellUsage;
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
