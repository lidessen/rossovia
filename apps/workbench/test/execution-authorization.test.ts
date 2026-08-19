import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
import {
  ExecutionAuthorizationReceiptSchema,
} from "../src/execution-authorization";
import {
  executionAuthorizationClaimPath,
  executionAuthorizationReceiptDigest,
} from "../src/execution-authorization-claim";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
} from "../src/mission-execution-proposal";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "apps", "gateway", "src", "cli.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(argv: string[], cwd = repositoryRoot): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function workbench(home: string, ...args: string[]) {
  return command([process.execPath, bunCli, "--home", home, ...args]);
}

function git(cwd: string, ...args: string[]): void {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
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

function mission(executionProposal = proposal(), id = "blog-run") {
  return {
    version: "mission-record.v1",
    id,
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
    executionProposal,
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-execution-authorization-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repository = join(root, "blog");
  mkdirSync(repository, { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Authorization Test");
  git(repository, "config", "user.email", "authorization@example.test");
  git(repository, "remote", "add", "origin", "https://example.test/lidessen/blog.git");
  writeFileSync(join(repository, "README.md"), "# Blog\n");
  const missionPath = join(repository, "apps", "missions", "blog-run.json");
  mkdirSync(join(repository, "apps", "missions"), { recursive: true });
  writeFileSync(missionPath, `${JSON.stringify(mission(), null, 2)}\n`);
  git(repository, "add", "README.md", "apps/missions/blog-run.json");
  git(repository, "commit", "-m", "initialize blog mission");
  expect(workbench(home, "init").exitCode).toBe(0);
  expect(workbench(
    home,
    "register",
    repository,
    "--id",
    "repository:blog",
    "--alias",
    "blog",
  ).exitCode).toBe(0);
  return { home, repository, missionPath };
}

function authorize(
  home: string,
  proposalDigest: string,
  choices: string[] = ["visual-direction=B", "external-disclosure=ALLOW"],
  proposalId = "blog-run-v1",
) {
  const args = [
    "execution",
    "authorize",
    "blog",
    "blog-run",
    "--proposal-id",
    proposalId,
    "--proposal-digest",
    proposalDigest,
  ];
  for (const choice of choices) args.push("--choice", choice);
  args.push(
    "--actor-ref",
    "principal:lidessen",
    "--source-ref",
    "conversation:thread-1/turn-7",
  );
  return workbench(home, ...args);
}

function inspect(home: string, missionId = "blog-run") {
  return workbench(home, "execution", "inspect", "blog", missionId);
}

describe("local Principal execution authorization", () => {
  test("issues one receipt bound to the tracked Mission, exact proposal, and selected results", () => {
    const { home, repository, missionPath } = fixture();
    const sourceBefore = readFileSync(missionPath, "utf8");
    const inspectedBefore = inspect(home);
    expect(inspectedBefore.exitCode).toBe(0);
    const inspection = JSON.parse(inspectedBefore.stdout);
    const proposalDigest = inspection.proposalDigest;
    expect(proposalDigest).toBe(missionExecutionProposalDigest(proposal()));
    expect(inspection).toEqual(expect.objectContaining({
      version: "rosso.execution-inspection.v2",
      projectId: "repository:blog",
      missionId: "blog-run",
      proposalId: "blog-run-v1",
      proposalStatus: "awaiting-principal-authorization",
      status: "awaiting-principal-authorization",
      runtimeRef: "source-project:apps/autonomy/experiments/blog-runtime.ts",
      runtimeDigest: "1".repeat(64),
      provider: {
        name: "DeepSeek",
        boundary: "external",
      },
      disclosure: {
        dataCategories: ["task instructions", "selected repository context"],
      },
      scope: {
        writePaths: ["db/schema.ts", "app/blog"],
        commands: [],
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
      receiptStanding: "absent",
      authorizationId: null,
      claimPath: null,
      claimStanding: null,
      consumption: null,
      evidenceIssue: null,
    }));
    expect(inspection.budget.estimatedTokensSemantics).toBe("forecast-only-not-stop-condition");
    expect(inspection.pendingDecisions[0].options[1]).toEqual({
      replyKey: "B",
      label: "Reading Field",
      immediateResult: "Implement the Reading Field direction",
      tradeoff: "Less operational density",
    });
    expect(inspection.pendingDecisions[0].compactReplyKey).toBe("B");
    expect(existsSync(inspection.receiptPath)).toBe(false);
    expect(existsSync(join(home, "missions"))).toBe(false);
    expect(readFileSync(missionPath, "utf8")).toBe(sourceBefore);

    const authorized = authorize(home, proposalDigest);
    expect(authorized.exitCode).toBe(0);
    const result = JSON.parse(authorized.stdout);
    expect(result.receiptPath).toStartWith(join(realpathSync(home), "receipts", "execution-authorizations"));
    expect(existsSync(result.receiptPath)).toBe(true);
    const receipt = ExecutionAuthorizationReceiptSchema.parse(
      JSON.parse(readFileSync(result.receiptPath, "utf8")),
    );
    expect(receipt).toEqual(expect.objectContaining({
      projectId: "repository:blog",
      missionId: "blog-run",
      proposalId: "blog-run-v1",
      proposalDigest,
      choices: [
        { decisionId: "visual-direction", replyKey: "B" },
        { decisionId: "external-disclosure", replyKey: "ALLOW" },
      ],
      immediateAuthorizedResults: [
        {
          decisionId: "visual-direction",
          result: "Implement the Reading Field direction",
        },
        {
          decisionId: "external-disclosure",
          result: "Permit one bounded DeepSeek execution",
        },
      ],
      authorityBoundary: {
        kind: "single-execution",
        maxUses: 1,
        externalDisclosure: "authorized-for-declared-boundary",
        budgetRelease: "authorized-for-declared-budget",
        write: "authorized-for-declared-paths",
        execute: "authorized-once",
        commit: "withheld",
        merge: "withheld",
        publish: "withheld",
        productAcceptance: "withheld",
      },
      actorRef: "principal:lidessen",
      sourceRef: "conversation:thread-1/turn-7",
      attributionBoundary: "references-are-attribution-not-authentication",
    }));
    expect(receipt.executionBoundary.scope).toEqual({
      writePaths: ["db/schema.ts", "app/blog"],
      commands: [],
    });
    expect(receipt.executionBoundary).toMatchObject({
      runtimeRef: "source-project:apps/autonomy/experiments/blog-runtime.ts",
      runtimeDigest: "1".repeat(64),
    });
    expect(receipt.executionBoundary.budget).toEqual({
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
    });
    expect(receipt.missionSource).toEqual({
      path: "apps/missions/blog-run.json",
      gitHead: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
    expect(readFileSync(missionPath, "utf8")).toBe(sourceBefore);
    const issuedInspection = JSON.parse(inspect(home).stdout);
    expect(issuedInspection).toEqual(expect.objectContaining({
      proposalStatus: "awaiting-principal-authorization",
      status: "authorized-awaiting-execution",
      receiptStanding: "valid",
      authorizationId: receipt.authorizationId,
      claimStanding: "absent",
      consumption: null,
      evidenceIssue: null,
    }));

    const canonicalHome = realpathSync(home);
    const claimPath = executionAuthorizationClaimPath(
      canonicalHome,
      receipt.authorizationId,
    );
    mkdirSync(join(claimPath, ".."), { recursive: true });
    writeFileSync(claimPath, `${JSON.stringify({
      version: "rosso.execution-authorization-claim.v1",
      authorizationId: receipt.authorizationId,
      projectId: receipt.projectId,
      missionId: receipt.missionId,
      proposalId: receipt.proposalId,
      proposalDigest: receipt.proposalDigest,
      receipt: {
        ref: relative(canonicalHome, result.receiptPath),
        digest: executionAuthorizationReceiptDigest(receipt),
      },
      localEvidence: {
        worktree: realpathSync(repository),
        gitHead: receipt.missionSource.gitHead,
      },
      claimedAt: "2026-07-26T11:00:00Z",
    }, null, 2)}\n`);
    expect(JSON.parse(inspect(home).stdout)).toEqual(expect.objectContaining({
      proposalStatus: "awaiting-principal-authorization",
      status: "authorization-consumed",
      receiptStanding: "valid",
      authorizationId: receipt.authorizationId,
      claimPath,
      claimStanding: "valid",
      consumption: {
        claimedAt: "2026-07-26T11:00:00Z",
        candidateWorktree: realpathSync(repository),
        candidateHead: receipt.missionSource.gitHead,
        workbenchTaskContext: null,
        evidenceBoundary: "proves-one-launch-authorization-consumed-only",
      },
      evidenceIssue: null,
    }));

    const duplicate = authorize(home, proposalDigest);
    expect(duplicate.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(duplicate.stderr).toContain("rossovia: ");
    expect(duplicate.stderr).toContain("already has an authorization receipt");
    expect(duplicate.stderr).not.toContain("for usage");
    expect(readFileSync(result.receiptPath, "utf8")).toContain(receipt.authorizationId);
  });

  test("reports malformed and stale receipt evidence without upgrading either to valid", () => {
    const { home } = fixture();
    const inspection = JSON.parse(inspect(home).stdout);
    mkdirSync(join(inspection.receiptPath, ".."), { recursive: true });
    writeFileSync(inspection.receiptPath, "not-json\n");
    expect(JSON.parse(inspect(home).stdout)).toEqual(expect.objectContaining({
      status: "invalid-receipt-evidence",
      proposalStatus: "awaiting-principal-authorization",
      receiptStanding: "malformed",
      claimStanding: null,
      evidenceIssue: expect.objectContaining({
        kind: "receipt",
        sourcePath: inspection.receiptPath,
      }),
    }));

    rmSync(inspection.receiptPath);
    const authorized = authorize(home, inspection.proposalDigest);
    expect(authorized.exitCode).toBe(0);
    const receipt = JSON.parse(readFileSync(inspection.receiptPath, "utf8"));
    receipt.proposalDigest = "0".repeat(64);
    writeFileSync(inspection.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    expect(JSON.parse(inspect(home).stdout)).toEqual(expect.objectContaining({
      status: "invalid-receipt-evidence",
      proposalStatus: "awaiting-principal-authorization",
      receiptStanding: "stale",
      authorizationId: receipt.authorizationId,
      claimStanding: null,
      evidenceIssue: expect.objectContaining({
        kind: "receipt",
        sourcePath: inspection.receiptPath,
      }),
    }));
  });

  test("fails closed when a valid receipt has invalid consumption evidence", () => {
    const { home, repository } = fixture();
    const inspection = JSON.parse(inspect(home).stdout);
    expect(authorize(home, inspection.proposalDigest).exitCode).toBe(0);
    const issued = JSON.parse(inspect(home).stdout);
    const claimPath = issued.claimPath;
    mkdirSync(join(claimPath, ".."), { recursive: true });
    writeFileSync(claimPath, `${JSON.stringify({
      version: "rosso.execution-authorization-claim.v1",
      authorizationId: issued.authorizationId,
      projectId: "repository:another-project",
      missionId: "blog-run",
      proposalId: "blog-run-v1",
      proposalDigest: inspection.proposalDigest,
      receipt: {
        ref: relative(realpathSync(home), inspection.receiptPath),
        digest: "0".repeat(64),
      },
      localEvidence: {
        worktree: realpathSync(repository),
        gitHead: command(["git", "-C", repository, "rev-parse", "HEAD"]).stdout.trim(),
      },
      claimedAt: "2026-07-26T11:00:00Z",
    }, null, 2)}\n`);

    expect(JSON.parse(inspect(home).stdout)).toEqual(expect.objectContaining({
      proposalStatus: "awaiting-principal-authorization",
      status: "invalid-consumption-evidence",
      receiptStanding: "valid",
      authorizationId: issued.authorizationId,
      claimPath,
      claimStanding: "invalid",
      consumption: null,
      evidenceIssue: expect.objectContaining({
        kind: "consumption",
        sourcePath: claimPath,
        reason: expect.stringContaining("execution authorization consumption claim is invalid"),
      }),
    }));
  });

  test("treats a receipt bound to different runtime source content as stale", () => {
    const { home } = fixture();
    const inspection = JSON.parse(inspect(home).stdout);
    const authorized = authorize(home, inspection.proposalDigest);
    expect(authorized.exitCode).toBe(0);
    const receipt = JSON.parse(readFileSync(inspection.receiptPath, "utf8"));
    receipt.executionBoundary.runtimeDigest = "2".repeat(64);
    writeFileSync(inspection.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    expect(JSON.parse(inspect(home).stdout).receiptStanding).toBe("stale");
  });

  test("fails closed for stale identity, incomplete or ambiguous choices, and withheld disclosure", () => {
    const { home, repository, missionPath } = fixture();
    const proposalDigest = missionExecutionProposalDigest(proposal());
    const authorizationRoot = join(home, "receipts", "execution-authorizations");
    const cases: Array<{ result: ReturnType<typeof authorize>; message: string }> = [
      {
        result: authorize(home, "0".repeat(64)),
        message: "proposal digest mismatch",
      },
      {
        result: authorize(home, proposalDigest, undefined, "blog-run-v2"),
        message: "proposal ID mismatch",
      },
      {
        result: authorize(home, proposalDigest, ["visual-direction=B"]),
        message: "missing execution decision",
      },
      {
        result: authorize(home, proposalDigest, [
          "visual-direction=B",
          "visual-direction=A",
          "external-disclosure=ALLOW",
        ]),
        message: "duplicate execution decision",
      },
      {
        result: authorize(home, proposalDigest, [
          "visual-direction=B",
          "external-disclosure=ALLOW",
          "unrelated=ALLOW",
        ]),
        message: "unknown execution decision",
      },
      {
        result: authorize(home, proposalDigest, [
          "visual-direction=C",
          "external-disclosure=ALLOW",
        ]),
        message: "undeclared reply key",
      },
      {
        result: authorize(home, proposalDigest, [
          "visual-direction=B",
          "external-disclosure=HOLD",
        ]),
        message: "external-disclosure=ALLOW is required",
      },
    ];
    for (const example of cases) {
      expect(example.result.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
      expect(example.result.stderr).toContain(example.message);
      expect(example.result.stderr).toContain("rossovia: ");
      expect(example.result.stderr).not.toContain("for usage");
      expect(existsSync(authorizationRoot)).toBe(false);
    }

    const changed = mission();
    changed.executionProposal.externalDisclosure.dataCategories.push("newly added context");
    writeFileSync(missionPath, `${JSON.stringify(changed, null, 2)}\n`);
    const staleAfterSourceChange = authorize(home, proposalDigest);
    expect(staleAfterSourceChange.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(staleAfterSourceChange.stderr).toContain("rossovia: mission record must match HEAD");
    expect(staleAfterSourceChange.stderr).not.toContain("for usage");
    const dirtyInspection = inspect(home);
    expect(dirtyInspection.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(dirtyInspection.stderr).toContain("rossovia: mission record must match HEAD");
    expect(dirtyInspection.stderr).not.toContain("for usage");
    expect(existsSync(authorizationRoot)).toBe(false);
    git(repository, "add", "apps/missions/blog-run.json");
    const stagedSourceChange = authorize(
      home,
      missionExecutionProposalDigest(changed.executionProposal),
    );
    expect(stagedSourceChange.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(stagedSourceChange.stderr).toContain("rossovia: mission record must match HEAD");
    expect(stagedSourceChange.stderr).not.toContain("for usage");
    expect(existsSync(authorizationRoot)).toBe(false);
  });

  test("rejects untracked Mission sources and unstructured authority references", () => {
    const { home, repository } = fixture();
    const untrackedPath = join(repository, "apps", "missions", "untracked.json");
    writeFileSync(untrackedPath, `${JSON.stringify(mission(proposal(), "untracked"), null, 2)}\n`);
    const proposalDigest = missionExecutionProposalDigest(proposal());
    const untracked = workbench(
      home,
      "execution",
      "authorize",
      "blog",
      "untracked",
      "--proposal-id",
      "blog-run-v1",
      "--proposal-digest",
      proposalDigest,
      "--choice",
      "visual-direction=B",
      "--choice",
      "external-disclosure=ALLOW",
      "--actor-ref",
      "principal:lidessen",
      "--source-ref",
      "conversation:thread-1/turn-7",
    );
    expect(untracked.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(untracked.stderr).toContain("rossovia: ");
    expect(untracked.stderr).toContain("not Git-tracked at HEAD");
    expect(untracked.stderr).not.toContain("for usage");
    const untrackedInspection = inspect(home, "untracked");
    expect(untrackedInspection.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(untrackedInspection.stderr).toContain("rossovia: ");
    expect(untrackedInspection.stderr).toContain("not Git-tracked at HEAD");
    expect(untrackedInspection.stderr).not.toContain("for usage");

    const plainChat = workbench(
      home,
      "execution",
      "authorize",
      "blog",
      "blog-run",
      "--proposal-id",
      "blog-run-v1",
      "--proposal-digest",
      proposalDigest,
      "--choice",
      "visual-direction=B",
      "--choice",
      "external-disclosure=ALLOW",
      "--actor-ref",
      "someone said yes",
      "--source-ref",
      "looks approved",
    );
    expect(plainChat.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(plainChat.stderr).toContain("rossovia: ");
    expect(plainChat.stderr).toContain("authorizing Principal");
    expect(plainChat.stderr).not.toContain("for usage");
    expect(existsSync(join(home, "receipts", "execution-authorizations"))).toBe(false);
  });
});
