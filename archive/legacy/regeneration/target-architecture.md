# Target Skill Architecture — Proposal

**Status:** proposed; no existing skill is retired, merged, or rewritten by
this document.
**Selection basis:** `skill-inventory.md`, `workspace-skill-inventory.md`, and
`function-map.md`.

## Shape

The collection has one semantic root and three downstream kinds of expression:

```text
Sequence (one-line principles)
        │
Interpretations (source-bound shared readings)
        │
principle-cultivation (maintains the root and its derivatives)
        │
 ┌──────┼───────────────────────┐
 │      │                       │
Core method skills        Domain expressions        Project adapters
cross-context judgments  specific practice fields  host/tool operations
```

Only a core method skill must prove a repeatable cross-context decision gate.
Domain expressions can be generated when a practice field has enough evidence;
project adapters may use the same principles without being treated as doctrine.

## Core method candidates

| Candidate | Owns this decision gate | Proposed lineage | Current source material | Proposed disposition |
|---|---|---|---|---|
| `principle-cultivation` | Does recurring evidence justify preserving, revising, or rejecting a sequence principle? | Primary P03; P04/P12/P15 support | Existing dogfood skill and committee records. | **Retain unchanged for this regeneration.** |
| `goal-driven` | Is a long-running effort still directed by a live contradiction, criteria, and learning record? | Primary P04; P03/P15 support | Current `goal-driven`; Moniro `engineering`; attention work. | **Regenerate as strategy.** Remove fixed-stack claims and isolate only durable strategic artifacts. |
| `reframe` | Does an inherited category conceal the function needed for a new concrete form? | Primary P07; P06/P04 support | Current `reframe`; article refactor; current corpus regeneration. | **Regenerate as conceptual reconstitution.** It expresses adopted P07 through concrete–abstract–concrete movement. |
| `design-driven` | What durable system relation or boundary must implementation preserve? | Primary P06; P04/P15 support | Current `design-driven`; Moniro `engineering` and `housekeeping`. | **Regenerate as architecture.** Keep design truth and proposal discipline, remove inherited layer-stack doctrine. |
| `harness` | What context must be made durable, layered, and available for an agent to act coherently in its actual runtime? | Primary P09; P10/P12/P08 support | Current `harness`; Moniro `orientation` and `memory`; standalone forward probe. | **Second adopted regeneration slice.** Map runtime capability, then layer and verify durable context; treat orientation and memory as distinct modes unless later tests show one must be independent. |
| `skill-engineering` | Does an observed agent-action gap require a reusable, testable skill expression, and what is the minimum valid one? | Primary P16; P09/P08/P15 support | Moniro `authoring-skills` and `prompt-lab`; current harness; principle-cultivation. | **First adopted regeneration slice.** Forms a target-specific expression team; does not change the Sequence. |
| `investigate` | What is actually true enough to guide a decision, and what remains unknown? | Primary P02; P06/P08 support | Moniro `dive`, `orientation`, risk discovery in E2E work. | **New candidate expression.** It must prove a distinct read-only inquiry gate rather than duplicate verification. |
| `verify-change` | Has a change satisfied its behavioral acceptance conditions with current evidence? | Primary P08; P02/P03/P13 support | Current `evidence-driven`; Moniro `validation`; E2E and AgentParty verification. | **Regenerate from `evidence-driven`, broadened only by evidence.** Keep the acceptance gate distinct from investigation. |
| `reviewable-change` | Can a bounded human reviewer understand the change, verify it, and see its risk? | Primary P10; P16/P08 support | Moniro `refining`; change verification practices. | **Incubate.** It may be a mode of `verify-change`, not a skill, unless review outcomes show a distinct repeated gate. |

## Domain-expression candidates

| Candidate | Field-specific decision | Proposed lineage | Proposed disposition |
|---|---|---|---|
| `argument-writing` | Which concrete form lets a given audience follow, assess, and act on an argument? | Primary P16; P04/P05/P07 support | **Merge candidate:** technical article construction and source-based article refactoring become two modes. Do not carry over the two skill names by default. |
| `voice-calibration` | Which stable user preferences should shape an otherwise suitable writing expression? | Primary P05; P09/P12/P16 support | **Incubate separately.** Keep it outside the core until construct validity and downstream value are demonstrated. |
| Instruction experiments | Do agent instructions actually change behavior under ordinary, long-context, and adversarial conditions? | P08 as a selected expression | **Start as a command/reference of `skill-engineering`.** It may later earn a separate boundary only through repeated distinct demand. |

## Project-adapter candidates

| Candidate | Truthful home | Why it is not a core method skill |
|---|---|---|
| `setup-lidessen-skills` | Collection distribution and host integration | It writes a particular collection's projection into particular agent files. It should remain downstream of the sequence and architecture, not define either. |
| Delegation and runtime operation | `agent-worker`, Sikong, AgentParty, or host project | Durable WorkItems, backends, CLI commands, sessions, channels, and models are product mechanics. The reusable separation of decision and execution is already expressible through P11/P13. |
| Deployment, setup, repair, and toolchain guides | Owning project docs or product-specific skills | Vercel, proxy repair, macOS setup, frontend initialization, and task-list instructions have environment-bound triggers and authority. |

## Explicit non-decisions

- `attention-driven` is not restored as a mandatory entrypoint, dispatcher, or
  prerequisite. Its valuable observations become expression probes for P09,
  P10, P11, P13, and P15 where the relevant contradiction is live.
- The current nine rewrite-corpus skills are not automatically preserved because
  they exist today. In particular, article-writing skills may merge, and the
  collection installer may leave the method-skill tier.
- This target architecture changes no further sequence entry. P07 has been
  adopted as a revision and its interpretation is updated accordingly.

## Human choices required before regeneration

1. P07 has been adopted; accept this three-kind shape and the proposed core
   method set.
2. For each incubating row, choose **independent skill**, **mode/reference of
   an existing skill**, or **defer pending more evidence**.
3. Confirm the writing merge direction before any existing writing skill is
   replaced.
