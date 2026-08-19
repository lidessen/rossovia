import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  anchorMigrationDecisionBriefPresentation,
  candidateEvidencePresentation,
  correctionPresentation,
  isIndependentWorkbenchTask,
  reconciliationActionDecisionBriefPresentation,
  runnerPresentation,
  verifiedCorrectionAwaitsSystemSettlement,
} from "../ui/operational-semantics.js";
import {
  refineLiveRunnerAttention,
  validateRunnerActivityProjection,
} from "../src/ui/server";
import {
  WorkbenchRunnerActivityProjectionSchema,
} from "../src/ui/projection";

const app = readFileSync(resolve(import.meta.dir, "../ui/app.js"), "utf8");
const html = readFileSync(resolve(import.meta.dir, "../ui/index.html"), "utf8");
const styles = readFileSync(resolve(import.meta.dir, "../ui/styles.css"), "utf8");

const correction = {
  correctionId: "blog-index-import-v1",
  actorRef: "principal:lidessen",
  sourceRef: "conversation:option-a",
  cause: {
    effectId: "failed-effect",
  },
  scope: {
    writePaths: ["db/schema.ts"],
    externalDisclosure: "none",
  },
  state: "verification-passed",
  execution: null,
  verification: {
    verdict: "passed",
  },
  authority: {
    commit: "withheld",
    merge: "withheld",
    publish: "withheld",
    productAcceptance: "withheld",
  },
  stale: false,
};

const failedEffect = {
  effectId: "failed-effect",
  verification: {
    independent: {
      verdict: "failed",
    },
  },
};

function pendingRunner(live: boolean | null) {
  return {
    sourcePath: "/home/runner-status.json",
    status: {
      version: "rosso.mission-runner.v1" as const,
      runnerId: "runner-a",
      missionId: "mission-a",
      pid: 123,
      state: "input-pending" as const,
      startedAt: "2026-07-27T08:00:00Z",
      updatedAt: "2026-07-27T08:01:00Z",
      inputWatermark: 1,
      reconciledWatermark: 0,
      socketPath: "/tmp/runner.sock",
      stopReason: null,
    },
    binding: {
      kind: "project-mission" as const,
      projectKey: "registered:project-a",
      registeredProjectId: "project-a",
      missionId: "mission-a",
    },
    live,
    activity: {
      intentLineage: {
        standing: "seeded",
        activeAnchor: {
          id: "anchor:mission-a",
          revision: "r1",
          reconciledWatermark: 0,
        },
      },
      currentCorrection: correction,
    },
  };
}

describe("Principal Workbench operational semantics", () => {
  test("recognizes only explicitly unscoped Workbench tasks as independent", () => {
    expect(isIndependentWorkbenchTask({
      binding: {
        kind: "workbench-task",
        projectContext: null,
      },
    })).toBe(true);
    expect(isIndependentWorkbenchTask({
      binding: {
        kind: "workbench-task",
        projectContext: {
          projectId: "project-a",
        },
      },
    })).toBe(false);
    expect(isIndependentWorkbenchTask({
      binding: {
        kind: "mission",
        projectContext: null,
      },
    })).toBe(false);
    expect(isIndependentWorkbenchTask({
      binding: {
        kind: "workbench-task",
      },
    })).toBe(false);
  });

  test("forms a current Candidate conclusion only from an exact worktree, effect, correction, report, and authority join", () => {
    const effect = {
      ...failedEffect,
      workspace: {
        root: "/worktrees/candidate-1",
      },
      stale: true,
    };
    const currentCorrection = {
      ...correction,
      recordedAt: "2026-07-27T08:38:40.111Z",
      changedFromFailedSubject: ["db/schema.ts"],
      verification: {
        verdict: "passed",
        reportRef: "file:correction-report.json",
        reportDigest: "a".repeat(64),
      },
    };
    const worktrees = [{
      path: "/worktrees/candidate-1",
      gitBranch: null,
      head: "63e7aae",
      dirty: true,
    }];

    expect(candidateEvidencePresentation(
      worktrees,
      {
        currentEffect: effect,
        currentCorrection,
      },
      "2026-07-27T12:45:21.681Z",
    )).toMatchObject({
      standing: "verified-correction",
      headline: "修正验证通过 · 尚未集成",
      candidate: {
        path: "/worktrees/candidate-1",
        branch: "detached",
        head: "63e7aae",
        dirty: true,
      },
      changedPaths: ["db/schema.ts"],
      recordedAt: "2026-07-27T08:38:40.111Z",
      observedAt: "2026-07-27T12:45:21.681Z",
      boundary:
        "commit withheld · merge withheld · publish withheld · product acceptance withheld",
    });
    expect(candidateEvidencePresentation(
      [{ ...worktrees[0], path: "/worktrees/other" }],
      {
        currentEffect: effect,
        currentCorrection,
      },
      "2026-07-27T12:45:21.681Z",
    )).toMatchObject({
      standing: "unavailable",
      reason: expect.stringContaining("无精确匹配"),
    });
    expect(candidateEvidencePresentation(
      worktrees,
      {
        currentEffect: effect,
        currentCorrection: {
          ...currentCorrection,
          authority: {
            ...currentCorrection.authority,
            productAcceptance: "granted",
          },
        },
      },
      "2026-07-27T12:45:21.681Z",
    )).toMatchObject({
      standing: "unavailable",
      reason: expect.stringContaining("withheld authority"),
    });
  });

  test("keeps Candidate evidence one click from the Principal snapshot and exposes no integration action", () => {
    expect(html).toContain('href="#candidate-evidence">Candidate</a>');
    expect(html).toContain('id="candidate-evidence"');
    expect(app).toContain("candidateEvidencePresentation");
    expect(app).not.toMatch(/data-(?:control|recovery)="(?:commit|push|merge|publish|accept-product)"/);
  });

  test("makes stale correction evidence override a previously passed verdict", () => {
    expect(correctionPresentation({
      ...correction,
      stale: true,
    }, failedEffect)).toMatchObject({
      standing: "stale",
      verdict: "passed",
      causeVerdict: "failed",
    });
  });

  test("fails closed on missing authority and never invents the cause verdict", () => {
    const { authority: _authority, ...missingAuthority } = correction;
    expect(correctionPresentation(missingAuthority, null)).toMatchObject({
      standing: "invalid",
      causeVerdict: null,
      boundary: expect.stringContaining("evidence missing/conflicting"),
    });
    expect(correctionPresentation(correction, null).attribution).toBe(
      "input actor principal:lidessen · input source conversation:option-a · executor 未保留",
    );
    expect(correctionPresentation({
      ...correction,
      execution: {
        executorRef: "agent:bounded-applier",
        patchRef: "file:correction.patch",
        patchDigest: "a".repeat(64),
        manifestRef: "file:correction.manifest.json",
        manifestDigest: "b".repeat(64),
      },
    }, null)).toMatchObject({
      attribution:
        "input actor principal:lidessen · input source conversation:option-a · executor agent:bounded-applier",
      executionEvidence: "patch aaaaaaaaaaaa · manifest bbbbbbbbbbbb",
    });
  });

  test("marks a malformed correction explicitly at the live activity boundary", () => {
    const { authority: _authority, ...missingAuthority } = correction;
    expect(validateRunnerActivityProjection({
      source: "mission-timeline",
      intentLineage: {
        standing: "seeded",
        activeAnchor: {
          id: "anchor:mission-a",
          revision: "r1",
          reconciledWatermark: 0,
        },
      },
      currentCorrection: missingAuthority,
      recentCorrections: [],
    }, "2026-07-27T09:00:00Z")).toMatchObject({
      source: "mission-timeline",
      observedAt: "2026-07-27T09:00:00Z",
      currentCorrection: null,
      recentCorrections: [],
      error: expect.stringContaining("activity projection rejected"),
    });
  });

  test("presents a dead cached runner as unreachable rather than actively reconciling", () => {
    expect(runnerPresentation(pendingRunner(false))).toEqual({
      mode: "carrier-unreachable",
      cachedMode: "input-pending",
      live: false,
    });
  });

  test("keeps observer uncertainty distinct from a dead carrier and withholds reply authority", () => {
    const runner = {
      ...pendingRunner(null),
      activity: legacyActivityWithProposal(),
    };
    expect(runnerPresentation(runner)).toMatchObject({
      mode: "anchor-pending",
      cachedMode: "input-pending",
      live: null,
    });
    expect(anchorMigrationDecisionBriefPresentation(
      runner.activity,
      runner,
      exactMigrationSource(),
    )).toMatchObject({
      standing: "stale",
      decisionable: false,
    });
    expect(refineLiveRunnerAttention([], [runner])).toContainEqual(
      expect.objectContaining({
        priority: "warning",
        code: "runner-reachability-unverified",
        summary: expect.stringContaining("could not be verified"),
      }),
    );
    expect(app).toContain("载体可达性未验证");
  });

  test("keeps reachability uncertainty visible even when cached state says stopped", () => {
    const runner = {
      ...pendingRunner(null),
      status: {
        ...pendingRunner(null).status,
        state: "stopped" as const,
        stopReason: "runner-shutdown" as const,
      },
    };
    expect(refineLiveRunnerAttention([], [runner])).toContainEqual(
      expect.objectContaining({
        code: "runner-reachability-unverified",
      }),
    );
  });

  test("classifies a verified correction awaiting settlement as system work, not a Principal decision", () => {
    const runner = pendingRunner(false);
    expect(verifiedCorrectionAwaitsSystemSettlement(runner)).toBe(true);
    const attention = refineLiveRunnerAttention([{
      priority: "principal-decision",
      code: "runner-input-pending",
      summary: "Mission mission-a has unreconciled Principal input",
      projectKey: "registered:project-a",
      missionId: "mission-a",
      source: runner.sourcePath,
    }], [runner]);
    expect(attention).toContainEqual(expect.objectContaining({
      priority: "notice",
      code: "correction-awaiting-system-settlement",
      summary: expect.stringContaining("no new Principal decision"),
    }));
    expect(attention).toContainEqual(expect.objectContaining({
      priority: "warning",
      code: "runner-unreachable",
      summary: expect.stringContaining("cached state only"),
    }));
    expect(attention).not.toContainEqual(expect.objectContaining({
      priority: "principal-decision",
      code: "runner-input-pending",
    }));
  });

  test("lets full Mission lineage override an old live input-pending cache", () => {
    const runner = {
      ...pendingRunner(true),
      activity: {
        ...pendingRunner(true).activity,
        intentLineage: {
          standing: "legacy-unanchored",
          activeAnchor: null,
          priorEventCount: 5,
          priorTimelineDigest: "d".repeat(64),
        },
      },
    };

    expect(runnerPresentation(runner)).toMatchObject({
      mode: "anchor-pending",
      cachedMode: "input-pending",
      live: true,
      intentLineage: "legacy-unanchored",
    });
    expect(verifiedCorrectionAwaitsSystemSettlement(runner)).toBe(false);

    const attention = refineLiveRunnerAttention([{
      priority: "principal-decision",
      code: "runner-input-pending",
      summary: "Mission mission-a has unreconciled Principal input",
      projectKey: "registered:project-a",
      missionId: "mission-a",
      source: runner.sourcePath,
    }], [runner]);
    expect(attention).toContainEqual(expect.objectContaining({
      priority: "warning",
      code: "runner-legacy-unanchored",
      summary: expect.stringContaining("5 个 legacy 事件"),
    }));
    expect(attention).not.toContainEqual(expect.objectContaining({
      code: "correction-awaiting-system-settlement",
    }));
  });

  test("projects exact migration-action authority without presenting the proposal view as effect-free", () => {
    const runner = {
      ...pendingRunner(true),
      activity: legacyActivityWithProposal(),
    };
    expect(WorkbenchRunnerActivityProjectionSchema.safeParse(
      runner.activity,
    ).success).toBe(true);
    const brief = anchorMigrationDecisionBriefPresentation(
      runner.activity,
      runner,
      exactMigrationSource(),
    );
    expect(brief).toMatchObject({
      standing: "awaiting-principal-decision",
      decisionable: true,
      recommendation: "AUTHORIZE MIGRATION",
      replyKey: "AUTHORIZE MIGRATION|HOLD",
      normalizedProtocolChoice: "ADOPT",
      migrationPath: "legacy-compatibility-saga",
      atomicAvailability: "atomic unavailable · runtime mode unreported",
      target: "runner-a · pid 123 · 2026-07-27T08:00:00Z\n/tmp/runner.sock\ninput-pending · live",
      history: `5 Mission events · ${"d".repeat(64)}`,
      effects: [
        "shutdown the current carrier",
        "start a no-runtime replacement carrier",
        "append the exact Intent Anchor to the Mission timeline",
      ],
      steps: [
        "request-unguarded-shutdown",
        "verify-exact-shutdown-response",
        "wait-exact-socket-release",
        "start-no-runtime-carrier",
        "append-exact-legacy-anchor",
      ],
      residualRisk: expect.stringContaining("非原子兼容迁移"),
      boundary: expect.stringContaining("reconciliation"),
      options: {
        AUTHORIZE_MIGRATION: {
          immediateResult: "Replace the exact carrier and append the anchor.",
          tradeoff: "Recovery requires a new AUTHORIZE MIGRATION.",
        },
        HOLD: {
          immediateResult: "Perform no mutation.",
          tradeoff: "Semantic work remains blocked.",
        },
      },
    });
    const briefHtml = html.slice(
      html.indexOf('id="anchor-migration-brief"'),
      html.indexOf('id="intent-lineage-boundary"'),
    );
    expect(briefHtml).not.toMatch(/<(?:form|button|input)\b/);
    expect(briefHtml).toContain("<code>AUTHORIZE MIGRATION</code>");
    expect(briefHtml).toContain("<code>HOLD</code>");
    expect(briefHtml).toContain('id="anchor-migration-effects"');
    expect(briefHtml).toContain('id="anchor-migration-steps"');
    expect(briefHtml).toContain('id="anchor-migration-risk"');
    expect(briefHtml).toContain("此界面只读，不会提交");
    expect(briefHtml).toContain("规范化为历史协议值");
    expect(app).toContain(
      'primaryAttentionCode === "runner-anchor-migration-decision"',
    );
    expect(app).toContain(
      "Intent Anchor 迁移等待 AUTHORIZE MIGRATION / HOLD",
    );
    expect(app).not.toContain("anchor-migration-settlement");
  });

  test("projects one exact two-Cell reconciliation brief and promotes only its current reply key", () => {
    const runner = reconciliationRunner();
    expect(WorkbenchRunnerActivityProjectionSchema.safeParse(
      runner.activity,
    ).success).toBe(true);
    const brief = reconciliationActionDecisionBriefPresentation(
      runner.activity,
      runner,
      exactMigrationSource(),
    );
    expect(brief).toMatchObject({
      standing: "awaiting-principal-decision",
      decisionable: true,
      proposalId: "mission-a-reconciliation-wm1-v1",
      proposalDigest: "e".repeat(64),
      recommendation: "SETTLE_CONTINUE",
      replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD",
      execution: expect.stringContaining(
        "codex-cli 0.145.0 · app-server-no-environment-structured-output-plan-only-v1",
      ),
      disclosure: expect.stringContaining("repository files none"),
      condition: expect.stringContaining("proposer=continue"),
      boundary: expect.stringContaining("product acceptance withheld"),
    });
    const attention = refineLiveRunnerAttention([{
      priority: "principal-decision",
      code: "runner-input-pending",
      summary: "Mission mission-a has unreconciled Principal input",
      projectKey: "registered:project-a",
      missionId: "mission-a",
      source: runner.sourcePath,
    }], [runner]);
    expect(attention).toContainEqual(expect.objectContaining({
      priority: "principal-decision",
      code: "runner-reconciliation-decision",
      summary: expect.stringContaining(
        "SETTLE_CONTINUE / RECLASSIFY_CORRECTION / HOLD",
      ),
    }));

    const briefHtml = html.slice(
      html.indexOf('id="reconciliation-action"'),
      html.indexOf('id="execution-proposal"'),
    );
    expect(briefHtml).not.toMatch(/<(?:form|button|input)\b/);
    expect(briefHtml).toContain("<code>SETTLE_CONTINUE</code>");
    expect(briefHtml).toContain("<code>RECLASSIFY_CORRECTION</code>");
    expect(briefHtml).toContain("<code>HOLD</code>");
    expect(html).toContain('href="#reconciliation-action">Reconcile</a>');
    expect(app).toContain("renderReconciliationAction");

    expect(reconciliationActionDecisionBriefPresentation(
      runner.activity,
      {
        ...runner,
        status: { ...runner.status, runnerId: "replacement-runner" },
      },
      exactMigrationSource(),
    )).toMatchObject({
      standing: "stale",
      decisionable: false,
    });
  });

  test("promotes an atomic proposal on an anchor-pending observation carrier into Principal attention", () => {
    const baseActivity = legacyActivityWithProposal();
    const baseProposal = baseActivity.anchorMigrationProposal.proposal;
    const runner = {
      ...pendingRunner(true),
      status: {
        ...pendingRunner(true).status,
        state: "anchor-pending" as const,
        runtimeMode: "none" as const,
      },
      activity: {
        ...baseActivity,
        anchorMigrationProposal: {
          ...baseActivity.anchorMigrationProposal,
          proposal: {
            ...baseProposal,
            proposalId: "mission-a-anchor-migration-v2",
            target: {
              ...baseProposal.target,
              state: "anchor-pending",
              protocolCapability: "atomic-adopt-retire-v1",
            },
            executionSequence: [
              "append-anchor-and-retire-exact-carrier",
              "start-no-runtime-carrier",
            ],
            residualRisk: {
              kind: "none",
              consequence: "none",
              reopenOn: "target-source-or-history-drift",
            },
          },
        },
      },
      anchorMigrationSource: exactMigrationSource(),
    };

    expect(refineLiveRunnerAttention([{
      priority: "principal-decision",
      code: "runner-anchor-pending",
      summary: "Mission mission-a has no authorized intent anchor",
      projectKey: "registered:project-a",
      missionId: "mission-a",
      source: runner.sourcePath,
    }], [runner])).toContainEqual(expect.objectContaining({
      priority: "principal-decision",
      code: "runner-anchor-migration-decision",
      summary: expect.stringContaining("mission-a-anchor-migration-v2"),
    }));
  });

  test("removes the reply key when runner or timeline binding drifts", () => {
    const activity = legacyActivityWithProposal();
    expect(anchorMigrationDecisionBriefPresentation(
      activity,
      {
        ...pendingRunner(true),
        status: {
          ...pendingRunner(true).status,
          runnerId: "replacement-runner",
        },
      },
      exactMigrationSource(),
    )).toMatchObject({
      standing: "stale",
      decisionable: false,
    });
    expect(anchorMigrationDecisionBriefPresentation({
      ...activity,
      intentLineage: {
        ...activity.intentLineage,
        priorTimelineDigest: "e".repeat(64),
      },
    }, pendingRunner(true), exactMigrationSource())).toMatchObject({
      standing: "stale",
      decisionable: false,
    });
    expect(anchorMigrationDecisionBriefPresentation(
      activity,
      {
        ...pendingRunner(true),
        status: {
          ...pendingRunner(true).status,
          runtimeMode: "none",
        },
      },
      exactMigrationSource(),
    )).toMatchObject({
      standing: "stale",
      decisionable: false,
    });
    expect(anchorMigrationDecisionBriefPresentation(
      activity,
      pendingRunner(true),
      {
        ...exactMigrationSource(),
        gitHead: "c".repeat(64),
      },
    )).toMatchObject({
      standing: "stale",
      decisionable: false,
      reason: "the committed primary Mission source no longer matches",
    });
    expect(anchorMigrationDecisionBriefPresentation({
      ...activity,
      anchorMigrationProposal: {
        standing: "stale",
        proposalId: "mission-a-anchor-migration-v1",
        proposalDigest: "a".repeat(64),
        reason: "proposal attempt was invalidated: shutdown-response-uncertain",
      },
    }, pendingRunner(true), exactMigrationSource())).toEqual({
      standing: "stale",
      decisionable: false,
      reason: "proposal attempt was invalidated: shutdown-response-uncertain",
    });
  });

  test("keeps anchor migration blocked and idle explicitly outside production in the UI", () => {
    expect(app).toContain('heading: "等待 Principal 完成 Intent Anchor 迁移门"');
    expect(app).toContain('const ordinaryInteractionBlocked = mode === "anchor-pending"');
    expect(app).toContain("普通补充、控制与恢复均禁用");
    expect(html).toContain('id="intent-lineage-gate"');
    expect(html).toContain("Lineage authority");
    expect(app).toContain("当前没有迁移行动被授权");
    expect(app).toContain("不从 recentEvents 或 runner cache 猜测");
    expect(app).toContain('heading: "无当前执行者；载体未在生产"');
    expect(app).toContain("提交不会启动生产");
    expect(styles).toContain('.mode-signal[data-mode="anchor-pending"]');
    expect(styles).toContain(".intent-lineage-gate");
    expect(styles).toContain('.operation-pulse[data-mode="idle"]');
  });
});

function legacyActivityWithProposal() {
  return {
    intentLineage: {
      standing: "legacy-unanchored",
      activeAnchor: null,
      priorEventCount: 5,
      priorTimelineDigest: "d".repeat(64),
    },
    anchorMigrationProposal: {
      standing: "awaiting-principal-decision",
      proposalDigest: "a".repeat(64),
      proposal: {
        version: "rosso.mission-anchor-migration-proposal.v1",
        proposalId: "mission-a-anchor-migration-v1",
        missionId: "mission-a",
        preparedAt: "2026-07-27T10:00:00Z",
        preparedBy: "supervisor:Codex",
        missionSource: {
          projectId: "project-a",
          relativePath: "apps/missions/mission-a.json",
          gitHead: "b".repeat(64),
        },
        target: {
          runnerId: "runner-a",
          pid: 123,
          startedAt: "2026-07-27T08:00:00Z",
          socketPath: "/tmp/runner.sock",
          state: "input-pending",
          live: true,
          protocolCapability: "legacy-response-verified-shutdown-v1",
        },
        retainedHistory: {
          eventCount: 5,
          timelineDigest: "d".repeat(64),
        },
        proposedAdoption: {
          adoptionId: "mission-a-anchor-adoption-v1",
          semanticSourceRef: "mission:mission-a",
          anchor: {
            id: "anchor:mission-a",
            revision: "legacy-adoption-r1",
            statement: "Continue the exact supervised Mission.",
            sourceRefs: ["mission:mission-a"],
            reconciledWatermark: 0,
          },
        },
        executionSequence: [
          "request-unguarded-shutdown",
          "verify-exact-shutdown-response",
          "wait-exact-socket-release",
          "start-no-runtime-carrier",
          "append-exact-legacy-anchor",
        ],
        residualRisk: {
          kind: "post-effect-carrier-identity-verification",
          consequence: "reversible-carrier-stop",
          reopenOn: "attempt-response-socket-target-or-history-uncertainty",
        },
        decision: {
          recommendation: "ADOPT",
          replyKey: "ADOPT|HOLD",
          options: {
            ADOPT: {
              immediateResult: "Replace the exact carrier and append the anchor.",
              tradeoff: "Recovery requires a new ADOPT.",
            },
            HOLD: {
              immediateResult: "Perform no mutation.",
              tradeoff: "Semantic work remains blocked.",
            },
          },
        },
        authorityBoundary: {
          standing: "proposal-only",
          carrierReplacement: "withheld",
          adoption: "withheld",
          reconciliation: "withheld",
          externalDisclosure: "none",
          candidateWrite: "withheld",
          commit: "withheld",
          merge: "withheld",
          publish: "withheld",
          productAcceptance: "withheld",
        },
      },
    },
  } as const;
}

function exactMigrationSource() {
  return {
    standing: "committed-primary",
    projectId: "project-a",
    relativePath: "apps/missions/mission-a.json",
    gitHead: "b".repeat(64),
  } as const;
}

function reconciliationRunner() {
  const reportRef =
    `file:correction-artifacts/${"c".repeat(64)}/independent/${"f".repeat(64)}.json`;
  const base = pendingRunner(true);
  return {
    ...base,
    status: {
      ...base.status,
      runtimeMode: "none" as const,
    },
    anchorMigrationSource: exactMigrationSource(),
    activity: {
      ...base.activity,
      anchorMigrationProposal: null,
      currentCorrection: {
        ...correction,
        correctionId: "input-1",
        inputId: "input-1",
        inputEventId: "event-1",
        recordedAt: "2026-07-27T08:02:00Z",
        changedFromFailedSubject: ["db/schema.ts"],
        cause: {
          effectId: "failed-effect",
          failedReportRef: "file:failed-report.json",
          failedReportDigest: "9".repeat(64),
        },
        verification: {
          verifierRef: "supervisor:test",
          verdict: "passed",
          reportRef,
          reportDigest: "f".repeat(64),
        },
      },
      reconciliationAction: {
        standing: "awaiting-principal-decision",
        proposalDigest: "e".repeat(64),
        proposal: {
          version: "rosso.mission-reconciliation-action-proposal.v1",
          proposalId: "mission-a-reconciliation-wm1-v1",
          missionId: "mission-a",
          missionSource: {
            projectId: "project-a",
            relativePath: "apps/missions/mission-a.json",
            gitHead: "b".repeat(64),
          },
          target: {
            runnerId: "runner-a",
            pid: 123,
            startedAt: "2026-07-27T08:00:00Z",
            socketPath: "/tmp/runner.sock",
            state: "input-pending",
            live: true,
            runtimeMode: "none",
            inputWatermark: 1,
            reconciledWatermark: 0,
          },
          lineage: {
            anchor: {
              id: "anchor:mission-a",
              revision: "r1",
              statement: "Continue the supervised Mission.",
              sourceRefs: ["mission:mission-a"],
              reconciledWatermark: 0,
            },
            anchorDigest: "a".repeat(64),
          },
          input: {
            inputId: "input-1",
            eventId: "event-1",
            watermark: 1,
            sourceRef: "conversation:input-1",
          },
          correctionEvidence: {
            reportRef,
            reportDigest: "f".repeat(64),
          },
          execution: {
            adapter: "codex-app-server.v1",
            carrier: {
              canonicalExecutable: "/fixture/bin/codex",
              version: "codex-cli 0.145.0",
              toolPolicy:
                "app-server-no-environment-structured-output-plan-only-v1",
            },
            profile: {
              provider: "openai",
              model: "gpt-5.6-sol",
            },
            invocations: 2,
            isolation: "fresh-disposable-no-environment",
            maxDurationMsPerCell: 120_000,
            externalDisclosure: {
              provider: "openai",
              data: [
                "active-intent-anchor",
                "watermark-1-correction-input",
                "reconciliation-proposal-to-independent-verifier",
                "bounded-work-cell-envelope-without-workspace-or-host-budget",
                "pinned-codex-system-developer-and-output-schema-context",
              ],
              repositoryFiles: "none",
              candidateFiles: "none",
            },
          },
          conditionalSettlement: {
            proposalDisposition: "continue",
            verificationVerdict: "verified-transition",
            nextAnchor: {
              id: "anchor:mission-a",
              revision: "r1+wm1",
              statement: "Continue the supervised Mission.",
              sourceRefs: ["mission:mission-a", "conversation:input-1"],
              reconciledWatermark: 1,
            },
            otherwise: "return-to-principal-without-commit",
          },
          decision: {
            recommendation: "SETTLE_CONTINUE",
            replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD",
            options: {
              SETTLE_CONTINUE: {
                immediateResult: "Run two Cells and conditionally settle.",
                tradeoff: "Exact source material is disclosed to OpenAI.",
              },
              RECLASSIFY_CORRECTION: {
                immediateResult: "Reopen the Mission invariant.",
                tradeoff: "A new brief is required.",
              },
              HOLD: {
                immediateResult: "Perform no action.",
                tradeoff: "Mission remains input-pending.",
              },
            },
          },
          authorityBoundary: {
            standing: "proposal-only",
            modelExecution: "withheld",
            externalDisclosure: "withheld",
            reconciliation: "withheld",
            candidateWrite: "withheld",
            commit: "withheld",
            merge: "withheld",
            publish: "withheld",
            productAcceptance: "withheld",
          },
        },
        decision: null,
        outcome: null,
      },
    },
  } as const;
}
