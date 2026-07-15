import { readFile, realpath, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { type CellRunRecord } from "../../contracts";
import type { CellDriver } from "../../driver";
import { SequenceCellInputSchema, type SequenceCellInput } from "../sequence/genome";
import { runSequenceCell, type SequenceSelector } from "../sequence/runtime";

export const DELIBERATION_VERSION = "work-cell.deliberation.v1" as const;

export const DeliberationPositionSchema = z.object({
  stance: z.enum(["support", "oppose", "reserve", "discover"]),
  decisionDelta: z.string().min(1),
  strongestCounterargument: z.string().min(1),
  unchangedAlternative: z.string().min(1),
});
const DeliberationPositionOutputSchema = z.toJSONSchema(DeliberationPositionSchema);

export type DeliberationPosition = z.infer<typeof DeliberationPositionSchema>;

export const BudgetEnvelopeSchema = z.object({
  id: z.string().min(1),
  version: z.literal("budget-envelope.v1"),
  maxTotalTokens: z.number().int().positive(),
  onExhaustion: z.literal("partial").default("partial"),
}).strict();

const DeliberationBudgetSchema = z.object({
  envelope: BudgetEnvelopeSchema,
  source: z.string().min(1),
  plannedTotalTokens: z.number().int().positive().optional(),
  recovery: z.object({ maxAttemptsPerMember: z.literal(2) }).optional(),
});

const DeliberationMemberSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  input: SequenceCellInputSchema,
});

export const DeliberationManifestSchema = z.object({
  version: z.literal(DELIBERATION_VERSION),
  id: z.string().min(1),
  question: z.string().min(1),
  sources: z.array(z.string().min(1)).min(1),
  options: z.array(z.object({ id: z.string().min(1), summary: z.string().min(1) })).min(2).max(4),
  budget: DeliberationBudgetSchema,
  sequenceCoverage: z.array(z.object({
    pid: z.string().regex(/^P\d{2,}$/, "expected a P-ID such as P04"),
    status: z.enum(["seat", "guardrail", "not_applicable"]),
    rationale: z.string().min(1),
  })).min(1),
  members: z.array(DeliberationMemberSchema).min(3).max(5),
});

export type DeliberationManifest = z.infer<typeof DeliberationManifestSchema>;

export interface DeliberationMemberRun {
  memberId: string;
  role: string;
  status: "run";
  attempt: number;
  record: CellRunRecord;
}

export interface DeliberationMemberSkipped {
  memberId: string;
  role: string;
  status: "not_run_budget_envelope";
  attempt: number;
  declaredEstimatedTokens: number;
  remainingAllocationTokens: number;
}

export type DeliberationMemberRecord = DeliberationMemberRun | DeliberationMemberSkipped;

export interface DeliberationSummary {
  kind: "projection";
  authority: "none";
  voteCounts: Record<DeliberationPosition["stance"], number>;
  memberPositions: Array<{
    memberId: string;
    role: string;
    status: CellRunRecord["status"] | "not_run_budget_envelope";
    position?: DeliberationPosition;
  }>;
  dissent: Array<{
    memberId: string;
    role: string;
    stance: DeliberationPosition["stance"];
    decisionDelta: string;
  }>;
  unsettledMembers: string[];
  budget: {
    envelopeId: string;
    authorizedSource: string;
    maxAllocatedTokens: number;
    declaredEstimatedTokens: number;
    startedEstimatedTokens: number;
    observedTokens: number;
    remainingAllocationTokens: number;
    allocationOverrunTokens: number;
    plannedTotalTokens?: number;
    overPlanTokens?: number;
  };
}

export interface DeliberationRecord {
  version: typeof DELIBERATION_VERSION;
  runId: string;
  startedAt: string;
  finishedAt: string;
  docket: Omit<DeliberationManifest, "members">;
  members: DeliberationMemberRecord[];
  summary: DeliberationSummary;
}

/**
 * Runs a bounded, read-only set of independent member Cells. It never passes
 * a member result to another member and never turns the resulting projection
 * into acceptance, a budget decision, or a merge decision.
 */
export async function runDeliberation(
  unparsedManifest: unknown,
  createDriver: () => CellDriver & SequenceSelector,
): Promise<DeliberationRecord> {
  const manifest = DeliberationManifestSchema.parse(unparsedManifest);
  await assertDeliberationBoundary(manifest);
  const runId = randomUUID();
  const startedAt = new Date();
  const members: DeliberationMemberRecord[] = [];
  let observedTokens = 0;

  const runMember = async (member: DeliberationManifest["members"][number], attempt: number): Promise<void> => {
    const estimatedTokens = tokenEstimate(member.input);
    const remainingAllocationTokens = manifest.budget.envelope.maxTotalTokens - observedTokens;
    if (remainingAllocationTokens < estimatedTokens) {
      members.push({
        memberId: member.id,
        role: member.role,
        status: "not_run_budget_envelope",
        attempt,
        declaredEstimatedTokens: estimatedTokens,
        remainingAllocationTokens,
      });
      return;
    }
    const input = SequenceCellInputSchema.parse({
      ...member.input,
      id: attempt === 1 ? member.input.id : `${member.input.id}-recovery-${attempt}`,
      outputSchema: DeliberationPositionOutputSchema,
      intent: `${member.input.intent}\n\n${renderDocket(manifest)}`,
      dna: {
        ...member.input.dna,
        baseInstructions: `${member.input.dna.baseInstructions}\n\n${renderMemberInstructions(manifest, member)}`,
      },
    });
    const record = await runSequenceCell(input, createDriver());
    observedTokens += record.usage.totalTokens;
    members.push({ memberId: member.id, role: member.role, status: "run", attempt, record });
  };

  for (const member of manifest.members) {
    await runMember(member, 1);
  }
  if (manifest.budget.recovery) {
    for (const member of manifest.members) {
      if (!hasValidPosition(members, member.id)) await runMember(member, 2);
    }
  }

  return {
    version: DELIBERATION_VERSION,
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    docket: {
      version: manifest.version,
      id: manifest.id,
      question: manifest.question,
      sources: manifest.sources,
      options: manifest.options,
      budget: manifest.budget,
      sequenceCoverage: manifest.sequenceCoverage,
    },
    members,
    summary: summarizeDeliberation(members, manifest.budget),
  };
}

/**
 * Persists a direct-manifest invocation beside its manifest without sharing a
 * fixed output name with another invocation. This is intentionally separate
 * from tally construction: raw execution evidence is the source; summaries
 * are rebuildable projections of it.
 */
export async function persistDeliberationRecord(manifestPath: string, record: DeliberationRecord): Promise<string> {
  const output = `${manifestPath.replace(/\.json$/, "")}.${record.runId}.record.json`;
  await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return output;
}

export function summarizeDeliberation(
  members: DeliberationMemberRecord[],
  budget: DeliberationManifest["budget"],
): DeliberationSummary {
  const voteCounts: DeliberationSummary["voteCounts"] = {
    support: 0,
    oppose: 0,
    reserve: 0,
    discover: 0,
  };
  const bySeat = new Map<string, DeliberationMemberRecord[]>();
  for (const member of members) {
    const attempts = bySeat.get(member.memberId) ?? [];
    attempts.push(member);
    bySeat.set(member.memberId, attempts);
  }
  const memberPositions = [...bySeat.values()].map((attempts) => {
    const member = attempts.find(
      (attempt) => attempt.status === "run" && attempt.record.status === "passed" && positionFromRecord(attempt.record),
    ) ?? attempts.at(-1)!;
    if (member.status === "not_run_budget_envelope") {
      return { memberId: member.memberId, role: member.role, status: member.status };
    }
    const position = positionFromRecord(member.record);
    if (position) voteCounts[position.stance] += 1;
    return {
      memberId: member.memberId,
      role: member.role,
      status: member.record.status,
      ...(position ? { position } : {}),
    };
  });
  const declared = memberPositions.filter((member) => "position" in member && member.position) as Array<
    (typeof memberPositions)[number] & { position: DeliberationPosition }
  >;
  const leadingStance = leadingDeclaredStance(voteCounts);

  return {
    kind: "projection",
    authority: "none",
    voteCounts,
    memberPositions,
    dissent: declared
      .filter((member) => !leadingStance || member.position.stance !== leadingStance)
      .map((member) => ({
        memberId: member.memberId,
        role: member.role,
        stance: member.position.stance,
        decisionDelta: member.position.decisionDelta,
      })),
    unsettledMembers: memberPositions
      .filter((member) => !("position" in member && member.position) || member.status !== "passed")
      .map((member) => member.memberId),
    budget: {
      envelopeId: budget.envelope.id,
      authorizedSource: budget.source,
      maxAllocatedTokens: budget.envelope.maxTotalTokens,
      declaredEstimatedTokens: members.reduce(
        (total, member) => total + (member.status === "run" ? tokenEstimate(member.record.input) : member.declaredEstimatedTokens),
        0,
      ),
      startedEstimatedTokens: members.reduce(
        (total, member) => total + (member.status === "run" ? tokenEstimate(member.record.input) : 0),
        0,
      ),
      observedTokens: members.reduce(
        (total, member) => total + (member.status === "run" ? member.record.usage.totalTokens : 0),
        0,
      ),
      remainingAllocationTokens: Math.max(
        0,
        budget.envelope.maxTotalTokens - members.reduce(
          (total, member) => total + (member.status === "run" ? member.record.usage.totalTokens : 0),
          0,
        ),
      ),
      allocationOverrunTokens: Math.max(
        0,
        members.reduce((total, member) => total + (member.status === "run" ? member.record.usage.totalTokens : 0), 0) -
          budget.envelope.maxTotalTokens,
      ),
      ...(budget.plannedTotalTokens ? {
        plannedTotalTokens: budget.plannedTotalTokens,
        overPlanTokens: Math.max(0, members.reduce((total, member) => total + (member.status === "run" ? member.record.usage.totalTokens : 0), 0) - budget.plannedTotalTokens),
      } : {}),
    },
  };
}

function leadingDeclaredStance(
  voteCounts: DeliberationSummary["voteCounts"],
): DeliberationPosition["stance"] | undefined {
  const entries = Object.entries(voteCounts) as Array<[DeliberationPosition["stance"], number]>;
  const highest = Math.max(...entries.map(([, count]) => count));
  if (highest === 0) return undefined;
  const leaders = entries.filter(([, count]) => count === highest);
  return leaders.length === 1 ? leaders[0]?.[0] : undefined;
}

async function assertDeliberationBoundary(manifest: DeliberationManifest): Promise<void> {
  const memberIds = new Set(manifest.members.map((member) => member.id));
  if (memberIds.size !== manifest.members.length) throw new Error("deliberation member IDs must be unique");
  const optionIds = new Set(manifest.options.map((option) => option.id));
  if (optionIds.size !== manifest.options.length) throw new Error("deliberation option IDs must be unique");
  const declaredEstimatedTokens = manifest.members.reduce((total, member) => total + tokenEstimate(member.input), 0);
  if (declaredEstimatedTokens > manifest.budget.envelope.maxTotalTokens) {
    throw new Error("declared member token estimates exceed the deliberation allocation envelope");
  }

  const first = manifest.members[0];
  if (!first) throw new Error("deliberation requires members");
  const sequencePath = await absoluteSequencePath(first.input);
  const sequencePids = await readSequencePids(sequencePath);
  const coveragePids = manifest.sequenceCoverage.map((entry) => entry.pid);
  if (new Set(coveragePids).size !== coveragePids.length) throw new Error("sequence coverage P-IDs must be unique");
  if (sequencePids.length !== coveragePids.length || sequencePids.some((pid) => !coveragePids.includes(pid))) {
    throw new Error("sequence coverage must account for every P-ID in the shared Sequence");
  }

  for (const member of manifest.members) {
    if (member.input.workspace.writePaths.length > 0 || member.input.workspace.allowedCommands.length > 0) {
      throw new Error(`deliberation member ${member.id} must be read-only and command-free`);
    }
    if ((await absoluteSequencePath(member.input)) !== sequencePath) {
      throw new Error("deliberation members must use the same Sequence source");
    }
  }
}

function tokenEstimate(input: SequenceCellInput | CellRunRecord["input"]): number {
  const estimated = input.budget.estimatedTokens;
  if (estimated === undefined) throw new Error(`deliberation member ${input.id} requires budget.estimatedTokens`);
  return estimated;
}

function positionFromRecord(record: CellRunRecord): DeliberationPosition | undefined {
  return DeliberationPositionSchema.safeParse(record.output).data;
}

function hasValidPosition(members: DeliberationMemberRecord[], memberId: string): boolean {
  return members.some((member) => member.memberId === memberId && member.status === "run" && member.record.status === "passed" && Boolean(positionFromRecord(member.record)));
}

function renderDocket(manifest: DeliberationManifest): string {
  return [
    "## Deliberation docket",
    `Question: ${manifest.question}`,
    `Sources:\n${manifest.sources.map((source) => `- ${source}`).join("\n")}`,
    `Options:\n${manifest.options.map((option) => `- ${option.id}: ${option.summary}`).join("\n")}`,
    `Allocation envelope: ${manifest.budget.envelope.maxTotalTokens} tokens (${manifest.budget.source})`,
    `Sequence coverage:\n${manifest.sequenceCoverage.map((entry) => `- ${entry.pid} (${entry.status}): ${entry.rationale}`).join("\n")}`,
  ].join("\n\n");
}

function renderMemberInstructions(
  manifest: DeliberationManifest,
  member: DeliberationManifest["members"][number],
): string {
  return [
    "## Independent deliberation member",
    `You are member ${member.id} in docket ${manifest.id}, serving as ${member.role}.`,
    "You do not know other members' conclusions and must not infer a consensus, accept the proposal, allocate resources, or authorize a merge.",
    "Return a position with stance (support, oppose, reserve, or discover), decisionDelta, strongestCounterargument, and unchangedAlternative.",
  ].join("\n");
}

async function absoluteSequencePath(input: SequenceCellInput): Promise<string> {
  if (!isAbsolute(input.workspace.root)) throw new Error("deliberation member workspace.root must be absolute");
  if (isAbsolute(input.genome.sequencePath)) throw new Error("deliberation sequencePath must be workspace-relative");
  const root = await realpath(input.workspace.root);
  const path = await realpath(resolve(root, input.genome.sequencePath));
  const offset = relative(root, path);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error("deliberation sequencePath escapes workspace.root");
  }
  return path;
}

async function readSequencePids(path: string): Promise<string[]> {
  const source = await readFile(path, "utf8");
  const pids = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^P\d{2,}｜/.test(line))
    .map((line) => line.slice(0, line.indexOf("｜")));
  if (pids.length === 0) throw new Error(`no Sequence P-IDs found in ${path}`);
  return pids;
}
