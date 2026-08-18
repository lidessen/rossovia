import { RunControlRegistry, stopRun } from "../orchestration/run";

export interface ForegroundRunSignalAdapterOptions {
  /** The Workbench home the canonical O2 `stopRun` binds to. */
  readonly home: string;
  /** Test seam: the process-like event target. Defaults to the global `process`. */
  readonly process_?: NodeJS.Process;
  /**
   * Test seam: override the canonical `stopRun` binding. Production callers
   * must omit this so the adapter owns the canonical stop protocol wiring.
   */
  readonly stopRun_?: (runId: string) => void;
}

export interface ForegroundRunSignalAdapter {
  /**
   * Narrow task-run control bundle: the one existing registry this adapter
   * owns and the publication callback O2 invokes after register and before
   * executeOnce.
   */
  readonly controlBundle: {
    readonly registry: RunControlRegistry;
    readonly onControlAvailable: (runId: string) => void;
  };
  /** Remove both listeners and drop any pending pre-live signal. Idempotent. */
  readonly dispose: () => void;
}

/**
 * Foreground CLI signal-to-canonical-stop adapter (Decision 055 Integration
 * boundary). Owns only temporary SIGINT/SIGTERM listeners, the first pending
 * signal received before live publication, one existing O2 Run control
 * registry, the currently published Run id, and an exactly-once guard. It
 * calls the canonical `stopRun` exactly once and never owns Run truth, an
 * AbortController, a writer lease, or a terminal settlement. A failed durable
 * control receipt is caught and never causes a direct controller abort or a
 * hard process exit.
 */
export function createForegroundRunSignalAdapter(
  options: ForegroundRunSignalAdapterOptions,
): ForegroundRunSignalAdapter {
  const target = options.process_ ?? process;
  const registry = new RunControlRegistry();
  const canonicalStop = options.stopRun_ ?? ((id: string): void => {
    stopRun(
      options.home,
      id,
      {
        control: "stop",
        requestedBy: "foreground-signal-adapter",
        sourceRef: "rossovia:foreground-signal",
      },
      registry,
    );
  });
  let runId: string | undefined;
  let pending = false;
  let stopped = false;
  let disposed = false;

  const applyStop = (id: string): void => {
    try {
      canonicalStop(id);
    } catch {
      // A receipt failure stays inside O2; the adapter never directly aborts
      // the controller or exits the process.
    }
  };

  const handleSignal = (): void => {
    if (stopped || disposed) return;
    stopped = true;
    if (runId !== undefined) {
      applyStop(runId);
    } else {
      pending = true;
    }
  };

  target.on("SIGINT", handleSignal);
  target.on("SIGTERM", handleSignal);

  const onControlAvailable = (id: string): void => {
    if (disposed) return;
    runId = id;
    if (pending) {
      pending = false;
      applyStop(id);
    }
  };

  return {
    controlBundle: { registry, onControlAvailable },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      target.removeListener("SIGINT", handleSignal);
      target.removeListener("SIGTERM", handleSignal);
      pending = false;
    },
  };
}
