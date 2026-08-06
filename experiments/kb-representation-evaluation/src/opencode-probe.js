export const IMAGE_GATE_ORDER = ["sparse", "medium", "dense", "dense", "medium", "sparse", "medium", "sparse", "dense"];

export function parseOpenCodeJsonl(output) {
  return output.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
}

export function answerTextFromEvents(events) {
  return events.filter((event) => event.type === "text").map((event) => event.part?.text ?? "").join("").trim();
}

export function usageFromEvents(events) {
  const finish = [...events].reverse().find((event) => event.type === "step_finish");
  return finish ? { tokens: finish.part.tokens, cost: finish.part.cost, reason: finish.part.reason } : null;
}

export function parseAnswerArray(text) {
  const lines = text.trim().split("\n");
  if (lines[0]?.startsWith("```")) lines.shift();
  if (lines.at(-1)?.trim() === "```") lines.pop();
  const parsed = JSON.parse(lines.join("\n").trim());
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry?.id !== "string" || typeof entry?.answer !== "string")) {
    throw new TypeError("Model output must be a JSON array of { id, answer } strings.");
  }
  return parsed;
}
