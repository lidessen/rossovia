import { describe, expect, test } from "bun:test";
import {
  prepareTaskCorrectionDelivery,
  TaskCorrectionDeliveryRequestSchema,
} from "../src/ui/task-correction-delivery";
import type { WorkItemSetProjection } from "../src/ui/work-items";

const taskId = "task-a";
const correctionId = "22222222-2222-4222-8222-222222222222";
const authorizationId = "11111111-1111-4111-8111-111111111111";
const proposalDigest = "a".repeat(64);
const target = {
  missionId: "mission-a",
  runnerId: "runner-a",
  expectedState: "running" as const,
  projectKey: "registered:repository:project-a",
};

function workItems(
  turnStanding: "exact" | "legacy-unproven" | "unavailable" = "exact",
  deliveredViaRunnerId?: string,
): WorkItemSetProjection {
  return {
    items: [{
      id: `principal-task:${taskId}`,
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      attention: "normal",
      title: "Task A",
      summary: "Deliver the correction",
      context: "Project A",
      projectKey: target.projectKey,
      missionId: target.missionId,
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: taskId,
        projectContext: {
          projectKey: target.projectKey,
          authority: "context-only",
        },
      },
      evidence: {
        freshness: {
          kind: "observed-at-build",
          observedAt: "2026-07-28T12:00:00Z",
        },
        sourceRefs: ["state/tasks.json"],
      },
      updatedAt: "2026-07-28T12:00:00Z",
      actionLabel: "查看任务",
      consequence: "normal",
      attentionCode: null,
      taskDetail: {
        sourceRevision: 3,
        sourceRef: "state/tasks.json",
        ownership: "workbench-local",
        identityAssurance: "unverified-local-interaction",
        projectAuthority: "context-only",
        missionContext: {
          missionId: target.missionId,
          authority: "context-only",
          standing: "observed",
          currentCarrier: {
            runnerId: target.runnerId,
            state: target.expectedState,
            live: true,
            freshness: {
              kind: "live",
              observedAt: "2026-07-28T12:00:00Z",
            },
            sourceRef: "missions/mission-a/runner-status.json",
            relation: "same-mission-current-carrier",
            executionStanding: "execution-unproven",
          },
        },
        executionContext: {
          latestLink: {
            authorizationId,
            proposalDigest,
            claimSourceRef: `state/execution-authorization-claims/${authorizationId}.json`,
            linkedAt: "2026-07-28T11:58:00Z",
            sourceRef: "workbench-ui:unverified-local-interaction",
          },
          standing: turnStanding === "exact"
            ? "current-turn-exact"
            : turnStanding === "legacy-unproven"
              ? "legacy-unproven"
              : "unavailable",
          authorizationConsumption: {
            standing: "verified",
            sourceRefs: ["receipt.json", "claim.json"],
          },
          currentTurn: {
            standing: turnStanding,
            sourceRefs: ["runner-status.json"],
          },
          currentEffect: {
            standing: "unavailable",
            sourceRefs: [],
          },
          launchCandidate: null,
          launchReadiness: {
            standing: "preparation-required",
            blockers: [{
              code: "exact-context-required",
              message: "fixture task has no launch Worktree",
            }],
          },
          linkCandidate: null,
          correctionDeliveryCandidate: null,
          recoveryCandidate: null,
          verifiedResultCandidate: null,
        },
        latestResultVerification: { standing: "none" },
        latestResultReview: { standing: "none" },
        resultReviews: [],
        worktreeAuthority: "observation-only",
        worktreeStanding: "not-declared",
        task: {
          id: taskId,
          title: "Task A",
          objective: "Deliver the correction",
          acceptance: ["The Mission input receipt is retained"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "conversation:test",
          },
          binding: {
            kind: "project-context",
            projectId: "repository:project-a",
            missionId: target.missionId,
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 3,
          corrections: [{
            id: correctionId,
            at: "2026-07-28T11:59:00Z",
            statement: "Keep the task boundary exact.",
            sourceRef: "conversation:correction",
            deliveries: deliveredViaRunnerId === undefined
              ? []
              : [{
                authorizationId,
                proposalDigest,
                claimSourceRef:
                  `state/execution-authorization-claims/${authorizationId}.json`,
                missionId: target.missionId,
                inputId:
                  `task:${taskId}:correction:${correctionId}:authorization:${authorizationId}`,
                inputEventId: "event-a",
                inputWatermark: 1,
                payloadDigest: "b".repeat(64),
                recordedAt: "2026-07-28T12:01:00Z",
                sourceRef:
                  `workbench-task:${taskId}/correction:${correctionId}`,
                deliveredViaRunnerId,
              }],
          }],
          resultClaims: [],
          executionLinks: [{
            authorizationId,
            proposalDigest,
            claimSourceRef: `state/execution-authorization-claims/${authorizationId}.json`,
            linkedAt: "2026-07-28T11:58:00Z",
            sourceRef: "workbench-ui:unverified-local-interaction",
          }],
          createdAt: "2026-07-28T11:55:00Z",
          updatedAt: "2026-07-28T11:59:00Z",
        },
      },
    }],
    capabilities: {
      independentTasks: {
        standing: "available",
        count: 0,
        sourceRevision: 3,
      },
    },
  };
}

const request = {
  kind: "deliver-correction",
  correctionId,
  authorizationId,
  target,
  expectedSourceRevision: 3,
  expectedRevision: 3,
} as const;

describe("task correction delivery planning", () => {
  test("binds one deterministic Mission input to the exact current turn", () => {
    expect(prepareTaskCorrectionDelivery(workItems(), taskId, request)).toMatchObject({
      taskId,
      correction: {
        id: correctionId,
        statement: "Keep the task boundary exact.",
      },
      executionLink: { authorizationId, proposalDigest },
      target,
      attribution: {
        inputId:
          `task:${taskId}:correction:${correctionId}:authorization:${authorizationId}`,
        actorRef: "principal:local-workbench",
        sourceRef: `workbench-task:${taskId}/correction:${correctionId}`,
      },
      retainedResult: null,
    });
  });

  test("rejects legacy or unavailable turn lineage before any runner input", () => {
    expect(() =>
      prepareTaskCorrectionDelivery(
        workItems("legacy-unproven"),
        taskId,
        request,
      )
    ).toThrow("current Mission turn is not exact");
    expect(() =>
      prepareTaskCorrectionDelivery(
        workItems("unavailable"),
        taskId,
        request,
      )
    ).toThrow("current Mission turn is not exact");
  });

  test("rejects a changed runner target and request fields outside the bridge", () => {
    expect(() =>
      prepareTaskCorrectionDelivery(workItems(), taskId, {
        ...request,
        target: { ...target, runnerId: "runner-replacement" },
      })
    ).toThrow("current runner target changed");
    expect(TaskCorrectionDeliveryRequestSchema.safeParse({
      ...request,
      statement: "Do not accept caller-authored delivery evidence.",
    }).success).toBeFalse();
  });

  test("returns retained evidence only for the originally delivered Mission runner", () => {
    expect(
      prepareTaskCorrectionDelivery(
        workItems("exact", target.runnerId),
        taskId,
        request,
      ).retainedResult,
    ).not.toBeNull();
    expect(() =>
      prepareTaskCorrectionDelivery(
        workItems("exact", target.runnerId),
        taskId,
        {
          ...request,
          target: { ...target, runnerId: "runner-replacement" },
        },
      )
    ).toThrow("retained correction delivery does not match");
  });
});
