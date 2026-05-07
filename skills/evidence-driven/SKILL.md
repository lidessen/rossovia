---
name: evidence-driven
description: |
  Evidence-driven methodology for the execution layer — every claim of
  progress requires a falsifiable observation supporting it. State
  updates, Verify checks, test runs, and any "this is done" assertion
  must carry concrete evidence; "looks right to me" is rejected.
  
  Use this skill when working on production code, regression-prone
  systems, or any task where build-time discipline materially affects
  outcome quality. Trigger on phrases like "set up TDD", "build
  discipline", "no progress without evidence", "test-first",
  "verify rigorously", "production code workflow".

  Do NOT trigger for prototypes, exploratory spikes, throwaway scripts,
  documentation-only changes, or work where the cost of a discipline
  overlay outweighs the cost of occasional bugs.

  Pairs with design-driven. Design-driven defines what to verify (the
  blueprint's Verify section); evidence-driven defines how to verify
  with discipline (TDD cycle, falsifiability, evidence collection).
  Each works alone — they cross-reference but do not depend on each
  other.

  Supports arguments: `/evidence-driven init` to wire up agent configs
  and optional pre-commit hooks; `/evidence-driven audit` to review
  recent blueprints for evidence quality.
argument-hint: "[init | audit]"
---

# Evidence-Driven

A discipline overlay for the execution layer. Where goal-driven owns
*why* and design-driven owns *what shape*, evidence-driven owns *prove
it works*.

The thesis is one line: **no progress claim survives without falsifiable
evidence**. Every State update, every Verify check-off, every "this is
done" must carry an observation that could in principle have shown the
opposite. A test that can't fail isn't evidence; a checklist run with no
captured output isn't evidence; "I tried it and it seemed fine" isn't
evidence.

## Position in the layered stack

```
strategy:        goal-driven       (why; success criteria; when to STOP)
architecture:    design-driven     (what shape; module boundaries; mechanisms)
execution:       evidence-driven   (prove it works; falsifiability; rigor)
task tracking:   external          (issue tracker / TODO — operational layer)
```

The three methodology layers are concurrent, not sequential. Information
flows in both directions: build observations feed back to design (shape
proposal), design adoptions feed back to goal (criterion check), and so
on. Evidence-driven is the discipline that makes those upstream signals
trustworthy — without it, every claim "the code works" is unfalsifiable
and the whole feedback loop breaks down.

## Commands

When invoked with an argument, dispatch to the corresponding file:

- `/evidence-driven init` → Read and follow `commands/init.md`.
  One-time scaffolding: agent config snippet, optional pre-commit hooks,
  optional CI integration notes. No artifacts of its own.
- `/evidence-driven audit` → Read and follow `commands/audit.md`.
  Periodic review of recent blueprints for evidence quality: naked
  Verify check-offs, hollow State entries, cargo-culted tests, missing
  observation traces.
- No argument → continue with the methodology below.

**Which command when:**

- Adopting evidence-driven on a project for the first time → `init`
- Recurring failures from "tests passed but bug shipped" or "State said
  done but I can't tell what changed" → `audit`
- Mid-task, building → no argument (the discipline applies to your
  current work via the principles below)

## When to use this skill

**Good fit:**
- Production code paths with real users
- Regression-prone systems (large refactors, cross-cutting changes)
- Anything where an undetected bug has material cost (data loss,
  user-visible failures, security)
- Work that other agents or future-you will need to verify months later
  without context

**Bad fit:**
- Prototypes meant to be thrown away
- Exploratory spikes where the question is "is this approach viable"
  rather than "does this work correctly"
- One-off scripts that run once and are deleted
- Documentation-only changes (the discipline applies to behavior, not
  prose)
- Domains where the cost of test infrastructure exceeds the cost of
  occasional bugs (highly experimental research code, rapid prototyping
  contexts)

If you find yourself contorting work to fit the discipline, the work
isn't a fit. Use a lighter approach and accept the tradeoff explicitly.

## The four principles

### 1. Falsifiability is non-negotiable

Every Verify check-off needs an observation that could have failed. A
test that passes regardless of the code under test is theater; a
checklist item that's marked `✓` without a capture of what was checked
is theater; "looks right to me" is theater.

Concrete falsifiability questions to ask before claiming done:
- **Could this evidence have shown the opposite?** If no, it's not
  evidence.
- **What input would make this test fail?** If you can't name one
  realistic case, the test isn't catching anything.
- **If the implementation were silently wrong tomorrow, would this
  check catch it?** If no, the check is decorative.

This principle is upstream of TDD specifically. TDD is one practical
way to ensure falsifiability (you literally see the test fail before
making it pass). But other forms can also satisfy the principle: a
contract trace that demonstrates an end-to-end flow, a manual checklist
where each item captures actual observed output, a known-good
comparison. The form is flexible; the falsifiability isn't.

### 2. TDD as the default for code that can be unit-tested

When the work is code with deterministic inputs and outputs (most
backend logic, pure functions, well-defined APIs), TDD is the
strongest form of falsifiability:

1. Write a test that demonstrates the change you're about to make.
2. Run it. Confirm it fails — and fails *for the right reason*. (A
   test that fails because of a syntax error in the test isn't proving
   anything.)
3. Write the minimal code to make it pass.
4. Refactor with the test as a safety net.

Why TDD specifically: writing the test first forces you to think about
the contract before the implementation. You can't write a test for a
behavior you can't articulate, so vague work surfaces immediately.

When TDD doesn't fit:
- UI work where the verification is "does it look right" (use snapshot
  tests + visual review, with the visual review captured)
- Glue / integration code where mocking everything makes the test
  meaningless (use integration paths with capture)
- Throwaway exploration (skip the discipline; you're not in this
  skill's territory)
- Anything where setting up the test costs more than the bug it
  catches (judgment call; document the tradeoff)

The point of TDD is the falsifiability + design pressure it produces,
not the ritual. If a different form gives you the same effect, use it.

### 3. State updates are evidence trail, not progress meter

Design-driven says: update State on every TODO check-off. Evidence-
driven adds: **what you write in State must be specific enough to be
falsifiable later**.

Anti-pattern (hollow State):
```
## State
- TODO 1 done
- TODO 2 done
- Working on TODO 3
```

This tells the next agent (or future-you) nothing. "Done" how? What
changed? What's now true that wasn't before? An out-of-date hollow
State is worse than no State.

Pattern (evidence-trail State):
```
## State
- TODO 1 done — added `limit: number` parameter to `query()` in
  store.ts:42; existing callers default to no limit (passes existing
  test suite, 14/14 pass)
- TODO 2 done — wired handler at routes.ts:88 calls `query({limit})`;
  manual test with curl showed expected JSON
- Working on TODO 3 — adding integration test that exercises limit=5
```

This is auditable: the next agent can re-run those checks, find the
exact code locations, and verify each claim. State becomes evidence,
not just progress signaling.

### 4. Anti-cargo-cult: the "would this have caught X" check

Tests can be written that pass but catch nothing. Common patterns:
- Asserting on the *act* of calling something rather than its effect
  (mocked-out test that confirms the mock was called)
- Coverage-driven tests that exercise code without checking results
- Tests that pass even after deleting the code under test

The check: **before claiming a test as evidence, articulate what
specific failure it catches.** "This test catches the case where
`limit=0` returns everything instead of nothing." If you can't name
the specific failure, the test isn't doing the work.

Same principle for non-test evidence: every checklist item, every
manual capture, every trace should be tied to a specific risk it
addresses. Generic "ran it and it worked" entries don't qualify.

## With design-driven

Evidence-driven assumes design-driven's blueprint structure exists. The
blueprint's `Verify` section defines *what to check*; evidence-driven
defines *how to check rigorously*.

Concrete division of labor:

| Concern | Lives in |
|---|---|
| Blueprint format (TODO, State, Verify, Follow-ups sections) | design-driven |
| "Verify needs falsifiable check" baseline rule | design-driven |
| State update on every TODO check-off baseline rule | design-driven |
| TDD cycle, evidence anti-patterns, cargo-cult guards | evidence-driven |
| State entry quality (specific, auditable, not hollow) | evidence-driven |
| What counts as "real" falsifiable evidence | evidence-driven |
| Pre-commit hooks / CI integration patterns | evidence-driven |

Pattern: design-driven says "here's the artifact and the baseline
rules"; evidence-driven says "here's how the rules become real
discipline under pressure."

When design-driven isn't installed: evidence-driven still works as a
discipline you bring to whatever task structure exists (Linear ticket,
GitHub issue, a markdown checklist). The principles don't depend on
blueprint format.

## With goal-driven

Indirect — through design-driven. Evidence-driven doesn't read
`goals/GOAL.md` and doesn't write to `goals/record*`. Its loop is the
build/verify cycle, which lives below the strategic layer.

But: evidence-driven's discipline makes the upward feedback loop
trustworthy. When build observations should trigger a design proposal
or a goal STOP, those observations are only credible if they have
evidence behind them. A "naked" State claim ("this approach isn't
working") propagates much less reliably than an evidenced one ("approach
X measured P95 720ms across three storage backends; below is the
trace").

So while there's no direct cross-reference, evidence-driven raises the
signal-to-noise ratio of the cross-skill feedback channels.

## When to skip

- Prototypes / spikes where the question is viability, not correctness
- Throwaway code that won't survive the week
- Documentation-only PRs
- Highly experimental research where rigid discipline kills iteration
- Solo work on personal projects where you accept the tradeoff
  explicitly

The discipline has a real cost. Don't apply it where the cost exceeds
the value, and don't apologize for skipping it in those cases. Use the
right tool for the job.

## A test of the principle

Before you claim a piece of work is done, ask:

> If a future agent — or future-you, six months later — reads only
> what I've written, can they tell whether this *actually* works?

If the answer is "they'd have to take my word for it", the discipline
hasn't been applied. Either add evidence, or admit the work isn't done
yet.

This question is the heart of the skill. Everything else is a way of
making that question easy to answer "yes".
