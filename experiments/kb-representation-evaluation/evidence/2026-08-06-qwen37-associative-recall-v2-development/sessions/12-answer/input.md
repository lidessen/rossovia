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
