import { resolve } from "node:path";
import type {
  ContributionAttribution,
  MissionRunnerActionClient,
  RunnerTarget,
  RunnerStatusProof,
} from "./actions";
import type { WorkbenchRunnerActivityProjection } from "./projection";

export interface AutonomyClient extends MissionRunnerActionClient {
  activity(missionId: string): Promise<WorkbenchRunnerActivityProjection>;
  start?(request: TrustedRunnerStart): Promise<RunnerStatusProof>;
}

/**
 * A server-formed runner launch. Browser requests never supply these paths or
 * environment variables; a trusted Workbench adapter derives them from the
 * current task, Mission proposal, and local authorization receipt.
 */
export interface TrustedRunnerStart {
  readonly adapterId: string;
  readonly missionId: string;
  readonly runtimeModule: string;
  readonly environment: Readonly<Record<string, string>>;
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

  async start(request: TrustedRunnerStart): Promise<RunnerStatusProof> {
    return await this.run(
      [
        "runner",
        "start",
        request.missionId,
        "--runtime",
        request.runtimeModule,
      ],
      request.environment,
    );
  }

  async contribute(
    target: RunnerTarget,
    text: string,
    attribution?: ContributionAttribution,
  ): Promise<unknown> {
    const attributionArguments = attribution === undefined
      ? [
        "--actor",
        "principal",
        "--source",
        "workbench-ui",
      ]
      : [
        "--id",
        attribution.inputId,
        "--actor",
        attribution.actorRef,
        "--source",
        attribution.sourceRef,
      ];
    return await this.run([
      "mission",
      "input",
      target.missionId,
      text,
      ...this.expectedTarget(target),
      ...attributionArguments,
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

  private async run(
    arguments_: readonly string[],
    environment: Readonly<Record<string, string>> = {},
  ): Promise<any> {
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
        env: {
          ...process.env,
          ...environment,
        },
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
