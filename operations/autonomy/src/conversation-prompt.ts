import { createHash } from "node:crypto";
import { z } from "zod";

export const CONVERSATION_PROMPT_REVISION = "rosso.conversation-prompt.v1" as const;

const BOUNDED_ORIENTATION_CONTENT_LIMIT = 4096;
const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const GitObjectSchema = z.string().regex(/^[a-f0-9]{40}$/);

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
  source: DisclosedSourceSchema.optional(),
  summary: z.string().min(1).max(800),
  status: z.enum(["open", "settled", "accepted"]).optional(),
  corrections: z.array(CorrectionProjectionSchema).optional(),
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
}).strict();
export type CarrierActivityProjection = z.infer<typeof CarrierActivityProjectionSchema>;

export const CompactProjectionSchema = z.object({
  task: TaskProjectionSchema.optional(),
  projects: z.array(ProjectProjectionSchema).optional(),
  carriers: z.array(CarrierActivityProjectionSchema).optional(),
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

export const ConversationPolicySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  thinking: z.enum(["enabled", "disabled"]),
  reasoningEffort: z.string().min(1),
  disclosureEnvelope: z.string().min(1).max(1000),
  tools: z.array(z.string().min(1)).optional(),
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

export const ConversationPromptInputSchema = z.object({
  projection: CompactProjectionSchema.optional(),
  message: PrincipalMessageSchema,
  policy: ConversationPolicySchema,
  orientation: ProjectOrientationSchema.optional(),
  children: z.array(ChildSummarySchema).optional(),
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

  sections.push(renderRelationKernel());
  if (parsed.projection !== undefined) {
    sections.push(renderProjection(parsed.projection, disclosedSources, sourceRevisionSelectors));
  }
  sections.push(renderMessage(parsed.message));
  sections.push(renderPolicy(parsed.policy));
  if (parsed.orientation !== undefined) {
    sections.push(renderOrientation(parsed.orientation, disclosedSources));
  }
  if (parsed.children !== undefined && parsed.children.length > 0) {
    sections.push(renderChildren(parsed.children));
  }

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
  projection: CompactProjection,
  disclosedSources: DisclosedSource[],
  sourceRevisionSelectors: SourceRevisionSelector[],
): string {
  const lines: string[] = [];

  if (projection.task !== undefined) {
    const task = projection.task;
    lines.push(`task ${task.id} [${task.status ?? "open"}]: ${task.summary}`);
    if (task.source !== undefined) {
      lines.push(`  source ${task.source.ref} @ ${task.sourceRevision} (digest ${task.source.digest})`);
      pushDisclosed(disclosedSources, task.source);
    } else {
      lines.push(`  source revision: ${task.sourceRevision}`);
    }
    if (task.corrections !== undefined && task.corrections.length > 0) {
      lines.push(`  corrections: ${task.corrections.map((c) => `${c.id}: ${c.summary}`).join(" | ")}`);
    }
    sourceRevisionSelectors.push({ source: `task:${task.id}`, revision: task.sourceRevision });
  }

  for (const project of projection.projects ?? []) {
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

  for (const carrier of projection.carriers ?? []) {
    lines.push(`carrier ${carrier.id}: ${carrier.state}${carrier.runId !== undefined ? ` (run ${carrier.runId})` : ""}`);
    if (carrier.runId !== undefined) {
      sourceRevisionSelectors.push({ source: `carrier:${carrier.id}`, revision: carrier.runId });
    }
  }

  return `## 2. Current compact projection\n\n${lines.join("\n")}`;
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
    lines.push(`tools: ${policy.tools.join(", ")}`);
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

function renderOrientation(orientation: ProjectOrientation, disclosedSources: DisclosedSource[]): string {
  const lines: string[] = [
    `basis: ${orientation.basis}`,
  ];
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

function renderChildren(children: ChildSummary[]): string {
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
  return `## 6. Child result summaries\n\n${lines.join("\n")}`;
}

function pushDisclosed(disclosedSources: DisclosedSource[], source: DisclosedSource): void {
  if (!disclosedSources.some((retained) => retained.ref === source.ref && retained.digest === source.digest)) {
    disclosedSources.push(source);
  }
}
