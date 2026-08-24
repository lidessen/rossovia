# Task-shaping concepts

## In plain words

An agent does not have one fixed ability level. Its reliable behavior depends on
the model together with the loop, prompt, skills, tools, permissions, context,
completion contract, and the shape of the work. Task shaping changes the work's
form so this concrete execution profile can perform it reliably without losing
what the whole task must accomplish.

It is closer to compiling a problem than writing a plan. A successful
transformation produces work units the executor can settle and a reconstruction
path that can recover the original outcome. For harness design, use a
conservative Flash-class economic model as the ordinary compilation target. A
system that works only when every primitive is delegated to a frontier model
has not yet exposed an economical stable structure.

## Essence

1. **Profile-relative judgment.** “Stable” always names an execution profile,
   task population, acceptance condition, and evidence—not an agent in the
   abstract.
2. **Whole-preserving transformation.** Local work may shrink; the original
   outcome, hard constraints, authority, and load-bearing relations remain
   visible.
3. **Locally observable work.** Every unit has a coherent question or action
   and evidence capable of settling it without pretending that terminal success
   proves semantic quality.
4. **Reconstructible results.** Coverage, boundary relations, conflicts, and
   unknowns survive recomposition. Synthesis is not concatenation or voting.
5. **Empirical revision.** Runs can show that a unit is still oversized, a split
   destroyed a relation, or direct execution was already sufficient.

6. **Conservative baseline.** The primitive set follows the named economical
   reference profile. Stronger executors are explicit escalations, not hidden
   assumptions inside every task contract.

## Differential analogy

This analogy is an explanatory aid, not alternate vocabulary for contracts.
Task shaping resembles differentiating a difficult global problem into local
changes that a bounded solver can handle, then integrating those changes back
into a constrained whole:

| Mathematical intuition | Task-shaping term |
|---|---|
| function or global problem | original outcome and global obligations |
| local neighborhood | stable working envelope of the reference profile |
| coordinate choice | selected task primitives and semantic partition |
| differential or local change | one locally closed execution unit and result |
| step size | unit granularity and evidence boundary |
| boundary/initial condition | source revision, incoming state, authority, and hard constraints |
| integration | reconstruction of coverage, relations, order, and effects |
| truncation/accumulated error | local omissions, inference, coordination, and synthesis repair |

The analogy explains why arbitrary chunking fails. A useful local unit holds the
relevant state and criterion sufficiently fixed that the reference profile can
make one observable judgment. The next run can reduce or enlarge the unit from
observed error, much like adaptive step size.

It also supplies an **integrability gate**. Local results cannot be safely
combined merely because every unit passed. Check whether they share compatible
source state and boundary conditions, whether execution is path-dependent,
whether cross-unit interactions were omitted, and whether a global invariant
survives accumulation. Discontinuities, phase changes, circular dependence, and
strong non-local coupling may require a joint unit, ordered execution, a
different representation, or `unsupported-escalate` rather than more splitting.

## Domain vocabulary

### Execution profile

The effective combination of model, provider, harness, prompt and skill
context, tools and permissions, loop policy, inference policy, and completion
contract. Changing a load-bearing member may change the capability envelope.

### Stable working envelope

The evidenced region of task shapes in which the execution profile repeatedly
meets a named acceptance condition with tolerable variation and observable
failure. It is not the model context limit, a token budget, file count, price,
or one successful run.

Stability has at least three distinct surfaces:

- **protocol stability:** the loop settles and produces a valid result;
- **local semantic stability:** a bounded judgment or action is materially
  correct; and
- **system completeness:** the combined result preserves every required
  obligation and cross-boundary relation.

Evidence for one surface does not establish another.

### Reference profile

The versioned execution profile used as the ordinary harness target. It should
normally be an economical, available, replaceable daily model with a bounded
tool loop—“Flash-class” describes this role, not a permanent vendor or model
name. This repository may currently probe DeepSeek Flash, while another host
can declare a different reference with its own evidence.

### Task primitive

A bounded operation whose acceptance is observable and whose reliability or
failure boundary has representative evidence for the reference profile.
Examples may include finite-label classification, schema-constrained extraction,
or one claim/evidence comparison, but none becomes a reliable primitive from
plausibility alone. The primitive contract includes its context, ambiguity,
abstention, validation, and revision boundary.

### Task shape

The properties that determine how work interacts with an execution profile:
semantic breadth, evidence and context volume, branching, relation coupling,
time horizon, external state, side-effect risk, local observability, result
size, and completeness burden.

### Global obligation

A required outcome, invariant, authority boundary, source relation, coverage
item, or acceptance condition that remains binding across every transformed
unit. A coverage map makes obligations addressable; it does not make them true.

### Local closure

The condition in which one unit can answer a consequential question or perform
an action and verify it using bounded evidence. Local closure does not mean
isolation: incoming and outgoing relations remain explicit.

### Transformation

One deliberate change to task form that addresses a named envelope mismatch.
Examples include bounding retrieval, externalizing state or obligations,
semantic partitioning, separating effects from judgment, or escalating the
executor. Decomposition is only one transformation.

### Reconstruction

The source-linked process that reconnects unit results, coverage, relations,
conflicts, unknowns, and revisions into the original decision. A reducer that
must repeat the entire original task is outside the intended shape.

## Convertibility boundary

A difficult task is transformable only when:

```text
each unit can fit an evidenced local envelope
and
the global obligations and cross-unit relations can be represented and checked
and
reconstruction itself fits an evidenced envelope or can be shaped again
```

Some problems cannot yet be made stable by splitting: the governing truth may
be unsettled, the decisive relation may be inseparable from the whole, local
acceptance may be unobservable, side effects may be unsafe, or synthesis may
retain all original complexity. In those cases return discovery, escalation,
or human judgment rather than decorative decomposition.
