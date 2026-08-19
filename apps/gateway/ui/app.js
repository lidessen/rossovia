import {
  buildExecutionAuthorizationRequest,
  createExecutionAuthorizationDraft,
  executionAuthorizationEligibility,
  executionAuthorizationRefreshVerdict,
  executionProposalView,
} from "./execution-proposal.js";
import {
  anchorMigrationDecisionBriefPresentation,
  candidateEvidencePresentation,
  correctionPresentation,
  isIndependentWorkbenchTask,
  intentLineagePresentation,
  reconciliationActionDecisionBriefPresentation,
  runnerPresentation,
  verifiedCorrectionAwaitsSystemSettlement,
} from "./operational-semantics.js";

const principalLocusViews = new Set([
  "conversation",
  "overview",
  "tasks",
  "principal",
  "agent",
  "agent-pending",
  "projects",
  "project",
  "independent",
  "completed",
]);
const principalLocusFilters = new Set([
  "all",
  "principal",
  "agent",
  "agent-pending",
  "independent",
  "verification",
  "completed",
]);
function stableLocusIdentifier(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    normalized.length === 0
    || normalized.length > 512
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) return null;
  return normalized;
}

export function persistablePrincipalWorkItemIdentifier(value) {
  const normalized = stableLocusIdentifier(value);
  if (normalized === null) return false;
  if (
    /^principal-task:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      normalized,
    )
  ) return true;
  return /^attention:(?:runner-anchor-migration-decision|runner-reconciliation-decision|mission-execution-awaiting-authorization):registered:[a-z0-9._-]{1,128}:[a-z0-9._-]{1,128}$/iu.test(
    normalized,
  );
}

export function parsePrincipalLocus(href) {
  const url = new URL(href, "http://rossovia.local/");
  const raw = {
    view: url.searchParams.get("view"),
    filter: url.searchParams.get("filter"),
    project: url.searchParams.get("project"),
    item: url.searchParams.get("item"),
  };
  const present = {
    view: url.searchParams.has("view"),
    filter: url.searchParams.has("filter"),
    project: url.searchParams.has("project"),
    item: url.searchParams.has("item"),
  };
  const view = principalLocusViews.has(raw.view) ? raw.view : null;
  const filter = principalLocusFilters.has(raw.filter) ? raw.filter : null;
  const projectId = stableLocusIdentifier(raw.project);
  const workItemId = stableLocusIdentifier(raw.item);
  const invalidFields = [
    present.view && view === null ? "view" : null,
    present.filter && filter === null ? "filter" : null,
    present.project && projectId === null ? "project" : null,
    present.item && workItemId === null ? "item" : null,
  ].filter(Boolean);
  return {
    requested:
      Object.values(present).some(Boolean)
      || url.search.length > 0
      || url.hash.length > 0,
    invalidFields,
    view,
    filter,
    projectId,
    workItemId,
  };
}

export function hasPrincipalLocusRequest(request) {
  return request?.requested === true
    || [
      request?.view,
      request?.filter,
      request?.projectId,
      request?.workItemId,
    ].some((value) => value !== null && value !== undefined);
}

export function classifyWorkbenchAttention(items) {
  const workItems = Array.isArray(items) ? items : [];
  return {
    principal: workItems.filter((item) => item?.nextActor === "principal"),
    system: workItems.filter(
      (item) => item?.nextActor === "system" && item?.attention === "exception",
    ),
  };
}

export function isExactLiveAgentWork(item) {
  return item?.kind === "agent-work"
    && item?.lifecycle === "in-progress"
    && item?.evidence?.freshness?.kind === "live";
}

export function isPendingAgentWork(item) {
  return item?.nextActor === "agent" && !isExactLiveAgentWork(item);
}

export function classifyAgentResponsibility(items) {
  const workItems = Array.isArray(items) ? items : [];
  return {
    live: workItems.filter(isExactLiveAgentWork),
    pending: workItems.filter(isPendingAgentWork),
  };
}

export function principalLocusHref(currentHref, locus) {
  const url = new URL(currentHref, "http://rossovia.local/");
  const query = new URLSearchParams();
  const view =
    locus.view === "project"
    && locus.projectId
    && locus.projectPersistable !== true
      ? "projects"
      : locus.view;
  if (view && view !== "overview") {
    query.set("view", view);
  }
  if (locus.filter && locus.filter !== "all") {
    query.set("filter", locus.filter);
  }
  const projectId = stableLocusIdentifier(locus.projectId);
  const workItemId = stableLocusIdentifier(locus.workItemId);
  if (projectId && locus.projectPersistable === true) {
    query.set("project", projectId);
  }
  if (workItemId && locus.workItemPersistable === true) {
    query.set("item", workItemId);
  }
  const search = query.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}

export function resolvePrincipalLocus(request, projection) {
  const projects = Array.isArray(projection?.projects) ? projection.projects : [];
  const workItems = Array.isArray(projection?.workItems) ? projection.workItems : [];
  const project = request.projectId
    ? projects.find(
      (candidate) =>
        candidate.id === request.projectId
        && candidate.persistable === true,
    )
    : null;
  const workItem = request.workItemId
    ? workItems.find(
      (candidate) =>
        candidate.id === request.workItemId
        && candidate.persistable === true,
    )
    : null;
  const activeView = request.view
    ?? (
      request.workItemId || request.filter
        ? "tasks"
        : request.projectId
          ? "project"
          : "overview"
    );
  const taskFilter = request.filter ?? "all";

  if (Array.isArray(request.invalidFields) && request.invalidFields.length > 0) {
    return {
      standing: "unavailable",
      kind: "invalid",
      requestedId: request.invalidFields.join(", "),
      activeView,
      taskFilter,
      peekOpen: Boolean(request.workItemId),
      reason: "The requested location contains an invalid explicit identifier.",
    };
  }
  if (request.workItemId && workItem === undefined) {
    return {
      standing: "unavailable",
      kind: "work-item",
      requestedId: request.workItemId,
      activeView,
      taskFilter,
      peekOpen: true,
      reason: "The requested work item is not present in the current projection.",
    };
  }
  if (request.projectId && project === undefined) {
    return {
      standing: "unavailable",
      kind: "project",
      requestedId: request.projectId,
      activeView,
      taskFilter,
      peekOpen: Boolean(request.workItemId),
      reason: "The requested project is not present in the current projection.",
    };
  }
  if (
    request.projectId
    && workItem
    && workItem.projectId !== request.projectId
  ) {
    return {
      standing: "unavailable",
      kind: "relation",
      requestedId: request.workItemId,
      activeView,
      taskFilter,
      peekOpen: true,
      reason: "The requested work item no longer belongs to the requested project context.",
    };
  }
  if (activeView === "project" && !project && !workItem?.projectId) {
    return {
      standing: "unavailable",
      kind: "project",
      requestedId: request.projectId,
      activeView,
      taskFilter,
      peekOpen: Boolean(request.workItemId),
      reason: "A project detail view requires one current project identifier.",
    };
  }

  return {
    standing: "available",
    activeView,
    taskFilter,
    selectedProjectId: workItem?.projectId ?? project?.id ?? null,
    selectedWorkItemId: workItem?.id ?? null,
    selectedMissionId: workItem?.missionId ?? null,
    peekOpen: workItem !== null && workItem !== undefined,
  };
}

export function restoredPrincipalLocusState(resolved) {
  const available = resolved.standing === "available";
  return {
    activeView: resolved.activeView,
    taskFilter: resolved.taskFilter,
    selectedProjectId: available ? resolved.selectedProjectId : null,
    selectedMissionId: available ? resolved.selectedMissionId : null,
    selectedWorktreeId: null,
    selectedWorkItemId: available ? resolved.selectedWorkItemId : null,
    peekOpen: resolved.peekOpen === true,
    taskCreateOpen: false,
    detailRevalidationPending: false,
  };
}

/**
 * Conversation projection surface. The browser owns only the conversation
 * identity, the last applied durable cursor, the composer draft, and the
 * presentation focus. It never owns canonical Task/Mission/effect state:
 * every canonical fact is re-read from the server projection, every durable
 * event is applied from the server journal, and no client frame is ever
 * resent automatically. The frame vocabulary mirrors the frozen transport
 * contract in src/conversation/transport.ts.
 */

export const CONVERSATION_ID_STORAGE_KEY = "rosso.conversation.id";
export function conversationDraftStorageKey(conversationId) {
  return `rosso.conversation.draft.${conversationId}`;
}

export const CONVERSATION_TURN_TERMINAL_EVENTS = new Set([
  "coordinator.turn-settled",
  "coordinator.turn-failed",
  "coordinator.turn-interrupted",
]);

export const CONVERSATION_ACTION_TERMINAL_EVENTS = new Set([
  "action.settled",
  "action.failed",
  "action.uncertain",
]);

export function isConversationUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

/**
 * The reconnect route of the frozen runtime. `after` is the last durable
 * journal sequence the client has already applied; `-1` requests a full
 * replay. Only `journal.event` may advance that cursor.
 */
export function buildConversationSocketUrl(pageHref, conversationId, cursor) {
  const url = new URL(pageHref, "http://rossovia.local/");
  const scheme = url.protocol === "https:" ? "wss" : "ws";
  const after = Number.isSafeInteger(cursor) && cursor >= -1 ? cursor : -1;
  return `${scheme}://${url.host}/api/conversations/${encodeURIComponent(conversationId)}/socket?after=${after}`;
}

/**
 * Strictly ordered, deduplicated durable application. An event at or below
 * the applied cursor is a duplicate; an event above the next sequence is
 * buffered until its gap fills. Returns the newly applicable events in
 * journal order. Nothing here advances for a provisional frame.
 */
export function reduceDurableEvents(state, event) {
  let cursor = Number.isSafeInteger(state?.cursor) ? state.cursor : -1;
  const buffered = Array.isArray(state?.buffered) ? [...state.buffered] : [];
  const applied = [];
  let duplicates = 0;
  const sequence = event && typeof event === "object" ? event.sequence : undefined;
  if (!Number.isSafeInteger(sequence) || sequence <= cursor) {
    return { cursor, buffered, applied, duplicates: duplicates + 1 };
  }
  buffered.push(event);
  buffered.sort((left, right) => left.sequence - right.sequence);
  while (buffered.length > 0 && buffered[0].sequence <= cursor) {
    buffered.shift();
    duplicates += 1;
  }
  while (buffered.length > 0 && buffered[0].sequence === cursor + 1) {
    applied.push(buffered.shift());
    cursor += 1;
  }
  return { cursor, buffered, applied, duplicates };
}

/** One presentation classification per durable event family. */
export function classifyConversationEvent(event) {
  switch (event && typeof event === "object" ? event.type : undefined) {
    case "message.received": return "received";
    case "coordinator.turn-started": return "turn-started";
    case "action.requested": return "action-requested";
    case "action.settled": return "action-settled";
    case "action.failed": return "action-failed";
    case "action.uncertain": return "action-uncertain";
    case "coordinator.turn-settled": return "settled";
    case "coordinator.turn-failed": return "failed";
    case "coordinator.turn-interrupted": return "interrupted";
    default: return "unknown";
  }
}

/**
 * The exact client frames of the frozen vocabulary. Builders return `null`
 * for a frame that would be rejected by the transport schema instead of
 * sending something the runtime could not accept.
 */
export function conversationMessageSubmitFrame(clientMessageId, payload) {
  if (!isConversationUuid(clientMessageId)) return null;
  if (typeof payload !== "string" || payload.trim() === "") return null;
  return { type: "message.submit", clientMessageId, payload };
}

export function conversationResponseInterruptFrame(turnId) {
  if (!isConversationUuid(turnId)) return null;
  return { type: "response.interrupt", turnId };
}

export function conversationWorkControlFrame(target, control = "stop") {
  if (!target || typeof target !== "object") return null;
  const { turnId, actionId, carrierId } = target;
  if (!isConversationUuid(turnId) || !isConversationUuid(actionId)) return null;
  if (typeof carrierId !== "string" || carrierId.length === 0) return null;
  if (control !== "stop") return null;
  return { type: "work.control", turnId, actionId, carrierId, control };
}

/**
 * One pure composer standing projection. The factual gates stay separate
 * from the copy: only a live connection with a non-empty (trimmed) draft is
 * ever sendable. Connecting, disconnected, unavailable, or any unclassified
 * connection standing stays blocked with its own reason copy, and a blank
 * draft is blocked even while live. This only decides the affordance and its
 * visible reason; the transport/frame authority is untouched.
 */
export function conversationComposerStanding(connection, draft) {
  const live = connection === "live";
  const value = typeof draft === "string" ? draft : "";
  const empty = value.trim() === "";
  if (!live) {
    const standing = connection === "connecting"
      || connection === "disconnected"
      || connection === "unavailable"
      ? connection
      : "unknown";
    const status = {
      connecting: "对话连接中：暂时不能发送；草稿保留在本地，不会自动重发。",
      disconnected: "对话连接已断开：草稿保留，恢复连接前不能发送；不会自动重发。",
      unavailable: "对话连接不可用：草稿保留，不能发送；不会自动重发。",
    }[standing] || "对话连接状态未知：不发送；草稿保留，不会自动重发。";
    return { sendable: false, gate: "connection", standing, status };
  }
  if (empty) {
    return { sendable: false, gate: "empty", standing: "empty", status: "" };
  }
  return { sendable: true, gate: "ready", standing: "live", status: "" };
}

/** Server frames are validated enough to render without trusting the wire. */
export function parseConversationServerFrame(raw) {
  if (typeof raw !== "string") return null;
  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    return null;
  }
  if (frame === null || typeof frame !== "object" || typeof frame.type !== "string") return null;
  if (frame.type === "journal.event") {
    const event = frame.event;
    if (
      event === null
      || typeof event !== "object"
      || !Number.isSafeInteger(event.sequence)
      || typeof event.type !== "string"
    ) return null;
    return frame;
  }
  if (frame.type === "response.delta") {
    if (typeof frame.turnId !== "string" || typeof frame.text !== "string") return null;
    return frame;
  }
  if (frame.type === "activity.delta") {
    if (
      typeof frame.turnId !== "string"
      || typeof frame.actionId !== "string"
      || typeof frame.carrierId !== "string"
      || typeof frame.taskId !== "string"
      || typeof frame.attemptId !== "string"
      || typeof frame.text !== "string"
    ) return null;
    return frame;
  }
  if (frame.type === "carrier.terminal") {
    if (
      typeof frame.turnId !== "string"
      || typeof frame.messageId !== "string"
      || typeof frame.actionId !== "string"
      || typeof frame.carrierId !== "string"
      || typeof frame.status !== "string"
      || !Array.isArray(frame.evidenceRefs)
      || !frame.evidenceRefs.every((ref) => typeof ref === "string")
      || (frame.cellStatus !== undefined && typeof frame.cellStatus !== "string")
    ) return null;
    return frame;
  }
  if (frame.type === "carrier.standing") {
    if (
      typeof frame.turnId !== "string"
      || typeof frame.messageId !== "string"
      || typeof frame.actionId !== "string"
      || typeof frame.carrierId !== "string"
      || typeof frame.taskId !== "string"
      || typeof frame.attemptId !== "string"
    ) return null;
    if (frame.standing === "live") return frame;
    if (frame.standing === "terminal") {
      if (
        typeof frame.status !== "string"
        || !Array.isArray(frame.evidenceRefs)
        || !frame.evidenceRefs.every((ref) => typeof ref === "string")
        || (frame.cellStatus !== undefined && typeof frame.cellStatus !== "string")
      ) return null;
      return frame;
    }
    if (frame.standing === "unknown") {
      if (typeof frame.reason !== "string") return null;
      return frame;
    }
    return null;
  }
  if (frame.type === "projection.changed") return frame;
  if (frame.type === "protocol.error") {
    if (typeof frame.code !== "string" || typeof frame.message !== "string") return null;
    return frame;
  }
  return null;
}

const TASK_RECEIPT_EVIDENCE_PATTERN =
  /^workbench:state\/tasks\.json:task\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@\d+$/iu;

/**
 * Map one canonical task receipt evidence reference to a work item id only
 * when the exact id is present in the current server projection. The browser
 * never links to canonical evidence it cannot re-read from the snapshot.
 */
export function taskEvidenceLinkTarget(ref, workItems) {
  if (typeof ref !== "string") return null;
  const match = TASK_RECEIPT_EVIDENCE_PATTERN.exec(ref);
  if (match === null) return null;
  const candidate = `principal-task:${match[1]}`;
  if (!Array.isArray(workItems)) return null;
  return workItems.some((item) => item && typeof item === "object" && item.id === candidate)
    ? candidate
    : null;
}

/**
 * Task-page locator: keyword, project, and status narrowing over the existing
 * read-only work-item projection. Every value comes from fields already
 * present on projected items (title/summary/context and, for Workbench-owned
 * tasks, the retained task objective, acceptance, todos, correction
 * statements, and result summaries). No Task schema, lifecycle, project, or
 * authority change is introduced; the locator is pure presentation.
 */
const TASK_LOCATOR_LIFECYCLE_ORDER = [
  "open",
  "in-progress",
  "waiting",
  "paused",
  "blocked",
  "verifying",
  "settled",
  "invalidated",
];

function taskLocatorListText(task, key) {
  const entries = task[key];
  if (!Array.isArray(entries)) return "";
  return entries
    .filter((entry) => typeof entry === "string")
    .join(" ");
}

function taskLocatorObjectTexts(value) {
  const texts = [];
  if (!value || typeof value !== "object") return texts;
  for (const key of ["title", "objective", "statement", "summary"]) {
    const entry = value[key];
    if (typeof entry === "string" && entry !== "") texts.push(entry);
  }
  return texts;
}

/**
 * The normalized searchable text of one projected item, lowercased. It only
 * mirrors existing projection fields; an unavailable task source simply
 * yields the fields that were still projected.
 */
export function taskLocatorSearchText(item) {
  const texts = [];
  if (item && typeof item === "object") {
    for (const key of ["title", "summary", "context"]) {
      const value = item[key];
      if (typeof value === "string" && value !== "") texts.push(value);
    }
    const taskDetail = item.taskDetail;
    const task = taskDetail && typeof taskDetail === "object"
      ? taskDetail.task
      : undefined;
    if (task && typeof task === "object") {
      for (const key of ["title", "objective"]) {
        const value = task[key];
        if (typeof value === "string" && value !== "") texts.push(value);
      }
      for (const key of ["acceptance", "todos"]) {
        const value = taskLocatorListText(task, key);
        if (value !== "") texts.push(value);
      }
      for (const key of ["corrections", "resultClaims"]) {
        const entries = task[key];
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            texts.push(...taskLocatorObjectTexts(entry));
          }
        }
      }
    }
  }
  return texts.join(" ").toLowerCase();
}

/**
 * One locator predicate over existing fields only: trimmed case-insensitive
 * keyword substring on the projected searchable text, exact projectKey, and
 * exact lifecycle. An empty locator matches everything.
 */
export function workItemMatchesTaskLocator(item, locator) {
  const keyword = typeof locator?.keyword === "string"
    ? locator.keyword.trim().toLowerCase()
    : "";
  if (keyword !== "" && !taskLocatorSearchText(item).includes(keyword)) {
    return false;
  }
  const project = typeof locator?.project === "string" && locator.project !== ""
    ? locator.project
    : null;
  if (project !== null && item?.projectKey !== project) return false;
  const status = typeof locator?.status === "string" && locator.status !== ""
    ? locator.status
    : null;
  if (status !== null && item?.lifecycle !== status) return false;
  return true;
}

/**
 * Select options derived from the current item list: only project keys and
 * lifecycle values that actually appear, each with the number of items. The
 * project label comes from the caller (the snapshot project name); statuses
 * are ordered by the existing lifecycle vocabulary.
 */
export function taskLocatorOptions(items, projectLabel) {
  const projectCounts = new Map();
  const statusCounts = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") continue;
    const projectKey = typeof item.projectKey === "string" && item.projectKey !== ""
      ? item.projectKey
      : null;
    if (projectKey !== null) {
      projectCounts.set(projectKey, (projectCounts.get(projectKey) ?? 0) + 1);
    }
    const lifecycle = typeof item.lifecycle === "string" && item.lifecycle !== ""
      ? item.lifecycle
      : null;
    if (lifecycle !== null) {
      statusCounts.set(lifecycle, (statusCounts.get(lifecycle) ?? 0) + 1);
    }
  }
  const orderOf = (key) => {
    const index = TASK_LOCATOR_LIFECYCLE_ORDER.indexOf(key);
    return index === -1 ? TASK_LOCATOR_LIFECYCLE_ORDER.length : index;
  };
  return {
    projects: [...projectCounts.entries()]
      .map(([key, count]) => ({
        key,
        label: typeof projectLabel === "function" ? projectLabel(key) : key,
        count,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    statuses: [...statusCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((left, right) =>
        orderOf(left.key) - orderOf(right.key)
        || left.key.localeCompare(right.key)),
  };
}

/**
 * Whether the current list can be trusted as the complete task set. Only a
 * live snapshot that is complete and whose task source is available supports
 * a factual zero; anything else keeps the partial/unknown semantics.
 */
export function taskLocatorSourceStanding(input) {
  if (
    input?.source === "live"
    && input?.complete === true
    && input?.taskSourceStanding === "available"
  ) {
    return "complete";
  }
  return "partial";
}

/**
 * The empty-state summary for the current locator. It separates three cases:
 * an unavailable/incomplete source (must not read as zero), a genuine
 * no-match under explicit conditions, and a factual empty complete source.
 */
export function taskLocatorEmptySummary(locator, context) {
  const conditions = [];
  const keyword = typeof locator?.keyword === "string"
    ? locator.keyword.trim()
    : "";
  if (keyword !== "") conditions.push("关键词 “" + keyword + "”");
  const project = typeof locator?.project === "string" && locator.project !== ""
    ? locator.project
    : null;
  if (project !== null) {
    const label = typeof context?.projectLabel === "function"
      ? context.projectLabel(project)
      : project;
    conditions.push("项目 “" + label + "”");
  }
  const status = typeof locator?.status === "string" && locator.status !== ""
    ? locator.status
    : null;
  if (status !== null) {
    const label = typeof context?.statusLabel === "function"
      ? context.statusLabel(status)
      : status;
    conditions.push("状态 “" + label + "”");
  }
  if (context?.sourceStanding !== "complete") {
    return {
      standing: "source-unavailable",
      summary: "任务来源不可用或投影不完整：无法确认是否真的没有匹配项。",
      detail: "当前计数只覆盖可读来源；请刷新投影后重试，不要把它当作“零条”结论。",
      conditions,
    };
  }
  if (conditions.length === 0) {
    return {
      standing: "no-items",
      summary: "当前实时投影完整：没有可显示的任务（事实结果，非来源错误）。",
      detail: "这是完整来源下的事实结果；列表为空不代表来源不可用。",
      conditions,
    };
  }
  return {
    standing: "no-match",
    summary: "没有匹配" + conditions.join(" · ") + "的任务。",
    detail: "请调整或清除过滤条件后重试。",
    conditions,
  };
}

(() => {
  "use strict";

  if (typeof document === "undefined" || typeof window === "undefined") return;

  const POLL_INTERVAL_MS = 5000;
  const initialLocusRequest = parsePrincipalLocus(window.location.href);
  const initialLocusRequested = hasPrincipalLocusRequest(initialLocusRequest);
  const state = {
    snapshot: null,
    source: "loading",
    selectedProjectId: null,
    selectedMissionId: null,
    selectedWorktreeId: null,
    selectedWorkItemId: null,
    activeView: "conversation",
    taskFilter: "all",
    taskLocator: { keyword: "", project: null, status: null },
    peekOpen: false,
    taskCreateOpen: false,
    detailRevalidationPending: false,
    actionKind: "contribution",
    pollTimer: null,
    requestInFlight: false,
    activeRefreshPromise: null,
    refreshQueued: false,
    lastLiveSnapshot: null,
    snapshotError: null,
    actionPending: false,
    actionReceipt: null,
    taskActionPending: false,
    taskActionReceipt: null,
    authorizationPending: false,
    authorizationDraft: null,
    authorizationSubmission: null,
    locusRequest: initialLocusRequest,
    locusRestorePending: initialLocusRequested,
    unavailableLocus: null,
  };

  /**
   * Browser-local conversation state. Exactly the retained surface named by
   * the plan: conversation identity, the last applied durable cursor, the
   * composer draft, and presentation focus (scroll stickiness and which
   * cards are open). The feed is rebuilt from the durable journal; canonical
   * facts are re-read from the snapshot. Nothing here is a canonical source,
   * and no frame is ever resent automatically.
   */
  const conversationState = {
    conversationId: null,
    cursor: -1,
    buffered: [],
    socket: null,
    socketFaulted: false,
    connection: "unavailable",
    reconnectAttempt: 0,
    reconnectTimer: null,
    closedDeliberately: false,
    feed: [],
    protocolNotices: [],
    draft: "",
    carriers: new Map(),
    stickToBottom: true,
    lastSubmittedClientMessageId: null,
  };

  const demoSnapshot = {
    version: "demo-1",
    generatedAt: new Date().toISOString(),
    complete: false,
    supervision: {
      mode: "supervised",
      supervisor: "Codex",
      subject: "Rossovia Agent system",
    },
    attention: [
      {
        id: "demo-attention-1",
        severity: "warning",
        title: "新的 Principal 输入尚未协调",
        detail: "Mission 的输入水位领先于当前 turn；继续生产前需要完成协调。",
        projectId: "demo-skills",
        missionId: "mission-ui",
      },
      {
        id: "demo-attention-2",
        severity: "critical",
        title: "一个工作现场失去运行载体",
        detail: "Worktree 保留，但 runner 已中断；恢复、替换或放弃尚未决定。",
        projectId: "demo-agent-worker",
        missionId: "mission-runtime",
      },
    ],
    projects: [
      {
        id: "demo-skills",
        name: "skills",
        path: "/workspace/skills",
        status: "needs-attention",
        mainline: {
          branch: "main",
          head: "8bd2c7a",
          status: "observed",
          description: "理论、Skill 与 Workbench 的共同返回边界",
        },
        missions: [
          {
            id: "mission-ui",
            title: "Principal Workbench MVP",
            objective: "让 Principal 强感知多项目、多 worktree 的半自主运行与人类介入。",
            status: "input-pending",
            decisionOwner: "Principal",
            lastChange: "新的纠偏输入已进入队列",
            evidenceState: "正在等待输入协调",
            worktrees: [
              {
                id: "wt-ui",
                name: "principal-workbench",
                path: "/workspace/skills-wt/principal-workbench",
                branch: "workbench/principal-ui",
                head: "1f942bc",
                dirty: true,
                binding: "observed",
                runnerId: "runner-91",
              },
              {
                id: "wt-main",
                name: "main",
                path: "/workspace/skills",
                branch: "main",
                head: "8bd2c7a",
                dirty: true,
                binding: "unverified",
              },
            ],
            evidence: [
              {
                label: "Mission source",
                value: "design/organization/sessions/…principal-workbench.md",
              },
              {
                label: "Input watermark",
                value: "received 12 · reconciled 11",
              },
            ],
          },
          {
            id: "mission-principles",
            title: "Principle expression 整治",
            objective: "恢复 principles 对具体实践的生成与纠偏能力。",
            status: "running",
            decisionOwner: "Agent system",
            lastChange: "Work Cell 正在比较 skill expression",
            evidenceState: "2 个 Cell 已返回，1 个运行中",
            worktrees: [],
          },
        ],
      },
      {
        id: "demo-agent-worker",
        name: "agent-worker",
        path: "/workspace/agent-worker",
        status: "interrupted",
        mainline: {
          branch: "main",
          head: "d91f503",
          status: "observed",
        },
        missions: [
          {
            id: "mission-runtime",
            title: "Work Cell runtime verification",
            objective: "证明受监督的 Cell 执行能够返回可追溯的验证证据。",
            status: "interrupted",
            decisionOwner: "Principal",
            lastChange: "runner-24 在 settlement 前退出",
            evidenceState: "结果存在，settlement 缺失",
            worktrees: [
              {
                id: "wt-runtime",
                name: "cell-runtime",
                path: "/workspace/agent-worker-wt/cell-runtime",
                branch: "runtime/work-cell",
                head: "e42a611",
                dirty: false,
                binding: "observed",
                runnerId: "runner-24",
              },
            ],
          },
        ],
      },
    ],
    runners: [
      {
        id: "runner-91",
        projectId: "demo-skills",
        missionId: "mission-ui",
        worktreeId: "wt-ui",
        status: "input-pending",
        reason: "新的 Principal 输入尚未被当前 turn 协调，系统不能假装继续。",
        decisionOwner: "Principal",
        lastChangeAt: new Date(Date.now() - 240000).toISOString(),
        inputWatermark: 12,
        reconciledWatermark: 11,
      },
      {
        id: "runner-24",
        projectId: "demo-agent-worker",
        missionId: "mission-runtime",
        worktreeId: "wt-runtime",
        status: "interrupted",
        reason: "运行载体已退出，但 Mission 义务仍然存在。",
        decisionOwner: "Principal",
        stopReason: "process-exit",
      },
    ],
  };
  demoSnapshot.workItems = {
    capabilities: {
      independentTasks: {
        standing: "unsupported",
        count: null,
        reason: "演示数据没有声明独立任务来源。",
      },
    },
    items: [
      {
        id: "demo:decision:mission-ui",
        kind: "decision",
        lifecycle: "waiting",
        nextActor: "principal",
        attention: "decision-required",
        title: "Principal Workbench MVP",
        summary: "新的 Principal 输入需要先被系统协调",
        context: "skills · mission-ui",
        projectKey: "demo-skills",
        missionId: "mission-ui",
        runnerId: "runner-91",
        binding: {
          kind: "project-mission",
          projectKey: "demo-skills",
          missionId: "mission-ui",
        },
        evidence: {
          freshness: {
            kind: "unverified",
            observedAt: new Date().toISOString(),
            reason: "local demo",
          },
          sourceRefs: ["demo"],
        },
        updatedAt: new Date().toISOString(),
        actionLabel: "查看并决策",
        consequence: "high",
        attentionCode: "runner-input-pending",
      },
      {
        id: "demo:observation:runner-24",
        kind: "observation",
        lifecycle: "blocked",
        nextActor: "system",
        attention: "exception",
        title: "Work Cell runtime verification",
        summary: "工作现场保留，但运行载体已中断",
        context: "agent-worker · mission-runtime",
        projectKey: "demo-agent-worker",
        missionId: "mission-runtime",
        runnerId: "runner-24",
        binding: {
          kind: "project-mission",
          projectKey: "demo-agent-worker",
          missionId: "mission-runtime",
        },
        evidence: {
          freshness: {
            kind: "unverified",
            observedAt: new Date().toISOString(),
            reason: "local demo",
          },
          sourceRefs: ["demo"],
        },
        updatedAt: new Date().toISOString(),
        actionLabel: "查看现场",
        consequence: "normal",
        attentionCode: "runner-interrupted",
      },
    ],
  };

  const actionCopy = {
    contribution: {
      label: "补充事实、约束或建议",
      placeholder: "这段内容会进入当前 Mission 的有序输入，不会自动扩大授权。",
      help: "发送后，系统应先协调这项输入，再继续产生新工作。",
      submit: "发送补充",
    },
    correction: {
      label: "指出被拒绝的假设与新的不变量",
      placeholder: "说明哪里偏离、什么判断不再成立，以及此后必须保持什么。",
      help: "纠偏改变仍在进行的工作的约束；它不是新任务，也不会默认撤销既有证据。",
      submit: "提交纠偏",
    },
    decision: {
      label: "回应当前待决事项",
      placeholder: "写明你的选择，以及这项选择立即授权的结果。",
      help: "决策只回应当前版本的待决事项；现场变化后，系统应要求重新确认。",
      submit: "提交决策",
    },
  };

  const modeCopy = {
    running: {
      label: "执行中",
      heading: "在授权边界内生产",
      reason: "当前没有已知的 Principal 阻断；Agent system 拥有下一执行动作。",
      owner: "Agent system",
    },
    idle: {
      label: "空闲载体",
      heading: "无当前执行者；载体未在生产",
      reason:
        "Mission 已有授权 intent anchor，但这个 live carrier 没有 runtime 或活动 turn；它不证明任何 Agent 正在生产。",
      owner: "无当前执行者",
    },
    "anchor-pending": {
      label: "锚点待授权",
      heading: "等待 Principal 完成 Intent Anchor 迁移门",
      reason:
        "当前没有授权 intent anchor；普通输入与控制保持禁用。只有精确绑定当前 carrier、history 与 proposal digest 的迁移行动授权可以越过此门。",
      owner: "Principal",
    },
    paused: {
      label: "已暂停",
      heading: "等待 Principal 恢复",
      reason: "生产动作已停止，现有证据和 Mission 义务仍然保留。",
      owner: "Principal",
    },
    "input-pending": {
      label: "待协调",
      heading: "正在吸收新的 Principal 输入",
      reason: "输入水位领先于已协调水位；旧 turn 不能直接代表当前意图继续。",
      owner: "Agent system",
    },
    "carrier-unreachable": {
      label: "载体不可达",
      heading: "Runner 不在线；仅保留缓存状态",
      reason: "缓存记录和持久化证据仍可检查，但没有 live runner 正在吸收输入或产生工作。",
      owner: "无当前执行者",
    },
    interrupted: {
      label: "已中断",
      heading: "运行链断裂，等待恢复决定",
      reason: "Mission 仍有义务，但原运行载体不能继续证明自己的行动连续性。",
      owner: "Principal",
    },
    "needs-attention": {
      label: "需关注",
      heading: "等待 Principal 判断",
      reason: "系统已抵达自己的授权或判断边界。",
      owner: "Principal",
    },
    "mission-stopped": {
      label: "Mission 已停止",
      heading: "保留为只读行动记录",
      reason: "Principal 已停止这条 Mission；它不再产生新的工作。",
      owner: "Principal",
    },
    stopped: {
      label: "载体已停止",
      heading: "运行载体未工作",
      reason: "这只说明 runner 已停止，不等同于 Mission 义务已经关闭。",
      owner: "Principal",
    },
    returned: {
      label: "已返回",
      heading: "等待结果接受或集成",
      reason: "执行已返回，但接受、共享事实与 mainline 集成仍需各自证据。",
      owner: "Principal",
    },
    "mission-active": {
      label: "义务进行中",
      heading: "Mission 仍有未结义务",
      reason: "Mission 记录仍然 active；这不证明当前有 Agent 或 runner 正在执行。",
      owner: "未观察",
    },
    observed: {
      label: "已观察",
      heading: "本地现场可观察",
      reason: "Workbench 已读取本地来源，但没有据此推断更高层的语义状态。",
      owner: "未观察",
    },
    unregistered: {
      label: "未注册",
      heading: "本地现场已观察但身份未注册",
      reason: "路径和 Git 状态可观察，但它还没有获得稳定的 Workbench 项目身份。",
      owner: "Principal",
    },
    failed: {
      label: "失败",
      heading: "执行失败，等待处置",
      reason: "系统无法完成当前动作；失败不自动关闭 Mission。",
      owner: "Principal",
    },
    unknown: {
      label: "未观察",
      heading: "尚无可证明的运行模式",
      reason: "当前投影没有足够信息说明系统正在做什么。",
      owner: "未知",
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function text(value, fallback = "—") {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "boolean") return value ? "是" : "否";
    return String(value);
  }

  function escapeHtml(value) {
    return text(value, "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function first(object, keys, fallback = undefined) {
    if (!object || typeof object !== "object") return fallback;
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null) return object[key];
    }
    return fallback;
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function identifier(item, fallback) {
    return text(first(item, ["projectKey", "id", "projectId", "missionId", "worktreeId", "runnerId", "name"]), fallback);
  }

  function projectName(project) {
    const identity = first(project, ["identity"], {});
    const aliases = list(first(identity, ["aliases"], []));
    return text(
      first(project, ["name", "alias", "title"]) ||
        aliases[0] ||
        first(identity, ["id", "repository"]),
      identifier(project, "Project"),
    );
  }

  function runnerStatus(runner) {
    const status = first(runner, ["status"], {});
    return status && typeof status === "object" ? status : runner || {};
  }

  function runnerActivity(runner) {
    const activity = first(runner, ["activity"], {});
    return activity && typeof activity === "object" ? activity : {};
  }

  function eventLabel(event) {
    if (!event || typeof event !== "object") return text(event, "未观察");
    const sequence = first(event, ["sequence"]);
    const label = text(first(event, ["label", "type"]), "运行事件");
    return `${sequence === undefined ? "" : `#${sequence} · `}${label}`;
  }

  function clearActionReceipt() {
    if (state.actionPending) return;
    state.actionReceipt = null;
    const result = $("#action-result");
    result.className = "action-result";
    result.textContent = "";
  }

  function formatTime(value, fallback = "时间未知") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value, fallback);
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  function normalizeMode(value) {
    const raw = text(value, "unknown").toLowerCase().replaceAll("_", "-");
    const aliases = {
      active: "running",
      pending: "input-pending",
      "input-pending": "input-pending",
      attention: "needs-attention",
      blocked: "needs-attention",
      complete: "returned",
      completed: "returned",
      settled: "returned",
      error: "failed",
    };
    return aliases[raw] || raw;
  }

  function projects() {
    return list(first(state.snapshot, ["projects"], []));
  }

  function attentionItems() {
    return list(first(state.snapshot, ["attention", "attentionItems", "needsAttention"], []));
  }

  function workItems() {
    return list(first(first(state.snapshot, ["workItems"], {}), ["items"], []));
  }

  function taskSourceCapability() {
    return first(
      first(first(state.snapshot, ["workItems"], {}), ["capabilities"], {}),
      ["independentTasks"],
      {},
    );
  }

  function selectedWorkItem() {
    return workItems().find((item) => item.id === state.selectedWorkItemId) || null;
  }

  function isWorkbenchTask(item) {
    return first(first(item, ["binding"], {}), ["kind"]) === "workbench-task"
      && first(first(item, ["taskDetail"], {}), ["ownership"]) === "workbench-local";
  }

  function taskDetail(item = selectedWorkItem()) {
    return isWorkbenchTask(item) ? first(item, ["taskDetail"]) : null;
  }

  function lines(value) {
    return String(value ?? "")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function workItemFreshnessLabel(item) {
    const freshness = first(first(item, ["evidence"], {}), ["freshness"], {});
    const kind = text(first(freshness, ["kind"]), "unverified");
    if (kind === "live") return "实时";
    if (kind === "observed-at-build") return "本次投影";
    if (kind === "cached") return "缓存";
    return "未验证";
  }

  function workItemAnomalyContext(item) {
    const detail = first(item, ["anomalyDetail"], {});
    const binding = first(detail, ["binding"], {});
    const runnerId = text(
      first(item, ["runnerId"]) || first(binding, ["runnerId"]),
      "",
    );
    const bindingStanding = text(first(binding, ["standing"]), "");
    const standing = text(
      first(detail, ["standing", "runnerStanding"]) || first(item, ["runnerState"]),
      "",
    );
    const reason = text(
      first(binding, ["reason"]) || first(detail, ["reason"]) || first(item, ["reason"]),
      "",
    );
    if (item?.kind !== "observation" && item?.anomalyDetail === undefined) return "";
    return [
      runnerId ? `Runner ${runnerId}` : "Runner 身份未投影",
      bindingStanding ? `绑定 ${bindingStanding}` : "绑定状态未知",
      standing ? `状态 ${standing}` : "状态未知",
      reason,
    ].filter(Boolean).join(" · ");
  }

  function projectWorkSummary(project, index) {
    const id = identifier(project, `project-${index}`);
    const items = workItems().filter(
      (item) => item.projectKey === id
        && item.kind !== "observation"
        && !["settled", "invalidated"].includes(item.lifecycle),
    );
    return {
      projectKey: id,
      name: projectName(project),
      worktreeCount: projectWorktrees(project).length,
      taskCount: items.length,
      observationCount: workItems().filter(
        (item) => item.projectKey === id
          && item.kind === "observation"
          && item.lifecycle !== "settled",
      ).length,
      primary: items[0] || null,
      observationStanding: "not-projected",
    };
  }

  function projectMissions(project) {
    return list(first(project, ["missions", "missionRecords", "branches"], []));
  }

  function projectWorktrees(project) {
    return list(first(project, ["worktrees", "workingTrees"], []));
  }

  function missionWorktrees(project, mission) {
    const nested = list(first(mission, ["worktrees", "workingTrees"], []));
    if (nested.length) return nested;
    const missionId = identifier(mission, "");
    const explicit = projectWorktrees(project).filter((worktree) => {
      const linked = text(first(worktree, ["missionId", "mission", "missionRef"]), "");
      return linked && linked === missionId;
    });
    if (explicit.length) return explicit;
    const observation = first(mission, ["observedGitContext"], {});
    const observedPath = text(first(observation, ["worktreePath", "path"]), "");
    if (!observedPath) return [];
    return projectWorktrees(project)
      .filter((worktree) => text(first(worktree, ["path", "worktreePath"]), "") === observedPath)
      .map((worktree) => ({ ...worktree, binding: "observation-only" }));
  }

  function runners() {
    return list(first(state.snapshot, ["runners", "runnerStatuses", "runtime"], []));
  }

  function selectedProject() {
    return projects().find((project, index) => identifier(project, `project-${index}`) === state.selectedProjectId) || null;
  }

  function selectedMission() {
    const project = selectedProject();
    if (!project) return null;
    return (
      projectMissions(project).find(
        (mission, index) => identifier(mission, `mission-${index}`) === state.selectedMissionId,
      ) || null
    );
  }

  function selectedWorktree() {
    const project = selectedProject();
    const mission = selectedMission();
    if (!project) return null;
    const allWorktrees = projectWorktrees(project);
    const direct = allWorktrees.find(
      (worktree, index) => identifier(worktree, `worktree-${index}`) === state.selectedWorktreeId,
    );
    if (direct) return direct;
    if (!mission) return null;
    return (
      missionWorktrees(project, mission).find(
        (worktree, index) => identifier(worktree, `worktree-${index}`) === state.selectedWorktreeId,
      ) || null
    );
  }

  function selectedRunner() {
    const project = selectedProject();
    const mission = selectedMission();
    const worktree = selectedWorktree();
    if (!mission) return null;
    const explicitRunner =
      first(worktree, ["runner", "runnerStatus"]) || first(mission, ["runner", "runnerStatus"]);
    if (explicitRunner && typeof explicitRunner === "object") return explicitRunner;
    const runnerId = text(
      first(worktree, ["runnerId"]) || first(mission, ["runnerId"]),
      "",
    );
    const missionId = identifier(mission, "");
    const projectId = project ? identifier(project, "") : "";
    return (
      runners().find((runner) => {
        const status = runnerStatus(runner);
        const idMatches = runnerId && identifier(status, "") === runnerId;
        const missionMatches =
          text(first(status, ["missionId", "mission"]), "") === missionId;
        const binding = first(runner, ["binding"], {});
        const boundProject = first(binding, ["projectKey"]);
        const projectMatches = !boundProject || text(boundProject, "") === projectId;
        return idMatches || (missionMatches && projectMatches);
      }) || null
    );
  }

  function projectedPrincipalLocusProject(project, index) {
    const id = identifier(project, `project-${index}`);
    const identityId = stableLocusIdentifier(
      text(first(first(project, ["identity"], {}), ["id"]), ""),
    );
    return {
      id,
      persistable:
        first(project, ["registration"]) === "registered"
        && identityId !== null
        && id === `registered:${identityId}`,
    };
  }

  function principalLocusProjection() {
    return {
      projects: projects().map(projectedPrincipalLocusProject),
      workItems: workItems().map((item) => ({
        id: item.id,
        persistable: persistablePrincipalWorkItemIdentifier(item.id),
        projectId: item.projectKey || null,
        missionId: item.missionId || null,
      })),
    };
  }

  function currentPrincipalLocus() {
    const item = state.peekOpen ? selectedWorkItem() : null;
    const projectRelevant =
      state.activeView === "project"
      || item !== null;
    const selectedProjectIndex = projects().findIndex(
      (project, index) =>
        identifier(project, `project-${index}`) === state.selectedProjectId,
    );
    const selectedProject = selectedProjectIndex < 0
      ? null
      : projectedPrincipalLocusProject(
        projects()[selectedProjectIndex],
        selectedProjectIndex,
      );
    return {
      view: state.activeView,
      filter: state.taskFilter,
      projectId: projectRelevant ? state.selectedProjectId : null,
      projectPersistable:
        projectRelevant
        && selectedProject?.persistable === true,
      workItemId:
        state.peekOpen && !state.taskCreateOpen
          ? state.selectedWorkItemId
          : null,
      workItemPersistable:
        state.peekOpen
        && !state.taskCreateOpen
        && persistablePrincipalWorkItemIdentifier(state.selectedWorkItemId),
    };
  }

  function writePrincipalLocus({ replace = false } = {}) {
    if (state.locusRestorePending) return;
    const href = principalLocusHref(
      window.location.href,
      currentPrincipalLocus(),
    );
    state.locusRequest = parsePrincipalLocus(
      new URL(href, window.location.href).href,
    );
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (href === current) return;
    const method = replace ? "replaceState" : "pushState";
    window.history[method](
      { kind: "rosso.principal-locus.v1" },
      "",
      href,
    );
  }

  function selectWorkItemContext(item) {
    state.selectedWorkItemId = item.id;
    state.peekOpen = true;
    state.selectedProjectId = item.projectKey || null;
    state.selectedMissionId = item.missionId || null;
    const worktreePath = text(
      first(first(item, ["worktreeContext"], {}), ["path"]),
      "",
    );
    if (worktreePath && item.projectKey) {
      const project = projects().find(
        (candidate, index) =>
          identifier(candidate, `project-${index}`) === item.projectKey,
      );
      const worktree = projectWorktrees(project).find(
        (candidate) =>
          text(first(candidate, ["path", "worktreePath"]), "") === worktreePath,
      );
      state.selectedWorktreeId = worktree ? identifier(worktree, "") : null;
    } else {
      state.selectedWorktreeId = null;
    }
  }

  function applyPrincipalLocusRequest() {
    const request = state.locusRequest;
    state.locusRestorePending = false;
    state.unavailableLocus = null;
    const canonicalHref = principalLocusHref(
      window.location.href,
      {
        view: request.view,
        filter: request.filter,
        projectId: request.projectId,
        projectPersistable:
          request.projectId?.startsWith("registered:") === true,
        workItemId: request.workItemId,
        workItemPersistable:
          persistablePrincipalWorkItemIdentifier(request.workItemId),
      },
    );
    const currentHref =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (canonicalHref !== currentHref) {
      window.history.replaceState(
        { kind: "rosso.principal-locus.v1" },
        "",
        canonicalHref,
      );
    }

    if (state.source !== "live") {
      Object.assign(state, restoredPrincipalLocusState({
        standing: "unavailable",
        activeView: request.view ?? "overview",
        taskFilter: request.filter ?? "all",
      }));
      state.unavailableLocus = {
        kind: "projection",
        requestedId: request.workItemId ?? request.projectId,
        reason:
          "无法从当前非实时投影恢复此位置。请恢复实时连接后重试；当前位置没有启用任何任务动作。",
      };
      return;
    }

    const resolved = resolvePrincipalLocus(
      request,
      principalLocusProjection(),
    );
    Object.assign(state, restoredPrincipalLocusState(resolved));
    if (resolved.standing === "unavailable") {
      state.unavailableLocus = {
        kind: resolved.kind,
        requestedId: resolved.requestedId,
        reason:
          resolved.kind === "work-item"
            ? "请求的任务不在当前实时投影中。它可能已结束、被移除，或其来源当前不可用。"
            : resolved.kind === "project"
              ? "请求的项目不在当前实时投影中。它可能未注册，或其来源当前不可用。"
              : resolved.kind === "relation"
                ? "请求的任务与项目关系已变化，Workbench 不会把它静默绑定到另一个现场。"
                : "请求的位置包含无效的显式标识。Workbench 不会把它解释成“未请求位置”。",
      };
      return;
    }

    const item = selectedWorkItem();
    if (item) selectWorkItemContext(item);
    writePrincipalLocus({ replace: true });
  }

  function runnerForMission(project, mission) {
    if (!project || !mission) return null;
    const projectId = identifier(project, "");
    const missionId = identifier(mission, "");
    return (
      runners().find((runner) => {
        const status = runnerStatus(runner);
        const binding = first(runner, ["binding"], {});
        return (
          text(first(status, ["missionId"]), "") === missionId &&
          (first(binding, ["kind"]) !== "project-mission" ||
            text(first(binding, ["projectKey"]), "") === projectId)
        );
      }) || null
    );
  }

  function ensureSelections() {
    if (state.locusRestorePending || state.unavailableLocus !== null) return;
    if (
      state.peekOpen
      && (state.taskCreateOpen || isWorkbenchTask(selectedWorkItem()))
    ) {
      return;
    }
    const projectList = projects();
    if (!projectList.length) {
      state.selectedProjectId = null;
      state.selectedMissionId = null;
      state.selectedWorktreeId = null;
      return;
    }

    if (!projectList.some((project, index) => identifier(project, `project-${index}`) === state.selectedProjectId)) {
      const attentionProjectId = text(first(attentionItems()[0], ["projectKey", "projectId", "project"]), "");
      const attentionProject = projectList.find((project, index) => identifier(project, `project-${index}`) === attentionProjectId);
      const projectWithMission = projectList.find((project) => projectMissions(project).length > 0);
      state.selectedProjectId = identifier(attentionProject || projectWithMission || projectList[0], "project-0");
    }

    const project = selectedProject();
    const missions = projectMissions(project);
    if (!missions.length) {
      state.selectedMissionId = null;
      state.selectedWorktreeId = null;
      return;
    }

    if (!missions.some((mission, index) => identifier(mission, `mission-${index}`) === state.selectedMissionId)) {
      const attentionMissionId = text(
        first(
          attentionItems().find(
            (item) => text(first(item, ["projectKey", "projectId", "project"]), "") === state.selectedProjectId,
          ),
          ["missionId", "mission"],
        ),
        "",
      );
      const attentionMission = missions.find((mission, index) => identifier(mission, `mission-${index}`) === attentionMissionId);
      state.selectedMissionId = identifier(attentionMission || missions[0], "mission-0");
    }

    const mission = selectedMission();
    const worktrees = projectWorktrees(project);
    if (!worktrees.length) {
      state.selectedWorktreeId = null;
      return;
    }

    if (!worktrees.some((worktree, index) => identifier(worktree, `worktree-${index}`) === state.selectedWorktreeId)) {
      const observedPath = text(first(first(mission, ["observedGitContext"], {}), ["worktreePath"]), "");
      const observed = worktrees.find(
        (worktree) => text(first(worktree, ["path", "worktreePath"]), "") === observedPath,
      );
      state.selectedWorktreeId = identifier(observed || worktrees[0], "worktree-0");
    }
  }

  function renderConnection() {
    const mark = $("#connection-mark");
    const warning = $("#source-warning");
    mark.className = "connection-mark";

    if (state.source === "live") {
      $("#connection-label").textContent = "实时 · 已连接";
      mark.classList.add("is-live");
      warning.hidden = true;
    } else if (state.source === "stale") {
      $("#connection-label").textContent = "上次实时 · 已过期";
      mark.classList.add("is-error");
      warning.hidden = false;
      warning.querySelector("strong").textContent = "实时刷新失败 · 操作已禁用";
      warning.querySelector("span").textContent =
        `保留最后一次成功的真实投影供检查；没有用演示数据替换现场。${state.snapshotError ? ` ${state.snapshotError}` : ""}`;
    } else if (state.source === "demo") {
      $("#connection-label").textContent = "演示 · 非实时";
      mark.classList.add("is-demo");
      warning.hidden = false;
      warning.querySelector("strong").textContent = "本地演示 · 非实时数据";
      warning.querySelector("span").textContent =
        "尚未成功读取过真实运行投影。当前界面只展示交互形式，不代表任何项目或 Agent 的真实状态。";
    } else if (state.source === "error") {
      $("#connection-label").textContent = "连接失败";
      mark.classList.add("is-error");
      warning.hidden = false;
    } else {
      $("#connection-label").textContent = "正在连接";
      warning.hidden = true;
    }
    const loading = state.source === "loading";
    document.body.dataset.projectionState = loading ? "loading" : "ready";
    $("#projection-loading").hidden = !loading;

    $("#generated-at").textContent = formatTime(
      first(state.snapshot, ["generatedAt", "observedAt", "timestamp"]),
      "尚未接收",
    );
    $("#snapshot-version").textContent = `版本 ${text(first(state.snapshot, ["version", "schemaVersion"]), "—")}`;
    const complete = first(state.snapshot, ["complete", "isComplete"]);
    $("#projection-completeness").textContent =
      complete === true
        ? "运行投影完整"
        : complete === false
          ? "运行投影不完整"
          : "投影完整性未知";
  }

  function renderSupervision() {
    const supervision = first(state.snapshot, ["supervision"], {});
    $("#supervisor-name").textContent = text(
      first(supervision, ["supervisor", "supervisorName", "actor"]),
      "Codex",
    );
    $("#subject-name").textContent = text(
      first(supervision, ["subject", "subjectName", "system"]),
      "Agent system",
    );
  }

  const workItemCopy = {
    open: "待开始",
    blocked: "受阻",
    verifying: "待验证",
    "in-progress": "进行中",
    waiting: "等待中",
    paused: "已暂停",
    settled: "已完成",
    invalidated: "已失效",
  };

  const actorCopy = {
    principal: "你",
    agent: "Agent",
    system: "系统",
    external: "外部条件",
    unknown: "尚未确认",
    none: "无需行动",
  };

  function workItemMatchesView(item, view = state.activeView) {
    if (view === "principal") return item.nextActor === "principal";
    if (view === "agent") return isExactLiveAgentWork(item);
    if (view === "agent-pending") return isPendingAgentWork(item);
    if (view === "independent") return isIndependentWorkbenchTask(item);
    if (view === "completed") return item.lifecycle === "settled";
    if (view === "tasks") {
      if (state.taskFilter === "principal") return item.nextActor === "principal";
      if (state.taskFilter === "agent") return isExactLiveAgentWork(item);
      if (state.taskFilter === "agent-pending") {
        return isPendingAgentWork(item);
      }
      if (state.taskFilter === "independent") {
        return isIndependentWorkbenchTask(item);
      }
      if (state.taskFilter === "verification") {
        return item.lifecycle === "verifying";
      }
      if (state.taskFilter === "completed") return item.lifecycle === "settled";
      return true;
    }
    return true;
  }

  function taskLocatorProjectLabel(key) {
    const project = projects().find(
      (candidate, index) => identifier(candidate, "project-" + index) === key,
    );
    return project ? projectName(project) : key;
  }

  function renderTaskLocatorEmptyNote(empty) {
    const conditions = (empty.conditions || [])
      .map((entry) => "<code>" + escapeHtml(entry) + "</code>")
      .join(" · ");
    const recover = empty.standing === "no-items"
      ? ""
      : '<button class="text-action" type="button" data-clear-task-locator>清除过滤</button>';
    return '<div class="task-locator-empty" data-standing="' + escapeHtml(empty.standing) + '">' +
      "<p>" + escapeHtml(empty.summary) + "</p>" +
      (conditions === "" ? "" : '<p class="task-locator-conditions">' + conditions + "</p>") +
      "<p>" + escapeHtml(empty.detail) + "</p>" +
      recover +
      "</div>";
  }

  function renderTaskLocatorControls(baseItems) {
    const sourceStanding = taskLocatorSourceStanding({
      source: state.source,
      complete: first(state.snapshot, ["complete"]),
      taskSourceStanding: first(taskSourceCapability(), ["standing"]),
    });
    const options = taskLocatorOptions(baseItems, taskLocatorProjectLabel);
    const projectSelect = $("#task-locator-project");
    const statusSelect = $("#task-locator-status");
    const retainedProject = projectSelect.value;
    const retainedStatus = statusSelect.value;
    projectSelect.innerHTML = [
      '<option value="">全部项目</option>',
      ...options.projects.map((entry) =>
        '<option value="' + escapeHtml(entry.key) + '">' +
        escapeHtml(entry.label + " · " + entry.count) + "</option>"),
    ].join("");
    statusSelect.innerHTML = [
      '<option value="">全部状态</option>',
      ...options.statuses.map((entry) =>
        '<option value="' + escapeHtml(entry.key) + '">' +
        escapeHtml((workItemCopy[entry.key] || entry.key) + " · " + entry.count) + "</option>"),
    ].join("");
    if ([...projectSelect.options].some((option) => option.value === retainedProject)) {
      projectSelect.value = retainedProject;
    }
    if ([...statusSelect.options].some((option) => option.value === retainedStatus)) {
      statusSelect.value = retainedStatus;
    }
    $("#task-locator-note").textContent = sourceStanding === "complete"
      ? ""
      : "任务来源不可用或投影不完整：当前计数只覆盖可读来源，不代表完整集合。";
  }

  function clearTaskLocator() {
    state.taskLocator = { keyword: "", project: null, status: null };
    $("#task-locator-keyword").value = "";
    $("#task-locator-project").value = "";
    $("#task-locator-status").value = "";
    render();
  }

  function workItemRow(item) {
    const project = projects().find(
      (candidate, index) => identifier(candidate, `project-${index}`) === item.projectKey,
    );
    const context = project
      ? `${projectName(project)}${item.missionId ? ` · ${item.missionId}` : ""}`
      : item.context;
    const actor = actorCopy[item.nextActor] || item.nextActor;
    const anomalyContext = workItemAnomalyContext(item);
    return `
      <button
        class="work-item ${item.id === state.selectedWorkItemId ? "is-selected" : ""}"
        type="button"
        data-work-item-id="${escapeHtml(item.id)}"
        data-lifecycle="${escapeHtml(item.lifecycle)}"
        data-work-item-kind="${escapeHtml(text(item.kind, "work"))}"
      >
        <span class="work-item-state">${escapeHtml(workItemCopy[item.lifecycle] || item.lifecycle)}</span>
        <span class="work-item-body">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="work-item-summary">${escapeHtml(item.summary)}</span>
          <small>${escapeHtml(context)} · 下一步 ${escapeHtml(actor)}${anomalyContext ? ` · ${escapeHtml(anomalyContext)}` : ""}</small>
        </span>
        <span class="work-item-meta">
          <small>${escapeHtml(workItemFreshnessLabel(item))}</small>
          <b>${escapeHtml(item.actionLabel)}</b>
        </span>
      </button>
    `;
  }

  function bindWorkItemRows(root = document) {
    root.querySelectorAll("[data-work-item-id]").forEach((button) => {
      button.addEventListener("click", () => {
        openWorkItem(button.dataset.workItemId);
      });
    });
  }

  function openWorkItem(id) {
    const item = workItems().find((candidate) => candidate.id === id);
    if (!item) return;
    clearActionReceipt();
    state.taskCreateOpen = false;
    state.taskActionReceipt = null;
    state.unavailableLocus = null;
    selectWorkItemContext(item);
    if (!isWorkbenchTask(item)) ensureSelections();
    render();
    writePrincipalLocus();
    if (item.consequence === "high" && window.matchMedia("(max-width: 700px)").matches) {
      state.detailRevalidationPending = true;
      render();
      loadSnapshot({ manual: true, ensure: true }).finally(() => {
        state.detailRevalidationPending = false;
        render();
      });
    }
  }

  function renderViewNavigation() {
    const items = workItems();
    const agentResponsibility = classifyAgentResponsibility(items);
    const counts = {
      all: items.length,
      principal: items.filter((item) => item.nextActor === "principal").length,
      agent: agentResponsibility.live.length,
      agentPending: agentResponsibility.pending.length,
      independent: items.filter(isIndependentWorkbenchTask).length,
      completed: items.filter((item) => item.lifecycle === "settled").length,
    };
    if (state.activeView === "tasks") {
      counts.all = items.filter(
        (item) => workItemMatchesView(item) && workItemMatchesTaskLocator(item, state.taskLocator),
      ).length;
    }
    $("#all-task-count").textContent = String(counts.all);
    $("#principal-task-count").textContent = String(counts.principal);
    $("#agent-task-count").textContent = String(counts.agent);
    $("#agent-pending-task-count").textContent = String(counts.agentPending);
    $("#task-filter-agent-count").textContent = String(counts.agent);
    $("#task-filter-agent-pending-count").textContent = String(counts.agentPending);
    const independentCapability = taskSourceCapability();
    $("#independent-task-count").textContent =
      first(independentCapability, ["standing"]) !== "available"
        ? "—"
        : String(counts.independent);
    $("#completed-task-count").textContent = String(counts.completed);

    $$("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === state.activeView);
      button.setAttribute(
        "aria-current",
        button.dataset.view === state.activeView ? "page" : "false",
      );
    });
    $$("[data-mobile-view]").forEach((button) => {
      const mobileView = button.dataset.mobileView;
      const active = mobileView === "conversation"
        ? state.activeView === "conversation"
        : mobileView === "overview"
          ? state.activeView === "overview"
          : mobileView === "tasks"
            ? ["tasks", "principal", "agent", "agent-pending", "independent", "completed"].includes(state.activeView)
            : state.activeView === "projects" || state.activeView === "project";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    $$("[data-task-filter]").forEach((button) => {
      const active = button.dataset.taskFilter === state.taskFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderOverviewProjects() {
    const container = $("#project-overview-list");
    const snapshotProjects = projects();
    $("#overview-project-count").textContent = String(snapshotProjects.length);
    if (!snapshotProjects.length) {
      container.innerHTML =
        '<p class="empty-note">当前没有可用项目；投影不完整时，这不代表项目数量为零。</p>';
      return;
    }

    container.innerHTML = snapshotProjects.map((project, index) => {
      const summary = projectWorkSummary(project, index);
      const projectItems = workItems().filter(
        (item) => item.projectKey === summary.projectKey
          && item.lifecycle !== "settled",
      );
      const worktrees = projectWorktrees(project);
      const primary = summary.primary;
      const completeness = "项目新鲜度未单独声明";
      return `
        <details class="project-group" ${projectItems.length > 0 && projectItems.length <= 3 ? "open" : ""}>
          <summary>
            <span class="project-group-disclosure" aria-hidden="true"></span>
            <span class="project-group-title">
              <strong>${escapeHtml(summary.name)}</strong>
              <small>${summary.worktreeCount} 个 Worktree · ${summary.taskCount} 项任务${summary.observationCount ? ` · ${summary.observationCount} 项异常` : ""}</small>
            </span>
            <span class="project-group-focus">
              <strong>${escapeHtml(primary?.summary || "当前没有未完成任务")}</strong>
              <small>${escapeHtml(primary ? `下一步 ${actorCopy[primary.nextActor] || primary.nextActor}` : completeness)}</small>
            </span>
            <span class="project-observation">
              ${escapeHtml(completeness)}
            </span>
          </summary>
          <div class="project-group-body">
            <div class="project-task-excerpts">
              ${
                projectItems.length
                  ? projectItems.slice(0, 3).map(workItemRow).join("")
                  : '<p class="empty-note">没有来自当前投影的未完成任务。</p>'
              }
              ${
                projectItems.length > 3
                  ? `<p class="more-note">另有 ${projectItems.length - 3} 项</p>`
                  : ""
              }
            </div>
            <div class="project-worktrees">
              <div class="project-worktree-heading">
                <span>Worktrees</span>
                <button type="button" data-open-project="${escapeHtml(summary.projectKey)}">打开项目</button>
              </div>
              ${
                worktrees.length
                  ? worktrees.map((worktree, worktreeIndex) => `
                      <button
                        class="overview-worktree"
                        type="button"
                        data-overview-project="${escapeHtml(summary.projectKey)}"
                        data-overview-worktree="${escapeHtml(identifier(worktree, `worktree-${worktreeIndex}`))}"
                      >
                        <strong>${escapeHtml(first(worktree, ["gitBranch", "branch", "name"], "detached"))}</strong>
                        <span>${escapeHtml(first(worktree, ["path"], "位置未知"))}</span>
                        <small>${first(worktree, ["dirty"]) === true ? "有未提交改动" : first(worktree, ["dirty"]) === false ? "工作区干净" : "状态未观察"}</small>
                      </button>
                    `).join("")
                  : '<p class="empty-note">未观察到 Worktree。</p>'
              }
            </div>
          </div>
        </details>
      `;
    }).join("");

    bindWorkItemRows(container);
    container.querySelectorAll("[data-open-project]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.selectedProjectId = button.dataset.openProject;
        state.activeView = "project";
        state.peekOpen = false;
        state.taskCreateOpen = false;
        ensureSelections();
        render();
        writePrincipalLocus();
      });
    });
    container.querySelectorAll("[data-overview-worktree]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.selectedProjectId = button.dataset.overviewProject;
        state.selectedWorktreeId = button.dataset.overviewWorktree;
        state.activeView = "project";
        state.peekOpen = false;
        state.taskCreateOpen = false;
        ensureSelections();
        state.selectedWorktreeId = button.dataset.overviewWorktree;
        render();
        writePrincipalLocus();
      });
    });
  }

  function renderLocusGate({
    overview,
    projectDetail,
    taskView,
    taskFilters,
    attentionOverview,
    systemOverview,
    projectOverview,
  }) {
    const pending = state.locusRestorePending;
    const unavailable = state.unavailableLocus;
    overview.hidden = false;
    projectDetail.hidden = true;
    taskView.hidden = false;
    taskFilters.hidden = true;
    attentionOverview.hidden = true;
    systemOverview.hidden = true;
    projectOverview.hidden = true;
    $("#view-eyebrow").textContent = pending
      ? "Restoring location"
      : "Unavailable location";
    $("#view-title").textContent = pending ? "正在恢复位置" : "请求的位置不可用";
    $("#view-summary").textContent = pending
      ? "正在读取新的运行投影；完成前不会恢复或启用此位置上的动作。"
      : unavailable.reason;
    $("#create-task-button").disabled = true;
    $("#task-view-heading").textContent = pending ? "正在读取实时投影" : "无法恢复";
    $("#task-view-count").textContent = "—";
    const requestedId = text(first(unavailable, ["requestedId"]), "");
    $("#task-view-list").innerHTML = pending
      ? '<div class="surface-empty"><span>…</span><p>等待当前投影后解析稳定标识。</p></div>'
      : `
          <div class="surface-empty">
            <span>—</span>
            <p>${escapeHtml(unavailable.reason)}${
              requestedId ? `<br /><code>${escapeHtml(requestedId)}</code>` : ""
            }</p>
            <button class="text-action" type="button" data-clear-principal-locus>
              返回当前总览
            </button>
          </div>
        `;
    const clear = $("[data-clear-principal-locus]");
    if (clear) {
      clear.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.locusRequest = {
          view: "overview",
          filter: "all",
          projectId: null,
          workItemId: null,
        };
        state.activeView = "overview";
        state.taskFilter = "all";
        state.selectedProjectId = null;
        state.selectedMissionId = null;
        state.selectedWorktreeId = null;
        state.selectedWorkItemId = null;
        state.peekOpen = false;
        render();
        writePrincipalLocus();
      });
    }
  }

  function renderUnifiedSurface() {
    const items = workItems();
    document.body.dataset.uiView = state.activeView;
    const overview = $("#unified-surface");
    const projectDetail = $("#project-detail");
    const taskView = $("#task-view");
    const taskFilters = $("#task-filter-bar");
    const attentionOverview = $("#attention-overview");
    const systemOverview = $("#system-overview");
    const projectOverview = $("#project-overview");
    const isProjectView = state.activeView === "project";
    const isProjectsView = state.activeView === "projects";
    const isOverview = state.activeView === "overview";

    if (state.locusRestorePending || state.unavailableLocus !== null) {
      renderLocusGate({
        overview,
        projectDetail,
        taskView,
        taskFilters,
        attentionOverview,
        systemOverview,
        projectOverview,
      });
      return;
    }

    overview.hidden = isProjectView;
    projectDetail.hidden = !isProjectView;
    taskView.hidden = isOverview || isProjectView || isProjectsView;
    taskFilters.hidden = state.activeView !== "tasks";
    attentionOverview.hidden = !isOverview;
    systemOverview.hidden = !isOverview;
    projectOverview.hidden = !(isOverview || isProjectsView);

    const viewMeta = {
      overview: ["Workbench overview", "总览", "先看最重要的待办、异常与项目摘要；完整证据从详情打开。"],
      projects: ["Projects", "项目", "按项目与 Worktree 查看当前工作，不把观察关系伪装成任务绑定。"],
      principal: ["Needs you", "待我处理", "显示完整的待我处理队列；列表只用于定位，决策证据在详情中查看。"],
      agent: ["Agent live", "Agent 运行中", "只显示有实时载体证据的当前 Agent 运行。"],
      "agent-pending": ["Agent queue", "待 Agent 接手", "只显示下一责任方为 Agent、但尚无精确实时执行证据的事项。"],
      independent: ["Independent", "独立任务", "只显示来源明确声明为独立的任务。"],
      completed: ["Completed", "已完成", "任务完成不自动代表 Mission 结案、验证通过或已集成。"],
      tasks: ["Tasks", "任务", "按筛选定位全量任务；状态、责任方和来源先行，长证据在详情中查看。"],
    };
    const [eyebrow, title, summary] = viewMeta[state.activeView] || viewMeta.overview;
    $("#view-eyebrow").textContent = eyebrow;
    $("#view-title").textContent = title;
    $("#view-summary").textContent = summary;

    const observation = $("#observation-state");
    const taskCapability = taskSourceCapability();
    $("#create-task-button").disabled =
      state.source !== "live"
      || first(taskCapability, ["standing"]) !== "available"
      || state.taskActionPending;
    $("#create-task-button").title =
      first(taskCapability, ["standing"]) === "available"
        ? ""
        : text(first(taskCapability, ["reason"]), "任务源当前不可用");
    observation.dataset.complete = first(state.snapshot, ["complete"]) === true ? "true" : "false";
    observation.querySelector("strong").textContent =
      state.source === "live"
        ? first(state.snapshot, ["complete"]) === true
          ? "实时 · 完整"
          : "实时 · 部分来源不可用"
        : state.source === "stale"
          ? "上次实时 · 已过期"
          : state.source === "demo"
            ? "演示 · 非事实"
            : "正在读取";

    if (isOverview) {
      const attention = classifyWorkbenchAttention(items);
      $("#overview-attention-count").textContent = String(attention.principal.length);
      $("#overview-attention-list").innerHTML = attention.principal.length
        ? attention.principal.slice(0, 5).map(workItemRow).join("")
        : '<p class="empty-note">当前没有下一责任方是你的事项。</p>';
      bindWorkItemRows($("#overview-attention-list"));
      $("#overview-system-count").textContent = String(attention.system.length);
      $("#overview-system-list").innerHTML = attention.system.length
        ? attention.system.slice(0, 5).map(workItemRow).join("")
        : '<p class="empty-note">当前没有需要恢复或检查的系统异常。</p>';
      bindWorkItemRows($("#overview-system-list"));
    }

    if (isOverview || isProjectsView) renderOverviewProjects();

    if (!isOverview && !isProjectView && !isProjectsView) {
      const base = items.filter((item) => workItemMatchesView(item));
      const locatorActive = state.activeView === "tasks";
      const filtered = locatorActive
        ? base.filter((item) => workItemMatchesTaskLocator(item, state.taskLocator))
        : base;
      $("#task-view-heading").textContent = title;
      $("#task-view-count").textContent = String(filtered.length);
      $("#task-locator").hidden = !locatorActive;
      if (locatorActive) renderTaskLocatorControls(base);
      const empty = locatorActive
        ? taskLocatorEmptySummary(state.taskLocator, {
          sourceStanding: taskLocatorSourceStanding({
            source: state.source,
            complete: first(state.snapshot, ["complete"]),
            taskSourceStanding: first(taskSourceCapability(), ["standing"]),
          }),
          projectLabel: taskLocatorProjectLabel,
          statusLabel: (key) => workItemCopy[key] || key,
        })
        : null;
      $("#task-view-list").innerHTML = filtered.length
        ? filtered.map(workItemRow).join("")
        : locatorActive
          ? renderTaskLocatorEmptyNote(empty)
          : '<p class="empty-note">当前投影没有符合这个视图的任务。</p>';
      bindWorkItemRows($("#task-view-list"));
      const clear = $("[data-clear-task-locator]");
      if (clear) clear.addEventListener("click", clearTaskLocator);
    }
  }

  function renderPeek() {
    const peek = $("#work-item-peek");
    const item = selectedWorkItem();
    const unavailableWorkItem =
      state.unavailableLocus !== null
      && Boolean(state.locusRequest.workItemId);
    const open =
      state.peekOpen
      && (item !== null || state.taskCreateOpen || unavailableWorkItem);
    peek.hidden = !open;
    document.body.dataset.peekOpen = open ? "true" : "false";
    document.body.dataset.peekContext = state.taskCreateOpen
      ? "task-create"
      : isWorkbenchTask(item)
        ? "workbench-task"
        : item?.projectKey && item?.missionId
          ? "bound"
          : "observation";
    document.body.dataset.peekConsequence = item?.consequence || "normal";
    if (!open) return;

    if (unavailableWorkItem) {
      $("#peek-context").textContent = "Workbench · 请求位置";
      $("#peek-item-state").textContent = "不可用";
      $("#peek-item-title").textContent = "请求的任务不可用";
      $("#peek-item-summary").textContent = state.unavailableLocus.reason;
      $("#peek-next-actor").textContent = "等待重新出现或返回总览";
      $("#peek-freshness").textContent =
        state.source === "live" ? "实时投影已重验" : "实时投影不可用";
      $("#anomaly-detail").hidden = true;
      return;
    }

    if (state.taskCreateOpen) {
      $("#peek-context").textContent = "Workbench · 新建任务";
      $("#peek-item-state").textContent = "草稿";
      $("#peek-item-title").textContent = "创建一个可持续跟踪的任务";
      $("#peek-item-summary").textContent =
        "任务可以独立存在，或引用一个已注册项目与已观察 Worktree 作为上下文。";
      $("#peek-next-actor").textContent = "创建时选择";
      $("#peek-freshness").textContent =
        first(taskSourceCapability(), ["standing"]) === "available"
          ? "实时任务源"
          : "任务源不可用";
      $("#anomaly-detail").hidden = true;
      return;
    }

    const anomaly = first(item, ["anomalyDetail"]);
    const anomalyContext = workItemAnomalyContext(item);
    const compactAnomalyContext = anomalyContext
      .split(" · ")
      .slice(0, 3)
      .join(" · ");
    const peekContext = compactAnomalyContext
      ? `${item.context} · ${compactAnomalyContext}`
      : item.context;
    const anomalyReason = text(
      first(item, ["reason"]),
      "",
    );
    $("#peek-context").textContent = peekContext;
    $("#peek-context").title = peekContext;
    $("#peek-item-state").textContent = workItemCopy[item.lifecycle] || item.lifecycle;
    $("#peek-item-title").textContent = item.title;
    $("#peek-item-summary").textContent = [
      item.summary,
      anomaly === undefined && anomalyReason ? anomalyReason : "",
    ].filter(Boolean).join(" · ");
    $("#peek-next-actor").textContent = [
      actorCopy[item.nextActor] || item.nextActor,
      compactAnomalyContext,
    ].filter(Boolean).join(" · ");
    $("#peek-freshness").textContent = state.detailRevalidationPending
      ? "正在重验当前目标"
      : workItemFreshnessLabel(item);
    if (state.detailRevalidationPending) {
      $("#proposal-authorize-button").disabled = true;
    }
    const anomalySection = $("#anomaly-detail");
    anomalySection.hidden = anomaly === null || anomaly === undefined;
    if (!anomalySection.hidden) renderAnomalyDetail(anomaly, item);
  }

  function renderAnomalyDetail(detail, item = null) {
    if (!detail || typeof detail !== "object") return;
    const scene = first(detail, ["scene"], {});
    const dedup = first(detail, ["dedup"], {});
    const evidence = first(detail, ["evidenceStanding"], {});
    const binding = first(detail, ["binding"], {});
    const sourcePath = text(first(scene, ["sourcePath"]), "来源未投影");
    const relatedPaths = list(first(scene, ["relatedPaths"], []));
    $("#anomaly-scene").textContent = relatedPaths.length
      ? sourcePath + " · " + relatedPaths.join(" · ")
      : sourcePath;
    $("#anomaly-dedup").textContent = [
      "依据 " + text(first(dedup, ["basis"]), "未声明"),
      "键 " + text(first(dedup, ["key"]), "未声明"),
      "合并 " + String(text(first(dedup, ["mergedCount"]), 1)) + " 条投影事实",
    ].join(" · ");
    const freshnessKind = text(first(evidence, ["freshnessKind"]), "unknown");
    const observedAt = text(first(evidence, ["observedAt"]), "");
    const sourceUpdatedAt = text(first(evidence, ["sourceUpdatedAt"]), "");
    $("#anomaly-evidence-standing").textContent = [
      "证据 " + freshnessKind,
      observedAt ? "观察 " + formatTime(observedAt) : "",
      sourceUpdatedAt ? "来源更新 " + formatTime(sourceUpdatedAt) : "",
      text(first(evidence, ["meaning"]), ""),
    ].filter(Boolean).join(" · ");
    const bindingStanding = text(first(binding, ["standing"]), "unverified");
    const runnerId = text(
      first(item, ["runnerId"]) || first(binding, ["runnerId"]),
      "身份未投影",
    );
    const bindingMissionId = text(first(binding, ["missionId"]), "");
    const bindingReason = text(first(binding, ["reason"]), "");
    $("#anomaly-binding").textContent = [
      "Runner " + runnerId,
      "绑定 " + bindingStanding,
      bindingMissionId ? "声明 Mission " + bindingMissionId : "",
      bindingReason,
    ].filter(Boolean).join(" · ");
    const facets = list(first(detail, ["facets"], []));
    $("#anomaly-facets").innerHTML = facets.length
      ? facets.map((facet) => {
        const code = text(first(facet, ["code"]), "未知");
        const summary = text(first(facet, ["summary"]), "");
        const source = text(first(facet, ["source"]), "");
        return '<article class="anomaly-facet">' +
          "<strong>" + escapeHtml(code) + "</strong>" +
          "<span>" + escapeHtml(summary) + "</span>" +
          "<small>" + escapeHtml(source) + "</small>" +
          "</article>";
      }).join("")
      : '<p class="empty-note">没有其它同源投影事实。</p>';
    const rawErrors = list(first(detail, ["rawErrors"], []));
    $("#anomaly-errors").innerHTML = rawErrors.length
      ? rawErrors.map((entry) => {
        const stage = text(first(entry, ["stage"]), "unknown");
        const raw = text(first(entry, ["raw"]), "");
        const normalized = text(first(entry, ["normalized"]), "");
        const impact = text(first(entry, ["impact"]), "");
        return '<article class="anomaly-error" data-stage="' + escapeHtml(stage) + '">' +
          "<strong>" + escapeHtml(stage) + "</strong>" +
          "<p>" + escapeHtml(normalized) + "</p>" +
          "<small>影响范围：" + escapeHtml(impact) + "</small>" +
          "<pre>" + escapeHtml(raw) + "</pre>" +
          "</article>";
      }).join("")
      : '<p class="empty-note">没有原始错误证据；本事项来自状态投影本身。</p>';
    const steps = list(first(detail, ["nextSteps"], []));
    $("#anomaly-next-steps").innerHTML = steps.length
      ? steps.map((step) => {
        const supported = first(step, ["supported"]) === true;
        const label = text(first(step, ["label"]), "未命名步骤");
        const responsible = text(first(step, ["responsible"]), "责任方未声明");
        const stepDetail = text(first(step, ["detail"]), "");
        const blocker = text(first(step, ["blocker"]), "");
        const action = supported && label === "刷新当前投影"
          ? '<button class="text-action" type="button" data-anomaly-refresh>刷新当前投影</button>'
          : "";
        return '<article class="anomaly-step" data-supported="' + (supported ? "true" : "false") + '">' +
          "<strong>" + escapeHtml(supported ? "可用" : "暂不可用") + "</strong>" +
          "<span>" + escapeHtml(label) + "</span>" +
          "<small>责任方：" + escapeHtml(responsible) + " · " + escapeHtml(stepDetail) + "</small>" +
          (supported ? "" : "<small>阻塞：" + escapeHtml(blocker) + "</small>") +
          action +
          "</article>";
      }).join("")
      : '<p class="empty-note">没有已声明的下一步。</p>';
    $$("[data-anomaly-refresh]").forEach((button) => {
      button.addEventListener("click", () => {
        loadSnapshot({ manual: true, ensure: true });
      });
    });
  }

  function renderTaskPanels() {
    const createPanel = $("#task-create-panel");
    const detailPanel = $("#local-task-detail");
    const detail = taskDetail();
    createPanel.hidden = !state.taskCreateOpen;
    detailPanel.hidden = state.taskCreateOpen || detail === null;

    if (state.taskCreateOpen) {
      const projectSelect = $("#task-create-project");
      const retainedProject = projectSelect.value;
      const registered = projects().filter(
        (project) =>
          first(project, ["registration"]) === "registered"
          && text(first(first(project, ["identity"], {}), ["id"]), "") !== "",
      );
      projectSelect.innerHTML = [
        '<option value="">独立任务</option>',
        ...registered.map((project) => {
          const id = text(first(first(project, ["identity"], {}), ["id"]), "");
          return `<option value="${escapeHtml(id)}">${escapeHtml(projectName(project))}</option>`;
        }),
      ].join("");
      if ([...projectSelect.options].some((option) => option.value === retainedProject)) {
        projectSelect.value = retainedProject;
      }
      renderTaskCreateWorktrees();
      renderTaskCreateMissions();
      $("#task-create-submit").disabled =
        state.taskActionPending
        || state.source !== "live"
        || first(taskSourceCapability(), ["standing"]) !== "available";
      renderTaskActionReceipt($("#task-create-result"), "create");
      return;
    }

    if (detail === null) return;
    const task = detail.task;
    $("#local-task-source").textContent = detail.sourceRef;
    $("#local-task-revision").textContent =
      `source ${detail.sourceRevision} · task ${task.revision}`;
    $("#local-task-identity-assurance").textContent = detail.identityAssurance;
    $("#local-task-project-boundary").textContent =
      task.binding.kind === "project-context"
        ? `${task.binding.projectId} · 仅上下文`
        : "无项目绑定 · Workbench 独立任务";
    const missionContext = first(detail, ["missionContext"], {});
    const missionId = text(first(missionContext, ["missionId"]), "");
    const missionStanding = text(
      first(missionContext, ["standing"]),
      missionId ? "unavailable" : "not-declared",
    );
    const missionReason = text(first(missionContext, ["reason"]), "");
    $("#local-task-mission-boundary").textContent =
      missionStanding === "observed"
        ? `${missionId} · 当前已观察 · 仅上下文`
        : missionStanding === "unavailable"
          ? `${missionId || "已声明 Mission"} · 当前不可用 · 仅上下文`
          : "未声明 Mission 上下文";
    $("#local-task-mission-context-heading").textContent =
      missionStanding === "observed"
        ? `${missionId} 当前可用`
        : missionStanding === "unavailable"
          ? `${missionId || "Mission"} 当前不可用`
          : "未声明 Mission 上下文";
    $("#local-task-mission-context-summary").textContent =
      missionStanding === "observed"
        ? missionReason
          ? `Mission 当前可用，但当前载体无法唯一确认：${missionReason}。执行此任务仍未证明。`
          : "任务仅引用这个 Mission 的当前观察；关联不启动执行，也不授予 Mission 权限。"
        : missionStanding === "unavailable"
          ? `保留的 Mission 上下文无法由当前投影确认${
              missionReason ? `：${missionReason}` : "。"
            }`
          : "本地任务尚未引用项目中的 Mission。";
    const carrierContext = $("#local-task-carrier-context");
    const currentCarrier = first(missionContext, ["currentCarrier"]);
    carrierContext.hidden = currentCarrier === null || currentCarrier === undefined;
    if (!carrierContext.hidden) {
      const carrierRunnerId = text(first(currentCarrier, ["runnerId"]), "未声明 Runner ID");
      const carrierState = text(first(currentCarrier, ["state"]), "状态未知");
      const carrierLive = first(currentCarrier, ["live"]);
      const carrierFreshness = first(first(currentCarrier, ["freshness"], {}), ["kind"]);
      $("#local-task-carrier-title").textContent =
        `${carrierRunnerId} · ${carrierState} · ${
          carrierLive === true && carrierFreshness === "live"
            ? "实时"
            : carrierLive === false
              ? "缓存"
              : "可达性未验证"
        }`;
      $("#local-task-carrier-source").textContent =
        text(first(currentCarrier, ["sourceRef"]), "载体来源未声明");
    }
    const executionContext = first(detail, ["executionContext"], {});
    const executionStanding = text(
      first(executionContext, ["standing"]),
      "unavailable",
    );
    const executionStandingCopy = {
      "current-effect-exact": "current effect exact",
      "current-turn-exact": "current turn exact",
      "authorization-consumption-verified": "authorization consumption verified",
      "legacy-unproven": "legacy execution-unproven",
      unavailable: "current execution unavailable",
    };
    $("#local-task-execution-standing").textContent =
      executionStandingCopy[executionStanding] || executionStanding;
    $("#local-task-execution-context").dataset.standing = executionStanding;
    for (const [layerName, layer] of [
      ["authorization", first(executionContext, ["authorizationConsumption"], {})],
      ["turn", first(executionContext, ["currentTurn"], {})],
      ["effect", first(executionContext, ["currentEffect"], {})],
    ]) {
      const layerStanding = text(first(layer, ["standing"]), "unavailable");
      const reason = text(first(layer, ["reason"]), "");
      const standingCopy = layerStanding === "verified"
        ? "authorization consumption verified"
        : layerStanding === "exact"
          ? layerName === "turn" ? "current turn exact" : "current effect exact"
          : layerStanding === "legacy-unproven"
            ? "legacy execution-unproven"
            : `unavailable${reason ? ` · ${reason}` : ""}`;
      const layerElement = $(`#task-execution-${layerName}-layer`);
      layerElement.dataset.standing = layerStanding;
      $(`#task-execution-${layerName}-standing`).textContent = standingCopy;
      const sources = list(first(layer, ["sourceRefs"], []));
      $(`#task-execution-${layerName}-sources`).textContent = sources.length
        ? sources.join(" · ")
        : "尚无当前证据来源";
    }
    const launchReadiness = first(executionContext, ["launchReadiness"]);
    const launchReadinessStanding = text(
      first(launchReadiness, ["standing"]),
      "not-applicable",
    );
    const launchReadinessPanel = $("#task-launch-readiness");
    launchReadinessPanel.hidden =
      launchReadiness === null
      || launchReadiness === undefined
      || launchReadinessStanding === "not-applicable";
    if (!launchReadinessPanel.hidden) {
      const blockers = list(first(launchReadiness, ["blockers"], []));
      const blockerCopy = {
        "exact-context-required": "需要精确的项目、Mission 与 Worktree 上下文",
        "mission-unavailable": "当前 Mission 不可用",
        "execution-proposal-unavailable": "当前没有可执行的 proposal",
        "fresh-authorization-required": "需要新的未消费一次性授权",
        "worktree-unavailable": "当前 Worktree 不可用",
        "clean-detached-worktree-required": "需要干净的 detached Worktree",
        "mission-head-mismatch": "Mission HEAD 与 proposal 不一致",
        "live-carrier-present": "当前已经存在 live carrier",
        "runtime-adapter-unavailable": "当前 runtime adapter 不可用",
      };
      launchReadinessPanel.dataset.standing = launchReadinessStanding;
      $("#task-launch-readiness-standing").textContent =
        launchReadinessStanding === "ready" ? "已就绪" : "需要准备";
      $("#task-launch-readiness-summary").textContent =
        launchReadinessStanding === "ready"
          ? "现有一次性授权与候选 Worktree 已满足启动条件。"
          : `启动前还有 ${blockers.length} 项准备未完成。`;
      $("#task-launch-readiness-blockers").innerHTML = blockers
        .map((blocker) => {
          const code = text(first(blocker, ["code"]), "未识别阻断");
          const message = text(
            first(blocker, ["message"]),
            blockerCopy[code] || code,
          );
          return `
            <li>
              <strong>${escapeHtml(blockerCopy[code] || code)}</strong>
              <small>${escapeHtml(message)}</small>
            </li>
          `;
        })
        .join("");
    }
    const launchCandidate = first(executionContext, ["launchCandidate"]);
    const launchForm = $("#task-launch-execution-form");
    launchForm.hidden =
      launchCandidate === null
      || launchCandidate === undefined;
    if (!launchForm.hidden) {
      const authorizationId = text(
        first(launchCandidate, ["authorizationId"]),
        "未识别授权",
      );
      const proposalDigest = text(
        first(launchCandidate, ["proposalDigest"]),
        "未识别 proposal",
      );
      $("#task-launch-execution-reference").textContent =
        `authorization ${authorizationId} · proposal ${proposalDigest}`;
    }
    const linkCandidate = first(executionContext, ["linkCandidate"]);
    const linkForm = $("#task-link-execution-form");
    linkForm.hidden = linkCandidate === null || linkCandidate === undefined;
    if (!linkForm.hidden) {
      const authorizationId = text(first(linkCandidate, ["authorizationId"]), "");
      const proposalDigest = text(first(linkCandidate, ["proposalDigest"]), "");
      $("#task-link-execution-candidate").innerHTML = `
        <option value="${escapeHtml(authorizationId)}">
          ${escapeHtml(authorizationId)} · ${escapeHtml(proposalDigest)}
        </option>
      `;
      const evidenceRefs = list(first(linkCandidate, ["evidenceRefs"], []));
      $("#task-link-execution-evidence").innerHTML = evidenceRefs
        .map((source) => `<li>${escapeHtml(source)}</li>`)
        .join("");
    }
    $("#local-task-worktree-boundary").textContent =
      task.binding.kind === "project-context" && task.binding.worktreePath
        ? detail.worktreeStanding === "observed"
          ? `${task.binding.worktreePath} · 当前已观察 · 无执行权限`
          : `${task.binding.worktreePath} · 预期上下文当前不可用${
              detail.worktreeReason ? ` · ${detail.worktreeReason}` : ""
            }`
        : "未声明 Worktree 上下文";
    $("#local-task-objective").textContent = task.objective;
    $("#local-task-acceptance").innerHTML = task.acceptance
      .map((criterion) => `<li>${escapeHtml(criterion)}</li>`)
      .join("");
    renderTaskResultEvaluation(detail, task);

    const currentTurnGuidance = first(
      first(executionContext, ["currentTurn"], {}),
      ["guidance"],
      {},
    );
    const guidanceMode = text(
      first(currentTurnGuidance, ["mode"]),
      "",
    );
    const guidedCorrectionIds = new Set(
      list(first(currentTurnGuidance, ["correctionIds"], [])),
    );
    const pendingNextTurnCorrectionIds = new Set(
      list(first(currentTurnGuidance, ["missingCorrectionIds"], [])),
    );
    const history = [
      ...list(first(task, ["worktreeRebindings"], [])).map((entry) => ({
        at: entry.reboundAt,
        kind: "Worktree 上下文已切换",
        summary: `${entry.fromWorktreePath} → ${entry.toWorktreePath}`,
        source: entry.sourceRef,
      })),
      ...task.corrections.map((entry) => {
        const deliveries = list(first(entry, ["deliveries"], []));
        const delivery = deliveries.at(-1);
        const guided = guidedCorrectionIds.has(entry.id);
        const pendingNextTurn =
          guidanceMode === "launch-snapshot"
          && pendingNextTurnCorrectionIds.has(entry.id);
        return {
          at: delivery
            ? text(first(delivery, ["recordedAt"]), entry.at)
            : entry.at,
          kind: delivery
            ? `纠正 · 已送达 watermark ${text(first(delivery, ["inputWatermark"]), "—")}`
            : guided
              ? "纠正 · 已作为当前执行指导"
              : pendingNextTurn
                ? "纠正 · 待下一次授权执行"
                : "纠正 · 仅保留在本地任务",
          summary: entry.statement,
          source: delivery
            ? [
              entry.sourceRef,
              text(first(delivery, ["sourceRef"]), ""),
              text(first(delivery, ["inputEventId"]), ""),
            ].filter(Boolean).join(" · ")
            : entry.sourceRef,
        };
      }),
      ...task.resultClaims.map((claim) => {
        const evidence = first(claim, ["evidence"], {
          kind: "agent-references-unverified",
        });
        const runtimeVerified =
          first(evidence, ["kind"]) === "runtime-verified-effect";
        const selector = first(evidence, ["selector"], {});
        return {
          at: claim.submittedAt,
          kind: claim.standing === "accepted"
            ? runtimeVerified
              ? "已接受结果 · 接受时运行时已验证"
              : "已接受结果 · Agent 声明未验证"
            : claim.standing === "superseded"
              ? "历史结果 · 已被后续要求取代"
              : runtimeVerified
                ? "当前结果 · 运行时已验证"
                : "当前结果 · Agent 声明未验证",
          summary: claim.summary,
          source: [
            claim.sourceRef,
            ...(runtimeVerified
              ? [
                text(first(selector, ["effectId"]), ""),
                text(first(selector, ["verificationEventId"]), ""),
              ]
              : []),
            ...claim.evidenceRefs,
          ].filter(Boolean).join(" · "),
        };
      }),
    ].sort((left, right) => left.at.localeCompare(right.at));
    $("#local-task-history").innerHTML = history.length
      ? history.map((entry) => `
          <article class="local-task-history-entry">
            <span>${escapeHtml(entry.kind)} · ${escapeHtml(formatTime(entry.at, entry.at))}</span>
            <strong>${escapeHtml(entry.summary)}</strong>
            <small>${escapeHtml(entry.source)}</small>
          </article>
        `).join("")
      : '<p class="empty-note">尚无上下文变更、纠正或结果。</p>';
    renderTaskAttempts(detail);
    const correctionDeliveryCandidate = first(
      executionContext,
      ["correctionDeliveryCandidate"],
    );
    const correctionDeliveryForm = $("#task-correction-delivery-form");
    correctionDeliveryForm.hidden =
      correctionDeliveryCandidate === null
      || correctionDeliveryCandidate === undefined;
    if (!correctionDeliveryForm.hidden) {
      const correctionId = text(
        first(correctionDeliveryCandidate, ["correctionId"]),
        "",
      );
      const correction = task.corrections.find(
        (entry) => entry.id === correctionId,
      );
      $("#task-correction-delivery-summary").textContent =
        correction?.statement || "待发送纠正";
    }
    const recoveryCandidate = first(
      executionContext,
      ["recoveryCandidate"],
    );
    const recoveryForm = $("#task-execution-recovery-form");
    recoveryForm.hidden =
      recoveryCandidate === null
      || recoveryCandidate === undefined;
    if (!recoveryForm.hidden) {
      const target = first(recoveryCandidate, ["target"], {});
      $("#task-execution-recovery-summary").textContent =
        `${text(first(target, ["runnerId"]), "未识别 Runner")} · interrupted · authorization ${
          text(first(recoveryCandidate, ["authorizationId"]), "未识别")
        }`;
    }
    const verifiedResultCandidate = first(
      executionContext,
      ["verifiedResultCandidate"],
    );
    const verifiedResultPanel = $("#task-verified-result-candidate");
    verifiedResultPanel.hidden =
      verifiedResultCandidate === null
      || verifiedResultCandidate === undefined;
    if (!verifiedResultPanel.hidden) {
      const selector = first(verifiedResultCandidate, ["selector"], {});
      $("#task-verified-result-effect").textContent =
        `${text(first(selector, ["effectId"]), "未识别 Effect")} · verification ${text(first(selector, ["verificationEventId"]), "未识别")}`;
      const evidenceRefs = list(
        first(verifiedResultCandidate, ["evidenceRefs"], []),
      );
      $("#task-verified-result-source").textContent =
        evidenceRefs.length
          ? evidenceRefs.join(" · ")
          : "运行时 selector 已形成；引用来源未投影。";
    }
    const attemptResultCandidate = first(
      executionContext,
      ["attemptResultCandidate"],
    );
    const attemptResultPanel = $("#task-attempt-result-candidate");
    attemptResultPanel.hidden =
      attemptResultCandidate === null
      || attemptResultCandidate === undefined;
    if (!attemptResultPanel.hidden) {
      const worktree = first(attemptResultCandidate, ["worktree"], {});
      const diff = first(attemptResultCandidate, ["workspaceDiff"], {});
      const checks = first(attemptResultCandidate, ["verification"], {});
      $("#task-attempt-result-effect").textContent =
        `attempt ${text(first(attemptResultCandidate, ["attemptId"]), "未识别")} · task revision ${text(first(attemptResultCandidate, ["taskRevision"]), "—")}`;
      $("#task-attempt-result-source").textContent = [
        `run ${text(first(attemptResultCandidate, ["workCellRunId"]), "未保留")}`,
        `worktree ${text(first(worktree, ["path"]), "未绑定")} @ ${text(first(worktree, ["head"]), "unknown")}`,
        `diff +${list(first(diff, ["added"], [])).length} ~${list(first(diff, ["changed"], [])).length} −${list(first(diff, ["removed"], [])).length}`,
        `checks passed ${first(checks, ["passed"]) === true ? "是" : "否"} · terminal ${first(checks, ["terminalPassed"]) === true ? "是" : "否"}`,
        ...list(first(attemptResultCandidate, ["evidenceRefs"], [])).map(
          (ref) => text(ref),
        ),
      ].join("\n");
    }

    const settled = task.lifecycle === "settled";
    const verifying = task.lifecycle === "verifying";
    const rebindForm = $("#task-rebind-worktree-form");
    const currentWorktreePath =
      task.binding.kind === "project-context"
        ? text(first(task.binding, ["worktreePath"]), "")
        : "";
    const taskProject =
      task.binding.kind === "project-context"
        ? projects().find(
          (candidate) =>
            text(first(first(candidate, ["identity"], {}), ["id"]), "")
              === task.binding.projectId,
        )
        : null;
    const rebindCandidates = taskProject === null
      ? []
      : projectWorktrees(taskProject).filter(
        (worktree) =>
          text(first(worktree, ["path", "worktreePath"]), "")
            !== currentWorktreePath,
      ).filter(
        (worktree) => first(worktree, ["dirty"]) !== true,
      );
    rebindForm.hidden =
      settled
      || !currentWorktreePath
      || rebindCandidates.length === 0;
    $("#task-rebind-worktree").innerHTML = [
      '<option value="" selected disabled>选择新的 Worktree…</option>',
      ...rebindCandidates.map((worktree) => {
        const path = text(first(worktree, ["path", "worktreePath"]), "");
        const branch = text(first(worktree, ["gitBranch", "branch"]), "detached");
        return `<option value="${escapeHtml(path)}">${escapeHtml(branch)} · ${escapeHtml(path)}</option>`;
      }),
    ].join("");
    $("#task-assign-form").hidden = settled || verifying;
    $("#task-correct-form").hidden = settled;
    $("#task-result-form").hidden = settled || verifying;
    $("#task-reopen-form").hidden = !settled;
    $("#task-accept-actions").hidden = !verifying;
    for (const id of [
      "task-assign-actor",
      "task-correct-actor",
      "task-reopen-actor",
    ]) {
      const control = $(`#${id}`);
      if (
        document.activeElement !== control
        && task.nextActor !== "none"
        && [...control.options].some((option) => option.value === task.nextActor)
      ) {
        control.value = task.nextActor;
      }
      control.disabled = state.taskActionPending;
    }
    detailPanel.querySelectorAll("button, textarea, select").forEach((control) => {
      control.disabled = state.taskActionPending;
    });
    $("#task-rebind-worktree-submit").disabled =
      state.taskActionPending || $("#task-rebind-worktree").value.length === 0;
    const latestResultVerification = first(
      detail,
      ["latestResultVerification"],
      { standing: "none" },
    );
    const resultStanding = text(
      first(latestResultVerification, ["standing"]),
      "none",
    );
    const acceptButton = $("#task-accept-button");
    acceptButton.textContent =
      resultStanding === "verified-current"
        ? "接受已验证的本地结果"
        : resultStanding === "unverified-agent-claim"
          ? "接受未验证的 Agent 声明"
          : resultStanding === "runtime-evidence-unavailable"
            ? "运行时验证已失效"
            : "接受本地任务结果";
    acceptButton.disabled =
      state.taskActionPending
      || (verifying && resultStanding === "runtime-evidence-unavailable");
    $("#task-accept-boundary").textContent =
      resultStanding === "verified-current"
        ? "运行时 selector 当前仍精确；此动作仍只接受 Workbench 本地任务。"
        : resultStanding === "runtime-evidence-unavailable"
          ? "当前运行时无法重新确认提交时的 selector；请纠正或重新提交。"
          : "只接受 Workbench 本地任务，不代表产品、Mission、提交、合并或发布接受。";
    renderTaskActionReceipt($("#local-task-action-result"), "mutation");
  }

  function renderTaskResultEvaluation(detail, task) {
    const claim = list(first(task, ["resultClaims"], [])).at(-1);
    const producer = $("#task-result-producer");
    if (claim === undefined) {
      producer.innerHTML = `
        <span>Producer result claim</span>
        <p class="empty-note">尚无结果声明。</p>
      `;
    } else {
      const evidence = first(claim, ["evidence"], {
        kind: "agent-references-unverified",
      });
      const evidenceKind = text(
        first(evidence, ["kind"]),
        "agent-references-unverified",
      );
      producer.innerHTML = `
        <header>
          <span>Producer result claim</span>
          <strong data-standing="${escapeHtml(text(first(claim, ["standing"]), "submitted"))}">${escapeHtml(text(first(claim, ["standing"]), "submitted"))}</strong>
        </header>
        <p>${escapeHtml(text(first(claim, ["summary"]), "未提供摘要"))}</p>
        <dl class="local-task-facts">
          <div><dt>Claim</dt><dd>${escapeHtml(text(first(claim, ["id"]), "—"))}</dd></div>
          <div><dt>Evidence class</dt><dd>${escapeHtml(evidenceKind)}</dd></div>
          <div><dt>Producer source</dt><dd>${escapeHtml(text(first(claim, ["sourceRef"]), "—"))}</dd></div>
          <div><dt>Submitted</dt><dd>${escapeHtml(formatTime(text(first(claim, ["submittedAt"]), ""), "—"))}</dd></div>
        </dl>
        <ul class="task-result-refs">${list(first(claim, ["evidenceRefs"], []))
          .map((reference) => `<li>${escapeHtml(reference)}</li>`)
          .join("")}</ul>
      `;
    }

    const reviews = list(first(detail, ["resultReviews"], []));
    const reviewHistory = $("#task-result-reviews");
    reviewHistory.innerHTML = reviews.length === 0
      ? `<div class="task-result-layer task-result-review">
          <span>Independent review history</span>
          <p class="empty-note">尚无结构化独立审查。</p>
        </div>`
      : reviews.map(renderTaskResultReview).join("");
  }

  function renderTaskResultReview(projected) {
    const assessment = first(projected, ["assessment"], {});
    const claim = first(projected, ["claim"], {});
    const candidate = first(assessment, ["candidate"], {});
    const independence = first(assessment, ["independence"], {});
    const freshness = first(projected, ["freshness"], {});
    const freshnessStanding = text(first(freshness, ["standing"]), "unavailable");
    const independenceStanding = text(
      first(projected, ["independence"]),
      "independence-unproven",
    );
    const observedHead = text(first(freshness, ["observedHead"]), "");
    const freshnessReason = text(first(freshness, ["reason"]), "");
    const latest = first(claim, ["latest"]) === true;
    return `
      <article class="task-result-layer task-result-review" data-claim-standing="${escapeHtml(text(first(claim, ["standing"]), "unknown"))}" data-current-claim="${latest}">
        <header>
          <span>${latest ? "Current claim review" : "Historical claim review"}</span>
        <strong data-verdict="${escapeHtml(text(first(assessment, ["verdict"]), "failed"))}">${escapeHtml(text(first(assessment, ["verdict"]), "failed"))}</strong>
        </header>
        <div class="task-review-claim-owner">
          <span>Owned by result claim</span>
          <strong>${escapeHtml(text(first(claim, ["id"]), "—"))}</strong>
          <small>${escapeHtml(text(first(claim, ["standing"]), "unknown"))} · submitted ${escapeHtml(formatTime(text(first(claim, ["submittedAt"]), ""), "—"))}</small>
          <p>${escapeHtml(text(first(claim, ["summary"]), "未提供 claim 摘要"))}</p>
        </div>
        <dl class="local-task-facts">
          <div><dt>Reviewer</dt><dd>${escapeHtml(text(first(assessment, ["reviewerRef"]), "—"))}</dd></div>
          <div><dt>Assessment</dt><dd>${escapeHtml(text(first(assessment, ["id"]), "—"))}</dd></div>
          <div><dt>Candidate · git-commit</dt><dd>${escapeHtml(text(first(candidate, ["commit"]), "—"))}</dd></div>
          <div><dt>Producer attempt</dt><dd>${escapeHtml(text(first(assessment, ["producerAttemptId"]), "未声明"))}</dd></div>
          <div><dt>Independence</dt><dd>${escapeHtml(independenceStanding)} · ${escapeHtml(text(first(independence, ["sourceRef"]), "—"))}</dd></div>
          <div><dt>Freshness</dt><dd>${escapeHtml(freshnessStanding)}${observedHead ? ` · HEAD ${escapeHtml(observedHead)}` : ""}${freshnessReason ? ` · ${escapeHtml(freshnessReason)}` : ""}</dd></div>
          <div><dt>Reviewed</dt><dd>${escapeHtml(formatTime(text(first(assessment, ["reviewedAt"]), ""), "—"))}</dd></div>
          <div><dt>Claim binding</dt><dd>${escapeHtml(text(first(assessment, ["resultClaimId"]), "—"))}</dd></div>
        </dl>
        <div class="task-review-findings">
          <span>Findings</span>
          <ul>${list(first(assessment, ["findings"], []))
            .map((finding) => `<li>${escapeHtml(finding)}</li>`)
            .join("")}</ul>
        </div>
        <details class="task-attempt-sources">
          <summary>Review evidence refs</summary>
          <ul class="task-result-refs">${list(first(assessment, ["evidenceRefs"], []))
            .map((reference) => `<li>${escapeHtml(reference)}</li>`)
            .join("")}</ul>
        </details>
      </article>
    `;
  }

  function renderTaskAttempts(detail) {
    const attempts = first(detail, ["attempts"]);
    const summary = $("#local-task-attempts-summary");
    const panel = $("#local-task-attempts");
    if (attempts === null || attempts === undefined) {
      summary.hidden = false;
      summary.dataset.standing = "unavailable";
      summary.textContent = "运行尝试来源未投影。";
      panel.innerHTML = "";
      return;
    }
    if (first(attempts, ["standing"]) === "unavailable") {
      summary.hidden = false;
      summary.dataset.standing = "unavailable";
      const reason = text(first(attempts, ["reason"]), "原因未声明");
      const sourceRef = text(first(attempts, ["sourceRef"]), "来源未声明");
      summary.textContent = `运行尝试来源不可用：${reason}`;
      panel.innerHTML =
        `<p class="empty-note">尝试来源：${escapeHtml(sourceRef)}</p>`;
      return;
    }
    const attemptList = list(first(attempts, ["attempts"], []));
    if (attemptList.length === 0) {
      summary.hidden = false;
      summary.dataset.standing = "none";
      summary.textContent = "尚无运行尝试";
      panel.innerHTML = "";
      return;
    }
    summary.dataset.standing = "available";
    summary.hidden = true;
    panel.innerHTML = attemptList.map(renderTaskAttempt).join("");
  }

  function renderTaskAttempt(attempt) {
    const statusCopy = {
      recorded: "recorded · 已记录",
      started: "started · 未见 settlement",
      "runner-failed": "runner-failed · Runner 失败",
      invalid: "invalid · 证据无效",
    };
    const status = text(first(attempt, ["status"]), "invalid");
    const attemptId = text(first(attempt, ["attemptId"]), "未识别 attempt");
    const startedAt = formatTime(text(first(attempt, ["startedAt"]), ""), "时间未知");
    const settledAt = text(first(attempt, ["settledAt"]), "");
    const requestedSession = text(first(attempt, ["requestedSession"]), "");
    const evidence = first(attempt, ["evidence"], {});
    const evidenceSources = [
      ["attempt", "A", "Attempt"],
      ["finalRecord", "F", "Work Cell final"],
      ["settlement", "S", "Settlement"],
    ];
    const evidenceRows = evidenceSources.map(([key, mark, label]) => {
      const standing = text(first(first(evidence, [key], {}), ["standing"]), "unavailable");
      const error = text(first(first(evidence, [key], {}), ["error"]), "");
      return `
        <li data-source="${escapeHtml(key)}" data-standing="${escapeHtml(standing)}">
          <span>${escapeHtml(mark)}</span>
          <div>
            <strong>${escapeHtml(label)}</strong>
            <small>${escapeHtml(standing)}${error ? ` · ${escapeHtml(error)}` : ""}</small>
          </div>
        </li>
      `;
    }).join("");
    const finalStanding = text(
      first(first(evidence, ["finalRecord"], {}), ["standing"]),
      "unavailable",
    );
    const observedFacts = finalStanding === "available"
      ? `
        <dl class="local-task-facts task-attempt-observed">
          <div><dt>Cell 状态</dt><dd>${escapeHtml(text(first(attempt, ["cellStatus"]), "未投影"))}</dd></div>
          <div><dt>观察到 session</dt><dd>${escapeHtml(text(first(attempt, ["observedSession"]), "未投影"))}</dd></div>
          <div><dt>Usage</dt><dd>${renderTaskAttemptUsage(first(attempt, ["usage"]))}</dd></div>
          <div><dt>Workspace diff</dt><dd>${renderTaskAttemptDiff(first(attempt, ["workspaceDiff"]))}</dd></div>
          <div><dt>Work Cell 验证（机械）</dt><dd>${renderTaskAttemptVerification(first(attempt, ["verification"]))}</dd></div>
        </dl>
      `
      : "";
    return `
      <article class="local-task-history-entry task-attempt" data-status="${escapeHtml(status)}" data-attempt="${escapeHtml(attemptId)}">
        <header>
          <span class="task-attempt-status">${escapeHtml(statusCopy[status] || status)}</span>
          <span class="task-attempt-time">
            ${escapeHtml(startedAt)}${settledAt ? ` · 已结算 ${escapeHtml(formatTime(settledAt, settledAt))}` : ""}
          </span>
        </header>
        <dl class="local-task-facts task-attempt-facts">
          <div><dt>Attempt</dt><dd>${escapeHtml(attemptId)}</dd></div>
          ${modelFact(attempt, "driver", "请求 driver")}
          ${modelFact(attempt, "model", "请求 model")}
          ${modelFact(attempt, "reasoningEffort", "请求推理强度")}
          ${modelFact(attempt, "taskRevision", "Task 修订")}
          ${modelFact(attempt, "sourceRevision", "Source 修订")}
          <div><dt>请求 session</dt><dd>${escapeHtml(requestedSession || "未请求 · 新 session")}</dd></div>
        </dl>
        ${observedFacts}
        <div class="task-attempt-evidence">
          <span>Evidence standing</span>
          <ul class="execution-evidence-layers">${evidenceRows}</ul>
        </div>
        <details class="task-attempt-sources">
          <summary>Stable source refs</summary>
          <dl class="local-task-facts task-attempt-refs">
            <div><dt>inputRef</dt><dd>${escapeHtml(text(first(attempt, ["inputRef"]), "—"))}</dd></div>
            <div><dt>attemptRef</dt><dd>${escapeHtml(text(first(attempt, ["attemptRef"]), "—"))}</dd></div>
            <div><dt>finalRecordRef</dt><dd>${escapeHtml(text(first(attempt, ["finalRecordRef"]), "—"))}</dd></div>
            <div><dt>settlementRef</dt><dd>${escapeHtml(text(first(attempt, ["settlementRef"]), "—"))}</dd></div>
          </dl>
        </details>
      </article>
    `;
  }

  function modelFact(attempt, key, label) {
    const value = text(first(attempt, [key]), "");
    return value ? `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>` : "";
  }

  function renderTaskAttemptUsage(usage) {
    if (usage === null || usage === undefined) return "未投影";
    const input = text(first(usage, ["inputTokens"]), "—");
    const output = text(first(usage, ["outputTokens"]), "—");
    const cached = text(first(usage, ["cachedInputTokens"]), "—");
    const total = text(first(usage, ["totalTokens"]), "—");
    return `in ${escapeHtml(input)} · out ${escapeHtml(output)} · cached ${escapeHtml(cached)} · total ${escapeHtml(total)}`;
  }

  function renderTaskAttemptDiff(diff) {
    if (diff === null || diff === undefined) return "未投影";
    const added = list(first(diff, ["added"], []));
    const changed = list(first(diff, ["changed"], []));
    const removed = list(first(diff, ["removed"], []));
    const renderPaths = (paths) => paths.map((path) => escapeHtml(path)).join(", ");
    const parts = [];
    if (added.length) parts.push(`+${added.length} · ${renderPaths(added)}`);
    if (changed.length) parts.push(`~${changed.length} · ${renderPaths(changed)}`);
    if (removed.length) parts.push(`−${removed.length} · ${renderPaths(removed)}`);
    return parts.length ? parts.join("；") : "无改动";
  }

  function renderTaskAttemptVerification(verification) {
    if (verification === null || verification === undefined) return "未投影";
    const passed = first(verification, ["passed"]);
    const terminal = first(first(verification, ["terminal"], {}), ["passed"]);
    const standing = (value) => value === true
      ? "通过"
      : value === false
        ? "未通过"
        : "未投影";
    return `整体 ${standing(passed)} · terminal ${standing(terminal)}`;
  }

  function renderTaskCreateWorktrees() {
    const projectId = $("#task-create-project").value;
    const label = $("#task-create-worktree-label");
    const select = $("#task-create-worktree");
    const retained = select.value;
    const project = projects().find(
      (candidate) =>
        text(first(first(candidate, ["identity"], {}), ["id"]), "") === projectId,
    );
    const worktrees = project ? projectWorktrees(project) : [];
    label.hidden = projectId === "";
    select.innerHTML = [
      '<option value="">仅关联项目</option>',
      ...worktrees.map((worktree) => {
        const path = text(first(worktree, ["path"]), "");
        const branch = text(first(worktree, ["gitBranch", "branch"]), "detached");
        return `<option value="${escapeHtml(path)}">${escapeHtml(branch)} · ${escapeHtml(path)}</option>`;
      }),
    ].join("");
    if ([...select.options].some((option) => option.value === retained)) {
      select.value = retained;
    }
  }

  function renderTaskCreateMissions() {
    const projectId = $("#task-create-project").value;
    const label = $("#task-create-mission-label");
    const select = $("#task-create-mission");
    const retained = select.value;
    const project = projects().find(
      (candidate) =>
        text(first(first(candidate, ["identity"], {}), ["id"]), "") === projectId,
    );
    const missions = project ? projectMissions(project) : [];
    label.hidden = projectId === "";
    select.innerHTML = [
      '<option value="">仅关联项目</option>',
      ...missions.map((mission) => {
        const id = identifier(mission, "");
        const title = text(first(mission, ["title"]), id);
        return `<option value="${escapeHtml(id)}">${escapeHtml(title)} · ${escapeHtml(id)}</option>`;
      }),
    ].join("");
    if ([...select.options].some((option) => option.value === retained)) {
      select.value = retained;
    }
  }

  function renderTaskActionReceipt(target, kind) {
    const receipt = state.taskActionReceipt;
    target.className = "action-result";
    if (state.taskActionPending) {
      target.textContent = "任务动作正在提交，等待权威任务源回执。";
      return;
    }
    if (receipt === null || receipt.kind !== kind) {
      target.textContent = "";
      return;
    }
    if (receipt.phase === "failed") target.classList.add("is-error");
    else target.classList.add("is-success");
    target.textContent = receipt.message;
  }

  function renderAttention() {
    const items = classifyWorkbenchAttention(workItems()).principal;
    const primaryAttention = items[0];
    const primaryAttentionCode = text(first(primaryAttention, ["attentionCode"]), "");
    $("#attention-count").textContent = String(items.length);
    $("#summary-attention").textContent = items.length
      ? `${items.length} 项待你处理`
      : "当前没有待关注事项";
    $("#summary-attention-detail").textContent = items.length
      ? primaryAttentionCode === "runner-anchor-migration-decision"
        ? "Intent Anchor 迁移等待 AUTHORIZE MIGRATION / HOLD"
        : text(first(primaryAttention, ["title", "summary"]), "打开待我处理查看。")
      : "当前没有下一责任方是你的事项";
    const container = $("#attention-list");

    if (!items.length) {
      container.innerHTML = '<li class="empty-note">当前没有下一责任方是你的事项。</li>';
      return;
    }

    container.innerHTML = items
      .map((item) => `
          <li>
            <button
              class="attention-item"
              type="button"
              data-work-item-id="${escapeHtml(item.id)}"
              data-severity="${item.consequence === "high" ? "critical" : "warning"}"
            >
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.summary)}</span>
            </button>
          </li>
        `)
      .join("");
    bindWorkItemRows(container);
  }

  function renderProjects() {
    const items = projects();
    $("#project-count").textContent = String(items.length);
    const container = $("#project-list");

    if (!items.length) {
      container.innerHTML = '<li class="empty-note">没有可用项目。未注册不等于项目不存在。</li>';
      return;
    }

    container.innerHTML = items
      .map((project, index) => {
        const id = identifier(project, `project-${index}`);
        const missionCount = projectMissions(project).length;
        const projectAttention = attentionItems().some(
          (item) => text(first(item, ["projectKey", "projectId", "project"]), "") === id,
        );
        const status = projectAttention
          ? "needs-attention"
          : first(project, ["registration"]) === "observed-unregistered"
            ? "unregistered"
            : projectWorktrees(project).length > 0
              ? "observed"
              : normalizeMode(first(project, ["status", "state"], "unknown"));
        const statusLabel = modeCopy[status]?.label || status;
        return `
          <li>
            <button
              class="project-button ${id === state.selectedProjectId ? "is-selected" : ""}"
              type="button"
              data-project-id="${escapeHtml(id)}"
            >
              <span class="project-row">
                <strong>${escapeHtml(projectName(project))}</strong>
                <span class="project-state ${["interrupted", "failed", "needs-attention"].includes(status) ? "needs-attention" : ""}">
                  ${escapeHtml(statusLabel)}
                </span>
              </span>
              <span>${missionCount} Missions · ${escapeHtml(first(project, ["primaryWorkspace", "path", "workspacePath", "workspace"], "位置未验证"))}</span>
            </button>
          </li>
        `;
      })
      .join("");

    $$(".project-button").forEach((button) => {
      button.addEventListener("click", () => {
        clearActionReceipt();
        state.unavailableLocus = null;
        state.selectedProjectId = button.dataset.projectId;
        state.selectedMissionId = null;
        state.selectedWorktreeId = null;
        state.activeView = "project";
        state.peekOpen = false;
        state.taskCreateOpen = false;
        ensureSelections();
        render();
        writePrincipalLocus();
      });
    });
  }

  function renderProjectSurface() {
    const project = selectedProject();
    if (!project) {
      $("#candidate-evidence").hidden = true;
      $("#project-title").textContent = "选择一个项目";
      $("#project-path").textContent = "项目事实、Mission 与工作现场会显示在这里。";
      $("#mainline-ref").textContent = "—";
      $("#mainline-head").textContent = "HEAD 未知";
      $("#mainline-name").textContent = "尚未选择项目";
      $("#mainline-description").textContent = "所有分支最终必须在证据充分后回到这里。";
      $("#mainline-status").textContent = "未观察";
      $("#mission-list").innerHTML = '<div class="surface-empty"><span>—</span><p>等待项目运行关系。</p></div>';
      return;
    }

    const primaryWorktree =
      projectWorktrees(project).find((worktree) => first(worktree, ["registeredPrimary"]) === true) ||
      projectWorktrees(project)[0];
    const mainline = first(project, ["mainline", "defaultBranch"], {});
    const mainlineObject = typeof mainline === "object" ? mainline : { branch: mainline };
    const displayName = projectName(project);
    const branch = text(
      first(mainlineObject, ["branch", "ref", "name"]) ||
        first(primaryWorktree, ["gitBranch", "branch"]),
      "mainline 未知",
    );
    const head = text(
      first(mainlineObject, ["head", "headSha", "sha"]) ||
        first(primaryWorktree, ["head", "headSha", "sha"]),
      "未知",
    );

    $("#project-title").textContent = displayName;
    $("#project-path").textContent = text(first(project, ["primaryWorkspace", "path", "workspacePath", "workspace"]), "项目位置未验证");
    $("#mainline-ref").textContent = branch;
    $("#mainline-head").textContent = `HEAD ${head}`;
    $("#mainline-name").textContent = `${displayName} / ${branch}`;
    $("#mainline-description").textContent = text(
      first(mainlineObject, ["description", "returnCondition"]),
      "所有 Mission 分支最终必须在证据充分后回到这里。",
    );
    $("#mainline-status").textContent =
      first(primaryWorktree, ["registeredPrimary"]) === true
        ? "已注册主现场 · Git 观察"
        : "已观察 · 主现场未验证";

    renderWorktreeInventory(project);
    renderCandidateEvidence(project);

    const missions = projectMissions(project);
    const container = $("#mission-list");
    if (!missions.length) {
      container.innerHTML = '<div class="surface-empty"><span>—</span><p>此项目没有声明可观察的 Mission。</p></div>';
      return;
    }

    container.innerHTML = missions
      .map((mission, missionIndex) => {
        const id = identifier(mission, `mission-${missionIndex}`);
        const missionRunner = runnerForMission(project, mission);
        const runnerMode = missionRunner
          ? runnerPresentation(missionRunner).mode
          : undefined;
        const missionStanding =
          first(mission, ["status", "state", "mode"]) ||
          first(first(mission, ["mainline"], {}), ["status"]);
        const mode = runnerMode
          ? normalizeMode(runnerMode)
          : missionStanding === "active"
            ? "mission-active"
            : normalizeMode(missionStanding || "unknown");
        const worktrees = missionWorktrees(project, mission);
        const title = first(mission, ["title", "name", "objective"], id);
        const mainline = first(mission, ["mainline"], {});
        const objective = first(
          mission,
          ["objective", "description", "returnCondition"],
          first(mainline, ["contradiction"], "目标与返回条件未投影。"),
        );
        return `
          <article class="mission-record ${id === state.selectedMissionId ? "is-selected" : ""}">
            <div class="mission-index">${String(missionIndex + 1).padStart(2, "0")}</div>
            <div class="mission-content">
              <button class="mission-button" type="button" data-mission-id="${escapeHtml(id)}">
                <span>
                  <h4>${escapeHtml(title)}</h4>
                  <p>${escapeHtml(objective)}</p>
                </span>
                <span class="mission-state" data-mode="${escapeHtml(mode)}">
                  ${escapeHtml(modeCopy[mode]?.label || mode)}
                </span>
              </button>
              ${
                worktrees.length
                  ? `<div class="worktree-list">
                      ${worktrees
                        .map((worktree, worktreeIndex) => {
                          const worktreeId = identifier(worktree, `worktree-${worktreeIndex}`);
                          const binding = normalizeMode(first(worktree, ["binding", "bindingStatus", "status"], "unverified"));
                          const dirty = first(worktree, ["dirty", "isDirty"]);
                          return `
                            <button
                              class="worktree-button ${id === state.selectedMissionId && worktreeId === state.selectedWorktreeId ? "is-selected" : ""}"
                              type="button"
                              data-mission-id="${escapeHtml(id)}"
                              data-worktree-id="${escapeHtml(worktreeId)}"
                            >
                              <span class="worktree-primary">
                                <strong>${escapeHtml(first(worktree, ["name", "gitBranch", "branch", "path"], worktreeId))}</strong>
                                <span>${escapeHtml(first(worktree, ["path", "workspacePath"], "位置未验证"))}</span>
                              </span>
                              <span class="worktree-meta">
                                <span>${escapeHtml(first(worktree, ["gitBranch", "branch", "ref"], "detached"))} @ ${escapeHtml(first(worktree, ["head", "headSha", "sha"], "?"))}</span>
                                <span>${dirty === true ? "dirty" : dirty === false ? "clean" : "status ?"}</span>
                              </span>
                              <span class="worktree-meta">${binding === "observed" || binding === "verified" ? "已观察绑定" : binding === "observation-only" ? "读取现场 · 非绑定" : "未验证绑定"}</span>
                            </button>
                          `;
                        })
                        .join("")}
                    </div>`
                  : '<p class="binding-unknown">未观察到与此 Mission 绑定的 worktree；这不等于它没有工作现场。</p>'
              }
            </div>
          </article>
        `;
      })
      .join("");

    $$(".mission-button").forEach((button) => {
      button.addEventListener("click", () => {
        clearActionReceipt();
        state.unavailableLocus = null;
        state.selectedMissionId = button.dataset.missionId;
        state.selectedWorktreeId = null;
        ensureSelections();
        const item = workItems().find(
          (candidate) =>
            candidate.projectKey === state.selectedProjectId
            && candidate.missionId === state.selectedMissionId,
        );
        state.selectedWorkItemId = item?.id ?? null;
        state.peekOpen = item !== undefined;
        render();
        writePrincipalLocus();
      });
    });

    $$(".worktree-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.selectedMissionId = button.dataset.missionId;
        state.selectedWorktreeId = button.dataset.worktreeId;
        const item = workItems().find(
          (candidate) =>
            candidate.projectKey === state.selectedProjectId
            && candidate.missionId === state.selectedMissionId,
        );
        state.selectedWorkItemId = item?.id ?? null;
        state.peekOpen = item !== undefined;
        render();
        writePrincipalLocus();
      });
    });
  }

  function renderWorktreeInventory(project) {
    const container = $("#worktree-inventory-list");
    const worktrees = projectWorktrees(project);
    if (!worktrees.length) {
      container.innerHTML = '<p class="empty-note">尚未观察到 Git worktree。</p>';
      return;
    }
    container.innerHTML = worktrees
      .map((worktree, index) => {
        const id = identifier(worktree, `worktree-${index}`);
        const branch = text(first(worktree, ["gitBranch", "branch"]), "detached");
        const head = text(first(worktree, ["head", "headSha", "sha"]), "?");
        const primary = first(worktree, ["registeredPrimary"]) === true;
        const dirty = first(worktree, ["dirty"]) === true;
        return `
          <button
            class="inventory-worktree ${id === state.selectedWorktreeId ? "is-selected" : ""}"
            type="button"
            data-inventory-worktree="${escapeHtml(id)}"
          >
            <strong>${escapeHtml(branch)} @ ${escapeHtml(head)}</strong>
            <span>${primary ? "registered primary" : "additional worktree"} · ${dirty ? "dirty" : "clean"}</span>
            <span>${escapeHtml(first(worktree, ["path"], "位置未知"))}</span>
          </button>
        `;
      })
      .join("");
    $$("[data-inventory-worktree]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.selectedWorktreeId = button.dataset.inventoryWorktree;
        render();
        writePrincipalLocus();
      });
    });
  }

  function renderCandidateEvidence(project) {
    const surface = $("#candidate-evidence");
    const mission = selectedMission();
    const runner = runnerForMission(project, mission);
    const presentation = candidateEvidencePresentation(
      projectWorktrees(project),
      runnerActivity(runner),
      first(state.snapshot, ["generatedAt"]),
    );

    if (presentation.standing === "absent") {
      surface.hidden = true;
      surface.dataset.standing = "none";
      return;
    }

    surface.hidden = false;
    surface.dataset.standing = presentation.standing;
    if (presentation.standing === "unavailable") {
      $("#candidate-evidence-heading").textContent = "Candidate 证据不可归并";
      $("#candidate-evidence-standing").textContent = "拒绝推断";
      $("#candidate-evidence-conclusion").textContent = presentation.reason;
      $("#candidate-evidence-identity").textContent = "未形成精确绑定";
      $("#candidate-evidence-change").textContent = "未形成当前结论";
      $("#candidate-evidence-time").textContent = "未形成可信时间";
      $("#candidate-evidence-report").textContent = "未形成可信报告";
      $("#candidate-evidence-authority").textContent =
        "commit / merge / publish / product acceptance 均按 withheld 处理";
      return;
    }

    const candidate = presentation.candidate;
    $("#candidate-evidence-heading").textContent = presentation.headline;
    $("#candidate-evidence-standing").textContent = "CURRENT EVIDENCE";
    $("#candidate-evidence-conclusion").textContent = presentation.conclusion;
    $("#candidate-evidence-identity").textContent =
      `${candidate.branch} @ ${candidate.head}\n${candidate.path}`;
    $("#candidate-evidence-change").textContent = presentation.changedPaths.length
      ? presentation.changedPaths.join("\n")
      : "未记录 changed-from-failed-subject 路径";
    $("#candidate-evidence-time").textContent = [
      `correction ${formatTime(presentation.recordedAt)}`,
      presentation.observedAt
        ? `projection ${formatTime(presentation.observedAt)}`
        : "projection time 未投影",
    ].join("\n");
    $("#candidate-evidence-report").textContent =
      `${presentation.reportRef}\nsha256 ${presentation.reportDigest}`;
    $("#candidate-evidence-authority").textContent = presentation.boundary;
  }

  function targetObject() {
    const project = selectedProject();
    const mission = selectedMission();
    const worktree = selectedWorktree();
    const runner = selectedRunner();
    const status = runnerStatus(runner);
    return {
      projectId: project ? identifier(project, "") : null,
      missionId: mission ? identifier(mission, "") : null,
      worktreeId: worktree ? identifier(worktree, "") : null,
      worktreePath: worktree ? first(worktree, ["path", "workspacePath"], null) : null,
      runnerId: runner
        ? identifier(status, "")
        : worktree
          ? first(worktree, ["runnerId"], null)
          : mission
            ? first(mission, ["runnerId"], null)
            : null,
      runnerState: runner ? normalizeMode(runnerPresentation(runner).mode) : null,
      runnerLive: runner ? first(runner, ["live"]) === true : false,
    };
  }

  function renderTarget() {
    const project = selectedProject();
    const mission = selectedMission();
    const worktree = selectedWorktree();
    const runner = selectedRunner();
    const target = targetObject();
    const operationalRunner = runner ? runnerPresentation(runner) : null;
    const labels = [
      project ? projectName(project) : "—",
      mission ? text(first(mission, ["title", "name"]), target.missionId) : "—",
      worktree ? text(first(worktree, ["name", "gitBranch", "branch"]), target.worktreeId) : "未选择",
      runner ? identifier(runnerStatus(runner), "未识别") : text(target.runnerId, "未绑定"),
    ];
    $$("#target-address li b").forEach((node, index) => {
      node.textContent = labels[index];
      node.title = labels[index];
    });
    const targetLabels = $$("#target-address li span");
    if (targetLabels[2]) targetLabels[2].textContent = "Viewed Worktree";

    const hasProjectMission = Boolean(target.projectId && target.missionId);
    $("#target-state").textContent = hasProjectMission
      ? target.runnerId
        ? operationalRunner?.live === false
          ? "仅命中缓存 Runner 记录；载体不可达"
          : operationalRunner?.live === null
            ? "命中 Runner 缓存；当前观察者无法验证载体可达性"
          : target.runnerState === "anchor-pending"
            ? "命中 live 迁移载体；无授权 Anchor，普通动作禁用"
            : target.runnerState === "idle"
              ? "命中 live 空闲载体；无当前执行者或 runtime"
              : "动作命中 live Runner；Worktree 仅为浏览现场"
        : "Mission 已选；尚无精确 Runner"
      : "尚未选择现场";
    $("#summary-target").textContent = $("#target-state").textContent;
    $("#summary-address").textContent = [
      target.projectId,
      target.missionId,
      target.runnerId,
    ].filter(Boolean).join(" → ") || "Project → Mission → Runner";

    const actionPreview = [target.projectId, target.missionId, target.runnerId]
      .filter(Boolean)
      .join(" → ");
    const viewedWorktree = target.worktreeId ? ` ｜ 浏览 ${target.worktreeId}` : "";
    $("#action-target-preview").textContent =
      actionPreview ? `${actionPreview}${target.runnerState ? ` @ ${target.runnerState}` : ""}${viewedWorktree}` : "尚未选择动作目标";
  }

  function currentMode() {
    const runner = selectedRunner();
    const mission = selectedMission();
    if (runner) return normalizeMode(runnerPresentation(runner).mode);
    return normalizeMode(
      first(mission, ["status", "state", "mode"]) ||
        "unknown",
    );
  }

  function renderOperation() {
    const mission = selectedMission();
    const runner = selectedRunner();
    const status = runnerStatus(runner);
    const activity = runnerActivity(runner);
    const currentTurn = first(activity, ["currentTurn"]);
    const lastEvent = first(activity, ["lastEvent"]);
    const hasAuthoritativeActivity =
      Boolean(first(activity, ["source"])) &&
      (currentTurn !== undefined || (lastEvent && typeof lastEvent === "object"));
    const mode = currentMode();
    const runnerView = runner ? runnerPresentation(runner) : null;
    const correctionSettlementPending =
      runner ? verifiedCorrectionAwaitsSystemSettlement(runner) : false;
    const reconciliationBrief = reconciliationActionDecisionBriefPresentation(
      activity,
      runner,
      first(runner, ["anchorMigrationSource"]),
    );
    const reconciliationDecisionPending =
      reconciliationBrief.decisionable === true;
    const attentionLink = $("#snapshot-attention-link");
    const decisionNavLink = $("#decision-nav-link");
    const reconciliationNavLink = $("#reconciliation-nav-link");
    if (reconciliationDecisionPending) {
      attentionLink.href = "#reconciliation-action";
      decisionNavLink.href = "#reconciliation-action-lineage-history";
      decisionNavLink.textContent = "History";
      reconciliationNavLink.setAttribute("aria-current", "step");
    } else {
      attentionLink.href = mode === "anchor-pending"
        ? "#anchor-migration-brief"
        : "#principal-attention-heading";
      decisionNavLink.href = "#anchor-migration-brief";
      decisionNavLink.textContent = "Decision";
      reconciliationNavLink.removeAttribute("aria-current");
    }
    const copy = modeCopy[mode] || {
      label: mode,
      heading: text(mode),
      reason: "后端返回了尚未解释的运行模式；请查看原始证据。",
      owner: "未知",
    };

    $("#mode-signal").textContent = copy.label;
    $("#mode-signal").dataset.mode = mode;
    $("#operation-pulse").dataset.mode = mode;
    if (runnerView?.live === false) {
      $("#operation-heading").textContent =
        `载体不可达 · 缓存 ${text(runnerView.cachedMode)}`;
      $("#operation-reason").textContent =
        "runner live=false；持久化事件和验证证据仍可检查，但当前没有执行载体正在吸收输入。";
    } else if (runnerView?.live === null) {
      $("#operation-heading").textContent =
        `载体可达性未验证 · 缓存 ${text(runnerView.cachedMode)}`;
      $("#operation-reason").textContent =
        "当前观察边界无法证明载体正在运行或已经停止；缓存状态只供检查，不能授权动作或迁移决策。";
    } else if (reconciliationDecisionPending) {
      $("#operation-heading").textContent =
        "等待 Principal 决策 · watermark 1 调和";
      $("#operation-reason").textContent =
        "Correction 已验证；两次 no-environment Codex app-server Work Cell、OpenAI 外发和条件式 reconciliation 仍未授权。";
    } else if (mode === "anchor-pending" || mode === "idle") {
      $("#operation-heading").textContent = copy.heading;
      $("#operation-reason").textContent = copy.reason;
    } else if (hasAuthoritativeActivity) {
      const turnText =
        currentTurn && typeof currentTurn === "object"
          ? first(currentTurn, ["label", "summary", "turnId", "id", "state"])
          : currentTurn;
      $("#operation-heading").textContent = text(
        turnText,
        lastEvent ? eventLabel(lastEvent) : "事件流已连接，当前无活动 turn",
      );
      $("#operation-reason").textContent = text(
        first(lastEvent, ["summary"]),
        `权威活动来源：${text(first(activity, ["source"]), "event stream")}`,
      );
    } else {
      $("#operation-heading").textContent = `界面推断 · ${text(
        first(status, ["operation", "heading"]) ||
          first(mission, ["operation"]),
        copy.heading,
      )}`;
      $("#operation-reason").textContent = `activity 缺失；以下仅由状态枚举推断：${text(
        first(status, ["reason", "statusReason", "stopReason"]) ||
          first(mission, ["reason", "statusReason"]),
        copy.reason,
      )}`;
    }
    $("#decision-owner").textContent = text(
      reconciliationDecisionPending
        ? `Principal · ${reconciliationBrief.replyKey}`
        : correctionSettlementPending
        ? "Agent system · 待收束；无 Principal 新决策"
        : first(status, ["decisionOwner", "nextDecisionOwner"]) ||
          first(mission, ["decisionOwner", "nextDecisionOwner"]),
      runnerView?.live === false
        ? "载体不可达 · 无当前执行者"
        : runnerView?.live === null
          ? "载体可达性未验证 · 无动作授权"
        : `界面推断 · ${copy.owner}`,
    );
    $("#last-change").textContent = reconciliationDecisionPending
      ? `Reconciliation proposal · ${formatTime(
          first(activity, ["reconciliationAction", "proposal", "preparedAt"]),
          "时间未知",
        )}`
      : hasAuthoritativeActivity
      ? `${eventLabel(lastEvent)} · ${formatTime(first(lastEvent, ["at"]), "时间未知")}`
      : `界面推断 · ${text(first(status, ["updatedAt"]), "未观察")}`;
    const evidenceKind = first(lastEvent, ["evidenceKind"]);
    $("#evidence-state").textContent = reconciliationDecisionPending
      ? `proposal ${reconciliationBrief.proposalDigest.slice(0, 12)} · passed correction report bound`
      : hasAuthoritativeActivity
      ? evidenceKind
        ? `事件证据 · ${text(evidenceKind)}`
        : "事件已观察 · 未附验证证据"
      : "activity 缺失 · 无法判断";
    $("#summary-operation").textContent = $("#operation-heading").textContent;
    $("#summary-mode").textContent =
      `有监督 · ${copy.label} · ${$("#connection-label").textContent}`;
  }

  function renderIntentLineageGate() {
    const runner = selectedRunner();
    const activity = runnerActivity(runner);
    const lineage = first(activity, ["intentLineage"], {});
    const view = intentLineagePresentation(activity);
    const gate = $("#intent-lineage-gate");
    const blocked = view.blocksSemanticWork === true;
    gate.hidden = !runner || !blocked;
    if (gate.hidden) return;

    const standing = text(first(lineage, ["standing"]), "unavailable");
    $("#intent-lineage-standing").textContent = standing;
    $("#intent-lineage-standing").dataset.standing = standing;
    $("#intent-lineage-status").textContent =
      standing === "legacy-unanchored"
        ? "保留的 legacy history 尚未获得授权 Intent Anchor"
        : standing === "uninitialized"
          ? "空 timeline 尚未获得 initial Intent Anchor"
          : "Lineage 证据不可用或无效";
    $("#intent-lineage-history").textContent =
      standing === "legacy-unanchored"
        ? `${text(first(lineage, ["priorEventCount"]), "—")} Mission events\ndigest ${text(first(lineage, ["priorTimelineDigest"]), "—")}`
        : standing === "uninitialized"
          ? "0 Mission events · 不能冒充 legacy adoption target"
          : "完整 timeline 证明不可用；不从 recentEvents 或 runner cache 猜测";
    $("#intent-lineage-anchor").textContent = "none verified";
    $("#intent-lineage-reason").textContent =
      standing === "legacy-unanchored"
        ? "完整 Mission timeline 证明保留历史没有授权 anchor；旧 carrier 状态不能继续承载语义动作。"
        : standing === "uninitialized"
          ? "新的 Mission 必须先获得 initial anchor，才能开始语义工作。"
          : "无法证明当前 active anchor；系统按 fail-closed 保持普通动作禁用。";
    $("#intent-lineage-decision").textContent =
      standing === "legacy-unanchored"
        ? "需要一份单独的、绑定当前 runner/state 与 exact history digest 的 Principal migration action proposal；当前没有迁移行动被授权。"
        : "需要权威来源补齐或修复 lineage；当前没有 mutation action 被授权。";
    $("#intent-lineage-boundary").textContent =
      "只读 lineage 投影 · 普通输入/控制/恢复 blocked · 不写 timeline · 不授予外发、reconciliation、candidate write、commit、merge、publish 或 product acceptance";

    const brief = anchorMigrationDecisionBriefPresentation(
      activity,
      runner,
      first(runner, ["anchorMigrationSource"]),
    );
    const briefSurface = $("#anchor-migration-brief");
    briefSurface.hidden = brief.standing === "absent";
    if (briefSurface.hidden) return;
    const decisionable = brief.decisionable === true;
    $("#anchor-migration-standing").textContent = decisionable
      ? "PROPOSAL VIEW · READ-ONLY"
      : brief.standing.toUpperCase();
    $("#anchor-migration-invalid").hidden = decisionable;
    $("#anchor-migration-details").hidden = !decisionable;
    if (!decisionable) {
      $("#anchor-migration-invalid").textContent =
        `提案不可决策：${text(brief.reason, "证据不完整或已漂移")}。不展示迁移行动 reply key，也不产生任何授权。`;
      return;
    }
    $("#anchor-migration-recommendation").textContent = brief.recommendation;
    $("#anchor-migration-heading").textContent =
      brief.migrationPath === "legacy-compatibility-saga"
        ? "Legacy Intent Anchor 迁移授权"
        : "Atomic Intent Anchor 迁移授权";
    $("#anchor-migration-path").textContent =
      brief.migrationPath === "legacy-compatibility-saga"
        ? "ACTION AUTHORIZATION · 5-STEP SAGA · ONE-USE"
        : "ACTION AUTHORIZATION · ATOMIC PATH · ONE-USE";
    $("#anchor-migration-atomic-availability").textContent =
      brief.atomicAvailability;
    $("#anchor-migration-proposal").textContent =
      `${brief.proposalId}\ndigest ${brief.proposalDigest}`;
    $("#anchor-migration-target").textContent = brief.target;
    $("#anchor-migration-history").textContent = brief.history;
    $("#anchor-migration-anchor").textContent =
      `${brief.anchor.id} · ${brief.anchor.revision}\n${brief.anchor.statement}\n${brief.anchor.sourceRefs.join("\n")}`;
    $("#anchor-migration-source").textContent = brief.source;
    $("#anchor-migration-effects").replaceChildren(
      ...brief.effects.map((effect) => {
        const item = document.createElement("li");
        item.textContent = effect;
        return item;
      }),
    );
    const migrationSteps = $("#anchor-migration-steps");
    migrationSteps.replaceChildren(...brief.steps.map((step, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const label = document.createElement("code");
      label.textContent = step;
      item.append(number, label);
      return item;
    }));
    $("#anchor-migration-risk").textContent = brief.residualRisk;
    $("#anchor-migration-authorize-result").textContent =
      brief.options.AUTHORIZE_MIGRATION.immediateResult;
    $("#anchor-migration-authorize-tradeoff").textContent =
      brief.options.AUTHORIZE_MIGRATION.tradeoff;
    $("#anchor-migration-hold-result").textContent =
      brief.options.HOLD.immediateResult;
    $("#anchor-migration-hold-tradeoff").textContent =
      brief.options.HOLD.tradeoff;
    $("#anchor-migration-reply-key").textContent = brief.replyKey;
    $("#anchor-migration-authority").textContent = brief.boundary;
  }

  function renderReconciliationAction() {
    const runner = selectedRunner();
    const activity = runnerActivity(runner);
    const brief = reconciliationActionDecisionBriefPresentation(
      activity,
      runner,
      first(runner, ["anchorMigrationSource"]),
    );
    const surface = $("#reconciliation-action");
    surface.hidden = !runner || brief.standing === "absent";
    if (surface.hidden) return;

    const decisionable = brief.decisionable === true;
    $("#reconciliation-action-standing").textContent = decisionable
      ? "PROPOSAL VIEW · READ-ONLY"
      : brief.standing.toUpperCase();
    $("#reconciliation-action-summary").textContent = decisionable
      ? "Correction 已验证；下一步需要 Principal 精确授权两次 no-environment app-server Work Cell 与条件式 watermark 提交。"
      : text(brief.reason, "当前 reconciliation action 已离开待决策状态。");
    $("#reconciliation-action-invalid").hidden = decisionable;
    $("#reconciliation-action-details").hidden = !decisionable;
    if (!decisionable) {
      $("#reconciliation-action-invalid").textContent =
        `当前不可再次决策：${text(brief.reason, "证据不完整、已漂移或已被一次性决定消费")}。`;
      return;
    }

    $("#reconciliation-action-recommendation").textContent = brief.recommendation;
    $("#reconciliation-action-proposal").textContent =
      `${brief.proposalId}\ndigest ${brief.proposalDigest}`;
    $("#reconciliation-action-target").textContent = brief.target;
    $("#reconciliation-action-lineage").textContent = brief.lineage;
    $("#reconciliation-action-input").textContent = brief.input;
    $("#reconciliation-action-report").textContent = brief.report;
    $("#reconciliation-action-execution").textContent = brief.execution;
    $("#reconciliation-action-disclosure").textContent = brief.disclosure;
    $("#reconciliation-action-source").textContent = brief.source;
    $("#reconciliation-action-condition").textContent = brief.condition;
    $("#reconciliation-action-authority").textContent = brief.boundary;
    $("#reconciliation-action-settle-result").textContent =
      brief.options.SETTLE_CONTINUE.immediateResult;
    $("#reconciliation-action-settle-tradeoff").textContent =
      brief.options.SETTLE_CONTINUE.tradeoff;
    $("#reconciliation-action-reclassify-result").textContent =
      brief.options.RECLASSIFY_CORRECTION.immediateResult;
    $("#reconciliation-action-reclassify-tradeoff").textContent =
      brief.options.RECLASSIFY_CORRECTION.tradeoff;
    $("#reconciliation-action-hold-result").textContent =
      brief.options.HOLD.immediateResult;
    $("#reconciliation-action-hold-tradeoff").textContent =
      brief.options.HOLD.tradeoff;
    $("#reconciliation-action-reply-key").textContent = brief.replyKey;
  }

  function renderExecutionProposal() {
    const mission = selectedMission();
    const project = selectedProject();
    const proposal = first(mission, ["executionProposal"]);
    const authorization = first(mission, ["authorization"]);
    const view = executionProposalView(
      proposal,
      authorization,
    );
    const surface = $("#execution-proposal");
    if (view === null) {
      surface.hidden = true;
      return;
    }

    surface.hidden = false;
    surface.dataset.stage = normalizeMode(view.authorization.standing);
    $("#execution-proposal-heading").textContent = view.heading;
    $("#proposal-standing").textContent = view.status;
    $("#proposal-standing").dataset.status = normalizeMode(view.status);
    $("#proposal-contract-details").open = view.contractOpen;
    $("#proposal-not-started").textContent = view.notStartedReason;
    $("#proposal-identity").textContent =
      `${view.proposalId}\ndigest ${view.proposalDigest}`;
    $("#proposal-runtime").textContent = view.runtime;
    $("#proposal-disclosures").textContent = view.disclosures;
    $("#proposal-write-boundary").textContent = view.writeBoundary;
    $("#proposal-commands").textContent = view.commands;
    $("#proposal-budget").textContent = view.budgetLimits;
    $("#proposal-token-forecast").textContent = view.tokenForecast;
    $("#proposal-authority-label").textContent =
      view.authorization.standing === "awaiting-principal-authorization"
        ? "Proposal authority"
        : "Proposal authority · source record";
    $("#proposal-authority").textContent = view.authority;
    $("#proposal-authorization-standing").textContent = view.authorization.standing;
    $("#proposal-authorization-standing").dataset.status =
      normalizeMode(view.authorization.standing);
    $("#proposal-authorization").dataset.standing =
      normalizeMode(view.authorization.standing);
    $("#proposal-authorization-receipt").textContent = view.authorization.receipt;
    $("#proposal-authorized-choices").textContent = view.authorization.choices;
    $("#proposal-authorized-results").textContent =
      view.authorization.immediateAuthorizedResults;
    $("#proposal-authorized-boundary").textContent =
      view.authorization.authorityBoundary;
    $("#proposal-principal-action-evidence").textContent =
      view.authorization.interactionEvidence;
    $("#proposal-authorization-notice").textContent =
      view.authorization.orthogonalityNotice;

    $("#proposal-reply-key").textContent = view.compactReplyKey;
    $("#proposal-provider-name").textContent = view.authorization.standing ===
      "awaiting-principal-authorization"
      ? executionAuthorizationEligibility({
          source: state.source,
          project: {
            projectKey: project ? identifier(project, "") : "",
            registration: first(project, ["registration"]),
          },
          missionId: mission ? identifier(mission, "") : "",
          proposal,
          authorization,
          choices: {},
          acknowledgements: {},
          pending: state.authorizationPending,
        }).providerName
      : text(first(first(proposal, ["externalProvider"], {}), ["name"]), "外部 provider");

    const targetKey = executionAuthorizationTargetKey(project, mission, view);
    const draft = authorizationDraft(targetKey);
    $("#proposal-decision-list").innerHTML = view.decisions.length
      ? view.decisions
          .map((decision, decisionIndex) => {
            const decisionName = `proposal-decision-${decisionIndex}`;
            return `
              <fieldset class="proposal-decision">
                <legend>
                  <span>${escapeHtml(decision.id)}</span>
                  ${escapeHtml(decision.label)}
                </legend>
                <p>
                  提案推荐 <strong>${escapeHtml(decision.proposal)}</strong>；
                  推荐不会替你作出选择。
                </p>
                <div class="proposal-options">
                  ${decision.options
                    .map((option, optionIndex) => {
                      const inputId = `proposal-decision-${decisionIndex}-option-${optionIndex}`;
                      const resultId = `${inputId}-result`;
                      const tradeoffId = `${inputId}-tradeoff`;
                      const checked =
                        draft.choices[decision.id] === option.replyKey ? " checked" : "";
                      const recommendation = option.recommended
                        ? '<span class="proposal-option-recommendation">系统建议 · 仍需选择</span>'
                        : "";
                      return `
                        <label class="proposal-option${option.recommended ? " is-recommended" : ""}" for="${inputId}">
                          <input
                            id="${inputId}"
                            name="${decisionName}"
                            type="radio"
                            value="${escapeHtml(option.replyKey)}"
                            data-decision-id="${escapeHtml(decision.id)}"
                            aria-describedby="${resultId} ${tradeoffId}"
                            ${checked}
                          />
                          <span class="proposal-option-copy">
                            <span class="proposal-option-heading">
                              <strong>
                                <code>${escapeHtml(option.replyKey)}</code>
                                ${escapeHtml(option.label)}
                              </strong>
                              ${recommendation}
                            </span>
                            <span class="proposal-option-result" id="${resultId}">
                              <b>选择后的立即结果</b>
                              ${escapeHtml(option.immediateResult)}
                            </span>
                            <span class="proposal-option-tradeoff" id="${tradeoffId}">
                              <b>主要权衡</b>
                              ${escapeHtml(option.tradeoff)}
                            </span>
                          </span>
                        </label>
                      `;
                    })
                    .join("")}
                </div>
              </fieldset>
            `;
          })
          .join("")
      : '<p class="proposal-decision-empty">pendingDecisions 为空；不能签发启动授权。</p>';

    const acknowledgements = [
      ["#ack-external-disclosure", "externalDisclosure"],
      ["#ack-forecast-only-budget", "forecastOnlyBudget"],
      ["#ack-one-use-boundary", "oneUseLaunchAndIntegrationWithheld"],
    ];
    for (const [selector, key] of acknowledgements) {
      $(selector).checked = draft.acknowledgements[key] === true;
    }

    const form = $("#proposal-authorization-form");
    const alreadyAuthorized =
      view.authorization.standing === "authorized-awaiting-execution"
      || view.authorization.standing === "authorization-consumed";
    form.hidden = alreadyAuthorized;
    if (!alreadyAuthorized) {
      bindExecutionAuthorizationDraftInputs(
        project,
        mission,
        proposal,
        authorization,
        view,
        draft,
      );
      updateExecutionAuthorizationControls(
        project,
        mission,
        proposal,
        authorization,
        view,
        draft,
      );
    } else {
      const result = $("#proposal-authorization-result");
      result.className = "proposal-authorization-result is-success";
      result.textContent = view.authorization.standing === "authorization-consumed"
        ? "实时 claim projection 只证明一次 launch authority 已被消费。runner、effect、执行结果、集成与产品验收仍须各自证明。"
        : "实时回执投影只证明 receipt 仍匹配已提交 proposal。尚未自动启动 runner；runtime 源码将在 adapter 启动前重新哈希，effect 与集成权仍须各自证明。";
    }
  }

  function executionAuthorizationTargetKey(project, mission, view) {
    return [
      project ? identifier(project, "") : "",
      mission ? identifier(mission, "") : "",
      view.proposalId,
      view.proposalDigest,
    ].join("::");
  }

  function authorizationDraft(targetKey) {
    if (state.authorizationDraft?.targetKey !== targetKey) {
      state.authorizationDraft = {
        targetKey,
        ...createExecutionAuthorizationDraft(),
      };
    }
    return state.authorizationDraft;
  }

  function authorizationInput(
    project,
    mission,
    proposal,
    authorization,
    draft,
    requestId,
  ) {
    const proposalView = executionProposalView(proposal, authorization);
    const targetKey = proposalView === null
      ? ""
      : executionAuthorizationTargetKey(project, mission, proposalView);
    const receiptAwaitingProjection =
      state.authorizationSubmission?.targetKey === targetKey &&
      state.authorizationSubmission.phase === "accepted";
    return {
      source: state.source,
      project: {
        projectKey: project ? identifier(project, "") : "",
        registration: first(project, ["registration"]),
      },
      missionId: mission ? identifier(mission, "") : "",
      proposal,
      authorization,
      choices: draft.choices,
      acknowledgements: draft.acknowledgements,
      pending: state.authorizationPending || receiptAwaitingProjection,
      ...(requestId ? { requestId } : {}),
    };
  }

  function bindExecutionAuthorizationDraftInputs(
    project,
    mission,
    proposal,
    authorization,
    view,
    draft,
  ) {
    $$("#proposal-decision-list input[type='radio']").forEach((input) => {
      input.addEventListener("change", () => {
        clearExecutionAuthorizationOutcome(project, mission, view);
        if (input.checked) {
          draft.choices[input.dataset.decisionId] = input.value;
        }
        updateExecutionAuthorizationControls(
          project,
          mission,
          proposal,
          authorization,
          view,
          draft,
        );
      });
    });
    $$("#proposal-authorization-form input[name='acknowledgement']").forEach(
      (input) => {
        input.addEventListener("change", () => {
          clearExecutionAuthorizationOutcome(project, mission, view);
          draft.acknowledgements[input.value] = input.checked;
          updateExecutionAuthorizationControls(
            project,
            mission,
            proposal,
            authorization,
            view,
            draft,
          );
        });
      },
    );
  }

  function clearExecutionAuthorizationOutcome(project, mission, view) {
    if (
      ["failed", "uncertain", "unconfirmed"].includes(
        state.authorizationSubmission?.phase,
      ) &&
      state.authorizationSubmission.targetKey ===
        executionAuthorizationTargetKey(project, mission, view)
    ) {
      state.authorizationSubmission = null;
    }
  }

  function updateExecutionAuthorizationControls(
    project,
    mission,
    proposal,
    authorization,
    view,
    draft,
  ) {
    const eligibility = executionAuthorizationEligibility(
      authorizationInput(project, mission, proposal, authorization, draft),
    );
    const selectedDecisionCount = view.decisions.filter((decision) =>
      decision.options.some(
        (option) => draft.choices[decision.id] === option.replyKey,
      )
    ).length;
    $("#proposal-decision-count").textContent =
      `${selectedDecisionCount}/${view.decisions.length} 已选择`;
    const interactive = Boolean(
      state.source === "live" &&
        first(project, ["registration"]) === "registered" &&
        first(proposal, ["status"]) === "awaiting-principal-authorization" &&
        view.authorization.standing === "awaiting-principal-authorization" &&
        state.authorizationPending === false &&
        !(
          state.authorizationSubmission?.targetKey ===
            executionAuthorizationTargetKey(project, mission, view) &&
          state.authorizationSubmission.phase === "accepted"
        ),
    );
    $$("#proposal-authorization-form input").forEach((input) => {
      input.disabled = !interactive;
    });
    const button = $("#proposal-authorize-button");
    button.disabled = !eligibility.eligible;
    button.textContent = state.authorizationPending
      ? `正在签发 ${eligibility.providerName} 授权…`
      : eligibility.buttonLabel;
    $("#proposal-authorization-guidance").textContent = eligibility.reason;

    const result = $("#proposal-authorization-result");
    const targetKey = executionAuthorizationTargetKey(project, mission, view);
    const selectedProjectKey = project ? identifier(project, "") : "";
    const selectedMissionId = mission ? identifier(mission, "") : "";
    const submission = state.authorizationSubmission &&
      (state.authorizationSubmission.targetKey === targetKey ||
        (["failed", "uncertain", "unconfirmed"].includes(
          state.authorizationSubmission.phase,
        ) &&
          state.authorizationSubmission.projectKey === selectedProjectKey &&
          state.authorizationSubmission.missionId === selectedMissionId))
      ? state.authorizationSubmission
      : null;
    if (submission?.phase === "failed") {
      result.className = "proposal-authorization-result is-error";
      result.textContent = submission.message;
    } else if (
      submission?.phase === "uncertain" ||
      submission?.phase === "unconfirmed"
    ) {
      result.className = "proposal-authorization-result is-hold";
      result.textContent = submission.message;
    } else if (submission?.phase === "accepted") {
      result.className = "proposal-authorization-result is-success";
      result.textContent =
        "回执创建请求已接受，正在等待实时投影确认 authorized-awaiting-execution；runner 未自动启动。";
    } else if (state.authorizationPending) {
      result.className = "proposal-authorization-result";
      result.textContent =
        "正在创建一次 launch authorization receipt；不会自动启动 runner。";
    } else if (eligibility.state === "hold") {
      result.className = "proposal-authorization-result is-hold";
      result.textContent = eligibility.reason;
    } else {
      result.className = "proposal-authorization-result";
      result.textContent = "";
    }
  }

  function describeEffectTool(tool) {
    if (!tool) return "无 active tool";
    if (typeof tool !== "object") return text(tool);
    const name = text(first(tool, ["name", "toolName", "type"]), "unknown tool");
    const state = first(tool, ["state", "status", "outcome"]);
    const rawTarget =
      first(tool, ["path", "target", "cwd", "command"]) ||
      first(tool, ["argv"]);
    const target = Array.isArray(rawTarget) ? rawTarget.join(" ") : rawTarget;
    const when = first(tool, ["startedAt", "at", "finishedAt"]);
    return [
      name,
      state ? `· ${text(state)}` : "",
      target ? `\n${text(target)}` : "",
      when ? `\n${formatTime(when)}` : "",
    ].join(" ");
  }

  function describeVerification(value) {
    if (value === null || value === undefined) return "未观察";
    if (typeof value === "boolean") return value ? "passed" : "failed";
    if (typeof value !== "object") return text(value);
    const passed = first(value, ["passed"]);
    const stateValue =
      first(value, ["state", "status", "verdict", "standing"]) ??
      (typeof passed === "boolean" ? (passed ? "passed" : "failed") : "已投影");
    const summary = first(value, ["summary", "reason", "message"]);
    const evidenceRefs = list(first(value, ["evidenceRefs"], []));
    const normalizedState = text(stateValue).trim().toLowerCase();
    const claims =
      normalizedState === "passed"
        ? evidenceRefs
            .filter((ref) => typeof ref === "string" && ref.startsWith("claim:"))
            .map((ref) => ref.slice("claim:".length))
        : [];
    const subject = first(value, ["subject"]);
    const subjectFiles = list(first(subject, ["files"], []));
    const subjectHead = first(subject, ["gitHead"]);
    return [
      text(stateValue),
      ...(summary ? [text(summary)] : []),
      ...claims.map((claim) => `claim ${claim}`),
      ...(subjectHead
        ? [`bound ${subjectFiles.length} file(s) @ ${text(subjectHead).slice(0, 12)}`]
        : []),
    ].join(" · ");
  }

  function renderCurrentEffect() {
    const runner = selectedRunner();
    const activity = runnerActivity(runner);
    const effect = first(activity, ["currentEffect"]);
    const observer = $("#effect-observer");
    const authority = {
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    };

    if (!effect || typeof effect !== "object") {
      observer.dataset.standing = "none";
      $("#effect-heading").textContent = "当前无可证明的写入 Effect";
      $("#effect-standing").textContent = "未观察";
      $("#effect-phase").textContent = "currentEffect 未投影；不能从 runner running 推断正在写入";
      $("#effect-workspace").textContent = "未观察";
      $("#effect-scope").textContent = "写入边界未证明";
      $("#effect-tool").textContent = "未观察";
      $("#effect-diff").textContent = "未观察；project dirty 不能归因给本次 run";
      $("#effect-verification").textContent = "mechanical 未观察\nindependent 未观察\nprincipal 未接受";
      $("#effect-authority").textContent =
        "commit withheld · merge withheld · publish withheld";
      return;
    }

    const writer = first(effect, ["writer"], {});
    const source = first(effect, ["source"]);
    const workspace = first(effect, ["workspace"], {});
    const scope = first(effect, ["scope"], {});
    const diff = first(effect, ["diff"], {});
    const verification = first(effect, ["verification"], {});
    const projectedAuthority = first(effect, ["authority"], {});
    const outsideScope = list(first(diff, ["outsideScope"], []));
    const stale = first(effect, ["stale"]) === true;
    const uncertain = first(effect, ["uncertain"]) === true;
    const authorityConflict = Object.entries(authority).some(
      ([key, value]) => first(projectedAuthority, [key]) !== value,
    );
    const standing = outsideScope.length || authorityConflict
      ? "outside-scope"
      : stale
        ? "stale"
        : uncertain
          ? "uncertain"
          : "active";
    observer.dataset.standing = standing;
    $("#effect-heading").textContent = `Effect ${text(first(effect, ["effectId"]), "未识别")}`;
    $("#effect-standing").textContent =
      standing === "outside-scope"
        ? "边界异常"
        : standing === "stale"
          ? "stale"
          : standing === "uncertain"
            ? "uncertain"
            : "写入候选";
    const writerRef = first(writer, ["ref"]);
    $("#effect-phase").textContent = [
      text(first(effect, ["phase"]), "phase 未知"),
      writerRef
        ? `host writer ${text(writerRef)}`
        : `cell ${text(first(writer, ["cellId"]), "—")} / run ${text(first(writer, ["runId"]), "—")}`,
      ...(source && typeof source === "object"
        ? [`source cell ${text(first(source, ["cellId"]), "—")} / run ${text(first(source, ["runId"]), "—")}`]
        : []),
    ].join("\n");
    $("#effect-workspace").textContent =
      `${text(first(workspace, ["root"]), "root 未知")}\nbase ${text(first(workspace, ["baseHead"]), "未记录")} · baseline ${first(workspace, ["baselineClean"]) === true ? "clean" : first(workspace, ["baselineClean"]) === false ? "dirty" : "未知"}`;
    const writePaths = list(first(scope, ["writePaths"], []));
    const allowedCommands = list(first(scope, ["allowedCommands"], []));
    $("#effect-scope").textContent =
      `write ${writePaths.length ? writePaths.join(", ") : "none"}\ncommands ${allowedCommands.length ? allowedCommands.join(", ") : "none"}`;
    const recentTools = list(first(effect, ["recentTools"], []));
    $("#effect-tool").textContent =
      `${describeEffectTool(first(effect, ["currentTool"]))}\nrecent ${recentTools.length}`;
    const changed = list(first(diff, ["changed"], []));
    const added = list(first(diff, ["added"], []));
    const removed = list(first(diff, ["removed"], []));
    const patchRef = first(diff, ["patchRef"]);
    const patchDigest = first(diff, ["patchDigest"]);
    $("#effect-diff").textContent = [
      `changed ${changed.length}${changed.length ? `: ${changed.join(", ")}` : ""}`,
      `added ${added.length}${added.length ? `: ${added.join(", ")}` : ""}`,
      `removed ${removed.length}${removed.length ? `: ${removed.join(", ")}` : ""}`,
      patchRef ? `patch ${text(patchRef)}` : "patch 未保留",
      patchDigest ? `digest ${text(patchDigest)}` : "digest 未保留",
      outsideScope.length ? `OUTSIDE SCOPE: ${outsideScope.join(", ")}` : "outside scope: none",
    ].join("\n");
    $("#effect-verification").textContent =
      `mechanical ${describeVerification(first(verification, ["mechanical"]))}\nindependent ${describeVerification(first(verification, ["independent"]))}\nprincipal ${describeVerification(first(verification, ["principal"]))}`;
    $("#effect-authority").textContent = authorityConflict
      ? "authority projection conflict · treated as commit/merge/publish withheld"
      : "commit withheld · merge withheld · publish withheld";
  }

  function renderCorrectionMovement() {
    const runner = selectedRunner();
    const activity = runnerActivity(runner);
    const correction =
      first(activity, ["currentCorrection"]) ||
      list(first(activity, ["recentCorrections"], [])).at(-1);
    const observer = $("#correction-observer");

    if (!correction || typeof correction !== "object") {
      const activityError = first(activity, ["error"]);
      observer.dataset.standing = activityError ? "invalid" : "none";
      $("#correction-heading").textContent = activityError
        ? "Correction 投影不可用"
        : "当前无可证明的本地修正";
      $("#correction-standing").textContent = activityError ? "投影已拒绝" : "未观察";
      $("#correction-cause").textContent = "未观察";
      $("#correction-action").textContent = "未观察";
      $("#correction-attribution").textContent =
        "input actor / input source 未投影 · executor 未保留";
      $("#correction-verification").textContent = "未运行";
      $("#correction-report").textContent = "report 未投影";
      $("#correction-boundary").textContent = activityError
        ? `activity projection rejected · ${text(activityError)}`
        : "authority 与 disclosure 未投影";
      return;
    }

    const cause = first(correction, ["cause"], {});
    const scope = first(correction, ["scope"], {});
    const verification = first(correction, ["verification", "report"], {});
    const presentation = correctionPresentation(
      correction,
      first(activity, ["currentEffect"]),
    );
    const writePaths = list(
      first(scope, ["writePaths"]) || first(correction, ["changedPaths"], []),
    );
    const verdict = presentation.verdict;
    const reportRef =
      first(verification, ["reportRef", "ref", "sourcePath"]) ||
      first(correction, ["reportRef"]);
    const reportDigest =
      first(verification, ["reportDigest", "digest"]) ||
      first(correction, ["reportDigest"]);
    const causeEffect = first(cause, ["effectId"]) || first(correction, ["causedByEffectId"]);
    const standing = presentation.standing;

    observer.dataset.standing = standing;
    $("#correction-heading").textContent =
      `Correction ${text(first(correction, ["correctionId"]), "未识别")}`;
    $("#correction-standing").textContent =
      standing === "passed"
        ? "独立验证通过"
        : standing === "stale"
          ? "验证已过期 · 需重验"
        : standing === "failed"
          ? "独立验证失败"
          : standing === "invalid"
            ? "证据边界异常"
            : standing === "applied-unverified"
              ? "已修改 · 待验证"
              : "已记录 · 待行动";
    $("#correction-cause").textContent =
      `${text(causeEffect, "effect 未绑定")}\n${text(presentation.causeVerdict, "verdict 未投影")}`;
    $("#correction-action").textContent =
      `${writePaths.length ? writePaths.join(", ") : "write scope 未投影"}\n${text(first(correction, ["state"], "local"))}`;
    $("#correction-attribution").textContent =
      presentation.attribution;
    $("#correction-verification").textContent =
      standing === "stale" ? `${text(verdict)} · stale` : text(verdict, "未运行");
    $("#correction-report").textContent = [
      reportRef ? text(reportRef) : "report 未投影",
      reportDigest ? `sha256 ${text(reportDigest).slice(0, 16)}…` : "",
      presentation.executionEvidence,
    ].filter(Boolean).join("\n");
    $("#correction-boundary").textContent = presentation.boundary;
  }

  function renderEvidence() {
    const mission = selectedMission();
    const runner = selectedRunner();
    const activity = runnerActivity(runner);
    const worktree = selectedWorktree();
    const evidence = list(
      first(mission, ["evidence", "evidenceItems", "proof"]) ||
        first(runner, ["evidence", "evidenceItems"]),
    );
    const recentEvents = list(first(activity, ["recentEvents"], []));
    const eventCount = first(activity, ["eventCount"]);
    const activitySource = first(activity, ["source"]);
    const count = evidence.length;
    $("#evidence-summary").textContent = recentEvents.length
      ? `${recentEvents.length}/${text(eventCount, recentEvents.length)} 个运行事件`
      : activitySource
        ? `0/${text(eventCount, 0)} 个运行事件`
      : count
        ? `${count} 项可读证据`
        : "activity 未投影";

    if (!mission) {
      $("#evidence-content").innerHTML = '<p class="empty-note">选择 Mission 后查看可追溯证据。</p>';
      return;
    }

    const evidenceItems = evidence
      .map((item) => {
        if (typeof item !== "object") {
          return `<li><span>Evidence</span>${escapeHtml(item)}</li>`;
        }
        return `<li><span>${escapeHtml(first(item, ["label", "type", "name"], "Evidence"))}</span>${escapeHtml(first(item, ["value", "summary", "description", "ref"], "值未投影"))}</li>`;
      })
      .join("");
    const activityItems = recentEvents
      .map((event) => `
        <li>
          <span>${escapeHtml(eventLabel(event))} · ${escapeHtml(formatTime(first(event, ["at"]), "时间未知"))}</span>
          ${escapeHtml(first(event, ["summary"], "无事件摘要"))}
          ${first(event, ["evidenceKind"]) ? ` · 证据 ${escapeHtml(first(event, ["evidenceKind"]))}` : ""}
        </li>
      `)
      .join("");

    const raw = {
      mission,
      worktree: worktree || "not bound",
      runner: runner || "not observed",
    };
    $("#evidence-content").innerHTML = `
      ${
        recentEvents.length
          ? `<ul class="evidence-list">${activityItems}</ul>`
          : activitySource
            ? `<p class="empty-note">activity 来源 ${escapeHtml(activitySource)} 已连接；当前没有 recentEvents。</p>`
            : '<p class="empty-note">权威 activity 未投影；无法从 runner 状态重建最近发生了什么。</p>'
      }
      ${count ? `<ul class="evidence-list">${evidenceItems}</ul>` : '<p class="empty-note">没有结构化证据。原始投影不等于验证完成。</p>'}
      <pre class="raw-evidence">${escapeHtml(JSON.stringify(raw, null, 2))}</pre>
    `;
  }

  function renderActionForm() {
    const kind = state.actionKind;
    const mode = currentMode();
    const ordinaryInteractionBlocked = mode === "anchor-pending";
    $$(".kind-button").forEach((button) => {
      const selected = button.dataset.kind === kind;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.disabled = state.actionPending || ordinaryInteractionBlocked;
    });

    const isControl = kind === "control";
    const recoveryCapabilities = first(
      runnerStatus(selectedRunner()),
      ["recoveryCapabilities"],
      {},
    );
    const isRecovery = isControl && mode === "interrupted";
    const isUnsupported = kind === "correction" || kind === "decision";
    $("#language-action-fields").hidden = isControl;
    $("#control-actions").hidden = !isControl || isRecovery;
    $("#recovery-actions").hidden = !isRecovery;
    $("#submit-action").hidden = isControl;

    if (!isControl) {
      const copy = actionCopy[kind] || actionCopy.contribution;
      $("#action-label").textContent = copy.label;
      $("#action-text").placeholder = copy.placeholder;
      $("#action-help").textContent =
        mode === "idle" && kind === "contribution"
          ? "输入可以进入 Mission，但当前没有 runtime 或执行者；提交不会启动生产。"
          : copy.help;
      $("#submit-action").textContent = copy.submit;
    }
    $("#action-text").disabled = ordinaryInteractionBlocked;

    const target = targetObject();
    const actionable = Boolean(
      state.source === "live" &&
        state.actionPending === false &&
        target.projectId &&
        target.missionId &&
        target.runnerId &&
        target.runnerState &&
        target.runnerLive === true &&
        !ordinaryInteractionBlocked,
    );
    $("#submit-action").disabled = !actionable || isUnsupported;
    $$("#control-actions button").forEach((button) => {
      const command = button.dataset.control;
      const validForState =
        (command === "pause" && mode === "running") ||
        (command === "resume" && mode === "paused");
      button.disabled = !actionable || !validForState;
    });
    $$("#recovery-actions button").forEach((button) => {
      const command = button.dataset.recovery;
      const supported = first(recoveryCapabilities, [command]) === true;
      button.disabled = !actionable || mode !== "interrupted" || !supported;
      button.title = supported
        ? ""
        : command === "abandon"
          ? "当前 runner 没有可放弃的 interrupted turn。"
          : "当前 carrier 没有可证明的 runtime，不能续接或替换 turn。";
    });

    renderActionStatus(kind, target, isUnsupported);
  }

  function renderActionStatus(kind, target, isUnsupported) {
    const result = $("#action-result");
    const receipt = state.actionReceipt;
    const sameMission =
      receipt &&
      receipt.target.projectKey === target.projectId &&
      receipt.target.missionId === target.missionId;
    if (receipt && !sameMission && !state.actionPending) state.actionReceipt = null;

    if (sameMission) {
      const lines = [
        `${
          receipt.phase === "pending"
            ? "动作提交中 · 目标已锁定"
            : receipt.phase === "failed"
              ? "操作失败"
              : receipt.observed
                ? "回执已记录 · 刷新已观察"
                : "回执已记录 · 等待状态刷新"
        }`,
        `目标 ${receipt.target.projectKey} → ${receipt.target.missionId} → ${receipt.target.runnerId} @ ${receipt.target.expectedState}`,
        `${receipt.kind}${receipt.command ? ` · ${receipt.command}` : ""}`,
      ];
      if (receipt.receipt) {
        lines.push(
          `事件 ${text(first(receipt.receipt, ["eventId"]), "—")} · watermark ${text(first(receipt.receipt, ["watermark"]), "—")} · ${formatTime(first(receipt.receipt, ["at"]), "时间未知")}`,
        );
      }
      if (receipt.returnedStatus) {
        lines.push(
          `返回状态 ${text(first(receipt.returnedStatus, ["state"]), "未知")} · input ${text(first(receipt.returnedStatus, ["inputWatermark"]), "—")} / reconciled ${text(first(receipt.returnedStatus, ["reconciledWatermark"]), "—")}`,
        );
      }
      if (receipt.message) lines.push(receipt.message);
      result.className = `action-result ${receipt.phase === "failed" ? "is-error" : "is-success"}`;
      result.textContent = lines.join("\n");
      return;
    }

    result.className = "action-result";
    if (state.actionPending) {
      result.textContent = "动作正在提交；目标与按钮已锁定，等待权威回执。";
    } else if (state.source === "demo") {
      result.classList.add("is-error");
      result.textContent = "演示数据不可操作；连接真实运行投影后才能行动。";
    } else if (state.source === "stale") {
      result.classList.add("is-error");
      result.textContent = "实时刷新失败；保留上次真实投影供检查，但不授权新动作。";
    } else if (!target.projectId || !target.missionId) {
      result.textContent = "先选择 Project 与 Mission。";
    } else if (isUnsupported) {
      result.textContent =
        kind === "correction"
          ? "纠偏语义在首个 MVP 中尚未接入；系统不会把它伪装成普通补充。"
          : "结构化决策在首个 MVP 中尚未接入；系统不会把它伪装成普通补充。";
    } else if (target.runnerState === "anchor-pending") {
      result.textContent =
        "此载体没有授权 Intent Anchor；普通补充、控制与恢复均禁用。请先完成精确绑定的迁移行动授权。";
    } else if (!target.runnerId || !target.runnerState) {
      result.textContent = "此 Mission 没有精确 runner 地址，操作保持禁用。";
    } else if (target.runnerLive !== true) {
      result.textContent = "这里只观察到缓存状态；缓存不能授权操作。";
    } else {
      result.textContent = "";
    }
  }

  function restoreConversationIdentity() {
    let stored = null;
    try {
      stored = window.localStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!isConversationUuid(stored)) {
      stored = crypto.randomUUID();
      try {
        window.localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, stored);
      } catch {
        // Session-only identity when storage is unavailable.
      }
    }
    conversationState.conversationId = stored;
    try {
      const draft = window.localStorage.getItem(
        conversationDraftStorageKey(stored),
      );
      if (typeof draft === "string") conversationState.draft = draft;
    } catch {
      // Draft stays in memory when storage is unavailable.
    }
  }

  function persistConversationDraft() {
    if (conversationState.conversationId === null) return;
    try {
      if (conversationState.draft === "") {
        window.localStorage.removeItem(
          conversationDraftStorageKey(conversationState.conversationId),
        );
      } else {
        window.localStorage.setItem(
          conversationDraftStorageKey(conversationState.conversationId),
          conversationState.draft,
        );
      }
    } catch {
      // Storage failures never block the composer.
    }
  }

  function connectConversation() {
    if (conversationState.closedDeliberately) return;
    const id = conversationState.conversationId;
    if (id === null) return;
    window.clearTimeout(conversationState.reconnectTimer);
    if (window.navigator.onLine === false) {
      conversationState.connection = "disconnected";
      renderConversationSurface();
      return;
    }
    const current = conversationState.socket;
    if (current !== null && current.readyState === WebSocket.OPEN) return;
    conversationState.connection = "connecting";
    conversationState.socketFaulted = false;
    renderConversationSurface();
    let socket;
    try {
      socket = new WebSocket(
        buildConversationSocketUrl(window.location.href, id, conversationState.cursor),
      );
    } catch {
      conversationState.connection = "unavailable";
      renderConversationSurface();
      scheduleConversationReconnect();
      return;
    }
    conversationState.socket = socket;
    socket.addEventListener("open", () => {
      conversationState.socketFaulted = false;
      conversationState.connection = "live";
      conversationState.reconnectAttempt = 0;
      conversationState.protocolNotices = [];
      // Provisional deltas are never replayed: whatever was streaming is
      // dropped and only settled journal events may reconstruct the feed.
      clearConversationProvisional();
      renderConversationSurface();
    });
    socket.addEventListener("message", (messageEvent) => {
      handleConversationMessage(messageEvent.data);
    });
    socket.addEventListener("error", () => {
      if (conversationState.socket !== socket) return;
      conversationState.socketFaulted = true;
      conversationState.connection = "unavailable";
      renderConversationSurface();
    });
    socket.addEventListener("close", () => {
      if (conversationState.socket !== socket) return;
      conversationState.socket = null;
      conversationState.socketFaulted = false;
      clearConversationProvisional();
      for (const entry of conversationState.feed) {
        if (entry.kind === "message" && entry.status === "pending") {
          entry.status = "failed";
        }
      }
      if (conversationState.closedDeliberately) {
        conversationState.connection = "unavailable";
        renderConversationSurface();
        return;
      }
      conversationState.connection = "disconnected";
      renderConversationSurface();
      scheduleConversationReconnect();
    });
  }

  function convergeConversationConnection(connection) {
    const socket = conversationState.socket;
    conversationState.socket = null;
    conversationState.socketFaulted = false;
    if (socket !== null && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    clearConversationProvisional();
    for (const entry of conversationState.feed) {
      if (entry.kind === "message" && entry.status === "pending") {
        entry.status = "failed";
      }
    }
    conversationState.connection = connection;
    renderConversationSurface();
    scheduleConversationReconnect();
  }

  function conversationSocketNeedsConvergence() {
    if (window.navigator.onLine === false) return true;
    const socket = conversationState.socket;
    return socket === null
      || conversationState.socketFaulted
      || socket.readyState === WebSocket.CLOSING
      || socket.readyState === WebSocket.CLOSED;
  }

  function scheduleConversationReconnect() {
    if (conversationState.closedDeliberately || window.navigator.onLine === false) return;
    window.clearTimeout(conversationState.reconnectTimer);
    const delay = Math.min(
      15_000,
      500 * 2 ** Math.min(conversationState.reconnectAttempt, 4),
    );
    conversationState.reconnectAttempt += 1;
    conversationState.reconnectTimer = window.setTimeout(() => {
      connectConversation();
    }, delay);
  }

  function clearConversationProvisional() {
    for (const entry of conversationState.feed) {
      if (entry.kind === "turn" && !entry.terminal) {
        entry.provisional = "";
      }
    }
    // 本地载体状态属于客户端临时内存：断开时丢弃，不会保留或重发旧状态。
    // 重连后由服务端在 durable replay 之后按 owner 证据重新水合精确的
    // live/terminal/unknown standing，停止控制只从水合后的精确状态派生。
    conversationState.carriers.clear();
  }

  function findConversationTurn(turnId) {
    return conversationState.feed.find(
      (entry) => entry.kind === "turn" && entry.turnId === turnId,
    ) ?? null;
  }

  function findConversationAction(actionId) {
    for (const entry of conversationState.feed) {
      if (entry.kind !== "turn") continue;
      const action = entry.actions.find(
        (candidate) => candidate.actionId === actionId,
      );
      if (action) return action;
    }
    return null;
  }

  function findConversationMessage(clientMessageId) {
    return conversationState.feed.find(
      (entry) => entry.kind === "message"
        && entry.clientMessageId === clientMessageId,
    ) ?? null;
  }

  function activeConversationTurn() {
    for (let index = conversationState.feed.length - 1; index >= 0; index -= 1) {
      const entry = conversationState.feed[index];
      if (entry.kind === "turn" && !entry.terminal) return entry;
    }
    return null;
  }

  function appendConversationEventToFeed(event) {
    switch (event.type) {
      case "message.received": {
        const { clientMessageId, messageId, payload } = event.data;
        if (
          clientMessageId === conversationState.lastSubmittedClientMessageId
        ) {
          conversationState.lastSubmittedClientMessageId = null;
          $("#conversation-composer-status").textContent =
            "已送达 · 已结算为 durable journal 事件。";
        }
        const existing = findConversationMessage(clientMessageId);
        if (existing) {
          existing.status = "delivered";
          existing.messageId = messageId;
          existing.sequence = event.sequence;
          return;
        }
        conversationState.feed.push({
          kind: "message",
          sequence: event.sequence,
          clientMessageId,
          messageId,
          payload,
          status: "delivered",
        });
        return;
      }
      case "coordinator.turn-started": {
        const data = event.data;
        if (findConversationTurn(data.turnId)) return;
        conversationState.feed.push({
          kind: "turn",
          sequence: event.sequence,
          turnId: data.turnId,
          messageId: data.messageId,
          requestedPolicy: data.requestedPolicy,
          prompt: data.prompt ?? null,
          disclosedSources: list(data.disclosedSources),
          sourceRevisionSelectors: list(data.sourceRevisionSelectors),
          status: "started",
          terminal: false,
          provisional: "",
          response: "",
          reason: null,
          observedEvidence: null,
          interruptRequested: false,
          actions: [],
        });
        return;
      }
      case "action.requested": {
        const data = event.data;
        const turn = findConversationTurn(data.turnId);
        if (!turn) return;
        if (turn.actions.some((action) => action.actionId === data.actionId)) return;
        turn.actions.push({
          kind: "action",
          sequence: event.sequence,
          actionId: data.actionId,
          actionKind: data.kind,
          operation: data.operation,
          status: "requested",
          evidenceRefs: [],
          reason: null,
        });
        return;
      }
      case "action.settled":
      case "action.failed":
      case "action.uncertain": {
        const data = event.data;
        const action = findConversationAction(data.actionId);
        if (!action) return;
        action.status = event.type === "action.settled"
          ? "settled"
          : event.type === "action.failed"
            ? "failed"
            : "uncertain";
        action.evidenceRefs = list(data.evidenceRefs);
        action.reason = typeof data.reason === "string" ? data.reason : null;
        action.sequence = event.sequence;
        return;
      }
      case "coordinator.turn-settled": {
        const data = event.data;
        const turn = findConversationTurn(data.turnId);
        if (!turn) return;
        turn.status = "settled";
        turn.terminal = true;
        turn.response = typeof data.response === "string" ? data.response : "";
        turn.observedEvidence = data.observedEvidence ?? null;
        turn.provisional = "";
        turn.sequence = event.sequence;
        return;
      }
      case "coordinator.turn-failed": {
        const data = event.data;
        const turn = findConversationTurn(data.turnId);
        if (!turn) return;
        turn.status = "failed";
        turn.terminal = true;
        turn.reason = data.reason;
        turn.provisional = "";
        turn.sequence = event.sequence;
        return;
      }
      case "coordinator.turn-interrupted": {
        const data = event.data;
        const turn = findConversationTurn(data.turnId);
        if (!turn) return;
        turn.status = "interrupted";
        turn.terminal = true;
        turn.provisional = "";
        turn.sequence = event.sequence;
        return;
      }
      default:
        return;
    }
  }

  function applyConversationJournalEvent(event) {
    const reduced = reduceDurableEvents(
      { cursor: conversationState.cursor, buffered: conversationState.buffered },
      event,
    );
    conversationState.cursor = reduced.cursor;
    conversationState.buffered = reduced.buffered;
    for (const applied of reduced.applied) {
      appendConversationEventToFeed(applied);
    }
    if (reduced.applied.length > 0) renderConversationSurface();
  }

  function handleConversationMessage(data) {
    const frame = parseConversationServerFrame(data);
    if (frame === null) return;
    switch (frame.type) {
      case "journal.event":
        applyConversationJournalEvent(frame.event);
        return;
      case "response.delta": {
        const turn = findConversationTurn(frame.turnId);
        if (!turn || turn.terminal) return;
        turn.provisional += frame.text;
        renderConversationSurface();
        return;
      }
      case "activity.delta": {
        let carrier = conversationState.carriers.get(frame.actionId);
        if (carrier === undefined) {
          carrier = {
            turnId: frame.turnId,
            messageId: frame.messageId,
            actionId: frame.actionId,
            carrierId: frame.carrierId,
            taskId: frame.taskId,
            attemptId: frame.attemptId,
            activity: [],
            control: "idle",
            standing: "live",
            terminal: undefined,
          };
          conversationState.carriers.set(frame.actionId, carrier);
        }
        if (carrier.terminal === undefined) {
          carrier.activity.push({ text: frame.text, at: new Date().toISOString() });
        }
        renderConversationSurface();
        return;
      }
      case "carrier.standing": {
        // 服务端在 durable replay/调和之后按 owner 证据重新水合一个精确
        // carrier 状态：live 恢复精确停止控制；terminal/unknown 恢复不可
        // 停止的 standing/history。水合只读，从不重发客户端旧内存或效果。
        let carrier = conversationState.carriers.get(frame.actionId);
        if (carrier === undefined) {
          carrier = {
            turnId: frame.turnId,
            messageId: frame.messageId,
            actionId: frame.actionId,
            carrierId: frame.carrierId,
            taskId: frame.taskId,
            attemptId: frame.attemptId,
            activity: [],
            control: "idle",
            standing: "live",
            terminal: undefined,
          };
          conversationState.carriers.set(frame.actionId, carrier);
        }
        if (frame.standing === "terminal") {
          carrier.standing = "unknown";
          carrier.terminal = {
            status: frame.status,
            cellStatus: typeof frame.cellStatus === "string" ? frame.cellStatus : null,
            evidenceRefs: [...frame.evidenceRefs],
          };
        } else if (frame.standing === "unknown") {
          carrier.standing = "unknown";
          carrier.standingReason = frame.reason;
        } else {
          carrier.standing = "live";
        }
        renderConversationSurface();
        return;
      }
      case "carrier.terminal": {
        const carrier = conversationState.carriers.get(frame.actionId);
        if (carrier === undefined) return;
        // Owner-backed terminal standing: keep the retained activity/history
        // visible and never overwrite an already recorded terminal fact.
        if (carrier.terminal === undefined) {
          carrier.terminal = {
            status: frame.status,
            cellStatus: typeof frame.cellStatus === "string" ? frame.cellStatus : null,
            evidenceRefs: [...frame.evidenceRefs],
          };
        }
        renderConversationSurface();
        return;
      }
      case "projection.changed":
        loadSnapshot({ manual: true, ensure: true });
        return;
      case "protocol.error": {
        conversationState.protocolNotices.push({
          code: frame.code,
          message: frame.message,
          at: new Date().toISOString(),
        });
        // A rejected or unsupported control never reaches the durable action
        // path; re-enable the exact control for an explicit second attempt
        // rather than guessing which target the runtime refused.
        for (const carrier of conversationState.carriers.values()) {
          if (carrier.control === "requested") carrier.control = "idle";
        }
        renderConversationSurface();
        return;
      }
      default:
        return;
    }
  }

  function pushProtocolNotice(code, message) {
    conversationState.protocolNotices.push({
      code,
      message,
      at: new Date().toISOString(),
    });
    renderConversationSurface();
  }

  function submitConversationMessage() {
    const textarea = $("#conversation-composer-text");
    const status = $("#conversation-composer-status");
    const payload = textarea.value;
    if (payload.trim() === "") {
      textarea.focus();
      status.textContent = "空消息不会发送。";
      return;
    }
    if (conversationState.connection !== "live") {
      textarea.focus();
      status.textContent =
        "对话连接不可用：消息未发送，草稿保留；不会自动重发。";
      return;
    }
    const clientMessageId = crypto.randomUUID();
    const frame = conversationMessageSubmitFrame(clientMessageId, payload);
    if (frame === null) {
      status.textContent = "消息无法通过协议校验，未发送。";
      return;
    }
    let sent = false;
    try {
      conversationState.socket.send(JSON.stringify(frame));
      sent = true;
    } catch {
      sent = false;
    }
    if (!sent) {
      textarea.focus();
      status.textContent = "发送失败：消息未发送，草稿保留；不会自动重发。";
      return;
    }
    conversationState.feed.push({
      kind: "message",
      sequence: null,
      clientMessageId,
      messageId: null,
      payload,
      status: "pending",
    });
    conversationState.lastSubmittedClientMessageId = clientMessageId;
    textarea.value = "";
    conversationState.draft = "";
    persistConversationDraft();
    status.textContent = "已发送，等待送达回执。";
    conversationState.stickToBottom = true;
    textarea.focus();
    renderConversationSurface();
  }

  function retryConversationMessage(clientMessageId) {
    const entry = findConversationMessage(clientMessageId);
    if (!entry || entry.kind !== "message") return;
    if (conversationState.connection !== "live") {
      pushProtocolNotice(
        "not-sent",
        "连接不可用：手动重试未发送；不会自动重发。",
      );
      return;
    }
    const frame = conversationMessageSubmitFrame(clientMessageId, entry.payload);
    if (frame === null) {
      pushProtocolNotice("invalid-frame", "重试消息无法通过协议校验，未发送。");
      return;
    }
    try {
      conversationState.socket.send(JSON.stringify(frame));
      entry.status = "pending";
      conversationState.lastSubmittedClientMessageId = clientMessageId;
    } catch {
      pushProtocolNotice("not-sent", "重试发送失败；不会自动重发。");
      return;
    }
    renderConversationSurface();
  }

  function sendConversationResponseInterrupt(turnId) {
    if (conversationState.connection !== "live") {
      pushProtocolNotice(
        "not-sent",
        "连接不可用：回复中断未发送；不会自动重发。",
      );
      return;
    }
    const frame = conversationResponseInterruptFrame(turnId);
    if (frame === null) {
      pushProtocolNotice("invalid-frame", "回复中断目标无效，未发送。");
      return;
    }
    try {
      conversationState.socket.send(JSON.stringify(frame));
    } catch {
      pushProtocolNotice("not-sent", "回复中断发送失败；不会自动重发。");
      return;
    }
    const turn = findConversationTurn(turnId);
    if (turn) {
      turn.interruptRequested = true;
      turn.provisional = "";
    }
    renderConversationSurface();
  }

  function sendConversationWorkStop(actionId) {
    const carrier = conversationState.carriers.get(actionId);
    if (carrier === undefined) {
      pushProtocolNotice(
        "not-sent",
        "该动作没有当前观察到的精确执行载体；停止未发送。",
      );
      return;
    }
    if (carrier.terminal !== undefined) {
      pushProtocolNotice(
        "not-sent",
        "该载体已终止；停止未发送，活动历史与终态证据保留。",
      );
      return;
    }
    if (carrier.standing === "unknown") {
      pushProtocolNotice(
        "not-sent",
        "该载体当前没有可验证的 live 运行；停止未发送，状态与历史保留。",
      );
      return;
    }
    if (conversationState.connection !== "live") {
      pushProtocolNotice(
        "not-sent",
        "连接不可用：工作停止未发送；不会自动重发。",
      );
      return;
    }
    const frame = conversationWorkControlFrame(
      {
        turnId: carrier.turnId,
        actionId: carrier.actionId,
        carrierId: carrier.carrierId,
      },
      "stop",
    );
    if (frame === null) {
      pushProtocolNotice("invalid-frame", "工作控制目标无效，未发送。");
      return;
    }
    try {
      conversationState.socket.send(JSON.stringify(frame));
    } catch {
      pushProtocolNotice("not-sent", "工作停止发送失败；不会自动重发。");
      return;
    }
    carrier.control = "requested";
    renderConversationSurface();
  }

  const conversationActionKindCopy = {
    task_create: "创建任务",
    task_correct: "纠正任务",
    task_continue: "继续任务执行",
    work_control: "工作控制",
  };
  const conversationActionStatusCopy = {
    requested: "requested · 等待权威回执",
    settled: "settled · 已结算",
    failed: "failed · 失败",
    uncertain: "uncertain · 效果无法确认",
  };
  const conversationTurnStatusCopy = {
    started: "turn-started · 进行中",
    settled: "settled · 已结算",
    failed: "failed · 失败",
    interrupted: "interrupted · 已中断",
  };
  const conversationMessageStatusCopy = {
    pending: "pending · 发送中",
    delivered: "received · 已送达",
    failed: "failed · 送达未确认",
  };

  function shortConversationId(value) {
    return typeof value === "string" && value.length > 12
      ? `${value.slice(0, 8)}…`
      : text(value, "—");
  }

  function requestedPolicyLabel(policy) {
    const raw = policy !== null && typeof policy === "object" ? policy : {};
    return [
      text(first(raw, ["provider"], "unknown"), "unknown"),
      text(first(raw, ["model"], "unknown"), "unknown"),
      first(raw, ["thinking"]) === "enabled" ? "thinking" : "",
      first(raw, ["reasoningEffort"]) ? `effort ${first(raw, ["reasoningEffort"])}` : "",
    ].filter(Boolean).join(" · ");
  }

  function observedEvidenceLabel(evidence) {
    const raw = evidence !== null && typeof evidence === "object" ? evidence : {};
    const provider = text(first(raw, ["provider"]), "unknown");
    const model = text(first(raw, ["model"]), "unknown");
    const usage = first(raw, ["usage"]);
    const usageLabel = usage && typeof usage === "object"
      ? ` · ${text(first(usage, ["inputTokens"]), "—")}/${text(first(usage, ["outputTokens"]), "—")} tokens`
      : "";
    const fingerprint = first(raw, ["fingerprint"]);
    const fingerprintLabel = fingerprint
      ? ` · fingerprint ${shortConversationId(fingerprint)}`
      : "";
    return `${provider}/${model}${usageLabel}${fingerprintLabel}`;
  }

  function conversationOperationFacts(action) {
    const operation = first(action, ["operation"], {});
    const facts = [];
    if (action.actionKind === "task_create") {
      facts.push(["标题", text(first(operation, ["title"]))]);
      facts.push(["项目 ID", text(first(operation, ["projectId"]))]);
      facts.push(["Worktree", text(first(operation, ["worktreePath"]))]);
    } else if (action.actionKind === "task_correct") {
      facts.push(["任务 ID", text(first(operation, ["taskId"]))]);
      facts.push(["期望修订", `source ${text(first(operation, ["expectedSourceRevision"]))} · task ${text(first(operation, ["expectedRevision"]))}`]);
      facts.push(["纠正", text(first(operation, ["statement"]))]);
    } else if (action.actionKind === "task_continue") {
      facts.push(["任务 ID", text(first(operation, ["taskId"]))]);
      facts.push(["Worker", text(first(operation, ["workerId"]))]);
      facts.push(["项目 ID", text(first(operation, ["projectId"]))]);
      facts.push(["Worktree", text(first(operation, ["worktreePath"]))]);
    } else if (action.actionKind === "work_control") {
      facts.push(["载体 ID", text(first(operation, ["carrierId"]))]);
      facts.push(["控制", text(first(operation, ["control"]))]);
    }
    return facts;
  }

  function renderConversationEvidenceRefs(refs) {
    const items = workItems();
    return refs.map((ref) => {
      const target = taskEvidenceLinkTarget(ref, items);
      return target === null
        ? `<code class="evidence-ref">${escapeHtml(ref)}</code>`
        : `<button class="evidence-ref-link" type="button" data-evidence-task="${escapeHtml(target)}">
             <code>${escapeHtml(ref)}</code> <span>查看任务</span>
           </button>`;
    }).join("");
  }

  const conversationCarrierTerminalCopy = {
    recorded: "recorded · 已记录（passed）",
    "runner-failed": "runner-failed · Runner 失败",
    "control-stopped": "control-stopped · 已停止",
    unresolved: "unresolved · 结算未确认",
  };

  function renderConversationCarrier(actionId) {
    const carrier = conversationState.carriers.get(actionId);
    if (carrier === undefined) return "";
    const recent = carrier.activity.slice(-3).map((line) => {
      return `<li><span>${formatTime(line.at)}</span>${escapeHtml(line.text)}</li>`;
    }).join("");
    const controlBusy = carrier.control === "requested";
    const live = conversationState.connection === "live";
    const terminal = carrier.terminal;
    const unknown = carrier.standing === "unknown" && terminal === undefined;
    const standingLabel = terminal !== undefined
      ? "已终止 · 活动历史保留"
      : unknown
        ? "状态未知 · 停止不可用"
        : controlBusy
          ? "停止已请求 · 等待权威回执"
          : "活动已观察";
    return `
      <div class="conversation-carrier" data-carrier-control="${carrier.control}" data-carrier-terminal="${terminal === undefined ? (unknown ? "unknown" : "live") : escapeHtml(terminal.status)}">
        <header>
          <small class="layer-chip">3 · 执行载体</small>
          <span>owner-backed 活动</span>
          <b>${escapeHtml(standingLabel)}</b>
        </header>
        <p class="carrier-identity">
          task <code>${escapeHtml(carrier.taskId)}</code> ·
          attempt <code>${escapeHtml(carrier.attemptId)}</code> ·
          carrier <code>${escapeHtml(carrier.carrierId)}</code>
        </p>
        ${
          recent
            ? `<ul class="carrier-activity">${recent}</ul>`
            : '<p class="carrier-activity empty">暂无实时活动文本。</p>'
        }
        ${
          terminal !== undefined
            ? `<footer class="carrier-terminal">
                 <b>${escapeHtml(conversationCarrierTerminalCopy[terminal.status] || terminal.status)}</b>
                 ${
                   terminal.evidenceRefs.length
                     ? `<ul class="carrier-activity">${terminal.evidenceRefs
                       .map((ref) => `<li><code>${escapeHtml(ref)}</code></li>`)
                       .join("")}</ul>`
                     : ""
                 }
                 <small>
                   载体已终止；停止控制已移除，活动历史保留。canonical 终态证据由 attempt/settlement 所有者保留，
                   不会重放或重新发出停止。
                 </small>
               </footer>`
            : unknown
              ? `<footer class="carrier-terminal">
                   <b>状态未知 · 无停止控制</b>
                   <small>
                     重连水合无法证明该载体当前 live（如服务重启后无保留 handle，或结算证据无法重读）；
                     状态与历史保留，不会发送停止，也不会猜测为 live。
                     ${escapeHtml(carrier.standingReason ?? "")}
                   </small>
                 </footer>`
              : `<footer>
                   <button
                     class="conversation-control is-danger"
                     type="button"
                     data-conversation-work-stop="${escapeHtml(actionId)}"
                     ${controlBusy || !live ? "disabled" : ""}
                   >
                     停止该工作
                   </button>
                   <small>
                     只发送精确 turn/action/carrier 目标；过期的目标会被运行时以零效果拒绝。
                     暂停/续接/恢复不在此 UI 提供，因为它们不属于当前普通 Task 载体的控制面。
                   </small>
                 </footer>`
        }
      </div>
    `;
  }

  function renderConversationAction(action) {
    const facts = conversationOperationFacts(action);
    const refs = action.evidenceRefs;
    return `
      <div class="conversation-action" data-action-status="${action.status}">
        <header>
          <small class="layer-chip">2 · 执行动作</small>
          <code>${escapeHtml(conversationActionKindCopy[action.actionKind] || action.actionKind)} · ${escapeHtml(shortConversationId(action.actionId))}</code>
          <b>${escapeHtml(conversationActionStatusCopy[action.status] || action.status)}</b>
        </header>
        <dl class="action-facts">
          ${facts.map(([label, value]) => `
            <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
          `).join("")}
        </dl>
        ${
          action.status === "settled"
            ? `<div class="action-evidence">
                 <span>canonical 证据引用</span>
                 ${refs.length ? renderConversationEvidenceRefs(refs) : '<code>无引用</code>'}
                 <small>点击任务引用打开任务详情；本地验收只在任务详情中显式执行，conversation 不代替 Principal 验收。</small>
               </div>`
            : action.status === "failed" || action.status === "uncertain"
              ? `<p class="action-reason">${escapeHtml(action.reason || "原因未说明")}</p>`
              : '<p class="action-waiting">等待 canonical 所有者的权威回执…</p>'
        }
        ${renderConversationCarrier(action.actionId)}
      </div>
    `;
  }

  function renderConversationTurn(entry) {
    const policy = entry.requestedPolicy !== null && typeof entry.requestedPolicy === "object"
      ? entry.requestedPolicy
      : {};
    const observed = entry.terminal
      ? (entry.observedEvidence === null || entry.observedEvidence === undefined
        ? "未报告 · unknown"
        : observedEvidenceLabel(entry.observedEvidence))
      : "unknown · 尚未报告";
    const interruptable = entry.kind === "turn"
      && !entry.terminal
      && activeConversationTurn()?.turnId === entry.turnId;
    const interruptSent = entry.interruptRequested === true;
    const sources = entry.disclosedSources.length
      ? `<details class="turn-sources">
           <summary>披露来源 ${entry.disclosedSources.length} · 版本选择 ${entry.sourceRevisionSelectors.length}</summary>
           <ul>
             ${entry.disclosedSources.map((source) =>
               `<li><code>${escapeHtml(text(first(source, ["ref"]), "—"))}</code></li>`).join("")}
             ${entry.sourceRevisionSelectors.map((selector) =>
               `<li><span>selector</span> <code>${escapeHtml(text(first(selector, ["source"]), "—"))}@${escapeHtml(text(first(selector, ["revision"]), "—"))}</code></li>`).join("")}
           </ul>
         </details>`
      : "";
    return `
      <article class="conversation-item turn-item" data-turn-status="${entry.status}" data-turn-id="${escapeHtml(entry.turnId)}">
        <header>
          <small class="layer-chip">1 · 协调回复</small>
          <code>turn ${escapeHtml(shortConversationId(entry.turnId))}</code>
          <b>${escapeHtml(conversationTurnStatusCopy[entry.status] || entry.status)}</b>
          ${
            interruptable
              ? `<button class="conversation-control" type="button" data-conversation-interrupt="${escapeHtml(entry.turnId)}" ${interruptSent ? "disabled" : ""}>
                   ${interruptSent ? "中断已请求" : "中断这条回复"}
                 </button>`
              : ""
          }
        </header>
        <dl class="turn-policy">
          <div><dt>请求 provider/model</dt><dd>${escapeHtml(requestedPolicyLabel(policy))}</dd></div>
          <div><dt>实际 provider/model</dt><dd data-observed="${entry.terminal ? "settled" : "started"}">${escapeHtml(observed)}</dd></div>
        </dl>
        ${sources}
        <div class="turn-actions">
          ${entry.actions.map(renderConversationAction).join("")}
        </div>
        ${
          entry.status === "settled"
            ? `<p class="turn-response">${escapeHtml(entry.response)}</p>`
            : entry.status === "failed"
              ? `<p class="turn-failure">${escapeHtml(entry.reason || "原因未说明")}</p>`
              : entry.status === "interrupted"
                ? '<p class="turn-failure">此回复已按请求中断；工作控制不受其影响。</p>'
                : entry.provisional
                  ? `<p class="turn-provisional" data-provisional="true">${escapeHtml(entry.provisional)}</p>`
                  : '<p class="turn-waiting">正在生成回复…（流式内容为临时状态，不会伪装成 durable）</p>'
        }
        ${
          entry.status === "settled"
            ? '<p class="turn-next-step">已结算 · 下一步：查看上方执行卡片的 canonical 证据链接，或在下方继续提出、纠正。</p>'
            : entry.status === "failed"
              ? '<p class="turn-next-step">失败 · 下一步：在下方补充说明或纠正后重新提出；回复不会自动重试。</p>'
              : entry.status === "interrupted"
                ? '<p class="turn-next-step">已中断 · 下一步：在下方继续提出要求；相关执行载体仍保留其精确停止控制（若 live）。</p>'
                : ""
        }
      </article>
    `;
  }

  function renderConversationMessage(entry) {
    return `
      <article class="conversation-item message-item" data-message-status="${entry.status}" data-message-client-id="${escapeHtml(entry.clientMessageId)}">
        <header>
          <span class="item-role">你</span>
          <code>${escapeHtml(shortConversationId(entry.clientMessageId))}</code>
          <b>${escapeHtml(conversationMessageStatusCopy[entry.status] || entry.status)}</b>
        </header>
        <p class="message-text">${escapeHtml(entry.payload)}</p>
        ${
          entry.status === "failed"
            ? `<div class="message-retry">
                 <button class="conversation-control" type="button" data-conversation-retry="${escapeHtml(entry.clientMessageId)}">
                   手动重试（相同消息标识）
                 </button>
                 <small>送达未确认；不会自动重发。重试复用同一消息标识，不会产生重复效果。</small>
               </div>`
            : ""
        }
      </article>
    `;
  }

  function renderConversationEmptyState() {
    const connection = conversationState.connection;
    const connectionCopy = {
      live: ["已连接 · 实时", "可以发送；示例只填入草稿，不会自动发送。"],
      connecting: ["正在连接", "草稿与示例仍可用；连接恢复后才能发送。"],
      disconnected: ["已断开 · 正在重连", "草稿保留，不会自动重发；只恢复已结算事件。"],
      unavailable: ["不可用", "草稿保留；恢复连接前不能发送，不会自动重发。"],
    }[connection] || ["连接状态未知", "不发送；草稿保留，不会自动重发。"];
    const examples = [
      ["查看待办", "当前有哪些事项需要我处理？"],
      ["观察执行", "请说明当前执行进展与下一步。"],
      ["纠正任务", "纠正正在进行的任务：……"],
    ];
    return `
      <div class="conversation-empty" data-connection="${escapeHtml(connection)}">
        <div class="conversation-empty-heading">
          <div class="conversation-empty-mark" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">Rossovia · 受监督对话入口</p>
            <h3>向 Agent 系统提出事情</h3>
            <p>发布任务、纠正方向、观察协调回复与执行进展。浏览器只保留对话 ID、光标与草稿；任务与执行证据以 canonical 所有者为准。</p>
          </div>
        </div>
        <div class="conversation-empty-standing">
          <span>对话连接</span>
          <strong>${escapeHtml(connectionCopy[0])}</strong>
          <small>${escapeHtml(connectionCopy[1])}</small>
          <code>会话 ${escapeHtml(shortConversationId(conversationState.conversationId))}</code>
        </div>
        <div class="conversation-examples">
          <p class="conversation-examples-label">从这里开始 · 示例只填入草稿，不会自动发送，也不改变任何后端状态</p>
          <div class="conversation-example-list">
            ${examples.map(([label, draft]) => `
              <button type="button" data-conversation-example="${escapeHtml(draft)}">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(draft)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderConversationFeed() {
    const feed = $("#conversation-feed");
    const inner = $("#conversation-feed-inner");
    const wasStuck = conversationState.stickToBottom;
    const previousScroll = feed.scrollTop;
    inner.innerHTML = conversationState.feed.length
      ? conversationState.feed.map((entry) =>
        entry.kind === "turn"
          ? renderConversationTurn(entry)
          : renderConversationMessage(entry),
      ).join("")
      : renderConversationEmptyState();
    if (wasStuck) {
      feed.scrollTop = feed.scrollHeight;
    } else {
      feed.scrollTop = previousScroll;
    }
  }

  function bindConversationFeedActions() {
    $$("[data-conversation-interrupt]").forEach((button) => {
      button.addEventListener("click", () => {
        sendConversationResponseInterrupt(button.dataset.conversationInterrupt);
      });
    });
    $$("[data-conversation-work-stop]").forEach((button) => {
      button.addEventListener("click", () => {
        sendConversationWorkStop(button.dataset.conversationWorkStop);
      });
    });
    $$("[data-conversation-retry]").forEach((button) => {
      button.addEventListener("click", () => {
        retryConversationMessage(button.dataset.conversationRetry);
      });
    });
    $$("[data-conversation-example]").forEach((button) => {
      button.addEventListener("click", () => {
        // Example starters only fill the local draft: they never send a frame
        // and never touch backend state. The user confirms with Enter.
        const textarea = $("#conversation-composer-text");
        const value = button.dataset.conversationExample ?? "";
        conversationState.draft = value;
        textarea.value = value;
        persistConversationDraft();
        renderConversationComposer();
        textarea.focus({ preventScroll: true });
      });
    });
    $$("[data-evidence-task]").forEach((button) => {
      button.addEventListener("click", () => {
        const workItem = workItems().find(
          (item) => item.id === button.dataset.evidenceTask,
        );
        if (!workItem) return;
        clearActionReceipt();
        state.taskCreateOpen = false;
        state.taskActionReceipt = null;
        state.unavailableLocus = null;
        selectWorkItemContext(workItem);
        render();
        writePrincipalLocus();
      });
    });
  }

  function renderConversationConnection() {
    const label = $("#conversation-connection-label");
    const mark = $("#conversation-connection-mark");
    const id = $("#conversation-id");
    id.textContent = shortConversationId(conversationState.conversationId);
    const copy = {
      connecting: "正在连接",
      live: "已连接 · 实时",
      disconnected: "已断开 · 正在重连",
      unavailable: "不可用",
    };
    label.textContent = copy[conversationState.connection] || "未连接";
    mark.dataset.connection = conversationState.connection;
    const reconnect = $("#conversation-reconnect");
    reconnect.hidden = conversationState.connection !== "disconnected";
    if (!reconnect.hidden) {
      $("#conversation-reconnect-attempt").textContent =
        `第 ${conversationState.reconnectAttempt} 次重连 · 临时流式内容已丢弃，只恢复已结算事件`;
    }
    const notices = $("#conversation-notices");
    const recent = conversationState.protocolNotices.slice(-4);
    notices.innerHTML = recent.map((notice) => `
      <p class="protocol-notice" data-code="${escapeHtml(notice.code)}">
        <code>${escapeHtml(notice.code)}</code>
        <span>${escapeHtml(notice.message)}</span>
      </p>
    `).join("");
  }

  function renderConversationComposer() {
    const form = $("#conversation-composer-form");
    const live = $("#conversation-composer-live");
    form.dataset.connection = conversationState.connection;
    live.dataset.connection = conversationState.connection;
    const textarea = $("#conversation-composer-text");
    const submit = $("#conversation-composer-submit");
    const status = $("#conversation-composer-status");
    const standing = conversationComposerStanding(
      conversationState.connection,
      conversationState.draft,
    );
    submit.disabled = !standing.sendable;
    submit.setAttribute("aria-disabled", String(!standing.sendable));
    submit.dataset.sendable = String(standing.sendable);
    const previousStanding = status.dataset.standing;
    status.dataset.standing = standing.standing;
    if (standing.gate === "connection") {
      status.textContent = standing.status;
    } else if (previousStanding !== standing.standing) {
      status.textContent = "";
    }
    if (
      document.activeElement !== textarea
      && textarea.value !== conversationState.draft
    ) {
      textarea.value = conversationState.draft;
    }
  }

  function conversationNextStep() {
    for (let index = conversationState.feed.length - 1; index >= 0; index -= 1) {
      const entry = conversationState.feed[index];
      if (entry.kind === "turn" && !entry.terminal) {
        return "正在生成协调回复：可以随时中断这条回复，或等待它结算。";
      }
    }
    for (const carrier of conversationState.carriers.values()) {
      if (carrier.terminal === undefined && carrier.standing === "live") {
        return "存在 live 执行载体：可以用“停止该工作”精确停止，只作用于该 turn/action/carrier。";
      }
    }
    if (conversationState.connection !== "live") {
      return "对话连接不可用：草稿保留，恢复连接前不能发送；不会自动重发。";
    }
    if (conversationState.draft !== "") {
      return "草稿已保留在本地：确认内容后按 Enter 发送。";
    }
    return "发送第一条消息开始；示例只填充草稿，不会自动发送，也不改变后端状态。";
  }

  function renderConversationContext() {
    const context = $("#conversation-context");
    if (context === null) return;
    const connection = conversationState.connection;
    const copy = {
      connecting: "正在连接",
      live: "已连接 · 实时",
      disconnected: "已断开 · 正在重连",
      unavailable: "不可用",
    };
    const mark = context.querySelector("[data-conversation-context-mark]");
    if (mark) mark.dataset.connection = connection;
    const label = context.querySelector("[data-conversation-context-label]");
    if (label) label.textContent = copy[connection] || "未连接";
    const id = context.querySelector("[data-conversation-context-id]");
    if (id) id.textContent = shortConversationId(conversationState.conversationId);
    const supervisor = $("#conversation-context-supervisor");
    const subject = $("#conversation-context-subject");
    if (supervisor !== null || subject !== null) {
      const supervision = first(state.snapshot, ["supervision"], {});
      if (supervisor !== null) {
        supervisor.textContent = text(
          first(supervision, ["supervisor", "supervisorName", "actor"]),
          "Codex",
        );
      }
      if (subject !== null) {
        subject.textContent = text(
          first(supervision, ["subject", "subjectName", "system"]),
          "Agent system",
        );
      }
    }
    const next = $("#conversation-context-next");
    if (next !== null) next.textContent = conversationNextStep();
  }

  function renderConversationSurface() {
    const surface = $("#conversation-surface");
    const active = state.activeView === "conversation";
    surface.hidden = !active;
    $("#project-surface").hidden = active;
    if (!active) return;
    renderConversationConnection();
    renderConversationFeed();
    bindConversationFeedActions();
    renderConversationContext();
    renderConversationComposer();
  }

  function bindConversationEvents() {
    const textarea = $("#conversation-composer-text");
    textarea.addEventListener("input", () => {
      conversationState.draft = textarea.value;
      persistConversationDraft();
      renderConversationComposer();
    });
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitConversationMessage();
      }
    });
    $("#conversation-composer-form").addEventListener("submit", (event) => {
      event.preventDefault();
      submitConversationMessage();
    });
    const feed = $("#conversation-feed");
    feed.addEventListener("scroll", () => {
      const nearBottom =
        feed.scrollHeight - feed.scrollTop - feed.clientHeight < 48;
      conversationState.stickToBottom = nearBottom;
    });
  }

  function render() {
    ensureSelections();
    renderConnection();
    renderSupervision();
    renderAttention();
    renderProjects();
    renderViewNavigation();
    renderUnifiedSurface();
    renderProjectSurface();
    renderConversationSurface();
    renderTarget();
    renderOperation();
    renderIntentLineageGate();
    renderReconciliationAction();
    renderExecutionProposal();
    renderCurrentEffect();
    renderCorrectionMovement();
    renderEvidence();
    renderActionForm();
    renderPeek();
    renderTaskPanels();
  }

  async function loadSnapshot({ manual = false, ensure = false } = {}) {
    if (state.requestInFlight) {
      if (!ensure) return state.activeRefreshPromise;
      state.refreshQueued = true;
      await state.activeRefreshPromise;
      if (state.refreshQueued) {
        state.refreshQueued = false;
        return await loadSnapshot({ manual: true });
      }
      return;
    }
    state.requestInFlight = true;
    const refresh = (async () => {
      if (manual) {
        $("#connection-label").textContent = "正在刷新";
        $("#refresh-button").disabled = true;
        $("#retry-button").disabled = true;
      }

      try {
        const response = await fetch("/api/snapshot", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const snapshot = await response.json();
        if (!snapshot || typeof snapshot !== "object") {
          throw new Error("响应不是有效的运行投影");
        }
        state.snapshot = snapshot;
        state.lastLiveSnapshot = snapshot;
        state.snapshotError = null;
        state.source = "live";
        markActionObserved(snapshot);
      } catch (error) {
        state.snapshotError = error instanceof Error ? error.message : text(error);
        if (conversationSocketNeedsConvergence()) {
          convergeConversationConnection(
            window.navigator.onLine === false ? "disconnected" : "unavailable",
          );
        }
        if (state.lastLiveSnapshot) {
          state.snapshot = state.lastLiveSnapshot;
          state.source = "stale";
          console.warn("Principal Workbench refresh failed; retaining last-known-live snapshot.", error);
        } else {
          state.snapshot = demoSnapshot;
          state.source = "demo";
          console.warn("Principal Workbench has never connected; showing local demo only.", error);
        }
      } finally {
        state.requestInFlight = false;
        $("#refresh-button").disabled = false;
        $("#retry-button").disabled = false;
        const persistedRequest = parsePrincipalLocus(window.location.href);
        if (
          state.source === "live"
          && (
            state.locusRestorePending
            || hasPrincipalLocusRequest(persistedRequest)
          )
        ) {
          state.locusRequest = persistedRequest;
          applyPrincipalLocusRequest();
        } else if (state.locusRestorePending) {
          applyPrincipalLocusRequest();
        }
        render();
        if (!state.refreshQueued) schedulePoll();
      }
    })();
    state.activeRefreshPromise = refresh;
    try {
      await refresh;
    } finally {
      if (state.activeRefreshPromise === refresh) state.activeRefreshPromise = null;
    }
  }

  function markActionObserved(snapshot) {
    const receipt = state.actionReceipt;
    if (!receipt || receipt.phase === "failed") return;
    const matchingRunner = list(first(snapshot, ["runners"], [])).find((runner) => {
      const status = runnerStatus(runner);
      const binding = first(runner, ["binding"], {});
      return (
        identifier(status, "") === receipt.target.runnerId &&
        text(first(status, ["missionId"]), "") === receipt.target.missionId &&
        (!first(binding, ["projectKey"]) ||
          text(first(binding, ["projectKey"]), "") === receipt.target.projectKey)
      );
    });
    if (!matchingRunner) return;
    const observedStatus = runnerStatus(matchingRunner);
    const returnedState = first(receipt.returnedStatus, ["state"]);
    const returnedInput = first(receipt.returnedStatus, ["inputWatermark"]);
    const observedInput = first(observedStatus, ["inputWatermark"]);
    const returnedUpdatedAt = Date.parse(text(first(receipt.returnedStatus, ["updatedAt"]), ""));
    const observedUpdatedAt = Date.parse(text(first(observedStatus, ["updatedAt"]), ""));
    const stateMatches =
      returnedState === undefined || first(observedStatus, ["state"]) === returnedState;
    const watermarkReached =
      returnedInput === undefined ||
      (typeof observedInput === "number" && observedInput >= returnedInput);
    const timeReached =
      Number.isNaN(returnedUpdatedAt) ||
      (!Number.isNaN(observedUpdatedAt) && observedUpdatedAt >= returnedUpdatedAt);
    if (stateMatches && watermarkReached && timeReached) {
      receipt.observed = true;
      receipt.observedAt = first(snapshot, ["generatedAt", "observedAt"]);
    }
  }

  function schedulePoll() {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(() => loadSnapshot(), POLL_INTERVAL_MS);
  }

  async function sendAction(type, payload = {}) {
    const target = targetObject();
    const result = $("#action-result");
    if (state.actionPending) {
      result.className = "action-result is-error";
      result.textContent = "已有动作正在提交；等待该动作完成并刷新状态。";
      return;
    }
    if (state.source !== "live") {
      result.className = "action-result is-error";
      result.textContent = "当前不是实时连接，操作未发送。";
      return;
    }
    if (
      !target.projectId ||
      !target.missionId ||
      !target.runnerId ||
      !target.runnerState ||
      target.runnerLive !== true
    ) {
      result.className = "action-result is-error";
      result.textContent = "目标不是带精确 runner 状态的实时现场，操作未发送。";
      return;
    }

    const exactTarget = {
      missionId: target.missionId,
      runnerId: target.runnerId,
      expectedState: target.runnerState,
      projectKey: target.projectId,
    };
    let request;
    if (type === "contribution") {
      request = { kind: "contribution", target: exactTarget, text: payload.text };
    } else if (type === "control") {
      request = { kind: "control", target: exactTarget, command: payload.command };
    } else if (type === "recovery") {
      request = { kind: "recovery", target: exactTarget, command: payload.command };
    } else {
      result.className = "action-result is-error";
      result.textContent = "此行动类型尚未由首个 MVP 支持，操作未发送。";
      return;
    }

    state.actionPending = true;
    state.actionReceipt = {
      phase: "pending",
      kind: type,
      command: payload.command,
      target: exactTarget,
      submittedAt: new Date().toISOString(),
      observed: false,
    };
    renderActionForm();

    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const actionError = new Error(
          text(first(body, ["message", "error", "reason"]), `HTTP ${response.status}`),
        );
        actionError.code = first(body, ["error"]);
        actionError.status = response.status;
        throw actionError;
      }
      const returned = first(body, ["result"], {});
      state.actionReceipt = {
        ...state.actionReceipt,
        phase: "accepted",
        acceptedAt: new Date().toISOString(),
        receipt: first(returned, ["receipt"]),
        returnedStatus: first(returned, ["status"]),
        message:
          typeof first(body, ["message"]) === "string"
            ? first(body, ["message"])
            : "运行系统已返回结构化回执；等待刷新确认投影状态。",
      };
      if (type === "contribution") $("#action-text").value = "";
      await loadSnapshot({ manual: true, ensure: true });
    } catch (error) {
      state.actionReceipt = {
        ...state.actionReceipt,
        phase: "failed",
        message: `操作未完成：${error instanceof Error ? error.message : text(error)}`,
      };
      if (error?.status === 409 || error?.code === "target-drift") {
        await loadSnapshot({ manual: true, ensure: true });
      }
    } finally {
      state.actionPending = false;
      renderActionForm();
    }
  }

  async function sendTaskCreate() {
    const capability = taskSourceCapability();
    const expectedSourceRevision = first(capability, ["sourceRevision"]);
    const result = $("#task-create-result");
    if (
      state.source !== "live"
      || first(capability, ["standing"]) !== "available"
      || !Number.isInteger(expectedSourceRevision)
    ) {
      result.className = "action-result is-error";
      result.textContent = "任务源不是可写的实时投影，未创建任务。";
      return;
    }
    const project = $("#task-create-project").value;
    const worktree = $("#task-create-worktree").value;
    const mission = $("#task-create-mission").value;
    const request = {
      title: $("#task-create-title").value.trim(),
      objective: $("#task-create-objective").value.trim(),
      acceptance: lines($("#task-create-acceptance").value),
      nextActor: $("#task-create-actor").value,
      expectedSourceRevision,
      ...(project ? { project } : {}),
      ...(project && worktree ? { worktree } : {}),
      ...(project && mission ? { mission } : {}),
    };
    await sendTaskRequest({
      receiptKind: "create",
      path: "/api/tasks",
      request,
      onSuccess(body) {
        const task = first(first(body, ["result"], {}), ["task"], {});
        const id = text(first(task, ["id"]), "");
        $("#task-create-form").reset();
        state.taskCreateOpen = false;
        state.selectedWorkItemId = id ? `principal-task:${id}` : null;
        state.peekOpen = id !== "";
        writePrincipalLocus({ replace: true });
      },
    });
  }

  async function sendTaskMutation(kind, payload = {}) {
    const item = selectedWorkItem();
    const detail = taskDetail(item);
    if (detail === null) return;
    const task = detail.task;
    const request = {
      kind,
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: task.revision,
      ...payload,
    };
    await sendTaskRequest({
      receiptKind: "mutation",
      path: `/api/tasks/${encodeURIComponent(task.id)}/actions`,
      request,
      onSuccess() {
        state.selectedWorkItemId = `principal-task:${task.id}`;
        state.peekOpen = true;
      },
    });
  }

  async function sendTaskRequest({
    receiptKind,
    path,
    request,
    onSuccess,
  }) {
    if (state.taskActionPending) return;
    if (state.source !== "live") {
      state.taskActionReceipt = {
        kind: receiptKind,
        phase: "failed",
        message: "当前不是实时投影，任务动作未发送。",
      };
      renderTaskPanels();
      return;
    }
    state.taskActionPending = true;
    state.taskActionReceipt = {
      kind: receiptKind,
      phase: "pending",
      message: "任务动作正在提交。",
    };
    render();
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(
          text(first(body, ["message", "error"]), `HTTP ${response.status}`),
        );
        error.status = response.status;
        error.code = first(body, ["error"]);
        throw error;
      }
      onSuccess(body);
      state.taskActionReceipt = {
        kind: receiptKind,
        phase: "accepted",
        message: "任务源已接受动作；刷新后显示当前修订。",
      };
      await loadSnapshot({ manual: true, ensure: true });
    } catch (error) {
      state.taskActionReceipt = {
        kind: receiptKind,
        phase: "failed",
        message: `任务动作未完成：${error instanceof Error ? error.message : text(error)}`,
      };
      if (
        error?.status === 409
        || error?.code === "task-drift"
        || error?.code === "source-unavailable"
        || error?.status >= 500
      ) {
        await loadSnapshot({ manual: true, ensure: true });
      }
    } finally {
      state.taskActionPending = false;
      render();
    }
  }

  async function sendExecutionAuthorization() {
    const project = selectedProject();
    const mission = selectedMission();
    const proposal = first(mission, ["executionProposal"]);
    const authorization = first(mission, ["authorization"]);
    const view = executionProposalView(proposal, authorization);
    if (view === null) return;

    const targetKey = executionAuthorizationTargetKey(project, mission, view);
    const draft = authorizationDraft(targetKey);
    const projectKey = project ? identifier(project, "") : "";
    const missionId = mission ? identifier(mission, "") : "";
    const result = $("#proposal-authorization-result");
    if (state.detailRevalidationPending) {
      result.className = "proposal-authorization-result is-error";
      result.textContent = "正在重验当前目标；重验完成前不会签发授权。";
      return;
    }
    if (state.authorizationPending) {
      result.className = "proposal-authorization-result is-error";
      result.textContent = "已有授权请求正在提交；没有创建第二份回执。";
      return;
    }

    let request;
    try {
      const requestId =
        typeof globalThis.crypto?.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : "";
      request = buildExecutionAuthorizationRequest(
        authorizationInput(
          project,
          mission,
          proposal,
          authorization,
          draft,
          requestId,
        ),
      );
    } catch (error) {
      result.className = "proposal-authorization-result is-error";
      result.textContent =
        error instanceof Error ? error.message : "当前选择不能签发授权。";
      return;
    }

    state.authorizationPending = true;
    state.authorizationSubmission = {
      phase: "pending",
      targetKey,
      projectKey,
      missionId,
      proposalId: view.proposalId,
      proposalDigest: view.proposalDigest,
    };
    renderExecutionProposal();

    try {
      const response = await fetch("/api/execution-authorizations", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const authorizationError = new Error(
          text(
            first(body, ["message", "error", "reason"]),
            `HTTP ${response.status}`,
          ),
        );
        authorizationError.code = first(body, ["error"]);
        authorizationError.status = response.status;
        throw authorizationError;
      }

      state.authorizationSubmission = {
        ...state.authorizationSubmission,
        phase: "accepted",
        acceptedAt: new Date().toISOString(),
        authorizationId: first(first(body, ["receipt"], {}), [
          "authorizationId",
          "id",
        ]),
      };
      await loadSnapshot({ manual: true, ensure: true });
    } catch (error) {
      state.authorizationSubmission = {
        ...state.authorizationSubmission,
        phase: "uncertain",
        message:
          "授权提交结果尚未裁决；正在刷新实时 receipt projection。",
      };
      await loadSnapshot({ manual: true, ensure: true });
      const refreshedMission = selectedMission();
      const verdict = executionAuthorizationRefreshVerdict(
        state.source,
        first(refreshedMission, ["authorization"]),
      );
      state.authorizationSubmission = {
        ...state.authorizationSubmission,
        phase:
          verdict.state === "authorized"
            ? "observed-authorized"
            : verdict.state,
        message: `${verdict.message}${
          error instanceof Error ? ` 提交返回：${error.message}` : ""
        }`,
      };
    } finally {
      state.authorizationPending = false;
      render();
    }
  }

  function bindEvents() {
    const refreshFromCurrentLocation = () => {
      if (state.unavailableLocus !== null) {
        state.locusRequest = parsePrincipalLocus(window.location.href);
        state.locusRestorePending = true;
        state.unavailableLocus = null;
        render();
      }
      loadSnapshot({ manual: true, ensure: true });
    };
    $("#refresh-button").addEventListener("click", refreshFromCurrentLocation);
    $("#retry-button").addEventListener("click", refreshFromCurrentLocation);
    $("#task-locator-keyword").addEventListener("input", () => {
      state.taskLocator = { ...state.taskLocator, keyword: $("#task-locator-keyword").value };
      render();
    });
    $("#task-locator-project").addEventListener("change", () => {
      state.taskLocator = { ...state.taskLocator, project: $("#task-locator-project").value || null };
      render();
    });
    $("#task-locator-status").addEventListener("change", () => {
      state.taskLocator = { ...state.taskLocator, status: $("#task-locator-status").value || null };
      render();
    });
    $("#task-locator-clear").addEventListener("click", clearTaskLocator);
    $("#create-task-button").addEventListener("click", () => {
      state.unavailableLocus = null;
      state.taskCreateOpen = true;
      state.selectedWorkItemId = null;
      state.selectedProjectId = null;
      state.selectedMissionId = null;
      state.selectedWorktreeId = null;
      state.taskActionReceipt = null;
      state.peekOpen = true;
      render();
      writePrincipalLocus({ replace: true });
      $("#task-create-title").focus();
    });
    $("#peek-close").addEventListener("click", () => {
      state.peekOpen = false;
      state.taskCreateOpen = false;
      render();
      writePrincipalLocus();
    });

    $("#task-create-project").addEventListener("change", () => {
      $("#task-create-worktree").value = "";
      $("#task-create-mission").value = "";
      renderTaskCreateWorktrees();
      renderTaskCreateMissions();
    });
    $("#task-create-form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendTaskCreate();
    });
    $("#task-assign-form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendTaskMutation("assign", {
        nextActor: $("#task-assign-actor").value,
      });
    });
    $("#task-link-execution-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const authorizationId = $("#task-link-execution-candidate").value;
      if (!authorizationId) return;
      sendTaskMutation("link-execution", { authorizationId });
    });
    $("#task-launch-execution-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const detail = taskDetail();
      const candidate = first(
        first(detail, ["executionContext"], {}),
        ["launchCandidate"],
      );
      if (candidate === null || candidate === undefined) return;
      sendTaskMutation("launch-authorized-execution", {
        authorizationId: first(candidate, ["authorizationId"]),
        proposalDigest: first(candidate, ["proposalDigest"]),
      });
    });
    $("#task-rebind-worktree").addEventListener("change", () => {
      $("#task-rebind-worktree-submit").disabled =
        state.taskActionPending || $("#task-rebind-worktree").value.length === 0;
    });
    $("#task-rebind-worktree-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const detail = taskDetail();
      const worktree = $("#task-rebind-worktree").value;
      const expectedWorktreePath = text(
        first(
          first(first(detail, ["task"], {}), ["binding"], {}),
          ["worktreePath"],
        ),
        "",
      );
      if (!worktree || !expectedWorktreePath) return;
      sendTaskMutation("rebind-worktree", {
        expectedWorktreePath,
        worktree,
      });
    });
    $("#task-correction-delivery-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const detail = taskDetail();
      const candidate = first(
        first(detail, ["executionContext"], {}),
        ["correctionDeliveryCandidate"],
      );
      if (candidate === null || candidate === undefined) return;
      sendTaskMutation("deliver-correction", {
        correctionId: first(candidate, ["correctionId"]),
        authorizationId: first(candidate, ["authorizationId"]),
        target: first(candidate, ["target"]),
      });
    });
    $("#task-execution-recovery-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const detail = taskDetail();
      const candidate = first(
        first(detail, ["executionContext"], {}),
        ["recoveryCandidate"],
      );
      if (candidate === null || candidate === undefined) return;
      sendTaskMutation("recover-linked-execution", {
        authorizationId: first(candidate, ["authorizationId"]),
        proposalDigest: first(candidate, ["proposalDigest"]),
        turn: first(candidate, ["turn"]),
        target: first(candidate, ["target"]),
        command: first(candidate, ["command"]),
      });
    });
    $("#task-correct-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const statement = $("#task-correct-statement").value.trim();
      if (!statement) return;
      sendTaskMutation("correct", {
        statement,
        nextActor: $("#task-correct-actor").value,
      });
    });
    $("#task-result-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const summary = $("#task-result-summary").value.trim();
      const evidenceRefs = lines($("#task-result-evidence").value);
      if (!summary || evidenceRefs.length === 0) return;
      sendTaskMutation("submit", { summary, evidenceRefs });
    });
    $("#task-submit-verified-result").addEventListener("click", () => {
      const summary = $("#task-result-summary").value.trim();
      const detail = taskDetail();
      const candidate = first(
        first(detail, ["executionContext"], {}),
        ["verifiedResultCandidate"],
      );
      if (!summary || candidate === null || candidate === undefined) return;
      sendTaskMutation("submit-verified-execution", {
        summary,
        authorizationId: first(candidate, ["authorizationId"]),
        selector: first(candidate, ["selector"]),
      });
    });
    $("#task-submit-attempt-result").addEventListener("click", () => {
      const summary = $("#task-result-summary").value.trim();
      const detail = taskDetail();
      const candidate = first(
        first(detail, ["executionContext"], {}),
        ["attemptResultCandidate"],
      );
      if (!summary || candidate === null || candidate === undefined) return;
      const worktree = first(candidate, ["worktree"], {});
      const head = text(first(worktree, ["head"]), "");
      if (!/^[0-9a-f]{40}$/.test(head)) return;
      sendTaskMutation("submit-verified-execution", {
        summary,
        selector: {
          kind: "ordinary-attempt-result.v1",
          attemptId: first(candidate, ["attemptId"]),
          expectedWorktreeHead: head,
        },
      });
    });
    $("#task-accept-button").addEventListener("click", () => {
      sendTaskMutation("accept");
    });
    $("#task-reopen-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const statement = $("#task-reopen-statement").value.trim();
      if (!statement) return;
      sendTaskMutation("reopen", {
        statement,
        nextActor: $("#task-reopen-actor").value,
      });
    });

    $$("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.activeView = button.dataset.view;
        state.peekOpen = false;
        state.taskCreateOpen = false;
        render();
        writePrincipalLocus();
        if (state.activeView === "conversation") {
          $("#conversation-composer-text").focus({ preventScroll: true });
        }
      });
    });

    $$("[data-mobile-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        if (button.dataset.mobileView === "conversation") state.activeView = "conversation";
        if (button.dataset.mobileView === "overview") state.activeView = "overview";
        if (button.dataset.mobileView === "tasks") state.activeView = "tasks";
        if (button.dataset.mobileView === "projects") state.activeView = "projects";
        state.peekOpen = false;
        state.taskCreateOpen = false;
        render();
        writePrincipalLocus();
      });
    });

    $$("[data-task-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.unavailableLocus = null;
        state.activeView = "tasks";
        state.taskFilter = button.dataset.taskFilter;
        render();
        writePrincipalLocus();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.peekOpen) {
        state.peekOpen = false;
        state.taskCreateOpen = false;
        render();
        writePrincipalLocus();
        $("#project-surface").focus({ preventScroll: true });
      }
    });

    window.addEventListener("popstate", () => {
      state.locusRequest = parsePrincipalLocus(window.location.href);
      Object.assign(
        state,
        restoredPrincipalLocusState(
          resolvePrincipalLocus(state.locusRequest, {
            projects: [],
            workItems: [],
          }),
        ),
      );
      state.locusRestorePending = true;
      state.unavailableLocus = null;
      renderPeek();
      render();
      loadSnapshot({ manual: true, ensure: true });
    });

    window.addEventListener("offline", () => {
      if (conversationState.closedDeliberately) return;
      convergeConversationConnection("disconnected");
    });
    window.addEventListener("online", () => {
      if (conversationState.closedDeliberately) return;
      conversationState.reconnectAttempt = 0;
      connectConversation();
    });

    $$(".kind-button").forEach((button) => {
      button.addEventListener("click", () => {
        clearActionReceipt();
        state.actionKind = button.dataset.kind;
        renderActionForm();
        if (state.actionKind !== "control") $("#action-text").focus();
      });
    });

    $("#action-form").addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.actionKind === "control") return;
      if (state.actionKind !== "contribution") {
        $("#action-result").className = "action-result is-error";
        $("#action-result").textContent = "此行动类型尚未由首个 MVP 支持。";
        return;
      }
      const value = $("#action-text").value.trim();
      if (!value) {
        $("#action-result").className = "action-result is-error";
        $("#action-result").textContent = "请输入要提交的内容。";
        $("#action-text").focus();
        return;
      }
      sendAction("contribution", { text: value });
    });

    $("#proposal-authorization-form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendExecutionAuthorization();
    });

    $$("#control-actions button").forEach((button) => {
      button.addEventListener("click", () => {
        sendAction("control", { command: button.dataset.control });
      });
    });

    $$("#recovery-actions button").forEach((button) => {
      button.addEventListener("click", () => {
        sendAction("recovery", { command: button.dataset.recovery });
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        loadSnapshot();
        if (
          conversationState.socket === null
          && !conversationState.closedDeliberately
        ) {
          connectConversation();
        }
      } else {
        window.clearTimeout(state.pollTimer);
      }
    });

    bindConversationEvents();
  }

  restoreConversationIdentity();
  bindEvents();
  render();
  loadSnapshot();
  connectConversation();
})();
