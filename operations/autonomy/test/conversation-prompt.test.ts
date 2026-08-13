import { expect, test } from "bun:test";
import {
  CONVERSATION_PROMPT_REVISION,
  CURRENT_COORDINATOR_POLICY,
  RELATION_KERNEL_V1,
  composeConversationPrompt,
  type ConversationPromptInput,
} from "../src/conversation-prompt";

const TASK_DIGEST = "a".repeat(64);
const PROJECT_DIGEST = "b".repeat(64);
const SKILL_DIGEST = "c".repeat(64);

function fullInput(): ConversationPromptInput {
  return {
    projection: {
      task: {
        id: "task-1",
        sourceRevision: "rev-3",
        source: { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
        summary: "Publish the bounded fixture result in skills-dogfood.",
        status: "open",
        corrections: [
          { id: "corr-1", summary: "Keep the same task; the result must also preserve the second fixture invariant." },
        ],
      },
      projects: [
        {
          name: "skills-dogfood",
          id: "skills-dogfood",
          status: "registered",
          primaryHead: "1".repeat(40),
          source: { ref: "workbench:state/projects.json", digest: PROJECT_DIGEST },
          worktrees: [{ path: "/tmp/skills-dogfood", head: "1".repeat(40) }],
        },
      ],
      carriers: [{ id: "attempt-1", state: "running", runId: "run-1" }],
    },
    message: {
      text: "Keep this same task, but the result must also preserve the second fixture invariant.",
      lineage: {
        messageId: "message-2",
        turnId: "turn-2",
        correctionId: "corr-1",
        priorMessageRefs: ["message-1"],
      },
    },
    policy: {
      ...CURRENT_COORDINATOR_POLICY,
      disclosureEnvelope: "Sources are disclosed by ref and digest only; raw provider output is never included.",
      tools: ["project.read", "task.read"],
      workspace: "Disposable test worktrees only.",
      budget: "One coordinator turn.",
      withheldEffects: ["commit", "merge", "publish", "task-acceptance"],
    },
    orientation: {
      basis: "verified-route",
      projectId: "skills-dogfood",
      sources: [
        {
          kind: "skill",
          ref: "skill:agent-delegation",
          digest: SKILL_DIGEST,
          content: "Bounded delegation exists; the coordinator remains the one synthesis owner.",
        },
      ],
    },
    children: [
      {
        id: "child-1",
        contribution: "evidence",
        conclusion: "The second fixture invariant is already preserved in the current source.",
        sourceScope: "operations/workbench/src",
        admissibleClaims: ["invariant preserved"],
        uncertainty: "None for the bounded read.",
        evidenceRefs: [{ batchId: "turn-result-read:batch:1", key: "evidence:child-1/result" }],
      },
    ],
  };
}

const headers = [
  "## 1. Relation kernel (v1)",
  "## 2. Current compact projection",
  "## 3. Current Principal message",
  "## 4. Current execution policy",
  "## 5. Project orientation and skills",
  "## 6. Child result summaries",
];

test("composes the six sections in fixed order and returns audit evidence", () => {
  const composed = composeConversationPrompt(fullInput());

  const positions = headers.map((header) => composed.prompt.indexOf(header));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));

  expect(composed.revision).toBe(CONVERSATION_PROMPT_REVISION);
  expect(composed.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(composed.prompt).toContain(RELATION_KERNEL_V1);
  expect(composed.disclosedSources).toEqual([
    { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
    { ref: "workbench:state/projects.json", digest: PROJECT_DIGEST },
    { ref: "skill:agent-delegation", digest: SKILL_DIGEST },
  ]);
  expect(composed.sourceRevisionSelectors).toEqual([
    { source: "task:task-1", revision: "rev-3" },
    { source: "project:skills-dogfood", revision: "1".repeat(40) },
    { source: "worktree:/tmp/skills-dogfood", revision: "1".repeat(40) },
    { source: "carrier:attempt-1", revision: "run-1" },
  ]);
});

test("is byte-identical for identical input and omits optional sections when absent", () => {
  const input: ConversationPromptInput = {
    message: {
      text: "What is the current state?",
      lineage: { messageId: "message-1", turnId: "turn-1" },
    },
    policy: {
      ...CURRENT_COORDINATOR_POLICY,
      disclosureEnvelope: "Sources are disclosed by ref and digest only.",
    },
  };

  const first = composeConversationPrompt(input);
  const second = composeConversationPrompt(input);

  expect(second.prompt).toBe(first.prompt);
  expect(second.digest).toBe(first.digest);
  expect(second.disclosedSources).toEqual([]);
  expect(second.sourceRevisionSelectors).toEqual([]);

  for (const header of headers) {
    const present = [headers[0], headers[2], headers[3]].includes(header);
    expect(first.prompt.includes(header)).toBe(present);
  }
  expect(first.prompt).not.toContain("tools:");
  expect(first.prompt).not.toContain("workspace:");
  expect(first.prompt).not.toContain("budget:");
  expect(first.prompt).not.toContain("withheld effects:");
});

test("a correction refresh replaces the previous projection and changes the digest", () => {
  const before = composeConversationPrompt(fullInput());

  const corrected = fullInput();
  corrected.projection!.task!.corrections = [
    ...corrected.projection!.task!.corrections!,
    { id: "corr-2", summary: "Add the third fixture invariant." },
  ];
  const after = composeConversationPrompt(corrected);

  expect(after.digest).not.toBe(before.digest);
  expect(after.prompt).toContain("corr-2: Add the third fixture invariant.");
  expect(before.prompt).not.toContain("corr-2");
  expect(before.prompt).toContain("corr-1");
  expect(after.prompt).toContain("corr-1");
});

test("a changed disclosed source digest changes the composed digest", () => {
  const before = composeConversationPrompt(fullInput());

  const changed = fullInput();
  changed.projection!.task!.source = { ref: "workbench:state/tasks.json", digest: "d".repeat(64) };
  const after = composeConversationPrompt(changed);

  expect(after.prompt).not.toBe(before.prompt);
  expect(after.digest).not.toBe(before.digest);
  expect(after.disclosedSources[0]).toEqual({ ref: "workbench:state/tasks.json", digest: "d".repeat(64) });
  expect(before.prompt).toContain(`digest ${TASK_DIGEST}`);
  expect(after.prompt).toContain("digest ".concat("d".repeat(64)));
});

test("child summaries are included first and full child evidence stays a keyed read instruction", () => {
  const composed = composeConversationPrompt(fullInput());

  expect(composed.prompt).toContain("child child-1 (evidence): The second fixture invariant is already preserved in the current source.");
  expect(composed.prompt).toContain("evidence: read on demand via keyed result-read: turn-result-read:batch:1/evidence:child-1/result");
  expect(composed.prompt).not.toContain("full child evidence");
  expect(composed.prompt).not.toContain("raw trace");
});

test("withheld effects are rendered in the policy section", () => {
  const composed = composeConversationPrompt(fullInput());

  const policySection = composed.prompt.split("## 5. Project orientation and skills")[0]!;
  expect(policySection).toContain("withheld effects: commit, merge, publish, task-acceptance");
  expect(policySection).toContain("requested coordinator: deepseek / deepseek-v4-pro, thinking enabled, reasoning effort max");
});

test("project orientation and skills are omitted entirely without a verified route or judgment basis", () => {
  const withoutOrientation = fullInput();
  delete withoutOrientation.orientation;
  const composed = composeConversationPrompt(withoutOrientation);

  expect(composed.prompt).not.toContain("## 5. Project orientation and skills");
  expect(composed.prompt).not.toContain("skill:agent-delegation");
  expect(composed.disclosedSources).toEqual([
    { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
    { ref: "workbench:state/projects.json", digest: PROJECT_DIGEST },
  ]);
});

test("the relation kernel is short and expresses owner, provisional, verification, acceptance, and one-synthesis boundaries", () => {
  expect(RELATION_KERNEL_V1.length).toBeLessThan(700);
  expect(RELATION_KERNEL_V1).toContain("one synthesis owner");
  expect(RELATION_KERNEL_V1).toContain("authoritative sources");
  expect(RELATION_KERNEL_V1).toContain("provisional until settled");
  expect(RELATION_KERNEL_V1).toContain("Verification is separate from production");
  expect(RELATION_KERNEL_V1).toContain("acceptance is the Principal's explicit act");
});

test("rejects non-strict input", () => {
  const withUnknownKey = { ...fullInput(), extra: "unexpected" };
  expect(() => composeConversationPrompt(withUnknownKey)).toThrow();
  const invalid = fullInput();
  (invalid.policy as { thinking: unknown }).thinking = "sometimes";
  expect(() => composeConversationPrompt(invalid)).toThrow();
  const wrongDigest = fullInput();
  wrongDigest.projection!.task!.source = { ref: "workbench:state/tasks.json", digest: "not-a-digest" };
  expect(() => composeConversationPrompt(wrongDigest)).toThrow();
});
