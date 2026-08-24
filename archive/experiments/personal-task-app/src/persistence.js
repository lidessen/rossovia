import { activeFocus, createEmptyState, STATE_VERSION } from "./domain.js";

export const STORAGE_KEY = "rossovia.personal-task-app.v1";

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value) {
  return isString(value) && Number.isFinite(Date.parse(value));
}

export function validateState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("任务数据不是有效对象。");
  }
  if (value.version !== STATE_VERSION) throw new Error("任务数据版本不受支持。");
  if (!Array.isArray(value.projects) || !Array.isArray(value.tasks) || !Array.isArray(value.focusRecords)) {
    throw new Error("任务数据结构不完整。");
  }
  if (!(value.currentTaskId === null || isString(value.currentTaskId))) {
    throw new Error("当前一件的引用无效。");
  }
  if (
    !(value.pendingCloseOut === null || (
      value.pendingCloseOut
      && typeof value.pendingCloseOut === "object"
      && isString(value.pendingCloseOut.focusRecordId)
      && typeof value.pendingCloseOut.draft === "string"
    ))
  ) {
    throw new Error("待收尾记录无效。");
  }

  const projectIds = new Set();
  for (const project of value.projects) {
    if (!isString(project?.id) || !isString(project?.name) || !isTimestamp(project?.createdAt)) {
      throw new Error("项目记录无效。");
    }
    if (projectIds.has(project.id)) throw new Error("项目 ID 重复。");
    projectIds.add(project.id);
  }

  const taskIds = new Set();
  for (const task of value.tasks) {
    if (
      !isString(task?.id)
      || !isString(task?.title)
      || !isTimestamp(task?.createdAt)
      || !["open", "completed"].includes(task?.completionState)
      || typeof task?.scheduledForToday !== "boolean"
      || !(task?.projectId === null || isString(task?.projectId))
    ) {
      throw new Error("任务记录无效。");
    }
    if (taskIds.has(task.id)) throw new Error("任务 ID 重复。");
    if (task.projectId !== null && !projectIds.has(task.projectId)) {
      throw new Error("任务引用了不存在的项目。");
    }
    if (task.completionState === "completed" ? !isTimestamp(task.completedAt) : "completedAt" in task) {
      throw new Error("任务的完成时间与状态不一致。");
    }
    taskIds.add(task.id);
  }

  const focusIds = new Set();
  let activeCount = 0;
  for (const record of value.focusRecords) {
    if (
      !isString(record?.id)
      || !isString(record?.taskId)
      || !isTimestamp(record?.startedAt)
      || !(record?.endedAt === null || isTimestamp(record?.endedAt))
      || !taskIds.has(record.taskId)
      || !(record.closeOutNote === undefined || typeof record.closeOutNote === "string")
    ) {
      throw new Error("专注记录无效。");
    }
    if (focusIds.has(record.id)) throw new Error("专注记录 ID 重复。");
    if (record.endedAt === null) activeCount += 1;
    focusIds.add(record.id);
  }
  if (activeCount > 1) throw new Error("同时存在多段正在进行的专注。");

  const currentTask = value.tasks.find((task) => task.id === value.currentTaskId);
  if (
    value.currentTaskId !== null
    && (!currentTask || currentTask.completionState !== "open" || !currentTask.scheduledForToday)
  ) {
    throw new Error("当前一件必须引用今天的未完成任务。");
  }
  const active = activeFocus(value);
  if (active && value.currentTaskId !== active.taskId) {
    throw new Error("正在进行的专注必须与当前一件一致。");
  }
  if (active && value.pendingCloseOut) {
    throw new Error("正在专注时不能同时存在待收尾记录。");
  }
  if (value.pendingCloseOut) {
    const pendingRecord = value.focusRecords.find(
      (record) => record.id === value.pendingCloseOut.focusRecordId,
    );
    const pendingTask = pendingRecord
      ? value.tasks.find((task) => task.id === pendingRecord.taskId)
      : null;
    if (
      !pendingRecord
      || pendingRecord.endedAt === null
      || pendingTask?.completionState !== "open"
      || pendingTask.scheduledForToday !== true
      || value.currentTaskId !== pendingRecord.taskId
    ) {
      throw new Error("待收尾记录必须绑定当前一件中已停止专注的未完成任务。");
    }
  }
  return value;
}

export function serializeState(state) {
  return JSON.stringify(validateState(state));
}

export function deserializeState(serialized) {
  const parsed = JSON.parse(serialized);
  const migrated = parsed?.version === 1
    ? { ...parsed, version: STATE_VERSION, pendingCloseOut: null }
    : parsed;
  return validateState(migrated);
}

export function createStorageAdapter(storage, key = STORAGE_KEY) {
  let writesBlockedByFailedLoad = false;

  return {
    load() {
      try {
        const serialized = storage.getItem(key);
        const state = serialized === null ? createEmptyState() : deserializeState(serialized);
        writesBlockedByFailedLoad = false;
        return state;
      } catch (error) {
        writesBlockedByFailedLoad = true;
        throw error;
      }
    },
    save(state) {
      if (writesBlockedByFailedLoad) {
        throw new Error("本机原任务数据无法读取；为避免覆盖，本次会话禁止保存。");
      }
      storage.setItem(key, serializeState(state));
    },
    restore(serialized) {
      const restored = deserializeState(serialized);
      storage.setItem(key, serializeState(restored));
      writesBlockedByFailedLoad = false;
      return restored;
    },
  };
}
