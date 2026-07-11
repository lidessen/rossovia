import type { CellRunRecord, CellSubmission, TraceEvent } from "./contracts";

export function renderRunSummary(record: CellRunRecord, recordPath?: string): string {
  const submission = record.submission ?? provisionalSubmission(record.trace);
  const lines = [
    `Work Cell ${record.status}`,
    `Cell: ${record.cellId}`,
    expressionLine(record),
    `Usage: ${format(record.usage.totalTokens)} tokens${record.estimatedCostUsd === undefined ? "" : ` · $${record.estimatedCostUsd.toFixed(6)}`}`,
  ];
  if (record.geneExpression) {
    lines.push(`Rationale: ${record.geneExpression.principalContradiction}`);
    for (const contribution of record.geneExpression.contributions) {
      lines.push(`Decision ${contribution.pid}: ${contribution.decision}`);
    }
  }

  if (record.executionObservation.workEstimateId || record.executionObservation.executionProfileId) {
    const parts = [
      record.executionObservation.workEstimateId ? `Work estimate: ${record.executionObservation.workEstimateId}` : undefined,
      record.executionObservation.executionProfileId ? `Execution profile: ${record.executionObservation.executionProfileId}` : undefined,
      record.executionObservation.priceRevision ? `Price revision: ${record.executionObservation.priceRevision}` : undefined,
    ].filter((part): part is string => Boolean(part));
    lines.push(parts.join(" · "));
  }

  if (submission) {
    lines.push(`${record.submission ? "Artifact" : "Provisional submission"}: ${submission.artifact.summary}`);
    for (const evidence of submission.evidence.slice(0, 5)) {
      lines.push(`Evidence: ${evidence.claim} (${evidence.source})`);
    }
  }

  if (record.verification.results.length > 0) {
    const passed = record.verification.results.filter((result) => result.passed).length;
    lines.push(`Checks: ${passed}/${record.verification.results.length} passed`);
  } else if (record.submission) {
    lines.push("Checks: none declared");
  }

  if (record.status === "budget_exceeded") lines.push(budgetDiagnostic(record));
  else if (record.error) lines.push(`Error: ${record.error}`);
  if (recordPath) lines.push(`Record: ${recordPath}`);
  return lines.join("\n");
}

function expressionLine(record: CellRunRecord): string {
  if (!record.geneExpression) return "Expression: unavailable";
  const supports = record.geneExpression.supports;
  return `Expression: ${record.geneExpression.lead}${supports.length ? ` + ${supports.join(", ")}` : ""}`;
}

function provisionalSubmission(trace: TraceEvent[]): CellSubmission | undefined {
  const event = [...trace].reverse().find((item) => item.type === "cell.submitted");
  return event?.data && typeof event.data === "object" ? (event.data as CellSubmission) : undefined;
}

function budgetDiagnostic(record: CellRunRecord): string {
  const reads = record.trace.filter((event) => event.type === "tool.read_file");
  const characters = reads.reduce((total, event) => total + characterCount(event.data), 0);
  const budget = record.input.budget.maxTokens;
  return `Budget: observed ${format(record.usage.totalTokens)} of ${format(budget)} tokens after ${reads.length} reads (${format(characters)} chars returned). Narrow --scope or raise --max-tokens deliberately.`;
}

function characterCount(value: unknown): number {
  if (!value || typeof value !== "object" || !("characters" in value)) return 0;
  const count = (value as { characters?: unknown }).characters;
  return typeof count === "number" ? count : 0;
}

function format(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
