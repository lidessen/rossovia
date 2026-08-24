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
