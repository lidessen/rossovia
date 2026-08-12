import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildProjectLensBundle } from "../scripts/project-lens-builder.js";
import { validateProjectBundle, finalizeProjectBundle, PROJECT_BUILDER_REVISION } from "../lib/project-evidence-bundle.js";
import { validateProjectBundleAgainstRepository } from "../scripts/project-lens-builder.js";
import { digestValue } from "../lib/evidence-bundle.js";

let fixtureRoot;
let outsideFile;

function runGit(repo, ...args) {
  const result = Bun.spawnSync(["git", "-C", repo, ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

beforeAll(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "project-lens-fixture-"));
  await mkdir(join(fixtureRoot, "src"));
  await mkdir(join(fixtureRoot, "tests"));
  await Bun.write(join(fixtureRoot, "README.md"), "# 枝叶\n\n枝叶是一个把本地笔记转成可检索网页的微型工具，面向个人离线使用。\n");
  await Bun.write(join(fixtureRoot, "AGENTS.md"), "# Guidance\n\nChanges start in src/app.js and must pass bun test.\n");
  await Bun.write(join(fixtureRoot, "DESIGN.md"), "# Design\n\nThe browser is a projection over one canonical local state.\n");
  await Bun.write(join(fixtureRoot, "package.json"), JSON.stringify({ name: "branches", scripts: { test: "bun test", check: "bun build src/app.js --outfile=/dev/null" } }));
  await Bun.write(join(fixtureRoot, "src/app.js"), "export const name = 'branches';\n");
  await Bun.write(join(fixtureRoot, "tests/app.test.js"), "// representative test\n");
  outsideFile = join(tmpdir(), `project-lens-outside-${crypto.randomUUID()}.txt`);
  await Bun.write(outsideFile, "OUTSIDE_REPOSITORY_CONTENT\n");
});

afterAll(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
  await rm(outsideFile, { force: true });
});

describe("Project Lens real repository bundle", () => {
  test("builds a source-linked, layered introduction from an arbitrary repo", async () => {
    const bundle = await buildProjectLensBundle({
      repo: fixtureRoot,
      intent: "change",
      audience: "第一次贡献代码的人",
      question: "我要修改这个项目，应从哪里开始？",
      focusSources: ["AGENTS.md", "src/app.js", "tests/app.test.js"],
    });
    const validation = await validateProjectBundle(bundle);
    expect(validation).toEqual({ valid: true, errors: [] });
    expect(bundle.subject.id).toBe(fixtureRoot.split("/").at(-1));
    expect(bundle.subject.root).toBe(fixtureRoot);
    expect(bundle.sources.map((source) => source.sourceRef)).toContain("README.md");
    expect(bundle.projection.steps.map((step) => step.layer)).toEqual(expect.arrayContaining(["source", "projection", "explanation"]));
    expect(bundle.projection.verificationCommands.map((entry) => entry.command)).toContain("bun run test");
    expect(bundle.projection.steps.find((step) => step.id === "arrival-path").evidence.sourceRefs).toEqual(["AGENTS.md", "src/app.js", "tests/app.test.js", "package.json"]);
  });

  test("observed entrypoints cite the observed-tree source without order arrows", async () => {
    const bundle = await buildProjectLensBundle({ repo: fixtureRoot });
    expect(bundle.builder.revision).toBe(PROJECT_BUILDER_REVISION);
    const entry = bundle.projection.steps.find((step) => step.id === "observed-entry");
    expect(entry.layer).toBe("projection");
    expect(entry.evidence.sourceRefs).toEqual([`observed-tree@${bundle.subject.revision}`]);
    expect(bundle.sources.map((source) => source.sourceRef)).toContain(`observed-tree@${bundle.subject.revision}`);
    expect(entry.evidence.revision).toBe(bundle.subject.revision);
    expect(entry.summary).not.toContain("→");
    expect(entry.evidence.excerpt).not.toContain("→");
  });

  test("rejects a bundle whose retained source excerpt was changed", async () => {
    const bundle = await buildProjectLensBundle({ repo: fixtureRoot });
    bundle.sources[0].excerpt = "tampered";
    const validation = await validateProjectBundle(bundle);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.code === "source-digest-mismatch")).toBe(true);
  });

  test("repository verification rejects a self-resigned forged projection", async () => {
    const bundle = await buildProjectLensBundle({ repo: fixtureRoot });
    const expectedBindingDigest = bundle.bindingDigest;
    const source = bundle.sources[0];
    source.excerpt = "fabricated source declaration";
    source.revision = await digestValue("fabricated full content");
    source.digest = await digestValue({ sourceRef: source.sourceRef, revision: source.revision, excerpt: source.excerpt });
    bundle.projection.steps.at(-1).layer = "source";
    bundle.projection.steps.at(-1).summary = "组件所有权和调用路径已被来源证明。";
    const resigned = await finalizeProjectBundle(bundle);

    expect((await validateProjectBundle(resigned)).valid).toBe(true);
    const repositoryValidation = await validateProjectBundleAgainstRepository(resigned, { expectedBindingDigest });
    expect(repositoryValidation.valid).toBe(false);
    expect(repositoryValidation.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "repository-sources-mismatch",
      "repository-projection-mismatch",
      "request-binding-mismatch",
    ]));
  });

  test("the CLI URL binding rejects a self-resigned forged subject and question", async () => {
    const bundle = await buildProjectLensBundle({ repo: fixtureRoot, question: "Original question" });
    const expectedBindingDigest = bundle.bindingDigest;
    bundle.subject.id = "forged-project-name";
    bundle.subject.question = "Forged question shown by the page?";
    const resigned = await finalizeProjectBundle(bundle);

    expect((await validateProjectBundle(resigned)).valid).toBe(true);
    const repositoryValidation = await validateProjectBundleAgainstRepository(resigned, { expectedBindingDigest });
    expect(repositoryValidation.valid).toBe(false);
    expect(repositoryValidation.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "request-binding-mismatch",
      "repository-subject-mismatch",
    ]));
  });

  test("full source and source-tree revisions change beyond the displayed excerpt", async () => {
    const before = await buildProjectLensBundle({ repo: fixtureRoot });
    const longReadme = `${"A".repeat(3000)}\nfirst tail\n`;
    await Bun.write(join(fixtureRoot, "README.md"), longReadme);
    const first = await buildProjectLensBundle({ repo: fixtureRoot });
    await Bun.write(join(fixtureRoot, "README.md"), `${longReadme.slice(0, -11)}second tail\n`);
    const second = await buildProjectLensBundle({ repo: fixtureRoot });

    expect(first.sources.find((source) => source.sourceRef === "README.md").excerpt)
      .toBe(second.sources.find((source) => source.sourceRef === "README.md").excerpt);
    expect(first.sources.find((source) => source.sourceRef === "README.md").revision)
      .not.toBe(second.sources.find((source) => source.sourceRef === "README.md").revision);
    expect(first.subject.revision).not.toBe(second.subject.revision);
    expect(before.subject.revision).not.toBe(first.subject.revision);
  });

  test("verification commands are derived from the full manifest beyond its displayed excerpt", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-large-manifest-"));
    try {
      await Bun.write(join(repo, "README.md"), "# Large manifest fixture\n\nA repository whose manifest is larger than the retained display excerpt.\n");
      await Bun.write(join(repo, "package.json"), JSON.stringify({
        name: "large-manifest",
        description: "x".repeat(3000),
        scripts: { test: "bun test", check: "bun run verify.js" },
      }));

      const bundle = await buildProjectLensBundle({ repo });
      expect(bundle.sources.find((source) => source.sourceRef === "package.json").excerpt.length).toBe(2600);
      expect(bundle.projection.verificationCommands.map((entry) => entry.command))
        .toEqual(expect.arrayContaining(["bun run test", "bun run check"]));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("a repository without a purpose declaration keeps purpose unavailable", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-no-purpose-"));
    try {
      await mkdir(join(repo, "src"));
      await Bun.write(join(repo, "src/app.js"), "export const implementation = true;\n");

      const bundle = await buildProjectLensBundle({ repo });
      const purpose = bundle.projection.steps.find((step) => step.id === "purpose");
      expect(bundle.sources[0].kind).toBe("observed-file");
      expect(purpose.layer).toBe("projection");
      expect(purpose.title).toBe("项目用途声明不可用");
      expect(purpose.evidence.standing).toBe("purpose-unavailable");
      expect(purpose.summary).not.toContain("implementation");
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("generated governance and verification claims retain every contributing source", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-source-links-"));
    try {
      await Bun.write(join(repo, "README.md"), "# Linked evidence\n\nA fixture with commands declared in both its manifest and documentation.\n\n```sh\npython3 verify-docs.py\n```\n");
      await Bun.write(join(repo, "AGENTS.md"), "# Guidance\n\nUse the declared checks before proposing a change.\n");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\nOne deterministic projection is rebuilt from retained sources.\n");
      await Bun.write(join(repo, "package.json"), JSON.stringify({ name: "source-links", scripts: { test: "bun test" } }));
      const bundle = await buildProjectLensBundle({ repo });
      const governing = bundle.projection.steps.find((step) => step.id === "governing-source");
      const verification = bundle.projection.steps.find((step) => step.id === "verification");

      expect(governing.layer).toBe("projection");
      expect(governing.evidence.sourceRefs).toEqual(["AGENTS.md", "DESIGN.md"]);
      expect(verification.summary).toContain("python3 verify-docs.py");
      expect(verification.evidence.sourceRefs).toEqual(expect.arrayContaining(["package.json", "README.md"]));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("compares an explicit base and reconciles a source-backed responsibility with dirty overlay", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-comparison-"));
    try {
      await mkdir(join(repo, "src"));
      await mkdir(join(repo, "tests"));
      await Bun.write(join(repo, "README.md"), "# Comparison fixture\n\nA repository with one declared responsibility boundary for exact comparison.\n");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\n## Project Lens\n\nOwns source-linked explanation. It does not own repository facts.\n\n## Other\n\nUnrelated.\n");
      await Bun.write(join(repo, "src/app.js"), "export const version = 1;\n");
      await Bun.write(join(repo, "tests/app.test.js"), "// check version one\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\n## Project Lens\n\nOwns source-linked current and change explanation. It does not own repository facts.\n\n## Other\n\nUnrelated.\n");
      await Bun.write(join(repo, "src/app.js"), "export const version = 2;\n");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "change design and code");
      await Bun.write(join(repo, "tests/app.test.js"), "// dirty verification overlay\n");

      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [{
          id: "project-lens",
          title: "Project Lens responsibility",
          design: { sourceRef: "DESIGN.md", heading: "Project Lens" },
          implementationScopes: ["src"],
          verificationRefs: ["tests/app.test.js"],
        }],
      });
      const comparison = bundle.projection.comparison;
      const responsibility = comparison.responsibilities[0];

      expect(comparison.compatibility).toEqual({ standing: "compatible", reasons: [] });
      expect(comparison.baseRevision).toBe(base);
      expect(comparison.currentRevision).toBe(runGit(repo, "rev-parse", "HEAD"));
      expect(comparison.dirtyOverlay).toEqual({ present: true, paths: ["tests/app.test.js"] });
      expect(responsibility.standing).toBe("changed");
      expect(responsibility.designSays.current).toMatchObject({ sourceRef: "DESIGN.md", lineStart: 3, lineEnd: 6 });
      expect(responsibility.designSays.changed).toBe(true);
      expect(responsibility.designSays.current.sectionDigest).not.toBe(responsibility.designSays.base.sectionDigest);
      expect(responsibility.designSays.summary).toContain("does not own repository facts");
      expect(responsibility.codeObservation.changedPaths.map((entry) => entry.path)).toEqual(["src/app.js"]);
      expect(comparison.unresolved).toContainEqual(expect.objectContaining({
        id: "project-lens:requires-review",
        responsibilityId: "project-lens",
        standing: "requires-review",
        sourceRefs: ["DESIGN.md", "src/app.js", "tests/app.test.js"],
      }));
      expect((await validateProjectBundle(bundle)).valid).toBe(true);

      bundle.projection.comparison.unresolved = [];
      const withoutReviewObligation = await finalizeProjectBundle(bundle);
      const invalid = await validateProjectBundle(withoutReviewObligation);
      expect(invalid.errors.map((error) => error.code)).toContain("responsibility-review-missing");
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("does not change a responsibility when only another heading in the same design file changes", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-heading-boundary-"));
    try {
      await mkdir(join(repo, "docs"));
      await Bun.write(join(repo, "README.md"), "# Heading boundary\n\nA repository that changes an unrelated design section.\n");
      await Bun.write(join(repo, "docs/DESIGN.md"), "# Design\n\n## Project Lens\n\nOwns source-linked explanation.\n\n## Other\n\nOriginal unrelated text.\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");
      await Bun.write(join(repo, "docs/DESIGN.md"), "# Design\n\n## Project Lens\n\nOwns source-linked explanation.\n\n## Other\n\nChanged unrelated text only.\n");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "change unrelated heading");

      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [{
          id: "project-lens",
          design: { sourceRef: "docs/DESIGN.md", heading: "Project Lens" },
          implementationScopes: ["docs"],
        }],
      });
      const responsibility = bundle.projection.comparison.responsibilities[0];

      expect(responsibility.designSays.changed).toBe(false);
      expect(responsibility.designSays.current.sectionDigest).toBe(responsibility.designSays.base.sectionDigest);
      expect(responsibility.codeObservation.changedPaths).toEqual([]);
      expect(responsibility.standing).toBe("unchanged");
      expect(bundle.projection.comparison.unresolved).toEqual([]);
      expect((await validateProjectBundle(bundle)).valid).toBe(true);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("keeps a responsibility unavailable when its declared architecture heading is absent", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-no-architecture-"));
    try {
      await Bun.write(join(repo, "README.md"), "# No architecture\n\nA repository without an accepted responsibility section.\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");
      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [{
          id: "missing-boundary",
          design: { sourceRef: "README.md", heading: "Architecture" },
          implementationScopes: ["src"],
        }],
      });
      const responsibility = bundle.projection.comparison.responsibilities[0];
      expect(responsibility.standing).toBe("unavailable");
      expect(responsibility.designSays.current).toBeNull();
      expect(responsibility.reconciliation.summary).toContain("不能用目录结构补成责任边界");
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("resolves a valid ATX heading whose content has optional closing hashes", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-closing-hashes-"));
    try {
      await mkdir(join(repo, "src"));
      await Bun.write(join(repo, "README.md"), "# Closing hashes\n\nA repository whose design heading uses the closing hash form.\n");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\n## Project Lens ##\n\nOwns source-linked explanation.\n\n   ## Other ##\n\nUnrelated.\n");
      await Bun.write(join(repo, "src/app.js"), "export const version = 1;\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");

      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [{
          id: "project-lens",
          title: "Project Lens responsibility",
          design: { sourceRef: "DESIGN.md", heading: "Project Lens" },
          implementationScopes: ["src"],
        }],
      });
      const responsibility = bundle.projection.comparison.responsibilities[0];

      expect(responsibility.standing).toBe("unchanged");
      expect(responsibility.designSays.current).toMatchObject({ sourceRef: "DESIGN.md", lineStart: 3, lineEnd: 6 });
      expect(responsibility.designSays.current.sectionDigest).toBe(responsibility.designSays.base.sectionDigest);
      expect(responsibility.designSays.summary).toContain("Owns source-linked explanation");
      expect(bundle.projection.comparison.unresolved).toEqual([]);
      expect((await validateProjectBundle(bundle)).valid).toBe(true);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("resolves an indented ATX target with optional closing hashes and keeps four-space text plain content", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-indented-heading-"));
    try {
      await mkdir(join(repo, "src"));
      await Bun.write(join(repo, "README.md"), "# Indented heading\n\nA repository whose design heading is indented up to three spaces.\n");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\n   ## Project Lens ##\n\nOwns source-linked explanation.\n\n    ## Four Space Peer ##\n\nStill owned by Project Lens.\n\n   ## Other ##\n\nUnrelated.\n");
      await Bun.write(join(repo, "src/app.js"), "export const version = 1;\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");

      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [{
          id: "project-lens",
          title: "Project Lens responsibility",
          design: { sourceRef: "DESIGN.md", heading: "Project Lens" },
          implementationScopes: ["src"],
        }],
      });
      const responsibility = bundle.projection.comparison.responsibilities[0];

      expect(responsibility.standing).toBe("unchanged");
      expect(responsibility.designSays.current).toMatchObject({ sourceRef: "DESIGN.md", lineStart: 3, lineEnd: 10 });
      expect(responsibility.designSays.current.sectionDigest).toBe(responsibility.designSays.base.sectionDigest);
      expect(responsibility.designSays.summary).toContain("Still owned by Project Lens");
      expect(responsibility.designSays.summary).toContain("## Four Space Peer ##");
      expect(responsibility.designSays.summary).not.toContain("Unrelated");
      expect(bundle.projection.comparison.unresolved).toEqual([]);
      expect((await validateProjectBundle(bundle)).valid).toBe(true);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("keeps a literal hash inside heading content such as C# matched without stripping", async () => {
    const repo = await mkdtemp(join(tmpdir(), "project-lens-literal-hash-"));
    try {
      await mkdir(join(repo, "src"));
      await Bun.write(join(repo, "README.md"), "# Literal hash\n\nA repository whose design headings contain a literal hash character.\n");
      await Bun.write(join(repo, "DESIGN.md"), "# Design\n\n## Why C# ##\n\nOwns source-linked explanation.\n\n## C# ##\n\nAlso owned.\n\n## Other\n\nUnrelated.\n");
      await Bun.write(join(repo, "src/app.js"), "export const version = 1;\n");
      runGit(repo, "init", "-q");
      runGit(repo, "config", "user.email", "project-lens@example.invalid");
      runGit(repo, "config", "user.name", "Project Lens Test");
      runGit(repo, "add", ".");
      runGit(repo, "commit", "-qm", "base");
      const base = runGit(repo, "rev-parse", "HEAD");

      const bundle = await buildProjectLensBundle({
        repo,
        baseRevision: base,
        responsibilities: [
          {
            id: "csharp",
            title: "C# responsibility",
            design: { sourceRef: "DESIGN.md", heading: "C#" },
            implementationScopes: ["src"],
          },
          {
            id: "why-csharp",
            title: "Why C# responsibility",
            design: { sourceRef: "DESIGN.md", heading: "Why C#" },
            implementationScopes: ["src"],
          },
        ],
      });
      const byId = new Map(bundle.projection.comparison.responsibilities.map((entry) => [entry.id, entry]));

      expect(byId.get("csharp").standing).toBe("unchanged");
      expect(byId.get("csharp").designSays.current).toMatchObject({ sourceRef: "DESIGN.md", lineStart: 7, lineEnd: 10 });
      expect(byId.get("csharp").designSays.summary).toContain("Also owned");
      expect(byId.get("why-csharp").designSays.current).toMatchObject({ sourceRef: "DESIGN.md", lineStart: 3, lineEnd: 6 });
      expect(byId.get("why-csharp").designSays.summary).toContain("Owns source-linked explanation");
      expect(bundle.projection.comparison.unresolved).toEqual([]);
      expect((await validateProjectBundle(bundle)).valid).toBe(true);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("focus sources cannot follow a symlink outside the repository", async () => {
    const link = join(fixtureRoot, "outside.md");
    await symlink(outsideFile, link);
    await expect(buildProjectLensBundle({ repo: fixtureRoot, focusSources: ["outside.md"] }))
      .rejects.toThrow("resolves outside the repo");
  });

  test("public CLI writes a validated bundle to an arbitrary output path", async () => {
    const output = join(fixtureRoot, "project-bundle.json");
    const process = Bun.spawnSync([
      "bun", "run", new URL("../scripts/introduce-project.js", import.meta.url).pathname,
      "--repo", fixtureRoot, "--intent", "understand", "--audience", "维护者", "--output", output,
    ], { stdout: "pipe", stderr: "pipe" });
    expect(process.exitCode).toBe(0);
    const bundle = await Bun.file(output).json();
    expect((await validateProjectBundle(bundle)).valid).toBe(true);
  });

  test("public CLI prints a URL on the configured server port", async () => {
    const output = join(import.meta.dir, "..", "generated", `port-${crypto.randomUUID()}.json`);
    try {
      const process = Bun.spawnSync([
        "bun", "run", new URL("../scripts/introduce-project.js", import.meta.url).pathname,
        "--repo", fixtureRoot, "--output", output,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...Bun.env, HUMAN_AGENT_VIS_PORT: "4312" },
      });
      expect(process.exitCode).toBe(0);
      expect(process.stdout.toString()).toContain("http://127.0.0.1:4312/project.html?");
    } finally {
      await rm(output, { force: true });
    }
  });
});
