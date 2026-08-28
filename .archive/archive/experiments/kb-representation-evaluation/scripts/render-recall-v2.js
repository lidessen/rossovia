import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { recallV2ConfirmationQuestions, recallV2DevelopmentQuestions } from "../src/recall-v2.js";

const root = resolve(import.meta.dir, "..");
const candidates = [
  process.env.KB_PROBE_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

let chrome;
for (const candidate of candidates) {
  try {
    await stat(candidate);
    chrome = candidate;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!chrome) throw new Error("Chrome/Chromium not found. Set KB_PROBE_CHROME to its executable path.");

async function digest(path) {
  const bytes = await Bun.file(path).arrayBuffer();
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const rendered = [];

for (const [caseSet, questions] of Object.entries({
  development: recallV2DevelopmentQuestions,
  confirmation: recallV2ConfirmationQuestions,
})) {
  const outputDirectory = resolve(root, "fixtures/recall-v2/activation", caseSet);
  await mkdir(outputDirectory, { recursive: true });
  for (const question of questions) {
    const output = resolve(outputDirectory, `${question.id}.png`);
    const source = resolve(outputDirectory, `${question.id}.svg`);
    const process = Bun.spawn([
      chrome,
      "--headless",
      "--incognito",
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1600,1000",
      `--screenshot=${output}`,
      `file://${source}`,
    ], { cwd: root, stdout: "pipe", stderr: "pipe" });
    const [stderr, exitCode] = await Promise.all([new Response(process.stderr).text(), process.exited]);
    if (exitCode !== 0) throw new Error(`Chrome failed for recall v2 ${caseSet}/${question.id}: ${stderr.trim()}`);
    rendered.push({
      caseSet,
      questionId: question.id,
      svgSha256: await digest(source),
      pngSha256: await digest(output),
    });
    console.log(`${caseSet}/${question.id}: ${output}`);
  }
}

await Bun.write(resolve(root, "fixtures/recall-v2/render-manifest.json"), `${JSON.stringify({
  renderer: "headless Chrome/Chromium",
  windowSize: "1600x1000",
  files: rendered,
}, null, 2)}\n`);
