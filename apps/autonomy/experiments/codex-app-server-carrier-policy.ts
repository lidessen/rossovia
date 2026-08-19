import { spawnSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import {
  CODEX_APP_SERVER_TOOL_POLICY,
} from "../../../packages/work-cell/src/codex-app-server-driver";

export const AUTHORIZED_CODEX_CARRIER = {
  canonicalExecutable:
    "/opt/homebrew/Caskroom/codex/0.145.0/codex-aarch64-apple-darwin",
  version: "codex-cli 0.145.0",
  toolPolicy: CODEX_APP_SERVER_TOOL_POLICY,
} as const;

export const AUTHORIZED_CODEX_AUTH_FILE =
  "/Users/lidessen/.codex/auth.json";

export interface VerifiedCodexAppServerCarrier {
  readonly canonicalExecutable: string;
  readonly version: string;
  readonly toolPolicy:
    "app-server-no-environment-structured-output-plan-only-v1";
}

/**
 * Resolve the exact local app-server carrier used by the first live
 * reconciliation experiment. The version check is a protocol-compatibility
 * guard, not a binary or source attestation scheme.
 */
export async function verifyAuthorizedCodexCarrier(): Promise<
  VerifiedCodexAppServerCarrier
> {
  const canonicalExecutable = await realpath(
    AUTHORIZED_CODEX_CARRIER.canonicalExecutable,
  );
  if (
    canonicalExecutable !== AUTHORIZED_CODEX_CARRIER.canonicalExecutable
  ) {
    throw new Error("authorized Codex carrier canonical path drifted");
  }
  const version = run(canonicalExecutable, ["--version"]);
  if (version !== AUTHORIZED_CODEX_CARRIER.version) {
    throw new Error("authorized Codex carrier version drifted");
  }
  return AUTHORIZED_CODEX_CARRIER;
}

function run(
  executable: string,
  argv: readonly string[],
): string {
  const result = spawnSync(executable, argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || result.error !== undefined) {
    throw new Error(
      `${executable} ${argv.join(" ")} failed: ${(result.stderr ?? "").trim()}`,
    );
  }
  return result.stdout.trim();
}
