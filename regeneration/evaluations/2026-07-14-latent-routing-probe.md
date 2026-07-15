# Latent Routing Probe

**Status:** prompt-only heads are rejected as a sufficient multi-head analogue;
load-balanced sparse visibility supports structural differentiation and lower
route cost, while creative-quality improvement remains untested
**Date:** 2026-07-14
**Model:** `deepseek-v4-flash`, non-thinking mode

## Question

Can a Work Cell borrow the useful structure of multi-head latent attention and
sparse expert routing without pretending that independent agents are neural
attention heads? The smallest test asks whether several query heads selecting
from one immutable 64-node activation field preserve materially different
sources before any read, synthesis, naming, or final projection occurs.

The claim fails if nominally different heads repeatedly select the same nodes
or merely move together into another semantic basin. A route-only result may
support attention differentiation; it cannot establish that later ideas or
names are better.

## Experimental surface

The experimental [route-only runtime](../../packages/work-cell/src/research/latent-routing.ts)
reuses the existing residual-field reconstruction and AI SDK route driver. It:

- gives every head the same task stimulus but a distinct query instruction;
- permits only source selection, a routing reason, and an expected contrast;
- rejects unavailable or repeated source IDs and routes beyond the head limit;
- records head overlap, unique field coverage, source-domain distribution,
  lexical-basin diagnostics, usage, and estimate error; and
- never invokes the read or projection phases.

The [probe CLI](../../packages/work-cell/src/research/latent-routing-probe.ts),
[manifest](../../packages/work-cell/experiments/latent-routing-naming.json), and
[contract tests](../../packages/work-cell/test/latent-routing.test.ts) remain
outside the Work Cell core contract. Lexical basins are declared measurement
proxies, not routing rules or quality gates. Source-domain facets are retained
as a second, non-lexical distribution observation.

Both live treatments reuse activation run
`2807fe74-9236-45aa-acc4-95d71cdf2519`. Its layer-zero field contains 63
successful independent activations. The source integration path already
records `64 → 32 → 16` coalition layers, allowing the same lexical diagnostics
to show what happened under recursive prose integration.

## Treatment A: full-field prompt heads

Eight independently invoked query heads each saw all 63 activation nodes. The
heads addressed material conditions, governing contradiction, weak signals,
distant structure, cultural memory, sensory form, counterexamples, and future
mutation.

The run completed in 7.46 seconds and used 105,151 tokens against a 120,000
estimate, a 12.37% relative error.

| Observation | Result |
|---|---:|
| Total selections | 53 |
| Unique selected nodes | 16 |
| Activation-field coverage | 25.40% |
| Mean route size | 6.625 |
| Mean pairwise route Jaccard | 0.5403 |

Six nodes dominated the routes. `a-0010` appeared in all eight heads;
`a-0028`, `a-0052`, and `a-0058` each appeared in seven; `a-0043` appeared in
six; and `a-0060` appeared in five. The nominally weak-signal, sensory-form,
cultural-memory, and future-mutation heads mostly repeated the same
extrication, power-inversion, portable-workshop, and anti-capture account.

The source field contained seven source domains, including seven physics-shaped
nodes out of 63. Full-field routing selected physics-shaped nodes 23 times out
of 53 selections. Prompt instructions therefore did not behave like distinct
learned query projections; shared model salience dominated them.

The route did avoid the old lexical basins: craft terms fell from 26.98% of the
source activations to 15.09% of selection occurrences, while the source's prose
integration layers had amplified them to 43.75%, 56.25%, and 56.25%. This did
not establish diversity. It moved convergence into a different basin.

## Treatment B: load-balanced sparse visibility

The second treatment left the heads and source field unchanged. Before model
routing, each source node was made visible to exactly two of eight heads. A
replayable SHA-256 ordering breaks ties while current head load is minimized,
so the treatment neither classifies nodes semantically nor permits one head to
receive an unusably small view. Every head saw an average of 15.75 nodes.

This run completed in 5.41 seconds and used 30,175 tokens against a 40,000
estimate, a 24.56% relative error. It used 71.3% fewer tokens than the
full-field treatment.

| Observation | Full field | Sparse visibility |
|---|---:|---:|
| Total selections | 53 | 56 |
| Unique selected nodes | 16 | 37 |
| Activation-field coverage | 25.40% | 58.73% |
| Mean pairwise route Jaccard | 0.5403 | 0.0553 |
| Mean pairwise availability Jaccard | 1.0000 | 0.0795 |
| Craft share among selection occurrences | 15.09% | 33.93% |

All seven source domains entered the sparse selections. Physics accounted for
8/56 selections rather than 23/53; social history accounted for 22, workshop
for 9, ecology for 9, language for 3, music for 3, and play for 2. Sparse
visibility therefore prevented a few globally salient nodes from occupying
nearly every head and restored much of the source distribution.

It did not remove semantic preference. Craft language occupied 33.93% of
selection occurrences, above its 26.98% source-field share, and several route
explanations still reduced their different sources to the familiar
tool-versus-commons relation. Structural source diversity and semantic
development remain different claims.

## Revised judgment

The experiment supports three bounded conclusions:

1. **Prompt role differentiation is not an adequate analogue of neural
   multi-head attention.** Independent calls over one full textual field shared
   a strong global salience ordering despite different head descriptions.
2. **Sparse visibility is a useful engineered substitute for absent learned
   projections.** It materially reduced head overlap, increased unique source
   survival, represented every source domain, and lowered input cost without
   rewriting the sources.
3. **Routing diversity is not idea quality.** The treatment has not yet shown
   that independent read deltas remain different or that a final result becomes
   more useful, accurate, or aesthetically alive.

The next smallest practice should freeze the two recorded route sets and run
only the read phase. Each head may read its selected full source nodes and emit
one structured relation plus a disconfirming observation; no rerouting or final
projection is allowed. If sparse routes again converge into interchangeable
deltas, the missing mechanism is learned specialization or world-facing
feedback rather than routing topology. If the deltas remain materially
different, one later experiment can compare a common projection without
regenerating the activation field.
