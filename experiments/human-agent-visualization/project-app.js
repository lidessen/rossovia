import { validateProjectBundle } from "./lib/project-evidence-bundle.js";
import { DEFAULT_PROJECT_MODE, projectChangeImpactView, projectEvidenceView } from "./lib/project-view-state.js";

const state = {
  bundle: null,
  selectedId: null,
  sourceOnly: false,
  layers: { source: true, projection: true, explanation: true },
  mode: DEFAULT_PROJECT_MODE,
};

const elements = {
  title: document.querySelector("#project-title"),
  question: document.querySelector("#project-question"),
  intent: document.querySelector("#project-intent"),
  revision: document.querySelector("#project-revision"),
  binding: document.querySelector("#project-binding"),
  root: document.querySelector("#project-root"),
  path: document.querySelector("#project-guided-path"),
  sourceOnly: document.querySelector("#project-source-only"),
  evidenceTitle: document.querySelector("#project-evidence-title"),
  evidenceKind: document.querySelector("#project-evidence-kind"),
  evidenceDetails: document.querySelector("#project-evidence-details"),
  sourceActions: document.querySelector("#project-source-actions"),
  sourceExcerpt: document.querySelector("#project-source-excerpt"),
  overview: document.querySelector("#project-overview"),
  changeImpact: document.querySelector("#project-change-impact"),
  changeIdentity: document.querySelector("#project-change-identity"),
  compatibilityReasons: document.querySelector("#project-compatibility-reasons"),
  changeList: document.querySelector("#project-change-list"),
  unresolved: document.querySelector("#project-unresolved"),
};

function short(value, size = 32) { return value.length > size ? `${value.slice(0, size - 1)}…` : value; }
function layerLabel(layer) { return { source: "来源", projection: "确定性投影", explanation: "Agent 解释" }[layer]; }
function visible(layer) { return state.sourceOnly ? layer === "source" : state.layers[layer]; }

function appendDefinition(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value;
  elements.evidenceDetails.append(term, definition);
}

function renderEvidence() {
  const step = state.bundle.projection.steps.find((candidate) => candidate.id === state.selectedId);
  const view = projectEvidenceView(step, { sourceOnly: state.sourceOnly });
  elements.evidenceTitle.textContent = view.title;
  elements.evidenceKind.textContent = view.kind;
  elements.evidenceDetails.replaceChildren();
  for (const [label, value] of view.details) appendDefinition(label, value);
  elements.sourceActions.replaceChildren();
  for (const sourceRef of view.sourceRefs) {
    const row = document.createElement("div");
    const code = document.createElement("code");
    code.textContent = sourceRef;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "复制来源";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(sourceRef);
      button.textContent = "已复制";
      window.setTimeout(() => { button.textContent = "复制来源"; }, 1000);
    });
    row.append(code, button);
    elements.sourceActions.append(row);
  }
  elements.sourceExcerpt.textContent = view.excerpt;
}

function renderPath() {
  elements.path.replaceChildren();
  const steps = state.bundle.projection.steps.filter((step) => visible(step.layer));
  if (!steps.some((step) => step.id === state.selectedId)) state.selectedId = steps[0]?.id ?? null;
  for (const step of steps) {
    const item = document.createElement("li");
    item.className = `guided-step ${step.layer}${step.id === state.selectedId ? " selected" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span class="step-order">${String(step.order).padStart(2, "0")}</span><span class="step-layer">${layerLabel(step.layer)}</span>`;
    const title = document.createElement("strong"); title.textContent = step.title;
    const summary = document.createElement("span"); summary.className = "step-summary"; summary.textContent = step.summary;
    const standing = document.createElement("code"); standing.className = "step-standing"; standing.textContent = step.evidence.standing;
    button.append(title, summary, standing);
    button.addEventListener("click", () => {
      state.selectedId = step.id;
      renderPath();
      document.querySelector("#project-evidence-drawer").scrollIntoView({ block: "nearest" });
    });
    item.append(button); elements.path.append(item);
  }
  renderEvidence();
}

function appendImpactBlock(container, label, value, className) {
  const block = document.createElement("div");
  block.className = `impact-block ${className}`;
  const heading = document.createElement("span");
  heading.className = "field-label";
  heading.textContent = label;
  const content = document.createElement("p");
  content.textContent = value;
  block.append(heading, content);
  container.append(block);
}

function renderChangeImpact() {
  const view = projectChangeImpactView(state.bundle);
  elements.changeIdentity.replaceChildren();
  for (const [label, value] of view.identity) {
    const row = document.createElement("div");
    const term = document.createElement("dt"); term.textContent = label;
    const definition = document.createElement("dd"); definition.textContent = value;
    if (label === "Dirty overlay" && view.dirtyPaths.length) {
      definition.title = view.dirtyPaths.join("\n");
      definition.setAttribute("aria-label", `${value}: ${view.dirtyPaths.join(", ")}`);
    }
    row.append(term, definition); elements.changeIdentity.append(row);
  }
  elements.compatibilityReasons.textContent = view.compatibilityReasons.join(" ");
  elements.changeList.replaceChildren();
  if (!view.highlightedResponsibilities.length) {
    const empty = document.createElement("p");
    empty.className = "change-empty";
    empty.textContent = "当前比较没有可突出显示的 changed / disputed responsibility；检查下方 unresolved。";
    elements.changeList.append(empty);
  }
  for (const responsibility of view.highlightedResponsibilities) {
    const details = document.createElement("details");
    details.className = `responsibility-card ${responsibility.standing}`;
    const summary = document.createElement("summary");
    const title = document.createElement("strong"); title.textContent = responsibility.title;
    const standing = document.createElement("code"); standing.textContent = responsibility.standing;
    const hint = document.createElement("span"); hint.textContent = "展开检查精确来源与 revision";
    summary.append(title, standing, hint);
    const body = document.createElement("div"); body.className = "responsibility-body";
    appendImpactBlock(body, "Design says", responsibility.designSays.summary, "design-says");
    const paths = responsibility.codeObservation.changedPaths.map((change) => `${change.path} [${change.overlays.join("+")}]`);
    appendImpactBlock(body, "Code observation", paths.join("\n") || "显式实现范围内没有观察到文件变化。", "code-observation");
    appendImpactBlock(body, "Reconciliation standing", responsibility.reconciliation.summary, "reconciliation");
    if (responsibility.designSays.current) {
      const source = document.createElement("p"); source.className = "exact-source";
      const location = responsibility.designSays.current;
      source.textContent = `${location.sourceRef}:L${location.lineStart}-L${location.lineEnd} @ ${location.revision}`;
      body.append(source);
    }
    details.append(summary, body); elements.changeList.append(details);
  }
  elements.unresolved.replaceChildren();
  if (!view.unresolved.length) {
    const item = document.createElement("li"); item.textContent = "当前显式责任范围没有 unresolved relation。";
    elements.unresolved.append(item);
  }
  for (const unresolved of view.unresolved) {
    const item = document.createElement("li");
    const standing = document.createElement("code"); standing.textContent = unresolved.standing;
    const summary = document.createElement("span"); summary.textContent = unresolved.summary;
    item.append(standing, summary); elements.unresolved.append(item);
  }
}

function setMode(mode) {
  state.mode = mode;
  const overview = mode === "overview";
  elements.overview.hidden = !overview;
  elements.changeImpact.hidden = overview;
  document.querySelectorAll("[data-project-mode]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.projectMode === mode));
  });
}

function bindControls() {
  document.querySelectorAll("[data-project-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.projectMode));
  });
  document.querySelectorAll("[data-project-layer]").forEach((input) => {
    input.addEventListener("change", () => { state.layers[input.dataset.projectLayer] = input.checked; renderPath(); });
  });
  elements.sourceOnly.addEventListener("change", () => {
    state.sourceOnly = elements.sourceOnly.checked;
    document.querySelectorAll("[data-project-layer]").forEach((input) => {
      input.disabled = state.sourceOnly;
      input.checked = state.sourceOnly ? input.dataset.projectLayer === "source" : state.layers[input.dataset.projectLayer];
    });
    renderPath();
  });
}

function showFatal(error) {
  const fragment = document.querySelector("#project-fatal-template").content.cloneNode(true);
  fragment.querySelector("p").textContent = error instanceof Error ? error.message : String(error);
  document.body.replaceChildren(fragment);
}

async function main() {
  const parameters = new URLSearchParams(location.search);
  const bundlePath = parameters.get("bundle") ?? "./generated/project-evidence-bundle.json";
  const expectedBindingDigest = parameters.get("binding");
  if (!bundlePath.startsWith("./generated/") || bundlePath.includes("..")) throw new Error("只允许读取 generated/ 下的本地证据包。");
  if (!expectedBindingDigest) throw new Error("缺少 CLI 生成的 bundle binding；请使用 bun run introduce 打印的完整 URL。");
  const response = await fetch(`./api/project-bundle?path=${encodeURIComponent(bundlePath)}&binding=${encodeURIComponent(expectedBindingDigest)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`证据包请求失败：HTTP ${response.status}。先运行 bun run introduce。`);
  const bundle = await response.json();
  const validation = await validateProjectBundle(bundle);
  if (!validation.valid) throw new Error(validation.errors.map((error) => error.message).join(" "));
  state.bundle = bundle;
  state.selectedId = bundle.projection.steps[0]?.id ?? null;
  elements.title.textContent = `${bundle.subject.id} 是什么，应该从哪里开始？`;
  elements.question.textContent = bundle.subject.question;
  elements.intent.textContent = `${bundle.subject.intent} · ${bundle.subject.audience}`;
  elements.revision.textContent = short(bundle.subject.revision);
  elements.binding.textContent = short(bundle.bindingDigest);
  elements.root.textContent = bundle.subject.root;
  bindControls(); renderPath(); renderChangeImpact(); setMode(DEFAULT_PROJECT_MODE);
}

main().catch(showFatal);
