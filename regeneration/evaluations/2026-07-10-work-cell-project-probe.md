# Work Cell — Project-first Probe Validation

**Status:** accepted interaction slice
**Date:** 2026-07-10
**Runtime:** independent [`packages/work-cell`](../../packages/work-cell/README.md),
AI SDK / `deepseek-v4-flash`

## Claim

The [project-first interaction decision](../../design/decisions/008-project-first-work-cell-interaction.md)
lets a practitioner ask one bounded, Sequence-aware, read-only project question
without authoring an internal `CellInput` JSON object, while leaving the exact
core contract and human acceptance boundary intact.

## Practice and revisions

Three initial dogfood attempts used the prior exact interface to inspect the
Work Cell itself. All expressed the same practical contradiction: the runtime
contract was available but not an actionable human entry point. Two attempts
exhausted 90k and then 200k token budgets after listing historical
`.work-cell` material or accumulating repeated source context. A later probe
correctly reasoned about the projection boundary but submitted seven unavailable
checks in a no-command workspace, and was therefore settled as
`verification_failed`.

Those failures changed the implementation rather than being discarded:

- [`Workspace`](../../packages/work-cell/src/workspace.ts) now excludes named
  generated/dependency paths during listing and direct access. A read-only,
  command-free cell skips snapshots; a command-capable cell retains a full
  non-excluded diff surface because commands can have side effects.
- [`project.ts`](../../packages/work-cell/src/adapters/sequence/project.ts) discovers the host
  Sequence, lowers explicit intent and acceptance into the existing contract,
  grants no writes or commands, and persists the full record.
- [`presentation.ts`](../../packages/work-cell/src/adapters/sequence/presentation.ts) renders the
  selected P-IDs, principal contradiction, and each decision contribution with
  artifact, evidence, verification, cost, and record location. It is a
  rebuildable projection of the raw record.
- [`ai-sdk-driver.ts`](../../packages/work-cell/src/ai-sdk-driver.ts) makes
  non-empty check plans structurally invalid when command authority is absent,
  rather than relying on prompt compliance.

## Accepted live runs

The first successful project probe started from `packages/work-cell`, discovered
the repository Sequence, inspected the new interaction surface, and passed with
P04 + P05/P09/P15. It retained an empty check plan, used 146,433 tokens, and
estimated cost at $0.003173. It identified one residual friction: a summary
showed selected P-IDs but not the reasoning for their selection.

That feedback added the principal-contradiction and per-P-ID decision lines to
the projection. The final live probe then passed with P14 + P13/P08, used
242,635 tokens, and estimated cost at $0.004262. It established that the reason
chain remains a projection: the persisted `CellRunRecord` is the evidence
source, `review` rebuilds the summary from it, acceptance is still human-supplied,
and the Cell receives neither write nor semantic acceptance authority.

The complete local traces and records remain intentionally ignored under the
repository's `.work-cell/runs/` directory because they can contain full project
content. The accepted final record is:

`0be1d149-8979-4a1c-ba7f-3535e25ff833`

## Decision

- Adopt `probe` and `review` as the project-facing read-only interaction slice.
- Retain `run <cell.json>` and `experiment <spec.json>` as exact portable
  interfaces; do not turn the convenience shell into a second core contract.
- Do not add a task board, scheduler, persistent project state, inferred
  acceptance, or write-capable probe in this slice.

## Limits and next evidence

- This validates one Sequence-bearing TypeScript repository; discovery remains
  a convention adapter, not a universal project assumption.
- The final probe approached its 250k budget on a source-reading task. Future
  work should measure bounded context packaging or summarization only after
  repeated probe evidence shows that token pressure is the leading contradiction.
- The summary makes existing gene-expression reasoning reviewable; it does not
  independently verify the model's principle selection or accept semantic truth.
