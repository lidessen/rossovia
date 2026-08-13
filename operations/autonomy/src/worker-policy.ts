import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import {
  WORKER_CARD_VERSION,
  WorkerCardSchema,
  WorkerCatalog,
  type WorkerCard,
} from "../../../packages/work-cell/src/worker-catalog";
import {
  KIMI_CODING_DEFAULT_MODEL,
} from "../../../packages/work-cell/src/providers/kimi-coding";

const DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";

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
        "Kimi Coding handles complex code engineering with thinking, tool use, and image input across repository analysis, implementation, debugging, UI screenshots, and architecture diagrams. Recommended for code-heavy or visual-plus-code tasks that benefit from sustained reasoning.",
      executionProfile: {
        id: "kimi-coding",
        version: "execution-profile.v1",
        provider: "kimi-coding",
        model: KIMI_CODING_DEFAULT_MODEL,
      },
      availability: environment.KIMI_CODE_API_KEY
        ? { status: "available" }
        : { status: "unavailable", reason: "KIMI_CODE_API_KEY is not configured" },
    }),
  ];
}

export function createCurrentWorkerCatalog(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerCatalog {
  const [deepseekFlash, deepseekPro, kimi] = currentWorkerCards(environment);
  return new WorkerCatalog([
    {
      card: deepseekFlash!,
      createDriver: () => new AiSdkValidationDriver({
        route: [{
          provider: "deepseek",
          credential: { source: "env", name: "DEEPSEEK_API_KEY" },
          model: DEEPSEEK_FLASH_MODEL,
        }],
        environment,
      }),
    },
    {
      card: deepseekPro!,
      createDriver: () => new AiSdkValidationDriver({
        route: [{
          provider: "deepseek",
          credential: { source: "env", name: "DEEPSEEK_API_KEY" },
          model: DEEPSEEK_PRO_MODEL,
        }],
        environment,
      }),
    },
    {
      card: kimi!,
      createDriver: () => new AiSdkValidationDriver({
        route: [{
          provider: "kimi-coding",
          credential: { source: "env", name: "KIMI_CODE_API_KEY" },
          model: KIMI_CODING_DEFAULT_MODEL,
        }],
        environment,
      }),
    },
  ]);
}
