import { AiSdkValidationDriver, type AiSdkDriverOptions } from "../../../packages/work-cell/src/integrations/ai-sdk/ai-sdk-driver";
import { PiHarnessCellDriver } from "../../../packages/work-cell/src/integrations/ai-sdk/pi-harness-driver";
import {
  DEEPSEEK_PROVIDER_ID,
  DeepSeekInferencePolicySchema,
  type DeepSeekInferencePolicy,
} from "../../../packages/work-cell/src/integrations/ai-sdk/providers/deepseek";
import {
  KIMI_CODING_DEFAULT_MODEL,
  KIMI_CODING_PROVIDER_ID,
} from "../../../packages/work-cell/src/integrations/ai-sdk/providers/kimi-coding";
import {
  WORKER_CARD_VERSION,
  WorkerCardSchema,
  WorkerCatalog,
  type WorkerCard,
} from "../../../packages/work-cell/src/worker-catalog";

const DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";
const OPENCODE_PROVIDER_ID = "opencode-go";
const OPENCODE_CREDENTIAL = "OPENCODE_API_KEY";
const KIMI_CODE_CREDENTIAL = "KIMI_CODE_API_KEY";
const KIMI_VISUAL_MODEL = "kimi-k2.7-code";
const KIMI_CODING_PLAN_MODEL = KIMI_CODING_DEFAULT_MODEL;

/** Current host policy. Mechanism callers may instead supply any WorkerCatalog. */
export function currentWorkerCards(
  environment: NodeJS.ProcessEnv = process.env,
): readonly WorkerCard[] {
  return [
    WorkerCardSchema.parse({
      version: WORKER_CARD_VERSION,
      id: "deepseek-flash",
      labels: ["coding", "text", "thinking", "tools", "read", "write", "commands"],
      description:
        "DeepSeek Flash handles high-value text and code engineering such as repository analysis, implementation, debugging, tests, and source-grounded technical review. Recommended for focused text/code work that does not require visual input.",
      executionProfile: {
        id: "deepseek-flash",
        version: "execution-profile.v1",
        provider: "deepseek",
        model: DEEPSEEK_FLASH_MODEL,
        reasoningEffort: "max",
      },
      availability: environment.DEEPSEEK_API_KEY
        ? { status: "available" }
        : { status: "unavailable", reason: "DEEPSEEK_API_KEY is not configured" },
    }),
    WorkerCardSchema.parse({
      version: WORKER_CARD_VERSION,
      id: "deepseek-pro",
      labels: ["coding", "text", "thinking", "tools", "read", "write", "commands", "architecture"],
      description:
        "DeepSeek Pro handles architecture, system design, complex analysis, and consequential code engineering that benefit from deeper reasoning. Recommended for design-heavy or difficult text/code work that does not require visual input.",
      executionProfile: {
        id: "deepseek-pro",
        version: "execution-profile.v1",
        provider: "deepseek",
        model: DEEPSEEK_PRO_MODEL,
        reasoningEffort: "max",
      },
      availability: environment.DEEPSEEK_API_KEY
        ? { status: "available" }
        : { status: "unavailable", reason: "DEEPSEEK_API_KEY is not configured" },
    }),
    WorkerCardSchema.parse({
      version: WORKER_CARD_VERSION,
      id: "kimi-coding",
      labels: ["coding", "text", "vision", "thinking", "tools", "read", "write", "commands"],
      description:
        "Kimi K2.7 Code handles complex code engineering with thinking, tool use, and image input across repository analysis, implementation, debugging, UI screenshots, and architecture diagrams. Recommended for code-heavy or visual-plus-code tasks that benefit from sustained reasoning.",
      executionProfile: {
        id: "kimi-coding",
        version: "execution-profile.v1",
        provider: OPENCODE_PROVIDER_ID,
        model: KIMI_VISUAL_MODEL,
      },
      availability: environment[OPENCODE_CREDENTIAL]
        ? { status: "available" }
        : { status: "unavailable", reason: `${OPENCODE_CREDENTIAL} is not configured` },
    }),
    WorkerCardSchema.parse({
      version: WORKER_CARD_VERSION,
      id: "kimi-coding-plan",
      labels: ["coding", "text", "thinking", "tools", "read", "write", "commands"],
      description:
        "Kimi Coding Plan handles complex text and code engineering with thinking, tool use, and sustained reasoning. Recommended for code-heavy tasks that benefit from sustained reasoning through the Kimi Coding Plan endpoint.",
      executionProfile: {
        id: "kimi-coding-plan",
        version: "execution-profile.v1",
        provider: KIMI_CODING_PROVIDER_ID,
        model: KIMI_CODING_PLAN_MODEL,
      },
      availability: environment[KIMI_CODE_CREDENTIAL]
        ? { status: "available" }
        : { status: "unavailable", reason: `${KIMI_CODE_CREDENTIAL} is not configured` },
    }),
  ];
}

/** Derive the AI SDK DeepSeek inference policy from a card's declared profile. */
export function deepSeekInferencePolicy(card: WorkerCard): DeepSeekInferencePolicy | undefined {
  if (card.executionProfile.provider !== DEEPSEEK_PROVIDER_ID) return undefined;
  const reasoningEffort = card.executionProfile.reasoningEffort;
  if (reasoningEffort === undefined) return { thinking: "disabled" };
  return DeepSeekInferencePolicySchema.parse({ thinking: "enabled", reasoningEffort });
}

/** Driver construction options for a DeepSeek card, derived from the same profile. */
export function deepSeekDriverOptions(
  card: WorkerCard,
  environment: NodeJS.ProcessEnv,
): AiSdkDriverOptions {
  const policy = deepSeekInferencePolicy(card);
  return {
    route: [{
      provider: DEEPSEEK_PROVIDER_ID,
      credential: { source: "env", name: "DEEPSEEK_API_KEY" },
      model: card.executionProfile.model,
    }],
    environment,
    ...(policy ? { deepSeekInferencePolicy: policy } : {}),
  };
}

export function createCurrentWorkerCatalog(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerCatalog {
  const [deepseekFlash, deepseekPro, kimi, kimiCodingPlan] = currentWorkerCards(environment);
  return new WorkerCatalog([
    {
      // The ordinary production driver: the pinned Pi harness adapter inside
      // Vercel AI SDK's HarnessAgent, with every Pi built-in tool disabled
      // and only the host-executed Work Cell tool surface visible. The exact
      // worker execution profile is mapped into the Pi adapter explicitly;
      // an unresolvable provider/model fails closed, never falls back to a
      // Pi default.
      card: deepseekFlash!,
      createDriver: () => new PiHarnessCellDriver(deepSeekDriverOptions(deepseekFlash!, environment)),
    },
    {
      card: deepseekPro!,
      createDriver: () => new PiHarnessCellDriver(deepSeekDriverOptions(deepseekPro!, environment)),
    },
    {
      // OpenCode Go stays an AI SDK provider, not a harness: the Kimi worker
      // keeps the general AI SDK validation driver.
      card: kimi!,
      createDriver: () => new AiSdkValidationDriver({
        route: [{
          provider: OPENCODE_PROVIDER_ID,
          credential: { source: "env", name: OPENCODE_CREDENTIAL },
          model: kimi!.executionProfile.model,
        }],
        environment,
      }),
    },
    {
      // Kimi Coding Plan uses the same generic AI SDK validation driver over
      // the Kimi Coding provider adapter.
      card: kimiCodingPlan!,
      createDriver: () => new AiSdkValidationDriver({
        route: [{
          provider: KIMI_CODING_PROVIDER_ID,
          credential: { source: "env", name: KIMI_CODE_CREDENTIAL },
          model: kimiCodingPlan!.executionProfile.model,
        }],
        environment,
      }),
    },
  ]);
}
