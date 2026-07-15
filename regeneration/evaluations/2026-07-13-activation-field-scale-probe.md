# Activation Field Scale Probe

**Status:** population shaping, cognitive-phenotype differentiation, and
early-feature recovery through residual readout, and artifact-level candidate
branching are supported at 64 nodes; comparative creative-quality claim remains
unsupported
**Date:** 2026-07-13
**Model:** `deepseek-v4-flash`, non-thinking mode

## Question

Can a Work Cell escape one autoregressive trajectory by broadcasting one
immutable project snapshot into many independent local activations, composing
them through sparse overlapping neighborhoods, and only then projecting one
ordered expression? Does increasing the field from 16 to 64 to 256 nominal
activations produce a useful creative emergence effect on the live project-name
problem?

The test defines an emergent relation as one that cites at least two upstream
nodes and is not fully stated by either parent alone. A larger field is useful
only if it improves the task result beyond repeated sampling or a direct model
response; nominal node count alone is not evidence.

## Experimental surface

The probe is implemented outside the Work Cell core contract:

- [`activation-field.ts`](../../packages/work-cell/src/research/activation-field.ts)
  owns immutable broadcast, bounded concurrency, stable IDs, overlapping local
  groups, provenance validation, explicit layer widths, inherited cognitive
  shapes, layered coalitions, and the final working set.
- [`population-shape.ts`](../../packages/work-cell/src/research/population-shape.ts)
  samples replayable Work Cell shapes from controlled mixture shares,
  Principle priors, continuous traits, categorical perceptual domains, and
  temperature distributions.
- [`ai-sdk-activation-field.ts`](../../packages/work-cell/src/research/ai-sdk-activation-field.ts)
  supplies independent structured activations, local coalition calls, one
  language projection, and one structured-output recovery attempt.
- [`activation-probe.ts`](../../packages/work-cell/src/research/activation-probe.ts) and
  the [naming manifest](../../packages/work-cell/experiments/activation-field-naming.json)
  retain source digests, raw records, usage, estimate error, and a direct
  single-loop baseline.
- [`analyze-activation-field.ts`](../../packages/work-cell/experiments/analyze-activation-field.ts)
  compares lexical differentiation, parent-child novelty, layer shape keys, and
  final root survival without treating those proxies as a quality judgment.
- [`residual-readout.ts`](../../packages/work-cell/src/research/residual-readout.ts) and
  [`ai-sdk-residual-readout.ts`](../../packages/work-cell/src/research/ai-sdk-residual-readout.ts)
  reconstruct the append-only activation field, let several task-conditioned
  heads independently route over it, and require the final projection to expose
  proposal and source provenance. The mechanism remains experimental and does
  not alter the Work Cell core contract.
- [`candidate-field.ts`](../../packages/work-cell/src/research/candidate-field.ts) and
  [`ai-sdk-candidate-field.ts`](../../packages/work-cell/src/research/ai-sdk-candidate-field.ts)
  move divergence onto naming artifacts themselves: independent emitters make
  surfaces without explanations, mutators transform cross-emitter parents, and
  blind archive niches can select but not rewrite candidates.

The initial probe used twelve receptor families: essence, contradiction, concrete practice,
abstraction, commons, liberation, future mutation, distant analogy, cultural
memory, sound/image, inversion, and deliberate non-naming. The larger scales
repeat these receptor families with independent samples; they do not create 256
different receptor structures. That design was invalidated by the first scale
result and is retained below as historical evidence rather than the current
population mechanism.

## Mechanical probes

Deterministic tests established three behavior claims:

1. Reversing asynchronous completion order does not change activation IDs,
   coalitions, working-set nodes, or expression provenance.
2. A coalition that cites a node outside its local neighborhood fails closed.
3. Adaptive grouping reaches the declared working-set bandwidth instead of
   overshooting from 16 nodes directly to four.

A provider-boundary test reproduces one malformed structured response, retries
it once, and retains the failed attempt's usage. The complete package suite
passed after the experiment.

## Live scale observations

The first grouping policy reduced every scale to four working nodes. It retained
8/16, 23/64, and 51/255 distinct root activations respectively, revealing that
nominal scale was being destroyed by the aggregation path. The policy was then
changed to declare working-set bandwidth of 4, 8, and 16 and to adapt local
group size before overshooting that target.

The comparable retained runs after that correction were:

| Nominal activations | Layers | Final working set | Duration | Total tokens | Cached input | Estimated cost | Estimate error |
|---:|---|---:|---:|---:|---:|---:|---:|
| 16 | `16 → 4` | 4 | 16.3 s | 94,080 | 69,248 | $0.0042 | 0.97% |
| 64 | `64 → 16 → 8` | 8 | 23.1 s | 402,685 | 360,064 | $0.0093 | 4.12% |
| 256 | `256 → 64 → 16` | 16 | 33.2 s | 1,518,784 | 1,364,608 | $0.0336 | 2.01% |

Costs use the driver pricing revision recorded on 2026-07-10. Raw local records
are retained under
`.work-cell/activation-fields/project-naming-scale-probe/` with run IDs:

- 16: `a9d12469-4803-41df-9ee0-35e708108f25`
- 64: `4a7c9eb8-dbfc-4a42-a4c1-bbd26b336f86`
- 256: `041bcf99-16a1-4c08-8ca7-ea82b198d54c`

The 256-node run proves that the runtime and provider can execute this scale
cheaply and with useful wall-clock concurrency. It does not prove semantic
emergence.

## Semantic result

The 16-node run produced explanatory candidates such as `Common Tending` and
`Shared Craft`. The 64-node run converged on a "living forge" and argued that
the project should remain unnamed. The 256-node run converged on a
"forge–reef–hearth" relation and again returned no actual name candidates.

The field did form traceable second-order relations, but increasing scale did
not improve compliance with the naming task and did not yield a candidate that
the available evidence supports as better than the direct baseline. Three
direct baseline runs used only 4,321–4,810 tokens each and, while still
conventional and unsatisfactory, at least returned concrete candidate sets.

Two collapses explain the result more directly than insufficient nominal count:

1. **Receptor collapse.** The 256 activations are 21–22 samples from each of
   only twelve receptor families. Exact strings were unique, but the number of
   structural channels did not grow with the nominal count.
2. **Projection collapse.** The corrected 256 run preserved sixteen working
   nodes covering 71 root activations, but the final language projection cited
   only three working nodes, covering 22 roots and nine receptor families.
   Recurrent metaphors such as forge, field, reef, and non-naming became
   attractors.

This is not evidence that large divergent fields cannot work. It is evidence
that repeated sampling from a small receptor bank plus lossy consensus-like
projection is not the mechanism sought.

## Controlled population and phenotype probe

The revised mechanism treats a Work Cell shape as a sampled cognitive
phenotype, not as one repeated receptor label. A population declaration controls:

- exact mixture shares across four centers of gravity;
- one to three selected Principles with asymmetric weights;
- five continuous cognitive dispositions;
- source-domain, temporal-horizon, and operation facets; and
- a component-conditioned generation temperature.

Randomness samples within that declared population and is replayable from a
seed. It does not decide the population design. Static audit produced 64/64 and
256/256 distinct discretized shape keys, with exact equal component shares at
both sizes.

A P-ID and weight did not produce enough behavioral differentiation on their
own. The next treatment therefore compiled the selected source-bound
[interpretations](../../principles/interpretations/P02.md) into a partial
cognitive phenotype system prompt. The [Sequence](../../principles/SEQUENCE.md)
line remains the stable gene locus; the living interpretation supplies semantic
material; the compiled prompt describes the kind of thinker produced by that
selection—its instinctive questions, characteristic limit, temperament, and
imaginative habitat. Numeric weights remain in the record rather than becoming
the main language shown to the model.

Five 64-node treatments isolate the observed mechanisms:

| Treatment | Layers | Total tokens | Activation similarity | Final root coverage | Aesthetic root coverage |
|---|---|---:|---:|---:|---:|
| A: distributed parameters, no phenotype | `64 → 16 → 8` | 416,741 | 0.0960 | 49.2% | 46.2% |
| B: phenotype at activation only | `64 → 16 → 8` | 449,118 | 0.0120 | 47.5% | 30.8% |
| C: phenotype inherited through narrow layers | `64 → 16 → 8` | 465,591 | 0.0117 | 52.5% | 23.1% |
| D: inherited phenotype, equal-width first layer | `64 → 64 → 32 → 16 → 8` | 1,006,682 | 0.0103 | 82.0% | 53.8% |
| E: same treatment, project from 16 | `64 → 64 → 32 → 16` | 959,477 | 0.0108 | 84.1% | 66.7% |

Activation similarity is mean character-trigram Jaccard similarity. It is a
lexical proxy, is affected by mixed Chinese and English output, and cannot by
itself establish semantic creativity. The large reduction is nevertheless
consistent with direct inspection: phenotype-conditioned activations ranged
from bridge repair, irrigation, silkworm logistics, oral music, inverted gongs,
and temporary workshops to inheritance, fissure, return, and repair relations,
instead of merely repeating one generic receptor family.

The multi-layer hypothesis is partly supported. Narrow shape inheritance alone
did not preserve the divergent population. Adding an equal-width recombination
layer raised final root survival by about thirty percentage points and retained
distinct shape keys at every layer. Parent-child lexical novelty remained
`0.90 → 0.87 → 0.84` through the first three wide layers, then fell to `0.66`
at the final `16 → 8` bottleneck. Removing that bottleneck increased aesthetic
root survival to 66.7% and surfaced less recurrent internal candidates such as
`隙还`, `承还`, and `common-repair-as-lived-flint`.

This still did not solve the naming task. Treatment D's final expression
returned `Phantom Forge`, `Haunted Workshop Cycle`, and `Fire Workshop`; treatment
E retained a richer relation around fissure, return, and repair but failed to
return the requested candidate set. Population diversity, internal survival,
and final action quality are therefore separate claims. Only the first two are
supported by this probe.

## Controlled residual-readout probe

The next probe reused one immutable Treatment E record rather than generating
another population. Its source run, `2807fe74-9236-45aa-acc4-95d71cdf2519`,
contains 63 successful activations followed by `64 → 32 → 16` coalition nodes:
175 readable nodes across four layers. The original single projection saw only
the final sixteen nodes, used 8,201 tokens, and returned a useful relation about
fissure, return, and repair but no requested candidate set.

Two treatments then used the same four read heads, the same model, and the same
contract requiring three to five traceable project-name proposals:

| Treatment | Readable field | Read-head layer use | Total tokens | Result |
|---|---:|---|---:|---|
| Final-layer control | 16 nodes | every head: layer 3 | 59,933 | `燧隙`, `还流`, `隙还`, `修还` |
| Full residual field | 175 nodes | `[0]`, `[0,1]`, `[0,1,2]`, and `[3]` | 159,889 | `燧井`, `隙锻`, `脱身`, `还坊` |

The full treatment cost 2.67 times the final-layer control. Its 180,000-token
estimate missed actual usage by 11.2%. The final-layer control retained that
full-field estimate solely to keep the treatment manifest fixed, so its
reported estimate error is not a valid estimator audit.

This comparison supports two narrower claims:

1. **Task-conditioned heads plus an explicit projection contract repair action
   compliance independently of residual access.** The final-layer control also
   returned the required candidate set, so the improved deliverable cannot be
   attributed to residual connections alone.
2. **Residual access changes the available semantic basin.** The final-only
   proposals remained variants of the final layer's repair/return/fissure
   attractor. The full treatment independently selected early material and
   aesthetic nodes and recovered `燧井` from spark/common-source relations and
   `脱身` from extrication and concrete repair. Seventeen distinct residual
   nodes contributed across the four heads, including valid skip paths that
   read only layer 0.

An initial implementation required every head to cross layer boundaries. The
live model rejected that assumption by repeatedly choosing coherent early-only
routes. Removing the constraint was not a provider accommodation: a residual
or skip path is useful precisely because a head may bypass later compression.
The deterministic suite now retains this as an explicit invariant.

The experiment does **not** establish that the full-field names are objectively
better. The broader semantic range is visible and provenance-backed, but no
blinded evaluator or human preference judgment has yet compared it against the
final-layer control, best-of-N direct generation, or an equal-token baseline.

## Artifact-level candidate-field probe

The residual probe exposed 175 semantic nodes but created only eleven local
name seeds before its final four proposals. The next treatment therefore reused
the same immutable source run and moved branching onto the candidate artifacts.
Eight generative operators emitted eight artifacts each; four mutation
operators transformed eight cross-emitter pairs each. Archive selectors saw
only candidate IDs and surfaces, not their provenance, and could not rewrite a
surface.

The first candidate-field run produced 96 artifacts with 93 unique normalized
surfaces and 57 actual-name candidates in 10.3 seconds using 87,136 tokens. This
resolved the effective branching defect but revealed a new collapse: four
nominal archive niches all saw the same candidate pool and filled twelve seats
with only six distinct candidates. `Flintwork` occupied every niche, and only
one mutated candidate survived. The supposed niches were actually four similar
quality rubrics over the same distribution.

The revised treatment made three evidence-driven changes together:

1. eight controlled external variation seeds crossed the eight emitter
   operators, so distribution did not depend on temperature alone;
2. observed semantic attractors—generic forge/workshop imagery, literal
   repair/return/fissure language, direct virtue labels, and untransformed
   concept compounds—became an explicit negative archive; and
3. archive niches received disjoint operator partitions before independently
   selecting within their local pool.

That bundled treatment produced 96 artifacts with 95 unique surfaces and forty
actual-name candidates in 10.6 seconds using 92,487 tokens. All twelve archive
seats were distinct and three came from second-generation mutation. The
100,000-token revised estimate missed actual usage by 7.5%. Retained examples
now span `息壤 / Xirang`, `音榫`, `迴砺`, `渡坊`, `Seamcraft`, `oxbow-trace`,
`修渡舟`, `赓裂胎`, `脱砺`, `银汉游移`, `rekindlith`, and `无名席次`, rather
than variants of one forge/repair/return basin.

This result supports artifact-level branching and structural preservation, not
high creative quality. Many unselected artifacts still substituted new
morphemes around the old semantic field; the negative archive influenced but
did not reliably inhibit every literal form. The archive explanations also
rationalized their selections after the fact. No automated metric or same-model
selector can establish aesthetic force, and the bundled second treatment does
not isolate which of variation seeds, inhibition, or partitioning caused each
improvement.

### Principal correction: title activation, not embedded seeds

The Principal rejected two assumptions in that revised treatment. First, eight
hand-authored variation phrases made the designer's associations load-bearing.
Second, typing every result as a `name` or `fragment` forced an open associative
process into the final task's output form. Both mechanisms have been removed.
The field now emits one unclassified `content` value; no language, character
count, name status, word status, or artifact category is part of its contract.
A later projection may use an artifact in a naming task, but the field does not
decide that in advance.

External disturbance now begins from a deterministic random shelf in a
versioned title catalog. The built-in catalog accepts exactly a technical ID and
a book title; its strict schema rejects embedded excerpts, summaries, locators,
or source descriptions. One activation selects titles and records whether its
relation came from fallible model memory or external retrieval. The current
DeepSeek adapter reports `memory` unless the caller injects a runtime retriever;
it is explicitly forbidden to fabricate an exact quotation. A broader candidate
catalog covers Daoist, Confucian, Buddhist, historical, poetic, fictional,
technical, Lu Xun, and *Selected Works of Mao Tse-tung* titles while excluding a
general modern-author bucket and Hu Shi from the initial scope.

The first live title-only run exposed an interface ambiguity: residual nodes
and title entries both carried visible IDs. Fifteen of 64 selection calls
returned node IDs, leaving 49 emissions and a `partial` record. The repair
removed node IDs from the selection prompt, renamed the structured field to
`titleIds`, printed the exact allow-list, and retained usage when selection
validation fails. The same immutable source was then replayed:

| Title-only memory treatment | Result |
|---|---:|
| Title activations accepted | 64 / 64 |
| Emitted artifacts | 61 / 64 |
| Mutated artifacts | 32 / 32 |
| Unique normalized contents | 93 / 93 |
| Distinct archive seats | 12 / 12 |
| Total tokens | 190,289 |
| Error against 180,000-token estimate | 5.7% |

Three emissions still returned no structured output after one retry, so the run
remained `partial`; no title-selection failure remained. The resulting objects
included short handles, narrated scenes, material actions, invented records,
mixed-language prose, and long relational images. That is evidence that the
runtime no longer enforces a two-character or name-shaped result. It is not
evidence that the results are aesthetically good or that remembered source
relations are textually accurate. The artifact lineage now retains title IDs,
activation basis, and the remembered or retrieved resonance; deterministic
tests cover that audit shape because the live replay preceded the final lineage
addition.

### Runtime-retrieval treatment

The next treatment kept the immutable activation source, random-shelf seed,
title catalog, operator population, mutation graph, and archive partitions. It
injected a source-agnostic retrieval boundary into the driver and used an
experimental Chinese Wikisource adapter behind that boundary. The repository
still stores titles only. Runtime evidence records title ID, provider, page
locator, direct URL, a bounded excerpt, and its SHA-256 digest.

The adapter follows the official
[MediaWiki Action API etiquette](https://www.mediawiki.org/wiki/API:Etiquette/en):
identified requests, serial access, local caching, `maxlag=5`, and bounded
`Retry-After` handling. An initial 22-title coverage probe sent parallel bursts
and received 22/22 HTTP 429 responses. The corrected serial probe resolved
18/22 titles; the four *Selected Works of Mao Tse-tung* volumes had no
Wikisource match and remained explicit misses. A second defect used simplified
title similarity to prefer modern legal judgments over traditional exact work
titles. Exact-phrase search order and collection table-of-contents parsing
repaired the observed mismatches for *Zhuangzi*, *Book of Poetry*, *Records of
the Grand Historian*, *Dream of the Red Chamber*, and *Call to Arms*.

The live comparison produced:

| Treatment | Memory | Runtime retrieval |
|---|---:|---:|
| Emitted artifacts | 61 | 62 |
| Mutated artifacts | 32 | 31 |
| Unique normalized contents | 93 | 93 |
| Full retrieval activations | 0 | 51 |
| Mixed activations | 0 | 11 |
| Runtime evidence records | 0 | 113 |
| Unique external locators | 0 | 65 |
| Median content length | 65 | 75 |
| Contents over 100 characters | 18 | 29 |
| Total tokens | 190,289 | 403,978 |
| Estimate error | 5.7% of 180,000 | 12.2% of 360,000 |

All eleven mixed activations were caused by *Wild Grass* collection pages whose
transcluded text was empty through TextExtracts. After the live run, a readable
collection-root fallback repaired the failure in five of five external spot
probes and is protected by a regression test. The stored treatment remains
`51 retrieval + 11 mixed`; it is not rewritten after the fact.

External evidence changed some surface allocation but did not solve the main
creative-quality contradiction. Compared with memory-only emission, observed
tokens moved from `fire 34 → 23`, `crack 23 → 18`, `forge 13 → 9`, and combined
workshop terms `9 → 2`; `repair` instead rose `33 → 37`. Concrete material from
specific hexagrams, historical episodes, novel chapters, and Zhuangzi passages
entered the artifacts, but the project still assimilated much of it into its
existing repair/fissure relation.

Retrieval also did not repair title-selection bias because title choice occurs
before source lookup. Successful emissions selected only twelve of the 22
available titles; *Zhuangzi* appeared 28 times, *Wild Grass* 20, and *Book of
Changes* 19. Runtime retrieval can disturb a selected basin and ground its
source, but it cannot make an unselected title active. No human comparison has
established that the 2.12-times-more-expensive treatment is aesthetically
better.

### Balanced title-participation treatment

The retrieval comparison showed that external lookup occurs too late to repair
title-selection bias. The next treatment changed availability without changing
the Agent's generative judgment: each activation received one deterministic
balanced participation seat, and one title seat remained freely selected. The
runtime enforces inclusion of the reserved title and records it separately in
artifact lineage. A selector that omits it fails closed. No category label,
interpretation, passage, or desired output form is attached to the seat.

The 64 scheduled seats use a seeded permutation of the 22-title starter
catalog. Among 63 successful emissions, every title appeared in a reserved seat
two or three times. One failed emission did not remove catalog coverage.

| Retrieval treatment | Free title choice | One balanced participation seat |
|---|---:|---:|
| Successful emissions | 62 | 63 |
| Successful mutations | 31 | 29 |
| Unique normalized contents | 93 | 92 |
| Distinct selected titles | 12 / 22 | 22 / 22 |
| Full retrieval activations | 51 | 52 |
| Mixed activations | 11 | 11 |
| Runtime evidence records | 113 | 115 |
| Unique external locators | 65 | 67 |
| Median content length | 75 | 78 |
| Contents over 100 characters | 29 | 30 |
| Total tokens | 403,978 | 404,360 |

The intervention isolated opportunity from preference. All 22 titles reached
the field, but the 63 free seats still selected *Zhuangzi* twenty times, *Dao
De Jing* eleven, *Book of Changes* eleven, and *Wild Grass* ten. The Agent's
preference distribution therefore did not change; the balanced seat prevented
that preference from excluding the rest of the catalog.

Broader participation did not by itself escape the project's semantic basin.
Relative to free retrieval, observed terms moved only slightly from `fire 23 →
21`, `crack 18 → 16`, and `forge 9 → 7`, while `repair` rose `37 → 43` and
combined workshop terms rose `2 → 7`. Low-frequency sources produced concrete
new collisions—for example Xunzi's explicit ethical distinctions against
Zhuangzi's indeterminate generation—but the emitter often translated those
collisions back into repair, fissure, workshop, and inheritance language.

The treatment recorded one *Call to Arms* miss because the first eight randomly
ordered table-of-contents entries exposed empty TextExtracts. The adapter now
tries up to 32 entries before its readable-root fallback; five of five live
*Call to Arms* spot probes resolved valid story pages after the repair. The
remaining expected retrieval misses are the four *Selected Works of Mao
Tse-tung* volumes, for which this provider has no title match. The stored run is
not rewritten.

Balanced participation is therefore supported as a distribution-control
mechanism, not as a creative-quality improvement. It achieved full catalog
participation at essentially unchanged token cost, but no observed lexical or
same-model archive measure establishes superior aesthetic value.

### Human rejection of the archive surface

The planned blind comparison did not reach a treatment preference. Before
choosing either side, the Principal rejected the comparison set itself as
unfamiliar and mannered. This is decision-changing evidence: both arms had
already passed the same novelty-biased archive, so a pairwise preference could
not test whether either treatment produced an acceptable creative surface.

The rejected set was not a neutral sample of the field. Every item came from an
operator that deliberately transformed ordinary expression—productive
misreading, constructed morphemes, negative space, translation drift, or
weathering—and one item per archive niche was then selected for force before
explanation, productive ambiguity, or estranged fit. The configuration also
weighted the aesthetic population toward remote association, mutation,
metaphor, estrangement, and high temperature. Although individual instructions
warned against decorative obscurity, the total system rewarded the very
distance and density that made the surfaces feel contrived.

There was a second category error. Candidate-field artifacts were intentionally
unclassified intermediate associations, but the human packet presented them as
objects ready for aesthetic preference without a later audience-aware
projection. The field's refusal to converge was treated as if it were a usable
expression. The packet also had no plain direct baseline, so it offered the
Principal no natural register against which to reject the shared distortion.

This observation does not distinguish free retrieval from balanced
participation; it invalidates the proposed blind gate. Balanced participation
remains a verified coverage mechanism only. The live contradiction is now
whether distributed associative material can contribute to a plain, memorable,
usable expression without making strangeness itself the selection target.

### Expression projection and surface-gate probes

Two matched expression probes then separated a direct naming baseline from a
projection that privately received 24 artifacts: two deterministic samples from
each of the twelve candidate-field operators. Both treatments saw the same
project sources, naming problem, candidate count, and public-output contract.
The associative material was hidden from the human packet and could be ignored.

The first probe removed mannered expression but collapsed both treatments into
generic English craft compounds such as `CommonLoom`, `OpenForge`, `Shared
Lathe`, and `Civic Kiln`. It used 11,262 tokens against an initial 50,000-token
estimate, a 77.5% overestimate. This rejected the assumption that a plainness
instruction alone could digest the field; it changed maximal distance into
minimal risk rather than producing natural creative expression.

The second probe calibrated the estimate to 14,000 tokens and added explicit
Principal evidence: `本源` as an associative starting point rather than a
template; `Sikong` and `Shilu` as examples rather than a Chinese or historical
form requirement; and `Deno` and `Vite` as research cases rather than short
English-word standards. Actual usage was 12,623 tokens, a 9.8% estimate error.
The direct treatment returned arbitrary borrowed words such as `Kaili`,
`Oikia`, and `Veld`. The field-informed treatment imitated the evidence's
surface, resurrected the explicitly rejected `Gongqi / 公器`, and produced
`笨器`, `Ghoti`, `脉阶`, and `修承`. Writing preference evidence into the same
generating prompt did not constitute learned taste.

A final surface-only gate separated rejection from generation. Three independent
same-model reads judged mouth-and-ear fit, cultural naturalness, and room for
meaning. Each saw only the twelve names and spoken forms, had no quota, and was
explicitly allowed to reject all. All three rejected all twelve; no name entered
the human packet. The gate used 3,821 tokens. This supports a narrow mechanism:
an absolute, separately executed rejection boundary can prevent known-bad
surfaces from consuming human review bandwidth. It does not establish aesthetic
quality, because the gate is same-model self-evaluation and generated no good
alternative.

### Corrected expression authority and live replay

The first implementation correction removed Principal examples from the naming
generator, changed the requested candidate count into a maximum with an allowed
empty result, stopped the expression probe from writing a human packet, and
moved contrastive cases into the independent surface gate. Its first live replay
used 11,931 tokens and revealed a separate source-authority defect: the project
snapshot still included `FOUNDING-IDENTITY.md`, whose proposed decision continued
to recommend the already rejected `Gongqi / 公器`. Both direct and projected arms
resurrected that surface. The identity artifact now records the proposal as
rejected, and no naming candidate, example, or rejection is included in the
generation snapshot.

The clean-source replay used 9,772 tokens. It did not repeat `Gongqi`, but both
arms filled the six-item maximum with generic craft language while their
rejection observations claimed that no candidate survived. This rejected the
assumption that an optional list alone creates a coherent all-reject action.

The final correction made the phase transition explicit. Twenty-four private
associative artifacts are first projected into zero to six plain relations; the
projection is forbidden to preserve a candidate surface, sound, spelling,
translation, historical costume, or metaphorical object. The naming generator
sees only those relations. Its output contract has a disposition whose
`all-rejected` branch requires an empty list and whose `candidates` branch
requires a non-empty list. A malformed structured result receives one bounded
schema-repair attempt, and observed failed-attempt usage is retained.

The final live expression run used 19,484 tokens against the revised 16,000-token
estimate, including one structured recovery. It retained six source-indexed
plain relations and produced schema-consistent private sets. Quality did not
improve: the direct arm returned `CommonForge`, `Aperture`, `Loom`, `Tiller`,
`Vane`, and `Splice`; the projected arm returned `Foundry`, `Anvil`, `Keystone`,
`Loom`, `Craft`, and `Spindle`. The three-seat contrastive surface gate then used
4,078 tokens and surfaced none of the eleven unique names. The generated human
packet contained no explanations and stated that no candidate survived. A
separate zero-candidate CLI probe bypassed every judge call, used zero tokens,
and produced the same no-candidate packet.

This replay supports source/case isolation, private-to-public authority
separation, structured all-reject consistency, and human-bandwidth containment.
It supplies new negative evidence against activation-field projection as a
naming-quality treatment: projected relations did not beat the direct baseline
and intensified the generic craft basin. The next estimate is calibrated to
20,000 tokens, but no new live naming run is warranted before the formation
method changes.

## Disposition

Do not promote activation-field, residual-readout, or candidate-field
configuration into the Work Cell core or a Skill. The technically successful
adapters remain experiments.
Shape distribution, cognitive-phenotype compilation, residual early-feature
recovery, and artifact-level branching are now credible experimental
mechanisms; superior creative quality is not yet established.

Do not run another generation merely by adjusting prompt adjectives. The next
discriminating practice must study contrastive formation histories as processes,
not place approved or rejected surfaces in the generator. Preserve the separate
all-reject gate as a bandwidth defense, but do not use it as acceptance authority
or feed its prose back into an unbounded regeneration loop. A later treatment
must compare against the direct baseline and fail if it copies case surfaces,
repeats rejected formation patterns, intensifies generic craft imagery, or
cannot produce anything that survives both the surface gate and human review.

Do not spend the estimated four million tokens on a new 256-node live run. The
64-node treatment now satisfies the deliverable and recovers rare basins; the
unresolved question is comparative quality and causal contribution, neither of
which needs a larger population.

The revised hypothesis fails if the diversity-preserving treatment still
collapses into the same few metaphors, does not outperform the much cheaper
direct baseline on the requested action, or produces alleged emergent relations
that cannot survive provenance and ablation checks.
