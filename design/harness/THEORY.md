# Agent harness theory

> **Status:** a project-level working theory derived from the accepted Rossovia
> architecture and retained practice research. It explains how to judge and
> evolve a harness; it does not create a runtime protocol, authorize an effect,
> or amend the Principle Sequence.

## Lineage and authority

**Primary lineage:** P15 — choose the smallest effective transition that
preserves hard constraints. **Supporting lineage:** P04, P09, P13, and P16;
P11 and P14 constrain, respectively, authority and rebuildable representations.
Read
the [Sequence](../../principles/SEQUENCE.md) first and the relevant
[P15](../../principles/interpretations/P15.md),
[P04](../../principles/interpretations/P04.md),
[P09](../../principles/interpretations/P09.md),
[P13](../../principles/interpretations/P13.md),
[P16](../../principles/interpretations/P16.md),
[P11](../../principles/interpretations/P11.md), and
[P14](../../principles/interpretations/P14.md) interpretations when applying it.

This document is an architectural-method derivative. The Sequence remains the
only semantic root; accepted architecture still owns module boundaries; a Task
or Principal still owns its concrete decision. The portable
[`mechanism-design-review` projection](../../skills/mechanism-design-review/references/harness-theory.md)
is an action-facing condensation, not another authority. The detailed
[control-debt inquiry](../../principles/research/agent-harness-control-debt-and-guided-recovery.md)
remains evidence and hypothesis, not a substitute canon.

## Thesis

An agent harness is **task engineering for Agents**. Its primary job is to
transform work expressed in human terms into work units that a bounded Agent
can execute reliably: reconstruct the real task, re-express it as a concrete
transformation, construct its working environment, split or keep it whole,
and recompose partial results without losing the original constraints.

A harness can improve the conditions under which an Agent acts, but mechanical
evidence alone cannot guarantee the semantic correctness of open-ended work.
Its achievable work is narrower and more valuable: make the task and its
environment intelligible to a fallible actor, provide sufficient capability
inside a known effect boundary, leave evidence that can be inspected, recover
from reversible error, and prevent a candidate from silently acquiring truth,
effect, or acceptance authority.

Reliability is therefore not the number of gates passed nor the absence of
wrong intermediate thoughts. It is the ability to preserve the distinctions
that make a mistake observable, containable, and correctable before an
unauthorized or irreversible consequence escapes. A simple harness may be more
reliable than a comprehensive-looking one when it creates a better executable
task with fewer false records, lifecycle branches, and recovery stories.

## Primary object: task transformation

A Task is not merely the user's sentence, a prompt, a database row, or a Todo
list. It is a relation among an intended change, the objects and sources that
constrain it, the environment in which work can occur, the effects an actor may
cause, the evidence the result must leave, and the owner who can accept it.
Task engineering preserves that relation while changing its form for an Agent.
The analogy to human-facing engineering is deliberate but bounded: established
systems engineering also distinguishes stakeholder expectations, requirement
definition, logical decomposition, implementation, integration, verification,
and validation ([NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)).
Agent task engineering must additionally account for model context,
probabilistic judgment, tool capability, and prompt-sensitive execution.

```text
human intent + world and project sources + constraints + authority
                              │ reconstruct and re-express
                              ▼
    task model: object, desired change, invariants, evidence, acceptance
                              │ construct the environment
                              ▼
  context + workspace + tools + capabilities + budget + effect boundary
                              │ keep whole or partition
                              ▼
       one or more explicit Agent-executable work units / Runs
                              │ execute and return evidence
                              ▼
              candidates + observations + declared unknowns
                              │ recompose whole relations
                              ▼
       synthesis + mechanical checks + semantic review + acceptance
```

This is a transformation model, not a mandatory linear workflow. A small
local repair may move from one task model directly into one work unit. A large
cross-project change may recursively analyze, partition, execute, and
recompose. Research may produce no effectful candidate at all. The model says
which relations must remain truthful when a stage exists; it does not require
every stage for every task.

An **Agent-executable work unit** has enough identity to be acted on without
guessing: named inputs and source standing, one requested transformation,
available environment and capability, allowed effects, a completion or return
condition, and an evidence relation back to the whole. Stable execution does
not mean deterministic answers. It means that ambiguity, failure, and partial
success remain observable and cannot silently escape the unit's authority.

Decompose only where the cut creates a real boundary: independently knowable
sources, separable effects, bounded context, a stable interface, and evidence
that a synthesis owner can reconstruct. Files, roles, models, and topics do not
by themselves define valid units. Keep work whole when its constraints or
effects remain coupled. Recomposition is therefore not concatenation or
majority vote: it restores cross-unit invariants, resolves contradictions, and
forms one candidate for the original acceptance owner.

## Agent working environment: a receiver-specific local world

An Agent's **working environment** is the minimum-sufficient local world from
which that particular receiver can understand one bounded contribution, take
only the available actions, observe what happened, and return evidence that a
downstream owner can reconstruct. It is not synonymous with a prompt, context
window, workspace, tool list, process environment, or Run record. Those are
possible projections or bound parts of the relation.

The environment couples four relations:

| Relation | Minimum question it must answer | Typical contents |
| --- | --- | --- |
| **Cognitive** | What object and change are real, which concepts and sources govern them, and how does this contribution relate to the requested whole? | object and requested transformation; necessary concepts defined for this receiver; authoritative sources, revision, and standing; downstream use and explicit non-goals |
| **Attention** | What must be salient now, what can be discovered on demand, and what should be absent because it cannot change this action? | compact orientation; activated method; source pointers; volatile detail loaded at its decision boundary; omitted parent history and runtime maps |
| **Action** | Where can the Agent act, which capabilities actually exist, which effects are allowed, and when must it stop? | working location; model-visible tools; host capabilities; read/write or external-effect limits; resource envelope; stop, cancellation, and unavailable-capability behavior |
| **Evidence** | What observations can the environment produce, what can be checked mechanically, who judges meaning, who accepts, and what must return? | trace and artifact identity; explicit mechanical predicates; declared unknowns; semantic-review owner; acceptance owner; conclusion, evidence, uncertainty, and hand-off contract |

These relations are coupled but keep distinct owners. A source-rich prompt with
no real tool cannot create an action capability. A writable workspace without
the relevant whole can produce locally plausible but unusable effects. A test
can establish its predicate without judging semantic adequacy. A polished
return that loses source revision, changed effects, or retained decisions
cannot be safely recomposed.

### Construction criteria

A useful environment is:

- **self-contained for action:** the receiver can identify its object, next
  action, boundaries, non-goals, verification, and required return without
  reconstructing the parent's conversation;
- **decision-relevant:** every supplied concept, source, tool, and constraint
  can change the receiver's action or interpretation at the moment it appears;
- **source-truthful:** authoritative sources and their standing remain visible,
  while summaries, prompts, and cached views remain declared projections;
- **operationally real:** the workspace, tools, model binding, permissions,
  budget, and cancellation behavior described to the Agent match the actual
  invocation rather than an imagined harness;
- **effect-bounded:** allowed changes, external effects, withheld authority,
  single-writer ownership where needed, and stop conditions are explicit and
  enforceable at their real owner;
- **observable and reconstructible:** local observations and mechanical checks
  retain their narrow meaning, unknowns remain visible, and the return lets the
  next owner reconnect the contribution to the whole; and
- **economical:** irrelevant history, parent orchestration maps, ceremonial
  titles, duplicate doctrine, and detail that belongs on demand do not consume
  the receiver's attention.

These are reasoning criteria, not a score, schema, environment registry, or
mandatory preflight. Minimum-sufficient is receiver- and action-specific: the
same source or tool may be essential for one contribution and noise for
another. Removing a hard constraint is not economy, while including every
possibly relevant detail is not self-containment.

Prompt text is only one projection of this world. It can express the cognitive
relation, make selected boundaries salient, and name expected evidence; it
cannot by itself supply a tool, grant an effect, establish the real workspace,
create independent review, or confer acceptance. Write prompt content for the
receiver. Omit parent lifecycle and module maps that do not change its action.
When any necessary term could change action or return, define it at first use
in one operational sentence: the object it denotes, its boundary, and why it
matters now. A title or persona cannot substitute for a concrete object/action,
downstream use, and non-goal relation.

### Ownership and assembly

No new module owns “the environment.” It is assembled for one invocation from
decisions and facts owned elsewhere. Runtime ownership follows
[Decision 055](../decisions/055-rossovia-runtime-module-ownership.md); the
method boundaries follow [`task-shaping`](../../skills/task-shaping/SKILL.md),
[`context-engineering`](../../skills/context-engineering/SKILL.md), and
[`agent-delegation`](../../skills/agent-delegation/SKILL.md):

| Owner | Contribution to the working environment | Boundary retained |
| --- | --- | --- |
| Workbench / domain owner | authoritative Project/Task meaning, correction, and acceptance standing | does not choose execution topology or run the Agent |
| `task-shaping` or owning domain method | forms the executable unit, whole obligation, local transformation, and reconstruction boundary | does not release Runs or choose provider policy |
| `context-engineering` | selects authoritative information and times its receiver-facing delivery | does not author source meaning or grant capabilities |
| `agent-delegation` | forms a bounded contribution, downstream use, non-goals, and evidence-bearing return relation | does not create another lifecycle or acceptance owner |
| Orchestration | binds the authorized Run identity, resolved execution request, control, resource allocation, and shared-effect ownership | does not own Task meaning, provider translation, or acceptance |
| Work Cell | executes one immutable bounded invocation with caller-supplied capabilities and emits scoped mechanical evidence and at most one final | does not infer a Task, child organization, semantic review, or acceptance |
| Integrations | translate the bound request and tools to provider, host, workspace, and external-system protocols | do not own generic lifecycle or domain truth |
| Presentation | projects owner facts for a human or Agent entry surface | does not become an execution, liveness, or acceptance source |

The Main Agent or direct caller composes the receiver-facing request from these
owners; Orchestration and Work Cell bind the operational parts they actually
own. A standalone Work Cell can therefore receive an equivalent bounded
environment from a direct experiment without acquiring Workbench or
Orchestration state.

### Construction and reconstruction reasoning

Use this sequence only as a reasoning aid; collapse steps for simple work and
do not encode it as a workflow:

1. Form the whole and the smallest coherent unit through its owning method.
2. Name the receiver's actual object and next action, then select only the
   concepts, sources, and whole relation needed to perform it.
3. Bind the real workspace, model-visible tools, host capabilities, resource
   limits, effects, and stop behavior; do not promise unavailable operations.
4. Make the decisive constraints salient now and leave recoverable detail on
   demand, with every necessary action- or return-changing term defined
   operationally.
5. State local observations and mechanical predicates separately from
   semantic-review and acceptance ownership, then require a return that carries
   conclusion, evidence, unknowns, changed effects, and downstream use.
6. At hand-off, reconstruct the contribution against its named sources,
   effect evidence, whole obligation, and retained decisions before using it as
   a premise.

For a receiver-facing expression probe, freeze the underlying task facts and
obligations, use one carrier, and give a fresh Agent either the actual earlier
prompt or the complete receiver-specific candidate. Ask it to restate the
object, relation to the whole, boundaries and allowed effects, non-goals,
verification, and return. A request to explain an undeclared term is a
comprehension failure. The prompts may express the same work differently, so
attribute any result to the complete working-environment expression rather than
one clause. Retain prompt/output noise plus corrective follow-ups. This tests
comprehension, not task correctness: mechanical inspection confirms the
declared surfaces exist, an independent source-aware reviewer judges semantic
performance, and the named owner alone accepts. Carrier transfer is a separate
probe that sends the same complete candidate prompt unchanged through each
carrier. No matched fresh-Agent comparison has yet established portable benefit
for this formulation; treat it as a forward probe until that evidence exists.

## Agent differentiation and organization

At the theory level, the system begins with one general Agent model: receive a
task and context, reason, use available capabilities, and return a result with
evidence. Different models and providers may have different capability
profiles, but `researcher`, `implementer`, `reviewer`, and `coordinator` are not
different runtime species. They are temporary differentiations created by the
current task description and working environment.

```text
                         one general Agent model
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
 task + sources + tools A   task + workspace + tools B   review task + sources C
          │                        │                        │
        Run A                    Run B                    Run C
          └──────── evidence / dependency / return relations ────────┘
                                   │
                         temporary Agent organization

sidecar discipline:
  Workbench Project/Task standing and correction
  Orchestration Run identity, budget, control, recovery, effect ownership
  Work Cell capability boundary, mechanical evidence, and final record
```

The organization is therefore the current relation among differentiated work
units, not a code-defined org chart. A concrete contribution relation may be
useful prompt context when it changes attention or responsibility; a title
alone does not. Neither needs its own runtime type, lifecycle, queue, or
authority. The same general Agent model can participate in different
organizations because the task, sources, workspace, tools, capability, budget,
isolation, required return, and predecessor relations differ.

This is neither a loose verbal collective nor an ungoverned swarm. Discipline
comes from sidecar systems that are deliberately more rigid than the semantic
organization: Workbench keeps Project/Task facts and correction standing;
Orchestration keeps exact Run/effect identity, resource limits, control, and
recovery; Work Cell constrains capabilities and records mechanical execution
evidence. These systems regulate what a work unit may consume, change, claim,
and return without deciding that a particular organization must contain fixed
roles or a fixed graph.

Code should encode an organizational relation only when software must preserve
a hard property across misunderstanding, concurrency, process loss, or bypass.
For example, exact Worktree writer ownership deserves a mechanism; a
`researcher -> implementer -> reviewer` sequence normally does not. When a new
task can form a new temporary organization only by adding a role enum, team
schema, lifecycle branch, or scheduler state, treat that as evidence that the
sidecar has absorbed semantic organization.

### Organization substitution probe

Hold the Agent model and sidecar primitives fixed. Change only task description,
environment, capability, and return relations. The same system should support a
direct one-Run repair, a multi-Run cross-project change, and an independent
inquiry/review organization without adding a new lifecycle or role type. This
is an architectural substitution test, not proof that any particular topology
improves performance. A real performance claim still needs matched practice.

### Resource binding, usage, and budget authority

Model and cost information cross several owners without giving each owner the
same authority. Integration observes provider availability, implements the
provider protocol, and supplies time-versioned pricing semantics when the
provider exposes an attributable form. Orchestration selects one resolved
execution profile for the work, allocates the caller's resource envelope,
aggregates observations across Runs, and returns any extension or material
tradeoff to its authority owner. Work Cell receives that resolved binding and
immutable per-Cell envelope, enforces the limits that its host and driver can
actually enforce, and records normalized usage plus an attributable cost
observation in the Cell final. The Cell does not choose its own model, extend
its envelope, maintain a cross-Run ledger, or interpret a provider's commercial
policy.

This distinction preserves standalone experimentation. A direct experiment and
an Orchestration-owned Run can create equivalently bound Cell invocations with
the same model binding, driver, workspace, capabilities, and envelope. Each
invocation records its own usage and cost observation through the same evidence
contract, schema, semantics, and standing; stochastic executions are not
expected to produce equal values or share one Cell identity. The difference is
who formed and authorized the work, not what a Cell final means. A subscription,
mixed route, missing usage report, or unattributable invoice remains an explicit
unavailable or estimated cost standing; it is never converted to zero merely
because the Cell cannot assign a marginal dollar amount.

An execution envelope is not a budget approval system. Duration, optional step
limits, output bounds, or other enforceable per-Cell constraints can live at the
execution boundary. Model catalogs, fallback order, total Mission spend,
whether another Run may start, and whether more budget is approved require
relations outside one Cell. A substitution probe should change a provider or
pricing adapter without changing Cell-core semantics, and should change the
Run allocation policy without changing how one already-bound Cell records its
execution.

### Three task-engineering illustrations

These are authoring fixtures, not evidence that an unfamiliar Agent can
transfer the theory. Actual unit formation belongs to `task-shaping` or the
owning domain method; context delivery and execution topology retain their own
owners.

| Human request | Task and environment transformation | Partition and recomposition |
| --- | --- | --- |
| Repair one deterministic parser regression. | Bind the failing input, expected parser contract, exact workspace, editable package, permitted test command, and absence of external effects into one local work unit. | Keep it whole because implementation and discriminating regression share one small causal surface; focused checks establish the encoded behavior and the maintainer accepts the patch. |
| Migrate one provider across a runtime, deployment repository, and guide. | Reconstruct the shared protocol and compatibility contract first; bind each repository unit to its exact source, interface, capability, and effect authority while keeping credentials and deployment authority outside ordinary implementation. | Split separable source and adapter work, but keep cross-repository protocol judgment and release authority with one synthesis responsibility; recompose through interface, digest, version, and behavior relations rather than concatenating reports. |
| Investigate whether an unfamiliar orchestration technique should change the architecture. | Define a read-only inquiry whose result is a source-linked working model and decision, not an assumed code patch; supply current architecture sources, primary upstream evidence, and explicit uncertainty. | Partition only independent source families or counter-hypotheses, then synthesize against the one architectural question; a valid whole may conclude no change and no effectful candidate. |

The portable Skill's evaluation marks theory transfer `transfer-unverified`.
A later blinded comparison must keep expected answers hidden and retain raw
outputs before this document claims that the model generalizes across tasks.

## Three constraint axes

Task transformation is constrained by three coupled axes. The harness is an
**attention architecture under bounded context** as well as an evidence and
effect system. A consequential task-analysis, environment, partition,
execution, or recomposition decision should be checked for material
consequences on all three axes; an improvement on one that destroys another is
not reliability.

| Axis | Governing question | What it protects | Typical false substitution |
| --- | --- | --- | --- |
| Attention and cognition | Which actor needs which decision-relevant source, at what moment and in what form, to take the next responsible action? | orientation, meaningful judgment, whole-task continuity, and recoverable context | treating a larger prompt, more Agents, a dashboard, or a Todo as understanding |
| Epistemology | What kind of claim is this, what evidence can establish it, and what remains judgment or uncertainty? | truthful facts, scoped mechanical evidence, independent semantic judgment | treating a schema, test, summary, or confidence score as total quality |
| Effect and authority | What crosses a boundary, who owns causal identity and control, and who may authorize adoption? | containment, exact effect ownership, and explicit acceptance authority | treating a reviewer, projection, or provider response as effect or acceptance authority |

They are coupled but not reducible. A detailed source may be epistemically
authoritative yet be the wrong thing to reveal to a worker at this instant. A
semantic reviewer may have the right sources but no authority to publish. A
single-writer lock may protect a Worktree while contributing no knowledge of
whether a Task remains meaningful. Do not solve one axis by giving it ownership
of the others.

## Attention architecture: cognition under bounded context

At scale and over long-running work, a harness cannot assume that all
potentially relevant history remains simultaneously available, equally
salient, or equally useful. Long-context experiments show that capacity alone
does not guarantee robust use of relevant information
([Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/)). The harness
must therefore preserve a relation between **source**, **recipient**,
**timing**, and **action**, rather than assume a universal context window,
L1/L2/L3 taxonomy, or permanent memory layer. Context is sufficient only when
it lets the actual actor reconstruct the decision it is authorized to make
without making a projection into a second authority.

Stable purpose, hard authority, and the current Task should remain easy to
recover. Volatile operational detail should arrive on demand at the boundary
where it changes a decision. A compressed report is useful when it preserves
the claims, evidence pointers, uncertainty, and return conditions another actor
needs; it is harmful when it prevents that actor from recovering a decisive
source. This makes progressive disclosure a timing relation, not a doctrine of
three fixed containers. The Agent Skills specification provides one concrete
delivery surface—metadata at discovery, instructions on activation, resources
on demand—without proving that those three containers are a universal cognitive
architecture ([Agent Skills Specification](https://agentskills.io/specification#progressive-disclosure)).
Real harness compaction also makes the loss explicit by retaining structured
summaries, recent messages, and cumulative file operations rather than claiming
that compression preserves everything
([Pi compaction](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md)).

The following decisions derive from this relation rather than from a feature
list:

- **Reveal** a source when an actor cannot form or verify its next authorized
  judgment without it. Do not reveal merely because it exists, nor replace a
  missing source with a confident summary.
- **Compress** when a bounded contribution must return to an actor who needs its
  decision and evidence, not its entire trace. Retain a path back to decisive
  sources and label what compression makes unknown.
- **Activate a Skill** when a recurring action gap needs a reusable judgment at
  the time of action. A Skill is an attention-facing method, not a policy store,
  fact source, or required workflow step.
- **Delegate** when a bounded contribution removes a named context conflict,
  blast radius, latency bottleneck, or attention load while its result can be
  reconstructed from an evidence-bearing return. More workers do not create
  more understanding; concurrent opinions without differentiated sources,
  roles, or probes do not by themselves establish independent evidence.
- **Keep work direct** when the Main Agent already holds the necessary context,
  effects are coupled, or reconstructing the handoff costs more than the local
  work. Nested delegation must earn the same relation; it is neither invalid by
  depth nor useful by default.
- **Assign explicit synthesis responsibility** whenever several Runs make
  partial claims. In Rossovia the Main Agent owns it: reconstitute the whole,
  check cross-contribution relations, and hand a candidate to review;
  aggregation is not a vote or acceptance. Multi-agent research reports both
  the benefit of separate context windows and the much higher token cost and
  poor fit for highly interdependent work
  ([Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)).

The familiar harness forms are different operations on this attention
relation, not independent features:

| Attention operation | Typical form | What it must preserve |
| --- | --- | --- |
| Select and time source exposure | progressive disclosure and on-demand context | the source needed for the next authorized judgment |
| Compress recurring method | Skill or scoped guidance | reusable judgment plus a route to decisive sources, not hidden policy |
| Stabilize current orientation | Project/Task description and current correction | purpose, current standing, hard constraints, and ownership |
| Partition simultaneous work | direct or delegated Runs | bounded inputs/effects and an evidence-bearing return relation |
| Explore alternatives | differentiated reviewers or swarm perspectives | distinct sources or hypotheses; correlation is not independence |
| Restore the whole | Main-Agent synthesis | cross-unit constraints, contradictions, uncertainty, and original acceptance relation |

[`context-engineering`](../../skills/context-engineering/SKILL.md) owns the
concrete delivery/reconstruction method—what source reaches which actor and
when. [`agent-delegation`](../../skills/agent-delegation/SKILL.md) owns the
bounded contribution and evidence-return method. This theory supplies their
shared explanatory boundary: neither changes fact authority, effect authority,
or acceptance merely by improving attention. They remain separate Skills
because their recurring action gaps and artifacts differ; this document does
not merge them into a generic context or swarm mechanism.

## The object: kinds of things and who may speak for them

The first design act is ontological. A name such as `verification`, `retry`, or
`success` is not an owner. Each object has a unit, source, authority, terminal
condition, and commonly confused neighbour.

| Object | Truthful owner | It may establish | It must not establish |
| --- | --- | --- | --- |
| Intent, Task, or acceptance contract | Principal or delegated domain owner | what is requested, constrained, or eligible for decision | that a Run has performed it |
| Run and effect boundary | Orchestration and the boundary-owning mechanism | one causal execution identity and permitted controls/effects | semantic quality or acceptance |
| Cell execution | Work Cell | bounded tool activity, declared terminal evidence, mechanical result shape | that the work solved the Task |
| Adapter | Integration for one external protocol | request/response translation, provider identifiers, error semantics | generic lifecycle, Task meaning, or final authority |
| Mechanical evidence | its deterministic observer | reproducible facts about a named existing subject | relevance, completeness, usefulness, or intent satisfaction |
| Candidate / result claim | its producer | what was proposed and what evidence it cites | independent correctness |
| Semantic review | an independent, source-aware reviewer | a reasoned finding about candidate fitness and uncertainty | effect, merge, publication, or acceptance authority |
| Acceptance | Principal or explicitly designated accepting owner | adoption, residual-risk judgment, or authorized irreversible commitment | retrospective proof that every judgment was objectively correct |
| Projection | its declared source and renderer | an inspectable reconstruction of source facts | independent fact, liveness, or authority |

Rossovia's target ownership map makes this concrete: Workbench manages Project
and Task; Orchestration owns Main-Agent interpretation, Run lifecycle, and the
shared-Worktree single writer; Work Cell owns one bounded execution and its
mechanical evidence; Integrations own foreign protocols; Presentation only
projects facts. See [Decision 055](../decisions/055-rossovia-runtime-module-ownership.md)
and the [migration map](../organization/rossovia-runtime-ownership-migration.md). A module can
be physically moved during migration without moving the fact or authority it
does not own.

## Four different epistemic acts

Many harnesses become opaque by calling all of these "verification." They are
not phases of one state; they answer different questions and need different
owners.

1. **Observation:** What happened or exists that can be reproduced now? A
   digest, path, schema, command exit, tool trace, and encoded assertion can
   answer this. An observer that mutates a workspace or calls an external API
   is an execution, not an observation.
2. **Mechanical conformance:** Does that observed subject satisfy an explicit,
   decidable contract? This is a scoped observation: e.g. the artifact has the
   declared JSON shape or the test named in the contract passed.
3. **Semantic judgment:** Given sources, intent, candidate, and evidence, is
   the result actually relevant, adequate, safe enough, and faithful to the
   requested transformation? This remains an interpretive comparison with
   uncertainty, even when the reviewer is an Agent.
4. **Authority:** May this candidate cause an effect or be adopted? Effect
   authority belongs at the causal boundary; acceptance belongs to the
   Principal or a delegated accepting owner. A review recommends; it does not
   authorize.

Which decisions require human oversight is risk- and context-dependent, but
the roles and responsibilities must be explicit; not every AI system needs the
same human checkpoint ([NIST AI RMF 1.0, Appendix C](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf)).

The sequence is not universally serial. Low-consequence local work may need a
test and human inspection, while a publication may need fresh authority before
the write and independent review before acceptance. What must not change is the
meaning of the evidence: a mechanical pass remains a mechanical pass; a review
remains a claim for an acceptance owner.

This separation parallels the established distinction between verifying
conformance to requirements and validating fitness for intended use
([NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)).

## Engineering tests as phase-appropriate feedback

An engineering test is an intervention into uncertainty about a named subject.
It arranges conditions, observes a result, and compares that result with an
explicit predicate so the engineer can either change the next action or retain
evidence for a relation that has become worth protecting. Its value is not the
number of cases written or passed. Its value is the uncertainty, rework, or
consequence it removes relative to the cost of authoring, running, diagnosing,
maintaining, and carrying it through later Agent continuations.

This makes testing part of the engineering learning loop, not a separate
ceremony performed after implementation. A test can help discover
whether a design direction is viable, localize an observed failure, preserve a
settled contract, prove that independently built parts compose, or reduce
release risk. Those purposes require different evidence. Treating them as one
ever-growing regression suite makes the suite look like progress even when it
is only preserving yesterday's assumptions.

The relevant phase is a local epistemic relation, not a project-wide maturity
label or lifecycle state. A provider adapter may already need release-hardening
while the user interaction that calls it remains exploratory. Work can also
move backward when evidence invalidates a premise. No runtime, registry, or
mandatory test workflow is implied by these distinctions.

[`task-shaping`](../../skills/task-shaping/SKILL.md) supplies the subject of the
test: the whole obligation, the local work unit, its boundary, and the evidence
relation by which results can be reconstructed. The test must not silently
redefine that unit or reduce its semantic acceptance to an assertion. The
[`practice-cycle`](../../skills/practice-cycle/SKILL.md) consumes the observed
result and decides which changed practice, if any, should follow. The test does
not own that next action. If pass and fail would lead to the same decision and
the assertion does not guard a settled relation, the test currently has little
feedback value; defer it or state the different evidence purpose it serves.

| Current relation | What remains uncertain | Useful test movement | Typical excess |
| --- | --- | --- | --- |
| **Exploration and formation** | whether the object, interface, or treatment is the right direction | run the smallest discriminator that can separate the candidate from a plausible wrong direction; prefer a short causal probe and revise freely | enumerating every branch of a representation that is still likely to change |
| **Stabilization** | whether the chosen relation survives observed failures and preserves its public neighbors | retain regressions for discovered causes; add focused boundary and compatibility checks around load-bearing contracts | turning every imaginable edge into permanent inventory without a failure, consequence, or contract that makes it relevant |
| **Integration** | whether separately plausible parts preserve identity, ordering, capability, evidence, and effects when composed | test the relation at the real seam and one representative end-to-end path; fake only what is outside the subject of the claim | duplicating each component's internal suite or calling isolated passes integration evidence |
| **Release hardening** | whether residual faults under the intended operating profile have unacceptable consequence | expand regression, restart, concurrency, degraded-dependency, recovery, and compatibility coverage in proportion to consequence and change surface | treating exhaustive-looking coverage as proof of product fitness or freedom from unknown failures |

Selection is therefore a qualitative information-cost judgment, not a score:
prefer the probe whose distinguishable outcomes remove the most
decision-relevant uncertainty or consequence for its authoring, execution,
diagnosis, maintenance, fixture-coupling, and continuation cost. A cheap test
that cannot change a decision is still noise; an expensive boundary test may be
the minimum valid move when it protects an irreversible effect.

One useful starting probe for a small new slice is **one forward case, one known
boundary discriminator, and one compatibility relation**. The forward case
shows that the proposed path can work. The boundary case separates it from the
observed or load-bearing failure that would invalidate the direction. The
compatibility case shows that a neighboring relation intentionally left
unchanged still holds. This is a heuristic for producing information early,
not a required count: one causal reproduction may be enough for a repair, while
a consequential protocol change may need several discriminators before its
direction is credible.

### Why exhaustive testing is often premature

Every durable test fixes an observation boundary, inputs, expected behavior,
and usually some representation of the implementation. When those relations
are provisional, a broad suite can create four kinds of false progress:

- it makes a green encoding of the current guess look like evidence that the
  guess is the right product or architecture;
- it couples fixtures and assertions to an interface that discovery still
  needs permission to change;
- it enlarges the edit, diagnosis, and maintenance surface, so later work
  spends continuations repairing tests for discarded assumptions; and
- it dilutes a discriminating failure among incidental failures, consuming the
  Agent's bounded attention without improving the next decision.

The alternative is not “test later” or “trust the Agent.” It is to buy the
next decision with the smallest credible evidence, then let observed failures,
settled contracts, integration relations, and consequence earn additional
coverage. An exploratory probe may be discarded when its premise disappears.
Promote it to a durable regression when it protects a relation that future
changes could otherwise break without timely observation.

### Evidence scope does not expand with the suite

Tests remain mechanical conformance even when there are thousands of them. The
raw trace, bytes, exit status, or timing is observation; the assertion says
whether that observation satisfies the encoded predicate. Neither establishes
that an open-ended Agent answer is relevant, an architecture is wise, or the
Principal should adopt the result. Those claims require source-aware independent
semantic review and the Principal or designated acceptance owner.

Agent and model evaluations follow the same boundary. A repeated task sample
can support a scoped empirical claim about an execution profile, especially
when it has a comparison and preserved raw outputs. It does not become a
deterministic product-quality gate by asserting preferred wording or by
collapsing reviewer judgment into a pass rate. Conversely, when a semantic
requirement has genuinely been reduced to a governed decidable contract,
automate that part and state the predicate narrowly.

### Safety-critical reopening

Phase-appropriate testing does not defer hard safety. Credentials and
disclosure, destructive or irreversible effects, concurrent effect ownership,
irreversible acceptance, and causal identity for replay are load-bearing from
the first effectful probe. If a candidate can cross one of those boundaries,
the initial discriminator must exercise the boundary rather than merely the
happy path.

Reopen the affected design and expand its evidence when a representative
observation shows an effect escaping containment; a new concurrency, crash,
untrusted-caller, or irreversible-effect condition enters the supported path;
an assumption about atomicity, idempotency, quiescence, or authority is
disproved; or the current observer cannot see the property it claims to
protect. Contain the affected effect path, reproduce the smallest causal case,
repair the owning boundary, and retain a regression for that cause. Expand to
adjacent fault classes only where shared causality or consequence justifies it.
This rule reopens work from evidence and consequence, not from an unlimited
list of imaginable failures, and it creates no global test gate.

### Why deterministic gates cannot prove semantic quality

Deterministic code is exact only about a property that has been explicitly and
governably reduced to a decidable predicate. A checker can
truthfully say, "these bytes parse," "this path exists," or "this test passed."
It cannot, from those facts alone, say that an architecture preserves the
Principal's intention, a report answers the real question, or an artifact is
adequate for a context it was not encoded to model.

Encoding an open-ended judgment does not remove interpretation; it freezes one
partial interpretation in code. The omitted sources, tradeoffs, novelty, and
counterexamples then become invisible behind a green gate. This is why a
mechanical validator must report its exact predicate. A producer's semantic
self-assessment is useful evidence, but it cannot count as independent review
or confer acceptance. Conversely, this is not an anti-automation claim: when a
semantic requirement has genuinely become an explicit decidable contract,
automate that *part* and keep the claim scoped to that part.

The distinction is epistemic, not hierarchical. A compiler may be a stronger
witness than an Agent for type conformance; an independent reviewer provides
semantic evidence separated from the producer for an open design tradeoff.
Neither substitutes for acceptance, and independence does not make a reviewer
infallible.

## Effects, causal identity, and action semantics

Design actions from what crosses a boundary, not from historical verbs. For an
orchestration runtime the stable public meanings are normally:

- **observe** an existing subject without changing its producer result;
- **run** a new execution from an explicit input and causal identity; and
- **control** one identified live execution only where the lifecycle owner can
  support the control.

`retry`, `continue`, `rerun`, `recover`, `verify`, and `review` are not thereby
forbidden words. They must be placed truthfully: a provider-safe request replay
is adapter policy; a continuation or reviewer purpose is lineage on a new
RunRequest; settlement/reconciliation is internal to the lifecycle owner; a
Task correction and an acceptance are domain mutations. A command called
`verify` that can edit files is still a new effectful execution.

The distinction matters most after ambiguity. A transport timeout before a
known provider effect may permit the adapter to replay an idempotent request or
query the provider. It does not entitle Orchestration to create a duplicate
Agent Run. A semantic rejection cannot be "retried" automatically: it has
changed the candidate's meaning and requires a correction, a fresh execution,
or a Principal decision. A second agent execution receives a new Run identity
and records its predecessor/reason, even if a user informally calls it a retry.
This follows the narrower transport rule that automatic replay is justified
only where request semantics are idempotent or the original effect is known not
to have occurred
([RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)).

Exactness belongs where later inspection cannot safely repair a mistake:
external or destructive effects, credentials and disclosure, concurrent effect
ownership, irreversible acceptance, and causal identity used for idempotency or
replay. The exact mechanism can be a single writer, transaction,
compare-and-set, serialization protocol, or partitioned ownership; Rossovia
specifically uses an exact Worktree single writer. Sensitive and irreversible
actions need controls beyond model behavior alone
([Vercel eve safeguards](https://github.com/vercel/eve/blob/main/docs/README.md#legal-and-safeguards)).

## Evidence, projections, and truthful unknowns

Not every useful display needs durable truth. A projection is valuable precisely
because it can be rebuilt from a named source; it must not acquire authority
because it is convenient or persistent. Current liveness is a common example:
a process handle can truthfully report live; a terminal Cell final can
truthfully report terminal; after a restart with neither, the honest result is
`unknown`, not a reconstructed "still running" fact.

This is intentional imprecision, not weakened reliability. Retain the source
facts needed to protect effects and recover work; make missing transient facts
visible rather than manufacturing a durable liveness registry. Add durable
state only when a named reader needs it to preserve a hard property across the
failure boundary, with explicit write authority, a concurrency and consistency
relation, lifetime, and retirement story. The same source/projection discipline
prevents dashboards, task lists, and status caches from becoming shadow
schedulers or approval systems.
Provenance records the entities, activities, and actors that produced something
so later owners can assess it; it is input to quality and trust judgments, not
the judgment itself ([W3C PROV Overview](https://www.w3.org/TR/prov-overview/)).

## Normal and failure movement

```text
Principal intent + sources + authority
                │ form Task / acceptance contract
                ▼
Main-Agent interpretation ──► explicit Run identity and effect boundary
                ▼
bounded Cell execution ──► candidate + mechanical evidence
                ├── observable reversible failure ──► correction / changed next practice
                ▼
independent semantic review ──► findings + uncertainty
                ▼
Principal or designated acceptance ──► accept | refuse | reopen
```

The diagram is a relation map, not a mandatory workflow engine. Every arrow
asks a different question. Failure should return to the nearest owner that can
change the failed relation: translate a provider quirk in its adapter; repair a
mechanical assertion at its observer; correct Task meaning through its domain
owner; ask an independent reviewer about semantic fitness; route irreversible
or disputed acceptance to the Principal. Do not add a global retry controller
because several of these paths happen to be described as failure.

A new attempt is useful when it changes a decision-relevant relation—sources,
Task form, context, capability, adapter, partition, budget assumption, review
finding, or authority. Repeating an idempotent delivery after a documented
transport failure can be safe adapter replay, but it is not learning. Repeating
the same failed Agent interaction with stronger prose is a new attempt with a
changed context relation; without comparative evidence, do not claim that it
removed the failure cause or constitutes a reliable recovery policy.

## Deriving a mechanism instead of accumulating one

When pressure appears, work in this order. This is a reasoning method, not a
mandatory admission form, runtime preflight, registry, or approval queue.

1. **Name the object and its owner.** Is it an effect boundary, a fact, a
   projection, a protocol quirk, a contextual judgment, or a domain decision?
2. **Locate the epistemic claim.** Is the desired result a decidable observation,
   a semantic judgment, or an authority decision? Narrow any proposed checker
   to the claim it can actually make.
3. **Reconstruct the causal pressure.** Name the observed failure, conditions,
   consequence, existing owner, and hard constraint. "An Agent may be wrong"
   does not by itself justify machinery.
4. **Choose the smallest truthful form.** Keep/correct a local understanding;
   clarify guidance or policy; reuse or repair an owner; strengthen a boundary
   check; propose a mechanism only if software must preserve a unique property
   against a named disturbance.
5. **Trace normal, failure, and retirement paths.** A durable mechanism needs
   writer, reader, identity, lifecycle, recovery, and deletion/retirement
   explanation. Count the operational burden it introduces and what it removes.
6. **Name the reopening evidence.** State which observation would show the
   simpler form insufficient or the added mechanism non-beneficial.

The strongest simpler alternative is part of the derivation. A prompt is enough
when ordinary review can observe and correct the result before material effects
escape. A lock, journal, authorization check, or idempotency owner earns itself
only when an invariant must survive misunderstanding, concurrency, process
loss, or an untrusted caller and no existing owner already provides it.

## Generativity: conclusions that follow without an exception table

The theory should classify new situations from object, claim, effect, and
authority—not from a growing catalogue of verbs or cases. It therefore yields
these recurring consequences:

- A required file manifest and JSON schema are mechanical conformance. They
  should be checked deterministically; whether their contents solve the brief
  remains review. A green schema is not a semantic gate.
- Re-delivering a request already identified by a provider idempotency key can
  remain adapter replay; asking an Agent to work again is a new Run, even when
  the UI calls both actions "retry."
- A UI may project live, terminal, or unknown from authoritative Run/Cell
  sources. It may not create durable liveness authority merely to avoid
  displaying unknown. The same system must use strict causal ownership for a
  potentially irreversible external effect.

The [authoring fixture](../../skills/mechanism-design-review/references/evaluation.md#authoring-fixture--theory-expression-without-an-exception-table)
records these as worked coherence examples, not transfer evidence. Transfer
remains unverified pending the blinded comparison described beside that
fixture. Cases can clarify a result or provide counterevidence, but they do not
carry the theory and must not replace the derivation.

## Empirical posture and revision

This is a theory for orienting and testing designs, not a proof that every
control is harmful or every review is correct. The retained research records
both supporting experience and disconfirming possibilities: some mechanisms
are necessary at irreversible boundaries; some structured contracts improve
settlement; and simplified controls require an ablation rather than aesthetic
approval. See the inquiry's [hypothesis ledger](../../principles/research/agent-harness-control-debt-and-guided-recovery.md#hypothesis-ledger).

Revise an application when a representative failure shows that its owner cannot
observe, contain, recover, or assign authority for a hard constraint. Revise
this theory only when evidence changes one of its explanatory distinctions or
derivation rules. A provider quirk, one prompt failure, or a new UI preference
belongs to an adapter, Skill, policy, or local design first. No theory update
by itself authorizes a new mechanism, architectural change, effect, or human
acceptance.
