import { realpathSync } from "node:fs";
import type { TaskAttemptProjection } from "../task-attempts";
import {
  readStrictTaskAttemptEvidence,
  showPrincipalTaskAttempts,
} from "../task-attempts";
import { optionalGit } from "../workspace";
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
  OrdinaryAttemptResultSelector,
  PrincipalTask,
  PrincipalTaskResultClaim,
  PrincipalTaskResultReview,
  PrincipalTasks,
  TaskResultVerificationSelector,
} from "../contracts";
import {
  OrdinaryAttemptResultSelectorSchema,
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

export type ResultReviewFreshness =
  | {
    readonly standing: "current";
    readonly observedHead: string;
  }
  | {
    readonly standing: "stale";
    readonly observedHead: string;
  }
  | {
    readonly standing: "unavailable";
    readonly reason: string;
  };

export interface ResultReviewProjection {
  readonly claim: {
    readonly id: string;
    readonly submittedAt: string;
    readonly standing: PrincipalTask["resultClaims"][number]["standing"];
    readonly summary: string;
    readonly latest: boolean;
  };
  readonly assessment: PrincipalTaskResultReview;
  readonly independence: "independence-proven" | "independence-unproven";
  readonly freshness: ResultReviewFreshness;
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
  /**
   * Read-only detail for an anomaly/observation scene: the real source path,
   * raw errors with normalized interpretation, the dedup basis that keeps one
   * runner scene as one item, the last observed evidence standing, and only
   * next steps the current implementation actually supports. Unknown states
   * stay unknown; nothing here invents a Mission binding or recovery result.
   */
  readonly anomalyDetail?: AnomalyDetailProjection;
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
      readonly attemptResultCandidate: AttemptResultCandidate | null;
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
        readonly selector: TaskResultVerificationSelector;
        readonly evidenceRefs: readonly string[];
      }
      | {
        readonly standing: "runtime-evidence-unavailable";
        readonly reason: string;
      }
      | {
        readonly standing: "accepted-runtime-evidence-retained";
        readonly selector: TaskResultVerificationSelector;
      };
    readonly latestResultReview:
      | { readonly standing: "none" }
      | {
        readonly standing: "available";
        readonly assessment: PrincipalTaskResultReview;
        readonly independence: "independence-proven" | "independence-unproven";
        readonly freshness: ResultReviewFreshness;
      };
    readonly resultReviews: readonly ResultReviewProjection[];
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

export interface AnomalyFacetProjection {
  readonly code: string;
  readonly summary: string;
  readonly source: string;
}

export interface AnomalyRawErrorProjection {
  readonly stage: string;
  readonly raw: string;
  readonly normalized: string;
  readonly impact: string;
}

export interface AnomalyEvidenceStandingProjection {
  readonly freshnessKind: "cached" | "unverified" | "observed-at-build" | "live";
  readonly observedAt: string | null;
  readonly sourceUpdatedAt: string | null;
  readonly meaning: string;
}

export interface AnomalyBindingProjection {
  readonly standing: "project-mission" | "unbound" | "ambiguous" | "unverified";
  readonly missionId: string | null;
  readonly reason?: string;
}

export interface AnomalyNextStepProjection {
  readonly supported: boolean;
  readonly label: string;
  readonly responsible: string;
  readonly detail: string;
  readonly blocker?: string;
}

export interface AnomalyDetailProjection {
  readonly scene: {
    readonly kind: string;
    readonly sourcePath: string;
    readonly relatedPaths: readonly string[];
  };
  readonly dedup: {
    readonly basis: "runner-id" | "source-path";
    readonly key: string;
    readonly mergedCount: number;
  };
  readonly facets: readonly AnomalyFacetProjection[];
  readonly rawErrors: readonly AnomalyRawErrorProjection[];
  readonly evidenceStanding: AnomalyEvidenceStandingProjection;
  readonly binding: AnomalyBindingProjection;
  readonly nextSteps: readonly AnomalyNextStepProjection[];
}

/**
 * One strict ordinary-attempt result candidate derived by re-reading the
 * canonical attempt/final/settlement readers — the projected attempt list
 * plus the strict evidence family — never by copying runtime truth. It binds
 * the exact attempt id, the current Task revision, the retained Work Cell
 * run id, the owner-backed workspace diff and checks, the exact bound
 * Worktree identity with its currently observed HEAD, and the stable
 * evidence refs. A stopped, failed, stale, malformed, or unavailable
 * attempt yields no candidate.
 */
export interface AttemptResultCandidate {
  readonly selector: OrdinaryAttemptResultSelector;
  readonly attemptId: string;
  /** The exact current Task revision the attempt ran against. */
  readonly taskRevision: number;
  readonly cellStatus: "passed";
  readonly workCellRunId: string | null;
  readonly workspaceDiff: {
    readonly added: readonly string[];
    readonly changed: readonly string[];
    readonly removed: readonly string[];
  };
  readonly verification: {
    readonly passed: boolean;
    readonly terminalPassed: boolean;
  };
  readonly worktree: {
    readonly path: string;
    readonly head: string;
  };
  readonly evidenceRefs: readonly string[];
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

/**
 * Primary-facet selection inside one runner scene group. Identity (unbound)
 * wins because every other facet is unactionable without it; principal
 * decisions (interrupted, lineage/anchor, reconciliation) come next; pure
 * reachability/notice facts are lowest so they never displace a decision.
 */
const runnerAnomalyPrimaryOrder: Record<string, number> = {
  "runner-unbound": 0,
  "runner-anchor-migration-decision": 1,
  "runner-reconciliation-decision": 2,
  "mission-execution-awaiting-authorization": 3,
  "runner-interrupted": 4,
  "runner-input-pending": 5,
  "runner-anchor-pending": 6,
  "runner-legacy-unanchored": 7,
  "runner-lineage-unavailable": 8,
  "runner-unreachable": 9,
  "runner-reachability-unverified": 10,
  "runner-reconciliation-authorized": 11,
  "runner-reconciliation-attempt-consumed": 12,
  "correction-awaiting-system-settlement": 13,
  "runner-idle": 14,
  "runner-paused": 15,
};

function runnerAnomalyPrimary(
  group: readonly AttentionItem[],
): AttentionItem {
  let primary = group[0]!;
  for (const item of group) {
    const current = runnerAnomalyPrimaryOrder[item.code] ?? 99;
    const best = runnerAnomalyPrimaryOrder[primary.code] ?? 99;
    if (current < best) primary = item;
  }
  return primary;
}

const sourceErrorStageByScope: Record<string, string> = {
  git: "git-observation",
  mission: "mission-source",
  runner: "runner-source",
  home: "home-source",
  authorization: "execution-authorization",
};

const rawAnomalyErrorPatterns: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly normalized: string;
}> = [
  {
    pattern: /fatal: not a git repository/iu,
    normalized:
      "该路径当前不是可读取的 Git 仓库（.git 缺失、目录被删除或尚未初始化）；投影不能把它当作可观察工作现场。",
  },
  {
    pattern: /workspace path does not exist/iu,
    normalized:
      "配置的现场路径当前不存在；投影保留该位置为不可观察，不推断其内容。",
  },
  {
    pattern: /no such file or directory/iu,
    normalized:
      "来源文件或目录缺失；投影只保留这次失败的读取观察。",
  },
];

/**
 * Keep the raw evidence verbatim while explaining the failure stage and its
 * impact. Unrecognized messages stay raw with an explicit unknown standing;
 * the projection never guesses a meaning it cannot support.
 */
export function projectAnomalyRawError(
  scope: string | null,
  message: string,
): AnomalyRawErrorProjection {
  const stage = (scope === null ? null : sourceErrorStageByScope[scope]) ?? "unknown";
  const normalized = rawAnomalyErrorPatterns.find((entry) => entry.pattern.test(message))
    ?.normalized
    ?? "该错误没有可识别的规范模式；投影保留原文，不推断阶段语义。";
  const impact = stage === "git-observation"
    ? "此路径上的 Git 观察（worktree 清单、HEAD、dirty 状态或 Mission 提交比对）失败；该现场不能作为可信工作现场参与投影，其绑定状态保持未知。"
    : stage === "mission-source"
      ? "Mission 记录无法读取或校验；该 Mission 及其执行提案与授权不出现在当前投影中。"
      : stage === "runner-source"
        ? "runner 状态或活动来源无法读取或校验；该 runner 的缓存事实不进入投影。"
        : stage === "home-source"
          ? "Workbench 家目录来源无法读取；相关项目或任务来源缺位。"
          : stage === "execution-authorization"
            ? "执行授权或消费证据无法读取或校验；不产生可用的启动授权。"
            : "投影无法从错误文本确定影响范围；保留原始证据，不做猜测。";
  return { stage, raw: message, normalized, impact };
}

function sourceErrorNextSteps(): AnomalyNextStepProjection[] {
  return [
    {
      supported: true,
      label: "刷新当前投影",
      responsible: "Workbench · 只读重建",
      detail: "重新读取该来源并重建投影；来源修复后，本事项会随刷新消失或变化。",
    },
    {
      supported: false,
      label: "恢复该现场",
      responsible: "Principal · 宿主环境",
      detail: "Workbench 不修改现场；需要先在宿主上修复路径或 Git 状态，再刷新投影。",
      blocker: "现场当前不可观察",
    },
  ];
}

/**
 * Only steps the current implementation actually supports become actionable;
 * everything else states the responsible party and the blocking reason instead
 * of manufacturing an invalid operation.
 */
function anomalyNextSteps(input: {
  readonly code: AttentionItem["code"];
  readonly runner: LiveRunnerProjection | undefined;
  readonly binding: AnomalyBindingProjection;
  readonly codes: ReadonlySet<string>;
}): AnomalyNextStepProjection[] {
  const steps: AnomalyNextStepProjection[] = [{
    supported: true,
    label: "刷新当前投影",
    responsible: "Workbench · 只读重建",
    detail: "重新读取全部投影来源并重建本事项；不会修改现场、缓存或运行状态。",
  }];
  if (input.code === "runner-unbound") {
    steps.push({
      supported: false,
      label: "重新绑定 runner",
      responsible: "Principal · 需要先修正来源",
      detail: "runner 状态只声明 Mission ID，当前投影没有唯一匹配的注册项目 Mission；不存在可用的 rebind 操作。",
      blocker: input.binding.reason ?? "no-explicit-mission-id-match",
    });
  }
  const hasInterruptedFacet = input.codes.has("runner-interrupted");
  const hasReachabilityFacet =
    input.codes.has("runner-unreachable")
    || input.codes.has("runner-reachability-unverified");
  if (
    input.code === "runner-unreachable"
    || input.code === "runner-reachability-unverified"
    || input.code === "runner-interrupted"
    || hasInterruptedFacet
    || hasReachabilityFacet
  ) {
    const live = input.runner?.live;
    const resumable =
      input.code === "runner-interrupted"
      && live === true
      && input.runner?.status.state === "interrupted"
      && input.runner.status.recoveryCapabilities?.resume === true
      && input.binding.standing === "project-mission";
    if (resumable) {
      steps.push({
        supported: true,
        label: "续接 interrupted turn（resume）",
        responsible: "Principal",
        detail: "该 live 载体声明支持 resume；通过对应 Mission 的现场操作区以精确 runner/state 目标发起。",
      });
    } else {
      const bound = input.binding.standing === "project-mission";
      steps.push({
        supported: false,
        label: hasInterruptedFacet || input.code === "runner-interrupted"
          ? "恢复或放弃 interrupted turn"
          : "输入 / 控制 / 恢复该 runner",
        responsible: "Principal · 需要先恢复载体",
        detail: bound
          ? live === null
            ? "当前观察者无法验证载体可达性；未验证状态不能授权任何动作。"
            : "载体不可达；缓存状态不能授权任何动作。"
          : "runner 未绑定 Mission；无法形成精确恢复目标。",
        blocker: bound
          ? live === null
            ? "runner reachability unverified"
            : "runner unreachable · cached only"
          : "runner 未绑定 Mission · 无精确恢复目标",
      });
    }
  }
  if (hasReachabilityFacet || input.code === "runner-unreachable") {
    steps.push({
      supported: false,
      label: "忽略该异常",
      responsible: "Principal",
      detail: "投影不会自动忽略或合并任何异常；载体被处置后，应让 runner 状态来源更新并刷新投影。",
      blocker: "ignore 操作在当前实现不存在",
    });
  }
  return steps;
}

function runnerEvidenceStanding(
  runner: LiveRunnerProjection | undefined,
  generatedAt: string,
): AnomalyEvidenceStandingProjection {
  if (runner === undefined) {
    return {
      freshnessKind: "observed-at-build",
      observedAt: generatedAt,
      sourceUpdatedAt: null,
      meaning: "本次投影构建时读取；runner 缓存详情未单独投影。",
    };
  }
  if (runner.live === true && runner.freshness.kind === "live") {
    return {
      freshnessKind: "live",
      observedAt: runner.freshness.observedAt,
      sourceUpdatedAt: runner.status.updatedAt ?? null,
      meaning: "实时载体响应；当前可精确寻址。",
    };
  }
  if (runner.live === false) {
    return {
      freshnessKind: "cached",
      observedAt: null,
      sourceUpdatedAt: runner.status.updatedAt ?? null,
      meaning: "仅缓存状态；不证明载体 live 或 stopped，最后更新见来源时间。",
    };
  }
  return {
    freshnessKind: "unverified",
    observedAt: generatedAt,
    sourceUpdatedAt: runner.status.updatedAt ?? null,
    meaning: "观察者未能验证可达性；live/stopped 未知，缓存状态仅供检查。",
  };
}

function runnerBindingStanding(
  runner: LiveRunnerProjection | undefined,
  group: readonly AttentionItem[],
): AnomalyBindingProjection {
  const declaredMissionId = group.find((item) => item.missionId !== undefined)
    ?.missionId
    ?? null;
  const bound = group.some(
    (item) => item.projectKey !== undefined && item.missionId !== undefined,
  );
  if (bound) return { standing: "project-mission", missionId: declaredMissionId };
  if (runner !== undefined && runner.binding.kind === "unbound") {
    return {
      standing: runner.binding.reason === "ambiguous-mission-id"
        ? "ambiguous"
        : "unbound",
      missionId: declaredMissionId,
      reason: runner.binding.reason,
    };
  }
  if (group.some((item) => item.code === "runner-unbound")) {
    return {
      standing: "unbound",
      missionId: declaredMissionId,
      reason: "runner 状态声明的 Mission ID 没有唯一匹配的注册项目 Mission",
    };
  }
  return { standing: "unverified", missionId: declaredMissionId };
}

/**
 * One overview item per identified runner scene. Every attention fact about
 * the same runner cache identity folds into this single item as a facet, so
 * an unbound, interrupted, cached, unreachable runner is one item instead of
 * several contradictory rows. The declared Mission ID is retained only as a
 * binding claim with its unbound/unverified standing; it is never promoted to
 * a real binding.
 */
function runnerAnomalyWorkItem(
  snapshot: WorkItemSnapshot,
  runnerId: string,
  group: readonly AttentionItem[],
): WorkItemProjection {
  const primary = runnerAnomalyPrimary(group);
  const runner = snapshot.runners.find(
    (candidate) => candidate.status.runnerId === runnerId,
  );
  const binding = runnerBindingStanding(runner, group);
  const bound = binding.standing === "project-mission";
  const projectKey = bound
    ? group.find((item) => item.projectKey !== undefined)?.projectKey ?? null
    : null;
  const missionId = bound ? binding.missionId : null;
  const requiresDecision = decisionRequired(primary);
  const sources = [...new Set([
    ...(runner === undefined ? [] : [runner.sourcePath]),
    ...group.map((item) => item.source),
  ])];
  const freshness = runner === undefined
    ? {
      kind: "observed-at-build" as const,
      observedAt: snapshot.generatedAt,
    }
    : runnerFreshness(runner, snapshot.generatedAt);
  // Persistable decision loci keep their legacy id so navigation and
  // authorization links stay stable; ordinary runner observations use the
  // runner id as their stable dedup key.
  const persistableDecision =
    primary.code === "runner-anchor-migration-decision"
    || primary.code === "runner-reconciliation-decision"
    || primary.code === "mission-execution-awaiting-authorization";
  const unboundBinding = runner !== undefined && runner.binding.kind === "unbound"
    ? runner.binding
    : null;
  return {
    id: persistableDecision
      ? `attention:${primary.code}:${projectKey ?? "unbound"}:${binding.missionId ?? runnerId}`
      : `attention:runner:${runnerId}`,
    kind: requiresDecision ? "decision" : "observation",
    lifecycle: attentionLifecycle(primary),
    nextActor: attentionActor(primary),
    attention: requiresDecision ? "decision-required" : "exception",
    title: bound
      ? missionTitle(snapshot, projectKey, missionId)
      : `未归属 Runner ${runnerId}`,
    summary: primary.summary,
    context: bound && projectKey !== null && missionId !== null
      ? `${projectKey} · ${missionId}`
      : "观察异常 · 未按 Mission ID 绑定",
    projectKey,
    missionId,
    runnerId,
    binding: bound && projectKey !== null && binding.missionId !== null
      ? { kind: "project-mission", projectKey, missionId: binding.missionId }
      : unboundBinding !== null
        ? unboundBinding.reason === "ambiguous-mission-id"
            && binding.missionId !== null
          ? {
            kind: "ambiguous",
            missionId: binding.missionId,
            reason: unboundBinding.reason,
          }
          : {
            kind: "unbound",
            missionId: binding.missionId,
            reason: unboundBinding.reason,
          }
        : {
          kind: "unbound",
          missionId: binding.missionId,
          reason: binding.reason ?? "runner scene has no project Mission binding",
        },
    evidence: {
      freshness,
      sourceRefs: sources,
    },
    updatedAt: runner?.status.updatedAt ?? snapshot.generatedAt,
    actionLabel: requiresDecision ? "查看并决策" : "查看现场",
    consequence: requiresDecision ? "high" : "normal",
    attentionCode: primary.code,
    anomalyDetail: {
      scene: {
        kind: "runner-cache",
        sourcePath: runner?.sourcePath ?? primary.source,
        relatedPaths: sources,
      },
      dedup: {
        basis: "runner-id",
        key: runnerId,
        mergedCount: group.length,
      },
      facets: group.map((item) => ({
        code: item.code,
        summary: item.summary,
        source: item.source,
      })),
      rawErrors: [],
      evidenceStanding: runnerEvidenceStanding(runner, snapshot.generatedAt),
      binding,
      nextSteps: anomalyNextSteps({
        code: primary.code,
        runner,
        binding,
        codes: new Set(group.map((item) => item.code)),
      }),
    },
  };
}

function attentionItemWorkItem(
  snapshot: WorkItemSnapshot,
  item: AttentionItem,
  index: number,
): WorkItemProjection {
  const projectKey = item.projectKey ?? null;
  const missionId = item.missionId ?? null;
  const requiresDecision = decisionRequired(item);
  const sourceError = item.code === "source-error";
  const errorScope = sourceError
    ? snapshot.errors.find(
      (error) => error.source === item.source && error.message === item.summary,
    )?.scope ?? null
    : null;
  return {
    id: `attention:${item.code}:${projectKey ?? "unbound"}:${missionId ?? index}`,
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
    runnerId: item.runnerId ?? null,
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
      freshness: sourceError
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
    ...(sourceError
      ? {
        anomalyDetail: {
          scene: {
            kind: (errorScope === null ? null : sourceErrorStageByScope[errorScope])
              ?? "unknown",
            sourcePath: item.source,
            relatedPaths: [],
          },
          dedup: {
            basis: "source-path",
            key: item.source,
            mergedCount: 1,
          },
          facets: [],
          rawErrors: [projectAnomalyRawError(errorScope, item.summary)],
          evidenceStanding: {
            freshnessKind: "unverified",
            observedAt: snapshot.generatedAt,
            sourceUpdatedAt: null,
            meaning: "该来源在投影构建时读取失败；原始错误保留，影响范围见错误详情。",
          },
          binding: {
            standing: "unverified",
            missionId,
            reason: "来源读取失败，无法形成项目绑定判断",
          },
          nextSteps: sourceErrorNextSteps(),
        },
      }
      : {}),
  };
}

function attentionWorkItems(
  snapshot: WorkItemSnapshot,
): WorkItemProjection[] {
  const runnerGroups = new Map<string, AttentionItem[]>();
  const standalone: AttentionItem[] = [];
  for (const item of snapshot.attention) {
    if (item.runnerId !== undefined && item.runnerId !== "") {
      const group = runnerGroups.get(item.runnerId) ?? [];
      group.push(item);
      runnerGroups.set(item.runnerId, group);
    } else {
      standalone.push(item);
    }
  }
  return [
    ...[...runnerGroups.entries()].map(([runnerId, group]) =>
      runnerAnomalyWorkItem(snapshot, runnerId, group)),
    ...standalone.map((item, index) => attentionItemWorkItem(snapshot, item, index)),
  ];
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
    const currentTurn = activity.currentTurn !== null
      && typeof activity.currentTurn === "object"
      ? activity.currentTurn as Record<string, unknown>
      : undefined;
    if (currentTurn?.state === "settled") return [];
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
  home?: string,
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
    const attemptResultCandidate = attemptResultCandidateFor(
      home,
      task,
      expectedWorktreePath,
      taskAttempts?.[task.id],
    );
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
    const attemptClaimVerification =
      latestClaim !== undefined
      && latestClaim.evidence.kind === "runtime-verified-attempt"
        ? attemptClaimVerificationFor(
          home,
          task,
          expectedWorktreePath,
          taskAttempts?.[task.id],
          latestClaim,
        )
        : null;
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
              && (
                latestClaim.resolution.basis === "runtime-verified-effect"
                || latestClaim.resolution.basis === "runtime-verified-attempt"
              )
            ? {
              standing: "accepted-runtime-evidence-retained" as const,
              selector: latestClaim.evidence.selector,
            }
            : latestClaim.evidence.kind === "runtime-verified-effect"
              ? verifiedCurrentExecution !== null
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
                }
              : attemptClaimVerification !== null
                ? {
                  standing: "verified-current" as const,
                  selector: attemptClaimVerification.selector,
                  evidenceRefs: attemptClaimVerification.evidenceRefs,
                }
                : {
                  standing: "runtime-evidence-unavailable" as const,
                  reason: "the retained attempt verification selector is no longer the exact current recorded passed attempt",
                };
    const resultReviews = task.resultClaims.flatMap(
      (claim): ResultReviewProjection[] => claim.reviews.map((assessment) => ({
        claim: {
          id: claim.id,
          submittedAt: claim.submittedAt,
          standing: claim.standing,
          summary: claim.summary,
          latest: claim.id === latestClaim?.id,
        },
        assessment,
        independence: reviewIndependence(assessment),
        freshness: resultReviewFreshness(
          task,
          assessment,
          observedTaskWorktree,
          worktreeReason,
        ),
      })),
    ).sort((left, right) =>
      left.assessment.reviewedAt.localeCompare(right.assessment.reviewedAt)
      || left.assessment.id.localeCompare(right.assessment.id)
    );
    const latestReview = latestClaim?.reviews.at(-1);
    const latestResultReview = latestReview === undefined
      ? { standing: "none" as const }
      : {
        standing: "available" as const,
        assessment: latestReview,
        independence: reviewIndependence(latestReview),
        freshness: resultReviewFreshness(
          task,
          latestReview,
          observedTaskWorktree,
          worktreeReason,
        ),
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
        ...claim.reviews.flatMap((review) => [
          review.independence.sourceRef,
          ...review.evidenceRefs,
        ]),
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
          attemptResultCandidate,
        },
        latestResultVerification,
        latestResultReview,
        resultReviews,
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
  left: TaskResultVerificationSelector,
  right: TaskResultVerificationSelector,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "autonomy-effect-verification.v1") {
    const observed = right as AutonomyEffectVerificationSelector;
    return left.effectId === observed.effectId
      && left.verificationEventId === observed.verificationEventId;
  }
  return left.attemptId === (right as OrdinaryAttemptResultSelector).attemptId;
}

function reviewIndependence(
  assessment: PrincipalTaskResultReview,
): ResultReviewProjection["independence"] {
  return assessment.independence.basis === "independent-review-context"
    ? "independence-proven"
    : "independence-unproven";
}

function resultReviewFreshness(
  task: PrincipalTask,
  assessment: PrincipalTaskResultReview,
  observedTaskWorktree: ProjectProjection["worktrees"][number] | undefined,
  worktreeReason: string | undefined,
): ResultReviewFreshness {
  if (task.binding.kind === "independent") {
    return {
      standing: "unavailable",
      reason: "independent task has no bound Worktree whose HEAD can be observed",
    };
  }
  if (observedTaskWorktree === undefined) {
    return {
      standing: "unavailable",
      reason: worktreeReason
        ?? "bound task Worktree is unavailable in the current snapshot",
    };
  }
  if (observedTaskWorktree.head === null) {
    return {
      standing: "unavailable",
      reason: "bound task Worktree HEAD could not be read",
    };
  }
  return observedTaskWorktree.head === assessment.candidate.commit
    ? { standing: "current", observedHead: observedTaskWorktree.head }
    : { standing: "stale", observedHead: observedTaskWorktree.head };
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

/**
 * Derive the one strict ordinary-attempt result candidate by re-reading the
 * canonical attempt/final/settlement readers — the projected attempt list
 * plus the strict evidence family — never by copying runtime truth. The
 * candidate appears only for an open Agent-owned Task whose latest attempt
 * is a fully available, recorded, passed run with overall and terminal
 * verification at the exact current Task revision, whose immutable CellInput
 * binds the Task's current Worktree, and whose Worktree still sits at the
 * exact currently observed HEAD. Stopped, failed, stale, malformed, or
 * unavailable evidence yields no candidate.
 */
function attemptResultCandidateFor(
  home: string | undefined,
  task: PrincipalTask,
  expectedWorktreePath: string | undefined,
  observed: TaskAttemptSourceObservation | undefined,
): AttemptResultCandidate | null {
  if (home === undefined || expectedWorktreePath === undefined) return null;
  if (task.lifecycle !== "open" || task.nextActor !== "agent") return null;
  if (task.resultClaims.some((claim) => claim.standing === "submitted")) return null;
  const candidate = attemptResultEvidenceFor(home, task, expectedWorktreePath, observed);
  if (candidate === null || candidate.taskRevision !== task.revision) return null;
  return candidate;
}

/**
 * Revalidate one already submitted ordinary-attempt claim against the same
 * canonical attempt evidence the submission verified: the exact attempt must
 * still be fully available, recorded, passed, and verified, its immutable
 * CellInput must still bind the Task's current Worktree, the current
 * Worktree HEAD must equal the exact HEAD the submission verified, and the
 * claim's retained verified Task revision must still match the attempt's
 * own revision. Any drift after submission — evidence corruption, Worktree
 * rebinding, HEAD movement, or supersession by a correction — yields no
 * current verification, so an explicit accept refuses.
 */
function attemptClaimVerificationFor(
  home: string | undefined,
  task: PrincipalTask,
  expectedWorktreePath: string | undefined,
  observed: TaskAttemptSourceObservation | undefined,
  claim: PrincipalTaskResultClaim,
): { selector: OrdinaryAttemptResultSelector; evidenceRefs: readonly string[] } | null {
  if (claim.evidence.kind !== "runtime-verified-attempt") return null;
  const evidence = attemptResultEvidenceFor(home, task, expectedWorktreePath, observed);
  if (evidence === null) return null;
  if (evidence.selector.attemptId !== claim.evidence.selector.attemptId) return null;
  if (evidence.taskRevision !== claim.evidence.taskRevision) return null;
  if (evidence.worktree.head !== claim.evidence.worktreeHead) return null;
  return { selector: evidence.selector, evidenceRefs: evidence.evidenceRefs };
}

/**
 * The ungated canonical attempt evidence derivation shared by the submission
 * candidate and by the revalidation of an already submitted attempt claim:
 * the exact same strict readers and checks, without lifecycle gating.
 */
function attemptResultEvidenceFor(
  home: string | undefined,
  task: PrincipalTask,
  expectedWorktreePath: string | undefined,
  observed: TaskAttemptSourceObservation | undefined,
): AttemptResultCandidate | null {
  if (home === undefined || expectedWorktreePath === undefined) return null;
  const attempts = observed !== undefined && observed.standing === "available"
    ? observed.attempts
    : showPrincipalTaskAttempts(home, task.id);
  const latest = attempts.at(-1);
  if (latest === undefined) return null;
  if (latest.status !== "recorded" || latest.cellStatus !== "passed") return null;
  if (
    latest.verification?.passed !== true
    || latest.verification.terminal?.passed !== true
  ) return null;
  if (
    latest.evidence.attempt.standing !== "available"
    || latest.evidence.finalRecord.standing !== "available"
    || latest.evidence.settlement.standing !== "available"
  ) return null;
  // The strict evidence family is re-read as the authority for the exact
  // run identity, workspace binding, checks, and stable refs; the projection
  // above only selects the latest attempt.
  const evidence = readStrictTaskAttemptEvidence(home, latest.attemptId);
  if (evidence.standing !== "available") return null;
  const attempt = evidence.attempt;
  const settlement = evidence.settlement;
  const final = evidence.finalRecord;
  const input = evidence.input;
  if (
    attempt === undefined
    || settlement === undefined
    || final === undefined
    || input === undefined
  ) return null;
  if (attempt.taskId !== task.id) return null;
  if (settlement.status !== "recorded") return null;
  if (
    settlement.workCellRunId === undefined
    || settlement.cellStatus === undefined
    || settlement.workCellRunId !== final.runId
    || settlement.cellStatus !== final.status
  ) return null;
  if (
    final.status !== "passed"
    || final.verification.passed !== true
    || final.verification.terminal.passed !== true
  ) return null;
  if (!sameObservedPath(input.workspace.root, expectedWorktreePath)) return null;
  let head: string | null = null;
  try {
    head = optionalGit(["rev-parse", "HEAD"], input.workspace.root);
  } catch {
    return null;
  }
  if (head === null || !/^[0-9a-f]{40}$/u.test(head)) return null;
  return {
    selector: OrdinaryAttemptResultSelectorSchema.parse({
      kind: "ordinary-attempt-result.v1",
      attemptId: latest.attemptId,
    }),
    attemptId: latest.attemptId,
    taskRevision: attempt.taskRevision,
    cellStatus: "passed",
    workCellRunId: settlement.workCellRunId,
    workspaceDiff: {
      added: [...final.workspaceDiff.added],
      changed: [...final.workspaceDiff.changed],
      removed: [...final.workspaceDiff.removed],
    },
    verification: {
      passed: final.verification.passed,
      terminalPassed: final.verification.terminal.passed,
    },
    worktree: { path: input.workspace.root, head },
    evidenceRefs: [
      evidence.refs.inputRef,
      evidence.refs.attemptRef,
      evidence.refs.finalRecordRef,
      evidence.refs.settlementRef,
    ],
  };
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
  home?: string,
): WorkItemSetProjection {
  const attention = attentionWorkItems(snapshot);
  const runners = runnerWorkItems(snapshot);
  // One identified runner scene is one item: when the grouped attention
  // projection already carries an unbound runner observation, the parallel
  // runner-shell observation for the same runner id is a duplicate and is
  // dropped. Live agent-work items never share the same identity meaning.
  const coveredRunnerIds = new Set<string>();
  for (const item of attention) {
    if (item.runnerId !== null && item.runnerId !== undefined) {
      coveredRunnerIds.add(item.runnerId);
    }
  }
  const runnersFiltered = runners.filter((item) =>
    item.kind !== "observation"
    || item.runnerId === null
    || item.runnerId === undefined
    || !coveredRunnerIds.has(item.runnerId)
  );
  const activeMissionKeys = new Set<string>();
  for (const item of [...attention, ...runnersFiltered]) {
    if (item.projectKey !== null && item.missionId !== null) {
      activeMissionKeys.add(`${item.projectKey}:${item.missionId}`);
    }
  }
  const items = [
    ...attention,
    ...runnersFiltered,
    ...principalTaskWorkItems(snapshot, taskSource, home, taskAttempts),
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
