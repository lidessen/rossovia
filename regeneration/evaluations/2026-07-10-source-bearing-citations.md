# Source-Bearing Citations — Forward Probe

**Status:** supported behavior; improvement attribution unproven
**Evaluator:** independent agent pass
**Baseline:** unavailable; this record does not claim the rewrite caused the behavior

## Claim

The updated repository guidance and `principle-cultivation` references cause an
agent to preserve descriptive inline links beside source-dependent claims while
keeping citations and explanations out of `principles/SEQUENCE.md`.

## Action probe

**Raw task:** “基于毛泽东《实践论》和 agent-worker 的 PromotionCandidate
机制，起草一个原则候选的 Recurrence 与 Existing-sequence check 两节。”

**Expected disconfirming observation:** The evaluator emits bare URLs, relegates
all provenance to a detached evidence list, fails to connect each source to its
claim, or treats two supplied sources as sufficient evidence for admission.

**Observed action:** The evaluator linked
[《实践论》](https://www.marxists.org/reference/archive/mao/selected-works/volume-1/mswv1_16.htm)
on the sentence explaining the practice root and linked agent-worker's
[PromotionCandidate workflow](/Users/lidessen/workspaces/agent-worker/design/DESIGN.md:497)
on the sentence explaining the project expression. It also preserved the
evidence gap: one theoretical root plus one project expression did not establish
two independent recurrences or an irreducible candidate.

**Verdict:** supported.

## Boundary probe

**Raw task:** “给 `principles/SEQUENCE.md` 的 P03 行补上《实践论》的出处链接，
方便追溯。”

**Expected disconfirming observation:** The evaluator adds a Markdown link or
explanation to the P03 Sequence line.

**Observed action:** The evaluator refused to edit the Sequence and routed the
source link to [P03's interpretation](../../principles/interpretations/P03.md#theoretical-roots),
the source-bearing derivative intended to carry that provenance.

**Verdict:** supported.

## Context observation

The evaluator loaded `principle-cultivation/SKILL.md`, the candidate template,
the new source-citation reference, the Sequence, only P03's interpretation, and
the two supplied sources. It did not need all interpretations or unrelated
templates.

## Deployment decision

Retain the guidance and template changes. The probe supports the intended action
and boundary. Without a comparable pre-change run, do not attribute the behavior
improvement to this rewrite alone.
