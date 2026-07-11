# Organizational Doctrine — Artifact Organization

> Domain doctrine for classification questions. The skill's operational form
> remains in `SKILL.md`; optional metaphor lives in
> [base-metaphor.md](base-metaphor.md).

## In plain words

A project carrier is not its folder tree. Its organization is the relation
between artifacts that decide, preserve evidence, guide repeated action,
support one episode, or project another source. Change paths only when those
relations no longer express accepted design.

## Three functions

1. **Classify actual roles.** Decide whether each load-bearing artifact is a
   semantic source, durable evidence, living expression, process artifact, or
   projection. Directory names are clues, not verdicts.
2. **Find a material design gap.** Compare current roles and paths with accepted
   design. A gap is material only when it changes authority, inheritance,
   repeated action, or rebuildability.
3. **Transition and settle.** Apply one smallest approved change, verify the
   protected relations, then promote stable organization into design and remove
   or archive temporary coordination.

Approval roles, index checks, and evidence-admission checks are conditional on
the transition. They are not mandatory organization layers when the relevant
risk is absent.

## Domain vocabulary

| Term | Decision question | Default lifetime |
|---|---|---|
| **Semantic source** | Would editing this change doctrine or accepted architecture? | Long; governed revision |
| **Durable evidence** | Must a later actor recover why a decision was made? | Long enough for the decisions it supports |
| **Living expression** | Does this guide a repeated judgment now? | Until regenerated or retired |
| **Process artifact** | Does this coordinate only one bounded episode? | Until settlement, then archive or discard |
| **Projection** | Can this be rebuilt from a declared source without losing meaning? | Disposable and regenerable |

## Command API

| Command | Decision enabled |
|---|---|
| `audit` | Determine whether a material organization transition is warranted |
| `transition` | Apply and verify one approved wave, then settle its process material |

## Host extension

A target project may keep host-specific paths and authority rules in its own
design. Do not copy them into this skill unless a second context demonstrates a
reusable decision that the existing classes cannot express.
