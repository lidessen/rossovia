import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executionAuthorizationReceiptPath,
  type ExecutionAuthorizationReceipt,
} from "../../workbench/src/execution-authorization";
import {
  ExecutionAuthorizationClaimSchema,
} from "../../workbench/src/execution-authorization-claim";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import {
  blogPublicationWorkspace,
  blogPublicationAuthorizationContract,
  blogPublicationExecutionProposal,
  createMissionRuntime,
  currentBlogPublicationRuntimeDigest,
  missionRuntimeRecoveryCapabilities,
} from "../experiments/agent-era-blog-publication-runtime";
import {
  claimProjectExecutionAuthorization,
  consumeProjectExecutionAuthorization,
  validateProjectExecutionAuthorization,
} from "../experiments/project-execution-authorization";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the publication runtime declares one exact v2 read, exclusion, write, and empty command boundary", () => {
  const contract = blogPublicationAuthorizationContract();
  expect(missionRuntimeRecoveryCapabilities).toEqual({
    resume: false,
    replace: false,
  });
  expect(contract.proposalId).toBe(
    "agent-era-blog-seeded-publication-roundtrip-v1",
  );
  expect(contract.proposalVersion).toBe("mission-execution-proposal.v2");
  expect(contract.runtimeDigest).toBe(currentBlogPublicationRuntimeDigest());
  expect(contract.scope).toEqual({
    readPaths: [
      "AGENTS.md",
      "DESIGN.md",
      "operations/missions/principal-workbench-dogfood.json",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "drizzle.config.ts",
      "vite.config.ts",
      "next.config.ts",
      "worker/index.ts",
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "app/chatgpt-auth.ts",
      "app/blog/content.ts",
      "db/index.ts",
      "db/schema.ts",
      "drizzle/meta/_journal.json",
      "tests/rendered-html.test.mjs",
    ],
    excludePaths: [
      ".git",
      ".env",
      ".dev.vars",
      ".openai/hosting.json",
      ".wrangler",
      "node_modules",
      "dist",
      ".next",
    ],
    writePaths: [
      "db/schema.ts",
      "db/publications.ts",
      "app/blog",
      "app/studio",
      "app/api/publications",
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "drizzle",
      "tests/rendered-html.test.mjs",
      "tests/author-reader-flow.test.mjs",
      "package.json",
    ],
    commands: [],
  });
  expect(contract.requiredChoices).toEqual([{
    decisionId: "external-disclosure",
    replyKey: "ALLOW",
  }]);
  if (!("readPaths" in contract.scope)) {
    throw new Error("publication contract must use proposal v2 scope");
  }
  const workspace = blogPublicationWorkspace("/candidate");
  expect(workspace.root).toBe("/candidate");
  expect(workspace.readPaths as readonly string[]).toEqual(
    contract.scope.readPaths,
  );
  expect(workspace.excludePaths as readonly string[]).toEqual(
    contract.scope.excludePaths,
  );
  expect(workspace.writePaths as readonly string[]).toEqual(
    contract.scope.writePaths,
  );
  expect(workspace.allowedCommands).toEqual([]);
});

test("one exact v2 receipt is consumed once and records the clean detached candidate", () => {
  const fixture = authorizationFixture();
  const consumed = consume(fixture);
  const claim = ExecutionAuthorizationClaimSchema.parse(
    JSON.parse(readFileSync(consumed.claimPath, "utf8")),
  );
  expect(claim).toMatchObject({
    authorizationId: fixture.receipt.authorizationId,
    proposalId: fixture.proposal.proposalId,
    proposalDigest: fixture.receipt.proposalDigest,
    localEvidence: {
      worktree: fixture.worktree,
      gitHead: fixture.head,
    },
  });
  expect(() => consume(fixture)).toThrow("already consumed");
});

test("an invalid claim timestamp fails before the receipt is consumed", () => {
  const fixture = authorizationFixture();
  expect(() => consumeProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(),
    now: () => "not-a-timestamp",
  })).toThrow();
  expect(claimExists(
    fixture.home,
    fixture.receipt.authorizationId,
  )).toBe(false);
});

test("read-scope drift and HOLD fail before a one-use claim is created", () => {
  const widened = authorizationFixture((proposal) => ({
    ...proposal,
    scope: {
      ...proposal.scope,
      readPaths: [...proposal.scope.readPaths, "README.md"],
    },
  }));
  expect(() => consume(widened)).toThrow(
    "read, exclusion, write, or command boundary does not match",
  );
  expect(claimExists(
    widened.home,
    widened.receipt.authorizationId,
  )).toBe(false);

  const held = authorizationFixture();
  const holdResult = held.proposal.pendingDecisions[0]!.options
    .find((option) => option.replyKey === "HOLD")!.immediateResult;
  writeReceipt(held.receiptPath, {
    ...held.receipt,
    choices: [{ decisionId: "external-disclosure", replyKey: "HOLD" }],
    immediateAuthorizedResults: [{
      decisionId: "external-disclosure",
      result: holdResult,
    }],
  });
  expect(() => consume(held)).toThrow("external-disclosure=ALLOW");
  expect(claimExists(held.home, held.receipt.authorizationId)).toBe(false);
});

test("every adapter boundary drift fails before a one-use claim is created", () => {
  const cases: readonly [
    string,
    (
      proposal: Extract<
        MissionExecutionProposal,
        { version: "mission-execution-proposal.v2" }
      >,
    ) => Extract<
      MissionExecutionProposal,
      { version: "mission-execution-proposal.v2" }
    >,
  ][] = [
    ["exclude scope", (proposal) => ({
      ...proposal,
      scope: {
        ...proposal.scope,
        excludePaths: [...proposal.scope.excludePaths, "private"],
      },
    })],
    ["write scope", (proposal) => ({
      ...proposal,
      scope: {
        ...proposal.scope,
        writePaths: [...proposal.scope.writePaths, "README.md"],
      },
    })],
    ["runtime digest", (proposal) => ({
      ...proposal,
      runtimeDigest: "0".repeat(64),
    })],
    ["external disclosure", (proposal) => ({
      ...proposal,
      externalDisclosure: {
        dataCategories: [
          ...proposal.externalDisclosure.dataCategories,
          "undeclared source",
        ],
      },
    })],
    ["budget", (proposal) => ({
      ...proposal,
      budget: {
        ...proposal.budget,
        estimatedTokens: proposal.budget.estimatedTokens + 1,
      },
    })],
  ];

  for (const [label, mutate] of cases) {
    const fixture = authorizationFixture(mutate);
    expect(() => consume(fixture), label).toThrow();
    expect(
      claimExists(fixture.home, fixture.receipt.authorizationId),
      label,
    ).toBe(false);
  }
});

test("dirty, attached, and stale-head candidates fail before claim", () => {
  const dirty = authorizationFixture();
  writeFileSync(join(dirty.worktree, "dirty.txt"), "dirty\n");
  expect(() => consume(dirty)).toThrow("must be clean");
  expect(claimExists(dirty.home, dirty.receipt.authorizationId)).toBe(false);

  const attached = authorizationFixture();
  expect(() => consumeProjectExecutionAuthorization({
    home: attached.home,
    missionId: "principal-workbench-dogfood",
    worktree: attached.repository,
    receiptPath: attached.receiptPath,
    contract: blogPublicationAuthorizationContract(),
  })).toThrow("linked Git worktree");
  expect(claimExists(
    attached.home,
    attached.receipt.authorizationId,
  )).toBe(false);

  const stale = authorizationFixture();
  writeFileSync(join(stale.worktree, "new.txt"), "new head\n");
  git(stale.worktree, "add", "new.txt");
  git(stale.worktree, "commit", "-m", "advance detached candidate");
  expect(() => consume(stale)).toThrow("Git head mismatch");
  expect(claimExists(stale.home, stale.receipt.authorizationId)).toBe(false);
});

test("a missing reconciled anchor does not consume the runtime authorization", async () => {
  const fixture = authorizationFixture();
  const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
  const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  try {
    await expect(createMissionRuntime({
      root: fixture.home,
      missionId: "principal-workbench-dogfood",
      timeline: {
        latestReconciledAnchor: async () => undefined,
      },
      recovery: undefined,
    } as unknown as Parameters<typeof createMissionRuntime>[0])).rejects.toThrow(
      "requires an authorized and reconciled Mission anchor",
    );
    expect(claimExists(
      fixture.home,
      fixture.receipt.authorizationId,
    )).toBe(false);
  } finally {
    restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
    restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
  }
});

test("the runtime claims only after all local launch preconditions succeed", async () => {
  const fixture = authorizationFixture();
  const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
  const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
  const priorKey = process.env.DEEPSEEK_API_KEY;
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  process.env.DEEPSEEK_API_KEY = "test-only-not-sent";
  try {
    const prepared = await createMissionRuntime({
      root: fixture.home,
      missionId: "principal-workbench-dogfood",
      timeline: {
        latestReconciledAnchor: async () => ({
          id: "intent:principal-workbench-dogfood",
          revision: "r1",
          statement: "Complete the supervised Blog roundtrip.",
          sourceRefs: ["principal:test"],
          reconciledWatermark: 0,
        }),
      },
      recovery: undefined,
    } as unknown as Parameters<typeof createMissionRuntime>[0]);
    expect(prepared.turn.anchorDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(prepared.turn.launchAuthorizationRef).toEqual({
      authorizationId: fixture.receipt.authorizationId,
      proposalDigest: fixture.receipt.proposalDigest,
      claimSourceRef: join(
        "state",
        "execution-authorization-claims",
        `${fixture.receipt.authorizationId}.json`,
      ),
    });
    expect(claimExists(
      fixture.home,
      fixture.receipt.authorizationId,
    )).toBe(true);
    prepared.controller.cancel("test complete");
  } finally {
    restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
    restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
    restoreEnvironment("DEEPSEEK_API_KEY", priorKey);
  }
});

test("claim revalidation rejects candidate drift after side-effect-free preflight", () => {
  const fixture = authorizationFixture();
  const validated = validateProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(),
  });
  writeFileSync(join(fixture.worktree, "late-drift.txt"), "late drift\n");
  expect(() => claimProjectExecutionAuthorization(validated)).toThrow(
    "must be clean",
  );
  expect(claimExists(
    fixture.home,
    fixture.receipt.authorizationId,
  )).toBe(false);
});

interface Fixture {
  readonly home: string;
  readonly repository: string;
  readonly worktree: string;
  readonly head: string;
  readonly proposal: Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  >;
  readonly receiptPath: string;
  readonly receipt: ExecutionAuthorizationReceipt;
}

function authorizationFixture(
  mutate: (
    proposal: Extract<
      MissionExecutionProposal,
      { version: "mission-execution-proposal.v2" }
    >,
  ) => Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  > = (proposal) => proposal,
): Fixture {
  const root = mkdtempSync(join(tmpdir(), "blog-publication-authorization-"));
  roots.push(root);
  const repository = join(root, "repository");
  const candidatePath = join(root, "candidate");
  const home = join(root, "rosso-home");
  mkdirSync(repository, { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Blog Publication Test");
  git(repository, "config", "user.email", "blog-publication@example.test");

  const proposal = mutate(publicationProposal());
  const missionPath = join(
    repository,
    "operations",
    "missions",
    "principal-workbench-dogfood.json",
  );
  mkdirSync(join(missionPath, ".."), { recursive: true });
  writeFileSync(
    missionPath,
    `${JSON.stringify(missionRecord(proposal), null, 2)}\n`,
  );
  writeFileSync(join(repository, "AGENTS.md"), "# Test project\n");
  writeFileSync(join(repository, "DESIGN.md"), "# Test design\n");
  git(repository, "add", ".");
  git(repository, "commit", "-m", "seed publication proposal");
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
  return {
    home: realpathSync(home),
    repository: realpathSync(repository),
    worktree,
    head,
    proposal,
    receiptPath: realpathSync(receiptPath),
    receipt,
  };
}

function publicationProposal(): Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
> {
  return blogPublicationExecutionProposal();
}

function missionRecord(proposal: MissionExecutionProposal) {
  return {
    version: "mission-record.v1",
    id: "principal-workbench-dogfood",
    title: "Blog publication trial",
    sources: ["principal:test"],
    createdAt: "2026-07-27T12:00:00Z",
    updatedAt: "2026-07-27T12:00:00Z",
    mainline: {
      contradiction: "Prove the supervised publication roundtrip",
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
  const choices = [{
    decisionId: "external-disclosure",
    replyKey: "ALLOW",
  }];
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
    immediateAuthorizedResults: proposal.pendingDecisions.map((decision) => ({
      decisionId: decision.id,
      result: decision.options.find(
        (option) => option.replyKey === choices[0]!.replyKey,
      )!.immediateResult,
    })),
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
    authorizedAt: "2026-07-27T12:30:00Z",
  };
}

function consume(fixture: Fixture) {
  return consumeProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(),
  });
}

function writeReceipt(
  path: string,
  receipt: ExecutionAuthorizationReceipt,
): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`);
}

function claimExists(home: string, authorizationId: string): boolean {
  return existsSync(join(
    home,
    "state",
    "execution-authorization-claims",
    `${authorizationId}.json`,
  ));
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

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
