# Decision 022 — Project-first deliberation interaction

**Status:** proposed implementation decision

## Context

The initial bounded-deliberation adapter was truthful at the runtime boundary,
but it made the person or initiating agent construct three to five full
`CellInput` objects, an all-P-ID coverage map, absolute workspace scopes, and
an output location before it could ask one project decision. That duplicated
runtime detail at the decision surface, enlarged the prompt/workspace available
to every member, and obscured whether the cost boundary had been inspected
before a provider call.

The first founding-priority pilot made the gap observable: it produced no
structured positions, exceeded its allocation in the later retained run, and
overwrote the first invocation record at a fixed output path. The retained
[observation](../../chronicle/records/2026/07/obs-20260711-deliberation-docket-usability-budget-failure.json)
establishes the failure and its limits; it does not estimate the revised form.

The governing constraints already distinguish a temporary team from authority
([bounded adaptive organization](012-bounded-adaptive-organization.md)), retain
human initiation and commitment boundaries ([formal operations](015-human-initiated-formal-operations.md)),
and require a minimum carrier that lets the next action occur without creating a
second doctrine. The action gap is a repeated project-runtime interaction, not
a missing universal agent method. Therefore it is an adapter and CLI repair,
not a new skill.

## Decision

Keep `deliberate <manifest.json>` as the exact, portable adapter interface.
Add `deliberate-probe` as the project-facing lowering path:

1. Accept only the decision-relevant inputs: question; two to four options;
   three to five distinct P-ID seats; one to eight project-relative evidence
   paths; a named human allocation and source; and per-member cap.
2. Discover the host Sequence, validate selected seats and the declared
   allocation, then create one UUID-bearing ignored invocation directory.
3. Copy only the Sequence and interpretations, and build a bounded evidence
   packet. Each source is identified by locator and SHA-256; the packet declares
   its excerpt limits and never calls incomplete excerpts complete evidence.
4. Lower the request into the unchanged deliberation manifest. Member workspaces
   expose only `docket/` and `principles/`, with neither write paths nor command
   authority. The prompt instructs a member to name a material omission rather
   than search outside the packet.
5. Default to preparation and inspection. A model call requires explicit
   `--execute` after the generated manifest, evidence boundary, and allocation
   are visible. This confirms no new authority; it simply makes cost-bearing
   execution an intentional second action.
6. Retain every direct-manifest result with a UUID output name. During a run,
   start no later member whose declared cap cannot fit the observed remaining
   allocation; retain that member as `not_run_budget_envelope`. Surface actual
   overshoot as evidence rather than retrying or expanding the envelope.

The generic Work Cell remains unchanged except for its generic structured result
carrier. It does not acquire P-ID, vote, docket, consensus, organization, or
budget-approval vocabulary.

## AX argument and boundary

An initiating agent should spend its context on the judgment at hand, not on
reconstructing execution plumbing. The concise command is a **translation
surface**, not a hidden policy engine: all non-inferable choices remain explicit
(options, seats, sources, allocation source, caps); derived details become an
inspectable manifest. The member sees less context, but enough context to make
its bounded judgment: selected role, Sequence source, bounded evidence, output
schema, and explicit non-authority.

This is deliberately not a SKILL.md. Its trigger is a concrete runtime action,
its output is a generated manifest/evidence packet, and its policy belongs to
the deliberation adapter. A skill would add another activation/context layer
without removing the construction burden. It may be reconsidered only if
evidence shows the same decision method must coordinate several independent
runtimes rather than this CLI lowering path.

## Principle expression

- **P02 — Seek truth from facts:** the prepared docket begins from declared
  options, source locations, and allocation instead of an implicit provider
  action.
- **P08 — Falsifiability:** source locators, digests, and excerpt caps let a
  later reader test what a member could actually have known.
- **P09 — Attention layering:** a narrow packet is a deliberate operating
  environment, not merely token optimization.
- **P10 — Finite human bandwidth:** the concise command and inspect-before-run
  step keep the Principal review surface within a real decision budget.
- **P11 — Separate decision and execution authority:** positions remain
  evidence; preparation and execution do not grant acceptance or budget
  authority.
- **P12 — Externalized memory and intergenerational inheritance:** the packet,
  exact manifest, and raw record preserve a reconstructible handoff.
- **P13 — Claims are not facts:** an excerpt is labeled as bounded evidence and
  a material omission is reported instead of silently assumed away.
- **P14 — Rebuildable projections do not own factual authority:** generated
  manifests and tallies remain derivatives of a human docket and retained raw
  record.
- **P15 — Minimum valid transition:** use an adapter rather than a new skill or
  generalized governance runtime.
- **P16 — Form must enable practical action:** test the interaction through an
  executable lowering and boundary probes, not document polish.

## Acceptance and verification

The implementation is ready for integration review when deterministic checks
show all of the following:

- concise project input lowers into a unique ignored packet directory and exact
  manifest without a broad project workspace;
- a member receives only `docket/` and `principles/`, and a capped source tail
  cannot reach its packet;
- incomplete evidence is stated as incomplete in both packet and member prompt;
- direct invocations use distinct raw-record names;
- observed use prevents starting a later member without a complete remaining
  cap, while post-call overshoot remains visible;
- tally/dissent still have no authority to choose an option, accept a proposal,
  release a budget, or merge work.

A real revised pilot is intentionally **not** run under the exhausted founding
allocation. Its behavior and relative cost remain unproven until the Principal
authorizes a new envelope and inspects a prepared docket.

## Reconsideration

Reopen this decision if repeated prepared dockets still require agents to
reconstruct non-decision runtime fields, if packet caps remove material context
without making the omission visible, or if a second independent runtime needs
the same project-facing method. The first calls for another adapter correction;
the last may justify a reusable skill or shared contract after a form review.
