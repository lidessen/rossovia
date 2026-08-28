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

# SHILU-S03 — DESIGN.md · Indexes
Upstream: https://github.com/lidessen/shilu@1cac9bbf3e2e10bfdb3178838fefc406236b652e
Location: DESIGN.md#Indexes / Vector Index / Graph Index (blob b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc)
Selection: curated passages from committed lines 260-316; the upstream blob remains authority.

## Indexes

Indexes are projections and must be rebuildable from sources, entries, and
events.

### Vector Index

Semantic retrieval over entry bodies and selected source summaries.

The vector index is a recall mechanism, not authority. A vector hit returns
candidate entry ids; all final operations must reference concrete entries and
sources.

### Graph Index

Relationship projection:

- related
- supersedes
- contradicts
- derivedFrom
- sameAs
- cites

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
