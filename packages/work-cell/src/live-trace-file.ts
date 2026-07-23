import { appendFileSync } from "node:fs";
import type { TraceEvent } from "./contracts";

type AppendEvent = (path: string, content: string) => void;

export interface LiveTraceFile {
  observe(event: TraceEvent): void;
  availablePath(): string | undefined;
}

/** Persist one run's bounded trace without claiming a failed or partial sink as available. */
export function createLiveTraceFile(
  inputPath: string,
  announce: (message: string) => void,
  append: AppendEvent = (path, content) => appendFileSync(path, content, "utf8"),
): LiveTraceFile {
  let candidatePath: string | undefined;
  let available = false;
  let announced = false;

  return {
    observe(event) {
      if (!candidatePath) {
        const runId = event.type === "cell.started"
          ? stringField(event.data, "runId")
          : undefined;
        if (!runId) throw new Error("the first Work Cell event did not identify its run");
        candidatePath = `${inputPath.replace(/\.json$/, "")}.${runId}.events.jsonl`;
      }

      try {
        append(candidatePath, `${JSON.stringify(event)}\n`);
        available = true;
      } catch (error) {
        available = false;
        throw error;
      }

      if (!announced) {
        announce(`[work-cell] events: ${candidatePath}`);
        announced = true;
      }
    },
    availablePath() {
      return available ? candidatePath : undefined;
    },
  };
}

function stringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
}
