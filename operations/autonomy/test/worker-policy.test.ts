import { expect, test } from "bun:test";
import { currentWorkerCards } from "../src/worker-policy";

test("current worker cards expose Kimi vision without advertising it for DeepSeek", () => {
  const cards = currentWorkerCards({
    DEEPSEEK_API_KEY: "configured",
    KIMI_CODE_API_KEY: "configured",
  } as NodeJS.ProcessEnv);

  const deepseek = cards.find((card) => card.id === "deepseek-flash");
  const kimi = cards.find((card) => card.id === "kimi-coding");
  expect(deepseek?.labels).not.toContain("vision");
  expect(kimi?.labels).toContain("vision");
  expect(kimi?.description).toContain("image input");
  expect(kimi?.description).toContain("Recommended");
});
