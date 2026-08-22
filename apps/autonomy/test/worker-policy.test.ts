import { expect, test } from "bun:test";
import { PI_HARNESS_DRIVER_ADAPTER } from "../../../packages/work-cell/src/integrations/ai-sdk";
import {
  createCurrentWorkerCatalog,
  currentWorkerCards,
  DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE,
  deepSeekDriverOptions,
  deepSeekInferencePolicy,
} from "../src/worker-policy";

test("current worker cards expose capability and execution defaults from one policy", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv);

  const deepseek = cards.find((card) => card.id === "deepseek-flash");
  const deepseekPro = cards.find((card) => card.id === "deepseek-pro");
  const deepseekVisionExp = cards.find((card) => card.id === "deepseek-flash-vision-exp");
  const kimi = cards.find((card) => card.id === "kimi-coding");
  const kimiCodingPlan = cards.find((card) => card.id === "kimi-coding-plan");
  expect(deepseek?.labels).not.toContain("vision");
  expect(deepseek?.executionProfile.reasoningEffort).toBe("max");
  expect(deepseekVisionExp).toMatchObject({
    labels: expect.arrayContaining(["vision"]),
    executionProfile: {
      provider: "deepseek",
      model: "deepseek-v4-flash-vision-exp",
      reasoningEffort: "max",
    },
    availability: { status: "available" },
  });
  expect(deepseekVisionExp?.description).toContain("experimental official API model");
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

  expect(kimiCodingPlan).toBeDefined();
  expect(kimiCodingPlan?.labels).not.toContain("vision");
  expect(kimiCodingPlan?.description).toContain("Kimi Coding Plan");
  expect(kimiCodingPlan?.description).not.toContain("image input");
  expect(kimiCodingPlan).toMatchObject({
    executionProfile: {
      provider: "kimi-coding",
      model: "kimi-for-coding",
    },
    availability: { status: "available" },
  });
});

test("legacy kimi-coding availability follows the OpenCode carrier credential", () => {
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

test("kimi-coding-plan availability follows the Kimi Code credential", () => {
  const openCodeCredentialOnly = currentWorkerCards({
    OPENCODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv).find((card) => card.id === "kimi-coding-plan");
  expect(openCodeCredentialOnly?.availability).toEqual({
    status: "unavailable",
    reason: "KIMI_CODE_API_KEY is not configured",
  });

  const kimiCodeCredential = currentWorkerCards({
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv).find((card) => card.id === "kimi-coding-plan");
  expect(kimiCodeCredential?.availability).toEqual({ status: "available" });
});

test("deepseek card reasoning effort matches the inference policy used to construct its catalog driver", () => {
  const environment = {
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv;
  const cards = currentWorkerCards(environment);
  const deepseekFlash = cards.find((card) => card.id === "deepseek-flash");
  const deepseekPro = cards.find((card) => card.id === "deepseek-pro");
  const deepseekVisionExp = cards.find((card) => card.id === "deepseek-flash-vision-exp");
  const kimi = cards.find((card) => card.id === "kimi-coding");
  const kimiCodingPlan = cards.find((card) => card.id === "kimi-coding-plan");

  expect(deepseekFlash?.executionProfile.reasoningEffort).toBe("max");
  expect(deepSeekInferencePolicy(deepseekFlash!)).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(deepSeekInferencePolicy(deepseekPro!)).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(deepSeekInferencePolicy(deepseekVisionExp!)).toEqual({
    thinking: "enabled",
    reasoningEffort: "max",
  });
  expect(deepSeekInferencePolicy(kimi!)).toBeUndefined();
  expect(deepSeekInferencePolicy(kimiCodingPlan!)).toBeUndefined();

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
  const visionOptions = deepSeekDriverOptions(deepseekVisionExp!, environment);
  expect(visionOptions.route).toEqual([{
    provider: "deepseek",
    credential: { source: "env", name: "DEEPSEEK_API_KEY" },
    model: "deepseek-v4-flash-vision-exp",
  }]);

  const catalog = createCurrentWorkerCatalog(environment);
  const kimiCodingPlanDriver = catalog.createDriver({
    id: "test-kimi-coding-plan",
    workerId: "kimi-coding-plan",
    executionProfile: kimiCodingPlan!.executionProfile,
    intent: "Prove Kimi Coding Plan driver maps to the Kimi provider adapter.",
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
  expect(kimiCodingPlanDriver.descriptor).toMatchObject({
    adapter: "ai-sdk-v7",
    provider: "kimi-coding",
    model: "kimi-for-coding",
  });

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

test("the worker list names deepseek-flash/max as the explicit default for ordinary engineering work", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv);

  expect(cards[0]?.id).toBe("deepseek-flash");
  const deepseekFlash = cards[0]!;
  expect(deepseekFlash.executionProfile).toMatchObject({
    provider: "deepseek",
    model: "deepseek-v4-flash",
    reasoningEffort: "max",
  });
  expect(deepseekFlash.description).toContain("explicit default worker for ordinary engineering work");
  expect(deepseekFlash.description).toContain("reasoning=max");
  expect(deepseekFlash.labels).not.toContain("vision");

  // The exported host-policy guidance (injected into catalog-enabled delegate
  // loops) names the same Flash/max default from the same single source.
  expect(DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE).toContain("deepseek-flash");
  expect(DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE).toContain("reasoning=max");
  expect(DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE).toContain("ordinary engineering work");
  expect(DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE).toContain("architecture/high-difficulty");
  expect(DEEPSEEK_FLASH_WORKER_SELECTION_GUIDANCE).toContain("visual input");
});

test("the worker list keeps the explicit high-difficulty and vision exception boundaries", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    OPENCODE_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv);

  const deepseekPro = cards.find((card) => card.id === "deepseek-pro")!;
  expect(deepseekPro.labels).toContain("architecture");
  expect(deepseekPro.description).toContain("high-difficulty exception");
  expect(deepseekPro.description).toContain("selected only when");
  expect(deepseekPro.description).toContain("deepseek-flash default");

  const kimiCodingPlan = cards.find((card) => card.id === "kimi-coding-plan")!;
  expect(kimiCodingPlan.description).toContain("high-difficulty exception");
  expect(kimiCodingPlan.description).toContain("selected only when");
  expect(kimiCodingPlan.description).not.toContain("image input");

  const flashVisionExp = cards.find((card) => card.id === "deepseek-flash-vision-exp")!;
  expect(flashVisionExp.labels).toContain("vision");
  expect(flashVisionExp.description).toContain("vision exception");
  expect(flashVisionExp.description).toContain("selected only when");

  const kimi = cards.find((card) => card.id === "kimi-coding")!;
  expect(kimi.labels).toContain("vision");
  expect(kimi.description).toContain("image input");
  expect(kimi.description).toContain("selected only when");

  const deepseekFlash = cards.find((card) => card.id === "deepseek-flash")!;
  expect(deepseekFlash.labels).not.toContain("vision");
  expect(deepseekFlash.description).not.toContain("vision exception");
});

test("when the DeepSeek credential is absent the real candidate selection keeps only available alternatives", () => {
  // No DEEPSEEK_API_KEY: every DeepSeek card is unavailable, so the catalog
  // exposes exactly the real available alternatives as selectable candidates.
  const environment = {
    OPENCODE_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv;
  const cards = currentWorkerCards(environment);

  const deepseekFlash = cards.find((card) => card.id === "deepseek-flash")!;
  const deepseekPro = cards.find((card) => card.id === "deepseek-pro")!;
  const flashVisionExp = cards.find((card) => card.id === "deepseek-flash-vision-exp")!;
  expect(deepseekFlash.availability).toEqual({
    status: "unavailable",
    reason: "DEEPSEEK_API_KEY is not configured",
  });
  expect(deepseekPro.availability.status).toBe("unavailable");
  expect(flashVisionExp.availability.status).toBe("unavailable");

  const catalog = createCurrentWorkerCatalog(environment);
  expect(catalog.list([]).map((card) => card.id)).toEqual(["kimi-coding", "kimi-coding-plan"]);
  expect(catalog.list(["vision"]).map((card) => card.id)).toEqual(["kimi-coding"]);
  expect(() => catalog.card("deepseek-flash")).toThrow("unavailable");
});
