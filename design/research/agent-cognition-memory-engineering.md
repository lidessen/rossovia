# Agent Cognition and Memory Engineering

**Status:** source-bound design research

**Date:** 2026-07-18

**Disposition:** informs [Decision 039](../decisions/039-general-cognition-experiment.md);
no Sequence proposal

## Question

How can information enter through ordinary agent work, become maintained
cognition, and improve later action without turning every event into permanent
memory, giving an extractor hidden fact authority, or spending more on memory
maintenance than the later decisions are worth? Can a swarm of inexpensive Work
Cells improve this system rather than merely multiply the same error?

This is an engineering question about a lifecycle, not a search for one ideal
database. The evidence below was read as implementation evidence: which form
owns capture, formation, retrieval, update, maintenance, and acceptance; where
cost accumulates; and what repeatedly fails.

## Practice families and what they establish

### Hierarchical context and agent-managed memory

[MemGPT](https://arxiv.org/abs/2310.08560) treats context as a hierarchy and
lets an agent move information between limited fast context and larger external
storage. This establishes that memory is partly an attention-management problem:
the system cannot make all retained material equally present. It does not solve
which abstractions are true, who may admit them, or how a revised conclusion
preserves its lineage.

[CoALA](https://arxiv.org/abs/2309.02427) separates memory modules from action
and decision processes. That boundary is more useful here than any fixed memory
taxonomy: storage, retrieval, reasoning, and authority must not collapse into
one model call.

### Hot-path tools and background consolidation

[LangGraph's memory model](https://docs.langchain.com/oss/python/concepts/memory)
distinguishes short- and long-term memory and explicitly presents hot-path and
background update modes. The current LangMem implementation gives a memory
manager broad instructions to extract, compare, consolidate, generalize, and
optionally update or remove memories
([source](https://github.com/langchain-ai/langmem/blob/a2d580946465137c89162e67dc0b18108bd4850c/src/langmem/knowledge/extraction.py#L185-L235)).
That is useful automation, but it also concentrates semantic selection,
generalization, compression, and mutation authority in one stochastic step.

LangMem's delayed-processing guide identifies the concrete consequence of
running that step on every message: redundant work, incomplete conversational
context, and unnecessary tokens. Its remedy is per-thread debounce and
rescheduling after a quiet period
([source](https://github.com/langchain-ai/langmem/blob/a2d580946465137c89162e67dc0b18108bd4850c/docs/docs/guides/delayed_processing.md#L6-L70)).
The same guide warns that a local background thread is not durable in a
serverless process. Background formation therefore needs a durable queue and
receipts when delivery matters; “run later” is not an execution guarantee.

### Extracted vector memory

Mem0 exposes a convenient write surface in which an LLM can extract facts and
decide whether related memories should be added, updated, or deleted
([source](https://github.com/mem0ai/mem0/blob/ddaa655edf41e3ed375b263fb227da0bcd42ccb9/mem0/memory/main.py#L721-L764)).
Its implementation shows the hidden work behind that simple interface:
retrieve nearby memories, call an extractor, parse structured output, embed,
deduplicate, persist history, and link entities
([source](https://github.com/mem0ai/mem0/blob/ddaa655edf41e3ed375b263fb227da0bcd42ccb9/mem0/memory/main.py#L872-L1055)).
An update then re-embeds the current record, appends history, removes old entity
links, and reconstructs new ones
([source](https://github.com/mem0ai/mem0/blob/ddaa655edf41e3ed375b263fb227da0bcd42ccb9/mem0/memory/main.py#L1972-L2035)).

The lesson is not that extraction is wrong. It is that a one-command memory API
can hide write amplification, partial failure, model authority, and divergence
between the current record, its history, its vector representation, and its
relations. These surfaces need separate integrity and cost evidence.

### Temporal knowledge graphs

[Zep's temporal knowledge-graph paper](https://arxiv.org/abs/2501.13956) and
Graphiti preserve episodes and temporal relationships instead of reducing
memory to isolated facts. Graphiti's `add_episode` path retrieves prior
episodes, extracts and resolves entities and edges, invalidates contradictions,
persists several graph forms, and may update communities
([source](https://github.com/getzep/graphiti/blob/0b4bcf1284ee5fba56b77ed9961568a541e0d418/graphiti_core/graphiti.py#L980-L1215)).
The API documentation recommends queued, sequential episode ingestion. Even
temporal edge resolution may require another model call to extract timestamps
([source](https://github.com/getzep/graphiti/blob/0b4bcf1284ee5fba56b77ed9961568a541e0d418/graphiti_core/utils/maintenance/edge_operations.py#L576-L620)).

Temporal relations are valuable when time and contradiction change decisions.
They are not a free universal substrate. Entity resolution, edge invalidation,
ordering, and community maintenance create a second consistency problem unless
the graph remains a reconstructible projection over source-linked cognition.

### Deterministic structural projections

Aider's repository map is a useful counterexample to model-first memory. It
extracts code definitions and references, builds a graph, uses task-specific
personalization and PageRank, caches the result, and fits a ranked structural
view to a token budget
([source](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L365-L470),
[source](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L600-L705)).
It can still be slow on a first scan and can fail on very large dependency
graphs
([source](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L90-L153)),
but its index is cheap to rebuild and does not pretend to be semantic truth.
This supports a deterministic-first rule: use syntax, revision identity,
ownership, and declared dependencies to scope model judgment before asking a
model to infer meaning.

### Retrieval, update, and evaluation

[Generative Agents](https://arxiv.org/abs/2304.03442) combines a memory stream
with retrieval based on recency, importance, and relevance, plus higher-level
reflection. This demonstrates that retention and attention are different
operations. A memory may remain retained while leaving the active projection.

[LongMemEval](https://arxiv.org/abs/2410.10813) exposes the failure modes that
ordinary recall tests miss: information extraction across sessions, temporal
reasoning, knowledge updates, and abstention when the premise is unsupported.
Its reported degradation in long histories supports evaluating the whole
pipeline rather than retrieval hit rate alone. [LongMemEval-V2](https://arxiv.org/abs/2605.12493)
extends the problem to state, workflows, and operational gotchas; evidence-rich
agentic retrieval can improve accuracy while substantially increasing latency.

[Mem0's evaluation guidance](https://docs.mem0.ai/core-concepts/memory-evaluation)
also treats accuracy, latency, and token cost as joint dimensions. A useful
evaluation must add costs that those dimensions omit: write amplification,
background backlog, human repair, stale-memory impact, and the cost of proving
that a retrieved abstraction still applies.

[Sleep-time Compute](https://arxiv.org/abs/2504.13171) shows when background
precomputation can be economical: later queries must be sufficiently
predictable or repeated so the work can be amortized. It is not a license for
continuous global reflection over every captured event.

## Cheap swarm: where the reaction is real

The useful swarm effect is not created by vote count. It comes from matching
topology to a decomposable information field and preserving complementary
evidence through reconciliation.

[Chain-of-Agents](https://research.google/pubs/chain-of-agents-large-language-modelscollaborating-on-long-context-tasks/)
shows a promising case: split long inputs, let bounded agents aggregate through
a chain, and use a manager for the final response. [Mixture-of-Agents](https://arxiv.org/abs/2406.04692)
shows that layered proposal and aggregation can improve output, with heterogeneous
proposers contributing more than repeated samples of one model. [MacNet](https://arxiv.org/abs/2406.07155)
reports scaling under task-oriented DAGs and also finds that topology and even
edge direction materially affect quality.

The limiting evidence is equally important. Google's 180-configuration study
reports large gains on parallelizable tasks but degradation on sequential
planning, increasing coordination cost with tool count, and much greater error
amplification in uncoordinated independent systems than centralized ones
([research summary](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)).
A 2026 study of sub-10B models found a single tool-using agent offered a better
cost/performance balance than its multi-agent configurations
([paper](https://arxiv.org/abs/2604.19299)).

For cognition work, inexpensive swarm is therefore justified when all of these
conditions hold:

1. the source field has several independently inspectable regions or facets;
2. each Cell receives enough source evidence to answer one narrow question;
3. differentiation changes evidence scope, method, or contradiction—not merely
   role-playing adjectives over the same prompt;
4. outputs name coverage, uncertainty, boundary obligations, and overload;
5. reconciliation checks cross-region relations against source rather than
   concatenating or majority-voting prose; and
6. an external verifier and host retain admission authority.

It is a poor default for sequential formation, one shared mutable state,
tool-dense action, tiny sources, or questions whose error is strongly
correlated across identical models. In those cases a cheap swarm can be more
expensive than one better call because the synthesis must reconstruct the
coherence that partitioning destroyed.

## Repeated engineering failures

| Lifecycle boundary | Repeated failure | Consequence |
|---|---|---|
| ingress | every message or tool event triggers formation | duplicate work, partial context, token burn, and noisy durable state |
| capture | raw event and admitted memory share one store or status | retention is mistaken for truth and privacy scope becomes unclear |
| formation | one extractor selects, abstracts, generalizes, and mutates | unreviewable semantic authority and provenance loss |
| representation | graph/vector index becomes the canonical record | rebuild and migration become dangerous; projection drift looks like fact drift |
| retrieval | relevance score is treated as applicability | stale or context-specific memory silently governs a new decision |
| update | current text is overwritten and indexes repaired independently | history, embeddings, and relations can disagree after partial failure |
| background work | local threads stand in for durable jobs | lost work, duplicate work, and invisible backlog |
| swarm | same model/prompt is multiplied and outputs are voted or concatenated | correlated error, false confidence, and lost cross-boundary relations |
| evaluation | recall accuracy is measured without later decision impact | a system can score well while adding latency, repair, and wrong inherited action |

## Consequences for Atthis

1. **Ingress is not admission and should not be an unfiltered event sink.** A
   vendor adapter first applies deterministic scope, privacy, identity,
   deduplication, and debounce. `source ingest` receives a capture-worthy event;
   it does not mean every raw event must become a durable source.
2. **Use two speeds.** Explicit correction, an accepted decision, or a failed
   verification may request immediate impact inspection. Ordinary conversation
   and traces accumulate into a bounded episode and are considered in the
   background after a quiet or task boundary.
3. **Keep the deterministic kernel narrow.** Source identity, predecessor
   links, scheme versions, formation lineage, use, supersession, impact fields,
   and rebuildable projections are mechanism. Extraction, semantic relations,
   relevance, and refresh scope remain domain judgment until repeated practice
   yields a stable contract.
4. **Never grant a model implicit mutation authority.** Cells propose.
   Reconciliation and verification produce evidence. A host admits or
   supersedes. Destructive retention policy is separate again.
5. **Treat temporal, vector, graph, and hot-set views as projections.** Add one
   only when a measured retrieval or impact-discovery failure warrants its
   maintenance cost.
6. **Escalate execution by task shape.** Deterministic scope, direct retrieval,
   current agent, one Cell, and then a swarm are distinct economic levels. A
   swarm is selected by decomposability and expected error reduction, not by
   importance alone.
7. **Observe the lifecycle.** Record captured episodes, coalescing ratio,
   formation calls, proposals rejected, admission latency, retrieval use,
   incorrect inheritance, refresh scope, supersession, model tokens and cost,
   queue delay, and human repair.

## Next bounded experiment

Run one real project-cognition refresh over a medium repository change:

1. capture a Git change, a direct human correction, and the verification
   outcome through one adapter, but debounce them into one task episode;
2. use deterministic revision and dependency evidence to nominate affected
   cognition;
3. compare direct current-agent formation, one Cognition Cell, and a small
   4–8 Cell swarm over the same decision question;
4. give swarm Cells source-backed facets and boundary obligations, then perform
   a separate reconciliation and verification;
5. admit nothing automatically; and
6. compare decision completeness, unsupported claims, missed cross-boundary
   impact, repair effort, latency, tokens, and total cost.

The probe passes only if formed cognition changes a later decision correctly
and the additional execution level reduces total error or reconstruction work
enough to justify its own coordination and maintenance cost. This experiment,
not benchmark reputation, should determine whether cheap swarm becomes a normal
cognition formation strategy.
