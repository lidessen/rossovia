import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Budget, BudgetEnvelope, CellInput, CellRunRecord, ChildCellSpec } from "./contracts";
import type { CellDriver } from "./driver";
import { runCell } from "./run-cell";

export interface CellTreeLimits {
  maxDepth: number;
  maxCells: number;
}

export interface CellTreeResult {
  rootRunId: string;
  status: "completed" | "partial";
  records: CellRunRecord[];
  unresolvedChildren: Array<{
    parentRunId?: string;
    child: ChildCellSpec;
    reason: "max_depth" | "max_cells" | "no_write_scope" | "budget_envelope";
  }>;
  budget?: TreeBudgetSettlement;
}

export interface TreeBudgetSettlement {
  envelope: BudgetEnvelope;
  consumedTokens: number;
  remainingTokens: number;
  overrunTokens: number;
  status: "settled" | "partial";
  allocations: Array<{ runId: string; cellId: string; allocatedTokens: number; observedTokens: number }>;
}

export interface CellTreeOptions {
  limits: CellTreeLimits;
  createDriver(): CellDriver;
  createChildWorkspace?: (
    parent: CellRunRecord,
    child: ChildCellSpec,
    ordinal: number,
  ) => Promise<string>;
}

export async function runCellTree(
  root: CellInput,
  options: CellTreeOptions,
  signal?: AbortSignal,
): Promise<CellTreeResult> {
  if (options.limits.maxDepth < 0 || options.limits.maxCells < 1) {
    throw new Error("tree limits require maxDepth >= 0 and maxCells >= 1");
  }
  const records: CellRunRecord[] = [];
  const unresolvedChildren: CellTreeResult["unresolvedChildren"] = [];
  const envelope = root.budgetEnvelope;
  let consumedTokens = 0;
  const allocations: NonNullable<CellTreeResult["budget"]>["allocations"] = [];
  const pending: Array<{ input: CellInput; parent?: CellRunRecord; child?: ChildCellSpec; ordinal: number }> = [
    { input: root, ordinal: 0 },
  ];

  while (pending.length > 0 && records.length < options.limits.maxCells) {
    const next = pending.shift();
    if (!next) break;
    const remainingTokens = envelope ? Math.max(0, envelope.maxTotalTokens - consumedTokens) : undefined;
    if (envelope && remainingTokens === 0) {
      unresolvedChildren.push({
        ...(next.parent ? { parentRunId: next.parent.runId } : {}),
        child: next.child ?? childFromInput(next.input),
        reason: "budget_envelope",
      });
      continue;
    }
    const allocatedTokens = envelope
      ? Math.min(next.input.budget.maxTokens, remainingTokens ?? next.input.budget.maxTokens)
      : next.input.budget.maxTokens;
    const input = envelope
      ? { ...next.input, budget: { ...next.input.budget, maxTokens: allocatedTokens } }
      : next.input;
    const record = await runCell(input, options.createDriver(), signal);
    records.push(record);
    if (envelope) {
      consumedTokens += record.usage.totalTokens;
      allocations.push({
        runId: record.runId,
        cellId: record.cellId,
        allocatedTokens,
        observedTokens: record.usage.totalTokens,
      });
    }
    const children = record.submission?.outcome === "split" ? record.submission.children : [];
    for (const [index, child] of children.entries()) {
      if (record.depth >= options.limits.maxDepth) {
        unresolvedChildren.push({ parentRunId: record.runId, child, reason: "max_depth" });
        continue;
      }
      if (records.length + pending.length >= options.limits.maxCells) {
        unresolvedChildren.push({ parentRunId: record.runId, child, reason: "max_cells" });
        continue;
      }
      const writePaths = intersectScopes(input.workspace.writePaths, child.scope);
      if (input.workspace.writePaths.length > 0 && writePaths.length === 0) {
        unresolvedChildren.push({ parentRunId: record.runId, child, reason: "no_write_scope" });
        continue;
      }
      const rootPath = options.createChildWorkspace
        ? await options.createChildWorkspace(record, child, index)
        : await copyWorkspace(input.workspace.root, `${record.runId}-${index}`);
      pending.push({
        ordinal: index,
        parent: record,
        child,
        input: {
          ...input,
          id: child.id,
          intent: child.intent,
          workspace: {
            ...input.workspace,
            root: rootPath,
            readPaths: unique([
              ...child.scope,
              next.input.genome.sequencePath,
              next.input.genome.interpretationsDir,
            ]),
            writePaths,
          },
          capabilitiesRequired: child.capabilitiesRequired,
          acceptance: child.acceptance,
          budget: mergeBudget(input.budget, child.budget),
          lineage: { parentRunId: record.runId, depth: record.depth + 1 },
        },
      });
    }
  }

  const budget: TreeBudgetSettlement | undefined = envelope
    ? {
        envelope,
        consumedTokens,
        remainingTokens: Math.max(0, envelope.maxTotalTokens - consumedTokens),
        overrunTokens: Math.max(0, consumedTokens - envelope.maxTotalTokens),
        status:
          unresolvedChildren.some((child) => child.reason === "budget_envelope") ||
          consumedTokens > envelope.maxTotalTokens
            ? "partial"
            : "settled",
        allocations,
      }
    : undefined;
  return {
    rootRunId: records[0]?.runId ?? "",
    status: budget?.status === "partial" ? "partial" : "completed",
    records,
    unresolvedChildren,
    ...(budget ? { budget } : {}),
  };
}

function childFromInput(input: CellInput): ChildCellSpec {
  return {
    id: input.id,
    intent: input.intent,
    scope: input.workspace.readPaths,
    capabilitiesRequired: input.capabilitiesRequired,
    acceptance: input.acceptance,
    budget: input.budget,
  };
}

function mergeBudget(parent: Budget, child: ChildCellSpec["budget"]): Budget {
  return {
    maxSteps: child?.maxSteps ?? parent.maxSteps,
    maxTokens: child?.maxTokens ?? parent.maxTokens,
    maxDurationMs: child?.maxDurationMs ?? parent.maxDurationMs,
    maxCommandOutputBytes: child?.maxCommandOutputBytes ?? parent.maxCommandOutputBytes,
  };
}

async function copyWorkspace(source: string, suffix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `work-cell-child-${suffix}-`));
  await cp(source, root, { recursive: true, force: true });
  return root;
}

function intersectScopes(parentScopes: string[], childScopes: string[]): string[] {
  const result: string[] = [];
  for (const parent of parentScopes) {
    for (const child of childScopes) {
      const normalizedParent = normalize(parent);
      const normalizedChild = normalize(child);
      if (contains(normalizedParent, normalizedChild)) result.push(normalizedChild);
      else if (contains(normalizedChild, normalizedParent)) result.push(normalizedParent);
    }
  }
  return unique(result);
}

function contains(parent: string, child: string): boolean {
  return parent === "." || child === parent || child.startsWith(`${parent}/`);
}

function normalize(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  return normalized || ".";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalize))];
}
