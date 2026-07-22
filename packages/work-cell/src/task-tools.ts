import { tool } from "ai";
import { z } from "zod";
import type { Task } from "./contracts";
import { TaskStore } from "./task-store";

export interface TaskToolProjection {
  readonly read: "all" | "owned";
  readonly create: boolean;
  readonly update: "all" | "status" | "none";
  readonly updateScope?: "all" | "owned";
  readonly assignOwner?: boolean;
  readonly principal?: string;
}

export interface TaskToolEvent {
  readonly type: "task.created" | "task.updated" | "task.listed" | "task.read";
  readonly data: unknown;
}

export interface TaskToolOptions {
  readonly projection: TaskToolProjection;
  readonly emit?: (event: TaskToolEvent) => void;
  readonly actionBlocked?: () => unknown | undefined;
}

export function createTaskTools(store: TaskStore, options: TaskToolOptions) {
  const { projection } = options;
  if (projection.read === "owned" && !projection.principal) {
    throw new Error("owned task projection requires a principal");
  }
  if (projection.update !== "none" && projection.updateScope === "owned" && !projection.principal) {
    throw new Error("owned task update projection requires a principal");
  }
  const visible = (task: Task) => projection.read === "all" || task.owner === projection.principal;
  const requireVisible = (id: string): Task => {
    const task = store.get(id);
    if (!visible(task)) throw new Error(`task ${id} is outside this tool projection`);
    return task;
  };
  const requireMutable = (id: string): Task => {
    const task = requireVisible(id);
    if ((projection.updateScope ?? "all") === "owned" && task.owner !== projection.principal) {
      throw new Error(`task ${id} is not assigned to ${projection.principal}`);
    }
    return task;
  };
  const guard = () => options.actionBlocked?.();
  const view = (task: Task) => ({ ...task, blocked: store.isBlocked(task) });

  const readTools = {
    task_list: tool({
      description: "List the tasks visible to this execution role, including derived blocked state.",
      inputSchema: z.object({}).strict(),
      execute: async () => {
        const blocked = guard();
        if (blocked !== undefined) return blocked;
        const tasks = store.list(visible).map(view);
        options.emit?.({ type: "task.listed", data: { count: tasks.length } });
        return { tasks };
      },
    }),
    task_get: tool({
      description: "Read one visible task with its full description, ownership, dependencies, and derived blocked state.",
      inputSchema: z.object({ taskId: z.string().min(1) }).strict(),
      execute: async ({ taskId }) => {
        const blocked = guard();
        if (blocked !== undefined) return blocked;
        const task = requireVisible(taskId);
        options.emit?.({ type: "task.read", data: { taskId } });
        return { task: view(task) };
      },
    }),
  };

  const createTool = projection.create
    ? {
        task_create: tool({
          description: "Create one concrete task. The host assigns its ID and initial pending status.",
          inputSchema: z.object({
            subject: z.string().min(1),
            description: z.string().min(1),
            ...(projection.assignOwner ? { owner: z.string().min(1).optional() } : {}),
            blockedBy: z.array(z.string().min(1)).default([]),
          }).strict(),
          execute: async (input) => {
            const blocked = guard();
            if (blocked !== undefined) return blocked;
            const owner = "owner" in input && typeof input.owner === "string"
              ? input.owner
              : projection.principal;
            const task = store.create({
              subject: input.subject,
              description: input.description,
              ...(owner === undefined ? {} : { owner }),
              blockedBy: input.blockedBy,
            });
            options.emit?.({ type: "task.created", data: { task } });
            return { task: view(task) };
          },
        }),
      }
    : {};

  const updateTool = projection.update === "none"
    ? {}
    : projection.update === "status"
      ? {
          task_update: tool({
            description: "Update only the execution status of one task assigned to this role.",
            inputSchema: z.object({
              taskId: z.string().min(1),
              status: z.enum(["pending", "in_progress", "completed"]),
            }).strict(),
            execute: async ({ taskId, status }) => {
              const blocked = guard();
              if (blocked !== undefined) return blocked;
              requireMutable(taskId);
              const task = store.update(taskId, { status });
              options.emit?.({ type: "task.updated", data: { task } });
              return { task: view(task) };
            },
          }),
        }
      : {
          task_update: tool({
            description: "Update one task's content, status, ownership, or dependency set. Omitted fields remain unchanged.",
            inputSchema: z.object({
              taskId: z.string().min(1),
              subject: z.string().min(1).optional(),
              description: z.string().min(1).optional(),
              status: z.enum(["pending", "in_progress", "completed"]).optional(),
              ...(projection.assignOwner ? { owner: z.string().min(1).nullable().optional() } : {}),
              blockedBy: z.array(z.string().min(1)).optional(),
            }).strict().refine((value) => Object.keys(value).some((key) => key !== "taskId"), {
              message: "task_update requires at least one changed field",
            }),
            execute: async (input) => {
              const blocked = guard();
              if (blocked !== undefined) return blocked;
              requireMutable(input.taskId);
              const owner = "owner" in input
                ? input.owner === null || typeof input.owner === "string" ? input.owner : undefined
                : undefined;
              const task = store.update(input.taskId, {
                ...(input.subject === undefined ? {} : { subject: input.subject }),
                ...(input.description === undefined ? {} : { description: input.description }),
                ...(input.status === undefined ? {} : { status: input.status }),
                ...(owner === undefined ? {} : { owner }),
                ...(input.blockedBy === undefined ? {} : { blockedBy: input.blockedBy }),
              });
              options.emit?.({ type: "task.updated", data: { task } });
              return { task: view(task) };
            },
          }),
        };

  return { ...readTools, ...createTool, ...updateTool };
}
