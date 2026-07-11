# Candidate — Change-Rate Layering

**Status:** candidate — revision requested
**Observed in:** agent-worker, Sikong, skills architecture, modularity theory

## Candidate sequence line

P19｜按变化率分层，使依赖指向更稳定者｜速度层 / 信息隐藏

## Recurrence

- `agent-worker/skills/attention-driven/references/artifact-policy.md:8-21`
  separates a costly, slow-changing structural skeleton from flexible detail;
  lines 113-116 require repeated evidence before fast-loop observations rewrite
  slow-loop state.
- `agent-worker/design/DESIGN.md:18-29` separates a durable semantic event stream
  from ephemeral worker conversations and prevents raw fast-loop conversation
  from flowing upward as durable state.
- `sikong/design/philosophy/prompt-guidance.md:29-49,72-76` separates operation,
  task, session, and design context by lifetime and keeps volatile execution
  detail out of durable design.
- Parnas's information-hiding criterion forms module boundaries around difficult
  or likely-to-change design decisions. Brand's pace layers distinguish fast
  learning from slow continuity. Martin's Stable Dependencies Principle governs
  package dependency direction using dependency responsibility and change cost.

## Decision consequence

The original candidate would separate elements that change at materially
different rates and make the faster side depend on a stable contract rather
than forcing the slower side to know volatile implementation detail.

The review found that this sentence hides three decisions with different
measures: where attention and artifacts live, where an anticipated change is
contained, and how package stability determines static dependency direction.
The current line therefore does not yet provide one reliable decision rule.

## Existing-sequence check

P09 already governs the attention and artifact consequence: stable orientation
stays present while volatile detail is loaded or promoted only when needed. P14
governs fact authority independently of stability. P15 rejects a new distinction
that cannot show a separate necessary decision.

The still-plausible irreducible remainder is Parnas's boundary criterion, not
the original compound line:

`P19｜围绕预期变化划定边界｜信息隐藏`

This repair is a new proposed line and requires explicit human approval.

## Counterexample / boundary

- Change frequency does not establish fact authority, importance, or dependency
  stability.
- Runtime calls and data flow may move from a slow layer to a fast layer; the
  Stable Dependencies Principle concerns static knowledge and change cost.
- A fast-changing source may remain authoritative while a slow-changing view is
  only its projection.
- Security, consistency, transaction, and authority boundaries may require a
  separation even when change rates are equal.

## Expression probes

- Project architecture: hide a volatile provider or runtime decision behind a
  contract so the stable domain boundary need not change with each provider.
- Product or workflow architecture: keep a stable value, authority, and
  acceptance spine independent of experiments and local execution tactics.

## Committee review

See [`2026-07-09-change-rate-layering.md`](../reviews/2026-07-09-change-rate-layering.md).

## Human decision

pending — the human authorized cultivation of the original proposal on
2026-07-09; the review found that exact line compound and recommends the narrower
replacement above before adoption.
