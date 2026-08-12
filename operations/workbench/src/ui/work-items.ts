import { realpathSync } from "node:fs";
import type { TaskAttemptProjection } from "../task-attempts";
import {
  MissionAnchorSeedSchema,
  type MissionAnchorSeed,
} from "../../../autonomy/src/mission-anchor";
import type {
  AttentionItem,
  MissionProjection,
  ProjectProjection,
  RunnerProjection,
  WorkbenchSnapshot,
} from "./projection";
import { CurrentVerifiedResultProjectionSchema } from "./projection";
import type {
  AutonomyEffectVerificationSelector,
  PrincipalTask,
  PrincipalTasks,
} from "../contracts";
import {
  WorkbenchTaskExecutionContextRefSchema,
  sameWorkbenchTaskExecutionContextRef,
  workbenchTaskCorrectionGuidanceRefs,
  workbenchTaskExecutionContextFor,
  workbenchTaskExecutionContextRef,
} from "./task-execution-context";
import {
  trustedTaskExecutionRuntimeAdapterFor,
  type TaskExecutionRuntimeAdapterId,
} from "./task-execution-runtime-adapter";

type PrincipalTaskExecutionLink = PrincipalTask["executionLinks"][number];

export type WorkItemLifecycle =
  | "open"
  | "in-progress"
  | "waiting"
  | "paused"
  | "blocked"
  | "verifying"
  | "settled"
  | "invalidated";

export type WorkItemNextActor =
  | "principal"
  | "agent"
  | "system"
  | "external"
  | "none"
  | "unknown";

/**
 * Read-only observation of one task's attempt evidence source. A task with no
 * recorded attempts projects as `available` with an empty attempts list; a
 * source that cannot be read projects as `unavailable` with the stable source
 * reference and reason so the snapshot stays observable without losing the
 * attributable read failure.
 */
export type TaskAttemptSourceObservation =
  | {
    readonly standing: "available";
    readonly sourceRef: string;
    readonly attempts: readonly TaskAttemptProjection[];
  }
  | {
    readonly standing: "unavailable";
    readonly sourceRef: string;
    readonly reason: string;
  };

export const taskAttemptsSourceRef = "state/task-attempts";

export type TaskLaunchReadinessBlockerCode =
  | "exact-context-required"
  | "mission-unavailable"
  | "execution-proposal-unavailable"
  | "fresh-authorization-required"
  | "worktree-unavailable"
  | "clean-detached-worktree-required"
  | "mission-head-mismatch"
  | "live-carrier-present"
  | "runtime-adapter-unavailable";

export interface TaskLaunchReadiness {
  readonly standing: "ready" | "preparation-required" | "not-applicable";
  readonly blockers: readonly {
    readonly code: TaskLaunchReadinessBlockerCode;
    readonly message: string;
  }[];
}

export interface WorkItemProjection {
  readonly id: string;
  readonly kind:
    | "mission"
    | "decision"
    | "agent-work"
    | "system-work"
    | "observation"
    | "principal-task"
    | "independent";
  readonly lifecycle: WorkItemLifecycle;
  readonly nextActor: WorkItemNextActor;
  readonly attention: "decision-required" | "exception" | "normal";
  readonly title: string;
  readonly summary: string;
  readonly context: string;
  readonly projectKey: string | null;
  readonly missionId: string | null;
  readonly runnerId: string | null;
  readonly binding:
    | {
      readonly kind: "project-mission";
      readonly projectKey: string;
      readonly missionId: string;
    }
    | {
      readonly kind: "project";
      readonly projectKey: string;
    }
    | {
      readonly kind: "explicit-independent";
      readonly sourceId: string;
    }
    | {
      readonly kind: "workbench-task";
      readonly sourceId: string;
      readonly projectContext:
        | {
          readonly projectKey: string;
          readonly authority: "context-only";
        }
        | null;
    }
    | {
      readonly kind: "ambiguous";
      readonly missionId: string;
      readonly reason: string;
    }
    | {
      readonly kind: "unbound";
      readonly missionId: string | null;
      readonly reason: string;
    };
  readonly worktreeContext?: {
    readonly path: string;
    readonly relation:
      | "effect-workspace"
      | "mission-observed-here"
      | "task-context"
      | "task-expected-context";
    readonly authority:
      | "execution-evidence"
      | "observation-only"
      | "unavailable";
    readonly standing?: "observed" | "unavailable";
    readonly reason?: string;
  };
  readonly evidence: {
    readonly freshness:
      | {
        readonly kind: "live";
        readonly observedAt: string;
      }
      | {
        readonly kind: "observed-at-build";
        readonly observedAt: string;
      }
      | {
        readonly kind: "cached";
        readonly sourceUpdatedAt: string;
        readonly ageMs: number | null;
      }
      | {
        readonly kind: "unverified";
        readonly observedAt: string;
        readonly reason: string;
      };
    readonly sourceRefs: readonly string[];
  };
  readonly updatedAt: string | null;
  readonly actionLabel:
    | "查看并决策"
    | "查看并接受"
    | "查看进展"
    | "查看现场"
    | "查看任务";
  readonly consequence: "high" | "normal";
  readonly attentionCode: AttentionItem["code"] | null;
  readonly taskDetail?: {
    readonly sourceRevision: number;
    readonly sourceRef: string;
    readonly ownership: "workbench-local";
    readonly identityAssurance: "unverified-local-interaction";
    readonly projectAuthority: "context-only";
    readonly missionContext: {
      readonly missionId: string | null;
      readonly authority: "context-only";
      readonly standing: "not-declared" | "observed" | "unavailable";
      readonly reason?: string;
      readonly sourceRef?: string;
      readonly currentCarrier: {
        readonly runnerId: string | null;
        readonly state: string | null;
        readonly live: boolean | null;
        readonly freshness: WorkItemProjection["evidence"]["freshness"];
        readonly sourceRef: string;
        readonly relation: "same-mission-current-carrier";
        readonly executionStanding: "execution-unproven";
      } | null;
    };
    readonly executionContext: {
      readonly latestLink: PrincipalTaskExecutionLink | null;
      readonly standing:
        | "current-effect-exact"
        | "current-turn-exact"
        | "authorization-consumption-verified"
        | "legacy-unproven"
        | "unavailable";
      readonly authorizationConsumption: {
        readonly standing: "verified" | "unavailable";
        readonly reason?: string;
        readonly sourceRefs: readonly string[];
      };
      readonly currentTurn: {
        readonly standing: "exact" | "legacy-unproven" | "unavailable";
        readonly reason?: string;
        readonly sourceRefs: readonly string[];
        readonly guidance?: {
          readonly mode: "launch-snapshot" | "legacy-live-input";
          readonly standing: "exact" | "partial" | "unavailable";
          readonly correctionIds: readonly string[];
          readonly missingCorrectionIds: readonly string[];
        };
      };
      readonly currentEffect: {
        readonly standing: "exact" | "legacy-unproven" | "unavailable";
        readonly reason?: string;
        readonly sourceRefs: readonly string[];
      };
      readonly linkCandidate: {
        readonly authorizationId: string;
        readonly proposalDigest: string;
        readonly evidenceRefs: readonly string[];
      } | null;
      readonly launchCandidate: {
        readonly authorizationId: string;
        readonly proposalDigest: string;
        readonly runtimeAdapterId: TaskExecutionRuntimeAdapterId;
        readonly anchorSeed: MissionAnchorSeed;
        readonly worktreePath: string;
        readonly receiptPath: string;
        readonly runtimeRef: string;
        readonly runtimeDigest: string;
        readonly evidenceRefs: readonly string[];
      } | null;
      readonly launchReadiness: TaskLaunchReadiness;
      readonly correctionDeliveryCandidate: {
        readonly correctionId: string;
        readonly authorizationId: string;
        readonly target: {
          readonly missionId: string;
          readonly runnerId: string;
          readonly expectedState:
            | "running"
            | "idle"
            | "anchor-pending"
            | "paused"
            | "input-pending"
            | "interrupted"
            | "mission-stopped"
            | "stopped";
          readonly projectKey?: string;
        };
      } | null;
      readonly recoveryCandidate: {
        readonly authorizationId: string;
        readonly proposalDigest: string;
        readonly turn: {
          readonly turnId: string;
          readonly authorizationId: string;
          readonly proposalDigest: string;
          readonly claimSourceRef: string;
        };
        readonly target: {
          readonly missionId: string;
          readonly runnerId: string;
          readonly expectedState: "interrupted";
          readonly projectKey?: string;
        };
        readonly command: "resume";
        readonly evidenceRefs: readonly string[];
      } | null;
      readonly verifiedResultCandidate: {
        readonly authorizationId: string;
        readonly selector: AutonomyEffectVerificationSelector;
        readonly evidenceRefs: readonly string[];
      } | null;
    };
    readonly latestResultVerification:
      | {
        readonly standing: "none";
      }
      | {
        readonly standing: "unverified-agent-claim";
        readonly reason: string;
      }
      | {
        readonly standing: "verified-current";
        readonly selector: AutonomyEffectVerificationSelector;
        readonly evidenceRefs: readonly string[];
      }
      | {
        readonly standing: "runtime-evidence-unavailable";
        readonly reason: string;
      }
      | {
        readonly standing: "accepted-runtime-evidence-retained";
        readonly selector: AutonomyEffectVerificationSelector;
      };
    readonly worktreeAuthority: "observation-only" | "unavailable";
    readonly worktreeStanding: "not-declared" | "observed" | "unavailable";
    readonly worktreeReason?: string;
    readonly attempts?: TaskAttemptSourceObservation;
    readonly task: PrincipalTask;
  };
}

export interface WorkItemSetProjection {
  readonly items: readonly WorkItemProjection[];
  readonly capabilities: {
    readonly independentTasks: {
      readonly standing: "available" | "unavailable";
      readonly count: number | null;
      readonly sourceRevision: number | null;
      readonly reason?: string;
    };
  };
}

export type PrincipalTaskSourceObservation =
  | {
    readonly standing: "available";
    readonly sourceRef: string;
    readonly source: PrincipalTasks;
  }
  | {
    readonly standing: "unavailable";
    readonly sourceRef: string;
    readonly reason: string;
  };

interface LiveRunnerProjection {
  readonly sourcePath: string;
  readonly status: {
    readonly runnerId?: string;
    readonly missionId: string;
    readonly state?: string;
    readonly updatedAt?: string;
    readonly recoveryCapabilities?: {
      readonly abandon: boolean;
      readonly resume: boolean;
      readonly replace: boolean;
    };
  };
  readonly binding: RunnerProjection["binding"];
  readonly live: boolean | null;
  readonly liveError?: string;
  readonly activity?: unknown;
  readonly freshness:
    | RunnerProjection["freshness"]
    | {
      readonly kind: "live";
      readonly observedAt: string;
    };
}

interface WorkItemSnapshot
  extends Omit<WorkbenchSnapshot, "runners"> {
  readonly runners: readonly LiveRunnerProjection[];
}

interface LaunchAuthorizationRefProjection {
  readonly authorizationId: string;
  readonly proposalDigest: string;
  readonly claimSourceRef: string;
}

const principalDecisionCodes = new Set<AttentionItem["code"]>([
  "runner-anchor-migration-decision",
  "runner-reconciliation-decision",
  "mission-execution-awaiting-authorization",
]);

const observationCodes = new Set<AttentionItem["code"]>([
  "runner-unbound",
  "runner-unreachable",
  "runner-reachability-unverified",
  "runner-lineage-unavailable",
  "runner-legacy-unanchored",
  "source-error",
]);

function projectName(project: ProjectProjection): string {
  return "id" in project.identity && project.identity.id !== null
    ? project.identity.aliases[0] ?? project.identity.id
    : project.identity.aliases[0]
      ?? project.identity.repository
      ?? project.projectKey;
}

function missionFor(
  snapshot: WorkItemSnapshot,
  projectKey: string | null,
  missionId: string | null,
): MissionProjection | undefined {
  if (projectKey === null || missionId === null) return undefined;
  return snapshot.projects
    .find((project) => project.projectKey === projectKey)
    ?.missions.find((mission) => mission.id === missionId);
}

function launchAuthorizationRef(
  value: unknown,
): LaunchAuthorizationRefProjection | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.authorizationId === "string"
      && typeof candidate.proposalDigest === "string"
      && typeof candidate.claimSourceRef === "string"
    ? {
      authorizationId: candidate.authorizationId,
      proposalDigest: candidate.proposalDigest,
      claimSourceRef: candidate.claimSourceRef,
    }
    : undefined;
}

function exactAuthorizationRef(
  link: PrincipalTaskExecutionLink,
  reference: LaunchAuthorizationRefProjection,
): boolean {
  return link.authorizationId === reference.authorizationId
    && link.proposalDigest === reference.proposalDigest
    && link.claimSourceRef === reference.claimSourceRef;
}

function workbenchTaskContextRef(
  value: unknown,
) {
  const parsed = WorkbenchTaskExecutionContextRefSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function sameTurnGuidanceRef(
  expected: ReturnType<typeof workbenchTaskCorrectionGuidanceRefs>[number],
  observed: Record<string, unknown>,
): boolean {
  return observed.version === expected.version
    && observed.kind === expected.kind
    && observed.guidanceId === expected.guidanceId
    && observed.taskId === expected.taskId
    && observed.correctionId === expected.correctionId
    && observed.sourceRef === expected.sourceRef
    && observed.payloadDigest === expected.payloadDigest;
}

function missionTitle(
  snapshot: WorkItemSnapshot,
  projectKey: string | null,
  missionId: string | null,
): string {
  const mission = missionFor(snapshot, projectKey, missionId);
  return mission?.title ?? missionId ?? "未归属运行事项";
}

function decisionRequired(item: AttentionItem): boolean {
  return item.priority === "principal-decision"
    || principalDecisionCodes.has(item.code);
}

function attentionActor(item: AttentionItem): WorkItemNextActor {
  if (decisionRequired(item)) return "principal";
  return "system";
}

function attentionLifecycle(item: AttentionItem): WorkItemLifecycle {
  if (
    item.code === "runner-reconciliation-authorized"
    || item.code === "correction-awaiting-system-settlement"
  ) return "waiting";
  if (item.code === "runner-paused") return "paused";
  return observationCodes.has(item.code) || item.priority === "warning"
    ? "blocked"
    : "waiting";
}

function attentionWorkItems(
  snapshot: WorkItemSnapshot,
): WorkItemProjection[] {
  return snapshot.attention.map((item, index): WorkItemProjection => {
    const projectKey = item.projectKey ?? null;
    const missionId = item.missionId ?? null;
    const requiresDecision = decisionRequired(item);
    return {
      id:
        `attention:${item.code}:${projectKey ?? "unbound"}:${missionId ?? index}`,
      kind: requiresDecision
        ? "decision"
        : observationCodes.has(item.code) ? "observation" : "system-work",
      lifecycle: attentionLifecycle(item),
      nextActor: attentionActor(item),
      attention: requiresDecision ? "decision-required" : "exception",
      title: missionTitle(snapshot, projectKey, missionId),
      summary: item.summary,
      context: projectKey !== null && missionId !== null
        ? `${projectKey} · ${missionId}`
        : projectKey ?? "待归属观察",
      projectKey,
      missionId,
      runnerId: null,
      binding: projectKey !== null
        ? missionId !== null
          ? { kind: "project-mission", projectKey, missionId }
          : { kind: "project", projectKey }
        : {
          kind: "unbound",
          missionId,
          reason: "attention has no exact project identity",
        },
      evidence: {
        freshness: item.code === "source-error"
          ? {
            kind: "unverified",
            observedAt: snapshot.generatedAt,
            reason: item.summary,
          }
          : {
            kind: "observed-at-build",
            observedAt: snapshot.generatedAt,
          },
        sourceRefs: [item.source],
      },
      updatedAt: snapshot.generatedAt,
      actionLabel: requiresDecision ? "查看并决策" : "查看现场",
      consequence: requiresDecision ? "high" : "normal",
      attentionCode: item.code,
    };
  });
}

function runnerFreshness(
  runner: LiveRunnerProjection,
  generatedAt: string,
): WorkItemProjection["evidence"]["freshness"] {
  if (runner.live === true && runner.freshness.kind === "live") {
    return {
      kind: "live",
      observedAt: runner.freshness.observedAt,
    };
  }
  if (runner.live === false) {
    const cached = runner.freshness.kind === "cached"
      ? runner.freshness
      : runner.sourcePath === ""
        ? null
        : runner;
    return {
      kind: "cached",
      sourceUpdatedAt: cached !== null && "sourceUpdatedAt" in cached
        ? cached.sourceUpdatedAt
        : runner.status.updatedAt ?? generatedAt,
      ageMs: cached !== null && "ageMs" in cached ? cached.ageMs : null,
    };
  }
  return {
    kind: "unverified",
    observedAt: generatedAt,
    reason: runner.liveError ?? "runner reachability was not verified",
  };
}

function runnerWorkItems(
  snapshot: WorkItemSnapshot,
): WorkItemProjection[] {
  return snapshot.runners.flatMap((runner): WorkItemProjection[] => {
    const missionId = runner.status.missionId;
    const runnerId = runner.status.runnerId ?? null;
    if (runner.binding.kind === "unbound") {
      const ambiguous = runner.binding.reason === "ambiguous-mission-id";
      return [{
        id: `runner-observation:${runnerId ?? missionId}`,
        kind: "observation",
        lifecycle: "blocked",
        nextActor: "system",
        attention: "exception",
        title: runnerId === null
          ? `未归属 Runner · ${missionId}`
          : `未归属 Runner ${runnerId}`,
        summary: runner.binding.reason,
        context: "观察异常 · 不是独立任务",
        projectKey: null,
        missionId,
        runnerId,
        binding: ambiguous
          ? {
            kind: "ambiguous",
            missionId,
            reason: runner.binding.reason,
          }
          : {
            kind: "unbound",
            missionId,
            reason: runner.binding.reason,
          },
        evidence: {
          freshness: runnerFreshness(runner, snapshot.generatedAt),
          sourceRefs: [runner.sourcePath],
        },
        updatedAt: runner.status.updatedAt ?? null,
        actionLabel: "查看现场",
        consequence: "normal",
        attentionCode: "runner-unbound",
      }];
    }

    if (
      runner.live !== true
      || runner.status.state !== "running"
      || runnerId === null
    ) return [];
    const activity = runner.activity !== null
      && typeof runner.activity === "object"
      ? runner.activity as Record<string, unknown>
      : {};
    const currentEffect = activity.currentEffect;
    const effectWorkspace = currentEffect !== null
      && typeof currentEffect === "object"
      && "workspace" in currentEffect
      && currentEffect.workspace !== null
      && typeof currentEffect.workspace === "object"
      && "root" in currentEffect.workspace
      && typeof currentEffect.workspace.root === "string"
      ? currentEffect.workspace.root
      : null;
    return [{
      id: `runner:${runnerId}`,
      kind: "agent-work",
      lifecycle: "in-progress",
      nextActor: "agent",
      attention: "normal",
      title: missionTitle(
        snapshot,
        runner.binding.projectKey,
        missionId,
      ),
      summary: "Agent 正在执行当前 Mission",
      context: `${runner.binding.projectKey} · ${missionId}`,
      projectKey: runner.binding.projectKey,
      missionId,
      runnerId,
      binding: {
        kind: "project-mission",
        projectKey: runner.binding.projectKey,
        missionId,
      },
      ...(effectWorkspace === null
        ? {}
        : {
          worktreeContext: {
            path: effectWorkspace,
            relation: "effect-workspace" as const,
            authority: "execution-evidence" as const,
          },
        }),
      evidence: {
        freshness: runnerFreshness(runner, snapshot.generatedAt),
        sourceRefs: [runner.sourcePath],
      },
      updatedAt: runner.status.updatedAt ?? null,
      actionLabel: "查看进展",
      consequence: "normal",
      attentionCode: null,
    }];
  });
}

function missionWorkItems(
  snapshot: WorkItemSnapshot,
  activeMissionKeys: ReadonlySet<string>,
): WorkItemProjection[] {
  return snapshot.projects.flatMap((project): WorkItemProjection[] =>
    project.missions.flatMap((mission): WorkItemProjection[] => {
      const key = `${project.projectKey}:${mission.id}`;
      if (activeMissionKeys.has(key)) return [];
      const settled = mission.mainline.status === "settled";
      return [{
        id: `mission:${project.projectKey}:${mission.id}:${mission.sourcePath}`,
        kind: "mission",
        lifecycle: settled ? "settled" : "open",
        nextActor: settled ? "none" : "unknown",
        attention: "normal",
        title: mission.title,
        summary: mission.currentFocus
          || mission.mainline.contradiction
          || (settled
            ? "Mission 已结案；验证、集成与产品接受仍由各自证据决定"
            : "Mission 已声明，尚无可证明的当前执行者"),
        context: `${projectName(project)} · ${mission.id}`,
        projectKey: project.projectKey,
        missionId: mission.id,
        runnerId: null,
        binding: {
          kind: "project-mission",
          projectKey: project.projectKey,
          missionId: mission.id,
        },
        worktreeContext: {
          path: mission.observedGitContext.worktreePath,
          relation: "mission-observed-here",
          authority: "observation-only",
        },
        evidence: {
          freshness: {
            kind: "observed-at-build",
            observedAt: snapshot.generatedAt,
          },
          sourceRefs: [mission.sourcePath],
        },
        updatedAt: snapshot.generatedAt,
        actionLabel: "查看任务",
        consequence: "normal",
        attentionCode: null,
      }];
    })
  );
}

function principalTaskWorkItems(
  snapshot: WorkItemSnapshot,
  observation: PrincipalTaskSourceObservation,
  taskAttempts?: Readonly<Record<string, TaskAttemptSourceObservation>>,
): WorkItemProjection[] {
  if (observation.standing !== "available") return [];
  return observation.source.tasks.map((task): WorkItemProjection => {
    const projectKey = task.binding.kind === "project-context"
      ? `registered:${task.binding.projectId}`
      : null;
    const project = projectKey === null
      ? undefined
      : snapshot.projects.find((candidate) => candidate.projectKey === projectKey);
    const projectContext = projectKey === null
      ? null
      : {
        projectKey,
        authority: "context-only" as const,
      };
    const declaredMissionId =
      task.binding.kind === "project-context"
      && "missionId" in task.binding
      && typeof task.binding.missionId === "string"
        ? task.binding.missionId
        : undefined;
    const mission = declaredMissionId === undefined
      ? undefined
      : project?.missions.find((candidate) => candidate.id === declaredMissionId);
    const missionReason = declaredMissionId === undefined || mission !== undefined
      ? undefined
      : project === undefined
        ? "registered project context is unavailable in the current snapshot"
        : "persisted task Mission is not in the project's current observed Mission inventory";
    const matchingCarriers =
      declaredMissionId === undefined
      || projectKey === null
      || mission === undefined
      ? []
      : snapshot.runners.filter(
        (runner) =>
          runner.binding.kind === "project-mission"
          && runner.binding.projectKey === projectKey
          && runner.binding.missionId === declaredMissionId
          && runner.status.missionId === declaredMissionId,
      );
    const currentCarrier = matchingCarriers.length === 1
      ? matchingCarriers[0]
      : undefined;
    const currentCarrierReason = matchingCarriers.length > 1
      ? "multiple current carriers were observed for the same project and Mission"
      : undefined;
    const latestExecutionLink = task.executionLinks.at(-1) ?? null;
    const expectedWorktreePath =
      task.binding.kind === "project-context"
        ? task.binding.worktreePath
        : undefined;
    const authorization = mission?.authorization;
    const launchAuthorization =
      authorization?.standing === "authorized-awaiting-execution"
        ? authorization
        : undefined;
    const consumedAuthorization =
      authorization?.standing === "authorization-consumed"
        ? authorization
        : undefined;
    const authorizationMatches =
      latestExecutionLink !== null
      && consumedAuthorization !== undefined
      && latestExecutionLink.authorizationId === consumedAuthorization.authorizationId
      && latestExecutionLink.proposalDigest === consumedAuthorization.proposalDigest
      && latestExecutionLink.taskContext !== undefined
      && consumedAuthorization.consumption.workbenchTaskContext !== null
      && consumedAuthorization.consumption.workbenchTaskContext !== undefined
      && sameWorkbenchTaskExecutionContextRef(
        latestExecutionLink.taskContext,
        consumedAuthorization.consumption.workbenchTaskContext,
      )
      && (
        expectedWorktreePath === undefined
        || sameObservedPath(
          expectedWorktreePath,
          consumedAuthorization.consumption.candidateWorktree,
        )
      );
    const authorizationSourceRefs = consumedAuthorization === undefined
      ? mission === undefined ? [] : [mission.sourcePath]
      : [
        mission!.sourcePath,
        consumedAuthorization.sourcePath,
        consumedAuthorization.consumption.claimSourcePath,
      ];
    const authorizationConsumption = authorizationMatches
      ? {
        standing: "verified" as const,
        sourceRefs: authorizationSourceRefs,
      }
      : {
        standing: "unavailable" as const,
        reason: latestExecutionLink === null
          ? "task has no execution link"
          : consumedAuthorization === undefined
            ? "current Mission has no verified consumed authorization"
            : "latest task execution link is not the current Mission consumed authorization",
        sourceRefs: authorizationSourceRefs,
      };
    const carrierActivity =
      currentCarrier?.activity !== null
      && typeof currentCarrier?.activity === "object"
        ? currentCarrier.activity as Record<string, unknown>
        : undefined;
    const activityError = carrierActivity === undefined
      ? undefined
      : typeof carrierActivity.error === "string"
        ? carrierActivity.error
        : undefined;
    const currentTurnValue = carrierActivity?.currentTurn;
    const currentTurnId =
      currentTurnValue !== null
      && typeof currentTurnValue === "object"
      && typeof (currentTurnValue as Record<string, unknown>).turnId === "string"
        ? (currentTurnValue as Record<string, unknown>).turnId as string
        : undefined;
    const currentTurnRef =
      currentTurnValue !== null && typeof currentTurnValue === "object"
        ? launchAuthorizationRef(
          (currentTurnValue as Record<string, unknown>).launchAuthorizationRef,
        )
        : undefined;
    const currentTurnObject =
      currentTurnValue !== null && typeof currentTurnValue === "object"
        ? currentTurnValue as Record<string, unknown>
        : undefined;
    const currentTurnTaskContext = workbenchTaskContextRef(
      currentTurnObject?.workbenchTaskContext,
    );
    const observedGuidanceRefs = Array.isArray(
        currentTurnObject?.guidanceRefs,
      )
      ? currentTurnObject.guidanceRefs.filter(
        (value): value is Record<string, unknown> =>
          value !== null && typeof value === "object",
      )
      : [];
    const hasStructuredGuidance = Array.isArray(
      currentTurnObject?.guidanceRefs,
    );
    const expectedGuidanceRefs =
      latestExecutionLink !== null
      && task.binding.kind === "project-context"
      && task.binding.missionId !== undefined
        ? workbenchTaskCorrectionGuidanceRefs(
          workbenchTaskExecutionContextFor(
            task,
            {
              authorizationId: latestExecutionLink.authorizationId,
              proposalDigest: latestExecutionLink.proposalDigest,
            },
          ),
        )
        : [];
    const guidedCorrectionIds = new Set(
      expectedGuidanceRefs
        .filter((expected) =>
          observedGuidanceRefs.some((observed) =>
            sameTurnGuidanceRef(expected, observed)
            && latestExecutionLink?.taskContext !== undefined
            && observed.taskContextDigest
              === latestExecutionLink.taskContext.contextDigest
          )
        )
        .map((guidance) => guidance.correctionId),
    );
    const missingGuidanceCorrectionIds = expectedGuidanceRefs
      .filter((guidance) => !guidedCorrectionIds.has(guidance.correctionId))
      .map((guidance) => guidance.correctionId);
    const guidanceStanding =
      currentTurnObject === undefined || latestExecutionLink === null
        ? "unavailable" as const
        : missingGuidanceCorrectionIds.length === 0
          ? "exact" as const
          : guidedCorrectionIds.size === 0
            ? "unavailable" as const
            : "partial" as const;
    const currentTurn = !authorizationMatches
      ? {
        standing: "unavailable" as const,
        reason: "authorization consumption must be verified before current turn comparison",
        sourceRefs: [] as string[],
      }
      : currentCarrier === undefined
        ? {
          standing: "unavailable" as const,
          reason: currentCarrierReason
            ?? "no unique current carrier is observed for the task Mission",
          sourceRefs: [] as string[],
        }
        : activityError !== undefined
          ? {
            standing: "unavailable" as const,
            reason: activityError,
            sourceRefs: [currentCarrier.sourcePath],
          }
          : currentTurnValue === null || currentTurnValue === undefined
            ? {
              standing: "unavailable" as const,
              reason: "current Mission activity has no current turn",
              sourceRefs: [currentCarrier.sourcePath],
            }
            : currentTurnRef === undefined
              ? {
                standing: "legacy-unproven" as const,
                reason: "current turn has no structured launch authorization reference",
                sourceRefs: [currentCarrier.sourcePath],
              }
              : currentTurnTaskContext === undefined
                ? {
                  standing: "legacy-unproven" as const,
                  reason: "current turn has no structured Workbench task context reference",
                  sourceRefs: [
                    currentCarrier.sourcePath,
                    currentTurnRef.claimSourceRef,
                  ],
                }
                : latestExecutionLink !== null
                  && latestExecutionLink.taskContext !== undefined
                  && exactAuthorizationRef(latestExecutionLink, currentTurnRef)
                  && sameWorkbenchTaskExecutionContextRef(
                    latestExecutionLink.taskContext,
                    currentTurnTaskContext,
                  )
                ? {
                  standing: "exact" as const,
                  sourceRefs: [
                    currentCarrier.sourcePath,
                    currentTurnRef.claimSourceRef,
                  ],
                  guidance: {
                    mode: hasStructuredGuidance
                      ? "launch-snapshot" as const
                      : "legacy-live-input" as const,
                    standing: guidanceStanding,
                    correctionIds: [...guidedCorrectionIds],
                    missingCorrectionIds: missingGuidanceCorrectionIds,
                  },
                }
                : {
                  standing: "unavailable" as const,
                  reason: "current turn authorization or Workbench task context does not match the latest task execution link",
                  sourceRefs: [
                    currentCarrier.sourcePath,
                    currentTurnRef.claimSourceRef,
                  ],
                  guidance: {
                    mode: hasStructuredGuidance
                      ? "launch-snapshot" as const
                      : "legacy-live-input" as const,
                    standing: "unavailable" as const,
                    correctionIds: [] as string[],
                    missingCorrectionIds: task.corrections.map(
                      (correction) => correction.id,
                    ),
                  },
                };
    const currentEffectValue = carrierActivity?.currentEffect;
    const currentEffectRef =
      currentEffectValue !== null && typeof currentEffectValue === "object"
        ? launchAuthorizationRef(
          (currentEffectValue as Record<string, unknown>).launchAuthorizationRef,
        )
        : undefined;
    const currentEffect = currentTurn.standing !== "exact"
      ? {
        standing: currentTurn.standing === "legacy-unproven"
          ? "legacy-unproven" as const
          : "unavailable" as const,
        reason: "current turn must match exactly before current effect comparison",
        sourceRefs: [] as string[],
      }
      : currentEffectValue === null || currentEffectValue === undefined
        ? {
          standing: "unavailable" as const,
          reason: "current Mission activity has no current effect",
          sourceRefs: currentCarrier === undefined
            ? [] as string[]
            : [currentCarrier.sourcePath],
        }
        : currentEffectRef === undefined
          ? {
            standing: "legacy-unproven" as const,
            reason: "current effect has no structured launch authorization reference",
            sourceRefs: currentCarrier === undefined
              ? [] as string[]
              : [currentCarrier.sourcePath],
          }
          : latestExecutionLink !== null
              && exactAuthorizationRef(latestExecutionLink, currentEffectRef)
            ? {
              standing: "exact" as const,
              sourceRefs: [
                ...(currentCarrier === undefined ? [] : [currentCarrier.sourcePath]),
                currentEffectRef.claimSourceRef,
              ],
            }
            : {
              standing: "unavailable" as const,
              reason: "current effect launch authorization reference does not match the latest task execution link",
              sourceRefs: [
                ...(currentCarrier === undefined ? [] : [currentCarrier.sourcePath]),
                currentEffectRef.claimSourceRef,
              ],
            };
    const executionStanding =
      currentEffect.standing === "exact"
        ? "current-effect-exact" as const
        : currentTurn.standing === "exact"
          ? "current-turn-exact" as const
          : currentTurn.standing === "legacy-unproven"
              || currentEffect.standing === "legacy-unproven"
            ? "legacy-unproven" as const
            : authorizationMatches
              ? "authorization-consumption-verified" as const
              : "unavailable" as const;
    const currentAuthorizationAlreadyLinked =
      consumedAuthorization !== undefined
      && observation.source.tasks.some(
        (candidateTask) => candidateTask.executionLinks.some(
          (link) => link.authorizationId === consumedAuthorization.authorizationId,
        ),
      );
    const expectedUnlinkedTaskContext =
      consumedAuthorization === undefined
        ? undefined
        : workbenchTaskExecutionContextRef(
          workbenchTaskExecutionContextFor(
            task,
            {
              authorizationId: consumedAuthorization.authorizationId,
              proposalDigest: consumedAuthorization.proposalDigest,
            },
          ),
        );
    const consumptionBelongsToCurrentTask =
      consumedAuthorization?.consumption.workbenchTaskContext !== null
      && consumedAuthorization?.consumption.workbenchTaskContext !== undefined
      && expectedUnlinkedTaskContext !== undefined
      && sameWorkbenchTaskExecutionContextRef(
        consumedAuthorization.consumption.workbenchTaskContext,
        expectedUnlinkedTaskContext,
      );
    const linkCandidate =
      consumedAuthorization !== undefined
      && !currentAuthorizationAlreadyLinked
      && consumptionBelongsToCurrentTask
      && task.lifecycle !== "settled"
      && task.lifecycle !== "verifying"
        ? {
          authorizationId: consumedAuthorization.authorizationId,
          proposalDigest: consumedAuthorization.proposalDigest,
          evidenceRefs: authorizationSourceRefs,
        }
        : null;
    const undeliveredCorrection = [...task.corrections]
      .reverse()
      .find(
        (correction) =>
          correction.deliveries.length === 0
          && !guidedCorrectionIds.has(correction.id),
      );
    const currentCarrierState = runnerTargetState(currentCarrier?.status.state);
    const correctionDeliveryCandidate =
      undeliveredCorrection !== undefined
      && latestExecutionLink !== null
      && currentTurn.standing === "exact"
      && !hasStructuredGuidance
      && currentCarrier?.live === true
      && currentCarrier.status.runnerId !== undefined
      && currentCarrierState !== undefined
      && task.nextActor === "agent"
      && task.lifecycle !== "settled"
      && task.lifecycle !== "verifying"
        ? {
          correctionId: undeliveredCorrection.id,
          authorizationId: latestExecutionLink.authorizationId,
          target: {
            missionId: declaredMissionId!,
            runnerId: currentCarrier.status.runnerId,
            expectedState: currentCarrierState,
            ...(projectKey === null ? {} : { projectKey }),
          },
        }
        : null;
    const recoveryCandidate =
      latestExecutionLink !== null
      && authorizationMatches
      && expectedWorktreePath !== undefined
      && currentTurn.standing === "exact"
      && currentTurnRef !== undefined
      && currentTurnId !== undefined
      && currentCarrier?.live === true
      && currentCarrier.status.runnerId !== undefined
      && currentCarrier.status.state === "interrupted"
      && currentCarrier.status.recoveryCapabilities?.resume === true
      && task.nextActor === "agent"
      && task.lifecycle !== "settled"
      && task.lifecycle !== "verifying"
        ? {
          authorizationId: latestExecutionLink.authorizationId,
          proposalDigest: latestExecutionLink.proposalDigest,
          turn: {
            turnId: currentTurnId,
            authorizationId: currentTurnRef.authorizationId,
            proposalDigest: currentTurnRef.proposalDigest,
            claimSourceRef: currentTurnRef.claimSourceRef,
          },
          target: {
            missionId: declaredMissionId!,
            runnerId: currentCarrier.status.runnerId,
            expectedState: "interrupted" as const,
            ...(projectKey === null ? {} : { projectKey }),
          },
          command: "resume" as const,
          evidenceRefs: [
            currentCarrier.sourcePath,
            latestExecutionLink.claimSourceRef,
            ...currentTurn.sourceRefs,
          ],
        }
        : null;
    const projectedVerifiedResult = CurrentVerifiedResultProjectionSchema.safeParse(
      carrierActivity?.currentVerifiedResult,
    );
    const currentEffectObject =
      currentEffectValue !== null && typeof currentEffectValue === "object"
        ? currentEffectValue as Record<string, unknown>
        : undefined;
    const currentEffectId = currentEffectObject === undefined
      ? undefined
      : typeof currentEffectObject.effectId === "string"
        ? currentEffectObject.effectId
        : undefined;
    const currentEffectWorkspace =
      currentEffectObject !== undefined
      && currentEffectObject.workspace !== null
      && typeof currentEffectObject.workspace === "object"
      && "root" in currentEffectObject.workspace
      && typeof currentEffectObject.workspace.root === "string"
        ? currentEffectObject.workspace.root
        : undefined;
    const verifiedCurrentExecution =
      projectedVerifiedResult.success
      && latestExecutionLink !== null
      && consumedAuthorization !== undefined
      && currentEffect.standing === "exact"
      && projectedVerifiedResult.data.selector.effectId === currentEffectId
      && sameObservedPath(
        currentEffectWorkspace,
        consumedAuthorization.consumption.candidateWorktree,
      )
      && (
        expectedWorktreePath === undefined
        || sameObservedPath(currentEffectWorkspace, expectedWorktreePath)
      )
        ? {
          authorizationId: latestExecutionLink.authorizationId,
          selector: projectedVerifiedResult.data.selector,
          evidenceRefs: [
            ...(currentCarrier === undefined ? [] : [currentCarrier.sourcePath]),
            latestExecutionLink.claimSourceRef,
          ],
        }
        : null;
    const verifiedResultCandidate =
      verifiedCurrentExecution !== null
      && missingGuidanceCorrectionIds.length === 0
      && task.nextActor === "agent"
      && task.lifecycle !== "settled"
      && task.lifecycle !== "verifying"
        ? verifiedCurrentExecution
        : null;
    const worktreeObserved =
      expectedWorktreePath !== undefined
      && project !== undefined
      && project.worktrees.some(
        (worktree) => worktree.path === expectedWorktreePath,
      );
    const worktreeReason = expectedWorktreePath === undefined || worktreeObserved
      ? undefined
      : project === undefined
        ? "registered project context is unavailable in the current snapshot"
        : "persisted task Worktree is not in the project's current observed Worktree inventory";
    const observedTaskWorktree =
      expectedWorktreePath === undefined
        ? undefined
        : project?.worktrees.find(
          (worktree) => worktree.path === expectedWorktreePath,
        );
    const executionProposal = mission?.executionProposal;
    const runtimeAdapter = executionProposal === undefined
      ? null
      : trustedTaskExecutionRuntimeAdapterFor(executionProposal.runtimeRef);
    const launchCandidate =
      task.binding.kind === "project-context"
      && declaredMissionId !== undefined
      && expectedWorktreePath !== undefined
      && mission !== undefined
      && task.lifecycle === "open"
      && task.nextActor === "agent"
      && launchAuthorization !== undefined
      && executionProposal !== undefined
      && runtimeAdapter !== null
      && executionProposal.proposalDigest === launchAuthorization.proposalDigest
      && observedTaskWorktree?.dirty === false
      && observedTaskWorktree.gitBranch === null
      && observedTaskWorktree.head !== null
      && observedTaskWorktree.head === mission.observedGitContext.head
      && !matchingCarriers.some((carrier) => carrier.live === true)
        ? {
          authorizationId: launchAuthorization.authorizationId,
          proposalDigest: launchAuthorization.proposalDigest,
          runtimeAdapterId: runtimeAdapter.id,
          anchorSeed: taskExecutionAnchorSeed(
            task,
            mission,
            launchAuthorization,
            observation.sourceRef,
          ),
          worktreePath: expectedWorktreePath,
          receiptPath: launchAuthorization.sourcePath,
          runtimeRef: executionProposal.runtimeRef,
          runtimeDigest: executionProposal.runtimeDigest,
          evidenceRefs: [
            observation.sourceRef,
            mission.sourcePath,
            launchAuthorization.sourcePath,
            `worktree:${expectedWorktreePath}`,
          ],
        }
        : null;
    const launchReadiness: TaskLaunchReadiness =
      task.lifecycle !== "open" || task.nextActor !== "agent"
        ? {
          standing: "not-applicable",
          blockers: [],
        }
        : launchCandidate !== null
          ? {
            standing: "ready",
            blockers: [],
          }
          : {
            standing: "preparation-required",
            blockers: taskLaunchReadinessBlockers({
              task,
              project,
              declaredMissionId,
              mission,
              executionProposal,
              authorization,
              launchAuthorization,
              expectedWorktreePath,
              observedTaskWorktree,
              matchingCarriers,
            }),
          };
    const latestClaim = task.resultClaims.at(-1);
    const latestResultVerification =
      latestClaim === undefined
        ? { standing: "none" as const }
        : latestClaim.evidence.kind === "agent-references-unverified"
          ? {
            standing: "unverified-agent-claim" as const,
            reason: "result references were supplied by the actor and were not admitted as runtime verification",
          }
          : latestClaim.standing === "accepted"
              && latestClaim.resolution?.kind === "accepted"
              && latestClaim.resolution.basis === "runtime-verified-effect"
            ? {
              standing: "accepted-runtime-evidence-retained" as const,
              selector: latestClaim.evidence.selector,
            }
            : verifiedCurrentExecution !== null
                && latestClaim.evidence.authorizationId
                  === verifiedCurrentExecution.authorizationId
                && sameRuntimeVerificationSelector(
                  latestClaim.evidence.selector,
                  verifiedCurrentExecution.selector,
                )
              ? {
                standing: "verified-current" as const,
                selector: verifiedCurrentExecution.selector,
                evidenceRefs: verifiedCurrentExecution.evidenceRefs,
              }
              : {
                standing: "runtime-evidence-unavailable" as const,
                reason: "the retained runtime verification selector is no longer the exact current verified execution",
              };
    const sourceRefs = [
      observation.sourceRef,
      task.origin.sourceRef,
      ...task.corrections.map((correction) => correction.sourceRef),
      ...(task.worktreeRebindings ?? []).map((rebinding) => rebinding.sourceRef),
      ...task.executionLinks.flatMap((link) => [
        link.sourceRef,
        link.claimSourceRef,
      ]),
      ...task.resultClaims.flatMap((claim) => [
        claim.sourceRef,
        ...claim.evidenceRefs,
        ...(claim.resolution?.kind === "accepted"
          ? [claim.resolution.sourceRef]
          : []),
      ]),
    ];
    return {
      id: `principal-task:${task.id}`,
      kind: "principal-task",
      lifecycle: task.lifecycle,
      nextActor: task.nextActor,
      attention: task.nextActor === "principal"
        ? "decision-required"
        : "normal",
      title: task.title,
      summary: task.lifecycle === "verifying" && latestClaim?.standing === "submitted"
        ? latestClaim.summary
        : task.objective,
      context: task.binding.kind === "independent"
        ? "Workbench · 独立任务"
        : project === undefined
          ? `${task.binding.projectId} · 项目上下文不可用`
          : `${projectName(project)}${
            declaredMissionId === undefined ? "" : ` · ${declaredMissionId}`
          } · Workbench 任务`,
      projectKey,
      missionId: declaredMissionId ?? null,
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: task.id,
        projectContext,
      },
      ...(expectedWorktreePath !== undefined
        ? {
          worktreeContext: {
            path: expectedWorktreePath,
            relation: worktreeObserved
              ? "task-context" as const
              : "task-expected-context" as const,
            authority: worktreeObserved
              ? "observation-only" as const
              : "unavailable" as const,
            standing: worktreeObserved
              ? "observed" as const
              : "unavailable" as const,
            ...(worktreeReason === undefined ? {} : { reason: worktreeReason }),
          },
        }
        : {}),
      evidence: {
        freshness: expectedWorktreePath !== undefined && !worktreeObserved
          ? {
            kind: "unverified",
            observedAt: snapshot.generatedAt,
            reason: worktreeReason!,
          }
          : {
            kind: "observed-at-build",
            observedAt: snapshot.generatedAt,
          },
        sourceRefs: [...new Set(sourceRefs)],
      },
      updatedAt: task.updatedAt,
      actionLabel: task.lifecycle === "verifying"
        ? "查看并接受"
        : "查看任务",
      consequence: "normal",
      attentionCode: null,
      taskDetail: {
        sourceRevision: observation.source.sourceRevision,
        sourceRef: observation.sourceRef,
        ownership: "workbench-local",
        identityAssurance: "unverified-local-interaction",
        projectAuthority: "context-only",
        missionContext: {
          missionId: declaredMissionId ?? null,
          authority: "context-only",
          standing: declaredMissionId === undefined
            ? "not-declared"
            : mission === undefined
              ? "unavailable"
              : "observed",
          ...(missionReason === undefined ? {} : { reason: missionReason }),
          ...(mission === undefined ? {} : { sourceRef: mission.sourcePath }),
          currentCarrier: currentCarrier === undefined
            ? null
            : {
              runnerId: currentCarrier.status.runnerId ?? null,
              state: currentCarrier.status.state ?? null,
              live: currentCarrier.live,
              freshness: runnerFreshness(currentCarrier, snapshot.generatedAt),
              sourceRef: currentCarrier.sourcePath,
              relation: "same-mission-current-carrier",
              executionStanding: "execution-unproven",
            },
          ...(currentCarrierReason === undefined
            ? {}
            : {
              reason: missionReason === undefined
                ? currentCarrierReason
                : `${missionReason}; ${currentCarrierReason}`,
            }),
        },
        executionContext: {
          latestLink: latestExecutionLink,
          standing: executionStanding,
          authorizationConsumption,
          currentTurn,
          currentEffect,
          linkCandidate,
          launchCandidate,
          launchReadiness,
          correctionDeliveryCandidate,
          recoveryCandidate,
          verifiedResultCandidate,
        },
        latestResultVerification,
        worktreeAuthority: expectedWorktreePath === undefined || worktreeObserved
          ? "observation-only"
          : "unavailable",
        worktreeStanding: expectedWorktreePath === undefined
          ? "not-declared"
          : worktreeObserved
            ? "observed"
            : "unavailable",
        ...(worktreeReason === undefined ? {} : { worktreeReason }),
        ...(taskAttempts === undefined
          ? {}
          : {
            attempts: taskAttempts[task.id] ?? {
              standing: "unavailable",
              sourceRef: taskAttemptsSourceRef,
              reason: "task attempt source was not observed",
            },
          }),
        task,
      },
    };
  });
}

function taskExecutionAnchorSeed(
  task: PrincipalTask,
  mission: MissionProjection,
  authorization: Extract<
    NonNullable<MissionProjection["authorization"]>,
    { readonly standing: "authorized-awaiting-execution" }
  >,
  taskSourceRef: string,
): MissionAnchorSeed {
  const missionHead = mission.observedGitContext.head;
  if (missionHead === null) {
    throw new Error(`Mission ${mission.id} has no observed Git HEAD for an initial anchor`);
  }
  const sourceRefs = [...new Set([
    mission.sourcePath,
    taskSourceRef,
    task.origin.sourceRef,
    ...task.corrections.map((correction) => correction.sourceRef),
    authorization.sourcePath,
  ])];
  const corrections = task.corrections.length === 0
    ? []
    : [
      "Workbench task corrections:",
      ...task.corrections.map((correction) => `- ${correction.statement}`),
    ];
  return MissionAnchorSeedSchema.parse({
    version: "rosso.mission-anchor-seed.v1",
    id: `workbench-task-anchor-seed:${task.id}:${authorization.authorizationId}`,
    missionId: mission.id,
    authorityRef: authorization.actorRef,
    sourceRef: authorization.sourceRef,
    anchor: {
      id: `workbench-task-anchor:${task.id}`,
      revision: `mission-head:${missionHead}:task-revision:${task.revision}`,
      statement: [
        `Mission mainline: ${mission.mainline.contradiction}`,
        "Mission acceptance:",
        ...mission.mainline.acceptance.map((criterion) => `- ${criterion}`),
        `Workbench task objective: ${task.objective}`,
        "Workbench task acceptance:",
        ...task.acceptance.map((criterion) => `- ${criterion}`),
        ...corrections,
      ].join("\n"),
      sourceRefs,
      reconciledWatermark: 0,
    },
  });
}

function taskLaunchReadinessBlockers(input: {
  readonly task: PrincipalTask;
  readonly project: ProjectProjection | undefined;
  readonly declaredMissionId: string | undefined;
  readonly mission: MissionProjection | undefined;
  readonly executionProposal: MissionProjection["executionProposal"];
  readonly authorization: MissionProjection["authorization"];
  readonly launchAuthorization:
    | Extract<
      NonNullable<MissionProjection["authorization"]>,
      { readonly standing: "authorized-awaiting-execution" }
    >
    | undefined;
  readonly expectedWorktreePath: string | undefined;
  readonly observedTaskWorktree:
    | ProjectProjection["worktrees"][number]
    | undefined;
  readonly matchingCarriers: readonly LiveRunnerProjection[];
}): TaskLaunchReadiness["blockers"] {
  const blockers: Array<TaskLaunchReadiness["blockers"][number]> = [];
  const hasExactContext =
    input.task.binding.kind === "project-context"
    && input.declaredMissionId !== undefined
    && input.expectedWorktreePath !== undefined;
  if (!hasExactContext) {
    blockers.push({
      code: "exact-context-required",
      message: "启动需要任务声明精确的 registered project、Mission 与 Worktree 上下文。",
    });
    return blockers;
  }
  if (input.mission === undefined) {
    blockers.push({
      code: "mission-unavailable",
      message: "任务声明的 Mission 当前不在 registered project 的可用投影中。",
    });
  } else if (input.executionProposal === undefined) {
    blockers.push({
      code: "execution-proposal-unavailable",
      message: "当前 Mission 没有可供监督启动的 execution proposal。",
    });
  }

  if (input.executionProposal !== undefined) {
    if (input.authorization?.standing === "authorization-consumed") {
      blockers.push({
        code: "fresh-authorization-required",
        message: "当前一次性执行授权已经消费；需要新的 Mission proposal 与新的 Principal 授权。",
      });
    } else if (
      input.launchAuthorization === undefined
      || input.launchAuthorization.proposalDigest
        !== input.executionProposal.proposalDigest
    ) {
      blockers.push({
        code: "fresh-authorization-required",
        message: input.launchAuthorization === undefined
          ? "当前 Mission 没有可用于启动的 fresh authorization；需要完成当前 proposal 的 Principal 授权。"
          : "当前授权不再匹配 execution proposal；需要新的 proposal 与 Principal 授权。",
      });
    }
  }

  if (input.observedTaskWorktree === undefined) {
    blockers.push({
      code: "worktree-unavailable",
      message: "任务声明的 Worktree 当前不在 registered project 的可观察 Worktree 中。",
    });
  } else {
    if (
      input.observedTaskWorktree.dirty
      || input.observedTaskWorktree.gitBranch !== null
    ) {
      blockers.push({
        code: "clean-detached-worktree-required",
        message: "启动需要一个 Git-clean、detached 的候选 Worktree。",
      });
    }
    if (
      input.mission !== undefined
      && (
        input.observedTaskWorktree.head === null
        || input.mission.observedGitContext.head === null
        || input.observedTaskWorktree.head
          !== input.mission.observedGitContext.head
      )
    ) {
      blockers.push({
        code: "mission-head-mismatch",
        message: "候选 Worktree HEAD 必须与 committed Mission proposal 的观察 HEAD 完全一致。",
      });
    }
  }

  if (input.matchingCarriers.some((carrier) => carrier.live === true)) {
    blockers.push({
      code: "live-carrier-present",
      message: "同一 Mission 已有 live carrier；不会并行启动替代 Runner。",
    });
  }
  if (
    input.executionProposal !== undefined
    && trustedTaskExecutionRuntimeAdapterFor(
      input.executionProposal.runtimeRef,
    ) === null
  ) {
    blockers.push({
      code: "runtime-adapter-unavailable",
      message: "当前 execution proposal 没有 Workbench 可用的 trusted runtime adapter。",
    });
  }
  return blockers;
}

function sameRuntimeVerificationSelector(
  left: AutonomyEffectVerificationSelector,
  right: AutonomyEffectVerificationSelector,
): boolean {
  return left.kind === right.kind
    && left.effectId === right.effectId
    && left.verificationEventId === right.verificationEventId;
}

function sameObservedPath(
  left: string | undefined,
  right: string | undefined,
): boolean {
  if (left === undefined || right === undefined) return false;
  if (left === right) return true;
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}

function runnerTargetState(
  value: string | undefined,
):
  | "running"
  | "idle"
  | "anchor-pending"
  | "paused"
  | "input-pending"
  | "interrupted"
  | "mission-stopped"
  | "stopped"
  | undefined {
  if (
    value === "running"
    || value === "idle"
    || value === "anchor-pending"
    || value === "paused"
    || value === "input-pending"
    || value === "interrupted"
    || value === "mission-stopped"
    || value === "stopped"
  ) return value;
  return undefined;
}

export function buildWorkItemProjection(
  snapshot: WorkItemSnapshot,
  taskSource: PrincipalTaskSourceObservation = {
    standing: "unavailable",
    sourceRef: "unavailable",
    reason: "Principal task source was not observed.",
  },
  taskAttempts?: Readonly<Record<string, TaskAttemptSourceObservation>>,
): WorkItemSetProjection {
  const attention = attentionWorkItems(snapshot);
  const runners = runnerWorkItems(snapshot);
  const activeMissionKeys = new Set<string>();
  for (const item of [...attention, ...runners]) {
    if (item.projectKey !== null && item.missionId !== null) {
      activeMissionKeys.add(`${item.projectKey}:${item.missionId}`);
    }
  }
  const items = [
    ...attention,
    ...runners,
    ...principalTaskWorkItems(snapshot, taskSource, taskAttempts),
    ...missionWorkItems(snapshot, activeMissionKeys),
  ].sort((left, right) => {
    const attentionRank = {
      "decision-required": 0,
      exception: 1,
      normal: 2,
    };
    const delta = attentionRank[left.attention] - attentionRank[right.attention];
    return delta !== 0
      ? delta
      : (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "");
  });
  return {
    items,
    capabilities: {
      independentTasks: taskSource.standing === "available"
        ? {
          standing: "available",
          count: taskSource.source.tasks.filter(
            (task) => task.binding.kind === "independent",
          ).length,
          sourceRevision: taskSource.source.sourceRevision,
        }
        : {
          standing: "unavailable",
          count: null,
          sourceRevision: null,
          reason: taskSource.reason,
        },
    },
  };
}
