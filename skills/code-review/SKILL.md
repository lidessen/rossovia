---
name: code-review
description: >-
  Review a proposed code change, staged diff, commit, patch, or pull request for
  decision-changing defects before acceptance or merge. Use when asked "review
  this code", "review the diff/PR", "can this merge", "find regressions", or
  when a consequential implementation needs an impact-aware independent review.
  Do not use to implement the change, process already-filed PR comments, settle
  an unaccepted architecture, review visual design, or orchestrate reviewers.
---

# Code Review

## Principle expression

**Primary:** P02
**Supporting:** P04, P08, P14

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this skill's read-only fallback in `references/sequence.md`.
Read only P02, P04, P08, and P14.

## Scope

Own one judgment: **what decision-changing defects, unsupported claims, or
residual risks does a proposed code change introduce relative to its accepted
intent, current contracts, and actual impact field?**

Review one whole change or one caller-declared review packet. Build an
evidence-linked working model of the relevant project whole or local subsystem
before qualifying defects. The packet may be executed by one agent, a Work
Cell, or another host, but those carriers do not change this method. This skill
may form the semantic partition plan when a review exceeds one Cell's supported
working scale; it does not choose concurrency or provider resources, launch a
swarm, retry a reviewer, tally opinions, accept the change, or merge it.

Do not equate review with diff narration, style preference, test-count praise,
or speculative redesign. A finding needs source evidence and a reachable
failure story. Absence of a finding means only that none was established within
the inspected field.

## Start

Ground the review before judging:

```text
Review target and source revision:
Accepted intent or change claim:
Governing contracts and design:
Declared review scope or packet:
Known stable working envelope or prior comparable run:
Available verification evidence:
Acceptance or merge owner:
```

If the intended behavior or governing architecture is materially unsettled,
route that decision first. Review cannot prove conformance to a contract that
does not exist.

## Core method

1. **Recover the change and baseline.** Inspect repository state, the actual
   diff, changed symbols, and the pre-change behavior or contract. Read the
   accepted design and task claim that make the change meaningful. Separate
   direct observation, inference, and unavailable context.
2. **Fit the work to a stable review scale.** Use one reviewer when the impact
   field, governing context, investigation branches, and report can remain
   coherent in one working context. When they cannot, form semantic packets
   small enough for one Cell to investigate and verify reliably. Preserve the
   whole at low resolution and make every incoming, outgoing, and deliberately
   overlapping boundary explicit. Read [scale-controlled partitioning](references/partitioning.md)
   when a change crosses several ownership or causal boundaries. A partition
   plan is review method; releasing it with a concurrency value is orchestration.
3. **Construct the review model.** Before searching for defects, explain the
   relevant system at the resolution this decision needs: purpose, component
   responsibilities, state and effect ownership, causal path through the
   change, governing invariants, and known unknowns. Tie every relation to a
   source anchor or label it inference. Read [review modeling](references/review-model.md)
   when the change crosses components, the project model is unclear, or the
   caller supplied a bounded packet.
4. **Test the model against the impact field.** Follow changed definitions
   through direct callers and consumers, public types, state/effect boundaries,
   persistence or protocol edges, and verification surfaces. Use compiler,
   language-server, AST, code graph, search, history, and tests as observations
   when available; none is mandatory. Revise the model when source relations
   contradict it. Do not stop at the diff when downstream behavior can change.
5. **Allocate attention by risk, not file size.** Identify the principal failure
   mode whose truth would change the merge decision, then inspect secondary hard
   constraints. Load [risk lenses](references/risk-lenses.md) only for boundaries
   the change actually touches. Within a bounded packet, record an uninspected
   external relation as a context gap instead of silently expanding scope or
   assuming it is safe. Do not report the related code or artifact as missing
   unless a check against the declared review target establishes that fact.
6. **Trace credible failure paths.** Exercise relevant success, error,
   cancellation, concurrency, compatibility, capability, migration, and resource
   paths. A category has no standing merely because it appears on a checklist;
   connect it to changed behavior and a reachable caller.
7. **Qualify every finding.** Before reporting, establish:
   - exact file, symbol, or runtime evidence;
   - the input or event sequence that reaches the defect;
   - the violated contract or concrete consequence;
   - severity based on impact and reachability, not rhetorical confidence; and
   - the smallest correction that closes the failure without redesigning the task.

   Absence from supplied packet context is not source evidence of a defect.
   Disprove and discard a suspicion when source behavior, language semantics,
   or a focused check defeats its failure story.
8. **Use verification for decisions.** Run the smallest check capable of
   confirming or rejecting a material concern. Green tests are supporting
   evidence, not proof that unobserved callers are safe. A new test is justified
   only when it exposes a realistic defect and would change the review verdict.
   A sentence in this skill is a criterion for judging a review, not evidence
   that an agent followed it. Claim behavioral improvement only from retained
   runs that expose the relevant behavior against a baseline or disconfirming
   case.
9. **Return findings before summary.** Report only decision-relevant findings,
   ordered by severity. Then list verified claims, residual risks and context
   gaps, checks actually run, and one proposed verdict:
   `ready`, `ready_with_residual_risk`, or `changes_required`.

## Review report contract

For every finding use this minimum shape:

```text
Severity and title:
Evidence:
Failure story:
Violated contract or consequence:
Smallest correction:
```

For a consequential whole-change review or a bounded packet intended for later
synthesis, also return the compact review model used to reason:

```text
Modeled scope and revision:
Responsibilities and ownership:
Before/after causal path:
Load-bearing invariants:
Source-backed relations:
Inferred or missing relations:
```

If there are no findings, say so directly and retain residual risks. Never add
weak findings to make a report look substantive. A review report is evidence
for the acceptance owner; its verdict is not merge authority and cannot replace
the source code, diff, test output, or terminal records from which it was built.

## Boundaries and routing

| Need | Owner |
|---|---|
| Decide whether semantic review partitioning is needed and define packet boundaries | this skill |
| Choose concurrency, queueing, provider models, retries, or when prepared packets run | host orchestration runtime or caller |
| Apply this method to a bounded packet | this skill, unchanged |
| Build or reconcile evidence-linked project/subsystem models inside a review packet | this skill |
| Implement accepted corrections | ordinary development method, usually `disciplined-development` |
| Plan or execute a behavior-preserving structural migration | `structural-refactoring` |
| Resolve unsettled architecture or product behavior | project design/decision owner |
| Process existing inline PR comments and thread disposition | repository or GitHub review-comment workflow |
| Review UI composition or visual quality | `visual-design` |
| Diagnose why review instructions failed to reach an agent | `context-engineering` |

When several review reports exist, a caller may ask another application of this
skill to reconcile their review models, cited evidence, and disagreements. The
reconciliation must preserve incompatible models until source evidence resolves
them; majority agreement cannot turn an inference into fact. Recheck every
retained finding against the declared review target rather than treating a
packet report as its own evidence. This is a new review packet, not authority
to vote facts into existence or an instruction to launch more agents.

## Verification

Read [evaluation](references/evaluation.md) when testing this skill, comparing a
single reviewer with bounded parallel packets, or deciding whether a new risk
lens changes findings. Structural validity alone does not prove review quality.

## Completion standard

A review is ready when the target and accepted intent are named, the relevant
project or subsystem model and inspected impact field are explicit, every
finding has a reachable source-backed failure story, model conflicts and
disproven suspicions are retained or resolved, executed checks are distinguished
from untested assumptions, any partition can be reconnected through explicit
boundary relations, and acceptance authority remains external.
