import type { UserModelMessage } from "ai";
import type { CellInput, CellUsage } from "./contracts";
import type { DriverContext } from "./driver";
import type { TaskToolSet } from "./ai-sdk-driver";

/** Shared pure helpers for driver instructions, evidence projection, and usage. */

export function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

export function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Live supervision needs to know which boundary a tool is touching without
 * retaining model-authored file content, command output, or hidden reasoning.
 */
export function safeToolTarget(name: string, input: unknown): Record<string, unknown> {
  const value = asRecord(input);
  if (name === "write_file" || name === "read_file" || name === "edit_file" || name === "list_files") {
    return typeof value.path === "string"
      ? { target: { kind: "workspace-path", path: value.path } }
      : {};
  }
  if (name === "run_command") {
    const argv = Array.isArray(value.argv)
      ? value.argv.filter((item): item is string => typeof item === "string")
      : [];
    return {
      target: {
        kind: "command",
        executable: argv[0] ?? "unknown",
        cwd: typeof value.cwd === "string" ? value.cwd : ".",
      },
    };
  }
  return {};
}

export function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}

export function renderRecoveryEvidence(steps: readonly unknown[]): string {
  const evidence: unknown[] = [];
  const seen = new Set<string>();
  for (const [stepIndex, value] of steps.entries()) {
    const step = asRecord(value);
    const results = Array.isArray(step.toolResults) ? step.toolResults : [];
    for (const value of results) {
      const result = asRecord(value);
      const output = result.output;
      if (asRecord(output).accepted === false) continue;
      const retained = {
        step: stepIndex + 1,
        tool: result.toolName,
        input: result.input,
        output,
      };
      const identity = JSON.stringify({
        tool: retained.tool,
        input: retained.input,
        output: retained.output,
      });
      if (seen.has(identity)) continue;
      seen.add(identity);
      evidence.push(retained);
    }
  }
  return evidence.length > 0
    ? JSON.stringify(evidence)
    : "No successful tool result was retained; submit only the bounded facts available from the task contract.";
}

export function renderExecutionInstructions(
  input: CellInput,
  options: { deferStructuredOutput?: boolean; taskToolSet: TaskToolSet },
): string {
  const terminalInstruction = input.terminalTools?.length
    ? `Finish by invoking exactly one declared terminal tool: ${input.terminalTools.map((terminal) => terminal.name).join(", ")}.`
    : "A terminal tool is not required. Leave a concise final response after completing the work.";
  const outputInstruction = input.outputSchema && !options.deferStructuredOutput
    ? `Return a final structured output that conforms exactly to this JSON Schema. This is independent of every tool input:\n${JSON.stringify(input.outputSchema)}`
    : undefined;
  const deferredOutputInstruction = input.outputSchema && options.deferStructuredOutput
    ? "A separate structured settlement phase will follow. Complete the necessary investigation first and leave a source-grounded report; do not guess schema fields or stop at placeholders."
    : undefined;
  const artifactInstruction = input.artifacts?.length
    ? `Create each declared artifact in the workspace write scope. Their paths and instructions are binding:\n${input.artifacts.map((artifact) => `- ${artifact.path}: ${artifact.instructions}`).join("\n")}`
    : undefined;
  const taskInstruction = renderTaskInstruction(input, options.taskToolSet);
  return [
    "You are one ephemeral Work Cell. Work only inside the granted tools and workspace.",
    "You own investigation order and local tool choice. You do not own durable acceptance.",
    "Prefer edit_file with exact oldText replacements for existing files; use write_file only for new files.",
    "If the task exceeds your scope or capability, state the bounded blocker in the final response. Do not invoke another agent yourself.",
    terminalInstruction,
    outputInstruction,
    deferredOutputInstruction,
    artifactInstruction,
    taskInstruction,
    ...input.instructions,
    ...input.context.map((section) => `## ${section.title}\n${section.content}`),
  ].filter((section): section is string => Boolean(section)).join("\n\n");
}

export function taskToolNames(taskToolSet: TaskToolSet): string[] {
  if (taskToolSet === "manage") return ["task_list", "task_get", "task_create", "task_update"];
  if (taskToolSet === "read-update") return ["task_list", "task_get", "task_update"];
  return ["task_list", "task_get"];
}

function renderTaskInstruction(input: CellInput, taskToolSet: TaskToolSet): string {
  const seeds = input.tasks?.map((task) => `- ${task.subject}: ${task.description}`).join("\n");
  if (taskToolSet === "read-only") {
    return seeds
      ? `The host supplied read-only task context. Use task_list/task_get for detail; do not claim task mutation authority:\n${seeds}`
      : "Task access is read-only. Use task_list/task_get only if host task context is relevant; do not create or update tasks.";
  }
  if (taskToolSet === "read-update") {
    return seeds
      ? `The host seeded these assigned tasks. Use task_list/task_get for detail and task_update only for execution status; leave no assigned task pending or in_progress at completion. Task completion is process evidence, not correctness:\n${seeds}`
      : "No Task cycle is assigned. The available Task tools cannot create work; do not manufacture a task list.";
  }
  return seeds
    ? `The host seeded these tasks. Use task_list/task_get for detail and task_update as work advances; leave no task pending or in_progress at completion. Task completion is process evidence, not correctness:\n${seeds}`
    : "Use task_create only when several steps or outcomes create real omission risk; skip task tracking for simple work. Use task_list/task_get/task_update to keep created tasks accurate, and complete every created task before finishing. Task completion is process evidence, not correctness.";
}

function renderTaskPrompt(input: CellInput): string {
  return [
    `Intent:\n${input.intent}`,
    `Acceptance:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
    `Capabilities required:\n${input.capabilitiesRequired.join(", ") || "none"}`,
    `Workspace read scope:\n${input.workspace.readPaths.join("\n")}`,
    `Workspace write scope:\n${input.workspace.writePaths.join("\n") || "read-only"}`,
    `Allowed command executables:\n${input.workspace.allowedCommands.join(", ") || "none"}`,
  ].join("\n\n");
}

export async function renderFirstUserInput(
  input: CellInput,
  context: DriverContext,
): Promise<string | UserModelMessage> {
  const task = renderTaskPrompt(input);
  if (!input.imagePaths?.length) return task;
  const images = await Promise.all(input.imagePaths.map(async (path) => ({
    type: "file" as const,
    mediaType: "image",
    data: await context.workspace.readBinary(path),
  })));
  return {
    role: "user",
    content: [
      { type: "text", text: task },
      ...images,
    ],
  };
}
