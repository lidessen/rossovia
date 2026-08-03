# Autonomous Collective Agent Systems

**Status:** source-bound design research
**Observed:** 2026-07-28
**Disposition:** informs
[`AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md`](../AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md);
no Principle Sequence proposal
**Question:** What engineering relations are required for an Agent system to
become self-sensing, self-adaptive, self-organizing, collectively intelligent,
fully autonomous in operation, and naturally interactive with people?

> This record distinguishes published evidence, current repository evidence,
> and project synthesis. It does not establish that Rossovia already has these
> capabilities.

## Project synthesis

The following is Rossovia's synthesis of the evidence reviewed below, not a
universal finding of any single source.

The target cannot be reached by making one Agent responsible for a larger
workflow, by adding more Agents, or by surrounding a short Agent run with a
larger approval process. The recurring structure across autonomic computing,
self-adaptive software, distributed systems, fault-tolerant runtimes, systems
engineering, multi-Agent research, and mixed-initiative interaction is a set of
feedback loops that:

1. retain a desired direction and observable current state;
2. act on a bounded part of the system;
3. observe whether reality changed;
4. preserve enough state to continue after interruption or replacement;
5. alter the next action when the observation warrants it; and
6. move an unresolved contradiction to a loop with a wider scope or slower
   time horizon.

The loops may be local, parallel, hierarchical, or distributed. Their topology
must follow the task's dependencies and disturbances rather than a permanent
organization chart. Longer execution supplies useful capacity only while the
system continues to obtain decision-changing feedback. Collective intelligence
appears only when differentiated contributions are coordinated into better
whole-system outcomes; Agent count, activity, agreement, and token use are not
proxies for it.

The corresponding human relationship is neither stepwise supervision nor
human absence. People express purposes, values, constraints, corrections, and
judgments about lived outcomes through natural interaction. The system bears
the ordinary burden of decomposing work, forming teams, acting, verifying,
recovering, and reorganizing. Asking a person is one possible control action
under material uncertainty, not the default execution model.

## Evidence

### Autonomy is a feedback relation, not a larger worker

[IBM's architectural approach to autonomic
computing](https://research.ibm.com/publications/an-architectural-approach-to-autonomic-computing)
places high-level human objectives above interacting self-managing elements
rather than requiring administrators to operate every component. The earlier
[vision of autonomic computing](https://doi.org/10.1109/MC.2003.1160055)
identifies self-configuration, self-optimization, self-healing, and
self-protection as properties of a system that manages itself according to an
owner's goals. These sources concern computing infrastructure, not open-ended
LLM work, but they establish an important separation: humans supply governing
objectives while the system supplies operational management.

[Engineering Self-Adaptive Systems through Feedback
Loops](https://people.cs.umass.edu/brun/pubs/pubs/Brun09SEfSAS.pdf) treats
feedback loops as first-class engineering elements and examines systems with
multiple concurrent, distributed, or hierarchical loops. A wider and slower
loop may change the model or control law used by a faster local loop.
[Self-Managed Systems—An Architectural
Challenge](https://doi.org/10.1109/FOSE.2007.19) similarly distinguishes fast
component control, change management using known plans, and slower goal
management when existing plans are insufficient. These are useful
determinations, not a required three-service architecture.

[Software Engineering for Self-Adaptive Systems: A Second Research
Roadmap](https://software.imdea.org/~alessandra.gorla/papers/deLemos-Roadmap-SEfSAS213.pdf)
describes centralized and decentralized control as a design space. Local
control improves responsiveness and scale; wider control can preserve
system-level constraints but pays for information aggregation and coordination.
This supports a hybrid relation in which local loops close local gaps and wider
loops intervene only when a contradiction crosses their scope.

### Large systems stay alive by reconciling, isolating, and recovering

[Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
are non-terminating control loops that repeatedly compare desired and current
state. Kubernetes deliberately uses many simple controllers, each concerned
with a particular aspect of shared state, instead of one monolithic interlinked
loop. Open-ended Agent goals cannot be reduced to infrastructure field
equality. Rossovia takes only the narrower recovery lesson: missing an event or
restarting a process must not destroy the ability to reconstruct the next
useful action from authoritative sources. Causal history remains necessary for
non-idempotent effects, attribution, and audit.

[Erlang/OTP supervision
trees](https://www.erlang.org/doc/system/design_principles.html) separate
workers from supervisors and nest recovery responsibility. Its
[restart-intensity rule](https://www.erlang.org/doc/system/sup_princ.html#maximum-restart-intensity)
prevents one failing child from being restarted forever and propagates repeated
failure to a wider supervisor. Agent failure is often semantic rather than a
process crash, so restart alone is insufficient. The transferable relation is
that local failure receives local recovery, correlated or repeated failure
changes the level of response, and recovery policy is distinct from productive
work.

Google's SRE guidance distinguishes user-visible symptoms from internal causes
and warns that overload, queues, and repeated retries can form destructive
positive feedback. [Monitoring Distributed
Systems](https://sre.google/sre-book/monitoring-distributed-systems/) makes
monitoring useful only when a signal can drive an appropriate response;
[Addressing Cascading
Failures](https://sre.google/sre-book/addressing-cascading-failures/) connects
admission, load shedding, backoff, jitter, and bounded retries to continued
useful operation. Rossovia treats these controls as candidates to apply only
against observed Agent failure paths, not as infrastructure ceremony to copy.

[Borg](https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/)
combines declarative jobs, admission, scheduling, isolation, monitoring, and
recovery at cluster scale. [AWS cell-based
architecture](https://docs.aws.amazon.com/solutions/cell-based-architecture-on-aws/)
limits correlated failure by placing work in independent cells. Rossovia
synthesizes from these examples a possible role for Work Cells as context,
resource, and effect-isolation units while retaining shared intent and facts
outside replaceable workers. CPU utilization and infrastructure availability
do not substitute for Agent task correctness.

The [NASA Systems Engineering
Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)
applies engineering processes recursively and iteratively across system,
subsystem, and component levels. The transferable lesson is that every
decomposition should retain its relation to the enclosing mission and return
verification evidence upward; this is Rossovia's synthesis rather than a claim
that NASA specifies Agent organization. Rossovia should not inherit aerospace
documentation volume or stage gates merely to obtain that relation.

### Collective intelligence depends on coordination fit

[Self-Organization in Multi-Agent
Systems](https://archive-ouverte.unige.ch/unige:120878) distinguishes runtime
organizational change from static multi-Agent execution. Strong
self-organization involves continuing dynamics and local interactions that can
change internal organization without an external actor specifying each
reorganization. Its structural, process, and functional dimensions warn
against calling parallel execution or a Swarm visualization self-organization.

The [swarm-engineering
review](https://www.e-swarm.org/upload/pdf/BraFerBirDor2013%3Asi.pdf) finds that
local rules can produce scalable, flexible, and robust collective behavior,
while also emphasizing the difficulty of modelling, verifying, comparing, and
deploying those behaviors. Emergence can be harmful as well as useful; a
complex pattern is not evidence that the system is serving its goal.

Current LLM evidence makes the same point more concretely. Google Research's
[controlled comparison of 180 Agent
configurations](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)
reports large gains for multi-Agent coordination on parallelizable work and
large losses on sequential work. Task decomposability and tool density, rather
than importance alone, predicted suitable topology. Anthropic's
[production research system
report](https://www.anthropic.com/engineering/multi-agent-research-system)
attributes much of its benefit to the ability to spend more tokens and tool
calls across independent searches, while reporting much higher cost and poor
fit for dependency-heavy work. These studies do not establish a universal
orchestrator. They reject the simpler claim that more Agents are inherently
better.

The human-group result reported in [Evidence for a Collective Intelligence
Factor](https://doi.org/10.1126/science.1193147) is not directly transferable
to software Agents, but it provides a useful conceptual warning: group
performance was not explained simply by the average or maximum individual
intelligence. Collective capability is a property of relations and
coordination, not merely the members.

### Bounded evidence for spending more time and compute

OpenAI reports that o1 performance improved with more test-time
compute in [Learning to Reason with
LLMs](https://openai.com/index/learning-to-reason-with-llms/).
[Anthropic's multi-Agent research
report](https://www.anthropic.com/engineering/multi-agent-research-system)
likewise found token use strongly associated with performance in its research
setting. These are bounded observations about particular reasoning and research
settings. They do not establish that longer autonomous operation causes better
results in open environments.

[Google's controlled Agent-system
comparison](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)
found multi-Agent degradation on sequential tasks, and
[Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
found high costs and limited fit where Agents need shared context.
[SWE-agent](https://proceedings.neurips.cc/paper_files/paper/2024/hash/5a7c947568c1b1328ccc5230172e1e7c-Abstract-Conference.html)
also shows that an Agent-computer interface which exposes navigation, editing,
tools, and tests can materially improve autonomous software work.

Rossovia therefore adopts a working hypothesis to test in representative
practice: additional time becomes useful continuation only when the run can
retain state, manipulate an environment, observe a result, and revise a later
decision.

```text
continued run
  + a manipulable environment
  + an observable result
  + retained state
  + a next decision changed by the observation
  = hypothesized cumulative capability
```

The hypothesis is disconfirmed where extra operation merely repeats a method,
amplifies error, or consumes resources without improving the intended outcome.

### Natural interaction changes the human role

[Principles of Mixed-Initiative User
Interfaces](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/chi99horvitz.pdf)
frames autonomous action, dialogue, and inaction as choices under uncertainty
about a person's goals, attention, and the costs and benefits of acting. It
argues for efficient direct invocation and termination, limited action under
uncertainty, and dialogue only when resolving the uncertainty is worth the
interruption. Rossovia takes from this that conversation is one control action,
not the mandatory surface for every system step.

[Adjustable Autonomy for the Real
World](https://www.cs.cmu.edu/afs/cs.cmu.edu/Web/People/pscerri/papers/SS02.pdf)
shows that transferring a decision to a person can impose coordination delay
on a whole multi-Agent team; waiting, acting, delaying effects, and transferring
control again must be considered together. [A Model for Types and Levels of
Human Interaction with
Automation](https://doi.org/10.1109/3468.844354) further separates automation
of information acquisition, analysis, decision selection, and action. These
sources reject a single global autonomy slider.

The validated [Guidelines for Human-AI
Interaction](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf)
require easy invocation, dismissal, correction, and recovery; scoped service
under uncertainty; continuity within a session; and cautious adaptation from
behavior. Rossovia synthesizes from this that a natural interface should let
feedback change the same living object and make the later difference
perceptible. Converting every correction into a separate task or approval form
would preserve the interaction burden rather than absorb it.

## Comparison with the current project

Rossovia already contains parts of the required relation:

- [Decision 043](../decisions/043-generative-system-and-human-governed-autonomy.md)
  relates reality, principles, methods, temporary formation, Work Cells, and
  practice evidence, and rejects a resident omniscient Agent.
- [Decision 012](../decisions/012-bounded-adaptive-organization.md) defines
  self-sensing, self-adaptation, and self-organization in a deliberately
  bounded human-governed form.
- [Work Cell](../../packages/work-cell/README.md) supplies an isolated,
  replaceable execution unit with retained evidence.
- [Autonomy](../../operations/autonomy/README.md) retains ordered Mission
  input, turns, delegation, interruption, reconciliation, and local recovery.
- [Decision 050](../decisions/050-principal-workbench-supervised-mvp.md) and
  [Workbench](../../operations/workbench/README.md) make the current
  multi-project system perceptible and provide explicit human intervention.

The present architecture nevertheless describes its transitional constraints
more precisely than its destination. A later implementer could optimize the
number and quality of Principal approval surfaces, preserve fixed role
boundaries after they stop serving the work, or treat Workbench as the
permanent task-management center. Those outcomes would satisfy much of the
current supervised design while moving away from fully autonomous collective
operation.

## Project judgments

The Principal's direction, constrained by the evidence and limitations above,
yields the following project judgments. They are not universal conclusions of
the cited fields.

1. **The final operating form is fully autonomous and collectively
   intelligent.** Within an explicitly entrusted purpose and accepted
   authority, resource, effect, and data envelope under real operating
   conditions, the system should continue sensing, forming work, acting,
   verifying, recovering, and reorganizing without a person recreating each
   task and handoff.
2. **Natural interaction replaces process operation.** People should ordinarily
   express intent, constraints, corrections, and outcome judgments rather than
   schedule Agents or administer a workflow.
3. **A feedback loop is the minimum living relation.** A prompt, Agent, queue,
   task, or workflow is not autonomous unless observations from its effects can
   change later action.
4. **Loops nest by scope and time horizon.** Local loops handle reversible
   action and recovery; wider loops handle dependency conflicts, resource
   pressure, failed methods, organizational change, and renewed interpretation
   of the goal.
5. **Organization is temporary and evidence-responsive.** Agents and teams form,
   change, and dissolve around present work. Centralized, decentralized,
   independent, and hybrid forms are selected from actual dependency and
   communication conditions.
6. **Durable state outlives every Agent.** Intent, observations, accepted facts,
   unresolved contradictions, effects, and recovery state must survive process,
   model, role, and provider replacement.
7. **Activity is not progress.** Turns, tokens, Agent count, queue depth,
   agreement, and visual motion become useful only when connected to observable
   movement in the intended outcome.
8. **Transition mechanisms carry an exit condition.** Every manual task,
   approval, supervision, or fixed-organization surface must identify the
   immature autonomous capability it temporarily supplies and the evidence
   under which it can disappear.
9. **The human surface is a perceptual and conversational projection.** A task
   list may remain useful, and a living Swarm field may make organization
   perceptible, but neither owns runtime truth or dictates backend structure.
10. **Engineering controls follow demonstrated failure paths.** Recovery,
    isolation, admission, verification, and intervention should make useful
    operation last longer. Controls that only add ceremony before a basic loop
    can run are design drift.

## Unsupported conclusions

The sources do not establish:

- that Rossovia is presently capable of unsupervised operation;
- that one MAPE-K schema, fixed hierarchy, central planner, or decentralized
  Swarm is the correct topology for all work;
- that more inference time, more Agents, or more retries monotonically improve
  results;
- that emergent organization will align itself with project purpose without
  observable feedback and correction;
- that natural-language conversation alone is a sufficient natural interface;
  or
- that a self-report, trace, animation, or passing component test proves
  collective intelligence.

Representative operation must decide those claims.
