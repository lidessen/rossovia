import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** One OS-assigned loopback port reserved by a momentary listener. */
function disposablePort(): number {
  const probe = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = probe.port;
  probe.stop();
  return port;
}

async function childStderr(child: { readonly stderr: ReadableStream<Uint8Array> }): Promise<string> {
  return await new Response(child.stderr).text();
}

/**
 * The production UI entry, started exactly as the `ui` script does, against a
 * disposable port and an initialized home. The production execution-carrier
 * registry loads its default current worker policy catalog during this boot:
 * before the fix the process exits immediately with a module resolution
 * failure and this helper reports that stderr instead of timing out.
 */
async function startProductionUi(
  home: string,
  port: number,
): Promise<{ child: { readonly exited: Promise<number>; kill(): void } }> {
  const workbenchRoot = join(import.meta.dir, "..");
  const child = Bun.spawn({
    cmd: [process.execPath, "src/ui/server.ts", "--port", String(port), "--home", home],
    cwd: workbenchRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const deadline = Date.now() + 10_000;
  for (;;) {
    if ((await Promise.race([child.exited.then(() => true), Bun.sleep(50).then(() => false)])) === true) {
      const stderr = await childStderr(child);
      throw new Error(`production UI exited before serving /api/snapshot (exit ${await child.exited}):\n${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
      if (response.status === 200) return { child };
    } catch {
      // The process is still booting; retry until the deadline.
    }
    if (Date.now() > deadline) {
      const stderr = await childStderr(child);
      child.kill();
      throw new Error(`production UI did not serve /api/snapshot within the deadline:\n${stderr}`);
    }
  }
}

test("production UI boots with the current worker policy catalog, serves /api/snapshot, and stops cleanly", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-startup-"));
  temporaryRoots.push(root);
  initializeHome(root);
  const port = disposablePort();

  const { child } = await startProductionUi(root, port);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
    expect(response.status).toBe(200);
    const snapshot = await response.json() as {
      readonly version: unknown;
      readonly complete: unknown;
      readonly errors: unknown;
      readonly workItems: unknown;
    };
    expect(snapshot.version).toBe("rosso.principal-workbench-snapshot.v1");
    expect(snapshot.complete).toBe(true);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.workItems).toBeDefined();
  } finally {
    child.kill();
    // The signal-driven stop is the production clean-stop surface: the
    // process terminates and the loopback port is released.
    const exitCode = await child.exited;
    expect([0, 143]).toContain(exitCode);
    let released = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await fetch(`http://127.0.0.1:${port}/api/snapshot`, {
          signal: AbortSignal.timeout(200),
        });
      } catch {
        released = true;
        break;
      }
      await Bun.sleep(20);
    }
    expect(released).toBe(true);
  }
}, 20_000);
