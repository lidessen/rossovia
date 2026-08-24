import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeEvidence } from "../src/evidence-summary.js";

const inputs = Bun.argv.slice(2);
if (inputs.length === 0) throw new TypeError("Usage: bun run scripts/summarize-evidence.js evidence/<evidence-id> [...]");

for (const input of inputs) {
  const directory = resolve(input);
  const names = (await readdir(directory)).filter((name) => name.startsWith("trial-") && name.endsWith(".json")).sort();
  const records = await Promise.all(names.map((name) => Bun.file(resolve(directory, name)).json()));
  const previous = await Bun.file(resolve(directory, "summary.json")).json();
  const summary = {
    evidenceId: previous.evidenceId,
    status: previous.status,
    profile: previous.profile,
    aggregate: summarizeEvidence(records),
    totals: previous.totals,
  };
  await Bun.write(resolve(directory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`${previous.evidenceId}: ${summary.aggregate.passed}/${summary.aggregate.questions}`);
}
