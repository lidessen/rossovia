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
  intentLineagePresentation,
  reconciliationActionDecisionBriefPresentation,
  runnerPresentation,
  verifiedCorrectionAwaitsSystemSettlement,
} from "./operational-semantics.js";

(() => {
  "use strict";

  const POLL_INTERVAL_MS = 5000;
  const state = {
    snapshot: null,
    source: "loading",
    selectedProjectId: null,
    selectedMissionId: null,
    selectedWorktreeId: null,
    selectedWorkItemId: null,
    activeView: "overview",
    taskFilter: "all",
    peekOpen: false,
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
    authorizationPending: false,
    authorizationDraft: null,
    authorizationSubmission: null,
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

  function selectedWorkItem() {
    return workItems().find((item) => item.id === state.selectedWorkItemId) || null;
  }

  function workItemFreshnessLabel(item) {
    const freshness = first(first(item, ["evidence"], {}), ["freshness"], {});
    const kind = text(first(freshness, ["kind"]), "unverified");
    if (kind === "live") return "实时";
    if (kind === "observed-at-build") return "本次投影";
    if (kind === "cached") return "缓存";
    return "未验证";
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
    if (view === "agent") {
      return item.kind === "agent-work"
        && item.lifecycle === "in-progress"
        && first(first(item.evidence, ["freshness"], {}), ["kind"]) === "live";
    }
    if (view === "independent") return first(item.binding, ["kind"]) === "explicit-independent";
    if (view === "completed") return item.lifecycle === "settled";
    if (view === "tasks") {
      if (state.taskFilter === "principal") return item.nextActor === "principal";
      if (state.taskFilter === "agent") {
        return item.kind === "agent-work"
          && item.lifecycle === "in-progress"
          && first(first(item.evidence, ["freshness"], {}), ["kind"]) === "live";
      }
      if (state.taskFilter === "independent") {
        return first(item.binding, ["kind"]) === "explicit-independent";
      }
      if (state.taskFilter === "verification") {
        return item.lifecycle === "verifying";
      }
      if (state.taskFilter === "completed") return item.lifecycle === "settled";
      return true;
    }
    return true;
  }

  function workItemRow(item) {
    const project = projects().find(
      (candidate, index) => identifier(candidate, `project-${index}`) === item.projectKey,
    );
    const context = project
      ? `${projectName(project)}${item.missionId ? ` · ${item.missionId}` : ""}`
      : item.context;
    const actor = actorCopy[item.nextActor] || item.nextActor;
    return `
      <button
        class="work-item ${item.id === state.selectedWorkItemId ? "is-selected" : ""}"
        type="button"
        data-work-item-id="${escapeHtml(item.id)}"
        data-lifecycle="${escapeHtml(item.lifecycle)}"
      >
        <span class="work-item-state">${escapeHtml(workItemCopy[item.lifecycle] || item.lifecycle)}</span>
        <span class="work-item-body">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.summary)}</span>
          <small>${escapeHtml(context)} · 下一步 ${escapeHtml(actor)}</small>
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
    state.selectedWorkItemId = item.id;
    state.peekOpen = true;
    if (item.projectKey) state.selectedProjectId = item.projectKey;
    if (item.missionId) state.selectedMissionId = item.missionId;
    const worktreePath = text(
      first(first(item, ["worktreeContext"], {}), ["path"]),
      "",
    );
    if (worktreePath && item.projectKey) {
      const project = projects().find(
        (candidate, index) => identifier(candidate, `project-${index}`) === item.projectKey,
      );
      const worktree = projectWorktrees(project).find(
        (candidate) => text(first(candidate, ["path", "worktreePath"]), "") === worktreePath,
      );
      state.selectedWorktreeId = worktree ? identifier(worktree, "") : null;
    } else {
      state.selectedWorktreeId = null;
    }
    ensureSelections();
    render();
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
    const counts = {
      principal: items.filter((item) => item.nextActor === "principal").length,
      agent: items.filter(
        (item) => item.kind === "agent-work"
          && item.lifecycle === "in-progress"
          && first(first(item.evidence, ["freshness"], {}), ["kind"]) === "live",
      ).length,
      independent: items.filter(
        (item) => first(item.binding, ["kind"]) === "explicit-independent",
      ).length,
      completed: items.filter((item) => item.lifecycle === "settled").length,
    };
    $("#principal-task-count").textContent = String(counts.principal);
    $("#agent-task-count").textContent = String(counts.agent);
    const independentCapability = first(
      first(first(state.snapshot, ["workItems"], {}), ["capabilities"], {}),
      ["independentTasks"],
      {},
    );
    $("#independent-task-count").textContent =
      first(independentCapability, ["standing"]) === "unsupported"
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
      const active = mobileView === "overview"
        ? state.activeView === "overview"
        : mobileView === "tasks"
          ? ["tasks", "principal", "agent", "independent", "completed"].includes(state.activeView)
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
        <details class="project-group" ${index < 2 ? "open" : ""}>
          <summary>
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
        state.selectedProjectId = button.dataset.openProject;
        state.activeView = "project";
        state.peekOpen = false;
        ensureSelections();
        render();
      });
    });
    container.querySelectorAll("[data-overview-worktree]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProjectId = button.dataset.overviewProject;
        state.selectedWorktreeId = button.dataset.overviewWorktree;
        state.activeView = "project";
        state.peekOpen = false;
        ensureSelections();
        state.selectedWorktreeId = button.dataset.overviewWorktree;
        render();
      });
    });
  }

  function renderUnifiedSurface() {
    const items = workItems();
    const overview = $("#unified-surface");
    const projectDetail = $("#project-detail");
    const taskView = $("#task-view");
    const taskFilters = $("#task-filter-bar");
    const attentionOverview = $("#attention-overview");
    const projectOverview = $("#project-overview");
    const isProjectView = state.activeView === "project";
    const isProjectsView = state.activeView === "projects";
    const isOverview = state.activeView === "overview";

    overview.hidden = isProjectView;
    projectDetail.hidden = !isProjectView;
    taskView.hidden = isOverview || isProjectView || isProjectsView;
    taskFilters.hidden = state.activeView !== "tasks";
    attentionOverview.hidden = !isOverview;
    projectOverview.hidden = !(isOverview || isProjectsView);

    const viewMeta = {
      overview: ["Workbench overview", "总览", "跨项目查看需要你处理、Agent 正在进行和状态未知的工作。"],
      projects: ["Projects", "项目", "按项目与 Worktree 查看当前工作，不把观察关系伪装成任务绑定。"],
      principal: ["Needs you", "待我处理", "只显示下一责任方明确是你的事项；进入详情后再完成决策。"],
      agent: ["Agent work", "Agent 工作", "只显示有实时载体证据的当前 Agent 工作。"],
      independent: ["Independent", "独立任务", "只显示来源明确声明为独立的任务。"],
      completed: ["Completed", "已完成", "任务完成不自动代表 Mission 结案、验证通过或已集成。"],
      tasks: ["Tasks", "任务", "用统一形式查看不同责任方和生命周期的工作。"],
    };
    const [eyebrow, title, summary] = viewMeta[state.activeView] || viewMeta.overview;
    $("#view-eyebrow").textContent = eyebrow;
    $("#view-title").textContent = title;
    $("#view-summary").textContent = summary;

    const observation = $("#observation-state");
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
      const attention = items.filter(
        (item) => item.attention === "decision-required"
          || item.attention === "exception",
      );
      $("#overview-attention-count").textContent = String(attention.length);
      $("#overview-attention-list").innerHTML = attention.length
        ? attention.slice(0, 5).map(workItemRow).join("")
        : '<p class="empty-note">当前投影没有阻塞推进的事项。</p>';
      bindWorkItemRows($("#overview-attention-list"));
    }

    if (isOverview || isProjectsView) renderOverviewProjects();

    if (!isOverview && !isProjectView && !isProjectsView) {
      const filtered = items.filter((item) => workItemMatchesView(item));
      $("#task-view-heading").textContent = title;
      $("#task-view-count").textContent = String(filtered.length);
      $("#task-view-list").innerHTML = filtered.length
        ? filtered.map(workItemRow).join("")
        : '<p class="empty-note">当前投影没有符合这个视图的任务。</p>';
      bindWorkItemRows($("#task-view-list"));
    }
  }

  function renderPeek() {
    const peek = $("#work-item-peek");
    const item = selectedWorkItem();
    const open = state.peekOpen && item !== null;
    peek.hidden = !open;
    document.body.dataset.peekOpen = open ? "true" : "false";
    document.body.dataset.peekContext = item?.projectKey && item?.missionId
      ? "bound"
      : "observation";
    document.body.dataset.peekConsequence = item?.consequence || "normal";
    if (!open) return;

    $("#peek-context").textContent = item.context;
    $("#peek-item-state").textContent = workItemCopy[item.lifecycle] || item.lifecycle;
    $("#peek-item-title").textContent = item.title;
    $("#peek-item-summary").textContent = item.summary;
    $("#peek-next-actor").textContent = actorCopy[item.nextActor] || item.nextActor;
    $("#peek-freshness").textContent = state.detailRevalidationPending
      ? "正在重验当前目标"
      : workItemFreshnessLabel(item);
    if (state.detailRevalidationPending) {
      $("#proposal-authorize-button").disabled = true;
    }
  }

  function renderAttention() {
    const items = attentionItems();
    const primaryAttention = items[0];
    const primaryAttentionCode = text(first(primaryAttention, ["code"]), "");
    $("#attention-count").textContent = String(items.length);
    $("#summary-attention").textContent = items.length
      ? `${items.length} 项需要关注`
      : "当前没有待关注事项";
    $("#summary-attention-detail").textContent = items.length
      ? primaryAttentionCode === "runner-anchor-migration-decision"
        ? "Intent Anchor 迁移等待 AUTHORIZE MIGRATION / HOLD"
        : text(
            first(primaryAttention, ["title", "summary", "message"]),
            "打开 Principal attention 查看。",
          )
      : "实时投影未请求 Principal 介入";
    const container = $("#attention-list");

    if (!items.length) {
      container.innerHTML = '<li class="empty-note">当前投影没有请求 Principal 注意的事项。</li>';
      return;
    }

    container.innerHTML = items
      .map((item, index) => {
        const severity = normalizeMode(first(item, ["priority", "severity", "level", "status"], "info"));
        const normalizedSeverity =
          ["critical", "failed", "interrupted", "principal-decision"].includes(severity)
            ? "critical"
            : ["warning", "input-pending", "needs-attention", "paused"].includes(severity)
              ? "warning"
              : "info";
        const projectId = text(first(item, ["projectKey", "projectId", "project"]), "");
        const missionId = text(first(item, ["missionId", "mission"]), "");
        return `
          <li>
            <button
              class="attention-item"
              type="button"
              data-attention-index="${index}"
              data-attention-code="${escapeHtml(text(first(item, ["code"]), ""))}"
              data-severity="${normalizedSeverity}"
              data-project-id="${escapeHtml(projectId)}"
              data-mission-id="${escapeHtml(missionId)}"
            >
              <strong>${escapeHtml(first(item, ["title", "summary", "message"], "需要 Principal 注意"))}</strong>
              <span>${escapeHtml(first(item, ["detail", "description", "reason", "source"], "打开对应现场查看。"))}</span>
            </button>
          </li>
        `;
      })
      .join("");

    $$(".attention-item").forEach((button) => {
      button.addEventListener("click", () => {
        clearActionReceipt();
        if (button.dataset.projectId) state.selectedProjectId = button.dataset.projectId;
        if (button.dataset.missionId) state.selectedMissionId = button.dataset.missionId;
        state.selectedWorktreeId = null;
        ensureSelections();
        const item = workItems().find(
          (candidate) =>
            candidate.attentionCode === button.dataset.attentionCode
            && (!button.dataset.projectId || candidate.projectKey === button.dataset.projectId)
            && (!button.dataset.missionId || candidate.missionId === button.dataset.missionId),
        );
        state.selectedWorkItemId = item?.id ?? null;
        state.peekOpen = item !== undefined;
        render();
        if (
          button.dataset.attentionCode === "runner-legacy-unanchored"
          || button.dataset.attentionCode === "runner-anchor-migration-decision"
          || button.dataset.attentionCode === "runner-lineage-unavailable"
        ) {
          $("#intent-lineage-gate").scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
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
        state.selectedProjectId = button.dataset.projectId;
        state.selectedMissionId = null;
        state.selectedWorktreeId = null;
        state.activeView = "project";
        state.peekOpen = false;
        ensureSelections();
        render();
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
      });
    });

    $$(".worktree-button").forEach((button) => {
      button.addEventListener("click", () => {
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
        state.selectedWorktreeId = button.dataset.inventoryWorktree;
        render();
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
    $("#effect-phase").textContent =
      `${text(first(effect, ["phase"]), "phase 未知")}\ncell ${text(first(writer, ["cellId"]), "—")} / run ${text(first(writer, ["runId"]), "—")}`;
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

  function render() {
    ensureSelections();
    renderConnection();
    renderSupervision();
    renderAttention();
    renderProjects();
    renderViewNavigation();
    renderUnifiedSurface();
    renderProjectSurface();
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
    $("#refresh-button").addEventListener("click", () => loadSnapshot({ manual: true }));
    $("#retry-button").addEventListener("click", () => loadSnapshot({ manual: true }));
    $("#peek-close").addEventListener("click", () => {
      state.peekOpen = false;
      render();
    });

    $$("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeView = button.dataset.view;
        state.peekOpen = false;
        render();
      });
    });

    $$("[data-mobile-view]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.mobileView === "overview") state.activeView = "overview";
        if (button.dataset.mobileView === "tasks") state.activeView = "tasks";
        if (button.dataset.mobileView === "projects") state.activeView = "projects";
        state.peekOpen = false;
        render();
      });
    });

    $$("[data-task-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeView = "tasks";
        state.taskFilter = button.dataset.taskFilter;
        render();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.peekOpen) {
        state.peekOpen = false;
        render();
        $("#project-surface").focus({ preventScroll: true });
      }
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
      if (document.visibilityState === "visible") loadSnapshot();
      else window.clearTimeout(state.pollTimer);
    });
  }

  bindEvents();
  render();
  loadSnapshot();
})();
