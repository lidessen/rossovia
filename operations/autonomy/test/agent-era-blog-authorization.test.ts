import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executionAuthorizationReceiptPath,
  type ExecutionAuthorizationReceipt,
} from "../../workbench/src/execution-authorization";
import {
  missionExecutionProposalDigest,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import {
  consumeBlogExecutionAuthorization,
  createMissionRuntime,
  currentBlogRuntimeDigest,
} from "../experiments/agent-era-blog-mission-runtime";
import { FileMissionTimeline } from "../src/delegate-timeline";

const roots: string[] = [];
const originalEffectRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
const originalReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  restoreEnv("ROSSO_BLOG_EFFECT_ROOT", originalEffectRoot);
  restoreEnv("ROSSO_BLOG_AUTHORIZATION_RECEIPT", originalReceipt);
});

test("one valid receipt is claimed atomically and cannot authorize a second execution", () => {
  const fixture = authorizationFixture();
  const first = consumeBlogExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    now: () => "2026-07-27T10:00:00.000Z",
  });

  expect(existsSync(first.claimPath)).toBe(true);
  expect(existsSync(join(fixture.home, "claims"))).toBe(false);
  expect(JSON.parse(readFileSync(first.claimPath, "utf8"))).toEqual(expect.objectContaining({
    authorizationId: fixture.receipt.authorizationId,
    proposalDigest: fixture.receipt.proposalDigest,
    receipt: {
      ref: expect.stringContaining("receipts/execution-authorizations"),
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    },
    localEvidence: {
      worktree: fixture.worktree,
      gitHead: fixture.head,
    },
  }));
  expect(() => consumeBlogExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
  })).toThrow("already consumed");
});

test("stale proposal digests and wrong candidate heads fail closed without creating a claim", () => {
  const fixture = authorizationFixture();
  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    proposalDigest: "d".repeat(64),
  });
  expect(() => consumeBlogExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
  })).toThrow("proposal digest mismatch");
  expect(claimExists(fixture.home, fixture.receipt.authorizationId)).toBe(false);

  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    missionSource: {
      ...fixture.receipt.missionSource,
      gitHead: "e".repeat(40),
    },
  });
  expect(() => consumeBlogExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
  })).toThrow("Git head mismatch");
  expect(claimExists(fixture.home, fixture.receipt.authorizationId)).toBe(false);
});

test("a receipt cannot authorize changed runtime task or acceptance source", () => {
  const fixture = authorizationFixture("0".repeat(64));
  expect(() => consume(fixture)).toThrow(
    "runtimeDigest must match the loaded runtime source",
  );
  expect(claimExists(fixture.home, fixture.receipt.authorizationId)).toBe(false);
});

test("missing, duplicate, or non-ALLOW choices fail closed", () => {
  const fixture = authorizationFixture();
  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    choices: [{ decisionId: "external-disclosure", replyKey: "ALLOW" }],
    immediateAuthorizedResults: [fixture.receipt.immediateAuthorizedResults[1]!],
  });
  expect(() => consume(fixture)).toThrow("cover every pending decision");

  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    choices: [
      fixture.receipt.choices[0]!,
      fixture.receipt.choices[0]!,
    ],
    immediateAuthorizedResults: [
      fixture.receipt.immediateAuthorizedResults[0]!,
      fixture.receipt.immediateAuthorizedResults[0]!,
    ],
  });
  expect(() => consume(fixture)).toThrow("repeats decision visual-direction");

  const holdResult = fixture.proposal.pendingDecisions[1]!.options
    .find((option) => option.replyKey === "HOLD")!.immediateResult;
  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    choices: [
      fixture.receipt.choices[0]!,
      { decisionId: "external-disclosure", replyKey: "HOLD" },
    ],
    immediateAuthorizedResults: [
      fixture.receipt.immediateAuthorizedResults[0]!,
      { decisionId: "external-disclosure", result: holdResult },
    ],
  });
  expect(() => consume(fixture)).toThrow("external-disclosure=ALLOW");
  expect(claimExists(fixture.home, fixture.receipt.authorizationId)).toBe(false);
});

test("a copied or symlinked receipt and a dirty candidate fail before the one-time claim", () => {
  const copied = authorizationFixture();
  const copiedPath = join(copied.root, "copied-receipt.json");
  writeReceipt(copiedPath, copied.receipt);
  expect(() => consumeBlogExecutionAuthorization({
    home: copied.home,
    missionId: "principal-workbench-dogfood",
    worktree: copied.worktree,
    receiptPath: copiedPath,
  })).toThrow("deterministic receipt path");
  expect(claimExists(copied.home, copied.receipt.authorizationId)).toBe(false);

  const symlinked = authorizationFixture();
  const target = join(symlinked.root, "receipt-target.json");
  writeReceipt(target, symlinked.receipt);
  rmSync(symlinked.receiptPath);
  symlinkSync(target, symlinked.receiptPath);
  expect(() => consume(symlinked)).toThrow("not a regular file");
  expect(claimExists(symlinked.home, symlinked.receipt.authorizationId)).toBe(false);

  const dirty = authorizationFixture();
  writeFileSync(join(dirty.worktree, "DIRTY.md"), "uncommitted\n");
  expect(() => consume(dirty)).toThrow("must be clean");
  expect(claimExists(dirty.home, dirty.receipt.authorizationId)).toBe(false);
});

test("the Mission runtime rejects an invalid receipt before model or effect setup", async () => {
  const fixture = authorizationFixture();
  writeReceipt(fixture.receiptPath, {
    ...fixture.receipt,
    proposalDigest: "f".repeat(64),
  });
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;

  await expect(createMissionRuntime({
    root: fixture.home,
    missionId: "principal-workbench-dogfood",
    timeline: new FileMissionTimeline(join(fixture.home, "timeline")),
  })).rejects.toThrow("proposal digest mismatch");
  expect(claimExists(fixture.home, fixture.receipt.authorizationId)).toBe(false);
  expect(existsSync(join(fixture.home, "missions"))).toBe(false);
});

interface AuthorizationFixture {
  readonly root: string;
  readonly home: string;
  readonly worktree: string;
  readonly head: string;
  readonly proposal: MissionExecutionProposal;
  readonly receiptPath: string;
  readonly receipt: ExecutionAuthorizationReceipt;
}

function authorizationFixture(
  runtimeDigest = currentBlogRuntimeDigest(),
): AuthorizationFixture {
  const root = mkdtempSync(join(tmpdir(), "blog-authorization-"));
  roots.push(root);
  const repository = join(root, "repository");
  const candidatePath = join(root, "candidate");
  const home = join(root, "rosso-home");
  mkdirSync(repository, { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Blog Authorization Test");
  git(repository, "config", "user.email", "blog-authorization@example.test");
  const proposal = executionProposal(runtimeDigest);
  const missionPath = join(
    repository,
    "operations",
    "missions",
    "principal-workbench-dogfood.json",
  );
  mkdirSync(join(missionPath, ".."), { recursive: true });
  writeFileSync(missionPath, `${JSON.stringify(missionRecord(proposal), null, 2)}\n`);
  writeFileSync(join(repository, "AGENTS.md"), "# Test project\n");
  writeFileSync(join(repository, "DESIGN.md"), "# Test design\n");
  git(repository, "add", ".");
  git(repository, "commit", "-m", "seed authorized proposal");
  git(repository, "worktree", "add", "--detach", candidatePath, "HEAD");
  const worktree = realpathSync(candidatePath);
  const head = git(worktree, "rev-parse", "HEAD");
  const receipt = authorizationReceipt(proposal, head);
  const receiptPath = executionAuthorizationReceiptPath(
    home,
    receipt.projectId,
    receipt.missionId,
    receipt.proposalId,
  );
  writeReceipt(receiptPath, receipt);
  return { root, home, worktree, head, proposal, receiptPath, receipt };
}

function executionProposal(runtimeDigest: string): MissionExecutionProposal {
  return {
    version: "mission-execution-proposal.v1",
    proposalId: "agent-era-blog-first-supervised-run-v1",
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: "source-project:operations/autonomy/experiments/agent-era-blog-mission-runtime.ts",
    runtimeDigest,
    externalProvider: { name: "DeepSeek", boundary: "external" },
    externalDisclosure: {
      dataCategories: [
        "Blog task and acceptance instructions",
        "AGENTS.md, DESIGN.md, and the active Mission source",
        "Repository file contents selected by the bounded read tools",
      ],
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
      parent: { maxModelSteps: 4, maxOutputTokensPerStep: 2_000 },
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
      label: "Choose the first visual direction",
      proposal: "B - Reading Field",
      status: "pending",
      options: [{
        replyKey: "A",
        label: "Margin Ledger",
        immediateResult: "Retain direction A for later visual work.",
        tradeoff: "Denser reading.",
      }, {
        replyKey: "B",
        label: "Reading Field",
        immediateResult: "Retain direction B for later visual work.",
        tradeoff: "Relies on hierarchy.",
      }],
      compactReplyKey: "B",
    }, {
      id: "external-disclosure",
      label: "Authorize the declared DeepSeek disclosure",
      proposal: "ALLOW",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Authorize DeepSeek",
        immediateResult: "Start one declared external run.",
        tradeoff: "Context leaves the local boundary.",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult: "Do not start the external run.",
        tradeoff: "No implementation evidence.",
      }],
      compactReplyKey: "ALLOW",
    }],
  };
}

function missionRecord(proposal: MissionExecutionProposal) {
  return {
    version: "mission-record.v1",
    id: "principal-workbench-dogfood",
    title: "Blog supervised trial",
    sources: ["principal:test"],
    createdAt: "2026-07-27T09:00:00Z",
    updatedAt: "2026-07-27T09:00:00Z",
    mainline: {
      contradiction: "Prove the supervised Blog execution boundary",
      acceptance: ["Invalid authorization fails closed"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
    executionProposal: proposal,
  };
}

function authorizationReceipt(
  proposal: MissionExecutionProposal,
  head: string,
): ExecutionAuthorizationReceipt {
  const choices = [
    { decisionId: "visual-direction", replyKey: "B" },
    { decisionId: "external-disclosure", replyKey: "ALLOW" },
  ];
  return {
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId: randomUUID(),
    projectId: "appgprj_6a66e0a058b081919d4bce580c0ed1ac",
    missionId: "principal-workbench-dogfood",
    missionSource: {
      path: "operations/missions/principal-workbench-dogfood.json",
      gitHead: head,
    },
    proposalId: proposal.proposalId,
    proposalDigest: missionExecutionProposalDigest(proposal),
    choices,
    immediateAuthorizedResults: proposal.pendingDecisions.map((decision) => {
      const selected = choices.find((choice) => choice.decisionId === decision.id)!;
      return {
        decisionId: decision.id,
        result: decision.options.find((option) => option.replyKey === selected.replyKey)!.immediateResult,
      };
    }),
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
    actorRef: "principal:test",
    sourceRef: "conversation:test/turn",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-07-27T09:30:00Z",
  };
}

function consume(fixture: AuthorizationFixture) {
  return consumeBlogExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
  });
}

function writeReceipt(path: string, receipt: ExecutionAuthorizationReceipt): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`);
}

function claimExists(home: string, authorizationId: string): boolean {
  return existsSync(join(home, "state", "execution-authorization-claims", `${authorizationId}.json`));
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
