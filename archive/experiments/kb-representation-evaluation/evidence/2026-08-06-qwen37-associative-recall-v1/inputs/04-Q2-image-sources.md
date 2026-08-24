# SHILU-S01 — DESIGN.md · Principles
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#Principles (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 30-39; the upstream blob remains authority.

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

# SHILU-S02 — DESIGN.md · Source / Entry / Entry Event
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#Source / Entry / Entry Event (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 85-180; the upstream blob remains authority.

### Source

A `Source` is raw input from a session, transcript, hook payload, file import,
meeting note, issue thread, or any other origin.

Sources are evidence. They should be immutable after capture except for metadata
such as processing status.

### Entry

An `Entry` is a small markdown knowledge unit. It is the main source of truth.

Entries should be atomic enough to classify, supersede, link, and retrieve. A
large handbook page can be generated from entries, but should not replace them.

### Entry Event

Every committed change to entries is recorded as an append-only event.

The event log allows audit, rollback, and index rebuilds.

---

# SHILU-S05 — DESIGN.md · MCP Writes / Validation Rules
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#MCP Writes: Job-Scoped Claims Required / Validation Rules (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 545-621; the upstream blob remains authority.

### MCP Writes: Job-Scoped Claims Required

All agent-side mutations to entries, links, and reviews must go through the
job system.

**Exceptions:** Direct writes via CLI (human at the terminal) do not require a
job — the human is the authorizing actor. MCP tools for human-invoked
operations may also skip job claims, but every mutation must still carry
provenance metadata (`actor`, `source`).

### Validation Rules

- **Provenance**: Every `entry.create` and `entry.update` must reference at
  least one source, except when the actor is `human`.
- **Status transitions**: Valid transitions are `active → superseded`,
  `active → draft`, `draft → active`. Other transitions are rejected.

---

# SHILU-S09 — pkg/types/validation.go · ValidateEntry
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: pkg/types/validation.go#ValidateEntry (blob dc9320998ef71cd4307998126ed09ebaf3f1c88d)
Selection: curated passages from committed lines 82-99; the upstream blob remains authority.

// ValidateEntry validates required fields on an Entry.
func ValidateEntry(e Entry, actor Actor) error {
	if e.Title == "" || e.Kind == "" {
		return ErrInvalidFrontmatter
	}
	if !ValidEntryKinds[e.Kind] {
		return ErrInvalidKind
	}
	switch e.Confidence {
	case ConfidenceHigh, ConfidenceMedium, ConfidenceLow:
	default:
		return ErrInvalidConfidence
	}
	if actor != ActorHuman && len(e.Sources) == 0 {
		return ErrMissingProvenance
	}
	return nil
}

---

# SHILU-S12 — pkg/core/entries.go · CreateEntry / SupersedeEntry
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: pkg/core/entries.go#CreateEntry / SupersedeEntry (blob 28debcfa7c395a1d0767696cf9027ac52c4420fb)
Selection: curated passages from committed lines 11-75,208-255; the upstream blob remains authority.

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
if err := c.recordEvent(types.EventEntryCreated, actor, actorID, e.ID, e, sourceIDs); err != nil {
	return nil, fmt.Errorf("record creation event: %w", err)
}

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
