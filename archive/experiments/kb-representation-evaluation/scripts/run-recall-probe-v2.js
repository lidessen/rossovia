import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { answerTextFromEvents, parseOpenCodeJsonl, usageFromEvents } from "../src/opencode-probe.js";
import {
  RECALL_V2_FIXTURE_ID,
  UPSTREAM,
  buildRecallV2Order,
  parseAnswerResponseV2,
  parseRouteResponse,
  publicRecallV2Questions,
  recallV2ConfirmationQuestions,
  recallV2DevelopmentQuestions,
  scoreRecallTrialV2,
  sourcePacketV2,
} from "../src/recall-v2.js";

const root = resolve(import.meta.dir, "..");
const model = process.env.KB_PROBE_MODEL ?? "opencode-go/qwen3.7-plus";
const caseSet = process.env.KB_PROBE_CASESET ?? "development";
const evidenceId = process.env.KB_PROBE_ID;
if (!evidenceId) throw new Error("KB_PROBE_ID is required for a v2 paid probe.");
const questionSets = {
  development: recallV2DevelopmentQuestions,
  confirmation: recallV2ConfirmationQuestions,
};
const questions = questionSets[caseSet];
if (!questions) throw new Error(`KB_PROBE_CASESET must be one of: ${Object.keys(questionSets).join(", ")}.`);
const defaultRepetitions = caseSet === "confirmation" ? 2 : 1;
const repetitions = Number.parseInt(process.env.KB_PROBE_REPETITIONS ?? String(defaultRepetitions), 10);
if (repetitions !== defaultRepetitions) {
  throw new Error(`Frozen ${caseSet} case set requires exactly ${defaultRepetitions} repetition(s).`);
}
const evidenceRoot = resolve(root, "evidence", evidenceId);
const maxCandidates = 5;
const maxSourceBytes = 12000;
const conditionOrder = buildRecallV2Order(questions, repetitions);

try {
  await stat(evidenceRoot);
  throw new Error(`Evidence directory already exists: ${evidenceRoot}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const gitRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: root, stdout: "pipe" }).stdout.toString().trim();
const gitStatusBefore = Bun.spawnSync(["git", "status", "--short"], { cwd: root, stdout: "pipe" }).stdout.toString().trim();
if (gitStatusBefore) throw new Error(`Refusing paid probe from a dirty worktree:\n${gitStatusBefore}`);
const workerProfilePath = resolve(root, "fixtures/recall-v1/worker-profile/opencode.json");
const workerProfileRoot = resolve(root, "fixtures/recall-v1/worker-profile");
const configProbe = Bun.spawnSync(["opencode", "debug", "config", "--pure"], { cwd: workerProfileRoot, stdout: "pipe", stderr: "pipe" });
if (configProbe.exitCode !== 0) throw new Error(`Cannot resolve worker profile: ${configProbe.stderr.toString().trim()}`);
const resolvedWorkerConfig = JSON.parse(configProbe.stdout.toString());
if (resolvedWorkerConfig.permission?.["*"] !== "deny") throw new Error("Worker profile did not resolve to permission.*=deny.");
for (const question of questions) {
  const imageInput = resolve(root, `fixtures/recall-v2/activation/${caseSet}/${question.id}.png`);
  const searchInput = resolve(root, `fixtures/recall-v2/search/${caseSet}/${question.id}.txt`);
  if (!(await Bun.file(imageInput).exists())) throw new Error(`Missing ${imageInput}; run bun run build and bun run render:recall:v2 first.`);
  if (!(await Bun.file(searchInput).exists())) throw new Error(`Missing ${searchInput}; run bun run build first.`);
}
await mkdir(resolve(evidenceRoot, "inputs"), { recursive: true });
await mkdir(resolve(evidenceRoot, "sessions"), { recursive: true });
for (const question of questions) {
  const imageInput = resolve(root, `fixtures/recall-v2/activation/${caseSet}/${question.id}.png`);
  const searchInput = resolve(root, `fixtures/recall-v2/search/${caseSet}/${question.id}.txt`);
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
  await Bun.write(resolve(sessionDirectory, "opencode.json"), await Bun.file(workerProfilePath).arrayBuffer());
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
    executionError: exitCode === 0 ? null : `OpenCode exited with code ${exitCode}.`,
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
  fixtureId: RECALL_V2_FIXTURE_ID,
  caseSet,
  repetitions,
  upstream: UPSTREAM,
  localGit: { revision: gitRevision, statusBefore: gitStatusBefore || "clean" },
  identities: {
    fixtureManifest: await digest(resolve(root, "fixtures/recall-v2/manifest.json")),
    renderManifest: await digest(resolve(root, "fixtures/recall-v2/render-manifest.json")),
    runner: await digest(resolve(root, "scripts/run-recall-probe-v2.js")),
    contractAndCorpus: await digest(resolve(root, "src/recall-v2.js")),
    inheritedGraphAndSearch: await digest(resolve(root, "src/recall-fixture.js")),
    workerProfile: await digest(workerProfilePath),
  },
  model,
  executor: "opencode run --pure --format json",
  status: caseSet === "confirmation" ? "question-held-out-confirmation-probe" : "development-treatment-probe",
  representationScope: "query-conditioned corpus-derived associative PNG versus deterministic BM25 top-5 locator-only text results",
  sourceBudget: { maxCandidates, maxUtf8Bytes: maxSourceBytes },
  protocol: "route from activation input; deterministically open only routed source excerpts; answer with opaque sourceId+anchorId citations",
  permissionProfile: "fresh cwd containing only the stage attachment and opencode.json permission=deny; --pure; --auto absent; any emitted tool event invalidates the stage",
  resolvedWorkerPermission: resolvedWorkerConfig.permission,
  scoring: "independent retrieval relevance; exact mutually-exclusive proposition keys; allowed source+opaque-anchor precision; necessary evidence-group coverage; micro aggregate citation metrics",
  order: conditionOrder,
  questions: publicRecallV2Questions(questions),
  limitations: [
    "Synthetic query-conditioned activation projection, not Shilu runtime graph behavior.",
    "Curated source passages from the same corpus and graph used for v1.",
    caseSet === "confirmation"
      ? "Held out only at question and proposition level; not held-out corpus, graph, or model validation."
      : "Cases were used to diagnose the v1 citation contract and cannot confirm the treatment.",
  ],
  opencodeVersion: Bun.spawnSync(["opencode", "--version"], { stdout: "pipe" }).stdout.toString().trim(),
};
await Bun.write(resolve(evidenceRoot, "environment.json"), `${JSON.stringify(environment, null, 2)}\n`);

const records = [];
for (let index = 0; index < conditionOrder.length; index += 1) {
  const { repetition, questionId, condition } = conditionOrder[index];
  const question = questions.find((candidate) => candidate.id === questionId);
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
  const sessionPrefix = String(index + 1).padStart(2, "0");
  const routeRun = await runOpenCode(routePrompt, activation, resolve(evidenceRoot, `sessions/${sessionPrefix}-route`));
  let route = null;
  let routeParseError = routeRun.executionError ?? routeRun.eventParseError ?? routeRun.toolProtocolError;
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
    retainedPacket = resolve(evidenceRoot, `inputs/${sessionPrefix}-r${repetition}-${question.id}-${condition}-sources.md`);
    const packet = `${sourcePacketV2(route.candidates)}\n`;
    if (new TextEncoder().encode(packet).byteLength > maxSourceBytes) {
      answerParseError = `Selected source packet exceeds ${maxSourceBytes} UTF-8 bytes.`;
      retainedPacket = null;
    } else {
      await Bun.write(retainedPacket, packet);
    }
    if (!answerParseError) {
      const answerPrompt = [
        "Answer the question from the attached frozen source passages, not from the activation map or prior knowledge.",
        "Distinguish design intent, comments, and executable implementation when they differ.",
        "Every material claim must cite attached evidence using its exact source ID and opaque AnchorId.",
        "Do not call tools or read the filesystem. Use only the attachment.",
        `Required claim parts and mutually exclusive value keys: ${JSON.stringify(question.claims.map(({ id, prompt, options }) => ({ claimId: id, prompt, options })))}`,
        'Output only JSON: {"claims":[{"claimId":"Q0-C0","valueKey":"one exact offered option","citations":[{"sourceId":"SHILU-S00","anchorId":"an_0000"}]}]}. No markdown.',
        `Question ${question.id}: ${question.prompt}`,
      ].join("\n");
      answerRun = await runOpenCode(answerPrompt, retainedPacket, resolve(evidenceRoot, `sessions/${sessionPrefix}-answer`));
      answerParseError = answerRun.executionError ?? answerRun.eventParseError ?? answerRun.toolProtocolError;
      if (!answerParseError) {
        try {
          answer = parseAnswerResponseV2(answerRun.answerText);
        } catch (error) {
          answerParseError = error.message;
        }
      }
    }
  }

  const score = route ? scoreRecallTrialV2(question, route, answer) : null;
  const record = {
    trial: index + 1,
    repetition,
    caseSet,
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
  await Bun.write(resolve(evidenceRoot, `trial-${sessionPrefix}-r${repetition}-${question.id}-${condition}.json`), `${JSON.stringify(record, null, 2)}\n`);
  const status = score ? `R@3 ${score.recallAt3.toFixed(2)} · grounded ${score.groundedSuccess ? "yes" : "no"}` : `unsettled (${routeParseError})`;
  console.log(`${index + 1}/${conditionOrder.length} r${repetition} ${question.id} ${condition}: ${status}`);
}

function aggregate(condition) {
  const selected = records.filter((record) => record.condition === condition);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const totalClaimCount = selected.reduce((sum, record) => sum + questionById.get(record.question.id).claims.length, 0);
  const totalEvidenceGroupCount = selected.reduce((sum, record) => sum + questionById.get(record.question.id).claims.reduce((claimSum, expected) => claimSum + expected.requiredEvidenceGroups.length, 0), 0);
  const average = (field) => selected.length
    ? selected.reduce((sum, record) => sum + (record.score?.[field] ?? 0), 0) / selected.length
    : null;
  const stages = selected.flatMap((record) => [record.routeRun, record.answerRun].filter(Boolean));
  const submittedCitationCount = selected.reduce((sum, record) => sum + (record.score?.submittedCitationCount ?? 0), 0);
  const correctCitationCount = selected.reduce((sum, record) => sum + (record.score?.correctCitationCount ?? 0), 0);
  const coveredEvidenceGroupCount = selected.reduce((sum, record) => sum + (record.score?.coveredEvidenceGroupCount ?? 0), 0);
  const correctAnswerCount = selected.reduce((sum, record) => sum + (record.score?.correctAnswerCount ?? 0), 0);
  return {
    trials: selected.length,
    settledRoutes: selected.filter((record) => record.route).length,
    settledAnswers: selected.filter((record) => record.answer).length,
    hitAt1: average("hitAt1"),
    hitAt3: average("hitAt3"),
    hitAt5: average("hitAt5"),
    recallAt1: average("recallAt1"),
    recallAt3: average("recallAt3"),
    recallAt5: average("recallAt5"),
    allRelevantHitAt3: average("allRelevantHitAt3"),
    allRelevantHitAt5: average("allRelevantHitAt5"),
    meanReciprocalRank: average("reciprocalRank"),
    answerAccuracy: totalClaimCount ? correctAnswerCount / totalClaimCount : null,
    citationPrecision: submittedCitationCount ? correctCitationCount / submittedCitationCount : 0,
    citationCoverage: totalEvidenceGroupCount ? coveredEvidenceGroupCount / totalEvidenceGroupCount : null,
    groundedSuccessRate: average("groundedSuccess"),
    meanOpenedSources: average("openedSources"),
    counts: {
      correctAnswerCount,
      totalClaimCount,
      correctCitationCount,
      submittedCitationCount,
      coveredEvidenceGroupCount,
      totalEvidenceGroupCount,
    },
    totalDurationMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0),
    totalObservedCost: stages.reduce((sum, stage) => sum + (stage.usage?.cost ?? 0), 0),
    routeFailures: selected.filter((record) => !record.route).length,
    answerFailures: selected.filter((record) => record.route && !record.answer).length,
  };
}

const summary = {
  evidenceId,
  status: environment.status,
  fixtureId: RECALL_V2_FIXTURE_ID,
  caseSet,
  repetitions,
  aggregate: { image: aggregate("image"), search: aggregate("search") },
  interpretationGuard: "Retrieval relevance is independent from answer support. Final answers are evaluated only after opening frozen passages; routing artifacts are never citations.",
};
await Bun.write(resolve(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Evidence retained at ${evidenceRoot}`);
