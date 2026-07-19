---
name: systems-engineering
description: >-
  Design or revise a sufficiently reliable whole from fallible human, Agent,
  software, and organizational parts under concrete constraints and accepted
  residual risk. Use when a workflow keeps failing despite locally reasonable
  tasks, when deciding where verification, redundancy, retries, rollback,
  budget margin, or human acceptance belong, when a Swarm or multi-stage Agent
  process needs an end-to-end reliability model, when component quality is
  being confused with system quality, or when asking "how can unreliable agents
  form a reliable system?", "where should the feedback loop close?",
  "怎么把会犯错的 Agent 组成可靠系统?" / "如何从流程上保证近似可靠?". Do not use for an
  ordinary bounded task, generic planning, proving model capability, converting
  work into token/time/cost estimates, or operating an already prepared queue.
---

# Systems Engineering

## Principle expression

**Primary:** P03

**Supporting:** P04, P13, P15

## Scope

Own one judgment: **under the actual goal, operating conditions, failure
consequences, and acceptable residual risk, how should fallible parts be related,
observed, corrected, and governed so the whole behaves reliably enough to use
and maintain?**

Reliability here is approximate and evidence-relative. Humans, models, tools,
and reviewers will make mistakes. Engineering does not make each part perfect;
it makes material error observable, bounded, correctable, or explicitly
accepted at a cost proportionate to consequence.

This Skill designs the system relation. It does not execute a Work Cell or
Swarm, prove a model primitive, invent domain acceptance, choose every local
task packet, or approve its own result. It is not a mandatory preflight and does
not turn every task into a control diagram.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this package's read-only fallback in `references/sequence.md`.
Read only P03, P04, P13, and P15. A live task may select a different current
lead without changing this Skill's stable lineage.

## Start from the actual system

Recover only what changes the engineering decision:

```text
Desired whole behavior and acceptance owner:
Operating conditions, source state, and hard constraints:
Failure consequence and acceptable residual risk:
Actual path from input through effects to acceptance:
Observed failure, disturbance, variance, or near miss:
Available signals, controls, recovery, and resource margins:
Observation that would show the present system is already sufficient:
```

If the task is low-consequence, reversible, locally observable, and already has
an adequate correction path, retain the present form. Do not manufacture a
System Case.

Read [concepts](references/concepts.md) only when terms such as feedback,
stability, redundancy, independence, or residual risk affect the decision.
Read [evaluation](references/evaluation.md) only when testing a new control
structure or claiming improved system reliability.

## Specificity discipline

A system requirement can be correct while its implementation is still
undecided. False precision hides that boundary and can silently take another
owner's authority. Use the most concrete form supported by the supplied source:

- if a field, threshold, duration, batch size, sample, protocol, or role is
  explicitly governed, preserve it and name its source;
- if only a property is governed, state the property and its acceptance signal;
  use `[owning domain/runtime to determine]` for the representation; and
- if even the property lacks evidence, return discovery rather than a plausible
  mechanism.

Before submitting, audit every concrete name and number introduced by the
answer. Remove or bound any that came from the Agent rather than the case or a
governing source. Do not contradict this audit by naming a proposed field and
then claiming only to have stated a property.

Self-audit is not verification. For a consequential System Case, treat the
first result as a candidate until a designated independent verifier compares
each introduced mechanism, threshold, duration, sample, protocol, and role with
the supplied sources and ownership boundary. Give the verifier this narrow
claim/source task and only the governing sources plus accepted candidate
payload; do not inject the full reasoning trace or ask it to redesign the
system. Revise only the rejected specifics while preserving supported control
requirements.

## Core method

1. **Define sufficient behavior, not perfection.** State the outcome, operating
   range, acceptance condition, failure consequence, and tolerable residual
   risk. “No mistakes” is not an engineering specification. Make risk tolerance
   specific enough to distinguish harmless variation, recoverable failure, and
   unacceptable escape.
2. **Model the whole path.** Follow the real movement from inputs and source
   state through judgments, effects, verification, acceptance, and later use.
   Name actors and components only where their relation changes behavior. A
   list of Agents, tools, or workflow stages is not yet a system model.
3. **Identify disturbances and failure paths.** Include semantic error, stale
   context, omitted obligations, correlated model error, protocol failure,
   external change, unsafe effect, reviewer miss, false-positive burden, and
   resource exhaustion when relevant. Do not invent an exhaustive hazard
   register for a reversible low-risk task.
4. **Find the principal control gap.** Select the failure path whose containment
   or correction most changes the whole. Preserve secondary hard constraints,
   but do not answer every risk with more stages, more prompts, or more Cells.
5. **Make the material state observable.** Decide which signal can expose the
   failure in time to act: source-linked evidence, a deterministic check,
   structured status, disagreement, usage variance, production outcome, or a
   later practice result. A control that cannot observe its target is ceremony.
   Agent self-report and terminal success remain claims until their designated
   verification and settlement. State the semantic property that must be
   observed before selecting its representation. A whole-source claim must be
   resolved against whole-source evidence before acceptance, but this Skill
   does not decide which domain field or runtime protocol carries that evidence.
6. **Assign authority and response.** State who may observe, propose, verify,
   intervene, commit effects, roll back, accept residual risk, and reopen the
   case. Keep decision and execution authority distinct where consequence
   requires it. Do not make a worker or review ensemble accept its own output.
7. **Choose the minimum sufficient control structure.** Select only mechanisms
   that interrupt the named failure path:

   - prevent by improving input, context, boundaries, or task form;
   - detect through independent evidence, tests, comparison, or observation;
   - contain with limited authority, blast radius, staging, or reversible effects;
   - recover through retry, repair, rollback, reuse, or escalation; and
   - tolerate through justified redundancy or resource margin.

   Match control cost to failure consequence. A reversible documentation edit
   may need one meaningful check; an irreversible production or strategic
   decision may justify diverse independent review, repeated labor,
   deterministic gates, prepared recovery, and explicit human acceptance.
   More controls are not automatically more reliable: they can add delay,
   correlated error, coordination failure, and review burden.
   At a boundary owned by another method or runtime, specify the required
   control property, observable signal, authority, and failure response, then
   hand it off. Do not invent a terminal-tool field, domain packet, deployment
   threshold, sample size, time window, or organization role without source
   evidence and the owner's authority.
8. **Engineer independence, not vote count.** Repetition helps only when the
   compared attempts can expose different failure modes. Identical context,
   model, prompt, and method may reproduce one systematic error. Vary evidence
   boundaries, method, role, model, verifier, or deterministic surface only
   where correlated failure matters. Resolve factual disagreement against
   sources and designated verification, never by majority alone.
9. **Fit Agent nodes after the system relation is known.** Use `task-shaping`
   when one required contribution must be compiled into a stable Agent unit.
   Use `model-evaluation` when its capability is unevidenced. Use a domain Skill
   to define semantic partitions and acceptance. The Work Cell or orchestration
   runtime carries prepared execution; none of them decides the whole system
   relation by default.
10. **Budget for completion and recovery.** Begin from necessary work and risk,
    then use `work-estimation` to convert it into profile-specific resources.
    Prefer a realistic estimate, explicit margin for important uncertainty, a
    high emergency ceiling only when required by the carrier, and post-run
    audit of expected versus actual use. Do not treat low token use as quality
    or a routine context ceiling as an engineering budget. Estimate variance
    is normally a post-run correction signal; it does not itself authorize
    interruption, replanning, or escalation during useful work. Add an in-run
    resource control only when exhaustion is a named safety or availability
    failure and its owner authorizes that response.
11. **Close the loop in operation.** Observe end-to-end outcomes, material
    defects caught and escaped, false-positive repair burden, recovery, latency,
    cost per useful result, and estimate variance. Compare with the unchanged
    system when claiming improvement. Revise the system model, control, or risk
    acceptance from what actually happened; do not merely append another rule.

Before making any control concrete, apply this authority-and-evidence gate:

```text
Is the mechanism, threshold, duration, schema, or role fixed by source evidence
and owned here?
  yes -> specify it and cite or name the governing source
  no  -> state only the required property, mark the representation
         `[owning domain/runtime to determine]`, and route it
```

“Independent verification,” “staged effects,” and “recoverable rollback” may be
valid system requirements while their exact implementation remains a domain or
runtime decision. Unknown specificity is a discovery item, not an invitation to
invent plausible numbers.

## System Case

Return the smallest handoff the consequence requires:

```text
Desired behavior, operating range, and acceptance owner:
System boundary and effect path:
Principal disturbance or failure path:
Observable signal and evidence source:
Control action, authority, and recovery:
Required component contributions and local owners:
Expected work, margin, and audit signal:
Residual risk and who accepts it:
Operational measure and reopening condition:
```

For several interacting failure paths, a compact control map may help:

| Failure or disturbance | Observable signal | Response | Authority | Recovery | Residual risk |
|---|---|---|---|---|---|

Use neither artifact when a direct explanation or one boundary change is
sufficient. The System Case is a decision carrier, not a universal manifest or
runtime schema.

## Boundaries and routing

| Need | Owner |
|---|---|
| Decide whether the whole is sufficiently reliable under disturbance | `systems-engineering` |
| Determine whether one Agent operation fits an evidenced execution envelope | `task-shaping` |
| Establish reusable model/provider/harness capability evidence | `model-evaluation` |
| Form domain-specific review, refactoring, cognition, or other semantic packets | owning domain Skill |
| Deliver authoritative context to one prepared unit | `context-engineering` |
| Estimate necessary work and convert it into time, tokens, or money | `work-estimation` |
| Run Cells, queues, retries, concurrency, and providers | Work Cell or orchestration runtime |
| Verify domain facts and accept residual risk or effects | designated verifier and human or host authority |
| Select the next bounded practice after observing operation | `practice-cycle` |

Do not use `systems-engineering` as a synonym for architecture, project
planning, generic rigor, or “use more reviewers.” Do not hide a domain judgment
inside a control label. Do not claim end-to-end reliability from component
success, schema validity, test count, reviewer count, or one clean run.
Do not repair a semantic control gap by changing a generic runtime contract
unless runtime evidence identifies that contract as the owner and the change is
separately authorized.

## Completion standard

The engineering judgment is ready when it defines sufficient whole behavior,
models the real effect and acceptance path, identifies the principal material
failure/control gap, connects an observable signal to an authorized response
and recovery, selects controls proportional to consequence, names residual risk
and its acceptance owner, and states an operational observation capable of
showing the design is wrong or incomplete.

For a consequential case, readiness also requires independent source-and-owner
verification of newly introduced specifics. Without that verification, report
a candidate. Without representative operation evidence, report a proposed
system design or trial—not a reliable system.
