---
name: mechanism-design-review
description: >-
  Review proposed mechanisms in agent harnesses, agent runtimes, orchestration,
  workflows, and agent-facing infrastructure before implementation. Use when a
  design adds state, records, queues, locks, retries, gates, hooks, registries,
  protocols, lifecycle stages, daemons, or approval flows; when asking whether
  a prompt, Skill, policy, or existing owner is sufficient; or when defensive
  controls are making the system longer and more complex; when verification,
  review, acceptance, retry, continuation, or recovery meanings are being
  conflated; when an action vocabulary keeps growing; or when a mechanism or
  architecture review must give a design owner a self-contained working model
  and decision rather than a list of code links and findings. Do not use for
  ordinary implementation of an already accepted mechanism or for code-level
  defect review.
---

# Mechanism Design Review

## Principle expression

**Primary:** P15

**Supporting:** P04, P13, P16

## Scope

Own one recurring judgment: **what is the smallest treatment that resolves the
observed agent-system design problem, and has a proposed mechanism earned the
state, control, lifecycle, and recovery complexity it adds?**

Treat “mechanism” broadly: any new durable record, state machine, queue, lock,
retry controller, gate, hook, registry, protocol, daemon, lifecycle phase, or
mandatory workflow that changes what the system can enforce or remember.

This Skill is prompt-level judgment, not a mechanism-admission mechanism. It
does not create a registry, approval state, required design packet, CI gate,
runtime preflight, review queue, or permanent checklist. Do not make invocation
of this Skill a new runtime dependency. Use it while forming or reviewing a
design; retain its result only when the owning design already needs that
decision recorded.

Read the portable [harness theory](references/harness-theory.md) when the
review needs enough of the task relation to distinguish a mechanism problem
from task-shaping, context-delivery, delegation, evidence, effect-authority,
recovery, or projection pressure. Reconstruct only what changes the mechanism
judgment; route formation of Agent-executable units to `task-shaping`, source
timing to `context-engineering`, and execution topology to `agent-delegation`.
The theory is an operational projection, not a new semantic source or admission
mechanism. Read [concepts](references/concepts.md) only when their detailed
terms—mechanism, policy, adapter, prompt guidance, durable fact, projection,
observation, review, acceptance, or action—are being conflated.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this Skill's read-only fallback in `references/sequence.md`.
Read only P15, P04, P13, and P16.

## The three-question method

Mechanism design begins with the same three questions that orient an acting
subject: **what am I, where did I come from, and where am I going?** Here they
are not a persona exercise. They recover the object's ontology and ownership,
its material and causal history, and the transformation the system actually
needs. A proposed queue, lock, reviewer, retry, or record is not understood
until all three answers agree.

The questions constrain one another. Identity without origin becomes taxonomy;
origin without identity becomes chronology; destination without either becomes
solutionism. A coherent answer explains why this object, under these conditions,
needs this transition—and why a heavier one is unnecessary.

### 1. Identity — what is this, and who owns it?

Form the concrete object before diagnosing it:

- Is it a mechanism, policy, adapter, prompt/Skill judgment, durable fact,
  projection, evidence, or domain decision?
- What is its unit and cardinality? What begins it, ends it, and can delete it?
- Which actor owns the fact, effect, judgment, verification, and acceptance?
- Which other object is it often confused with?

Identity is a relation, not a name. A file called `settlement` may be an adapter
format repair, a Run terminal transition, or a semantic claim; the label grants
none of those authorities. If one proposed object needs several unrelated
owners or terminal conditions, split the object before designing machinery.

### 2. Origin — what pressure and lineage produced it?

Reconstruct the case without relying on the proposed solution:

- What failure or representative counterexample was actually observed, under
  which operating conditions, and with what consequence?
- Which current instruction, policy, adapter, record, or mechanism already
  touches that failure?
- Which part of the present shape preserves a hard constraint, and which part
  is inherited implementation history, framework imitation, or fear?
- What source evidence distinguishes a recurring problem from “an Agent might
  do the wrong thing”?
- Which contradiction, if resolved, changes the available treatment of the
  secondary problems?

Origin is causal rather than chronological. A long history does not justify a
mechanism, and a recent failure can justify one when concurrency, process loss,
bypass, or an untrusted boundary makes judgment insufficient. Repair the
present owner before creating a parallel owner.

### 3. Destination — what relation must become true?

Describe the desired system after the intervention, not the desired feature:

- What exact fact, effect, or mechanical property must hold?
- Is the needed change better judgment, a different policy, a repaired owner,
  a deterministic boundary, or new enforceable state?
- What crosses an effect boundary, what remains observation, and who may review
  or accept the result?
- What is the terminal condition, failure behavior, recovery owner, and
  deletion path?
- Which precision is safety-critical, and which can become explicit `unknown`
  to remove state and failure paths?

Destination is not maximal robustness. It is the smallest transition that
resolves the present contradiction while preserving hard constraints. Retain
exactness for destructive effects, concurrent ownership, security or
disclosure boundaries, irreversible acceptance, and causal identity needed
for safe replay. Trade away diagnostic completeness or historical
reconstruction when the loss is visible, reversible, or ordinarily
inspectable.

### Synthesize the treatment

Only after the three answers are coherent, compare forms in this order:

1. keep the design and correct the local misunderstanding;
2. clarify a prompt, Skill, design statement, or policy;
3. reuse, narrow, merge, or repair the existing owner;
4. strengthen a deterministic check at that owner's boundary; or
5. propose a mechanism only when software must preserve a unique property that
   judgment and current owners cannot.

Compare the candidate with the strongest simpler alternative. Count the whole
burden: concepts, schemas, records, transitions, callers, adapters, tests,
operations, failure modes, recovery, migration, compatibility, and future
explanation. A new mechanism must have one non-duplicated job and a stated
retirement path. “More explicit,” “more robust,” and “future-proof” do not earn
it.

Choose `keep`, `prompt`, `reuse`, `simplify`, or `mechanism-candidate`. This is a
recommendation, never approval. Derive the result from object, epistemic claim,
effect, and authority before consulting a similar case. Read the [worked cases](references/cases.md)
only after forming an initial three-question answer; use them to compare
relations and reopening evidence, not to select a result by resemblance.

## Prompt-first boundary

A prompt, Skill, or policy clarification is normally sufficient when:

- the desired behavior is a contextual judgment rather than a mechanical
  invariant;
- an error is visible before irreversible effects escape;
- the actor can correct the result through the ordinary path;
- no concurrent writer, untrusted caller, security boundary, or crash-surviving
  obligation must be controlled; and
- representative evidence does not show that the instruction is repeatedly
  ignored under the actual execution profile.

Do not dismiss prompt-level treatment merely because it is not enforced. Do not
accept it merely because it is cheaper. Match the form to the property.

## Separate observation, judgment, authority, and next action

When reviewing an Agent harness, do not let one `verification`, `success`, or
`retry` label collapse different meanings:

- **Mechanical observation** establishes directly observable facts: a file
  exists and is readable, bytes match a digest, a schema parses, a command
  exits as specified, or a deterministic assertion holds. Artifact inspection
  may confirm required shape and references; it does not establish that the
  artifact solves the human objective.
- **Semantic review** judges fitness, quality, relevance, design conformance,
  and whether the observed output meets the intended result. The producer must
  not certify this judgment. Use an independent reviewer or return it to the
  human Principal.
- **Acceptance** authorizes adoption of the result. Review evidence may inform
  acceptance but does not grant it.
- **Next action** is a separate orchestration choice. A failed mechanical check,
  adverse review, missing authority, unknown standing, and transient provider
  error do not imply the same follow-up.

Do not solve this separation with one large cross-module action vocabulary.
First reduce proposed operations to their effect relation:

- **observe** an existing subject without changing the producer result; this is
  a read, not a state-changing runtime action;
- **run** one new execution from one explicit input; or
- **control** one existing live execution, with only the controls the owner
  actually supports.

Then return the remaining meanings to their owners. Mechanical checking and
semantic review are different observation policies. Correction and acceptance
are domain mutations. Settlement and recovery are lifecycle-owner internals.
Safe transport replay is adapter policy. Continuation and rerun are reasons or
lineage on a new execution request, not additional peer actions.

Classify by effects, not labels. A command called `test`, `verify`, `review`, or
`inspect` is still a new execution when it can mutate source, workspace,
database, or an external system; it must use the ordinary run/effect boundary.

An adverse semantic review normally leads to a domain correction, acceptance
refusal, or a new explicit execution, never a harness-owned automatic retry. A
deterministic test can prove the behavior encoded by that test; it cannot by
itself prove that the product or design is good. Enforce this distinction
through existing result, review, and acceptance owners rather than adding a
universal review queue or retry controller.

As a bounded design probe, ask an unfamiliar Agent to classify representative
cases without teaching it an exception table. If it repeatedly confuses verbs
or invents new ones, derive the difference from target, input identity, effect
relation, epistemic claim, and authority instead of expanding the enum. This is
evidence for the current review, not a standing gate or required ceremony. The
current single-evaluator [evaluation notes](references/evaluation.md) retain a
failed flat-vocabulary probe, one supported explanation probe, a theory
authoring fixture, and a `transfer-unverified` blinded-evaluation plan; do not
treat the fixture or plan as transfer evidence.

## Recurring mechanism traps

- an admission mechanism created to stop new mechanisms;
- a registry whose only purpose is to track registries or design concepts;
- a lifecycle state added only to prove that a review step occurred;
- a durable record that copies a source already able to answer the question;
- a generic retry, queue, lock, or recovery layer without a named failure it
  uniquely controls;
- a `verification` or `settlement` state that silently combines artifact shape,
  semantic fitness, review, and acceptance;
- an automatic retry that is actually an unrecorded correction or a second
  effectful execution;
- a hook added because “prompts are unreliable” without a representative prompt
  comparison;
- a mandatory artifact or checklist that outlives the decision it helped form;
  and
- importing a framework's session, workflow, or plugin machinery because its
  feature list resembles the local problem.
- encoding temporary Agent roles or one observed team topology as runtime
  species, lifecycle states, or scheduler truth when generic Task/Run/evidence
  sidecars already provide the required discipline.

These are investigation signals, not automatic rejection rules. A concrete
case may still justify one of them when its unique control property and burden
are proved.

## Decision-ready explanation

A correct review has not been delivered merely because every claim is linked or
every finding is listed. The live response must let the actual design owner
understand and decide without first reconstructing the system from code, prior
messages, or the durable review record. Evidence remains essential, but links
are drill-down paths rather than the missing explanation.

Build the explanation in this order:

1. introduce the object in plain language—its purpose, unit, owners, and place
   in the larger system;
2. trace the normal path from intent through effects, evidence, review, and
   acceptance;
3. explain the observed pressure and how the current design handles it;
4. show the proposed relation, current-to-target delta, retained hard
   constraints, and complexity removed or deferred;
5. explain the material failure/recovery path, tradeoffs, intentional unknowns,
   and strongest simpler alternative;
6. state the recommendation and exact human decision or next action, with
   consequential alternatives when a real choice exists; and
7. place source and code links beside the claims they support so the reader can
   inspect details after understanding the design.

Do not substitute `READY`, `CHANGES_REQUIRED`, a changed-file list, test counts,
mechanism IDs, or source links for this working model. Do not force artificial
options when the user requested findings rather than a decision. Calibrate
length to consequence: a local mechanism may need three paragraphs; a runtime
architecture may need a compact module map and one end-to-end flow. Concision
means removing information that does not change judgment, not removing the
information needed to judge.

As an expression probe, give the review without repository access to a reader
who has not followed the implementation. The handoff is sufficient only if the
reader can explain what the system is, how the parts interact, what changes,
what can fail, which tradeoff is being recommended, and what their decision
authorizes. This is a behavior test for the current review, not a standing gate
or required artifact.

## Decision-ready return

Return the smallest self-contained explanation that lets the design owner act:

```text
Conclusion and recommendation:
System in plain language — purpose, modules, normal path, and acceptance owner:
Identity — object, unit, owner, and commonly confused neighbor:
Origin — observed pressure, conditions, lineage, and current owner:
Destination — target relation, hard constraints, terminal/recovery boundary:
Smallest sufficient treatment: keep | prompt | reuse | simplify | mechanism-candidate
Strongest simpler alternative and its material shortfall:
Current-to-target change — what stays, moves, merges, disappears, or remains unknown:
Added and removed complexity:
Precision intentionally not preserved:
Observation, judgment, and acceptance owners:
Public action surface and owner-internal meanings:
Material failure and recovery story:
Decision or next action requested — options, immediate result, and tradeoff when applicable:
Evidence and disconfirming observation:
Residual risk and acceptance owner:
```

Do not create this packet as a required file by default. Edit the owning design
directly when authorized; otherwise return it in the conversation. The field
names are prompts for content, not a form that must be emitted literally.

## Boundaries and routing

| Need | Owner |
|---|---|
| Review whether a proposed agent-system mechanism is necessary and proportionate | this Skill |
| Shape a requested task into stable direct, guarded, transformed, or escalated work units | `task-shaping` or the owning domain Skill |
| Deliver authoritative source context at the right action boundary | `context-engineering` |
| Decide and operate direct versus delegated execution topology | `agent-delegation` |
| Decide whether a recurring need should be a Skill, artifact, runtime, projection, or no new form | `form-guidance` |
| Design an end-to-end reliability relation after a concrete failure is established | `systems-engineering` |
| Review defects in an implemented patch | `code-review` |
| Restructure already accepted mechanisms without changing behavior | `structural-refactoring` |
| Engineer or test the prompt expression of a Skill | `skill-engineering` |
| Approve architecture, runtime effects, or residual risk | owning project process and authorized human |

## Completion standard

The review is ready when identity, causal origin, and destination form one
coherent relation; the current owner and observed pressure are reconstructed
independently of the proposed solution; the strongest prompt-level or
existing-mechanism alternative is compared; full lifecycle burden and
intentional imprecision are explicit; and evidence that would reverse the
recommendation is named. Its handoff is ready only when a design owner can
restate the system, material delta, tradeoff, and requested decision without
opening linked source. It fails if it responds to complexity by introducing a
new review system, mandatory state, or standing process, or if correct evidence
is delivered in a form that leaves the owner unable to judge.
