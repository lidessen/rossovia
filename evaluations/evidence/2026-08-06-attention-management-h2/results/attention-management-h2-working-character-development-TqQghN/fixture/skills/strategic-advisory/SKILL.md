---
name: strategic-advisory
description: >-
  Prepare an evidence-backed strategic recommendation when a project phase has
  settled, material conditions changed, or a human asks for short-, medium-, and
  long-horizon direction. Synthesizes verified phase evidence into a proposed
  Strategy Case with a principal contradiction, strongest preservation case,
  rolling horizons, mission candidates, and replan signals. It advises only:
  humans approve commitments, and Work Cells or other owners execute them. Do
  not use for ordinary task planning, implementation sequencing, or automatic
  portfolio management.
argument-hint: "[prepare | review]"
---

# Strategic Advisory

## Principle expression

**Primary:** P07
**Supporting:** P04, P13, P15

## Scope

Own one judgment: **given verified evidence from a completed or changed phase,
what strategic direction and minimum horizon-linked commitments should a human
consider next?**

This is a temporary advisory synthesis, not a permanent central agent. It turns
the concrete state into a proposed Strategy Case; it does not accept strategy,
own facts, execute missions, schedule work, or modify the Sequence.

## Principle source

Use a host Sequence and its matching interpretations when the host declares
them. Otherwise use this skill's read-only fallback in `references/sequence.md`.
Read only P07, P04, P13, and P15 for this
skill's stable lineage. The human approval boundary remains explicit even when
the host expresses it through another P-ID or governance artifact.

## Start

Activate only with one of these triggers:

- a phase has an explicit settled disposition and retained evidence;
- material conditions invalidate an accepted direction or capability assumption;
- a human explicitly requests a strategic recommendation.

Do not use a hoped-for future capability as if it were phase evidence. State:

```text
Human mandate and decision horizon:
Verified phase facts and source records:
Claims, uncertainties, and external conditions:
Current capabilities, commitments, and hard constraints:
Available Work Estimates, executor profiles, and approved envelopes:
What decision the human must make now:
```

If those inputs are missing, return an evidence-gathering question or route to
`practice-cycle`; do not manufacture strategy from aspiration.

## Core method

1. **Reconstruct the concrete situation.** Preserve evidence links, current
   capabilities, commitments, conditions, and uncertainties together. A prior
   roadmap is an input claim, not the present situation.
2. **Separate fact, claim, option, and source status.** P13 applies before
   synthesis: identify what is verified, what needs verification, which
   directions are merely proposed, and the exact settlement status of every
   source. “Accepted for implementation”, “proposed”, and “passed a mechanical
   check” are not interchangeable with an accepted phase fact. A Strategy Case
   never upgrades its own recommendation into fact.
3. **Find the principal contradiction.** Use P04 to name the tension whose
   resolution changes the remaining choices. Name secondary constraints and the
   strongest preservation or keep-current-direction case.
4. **Compare strategic alternatives.** Include at least the preservation case
   and one change case. For each, state capability cost, irreversible surface,
   evidence gap, and the condition that would defeat it. When resource
   commitment changes the choice, attach a Work Estimate/Budget Card: keep
   executor-independent work, profile-specific projection, approved envelope,
   and calibration limits distinct. If no calibrated projection exists, request
   a bounded discovery allocation rather than scoring options with invented
   precision.
5. **Reconstruct three rolling horizons.** Use
   [the horizon model](references/horizon-model.md):
   - **long direction** — a concrete future condition and protected boundaries,
     not a distant task list;
   - **medium capability hypotheses** — the few capabilities or programs that
     could make that direction real, with dependencies and revision signals;
   - **short mission candidates** — one to three minimum next practices that
     test or build a selected capability.

   Every short mission candidate must point to one medium capability and one
   long direction. If it cannot, leave it out.

   The act of preparing this Strategy Case is evidence for evaluating the
   advisory method, not a mission candidate inside the same Case. Never ask a
   human to approve the Case's own already-performed preparation as its next
   strategic mission. Every next mission candidate must name a decision delta
   not already supplied by the current Case—for example independent human
   review, a second materially different evidence context, or a changed
   capability assumption.
6. **Choose the minimum recommendation.** P15 means recommend only the smallest
   commitment that changes the principal contradiction while retaining hard
   constraints. Medium and long layers may remain conditional; only an approved
   short mission becomes eligible for an execution owner.
7. **Prepare, do not commit.** Produce a [Strategy Case](references/strategy-case.md)
   with source links, options, horizons, decision requests, and replan signals.
   Name the human approver, independent verifier where needed, and execution
   owner only after approval. A Work Cell may later validate or execute a
   bounded approved mission; it is not the strategy authority.

## Boundaries

- This Skill is not `practice-cycle`: it synthesizes a human strategic decision
  after evidence exists; it does not decide the next practice for every task.
- This Skill is not `form-guidance`: the carrier has already been selected. Do
  not reopen Skill/runtime/artifact form choice unless a new form contradiction
  is evidenced.
- A Strategy Case is a proposed durable decision artifact, not a new semantic
  source, plan database, task board, or automatic queue.
- Long horizons state direction and protected boundaries; medium horizons state
  conditional capability hypotheses; short horizons state mission candidates.
  None is an automatic commitment.
- The current advisory run may appear only as evidence with its actual status.
  It cannot become a self-referential recommendation, approved mission, or
  substitute for the human review that evaluates this Case.
- Do not create child tasks, allocate people, or approve resources. Route those
  actions to the designated human and execution owner after approval.

## Completion standard

The advisory is ready for human review when its Strategy Case separates facts
from claims, names the principal contradiction and preservation case, links all
three horizons, exposes a minimum recommendation and disconfirming signals,
and states who may approve and execute. It is supported only after an action
probe produces such a case from real phase evidence, a boundary probe declines
ordinary task planning, and a review shows the proposal did not self-commit.
