import { resolve } from "node:path";
import {
  settleAgentEraBlogReconciliationAction,
  type AgentEraBlogReconciliationChoice,
} from "./agent-era-blog-reconciliation-action";

const arguments_ = parseArguments(process.argv.slice(2));
const settled = await settleAgentEraBlogReconciliationAction(arguments_);
process.stdout.write(`${JSON.stringify({
  missionId: arguments_.missionId,
  proposalDigest: arguments_.proposalDigest,
  decisionDigest: settled.decision.digest,
  choice: settled.decision.decision.choice,
  standing: settled.outcome.standing,
  outcome: settled.outcome,
})}\n`);

function parseArguments(values: readonly string[]) {
  const allowed = new Set([
    "--home",
    "--mission",
    "--mission-source-root",
    "--project-id",
    "--proposal-digest",
    "--choice",
    "--authority-ref",
    "--source-ref",
  ]);
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (
      key === undefined
      || value === undefined
      || !allowed.has(key)
      || parsed.has(key)
    ) {
      throw new Error(
        "settle reconciliation action requires unique supported flag/value pairs",
      );
    }
    parsed.set(key, value);
  }
  const required = (key: string): string => {
    const value = parsed.get(key)?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  const choice = required("--choice");
  if (!isChoice(choice)) {
    throw new Error(
      "--choice must be SETTLE_CONTINUE, RECLASSIFY_CORRECTION, or HOLD",
    );
  }
  return {
    home: resolve(required("--home")),
    missionId: required("--mission"),
    missionSourceRoot: resolve(required("--mission-source-root")),
    projectId: required("--project-id"),
    proposalDigest: required("--proposal-digest"),
    choice,
    authorityRef: required("--authority-ref"),
    sourceRef: required("--source-ref"),
  };
}

function isChoice(value: string): value is AgentEraBlogReconciliationChoice {
  return value === "SETTLE_CONTINUE"
    || value === "RECLASSIFY_CORRECTION"
    || value === "HOLD";
}
