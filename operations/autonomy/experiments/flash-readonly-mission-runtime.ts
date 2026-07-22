import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { CellInput } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { createValidationModel } from "../../../packages/work-cell/src/validation-model";
import { stableStringify } from "../src/canonical-json";
import {
  DelegateLoopSession,
  type DelegateCall,
} from "../src/delegate-loop";
import type { MissionExecutionController } from "../src/mission-execution-host";
import type {
  MissionRuntimeFactory,
  PreparedMissionExecution,
} from "../src/mission-runtime";
import { digestAnchor } from "../src/mission-reconciliation";
import { MissionSupervisorSession } from "../src/mission-supervisor";
import {
  MISSION_TURN_VERSION,
  type MissionTurnStart,
} from "../src/mission-turn";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../..");
const SOURCE_PATH = "operations/autonomy/package.json";
const SOURCE_REF = `file:${SOURCE_PATH}`;
const OBLIGATION = "extract-autonomy-package-identity";
const CAPABILITY = "read";
const GUARD_REF = "probe:exact-output-and-read-trace-audit";
const PROFILE_ID = "opencode-go-deepseek-v4-flash-ai-sdk-v7-inline-readonly-v1";
const PROFILE_REVISION = "2026-07-18-heldout";
const EVIDENCE_REF = "regeneration/evaluations/2026-07-18-model-capability-heldout.md";

const route = [{
  provider: "opencode-go" as const,
  credential: { source: "env" as const, name: "OPENCODE_API_KEY" },
  model: "deepseek-v4-flash",
}];

const task = [
  `Read ${SOURCE_PATH}.`,
  "Extract the package name, package version, and exact ai dependency version from that source.",
  "Do not infer values from the task or acceptance text; use read_file and report the source path.",
].join(" ");

const acceptance = [
  "The declared source is read through the read_file tool before settlement.",
  "The result contains the source-grounded package name, package version, and ai dependency version.",
  "The result reports completed only when all three values are present in the source.",
];
const expectedCall: DelegateCall = {
  key: OBLIGATION,
  taskId: "task-1",
  task,
  sourceRefs: [SOURCE_REF],
  obligationRefs: [OBLIGATION],
  acceptance,
  capabilityNeed: CAPABILITY,
};

/**
 * Low-consequence live evidence adapter. It deliberately permits only one
 * read-only, externally audited contribution and has no provider fallback.
 */
export const createMissionRuntime: MissionRuntimeFactory = async (context): Promise<PreparedMissionExecution> => {
  const activeAnchor = await context.timeline.latestReconciledAnchor(context.missionId);
  const baselineWatermark = activeAnchor?.reconciledWatermark ?? 0;
  const turn: MissionTurnStart = context.recovery?.action === "resume"
    ? context.recovery.interruptedTurn
    : {
      version: MISSION_TURN_VERSION,
      turnId: `flash-readonly-${randomUUID()}`,
      baselineWatermark,
      ...(activeAnchor === undefined ? {} : { anchorDigest: digestAnchor(activeAnchor) }),
      sourceRefs: [SOURCE_REF, `profile:${PROFILE_ID}@${PROFILE_REVISION}`],
    };
  const selection = createValidationModel({ route });
  const abort = new AbortController();
  const delegate = new DelegateLoopSession({
    id: turn.turnId,
    instructions: [
      "This is a bounded runtime capability probe, not an open-ended Mission.",
      "Delegate exactly one contribution and do not answer the source question yourself.",
      "Use the delegate tool with this exact JSON object:",
      JSON.stringify(expectedCall),
      "After the child result returns, state only whether the contribution settled and whether any obligation remains uncovered.",
    ].join("\n"),
    messages: [{ role: "user", content: "Execute the one declared read-only contribution." }],
    tasks: [{ subject: "Inspect the runtime package", description: task }],
    whole: {
      revision: "flash-readonly-mission-probe-v1",
      sourceRefs: [SOURCE_REF],
      obligations: [OBLIGATION],
      settledContributionKeys: [],
      guardRefs: [GUARD_REF],
      capabilityNeeds: [CAPABILITY],
      reconstructionOwner: "probe:deterministic-auditor",
      workspace: {
        root: REPOSITORY_ROOT,
        readPaths: [SOURCE_PATH],
        writePaths: [],
        excludePaths: [".git"],
        allowedCommands: [],
      },
    },
  }, {
    model: selection.model,
    prepareContribution: async (call) => prepareContribution(call),
    timeline: context.timeline,
    createDriver: () => new AiSdkValidationDriver({ route }),
    concurrency: 1,
    maxModelSteps: 4,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
    maxOutputTokens: 2_000,
    signal: abort.signal,
  });
  const supervisor = new MissionSupervisorSession(
    context.missionId,
    delegate,
    context.timeline,
    turn.baselineWatermark,
  );
  const controller: MissionExecutionController = {
    advance: () => supervisor.advance(),
    resume: () => supervisor.resume(),
    observeInput: (input) => supervisor.observeInput(input),
    cancel: (reason) => abort.abort(reason),
  };
  return { turn, controller };
};

async function prepareContribution(call: DelegateCall) {
  if (stableStringify(call) !== stableStringify(expectedCall)) {
    throw new Error("the probe parent changed its one host-authorized semantic contribution");
  }
  return {
    dependsOn: [],
    taskShape: {
      referenceProfile: { id: PROFILE_ID, revision: PROFILE_REVISION },
      evidence: {
        status: "provisional-observed" as const,
        revision: "2026-07-18-heldout",
        refs: [EVIDENCE_REF],
      },
      disposition: "guarded" as const,
      principalInstability: "structured settlement has prior variance and semantic correctness requires an external exact-value audit",
      guardRefs: [GUARD_REF],
      reconstructionOwner: "probe:deterministic-auditor",
      overloadDisposition: "escalate" as const,
    },
    cell: cell(call),
  };
}

function cell(call: DelegateCall): CellInput {
  return {
    id: call.key,
    intent: call.task,
    workspace: {
      root: REPOSITORY_ROOT,
      readPaths: [SOURCE_PATH],
      writePaths: [],
      excludePaths: [".git"],
      allowedCommands: [],
    },
    instructions: [
      `Read ${SOURCE_PATH} before producing the result.`,
      "Treat absence or ambiguity as unverifiable; do not guess.",
    ],
    capabilities: [CAPABILITY],
    context: [],
    capabilitiesRequired: [call.capabilityNeed],
    acceptance: [...call.acceptance],
    budget: {
      maxSteps: 4,
      estimatedTokens: 20_000,
      estimatedTokensTolerance: 1,
      maxDurationMs: 120_000,
      maxCommandOutputBytes: 4_000,
    },
    executionProfile: {
      id: PROFILE_ID,
      version: "execution-profile.v1",
      provider: "opencode-go",
      model: "deepseek-v4-flash",
      contextPolicy: "one declared source; read-only; no commands",
      toolSurface: "read_file and list_files only",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "unverifiable"] },
        packageName: { type: "string" },
        packageVersion: { type: "string" },
        aiSdkVersion: { type: "string" },
        sourcePath: { type: "string", enum: [SOURCE_PATH] },
      },
      required: ["status", "packageName", "packageVersion", "aiSdkVersion", "sourcePath"],
      additionalProperties: false,
    },
  };
}
