#!/usr/bin/env bun

import { verifyAgentEraBlogLocalCorrection } from "../src/local-correction";

function parseCli(arguments_: readonly string[]) {
  const [missionId, inputId, ...rest] = arguments_;
  if (missionId === undefined || inputId === undefined) {
    throw new Error(
      "usage: verify-agent-era-blog-local-correction.ts <mission-id> <input-id> --home <ROSSO_HOME>",
    );
  }
  if (rest.length !== 2 || rest[0] !== "--home" || rest[1] === undefined) {
    throw new Error("--home <ROSSO_HOME> is required");
  }
  return { missionId, inputId, home: rest[1] };
}

if (import.meta.main) {
  try {
    const result = await verifyAgentEraBlogLocalCorrection(parseCli(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.verdict === "passed" ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
