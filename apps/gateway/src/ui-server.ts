import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { resolveHome } from "../../workbench/src/home";
import { WorkbenchActionError, executeWorkbenchAction } from "../../workbench/src/ui/actions";
import { AutonomyCliClient, type AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import {
  ExecutionAuthorizationActionError,
  executeExecutionAuthorizationAction,
} from "../../workbench/src/ui/execution-authorization-action";
import {
  buildWorkbenchSnapshot,
  missionSourceMatchesHead,
  WorkbenchRunnerActivityProjectionSchema,
  type AttentionItem,
} from "../../workbench/src/ui/projection";
import {
  anchorMigrationDecisionBriefPresentation,
  intentLineagePresentation,
  reconciliationActionDecisionBriefPresentation,
  verifiedCorrectionAwaitsSystemSettlement,
} from "../ui/operational-semantics.js";
import {
  buildWorkItemProjection,
  taskAttemptsSourceRef,
  type PrincipalTaskSourceObservation,
  type TaskAttemptSourceObservation,
} from "../../workbench/src/ui/work-items";
import {
  executeTaskCreateAction,
  executeTaskMutationAction,
  TaskActionError,
} from "../../workbench/src/ui/task-actions";
import {
  prepareTaskCorrectionDelivery,
  recordTaskCorrectionDelivery,
} from "../../workbench/src/ui/task-correction-delivery";
import {
  executeTaskExecutionLaunch,
  prepareTaskExecutionLaunch,
  TaskExecutionLaunchError,
  type TaskExecutionLaunchResult,
} from "../../workbench/src/ui/task-execution-launch";
import { executeTaskExecutionRecovery } from "../../workbench/src/ui/task-execution-recovery";
import {
  acceptTaskResult,
  submitVerifiedTaskResult,
} from "../../workbench/src/ui/task-verified-result";
import { loadPrincipalTasks, principalTasksPath } from "../../workbench/src/tasks";
import { listPreferences } from "../../workbench/src/preferences";
import { listPrincipalTaskWorkers } from "../../workbench/src/task-run";
import { currentSkillSourceProjection } from "../../workbench/src/skill-sources";
import { readDogfoodReviews, dogfoodReviewLogPath } from "../../workbench/src/dogfood-observer";
import { showPrincipalTaskAttempts } from "../../workbench/src/task-attempts";
import {
  createLocalTaskControlPlane,
  type LocalTaskControlPlane,
} from "../../workbench/src/local-task-control-plane";
import {
  ConversationSocketPathPrefix,
  ConversationSocketRuntime,
  type ConversationSocketData,
} from "../../workbench/src/conversation/transport";
import { createCoordinatorTurnOwner } from "../../workbench/src/conversation/turn-owner";
import { createConversationContextProvider } from "../../workbench/src/conversation/context";
import { createConversationTaskOperationHost } from "../../workbench/src/conversation/operations";
import { createConversationExecutionCarrierRegistry } from "../../workbench/src/conversation/execution-carrier";
import { createConversationContributionRegistry } from "../../workbench/src/conversation/contributions";
import { DEFAULT_DOGFOOD_OBSERVER_WORKER } from "../../workbench/src/dogfood-observer";

export interface ServerOptions {
  readonly home?: string;
  readonly port: number;
  readonly roots: readonly string[];
  /** Local startup defaults to one observer per settled conversation Run. */
  readonly observerWorkerId?: string;
}

export interface WorkbenchRequestHandlerDependencies {
  readonly localTaskControlPlaneFactory?: (home: string) => LocalTaskControlPlane;
  readonly conversationSocket?: ConversationSocketRuntime;
}

const repositoryRoot = resolve(import.meta.dir, "../../..");
const autonomyCliSource = resolve(import.meta.dir, "../../autonomy/src/cli.ts");
const maximumRequestBytes = 64 * 1024;

/**
 * Resolve how the Workbench talks to the Autonomy runner. A compiled
 * single-file Workbench binary prefers the sibling `rossovia-autonomy`
 * executable installed next to it; an explicit ROSSOVIA_AUTONOMY path always
 * wins; the source checkout falls back to running the Autonomy CLI source
 * with the current runtime.
 */
function resolveAutonomyClient(): { path: string; direct: boolean } {
  if (process.env.ROSSOVIA_AUTONOMY !== undefined && process.env.ROSSOVIA_AUTONOMY !== "") {
    return { path: process.env.ROSSOVIA_AUTONOMY, direct: true };
  }
  const sibling = join(dirname(process.execPath), "rossovia-autonomy");
  if (existsSync(sibling)) {
    return { path: sibling, direct: true };
  }
  return { path: autonomyCliSource, direct: false };
}

// Static UI assets are embedded via the generated module so the served
// surface works from a compiled single-file binary as well as from the source
// checkout. Regenerate with `bun run assets:generate` after changing ui/.
import { UI_ASSETS } from "./assets.generated";

export function createWorkbenchRequestHandler(
  options: ServerOptions,
  client: AutonomyClient,
  dependencies: WorkbenchRequestHandlerDependencies = {},
): (request: Request, server?: Bun.Server<ConversationSocketData>) => Promise<Response> {
  const taskActionsInFlight = new Set<string>();
  const home = resolveHome(options.home);
  const localTaskControlPlaneFactory = dependencies.localTaskControlPlaneFactory
    ?? createLocalTaskControlPlane;
  const localTaskControlPlane = localTaskControlPlaneFactory(home);

  return async (request: Request, server?: Bun.Server<ConversationSocketData>): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/conversations/latest") {
      if (dependencies.conversationSocket === undefined) {
        return json({ conversationId: null }, 200);
      }
      try {
        return json({
          conversationId: await dependencies.conversationSocket.latestConversationId() ?? null,
        }, 200);
      } catch (error: unknown) {
        return json({
          error: "journal-error",
          message: error instanceof Error ? error.message : String(error),
        }, 500);
      }
    }

    if (request.method === "GET" && url.pathname.startsWith(ConversationSocketPathPrefix)) {
      if (dependencies.conversationSocket === undefined) {
        return json({
          error: "conversation-socket-unavailable",
          message: "The conversation socket route is not installed on this server.",
        }, 404);
      }
      if (server === undefined) {
        return json({
          error: "conversation-socket-unavailable",
          message: "The conversation socket route requires the native Bun server instance.",
        }, 500);
      }
      const outcome = await dependencies.conversationSocket.upgrade(request, server, server.port ?? options.port);
      if (outcome !== undefined) return outcome;
      // A successful upgrade makes Bun ignore the fetch return.
      return undefined as unknown as Response;
    }

    if (request.method === "GET" && url.pathname === "/api/snapshot") {
      try {
        return json(await buildLiveSnapshot(options, client), 200);
      } catch (error: unknown) {
        return json({
          error: "snapshot-failed",
          message: error instanceof Error ? error.message : String(error),
        }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/tasks") {
      if (!exactWorkbenchOrigin(request, options.port)) {
        return json({
          error: "origin-rejected",
          message: "Workbench task actions accept only the explicit loopback Workbench origin.",
        }, 403);
      }
      try {
        const result = executeTaskCreateAction(
          options.home,
          await readJsonRequest(request, "task creation"),
          localTaskControlPlane,
        );
        return json({ ok: true, result }, 200);
      } catch (error: unknown) {
        return taskActionErrorResponse(error);
      }
    }

    const taskActionId = taskActionIdFromPath(url.pathname);
    if (request.method === "POST" && taskActionId !== null) {
      if (!exactWorkbenchOrigin(request, options.port)) {
        return json({
          error: "origin-rejected",
          message: "Workbench task actions accept only the explicit loopback Workbench origin.",
        }, 403);
      }
      try {
        const body = await readJsonRequest(request, "task mutation");
        const kind =
          body !== null
          && typeof body === "object"
          && "kind" in body
          && typeof body.kind === "string"
            ? body.kind
            : null;
        if (taskActionsInFlight.has(taskActionId)) {
          return json({
            error: "task-action-in-flight",
            message:
              `task ${taskActionId} already has an execution action in flight`,
          }, 409);
        }
        const reservesTask =
          kind === "launch-authorized-execution"
          || kind === "recover-linked-execution";
        if (reservesTask) taskActionsInFlight.add(taskActionId);
        try {
          const result = kind === "launch-authorized-execution"
            ? await launchTaskExecution(
              options,
              client,
              taskActionId,
              body,
            )
            : kind === "deliver-correction"
            ? await deliverTaskCorrection(
              options,
              client,
              taskActionId,
              body,
            )
            : kind === "recover-linked-execution"
            ? await executeTaskExecutionRecovery(
              options.home,
              (await buildLiveSnapshot(options, client)).workItems,
              taskActionId,
              body,
              client,
              localTaskControlPlane,
            )
            : kind === "submit-verified-execution"
              ? submitVerifiedTaskResult(
                localTaskControlPlane,
                home,
                (await buildLiveSnapshot(options, client)).workItems,
                taskActionId,
                body,
              )
              : kind === "accept"
                ? acceptTaskResult(
                  options.home,
                  (await buildLiveSnapshot(options, client)).workItems,
                  taskActionId,
                  body,
                  localTaskControlPlane,
                )
                : executeTaskMutationAction(
                  options.home,
                  taskActionId,
                  body,
                  localTaskControlPlane,
                );
          return json({ ok: true, result }, 200);
        } finally {
          if (reservesTask) taskActionsInFlight.delete(taskActionId);
        }
      } catch (error: unknown) {
        return taskActionErrorResponse(error);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/execution-authorizations") {
      if (!exactWorkbenchOrigin(request, options.port)) {
        return json({
          error: "origin-rejected",
          message: "Execution authorization accepts only the explicit loopback Workbench origin.",
        }, 403);
      }
      if (!isJsonContentType(request.headers.get("content-type"))) {
        return json({
          error: "content-type-rejected",
          message: "Execution authorization requires Content-Type: application/json.",
        }, 415);
      }
      const declaredLength = request.headers.get("content-length");
      if (declaredLength !== null) {
        const contentLength = Number(declaredLength);
        if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
          return json({ error: "invalid-content-length" }, 400);
        }
        if (contentLength > maximumRequestBytes) {
          return json({ error: "request-too-large" }, 413);
        }
      }
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > maximumRequestBytes) {
        return json({ error: "request-too-large" }, 413);
      }
      let unparsed: unknown;
      try {
        unparsed = JSON.parse(body);
      } catch {
        return json({
          error: "invalid-authorization-request",
          message: "Execution authorization requires a valid JSON object.",
        }, 400);
      }
      try {
        const result = executeExecutionAuthorizationAction(options.home, unparsed);
        return json({ ok: true, receipt: result.receipt }, 200);
      } catch (error: unknown) {
        if (error instanceof ExecutionAuthorizationActionError) {
          return json({ error: error.code, message: error.message }, error.status);
        }
        return json({
          error: "authorization-failed",
          message: error instanceof Error ? error.message : String(error),
        }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/actions") {
      if (!sameOrigin(request)) {
        return json({ error: "origin-rejected", message: "Workbench actions accept same-origin requests only." }, 403);
      }
      const contentLength = Number(request.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) {
        return json({ error: "request-too-large" }, 413);
      }
      try {
        const result = await executeWorkbenchAction(await request.json(), client);
        return json({ ok: true, result }, 200);
      } catch (error: unknown) {
        if (error instanceof WorkbenchActionError) {
          return json({ error: error.code, message: error.message }, error.status);
        }
        return json({
          error: "action-failed",
          message: error instanceof Error ? error.message : String(error),
        }, 502);
      }
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const asset = assetPath(url.pathname);
    if (asset === null) return new Response("Not found", { status: 404 });
    const body = UI_ASSETS[asset];
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
        ].join("; "),
        "Content-Type": contentType(asset),
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

if (import.meta.main) {
  startWorkbenchUi(parseServerArguments(process.argv.slice(2)));
}

/**
 * Start the Rossovia Principal Workbench web UI on 127.0.0.1. Long-running:
 * returns only when the server stops. One concrete home resolution for the
 * whole production entry: an explicit --home keeps its exact semantics, and
 * the default Rossovia home is normalized exactly once and shared by the
 * autonomy client, carrier and contribution registries, the request handler,
 * every snapshot/attempt projection, and every Task action authority.
 */
export function startWorkbenchUi(options: ServerOptions): void {
  const home = resolveHome(options.home);
  const { path: autonomyCli, direct } = resolveAutonomyClient();
  const client = new AutonomyCliClient(home, autonomyCli, process.execPath, direct);
  const carrierRegistry = createConversationExecutionCarrierRegistry(
    home,
    options.observerWorkerId === undefined
      ? {}
      : { observerWorkerId: options.observerWorkerId },
  );
  const contributionRegistry = createConversationContributionRegistry(home);
  const conversationSocket = new ConversationSocketRuntime(home, {
    turnOwner: createCoordinatorTurnOwner(),
    projectionProvider: createConversationContextProvider(home, { carrierRegistry, contributionRegistry }),
    operationHost: createConversationTaskOperationHost(home, { carrierRegistry, contributionRegistry }),
    carrierRegistry,
    contributionRegistry,
  });
  const requestHandler = createWorkbenchRequestHandler(
    { ...options, home },
    client,
    { conversationSocket },
  );
  const server: Bun.Server<ConversationSocketData> = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    fetch: (request, server) => requestHandler(request, server),
    websocket: conversationSocket.websocket,
  });
  console.log(`Rossovia Principal Workbench: ${server.url}`);
  console.log(`Supervision: Codex supervises Rossovia Workbench; unsupervised operation is unavailable.`);
}

async function buildLiveSnapshot(
  options: ServerOptions,
  client: AutonomyClient,
) {
  const snapshot = buildWorkbenchSnapshot({
    ...(options.home === undefined ? {} : { home: options.home }),
    localRepositoryRoots: options.roots,
  });
  const taskSourceRef = principalTasksPath(options.home);
  let taskSource: PrincipalTaskSourceObservation;
  try {
    taskSource = {
      standing: "available",
      sourceRef: taskSourceRef,
      source: loadPrincipalTasks(options.home),
    };
  } catch (error: unknown) {
    taskSource = {
      standing: "unavailable",
      sourceRef: taskSourceRef,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  const observedRunners = await Promise.all(snapshot.runners.map(async (runner) => {
    const activity = await readRunnerActivity(client, runner.status.missionId);
    try {
      const observed = await client.status(runner.status.missionId);
      if (observed.live !== true) {
        return {
          ...runner,
          live: observed.live,
          activity,
          ...("reachability" in observed
            ? { reachability: observed.reachability }
            : {}),
        };
      }
      const { live: _live, ...liveStatus } = observed;
      return {
        ...runner,
        live: true,
        status: liveStatus,
        activity,
        freshness: {
          kind: "live" as const,
          observedAt: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      return {
        ...runner,
        live: null,
        activity,
        liveError: error instanceof Error ? error.message : String(error),
      };
    }
  }));
  const runners = observedRunners.map((runner) => ({
    ...runner,
    anchorMigrationSource: projectAnchorMigrationSource(snapshot, runner),
  }));
  // Runner-scope read failures join the snapshot as attributable errors so
  // the projection can fold them into that runner's single anomaly scene: an
  // unreadable live activity AND a failed live status read are both raw
  // evidence, never a silent fallback to the cached record.
  const runnerSourceErrors = runners.flatMap((runner) => {
    const errors: Array<{
      scope: "runner";
      source: string;
      message: string;
    }> = [];
    const activity = runner.activity;
    if (
      activity !== null
      && typeof activity === "object"
      && "error" in activity
      && typeof activity.error === "string"
    ) {
      errors.push({
        scope: "runner",
        source: runner.sourcePath,
        message: activity.error,
      });
    }
    if (runner.live === null && "liveError" in runner) {
      const liveError = runner.liveError;
      if (typeof liveError === "string") {
        errors.push({
          scope: "runner",
          source: runner.sourcePath,
          message: liveError,
        });
      }
    }
    return errors;
  });
  const taskErrors = taskSource.standing === "available"
    ? []
    : [{
      scope: "home" as const,
      source: taskSource.sourceRef,
      message: taskSource.reason,
    }];
  const taskAttention = taskSource.standing === "available"
    ? []
    : [{
      priority: "warning" as const,
      code: "source-error" as const,
      summary: taskSource.reason,
      source: taskSource.sourceRef,
    }];
  const taskAttempts = readTaskAttemptsProjections(options.home, taskSource);
  const observerReviews = readObserverReviews(options.home);
  const settings = readSettingsProjection(options, observerReviews);
  const liveSnapshot = {
    ...snapshot,
    complete:
      snapshot.complete
      && runnerSourceErrors.length === 0
      && taskSource.standing === "available",
    runners,
    attention: [
      ...refineLiveRunnerAttention(snapshot.attention, runners),
      ...taskAttention,
    ],
    errors: [...snapshot.errors, ...runnerSourceErrors, ...taskErrors],
  };
  return {
    ...liveSnapshot,
    workItems: buildWorkItemProjection(liveSnapshot, taskSource, taskAttempts, options.home),
    observerReviews,
    settings,
  };
}

function readObserverReviews(home: string | undefined) {
  const sourceRef = dogfoodReviewLogPath(home);
  try {
    const reviews = readDogfoodReviews(home).map((review) => ({
      ...review,
      relatedConversationRefs: review.evidenceRefs.filter((ref) => ref.startsWith("conversation:")),
    }));
    return {
      version: "rosso.dogfood-review-projection.v1" as const,
      standing: "available" as const,
      sourceRef,
      reviews,
    };
  } catch (error: unknown) {
    return {
      version: "rosso.dogfood-review-projection.v1" as const,
      standing: "unavailable" as const,
      sourceRef,
      reviews: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function readSettingsProjection(
  options: ServerOptions,
  observerReviews: ReturnType<typeof readObserverReviews>,
) {
  const sourceRef = "operations/autonomy/src/worker-policy.ts";
  try {
    const workers = listPrincipalTaskWorkers();
    return {
      version: "rosso.settings-projection.v1" as const,
      standing: "available" as const,
      workerPolicySource: sourceRef,
      workers: workers.workers,
      providers: [...new Map(workers.workers.map((worker) => [worker.provider, {
        id: worker.provider,
        workerIds: workers.workers.filter((candidate) => candidate.provider === worker.provider).map((candidate) => candidate.id),
        models: [...new Set(workers.workers.filter((candidate) => candidate.provider === worker.provider).map((candidate) => candidate.model))],
        credential: [...new Set(workers.workers.filter((candidate) => candidate.provider === worker.provider).map((candidate) => candidate.availability.status))].join(" / "),
      }])).values()],
      preferences: listPreferences(options.home),
      skillSources: currentSkillSourceProjection(),
      observer: {
        enabled: options.observerWorkerId !== undefined,
        workerId: options.observerWorkerId ?? null,
        reviewSource: observerReviews.sourceRef,
      },
      boundaries: {
        credentials: "环境变量存在性只投影为 available/unavailable；密钥不进入 Workbench UI。",
        policy: "worker/provider/model/reasoning 由当前 host worker policy 提供；Settings 不复制第二份运行策略。",
      },
      directories: {
        environment: "ROSSO_HOME",
        currentDefault: "~/.rosso",
        targetDefault: "~/.rossovia",
        projectNamespace: ".rossovia/",
        hostEntry: "ROSSOVIA.md",
        source: "design/operations/ROSSOVIA-DIRECTORY-LAYOUT.md",
      },
    };
  } catch (error: unknown) {
    return {
      version: "rosso.settings-projection.v1" as const,
      standing: "unavailable" as const,
      workerPolicySource: sourceRef,
      workers: [],
      providers: [],
      preferences: { version: "rosso.preference-projection.v2" as const, projectId: null, preferences: [] },
      skillSources: currentSkillSourceProjection(),
      observer: {
        enabled: options.observerWorkerId !== undefined,
        workerId: options.observerWorkerId ?? null,
        reviewSource: observerReviews.sourceRef,
      },
      directories: {
        environment: "ROSSO_HOME",
        currentDefault: "~/.rosso",
        targetDefault: "~/.rossovia",
        projectNamespace: ".rossovia/",
        hostEntry: "ROSSOVIA.md",
        source: "design/operations/ROSSOVIA-DIRECTORY-LAYOUT.md",
      },
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Read-only per-task attempt projection. A single task whose attempt evidence
 * cannot be read must not fail the whole snapshot: it stays HTTP 200 with the
 * stable source reference and an attributable reason on that task. Reading
 * never copies or rewrites the attempt, final record, or settlement sources.
 */
function readTaskAttemptsProjections(
  home: string | undefined,
  taskSource: PrincipalTaskSourceObservation,
): Readonly<Record<string, TaskAttemptSourceObservation>> {
  if (taskSource.standing !== "available") return {};
  const projections: Record<string, TaskAttemptSourceObservation> = {};
  for (const task of taskSource.source.tasks) {
    try {
      projections[task.id] = {
        standing: "available",
        sourceRef: taskAttemptsSourceRef,
        attempts: showPrincipalTaskAttempts(home, task.id),
      };
    } catch (error: unknown) {
      projections[task.id] = {
        standing: "unavailable",
        sourceRef: taskAttemptsSourceRef,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return projections;
}

async function deliverTaskCorrection(
  options: ServerOptions,
  client: AutonomyClient,
  taskId: string,
  request: unknown,
) {
  const snapshot = await buildLiveSnapshot(options, client);
  const plan = prepareTaskCorrectionDelivery(
    snapshot.workItems,
    taskId,
    request,
  );
  if (plan.retainedResult !== null) return plan.retainedResult;
  const runnerResult = await executeWorkbenchAction({
    kind: "contribution",
    target: plan.target,
    text: plan.correction.statement,
  }, client, plan.attribution);
  return recordTaskCorrectionDelivery(options.home, plan, runnerResult);
}

async function launchTaskExecution(
  options: ServerOptions,
  client: AutonomyClient,
  taskId: string,
  request: unknown,
): Promise<TaskExecutionLaunchResult> {
  const home = resolveHome(options.home);
  const snapshot = await buildLiveSnapshot(options, client);
  const initial = await executeTaskExecutionLaunch(
    home,
    snapshot.workItems,
    taskId,
    request,
    client,
  );
  if (initial.standing !== "launch-started-awaiting-consumption") {
    return initial;
  }

  const refreshed = await buildLiveSnapshot(options, client);
  try {
    const refreshedPlan = prepareTaskExecutionLaunch(
      home,
      refreshed.workItems,
      taskId,
      request,
    );
    if (refreshedPlan.kind === "start") {
      return initial;
    }
    return await executeTaskExecutionLaunch(
      home,
      refreshed.workItems,
      taskId,
      request,
      client,
    );
  } catch (error: unknown) {
    if (
      error instanceof TaskExecutionLaunchError
      && error.code === "launch-unavailable"
    ) {
      return initial;
    }
    throw error;
  }
}

function projectAnchorMigrationSource(
  snapshot: ReturnType<typeof buildWorkbenchSnapshot>,
  runner: {
    readonly status: { readonly missionId: string };
    readonly binding:
      | { readonly kind: "project-mission"; readonly projectKey: string }
      | { readonly kind: "unbound" };
  },
) {
  if (runner.binding.kind !== "project-mission") {
    return {
      standing: "unavailable" as const,
      reason: "runner has no exact project Mission binding",
    };
  }
  const projectKey = runner.binding.projectKey;
  const project = snapshot.projects.find(
    (candidate) => candidate.projectKey === projectKey,
  );
  const mission = project?.missions.find(
    (candidate) => candidate.id === runner.status.missionId,
  );
  if (
    project === undefined
    || mission === undefined
    || project.registration !== "registered"
    || typeof project.identity.id !== "string"
    || project.primaryWorkspace === null
    || mission.sourceRoot !== project.primaryWorkspace
    || mission.observedGitContext.head === null
  ) {
    return {
      standing: "unavailable" as const,
      reason: "migration source is not the registered primary Mission at a Git HEAD",
    };
  }
  const relativePath = relative(mission.sourceRoot, mission.sourcePath);
  if (
    relativePath.startsWith("..")
    || !missionSourceMatchesHead(
      mission.sourceRoot,
      mission.observedGitContext.head,
      relativePath,
    )
  ) {
    return {
      standing: "unavailable" as const,
      reason: "migration source differs from its committed Git HEAD",
    };
  }
  return {
    standing: "committed-primary" as const,
    projectId: project.identity.id,
    relativePath,
    gitHead: mission.observedGitContext.head,
  };
}

async function readRunnerActivity(
  client: AutonomyClient,
  missionId: string,
): Promise<unknown> {
  try {
    const candidate = await client.activity(missionId);
    return validateRunnerActivityProjection(candidate);
  } catch (error: unknown) {
    return unavailableActivity(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function validateRunnerActivityProjection(
  candidate: unknown,
  observedAt = new Date().toISOString(),
): unknown {
  const parsed = WorkbenchRunnerActivityProjectionSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return unavailableActivity(
    `activity projection rejected: ${parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "activity"} ${issue.message}`)
      .join("; ")}`,
    observedAt,
  );
}

function unavailableActivity(error: string, observedAt = new Date().toISOString()) {
  return {
    source: "mission-timeline",
    observedAt,
    eventCount: 0,
    intentLineage: {
      standing: "unavailable",
      reason: error,
      activeAnchor: null,
    },
    anchorMigrationProposal: null,
    reconciliationAction: null,
    currentEffect: null,
    currentCorrection: null,
    recentCorrections: [],
    currentTurn: null,
    lastEvent: null,
    recentEvents: [],
    error,
  };
}

type LiveRunnerProjection = {
  readonly sourcePath: string;
  readonly status: {
    readonly runnerId?: string;
    readonly missionId: string;
    readonly state?: string;
    readonly inputWatermark?: number;
    readonly reconciledWatermark?: number;
  };
  readonly binding:
    | {
      readonly kind: "project-mission";
      readonly projectKey: string;
    }
    | {
      readonly kind: "unbound";
    };
  readonly live: boolean | null;
  readonly activity: unknown;
  readonly anchorMigrationSource?: unknown;
};

export function refineLiveRunnerAttention(
  attention: readonly AttentionItem[],
  runners: readonly LiveRunnerProjection[],
): AttentionItem[] {
  const refined = attention.map((item): AttentionItem => {
    if (
      item.code !== "runner-input-pending"
      && item.code !== "runner-anchor-pending"
    ) return item;
    const runner = runners.find(
      (candidate) => candidate.status.missionId === item.missionId,
    );
    if (runner === undefined) {
      return item;
    }
    const activity = runner.activity !== null && typeof runner.activity === "object"
      ? runner.activity
      : {};
    const lineage = intentLineagePresentation(activity);
    if (lineage.standing === "legacy-unanchored") {
      const decisionBrief = anchorMigrationDecisionBriefPresentation(
        activity,
        runner,
        runner.anchorMigrationSource,
      );
      if (decisionBrief.decisionable) {
        return {
          ...item,
          priority: "principal-decision",
          code: "runner-anchor-migration-decision",
          summary:
            `Mission ${runner.status.missionId} has an exact legacy Intent Anchor migration action awaiting Principal AUTHORIZE MIGRATION/HOLD (${decisionBrief.proposalId} · ${decisionBrief.proposalDigest}); only its proposal view is read-only`,
        };
      }
      const intentLineage = (
        activity as {
          readonly intentLineage?: {
            readonly priorEventCount?: number;
            readonly priorTimelineDigest?: string;
          };
        }
      ).intentLineage;
      return {
        ...item,
        priority: "warning",
        code: "runner-legacy-unanchored",
        summary:
          `Mission ${runner.status.missionId} 保留 ${intentLineage?.priorEventCount ?? "未知"} 个 legacy 事件但没有授权 Intent Anchor；timeline ${intentLineage?.priorTimelineDigest ?? "不可用"} 必须由独立的 Principal migration proposal 精确绑定后才能继续语义工作`,
      };
    }
    if (lineage.standing === "unavailable") {
      return {
        ...item,
        priority: "warning",
        code: "runner-lineage-unavailable",
        summary:
          `Mission ${runner.status.missionId} intent lineage is unavailable or invalid; cached runner state cannot authorize semantic work`,
      };
    }
    const reconciliationBrief = reconciliationActionDecisionBriefPresentation(
      activity,
      runner,
      runner.anchorMigrationSource,
    );
    if (reconciliationBrief.decisionable) {
      return {
        ...item,
        priority: "principal-decision",
        code: "runner-reconciliation-decision",
        summary:
          `Mission ${runner.status.missionId} 等待 Principal 决策：`
          + "SETTLE_CONTINUE / RECLASSIFY_CORRECTION / HOLD"
          + ` · ${reconciliationBrief.proposalId}`
          + ` · ${reconciliationBrief.proposalDigest.slice(0, 12)}`,
      };
    }
    if (reconciliationBrief.standing === "authorized-awaiting-execution") {
      return {
        ...item,
        priority: "notice",
        code: "runner-reconciliation-authorized",
        summary:
          `Mission ${runner.status.missionId} reconciliation action is authorized and awaiting one-use execution`,
      };
    }
    if (reconciliationBrief.standing === "execution-attempt-consumed") {
      return {
        ...item,
        priority: "warning",
        code: "runner-reconciliation-attempt-consumed",
        summary:
          `Mission ${runner.status.missionId} reconciliation attempt was consumed without a terminal outcome; do not replay or infer completion`,
      };
    }
    if (!verifiedCorrectionAwaitsSystemSettlement(runner)) return item;
    return {
      ...item,
      priority: "notice",
      code: "correction-awaiting-system-settlement",
      summary:
        `Mission ${runner.status.missionId} has a verified local correction awaiting system settlement; no new Principal decision is requested`,
    };
  });
  for (const runner of runners) {
    if (runner.live === true) continue;
    if (runner.live === null) {
      refined.push({
        priority: "warning",
        code: "runner-reachability-unverified",
        summary:
          `Mission ${runner.status.missionId} runner reachability could not be verified from this observer; cached state does not prove either a live or stopped carrier`,
        ...(runner.status.runnerId === undefined
          ? {}
          : { runnerId: runner.status.runnerId }),
        ...(runner.binding.kind === "project-mission"
          ? { projectKey: runner.binding.projectKey }
          : {}),
        missionId: runner.status.missionId,
        source: runner.sourcePath,
      });
      continue;
    }
    if (
      runner.status.state === "stopped"
      || runner.status.state === "mission-stopped"
    ) continue;
    refined.push({
      priority: "warning",
      code: "runner-unreachable",
      summary:
        `Mission ${runner.status.missionId} runner is unreachable; ${runner.status.state} is cached state only`,
      ...(runner.status.runnerId === undefined
        ? {}
        : { runnerId: runner.status.runnerId }),
      ...(runner.binding.kind === "project-mission"
        ? { projectKey: runner.binding.projectKey }
        : {}),
      missionId: runner.status.missionId,
      source: runner.sourcePath,
    });
  }
  return refined;
}

export function parseServerArguments(arguments_: readonly string[]): ServerOptions {
  let home: string | undefined;
  let port = 4317;
  let observerWorkerId: string | undefined = DEFAULT_DOGFOOD_OBSERVER_WORKER;
  const roots = [repositoryRoot];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    const value = arguments_[index + 1];
    if (argument === "--disable-observer" || argument === "--enable-observer") {
      observerWorkerId = argument === "--disable-observer"
        ? undefined
        : DEFAULT_DOGFOOD_OBSERVER_WORKER;
      continue;
    }
    if (argument === "--observer") {
      if (value === undefined || value.startsWith("--") || value.trim() === "") {
        throw new Error("--observer requires a worker id");
      }
      observerWorkerId = value;
      index += 1;
      continue;
    }
    if (argument === "--home" || argument === "--root" || argument === "--port") {
      if (value === undefined) throw new Error(`${argument} requires a value`);
      if (argument === "--home") home = resolve(value);
      if (argument === "--root") roots.push(resolve(value));
      if (argument === "--port") {
        port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65_535) {
          throw new Error("--port must be an integer from 1 to 65535");
        }
      }
      index += 1;
      continue;
    }
    throw new Error(`unknown Workbench UI option: ${argument}`);
  }
  return {
    ...(home === undefined ? {} : { home }),
    port,
    roots: [...new Set(roots)],
    ...(observerWorkerId === undefined ? {} : { observerWorkerId }),
  };
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function exactWorkbenchOrigin(request: Request, port: number): boolean {
  const expected = `http://127.0.0.1:${port}`;
  const origin = request.headers.get("origin");
  return origin === expected && new URL(request.url).origin === expected;
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

async function readJsonRequest(request: Request, label: string): Promise<unknown> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new TaskActionError(
      415,
      "invalid-task",
      `${label} requires Content-Type: application/json.`,
    );
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const contentLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(contentLength)
      || contentLength < 0
      || contentLength > maximumRequestBytes
    ) {
      throw new TaskActionError(
        contentLength > maximumRequestBytes ? 413 : 400,
        "invalid-task",
        contentLength > maximumRequestBytes
          ? "task request is too large"
          : "task request has invalid Content-Length",
      );
    }
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumRequestBytes) {
    throw new TaskActionError(413, "invalid-task", "task request is too large");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new TaskActionError(
      400,
      "invalid-task",
      `${label} requires a valid JSON object.`,
    );
  }
}

function taskActionIdFromPath(pathname: string): string | null {
  const match = /^\/api\/tasks\/([^/]+)\/actions$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

function taskActionErrorResponse(error: unknown): Response {
  if (error instanceof TaskExecutionLaunchError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  if (error instanceof TaskActionError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  if (error instanceof WorkbenchActionError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  return json({
    error: "task-action-failed",
    message: error instanceof Error ? error.message : String(error),
  }, 500);
}

function assetPath(pathname: string): string | null {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  return relative in UI_ASSETS ? relative : null;
}

function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

function json(value: unknown, status: number): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
