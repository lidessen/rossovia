import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { canonicalJson, digestValue } from "../lib/evidence-bundle.js";
import {
  finalizeProjectBundle,
  PROJECT_BUILDER_ID,
  PROJECT_BUILDER_REVISION,
  PROJECT_BUNDLE_VERSION,
  PROJECT_COMPARISON_CONTRACT,
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

function gitResult(root, args) {
  return Bun.spawnSync(["git", "-C", root, ...args], { stdout: "pipe", stderr: "pipe" });
}

function normalizeRepoPath(root, candidate, label) {
  const absolute = resolve(root, candidate);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
    throw new TypeError(`${label} is outside the repo: ${candidate}`);
  }
  return relative(root, absolute).replaceAll("\\", "/");
}

function normalizeResponsibilities(root, responsibilities) {
  return responsibilities.map((responsibility, index) => {
    if (!responsibility || typeof responsibility !== "object") {
      throw new TypeError(`Responsibility ${index + 1} must be a JSON object.`);
    }
    const sourceRef = responsibility.design?.sourceRef;
    const heading = responsibility.design?.heading;
    if (!sourceRef || !heading) {
      throw new TypeError(`Responsibility ${index + 1} requires design.sourceRef and design.heading.`);
    }
    const implementationScopes = responsibility.implementationScopes ?? [];
    const verificationRefs = responsibility.verificationRefs ?? [];
    if (!Array.isArray(implementationScopes) || !Array.isArray(verificationRefs)) {
      throw new TypeError(`Responsibility ${index + 1} scopes and verification refs must be arrays.`);
    }
    return {
      id: responsibility.id || `responsibility-${index + 1}`,
      title: responsibility.title || heading,
      design: { sourceRef: normalizeRepoPath(root, sourceRef, "Design source"), heading },
      implementationScopes: implementationScopes.map((value) => normalizeRepoPath(root, value, "Implementation scope")),
      verificationRefs: verificationRefs.map((value) => normalizeRepoPath(root, value, "Verification source")),
    };
  });
}

function parseDirtyStatus(output) {
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => {
    const rawPath = line.slice(3).trim();
    const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;
    return { status: line.slice(0, 2), path, overlay: "dirty" };
  });
}

function parseCommittedChanges(output) {
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => {
    const [status, ...paths] = line.split("\t");
    return { status, path: paths.at(-1), overlay: "committed" };
  });
}

function combineChanges(committed, dirty) {
  const combined = new Map();
  for (const change of [...committed, ...dirty]) {
    if (!change.path) continue;
    const current = combined.get(change.path) ?? { path: change.path, statuses: [], overlays: [] };
    if (!current.statuses.includes(change.status)) current.statuses.push(change.status);
    if (!current.overlays.includes(change.overlay)) current.overlays.push(change.overlay);
    combined.set(change.path, current);
  }
  return [...combined.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function pathInScope(path, scope) {
  return path === scope || path.startsWith(scope.endsWith("/") ? scope : `${scope}/`);
}

function markdownSection(content, heading) {
  if (!content) return null;
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let start = -1;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match && match[2] === heading) {
      start = index;
      level = match[1].length;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  const sectionContent = lines.slice(start, end).join("\n");
  return {
    lineStart: start + 1,
    lineEnd: end,
    content: sectionContent,
    excerpt: excerpt(sectionContent, 1800),
  };
}

async function contentAtRevision(root, revision, sourceRef) {
  if (!revision) return "";
  const result = gitResult(root, ["show", `${revision}:${sourceRef}`]);
  return result.exitCode === 0 ? result.stdout.toString() : "";
}

async function buildComparison({ root, head, currentRevision, dirtyChanges, baseRevision, responsibilities, retained, fullContents }) {
  const resolvedBase = baseRevision && head
    ? await git(root, ["rev-parse", "--verify", `${baseRevision}^{commit}`])
    : "";
  const ancestor = resolvedBase && head
    ? gitResult(root, ["merge-base", "--is-ancestor", resolvedBase, head]).exitCode === 0
    : false;
  const reasons = [];
  let standing = "compatible";
  if (!head) {
    standing = "unavailable";
    reasons.push("当前主体不是可比较的 Git revision。");
  } else if (!baseRevision) {
    standing = "unavailable";
    reasons.push("没有显式选择 base revision。");
  } else if (!resolvedBase) {
    standing = "incompatible";
    reasons.push(`base revision '${baseRevision}' 无法解析为 commit。`);
  } else if (!ancestor) {
    standing = "incompatible";
    reasons.push("base revision 不是 current HEAD 的 ancestor。");
  }

  const committed = standing === "compatible"
    ? parseCommittedChanges((await git(root, ["diff", "--name-status", `${resolvedBase}..${head}`])))
    : [];
  const changes = combineChanges(committed, dirtyChanges);
  const sourceByRef = new Map(retained.map((source) => [source.sourceRef, source]));
  const unresolved = [];
  const projectedResponsibilities = [];

  for (const responsibility of responsibilities) {
    const currentContent = fullContents.get(responsibility.design.sourceRef) ?? "";
    const currentSection = markdownSection(currentContent, responsibility.design.heading);
    const currentSource = sourceByRef.get(responsibility.design.sourceRef);
    const baseContent = standing === "compatible"
      ? await contentAtRevision(root, resolvedBase, responsibility.design.sourceRef)
      : "";
    const baseSection = markdownSection(baseContent, responsibility.design.heading);
    const verificationChanges = changes.filter((change) => responsibility.verificationRefs.includes(change.path));
    const scopedChanges = changes.filter((change) => change.path !== responsibility.design.sourceRef
      && !responsibility.verificationRefs.includes(change.path)
      && responsibility.implementationScopes.some((scope) => pathInScope(change.path, scope)));
    const currentSectionDigest = currentSection ? await digestValue(currentSection.content) : null;
    const baseSectionDigest = baseSection ? await digestValue(baseSection.content) : null;
    const designSectionChanged = standing === "compatible"
      && (Boolean(currentSection) !== Boolean(baseSection) || currentSectionDigest !== baseSectionDigest);

    let relationStanding = "unchanged";
    let reconciliation = "设计段落和显式实现范围均未观察到变化。";
    if (!currentSection || !currentSource) {
      relationStanding = "unavailable";
      reconciliation = "找不到指定的权威设计段落；不能用目录结构补成责任边界。";
      unresolved.push({ id: `${responsibility.id}:design-unavailable`, responsibilityId: responsibility.id, standing: "unavailable", summary: reconciliation });
    } else if (standing !== "compatible") {
      relationStanding = "unavailable";
      reconciliation = "比较不兼容；当前设计声明仍可检查，但不能产生 revision impact。";
      unresolved.push({ id: `${responsibility.id}:comparison-unavailable`, responsibilityId: responsibility.id, standing, summary: reconciliation });
    } else if (scopedChanges.length && !designSectionChanged) {
      relationStanding = "disputed";
      reconciliation = "显式实现范围发生变化，而对应设计段落未变化；责任影响需要人工协调。";
      unresolved.push({ id: `${responsibility.id}:implementation-design-gap`, responsibilityId: responsibility.id, standing: "disputed", summary: reconciliation });
    } else if (designSectionChanged || scopedChanges.length) {
      relationStanding = "changed";
      reconciliation = "精确设计段落或显式实现范围发生变化；这里仅确认需复核的责任影响，不自动接受新架构。";
      unresolved.push({
        id: `${responsibility.id}:requires-review`,
        responsibilityId: responsibility.id,
        standing: "requires-review",
        summary: "该 changed responsibility 尚无来源支持的协调或验证结果；完成并保留该结果前不得显示为无未决项。",
        sourceRefs: [...new Set([
          responsibility.design.sourceRef,
          ...scopedChanges.map((change) => change.path),
          ...verificationChanges.map((change) => change.path),
        ])],
        baseRevision: resolvedBase,
        currentRevision,
        clearsWhen: "保留一个可追溯到此 base/current pair 的协调或验证结果。",
      });
    } else if (verificationChanges.length) {
      relationStanding = "disputed";
      reconciliation = "验证来源发生变化，但设计与实现范围未变化；证据 standing 需要复核。";
      unresolved.push({ id: `${responsibility.id}:verification-gap`, responsibilityId: responsibility.id, standing: "disputed", summary: reconciliation });
    }

    projectedResponsibilities.push({
      id: responsibility.id,
      title: responsibility.title,
      standing: relationStanding,
      selectionAuthority: "Agent 明示的调查范围；不因此获得架构事实权",
      designSays: {
        heading: responsibility.design.heading,
        summary: currentSection?.excerpt ?? "unavailable",
        changed: designSectionChanged,
        current: currentSection && currentSource ? {
          sourceRef: currentSource.sourceRef,
          lineStart: currentSection.lineStart,
          lineEnd: currentSection.lineEnd,
          revision: currentSource.revision,
          sectionDigest: currentSectionDigest,
        } : null,
        base: baseSection ? {
          sourceRef: responsibility.design.sourceRef,
          lineStart: baseSection.lineStart,
          lineEnd: baseSection.lineEnd,
          revision: await digestValue(baseContent),
          sectionDigest: baseSectionDigest,
        } : null,
      },
      codeObservation: {
        scopes: responsibility.implementationScopes,
        changedPaths: scopedChanges,
        verificationRefs: responsibility.verificationRefs,
        verificationChanges,
        standing: scopedChanges.length ? "observed-change" : "no-observed-change",
      },
      reconciliation: {
        standing: relationStanding,
        summary: reconciliation,
        authority: "可重建 comparison projection；不接受设计或行为事实",
      },
    });
  }

  if (!responsibilities.length) {
    unresolved.push({
      id: "architecture-unavailable",
      responsibilityId: null,
      standing: "unavailable",
      summary: "没有提供可回到权威设计段落的责任范围；Project Lens 不从目录结构猜测架构。",
    });
  }

  return {
    contract: PROJECT_COMPARISON_CONTRACT,
    currentRevision,
    baseRevision: resolvedBase || null,
    requestedBaseRevision: baseRevision || null,
    dirtyOverlay: { present: dirtyChanges.length > 0, paths: dirtyChanges.map((change) => change.path) },
    compatibility: { standing, reasons },
    changes,
    responsibilities: projectedResponsibilities,
    unresolved,
  };
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

export async function buildProjectLensBundle({ repo, intent = "understand", audience = "项目负责人", question, focusSources = [], proposedVerifications = [], baseRevision, responsibilities = [] }) {
  const root = resolve(repo);
  const rootReal = await realpath(root);
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new TypeError(`Repo path is not a directory: ${root}`);
  const files = await walk(root);
  if (files.length === 0) throw new TypeError(`Repo contains no inspectable files: ${root}`);
  const head = await git(root, ["rev-parse", "HEAD"]);
  const dirtyStatusResult = gitResult(root, ["status", "--porcelain"]);
  const dirtyStatus = dirtyStatusResult.exitCode === 0
    ? dirtyStatusResult.stdout.toString().replace(/\n$/, "")
    : "";
  const dirtyChanges = parseDirtyStatus(dirtyStatus);
  const dirty = dirtyChanges.length > 0;
  const treeRevision = await sourceTreeRevision(root, files);
  const revision = head ? `${head}+tree:${treeRevision.slice("sha256:".length)}` : `tree:${treeRevision.slice("sha256:".length)}`;

  const normalizedFocusSources = focusSources.map((candidate) => normalizeRepoPath(root, candidate, "Focus source"));
  const normalizedResponsibilities = normalizeResponsibilities(root, responsibilities);
  const responsibilitySources = normalizedResponsibilities.flatMap((responsibility) => [
    responsibility.design.sourceRef,
    ...responsibility.verificationRefs,
  ]);

  const selectedCandidates = [...new Set([...SOURCE_CANDIDATES, ...normalizedFocusSources, ...responsibilitySources])];
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

  const comparison = await buildComparison({
    root,
    head,
    currentRevision: head || revision,
    dirtyChanges,
    baseRevision,
    responsibilities: normalizedResponsibilities,
    retained,
    fullContents,
  });

  return finalizeProjectBundle({
    version: PROJECT_BUNDLE_VERSION,
    builder: { id: PROJECT_BUILDER_ID, revision: PROJECT_BUILDER_REVISION },
    generatedAt: new Date().toISOString(),
    subject: {
      id: basename(root), root, revision, dirty, intent, audience,
      question: question || `这个项目是做什么的，面向 ${intent} 应从哪里开始，哪些说法可以信？`,
      focusSources: normalizedFocusSources,
      proposedVerifications,
      baseRevision: baseRevision || null,
      responsibilities: normalizedResponsibilities,
    },
    sources: retained,
    projection: { steps, verificationCommands: commands, proposedVerifications, observedFiles: files.length, comparison },
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
      baseRevision: bundle.subject.baseRevision ?? undefined,
      responsibilities: bundle.subject.responsibilities ?? [],
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
