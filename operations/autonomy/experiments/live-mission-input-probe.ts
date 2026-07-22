import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionProfile } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  type MissionInputReceipt,
} from "../src/mission-input";
import {
  MISSION_ANCHOR_SEED_VERSION,
  proposeMissionReconciliation,
  type ActiveIntentAnchor,
} from "../src/mission-reconciliation";
import type { MissionReconciliationCommit } from "../src/mission-reconciliation-commit";
import { verifyMissionReconciliation } from "../src/mission-reconciliation-verification";
import {
  missionRunnerDirectory,
  missionRunnerRequest,
  requestMissionRunner,
} from "../src/mission-runner";

const PROFILE_ID = "opencode-go-deepseek-v4-flash-live-mission-input-v1";
const route = [{
  provider: "opencode-go" as const,
  credential: { source: "env" as const, name: "OPENCODE_API_KEY" },
  model: "deepseek-v4-flash",
}];
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const outputPath = resolve(outputArgument ?? `${tmpdir()}/live-mission-input-probe-${Date.now()}.json`);
const home = await mkdtemp(join(tmpdir(), "atthis-live-mission-input-"));
const missionId = `live-input-${Date.now()}`;
const runtimeModule = fileURLToPath(new URL("./flash-readonly-mission-runtime.ts", import.meta.url));
const seedPath = join(home, "anchor-seed.json");
const commitPath = join(home, "reconciliation-commit.json");
const startedAt = new Date().toISOString();
let runnerStarted = false;
let evidence: Record<string, unknown> = {};

try {
  const initialAnchor: ActiveIntentAnchor = {
    id: `anchor:${missionId}`,
    revision: "probe-r1",
    statement: [
      "Execute the bounded package-identity Mission through a Flash parent and one read-only Flash child.",
      "Preserve the declared source, no-write, no-command, no-fallback, independent-verification, and human-authority boundaries.",
      "Reconcile every newer Principal input before another turn.",
    ].join(" "),
    sourceRefs: ["probe:authorized-mission-envelope"],
    reconciledWatermark: 0,
  };
  await writeFile(seedPath, `${JSON.stringify({
    version: MISSION_ANCHOR_SEED_VERSION,
    id: `seed:${missionId}`,
    missionId,
    authorityRef: "principal:probe-fixture",
    sourceRef: "probe:explicit-initial-authorization",
    anchor: initialAnchor,
  }, null, 2)}\n`, "utf8");

  await requireCliSuccess([
    "runner", "start", missionId,
    "--runtime", runtimeModule,
    "--anchor", seedPath,
    "--home", home,
  ]);
  runnerStarted = true;
  const inputResult = await requireCliSuccess([
    "mission", "input", missionId,
    "继续同一个只读验证；保留已授权的 source、无写入、无命令、无 fallback、独立验证和人类权限边界。",
    "--id", "probe-input-1",
    "--actor", "principal:probe-fixture",
    "--source", "probe:live-external-input",
    "--home", home,
  ]);
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const staleTurn = await waitForTurn(timeline, missionId, (turn) => turn.settlement?.kind === "input-pending");
  const input = await requireInput(timeline, missionId);
  const anchor = await timeline.latestReconciledAnchor(missionId);
  if (anchor === undefined) throw new Error("live Mission lost its authorized initial anchor");

  const proposer = new AiSdkValidationDriver({ route });
  const proposalResult = await proposeMissionReconciliation({
    id: "proposal:probe-input-1",
    missionId,
    anchor,
    input,
    workspaceRoot: resolve(import.meta.dir, "../../.."),
    executionProfile: profile(proposer, "proposal"),
  }, { driver: proposer });
  if (proposalResult.kind !== "proposed") {
    throw new Error(`live reconciliation proposal did not settle: ${proposalResult.reason}`);
  }

  const verifier = new AiSdkValidationDriver({ route });
  const verificationResult = await verifyMissionReconciliation({
    id: "verification:probe-input-1",
    missionId,
    anchor,
    input,
    proposal: proposalResult.proposal,
    workspaceRoot: resolve(import.meta.dir, "../../.."),
    executionProfile: profile(verifier, "verification"),
  }, { driver: verifier });
  if (verificationResult.kind !== "verified") {
    throw new Error(`live reconciliation verification did not settle: ${verificationResult.reason}`);
  }
  if (verificationResult.verification.decision.verdict !== "verified-transition") {
    throw new Error(`live reconciliation was not accepted for transition: ${verificationResult.verification.decision.verdict}`);
  }
  const nextAnchor: ActiveIntentAnchor = {
    id: anchor.id,
    revision: "probe-r2",
    statement: verificationResult.verification.decision.nextAnchorStatement,
    sourceRefs: [...new Set([...anchor.sourceRefs, input.sourceRef])],
    reconciledWatermark: input.watermark,
  };
  const commit: MissionReconciliationCommit = {
    proposal: proposalResult.proposal,
    acceptance: {
      authorityRef: "principal:probe-fixture",
      verification: verificationResult.verification,
      evidenceRefs: [
        `work-cell:${proposalResult.proposal.executionRef.runId}`,
        `work-cell:${verificationResult.verification.executionRef.runId}`,
      ],
      nextAnchor,
    },
  };
  await writeFile(commitPath, `${JSON.stringify(commit, null, 2)}\n`, "utf8");
  const commitResult = await requireCliSuccess([
    "mission", "reconcile", missionId, commitPath, "--home", home,
  ]);
  const successor = await waitForTurn(
    timeline,
    missionId,
    (turn) => turn.start.baselineWatermark === 1 && turn.settlement?.kind === "finished",
  );
  evidence = {
    inputResult,
    staleTurn,
    proposal: proposalResult.proposal,
    proposalRecord: proposalResult.record,
    verification: verificationResult.verification,
    verificationRecord: verificationResult.record,
    commitResult,
    successor,
    timelines: await readTimelines(missionRunnerDirectory(home, missionId)),
  };
} catch (error) {
  evidence = { ...evidence, error: error instanceof Error ? error.message : String(error) };
  throw error;
} finally {
  if (runnerStarted) {
    try {
      await requireCliSuccess(["runner", "shutdown", missionId, "--home", home]);
    } catch (error) {
      evidence = {
        ...evidence,
        shutdownError: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const record = {
    version: "atthis.live-mission-input-probe.v1",
    status: "probe",
    startedAt,
    finishedAt: new Date().toISOString(),
    missionId,
    profile: {
      id: PROFILE_ID,
      provider: "opencode-go",
      model: "deepseek-v4-flash",
      fallback: "none",
      harness: "detached Mission runner, ToolLoopAgent parent, Work Cell child, independent reconciliation Cells",
    },
    evidence,
  };
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await rm(home, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ outputPath, missionId, error: evidence.error })}\n`);
}

function profile(driver: AiSdkValidationDriver, role: string): ExecutionProfile {
  return {
    id: `${PROFILE_ID}:${role}`,
    version: "execution-profile.v1",
    provider: driver.descriptor.provider,
    model: driver.descriptor.model,
    contextPolicy: "one authorized active anchor, exactly the next input, and no wider Mission history",
    toolSurface: "caller-defined reconciliation terminal tools only",
    parallelism: "serial",
  };
}

async function requireInput(timeline: FileMissionTimeline, missionId: string): Promise<MissionInputReceipt> {
  const inputs = await timeline.readInputsAfter(missionId, 0);
  const input = inputs[0];
  if (input === undefined || inputs.length !== 1) throw new Error("probe expected exactly one Mission input");
  return input;
}

async function waitForTurn(
  timeline: FileMissionTimeline,
  missionId: string,
  predicate: (turn: NonNullable<Awaited<ReturnType<FileMissionTimeline["latestTurn"]>>>) => boolean,
) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const turn = await timeline.latestTurn(missionId);
    if (turn !== undefined && predicate(turn)) return turn;
    await Bun.sleep(100);
  }
  throw new Error(`Mission ${missionId} did not reach the expected turn state`);
}

async function requireCliSuccess(args: readonly string[]): Promise<Record<string, unknown>> {
  const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const child = Bun.spawn([process.execPath, script, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr.trim() || `CLI exited with ${exitCode}`);
  return JSON.parse(stdout) as Record<string, unknown>;
}

async function readTimelines(root: string): Promise<Record<string, unknown[]>> {
  const directory = join(root, "timelines");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".jsonl")).sort();
  return Object.fromEntries(await Promise.all(names.map(async (name) => {
    const content = await readFile(join(directory, name), "utf8");
    return [name, content.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown)];
  })));
}
