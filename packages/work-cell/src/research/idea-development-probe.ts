import { createHash, randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { createDeepSeek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { CellUsage } from "../contracts";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ProbeSpecSchema = z.object({
  id: z.string().min(1),
  root: z.string().min(1),
  outputDir: z.string().min(1),
  question: z.string().min(1),
  sources: z.array(z.object({
    path: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })).min(1),
  baselineSamples: z.number().int().min(3).max(12),
  developmentWidth: z.number().int().min(2).max(6),
  estimatedTokens: z.number().int().positive(),
});

const IdeaSchema = z.object({
  thesis: z.string().min(1).max(900),
  governingRelation: z.string().min(1).max(900),
  evidenceRefs: z.array(z.string().min(1)).min(2).max(8),
  prediction: z.string().min(1).max(700),
  nextProbe: z.string().min(1).max(900),
  decisionDelta: z.string().min(1).max(700),
  strongestAlternative: z.string().min(1).max(700),
  failureCondition: z.string().min(1).max(700),
  uncertainty: z.string().min(1).max(500),
});

const ObservationDraftSchema = z.object({
  observation: z.string().min(1).max(700),
  contradiction: z.string().min(1).max(700),
  openQuestion: z.string().min(1).max(500),
  evidenceRefs: z.array(z.string().min(1)).min(1).max(5),
});

const HypothesisDraftSchema = z.object({
  observationIds: z.array(z.string().min(1)).min(1).max(4),
  relation: z.string().min(1).max(900),
  mechanism: z.string().min(1).max(900),
  prediction: z.string().min(1).max(700),
  decisionDelta: z.string().min(1).max(700),
  failureCondition: z.string().min(1).max(700),
  evidenceRefs: z.array(z.string().min(1)).min(2).max(8),
});

const DevelopmentDraftSchema = z.object({
  inherited: z.string().min(1).max(600),
  attack: z.string().min(1).max(700),
  revisedThesis: z.string().min(1).max(900),
  prediction: z.string().min(1).max(700),
  nextProbe: z.string().min(1).max(900),
  decisionDelta: z.string().min(1).max(700),
  failureCondition: z.string().min(1).max(700),
  evidenceRefs: z.array(z.string().min(1)).min(2).max(8),
});

const FinalIdeaSchema = z.object({
  disposition: z.enum(["idea", "all-rejected"]),
  idea: IdeaSchema.nullable(),
  lineageIds: z.array(z.string().min(1)).max(6),
  synthesisObservation: z.string().min(1).max(700),
}).superRefine((value, context) => {
  if (value.disposition === "idea" && value.idea === null) {
    context.addIssue({ code: "custom", path: ["idea"], message: "idea disposition requires an idea" });
  }
  if (value.disposition === "all-rejected" && value.idea !== null) {
    context.addIssue({ code: "custom", path: ["idea"], message: "all-rejected requires a null idea" });
  }
});

const JudgeSchema = z.object({
  preferred: z.enum(["A", "B", "tie", "neither"]),
  causalFinding: z.string().min(1).max(700),
  evidenceFinding: z.string().min(1).max(700),
  actionFinding: z.string().min(1).max(700),
  disconfirmingObservation: z.string().min(1).max(600),
});

const EvidenceChallengeSchema = z.object({
  coreStatus: z.enum(["supported", "mixed", "contradicted", "unsupported"]),
  findings: z.array(z.object({
    evidenceRef: z.string().min(1),
    quote: z.string().min(1).max(320),
    relation: z.enum(["supports", "contradicts", "limits"]),
    explanation: z.string().min(1).max(500),
  })).min(2).max(8),
  unsupportedAssumption: z.string().min(1).max(700),
  requiredRevision: z.string().min(1).max(700),
});

type Idea = z.infer<typeof IdeaSchema>;
type FinalIdea = z.infer<typeof FinalIdeaSchema>;
type Model = ReturnType<ReturnType<typeof createDeepSeek>>;

interface EvidenceChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
}

interface StructuredResult<T> {
  output: T;
  usage: CellUsage;
  recovered: boolean;
  audit?: unknown;
}

const nonThinking = {
  deepseek: { thinking: { type: "disabled" } } satisfies DeepSeekLanguageModelOptions,
};

const baselineOperations = [
  "trace the narrowest causal bottleneck",
  "invert one assumption that the current explanation treats as natural",
  "look for a representation transition that destroys useful information",
  "compare the mechanism with selection in an evolving population",
  "trace authority and feedback through the system",
  "locate where contact with the external world disappears",
  "distinguish diversity of surfaces from diversity of causal models",
  "look for a constraint whose removal would worsen rather than improve quality",
  "find a small architectural change that makes a risky prediction",
] as const;

const observationLenses = [
  "Observe anomalies in the recorded results. Do not propose a solution.",
  "Observe where representation, authority, or information changes form. Do not propose a solution.",
  "Observe which apparent improvements failed to change a real decision. Do not propose a solution.",
] as const;

const hypothesisOperations = [
  "Form a causal bottleneck hypothesis from at least two observations.",
  "Invert the strongest shared assumption and derive a mechanism from the inversion.",
  "Model the missing feedback or inheritance process and derive a competing mechanism.",
] as const;

const judgeSeats = [
  "Prefer the result that explains more concrete evidence with fewer unsupported assumptions. Novel wording has no standing.",
  "Prefer the result that makes the riskier discriminating prediction and proposes the smallest probe capable of changing the architecture decision.",
  "Prefer the result that changes the problem model and opens a fruitful line of work without hiding uncertainty or merely restating the source conclusions.",
] as const;

if (import.meta.main) {
  await main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}

async function main(args: string[]): Promise<void> {
  const specArg = args[0];
  if (!specArg) throw new Error("usage: bun src/research/idea-development-probe.ts <spec.json>");
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is required for a live idea-development probe");
  const specPath = resolve(specArg);
  const specContent = await readFile(specPath, "utf8");
  const spec = ProbeSpecSchema.parse(JSON.parse(specContent));
  const root = isAbsolute(spec.root) ? spec.root : resolve(dirname(specPath), spec.root);
  const evidence = await loadEvidence(root, spec.sources);
  const evidenceIds = new Set(evidence.map((entry) => entry.id));
  const evidenceById = new Map(evidence.map((entry) => [entry.id, entry]));
  const evidencePayload = JSON.stringify(evidence);
  const modelId = "deepseek-v4-flash";
  const provider = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
  const model = provider(modelId);
  const startedAt = new Date();

  const baselineDraftResults = await Promise.all(Array.from({ length: spec.baselineSamples }, (_, index) =>
    generateBaselineDraft(model, spec.question, evidencePayload, index),
  ));
  const baselineDrafts = baselineDraftResults.map((result, index) => ({
    id: `baseline-${index + 1}`,
    ...result.output,
  }));
  baselineDrafts.forEach((draft) => validateReferenceIds(draft.evidenceRefs, evidenceIds, draft.id));
  const baselineFinalResult = await synthesizeFinal({
    model,
    question: spec.question,
    evidencePayload,
    treatment: "independent one-shot proposals",
    lineage: baselineDrafts,
    allowedLineageIds: new Set(baselineDrafts.map((draft) => draft.id)),
  });
  validateFinal(baselineFinalResult.output, evidenceIds, new Set(baselineDrafts.map((draft) => draft.id)), "baseline-final");
  const baselineChallengeResult = await challengeAndValidate(
    model,
    spec.question,
    evidencePayload,
    "one-shot final idea",
    baselineFinalResult.output,
    evidenceById,
    "baseline-challenge",
  );

  const observationResults = await Promise.all(Array.from({ length: spec.developmentWidth }, (_, index) =>
    generateObservation(model, spec.question, JSON.stringify(observationEvidence(evidence, index)), index),
  ));
  const observations = observationResults.map((result, index) => ({ id: `observation-${index + 1}`, ...result.output }));
  observations.forEach((entry) => validateReferenceIds(entry.evidenceRefs, evidenceIds, entry.id));
  const observationIds = new Set(observations.map((entry) => entry.id));

  const hypothesisResults = await Promise.all(Array.from({ length: spec.developmentWidth }, (_, index) =>
    generateHypothesis(model, spec.question, evidencePayload, observations, index),
  ));
  const hypotheses = hypothesisResults.map((result, index) => ({ id: `hypothesis-${index + 1}`, ...result.output }));
  for (const hypothesis of hypotheses) {
    validateReferenceIds(hypothesis.evidenceRefs, evidenceIds, hypothesis.id);
    validateReferenceIds(hypothesis.observationIds, observationIds, hypothesis.id);
  }

  const hypothesisChallengeResults = await Promise.all(hypotheses.map((hypothesis) =>
    challengeAndValidate(
      model,
      spec.question,
      evidencePayload,
      hypothesis.id,
      hypothesis,
      evidenceById,
      `hypothesis-challenge-${hypothesis.id}`,
    ),
  ));

  const developmentResults = await Promise.all(hypotheses.map((hypothesis, index) =>
    developHypothesis(model, spec.question, evidencePayload, hypothesis, hypotheses, hypothesisChallengeResults[index]!.output),
  ));
  const developments = developmentResults.map((result, index) => ({
    id: `development-${index + 1}`,
    parentHypothesisId: hypotheses[index]!.id,
    ...result.output,
  }));
  developments.forEach((entry) => validateReferenceIds(entry.evidenceRefs, evidenceIds, entry.id));
  const developedFinalResult = await synthesizeFinal({
    model,
    question: spec.question,
    evidencePayload,
    treatment: "observation, hypothesis, attack and inheritance",
    lineage: developments,
    allowedLineageIds: new Set(developments.map((entry) => entry.id)),
  });
  validateFinal(developedFinalResult.output, evidenceIds, new Set(developments.map((entry) => entry.id)), "developed-final");
  const developedChallengeResult = await challengeAndValidate(
    model,
    spec.question,
    evidencePayload,
    "developed final idea",
    developedFinalResult.output,
    evidenceById,
    "developed-challenge",
  );

  const admittedBaseline = admitFinal(baselineFinalResult.output, baselineChallengeResult.output);
  const admittedDeveloped = admitFinal(developedFinalResult.output, developedChallengeResult.output);

  const developedIsA = randomInt(2) === 0;
  const a = developedIsA ? admittedDeveloped : admittedBaseline;
  const b = developedIsA ? admittedBaseline : admittedDeveloped;
  const judgeResults = shouldJudgeFinals(a, b)
    ? await Promise.all(judgeSeats.map((seat) => judgeFinals(model, spec.question, evidencePayload, a, b, seat)))
    : [];
  const finishedAt = new Date();
  const runId = randomUUID();
  const usageByStage = {
    baselineDrafts: sumUsage(baselineDraftResults.map((result) => result.usage)),
    baselineSynthesis: baselineFinalResult.usage,
    observations: sumUsage(observationResults.map((result) => result.usage)),
    hypotheses: sumUsage(hypothesisResults.map((result) => result.usage)),
    developments: sumUsage(developmentResults.map((result) => result.usage)),
    developedSynthesis: developedFinalResult.usage,
    evidenceChallenges: sumUsage([
      baselineChallengeResult.usage,
      ...hypothesisChallengeResults.map((result) => result.usage),
      developedChallengeResult.usage,
    ]),
    judges: sumUsage(judgeResults.map((result) => result.usage)),
  };
  const usage = sumUsage(Object.values(usageByStage));
  const outputRoot = resolve(root, spec.outputDir, spec.id);
  await mkdir(outputRoot, { recursive: true });
  const output = resolve(outputRoot, `idea-development-${runId}.json`);
  const packet = resolve(outputRoot, `idea-development-${runId}-blind.md`);
  const key = resolve(outputRoot, `idea-development-${runId}-key.json`);
  const record = {
    version: "work-cell.idea-development-probe.v2",
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    driver: { provider: "deepseek", model: modelId },
    question: spec.question,
    specEvidence: { path: specPath, sha256: createHash("sha256").update(specContent).digest("hex") },
    evidence: evidence.map(({ content, ...entry }) => ({ ...entry, sha256: createHash("sha256").update(content).digest("hex") })),
    baseline: {
      drafts: baselineDrafts,
      final: baselineFinalResult.output,
      challenge: { ...baselineChallengeResult.output, audit: baselineChallengeResult.audit },
      admitted: admittedBaseline,
    },
    developed: {
      observations,
      hypotheses,
      hypothesisChallenges: hypothesisChallengeResults.map((result, index) => ({
        hypothesisId: hypotheses[index]!.id,
        ...result.output,
        audit: result.audit,
      })),
      developments,
      final: developedFinalResult.output,
      challenge: { ...developedChallengeResult.output, audit: developedChallengeResult.audit },
      admitted: admittedDeveloped,
    },
    blind: {
      A: a,
      B: b,
      judges: judgeResults.map((result, index) => ({ seat: judgeSeats[index], ...result.output })),
      authority: "same-model comparison evidence; Principal judgement remains required",
    },
    usageByStage,
    usage,
    estimateAudit: {
      estimatedTokens: spec.estimatedTokens,
      actualTokens: usage.totalTokens,
      relativeError: Math.abs(usage.totalTokens - spec.estimatedTokens) / spec.estimatedTokens,
    },
  };
  await Promise.all([
    writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8"),
    writeFile(packet, renderIdeaComparisonPacket(a, b, evidence), "utf8"),
    writeFile(key, `${JSON.stringify({ runId, A: developedIsA ? "developed" : "baseline", B: developedIsA ? "baseline" : "developed" }, null, 2)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({
    output,
    packet,
    key,
    durationMs: record.durationMs,
    votes: judgeResults.map((result, index) => ({ seat: index + 1, preferred: result.output.preferred })),
    usageByStage,
    usage,
    estimateAudit: record.estimateAudit,
  }, null, 2));
}

async function loadEvidence(
  root: string,
  sources: z.infer<typeof ProbeSpecSchema>["sources"],
): Promise<EvidenceChunk[]> {
  const chunks: EvidenceChunk[] = [];
  for (const source of sources) {
    if (source.endLine < source.startLine) throw new Error(`${source.path} endLine precedes startLine`);
    const lines = (await readFile(resolve(root, source.path), "utf8")).split(/\r?\n/);
    if (source.startLine > lines.length) throw new Error(`${source.path} startLine exceeds file length`);
    const selected = lines.slice(source.startLine - 1, Math.min(source.endLine, lines.length));
    for (let offset = 0; offset < selected.length; offset += 60) {
      const content = selected.slice(offset, offset + 60).join("\n");
      const startLine = source.startLine + offset;
      chunks.push({
        id: `evidence-${chunks.length + 1}`,
        path: source.path,
        startLine,
        endLine: startLine + content.split(/\r?\n/).length - 1,
        content,
      });
    }
  }
  return chunks;
}

async function generateBaselineDraft(
  model: Model,
  question: string,
  evidencePayload: string,
  index: number,
): Promise<StructuredResult<Idea>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You independently propose one complete idea from concrete evidence. You cannot see or inherit another proposal.",
      "A good idea must explain several observations through one relation, make a risky prediction, change an architecture decision, and expose how it could fail.",
      `Local operation: ${baselineOperations[index % baselineOperations.length]}`,
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, "Return one complete idea. Cite only supplied evidence IDs."),
    output: Output.object({ schema: IdeaSchema }),
    maxOutputTokens: 1_400,
    temperature: 0.9,
    topP: 0.95,
    providerOptions: nonThinking,
  }), "Return every required idea field and at least two supplied evidence IDs.", `baseline-${index + 1}`);
}

async function generateObservation(
  model: Model,
  question: string,
  evidencePayload: string,
  index: number,
): Promise<StructuredResult<z.infer<typeof ObservationDraftSchema>>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You contribute one observation to a shared idea-development field. Do not propose, imply, or rank a solution.",
      observationLenses[index % observationLenses.length],
      "Distinguish an observed result from your interpretation and expose one contradiction that a later hypothesis must explain.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, "Return one observation, contradiction, open question, and source IDs."),
    output: Output.object({ schema: ObservationDraftSchema }),
    maxOutputTokens: 900,
    temperature: 0.5,
    topP: 0.9,
    providerOptions: nonThinking,
  }), "Return every required observation field and cite only supplied evidence IDs.", `observation-${index + 1}`);
}

async function generateHypothesis(
  model: Model,
  question: string,
  evidencePayload: string,
  observations: Array<{ id: string } & z.infer<typeof ObservationDraftSchema>>,
  index: number,
): Promise<StructuredResult<z.infer<typeof HypothesisDraftSchema>>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You form one unfinished causal hypothesis from a shared observation field. Do not write a final recommendation.",
      hypothesisOperations[index % hypothesisOperations.length],
      "The hypothesis must connect observations, make a prediction, and state a failure condition rather than merely summarize them.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, [
      "## Shared observations",
      JSON.stringify(observations),
      "Use only supplied observation IDs and evidence IDs.",
    ].join("\n\n")),
    output: Output.object({ schema: HypothesisDraftSchema }),
    maxOutputTokens: 1_200,
    temperature: 0.85,
    topP: 0.95,
    providerOptions: nonThinking,
  }), "Return every required hypothesis field and only supplied observation and evidence IDs.", `hypothesis-${index + 1}`);
}

async function developHypothesis(
  model: Model,
  question: string,
  evidencePayload: string,
  target: { id: string } & z.infer<typeof HypothesisDraftSchema>,
  alternatives: Array<{ id: string } & z.infer<typeof HypothesisDraftSchema>>,
  challenge: z.infer<typeof EvidenceChallengeSchema>,
): Promise<StructuredResult<z.infer<typeof DevelopmentDraftSchema>>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You develop one hypothesis through opposition and inheritance. Preserve what survives evidence, attack its strongest weakness, and revise it materially.",
      "Do not average all hypotheses or reward novelty. The revised thesis must discriminate itself from the strongest alternative through a risky prediction and smallest practical probe.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, [
      "## Target hypothesis",
      JSON.stringify(target),
      "## Competing hypotheses",
      JSON.stringify(alternatives.filter((entry) => entry.id !== target.id)),
      "## Independent evidence challenge",
      JSON.stringify(challenge),
      "Revise or abandon the target's unsupported mechanism; do not repeat a claim that the challenge contradicts.",
      "Return the inherited core, strongest attack, revised thesis, prediction, next probe, decision delta, failure condition, and evidence IDs.",
    ].join("\n\n")),
    output: Output.object({ schema: DevelopmentDraftSchema }),
    maxOutputTokens: 1_400,
    temperature: 0.75,
    topP: 0.92,
    providerOptions: nonThinking,
  }), "Return every required development field and cite only supplied evidence IDs.", `development-${target.id}`);
}

async function challengeAndValidate(
  model: Model,
  question: string,
  evidencePayload: string,
  claimId: string,
  claim: unknown,
  evidenceById: Map<string, EvidenceChunk>,
  owner: string,
): Promise<StructuredResult<z.infer<typeof EvidenceChallengeSchema>>> {
  const first = await challengeClaim(model, question, evidencePayload, claimId, claim);
  const normalizedFirst = rebindChallengeReferences(first.output, evidenceById);
  try {
    validateEvidenceChallenge(normalizedFirst.challenge, evidenceById, owner);
    return {
      ...first,
      output: normalizedFirst.challenge,
      recovered: first.recovered || normalizedFirst.repairs.length > 0,
      ...(normalizedFirst.repairs.length > 0 ? { audit: { referenceRepairs: normalizedFirst.repairs } } : {}),
    };
  } catch (error) {
    const correction = error instanceof Error ? error.message : String(error);
    const second = await challengeClaim(model, question, evidencePayload, claimId, claim, correction);
    const normalizedSecond = rebindChallengeReferences(second.output, evidenceById);
    try {
      validateEvidenceChallenge(normalizedSecond.challenge, evidenceById, owner);
    } catch (finalError) {
      throw new Error(`${finalError instanceof Error ? finalError.message : String(finalError)}; evidence retry exhausted; observed usage=${JSON.stringify(addUsage(first.usage, second.usage))}`);
    }
    return {
      output: normalizedSecond.challenge,
      usage: addUsage(first.usage, second.usage),
      recovered: true,
      audit: {
        validationRetry: correction,
        ...(normalizedSecond.repairs.length > 0 ? { referenceRepairs: normalizedSecond.repairs } : {}),
      },
    };
  }
}

async function challengeClaim(
  model: Model,
  question: string,
  evidencePayload: string,
  claimId: string,
  claim: unknown,
  evidenceCorrection?: string,
): Promise<StructuredResult<z.infer<typeof EvidenceChallengeSchema>>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You are an adversarial claim-level evidence verifier, not an idea generator, editor, or judge of novelty.",
      "Separate what the supplied evidence explicitly shows from a plausible mechanism the claim merely invents. A valid evidence ID is not support by itself.",
      "For every finding, copy one short exact quotation from the cited evidence chunk. Classify the core mechanism as supported only when the quotations establish it, not merely its observed outcome.",
      "A prior failed treatment must count against a proposal that repeats it under a new description.",
      ...(evidenceCorrection ? [
        "## Evidence-validation correction",
        `${evidenceCorrection}. Replace every shortened, paraphrased, or ellipsized quotation with a short exact substring copied from its evidence chunk.`,
      ] : []),
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, [
      `## Claim ${claimId}`,
      JSON.stringify(claim),
      "Return the core status, at least two exact-quote findings, the strongest unsupported assumption, and the revision required before admission.",
    ].join("\n\n")),
    output: Output.object({ schema: EvidenceChallengeSchema }),
    maxOutputTokens: 1_500,
    temperature: 0.2,
    topP: 0.85,
    providerOptions: nonThinking,
  }), "Return every challenge field, cite only supplied evidence IDs, and copy exact source quotations.", `challenge-${claimId}`);
}

async function synthesizeFinal(input: {
  model: Model;
  question: string;
  evidencePayload: string;
  treatment: string;
  lineage: unknown[];
  allowedLineageIds: Set<string>;
}): Promise<StructuredResult<FinalIdea>> {
  return runStructured((correction) => generateText({
    model: input.model,
    system: [
      `You synthesize one final idea from ${input.treatment}.`,
      "Do not select impressive prose. Preserve only a relation that explains concrete evidence, changes a decision, makes a risky prediction, and supports a smallest discriminating probe.",
      "You may reject all lineage when none clears that boundary. Do not invent a compromise merely to return an idea.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(input.question, input.evidencePayload, [
      "## Available lineage",
      JSON.stringify(input.lineage),
      `## Allowed lineage IDs\n${[...input.allowedLineageIds].join("\n")}`,
      "Return disposition idea with one idea and its actual lineage IDs, or all-rejected with a null idea.",
    ].join("\n\n")),
    output: Output.object({ schema: FinalIdeaSchema }),
    maxOutputTokens: 1_800,
    temperature: 0.45,
    topP: 0.9,
    providerOptions: nonThinking,
  }), "Keep disposition and idea consistent and use only supplied lineage and evidence IDs.", `synthesis-${input.treatment}`);
}

async function judgeFinals(
  model: Model,
  question: string,
  evidencePayload: string,
  a: FinalIdea,
  b: FinalIdea,
  seat: string,
): Promise<StructuredResult<z.infer<typeof JudgeSchema>>> {
  return runStructured((correction) => generateText({
    model,
    system: [
      "You are one blind comparison seat, not an idea generator or acceptance authority.",
      seat,
      "You may choose neither. Do not infer which treatment produced either result, and do not reward length or polish.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: prompt(question, evidencePayload, `## Result A\n${JSON.stringify(a)}\n\n## Result B\n${JSON.stringify(b)}`),
    output: Output.object({ schema: JudgeSchema }),
    maxOutputTokens: 1_100,
    temperature: 0.25,
    topP: 0.85,
    providerOptions: nonThinking,
  }), "Return one allowed preference and every required finding field.", `judge-${judgeSeats.indexOf(seat as typeof judgeSeats[number]) + 1}`);
}

function prompt(question: string, evidencePayload: string, finalInstruction: string): string {
  return [
    "## Question",
    question,
    "## Concrete evidence chunks",
    evidencePayload,
    finalInstruction,
  ].join("\n\n");
}

export function validateReferenceIds(ids: string[], allowed: Set<string>, owner: string): void {
  const invalid = ids.filter((id) => !allowed.has(id));
  if (invalid.length > 0) throw new Error(`${owner} cited unavailable IDs: ${invalid.join(", ")}`);
}

function validateFinal(final: FinalIdea, evidenceIds: Set<string>, lineageIds: Set<string>, owner: string): void {
  validateReferenceIds(final.lineageIds, lineageIds, owner);
  if (final.disposition === "idea" && final.idea) validateReferenceIds(final.idea.evidenceRefs, evidenceIds, owner);
}

export function validateEvidenceChallenge(
  challenge: z.infer<typeof EvidenceChallengeSchema>,
  evidenceById: Map<string, EvidenceChunk>,
  owner: string,
): void {
  validateReferenceIds(challenge.findings.map((finding) => finding.evidenceRef), new Set(evidenceById.keys()), owner);
  for (const finding of challenge.findings) {
    const source = evidenceById.get(finding.evidenceRef)!;
    if (!normalizeText(source.content).includes(normalizeText(finding.quote))) {
      throw new Error(`${owner} supplied a non-verbatim quote for ${finding.evidenceRef}: ${finding.quote}`);
    }
  }
  if (challenge.coreStatus === "supported" && !challenge.findings.some((finding) => finding.relation === "supports")) {
    throw new Error(`${owner} marked a claim supported without supporting evidence`);
  }
  if (challenge.coreStatus === "contradicted" && !challenge.findings.some((finding) => finding.relation === "contradicts")) {
    throw new Error(`${owner} marked a claim contradicted without contradictory evidence`);
  }
}

function rebindChallengeReferences(
  challenge: z.infer<typeof EvidenceChallengeSchema>,
  evidenceById: Map<string, EvidenceChunk>,
): {
  challenge: z.infer<typeof EvidenceChallengeSchema>;
  repairs: Array<{ quote: string; from: string; to: string; replacement?: string }>;
} {
  const repairs: Array<{ quote: string; from: string; to: string; replacement?: string }> = [];
  const findings = challenge.findings.map((finding) => {
    const cited = evidenceById.get(finding.evidenceRef);
    if (cited && normalizeText(cited.content).includes(normalizeText(finding.quote))) return finding;
    const citedReplacement = cited ? resolveEllipsizedQuote(finding.quote, cited.content) : undefined;
    if (citedReplacement) {
      repairs.push({
        quote: finding.quote,
        from: finding.evidenceRef,
        to: finding.evidenceRef,
        replacement: citedReplacement,
      });
      return { ...finding, quote: citedReplacement };
    }
    const matches = [...evidenceById.values()].flatMap((entry) => {
      const direct = normalizeText(entry.content).includes(normalizeText(finding.quote));
      const replacement = direct ? finding.quote : resolveEllipsizedQuote(finding.quote, entry.content);
      return replacement ? [{ entry, replacement }] : [];
    });
    if (matches.length !== 1) return finding;
    const match = matches[0]!;
    repairs.push({
      quote: finding.quote,
      from: finding.evidenceRef,
      to: match.entry.id,
      ...(match.replacement === finding.quote ? {} : { replacement: match.replacement }),
    });
    return { ...finding, evidenceRef: match.entry.id, quote: match.replacement };
  });
  return { challenge: { ...challenge, findings }, repairs };
}

export function resolveEllipsizedQuote(quote: string, content: string): string | undefined {
  if (!/(?:…|\.{3})/.test(quote)) return undefined;
  const parts = quote
    .split(/(?:…|\.{3})/)
    .map(normalizeText)
    .filter((part) => part.length >= 8);
  if (parts.length < 2) return undefined;
  const normalizedContent = normalizeText(content);
  let cursor = 0;
  for (const part of parts) {
    const index = normalizedContent.indexOf(part, cursor);
    if (index < 0) return undefined;
    cursor = index + part.length;
  }
  return parts.toSorted((left, right) => right.length - left.length)[0];
}

function admitFinal(final: FinalIdea, challenge: z.infer<typeof EvidenceChallengeSchema>): FinalIdea {
  if (final.disposition === "idea" && challenge.coreStatus === "supported") return final;
  return {
    disposition: "all-rejected",
    idea: null,
    lineageIds: [],
    synthesisObservation: `Evidence gate rejected the core mechanism as ${challenge.coreStatus}: ${challenge.requiredRevision}`,
  };
}

function observationEvidence(evidence: EvidenceChunk[], index: number): EvidenceChunk[] {
  if (index % 3 === 0) return evidence.filter((entry) => entry.path.includes("evaluations/"));
  if (index % 3 === 1) return evidence.filter((entry) => entry.path.includes("activation-field.ts"));
  return evidence.filter((entry) => entry.path.includes("SEQUENCE.md") || (
    entry.path.includes("evaluations/") && entry.startLine >= 485
  ));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function renderIdeaComparisonPacket(a: FinalIdea, b: FinalIdea, evidence: EvidenceChunk[]): string {
  return [
    "# Idea development blind comparison",
    "",
    "Judge which result changes the problem model through a true relation, risky prediction, and useful next probe. You may choose A, B, both, or neither.",
    "Treatment identity and automated votes are intentionally hidden.",
    "",
    renderFinal("A", a),
    renderFinal("B", b),
    "## Evidence index",
    "",
    ...evidence.map((entry) => `- ${entry.id}: ${entry.path}:${entry.startLine}-${entry.endLine}`),
    "",
  ].join("\n");
}

export function shouldJudgeFinals(a: FinalIdea, b: FinalIdea): boolean {
  return a.disposition === "idea" || b.disposition === "idea";
}

function renderFinal(label: string, final: FinalIdea): string {
  if (final.disposition === "all-rejected" || !final.idea) {
    return `## Result ${label}\n\nNo idea survived.\n\n${final.synthesisObservation}\n`;
  }
  const idea = final.idea;
  return [
    `## Result ${label}`,
    "",
    `**Thesis:** ${idea.thesis}`,
    "",
    `**Governing relation:** ${idea.governingRelation}`,
    "",
    `**Evidence:** ${idea.evidenceRefs.join(", ")}`,
    "",
    `**Prediction:** ${idea.prediction}`,
    "",
    `**Next probe:** ${idea.nextProbe}`,
    "",
    `**Decision delta:** ${idea.decisionDelta}`,
    "",
    `**Strongest alternative:** ${idea.strongestAlternative}`,
    "",
    `**Failure condition:** ${idea.failureCondition}`,
    "",
    `**Uncertainty:** ${idea.uncertainty}`,
    "",
  ].join("\n");
}

interface GenerateResult<T> {
  output: T;
  totalUsage: unknown;
  providerMetadata: unknown;
}

async function runStructured<T>(
  call: (correction?: string) => Promise<GenerateResult<T>>,
  repairRequirement: string,
  label: string,
): Promise<StructuredResult<T>> {
  let recoveredUsage = emptyUsage();
  let correction: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await call(correction);
      return {
        output: result.output,
        usage: addUsage(recoveredUsage, normalizeUsage(result.totalUsage, result.providerMetadata)),
        recovered: attempt > 1,
      };
    } catch (error) {
      if (!recoverable(error)) throw error;
      if (NoObjectGeneratedError.isInstance(error)) {
        recoveredUsage = addUsage(recoveredUsage, normalizeUsage(error.usage, undefined));
      }
      const cause = "cause" in error && error.cause instanceof Error ? error.cause.message : error.message;
      correction = `Attempt ${attempt} failed the declared schema: ${cause}. ${repairRequirement}`;
      if (attempt === 3) {
        throw new Error(`${label}: ${error.message}; structured retries exhausted; observed usage=${JSON.stringify(recoveredUsage)}`);
      }
    }
  }
  throw new Error(`${label}: structured generation ended without a result`);
}

function recoverable(error: unknown): error is Error {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

function normalizeUsage(usage: unknown, metadata: unknown): CellUsage {
  const record = asRecord(usage);
  const provider = asRecord(asRecord(metadata).deepseek);
  const inputTokens = numberValue(record.inputTokens) || numberValue(record.promptTokens);
  const outputTokens = numberValue(record.outputTokens) || numberValue(record.completionTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens: numberValue(record.totalTokens) || inputTokens + outputTokens,
    cachedInputTokens: numberValue(record.cachedInputTokens) || numberValue(provider.promptCacheHitTokens),
  };
}

function sumUsage(usages: CellUsage[]): CellUsage {
  return usages.reduce(addUsage, emptyUsage());
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
