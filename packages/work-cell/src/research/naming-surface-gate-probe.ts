import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { CellUsage } from "../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../ai-sdk-usage";
import {
  createValidationModel,
  requireValidationCredentials,
  validationProviderName,
} from "../validation-model";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ManifestSchema = z.object({
  namingExpressionProbe: z.object({
    contrastiveCases: z.array(z.object({
      accepted: z.object({
        surface: z.string().min(1),
        observation: z.string().min(1),
      }),
      rejected: z.object({
        surface: z.string().min(1),
        observation: z.string().min(1),
      }),
      contrast: z.string().min(1),
    })).min(1).max(12),
  }),
});

const CandidateSchema = z.object({
  name: z.string().min(1),
  spokenForm: z.string().min(1),
});

const ExpressionEnvelopeSchema = z.object({
  version: z.literal("work-cell.naming-expression-probe.v3"),
  runId: z.string().min(1),
  treatment: z.object({
    direct: z.object({ candidates: z.array(CandidateSchema).max(12) }),
    projected: z.object({ candidates: z.array(CandidateSchema).max(12) }),
  }),
});

const SurfaceJudgmentSchema = z.object({
  judgments: z.array(z.object({
    name: z.string().min(1),
    verdict: z.enum(["retain", "reject"]),
    reason: z.string().min(1).max(300),
  })).min(1),
  wholeSetObservation: z.string().min(1).max(500),
});

const seats = [
  {
    id: "mouth-ear",
    instructions: "Judge whether the surface can pass naturally through mouth and ear. Reject pronunciation puzzles, forced wordplay, awkward hybrids, and anything whose sound must be defended by its formation story. Familiarity alone is neither merit nor defect.",
  },
  {
    id: "cultural-naturalness",
    instructions: "Judge whether the surface feels found or lived rather than costumed. Reject fake antiquity, ornamental foreignness, prestige-language borrowing, and cultural references used mainly to signal cleverness. A real inherited word may remain opaque and still be natural.",
  },
  {
    id: "meaning-room",
    instructions: "Judge whether the surface has room to accrue project meaning without spelling out the mission. Reject generic virtue-plus-object labels and arbitrary dictionary words whose explanation does all the work. Do not require the name to describe AI, openness, or common ownership.",
  },
] as const;

if (import.meta.main) {
  await main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}

async function main(args: string[]): Promise<void> {
  const expressionArg = args[0];
  const manifestArg = args[1];
  if (!expressionArg || !manifestArg) {
    throw new Error("usage: bun src/research/naming-surface-gate-probe.ts <naming-expression.json> <manifest.json>");
  }
  requireValidationCredentials("a live naming surface gate");
  const expressionPath = resolve(expressionArg);
  const expressionContent = await readFile(expressionPath, "utf8");
  const expression = ExpressionEnvelopeSchema.parse(JSON.parse(expressionContent));
  const manifestPath = resolve(manifestArg);
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const candidates = mergeCandidates(expression.treatment);
  const allowedNames = new Set(candidates.map((candidate) => candidate.name));
  const modelId = "deepseek-v4-flash";
  const selection = createValidationModel({ model: modelId });
  const model = selection.model;
  const startedAt = new Date();
  const results = candidates.length === 0 ? [] : await Promise.all(seats.map(async (seat) => {
    const result = await generateText({
      model,
      instructions: [
        "You are an independent aesthetic surface gate, not a naming generator, explainer, marketer, or final authority.",
        "You see only names and spoken forms. Judge the surface that a person actually encounters; do not invent a favorable story or guess the hidden treatment.",
        "You may reject every candidate. There is no quota, diversity target, politeness requirement, or obligation to identify a best available option.",
        "The Principal's cases are contrastive observations for rejection, never rules about language, length, origin, character count, or naming mechanism. Do not generate, repair, or imitate a case surface.",
        "## Seat",
        seat.instructions,
      ].join("\n"),
      prompt: [
        "## Principal contrastive surface cases",
        JSON.stringify(manifest.namingExpressionProbe.contrastiveCases),
        "## Blind candidate surfaces",
        JSON.stringify(candidates.map(({ name, spokenForm }) => ({ name, spokenForm }))),
        "Return one retain/reject judgment for every supplied name. Do not add, rename, rewrite, rank, or recommend a candidate.",
      ].join("\n\n"),
      output: Output.object({ schema: SurfaceJudgmentSchema }),
      maxOutputTokens: 2_000,
      temperature: 0.35,
      topP: 0.9,
    });
    const value = SurfaceJudgmentSchema.parse(result.output);
    assertCompleteJudgments(value, allowedNames, seat.id);
    return { seat: seat.id, instructions: seat.instructions, value, usage: normalizeUsage(result.totalUsage, result.providerMetadata) };
  }));
  const finishedAt = new Date();
  const nominations = candidates.map((candidate) => {
    const retainedBy = results
      .filter((result) => result.value.judgments.some((judgment) => judgment.name === candidate.name && judgment.verdict === "retain"))
      .map((result) => result.seat);
    return { ...candidate, retainedBy, retainedCount: retainedBy.length, surfaced: retainedBy.length >= 2 };
  });
  const usage = results.map((result) => result.usage).reduce(addUsage, emptyUsage());
  const runId = randomUUID();
  const output = resolve(dirname(expressionPath), `naming-surface-gate-${runId}.json`);
  const packet = resolve(dirname(expressionPath), `naming-surface-gate-${runId}-human.md`);
  await Promise.all([
    writeFile(output, `${JSON.stringify({
      version: "work-cell.naming-surface-gate-probe.v2",
      runId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      driver: { provider: validationProviderName(selection), model: modelId },
      source: {
        path: expressionPath,
        sha256: createHash("sha256").update(expressionContent).digest("hex"),
        runId: expression.runId,
      },
      seats: results,
      nominations,
      surfacedNames: nominations.filter((entry) => entry.surfaced).map((entry) => entry.name),
      usage,
      authority: "self-evaluated filter evidence; Principal acceptance remains required",
    }, null, 2)}\n`, "utf8"),
    writeFile(packet, renderHumanSurfacePacket(nominations), "utf8"),
  ]);
  console.log(JSON.stringify({
    output,
    packet,
    candidates: candidates.length,
    surfacedNames: nominations.filter((entry) => entry.surfaced).map((entry) => entry.name),
    retainedCounts: Object.fromEntries(nominations.map((entry) => [entry.name, entry.retainedCount])),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    usage,
  }, null, 2));
}

interface SurfaceCandidate {
  name: string;
  spokenForm: string;
  treatments: Array<"direct" | "projected">;
}

function mergeCandidates(treatment: z.infer<typeof ExpressionEnvelopeSchema>["treatment"]): SurfaceCandidate[] {
  const merged = new Map<string, SurfaceCandidate>();
  for (const [source, set] of Object.entries(treatment) as Array<[
    "direct" | "projected",
    { candidates: Array<z.infer<typeof CandidateSchema>> },
  ]>) {
    for (const entry of set.candidates) {
      const key = entry.name.trim().toLocaleLowerCase();
      const present = merged.get(key);
      if (present) {
        if (!present.treatments.includes(source)) present.treatments.push(source);
      } else {
        merged.set(key, { ...entry, treatments: [source] });
      }
    }
  }
  return [...merged.values()];
}

export function renderHumanSurfacePacket(
  nominations: Array<{ name: string; spokenForm: string; surfaced: boolean }>,
): string {
  const surfaced = nominations.filter((candidate) => candidate.surfaced);
  return [
    "# Naming surface review",
    "",
    "Any listed surface passed a machine rejection filter; that is not acceptance evidence. You may reject every item.",
    "Judge what you can say and hear before requesting any formation story or explanation.",
    "",
    ...(surfaced.length === 0
      ? ["No candidate survived the surface gate.", ""]
      : surfaced.flatMap((candidate) => [
        `- ${candidate.name} — spoken: ${candidate.spokenForm}`,
        "",
      ])),
  ].join("\n");
}

function assertCompleteJudgments(
  value: z.infer<typeof SurfaceJudgmentSchema>,
  allowedNames: Set<string>,
  seatId: string,
): void {
  const judged = value.judgments.map((judgment) => judgment.name);
  if (new Set(judged).size !== judged.length) throw new Error(`${seatId} repeated a candidate judgment`);
  const unknown = judged.filter((name) => !allowedNames.has(name));
  const missing = [...allowedNames].filter((name) => !judged.includes(name));
  if (unknown.length > 0 || missing.length > 0) {
    throw new Error(`${seatId} judgment mismatch; unknown=${unknown.join(",")}; missing=${missing.join(",")}`);
  }
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
