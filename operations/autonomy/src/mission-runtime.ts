import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { FileMissionTimeline } from "./delegate-timeline";
import type { MissionExecutionController } from "./mission-execution-host";
import type { MissionTurnStart } from "./mission-turn";

export interface MissionRuntimeContext {
  readonly root: string;
  readonly missionId: string;
  readonly timeline: FileMissionTimeline;
  readonly recovery?: {
    readonly action: "resume" | "replace";
    readonly interruptedTurn: MissionTurnStart;
  };
}

export interface PreparedMissionExecution {
  readonly turn: MissionTurnStart;
  readonly controller: MissionExecutionController;
}

export type MissionRuntimeFactory = (
  context: MissionRuntimeContext,
) => PreparedMissionExecution | Promise<PreparedMissionExecution>;

/** Load one explicitly trusted local adapter; model-authored input never selects it. */
export async function loadMissionRuntimeFactory(modulePath: string): Promise<MissionRuntimeFactory> {
  const absolutePath = resolve(modulePath);
  const loaded = await import(pathToFileURL(absolutePath).href) as Record<string, unknown>;
  const factory = loaded.createMissionRuntime;
  if (typeof factory !== "function") {
    throw new Error(`Mission runtime ${absolutePath} must export createMissionRuntime(context)`);
  }
  return factory as MissionRuntimeFactory;
}
