# Research — 从易错部件到可靠工程系统

**Disposition:** no-proposal

**Scope:** Determine whether reliable engineering with fallible human and Agent
components requires a new Sequence principle, and recover the smallest useful
method from Qian Xuesen's *Engineering Cybernetics* for present Agent systems.

**Source limitations:** The 1954 English edition is bibliographically verified
through its [Internet Archive record](https://archive.org/details/engineeringcyber0000xues)
and [Google Books record](https://books.google.com/books/about/Engineering_Cybernetics.html?id=NfgvAAAAIAAJ),
but the accessible full-text evidence used here is a Chinese translation of the
original preface in a later collected volume. Later accounts of Qian's teaching
and systems-engineering practice are used only to corroborate or extend the
original scope; they are not silently attributed to the 1954 text.

> This record is cited, revisable research. It owns no P-ID and cannot redefine
> an interpretation or adopt a Sequence change.

## Question

How can a real engineering system approach reliable behavior when its human,
model, software, and organizational components inevitably make mistakes? Does
that judgment require a new principle, or can existing Sequence principles
support a dedicated systems-engineering method?

The practical pressure comes from Agent work. One Cell may be bounded and
protocol-stable while still producing semantic errors. Reviewers can also miss
defects or create false positives. Repeating the same model and prompt may
repeat correlated errors. Trying to make every component infallible is both
unrealistic and economically destructive; accepting every output is equally
unacceptable.

## What *Engineering Cybernetics* contributes

Qian defines engineering cybernetics as a technical science concerned with the
parts of cybernetics directly useful for designing controlled or guided
systems. In the translated [1954 preface](https://www.dingboshi.org/file/201612/book/pdf/7b57075dcf004c39a73b6b3754b3e577.pdf#page=21),
he distinguishes it from one concrete engineering practice: its work is to
organize design principles found across practice into theory, expose
commonality among fields, and make basic concepts reusable. Detailed component
construction is deliberately not its subject.

The same preface treats a system primarily through the interactions among its
parts and the resulting motion of the whole, rather than through isolated
component excellence. It also argues that changing the formulation of a
problem can make it tractable without abandoning the engineering question.
This supplies two important corrections for Agent systems:

1. the object of design is the behavior of the composed system under real
   disturbances, not the apparent intelligence of one model invocation; and
2. a recurring engineering method should abstract decision-changing relations
   from practice without prescribing the internal implementation of every
   component.

The [Chinese Academy of Engineering journal overview](https://www.engineering.org.cn/sscae/CN/1160103700859511735)
describes the same movement as organizing effective principles from engineering
practice into theory and then enriching that theory through further problem
solving. That is a closed practice loop, not a one-time derivation of rules.

A Science Press historical account records that Qian's 1953 course joined
feedback with the idea of [forming a highly reliable system from incompletely
reliable components](https://www.cspm.com.cn/zt2017/2014nzt/sqlj/201808/t20180801_263642.html).
The phrase is unusually close to the present engineering need. It does not say
that error disappears. It changes the design unit from the unreliable part to
the controlled whole.

## What must not be over-attributed

The 1954 work is a mathematical engineering science of controlled and guided
systems, not a complete doctrine for software organizations, political
institutions, Agent Swarms, or human approval. Later systems engineering and
large-system work broadened the concern from local control processes to global
organization. A later official biography records the practical doctrine that
overall design need not maximize every subsystem, but should seek [a reasonable
whole](https://www.cae.cn/cae/html/main/col36/2012-02/28/20120228101138496497891_1.html).
That is useful corroboration for system-level trade-offs, not evidence that
every present workflow mechanism appears in the original book.

The following are therefore project inferences, not quotations from Qian:

- independent review, repeated work, deterministic checks, rollback, and human
  acceptance are possible control structures for Agent work;
- redundancy helps only when it detects, contains, or recovers from a named
  failure and is sufficiently independent of the failure source;
- token, time, and money margins are risk-bearing resources, not a proof of
  quality and not a reason for continuous hard throttling;
- a human may settle a decision through a concise evidence-backed summary when
  raw implementation volume exceeds human review bandwidth; and
- end-to-end escape rate and recovery matter more than the isolated accuracy of
  one Cell.

## Engineering model for fallible Agent work

Treat the engineering case as a bounded control problem:

| Control concern | Agent-system translation |
|---|---|
| desired state | accepted outcome and tolerated residual risk |
| operating range | task population, model/harness profile, authority, cost, and time constraints |
| disturbance | ambiguous input, stale context, model variance, tool failure, correlated reasoning error, or external change |
| observable signal | evidence, structured status, test result, source comparison, disagreement, usage, or production outcome |
| control action | constrain, retrieve, verify, repeat, diversify, retry, rollback, escalate, or ask for human settlement |
| stability | bounded errors and recovery under representative disturbance, not one perfect-looking run |
| residual risk | failure still able to escape the controls, named with an acceptance owner |

This model changes the normal question from “How do we make the Agent not make
mistakes?” to “Which material mistakes can occur, how will the system observe
them, and what bounded response keeps the whole useful?”

## Minimum method implied by the research

1. State the desired whole behavior, operating conditions, consequence of
   failure, and accepted residual risk.
2. Draw the actual system boundary from inputs through effects and acceptance;
   do not mistake a component inventory for a system model.
3. Find the principal failure path or missing control loop whose correction
   changes the system outcome.
4. Establish an observable signal before adding a response. An unobservable
   error cannot be reliably corrected by another prompt.
5. Assign each detection, intervention, effect, recovery, and acceptance action
   to an authority.
6. Add only the minimum sufficient prevention, detection, containment,
   recovery, redundancy, or budget margin proportional to consequence.
7. Use `task-shaping` only after the system has identified what one Agent node
   must reliably contribute; local task transformation cannot decide the whole
   control architecture.
8. Operate, compare predicted and actual failures and costs, and revise the
   model and controls.

No universal stage list follows. A low-consequence reversible task may need
ordinary validation only. A high-consequence irreversible effect may justify
independent methods, repeated work, deterministic gates, rollback preparation,
and explicit human acceptance. The reason is the failure path, not ritual.

## Existing-sequence coverage

- **P03 — 实践—认识—再实践** owns the closed movement from operation through
  observation and revised operation. It is the strongest lineage for a method
  whose truth is system behavior, not design intent.
- **P04 — 主要矛盾** selects the principal failure path or missing feedback
  relation rather than responding to every possible error with controls.
- **P13 — 主张不等于事实** keeps worker output, reviewer opinion, terminal
  success, and design confidence as claims until traceable verification and
  settlement.
- **P15 — 最小有效跃迁** requires the minimum control structure that resolves
  the current reliability contradiction while preserving risk and authority
  constraints. It also prevents “lightweight” from omitting a necessary
  system-level change.

P05, P08, P10, and P11 can lead particular activations, but their decision
content does not need to become permanent lineage here. Existing principles
already support the engineering judgment when composed deliberately.

## Form decision

Create a high-freedom `systems-engineering` Skill. It owns one repeated
judgment: how to compose and revise a sufficiently reliable whole from fallible
parts under concrete constraints and accepted residual risk.

It must not become:

- a mandatory preflight for ordinary tasks;
- another orchestration runtime or Work Cell schema;
- a universal sequence of review stages;
- an owner of model capability evidence, task partitioning, budget conversion,
  domain verification, or human acceptance; or
- a promise of perfect reliability.

The Skill may return a compact system case when handoff or consequence warrants
one. For simple cases its result may be a few sentences and one changed control
boundary.

## No-proposal conclusion

The research changes the skill architecture but does not expose an irreducible
Sequence gap. P03 supplies the feedback loop, P04 the leverage diagnosis, P13
the fact-admission boundary, and P15 the proportional minimum action. The new
contribution is a durable composition method and vocabulary, not a new semantic
root.

Reopen this conclusion if repeated system designs apply those P-IDs faithfully
yet still optimize components while leaving whole-system disturbance,
observability, recovery, or residual-risk ownership unaddressed.
