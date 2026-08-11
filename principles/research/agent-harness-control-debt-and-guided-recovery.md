# Research — Agent Harness Control Debt and Guided Recovery

**Disposition:** open
**Scope:** Determine how an Agent harness should distinguish necessary hard
boundaries from controls whose local safety, conformance, or predictability
benefit reduces whole-task reliability; preserve the received hypotheses about
task lists, sub-agents, structured settlement, error-tolerant guidance, and
delegation topology; and decide whether a distinct control-removal Skill is
justified.
**Source limitations:** The initiating observations were supplied by the human
Principal on 2026-08-06 and have no external transcript anchor in this
repository. Project records below establish particular mechanisms and failures,
not universal superiority over unrestricted harnesses. No matched open-versus-
controlled campaign has yet tested the central net-benefit claim. The 2026-08-07
Rossovia + Herdr record preserves one corrected nested-delegation observation;
it is not a matched causal comparison.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself. Unverified
> and later-disconfirmed hypotheses remain here with their changed standing.

## Question

When does a harness control make fallible Agent work more reliable as a whole,
and when does it become **control debt**: a locally defensible permission,
gate, validator, retry, or patch whose accumulated interference makes ordinary
execution less capable, less stable, or harder to understand?

The practical decision is not whether safety, validation, or freedom is good in
the abstract. It is which controls should be retained, simplified, moved to an
observable boundary, made conditional, or removed for a concrete task
population and consequence level.

## Principal observations to preserve before validation

The Principal reported the following recurring experience. These are source
observations and conjectures, not admitted general facts:

- Agents can drill into one local concern and keep adding safeguards or
  validators until the harness optimizes the branch instead of the task.
- Restricting available tools and introducing elaborate permission control may
  reduce execution stability enough that a broadly enabled Agent performs
  better overall.
- Output-conformance patches can accumulate around validators and retries until
  the settlement machinery interferes with investigation and normal execution.
- A task or todo list appears useful on long tasks because it can re-expose the
  main line after local work.
- Sub-agents appear useful primarily as a context-layering mechanism that lets
  the Main Agent preserve the whole while larger bodies of execution detail are
  handled elsewhere; concurrency is secondary.
- `outputSchema`, terminal tools, and declared artifacts appear to be useful
  compact outcome boundaries.
- Agents will make mistakes. A good harness may be one that gives strong
  guidance, keeps mistakes observable and recoverable, and permits trial and
  correction instead of trying to prevent every wrong intermediate action.
- A process deviation such as an unnecessary nested delegation may be poor
  judgment without being a system failure. The force of the response should
  follow its actual consequence: effect escape, authority expansion, lost
  evidence, mainline drift, or disproportionate coordination cost.

Preserving a conjecture here does not require defending it. A later negative
result changes its standing and boundary rather than deleting it.

## Distinctions

- **Hard boundary versus precautionary control.** A hard boundary protects a
  named authority, irreversible effect, secret, or unrecoverable consequence.
  A precautionary control merely anticipates that the Agent might choose badly.
- **Outcome contract versus process prescription.** A schema, terminal tool, or
  artifact can make completion observable without specifying every internal
  step. The same mechanism becomes process control when it blocks investigation
  or dictates the path before evidence is available.
- **Guidance versus enforcement.** Guidance changes what the Agent notices and
  prefers while leaving local adaptation possible. Enforcement makes an action
  unavailable or rejects it mechanically. Strong wording is not automatically
  guidance, and a schema is not automatically enforcement.
- **Trial error versus escaping error.** A wrong intermediate hypothesis in a
  reversible workspace is different from an unauthorized external effect or a
  false result admitted as fact. The first may be learning; the second requires
  prevention, containment, or settlement control.
- **Control count versus control value.** Fewer gates are not evidence of a
  better harness. A control earns its place only through a named failure path,
  an observable response, and better whole-task results at acceptable cost.
- **Retry versus recovery.** Repeating the same failing interaction is not
  recovery. Recovery changes the state, information, carrier, or authority
  relation that made another attempt useful.
- **Hard boundary versus organizational guidance.** Law-like prevention is
  reserved for consequences that later feedback cannot safely undo. Operating
  guidance expresses preferred judgment inside that boundary; departing from
  it is evidence to evaluate, not automatically a violation to reject.

## Provisional theory — an error-tolerant action and evidence system

An Agent harness should not be designed as a machine that makes the Agent
correct. Its smaller and more realistic purpose is:

> enable a fallible Agent to remain oriented, act with sufficient capability,
> make reversible mistakes, expose what happened, receive decision-changing
> feedback, and submit a candidate whose content can be independently reviewed
> before it gains effect or acceptance authority.

This changes the unit of reliability. The Agent may be wrong inside the loop;
the system is useful when wrongness is observable, recoverable, and prevented
from silently becoming accepted fact or an unauthorized irreversible effect.

### Four ownership layers

| Layer | Owns | Must not claim |
|---|---|---|
| Acting Agent | investigate, reason, choose tools, change reversible state, produce a candidate and evidence | correctness, self-acceptance, hidden authority, or infallibility |
| Harness code | execute tools, enforce actual effect authority, retain identity and traces, and check mechanically decidable facts such as type, shape, existence, hash, state transition, command exit, or an explicitly encoded test result | that an open-ended judgment about prose, architecture, reasoning, relevance, completeness, or a review finding has become objective merely because one interpretation was encoded |
| Independent review Agent | compare candidate content with sources and the human-supplied acceptance contract; return supported findings, uncertainty, and a recommendation | deterministic truth, effect authority, merge, publication, or final acceptance |
| Human Principal or designated host | accept residual risk, settle disputed meaning, authorize irreversible effects, and admit a result for shared use | that silence or a mechanical pass is semantic consent |

Code may evaluate a formally encoded property, including a compiler, test, or
invariant. Its truthful claim stops at that property: “this test passed” is a
mechanical fact; “the implementation satisfies the Principal's intent” remains
a semantic judgment. When the intended meaning cannot be reduced without loss
to a decidable property, compiling it into code does not make it objective. It
freezes one provisional interpretation and hides the missing reviewer.

The term **semantic gate** is therefore rejected for harness code. Code can gate
on mechanically decidable evidence or effect authority. A separate semantic
review may recommend rejection, correction, or acceptance, but its output is a
source-linked claim retained for the actual acceptance owner.

### Core movement

```text
Principal intent, sources, and authority
                  ↓ guidance and acceptance contract
        acting Agent + sufficient tools
                  ↓ candidate, effects, trace
       mechanical execution and checks
             ↙ failure evidence   ↘ mechanically settled candidate
      bounded correction loop      independent semantic review
             ↑                          ↓ findings and uncertainty
             └────────────── acting Agent correction
                                        ↓
                         human or designated-host acceptance
```

This is a relation map, not a mandatory serial workflow. A low-consequence,
reversible edit may need only ordinary tests and human inspection. A material
architecture, publication, or irreversible effect may require a fresh review
Agent and explicit acceptance. The consequence and recoverability select the
path; every box does not run for every task.

### Match the problem to its truthful handling form

The first harness-design question is not “which check should be added?” but
“what kind of problem occurred, and which actor or artifact can truthfully
handle it?”

| Problem kind | Truthful owner or form | Common form error |
|---|---|---|
| Shape, type, existence, identity, state transition, explicit test or invariant | deterministic code and retained mechanical evidence | asking another Agent to guess what code can decide exactly |
| Open-ended content judgment: relevance, architecture, completeness, source meaning, trade-off, or intent not losslessly encoded in a governed finite specification | independent source-aware review Agent | compiling one provisional semantic reading into a validator and calling it truth |
| Content property losslessly encoded in an explicit, governed, decidable specification | deterministic code, with the claim scoped to that encoded property | assuming that subject matter called “semantic” can never be checked mechanically, or inflating the property into total intent satisfaction |
| Value choice, disputed meaning, residual-risk acceptance, irreversible authorization | human Principal or explicitly designated host | treating reviewer confidence, silence, or schema success as consent |
| Provider request shape, unsupported feature, error semantics, returned identity | provider adapter | patching generic mechanism or prompts around one provider quirk |
| Current default, ordering, price, budget preference, selected model | policy | freezing volatile preference into the reusable mechanism |
| Long-task obligations, active mainline, return or reopen conditions | external todo/task state plus Agent interpretation | asking task status code to decide whether the work is substantively right |
| Context scale and independently inspectable detail | bounded sub-agent contribution plus compressed evidence | increasing agent count or parallelism without a semantic partition |
| Credential, external disclosure, destructive or irreversible effect | explicit authority boundary, containment, and recovery | using semantic review after an effect that cannot be undone |

The same issue can cross rows. A code change may have mechanically passing tests
and still need architecture review; a review packet may have semantically useful
findings but still lack human merge authority. The answer is layered ownership,
not forcing one layer to impersonate all others.

### Minimal harness kernel

A general coding-Agent harness needs only enough stable mechanism to carry the
following relations:

1. **Orientation:** the active task, relevant sources, hard authority, and
   current obligations are recoverable; a todo is one optional carrier.
2. **Capability:** the Agent can inspect and act with tools appropriate to its
   role and the task's effect boundary.
3. **Reversible effects:** ordinary exploration and local changes remain
   observable, attributable, and recoverable before irreversible commitment.
4. **Mechanical evidence:** tool calls, state, schemas, terminal action,
   artifacts, tests, errors, and usage are retained without semantic inflation.
5. **Semantic handoff:** a consequential candidate can be reconstructed by an
   independent source-aware reviewer.
6. **Acceptance:** the authorized human or host can decide from candidate,
   mechanical evidence, semantic review, and named residual risk.
7. **Recovery:** failure returns exact evidence to the owning loop and changes
   the next practice rather than appending another universal rule.

Everything else is an adapter, policy, task-specific method, or experimental
extension until repeated use shows that the kernel cannot carry a necessary
relation without it.

### Semantic-review contract

An independent review Agent should receive the exact candidate identity,
accepted sources, human-supplied acceptance contract, mechanical report, and
highest-risk semantic questions. It should not receive the producer's desired
verdict or hidden reasoning trace. Its output contains:

```text
finding or no-finding statement:
source-linked evidence:
consequence for the accepted contract:
uncertainty or missing source:
recommended disposition: revise | retain with risk | ready for human decision
authority withheld:
```

Harness code may validate that this packet is shaped correctly and that named
local evidence paths exist. It cannot decide that the evidence supports the
finding. Another Agent can review a consequential review, but adding reviewers
without different sources or failure sensitivities is repetition, not
independence. The final disposition remains human or designated-host authority.

### Controls should protect effects and evidence before constraining cognition

The Agent supplies adaptive variety. Removing useful tools, forcing an early
output form, or prescribing every local step can destroy the very capacity that
lets it recover from an unforeseen repository state. Prefer, in order:

1. strong orientation and concrete guidance;
2. observable local effects and exact trace identity;
3. reversible workspace, staging, rollback, and separated commit authority;
4. mechanical checks at boundaries where the property is actually decidable;
5. independent semantic review where meaning remains judgmental; and
6. direct prevention or capability removal only for a named consequence that
   the earlier layers cannot safely expose, contain, or recover.

This ordering is provisional. Credential access, external disclosure, and
irreversible production effects can justify prevention before trial because a
later review cannot undo their escape.

### Constraint force should follow consequence

A harness should not flatten every desired behavior into `allowed` or
`forbidden`. Use the least coercive form that can keep the whole reliable:

| Consequence class | Appropriate form |
|---|---|
| Unauthorized irreversible effect, credential or secret escape, destructive shared-state change | hard effect boundary, containment, or explicit authorization |
| Shared ownership, identity, evidence, and acceptance relations whose ambiguity would corrupt reconstruction | explicit operating contract with observable verification and recovery |
| Preferred investigation order, tool choice, delegation topology, or communication habit | guidance, examples, and role disposition with room for local adaptation |
| Reversible poor judgment whose result remains observable and contained | feedback, correction, and later practice rather than a new universal prohibition |

Compliance with a preferred process is not the unit of reliability. Ask what
the choice changed: Did it broaden authority, create conflicting effects, hide
evidence, lose the active mainline, prevent recovery, or impose coordination
cost disproportionate to the result? If not, the variation may be adaptive or
merely harmless. If it did, correct the governing relation and retain the
observation; do not automatically convert one mistake into another permanent
gate.

### Guidance is load-bearing infrastructure

Permission and validation machinery often grows because guidance is treated as
weak decoration. For a model-directed Agent, however, a clear task, governing
relation, tool description, todo state, and return condition are part of the
control surface. They shape behavior while preserving adaptation. Their value
must still be observed: repeated prohibitions, role adjectives, and stale todo
items can become context debt just as code becomes control debt.

### Stable carriers and their truthful claims

| Carrier | Truthful claim | Overclaim to reject |
|---|---|---|
| Task or todo state | named obligations and process state remain externally recoverable | the Agent stayed on the right mainline or completed the work correctly |
| Sub-agent envelope and compressed return | detail was isolated behind a bounded contribution and reconstructable claim | more Agents, votes, or parallel activity imply quality |
| `outputSchema` | a logical result can be parsed into the declared shape | the shaped content is true or complete |
| Terminal tool | one explicit completion or disposition action occurred | the action was semantically correct or accepted |
| Declared artifact | a required path exists or changed and can be hashed or reopened | the artifact's meaning or quality is correct |
| Test, compiler, or invariant | one encoded property held for this candidate | the full human intent is satisfied |
| Trace and usage | the retained execution reported these observable events and resources | the hidden reasoning, provider revision, or quality is thereby known |

The carriers remain separate because tasks need different observables. Requiring
all of them by default produces duplicate settlement paths and encourages code
to infer meaning from mechanical coincidence.

### Why effective forms work

The strongest common explanation is **complementarity**. Current Agents are
useful because they can interpret open-ended meaning, adapt a path, and use new
evidence. They remain unreliable at persistent exact state, long-horizon
obligation tracking, strict interface shape, deterministic bookkeeping, and
self-independent judgment. Code and external artifacts are strong at those
exact properties but cannot recover open-ended human meaning by themselves.

An effective harness form repairs one deficient relation needed for useful
action **without taking over a relation owned by another actor**. External
state complements unstable memory; guidance complements under-specified
orientation; tools complement insufficient action variety; authority boundaries
contain effects whose consequences exceed the acting Agent's mandate. These are
different interventions generated by the same selection test:

1. name the relation currently preventing useful action or trustworthy
   settlement;
2. name the actor or carrier capable of supplying only that missing property;
3. state the narrow claim the intervention can truthfully establish; and
4. preserve investigation, semantic judgment, and acceptance with their
   rightful owners.

The resulting map is:

```text
Agent weakness or finite resource       Complementary harness form
──────────────────────────────────      ──────────────────────────
under-specified governing relation   -> guidance / Skill loaded at need
long-horizon obligation persistence  -> todo / task state
finite active context                -> sub-agent partition + compressed return
insufficient action variety          -> task- and role-sufficient tool surface
effect exceeds delegated authority   -> containment + explicit authorization
ambiguous machine interface          -> output schema
ambiguous completion transition      -> terminal tool
ephemeral result                     -> artifact + identity + provenance
fallible or producer-biased meaning  -> independent review Agent
exactly decidable property           -> mechanical check
wrong but recoverable action         -> feedback-bearing correction loop
```

The form becomes bad design when it no longer repairs the named relation, when
its truthful claim expands, or when it takes over the Agent's investigation,
another actor's judgment, or the Principal's authority. This also distinguishes
nearby interventions: missing orientation calls for guidance; missing action
variety calls for capability; unacceptable consequence calls for authority or
containment. More warning text cannot supply a missing tool, and removing a tool
cannot settle a disputed value choice.

## Effective-form ledger

### Todo or Task state

**Underlying logic:** Externalize obligations, dependencies, active mainline,
and return conditions so they survive context growth and local depth-first
work. The todo does not make the Agent reason better; it makes forgotten state
cheap to recover.

**Good practice:**

- use it when the task has several durable obligations, dependencies, handoffs,
  or a real risk of losing the return point;
- keep the active outcome and unresolved obligations visible, with stable IDs
  and explicit completion or reopen conditions;
- re-present unresolved state at a meaningful return boundary when retrieval is
  the mechanism under test; treat spontaneous reads and updates as behavioral
  evidence rather than proof of semantic completion;
- let the Agent update process state while code checks legal transitions; and
- periodically reconcile the list with the Principal's current task rather than
  treating old items as authority.

**Bad practice:**

- create a task system for one-step work;
- decompose every tool call into a microtask and spend more attention updating
  status than advancing the outcome;
- require a read and status rewrite after every tool or artifact merely to make
  the carrier appear active or to equalize experimental arms;
- let a stale list override a human task switch or discovered governing
  relation; or
- treat `completed` as proof that the content is correct.

The [read-only review counterexample](../../regeneration/evaluations/2026-07-21-review-cell-read-only-task-projection.md#baseline)
shows that an unnecessary mutable Task can make a useful review fail
mechanically. **Standing:** Task-state mechanics are verified; the Principal's
mainline benefit is practice-supported, while matched drift reduction remains
unmeasured.

### Sub-agents

**Underlying logic:** Partition context, not merely labor. A worker holds local
detail while the Main Agent preserves the whole, authority, cross-boundary
relations, and acceptance. Compressed evidence reconnects the layers.

**Good practice:**

- partition by independently inspectable evidence or disjoint effects, not by
  arbitrary role count;
- give each worker one frozen whole constraint, bounded contribution, evidence,
  stop signal, and withheld authority;
- retain one writer for shared mutable state;
- return claims and evidence rather than full transcripts; and
- require Main to reconstruct the whole and use a fresh non-producing reviewer
  where producer-correlated error matters.
- when a worker discovers a genuinely independent local contribution, let it
  form a smaller delegation while inheriting the outer whole, effect boundary,
  and withheld authority; the worker remains responsible for reconnecting that
  child evidence to its own parent return.

**Bad practice:**

- add Agents because the task has many files or because concurrency exists;
- give every worker the entire history, ask several Agents to redefine one
  contract, or merge results by vote;
- let workers write the same surface; or
- force Main to reread every trace, eliminating the context benefit.
- treat topology depth itself as success or failure, reflexively forbid nested
  delegation, or fan out a trivial task without an attention, latency,
  isolation, or independent-evidence benefit.

The [scale-control probe](../../regeneration/evaluations/2026-07-15-project-cognition-scale-control.md)
supports semantic partition, local recovery, and compressed synthesis while
also recording higher total cost and a surviving synthesis error. **Standing:**
context-scale mechanism supported; agent count and concurrency are not quality
evidence.

### Output schema

**Underlying logic:** Turn one already-formed logical result into a
machine-readable shape so another component can address fields without parsing
free prose.

**Good practice:**

- use a small schema only when a real downstream consumer needs structured
  fields;
- keep worker-visible acceptance procedural and keep evaluator-only semantic
  answers out of the schema;
- validate shape without calling it truth; and
- when native response format interferes with investigation, gather evidence
  first and project it afterward.

**Bad practice:**

- force schema from the first reasoning token on a provider/profile that cannot
  support investigation and structure together;
- encode the expected conclusion, architecture decision, or defect inside
  required fields;
- create a large union that exposes mutually exclusive branches at once; or
- add parsing retries until a semantic non-answer becomes schema-valid.

The [K3 matched comparison](../../regeneration/evaluations/2026-07-18-kimi-structured-settlement.md#practice-2--completion-treatment)
showed zero-read schema runs and correct text investigations for one exact
execution profile, then supported deferred projection in that profile.
**Standing:** useful as an interface carrier; schema-first interference with
investigation is verified only for that execution profile, not established as a
general model or provider property.

### Terminal tool

**Underlying logic:** Make the Agent's final state transition explicit through
one tool identity instead of inferring completion or disposition from prose.

**Good practice:**

- expose one mutually exclusive action per genuine disposition;
- keep terminal action distinct from logical output and artifacts;
- reserve enough execution capacity to settle after investigation; and
- record the call as a claim about what action occurred, not whether it was the
  right action.

**Bad practice:**

- force a provider-incompatible tool choice;
- flatten several dispositions into one schema that invites mixed branches;
- accept several terminal calls, parse terminal meaning from ordinary prose, or
  let a terminal pass become semantic acceptance; or
- recover from empty evidence by demanding a confident terminal answer.

The [held-out branch-specific field](../../regeneration/evaluations/2026-07-20-mission-reconciliation-flash-probe.md#held-out-confirmation)
settled six of six cases with exactly one terminal call. **Standing:** explicit
transition supported; correctness and acceptance remain outside the terminal.

### Artifact

**Underlying logic:** Externalize a result so its identity, bytes, provenance,
change, and later review no longer depend on conversation memory.

**Good practice:**

- require an artifact only when the task's durable outcome is actually a file,
  patch, report, image, or other reopenable object;
- retain source revision, path, hash or diff, and the evidence needed for later
  review;
- code checks existence and meaningful change where decidable; and
- review content separately.

**Bad practice:**

- create documentation or reports only to satisfy a process gate;
- treat file existence, non-empty bytes, or a changed hash as content quality;
- duplicate the same fact across several artifacts; or
- let a generated summary replace the authoritative source it projects.

Work Cell's artifact contract truthfully proves presence/change while its own
records withhold semantic acceptance. **Standing:** durable evidence carrier
supported; artifact quality remains a review judgment.

### Mechanical checks

**Underlying logic:** Code gives cheap, repeatable, exact feedback for
properties that are actually decidable in the encoded contract.

**Good practice:**

- check types, schemas, paths, hashes, allowed state transitions, command exits,
  deterministic tests, and explicitly encoded invariants;
- report the exact failed property to the Agent;
- keep a pass scoped to that property; and
- place provider-specific compatibility in adapters rather than generic checks.

**Bad practice:**

- decide open-ended prose quality, architectural correctness, relevance,
  completeness, or human intent in code when the property has not been
  losslessly reduced to an explicit governed decidable specification;
- turn a heuristic score or hand-authored expected diagnosis into a correctness
  gate;
- add exceptions and fallbacks until malformed work passes; or
- describe test success as full semantic acceptance.

**Standing:** mechanically decisive checks are core harness infrastructure.
The boundary is decidability and faithful specification, not whether the subject
matter is casually called “semantic”: code may establish an exactly encoded
content property, but encoding one lossy interpretation and naming it total
correctness is a form error.

### Independent review Agent

**Underlying logic:** Content judgment remains semantic, contextual, and
fallible. A fresh Agent can inspect sources and the candidate without sharing
the producer's exact reasoning path, exposing errors that deterministic code
cannot express.

**Good practice:**

- provide candidate identity, authoritative sources, accepted criteria,
  mechanical evidence, and highest-risk questions;
- keep the reviewer read-only unless a separate correction role is authorized;
- require source-linked findings, uncertainty, and withheld authority; and
- route the report to a human or designated host for acceptance.

**Bad practice:**

- give the reviewer the producer's desired verdict or ask it to rubber-stamp;
- let it invent new acceptance requirements, mutate the candidate, accept its
  own report, or decide by unsupported confidence;
- call same-context repetition independent; or
- write code that attempts to judge whether the review's semantic finding is
  correct.

The [correction-loop record](../../design/decisions/051-correction-effects-close-verification-loop.md#observed-control-gap)
contains both sides: one reviewer criterion caused a false rejection, then the
corrected independent review found a real defect. **Standing:** independent
semantic review is useful but itself fallible and non-authoritative.

### Guidance and Skills

**Underlying logic:** A model-directed Agent can use natural-language
orientation, distinctions, examples, and habits to form its next action while
retaining local adaptation. Guidance is the semantic control form; code is not.

**Good practice:**

- state the actual object, responsibility, authority, hard constraints,
  acceptance, and return conditions;
- keep stable disposition small and load task-specific method or volatile detail
  only when needed;
- prefer a coherent relation that changes judgment over repeated prohibitions;
  and
- revise guidance from observed action failure.

**Bad practice:**

- accumulate rules for every historical mistake;
- use decorative roles, generic rigor, or repeated warning words as substitutes
  for the governing relation;
- prescribe a full internal procedure when outcome feedback is sufficient; or
- keep stale guidance active after the Principal changes the task.

The [prompt-composition inquiry](theory-generativity-and-expression-selection.md#prompt-composition-and-reasoning-paths)
keeps carrier effects conditional and rejects decorative predicates as proven
mechanisms. **Standing:** guidance is necessary infrastructure; the optimal
carrier remains model-, language-, task-, and position-dependent.

### Tool surface and effect authority

**Underlying logic:** Tools supply the variety needed to discover and act;
authority and containment limit which effects may become real. Tool presence
and effect permission are related but not identical design questions.

**Good practice:**

- expose capabilities needed by the role and actual task;
- use reversible workspaces, staging, observable diffs, and separate commit or
  external-effect authority;
- remove capabilities that contradict a role, such as Task mutation for a
  read-only reviewer; and
- isolate credentials and require explicit disclosure or destructive-effect
  authority.

**Bad practice:**

- remove general read, edit, command, or delegation capability merely because
  the Agent might use it badly;
- expose tools the host cannot execute and rely on prompts to forbid them;
- put credentials into an exploratory full-toolbox environment; or
- equate “all tools enabled” with autonomy even when effects are irreversible.

**Standing:** role- and consequence-shaped capability is supported; universal
minimal permission and universal full access are both rejected.

### Feedback-bearing correction

**Underlying logic:** Agents improve within a task when a failed action produces
new evidence that changes the next action. The harness need not prevent the
first mistake if it can observe, contain, and make correction cheaper than
prevention.

**Good practice:**

- retain the failed attempt, exact source and candidate identity, successful
  sibling work, and the error or review finding;
- change the failed assumption, partition, adapter, budget, context, or action
  form before retrying;
- bound recovery and stop before replaying uncertain effects; and
- distinguish transient transport retry from semantic learning.

**Bad practice:**

- repeat the same prompt with stronger wording after the mechanism failed;
- hide attempts or usage, restart the whole field when one packet failed, or
  replay a possibly committed write;
- append another universal validator for one local error; or
- continue indefinitely because activity is mistaken for convergence.

The [Mission recovery history](../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md#what-the-failed-practices-changed)
supports changed-relation recovery for graceful carrier replacement with
read-only effects and exact identity. **Standing:** that narrow recovery form is
supported; crash recovery, writable or uncertain-effect replay, and arbitrary
retry remain unverified or unsafe.

### Recovery requires a changed relation

A failed attempt earns another attempt only when the next practice changes at
least one decision-relevant relation: source evidence, task form, context,
tool capability, provider adapter, partition, budget assumption, reviewer
finding, or human clarification. Preserve successful sibling evidence and the
failed record. A same-form retry may be justified for an explicitly transient
transport failure; it is not learning and must not be described as correction.

### Control-debt diagnostic

A harness control is suspect when one or more of these relations recur:

- code attempts to decide semantic correctness rather than a mechanically
  decidable property;
- the control has no observable target failure or named consequence;
- it prevents ordinary evidence gathering or removes needed adaptive variety;
- it duplicates protocol or state already owned elsewhere;
- its fallback turns malformed or failed behavior into normal success;
- every failure adds another predicate, retry, exception, or prompt without
  removing the rejected assumption;
- a provider or model incompatibility is patched in generic mechanism rather
  than translated by its adapter;
- a stale threshold or budget interrupts newly necessary work; or
- the control's pass is repeatedly mistaken for semantic acceptance.

The corrective options are not only delete or keep: narrow the authority, move
the check to its owning boundary, defer structure until after investigation,
replace prevention with observable recovery, make a surface on-demand, or
delete duplicate control. Preserve rollback and the hard constraint throughout.

### Nested loops without a universal process

Harness reliability can be understood as loops at different scales:

- a **tool loop** turns one action into an observation;
- a **task loop** keeps obligations and the mainline recoverable across actions;
- a **delegation loop** isolates a bounded contribution and reconnects evidence;
- a **review loop** turns a mechanically settled candidate into semantic
  findings and correction;
- an **acceptance loop** lets the authority settle or reopen the result; and
- a **practice loop** changes the harness theory when the same class of failure
  recurs.

The value of a loop is not procedural sophistication. It gives a fallible Agent
another informed opportunity to act. Add a larger loop only when the smaller
one cannot observe, contain, recover, or assign authority for the governing
failure. Remove a loop whose output no longer changes a later decision.

## Existing evidence and current standing

### Whole-system reliability does not require infallible steps

The existing
[fallible-components research](engineering-reliability-from-fallible-components.md#engineering-model-for-fallible-agent-work)
already changes the design object from a perfect Agent invocation to a system
whose material errors are observable, bounded, and recoverable. It supports
proportional control and explicitly rejects universal stage lists. This is
strong project theory, but it does not yet identify which concrete harness
controls are net negative.

**Standing:** supported method; control-removal criteria still open.

### Process freedom may be a positive reliability variable

The [bounded-autonomy inquiry](bounded-autonomy.md#possible-decision-delta)
argues that when outcome, authority, feedback, and recovery boundaries are
sufficient, a controller should not also prescribe the actor's internal order,
tools, or local adaptation. Its first prospective comparison returned overlap
with the existing P11/P13/P15/P16 baseline, so the distinct Principle claim is
not established.

**Standing:** plausible and cross-context; distinct causal value unverified.

### Complex structure can dominate the task it is meant to support

The first model-capability campaign found that one exact Kimi execution profile
returned placeholders or failed structure and never used the available read
tool. The retained
[prompt/protocol interaction](../../regeneration/evaluations/2026-07-18-model-capability-seed.md#prompting-hypothesis-exposed-by-the-evaluation)
was narrower than “schemas are bad”: native structured-output pressure was a
plausible explanation for preventing investigation, while another profile used
the same task to gather evidence. A later two-phase settlement path repaired the
interaction.

**Standing:** verified for one execution profile; no universal schema claim.

The same campaign also removed typed failure-class assignment from its judge
after repeated prompts manufactured an unsupported causal label. The
[mechanism correction](../../regeneration/evaluations/2026-07-18-model-capability-seed.md#disconfirming-observation-and-correction)
shows that strengthening prose around a structurally wrong validator can repeat
the error; reducing the judge's authority preserved useful comparison evidence.

**Standing:** verified local example of removing an overreaching validation
responsibility.

### Simplification can improve actionability without deleting necessary proof

The [artifact-organization simplification
trial](../../regeneration/evaluations/2026-07-10-artifact-organization-rewrite.md#simplification-trial--2026-07-10)
replaced five standing workflow states with two commands, one optional record,
and inline verification. It is evidence that accumulated workflow structure can
be reduced while retaining the governing decision boundary. It was a local
self-evaluation, not a general harness comparison.

**Standing:** directional project evidence.

### External evidence favors task-conditioned interfaces, not one complexity rule

Anthropic's practitioner account says its most successful implementations used
[simple composable patterns and increased complexity only when
needed](https://www.anthropic.com/engineering/building-effective-agents). It
also warns that framework abstraction can obscure prompts and responses and
make debugging harder. This is first-party operational guidance, not a
controlled comparison and not evidence for removing a named safety boundary.

The empirical software-engineering literature supplies both sides of the
boundary. [SWE-agent](https://arxiv.org/abs/2405.15793) reports that an Agent-
Computer Interface designed around model capabilities materially improved
repository navigation, editing, and testing. In contrast,
[Agentless](https://arxiv.org/abs/2407.01489) showed that a simpler localization,
repair, and test-filtering pipeline was highly competitive with more complex
open-source agents on SWE-bench Lite; its own analysis also found agent-based
tools advantaged on cases without location clues. Complexity and tool freedom
therefore have conditional value determined by the task, interface, and
evidence—not by an agent-versus-workflow label.

[Reflexion](https://arxiv.org/abs/2303.11366) provides bounded evidence for
trial-and-feedback: language Agents improved across its tested tasks by turning
feedback into retained verbal reflection for later attempts. It does not show
that unlimited retry, self-critique, or accumulated prompt patches improve a
coding harness. The feedback must carry decision-changing information into the
next attempt.

**Standing:** supports simple baselines, task-specific interfaces, and
feedback-bearing retry; does not establish a universal lean or open harness.

## Historical control audit

The source-linked audit below records controls that were simplified because
their current form blocked or distorted the task. Each is a local mechanism
result, not a general provider or model property.

| Control debt observed | Whole-task consequence | Supported simplification |
|---|---|---|
| Forced terminal `tool_choice` on DeepSeek thinking mode | Eight trials investigated and then failed at an incompatible transport boundary. | Lower unsupported forced choice in the provider adapter while preserving independent terminal/schema verification. [Development record](../../regeneration/evaluations/2026-08-04-deepseek-v4-flash-refresh.md#thinking-level-development-experiment) |
| Unsupported inline `outputSchema` during K3 investigation | Schema runs made zero reads and could return schema-valid fiction; stronger instructions did not repair the interaction. | Investigate without response-format pressure, then project retained evidence through a private schema tool. [Matched development evidence](../../regeneration/evaluations/2026-07-18-kimi-structured-settlement.md#practice-2--completion-treatment) |
| One union-shaped or flattened terminal schema | The provider rejected the union before execution; flattening reached the model but mixed mutually exclusive branches while the outer terminal check passed. | Use distinct terminal tools so tool identity carries the branch and each schema exposes only its own fields. [Development and held-out record](../../regeneration/evaluations/2026-07-20-mission-reconciliation-flash-probe.md#development-observations) |
| Read tools exposed without read authority | Three of six development runs called unavailable tools before recovering. | Project only capabilities that the host can execute; omit absent tools instead of prompting the Agent not to use them. [Development observation](../../regeneration/evaluations/2026-07-20-mission-reconciliation-flash-probe.md#development-observations) |
| A stale 120-second budget applied to a new two-phase profile | Both runs completed investigation but were cut off before or during settlement; the repaired profile normally needed about 130–137 seconds. | Re-estimate the changed work instead of treating an old cutoff as a safety invariant. [Budget audit](../../regeneration/evaluations/2026-07-18-kimi-structured-settlement.md#live-post-fix-evidence-and-budget-audit) |
| A probe copied runtime-owned filename hashing | The first attempt failed before model execution because the copy guessed the runtime representation incorrectly. | Delete duplicate protocol knowledge and call the owning runtime's `timelinePath()`. [Recovery probe](../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md#what-the-failed-practices-changed) |
| A `continue` verifier could rewrite the durable next statement | Schema-valid outputs mixed transient watermark progress into long-lived intent. | Remove the field from the unchanged branch; allow statement changes only on the correction branch and check it at commit. [Recovery probe](../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md#what-the-failed-practices-changed) |
| A treatment campaign began from a uniform baseline floor | Twelve normal executions all failed the semantic rubric, so later improvement could not distinguish real redirection from answer injection or rubric artifacts. | Retire the field from attribution and qualify baseline headroom before adding treatment complexity. [Prompt-composition probe](../../regeneration/evaluations/2026-08-04-prompt-composition-predicate-language-probe.md#probe-4--repeated-session-baseline-qualification) |

The audit also found controls whose removal would contradict observed evidence:

- A read-only reviewer with `task_create` authority created and stranded an
  unnecessary Task. Host-selected
  [read-only Task projection](../../regeneration/evaluations/2026-07-21-review-cell-read-only-task-projection.md#baseline)
  removed the mutation path while retaining one useful terminal recovery.
- An ordinary full-toolbox probe printed a secret-bearing environment variable;
  the [credential-free isolation boundary](../../regeneration/evaluations/2026-07-17-agent-environment-source-and-value-boundary.md#full-toolbox-regression-and-safety-boundary)
  responds to an observed disclosure, not an imagined one.
- Sending repository-derived content to an external model remains a real effect
  that requires payload-specific authority; a simpler harness cannot silently
  redefine the Principal's disclosure decision.
- One supervisor verifier invented an `authorId` requirement, but after that
  false positive was removed, the same independent path found a real missing
  import. The result supports
  [narrowing verification to the accepted contract](../../design/decisions/051-correction-effects-close-verification-loop.md#observed-control-gap),
  not deleting verification.

**Standing:** repeated project evidence for moving, narrowing, or removing
misplaced controls; equally direct counterevidence against indiscriminate
permission and verification removal.

## Reliable-carrier audit

### Task or todo state

Work Cell has verified the mechanical relation among stable Task identity,
status, dependency, role-shaped authority, and settled work proof. That proves
process observability, not semantic truth or attention benefit. A read-only
reviewer created an unnecessary Task when mutation was exposed, and a separate
document-writing treatment settled its Task while still inventing causal
purpose. Task completion can therefore coexist with mainline or semantic
failure.

**Standing:** mechanical closure verified; reduced obligation loss directional;
reduced long-task mainline drift unverified.

### Sub-agent context layering

The [project-cognition scale-control
probe](../../regeneration/evaluations/2026-07-15-project-cognition-scale-control.md)
records a single Cell losing the whole after a 35-file, 632k-token trajectory.
Semantic partitioning isolated local packets, allowed only one overloaded packet
to be repartitioned, and synthesized from seven compressed reports without
inheriting the 1.39-million-token worker history. The complete field cost more
than the baseline and synthesis still made a material semantic error. The
evidence supports isolation, local failure, and compressed return—not more
agents, majority, or concurrency as quality signals.

**Standing:** verified project-scale mechanism; native sub-agent causal
advantage remains only directionally observed.

The [Rossovia + Herdr minimum-path
probe](../../regeneration/evaluations/2026-08-07-rossovia-herdr-delegation-minimum-path.md#corrected-interpretation)
adds a smaller counterexample to depth-based control. A worker formed a nested
investigation despite an explicit one-level contract, yet its read-only result
survived Main source verification and no repository effect escaped. The
realized organization was expensive for the task. This supports judging
delegation by effect containment, evidence, attention benefit, and cost rather
than treating topology depth as a validity gate; it does not prove the nested
child caused either the correct result or the high cost.

The follow-up [paired local
probe](../../regeneration/evaluations/evidence/2026-08-07-direct-vs-nested-delegation/README.md#observed-result)
declared the same source-local classification task and rubric for both arms.
Both returns produced five of five source-supported decisions and reported no
effect, while the nested parent reported 102 seconds versus 31 seconds and no
unique decision evidence. The actual serving identities, sandbox capabilities,
effect telemetry, and per-agent token use were not retained. This directionally
supports direct execution for an already local contribution and rejects forced
fan-out as a demonstrated quality signal in this case; it neither proves a
general nesting penalty nor tests a real context-displacing multi-file subtree.

**Standing:** direct preference directionally supported by one paired
source-local return; runtime equivalence, effect containment, and nesting's
causal cost and value on a real context-displacing contribution remain open.

### Structured settlement

The [held-out reconciliation
field](../../regeneration/evaluations/2026-07-20-mission-reconciliation-flash-probe.md#held-out-confirmation)
settled six of six cases with exactly one branch-specific terminal tool and no
recovery. Contrary records show that schema validity can still carry semantic
fiction and that forcing structure during investigation can prevent evidence
gathering. Terminal action, logical output, and file artifact should remain
independent observables; declare only the ones the task needs.

**Standing:** explicit terminal closure verified; schema-first and universal
all-output contracts rejected.

### Trial, error, and recovery

The [Mission queue recovery
probe](../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md#what-the-failed-practices-changed)
preserved successful state while failures removed duplicate protocol knowledge
and separated two semantic branches. In contrast, stronger K3 instructions did
not change its zero-read failure, empty-evidence terminal recovery has produced
fiction, and repeated large review turns have accumulated cost without learning.
Recovery is supported when the failed attempt changes the mechanism,
partition, evidence, or assumption and the next attempt retains exact identity.

**Standing:** graceful, read-only, identity-bound recovery supported; arbitrary
crash, writable-effect replay, and same-form retry unverified or unsafe.

## Hypothesis ledger

### H1 — Every control needs a whole-system burden of proof

**Standing:** unverified; supported by existing systems method.
**Conjecture:** A permission, gate, validator, retry, or policy should be
retained only when a named material failure path is observable and the control
improves whole-task success, containment, or recovery more than it reduces
capability, stability, clarity, and adaptation.
**Falsifier:** Consequence-based controls consistently prevent material escapes
whose expected cost dominates their ordinary execution burden even when matched
task completion falls.

### H2 — Tool and permission restriction can lower total reliability

**Standing:** unverified.
**Conjecture:** For reversible local development, restricting generally useful
read, edit, command, or delegation capabilities without a demonstrated threat
path will cause more incomplete work, workaround behavior, and unstable
execution than a broad tool surface with explicit effect boundaries and
observable changes.
**Falsifier:** Matched broadly enabled runs cause materially more unauthorized
or irrecoverable effects, or restricted runs preserve completion and recovery
without added intervention.

### H3 — Layered validation patches create control debt

**Standing:** supported by isolated project examples; general threshold
unverified.
**Conjecture:** When each failure adds another schema rule, code-level content
predicate, retry, exception, or fallback without removing the failed
assumption, the combined control path eventually creates more failure modes and
hides root causes.
**Falsifier:** Incremental controls remain independently attributable, reduce
escape rate under repeated disturbances, and do not increase retries,
unsettled runs, bypasses, or diagnosis cost.

### H4 — A task list is an attention carrier, not a universal workflow

**Standing:** unverified for reduced long-task drift; first matched development
probe invalidated by observer and cadence failures; the next event-timed return
trigger packet is locally freeze-ready but has not run control calibration.
**Conjecture:** A small task/todo surface helps long Agent sessions when it
re-exposes the active outcome, unresolved obligations, and return conditions
after local work. It becomes control debt when maintaining list state replaces
work, stale items remain authoritative, or every simple task must instantiate a
task system.
**Falsifier:** Matched long tasks show no reduction in forgotten obligations,
depth-first drift, or recovery effort, or task-list upkeep materially delays
completion.

### H5 — Sub-agents scale context before they scale concurrency

**Standing:** supported by project architecture and selected behavior records;
cross-task advantage unverified.
**Conjecture:** The main benefit of bounded delegation is keeping
decision-relevant whole-task context with the Main Agent while investigation or
implementation detail is isolated behind evidence-bearing returns. More agents
without a context boundary add coordination and correlated activity rather
than scale. A nested delegation is justified by the same relation: it is neither
an authority violation nor useful by default, and must preserve inherited
effect and acceptance boundaries while earning its reconstruction cost.
**Falsifier:** Direct single-Agent work matches accepted outcomes and context
cost on large tasks, or delegated work requires the Main Agent to reconstruct
nearly every worker trace.

### H6 — Structured settlement is useful when it closes, not leads, the loop

**Standing:** supported for Work Cell closure; boundary supported by one failed
profile.
**Conjecture:** `outputSchema`, terminal tools, and declared artifacts improve
reliability when they make the result and evidence mechanically observable
after sufficient investigation. They become harmful when native structure
pressure precedes or replaces investigation, or when schema validity is treated
as semantic acceptance.
**Falsifier:** Free-form completion matches settlement reliability and audit
cost, or schema-first execution consistently improves both investigation and
semantic acceptance across profiles.

### H7 — Guided error and bounded recovery outperform attempted infallibility

**Standing:** unverified as a general harness strategy.
**Conjecture:** For reversible work, a harness that preserves strong task
orientation, records intermediate effects, and supports bounded correction will
complete more valid work than one that attempts to prevent every possible
mistake through pre-action gates. A reversible departure from preferred process
should be judged by whole-task consequence before it is turned into a hard
failure or a new prohibition.
**Falsifier:** Error-permitting runs accumulate unrecoverable state, correction
cost dominates, or well-targeted prevention achieves equal capability with
lower escape and recovery cost.

### H8 — Removal needs an ablation, not an aesthetic verdict

**Standing:** supported by the current
[agent-tooling reduction method](../../skills/agent-tooling/SKILL.md#reduce-net-negative-tooling).
**Conjecture:** A suspected bad control should be disabled reversibly and
compared on the same task, model class, workspace, authority, input, and
acceptance condition. Complexity, annoyance, token count, or installed surface
count alone does not justify removal.
**Falsifier:** The control's threat model makes even an isolated reversible
ablation unacceptably dangerous, in which case simulation or historical
counterfactual evidence must replace it.

## Control-removal reasoning case

Before retaining or removing a control, reconstruct this compact case:

```text
Task population and consequence:
Control and the named failure it addresses:
Evidence that the failure is material and observable:
Capability or adaptation removed by the control:
Normal-path burden and new failure modes:
Recovery, rollback, or downstream verification without it:
Current evidence and strongest counterexample:
Provisional decision: retain | narrow | move to boundary | disable reversibly | remove
Future observation that could revise the decision:
Reopen condition:
```

This is a research probe, not a mandatory harness schema. A simple reversible
task may need only one sentence of reasoning.

## Existing-sequence coverage

- **P01** recovers the reason behind a past prohibition instead of extending its
  familiar form after the consequence model changes.
- **P02** requires evidence from the actual harness and task rather than a
  security or autonomy slogan.
- **P03** requires control design to return through operation, observed failure,
  correction, and another operation.
- **P04** asks which failure path actually governs the whole instead of adding
  controls for every imaginable error.
- **P09** supports todo and delegation only when they place decision-relevant
  information at the right attention layer.
- **P11** separates acting, reviewing, effect-commit, and final acceptance
  authority proportionally instead of turning every execution preference into
  a ceremonial separation or hard ban.
- **P13** prevents schema success, worker reports, and validator labels from
  becoming accepted fact without traceable settlement.
- **P14** keeps summaries, indexes, task projections, and generated artifacts
  subordinate to the sources from which their claims can be rebuilt.
- **P15** removes controls that do not change the governing contradiction while
  preserving necessary hard constraints.
- **P16** requires a harness form that lets the Agent act, not merely one whose
  policy is correct on paper.

The existing Sequence and the `systems-engineering`, `agent-tooling`,
`agent-delegation`, and `attention-management` methods plausibly cover the
decision. No new Principle is presently justified.

## Possible Skill decision

A distinct Skill would be justified only if repeated reviews show one recurring
action gap not already owned by `agent-tooling` or `systems-engineering`:

> identify a net-negative harness control, prove which hard constraint survives
> its removal, perform the smallest reversible simplification, and rerun the
> representative task.

The Skill must not become a new mandatory review, safety ideology, or gate for
removing gates. It should activate on observed patch accretion, tool/permission
interference, retry loops, contradictory validators, or a request to simplify a
harness—not on every design task.

## Strongest no-proposal case

This may be a better activation and evaluation path inside existing
`agent-tooling`: its current method already compares normal and lean profiles
and permits reversible removal of net-negative tooling. `systems-engineering`
already asks whether a control detects, contains, or recovers from a named
failure. P15 supplies minimum transition and P16 supplies actionability. A new
Skill would add discovery and context cost unless evidence shows that these
owners repeatedly fail to remove accumulated controls.

## Theory-first development before validation

Do not treat the historical audit as a finished theory or rush into a benchmark.
First pressure-test the ownership layers, truthful carrier claims, effect-first
control order, recovery relation, and control-debt diagnostic against the
strongest cases where direct prevention is necessary. Only when each statement
names an observation that could revise it should a matched comparison begin.

The eventual validation program, derived from that theory rather than preceding
it, is:

1. Reconstruct historical cases without changing their verdict: controls that
   were removed, controls that were repaired, and controls that remained
   necessary.
2. Freeze two or three representative reversible tasks with known room for
   error and one higher-consequence boundary task.
3. Compare normal and lean variants one control at a time: tool/permission
   restriction, schema-first versus deferred settlement, layered retry versus
   one observable recovery, and task-list or delegation presence.
4. Measure accepted completion, material escape, unsettled runs, human
   intervention, recovery effort, latency, usage, and diagnosis clarity. Do not
   use control count or token reduction as the outcome.
5. Retain failed ablations and cases where the supposedly bad control proves
   necessary.
6. Only after repeated decision-changing evidence, decide whether to revise
   `agent-tooling`, create a narrower Skill, or conclude `no-proposal`.

## Disposition and next evidence

**Disposition:** `open`

The source-linked historical audit and systematic theory have now survived an
independent exact-candidate review. The first derived practice is the frozen
[Todo obligation-carrier development probe](../../regeneration/evaluations/evidence/2026-08-06-todo-obligation-carrier/README.md): it compares an obligation-bearing
external Todo with an equally maintained ceremonial Todo while withholding
carrier vocabulary and mechanically validating artifact identity, settlement
equality, Todo shape, and update cadence before semantic review.

The Principal authorized the exact packet and the retained
[development result](../../regeneration/evaluations/evidence/2026-08-06-todo-obligation-carrier/RESULT.md)
completed eight DeepSeek V4 Flash worker runs. The comparison is invalid for H4:
the runner parsed a nonexistent `steps[].toolCalls` surface instead of the live
`steps[].content[]` tool-call blocks, and reconstruction showed that neither arm
performed the frozen read-then-update Todo cadence. A blind artifact review was
directionally worse for the obligation arm (`0/4` complete repetitions versus
`2/4` for ceremony), but that remains a secondary observation because the
matched process contract failed. H4 therefore remains open.

Retain the failed run. Do not repair and rerun it under the old authorization or
convert the secondary review into a verdict. The next probe selects neither
Todo re-reading nor Todo updating as its tested mechanism; it tests one
host-owned re-exposure event and records reads and updates only as mediators. It
must exercise the observer against a real host-trace fixture and use a
materially different transfer task. Do not create a new Skill before practice
exposes a recurring action gap not already owned by `agent-tooling` or
`systems-engineering`.

The selected next practice is now the locally freeze-ready development
[Todo return-trigger transfer probe](../../regeneration/evaluations/evidence/2026-08-06-todo-return-trigger/README.md).
Both arms receive the same pre-created obligation-bearing Todo. The only
treatment is one host-timed re-presentation of the still-open companion
obligation immediately after the first primary-artifact write. Todo reads,
updates, and completion are mediator observations, not validity gates. The
primary outcome is independent acceptance of the companion artifact on a
materially different repository-maintenance task.

The local observer uses Work Cell's host-owned `record.trace`, not
provider-shaped `rawSteps`, and fails visibly when the declared trace surface is
absent or internally inconsistent. Its retained trace probe now distinguishes
the two known write sequences, rejects malformed traces, and reports exact and
terminal-LF-normalized settlement separately. A probe-local runner now binds
the explicit arm without placing it in the initial model input, rejects any
fixture file-set drift, pins the evaluator-only semantic rubric, and retains
protocol-invalid records rather than throwing them away. The
[independent freeze review](../../regeneration/evaluations/evidence/2026-08-06-todo-return-trigger/FREEZE-REVIEW.md)
found no remaining load-bearing blocker for development use.

That review does not establish non-ceiling behavior or authorize an external
run. The next evidence is an authorized control calibration using untouched
fixture copies. Retire the fixture before causal comparison if independent
companion acceptance is near-universal, or if correct primary repair is
uncommon. Do not create a balanced comparison scheduler until this development
gate shows the transfer field is discriminating.
