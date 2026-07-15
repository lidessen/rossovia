import { expect, test } from "bun:test";
import { compilePhenotypePrompts, PopulationSpecSchema, samplePopulation } from "../src/research/population-shape";

test("population sampler replays one seed while preserving exact mixture shares and shape differences", () => {
  const first = samplePopulation(spec("stable-seed"));
  const replay = samplePopulation(spec("stable-seed"));
  const alternate = samplePopulation(spec("alternate-seed"));

  expect(first).toEqual(replay);
  expect(first.shapes).not.toEqual(alternate.shapes);
  expect(first.audit.componentCounts).toEqual({ material: 12, associative: 4 });
  expect(first.audit.distinctShapeKeys).toBeGreaterThan(8);
  expect(first.shapes.every((shape) => shape.principles.length >= 1 && shape.principles.length <= 2)).toBe(true);
  expect(first.shapes.filter((shape) => shape.componentId === "material").every(
    (shape) => shape.principles.every((principle) => ["P02", "P05", "P15"].includes(principle.pid)),
  )).toBe(true);
  expect(first.shapes.filter((shape) => shape.componentId === "associative").every(
    (shape) => shape.principles.every((principle) => ["P06", "P07", "P16"].includes(principle.pid)),
  )).toBe(true);
  expect(first.audit.traits["concrete-abstract"]!.min).toBeLessThan(
    first.audit.traits["concrete-abstract"]!.max,
  );
});

test("selected principles become a coherent partial cognitive phenotype", () => {
  const sampled = samplePopulation(spec("prompt-seed"));
  const compiled = compilePhenotypePrompts(sampled, {
    P02: "Begin from observed material conditions and mark inference separately.",
    P05: "Keep the conditions that make this case specific in view.",
    P15: "Prefer the smallest move that preserves hard constraints.",
    P06: "Distinguish the presenting image from its underlying relation.",
    P07: "Return from abstraction to a richer concrete whole.",
    P16: "Choose a form that lets the actual subject act.",
  });

  expect(compiled.shapes[0]!.instructions).toContain("cognitive temperament");
  expect(compiled.shapes[0]!.instructions).toContain("dominant disposition");
  expect(compiled.shapes[0]!.instructions).toContain("You are strongly drawn");
  expect(compiled.shapes[0]!.instructions).not.toContain("salience 0.");
  expect(() => compilePhenotypePrompts(sampled, { P02: "only one" })).toThrow(
    "missing principle phenotype prompts",
  );
});

test("population sampler rejects a component that cannot realize its declared distribution", () => {
  const invalid: Record<string, any> = spec("invalid");
  invalid.components[0]!.facets.domain = { unknown: 1 };

  expect(() => PopulationSpecSchema.parse(invalid)).toThrow("unknown option");
});

function spec(seed: string) {
  return {
    version: "work-cell.population.v1" as const,
    id: "shape-distribution-test",
    size: 16,
    seed,
    traits: [
      { id: "concrete-abstract", low: "concrete observation", high: "abstract relation" },
      { id: "analytic-associative", low: "analytic decomposition", high: "free association" },
    ],
    facets: [{
      id: "domain",
      options: [
        { id: "workshop", prompt: "Attend through workshop practice." },
        { id: "ecology", prompt: "Attend through ecological succession." },
        { id: "music", prompt: "Attend through rhythm and resonance." },
      ],
    }],
    components: [
      {
        id: "material",
        share: 3,
        instructions: "Begin from material practice.",
        principleAlpha: { P02: 4, P05: 3, P15: 1 },
        activePrinciples: { min: 1, max: 2 },
        traits: {
          "concrete-abstract": { mean: 0.2, spread: 0.15 },
          "analytic-associative": { mean: 0.3, spread: 0.2 },
        },
        facets: { domain: { workshop: 5, ecology: 1, music: 1 } },
        temperature: { mean: 0.8, spread: 0.1 },
      },
      {
        id: "associative",
        share: 1,
        instructions: "Permit distant relations.",
        principleAlpha: { P06: 2, P07: 3, P16: 4 },
        activePrinciples: { min: 1, max: 2 },
        traits: {
          "concrete-abstract": { mean: 0.8, spread: 0.15 },
          "analytic-associative": { mean: 0.85, spread: 0.1 },
        },
        facets: { domain: { workshop: 1, ecology: 3, music: 4 } },
        temperature: { mean: 1.3, spread: 0.15 },
      },
    ],
  };
}
