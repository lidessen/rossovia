#!/usr/bin/env bun

import { homedir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");
const cli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
const stateRoot = join(homedir(), ".codex", "intervention-reconciliation");

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

try {
  const payload = await Bun.stdin.text();
  const result = Bun.spawnSync([process.execPath, cli, "intervention", "observe", "--state-root", stateRoot], {
    stdin: Buffer.from(payload),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.exitCode);
  }
  const observed = JSON.parse(result.stdout.toString()) as { statePath: string };
  const receiptEndpoint = [
    shellQuote(process.execPath),
    shellQuote(cli),
    "correct",
    "--state-file",
    shellQuote(observed.statePath),
  ].join(" ");
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: (
        "A Principal message has arrived. Before acting on it, compare it with the active task. " +
        "If it changes a target, hard boundary, concept relation, authority, or acceptance condition, " +
        "run practice-cycle continue and record one correction with the session-local `correct` command prefix " +
        "`" + receiptEndpoint + "`. Otherwise proceed without ceremony. `correct` requires " +
        "--rejected-assumption, --new-invariant, one or more --affected-surface, and --next-probe. " +
        "This binding is advisory, not a mutation or authorization gate. If the endpoint is unavailable " +
        "or denied, do not request broader filesystem permission and do not block already-authorized work; " +
        "retain the correction in the active task and report the receipt as unresolved."
      ),
    },
  }));
} catch (error: unknown) {
  console.error(`intervention hook: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
