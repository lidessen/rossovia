import { describe, expect, test } from "bun:test";
import {
  activeFocus,
  assignTaskToProject,
  captureTask,
  completeTask,
  createEmptyState,
  createProject,
  deleteTask,
  inboxTasks,
  projectTasks,
  quickCompleteTask,
  reopenTask,
  reviewEntries,
  resolvePendingCloseOut,
  savePendingCloseOutDraft,
  scheduleTaskForToday,
  setCurrentTask,
  startFocus,
  stopFocus,
  todayTasks,
  updateTaskTitle,
} from "../src/domain.js";

const T0 = "2026-08-05T10:00:00.000Z";
const T1 = "2026-08-05T10:12:00.000Z";
const T2 = "2026-08-05T10:13:00.000Z";

function taskState() {
  let state = createEmptyState();
  state = createProject(state, { id: "project-1", name: "签证", createdAt: T0 });
  state = captureTask(state, { id: "task-1", title: "整理签证材料", createdAt: T0 });
  return state;
}

describe("canonical task projections", () => {
  test("one task moves through derived Inbox, project, and Today views without duplication", () => {
    let state = taskState();
    expect(inboxTasks(state)).toHaveLength(1);

    state = assignTaskToProject(state, "task-1", "project-1");
    state = scheduleTaskForToday(state, "task-1", true);

    expect(inboxTasks(state)).toHaveLength(0);
    expect(projectTasks(state, "project-1")).toHaveLength(1);
    expect(todayTasks(state)).toHaveLength(1);
    expect(projectTasks(state, "project-1")[0]).toBe(todayTasks(state)[0]);
    expect(state.tasks).toHaveLength(1);
  });

  test("correcting a title preserves task identity and rejects an empty correction", () => {
    const state = taskState();
    const corrected = updateTaskTitle(state, "task-1", "  整理签证申请材料  ");

    expect(corrected.tasks[0]).toMatchObject({
      id: "task-1",
      title: "整理签证申请材料",
      createdAt: T0,
    });
    expect(corrected.tasks).toHaveLength(1);
    expect(() => updateTaskTitle(corrected, "task-1", "   ")).toThrow("任务标题不能为空");
  });
});

describe("focus lifecycle", () => {
  test("an active focus binds current one and rejects a second task", () => {
    let state = taskState();
    state = captureTask(state, { id: "task-2", title: "给客户回 email 并附 v2 报价", createdAt: T0 });
    state = scheduleTaskForToday(state, "task-1", true);
    state = scheduleTaskForToday(state, "task-2", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });

    expect(activeFocus(state)?.startedAt).toBe(T0);
    expect(() => setCurrentTask(state, "task-2")).toThrow("\u8bf7先停止");
    expect(() => startFocus(state, { id: "focus-2", taskId: "task-2", startedAt: T1 })).toThrow("\u8bf7先停止");
    expect(state.currentTaskId).toBe("task-1");
    expect(state.focusRecords).toHaveLength(1);
  });

  test("completing the focused task closes focus and clears current one", () => {
    let state = taskState();
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    state = completeTask(state, "task-1", T1);

    expect(state.tasks[0].completionState).toBe("completed");
    expect(state.tasks[0].completedAt).toBe(T1);
    expect(state.focusRecords[0].endedAt).toBe(T1);
    expect(activeFocus(state)).toBeNull();
    expect(state.currentTaskId).toBeNull();
  });

  test("stopped focus retains an optional note in chronological Review", () => {
    let state = taskState();
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    const stopped = stopFocus(state, { endedAt: T1 });
    state = savePendingCloseOutDraft(stopped.state, "材料已复印，差照片");
    state = resolvePendingCloseOut(state);
    state = completeTask(state, "task-1", T2);

    const entries = reviewEntries(state);
    expect(entries.map((entry) => entry.kind)).toEqual(["completion", "focus"]);
    expect(entries[1].closeOutNote).toBe("材料已复印，差照片");
  });

  test("stopped focus keeps a canonical pending draft until close-out is resolved", () => {
    let state = taskState();
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    state = stopFocus(state, { endedAt: T1 }).state;
    state = savePendingCloseOutDraft(state, "材料已复印，差照片");

    expect(state.pendingCloseOut).toEqual({
      focusRecordId: "focus-1",
      draft: "材料已复印，差照片",
    });

    state = resolvePendingCloseOut(state);
    expect(state.pendingCloseOut).toBeNull();
    expect(reviewEntries(state)[0].closeOutNote).toBe("材料已复印，差照片");
  });

  test("pending close-out keeps its task as current and in Today", () => {
    let state = taskState();
    state = captureTask(state, { id: "task-2", title: "预约签证照", createdAt: T0 });
    state = scheduleTaskForToday(state, "task-1", true);
    state = scheduleTaskForToday(state, "task-2", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    state = stopFocus(state, { endedAt: T1 }).state;

    expect(() => setCurrentTask(state, "task-2")).toThrow("完成上一段专注的收尾");
    expect(() => scheduleTaskForToday(state, "task-1", false)).toThrow("完成当前专注的收尾");
    expect(() => completeTask(state, "task-1", T2)).toThrow("完成当前专注的收尾");
  });
});

describe("ordinary completion", () => {
  test("completing an unfocused task creates only its completion Review entry", () => {
    let state = taskState();
    state = quickCompleteTask(state, "task-1", T1);

    expect(state.focusRecords).toHaveLength(0);
    expect(reviewEntries(state).map((entry) => entry.kind)).toEqual(["completion"]);
  });

  test("quick completion cannot bypass close-out for its active focused task", () => {
    let state = taskState();
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });

    expect(() => quickCompleteTask(state, "task-1", T1)).toThrow("停止并收尾");
    expect(activeFocus(state)?.id).toBe("focus-1");

    state = stopFocus(state, { endedAt: T1 }).state;
    expect(() => quickCompleteTask(state, "task-1", T2)).toThrow("完成当前专注的收尾");
  });

  test("an accidental completion can be reopened into its original projections", () => {
    let state = taskState();
    state = assignTaskToProject(state, "task-1", "project-1");
    state = scheduleTaskForToday(state, "task-1", true);
    state = quickCompleteTask(state, "task-1", T1);

    state = reopenTask(state, "task-1");

    expect(state.tasks[0].completionState).toBe("open");
    expect(state.tasks[0]).not.toHaveProperty("completedAt");
    expect(projectTasks(state, "project-1")[0]?.id).toBe("task-1");
    expect(todayTasks(state)[0]?.id).toBe("task-1");
    expect(reviewEntries(state)).toHaveLength(0);
  });
});

describe("confirmed deletion boundary", () => {
  test("deleting a task removes its records and current pointer after close-out", () => {
    let state = taskState();
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    expect(() => deleteTask(state, "task-1")).toThrow("先停止并收尾");

    state = stopFocus(state, { endedAt: T1 }).state;
    expect(() => deleteTask(state, "task-1")).toThrow("完成当前专注的收尾");
    state = resolvePendingCloseOut(state);
    state = deleteTask(state, "task-1");

    expect(state.tasks).toHaveLength(0);
    expect(state.focusRecords).toHaveLength(0);
    expect(state.currentTaskId).toBeNull();
  });
});
