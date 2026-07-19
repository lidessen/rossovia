# 039 — Progressive Cognition Formation Experiment

**Status:** accepted experiment
**Date:** 2026-07-18
**Human mandate:** reconstruct the useful cognition and knowledge-system ideas
from the retired Shilu project inside this repository as a general capability,
not as a workspace-specific subsystem, a dependency on Shilu, or a flat index
of extracted knowledge.

## Concrete need and corrected hypothesis

Atthis needs reusable cognition when resuming work, but project cognition is
only one instance of a broader problem. Personal preferences, research,
organizational procedures, work traces, project models, and later domain
knowledge all need to preserve how cognition was formed and revised.

The first implementation hypothesis reduced this to immutable sources,
source-linked knowledge units, admission, and a rebuildable catalog. That
protected provenance and authority, but it was still a single-layer knowledge
store. An extractor could jump directly from material to a durable statement;
adding relations, a graph, embeddings, or more kinds would only improve the
same flat representation.

The corrected hypothesis follows P03 and P07: cognition is a progressive and
recursive formation process. Concrete material is observed and represented;
distinctions and concepts are formed; related determinations are synthesized
into local models and a more intelligible whole; that understanding is
expressed for practice; observed outcomes return as new material that may
challenge any earlier formation. No universal list of those layers fits every
domain, but the transitions and their evidence must be explicit.

Classical cognitive architectures reinforce the rejection of a single-store
model without supplying our domain method. [CoALA](https://arxiv.org/abs/2309.02427)
separates memory, action, and decision processes. [ACT-R](https://act-r.psy.cmu.edu/)
distinguishes declarative and procedural systems. [Soar](https://soar.eecs.umich.edu/home/About/)
uses working, semantic, episodic, and procedural memories with several learning
mechanisms. These are useful boundary evidence: a catalog or graph is not a
cognitive architecture. This experiment remains governed by the Sequence and
observed project needs rather than copying any of those taxonomies.

The engineering comparison in
[Agent Cognition and Memory Engineering](../research/agent-cognition-memory-engineering.md)
tests this hypothesis against current memory, graph, repository-map,
background-processing, and multi-agent implementations. Its principal
correction is that natural ingress needs deterministic filtering and episode
coalescing before model formation; a cheap swarm is a task-shape-dependent
execution strategy, not a default memory stage.

## Decision

Create `packages/cognition` as a deterministic TypeScript experiment with five
distinct forms:

1. **Source** captures immutable material or practice evidence.
2. **Formation scheme** declares domain-specific stages and allowed formation
   moves. It is versioned and supplied by a domain method; the core contains no
   universal cognition hierarchy.
3. **Cognitive artifact** is a proposed or admitted result at one declared
   stage. It records the exact move, inputs, and formation rationale that
   produced it.
4. **Operation evidence** records registration, capture, proposal, and
   admission. A higher artifact may be explored from proposed inputs, but it
   cannot be admitted until every artifact input has itself been admitted.
5. **Catalog** is a disposable retrieval projection over artifacts. A graph,
   vector index, full-text index, or visualization may later be another
   projection; none owns formation semantics or fact authority.

A formation move may combine material and prior artifacts. A domain scheme can
therefore express a practice loop, for example `applied-guidance + observed-
outcome -> revised-observation`, without teaching the core that every domain
has stages named observation, concept, model, and guidance. Branching, merging,
and returning to an earlier stage are legal when a scheme declares them.

The core contains no project, workspace, repository, Git revision, task,
worktree, model, prompt, provider, or Sequence field. `project-cognition` owns
how one project is decomposed and verified; another method may define a
different formation scheme for personal preference or research. Work Cell and
Swarm may execute a prepared formation move, but they do not choose the domain
scheme, admit artifacts, or acquire semantic authority.

The CLI remains a thin mechanism adapter: initialize a home, register a
formation scheme, capture a source, propose/get/admit an artifact, query or
rebuild the catalog, and check integrity. It is not a daemon, agent, memory
hook, global task board, or universal cognition method.

Operability and maintainability are acceptance conditions, not later polish.
The routine surface stays small: `trace` reconstructs why one artifact exists,
`dependents` finds the downstream review field after a lower formation changes,
and `check` validates source integrity and rebuildable projections. Schemes are
immutable by `(id, revision)` so a changed method is explicit rather than a
silent migration. The experiment does not add automatic cascade invalidation,
background extraction, a visual graph editor, or workflow orchestration until
real maintenance shows that one of them removes more work than it creates.

The CLI records caller-supplied actors and bases but does not authenticate
them. Capability exposure and authority remain with the host. An event proves
that a transition was recorded, not that the named actor was genuine or
authorized.

## Information and memory lifecycle

The system's principal loop is:

`information event -> filter/coalesce -> capture -> attention/triage ->
progressive formation -> admitted memory -> retrieval in practice -> observed
result or correction -> impact discovery -> selective refresh`

Information should enter through ordinary work rather than a separate archival
ritual. Tool calls, harness hooks, conversation capture, file or repository
events, and Work Cell outputs may all be noticed by adapters. Before lowering a
capture-worthy episode into the strict source-ingress contract, an adapter owns
deterministic scope, privacy, event identity, deduplication, and debounce.
Per-message model formation is not natural flow; it is write amplification.
Capture may be automated, but it does not make the input durable knowledge.
Attention and domain formation remain explicit so that transcript volume does
not become memory authority.

Formation has two speeds. Direct correction, accepted decisions, failed
verification, and other high-value invalidation signals may request immediate
impact inspection. Ordinary conversational and operational events are
coalesced into a bounded task episode and considered after a quiet or task
boundary. A background executor must use durable queue and receipt semantics
when delivery matters; an in-process timer is not a reliable job system.

Maintenance combines active organization and natural forgetting at different
layers:

- ephemeral working context may expire without entering long-term cognition;
- captured evidence follows an explicit retention policy and remains cold by
  default rather than being injected into every task;
- admitted cognition is updated by forming and verifying a replacement, then
  superseding the prior artifact—never by silently rewriting its history;
- source revisions, practice failure, direct correction, contradictions,
  scheme revision, and risk-based review are maintenance triggers;
- use events provide evidence for later retrieval ranking, but elapsed time or
  low access frequency alone never turns an admitted claim false; and
- natural forgetting belongs first to rebuildable attention and retrieval
  projections: unused material falls out of the hot working set while remaining
  traceable on demand. Destructive deletion requires a separate privacy, legal,
  or retention decision.

The first kernel therefore records source predecessor links, cognition-use
events, explicit supersession, and compact source/artifact impact fields. It
does not yet hard-code hot/warm/cold scoring, periodic global cleanup, or a
retention algorithm. Those require observed use, correction, retrieval, and
maintenance data first.

Source identity includes predecessor identity as well as kind, locator, and
content digest. This permits a truthful `A -> B -> A` revision history without
collapsing the later reversion into the first capture; an unchanged immediate
revision is rejected. When an artifact supplies an optional source locator it
must match the immutable source record. Admission revalidates the artifact's
scheme move, output stage, ordered input slots, active dependency lineage, and
every reachable source hash rather than trusting that proposal-time validation
remains current. Supplying a new source revision to impact discovery includes
artifacts formed from its predecessor lineage, so the new capture itself opens
the ordinary refresh path.

`check` reconciles each durable scheme, source, proposal, admission, and
supersession state with its required operation evidence in addition to checking
source hashes and catalog freshness. Its diagnostic result carries an explicit
health state, and the CLI exits nonzero when that state is unhealthy. This makes
interrupted or deleted evidence observable; it does not claim transactional
prevention or automatic recovery.

## System form and economic execution

The useful Shilu hypothesis is not a better knowledge database. It is an
engineering system that composes existing agents, tools, triggers, bounded
workers, and durable evidence into reliable cognition at acceptable cost. No
single form should own that system.

| Form | Owns | Does not own |
|---|---|---|
| Domain Skill or local method | deciding whether cognition is needed, selecting a formation scheme and move, choosing inputs, and judging semantic refresh scope | durable state, model execution, or admission |
| Cognition runtime | immutable sources, versioned schemes, formation and admission transitions, integrity, lineage, and compact impact discovery | universal stages, domain truth, provider routing, or autonomous planning |
| CLI or agent tools | narrow access to capture, form, inspect, trace, query, and check operations | a second source of truth or hidden semantic policy |
| Harness hook or event adapter | noticing a candidate event, capturing material, or prompting an agent to inspect possible invalidation | automatic abstraction, acceptance, or tool-specific policy in the core |
| Current interactive agent | inexpensive situated judgment when the loaded context and task remain coherent | durable authority merely by producing an answer |
| Work Cell | one prepared, bounded formation move whose evidence and output need isolated retention | scheme selection, admission, or orchestration policy |
| Swarm or queue | scale when a real source field must be partitioned below one Cell's stable working range | semantic decomposition, synthesis truth, or automatic acceptance |
| Human or host governance | adopting a scheme revision and admitting decision-bearing cognition | reconstructible indexes or routine mechanical checks |

Hooks remain tool-specific adapters, not part of the core contract. A setup
method may inspect current Codex, Claude Code, Cursor, or another harness's
official capabilities and install a small adapter. The stable contract is the
event and operation intent—capture this material, inspect affected cognition,
or request a prepared refresh—not a frozen vendor configuration.

Execution follows an escalation ladder:

1. use deterministic integrity, lineage, and change checks;
2. retrieve the named source or existing artifact directly;
3. let the current agent perform a small, coherent formation with already
   loaded context;
4. allocate one Work Cell when isolation, repeatability, or retained evidence
   justifies a separate model call; and
5. use Swarm only when the material must be semantically partitioned so each
   Cell stays within a stable capability envelope and expected error reduction
   exceeds reconciliation cost.

The selection is based on observed coherence, decomposability, sequential
dependency, tool density, reconstruction cost, correlated-error risk, and
downstream decision value—not a ritual requirement that every source pass
through a model or every model task become a Cell. Estimated model use is
recorded before execution and audited against actual use afterward; important
formation may exceed its estimate within the host's high safety ceiling, but a
large delta is evidence for changing decomposition, prompting, or model route.

### Cognition Cell phenotype

A Cognition Cell is a prepared use of the generic Work Cell, not a new worker
class. Its prompt, sources, formation move, tools, output contract, and
acceptance criteria give it a temporary cognition role. It never owns memory
state.

The domain method keeps the whole visible at low resolution and partitions a
large field by coherent decision question, responsibility, causal or state
path, authority, public contract, changed-relation cluster, or another
source-backed boundary. It does not split by equal bytes or directory count.
Every Cell receives one question, source scope, incoming and outgoing relation
obligations, local acceptance, and a signal for reporting overload instead of
silently expanding.

Parallel Cells propose local artifacts and semantic relation changes. A
separate reconciliation formation reconnects declared boundaries, resolves
conflicts against source, and preserves missing relations. It is synthesis, not
concatenation or majority vote. An independent verifier then checks the
decision-relevant source and relation field before the host admits or
supersedes cognition.

Cheap Cells can create a useful ensemble effect through coverage and
complementary evidence, but price and count are not selection evidence. The
swarm must vary source facet, decision method, or contradiction under review;
repeating one model and prompt mainly repeats correlated error. Sequential
formation, shared mutable state, tool-dense execution, or a small coherent
source remains a one-agent or one-Cell problem unless a measured probe shows
otherwise.

Refresh begins deterministically: a new source revision or replaced artifact
identifies candidate dependents. The domain method selects affected facets and
their boundary neighbors. Only those regions receive refresh Cells; successful
siblings remain reused with an explicit source-backed reason. Swarm owns queue
and scale, while the domain method owns decomposition and reconciliation.

## First proof

The first deterministic probe must show:

1. a scheme can require source -> observation -> model -> guidance and reject a
   direct source -> guidance jump;
2. an artifact retains its formation inputs and cannot be admitted while a
   lower artifact input remains proposed;
3. a declared feedback move can combine an admitted guidance artifact and a
   practice-outcome source into a new observation without automatically
   rewriting either; and
4. project and non-project schemes can use the same core while the catalog is
   deletable and rebuildable.

The source-integrity review adds two failure probes: a forged source locator
cannot enter formation lineage, and source bytes changed after proposal prevent
admission. A revision probe preserves distinct identity and predecessor lineage
when content returns to an earlier value.

This proves a mechanism boundary, not useful cognition. The next behavioral
experiment must compare a real later decision with and without the formed
multi-layer inheritance. It should observe decision delta, incorrect inherited
abstractions, missing cross-layer relations, retrieval cost, and whether
practice feedback causes a smaller truthful revision than rebuilding the whole.
It must also compare at least two execution levels from the escalation ladder
so the result measures useful cognition per cost, not quality in isolation.
It should record episode coalescing, rejected proposals, unsupported claims,
missed cross-boundary impact, queue and admission latency, human repair, and
write or refresh amplification—not only answer accuracy and model tokens.

The first [cheap-Swarm execution-shape probe](../../regeneration/evaluations/2026-07-18-cheap-swarm-cognition-probe.md)
found complementary local precision and an 18% lower token total across the
four final valid packet records, but retries and provider stalls made the actual
Swarm path 71.5% more expensive than one whole-field Cell. Reconciliation also
had to reject false negative claims from one narrow packet using sibling and
source evidence. This supports Cognition Cells as conditional formation
carriers and rejects default Swarm use. It does not close the behavioral gate:
no formed inheritance was admitted and tested in a later decision.

The subsequent [index-first retrieval probe](../../regeneration/evaluations/2026-07-18-index-first-cognition-retrieval-probe.md)
found that a non-authoritative file-level routing projection reduced tokens by
80.8% against broad source discovery in one matched run, but neither form caught
the retained source-truth defect. Prompt-declared line locators were then
ignored and caused whole execution records to enter context. A final runtime-
bounded treatment delivered only 2.6 KB of selected, provenance-linked terminal
evidence and reduced the run to 169,104 tokens, yet still missed the defect.
This supports retrieval projections and bounded expansion as attention-cost
controls only. The tested verifier next needs claim-addressed audit coverage;
retrieval delivery alone cannot claim a behavioral cognition improvement.

## Reopening observations

Reopen the experiment if domains cannot declare truthful formation paths
without empty ritual stages; if move validation turns domain judgment into a
universal ontology; if callers routinely bypass lower formations with one
catch-all stage; if admission lineage cannot reveal which lower artifact or
source invalidated a decision; or if the formed inheritance changes no later
action compared with direct source inspection.
