import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  executionAuthorizationClaimPath,
  executionAuthorizationReceiptDigest,
  type ExecutionAuthorizationClaim,
} from "../src/execution-authorization-claim";
import {
  executionAuthorizationReceiptPath,
  type ExecutionAuthorizationReceipt,
} from "../src/execution-authorization";
import {
  missionExecutionProposalDigest,
  type MissionExecutionProposal,
} from "../src/mission-execution-proposal";
import { buildWorkbenchSnapshot } from "../src/ui/projection";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(argv: string[], cwd: string): string {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function git(cwd: string, ...arguments_: string[]): string {
  return command(["git", ...arguments_], cwd);
}

function createRepository(path: string, remote: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init", "-b", "main");
  git(path, "config", "user.name", "Projection Test");
  git(path, "config", "user.email", "projection@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", remote);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function makeHome(root: string, repository: string, workspace: string): string {
  const home = join(root, "home");
  writeJson(join(home, "manifest.json"), {
    version: "rosso.home.v1",
    namespace: "rosso",
    createdAt: "2026-07-26T10:00:00Z",
  });
  writeJson(join(home, "config", "projects.json"), {
    version: "rosso.projects.v1",
    projects: [{
      id: "repository:fixture",
      repository,
      aliases: ["fixture"],
    }],
  });
  writeJson(join(home, "state", "workspaces.json"), {
    version: "rosso.workspaces.v1",
    workspaces: [{ projectId: "repository:fixture", path: workspace }],
  });
  writeJson(join(home, "state", "roots.json"), {
    version: "rosso.roots.v1",
    roots: [],
  });
  return home;
}

function mission(id: string, currentFocus = "implementation-line") {
  return {
    version: "mission-record.v1",
    id,
    title: "Projection Mission",
    sources: ["design/mandate.md"],
    createdAt: "2026-07-26T10:00:00Z",
    updatedAt: "2026-07-26T10:00:00Z",
    mainline: {
      contradiction: "Make operational truth perceptible",
      acceptance: ["The Principal can trace every visible claim"],
      status: "active",
    },
    branches: [{
      id: "implementation-line",
      kind: "implementation",
      purpose: "Build the first projection",
      returnCondition: "The projection is verified",
      sources: ["design/mandate.md"],
      status: "open",
    }],
    currentFocus,
  };
}

function executionProposal(proposalId = "blog-run-v1"): MissionExecutionProposal {
  return {
    version: "mission-execution-proposal.v1",
    proposalId,
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: "runtime:deepseek-blog-v1",
    runtimeDigest: "1".repeat(64),
    externalProvider: {
      name: "DeepSeek",
      boundary: "external",
    },
    externalDisclosure: {
      dataCategories: ["task instructions", "selected repository context", "candidate patch"],
    },
    candidateWorktree: {
      rootRef: "environment:ROSSO_BLOG_EFFECT_ROOT",
      binding: "operator-selected-at-launch",
    },
    scope: {
      writePaths: ["site", "assets/generated"],
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
        immediateResult: "Render the ledger direction",
        tradeoff: "A denser editorial surface",
      }, {
        replyKey: "B",
        label: "Reading Field",
        immediateResult: "Render the recommended reading direction",
        tradeoff: "Less operational density",
      }],
      compactReplyKey: "B",
    }, {
      id: "external-disclosure",
      label: "Authorize the declared external disclosure",
      proposal: "Send only the listed data categories to DeepSeek",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Authorize DeepSeek",
        immediateResult: "Permit the declared external request",
        tradeoff: "Declared project context crosses the external boundary",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult: "Keep the external run stopped",
        tradeoff: "The implementation trial cannot begin",
      }],
      compactReplyKey: "ALLOW",
    }],
  };
}

function executionAuthorizationReceipt(
  projectId: string,
  missionId: string,
  missionSourcePath: string,
  gitHead: string,
  proposal = executionProposal(),
): ExecutionAuthorizationReceipt {
  return {
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId: "11111111-1111-4111-8111-111111111111",
    projectId,
    missionId,
    missionSource: {
      path: missionSourcePath,
      gitHead,
    },
    proposalId: proposal.proposalId,
    proposalDigest: missionExecutionProposalDigest(proposal),
    choices: [{
      decisionId: "visual-direction",
      replyKey: "B",
    }, {
      decisionId: "external-disclosure",
      replyKey: "ALLOW",
    }],
    immediateAuthorizedResults: [{
      decisionId: "visual-direction",
      result: "Render the recommended reading direction",
    }, {
      decisionId: "external-disclosure",
      result: "Permit the declared external request",
    }],
    executionBoundary: {
      runtimeRef: proposal.runtimeRef,
      runtimeDigest: proposal.runtimeDigest,
      externalProvider: proposal.externalProvider,
      externalDisclosure: proposal.externalDisclosure,
      candidateWorktree: proposal.candidateWorktree,
      scope: proposal.scope,
      budget: proposal.budget,
    },
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
    sourceRef: "conversation:thread/turn",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-07-26T10:45:00Z",
  };
}

function executionAuthorizationClaim(
  home: string,
  receiptPath: string,
  receipt: ExecutionAuthorizationReceipt,
  worktree: string,
  gitHead: string,
): ExecutionAuthorizationClaim {
  return {
    version: "rosso.execution-authorization-claim.v1",
    authorizationId: receipt.authorizationId,
    projectId: receipt.projectId,
    missionId: receipt.missionId,
    proposalId: receipt.proposalId,
    proposalDigest: receipt.proposalDigest,
    receipt: {
      ref: relative(home, receiptPath),
      digest: executionAuthorizationReceiptDigest(receipt),
    },
    localEvidence: {
      worktree,
      gitHead,
    },
    claimedAt: "2026-07-26T10:46:00Z",
  };
}

function runnerStatus(missionId: string, state = "input-pending") {
  return {
    version: "rosso.mission-runner.v1",
    runnerId: `runner-${missionId}`,
    missionId,
    pid: 1234,
    state,
    startedAt: "2026-07-26T10:00:00Z",
    updatedAt: "2026-07-26T10:30:00Z",
    inputWatermark: 2,
    reconciledWatermark: 1,
    socketPath: `/tmp/${missionId}.sock`,
    stopReason: null,
  };
}

describe("Principal Workbench operational projection", () => {
  test("projects an unstarted supervised Blog proposal without treating it as authority", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-proposal-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const candidate = join(root, "blog-candidate");
    git(repository, "worktree", "add", "-b", "proposal/blog-run", candidate);
    writeJson(join(repository, "operations", "missions", "blog-run.json"), {
      ...mission("blog-run", "mainline"),
      executionProposal: executionProposal(),
    });
    git(repository, "add", "operations/missions/blog-run.json");
    git(repository, "commit", "-m", "add proposed blog run");
    const home = makeHome(root, remote, repository);

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.runners).toEqual([]);
    const proposal = snapshot.projects[0]?.missions[0]?.executionProposal;
    expect(proposal).toEqual(expect.objectContaining({
      proposalId: "blog-run-v1",
      mode: "supervised",
      status: "awaiting-principal-authorization",
      runtimeRef: "runtime:deepseek-blog-v1",
      runtimeDigest: "1".repeat(64),
      externalProvider: {
        name: "DeepSeek",
        boundary: "external",
      },
      externalDisclosure: {
        dataCategories: ["task instructions", "selected repository context", "candidate patch"],
      },
      candidateWorktree: {
        rootRef: "environment:ROSSO_BLOG_EFFECT_ROOT",
        binding: "operator-selected-at-launch",
      },
      scope: {
        writePaths: ["site", "assets/generated"],
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
      proposalDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(proposal?.pendingDecisions).toEqual([
      expect.objectContaining({
        id: "visual-direction",
        proposal: "B - Reading Field",
        status: "pending",
        compactReplyKey: "B",
      }),
      expect.objectContaining({ id: "external-disclosure", status: "pending" }),
    ]);
    expect(snapshot.projects[0]?.missions[0]?.authorization).toEqual({
      standing: "awaiting-principal-authorization",
    });
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.attention).toContainEqual(expect.objectContaining({
      priority: "principal-decision",
      code: "mission-execution-awaiting-authorization",
      missionId: "blog-run",
    }));
  });

  test("joins one exact local authorization receipt without implying runner, effect, or start", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-authorization-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const proposal = executionProposal();
    const missionId = "blog-run";
    const missionSourcePath = `operations/missions/${missionId}.json`;
    writeJson(join(repository, missionSourcePath), {
      ...mission(missionId, "mainline"),
      executionProposal: proposal,
    });
    git(repository, "add", missionSourcePath);
    git(repository, "commit", "-m", "add proposed blog run");
    const home = makeHome(root, remote, repository);
    const canonicalHome = realpathSync(home);
    const receiptPath = executionAuthorizationReceiptPath(
      canonicalHome,
      "repository:fixture",
      missionId,
      proposal.proposalId,
    );
    const receipt = executionAuthorizationReceipt(
      "repository:fixture",
      missionId,
      missionSourcePath,
      git(repository, "rev-parse", "HEAD"),
      proposal,
    );
    writeJson(receiptPath, receipt);
    writeJson(
      join(home, "missions", "blog-run-cache", "runner-status.json"),
      runnerStatus(missionId, "stopped"),
    );

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.complete).toBe(true);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.projects[0]?.missions[0]?.executionProposal).toMatchObject({
      proposalId: proposal.proposalId,
      status: "awaiting-principal-authorization",
      runtimeDigest: proposal.runtimeDigest,
    });
    expect(snapshot.projects[0]?.missions[0]?.authorization).toEqual({
      standing: "authorized-awaiting-execution",
      authorizationId: receipt.authorizationId,
      proposalDigest: receipt.proposalDigest,
      choices: receipt.choices,
      immediateAuthorizedResults: receipt.immediateAuthorizedResults,
      authorityBoundary: receipt.authorityBoundary,
      actorRef: receipt.actorRef,
      sourceRef: receipt.sourceRef,
      attributionBoundary: receipt.attributionBoundary,
      principalAction: null,
      authorizedAt: receipt.authorizedAt,
      sourcePath: receiptPath,
    });
    expect(snapshot.attention.map((item) => item.code)).not.toContain(
      "mission-execution-awaiting-authorization",
    );
    expect(snapshot.sourceBoundaries).toContainEqual({
      kind: "execution-authorization-receipt",
      source: receiptPath,
      authority: "bounded-launch-authorization",
      freshness: "observed-at-build",
    });
    expect(snapshot.runners[0]).toMatchObject({
      status: { state: "stopped" },
    });
    expect(snapshot.runners[0]).not.toHaveProperty("activity");
  });

  test("projects one strictly bound consumption claim without implying runner or effect success", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-consumed-authorization-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const proposal = executionProposal();
    const missionId = "blog-run";
    const missionSourcePath = `operations/missions/${missionId}.json`;
    writeJson(join(repository, missionSourcePath), {
      ...mission(missionId, "mainline"),
      executionProposal: proposal,
    });
    git(repository, "add", missionSourcePath);
    git(repository, "commit", "-m", "add proposed blog run");
    const gitHead = git(repository, "rev-parse", "HEAD");
    const home = realpathSync(makeHome(root, remote, repository));
    const receiptPath = executionAuthorizationReceiptPath(
      home,
      "repository:fixture",
      missionId,
      proposal.proposalId,
    );
    const receipt = executionAuthorizationReceipt(
      "repository:fixture",
      missionId,
      missionSourcePath,
      gitHead,
      proposal,
    );
    writeJson(receiptPath, receipt);
    const claimPath = executionAuthorizationClaimPath(
      home,
      receipt.authorizationId,
    );
    const claim = executionAuthorizationClaim(
      home,
      receiptPath,
      receipt,
      realpathSync(repository),
      gitHead,
    );
    writeJson(claimPath, claim);

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.complete).toBe(true);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.projects[0]?.missions[0]?.authorization).toEqual({
      standing: "authorization-consumed",
      authorizationId: receipt.authorizationId,
      proposalDigest: receipt.proposalDigest,
      choices: receipt.choices,
      immediateAuthorizedResults: receipt.immediateAuthorizedResults,
      authorityBoundary: receipt.authorityBoundary,
      actorRef: receipt.actorRef,
      sourceRef: receipt.sourceRef,
      attributionBoundary: receipt.attributionBoundary,
      principalAction: null,
      authorizedAt: receipt.authorizedAt,
      sourcePath: receiptPath,
      consumption: {
        claimedAt: claim.claimedAt,
        candidateWorktree: claim.localEvidence.worktree,
        candidateHead: claim.localEvidence.gitHead,
        receiptRef: claim.receipt.ref,
        receiptDigest: claim.receipt.digest,
        claimSourcePath: claimPath,
        workbenchTaskContext: null,
        evidenceBoundary: "proves-one-launch-authorization-consumed-only",
      },
    });
    expect(snapshot.sourceBoundaries).toContainEqual({
      kind: "execution-authorization-claim",
      source: claimPath,
      authority: "launch-authorization-consumption-evidence",
      freshness: "observed-at-build",
    });
    expect(snapshot.attention.map((item) => item.code)).not.toContain(
      "mission-execution-awaiting-authorization",
    );
    expect(snapshot).not.toHaveProperty("effect");
  });

  test("fails closed for malformed or mismatched authorization consumption claims", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-invalid-consumption-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const proposal = executionProposal();
    const missionId = "blog-run";
    const missionSourcePath = `operations/missions/${missionId}.json`;
    writeJson(join(repository, missionSourcePath), {
      ...mission(missionId, "mainline"),
      executionProposal: proposal,
    });
    git(repository, "add", missionSourcePath);
    git(repository, "commit", "-m", "add proposed blog run");
    const gitHead = git(repository, "rev-parse", "HEAD");
    const home = realpathSync(makeHome(root, remote, repository));
    const receiptPath = executionAuthorizationReceiptPath(
      home,
      "repository:fixture",
      missionId,
      proposal.proposalId,
    );
    const receipt = executionAuthorizationReceipt(
      "repository:fixture",
      missionId,
      missionSourcePath,
      gitHead,
      proposal,
    );
    writeJson(receiptPath, receipt);
    const claimPath = executionAuthorizationClaimPath(
      home,
      receipt.authorizationId,
    );
    const validClaim = executionAuthorizationClaim(
      home,
      receiptPath,
      receipt,
      realpathSync(repository),
      gitHead,
    );
    const cases: readonly {
      readonly label: string;
      readonly expected: string;
      readonly mutate: (claim: ExecutionAuthorizationClaim) => unknown;
    }[] = [
      {
        label: "authorization ID",
        expected: "authorization ID mismatch",
        mutate: (claim) => ({
          ...claim,
          authorizationId: "22222222-2222-4222-8222-222222222222",
        }),
      },
      {
        label: "project",
        expected: "project mismatch",
        mutate: (claim) => ({ ...claim, projectId: "repository:other" }),
      },
      {
        label: "Mission",
        expected: "Mission mismatch",
        mutate: (claim) => ({ ...claim, missionId: "other-run" }),
      },
      {
        label: "proposal",
        expected: "proposal mismatch",
        mutate: (claim) => ({ ...claim, proposalId: "other-proposal" }),
      },
      {
        label: "proposal digest",
        expected: "proposal digest mismatch",
        mutate: (claim) => ({ ...claim, proposalDigest: "0".repeat(64) }),
      },
      {
        label: "receipt reference",
        expected: "receipt reference mismatch",
        mutate: (claim) => ({
          ...claim,
          receipt: { ...claim.receipt, ref: "receipts/other.json" },
        }),
      },
      {
        label: "receipt digest",
        expected: "receipt digest mismatch",
        mutate: (claim) => ({
          ...claim,
          receipt: { ...claim.receipt, digest: "0".repeat(64) },
        }),
      },
    ];

    for (const case_ of cases) {
      writeJson(claimPath, case_.mutate(structuredClone(validClaim)));
      const snapshot = buildWorkbenchSnapshot({
        home,
        now: () => "2026-07-26T11:00:00Z",
      });
      expect(snapshot.complete, case_.label).toBe(false);
      expect(
        snapshot.projects[0]?.missions[0]?.authorization,
        case_.label,
      ).toMatchObject({
        standing: "invalid-consumption-evidence",
        reason: expect.stringContaining(case_.expected),
        sourcePath: claimPath,
      });
      expect(snapshot.attention, case_.label).toContainEqual(
        expect.objectContaining({
          code: "execution-authorization-invalid",
          missionId,
          source: claimPath,
        }),
      );
      expect(snapshot.sourceBoundaries, case_.label).not.toContainEqual(
        expect.objectContaining({
          kind: "execution-authorization-claim",
          source: claimPath,
        }),
      );
    }

    writeFileSync(claimPath, "{ malformed claim\n");
    const malformed = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });
    expect(malformed.complete).toBe(false);
    expect(malformed.projects[0]?.missions[0]?.authorization).toMatchObject({
      standing: "invalid-consumption-evidence",
      sourcePath: claimPath,
    });
    expect(malformed.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: claimPath,
    }));
  });

  test("uses only the registered primary Mission as an authorization source across worktrees and HEADs", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-primary-authority-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const proposal = executionProposal();
    const missionId = "blog-run";
    const missionSourcePath = `operations/missions/${missionId}.json`;
    writeJson(join(repository, missionSourcePath), {
      ...mission(missionId, "mainline"),
      executionProposal: proposal,
    });
    git(repository, "add", missionSourcePath);
    git(repository, "commit", "-m", "add proposed blog run");
    const primaryHead = git(repository, "rev-parse", "HEAD");

    const candidate = join(root, "candidate");
    git(repository, "worktree", "add", "-b", "candidate/blog-run", candidate);
    writeFileSync(join(candidate, "candidate-only.md"), "advance only the candidate\n");
    git(candidate, "add", "candidate-only.md");
    git(candidate, "commit", "-m", "advance candidate head");
    const candidateHead = git(candidate, "rev-parse", "HEAD");
    expect(candidateHead).not.toBe(primaryHead);

    const home = makeHome(root, remote, repository);
    const receiptPath = executionAuthorizationReceiptPath(
      realpathSync(home),
      "repository:fixture",
      missionId,
      proposal.proposalId,
    );
    writeJson(
      receiptPath,
      executionAuthorizationReceipt(
        "repository:fixture",
        missionId,
        missionSourcePath,
        candidateHead,
        proposal,
      ),
    );

    const wrongHead = buildWorkbenchSnapshot({
      home,
      localRepositoryRoots: [candidate],
      now: () => "2026-07-26T11:00:00Z",
    });
    const wrongHeadMissions = wrongHead.projects[0]!.missions
      .filter((record) => record.id === missionId);
    expect(wrongHeadMissions).toHaveLength(2);
    const wrongHeadPrimary = wrongHeadMissions.find(
      (record) => record.sourceRoot === realpathSync(repository),
    )!;
    const wrongHeadCandidate = wrongHeadMissions.find(
      (record) => record.sourceRoot === realpathSync(candidate),
    )!;
    expect(wrongHeadPrimary.executionProposal).toMatchObject({
      proposalId: proposal.proposalId,
    });
    expect(wrongHeadPrimary.authorization).toMatchObject({
      standing: "invalid-receipt-evidence",
      sourcePath: receiptPath,
      reason: expect.stringContaining("source HEAD mismatch"),
    });
    expect(wrongHeadCandidate).not.toHaveProperty("executionProposal");
    expect(wrongHeadCandidate).not.toHaveProperty("authorization");
    expect(wrongHead.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: receiptPath,
      message: expect.stringContaining("source HEAD mismatch"),
    }));

    writeJson(
      receiptPath,
      executionAuthorizationReceipt(
        "repository:fixture",
        missionId,
        missionSourcePath,
        primaryHead,
        proposal,
      ),
    );
    const primaryReceipt = buildWorkbenchSnapshot({
      home,
      localRepositoryRoots: [candidate],
      now: () => "2026-07-26T11:00:00Z",
    });
    const primaryMissions = primaryReceipt.projects[0]!.missions
      .filter((record) => record.id === missionId);
    const authoritativeMission = primaryMissions.find(
      (record) => record.sourceRoot === realpathSync(repository),
    )!;
    const observedCandidate = primaryMissions.find(
      (record) => record.sourceRoot === realpathSync(candidate),
    )!;
    expect(primaryReceipt.complete).toBe(true);
    expect(primaryReceipt.errors).toEqual([]);
    expect(authoritativeMission.authorization).toMatchObject({
      standing: "authorized-awaiting-execution",
      proposalDigest: missionExecutionProposalDigest(proposal),
    });
    expect(observedCandidate).not.toHaveProperty("executionProposal");
    expect(observedCandidate).not.toHaveProperty("authorization");
  });

  test("projects only the committed proposal and blocks a dirty primary Mission source", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-dirty-mission-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);
    const proposal = executionProposal("committed-proposal");
    const missionId = "dirty-run";
    const missionPath = join(repository, "operations", "missions", `${missionId}.json`);
    const uncommittedMissionId = "uncommitted-run";
    const uncommittedMissionPath = join(
      repository,
      "operations",
      "missions",
      `${uncommittedMissionId}.json`,
    );
    writeJson(missionPath, {
      ...mission(missionId, "mainline"),
      executionProposal: proposal,
    });
    writeJson(uncommittedMissionPath, mission(uncommittedMissionId, "mainline"));
    git(repository, "add", "operations/missions");
    git(repository, "commit", "-m", "add committed execution proposal");

    writeJson(missionPath, {
      ...mission(missionId, "mainline"),
      executionProposal: {
        ...proposal,
        externalDisclosure: {
          dataCategories: [
            ...proposal.externalDisclosure.dataCategories,
            "uncommitted private context",
          ],
        },
      },
    });
    writeJson(uncommittedMissionPath, {
      ...mission(uncommittedMissionId, "mainline"),
      executionProposal: executionProposal("uncommitted-proposal"),
    });

    const home = makeHome(root, remote, repository);
    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });
    const projected = snapshot.projects[0]!.missions.find(
      (record) => record.id === missionId,
    )!;
    const uncommitted = snapshot.projects[0]!.missions.find(
      (record) => record.id === uncommittedMissionId,
    )!;

    expect(snapshot.complete).toBe(false);
    expect(projected.executionProposal).toMatchObject({
      proposalId: proposal.proposalId,
      proposalDigest: missionExecutionProposalDigest(proposal),
      externalDisclosure: proposal.externalDisclosure,
    });
    expect(projected.executionProposal?.externalDisclosure.dataCategories).not.toContain(
      "uncommitted private context",
    );
    expect(projected.authorization).toMatchObject({
      standing: "execution-source-not-authorizable",
      sourcePath: realpathSync(missionPath),
      reason: expect.stringContaining("differs from committed HEAD"),
      remediation: expect.stringContaining("committed HEAD"),
    });
    expect(snapshot.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: realpathSync(missionPath),
      message: expect.stringContaining("uncommitted execution proposal cannot be authorized"),
    }));
    expect(snapshot.attention.map((item) => item.code)).not.toContain(
      "mission-execution-awaiting-authorization",
    );
    expect(uncommitted).not.toHaveProperty("executionProposal");
    expect(uncommitted.authorization).toMatchObject({
      standing: "execution-source-not-authorizable",
      sourcePath: realpathSync(uncommittedMissionPath),
    });
    expect(snapshot.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: realpathSync(uncommittedMissionPath),
      message: expect.stringContaining("uncommitted execution proposal cannot be authorized"),
    }));
  });

  test("fails closed for stale, malformed, and wrongly bound authorization receipts", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-invalid-authorization-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/blog.git";
    createRepository(repository, remote);

    const staleProposal = executionProposal("stale-proposal");
    const malformedProposal = executionProposal("malformed-proposal");
    const wrongBindingProposal = executionProposal("wrong-binding-proposal");
    for (const [missionId, proposal] of [
      ["stale-run", staleProposal],
      ["malformed-run", malformedProposal],
      ["wrong-binding-run", wrongBindingProposal],
    ] as const) {
      writeJson(join(repository, "operations", "missions", `${missionId}.json`), {
        ...mission(missionId, "mainline"),
        executionProposal: proposal,
      });
    }
    git(repository, "add", "operations/missions");
    git(repository, "commit", "-m", "add execution proposals");
    const gitHead = git(repository, "rev-parse", "HEAD");
    const home = makeHome(root, remote, repository);
    const canonicalHome = realpathSync(home);

    const staleReceiptPath = executionAuthorizationReceiptPath(
      canonicalHome,
      "repository:fixture",
      "stale-run",
      staleProposal.proposalId,
    );
    writeJson(staleReceiptPath, {
      ...executionAuthorizationReceipt(
        "repository:fixture",
        "stale-run",
        "operations/missions/stale-run.json",
        gitHead,
        staleProposal,
      ),
      proposalDigest: "0".repeat(64),
    });

    const malformedReceiptPath = executionAuthorizationReceiptPath(
      canonicalHome,
      "repository:fixture",
      "malformed-run",
      malformedProposal.proposalId,
    );
    mkdirSync(join(malformedReceiptPath, ".."), { recursive: true });
    writeFileSync(malformedReceiptPath, "{ malformed receipt\n");

    const wrongBindingReceiptPath = executionAuthorizationReceiptPath(
      canonicalHome,
      "repository:fixture",
      "wrong-binding-run",
      wrongBindingProposal.proposalId,
    );
    writeJson(
      wrongBindingReceiptPath,
      executionAuthorizationReceipt(
        "repository:other",
        "wrong-binding-run",
        "operations/missions/wrong-binding-run.json",
        gitHead,
        wrongBindingProposal,
      ),
    );

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.complete).toBe(false);
    for (const record of snapshot.projects[0]!.missions) {
      expect(record.authorization).toMatchObject({
        standing: "invalid-receipt-evidence",
        reason: expect.any(String),
        remediation: expect.stringContaining("will not overwrite"),
      });
    }
    expect(snapshot.errors).toHaveLength(3);
    expect(snapshot.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: staleReceiptPath,
      message: expect.stringContaining("digest is stale"),
    }));
    expect(snapshot.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: malformedReceiptPath,
      message: expect.stringContaining("JSON Parse error"),
    }));
    expect(snapshot.errors).toContainEqual(expect.objectContaining({
      scope: "authorization",
      source: wrongBindingReceiptPath,
      message: expect.stringContaining("project mismatch"),
    }));
    expect(snapshot.attention.filter(
      (item) => item.code === "execution-authorization-invalid",
    )).toHaveLength(3);
    expect(snapshot.attention.map((item) => item.code)).not.toContain(
      "mission-execution-awaiting-authorization",
    );
    expect(snapshot.sourceBoundaries.filter(
      (boundary) => boundary.authority === "bounded-launch-authorization",
    )).toEqual([]);
  });

  test("keeps registered identity authoritative while exposing all worktrees and Mission semantics", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-projection-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/fixture.git";
    createRepository(repository, remote);
    writeJson(join(repository, "operations", "missions", "mvp.json"), mission("mvp"));
    git(repository, "add", "operations/missions/mvp.json");
    git(repository, "commit", "-m", "add mission");

    const secondary = join(root, "secondary");
    git(repository, "worktree", "add", "-b", "feature/ui", secondary);
    writeFileSync(join(secondary, "UNCOMMITTED.md"), "visible dirt\n");
    // This record is intentionally outside the included root and must not be read.
    writeJson(join(secondary, "operations", "missions", "secondary-only.json"), mission("secondary-only"));

    const home = makeHome(root, remote, repository);
    writeJson(join(home, "missions", "mvp-cache", "runner-status.json"), runnerStatus("mvp"));

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.supervision).toEqual({
      mode: "supervised",
      supervisor: "Codex",
      subject: "Rossovia Workbench",
      unsupervised: "unavailable",
    });
    expect(snapshot.complete).toBe(true);
    expect(snapshot.projects).toHaveLength(1);
    const project = snapshot.projects[0]!;
    expect(project.registration).toBe("registered");
    expect(project.identity.id).toBe("repository:fixture");
    expect(project.worktrees).toHaveLength(2);
    expect(project.worktrees.find((worktree) => worktree.path === realpathSync(repository))).toMatchObject({
      gitBranch: "main",
      registeredPrimary: true,
      dirty: false,
    });
    expect(project.worktrees.find((worktree) => worktree.path === realpathSync(secondary))).toMatchObject({
      gitBranch: "feature/ui",
      registeredPrimary: false,
      dirty: true,
    });
    expect(project.missions.map((record) => record.id)).toEqual(["mvp"]);
    expect(project.missions[0]).toMatchObject({
      currentFocus: "implementation-line",
      semanticBranch: {
        kind: "mission-branch",
        id: "implementation-line",
        branchKind: "implementation",
      },
      observedGitContext: {
        gitBranch: "main",
        binding: "observation-only",
      },
    });
    expect(snapshot.runners[0]).toMatchObject({
      binding: {
        kind: "project-mission",
        registeredProjectId: "repository:fixture",
        missionId: "mvp",
      },
      freshness: { kind: "cached", ageMs: 1_800_000 },
    });
    expect(snapshot.attention.map((item) => item.code)).toContain("runner-input-pending");
    expect(snapshot.attention.map((item) => item.code)).not.toContain("dirty-worktree");
  });

  test("observes only explicitly supplied unregistered roots and leaves unmatched runners unbound", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-unregistered-"));
    temporaryRoots.push(root);
    const registered = join(root, "registered");
    const unregistered = join(root, "unregistered");
    const unobserved = join(root, "unobserved");
    const registeredRemote = "https://example.test/lidessen/registered.git";
    createRepository(registered, registeredRemote);
    createRepository(unregistered, "https://example.test/lidessen/unregistered.git");
    createRepository(unobserved, "https://example.test/lidessen/unobserved.git");
    writeJson(join(unregistered, "operations", "missions", "local.json"), mission("local", "mainline"));
    writeJson(join(unobserved, "operations", "missions", "hidden.json"), mission("hidden", "mainline"));

    const home = makeHome(root, registeredRemote, registered);
    writeJson(join(home, "missions", "unknown-cache", "runner-status.json"), runnerStatus("unknown", "running"));
    writeJson(join(home, "missions", "broken-cache", "runner-status.json"), { version: "wrong" });

    const snapshot = buildWorkbenchSnapshot({
      home,
      localRepositoryRoots: [unregistered],
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.complete).toBe(false);
    expect(snapshot.projects).toHaveLength(2);
    const observed = snapshot.projects.find((project) => project.registration === "observed-unregistered")!;
    expect(observed.identity.id).toBeNull();
    expect(observed.missions.map((record) => record.id)).toEqual(["local"]);
    expect(snapshot.projects.flatMap((project) => project.missions).some((record) => record.id === "hidden")).toBe(false);
    expect(snapshot.runners).toHaveLength(1);
    expect(snapshot.runners[0]!.binding).toEqual({
      kind: "unbound",
      reason: "no-explicit-mission-id-match",
    });
    expect(snapshot.errors).toEqual([
      expect.objectContaining({ scope: "runner", source: expect.stringContaining("broken-cache") }),
    ]);
    expect(snapshot.attention.map((item) => item.code)).toContain("runner-unbound");
    expect(snapshot).not.toHaveProperty("health");
  });

  test("projects anchor migration and no-runtime idle as distinct truthful attention states", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ui-anchor-carriers-"));
    temporaryRoots.push(root);
    const repository = join(root, "registered");
    const remote = "https://example.test/lidessen/anchor-carriers.git";
    createRepository(repository, remote);
    writeJson(
      join(repository, "operations", "missions", "legacy.json"),
      mission("legacy", "implementation-line"),
    );
    writeJson(
      join(repository, "operations", "missions", "idle.json"),
      mission("idle", "implementation-line"),
    );
    git(repository, "add", "operations/missions");
    git(repository, "commit", "-m", "add carrier Missions");
    const home = makeHome(root, remote, repository);
    writeJson(join(home, "missions", "legacy", "runner-status.json"), {
      ...runnerStatus("legacy", "anchor-pending"),
      inputWatermark: 0,
      reconciledWatermark: 0,
    });
    writeJson(join(home, "missions", "idle", "runner-status.json"), {
      ...runnerStatus("idle", "idle"),
      inputWatermark: 1,
      reconciledWatermark: 1,
    });

    const snapshot = buildWorkbenchSnapshot({
      home,
      now: () => "2026-07-26T11:00:00Z",
    });

    expect(snapshot.runners.map((runner) => runner.status.state).sort()).toEqual([
      "anchor-pending",
      "idle",
    ]);
    expect(snapshot.attention).toContainEqual(expect.objectContaining({
      priority: "principal-decision",
      code: "runner-anchor-pending",
      missionId: "legacy",
      summary: expect.stringContaining("guarded adoption or migration"),
    }));
    expect(snapshot.attention).toContainEqual(expect.objectContaining({
      priority: "notice",
      code: "runner-idle",
      missionId: "idle",
      summary: expect.stringContaining("no runtime or current executor"),
    }));
  });
});
