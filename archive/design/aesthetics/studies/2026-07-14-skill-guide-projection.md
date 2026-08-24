# Aesthetic Study — Skill Guide Projection

**Status:** shared shell accepted; guide projection under second-context probe
**Practice source:** [Aesthetic Practice Pilot](../README.md)
**Case:** [Project Site Pilot](../cases/2026-07-14-project-site-pilot.md)
**Form decision:** [Project Site as UI Method Pilot](../../decisions/028-project-site-ui-method-pilot.md)

## Object, audience, and action

The object is the path from the generated skill catalog to the public
`context-engineering` detail page and then to its owning `SKILL.md`. A
technically capable human reader should be able to decide what judgment the
skill owns, how it works, when it is complete, and whether to inspect or install
the source without first learning how an agent prompt is structured.

## Observed baseline failure

The Principal found the home page satisfactory but the pages reached after it
visually rough. Inspection showed that the two surfaces had different
production chains: the home page had a deliberate editorial hierarchy, while
the detail page was a nearly direct Markdown rendering of an agent-executable
prompt with only token-level Starlight theming. The generated page also repeated
the title because the source heading survived below Starlight's page heading.

This was not only a CSS gap. The projection preserved source wording but also
preserved a form optimized for Agent activation rather than human orientation.
Source fidelity was therefore being confused with presentation identity.

## First intervention

One manifest-declared `skill-guide` presentation now:

- extracts required sections from the owning `SKILL.md` during the existing
  build projection;
- reorders scope, principle lineage, method, operating entry, boundaries, and
  completion for a human reading sequence;
- labels itself as an incomplete human projection and links to the complete
  version-pinned source;
- changes the catalog action from `阅读投影` to `阅读指南`; and
- activates one scoped editorial visual grammar through Starlight's existing
  hero state, leaving all other documentation pages unchanged.

The build fails if a required source section disappears. No copied skill facts,
new route, generic UI skill, component library, image asset, or second content
source was introduced.

## Principal correction and shell intervention

The Principal rejected the first preview as an incomplete visual system. A
same-viewport comparison confirmed that the page-scoped treatment had produced
an editorial island inside Starlight's dark default shell: home, catalog, and
guide used different backgrounds, headers, navigation identities, grids, and
control treatments. More guide-specific styling could not resolve that break.

The second intervention therefore leaves the guide's information projection in
place and moves visual continuity to the shared shell:

- one checked-in token source now supplies paper, ink, accent, line, grid, and
  type choices to both the home page and Starlight;
- the home page and documentation reuse the same wordmark and primary
  navigation components;
- documentation uses the accepted light paper direction while retaining search,
  sidebar, table of contents, and mobile menu as a subordinate tool layer; and
- catalog and guide keep different page archetypes without acquiring separate
  product identities.

This is still a site-local correction, not a reusable UI method or promoted
aesthetic direction.

## Principal review

The Principal accepted the second preview's visual continuity: the home page,
catalog, and guide now read as one style system. This settles the shared-shell
hypothesis for the current site, not the portability of its treatment.

The follow-up correction is a hard boundary for any reusable skill: the Skills
site's warm paper, red-black palette, editorial grid, typography, and component
treatment must not become a fixed style. A portable method must regenerate its
direction from each object's audience, intended action, inherited identity, and
material conditions. The stable lesson is shared identity with differentiated
page archetypes; the visible treatment remains case-local.

## Mechanical observation

The Astro type check and static build pass, local links and fragments resolve,
the guide renders one page title, and the full prompt-only `Principle source`
section is absent from the human projection while its source remains directly
reachable. A 1440 × 1000 comparison and 390 × 844 mobile probe show the shared
identity layer on home, catalog, and guide; the mobile pages have no horizontal
overflow, framework overlay, or browser-reported page error. These observations
establish projection containment and structural validity, not aesthetic
success.

## Human review and disconfirming observation

Review the catalog-to-guide-to-source path rather than the page as an isolated
mockup:

1. Can a reader identify the skill's one judgment and next useful action before
   reading the full prompt?
2. Does the detail page visibly belong to the same common workshop as the home
   page while remaining calm enough for sustained reading?
3. Does the source boundary feel trustworthy rather than defensive or noisy?
4. Which hierarchy or treatment is merely decorative?

Reject propagation if the page still feels like a themed raw prompt, if the
reordering hides information needed for selecting the skill, or if the editorial
treatment makes long-form reading harder. Human rejection is valid and no
direction is promoted from the implementation alone.

## Next disposition

The shared shell is accepted for this site. Apply the guide projection to the
structurally different `visual-design` skill and scope its styling to an
explicit presentation type before considering the projection reusable. Keep
the site's tokens and component treatment local regardless of that result.

That second-context projection now builds from the new skill without changing
its source structure. The explicit `skill-guide` marker activates the method
page treatment; a normal documentation page receives no marker or method label.
Desktop and 390px browser probes show meaningful content and no horizontal
overflow or framework error overlay. This supports the projection form across
two different skills. It does not promote the site's visual treatment beyond
this site's accepted shared shell.
