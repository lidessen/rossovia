export const STATE_VERSION = 2;

export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function createEmptyState() {
  return {
    version: STATE_VERSION,
    projects: [],
    tasks: [],
    focusRecords: [],
    currentTaskId: null,
    pendingCloseOut: null,
  };
}

function requiredText(value, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new DomainError("required-text", `${label}不能为空。`);
  return text;
}

function taskById(state, taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new DomainError("task-not-found", "找不到这个任务。");
  return task;
}

function openTaskById(state, taskId) {
  const task = taskById(state, taskId);
  if (task.completionState !== "open") {
    throw new DomainError("task-completed", "已完成的任务不能再进行这个操作。");
  }
  return task;
}

function replaceTask(state, taskId, update) {
  return {
    ...state,
    tasks: state.tasks.map((task) => task.id === taskId ? update(task) : task),
  };
}

export function activeFocus(state) {
  return state.focusRecords.find((record) => record.endedAt === null) ?? null;
}

export function createProject(state, { id, name, createdAt }) {
  const projectName = requiredText(name, "项目名称");
  return {
    ...state,
    projects: [
      ...state.projects,
      { id, name: projectName, createdAt },
    ],
  };
}

export function captureTask(state, { id, title, createdAt }) {
  return {
    ...state,
    tasks: [
      ...state.tasks,
      {
        id,
        title: requiredText(title, "任务标题"),
        completionState: "open",
        scheduledForToday: false,
        projectId: null,
        createdAt,
      },
    ],
  };
}

export function updateTaskTitle(state, taskId, title) {
  taskById(state, taskId);
  const nextTitle = requiredText(title, "任务标题");
  return replaceTask(state, taskId, (task) => ({ ...task, title: nextTitle }));
}

export function assignTaskToProject(state, taskId, projectId) {
  openTaskById(state, taskId);
  if (projectId !== null && !state.projects.some((project) => project.id === projectId)) {
    throw new DomainError("project-not-found", "找不到这个项目。");
  }
  return replaceTask(state, taskId, (task) => ({ ...task, projectId }));
}

export function scheduleTaskForToday(state, taskId, scheduledForToday = true) {
  openTaskById(state, taskId);
  const nextScheduled = Boolean(scheduledForToday);
  const active = activeFocus(state);
  if (!nextScheduled && active?.taskId === taskId) {
    throw new DomainError("focus-active", "请先停止并收尾当前专注。");
  }
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  if (!nextScheduled && pendingRecord?.taskId === taskId) {
    throw new DomainError("close-out-pending", "请先完成当前专注的收尾记录。");
  }
  const nextState = replaceTask(state, taskId, (task) => ({
    ...task,
    scheduledForToday: nextScheduled,
  }));
  return !nextScheduled && state.currentTaskId === taskId
    ? { ...nextState, currentTaskId: null }
    : nextState;
}

export function setCurrentTask(state, taskId) {
  const task = openTaskById(state, taskId);
  if (!task.scheduledForToday) {
    throw new DomainError("task-not-in-today", "只能把今天的任务设为当前一件。");
  }
  const active = activeFocus(state);
  if (active && active.taskId !== taskId) {
    throw new DomainError("focus-active", "请先停止并收尾当前专注。");
  }
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  if (pendingRecord && pendingRecord.taskId !== taskId) {
    throw new DomainError("close-out-pending", "请先完成上一段专注的收尾记录。");
  }
  return { ...state, currentTaskId: taskId };
}

export function startFocus(state, { id, taskId, startedAt }) {
  const task = openTaskById(state, taskId);
  if (state.pendingCloseOut) {
    throw new DomainError("close-out-pending", "请先完成上一段专注的收尾记录。");
  }
  const active = activeFocus(state);
  if (active) {
    throw new DomainError(
      "focus-active",
      active.taskId === taskId ? "这个任务已在专注中。" : "请先停止并收尾当前专注。",
    );
  }
  if (!task.scheduledForToday || state.currentTaskId !== taskId) {
    throw new DomainError("not-current-task", "请先把这个任务设为当前一件。");
  }
  return {
    ...state,
    focusRecords: [
      ...state.focusRecords,
      { id, taskId, startedAt, endedAt: null },
    ],
  };
}

export function stopFocus(state, { endedAt }) {
  const active = activeFocus(state);
  if (!active) throw new DomainError("no-active-focus", "当前没有正在进行的专注。");
  return {
    state: {
      ...state,
      focusRecords: state.focusRecords.map((record) => (
        record.id === active.id ? { ...record, endedAt } : record
      )),
      pendingCloseOut: { focusRecordId: active.id, draft: "" },
    },
    focusRecordId: active.id,
  };
}

function setFocusCloseOutNote(state, focusRecordId, note) {
  const record = state.focusRecords.find((candidate) => candidate.id === focusRecordId);
  if (!record) throw new DomainError("focus-not-found", "找不到这段专注记录。");
  if (record.endedAt === null) {
    throw new DomainError("focus-active", "停止专注后才能写收尾记录。");
  }
  const closeOutNote = typeof note === "string" ? note.trim() : "";
  return {
    ...state,
    focusRecords: state.focusRecords.map((candidate) => {
      if (candidate.id !== focusRecordId) return candidate;
      if (!closeOutNote) {
        const { closeOutNote: _discarded, ...withoutNote } = candidate;
        return withoutNote;
      }
      return { ...candidate, closeOutNote };
    }),
  };
}

export function savePendingCloseOutDraft(state, draft) {
  if (!state.pendingCloseOut) {
    throw new DomainError("no-pending-close-out", "当前没有待完成的收尾记录。");
  }
  return {
    ...state,
    pendingCloseOut: {
      ...state.pendingCloseOut,
      draft: typeof draft === "string" ? draft : "",
    },
  };
}

export function resolvePendingCloseOut(state) {
  if (!state.pendingCloseOut) {
    throw new DomainError("no-pending-close-out", "当前没有待完成的收尾记录。");
  }
  const { focusRecordId, draft } = state.pendingCloseOut;
  return {
    ...setFocusCloseOutNote(state, focusRecordId, draft),
    pendingCloseOut: null,
  };
}

export function completeTask(state, taskId, completedAt) {
  openTaskById(state, taskId);
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  if (pendingRecord?.taskId === taskId) {
    throw new DomainError("close-out-pending", "请先完成当前专注的收尾记录。");
  }
  const active = activeFocus(state);
  return {
    ...replaceTask(state, taskId, (task) => ({
      ...task,
      completionState: "completed",
      completedAt,
    })),
    focusRecords: state.focusRecords.map((record) => (
      record.id === active?.id && record.taskId === taskId
        ? { ...record, endedAt: completedAt }
        : record
    )),
    currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
  };
}

export function quickCompleteTask(state, taskId, completedAt) {
  openTaskById(state, taskId);
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  if (activeFocus(state)?.taskId === taskId) {
    throw new DomainError("focus-active", "请先停止并收尾当前专注。");
  }
  if (pendingRecord?.taskId === taskId) {
    throw new DomainError("close-out-pending", "请先完成当前专注的收尾记录。");
  }
  return completeTask(state, taskId, completedAt);
}

export function reopenTask(state, taskId) {
  const task = taskById(state, taskId);
  if (task.completionState !== "completed") {
    throw new DomainError("task-open", "这个任务已经是未完成状态。");
  }
  return replaceTask(state, taskId, (candidate) => {
    const { completedAt: _discarded, ...reopened } = candidate;
    return { ...reopened, completionState: "open" };
  });
}

export function deleteTask(state, taskId) {
  taskById(state, taskId);
  if (activeFocus(state)?.taskId === taskId) {
    throw new DomainError("focus-active", "请先停止并收尾当前专注，再删除任务。");
  }
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  if (pendingRecord?.taskId === taskId) {
    throw new DomainError("close-out-pending", "请先完成当前专注的收尾记录，再删除任务。");
  }
  return {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== taskId),
    focusRecords: state.focusRecords.filter((record) => record.taskId !== taskId),
    currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
  };
}

export function inboxTasks(state) {
  return state.tasks.filter((task) => (
    task.completionState === "open"
    && task.projectId === null
    && task.scheduledForToday === false
  ));
}

export function todayTasks(state) {
  return state.tasks.filter((task) => (
    task.completionState === "open" && task.scheduledForToday === true
  ));
}

export function projectTasks(state, projectId) {
  return state.tasks.filter((task) => (
    task.completionState === "open" && task.projectId === projectId
  ));
}

export function reviewEntries(state) {
  const taskEntries = state.tasks
    .filter((task) => task.completionState === "completed")
    .map((task) => ({
      id: `task:${task.id}`,
      kind: "completion",
      taskId: task.id,
      occurredAt: task.completedAt,
      title: task.title,
      projectId: task.projectId,
    }));
  const focusEntries = state.focusRecords
    .filter((record) => record.endedAt !== null)
    .map((record) => {
      const task = state.tasks.find((candidate) => candidate.id === record.taskId);
      return {
        id: `focus:${record.id}`,
        kind: "focus",
        taskId: record.taskId,
        occurredAt: record.endedAt,
        startedAt: record.startedAt,
        title: task?.title ?? "已删除的任务",
        projectId: task?.projectId ?? null,
        closeOutNote: record.closeOutNote ?? "",
      };
    });
  return [...taskEntries, ...focusEntries]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
