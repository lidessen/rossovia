import {
  comparisonCompatibility,
  validateEvidenceBundle,
} from "./lib/evidence-bundle.js";
import {
  buildLensModel,
  diffLensModels,
} from "./lib/lens-model.js";
import {
  applySourceOnlyMode,
  comparisonPresentationState,
} from "./lib/lens-view-state.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_CASE_ID = "authorization-consumed-only";
const state = {
  fixtureCases: [],
  currentCase: null,
  model: null,
  selectedId: "execution-standing",
  focusedId: null,
  layers: { source: true, projection: true, explanation: true },
  sourceOnly: false,
  comparisonEnabled: false,
  comparison: { available: false, reasons: [] },
  diff: null,
};

const elements = {
  caseSelect: document.querySelector("#case-select"),
  caseDescription: document.querySelector("#case-description"),
  bundleIdentity: document.querySelector("#bundle-identity"),
  standingPanel: document.querySelector("#standing-panel"),
  standingLabel: document.querySelector("#standing-label"),
  standingCode: document.querySelector("#standing-code"),
  standingExplanation: document.querySelector("#standing-explanation"),
  graph: document.querySelector("#graph"),
  evidenceTitle: document.querySelector("#evidence-title"),
  evidenceKind: document.querySelector("#evidence-kind"),
  evidenceDetails: document.querySelector("#evidence-details"),
  sourceOnly: document.querySelector("#source-only"),
  comparisonControl: document.querySelector("#comparison-control"),
  comparisonToggle: document.querySelector("#comparison-toggle"),
  comparisonNote: document.querySelector("#comparison-note"),
  clearFocus: document.querySelector("#clear-focus"),
};

function shortDigest(value) {
  return value.replace("sha256:", "sha256:").slice(0, 21) + "…";
}

function describeFreshness(freshness) {
  if (freshness === null || typeof freshness !== "object") return String(freshness);
  if (freshness.kind === "live") return `实时 · ${freshness.observedAt}`;
  if (freshness.kind === "observed-at-build") return `构建时观察 · ${freshness.observedAt}`;
  if (freshness.kind === "cached") return `缓存 · ${freshness.sourceUpdatedAt}`;
  if (freshness.kind === "unverified") return `未验证 · ${freshness.reason ?? "未提供原因"}`;
  if (freshness.kind === "ephemeral") return "仅当前渲染有效";
  return freshness.kind ?? JSON.stringify(freshness);
}

function layerLabel(layer) {
  return {
    source: "来源",
    projection: "投影",
    explanation: "Agent 解释",
  }[layer] ?? layer;
}

function kindLabel(kind) {
  return kind === "node" ? "对象" : kind === "edge" ? "关系" : kind;
}

function comparisonReasonMessage(reason) {
  return {
    "current-bundle-invalid": "当前证据包内部验证失败。",
    "prior-bundle-invalid": "上一份证据包内部验证失败。",
    "subject-identity-mismatch": "透镜主体 identity 不一致。",
    "task-context-mismatch": "任务上下文不一致。",
    "relation-contract-mismatch": "关系契约版本不一致。",
    "builder-revision-incompatible": "builder revision 不兼容；当前原型要求完全一致。",
    "prior-missing": "未保留上一份证据包。",
  }[reason.code] ?? reason.message;
}

function visibleLayer(layer) {
  return state.sourceOnly ? layer === "source" : state.layers[layer];
}

function comparisonPresentation() {
  return comparisonPresentationState({
    sourceOnly: state.sourceOnly,
    comparisonEnabled: state.comparisonEnabled,
    comparisonAvailable: state.comparison.available,
  });
}

function syncLayerControls() {
  document.querySelectorAll("[data-layer]").forEach((input) => {
    input.disabled = state.sourceOnly;
    input.checked = state.sourceOnly
      ? input.dataset.layer === "source"
      : state.layers[input.dataset.layer];
  });
}

function selectedElement() {
  if (state.model === null) return null;
  return [...state.model.nodes, ...state.model.edges]
    .find((element) => element.id === state.selectedId) ?? null;
}

function ensureVisibleSelection() {
  if (visibleLayer(selectedElement()?.layer)) return;
  const fallback = [...state.model.nodes, ...state.model.edges]
    .find((element) => visibleLayer(element.layer));
  state.selectedId = fallback?.id ?? null;
  state.focusedId = null;
}

function focusSet() {
  if (state.focusedId === null || state.model === null) return null;
  const focusedNode = state.model.nodes.find((node) => node.id === state.focusedId);
  const focusedEdge = state.model.edges.find((edge) => edge.id === state.focusedId);
  if (focusedNode !== undefined) {
    const edges = state.model.edges.filter(
      (edge) => edge.from === focusedNode.id || edge.to === focusedNode.id,
    );
    return new Set([
      focusedNode.id,
      ...edges.map((edge) => edge.id),
      ...edges.flatMap((edge) => [edge.from, edge.to]),
    ]);
  }
  if (focusedEdge !== undefined) {
    return new Set([focusedEdge.id, focusedEdge.from, focusedEdge.to]);
  }
  return null;
}

function setSelection(id) {
  state.selectedId = id;
  state.focusedId = id;
  renderGraph();
  renderEvidence();
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function edgePath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 80) {
    const bend = Math.max(45, Math.abs(dy) * 0.35);
    return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x + bend} ${to.y}, ${to.x} ${to.y}`;
  }
  return `M ${from.x} ${from.y} C ${from.x + dx * 0.44} ${from.y}, ${to.x - dx * 0.44} ${to.y}, ${to.x} ${to.y}`;
}

function renderGraph() {
  elements.graph.replaceChildren();
  if (state.model === null) return;
  const focus = focusSet();
  const comparisonCuesVisible = comparisonPresentation().cuesVisible;
  const visibleNodes = state.model.nodes.filter((node) => visibleLayer(node.layer));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = state.model.edges.filter(
    (edge) => visibleLayer(edge.layer)
      && visibleNodeIds.has(edge.from)
      && visibleNodeIds.has(edge.to),
  );
  const nodeMap = new Map(state.model.nodes.map((node) => [node.id, node]));
  const svg = svgElement("svg", {
    class: "edge-layer",
    viewBox: "0 0 1050 580",
    "aria-hidden": "false",
  });

  for (const edge of visibleEdges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    const group = svgElement("g", {
      class: [
        "graph-edge",
        edge.layer,
        edge.dotted ? "dotted" : "",
        edge.id === state.model.firstIssueEdgeId ? "issue" : "",
        edge.id === state.selectedId ? "selected" : "",
        focus !== null && !focus.has(edge.id) ? "dimmed" : "",
      ].filter(Boolean).join(" "),
      tabindex: "0",
      role: "button",
      "aria-label": `${edge.label}: ${edge.evidence.standing}`,
    });
    const path = edgePath(from, to);
    group.append(
      svgElement("path", { class: "edge-visible", d: path }),
      svgElement("path", { class: "edge-hit", d: path }),
    );
    const text = svgElement("text", {
      class: "edge-label",
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2 - 7,
    });
    text.textContent = edge.label;
    group.append(text);
    if (comparisonCuesVisible && state.diff?.states[edge.id] === "changed") {
      const badge = svgElement("text", {
        class: "edge-change-label",
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2 + 10,
      });
      badge.textContent = "变化";
      group.append(badge);
    }
    const select = () => setSelection(edge.id);
    group.addEventListener("click", select);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
    svg.append(group);
  }
  elements.graph.append(svg);

  for (const item of visibleNodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "graph-node",
      item.layer,
      item.id === state.selectedId ? "selected" : "",
      state.model.firstIssueEdgeId !== null
        && state.model.edges.find((edge) => edge.id === state.model.firstIssueEdgeId)?.from === item.id
        ? "issue"
        : "",
      focus !== null && !focus.has(item.id) ? "dimmed" : "",
    ].filter(Boolean).join(" ");
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.setAttribute("aria-label", `${item.label}: ${item.evidence.standing}`);
    const label = document.createElement("span");
    label.className = "node-label";
    label.textContent = item.label;
    const detail = document.createElement("span");
    detail.className = "node-detail";
    detail.textContent = item.detail;
    button.append(label, detail);
    if (comparisonCuesVisible && state.diff?.states[item.id] === "changed") {
      const badge = document.createElement("span");
      badge.className = "comparison-badge";
      badge.textContent = "已变化";
      button.append(badge);
    }
    button.addEventListener("click", () => setSelection(item.id));
    elements.graph.append(button);
  }
}

function appendDefinition(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value;
  elements.evidenceDetails.append(term, definition);
}

function appendSourceDefinition(label, sourceRef) {
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.className = "source-definition";
  const code = document.createElement("code");
  code.textContent = sourceRef;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "复制来源";
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(sourceRef);
    button.textContent = "已复制";
    window.setTimeout(() => { button.textContent = "复制来源"; }, 1200);
  });
  definition.append(code, button);
  elements.evidenceDetails.append(term, definition);
}

function describeComparisonValue(value) {
  return [value.standing, value.relationState, value.detail].filter(Boolean).join(" · ");
}

function renderEvidence() {
  const item = selectedElement();
  elements.evidenceDetails.replaceChildren();
  if (item === null) {
    elements.evidenceTitle.textContent = "请选择对象或关系";
    elements.evidenceKind.textContent = "";
    return;
  }
  elements.evidenceTitle.textContent = item.label;
  elements.evidenceKind.textContent = `${layerLabel(item.layer)} · ${kindLabel(item.kind)}`;
  appendDefinition("权威边界", item.evidence.authority);
  appendSourceDefinition("来源引用", item.evidence.sourceRef);
  if (item.evidence.sourceRefs.length > 1) {
    for (const sourceRef of item.evidence.sourceRefs.filter((value) => value !== item.evidence.sourceRef)) {
      appendSourceDefinition("关联来源", sourceRef);
    }
  }
  appendDefinition("修订", item.evidence.revision);
  appendDefinition("新鲜度", describeFreshness(item.evidence.freshness));
  appendDefinition("状态", item.evidence.standing);
  appendDefinition("可推翻它的证据", item.evidence.disconfirmingEvidence);
  const change = comparisonPresentation().cuesVisible ? state.diff?.changes?.[item.id] : null;
  if (change) {
    appendDefinition("上一份", describeComparisonValue(change.before));
    appendDefinition("当前", describeComparisonValue(change.after));
  }
}

function renderStanding() {
  const execution = state.model.execution;
  if (!visibleLayer("projection")) {
    elements.standingLabel.textContent = "投影层已隐藏";
    elements.standingCode.textContent = "";
    elements.standingExplanation.textContent = "仅看来源会保留每条来源自己的状态，同时移除推导出的执行状态和 Agent 解释。";
    elements.standingPanel.classList.remove("proven", "not-proven");
    return;
  }
  elements.standingLabel.textContent = execution.label;
  elements.standingCode.textContent = execution.standing;
  elements.standingExplanation.textContent = execution.explanation;
  elements.standingPanel.classList.toggle("proven", execution.provesCurrentExecution);
  elements.standingPanel.classList.toggle("not-proven", !execution.provesCurrentExecution);
}

function renderComparison() {
  const fixtureCase = state.currentCase;
  const hasPrior = fixtureCase.prior !== null;
  const presentation = comparisonPresentation();
  elements.comparisonControl.hidden = !hasPrior || !presentation.controlVisible;
  elements.comparisonToggle.checked = presentation.cuesVisible;
  if (state.sourceOnly) {
    elements.comparisonNote.textContent = "仅看来源已关闭对比；不会显示任何 comparison 派生 cue。";
    return;
  }
  if (!hasPrior) {
    elements.comparisonNote.textContent = "无法对比：这个案例没有上一份冻结证据包，因此不会生成漂移判断。";
    return;
  }
  if (!state.comparison.available) {
    elements.comparisonNote.textContent = `无法对比：${state.comparison.reasons.map(comparisonReasonMessage).join(" ")} 不会生成漂移判断。`;
    return;
  }
  if (!state.comparisonEnabled) {
    elements.comparisonNote.textContent = `可对比上一份兼容证据包 · ${fixtureCase.prior.generatedAt} · 构建器修订 ${fixtureCase.current.builder.revision}`;
    return;
  }
  const { changed, added, removed } = state.diff.counts;
  elements.comparisonNote.textContent = `兼容来源对比 · ${changed} 项变化 · ${added} 项新增 · ${removed} 项移除。主体、任务上下文、关系契约和构建器修订均一致。`;
}

function renderCaseIdentity() {
  elements.caseDescription.textContent = state.currentCase.description;
  elements.bundleIdentity.textContent = [
    state.currentCase.current.generatedAt,
    shortDigest(state.currentCase.current.bindingDigest),
    state.currentCase.current.builder.revision,
  ].join(" · ");
}

function renderAll() {
  syncLayerControls();
  renderCaseIdentity();
  renderStanding();
  renderComparison();
  renderGraph();
  renderEvidence();
}

async function selectCase(caseId) {
  const fixtureCase = state.fixtureCases.find((candidate) => candidate.id === caseId);
  if (fixtureCase === undefined) throw new Error(`未知证据案例：${caseId}`);
  state.currentCase = fixtureCase;
  elements.caseSelect.value = fixtureCase.id;
  state.model = buildLensModel(fixtureCase.current);
  state.selectedId = state.sourceOnly ? "task" : "execution-standing";
  state.focusedId = null;
  ensureVisibleSelection();
  state.comparisonEnabled = false;
  state.diff = null;
  state.comparison = fixtureCase.prior === null
    ? { available: false, reasons: [{ code: "prior-missing", message: "未保留上一份证据包。" }] }
    : await comparisonCompatibility(fixtureCase.current, fixtureCase.prior)
      .then((result) => ({ available: result.compatible, reasons: result.reasons }));
  if (state.comparison.available) {
    state.diff = diffLensModels(
      state.model,
      buildLensModel(fixtureCase.prior),
    );
  }
  renderAll();
}

function bindControls() {
  elements.caseSelect.addEventListener("change", () => selectCase(elements.caseSelect.value));
  document.querySelectorAll("[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      state.layers[input.dataset.layer] = input.checked;
      ensureVisibleSelection();
      renderGraph();
      renderEvidence();
      renderStanding();
    });
  });
  elements.sourceOnly.addEventListener("change", () => {
    Object.assign(state, applySourceOnlyMode({
      sourceOnly: elements.sourceOnly.checked,
      comparisonEnabled: state.comparisonEnabled,
    }));
    ensureVisibleSelection();
    renderAll();
  });
  elements.comparisonToggle.addEventListener("change", () => {
    state.comparisonEnabled = elements.comparisonToggle.checked && state.comparison.available;
    renderComparison();
    renderGraph();
  });
  elements.clearFocus.addEventListener("click", () => {
    state.focusedId = null;
    renderGraph();
  });
}

function showFatal(error) {
  const fragment = document.querySelector("#fatal-template").content.cloneNode(true);
  fragment.querySelector("p").textContent = error instanceof Error ? error.message : String(error);
  document.body.replaceChildren(fragment);
}

async function main() {
  const response = await fetch("./fixtures/evidence-bundles.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`证据夹具请求失败：HTTP ${response.status}`);
  const index = await response.json();
  for (const fixtureCase of index.cases) {
    const validation = await validateEvidenceBundle(fixtureCase.current);
    if (!validation.valid) {
      throw new Error(`${fixtureCase.label} 的当前证据包验证失败：${validation.errors.map((error) => error.message).join(" ")}`);
    }
  }
  state.fixtureCases = index.cases;
  for (const fixtureCase of state.fixtureCases) {
    const option = document.createElement("option");
    option.value = fixtureCase.id;
    option.textContent = fixtureCase.label;
    elements.caseSelect.append(option);
  }
  bindControls();
  const defaultCase = state.fixtureCases.find((fixtureCase) => fixtureCase.id === DEFAULT_CASE_ID);
  await selectCase((defaultCase ?? state.fixtureCases[0]).id);
}

main().catch(showFatal);
