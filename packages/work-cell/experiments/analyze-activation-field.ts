import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface Activation {
  id: string;
  componentId?: string;
  impulse: string;
  relation: string;
}

interface Shape {
  components: Array<{ id: string; weight: number }>;
  principles: Array<{ pid: string; weight: number }>;
  traits: Array<{ id: string; value: number }>;
  facets: Array<{ id: string; optionId: string }>;
}

interface Node {
  id: string;
  content: string;
  rootActivationIds: string[];
  shape?: Shape;
}

interface Coalition {
  id: string;
  parentIds: string[];
  newRelation: string;
  shape?: Shape;
}

const paths = process.argv.slice(2);
if (paths.length === 0) throw new Error("usage: bun experiments/analyze-activation-field.ts <record.json> [...]");

for (const path of paths) {
  const stored = JSON.parse(await readFile(resolve(path), "utf8"));
  const record = stored.record;
  const activations: Activation[] = record.activations;
  const activationPairs = pairs(activations);
  const within = activationPairs.filter(([left, right]) => left.componentId === right.componentId);
  const between = activationPairs.filter(([left, right]) => left.componentId !== right.componentId);
  const activationText = (activation: Activation) => `${activation.impulse}\n${activation.relation}`;
  let previous = new Map<string, Node>(activations.map((activation) => [activation.id, {
    id: activation.id,
    content: activationText(activation),
    rootActivationIds: [activation.id],
  }]));
  const layerAudit = (record.layers as Coalition[][]).map((layer: Coalition[], index: number) => {
    const novelties: number[] = [];
    const next = new Map<string, Node>();
    for (const coalition of layer) {
      const parents = coalition.parentIds.flatMap((id) => previous.get(id) ? [previous.get(id)!] : []);
      const closestParent = Math.max(0, ...parents.map((parent) => similarity(coalition.newRelation, parent.content)));
      novelties.push(1 - closestParent);
      next.set(coalition.id, {
        id: coalition.id,
        content: coalition.newRelation,
        rootActivationIds: [...new Set(parents.flatMap((parent) => parent.rootActivationIds))],
        ...(coalition.shape ? { shape: coalition.shape } : {}),
      });
    }
    previous = next;
    return {
      layer: index + 1,
      nodes: layer.length,
      meanLexicalNoveltyFromClosestParent: mean(novelties),
      distinctShapeKeys: new Set(layer.flatMap((node) => node.shape ? [shapeKey(node.shape)] : [])).size,
    };
  });
  const finalRoots = new Set<string>(record.workingSet.flatMap((node: Node) => node.rootActivationIds));
  const componentTotals = countBy(activations, (activation) => activation.componentId ?? "unassigned");
  const represented = countBy(
    activations.filter((activation) => finalRoots.has(activation.id)),
    (activation) => activation.componentId ?? "unassigned",
  );
  const componentRootCoverage = Object.fromEntries(Object.entries(componentTotals).map(([id, total]) => [id, {
    represented: represented[id] ?? 0,
    total,
    ratio: round((represented[id] ?? 0) / total),
  }]));
  const normalizedActivations = new Set(activations.map((activation) => normalize(activationText(activation))));
  console.log(JSON.stringify({
    path: resolve(path),
    propagateShapes: record.input.propagateShapes,
    phenotypePrompt: record.input.receptors[0]?.instructions?.includes("cognitive temperament") ?? false,
    activations: activations.length,
    exactDistinctActivations: normalizedActivations.size,
    meanActivationSimilarity: mean(activationPairs.map(([left, right]) => similarity(activationText(left), activationText(right)))),
    meanWithinComponentSimilarity: mean(within.map(([left, right]) => similarity(activationText(left), activationText(right)))),
    meanBetweenComponentSimilarity: mean(between.map(([left, right]) => similarity(activationText(left), activationText(right)))),
    componentSeparation: round(
      mean(within.map(([left, right]) => similarity(activationText(left), activationText(right))))
      - mean(between.map(([left, right]) => similarity(activationText(left), activationText(right)))),
    ),
    layerAudit,
    finalRootCoverage: {
      represented: finalRoots.size,
      total: activations.length,
      ratio: round(finalRoots.size / activations.length),
      byComponent: componentRootCoverage,
    },
  }, null, 2));
}

function pairs<T>(values: T[]): Array<[T, T]> {
  const output: Array<[T, T]> = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) output.push([values[left]!, values[right]!]);
  }
  return output;
}

function similarity(left: string, right: string): number {
  const leftSet = grams(left);
  const rightSet = grams(right);
  const intersection = [...leftSet].filter((gram) => rightSet.has(gram)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function grams(value: string): Set<string> {
  const text = normalize(value);
  if (text.length <= 3) return new Set([text]);
  return new Set(Array.from({ length: text.length - 2 }, (_, index) => text.slice(index, index + 3)));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function shapeKey(shape: Shape): string {
  return JSON.stringify({
    components: shape.components.map((entry) => [entry.id, Math.round(entry.weight * 10)]),
    principles: shape.principles.map((entry) => [entry.pid, Math.round(entry.weight * 10)]),
    traits: shape.traits.map((trait) => [trait.id, Math.round(trait.value * 10)]),
    facets: shape.facets.map((facet) => [facet.id, facet.optionId]),
  });
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const id = key(value);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
