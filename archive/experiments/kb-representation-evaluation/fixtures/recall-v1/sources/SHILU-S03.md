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
