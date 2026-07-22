import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CellInput } from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";
import { createValidationModel } from "../../../packages/work-cell/src/validation-model";
import { Workspace } from "../../../packages/work-cell/src/workspace";
import { runDelegateLoop, type DelegateCall } from "../src/delegate-loop";
import { FileMissionTimeline } from "../src/delegate-timeline";

const route = [{
  provider: "opencode-go" as const,
  credential: { source: "env" as const, name: "OPENCODE_API_KEY" },
  model: "deepseek-v4-flash",
}];
const outputArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const outputPath = resolve(outputArgument ?? `${tmpdir()}/delegate-file-capability-probe-${Date.now()}.json`);
const workspaceRoot = await mkdtemp(join(tmpdir(), "delegate-file-probe-"));

try {
  const writer = await Workspace.create({
    root: workspaceRoot,
    readPaths: ["delegate-packets"],
    writePaths: ["delegate-packets"],
    excludePaths: [".git"],
    allowedCommands: [],
  }, { maxSteps: 4, maxDurationMs: 120_000, maxCommandOutputBytes: 4_000 });
  const selection = createValidationModel({ route });
  const run = await runDelegateLoop({
    id: "probe:delegate-file-tool-loop",
    instructions: [
      "This is a bounded capability probe. Prepare exactly one contribution.",
      "First call write_file with path delegate-packets/contract.json and content equal to one valid DelegateCall JSON object.",
      "Use key inspect-contract, task Inspect the bounded contract, sourceRefs [source:contract], obligationRefs [inspect-contract], acceptance [Return a locally supported result], and capabilityNeed read.",
      "After the write result, call delegate_file in a later step with its relative path and exact sha256. Do not use inline delegate.",
      "Do not mix write_file with delegate_file in one step.",
    ].join("\n"),
    messages: [{ role: "user", content: "Prepare and submit the one declared contribution." }],
    whole: {
      revision: "probe-whole-v1",
      sourceRefs: ["source:contract"],
      obligations: ["inspect-contract"],
      settledContributionKeys: [],
      guardRefs: [],
      capabilityNeeds: ["read"],
      reconstructionOwner: "probe:reconstruction",
      workspace: {
        root: workspaceRoot,
        readPaths: ["."],
        writePaths: [],
        excludePaths: [".git"],
        allowedCommands: [],
      },
    },
  }, {
    model: selection.model,
    delegateInputRoot: workspaceRoot,
    delegateFileWriter: writer,
    prepareContribution: async (call) => ({
      dependsOn: [],
      taskShape: {
        referenceProfile: { id: "flash-main", revision: "probe-profile-v1" },
        evidence: { status: "admitted", revision: "probe-fixture-v1", refs: ["probe:bounded-tool-use"] },
        disposition: "reliable-primitive",
        principalInstability: "none inside this bounded fixture",
        guardRefs: [],
        reconstructionOwner: "probe:reconstruction",
        overloadDisposition: "repartition",
      },
      cell: cell(workspaceRoot, call),
    }),
    timeline: new FileMissionTimeline(join(workspaceRoot, ".mission")),
    createDriver: () => new ProbeDriver(),
    concurrency: 1,
    maxModelSteps: 4,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
    maxOutputTokens: 4_000,
  });

  const invocation = run.batches[0]?.invocations[0];
  const packetContent = invocation?.input.kind === "file"
    ? await readFile(invocation.input.path, "utf8")
    : undefined;
  const packet = packetContent === undefined ? undefined : JSON.parse(packetContent) as unknown;
  const parentMessages = JSON.stringify(run.messages);
  const record = {
    version: "atthis.delegate-file-capability-probe.v1",
    status: "probe",
    observedAt: new Date().toISOString(),
    profile: {
      provider: selection.route,
      model: selection.models,
      harness: "AI SDK v7 ToolLoopAgent through autonomy DelegateLoopSession",
      fallback: "none",
    },
    expectedSequence: ["write_file", "delegate_file"],
    outcome: {
      loopStatus: run.status,
      batchCount: run.batches.length,
      invocationTool: invocation?.toolName,
      invocationInput: invocation?.input,
      packet,
      childStatus: run.batches[0]?.outcomes[0]?.status,
      parentToolSequence: toolSequence(run.messages),
      packetCharacters: packetContent?.length,
      parentMessageCharacters: parentMessages.length,
      parentRetainedExactPacket: packetContent === undefined ? undefined : parentMessages.includes(packetContent),
      usage: run.usage,
    },
  };
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ outputPath, ...record.outcome })}\n`);
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}

function toolSequence(messages: readonly { readonly role: string; readonly content: unknown }[]): string[] {
  const names: string[] = [];
  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (
        typeof part === "object" && part !== null &&
        "type" in part && part.type === "tool-call" &&
        "toolName" in part && typeof part.toolName === "string"
      ) names.push(part.toolName);
    }
  }
  return names;
}

function cell(root: string, call: DelegateCall): CellInput {
  return {
    id: call.key,
    intent: call.task,
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [".git"], allowedCommands: [] },
    instructions: ["Return the bounded fixture result."],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: [call.capabilityNeed],
    acceptance: [...call.acceptance],
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    executionProfile: {
      id: "flash-main",
      version: "execution-profile.v1",
      provider: "probe",
      model: "deterministic-child",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["completed"] } },
      required: ["status"],
      additionalProperties: false,
    },
  };
}

class ProbeDriver implements CellDriver {
  readonly descriptor = { adapter: "delegate-file-probe", provider: "deterministic", model: "fixture" };

  async run(_input: CellInput, _context: DriverContext): Promise<DriverResult> {
    return {
      finalText: "bounded probe child completed",
      output: { status: "completed" },
      terminalToolsCalled: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}
