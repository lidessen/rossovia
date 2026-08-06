import { validateSkillEvidenceBundle } from "./lib/skill-evidence-bundle.js";
import { skillStandingCuePresentation } from "./lib/skill-cue-presentation.js";

const state = {
  bundle: null,
  projection: null,
  selectedId: "request",
  sourceOnly: false,
  layers: { source: true, projection: true, explanation: true },
};

const elements = {
  subject: document.querySelector("#skill-subject"),
  revision: document.querySelector("#skill-revision"),
  binding: document.querySelector("#skill-binding"),
  question: document.querySelector("#skill-question"),
  triggerStanding: document.querySelector("#trigger-standing"),
  eligibilityStanding: document.querySelector("#eligibility-standing"),
  activationStanding: document.querySelector("#activation-standing"),
  behaviorStanding: document.querySelector("#behavior-standing"),
  standingStrip: document.querySelector(".standing-strip"),
  sourceOnly: document.querySelector("#skill-source-only"),
  path: document.querySelector("#guided-path"),
  stopTitle: document.querySelector("#stop-title"),
  stopSummary: document.querySelector("#stop-summary"),
  inspectStop: document.querySelector("#inspect-stop"),
  evidenceTitle: document.querySelector("#skill-evidence-title"),
  evidenceKind: document.querySelector("#skill-evidence-kind"),
  evidenceDetails: document.querySelector("#skill-evidence-details"),
  sourceActions: document.querySelector("#source-actions"),
  sourceExcerpt: document.querySelector("#source-excerpt"),
};

function shortRevision(value) {
  return value.length > 30 ? `${value.slice(0, 27)}…` : value;
}

function layerLabel(layer) {
  return { source: "来源", projection: "确定性投影", explanation: "Agent 解释" }[layer] ?? layer;
}

function visibleLayer(layer) {
  return state.sourceOnly ? layer === "source" : state.layers[layer];
}

function appendDefinition(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value;
  elements.evidenceDetails.append(term, definition);
}

async function copySource(sourceRef, button) {
  await navigator.clipboard.writeText(sourceRef);
  const previous = button.textContent;
  button.textContent = "已复制";
  window.setTimeout(() => { button.textContent = previous; }, 1200);
}

function renderEvidenceValue(title, layer, evidence) {
  elements.evidenceTitle.textContent = title;
  elements.evidenceKind.textContent = layerLabel(layer);
  elements.evidenceDetails.replaceChildren();
  appendDefinition("权威边界", evidence.authority);
  appendDefinition("修订", evidence.revision);
  appendDefinition("新鲜度", `冻结于 ${evidence.freshness?.observedAt ?? state.bundle.generatedAt}`);
  appendDefinition("Standing", evidence.standing);
  appendDefinition("可推翻它的证据", evidence.disconfirmingEvidence);
  elements.sourceActions.replaceChildren();
  for (const sourceRef of evidence.sourceRefs ?? [evidence.sourceRef]) {
    const row = document.createElement("div");
    const code = document.createElement("code");
    code.textContent = sourceRef;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "复制来源";
    button.addEventListener("click", () => copySource(sourceRef, button));
    row.append(code, button);
    elements.sourceActions.append(row);
  }
  elements.sourceExcerpt.textContent = evidence.excerpt || "这个冻结记录没有可显示的来源摘录。";
}

function renderEvidence() {
  if (state.selectedId === "authority-stop") {
    const stop = state.projection.authorityStop;
    renderEvidenceValue(stop.title, "source", {
      authority: "Skill 来源声明的 Sequence 与行为证据边界",
      sourceRef: stop.sourceRef,
      sourceRefs: [stop.sourceRef],
      revision: stop.revision,
      freshness: { observedAt: state.bundle.generatedAt },
      standing: stop.standing,
      disconfirmingEvidence: stop.disconfirmingEvidence,
      excerpt: stop.excerpt,
    });
    return;
  }
  const selected = state.projection.steps.find((candidate) => candidate.id === state.selectedId);
  if (selected) renderEvidenceValue(selected.title, selected.layer, selected.evidence);
}

function renderPath() {
  elements.path.replaceChildren();
  const visible = state.projection.steps.filter((step) => visibleLayer(step.layer));
  if (!visible.some((step) => step.id === state.selectedId) && state.selectedId !== "authority-stop") {
    state.selectedId = visible[0]?.id ?? "authority-stop";
  }
  for (const step of visible) {
    const item = document.createElement("li");
    item.className = `guided-step ${step.layer}${step.id === state.selectedId ? " selected" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span class="step-order">${String(step.order).padStart(2, "0")}</span><span class="step-layer">${layerLabel(step.layer)}</span>`;
    const heading = document.createElement("strong");
    heading.textContent = step.title;
    const summary = document.createElement("span");
    summary.className = "step-summary";
    summary.textContent = step.summary;
    const standing = document.createElement("code");
    standing.className = "step-standing";
    standing.textContent = step.evidence.standing;
    button.append(heading, summary, standing);
    button.addEventListener("click", () => {
      state.selectedId = step.id;
      renderPath();
      revealEvidence();
    });
    item.append(button);
    elements.path.append(item);
  }
  renderEvidence();
}

function revealEvidence() {
  const drawer = document.querySelector("#skill-evidence-drawer");
  const mobile = window.matchMedia("(max-width: 700px)").matches;
  drawer.scrollIntoView({ block: mobile ? "start" : "nearest", behavior: "auto" });
  elements.evidenceTitle.focus({ preventScroll: true });
}

function syncControls() {
  document.querySelectorAll("[data-skill-layer]").forEach((input) => {
    input.disabled = state.sourceOnly;
    input.checked = state.sourceOnly
      ? input.dataset.skillLayer === "source"
      : state.layers[input.dataset.skillLayer];
  });
  const hideProjectionStandings = state.sourceOnly || !state.layers.projection;
  document.querySelectorAll('[data-standing-layer="projection"]').forEach((card) => {
    card.hidden = hideProjectionStandings;
  });
  elements.standingStrip.classList.toggle("source-standings-only", hideProjectionStandings);
}

function bindControls() {
  document.querySelectorAll("[data-skill-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      state.layers[input.dataset.skillLayer] = input.checked;
      renderPath();
    });
  });
  elements.sourceOnly.addEventListener("change", () => {
    state.sourceOnly = elements.sourceOnly.checked;
    syncControls();
    renderPath();
  });
  elements.inspectStop.addEventListener("click", () => {
    state.selectedId = "authority-stop";
    renderPath();
    revealEvidence();
  });
}

function renderOrientation() {
  const { subject, standings } = state.projection;
  elements.subject.textContent = `${subject.id} · ${subject.operation}`;
  elements.revision.textContent = `${shortRevision(subject.revision)} · source set ${shortRevision(subject.sourceSetRevision)}`;
  elements.binding.textContent = shortRevision(state.bundle.bindingDigest);
  elements.question.textContent = state.projection.question;
  elements.triggerStanding.textContent = standings.triggerCompatibility;
  elements.eligibilityStanding.textContent = standings.methodEligibility;
  elements.activationStanding.textContent = standings.runtimeActivation;
  elements.behaviorStanding.textContent = standings.behaviorEvidence;
  for (const cue of skillStandingCuePresentation(standings)) {
    const card = document.querySelector(`[data-standing-card="${cue.card}"]`);
    card.dataset.standingLayer = cue.layer;
    card.classList.toggle("evidence-limited", cue.evidenceLimited);
    card.querySelector(".cue-origin").textContent = cue.origin;
    card.querySelector(".cue-fallback").textContent = `缺证据时 · ${cue.fallback}`;
  }
  elements.stopTitle.textContent = state.projection.authorityStop.title;
  elements.stopSummary.textContent = state.projection.authorityStop.summary;
}

function showFatal(error) {
  const fragment = document.querySelector("#skill-fatal-template").content.cloneNode(true);
  fragment.querySelector("p").textContent = error instanceof Error ? error.message : String(error);
  document.body.replaceChildren(fragment);
}

async function main() {
  const response = await fetch("./fixtures/skill-evidence-bundle.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Skill 证据夹具请求失败：HTTP ${response.status}`);
  const bundle = await response.json();
  const validation = await validateSkillEvidenceBundle(bundle);
  if (!validation.valid) throw new Error(validation.errors.map((entry) => entry.message).join(" "));
  state.bundle = bundle;
  state.projection = bundle.projection.value;
  renderOrientation();
  bindControls();
  syncControls();
  renderPath();
}

main().catch(showFatal);
