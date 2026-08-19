import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome } from "../src/home";
import {
  ExecutionAuthorizationReceiptSchema,
  inspectExecution,
} from "../src/execution-authorization";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
} from "../src/mission-execution-proposal";
import { registerProject } from "../src/register";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { buildWorkbenchSnapshot } from "../src/ui/projection";
import { createWorkbenchRequestHandler } from "../../gateway/src/ui-server";
import {
  executionAuthorizationEligibility,
  executionProposalView,
} from "../../gateway/ui/execution-proposal.js";

const temporaryRoots: string[] = [];
const origin = "http://127.0.0.1:4317";

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function command(argv: string[], cwd: string): string {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function git(cwd: string, ...arguments_: string[]): string {
  return command(["git", ...arguments_], cwd);
}

function proposal() {
  return MissionExecutionProposalSchema.parse({
    version: "mission-execution-proposal.v1",
    proposalId: "blog-run-v1",
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: "source-project:apps/autonomy/experiments/blog-runtime.ts",
    runtimeDigest: "1".repeat(64),
    externalProvider: {
      name: "DeepSeek",
      boundary: "external",
    },
    externalDisclosure: {
      dataCategories: ["task instructions", "selected repository context"],
    },
    candidateWorktree: {
      rootRef: "environment:ROSSO_BLOG_EFFECT_ROOT",
      binding: "operator-selected-at-launch",
    },
    scope: {
      writePaths: ["db/schema.ts", "app/blog"],
      commands: [],
    },
    budget: {
      parent: {
        maxModelSteps: 4,
        maxOutputTokensPerStep: 2_000,
      },
      delegatedCell: {
        maxSteps: 14,
        maxOutputTokensPerStep: 16_000,
        maxDurationMs: 300_000,
      },
      estimatedTokens: 60_000,
      estimatedTokensSemantics: "forecast-only-not-stop-condition",
    },
    authority: {
      externalDisclosure: "withheld",
      budgetRelease: "withheld",
      write: "withheld",
      execute: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    },
    pendingDecisions: [{
      id: "visual-direction",
      label: "Choose the visual direction",
      proposal: "B - Reading Field",
      status: "pending",
      options: [{
        replyKey: "A",
        label: "Margin Ledger",
        immediateResult: "Implement the Margin Ledger direction",
        tradeoff: "A denser reading surface",
      }, {
        replyKey: "B",
        label: "Reading Field",
        immediateResult: "Implement the Reading Field direction",
        tradeoff: "Less operational density",
      }],
      compactReplyKey: "B",
    }, {
      id: "external-disclosure",
      label: "Authorize the declared external disclosure",
      proposal: "Send only declared categories to DeepSeek",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Authorize DeepSeek",
        immediateResult: "Permit one bounded DeepSeek execution",
        tradeoff: "Declared project context crosses the external boundary",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult: "Keep the external execution stopped",
        tradeoff: "The implementation trial cannot begin",
      }],
      compactReplyKey: "ALLOW",
    }],
  });
}

function mission() {
  return {
    version: "mission-record.v1",
    id: "blog-run",
    title: "Blog supervised run",
    sources: ["DESIGN.md"],
    createdAt: "2026-07-26T10:00:00Z",
    updatedAt: "2026-07-26T10:00:00Z",
    mainline: {
      contradiction: "Test one bounded supervised execution",
      acceptance: ["Every effect remains attributable"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
    executionProposal: proposal(),
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-authorization-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repository = join(root, "blog");
  mkdirSync(join(repository, "apps", "missions"), { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Authorization Action Test");
  git(repository, "config", "user.email", "authorization-action@example.test");
  git(repository, "remote", "add", "origin", "https://example.test/lidessen/blog.git");
  writeFileSync(join(repository, "README.md"), "# Blog\n");
  writeFileSync(
    join(repository, "apps", "missions", "blog-run.json"),
    `${JSON.stringify(mission(), null, 2)}\n`,
  );
  git(repository, "add", ".");
  git(repository, "commit", "-m", "initialize supervised mission");
  initializeHome(home);
  registerProject(home, {
    path: repository,
    id: "repository:blog",
    aliases: ["blog"],
  });

  const runnerCalls: string[] = [];
  const runner: AutonomyClient = {
    async status(missionId) {
      runnerCalls.push(`status:${missionId}`);
      return { live: false, missionId };
    },
    async activity(missionId) {
      runnerCalls.push(`activity:${missionId}`);
      return {
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor:blog-run",
            revision: "r1",
            reconciledWatermark: 0,
          },
        },
      };
    },
    async contribute() {
      runnerCalls.push("contribute");
      return {};
    },
    async control() {
      runnerCalls.push("control");
      return {};
    },
    async recover() {
      runnerCalls.push("recover");
      return {};
    },
  };
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [repository],
  }, runner);
  return { root, home, repository, handler, runnerCalls };
}

function action(overrides: {
  requestId?: string;
  projectKey?: string;
  proposalDigest?: string;
  choices?: Array<{ decisionId: string; replyKey: string }>;
  acknowledgements?: unknown;
} = {}) {
  return {
    kind: "execution-authorization",
    requestId: overrides.requestId ?? crypto.randomUUID(),
    target: {
      projectKey: overrides.projectKey ?? "registered:repository:blog",
      missionId: "blog-run",
      proposalId: "blog-run-v1",
      proposalDigest: overrides.proposalDigest ?? missionExecutionProposalDigest(proposal()),
      expectedStanding: "awaiting-principal-authorization",
    },
    choices: overrides.choices ?? [
      { decisionId: "visual-direction", replyKey: "B" },
      { decisionId: "external-disclosure", replyKey: "ALLOW" },
    ],
    acknowledgements: overrides.acknowledgements ?? {
      externalDisclosure: true,
      forecastOnlyBudget: true,
      oneUseLaunchAndIntegrationWithheld: true,
    },
  };
}

function request(
  value: unknown,
  headers: Record<string, string> = {
    Origin: origin,
    "Content-Type": "application/json",
  },
): Request {
  return new Request(`${origin}/api/execution-authorizations`, {
    method: "POST",
    headers,
    body: JSON.stringify(value),
  });
}

describe("Principal Workbench execution authorization action", () => {
  test("creates exactly one receipt while keeping runner launch and integration outside the action", async () => {
    const { home, handler, runnerCalls } = fixture();
    const first = await handler(request(action()));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.ok).toBe(true);
    const receipt = ExecutionAuthorizationReceiptSchema.parse(body.receipt);
    expect(receipt).toEqual(expect.objectContaining({
      version: "rosso.execution-authorization-receipt.v2",
      projectId: "repository:blog",
      missionId: "blog-run",
      proposalId: "blog-run-v1",
      actorRef: "principal:local-workbench-user",
      sourceRef: expect.stringMatching(/^principal-workbench-action:[0-9a-f-]+$/),
      principalAction: {
        requestId: expect.stringMatching(/^[0-9a-f-]+$/),
        channel: "local-principal-workbench-ui",
        acknowledgements: {
          externalDisclosure: true,
          forecastOnlyBudget: true,
          oneUseLaunchAndIntegrationWithheld: true,
        },
        identityAssurance: "unverified-local-interaction",
      },
    }));
    if (receipt.version !== "rosso.execution-authorization-receipt.v2") {
      throw new Error("Workbench UI action must issue a v2 receipt");
    }
    expect(receipt.sourceRef).toBe(
      `principal-workbench-action:${receipt.principalAction.requestId}`,
    );
    expect(receipt.authorityBoundary).toEqual(expect.objectContaining({
      maxUses: 1,
      execute: "authorized-once",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    }));
    expect(receipt.executionBoundary).toMatchObject({
      runtimeRef: "source-project:apps/autonomy/experiments/blog-runtime.ts",
      runtimeDigest: "1".repeat(64),
    });
    expect(runnerCalls).toEqual([]);
    expect(body).not.toHaveProperty("runner");
    expect(body).not.toHaveProperty("started");
    expect(existsSync(join(home, "state", "execution-authorization-claims"))).toBe(false);

    const inspection = inspectExecution(home, "repository:blog", "blog-run");
    expect(inspection.receiptStanding).toBe("valid");
    expect(existsSync(inspection.receiptPath)).toBe(true);
    const retained = readFileSync(inspection.receiptPath, "utf8");

    const snapshot = buildWorkbenchSnapshot({ home });
    const projectedMission = snapshot.projects[0]?.missions.find(
      (mission) => mission.id === "blog-run" && mission.executionProposal !== undefined,
    );
    const view = executionProposalView(
      projectedMission?.executionProposal,
      projectedMission?.authorization,
    );
    expect(view?.authorization.interactionEvidence).toContain(
      "principal:local-workbench-user",
    );
    expect(view?.authorization.interactionEvidence).toContain(
      "externalDisclosure=true",
    );
    expect(executionAuthorizationEligibility({
      source: "live",
      project: {
        projectKey: snapshot.projects[0]?.projectKey,
        registration: snapshot.projects[0]?.registration,
      },
      missionId: projectedMission?.id,
      proposal: projectedMission?.executionProposal,
      authorization: projectedMission?.authorization,
      choices: {},
      acknowledgements: {},
    })).toMatchObject({
      eligible: false,
      state: "blocked",
      reason: expect.stringContaining("回执已存在"),
    });

    const duplicate = await handler(request(action()));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual(expect.objectContaining({
      error: "authorization-already-exists",
    }));
    expect(readFileSync(inspection.receiptPath, "utf8")).toBe(retained);
    expect(runnerCalls).toEqual([]);
  });

  test("binds the receipt to the registered primary Mission source when another worktree has the same proposal digest", async () => {
    const { root, home, repository, handler, runnerCalls } = fixture();
    const candidate = join(root, "candidate");
    git(repository, "worktree", "add", "-b", "candidate/blog-run", candidate);
    writeFileSync(join(candidate, "candidate-only.md"), "different candidate HEAD\n");
    git(candidate, "add", "candidate-only.md");
    git(candidate, "commit", "-m", "advance candidate head");
    const primaryHead = git(repository, "rev-parse", "HEAD");
    const candidateHead = git(candidate, "rev-parse", "HEAD");
    expect(candidateHead).not.toBe(primaryHead);

    const response = await handler(request(action()));
    expect(response.status).toBe(200);
    const receipt = ExecutionAuthorizationReceiptSchema.parse(
      (await response.json()).receipt,
    );
    expect(receipt.missionSource).toEqual({
      path: "apps/missions/blog-run.json",
      gitHead: primaryHead,
    });
    expect(receipt.missionSource.gitHead).not.toBe(candidateHead);
    expect(inspectExecution(home, "repository:blog", "blog-run").receiptStanding).toBe("valid");
    expect(runnerCalls).toEqual([]);
  });

  test("rejects stale proposal evidence and incomplete choices without creating a receipt", async () => {
    const stale = fixture();
    const staleResponse = await stale.handler(request(action({
      proposalDigest: "0".repeat(64),
    })));
    expect(staleResponse.status).toBe(409);
    expect(await staleResponse.json()).toEqual(expect.objectContaining({
      error: "stale-execution-proposal",
    }));
    expect(inspectExecution(stale.home, "repository:blog", "blog-run").receiptStanding).toBe("absent");
    expect(stale.runnerCalls).toEqual([]);

    const partial = fixture();
    const partialResponse = await partial.handler(request(action({
      choices: [{ decisionId: "visual-direction", replyKey: "B" }],
    })));
    expect(partialResponse.status).toBe(400);
    expect(await partialResponse.json()).toEqual(expect.objectContaining({
      error: "invalid-authorization-request",
      message: expect.stringContaining("Missing execution decision"),
    }));
    expect(inspectExecution(partial.home, "repository:blog", "blog-run").receiptStanding).toBe("absent");
    expect(partial.runnerCalls).toEqual([]);
  });

  test("rejects missing acknowledgements and project targets outside the exact registered identity", async () => {
    const missingAcknowledgement = fixture();
    const acknowledgementResponse = await missingAcknowledgement.handler(request(action({
      acknowledgements: {
        externalDisclosure: true,
        forecastOnlyBudget: true,
      },
    })));
    expect(acknowledgementResponse.status).toBe(400);
    expect(await acknowledgementResponse.json()).toEqual(expect.objectContaining({
      error: "invalid-authorization-request",
    }));
    expect(missingAcknowledgement.runnerCalls).toEqual([]);

    const unregisteredProjection = fixture();
    const unregisteredResponse = await unregisteredProjection.handler(request(action({
      projectKey: "unregistered:https://example.test/lidessen/blog.git",
    })));
    expect(unregisteredResponse.status).toBe(400);
    expect(await unregisteredResponse.json()).toEqual(expect.objectContaining({
      error: "invalid-authorization-request",
    }));
    expect(unregisteredProjection.runnerCalls).toEqual([]);

    const disappearedRegistration = fixture();
    const disappearedResponse = await disappearedRegistration.handler(request(action({
      projectKey: "registered:repository:missing",
    })));
    expect(disappearedResponse.status).toBe(409);
    expect(await disappearedResponse.json()).toEqual(expect.objectContaining({
      error: "authorization-target-drift",
    }));
    expect(disappearedRegistration.runnerCalls).toEqual([]);
  });

  test("requires explicit exact Origin and application/json before reading a high-risk action", async () => {
    const { handler, runnerCalls } = fixture();
    const page = await handler(new Request(`${origin}/`));
    expect(page.headers.get("x-frame-options")).toBe("DENY");
    expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");

    const noOrigin = await handler(request(action(), {
      "Content-Type": "application/json",
    }));
    expect(noOrigin.status).toBe(403);
    expect(await noOrigin.json()).toEqual(expect.objectContaining({
      error: "origin-rejected",
    }));

    const crossOrigin = await handler(request(action(), {
      Origin: "http://localhost:4317",
      "Content-Type": "application/json",
    }));
    expect(crossOrigin.status).toBe(403);

    const reboundOrigin = "http://workbench.attacker.test:4317";
    const rebound = await handler(new Request(
      `${reboundOrigin}/api/execution-authorizations`,
      {
        method: "POST",
        headers: {
          Origin: reboundOrigin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action()),
      },
    ));
    expect(rebound.status).toBe(403);

    const nonJson = await handler(request(action(), {
      Origin: origin,
      "Content-Type": "text/plain",
    }));
    expect(nonJson.status).toBe(415);
    expect(await nonJson.json()).toEqual(expect.objectContaining({
      error: "content-type-rejected",
    }));
    expect(runnerCalls).toEqual([]);
  });
});
