import { existsSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { resolveHome } from "../../workbench/src/home";
import { packageVersionLabel } from "./help";
import { gitRoot } from "../../workbench/src/workspace";
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
import {
  OBSERVER_EVIDENCE_PROJECTION_VERSION,
  OBSERVER_REVIEW_DETAIL_PROJECTION_VERSION,
  observerAttemptCorrelationProjection,
  observerEvidenceProjection,
  observerReviewDetailProjection,
  readWorkflowReviews,
  workflowReviewLogPath,
  workflowReviewReadPaths,
  type ObserverAttemptCorrelationProjection,
  type ObserverEvidenceProjectionStanding,
  type ObserverReviewDetailProjectionStanding,
} from "../../workbench/src/workflow-observer";
import { showPrincipalTaskAttemptsForTasks } from "../../workbench/src/task-attempts";
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
import { RuntimeStatusProjectionSchema, type RuntimeStatusProjection } from "../../autonomy/src/conversation-prompt";
import { createConversationTaskOperationHost } from "../../workbench/src/conversation/operations";
import { createConversationExecutionCarrierRegistry } from "../../workbench/src/conversation/execution-carrier";
import { createConversationContributionRegistry } from "../../workbench/src/conversation/contributions";
import { DEFAULT_WORKFLOW_OBSERVER_WORKER } from "../../workbench/src/workflow-observer";
import {
  runSelfCheckStartupGate,
  type SelfCheckStartupGate,
} from "../../workbench/src/self-check";

export interface ServerOptions {
  readonly home?: string;
  readonly port: number;
  readonly roots: readonly string[];
  /**
   * Local startup defaults to one observer per settled Task attempt — the
   * conversation carrier's task_continue settles exactly one such attempt;
   * a plain conversation Run settles only journal/turn evidence and is not
   * observed.
   */
  readonly observerWorkerId?: string;
  /** Set only by the production startup entry after its mechanical gate. */
  readonly startupGate?: SelfCheckStartupGate;
}

/**
 * The bounded runtime status observation injected into every conversation
 * projection from the existing gateway startup gate and bound server options:
 * the exact package version label, the gate's mode/readiness/status, the
 * unique loopback endpoint, and the observed source head/dirty standing. Only
 * these bounded facts are projected — never the gate's cwd, root, status
 * lines, or any raw snapshot/transcript/provider payload — and absent
 * mechanical source facts stay absent; nothing is guessed from the
 * environment or the model.
 */
export function runtimeStatusProjection(
  options: Pick<ServerOptions, "port">,
  startupGate: SelfCheckStartupGate,
): RuntimeStatusProjection {
  const source = startupGate.mechanical.source;
  return RuntimeStatusProjectionSchema.parse({
    version: packageVersionLabel(),
    startup: {
      mode: startupGate.mode,
      readiness: startupGate.readiness,
      status: startupGate.startupStatus,
    },
    endpoint: `http://127.0.0.1:${options.port}`,
    ...(source === undefined ? {} : {
      ...(/^[0-9a-f]{40}$/u.test(source.head) ? { sourceHead: source.head } : {}),
      sourceDirty: source.dirty,
    }),
    checkedAt: startupGate.checkedAt,
  });
}

export interface WorkbenchRequestHandlerDependencies {
  readonly localTaskControlPlaneFactory?: (home: string) => LocalTaskControlPlane;
  readonly conversationSocket?: ConversationSocketRuntime;
}

const repositoryRoot = resolve(import.meta.dir, "../../..");
const autonomyCliSource = resolve(import.meta.dir, "../../autonomy/src/cli.ts");
const maximumRequestBytes = 64 * 1024;

/**
 * Upper bound on one compact review summary (`finding`) so the observer
 * first screen stays bounded. The full text is never lost or faked: the
 * read-only review detail route re-reads the exact stored record from the
 * same append-only review source, and `findingTruncated`/`fullTextAvailable`
 * markers keep the boundary honest — a truncated snippet is never presented
 * as the full review.
 */
export const OBSERVER_COMPACT_FINDING_MAX_CHARS = 512 as const;

/**
 * The compile-time default observation root is meaningful only while the UI
 * runs from its source checkout: there import.meta.dir names the real
 * apps/gateway/src directory and the resolved root is the repository checkout
 * itself. A compiled single-file binary embeds this module and resolves
 * import.meta.dir next to the executable, so the same arithmetic would name
 * an unrelated parent directory (often `/` or a plain user home tree) that
 * must never join the observed roots. Explicit --root entries always join.
 */
const SOURCE_CHECKOUT_MARKER = join("apps", "gateway", "src", "ui-server.ts");

export function defaultObservedRoots(candidateRoot = repositoryRoot): readonly string[] {
  if (!existsSync(join(candidateRoot, SOURCE_CHECKOUT_MARKER))) return [];
  try {
    return gitRoot(candidateRoot) === realpathSync(candidateRoot) ? [candidateRoot] : [];
  } catch {
    return [];
  }
}

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
  // Several browser tabs can request the initial projection at once. Keep one
  // serialized snapshot build for the handler and let every waiter reuse its
  // body; otherwise each tab repeats the synchronous Workbench/task evidence
  // scan and starves even the lightweight startup/conversation routes.
  let liveSnapshotBodyInFlight: Promise<string> | undefined;
  const readLiveSnapshotBody = (): Promise<string> => {
    if (liveSnapshotBodyInFlight !== undefined) return liveSnapshotBodyInFlight;
    const body = (async () => {
      // Give already-accepted lightweight requests one event-loop turn before
      // the synchronous projection scan begins.
      await Bun.sleep(0);
      const snapshot = await buildLiveSnapshot(options, client);
      return JSON.stringify({
        ...snapshot,
        ...(options.startupGate === undefined ? {} : { startup: options.startupGate }),
      });
    })();
    const tracked = body.finally(() => {
      if (liveSnapshotBodyInFlight === tracked) liveSnapshotBodyInFlight = undefined;
    });
    liveSnapshotBodyInFlight = tracked;
    return tracked;
  };

  // The initial browser projection is served compact: principal tasks carry
  // only their navigation summary until one is selected, so the first paint
  // never reads per-task attempt evidence nor serializes full task details.
  // The detail route re-reads the same canonical sources for exactly one
  // task and returns its full work item with the exact current revision.
  const noTaskDetails = new Set<string>();
  let compactSnapshotBodyInFlight: Promise<string> | undefined;
  const readCompactSnapshotBody = (): Promise<string> => {
    if (compactSnapshotBodyInFlight !== undefined) return compactSnapshotBodyInFlight;
    const body = (async () => {
      await Bun.sleep(0);
      const snapshot = await buildLiveSnapshot(options, client, noTaskDetails);
      return JSON.stringify({
        ...snapshot,
        ...(options.startupGate === undefined ? {} : { startup: options.startupGate }),
      });
    })();
    const tracked = body.finally(() => {
      if (compactSnapshotBodyInFlight === tracked) compactSnapshotBodyInFlight = undefined;
    });
    compactSnapshotBodyInFlight = tracked;
    return tracked;
  };

  // The on-demand project Worktree status route re-reads the canonical live
  // snapshot (the same per-worktree dirty scans the compact first paint
  // defers, plus the existing task/Mission/runner sources the retention
  // hints project from). Several tabs or rapid re-entries can request it at
  // once; keep one serialized build for the handler and let every waiter
  // reuse its snapshot, exactly like the compact/full snapshot bodies, so
  // the route never runs duplicate project scans and every response
  // describes the same single observation.
  let worktreeStatusSnapshotInFlight: Promise<WorktreeStatusSnapshot> | undefined;
  const readWorktreeStatusSnapshot = (): Promise<WorktreeStatusSnapshot> => {
    if (worktreeStatusSnapshotInFlight !== undefined) return worktreeStatusSnapshotInFlight;
    const build = (async () => {
      await Bun.sleep(0);
      // The route builds the canonical live snapshot — the same existing
      // sources (worktree/Git scan, tasks, Missions, runner cache plus live
      // probes, work items, reviews, settings) the project page already
      // shows — and projects only the requested project's Worktree
      // inventory plus its bounded retention hints. The per-worktree dirty
      // observation stays the full-snapshot default, never the compact
      // deferral.
      return buildLiveSnapshot(options, client);
    })();
    const tracked = build.finally(() => {
      if (worktreeStatusSnapshotInFlight === tracked) worktreeStatusSnapshotInFlight = undefined;
    });
    worktreeStatusSnapshotInFlight = tracked;
    return tracked;
  };
  const taskDetailBodiesInFlight = new Map<string, Promise<string>>();
  const readTaskDetailBody = (taskId: string): Promise<string> => {
    const existing = taskDetailBodiesInFlight.get(taskId);
    if (existing !== undefined) return existing;
    const body = (async () => {
      await Bun.sleep(0);
      const snapshot = await buildLiveSnapshot(options, client, new Set([taskId]));
      const item = snapshot.workItems.items.find(
        (candidate) =>
          candidate.id === `principal-task:${taskId}`
          && candidate.kind === "principal-task"
          && candidate.taskDetail !== undefined,
      );
      if (item === undefined) {
        throw new TaskActionError(
          404,
          "task-not-found",
          `Principal task not found: ${taskId}`,
        );
      }
      return JSON.stringify({ ok: true, workItem: item });
    })();
    const tracked = body.finally(() => {
      if (taskDetailBodiesInFlight.get(taskId) === tracked) {
        taskDetailBodiesInFlight.delete(taskId);
      }
    });
    taskDetailBodiesInFlight.set(taskId, tracked);
    return tracked;
  };

  return async (request: Request, server?: Bun.Server<ConversationSocketData>): Promise<Response> => {
    const url = new URL(request.url);

    if (
      options.startupGate?.mode === "safe-diagnostic"
      && (request.method === "POST"
        || request.method === "PUT"
        || request.method === "PATCH"
        || request.method === "DELETE"
        || isConversationSocketUpgrade(request, url))
    ) {
      return startupDiagnosticResponse(options.startupGate);
    }

    if (request.method === "GET" && url.pathname === "/api/startup") {
      return options.startupGate === undefined
        ? json({
          version: "rossovia.self-check.v1",
          mode: "not-checked",
          message: "The production startup gate is installed only by the ui entry.",
        }, 200)
        : json(options.startupGate, 200);
    }

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
        if (url.searchParams.get("compact") === "1") {
          return jsonText(await readCompactSnapshotBody(), 200);
        }
        return jsonText(await readLiveSnapshotBody(), 200);
      } catch (error: unknown) {
        return json({
          error: "snapshot-failed",
          message: error instanceof Error ? error.message : String(error),
          ...(options.startupGate === undefined ? {} : { startup: options.startupGate }),
        }, 500);
      }
    }

    const taskDetailId = taskDetailIdFromPath(url.pathname);
    if (request.method === "GET" && taskDetailId !== null) {
      try {
        return jsonText(await readTaskDetailBody(taskDetailId), 200);
      } catch (error: unknown) {
        if (error instanceof TaskActionError) {
          return json({ error: error.code, message: error.message }, error.status);
        }
        return json({
          error: "task-detail-failed",
          message: error instanceof Error ? error.message : String(error),
        }, 500);
      }
    }

    // The project page and the create-task form need the real per-worktree
    // dirty standing, which the compact first paint deliberately defers.
    // This read-only on-demand route rebuilds the canonical full snapshot
    // (the same observeWorktreeDirty default the full snapshot and the
    // task-detail route use) and projects only the requested project's
    // worktrees plus the total/dirty/clean/unknown summary. It carries no
    // write, persistence, or delete surface; a per-worktree dirty scan
    // failure keeps that worktree observable with an explicit unknown
    // standing (dirtyReason) and never infers clean.
    const projectWorktreeKey = projectWorktreeKeyFromPath(url.pathname);
    if (request.method === "GET" && projectWorktreeKey !== null) {
      try {
        const snapshot = await readWorktreeStatusSnapshot();
        return json(projectWorktreeStatusProjection(snapshot, projectWorktreeKey), 200);
      } catch (error: unknown) {
        if (error instanceof ProjectWorktreeStatusError) {
          return json({ error: error.code, message: error.message }, error.status);
        }
        return json({
          error: "worktree-status-failed",
          message: error instanceof Error ? error.message : String(error),
        }, 500);
      }
    }

    // Standard GET-only attempt evidence projection: the canonical strict
    // reader and the family-pinned digest phase run behind the same bounded
    // projection the observer cell sees. The route carries no write, command,
    // Task-mutation, or review-state surface; every non-available standing
    // fails closed with a fixed reason and never a projection, echoed id, or
    // raw path/payload.
    const attemptEvidenceId = attemptEvidenceIdFromPath(url.pathname);
    if (request.method === "GET" && attemptEvidenceId !== null) {
      const outcome = observerEvidenceProjection(options.home, attemptEvidenceId);
      if (outcome.standing === "available") {
        return json({
          version: OBSERVER_EVIDENCE_PROJECTION_VERSION,
          standing: "available",
          attemptId: attemptEvidenceId,
          projection: outcome.projection,
        }, 200);
      }
      return json({
        version: OBSERVER_EVIDENCE_PROJECTION_VERSION,
        standing: outcome.standing,
        projection: null,
        reason: observerEvidenceFailureReason(outcome.standing),
      }, observerEvidenceFailureStatus(outcome.standing));
    }

    // Standard GET-only observer review detail projection: the exact stored
    // review record (full reviewText included) re-read from the same
    // append-only review source the compact first screen summarizes. The
    // route carries no write, command, Task-mutation, or review-state
    // surface; every non-available standing fails closed with a fixed reason
    // and never a projection, echoed id, or raw path/payload.
    const reviewDetailId = reviewDetailIdFromPath(url.pathname);
    if (request.method === "GET" && reviewDetailId !== null) {
      const outcome = observerReviewDetailProjection(options.home, reviewDetailId);
      if (outcome.standing === "available") {
        return json({
          version: OBSERVER_REVIEW_DETAIL_PROJECTION_VERSION,
          standing: "available",
          reviewId: reviewDetailId,
          review: outcome.review,
        }, 200);
      }
      return json({
        version: OBSERVER_REVIEW_DETAIL_PROJECTION_VERSION,
        standing: outcome.standing,
        reviewId: null,
        review: null,
        reason: observerReviewDetailFailureReason(outcome.standing),
      }, observerReviewDetailFailureStatus(outcome.standing));
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
  const startupGate = runSelfCheckStartupGate({ home, cwd: process.cwd() });
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
    projectionProvider: createConversationContextProvider(home, {
      carrierRegistry,
      contributionRegistry,
      runtime: runtimeStatusProjection(options, startupGate),
    }),
    operationHost: createConversationTaskOperationHost(home, { carrierRegistry, contributionRegistry }),
    carrierRegistry,
    contributionRegistry,
  });
  const requestHandler = createWorkbenchRequestHandler(
    { ...options, home, startupGate },
    client,
    { conversationSocket },
  );
  const server: Bun.Server<ConversationSocketData> = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    fetch: (request, server) => requestHandler(request, server),
    websocket: conversationSocket.websocket,
  });
  if (startupGate.mode === "safe-diagnostic") {
    console.error(
      `Rossovia startup entered safe diagnostic mode (${startupGate.mechanical.status}); normal Task/write routes are disabled.`,
    );
  }
  console.log(`Rossovia Principal Workbench: ${server.url}`);
  console.log(`Supervision: Codex supervises Rossovia Workbench; unsupervised operation is unavailable.`);
}

async function buildLiveSnapshot(
  options: ServerOptions,
  client: AutonomyClient,
  taskDetailIds: "all" | ReadonlySet<string> = "all",
) {
  const snapshot = buildWorkbenchSnapshot({
    ...(options.home === undefined ? {} : { home: options.home }),
    localRepositoryRoots: options.roots,
    // The compact first paint (an empty taskDetailIds set) defers the
    // per-worktree `git status` dirty observation — the dominant non-essential
    // synchronous worktree/Git scan for the navigation-grade first paint. Its
    // worktree records keep every `git worktree list`-derived fact but carry
    // no dirty claim; the full snapshot and the on-demand task-detail route
    // rebuild with the default and always project the exact dirty standing.
    // Authority, source, error, attention, and persistence semantics of the
    // compact payload are unchanged.
    ...(taskDetailIds !== "all" && taskDetailIds.size === 0
      ? { observeWorktreeDirty: false }
      : {}),
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
  // A snapshot can contain several projections of the same Mission. Share
  // each Mission probe and read its independent activity/status sources in
  // parallel. This preserves complete evidence while avoiding repeated child
  // CLI processes and the old per-runner activity-then-status waterfall.
  const missionProbes = new Map<string, Promise<{
    activity: unknown;
    observed: Awaited<ReturnType<AutonomyClient["status"]>> | null;
    statusError: unknown | null;
  }>>();
  const probeMission = (missionId: string) => {
    const existing = missionProbes.get(missionId);
    if (existing !== undefined) return existing;
    const activityPromise = readRunnerActivity(client, missionId);
    const probe = Promise.allSettled([
      activityPromise,
      client.status(missionId),
    ]).then(([activityResult, statusResult]) => ({
      activity: activityResult.status === "fulfilled"
        ? activityResult.value
        : unavailableActivity(
          activityResult.reason instanceof Error
            ? activityResult.reason.message
            : String(activityResult.reason),
        ),
      observed: statusResult.status === "fulfilled" ? statusResult.value : null,
      statusError: statusResult.status === "rejected" ? statusResult.reason : null,
    }));
    missionProbes.set(missionId, probe);
    return probe;
  };
  const observedRunners = await Promise.all(snapshot.runners.map(async (runner) => {
    const { activity, observed, statusError } = await probeMission(runner.status.missionId);
    if (statusError !== null || observed === null) {
      return {
        ...runner,
        live: null,
        activity,
        liveError: statusError instanceof Error ? statusError.message : String(statusError),
      };
    }
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
  const taskAttempts = taskDetailIds === "all"
    ? await readTaskAttemptsProjections(options.home, taskSource)
    : taskDetailIds.size === 0
      ? {}
      : await readTaskAttemptsProjections(options.home, taskSource, taskDetailIds);
  // The compact first paint also defers every observer review's full
  // reviewText: each compact review keeps its bounded summary, reviewId,
  // subject, standing, evidence refs, correlation, and processing facts, and
  // marks the deferred full text for the on-demand review detail route,
  // which re-reads the same append-only review source. The full snapshot and
  // the task-detail rebuild keep the exact reviewText authority unchanged.
  const observerReviews = readObserverReviews(
    options.home,
    options.observerWorkerId,
    taskDetailIds !== "all" && taskDetailIds.size === 0 ? { compact: true } : undefined,
  );
  const settings = readSettingsProjection(options, observerReviews);
  // The aggregate runner freshness must describe the snapshot actually served:
  // with at least one live runner the projection no longer reads runners only
  // from cached status files, so the cached-only claim and the cached update
  // range would be factually wrong. Non-live runners keep their own per-runner
  // cached freshness unchanged.
  const anyLiveRunner = runners.some((runner) => runner.live === true);
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
    ...(anyLiveRunner
      ? {
        freshness: {
          ...snapshot.freshness,
          runners: "live" as const,
          runnerUpdatedAtRange: null,
        },
      }
      : {}),
  };
  return {
    ...liveSnapshot,
    workItems: buildWorkItemProjection(
      liveSnapshot,
      taskSource,
      taskAttempts,
      options.home,
      { taskDetailIds },
    ),
    observerReviews,
    settings,
  };
}

export function readObserverReviews(
  home: string | undefined,
  observerWorkerId?: string,
  options: { compact?: boolean } = {},
) {
  const sourcePaths = workflowReviewReadPaths(home);
  const sourceRef = sourcePaths.length === 0
    ? workflowReviewLogPath(home)
    : sourcePaths.join(",");
  const enabled = observerWorkerId !== undefined;
  try {
    // Several reviews can legitimately share one subject attempt (retry
    // records, launch failures before a later retry, and merged workflow and
    // legacy logs). The correlation is a pure strict projection of that
    // attempt's immutable retained evidence, so this snapshot invocation
    // computes it once per distinct attemptId and reuses the exact same
    // projection object for every review of that attempt. The memo is local
    // to this single invocation: it is never hoisted to handler or module
    // scope, never persists across requests, and every standing — available
    // or fail-closed — keeps its exact deterministic projection with no id
    // or path on non-available results.
    const correlationByAttemptId = new Map<string, ObserverAttemptCorrelationProjection>();
    const correlationForAttempt = (attemptId: string): ObserverAttemptCorrelationProjection => {
      const memoized = correlationByAttemptId.get(attemptId);
      if (memoized !== undefined) return memoized;
      const projection = observerAttemptCorrelationProjection(home, attemptId);
      correlationByAttemptId.set(attemptId, projection);
      return projection;
    };
    const reviews = readWorkflowReviews(home).map((review) => {
      const projected = {
        ...review,
        relatedConversationRefs: review.evidenceRefs.filter((ref) => ref.startsWith("conversation:")),
        // The observed execution's conversation correlation, projected strictly
        // from the canonical attempt evidence of this review's subject attempt:
        // available only when the immutable attempt record retained the exact
        // conversation/turn/action/sourceRef, and explicitly invisible when the
        // correlation is absent or the attempt evidence is unreadable, invalid,
        // or not a canonical attempt id. The review log schema is unchanged;
        // this is a read-only projection field, never a review state.
        correlation: correlationForAttempt(review.subject.attemptId),
      };
      // Compact first-screen projection: the full reviewText (and any finding
      // beyond the bounded summary cap) is deferred to the read-only review
      // detail route, which re-reads the same append-only source; the first
      // screen keeps the bounded summary plus every grouping/locating/
      // processing fact (reviewId, subject, standing, evidence refs,
      // correlation, subjectOutcome, observerRun). `fullTextAvailable` and
      // `findingTruncated` are the honest markers that the full text still
      // exists at the detail route — a truncated snippet is never presented
      // as the full review.
      if (options.compact !== true) return projected;
      const { reviewText: _reviewText, ...withoutReviewText } = projected;
      const finding = typeof projected.finding === "string" ? projected.finding : "";
      const findingTruncated = finding.length > OBSERVER_COMPACT_FINDING_MAX_CHARS;
      return {
        ...withoutReviewText,
        ...(findingTruncated
          ? {
            finding: finding.slice(0, OBSERVER_COMPACT_FINDING_MAX_CHARS),
            findingTruncated: true,
          }
          : {}),
        ...(typeof projected.reviewText === "string" && projected.reviewText !== ""
          ? { fullTextAvailable: true }
          : {}),
      };
    });
    const recordState = reviews.length > 0
      ? "recorded"
      : sourcePaths.length > 0
        ? "empty"
        : enabled
          ? "waiting"
          : "disabled";
    return {
      version: "rossovia.workflow-review-projection.v1" as const,
      standing: "available" as const,
      sourceRef,
      reviews,
      enabled,
      workerId: observerWorkerId ?? null,
      recordState,
      lastRecordedAt: reviews.at(-1)?.recordedAt ?? null,
      trigger: {
        kind: "task-attempt-settled" as const,
        label: "Task attempt 结算后触发",
      },
    };
  } catch (error: unknown) {
    return {
      version: "rossovia.workflow-review-projection.v1" as const,
      standing: "unavailable" as const,
      sourceRef,
      reviews: [],
      enabled,
      workerId: observerWorkerId ?? null,
      recordState: "unavailable" as const,
      lastRecordedAt: null,
      trigger: {
        kind: "task-attempt-settled" as const,
        label: "Task attempt 结算后触发",
      },
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function readSettingsProjection(
  options: ServerOptions,
  observerReviews: ReturnType<typeof readObserverReviews>,
) {
  const sourceRef = "apps/autonomy/src/worker-policy.ts";
  try {
    const workers = listPrincipalTaskWorkers();
    return {
      version: "rossovia.settings-projection.v1" as const,
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
        skillCustom: "~/.rossovia/skills/custom",
        skillPackages: "<host/worker package>/skills/{picked,builtin}",
        source: "design/operations/ROSSOVIA-DIRECTORY-LAYOUT.md",
      },
    };
  } catch (error: unknown) {
    return {
      version: "rossovia.settings-projection.v1" as const,
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
        skillCustom: "~/.rossovia/skills/custom",
        skillPackages: "<host/worker package>/skills/{picked,builtin}",
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
async function readTaskAttemptsProjections(
  home: string | undefined,
  taskSource: PrincipalTaskSourceObservation,
  requestedTaskIds?: ReadonlySet<string>,
): Promise<Readonly<Record<string, TaskAttemptSourceObservation>>> {
  if (taskSource.standing !== "available") return {};
  const projections: Record<string, TaskAttemptSourceObservation> = {};
  const taskIds = requestedTaskIds === undefined
    ? taskSource.source.tasks.map((task) => task.id)
    : taskSource.source.tasks
      .map((task) => task.id)
      .filter((id) => requestedTaskIds.has(id));
  let attemptsByTask: ReturnType<typeof showPrincipalTaskAttemptsForTasks>;
  try {
    attemptsByTask = showPrincipalTaskAttemptsForTasks(home, taskIds);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    for (const task of taskSource.source.tasks) {
      projections[task.id] = {
        standing: "unavailable",
        sourceRef: taskAttemptsSourceRef,
        reason,
      };
    }
    return projections;
  }
  await Bun.sleep(0);
  for (const task of taskSource.source.tasks) {
    if (requestedTaskIds !== undefined && !requestedTaskIds.has(task.id)) continue;
    try {
      projections[task.id] = {
        standing: "available",
        sourceRef: taskAttemptsSourceRef,
        attempts: attemptsByTask[task.id] ?? [],
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
  let observerWorkerId: string | undefined = DEFAULT_WORKFLOW_OBSERVER_WORKER;
  const roots = [...defaultObservedRoots()];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    const value = arguments_[index + 1];
    if (argument === "--disable-observer" || argument === "--enable-observer") {
      observerWorkerId = argument === "--disable-observer"
        ? undefined
        : DEFAULT_WORKFLOW_OBSERVER_WORKER;
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

function taskDetailIdFromPath(pathname: string): string | null {
  const match = /^\/api\/tasks\/([^/]+)\/detail$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

/**
 * The only route of the read-only project Worktree status projection:
 * `/api/projects/<projectKey>/worktrees`. A malformed percent-encoding
 * resolves to an empty key that fails the project lookup, so every
 * non-observable key fails closed with `project-not-found` and never
 * fabricates a project.
 */
function projectWorktreeKeyFromPath(pathname: string): string | null {
  const match = /^\/api\/projects\/([^/]+)\/worktrees$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

class ProjectWorktreeStatusError extends Error {
  constructor(
    readonly status: number,
    readonly code: "project-not-found" | "worktree-status-failed",
    message: string,
  ) {
    super(message);
  }
}

/**
 * The snapshot build the on-demand Worktree route reads: the canonical live
 * snapshot (worktree/Git scan, tasks, Missions, runner cache plus live
 * probes, work items, reviews, settings) the project page already shows.
 */
type WorktreeStatusSnapshot = Awaited<ReturnType<typeof buildLiveSnapshot>>;

/**
 * The bounded read-only retention hint of one Worktree, projected only from
 * existing snapshot sources with fail-closed standing:
 * - taskBindings counts the open/verifying principal-task work items bound
 *   to this Worktree path, and only when the task source is available; an
 *   unavailable task source is `unknown` with no count declaration.
 * - missionObservationOnly is true when at least one Mission's observed-Git
 *   context names this Worktree (observation-only, never an execution
 *   binding); null when the Mission source is unreadable for this project.
 * - liveEffectRunner is true when a live-proven runner's current effect
 *   workspace is exactly this Worktree; null when the runner source has no
 *   definitive live standing (no project runner record, a probe that could
 *   not verify reachability, or a live runner whose activity probe is
 *   unavailable/errored), so a missing or failed probe never reads as "no
 *   live effect".
 * The hint never implies merged, deletable, or clean-reclaimable state.
 */
interface WorktreeRetentionProjection {
  readonly taskBindings:
    | { readonly standing: "observed"; readonly open: number; readonly verifying: number }
    | { readonly standing: "unknown" };
  readonly missionObservationOnly: boolean | null;
  readonly liveEffectRunner: boolean | null;
}

function effectWorkspaceRoot(runner: { readonly activity?: unknown }): string | null {
  const activity = runner.activity;
  if (activity === null || typeof activity !== "object") return null;
  const currentEffect = (activity as { currentEffect?: unknown }).currentEffect;
  if (currentEffect === null || typeof currentEffect !== "object") return null;
  const workspace = (currentEffect as { workspace?: unknown }).workspace;
  if (workspace === null || typeof workspace !== "object") return null;
  const root = (workspace as { root?: unknown }).root;
  return typeof root === "string" ? root : null;
}

/**
 * A definitive live-effect standing for one project runner: a non-live
 * (live === false) runner is definitive; a live-proven runner (live ===
 * true) is definitive only while its activity probe actually answered. The
 * unavailable activity fallback carries an `error` field, and a live runner
 * with an unavailable or errored probe never contributes a yes/no — its
 * effect workspace is unknown, so the retention marker must fail closed to
 * null instead of reading as "no live effect here".
 */
function liveRunnerStandingDefinitive(runner: {
  readonly live?: boolean | null;
  readonly activity?: unknown;
}): boolean {
  if (runner.live === false) return true;
  if (runner.live !== true) return false;
  const activity = runner.activity;
  if (activity === null || typeof activity !== "object") return false;
  return typeof (activity as { error?: unknown }).error !== "string";
}

function worktreeRetentionHint(
  snapshot: WorktreeStatusSnapshot,
  project: WorktreeStatusSnapshot["projects"][number],
  worktreePath: string,
): WorktreeRetentionProjection {
  // Tasks: only the available task source declares per-Worktree binding
  // counts; an unavailable source fails closed to unknown with no count.
  const taskSourceStanding =
    snapshot.workItems?.capabilities?.independentTasks?.standing;
  const taskBindings = taskSourceStanding === "available"
    ? (() => {
      const bound = (snapshot.workItems?.items ?? []).filter((item) =>
        item.kind === "principal-task"
        && item.worktreeContext?.path === worktreePath
        && (item.lifecycle === "open" || item.lifecycle === "verifying")
      );
      return {
        standing: "observed" as const,
        open: bound.filter((item) => item.lifecycle === "open").length,
        verifying: bound.filter((item) => item.lifecycle === "verifying").length,
      };
    })()
    : { standing: "unknown" as const };

  // Missions: the observation-only marker is declared only while the
  // project's Mission sources were readable; a failed Mission read leaves
  // the standing unknown instead of declaring an absence.
  const missionRoots = project.worktrees.map((worktree) =>
    join(worktree.path, "apps", "missions"));
  const missionSourceUnavailable = snapshot.errors.some((error) =>
    error.scope === "mission"
    && missionRoots.some((root) =>
      error.source === root || error.source.startsWith(root + sep)
    )
  );
  const missionObservationOnly = missionSourceUnavailable
    ? null
    : project.missions.some((mission) =>
      mission.observedGitContext.worktreePath === worktreePath
      && mission.observedGitContext.binding === "observation-only"
    );

  // Runners: only a definitive live standing declares yes/no. No project
  // runner record, or a probe that could not verify reachability, leaves
  // the marker unknown — a missing probe never reads as "no live effect".
  const projectRunners = snapshot.runners.filter((runner) =>
    runner.binding.kind === "project-mission"
    && runner.binding.projectKey === project.projectKey
  );
  const liveEffectRunner = (() => {
    if (projectRunners.length === 0) return null;
    const definitive = projectRunners.every(liveRunnerStandingDefinitive);
    if (!definitive) return null;
    return projectRunners.some(
      (runner) => runner.live === true && effectWorkspaceRoot(runner) === worktreePath,
    );
  })();

  return { taskBindings, missionObservationOnly, liveEffectRunner };
}

/**
 * The minimal on-demand Worktree status projection for one project key,
 * built from the handler's shared canonical live-snapshot build (the same
 * default `observeWorktreeDirty` the full snapshot and the task-detail
 * route use — never the compact deferral). It returns only the requested
 * project's Worktree inventory, the total/dirty/clean/unknown summary, and
 * only that project's attributable git/project errors and observation
 * source refs: another project's failed scan or repository root never
 * leaks into this projection. A per-Worktree dirty scan failure is
 * projected on that Worktree as an explicit unknown standing (dirtyReason)
 * with the error retained; the projection never infers clean from a failed
 * scan. Every Worktree additionally carries its bounded read-only
 * retention hint (open/verifying Task binding counts, Mission
 * observation-only, live effect runner), projected only from the existing
 * snapshot sources and failing closed to unknown/no declaration whenever a
 * source is unavailable; locked/prunable stay Git management markers and
 * never imply merged, deletable, or a delete action.
 */
function projectWorktreeStatusProjection(
  snapshot: WorktreeStatusSnapshot,
  projectKey: string,
) {
  if (projectKey === "") {
    throw new ProjectWorktreeStatusError(
      404,
      "project-not-found",
      "The requested project key is invalid or not observed.",
    );
  }
  const project = snapshot.projects.find(
    (candidate) => candidate.projectKey === projectKey,
  );
  if (project === undefined) {
    throw new ProjectWorktreeStatusError(
      404,
      "project-not-found",
      "The requested project is not present in the current projection.",
    );
  }
  const worktrees = project.worktrees.map((worktree) => ({
    path: worktree.path,
    head: worktree.head,
    gitBranch: worktree.gitBranch,
    registeredPrimary: worktree.registeredPrimary,
    locked: worktree.locked,
    prunable: worktree.prunable,
    ...(Object.prototype.hasOwnProperty.call(worktree, "dirty")
      ? { dirty: worktree.dirty }
      : {}),
    ...(worktree.dirtyReason === undefined
      ? {}
      : { dirtyReason: worktree.dirtyReason }),
    // The bounded retention hint: open/verifying Task binding counts,
    // Mission observation-only, and the live effect runner marker, projected
    // only from the existing snapshot sources and fail-closed to
    // unknown/no declaration when a source is unavailable.
    retention: worktreeRetentionHint(snapshot, project, worktree.path),
  }));
  let dirty = 0;
  let clean = 0;
  let unknown = 0;
  for (const worktree of project.worktrees) {
    if (worktree.dirty === true) dirty += 1;
    else if (worktree.dirty === false) clean += 1;
    else unknown += 1;
  }
  const projectSources = new Set([
    ...(project.primaryWorkspace === null ? [] : [project.primaryWorkspace]),
    ...project.worktrees.map((worktree) => worktree.path),
  ]);
  return {
    version: "rosso.project-worktree-status.v1" as const,
    standing: "available" as const,
    projectKey,
    observedAt: snapshot.generatedAt,
    worktrees,
    summary: {
      total: worktrees.length,
      dirty,
      clean,
      unknown,
    },
    // Only the requested project's own observation sources and failures
    // are projected: its primary workspace root and every worktree path it
    // observed. Another project's failed git scan or repository root never
    // leaks into this project's status read, and the project's exact
    // workspace-mapping failure (shared workspaces.json source) stays
    // attributable by the project id the error names.
    sourceRefs: snapshot.sourceBoundaries
      .filter((boundary) =>
        (boundary.kind === "git-worktree-observation"
          && projectSources.has(boundary.source))
        || boundary.kind === "registered-project-identity"
        || boundary.kind === "workspace-mapping"
      )
      .map((boundary) => boundary.source),
    errors: snapshot.errors.filter((error) => {
      if (error.scope !== "git" && error.scope !== "project") return false;
      if (projectSources.has(error.source)) return true;
      return error.scope === "project"
        && typeof project.identity.id === "string"
        && error.message.endsWith(` for ${project.identity.id}`);
    }),
  };
}


/**
 * The only route of the read-only attempt evidence projection:
 * `/api/attempts/<attemptId>/evidence`. A malformed percent-encoding
 * resolves to an empty id that fails the canonical-UUID gate in
 * `observerEvidenceProjection`, so every non-canonical path fails closed
 * with `invalid-attempt-id` and never reaches the filesystem.
 */
function attemptEvidenceIdFromPath(pathname: string): string | null {
  const match = /^\/api\/attempts\/([^/]+)\/evidence$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

/**
 * The only route of the read-only observer review detail projection:
 * `/api/reviews/<reviewId>`. A malformed percent-encoding resolves to an
 * empty id that fails the boundary gate in
 * `observerReviewDetailProjection`, so every non-valid path fails closed
 * with `invalid-review-id` and never reaches the review store reader.
 */
function reviewDetailIdFromPath(pathname: string): string | null {
  const match = /^\/api\/reviews\/([^/]+)$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

/** Fail-closed HTTP status of one non-available review detail projection standing. */
function observerReviewDetailFailureStatus(
  standing: Exclude<ObserverReviewDetailProjectionStanding, "available">,
): number {
  if (standing === "invalid-review-id") return 400;
  if (standing === "not-found") return 404;
  return 503;
}

/**
 * Fixed, data-free failure reason of one non-available review detail
 * projection standing. No reader exception text, raw id, or retained path
 * content ever reaches the response.
 */
function observerReviewDetailFailureReason(
  standing: Exclude<ObserverReviewDetailProjectionStanding, "available">,
): string {
  if (standing === "invalid-review-id") {
    return "review id must be a non-empty bounded id without control characters";
  }
  if (standing === "not-found") {
    return "the review store retains no record with this review id";
  }
  return "the review store could not be read; no record is projected";
}

/** Fail-closed HTTP status of one non-available attempt evidence projection standing. */
function observerEvidenceFailureStatus(
  standing: Exclude<ObserverEvidenceProjectionStanding, "available">,
): number {
  if (standing === "invalid-attempt-id") return 400;
  if (standing === "unavailable") return 404;
  return 422;
}

/**
 * Fixed, data-free failure reason of one non-available attempt evidence
 * projection standing. No reader exception text, raw id, or retained path
 * content ever reaches the response.
 */
function observerEvidenceFailureReason(
  standing: Exclude<ObserverEvidenceProjectionStanding, "available">,
): string {
  if (standing === "invalid-attempt-id") {
    return "attempt id must be a canonical UUID";
  }
  if (standing === "unavailable") {
    return "no attempt evidence is retained for this attempt id";
  }
  if (standing === "invalid") {
    return "retained attempt evidence is malformed or inconsistent and cannot be projected";
  }
  if (standing === "incomplete") {
    return "retained attempt evidence is missing a terminal member (immutable input, final record, or settlement)";
  }
  return "retained attempt evidence changed or became unreadable while it was being verified";
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

function jsonText(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function startupDiagnosticResponse(gate: SelfCheckStartupGate): Response {
  return json({
    error: "startup-diagnostic-mode",
    message: "Mechanical startup checks are not healthy; Task and write routes remain disabled.",
    startup: gate,
  }, 503);
}

function isConversationSocketUpgrade(request: Request, url: URL): boolean {
  return request.method === "GET"
    && request.headers.get("upgrade")?.toLowerCase() === "websocket"
    && /^\/api\/conversations\/[^/]+\/socket$/u.test(url.pathname);
}
