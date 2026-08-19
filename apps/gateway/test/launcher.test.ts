import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "apps", "gateway", "rossovia");

describe("rossovia gateway launcher", () => {
  test("--version prints the package version through the gateway entry", () => {
    const result = Bun.spawnSync([launcher, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe("@rosso/workbench 0.1.0");
  });

  test("help lists the gateway ui command as starts-work", () => {
    const result = Bun.spawnSync([launcher, "help", "ui"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("effect: starts-work");
  });
});
