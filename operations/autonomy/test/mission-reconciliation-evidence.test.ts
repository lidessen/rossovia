import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  reconciliationCellRecordDirectory,
  readMissionReconciliationCellRecord,
  retainMissionReconciliationCellRecord,
  verifyMissionReconciliationCellRecord,
} from "../src/mission-reconciliation-evidence";
import type { CellRunRecord } from "../../../packages/work-cell/src/contracts";

const homes: string[] = [];

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) =>
    rm(home, { recursive: true, force: true })
  ));
});

test("retaining the same passed reconciliation Cell record is idempotent and verifiable", async () => {
  const home = await fixture();
  const record = passedRecord(home);
  const first = await retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record,
  });
  const second = await retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record,
  });

  expect(second).toEqual(first);
  expect(first).toEqual({
    role: "proposal",
    runId: record.runId,
    cellId: record.cellId,
    ref: `file:reconciliation-cell-records/${first.digest}.json`,
    digest: first.digest,
  });
  const retainedBytes = await readFile(join(
    reconciliationCellRecordDirectory(home, "mission-1"),
    `${first.digest}.json`,
  ));
  expect(createHash("sha256").update(retainedBytes).digest("hex")).toBe(first.digest);
  expect((await verifyMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    evidence: first,
  })).record).toEqual(record);
});

test("one runId cannot be rebound to a different reconciliation Cell record", async () => {
  const home = await fixture();
  const record = passedRecord(home);
  await retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record,
  });

  await expect(retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record: { ...record, finalText: "Different retained result." },
  })).rejects.toThrow("already binds different evidence");
});

test("reading fails closed when a content-addressed reconciliation Cell record is tampered", async () => {
  const home = await fixture();
  const evidence = await retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "verification",
    record: passedRecord(home),
  });
  const path = join(
    reconciliationCellRecordDirectory(home, "mission-1"),
    `${evidence.digest}.json`,
  );
  const stored = JSON.parse(await readFile(path, "utf8"));
  stored.record.finalText = "Tampered result.";
  await writeFile(path, JSON.stringify(stored), "utf8");

  await expect(readMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    digest: evidence.digest,
  })).rejects.toThrow("failed its digest check");
});

test("verification rejects role mismatch, traversal, missing evidence, and non-passed records", async () => {
  const home = await fixture();
  const record = passedRecord(home);
  const evidence = await retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record,
  });

  await expect(verifyMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    evidence: { ...evidence, role: "verification" },
  })).rejects.toThrow("does not match retained record");
  await expect(verifyMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    evidence: { ...evidence, runId: "other-run" },
  })).rejects.toThrow("does not match retained record");
  await expect(verifyMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    evidence: { ...evidence, digest: "e".repeat(64) },
  })).rejects.toThrow("ref does not match digest");
  await expect(verifyMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    evidence: { ...evidence, runId: "../other-run" },
  })).rejects.toThrow("traversal-safe path component");
  await expect(readMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    digest: "f".repeat(64),
  })).rejects.toThrow("is missing");
  await expect(retainMissionReconciliationCellRecord({
    home,
    missionId: "mission-1",
    role: "proposal",
    record: { ...record, status: "failed", error: "fixture failure" },
  })).rejects.toThrow("is not passed");
});

async function fixture(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), "reconciliation-evidence-"));
  homes.push(home);
  return home;
}

function passedRecord(root: string): CellRunRecord {
  const usage = {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    cachedInputTokens: 0,
  };
  return {
    version: "work-cell.run.v4",
    runId: "proposal-run-1",
    cellId: "reconcile:mission-1:input-1",
    driver: {
      adapter: "fixture",
      provider: "fixture",
      model: "fixture",
    },
    startedAt: "2026-07-27T12:00:00.000Z",
    finishedAt: "2026-07-27T12:00:01.000Z",
    durationMs: 1_000,
    status: "passed",
    input: {
      id: "reconcile:mission-1:input-1",
      intent: "Propose one bounded reconciliation.",
      workspace: {
        root,
        readPaths: [],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
      instructions: ["Use only the supplied source material."],
      capabilities: [],
      context: [],
      capabilitiesRequired: [],
      acceptance: ["Submit one bounded result."],
      budget: {
        maxSteps: 3,
        maxDurationMs: 1_000,
        maxCommandOutputBytes: 1_000,
      },
    },
    finalText: "Submitted one bounded result.",
    artifacts: [],
    verification: {
      passed: true,
      terminal: {
        passed: true,
        required: [],
        called: [],
      },
    },
    workspaceDiff: {
      added: [],
      changed: [],
      removed: [],
    },
    usage,
    usageByPhase: {
      preparation: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
      execution: usage,
    },
    executionObservation: {},
    trace: [],
    rawSteps: [],
  };
}
