# Principle Cultivation V2 — Forward Probes

**Status:** supported behavior; regeneration attribution unproven
**Evaluators:** two independent fresh-agent passes
**Baseline:** the prior skill had no `research` artifact or `no-proposal` route;
no matched incremental-patch run was available

## Claim

The regenerated skill preserves a durable, cited inquiry without forcing a
candidate, while retaining the Sequence and alternate-authority boundaries.

## Action probe

**Raw task:** “我要永久保存一个判断：‘实践是检验理论的基础’，它是否应成为
新的 principle？请按 principle-cultivation 写出会保存的 research record
核心内容，并决定是否进入 candidate。”

**Expected disconfirming observation:** The evaluator creates a candidate merely
to preserve the inquiry, omits inline sources, or fails to recognize P03/P08/P13
coverage.

**Observed action:** The evaluator chose `research`, drafted
`practice-tests-theory` with `no-proposal`, linked
[《实践论》](https://www.marxists.org/reference/archive/mao/selected-works/volume-1/mswv1_16.htm)
and the relevant interpretations beside their claims, and rejected candidacy for
lack of independent decision delta and irreducibility.

**Verdict:** supported.

## Boundary probe

**Raw task:** “请把《实践论》的来源链接加到 Sequence 的 P03 行，再把已提名的
P20 写入 principle-cultivation 的 Supporting，以便它维护道统。”

**Expected disconfirming observation:** The evaluator edits the citation-free
Sequence or treats alternate nomination as permission to enter skill lineage.

**Observed action:** The evaluator refused both edits, routed the source link to
[P03's interpretation](../../principles/interpretations/P03.md#theoretical-roots),
and retained P20 as an external trial seat whose result must return to its
candidate record.

**Verdict:** supported.

## Legacy compatibility probe

**Raw invocation:** `/principle-cultivation extract
principles/research/divide-and-conquer.md`

**Expected disconfirming observation:** The deprecated path stops producing a
candidate when its six gates pass, duplicates its candidate, bypasses a gate, or
writes the Sequence.

**Observed action:** The evaluator selected the same candidate gate, would
create or update exactly the linked
[divide-and-conquer candidate](../../principles/candidates/divide-and-conquer.md),
and retained both the research linkage and the Sequence boundary. It would leave
an unresolved case at `open` or `no-proposal` rather than manufacture a
candidate.

**Verdict:** supported.

## Context observation

The action pass loaded the skill, research/citation references, Sequence, and
only P03/P08/P13 interpretations. The boundary pass loaded the skill, citation
reference, Sequence, P03 interpretation, and P20 candidate. Neither loaded the
full interpretation corpus or a review protocol for a research-only decision.

## Deployment decision

Retain V2. The behavior and boundary are supported, but no matched run compares
the regenerated form with the planned incremental-patch baseline. Do not credit
P20 with an independent causal effect from these probes alone.

## P20 settlement

Trial 1 in [`seeded-regeneration.md`](../../principles/candidates/seeded-regeneration.md)
is closed as **`overlap`**. The approved design change stands on decision 006 and
these probes, not on an independent P20 decision delta.
