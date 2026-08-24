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
} from "./domain.js";
import { shouldSubmitOnEnter } from "./ime.js";
import { createStorageAdapter, deserializeState, serializeState } from "./persistence.js";
import { shouldFocusCapture } from "./shortcuts.js";

const root = document.querySelector("#app");
const storage = createStorageAdapter(window.localStorage);

let loadError = "";
let state;
try {
  state = storage.load();
} catch (error) {
  state = createEmptyState();
  loadError = `本机数据无法读取：${error.message}`;
}

let view = activeFocus(state) || state.pendingCloseOut ? "focus" : "today";
let selectedProjectId = state.projects[0]?.id ?? null;
let captureCompositionActive = false;
let captureImeCommitPending = false;
let editCompositionActive = false;
let editImeCommitPending = false;
let editingTaskId = null;
const expandedTaskIds = new Set();
let toast = loadError ? { kind: "error", text: loadError } : null;
let toastTimer = null;

const viewCopy = {
  today: {
    eyebrow: "TODAY",
    title: "今天",
    subtitle: "先看清当前一件，再安静地安排其他事。",
  },
  inbox: {
    eyebrow: "INBOX",
    title: "收件箱",
    subtitle: "想到什么，先收好。安排可以等一个更平静的时刻。",
  },
  projects: {
    eyebrow: "PROJECTS",
    title: "项目",
    subtitle: "一个项目只是把相关的事放在一起，不加工作流程。",
  },
  review: {
    eyebrow: "REVIEW",
    title: "回顾",
    subtitle: "记住做过什么、做到哪里，不打分。",
  },
};

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function taskById(taskId) {
  return state.tasks.find((task) => task.id === taskId) ?? null;
}

function projectById(projectId) {
  return state.projects.find((project) => project.id === projectId) ?? null;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatToday() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function formatElapsed(startedAt) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const parts = [minutes, seconds];
  if (hours > 0) parts.unshift(hours);
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

function showMessage(text, kind = "status") {
  toast = { text, kind };
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = null;
    root.querySelector(".toast")?.remove();
  }, 2600);
}

function showMessageWithoutRender(text, kind = "status") {
  toast = { text, kind };
  root.querySelector(".toast")?.remove();
  root.insertAdjacentHTML(
    "beforeend",
    `<div class="toast" data-kind="${escapeHtml(kind)}" role="status">${escapeHtml(text)}</div>`,
  );
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = null;
    root.querySelector(".toast")?.remove();
  }, 2600);
}

function commit(nextState, message = "", { renderView = true } = {}) {
  try {
    storage.save(nextState);
    state = nextState;
    if (message) {
      showMessage(message);
    } else if (renderView) {
      render();
    }
  } catch (error) {
    showMessageWithoutRender(`无法保存：${error.message}`, "error");
  }
}

function projectOptions(selectedProjectIdForTask) {
  return [
    `<option value="">无项目</option>`,
    ...state.projects.map((project) => (
      `<option value="${escapeHtml(project.id)}"${project.id === selectedProjectIdForTask ? " selected" : ""}>${escapeHtml(project.name)}</option>`
    )),
  ].join("");
}

function taskTitleEditor(task, prominent = false) {
  return `
    <form class="task-title-form${prominent ? " prominent" : ""}" data-form="edit-task" data-task-id="${escapeHtml(task.id)}">
      <input data-task-title-input name="title" value="${escapeHtml(task.title)}" maxlength="240" autocomplete="off" aria-label="修改任务标题">
      <div class="task-title-form-actions">
        <button class="secondary-button" type="button" data-action="cancel-edit" data-task-id="${escapeHtml(task.id)}">取消</button>
        <button class="primary-button" type="submit">保存标题</button>
      </div>
    </form>
  `;
}

function taskRow(task, { showCurrentAction = false } = {}) {
  const active = activeFocus(state);
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  const project = projectById(task.projectId);
  const lockedByOtherFocus = (
    active !== null && active.taskId !== task.id
  ) || (
    pendingRecord !== null && pendingRecord.taskId !== task.id
  );
  const activeForTask = active?.taskId === task.id;
  const pendingForTask = pendingRecord?.taskId === task.id;
  const quickCompleteBlocked = activeForTask || pendingForTask;
  const isCurrent = state.currentTaskId === task.id;
  const titleExpanded = expandedTaskIds.has(task.id);
  const editing = editingTaskId === task.id;
  const currentAction = showCurrentAction && task.scheduledForToday
    ? `<button type="button" data-action="set-current" data-task-id="${escapeHtml(task.id)}" ${lockedByOtherFocus ? "disabled" : ""} title="${lockedByOtherFocus ? "请先收尾当前专注" : ""}">${
      active?.taskId === task.id ? "回到专注" : isCurrent ? "当前一件" : "设为当前一件"
    }</button>`
    : "";
  return `
    <li class="task-row">
      <div>
        ${editing
          ? taskTitleEditor(task)
          : `<button class="task-title${titleExpanded ? " expanded" : ""}" type="button" data-action="toggle-title" data-task-id="${escapeHtml(task.id)}" aria-expanded="${titleExpanded}" title="${titleExpanded ? "收起完整标题" : "展开完整标题"}">${escapeHtml(task.title)}</button>`}
        <div class="task-meta">${project ? escapeHtml(project.name) : "未归入项目"}${task.scheduledForToday ? " · 今天" : ""}</div>
      </div>
      <div class="task-actions">
        <select data-action="assign-project" data-task-id="${escapeHtml(task.id)}" aria-label="选择所属项目">
          ${projectOptions(task.projectId)}
        </select>
        <button type="button" data-action="toggle-today" data-task-id="${escapeHtml(task.id)}" ${activeForTask || pendingForTask ? "disabled" : ""} title="${activeForTask ? "专注时不能移出今天" : pendingForTask ? "请先完成当前专注的收尾记录" : ""}">
          ${task.scheduledForToday ? "移出今天" : "安排今天"}
        </button>
        ${currentAction}
        <button type="button" data-action="edit-task" data-task-id="${escapeHtml(task.id)}">修改</button>
        <button type="button" data-action="quick-complete" data-task-id="${escapeHtml(task.id)}" ${quickCompleteBlocked ? "disabled" : ""} title="${activeForTask ? "请先停止并收尾当前专注" : pendingForTask ? "请先完成当前专注的收尾记录" : "直接完成，不创建专注记录"}">完成</button>
        <button type="button" data-action="delete-task" data-task-id="${escapeHtml(task.id)}" ${activeForTask || pendingForTask ? "disabled" : ""} title="${activeForTask || pendingForTask ? "请先完成专注收尾" : "删除前会再次确认"}">删除</button>
      </div>
    </li>
  `;
}

function taskList(tasks, emptyCopy, options = {}) {
  if (tasks.length === 0) return `<div class="empty-state">${escapeHtml(emptyCopy)}</div>`;
  return `<ul class="task-list">${tasks.map((task) => taskRow(task, options)).join("")}</ul>`;
}

function navigation(location = "sidebar") {
  const inboxCount = inboxTasks(state).length;
  const todayCount = todayTasks(state).length;
  const items = [
    ["today", "今天", todayCount],
    ["inbox", "收件箱", inboxCount],
    ["projects", "项目", state.projects.length],
    ["review", "回顾", ""],
  ];
  return `
    <nav class="${location === "mobile" ? "mobile-nav" : "nav-list"}" aria-label="主要导航">
      ${items.map(([target, label, count]) => `
        <button class="nav-button" type="button" data-view="${target}" ${view === target ? 'aria-current="page"' : ""}>
          <span>${label}</span><span class="nav-count">${count}</span>
        </button>
      `).join("")}
      ${location === "mobile" ? '<button class="nav-button mobile-capture" type="button" data-action="focus-capture"><span>＋ 收集</span></button>' : ""}
    </nav>
  `;
}

function captureCard() {
  return `
    <section class="capture-card" aria-label="快速收集">
      <form class="capture-form" data-form="capture">
        <input id="capture-title" name="title" autocomplete="off" maxlength="240" placeholder="想到什么，先记下标题…" aria-label="任务标题">
        <button class="primary-button" type="submit">收好</button>
      </form>
      <p class="capture-hint">只要一个标题。项目和今天可以稍后再安排。</p>
    </section>
  `;
}

function activeStrip() {
  const active = activeFocus(state);
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  const task = taskById(active?.taskId ?? pendingRecord?.taskId);
  if (!active && !pendingRecord) return "";
  return `
    <aside class="active-strip" aria-label="${active ? "正在专注" : "待完成收尾"}">
      <div><strong>${escapeHtml(task?.title ?? "当前一件")}</strong><span>${active ? "专注正在继续，切换任务前需要先收尾。" : "收尾记录还没完成，草稿已经保存。"}</span></div>
      <button class="secondary-button" type="button" data-action="${active ? "return-focus" : "return-closeout"}">${active ? "回到专注" : "继续收尾"}</button>
    </aside>
  `;
}

function todaySurface() {
  const tasks = todayTasks(state);
  const current = taskById(state.currentTaskId);
  const active = activeFocus(state);
  const pendingRecord = state.pendingCloseOut
    ? state.focusRecords.find((record) => record.id === state.pendingCloseOut.focusRecordId)
    : null;
  const currentNeedsCloseOut = pendingRecord?.taskId === current?.id;
  const remaining = tasks.filter((task) => task.id !== current?.id);
  const currentCard = current
    ? `
      <section class="current-card">
        <p class="current-label">当前一件</p>
        ${editingTaskId === current.id ? taskTitleEditor(current, true) : `<h2 class="current-title">${escapeHtml(current.title)}</h2>`}
        <div class="current-actions">
          <button class="primary-button" type="button" data-action="${active?.taskId === current.id ? "return-focus" : currentNeedsCloseOut ? "return-closeout" : "start-focus"}" data-task-id="${escapeHtml(current.id)}">
            ${active?.taskId === current.id ? "回到专注" : currentNeedsCloseOut ? "继续收尾" : "开始专注"}
          </button>
          <button class="secondary-button" type="button" data-action="edit-task" data-task-id="${escapeHtml(current.id)}">修改标题</button>
          <button class="quiet-button" type="button" data-action="delete-task" data-task-id="${escapeHtml(current.id)}" ${active?.taskId === current.id || currentNeedsCloseOut ? "disabled" : ""}>删除</button>
        </div>
      </section>
    `
    : `
      <section class="current-card">
        <p class="current-label">当前一件</p>
        <h2 class="current-title">还没有选择</h2>
        <p class="page-subtitle">从今天的任务中选一件，就可以开始。</p>
      </section>
    `;
  return `
    ${currentCard}
    <section class="panel">
      <div class="panel-header"><h2>今天其他</h2><span class="task-meta">${remaining.length} 件</span></div>
      ${taskList(remaining, "今天还没有其他任务。", { showCurrentAction: true })}
    </section>
  `;
}

function inboxSurface() {
  const tasks = inboxTasks(state);
  return `
    <section class="panel">
      <div class="panel-header"><h2>待安排</h2><span class="task-meta">${tasks.length} 件</span></div>
      ${taskList(tasks, "收件箱是空的。想到什么，就先记下来——只要一个标题。")}
    </section>
  `;
}

function projectsSurface() {
  if (selectedProjectId !== null && !projectById(selectedProjectId)) {
    selectedProjectId = state.projects[0]?.id ?? null;
  }
  const selected = projectById(selectedProjectId);
  return `
    <section class="panel">
      <div class="project-create">
        <form class="project-form" data-form="project">
          <input name="name" maxlength="80" autocomplete="off" placeholder="新项目名称" aria-label="新项目名称">
          <button class="secondary-button" type="submit">创建项目</button>
        </form>
      </div>
      ${state.projects.length === 0 ? "" : `
        <div class="project-tabs" role="list" aria-label="项目列表">
          ${state.projects.map((project) => `
            <button class="project-tab" type="button" data-action="select-project" data-project-id="${escapeHtml(project.id)}" aria-pressed="${project.id === selectedProjectId}">${escapeHtml(project.name)}</button>
          `).join("")}
        </div>
      `}
      ${selected
        ? `
          <div class="panel-header"><h2>${escapeHtml(selected.name)}</h2><span class="task-meta">${projectTasks(state, selected.id).length} 件未完成</span></div>
          ${taskList(projectTasks(state, selected.id), "这个项目还没有任务。去收件箱把一件事归进来吧。", { showCurrentAction: true })}
        `
        : `<div class="empty-state">先创建一个项目，例如“搬家”或“签证”。</div>`}
    </section>
  `;
}

function reviewSurface() {
  const entries = reviewEntries(state);
  return `
    <section class="panel">
      ${entries.length === 0
        ? `<div class="empty-state">还没有可回顾的记录。做完一件事后，它会安静地留在这里。</div>`
        : `<ul class="review-list">
          ${entries.map((entry) => {
          const project = projectById(entry.projectId);
          return `
            <li class="review-row">
              <div class="review-time">${formatDateTime(entry.occurredAt)}${project ? `<br>${escapeHtml(project.name)}` : ""}</div>
              <div>
                <span class="review-kind">${entry.kind === "completion" ? "完成" : "专注记录"}</span>
                <p class="review-title">${escapeHtml(entry.title)}</p>
                ${entry.kind === "focus" && entry.closeOutNote ? `<p class="review-note">“${escapeHtml(entry.closeOutNote)}”</p>` : ""}
                ${entry.kind === "completion" ? `
                  <div class="review-actions">
                    <button type="button" data-action="reopen-task" data-task-id="${escapeHtml(entry.taskId)}">重新打开</button>
                    <button type="button" data-action="delete-task" data-task-id="${escapeHtml(entry.taskId)}">删除</button>
                  </div>
                ` : ""}
              </div>
            </li>
          `;
          }).join("")}
        </ul>`}
    </section>
    <section class="panel data-panel" aria-labelledby="data-tools-title">
      <div class="panel-header"><h2 id="data-tools-title">数据备份</h2><span class="task-meta">本机文件</span></div>
      <div class="data-tools">
        <p>导出一份 JSON 备份。恢复会先验证文件，并在你确认后替换当前浏览器里的全部数据。</p>
        <div>
          <button class="secondary-button" type="button" data-action="export-data">导出备份</button>
          <input class="visually-hidden" id="restore-file" type="file" accept="application/json,.json">
          <label class="file-button" for="restore-file">从备份恢复</label>
        </div>
      </div>
    </section>
  `;
}

function normalShell() {
  const copy = viewCopy[view] ?? viewCopy.today;
  const surface = view === "inbox"
    ? inboxSurface()
    : view === "projects"
      ? projectsSurface()
      : view === "review"
        ? reviewSurface()
        : todaySurface();
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark" aria-hidden="true">一</span><h1>个人任务</h1><p>收好、排好、做完，<br>把“做到哪了”留给自己。</p></div>
        ${navigation()}
        <p class="storage-note">数据只保存在当前浏览器。<br>没有账号、同步或评分。</p>
      </aside>
      <main class="main">
        <header class="topline">
          <div><p class="eyebrow">${copy.eyebrow}${view === "today" ? ` · ${escapeHtml(formatToday())}` : ""}</p><h1 class="page-title">${copy.title}</h1><p class="page-subtitle">${copy.subtitle}</p></div>
          <button class="primary-button capture-shortcut-button" type="button" data-action="focus-capture" aria-keyshortcuts="N">＋ 快速收集 <kbd aria-hidden="true">N</kbd></button>
        </header>
        ${captureCard()}
        ${activeStrip()}
        ${surface}
      </main>
      ${navigation("mobile")}
    </div>
  `;
}

function focusSurface() {
  const active = activeFocus(state);
  if (active) {
    const task = taskById(active.taskId);
    return `
      <main class="focus-shell">
        <section class="focus-card">
          <button class="focus-exit quiet-button" type="button" data-action="leave-focus">退出专注界面</button>
          <p class="current-label">当前一件</p>
          <h1 class="focus-title">${escapeHtml(task?.title ?? "当前一件")}</h1>
          <div class="focus-timer" data-focus-timer data-started-at="${escapeHtml(active.startedAt)}">${formatElapsed(active.startedAt)}</div>
          <button class="danger-button" type="button" data-action="stop-focus">停止并收尾</button>
        </section>
      </main>
    `;
  }

  const record = state.pendingCloseOut
    ? state.focusRecords.find((candidate) => candidate.id === state.pendingCloseOut.focusRecordId)
    : null;
  const task = record ? taskById(record.taskId) : null;
  if (!record || !task) {
    view = "today";
    return normalShell();
  }
  return `
    <main class="focus-shell">
      <section class="focus-card">
        <p class="current-label">收尾记录</p>
        <h1 class="focus-title">${escapeHtml(task.title)}</h1>
        <form class="closeout-form" data-form="closeout">
          <label for="closeout-note">做到哪了？<span>可以留空。一句话就足够让下次更好接上。</span></label>
          <textarea id="closeout-note" name="note" maxlength="1000" placeholder="例如：材料已复印，差照片">${escapeHtml(state.pendingCloseOut?.draft ?? "")}</textarea>
          <div class="closeout-actions">
            <button class="secondary-button" type="button" data-action="continue-task">稍后继续</button>
            <button class="primary-button" type="button" data-action="complete-task">完成任务</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function render() {
  root.innerHTML = `${view === "focus" ? focusSurface() : normalShell()}${toast ? `<div class="toast" data-kind="${toast.kind}" role="status">${escapeHtml(toast.text)}</div>` : ""}`;
  tickTimer();
}

function tickTimer() {
  const timer = root.querySelector("[data-focus-timer]");
  if (timer) timer.textContent = formatElapsed(timer.dataset.startedAt);
}

function perform(action) {
  try {
    action();
  } catch (error) {
    showMessage(error.message ?? "操作没有完成。", "error");
  }
}

root.addEventListener("compositionstart", (event) => {
  if (event.target.id === "capture-title") captureCompositionActive = true;
  if (event.target.matches("[data-task-title-input]")) editCompositionActive = true;
});

function focusCaptureInput() {
  if (view === "focus") {
    view = "today";
    render();
  }
  const input = root.querySelector("#capture-title");
  input?.scrollIntoView({ behavior: "auto", block: "center" });
  input?.focus({ preventScroll: true });
}

document.addEventListener("keydown", (event) => {
  if (!shouldFocusCapture(event)) return;
  event.preventDefault();
  focusCaptureInput();
});

root.addEventListener("compositionend", (event) => {
  if (event.target.id === "capture-title") {
    captureCompositionActive = false;
    captureImeCommitPending = true;
    queueMicrotask(() => { captureImeCommitPending = false; });
  }
  if (event.target.matches("[data-task-title-input]")) {
    editCompositionActive = false;
    editImeCommitPending = true;
    queueMicrotask(() => { editImeCommitPending = false; });
  }
});

root.addEventListener("keydown", (event) => {
  if (event.target.id === "capture-title" && event.key === "Enter") {
    if (!shouldSubmitOnEnter(event, captureCompositionActive || captureImeCommitPending)) return;
    event.preventDefault();
    event.target.form.requestSubmit();
  }
  if (event.target.matches("[data-task-title-input]")) {
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault();
      const taskId = event.target.form.dataset.taskId;
      editingTaskId = null;
      render();
      root.querySelector(`[data-action="edit-task"][data-task-id="${CSS.escape(taskId)}"]`)?.focus();
      return;
    }
    if (event.key === "Enter" && shouldSubmitOnEnter(event, editCompositionActive || editImeCommitPending)) {
      event.preventDefault();
      event.target.form.requestSubmit();
    }
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.dataset.form === "capture") {
    if (!event.submitter && (captureCompositionActive || captureImeCommitPending)) return;
    const input = form.elements.title;
    perform(() => {
      commit(captureTask(state, { id: id(), title: input.value, createdAt: now() }), "已收进收件箱。");
      queueMicrotask(focusCaptureInput);
    });
  }
  if (form.dataset.form === "project") {
    const input = form.elements.name;
    perform(() => {
      const projectId = id();
      selectedProjectId = projectId;
      commit(createProject(state, { id: projectId, name: input.value, createdAt: now() }), "项目已创建。");
    });
  }
  if (form.dataset.form === "edit-task") {
    perform(() => {
      const taskId = form.dataset.taskId;
      const nextState = updateTaskTitle(state, taskId, form.elements.title.value);
      editingTaskId = null;
      commit(nextState, "标题已修改。");
    });
  }
});

root.addEventListener("input", (event) => {
  if (event.target.id !== "closeout-note") return;
  perform(() => {
    commit(savePendingCloseOutDraft(state, event.target.value), "", { renderView: false });
  });
});

root.addEventListener("change", (event) => {
  const control = event.target.closest('[data-action="assign-project"]');
  if (!control) return;
  perform(() => {
    commit(
      assignTaskToProject(state, control.dataset.taskId, control.value || null),
      control.value ? "已归入项目。" : "已移出项目。",
    );
  });
});

root.addEventListener("change", async (event) => {
  if (event.target.id !== "restore-file") return;
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const serialized = await file.text();
    deserializeState(serialized);
    if (!window.confirm("恢复会替换当前浏览器里的全部任务数据。确定继续吗？")) return;
    state = storage.restore(serialized);
    editingTaskId = null;
    expandedTaskIds.clear();
    selectedProjectId = state.projects[0]?.id ?? null;
    view = activeFocus(state) || state.pendingCloseOut ? "focus" : "today";
    showMessage("备份已恢复。");
  } catch (error) {
    showMessage(`无法恢复：${error.message}`, "error");
  } finally {
    input.value = "";
  }
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) {
    view = button.dataset.view;
    render();
    return;
  }
  const action = button.dataset.action;
  if (!action) return;

  if (action === "focus-capture") {
    focusCaptureInput();
    return;
  }
  if (action === "edit-task") {
    editingTaskId = button.dataset.taskId;
    expandedTaskIds.delete(editingTaskId);
    render();
    const input = root.querySelector(`[data-form="edit-task"][data-task-id="${CSS.escape(editingTaskId)}"] [data-task-title-input]`);
    input?.focus();
    input?.select();
    return;
  }
  if (action === "cancel-edit") {
    const taskId = button.dataset.taskId;
    editingTaskId = null;
    render();
    root.querySelector(`[data-action="edit-task"][data-task-id="${CSS.escape(taskId)}"]`)?.focus();
    return;
  }
  if (action === "toggle-title") {
    const taskId = button.dataset.taskId;
    if (expandedTaskIds.has(taskId)) expandedTaskIds.delete(taskId);
    else expandedTaskIds.add(taskId);
    render();
    [...root.querySelectorAll(".task-title")]
      .find((title) => title.dataset.taskId === taskId)
      ?.focus();
    return;
  }
  if (action === "select-project") {
    selectedProjectId = button.dataset.projectId;
    render();
    return;
  }
  if (action === "toggle-today") {
    perform(() => {
      const task = taskById(button.dataset.taskId);
      commit(scheduleTaskForToday(state, task.id, !task.scheduledForToday));
    });
    return;
  }
  if (action === "quick-complete") {
    perform(() => {
      commit(quickCompleteTask(state, button.dataset.taskId, now()), "任务已完成。");
    });
    return;
  }
  if (action === "reopen-task") {
    perform(() => {
      commit(reopenTask(state, button.dataset.taskId), "任务已重新打开。");
    });
    return;
  }
  if (action === "delete-task") {
    const task = taskById(button.dataset.taskId);
    if (!task) return;
    const focusCount = state.focusRecords.filter((record) => record.taskId === task.id).length;
    const historyCopy = focusCount > 0 ? `，以及 ${focusCount} 条关联专注记录` : "";
    if (!window.confirm(`永久删除“${task.title}”${historyCopy}？此操作无法撤销。`)) return;
    perform(() => {
      editingTaskId = null;
      expandedTaskIds.delete(task.id);
      commit(deleteTask(state, task.id), "任务已删除。");
    });
    return;
  }
  if (action === "export-data") {
    perform(() => {
      const contents = serializeState(state);
      const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `个人任务备份-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showMessageWithoutRender("备份已导出。");
    });
    return;
  }
  if (action === "set-current") {
    perform(() => {
      const taskId = button.dataset.taskId;
      const active = activeFocus(state);
      if (active?.taskId === taskId) {
        view = "focus";
        render();
        return;
      }
      commit(setCurrentTask(state, taskId), "已设为当前一件。");
    });
    return;
  }
  if (action === "start-focus") {
    perform(() => {
      view = "focus";
      commit(startFocus(state, { id: id(), taskId: button.dataset.taskId, startedAt: now() }));
    });
    return;
  }
  if (action === "return-focus") {
    view = "focus";
    render();
    return;
  }
  if (action === "return-closeout") {
    view = "focus";
    render();
    queueMicrotask(() => root.querySelector("#closeout-note")?.focus());
    return;
  }
  if (action === "leave-focus") {
    view = "today";
    render();
    return;
  }
  if (action === "stop-focus") {
    perform(() => {
      const result = stopFocus(state, { endedAt: now() });
      view = "focus";
      commit(result.state);
      queueMicrotask(() => root.querySelector("#closeout-note")?.focus());
    });
    return;
  }
  if (action === "continue-task" || action === "complete-task") {
    perform(() => {
      const pending = state.pendingCloseOut;
      const record = pending
        ? state.focusRecords.find((candidate) => candidate.id === pending.focusRecordId)
        : null;
      if (!record) throw new Error("找不到这段专注记录。");
      const note = root.querySelector("#closeout-note")?.value ?? "";
      let nextState = savePendingCloseOutDraft(state, note);
      nextState = resolvePendingCloseOut(nextState);
      if (action === "complete-task") nextState = completeTask(nextState, record.taskId, now());
      view = action === "complete-task" ? "review" : "today";
      commit(nextState, action === "complete-task" ? "任务已完成。" : "收尾记录已保存。");
    });
  }
});

setInterval(tickTimer, 1000);
render();
