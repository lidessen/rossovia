import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import { stableStringify } from "../../apps/autonomy/src/canonical-json";
import {
  EffectVerifiedDataSchema,
  FileEffectJournal,
  type EffectActivity,
} from "../../apps/autonomy/src/effect-journal";
import { readGitStatus } from "../../apps/autonomy/src/git-effect-observer";
import { missionRunnerDirectory } from "../../apps/autonomy/src/mission-runner";
import { validateProjectBundle } from "./lib/project-evidence-bundle.js";
import { validateProjectBundleAgainstRepository } from "./scripts/project-lens-builder.js";

export const PROJECT_LENS_OUTPUT_PATH =
  "experiments/human-agent-visualization/generated/project-evidence-bundle.json";
export const PROJECT_LENS_MATERIALIZER_REF =
  "source-project:experiments/human-agent-visualization/project-lens-runtime.ts";
const VERIFIER_REF =
  "source-project:experiments/human-agent-visualization/project-lens-effect-verifier.ts";

export interface ProjectLensEffectVerificationResult {
  readonly verdict: "passed" | "failed" | "unverifiable";
  readonly journalEventId?: string;
  readonly reason?: string;
}

export async function verifyProjectLensEffect(input: {
  readonly home: string;
  readonly missionId: string;
  readonly effectId: string;
}): Promise<ProjectLensEffectVerificationResult> {
  try {
    const journal = new FileEffectJournal(
      missionRunnerDirectory(resolve(input.home), input.missionId),
    );
    const activity = await journal.activity(input.effectId);
    assertVerifiableProjectLensEffect(activity, input);
    const initial = await observeBundle(activity.prepared.worktree.root);

    let bundle: unknown;
    let internal = invalid("bundle-missing");
    let repository = invalid("bundle-missing");
    if (initial.source !== null) {
      try {
        bundle = JSON.parse(initial.source);
        internal = await validateProjectBundle(bundle);
        const bindingDigest = valueAt(bundle, "bindingDigest");
        repository = await validateProjectBundleAgainstRepository(bundle, {
          expectedBindingDigest:
            typeof bindingDigest === "string" ? bindingDigest : undefined,
        });
      } catch (error) {
        internal = invalid(errorMessage(error));
        repository = invalid(errorMessage(error));
      }
    }

    const final = await observeBundle(activity.prepared.worktree.root);
    const retained = activity.settlement.materializedBundle;
    const lineageCurrent = initial.head === activity.prepared.worktree.baseHead
      && initial.sha256 === retained.sha256
      && initial.ignored
      && initial.changedPaths.length === 0;
    const stable = stableStringify(final) === stableStringify(initial);
    const verdict = lineageCurrent && internal.valid && repository.valid && stable
      ? "passed" as const
      : "failed" as const;
    const observation = {
      lineageCurrent,
      internal,
      repository,
      stable,
      initial: subjectOf(initial),
      final: subjectOf(final),
    };
    const verification = EffectVerifiedDataSchema.parse({
      verifierRef: `${VERIFIER_REF}@sha256:${await sourceDigest()}`,
      verdict,
      checks: [{
        command: "verify Project Lens materialized bundle",
        exitCode: verdict === "passed" ? 0 : 1,
        outputDigest: sha256(stableStringify(observation)),
      }],
      evidenceRefs: [
        `git-head:${final.head}`,
        ...(final.sha256 === null ? [] : [`sha256:${final.sha256}`]),
        ...(verdict === "passed"
          ? ["claim:project-lens-bundle-current-and-rebuildable"]
          : []),
      ],
      subject: subjectOf(final),
    });
    const event = await journal.verify(input.effectId, verification);
    return { verdict, journalEventId: event.eventId };
  } catch (error) {
    return { verdict: "unverifiable", reason: errorMessage(error) };
  }
}

function assertVerifiableProjectLensEffect(
  activity: EffectActivity | undefined,
  input: { readonly missionId: string; readonly effectId: string },
): asserts activity is EffectActivity & {
  readonly runId: string;
  readonly settlement: NonNullable<EffectActivity["settlement"]> & {
    readonly materializedBundle: NonNullable<
      NonNullable<EffectActivity["settlement"]>["materializedBundle"]
    >;
  };
} {
  const settlement = activity?.settlement;
  if (
    activity === undefined
    || activity.prepared.missionId !== input.missionId
    || activity.state !== "settled"
    || activity.runId === undefined
    || activity.prepared.writerRef !== PROJECT_LENS_MATERIALIZER_REF
    || activity.prepared.launchAuthorizationRef === undefined
    || activity.prepared.workbenchTaskContext === undefined
    || settlement?.materializedBundle === undefined
    || settlement.materializedBundle.path !== PROJECT_LENS_OUTPUT_PATH
    || settlement.materializedBundle.tracking !== "ignored"
    || stableStringify(activity.prepared.writePaths)
      !== stableStringify([PROJECT_LENS_OUTPUT_PATH])
    || stableStringify(settlement.changedPaths)
      !== stableStringify([PROJECT_LENS_OUTPUT_PATH])
    || settlement.outsideScope.verdict !== "clear"
    || settlement.acceptance.mechanical.verdict !== "passed"
  ) {
    throw new Error(`effect ${input.effectId} does not match the Project Lens materialization contract`);
  }
  if (activity.independentVerification !== undefined) {
    throw new Error(`effect ${input.effectId} already has independent verification`);
  }
}

async function observeBundle(root: string) {
  const candidate = await realpath(root);
  const head = gitText(candidate, ["rev-parse", "--verify", "HEAD"]);
  const status = await readGitStatus(candidate);
  const changedPaths = [...new Set([
    ...status.added,
    ...status.changed,
    ...status.removed,
  ])].sort();
  let source: string | null = null;
  try {
    source = await readFile(join(candidate, PROJECT_LENS_OUTPUT_PATH), "utf8");
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  return {
    head,
    source,
    sha256: source === null ? null : sha256(source),
    changedPaths,
    ignored: gitExitCode(candidate, [
      "check-ignore",
      "--quiet",
      "--",
      PROJECT_LENS_OUTPUT_PATH,
    ]) === 0,
  };
}

function subjectOf(observation: Awaited<ReturnType<typeof observeBundle>>) {
  return {
    gitHead: observation.head,
    files: [{ path: PROJECT_LENS_OUTPUT_PATH, sha256: observation.sha256 }],
  };
}

function gitText(root: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.toString("utf8").trim();
}

function gitExitCode(root: string, args: readonly string[]): number | null {
  return Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  }).exitCode;
}

function valueAt(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function invalid(message: string) {
  return { valid: false, errors: [{ code: "bundle-invalid", message }] };
}

async function sourceDigest(): Promise<string> {
  return sha256(await readFile(new URL(import.meta.url), "utf8"));
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}
