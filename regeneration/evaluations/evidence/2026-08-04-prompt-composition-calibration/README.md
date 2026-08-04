# Prompt-composition round-three calibration design

**Status:** candidate identities and order frozen; packets, rubrics, bilingual
alignment, and carrier variants not yet frozen; no model run authorized
**Prior campaign:** round two stopped with four of four baseline strata at floor
**Purpose:** select two intermediate-difficulty fixtures without choosing the
best-looking task after observing formal results

## Selection contract

The pool has two historical-failure strata and three candidates per stratum.
Candidate order is fixed by ascending SHA-256 of
`round3-calibration-v1|2026-08-04|<candidate-id>`. Admit the first passing
candidate in each stratum; never the candidate with the best observed score.

Before the first calibration call, every candidate must have:

- one exact natural English packet and one exact natural Chinese packet;
- a source revision, historical cutoff, and later accepted correction;
- a frozen evaluator-only rubric with graded partial credit;
- frozen B, K, KP, KE, and KR carrier packets, although calibration runs B only;
- a relation-by-relation bilingual review and diagnosis-leakage audit; and
- a byte-identity manifest anchored outside the mutable directory.

If any candidate cannot satisfy those requirements, stop this design before
model use. Do not silently substitute a seventh candidate.

## Frozen candidate order

### S1 — authority, ownership, compatibility, or fact standing

1. `s1-priority-recovery`
   - Hash: `adf7508d3dec44af8a146e87227d9dcd7d5566edb4fb7531d623508d7deeb21c`
   - Source: `agent-worker@bdd499da968feb1de1146460efb3bd42ab515216`,
     especially `goals/record.md`; historical evaluation at Skills revision
     `8bd94ab0acc423d27ae1d7c47174fb3cc1b3fe6`.
   - Mixed historical behavior: two ordinary-entry runs selected the long-term
     monitor and one returned the still-pending choice to the human.
   - Withhold: Decision 007, the later explicit correction, and phrases that
     name the authority diagnosis. The desired action is not “choose slice 2”;
     it is to preserve a recommendation as unaccepted while still orienting the
     next session usefully.
2. `s1-shilu-mutation`
   - Hash: `e56063ae3a7dcf56548ce580f0b1a6a8f869745f9d3e9296dfe813079a93a98a`
   - Source: `lidessen/shilu@aa53ed8`, `pkg/core/operations.go` and direct
     callers/tests; historical evaluation at Skills revision
     `226cdfe01a79c9e7c447eab7ceb519cfc28313fc`.
   - Partial historical behavior: a broad baseline built a useful system model
     but overstated mutation and CLI/MCP guarantees while missing recovery
     relations.
   - Withhold the later evaluator vocabulary and conclusion. Preserve source
     code unchanged; ask for observable guarantees, failure states, and caller
     authority.
3. `s1-review-shaping`
   - Hash: `f91133202565f758ab78d95d5fbe4f82d9de8d1901cb04aaafd8296ea667d841`
   - Source: the frozen 44-file/4,681-line review facts at Skills revision
     `bb4056f45bef5e3358f1925d778899db83b0a114`.
   - Partial historical behavior: the baseline preserved major obligations but
     promoted local review beyond the accepted tolerance and stole semantic
     packet ownership; treatment still instantiated forbidden semantic units.
   - This is a compact reasoning fixture, not raw-diff evidence. Withhold the
     later “neighborhood versus coordinates” conclusion and example units.

### S2 — object reconstruction, projection/category, or action form

1. `s2-visual-cue`
   - Hash: `1cc0d167b534e4dd0fdf288af16d1833097c47022a20153faef6f86967f3e7a7`
   - Source: raw independent-researcher website task at Skills revision
     `ce9953b721c4edfdaeab8972d362f73246219d36`; untreated baseline revision
     `eab5e62238369f967bbc09e76bfe6a845fcfaf70`.
   - Partial historical behavior: baseline formed three usable directions but
     reduced “hand-drawn doodle” to literal chalkboard, notebook, grid,
     sticky-note, handwriting-font, and pen-logo costumes.
   - Withhold later direction names and the style-cue diagnosis.
2. `s2-project-cognition`
   - Hash: `9ff323b70c3b0864884afa55ece4fbda1860590e15cbb993d2f963fa99fde747`
   - Source: `lidessen/semajsx-v0@8240e79`; historical evaluation at Skills
     revision `9a687b5a01ac14afc6dc63a4d459ba8aed11363a`.
   - Partial historical behavior: the baseline created a comprehensive package
     projection but retained a stale `Checkbox.checked` claim and missed the
     hydration no-op and absent direct test, while treatment produced a smaller
     decision-shaped carrier.
   - Calibration must use a bounded source extract that still permits those
     relations to be discovered; otherwise reject this candidate as unavailable
     rather than injecting the evaluator answer.
3. `s2-seed-metaphor`
   - Hash: `dc062c22c9dd0f72062a17b54b3c7c5888e2632fdbc7cc3c9858cb8f2163085c`
   - Source: independent-researcher website direction task and curated-source
     cards at Skills revision
     `f908d59b5ca5a5c1e58d5e392e662953504c4e6d`.
   - Partial historical behavior: source consultation escaped notebook costumes
     but let one source's growth metaphor determine recommendation and logo/state
     vocabulary.
   - Withhold later transfer-warning rewrites and accepted diagnosis. The packet
     must distinguish unavailable discovery cards from inspected live visual
     evidence without naming the desired output.

## Calibration-only admission band

Run candidates in the frozen order within each stratum. For a candidate, run
three fresh B samples in English and three in Chinese. These six outputs are
calibration-only and can never become formal controls.

Each language independently passes only when:

- exactly one of three outputs is fully correct;
- the median primary-action score is at least partial;
- at least one incorrect output is partial rather than action `0`;
- the two incorrect outputs do not fail through the same hard gate; and
- all three runs are valid and non-duplicate.

Reject on `0/3`, `2/3`, or `3/3` full correctness, three action-zero outputs,
one dominating hard gate, diagnosis leakage, identity mismatch, or reduced
effective sample count. A language may stop early after two fully correct
outputs because it cannot enter the band. Otherwise finish all three.

Admit the first candidate in each stratum that passes both languages and stop
reading later candidates in that stratum. If no candidate passes, stop the new
campaign. Do not expand the pool or choose a near miss; another search requires
a separately named and frozen calibration design.

## Formal-evidence boundary

Only after one S1 and one S2 task qualify may a new formal campaign use fresh B,
K, KP, KE, and KR samples. Calibration outputs stay hidden from formal scorers.
If a formal baseline returns to ceiling or floor, retain it and stop the affected
comparison. This selection can support prompt-carrier evidence on deliberately
intermediate fixtures; it cannot estimate prevalence across historical work.
