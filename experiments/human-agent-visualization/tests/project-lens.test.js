import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildProjectLensBundle } from "../scripts/project-lens-builder.js";
import { validateProjectBundle, finalizeProjectBundle } from "../lib/project-evidence-bundle.js";
import { validateProjectBundleAgainstRepository } from "../scripts/project-lens-builder.js";
import { digestValue } from "../lib/evidence-bundle.js";

let fixtureRoot;
let outsideFile;

beforeAll(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "project-lens-fixture-"));
  await mkdir(join(fixtureRoot, "src"));
  await mkdir(join(fixtureRoot, "tests"));
  await Bun.write(join(fixtureRoot, "README.md"), "# 枝叶\n\n枝叶是一个把本地笔记转成可检索网页的微型工具，面向个人离线使用。\n");
  await Bun.write(join(fixtureRoot, "AGENTS.md"), "# Guidance\n\nChanges start in src/app.js and must pass bun test.\n");
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
    expect(bundle.projection.steps.find((step) => step.id === "arrival-path").evidence.sourceRefs).toEqual(["AGENTS.md", "src/app.js", "tests/app.test.js"]);
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
