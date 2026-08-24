# SHILU-S12

AnchorId: an_922b
// CreateEntry creates a new entry after validation. It generates a
// deterministic entry ID, records a creation event, and persists the entry.
if err := types.ValidateEntry(e, actor); err != nil {
	return nil, fmt.Errorf("validate entry: %w", err)
}
if err := c.entries.Create(e); err != nil {
	return nil, fmt.Errorf("create entry: %w", err)
}
if c.indexer != nil {
	if err := c.indexer.IndexEntry(e); err != nil {
		return nil, fmt.Errorf("index entry: %w", err)
	}
}

AnchorId: an_d8e5
if err := c.recordEvent(types.EventEntryCreated, actor, actorID, e.ID, e, sourceIDs); err != nil {
	return nil, fmt.Errorf("record creation event: %w", err)
}

AnchorId: an_b531
// SupersedeEntry marks an entry as superseded and records the relationship.
old.Status = types.EntryStatusSuperseded
newIDStr := newID
old.SupersededBy = &newIDStr
if err := c.entries.Update(*old); err != nil {
	return fmt.Errorf("update superseded entry: %w", err)
}
next.Supersedes = append(next.Supersedes, oldID)
if err := c.entries.Update(*next); err != nil {
	return fmt.Errorf("update superseding entry: %w", err)
}
return c.recordEvent(types.EventEntrySuperseded, actor, actorID, oldID, map[string]string{
	"oldId": oldID,
	"newId": newID,
}, nil)

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

# SHILU-S08

AnchorId: an_40c1
// Package core implements the deterministic operations of the Shilu knowledge
// system. It validates, commits, and records every mutation to entries,
// sources, and relationships. All state changes go through the Core, which
// enforces the validation rules defined in the design and types packages.
//
// The Core owns the invariant: every mutation is preceded by validation,
// recorded as an event, and persisted through the appropriate store.
package core

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
