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

# SHILU-S04 — DESIGN.md · Agent Interaction / Workflow
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#Agent Interaction / Incremental Knowledge Workflow (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 369-458; the upstream blob remains authority.

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

# SHILU-S06 — DESIGN.md · Source Content
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#Source Content: Copy-on-Add by Default, Opt-Out Reference (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 830-842; the upstream blob remains authority.

#### Source Content: Copy-on-Add by Default, Opt-Out Reference

When `shilu source add --path <path>` is called, the content is copied into
`~/.shilu/sources/<type>/` using the existing `pkg/source.StoreRaw()`, and the
internal `RawPath` points to the copy.

Rationale: Sources are the evidence foundation of the knowledge system. If a
source's file disappears, provenance is lost and the processor cannot read
content. Copying on add makes SHILU_HOME self-contained — portable for backup,
sync, and git collaboration — without breaking remote/URL sources.

---

# SHILU-S07 — pkg/source/source.go · Normalize / StoreRaw
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: pkg/source/source.go#Normalize / StoreRaw (blob e9e9f53db785f48c8fbc3c006f2393150fb44a9d)
Selection: curated passages from committed lines 20-72; the upstream blob remains authority.

// Normalize validates a source and moves it to normalized status.
// In v0 this is intentionally simple; future versions may extract structured
// metadata, parse transcripts, or classify content.
func Normalize(s *types.Source) error {
	if s.ID == "" {
		return fmt.Errorf("source has no ID")
	}
	if s.Type == "" {
		return fmt.Errorf("source has no type")
	}
	if s.CapturedAt.IsZero() {
		s.CapturedAt = time.Now()
	}
	if s.Status == "" {
		s.Status = types.SourceStatusCaptured
	}
	// Verify raw file exists if a path is given
if s.RawPath != "" {
	if _, err := os.Stat(s.RawPath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("raw source file not found: %s", s.RawPath)
		}
		return fmt.Errorf("check raw source file: %w", err)
	}
}
s.Status = types.SourceStatusNormalized
return nil
}

// StoreRaw copies raw source content into the Shilu source directory.
// Returns the destination path.
func StoreRaw(srcPath string, sType types.SourceType, layout interface {
	SourceDir(t types.SourceType) string
}) (string, error) {
	destDir := layout.SourceDir(sType)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("create source directory: %w", err)
	}
	// Use the original filename if available; otherwise generate from timestamp
	base := filepath.Base(srcPath)
	if base == "." || base == "/" {
		base = fmt.Sprintf("source_%d.jsonl", time.Now().UnixNano())
	}
	destPath := filepath.Join(destDir, base)
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return "", fmt.Errorf("read source file: %w", err)
	}
	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", fmt.Errorf("write source file: %w", err)
	}
	return destPath, nil
}

---

# SHILU-S11 — pkg/processor/types.go · DigestRequest / DigestResult
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: pkg/processor/types.go#DigestRequest / DigestResult (blob 4499e27846c2fe62823d9b9e2123b1cc7cf27e0f)
Selection: curated passages from committed lines 9-47; the upstream blob remains authority.

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
