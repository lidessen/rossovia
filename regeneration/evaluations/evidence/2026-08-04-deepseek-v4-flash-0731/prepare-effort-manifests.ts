import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = dirname(import.meta.path);
const base = JSON.parse(await readFile(join(root, "model-evaluation.json"), "utf8"));
const cases = base.cases.filter(({ id }: { id: string }) => (
  id === "runtime-reliability-review" || id === "delegation-workbench-boundary"
));

for (const [left, right] of [["low", "high"], ["high", "max"]] as const) {
  const selectedCases = right === "max"
    ? cases.filter(({ id }: { id: string }) => id === "delegation-workbench-boundary")
    : cases;
  const manifest = {
    ...base,
    id: `deepseek-v4-flash-effort-${left}-vs-${right}`,
    evidenceRole: "development",
    outputDir: "effort-results",
    profiles: [left, right].map((effort) => ({
      id: `deepseek-direct-v4-flash-thinking-${effort}-ai-sdk-v7-auto-tool-settlement-v2`,
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-flash",
      }],
      contextPolicy: "frozen-public-repository-fixture-v1",
      toolSurface: "read-only-files-plus-thinking-compatible-auto-schema-tool-v2",
      declaredInferencePolicy: `thinking=enabled; effort=${effort}; temperature=ignored-by-provider; forced-tool-choice=lowered-to-auto; transport=ai-sdk-v7-generate; structured-output=verified-tool-settlement; max-output-tokens=16000`,
      adapterPolicy: {
        deepseek: { thinking: "enabled", reasoningEffort: effort },
      },
      priceRevision: "deepseek-public-api-2026-07-31",
    })),
    repetitions: 2,
    cases: selectedCases,
  };
  await writeFile(
    join(root, `effort-${left}-vs-${right}.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}
