import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "operations", "workbench", "rossovia");

describe("Workbench source runtime", () => {
  test("runs the stable launcher against TypeScript source with Bun", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-source-runtime-"));
    try {
      const home = join(temporary, "home");
      const initializedResult = spawnSync(launcher, ["--home", home, "init"], {
        encoding: "utf8",
      });
      expect(initializedResult.status).toBe(0);
      expect(initializedResult.stderr).toBe("");
      const initialized = JSON.parse(initializedResult.stdout);
      expect(initialized).toEqual(expect.objectContaining({
        home: realpathSync(home),
        initialized: true,
        writeAccess: "verified",
      }));
      expect(JSON.parse(readFileSync(join(initialized.home, "state", "roots.json"), "utf8")).version)
        .toBe("rosso.roots.v1");

      const createdResult = spawnSync(launcher, [
        "--home",
        home,
        "task",
        "create",
        "--title",
        "Source task",
        "--objective",
        "Prove the Bun source carrier retains Principal task state",
        "--accept",
        "The task survives a second process",
        "--next-actor",
        "agent",
        "--source-ref",
        "test:source-runtime",
        "--expected-source-revision",
        "0",
      ], { encoding: "utf8" });
      expect(createdResult.status).toBe(0);
      expect(createdResult.stderr).toBe("");
      const created = JSON.parse(createdResult.stdout);
      expect(created).toMatchObject({
        sourceRevision: 1,
        task: {
          title: "Source task",
          binding: { kind: "independent" },
          lifecycle: "open",
          nextActor: "agent",
          revision: 1,
        },
      });

      const listedResult = spawnSync(launcher, ["--home", home, "task", "list"], {
        encoding: "utf8",
      });
      expect(listedResult.status).toBe(0);
      expect(JSON.parse(listedResult.stdout)).toEqual({
        version: "rosso.principal-tasks.v1",
        sourceRevision: 1,
        tasks: [created.task],
      });
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  test("fails clearly when Bun is absent instead of pretending to fall back", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-missing-bun-"));
    try {
      const result = spawnSync(launcher, ["--help"], {
        encoding: "utf8",
        env: { ...process.env, PATH: temporary },
      });
      expect(result.status).toBe(127);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(
        "rossovia: Bun is required to run the Workbench from this source checkout\n",
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
