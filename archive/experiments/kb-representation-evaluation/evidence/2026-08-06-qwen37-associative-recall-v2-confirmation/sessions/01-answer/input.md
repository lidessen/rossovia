# SHILU-S01

AnchorId: an_51c0
## Principles

- Entries are the source of truth.
- Indexes are rebuildable projections.
- Raw sources are preserved as evidence.
- Agents propose operations; the core validates and commits them.
- CLI and MCP expose the same stable operation surface.
- Capture is separate from interpretation.
- Knowledge growth must handle duplication, conflict, supersession, and review.
- AI is optional infrastructure, not a core dependency.

---

# SHILU-S02

AnchorId: an_1d20
### Source

A `Source` is raw input from a session, transcript, hook payload, file import,
meeting note, issue thread, or any other origin.

Sources are evidence. They should be immutable after capture except for metadata
such as processing status.

AnchorId: an_1d21
### Entry

An `Entry` is a small markdown knowledge unit. It is the main source of truth.

Entries should be atomic enough to classify, supersede, link, and retrieve. A
large handbook page can be generated from entries, but should not replace them.

AnchorId: an_1d22
### Entry Event

Every committed change to entries is recorded as an append-only event.

The event log allows audit, rollback, and index rebuilds.

---

# SHILU-S05

AnchorId: an_5a31
### MCP Writes: Job-Scoped Claims Required

All agent-side mutations to entries, links, and reviews must go through the
job system.

**Exceptions:** Direct writes via CLI (human at the terminal) do not require a
job — the human is the authorizing actor. MCP tools for human-invoked
operations may also skip job claims, but every mutation must still carry
provenance metadata (`actor`, `source`).

AnchorId: an_773d
### Validation Rules

- **Provenance**: Every `entry.create` and `entry.update` must reference at
  least one source, except when the actor is `human`.
- **Status transitions**: Valid transitions are `active → superseded`,
  `active → draft`, `draft → active`. Other transitions are rejected.

---

# SHILU-S04

AnchorId: an_824e
## Agent Interaction

Agent processors receive jobs and use Shilu tools to inspect sources, search
existing entries, and propose operations.

The interaction contract is the same for any agent:

1. Claim a job.
2. Read source material through the core.
3. Search for related entries using catalog, vector, and graph indexes.
4. Submit structured operations.
5. The core validates and commits or rejects operations.
6. The job is marked done, blocked, or needs review.

AnchorId: an_73cf
## Incremental Knowledge Workflow

new source
  -> register source
  -> enqueue digest-source job
  -> normalize source facts
  -> extract candidate entries
  -> search existing entries
  -> decide create / update / supersede / ignore / review
  -> commit operations
  -> update indexes

---

# SHILU-S03

AnchorId: an_0c40
## Indexes

Indexes are projections and must be rebuildable from sources, entries, and
events.

### Vector Index

Semantic retrieval over entry bodies and selected source summaries.

The vector index is a recall mechanism, not authority. A vector hit returns
candidate entry ids; all final operations must reference concrete entries and
sources.

AnchorId: an_0c4e
### Graph Index

Relationship projection:

- related
- supersedes
- contradicts
- derivedFrom
- sameAs
- cites
