#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { attachWorkspace } from "../../workbench/src/attach";
import {
  CliStateError,
  ParseUsageError,
  STATE_FAILURE_EXIT_CODE,
  UsageError,
  USAGE_EXIT_CODE,
} from "../../workbench/src/cli-errors";
import { createForegroundRunSignalAdapter } from "../../workbench/src/integrations/foreground-run-signals";
import {
  recordDogfoodObserverLaunchFailure,
  runDogfoodObserver,
} from "../../workbench/src/dogfood-observer";
import type { ContributionLeaseReconcileResult } from "../../workbench/src/conversation/contributions";
import { authorizeExecution, inspectExecution } from "../../workbench/src/execution-authorization";
import { helpForInvocation, packageVersionLabel } from "./help";
import { initializeHome, loadHome, resolveHome } from "../../workbench/src/home";
import { runHookCommand } from "../../workbench/src/hooks";
import { runCorrectionCommand, runInterventionCommand } from "../../workbench/src/interventions";
import { createLocalTaskControlPlane, LocalTaskControlError } from "../../workbench/src/local-task-control-plane";
import { migrateLegacyHome } from "../../workbench/src/migration";
import { runMissionCommand } from "../../workbench/src/missions";
import { listPreferences, retirePreference, setPreference } from "../../workbench/src/preferences";
import { listProjects } from "../../workbench/src/projects";
import { registerProject } from "../../workbench/src/register";
import { resolveProject } from "../../workbench/src/resolve";
import { addRoots, scanRoots } from "../../workbench/src/roots";
import { applySetup, selectSetupModules, setupStatus } from "../../workbench/src/setup";
import {
  renderStatusLine,
  statusLineHostContext,
  statusLineInput,
  statusLineProjection,
} from "../../workbench/src/statusline";
import { showPrincipalTaskAttempts } from "../../workbench/src/task-attempts";
import {
  listPrincipalTaskWorkers,
  reconcilePrincipalTaskAttempt,
  runPrincipalTask,
} from "../../workbench/src/task-run";

const TASK_SUBCOMMANDS = new Set([
  "list",
  "show",
  "attempts",
  "reconcile-attempt",
  "create",
  "run",
  "append-review",
  "assign",
  "correct",
  "link-execution",
  "rebind-worktree",
  "submit",
  "accept",
  "reopen",
]);

try {
  const { args, home } = extractHome(process.argv.slice(2));
  const helpText = helpForInvocation(args);
  if (helpText !== undefined) {
    console.log(helpText);
  } else {
    await dispatchCommand(home, args);
  }
} catch (error: unknown) {
  const recovery = error instanceof LocalTaskControlError ? error.recovery : undefined;
  if (recovery !== undefined) {
    console.log(JSON.stringify(recovery, null, 2));
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof UsageError) {
    process.stderr.write(`rossovia: ${message}\n`);
    process.stderr.write(`run 'rossovia help${helpPathSuffix(error.helpPath)}' for usage\n`);
    process.exitCode = USAGE_EXIT_CODE;
  } else {
    process.stderr.write(`rossovia: ${message}\n`);
    process.exitCode = STATE_FAILURE_EXIT_CODE;
  }
}

function helpPathSuffix(helpPath: readonly string[]): string {
  return helpPath.length === 0 ? "" : ` ${helpPath.join(" ")}`;
}

async function dispatchCommand(home: string | undefined, args: string[]): Promise<void> {
  const command = args[0];
  if (command === undefined) throw new UsageError("no command given", []);
  if (command === "--version") {
    if (args.length !== 1) throw new UsageError("--version accepts no arguments", []);
    console.log(packageVersionLabel());
    return;
  }
  if (command === "--help" || command === "-h") {
    throw new UsageError(`${command} accepts no arguments`, []);
  }
  if (command.startsWith("--")) throw new UsageError(`unknown option: ${command}`, []);

  switch (command) {
    case "resolve":
      dispatchResolve(home, args);
      return;
    case "init":
      dispatchInit(home, args);
      return;
    case "project":
      dispatchProject(home, args);
      return;
    case "worker":
      dispatchWorker(args);
      return;
    case "setup":
      dispatchSetup(home, args);
      return;
    case "migrate":
      dispatchMigrate(home, args);
      return;
    case "root":
      dispatchRoot(home, args);
      return;
    case "scan":
      dispatchScan(home, args);
      return;
    case "register":
      dispatchRegister(home, args);
      return;
    case "attach":
      dispatchAttach(home, args);
      return;
    case "preference":
      dispatchPreference(home, args);
      return;
    case "execution":
      dispatchExecution(home, args);
      return;
    case "contribution":
      dispatchContribution(home, args);
      return;
    case "task":
      console.log(JSON.stringify(await runTaskCli(home, args.slice(1)), null, 2));
      return;
    case "mission": {
      console.log(JSON.stringify(runMissionCommand(args.slice(1)), null, 2));
      return;
    }
    case "intervention":
      console.log(JSON.stringify(runInterventionCommand(args.slice(1), "", home), null, 2));
      return;
    case "correct":
      console.log(JSON.stringify(runCorrectionCommand(args.slice(1)), null, 2));
      return;
    case "hook": {
      const result = runHookCommand(args.slice(1), "", home);
      if (result !== undefined) console.log(JSON.stringify(result));
      return;
    }
    case "statusline":
      dispatchStatusLine(home, args);
      return;
    case "ui":
      await dispatchUi(home, args);
      return;
    case "observer":
      console.log(JSON.stringify(await dispatchObserver(home, args), null, 2));
      return;
    default:
      throw new UsageError(`unknown command: ${command}`, []);
  }
}

function dispatchResolve(home: string | undefined, args: string[]): void {
  if (args.length !== 2) throw new UsageError("resolve requires exactly one project name", ["resolve"]);
  console.log(JSON.stringify(resolveProject(home, args[1]!), null, 2));
}

function dispatchInit(home: string | undefined, args: string[]): void {
  const options = parseInit(args.slice(1));
  const initialized = initializeHome(home);
  const roots = options.workspaceRoots.length > 0
    ? addRoots(initialized.home, initialized.roots, options.workspaceRoots)
    : initialized.roots;
  const index = options.workspaceRoots.length > 0
    ? scanRoots(initialized.home, roots)
    : initialized.index;
  if (options.setup.length > 0) {
    selectSetupModules(initialized.home, options.setup);
    applySetup(initialized.home, {
      ...(options.targetRoot ? { targetRoot: options.targetRoot } : {}),
    });
  }
  console.log(JSON.stringify({
    home: initialized.home,
    initialized: true,
    writeAccess: initialized.writeAccess,
    workspaceRoots: roots.roots,
    indexedWorkspaces: index.entries.length,
    ...(options.setup.length > 0
      ? { setup: setupStatus(initialized.home, {
          ...(options.targetRoot ? { targetRoot: options.targetRoot } : {}),
        }) }
      : {}),
  }, null, 2));
}

function dispatchProject(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("project requires a subcommand", ["project"]);
  if (subcommand !== "list") throw new UsageError(`unknown project command: ${subcommand}`, ["project"]);
  if (args.length !== 2) throw new UsageError("project list accepts no arguments", ["project", "list"]);
  const result = listProjects(home);
  console.log(JSON.stringify(result, null, 2));
  if (!result.complete) {
    const unverified = result.projects.filter((entry) => entry.status !== "available");
    throw new CliStateError(
      `project list is incomplete: ${unverified.length} of ${result.projects.length} projects are unverified`,
    );
  }
}

function dispatchWorker(args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("worker requires a subcommand", ["worker"]);
  if (subcommand !== "list") throw new UsageError(`unknown worker command: ${subcommand}`, ["worker"]);
  if (args.length !== 2) throw new UsageError("worker list accepts no arguments", ["worker", "list"]);
  console.log(JSON.stringify(listPrincipalTaskWorkers(), null, 2));
}

function dispatchSetup(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("setup requires a subcommand", ["setup"]);
  if (subcommand !== "status" && subcommand !== "apply") {
    throw new UsageError(`unknown setup command: ${subcommand}`, ["setup"]);
  }
  const options = parseSetupOptions(args.slice(2), ["setup", subcommand]);
  console.log(JSON.stringify(
    subcommand === "status" ? setupStatus(home, options) : applySetup(home, options),
    null, 2,
  ));
}

function dispatchMigrate(home: string | undefined, args: string[]): void {
  console.log(JSON.stringify(migrateLegacyHome(home, optionalFromHome(args.slice(1))), null, 2));
}

function dispatchRoot(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("root requires a subcommand", ["root"]);
  if (subcommand === "list") {
    if (args.length !== 2) throw new UsageError("root list accepts no arguments", ["root", "list"]);
    console.log(JSON.stringify(loadHome(home).roots, null, 2));
    return;
  }
  if (subcommand === "add") {
    if (args.length <= 2) {
      throw new UsageError("root add requires at least one workspace root path", ["root", "add"]);
    }
    const current = loadHome(home);
    const roots = addRoots(current.home, current.roots, args.slice(2));
    const index = scanRoots(current.home, roots);
    console.log(JSON.stringify({
      workspaceRoots: roots.roots,
      indexedWorkspaces: index.entries.length,
    }, null, 2));
    return;
  }
  throw new UsageError(`unknown root command: ${subcommand}`, ["root"]);
}

function dispatchScan(home: string | undefined, args: string[]): void {
  if (args.length !== 1) throw new UsageError("scan accepts no arguments", ["scan"]);
  const current = loadHome(home);
  const index = scanRoots(current.home, current.roots);
  console.log(JSON.stringify({
    indexedWorkspaces: index.entries.length,
    index: `${current.home}/cache/workspaces.json`,
  }, null, 2));
}

function dispatchRegister(home: string | undefined, args: string[]): void {
  console.log(JSON.stringify(registerProject(home, parseRegister(args.slice(1))), null, 2));
}

function dispatchAttach(home: string | undefined, args: string[]): void {
  if (args.length !== 3) throw new UsageError("attach requires <project> <path>", ["attach"]);
  console.log(JSON.stringify(attachWorkspace(home, args[1]!, args[2]!), null, 2));
}

function dispatchPreference(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("preference requires a subcommand", ["preference"]);
  if (subcommand === "set") {
    console.log(JSON.stringify(setPreference(home, parsePreferenceSet(args.slice(2))), null, 2));
  } else if (subcommand === "list") {
    console.log(JSON.stringify(listPreferences(home, optionalProject(args.slice(2))), null, 2));
  } else if (subcommand === "retire") {
    console.log(JSON.stringify(retirePreference(home, parsePreferenceRetire(args.slice(2))), null, 2));
  } else {
    throw new UsageError(`unknown preference command: ${subcommand}`, ["preference"]);
  }
}

function dispatchExecution(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("execution requires a subcommand", ["execution"]);
  if (subcommand === "inspect") {
    if (args.length !== 4) {
      throw new UsageError("execution inspect requires <project> <mission-id>", ["execution", "inspect"]);
    }
    console.log(JSON.stringify(inspectExecution(home, args[2]!, args[3]!), null, 2));
    return;
  }
  if (subcommand === "authorize") {
    console.log(JSON.stringify(authorizeExecution(home, parseExecutionAuthorize(args.slice(2))), null, 2));
    return;
  }
  throw new UsageError(`unknown execution command: ${subcommand}`, ["execution"]);
}

function dispatchContribution(home: string | undefined, args: string[]): void {
  const subcommand = args[1];
  if (subcommand === undefined) throw new UsageError("contribution requires a subcommand", ["contribution"]);
  if (subcommand !== "reconcile-lease") {
    throw new UsageError(`unknown contribution command: ${subcommand}`, ["contribution"]);
  }
  if (args.length !== 5) {
    throw new UsageError(
      "contribution reconcile-lease requires <conversation-id> <batch-id> <key>",
      ["contribution", "reconcile-lease"],
    );
  }
  console.log(JSON.stringify(runContributionReconcileLeaseCli(home, args[2]!, args[3]!, args[4]!), null, 2));
}

function dispatchStatusLine(home: string | undefined, args: string[]): void {
  const options = parseStatusLineOptions(args.slice(1));
  const input = statusLineInput(process.stdin.isTTY);
  const host = statusLineHostContext(input, options.cwd);
  console.log(renderStatusLine(statusLineProjection(home, host.cwd, host.projectName)));
}

async function dispatchUi(home: string | undefined, args: string[]): Promise<void> {
  // Lazy-load the UI module tree so ordinary CLI invocations never pay for the
  // server, conversation runtime, or autonomy client imports.
  const { parseServerArguments, startWorkbenchUi } = await import("./ui-server");
  const options = parseServerArguments(args.slice(1));
  // The CLI's leading-global --home is the single home authority for the UI
  // entry; an explicit server-side --home after `ui` keeps its own semantics.
  startWorkbenchUi(home === undefined ? options : { ...options, home });
}

async function dispatchObserver(
  home: string | undefined,
  args: string[],
): Promise<Awaited<ReturnType<typeof runDogfoodObserver>>> {
  const parsed = parseTaskOptions(
    args.slice(1),
    0,
    new Set(["--attempt", "--worker"]),
    new Set(),
  );
  assertTaskOptions(parsed, new Set(["--attempt", "--worker"]));
  return runDogfoodObserver({
    ...(home === undefined ? {} : { home }),
    attemptId: taskOption(parsed, "--attempt"),
    workerId: taskOption(parsed, "--worker"),
  });
}

function spawnDogfoodObserver(input: {
  readonly home: string;
  readonly attemptId: string;
  readonly workerId: string;
}): {
  readonly version: "rosso.dogfood-observer-launch.v1";
  readonly status: "started";
  readonly attemptId: string;
  readonly workerId: string;
} {
  const entry = process.argv[1];
  const command = entry !== undefined && /\.(?:ts|js)$/u.test(entry)
    ? [process.execPath, entry]
    : [process.execPath];
  const child = spawn(command[0]!, [
    ...command.slice(1),
    "--home",
    input.home,
    "observer",
    "--attempt",
    input.attemptId,
    "--worker",
    input.workerId,
  ], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.once("error", (error) => {
    try {
      recordDogfoodObserverLaunchFailure(
        { home: input.home, attemptId: input.attemptId, workerId: input.workerId },
        `observer launch failed: ${error.message}`,
      );
    } catch {
      // The observer is best-effort; a launch-recording failure must not crash
      // or change the already-settled parent Task result.
    }
  });
  child.unref();
  return {
    version: "rosso.dogfood-observer-launch.v1",
    status: "started",
    attemptId: input.attemptId,
    workerId: input.workerId,
  };
}

function parseStatusLineOptions(raw: string[]): { cwd?: string } {
  const args = raw[0] === "claude" ? raw.slice(1) : raw;
  if (args.length === 0) return {};
  if (args.length === 2 && args[0] === "--cwd" && args[1]?.trim()) return { cwd: args[1] };
  throw new UsageError("statusline accepts optional 'claude' and --cwd <path>", ["statusline"]);
}

/**
 * The narrow contribution lease reconcile command: the production-reachable
 * recovery owner for one exact retained contribution lease. It reuses the
 * registry's typed reconcile and never touches Task attempt or Work Cell
 * evidence. The contribution runtime is loaded lazily so the CLI keeps
 * loading in a minimal Workbench-only fixture without the sibling worker
 * policy.
 */
function runContributionReconcileLeaseCli(
  homeArgument: string | undefined,
  conversationId: string,
  batchId: string,
  key: string,
): ContributionLeaseReconcileResult {
  const { createConversationContributionRegistry } = require("../../workbench/src/conversation/contributions") as
    typeof import("../../workbench/src/conversation/contributions");
  const registry = createConversationContributionRegistry(homeArgument);
  return registry.reconcileLease({ conversationId, batchId, key });
}

async function runTaskCli(home: string | undefined, raw: string[]): Promise<unknown> {
  const controlPlane = createLocalTaskControlPlane(home);
  const command = raw[0];
  if (!command) throw new UsageError("task requires a subcommand", ["task"]);
  if (!TASK_SUBCOMMANDS.has(command)) {
    throw new UsageError(`unknown task command: ${command}`, ["task"]);
  }
  try {
    return await dispatchTaskCommand(controlPlane, home, command, raw);
  } catch (error: unknown) {
    if (error instanceof ParseUsageError) {
      throw new UsageError(error.message, ["task", command], { cause: error });
    }
    throw error;
  }
}

async function dispatchTaskCommand(
  controlPlane: ReturnType<typeof createLocalTaskControlPlane>,
  home: string | undefined,
  command: string,
  raw: string[],
): Promise<unknown> {
  if (command === "list") {
    if (raw.length !== 1) throw new ParseUsageError("task list accepts no arguments");
    return controlPlane.list();
  }
  if (command === "show") {
    if (raw.length !== 2) throw new ParseUsageError("task show requires exactly one task id");
    return controlPlane.show(raw[1]!);
  }
  if (command === "attempts") {
    if (raw.length !== 2) throw new ParseUsageError("task attempts requires exactly one task id");
    return showPrincipalTaskAttempts(home, raw[1]!);
  }
  if (command === "reconcile-attempt") {
    const parsed = parseTaskOptions(
      raw.slice(1),
      1,
      new Set(["--attempt"]),
      new Set(),
    );
    assertTaskOptions(parsed, new Set(["--attempt"]));
    return reconcilePrincipalTaskAttempt(home, {
      id: parsed.positionals[0]!,
      attemptId: taskOption(parsed, "--attempt"),
    });
  }
  if (command === "create") {
    const parsed = parseTaskOptions(
      raw.slice(1),
      0,
      new Set([
        "--title",
        "--objective",
        "--next-actor",
        "--source-ref",
        "--expected-source-revision",
        "--project",
        "--worktree",
        "--mission",
      ]),
      new Set(["--accept", "--todo"]),
    );
    return controlPlane.execute({
      kind: "create",
      arguments: {
        title: taskOption(parsed, "--title"),
        objective: taskOption(parsed, "--objective"),
        acceptance: taskOptions(parsed, "--accept"),
        ...(parsed.values.has("--todo") ? { todos: taskOptions(parsed, "--todo") } : {}),
        nextActor: taskActor(parsed),
        sourceRef: taskOption(parsed, "--source-ref"),
        expectedSourceRevision: taskRevision(parsed, "--expected-source-revision", true),
        ...(parsed.values.has("--project") ? { project: taskOption(parsed, "--project") } : {}),
        ...(parsed.values.has("--worktree") ? { worktree: taskOption(parsed, "--worktree") } : {}),
        ...(parsed.values.has("--mission") ? { mission: taskOption(parsed, "--mission") } : {}),
      },
    });
  }
  if (command === "run") {
    const parsed = parseTaskOptions(
      raw.slice(1),
      1,
      new Set(["--worker", "--continue", "--max-steps", "--observer"]),
      new Set(),
      new Set(["--enable-observer"]),
    );
    assertTaskOptions(parsed, new Set(["--worker", "--continue", "--max-steps", "--observer", "--enable-observer"]));
    const maxSteps = parsePositiveIntegerOption(parsed, "--max-steps");
    const observerEnabled = parsed.values.has("--enable-observer");
    const observerWorker = parsed.values.has("--observer")
      ? taskOption(parsed, "--observer")
      : undefined;
    if (observerEnabled !== (observerWorker !== undefined)) {
      throw new ParseUsageError(
        "task run observer mode requires both --enable-observer and --observer <worker>",
      );
    }
    const runHome = resolveHome(home);
    const adapter = createForegroundRunSignalAdapter({ home: runHome });
    try {
      const result = await runPrincipalTask(home, {
        id: parsed.positionals[0]!,
        workerId: taskOption(parsed, "--worker"),
        ...(parsed.values.has("--continue")
          ? { continueFromAttemptId: taskOption(parsed, "--continue") }
          : {}),
        ...(maxSteps !== undefined ? { maxSteps } : {}),
      }, {
        controlBundle: adapter.controlBundle,
      });
      if (observerWorker === undefined) return result;
      return {
        ...result,
        observer: spawnDogfoodObserver({
          home: runHome,
          attemptId: result.attemptId,
          workerId: observerWorker,
        }),
      };
    } finally {
      adapter.dispose();
    }
  }

  const parsed = parseTaskOptions(
    raw.slice(1),
    1,
    new Set([
      "--next-actor",
      "--statement",
      "--summary",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
      "--authorization-id",
      "--expected-worktree",
      "--worktree",
      "--assessment-id",
      "--result-claim-id",
      "--producer-attempt-id",
      "--reviewer-ref",
      "--independence-basis",
      "--independence-source-ref",
      "--candidate-commit",
      "--verdict",
    ]),
    new Set(["--evidence-ref", "--finding"]),
  );
  const expectation = {
    id: parsed.positionals[0]!,
    expectedSourceRevision: taskRevision(parsed, "--expected-source-revision", true),
    expectedRevision: taskRevision(parsed, "--expected-revision", false),
  };
  if (command === "append-review") {
    const reviewed = parseTaskOptions(
      raw.slice(1),
      1,
      new Set([
        "--assessment-id",
        "--result-claim-id",
        "--producer-attempt-id",
        "--reviewer-ref",
        "--independence-basis",
        "--independence-source-ref",
        "--candidate-commit",
        "--verdict",
        "--expected-source-revision",
        "--expected-revision",
      ]),
      new Set(["--finding", "--evidence-ref"]),
    );
    assertTaskOptions(reviewed, new Set([
      "--assessment-id",
      "--result-claim-id",
      "--producer-attempt-id",
      "--reviewer-ref",
      "--independence-basis",
      "--independence-source-ref",
      "--candidate-commit",
      "--verdict",
      "--finding",
      "--evidence-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    const independence = taskOption(reviewed, "--independence-basis");
    if (independence !== "independent-review-context" && independence !== "unproven") {
      throw new ParseUsageError("--independence-basis must be independent-review-context or unproven");
    }
    const verdict = taskOption(reviewed, "--verdict");
    if (verdict !== "passed" && verdict !== "failed") {
      throw new ParseUsageError("--verdict must be passed or failed");
    }
    return controlPlane.execute({
      kind: "review",
      arguments: {
        ...expectation,
        assessmentId: taskOption(reviewed, "--assessment-id"),
        resultClaimId: taskOption(reviewed, "--result-claim-id"),
        ...(reviewed.values.has("--producer-attempt-id")
          ? { producerAttemptId: taskOption(reviewed, "--producer-attempt-id") }
          : {}),
        reviewerRef: taskOption(reviewed, "--reviewer-ref"),
        independenceBasis: independence,
        independenceSourceRef: taskOption(reviewed, "--independence-source-ref"),
        candidateCommit: taskOption(reviewed, "--candidate-commit"),
        verdict,
        findings: taskOptions(reviewed, "--finding"),
        evidenceRefs: taskOptions(reviewed, "--evidence-ref"),
      },
    });
  }
  if (command === "assign") {
    assertTaskOptions(parsed, new Set([
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "assign",
      arguments: {
        ...expectation,
        nextActor: taskActor(parsed),
      },
    });
  }
  if (command === "correct") {
    assertTaskOptions(parsed, new Set([
      "--statement",
      "--source-ref",
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "correct",
      arguments: {
        ...expectation,
        statement: taskOption(parsed, "--statement"),
        sourceRef: taskOption(parsed, "--source-ref"),
        nextActor: taskActor(parsed),
      },
    });
  }
  if (command === "link-execution") {
    assertTaskOptions(parsed, new Set([
      "--authorization-id",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "link-execution",
      arguments: {
        ...expectation,
        authorizationId: taskOption(parsed, "--authorization-id"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "rebind-worktree") {
    assertTaskOptions(parsed, new Set([
      "--expected-worktree",
      "--worktree",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "rebind-worktree",
      arguments: {
        ...expectation,
        expectedWorktreePath: taskOption(parsed, "--expected-worktree"),
        worktree: taskOption(parsed, "--worktree"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "submit") {
    assertTaskOptions(parsed, new Set([
      "--summary",
      "--evidence-ref",
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "submit",
      arguments: {
        ...expectation,
        summary: taskOption(parsed, "--summary"),
        evidenceRefs: taskOptions(parsed, "--evidence-ref"),
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "accept") {
    assertTaskOptions(parsed, new Set([
      "--source-ref",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "accept",
      arguments: {
        ...expectation,
        sourceRef: taskOption(parsed, "--source-ref"),
      },
    });
  }
  if (command === "reopen") {
    assertTaskOptions(parsed, new Set([
      "--statement",
      "--source-ref",
      "--next-actor",
      "--expected-source-revision",
      "--expected-revision",
    ]));
    return controlPlane.execute({
      kind: "reopen",
      arguments: {
        ...expectation,
        statement: taskOption(parsed, "--statement"),
        sourceRef: taskOption(parsed, "--source-ref"),
        nextActor: taskActor(parsed),
      },
    });
  }
  throw new ParseUsageError(`unknown task command: ${command}`);
}

interface ParsedTaskOptions {
  positionals: string[];
  values: Map<string, string[]>;
}

function parseTaskOptions(
  raw: string[],
  positionalCount: number,
  singles: ReadonlySet<string>,
  repeated: ReadonlySet<string>,
  booleans: ReadonlySet<string> = new Set(),
): ParsedTaskOptions {
  const positionals = raw.slice(0, positionalCount);
  if (positionals.length !== positionalCount || positionals.some((value) => value.startsWith("--"))) {
    throw new ParseUsageError("missing required task command argument");
  }
  const values = new Map<string, string[]>();
  for (let index = positionalCount; index < raw.length;) {
    const option = raw[index];
    if (option && booleans.has(option)) {
      if (values.has(option)) throw new ParseUsageError(`invalid task option sequence: ${raw.join(" ")}`);
      values.set(option, []);
      index += 1;
      continue;
    }
    const value = raw[index + 1];
    if (
      !option
      || (!singles.has(option) && !repeated.has(option))
      || !value
      || value.startsWith("--")
      || (singles.has(option) && values.has(option))
    ) {
      throw new ParseUsageError(`invalid task option sequence: ${raw.join(" ")}`);
    }
    values.set(option, [...(values.get(option) ?? []), value]);
    index += 2;
  }
  return { positionals, values };
}

function assertTaskOptions(parsed: ParsedTaskOptions, allowed: ReadonlySet<string>): void {
  for (const option of parsed.values.keys()) {
    if (!allowed.has(option)) throw new ParseUsageError(`invalid task option: ${option}`);
  }
}

function taskOption(parsed: ParsedTaskOptions, option: string): string {
  const value = parsed.values.get(option)?.[0];
  if (!value) throw new ParseUsageError(`task command requires ${option} <value>`);
  return value;
}

function taskOptions(parsed: ParsedTaskOptions, option: string): string[] {
  const values = parsed.values.get(option);
  if (!values?.length) throw new ParseUsageError(`task command requires ${option} <value>`);
  return values;
}

function taskRevision(
  parsed: ParsedTaskOptions,
  option: string,
  allowZero: boolean,
): number {
  const raw = taskOption(parsed, option);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new ParseUsageError(`${option} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
  }
  return value;
}

function parsePositiveIntegerOption(
  parsed: ParsedTaskOptions,
  option: string,
): number | undefined {
  if (!parsed.values.has(option)) return undefined;
  const raw = taskOption(parsed, option);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ParseUsageError(`${option} must be a positive integer`);
  }
  return value;
}

function taskActor(
  parsed: ParsedTaskOptions,
): "principal" | "agent" | "external" {
  const value = taskOption(parsed, "--next-actor");
  if (value !== "principal" && value !== "agent" && value !== "external") {
    throw new ParseUsageError("--next-actor must be principal, agent, or external");
  }
  return value;
}

function optionalFromHome(raw: string[]): string | undefined {
  const options = namedOptions(raw, new Set(["--from-home"]), ["migrate"]);
  return options.get("--from-home");
}

function parsePreferenceSet(raw: string[]): {
  id: string;
  statement: string;
  project?: string;
  reopenWhen?: string;
} {
  const id = positionalHead(raw, "preference set", ["preference", "set"]);
  const options = namedOptions(raw.slice(1), new Set(["--statement", "--project", "--reopen-when"]), ["preference", "set"]);
  const statement = options.get("--statement");
  if (!statement) throw new UsageError("preference set requires --statement <text>", ["preference", "set"]);
  return {
    id,
    statement,
    ...(options.has("--project") ? { project: options.get("--project")! } : {}),
    ...(options.has("--reopen-when") ? { reopenWhen: options.get("--reopen-when")! } : {}),
  };
}

function parsePreferenceRetire(raw: string[]): { id: string; project?: string } {
  const id = positionalHead(raw, "preference retire", ["preference", "retire"]);
  const options = namedOptions(raw.slice(1), new Set(["--project"]), ["preference", "retire"]);
  return { id, ...(options.has("--project") ? { project: options.get("--project")! } : {}) };
}

function optionalProject(raw: string[]): string | undefined {
  const options = namedOptions(raw, new Set(["--project"]), ["preference", "list"]);
  return options.get("--project");
}

function parseExecutionAuthorize(raw: string[]): {
  project: string;
  missionId: string;
  proposalId: string;
  proposalDigest: string;
  choices: string[];
  actorRef: string;
  sourceRef: string;
} {
  const project = raw[0];
  const missionId = raw[1];
  if (!project || project.startsWith("--") || !missionId || missionId.startsWith("--")) {
    throw new UsageError("execution authorize requires <project> <mission-id>", ["execution", "authorize"]);
  }
  const choices: string[] = [];
  const singles = new Map<string, string>();
  const allowedSingles = new Set(["--proposal-id", "--proposal-digest", "--actor-ref", "--source-ref"]);
  for (let index = 2; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !value || value.startsWith("--")) {
      throw new UsageError(`invalid execution authorize option sequence: ${raw.join(" ")}`, ["execution", "authorize"]);
    }
    if (option === "--choice") choices.push(value);
    else if (allowedSingles.has(option) && !singles.has(option)) singles.set(option, value);
    else throw new UsageError(`invalid execution authorize option sequence: ${raw.join(" ")}`, ["execution", "authorize"]);
  }
  const required = (option: string): string => {
    const value = singles.get(option);
    if (!value) throw new UsageError(`execution authorize requires ${option} <value>`, ["execution", "authorize"]);
    return value;
  };
  return {
    project,
    missionId,
    proposalId: required("--proposal-id"),
    proposalDigest: required("--proposal-digest"),
    choices,
    actorRef: required("--actor-ref"),
    sourceRef: required("--source-ref"),
  };
}

function positionalHead(raw: string[], command: string, helpPath: string[]): string {
  const value = raw[0];
  if (!value || value.startsWith("--")) throw new UsageError(`${command} requires an id`, helpPath);
  return value;
}

function namedOptions(raw: string[], allowed: Set<string>, helpPath: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !allowed.has(option) || !value || value.startsWith("--") || result.has(option)) {
      throw new UsageError(`invalid option sequence: ${raw.join(" ")}`, helpPath);
    }
    result.set(option, value);
  }
  return result;
}

function parseRegister(raw: string[]): { path: string; id: string; aliases: string[] } {
  let path: string | undefined;
  let id: string | undefined;
  const aliases: string[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const argument = raw[index]!;
    if (argument === "--id" || argument === "--alias") {
      const value = raw[index + 1];
      if (!value) throw new UsageError(`${argument} requires a value`, ["register"]);
      if (argument === "--id") id = value;
      else aliases.push(value);
      index += 1;
    } else if (argument.startsWith("--") || path !== undefined) {
      throw new UsageError(`invalid register argument: ${argument}`, ["register"]);
    } else {
      path = argument;
    }
  }
  if (!path || !id) throw new UsageError("register requires <path> and --id <stable-id>", ["register"]);
  return { path, id, aliases };
}

function parseInit(raw: string[]): {
  workspaceRoots: string[];
  setup: string[];
  targetRoot?: string;
} {
  const workspaceRoots: string[] = [];
  const setup: string[] = [];
  let targetRoot: string | undefined;
  for (let index = 0; index < raw.length; index += 2) {
    const option = raw[index];
    const value = raw[index + 1];
    if (!option || !value || value.startsWith("--")) {
      throw new UsageError(`invalid init option sequence: ${raw.join(" ")}`, ["init"]);
    }
    if (option === "--workspace-root") workspaceRoots.push(value);
    else if (option === "--setup") setup.push(value);
    else if (option === "--target-root" && targetRoot === undefined) targetRoot = value;
    else throw new UsageError(`invalid init option sequence: ${raw.join(" ")}`, ["init"]);
  }
  return {
    workspaceRoots,
    setup,
    ...(targetRoot ? { targetRoot } : {}),
  };
}

function parseSetupOptions(raw: string[], helpPath: string[]): { targetRoot?: string } {
  const options = namedOptions(raw, new Set(["--target-root"]), helpPath);
  return {
    ...(options.has("--target-root") ? { targetRoot: options.get("--target-root")! } : {}),
  };
}

function extractHome(raw: string[]): { args: string[]; home: string | undefined } {
  let home: string | undefined;
  let index = 0;
  while (raw[index] === "--home") {
    const value = raw[index + 1];
    if (!value) throw new UsageError("--home requires a path", []);
    home = value;
    index += 2;
  }
  return { args: raw.slice(index), home };
}
