import {
  type DelegateBatchHandle,
  type DelegateLoopRun,
  type DelegateLoopTransition,
} from "./delegate-loop";
import {
  MissionInputDraftSchema,
  type MissionInputDraft,
  type MissionInputLog,
  type MissionInputReceipt,
} from "./mission-input";

export interface DelegateLoopController {
  advance(): Promise<DelegateLoopTransition>;
  resume(): Promise<DelegateLoopTransition>;
}

export type MissionSupervisorTransition =
  | {
    readonly kind: "parked";
    readonly turnWatermark: number;
    readonly checkpoint: DelegateBatchHandle["checkpoint"];
    readonly handle: DelegateBatchHandle;
  }
  | { readonly kind: "ready" }
  | { readonly kind: "finished"; readonly run: DelegateLoopRun }
  | {
    readonly kind: "input-pending";
    readonly turnWatermark: number;
    readonly currentWatermark: number;
    readonly inputs: readonly MissionInputReceipt[];
    readonly activeBatch?: {
      readonly checkpoint: DelegateBatchHandle["checkpoint"];
      readonly handle: DelegateBatchHandle;
    };
  };

/**
 * Local safe-point gate around one parent Agent loop. It captures and exposes
 * new input but deliberately cannot claim to reconcile its meaning.
 */
export class MissionSupervisorSession {
  private readonly appliedCancellationInputs = new Set<string>();
  private active: {
    readonly turnWatermark: number;
    readonly checkpoint: DelegateBatchHandle["checkpoint"];
    readonly handle: DelegateBatchHandle;
  } | undefined;
  private staleWatermark: number | undefined;

  constructor(
    private readonly missionId: string,
    private readonly delegate: DelegateLoopController,
    private readonly inputs: MissionInputLog,
    private readonly reconciledWatermark: number,
  ) {
    if (!Number.isInteger(reconciledWatermark) || reconciledWatermark < 0) {
      throw new Error("reconciled input watermark must be a non-negative integer");
    }
  }

  async receive(unparsedInput: MissionInputDraft): Promise<MissionInputReceipt> {
    const input = MissionInputDraftSchema.parse(unparsedInput);
    const receipt = await this.inputs.appendInput(this.missionId, input);
    this.observeInput(receipt);
    return receipt;
  }

  /** Apply one already-durable input to the live turn without writing it again. */
  observeInput(input: MissionInputReceipt): void {
    this.applyCancellationControls([input]);
  }

  async advance(): Promise<MissionSupervisorTransition> {
    if (this.staleWatermark !== undefined) return this.pendingInputTransition();
    if (this.active !== undefined) {
      throw new Error(`mission ${this.missionId} has a parked delegate batch`);
    }
    const turnWatermark = this.reconciledWatermark;
    if (await this.inputAdvanced(turnWatermark)) {
      this.staleWatermark = turnWatermark;
      return this.pendingInputTransition();
    }
    const transition = await this.delegate.advance();
    if (transition.kind === "parked") {
      this.active = {
        turnWatermark,
        checkpoint: transition.checkpoint,
        handle: transition.handle,
      };
    }
    if (await this.inputAdvanced(turnWatermark)) {
      this.staleWatermark = turnWatermark;
      return this.pendingInputTransition();
    }
    return projectTransition(transition, turnWatermark);
  }

  async resume(): Promise<MissionSupervisorTransition> {
    if (this.staleWatermark !== undefined) return this.pendingInputTransition();
    const active = this.active;
    if (active === undefined) throw new Error(`mission ${this.missionId} has no parked delegate batch`);
    if (await this.inputAdvanced(active.turnWatermark)) {
      this.staleWatermark = active.turnWatermark;
      return this.pendingInputTransition();
    }
    const transition = await this.delegate.resume();
    if (transition.kind !== "parked") this.active = undefined;
    if (await this.inputAdvanced(active.turnWatermark)) {
      this.staleWatermark = active.turnWatermark;
      return this.pendingInputTransition();
    }
    return projectTransition(transition, active.turnWatermark);
  }

  private async inputAdvanced(watermark: number): Promise<boolean> {
    return await this.inputs.currentInputWatermark(this.missionId) > watermark;
  }

  private async pendingInputTransition(): Promise<Extract<MissionSupervisorTransition, { kind: "input-pending" }>> {
    const turnWatermark = this.staleWatermark;
    if (turnWatermark === undefined) throw new Error("mission supervisor has no stale turn watermark");
    const pending = await this.inputs.readInputsAfter(this.missionId, turnWatermark);
    this.applyCancellationControls(pending);
    const currentWatermark = pending.at(-1)?.watermark ?? turnWatermark;
    return {
      kind: "input-pending",
      turnWatermark,
      currentWatermark,
      inputs: pending,
      ...(this.active === undefined ? {} : {
        activeBatch: { checkpoint: this.active.checkpoint, handle: this.active.handle },
      }),
    };
  }

  private applyCancellationControls(inputs: readonly MissionInputReceipt[]): void {
    for (const input of inputs) {
      if (
        this.active === undefined ||
        this.appliedCancellationInputs.has(input.inputId) ||
        input.payload.kind !== "control" ||
        (input.payload.command !== "pause" && input.payload.command !== "stop")
      ) continue;
      this.active.handle.cancel(`mission ${input.payload.command} at input watermark ${input.watermark}`);
      this.appliedCancellationInputs.add(input.inputId);
    }
  }
}

function projectTransition(
  transition: DelegateLoopTransition,
  turnWatermark: number,
): MissionSupervisorTransition {
  if (transition.kind === "parked") {
    return {
      kind: "parked",
      turnWatermark,
      checkpoint: transition.checkpoint,
      handle: transition.handle,
    };
  }
  return transition;
}
