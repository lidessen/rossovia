# Work Cell orchestration independent review

**Date:** 2026-07-15

**Disposition:** ready after correction review

**Authority:** independent model reports are review evidence; human acceptance remains external

## Scope

Review the staged orchestration kernel, open queue, Swarm projection, AI SDK 7
migration, and terminal-contract repair before the checkpoint commit. The final
review used one read-only Work Cell with a caller-defined `submit_review` tool;
the tool payload, not a later free-text narration, was the review record.

## What the review process exposed

The review harness itself failed before it produced trustworthy code findings:

| Run | Model / contract | Result | Total tokens | Observation |
|---|---|---:|---:|---|
| `a8a5a511-92bf-4fc6-8674-8ccf5afadfb3` | DeepSeek V4 Flash + `outputSchema` | failed | 592,821 | 5,765 final-output tokens could not be parsed; the conclusion was discarded. |
| `292543f0-0302-40cf-b1e4-ada524f68b10` | DeepSeek V4 Flash + plain text | failed | 273,477 | all eight steps became tool calls; no final output was produced. |
| `a9e513bf-e451-431b-a66f-beeaae7ecaa5` | DeepSeek V4 Flash + terminal tool | mechanically passed | 309,841 | recovery submitted “review incomplete,” then a later free-text step fabricated findings against nonexistent files. |
| `77b7b09f-82d0-4bc3-a814-0fb9513d7f19` | repaired terminal contract + DeepSeek V4 Flash | mechanically passed | 191,000 | terminal payload was authoritative, but findings still contradicted files the reviewer had read. |
| `7b4e5a05-8c86-47cc-9050-1203a928a5db` | Claude Sonnet 5 + nested terminal schema | failed | 298,025 | source analysis improved, but the provider serialized nested findings into one string and failed tool validation. |
| `40309102-c8f3-40fe-a37d-115a69739384` | Claude Sonnet 5 + `verdict` / `report` | changes required | 219,840 | valid review found one evidence-retention gap and one missing deterministic test. |
| `420cdac1-10da-4078-822f-0537a37c759d` | focused Claude Sonnet 5 correction review | ready | 70,235 | both corrections were read, the focused suite ran, and the primary loop submitted without recovery. |

Across all seven attempts, cumulative usage was 1,917,710 input tokens and
37,529 output tokens; 1,028,096 input tokens were reported as cache reads. This
does not mean a two-million-token context was ever present at once: the runtime
adds the repeated input of every agent step. It does mean the original 30,000
token estimate was not calibrated to iterative review and should be audited as
an estimate miss rather than turned into a low hard limit.

The stronger-model runs used `anthropic/claude-sonnet-5` through AI SDK 7's
Gateway provider. [Vercel describes the model as suited to agentic coding and
review](https://vercel.com/changelog/claude-sonnet-5-ai-gateway); the temporary
runner and raw records remain ignored local evidence rather than public runtime
configuration.

## Finding dispositions

### Corrected — fatal source violation hid partial evidence

The kernel correctly fails closed when a `WorkSource` returns one live lease
twice; manufacturing a second settlement would be false. The thrown error,
however, previously carried no settlements or events after sibling attempts
were drained. [`OrchestrationRunError`](../../packages/work-cell/src/orchestration.ts)
now retains those observations, and the focused test proves that one sibling
settlement plus `orchestration.failed` survive the fatal boundary.

### Corrected — simultaneous terminal and structured-output path lacked a direct probe

AI SDK 7 documents that the tool loop naturally ends when the model returns a
non-tool-call finish, but the main-loop `terminalTools + outputSchema` path was
only indirectly exercised. The new deterministic probe calls the terminal tool,
returns structured output on the next step, throws on any third call, and
asserts no recovery event.

### Rejected — queue abort/delivery race

One intermediate report proposed that an abort handler could interleave between
`waiters.shift()` and synchronous `deliver()`. JavaScript execution cannot
interleave an abort callback inside that no-`await` region: either abort removes
the waiter first, or delivery removes the listener and resolves first. A useful
boundary test was still added: cancellation of an empty open queue removes its
waiter, and a later submission remains pending rather than becoming a leaked
lease.

### Accepted residual — hostile filesystem mutation after admission

The shared-root guard records `realpath` at admission. A hostile local process
could mutate filesystem topology afterward, but the actual Workspace read/write
boundary still checks containment and symlinks per operation. Durable or remote
carriers must reassess this threat; it does not justify broadening the current
in-process slice.

## Final evidence

- Full TypeScript checking passed.
- The package suite passed 77 tests and 339 assertions.
- `git diff --check` passed.
- The focused independent correction review ran
  `bun test test/orchestration.test.ts test/ai-sdk-driver.test.ts`: 12 tests,
  58 assertions, no failures.
- Final reviewer verdict: `ready`; no recovery loop was used.

The review supports committing this checkpoint. It does not establish durable
queue recovery, remote lease semantics, hostile-filesystem resistance, or
provider-independent production configuration.
