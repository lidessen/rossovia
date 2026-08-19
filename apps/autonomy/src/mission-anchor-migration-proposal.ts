import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { link, mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { stableStringify } from "./canonical-json";
import { FileMissionTimeline } from "./delegate-timeline";
import {
  ActiveIntentAnchorSchema,
} from "./mission-reconciliation";
import {
  missionRunnerDirectory,
  readMissionRunnerStatus,
  type MissionRunnerStatus,
} from "./mission-runner";
import { projectMissionIntentLineage } from "./mission-timeline-state";

export const MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION =
  "rosso.mission-anchor-migration-proposal.v1" as const;
export const MISSION_ANCHOR_MIGRATION_DECISION_VERSION =
  "rosso.mission-anchor-migration-decision.v1" as const;
export const MISSION_ANCHOR_MIGRATION_RETIREMENT_VERSION =
  "rosso.mission-anchor-migration-retirement.v1" as const;
export const MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION =
  "rosso.mission-anchor-migration-invalidation.v1" as const;
export const MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION =
  "rosso.mission-anchor-migration-attempt.v1" as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const GitObjectIdSchema = z.string().regex(/^[a-f0-9]{40,64}$/);
const MissionIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

const DecisionOptionSchema = z.object({
  immediateResult: z.string().min(1),
  tradeoff: z.string().min(1),
}).strict();

/**
 * A local, read-only decision object for one legacy Mission migration.
 * It deliberately cannot be parsed as MissionAnchorAdoption: authorityRef is
 * absent and every mutation-bearing authority remains withheld.
 */
export const MissionAnchorMigrationProposalSchema = z.object({
  version: z.literal(MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION),
  proposalId: MissionIdSchema,
  missionId: MissionIdSchema,
  preparedAt: z.string().min(1),
  preparedBy: z.literal("supervisor:Codex"),
  missionSource: z.object({
    projectId: z.string().min(1),
    relativePath: z.string().min(1),
    gitHead: GitObjectIdSchema,
  }).strict(),
  target: z.object({
    runnerId: z.string().min(1),
    pid: z.number().int().positive(),
    startedAt: z.string().min(1),
    socketPath: z.string().min(1),
    state: z.enum(["input-pending", "anchor-pending"]),
    live: z.literal(true),
    protocolCapability: z.enum([
      "atomic-adopt-retire-v1",
      "legacy-response-verified-shutdown-v1",
    ]),
  }).strict(),
  retainedHistory: z.object({
    eventCount: z.number().int().positive(),
    timelineDigest: Sha256Schema,
  }).strict(),
  proposedAdoption: z.object({
    adoptionId: MissionIdSchema,
    semanticSourceRef: z.string().min(1),
    anchor: ActiveIntentAnchorSchema,
  }).strict(),
  executionSequence: z.union([
    z.tuple([
      z.literal("append-anchor-and-retire-exact-carrier"),
      z.literal("start-no-runtime-carrier"),
    ]),
    z.tuple([
      z.literal("request-unguarded-shutdown"),
      z.literal("verify-exact-shutdown-response"),
      z.literal("wait-exact-socket-release"),
      z.literal("start-no-runtime-carrier"),
      z.literal("append-exact-legacy-anchor"),
    ]),
  ]),
  residualRisk: z.union([
    z.object({
      kind: z.literal("none"),
      consequence: z.literal("none"),
      reopenOn: z.literal("target-source-or-history-drift"),
    }).strict(),
    z.object({
      kind: z.literal("post-effect-carrier-identity-verification"),
      consequence: z.literal("reversible-carrier-stop"),
      reopenOn: z.enum([
        "missing-or-mismatched-shutdown-response-or-identity-drift",
        "attempt-response-socket-target-or-history-uncertainty",
      ]),
    }).strict(),
  ]),
  decision: z.object({
    recommendation: z.literal("ADOPT"),
    replyKey: z.literal("ADOPT|HOLD"),
    options: z.object({
      ADOPT: DecisionOptionSchema,
      HOLD: DecisionOptionSchema,
    }).strict(),
  }).strict(),
  authorityBoundary: z.object({
    standing: z.literal("proposal-only"),
    carrierReplacement: z.literal("withheld"),
    adoption: z.literal("withheld"),
    reconciliation: z.literal("withheld"),
    externalDisclosure: z.literal("none"),
    candidateWrite: z.literal("withheld"),
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
    productAcceptance: z.literal("withheld"),
  }).strict(),
}).strict().superRefine((proposal, context) => {
  if (proposal.proposedAdoption.anchor.reconciledWatermark !== 0) {
    context.addIssue({
      code: "custom",
      path: ["proposedAdoption", "anchor", "reconciledWatermark"],
      message: "a legacy anchor candidate must start at watermark 0",
    });
  }
  const atomic = proposal.target.protocolCapability === "atomic-adopt-retire-v1";
  const expectedFirstStep = atomic
    ? "append-anchor-and-retire-exact-carrier"
    : "request-unguarded-shutdown";
  if (proposal.executionSequence[0] !== expectedFirstStep) {
    context.addIssue({
      code: "custom",
      path: ["executionSequence"],
      message: atomic
        ? "a live legacy carrier must atomically adopt and retire before replacement"
        : "a pre-upgrade carrier requires response-verified shutdown before replacement and adoption",
    });
  }
  const expectedRisk = atomic
    ? "none"
    : "post-effect-carrier-identity-verification";
  if (proposal.residualRisk.kind !== expectedRisk) {
    context.addIssue({
      code: "custom",
      path: ["residualRisk"],
      message: atomic
        ? "atomic migration must not claim the compatibility saga's residual risk"
        : "legacy shutdown compatibility must disclose post-effect carrier identity verification",
    });
  }
});

export const MissionAnchorMigrationDecisionSchema = z.object({
  version: z.literal(MISSION_ANCHOR_MIGRATION_DECISION_VERSION),
  decisionId: MissionIdSchema,
  proposalId: MissionIdSchema,
  proposalDigest: Sha256Schema,
  missionId: MissionIdSchema,
  missionSource: z.object({
    projectId: z.string().min(1),
    relativePath: z.string().min(1),
    gitHead: GitObjectIdSchema,
  }).strict(),
  choice: z.literal("ADOPT"),
  authorityRef: z.string().min(1),
  sourceRef: z.string().min(1),
  decidedAt: z.string().min(1),
}).strict();

export const MissionAnchorMigrationRetirementSchema = z.object({
  version: z.literal(MISSION_ANCHOR_MIGRATION_RETIREMENT_VERSION),
  missionId: MissionIdSchema,
  proposalId: MissionIdSchema,
  proposalDigest: Sha256Schema,
  decisionDigest: Sha256Schema,
  attemptDigest: Sha256Schema,
  protocolCapability: z.literal("legacy-response-verified-shutdown-v1"),
  target: z.object({
    runnerId: z.string().min(1),
    pid: z.number().int().positive(),
    startedAt: z.string().min(1),
    socketPath: z.string().min(1),
    state: z.enum(["input-pending", "anchor-pending"]),
  }).strict(),
  standing: z.literal("exact-stopped-status-and-socket-release-observed"),
}).strict();

export const MissionAnchorMigrationInvalidationSchema = z.object({
  version: z.literal(MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION),
  missionId: MissionIdSchema,
  proposalId: MissionIdSchema,
  proposalDigest: Sha256Schema,
  decisionDigest: Sha256Schema,
  code: z.enum([
    "target-or-protocol-uncertain",
    "shutdown-response-uncertain",
    "socket-release-uncertain",
    "timeline-drift",
    "replacement-uncertain",
    "adoption-outcome-uncertain",
  ]),
  detailDigest: Sha256Schema,
  recordedAt: z.string().min(1),
  standing: z.literal("requires-new-proposal-and-adopt"),
}).strict();

export const MissionAnchorMigrationAttemptSchema = z.object({
  version: z.literal(MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION),
  missionId: MissionIdSchema,
  proposalId: MissionIdSchema,
  proposalDigest: Sha256Schema,
  decisionDigest: Sha256Schema,
  protocolCapability: z.literal("legacy-response-verified-shutdown-v1"),
  target: z.object({
    runnerId: z.string().min(1),
    pid: z.number().int().positive(),
    startedAt: z.string().min(1),
    socketPath: z.string().min(1),
    state: z.enum(["input-pending", "anchor-pending"]),
  }).strict(),
  standing: z.literal("one-use-shutdown-attempt-started"),
}).strict();

export type MissionAnchorMigrationProposal = z.infer<
  typeof MissionAnchorMigrationProposalSchema
>;
export type MissionAnchorMigrationDecision = z.infer<
  typeof MissionAnchorMigrationDecisionSchema
>;
export type MissionAnchorMigrationRetirement = z.infer<
  typeof MissionAnchorMigrationRetirementSchema
>;
export type MissionAnchorMigrationInvalidation = z.infer<
  typeof MissionAnchorMigrationInvalidationSchema
>;
export type MissionAnchorMigrationAttempt = z.infer<
  typeof MissionAnchorMigrationAttemptSchema
>;

export type MissionAnchorMigrationProposalProjection =
  | {
    readonly standing: "awaiting-principal-decision";
    readonly proposalDigest: string;
    readonly proposal: MissionAnchorMigrationProposal;
  }
  | {
    readonly standing: "stale";
    readonly proposalId: string;
    readonly proposalDigest: string;
    readonly reason: string;
  }
  | null;

export function missionAnchorMigrationProposalPath(
  home: string,
  missionId: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "anchor-migration-proposal.json",
  );
}

export function missionAnchorMigrationProposalDigest(
  proposal: MissionAnchorMigrationProposal,
): string {
  return createHash("sha256")
    .update(stableStringify(MissionAnchorMigrationProposalSchema.parse(proposal)))
    .digest("hex");
}

export function missionAnchorMigrationDecisionDigest(
  decision: MissionAnchorMigrationDecision,
): string {
  return createHash("sha256")
    .update(stableStringify(MissionAnchorMigrationDecisionSchema.parse(decision)))
    .digest("hex");
}

export function missionAnchorMigrationAttemptDigest(
  attempt: MissionAnchorMigrationAttempt,
): string {
  return createHash("sha256")
    .update(stableStringify(MissionAnchorMigrationAttemptSchema.parse(attempt)))
    .digest("hex");
}

export async function retainMissionAnchorMigrationDecision(
  home: string,
  decision: MissionAnchorMigrationDecision,
): Promise<{
  readonly path: string;
  readonly decisionDigest: string;
}> {
  const parsed = MissionAnchorMigrationDecisionSchema.parse(decision);
  const decisionDigest = missionAnchorMigrationDecisionDigest(parsed);
  const path = join(
    missionRunnerDirectory(home, parsed.missionId),
    "anchor-migration-decisions",
    `${decisionDigest}.json`,
  );
  const proposalDecisionPath = join(
    missionRunnerDirectory(home, parsed.missionId),
    "anchor-migration-decisions",
    "by-proposal",
    `${parsed.proposalDigest}.json`,
  );
  await retainImmutableJson(
    proposalDecisionPath,
    parsed,
    (input) => MissionAnchorMigrationDecisionSchema.parse(input),
    `anchor migration proposal ${parsed.proposalDigest} already has a different decision`,
  );
  await retainImmutableJson(
    path,
    parsed,
    (input) => MissionAnchorMigrationDecisionSchema.parse(input),
    `anchor migration decision receipt ${decisionDigest} conflicts with retained evidence`,
  );
  return { path, decisionDigest };
}

export async function retainMissionAnchorMigrationRetirement(
  home: string,
  receipt: MissionAnchorMigrationRetirement,
): Promise<{ readonly path: string }> {
  const parsed = MissionAnchorMigrationRetirementSchema.parse(receipt);
  const path = join(
    missionRunnerDirectory(home, parsed.missionId),
    "anchor-migration-retirements",
    `${parsed.proposalDigest}.json`,
  );
  await retainImmutableJson(
    path,
    parsed,
    (input) => MissionAnchorMigrationRetirementSchema.parse(input),
    `anchor migration retirement ${parsed.proposalDigest} conflicts with retained evidence`,
  );
  return { path };
}

export async function readMissionAnchorMigrationRetirement(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<MissionAnchorMigrationRetirement | undefined> {
  const path = join(
    missionRunnerDirectory(home, missionId),
    "anchor-migration-retirements",
    `${Sha256Schema.parse(proposalDigest)}.json`,
  );
  try {
    const receipt = MissionAnchorMigrationRetirementSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
    if (receipt.missionId !== missionId) {
      throw new Error(
        `anchor migration retirement belongs to ${receipt.missionId}, not ${missionId}`,
      );
    }
    return receipt;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

export async function retainMissionAnchorMigrationInvalidation(
  home: string,
  invalidation: MissionAnchorMigrationInvalidation,
): Promise<{ readonly path: string }> {
  const parsed = MissionAnchorMigrationInvalidationSchema.parse(invalidation);
  const path = missionAnchorMigrationInvalidationPath(
    home,
    parsed.missionId,
    parsed.proposalDigest,
  );
  try {
    await retainImmutableJson(
      path,
      parsed,
      (input) => MissionAnchorMigrationInvalidationSchema.parse(input),
      `anchor migration invalidation ${parsed.proposalDigest} conflicts with retained evidence`,
    );
  } catch (error) {
    const retained = await readMissionAnchorMigrationInvalidation(
      home,
      parsed.missionId,
      parsed.proposalDigest,
    );
    if (retained === undefined) throw error;
  }
  return { path };
}

export async function retainMissionAnchorMigrationAttempt(
  home: string,
  attempt: MissionAnchorMigrationAttempt,
): Promise<{ readonly path: string; readonly created: boolean }> {
  const parsed = MissionAnchorMigrationAttemptSchema.parse(attempt);
  const path = missionAnchorMigrationAttemptPath(
    home,
    parsed.missionId,
    parsed.proposalDigest,
  );
  const created = await retainImmutableJson(
    path,
    parsed,
    (input) => MissionAnchorMigrationAttemptSchema.parse(input),
    `anchor migration attempt ${parsed.proposalDigest} conflicts with retained evidence`,
  );
  return { path, created };
}

export async function readMissionAnchorMigrationAttempt(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<MissionAnchorMigrationAttempt | undefined> {
  const path = missionAnchorMigrationAttemptPath(
    home,
    missionId,
    proposalDigest,
  );
  try {
    const attempt = MissionAnchorMigrationAttemptSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
    if (attempt.missionId !== missionId) {
      throw new Error(
        `anchor migration attempt belongs to ${attempt.missionId}, not ${missionId}`,
      );
    }
    return attempt;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function missionAnchorMigrationAttemptPath(
  home: string,
  missionId: string,
  proposalDigest: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "anchor-migration-attempts",
    `${Sha256Schema.parse(proposalDigest)}.json`,
  );
}

export async function readMissionAnchorMigrationInvalidation(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<MissionAnchorMigrationInvalidation | undefined> {
  const path = missionAnchorMigrationInvalidationPath(
    home,
    missionId,
    proposalDigest,
  );
  try {
    const invalidation = MissionAnchorMigrationInvalidationSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
    if (invalidation.missionId !== missionId) {
      throw new Error(
        `anchor migration invalidation belongs to ${invalidation.missionId}, not ${missionId}`,
      );
    }
    return invalidation;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function missionAnchorMigrationInvalidationPath(
  home: string,
  missionId: string,
  proposalDigest: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "anchor-migration-invalidations",
    `${Sha256Schema.parse(proposalDigest)}.json`,
  );
}

async function retainImmutableJson<T>(
  path: string,
  value: T,
  parse: (input: unknown) => T,
  conflictMessage: string,
): Promise<boolean> {
  try {
    const retained = parse(JSON.parse(await readFile(path, "utf8")));
    if (stableStringify(retained) !== stableStringify(value)) {
      throw new Error(conflictMessage);
    }
    return false;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  let created = false;
  try {
    await link(temporary, path);
    const directory = await open(dirname(path), "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    created = true;
  } catch (error) {
    if (
      error === null
      || typeof error !== "object"
      || !("code" in error)
      || error.code !== "EEXIST"
    ) throw error;
    const retained = parse(JSON.parse(await readFile(path, "utf8")));
    if (stableStringify(retained) !== stableStringify(value)) {
      throw new Error(conflictMessage);
    }
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
  return created;
}

export async function readMissionAnchorMigrationProposal(
  home: string,
  missionId: string,
): Promise<MissionAnchorMigrationProposal> {
  const proposal = MissionAnchorMigrationProposalSchema.parse(
    JSON.parse(await readFile(
      missionAnchorMigrationProposalPath(home, missionId),
      "utf8",
    )),
  );
  if (proposal.missionId !== missionId) {
    throw new Error(
      `anchor migration proposal belongs to Mission ${proposal.missionId}, not ${missionId}`,
    );
  }
  return proposal;
}

export function verifyMissionAnchorMigrationSource(
  proposal: MissionAnchorMigrationProposal,
  sourceRoot: string,
): void {
  const rootResult = spawnSync("git", ["-C", sourceRoot, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  if (rootResult.status !== 0) {
    throw new Error(
      rootResult.stderr.trim() || "anchor migration Mission source is not a Git repository",
    );
  }
  const root = rootResult.stdout.trim();
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head !== proposal.missionSource.gitHead) {
    throw new Error(
      `anchor migration Mission source HEAD drifted from ${proposal.missionSource.gitHead} to ${head}`,
    );
  }
  const tracked = spawnSync(
    "git",
    ["-C", root, "cat-file", "-e", `HEAD:${proposal.missionSource.relativePath}`],
    { encoding: "utf8" },
  );
  if (tracked.status !== 0) {
    throw new Error(
      `anchor migration Mission source is not committed at ${proposal.missionSource.relativePath}`,
    );
  }
  const clean = spawnSync(
    "git",
    ["-C", root, "diff", "--quiet", "HEAD", "--", proposal.missionSource.relativePath],
    { encoding: "utf8" },
  );
  if (clean.status !== 0) {
    throw new Error(
      `anchor migration Mission source differs from committed HEAD at ${proposal.missionSource.relativePath}`,
    );
  }
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export async function retainMissionAnchorMigrationProposal(
  home: string,
  missionId: string,
  unparsedProposal: unknown,
  observedTarget?: {
    readonly status: MissionRunnerStatus;
    readonly live: boolean;
  },
  options: {
    readonly expectedPreviousProposalDigest?: string;
  } = {},
): Promise<{
  readonly path: string;
  readonly proposalDigest: string;
  readonly proposal: MissionAnchorMigrationProposal;
}> {
  const proposal = MissionAnchorMigrationProposalSchema.parse(unparsedProposal);
  if (proposal.missionId !== missionId) {
    throw new Error(
      `anchor migration proposal belongs to Mission ${proposal.missionId}, not ${missionId}`,
    );
  }
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const events = await timeline.readEvents(missionId);
  const lineage = projectMissionIntentLineage(events, missionId);
  if (lineage.standing !== "legacy-unanchored") {
    throw new Error(
      `Mission ${missionId} is ${lineage.standing}; only legacy-unanchored history can receive a migration proposal`,
    );
  }
  if (
    proposal.retainedHistory.eventCount !== lineage.priorEventCount
    || proposal.retainedHistory.timelineDigest !== lineage.priorTimelineDigest
  ) {
    throw new Error(`anchor migration proposal does not bind the exact Mission history`);
  }
  const status = observedTarget?.status
    ?? await readMissionRunnerStatus(home, missionId);
  if (status === undefined) {
    throw new Error(`Mission ${missionId} has no observed runner target`);
  }
  if (
    status.runnerId !== proposal.target.runnerId
    || status.pid !== proposal.target.pid
    || status.startedAt !== proposal.target.startedAt
    || status.socketPath !== proposal.target.socketPath
    || status.state !== proposal.target.state
    || (observedTarget !== undefined && observedTarget.live !== proposal.target.live)
  ) {
    throw new Error(
      `anchor migration proposal target drifted: expected ${proposal.target.runnerId}/${proposal.target.state}/live=${proposal.target.live}, observed ${status.runnerId}/${status.state}/live=${observedTarget?.live ?? "unknown"}`,
    );
  }
  const observedCapability = status.runtimeMode === undefined
    ? "legacy-response-verified-shutdown-v1"
    : "atomic-adopt-retire-v1";
  if (observedCapability !== proposal.target.protocolCapability) {
    throw new Error(
      `anchor migration proposal protocol drifted: expected ${proposal.target.protocolCapability}, observed ${observedCapability}`,
    );
  }

  const path = missionAnchorMigrationProposalPath(home, missionId);
  const proposalDigest = missionAnchorMigrationProposalDigest(proposal);
  let retainedRaw: unknown;
  try {
    retainedRaw = JSON.parse(await readFile(path, "utf8"));
    let retained: MissionAnchorMigrationProposal;
    try {
      retained = MissionAnchorMigrationProposalSchema.parse(retainedRaw);
    } catch {
      const retainedDigest = createHash("sha256")
        .update(stableStringify(retainedRaw))
        .digest("hex");
      if (options.expectedPreviousProposalDigest !== retainedDigest) {
        throw new Error(
          `Mission ${missionId} retains an incompatible anchor migration proposal; exact prior digest required`,
        );
      }
      await writeProposalAtomically(path, proposal);
      return { path, proposalDigest, proposal };
    }
    const retainedDigest = missionAnchorMigrationProposalDigest(retained);
    if (retainedDigest !== proposalDigest) {
      if (options.expectedPreviousProposalDigest !== retainedDigest) {
        throw new Error(
          `Mission ${missionId} already retains a different anchor migration proposal`,
        );
      }
      await writeProposalAtomically(path, proposal);
      return { path, proposalDigest, proposal };
    }
    return { path, proposalDigest, proposal: retained };
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  await writeProposalAtomically(path, proposal);
  return { path, proposalDigest, proposal };
}

async function writeProposalAtomically(
  path: string,
  proposal: MissionAnchorMigrationProposal,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(proposal, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await rename(temporary, path);
}

export async function projectMissionAnchorMigrationProposal(
  home: string,
  missionId: string,
  lineage: ReturnType<typeof projectMissionIntentLineage>,
): Promise<MissionAnchorMigrationProposalProjection> {
  const path = missionAnchorMigrationProposalPath(home, missionId);
  let proposal: MissionAnchorMigrationProposal;
  try {
    proposal = MissionAnchorMigrationProposalSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  const proposalDigest = missionAnchorMigrationProposalDigest(proposal);
  const invalidation = await readMissionAnchorMigrationInvalidation(
    home,
    missionId,
    proposalDigest,
  );
  if (invalidation !== undefined) {
    return stale(
      proposal,
      proposalDigest,
      `proposal attempt was invalidated: ${invalidation.code}`,
    );
  }
  if (proposal.missionId !== missionId) {
    return stale(proposal, proposalDigest, "proposal Mission binding no longer matches");
  }
  if (lineage.standing !== "legacy-unanchored") {
    return stale(proposal, proposalDigest, `intent lineage is now ${lineage.standing}`);
  }
  if (
    proposal.retainedHistory.eventCount !== lineage.priorEventCount
    || proposal.retainedHistory.timelineDigest !== lineage.priorTimelineDigest
  ) {
    return stale(proposal, proposalDigest, "the complete Mission timeline changed");
  }
  const status = await readMissionRunnerStatus(home, missionId);
  if (status === undefined) {
    return stale(proposal, proposalDigest, "the exact runner target is unavailable");
  }
  if (
    status.runnerId !== proposal.target.runnerId
    || status.pid !== proposal.target.pid
    || status.startedAt !== proposal.target.startedAt
    || status.socketPath !== proposal.target.socketPath
    || status.state !== proposal.target.state
  ) {
    return stale(proposal, proposalDigest, "the exact runner target changed");
  }
  const observedCapability = status.runtimeMode === undefined
    ? "legacy-response-verified-shutdown-v1"
    : "atomic-adopt-retire-v1";
  if (observedCapability !== proposal.target.protocolCapability) {
    return stale(proposal, proposalDigest, "the runner migration protocol changed");
  }
  return {
    standing: "awaiting-principal-decision",
    proposalDigest,
    proposal,
  };
}

function stale(
  proposal: MissionAnchorMigrationProposal,
  proposalDigest: string,
  reason: string,
): Exclude<MissionAnchorMigrationProposalProjection, null> {
  return {
    standing: "stale",
    proposalId: proposal.proposalId,
    proposalDigest,
    reason,
  };
}

function isMissing(error: unknown): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && error.code === "ENOENT";
}
