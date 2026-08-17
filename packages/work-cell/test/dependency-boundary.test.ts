import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const srcRoot = resolve(import.meta.dir, "../src");

/**
 * The C1-C3 mechanical core: neutral CellInput/CellDriver/HostWorkspace and
 * the mechanical final contracts. None of these modules may import the AI
 * SDK, an @ai-sdk provider, the Pi harness/packages, or a concrete provider
 * adapter; concrete implementations live behind the declared
 * `integrations/ai-sdk` Integration path.
 *
 * `swarm.ts` and `orchestration.ts` are deliberately NOT listed here: they
 * are untouched pre-existing adjacent/legacy mechanisms pending a later Goal
 * review, not declared C1-C3 core architecture.
 */
const CORE_MODULES = [
  "contracts.ts",
  "driver.ts",
  "host-port.ts",
  "output-schema.ts",
  "run-cell.ts",
] as const;

const BANNED_IMPORT_PREFIXES = [
  "\"ai\"",
  "\"@ai-sdk/",
  "\"@earendil-works/pi-coding-agent\"",
  "\"just-bash\"",
];

/** Former core root paths of the concrete AI SDK/Pi/provider implementation. */
const REMOVED_ROOT_MODULES = [
  "ai-sdk-driver.ts",
  "pi-harness-driver.ts",
  "ai-sdk-usage.ts",
  "structured-settlement.ts",
  "model-route.ts",
  "validation-model.ts",
  "provider-profile.ts",
  "host-tools.ts",
  "task-tools.ts",
  "workspace-edit.ts",
  "driver-common.ts",
  "providers/deepseek.ts",
  "providers/kimi-coding.ts",
  "providers/opencode-go.ts",
] as const;

test("C1-C3 core modules carry no concrete AI SDK/Pi/provider dependency", async () => {
  for (const module of CORE_MODULES) {
    const source = await readFile(resolve(srcRoot, module), "utf8");
    for (const banned of BANNED_IMPORT_PREFIXES) {
      if (source.includes(`from ${banned}`)) {
        throw new Error(`${module} must not import ${banned}`);
      }
    }
  }
});

test("the former core root paths are physically absent, not tombstones or compatibility shims", () => {
  for (const removed of REMOVED_ROOT_MODULES) {
    expect(
      existsSync(resolve(srcRoot, removed)),
      `${removed} must not exist at the former core root path`,
    ).toBe(false);
  }
});

test("the package export surface declares the Integration path instead of the removed root paths", async () => {
  const index = await readFile(resolve(srcRoot, "index.ts"), "utf8");
  expect(index).toContain("export * from \"./integrations/ai-sdk\"");
  for (const removed of [
    "export * from \"./ai-sdk-driver\"",
    "export * from \"./pi-harness-driver\"",
    "export * from \"./host-tools\"",
    "export * from \"./task-tools\"",
    "export * from \"./workspace-edit\"",
    "export * from \"./provider-profile\"",
  ]) {
    expect(index).not.toContain(removed);
  }
});

test("the Integration island owns every concrete driver, provider route, host tool, and settlement module", async () => {
  const islandRoot = resolve(srcRoot, "integrations/ai-sdk");
  const islandModules = [
    "index.ts",
    "ai-sdk-driver.ts",
    "pi-harness-driver.ts",
    "ai-sdk-usage.ts",
    "structured-settlement.ts",
    "model-route.ts",
    "validation-model.ts",
    "provider-profile.ts",
    "task-tool-set.ts",
    "host-tools.ts",
    "task-tools.ts",
    "workspace-edit.ts",
    "driver-common.ts",
    "output-schema.ts",
    "providers/deepseek.ts",
    "providers/kimi-coding.ts",
    "providers/opencode-go.ts",
  ] as const;
  for (const module of islandModules) {
    const source = await readFile(resolve(islandRoot, module), "utf8");
    expect(source.trim().length).toBeGreaterThan(0);
  }
});

test("TaskToolSet lives at its minimal owner inside the Integration island", async () => {
  const owner = await readFile(resolve(srcRoot, "integrations/ai-sdk/task-tool-set.ts"), "utf8");
  expect(owner).toContain("TaskToolSetSchema");
  // The moved driver no longer defines it; the island-wide index declares it.
  const driver = await readFile(resolve(srcRoot, "integrations/ai-sdk/ai-sdk-driver.ts"), "utf8");
  expect(driver).not.toContain("export const TaskToolSetSchema");
  const islandIndex = await readFile(resolve(srcRoot, "integrations/ai-sdk/index.ts"), "utf8");
  expect(islandIndex).toContain("export * from \"./task-tool-set\"");
});
