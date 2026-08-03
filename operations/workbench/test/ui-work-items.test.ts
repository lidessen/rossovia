import { describe, expect, test } from "bun:test";
import { buildWorkItemProjection } from "../src/ui/work-items";
import { workbenchTaskCorrectionGuidanceRefs } from "../src/ui/task-execution-context";

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
      mainline: { status: "active" },
      sourcePath: "/workspace/skills/MISSION.json",
      observedGitContext: {
        worktreePath: "/workspace/skills-ui",
        binding: "observation-only",
      },
    }, {
      id: "agent-run",
      title: "运行验证",
      currentFocus: "执行真实探针",
      mainline: { status: "active" },
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

  test("joins Mission context and its current carrier without upgrading Agent responsibility into task execution", () => {
    const projection = buildWorkItemProjection(snapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [{
          id: "task-a",
          title: "Implement the task UI",
          objective: "Close the daily task-management loop",
          acceptance: ["The result has inspectable evidence"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "conversation:task-a",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            worktreePath: "/workspace/skills-ui",
            missionId: "agent-run",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 2,
          corrections: [],
          executionLinks: [executionLink],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
          updatedAt: "2026-07-27T09:00:00Z",
        }],
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
          latestLink: executionLink,
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
    const runner = snapshot.runners[0]!;
    const activity = runner.activity!;
    const projection = buildWorkItemProjection({
      ...snapshot,
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
          id: "task-without-turn-id",
          title: "Recover an exact interrupted turn",
          objective: "Require an exact turn identity",
          acceptance: ["A missing turn ID withholds recovery"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "conversation:task-without-turn-id",
          },
          binding: {
            kind: "project-context",
            projectId: "skills",
            missionId: "agent-run",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 2,
          corrections: [],
          executionLinks: [executionLink],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
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
      executionLinks: [executionLink],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:00:00Z",
    };
    const projection = buildWorkItemProjection(verifiedSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 4,
        tasks: [task],
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
      ...verifiedSnapshot,
      runners: [{
        ...verifiedSnapshot.runners[0],
        activity: {
          ...verifiedSnapshot.runners[0]!.activity,
          currentEffect: {
            ...verifiedSnapshot.runners[0]!.activity!.currentEffect,
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
        tasks: [task],
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
    const launchGuidance = workbenchTaskCorrectionGuidanceRefs({
      version: "rosso.workbench-task-execution-context.v1",
      taskId: "task-guided",
      sourceRevision: 3,
      taskRevision: 2,
      objective: "Implement the personal Blog roundtrip",
      acceptance: ["The result is runtime verified"],
      corrections: [launchCorrection],
      binding: {
        projectId: "skills",
        missionId: "agent-run",
      },
      execution: {
        authorizationId: executionAuthorizationId,
        proposalDigest: executionProposalDigest,
      },
    });
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
      executionLinks: [executionLink],
      resultClaims: [],
      createdAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T09:30:00Z",
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

    const projection = buildWorkItemProjection(guidedSnapshot as never, {
      standing: "available",
      sourceRef: "/home/state/tasks.json",
      source: {
        version: "rosso.principal-tasks.v1",
        sourceRevision: 7,
        tasks: [guidedTask],
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
    const liveRunner = snapshot.runners[0]!;
    const projection = buildWorkItemProjection({
      ...snapshot,
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
          id: "task-legacy-execution",
          title: "Inspect legacy blog execution",
          objective: "Do not infer exact execution from an old Mission turn",
          acceptance: ["Legacy evidence remains explicitly unproven"],
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
          revision: 2,
          corrections: [],
          executionLinks: [executionLink],
          resultClaims: [],
          createdAt: "2026-07-27T08:00:00Z",
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
          linkCandidate: expect.objectContaining({
            authorizationId: executionAuthorizationId,
          }),
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
          linkCandidate: {
            authorizationId: executionAuthorizationId,
            proposalDigest: executionProposalDigest,
            evidenceRefs: [
              "/workspace/skills/RUN.json",
              "/home/state/execution-authorizations/authorization.json",
              `/home/${executionClaimSourceRef}`,
            ],
          },
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
