import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionProfile } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { FileMissionTimeline } from "../src/delegate-timeline";
import type { MissionInputReceipt } from "../src/mission-input";
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

const PROFILE_ID = "opencode-go-deepseek-v4-flash-mission-queue-recovery-v1";
const route = [{
  provider: "opencode-go" as const,
  credential: { source: "env" as const, name: "OPENCODE_API_KEY" },
  model: "deepseek-v4-flash",
}];
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const outputPath = resolve(outputArgument ?? `${tmpdir()}/live-mission-queue-recovery-${Date.now()}.json`);
const home = await mkdtemp(join(tmpdir(), "atthis-live-mission-queue-recovery-"));
const missionId = `live-queue-recovery-${Date.now()}`;
const runtimeModule = fileURLToPath(new URL("./flash-readonly-mission-runtime.ts", import.meta.url));
const seedPath = join(home, "anchor-seed.json");
const startedAt = new Date().toISOString();
let runnerLive = false;
let evidence: Record<string, unknown> = {};

try {
  const initialAnchor: ActiveIntentAnchor = {
    id: `anchor:${missionId}`,
    revision: "probe-r1",
    statement: [
      "Execute the bounded package-identity Mission through a Flash parent and one read-only Flash child.",
      "Preserve the declared source, no-write, no-command, no-fallback, independent-verification, and human-authority boundaries.",
      "Reconcile every newer Principal input in watermark order before another turn.",
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

  const firstStart = await startRunner();
  const firstInput = await sendInput(
    "probe-input-1",
    "继续同一个只读验证；所有既有约束不变，并且必须先按水位处理完较新输入。",
    "probe:queued-input-1",
  );
  const secondInput = await sendInput(
    "probe-input-2",
    "再次确认原任务和全部边界不变；只有两条输入都完成独立调和后才能开始新回合。",
    "probe:queued-input-2",
  );
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const staleTurn = await waitForTurn(
    timeline,
    (turn) => turn.settlement?.kind === "input-pending" && turn.settlement.currentWatermark === 2,
  );
  await waitForChildSettlements(1);

  const firstShutdown = await shutdownRunner();
  const secondStart = await startRunner();
  assertState(secondStart, "input-pending", 2, 0);
  await assertTurnStarts(1);

  const receipts = await timeline.readInputsAfter(missionId, 0);
  const receipt1 = requireReceipt(receipts, "probe-input-1", 1);
  const receipt2 = requireReceipt(receipts, "probe-input-2", 2);
  const firstReconciliation = await reconcile(timeline, receipt1);
  assertState(firstReconciliation.commitResult, "input-pending", 2, 1);
  await assertTurnStarts(1);

  const secondShutdown = await shutdownRunner();
  const thirdStart = await startRunner();
  assertState(thirdStart, "input-pending", 2, 1);
  await assertTurnStarts(1);

  const secondReconciliation = await reconcile(timeline, receipt2);
  assertState(secondReconciliation.commitResult, "running", 2, 2);
  const successor = await waitForTurn(
    timeline,
    (turn) => turn.start.baselineWatermark === 2 && turn.settlement?.kind === "finished",
  );
  await assertTurnStarts(2);

  evidence = {
    firstStart,
    inputs: [firstInput, secondInput],
    staleTurn,
    firstShutdown,
    secondStart,
    firstReconciliation,
    secondShutdown,
    thirdStart,
    secondReconciliation,
    successor,
    timelines: await readTimelines(missionRunnerDirectory(home, missionId)),
  };
} catch (error) {
  evidence = { ...evidence, error: error instanceof Error ? error.message : String(error) };
  throw error;
} finally {
  if (runnerLive) {
    try {
      await shutdownRunner();
    } catch (error) {
      evidence = { ...evidence, shutdownError: error instanceof Error ? error.message : String(error) };
    }
  }
  await writeFile(outputPath, `${JSON.stringify({
    version: "atthis.live-mission-queue-recovery-probe.v1",
    status: "probe",
    startedAt,
    finishedAt: new Date().toISOString(),
    missionId,
    profile: {
      id: PROFILE_ID,
      provider: "opencode-go",
      model: "deepseek-v4-flash",
      fallback: "none",
      harness: "three detached carriers, ordered Mission reconciliation, ToolLoopAgent parent, Work Cell children",
    },
    evidence,
  }, null, 2)}\n`, "utf8");
  await rm(home, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ outputPath, missionId, error: evidence.error })}\n`);
}

async function reconcile(timeline: FileMissionTimeline, input: MissionInputReceipt) {
  const anchor = await timeline.latestReconciledAnchor(missionId);
  if (anchor === undefined) throw new Error("Mission lost its active anchor");
  if (input.watermark !== anchor.reconciledWatermark + 1) {
    throw new Error(`input watermark ${input.watermark} is not next after anchor ${anchor.reconciledWatermark}`);
  }
  const proposer = new AiSdkValidationDriver({ route });
  const proposalResult = await proposeMissionReconciliation({
    id: `proposal:${input.inputId}`,
    missionId,
    anchor,
    input,
    workspaceRoot: resolve(import.meta.dir, "../../.."),
    executionProfile: profile(proposer, `proposal-${input.watermark}`),
  }, { driver: proposer });
  if (proposalResult.kind !== "proposed") {
    throw new Error(`proposal ${input.inputId} did not settle: ${proposalResult.reason}`);
  }

  const verifier = new AiSdkValidationDriver({ route });
  const verificationResult = await verifyMissionReconciliation({
    id: `verification:${input.inputId}`,
    missionId,
    anchor,
    input,
    proposal: proposalResult.proposal,
    workspaceRoot: resolve(import.meta.dir, "../../.."),
    executionProfile: profile(verifier, `verification-${input.watermark}`),
  }, { driver: verifier });
  if (verificationResult.kind !== "verified") {
    throw new Error(`verification ${input.inputId} did not settle: ${verificationResult.reason}`);
  }
  if (verificationResult.verification.decision.verdict !== "verified-transition") {
    throw new Error(`verification ${input.inputId} returned ${verificationResult.verification.decision.verdict}`);
  }

  const nextAnchor: ActiveIntentAnchor = {
    id: anchor.id,
    revision: `probe-r${input.watermark + 1}`,
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
  const commitPath = join(home, `reconciliation-${input.watermark}.json`);
  await writeFile(commitPath, `${JSON.stringify(commit, null, 2)}\n`, "utf8");
  const commitResult = await requireCliSuccess([
    "mission", "reconcile", missionId, commitPath, "--home", home,
  ]);
  return {
    input,
    proposal: proposalResult.proposal,
    proposalRecord: proposalResult.record,
    verification: verificationResult.verification,
    verificationRecord: verificationResult.record,
    nextAnchor,
    commitResult,
  };
}

function profile(driver: AiSdkValidationDriver, role: string): ExecutionProfile {
  return {
    id: `${PROFILE_ID}:${role}`,
    version: "execution-profile.v1",
    provider: driver.descriptor.provider,
    model: driver.descriptor.model,
    contextPolicy: "one active anchor and exactly its next queued input",
    toolSurface: "caller-defined reconciliation terminal tools only",
    parallelism: "serial",
  };
}

async function startRunner(): Promise<Record<string, unknown>> {
  const result = await requireCliSuccess([
    "runner", "start", missionId,
    "--runtime", runtimeModule,
    "--anchor", seedPath,
    "--home", home,
  ]);
  runnerLive = true;
  return result;
}

async function shutdownRunner(): Promise<Record<string, unknown>> {
  const result = await requireCliSuccess(["runner", "shutdown", missionId, "--home", home]);
  runnerLive = false;
  await waitForRunnerOffline();
  return result;
}

async function sendInput(id: string, text: string, source: string): Promise<Record<string, unknown>> {
  return await requireCliSuccess([
    "mission", "input", missionId, text,
    "--id", id,
    "--actor", "principal:probe-fixture",
    "--source", source,
    "--home", home,
  ]);
}

function requireReceipt(
  inputs: readonly MissionInputReceipt[],
  inputId: string,
  watermark: number,
): MissionInputReceipt {
  const input = inputs.find((candidate) => candidate.inputId === inputId);
  if (input === undefined || input.watermark !== watermark) {
    throw new Error(`Mission did not retain ${inputId} at watermark ${watermark}`);
  }
  return input;
}

function assertState(
  value: Record<string, unknown>,
  state: string,
  inputWatermark: number,
  reconciledWatermark: number,
): void {
  const status = value.status !== null && typeof value.status === "object"
    ? value.status as Record<string, unknown>
    : value;
  if (
    status.state !== state
    || status.inputWatermark !== inputWatermark
    || status.reconciledWatermark !== reconciledWatermark
  ) {
    throw new Error(`unexpected runner state: ${JSON.stringify(status)}`);
  }
}

async function assertTurnStarts(expected: number): Promise<void> {
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const events = await readJsonLines(timeline.timelinePath(missionId));
  const actual = events.filter((event) => event.type === "mission.turn-started").length;
  if (actual !== expected) throw new Error(`expected ${expected} Mission turn starts, observed ${actual}`);
}

async function waitForTurn(
  timeline: FileMissionTimeline,
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

async function waitForChildSettlements(expected: number): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const timelines = await readTimelines(missionRunnerDirectory(home, missionId));
    const actual = Object.values(timelines).flat().filter((event) => event.type === "delegate.child-settled").length;
    if (actual >= expected) return;
    await Bun.sleep(100);
  }
  throw new Error(`Mission ${missionId} did not retain ${expected} child settlements`);
}

async function waitForRunnerOffline(): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await requestMissionRunner(home, missionId, missionRunnerRequest({ kind: "status" }), 100);
    } catch {
      return;
    }
    await Bun.sleep(25);
  }
  throw new Error(`Mission runner ${missionId} did not stop`);
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

async function readTimelines(root: string): Promise<Record<string, Record<string, unknown>[]>> {
  const directory = join(root, "timelines");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".jsonl")).sort();
  return Object.fromEntries(await Promise.all(names.map(async (name) => [
    name,
    await readJsonLines(join(directory, name)),
  ])));
}

async function readJsonLines(path: string): Promise<Record<string, unknown>[]> {
  const content = await readFile(path, "utf8");
  return content.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
}
