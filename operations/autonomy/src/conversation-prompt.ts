import { createHash } from "node:crypto";
import { z } from "zod";

export const CONVERSATION_PROMPT_REVISION = "rosso.conversation-prompt.v7" as const;

const BOUNDED_ORIENTATION_CONTENT_LIMIT = 4096;
const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const GitObjectSchema = z.string().regex(/^[a-f0-9]{40}$/);

export const RELATION_KERNEL_V1 = [
  "You are the one synthesis owner for this conversation turn with one local Principal.",
  "The Principal directs; you reconstruct and synthesize.",
  "Project, Task, Mission, effect, and carrier facts are owned by their authoritative sources: read them, never invent or copy them.",
  "Streamed text is provisional until settled.",
  "Verification is separate from production.",
  "Result acceptance is the Principal's explicit act, never yours.",
].join("\n");

export const CURRENT_COORDINATOR_POLICY = {
  provider: "deepseek",
  model: "deepseek-v4-pro",
  thinking: "enabled",
  reasoningEffort: "max",
} as const;

export const DisclosedSourceSchema = z.object({
  ref: z.string().min(1),
  digest: DigestSchema,
}).strict();
export type DisclosedSource = z.infer<typeof DisclosedSourceSchema>;

export const SourceRevisionSelectorSchema = z.object({
  source: z.string().min(1),
  revision: z.string().min(1),
}).strict();
export type SourceRevisionSelector = z.infer<typeof SourceRevisionSelectorSchema>;

export const CorrectionProjectionSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1).max(500),
}).strict();
export type CorrectionProjection = z.infer<typeof CorrectionProjectionSchema>;

export const TaskProjectionSchema = z.object({
  id: z.string().min(1),
  sourceRevision: z.string().min(1),
  /** The task's current numeric revision; carried so the coordinator can copy it into an exact correction. */
  revision: z.number().int().positive().optional(),
  source: DisclosedSourceSchema.optional(),
  summary: z.string().min(1).max(800),
  status: z.enum(["open", "settled", "accepted"]).optional(),
  corrections: z.array(CorrectionProjectionSchema).optional(),
  /**
   * The task's exact execution selection, present only when the task is bound
   * to an existing project Worktree: the registered project identity, its
   * current primary head, the exact bound Worktree path, and its current
   * head. A task_continue must copy these selectors verbatim; the host
   * re-reads them immediately before any start effect.
   */
  projectId: z.string().min(1).optional(),
  primaryHead: GitObjectSchema.optional(),
  worktreePath: z.string().min(1).optional(),
  worktreeHead: GitObjectSchema.optional(),
}).strict();
export type TaskProjection = z.infer<typeof TaskProjectionSchema>;

export const WorktreeProjectionSchema = z.object({
  path: z.string().min(1),
  head: GitObjectSchema,
}).strict();
export type WorktreeProjection = z.infer<typeof WorktreeProjectionSchema>;

export const ProjectProjectionSchema = z.object({
  name: z.string().min(1),
  id: z.string().min(1).optional(),
  status: z.enum(["registered", "discovered", "unregistered"]),
  primaryHead: GitObjectSchema.optional(),
  source: DisclosedSourceSchema.optional(),
  worktrees: z.array(WorktreeProjectionSchema).optional(),
}).strict();
export type ProjectProjection = z.infer<typeof ProjectProjectionSchema>;

export const CarrierActivityProjectionSchema = z.object({
  id: z.string().min(1),
  state: z.string().min(1),
  runId: z.string().min(1).optional(),
  /**
   * Exact Task/project correlation, disclosed only when strict owner-backed
   * evidence supports it: the runtime-retained carrier identity or a strict
   * available attempt record names the taskId, and the current canonical Task
   * source re-reads its registered project identity. Invalid, mismatched, or
   * unavailable evidence projects the carrier without correlation — unknown
   * or uninspectable, never guessed.
   */
  taskId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
}).strict();
export type CarrierActivityProjection = z.infer<typeof CarrierActivityProjectionSchema>;

/**
 * One bounded worker capability card disclosed to the coordinator. The
 * coordinator judges descriptions semantically; the host only validates an
 * exact card identity copied from this projection. It is a read-only fact,
 * never a routing or ranking policy.
 */
export const WorkerCardProjectionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  labels: z.array(z.string().min(1)),
  provider: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1).optional(),
  availability: z.union([
    z.literal("available"),
    z.literal("unavailable"),
  ]),
}).strict();
export type WorkerCardProjection = z.infer<typeof WorkerCardProjectionSchema>;

/**
 * One bounded temporary contribution the coordinator formed in this
 * conversation. It is liveness/identity evidence only: the exact batch/key,
 * worker, effect boundary, and current standing. It never ranks prose or
 * roles, and it is not a standing team.
 */
export const ContributionProjectionSchema = z.object({
  batchId: z.string().min(1),
  key: z.string().min(1),
  workerId: z.string().min(1),
  effectKind: z.enum(["read-only", "effectful"]),
  state: z.enum(["live", "settled", "unknown", "unresolved"]),
  /** Terminal outcome standing when the contribution has settled. */
  status: z.string().min(1).optional(),
}).strict();
export type ContributionProjection = z.infer<typeof ContributionProjectionSchema>;

/**
 * One bounded conversation-attributed Task card: the exact Task identity,
 * current source and task revisions, lifecycle standing, bounded summary,
 * registered project identity from the canonical binding, and the exact
 * execution selection only when it can be re-read from the canonical owners.
 * A card exists only when the Task identity was re-read from the current Task
 * source; the collection standing carries every omission explicitly.
 */
export const TaskCardProjectionSchema = z.object({
  id: z.string().min(1),
  sourceRevision: z.string().min(1),
  /** The task's current numeric revision, carried so a copied correction stays exact. */
  revision: z.number().int().positive().optional(),
  source: DisclosedSourceSchema.optional(),
  summary: z.string().min(1).max(800),
  status: z.enum(["open", "settled", "accepted"]).optional(),
  /** The task's exact registered project identity from its canonical binding. */
  projectId: z.string().min(1).optional(),
  primaryHead: GitObjectSchema.optional(),
  worktreePath: z.string().min(1).optional(),
  worktreeHead: GitObjectSchema.optional(),
}).strict();
export type TaskCardProjection = z.infer<typeof TaskCardProjectionSchema>;

/**
 * The explicit completeness standing of the conversation-attributed Task card
 * collection. `complete` means every settled Task action lineage identity was
 * re-read from the current Task source and disclosed within the bound.
 * `partial` means the bound omitted cards or at least one lineage identity
 * could not be re-read (cap exceeded, missing receipt, or unresolvable
 * evidence). `unavailable` means the canonical Task source could not be read.
 * `omitted` means the conversation has no settled Task action lineage at all.
 * A bounded projection never converts any of these into a factual claim that
 * no Task exists.
 */
export const TaskCardCollectionStandingSchema = z.object({
  state: z.enum(["complete", "partial", "unavailable", "omitted"]),
  /** Exact reason when the standing is not complete. */
  reason: z.string().min(1).optional(),
  cap: z.number().int().positive().optional(),
  disclosed: z.number().int().nonnegative().optional(),
  /** Task identities derived from the lineage before re-reading the source. */
  known: z.number().int().nonnegative().optional(),
  omitted: z.number().int().nonnegative().optional(),
}).strict();
export type TaskCardCollectionStanding = z.infer<typeof TaskCardCollectionStandingSchema>;

export const CompactProjectionSchema = z.object({
  task: TaskProjectionSchema.optional(),
  /**
   * The bounded collection of conversation-attributed current Task cards,
   * deduplicated from the canonical settled Task action lineage and re-read
   * from the current Task source. Cards are disclosed only when the exact
   * Task identity re-reads from the canonical source; the collection standing
   * states omission explicitly so absence is never inferred from a bounded
   * projection.
   */
  taskCards: z.array(TaskCardProjectionSchema).optional(),
  taskCardStanding: TaskCardCollectionStandingSchema.optional(),
  projects: z.array(ProjectProjectionSchema).optional(),
  carriers: z.array(CarrierActivityProjectionSchema).optional(),
  workers: z.array(WorkerCardProjectionSchema).optional(),
  contributions: z.array(ContributionProjectionSchema).optional(),
}).strict();
export type CompactProjection = z.infer<typeof CompactProjectionSchema>;

export const PrincipalMessageLineageSchema = z.object({
  messageId: z.string().min(1),
  turnId: z.string().min(1),
  correctionId: z.string().min(1).optional(),
  priorMessageRefs: z.array(z.string().min(1)).optional(),
}).strict();
export type PrincipalMessageLineage = z.infer<typeof PrincipalMessageLineageSchema>;

export const PrincipalMessageSchema = z.object({
  text: z.string().min(1),
  lineage: PrincipalMessageLineageSchema,
}).strict();
export type PrincipalMessage = z.infer<typeof PrincipalMessageSchema>;

/**
 * One consequential operation tool the caller makes known to the coordinator:
 * its name, what it means, and whether it is currently available. Unavailable
 * tools stay named so the coordinator can report them instead of calling.
 */
export const PolicyToolGuidanceSchema = z.object({
  name: z.string().min(1),
  meaning: z.string().min(1).max(2000),
  availability: z.enum(["available", "unavailable"]),
}).strict();
export type PolicyToolGuidance = z.infer<typeof PolicyToolGuidanceSchema>;

export const ConversationPolicySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  thinking: z.enum(["enabled", "disabled"]),
  reasoningEffort: z.string().min(1),
  disclosureEnvelope: z.string().min(1).max(1000),
  tools: z.array(z.union([z.string().min(1), PolicyToolGuidanceSchema])).optional(),
  abstention: z.string().min(1).max(1000).optional(),
  workspace: z.string().min(1).optional(),
  budget: z.string().min(1).optional(),
  withheldEffects: z.array(z.string().min(1)).optional(),
}).strict();
export type ConversationPolicy = z.infer<typeof ConversationPolicySchema>;

export const OrientationBasisSchema = z.enum(["verified-route", "current-judgment"]);
export type OrientationBasis = z.infer<typeof OrientationBasisSchema>;

export const OrientationSourceSchema = z.object({
  kind: z.enum(["project-instruction", "orientation", "skill"]),
  ref: z.string().min(1),
  digest: DigestSchema,
  content: z.string().min(1).max(BOUNDED_ORIENTATION_CONTENT_LIMIT).optional(),
}).strict();
export type OrientationSource = z.infer<typeof OrientationSourceSchema>;

export const ProjectOrientationSchema = z.object({
  basis: OrientationBasisSchema,
  projectId: z.string().min(1).optional(),
  sources: z.array(OrientationSourceSchema),
}).strict();
export type ProjectOrientation = z.infer<typeof ProjectOrientationSchema>;

export const ChildEvidenceRefSchema = z.object({
  batchId: z.string().min(1),
  key: z.string().min(1),
}).strict();
export type ChildEvidenceRef = z.infer<typeof ChildEvidenceRefSchema>;

export const ChildSummarySchema = z.object({
  id: z.string().min(1),
  contribution: z.string().min(1),
  conclusion: z.string().min(1).max(1000),
  sourceScope: z.string().min(1).optional(),
  admissibleClaims: z.array(z.string().min(1)).optional(),
  uncertainty: z.string().min(1).optional(),
  evidenceRefs: z.array(ChildEvidenceRefSchema).optional(),
}).strict();
export type ChildSummary = z.infer<typeof ChildSummarySchema>;

/**
 * The bounded full semantic projection of one exact settled child result,
 * loaded only through the keyed result-read operation when synthesis needs
 * it. `projection: "metadata-only"` means the semantic payload was too large
 * or unavailable and must never be guessed.
 */
export const FullChildResultSchema = z.object({
  batchId: z.string().min(1),
  key: z.string().min(1),
  cellId: z.string().min(1),
  status: z.string().min(1),
  projection: z.enum(["full", "metadata-only"]),
  semantic: z.object({
    finalText: z.string(),
    output: z.unknown().optional(),
    artifacts: z.array(z.unknown()).optional(),
    verification: z.unknown().optional(),
  }).strict().optional(),
  omission: z.object({
    reason: z.string().min(1),
    maxBytes: z.number().int().positive(),
  }).strict().optional(),
}).strict();
export type FullChildResult = z.infer<typeof FullChildResultSchema>;

export const ConversationPromptInputSchema = z.object({
  projection: CompactProjectionSchema.optional(),
  message: PrincipalMessageSchema,
  policy: ConversationPolicySchema,
  orientation: ProjectOrientationSchema.optional(),
  children: z.array(ChildSummarySchema).optional(),
  fullChildResults: z.array(FullChildResultSchema).optional(),
}).strict();
export type ConversationPromptInput = z.infer<typeof ConversationPromptInputSchema>;

export interface ComposedConversationPrompt {
  revision: string;
  prompt: string;
  digest: string;
  disclosedSources: DisclosedSource[];
  sourceRevisionSelectors: SourceRevisionSelector[];
}

export function composeConversationPrompt(input: ConversationPromptInput): ComposedConversationPrompt {
  const parsed = ConversationPromptInputSchema.parse(input);
  const disclosedSources: DisclosedSource[] = [];
  const sourceRevisionSelectors: SourceRevisionSelector[] = [];
  const sections: string[] = [];

  // The composed prompt always renders the exact six fixed-order section
  // headers. Optional sections that carry no content render a bounded
  // "none" body so the coordinator sees an explicit not-loaded standing
  // instead of a missing or reordered section.
  sections.push(renderRelationKernel());
  sections.push(renderProjection(parsed.projection, disclosedSources, sourceRevisionSelectors));
  sections.push(renderMessage(parsed.message));
  sections.push(renderPolicy(parsed.policy));
  sections.push(renderOrientation(parsed.orientation, disclosedSources));
  const children = parsed.children ?? [];
  const fullChildResults = parsed.fullChildResults ?? [];
  sections.push(renderChildResults(children, fullChildResults));

  const prompt = `${sections.join("\n\n")}\n`;
  return {
    revision: CONVERSATION_PROMPT_REVISION,
    prompt,
    digest: createHash("sha256").update(prompt, "utf8").digest("hex"),
    disclosedSources,
    sourceRevisionSelectors,
  };
}

function renderRelationKernel(): string {
  return `## 1. Relation kernel (v1)\n\n${RELATION_KERNEL_V1}`;
}

function renderProjection(
  projection: CompactProjection | undefined,
  disclosedSources: DisclosedSource[],
  sourceRevisionSelectors: SourceRevisionSelector[],
): string {
  const lines: string[] = [];

  if (projection?.task !== undefined) {
    const task = projection.task;
    lines.push(`task ${task.id} [${task.status ?? "open"}]: ${task.summary}`);
    if (task.source !== undefined) {
      lines.push(`  source ${task.source.ref} @ ${task.sourceRevision} (digest ${task.source.digest})`);
      pushDisclosed(disclosedSources, task.source);
    } else {
      lines.push(`  source revision: ${task.sourceRevision}`);
    }
    if (task.revision !== undefined) {
      lines.push(`  task revision: ${task.revision}`);
    }
    if (task.projectId !== undefined) {
      lines.push(
        `  execution selection: registered project ${task.projectId}`
        + ` @ primary ${task.primaryHead ?? "unavailable"}`
        + ` in bound worktree ${task.worktreePath ?? "unavailable"}`
        + ` @ ${task.worktreeHead ?? "unavailable"}`,
      );
    }
    if (task.corrections !== undefined && task.corrections.length > 0) {
      lines.push(`  corrections: ${task.corrections.map((c) => `${c.id}: ${c.summary}`).join(" | ")}`);
    }
    sourceRevisionSelectors.push({ source: `task:${task.id}`, revision: task.sourceRevision });
    if (task.projectId !== undefined && task.primaryHead !== undefined) {
      sourceRevisionSelectors.push({ source: `task-project:${task.id}`, revision: task.primaryHead });
    }
    if (task.worktreePath !== undefined && task.worktreeHead !== undefined) {
      sourceRevisionSelectors.push({ source: `task-worktree:${task.id}`, revision: task.worktreeHead });
    }
  }

  if (projection?.taskCardStanding !== undefined) {
    lines.push(renderTaskCardStanding(projection.taskCardStanding));
  }
  for (const card of projection?.taskCards ?? []) {
    lines.push(
      `task card ${card.id} [${card.status ?? "open"}]`
      + `${card.projectId === undefined ? "" : ` project ${card.projectId}`}: ${card.summary}`,
    );
    if (card.source !== undefined) {
      lines.push(`  source ${card.source.ref} @ ${card.sourceRevision} (digest ${card.source.digest})`);
      pushDisclosed(disclosedSources, card.source);
    } else {
      lines.push(`  source revision: ${card.sourceRevision}`);
    }
    if (card.revision !== undefined) {
      lines.push(`  task revision: ${card.revision}`);
    }
    if (
      card.projectId !== undefined
      && (card.primaryHead !== undefined || card.worktreePath !== undefined || card.worktreeHead !== undefined)
    ) {
      lines.push(
        `  execution selection: registered project ${card.projectId}`
        + ` @ primary ${card.primaryHead ?? "unavailable"}`
        + ` in bound worktree ${card.worktreePath ?? "unavailable"}`
        + ` @ ${card.worktreeHead ?? "unavailable"}`,
      );
    }
    sourceRevisionSelectors.push({ source: `task:${card.id}`, revision: card.sourceRevision });
    if (card.projectId !== undefined && card.primaryHead !== undefined) {
      sourceRevisionSelectors.push({ source: `task-project:${card.id}`, revision: card.primaryHead });
    }
    if (card.worktreePath !== undefined && card.worktreeHead !== undefined) {
      sourceRevisionSelectors.push({ source: `task-worktree:${card.id}`, revision: card.worktreeHead });
    }
  }

  for (const project of projection?.projects ?? []) {
    lines.push(`project ${project.name} [${project.status}]${project.id !== undefined ? ` (${project.id})` : ""}`);
    if (project.primaryHead !== undefined) {
      lines.push(`  primary head: ${project.primaryHead}`);
    }
    if (project.worktrees !== undefined && project.worktrees.length > 0) {
      lines.push(`  worktrees: ${project.worktrees.map((w) => `${w.path} @ ${w.head}`).join(" | ")}`);
    }
    if (project.source !== undefined) {
      lines.push(`  source ${project.source.ref} (digest ${project.source.digest})`);
      pushDisclosed(disclosedSources, project.source);
    }
    if (project.id !== undefined && project.primaryHead !== undefined) {
      sourceRevisionSelectors.push({ source: `project:${project.id}`, revision: project.primaryHead });
    }
    for (const worktree of project.worktrees ?? []) {
      sourceRevisionSelectors.push({ source: `worktree:${worktree.path}`, revision: worktree.head });
    }
  }

  for (const carrier of projection?.carriers ?? []) {
    lines.push(`carrier ${carrier.id}: ${carrier.state}${carrier.runId !== undefined ? ` (run ${carrier.runId})` : ""}`);
    if (carrier.runId !== undefined) {
      sourceRevisionSelectors.push({ source: `carrier:${carrier.id}`, revision: carrier.runId });
    }
  }

  for (const worker of projection?.workers ?? []) {
    lines.push(
      `worker ${worker.id} [${worker.availability}] ${worker.provider}/${worker.model}`
      + `${worker.reasoningEffort === undefined ? "" : ` reasoning=${worker.reasoningEffort}`}`
      + ` labels=${worker.labels.join(",")}: ${worker.description}`,
    );
  }

  for (const contribution of projection?.contributions ?? []) {
    lines.push(
      `contribution ${contribution.batchId}/${contribution.key}`
      + ` worker=${contribution.workerId} effect=${contribution.effectKind} state=${contribution.state}`
      + `${contribution.status === undefined ? "" : ` status=${contribution.status}`}`,
    );
  }

  return `## 2. Current compact projection\n\n${lines.length === 0 ? "none" : lines.join("\n")}`;
}

/**
 * The explicit completeness standing of the conversation-attributed Task
 * card set, rendered inside section 2 so a bounded or partial disclosure is
 * always visible and never readable as proof that a Task does not exist.
 */
function renderTaskCardStanding(standing: TaskCardCollectionStanding): string {
  const parts: string[] = [`state=${standing.state}`];
  if (standing.reason !== undefined) parts.push(`reason=${standing.reason}`);
  if (standing.cap !== undefined) parts.push(`cap=${standing.cap}`);
  if (standing.disclosed !== undefined) parts.push(`disclosed=${standing.disclosed}`);
  if (standing.known !== undefined) parts.push(`known=${standing.known}`);
  if (standing.omitted !== undefined) parts.push(`omitted=${standing.omitted}`);
  return `task card standing: ${parts.join(" ")}`;
}

function renderMessage(message: PrincipalMessage): string {
  const lineage = message.lineage;
  const lines: string[] = [
    `message ${lineage.messageId} (turn ${lineage.turnId})`,
    message.text,
  ];
  if (lineage.priorMessageRefs !== undefined && lineage.priorMessageRefs.length > 0) {
    lines.push(`prior messages: ${lineage.priorMessageRefs.join(", ")}`);
  }
  if (lineage.correctionId !== undefined) {
    lines.push(`answers correction: ${lineage.correctionId}`);
  }
  return `## 3. Current Principal message\n\n${lines.join("\n")}`;
}

function renderPolicy(policy: ConversationPolicy): string {
  const lines: string[] = [
    `requested coordinator: ${policy.provider} / ${policy.model}, thinking ${policy.thinking}, reasoning effort ${policy.reasoningEffort}`,
    `disclosure envelope: ${policy.disclosureEnvelope}`,
  ];
  if (policy.tools !== undefined && policy.tools.length > 0) {
    for (const tool of policy.tools) {
      lines.push(
        typeof tool === "string"
          ? `tool: ${tool}`
          : `tool ${tool.name} [${tool.availability}]: ${tool.meaning}`,
      );
    }
  }
  if (policy.abstention !== undefined) {
    lines.push(`abstention: ${policy.abstention}`);
  }
  if (policy.workspace !== undefined) {
    lines.push(`workspace: ${policy.workspace}`);
  }
  if (policy.budget !== undefined) {
    lines.push(`budget: ${policy.budget}`);
  }
  if (policy.withheldEffects !== undefined && policy.withheldEffects.length > 0) {
    lines.push(`withheld effects: ${policy.withheldEffects.join(", ")}`);
  }
  return `## 4. Current execution policy\n\n${lines.join("\n")}`;
}

function renderOrientation(orientation: ProjectOrientation | undefined, disclosedSources: DisclosedSource[]): string {
  const lines: string[] = [];
  if (orientation === undefined || orientation.sources.length === 0) {
    return `## 5. Project orientation and skills\n\nnone`;
  }
  lines.push(`basis: ${orientation.basis}`);
  if (orientation.projectId !== undefined) {
    lines.push(`project: ${orientation.projectId}`);
  }
  for (const source of orientation.sources) {
    const label = source.kind === "skill" ? "skill" : source.kind;
    lines.push(`${label}: ${source.ref} (digest ${source.digest})`);
    if (source.content !== undefined) {
      lines.push(`  ${source.content}`);
    }
    pushDisclosed(disclosedSources, { ref: source.ref, digest: source.digest });
  }
  return `## 5. Project orientation and skills\n\n${lines.join("\n")}`;
}

/**
 * Section 6 holds every child result the turn may read: the bounded settled
 * summaries plus, when an exact keyed result-read was serviced, the full
 * bounded semantic projections. Both stay inside this one section so the
 * prompt keeps its exactly six fixed-order sections; full evidence is never a
 * seventh section.
 */
function renderChildResults(children: ChildSummary[], fullChildResults: FullChildResult[]): string {
  const lines: string[] = [];
  for (const child of children) {
    lines.push(`child ${child.id} (${child.contribution}): ${child.conclusion}`);
    if (child.sourceScope !== undefined) {
      lines.push(`  source scope: ${child.sourceScope}`);
    }
    if (child.admissibleClaims !== undefined && child.admissibleClaims.length > 0) {
      lines.push(`  admissible claims: ${child.admissibleClaims.join(", ")}`);
    }
    if (child.uncertainty !== undefined) {
      lines.push(`  uncertainty: ${child.uncertainty}`);
    }
    if (child.evidenceRefs !== undefined && child.evidenceRefs.length > 0) {
      const locators = child.evidenceRefs.map((ref) => JSON.stringify(ref));
      lines.push(`  evidence: read on demand via keyed result-read: ${locators.join(", ")}`);
    }
  }
  for (const result of fullChildResults) {
    lines.push(
      `full child result ${result.batchId}/${result.key} (cell ${result.cellId}, status ${result.status}, projection ${result.projection})`,
    );
    if (result.semantic !== undefined) {
      lines.push(`  final text: ${result.semantic.finalText}`);
      if (result.semantic.output !== undefined) {
        lines.push(`  structured output: ${JSON.stringify(result.semantic.output)}`);
      }
      if (result.semantic.artifacts !== undefined && result.semantic.artifacts.length > 0) {
        lines.push(`  artifacts: ${JSON.stringify(result.semantic.artifacts)}`);
      }
      if (result.semantic.verification !== undefined) {
        lines.push(`  verification: ${JSON.stringify(result.semantic.verification)}`);
      }
    }
    if (result.omission !== undefined) {
      lines.push(`  omitted (${result.omission.reason}, max ${result.omission.maxBytes} bytes): do not guess the content`);
    }
  }
  return `## 6. Child result summaries\n\n${lines.length === 0 ? "none" : lines.join("\n")}`;
}

function pushDisclosed(disclosedSources: DisclosedSource[], source: DisclosedSource): void {
  if (!disclosedSources.some((retained) => retained.ref === source.ref && retained.digest === source.digest)) {
    disclosedSources.push(source);
  }
}
