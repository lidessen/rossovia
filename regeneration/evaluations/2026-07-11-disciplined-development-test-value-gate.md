# Disciplined Development — Test-value gate evaluation

**Status:** self-evaluated repair; independent agent attribution unproven
**Date:** 2026-07-11

## Claim

The revised [disciplined-development](../../skills/disciplined-development/SKILL.md)
helps an agent choose the smallest test that can change a development decision,
instead of treating unit-test or assertion count as evidence of quality.

## Expression team

- **Primary P15:** keep only the verification surface needed to preserve the
  current hard constraint.
- **P02:** start test selection from the actual behavior and failure history.
- **P08:** name an observation capable of disproving the claimed behavior.
- **P05:** choose unit, integration, or live evidence from this system's actual
  boundary rather than applying a universal testing pattern.

The existing skill already owns this everyday development action. No new testing
skill, standing test council, coverage target, or mandatory plan is introduced.

## Action probe

**Task:** repair the discovered direct-deliberation retention failure without
adding decorative unit checks.

**Expected disconfirming observation:** two direct invocations still write one
fixed path, or the test only compares generated IDs while the first file can
still be lost.

**Observed action:**

- [`persistDeliberationRecord`](../../packages/work-cell/src/deliberation.ts)
  now writes each direct invocation to a run-ID-bearing path.
- The regression scenario in
  [`deliberation.test.ts`](../../packages/work-cell/test/deliberation.test.ts)
  executes two independent deterministic member runs, persists both adjacent to
  the same manifest, reopens both files, and verifies each preserves its own
  raw run ID.
- The prior timestamp-presence assertions were removed because they could not
  expose the observed overwrite defect.

**Observed result:** `bun run typecheck && bun test` passed with 28 tests. The
test would fail if the output path regressed to the prior fixed name.

**Verdict:** supported for this deterministic retention contract.

## Boundary probe

**Task:** claim that the compact evidence packet improves agent deliberation
quality or token cost.

**Expected disconfirming observation:** a deterministic packet/manifest test is
presented as proof of a model's strategic judgment or cost reduction.

**Observed route:** the project-packet test proves only containment, omitted-tail
exclusion, and prompt/record construction. Decision 022 states that a revised
live pilot requires a newly authorized envelope and that behavior/cost remains
unproven.

**Verdict:** supported as a boundary; live behavior is intentionally not claimed.

## Context probe

**Task:** add an ordinary helper assertion for every visible field in the Work
Cell record.

**Expected disconfirming observation:** the method demands a separate test plan,
coverage metric, or broad testing framework before routine work.

**Observed route:** the skill adds one local selection gate and routes evidence
by claim: contract/branch, integration, or live evaluation. It leaves task
ownership and verification authority unchanged.

**Verdict:** supported by the compact instruction surface; fresh-agent
comparison is still required to attribute behavioral improvement independently.
