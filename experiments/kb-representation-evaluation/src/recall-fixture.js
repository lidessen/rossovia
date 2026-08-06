export const RECALL_FIXTURE_ID = "shilu-associative-recall-v1";
export const UPSTREAM = {
  repository: "https://github.com/lidessen/shilu",
  commit: "1cac9bbf3e2e10bfdb3178838fefc406236b652e",
  commitTime: "2026-06-03T22:46:37+08:00",
  statusAtCommit: "DESIGN.md is Draft",
};

const designBlob = "b53ed5d09ce4ef07b67b4c7c3d528cf1039ef5fc";

export const recallSources = [
  {
    id: "SHILU-S01",
    title: "DESIGN.md · Principles",
    path: "DESIGN.md",
    anchor: "Principles",
    lines: "30-39",
    blob: designBlob,
    content: `## Principles

- Entries are the source of truth.
- Indexes are rebuildable projections.
- Raw sources are preserved as evidence.
- Agents propose operations; the core validates and commits them.
- CLI and MCP expose the same stable operation surface.
- Capture is separate from interpretation.
- Knowledge growth must handle duplication, conflict, supersession, and review.
- AI is optional infrastructure, not a core dependency.`,
  },
  {
    id: "SHILU-S02",
    title: "DESIGN.md · Source / Entry / Entry Event",
    path: "DESIGN.md",
    anchor: "Source / Entry / Entry Event",
    lines: "85-180",
    blob: designBlob,
    content: `### Source

A \`Source\` is raw input from a session, transcript, hook payload, file import,
meeting note, issue thread, or any other origin.

Sources are evidence. They should be immutable after capture except for metadata
such as processing status.

### Entry

An \`Entry\` is a small markdown knowledge unit. It is the main source of truth.

Entries should be atomic enough to classify, supersede, link, and retrieve. A
large handbook page can be generated from entries, but should not replace them.

### Entry Event

Every committed change to entries is recorded as an append-only event.

The event log allows audit, rollback, and index rebuilds.`,
  },
  {
    id: "SHILU-S03",
    title: "DESIGN.md · Indexes",
    path: "DESIGN.md",
    anchor: "Indexes / Vector Index / Graph Index",
    lines: "260-316",
    blob: designBlob,
    content: `## Indexes

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
- cites`,
  },
  {
    id: "SHILU-S04",
    title: "DESIGN.md · Agent Interaction / Workflow",
    path: "DESIGN.md",
    anchor: "Agent Interaction / Incremental Knowledge Workflow",
    lines: "369-458",
    blob: designBlob,
    content: `## Agent Interaction

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
  -> update indexes`,
  },
  {
    id: "SHILU-S05",
    title: "DESIGN.md · MCP Writes / Validation Rules",
    path: "DESIGN.md",
    anchor: "MCP Writes: Job-Scoped Claims Required / Validation Rules",
    lines: "545-621",
    blob: designBlob,
    content: `### MCP Writes: Job-Scoped Claims Required

All agent-side mutations to entries, links, and reviews must go through the
job system.

**Exceptions:** Direct writes via CLI (human at the terminal) do not require a
job — the human is the authorizing actor. MCP tools for human-invoked
operations may also skip job claims, but every mutation must still carry
provenance metadata (\`actor\`, \`source\`).

### Validation Rules

- **Provenance**: Every \`entry.create\` and \`entry.update\` must reference at
  least one source, except when the actor is \`human\`.
- **Status transitions**: Valid transitions are \`active → superseded\`,
  \`active → draft\`, \`draft → active\`. Other transitions are rejected.`,
  },
  {
    id: "SHILU-S06",
    title: "DESIGN.md · Source Content",
    path: "DESIGN.md",
    anchor: "Source Content: Copy-on-Add by Default, Opt-Out Reference",
    lines: "830-842",
    blob: designBlob,
    content: `#### Source Content: Copy-on-Add by Default, Opt-Out Reference

When \`shilu source add --path <path>\` is called, the content is copied into
\`~/.shilu/sources/<type>/\` using the existing \`pkg/source.StoreRaw()\`, and the
internal \`RawPath\` points to the copy.

Rationale: Sources are the evidence foundation of the knowledge system. If a
source's file disappears, provenance is lost and the processor cannot read
content. Copying on add makes SHILU_HOME self-contained — portable for backup,
sync, and git collaboration — without breaking remote/URL sources.`,
  },
  {
    id: "SHILU-S07",
    title: "pkg/source/source.go · Normalize / StoreRaw",
    path: "pkg/source/source.go",
    anchor: "Normalize / StoreRaw",
    lines: "20-72",
    blob: "e9e9f53db785f48c8fbc3c006f2393150fb44a9d",
    content: `// Normalize validates a source and moves it to normalized status.
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
}`,
  },
  {
    id: "SHILU-S08",
    title: "pkg/core/core.go · Core invariant",
    path: "pkg/core/core.go",
    anchor: "Core invariant",
    lines: "1-8",
    blob: "cec3aca7810276bc902dbf9b7ed8ad41f448f4b6",
    content: `// Package core implements the deterministic operations of the Shilu knowledge
// system. It validates, commits, and records every mutation to entries,
// sources, and relationships. All state changes go through the Core, which
// enforces the validation rules defined in the design and types packages.
//
// The Core owns the invariant: every mutation is preceded by validation,
// recorded as an event, and persisted through the appropriate store.
package core`,
  },
  {
    id: "SHILU-S09",
    title: "pkg/types/validation.go · ValidateEntry",
    path: "pkg/types/validation.go",
    anchor: "ValidateEntry",
    lines: "82-99",
    blob: "dc9320998ef71cd4307998126ed09ebaf3f1c88d",
    content: `// ValidateEntry validates required fields on an Entry.
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
}`,
  },
  {
    id: "SHILU-S10",
    title: "pkg/index/index.go · ftsQuery / Rebuild",
    path: "pkg/index/index.go",
    anchor: "ftsQuery / Catalog.Rebuild",
    lines: "216-249,389-406",
    blob: "678986bff8df22cc53a6322354b47c30b5d0b3c8",
    content: `// ftsQuery turns arbitrary user input into a safe FTS5 MATCH expression: each
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
		quoted = append(quoted, \`"\`+strings.ReplaceAll(f, \`"\`, \`""\`)+\`"\`+prefix)
	}
	if len(quoted) == 0 {
		return q
	}
	// OR-join tokens for memory-friendly partial recall: an entry matching some
	// tokens still surfaces, and bm25() ranks the best (most-token) matches first.
	return strings.Join(quoted, " OR ")
}

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
}`,
  },
  {
    id: "SHILU-S11",
    title: "pkg/processor/types.go · DigestRequest / DigestResult",
    path: "pkg/processor/types.go",
    anchor: "DigestRequest / DigestResult",
    lines: "9-47",
    blob: "4499e27846c2fe62823d9b9e2123b1cc7cf27e0f",
    content: `// DigestRequest contains all the context needed for a digest-source operation.
// The processor gathers this from the job queue, source registry, and catalog
// before calling AgentProvider.DigestSource.
type DigestRequest struct {
	// Source is the raw source record being processed.
	Source types.Source \`yaml:"source" json:"source"\`

	// RawContent is the full text content of the source, extracted by the
	// normalizer for the source's format type.
	RawContent string \`yaml:"rawContent" json:"rawContent"\`

	// Collection is the target collection name for extracted entries.
	// Determined by the source's workspace field or a configured default.
	Collection string \`yaml:"collection" json:"collection"\`

	// CollectionCfg is the configuration for the target collection.
	// The provider uses this to determine extraction policy (review strictness,
	// default tags, etc.).
	CollectionCfg *types.CollectionConfig \`yaml:"collectionCfg,omitempty" json:"collectionCfg,omitempty"\`

	// RelatedEntries are existing entries in the target collection that may
	// relate to the source content. The provider uses these for deduplication
	// and linking decisions.
	RelatedEntries []types.Entry \`yaml:"relatedEntries,omitempty" json:"relatedEntries,omitempty"\`
}

// DigestResult contains the proposed operations from a digest-source run.
// The processor validates these through Core.CommitOperations and creates
// review items for low-confidence results.
type DigestResult struct {
	// Operations are the structured operations (create, update, link, supersede)
	// proposed by the provider. Each operation should have appropriate provenance
	// and confidence.
	Operations []types.Operation \`yaml:"operations" json:"operations"\`

	// ReviewItems capture uncertainty: low-confidence extractions, possible
	// duplicates, or proposed supersessions that need human review.
	ReviewItems []types.ReviewItem \`yaml:"reviewItems,omitempty" json:"reviewItems,omitempty"\`
}`,
  },
  {
    id: "SHILU-S12",
    title: "pkg/core/entries.go · CreateEntry / SupersedeEntry",
    path: "pkg/core/entries.go",
    anchor: "CreateEntry / SupersedeEntry",
    lines: "11-75,208-255",
    blob: "28debcfa7c395a1d0767696cf9027ac52c4420fb",
    content: `// CreateEntry creates a new entry after validation. It generates a
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
}, nil)`,
  },
];

export const recallQuestions = [
  {
    id: "Q1",
    prompt: "A semantic match looks convincing. Before citing the claim as knowledge, what must be consulted, and which retrieved artifact may be regenerated without changing authority?",
    gold: ["SHILU-S01", "SHILU-S03"],
    claims: [
      { id: "Q1-C1", prompt: "What retains authority?", options: ["entries-and-raw-sources", "retrieval-index", "activation-graph", "unknown"], expectedKey: "entries-and-raw-sources", support: ["SHILU-S01"] },
      { id: "Q1-C2", prompt: "What may be regenerated?", options: ["indexes", "entries", "raw-sources", "nothing"], expectedKey: "indexes", support: ["SHILU-S03"] },
    ],
  },
  {
    id: "Q2",
    prompt: "Two otherwise identical entry proposals lack provenance: one comes from an automated processor, the other from a human at the terminal. Should they pass the same gate, and where is that distinction enforced?",
    gold: ["SHILU-S05", "SHILU-S09"],
    claims: [
      { id: "Q2-C1", prompt: "How is the automated proposal treated?", options: ["reject-missing-provenance", "accept-without-source", "human-exemption", "unknown"], expectedKey: "reject-missing-provenance", support: ["SHILU-S05"] },
      { id: "Q2-C2", prompt: "How is the human proposal treated in implementation?", options: ["human-source-exempt", "same-source-gate", "agent-only-exempt", "unknown"], expectedKey: "human-source-exempt", support: ["SHILU-S09"] },
    ],
  },
  {
    id: "Q3",
    prompt: "A transcript was registered, then its original file was moved before digestion. Which boundary was broken, and what committed primitive is meant to keep the record self-contained?",
    gold: ["SHILU-S06", "SHILU-S07"],
    claims: [
      { id: "Q3-C1", prompt: "Which boundary was broken?", options: ["evidence-provenance", "index-ranking", "collection-routing", "none"], expectedKey: "evidence-provenance", support: ["SHILU-S06"] },
      { id: "Q3-C2", prompt: "Which primitive keeps it self-contained?", options: ["store-raw-copy", "external-path-reference", "fts-rebuild", "event-replay"], expectedKey: "store-raw-copy", support: ["SHILU-S07"] },
    ],
  },
  {
    id: "Q4",
    prompt: "A newer rule invalidates an older rule, but future readers must still discover the lineage and audit what happened. How is the change represented instead of deleting history?",
    gold: ["SHILU-S02", "SHILU-S12"],
    claims: [
      { id: "Q4-C1", prompt: "How is the lineage represented?", options: ["bidirectional-supersession-fields", "delete-old-entry", "index-only-edge", "overwrite-body"], expectedKey: "bidirectional-supersession-fields", support: ["SHILU-S12"] },
      { id: "Q4-C2", prompt: "How is the change audited?", options: ["append-only-entry-event", "search-score", "source-status-only", "no-audit"], expectedKey: "append-only-entry-event", support: ["SHILU-S02"] },
    ],
  },
  {
    id: "Q5",
    prompt: "Before an optional model proposes a digest, what context can it receive, and which part of the system still owns the decision to mutate durable knowledge?",
    gold: ["SHILU-S04", "SHILU-S11"],
    claims: [
      { id: "Q5-C1", prompt: "What context may the model receive?", options: ["source-rawcontent-collection-relatedentries", "activation-map-only", "event-log-only", "entry-ids-only"], expectedKey: "source-rawcontent-collection-relatedentries", support: ["SHILU-S11"] },
      { id: "Q5-C2", prompt: "Who owns durable mutation authority?", options: ["core-validates-and-commits", "provider-directly-writes", "retrieval-index", "capture-hook"], expectedKey: "core-validates-and-commits", support: ["SHILU-S04", "SHILU-S08"] },
    ],
  },
  {
    id: "Q6",
    prompt: "The SQLite search database is lost. Which durable material is sufficient to restore recall in the design, and what does the implemented rebuild actually consume?",
    gold: ["SHILU-S03", "SHILU-S10"],
    claims: [
      { id: "Q6-C1", prompt: "What does the design say is sufficient?", options: ["sources-entries-events", "sqlite-file-only", "graph-image-only", "provider-cache"], expectedKey: "sources-entries-events", support: ["SHILU-S03"] },
      { id: "Q6-C2", prompt: "What does the implementation consume?", options: ["provided-entry-list", "raw-source-files", "event-log", "vector-table"], expectedKey: "provided-entry-list", support: ["SHILU-S10"] },
    ],
  },
];

export const recallConcepts = [
  { id: "C01", label: "事实权 / authority", query: "authority source of truth evidence final operation concrete source" },
  { id: "C02", label: "索引 / recall projection", query: "index recall search rebuild sqlite vector graph candidate projection" },
  { id: "C03", label: "来源 / provenance", query: "provenance source actor human agent validation reference" },
  { id: "C04", label: "Agent proposal", query: "agent provider digest proposal operations raw content related entries" },
  { id: "C05", label: "deterministic commit", query: "core validate commit mutation persist event index" },
  { id: "C06", label: "supersession / audit", query: "supersede superseded newer older lineage audit event rollback" },
  { id: "C07", label: "uncertainty / review", query: "review confidence conflict duplicate uncertainty possible" },
  { id: "C08", label: "self-contained evidence", query: "copy source file raw path self contained moved disappears store raw" },
];

export const recallSourceNodes = recallSources.map((source, index) => ({
  id: source.id,
  label: source.title,
  index,
}));

export const GRAPH_POLICY = {
  id: "corpus-bm25-concepts-v1",
  construction: "For each corpus-derived concept query, connect the four highest BM25 source extracts without evaluator gold.",
  activation: "For each user query, render the three highest BM25 concepts and their precomputed source neighbors.",
  activeConcepts: 3,
  sourcesPerConcept: 4,
};

export function publicRecallQuestions() {
  return recallQuestions.map(({ gold: _gold, claims, ...question }) => ({
    ...question,
    claims: claims.map(({ expectedKey: _expectedKey, support: _support, ...claim }) => claim),
  }));
}

export function recallTextRepresentation() {
  return `${[
    `# ${RECALL_FIXTURE_ID}`,
    "# Lossy associative activation map. SOURCE nodes are candidates, not evidence.",
    ...recallConcepts.map(({ id, label }) => `CONCEPT\t${id}\t${label}`),
    ...recallSourceNodes.map(({ id, label }) => `SOURCE\t${id}\t${label}`),
    ...recallAssociations.map(([left, right]) => `ASSOCIATION\t${left}\t${right}`),
  ].join("\n")}\n`;
}

const stopwords = new Set([
  "a", "an", "and", "as", "at", "be", "before", "but", "by", "comes", "does", "from", "how",
  "if", "in", "into", "is", "it", "its", "must", "of", "one", "or", "otherwise", "part", "same",
  "should", "still", "than", "that", "the", "then", "this", "to", "two", "what", "when", "where",
  "which", "while", "with", "without",
]);

function searchTokens(value) {
  const tokens = String(value).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return tokens.filter((token) => token.length > 1 && !stopwords.has(token)).map((token) => {
    if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
    if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
    if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
    return token;
  });
}

function rankBm25(query, items, textFor, limit) {
  const documents = items.map((item) => searchTokens(textFor(item)));
  const queryTerms = [...new Set(searchTokens(query))];
  const averageLength = documents.reduce((sum, document) => sum + document.length, 0) / documents.length;
  const k1 = 1.2;
  const b = 0.75;
  const ranked = items.map((item, index) => {
    const document = documents[index];
    const frequencies = new Map();
    for (const term of document) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    const score = queryTerms.reduce((total, term) => {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) return total;
      const documentFrequency = documents.filter((candidate) => candidate.includes(term)).length;
      const inverseDocumentFrequency = Math.log(1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
      return total + inverseDocumentFrequency * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * document.length / averageLength)));
    }, 0);
    return { item, score };
  });
  return ranked.sort((left, right) => right.score - left.score || left.item.id.localeCompare(right.item.id)).slice(0, limit);
}

export function rankTextSearch(query, limit = 5) {
  return rankBm25(query, recallSources, (source) => `${source.title} ${source.content}`, limit)
    .map(({ item, score }) => ({ id: item.id, title: item.title, score }));
}

export function rankRecallConcepts(query, limit = GRAPH_POLICY.activeConcepts) {
  return rankBm25(query, recallConcepts, (concept) => `${concept.label} ${concept.query}`, limit)
    .map(({ item, score }) => ({ ...item, score }));
}

export const recallAssociations = recallConcepts.flatMap((concept) => (
  rankTextSearch(concept.query, GRAPH_POLICY.sourcesPerConcept).map((source) => [concept.id, source.id])
));

export function recallSearchRepresentation(question) {
  return `${[
    `# ${RECALL_FIXTURE_ID} deterministic BM25 search`,
    "# Ranked locator-only candidates. Titles are index metadata, not evidence.",
    ...rankTextSearch(question.prompt).map((result, index) => `RESULT\t${index + 1}\t${result.id}\t${result.title}\t${result.score.toFixed(6)}`),
  ].join("\n")}\n`;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function recallSvgRepresentation(question = null) {
  const activeConcepts = question ? rankRecallConcepts(question.prompt) : recallConcepts;
  const activeConceptIds = new Set(activeConcepts.map(({ id }) => id));
  const activeAssociations = recallAssociations.filter(([conceptId]) => activeConceptIds.has(conceptId));
  const activeSourceIds = new Set(activeAssociations.map(([, sourceId]) => sourceId));
  const activeSources = recallSourceNodes.filter(({ id }) => activeSourceIds.has(id));
  const conceptNodes = activeConcepts.map((concept, index) => ({
    ...concept,
    x: 90,
    y: activeConcepts.length === 1 ? 470 : 160 + index * (680 / (activeConcepts.length - 1)),
  }));
  const rows = Math.ceil(activeSources.length / 2);
  const sourceNodes = activeSources.map((source, index) => ({
    ...source,
    x: index < rows ? 830 : 1300,
    y: 120 + (index % rows) * (760 / Math.max(1, rows - 1)),
  }));
  const byId = new Map([...conceptNodes, ...sourceNodes].map((node) => [node.id, node]));
  const lines = activeAssociations.map(([left, right]) => {
    const from = byId.get(left);
    const to = byId.get(right);
    if (!from || !to) return "";
    return `<line x1="${from.x + 300}" y1="${from.y + 39}" x2="${to.x - 180}" y2="${to.y + 42}"/>`;
  }).join("\n");
  const concepts = conceptNodes.map((node) => `<g class="concept" transform="translate(${node.x} ${node.y})"><rect width="300" height="78" rx="18"/><text x="150" y="47">${escapeXml(node.label)}</text></g>`).join("\n");
  const sources = sourceNodes.map((node) => `<g class="source" transform="translate(${node.x - 180} ${node.y})"><rect width="360" height="84" rx="16"/><text x="180" y="31" class="id">${node.id}</text><text x="180" y="59" class="label">${escapeXml(node.label)}</text></g>`).join("\n");
  const title = question ? `Shilu associative recall · ${question.id} query activation` : "Shilu associative recall · corpus graph overview";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<style>
  svg { background: #fbfaf7; }
  line { stroke: #9aa8a0; stroke-width: 3; opacity: .72; }
  text { text-anchor: middle; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
  .concept rect { fill: #fff0c9; stroke: #9b6e16; stroke-width: 2.5; }
  .concept text { fill: #583a00; font-size: 19px; font-weight: 650; }
  .source rect { fill: #eaf3ee; stroke: #315f4d; stroke-width: 2.5; }
  .source .id { fill: #173b2d; font-size: 19px; font-weight: 750; }
  .source .label { fill: #24483b; font-size: 16px; }
  .header { text-anchor: start; }
</style>
<rect width="1600" height="1000" fill="#fbfaf7"/>
<text x="60" y="52" class="header" font-size="27" font-weight="750" fill="#173b2d">${escapeXml(title)}</text>
<text x="60" y="82" class="header" font-size="17" fill="#53645c">Corpus-derived lossy routing projection — open selected sources before answering or citing</text>
${lines}
${concepts}
${sources}
</svg>\n`;
}

export function sourcePacket(sourceIds) {
  const selected = new Set(sourceIds);
  return recallSources.filter((source) => selected.has(source.id)).map((source) => [
    `# ${source.id} — ${source.title}`,
    `Upstream: ${UPSTREAM.repository}@${UPSTREAM.commit}`,
    `Location: ${source.path}#${source.anchor} (blob ${source.blob})`,
    `Selection: curated passages from committed lines ${source.lines}; the upstream blob remains authority.`,
    "",
    source.content,
  ].join("\n")).join("\n\n---\n\n");
}

export function parseRouteResponse(text) {
  const parsed = JSON.parse(stripFence(text));
  if (!Array.isArray(parsed?.candidates) || parsed.candidates.length === 0 || parsed.candidates.length > 5) {
    throw new TypeError("Route output must contain one to five source IDs.");
  }
  const known = new Set(recallSources.map((source) => source.id));
  if (parsed.candidates.some((id) => typeof id !== "string" || !known.has(id))) {
    throw new TypeError("Route output contains an unknown source ID.");
  }
  if (new Set(parsed.candidates).size !== parsed.candidates.length) {
    throw new TypeError("Route output contains duplicate source IDs.");
  }
  return { candidates: parsed.candidates };
}

export function parseAnswerResponse(text) {
  const parsed = JSON.parse(stripFence(text));
  if (Object.keys(parsed ?? {}).length !== 1 || !Array.isArray(parsed?.claims) || parsed.claims.length === 0) {
    throw new TypeError("Answer output must contain a non-empty claims array.");
  }
  for (const claim of parsed.claims) {
    if (Object.keys(claim ?? {}).sort().join(",") !== "citations,claimId,valueKey"
      || typeof claim?.claimId !== "string" || typeof claim?.valueKey !== "string" || !Array.isArray(claim?.citations)) {
      throw new TypeError("Each claim must contain claimId, valueKey, and citations.");
    }
    if (claim.citations.some((citation) => Object.keys(citation ?? {}).sort().join(",") !== "anchor,sourceId"
      || typeof citation?.sourceId !== "string" || typeof citation?.anchor !== "string")) {
      throw new TypeError("Each citation must contain sourceId and anchor strings.");
    }
  }
  return parsed;
}

function stripFence(text) {
  const lines = text.trim().split("\n");
  if (lines[0]?.startsWith("```")) lines.shift();
  if (lines.at(-1)?.trim() === "```") lines.pop();
  return lines.join("\n").trim();
}

export function scoreRecallTrial(question, route, answer) {
  const ranks = question.gold.map((id) => route.candidates.indexOf(id) + 1).filter(Boolean);
  const firstRank = ranks.length ? Math.min(...ranks) : null;
  const recallAt = (k) => question.gold.filter((id) => route.candidates.slice(0, k).includes(id)).length / question.gold.length;
  const knownById = new Map(recallSources.map((source) => [source.id, source]));
  const submittedClaims = new Map((answer?.claims ?? []).map((claim) => [claim.claimId, claim]));
  const duplicateClaimIds = (answer?.claims ?? []).length !== submittedClaims.size;
  const claimResults = question.claims.map((expected) => {
    const submitted = submittedClaims.get(expected.id);
    const answerCorrect = Boolean(submitted) && submitted.valueKey === expected.expectedKey;
    const citations = submitted?.citations ?? [];
    const citationResults = citations.map((citation) => {
      const source = knownById.get(citation.sourceId);
      const locatable = Boolean(source) && citation.anchor === source.anchor;
      const opened = route.candidates.includes(citation.sourceId);
      const supportsClaim = expected.support.includes(citation.sourceId);
      return { ...citation, locatable, opened, supportsClaim, correct: answerCorrect && locatable && opened && supportsClaim };
    });
    return {
      claimId: expected.id,
      expectedKey: expected.expectedKey,
      actualKey: submitted?.valueKey ?? null,
      answerCorrect,
      citations: citationResults,
      hasCorrectCitation: citationResults.some((citation) => citation.correct),
    };
  });
  const submittedCitationCount = claimResults.reduce((sum, claim) => sum + claim.citations.length, 0);
  const correctCitationCount = claimResults.reduce((sum, claim) => sum + claim.citations.filter((citation) => citation.correct).length, 0);
  const answerAccuracy = claimResults.filter((claim) => claim.answerCorrect).length / claimResults.length;
  const citationPrecision = submittedCitationCount ? correctCitationCount / submittedCitationCount : 0;
  const citationCoverage = claimResults.filter((claim) => claim.answerCorrect && claim.hasCorrectCitation).length / claimResults.length;
  const protocolValid = Boolean(answer) && !duplicateClaimIds && submittedClaims.size === question.claims.length
    && question.claims.every((claim) => submittedClaims.has(claim.id));
  const groundedSuccess = protocolValid && answerAccuracy === 1 && citationPrecision === 1 && citationCoverage === 1;
  return {
    gold: question.gold,
    candidates: route.candidates,
    hitAt1: recallAt(1) > 0,
    hitAt3: recallAt(3) > 0,
    hitAt5: recallAt(5) > 0,
    recallAt1: recallAt(1),
    recallAt3: recallAt(3),
    recallAt5: recallAt(5),
    allRequiredHitAt3: recallAt(3) === 1,
    allRequiredHitAt5: recallAt(5) === 1,
    reciprocalRank: firstRank ? 1 / firstRank : 0,
    openedSources: route.candidates.length,
    answerAccuracy,
    citationPrecision,
    citationCoverage,
    protocolValid,
    groundedSuccess,
    claimResults,
  };
}
