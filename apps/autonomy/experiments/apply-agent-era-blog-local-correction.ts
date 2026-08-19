#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyAgentEraBlogLocalCorrection } from "../src/local-correction";

function parseCli(arguments_: readonly string[]): {
  readonly missionId: string;
  readonly inputId: string;
  readonly patchPath: string;
  readonly executorRef: string;
  readonly home: string;
} {
  const [missionId, inputId, patchPath, ...options] = arguments_;
  if (missionId === undefined || inputId === undefined || patchPath === undefined) {
    throw new Error(
      "usage: apply-agent-era-blog-local-correction.ts <mission-id> <input-id> <patch-path> --executor <ref> --home <ROSSO_HOME>",
    );
  }
  if (
    options.length !== 4
    || options[0] !== "--executor"
    || options[1] === undefined
    || options[2] !== "--home"
    || options[3] === undefined
  ) {
    throw new Error("--executor <ref> and --home <ROSSO_HOME> are required in that order");
  }
  return {
    missionId,
    inputId,
    patchPath: resolve(patchPath),
    executorRef: options[1],
    home: resolve(options[3]),
  };
}

if (import.meta.main) {
  try {
    const input = parseCli(process.argv.slice(2));
    const result = await applyAgentEraBlogLocalCorrection({
      home: input.home,
      missionId: input.missionId,
      inputId: input.inputId,
      executorRef: input.executorRef,
      patch: await readFile(input.patchPath),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
