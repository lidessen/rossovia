# Expression Layers (P16)

Use when creating, rewriting, or reviewing any skill. Domain skills own **what**
must be decided; skill-engineering owns **how** that decision is expressed so
the practitioner can act.

## Layer map

| Layer | Typical artifact | Reader | Job |
|---|---|---|---|
| Trigger | `description` in frontmatter | Skill classifier | Match intent under budget; front-load use case |
| Action | `SKILL.md` + `commands/*` | Agent executing | Enable the next judgment and action |
| Doctrine | Optional `references/concepts.md` in the **target** skill | Agent on activation; stewards | State domain essence, vocabulary, boundaries — not P16 meta-rules |
| Gates | Domain reference tables | Agent during classify / verify | Falsifiable tests for the domain |
| Audience projection | Optional metaphor or `explain` output | Humans on request | Intuition or translation; never a second canon |
| Public index | Host `README.md`, `design/` | Newcomers | Host-facing summary mapped to doctrine terms |

**Rule:** If two layers use different words for the same thing, record the map
in the target skill's doctrine file or in review notes — not scattered across
SKILL.md and optional metaphor files.

## Concepts document (domain doctrine)

Some skills need a pause-and-resume **doctrine** artifact separate from the
execution prompt — especially when the domain is abstract and directory names
are contingent form.

- **Belongs in the target skill** as `references/concepts.md` (or host
  `concepts/<skill>.md`): essence functions, domain vocabulary, domain
  boundaries, host-specific layout examples.
- **Does not belong there:** P16 layer rules, register policy, or skill-authoring
  anti-patterns — those stay in this file and `evaluation.md`.

Structure (adapt depth to need):

1. **In plain words** — cognitive on-ramp for the domain action.
2. **Essence** — 3–5 load-bearing functions (not folder names).
3. **Domain vocabulary** — terms the skill's artifacts and gates use.
4. **Optional audience projection** — metaphor or bilingual map, explicitly
   subordinate to domain vocabulary.

Pattern source: archived `reframe` `concepts/<target>.md` workflow; generalized
here for any skill whose form was abstracted from inherited surface layout.

## Register policy

- **Commands:** stable English API names (`model`, `create`, `verify`). One-line
  gloss in the command file is enough; do not alternate slogans in headings.
- **SKILL.md body:** one operational register (match sibling skills such as
  `harness`). Triggers may include non-English phrases in `description` only.
- **Session artifacts:** use the target skill's domain vocabulary consistently.
- **Metaphor:** optional layer; map every term back to domain vocabulary before
  writing gates or verify tables.

## Expression probes (review)

| Failure | Symptom | Correction owner |
|---|---|---|
| Metaphor as canon | Verify gates written in metaphor terms only | skill-engineering `review` → target skill doctrine map |
| Tree-first | Inventory opens with paths, not functions/classes | target skill `model` or equivalent |
| Dual register | Headings mix languages without a declared map | unify SKILL.md; move map to doctrine |
| Dual truth | Process file and host design use different taxonomies | artifact-organization `target`/`gap` or host design adoption |
| Missing on-ramp | Reader sees metaphor before the action | add plain-words block to doctrine |
| Expression in wrong skill | Domain skill teaches P16 or skill-authoring | move meta guidance here; trim domain skill |

## Workflow hooks

- **create** — after expression-team selection, check whether doctrine file is
  needed; if yes, draft concepts before SKILL.md prose.
- **rewrite** — separate inherited **function** from inherited **wording**; regen
  expression through this layer map; do not polish mixed register in place.
- **review** — run expression probes before aesthetic comments.

## Handoff from domain skills

When a domain skill surfaces register inconsistency during
organization or dogfood work, route expression work to `skill-engineering
review` or `rewrite` — do not grow authoring rules inside the domain skill.
