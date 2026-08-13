import { expect, test } from "bun:test";
import { currentWorkerCards } from "../src/worker-policy";

test("current worker cards expose capability and execution defaults from one policy", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
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
});
