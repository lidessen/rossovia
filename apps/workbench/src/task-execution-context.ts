import { createHash } from "node:crypto";
import { z } from "zod";
import type { PrincipalTask } from "./contracts";

const nonempty = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION =
  "rosso.workbench-task-execution-context.v1" as const;
export const WORKBENCH_TASK_EXECUTION_CONTEXT_REF_VERSION =
  "rosso.workbench-task-execution-context-ref.v1" as const;
export const WORKBENCH_TASK_EXECUTION_CONTEXT_ENV =
  "ROSSO_WORKBENCH_TASK_EXECUTION_CONTEXT";

export const WorkbenchTaskExecutionContextSchema = z.object({
  version: z.literal(WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION),
  taskId: nonempty,
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

export const WorkbenchTaskExecutionContextRefSchema = z.object({
  version: z.literal(WORKBENCH_TASK_EXECUTION_CONTEXT_REF_VERSION),
  taskId: nonempty,
  taskRevision: z.number().int().positive(),
  contextDigest: digest,
}).strict();

export type WorkbenchTaskExecutionContext = z.infer<
  typeof WorkbenchTaskExecutionContextSchema
>;
export type WorkbenchTaskExecutionContextRef = z.infer<
  typeof WorkbenchTaskExecutionContextRefSchema
>;

export function workbenchTaskExecutionContextDigest(
  context: WorkbenchTaskExecutionContext,
): string {
  const parsed = WorkbenchTaskExecutionContextSchema.parse(context);
  return createHash("sha256")
    .update(stableStringify(parsed))
    .digest("hex");
}

export function workbenchTaskExecutionContextRef(
  context: WorkbenchTaskExecutionContext,
): WorkbenchTaskExecutionContextRef {
  const checked = WorkbenchTaskExecutionContextSchema.parse(context);
  return WorkbenchTaskExecutionContextRefSchema.parse({
    version: WORKBENCH_TASK_EXECUTION_CONTEXT_REF_VERSION,
    taskId: checked.taskId,
    taskRevision: checked.taskRevision,
    contextDigest: workbenchTaskExecutionContextDigest(checked),
  });
}

export function workbenchTaskExecutionContextFor(
  task: PrincipalTask,
  execution: {
    readonly authorizationId: string;
    readonly proposalDigest: string;
  },
): WorkbenchTaskExecutionContext {
  if (
    task.binding.kind !== "project-context"
    || task.binding.missionId === undefined
  ) {
    throw new Error(
      `task ${task.id} requires exact project and Mission context for execution`,
    );
  }
  return WorkbenchTaskExecutionContextSchema.parse({
    version: WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION,
    taskId: task.id,
    taskRevision: task.revision,
    objective: task.objective,
    acceptance: task.acceptance,
    corrections: task.corrections.map((correction) => ({
      id: correction.id,
      statement: correction.statement,
      sourceRef: correction.sourceRef,
    })),
    binding: {
      projectId: task.binding.projectId,
      missionId: task.binding.missionId,
    },
    execution,
  });
}

export function sameWorkbenchTaskExecutionContextRef(
  left: WorkbenchTaskExecutionContextRef,
  right: WorkbenchTaskExecutionContextRef,
): boolean {
  return left.version === right.version
    && left.taskId === right.taskId
    && left.taskRevision === right.taskRevision
    && left.contextDigest === right.contextDigest;
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
