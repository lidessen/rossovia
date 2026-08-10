import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(
  argv: string[],
  options: { cwd?: string; stdin?: string } = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, {
    cwd: options.cwd ?? repositoryRoot,
    ...(options.stdin === undefined ? {} : { stdin: Buffer.from(options.stdin) }),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function workbench(home: string, ...args: string[]) {
  return command([process.execPath, cli, "--home", home, ...args]);
}

function createRepository(root: string, name: string): string {
  const repository = join(root, name);
  mkdirSync(repository, { recursive: true });
  git(repository, "init");
  git(repository, "config", "user.name", "Rossovia Test");
  git(repository, "config", "user.email", "rossovia@example.test");
  git(repository, "remote", "add", "origin", `https://example.test/team/${name}.git`);
  writeFileSync(join(repository, "README.md"), `# ${name}\n`, "utf8");
  git(repository, "add", "README.md");
  git(repository, "commit", "-m", "initial");
  return repository;
}

describe("Rossovia status-line projection", () => {
  test("uses the host session name so equal workbench cwd values can show different handled projects", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-session-"));
    temporaryRoots.push(temporary);
    const home = join(temporary, "home");
    const workbenchRoot = createRepository(temporary, "rossovia");
    expect(workbench(home, "init").exitCode).toBe(0);

    const first = command(
      [process.execPath, cli, "--home", home, "statusline", "claude"],
      { stdin: JSON.stringify({ session_name: "meowask", workspace: { current_dir: workbenchRoot } }) },
    );
    const second = command(
      [process.execPath, cli, "--home", home, "statusline", "claude"],
      { stdin: JSON.stringify({ session_name: "agent-era-blog", workspace: { current_dir: workbenchRoot } }) },
    );

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(first.stdout.trim()).toBe("meowask");
    expect(second.stdout.trim()).toBe("agent-era-blog");
  });

  test("falls back to a verified registered project when the host has no session name", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-project-"));
    temporaryRoots.push(temporary);
    const home = join(temporary, "home");
    const repository = createRepository(temporary, "alpha");
    expect(workbench(home, "init").exitCode).toBe(0);
    expect(workbench(home, "register", repository, "--id", "repo:alpha", "--alias", "alpha").exitCode).toBe(0);

    const result = command([
      process.execPath,
      cli,
      "--home",
      home,
      "statusline",
      "--cwd",
      repository,
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("repo:alpha");
  });

  test("degrades to one short directory label when host input and registration are unavailable", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-fallback-"));
    temporaryRoots.push(temporary);
    const repository = createRepository(temporary, "fallback");
    const result = command(
      [process.execPath, cli, "--home", join(temporary, "missing-home"), "statusline", "claude"],
      { cwd: repository, stdin: "not-json" },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("fallback");
    expect(result.stdout).not.toContain(repository);
  });

  test("never emits an absolute path from a host name or root-directory fallback", () => {
    const named = command(
      [process.execPath, cli, "--home", "/missing", "statusline", "claude"],
      { stdin: JSON.stringify({ session_name: "/Users/alice/secret-project", cwd: "/" }) },
    );
    const root = command([
      process.execPath,
      cli,
      "--home",
      "/missing",
      "statusline",
      "--cwd",
      "/",
    ]);
    expect(named.exitCode).toBe(0);
    expect(named.stdout.trim()).toBe("secret-project");
    expect(root.exitCode).toBe(0);
    expect(root.stdout.trim()).toBe("root");
  });

  test("sanitizes a path-shaped registered project identity before rendering", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-safe-project-"));
    temporaryRoots.push(temporary);
    const home = join(temporary, "home");
    const repository = createRepository(temporary, "registered");
    expect(workbench(home, "init").exitCode).toBe(0);
    expect(workbench(home, "register", repository, "--id", "/Users/alice/registered").exitCode).toBe(0);
    const result = command([
      process.execPath,
      cli,
      "--home",
      home,
      "statusline",
      "--cwd",
      repository,
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("registered");
  });

  test("uses only project identity on the supported host-specific surfaces", () => {
    const claude = JSON.parse(readFileSync(join(repositoryRoot, ".claude", "settings.json"), "utf8"));
    expect(claude.statusLine).toEqual({
      type: "command",
      command: "\"$(git rev-parse --show-toplevel)/operations/workbench/rossovia\" statusline claude",
    });
    expect(claude.subagentStatusLine).toBeUndefined();

    const codex = Bun.TOML.parse(
      readFileSync(join(repositoryRoot, ".codex", "config.toml"), "utf8"),
    ) as { tui: { status_line: string[]; terminal_title: string[] } };
    expect(codex.tui).toEqual({
      status_line: ["thread-title"],
      terminal_title: ["thread"],
    });
  });
});
