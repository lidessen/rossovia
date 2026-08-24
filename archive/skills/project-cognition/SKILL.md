---
name: project-cognition
description: >-
  Build, verify, or selectively refresh a source-linked working model of a
  substantial project when later agents or tasks need to reuse its architecture,
  responsibilities, authority, state, causal, evidence, or change relations.
  Use for "initialize project cognition", "map this project for future work",
  "建立项目认知", "更新项目认知", "what existing cognition is invalidated by
  this change?", or when repeated tasks keep reconstructing the same project
  model. Do not use for a one-off code review, ordinary repository orientation,
  context-delivery configuration, or as a mandatory project setup step.
argument-hint: "[bootstrap | refresh | verify] [project-or-question]"
---

# Project Cognition

## Principle expression

**Primary:** P05
**Supporting:** P12, P13, P14

## Scope

Own one recurring judgment: **what source-linked working model of this concrete
project will let named later agents make a named class of decisions without
reconstructing the whole project, and how should that model be partitioned,
verified, and selectively refreshed?**

The answer may be no durable cognition. For one bounded question, a temporary
working model is usually smaller and safer. Persist a projection only when a
later actor or recurring decision is named and the retained model changes that
future action.

This Skill owns the cognition method. It does not own project facts, source
authority, context delivery, code-review verdicts, execution, orchestration,
storage services, or acceptance. A generated index or facet is a rebuildable
projection over named project sources.

Read [concepts](references/concepts.md) only when `decision field`, `facet`,
`packet`, `coverage ledger`, or `cognition projection` are being conflated. The
vocabulary clarifies the method; it does not prescribe a target-project schema.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this Skill's read-only fallback in `references/sequence.md`.
Read only P05, P12, P13, and P14.

## Dispatch

- With `bootstrap`, read and follow `commands/bootstrap.md`.
- With `refresh`, read and follow `commands/refresh.md`.
- With `verify`, read and follow `commands/verify.md`.
- With no argument, ground the requested decision and existing cognition, then
  choose the smallest applicable path. A read-only orientation request does not
  authorize creating or changing a durable projection.

## Start

```text
Target project and named source revision:
Decisions this cognition must support:
Named later actors or recurrence evidence:
Authoritative source and accepted design:
Existing cognition projection, if any:
Available execution carrier, if any:
Verifier and retention/commit owner:
Observation that would make persistence unnecessary:
```

If the intended behavior or source authority is materially unsettled, route
that decision first. Cognition cannot establish the architecture it is meant to
describe.

## Core method

1. **Decide whether cognition should persist.** Name the later decision and the
   reconstruction cost or repeated failure. If no later actor, recurrence, or
   decision delta exists, answer from a temporary source-linked model and stop.
2. **Recover the whole at low resolution.** Establish purpose, major
   responsibilities, external surfaces, authoritative records, and the main
   causal or state paths relevant to the named decision. This orients
   decomposition; it is not yet a durable ontology.
3. **Choose this task's semantic partition.** Derive coherent questions from
   the actual project and decision. Responsibility, causal path, state,
   authority, evidence, public contract, change impact, and uncertainty are
   useful relation lenses, not mandatory facet names. Read
   [adaptive decomposition](references/decomposition.md) when the whole exceeds
   one coherent investigation.
4. **Prepare bounded investigations.** Each packet names one question, source
   scope, incoming and outgoing relations, local acceptance, and what would
   force repartition. The caller may execute packets directly or lower them into
   Work Cells, a Swarm, or another carrier. This Skill never chooses concurrency,
   provider, retry, or queue policy.
5. **Reconstruct against source.** Reconnect packet boundaries before accepting
   the whole. Resolve disagreement through named source evidence, not consensus.
   Label inference, missing relations, and conflicting sources explicitly.
6. **Admit only verified claims.** A plausible model, generated artifact, or
   successful terminal call remains a proposal until a designated verifier
   checks its decision-relevant relations against the named source revision.
   The verifier must be an accountable external actor, review run, or governed
   process. Never name this Skill, a Cell, the projection, or its generator as
   the verifier; when no external check occurred, mark the claims `proposed` or
   `unverified`.
7. **Externalize the minimum inheritance.** When persistence passed its gate,
   retain a small routing index plus meaning-owned facets using
   [the projection contract](references/projection.md). Raw run records remain
   cold evidence by reference. Follow the target project's accepted artifact
   layout; do not create a second source of truth.
8. **Refresh by changed relation.** For a later revision, trace changed sources
   through responsibility, caller/consumer, state, authority, contract, test,
   and migration relations. Reuse a facet only with an explicit source-backed
   reason. Refresh affected facets, reconnect boundaries, and verify the changed
   field. Do not rebuild everything merely because a timestamp changed.
9. **Return decision support, not a capability claim.** State what the model now
   supports, what remains uncertain, what was reused or refreshed, evidence
   inspected, actual work observed, and the next event that should invalidate or
   bypass it.

## Ownership and routing

| Need | Owner |
|---|---|
| Working model and semantic partition for one proposed code change | `code-review` |
| Durable cross-task project cognition and selective refresh | this Skill |
| Deliver an already-selected source or cognition slice to an agent | `context-engineering` |
| Resolve source, authority, lifetime, or repository-layout conflict | `artifact-organization` or project design owner |
| Execute one prepared investigation and retain raw evidence | Work Cell or another execution carrier |
| Release, queue, or settle several prepared investigations | orchestration runtime or caller |
| Accept architecture, merge code, or promote a project fact | authorized human or target-project process |

## Boundaries

- Do not define a universal project ontology or fixed facet taxonomy.
- Do not persist cognition merely because the command can create files.
- Do not copy volatile target-project facts into this portable Skill.
- Do not treat tests, ASTs, code graphs, model agreement, or run success as
  sufficient fact admission; they are evidence inputs with bounded coverage.
- Do not impose byte limits, token limits, nested chunk manifests, or one-file
  monoliths. Keep one coherent semantic question per facet and split only when
  one agent can no longer read and revise it coherently.
- Do not require Work Cell, Shilu, a database, embeddings, or a retrieval
  service. They may be optional carriers after their own form and authority
  decisions.

## Completion standard

A cognition result is ready only when it names the decisions and source
revision, justifies temporary versus durable form, explains why the selected
partition fits this project, reconnects cross-facet relations, distinguishes
verified claims from inference, preserves external acceptance authority, and
states its invalidation or rebuild conditions. A durable projection must be
deletable without losing authoritative project state.
