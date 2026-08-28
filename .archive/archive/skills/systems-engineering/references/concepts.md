# Systems-engineering concepts

## In plain words

A reliable system is not a collection of reliable-looking parts. It is a set of
relations that keeps the desired behavior within an acceptable range when parts
vary, inputs are imperfect, conditions change, and mistakes occur.

For Agent systems, the practical unit is therefore the closed path from source
and request through model judgment, tools and effects, verification, acceptance,
and later observation. Improving one prompt may help one component while leaving
the system's principal failure path unchanged.

This Skill takes inspiration from Qian Xuesen's *Engineering Cybernetics*. The
original work treats engineering cybernetics as a technical science that
abstracts common design principles from controlled and guided systems. Agent
review, human settlement, Swarms, and budget policy are present adaptations;
they are not claims about the original book.

## Control relation

Use these concepts only when they clarify an actual decision:

### Desired behavior

The range of end-to-end outcomes the system must maintain. It includes the
accepted tolerance and consequence of deviation, not only a success label.

### System boundary

The smallest boundary containing the material source state, decisions, effects,
verification, acceptance, and feedback needed to explain the outcome. A
boundary may include people, organizations, external services, and later use;
it is not limited to deployed software.

### Disturbance

Anything that can push behavior away from the desired range: ambiguous input,
missing or stale source context, nondeterministic model output, correlated
reasoning, tool or provider failure, external state change, reviewer overload,
or insufficient recovery resources.

### Observable signal

Evidence available early and accurately enough to distinguish relevant system
states. A valid JSON result can observe protocol completion while remaining
blind to semantic correctness. A passing unit test observes named behavior but
may not observe an omitted upstream contract.

### Control action

A bounded response that can change the observed system state: reject, retrieve,
reframe, repeat, compare, verify, stage, limit authority, repair, roll back,
escalate, or ask an authorized person to settle the residual uncertainty.

### Feedback

The relation that returns observed behavior to a decision capable of changing
later action. Logging without an owner or response path is telemetry, not a
closed feedback loop. Review without settlement does not control effects.

### Stability

The system remains or returns within its accepted behavior range under the
representative disturbances it claims to handle. Stability is not exact output
repetition, zero defects, or merely finishing every run.

### Residual risk

The material failure still able to escape the selected controls. Engineering
does not hide it behind “low confidence”; it names the consequence, evidence,
and authority willing to accept or reject it.

## Fallibility and redundancy

Redundancy is useful when it creates another path to detect, contain, or recover
from a failure. It is waste when it repeats the same correlated failure without
new evidence.

Independence is task-specific rather than absolute. Possible sources include:

- different evidence partitions with deliberate overlap;
- different methods or adversarial hypotheses;
- a deterministic check against a model judgment;
- a different model or harness profile;
- an external source or production signal; and
- a human decision over an evidence-backed summary.

Do not diversify everything. Select independence where a named systematic error
could otherwise pass every control.

Voting aggregates preferences or propositions; it does not establish factual
truth. When reviewers disagree, inspect the source, method, authority, and
failure mode. Repeated agreement is evidence only to the extent that the
attempts are relevant and independent.

## Reliability surfaces

Keep these surfaces distinct:

| Surface | Example evidence | Does not establish |
|---|---|---|
| protocol | terminal tool called, schema valid, artifact exists | semantic correctness |
| component | one bounded extraction or review meets its criterion | end-to-end coverage or safe effects |
| integration | outputs reconcile under source revision and global constraints | production recovery under later change |
| operation | representative use stays within tolerance and recovers from disturbance | universal reliability outside that range |

Controls should target the surface on which the material failure occurs.

## Requirement before representation

Systems engineering may determine that one property is necessary without
owning its representation. For example:

- “whole-project absence claims must be checked against the whole source before
  acceptance” is a control requirement;
- whether evidence boundaries belong in a domain result, verifier state, or a
  generic runtime contract is a separate ownership decision.

Prefer the requirement plus its observable acceptance condition at a boundary.
Specify a field, threshold, duration, sample, rollout fraction, or organization
role only when the governing source and owner support that choice. Plausible
precision can make a proposal look engineered while hiding an unevidenced
domain decision. When the case does not supply the representation, write the
required property and `[owning domain/runtime to determine]`; do not generate a
convincing field name or example number and later disclaim it.

## Proportional assurance

Assurance effort follows consequence, reversibility, observability, and
uncertainty—not prestige or task size alone.

- **Low consequence, reversible, visible:** ordinary validation and easy repair
  can be sufficient.
- **Material but recoverable:** independent verification, staged effects, and a
  recovery path may be justified.
- **High consequence or hard to reverse:** diverse evidence, deterministic
  gates where possible, explicit effect authority, prepared rollback, and human
  acceptance may be necessary.

These are examples, not fixed levels or required stages. One strong control can
replace several weak ones; a new control can also create a new failure path.

Resource estimates normally close their loop after useful work: compare
expected and actual use, investigate material variance, and update the model.
An in-run budget signal becomes a control only when exhaustion itself threatens
safety or availability. It should not silently recreate a low hard limit that
prevents an important task from completing.

## Engineering metrics

Prefer measures that describe the whole:

- material defects or unsafe effects that escaped;
- material defects detected before acceptance;
- false-positive review and repair burden;
- recovery success and time to restore accepted behavior;
- end-to-end decision latency;
- useful outcome per token, time, or money;
- predicted versus actual work and resource variance; and
- human attention required for settlement.

Component accuracy remains useful when tied to a bounded operation and
denominator. It should not silently substitute for the system outcome.

## Relationship to task shaping

Systems engineering decides which contribution the whole needs, why it matters,
how its failure is observed, and what happens when it fails. Task shaping then
decides whether that contribution can be performed directly or transformed to
fit an evidenced Agent envelope.

The dependency normally runs:

```text
whole-system outcome and control gap
  -> required component contribution
    -> task shaping and domain packet formation
      -> runtime execution
        -> verification and acceptance
          -> operational feedback to the system model
```

Starting with Agent packet size can optimize a local node while preserving the
wrong system relation.
