import { createHash } from "node:crypto";
import { z } from "zod";

const nonempty = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION =
  "rosso.workbench-task-execution-context.v1" as const;
export const WORKBENCH_TASK_EXECUTION_CONTEXT_ENV =
  "ROSSO_WORKBENCH_TASK_EXECUTION_CONTEXT";

export const WorkbenchTaskExecutionContextSchema = z.object({
  version: z.literal(WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION),
  taskId: nonempty,
  sourceRevision: z.number().int().nonnegative(),
  taskRevision: z.number().int().positive(),
  objective: nonempty,
  acceptance: z.array(nonempty).min(1),
  corrections: z.array(z.object({
    id: nonempty,
    statement: nonempty,
    sourceRef: nonempty,
  }).strict()),
  binding: z.object({
    projectId: nonempty,
    missionId: nonempty,
  }).strict(),
  execution: z.object({
    authorizationId: z.string().uuid(),
    proposalDigest: digest,
  }).strict(),
}).strict();

export type WorkbenchTaskExecutionContext = z.infer<
  typeof WorkbenchTaskExecutionContextSchema
>;

export function workbenchTaskExecutionContextDigest(
  context: WorkbenchTaskExecutionContext,
): string {
  const parsed = WorkbenchTaskExecutionContextSchema.parse(context);
  return createHash("sha256")
    .update(stableStringify(parsed))
    .digest("hex");
}

export function workbenchTaskCorrectionGuidanceRefs(
  context: WorkbenchTaskExecutionContext,
) {
  const checked = WorkbenchTaskExecutionContextSchema.parse(context);
  const taskContextDigest = workbenchTaskExecutionContextDigest(checked);
  return checked.corrections.map((correction) => {
    const payload = {
      taskId: checked.taskId,
      correctionId: correction.id,
      statement: correction.statement,
      sourceRef: correction.sourceRef,
      authorizationId: checked.execution.authorizationId,
      proposalDigest: checked.execution.proposalDigest,
    };
    const payloadDigest = createHash("sha256")
      .update(stableStringify(payload))
      .digest("hex");
    return {
      version: "rosso.turn-guidance-ref.v1" as const,
      kind: "workbench-task-correction" as const,
      guidanceId: `workbench-task-correction:sha256:${createHash("sha256")
        .update(stableStringify({
          taskId: checked.taskId,
          correctionId: correction.id,
          authorizationId: checked.execution.authorizationId,
        }))
        .digest("hex")}`,
      taskId: checked.taskId,
      correctionId: correction.id,
      sourceRef: correction.sourceRef,
      payloadDigest,
      taskContextDigest,
    };
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
