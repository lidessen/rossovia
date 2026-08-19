#!/usr/bin/env bun

import { fileURLToPath } from "node:url";
import {
  verifyAgentEraBlogEffectWithProfile,
  type AgentEraBlogEffectVerificationResult,
} from "./agent-era-blog-effect-verifier";
import {
  verifyAgentEraBlogPublicationCandidate,
} from "./verify-agent-era-blog-publication-candidate";

const ADMITTED_CLAIM =
  "seeded-publication-roundtrip-ready-for-principal-review" as const;
const VERIFIER_VERSION =
  "rosso.agent-era-blog-publication-effect-verifier.v1" as const;

export async function verifyAgentEraBlogPublicationEffect(input: {
  readonly home: string;
  readonly missionId: string;
  readonly effectId: string;
  readonly browserEvidencePath?: string;
}): Promise<AgentEraBlogEffectVerificationResult> {
  return verifyAgentEraBlogEffectWithProfile(input, {
    version: VERIFIER_VERSION,
    admittedClaim: ADMITTED_CLAIM,
    verifierSources: [{
      ref:
        "source-project:apps/autonomy/experiments/agent-era-blog-publication-effect-verifier.ts",
      path: fileURLToPath(import.meta.url),
    }, {
      ref:
        "source-project:apps/autonomy/experiments/verify-agent-era-blog-publication-candidate.ts",
      path: fileURLToPath(
        new URL(
          "./verify-agent-era-blog-publication-candidate.ts",
          import.meta.url,
        ),
      ),
    }, {
      ref:
        "source-project:apps/autonomy/experiments/agent-era-blog-effect-verifier.ts",
      path: fileURLToPath(
        new URL("./agent-era-blog-effect-verifier.ts", import.meta.url),
      ),
    }],
    residualRisks: [
      "This verdict is ready-for-Principal-review evidence, not product acceptance.",
      "This verdict does not grant commit, merge, deployment, or production publication authority.",
      "The browser result is time-point evidence bound to the exact candidate bytes; later mutation requires fresh verification.",
      "The disposable D1 checks do not establish production D1 configuration or data.",
    ],
    verifyCandidate: ({ candidateRoot, dependencyRoot }) =>
      verifyAgentEraBlogPublicationCandidate({
        candidateRoot,
        dependencyRoot,
        ...(input.browserEvidencePath === undefined
          ? {}
          : { browserEvidencePath: input.browserEvidencePath }),
      }),
  });
}

function parseCli(arguments_: readonly string[]) {
  const [missionId, effectId, ...rest] = arguments_;
  if (missionId === undefined || effectId === undefined) {
    throw new Error(
      "usage: agent-era-blog-publication-effect-verifier.ts <mission-id> <effect-id> --home <ROSSO_HOME> [--browser-evidence <path>]",
    );
  }
  let home: string | undefined;
  let browserEvidencePath: string | undefined;
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (value === undefined) throw new Error(`${flag ?? "option"} requires a value`);
    if (flag === "--home") home = value;
    else if (flag === "--browser-evidence") browserEvidencePath = value;
    else throw new Error(`unknown option ${flag}`);
  }
  if (home === undefined) throw new Error("--home <ROSSO_HOME> is required");
  return {
    missionId,
    effectId,
    home,
    ...(browserEvidencePath === undefined ? {} : { browserEvidencePath }),
  };
}

if (import.meta.main) {
  try {
    const result = await verifyAgentEraBlogPublicationEffect(
      parseCli(process.argv.slice(2)),
    );
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.verdict === "passed"
      ? 0
      : result.verdict === "failed"
        ? 1
        : 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
