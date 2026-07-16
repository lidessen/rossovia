import { createDeepSeek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";

export const DEEPSEEK_PROVIDER_ID = "deepseek";

const deepSeekProviderOptions = {
  deepseek: {
    thinking: { type: "disabled" },
  } satisfies DeepSeekLanguageModelOptions,
};

export const deepSeekFlashPricing = {
  inputPerMillionUsd: 0.14,
  cachedInputPerMillionUsd: 0.0028,
  outputPerMillionUsd: 0.28,
  source: "https://api-docs.deepseek.com/quick_start/pricing",
  revision: "2026-07-16",
};

export function createDeepSeekModel(options: {
  apiKey: string;
  model: string;
  baseURL?: string;
}): LanguageModelV4 {
  const provider = createDeepSeek({
    apiKey: options.apiKey,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
  });
  return wrapLanguageModel({
    model: provider(options.model),
    middleware: defaultSettingsMiddleware({
      settings: { providerOptions: deepSeekProviderOptions },
    }),
  });
}
