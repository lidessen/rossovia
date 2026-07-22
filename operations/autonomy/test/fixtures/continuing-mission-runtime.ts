import type { MissionInputReceipt } from "../../src/mission-input";
import type { MissionRuntimeFactory } from "../../src/mission-runtime";
import { digestAnchor } from "../../src/mission-reconciliation";
import { MISSION_TURN_VERSION } from "../../src/mission-turn";

export const createMissionRuntime: MissionRuntimeFactory = async (context) => {
  const activeAnchor = await context.timeline.latestReconciledAnchor(context.missionId);
  const baselineWatermark = activeAnchor?.reconciledWatermark ?? 0;
  let observedInput: MissionInputReceipt | undefined;
  let releaseInput: (() => void) | undefined;
  const inputObserved = new Promise<void>((resolve) => { releaseInput = resolve; });
  return {
    turn: {
      version: MISSION_TURN_VERSION,
      turnId: `continuing-${context.missionId}-${baselineWatermark}`,
      baselineWatermark,
      ...(activeAnchor === undefined ? {} : { anchorDigest: digestAnchor(activeAnchor) }),
      sourceRefs: ["test:continuing-runtime"],
    },
    controller: {
      async advance() {
        if (baselineWatermark > 0) {
          return {
            kind: "finished" as const,
            run: {
              status: "returned" as const,
              text: `continued at watermark ${baselineWatermark}`,
              messages: [],
              batches: [],
              tasks: [],
              uncoveredObligations: [],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
            },
          };
        }
        await inputObserved;
        await Bun.sleep(500);
        const input = observedInput;
        if (input === undefined) throw new Error("continuing fixture resumed without input");
        return {
          kind: "input-pending" as const,
          turnWatermark: baselineWatermark,
          currentWatermark: input.watermark,
          inputs: [input],
        };
      },
      async resume() {
        throw new Error("continuing fixture has no parked delegate batch");
      },
      observeInput(input) {
        observedInput = input;
        releaseInput?.();
      },
      cancel() {
        releaseInput?.();
      },
    },
  };
};
