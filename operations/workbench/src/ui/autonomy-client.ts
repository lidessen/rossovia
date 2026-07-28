import { resolve } from "node:path";
import type {
  MissionRunnerActionClient,
  RunnerTarget,
  RunnerStatusProof,
} from "./actions";
import type { WorkbenchRunnerActivityProjection } from "./projection";

export interface AutonomyClient extends MissionRunnerActionClient {
  activity(missionId: string): Promise<WorkbenchRunnerActivityProjection>;
}

export class AutonomyCliClient implements AutonomyClient {
  constructor(
    private readonly home: string,
    private readonly cliPath: string,
    private readonly executable = process.execPath,
  ) {}

  async status(missionId: string): Promise<RunnerStatusProof> {
    return await this.run(["runner", "status", missionId]);
  }

  async activity(missionId: string): Promise<WorkbenchRunnerActivityProjection> {
    return await this.run(["runner", "activity", missionId]);
  }

  async contribute(target: RunnerTarget, text: string): Promise<unknown> {
    return await this.run([
      "mission",
      "input",
      target.missionId,
      text,
      ...this.expectedTarget(target),
      "--actor",
      "principal",
      "--source",
      "workbench-ui",
    ]);
  }

  async control(target: RunnerTarget, command: "pause" | "resume"): Promise<unknown> {
    return await this.run([
      "mission",
      "control",
      target.missionId,
      command,
      ...this.expectedTarget(target),
      "--actor",
      "principal",
      "--source",
      "workbench-ui",
    ]);
  }

  async recover(
    target: RunnerTarget,
    command: "resume" | "replace" | "abandon",
  ): Promise<unknown> {
    return await this.run([
      "mission",
      "recover",
      target.missionId,
      command,
      ...this.expectedTarget(target),
      "--actor",
      "principal",
      "--source",
      "workbench-ui",
    ]);
  }

  private expectedTarget(target: RunnerTarget): string[] {
    return [
      "--expected-runner",
      target.runnerId,
      "--expected-state",
      target.expectedState,
    ];
  }

  private async run(arguments_: readonly string[]): Promise<any> {
    const child = Bun.spawn(
      [
        this.executable,
        resolve(this.cliPath),
        ...arguments_,
        "--home",
        this.home,
      ],
      {
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `autonomy command exited ${exitCode}`);
    }
    try {
      return JSON.parse(stdout);
    } catch {
      throw new Error("autonomy command returned invalid JSON");
    }
  }
}
