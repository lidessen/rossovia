#!/usr/bin/env node

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist", "rossovia.mjs");
const requestedBuilder = process.argv.includes("--docker") ? "docker" : "auto";
const builder = requestedBuilder === "auto" && succeeds("bun", ["--version"])
  ? "bun"
  : "docker";

mkdirSync(dirname(output), { recursive: true });
if (builder === "docker") {
  if (!succeeds("docker", ["--version"])) {
    process.stderr.write("rossovia build: install Bun, or make Docker available as the fallback builder\n");
    process.exit(1);
  }
}

const temporary = mkdtempSync(resolve(dirname(output), ".rossovia-build-"));
const candidate = resolve(temporary, "rossovia.mjs");
try {
  if (builder === "bun") {
    run("bun", ["build", "src/cli.ts", "--target=node", "--outfile", candidate], root);
  } else {
    run("docker", [
      "build",
      "--output",
      `type=local,dest=${temporary}`,
      ".",
    ], root);
  }
  normalizeBundle(candidate);
  renameSync(candidate, output);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

function normalizeBundle(path) {
  const source = readFileSync(path, "utf8");
  writeFileSync(path, source.replace(/[ \t]+(?=\r?\n)/g, ""), "utf8");
}

function succeeds(command, arguments_) {
  return spawnSync(command, arguments_, { stdio: "ignore" }).status === 0;
}

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
