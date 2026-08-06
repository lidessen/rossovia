import { mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { buildProjectLensBundle } from "./project-lens-builder.js";
import { validateProjectBundle } from "../lib/project-evidence-bundle.js";

function parseArguments(arguments_) {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument.startsWith("--")) continue;
    const [rawKey, inline] = argument.slice(2).split("=", 2);
    values[rawKey] = inline ?? arguments_[++index];
  }
  if (!values.repo) throw new TypeError("Missing --repo <path>.");
  if (values.intent && !["use", "understand", "change"].includes(values.intent)) {
    throw new TypeError("--intent must be use, understand, or change.");
  }
  return values;
}

const values = parseArguments(Bun.argv.slice(2));
const experimentRoot = resolve(import.meta.dir, "..");
const output = resolve(values.output ?? resolve(experimentRoot, "generated/project-evidence-bundle.json"));
const bundle = await buildProjectLensBundle({
  repo: values.repo,
  intent: values.intent,
  audience: values.audience,
  question: values.question,
  focusSources: values.focus ? values.focus.split(",").map((value) => value.trim()).filter(Boolean) : [],
  proposedVerifications: values.verify ? values.verify.split(";;").map((value) => value.trim()).filter(Boolean) : [],
});
const validation = await validateProjectBundle(bundle);
if (!validation.valid) throw new Error(validation.errors.map((error) => error.message).join(" "));
await mkdir(dirname(output), { recursive: true });
await Bun.write(output, `${JSON.stringify(bundle, null, 2)}\n`);

const relativeOutput = relative(experimentRoot, output).replaceAll("\\", "/");
console.log(`Project Lens bundle: ${output}`);
if (!relativeOutput.startsWith("..")) {
  console.log(`Open after 'bun run dev': http://127.0.0.1:4311/project.html?bundle=${encodeURIComponent(`./${relativeOutput}`)}&binding=${encodeURIComponent(bundle.bindingDigest)}`);
} else {
  console.log("The output is outside the served experiment root; pass --output inside this directory to open it in Project Lens.");
}
