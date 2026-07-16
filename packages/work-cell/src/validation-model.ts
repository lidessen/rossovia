import type { DriverDescriptor } from "./contracts";
import { createRoutedLanguageModel, type ModelRouteTarget } from "./model-route";
import {
  createDeepSeekModel,
  DEEPSEEK_PROVIDER_ID,
  deepSeekFlashPricing,
} from "./providers/deepseek";
import {
  classifyOpenCodeGoFailure,
  createOpenCodeGoModel,
  OPENCODE_GO_PROVIDER_ID,
  openCodeGoFlashPricing,
} from "./providers/opencode-go";

const DEFAULT_MODEL = "deepseek-v4-flash";
const VALIDATION_ROUTE_ID = "validation";

export interface ValidationModelOptions {
  deepSeekApiKey?: string;
  deepSeekBaseURL?: string;
  opencodeApiKey?: string;
  opencodeBaseURL?: string;
  model?: string;
}

export interface ValidationModelSelection {
  model: ReturnType<typeof createRoutedLanguageModel>;
  route: readonly string[];
  pricing: NonNullable<DriverDescriptor["pricing"]>;
}

export function validationProviderName(selection: ValidationModelSelection): string {
  return selection.route.join("->");
}

export function requireValidationCredentials(purpose: string): void {
  if (process.env.OPENCODE_API_KEY || process.env.DEEPSEEK_API_KEY) return;
  throw new Error(`OPENCODE_API_KEY or DEEPSEEK_API_KEY is required for ${purpose}`);
}

export function createValidationModel(
  options: ValidationModelOptions = {},
): ValidationModelSelection {
  const modelId = options.model ?? DEFAULT_MODEL;
  const deepSeekApiKey = options.deepSeekApiKey ?? process.env.DEEPSEEK_API_KEY;
  const opencodeApiKey = options.opencodeApiKey ?? process.env.OPENCODE_API_KEY;
  if (!opencodeApiKey && !deepSeekApiKey) {
    throw new Error("OPENCODE_API_KEY or DEEPSEEK_API_KEY is required for validation");
  }
  const targets: ModelRouteTarget[] = [];

  if (opencodeApiKey) {
    targets.push({
      id: OPENCODE_GO_PROVIDER_ID,
      model: createOpenCodeGoModel({
        apiKey: opencodeApiKey,
        model: modelId,
        ...(options.opencodeBaseURL ? { baseURL: options.opencodeBaseURL } : {}),
      }),
      fallbackOn: classifyOpenCodeGoFailure,
    });
  }
  if (deepSeekApiKey) {
    targets.push({
      id: DEEPSEEK_PROVIDER_ID,
      model: createDeepSeekModel({
        apiKey: deepSeekApiKey,
        model: modelId,
        ...(options.deepSeekBaseURL ? { baseURL: options.deepSeekBaseURL } : {}),
      }),
    });
  }

  const route = targets.map(({ id }) => id);
  return {
    model: createRoutedLanguageModel({
      id: VALIDATION_ROUTE_ID,
      targets: targets as [ModelRouteTarget, ...ModelRouteTarget[]],
    }),
    route,
    pricing: validationPricing(route),
  };
}

function validationPricing(route: readonly string[]): NonNullable<DriverDescriptor["pricing"]> {
  if (route.length === 1 && route[0] === OPENCODE_GO_PROVIDER_ID) return openCodeGoFlashPricing;
  if (route.length === 1) return deepSeekFlashPricing;
  if (!sameTokenPrices(openCodeGoFlashPricing, deepSeekFlashPricing)) {
    throw new Error("validation fallback requires matching token prices until route-aware cost audit is supported");
  }
  return {
    ...deepSeekFlashPricing,
    source: `${openCodeGoFlashPricing.source}; ${deepSeekFlashPricing.source}`,
  };
}

function sameTokenPrices(
  left: NonNullable<DriverDescriptor["pricing"]>,
  right: NonNullable<DriverDescriptor["pricing"]>,
): boolean {
  return left.inputPerMillionUsd === right.inputPerMillionUsd
    && left.cachedInputPerMillionUsd === right.cachedInputPerMillionUsd
    && left.outputPerMillionUsd === right.outputPerMillionUsd;
}
