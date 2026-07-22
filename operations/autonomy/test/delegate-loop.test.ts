import { afterEach, expect, test } from "bun:test";
import type { LanguageModelV4CallOptions, LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage } from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";
import { Workspace } from "../../../packages/work-cell/src/workspace";
import {
  admitPreparedDelegateBatch,
  DelegateAdmissionError,
  runPreparedDelegateBatch,
  type CapabilityDisposition,
  type PreparedDelegateBatch,
  type TaskShapeAdmission,
} from "../src/delegate-admission";
import {
  DelegateLoopSession,
  runDelegateLoop,
  type DelegateBatchCheckpoint,
  type DelegateCall,
  type DelegateTimeline,
  type PreparedDelegateExecution,
} from "../src/delegate-loop";
import { FileMissionTimeline } from "../src/delegate-timeline";
import type { MissionExecutionController } from "../src/mission-execution-host";
import {
  missionRunnerDirectory,
  missionRunnerRequest,
  requestMissionRunner,
  runMissionRunner,
  type MissionRunnerResponse,
} from "../src/mission-runner";
import { MissionSupervisorSession } from "../src/mission-supervisor";
import { MISSION_TURN_VERSION } from "../src/mission-turn";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("one AI SDK step collects an independent delegate batch before dispatch and returns compact results", async () => {
  const root = await fixture();
  let modelCalls = 0;
  let secondPrompt: LanguageModelV4CallOptions["prompt"] | undefined;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      modelCalls += 1;
      if (modelCalls === 1) {
        return response([
          toolCall("call-contract", call("contract", "inspect-contract", "source:contract")),
          toolCall("call-callers", call("callers", "inspect-callers", "source:callers")),
        ], "tool-calls");
      }
      secondPrompt = options.prompt;
      return response([{ type: "text", text: "The admitted contributions are ready for reconstruction." }], "stop");
    },
  });
  let prepared = 0;
  let drivers = 0;
  const order: string[] = [];
  const fileTimeline = new FileMissionTimeline(join(root, ".mission"));
  let capturedCheckpoint: DelegateBatchCheckpoint | undefined;

  const result = await runDelegateLoop(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => {
      prepared += 1;
      return execution(root, delegateCall, delegateCall.key === "callers" ? "guarded" : "reliable-primitive");
    },
    timeline: trackingTimeline(fileTimeline, order, (checkpoint) => {
      capturedCheckpoint = checkpoint;
      expect(checkpoint.invocations.map((invocation) => invocation.toolCallId)).toEqual([
        "call-contract",
        "call-callers",
      ]);
      expect(checkpoint.responseMessages).toHaveLength(1);
      expect(checkpoint.admission.contributions).toHaveLength(2);
      expect(checkpoint.parentUsage).toEqual({
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        cachedInputTokens: 0,
      });
    }),
    createDriver: () => {
      order.push("driver");
      drivers += 1;
      return new ResultDriver("completed");
    },
    concurrency: 8,
    maxModelSteps: 3,
    maxDelegateBatches: 2,
    maxCallsPerStep: 8,
  });

  expect(prepared).toBe(2);
  expect(drivers).toBe(2);
  expect(order).toEqual(["prepare", "dispatch", "driver", "driver", "settle", "resolve"]);
  expect(result.status).toBe("returned");
  expect(result.batches).toHaveLength(1);
  expect(result.batches[0]?.outcomes.map((outcome) => [outcome.key, outcome.status])).toEqual([
    ["contract", "completed"],
    ["callers", "completed"],
  ]);
  expect(result.uncoveredObligations).toEqual(["document-boundary"]);
  expect(result.usage.totalTokens).toBe(4);

  const firstRequest = JSON.stringify(model.doGenerateCalls[0]);
  expect(firstRequest).toContain("A role label");
  expect(firstRequest).toContain("Uncovered contribution obligations");
  const toolDefinition = JSON.stringify(model.doGenerateCalls[0]?.tools);
  expect(toolDefinition).not.toContain("resultContractRef");
  expect(toolDefinition).not.toContain("workspace");
  expect(toolDefinition).not.toContain("taskShape");
  expect(toolDefinition).not.toContain("concurrency");

  const returnedContext = JSON.stringify(secondPrompt);
  expect(returnedContext).toContain("uncoveredObligationRefs");
  expect(returnedContext).toContain("document-boundary");
  expect(returnedContext).not.toContain("bounded contribution completed");
  expect(returnedContext).not.toContain("rawSteps");

  expect(capturedCheckpoint).toBeDefined();
  const recovered = await fileTimeline.recoverBatch("mission-turn-1", "mission-turn-1:batch:1");
  expect(recovered.ready).toBe(true);
  expect(recovered.children).toHaveLength(2);
  const parentTimeline = await readFile(fileTimeline.timelinePath("mission-turn-1"), "utf8");
  expect(parentTimeline).toContain("delegate.batch-prepared");
  expect(parentTimeline).toContain("delegate.batch-ready");
  expect(parentTimeline).not.toContain("delegate.child-settled");
  expect(parentTimeline).not.toContain("large child context");
  for (const child of recovered.children) {
    const childTimeline = await readFile(fileTimeline.timelinePath(child.timelineId), "utf8");
    expect(childTimeline).toContain("delegate.child-opened");
    expect(childTimeline).toContain("delegate.child-dispatched");
    expect(childTimeline).toContain("delegate.child-settled");
  }
});

test("the parent creates a host-owned task before delegating it and child settlement completes that task", async () => {
  const root = await fixture();
  let calls = 0;
  let checkpoint: DelegateBatchCheckpoint | undefined;
  const delegateCall = call("contract", "inspect-contract", "source:contract");
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return response([taskCreateToolCall(
          "create-contract-task",
          "Inspect contract",
          "Inspect the bounded contract before reconstruction.",
        )], "tool-calls");
      }
      if (calls === 2) return response([toolCall("delegate-contract", delegateCall)], "tool-calls");
      return response([{ type: "text", text: "The delegated task settled." }], "stop");
    },
  });
  const original = loopInput(root);
  const { tasks: _seededTasks, ...withoutTasks } = original;
  const result = await runDelegateLoop(withoutTasks, {
    model,
    prepareContribution: async (call) => execution(root, call, "reliable-primitive"),
    timeline: trackingTimeline(
      new FileMissionTimeline(join(root, ".mission-dynamic-task")),
      [],
      (value) => { checkpoint = value; },
    ),
    createDriver: () => new ResultDriver("completed"),
    concurrency: 1,
    maxModelSteps: 4,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
  });

  expect(checkpoint?.tasks).toEqual([expect.objectContaining({
    id: "task-1",
    status: "in_progress",
    owner: "delegate:contract",
  })]);
  expect(result.tasks).toEqual([expect.objectContaining({ id: "task-1", status: "completed" })]);
  expect(calls).toBe(3);
});

test("delegate_file keeps a large semantic task out of parent model messages and returns child evidence by file", async () => {
  const root = await fixture();
  const largeMarker = `FILE_ONLY_CONTEXT_${"x".repeat(16_000)}`;
  const packet = call("file-contract", "inspect-contract", "source:contract");
  packet.task = `Inspect the bounded contract. ${largeMarker}`;
  await writeFile(join(root, "delegate-call.json"), `${JSON.stringify(packet)}\n`, "utf8");
  let modelCalls = 0;
  let secondPrompt: LanguageModelV4CallOptions["prompt"] | undefined;
  let preparedTask = "";
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      modelCalls += 1;
      if (modelCalls === 1) {
        return response([fileToolCall("file-call", { inputFile: "delegate-call.json" })], "tool-calls");
      }
      secondPrompt = options.prompt;
      return response([{ type: "text", text: "File-backed contribution settled." }], "stop");
    },
  });

  const result = await runDelegateLoop(loopInput(root), {
    model,
    delegateInputRoot: root,
    prepareContribution: async (delegateCall) => {
      preparedTask = delegateCall.task;
      await writeFile(join(root, "delegate-call.json"), `${JSON.stringify({ ...packet, task: "replacement" })}\n`, "utf8");
      return execution(root, delegateCall, "reliable-primitive");
    },
    timeline: new FileMissionTimeline(join(root, ".mission-file")),
    createDriver: () => new ResultDriver("completed"),
    concurrency: 1,
    maxModelSteps: 2,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
  });

  expect(preparedTask).toContain(largeMarker);
  expect(JSON.stringify(model.doGenerateCalls[0]?.tools)).toContain("delegate_file");
  expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).not.toContain(largeMarker);
  expect(JSON.stringify(secondPrompt)).not.toContain(largeMarker);
  const invocation = result.batches[0]!.invocations[0]!;
  expect(invocation.toolName).toBe("delegate_file");
  expect(invocation.input.kind).toBe("file");
  if (invocation.input.kind !== "file") throw new Error("expected a frozen file invocation");
  expect(invocation.input.path.endsWith("/delegate-call.json")).toBe(true);
  expect(invocation.input.bytes).toBeGreaterThan(16_000);
  const resultFile = result.batches[0]!.outcomes[0]!.resultFile;
  expect(resultFile).toBeString();
  expect(await readFile(resultFile!, "utf8")).toContain("delegate.child-settled");
  expect(JSON.stringify(secondPrompt)).toContain(resultFile!);
});

test("the convener writes a large packet in its tool loop, compacts it, then submits one atomic delegate_file step", async () => {
  const root = await fixture();
  const marker = `TOOL_LOOP_FILE_CONTEXT_${"y".repeat(16_000)}`;
  const packet = { ...call("written-contract", "inspect-contract", "source:contract"), task: marker };
  const content = JSON.stringify(packet);
  const sha256 = createHash("sha256").update(content).digest("hex");
  const writer = await Workspace.create({
    root,
    readPaths: ["delegate-packets"],
    writePaths: ["delegate-packets"],
    excludePaths: [".git"],
    allowedCommands: [],
  }, {
    maxSteps: 4,
    maxDurationMs: 10_000,
    maxCommandOutputBytes: 4_000,
  });
  let modelCalls = 0;
  let drivers = 0;
  let capturedCheckpoint: DelegateBatchCheckpoint | undefined;
  const prompts: LanguageModelV4CallOptions["prompt"][] = [];
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      modelCalls += 1;
      prompts.push(options.prompt);
      if (modelCalls === 1) {
        return response([
          writeFileToolCall("write-packet", "delegate-packets/contract.json", content),
        ], "tool-calls");
      }
      if (modelCalls === 2) {
        expect(drivers).toBe(0);
        return response([
          fileToolCall("submit-packet", { inputFile: "delegate-packets/contract.json", sha256 }),
        ], "tool-calls");
      }
      return response([{ type: "text", text: "The file-backed child settled." }], "stop");
    },
  });

  const timeline = new FileMissionTimeline(join(root, ".mission-written-file"));
  const result = await runDelegateLoop(loopInput(root), {
    model,
    delegateInputRoot: root,
    delegateFileWriter: writer,
    prepareContribution: async (delegateCall) => execution(root, delegateCall, "reliable-primitive"),
    timeline: trackingTimeline(timeline, [], (checkpoint) => { capturedCheckpoint = checkpoint; }),
    createDriver: () => {
      drivers += 1;
      return new ResultDriver("completed");
    },
    concurrency: 1,
    maxModelSteps: 4,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
  });

  expect(modelCalls).toBe(3);
  expect(drivers).toBe(1);
  expect(await readFile(join(root, "delegate-packets/contract.json"), "utf8")).toBe(content);
  expect(JSON.stringify(prompts[1])).not.toContain(marker);
  expect(JSON.stringify(prompts[1])).toContain(`persisted ${content.length} characters`);
  expect(JSON.stringify(prompts[2])).not.toContain(marker);
  expect(JSON.stringify(capturedCheckpoint?.responseMessages)).not.toContain(marker);
  expect(capturedCheckpoint?.invocations[0]).toMatchObject({
    toolName: "delegate_file",
    input: { kind: "file", sha256 },
  });
  expect(result.batches[0]?.outcomes[0]?.resultFile).toBeString();
});

test("a mixed preparation and delegate step starts no child before the host rejects it", async () => {
  const root = await fixture();
  const writer = await Workspace.create({
    root,
    readPaths: ["delegate-packets"],
    writePaths: ["delegate-packets"],
    excludePaths: [".git"],
    allowedCommands: [],
  }, { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 });
  const inline = call("mixed", "inspect-contract", "source:contract");
  const model = new MockLanguageModelV4({
    doGenerate: async () => response([
      writeFileToolCall("mixed-write", "delegate-packets/mixed.json", JSON.stringify(inline)),
      toolCall("mixed-delegate", inline),
    ], "tool-calls"),
  });
  let prepared = 0;
  let drivers = 0;

  await expect(runDelegateLoop(loopInput(root), {
    model,
    delegateInputRoot: root,
    delegateFileWriter: writer,
    prepareContribution: async (delegateCall) => {
      prepared += 1;
      return execution(root, delegateCall, "reliable-primitive");
    },
    timeline: new FileMissionTimeline(join(root, ".mission-mixed-step")),
    createDriver: () => {
      drivers += 1;
      return new ResultDriver("completed");
    },
    concurrency: 1,
    maxModelSteps: 2,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
  })).rejects.toThrow("cannot mix preparation tools with delegate calls");

  expect(prepared).toBe(0);
  expect(drivers).toBe(0);
});

test("an unsupported prepared contribution rejects the complete model step before any Cell driver exists", async () => {
  const root = await fixture();
  const model = new MockLanguageModelV4({
    doGenerate: async () => response([
      toolCall("call-contract", call("contract", "inspect-contract", "source:contract")),
      toolCall("call-callers", call("callers", "inspect-callers", "source:callers")),
    ], "tool-calls"),
  });
  let prepared = 0;
  let drivers = 0;
  const timeline = new FileMissionTimeline(join(root, ".mission"));

  await expect(runDelegateLoop(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => {
      prepared += 1;
      return execution(
        root,
        delegateCall,
        delegateCall.key === "callers" ? "unsupported-escalate" : "reliable-primitive",
      );
    },
    timeline,
    createDriver: () => {
      drivers += 1;
      return new ResultDriver("completed");
    },
    concurrency: 2,
    maxModelSteps: 2,
    maxDelegateBatches: 1,
    maxCallsPerStep: 4,
  })).rejects.toThrow(DelegateAdmissionError);

  expect(prepared).toBe(2);
  expect(drivers).toBe(0);
  await expect(readFile(timeline.timelinePath("mission-turn-1"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
});

test("a checkpoint failure prevents every admitted Cell from starting", async () => {
  const root = await fixture();
  const model = new MockLanguageModelV4({
    doGenerate: async () => response([
      toolCall("call-contract", call("contract", "inspect-contract", "source:contract")),
      toolCall("call-callers", call("callers", "inspect-callers", "source:callers")),
    ], "tool-calls"),
  });
  let drivers = 0;

  await expect(runDelegateLoop(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => execution(root, delegateCall, "reliable-primitive"),
    timeline: failingTimeline("timeline unavailable"),
    createDriver: () => {
      drivers += 1;
      return new ResultDriver("completed");
    },
    concurrency: 2,
    maxModelSteps: 2,
    maxDelegateBatches: 1,
    maxCallsPerStep: 4,
  })).rejects.toThrow("timeline unavailable");

  expect(drivers).toBe(0);
});

test("a truthful needs_repartition result stops continuation and returns its obligation to the whole", async () => {
  const root = await fixture();
  let modelCalls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      modelCalls += 1;
      return response([
        toolCall("call-contract", call("contract", "inspect-contract", "source:contract")),
      ], "tool-calls");
    },
  });

  const result = await runDelegateLoop(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => execution(root, delegateCall, "guarded"),
    timeline: new FileMissionTimeline(join(root, ".mission")),
    createDriver: () => new ResultDriver("needs_repartition"),
    concurrency: 1,
    maxModelSteps: 3,
    maxDelegateBatches: 2,
    maxCallsPerStep: 4,
  });

  expect(modelCalls).toBe(1);
  expect(result.status).toBe("needs-attention");
  expect(result.batches[0]?.outcomes[0]?.status).toBe("needs_repartition");
  expect(result.uncoveredObligations).toEqual([
    "inspect-contract",
    "inspect-callers",
    "document-boundary",
  ]);
});

test("parent recovery remains pending until child timelines settle and rejects a conflicting replay", async () => {
  const root = await fixture();
  const { batchInput, calls, checkpoint } = preparedBatch(root, "recovery");
  const timeline = new FileMissionTimeline(join(root, ".mission-recovery"));

  await timeline.prepareBatch(checkpoint);
  await timeline.prepareBatch(checkpoint);
  expect(await timeline.resolveBatch(checkpoint)).toBeUndefined();
  expect((await timeline.recoverBatch(checkpoint.parentLoopId, checkpoint.id)).ready).toBe(false);

  await timeline.markBatchDispatched(checkpoint);
  await timeline.markBatchDispatched(checkpoint);
  const run = await runPreparedDelegateBatch(batchInput, () => new ResultDriver("completed"), {
    concurrency: 2,
  });
  const outcomes = run.kind === "swarm"
    ? run.record.outcomes.map((outcome, index) => {
        if (outcome.kind === "runner_error") {
          return { key: calls[index]!.key, cellId: outcome.cellId, status: "runner_error", artifactRefs: [] };
        }
        return {
          key: calls[index]!.key,
          cellId: outcome.cellId,
          status: "completed",
          runId: outcome.record.runId,
          artifactRefs: outcome.record.artifacts.map((artifact) => artifact.path),
        };
      })
    : [];
  await timeline.recordBatchSettlements({ checkpoint, run, outcomes });
  const resolved = await timeline.resolveBatch(checkpoint);
  expect(resolved?.map((outcome) => outcome.key)).toEqual(["contract", "callers"]);
  expect((await timeline.recoverBatch(checkpoint.parentLoopId, checkpoint.id)).ready).toBe(true);

  await timeline.recordBatchSettlements({ checkpoint, run, outcomes });
  await timeline.resolveBatch(checkpoint);
  const parentEvents = (await readFile(timeline.timelinePath(checkpoint.parentLoopId), "utf8"))
    .trim().split("\n").map((line) => JSON.parse(line) as { type: string });
  expect(parentEvents.filter((event) => event.type === "delegate.batch-prepared")).toHaveLength(1);
  expect(parentEvents.filter((event) => event.type === "delegate.batch-ready")).toHaveLength(1);

  const conflicting = outcomes.map((outcome, index) =>
    index === 0 ? { ...outcome, status: "unverifiable" } : outcome
  );
  await expect(timeline.recordBatchSettlements({ checkpoint, run, outcomes: conflicting }))
    .rejects.toThrow("conflicting settlement");
});

test("checkpoint admission rejects a Task snapshot that is not bound to its delegate", async () => {
  const root = await fixture();
  const { checkpoint } = preparedBatch(root, "invalid-task-binding");
  const damaged: DelegateBatchCheckpoint = {
    ...checkpoint,
    tasks: checkpoint.tasks.map((task, index) =>
      index === 0 ? { ...task, owner: "delegate:someone-else" } : task
    ),
  };

  await expect(new FileMissionTimeline(join(root, ".mission-invalid-task-binding")).prepareBatch(damaged))
    .rejects.toThrow("does not bind task task-1 to contract");
});

test("DelegateLoopSession parks the parent and resumes its model only after the child barrier", async () => {
  const root = await fixture();
  let modelCalls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      modelCalls += 1;
      if (modelCalls === 1) {
        return response([
          toolCall("async-contract", call("contract", "inspect-contract", "source:contract")),
          toolCall("async-callers", call("callers", "inspect-callers", "source:callers")),
        ], "tool-calls");
      }
      return response([{ type: "text", text: "Parent resumed after the child barrier." }], "stop");
    },
  });
  const timeline = new FileMissionTimeline(join(root, ".mission-async"));
  const barrier = new ManualResultBarrier(2);
  const session = new DelegateLoopSession(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => execution(root, delegateCall, "reliable-primitive"),
    timeline,
    createDriver: () => new BlockingResultDriver(barrier),
    concurrency: 2,
    maxModelSteps: 3,
    maxDelegateBatches: 2,
    maxCallsPerStep: 4,
  });

  const parked = await session.advance();
  expect(parked.kind).toBe("parked");
  if (parked.kind !== "parked") throw new Error("expected parked delegate loop");
  await barrier.waitUntilBlocked();
  expect(modelCalls).toBe(1);
  expect((await session.resume()).kind).toBe("parked");
  expect((await timeline.recoverBatch(parked.checkpoint.parentLoopId, parked.checkpoint.id)).ready).toBe(false);

  barrier.release();
  await parked.handle.settled;
  expect((await session.resume()).kind).toBe("ready");
  expect(modelCalls).toBe(1);
  const finished = await session.advance();
  expect(finished.kind).toBe("finished");
  if (finished.kind !== "finished") throw new Error("expected finished delegate loop");
  expect(finished.run.text).toBe("Parent resumed after the child barrier.");
  expect(modelCalls).toBe(2);
});

test("Mission runner wakes a parked real Agent turn and withholds it after durable input advances", async () => {
  const root = await fixture();
  const missionId = "mission-turn-1";
  const runnerRoot = join(root, ".runner-home");
  let modelCalls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      modelCalls += 1;
      if (modelCalls === 1) {
        return response([
          toolCall("stale-contract", call("contract", "inspect-contract", "source:contract")),
          toolCall("stale-callers", call("callers", "inspect-callers", "source:callers")),
        ], "tool-calls");
      }
      return response([{ type: "text", text: "This stale turn must not run." }], "stop");
    },
  });
  const timeline = new FileMissionTimeline(missionRunnerDirectory(runnerRoot, missionId));
  const barrier = new ManualResultBarrier(2);
  const executionAbort = new AbortController();
  const delegate = new DelegateLoopSession(loopInput(root), {
    model,
    prepareContribution: async (delegateCall) => execution(root, delegateCall, "reliable-primitive"),
    timeline,
    createDriver: () => new BlockingResultDriver(barrier),
    concurrency: 2,
    maxModelSteps: 3,
    maxDelegateBatches: 2,
    maxCallsPerStep: 4,
    signal: executionAbort.signal,
  });
  const supervisor = new MissionSupervisorSession(missionId, delegate, timeline, 0);
  let revealParked!: (transition: Extract<Awaited<ReturnType<typeof supervisor.advance>>, { kind: "parked" }>) => void;
  const parked = new Promise<Extract<Awaited<ReturnType<typeof supervisor.advance>>, { kind: "parked" }>>((resolve) => {
    revealParked = resolve;
  });
  let revealWithheld!: (transition: Extract<Awaited<ReturnType<typeof supervisor.resume>>, { kind: "input-pending" }>) => void;
  const withheld = new Promise<Extract<Awaited<ReturnType<typeof supervisor.resume>>, { kind: "input-pending" }>>((resolve) => {
    revealWithheld = resolve;
  });
  const executionController: MissionExecutionController = {
    async advance() {
      const transition = await supervisor.advance();
      if (transition.kind === "parked") revealParked(transition);
      return transition;
    },
    async resume() {
      const transition = await supervisor.resume();
      if (transition.kind === "input-pending") revealWithheld(transition);
      return transition;
    },
    observeInput(input) { supervisor.observeInput(input); },
    cancel(reason) { executionAbort.abort(reason); },
  };
  const runner = runMissionRunner({
    root: runnerRoot,
    missionId,
    prepareExecution: async (context) => {
      expect(context.timeline.timelinePath(missionId)).toBe(timeline.timelinePath(missionId));
      return {
        turn: {
          version: MISSION_TURN_VERSION,
          turnId: "turn-safe-point-1",
          baselineWatermark: 0,
          sourceRefs: ["test:durable-safe-point"],
        },
        controller: executionController,
      };
    },
  });
  await waitForRunner(runnerRoot, missionId);
  const parkedTransition = await parked;
  await barrier.waitUntilBlocked();
  const accepted = requireRunnerSuccess(await requestMissionRunner(
    runnerRoot,
    missionId,
    missionRunnerRequest({
      kind: "input",
      input: {
        id: "correction-1",
        actorRef: "principal:local",
        sourceRef: "terminal:primary",
        payload: { kind: "contribution", text: "Use the corrected contract before continuing." },
      },
    }),
  ));
  expect(accepted).toMatchObject({
    status: { state: "input-pending", inputWatermark: 1 },
    receipt: { inputId: "correction-1", watermark: 1 },
  });
  expect((await withheld).kind).toBe("input-pending");
  barrier.release();
  await parkedTransition.handle.settled;

  expect(modelCalls).toBe(1);
  expect((await timeline.recoverBatch(
    parkedTransition.checkpoint.parentLoopId,
    parkedTransition.checkpoint.id,
  )).ready).toBe(true);
  await waitForTurnSettlement(timeline, missionId);
  expect(await timeline.latestTurn(missionId)).toMatchObject({
    start: { turnId: "turn-safe-point-1", baselineWatermark: 0 },
    settlement: {
      kind: "input-pending",
      turnWatermark: 0,
      currentWatermark: 1,
      activeBatchId: parkedTransition.checkpoint.id,
    },
  });
  await requestMissionRunner(runnerRoot, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await runner;
});

class ResultDriver implements CellDriver {
  readonly descriptor = { adapter: "delegate-loop-test", provider: "deterministic", model: "fixture" };

  constructor(private readonly status: "completed" | "needs_repartition" | "unverifiable") {}

  async run(input: CellInput, _context: DriverContext): Promise<DriverResult> {
    return {
      finalText: `bounded contribution completed: ${input.id}`,
      output: { status: this.status, summary: `result for ${input.id}` },
      terminalToolsCalled: [],
      usage: usage(10),
      rawSteps: [{ hidden: "large child context" }],
    };
  }
}

class BlockingResultDriver extends ResultDriver {
  constructor(private readonly barrier: ManualResultBarrier) { super("completed"); }

  override async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    await this.barrier.enter();
    return super.run(input, context);
  }
}

class ManualResultBarrier {
  private arrived = 0;
  private readonly blocked: Promise<void>;
  private resolveBlocked!: () => void;
  private readonly released: Promise<void>;
  private resolveReleased!: () => void;

  constructor(private readonly expected: number) {
    this.blocked = new Promise<void>((resolve) => { this.resolveBlocked = resolve; });
    this.released = new Promise<void>((resolve) => { this.resolveReleased = resolve; });
  }

  async enter(): Promise<void> {
    this.arrived += 1;
    if (this.arrived === this.expected) this.resolveBlocked();
    await this.released;
  }

  waitUntilBlocked(): Promise<void> { return this.blocked; }
  release(): void { this.resolveReleased(); }
}

function loopInput(root: string) {
  return {
    id: "mission-turn-1",
    instructions: "Advance the bounded documentation mission.",
    messages: [{ role: "user" as const, content: "Inspect the contract and its callers." }],
    tasks: [
      { subject: "Inspect contract", description: "Inspect the bounded contract." },
      { subject: "Inspect callers", description: "Inspect the bounded callers." },
    ],
    whole: whole(root),
  };
}

function whole(root: string): PreparedDelegateBatch["whole"] {
  return {
    revision: "whole-revision-1",
    sourceRefs: ["source:contract", "source:callers"],
    obligations: ["inspect-contract", "inspect-callers", "document-boundary"],
    settledContributionKeys: [],
    guardRefs: ["guard:independent-claim-check"],
    capabilityNeeds: ["read"],
    reconstructionOwner: "mission:turn-1-reconstruction",
    workspace: {
      root,
      readPaths: ["."],
      writePaths: [],
      excludePaths: [".git"],
      allowedCommands: [],
    },
  };
}

function preparedBatch(root: string, suffix: string) {
  const calls = [
    call("contract", "inspect-contract", "source:contract"),
    call("callers", "inspect-callers", "source:callers"),
  ];
  const batchInput: PreparedDelegateBatch = {
    id: `mission-turn-1:batch:${suffix}`,
    whole: whole(root),
    contributions: calls.map((delegateCall) => ({
      ...delegateCall,
      ...execution(root, delegateCall, "reliable-primitive"),
    })),
  };
  const checkpoint: DelegateBatchCheckpoint = {
    id: batchInput.id,
    parentLoopId: "mission-turn-1",
    wholeRevision: batchInput.whole.revision,
    parentUsage: usage(0),
    tasks: calls.map((delegateCall) => ({
      id: delegateCall.taskId,
      subject: `Task for ${delegateCall.key}`,
      description: delegateCall.task,
      status: "in_progress" as const,
      owner: `delegate:${delegateCall.key}`,
      blockedBy: [],
    })),
    invocations: calls.map((delegateCall, index) => ({
      toolCallId: `${suffix}-call-${index + 1}`,
      toolName: "delegate" as const,
      call: delegateCall,
      input: { kind: "inline" as const },
    })),
    responseMessages: [],
    admission: admitPreparedDelegateBatch(batchInput),
  };
  return { batchInput, calls, checkpoint };
}

function call(key: string, obligation: string, source: string): DelegateCall {
  return {
    key,
    taskId: obligation === "inspect-contract" ? "task-1" : "task-2",
    task: `Complete bounded contribution ${key}`,
    sourceRefs: [source],
    obligationRefs: [obligation],
    acceptance: ["Return the locally supported result and any missing evidence"],
    capabilityNeed: "read",
  };
}

function execution(
  root: string,
  delegateCall: DelegateCall,
  disposition: CapabilityDisposition,
): PreparedDelegateExecution {
  return {
    label: disposition === "unsupported-escalate" ? "senior reviewer" : "bounded inspector",
    dependsOn: [],
    taskShape: taskShape(disposition),
    cell: cell(root, delegateCall),
  };
}

function taskShape(disposition: CapabilityDisposition): TaskShapeAdmission {
  return {
    referenceProfile: { id: "flash-main", revision: "profile-revision-1" },
    evidence: {
      status: disposition === "unsupported-escalate" ? "discovery-needed" : disposition === "guarded" ? "provisional-observed" : "admitted",
      revision: "evidence-revision-1",
      refs: ["evidence:matched-probe"],
    },
    disposition,
    principalInstability: "bounded completeness risk",
    guardRefs: disposition === "guarded" ? ["guard:independent-claim-check"] : [],
    reconstructionOwner: "mission:turn-1-reconstruction",
    overloadDisposition: "repartition",
  };
}

function cell(root: string, delegateCall: DelegateCall): CellInput {
  return {
    id: delegateCall.key,
    intent: delegateCall.task,
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [".git"], allowedCommands: [] },
    instructions: ["Use only the supplied bounded evidence."],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: [delegateCall.capabilityNeed],
    acceptance: [...delegateCall.acceptance],
    budget: { maxSteps: 4, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    executionProfile: {
      id: "flash-main",
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "needs_repartition", "unverifiable"] },
        summary: { type: "string" },
      },
      required: ["status", "summary"],
      additionalProperties: false,
    },
  };
}

function toolCall(toolCallId: string, input: DelegateCall) {
  return {
    type: "tool-call" as const,
    toolCallId,
    toolName: "delegate",
    input: JSON.stringify(input),
  };
}

function fileToolCall(toolCallId: string, input: { inputFile: string; sha256?: string }) {
  return {
    type: "tool-call" as const,
    toolCallId,
    toolName: "delegate_file",
    input: JSON.stringify(input),
  };
}

function writeFileToolCall(toolCallId: string, path: string, content: string) {
  return {
    type: "tool-call" as const,
    toolCallId,
    toolName: "write_file",
    input: JSON.stringify({ path, content }),
  };
}

function taskCreateToolCall(toolCallId: string, subject: string, description: string) {
  return {
    type: "tool-call" as const,
    toolCallId,
    toolName: "task_create",
    input: JSON.stringify({ subject, description, blockedBy: [] }),
  };
}

function response(
  content: LanguageModelV4GenerateResult["content"],
  finish: "stop" | "tool-calls",
): LanguageModelV4GenerateResult {
  return {
    content,
    finishReason: { unified: finish, raw: finish },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  };
}

function usage(totalTokens: number): CellUsage {
  return { inputTokens: totalTokens, outputTokens: 0, totalTokens, cachedInputTokens: 0 };
}

async function waitForRunner(root: string, missionId: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      requireRunnerSuccess(await requestMissionRunner(
        root,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        200,
      ));
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(20);
    }
  }
  throw new Error(`Mission runner did not become ready: ${String(lastError)}`);
}

function requireRunnerSuccess(
  response: MissionRunnerResponse,
): Extract<MissionRunnerResponse, { ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}

async function waitForTurnSettlement(timeline: FileMissionTimeline, missionId: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if ((await timeline.latestTurn(missionId))?.settlement !== undefined) return;
    await Bun.sleep(10);
  }
  throw new Error(`Mission turn for ${missionId} did not settle`);
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "autonomy-delegate-loop-"));
  roots.push(root);
  return root;
}

function trackingTimeline(
  timeline: FileMissionTimeline,
  order: string[],
  inspect: (checkpoint: DelegateBatchCheckpoint) => void,
): DelegateTimeline {
  return {
    async prepareBatch(checkpoint) {
      order.push("prepare");
      inspect(checkpoint);
      await timeline.prepareBatch(checkpoint);
    },
    async markBatchDispatched(checkpoint) {
      order.push("dispatch");
      await timeline.markBatchDispatched(checkpoint);
    },
    async recordBatchSettlements(input) {
      order.push("settle");
      await timeline.recordBatchSettlements(input);
    },
    async resolveBatch(checkpoint) {
      order.push("resolve");
      return timeline.resolveBatch(checkpoint);
    },
  };
}

function failingTimeline(message: string): DelegateTimeline {
  return {
    async prepareBatch() { throw new Error(message); },
    async markBatchDispatched() { throw new Error("unreachable"); },
    async recordBatchSettlements() { throw new Error("unreachable"); },
    async resolveBatch() { throw new Error("unreachable"); },
  };
}
