import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure locus exports.
import * as principalLocus from "../ui/app.js";

const {
  hasPrincipalLocusRequest,
  parsePrincipalLocus,
  persistablePrincipalWorkItemIdentifier,
  principalLocusHref,
  resolvePrincipalLocus,
  restoredPrincipalLocusState,
} = principalLocus;

const appSource = readFileSync(
  resolve(import.meta.dir, "../ui/app.js"),
  "utf8",
);
const projection = {
  projects: [
    { id: "registered:skills", persistable: true },
    { id: "registered:blog", persistable: true },
    { id: "registered:appgprj_blog", persistable: true },
    { id: "unregistered:/private/candidate", persistable: false },
  ],
  workItems: [
    {
      id: "principal-task:11111111-1111-4111-8111-111111111111",
      persistable: true,
      projectId: null,
      missionId: null,
    },
    {
      id: "principal-task:22222222-2222-4222-8222-222222222222",
      persistable: true,
      projectId: "registered:blog",
      missionId: "principal-workbench-dogfood",
    },
    {
      id:
        "attention:mission-execution-awaiting-authorization:"
        + "registered:appgprj_blog:principal-workbench-dogfood",
      persistable: true,
      projectId: "registered:appgprj_blog",
      missionId: "principal-workbench-dogfood",
    },
  ],
};

describe("Principal locus navigation", () => {
  test("resolves an initial URL only against stable identifiers from the current snapshot", () => {
    const request = parsePrincipalLocus(
      "http://127.0.0.1:4317/?view=tasks&filter=agent-pending"
        + "&project=registered%3Ablog"
        + "&item=principal-task%3A22222222-2222-4222-8222-222222222222",
    );

    expect(resolvePrincipalLocus(request, projection)).toEqual({
      standing: "available",
      activeView: "tasks",
      taskFilter: "agent-pending",
      selectedProjectId: "registered:blog",
      selectedWorkItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
      selectedMissionId: "principal-workbench-dogfood",
      peekOpen: true,
    });
  });

  test("carries view, filter, project, and item transitions without private task or Worktree data", () => {
    const sensitiveOnlyRequest = parsePrincipalLocus(
      "http://127.0.0.1:4317/?worktree=%2Fprivate%2Fcandidate"
        + "&draft=secret&evidence=payload&authorization=one-use#receipt",
    );
    expect(hasPrincipalLocusRequest(sensitiveOnlyRequest)).toBeTrue();
    expect(principalLocusHref(
      "http://127.0.0.1:4317/?worktree=%2Fprivate%2Fcandidate"
        + "&draft=secret&evidence=payload&authorization=one-use#receipt",
      {
        view: null,
        filter: null,
        projectId: null,
        workItemId: null,
      },
    )).toBe("/");

    const taskListHref = principalLocusHref(
      "http://127.0.0.1:4317/?worktree=%2Fprivate%2Fcandidate"
        + "&draft=secret&receipt=receipt.json&evidence=payload"
        + "&authorization=one-use&mission=internal&unknown=value#evidence",
      {
        view: "tasks",
        filter: "agent-pending",
        projectId: null,
        workItemId: null,
        worktreePath: "/private/candidate",
        draft: "secret",
      },
    );
    expect(taskListHref).toBe("/?view=tasks&filter=agent-pending");

    const taskHref = principalLocusHref(
      `http://127.0.0.1:4317${taskListHref}`,
      {
        view: "tasks",
        filter: "agent-pending",
        projectId: "registered:blog",
        projectPersistable: true,
        workItemId:
          "principal-task:22222222-2222-4222-8222-222222222222",
        workItemPersistable: true,
      },
    );
    expect(parsePrincipalLocus(taskHref)).toEqual({
      requested: true,
      invalidFields: [],
      view: "tasks",
      filter: "agent-pending",
      projectId: "registered:blog",
      workItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
    });

    const projectHref = principalLocusHref(
      `http://127.0.0.1:4317${taskHref}`,
      {
        view: "project",
        filter: "agent-pending",
        projectId: "registered:skills",
        projectPersistable: true,
        workItemId: null,
      },
    );
    expect(projectHref).toBe(
      "/?view=project&filter=agent-pending&project=registered%3Askills",
    );

    expect(principalLocusHref(
      "http://127.0.0.1:4317/current?project=registered%3Askills#private",
      {
        view: "project",
        filter: "all",
        projectId: "unregistered:/private/candidate",
        projectPersistable: false,
        workItemId: null,
      },
    )).toBe("/current?view=projects");

    expect(principalLocusHref(
      "http://127.0.0.1:4317/",
      {
        view: "tasks",
        filter: "all",
        projectId: null,
        workItemId:
          "mission:unregistered:/Users/alice/private-repo:mission:/private/source",
        workItemPersistable: false,
      },
    )).toBe("/?view=tasks");
  });

  test("reconstructs the same selected task after a reload-style serialize and parse cycle", () => {
    const href = principalLocusHref("http://127.0.0.1:4317/", {
      view: "independent",
      filter: "independent",
      projectId: null,
      workItemId: "principal-task:11111111-1111-4111-8111-111111111111",
      workItemPersistable: true,
    });
    const restored = resolvePrincipalLocus(
      parsePrincipalLocus(`http://127.0.0.1:4317${href}`),
      projection,
    );

    expect(restored).toMatchObject({
      standing: "available",
      activeView: "independent",
      taskFilter: "independent",
      selectedProjectId: null,
      selectedWorkItemId:
        "principal-task:11111111-1111-4111-8111-111111111111",
      peekOpen: true,
    });
  });

  test("serializes registered Mission decisions without admitting path-bearing or non-decision work-item identities", () => {
    const decisionId =
      "attention:mission-execution-awaiting-authorization:"
      + "registered:appgprj_blog:principal-workbench-dogfood";
    expect(persistablePrincipalWorkItemIdentifier(decisionId)).toBeTrue();
    expect(persistablePrincipalWorkItemIdentifier(
      "mission:unregistered:/Users/alice/private-repo:"
      + "principal-workbench-dogfood:/private/source",
    )).toBeFalse();
    expect(persistablePrincipalWorkItemIdentifier(
      "attention:runner-unreachable:registered:appgprj_blog:"
      + "principal-workbench-dogfood",
    )).toBeFalse();
    expect(persistablePrincipalWorkItemIdentifier(
      "attention:mission-execution-awaiting-authorization:"
      + "registered:appgprj_blog:principal-workbench-dogfood:receipt.json",
    )).toBeFalse();

    const href = principalLocusHref("http://127.0.0.1:4317/", {
      view: "tasks",
      filter: "all",
      projectId: "registered:appgprj_blog",
      projectPersistable: true,
      workItemId: decisionId,
      workItemPersistable:
        persistablePrincipalWorkItemIdentifier(decisionId),
    });
    expect(href).toContain(`item=${encodeURIComponent(decisionId)}`);

    expect(resolvePrincipalLocus(
      parsePrincipalLocus(`http://127.0.0.1:4317${href}`),
      projection,
    )).toMatchObject({
      standing: "available",
      activeView: "tasks",
      selectedProjectId: "registered:appgprj_blog",
      selectedWorkItemId: decisionId,
      selectedMissionId: "principal-workbench-dogfood",
      peekOpen: true,
    });
  });

  test("treats browser Back to an empty locus as overview and clears stale task detail", () => {
    const emptyRequest = parsePrincipalLocus("http://127.0.0.1:4317/");
    expect(hasPrincipalLocusRequest(emptyRequest)).toBeFalse();

    const staleState: {
      activeView: string;
      taskFilter: string;
      selectedProjectId: string | null;
      selectedMissionId: string | null;
      selectedWorktreeId: string | null;
      selectedWorkItemId: string | null;
      peekOpen: boolean;
      taskCreateOpen: boolean;
      detailRevalidationPending: boolean;
    } = {
      activeView: "overview",
      taskFilter: "all",
      selectedProjectId: "registered:blog",
      selectedMissionId: "principal-workbench-dogfood",
      selectedWorktreeId: "derived-worktree",
      selectedWorkItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
      peekOpen: true,
      taskCreateOpen: false,
      detailRevalidationPending: true,
    };
    Object.assign(
      staleState,
      restoredPrincipalLocusState(
        resolvePrincipalLocus(emptyRequest, projection),
      ),
    );

    expect(staleState).toEqual({
      activeView: "overview",
      taskFilter: "all",
      selectedProjectId: null,
      selectedMissionId: null,
      selectedWorktreeId: null,
      selectedWorkItemId: null,
      peekOpen: false,
      taskCreateOpen: false,
      detailRevalidationPending: false,
    });

    const forwardRequest = parsePrincipalLocus(
      "http://127.0.0.1:4317/?project=registered%3Ablog"
        + "&item=principal-task%3A22222222-2222-4222-8222-222222222222",
    );
    Object.assign(
      staleState,
      restoredPrincipalLocusState(
        resolvePrincipalLocus(forwardRequest, projection),
      ),
    );
    expect(staleState).toMatchObject({
      activeView: "tasks",
      selectedProjectId: "registered:blog",
      selectedWorkItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
      peekOpen: true,
    });
  });

  test("distinguishes an explicit invalid identity from no location request", () => {
    const emptyRequest = parsePrincipalLocus("http://127.0.0.1:4317/");
    const invalidRequest = parsePrincipalLocus(
      "http://127.0.0.1:4317/?project=",
    );

    expect(emptyRequest).toMatchObject({
      requested: false,
      invalidFields: [],
      projectId: null,
    });
    expect(invalidRequest).toMatchObject({
      requested: true,
      invalidFields: ["project"],
      projectId: null,
    });
    expect(hasPrincipalLocusRequest(emptyRequest)).toBeFalse();
    expect(hasPrincipalLocusRequest(invalidRequest)).toBeTrue();
    expect(resolvePrincipalLocus(invalidRequest, projection)).toMatchObject({
      standing: "unavailable",
      kind: "invalid",
      requestedId: "project",
    });
  });

  test("revalidates a persisted locus across live projection changes without selecting a fallback", () => {
    const request = parsePrincipalLocus(
      "http://127.0.0.1:4317/?view=tasks&project=registered%3Ablog"
        + "&item=principal-task%3A22222222-2222-4222-8222-222222222222",
    );
    expect(resolvePrincipalLocus(request, projection)).toMatchObject({
      standing: "available",
      selectedProjectId: "registered:blog",
      selectedWorkItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
      peekOpen: true,
    });

    const missingItem = resolvePrincipalLocus(request, {
      ...projection,
      workItems: projection.workItems.filter(
        (item) =>
          item.id
          !== "principal-task:22222222-2222-4222-8222-222222222222",
      ),
    });
    expect(missingItem).toMatchObject({
      standing: "unavailable",
      kind: "work-item",
      requestedId:
        "principal-task:22222222-2222-4222-8222-222222222222",
    });
    expect(restoredPrincipalLocusState(missingItem)).toMatchObject({
      selectedProjectId: null,
      selectedWorkItemId: null,
      peekOpen: true,
    });

    const missingProject = resolvePrincipalLocus(request, {
      ...projection,
      projects: projection.projects.filter(
        (project) => project.id !== "registered:blog",
      ),
    });
    expect(missingProject).toMatchObject({
      standing: "unavailable",
      kind: "project",
      requestedId: "registered:blog",
      peekOpen: true,
    });
    expect(restoredPrincipalLocusState(missingProject).peekOpen).toBeTrue();

    const changedRelation = resolvePrincipalLocus(request, {
      ...projection,
      workItems: projection.workItems.map((item) =>
        item.id === "principal-task:22222222-2222-4222-8222-222222222222"
          ? { ...item, projectId: "registered:skills" }
          : item
      ),
    });
    expect(changedRelation).toMatchObject({
      standing: "unavailable",
      kind: "relation",
      requestedId:
        "principal-task:22222222-2222-4222-8222-222222222222",
    });
    expect(restoredPrincipalLocusState(changedRelation)).toMatchObject({
      selectedProjectId: null,
      selectedWorkItemId: null,
      peekOpen: true,
    });

    expect(resolvePrincipalLocus(request, projection)).toMatchObject({
      standing: "available",
      selectedProjectId: "registered:blog",
      selectedWorkItemId:
        "principal-task:22222222-2222-4222-8222-222222222222",
      peekOpen: true,
    });
    expect(appSource).toContain(
      "if (state.locusRestorePending || state.unavailableLocus !== null)",
    );
    expect(appSource).toContain('$("#create-task-button").disabled = true');
    expect(appSource).toContain("请求的位置不可用");
    expect(appSource).toContain("请求的任务不可用");
  });

  test("re-reads location and requires a fresh snapshot on browser Back or Forward", () => {
    const popstate = appSource.slice(appSource.indexOf(
      'window.addEventListener("popstate"',
    ));

    expect(popstate).toContain(
      "state.locusRequest = parsePrincipalLocus(window.location.href)",
    );
    expect(popstate).toContain("state.locusRestorePending = true");
    expect(popstate).toContain(
      "loadSnapshot({ manual: true, ensure: true })",
    );
    expect(appSource).toContain(
      "const persistedRequest = parsePrincipalLocus(window.location.href)",
    );
    expect(appSource).toContain(
      "hasPrincipalLocusRequest(persistedRequest)",
    );
    expect(appSource).toContain("writePrincipalLocus({ replace: true })");
    expect(appSource).toContain(
      "const initialLocusRequest = parsePrincipalLocus(window.location.href)",
    );
    expect(appSource).toContain(
      "const canonicalHref = principalLocusHref(",
    );
    expect(appSource).toContain(
      "window.history.replaceState(",
    );
  });
});
