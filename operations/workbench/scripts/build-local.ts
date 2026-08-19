#!/usr/bin/env bun
/**
 * Build Rossovia locally and install the binaries into the user's local bin.
 *
 *   bun run build:local
 *
 * Compiles two single-file binaries (the Workbench CLI and the Autonomy
 * runner) with `bun build --compile`, regenerates the embedded UI assets,
 * and installs them as `rossovia` and `rossovia-autonomy` under
 * `~/.local/bin` (or $LOCAL_BIN). The Workbench binary finds its Autonomy
 * sibling next to itself at runtime, so the pair must be installed together.
 */
import { chmodSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const workbenchRoot = resolve(import.meta.dir, "..");
const autonomyRoot = resolve(workbenchRoot, "..", "autonomy");
const binDir = process.env.LOCAL_BIN ?? join(homedir(), ".local", "bin");

const WORKBENCH_ENTRY = join(workbenchRoot, "src", "cli.ts");
const AUTONOMY_ENTRY = join(autonomyRoot, "src", "cli.ts");
const TARGETS = [
  { name: "rossovia", entry: WORKBENCH_ENTRY },
  { name: "rossovia-autonomy", entry: AUTONOMY_ENTRY },
];

function run(label: string, command: string, args: readonly string[]): void {
  console.log(`\n[${label}] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: workbenchRoot, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`[${label}] failed with exit ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Rossovia local build → ${binDir}`);

// 1. Regenerate embedded UI assets so the binary serves the current ui/ tree.
run("assets", "bun", ["run", "scripts/generate-ui-assets.ts"]);

// 2. Compile both binaries into a temp directory, then install as a pair.
const temporary = join(binDir, ".rossovia-build");
mkdirSync(temporary, { recursive: true });
try {
  for (const target of TARGETS) {
    const outfile = join(temporary, target.name);
    run("compile", "bun", [
      "build",
      "--compile",
      target.entry,
      "--outfile",
      outfile,
    ]);
  }

  mkdirSync(binDir, { recursive: true });
  for (const target of TARGETS) {
    const source = join(temporary, target.name);
    const destination = join(binDir, target.name);
    copyFileSync(source, destination);
    chmodSync(destination, 0o755);
    console.log(`installed ${destination}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("\nDone. Verify with:");
console.log(`  ${join(binDir, "rossovia")} --version`);
console.log(`  ${join(binDir, "rossovia")} ui`);
