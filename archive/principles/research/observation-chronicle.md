# Research — Observation Chronicle

**Disposition:** no-proposal
**Scope:** Determine whether this collection needs a cross-domain record of
observations that can preserve provenance, uncertainty, corrections, and later
reconstruction without turning logs, reviews, or dashboards into fact sources.
**Source limitations:** Historical examples establish recordkeeping lessons, not
a transferable state apparatus. The project evidence is presently limited to
Work Cell records and human-authored design/aesthetic artifacts; no production
telemetry or external field-data source has been tested.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

What minimum common record can let a later person or agent recover what was
observed across work, Git/PR, human review, and future external sources—while
keeping raw sources, interpretation, decision, and rebuildable projections
separate?

## Distinctions

- **Observation Chronicle** is an append-only receipt for an observation and
  its provenance. It is neither the raw source nor a verdict about that source.
- **Source-native record** remains with its creator: a Work Cell run record, a
  Git object, a PR review, or a human field note. The Chronicle points to it and
  may preserve a digest; it does not ingest and reorder it as central truth.
- **Claim, review, and decision** may cite observations but retain their own
  authority and acceptance path. A correction appends a new statement about a
  prior record; it does not erase the prior occurrence.
- **Projection** is an index, metric, report, or dashboard reconstructible from
  named sources. It has no fact authority.
- **Append-only** describes historical relation, not universal disclosure or
  indefinite retention. Sensitive content needs a separate custody, access, and
  retention decision; the Chronicle defaults to the minimum non-sensitive
  pointer needed to recover context.

## Evidence

The [National Archives record-group guidance](https://www.archives.gov/research/guide-fed-records/index-numeric/concept.html)
uses provenance to keep records attributed to their creating or maintaining
agency and arranged in their active-use order. Its [arrangement guidance](https://www.archives.gov/research/alic/reference/archives-resources/principles-of-arrangement.html)
explains that separating records from their generating context can obscure their
documentary meaning. This supports a receipt-plus-pointer form instead of a
centralized event database that copies and reclassifies all source material.

The [First Historical Archives publication](https://www.saac.gov.cn/daj/c100166/202101/00d4961ec0af4b819e263bb43a27bc45.shtml)
describes *qijuzhu* as annalistic records of imperial conduct and major affairs;
the [Capital Library description](https://www.clcn.net.cn/resources/default/detail?id=112)
notes their comparatively plain wording and use as a source for later
compilations. The project analogue is narrow: maintain an inspectable record of
what was observed before later reports compress it. It is not an analogy that
licenses hierarchy, surveillance, or political authority.

The [local-gazetteer definition](https://www.linxiang.gov.cn/24733/24760/24821/24992/25000/content_603802.html)
describes a local gazetteer as a comprehensive factual record across natural,
political, economic, cultural, and social conditions, while the [Hunan
gazetteer institute's source guidance](https://dfz.hunan.gov.cn/dfz/ztzl/fzbk/202211/t20221115_29126690.html)
distinguishes written, oral, and material sources. This supports a small shared
envelope with domain-specific adapters, rather than one universal vocabulary of
metrics or values.

The [W3C PROV primer](https://www.w3.org/TR/prov-primer/)
models the relations among entities, activities, and agents, and the
[OpenTelemetry log data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
separates the time an event occurred from the time it was observed and carries
resource and instrumentation context. The pilot borrows these distinctions as
portable field semantics; it does not adopt RDF, an observability backend, or a
telemetry standard as project doctrine.

Project evidence already separates source-like records from interpretation:
the [Work Cell run contract](../../packages/work-cell/src/run-cell.ts) retains
execution evidence, and the [aesthetic pilot](../../design/decisions/017-aesthetic-practice-pilot.md)
retains a Principal acceptance separately from a generated asset's public-use
status. The current repository lacks one cross-domain, provenance-preserving
way to reference such observations or to make later correction explicit.

## Existing-sequence coverage

- **P02:** requires that observations name the actual object, source, method,
  and limitation rather than inherit an attractive narrative.
- **P08:** requires that an observation-derived claim expose what could correct
  or limit it; correction chains make this visible without rewriting history.
- **P12:** supports a compact durable receipt that lets a successor recover the
  relevant source and condition rather than preserving an undifferentiated log.
- **P13:** keeps an observation, a claim, a verification, and an acceptance
  distinct; a valid event shape is not admission of a strategic fact.
- **P14:** keeps indexes, metrics, reports, and dashboards rebuildable and
  non-authoritative relative to named sources.
- **P15:** selects a schema, JSONL ledger, and three adapters before any
  database, collector, dashboard, or organization-wide scoring system.

## Possible decision delta

Adopt a project-local Observation Chronicle pilot: a versioned minimal schema,
append-only ledger, source adapters for Work Cell, Git/PR, and human
observation, plus a validator. This changes how reusable evidence is retained
without changing who may decide, verify, or accept work.

## Strongest no-proposal case

No new P-ID is warranted. The required distinctions are the joint expression of
P02, P08, P12, P13, P14, and P15. A new “recordkeeping” principle would name a
useful carrier while duplicating existing decisions about evidence, inheritance,
authority, and minimum transition.

## Disposition and next evidence

**Disposition:** `no-proposal`

The pilot should be reconsidered if real adapters require a new authority
boundary, a domain cannot state its observations without a new irreducible
decision rule, or a later projection cannot be rebuilt from declared source
records. Otherwise, evaluate whether the three initial adapters preserve
provenance and correction without adding collection burden that changes no
decision.
