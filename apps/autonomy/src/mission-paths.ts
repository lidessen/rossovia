import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

export function missionRunnerDirectory(root: string, missionId: string): string {
  return join(resolve(root), "missions", missionIdDigest(missionId));
}

export function missionRunnerStatusPath(root: string, missionId: string): string {
  return join(missionRunnerDirectory(root, missionId), "runner-status.json");
}

function missionIdDigest(missionId: string): string {
  return createHash("sha256").update(missionId).digest("hex");
}
