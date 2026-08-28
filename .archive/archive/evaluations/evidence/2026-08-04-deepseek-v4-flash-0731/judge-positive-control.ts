import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AiSdkModelEvaluationJudge } from "../../../../packages/work-cell/src/adapters/model-evaluation/judge";

const outputPath = join(import.meta.dir, "judge-positive-control.json");
const startedAt = new Date().toISOString();
const referenceCriteria = ["Both candidates satisfy the single retained acceptance condition."];
const sharedRecord = {
  runId: "synthetic-control",
  repetition: 1,
  status: "passed",
  finalText: "The retained evidence satisfies the bounded condition.",
  artifacts: [],
  verification: { passed: true },
  workspaceDiff: { changed: false },
};

const judge = new AiSdkModelEvaluationJudge({
  route: [{
    provider: "kimi-coding",
    credential: { source: "env", name: "KIMI_CODE_API_KEY" },
    model: "k3",
  }],
});

try {
  const result = await judge.judge({
    intent: "Judge two intentionally identical synthetic candidates.",
    referenceCriteria,
    rubric: "Return tie when both candidates have the same material result.",
    failureClasses: [{
      id: "false-difference",
      description: "Prefers one candidate without a material evidence difference.",
    }],
    a: { label: "A", records: [sharedRecord] },
    b: { label: "B", records: [{ ...sharedRecord, runId: "synthetic-control-b" }] },
  });
  const accepted = result.judgement.preferred === "tie"
    && result.judgement.acceptance.length === 1
    && result.judgement.acceptance[0]?.a === "pass"
    && result.judgement.acceptance[0]?.b === "pass";
  await writeFile(outputPath, `${JSON.stringify({
    version: "work-cell.model-evaluation.judge-positive-control.v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    accepted,
    descriptor: result.descriptor,
    judgement: result.judgement,
    usage: result.usage,
    raw: result.raw,
  }, null, 2)}\n`, "utf8");
  if (!accepted) throw new Error("judge settled but failed the identical-candidate positive control");
  console.log(outputPath);
} catch (error) {
  await writeFile(outputPath, `${JSON.stringify({
    version: "work-cell.model-evaluation.judge-positive-control.v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    accepted: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`, "utf8");
  throw error;
}
