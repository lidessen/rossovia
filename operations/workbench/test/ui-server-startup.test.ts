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

/** Bind the exact loopback port; returns the probe, or null when the port is taken. */
function tryBindPort(port: number): { readonly probe: { stop(): void } } | null {
  try {
    return { probe: Bun.listen({ hostname: "127.0.0.1", port, socket: { data() {} } }) };
  } catch {
    return null;
  }
}

interface SpawnedChild {
  readonly exited: Promise<number | null>;
  readonly stderr: ReadableStream<Uint8Array>;
  readonly killed: boolean;
  kill(): void;
}

async function childStderr(child: SpawnedChild): Promise<string> {
  return await new Response(child.stderr).text();
}

/**
 * Poll one spawned child until it serves /api/snapshot on the loopback port.
 * Every non-success path kills and reaps the child first and only then reads
 * or formats its complete stderr, so a failed startup never leaks the process
 * or retains the disposable port.
 */
async function awaitSnapshotOrFail(
  child: SpawnedChild,
  port: number,
  deadlineMs: number,
  label: string,
): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    if ((await Promise.race([child.exited.then(() => true), Bun.sleep(50).then(() => false)])) === true) {
      child.kill();
      const exitCode = await child.exited;
      const stderr = await childStderr(child);
      throw new Error(`${label} exited before serving /api/snapshot (exit ${exitCode}):\n${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.status === 200) return;
    } catch {
      // The process is still booting or refuses the connection; retry until the deadline.
    }
    if (Date.now() > deadline) {
      child.kill();
      await child.exited;
      const stderr = await childStderr(child);
      throw new Error(`${label} did not serve /api/snapshot within the deadline:\n${stderr}`);
    }
  }
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
  await awaitSnapshotOrFail(child, port, 10_000, "production UI");
  return { child };
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

test("a live non-serving child is killed and reaped before stderr is read; the same port can be rebound", async () => {
  const port = disposablePort();

  // A live child that binds the loopback port but never serves HTTP.
  const child = Bun.spawn({
    cmd: [process.execPath, "-e", [
      `const port = ${port};`,
      'console.error("rossovia-ui-startup-stub-bound");',
      'Bun.listen({ hostname: "127.0.0.1", port, socket: { data() {} } });',
    ].join("\n")],
    stdout: "pipe",
    stderr: "pipe",
  });
  try {
    // The stub must be live and hold the port: while it runs, rebinding fails.
    let blocked = false;
    const blockDeadline = Date.now() + 5_000;
    while (Date.now() < blockDeadline) {
      const held = tryBindPort(port);
      if (held === null) {
        blocked = true;
        break;
      }
      held.probe.stop();
      await Bun.sleep(50);
    }
    expect(blocked).toBe(true);

    // The failure path must kill and reap the live child first and only then
    // report its complete stderr: the previous read-before-kill order would
    // hang forever on this live child and leak both it and the port.
    let failure: unknown;
    try {
      await awaitSnapshotOrFail(child, port, 750, "live non-serving child");
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("did not serve /api/snapshot within the deadline");
    expect((failure as Error).message).toContain("rossovia-ui-startup-stub-bound");
    expect(child.killed).toBe(true);

    // After the reap the same disposable port can be rebound.
    const rebound = tryBindPort(port);
    expect(rebound).not.toBeNull();
    rebound!.probe.stop();
  } finally {
    child.kill();
    await child.exited;
  }
}, 10_000);
