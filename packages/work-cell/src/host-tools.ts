import { tool, type Tool } from "ai";
import { z } from "zod";
import type { CellInput } from "./contracts";
import type { DriverContext } from "./driver";
import type { TaskStore } from "./task-store";
import { createTaskTools } from "./task-tools";
import { createWorkspaceEditTool } from "./workspace-edit";
import type { TaskToolSet } from "./ai-sdk-driver";

/**
 * The one host-executed tool owner shared by every CellDriver: ordinary task
 * work and conversation carriers always cross the same scope-bound tool
 * surface, and no driver re-implements a second execution pathway.
 */
export const EXECUTION_TOOL_NAMES = new Set([
  "list_files",
  "read_file",
  "edit_file",
  "write_file",
  "run_command",
  "task_create",
  "task_update",
  "task_list",
  "task_get",
]);

export interface HostToolOptions {
  readonly input: CellInput;
  readonly context: DriverContext;
  readonly tasks: TaskStore;
  readonly taskToolSet: TaskToolSet;
  /** Blocked-state projection: returns the blocking result when the action phase is closed. */
  readonly actionBlocked: () => unknown | undefined;
  /**
   * Full-file write semantics. `create-new-only` refuses to overwrite an
   * existing file (the harness-safety default); `overwrite-allowed` keeps the
   * general adapter contract where a full writer may replace a file.
   */
  readonly fullWriteMode: "create-new-only" | "overwrite-allowed";
  /** Experiment seam: narrow adapters may present additional evidence after a confirmed write. */
  readonly decorateWriteResult?: (
    result: { path: string; characters: number },
    context: DriverContext,
  ) => unknown;
}

export function createHostTools(options: HostToolOptions): Record<string, Tool> {
  const { input, context, tasks, actionBlocked } = options;
  const editTool = createWorkspaceEditTool(context.workspace);
  return {
    ...(context.workspace.canRead
      ? {
          list_files: tool({
            description: "List files inside the declared workspace read scope.",
            inputSchema: z.object({
              path: z.string().default("."),
              maxEntries: z.number().int().positive().max(2_000).default(500),
            }),
            execute: async ({ path, maxEntries }) => {
              const blocked = actionBlocked();
              if (blocked !== undefined) return blocked;
              const files = await context.workspace.listFiles(path, maxEntries);
              context.emit("tool.list_files", { path, count: files.length });
              return { files };
            },
          }),
          read_file: tool({
            description: "Read a UTF-8 file inside the declared workspace read scope.",
            inputSchema: z.object({
              path: z.string().min(1),
              startLine: z.number().int().positive().default(1),
              endLine: z.number().int().positive().optional(),
            }),
            execute: async ({ path, startLine, endLine }) => {
              const blocked = actionBlocked();
              if (blocked !== undefined) return blocked;
              const content = await context.workspace.readText(path, startLine, endLine);
              context.emit("tool.read_file", { path, startLine, endLine, characters: content.length });
              return { path, content };
            },
          }),
        }
      : {}),
    ...(context.workspace.canWrite
      ? {
          edit_file: tool({
            description:
              "Edit one existing file inside the declared workspace write scope with exact text replacement. "
              + "Every edits[].oldText must match a unique, non-overlapping region of the original file; "
              + "an absent, duplicated, overlapping, or out-of-scope match fails the whole call with no mutation. "
              + "Prefer edit_file over write_file whenever the file already exists.",
            inputSchema: z.object({
              path: z.string().min(1),
              edits: z.array(z.object({
                oldText: z.string().min(1),
                newText: z.string(),
              }).strict()).min(1),
            }).strict(),
            execute: async (value, callOptions) => {
              const blocked = actionBlocked();
              if (blocked !== undefined) return blocked;
              const started = performance.now();
              const result = await editTool.execute(
                "host-edit",
                value,
                callOptions.abortSignal,
                () => {},
              );
              const details = asRecord(asRecord(result).details);
              // Attributable trace metadata only; edit content and diff text
              // never enter the retained trace.
              context.emit("tool.edit_file", {
                path: value.path,
                edits: value.edits.length,
                ...(typeof details.firstChangedLine === "number"
                  ? { firstChangedLine: details.firstChangedLine }
                  : {}),
                durationMs: Math.round(performance.now() - started),
              });
              return result;
            },
          }),
          write_file: tool({
            description: options.fullWriteMode === "create-new-only"
              ? "Write a complete UTF-8 file inside the declared workspace write scope. Refuses to overwrite an existing file; use edit_file for existing files."
              : "Write a complete UTF-8 file inside the declared workspace write scope.",
            inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
            execute: async ({ path, content }) => {
              const blocked = actionBlocked();
              if (blocked !== undefined) return blocked;
              if (options.fullWriteMode === "create-new-only") {
                await context.workspace.createText(path, content);
              } else {
                await context.workspace.writeText(path, content);
              }
              context.emit("tool.write_file", { path, characters: content.length });
              return (options.decorateWriteResult
                ? options.decorateWriteResult({ path, characters: content.length }, context)
                : { path, characters: content.length });
            },
          }),
        }
      : {}),
    ...(context.workspace.canRunCommands
      ? {
          run_command: tool({
            description: "Run one allow-listed executable without a shell inside the workspace.",
            inputSchema: z.object({
              argv: z.array(z.string()).min(1),
              cwd: z.string().default("."),
              timeoutMs: z.number().int().positive().max(input.budget.maxDurationMs).default(60_000),
            }),
            execute: async ({ argv, cwd, timeoutMs }) => {
              const blocked = actionBlocked();
              if (blocked !== undefined) return blocked;
              const result = await context.workspace.runCommand(argv, cwd, timeoutMs, context.signal);
              context.emit("tool.run_command", { argv, cwd, ...result });
              return result;
            },
          }),
        }
      : {}),
    ...createTaskTools(tasks, {
      projection: options.taskToolSet === "manage"
        ? { read: "all", create: true, update: "all", principal: input.id }
        : options.taskToolSet === "read-update"
          ? { read: "all", create: false, update: "status", updateScope: "owned", principal: input.id }
          : { read: "all", create: false, update: "none", principal: input.id },
      actionBlocked,
      emit: (event) => context.emit(event.type, event.data),
    }),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

/** The action phase is closed; only a declared terminal tool may be invoked. */
export function terminalActionRequired() {
  return {
    accepted: false,
    error: "The action phase is closed. Invoke one declared terminal tool now.",
  };
}
