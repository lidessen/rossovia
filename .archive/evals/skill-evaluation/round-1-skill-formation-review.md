# Round 1 independent semantic review

## Review boundary

This review compares only F1 in the frozen fixture with the F1 section of the
no-target-skill baseline and the `skill-formation` treatment. The reviewer was
not the skill author or either runner. The governing sources are
[`protocol.md`](protocol.md), [`fixtures/round-1.md`](fixtures/round-1.md),
[`round-0-baseline.md`](round-0-baseline.md), and
[`round-1-skill-formation-treatment.md`](round-1-skill-formation-treatment.md).

The treatment's additional detail is not itself evidence of improvement. Its
admission section is roughly twice the length of baseline F1, while both make
the same four ownership decisions. The comparison below therefore treats
explicit detail as useful only when it changes or repairs a required relation.

## Verdict

- **Source and task fidelity:** **yes**, with one minor precision issue. Both
  outputs preserve the packet's four observations and requested decisions. The
  treatment says "six observations" once where the fixture says six research
  tasks; the surrounding text correctly describes the six tasks, and the slip
  does not change an owner or authority claim.
- **Owner and refusal boundary:** **yes** for both outputs. Both admit only the
  repeated source-selection judgment as a candidate skill and transfer the API
  catalogue, repository-wide push rule, and restart-safe writer invariant to
  reference, project-local instruction, and tool/runtime respectively.
- **Matched improvement:** **no**. The treatment does not change the core
  judgment or action relative to baseline, and the trial is not isolated well
  enough for causal attribution: the baseline runner answered all eight
  fixtures from the frozen source set, whereas the treatment runner answered
  only F1 and reports using the skill's living theory sources. Protocol lines
  22--25 require the task and raw sources to remain fixed with only the
  candidate skill added.
- **Strongest evidence level:** **`boundary-supported`** for the observed F1
  treatment, not `matched-improvement`. An independent review can confirm the
  positive and nearest-owner decisions, but it cannot attribute them to the
  skill.
- **Design disposition:** **`no-proposal`**. F1 shows no major design defect
  that warrants rewriting `skill-formation`, but it also supplies no evidence
  that the skill improves on the already-correct baseline. Keep the current
  candidate unchanged pending a properly matched and more discriminating
  probe; do not accept either the treatment runner's retain suggestion or its
  speculative bookkeeping rewrite from this result alone.

## Relation grading

| Relation | Baseline | Treatment | Strongest evidence |
|---|---|---|---|
| Source claims are traceable and no load-bearing connective claim is invented | yes | yes | Both recover the four packet facts. Treatment's "six observations" wording is imprecise but non-load-bearing; its additional enforcement alternatives are conditional rather than asserted facts. |
| Object and desired change survive | yes | yes | Both identify conditional, decision-relevant source selection with source authority preserved. |
| Constraints and authority survive | yes | yes | Neither gives the candidate skill authority over source facts, repository-wide policy, acceptance, concurrency, or restart-safe effects. |
| Correct owner is chosen | yes | yes | The owner sequence is identical: candidate skill, reference, project-local instruction, tool/runtime. |
| Neighboring forms are refused | yes | yes | Both give a no-new-form exit for every observation. Treatment names more neighboring cases, but does not correct a baseline ownership error. |
| Required F1 meaning is complete | yes | yes | Each observation receives a choice, owned relation, no-new-form case, and evidence need. |
| Completeness under brevity pressure | uncertain | uncertain | F1 contains no brevity-pressure manipulation, so this relation is not tested by either run. |
| Intended judgment or action changes relative to baseline | n/a | no | Treatment reaches the same four decisions and materially the same evidence threshold. Its separate discovery/action probe and explicit unknown ledger are useful refinements, not a changed admission judgment. |
| Response is proportional to frequency, consequence, evidence, and cost | yes | yes | Both distinguish one repeatable method gap from one conditional reference, one always-present instruction, and one hard runtime property. Treatment avoids structural escalation; its extra self-review is qualified as a candidate rather than an accepted change. |
| Material unknowns remain explicit | uncertain | yes | Baseline uses conditional no-new-form cases but does not consolidate transfer breadth or existing enforcement as unknowns. Treatment explicitly leaves model/harness transfer, provider availability, branch protection, runtime enforcement, and candidate net benefit unresolved. |
| Another reader can reconstruct the result from the named source | yes | yes | The fixture and protocol are named, and each decision is connected to its packet observation. |

## Comparative findings

The treatment has two observable local gains: it separates skill discovery from
already-loaded action in the proposed evidence plan, as the protocol requires,
and it more clearly separates evidence admitting a future source-selection
candidate from evidence that either that future skill or `skill-formation`
improves behavior. It also makes unknowns easier to audit.

Those gains do not establish `matched-improvement`. Baseline F1 already makes
the correct ownership and refusal decisions, including the hard distinction
between prompt guidance and restart-safe runtime enforcement. The treatment's
additional rationale mostly explicates decisions that were already present.
Counting that expansion as improvement would reward length and skill-language
repetition rather than a changed Agent judgment.

The comparison also has a ceiling problem: F1 supplies unusually explicit
owner cues ("after a relevant API task is active," "applies to every task," and
"including when a prompt omits ... or a process restarts"), and the baseline
already uses the frozen harness and protocol sources that explain those cues.
This fixture supports boundary review, but by itself it is weak at detecting
the candidate skill's incremental value.

## Design recommendation

Return **`no-proposal`** for a `skill-formation` design change from this round.
The next evidence-producing action is not a rewrite. It is a matched probe in
which baseline and treatment receive the same single-fixture task, the same raw
source packet, the same model/tools/authority/workspace, and differ only by the
loaded candidate skill. Record runner identity and source access explicitly.

Use a probe whose ownership cues require an actual formation judgment rather
than direct phrase-to-owner mapping, and include at least one tempting but wrong
skill proposal. Grade whether the treatment changes admission, refusal, or
evidence calibration without losing a baseline capability. Only an observed
matched difference should move the disposition from `no-proposal` toward
retain or rewrite; repeated matched probes are still required before a
regression-supported or convergence claim.
