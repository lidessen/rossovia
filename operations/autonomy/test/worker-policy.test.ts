import { expect, test } from "bun:test";
import { PI_HARNESS_DRIVER_ADAPTER } from "../../../packages/work-cell/src/integrations/ai-sdk";
import {
  createCurrentWorkerCatalog,
  currentWorkerCards,
  deepSeekDriverOptions,
  deepSeekInferencePolicy,
} from "../src/worker-policy";

test("current worker cards expose capability and execution defaults from one policy", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv);

  const deepseek = cards.find((card) => card.id === "deepseek-flash");
  const deepseekPro = cards.find((card) => card.id === "deepseek-pro");
  const kimi = cards.find((card) => card.id === "kimi-coding");
  expect(deepseek?.labels).not.toContain("vision");
  expect(deepseek?.executionProfile.reasoningEffort).toBe("max");
  expect(deepseekPro).toMatchObject({
    labels: expect.arrayContaining(["architecture"]),
    executionProfile: {
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
    },
  });
  expect(kimi?.labels).toContain("vision");
  expect(kimi?.description).toContain("image input");
  expect(kimi?.description).toContain("Recommended");
  expect(kimi).toMatchObject({
    executionProfile: {
      provider: "opencode-go",
      model: "kimi-k2.7-code",
    },
    availability: { status: "available" },
  });
});

test("Kimi availability follows the OpenCode carrier credential", () => {
  const legacyCredentialOnly = currentWorkerCards({
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv).find((card) => card.id === "kimi-coding");
  expect(legacyCredentialOnly?.availability).toEqual({
    status: "unavailable",
    reason: "OPENCODE_API_KEY is not configured",
  });

  const openCodeCredential = currentWorkerCards({
    OPENCODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv).find((card) => card.id === "kimi-coding");
  expect(openCodeCredential?.availability).toEqual({ status: "available" });
});

test("deepseek card reasoning effort matches the inference policy used to construct its catalog driver", () => {
  const environment = {
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv;
  const cards = currentWorkerCards(environment);
  const deepseekFlash = cards.find((card) => card.id === "deepseek-flash");
  const deepseekPro = cards.find((card) => card.id === "deepseek-pro");
  const kimi = cards.find((card) => card.id === "kimi-coding");

  expect(deepseekFlash?.executionProfile.reasoningEffort).toBe("max");
  expect(deepSeekInferencePolicy(deepseekFlash!)).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(deepSeekInferencePolicy(deepseekPro!)).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(deepSeekInferencePolicy(kimi!)).toBeUndefined();

  const flashOptions = deepSeekDriverOptions(deepseekFlash!, environment);
  expect(flashOptions.deepSeekInferencePolicy).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(flashOptions.route).toEqual([{
    provider: "deepseek",
    credential: { source: "env", name: "DEEPSEEK_API_KEY" },
    model: "deepseek-v4-flash",
  }]);
  const proOptions = deepSeekDriverOptions(deepseekPro!, environment);
  expect(proOptions.deepSeekInferencePolicy).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(proOptions.route).toEqual([{
    provider: "deepseek",
    credential: { source: "env", name: "DEEPSEEK_API_KEY" },
    model: "deepseek-v4-pro",
  }]);

  const catalog = createCurrentWorkerCatalog(environment);
  for (const card of cards) {
    const driver = catalog.createDriver({
      id: `test-${card.id}`,
      workerId: card.id,
      executionProfile: card.executionProfile,
      intent: "Prove card declaration matches constructed driver options.",
      workspace: {
        root: "/tmp",
        readPaths: [],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
      instructions: ["Return the bounded result."],
      capabilities: ["coding"],
      context: [],
      capabilitiesRequired: ["coding"],
      acceptance: ["The selected worker executes the Cell."],
      budget: { maxSteps: 1, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    });
    expect(driver.descriptor).toMatchObject({
      adapter: card.executionProfile.provider === "deepseek"
        ? PI_HARNESS_DRIVER_ADAPTER
        : "ai-sdk-v7",
      provider: card.executionProfile.provider,
      model: card.executionProfile.model,
    });
  }
});
