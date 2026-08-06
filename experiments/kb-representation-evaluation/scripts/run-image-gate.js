import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeEvidence } from "../src/evidence-summary.js";
import { imageDiagnosticVariants, publicDiagnosticQuestions, scoreDiagnosticAnswers } from "../src/image-diagnostic.js";
import { IMAGE_GATE_ORDER, answerTextFromEvents, parseAnswerArray, parseOpenCodeJsonl, usageFromEvents } from "../src/opencode-probe.js";

const root = resolve(import.meta.dir, "..");
const model = process.env.KB_PROBE_MODEL ?? "opencode-go/qwen3.7-plus";
const modeIndex = Bun.argv.indexOf("--mode");
const mode = modeIndex === -1 ? "image" : Bun.argv[modeIndex + 1];
if (!new Set(["image", "text"]).has(mode)) throw new TypeError("--mode must be image or text.");
const evidenceId = process.env.KB_PROBE_ID ?? `2026-08-05-qwen37-${mode}-gate`;
const evidenceRoot = resolve(root, "evidence", evidenceId);
const byTier = new Map(imageDiagnosticVariants.map((variant) => [variant.tier, variant]));

try {
  await stat(evidenceRoot);
  throw new Error(`Evidence directory already exists: ${evidenceRoot}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(resolve(evidenceRoot, "inputs"), { recursive: true });

async function digest(path) {
  const bytes = await Bun.file(path).arrayBuffer();
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const environment = {
  evidenceId,
  model,
  executor: "opencode run --pure --format json",
  opencodeVersion: Bun.spawnSync(["opencode", "--version"], { stdout: "pipe" }).stdout.toString().trim(),
  condition: mode,
  profilePolicy: `new session per trial; default model variant; ${mode} attachment only; no filesystem or tools requested`,
  order: IMAGE_GATE_ORDER,
};
await Bun.write(resolve(evidenceRoot, "environment.json"), `${JSON.stringify(environment, null, 2)}\n`);

const records = [];
for (let index = 0; index < IMAGE_GATE_ORDER.length; index += 1) {
  const tier = IMAGE_GATE_ORDER[index];
  const variant = byTier.get(tier);
  const extension = mode === "image" ? "png" : "txt";
  const sourceInput = mode === "image"
    ? resolve(root, `generated/image-diagnostic/${tier}/graph.png`)
    : resolve(root, `fixtures/image-diagnostic/${tier}/graph.txt`);
  if (!(await Bun.file(sourceInput).exists())) throw new Error(`Missing ${sourceInput}; build or render the controlled fixture first.`);
  const retainedInput = resolve(evidenceRoot, `inputs/${tier}.${extension}`);
  if (!(await Bun.file(retainedInput).exists())) await Bun.write(retainedInput, await Bun.file(sourceInput).arrayBuffer());
  const questions = publicDiagnosticQuestions(variant);
  const prompt = [
    mode === "image"
      ? "你是图关系读取器。唯一的图事实来自附带的 PNG；不得读取文件系统、调用工具或补充常识。"
      : "你是图关系读取器。唯一的图事实来自附带的逐行文本索引；不得读取文件系统、调用工具或补充常识。",
    mode === "image"
      ? "箭头方向与边标签都是答案的一部分。逐题检查图片；不存在的边不能按相近位置猜测。"
      : "每条 EDGE 都是 FROM RELATION TO。逐题检查索引；不存在的边不能按标签相近猜测。",
    '严格只输出 JSON 数组，每项形如 {"id":"题目ID","answer":"答案"}，不得使用 Markdown fence 或解释。',
    `题目：${JSON.stringify(questions)}`,
  ].join("\n");
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const process = Bun.spawn([
    "opencode", "run", prompt,
    "--pure", "--format", "json", "--model", model,
    `--file=${retainedInput}`,
  ], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - start);
  let events = [];
  let answerText = "";
  let answers = null;
  let score = null;
  let parseError = null;
  try {
    events = parseOpenCodeJsonl(stdout);
    answerText = answerTextFromEvents(events);
    answers = parseAnswerArray(answerText);
    score = scoreDiagnosticAnswers(variant, answers);
  } catch (error) {
    parseError = error.message;
  }
  const record = {
    trial: index + 1,
    repetition: IMAGE_GATE_ORDER.slice(0, index + 1).filter((value) => value === tier).length,
    tier,
    condition: mode,
    fixtureId: variant.id,
    model,
    startedAt,
    finishedAt,
    durationMs,
    exitCode,
    input: { path: `inputs/${tier}.${extension}`, sha256: await digest(retainedInput), bytes: Bun.file(retainedInput).size },
    svg: { path: `../../fixtures/image-diagnostic/${tier}/graph.svg`, sha256: await digest(resolve(root, `fixtures/image-diagnostic/${tier}/graph.svg`)) },
    questions,
    answerText,
    answers,
    score,
    parseError,
    usage: usageFromEvents(events),
    stderr: stderr.trim() || null,
    rawEvents: events,
  };
  records.push(record);
  await Bun.write(resolve(evidenceRoot, `trial-${String(index + 1).padStart(2, "0")}-${tier}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${index + 1}/${IMAGE_GATE_ORDER.length} ${tier}: ${score ? `${score.passed}/${score.total}` : `unsettled (${parseError ?? exitCode})`} · ${durationMs}ms`);
}

const summary = {
  evidenceId,
  status: "probe",
  profile: environment,
  aggregate: summarizeEvidence(records),
  totals: Object.fromEntries([...byTier.keys()].map((tier) => {
    const tierRecords = records.filter((record) => record.tier === tier);
    return [tier, {
      trials: tierRecords.length,
      passed: tierRecords.reduce((total, record) => total + (record.score?.passed ?? 0), 0),
      questions: tierRecords.reduce((total, record) => total + (record.score?.total ?? 0), 0),
      durationsMs: tierRecords.map((record) => record.durationMs),
      costs: tierRecords.map((record) => record.usage?.cost ?? null),
      parseFailures: tierRecords.filter((record) => !record.score).length,
    }];
  })),
};
await Bun.write(resolve(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Evidence retained at ${evidenceRoot}`);
