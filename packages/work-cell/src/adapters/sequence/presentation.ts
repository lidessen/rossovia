import type { CellRunRecord } from "../../contracts";
import { sequencePreparation } from "./runtime";

export function renderRunSummary(record: CellRunRecord, recordPath?: string): string {
  const sequence = sequencePreparation(record);
  const lines = [
    `Work Cell ${record.status}`,
    `Cell: ${record.cellId}`,
    expressionLine(record),
    `Usage: ${format(record.usage.totalTokens)} tokens${record.estimatedCostUsd === undefined ? "" : ` · $${record.estimatedCostUsd.toFixed(6)}`}`,
  ];
  if (sequence) {
    lines.push(`Rationale: ${sequence.geneExpression.principalContradiction}`);
    for (const contribution of sequence.geneExpression.contributions) {
      lines.push(`Decision ${contribution.pid}: ${contribution.decision}`);
    }
  }

  const estimateAudit = tokenEstimateAudit(record);
  if (estimateAudit) lines.push(estimateAudit);

  if (record.executionObservation.workEstimateId || record.executionObservation.executionProfileId) {
    const parts = [
      record.executionObservation.workEstimateId ? `Work estimate: ${record.executionObservation.workEstimateId}` : undefined,
      record.executionObservation.executionProfileId ? `Execution profile: ${record.executionObservation.executionProfileId}` : undefined,
      record.executionObservation.priceRevision ? `Price revision: ${record.executionObservation.priceRevision}` : undefined,
    ].filter((part): part is string => Boolean(part));
    lines.push(parts.join(" · "));
  }

  if (record.output !== undefined) lines.push(`Output: ${JSON.stringify(record.output)}`);
  for (const artifact of record.artifacts) {
    lines.push(`Artifact file: ${artifact.path} (${format(artifact.bytes)} bytes, sha256 ${artifact.sha256.slice(0, 12)})`);
  }

  if (record.verification.terminal.required.length > 0) {
    lines.push(`Terminal: ${record.verification.terminal.passed ? "satisfied" : "missing"} (${record.verification.terminal.required.join(", ")})`);
  }

  if (record.error) lines.push(`Error: ${record.error}`);
  if (recordPath) lines.push(`Record: ${recordPath}`);
  return lines.join("\n");
}

function expressionLine(record: CellRunRecord): string {
  const sequence = sequencePreparation(record);
  if (!sequence) return `Preparation: ${record.preparation?.adapter ?? "direct"}`;
  const supports = sequence.geneExpression.supports;
  return `Expression: ${sequence.geneExpression.lead}${supports.length ? ` + ${supports.join(", ")}` : ""}`;
}

function tokenEstimateAudit(record: CellRunRecord): string | undefined {
  const estimated = record.input.budget.estimatedTokens;
  if (estimated === undefined) return undefined;
  const reads = record.trace.filter((event) => event.type === "tool.read_file");
  const characters = reads.reduce((total, event) => total + characterCount(event.data), 0);
  const delta = record.usage.totalTokens - estimated;
  const relativeDelta = delta / estimated;
  const sign = delta > 0 ? "+" : "";
  const phase = record.usageByPhase;
  const parts = [
    `Token estimate: ${format(estimated)}; actual ${format(record.usage.totalTokens)}; variance ${sign}${format(delta)} (${sign}${formatPercent(relativeDelta)}).`,
    `Inputs ${format(record.usage.inputTokens)}, outputs ${format(record.usage.outputTokens)}; preparation ${format(phase.preparation.totalTokens)}, execution ${format(phase.execution.totalTokens)}; ${reads.length} reads (${format(characters)} chars returned).`,
  ];
  const tolerance = record.input.budget.estimatedTokensTolerance;
  if (tolerance === undefined) {
    parts.push("Estimate review: no tolerance declared; compare this variance before reusing the estimate.");
  } else if (Math.abs(relativeDelta) > tolerance) {
    parts.push(`Estimate review: required — outside declared ±${formatPercent(tolerance)} tolerance; inspect scope, context/read volume, phase split, and execution profile before revising the estimate.`);
  } else {
    parts.push(`Estimate review: within declared ±${formatPercent(tolerance)} tolerance.`);
  }
  return parts.join(" ");
}

function characterCount(value: unknown): number {
  if (!value || typeof value !== "object" || !("characters" in value)) return 0;
  const count = (value as { characters?: unknown }).characters;
  return typeof count === "number" ? count : 0;
}

function format(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value);
}
