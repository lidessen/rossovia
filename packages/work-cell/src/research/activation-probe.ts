import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { z } from "zod";
import { requireValidationConfiguration } from "../validation-model";
import { runActivationField } from "./activation-field";
import { AiSdkActivationFieldDriver } from "./ai-sdk-activation-field";
import { compilePhenotypePrompts, PopulationSpecSchema, samplePopulation } from "./population-shape";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ProbeSpecSchema = z.object({
  id: z.string().min(1),
  root: z.string().min(1),
  outputDir: z.string().min(1).default(".work-cell/activation-fields"),
  stimulus: z.string().min(1),
  sources: z.array(z.object({
    path: z.string().min(1),
    maxChars: z.number().int().positive(),
  })).min(1),
  population: PopulationSpecSchema,
  scales: z.array(z.number().int().min(2).max(512)).min(1),
  concurrency: z.number().int().min(1).max(256).default(32),
  groupSize: z.number().int().min(4).max(32).default(8),
  workingSetByScale: z.record(z.string(), z.number().int().min(2).max(16)),
  maxLayers: z.number().int().min(1).max(6).default(4),
  layerWidthsByScale: z.record(z.string(), z.array(z.number().int().min(2).max(512)).max(6)).default({}),
  propagateShapes: z.boolean().default(false),
  estimatedTokensByScale: z.record(z.string(), z.number().int().positive()).default({}),
});

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const manifestArg = args[0];
  if (!manifestArg) throw new Error("usage: bun src/research/activation-probe.ts <manifest.json> (--scale <n> | --baseline) [--propagate-shapes] [--working-set <n>]");
  const baseline = args.includes("--baseline");
  const propagateShapes = args.includes("--propagate-shapes");
  const scaleFlag = args.indexOf("--scale");
  const scaleValue = scaleFlag >= 0 ? args[scaleFlag + 1] : undefined;
  const scale = Number(scaleValue);
  const workingSetFlag = args.indexOf("--working-set");
  const workingSetOverride = workingSetFlag >= 0 ? Number(args[workingSetFlag + 1]) : undefined;
  if (!baseline && (!Number.isInteger(scale) || scale < 2)) throw new Error("--scale must be an integer of at least 2");
  if (workingSetOverride !== undefined && (!Number.isInteger(workingSetOverride) || workingSetOverride < 2 || workingSetOverride > 16)) {
    throw new Error("--working-set must be an integer from 2 through 16");
  }
  requireValidationConfiguration("a live activation probe");

  const manifestPath = resolve(manifestArg);
  const spec = ProbeSpecSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  if (!baseline && !spec.scales.includes(scale)) throw new Error(`scale ${scale} is not declared by the probe manifest`);
  const declaredWorkingSet = baseline ? undefined : spec.workingSetByScale[String(scale)];
  if (!baseline && !declaredWorkingSet) throw new Error(`scale ${scale} requires a declared working-set size`);
  const base = dirname(manifestPath);
  const root = isAbsolute(spec.root) ? spec.root : resolve(base, spec.root);
  const snapshotParts: string[] = [];
  const sourceEvidence: Array<{ path: string; sha256: string; totalChars: number; includedChars: number }> = [];
  for (const source of spec.sources) {
    const path = resolve(root, source.path);
    const content = await readFile(path, "utf8");
    const excerpt = content.slice(0, source.maxChars);
    snapshotParts.push(`## ${source.path}\n\n${excerpt}`);
    sourceEvidence.push({
      path: source.path,
      sha256: createHash("sha256").update(content).digest("hex"),
      totalChars: content.length,
      includedChars: excerpt.length,
    });
  }
  const snapshot = snapshotParts.join("\n\n");
  const outputRoot = resolve(root, spec.outputDir, spec.id);
  await mkdir(outputRoot, { recursive: true });
  const driver = new AiSdkActivationFieldDriver();
  if (baseline) {
    const startedAt = new Date();
    const result = await driver.baseline({ stimulus: spec.stimulus, snapshot });
    const finishedAt = new Date();
    const runId = crypto.randomUUID();
    const output = resolve(outputRoot, `baseline-${runId}.json`);
    const record = {
      version: "work-cell.activation-baseline.v1",
      runId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      driver: driver.descriptor,
      stimulus: spec.stimulus,
      sourceEvidence,
      response: result.value.response,
      usage: result.usage,
      raw: result.raw,
    };
    await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, durationMs: record.durationMs, usage: record.usage, response: record.response }, null, 2));
    return;
  }
  const sampledPopulation = samplePopulation({
    ...spec.population,
    size: scale,
    seed: `${spec.population.seed}:${scale}`,
  });
  const selectedPids = [...new Set(sampledPopulation.shapes.flatMap(
    (shape) => shape.principles.map((principle) => principle.pid),
  ))].sort();
  const principlePrompts: Record<string, string> = {};
  const principlePromptEvidence: Array<{ pid: string; path: string; sha256: string }> = [];
  for (const pid of selectedPids) {
    const relativePath = `principles/interpretations/${pid}.md`;
    const content = await readFile(resolve(root, relativePath), "utf8");
    principlePrompts[pid] = principlePhenotypePrompt(content);
    principlePromptEvidence.push({
      pid,
      path: relativePath,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  const population = compilePhenotypePrompts(sampledPopulation, principlePrompts);
  const receptors = population.shapes.map((shape) => ({
    id: shape.id,
    instructions: shape.instructions,
    principlePids: shape.principles.map((principle) => principle.pid),
    componentId: shape.componentId,
    temperature: shape.temperature,
    shape: {
      components: [{ id: shape.componentId, weight: 1, prompt: shape.componentInstructions }],
      principles: shape.principles,
      traits: shape.traits,
      facets: shape.facets,
    },
  }));
  const input = {
    id: `${spec.id}-${scale}`,
    stimulus: spec.stimulus,
    snapshot,
    receptors,
    activationCount: receptors.length,
    concurrency: Math.min(scale, spec.concurrency),
    groupSize: spec.groupSize,
    workingSetSize: Math.min(workingSetOverride ?? declaredWorkingSet!, scale - 1),
    maxLayers: spec.maxLayers,
    layerWidths: spec.layerWidthsByScale[String(scale)] ?? [],
    propagateShapes: propagateShapes || spec.propagateShapes,
    ...(spec.estimatedTokensByScale[String(scale)]
      ? { estimatedTokens: spec.estimatedTokensByScale[String(scale)] }
      : {}),
  };
  const record = await runActivationField(input, driver);
  const output = resolve(outputRoot, `scale-${scale}-${record.runId}.json`);
  await writeFile(output, `${JSON.stringify({ sourceEvidence, principlePromptEvidence, population, record }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output,
    status: record.status,
    scale,
    activations: record.activations.length,
    populationAudit: population.audit,
    layers: record.layers.map((layer) => layer.length),
    workingSet: record.workingSet.length,
    failures: record.failures,
    durationMs: record.durationMs,
    usage: record.usage,
    estimateAudit: record.estimateAudit,
    expression: record.expression,
  }, null, 2));
}

function principlePhenotypePrompt(content: string): string {
  const sections = interpretationSections(content);
  return [
    "You are the kind of thinker for whom this tendency has become instinct rather than a checklist.",
    `Your cognitive instinct: ${sections["Shared reading"]}`,
    `Questions that arise spontaneously in your mind:\n${sections["Decision questions"]}`,
    `Your characteristic limit: ${sections["Boundary and common misreading"]}`,
  ].join("\n");
}

function interpretationSections(content: string): Record<string, string> {
  const wanted = new Set(["Shared reading", "Decision questions", "Boundary and common misreading"]);
  const lines = content.split(/\r?\n/);
  const sections: Record<string, string[]> = {};
  let current: string | undefined;
  for (const line of lines) {
    const heading = /^## (.+)$/.exec(line)?.[1];
    if (heading) {
      current = wanted.has(heading) ? heading : undefined;
      if (current) sections[current] = [];
      continue;
    }
    if (current) sections[current]!.push(line);
  }
  const normalized = Object.fromEntries([...wanted].map((heading) => [
    heading,
    (sections[heading] ?? []).join("\n").trim(),
  ]));
  const missing = [...wanted].filter((heading) => !normalized[heading]);
  if (missing.length) throw new Error(`interpretation lacks phenotype sections: ${missing.join(", ")}`);
  return normalized;
}
