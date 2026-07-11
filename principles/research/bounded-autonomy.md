# Research — Bounded Autonomy

**Disposition:** candidate:bounded-autonomy
**Scope:** Determine whether a cross-context principle should preserve an
actor's process discretion when outcome boundaries and feedback can govern the
result, without weakening authority, verification, coordination, or safety.
**Source limitations:** The received *Dao De Jing* is a composite textual
tradition rather than a single uncontested authorial statement. Classical agent
and distributed-systems papers predate current LLM agents. Ostrom's evidence
concerns human institutions, so it supports a governance pattern rather than a
direct software prescription. The local skill rewrite is self-evaluated and has
not yet established independent behavioral attribution.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

When should a controller constrain observable results and leave the acting
subject free to choose and adapt its process, rather than prescribing that
process directly?

## Distinctions

- **White space is not an omitted contract.** It is deliberately unassigned
  process discretion inside named outcome, authority, safety, and recovery
  boundaries.
- **Autonomy is not final authority.** An actor may control its own actions and
  internal state while another actor retains acceptance, settlement, or
  irreversible commit authority under P11.
- **Feedback is not surveillance of every step.** It is an observable result or
  state change that can correct, retry, escalate, or stop the activity.
- **Self-organization is not laissez-faire.** Ostrom's self-organized systems
  retained boundary rules, monitoring, and local sanctions; the open space was
  inside governance, not outside it.
- **Wuwei is not total inaction.** The relevant reading is non-coercive or
  non-assertive action that avoids substituting the controller's desire for the
  subject's own operation. The whole *Dao De Jing*, including its paternalistic
  and historically situated passages, is not being adopted as doctrine.

## Evidence

- The received [*Dao De Jing*](https://ctext.org/dao-de-jing/zh) repeatedly
  connects useful emptiness (chapter 11), acting without possession or
  domination (chapters 2, 10, and 51), subtraction (chapter 48), and spontaneous
  transformation under non-forcing government (chapters 37 and 57). This is a
  coherent negative-governance pattern: the governing contribution can be the
  conditions under which another process becomes effective, not detailed
  command of that process.
- The [Stanford Encyclopedia's textual and interpretive survey of the
  *Laozi*](https://plato.stanford.edu/entries/laozi/) describes the received work
  as a composite anthology with multiple manuscript traditions and explains
  that `wuwei` does not mean total inaction. This limits the claim to a
  source-aware reading of one recurring pattern rather than treating all 81
  chapters as one timeless systems specification.
- Wooldridge and Jennings's [weak notion of
  agency](https://www.cs.ox.ac.uk/people/michael.wooldridge/pubs/ker95/subsubsectionstar3_1_1_1.html)
  makes autonomy, reactivity, pro-activeness, and social ability jointly
  constitutive: an agent operates without direct intervention and retains some
  control over its actions and internal state while still perceiving and
  responding to an environment. Removing all process discretion therefore
  removes part of what makes the component an agent rather than an invoked
  procedure.
- Tambe, Scerri, and Pynadath's [*Adjustable Autonomy for the Real
  World*](https://cdn.aaai.org/Symposia/Spring/2002/SS-02-07/SS02-07-008.pdf)
  shows why autonomy cannot be absolute. Decision control should move when
  another actor has better expertise, error can cause significant harm, the
  agent lacks capability, or team coordination would fail. Its deployed system
  also showed that rigid one-shot autonomy choices and fixed timeouts caused
  costly failures; autonomy needs feedback, coordination constraints, and
  contingent transfer rather than one permanent setting.
- Ostrom's [Nobel lecture on polycentric
  governance](https://www.nobelprize.org/uploads/2018/06/ostrom_lecture.pdf)
  reports that multiple formally independent decision centers can form a
  coherent system and that self-organized resource systems used boundary rules,
  monitoring, and local sanctions. It rejects both the assumption that an
  external center must prescribe the solution and the assumption that local
  autonomy needs no institutional conditions.
- Saltzer, Reed, and Clark's [end-to-end
  argument](https://web.mit.edu/saltzer/www/publications/endtoend/endtoendA4.pdf)
  shows an engineering analogue: a lower-level mechanism may add cost while the
  application endpoint must still verify correctness with its own context.
  Lower-level intervention remains justified as a performance enhancement when
  the tradeoff warrants it, so the argument supports conditional placement of
  control rather than universal decentralization.
- The local [artifact-organization simplification
  trial](../../regeneration/evaluations/2026-07-10-artifact-organization-rewrite.md#simplification-trial--2026-07-10)
  replaced five standing workflow states with two commands, one optional
  record, and inline verification. P15 and P16 explained the smaller surface,
  but the trial also exposed a distinct causal question: should the skill own
  the agent's intermediate process at all, or only the semantic boundaries and
  evidence needed to judge the result?

## Existing-sequence coverage

- **P11:** separates durable decision/commit authority from execution. It can
  bound an autonomous actor but does not decide how much of the actor's internal
  process the authority should prescribe.
- **P13:** requires traceable verification before a claim becomes fact. It
  supplies an outcome feedback gate but does not prefer outcome feedback over
  step-by-step control.
- **P15:** removes unnecessary scope and control distinctions. It can select a
  smaller mechanism, but it does not state why preserving the subject's own
  adaptive process is a positive design requirement rather than merely a cost
  saving.
- **P16:** requires an expression that lets the subject act. It does not decide
  whether that expression should prescribe the action sequence or leave the
  subject to form one.
- **P18 candidate:** requisite variety prevents a controller from becoming too
  simple for its disturbances. It supplies a lower bound on control variety;
  bounded autonomy asks where that variety should live and warns that importing
  it into a central process controller can suppress useful variety in the
  subject.

## Possible decision delta

For a skill, agent harness, team, or distributed component, first name the
outcome boundary, permitted authority, observable feedback, and recovery or
transfer condition. When those are sufficient to detect and correct material
failure, do not also prescribe the actor's internal order, tools, or local
adaptation. Add process control only for a named disturbance that the boundary
and feedback path cannot safely govern.

This changes a concrete design choice: a skill can specify evidence and
completion conditions while allowing the activated agent to choose its
investigation path; an orchestrator can request an outcome and observe state
without owning every worker step. If the actor's process is itself the accepted
artifact, or if failure cannot be detected or recovered at the boundary, the
choice reverses.

## Strongest no-proposal case

P15 can delete unjustified process machinery, P16 can demand an actionable
form, P11 can retain commit authority, and P13 can verify the result. Together
they may already produce the same compact skill or agent contract. The *Dao De
Jing* reading may add a memorable explanation but no new decision. A permanent
principle is warranted only if explicitly protecting subject-owned process
space changes a design after those existing P-IDs have already been applied.

## Candidate gate

- **Cross-context:** passes provisionally across early Chinese governance,
  agent theory, human institutional governance, distributed-system design, and
  local skill expression.
- **Decision-changing:** passes provisionally through the choice between an
  outcome/feedback contract and a controller-owned procedure.
- **Irreducible:** passes narrowly; P11, P13, P15, and P16 bound or simplify
  control but do not make subject-owned adaptive process a protected design
  variable.
- **Falsifiable:** passes. High-impact irreversibility, weak observability,
  missing recovery, inadequate actor capability, or costly coordination can
  require direct control or transfer of autonomy.
- **Compact:** passes with one conditional line.
- **Admission cost:** passes to candidacy, not adoption. The concept is likely
  to counter recurring workflow over-specification, but its distinct behavior
  still needs comparative trials.

## Disposition and next evidence

**Disposition:** `candidate:bounded-autonomy`

P23 remains a candidate while the Sequence stays unchanged. The first
prospective [skill-rewrite comparison](../../regeneration/evaluations/2026-07-10-work-cell-p23-live-comparison.md)
returned `overlap`: the P11/P13/P15/P16 baseline already protected the same
investigation freedom and produced a materially equivalent accepted skill. Run
the remaining multi-actor task-contract probe to test whether coordination,
recovery, or transfer of control exposes a decision that the skill-expression
case did not. Record protected process space, unsafe ambiguity, or another
overlap without presuming candidacy will survive.
