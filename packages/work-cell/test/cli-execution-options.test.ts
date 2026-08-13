import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "packages", "work-cell", "src", "cli.ts");

function run(...arguments_: string[]): { exitCode: number; stderr: string } {
  const result = Bun.spawnSync([process.execPath, cli, ...arguments_], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { exitCode: result.exitCode, stderr: result.stderr.toString() };
}

describe("Work Cell execution CLI options", () => {
  test("accepts reasoning effort and rejects the legacy variant spelling", () => {
    const accepted = run(
      "run",
      "missing-cell.json",
      "--driver",
      "opencode-cli",
      "--model",
      "deepseek/deepseek-v4-flash",
      "--reasoning-effort",
      "max",
    );
    expect(accepted.exitCode).toBe(2);
    expect(accepted.stderr).toContain("missing-cell.json");
    expect(accepted.stderr).not.toContain("unknown run option");

    const rejected = run(
      "run",
      "missing-cell.json",
      "--driver",
      "opencode-cli",
      "--model",
      "deepseek/deepseek-v4-flash",
      "--variant",
      "max",
    );
    expect(rejected.exitCode).toBe(2);
    expect(rejected.stderr).toContain("unknown run option: --variant");
  });
});
