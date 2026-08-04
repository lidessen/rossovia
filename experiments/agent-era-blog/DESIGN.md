# Agent-Era Blog — working product thesis

**Status:** supervised experiment; revisable through the active Mission
**Object:** a blog designed for a world in which both people and agents read,
transform, and act on published writing.

## Product relation

Traditional blogs publish a page and treat every later summary, quotation, or
answer as somebody else's problem. In an agent-mediated reading environment,
that makes the author's meaning easy to flatten and hard to verify.

This product treats a post as two related but unequal surfaces:

1. the **canonical article** is the author's accepted expression; and
2. a **reading field** contains source-grounded projections for different
   readers or agents.

The reading field may shorten, reorganize, question, or expose the article's
claim-and-source structure. It cannot silently rewrite the canonical article.
Every projection names its source revision and remains disposable.

## First end-to-end path

An authenticated author:

1. writes one article with a thesis, body, explicit claims, and sources;
2. inspects a reader view and one deterministic agent-facing brief;
3. publishes an immutable revision.

An anonymous reader:

1. reads the canonical revision;
2. changes between canonical, brief, and source-map views without losing the
   source revision;
3. can inspect how each derived statement maps back to claims and sources.

The first slice proves this relation with one realistic seeded article and a
real durable content model. Live model generation, comments, subscriptions,
and collaborative editing are later capabilities.

## First content-model contract

This section specifies the pending first candidate contract; the checked-in
pre-implementation shell does not implement it yet. That candidate would keep
one portable domain contract between D1, deterministic projection, and the
later reader/studio UI. `db/schema.ts` would export six distinct Drizzle
tables:

- `posts`: stable post identity, slug, and author;
- `publicationRevisions`: immutable title, thesis, body, and publication time
  for one post;
- `claims`: revision-scoped canonical statements;
- `sources`: revision-scoped source metadata;
- `claimSources`: explicit claim-to-source relations; and
- `projections`: rebuildable payloads identified by source revision,
  projection kind, and generator kind.

Canonical tables never depend on `projections`. A projection points toward its
source revision; the reverse relation cannot make the projection canonical.

`app/blog/content.ts` would export these black-box test ports:

```ts
interface PublishedRevision {
  revisionId: string;
  postId: string;
  title: string;
  thesis: string;
  body: string;
  claims: Array<{ id: string; statement: string }>;
  sources: Array<{ id: string; title: string; href: string }>;
  claimSources: Array<{ claimId: string; sourceId: string }>;
}

interface DerivedStatement {
  id: string;
  text: string;
  claimIds: string[];
  sourceIds: string[];
}

interface ReadingField {
  sourceRevisionId: string;
  generatorKind: "deterministic";
  brief: DerivedStatement[];
  sourceMap: DerivedStatement[];
}

export const seededPublishedRevision: PublishedRevision;
export function buildReadingField(
  revision: PublishedRevision,
): ReadingField;
```

The candidate seed would contain at least two claims, two sources, and one
closed claim-to-source relation. Projection would be pure and deterministic.
Every derived statement would carry non-empty claim and source references that
resolve within the supplied revision and agree with its claim-to-source
relations. Calling the projector with a later revision of the same post would
have to bind the result to that later `revisionId`; it could not return or
relabel a projection built from the earlier revision.

## Authority map

| Artifact | Owner | Authority |
|---|---|---|
| Draft article, claims, and sources | authenticated author | proposed content |
| Published revision | author publication action | canonical public source |
| Brief, reading lens, source map | deterministic projector or later Agent | rebuildable projection |
| Verification marker | declared verifier | scoped evidence only |
| Product acceptance | human Principal through the active Mission | whether the slice is fit |

## First-slice acceptance

- One durable schema preserves posts, claims, sources, projection provenance,
  and immutable publication revisions.
- The public article makes canonical and derived material visually and
  semantically distinct.
- The studio supports the complete seeded author-to-reader path without
  claiming unsupported live-agent behavior.
- Mobile and desktop layouts preserve reading hierarchy and source access.
- The supervision experiment can observe and redirect implementation without
  confusing Workbench projection state with product truth.

## Reopening signals

Reconsider the deterministic projection boundary when a real reader question
cannot be served without model inference, when authors need revision proposals
over several sources, or when an Agent must act on a post rather than only read
it. Any such capability must retain revision, provenance, and human acceptance
boundaries.
