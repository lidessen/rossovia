import type {
  AttentionItem,
  MissionProjection,
  ProjectProjection,
  RunnerProjection,
  WorkbenchSnapshot,
} from "./projection";

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

export interface WorkItemProjection {
  readonly id: string;
  readonly kind:
    | "mission"
    | "decision"
    | "agent-work"
    | "system-work"
    | "observation"
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
    readonly relation: "effect-workspace" | "mission-observed-here";
    readonly authority: "execution-evidence" | "observation-only";
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
  readonly actionLabel: "查看并决策" | "查看进展" | "查看现场" | "查看任务";
  readonly consequence: "high" | "normal";
  readonly attentionCode: AttentionItem["code"] | null;
}

export interface WorkItemSetProjection {
  readonly items: readonly WorkItemProjection[];
  readonly capabilities: {
    readonly independentTasks: {
      readonly standing: "unsupported";
      readonly count: null;
      readonly reason: string;
    };
  };
}

interface LiveRunnerProjection {
  readonly sourcePath: string;
  readonly status: {
    readonly runnerId?: string;
    readonly missionId: string;
    readonly state?: string;
    readonly updatedAt?: string;
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

export function buildWorkItemProjection(
  snapshot: WorkItemSnapshot,
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
      independentTasks: {
        standing: "unsupported",
        count: null,
        reason: "No explicit independent-task source is declared by Workbench.",
      },
    },
  };
}
