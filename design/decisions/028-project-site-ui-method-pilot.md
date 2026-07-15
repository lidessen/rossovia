# 028 — Project Site as UI Method Pilot

**Status:** approved pilot
**Date:** 2026-07-14
**Approved by:** principal

## Concrete pressure

The repository has a source-bound aesthetic practice but no real interface on
which to learn whether it can guide UI work. Its README and Markdown sources
are usable to an already motivated reader, yet they do not provide a public
entry, searchable documentation, or a visual system that can be observed in
use. Creating a portable UI skill before such practice would promote prompt
advice without evidence.

[Impeccable](https://github.com/pbakaus/impeccable/tree/8259c28209b92792005cec14dad573df39f68eaf)
is a useful external treatment because it combines product context, interface
shaping, implementation, critique, browser iteration, and deterministic checks.
Its breadth is also the reason not to copy it into this repository: one skill,
many command modes, a large reference surface, hooks, browser machinery, and
fixed style detectors form a product-specific UI system rather than the
smallest proven method missing here.

## Form decision

Build the project's own public site and documentation as the first real UI
case. The pilot is a product surface and an experiment, **not a new active
skill**. It has two independently reviewable objects:

1. a public home page that makes the project's purpose, repository boundary,
   and first action intelligible; and
2. a documentation shell that makes the existing methods findable and usable
   without replacing their owning Markdown sources.

The site is a projection of accepted repository sources. It may own navigation,
layout, visual treatment, and short connective copy. It may not become a second
mandate, Sequence, skill definition, operating protocol, or project identity.

## Product and audience

| Audience | Decision the surface must support | First useful action |
|---|---|---|
| ordinary user or small team | whether this work offers an inspectable, economical route to productive AI rather than another opaque platform | understand the mandate and install one relevant skill |
| agent-method practitioner | which method owns the current problem and what evidence it expects | browse the skill catalog and open one complete skill page |
| prospective contributor | where a proposed principle, skill, runtime change, or observation belongs | follow the repository map to the owning source and contribution path |

The site must not require a visitor to accept the project's political or
technical claims before they can inspect its concrete methods and evidence.

## Technology decision

Use **Astro with Starlight** for the pilot. Starlight is an MIT-licensed Astro
documentation framework with Markdown/MDX content, a wide `splash` layout for
landing pages, component overrides, and Pagefind-backed search; these let one
static application carry a distinct public home page and a conventional,
searchable documentation shell. See the official
[Starlight source](https://github.com/withastro/starlight/tree/bbab7b19e74de7f1758dafea52b16f8011149cd1)
and its
[frontmatter reference](https://starlight.astro.build/reference/frontmatter/#template).

[VitePress](https://github.com/vuejs/vitepress/tree/3868b64e419223279eaae800766b244cde9bc85f)
is a credible smaller alternative with a default home layout, rewrites, and
local search. Starlight is selected because this case needs a more distinct
brand-facing surface alongside the docs shell, not because VitePress is
generally inferior. Reopen the choice if the first implementation spends more
effort escaping Starlight than expressing the case, or if its content loader
makes source projection materially fragile.

The future implementation belongs under `site/` as an independent package. A
checked-in manifest maps authoritative repository sources to public routes. A
build step materializes Starlight-compatible Markdown into a generated content
directory. Generated pages are never edited, and the build fails when a
declared source is absent. This explicit projection is preferred to maintaining
hand-copied documentation or teaching the site framework to treat the entire
repository as routable content.

The first public target is [Vercel](https://vercel.com/docs/deployments), using
its static Astro output rather than a Vercel-only runtime capability. Preview
deployment precedes production aliasing. The public domain has the form
`skills.<existing-primary-domain>`. The Principal initially selected an owned
subdomain, then chose `skills.angineer.dev` from an existing Vercel-managed
domain family to avoid an additional DNS control path. The subdomain identifies
the repository surface, not the still-unresolved project name, and remains a
replaceable routing decision. Domain purchase, nameserver transfer, analytics,
and automatic production deployment are outside this pilot unless separately
approved.

On 2026-07-14, the Principal replaced that provisional route with
`https://skills.atthis.run`. The domain family is already owned and DNS-managed
in the same Vercel team, so the change keeps the original single-control-path
intent while retaining a descriptive subdomain that does not depend on the
project's unresolved final name. The superseded `skills.angineer.dev` route was
removed instead of retained as a compatibility redirect.

## Content authority and first slice

| Route | User-facing job | Authoritative source | Projection boundary |
|---|---|---|---|
| `/` | explain purpose, current repository role, and next actions | [`FOUNDING-MANDATE.md`](../FOUNDING-MANDATE.md), [`FOUNDING-IDENTITY.md`](../FOUNDING-IDENTITY.md), and [`README.md`](../../README.md) | use `Skills` only as the repository label; do not invent the unresolved project name |
| `/docs/` | orient a user to the repository and its active surfaces | [`README.md`](../../README.md) and [`DESIGN.md`](../DESIGN.md) | concise orientation may link and excerpt; it does not restate architecture as a new source |
| `/docs/principles/sequence/` | expose the semantic root and its interpretation boundary | [`principles/SEQUENCE.md`](../../principles/SEQUENCE.md) | preserve P-IDs and wording; explanation links to owning interpretations |
| `/docs/skills/` | let a user select an active method | the active-skill table in [`README.md`](../../README.md) plus each active `SKILL.md` | catalog data is generated from declared active paths, not maintained twice |
| `/docs/skills/context-engineering/` | prove one complete skill remains readable as a public document | [`skills/context-engineering/SKILL.md`](../../skills/context-engineering/SKILL.md) and its direct references | the rendered page may improve navigation but not rewrite the installable prompt |

A three-level adoption guide — full project use, partial adoption, and one
self-contained task skill — remains a desirable later route, but no accepted
source currently owns that contract. The site must expose the source gap rather
than invent the policy in presentation copy.

## Matched UI-method experiment

Implement the same first slice in isolated worktrees with one content snapshot,
route manifest, framework version, viewport set, browser capability, and
acceptance contract:

| Arm | Available method context | Excluded variable |
|---|---|---|
| A — baseline | repository sources, the Aesthetic Case, and ordinary coding-agent capability | Impeccable instructions, commands, detectors, and generated design context |
| B — treatment | the same inputs plus a pinned, attributed Impeccable treatment | different content, framework, requirements, or acceptance bar |

Each arm returns one best implementation, not a gallery. Review screenshots and
task evidence are labelled only `A` and `B` until the Principal records a
preference. A mechanical gate checks build success, local links, semantic
landmarks, keyboard operation, visible focus, contrast, responsive layouts,
overflow, and a bounded performance profile. Human review owns hierarchy,
identity, trust, aesthetic coherence, and whether either result should ship;
rejecting both is valid.

Retain implementation time, model/provider, token and monetary usage when
available, intervention count, failed checks, and the downstream files each arm
had to inspect. Lower cost is not a success if context loss or missed impact
produces a weaker interface.

## Admission and reopening

After the home page and documentation shell have both been used and reviewed,
record what the treatment changed. Consider a local UI skill only if repeated
evidence shows a compact, independently useful judgment that the existing
aesthetic practice, disciplined development, and ordinary framework guidance
do not already supply. Candidate ownership should begin with `shape`, `craft`,
and `review`; it must not absorb brand authority, browser runtime, accessibility
standards, or human aesthetic acceptance merely because one external system
bundles them.

Reopen this decision if the site starts owning source facts, the matched arms
cannot be kept comparable, the framework prevents a truthful visual direction,
or the project name/adoption model receives an accepted source that changes the
public information architecture.

## Sequence expression

- **P16:** the public form must let each audience identify the project relation
  and take a real next action.
- **P14:** website pages, catalogs, navigation, and generated Markdown are
  projections whose facts remain reconstructable from owning sources.
- **P03 / P15:** learn from two real UI objects before making the smallest
  justified skill transition.
