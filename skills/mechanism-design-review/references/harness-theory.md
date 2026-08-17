# Harness theory — portable projection

This is the standalone, action-facing projection of the project-level Agent
harness theory. When a host supplies that design document and a local Sequence, the host source
governs. When installed alone, this reference is sufficient to apply the Skill
without inventing a second semantic canon. The Sequence snapshot remains the
portable lineage baseline; this document is neither a principle source nor a
runtime protocol.

## Core claim

A harness is task engineering for Agents. It transforms human work into stable
Agent-executable work units by reconstructing and re-expressing the task,
constructing its environment, keeping it whole or partitioning it, and
recomposing evidence-bearing results under the original constraints.

It can improve the conditions under which a fallible Agent acts, but mechanical
evidence alone cannot guarantee the semantic correctness of open-ended work. It
can keep intent, environment, effects, evidence, review, and acceptance from
being confused, so mistakes are visible, bounded, and correctable before they
become unauthorized effects or accepted facts.

## Locate the mechanism inside task transformation

Use this relation as orientation, not as an instruction for this Skill to shape
the task. Reconstruct only enough to place the proposed mechanism, then return
upstream task, context, or topology work to its owner:

```text
Intent and authoritative sources
  -> task model: object, desired change, invariants, evidence, acceptance owner
  -> environment: context, workspace, tools, capability, budget, effect boundary
  -> one direct unit or several independently recomposable units
  -> candidate and mechanical evidence
  -> synthesis, semantic review, and acceptance where the task requires them
```

This is not a mandatory pipeline. A small task may stay direct; research may
return understanding rather than a product candidate. Decompose only when
sources, effects, context, interfaces, and returned evidence create a real cut.
Recomposition restores whole-task constraints; it is not concatenation, voting,
or automatic acceptance.

An executable unit names its inputs and source standing, one transformation,
available environment and capability, permitted effects, completion/return
condition, and evidence relation to the whole. Stable does not mean infallible
or deterministic; failure and uncertainty must remain visible and contained.

## Differentiate work; do not hard-code the organization

Treat Agent roles as temporary differentiations of one general Agent model by
task description and working environment, not as runtime species. The current
organization is the relation among explicit work units and their dependencies,
evidence, and returns. A role label can guide an Agent without earning a role
enum, team state machine, queue, or new authority.

Keep discipline in generic sidecar owners: Project/Task standing, Run identity
and effects, budget/control/recovery, capability boundaries, and mechanical
evidence. Those owners constrain every unit without deciding the semantic org
chart. If a new task topology requires new lifecycle state only to describe
`researcher`, `implementer`, `reviewer`, or another temporary purpose, classify
that as a mechanism smell and route actual task shape or delegation topology to
their owners.

Model and resource facts have different standings at different owners.
Integration owns provider protocol and time-versioned pricing semantics;
Orchestration selects a resolved execution profile, allocates and aggregates
across Runs, routes extension requests to the explicit authority owner, and
enforces that owner's decision; Work Cell receives the resolved binding and
immutable per-Cell execution envelope, enforces what its host can enforce, and
records normalized usage and an attributable cost observation in its final. A
Cell does not select its own model, approve or extend its own envelope, maintain
a cross-Run ledger, or treat an unavailable subscription or mixed-route
marginal cost as zero. Direct and Orchestration callers create equivalently
bound Cell invocations whose invocation-specific observations use the same
evidence contract and standing; they need not share identity or report equal
usage and cost values.

## Three axes, one design judgment

Constrain task transformation through three axes: attention architecture under
bounded context, evidence, and effect/authority. Keep them distinct:

- **Attention/cognition:** bounded context can make source timing, compression,
  or work partition material to the task; this Skill identifies that pressure
  but does not own its resolution.
- **Epistemology:** separate reproducible observation, explicit mechanical
  conformance, semantic judgment, and acceptance.
- **Effect/authority:** retain causal identity and exact control at an effect
  boundary; a useful projection or reviewer does not gain that authority.

For a mechanism review, use the attention axis only to avoid solving an upstream
task or delivery problem with new control state. Route task-unit formation to
`task-shaping`, source delivery and reconstruction to `context-engineering`, and
direct-versus-delegated execution to `agent-delegation`. Their conclusions are
inputs to this review; this portable theory does not reproduce their methods or
selected principle lineages.

## Form the object before adding a control

For every proposed record, gate, retry, hook, state, or queue, identify:

```text
Object and unit:
Authoritative source and owner:
Exact claim it may establish:
Effect boundary, causal identity, and terminal condition:
Commonly confused neighbour:
Observed pressure and hard constraint:
```

Separate these claims:

| Claim | Truthful owner | Limit |
| --- | --- | --- |
| Observable fact / explicit predicate | deterministic observer | proves only the named fact or predicate |
| Artifact format or test conformance | mechanical checker | does not establish usefulness or intent satisfaction |
| Candidate fitness, relevance, quality, design conformance | independent reviewer | recommends; does not accept or cause effects |
| Adoption, residual risk, irreversible commitment | Principal or designated accepting owner | cannot be inferred from a pass or reviewer confidence |
| External request/response/error semantics | adapter | does not own generic lifecycle or Task meaning |
| Rebuildable display / cache | declared source + renderer | remains a projection, never independent authority |

Code may decide a semantic-looking requirement only to the extent it has been
reduced to an explicit, governed, decidable predicate. State that predicate and
its source assumptions narrowly. Otherwise encoding one interpretation in a
gate merely hides the remaining semantic judgment behind a pass.
This claim boundary parallels the established distinction between verification
against requirements and validation for intended use
([NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)).

## Select tests for the current uncertainty

A test is a feedback and evidence instrument, not a progress counter. It is
worth running or retaining when its result can change the next engineering
decision, prevent costly rework, or protect a settled high-consequence
relation. Its assertion establishes only its explicit decidable predicate;
semantic fitness still belongs to review and adoption still belongs to the
acceptance owner.

[`task-shaping`](../../task-shaping/SKILL.md) owns the work unit, whole
obligation, and reconstruction relation that give the test a subject.
[`practice-cycle`](../../practice-cycle/SKILL.md) uses the observation to choose
a changed next practice. Testing owns neither relation: it must not narrow the
Task into its predicate or turn one result into an automatic next action. If
pass and fail would change nothing and no settled relation needs guarding, the
test has little current feedback value.

Treat phase as the local standing of the subject, not a project state machine:

- during **exploration**, use the smallest test that discriminates the proposed
  direction from a plausible wrong one;
- during **stabilization**, retain causal regressions for observed failures and
  add focused boundary or compatibility evidence around load-bearing public
  relations;
- during **integration**, test identity, ordering, capability, evidence, and
  effects at the real seam rather than duplicating component suites; and
- during **release hardening**, expand fault, restart, concurrency, recovery,
  and regression coverage in proportion to consequence and supported operating
conditions.

Choose qualitatively by information gained and consequence avoided against
authoring, running, diagnosing, maintaining, fixture-coupling, and Agent
continuation cost. This is not a score. A cheap nondiscriminating assertion is
noise; an expensive causal boundary probe can be the minimum valid move for an
irreversible effect.

A small slice can often begin with one forward case, one known boundary
discriminator, and one compatibility relation. This is an information-seeking
heuristic, not a universal count. Early exhaustive suites can freeze a
provisional representation, make a green guess look like product evidence,
create brittle fixtures, and consume later continuations repairing tests for a
discarded direction.

Do not postpone a load-bearing boundary merely because the rest of the design
is exploratory. Reopen and deepen testing when an observed effect escapes
containment; concurrency, crash, untrusted input, or irreversibility enters the
supported path; an atomicity, idempotency, quiescence, or authority assumption
fails; or the observer cannot see the property it claims to protect. Reproduce
the smallest causal case, repair its owner, retain that regression, and widen
only where shared cause or consequence earns more coverage. This is not a
mandatory preflight or test lifecycle.

## Derive action from effects

Keep the public action surface small:

- **observe** an existing subject without effects;
- **run** a new execution from an explicit input and new causal identity; and
- **control** one exactly identified live execution where the lifecycle owner
  supports it.

`retry`, `continue`, `rerun`, and `review` are normally reason or lineage on a
new execution. Provider-safe replay belongs to the adapter; settlement and
reconciliation belong inside the lifecycle owner; correction and acceptance
belong to their domain owners. A command named `verify` is a new execution if
it can mutate a workspace or external system.

Use exact mechanism where an error cannot be safely repaired later: concurrent
writers, credentials/disclosure, destructive or irreversible effects,
irreversible acceptance, and causal identity required for idempotency. Use an
honest `unknown` for lost transient liveness when no authoritative live handle
survives; do not invent durable state merely to make a projection look certain.

## Choose the smallest truthful treatment

1. Correct a local misunderstanding.
2. Clarify guidance, Skill, or policy when contextual judgment is the problem.
3. Reuse, narrow, merge, or repair the current owner.
4. Strengthen a deterministic check at that owner's boundary.
5. Add a mechanism only when a named invariant must survive misunderstanding,
   concurrency, process loss, or bypass and no owner already preserves it.

For a mechanism candidate, name its writer, reader, identity, lifecycle,
failure/recovery path, operational burden, retirement path, and the simpler
alternative's material shortfall. This is a design analysis, never a mandatory
admission gate or a new runtime prerequisite.

## Recovery

Return failure to the closest owner that can alter the failed relation. A new
Agent attempt earns a new Run identity and should change sources, Task form,
context, capability, adapter, partition, budget, review finding, or authority.
An idempotent delivery replay after a documented transport failure is adapter
recovery, not a second Agent execution. Semantic rejection needs correction,
fresh execution, or Principal judgment—not an automatic retry.
Automatic transport retry is justified only where the effect is known
idempotent or the original request is known not to have been applied
([RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)).

Read `concepts.md` for detailed terms and `cases.md` only after deriving an
answer. Use `evaluation.md` as an expression test, not a standing gate.
