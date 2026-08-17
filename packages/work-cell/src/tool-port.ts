/**
 * The neutral caller-injected cell tool port (C2 tool surface).
 *
 * `CellToolSet` is deliberately non-serializable: each tool carries a caller
 * closure (`execute`) and therefore lives in `RunCellOptions.tools` beside the
 * injected host, never inside the serializable `CellInput`. The core owns
 * admission and termination for these tools exactly like host effects: every
 * execute promise covers the call's full effect and its settled evidence, the
 * caller receives the Cell's exact combined execution signal, new calls are
 * refused after the admission gate closes, and admitted calls are joined
 * before the final. The core retains only the sorted authorized tool names
 * and, per invocation, the name, exact toolCallId, and settled outcome —
 * never the input, result, or implementation identity.
 *
 * This module is provider-neutral: it imports no AI SDK, harness, or provider
 * surface. Concrete drivers translate the gated `CellToolSurface` into their
 * own tool objects at the Integration boundary.
 */

/** Same lowercase snake_case contract as declared terminal tool names. */
export const CELL_TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** A portable JSON Schema whose root describes one call input object. */
export type CellToolInputSchema = Record<string, unknown> & { type: "object" };

/**
 * The per-invocation context the caller-owned implementation receives:
 * exactly the provider-generated identity of this single call plus the Work
 * Cell combined execution signal (caller signal + duration timeout). Nothing
 * else — no workspace, host, or second authority — crosses into the caller
 * closure.
 */
export interface CellToolExecutionContext {
  /** The exact Work Cell combined execution signal (caller signal + duration timeout). */
  readonly signal: AbortSignal;
  /** The exact provider-generated identity of this single call. */
  readonly toolCallId: string;
}

export interface CellTool {
  readonly description: string;
  /** Object-root JSON Schema for the call input. */
  readonly inputSchema: CellToolInputSchema;
  /**
   * Caller-owned execution. The returned promise must cover every effect and
   * piece of evidence of this call; the Cell joins it before finalization
   * and never returns a final while quiescence is unproven.
   */
  execute(input: unknown, context: CellToolExecutionContext): Promise<unknown>;
}

/**
 * The readonly name-keyed injected tool set. The key is the tool name; the
 * values carry description, object-root inputSchema, and execute. Functions
 * are caller capabilities and are never serialized.
 */
export type CellToolSet = Readonly<Record<string, CellTool>>;

/** The settled outcome retained per invocation; never input, result, or identity. */
export type CellToolSettledOutcome = "fulfilled" | "rejected" | "refused";

/**
 * The gated, provider-neutral surface a driver receives through
 * `DriverContext.cellTools`. `execute` rejects new calls after the Cell
 * admission gate closes; every admitted call is joined before the final.
 */
export interface CellToolSurface {
  /** The validated neutral tool definitions, keyed by declared name. */
  readonly tools: CellToolSet;
  execute(name: string, input: unknown, toolCallId: string): Promise<unknown>;
  /**
   * One core-owned refusal: retain the bounded `{ name, toolCallId,
   * outcome: "refused" }` evidence for a model-issued invocation denied
   * before caller execution (for example after terminal action closure),
   * without ever invoking the caller implementation. Adapters route
   * action-closure denials through this operation instead of fabricating
   * an absent event.
   */
  refuse(name: string, toolCallId: string): Promise<void>;
}

/**
 * Neutral contract validation before dispatch: name shape, nonempty
 * description, object-root input schema, executable implementation, and no
 * collision with a declared terminal tool. A name-keyed set cannot carry a
 * duplicate name. Active host/task-surface collisions are rejected by each
 * driver before provider dispatch, because only the driver owns that surface.
 */
export function cellToolContractErrors(
  tools: CellToolSet,
  terminalNames: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const [name, tool] of Object.entries(tools)) {
    if (!CELL_TOOL_NAME_PATTERN.test(name)) {
      errors.push(`cell tool names use lowercase snake_case: ${name}`);
    } else if (terminalNames.includes(name)) {
      errors.push(`cell tool name conflicts with a declared terminal tool: ${name}`);
    }
    if (tool === undefined) {
      errors.push(`cell tool ${name} is missing its definition`);
      continue;
    }
    if (typeof tool.description !== "string" || tool.description.trim().length === 0) {
      errors.push(`cell tool ${name} requires a nonempty description`);
    }
    if (typeof tool.inputSchema !== "object" || tool.inputSchema === null
      || tool.inputSchema.type !== "object") {
      errors.push(`cell tool ${name} requires an object-root input schema`);
    }
    if (typeof tool.execute !== "function") {
      errors.push(`cell tool ${name} requires a caller-owned execute implementation`);
    }
  }
  return errors;
}
