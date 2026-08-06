import { describe, expect, test } from "bun:test";
import {
  captureTask,
  createEmptyState,
  scheduleTaskForToday,
  savePendingCloseOutDraft,
  setCurrentTask,
  startFocus,
  stopFocus,
} from "../src/domain.js";
import {
  createStorageAdapter,
  deserializeState,
  serializeState,
  STORAGE_KEY,
} from "../src/persistence.js";

const T0 = "2026-08-05T10:00:00.000Z";

function memoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("single-device persistence", () => {
  test("round-trip preserves task identity and active focus recovery timestamp", () => {
    let state = createEmptyState();
    state = captureTask(state, { id: "task-1", title: "整理签证材料", createdAt: T0 });
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });

    const restored = deserializeState(serializeState(state));
    expect(restored.tasks[0].id).toBe("task-1");
    expect(restored.currentTaskId).toBe("task-1");
    expect(restored.focusRecords[0]).toMatchObject({
      id: "focus-1",
      taskId: "task-1",
      startedAt: T0,
      endedAt: null,
    });
  });

  test("storage adapter saves and reloads the canonical state", () => {
    const adapter = createStorageAdapter(memoryStorage());
    const empty = adapter.load();
    const state = captureTask(empty, { id: "task-1", title: "给妈妈订体检", createdAt: T0 });
    adapter.save(state);

    expect(adapter.load()).toEqual(state);
  });

  test("an exported backup restores the complete canonical state after validation", () => {
    let exportedState = createEmptyState();
    exportedState = captureTask(exportedState, {
      id: "task-exported",
      title: "导出后还原",
      createdAt: T0,
    });
    const exported = serializeState(exportedState);
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 999 }) });
    const adapter = createStorageAdapter(storage);

    expect(() => adapter.load()).toThrow("版本不受支持");
    expect(adapter.restore(exported)).toEqual(exportedState);
    expect(adapter.load()).toEqual(exportedState);

    const beforeInvalidRestore = storage.getItem(STORAGE_KEY);
    expect(() => adapter.restore('{"version":2,"tasks":[]}')).toThrow("结构不完整");
    expect(storage.getItem(STORAGE_KEY)).toBe(beforeInvalidRestore);
  });

  test("restore rejects whitespace domain text and invalid timestamps before replacing storage", () => {
    const original = captureTask(createEmptyState(), {
      id: "task-valid",
      title: "保留原任务",
      createdAt: T0,
    });
    const storage = memoryStorage();
    const adapter = createStorageAdapter(storage);
    adapter.save(original);
    const invalid = JSON.parse(serializeState(original));
    invalid.tasks[0].title = "   ";
    invalid.tasks[0].createdAt = "not-a-date";

    expect(() => adapter.restore(JSON.stringify(invalid))).toThrow();
    expect(adapter.load()).toEqual(original);
  });

  test("a failed load preserves the original payload when the next captured task tries to save", () => {
    const originalPayload = JSON.stringify({ version: 999, valuable: "unreadable task data" });
    const storage = memoryStorage({ [STORAGE_KEY]: originalPayload });
    const adapter = createStorageAdapter(storage);
    const replacementState = captureTask(createEmptyState(), {
      id: "replacement-task",
      title: "不能覆盖原数据",
      createdAt: T0,
    });

    expect(() => adapter.load()).toThrow("版本不受支持");
    expect(() => adapter.save(replacementState)).toThrow("避免覆盖");
    expect(storage.getItem(STORAGE_KEY)).toBe(originalPayload);
  });

  test("reload preserves the pending close-out identity and draft", () => {
    const adapter = createStorageAdapter(memoryStorage());
    let state = createEmptyState();
    state = captureTask(state, { id: "task-1", title: "整理签证材料", createdAt: T0 });
    state = scheduleTaskForToday(state, "task-1", true);
    state = setCurrentTask(state, "task-1");
    state = startFocus(state, { id: "focus-1", taskId: "task-1", startedAt: T0 });
    state = stopFocus(state, { endedAt: "2026-08-05T10:12:00.000Z" }).state;
    state = savePendingCloseOutDraft(state, "材料已复印，差照片");
    adapter.save(state);

    expect(adapter.load().pendingCloseOut).toEqual({
      focusRecordId: "focus-1",
      draft: "材料已复印，差照片",
    });

    const invalid = { ...state, pendingCloseOut: { focusRecordId: "missing", draft: "还在这里" } };
    expect(() => deserializeState(JSON.stringify(invalid))).toThrow("待收尾记录必须");

    const detached = { ...state, currentTaskId: null };
    expect(() => deserializeState(JSON.stringify(detached))).toThrow("必须绑定当前一件");
  });

  test("loading legacy v1 state adds an empty pending close-out slot", () => {
    const legacy = {
      version: 1,
      projects: [],
      tasks: [],
      focusRecords: [],
      currentTaskId: null,
    };

    expect(deserializeState(JSON.stringify(legacy))).toMatchObject({
      version: 2,
      pendingCloseOut: null,
    });
  });

  test("deserialization rejects an active focus that is not bound to current one", () => {
    const invalid = {
      version: 1,
      projects: [],
      tasks: [{
        id: "task-1",
        title: "整理签证材料",
        completionState: "open",
        scheduledForToday: true,
        projectId: null,
        createdAt: T0,
      }],
      focusRecords: [{ id: "focus-1", taskId: "task-1", startedAt: T0, endedAt: null }],
      currentTaskId: null,
    };

    expect(() => deserializeState(JSON.stringify(invalid))).toThrow("必须与当前一件一致");
  });
});
