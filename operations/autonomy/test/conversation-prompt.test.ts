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

test("is byte-identical for identical input and always renders the six fixed-order sections with bounded none bodies", () => {
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

  // Every optional section renders its exact header in fixed order with a
  // bounded none standing; no header is ever omitted or reordered.
  const positions = headers.map((header) => first.prompt.indexOf(header));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(first.prompt).toContain("## 2. Current compact projection\n\nnone");
  expect(first.prompt).toContain("## 5. Project orientation and skills\n\nnone");
  expect(first.prompt).toContain("## 6. Child result summaries\n\nnone");
  expect(first.prompt.lastIndexOf("## ")).toBe(first.prompt.indexOf("## 6. Child result summaries"));
  expect(first.prompt).not.toContain("## 7");
  expect(first.prompt).not.toContain("tool:");
  expect(first.prompt).not.toContain("abstention:");
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
  expect(composed.prompt).toContain(
    'evidence: read on demand via keyed result-read: {"batchId":"turn-result-read:batch:1","key":"evidence:child-1/result"}',
  );
  expect(composed.prompt).not.toContain("full child evidence");
  expect(composed.prompt).not.toContain("raw trace");
});

test("full child result evidence renders inside section 6 and never becomes a seventh section", () => {
  const input = fullInput();
  input.fullChildResults = [
    {
      batchId: "batch-1",
      key: "child-1",
      cellId: "cell-1",
      status: "completed",
      projection: "full",
      semantic: { finalText: "The exact bounded child conclusion." },
    },
    {
      batchId: "batch-2",
      key: "child-2",
      cellId: "cell-2",
      status: "completed",
      projection: "metadata-only",
      omission: { reason: "semantic payload exceeds the bounded read", maxBytes: 64_000 },
    },
  ];
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).not.toContain("## 7");
  expect(composed.prompt).toContain("## 6. Child result summaries");
  expect(composed.prompt).toContain(
    "full child result batch-1/child-1 (cell cell-1, status completed, projection full)",
  );
  expect(composed.prompt).toContain("final text: The exact bounded child conclusion.");
  expect(composed.prompt).toContain("omitted (semantic payload exceeds the bounded read, max 64000 bytes): do not guess the content");
  // The keyed full evidence stays inside section 6 and nothing renders after it.
  const sectionSix = composed.prompt.indexOf("## 6. Child result summaries");
  const firstFull = composed.prompt.indexOf("full child result batch-1/child-1");
  expect(firstFull).toBeGreaterThan(sectionSix);
  expect(composed.prompt.lastIndexOf("## ")).toBe(sectionSix);
});

test("withheld effects are rendered in the policy section", () => {
  const composed = composeConversationPrompt(fullInput());

  const policySection = composed.prompt.split("## 5. Project orientation and skills")[0]!;
  expect(policySection).toContain("withheld effects: commit, merge, publish, task-acceptance");
  expect(policySection).toContain("requested coordinator: deepseek / deepseek-v4-pro, thinking enabled, reasoning effort max");
});

test("a missing orientation renders the fixed section with a bounded none standing", () => {
  const withoutOrientation = fullInput();
  delete withoutOrientation.orientation;
  const composed = composeConversationPrompt(withoutOrientation);

  expect(composed.prompt).toContain("## 5. Project orientation and skills\n\nnone");
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

test("the policy section integrates available tool meaning, abstention, and unavailable tools with no seventh section", () => {
  const input = fullInput();
  input.policy = {
    ...input.policy,
    tools: [
      {
        name: "task_create",
        availability: "available",
        meaning: "Form one new local obligation; copy the exact registered project ID, primary head, Worktree path, and Worktree head from the projection.",
      },
      {
        name: "task_correct",
        availability: "available",
        meaning: "Change a constraint of the still-active Task; copy the exact current taskId, sourceRevision, and revision.",
      },
      { name: "task_continue", availability: "unavailable", meaning: "Not yet available; report instead of calling." },
      { name: "work_control", availability: "unavailable", meaning: "Not yet available; report instead of calling." },
    ],
    abstention: "At most one operation per message; on ambiguity, abstain and ask. Never route by keyword or fixed phrase.",
  };
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).not.toContain("## 7");
  const policySection = composed.prompt.split("## 5. Project orientation and skills")[0]!;
  expect(policySection).toContain("## 4. Current execution policy");
  expect(policySection).toContain("tool task_create [available]:");
  expect(policySection).toContain("exact registered project ID");
  expect(policySection).toContain("tool task_correct [available]:");
  expect(policySection).toContain("exact current taskId, sourceRevision, and revision");
  expect(policySection).toContain("tool task_continue [unavailable]:");
  expect(policySection).toContain("tool work_control [unavailable]:");
  expect(policySection).toContain("abstention: At most one operation per message");
  expect(policySection).toContain("Never route by keyword or fixed phrase");
});

test("plain tool capability names remain valid policy tools", () => {
  const input = fullInput();
  input.policy = { ...input.policy, tools: ["project.read", "task.read"] };
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).toContain("tool: project.read");
  expect(composed.prompt).toContain("tool: task.read");
  expect(composed.prompt).not.toContain("## 7");
});

test("the task projection renders the exact numeric revision a correction must copy", () => {
  const composed = composeConversationPrompt({
    ...fullInput(),
    projection: {
      task: {
        id: "task-1",
        sourceRevision: "3",
        revision: 2,
        summary: "Publish the bounded fixture result.",
        status: "open",
      },
    },
  });

  expect(composed.prompt).toContain("task revision: 2");
  expect(composed.prompt).toContain("source revision: 3");
  expect(composed.sourceRevisionSelectors).toContainEqual({ source: "task:task-1", revision: "3" });
});

test("the bounded task card set renders with its completeness standing and per-card selectors", () => {
  const input = fullInput();
  input.projection!.taskCards = [
    {
      id: "task-a1",
      sourceRevision: "7",
      revision: 2,
      source: { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
      summary: "Keep the first fixture invariant in skills-dogfood.",
      status: "open",
      projectId: "skills-dogfood",
      primaryHead: "1".repeat(40),
      worktreePath: "/tmp/skills-dogfood",
      worktreeHead: "1".repeat(40),
    },
    {
      id: "task-b1",
      sourceRevision: "7",
      revision: 1,
      source: { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
      summary: "Build the worker fixture in worker-dogfood.",
      status: "open",
      projectId: "worker-dogfood",
    },
  ];
  input.projection!.taskCardStanding = { state: "complete", cap: 8, disclosed: 2, known: 2 };

  const composed = composeConversationPrompt(input);

  expect(composed.prompt).toContain("task card standing: state=complete cap=8 disclosed=2 known=2");
  expect(composed.prompt).toContain("task card task-a1 [open] project skills-dogfood: Keep the first fixture invariant in skills-dogfood.");
  expect(composed.prompt).toContain("task card task-b1 [open] project worker-dogfood: Build the worker fixture in worker-dogfood.");
  expect(composed.prompt).toContain(`source workbench:state/tasks.json @ 7 (digest ${TASK_DIGEST})`);
  expect(composed.prompt).toContain("task revision: 2");
  expect(composed.prompt).toContain(
    "execution selection: registered project skills-dogfood @ primary "
    + `${"1".repeat(40)} in bound worktree /tmp/skills-dogfood @ ${"1".repeat(40)}`,
  );
  // A card without canonical selectors discloses its project identity but never a guessed execution route.
  expect(composed.prompt).not.toContain("registered project worker-dogfood @ primary");
  // Every disclosed Task carries its exact source revision selector.
  expect(composed.sourceRevisionSelectors).toContainEqual({ source: "task:task-a1", revision: "7" });
  expect(composed.sourceRevisionSelectors).toContainEqual({ source: "task:task-b1", revision: "7" });
  expect(composed.sourceRevisionSelectors).toContainEqual({ source: "task-project:task-a1", revision: "1".repeat(40) });
  expect(composed.sourceRevisionSelectors).toContainEqual({ source: "task-worktree:task-a1", revision: "1".repeat(40) });
});

test("a partial standing renders its reason and never reads omission as Task absence", () => {
  const input = fullInput();
  input.projection = {
    taskCardStanding: {
      state: "partial",
      reason: "the bounded card cap omits 2 further conversation-attributed Task(s)",
      cap: 8,
      disclosed: 8,
      known: 10,
      omitted: 2,
    },
  };
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).toContain(
    "task card standing: state=partial reason=the bounded card cap omits 2 further "
    + "conversation-attributed Task(s) cap=8 disclosed=8 known=10 omitted=2",
  );
  expect(composed.prompt).not.toContain("has no Task");
  expect(composed.prompt).not.toContain("no tasks exist");
});

test("an omitted standing renders explicitly inside section 2 instead of a bare none", () => {
  const input = fullInput();
  input.projection = {
    taskCardStanding: {
      state: "omitted",
      reason: "the conversation has no settled Task action lineage",
      disclosed: 0,
    },
  };
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).toContain(
    "## 2. Current compact projection\n\n"
    + "task card standing: state=omitted reason=the conversation has no settled Task action lineage disclosed=0",
  );
  expect(composed.prompt).not.toContain("## 2. Current compact projection\n\nnone");
  expect(composed.prompt.lastIndexOf("## ")).toBe(composed.prompt.indexOf("## 6. Child result summaries"));
});

test("an unavailable standing states the unreadable source instead of absence", () => {
  const input = fullInput();
  input.projection = {
    taskCardStanding: {
      state: "unavailable",
      reason: "the canonical Task source cannot be read; the conversation-attributed Tasks are not projected",
      known: 3,
    },
  };
  const composed = composeConversationPrompt(input);

  expect(composed.prompt).toContain("task card standing: state=unavailable reason=the canonical Task source cannot be read");
  expect(composed.prompt).toContain("known=3");
  expect(composed.prompt).not.toContain("no Task exists");
});
