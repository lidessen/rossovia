# goal-driven:set — Interview-driven GOAL.md

Create the initial `goals/GOAL.md` by interviewing the human, and set up
the minimal scaffolding around it. Run once per initiative — when
adopting goal-driven on a project that doesn't have one yet, or when
re-setting after a major change in direction.

The interview is the whole point. Do **not** draft GOAL.md alone in your
head, ask "approve?", and write the file. Section by section, asking,
echoing, getting confirmation, then moving on. The point is that the human
ends up owning the compass — the agent is the writer, not the author.

Work in four phases: **Prepare → Interview → Draft → Wire up**.

## Phase 1 — Prepare

### 1.1 Check current state

If `goals/GOAL.md` already has non-stub content, stop and ask the human:

- "There's already content in `goals/GOAL.md` — do you want to redo from
  scratch (I'll archive the current one), or did you mean
  `/goal-driven review` to step back and re-assess?"

If they confirm redo: move existing `goals/GOAL.md` to
`goals/GOAL.archived-YYYY-MM-DD.md` before continuing.

### 1.2 Surface what's already known

If there's prior context — `README.md`, project notes, prior conversation,
emails, an existing scratch document — read it. The interview is faster
when the agent can ask "I see in your notes that X — is that the north
star, or a means to it?" rather than starting blank.

If the project is new with no prior writing, skip this; start the
interview from zero.

## Phase 2 — Interview

Four sections, drawn out one at a time and confirmed before moving on.
Phrasing is the agent's; the descriptions below are *why* each section
matters and *what good answers look like*. The interview's value is the
human's commitment to the wording — a draft the agent wrote and the
human nodded at is not the same as a wording they confirmed.

### 2.1 North star — what should be true when this is done

Extract one or two sentences describing the world-state at success, not
the activity that produces it. The exact phrasing matters: every future
criterion check, every STOP, every review reads back to this sentence.

Failure modes to push back on:
- **Activity description** ("build a semantic search system") — that's a
  means, not an end. Push toward what it enables.
- **Vague aspiration** ("improve search") — push toward who, how, by what
  measure.

Echo the wording back before moving on; if the human edits, echo the edit.
Don't move on until they say yes.

### 2.2 Success criteria — how you'd know it's done

Extract 2–5 falsifiable statements with how each is measured. Soft
answers ("users like it", "fast enough", "we learn enough") hide what
counts; push each toward something observable. The shape of the
follow-up question is "turn the feeling into a measurement": *like-it-how*
becomes daily-active count or survey score or repeat usage; *fast-enough*
becomes a P95 number; *learn-what* becomes a specific question we'd be
able to answer that we can't now.

If a criterion is genuinely soft (e.g., "the team feels less burned
out"), require a paired proxy — oncall pages per week, voluntary
overtime hours, a self-report at end-of-week. A criterion without a way
to observe it is decoration; either find a proxy or cut it.

Number criteria stably as `C1, C2, C3, ...`. **IDs are never reused** —
if C2 is later retired, C2 stays as retired in GOAL.md; new ones become
C5, C6. This keeps old journal entries' references resolvable.

Echo each criterion back with its measurement, one at a time, before
adding the next.

More than 5 criteria is usually a sign that some are path-level (how)
rather than goal-level (what). Push back on bloat — it weakens the compass.

### 2.3 Invariants — what must stay true regardless of path

Extract 0–4 non-negotiables that hold every step of the way, not just at
the end. Invariants differ from criteria: criteria are achieved by the
end; invariants must hold throughout. Violating an invariant is a STOP
signal even if criteria are on track.

Common patterns to prompt with when the human draws a blank: data
boundaries ("user data stays local"), process rules ("no weekends"),
scope walls ("only contracted work"), quality floors ("test coverage
doesn't drop").

Past 4 invariants, some are probably criteria or non-goals in disguise.

### 2.4 Non-goals — what's tempting but isn't success

Extract the things the human will be tempted to call success later but
explicitly aren't. Common patterns:

- Possible "phase 2" features — name as non-goals, not delayed goals
- Adjacent improvements the team will be tempted to make along the way
- Metrics that will rise as a side effect but aren't the point

Most humans first say they don't have any non-goals. They do; they just
haven't named them. Prompt with the patterns above until something
lands.

Echo each non-goal back; confirm.

## Phase 3 — Draft

Now, and only now, write `goals/GOAL.md` using the format in
`../references/templates.md`. The file is just a transcript of what the
human confirmed in the interview, structured. No new claims should appear
in the file that didn't come from the interview.

After writing, show the file in chat: "Wrote `goals/GOAL.md`. Final
version below — say if anything looks off."

This is a final check, not a review — by Phase 3 the content has been
confirmed three times (during interview, during echo, as you wrote). The
final read catches typos and ordering issues, not substance.

## Phase 4 — Wire up

### 4.1 Ensure plumbing exists

If missing (idempotent — skip what's already there):

- `goals/` directory
- `goals/journal.md` (single journal file, heading only)

Don't create `OPEN-STOPS.md` or monthly-rotation files now; they're
added later when project volume or open-STOP count makes them
load-bearing. See SKILL.md "Structure follows need."

### 4.2 Update agent configs

Append goal-driven instructions to every AI agent config the project
uses. Common locations:

- `CLAUDE.md` — Claude Code
- `.cursorrules` — Cursor
- `AGENTS.md` or `codex.md` — Codex / OpenAI agents
- `.github/copilot-instructions.md` — GitHub Copilot
- `.windsurfrules` — Windsurf
- Any other agent instruction file the project uses

Minimal paste-ready snippet (trim or expand to match the project's tone):

```markdown
## Goal-driven planning

When working on this initiative, follow the goal-driven protocol:

- At session start, read `goals/GOAL.md` and surface any open STOPs
  (from `OPEN-STOPS.md` if it exists, otherwise by scanning recent
  journal entries). If the project uses monthly journals, ensure the
  current month's file exists; on rollover, propose a carry-over entry
  in chat before appending.
- At session end, draft a journal entry in chat (what done, observations,
  per-criterion check with evidence, judgment) and get confirmation
  before appending.
- If a criterion verdict is `✗`, or new evidence questions the north
  star, surface a STOP in chat and wait for the human's decision. Never
  silently rewrite the path past a STOP.
- Never edit `GOAL.md` without an explicit, confirmed change request
  from the human, echoed back line by line.
```

Check which config files already exist; don't create files for tools the
project doesn't use.

A SessionStart hook can enforce the protocol mechanically — emit a
reminder to read GOAL.md and surface open STOPs at every session start.
This is opt-in and rarely necessary; the skill description usually
carries enough weight on its own. If the human asks for it, the harness
or hookify skill can generate the config.

### 4.3 First journal entry

Add a "kickoff" entry to the journal. Format:

```markdown
## YYYY-MM-DD — Kickoff
- What I did: established GOAL.md via interview.
- Observations: north star confirmed; <N> success criteria; <M> invariants.
- Criteria check: all unclear — no work done yet.
- Judgment: no change. Next session begins real work.
```

This anchors the journal so the next session has something to read.

### 4.4 Commit

Commit `goals/`, agent config updates, and any hook configs together as
the goal-driven setup. One commit, clear message: "goal-driven: set
GOAL.md and journal scaffolding".

### 4.5 Tell the human what's next

- The compass is set. From now on, every work session ends with a journal
  entry the agent will draft and ask them to confirm.
- If a criterion fails or the north star feels wrong, the agent will STOP
  and ask before continuing.
- They don't need to remember any of this — the agent's protocol carries
  it. Their job is to approve, redirect, and decide at STOPs.

## Avoid these failure modes

**Drafting before interviewing.** Tempting because the agent has a guess.
Don't. The interview's purpose is the human's commitment to the wording —
a draft you wrote and they nodded at is not the same as a wording they
confirmed phrase by phrase.

**Letting soft criteria slide.** "We'll know it when we see it" sounds
human and accommodating. It's also exactly the criterion that will be
silently treated as `✓` in every future session. Push for falsifiability
or a proxy. If the human resists, name the tradeoff explicitly: "Without
a proxy, I won't know when to STOP. Are you OK with that?"

**Listing too many criteria.** If you end up with 8, some are path-level.
Ask: "Would this still feel achieved if we did the others but missed
this one?" If yes, it's probably a path detail. If "achieved" depends on
all 8 simultaneously, the goal is too compound — split or reframe.

**Skipping non-goals.** The human will say "I don't have any non-goals".
They do; they just haven't named them. Prompt with: "What did you almost
include but decided to leave out? What would be a sign of scope creep
later?"
