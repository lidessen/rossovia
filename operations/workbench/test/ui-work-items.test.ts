import { describe, expect, test } from "bun:test";
import {
  buildWorkItemProjection,
  taskAttemptsSourceRef,
} from "../src/ui/work-items";
import {
  workbenchTaskCorrectionGuidanceRefs,
  workbenchTaskExecutionContextFor,
  workbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContextRef,
} from "../src/ui/task-execution-context";

const executionAuthorizationId = "11111111-1111-4111-8111-111111111111";
const executionProposalDigest = "a".repeat(64);
const executionClaimSourceRef =
  `state/execution-authorization-claims/${executionAuthorizationId}.json`;
const publicationRuntimeRef =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const publicationRuntimeDigest = "b".repeat(64);
const executionLink = {
  authorizationId: executionAuthorizationId,
  proposalDigest: executionProposalDigest,
  claimSourceRef: executionClaimSourceRef,
  linkedAt: "2026-07-27T08:30:00Z",
  sourceRef: "workbench-ui:unverified-local-interaction",
};

const executionSelector = {
  authorizationId: executionAuthorizationId,
  proposalDigest: executionProposalDigest,
};

const snapshot = {
  generatedAt: "2026-07-27T10:00:00Z",
  complete: false,
  projects: [{
    projectKey: "registered:skills",
    identity: { id: "skills", aliases: ["skills"] },
    worktrees: [{ path: "/workspace/skills" }, { path: "/workspace/skills-ui" }],
    missions: [{
      id: "ui-redesign",
      title: "重做工作台 UI",
      currentFocus: "统一任务与项目视图",
      mainline: {
        contradiction: "Unify the Workbench interface",
        acceptance: ["The interface preserves operational truth"],
        status: "active",
      },
      sourcePath: "/workspace/skills/MISSION.json",
      observedGitContext: {
        worktreePath: "/workspace/skills-ui",
        binding: "observation-only",
      },
    }, {
      id: "agent-run",
      title: "运行验证",
      currentFocus: "执行真实探针",
      mainline: {
        contradiction: "Execute one supervised Agent run",
        acceptance: ["The run remains bounded to the Mission"],
        status: "active",
      },
      sourcePath: "/workspace/skills/RUN.json",
      observedGitContext: {
        worktreePath: "/workspace/skills",
        binding: "observation-only",
      },
      authorization: {
        standing: "authorization-consumed",
        authorizationId: executionAuthorizationId,
        proposalDigest: executionProposalDigest,
        sourcePath: "/home/state/execution-authorizations/authorization.json",
        consumption: {
          claimSourcePath: `/home/${executionClaimSourceRef}`,
        },
      },
    }],
  }],
  runners: [{
    live: true,
    sourcePath: "/home/runner.json",
    freshness: { kind: "live", observedAt: "2026-07-27T10:00:00Z" },
    status: {
      runnerId: "runner-a",
      missionId: "agent-run",
      state: "running",
      updatedAt: "2026-07-27T09:59:00Z",
    },
    binding: {
      kind: "project-mission",
      projectKey: "registered:skills",
      missionId: "agent-run",
    },
    activity: {
      currentTurn: {
        turnId: "turn-agent-run",
        launchAuthorizationRef: {
          authorizationId: executionAuthorizationId,
          proposalDigest: executionProposalDigest,
          claimSourceRef: executionClaimSourceRef,
        },
      },
      currentEffect: {
        effectId: "effect-agent-run",
        launchAuthorizationRef: {
          authorizationId: executionAuthorizationId,
          proposalDigest: executionProposalDigest,
          claimSourceRef: executionClaimSourceRef,
        },
      },
    },
  }, {
    live: null,
    sourcePath: "/home/unbound-runner.json",
    freshness: { kind: "cached", sourceUpdatedAt: "2026-07-27T09:50:00Z" },
    status: {
      runnerId: "runner-unbound",
      missionId: "unknown-mission",
      state: "running",
      updatedAt: "2026-07-27T09:50:00Z",
    },
    binding: {
      kind: "unbound",
      reason: "ambiguous-mission-id",
    },
  }],
  attention: [{
    priority: "principal-decision",
    code: "mission-execution-awaiting-authorization",
    summary: "执行提案等待 Principal 决策",
    projectKey: "registered:skills",
    missionId: "ui-redesign",
    source: "/workspace/skills/MISSION.json",
  }],
};

function exactTaskExecution(
  launchTask: unknown,
): {
  taskContext: WorkbenchTaskExecutionContextRef;
  link: typeof executionLink & { taskContext: WorkbenchTaskExecutionContextRef };
} {
  const taskContext = workbenchTaskExecutionContextRef(
    workbenchTaskExecutionContextFor(launchTask as never, executionSelector),
  );
  return {
    taskContext,
    link: { ...executionLink, taskContext },
  };
}

function snapshotWithTaskContext(
  source: any,
  taskContext: WorkbenchTaskExecutionContextRef,
  candidateWorktree?: string,
): any {
  return {
    ...source,
    projects: source.projects.map((project: any) => ({
      ...project,
      missions: project.missions.map((mission: any) =>
        mission.id !== "agent-run" || mission.authorization === undefined
          ? mission
          : {
            ...mission,
            authorization: {
              ...mission.authorization,
              consumption: {
                ...mission.authorization.consumption,
                ...(candidateWorktree === undefined
                  ? {}
                  : { candidateWorktree }),
                workbenchTaskContext: taskContext,
              },
            },
          }
      ),
    })),
    runners: source.runners.map((runner: any, index: number) =>
      index !== 0 || runner.activity === undefined
        ? runner
        : {
          ...runner,
          activity: {
            ...runner.activity,
            currentTurn: {
              ...runner.activity.currentTurn,
              workbenchTaskContext: taskContext,
            },
          },
        }
    ),
  };
}

describe("Workbench work-item shell projection", () => {
  test("keeps human decisions, live Agent work, and observation anomalies distinct", () => {
    const items = buildWorkItemProjection(snapshot as never).items;

    expect(items).toContainEqual(expect.objectContaining({
      kind: "decision",
      lifecycle: "waiting",
      nextActor: "principal",
      attention: "decision-required",
      projectKey: "registered:skills",
      missionId: "ui-redesign",
      actionLabel: "查看并决策",
    }));
    expect(items).toContainEqual(expect.objectContaining({
      kind: "agent-work",
      lifecycle: "in-progress",
      nextActor: "agent",
      runnerId: "runner-a",
      evidence: expect.objectContaining({
        freshness: expect.objectContaining({
          kind: "live",
        }),
      }),
    }));
    expect(items).toContainEqual(expect.objectContaining({
      kind: "observation",
      binding: expect.objectContaining({
        kind: "ambiguous",
      }),
      projectKey: null,
      runnerId: "runner-unbound",
    }));
    expect(items.some((item) =>
      item.kind === "independent" && item.runnerId === "runner-unbound"
    )).toBeFalse();
  });

  test("does not present a cached running record as Agent work", () => {
    const cached = {
      ...snapshot,
      attention: [],
      runners: [{
        ...snapshot.runners[0],
        live: false,
        freshness: {
          kind: "cached",
          sourceUpdatedAt: "2026-07-27T09:59:00Z",
        },
      }],
    };

    const items = buildWorkItemProjection(cached as never).items;
    expect(items.some((item) => item.kind === "agent-work")).toBeFalse();
    expect(items).toContainEqual(expect.objectContaining({
      kind: "mission",
      missionId: "agent-run",
      nextActor: "unknown",
    }));
  });

  test("reports an unavailable task source instead of claiming zero", () => {
    const projection = buildWorkItemProjection(snapshot as never);

    expect(projection.capabilities.independentTasks).toEqual({
      standing: "unavailable",
      count: null,
      sourceRevision: null,
      reason: "Principal task source was not observed.",
    });
    expect(projection.items.some((item) => item.kind === "principal-task")).toBeFalse();
  });

  test("joins the existing owner-backed attempt projection onto its Task detail", () => {
    const task = {
      id: "task-attempts",
      title: "Inspect ordinary task attempts",
      objective: "Expose existing attempt evidence without copying facts",
      acceptance: ["The owner projection remains attributable"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-attempts",
      },
      binding: { kind: "independent" as const },
      lifecycle: "open" as const,
      nextActor: "principal" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-08-12T18:00:00Z",
      updatedAt: "2026-08-12T18:00:00Z",
    };
    const attempts = {
      standing: "available" as const,
      sourceRef: taskAttemptsSourceRef,
      attempts: [{
        attemptId: "attempt-a",
        driver: "opencode-cli",
        model: "deepseek/deepseek-v4-flash",
        status: "started" as const,
        startedAt: "2026-08-12T18:01:00Z",
        inputRef: "state/task-attempts/attempt-a/cell-input.json",
        attemptRef: "state/task-attempts/attempt-a/attempt.json",
        finalRecordRef: "state/task-attempts/attempt-a/cell-input.run.json",
        settlementRef: "state/task-attempts/attempt-a/settlement.json",
        evidence: {
          attempt: { standing: "available" as const },
          finalRecord: { standing: "unavailable" as const },
          settlement: { standing: "unavailable" as const },
        },
      }],
    };

    const projection = buildWorkItemProjection(snapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 1,
        tasks: [task],
      },
    }, { [task.id]: attempts });
    const item = projection.items.find(
      (candidate) => candidate.id === `principal-task:${task.id}`,
    );

    expect(item?.taskDetail?.attempts).toBe(attempts);
    expect(item?.taskDetail?.task).toBe(task);
  });

  test("derives review current, stale, and unavailable from the observed bound Worktree HEAD", () => {
    const candidateCommit = "c".repeat(40);
    const otherCommit = "d".repeat(40);
    const task = {
      id: "task-reviewed-result",
      title: "Inspect one reviewed candidate",
      objective: "Derive freshness without storing it",
      acceptance: ["Freshness follows the bound Worktree HEAD"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:reviewed-result",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
      },
      lifecycle: "verifying" as const,
      nextActor: "principal" as const,
      revision: 3,
      corrections: [],
      executionLinks: [],
      resultClaims: [{
        id: "claim-reviewed-result",
        submittedAt: "2026-08-12T18:00:00Z",
        summary: "Candidate is ready.",
        evidenceRefs: ["git:candidate"],
        evidence: { kind: "agent-references-unverified" as const },
        sourceRef: "agent:producer",
        standing: "submitted" as const,
        reviews: [{
          id: "assessment-current",
          reviewedAt: "2026-08-12T18:05:00Z",
          resultClaimId: "claim-reviewed-result",
          producerAttemptId: "producer-attempt",
          reviewerRef: "reviewer:independent",
          independence: {
            basis: "independent-review-context" as const,
            sourceRef: "review-context:independent",
          },
          candidate: { kind: "git-commit" as const, commit: candidateCommit },
          verdict: "passed" as const,
          findings: ["No blocking findings."],
          evidenceRefs: ["review:current-head"],
        }],
        resolution: null,
      }],
      createdAt: "2026-08-12T17:00:00Z",
      updatedAt: "2026-08-12T18:05:00Z",
    };
    const withHead = (head: string | null, includeWorktree = true) => ({
      ...snapshot,
      projects: snapshot.projects.map((project) => ({
        ...project,
        worktrees: includeWorktree
          ? project.worktrees.map((worktree) =>
            worktree.path === "/workspace/skills-ui"
              ? { ...worktree, head, dirty: false, gitBranch: null }
              : worktree
          )
          : project.worktrees.filter((worktree) => worktree.path !== "/workspace/skills-ui"),
      })),
    });
    const project = (head: string | null, includeWorktree = true) =>
      buildWorkItemProjection(withHead(head, includeWorktree) as never, {
        standing: "available",
        sourceRef: "/home/state/tasks.json",
        source: {
          version: "rosso.principal-tasks.v1",
          sourceRevision: 3,
          tasks: [task],
        },
      }).items[0]!.taskDetail!.latestResultReview;

    expect(project(candidateCommit)).toMatchObject({
      standing: "available",
      independence: "independence-proven",
      freshness: { standing: "current", observedHead: candidateCommit },
    });
    expect(project(otherCommit)).toMatchObject({
      standing: "available",
      freshness: { standing: "stale", observedHead: otherCommit },
    });
    expect(project(null)).toMatchObject({
      standing: "available",
      freshness: { standing: "unavailable" },
    });
    expect(project(candidateCommit, false)).toMatchObject({
      standing: "available",
      freshness: { standing: "unavailable" },
    });
    const unprovenTask = {
      ...task,
      resultClaims: [{
        ...task.resultClaims[0]!,
        reviews: [{
          ...task.resultClaims[0]!.reviews[0]!,
          reviewerRef: "reviewer:name-does-not-prove-independence",
          independence: {
            basis: "unproven" as const,
            sourceRef: "review-context:unproven",
          },
        }],
      }],
    };
    const unproven = buildWorkItemProjection(withHead(candidateCommit) as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 3,
        tasks: [unprovenTask],
      },
    }).items[0]!.taskDetail!.latestResultReview;
    expect(unproven).toMatchObject({
      standing: "available",
      independence: "independence-unproven",
    });
  });

  test("joins Mission context and its current carrier without upgrading Agent responsibility into task execution", () => {
    const launchTask = {
      id: "task-a",
      title: "Implement the task UI",
      objective: "Close the daily task-management loop",
      acceptance: ["The result has inspectable evidence"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-a",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const exactExecution = exactTaskExecution(launchTask);
    const task = {
      ...launchTask,
      revision: 2,
      executionLinks: [exactExecution.link],
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const projection = buildWorkItemProjection(
      snapshotWithTaskContext(
        snapshot,
        exactExecution.taskContext,
        "/workspace/skills-ui",
      ) as never,
      {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [task],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-a",
      kind: "principal-task",
      nextActor: "agent",
      lifecycle: "open",
      projectKey: "registered:skills",
      missionId: "agent-run",
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: "task-a",
        projectContext: {
          projectKey: "registered:skills",
          authority: "context-only",
        },
      },
      worktreeContext: {
        path: "/workspace/skills-ui",
        relation: "task-context",
        authority: "observation-only",
        standing: "observed",
      },
      taskDetail: expect.objectContaining({
        ownership: "workbench-local",
        identityAssurance: "unverified-local-interaction",
        projectAuthority: "context-only",
        missionContext: {
          missionId: "agent-run",
          authority: "context-only",
          standing: "observed",
          sourceRef: "/workspace/skills/RUN.json",
          currentCarrier: {
            runnerId: "runner-a",
            state: "running",
            live: true,
            freshness: {
              kind: "live",
              observedAt: "2026-07-27T10:00:00Z",
            },
            sourceRef: "/home/runner.json",
            relation: "same-mission-current-carrier",
            executionStanding: "execution-unproven",
          },
        },
        executionContext: {
          latestLink: exactExecution.link,
          standing: "current-effect-exact",
          authorizationConsumption: {
            standing: "verified",
            sourceRefs: [
              "/workspace/skills/RUN.json",
              "/home/state/execution-authorizations/authorization.json",
              `/home/${executionClaimSourceRef}`,
            ],
          },
          currentTurn: {
            standing: "exact",
            sourceRefs: ["/home/runner.json", executionClaimSourceRef],
            guidance: {
              mode: "legacy-live-input",
              standing: "exact",
              correctionIds: [],
              missingCorrectionIds: [],
            },
          },
          currentEffect: {
            standing: "exact",
            sourceRefs: ["/home/runner.json", executionClaimSourceRef],
          },
          linkCandidate: null,
          launchCandidate: null,
          launchReadiness: {
            standing: "preparation-required",
            blockers: [{
              code: "execution-proposal-unavailable",
              message: expect.stringContaining("execution proposal"),
            }, {
              code: "clean-detached-worktree-required",
              message: expect.stringContaining("Git-clean"),
            }, {
              code: "live-carrier-present",
              message: expect.stringContaining("live carrier"),
            }],
          },
          correctionDeliveryCandidate: null,
          recoveryCandidate: null,
          verifiedResultCandidate: null,
        },
        latestResultVerification: { standing: "none" },
        worktreeAuthority: "observation-only",
        worktreeStanding: "observed",
      }),
    }));
    expect(projection.items.some((item) =>
      item.id === "principal-task:task-a" && item.kind === "agent-work"
    )).toBeFalse();
    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "runner:runner-a",
      kind: "agent-work",
      runnerId: "runner-a",
    }));
    expect(projection.capabilities.independentTasks).toEqual({
      standing: "available",
      count: 0,
      sourceRevision: 4,
    });
  });

  test("withholds task recovery when exact activity has no turn identity", () => {
    const launchTask = {
      id: "task-without-turn-id",
      title: "Recover an exact interrupted turn",
      objective: "Require an exact turn identity",
      acceptance: ["A missing turn ID withholds recovery"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-without-turn-id",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const exactExecution = exactTaskExecution(launchTask);
    const exactSnapshot = snapshotWithTaskContext(
      snapshot,
      exactExecution.taskContext,
      "/workspace/skills",
    );
    const runner = exactSnapshot.runners[0]!;
    const activity = runner.activity!;
    const projection = buildWorkItemProjection({
      ...exactSnapshot,
      runners: [{
        ...runner,
        status: {
          ...runner.status,
          state: "interrupted",
          recoveryCapabilities: {
            abandon: false,
            resume: true,
            replace: false,
          },
        },
        activity: {
          ...activity,
          currentTurn: {
            launchAuthorizationRef:
              activity.currentTurn.launchAuthorizationRef,
            workbenchTaskContext: activity.currentTurn.workbenchTaskContext,
          },
        },
      }],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [{
          ...launchTask,
          revision: 2,
          executionLinks: [exactExecution.link],
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });
    const item = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-without-turn-id",
    );

    expect(item?.taskDetail?.executionContext.currentTurn.standing).toBe(
      "exact",
    );
    expect(item?.taskDetail?.executionContext.recoveryCandidate).toBeNull();
  });

  test("withholds task recovery when the task declares no current Worktree", () => {
    const launchTask = {
      id: "task-without-current-worktree",
      title: "Require a Worktree for recovery",
      objective: "Do not recover from contextual project and Mission alone",
      acceptance: ["A missing task Worktree withholds recovery"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-without-current-worktree",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      worktreeRebindings: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const exactExecution = exactTaskExecution(launchTask);
    const exactSnapshot = snapshotWithTaskContext(
      snapshot,
      exactExecution.taskContext,
    );
    const runner = exactSnapshot.runners[0]!;
    const projection = buildWorkItemProjection({
      ...exactSnapshot,
      runners: [{
        ...runner,
        status: {
          ...runner.status,
          state: "interrupted",
          recoveryCapabilities: {
            abandon: false,
            resume: true,
            replace: false,
          },
        },
      }],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [{
          ...launchTask,
          revision: 2,
          executionLinks: [exactExecution.link],
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });
    const item = projection.items.find(
      (candidate) =>
        candidate.id === "principal-task:task-without-current-worktree",
    );

    expect(item?.taskDetail?.executionContext.currentTurn.standing).toBe(
      "exact",
    );
    expect(item?.taskDetail?.executionContext.recoveryCandidate).toBeNull();
  });

  test("withholds an old execution lineage after the task Worktree is rebound", () => {
    const launchTask = {
      id: "task-rebound-after-launch",
      title: "Rebind an interrupted task",
      objective: "Do not recover execution from the former Worktree",
      acceptance: ["The old execution lineage becomes unavailable"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-rebound-after-launch",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      worktreeRebindings: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const exactExecution = exactTaskExecution(launchTask);
    const oldLineageSnapshot = snapshotWithTaskContext({
      ...snapshot,
      projects: [{
        ...snapshot.projects[0],
        missions: snapshot.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              authorization: {
                ...mission.authorization,
                consumption: {
                  ...mission.authorization!.consumption,
                  candidateWorktree: "/workspace/skills",
                  candidateHead: "a".repeat(40),
                },
              },
            }
        ),
      }],
      runners: [{
        ...snapshot.runners[0],
        status: {
          ...snapshot.runners[0]!.status,
          state: "interrupted",
          recoveryCapabilities: {
            abandon: false,
            resume: true,
            replace: false,
          },
        },
        activity: {
          ...snapshot.runners[0]!.activity,
          currentEffect: {
            ...snapshot.runners[0]!.activity!.currentEffect,
            workspace: { root: "/workspace/skills" },
          },
          currentVerifiedResult: {
            standing: "verified-current",
            selector: {
              kind: "autonomy-effect-verification.v1",
              effectId: "effect-agent-run",
              verificationEventId: "verification-event-old-worktree",
            },
          },
        },
      }],
    }, exactExecution.taskContext);
    const reboundTask = {
      ...launchTask,
      binding: {
        ...launchTask.binding,
        worktreePath: "/workspace/skills-ui",
      },
      revision: 2,
      executionLinks: [exactExecution.link],
      worktreeRebindings: [{
        fromWorktreePath: "/workspace/skills",
        toWorktreePath: "/workspace/skills-ui",
        reboundAt: "2026-07-27T09:00:00Z",
        sourceRef: "conversation:task-rebound-after-launch",
      }],
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const projection = buildWorkItemProjection(oldLineageSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 5,
        tasks: [reboundTask],
      },
    });
    const executionContext = projection.items.find(
      (item) => item.id === `principal-task:${reboundTask.id}`,
    )!.taskDetail!.executionContext;

    expect(executionContext).toMatchObject({
      standing: "unavailable",
      authorizationConsumption: { standing: "unavailable" },
      currentTurn: { standing: "unavailable" },
      currentEffect: { standing: "unavailable" },
      recoveryCandidate: null,
      verifiedResultCandidate: null,
    });
  });

  test("offers one same-Mission consumption only to its exact task context", () => {
    const task = {
      id: "task-context-owner",
      title: "Own one exact consumed authorization",
      objective: "Bind this consumption to only its launch task",
      acceptance: ["A sibling task in the same Mission receives no link candidate"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-context-owner",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const sibling = {
      ...task,
      id: "task-context-sibling",
      title: "Sibling task in the same Mission",
      objective: "Remain distinct from the owner's execution",
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-context-sibling",
      },
    };
    const exactExecution = exactTaskExecution(task);
    const projection = buildWorkItemProjection(
      snapshotWithTaskContext(snapshot, exactExecution.taskContext) as never,
      {
        standing: "available",
        sourceRef: "/home/state/tasks.json",
        source: {
          version: "rosso.principal-tasks.v1",
          sourceRevision: 2,
          tasks: [task, sibling],
        },
      },
    );
    const contextFor = (taskId: string) => projection.items.find(
      (item) => item.id === `principal-task:${taskId}`,
    )!.taskDetail!.executionContext;

    expect(contextFor(task.id).linkCandidate).toMatchObject({
      authorizationId: executionAuthorizationId,
      proposalDigest: executionProposalDigest,
    });
    expect(contextFor(sibling.id).linkCandidate).toBeNull();
    expect(contextFor(sibling.id).recoveryCandidate).toBeNull();
    expect(contextFor(sibling.id).verifiedResultCandidate).toBeNull();
  });

  test("withholds a link candidate from legacy consumption without task context", () => {
    const task = {
      id: "task-legacy-consumption",
      title: "Inspect a legacy consumption claim",
      objective: "Do not bind a task from project and Mission alone",
      acceptance: ["Missing task context produces no execution candidate"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-legacy-consumption",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const projection = buildWorkItemProjection(snapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 1,
        tasks: [task],
      },
    });
    const executionContext = projection.items.find(
      (item) => item.id === `principal-task:${task.id}`,
    )!.taskDetail!.executionContext;

    expect(executionContext.linkCandidate).toBeNull();
    expect(executionContext.recoveryCandidate).toBeNull();
    expect(executionContext.verifiedResultCandidate).toBeNull();
  });

  test("offers runtime-verified submission only for the exact Autonomy selector and Worktree", () => {
    const verifiedSnapshot = {
      ...snapshot,
      projects: [{
        ...snapshot.projects[0],
        missions: snapshot.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              authorization: {
                ...mission.authorization,
                consumption: {
                  ...mission.authorization!.consumption,
                  candidateWorktree: "/workspace/skills-ui",
                  candidateHead: "a".repeat(40),
                },
              },
            }
        ),
      }],
      runners: [{
        ...snapshot.runners[0],
        activity: {
          ...snapshot.runners[0]!.activity,
          currentEffect: {
            ...snapshot.runners[0]!.activity!.currentEffect,
            workspace: { root: "/workspace/skills-ui" },
          },
          currentVerifiedResult: {
            standing: "verified-current",
            selector: {
              kind: "autonomy-effect-verification.v1",
              effectId: "effect-agent-run",
              verificationEventId: "verification-event-a",
            },
          },
        },
      }],
    };
    const task = {
      id: "task-verified",
      title: "Return verified result",
      objective: "Bind the task result to runtime verification",
      acceptance: ["The selector is runtime-owned"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-verified",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 2,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const exactExecution = exactTaskExecution({ ...task, revision: 1 });
    const linkedTask = {
      ...task,
      executionLinks: [exactExecution.link],
    };
    const exactVerifiedSnapshot = snapshotWithTaskContext(
      verifiedSnapshot,
      exactExecution.taskContext,
    );
    const projection = buildWorkItemProjection(exactVerifiedSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [linkedTask],
      },
    });
    const detail = projection.items.find(
      (item) => item.id === "principal-task:task-verified",
    )!.taskDetail!;

    expect(detail.executionContext.verifiedResultCandidate).toEqual({
      authorizationId: executionAuthorizationId,
      selector: {
        kind: "autonomy-effect-verification.v1",
        effectId: "effect-agent-run",
        verificationEventId: "verification-event-a",
      },
      evidenceRefs: ["/home/runner.json", executionClaimSourceRef],
    });

    const wrongWorktree = buildWorkItemProjection({
      ...exactVerifiedSnapshot,
      runners: [{
        ...exactVerifiedSnapshot.runners[0],
        activity: {
          ...exactVerifiedSnapshot.runners[0]!.activity,
          currentEffect: {
            ...exactVerifiedSnapshot.runners[0]!.activity!.currentEffect,
            workspace: { root: "/workspace/other" },
          },
        },
      }],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [linkedTask],
      },
    });
    expect(
      wrongWorktree.items.find(
        (item) => item.id === "principal-task:task-verified",
      )!.taskDetail!.executionContext.verifiedResultCandidate,
    ).toBeNull();
  });

  test("matches launch-snapshot guidance across later task revisions and defers a later correction", () => {
    const launchCorrection = {
      id: "correction-at-launch",
      statement: "Keep the personal editorial hierarchy primary.",
      sourceRef: "workbench-task:task-guided/correction:correction-at-launch",
    };
    const postLaunchCorrection = {
      id: "correction-after-launch",
      at: "2026-07-27T09:30:00Z",
      statement: "Keep Chinese prose continuous on mobile.",
      sourceRef: "workbench-task:task-guided/correction:correction-after-launch",
      deliveries: [],
    };
    const guidedTask = {
      id: "task-guided",
      title: "Run the corrected Blog task",
      objective: "Implement the personal Blog roundtrip",
      acceptance: ["The result is runtime verified"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:task-guided",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 4,
      corrections: [{
        ...launchCorrection,
        at: "2026-07-27T08:15:00Z",
        deliveries: [],
      }, postLaunchCorrection],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:30:00Z",
    };
    const launchTask = {
      ...guidedTask,
      revision: 2,
      corrections: [{
        ...launchCorrection,
        at: "2026-07-27T08:15:00Z",
        deliveries: [],
      }],
    };
    const launchContext = workbenchTaskExecutionContextFor(
      launchTask,
      executionSelector,
    );
    const exactExecution = exactTaskExecution(launchTask);
    const launchGuidance = workbenchTaskCorrectionGuidanceRefs(launchContext);
    const linkedGuidedTask = {
      ...guidedTask,
      executionLinks: [exactExecution.link],
    };
    const guidedSnapshot = {
      ...snapshot,
      projects: [{
        ...snapshot.projects[0],
        missions: snapshot.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              authorization: {
                ...mission.authorization,
                consumption: {
                  ...mission.authorization!.consumption,
                  candidateWorktree: "/workspace/skills-ui",
                  candidateHead: "a".repeat(40),
                },
              },
            }
        ),
      }],
      runners: [{
        ...snapshot.runners[0],
        activity: {
          ...snapshot.runners[0]!.activity,
          currentTurn: {
            ...snapshot.runners[0]!.activity!.currentTurn,
            guidanceRefs: launchGuidance,
          },
          currentEffect: {
            ...snapshot.runners[0]!.activity!.currentEffect,
            workspace: { root: "/workspace/skills-ui" },
          },
          currentVerifiedResult: {
            standing: "verified-current",
            selector: {
              kind: "autonomy-effect-verification.v1",
              effectId: "effect-agent-run",
              verificationEventId: "verification-event-a",
            },
          },
        },
      }],
    };
    const exactGuidedSnapshot = snapshotWithTaskContext(
      guidedSnapshot,
      exactExecution.taskContext,
    );

    const projection = buildWorkItemProjection(exactGuidedSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 7,
        tasks: [linkedGuidedTask],
      },
    });
    const executionContext = projection.items.find(
      (item) => item.id === "principal-task:task-guided",
    )!.taskDetail!.executionContext;

    expect(executionContext.currentTurn).toMatchObject({
      standing: "exact",
      guidance: {
        mode: "launch-snapshot",
        standing: "partial",
        correctionIds: ["correction-at-launch"],
        missingCorrectionIds: ["correction-after-launch"],
      },
    });
    expect(executionContext.correctionDeliveryCandidate).toBeNull();
    expect(executionContext.verifiedResultCandidate).toBeNull();
  });

  test("retains a missing Mission as unavailable task context without a carrier claim", () => {
    const projection = buildWorkItemProjection({
      ...snapshot,
      runners: [
        ...snapshot.runners,
        {
          live: true,
          sourcePath: "/home/stale-mission-runner.json",
          freshness: { kind: "live", observedAt: "2026-07-27T10:00:00Z" },
          status: {
            runnerId: "runner-stale-mission",
            missionId: "missing-mission",
            state: "running",
            updatedAt: "2026-07-27T09:59:00Z",
          },
          binding: {
            kind: "project-mission",
            projectKey: "registered:skills",
            missionId: "missing-mission",
          },
        },
      ],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 5,
        tasks: [{
          id: "task-stale-mission",
          title: "Inspect stale Mission context",
          objective: "Do not claim a missing Mission is currently available",
          acceptance: ["The stale Mission remains visibly unverified"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "workbench-ui:unverified-local-interaction",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            missionId: "missing-mission",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 1,
          corrections: [],
          executionLinks: [],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-stale-mission",
      missionId: "missing-mission",
      runnerId: null,
      taskDetail: expect.objectContaining({
        missionContext: {
          missionId: "missing-mission",
          authority: "context-only",
          standing: "unavailable",
          reason: expect.stringContaining("not in the project's current observed"),
          currentCarrier: null,
        },
      }),
    }));
  });

  test("keeps a legacy current turn execution-unproven when structured refs are absent", () => {
    const launchTask = {
      id: "task-legacy-execution",
      title: "Inspect legacy blog execution",
      objective: "Do not infer exact execution from an old Mission turn",
      acceptance: ["Legacy evidence remains explicitly unproven"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "workbench-ui:unverified-local-interaction",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:00:00Z",
    };
    const exactExecution = exactTaskExecution(launchTask);
    const exactSnapshot = snapshotWithTaskContext(
      snapshot,
      exactExecution.taskContext,
    );
    const liveRunner = exactSnapshot.runners[0]!;
    const projection = buildWorkItemProjection({
      ...exactSnapshot,
      runners: [{
        ...liveRunner,
        activity: {
          currentTurn: {
            turnId: "legacy-blog-turn",
          },
          currentEffect: {
            effectId: "legacy-blog-effect",
          },
        },
      }],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 7,
        tasks: [{
          ...launchTask,
          revision: 2,
          executionLinks: [exactExecution.link],
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-legacy-execution",
      lifecycle: "open",
      nextActor: "agent",
      runnerId: null,
      taskDetail: expect.objectContaining({
        executionContext: expect.objectContaining({
          standing: "legacy-unproven",
          authorizationConsumption: expect.objectContaining({
            standing: "verified",
          }),
          currentTurn: expect.objectContaining({
            standing: "legacy-unproven",
            reason: expect.stringContaining("no structured"),
          }),
          currentEffect: expect.objectContaining({
            standing: "legacy-unproven",
          }),
          linkCandidate: null,
          recoveryCandidate: null,
          verifiedResultCandidate: null,
        }),
      }),
    }));
  });

  test("keeps a historic execution link unavailable against the current consumed authorization", () => {
    const historicLink = {
      authorizationId: "22222222-2222-4222-8222-222222222222",
      proposalDigest: "b".repeat(64),
      claimSourceRef: "state/execution-authorization-claims/historic.json",
      linkedAt: "2026-07-26T08:30:00Z",
      sourceRef: "workbench-ui:unverified-local-interaction",
    };
    const projection = buildWorkItemProjection(snapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 8,
        tasks: [{
          id: "task-historic-execution",
          title: "Inspect historic execution link",
          objective: "Use only the current consumed authorization",
          acceptance: ["Historic execution is not presented as current"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "workbench-ui:unverified-local-interaction",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            missionId: "agent-run",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 3,
          corrections: [],
          executionLinks: [historicLink],
          resultClaims: [],
          createdAt: "2026-07-26T08:00:00Z",
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-historic-execution",
      lifecycle: "open",
      runnerId: null,
      taskDetail: expect.objectContaining({
        executionContext: expect.objectContaining({
          latestLink: historicLink,
          standing: "unavailable",
          authorizationConsumption: expect.objectContaining({
            standing: "unavailable",
            reason: expect.stringContaining("not the current Mission"),
          }),
          currentTurn: expect.objectContaining({
            standing: "unavailable",
          }),
          linkCandidate: null,
        }),
      }),
    }));
  });

  test("reports same-Mission carrier ambiguity instead of selecting one", () => {
    const liveRunner = snapshot.runners[0]!;
    const projection = buildWorkItemProjection({
      ...snapshot,
      runners: [
        liveRunner,
        {
          ...liveRunner,
          sourcePath: "/home/runner-b.json",
          status: {
            ...liveRunner.status,
            runnerId: "runner-b",
          },
        },
      ],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 6,
        tasks: [{
          id: "task-ambiguous-carrier",
          title: "Inspect carrier ambiguity",
          objective: "Do not pick one same-Mission carrier arbitrarily",
          acceptance: ["The task execution relationship remains unproven"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "workbench-ui:unverified-local-interaction",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            missionId: "agent-run",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 1,
          corrections: [],
          executionLinks: [],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-ambiguous-carrier",
      runnerId: null,
      taskDetail: expect.objectContaining({
        missionContext: expect.objectContaining({
          standing: "observed",
          currentCarrier: null,
          reason: expect.stringContaining("multiple current carriers"),
        }),
        executionContext: expect.objectContaining({
          standing: "unavailable",
          latestLink: null,
          linkCandidate: null,
        }),
      }),
    }));
  });

  test("retains a persisted Worktree only as unavailable expected context when it is no longer observed", () => {
    const projection = buildWorkItemProjection({
      ...snapshot,
      projects: [{
        ...snapshot.projects[0],
        worktrees: [{ path: "/workspace/skills" }],
      }],
    } as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 5,
        tasks: [{
          id: "task-stale-worktree",
          title: "Inspect stale task context",
          objective: "Do not claim a deleted Worktree is currently observed",
          acceptance: ["The stale context remains visible without observation authority"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "workbench-ui:unverified-local-interaction",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            worktreePath: "/workspace/skills-ui",
          },
          lifecycle: "open",
          nextActor: "principal",
          revision: 1,
          corrections: [],
          executionLinks: [],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
          updatedAt: "2026-07-27T09:00:00Z",
        }],
      },
    });

    expect(projection.items).toContainEqual(expect.objectContaining({
      id: "principal-task:task-stale-worktree",
      worktreeContext: {
        path: "/workspace/skills-ui",
        relation: "task-expected-context",
        authority: "unavailable",
        standing: "unavailable",
        reason: expect.stringContaining("not in the project's current observed"),
      },
      evidence: expect.objectContaining({
        freshness: expect.objectContaining({
          kind: "unverified",
          reason: expect.stringContaining("not in the project's current observed"),
        }),
      }),
      taskDetail: expect.objectContaining({
        worktreeAuthority: "unavailable",
        worktreeStanding: "unavailable",
        worktreeReason: expect.stringContaining("not in the project's current observed"),
        executionContext: expect.objectContaining({
          launchReadiness: {
            standing: "not-applicable",
            blockers: [],
          },
        }),
      }),
    }));
  });

  test("offers a launch candidate only for one open Agent task with an exact authorized Blog publication boundary", () => {
    const authorizationId = "33333333-3333-4333-8333-333333333333";
    const proposalDigest = "c".repeat(64);
    const receiptPath = "/home/receipts/execution-authorizations/blog-publication.json";
    const launchSnapshot = {
      ...snapshot,
      attention: [],
      runners: [],
      projects: [{
        ...snapshot.projects[0],
        worktrees: [{
          path: "/workspace/skills",
          head: "d".repeat(40),
          gitBranch: "main",
          dirty: false,
          registeredPrimary: true,
          locked: null,
          prunable: null,
        }, {
          path: "/workspace/skills-ui",
          head: "d".repeat(40),
          gitBranch: null,
          dirty: false,
          registeredPrimary: false,
          locked: null,
          prunable: null,
        }],
        missions: snapshot.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              observedGitContext: {
                ...mission.observedGitContext,
                head: "d".repeat(40),
              },
              executionProposal: {
                proposalDigest,
                runtimeRef: publicationRuntimeRef,
                runtimeDigest: publicationRuntimeDigest,
              },
              authorization: {
                standing: "authorized-awaiting-execution",
                authorizationId,
                proposalDigest,
                actorRef: "principal:test",
                sourceRef: "conversation:launch-blog-authorization",
                sourcePath: receiptPath,
              },
            }
        ),
      }],
    };
    const launchTask = {
      id: "task-launch-blog",
      title: "Launch the next Blog execution",
      objective: "Start one exact authorized Blog publication turn",
      acceptance: ["The launch remains bounded to the observed clean Worktree"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:launch-blog",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const projection = buildWorkItemProjection(launchSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 9,
        tasks: [launchTask],
      },
    });

    expect(
      projection.items.find(
        (item) => item.id === "principal-task:task-launch-blog",
      )!.taskDetail!.executionContext.launchCandidate,
    ).toEqual({
      authorizationId,
      proposalDigest,
      runtimeAdapterId: "agent-era-blog-publication-v1",
      anchorSeed: {
        version: "rosso.mission-anchor-seed.v1",
        id:
          `workbench-task-anchor-seed:task-launch-blog:${authorizationId}`,
        missionId: "agent-run",
        authorityRef: "principal:test",
        sourceRef: "conversation:launch-blog-authorization",
        anchor: {
          id: "workbench-task-anchor:task-launch-blog",
          revision: `mission-head:${"d".repeat(40)}:task-revision:1`,
          statement: [
            "Mission mainline: Execute one supervised Agent run",
            "Mission acceptance:",
            "- The run remains bounded to the Mission",
            "Workbench task objective: Start one exact authorized Blog publication turn",
            "Workbench task acceptance:",
            "- The launch remains bounded to the observed clean Worktree",
          ].join("\n"),
          sourceRefs: [
            "/workspace/skills/RUN.json",
            "/home/state/tasks.json",
            "conversation:launch-blog",
            receiptPath,
          ],
          reconciledWatermark: 0,
        },
      },
      worktreePath: "/workspace/skills-ui",
      receiptPath,
      runtimeRef: publicationRuntimeRef,
      runtimeDigest: publicationRuntimeDigest,
      evidenceRefs: [
        "/home/state/tasks.json",
        "/workspace/skills/RUN.json",
        receiptPath,
        "worktree:/workspace/skills-ui",
      ],
    });
    expect(
      projection.items.find(
        (item) => item.id === "principal-task:task-launch-blog",
      )!.taskDetail!.executionContext.launchReadiness,
    ).toEqual({
      standing: "ready",
      blockers: [],
    });
  });

  test("withholds launch when the Worktree is dirty or attached, a carrier is live, or the runtime adapter is not exact", () => {
    const authorizationId = "33333333-3333-4333-8333-333333333333";
    const proposalDigest = "c".repeat(64);
    const task = {
      id: "task-launch-counterexample",
      title: "Do not over-project a launch",
      objective: "Require every launch precondition",
      acceptance: ["No partial match becomes launch authority"],
      origin: {
        kind: "principal-explicit" as const,
        sourceRef: "conversation:launch-counterexample",
      },
      binding: {
        kind: "project-context" as const,
        projectId: "skills",
        worktreePath: "/workspace/skills-ui",
        missionId: "agent-run",
      },
      lifecycle: "open" as const,
      nextActor: "agent" as const,
      revision: 1,
      corrections: [],
      executionLinks: [],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const base = {
      ...snapshot,
      attention: [],
      runners: [],
      projects: [{
        ...snapshot.projects[0],
        worktrees: [{
          path: "/workspace/skills-ui",
          head: "d".repeat(40),
          gitBranch: null,
          dirty: false,
          registeredPrimary: false,
          locked: null,
          prunable: null,
        }],
        missions: snapshot.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              observedGitContext: {
                ...mission.observedGitContext,
                head: "d".repeat(40),
              },
              executionProposal: {
                proposalDigest,
                runtimeRef: publicationRuntimeRef,
                runtimeDigest: publicationRuntimeDigest,
              },
              authorization: {
                standing: "authorized-awaiting-execution",
                authorizationId,
                proposalDigest,
                actorRef: "principal:test",
                sourceRef: "conversation:launch-counterexample-authorization",
                sourcePath: "/home/receipts/blog.json",
              },
            }
        ),
      }],
    };
    const executionContextFor = (candidateSnapshot: unknown) =>
      buildWorkItemProjection(candidateSnapshot as never, {
        standing: "available",
        sourceRef: "/home/state/tasks.json",
        source: {
          version: "rosso.principal-tasks.v1",
          sourceRevision: 9,
          tasks: [task],
        },
      }).items.find(
        (item) => item.id === "principal-task:task-launch-counterexample",
      )!.taskDetail!.executionContext;
    const candidateFor = (candidateSnapshot: unknown) =>
      executionContextFor(candidateSnapshot).launchCandidate;

    expect(candidateFor({
      ...base,
      projects: [{
        ...base.projects[0],
        worktrees: [{ ...base.projects[0]!.worktrees[0], dirty: true }],
      }],
    })).toBeNull();
    expect(candidateFor({
      ...base,
      projects: [{
        ...base.projects[0],
        worktrees: [{
          ...base.projects[0]!.worktrees[0],
          gitBranch: "feature/not-detached",
        }],
      }],
    })).toBeNull();
    expect(candidateFor({
      ...base,
      projects: [{
        ...base.projects[0],
        worktrees: [{
          ...base.projects[0]!.worktrees[0],
          head: "e".repeat(40),
        }],
      }],
    })).toBeNull();
    expect(candidateFor({
      ...base,
      runners: [snapshot.runners[0]],
    })).toBeNull();
    expect(candidateFor({
      ...base,
      projects: [{
        ...base.projects[0],
        missions: base.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              executionProposal: {
                proposalDigest,
                runtimeDigest: publicationRuntimeDigest,
                runtimeRef: "source-project:operations/autonomy/experiments/other-runtime.ts",
              },
            }
        ),
      }],
    })).toBeNull();

    const currentStoppedConsumedContext = executionContextFor({
      ...base,
      runners: [{
        ...snapshot.runners[0],
        live: false,
        status: {
          ...snapshot.runners[0]!.status,
          state: "stopped",
        },
      }],
      projects: [{
        ...base.projects[0],
        worktrees: [{
          ...base.projects[0]!.worktrees[0],
          dirty: true,
        }],
        missions: base.projects[0]!.missions.map((mission) =>
          mission.id !== "agent-run"
            ? mission
            : {
              ...mission,
              authorization: {
                standing: "authorization-consumed",
                authorizationId,
                proposalDigest,
                sourcePath: "/home/receipts/blog.json",
                consumption: {
                  claimSourcePath: "/home/state/execution-authorization-claims/blog.json",
                },
              },
            }
        ),
      }],
    });
    expect(currentStoppedConsumedContext.launchCandidate).toBeNull();
    expect(currentStoppedConsumedContext.launchReadiness).toEqual({
      standing: "preparation-required",
      blockers: [{
        code: "fresh-authorization-required",
        message: expect.stringContaining("已经消费"),
      }, {
        code: "clean-detached-worktree-required",
        message: expect.stringContaining("Git-clean"),
      }],
    });
  });

  test("keeps system settlement as system work and Mission worktree context observational", () => {
    const projection = buildWorkItemProjection({
      ...snapshot,
      runners: [],
      attention: [{
        priority: "notice",
        code: "correction-awaiting-system-settlement",
        summary: "修正已验证，等待系统收束",
        projectKey: "registered:skills",
        missionId: "ui-redesign",
        source: "/workspace/skills/MISSION.json",
      }],
    } as never);

    expect(projection.items).toContainEqual(expect.objectContaining({
      kind: "system-work",
      nextActor: "system",
      lifecycle: "waiting",
    }));
    expect(projection.items).toContainEqual(expect.objectContaining({
      kind: "mission",
      missionId: "agent-run",
      binding: {
        kind: "project-mission",
        projectKey: "registered:skills",
        missionId: "agent-run",
      },
      worktreeContext: {
        path: "/workspace/skills",
        relation: "mission-observed-here",
        authority: "observation-only",
      },
    }));
  });
});
