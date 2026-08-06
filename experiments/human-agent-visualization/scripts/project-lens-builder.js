import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { canonicalJson, digestValue } from "../lib/evidence-bundle.js";
import {
  finalizeProjectBundle,
  PROJECT_BUILDER_ID,
  PROJECT_BUILDER_REVISION,
  PROJECT_BUNDLE_VERSION,
} from "../lib/project-evidence-bundle.js";

const OMIT = new Set([".git", ".work-cell", ".reasonix", "node_modules", "dist", "build", "target", "coverage", "generated", "outputs", ".next"]);
const SOURCE_CANDIDATES = [
  "README.md", "README.zh-CN.md", "README.zh.md", "AGENTS.md", "DESIGN.md", "ARCHITECTURE.md", "CONTRIBUTING.md",
  "package.json", "pyproject.toml", "Cargo.toml", "Makefile", "principles/SEQUENCE.md",
];

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

async function git(root, args) {
  const result = Bun.spawnSync(["git", "-C", root, ...args], { stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0 ? result.stdout.toString().trim() : "";
}

function excerpt(content, max = 2600) {
  return content.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function firstProse(content) {
  const paragraphs = content.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/);
  return paragraphs.map((value) => value.replace(/^#+\s+.*$/gm, "").replace(/^>\s?/gm, "").trim())
    .find((value) => value.length > 40) ?? "项目没有提供足以重建用途的 README 段落。";
}

async function walk(root, current = root, collected = []) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (OMIT.has(entry.name) || entry.name.startsWith(".DS_Store")) continue;
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) await walk(root, absolute, collected);
    else if (entry.isFile()) collected.push(relative(root, absolute));
  }
  return collected;
}

async function fullFileDigest(path) {
  const digest = await crypto.subtle.digest("SHA-256", await Bun.file(path).arrayBuffer());
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function sourceTreeRevision(root, files) {
  const identities = [];
  for (const sourceRef of files) {
    identities.push({ sourceRef, digest: await fullFileDigest(join(root, sourceRef)) });
  }
  return digestValue(identities);
}

function verificationCommands(manifest, sourceRef = "package.json") {
  if (!manifest) return [];
  try {
    const parsed = JSON.parse(manifest);
    return Object.entries(parsed.scripts ?? {})
      .filter(([name]) => /^(test|check|typecheck|lint|build|verify)/.test(name))
      .map(([name, command]) => ({ name, command: `bun run ${name}`, declaredCommand: String(command), sourceRef }));
  } catch { return []; }
}

function documentedCommands(sources) {
  const prefixes = /^(bun|npm|pnpm|yarn|python3|pytest|cargo|go test|make)\b/;
  const commands = [];
  for (const source of sources.filter((candidate) => candidate.kind === "declared-document")) {
    let fenced = false;
    for (const rawLine of source.excerpt.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("```")) { fenced = !fenced; continue; }
      if (!fenced || !prefixes.test(line)) continue;
      commands.push({ name: `documented:${source.sourceRef}`, command: line, declaredCommand: line, sourceRef: source.sourceRef });
    }
  }
  return commands;
}

function likelyEntrypoints(files) {
  const patterns = [/(^|\/)src\/(index|main|app)\.[cm]?[jt]sx?$/, /(^|\/)(index|main|app)\.[cm]?[jt]sx?$/, /(^|\/)Cargo\.toml$/, /(^|\/)pyproject\.toml$/];
  return files.filter((file) => patterns.some((pattern) => pattern.test(file))).slice(0, 8);
}

function sourceStep(id, order, title, summary, source, standing = "source-declared") {
  return {
    id, order, layer: "source", title, summary,
    evidence: {
      authority: "仓库内保留的声明来源",
      sourceRefs: [source.sourceRef],
      revision: source.revision,
      standing,
      disconfirmingEvidence: "来源被修改、移除或由更高优先级的项目声明取代时，需要重建。",
      excerpt: source.excerpt,
    },
  };
}

function derivedStep(id, order, title, summary, sources, standing, excerptValue) {
  return {
    id, order, layer: "projection", title, summary,
    evidence: {
      authority: "从当前 revision 的文件与 manifest 确定性重建",
      sourceRefs: sources.map((source) => source.sourceRef),
      revision: PROJECT_BUILDER_REVISION,
      standing,
      disconfirmingEvidence: "文件集合、manifest 或 revision 改变时，该投影必须重建。",
      excerpt: excerptValue,
    },
  };
}

function explanationStep(id, order, title, summary, sources, excerptValue) {
  return {
    id, order, layer: "explanation", title, summary,
    evidence: {
      authority: "面向当前问题的 Agent 路径建议；没有事实接受权",
      sourceRefs: sources.map((source) => source.sourceRef),
      revision: PROJECT_BUILDER_REVISION,
      standing: "agent-interpretation",
      disconfirmingEvidence: "若项目声明了不同入口、责任边界或变更流程，应以该来源为准并重建建议。",
      excerpt: excerptValue,
    },
  };
}

export async function buildProjectLensBundle({ repo, intent = "understand", audience = "项目负责人", question, focusSources = [], proposedVerifications = [] }) {
  const root = resolve(repo);
  const rootReal = await realpath(root);
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new TypeError(`Repo path is not a directory: ${root}`);
  const files = await walk(root);
  if (files.length === 0) throw new TypeError(`Repo contains no inspectable files: ${root}`);
  const head = await git(root, ["rev-parse", "HEAD"]);
  const dirty = Boolean(await git(root, ["status", "--porcelain"]));
  const treeRevision = await sourceTreeRevision(root, files);
  const revision = head ? `${head}+tree:${treeRevision.slice("sha256:".length)}` : `tree:${treeRevision.slice("sha256:".length)}`;

  const normalizedFocusSources = focusSources.map((candidate) => {
    const absolute = resolve(root, candidate);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new TypeError(`Focus source is outside the repo: ${candidate}`);
    }
    return relative(root, absolute);
  });

  const selectedCandidates = [...new Set([...SOURCE_CANDIDATES, ...normalizedFocusSources])];
  const retained = [];
  const fullContents = new Map();
  for (const candidate of selectedCandidates) {
    const absolute = resolve(root, candidate);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new TypeError(`Focus source is outside the repo: ${candidate}`);
    }
    const path = absolute;
    if (!(await exists(path))) continue;
    const targetReal = await realpath(path);
    if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${sep}`)) {
      throw new TypeError(`Focus source resolves outside the repo: ${candidate}`);
    }
    const fullContent = await readFile(path, "utf8");
    fullContents.set(candidate, fullContent);
    const content = excerpt(fullContent);
    const sourceRevision = await digestValue(fullContent);
    retained.push({
      id: `source:${candidate}`,
      kind: candidate.endsWith(".json") || candidate.endsWith(".toml") || candidate === "Makefile" ? "manifest" : "declared-document",
      sourceRef: candidate,
      revision: sourceRevision,
      excerpt: content,
      digest: await digestValue({ sourceRef: candidate, revision: sourceRevision, excerpt: content }),
    });
  }
  if (retained.length === 0) {
    const fallback = files[0];
    const fullContent = await readFile(join(root, fallback), "utf8");
    fullContents.set(fallback, fullContent);
    const content = excerpt(fullContent);
    const sourceRevision = await digestValue(fullContent);
    retained.push({ id: `source:${fallback}`, kind: "observed-file", sourceRef: fallback, revision: sourceRevision, excerpt: content, digest: await digestValue({ sourceRef: fallback, revision: sourceRevision, excerpt: content }) });
  }

  const prefersChinese = /[\u3400-\u9fff]/.test(`${audience}${question ?? ""}`);
  const declaredPurpose = (prefersChinese
    ? retained.find((source) => ["README.zh-CN.md", "README.zh.md"].includes(source.sourceRef))
    : null) ?? retained.find((source) => source.sourceRef === "README.md");
  const readme = declaredPurpose ?? retained[0];
  const governing = retained.filter((source) => /^(AGENTS|DESIGN|ARCHITECTURE|CONTRIBUTING|principles\/SEQUENCE)/.test(source.sourceRef));
  const manifest = retained.find((source) => source.sourceRef === "package.json");
  const commands = [...verificationCommands(fullContents.get("package.json")), ...documentedCommands(retained)]
    .filter((command, index, all) => all.findIndex((candidate) => candidate.command === command.command) === index);
  const commandSources = [...new Set(commands.map((command) => command.sourceRef))]
    .map((sourceRef) => retained.find((source) => source.sourceRef === sourceRef))
    .filter(Boolean);
  const entries = likelyEntrypoints(files);
  const topLevel = [...new Set(files.map((file) => file.split("/")[0]))].slice(0, 16);
  const purposeStep = declaredPurpose
    ? sourceStep("purpose", 1, "项目声明的用途", firstProse(declaredPurpose.excerpt), declaredPurpose)
    : derivedStep("purpose", 1, "项目用途声明不可用", "没有观察到 README 用途声明；不能从代码或 manifest 片段补成项目用途。", retained, "purpose-unavailable", `unavailable: README purpose declaration; observed ${retained.map((source) => source.sourceRef).join(", ")}`);
  const steps = [
    purposeStep,
    derivedStep("revision", 2, "这次介绍绑定的修订", `${basename(root)} · ${revision.slice(0, 18)}${dirty ? " · 含工作树修改" : ""}`, retained, "observed-revision", `${files.length} 个可检查文件；顶层：${topLevel.join("、")}`),
  ];
  if (governing[0]) steps.push(derivedStep("governing-source", steps.length + 1, "观察到的治理／设计来源", governing.map((source) => source.sourceRef).join(" → "), governing, "declared-governing-sources", governing.map((source) => source.sourceRef).join("\n")));
  steps.push(derivedStep("observed-entry", steps.length + 1, "可观察的代码入口", entries.length ? entries.join(" → ") : "仓库没有暴露常见代码入口；不要从目录名补成架构。", manifest ? [manifest] : [readme], entries.length ? "observed-entrypoints" : "entrypoint-unavailable", entries.join("\n") || "unavailable"));
  const focused = normalizedFocusSources.map((path) => retained.find((source) => source.sourceRef === path)).filter(Boolean);
  const arrivalSources = [...new Set([...(focused.length ? focused : [readme, ...governing.slice(0, 2)]), ...commandSources.slice(0, 1)])];
  steps.push(explanationStep("arrival-path", steps.length + 1, `${intent} 的建议到达路径`, `面向“${audience}”，先读声明来源，再沿一个可观察入口到验证面；这条顺序是 Agent 选择，不是仓库事实。`, arrivalSources, `${arrivalSources.map((source) => source.sourceRef).join(" → ")} → ${commands[0]?.command ?? "verification unavailable"}`));
  steps.push(derivedStep("verification", steps.length + 1, "仓库声明的验证面", commands.length ? commands.map((command) => command.command).join(" · ") : "没有从 manifest 或保留文档观察到验证命令。", commands.length ? commandSources : (manifest ? [manifest] : [readme]), commands.length ? "declared-verification" : "verification-unavailable", commands.map((command) => `${command.command} ← ${command.declaredCommand} (${command.sourceRef})`).join("\n") || "unavailable"));
  if (proposedVerifications.length) {
    steps.push(explanationStep("proposed-verification", steps.length + 1, "Agent 建议实际运行的验证", proposedVerifications.join(" · "), arrivalSources, proposedVerifications.join("\n")));
  }
  steps.push(explanationStep("uncertainty", steps.length + 1, "仍然不能从扫描结果断言的关系", "组件所有权、真实调用路径和变更影响没有被文件存在性证明；需要项目声明或更窄的代码证据。", retained.slice(0, 3), "unavailable: accepted component map, ownership graph, verified call path, change impact"));

  return finalizeProjectBundle({
    version: PROJECT_BUNDLE_VERSION,
    builder: { id: PROJECT_BUILDER_ID, revision: PROJECT_BUILDER_REVISION },
    generatedAt: new Date().toISOString(),
    subject: {
      id: basename(root), root, revision, dirty, intent, audience,
      question: question || `这个项目是做什么的，面向 ${intent} 应从哪里开始，哪些说法可以信？`,
      focusSources: normalizedFocusSources,
      proposedVerifications,
    },
    sources: retained,
    projection: { steps, verificationCommands: commands, proposedVerifications, observedFiles: files.length },
  });
}

export async function validateProjectBundleAgainstRepository(bundle, { expectedBindingDigest } = {}) {
  try {
    const rebuilt = await buildProjectLensBundle({
      repo: bundle.subject.root,
      intent: bundle.subject.intent,
      audience: bundle.subject.audience,
      question: bundle.subject.question,
      focusSources: bundle.subject.focusSources ?? [],
      proposedVerifications: bundle.subject.proposedVerifications ?? [],
    });
    const errors = [];
    if (!expectedBindingDigest || expectedBindingDigest !== bundle.bindingDigest) {
      errors.push({ code: "request-binding-mismatch", message: "The Project Lens URL is not bound to this generated bundle." });
    }
    if (canonicalJson(rebuilt.subject) !== canonicalJson(bundle.subject)) {
      errors.push({ code: "repository-subject-mismatch", message: "Project subject does not match a fresh repository rebuild." });
    }
    if (rebuilt.subject.revision !== bundle.subject.revision) {
      errors.push({ code: "repository-revision-mismatch", message: "The repository source-tree revision changed after this bundle was built." });
    }
    if (canonicalJson(rebuilt.sources) !== canonicalJson(bundle.sources)) {
      errors.push({ code: "repository-sources-mismatch", message: "Retained sources do not match a fresh repository scan." });
    }
    if (canonicalJson(rebuilt.projection) !== canonicalJson(bundle.projection)) {
      errors.push({ code: "repository-projection-mismatch", message: "Project projection does not match a fresh deterministic rebuild." });
    }
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [{ code: "repository-rebuild-failed", message: error.message }] };
  }
}
