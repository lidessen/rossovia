# Cognition Projection Contract

Use the target project's accepted documentation and derived-artifact layout. If
none exists and persistence is authorized, a small Markdown carrier is the
default interoperable form:

```text
docs/cognition/
  INDEX.md
  <meaning-owned-facet>.md
  ...
```

The names and count come from the current project and decision field.

## Routing index

Keep `INDEX.md` compact enough to route an agent without loading every facet. It
should name:

- purpose, supported decisions, and explicit non-coverage;
- authoritative sources and exact revision or equivalent version identity;
- facet question, path, source scope, verification status, and invalidation
  signals;
- cross-facet relations and unresolved boundaries;
- verification status, the accountable external actor/run/process when one has
  actually checked it, the last verification observation, and retention/commit
  owner; and
- references to cold evidence when later audit may need it.

## Facet

Each facet should contain:

- the coherent question it answers and decisions it supports;
- verified source-linked claims, with readable inline anchors;
- responsibilities and relevant causal, state, authority, contract, evidence,
  or change relations selected for that question;
- incoming and outgoing relations to other facets or uncovered source regions;
- inference, contradictions, missing evidence, and known blind spots; and
- invalidation signals or source changes that require rechecking it.

Use Markdown unless the target project already has a better agent-readable
projection form. Keep one semantic question per facet. File size is soft
readability guidance: split by meaning only when one agent cannot coherently
read and revise the question. Do not introduce byte chunks or nested manifests
to satisfy an arbitrary limit.

## Authority and lifecycle

The projection must declare itself rebuildable and non-authoritative. Retaining
or committing it does not accept its claims automatically. A verifier checks
the source-linked decision field, and the target project's authorized process
decides retention.

Do not name the Skill, a Cell, a generator, the projection, or a successful tool
call as the verifier. Those can retain preparation or execution evidence only.
Until an accountable external actor, review run, or governed process checks the
claims, record the projection as `proposed` or `unverified` and name the future
verification owner separately.

Refresh from changed relations, not age alone. Preserve reuse, refresh, split,
merge, and retirement dispositions so later actors can audit why a facet
survived. Delete or bypass the projection when direct source reconstruction is
cheaper, the provenance is missing, or its decision field no longer matters.
