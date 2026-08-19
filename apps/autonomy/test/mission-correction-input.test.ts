import { afterEach, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  MissionCorrectionPayloadSchema,
  type MissionCorrectionPayload,
} from "../src/mission-input";
import {
  missionRunnerDirectory,
  missionRunnerRequest,
  requestMissionRunner,
  type MissionRunnerResponse,
} from "../src/mission-runner";

const roots: string[] = [];
const children: ChildProcess[] = [];

const correction: MissionCorrectionPayload = {
  kind: "correction",
  correctionId: "repair-missing-index-import",
  instruction: "Import index from drizzle-orm/sqlite-core without changing any other candidate file.",
  cause: {
    effectId: "turn-1:batch:1",
    failedReportRef: "file:effect-artifacts/failed-report.json",
    failedReportDigest: "1".repeat(64),
  },
  subject: {
    gitHead: "2".repeat(40),
    files: [
      { path: "app/blog/content.ts", sha256: "3".repeat(64) },
      { path: "db/schema.ts", sha256: "4".repeat(64) },
    ],
  },
  scope: {
    writePaths: ["db/schema.ts"],
    externalDisclosure: "none",
  },
  plannedVerificationRef:
    "file:corrections/repair-missing-index-import/independent/pending.json",
  authority: {
    commit: "withheld",
    merge: "withheld",
    publish: "withheld",
    productAcceptance: "withheld",
  },
};

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
  await Promise.all(roots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })
  ));
});

test("the correction payload binds an exact local subject, scope, and withheld authority", () => {
  expect(MissionCorrectionPayloadSchema.parse(correction)).toEqual(correction);

  expect(() => MissionCorrectionPayloadSchema.parse({
    ...correction,
    subject: {
      ...correction.subject,
      files: [
        correction.subject.files[0],
        correction.subject.files[0],
      ],
    },
  })).toThrow("duplicate file path");

  expect(() => MissionCorrectionPayloadSchema.parse({
    ...correction,
    scope: {
      ...correction.scope,
      writePaths: ["db/schema.ts", "../package.json"],
    },
  })).toThrow("normalized project-relative POSIX path");

  expect(() => MissionCorrectionPayloadSchema.parse({
    ...correction,
    scope: {
      ...correction.scope,
      externalDisclosure: "provider",
    },
  })).toThrow();

  expect(() => MissionCorrectionPayloadSchema.parse({
    ...correction,
    authority: {
      ...correction.authority,
      commit: "granted",
    },
  })).toThrow();

  expect(() => MissionCorrectionPayloadSchema.parse({
    ...correction,
    extraAuthority: "none",
  })).toThrow();
});

test("the correction CLI only appends one guarded Mission input", async () => {
  const home = await fixture();
  const missionId = "local-correction";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  await seedTimeline(timeline, missionId);
  const runner = startRunner(home, missionId);
  const initial = await waitForLiveStatus(home, missionId, runner);
  expect(initial.state).toBe("idle");
  const requestPath = join(home, "correction.json");
  await writeFile(requestPath, `${JSON.stringify(correction)}\n`, "utf8");

  const result = await runCli([
    "mission",
    "correction",
    missionId,
    requestPath,
    "--home",
    home,
    "--id",
    correction.correctionId,
    "--actor",
    "principal:test",
    "--source",
    "decision:051-treatment-a",
    "--expected-runner",
    initial.runnerId,
    "--expected-state",
    "idle",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  const output = JSON.parse(result.stdout);
  expect(output).toMatchObject({
    status: {
      runnerId: initial.runnerId,
      state: "input-pending",
      inputWatermark: 1,
      reconciledWatermark: 0,
    },
    receipt: {
      inputId: correction.correctionId,
      actorRef: "principal:test",
      sourceRef: "decision:051-treatment-a",
      payload: correction,
      watermark: 1,
    },
  });

  expect(await timeline.readInputsAfter(missionId, 0)).toHaveLength(1);
  expect((await timeline.readInputsAfter(missionId, 0))[0]?.payload).toEqual(correction);
  expect((await timeline.readEvents(missionId)).map((event) => event.type)).toEqual([
    "mission.anchor-seeded",
    "mission.input-received",
  ]);

  await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "runner-shutdown" }),
  );
  await waitForExit(runner);
});

test("the correction CLI rejects an invalid request before appending input", async () => {
  const home = await fixture();
  const missionId = "invalid-local-correction";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  await seedTimeline(timeline, missionId);
  const runner = startRunner(home, missionId);
  const initial = await waitForLiveStatus(home, missionId, runner);
  expect(initial.state).toBe("idle");
  const requestPath = join(home, "invalid-correction.json");
  await writeFile(requestPath, `${JSON.stringify({
    ...correction,
    scope: {
      writePaths: ["/absolute/path"],
      externalDisclosure: "none",
    },
  })}\n`, "utf8");

  const result = await runCli([
    "mission",
    "correction",
    missionId,
    requestPath,
    "--home",
    home,
    "--expected-runner",
    initial.runnerId,
    "--expected-state",
    "idle",
  ]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("normalized project-relative POSIX path");
  expect(await timeline.currentInputWatermark(missionId)).toBe(0);

  await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "runner-shutdown" }),
  );
  await waitForExit(runner);
});

function startRunner(home: string, missionId: string): ChildProcess {
  const script = fileURLToPath(new URL("../src/mission-runner-process.ts", import.meta.url));
  const child = spawn(process.execPath, [script, "--home", home, "--mission", missionId], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  children.push(child);
  return child;
}

async function waitForLiveStatus(
  home: string,
  missionId: string,
  child: ChildProcess,
): Promise<Extract<MissionRunnerResponse, { ok: true }>["status"]> {
  const deadline = Date.now() + 5_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Mission runner exited with ${child.exitCode}`);
    }
    try {
      const response = await requestMissionRunner(
        home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        200,
      );
      if (response.ok && response.status.pid === child.pid) return response.status;
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(20);
  }
  throw new Error(`Mission runner did not become ready: ${String(lastError)}`);
}

async function runCli(arguments_: readonly string[]) {
  const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const child = Bun.spawn([process.execPath, script, ...arguments_], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => rejectExit(new Error("Mission runner did not exit")), 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveExit();
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectExit(error);
    });
  });
}

async function fixture(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), "mission-correction-"));
  roots.push(home);
  return home;
}

async function seedTimeline(
  timeline: FileMissionTimeline,
  missionId: string,
): Promise<void> {
  await timeline.seedAnchor({
    version: "rosso.mission-anchor-seed.v1",
    id: `seed:${missionId}`,
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor: {
      id: `anchor:${missionId}`,
      revision: "r1",
      statement: "Accept semantic Mission input only against an authorized anchor.",
      sourceRefs: ["test:mission-envelope"],
      reconciledWatermark: 0,
    },
  });
}
