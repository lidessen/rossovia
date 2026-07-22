import type { MissionRuntimeFactory } from "../../src/mission-runtime";
import { MISSION_TURN_VERSION } from "../../src/mission-turn";

export const createMissionRuntime: MissionRuntimeFactory = async (context) => {
  const recovery = context.recovery;
  if (recovery === undefined) throw new Error("recovery fixture requires an explicit recovery action");
  const turn = recovery.action === "resume"
    ? recovery.interruptedTurn
    : {
      version: MISSION_TURN_VERSION,
      turnId: `${recovery.interruptedTurn.turnId}-replacement`,
      baselineWatermark: recovery.interruptedTurn.baselineWatermark,
      sourceRefs: ["test:replacement-runtime"],
    };
  return {
    turn,
    controller: {
      async advance() {
        return {
          kind: "finished",
          run: {
            status: "returned",
            text: `${recovery.action} runtime completed`,
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
        throw new Error("recovery fixture has no parked batch");
      },
      observeInput() {},
      cancel() {},
    },
  };
};
