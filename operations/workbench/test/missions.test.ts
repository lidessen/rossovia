import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(argv: string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function workbench(cwd: string, root: string, ...args: string[]) {
  return command([process.execPath, bunCli, "mission", "--root", root, ...args], cwd);
}

function git(cwd: string, ...args: string[]): void {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
}

describe("mission continuity", () => {
  test("preserves the lifecycle, graph invariants, and Git proof boundary", () => {
    const repository = mkdtempSync(join(tmpdir(), "rossovia-missions-"));
    temporaryRoots.push(repository);
    git(repository, "init");
    git(repository, "config", "user.name", "Mission Test");
    git(repository, "config", "user.email", "mission@example.test");
    const root = join(repository, "operations", "missions");

    const initialized = workbench(
      repository,
      root,
      "init",
      "founding",
      "--title",
      "Founding baseline",
      "--mainline",
      "Return every founding branch to one reviewable baseline",
      "--accept",
      "Every branch has a return record",
      "--source",
      "design/FOUNDING-MANDATE.md",
    );
    expect(initialized.exitCode).toBe(0);
    const recordPath = join(root, "founding.json");
    expect(initialized.stdout.trim()).toBe(recordPath);

    const listing = JSON.parse(workbench(repository, root, "list").stdout);
    expect(listing.activeMissions).toHaveLength(1);
    expect(listing.activeMissions[0]).toEqual(expect.objectContaining({
      id: "founding",
      title: "Founding baseline",
      currentFocus: "mainline",
    }));
    const untracked = workbench(repository, root, "check", "founding", "--git");
    expect(untracked.exitCode).toBe(2);
    expect(untracked.stderr).toContain("not Git-tracked");

    git(repository, "add", "operations/missions/founding.json");
    git(repository, "commit", "-m", "ops: open founding mission");
    const committed = workbench(repository, root, "check", "founding", "--git", "--require-committed");
    expect(committed.exitCode).toBe(0);
    expect(JSON.parse(committed.stdout)).toEqual(expect.objectContaining({ id: "founding", valid: true }));

    expect(workbench(
      repository,
      root,
      "add-branch",
      "founding",
      "research",
      "--kind",
      "investigation",
      "--purpose",
      "Inspect the missing continuity carrier",
      "--return-condition",
      "State whether a Git-tracked source is needed",
      "--source",
      "design/operations/OPERATING-PROTOCOL.md",
    ).exitCode).toBe(0);
    const status = JSON.parse(workbench(repository, root, "status", "founding").stdout);
    expect(Object.keys(status).sort()).toEqual(["currentFocus", "id", "mainline", "openBranches"]);
    expect(status.currentFocus).toBe("research");
    expect(status.openBranches[0].id).toBe("research");

    expect(workbench(
      repository,
      root,
      "suspend",
      "founding",
      "research",
      "--reactivation-signal",
      "A material mission starts",
    ).exitCode).toBe(0);
    const prematureClose = workbench(
      repository,
      root,
      "close",
      "founding",
      "--closure-source",
      "https://example.test/pr/1",
    );
    expect(prematureClose.exitCode).toBe(2);
    expect(prematureClose.stderr).toContain("close or resume every branch");
    expect(workbench(repository, root, "resume", "founding", "research").exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "settle",
      "founding",
      "research",
      "--disposition",
      "no-change",
      "--mainline-delta",
      "The mission record is the required carrier",
    ).exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "add-branch",
      "founding",
      "parent",
      "--kind",
      "implementation",
      "--purpose",
      "Own a nested line",
      "--return-condition",
      "The child and parent both return",
      "--source",
      "design/FOUNDING-MANDATE.md",
    ).exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "add-branch",
      "founding",
      "child",
      "--parent",
      "parent",
      "--kind",
      "review",
      "--purpose",
      "Review the nested line",
      "--return-condition",
      "The child reports to its parent",
      "--source",
      "design/FOUNDING-MANDATE.md",
    ).exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "suspend",
      "founding",
      "parent",
      "--reactivation-signal",
      "The child returns",
    ).exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "settle",
      "founding",
      "child",
      "--disposition",
      "integrate",
      "--mainline-delta",
      "The nested review returned",
    ).exitCode).toBe(0);
    expect(JSON.parse(workbench(repository, root, "status", "founding").stdout).currentFocus).toBe("mainline");
    expect(workbench(repository, root, "resume", "founding", "parent").exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "settle",
      "founding",
      "parent",
      "--disposition",
      "integrate",
      "--mainline-delta",
      "The nested line returned",
    ).exitCode).toBe(0);
    expect(workbench(
      repository,
      root,
      "close",
      "founding",
      "--closure-source",
      "https://example.test/pr/1",
    ).exitCode).toBe(0);
    expect(JSON.parse(workbench(repository, root, "list").stdout).activeMissions).toEqual([]);

    git(repository, "add", "operations/missions/founding.json");
    git(repository, "commit", "-m", "ops: settle founding mission");
    expect(workbench(repository, root, "check", "founding", "--git", "--require-committed").exitCode).toBe(0);
    expect(workbench(repository, root, "prune", "founding").exitCode).toBe(0);
    expect(existsSync(recordPath)).toBe(false);

    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "broken.json"), "{}\n", "utf8");
    const invalid = workbench(repository, root, "list");
    expect(invalid.exitCode).toBe(2);
    expect(invalid.stderr).toContain("version must be mission-record.v1");
    const missing = workbench(repository, join(repository, "missing"), "list");
    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("mission root not found");
  });

  test("accepts an optional execution proposal but rejects authority widening and unknown fields", () => {
    const repository = mkdtempSync(join(tmpdir(), "rossovia-mission-proposal-"));
    temporaryRoots.push(repository);
    const root = join(repository, "operations", "missions");
    expect(workbench(
      repository,
      root,
      "init",
      "blog-run",
      "--title",
      "Blog run",
      "--mainline",
      "Prepare one supervised Blog iteration",
      "--accept",
      "The Principal can authorize the declared boundary",
      "--source",
      "design/blog.md",
    ).exitCode).toBe(0);
    const path = join(root, "blog-run.json");
    const record = JSON.parse(readFileSync(path, "utf8"));
    record.executionProposal = executionProposal();
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
    expect(workbench(repository, root, "status", "blog-run").exitCode).toBe(0);

    const close = workbench(
      repository,
      root,
      "close",
      "blog-run",
      "--closure-source",
      "design/blog-acceptance.md",
    );
    expect(close.exitCode).toBe(2);
    expect(close.stderr).toContain("executionProposal awaits Principal authorization");
    expect(JSON.parse(readFileSync(path, "utf8")).mainline.status).toBe("active");

    const prune = workbench(repository, root, "prune", "blog-run");
    expect(prune.exitCode).toBe(2);
    expect(prune.stderr).toContain("executionProposal awaits Principal authorization");
    expect(existsSync(path)).toBe(true);

    const settledWithProposal = structuredClone(record);
    settledWithProposal.mainline.status = "settled";
    settledWithProposal.mainline.closureSources = ["design/blog-acceptance.md"];
    writeFileSync(path, `${JSON.stringify(settledWithProposal, null, 2)}\n`);
    const incompatible = workbench(repository, root, "status", "blog-run");
    expect(incompatible.exitCode).toBe(2);
    expect(incompatible.stderr).toContain("settled mainline may not retain");

    record.executionProposal.authority.execute = "granted";
    record.executionProposal.unexpected = true;
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
    const invalid = workbench(repository, root, "status", "blog-run");
    expect(invalid.exitCode).toBe(2);
    expect(invalid.stderr).toContain("executionProposal is invalid");
  });
});

function executionProposal() {
  return {
    version: "mission-execution-proposal.v1",
    proposalId: "blog-run-v1",
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: "runtime:deepseek-blog-v1",
    runtimeDigest: "1".repeat(64),
    externalProvider: {
      name: "DeepSeek",
      boundary: "external",
    },
    externalDisclosure: {
      dataCategories: ["task instructions", "selected repository context"],
    },
    candidateWorktree: {
      rootRef: "environment:ROSSO_BLOG_EFFECT_ROOT",
      binding: "operator-selected-at-launch",
    },
    scope: {
      writePaths: ["site"],
      commands: [],
    },
    budget: {
      parent: {
        maxModelSteps: 4,
        maxOutputTokensPerStep: 2_000,
      },
      delegatedCell: {
        maxSteps: 14,
        maxOutputTokensPerStep: 16_000,
        maxDurationMs: 300_000,
      },
      estimatedTokens: 60_000,
      estimatedTokensSemantics: "forecast-only-not-stop-condition",
    },
    authority: {
      externalDisclosure: "withheld",
      budgetRelease: "withheld",
      write: "withheld",
      execute: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    },
    pendingDecisions: [{
      id: "visual-direction",
      label: "Choose the visual direction",
      proposal: "B - Reading Field",
      status: "pending",
      options: [{
        replyKey: "A",
        label: "Margin Ledger",
        immediateResult: "Render the ledger direction",
        tradeoff: "A denser editorial surface",
      }, {
        replyKey: "B",
        label: "Reading Field",
        immediateResult: "Render the recommended reading direction",
        tradeoff: "Less operational density",
      }],
      compactReplyKey: "B",
    }, {
      id: "external-disclosure",
      label: "Authorize the declared external disclosure",
      proposal: "Send only the listed data categories to DeepSeek",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Authorize DeepSeek",
        immediateResult: "Permit the declared external request",
        tradeoff: "Declared project context crosses the external boundary",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult: "Keep the external run stopped",
        tradeoff: "The implementation trial cannot begin",
      }],
      compactReplyKey: "ALLOW",
    }],
  };
}
