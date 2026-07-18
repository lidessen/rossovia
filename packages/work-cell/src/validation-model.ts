import type { DriverDescriptor } from "./contracts";
import { createRoutedLanguageModel, type ModelRouteTarget } from "./model-route";
import {
  loadProviderProfile,
  ValidationRouteSchema,
  type ProviderRouteTarget,
} from "./provider-profile";
import {
  classifyDeepSeekFailure,
  createDeepSeekModel,
  DEEPSEEK_PROVIDER_ID,
  deepSeekFlashPricing,
} from "./providers/deepseek";
import {
  classifyOpenCodeGoFailure,
  createOpenCodeGoModel,
  OPENCODE_GO_PROVIDER_ID,
} from "./providers/opencode-go";
import {
  classifyKimiCodingFailure,
  createKimiCodingModel,
  KIMI_CODING_DEFAULT_MODEL,
  KIMI_CODING_PROVIDER_ID,
  kimiCodingSupportsNativeStructuredOutput,
} from "./providers/kimi-coding";

const DEFAULT_MODEL = "deepseek-v4-flash";
const VALIDATION_ROUTE_ID = "validation";

export interface ValidationModelOptions {
  deepSeekApiKey?: string;
  deepSeekBaseURL?: string;
  kimiApiKey?: string;
  kimiBaseURL?: string;
  kimiModel?: string;
  opencodeApiKey?: string;
  opencodeBaseURL?: string;
  model?: string;
  route?: ProviderRouteTarget[];
  providerProfilePath?: string;
  environment?: NodeJS.ProcessEnv;
}

export interface ValidationModelSelection {
  model: ReturnType<typeof createRoutedLanguageModel>;
  route: readonly string[];
  models: readonly string[];
  structuredOutputMode: "inline" | "tool-settlement";
  pricing?: NonNullable<DriverDescriptor["pricing"]>;
}

export function validationProviderName(selection: ValidationModelSelection): string {
  return selection.route.join("->");
}

export function validationModelName(selection: ValidationModelSelection): string {
  if (new Set(selection.models).size === 1) return selection.models[0] ?? DEFAULT_MODEL;
  return selection.route
    .map((provider, index) => `${provider}/${selection.models[index]}`)
    .join("->");
}

export function requireValidationConfiguration(
  purpose: string,
  options: ValidationModelOptions = {},
): void {
  try {
    resolveValidationRoute(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${purpose} requires an explicit provider route: ${message}`);
  }
}

export function createValidationModel(
  options: ValidationModelOptions = {},
): ValidationModelSelection {
  const resolvedRoute = resolveValidationRoute(options);
  const targets: ModelRouteTarget[] = [];
  const models: string[] = [];

  for (const target of resolvedRoute) {
    if (target.provider === OPENCODE_GO_PROVIDER_ID) {
      targets.push({
        id: OPENCODE_GO_PROVIDER_ID,
        model: createOpenCodeGoModel({
          apiKey: target.apiKey,
          model: target.model,
          ...(target.baseURL ? { baseURL: target.baseURL } : {}),
        }),
        fallbackOn: classifyOpenCodeGoFailure,
      });
    } else if (target.provider === KIMI_CODING_PROVIDER_ID) {
      targets.push({
        id: KIMI_CODING_PROVIDER_ID,
        model: createKimiCodingModel({
          apiKey: target.apiKey,
          model: target.model,
          ...(target.baseURL ? { baseURL: target.baseURL } : {}),
        }),
        fallbackOn: classifyKimiCodingFailure,
      });
    } else {
      targets.push({
        id: DEEPSEEK_PROVIDER_ID,
        model: createDeepSeekModel({
          apiKey: target.apiKey,
          model: target.model,
          ...(target.baseURL ? { baseURL: target.baseURL } : {}),
        }),
        fallbackOn: classifyDeepSeekFailure,
      });
    }
    models.push(target.model);
  }

  const route = targets.map(({ id }) => id);
  return {
    model: createRoutedLanguageModel({
      id: VALIDATION_ROUTE_ID,
      targets: targets as [ModelRouteTarget, ...ModelRouteTarget[]],
    }),
    route,
    models,
    structuredOutputMode: resolvedRoute.every((target) => (
      target.provider !== KIMI_CODING_PROVIDER_ID
      || kimiCodingSupportsNativeStructuredOutput(target.model)
    )) ? "inline" : "tool-settlement",
    ...validationPricing(route, models),
  };
}

interface ResolvedValidationTarget {
  provider: "opencode-go" | "kimi-coding" | "deepseek";
  apiKey: string;
  model: string;
  baseURL?: string;
}

function resolveValidationRoute(options: ValidationModelOptions): ResolvedValidationTarget[] {
  const route = options.route
    ? ValidationRouteSchema.parse(options.route)
    : loadProviderProfile(options.providerProfilePath).routes.validation;
  const environment = options.environment ?? process.env;
  const seen = new Set<string>();
  return route.map((target) => {
    if (seen.has(target.provider)) {
      throw new Error(`provider route contains duplicate target ${target.provider}`);
    }
    seen.add(target.provider);
    const configuredApiKey = target.provider === OPENCODE_GO_PROVIDER_ID
      ? options.opencodeApiKey
      : target.provider === KIMI_CODING_PROVIDER_ID
        ? options.kimiApiKey
        : options.deepSeekApiKey;
    const apiKey = configuredApiKey ?? environment[target.credential.name];
    if (!apiKey) {
      throw new Error(
        `selected provider ${target.provider} requires credential ${target.credential.name}, but it is not available`,
      );
    }
    const model = target.model
      ?? (target.provider === KIMI_CODING_PROVIDER_ID
        ? options.kimiModel ?? KIMI_CODING_DEFAULT_MODEL
        : options.model ?? DEFAULT_MODEL);
    const optionBaseURL = target.provider === OPENCODE_GO_PROVIDER_ID
      ? options.opencodeBaseURL
      : target.provider === KIMI_CODING_PROVIDER_ID
        ? options.kimiBaseURL
        : options.deepSeekBaseURL;
    return {
      provider: target.provider,
      apiKey,
      model,
      ...(target.baseURL || optionBaseURL ? { baseURL: target.baseURL ?? optionBaseURL } : {}),
    };
  });
}

function validationPricing(
  route: readonly string[],
  models: readonly string[],
): { pricing?: NonNullable<DriverDescriptor["pricing"]> } {
  // Kimi Coding Plan is a subscription allowance, not a token-priced API. A
  // route may serve different calls from different providers, so aggregate
  // usage cannot truthfully be converted to dollars until cost audit is
  // retained per served call.
  // OpenCode Go and Kimi Coding Plan are fixed-price subscriptions. Their
  // published token tariffs measure allowance consumption, not marginal money
  // spent by this Cell. A mixed route also lacks per-target usage attribution.
  if (route.length !== 1 || route[0] !== DEEPSEEK_PROVIDER_ID) return {};
  if (models[0] !== DEFAULT_MODEL) return {};
  return { pricing: deepSeekFlashPricing };
}
