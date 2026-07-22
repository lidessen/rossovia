import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { ExecutionProfile } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  proposeMissionReconciliation,
  type ActiveIntentAnchor,
} from "../src/mission-reconciliation";

const PROFILE_ID = "opencode-go-deepseek-v4-flash-reconciliation-v2";
const REPETITIONS = 2;

interface ProbeCase {
  id: string;
  expectedDisposition: "continue" | "correction" | "decision-required";
  anchorStatement: string;
  inputText: string;
}

const developmentCases: readonly ProbeCase[] = [
  {
    id: "continue-existing-direction",
    expectedDisposition: "continue",
    anchorStatement: [
      "Continue implementing the supervised-autonomy MVP by dependency order.",
      "Keep generic Work Cell semantics provider-neutral, keep parent and child timelines separate,",
      "and make ordinary Agent contributions use tool loops with caller-defined terminal tools.",
    ].join(" "),
    inputText: "继续，按已经确定的依赖关系推进下一个最小验证步骤。",
  },
  {
    id: "correct-execution-mechanism",
    expectedDisposition: "correction",
    anchorStatement: [
      "Continue implementing the supervised-autonomy MVP.",
      "Direct text generation may be used for ordinary bounded semantic Agent judgments.",
    ].join(" "),
    inputText: [
      "修正：普通 Agent 判断不要直接 generate，必须使用 Work Cell 的 tool-agent loop，",
      "并通过调用方定义的 terminal tool 结束。",
    ].join(""),
  },
  {
    id: "ambiguous-constraint-reference",
    expectedDisposition: "decision-required",
    anchorStatement: [
      "The next autonomy slice must preserve Principal authority and explicit evidence gates.",
      "No publication authority has been delegated.",
    ].join(" "),
    inputText: "把这个限制放宽一点，按之前的方式处理。",
  },
];

const confirmationCases: readonly ProbeCase[] = [
  {
    id: "continue-with-evidence-obligation",
    expectedDisposition: "continue",
    anchorStatement: [
      "Implement the next supervised-autonomy slice.",
      "Preserve source-linked inputs, proposal-versus-acceptance separation,",
      "and human authority over Mission state.",
    ].join(" "),
    inputText: "继续完成当前验证，并把证据写入阶段记录。",
  },
  {
    id: "correct-delegation-lifecycle",
    expectedDisposition: "correction",
    anchorStatement: [
      "Delegated child work may block the parent loop until the whole batch completes.",
      "Parent and child events may share one timeline.",
    ].join(" "),
    inputText: [
      "修正：delegate 和 swarm 必须异步；父子分别记录在各自 timeline，",
      "父级只保留链接和 barrier。",
    ].join(""),
  },
  {
    id: "ambiguous-permission-relaxation",
    expectedDisposition: "decision-required",
    anchorStatement: [
      "Writable effects require human approval. Read-only work may continue autonomously.",
      "Mission completion requires independent acceptance.",
    ].join(" "),
    inputText: "后面的工作按之前的权限处理，适当放开一点。",
  },
];

const route = [{
  provider: "opencode-go" as const,
  credential: { source: "env" as const, name: "OPENCODE_API_KEY" },
  model: "deepseek-v4-flash",
}];

const confirmation = process.argv.includes("--confirmation");
const cases = confirmation ? confirmationCases : developmentCases;
const outputArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const outputPath = resolve(outputArgument ?? `${tmpdir()}/reconciliation-capability-probe-${Date.now()}.json`);
const startedAt = new Date().toISOString();
const outcomes: Array<Record<string, unknown>> = [];

for (const probeCase of cases) {
  for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
    const workspaceRoot = await mkdtemp(`${tmpdir()}/reconciliation-probe-`);
    try {
      const missionId = `probe:${probeCase.id}:${repetition}:${randomUUID()}`;
      const timeline = new FileMissionTimeline(resolve(workspaceRoot, ".mission"));
      const input = await timeline.appendInput(missionId, {
        id: `input:${probeCase.id}:${repetition}`,
        actorRef: "principal:probe-fixture",
        sourceRef: `probe-case:${probeCase.id}`,
        payload: { kind: "contribution", text: probeCase.inputText },
      });
      const driver = new AiSdkValidationDriver({ route });
      const result = await proposeMissionReconciliation({
        id: `proposal:${probeCase.id}:${repetition}`,
        missionId,
        anchor: anchor(probeCase),
        input,
        workspaceRoot,
        executionProfile: profile(driver),
      }, {
        driver,
        maxSteps: 4,
        maxDurationMs: 120_000,
      });
      const actualDisposition = result.kind === "proposed"
        ? result.proposal.decision.disposition
        : undefined;
      outcomes.push({
        caseId: probeCase.id,
        repetition,
        expectedDisposition: probeCase.expectedDisposition,
        actualDisposition,
        mechanicallyPassed: result.record.status === "passed",
        dispositionMatched: actualDisposition === probeCase.expectedDisposition,
        resultKind: result.kind,
        ...(result.kind === "proposed" ? { decision: result.proposal.decision } : { reason: result.reason }),
        record: result.record,
      });
      process.stderr.write(
        `${probeCase.id} #${repetition}: ${result.record.status}, ${actualDisposition ?? result.kind}, ${result.record.usage.totalTokens} tokens\n`,
      );
    } catch (error) {
      outcomes.push({
        caseId: probeCase.id,
        repetition,
        expectedDisposition: probeCase.expectedDisposition,
        mechanicallyPassed: false,
        dispositionMatched: false,
        resultKind: "probe-error",
        error: error instanceof Error ? error.message : String(error),
      });
      process.stderr.write(`${probeCase.id} #${repetition}: probe-error\n`);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }
}

const summary = {
  version: "atthis.reconciliation-capability-probe.v1",
  status: "probe",
  suite: confirmation ? "held-out-confirmation" : "development",
  startedAt,
  finishedAt: new Date().toISOString(),
  allocationDecision: "Whether this explicit execution profile is a candidate for one-anchor/one-input Mission reconciliation.",
  profile: {
    id: PROFILE_ID,
    provider: "opencode-go",
    model: "deepseek-v4-flash",
    harness: "AI SDK v7 ToolLoopAgent through Work Cell mission-reconciliation v1",
    routeFallback: "none",
    repetitions: REPETITIONS,
  },
  evaluatorOnlyExpectation: "Expected dispositions remain in the probe runner and are not included in Cell context.",
  outcomes,
};

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
const passed = outcomes.filter((outcome) => outcome.mechanicallyPassed === true).length;
const matched = outcomes.filter((outcome) => outcome.dispositionMatched === true).length;
const tokens = outcomes.reduce((total, outcome) => {
  const record = outcome.record as { usage?: { totalTokens?: number } } | undefined;
  return total + (record?.usage?.totalTokens ?? 0);
}, 0);
process.stdout.write(`${JSON.stringify({ outputPath, runs: outcomes.length, passed, matched, tokens })}\n`);

function anchor(probeCase: ProbeCase): ActiveIntentAnchor {
  return {
    id: `anchor:${probeCase.id}`,
    revision: "probe-r1",
    statement: probeCase.anchorStatement,
    sourceRefs: [`probe-anchor:${probeCase.id}`],
    reconciledWatermark: 0,
  };
}

function profile(driver: AiSdkValidationDriver): ExecutionProfile {
  return {
    id: PROFILE_ID,
    version: "execution-profile.v1",
    provider: driver.descriptor.provider,
    model: driver.descriptor.model,
    contextPolicy: "Exactly one active intent anchor and the next contribution; no prior transcript.",
    toolSurface: "Caller-defined submit_reconciliation terminal tool only; no repository or command access.",
    parallelism: "serial",
  };
}
