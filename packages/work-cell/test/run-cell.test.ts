import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellRunRecord } from "../src/contracts";
import { CellRunRecordSchema, ProviderFingerprintStandingSchema } from "../src/contracts";
import type { CellDriver, DriverResult } from "../src/driver";
import { runCell } from "../src/run-cell";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("fails closed when supplied tasks are ignored by a driver", async () => {
  const root = await mkdtemp(join(tmpdir(), "work-cell-run-test-"));
  temporaryRoots.push(root);
  const input: CellInput = {
    id: "run-cell-fixture",
    intent: "Exercise the generic task completion invariant.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the fixture result."],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["Supplied tasks remain verifiable."],
    tasks: [{ subject: "Inspect the bounded source", description: "Read the bounded source." }],
    budget: { maxSteps: 1, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };

  const record = await runCell(input, new IgnoringTaskDriver());

  expect(record.status).toBe("verification_failed");
  expect(record.tasks).toBeUndefined();
  expect(record.verification.tasks).toEqual({
    passed: false,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    errors: ["driver completed without the enabled task state"],
  });
  expect(record.error).toBe("driver completed without the enabled task state");
});

test("fails closed when a driver returns an empty final task projection", async () => {
  const root = await mkdtemp(join(tmpdir(), "work-cell-run-test-"));
  temporaryRoots.push(root);
  const input: CellInput = {
    id: "run-cell-fixture",
    intent: "Exercise the generic task completion invariant.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the fixture result."],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["Supplied tasks remain verifiable."],
    tasks: [{ subject: "Inspect the bounded source", description: "Read the bounded source." }],
    budget: { maxSteps: 1, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };

  const record = await runCell(input, new EmptyTaskProjectionDriver());

  expect(record.status).toBe("verification_failed");
  expect(record.tasks).toEqual([]);
  expect(record.verification.tasks).toEqual({
    passed: false,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    errors: ["driver completed with an empty task projection"],
  });
  expect(record.error).toBe("driver completed with an empty task projection");
});

class IgnoringTaskDriver implements CellDriver {
  readonly descriptor = { adapter: "ignoring-task-fixture", provider: "deterministic", model: "fixture" };

  async run(): Promise<DriverResult> {
    return {
      terminalToolsCalled: [],
      finalText: "done",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

class EmptyTaskProjectionDriver implements CellDriver {
  readonly descriptor = { adapter: "empty-task-fixture", provider: "deterministic", model: "fixture" };

  async run(): Promise<DriverResult> {
    return {
      terminalToolsCalled: [],
      tasks: [],
      finalText: "done",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

test("budget approval without an explicit finite maxSteps fails closed before execution", async () => {
  const root = await mkdtemp(join(tmpdir(), "work-cell-run-maxsteps-"));
  temporaryRoots.push(root);
  let runs = 0;
  const driver: CellDriver = {
    descriptor: { adapter: "budget-control-fixture", provider: "deterministic", model: "fixture" },
    budgetControl: "completed-step-v1",
    async run(): Promise<DriverResult> {
      runs += 1;
      return {
        terminalToolsCalled: [],
        finalText: "should not run",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
        rawSteps: [],
      };
    },
  };
  const input: CellInput = {
    id: "run-cell-maxsteps-fixture",
    intent: "Prove the explicit finite step policy requirement.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Do not run."],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["The run fails closed before execution."],
    budget: { maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };

  await expect(runCell(input, driver, {
    budgetApproval: () => ({ decision: "deny" }),
    settlementReserveMs: 500,
    hardLimitMs: 3_000,
  })).rejects.toThrow(
    "budgetApproval requires an explicit finite maxSteps policy on the Cell input",
  );
  expect(runs).toBe(0);
});

describe("provider fingerprint evidence", () => {
  async function fingerprintInput(): Promise<CellInput> {
    const root = await mkdtemp(join(tmpdir(), "work-cell-run-fingerprint-"));
    temporaryRoots.push(root);
    return {
      id: "fingerprint-fixture",
      intent: "Retain truthful provider fingerprint evidence.",
      workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
      instructions: ["Return the fixture result."],
      capabilities: [],
      context: [],
      capabilitiesRequired: [],
      acceptance: ["The fingerprint standing is retained."],
      budget: { maxSteps: 1, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
    };
  }

  function fingerprintDriver(providerMetadata: unknown): CellDriver {
    return {
      descriptor: { adapter: "fingerprint-fixture", provider: "deterministic", model: "fixture" },
      async run(): Promise<DriverResult> {
        return {
          terminalToolsCalled: [],
          finalText: "done",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
          rawSteps: [],
          providerMetadata,
        };
      },
    };
  }

  test("retains an observed provider namespace fingerprint verbatim with an observed standing", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver({
      "openai-compatible": { systemFingerprint: "fp_abc123", promptCacheHitTokens: 7 },
    }));

    expect(record.executionObservation.providerFingerprint).toBe("fp_abc123");
    expect(record.executionObservation.providerFingerprintStanding).toEqual({ standing: "observed" });
    const parsed = CellRunRecordSchema.parse(record);
    expect(parsed.executionObservation.providerFingerprint).toBe("fp_abc123");
    expect(parsed.executionObservation.providerFingerprintStanding).toEqual({ standing: "observed" });
  });

  test("retains a direct top-level system fingerprint verbatim", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver({
      systemFingerprint: "fp_direct",
    }));

    expect(record.executionObservation.providerFingerprint).toBe("fp_direct");
    expect(record.executionObservation.providerFingerprintStanding).toEqual({ standing: "observed" });
  });

  test("retains an explicit unavailable standing when no provider metadata exists", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver(undefined));

    expect(record.executionObservation.providerFingerprint).toBeUndefined();
    expect(record.executionObservation.providerFingerprintStanding).toEqual({
      standing: "unavailable",
      reason: "the driver retained no provider metadata for this route; the provider response exposed no system fingerprint",
    });
    expect(CellRunRecordSchema.parse(record).executionObservation.providerFingerprint).toBeUndefined();
  });

  test("retains an explicit unavailable standing when metadata carries no fingerprint", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver({
      sessionId: "harness-session-1",
    }));

    expect(record.executionObservation.sessionId).toBe("harness-session-1");
    expect(record.executionObservation.providerFingerprint).toBeUndefined();
    expect(record.executionObservation.providerFingerprintStanding).toEqual({
      standing: "unavailable",
      reason: "provider metadata was retained but carried no system fingerprint",
    });
  });

  test("fails closed on contradictory fingerprint standings in a retained record", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver({
      "openai-compatible": { systemFingerprint: "fp_abc123" },
    }));

    const {
      providerFingerprint: _retainedFingerprint,
      ...observationWithoutFingerprint
    } = record.executionObservation;
    const observedWithoutValue: CellRunRecord = {
      ...record,
      executionObservation: {
        ...observationWithoutFingerprint,
        providerFingerprintStanding: { standing: "observed" },
      },
    };
    expect(() => CellRunRecordSchema.parse(observedWithoutValue))
      .toThrow(/observed provider fingerprint standing requires the retained fingerprint value/);

    const unavailableWithValue: CellRunRecord = {
      ...record,
      executionObservation: {
        ...record.executionObservation,
        providerFingerprintStanding: { standing: "unavailable", reason: "contradictory" },
      },
    };
    expect(() => CellRunRecordSchema.parse(unavailableWithValue))
      .toThrow(/unavailable provider fingerprint standing cannot carry a fingerprint value/);
  });

  test("structurally requires a nonempty reason for an unavailable standing", () => {
    expect(ProviderFingerprintStandingSchema.parse({
      standing: "unavailable",
      reason: "the provider response exposed no system fingerprint",
    })).toEqual({
      standing: "unavailable",
      reason: "the provider response exposed no system fingerprint",
    });
    expect(() => ProviderFingerprintStandingSchema.parse({ standing: "unavailable" }))
      .toThrow(/reason/);
    expect(() => ProviderFingerprintStandingSchema.parse({ standing: "unavailable", reason: "" }))
      .toThrow(/reason/);
  });

  test("structurally forbids a reason for an observed standing", () => {
    expect(ProviderFingerprintStandingSchema.parse({ standing: "observed" }))
      .toEqual({ standing: "observed" });
    expect(() => ProviderFingerprintStandingSchema.parse({ standing: "observed", reason: "extra" }))
      .toThrow(/reason/);
  });

  test("record-level parsing enforces the structural standing shape on retained evidence", async () => {
    const record = await runCell(await fingerprintInput(), fingerprintDriver(undefined));
    expect(record.executionObservation.providerFingerprintStanding).toEqual({
      standing: "unavailable",
      reason: expect.any(String),
    });
    const unavailableWithoutReason = {
      ...record,
      executionObservation: {
        ...record.executionObservation,
        providerFingerprintStanding: { standing: "unavailable" },
      } as unknown as CellRunRecord["executionObservation"],
    };
    expect(() => CellRunRecordSchema.parse(unavailableWithoutReason)).toThrow(/reason/);
  });
});
