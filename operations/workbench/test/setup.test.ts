import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
import { setupAdapter } from "../src/setup-adapters";
import { multiAgentDelegationModule } from "../src/setup-modules";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const workbenchRoot = join(repositoryRoot, "operations", "workbench");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(argv: string[], cwd = repositoryRoot): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function commitFile(repository: string, path: string, content: string, message: string): string {
  writeFileSync(join(repository, path), content, "utf8");
  git(repository, "add", path);
  git(repository, "commit", "-m", message);
  return git(repository, "rev-parse", "HEAD");
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-setup-"));
  temporaryRoots.push(root);
  const source = join(root, "source");
  const home = join(root, "home");
  const codex = join(root, "codex");
  mkdirSync(source, { recursive: true });
  mkdirSync(codex, { recursive: true });
  git(source, "init");
  git(source, "config", "user.name", "Rossovia Test");
  git(source, "config", "user.email", "rossovia@example.test");
  writeFileSync(join(source, "CHANGELOG.md"), "# Changelog\n", "utf8");
  const fixtureWorkbench = join(source, "operations", "workbench");
  mkdirSync(fixtureWorkbench, { recursive: true });
  cpSync(join(workbenchRoot, "src"), join(fixtureWorkbench, "src"), { recursive: true });
  symlinkSync(join(workbenchRoot, "node_modules"), join(fixtureWorkbench, "node_modules"), "dir");
  git(source, "add", "CHANGELOG.md", "operations/workbench/src");
  git(source, "commit", "-m", "initial setup source");
  const baseline = git(source, "rev-parse", "HEAD");
  writeFileSync(join(codex, "AGENTS.md"), "# Personal instructions\n\nKeep this content.\n", "utf8");
  return { root, source, home, codex, baseline };
}

function workbench(source: string, home: string, ...args: string[]) {
  return command([process.execPath, join(source, "operations", "workbench", "src", "cli.ts"), "--home", home, ...args]);
}

describe("user-level setup reconciliation", () => {
  test("filters a general changelog by selected module and advances the applied Git baseline", () => {
    const { source, home, codex, baseline } = fixture();
    const initialized = workbench(
      source,
      home,
      "init",
      "--setup",
      "multi-agent-delegation",
      "--target-root",
      codex,
    );
    expect(initialized.exitCode).toBe(0);
    expect(JSON.parse(initialized.stdout).setup.modules[0]).toEqual(expect.objectContaining({
      module: "multi-agent-delegation",
      harness: "codex",
      status: "current",
      appliedRevision: baseline,
    }));
    const projected = readFileSync(join(codex, "AGENTS.md"), "utf8");
    expect(projected).toContain("# Personal instructions");
    expect(projected).toContain("## Multi-agent delegation");
    writeFileSync(
      join(codex, "AGENTS.md"),
      projected.replace("Keep this content.", "Keep this locally changed content."),
      "utf8",
    );

    commitFile(
      source,
      "CHANGELOG.md",
      "# Changelog\n\n## [visual-design] Refine hover\n",
      "unrelated change",
    );
    const unrelated = JSON.parse(workbench(
      source,
      home,
      "setup",
      "status",
      "--target-root",
      codex,
    ).stdout);
    expect(unrelated.modules[0]).toEqual(expect.objectContaining({
      status: "current",
      appliedRevision: baseline,
      applicableChanges: [],
    }));

    const advanced = JSON.parse(workbench(
      source,
      home,
      "setup",
      "apply",
      "--target-root",
      codex,
    ).stdout);
    expect(advanced.modules[0].status).toBe("current");
    expect(readFileSync(join(codex, "AGENTS.md"), "utf8")).toContain("Keep this locally changed content.");
    const unrelatedRevision = advanced.modules[0].appliedRevision;

    commitFile(
      source,
      "CHANGELOG.md",
      "# Changelog\n\n## [visual-design] Refine hover\n\n"
      + "## [workbench.setup.multi-agent-delegation] Clarify independent task fan-out\n\n"
      + "- Action: `reapply`\n"
      + "- Verify: confirm independent tasks fan out.\n",
      "applicable setup change",
    );
    const applicable = JSON.parse(workbench(
      source,
      home,
      "setup",
      "status",
      "--target-root",
      codex,
    ).stdout);
    expect(applicable.modules[0]).toEqual(expect.objectContaining({
      status: "update-available",
      appliedRevision: unrelatedRevision,
      applicableChanges: [
        "## [workbench.setup.multi-agent-delegation] Clarify independent task fan-out\n\n"
        + "- Action: `reapply`\n"
        + "- Verify: confirm independent tasks fan out.",
      ],
    }));
  });

  test("detects local projection drift and refuses to overwrite it", () => {
    const { source, home, codex } = fixture();
    expect(workbench(
      source,
      home,
      "init",
      "--setup",
      "codex:multi-agent-delegation",
      "--target-root",
      codex,
    ).exitCode).toBe(0);
    const path = join(codex, "AGENTS.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace("use the active environment's supported delegation", "avoid delegation"),
      "utf8",
    );

    const status = JSON.parse(workbench(
      source,
      home,
      "setup",
      "status",
      "--target-root",
      codex,
    ).stdout);
    expect(status.modules[0].status).toBe("drifted");
    const before = readFileSync(path, "utf8");
    const applied = workbench(
      source,
      home,
      "setup",
      "apply",
      "--target-root",
      codex,
    );
    expect(applied.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(applied.stderr).toContain("rossovia: setup projection drift requires reconciliation");
    expect(applied.stderr).not.toContain("for usage");
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  test("reports an unavailable applied Git baseline without inventing update history", () => {
    const { source, home, codex } = fixture();
    expect(workbench(
      source,
      home,
      "init",
      "--setup",
      "multi-agent-delegation",
      "--target-root",
      codex,
    ).exitCode).toBe(0);
    const receiptPath = join(home, "receipts", "setup", "codex.multi-agent-delegation.json");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.sourceRevision = "0".repeat(40);
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

    const status = JSON.parse(workbench(
      source,
      home,
      "setup",
      "status",
      "--target-root",
      codex,
    ).stdout);
    expect(status.modules[0]).toEqual(expect.objectContaining({
      status: "baseline-unavailable",
      appliedRevision: "0".repeat(40),
      applicableChanges: [],
    }));

    const targetPath = join(codex, "AGENTS.md");
    const targetBefore = readFileSync(targetPath, "utf8");
    const receiptBefore = readFileSync(receiptPath, "utf8");
    const applied = workbench(
      source,
      home,
      "setup",
      "apply",
      "--target-root",
      codex,
    );
    expect(applied.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(applied.stderr).toContain("rossovia: setup applied baseline is unavailable");
    expect(applied.stderr).not.toContain("for usage");
    expect(readFileSync(targetPath, "utf8")).toBe(targetBefore);
    expect(readFileSync(receiptPath, "utf8")).toBe(receiptBefore);
  });

  test("refuses to record a Git baseline while setup source changes are uncommitted", () => {
    const { source, home, codex } = fixture();
    writeFileSync(
      join(source, "CHANGELOG.md"),
      "# Changelog\n\n## [workbench.setup.multi-agent-delegation] Uncommitted\n",
      "utf8",
    );
    const initialized = workbench(
      source,
      home,
      "init",
      "--setup",
      "multi-agent-delegation",
      "--target-root",
      codex,
    );
    expect(initialized.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(initialized.stderr).toContain("rossovia: setup source has uncommitted changes");
    expect(initialized.stderr).not.toContain("for usage");
    expect(readFileSync(join(codex, "AGENTS.md"), "utf8")).not.toContain("## Multi-agent delegation");
  });

  test("keeps tool-neutral delegation judgment outside the Codex adapter", () => {
    expect(multiAgentDelegationModule.guidance).toContain("active environment's supported delegation");
    expect(multiAgentDelegationModule.guidance).not.toContain("Codex");
    expect(multiAgentDelegationModule.guidance).not.toContain("spawn_agent");
    expect(multiAgentDelegationModule.guidance).not.toContain("native sub-agents");
    const adapter = setupAdapter("codex");
    expect(adapter.projectionPath("/tmp/codex-fixture")).toEndWith("/codex-fixture/AGENTS.md");
    expect(adapter.render(multiAgentDelegationModule).content).toContain(multiAgentDelegationModule.guidance);
  });

  test("loads the CLI in a minimal Workbench-only fixture without the sibling worker policy", () => {
    const { source, home, codex } = fixture();
    expect(existsSync(join(source, "operations", "autonomy"))).toBe(false);
    const help = workbench(source, home, "--help");
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("task run <id> --worker <worker-id> [--continue <attempt-id>]");
    const initialized = workbench(
      source,
      home,
      "init",
      "--setup",
      "multi-agent-delegation",
      "--target-root",
      codex,
    );
    expect(initialized.exitCode).toBe(0);
    expect(JSON.parse(initialized.stdout).setup.modules[0]).toEqual(expect.objectContaining({
      module: "multi-agent-delegation",
      harness: "codex",
      status: "current",
    }));
  });
});
