---
name: model-evaluation
description: >-
  Build or revise an evidence-linked capability profile for a model execution
  setup by running repeated, representative real tasks under matched
  conditions. Use when comparing models, providers, plans, coding harnesses, or
  prompt/tool profiles for task allocation; when asking "which model is good
  enough for this work?", "evaluate this model", "compare model capability",
  "模型评测/能力画像/模型适合什么任务", or whether a characterized setup may
  have degraded. Do not use for provider setup, public leaderboard summaries,
  one-off response review, automatic routing, or a degradation verdict without
  an accepted baseline.
---

# Model Evaluation

## Principle expression

**Primary:** P13
**Supporting:** P02, P05, P08

## Scope

Own one recurring judgment: **what traceable task evidence justifies a bounded
capability claim about an execution profile strongly enough to inform later
allocation?**

Evaluate an execution profile, not a model label. Its identity includes the
model and provider or plan, harness and version, prompt/skill/context policy,
tools and permissions, and execution policy. A changed member creates a new or
revised profile unless evidence shows that the difference is immaterial.

The result is a versioned capability claim with evidence, scope, uncertainty,
and a reopening observation. It is not a universal intelligence score.

## Principle source

First detect whether the host declares a Sequence and matching interpretations.
When it does, read only host P13, P02, P05, and P08. Otherwise use the read-only
fallback in `references/sequence.md`. A live task may select a different current
lead without changing this skill's stable lineage.

## Start

Recover only enough state to decide whether a valid evaluation can begin:

```text
Allocation decision the evidence must inform:
Candidate execution profiles and identity revisions:
Real task population and retained acceptance evidence:
Material capability dimensions and failure classes:
Available executor, isolation, usage, latency, and judge evidence:
Existing accepted profile or baseline, if degradation is suspected:
Human or designated host with profile-admission authority:
```

If there is no allocation decision, real task population, or traceable
acceptance evidence, do not manufacture a benchmark. Return the missing evidence
and the smallest probe that could obtain it.

## Comparison validity gate

Apply this gate before interpreting pass rates, latency, judge preference, or
output quality. A later good result cannot repair an invalid comparison design.

1. Name the attribution target: the whole execution profile, one deliberately
   changed profile member, or a bare model claim. Enumerate every other material
   difference between candidates. If several members differ, report only a
   whole-profile observation; do not attribute it to the model.
2. Compare the worker-visible packet with evaluator-only references. If the
   worker can see an expected conclusion, seeded defect, reference answer, or a
   semantic criterion that states what it must discover, invalidate capability
   comparison. Judge content, not the field label: “inspect every source,”
   “cite evidence,” and “produce this artifact shape” are procedural; “X owns
   Y,” “A cannot substitute for B,” or “the seeded defect is Z” disclose domain
   answers even when placed in an `acceptance` field. Source-citation work does
   not make a disclosed answer held out. Preserve only protocol or
   answer-following evidence.
3. Check whether the cases can discriminate the claimed allocation and whether
   an execution boundary dominates the outcomes. If all viable profiles can
   pass by extraction, or all runs merely hit a cutoff, redesign the field.

State which gate passed or failed in the Capability Case. Continue to outcome
analysis only for the evidence layers that remain valid.

## Core method

1. **Bound the claim.** State the task shape, risk, and decision the profile may
   influence. “Better model” is not a bounded claim; “reliably reviews local
   TypeScript changes before human confirmation” may be.
2. **Freeze the compared conditions.** Record every identity member and keep
   task packet, fixture revision, skills, tools, permissions, completion
   contract, and execution policy matched unless that member is the variable
   under evaluation. Make the declared effective inference policy explicit:
   thinking or
   reasoning mode and effort, temperature, streaming, context/history handling,
   step and duration boundaries, and completion protocol. A selected route
   target is not proof of the provider's hidden backend build or revision; name
   it as route evidence unless the provider supplies stronger provenance. The
   declaration remains a claim until source or provider evidence supports it.
3. **Select cases from practice.** Prefer previously completed production or
   project tasks with independent acceptance evidence. Include materially
   different cases inside the claimed task population and at least one case
   likely to expose a characteristic failure. Public benchmarks may supplement
   this field but cannot replace it. Remove cases so easy that every viable
   profile passes without exercising the claimed capability, and cases so hard
   that every run only hits the execution boundary; neither distinguishes the
   allocation decision.
4. **Name decision-changing evidence before running.** For each case state its
   acceptance conditions, material failure classes, and the observation that
   would defeat the proposed allocation claim. Avoid criteria that reward
   verbosity, stylistic resemblance, or test-count inflation. Keep worker-visible
   acceptance procedural and artifact-oriented. Expected conclusions, seeded
   defects, reference answers, and semantic comparison criteria remain visible
   only to the evaluator; otherwise the task measures answer following rather
   than discovery.
5. **Run matched repetitions.** Execute each profile more than once in isolated
   workspaces. Balance order and avoid parallelism when provider load would add
   an uncontrolled variable. Retain unsettled runs, retries, latency, usage,
   selected route identity and any stronger provider provenance, artifacts,
   verification, and interventions; never
   discard a failure to make the sample comparable.
   A run stopped at a declared duration boundary is right-censored evidence: it
   proves only that the profile did not settle within that envelope. Do not call
   one boundary hit random instability or estimate its unseen completion time.
6. **Judge blind where judgment is necessary.** Hide profile/provider/model
   identity from the evaluator. Mechanical acceptance may settle deterministic
   conditions; semantic judgment reports evidence but cannot admit the profile
   as fact. Keep the judge identity and usage visible outside the blind packet.
7. **Compare variation before averages.** Examine within-profile inconsistency,
   failure modes, and order effects before claiming a between-profile
   difference. If ordinary variance is as large as the claimed advantage,
   return `inconclusive` and change the next probe rather than adding confidence
   language.
8. **Prepare a Capability Case.** Read `references/capability-case.md`. Link the
   exact fixture, cases, run records, judge evidence, failures, and resource
   observations. Treat prompting behavior as evidence about the whole execution
   profile: retain observed prompt failures and the smallest treatment hypothesis,
   but do not attribute them to the model alone.
9. **Separate discovery from confirmation.** A case used to revise instructions,
   skills, context, tool descriptions, or completion contracts has become a
   development case. Hold model, route, harness, tools, and fixture fixed while
   comparing that prompt treatment; then confirm the revised profile on retained
   cases that did not teach the treatment. Do not report tuning-case improvement
   as held-out capability.
10. **Submit deliberately.** Only the named human or designated host may accept
   the candidate claim into a reusable capability profile. An evaluator,
   runtime, provider, or routing policy cannot approve its own allocation.

## Execution mechanism

Use the host's smallest truthful executor. It must preserve identity, matched
task input, isolation, repeated outcomes, and raw evidence; the method does not
depend on Work Cell.

When this repository's Work Cell is available, a prepared
`work-cell.model-evaluation.v2` manifest can be executed with:

```bash
bun packages/work-cell/src/cli.ts model evaluate path/to/model-evaluation.json
```

The adapter compares exactly two explicit profiles, runs two to five serial
repetitions over a frozen fixture, uses task-local failure classes and an
independent judge route, and emits candidate evidence. Each profile must name
its context, tool-surface, and inference policies. Each case separates generic
worker-visible acceptance from evaluator-only reference criteria; exact leakage
between the two is rejected. Inspect the retained record; the compact CLI
summary intentionally does not name a winner.

When the next question is specifically whether one prompt or skill treatment
improves the same execution profile, use a matched baseline/treatment experiment
that changes only that member. Feed the accepted treatment back as a new profile
revision, then return here for task-population confirmation. Model evaluation
discovers prompting hypotheses; it does not erase the attribution boundary.
Prompting variables include wording, instruction priority and placement, phase
separation, tool descriptions, and completion protocol. Test them separately;
do not respond to a protocol failure by indefinitely adding stronger prose.

## Degradation boundary

A surprising answer is not evidence that a model has “become worse.” First
separate model alias, provider routing/load, quota fallback, harness revision,
context delivery, tools, permissions, and transport state.

Only derive a rapid canary after an accepted profile exposes stable high-signal
cases and ordinary variance. Compare current repeated results with that pinned
baseline and report `suspected regression` only when the change exceeds the
baseline variation. Otherwise return `inconclusive`. The canary is a projection
of the profile evidence, never an independent benchmark or global degradation
verdict.

## Boundaries

- Do not collapse different task dimensions into one score or leaderboard.
- Do not infer capability from price, quota, popularity, or provider marketing.
- Do not let a judge preference erase mechanical failures or divergent runs.
- Do not silently change prompt, skill, context, tools, permissions, or fallback
  policy while attributing the result to the model.
- Do not repeatedly tune on evaluation cases and continue calling them held out.
- Do not grant provider or spend authority; route configuration remains an
  environment concern.
- Route workload estimation and time/money conversion to their owning method
  after a capability claim exists; evaluation records usage and latency only.
- Route one proposed code or artifact comparison to its domain review method.

## Completion standard

An evaluation is ready for human submission only when the execution identities,
task population, fixture and acceptance provenance, repeated raw outcomes,
within-profile variance, failure classes, latency and usage, judge identity,
alternative explanation, bounded claim, and reopening observation are explicit.
If any is absent, retain a probe record rather than a capability profile.
