import { describe, expect, test } from "bun:test";
import {
  buildWorkItemProjection,
  PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP,
  PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES,
} from "../src/ui/work-items";

const snapshot = {
  generatedAt: "2026-08-21T10:00:00Z",
  complete: true,
  projects: [],
  runners: [],
  attention: [],
  errors: [],
};

function taskSource(tasks: unknown[]) {
  return {
    standing: "available" as const,
    sourceRef: "/home/state/tasks.json",
    source: {
      version: "rosso.principal-tasks.v1" as const,
      sourceRevision: 3,
      tasks,
    },
  };
}

function compactTask(id: string) {
  return {
    id,
    title: `Compact task ${id}`,
    objective: "Keep the navigation summary complete without the full detail",
    acceptance: ["The shell stays searchable and attributable"],
    todos: [],
    capabilitiesRequired: [],
    origin: {
      kind: "principal-explicit" as const,
      sourceRef: `conversation:${id}`,
    },
    binding: { kind: "independent" as const },
    lifecycle: "open" as const,
    nextActor: "agent" as const,
    revision: 2,
    corrections: [{
      id: "correction-compact",
      at: "2026-08-21T09:00:00Z",
      statement: "Keep the exact revision guard.",
      sourceRef: `workbench-task:${id}/correction:correction-compact`,
      deliveries: [],
    }],
    executionLinks: [],
    resultClaims: [],
    createdAt: "2026-08-21T08:00:00Z",
    updatedAt: "2026-08-21T09:00:00Z",
  };
}

describe("compact principal-task work-item projection", () => {
  test("an empty taskDetailIds set keeps only the navigation summary and never fakes detail", () => {
    const task = compactTask("task-compact");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([task]) as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const item = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-compact",
    );

    expect(item).toBeDefined();
    expect(item?.taskDetail).toBeUndefined();
    expect(item).toMatchObject({
      id: "principal-task:task-compact",
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      attention: "normal",
      title: "Compact task task-compact",
      summary: "Keep the navigation summary complete without the full detail",
      context: "Workbench · 独立任务",
      projectKey: null,
      missionId: null,
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: "task-compact",
        projectContext: null,
      },
      updatedAt: "2026-08-21T09:00:00Z",
      actionLabel: "查看任务",
      consequence: "normal",
      attentionCode: null,
    });
    // The compact item never carries the canonical Task record, corrections,
    // execution links, or claim history.
    expect(item).not.toHaveProperty("task");
    expect(item).not.toHaveProperty("corrections");
    // The compact item mirrors only the bounded search text: the deep
    // keyword text the shell locator already searches (objective, acceptance,
    // correction statements, result summaries), never any canonical payload.
    expect(item?.searchText).toBe(
      "Keep the navigation summary complete without the full detail "
      + "The shell stays searchable and attributable "
      + "Keep the exact revision guard.",
    );
    expect(item?.searchText).not.toContain("sourceRef");
    expect(item?.searchText).not.toContain("conversation:");
    expect(item?.searchText).not.toMatch(/workbench-task:/u);
    expect(item?.searchText).not.toMatch(/\{/u);
    // Evidence source refs stay attributable to the canonical Task source.
    expect(item?.evidence).toMatchObject({
      sourceRefs: expect.arrayContaining([
        "/home/state/tasks.json",
        `workbench-task:task-compact/correction:correction-compact`,
      ]),
    });
    // Capabilities and counts remain available for the list and observer.
    expect(projection.capabilities.independentTasks).toEqual({
      standing: "available",
      count: 1,
      sourceRevision: 3,
    });
  });

  test("the default projection keeps the full detail exactly as before", () => {
    const task = compactTask("task-compact");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([task]) as never,
    );
    const item = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-compact",
    );

    expect(item?.taskDetail).toBeDefined();
    expect(item?.taskDetail?.task).toBe(task);
    expect(item?.taskDetail?.sourceRevision).toBe(3);
    expect(item?.taskDetail?.task.corrections).toHaveLength(1);
    expect(item?.taskDetail?.executionContext).toMatchObject({
      latestLink: null,
      // An open Agent-owned independent task can never satisfy the
      // registered project + Mission + Worktree context a launch requires,
      // so its standing is preparation-required with the exact-context
      // blocker; not-applicable belongs only to tasks whose lifecycle or
      // owner already excludes launching.
      launchReadiness: {
        standing: "preparation-required",
        blockers: [{
          code: "exact-context-required",
          message: expect.stringContaining("registered project"),
        }],
      },
    });
  });

  test("a task id set projects full detail only for exactly those tasks", () => {
    const first = compactTask("task-first");
    const second = compactTask("task-second");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([first, second]) as never,
      undefined,
      undefined,
      { taskDetailIds: new Set(["task-first"]) },
    );
    const firstItem = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-first",
    );
    const secondItem = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-second",
    );

    expect(firstItem?.taskDetail).toBeDefined();
    expect(secondItem?.taskDetail).toBeUndefined();
    // Identity fields are task-specific: each item keeps its own id and
    // binding.sourceId, and its title and evidence refs are derived from the
    // task id. The compact/full contract covers only the shared shell, so
    // the comparison normalizes exactly those id-derived strings while every
    // other shell field stays exact.
    const normalizeTaskIdentity = (value: unknown): unknown => {
      if (typeof value === "string") {
        return value.replace(/task-(first|second)/gu, "TASK");
      }
      if (Array.isArray(value)) return value.map(normalizeTaskIdentity);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(
            ([key, entry]): [string, unknown] => [key, normalizeTaskIdentity(entry)],
          ),
        );
      }
      return value;
    };
    expect(firstItem?.id).toBe("principal-task:task-first");
    expect(secondItem?.id).toBe("principal-task:task-second");
    const { taskDetail: _firstDetail, ...firstShell } = firstItem!;
    const { taskDetail: _secondDetail, ...secondShell } = secondItem!;
    expect(normalizeTaskIdentity(firstShell)).toEqual(
      normalizeTaskIdentity(secondShell),
    );
  });

  test("compact and full items mirror the same bounded search text without canonical payloads", () => {
    const task = compactTask("task-search");
    const source = taskSource([task]);
    const compact = buildWorkItemProjection(
      snapshot as never,
      source as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const full = buildWorkItemProjection(
      snapshot as never,
      source as never,
    );
    const compactItem = compact.items.find(
      (candidate) => candidate.id === "principal-task:task-search",
    );
    const fullItem = full.items.find(
      (candidate) => candidate.id === "principal-task:task-search",
    );

    expect(compactItem?.taskDetail).toBeUndefined();
    expect(fullItem?.taskDetail).toBeDefined();
    // The bounded field is identical on both projections: only the deep
    // keyword text the shell locator already searches is mirrored, never the
    // canonical Task record or its evidence payloads.
    expect(compactItem?.searchText).toBe(fullItem?.searchText);
    expect(compactItem?.searchText).toContain("Keep the exact revision guard.");
    expect(compactItem?.searchText).not.toContain("sourceRef");
    expect(compactItem?.searchText).not.toMatch(/workbench-task:/u);
    expect(compactItem?.searchText).not.toMatch(/\{/u);
  });

  test("the search mirror has a provable finite byte bound even with arbitrarily long current correction and claim text", () => {
    const acceptance = Array.from({ length: 8 }, (_, index) =>
      `ACCEPT-${index}-` + "criterion ".repeat(20),
    );
    const todos = Array.from({ length: 8 }, (_, index) =>
      `TODO-${index}-` + "item ".repeat(20),
    );
    const currentCorrection =
      "CURRENT-CORRECTION-HEAD " + "长指导文本 ".repeat(4000) + " CURRENT-CORRECTION-TAIL";
    const currentClaim =
      "CURRENT-CLAIM-HEAD " + "claim ".repeat(8000) + " CURRENT-CLAIM-TAIL";
    const verifyingClaim =
      "VERIFYING-CLAIM-HEAD " + "pending claim ".repeat(4000) + " VERIFYING-CLAIM-TAIL";
    const task = {
      ...compactTask("task-bound"),
      objective: "OBJECTIVE-HEAD " + "objective ".repeat(120) + " OBJECTIVE-TAIL",
      acceptance,
      todos,
      corrections: [
        {
          id: "correction-historical",
          at: "2026-08-21T08:00:00Z",
          statement: "HISTORICAL-CORRECTION superseded guidance",
          sourceRef: "workbench-task:task-bound/correction:correction-historical",
          deliveries: [],
        },
        {
          id: "correction-current",
          at: "2026-08-21T09:00:00Z",
          statement: currentCorrection,
          sourceRef: "workbench-task:task-bound/correction:correction-current",
          deliveries: [],
        },
      ],
      resultClaims: [
        {
          id: "claim-historical",
          submittedAt: "2026-08-21T08:30:00Z",
          summary: "HISTORICAL-CLAIM superseded result",
          evidenceRefs: ["test:bound"],
          sourceRef: "workbench-task:task-bound/claim:claim-historical",
          standing: "superseded",
          reviews: [],
          resolution: {
            kind: "superseded",
            at: "2026-08-21T09:00:00Z",
            reason: "correction",
          },
        },
        {
          id: "claim-current",
          submittedAt: "2026-08-21T09:30:00Z",
          summary: currentClaim,
          evidenceRefs: ["test:bound"],
          evidence: { kind: "agent-references-unverified" as const },
          sourceRef: "workbench-task:task-bound/claim:claim-current",
          standing: "submitted",
          reviews: [],
          resolution: null,
        },
      ],
    };
    const source = taskSource([task]);
    const verifyingTask = {
      ...compactTask("task-verifying-bound"),
      objective:
        "VERIFYING-OBJECTIVE-HEAD "
        + "objective ".repeat(120)
        + " VERIFYING-OBJECTIVE-TAIL",
      lifecycle: "verifying" as const,
      nextActor: "principal" as const,
      resultClaims: [{
        id: "claim-verifying",
        submittedAt: "2026-08-21T09:30:00Z",
        summary: verifyingClaim,
        evidenceRefs: ["test:bound"],
        evidence: { kind: "agent-references-unverified" as const },
        sourceRef: "workbench-task:task-verifying-bound/claim:claim-verifying",
        standing: "submitted",
        reviews: [],
        resolution: null,
      }],
    };
    const compact = buildWorkItemProjection(
      snapshot as never,
      source as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const full = buildWorkItemProjection(snapshot as never, source as never);
    const compactItem = compact.items.find(
      (candidate) => candidate.id === "principal-task:task-bound",
    );
    const fullItem = full.items.find(
      (candidate) => candidate.id === "principal-task:task-bound",
    );
    const searchText = compactItem?.searchText ?? "";
    const searchTextBytes = new TextEncoder().encode(searchText).byteLength;

    expect(compactItem?.taskDetail).toBeUndefined();
    expect(fullItem?.taskDetail).toBeDefined();
    // The documented arithmetic locks the exact bound: 9 fields × 512 bytes
    // plus 8 single-byte separators.
    expect(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES).toBe(
      9 * PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP + 8,
    );
    expect(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES).toBe(4616);
    // The long canonical texts are far larger than the first-screen bound, so
    // the bound is actually exercised by this fixture.
    expect(new TextEncoder().encode(currentCorrection).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    expect(new TextEncoder().encode(currentClaim).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    // The provable bound holds on the compact first screen.
    expect(searchTextBytes).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    // The objective head stays findable; its tail never enters the mirror.
    expect(searchText).toContain("OBJECTIVE-HEAD");
    expect(searchText).not.toContain("OBJECTIVE-TAIL");
    // Acceptance and todos are count-limited to the first three entries.
    expect(searchText).toContain("ACCEPT-0-");
    expect(searchText).toContain("ACCEPT-2-");
    expect(searchText).not.toContain("ACCEPT-3-");
    expect(searchText).not.toContain("ACCEPT-7-");
    expect(searchText).toContain("TODO-0-");
    expect(searchText).toContain("TODO-2-");
    expect(searchText).not.toContain("TODO-3-");
    expect(searchText).not.toContain("TODO-7-");
    // The heads of the current correction and claim stay findable; their
    // tails and the superseded history never enter the first screen.
    expect(searchText).toContain("CURRENT-CORRECTION-HEAD");
    expect(searchText).not.toContain("CURRENT-CORRECTION-TAIL");
    expect(searchText).toContain("CURRENT-CLAIM-HEAD");
    expect(searchText).not.toContain("CURRENT-CLAIM-TAIL");
    expect(searchText).not.toContain("HISTORICAL-CORRECTION");
    expect(searchText).not.toContain("HISTORICAL-CLAIM");
    // The compact shell summary uses the same finite UTF-8 preview: the
    // objective head stays findable and its tail never enters the first
    // screen through the summary field either.
    const summary = compactItem?.summary ?? "";
    expect(summary).toContain("OBJECTIVE-HEAD");
    expect(summary).not.toContain("OBJECTIVE-TAIL");
    expect(new TextEncoder().encode(summary).byteLength)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    // A verifying task's compact summary previews the current submitted
    // claim with the same budget: head findable, tail absent, bounded bytes.
    const verifyingSource = taskSource([verifyingTask]);
    const verifyingCompact = buildWorkItemProjection(
      snapshot as never,
      verifyingSource as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const verifyingFull = buildWorkItemProjection(
      snapshot as never,
      verifyingSource as never,
    );
    const verifyingItem = verifyingCompact.items.find(
      (candidate) => candidate.id === "principal-task:task-verifying-bound",
    );
    const verifyingFullItem = verifyingFull.items.find(
      (candidate) => candidate.id === "principal-task:task-verifying-bound",
    );
    const verifyingSummary = verifyingItem?.summary ?? "";
    expect(verifyingSummary).toContain("VERIFYING-CLAIM-HEAD");
    expect(verifyingSummary).not.toContain("VERIFYING-CLAIM-TAIL");
    expect(new TextEncoder().encode(verifyingSummary).byteLength)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    // Only the compact first screen is preview-bounded: the full projection
    // and the detail route keep the canonical claim/objective verbatim.
    expect(verifyingFullItem?.summary).toBe(verifyingClaim);
    expect(verifyingFullItem?.taskDetail?.task.objective)
      .toBe(verifyingTask.objective);
    expect(verifyingFullItem?.taskDetail?.task.resultClaims.at(-1)?.summary)
      .toBe(verifyingClaim);
    // The mirror is identical on the compact and full projections, and the
    // detail still re-reads every canonical text verbatim.
    expect(fullItem?.searchText).toBe(searchText);
    const detail = fullItem?.taskDetail;
    expect(detail?.task.corrections.at(-1)?.statement).toBe(currentCorrection);
    expect(detail?.task.resultClaims.at(-1)?.summary).toBe(currentClaim);
    expect(detail?.task.acceptance).toHaveLength(acceptance.length);
    expect(detail?.task.todos).toHaveLength(todos.length);
  });

  test("the mirror truncation never splits a multi-byte character at the byte cap", () => {
    const task = {
      ...compactTask("task-boundary"),
      objective: "OBJECTIVE",
      acceptance: ["ACCEPT"],
      todos: [],
      corrections: [{
        id: "correction-boundary",
        at: "2026-08-21T09:00:00Z",
        // 600 UTF-8 bytes: the 512-byte cap lands two bytes into the 171st
        // character, so the truncation must back up to the 170th boundary.
        statement: "中".repeat(200),
        sourceRef: "workbench-task:task-boundary/correction:correction-boundary",
        deliveries: [],
      }],
      resultClaims: [],
    };
    const compact = buildWorkItemProjection(
      snapshot as never,
      taskSource([task]) as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const item = compact.items.find(
      (candidate) => candidate.id === "principal-task:task-boundary",
    );
    const searchText = item?.searchText ?? "";
    // No split character leaks a replacement char into the first screen.
    expect(searchText).not.toContain("\uFFFD");
    // The correction is the last mirrored field, so the mirror ends with the
    // first 170 whole characters (510 bytes ≤ the 512-byte field cap).
    expect(searchText.endsWith("中".repeat(170))).toBeTrue();
    expect(new TextEncoder().encode(searchText).byteLength)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
  });
});
