import { describe, expect, test } from "bun:test";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "../src/mission-execution-proposal";

function proposal(): MissionExecutionProposal {
  return MissionExecutionProposalSchema.parse({
    version: "mission-execution-proposal.v1",
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
      dataCategories: ["task instructions", "selected repository context"],
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
    }],
  });
}

function proposalV2(): Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
> {
  return MissionExecutionProposalSchema.parse({
    ...proposal(),
    version: "mission-execution-proposal.v2",
    scope: {
      readPaths: [
        "AGENTS.md",
        "DESIGN.md",
        "app/page.tsx",
        "db/schema.ts",
      ],
      excludePaths: [
        ".git",
        ".env",
        ".dev.vars",
        ".openai/hosting.json",
        "node_modules",
      ],
      writePaths: ["app/blog", "db/publications.ts"],
      commands: [],
    },
  }) as Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  >;
}

function changed(
  mutate: (candidate: Record<string, any>) => void,
): unknown {
  const candidate = structuredClone(proposal()) as unknown as Record<string, any>;
  mutate(candidate);
  return candidate;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, entry]) => [key, reverseObjectKeys(entry)]),
    );
  }
  return value;
}

describe("Mission execution proposal contract", () => {
  test("requires a stable proposal ID and a complete withheld authority boundary", () => {
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => delete candidate.proposalId),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.proposalId = "Blog Run";
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => delete candidate.runtimeDigest),
    ).success).toBe(false);
    for (const runtimeDigest of [
      "1".repeat(63),
      "1".repeat(65),
      "A".repeat(64),
      "g".repeat(64),
    ]) {
      expect(MissionExecutionProposalSchema.safeParse(
        changed((candidate) => {
          candidate.runtimeDigest = runtimeDigest;
        }),
      ).success).toBe(false);
    }

    for (const authority of [
      "externalDisclosure",
      "budgetRelease",
      "write",
      "execute",
      "commit",
      "merge",
      "publish",
    ]) {
      expect(MissionExecutionProposalSchema.safeParse(
        changed((candidate) => {
          candidate.authority[authority] = "granted";
        }),
      ).success).toBe(false);
    }
  });

  test("rejects unknown fields, device paths, traversal, and command authority", () => {
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.unexpected = true;
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.proposalDigest = "not-source-owned";
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.candidateWorktree.path = "/tmp/blog-candidate";
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.candidateWorktree.rootRef = "/tmp/blog-candidate";
      }),
    ).success).toBe(false);

    for (const writePath of ["../site", "site/../secret", "/absolute/site", "site\\secret"]) {
      expect(MissionExecutionProposalSchema.safeParse(
        changed((candidate) => {
          candidate.scope.writePaths = [writePath];
        }),
      ).success).toBe(false);
    }

    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.scope.commands = ["bun test"];
      }),
    ).success).toBe(false);
  });

  test("v2 makes the exact read and exclusion boundary part of the proposal digest", () => {
    const baseline = proposalV2();
    expect(baseline.scope).toMatchObject({
      readPaths: ["AGENTS.md", "DESIGN.md", "app/page.tsx", "db/schema.ts"],
      excludePaths: [".git", ".env", ".dev.vars", ".openai/hosting.json", "node_modules"],
      commands: [],
    });
    expect(MissionExecutionProposalSchema.safeParse({
      ...baseline,
      scope: {
        ...baseline.scope,
        readPaths: ["."],
      },
    }).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse({
      ...baseline,
      scope: {
        writePaths: baseline.scope.writePaths,
        commands: [],
      },
    }).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse({
      ...proposal(),
      scope: {
        ...proposal().scope,
        readPaths: ["AGENTS.md"],
        excludePaths: [".git"],
      },
    }).success).toBe(false);

    const changedReadBoundary = MissionExecutionProposalSchema.parse({
      ...baseline,
      scope: {
        ...baseline.scope,
        readPaths: [...baseline.scope.readPaths, "package.json"],
      },
    });
    expect(missionExecutionProposalDigest(changedReadBoundary)).not.toBe(
      missionExecutionProposalDigest(baseline),
    );
  });

  test("keeps each pending decision compact, distinct, and replyable", () => {
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.pendingDecisions[0].options = [candidate.pendingDecisions[0].options[0]];
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        const option = candidate.pendingDecisions[0].options[0];
        candidate.pendingDecisions[0].options = Array.from({ length: 5 }, (_, index) => ({
          ...option,
          replyKey: `A${index}`,
          label: `Option ${index}`,
        }));
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.pendingDecisions[0].options[1].replyKey = "A";
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.pendingDecisions[0].compactReplyKey = "C";
      }),
    ).success).toBe(false);
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => {
        candidate.pendingDecisions[0].options[0].replyKey = "choose a";
      }),
    ).success).toBe(false);
  });

  test("requires an enforceable execution budget and labels estimated tokens as forecast only", () => {
    expect(MissionExecutionProposalSchema.safeParse(
      changed((candidate) => delete candidate.budget),
    ).success).toBe(false);
    for (const mutate of [
      (candidate: Record<string, any>) => {
        candidate.budget.parent.maxModelSteps = 0;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.parent.maxOutputTokensPerStep = 1.5;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.delegatedCell.maxSteps = 0;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.delegatedCell.maxOutputTokensPerStep = -1;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.delegatedCell.maxDurationMs = 0;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.estimatedTokens = 0;
      },
      (candidate: Record<string, any>) => {
        candidate.budget.estimatedTokensSemantics = "stop-condition";
      },
    ]) {
      expect(MissionExecutionProposalSchema.safeParse(changed(mutate)).success).toBe(false);
    }
  });

  test("computes a canonical digest that is stable across key order and sensitive to content", () => {
    const baseline = proposal();
    const reordered = MissionExecutionProposalSchema.parse(reverseObjectKeys(baseline));
    expect(missionExecutionProposalDigest(baseline)).toMatch(/^[a-f0-9]{64}$/);
    expect(missionExecutionProposalDigest(reordered)).toBe(missionExecutionProposalDigest(baseline));

    const altered = MissionExecutionProposalSchema.parse(changed((candidate) => {
      candidate.budget.parent.maxModelSteps += 1;
    }));
    expect(missionExecutionProposalDigest(altered)).not.toBe(missionExecutionProposalDigest(baseline));

    const changedRuntime = MissionExecutionProposalSchema.parse(changed((candidate) => {
      candidate.runtimeDigest = "2".repeat(64);
    }));
    expect(missionExecutionProposalDigest(changedRuntime)).not.toBe(
      missionExecutionProposalDigest(baseline),
    );
  });
});
