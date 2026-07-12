# Work Cell Contract Convergence — Independent AI Review Packet

**Status:** reviewed — Principal commit/push/merge decision pending
**Date:** 2026-07-12
**Authority:** [decision 023](../../decisions/023-ai-review-evidence-and-principal-confirmation.md)
**Scope:** the current uncommitted Work Cell contract convergence and the
intervention-reconciliation advisory binding

## Reviewed claim

The checkpoint claims that caller-defined terminal tools, structured final
output, and required artifacts are independent contracts; that legacy
`submit_result` and compatibility/tree paths are gone; and that the correction
binding is an advisory projection rather than a new authority.

## Independent review evidence

A read-only Work Cell used `deepseek-v4-flash` to inspect the current source
snapshot. It had no write or command capability and could only return a report
through its caller-defined `finish_probe` tool. The retained local run record is
`.work-cell/runs/2026-07-12T13-26-52-640Z-probe-independently-review-the-current-uncommitt-1b6b8997-b48c-42da-8b55-7c004565184a.json`.

| Evidence | Result |
|---|---|
| Independent Work Cell disposition | `passed`; `finish_probe` called; recommendation: **merge** |
| Observed review use | 428,192 total tokens; estimated $0.02123887 at the driver price revision |
| Package verification | `bun run typecheck` and `bun test`: 27 pass, 0 fail |
| Binding verification | `python3 scripts/test-intervention-reconciliation.py`: 2 pass; `.codex/hooks.json` parses as JSON |
| Repository hygiene | `git diff --check`: passed |

The raw trace is intentionally ignored because it contains full model context.
This packet retains the review scope, disposition, observed use, deterministic
results, and the source paths needed to reopen the claims.

## Findings and disposition

| Finding | Evidence | Disposition |
|---|---|---|
| The three completion conditions are independent. | [contract shape](../../../packages/work-cell/src/contracts.ts), [runtime settlement](../../../packages/work-cell/src/run-cell.ts), and [driver registration](../../../packages/work-cell/src/ai-sdk-driver.ts) keep terminal invocation, output validation, and artifact verification distinct. | confirmed |
| A terminal invocation previously could end the SDK loop without a final report. | A first live review reached `finish_probe` but failed with `No output generated`; the trace also exposed lost failure usage. The driver now reserves a final output step and reports observed usage through [`CellExecutionError`](../../../packages/work-cell/src/driver.ts). | corrected and live-retried |
| The repaired terminal path is covered by both a live read-only review and deterministic regressions. | [terminal-step regression](../../../packages/work-cell/test/work-cell.test.ts) rejects an impossible one-step terminal contract; the live retry completed after terminal invocation. | confirmed |
| Failure-path usage must survive an adapter failure. | [failure-usage regression](../../../packages/work-cell/test/work-cell.test.ts) verifies selection usage plus execution usage are retained after `CellExecutionError`. | confirmed |
| Natural terminal recovery must not depend on provider metadata or a final text response. | [driver recovery regression](../../../packages/work-cell/test/ai-sdk-driver.test.ts) drives gene expression, natural finish without a terminal call, terminal recovery, and an empty final provider response through the actual AI SDK adapter. | confirmed |
| The correction binding is advisory only. | [decision 024](../../decisions/024-platform-neutral-intervention-reconciliation.md), [Codex projection](../../../.codex/hooks.json), and [local binding guide](../../../.codex/README.md) state shadow/assist only and retain no prompt text. | confirmed |

## Residual uncertainty

- A real provider's naturally finishing path has not been deliberately forced
  after the recovery repair. The adapter-level mock covers that shape; the
  live provider has revalidated normal terminal settlement. Reopen if a live
  provider produces a recovery trace that disagrees with the retained test.
- The Codex project hook has deterministic adapter coverage only. A fresh,
  trusted interactive Codex session must still run the acceptance steps in
  [the binding guide](../../../.codex/README.md) before any stronger lifecycle
  guarantee is claimed.
- The independent reviewer did not receive Git diff access. Its conclusion is
  a current-source review, supplemented by this packet's stated scope and
  deterministic current-head checks; it is not evidence that no unrelated
  changed file exists.

## Principal Decision Brief

**Recommendation: commit this reviewed checkpoint, push it to the founding
baseline PR, then review the normal AI packet before deciding whether to merge.**
No agent may perform those durable actions from this recommendation alone.

| Reply | Immediate consequence | Tradeoff / reopening signal |
|---|---|---|
| `commit` | create one checkpoint commit on `founding/regenerated-baseline`; no push or merge | a later PR review may still return it |
| `push` | push the reviewed commit and refresh remote CI | exposes the current checkpoint for external review |
| `merge` | only after current-head CI and your confirmation | accepts the stated residual uncertainties |
| `return <topic>` | keep the branch open for the named correction | delays the integration gate but preserves the review record |
