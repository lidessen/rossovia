/** Research carrier for controlled Work Cell population differentiation. */
import { createHash } from "node:crypto";
import { z } from "zod";

const PidSchema = z.string().regex(/^P\d{2,}$/);

const TraitDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  low: z.string().min(1),
  high: z.string().min(1),
});

const FacetDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  options: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    prompt: z.string().min(1),
  })).min(2),
});

const DistributionPointSchema = z.object({
  mean: z.number().min(0).max(1),
  spread: z.number().min(0).max(0.5),
});

const ActivePrinciplesSchema = z.object({
  min: z.number().int().min(1).max(4),
  max: z.number().int().min(1).max(4),
}).refine((value) => value.min <= value.max, "active principle min must not exceed max");

const PopulationComponentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  share: z.number().positive(),
  instructions: z.string().min(1),
  principleAlpha: z.record(PidSchema, z.number().positive()),
  activePrinciples: ActivePrinciplesSchema,
  traits: z.record(z.string(), DistributionPointSchema),
  facets: z.record(z.string(), z.record(z.string(), z.number().nonnegative())),
  temperature: z.object({
    mean: z.number().min(0).max(2),
    spread: z.number().min(0).max(0.75),
  }),
});

export const PopulationSpecSchema = z.object({
  version: z.literal("work-cell.population.v1"),
  id: z.string().min(1),
  size: z.number().int().min(2).max(512),
  seed: z.string().min(1),
  traits: z.array(TraitDefinitionSchema).default([]),
  facets: z.array(FacetDefinitionSchema).default([]),
  components: z.array(PopulationComponentSchema).min(1),
}).superRefine((value, context) => {
  uniqueIds(value.traits, "trait", context);
  uniqueIds(value.facets, "facet", context);
  uniqueIds(value.components, "component", context);
  const traitIds = new Set(value.traits.map((trait) => trait.id));
  const facets = new Map(value.facets.map((facet) => [facet.id, new Set(facet.options.map((option) => option.id))]));
  for (const [componentIndex, component] of value.components.entries()) {
    const principles = Object.keys(component.principleAlpha);
    if (principles.length < component.activePrinciples.max) {
      context.addIssue({
        code: "custom",
        path: ["components", componentIndex, "activePrinciples"],
        message: "active principle max exceeds the component's eligible principles",
      });
    }
    const componentTraits = Object.keys(component.traits);
    if (!sameMembers(componentTraits, traitIds)) {
      context.addIssue({
        code: "custom",
        path: ["components", componentIndex, "traits"],
        message: "each component must define every declared trait exactly once",
      });
    }
    const componentFacets = Object.keys(component.facets);
    if (!sameMembers(componentFacets, new Set(facets.keys()))) {
      context.addIssue({
        code: "custom",
        path: ["components", componentIndex, "facets"],
        message: "each component must define every declared facet exactly once",
      });
    }
    for (const [facetId, weights] of Object.entries(component.facets)) {
      const options = facets.get(facetId);
      const weightedOptions = Object.keys(weights);
      if (!options || weightedOptions.some((option) => !options.has(option))) {
        context.addIssue({
          code: "custom",
          path: ["components", componentIndex, "facets", facetId],
          message: "facet distribution references an unknown option",
        });
      }
      if (Object.values(weights).reduce((total, weight) => total + weight, 0) <= 0) {
        context.addIssue({
          code: "custom",
          path: ["components", componentIndex, "facets", facetId],
          message: "facet distribution must assign positive total weight",
        });
      }
    }
  }
});

export type PopulationSpec = z.infer<typeof PopulationSpecSchema>;

export interface WorkCellShape {
  id: string;
  componentId: string;
  seed: number;
  principles: Array<{ pid: string; weight: number; prompt?: string }>;
  traits: Array<{ id: string; value: number; low: string; high: string }>;
  facets: Array<{ id: string; optionId: string; prompt: string }>;
  temperature: number;
  componentInstructions: string;
  instructions: string;
}

export interface PopulationAudit {
  componentCounts: Record<string, number>;
  principleCounts: Record<string, number>;
  facetCounts: Record<string, Record<string, number>>;
  traits: Record<string, { min: number; max: number; mean: number }>;
  distinctShapeKeys: number;
}

export interface SampledPopulation {
  spec: PopulationSpec;
  shapes: WorkCellShape[];
  audit: PopulationAudit;
}

export function samplePopulation(unparsed: unknown): SampledPopulation {
  const spec = PopulationSpecSchema.parse(unparsed);
  const random = mulberry32(seedNumber(spec.seed));
  const componentCounts = allocateCounts(spec.size, spec.components.map((component) => ({
    id: component.id,
    weight: component.share,
  })));
  const assignments = spec.components.flatMap((component) =>
    Array.from({ length: componentCounts[component.id] ?? 0 }, () => component));
  shuffle(assignments, random);
  const traits = new Map(spec.traits.map((trait) => [trait.id, trait]));
  const facets = new Map(spec.facets.map((facet) => [facet.id, facet]));
  const shapes = assignments.map((component, index) => {
    const localSeed = uint32(random);
    const local = mulberry32(localSeed);
    const principleWeights = Object.entries(component.principleAlpha).map(([pid, alpha]) => ({
      pid,
      weight: gamma(alpha, local),
    }));
    const activeCount = integer(component.activePrinciples.min, component.activePrinciples.max, local);
    const principles = weightedWithoutReplacement(principleWeights, activeCount, local)
      .map((principle) => ({ pid: principle.pid, weight: principle.weight }))
      .sort((left, right) => right.weight - left.weight || left.pid.localeCompare(right.pid));
    const sampledTraits = Object.entries(component.traits).map(([id, distribution]) => {
      const definition = traits.get(id)!;
      return {
        id,
        value: round(clamp(distribution.mean + normal(local) * distribution.spread, 0, 1)),
        low: definition.low,
        high: definition.high,
      };
    }).sort((left, right) => left.id.localeCompare(right.id));
    const sampledFacets = Object.entries(component.facets).map(([id, weights]) => {
      const definition = facets.get(id)!;
      const optionId = weightedChoice(weights, local);
      const option = definition.options.find((candidate) => candidate.id === optionId)!;
      return { id, optionId, prompt: option.prompt };
    }).sort((left, right) => left.id.localeCompare(right.id));
    const temperature = round(clamp(component.temperature.mean + normal(local) * component.temperature.spread, 0, 2));
    const id = `shape-${String(index + 1).padStart(4, "0")}`;
    const shape: WorkCellShape = {
      id,
      componentId: component.id,
      seed: localSeed,
      principles,
      traits: sampledTraits,
      facets: sampledFacets,
      temperature,
      componentInstructions: component.instructions,
      instructions: "",
    };
    shape.instructions = renderShapeInstructions(shape, component.instructions);
    return shape;
  });
  return { spec, shapes, audit: auditPopulation(shapes) };
}

export function compilePhenotypePrompts(
  population: SampledPopulation,
  principlePrompts: Record<string, string>,
): SampledPopulation {
  const selected = new Set(population.shapes.flatMap((shape) => shape.principles.map((principle) => principle.pid)));
  const missing = [...selected].filter((pid) => !principlePrompts[pid]?.trim()).sort();
  if (missing.length) throw new Error(`missing principle phenotype prompts: ${missing.join(", ")}`);
  return {
    ...population,
    shapes: population.shapes.map((shape) => {
      const compiled = {
        ...shape,
        principles: shape.principles.map((principle) => ({
          ...principle,
          prompt: principlePrompts[principle.pid]!,
        })),
      };
      return {
        ...compiled,
        instructions: renderShapeInstructions(compiled, shape.componentInstructions, principlePrompts),
      };
    }),
  };
}

export function renderShapeInstructions(
  shape: WorkCellShape,
  componentInstructions: string,
  principlePrompts: Record<string, string> = {},
): string {
  const expandedPrinciples = shape.principles.flatMap((principle, index) => {
    const prompt = principlePrompts[principle.pid]?.trim();
    const place = index === 0 ? "dominant disposition" : index === 1 ? "secondary disposition" : "minor countercurrent";
    return prompt ? [`### ${place}\n${prompt}`] : [];
  });
  return [
    "Think as this local cognitive temperament. It is a partial personality of thought, not a job title or a complete worldview.",
    `Center of gravity: ${componentInstructions}`,
    ...(expandedPrinciples.length ? ["Characteristic ways of thinking:\n" + expandedPrinciples.join("\n\n")] : []),
    `Temperament: ${shape.traits.map(renderTraitDisposition).join(" ") || "No continuous disposition is selected."}`,
    `Imaginative habitat: ${shape.facets.map((facet) => facet.prompt).join(" ") || "No perceptual domain is selected."}`,
    "These tendencies include real blind spots. Think from them rather than describing them, and do not compensate for missing principles by becoming a balanced general assistant.",
  ].join("\n");
}

function renderTraitDisposition(trait: WorkCellShape["traits"][number]): string {
  if (trait.value <= 0.18) return `You are strongly drawn toward ${trait.low}; ${trait.high} tends to feel premature or remote.`;
  if (trait.value <= 0.4) return `You usually begin with ${trait.low}, while allowing some movement toward ${trait.high}.`;
  if (trait.value < 0.6) return `You move between ${trait.low} and ${trait.high} without a settled preference.`;
  if (trait.value < 0.82) return `You usually begin with ${trait.high}, while retaining some pull toward ${trait.low}.`;
  return `You are strongly drawn toward ${trait.high}; ${trait.low} tends to feel constraining or insufficient.`;
}

function auditPopulation(shapes: WorkCellShape[]): PopulationAudit {
  const componentCounts: Record<string, number> = {};
  const principleCounts: Record<string, number> = {};
  const facetCounts: Record<string, Record<string, number>> = {};
  const traitValues: Record<string, number[]> = {};
  const keys = new Set<string>();
  for (const shape of shapes) {
    componentCounts[shape.componentId] = (componentCounts[shape.componentId] ?? 0) + 1;
    for (const principle of shape.principles) {
      principleCounts[principle.pid] = (principleCounts[principle.pid] ?? 0) + 1;
    }
    for (const facet of shape.facets) {
      const counts = facetCounts[facet.id] ?? {};
      counts[facet.optionId] = (counts[facet.optionId] ?? 0) + 1;
      facetCounts[facet.id] = counts;
    }
    for (const trait of shape.traits) {
      const values = traitValues[trait.id] ?? [];
      values.push(trait.value);
      traitValues[trait.id] = values;
    }
    keys.add(JSON.stringify({
      component: shape.componentId,
      principles: shape.principles.map((principle) => principle.pid),
      traits: shape.traits.map((trait) => [trait.id, Math.round(trait.value * 10)]),
      facets: shape.facets.map((facet) => [facet.id, facet.optionId]),
    }));
  }
  const traits = Object.fromEntries(Object.entries(traitValues).map(([id, values]) => [id, {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: round(values.reduce((total, value) => total + value, 0) / values.length),
  }]));
  return { componentCounts, principleCounts, facetCounts, traits, distinctShapeKeys: keys.size };
}

function allocateCounts(size: number, entries: Array<{ id: string; weight: number }>): Record<string, number> {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const quotas = entries.map((entry) => {
    const exact = (entry.weight / total) * size;
    return { id: entry.id, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = size - quotas.reduce((sum, entry) => sum + entry.count, 0);
  for (const quota of [...quotas].sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id))) {
    if (remaining <= 0) break;
    quota.count += 1;
    remaining -= 1;
  }
  return Object.fromEntries(quotas.map((quota) => [quota.id, quota.count]));
}

function weightedWithoutReplacement(
  entries: Array<{ pid: string; weight: number }>,
  count: number,
  random: () => number,
): Array<{ pid: string; weight: number }> {
  const normalizedTotal = entries.reduce((total, entry) => total + entry.weight, 0);
  return entries
    .map((entry) => ({
      ...entry,
      weight: entry.weight / normalizedTotal,
      key: -Math.log(Math.max(random(), Number.EPSILON)) / entry.weight,
    }))
    .sort((left, right) => left.key - right.key || left.pid.localeCompare(right.pid))
    .slice(0, count)
    .map(({ key: _key, ...entry }) => entry);
}

function weightedChoice(weights: Record<string, number>, random: () => number): string {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0).sort(([left], [right]) => left.localeCompare(right));
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [id, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return id;
  }
  return entries.at(-1)![0];
}

function gamma(alpha: number, random: () => number): number {
  if (alpha < 1) return gamma(alpha + 1, random) * Math.pow(Math.max(random(), Number.EPSILON), 1 / alpha);
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const x = normal(random);
    const v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = random();
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normal(random: () => number): number {
  const left = Math.max(random(), Number.EPSILON);
  const right = random();
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

function integer(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(values: T[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
}

function uniqueIds(
  values: Array<{ id: string }>,
  label: string,
  context: z.RefinementCtx,
): void {
  if (new Set(values.map((value) => value.id)).size !== values.length) {
    context.addIssue({ code: "custom", message: `${label} IDs must be unique` });
  }
}

function sameMembers(values: string[], expected: Set<string>): boolean {
  return values.length === expected.size && values.every((value) => expected.has(value));
}

function seedNumber(seed: string): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32LE(0);
}

function uint32(random: () => number): number {
  return Math.floor(random() * 0x1_0000_0000) >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
