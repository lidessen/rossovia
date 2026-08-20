import { showPrincipalTask } from "./tasks";
import { taskReceiptEvidenceRef } from "./conversation/contracts";

export type SelfCheckTaskLifecycle = "open" | "in-progress" | "waiting" | "verifying" | "settled";

/**
 * Read-only projection of one existing Principal Task. The Task source and
 * its revision remain authoritative; this adapter never creates, mutates, or
 * subscribes to Task state.
 */
export interface SelfCheckTaskSnapshot {
  readonly taskId: string;
  readonly sourceRevision: number;
  readonly taskRevision: number;
  readonly title: string;
  readonly objective: string;
  readonly acceptance: readonly string[];
  readonly todos: readonly string[];
  readonly lifecycle: SelfCheckTaskLifecycle;
  readonly evidenceRefs: readonly string[];
}

export interface SelfCheckTaskReadPort {
  read(home: string, taskId: string): SelfCheckTaskSnapshot;
}

export const defaultSelfCheckTaskReadPort: SelfCheckTaskReadPort = {
  read(home, taskId) {
    const shown = showPrincipalTask(home, taskId);
    return {
      taskId: shown.task.id,
      sourceRevision: shown.sourceRevision,
      taskRevision: shown.task.revision,
      title: shown.task.title,
      objective: shown.task.objective,
      acceptance: [...shown.task.acceptance],
      todos: [...shown.task.todos],
      lifecycle: shown.task.lifecycle,
      evidenceRefs: [taskReceiptEvidenceRef(shown.task.id, shown.sourceRevision)],
    };
  },
};

export function sameSelfCheckTaskRevision(
  before: SelfCheckTaskSnapshot,
  after: SelfCheckTaskSnapshot,
): boolean {
  return before.taskId === after.taskId
    && before.sourceRevision === after.sourceRevision
    && before.taskRevision === after.taskRevision;
}
