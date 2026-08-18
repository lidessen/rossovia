import { tool, type Tool } from "ai";
import { z } from "zod";
import type { CellInput } from "../../contracts";
import type { DriverContext } from "../../driver";
import type { TaskStore } from "../../task-store";
import type { CellToolSurface } from "../../tool-port";
import { createTaskTools } from "./task-tools";
import { createWorkspaceEditTool } from "./workspace-edit";
import type { TaskToolSet } from "./task-tool-set";

/**
 * The one host-executed tool owner shared by every AI SDK/Pi CellDriver:
 * ordinary task work and conversation carriers always cross the same
 * scope-bound tool surface, and no driver re-implements a second execution
 * pathway.
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

/**
 * Translate the neutral gated `CellToolSurface` into one driver's AI SDK tool
 * objects. This is the single AI SDK/Pi translation point for caller-injected
 * cell tools: both drivers build the same definitions, so one neutral fixture
 * keeps its name, schema, input, exact toolCallId, result, and caller execute
 * across adapters.
 *
 * Tool-name conflicts with the active host/task/terminal surface and
 * non-object-root input schemas are rejected here — before any provider
 * dispatch. The action closure (`actionBlocked`) applies to injected tools
 * exactly like host tools: once the action phase is closed the caller
 * implementation is never invoked, and the denial is routed through the
 * core-owned gate refusal operation so the bounded `{ name, toolCallId,
 * outcome: "refused" }` evidence is retained while the model still receives
 * the ordinary blocked observation.
 */
export function createCellToolDefinitions(options: {
  surface: CellToolSurface;
  /** The active host/task/terminal tool names of this run's surface. */
  reservedNames: readonly string[];
  actionBlocked: () => unknown | undefined;
}): Record<string, Tool> {
  const entries = Object.entries(options.surface.tools);
  const reserved = new Set(options.reservedNames);
  const conflicts = entries
    .map(([name]) => name)
    .filter((name) => reserved.has(name));
  if (conflicts.length > 0) {
    throw new Error(
      `cell tool names conflict with the active execution tool surface: ${conflicts.join(", ")}`,
    );
  }
  return Object.fromEntries(entries.map(([name, cellTool]) => {
    if (cellTool === undefined
      || typeof cellTool.inputSchema !== "object"
      || cellTool.inputSchema === null
      || cellTool.inputSchema.type !== "object") {
      throw new Error(`cell tool ${name} requires an object-root input schema`);
    }
    return [
      name,
      tool({
        description: cellTool.description,
        inputSchema: z.fromJSONSchema(cellTool.inputSchema),
        execute: async (value, callOptions) => {
          const blocked = options.actionBlocked();
          if (blocked !== undefined) {
            // A model-issued injected call after terminal action closure is
            // an invocation refused before caller execution, not an absent
            // event: route the denial through the one core-owned refusal
            // operation so its bounded evidence is retained, then return the
            // existing blocked observation. The caller execute is never
            // touched.
            try {
              await options.surface.refuse(name, callOptions.toolCallId);
            } catch {
              // The refusal operation never replaces the blocked observation.
            }
            return blocked;
          }
          return options.surface.execute(name, value, callOptions.toolCallId);
        },
      }),
    ];
  }));
}

/** The action phase is closed; only a declared terminal tool may be invoked. */
export function terminalActionRequired() {
  return {
    accepted: false,
    error: "The action phase is closed. Invoke one declared terminal tool now.",
  };
}
