import {
  type LanguageModelV4,
  type LanguageModelV4GenerateResult,
  type LanguageModelV4Middleware,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

export interface ModelRouteFailure {
  reason: string;
}

export interface ModelRouteTarget {
  id: string;
  model: LanguageModelV4;
  fallbackOn?: (
    error: unknown,
    context: { signal?: AbortSignal },
  ) => ModelRouteFailure | undefined;
}

export interface ModelRoute {
  id: string;
  targets: readonly [ModelRouteTarget, ...ModelRouteTarget[]];
}

/**
 * Routes non-streaming generate calls. Streaming is rejected explicitly because
 * switching providers after partial output would duplicate or splice effects.
 */
export function createRoutedLanguageModel(route: ModelRoute): LanguageModelV4 {
  assertRoute(route);
  const [primary] = route.targets;
  const middleware: LanguageModelV4Middleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate, params }) => {
      const failedAttempts: Array<{ target: string; reason: string; error: unknown }> = [];
      for (const [index, target] of route.targets.entries()) {
        try {
          const result = index === 0
            ? await doGenerate()
            : await target.model.doGenerate(params);
          return withRouteMetadata(result, {
            routeId: route.id,
            servedBy: target.id,
            mode: route.targets.length === 1
              ? "direct"
              : index === 0 ? "preferred" : "fallback",
            attempts: failedAttempts.map(({ target: failedTarget, reason }) => ({
              target: failedTarget,
              reason,
            })),
          });
        } catch (error) {
          if (params.abortSignal?.aborted || isAbortError(error)) throw error;
          const failure = target.fallbackOn?.(error, {
            ...(params.abortSignal ? { signal: params.abortSignal } : {}),
          });
          const hasNext = index < route.targets.length - 1;
          if (!hasNext || !failure) {
            if (failedAttempts.length === 0) throw error;
            throw routeFailure(route.id, [...failedAttempts, {
              target: target.id,
              reason: failure?.reason ?? "terminal_target_failed",
              error,
            }]);
          }
          failedAttempts.push({ target: target.id, reason: failure.reason, error });
        }
      }
      throw new Error(`model route ${route.id} has no executable target`);
    },
    wrapStream: async () => {
      throw new Error(`model route ${route.id} supports non-streaming generate calls only`);
    },
  };

  return wrapLanguageModel({
    model: primary.model,
    middleware,
    modelId: primary.model.modelId,
    providerId: `model-route:${route.id}`,
  });
}

function assertRoute(route: ModelRoute): void {
  if (!route.id.trim()) throw new Error("model route id must not be empty");
  const ids = new Set<string>();
  for (const target of route.targets) {
    if (!target.id.trim()) throw new Error("model route target id must not be empty");
    if (ids.has(target.id)) throw new Error(`duplicate model route target: ${target.id}`);
    ids.add(target.id);
  }
}

function withRouteMetadata(
  result: LanguageModelV4GenerateResult,
  route: {
    routeId: string;
    servedBy: string;
    mode: "preferred" | "fallback" | "direct";
    attempts: Array<{ target: string; reason: string }>;
  },
): LanguageModelV4GenerateResult {
  return {
    ...result,
    providerMetadata: {
      ...result.providerMetadata,
      workCellRoute: route,
    },
  };
}

function routeFailure(
  routeId: string,
  attempts: Array<{ target: string; reason: string; error: unknown }>,
): Error {
  return new Error(
    `model route ${routeId} failed: ${attempts.map(({ target, reason }) => `${target} (${reason})`).join("; ")}`,
    { cause: new AggregateError(attempts.map(({ error }) => error)) },
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
