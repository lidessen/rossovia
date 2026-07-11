import { randomUUID } from "node:crypto";
import {
  CellInputSchema,
  WORK_CELL_RECORD_VERSION,
  type CellInput,
  type CellRunRecord,
  type CellTerminalStatus,
  type CellUsage,
  type CheckStep,
  type CheckResult,
} from "./contracts";
import type { CellDriver } from "./driver";
import { CellBudgetExceededError, traceEvent } from "./driver";
import { expressGenome, loadGenome } from "./genome";
import { Workspace } from "./workspace";

export async function runCell(
  unparsedInput: unknown,
  driver: CellDriver,
  externalSignal?: AbortSignal,
): Promise<CellRunRecord> {
  const input = CellInputSchema.parse(unparsedInput);
  const runId = randomUUID();
  const startedAt = new Date();
  const trace = [traceEvent("cell.started", { runId, cellId: input.id })];
  const workspace = await Workspace.create(input.workspace, input.budget);
  const before = await workspace.snapshot();
  const timeoutSignal = AbortSignal.timeout(input.budget.maxDurationMs);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
  const missingCapabilities = input.capabilitiesRequired.filter(
    (capability) => !input.dna.capabilities.includes(capability),
  );

  let status: CellTerminalStatus = "failed";
  let error: string | undefined;
  let driverResult: Awaited<ReturnType<CellDriver["run"]>> | undefined;
  let selectionResult: Awaited<ReturnType<CellDriver["selectGenes"]>> | undefined;
  let geneExpression: CellRunRecord["geneExpression"];
  let loadedInterpretations: string[] = [];
  let failureUsage = emptyUsage();
  let verification = { passed: false, results: [] as CheckResult[] };

  if (missingCapabilities.length > 0) {
    status = "capability_mismatch";
    error = `missing capabilities: ${missingCapabilities.join(", ")}`;
    trace.push(traceEvent("cell.capability_mismatch", { missingCapabilities }));
  } else {
    try {
      const context = {
        workspace,
        signal,
        maxTokens: input.budget.maxTokens,
        emit(type: string, data: unknown) {
          trace.push(traceEvent(type, data));
        },
      };
      const genome = await loadGenome(input, workspace);
      trace.push(
        traceEvent("genome.loaded", {
          source: genome.source,
          genes: genome.genes.map((gene) => gene.pid),
          inheritedLineage: genome.inheritedLineage,
        }),
      );
      selectionResult = await driver.selectGenes(input, genome, context);
      const expressed = await expressGenome(input, workspace, genome, selectionResult.expression);
      geneExpression = expressed.expression;
      loadedInterpretations = expressed.interpretationPaths;
      trace.push(
        traceEvent("genes.expressed", {
          expression: geneExpression,
          interpretationPaths: loadedInterpretations,
        }),
      );
      driverResult = await driver.run(input, expressed, {
        ...context,
        maxTokens: Math.max(1, input.budget.maxTokens - selectionResult.usage.totalTokens),
      });
      if (!driverResult.submission) {
        status = "protocol_error";
        error = "driver completed without submit_result";
      } else {
        verification = await executeCheckPlan(driverResult.submission.checkPlan.steps, workspace, signal);
        status = settleStatus(driverResult.submission.outcome, verification.passed);
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      if (caught instanceof CellBudgetExceededError) {
        status = "budget_exceeded";
        failureUsage = caught.usage ?? emptyUsage();
      }
      else if (signal.aborted) status = "cancelled";
      else status = "failed";
      trace.push(traceEvent("cell.error", { status, error }));
    }
  }

  const after = await workspace.snapshot();
  const finishedAt = new Date();
  const usage = addUsage(
    selectionResult?.usage ?? emptyUsage(),
    driverResult?.usage ?? failureUsage,
  );
  const estimate = estimateCost(usage, driver.descriptor.pricing);
  trace.push(traceEvent("cell.finished", { status }));

  const priceRevision = input.executionProfile?.priceRevision ?? driver.descriptor.pricing?.revision;
  const executionObservation: CellRunRecord["executionObservation"] = {
    ...(input.workEstimate ? { workEstimateId: input.workEstimate.id } : {}),
    ...(input.executionProfile ? { executionProfileId: input.executionProfile.id } : {}),
  };
  if (priceRevision) executionObservation.priceRevision = priceRevision;

  return {
    version: WORK_CELL_RECORD_VERSION,
    runId,
    cellId: input.id,
    ...(input.lineage.parentRunId ? { parentRunId: input.lineage.parentRunId } : {}),
    depth: input.lineage.depth,
    driver: driver.descriptor,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    input,
    ...(geneExpression ? { geneExpression } : {}),
    loadedInterpretations,
    ...(driverResult?.submission ? { submission: driverResult.submission } : {}),
    verification,
    workspaceDiff: workspace.diff(before, after),
    usage,
    executionObservation,
    ...(estimate ? { estimatedCostUsd: estimate.value, estimateBasis: estimate.basis } : {}),
    trace,
    rawSteps: [
      ...(selectionResult ? [{ phase: "expression", steps: selectionResult.rawSteps }] : []),
      ...(driverResult ? [{ phase: "execution", steps: driverResult.rawSteps }] : []),
    ],
    ...(error ? { error } : {}),
  };
}

async function executeCheckPlan(
  steps: CheckStep[],
  workspace: Workspace,
  signal: AbortSignal,
): Promise<{ passed: boolean; results: CheckResult[] }> {
  const results: CheckResult[] = [];
  for (const step of steps) {
    try {
      const result = await workspace.runCommand(step.argv, step.cwd, step.timeoutMs, signal);
      results.push({
        id: step.id,
        argv: step.argv,
        exitCode: result.exitCode,
        expectedExit: step.expectExit,
        passed: result.exitCode === step.expectExit,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
      });
    } catch (error) {
      results.push({
        id: step.id,
        argv: step.argv,
        exitCode: -1,
        expectedExit: step.expectExit,
        passed: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        durationMs: 0,
      });
    }
  }
  return { passed: results.every((result) => result.passed), results };
}

function settleStatus(
  outcome: NonNullable<CellRunRecord["submission"]>["outcome"],
  checksPassed: boolean,
): CellTerminalStatus {
  if (!checksPassed) return "verification_failed";
  if (outcome === "completed") return "passed";
  if (outcome === "split") return "split";
  if (outcome === "partial") return "partial";
  return "failed";
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function estimateCost(
  usage: CellUsage,
  pricing: CellRunRecord["driver"]["pricing"],
): { value: number; basis: string } | undefined {
  if (!pricing) return undefined;
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const uncached = Math.max(0, usage.inputTokens - cached);
  const inputCost =
    (uncached / 1_000_000) * pricing.inputPerMillionUsd +
    (cached / 1_000_000) * (pricing.cachedInputPerMillionUsd ?? pricing.inputPerMillionUsd);
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMillionUsd;
  return {
    value: Number((inputCost + outputCost).toFixed(8)),
    basis: `estimated from token usage using ${pricing.source}`,
  };
}
