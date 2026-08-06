import { createHash } from "node:crypto";
import {
  AiSdkValidationDriver,
  type AiSdkDriverOptions,
} from "../../../../packages/work-cell/src/ai-sdk-driver";
import type { DriverContext } from "../../../../packages/work-cell/src/driver";

export const RETURN_TRIGGER_VERSION = "todo-return-trigger/v1";
export const RETURN_TRIGGER_EVENT = "experiment.todo_return_trigger.delivered";

export type ReturnTriggerArm = "control" | "treatment";

export interface ReturnTriggerDriverOptions {
  driver: AiSdkDriverOptions;
  arm: ReturnTriggerArm;
  primaryPath: string;
  openCompanionObligation: string;
}

/** Explicit arm binding shared by the live runner and its mock action probe. */
export function createReturnTriggerArmDriver(options: ReturnTriggerDriverOptions) {
  return options.arm === "control"
    ? new AiSdkValidationDriver(options.driver)
    : new ReturnTriggerDriver(options);
}

/** Probe-local policy over the generic driver's identity write-result seam. */
export class ReturnTriggerDriver extends AiSdkValidationDriver {
  private delivered = false;
  private readonly arm: ReturnTriggerArm;
  private readonly primaryPath: string;
  private readonly openCompanionObligation: string;
  private readonly obligationSha256: string;

  constructor(options: ReturnTriggerDriverOptions) {
    super(options.driver);
    this.arm = options.arm;
    this.primaryPath = options.primaryPath;
    this.openCompanionObligation = options.openCompanionObligation;
    this.obligationSha256 = createHash("sha256")
      .update(options.openCompanionObligation, "utf8")
      .digest("hex");
  }

  protected override decorateSuccessfulWriteResult(
    result: { path: string; characters: number },
    context: DriverContext,
  ): unknown {
    if (
      this.arm === "control"
      || this.delivered
      || result.path !== this.primaryPath
    ) {
      return result;
    }

    this.delivered = true;
    context.emit(RETURN_TRIGGER_EVENT, {
      version: RETURN_TRIGGER_VERSION,
      primaryPath: result.path,
      obligationSha256: this.obligationSha256,
    });
    return {
      ...result,
      returnTrigger: {
        version: RETURN_TRIGGER_VERSION,
        openCompanionObligation: this.openCompanionObligation,
      },
    };
  }
}
