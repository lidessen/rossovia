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

# SHILU-S11

AnchorId: an_5f10
// DigestRequest contains all the context needed for a digest-source operation.
// The processor gathers this from the job queue, source registry, and catalog
// before calling AgentProvider.DigestSource.
type DigestRequest struct {
	// Source is the raw source record being processed.
	Source types.Source `yaml:"source" json:"source"`

	// RawContent is the full text content of the source, extracted by the
	// normalizer for the source's format type.
	RawContent string `yaml:"rawContent" json:"rawContent"`

	// Collection is the target collection name for extracted entries.
	// Determined by the source's workspace field or a configured default.
	Collection string `yaml:"collection" json:"collection"`

	// CollectionCfg is the configuration for the target collection.
	// The provider uses this to determine extraction policy (review strictness,
	// default tags, etc.).
	CollectionCfg *types.CollectionConfig `yaml:"collectionCfg,omitempty" json:"collectionCfg,omitempty"`

	// RelatedEntries are existing entries in the target collection that may
	// relate to the source content. The provider uses these for deduplication
	// and linking decisions.
	RelatedEntries []types.Entry `yaml:"relatedEntries,omitempty" json:"relatedEntries,omitempty"`
}

AnchorId: an_6e2a
// DigestResult contains the proposed operations from a digest-source run.
// The processor validates these through Core.CommitOperations and creates
// review items for low-confidence results.
type DigestResult struct {
	// Operations are the structured operations (create, update, link, supersede)
	// proposed by the provider. Each operation should have appropriate provenance
	// and confidence.
	Operations []types.Operation `yaml:"operations" json:"operations"`

	// ReviewItems capture uncertainty: low-confidence extractions, possible
	// duplicates, or proposed supersessions that need human review.
	ReviewItems []types.ReviewItem `yaml:"reviewItems,omitempty" json:"reviewItems,omitempty"`
}

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
