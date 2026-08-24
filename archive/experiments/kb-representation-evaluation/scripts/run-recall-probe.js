import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { answerTextFromEvents, parseOpenCodeJsonl, usageFromEvents } from "../src/opencode-probe.js";
import {
  RECALL_FIXTURE_ID,
  UPSTREAM,
  parseAnswerResponse,
  parseRouteResponse,
  publicRecallQuestions,
  recallQuestions,
  scoreRecallTrial,
  sourcePacket,
} from "../src/recall-fixture.js";

const root = resolve(import.meta.dir, "..");
const model = process.env.KB_PROBE_MODEL ?? "opencode-go/qwen3.7-plus";
const evidenceId = process.env.KB_PROBE_ID ?? "2026-08-06-qwen37-associative-recall-v1";
const evidenceRoot = resolve(root, "evidence", evidenceId);
const maxCandidates = 5;
const maxSourceBytes = 12000;
const conditionOrder = recallQuestions.flatMap((question, index) => (
  index % 2 === 0
    ? [{ questionId: question.id, condition: "image" }, { questionId: question.id, condition: "search" }]
    : [{ questionId: question.id, condition: "search" }, { questionId: question.id, condition: "image" }]
));

try {
  await stat(evidenceRoot);
  throw new Error(`Evidence directory already exists: ${evidenceRoot}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const gitRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: root, stdout: "pipe" }).stdout.toString().trim();
const gitStatusBefore = Bun.spawnSync(["git", "status", "--short"], { cwd: root, stdout: "pipe" }).stdout.toString().trim();
if (gitStatusBefore) throw new Error(`Refusing paid probe from a dirty worktree:\n${gitStatusBefore}`);
const workerProfileRoot = resolve(root, "fixtures/recall-v1/worker-profile");
const configProbe = Bun.spawnSync(["opencode", "debug", "config", "--pure"], { cwd: workerProfileRoot, stdout: "pipe", stderr: "pipe" });
if (configProbe.exitCode !== 0) throw new Error(`Cannot resolve worker profile: ${configProbe.stderr.toString().trim()}`);
const resolvedWorkerConfig = JSON.parse(configProbe.stdout.toString());
if (resolvedWorkerConfig.permission?.["*"] !== "deny") throw new Error("Worker profile did not resolve to permission.*=deny.");
for (const question of recallQuestions) {
  const imageInput = resolve(root, `fixtures/recall-v1/activation/${question.id}.png`);
  const searchInput = resolve(root, `fixtures/recall-v1/search/${question.id}.txt`);
  if (!(await Bun.file(imageInput).exists())) throw new Error(`Missing ${imageInput}; run bun run build and bun run render first.`);
  if (!(await Bun.file(searchInput).exists())) throw new Error(`Missing ${searchInput}; run bun run build first.`);
}
await mkdir(resolve(evidenceRoot, "inputs"), { recursive: true });
await mkdir(resolve(evidenceRoot, "sessions"), { recursive: true });
for (const question of recallQuestions) {
  const imageInput = resolve(root, `fixtures/recall-v1/activation/${question.id}.png`);
  const searchInput = resolve(root, `fixtures/recall-v1/search/${question.id}.txt`);
  await Bun.write(resolve(evidenceRoot, `inputs/activation-${question.id}.png`), await Bun.file(imageInput).arrayBuffer());
  await Bun.write(resolve(evidenceRoot, `inputs/search-${question.id}.txt`), await Bun.file(searchInput).arrayBuffer());
}

async function digest(path) {
  const bytes = await Bun.file(path).arrayBuffer();
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function runOpenCode(prompt, attachment, sessionDirectory) {
  await mkdir(sessionDirectory, { recursive: true });
  await Bun.write(resolve(sessionDirectory, "opencode.json"), await Bun.file(resolve(root, "fixtures/recall-v1/worker-profile/opencode.json")).arrayBuffer());
  const localAttachment = resolve(sessionDirectory, attachment.endsWith(".png") ? "input.png" : attachment.endsWith(".md") ? "input.md" : "input.txt");
  await Bun.write(localAttachment, await Bun.file(attachment).arrayBuffer());
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const process = Bun.spawn([
    "opencode", "run", prompt,
    "--pure", "--format", "json", "--model", model,
    `--file=${localAttachment}`,
  ], { cwd: sessionDirectory, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  const durationMs = Math.round(performance.now() - start);
  let events = [];
  let answerText = "";
  let eventParseError = null;
  let toolProtocolError = null;
  try {
    events = parseOpenCodeJsonl(stdout);
    answerText = answerTextFromEvents(events);
    const toolEvents = events.filter((event) => /tool/i.test(String(event.type)) || /tool/i.test(String(event.part?.type)));
    if (toolEvents.length) toolProtocolError = `Worker emitted ${toolEvents.length} tool event(s).`;
  } catch (error) {
    eventParseError = error.message;
  }
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs,
    exitCode,
    answerText,
    usage: usageFromEvents(events),
    stderr: stderr.trim() || null,
    eventParseError,
    toolProtocolError,
    rawEvents: events,
    rawStdout: eventParseError ? stdout : null,
  };
}

const environment = {
  evidenceId,
  fixtureId: RECALL_FIXTURE_ID,
  upstream: UPSTREAM,
  localGit: { revision: gitRevision, statusBefore: gitStatusBefore || "clean" },
  identities: {
    fixtureManifest: await digest(resolve(root, "fixtures/recall-v1/manifest.json")),
    runner: await digest(resolve(root, "scripts/run-recall-probe.js")),
    scorerAndCorpus: await digest(resolve(root, "src/recall-fixture.js")),
    workerProfile: await digest(resolve(root, "fixtures/recall-v1/worker-profile/opencode.json")),
  },
  model,
  executor: "opencode run --pure --format json",
  status: "development-probe",
  representationScope: "query-conditioned corpus-derived associative PNG versus deterministic BM25 top-5 locator-only text results",
  sourceBudget: { maxCandidates, maxUtf8Bytes: maxSourceBytes },
  protocol: "route from activation input; deterministically open only routed source excerpts; answer and cite",
  permissionProfile: "fresh cwd containing only the stage attachment and opencode.json permission=deny; --pure; --auto absent; any emitted tool event invalidates the stage",
  resolvedWorkerPermission: resolvedWorkerConfig.permission,
  scoring: "frozen evaluator-only gold source sets; hit/recall@1/3/5; MRR; exact mutually-exclusive proposition keys; claim-bound source+anchor citation precision and coverage",
  order: conditionOrder,
  questions: publicRecallQuestions(),
  limitations: [
    "One run per matched condition and question; no stability claim.",
    "Synthetic query-conditioned activation projection, not Shilu runtime graph behavior.",
    "Curated source excerpts, not full upstream files.",
  ],
  opencodeVersion: Bun.spawnSync(["opencode", "--version"], { stdout: "pipe" }).stdout.toString().trim(),
};
await Bun.write(resolve(evidenceRoot, "environment.json"), `${JSON.stringify(environment, null, 2)}\n`);

const records = [];
for (let index = 0; index < conditionOrder.length; index += 1) {
  const { questionId, condition } = conditionOrder[index];
  const question = recallQuestions.find((candidate) => candidate.id === questionId);
  const activation = condition === "image"
    ? resolve(evidenceRoot, `inputs/activation-${question.id}.png`)
    : resolve(evidenceRoot, `inputs/search-${question.id}.txt`);
  const routePrompt = [
    "You route a recall question through the attached retrieval artifact.",
    condition === "image"
      ? "The attached PNG is the only activation map. Read SOURCE IDs and their associations visually."
      : "The attached text file is the only retrieval result. RESULT rows are deterministic BM25-ranked source locators, not source contents.",
    "The routing artifact is not evidence and must not be used to answer the question.",
    `Return at most ${maxCandidates} source IDs ranked by which original sources should be opened.`,
    "Do not call tools or read the filesystem. Use only the attachment.",
    'Output only JSON: {"candidates":["SHILU-S00"]}. No markdown or explanation.',
    `Question ${question.id}: ${question.prompt}`,
  ].join("\n");
  const routeRun = await runOpenCode(routePrompt, activation, resolve(evidenceRoot, `sessions/${String(index + 1).padStart(2, "0")}-route`));
  let route = null;
  let routeParseError = routeRun.eventParseError ?? routeRun.toolProtocolError;
  if (!routeParseError) {
    try {
      route = parseRouteResponse(routeRun.answerText);
    } catch (error) {
      routeParseError = error.message;
    }
  }

  let answerRun = null;
  let answer = null;
  let answerParseError = null;
  let retainedPacket = null;
  if (route) {
    retainedPacket = resolve(evidenceRoot, `inputs/${String(index + 1).padStart(2, "0")}-${question.id}-${condition}-sources.md`);
    const packet = `${sourcePacket(route.candidates)}\n`;
    if (new TextEncoder().encode(packet).byteLength > maxSourceBytes) {
      answerParseError = `Selected source packet exceeds ${maxSourceBytes} UTF-8 bytes.`;
      retainedPacket = null;
    } else {
      await Bun.write(retainedPacket, packet);
    }
    if (!answerParseError) {
      const answerPrompt = [
        "Answer the question from the attached frozen source excerpts, not from the activation map or prior knowledge.",
        "Distinguish design intent from concrete implementation when they differ.",
      "Every material claim must cite an attached source with its exact source ID and exact Location anchor.",
      "Do not call tools or read the filesystem. Use only the attachment.",
      `Required claim parts and mutually exclusive value keys: ${JSON.stringify(question.claims.map(({ id, prompt, options }) => ({ claimId: id, prompt, options })))}`,
      'Output only JSON: {"claims":[{"claimId":"Q0-C0","valueKey":"one exact offered option","citations":[{"sourceId":"SHILU-S00","anchor":"exact anchor"}]}]}. No markdown.',
        `Question ${question.id}: ${question.prompt}`,
      ].join("\n");
      answerRun = await runOpenCode(answerPrompt, retainedPacket, resolve(evidenceRoot, `sessions/${String(index + 1).padStart(2, "0")}-answer`));
      answerParseError = answerRun.eventParseError ?? answerRun.toolProtocolError;
      if (!answerParseError) {
        try {
          answer = parseAnswerResponse(answerRun.answerText);
        } catch (error) {
          answerParseError = error.message;
        }
      }
    }
  }

  const score = route ? scoreRecallTrial(question, route, answer) : null;
  const record = {
    trial: index + 1,
    question: { id: question.id, prompt: question.prompt },
    condition,
    route,
    answer,
    score,
    routeParseError,
    answerParseError,
    activation: {
      path: condition === "image" ? `inputs/activation-${question.id}.png` : `inputs/search-${question.id}.txt`,
      sha256: await digest(activation),
      bytes: Bun.file(activation).size,
    },
    sourcePacket: retainedPacket ? {
      path: `inputs/${retainedPacket.split("/").at(-1)}`,
      sha256: await digest(retainedPacket),
      bytes: Bun.file(retainedPacket).size,
    } : null,
    routeRun,
    answerRun,
  };
  records.push(record);
  await Bun.write(resolve(evidenceRoot, `trial-${String(index + 1).padStart(2, "0")}-${question.id}-${condition}.json`), `${JSON.stringify(record, null, 2)}\n`);
  const status = score
    ? `R@3 ${score.recallAt3.toFixed(2)} · grounded ${score.groundedSuccess ? "yes" : "no"}`
    : `unsettled (${routeParseError})`;
  console.log(`${index + 1}/${conditionOrder.length} ${question.id} ${condition}: ${status}`);
}

function aggregate(condition) {
  const selected = records.filter((record) => record.condition === condition);
  const scored = selected.filter((record) => record.score);
  const average = (field) => scored.length ? scored.reduce((sum, record) => sum + record.score[field], 0) / scored.length : null;
  const stages = selected.flatMap((record) => [record.routeRun, record.answerRun].filter(Boolean));
  return {
    trials: selected.length,
    settled: scored.length,
    hitAt1: average("hitAt1"),
    hitAt3: average("hitAt3"),
    hitAt5: average("hitAt5"),
    recallAt1: average("recallAt1"),
    recallAt3: average("recallAt3"),
    recallAt5: average("recallAt5"),
    allRequiredHitAt3: average("allRequiredHitAt3"),
    allRequiredHitAt5: average("allRequiredHitAt5"),
    meanReciprocalRank: average("reciprocalRank"),
    answerAccuracy: average("answerAccuracy"),
    citationPrecision: average("citationPrecision"),
    citationCoverage: average("citationCoverage"),
    groundedSuccessRate: average("groundedSuccess"),
    meanOpenedSources: average("openedSources"),
    totalDurationMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0),
    totalObservedCost: stages.reduce((sum, stage) => sum + (stage.usage?.cost ?? 0), 0),
    routeFailures: selected.filter((record) => !record.route).length,
    answerFailures: selected.filter((record) => record.route && !record.answer).length,
  };
}

const summary = {
  evidenceId,
  status: "development-probe",
  fixtureId: RECALL_FIXTURE_ID,
  aggregate: { image: aggregate("image"), search: aggregate("search") },
  interpretationGuard: "Activation representation earns credit only for routing. Final answers are evaluated after opening frozen source excerpts; the map is never a citation.",
};
await Bun.write(resolve(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Evidence retained at ${evidenceRoot}`);
