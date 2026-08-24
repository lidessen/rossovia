import { resolve } from "node:path";
import { scoreAnswers } from "../src/fixture.js";

const input = Bun.argv[2];
if (!input) throw new TypeError("Usage: bun run scripts/score.js path/to/answers.json");
const answers = await Bun.file(resolve(input)).json();
if (!Array.isArray(answers)) throw new TypeError("Answers must be a JSON array of { id, answer }.");
console.log(JSON.stringify(scoreAnswers(answers), null, 2));
