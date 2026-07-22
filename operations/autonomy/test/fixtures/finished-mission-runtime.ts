import type {
  MissionRuntimeFactory,
  PreparedMissionExecution,
} from "../../src/mission-runtime";
import { digestAnchor } from "../../src/mission-reconciliation";
import { MISSION_TURN_VERSION } from "../../src/mission-turn";

export const createMissionRuntime: MissionRuntimeFactory = async (context): Promise<PreparedMissionExecution> => {
  const anchor = await context.timeline.latestReconciledAnchor(context.missionId);
  return {
    turn: {
      version: MISSION_TURN_VERSION,
      turnId: `deterministic-${context.missionId}`,
      baselineWatermark: anchor?.reconciledWatermark ?? 0,
      ...(anchor === undefined ? {} : { anchorDigest: digestAnchor(anchor) }),
      sourceRefs: ["test:detached-runtime-module"],
    },
    controller: {
      async advance() {
        return {
          kind: "finished",
          run: {
            status: "returned",
            text: "detached runtime completed",
            messages: [],
            batches: [],
            tasks: [],
            uncoveredObligations: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              cachedInputTokens: 0,
            },
          },
        };
      },
      async resume() {
        throw new Error("deterministic runtime has no parked batch");
      },
      observeInput() {},
      cancel() {},
    },
  };
};
