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

# SHILU-S06

AnchorId: an_6c60
#### Source Content: Copy-on-Add by Default, Opt-Out Reference

When `shilu source add --path <path>` is called, the content is copied into
`~/.shilu/sources/<type>/` using the existing `pkg/source.StoreRaw()`, and the
internal `RawPath` points to the copy.

Rationale: Sources are the evidence foundation of the knowledge system. If a
source's file disappears, provenance is lost and the processor cannot read
content. Copying on add makes SHILU_HOME self-contained — portable for backup,
sync, and git collaboration — without breaking remote/URL sources.

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

# SHILU-S09

AnchorId: an_98b0
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
