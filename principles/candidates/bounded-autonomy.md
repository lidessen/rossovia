# Candidate — Bounded Autonomy

**Status:** candidate
**Alternate participation:** nominated by the human on 2026-07-10 for the first
bounded Work Cell comparison only
**Research basis:** [bounded-autonomy research](../research/bounded-autonomy.md)
**Observed in:** the [artifact-organization simplification
trial](../../regeneration/evaluations/2026-07-10-artifact-organization-rewrite.md#simplification-trial--2026-07-10),
classical agent autonomy, adjustable-autonomy systems, polycentric governance,
and end-to-end system design

## Candidate sequence line

P23｜边界与反馈足以约束结果时，不以过程控制代替主体自化｜无为 / 自组织 / 自主智能体

## Recurrence

- The [*Dao De Jing*](https://ctext.org/dao-de-jing/zh) repeatedly treats
  emptiness, non-possession, non-domination, subtraction, and spontaneous
  transformation as conditions of effective action. The source contributes the
  negative-governance intuition, not a complete modern control theory.
- Wooldridge and Jennings define [agent
  autonomy](https://www.cs.ox.ac.uk/people/michael.wooldridge/pubs/ker95/subsubsectionstar3_1_1_1.html)
  as operating without direct intervention while retaining some control over
  actions and internal state; reactivity and pro-activeness make that freedom
  responsive rather than inert.
- Ostrom's [polycentric-governance
  evidence](https://www.nobelprize.org/uploads/2018/06/ostrom_lecture.pdf)
  shows formally independent decision centers forming coherent systems through
  contextual rules, monitoring, cooperation, and conflict resolution. Local
  decision space and governance conditions coexist.
- The [end-to-end
  argument](https://web.mit.edu/saltzer/www/publications/endtoend/endtoendA4.pdf)
  shows that central or lower-level control can be redundant when the endpoint
  must still verify correctness with information only it has. It also preserves
  the countercase: lower-level mechanisms may be justified by a measured
  performance need.
- The local [compact artifact-organization
  rewrite](../../regeneration/evaluations/2026-07-10-artifact-organization-rewrite.md#simplification-trial--2026-07-10)
  removed standing intermediate states while retaining authority and
  verification gates. It suggests, but does not yet prove independently, that a
  skill can govern result boundaries without owning the agent's whole process.

## Decision consequence

When designing a skill, controller, orchestrator, institution, or component,
name the outcome boundary, authority limit, observable feedback, and recovery
or transfer condition first. If those mechanisms can expose and correct the
material failures, leave internal ordering, tool choice, and local adaptation
to the acting subject. Add direct process control only for a named disturbance
that the boundary-and-feedback path cannot safely govern.

## Existing-sequence check

- P11 retains independent acceptance or commit authority but does not decide
  whether that authority should prescribe the executor's internal process.
- P13 verifies claims at the fact boundary but does not protect process
  discretion behind that boundary.
- P15 selects the smallest valid transition but can treat process freedom as
  mere cost reduction; P23 treats the subject's adaptive capacity as a positive
  system resource that unnecessary control can destroy.
- P16 requires a form from which the subject can act but does not decide whether
  the form should specify the action sequence.

P23's possible remainder is therefore causal and allocative: place control at
the boundary and feedback path when they suffice, and preserve the subject's
own variety inside that envelope.

## Counterexample / boundary

- Do not leave process open when material failure is not observable at the
  boundary, cannot be recovered, or can cause irreversible high-impact harm.
- Transfer or narrow autonomy when the actor lacks capability, another actor has
  decisively better information, or delay and local choices create unacceptable
  coordination cost. [Adjustable-autonomy field
  evidence](https://cdn.aaai.org/Symposia/Spring/2002/SS-02-07/SS02-07-008.pdf)
  shows that both rigid autonomy and rigid human handoff can fail.
- Legal, ethical, consent, safety, fact-admission, and durable commit authority
  are boundaries, not optional process details. P23 cannot override P11 or P13.
- If the process itself is the product under acceptance—for example a regulated
  procedure, reproducible experiment, or migration protocol—its required steps
  belong to the outcome contract.
- Do not create elaborate monitoring merely to justify autonomy. If the
  feedback apparatus costs more attention or risk than a small direct
  constraint, P15 may select the constraint.

## Expression probes

- **Skill expression:** compare an existing procedural skill with a version that
  retains the same authority, evidence, failure, and completion boundaries but
  leaves investigation order and tool choice open. Record whether P23 changes
  agent behavior beyond the P11/P13/P15/P16 baseline.
- **Multi-actor contract:** give a worker a goal, scope boundary, observable
  checkpoints, and escalation/commit conditions without a prescribed internal
  plan. Compare success, unsafe ambiguity, coordination cost, and recovery with
  a controller-owned step sequence.

## Committee review

Not yet convened. A review should include P11 for authority, P15 for the
strongest overlap/preservation case, P13 for observable fact admission, and P05
to test whether irreversible or weakly observable work reverses the candidate's
choice. P18 may be compared as another pending candidate but cannot hold a
review-team seat or semantic authority.

## Trial evidence

The first prospective skill-expression trial is recorded in the [Work Cell P23
live comparison](../../regeneration/evaluations/2026-07-10-work-cell-p23-live-comparison.md).
The baseline and treatment ran in separate fixture copies with the same
acceptance conditions; both independently expressed P16 with P13/P15/P04,
passed their environment-executed check plans, and produced materially
equivalent artifact-organization skills. A fresh blinded judge passed every
acceptance condition for both and returned `tie`.

**Outcome:** `overlap`. P15/P16 plus P11/P13 already removed the fixed process
and preserved agent-owned investigation order without P23. The treatment was
longer and more expensive but added no material decision or boundary. This
weakens P23's independent skill-expression case; it does not test the separate
multi-actor contract probe.

## Human decision

**Sequence:** pending — retain the current Sequence. One prospective probe
returned `overlap`; the separate multi-actor contract probe and committee review
remain before any further human decision.

**Alternate:** the one-run Work Cell nomination is settled as `overlap`; no
standing or portable alternate authority was granted.
