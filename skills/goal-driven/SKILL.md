---
name: goal-driven
description: |
  Goal-driven methodology for initiatives where the destination is clearer
  than the path. GOAL.md is the stable compass — north star plus falsifiable
  success criteria. The journal is the living record of what was tried, what
  was observed, and whether each criterion is still served. The agent writes
  both files; the human approves edits via chat.

  Use this skill for multi-week initiatives where upfront design is the
  wrong tool: research, exploratory features, personal quarterly planning,
  learning projects, writing a book or article series, job search. Trigger
  on phrases like "set a goal", "track my progress on X", "manage my
  quarterly work", "this is exploratory", "I know the goal but not the
  path", "plan my Q2", or when starting a months-long initiative without a
  clear technical shape.

  Do NOT trigger for single-task work, bug fixes, week-long features with
  a clear plan, or anything where a TODO list suffices — this skill is
  overkill for those, and the protocol's overhead outweighs its value.

  Pairs with design-driven. Goal-driven manages why and how-far;
  design-driven manages what-shape. Use both when a project is uncertain on
  direction AND structure. Each works alone — they cross-reference but do
  not depend on each other.

  Supports arguments: `/goal-driven init` to create empty goals/
  scaffolding, `/goal-driven bootstrap` to interview-drive an initial
  GOAL.md, `/goal-driven audit` to run periodic maintenance on the journal
  and STOPs.
argument-hint: "[init | bootstrap | audit]"
---

# Goal-Driven

A mini methodology for initiatives where the destination is fixed but the
path isn't. Human owns the compass; agent walks the path and keeps the log.

GOAL.md is the institutional memory of *why*. The journal is the
institutional memory of *what was tried*. Together they let a fresh agent —
or future-you — pick up a months-long initiative without losing direction.

## Commands

When invoked with an argument, dispatch to the corresponding file:

- `/goal-driven init` → Read and follow `commands/init.md`.
  One-time scaffolding: create `goals/` directory, empty stub files,
  optional hook. Does not write GOAL.md content.
- `/goal-driven bootstrap` → Read and follow `commands/bootstrap.md`.
  Interview the human and produce the initial GOAL.md. Idempotently handles
  scaffolding if `init` wasn't run first.
- `/goal-driven audit` → Read and follow `commands/audit.md`.
  Periodic maintenance: check OPEN-STOPS sync, scan stale criteria, find
  "naked ✓" entries without evidence, propose month rotation if missed.
- No argument → continue with the methodology below (the normal loop).

**Which command when:**

- New initiative, no `goals/` yet → `bootstrap` (does init plumbing too)
- Want plumbing without committing to content yet → `init`
- ≥ 2 weeks since last audit, or journal feels overgrown → `audit`
- Mid-task, just logging progress → no argument (normal loop)

## When to use this skill (and when not)

**Good fit:**
- Multi-week or longer; ≥ 3 uncertain decision points likely
- The path is genuinely unclear — you'd rewrite a detailed plan in 2 weeks
- Success criteria can be stated, even if some are observable proxies

**Bad fit:**
- One-off scripts, bug fixes, week-long features with a clear plan → use a
  TODO list
- Pure execution where the path is known and only the doing remains → use
  design-driven blueprints
- Goals you can't articulate at all → spend an hour writing first; come
  back

## Directory structure

```
project/
└── goals/
    ├── GOAL.md                  ← Stable compass (north star, criteria, invariants)
    ├── OPEN-STOPS.md            ← Index of unresolved STOP signals
    ├── journal-2026-04.md       ← Past month
    └── journal-2026-05.md       ← Current month (auto-rotates monthly)
```

Two stable files (GOAL.md, OPEN-STOPS.md) plus monthly journals. No
`archive/` directory by default — old months stay in place. If `goals/`
becomes crowded after a year, move them under `goals/journal-archive/`
manually; the convention is informal.

## The compass / path asymmetry

GOAL.md is the compass. It changes rarely, by deliberate human decision.
The path is everything else: what you're trying this week, what you tried
last week, what worked, what didn't.

The path mutates constantly. The compass mutates only when:

- A success criterion turns out to be the wrong measure (replace it)
- The north star itself is questioned by new evidence (rethink it)

Both are deliberate, human-approved events. They are NOT what happens when
"I tried X and it didn't work, let me try Y" — that's just walking.

This asymmetry is the whole point. If GOAL.md and the journal change at the
same rate, you don't have a compass; you have a notebook.

## Permission gradient

| File | Who writes | When | Human's role |
|---|---|---|---|
| `GOAL.md` | agent | Only at bootstrap or explicit GOAL change | Approves each section, line by line |
| `journal-YYYY-MM.md` | agent | End of session, or on STOP / rotation | Reviews entry draft in chat before write |
| `OPEN-STOPS.md` | agent | When a STOP is created or resolved | Confirms the line in chat |
| STOP signals | agent surfaces | When trigger condition hit | Decides: change path / change goal / agent misjudged |

**Never let the agent silently edit GOAL.md.** Every change must be echoed
in chat first. Even adding a single criterion is a deliberate event.

The agent is not a passive scribe — it drafts, proposes, surfaces. The
human is not a writer — they approve, redirect, decide. This asymmetry
prevents two failure modes at once: human laziness ("I'll write the goal
later") and agent drift (silent rewording into something subtly different).

## The three-moment protocol

The agent's default behavior — drafting, exploring, summarizing — is
usually fine. But three moments bias toward silent drift if left to
defaults: when first articulating the goal (premature commitment to fuzzy
wording), when ending a work session (forgetting what just happened and
why it matters to the criteria), and when evidence threatens the goal
(rationalizing past inconvenient signals to keep moving). The protocol
intervenes at exactly those moments. Outside them, normal work.

### Moment 1 — Bootstrap (creating GOAL.md)

The agent interviews the human via chat. It does **not** draft GOAL.md
alone and present it for review. It asks, in order:

1. **North star** — "In one or two sentences, what should be true when
   this is done?"
2. **Success criteria** — for each thing implied: "How would you know
   that's achieved?" Push for falsifiable; if soft, push for a proxy
   indicator.
3. **Invariants** — "What must stay true regardless of how we get there?"
4. **Non-goals** — "What's tempting to call success but isn't?"

The agent **echoes each section back as it's drafted**, gets confirmation,
moves on. GOAL.md is written only after all sections are confirmed. See
`commands/bootstrap.md` for the full interview script.

### Moment 2 — End of every work session

Before the session ends, the agent drafts a journal entry **in the chat**:

```
Entry draft:
- What I did: ...
- Observations: ...
- Criteria check:
    C1 ✓ (cite specific evidence)
    C2 ✗ (cite specific evidence)
    C3 unclear (no observation this session)
- Judgment: path-level / goal-level / no change
Confirm and append?
```

The human confirms or edits in chat. Only then does the agent append to
the current month's journal.

**The criteria check is the heart of the discipline.** Each ✓/✗ must cite
a concrete observation from the session. `C1 ✓` without evidence is
forbidden — it must be `C1 ✓ (ran 30 queries, recall 76%)` or
`C1 unclear (no test this session)`. Bare verdicts hide drift.

**Verdicts include time.** Some criteria are met or not at the moment
they're checked (latency under 500ms either is or isn't true today).
Others accumulate toward a deadline ("200 paid subscribers by Sep 30"),
and in the run-up they're neither met nor failed — they're on a
trajectory. Judge them by trajectory: one plainly on pace is
`✓ (on pace: <evidence>)`; one whose trajectory has visibly diverged is
`✗ (off pace: <observation> projects <gap>)`. The evidence rule still
applies — "on pace" needs an observation, not optimism. This is the same
verdict vocabulary, used with awareness that what counts as "served"
depends on when the criterion is supposed to land.

**Identify the principal tension.** Attention is finite. At any moment
one tension dominates — the one whose resolution would most unblock the
rest. Name it in the judgment ("this week the binding constraint is C1
pace; C2 stable; C3 not under pressure") rather than treating all
criteria symmetrically; this tells the next session where to spend
attention first. The dominant tension shifts as the project moves through
phases — re-identify it each session from current observations, not
from habit.

**If a session is interrupted before the human confirms.** Append the
draft directly with a `[unconfirmed draft]` prefix in the title; the next
session ratifies or revises it before continuing other work. A protocol
that breaks when sessions don't close cleanly is worse than one that
absorbs the common case.

### Moment 3 — STOP signals

Two types of STOP, each with a different escalation path. Both halt work
until the human decides.

**Type A — Criterion not served.**
A criterion is failing now, or evidence makes its future failure visible
in time to act. The point of STOP is to surface infeasibility while
there's still room to redirect — waiting for a deadline to confirm what
trajectory already shows wastes that room.
- Example (current violation): "C2: P95 < 500ms" but production shows
  720ms after three attempts at different storage layers.
- Example (predictable violation): "C1: ≥ 200 paid subs by Sep 30" with
  22 at end of month one — linear extrapolation lands near 66, not 200.
  The criterion isn't violated yet, but the path is.
- Agent surfaces in chat, proposes three options:
  - (a) Change path (try Y instead of X)
  - (b) Change criterion (require human-approved GOAL edit)
  - (c) Agent misjudged

**Type B — North star questioned.**
Criteria are met (or close), but new evidence suggests the goal itself
solves the wrong problem.
- Example: criteria all green, but user research reveals users wanted
  topic clustering, not semantic search.
- Agent surfaces in chat, proposes:
  - (a) Reframe north star (deliberate GOAL edit)
  - (b) Stay course because the evidence is weak

**Critical:** STOPs are never silently logged and walked past. The agent
must surface them in chat AND wait for the human's choice before continuing
work. A STOP entry in the journal without a chat exchange is a protocol
violation.

## Anti-flattery: the evidence rule

Agents writing their own progress reports have an obvious bias toward ✓
verdicts (they want to keep working, not stop and wait for review). The
defenses, in order of strength:

1. **Every ✓ must cite an observation from THIS session.** Not "criterion
   still reasonable", not "no reason to think it broke". A specific thing
   that happened.
2. **If no observation touches a criterion this session, the verdict is
   `unclear`, not ✓.** Default to unclear. ✓ is earned, not assumed.
3. **`unclear` accumulating across many sessions is itself a signal** —
   that criterion isn't being measured. The audit command catches this and
   nominates such criteria for retirement or for explicit instrumentation.

This rule is the single biggest reason this skill might survive contact
with reality. Without it, the criteria check decays into checkbox theater
within weeks.

## Maintenance

Three things rot if untended: journal volume grows unboundedly, open
STOPs across files get forgotten, GOAL.md drifts inconsistent after
edits. The protocol handles each — month-bounded journal files cap
volume once the project is long enough to warrant them, OPEN-STOPS.md
indexes unresolved STOPs across files when more than one is in flight,
and `/goal-driven audit` periodically reconciles all three. See
`commands/audit.md` for what audit checks; `references/templates.md` for
journal, STOP, OPEN-STOPS, and carry-over formats.

Audit when ≥ 2 weeks pass since the last one, ≥ 30 new entries
accumulate, a fresh agent picks up the project, or things just feel off.

## Standalone vs paired with design-driven

Goal-driven works alone. Shape decisions, when they come up in an
exploratory project, live as observations or named alternatives in the
journal — no separate proposal flow needed. This is the default mode and
what the rest of this document assumes.

If design-driven is also installed in the project, the two divide labor:
goal-driven owns *why* and *how-far*; design-driven owns *what-shape*.
Each manages its own files; cross-references go by ID, not content (a
journal entry says "adopted decision 003"; a decision says "blocks goal
STOP 2026-05-02 if rejected").

Four interaction points to watch when both are present:

1. **Goal pivot crosses design boundaries** → also open a
   `design/decisions/NNN-*.md` proposal. The journal entry doesn't
   replace the design proposal flow.
2. **Design proposal would violate GOAL invariants** → trigger a goal
   Type A STOP first; don't let design adopt and then quietly fail
   criteria.
3. **STOP resolution requires shape change** → resolve the goal STOP
   first, then open a design decision.
4. **Audits cross-check** — goal audit notes design decisions not
   reflected in the journal; design audit notes GOAL invariants
   potentially at risk.

## Structure follows need

The scaffolding around GOAL.md — OPEN-STOPS.md, monthly journal rotation,
audits — earns its cost when it's load-bearing. A short, single-stream
initiative with no STOPs in sight doesn't need an OPEN-STOPS index; the
one STOP, if it ever appears, lives visibly in the journal. A six-week
project doesn't need monthly rotation; a single `journal.md` carries it
until it doesn't.

Add structure when the absence starts to hurt: create OPEN-STOPS.md when
a second open STOP exists and you can no longer hold both in mind; rotate
to monthly files when one journal becomes too long to scan. The directory
layout shown above is the mature shape, not the starting shape — start
small and grow into it.

GOAL.md is the exception. It's the compass, not scaffolding. Even a
two-week initiative benefits from articulating it. If GOAL.md feels like
overhead for what you're doing, this skill isn't what you need; use a
notebook.

## Example walkthrough

For a concrete end-to-end example — bootstrap, several journal entries,
two STOP scenarios, resolution — see `references/example.md`.
