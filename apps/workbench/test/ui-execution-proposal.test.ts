import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ExecutionAuthorizationProjection,
} from "../src/ui/projection";
import type {
  MissionExecutionProposalProjection,
} from "../src/mission-execution-proposal";
import {
  buildExecutionAuthorizationRequest,
  createExecutionAuthorizationDraft,
  executionAuthorizationEligibility,
  executionAuthorizationRefreshVerdict,
  executionProposalView,
} from "../../gateway/ui/execution-proposal.js";

const proposal = {
  version: "mission-execution-proposal.v1",
  proposalId: "agent-era-blog-first-supervised-run-v1",
  proposalDigest: "58d8e90000000000000000000000000000000000000000000000000000000000",
  mode: "supervised",
  status: "awaiting-principal-authorization",
  runtimeRef: "source-project:apps/autonomy/experiments/agent-era-blog-mission-runtime.ts",
  runtimeDigest: "1".repeat(64),
  externalProvider: {
    name: "DeepSeek",
    boundary: "external",
  },
  externalDisclosure: {
    dataCategories: [
      "Blog task and acceptance instructions",
      "repository file contents selected by bounded read tools",
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
  pendingDecisions: [
    {
      id: "visual-direction",
      label: "Choose the first visual direction",
      proposal: "B - Reading Field",
      status: "pending",
      options: [
        {
          replyKey: "A",
          label: "Margin Ledger",
          immediateResult: "Build the denser editorial ledger.",
          tradeoff: "More operational than contemplative.",
        },
        {
          replyKey: "B",
          label: "Reading Field",
          immediateResult: "Build the recommended reading-led surface.",
          tradeoff: "Less dashboard density.",
        },
      ],
      compactReplyKey: "B",
    },
    {
      id: "external-disclosure",
      label: "Authorize the declared DeepSeek disclosure",
      proposal: "ALLOW - send only declared categories",
      status: "pending",
      options: [
        {
          replyKey: "ALLOW",
          label: "Authorize DeepSeek",
          immediateResult: "Permit this exact proposal to proceed.",
          tradeoff: "Declared project context crosses an external boundary.",
        },
        {
          replyKey: "HOLD",
          label: "Keep blocked",
          immediateResult: "No external request or writable run starts.",
          tradeoff: "The experiment remains pending.",
        },
      ],
      compactReplyKey: "ALLOW",
    },
  ],
} satisfies MissionExecutionProposalProjection;

const awaitingAuthorization = {
  standing: "awaiting-principal-authorization",
} satisfies ExecutionAuthorizationProjection;

const validAuthorization = {
  standing: "authorized-awaiting-execution",
  authorizationId: "11111111-1111-4111-8111-111111111111",
  proposalDigest: proposal.proposalDigest,
  choices: [
    { decisionId: "visual-direction", replyKey: "B" },
    { decisionId: "external-disclosure", replyKey: "ALLOW" },
  ],
  immediateAuthorizedResults: [
    {
      decisionId: "visual-direction",
      result: "Build the recommended reading-led surface.",
    },
    {
      decisionId: "external-disclosure",
      result: "Permit the declared external request.",
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
  actorRef: "principal:local-workbench-user",
  sourceRef: "principal-workbench-action:11111111-1111-4111-8111-111111111111",
  attributionBoundary: "references-are-attribution-not-authentication",
  principalAction: {
    channel: "local-principal-workbench-ui",
    acknowledgements: {
      externalDisclosure: true,
      forecastOnlyBudget: true,
      oneUseLaunchAndIntegrationWithheld: true,
    },
    identityAssurance: "unverified-local-interaction",
  },
  authorizedAt: "2026-07-26T10:45:00Z",
  sourcePath: "/workbench/receipts/execution-authorizations/blog/run.json",
} satisfies ExecutionAuthorizationProjection;

const consumedAuthorization = {
  ...validAuthorization,
  standing: "authorization-consumed",
  consumption: {
    claimedAt: "2026-07-26T10:46:00Z",
    candidateWorktree: "/worktrees/blog-candidate",
    candidateHead: "2".repeat(40),
    receiptRef: "receipts/execution-authorizations/blog/run.json",
    receiptDigest: "3".repeat(64),
    claimSourcePath:
      "/workbench/state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
    workbenchTaskContext: null,
    evidenceBoundary: "proves-one-launch-authorization-consumed-only",
  },
} satisfies ExecutionAuthorizationProjection;

function authorizationInput(
  choices: Record<string, string> = {},
  acknowledgements: Record<string, boolean> = {},
) {
  return {
    source: "live",
    project: {
      projectKey: "registered:appgprj_blog",
      registration: "registered",
    },
    missionId: "principal-workbench-dogfood",
    proposal,
    authorization: awaitingAuthorization,
    choices,
    acknowledgements,
  };
}

describe("Principal Workbench pending execution proposal presentation", () => {
  const root = join(import.meta.dir, "..", "..", "gateway", "ui");
  const html = readFileSync(join(root, "index.html"), "utf8");
  const app = readFileSync(join(root, "app.js"), "utf8");
  const styles = readFileSync(join(root, "styles.css"), "utf8");

  test("keeps a missing Mission executionProposal backward compatible", () => {
    expect(executionProposalView(undefined)).toBeNull();
    expect(executionProposalView(null)).toBeNull();
    expect(html).toContain('id="execution-proposal"');
    expect(html).toMatch(/id="execution-proposal"[\s\S]*?hidden/);
    expect(app).toContain("if (view === null)");
    expect(app).toContain("surface.hidden = true");
  });

  test("maps the exact execution proposal contract into a truthful view", () => {
    const view = executionProposalView(proposal, awaitingAuthorization);

    expect(view).not.toBeNull();
    expect(view?.proposalId).toBe("agent-era-blog-first-supervised-run-v1");
    expect(view?.proposalDigest).toBe(
      "58d8e90000000000000000000000000000000000000000000000000000000000",
    );
    expect(view?.runtimeDigest).toBe("1".repeat(64));
    expect(view?.runtime).toContain(
      `source-project:apps/autonomy/experiments/agent-era-blog-mission-runtime.ts · sha256 ${"1".repeat(64)}`,
    );
    expect(view?.runtime).toContain("DeepSeek (external)");
    expect(view?.disclosures).toBe(
      "DeepSeek (external) ← Blog task and acceptance instructions, repository file contents selected by bounded read tools",
    );
    expect(view?.writeBoundary).toContain("environment:ROSSO_BLOG_EFFECT_ROOT");
    expect(view?.writeBoundary).toContain("read not declared by proposal v1");
    expect(view?.writeBoundary).toContain("exclude not declared by proposal v1");
    expect(view?.writeBoundary).toContain("write db/schema.ts, app/blog");
    expect(view?.commands).toBe("none declared");
    expect(view?.budgetLimits).toBe(
      "parent max 4 model steps · 2,000 output tokens/step\n" +
        "delegated cell max 14 steps · 16,000 output tokens/step · 300,000 ms (5m)",
    );
    expect(view?.tokenForecast).toBe(
      "60,000 estimated tokens\nforecast only · not a stop condition",
    );
    expect(view?.authority).toContain("externalDisclosure withheld");
    expect(view?.authority).toContain("budgetRelease withheld");
    expect(view?.authority).toContain("write withheld");
    expect(view?.authority).toContain("publish withheld");
  });

  test("shows the exact v2 read, exclusion, and write boundary", () => {
    const v2Proposal = {
      ...proposal,
      version: "mission-execution-proposal.v2",
      proposalId: "agent-era-blog-publication-roundtrip-v1",
      scope: {
        readPaths: ["AGENTS.md", "DESIGN.md", "app/page.tsx", "db/schema.ts"],
        excludePaths: [".git", ".env", ".dev.vars", ".openai/hosting.json", "node_modules"],
        writePaths: ["app/blog", "db/publications.ts"],
        commands: [],
      },
    } satisfies MissionExecutionProposalProjection;

    const view = executionProposalView(v2Proposal, awaitingAuthorization);
    expect(view?.writeBoundary).toContain(
      "read AGENTS.md, DESIGN.md, app/page.tsx, db/schema.ts",
    );
    expect(view?.writeBoundary).toContain(
      "exclude .git, .env, .dev.vars, .openai/hosting.json, node_modules",
    );
    expect(view?.writeBoundary).toContain("write app/blog, db/publications.ts");
    expect(view?.commands).toBe("none declared");
    expect(html).toContain("Worktree / 读写边界");
  });

  test("keeps an absent receipt awaiting authorization without inferring runner or effect state", () => {
    const view = executionProposalView(proposal, awaitingAuthorization);

    expect(view).toMatchObject({
      status: "awaiting-principal-authorization",
      proposalStatus: "awaiting-principal-authorization",
      heading: "待授权执行提案",
      contractOpen: true,
    });
    expect(view?.authorization).toEqual({
      standing: "awaiting-principal-authorization",
      receipt: "无有效 authorization receipt 投影",
      choices: "尚未授权任何选择",
      immediateAuthorizedResults: "尚未授权任何立即结果",
      authorityBoundary: "launch authority 未投影",
      interactionEvidence: "尚无 Principal action evidence",
      orthogonalityNotice:
        "Proposal 仍待授权；runner 与 effect 必须分别由各自投影证明。",
    });
  });

  test("shows one valid launch receipt without claiming that runner or effect started", () => {
    const view = executionProposalView(proposal, validAuthorization);

    expect(view).toMatchObject({
      status: "authorized-awaiting-execution",
      proposalStatus: "awaiting-principal-authorization",
      heading: "已授权 · 等待执行证据",
      contractOpen: false,
    });
    expect(view?.notStartedReason).toBe(
      "当前 artifact 不能再次授权或 HOLD。一次 launch authorization receipt 已存在；下一判断必须来自 runner / effect 证据。",
    );
    expect(view?.authorization.standing).toBe("authorized-awaiting-execution");
    expect(view?.authorization.receipt).toBe(
      "11111111-1111-4111-8111-111111111111\nauthorized 2026-07-26T10:45:00Z",
    );
    expect(view?.authorization.choices).toBe(
      "visual-direction=B\nexternal-disclosure=ALLOW",
    );
    expect(view?.authorization.immediateAuthorizedResults).toContain(
      "visual-direction: Build the recommended reading-led surface.",
    );
    expect(view?.authorization.authorityBoundary).toContain(
      "kind single-execution · maxUses 1",
    );
    expect(view?.authorization.authorityBoundary).toContain(
      "execute authorized-once",
    );
    expect(view?.authorization.authorityBoundary).toContain("commit withheld");
    expect(view?.authorization.interactionEvidence).toContain(
      "principal:local-workbench-user",
    );
    expect(view?.authorization.interactionEvidence).toContain(
      "unverified-local-interaction",
    );
    expect(view?.authorization.interactionEvidence).toContain(
      "forecastOnlyBudget=true",
    );
    expect(view?.authorization.orthogonalityNotice).toBe(
      "已授权一次 launch，但 runner / effect 尚未由此证明启动。",
    );
  });

  test("shows consumed launch authority as bounded evidence rather than execution success", () => {
    const view = executionProposalView(proposal, consumedAuthorization);

    expect(view).toMatchObject({
      status: "authorization-consumed",
      proposalStatus: "awaiting-principal-authorization",
      heading: "授权已消费 · 等待执行证据",
      contractOpen: false,
    });
    expect(view?.notStartedReason).toBe(
      "当前 artifact 不能再次授权或 HOLD。一次 launch authorization 已被 claim 消费；下一判断必须来自 runner / effect 证据，claim 本身不证明执行成功。",
    );
    expect(view?.authorization.standing).toBe("authorization-consumed");
    expect(view?.authorization.receipt).toContain(
      "consumed 2026-07-26T10:46:00Z",
    );
    expect(view?.authorization.receipt).toContain(
      "candidate /worktrees/blog-candidate",
    );
    expect(view?.authorization.receipt).toContain(
      `candidate HEAD ${"2".repeat(40)}`,
    );
    expect(view?.authorization.receipt).toContain(
      "claim /workbench/state/execution-authorization-claims/",
    );
    expect(view?.authorization.orthogonalityNotice).toBe(
      "claim 只证明一次 launch authority 已被消费；runner、effect、执行成功、集成与产品验收仍须各自证明。",
    );
    expect(executionAuthorizationEligibility({
      ...authorizationInput({
        "visual-direction": "B",
        "external-disclosure": "ALLOW",
      }, {
        externalDisclosure: true,
        forecastOnlyBudget: true,
        oneUseLaunchAndIntegrationWithheld: true,
      }),
      authorization: consumedAuthorization,
    })).toMatchObject({
      eligible: false,
      state: "blocked",
      reason: expect.stringContaining("只证明消费"),
    });
    expect(executionAuthorizationRefreshVerdict(
      "live",
      consumedAuthorization,
    )).toEqual({
      state: "authorized",
      message:
        "实时 projection 证明一次 launch authorization 已被严格绑定的 claim 消费；它不证明 runner、effect 或执行结果成功。",
    });
    expect(app).toContain(
      'view.authorization.standing === "authorization-consumed"',
    );
  });

  test("keeps dirty Mission sources and invalid receipt evidence visible but unauthorizable", () => {
    const blockedCases = [{
      standing: "execution-source-not-authorizable",
      reason: "Mission source differs from committed HEAD.",
      remediation: "Reconcile the Mission source with a committed HEAD, then refresh.",
      sourcePath: "/work/blog/apps/missions/blog-run.json",
    }, {
      standing: "invalid-receipt-evidence",
      reason: "Receipt proposal digest is stale.",
      remediation: "Inspect and reconcile the local receipt evidence.",
      sourcePath: "/workbench/receipts/execution-authorizations/blog-run.json",
    }, {
      standing: "invalid-consumption-evidence",
      reason: "Consumption claim receipt digest is stale.",
      remediation: "Inspect and reconcile the local consumption claim.",
      sourcePath:
        "/workbench/state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
    }] as const;
    const readyChoices = {
      "visual-direction": "B",
      "external-disclosure": "ALLOW",
    };
    const readyAcknowledgements = {
      externalDisclosure: true,
      forecastOnlyBudget: true,
      oneUseLaunchAndIntegrationWithheld: true,
    };

    for (const blocked of blockedCases) {
      const view = executionProposalView(proposal, blocked);
      expect(view?.authorization).toMatchObject({
        standing: blocked.standing,
        receipt: expect.stringContaining(blocked.reason),
        orthogonalityNotice: blocked.remediation,
      });
      expect(view?.notStartedReason).toBe(blocked.reason);
      expect(executionAuthorizationEligibility({
        ...authorizationInput(readyChoices, readyAcknowledgements),
        authorization: blocked,
      })).toMatchObject({
        eligible: false,
        state: "blocked",
        reason: expect.stringContaining(blocked.remediation),
      });
    }
  });

  test("preserves decision recommendation, options, consequences, and reply keys", () => {
    const view = executionProposalView(proposal);
    const visualDecision = view?.decisions[0];

    expect(visualDecision).toMatchObject({
      id: "visual-direction",
      label: "Choose the first visual direction",
      proposal: "B - Reading Field",
      status: "pending",
      compactReplyKey: "B",
    });
    expect(visualDecision?.options[1]).toEqual({
      replyKey: "B",
      label: "Reading Field",
      immediateResult: "Build the recommended reading-led surface.",
      tradeoff: "Less dashboard density.",
      recommended: true,
    });
    expect(visualDecision?.options[0]?.recommended).toBe(false);
    expect(visualDecision?.optionSummary).toContain(
      "B Reading Field — Build the recommended reading-led surface.；权衡：Less dashboard density.",
    );
    expect(view?.compactReplyKey).toBe("B + ALLOW");
    expect(app).toContain("proposal-option-recommendation");
    expect(app).toContain("selectedDecisionCount");
    expect(html).toContain("建议组合 · 不会自动选择");
    expect(html).toContain('class="proposal-decisions-header"');
    expect(html).toContain('class="proposal-decision-list"');
    expect(styles).toMatch(
      /\.proposal-decision-list\s*\{[^}]*display:\s*grid;/s,
    );
    expect(styles).not.toContain(".proposal-decisions > div");
    expect(html).toContain('id="proposal-authorization"');
    expect(html.indexOf('id="proposal-authorization-form"')).toBeLessThan(
      html.indexOf('id="proposal-authorization"'),
    );
    expect(app).toContain('$("#proposal-authorization").dataset.standing');
    expect(styles).toContain(
      '.proposal-authorization[data-standing="awaiting-principal-authorization"] dl',
    );
    expect(styles).not.toContain(
      '.proposal-authorization[data-standing="authorized-awaiting-execution"] dl',
    );
  });

  test("starts with no inferred choice or acknowledgement, including the recommended ALLOW path", () => {
    const draft = createExecutionAuthorizationDraft();
    const eligibility = executionAuthorizationEligibility(
      authorizationInput(draft.choices, draft.acknowledgements),
    );

    expect(draft).toEqual({
      choices: {},
      acknowledgements: {
        externalDisclosure: false,
        forecastOnlyBudget: false,
        oneUseLaunchAndIntegrationWithheld: false,
      },
    });
    expect(eligibility).toMatchObject({
      eligible: false,
      state: "blocked",
      normalizedChoices: [],
      missingDecisionIds: ["visual-direction", "external-disclosure"],
    });
    expect(eligibility.reason).toContain("external-disclosure=ALLOW");
  });

  test("keeps HOLD blocked without creating or submitting an authorization", () => {
    const input = authorizationInput(
      {
        "visual-direction": "B",
        "external-disclosure": "HOLD",
      },
      {
        externalDisclosure: true,
        forecastOnlyBudget: true,
        oneUseLaunchAndIntegrationWithheld: true,
      },
    );
    const eligibility = executionAuthorizationEligibility(input);

    expect(eligibility).toMatchObject({
      eligible: false,
      state: "hold",
      reason:
        "保持阻塞；未创建回执、未发送数据。HOLD 在本阶段不会被伪装成已持久化的撤回决定。",
    });
    expect(() =>
      buildExecutionAuthorizationRequest({
        ...input,
        requestId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toThrow("保持阻塞");
  });

  test("builds the exact one-use authorization request only after every explicit choice and acknowledgement", () => {
    const input = authorizationInput(
      {
        "visual-direction": "B",
        "external-disclosure": "ALLOW",
      },
      {
        externalDisclosure: true,
        forecastOnlyBudget: true,
        oneUseLaunchAndIntegrationWithheld: true,
      },
    );
    const eligibility = executionAuthorizationEligibility(input);

    expect(eligibility).toMatchObject({
      eligible: true,
      state: "ready",
      providerName: "DeepSeek",
      buttonLabel: "签发一次 DeepSeek 运行授权",
      missingDecisionIds: [],
      missingAcknowledgements: [],
    });
    expect(
      buildExecutionAuthorizationRequest({
        ...input,
        requestId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      kind: "execution-authorization",
      requestId: "11111111-1111-4111-8111-111111111111",
      target: {
        projectKey: "registered:appgprj_blog",
        missionId: "principal-workbench-dogfood",
        proposalId: "agent-era-blog-first-supervised-run-v1",
        proposalDigest:
          "58d8e90000000000000000000000000000000000000000000000000000000000",
        expectedStanding: "awaiting-principal-authorization",
      },
      choices: [
        { decisionId: "visual-direction", replyKey: "B" },
        { decisionId: "external-disclosure", replyKey: "ALLOW" },
      ],
      acknowledgements: {
        externalDisclosure: true,
        forecastOnlyBudget: true,
        oneUseLaunchAndIntegrationWithheld: true,
      },
    });
  });

  test("rejects demo, unregistered, stale-standing, missing confirmations, and in-flight contexts", () => {
    const ready = authorizationInput(
      {
        "visual-direction": "B",
        "external-disclosure": "ALLOW",
      },
      {
        externalDisclosure: true,
        forecastOnlyBudget: true,
        oneUseLaunchAndIntegrationWithheld: true,
      },
    );

    expect(
      executionAuthorizationEligibility({ ...ready, source: "stale" }),
    ).toMatchObject({ eligible: false, state: "blocked" });
    expect(
      executionAuthorizationEligibility({
        ...ready,
        project: { ...ready.project, registration: "observed-unregistered" },
      }),
    ).toMatchObject({ eligible: false, state: "blocked" });
    expect(
      executionAuthorizationEligibility({
        ...ready,
        authorization: validAuthorization,
      }),
    ).toMatchObject({ eligible: false, state: "blocked" });
    expect(
      executionAuthorizationEligibility({
        ...ready,
        acknowledgements: {
          ...ready.acknowledgements,
          forecastOnlyBudget: false,
        },
      }),
    ).toMatchObject({
      eligible: false,
      state: "incomplete",
      missingAcknowledgements: ["forecastOnlyBudget"],
    });
    expect(
      executionAuthorizationEligibility({ ...ready, pending: true }),
    ).toMatchObject({ eligible: false, state: "blocked" });
  });

  test("lets the refreshed receipt projection adjudicate uncertain POST outcomes", () => {
    expect(
      executionAuthorizationRefreshVerdict("live", validAuthorization),
    ).toEqual({
      state: "authorized",
      message:
        "实时 receipt projection 只证明回执仍匹配已提交 proposal；runner 未自动启动，runtime 源码将在 adapter 启动前重新哈希校验。",
    });
    expect(
      executionAuthorizationRefreshVerdict("live", awaitingAuthorization),
    ).toEqual({
      state: "unconfirmed",
      message:
        "实时刷新尚未观察到有效 authorization receipt；当前提案仍待授权，请重新审阅后再决定是否签发。",
    });
    expect(
      executionAuthorizationRefreshVerdict("stale", validAuthorization),
    ).toEqual({
      state: "uncertain",
      message:
        "授权提交结果不确定：实时刷新失败，不能从缓存或演示数据判断 receipt 是否存在。恢复实时连接后，以 receipt projection 裁决。",
    });
  });

  test("provides an accessible receipt-only form without a start or integration control", () => {
    const proposalCard = html.match(
      /<section[^>]*id="execution-proposal"[\s\S]*?<\/section>/,
    )?.[0];

    expect(proposalCard).toBeDefined();
    expect(proposalCard).toContain('id="proposal-authorization-form"');
    expect(proposalCard).toContain('id="proposal-authorize-button"');
    expect(proposalCard).toContain('for="ack-external-disclosure"');
    expect(proposalCard).toContain('for="ack-forecast-only-budget"');
    expect(proposalCard).toContain('for="ack-one-use-boundary"');
    expect(proposalCard).toContain('aria-live="polite"');
    expect(proposalCard).toContain("绝不自动启动");
    expect(proposalCard).toContain("不是总 input tokens 或金额上限");
    expect(app).toContain('fetch("/api/execution-authorizations"');
    expect(app).toContain("executionAuthorizationRefreshVerdict(");
    expect(app).not.toContain("授权回执未创建");
    expect(app).not.toContain("提案或 authorization standing 已变化；未创建回执");
    expect(html).not.toMatch(
      /<(?:button|input)[^>]+(?:data-[^=]+|id)="[^"]*(?:start|commit|merge|publish)[^"]*"/i,
    );
  });
});
