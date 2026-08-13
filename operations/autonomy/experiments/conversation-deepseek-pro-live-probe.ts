import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CURRENT_COORDINATOR_POLICY } from "../src/conversation-prompt";
import {
  startConversationTurn,
  type ConversationTurnSafetyEvent,
} from "../src/conversation-coordinator";
import {
  createDeepSeekTurnAdapter,
  DEEPSEEK_TURN_MAX_OUTPUT_TOKENS,
} from "../src/deepseek-turn-adapter";

const PROBE_ID = "conversation-deepseek-v4-pro-live-probe";
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const defaultOutputPath = resolve(
  import.meta.dir,
  "evidence",
  `${new Date().toISOString().slice(0, 10)}-${PROBE_ID}.json`,
);
const outputPath = resolve(outputArgument ?? defaultOutputPath);
const apiKey = process.env.DEEPSEEK_API_KEY;

const startedAt = new Date().toISOString();
const evidence: Record<string, unknown> = {
  probe: PROBE_ID,
  version: 1,
  intent: [
    "One authorized read-only DeepSeek Pro/max live inquiry through the frozen P3b1 ConversationTurnPort contract.",
    "The probe records requested and observed provider/model/reasoning identity, sanitized usage, and the event sequence.",
    "It does not modify any Task, Mission, or project state; the only write is this evidence file.",
  ].join(" "),
  authorization: "P3b2 acceptance: one authorized DeepSeek Pro/max read-only live inquiry",
  startedAt,
  environment: {
    DEEPSEEK_API_KEY: apiKey === undefined ? "unset" : "set",
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL === undefined ? "unset" : "set",
  },
  maxOutputTokens: DEEPSEEK_TURN_MAX_OUTPUT_TOKENS,
};

try {
  if (apiKey === undefined) {
    throw new Error("DEEPSEEK_API_KEY is not configured; the live probe cannot run");
  }

  const events: Array<ConversationTurnSafetyEvent["kind"]> = [];
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 180_000);

  const adapter = createDeepSeekTurnAdapter({
    apiKey,
    ...(process.env.DEEPSEEK_BASE_URL === undefined
      ? {}
      : { baseURL: process.env.DEEPSEEK_BASE_URL }),
    provider: CURRENT_COORDINATOR_POLICY.provider,
    model: CURRENT_COORDINATOR_POLICY.model,
    thinking: CURRENT_COORDINATOR_POLICY.thinking,
    reasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
  });

  const result = await startConversationTurn({
    message: {
      text: [
        "This is a read-only live probe.",
        "State the provider, model, and reasoning effort disclosed for this turn, confirm that you took no action, and reply in one short sentence.",
      ].join(" "),
      lineage: { messageId: "probe-message-1", turnId: "probe-turn-1" },
    },
    policy: {
      ...CURRENT_COORDINATOR_POLICY,
      disclosureEnvelope: "Sources are disclosed by ref and digest only; raw provider output is never included.",
    },
    port: adapter,
    onEvent: (event) => events.push(event.kind),
  }).result;
  clearTimeout(deadline);

  const finishedAt = new Date().toISOString();
  evidence.finishedAt = finishedAt;
  evidence.status = result.kind;
  evidence.requested = result.requested;
  evidence.observed = result.observed;
  evidence.events = events;
  evidence.text = result.text;
  if (result.kind === "finished") {
    evidence.usage = result.usage;
  } else if (result.kind === "failed") {
    evidence.error = result.error;
  }
} catch (error) {
  evidence.status = "probe-error";
  evidence.finishedAt = new Date().toISOString();
  evidence.error = error instanceof Error ? error.message : String(error);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify(evidence, null, 2));

if (evidence.status !== "finished") {
  process.exit(1);
}
