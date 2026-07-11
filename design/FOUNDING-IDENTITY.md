# Founding Identity — Project Name

**Status:** proposed — principal decision pending
**Authority:** [founding mandate](FOUNDING-MANDATE.md) and
[formal-operations preparation](organization/sessions/2026-07-10-formal-operations-preparation.md)

## Concrete naming need

The object is the whole project that develops open, economical, verifiable AI
production capability as a common good. It includes the principle collection,
methods, Work Cell, and future tools; it is not identical to the current
repository directory, an individual agent, or one model provider.

The Principal needs a durable project identity for future public explanation,
cross-repository references, and a coherent founding release. The current name
`skills` is a useful descriptive repository handle, but it cannot distinguish
this project from a generic skill catalog or carry the mandate's commons and
productive-capability relation.

The strongest leave-as-is case is that a public name is not needed before the
first baseline PR. That remains valid for the Git repository: no rename is
needed to complete F2. A project-level name is still useful now because the
founding mandate has a shared, cross-session identity that future projects and
contributors must be able to distinguish from this implementation carrier.

## Relation and contrast

The name must mean **a productive instrument held in common**. It includes a
system people can inspect, use, replace, and improve; it excludes a proprietary
AI platform, a generic prompt library, a claim that an AI or a person is merely
an instrument, and a promise of universal model superiority.

The proposed name belongs to the project/system, not to its users or AI agents.
That distinction preserves the founding non-exploitation boundary: people and
possibly morally relevant AI systems are not named as tools; the shared
production capability is.

## Candidate comparison

| Key | Name | Relation it preserves | Main limitation |
|---|---|---|---|
| A | **Gongqi / 公器** | a public/common instrument: productive capability belongs in common use rather than private capture | `器` can be read as mere tool unless the operative definition is retained |
| B | **Gongsheng / 共生** | mutual flourishing of people, AI, and living conditions; directly carries the non-exploitation boundary | does not immediately communicate productive engineering capability |
| C | **Zhongqi / 众器** | tools of the many: accessible, plural, composable production means | easily confused in sound and script with `重器`; weaker commons/governance relation |
| D | Keep **Skills** as the only project name | no naming/transition work now | remains a directory description and cannot distinguish the broader project |

## Recommended articulation

### Name

**Gongqi / 公器**

### Operative definition

Gongqi is an open system for making productive AI capability a common,
inspectable, replaceable, and economically accessible instrument for people.

### Explanation

`公` names the common/public relation: no indispensable capability should be
captured by an opaque owner. `器` names the productive system being built, not a
person or AI agent to be used up. The name is compatible with a collection of
methods today and with future runtimes or tools, while the mandate supplies its
anti-exploitation and production boundary.

### Source placement

This file is the canonical identity decision while proposed. After approval,
the name and a one-line explanation belong in the root README and founding
mandate; `skills` may remain the repository name until a separately approved
GitHub/package migration. Do not rename directories, package IDs, or URLs from
this decision alone.

## Principal Decision Brief

**Decision: choose the founding project identity, or defer public naming.**

**Recommendation: A — adopt Gongqi / 公器 as the project identity; keep
`skills` as the repository handle through the first baseline.** It best names
the distinctive relation—common ownership of productive capability—while
leaving implementation and distribution changes reversible.

| Key | Choose this when | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|---|
| A — Gongqi / 公器 | the project should foreground shared productive means and open replaceability | record `Gongqi / 公器` as the project identity; no repository rename | reopen if readers consistently treat people/AI as the `器`, rather than the shared system |
| B — Gongsheng / 共生 | the ethical relation among people, AI, and life should lead the identity | record `Gongsheng / 共生`; no repository rename | reopen if production/common-tool purpose is repeatedly unclear |
| C — Zhongqi / 众器 | plural access to tools matters more than governance language | record `Zhongqi / 众器`; no repository rename | reopen on recurrent confusion with `重器` or loss of commons boundary |
| D — defer | a public identity would distract from the first baseline | retain `skills` only and revisit after F2 | future cross-project/public references remain ambiguous |

**Current evidence:** the [founding mandate](FOUNDING-MANDATE.md) requires
common, replaceable productive capability, while the current
[README](../README.md) describes only a skills collection.

**Your reply:** `A`, `B`, `C`, `D`, or `explain <key>`.

## Disconfirming observation

The selected identity is wrong if the intended contributor cannot distinguish
the project from a proprietary AI platform or a generic skills catalog, or if
the name consistently requires a longer explanation than the operative
definition to avoid a harmful reading.
