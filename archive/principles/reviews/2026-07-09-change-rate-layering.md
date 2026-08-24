# Principle Review Team — Change-Rate Layering

**Status:** complete
**Type:** addition
**Sequence snapshot:** P01–P16 on 2026-07-09
**Authority:** evidence only; human decides sequence changes

## Scope and default

Review the proposed addition
`P19｜按变化率分层，使依赖指向更稳定者｜速度层 / 信息隐藏`.
The default is to retain P01–P16 unless the proposal supplies one irreducible,
cross-context decision rule rather than joining related local mechanisms.

## Team formation

- **Lead P09:** the candidate's change-rate layering most directly collides with
  the existing stable / activated / on-demand attention layers.
- **Standing liaison P04 (self-reviewed):** tests whether the slow-changing
  skeleton is merely another name for the principal contradiction and whether
  the candidate adds a durable structural decision.
- **Comparator P14:** separates dependency and stability from source/projection
  fact authority.
- **Preservation P15:** makes the strongest case that the candidate has not
  earned permanent attention beyond existing principles and local design rules.

## Team-member reports

### P09

- **Verdict:** boundary issue.
- **Decision delta:** P09 already decides where stable orientation and volatile
  detail enter attention. Module boundaries and dependency-graph direction would
  be additional decisions, but the proposed line does not show that they are one
  decision.
- **Overlap:** slow-/fast-loop artifact placement is a direct P09 expression.
  Parnas's boundary criterion and Martin's dependency rule are not consequences
  of P09 and cannot be added to its interpretation.
- **Boundary:** Parnas treats information-hiding decomposition and dependency
  hierarchy as separate properties. Martin explicitly distinguishes stability
  from frequency of change. Brand's pace layers support asymmetric rates and
  feedback, not a universal dependency arrow.
- **Unchanged alternative:** retain P09 for attention and artifact allocation;
  incubate information-hiding and dependency-direction proposals separately
  only if each shows a cross-context decision delta.
- **Evidence:** `principles/interpretations/P09.md:15-26`;
  `agent-worker/skills/attention-driven/references/artifact-policy.md:8-21,113-116,161-165`;
  Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules*;
  Brand, *Pace Layering*; Martin, *Design Principles and Design Patterns*,
  pp. 21-24.

### P04

- **Verdict:** boundary issue.
- **Decision delta:** P04 identifies the tension that currently governs the
  situation; it does not decide how to contain independently anticipated changes
  across a durable architecture.
- **Overlap:** the principal contradiction may be slow and load-bearing, but it
  may also be an urgent fast-changing failure. "Principal" and "stable" are not
  equivalent.
- **Boundary:** importance, observed change frequency, expected change, and
  coordination cost are separate measures. None alone establishes dependency
  direction or fact authority.
- **Unchanged alternative:** P04, P09, and P15 can identify the current
  load-bearing tension, place its information, and avoid gratuitous structure.
  A new entry is justified only for the narrower recurring boundary decision
  those principles cannot make.
- **Evidence:** `principles/interpretations/P04.md`;
  `agent-worker/skills/attention-driven/references/artifact-policy.md:8-21`;
  `sikong/design/philosophy/development-philosophy.md:187-205`.

### P14

- **Verdict:** boundary issue.
- **Decision delta:** a stable contract or dependency inversion can protect a
  slow consumer from a volatile implementation, but this cannot be inferred
  from change frequency alone.
- **Overlap:** P14 does not govern module dependency direction. It does establish
  a hard boundary: stability never grants fact authority; reconstructibility and
  named source ownership do.
- **Boundary:** a rapidly appended event stream can remain the source while a
  slower view remains its projection. Parnas's module boundary, Brand's
  cross-layer feedback, and Martin's package stability are related but distinct.
- **Unchanged alternative:** retain P14 for source/projection authority and the
  existing slow-/fast-loop policy for evidence promotion; do not admit the
  compound line.
- **Evidence:** `principles/interpretations/P14.md:15-27`;
  `agent-worker/design/DESIGN.md`; Parnas, Brand, and Martin as above.

### P15

- **Verdict:** insufficient evidence; retain P01–P16.
- **Decision delta:** no single Sequence-level choice has been shown. The
  candidate joins artifact update rate, module information hiding, and package
  dependency metrics.
- **Overlap:** P09 already owns the artifact/context part; P15 requires every
  added distinction to preserve a named response or hard constraint that the
  smaller structure cannot preserve.
- **Boundary:** a long-unchanged package need not be stable in Martin's sense,
  and pace layers do not imply that every relationship points one way.
- **Unchanged alternative:** keep slow-/fast-loop practice under P09 and use
  Parnas or Martin locally in a design decision until repeated failures expose
  an irreducible general principle.
- **Evidence:** `principles/interpretations/P09.md`;
  `principles/interpretations/P15.md`;
  `agent-worker/skills/attention-driven/references/artifact-policy.md:3-21,113-116,161-165`;
  Parnas, Brand, and Martin as above.

## Synthesis

The reports are not counted as votes. They independently expose the same broken
inference: observed or expected change rate, information-hiding boundaries, and
dependency stability are not one measure and do not imply one another.

The attention-driven evidence survives as a P09 interpretation and expression:
fast-loop observations may inform a slow layer but should not rewrite it without
repeated evidence. It does not justify the original P19.

One narrower candidate remains decision-changing and compact enough to review:

`P19｜围绕预期变化划定边界｜信息隐藏`

It would decide where project, product, or workflow architecture contains a
likely change without claiming that change frequency grants authority or fully
determines static dependency direction. This revised line remains pending human
approval; the Sequence is unchanged.

## Human decision

pending — original cultivation authorized; revised line requires explicit
approval.
