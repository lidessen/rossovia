# Evaluation — Kimi K3 Visual Design Distillation

**Status:** matched behavioral comparison completed; portable claim remains bounded
**Model:** `kimi-code/k3`
**Harness:** Kimi Code 0.28.1
**Fixture:** Rossovia site at `d9a93c200bc1f8b3176f86ae985c2f729d1e9039`

## Claim under test

A visual-design skill should increase the reliability of a capable design
agent without replacing its artifact-making loop with compliance prose. For an
implementation request, the skill should preserve content truth, intended
action, accepted relation, and negative boundaries while leaving the current
visual form open to redesign.

## Acceptance observations

A treatment passes the behavioral claim when the agent:

- edits the real implementation rather than stopping at advice;
- inspects at least one representative baseline and revised render;
- changes or explicitly retains a decision because of rendered evidence;
- checks an ordinary downstream surface and all project-wide consumers of a
  changed shared role;
- removes probe-only dependencies or files;
- completes relevant build and link checks; and
- keeps perceptual acceptance with the human.

Neither tool-call count nor visual novelty is an acceptance condition. A
palette-only redesign is acceptable only when rendered evidence shows that the
existing structure and components already express the requested relation.

## Matched treatments

| Variant | Requests | Calls | Media reads | First write | Behavioral result |
|---|---:|---:|---:|---:|---|
| no skill | 64 | 98 | 29 | 210.7 s | complete loop and strong invention; failed the intended restraint at several literal prop-like details |
| original skill | 33 | 58 | 14 | 508.4 s | failed: long preflight, mostly token changes, and incomplete project-wide consumer coverage |
| artifact-loop candidate | 75 | 109 | 29 | 305.9 s | partial: full iteration and consumer coverage recovered, but redesign authority remained too narrow |
| form-authority candidate | 48 | 74 | 17 | 209.4 s | passed the behavioral observations; current form was treated as replaceable, render-led revisions occurred, consumers were covered, and temporary tooling was cleaned |

All four runs used the same task wording except that the final candidate made
the already intended redesign authority explicit. Each run began in a fresh
copy of the same commit. Session exports remain local experiment evidence and
are not checked into the repository because their raw image payloads and model
transcript are large and unnecessary for runtime use.

## Decision-changing observations

1. The original skill did not merely add useful judgment. Its combined context
   changed the task shape from implementation to conformance analysis.
2. Moving rendering earlier restored work volume and iteration but did not by
   itself authorize new form.
3. The smallest successful repair was to separate semantic invariants from
   visual-form authority and stop loading detailed component guidance by
   default.
4. Native Kimi behavior demonstrates that preview repair, screenshot reading,
   revision, and cleanup are already strengths of the execution profile. The
   portable skill should expose and bound those strengths, not restate them as
   a long checklist.
5. The freer run's literal notice, stamp, pin, and texture show why the thin
   negative boundary remains decision-changing.

## Skill changes justified by the comparison

- The core method now asks for a representative render before optional theory
  and says that only decision-changing context should be retrieved.
- Visual contracts and owner/consumer relations may remain working decisions;
  no prose artifact is required before editing.
- An explicit redesign preserves accepted relations, not current composition
  or treatment.
- Component-expression guidance is conditional on a component-centered
  contradiction rather than ordinary interface work.
- The design command uses a representative-fragment render loop, searches the
  whole project for shared consumers, cleans temporary probes, and returns a
  compact account.

## What this does not prove

The comparison does not isolate K3 weights from Kimi Code's system prompt,
tools, image reader, or prior training. It does not show that the final visual
treatment is beautiful, nor that fewer instructions improve every model. It
does show, on this fixture, that the original project skill suppressed an
observable implementation capability and that the smaller form-authority
repair restored it without copying a fixed style.

Repeat on a held-out product surface and at least one conservative Flash-class
model before claiming cross-model generality. Reopen immediately if the next
redesign again degenerates into preflight prose, palette-only work without
evidence, unbounded visual costume, or incomplete consumer coverage.

## Human outcome

The Principal accepted the current site revision as a preferable, fit-for-use
release after observing greater implementation detail and no explicit wrong
reading. They could not reliably certify the intended subtle atmosphere as an
abstract label. This is evidence for the artifact decision and for a simpler
human acceptance surface; it is not evidence that the metaphor was precisely
realized or that the treatment should become a reusable style.
