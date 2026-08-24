import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import type { RunnerStatusProof } from "../../workbench/src/ui/actions";
import { initializeHome } from "../../workbench/src/home";
import { principalTasksPath } from "../../workbench/src/tasks";
import { appendWorkflowReview } from "../../workbench/src/workflow-observer";
import {
  PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT,
  PRINCIPAL_TASK_COMPACT_SHELL_TEXT_MAX_BYTES,
  PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP,
  PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES,
} from "../../workbench/src/ui/work-items";
import { createWorkbenchRequestHandler } from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-compact-snapshot-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const origin = "http://127.0.0.1:4317";
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [],
  }, {} as AutonomyClient);
  return { root, home, origin, handler };
}

function post(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  path: string,
  body: unknown,
) {
  return handler(new Request(`${origin}${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }));
}

async function createTask(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  sourceRevision: number,
): Promise<{ taskId: string; sourceRevision: number }> {
  const response = await post(handler, origin, "/api/tasks", {
    title: "Compact snapshot fixture task",
    objective: "Keep the list navigable while details load on demand",
    acceptance: ["The initial snapshot stays small"],
    nextActor: "agent",
    expectedSourceRevision: sourceRevision,
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return {
    taskId: body.result.task.id as string,
    sourceRevision: body.result.sourceRevision as number,
  };
}

async function compactSnapshot(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
): Promise<Record<string, any>> {
  const response = await handler(new Request(`${origin}/api/snapshot?compact=1`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function fullSnapshot(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
): Promise<Record<string, any>> {
  const response = await handler(new Request(`${origin}/api/snapshot`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function mutateTask(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  taskId: string,
  body: Record<string, unknown>,
): Promise<Record<string, any>> {
  const response = await post(
    handler,
    origin,
    `/api/tasks/${encodeURIComponent(taskId)}/actions`,
    body,
  );
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

/**
 * The realistic payload-probe home carries this many history-heavy principal
 * tasks, each with corrections, result claims with evidence refs and
 * reviews, execution links, a Worktree rebinding, and long objective /
 * acceptance / todo texts — the canonical history that must never enter the
 * compact first screen.
 */
const PROBE_TASK_COUNT = 60;
/** The first PROBE_PROJECT_BOUND_COUNT tasks bind the registered probe project/Mission/Worktree. */
const PROBE_PROJECT_BOUND_COUNT = 5;

function probeTaskId(index: number): string {
  return `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`;
}

function sha256Hex(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

function compactProbeTask(index: number, primaryPath: string | null): Record<string, unknown> {
  const id = probeTaskId(index);
  const bound = primaryPath !== null;
  return {
    id,
    title: index === 0
      ? `LONG-TITLE-${index}-` + "x".repeat(4000)
      : `Probe task ${index}`,
    objective: `HIST-OBJ-${index}-` + "objective text ".repeat(120) + ` TAIL-OBJ-${index}`,
    acceptance: Array.from({ length: 10 }, (_, criterion) =>
      `HIST-ACC-${index}-${criterion}-` + "criterion ".repeat(40)
      + ` TAIL-ACC-${index}-${criterion}`),
    todos: Array.from({ length: 10 }, (_, todo) =>
      `HIST-TODO-${index}-${todo}-` + "todo ".repeat(30) + ` TAIL-TODO-${index}-${todo}`),
    capabilitiesRequired: [],
    origin: { kind: "principal-explicit", sourceRef: `origin:probe:${index}` },
    binding: bound
      ? {
        kind: "project-context",
        projectId: "repository:probe",
        worktreePath: primaryPath,
        missionId: "probe-mission",
      }
      : { kind: "independent" },
    lifecycle: "open",
    nextActor: "agent",
    revision: 1,
    corrections: Array.from({ length: 6 }, (_, correction) => ({
      id: `correction-${index}-${correction}`,
      at: "2026-08-23T00:00:00Z",
      statement: `HIST-CORR-${index}-${correction}-` + "superseded guidance ".repeat(120)
        + ` TAIL-CORR-${index}-${correction}`,
      sourceRef: `hist-correction:${index}:${correction}`,
      deliveries: [],
    })),
    resultClaims: [0, 1, 2].map((claim) => {
      const accepted = claim !== 1;
      return {
        id: `claim-${index}-${claim}`,
        submittedAt: "2026-08-23T00:00:00Z",
        summary: `HIST-CLAIM-${index}-${claim}-` + "claim summary ".repeat(120)
          + ` TAIL-CLAIM-${index}-${claim}`,
        evidenceRefs: Array.from({ length: 8 }, (_, ref) =>
          `hist-evidence:${index}:${claim}:${ref}`),
        evidence: { kind: "agent-references-unverified" },
        sourceRef: `hist-claim:${index}:${claim}`,
        standing: accepted ? "accepted" : "superseded",
        reviews: accepted
          ? [0, 1].map((review) => ({
            id: `review-${index}-${claim}-${review}`,
            reviewedAt: "2026-08-23T00:00:00Z",
            resultClaimId: `claim-${index}-${claim}`,
            reviewerRef: `hist-reviewer:${index}:${claim}:${review}`,
            independence: {
              basis: "independent-review-context",
              sourceRef: `hist-review:${index}:${claim}:${review}`,
            },
            candidate: {
              kind: "git-commit",
              commit: sha256Hex(`commit-${index}-${claim}-${review}`).slice(0, 40),
            },
            verdict: "passed",
            findings: [`hist-finding:${index}:${claim}:${review}`],
            evidenceRefs: [`hist-review-evidence:${index}:${claim}:${review}`],
          }))
          : [],
        resolution: accepted
          ? {
            kind: "accepted",
            at: "2026-08-23T00:00:00Z",
            sourceRef: `hist-resolution:${index}:${claim}`,
            acceptanceBoundary: "workbench-local-task-only",
            basis: "agent-claim",
          }
          : { kind: "superseded", at: "2026-08-23T00:00:00Z", reason: "correction" },
      };
    }),
    executionLinks: [0, 1].map((link) => ({
      authorizationId: `12345678-1234-4123-8123-${String(index).padStart(11, "0")}${link}`,
      proposalDigest: sha256Hex(`proposal-${index}-${link}`),
      claimSourceRef: `hist-link-claim:${index}:${link}`,
      linkedAt: "2026-08-23T00:00:00Z",
      sourceRef: `hist-link:${index}:${link}`,
    })),
    worktreeRebindings: [{
      fromWorktreePath: "/worktrees/old",
      toWorktreePath: "/worktrees/new",
      reboundAt: "2026-08-23T00:00:00Z",
      sourceRef: `hist-rebind:${index}`,
    }],
    createdAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
  };
}

describe("compact initial snapshot and on-demand task detail", () => {
  test("the compact initial snapshot drops every taskDetail while the full route keeps the baseline body", async () => {
    const { handler, origin } = fixture();
    const first = await createTask(handler, origin, 0);
    await createTask(handler, origin, first.sourceRevision);

    const full = await fullSnapshot(handler, origin);
    const fullItems = full.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(fullItems).toHaveLength(2);
    expect(fullItems[0].taskDetail).toBeDefined();
    expect(fullItems[0].taskDetail.task.revision).toBe(1);
    expect(fullItems[0].taskDetail.sourceRevision).toBe(2);

    const compact = await compactSnapshot(handler, origin);
    const compactItems = compact.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(compactItems).toHaveLength(2);
    // Navigation and search summaries stay complete; full detail is absent
    // and is never faked by the compact projection.
    expect(compactItems[0]).toMatchObject({
      id: fullItems[0].id,
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      title: "Compact snapshot fixture task",
      summary: "Keep the list navigable while details load on demand",
      context: "Workbench · 独立任务",
      runnerId: null,
      binding: {
        kind: "workbench-task",
        projectContext: null,
      },
      actionLabel: "查看任务",
      attentionCode: null,
    });
    expect(compactItems[0].taskDetail).toBeUndefined();
    expect(compactItems[1].taskDetail).toBeUndefined();
    // The compact shell mirrors the bounded search text so the locator keeps
    // deep keywords findable without the canonical Task payload; the full
    // route carries the identical field.
    expect(typeof compactItems[0].searchText).toBe("string");
    expect(compactItems[0].searchText).toContain("Keep the list navigable");
    expect(compactItems[0].searchText).toContain("The initial snapshot stays small");
    expect(compactItems[0].searchText).toBe(fullItems[0].searchText);
    expect(compactItems[0].searchText).not.toContain("sourceRef");
    // Counts, source revision, and observer locating inputs stay available.
    expect(compact.workItems.capabilities.independentTasks).toEqual({
      standing: "available",
      count: 2,
      sourceRevision: 2,
    });
    // The open Agent-owned Tasks created above are independent (no project
    // binding), so the explainable agent-eligible partition counts them all
    // as orphaned history — none awaits Agent takeover, and the counts are
    // served on both the compact and full routes with their source ref.
    expect(compact.workItems.capabilities.agentEligibility).toMatchObject({
      standing: "available",
      eligibleCount: 0,
      orphanedCount: 2,
    });
    expect(typeof compact.workItems.capabilities.agentEligibility.sourceRef)
      .toBe("string");
    expect(full.workItems.capabilities.agentEligibility).toEqual(
      compact.workItems.capabilities.agentEligibility,
    );
    // Every principal-task shell carries the explainable triage (orphaned
    // with its reason) while remaining locatable by id.
    expect(compactItems.every((item: any) =>
      item.agentEligibility?.standing === "orphaned"
      && item.agentEligibility?.reason === "no-project-binding"
      && typeof item.id === "string"
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { id: string }) => typeof item.id === "string" && item.id !== "",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { title?: unknown }) => typeof item.title === "string",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { lifecycle?: unknown }) => typeof item.lifecycle === "string",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { summary?: unknown }) => typeof item.summary === "string",
    )).toBeTrue();

    // Baseline comparison: the initial body the browser receives is strictly
    // smaller than the previous full projection.
    const fullBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength;
    const compactBytes = new TextEncoder().encode(JSON.stringify(compact)).byteLength;
    expect(compactBytes).toBeLessThan(fullBytes);
  });

  test("the selected Task detail route returns the full projection and its exact revisions keep every mutation working", async () => {
    const { handler, origin } = fixture();
    const created = await createTask(handler, origin, 0);
    const taskId = created.taskId;

    const detailResponse = await handler(
      new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`),
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody.ok).toBeTrue();
    const item = detailBody.workItem;
    expect(item.id).toBe(`principal-task:${taskId}`);
    const detail = item.taskDetail;
    expect(detail).toBeDefined();
    expect(detail.sourceRevision).toBe(1);
    expect(detail.task.revision).toBe(1);
    expect(detail.ownership).toBe("workbench-local");
    expect(detail.executionContext).toBeDefined();
    // The full detail item mirrors the same bounded search text the compact
    // snapshot shell carries, so the locator surface stays identical.
    expect(typeof item.searchText).toBe("string");
    expect(item.searchText).toContain("Keep the list navigable");

    const corrected = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "correct",
      statement: "Detail projection revisions must stay exact.",
      nextActor: "agent",
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: detail.task.revision,
    });
    expect(corrected.status).toBe(200);
    expect(await corrected.json()).toMatchObject({
      result: { sourceRevision: 2, task: { revision: 2 } },
    });

    const afterCorrection = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const second = afterCorrection.workItem.taskDetail;
    expect(second.sourceRevision).toBe(2);
    expect(second.task.revision).toBe(2);

    const assigned = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "assign",
      nextActor: "principal",
      expectedSourceRevision: second.sourceRevision,
      expectedRevision: second.task.revision,
    });
    expect(assigned.status).toBe(200);

    const afterAssign = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const third = afterAssign.workItem.taskDetail;
    const submitted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "submit",
      summary: "The compact-first flow kept the exact revisions.",
      evidenceRefs: ["test:compact-snapshot"],
      expectedSourceRevision: third.sourceRevision,
      expectedRevision: third.task.revision,
    });
    expect(submitted.status).toBe(200);

    const afterSubmit = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const fourth = afterSubmit.workItem.taskDetail;
    const accepted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "accept",
      expectedSourceRevision: fourth.sourceRevision,
      expectedRevision: fourth.task.revision,
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      result: { task: { lifecycle: "settled" } },
    });

    const afterAccept = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const fifth = afterAccept.workItem.taskDetail;
    const reopened = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "reopen",
      statement: "Another pass is required.",
      nextActor: "agent",
      expectedSourceRevision: fifth.sourceRevision,
      expectedRevision: fifth.task.revision,
    });
    expect(reopened.status).toBe(200);
    expect(await reopened.json()).toMatchObject({
      result: { task: { lifecycle: "open", revision: 6 } },
    });

    // A mutation formed from the first fetched detail is now stale and must
    // fail closed instead of silently reusing an old revision.
    const stale = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "assign",
      nextActor: "principal",
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: detail.task.revision,
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "task-drift" });

    // The compact snapshot still carries the settled summary without detail.
    const compact = await compactSnapshot(handler, origin);
    const itemInCompact = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(itemInCompact).toMatchObject({
      lifecycle: "open",
      nextActor: "agent",
      actionLabel: "查看任务",
    });
    expect(itemInCompact.taskDetail).toBeUndefined();
    expect(compact.workItems.capabilities.independentTasks).toMatchObject({
      standing: "available",
      sourceRevision: 6,
    });
  });

  test("the detail route answers 404 for an unknown task and keeps the compact snapshot readable", async () => {
    const { handler, origin } = fixture();
    await createTask(handler, origin, 0);

    const missing = await handler(new Request(
      `${origin}/api/tasks/99999999-9999-4999-8999-999999999999/detail`,
    ));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "task-not-found",
    });

    const malformed = await handler(new Request(`${origin}/api/tasks/not-a-uuid/detail`));
    expect(malformed.status).toBe(404);

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeTrue();
    expect(compact.workItems.items.some(
      (item: { kind: string }) => item.kind === "principal-task",
    )).toBeTrue();
  });

  test("compact and full snapshot routes keep separate in-flight bodies and identical shells", async () => {
    const { handler, origin } = fixture();
    await createTask(handler, origin, 0);
    const [compact, full] = await Promise.all([
      compactSnapshot(handler, origin),
      fullSnapshot(handler, origin),
    ]);
    const shellOf = (item: Record<string, unknown>) => {
      const { taskDetail: _taskDetail, ...shell } = JSON.parse(JSON.stringify(item));
      // Evidence freshness timestamps are per-build generatedAt values, so
      // the shell comparison ignores only that timestamp and keeps every
      // other field (sourceRefs, lifecycle, binding, summaries) exact.
      if (shell.evidence?.freshness && typeof shell.evidence.freshness === "object") {
        delete shell.evidence.freshness.observedAt;
      }
      return shell;
    };
    const compactShells = compact.workItems.items
      .filter((item: { kind: string }) => item.kind === "principal-task")
      .map(shellOf);
    const fullShells = full.workItems.items
      .filter((item: { kind: string }) => item.kind === "principal-task")
      .map(shellOf);
    expect(compactShells).toEqual(fullShells);
  });

  test("the compact search text bounds to the current correction and result claim while the detail route re-reads the full history", async () => {
    const { handler, origin } = fixture();
    const created = await createTask(handler, origin, 0);
    const taskId = created.taskId;
    const historicalCorrection =
      "HISTORICAL-CORRECTION: superseded guidance that must never enter the first screen";
    const historicalClaim =
      "HISTORICAL-CLAIM: superseded result summary that must never enter the first screen";
    const currentCorrection =
      "CURRENT-CORRECTION: the only guidance the first screen needs";
    const currentClaim =
      "CURRENT-CLAIM: the only result the first screen needs";

    let sourceRevision = 1;
    let taskRevision = 1;
    const correct = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "correct",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const submit = async (summary: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "submit",
        summary,
        evidenceRefs: ["test:compact-history"],
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const accept = async () => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "accept",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const reopen = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "reopen",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };

    // One full history cycle: a superseded correction and claim, then the
    // current correction and claim that the first screen must still see.
    await correct(historicalCorrection);
    await submit(historicalClaim);
    await accept();
    await reopen(currentCorrection);
    await submit(currentClaim);

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItem = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    const fullItem = full.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(compactItem.taskDetail).toBeUndefined();
    // The compact mirror keeps only the decision-relevant current text; the
    // historical correction/claim text never enters the first screen.
    expect(compactItem.searchText).toContain(currentCorrection);
    expect(compactItem.searchText).toContain(currentClaim);
    expect(compactItem.searchText).not.toContain(historicalCorrection);
    expect(compactItem.searchText).not.toContain(historicalClaim);
    // The bounded field stays identical on both routes, so the locator
    // surface is exactly the same whether the item came from the compact
    // snapshot or from the on-demand detail body.
    expect(compactItem.searchText).toBe(fullItem.searchText);

    // The selected-item detail route still re-reads the complete canonical
    // history: every retained correction and result claim is returned in
    // full, and its own shell mirrors the identical bounded search text.
    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const detail = detailBody.workItem.taskDetail;
    expect(detail.task.corrections.map(
      (correction: { statement: string }) => correction.statement,
    )).toEqual([historicalCorrection, currentCorrection]);
    expect(detail.task.resultClaims.map(
      (claim: { summary: string }) => claim.summary,
    )).toEqual([historicalClaim, currentClaim]);
    expect(detailBody.workItem.searchText).toBe(compactItem.searchText);
    // The compact mirror is strictly smaller than the complete-history text
    // the detail source retains, so the first screen stops carrying what the
    // selection flow can re-read on demand.
    const historicalMirror = [
      detail.task.objective,
      ...detail.task.acceptance,
      ...detail.task.todos,
      ...detail.task.corrections.map((correction: { statement: string }) => correction.statement),
      ...detail.task.resultClaims.map((claim: { summary: string }) => claim.summary),
    ].filter((value: string) => value !== "").join(" ");
    expect(historicalMirror.length).toBeGreaterThan(compactItem.searchText.length);
  });

  test("a very long current correction and claim stay inside the provable search mirror bound while the detail route returns them verbatim", async () => {
    const { handler, origin } = fixture();
    const acceptance = Array.from({ length: 8 }, (_, index) =>
      `CRITERION-${index}-` + "acceptance detail ".repeat(30),
    );
    const createResponse = await post(handler, origin, "/api/tasks", {
      title: "Bounded search mirror fixture task",
      objective: "OBJ-HEAD " + "objective ".repeat(120) + " OBJ-TAIL",
      acceptance,
      nextActor: "agent",
      expectedSourceRevision: 0,
    });
    expect(createResponse.status).toBe(200);
    const taskId = ((await createResponse.json() as {
      result: { task: { id: string } };
    }).result.task.id);

    const currentCorrection =
      "CORR-HEAD " + "long guidance text ".repeat(2000) + " CORR-TAIL";
    const currentClaim =
      "CLAIM-HEAD " + "long claim text ".repeat(2000) + " CLAIM-TAIL";

    let sourceRevision = 1;
    let taskRevision = 1;
    const correct = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "correct",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const submit = async (summary: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "submit",
        summary,
        evidenceRefs: ["test:compact-long"],
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    await correct(currentCorrection);
    await submit(currentClaim);

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItem = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    const fullItem = full.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(compactItem.taskDetail).toBeUndefined();
    const searchText = compactItem.searchText as string;
    const searchTextBytes = new TextEncoder().encode(searchText).byteLength;
    // The provable finite upper bound holds for the real served compact item.
    expect(searchTextBytes).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    // The first screen keeps the decision-relevant heads and the first three
    // acceptance criteria; the long tails and later criteria never enter it.
    expect(searchText).toContain("OBJ-HEAD");
    expect(searchText).not.toContain("OBJ-TAIL");
    expect(searchText).toContain("CRITERION-0-");
    expect(searchText).toContain("CRITERION-2-");
    expect(searchText).not.toContain("CRITERION-3-");
    expect(searchText).toContain("CORR-HEAD");
    expect(searchText).not.toContain("CORR-TAIL");
    expect(searchText).toContain("CLAIM-HEAD");
    expect(searchText).not.toContain("CLAIM-TAIL");
    // The bounded field stays identical on the compact and full routes.
    expect(fullItem.searchText).toBe(searchText);
    // The compact shell summary previews the current submitted claim (the
    // task is verifying) with the same finite UTF-8 budget, so the claim tail
    // never reaches the first screen through the summary field either; the
    // full route keeps the canonical claim verbatim in the shell summary.
    const compactSummary = compactItem.summary as string;
    expect(compactSummary).toContain("CLAIM-HEAD");
    expect(compactSummary).not.toContain("CLAIM-TAIL");
    expect(new TextEncoder().encode(compactSummary).byteLength)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    expect(fullItem.summary).toBe(currentClaim);

    // The selected-item detail route re-reads the complete current correction
    // and claim verbatim, with the full canonical acceptance list.
    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const detail = detailBody.workItem.taskDetail;
    expect(detail.task.corrections.at(-1).statement).toBe(currentCorrection);
    expect(detail.task.resultClaims.at(-1).summary).toBe(currentClaim);
    expect(detail.task.acceptance).toHaveLength(acceptance.length);
    expect(detail.task.objective).toBe("OBJ-HEAD " + "objective ".repeat(120) + " OBJ-TAIL");
    // The compact body stays strictly smaller than the full body that also
    // carries the canonical Task payload, and the retained canonical texts
    // alone exceed the entire first-screen mirror bound.
    const compactBytes = new TextEncoder().encode(JSON.stringify(compact)).byteLength;
    const fullBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength;
    expect(compactBytes).toBeLessThan(fullBytes);
    expect(new TextEncoder().encode(currentCorrection).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    expect(new TextEncoder().encode(currentClaim).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
  });

  test("an unavailable task source fails closed: the compact snapshot stays readable and the detail route answers 404", async () => {
    const { home, origin, handler } = fixture();
    const created = await createTask(handler, origin, 0);
    rmSync(join(home, "state", "tasks.json"));

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeFalse();
    expect(compact.workItems.capabilities.independentTasks).toMatchObject({
      standing: "unavailable",
      count: null,
      sourceRevision: null,
    });
    expect(compact.workItems.capabilities.independentTasks.reason)
      .toContain("tasks.json");
    expect(compact.workItems.items.some(
      (item: { kind: string }) => item.kind === "principal-task",
    )).toBeFalse();
    expect(compact.attention.some(
      (item: { code: string }) => item.code === "source-error",
    )).toBeTrue();
    expect(compact.errors.some(
      (error: { scope: string }) => error.scope === "home",
    )).toBeTrue();

    // The canonical task still exists as an id only; without a readable
    // source the detail route must fail closed instead of faking a record.
    const missing = await handler(new Request(
      `${origin}/api/tasks/${encodeURIComponent(created.taskId)}/detail`,
    ));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: "task-not-found" });
  });

  test("the compact snapshot defers the per-worktree dirty observation while the full route keeps it", async () => {
    const { root, home, origin } = fixture();
    // A registered Git project with one dirty primary worktree and one clean
    // linked worktree exercises exactly the per-worktree `git status` scans
    // the compact first paint must not pay for.
    const repository = join(root, "repository");
    const repositoryRemote = "https://example.test/lidessen/compact.git";
    mkdirSync(repository, { recursive: true });
    const gitRun = (cwd: string, ...arguments_: string[]): string => {
      const result = Bun.spawnSync(["git", ...arguments_], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout.toString().trim();
    };
    gitRun(repository, "init", "-b", "main");
    gitRun(repository, "config", "user.name", "Compact Snapshot Test");
    gitRun(repository, "config", "user.email", "compact-snapshot@example.test");
    gitRun(repository, "remote", "add", "origin", repositoryRemote);
    writeFileSync(join(repository, "README.md"), "# Fixture\n");
    gitRun(repository, "add", "README.md");
    gitRun(repository, "commit", "-m", "initial");
    writeFileSync(join(repository, "UNCOMMITTED.md"), "visible dirt\n");
    const linked = join(root, "linked-worktree");
    gitRun(repository, "worktree", "add", "-b", "linked", linked);
    mkdirSync(join(home, "config"), { recursive: true });
    mkdirSync(join(home, "state"), { recursive: true });
    writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
      version: "rosso.projects.v1",
      projects: [{
        id: "repository:compact",
        repository: repositoryRemote,
        aliases: ["compact"],
      }],
    }));
    writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
      version: "rosso.workspaces.v1",
      workspaces: [{ projectId: "repository:compact", path: repository }],
    }));
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [repository],
    }, {} as AutonomyClient);

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeTrue();
    const compactProject = compact.projects.find(
      (project: { projectKey: string }) =>
        project.projectKey === "registered:repository:compact",
    );
    expect(compactProject).toBeDefined();
    expect(compactProject.worktrees).toHaveLength(2);
    for (const worktree of compactProject.worktrees) {
      // The compact first paint never claims a dirty standing; every other
      // `git worktree list` fact (path/HEAD/branch/registeredPrimary) stays.
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
      expect(typeof worktree.path).toBe("string");
      expect(worktree.head).toMatch(/^[0-9a-f]{40}$/u);
      expect(["main", "linked"]).toContain(worktree.gitBranch);
    }

    const full = await fullSnapshot(handler, origin);
    expect(full.complete).toBeTrue();
    const fullProject = full.projects.find(
      (project: { projectKey: string }) =>
        project.projectKey === "registered:repository:compact",
    );
    expect(fullProject.worktrees).toHaveLength(2);
    const fullPrimary = fullProject.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(repository),
    );
    const fullLinked = fullProject.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(linked),
    );
    // The full snapshot keeps the exact dirty facts the compact body
    // deferred: primary dirty, linked clean, primary registration exact.
    expect(fullPrimary.dirty).toBeTrue();
    expect(fullLinked.dirty).toBeFalse();
    expect(fullPrimary.registeredPrimary).toBeTrue();
    expect(fullLinked.registeredPrimary).toBeFalse();
  });

  test("the compact shell keeps only the bounded locator ref set while the detail route re-reads every historical ref and full text", async () => {
    const { root, home, origin, handler } = fixture();
    const repository = join(root, "repository");
    mkdirSync(repository, { recursive: true });
    const gitRun = (cwd: string, ...arguments_: string[]): string => {
      const result = Bun.spawnSync(["git", ...arguments_], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout.toString().trim();
    };
    gitRun(repository, "init", "-b", "main");
    gitRun(repository, "config", "user.name", "Compact Snapshot Test");
    gitRun(repository, "config", "user.email", "compact-snapshot@example.test");
    writeFileSync(join(repository, "README.md"), "# Fixture\n");
    gitRun(repository, "add", "README.md");
    gitRun(repository, "commit", "-m", "initial");
    writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
      version: "rosso.projects.v1",
      projects: [{
        id: "repository:ghost",
        repository: "https://example.test/ghost.git",
        aliases: ["ghost"],
      }],
    }));
    writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
      version: "rosso.workspaces.v1",
      workspaces: [{ projectId: "repository:ghost", path: repository }],
    }));
    const tasksPath = principalTasksPath(home);
    const richId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const orphanId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const longTitle = "LONG-TITLE-" + "x".repeat(3000);
    const objective = "OBJ-HEAD-" + "objective ".repeat(200) + " OBJ-TAIL";
    const acceptance = Array.from({ length: 6 }, (_, index) =>
      `ACC-HEAD-${index}-` + "criterion ".repeat(60) + ` ACC-TAIL-${index}`);
    const todos = Array.from({ length: 6 }, (_, index) =>
      `TODO-HEAD-${index}-` + "todo ".repeat(110) + ` TODO-TAIL-${index}`);
    const corrections = Array.from({ length: 5 }, (_, index) => ({
      id: `correction-${index}`,
      at: "2026-08-23T00:00:00Z",
      statement: `CORR-HEAD-${index}-` + "superseded guidance ".repeat(100)
        + ` CORR-TAIL-${index}`,
      sourceRef: `hist-correction:${index}`,
      deliveries: [],
    }));
    const claims = [0, 1, 2].map((index) => {
      const accepted = index !== 1;
      return {
        id: `claim-${index}`,
        submittedAt: "2026-08-23T00:00:00Z",
        summary: `CLAIM-HEAD-${index}-` + "result summary ".repeat(100)
          + ` CLAIM-TAIL-${index}`,
        evidenceRefs: Array.from({ length: 6 }, (_, ref) => `hist-evidence:${index}:${ref}`),
        evidence: { kind: "agent-references-unverified" },
        sourceRef: `hist-claim:${index}`,
        standing: accepted ? "accepted" : "superseded",
        reviews: accepted
          ? [0, 1].map((review) => ({
            id: `review-${index}-${review}`,
            reviewedAt: "2026-08-23T00:00:00Z",
            resultClaimId: `claim-${index}`,
            reviewerRef: `hist-reviewer:${index}:${review}`,
            independence: {
              basis: "independent-review-context",
              sourceRef: `hist-review:${index}:${review}`,
            },
            candidate: {
              kind: "git-commit",
              commit: sha256Hex(`commit-${index}-${review}`).slice(0, 40),
            },
            verdict: "passed",
            findings: [`hist-finding:${index}:${review}`],
            evidenceRefs: [`hist-review-evidence:${index}:${review}`],
          }))
          : [],
        resolution: accepted
          ? {
            kind: "accepted",
            at: "2026-08-23T00:00:00Z",
            sourceRef: `hist-resolution:${index}`,
            acceptanceBoundary: "workbench-local-task-only",
            basis: "agent-claim",
          }
          : { kind: "superseded", at: "2026-08-23T00:00:00Z", reason: "correction" },
      };
    });
    const historyTask = {
      id: richId,
      title: longTitle,
      objective,
      acceptance,
      todos,
      capabilitiesRequired: [],
      origin: { kind: "principal-explicit", sourceRef: "origin:story-a" },
      binding: { kind: "independent" },
      lifecycle: "open",
      nextActor: "agent",
      revision: 1,
      corrections,
      resultClaims: claims,
      executionLinks: [0, 1].map((link) => ({
        authorizationId: `12345678-1234-4123-8123-00000000000${link}`,
        proposalDigest: sha256Hex(`proposal-${link}`),
        claimSourceRef: `hist-link-claim:${link}`,
        linkedAt: "2026-08-23T00:00:00Z",
        sourceRef: `hist-link:${link}`,
      })),
      worktreeRebindings: [{
        fromWorktreePath: "/worktrees/old",
        toWorktreePath: "/worktrees/new",
        reboundAt: "2026-08-23T00:00:00Z",
        sourceRef: "hist-rebind",
      }],
      createdAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:00:00Z",
    };
    const orphanTask = {
      id: orphanId,
      title: "Orphaned locator task",
      objective: "Keeps the missing Worktree locator findable",
      acceptance: ["The locator entry survives"],
      todos: [],
      capabilitiesRequired: [],
      origin: { kind: "principal-explicit", sourceRef: "origin:story-b" },
      binding: {
        kind: "project-context",
        projectId: "repository:ghost",
        worktreePath: "/missing/worktree",
        missionId: "ghost-mission",
      },
      lifecycle: "open",
      nextActor: "agent",
      revision: 1,
      corrections: [{
        id: "correction-orphan",
        at: "2026-08-23T00:00:00Z",
        statement: "hist-orphan-correction",
        sourceRef: "hist-orphan-correction",
        deliveries: [],
      }],
      resultClaims: [],
      executionLinks: [],
      createdAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:00:00Z",
    };
    writeFileSync(join(home, "state", "tasks.json"), JSON.stringify({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 1,
      tasks: [historyTask, orphanTask],
    }));

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItems = compact.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(compactItems).toHaveLength(2);
    const serializedCompact = JSON.stringify(compact);
    const bytes = (value: string) => new TextEncoder().encode(value).byteLength;

    // Story 1: the compact first screen carries no taskDetail, no historical
    // evidence refs, and no claim/correction/todo full text. Only the
    // bounded search-mirror prefixes stay; superseded texts, tails, and
    // beyond-limit criteria/todos never enter it.
    expect(serializedCompact).not.toContain('"taskDetail"');
    expect(serializedCompact).not.toContain("hist-correction:");
    expect(serializedCompact).not.toContain("hist-claim:");
    expect(serializedCompact).not.toContain("hist-evidence:");
    expect(serializedCompact).not.toContain("hist-link:");
    expect(serializedCompact).not.toContain("hist-link-claim:");
    expect(serializedCompact).not.toContain("hist-rebind");
    expect(serializedCompact).not.toContain("hist-review:");
    expect(serializedCompact).not.toContain("hist-resolution:");
    expect(serializedCompact).not.toContain("hist-finding:");
    expect(serializedCompact).not.toContain("OBJ-TAIL");
    expect(serializedCompact).not.toContain("ACC-TAIL");
    expect(serializedCompact).not.toContain("TODO-TAIL");
    expect(serializedCompact).not.toContain("CORR-TAIL");
    expect(serializedCompact).not.toContain("CLAIM-TAIL");
    expect(serializedCompact).not.toContain("CORR-HEAD-0-");
    expect(serializedCompact).not.toContain("CLAIM-HEAD-0-");
    expect(serializedCompact).not.toContain("ACC-HEAD-3-");
    expect(serializedCompact).not.toContain("TODO-HEAD-3-");

    const richItem = compactItems.find(
      (item: { id: string }) => item.id === `principal-task:${richId}`,
    )!;
    // The compact shell carries exactly the minimal locator ref set — the
    // task source and the origin — and nothing historical.
    expect(richItem.evidence.sourceRefs).toEqual([tasksPath, "origin:story-a"]);
    expect(richItem.evidence.sourceRefs.length)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT);
    // The pathological long title stays inside the shell preview budget.
    expect(richItem.title.startsWith("LONG-TITLE-")).toBeTrue();
    expect(bytes(richItem.title)).toBeLessThan(bytes(longTitle));
    expect(bytes(richItem.title)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    expect(bytes(richItem.summary)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    expect(bytes(richItem.searchText)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    expect(bytes(richItem.title) + bytes(richItem.summary) + bytes(richItem.searchText))
      .toBeLessThanOrEqual(PRINCIPAL_TASK_COMPACT_SHELL_TEXT_MAX_BYTES);
    // The bounded search mirror keeps the decision-relevant current texts
    // findable: the latest correction/claim heads and the first criteria.
    expect(richItem.searchText).toContain("OBJ-HEAD-");
    expect(richItem.searchText).toContain("ACC-HEAD-0-");
    expect(richItem.searchText).toContain("CORR-HEAD-4-");
    expect(richItem.searchText).toContain("CLAIM-HEAD-2-");

    // The missing-worktree locator entry keeps its `worktree:<path>` ref:
    // the compact shell reaches exactly the count bound with the three
    // locator refs, and the orphaned reason/relation stay locatable.
    const orphanItem = compactItems.find(
      (item: { id: string }) => item.id === `principal-task:${orphanId}`,
    )!;
    expect(orphanItem.evidence.sourceRefs).toEqual([
      tasksPath,
      "origin:story-b",
      "worktree:/missing/worktree",
    ]);
    expect(orphanItem.evidence.sourceRefs.length)
      .toBe(PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT);
    expect(orphanItem.agentEligibility).toMatchObject({
      standing: "orphaned",
      reason: "missing-worktree",
      worktreePath: "/missing/worktree",
    });
    expect(orphanItem.worktreeContext).toMatchObject({
      path: "/missing/worktree",
      relation: "task-expected-context",
      standing: "unavailable",
    });

    // Story 3: the full snapshot keeps the complete historical ref list and
    // every full text verbatim; the selected-item detail route re-reads the
    // same canonical source with the identical full item.
    const fullItem = full.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${richId}`,
    )!;
    expect(fullItem.evidence.sourceRefs).toContain("hist-correction:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-evidence:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-link:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-link-claim:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-rebind");
    expect(fullItem.evidence.sourceRefs).toContain("hist-review:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-resolution:0");
    expect(fullItem.evidence.sourceRefs.length)
      .toBeGreaterThan(PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT);
    const fullTask = fullItem.taskDetail.task;
    expect(fullTask.title).toBe(longTitle);
    expect(fullTask.objective).toContain("OBJ-TAIL");
    expect(fullTask.acceptance[3]).toContain("ACC-TAIL-3");
    expect(fullTask.todos[3]).toContain("TODO-TAIL-3");
    expect(fullTask.corrections[0].statement).toContain("CORR-TAIL-0");
    expect(fullTask.resultClaims[0].summary).toContain("CLAIM-TAIL-0");
    expect(fullTask.resultClaims[1].resolution).toMatchObject({ kind: "superseded" });
    expect(fullTask.resultClaims[2].reviews).toHaveLength(2);

    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${richId}/detail`))
    ).json();
    expect(detailBody.ok).toBeTrue();
    const detail = detailBody.workItem;
    expect(detail.taskDetail.task.title).toBe(longTitle);
    expect(detail.taskDetail.task.objective).toContain("OBJ-TAIL");
    expect(detail.taskDetail.task.corrections[0].statement).toContain("CORR-TAIL-0");
    expect(detail.taskDetail.task.resultClaims[0].summary).toContain("CLAIM-TAIL-0");
    expect(detail.evidence.sourceRefs).toEqual(fullItem.evidence.sourceRefs);
    // The locator surface is identical on every route.
    expect(detail.searchText).toBe(richItem.searchText);
    expect(detail.searchText).toBe(fullItem.searchText);
  });

  test("the realistic compact first screen is provably bounded, locatable, relation-complete, and fresh while full and detail re-read the canonical history", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-compact-probe-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    initializeHome(home);
    const repository = join(root, "repository");
    const repositoryRemote = "https://example.test/lidessen/compact-probe.git";
    mkdirSync(repository, { recursive: true });
    const gitRun = (cwd: string, ...arguments_: string[]): string => {
      const result = Bun.spawnSync(["git", ...arguments_], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout.toString().trim();
    };
    gitRun(repository, "init", "-b", "main");
    gitRun(repository, "config", "user.name", "Compact Probe Test");
    gitRun(repository, "config", "user.email", "compact-probe@example.test");
    gitRun(repository, "remote", "add", "origin", repositoryRemote);
    writeFileSync(join(repository, "README.md"), "# Fixture\n");
    mkdirSync(join(repository, "apps", "missions"), { recursive: true });
    writeFileSync(join(repository, "apps", "missions", "probe-mission.json"), `${JSON.stringify({
      version: "mission-record.v1",
      id: "probe-mission",
      title: "Compact probe mission",
      sources: ["apps/missions/probe-mission.json"],
      createdAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:00:00Z",
      mainline: {
        contradiction: "The compact first screen must stay bounded under realistic history",
        acceptance: ["The payload probe proves the bound"],
        status: "active",
      },
      branches: [],
      currentFocus: "mainline",
    }, null, 2)}\n`);
    gitRun(repository, "add", "README.md", "apps/missions/probe-mission.json");
    gitRun(repository, "commit", "-m", "initial with mission");
    mkdirSync(join(home, "config"), { recursive: true });
    mkdirSync(join(home, "state"), { recursive: true });
    writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
      version: "rosso.projects.v1",
      projects: [{
        id: "repository:probe",
        repository: repositoryRemote,
        aliases: ["probe"],
      }],
    }));
    writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
      version: "rosso.workspaces.v1",
      workspaces: [{ projectId: "repository:probe", path: repository }],
    }));
    const primaryPath = realpathSync(repository);
    const tasks = Array.from({ length: PROBE_TASK_COUNT }, (_, index) =>
      compactProbeTask(index, index < PROBE_PROJECT_BOUND_COUNT ? primaryPath : null));
    writeFileSync(join(home, "state", "tasks.json"), JSON.stringify({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 1,
      tasks,
    }));
    const runnerDirectory = join(home, "missions", "runner-probe");
    mkdirSync(runnerDirectory, { recursive: true });
    writeFileSync(join(runnerDirectory, "runner-status.json"), `${JSON.stringify({
      version: "rosso.mission-runner.v1",
      runnerId: "runner-probe",
      missionId: "probe-mission",
      pid: 4242,
      state: "running",
      startedAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:01:00Z",
      inputWatermark: 1,
      reconciledWatermark: 0,
      socketPath: "/tmp/probe.sock",
      stopReason: null,
    }, null, 2)}\n`);
    for (let index = 0; index < 5; index += 1) {
      appendWorkflowReview(home, {
        version: "rossovia.workflow-review.v1",
        reviewId: `probe-review-${index}`,
        recordedAt: `2026-08-23T00:0${index}:00Z`,
        subject: {
          type: "workflow-task-attempt",
          taskId: probeTaskId(0),
          attemptId: "44444444-4444-4444-8444-444444444444",
        },
        observer: { kind: "agent", workerId: "deepseek-flash" },
        standing: "recorded",
        evidenceRefs: ["state/task-attempts/probe.json"],
        finding: `PROBE-FINDING-${index}-` + "long finding text ".repeat(400)
          + ` TAIL-FINDING-${index}`,
        reviewText: `REVIEW-FULL-TEXT-${index}-` + "complete review text ".repeat(2000),
      });
    }
    const client = {
      status: async (missionId: string): Promise<RunnerStatusProof> => ({
        live: true,
        missionId,
        runnerId: "runner-probe",
        state: "running",
      }),
      activity: async () => ({
        source: "mission-timeline",
        observedAt: "2026-08-23T00:01:00.000Z",
        eventCount: 0,
        intentLineage: { standing: "uninitialized", activeAnchor: null },
        anchorMigrationProposal: null,
        reconciliationAction: null,
        currentEffect: null,
        currentCorrection: null,
        recentCorrections: [],
        currentTurn: null,
        lastEvent: null,
        recentEvents: [],
      }),
      contribute: async () => undefined,
      control: async () => undefined,
      recover: async () => undefined,
    } as unknown as AutonomyClient;
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [repository],
      observerWorkerId: "deepseek-flash",
    }, client);
    const origin = "http://127.0.0.1:4317";
    const tasksPath = principalTasksPath(home);

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItems = compact.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(compactItems).toHaveLength(PROBE_TASK_COUNT);
    const serializedCompact = JSON.stringify(compact);
    const serializedFull = JSON.stringify(full);
    const bytes = (value: string) => new TextEncoder().encode(value).byteLength;

    // Story 1: the compact first screen never carries historical evidence
    // refs or claim/correction/todo full text, and every mirrored shell
    // text stays inside its provable bound.
    expect(serializedCompact).not.toContain('"taskDetail"');
    expect(serializedCompact).not.toContain("hist-correction:");
    expect(serializedCompact).not.toContain("hist-claim:");
    expect(serializedCompact).not.toContain("hist-evidence:");
    expect(serializedCompact).not.toContain("hist-link:");
    expect(serializedCompact).not.toContain("hist-link-claim:");
    expect(serializedCompact).not.toContain("hist-rebind:");
    expect(serializedCompact).not.toContain("hist-review:");
    expect(serializedCompact).not.toContain("hist-resolution:");
    expect(serializedCompact).not.toContain("hist-finding:");
    expect(serializedCompact).not.toContain("hist-reviewer:");
    expect(serializedCompact).not.toContain("TAIL-OBJ-");
    expect(serializedCompact).not.toContain("TAIL-CORR-");
    expect(serializedCompact).not.toContain("TAIL-CLAIM-");
    expect(serializedCompact).not.toContain("TAIL-FINDING-");
    // The acceptance/todo search mirror carries only the first three
    // criteria/todos, each inside its 512-byte field budget, so criteria
    // and todos beyond that limit never enter the first screen.
    expect(serializedCompact).not.toContain("HIST-ACC-0-3-");
    expect(serializedCompact).not.toContain("HIST-TODO-0-3-");
    expect(serializedCompact).not.toContain("HIST-CORR-0-0-");
    expect(serializedCompact).not.toContain("HIST-CLAIM-0-0-");
    expect(serializedCompact).not.toContain("REVIEW-FULL-TEXT-");
    for (const item of compactItems) {
      expect(item.taskDetail).toBeUndefined();
      expect(item.evidence.sourceRefs.length)
        .toBeLessThanOrEqual(PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT);
      expect(bytes(item.title)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
      expect(bytes(item.summary)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
      expect(bytes(item.searchText)).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
      expect(bytes(item.title) + bytes(item.summary) + bytes(item.searchText))
        .toBeLessThanOrEqual(PRINCIPAL_TASK_COMPACT_SHELL_TEXT_MAX_BYTES);
    }
    // Every compact shell carries exactly the minimal locator ref set.
    for (let index = 0; index < PROBE_TASK_COUNT; index += 1) {
      const item = compactItems.find(
        (candidate: { id: string }) => candidate.id === `principal-task:${probeTaskId(index)}`,
      );
      expect(item).toBeDefined();
      expect(item.evidence.sourceRefs).toEqual([tasksPath, `origin:probe:${index}`]);
    }

    // Story 2: the locator, current status, project/Mission/Worktree
    // relations, and freshness fields all survive on the compact shells.
    const boundItem = compactItems.find(
      (item: { id: string }) => item.id === `principal-task:${probeTaskId(0)}`,
    )!;
    expect(boundItem.title.startsWith("LONG-TITLE-0-")).toBeTrue();
    expect(bytes(boundItem.title)).toBeLessThan(bytes("LONG-TITLE-0-" + "x".repeat(4000)));
    expect(boundItem).toMatchObject({
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      projectKey: "registered:repository:probe",
      missionId: "probe-mission",
      binding: {
        kind: "workbench-task",
        sourceId: probeTaskId(0),
        projectContext: {
          projectKey: "registered:repository:probe",
          authority: "context-only",
        },
      },
      worktreeContext: {
        path: primaryPath,
        relation: "task-context",
        authority: "observation-only",
        standing: "observed",
      },
      agentEligibility: { standing: "eligible", worktreePath: primaryPath },
      evidence: { freshness: { kind: "observed-at-build" } },
    });
    expect(typeof boundItem.updatedAt).toBe("string");
    expect(boundItem.searchText).toContain("HIST-OBJ-0-");
    expect(boundItem.searchText).toContain("HIST-ACC-0-0-");
    expect(boundItem.searchText).toContain("HIST-CORR-0-5-");
    expect(boundItem.searchText).toContain("HIST-CLAIM-0-2-");
    const independentItem = compactItems.find(
      (item: { id: string }) =>
        item.id === `principal-task:${probeTaskId(PROBE_PROJECT_BOUND_COUNT)}`,
    )!;
    expect(independentItem).toMatchObject({
      projectKey: null,
      missionId: null,
      binding: {
        kind: "workbench-task",
        sourceId: probeTaskId(PROBE_PROJECT_BOUND_COUNT),
        projectContext: null,
      },
      agentEligibility: {
        standing: "orphaned",
        reason: "no-project-binding",
        worktreePath: null,
      },
    });
    expect(compact.workItems.capabilities.independentTasks).toEqual({
      standing: "available",
      count: PROBE_TASK_COUNT - PROBE_PROJECT_BOUND_COUNT,
      sourceRevision: 1,
    });
    expect(compact.workItems.capabilities.agentEligibility).toMatchObject({
      standing: "available",
      eligibleCount: PROBE_PROJECT_BOUND_COUNT,
      orphanedCount: PROBE_TASK_COUNT - PROBE_PROJECT_BOUND_COUNT,
    });
    const project = compact.projects.find(
      (candidate: { projectKey: string }) =>
        candidate.projectKey === "registered:repository:probe",
    );
    expect(project).toBeDefined();
    expect(project.missions.map((mission: { id: string }) => mission.id))
      .toContain("probe-mission");
    expect(project.worktrees).toHaveLength(1);
    expect(project.worktrees[0]).toMatchObject({
      path: primaryPath,
      registeredPrimary: true,
    });
    expect(project.worktrees[0].head).toMatch(/^[0-9a-f]{40}$/u);
    expect(Object.prototype.hasOwnProperty.call(project.worktrees[0], "dirty")).toBeFalse();
    expect(compact.runners).toHaveLength(1);
    expect(compact.runners[0]).toMatchObject({
      live: true,
      binding: {
        kind: "project-mission",
        projectKey: "registered:repository:probe",
        missionId: "probe-mission",
      },
      freshness: { kind: "live" },
    });
    expect(compact.runners[0].status.state).toBe("running");
    expect(compact.freshness.runners).toBe("live");
    expect(compact.complete).toBeTrue();
    // The observer first screen stays compact too: bounded finding only,
    // the full review text deferred with its honest markers.
    expect(compact.observerReviews.reviews).toHaveLength(5);
    for (const review of compact.observerReviews.reviews) {
      expect(Object.prototype.hasOwnProperty.call(review, "reviewText")).toBeFalse();
      expect(review.fullTextAvailable).toBeTrue();
      expect(review.findingTruncated).toBeTrue();
      expect(bytes(review.finding)).toBeLessThanOrEqual(512);
    }

    // Story 3: the full snapshot and the selected-item detail route re-read
    // the same canonical source with the complete history.
    const fullItem = full.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${probeTaskId(0)}`,
    )!;
    expect(fullItem.taskDetail).toBeDefined();
    expect(fullItem.evidence.sourceRefs).toContain("hist-correction:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-evidence:0:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-link:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-link-claim:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-rebind:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-review:0:0:0");
    expect(fullItem.evidence.sourceRefs).toContain("hist-resolution:0:0");
    expect(fullItem.evidence.sourceRefs.length)
      .toBeGreaterThan(PRINCIPAL_TASK_COMPACT_SOURCE_REF_MAX_COUNT);
    const fullTask = fullItem.taskDetail.task;
    expect(fullTask.title).toBe("LONG-TITLE-0-" + "x".repeat(4000));
    expect(fullTask.objective).toContain("TAIL-OBJ-0");
    expect(fullTask.acceptance[9]).toContain("TAIL-ACC-0-9");
    expect(fullTask.todos[9]).toContain("TAIL-TODO-0-9");
    expect(fullTask.corrections[0].statement).toContain("TAIL-CORR-0-0");
    expect(fullTask.resultClaims[0].summary).toContain("TAIL-CLAIM-0-0");
    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${probeTaskId(0)}/detail`))
    ).json();
    expect(detailBody.ok).toBeTrue();
    const detail = detailBody.workItem;
    expect(detail.taskDetail.task.objective).toContain("TAIL-OBJ-0");
    expect(detail.taskDetail.task.corrections[0].statement).toContain("TAIL-CORR-0-0");
    expect(detail.taskDetail.task.resultClaims[0].summary).toContain("TAIL-CLAIM-0-0");
    expect(detail.evidence.sourceRefs).toEqual(fullItem.evidence.sourceRefs);
    expect(detail.searchText).toBe(boundItem.searchText);

    // Real payload size evidence: the compact first screen is dramatically
    // smaller than the full snapshot that also carries the canonical Task
    // payloads, and stays under a hard byte cap for this realistic home.
    const compactBytes = bytes(serializedCompact);
    const fullBytes = bytes(serializedFull);
    expect(compactBytes).toBeLessThan(fullBytes / 4);
    expect(compactBytes).toBeLessThan(400_000);
    console.log(
      `compact first screen ${compactBytes} bytes vs full snapshot ${fullBytes} bytes `
      + `(${(fullBytes / compactBytes).toFixed(1)}x smaller)`,
    );
  });
});
