import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "operations", "workbench", "dist", "rossovia.mjs");
const workbenchRoot = join(repositoryRoot, "operations", "workbench");

describe("portable Workbench runtime", () => {
  test("runs the bundled command with Node and no Bun runtime", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-node-runtime-"));
    try {
      const home = join(temporary, "home");
      const result = spawnSync("node", [cli, "--home", home, "init"], {
        encoding: "utf8",
        env: { ...process.env, PATH: nodeOnlyPath() },
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const initialized = JSON.parse(result.stdout);
      expect(initialized).toEqual(expect.objectContaining({
        home: realpathSync(home),
        initialized: true,
        writeAccess: "verified",
      }));
      expect(JSON.parse(readFileSync(join(initialized.home, "state", "roots.json"), "utf8")).version)
        .toBe("rosso.roots.v1");
      const created = spawnSync("node", [
        cli,
        "--home",
        home,
        "task",
        "create",
        "--title",
        "Portable task",
        "--objective",
        "Prove the Node bundle retains Principal task state",
        "--accept",
        "The task survives a second process",
        "--next-actor",
        "agent",
        "--source-ref",
        "test:portable-runtime",
        "--expected-source-revision",
        "0",
      ], {
        encoding: "utf8",
        env: { ...process.env, PATH: nodeOnlyPath() },
      });
      expect(created.status).toBe(0);
      expect(created.stderr).toBe("");
      const createdTask = JSON.parse(created.stdout);
      expect(createdTask).toMatchObject({
        sourceRevision: 1,
        task: {
          title: "Portable task",
          binding: { kind: "independent" },
          lifecycle: "open",
          nextActor: "agent",
          revision: 1,
        },
      });
      const listed = spawnSync("node", [
        cli,
        "--home",
        home,
        "task",
        "list",
      ], {
        encoding: "utf8",
        env: { ...process.env, PATH: nodeOnlyPath() },
      });
      expect(listed.status).toBe(0);
      expect(JSON.parse(listed.stdout)).toEqual({
        version: "rosso.principal-tasks.v1",
        sourceRevision: 1,
        tasks: [createdTask.task],
      });
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  test("preserves the runnable bundle when no builder is available", () => {
    const before = readFileSync(cli);
    const node = spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim();
    const result = spawnSync(node, ["scripts/build-portable.mjs"], {
      cwd: workbenchRoot,
      encoding: "utf8",
      env: { ...process.env, PATH: dirnameOrFallback(node) },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("install Bun, or make Docker available");
    expect(readFileSync(cli)).toEqual(before);
  });
});

function nodeOnlyPath(): string {
  const node = spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim();
  return dirnameOrFallback(node);
}

function dirnameOrFallback(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator > 0 ? path.slice(0, separator) : process.env.PATH ?? "";
}
