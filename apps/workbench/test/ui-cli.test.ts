import { describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { defaultObservedRoots, parseServerArguments } from "../../gateway/src/ui-server";

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
  test("local UI startup enables the default observer and supports explicit overrides", () => {
    expect(parseServerArguments([]).observerWorkerId).toBe("deepseek-flash");
    expect(parseServerArguments(["--observer", "kimi-coding-plan"]).observerWorkerId).toBe("kimi-coding-plan");
    expect(parseServerArguments(["--disable-observer"]).observerWorkerId).toBeUndefined();
  });

  test("ui default root is the source checkout only; a baked install starts with no default root", () => {
    // The source checkout keeps the compiled-in default: the repository root.
    expect(parseServerArguments([]).roots).toEqual([repositoryRoot]);
    expect(defaultObservedRoots()).toEqual([repositoryRoot]);
    // A compiled binary resolves import.meta.dir next to the executable, so the
    // same default arithmetic must add nothing there, while explicit --root
    // entries still join the observed roots.
    const baked = mkdtempSync(join(tmpdir(), "rossovia-ui-baked-"));
    try {
      expect(defaultObservedRoots(baked)).toEqual([]);
      mkdirSync(join(baked, "apps", "gateway", "src"), { recursive: true });
      writeFileSync(join(baked, "apps", "gateway", "src", "ui-server.ts"), "compiled marker\n");
      expect(defaultObservedRoots(baked)).toEqual([]);
      expect(parseServerArguments(["--root", baked]).roots).toEqual([repositoryRoot, baked]);
    } finally {
      rmSync(baked, { recursive: true, force: true });
    }
  });

  test("ui --root entries deduplicate against each other and the source default", () => {
    const gateway = join(repositoryRoot, "apps", "gateway");
    const design = join(repositoryRoot, "design");
    const options = parseServerArguments([
      "--root", gateway,
      "--root", design,
      "--root", gateway,
      "--root", repositoryRoot,
    ]);
    expect(options.roots).toEqual([repositoryRoot, gateway, design]);
  });

  test("ui root parsing keeps its usage error boundary", () => {
    expect(() => parseServerArguments(["--root"])).toThrow("--root requires a value");
    expect(() => parseServerArguments(["--roots", "x"])).toThrow("unknown Workbench UI option: --roots");
    expect(() => parseServerArguments(["--port", "70000"])).toThrow("--port must be an integer from 1 to 65535");
    expect(() => parseServerArguments(["--port", "nan"])).toThrow("--port must be an integer from 1 to 65535");
  });

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
      const body = await snapshot.json() as {
        version?: string;
        supervision?: { mode?: string };
        startup?: { version?: string; mode?: string };
      };
      expect(body.version).toBe("rosso.principal-workbench-snapshot.v1");
      expect(body.supervision?.mode).toBe("supervised");
      expect(body.startup?.version).toBe("rossovia.self-check.v1");
      expect(body.startup?.mode === "normal" || body.startup?.mode === "safe-diagnostic").toBe(true);

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
