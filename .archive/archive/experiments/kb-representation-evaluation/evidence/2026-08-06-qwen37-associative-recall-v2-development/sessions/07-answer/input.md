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

# SHILU-S07

AnchorId: an_7a10
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

AnchorId: an_7a11
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

# SHILU-S10

AnchorId: an_596e
// ftsQuery turns arbitrary user input into a safe FTS5 MATCH expression: each
// whitespace-separated token is double-quoted (a phrase), so FTS5 operators and
// reserved words in the input (-, :, *, ^, AND/OR/NOT, "index", …) are treated
// as literal text instead of query syntax. Tokens are implicitly ANDed. Without
// this, a query like "auto-index usable" errors ("no such column: index").
func ftsQuery(q string) string {
	fields := strings.Fields(q)
	if len(fields) == 0 {
		return q
	}
	quoted := make([]string, 0, len(fields))
	for _, f := range fields {
		// Preserve a trailing "*" as an FTS5 prefix query ("optim"* ), but quote
		// the term itself so all other operator characters are literal.
		prefix := ""
		if strings.HasSuffix(f, "*") {
			f = strings.TrimRight(f, "*")
			prefix = "*"
		}
		if f == "" {
			continue
		}
		quoted = append(quoted, `"`+strings.ReplaceAll(f, `"`, `""`)+`"`+prefix)
	}
	if len(quoted) == 0 {
		return q
	}

AnchorId: an_29ad
// OR-join tokens for memory-friendly partial recall: an entry matching some
	// tokens still surfaces, and bm25() ranks the best (most-token) matches first.
	return strings.Join(quoted, " OR ")
}

AnchorId: an_aa10
// Rebuild clears the catalog and re-indexes all entries from the provided list.
func (c *Catalog) Rebuild(entries []types.Entry) error {
	if _, err := c.db.Exec("DELETE FROM fts_entries"); err != nil {
		return fmt.Errorf("clear fts entries: %w", err)
	}
	if _, err := c.db.Exec("DELETE FROM entry_tags"); err != nil {
		return fmt.Errorf("clear tags: %w", err)
	}
	if _, err := c.db.Exec("DELETE FROM entries"); err != nil {
		return fmt.Errorf("clear entries: %w", err)
	}
	for _, e := range entries {
		if err := c.IndexEntry(e); err != nil {
			return fmt.Errorf("index entry %s: %w", e.ID, err)
		}
	}
	return nil
}
