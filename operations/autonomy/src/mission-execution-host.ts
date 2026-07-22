import type {
  DelegateBatchHandle,
  DelegateLoopRun,
} from "./delegate-loop";
import type { MissionInputReceipt } from "./mission-input";
import type {
  MissionSupervisorTransition,
} from "./mission-supervisor";

export interface MissionExecutionController {
  advance(): Promise<MissionSupervisorTransition>;
  resume(): Promise<MissionSupervisorTransition>;
  observeInput(input: MissionInputReceipt): void;
  cancel(reason: string): void;
}

export type MissionExecutionOutcome =
  | {
    readonly kind: "input-pending";
    readonly transition: Extract<MissionSupervisorTransition, { kind: "input-pending" }>;
  }
  | { readonly kind: "finished"; readonly run: DelegateLoopRun }
  | { readonly kind: "cancelled"; readonly reason: string }
  | { readonly kind: "failed"; readonly error: string };

export interface MissionExecutionHandle {
  readonly settled: Promise<MissionExecutionOutcome>;
  observeInput(input: MissionInputReceipt): void;
  cancel(reason?: string): void;
}

/**
 * Drives one supervised parent turn without holding a model call open while a
 * delegated batch settles. Durable input remains owned by the caller.
 */
export function startMissionExecution(
  controller: MissionExecutionController,
): MissionExecutionHandle {
  let active: DelegateBatchHandle | undefined;
  let cancelledReason: string | undefined;
  let signalVersion = 0;
  let consumedSignalVersion = 0;
  let wake: (() => void) | undefined;

  const signal = (): void => {
    signalVersion += 1;
    if (wake !== undefined) {
      const resolveWake = wake;
      wake = undefined;
      resolveWake();
    }
  };
  const waitForSignal = async (): Promise<void> => {
    if (signalVersion > consumedSignalVersion) {
      consumedSignalVersion = signalVersion;
      return;
    }
    await new Promise<void>((resolveWake) => { wake = resolveWake; });
    consumedSignalVersion = signalVersion;
  };

  const settled = drive().catch((error): MissionExecutionOutcome => ({
    kind: "failed",
    error: error instanceof Error ? error.message : String(error),
  }));

  const cancel = (reason = "Mission runner stopped hosting the active turn"): void => {
    if (cancelledReason !== undefined) return;
    cancelledReason = reason;
    active?.cancel(reason);
    controller.cancel(reason);
    signal();
  };

  return {
    settled,
    observeInput(input) {
      try {
        controller.observeInput(input);
      } finally {
        if (
          input.payload.kind === "control"
          && (input.payload.command === "pause" || input.payload.command === "stop")
        ) cancel(`Mission ${input.payload.command} at input watermark ${input.watermark}`);
        else signal();
      }
    },
    cancel,
  };

  async function drive(): Promise<MissionExecutionOutcome> {
    let transition = await controller.advance();
    while (true) {
      if (cancelledReason !== undefined) return { kind: "cancelled", reason: cancelledReason };
      if (transition.kind === "input-pending") return { kind: "input-pending", transition };
      if (transition.kind === "finished") return { kind: "finished", run: transition.run };
      if (transition.kind === "ready") {
        transition = await controller.advance();
        continue;
      }

      active = transition.handle;
      await Promise.race([
        transition.handle.settled.then(() => undefined, () => undefined),
        waitForSignal(),
      ]);
      if (cancelledReason !== undefined) return { kind: "cancelled", reason: cancelledReason };
      transition = await controller.resume();
      if (transition.kind !== "parked") active = undefined;
    }
  }
}
