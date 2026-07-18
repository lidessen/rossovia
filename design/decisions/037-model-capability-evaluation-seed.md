# 037 — Model Capability Evaluation Seed

**Status:** accepted for first-slice implementation
**Date:** 2026-07-18
**Authorized by:** principal

## Concrete pressure

Work Cell can execute one prepared task, release many Cells, compare an
instruction treatment with a baseline, and observe provider availability and
usage. None of those forms establishes what an execution profile can reliably
do. Provider names, model names, public leaderboards, one successful run, and
one surprising failure are therefore being asked to carry allocation claims
that they cannot verify.

The retained [model-capability research docket](../organization/sessions/2026-07-16-model-capability-and-subscription-research-docket.md)
identified the evaluated object as a versioned execution profile rather than a
model label. It also separated capability cognition from the later rapid
degradation check: a canary has no trustworthy baseline until repeated real
cases expose ordinary variance and characteristic failures.

The strongest smaller-form alternative is to reuse the existing experiment
adapter by treating providers as experiment variants. That adapter deliberately
compares one treatment under one driver factory. Adding provider identity to a
treatment would conflate a methodological hypothesis with the execution object
being measured, and its pairwise attribution result is not a capability
profile.

## Decision

Add two complementary forms:

1. an installable `model-evaluation` Skill owns case selection, capability
   claims, evidence interpretation, and the human promotion gate; and
2. a Work Cell `model-evaluation` adapter owns matched execution, isolation,
   blind evidence preparation, mechanical summaries, and retained records.

The general Cell contract, provider profile, model route, Swarm, and treatment
experiment remain unchanged.

```text
real accepted work + allocation question
                 │ model-evaluation method selects cases and rejection evidence
                 ▼
evaluation manifest
  frozen fixture · two explicit execution profiles · 2+ repetitions
  worker conditions · hidden reference criteria · independent judge route
                 ▼
model-evaluation adapter
  balanced serial schedule · isolated trial workspaces · ordinary runCell
  blind grouped evidence · descriptive usage/latency/status summaries
                 ▼
evaluation record (candidate evidence)
                 │ designated review and human acceptance
                 ▼
versioned capability-profile claim
```

## Evaluated identity

A profile ID names one declared execution choice, but the retained identity is
reconstructed from evidence:

- actual Work Cell adapter plus any selected provider route target observed in
  a `CellRunRecord` trace; absence of route metadata remains absence rather than
  falling back to a declaration, and present metadata still does not verify a
  provider's hidden backend build or revision;
- frozen fixture and task input;
- instructions, context, capabilities, tools, permissions, completion
  contracts, and execution budget captured by the ordinary `CellInput`; and
- required profile-local context and tool-surface policies plus a declared
  inference policy whose factual basis remains reviewable evidence.

The runtime resolves credentials only through the existing explicit route
contract. It never stores secret values. A fallback route is allowed but its
selected route target remains evidence; mixed route targets must not be
summarized as if every run used the preferred target. Route metadata alone does
not verify the provider's hidden backend build.

## Revised contract

One `work-cell.model-evaluation.v2` manifest contains:

- one frozen fixture plus optional overlays;
- exactly two explicit candidate profiles, each with its own validation route
  and named context and tool-surface policies plus a declared effective
  inference policy;
- one or more real task cases using the generic `CellInput` minus generated ID
  and workspace root;
- two to five repetitions;
- generic process or artifact conditions visible to the worker, evaluator-only
  reference criteria, a comparison rubric, and named material failure classes;
  and
- one separately declared judge route.

The adapter alternates which profile starts each repetition and retains that
schedule. Every trial receives a fresh driver and isolated fixture copy.
Profiles are grouped for blind judgment without exposing provider, model,
profile ID, schedule, usage, or latency. The judge reports acceptance evidence,
findings, and `A`, `B`, `tie`, or `inconclusive`. Named failure classes remain
in the case record as review lenses; a single model judge cannot admit its own
semantic classification as fact.

The record retains both condition layers, raw Cell evidence, judge evidence and
usage, total and mean usage, status counts, selected route identities, and
duration range by profile and case. These are
descriptive observations, not one intelligence score. The runtime does not
promote a profile, select a production route, or claim that a model is globally
better.

## Correction learned from the seed

The original v1 probe remains frozen evidence, but it cannot support a matched
model-capability comparison. Its worker-visible acceptance text stated the
expected repository conclusions, so correct outputs could follow supplied
answers rather than recover them. It also compared Kimi with thinking enabled,
interleaved reasoning history, temperature 1, and deferred settlement against
OpenCode Go DeepSeek Flash with thinking disabled and inline JSON settlement.
The large latency difference therefore belongs to those whole execution
profiles, not to bare model capability.

The v2 boundary records those declarations without treating them as observed
provider fact and keeps semantic reference criteria out of the worker packet. A
duration-bound run is retained as right-censored:
it establishes failure to settle inside the declared envelope, not randomness
or an unseen completion duration.

## Prompting-learning boundary

Capability evaluation also observes whether instructions, skills, context
delivery, tool descriptions, and completion contracts elicit the intended
behavior. Those observations are prompting hypotheses about the whole execution
profile, not proof of an intrinsic model trait.

When prompting is the question, hold model, provider, harness, tools, fixture,
and execution policy fixed and compare one separately labelled treatment using
the existing experiment mechanism. A case that shaped the treatment becomes a
development case. The revised profile must then return to capability evaluation
on separate retained cases before it can support an allocation claim. This
keeps prompting research and model cognition in one evidence cycle without
double-counting tuned cases as independent confirmation.

## Method and mechanism boundary

The Skill owns:

- the allocation decision being informed;
- whether cases represent real work and include held-out or historical
  acceptance evidence;
- which capability dimensions and failure classes matter;
- whether within-profile variance defeats a comparison;
- the strongest alternative explanation; and
- the human-reviewed capability claim, confidence, scope, and expiry.

The adapter owns:

- schema validation, matched scheduling, workspace isolation, execution,
  blinding, record persistence, and descriptive aggregation.

The judge is evidence, not acceptance authority. A human or named host process
admits any durable capability profile. Work-estimation may later combine an
accepted profile with workload and cost observations; neither method owns the
other.

## Explicit non-scope

- no public benchmark suite or universal task taxonomy;
- no scalar intelligence score, leaderboard, or automatic winner;
- no automatic provider routing or spend authorization;
- no coding-harness runner for Codex, Claude Code, or Cursor in this slice;
- no canary or “degradation” verdict before a capability baseline exists;
- no parallel execution, because provider load and concurrency would add an
  uncontrolled first-slice variable; and
- no compatibility fields in the treatment experiment or core Cell contract.

## Verification and disconfirmation

The boundary is supported only when:

- deterministic tests show two profiles execute every case for every
  repetition in isolated workspaces under an alternating schedule;
- blind judge input contains grouped task evidence but no profile/provider/model
  identity;
- worker input does not contain evaluator reference criteria, while the durable
  record preserves both layers and rejects exact criterion leakage;
- an unsettled run remains visible and makes semantic comparison inconclusive
  rather than disappearing from a success rate;
- a judge failure preserves every completed trial and settles the comparison as
  inconclusive evidence;
- fixture overlays cannot escape the frozen snapshot directory;
- the CLI persists a complete record and shows descriptive observations without
  naming a winner; and
- a live seed runs two locally authorized profiles on retained real tasks more
  than once and exposes variance, failures, latency, and usage.

Reopen the design if a real capability claim cannot be expressed without a
scalar score; if mixed fallback identity cannot be recovered from retained run
evidence; if serial execution creates a material order bias despite balancing;
or if a second evaluation adapter proves that scheduling or blinding belongs in
the generic orchestration core.

## Sequence expression

- **P13:** capability remains a claim until traceable runs, independent review,
  and human submission admit it as a reusable fact.
- **P02 / P05:** evaluate the actual execution profile on the concrete work it
  may receive, not a prestigious model label or universal proxy.
- **P08:** repeated trials, named failure classes, variance, and an explicit
  alternative explanation make the allocation claim revisable.
