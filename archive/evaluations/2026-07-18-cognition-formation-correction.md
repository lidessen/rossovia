# Cognition Formation Correction

**Date:** 2026-07-18

**Disposition:** flat source/unit hypothesis rejected; progressive formation
mechanism selected for the next bounded probe

## Practice and observation

The initial `packages/cognition` slice captured immutable sources, proposed or
active knowledge units, admission evidence, and a rebuildable catalog. A Work
Cell adapter then tested whether an inexpensive model could decide what to
retain from one source.

Four local runs were attempted. The default provider profile timed out after
120 seconds without a usable result. Three explicit OpenCode Go
`deepseek-v4-flash` runs completed with approximately 3.2k, 3.5k, and 3.7k
tokens. Successive prompts added applicability, limitations, retention reasons,
direct-retrieval facts, and a preference for one coherent proposal. Output
shrunk from five proposals to three, but the model continued duplicating a
durable source and invented future obscurity or retrieval cost to justify
retention.

No generated proposal was admitted or retained as active cognition.

## Reflection

The defect was not only prompt quality. The task itself asked the model to jump
from source material directly to reusable knowledge. `source recall` versus
`knowledge recall` improved retrieval boundaries but preserved the same
single-layer ontology. More kinds, relations, embeddings, or a graph would not
explain how observations became concepts, how concepts became a model, how a
model informed practice, or how practice revised the earlier formation.

This contradicts P03 (practice, cognition, renewed practice) and P07 (movement
from the concrete through abstraction to a reconstructed concrete). It also
weakens P12: a successor inherits conclusions without enough of their formation
to revise them intelligently.

## Next smallest test

Replace the uncommitted unit abstraction with a domain-declared formation
scheme and formed artifacts. Reject stage-skipping, gate admission on admitted
artifact inputs, and express one practice-feedback move. Do not yet add a
database, vector search, automatic invalidation, background extraction, or a
universal stage taxonomy.

The mechanism remains provisional until a real downstream decision improves
and one observed outcome produces a bounded cross-layer revision.

The behavioral probe must also compare a direct current-agent formation with a
prepared Work Cell formation on the same bounded move. Escalate to a Swarm only
if the evidence field cannot be partitioned into stable single-Cell work. Record
estimated and actual model use, decision quality, human repair, and maintenance
cost; do not call the more expensive route better merely because it generated
more cognition artifacts.
