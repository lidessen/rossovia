import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { imageDiagnosticVariants } from "../src/image-diagnostic.js";

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

for (const variant of imageDiagnosticVariants) {
  const outputDirectory = resolve(root, "generated", "image-diagnostic", variant.tier);
  const output = resolve(outputDirectory, "graph.png");
  const source = resolve(root, "fixtures", "image-diagnostic", variant.tier, "graph.svg");
  await mkdir(outputDirectory, { recursive: true });
  const process = Bun.spawn([
    chrome,
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1400,960",
    `--screenshot=${output}`,
    `file://${source}`,
  ], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stderr, exitCode] = await Promise.all([new Response(process.stderr).text(), process.exited]);
  if (exitCode !== 0) throw new Error(`Chrome failed for ${variant.tier}: ${stderr.trim()}`);
  console.log(`${variant.tier}: ${output}`);
}
