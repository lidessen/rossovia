import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AutonomyCliClient } from "../src/ui/autonomy-client";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("the UI client carries the exact runner guard into the mutating CLI invocation", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-client-"));
  temporaryRoots.push(root);
  const cli = join(root, "capture.ts");
  writeFileSync(cli, "console.log(JSON.stringify(process.argv.slice(2)));\n");
  const client = new AutonomyCliClient("/tmp/rosso-home", cli);
  const target = {
    missionId: "mission-a",
    runnerId: "runner-a",
    expectedState: "running" as const,
    projectKey: "registered:project-a",
  };

  await expect(client.contribute(target, "Keep this exact target.")).resolves.toEqual([
    "mission",
    "input",
    "mission-a",
    "Keep this exact target.",
    "--expected-runner",
    "runner-a",
    "--expected-state",
    "running",
    "--actor",
    "principal",
    "--source",
    "workbench-ui",
    "--home",
    "/tmp/rosso-home",
  ]);

  await expect(client.contribute(target, "Apply the retained task correction.", {
    inputId: "task:task-a:correction:correction-a",
    actorRef: "principal:local-workbench",
    sourceRef: "workbench-task:task-a/correction:correction-a",
  })).resolves.toEqual([
    "mission",
    "input",
    "mission-a",
    "Apply the retained task correction.",
    "--expected-runner",
    "runner-a",
    "--expected-state",
    "running",
    "--id",
    "task:task-a:correction:correction-a",
    "--actor",
    "principal:local-workbench",
    "--source",
    "workbench-task:task-a/correction:correction-a",
    "--home",
    "/tmp/rosso-home",
  ]);

  await expect(client.activity("mission-a") as Promise<unknown>).resolves.toEqual([
    "runner",
    "activity",
    "mission-a",
    "--home",
    "/tmp/rosso-home",
  ]);
});
