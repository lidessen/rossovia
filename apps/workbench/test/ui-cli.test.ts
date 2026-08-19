import { describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "apps", "gateway", "rossovia");

async function waitForServer(port: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
      if (response.ok) return;
    } catch {
      // server not listening yet
    }
    await Bun.sleep(100);
  }
  throw new Error(`UI server on port ${port} did not become ready within ${timeoutMs}ms`);
}

function freePort(): number {
  return 20_000 + Math.floor(Math.random() * 20_000);
}

describe("rossovia ui command", () => {
  test("help lists the ui command as starts-work", () => {
    const result = Bun.spawnSync([launcher, "help", "ui"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    const help = result.stdout.toString();
    expect(help).toContain("usage: rossovia ui [--port <port>] [--root <path>]...");
    expect(help).toContain("effect: starts-work");
    expect(help).toContain("Rossovia Principal Workbench");
  });

  test("ui serves the Principal Workbench on 127.0.0.1 and stops cleanly", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-ui-cli-"));
    const home = join(temporary, "home");
    const port = freePort();
    let child: ChildProcess | undefined;
    try {
      const initialized = Bun.spawnSync(
        [launcher, "--home", home, "init"],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(initialized.exitCode).toBe(0);

      child = spawn(launcher, ["--home", home, "ui", "--port", String(port)], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      await waitForServer(port);

      const page = await fetch(`http://127.0.0.1:${port}/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Rossovia 工作台");

      const snapshot = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
      expect(snapshot.status).toBe(200);
      const body = await snapshot.json() as { version?: string; supervision?: { mode?: string } };
      expect(body.version).toBe("rosso.principal-workbench-snapshot.v1");
      expect(body.supervision?.mode).toBe("supervised");

      const exitPromise = new Promise<number | null>((resolveExit) => {
        child!.on("exit", (code, signal) => resolveExit(code ?? (signal === undefined ? null : -1)));
        setTimeout(() => resolveExit(null), 5_000);
      });
      child.kill("SIGTERM");
      expect(await exitPromise).not.toBeNull();
    } finally {
      child?.kill("SIGKILL");
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 30_000);
});
