import { randomUUID } from "node:crypto";
import {
  CellInputSchema,
  WORK_CELL_RECORD_VERSION,
  type CellInput,
  type CellRunRecord,
  type CellTerminalStatus,
  type CellUsage,
  type ArtifactRecord,
  type ArtifactVerification,
  type OutputVerification,
  type CellPreparation,
} from "./contracts";
import type { CellDriver } from "./driver";
import { CellExecutionError, traceEvent } from "./driver";
import { Workspace } from "./workspace";
import { compileOutputSchema } from "./output-schema";

export async function runCell(
  unparsedInput: unknown,
  driver: CellDriver,
  options: { signal?: AbortSignal; preparation?: CellPreparation } = {},
): Promise<CellRunRecord> {
  const input = CellInputSchema.parse(unparsedInput);
  if (input.terminalTools?.length && input.budget.maxSteps < 2) {
    throw new Error("terminal tools require at least two steps: one terminal action and one final output");
  }
  const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
  const runId = randomUUID();
  const startedAt = new Date();
  const trace = [traceEvent("cell.started", { runId, cellId: input.id })];
  const workspace = await Workspace.create(input.workspace, input.budget);
  const before = await workspace.snapshot();
  const timeoutSignal = AbortSignal.timeout(input.budget.maxDurationMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const missingCapabilities = input.capabilitiesRequired.filter(
    (capability) => !input.capabilities.includes(capability),
  );

  let status: CellTerminalStatus = "failed";
  let error: string | undefined;
  let driverResult: Awaited<ReturnType<CellDriver["run"]>> | undefined;
  let failureUsage = emptyUsage();
  let verification = { passed: false, terminal: { passed: false, required: [] as string[], called: [] as string[] } };
  let outputVerification: OutputVerification | undefined;
  let artifactVerification: ArtifactVerification | undefined;
  let artifacts: ArtifactRecord[] = [];
  let after: Awaited<ReturnType<Workspace["snapshot"]>> | undefined;

  if (missingCapabilities.length > 0) {
    status = "capability_mismatch";
    error = `missing capabilities: ${missingCapabilities.join(", ")}`;
    trace.push(traceEvent("cell.capability_mismatch", { missingCapabilities }));
  } else {
    try {
      const context = {
        workspace,
        signal,
        emit(type: string, data: unknown) {
          trace.push(traceEvent(type, data));
        },
      };
      if (options.preparation) {
        trace.push(traceEvent("cell.prepared", {
          adapter: options.preparation.adapter,
          usage: options.preparation.usage,
        }));
      }
      driverResult = await driver.run(input, context);
      const terminalTools = input.terminalTools ?? [];
      const terminalSatisfied = terminalTools.length === 0 || terminalTools.some(
        (terminal) => driverResult!.terminalToolsCalled.includes(terminal.name),
      );
      after = await workspace.snapshot();
      const diff = workspace.diff(before, after);
      if (outputSchema) {
        outputVerification = driverResult.output === undefined
          ? { passed: false, errors: ["driver completed without the declared structured output"] }
          : outputSchema.validate(driverResult.output);
      }
      const artifactResult = await verifyArtifacts(input, workspace, diff);
      artifacts = artifactResult.artifacts;
      artifactVerification = artifactResult.verification;
      verification = {
        passed: terminalSatisfied
          && (outputVerification?.passed ?? true)
          && artifactVerification.passed,
        terminal: {
          passed: terminalSatisfied,
          required: terminalTools.map((terminal) => terminal.name),
          called: driverResult.terminalToolsCalled,
        },
      };

      if (!terminalSatisfied) {
        status = "protocol_error";
        error = `driver completed without one required terminal tool: ${terminalTools.map((terminal) => terminal.name).join(", ")}`;
      } else if (outputVerification && !outputVerification.passed) {
        status = driverResult.output === undefined ? "protocol_error" : "verification_failed";
        error = outputVerification.errors.join("; ");
      } else if (!artifactVerification.passed) {
        status = "verification_failed";
        error = artifactVerification.errors.join("; ");
      } else {
        status = "passed";
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      if (caught instanceof CellExecutionError) {
        failureUsage = caught.usage;
      }
      else if (signal.aborted) status = "cancelled";
      else status = "failed";
      trace.push(traceEvent("cell.error", { status, error }));
    }
  }

  after ??= await workspace.snapshot();
  const finishedAt = new Date();
  const usage = addUsage(
    options.preparation?.usage ?? emptyUsage(),
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
    driver: driver.descriptor,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    input,
    ...(options.preparation ? { preparation: options.preparation } : {}),
    finalText: driverResult?.finalText ?? "",
    ...(driverResult?.output === undefined ? {} : { output: driverResult.output }),
    artifacts,
    verification: {
      ...verification,
      ...(outputVerification ? { output: outputVerification } : {}),
      ...(artifactVerification ? { artifacts: artifactVerification } : {}),
    },
    workspaceDiff: workspace.diff(before, after),
    usage,
    usageByPhase: {
      preparation: options.preparation?.usage ?? emptyUsage(),
      execution: driverResult?.usage ?? failureUsage,
    },
    executionObservation,
    ...(estimate ? { estimatedCostUsd: estimate.value, estimateBasis: estimate.basis } : {}),
    trace,
    rawSteps: [
      ...(options.preparation ? [{ phase: "preparation", adapter: options.preparation.adapter, steps: options.preparation.rawSteps }] : []),
      ...(driverResult ? [{ phase: "execution", steps: driverResult.rawSteps }] : []),
    ],
    ...(error ? { error } : {}),
  };
}

async function verifyArtifacts(
  input: CellInput,
  workspace: Workspace,
  diff: CellRunRecord["workspaceDiff"],
): Promise<{ artifacts: ArtifactRecord[]; verification: ArtifactVerification }> {
  if (!input.artifacts?.length) return { artifacts: [], verification: { passed: true, errors: [] } };

  const changed = new Set([...diff.added, ...diff.changed]);
  const artifacts: ArtifactRecord[] = [];
  const errors: string[] = [];
  for (const requirement of input.artifacts) {
    try {
      const artifact = await workspace.describeArtifact(requirement.path);
      if (!changed.has(artifact.path)) {
        errors.push(`artifact was not created or changed by this run: ${artifact.path}`);
        continue;
      }
      artifacts.push(artifact);
    } catch (caught) {
      errors.push(caught instanceof Error ? caught.message : String(caught));
    }
  }
  return { artifacts, verification: { passed: errors.length === 0, errors } };
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
