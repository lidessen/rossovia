---
name: reframe
description: |
  Methodology for designing in territory where the industry is still
  groping for shape — AI-native systems, agent-first interfaces, any
  domain whose category is forming. Strip the target to 3-5 abstract
  functions (the essence), redraw the load-bearing skeleton from the
  new paradigm's primitives, stress-test it without traditional
  crutches, then add familiar flesh as a projection of the new
  skeleton — never the other way around.

  Use when the user is designing something whose conventions don't
  yet exist and where copying the traditional reference design would
  lead them astray. Trigger on phrases like "AI native X", "agent-
  first X", "redefine X", "rebuild X from scratch under Y", "reframe
  X for Y", "what should X look like in the new paradigm", "design a
  system with no precedent", or when the user voices the tension
  between "new shoes on the old path" and "a skeleton that holds on
  its own".

  Do NOT trigger for incremental redesigns within an existing
  paradigm (use design-driven), for explanatory writing about a
  paradigm (use technical-article-writing), or for vague "make it AI"
  requests with no concrete domain to redefine.

  Pairs with design-driven as upstream: reframe explores what shape a
  system should take in a new paradigm; once the skeleton settles, it
  graduates into design/DESIGN.md and design-driven takes over.
  Parallel to goal-driven (which manages destination clarity, not
  shape clarity) — multi-month explorations in unsettled territory
  often use both: GOAL.md as compass, concepts/<target>.md as the
  working theory of shape. Each works alone — they cross-reference
  but do not depend on each other.

  Supports arguments: `/reframe init` to set up the project's
  `concepts/` working directory and register the skill in agent
  configs, `/reframe close` to finalize a concept document with a
  retrospective and archive it, `/reframe explain [for <audience>]`
  to translate a concept document into an audience's working
  vocabulary (output to chat; not persisted by default).
argument-hint: "[init | close | explain [for <audience>]]"
---

# Reframe

Methodology for designing in territory where no one yet knows the
shape. When you're building "AI native CRM" or "agent-first IDE", the
danger isn't that you fail outright — it's that you succeed at a
*traditional* version wearing the new paradigm's clothes. New buttons,
old skeleton. The user gets traditional capability with paradigm
overhead: the worst of both worlds.

This skill enforces a sequence designed to prevent that. Distill what
the domain actually does underneath its surface. Redraw the load-
bearing skeleton using the new paradigm's primitives. Test whether the
skeleton stands without traditional crutches. *Then* add the familiar
surface as a projection of the new skeleton.

## Commands

When invoked with an argument, dispatch to the corresponding file:

- `/reframe init` → Read and follow `commands/init.md` in this skill
  directory. First-time project plumbing: create `concepts/`, register
  the skill in agent configs.
- `/reframe close` → Read and follow `commands/close.md` in this skill
  directory. Finalize a concept document with a retrospective and
  archive it.
- `/reframe explain [for <audience>] [about <focus>]` → Read and follow
  `commands/explain.md` in this skill directory. Translate the
  concept document into an audience's working vocabulary; output to
  chat. Doubles as a Phase 7 narration-fidelity comprehension-test
  artifact.
- No argument → Continue with the methodology below. If `concepts/`
  contains active documents, list them and offer to resume one. If
  empty, ask the user what they want to reframe and create a new
  document from `references/template.md`.

---

## Core idea: skeleton vs flesh

Every domain has two layers, and reframing is about which one you
rebuild first.

- **Skeleton** — the load-bearing abstract functions. For a ticket
  system: information ingestion + state tracking + event notification.
  Three abstract verbs. Survives every UI redesign for thirty years.
- **Flesh** — the surface a user sees. Forms, lists, buttons,
  workflows. Tied to a specific paradigm and era.

Most "AI native" failures rebuild the flesh and call the result
innovation. The skeleton stays a CRUD database with stage fields, and
the agent becomes a smart input box bolted on top. The reframe never
happened.

A real reframe reconstructs the skeleton itself from the new
paradigm's primitives. Flesh follows. Often the user-visible result
*resembles* a traditional system — that's fine, that's the projection
— but every operation underneath flows through new primitives.

## The artifact: `concepts/<target>.md`

A reframe is a multi-session exploration. The document is the
pause-and-resume mechanism: any agent (a future you, a different
session, a teammate) can pick up where work left off because the full
thinking trail lives in the file, not in any session's memory.

One file per redefinition target. Structure follows
`references/template.md`. The agent reads the file at the start of
every session and updates it at the end of every meaningful move.

Concept documents are abstract methodology applied to abstract
content — without form discipline they read like noise. The template
mandates several expressive devices (plain-language summary on top,
vignettes paired with essence claims, text diagrams for skeletons,
verb-tagged blocks for stress and comprehension tests, dependency
tables) because each prevents a specific failure mode. Treat them as
defaults; the only documented escape hatch is "v1 skeleton may be
prose-only while shape is still forming".

### Directory layout

```
concepts/
  <target>.md          ← active concept document (e.g. ai-native-crm.md)
  archive/
    <target>.md        ← closed concepts moved here by /reframe close
```

Each file carries YAML frontmatter so its state is machine-readable:

```yaml
---
target: AI-native CRM
paradigm: AI-native
status: active        # active | closed
opened: 2026-05-08
---
```

### Resume-or-start flow

When the user invokes the skill with no argument:

1. List files in `concepts/` (excluding `concepts/archive/`). For each,
   read the frontmatter `status` field; offer files with
   `status: active` as resume candidates.
2. If the user picks one, load it and continue from its current phase.
   If they want a new target, create a new file from the template and
   start at Phase 1.
3. If no `concepts/` directory exists, suggest `/reframe init` first —
   but if the user prefers to skip plumbing, just create the directory
   and document inline.

---

## Phase 1: Essence Extraction

Strip the target domain to 3-5 abstract functions. The test for an
essence statement: would it still be true thirty years from now,
under any paradigm we can imagine?

Common failure modes when extracting essence:

- **Listing features instead of functions.** "Customer profile,
  pipeline view, reporting dashboard" — those are flesh. The
  underlying function is "remember relationships, track interactions,
  surface opportunities."
- **Smuggling paradigm assumptions.** "User clicks through stages" —
  that's a paradigm artifact (mouse + form). The function underneath
  is "advance state in response to evidence."
- **Compressing too far.** "It's just data management." Too abstract
  to constrain skeleton design.

Calibration: an essence statement should be specific enough that it
*could not* be implemented the wrong way, and abstract enough that it
prescribes no specific implementation. "Track interactions" is too
vague. "Maintain a per-relationship running synthesis updated by every
recorded interaction" is essence-grade — it tells you what must be
possible without saying how.

Write the result under `## Essence` in the document. One sentence per
function, plus one sentence of justification ("why is this essence
rather than artifact?"), then a one- to two-sentence concrete vignette
showing the function in scene. The vignette is what makes the
abstraction stick — without it, essence reads as jargon. See
`references/template.md` for the format.

## Phase 2: Paradigm Primitives

What does the new paradigm actually offer as building blocks? Be
operationally concrete. Slogans ("AI is native") are not primitives —
the primitives are the operational consequences of the slogan.

For AI-native, primitives might be:

- Every action is exposed as a tool with a JSON schema
- Agents can read arbitrary context (emails, meetings, prior chats)
  rather than only what was typed into a form
- State can be inferred from evidence instead of entered by hand
- Natural language and structured data flow both ways
- Background agents can act between user sessions

Calibration: a primitive must be something a skeleton can *be
expressed in*. If a candidate primitive is still a slogan, drill
down. "AI native" → what does "native" mean operationally? Keep
drilling until the answer is concrete enough to load-bear.

Write the result under `## Paradigm Primitives`. Aim for 4-8
primitives. Fewer than 4 usually means under-specified; more than 8
means some are not load-bearing and can be folded.

## Phase 3: Skeleton Reconstruction

Re-express the essence using the primitives — not "essence with
primitives sprinkled on", but essence *expressed in* primitives end-
to-end.

The hardest discipline: refuse to reach for the traditional shape
when the new shape is unclear. If you find yourself drafting "a deal
table with a stage column", catch yourself — that's old skeleton.
The reframe question is: *what is a deal, in a world where state is
inferred from evidence?* Maybe it's "a relationship trajectory with a
confidence-weighted suggested stage that the user confirms or
overrides." Maybe it's something else entirely. Sit with the
question.

Version explicitly. The first skeleton will be wrong somewhere. Write
v1, run stress tests (Phase 4), write v2 in light of what failed.
Keep prior versions visible but collapsed using `<details>` /
`<summary>` HTML tags (supported in GitHub-flavored markdown) so the
evolution trail stays legible without dominating the page.

Write under `## Skeleton (vN)`. Three elements are required from v2
onward; v1 may be prose-only while shape is still forming:

1. **A text diagram of the core flow** (state machine, data flow, or
   dependency graph in ASCII). Six lines of diagram teach more than
   six paragraphs of prose.
2. **A Components → Primitives dependency table** so "expressed in
   primitives" is auditable rather than hand-waved. A component row
   with no checkmarks is old skeleton sneaking in.
3. **A short rationale per component** linking it back to an essence
   function and justifying the shape over the obvious traditional
   one.

Between consecutive versions, write a one-paragraph **delta annotation**
naming what changed and which stress or comprehension test triggered
it — readers shouldn't diff component lists by hand. See
`references/template.md` for the format.

## Phase 4: Skeleton Stress Test

Probe the skeleton by removing traditional crutches one at a time
and watching what happens:

- "Suppose there are no input forms — can the skeleton still ingest
  what it needs?"
- "Suppose there are no manual stage transitions — does the skeleton
  produce stage state from evidence?"
- "Suppose there are no scheduled reports — does the skeleton surface
  what users need to know without polling?"
- "Suppose the user never logs in for a week — what still happens
  correctly?"

For each crutch removed, three possible outcomes:

1. **Skeleton holds.** New primitives carry the load. Record this —
   it's positive evidence the reframe is real, not cosmetic.
2. **Skeleton bends but holds with adjustment.** Modify the skeleton
   to absorb the load. Bump the version.
3. **Skeleton collapses.** Either essence was misidentified (back to
   Phase 1), primitives are insufficient (back to Phase 2), or this
   particular function genuinely doesn't redefine in the new paradigm
   — it stays traditional, and that's the boundary of the reframe.

Outcome 3 is not failure. Knowing where the new paradigm *doesn't*
help is part of the design. Document the boundary explicitly so it
doesn't get re-litigated later.

Write all stress tests and outcomes under `## Stress Tests`. The
section is append-only history — don't delete failed attempts; their
existence is the evidence that the surviving skeleton was tested.

Each entry uses the verb-tagged block format (`Date / Removed /
Hypothesis / Result / Diagnosis`). Free-form prose entries are
rejected on later read because the structure is what makes the log
skim-readable months later. See `references/template.md`.

## Phase 5 (cross-cutting): Transfer Learning

Mature domains have already solved problems isomorphic to the ones
the new domain is groping with. The discipline is: **mine for
patterns, not for shapes**. Translate, don't copy.

Examples of fruitful transfers:

- AI agent context management ↔ software engineering's information
  architecture (L1/L2/L3 layering, just-in-time loading, the
  principle that more context isn't always better)
- Conversation memory across sessions ↔ email threading and version
  control merge semantics
- Tool schema design ↔ API design conventions and Unix pipe
  composability
- Agent attention/budget management ↔ Kanban WIP limits and OS
  scheduler quotas
- Background agent coordination ↔ build system DAGs

For each candidate source domain, ask two questions:

1. What problem did the source domain solve, *abstractly*?
2. Does the new domain face an isomorphic problem?

If yes, the source pattern *seeds* the new design — never as a
verbatim copy. The translation step is where the value lives. Note
deliberate non-transfers too: "considered borrowing X but it relies
on assumption Y that doesn't hold here." Non-transfers prevent
re-considering the same option later.

Transfer is cross-cutting — invoke it during Phase 2 (primitive
identification), Phase 3 (skeleton drafting), Phase 4 (rescue when
the skeleton bends). Write under `## Transfer Log`.

## Phase 6: Flesh

Once the skeleton holds, plan the user-facing surface as a
*projection* of the skeleton. Two rules govern flesh:

- **Familiarity is fine, mimicry is suspicious.** A list view that
  resembles a traditional one is fine *as long as* it's a projection
  of skeleton state. If you can't name which skeleton state it
  projects, it's not flesh — it's old paradigm leaking through, and
  the data behind it is probably in the wrong shape.
- **Flesh never adds capability the skeleton lacks.** If the user
  needs to do X, X must be expressible in the skeleton. If not, the
  right move is to revise the skeleton (back to Phase 3), not to
  bolt X onto the surface. A surface capability the skeleton can't
  reason about will fight the rest of the system forever.

Write under `## Flesh Plan` as a three-column table: flesh element,
skeleton state it projects, user need it serves. If you can't fill
all three columns for a row, the element isn't flesh — it's old
paradigm leaking through. See `references/template.md`.

## Phase 7: Comprehension Test

Skeleton soundness does not imply flesh comprehensibility. A
skeleton built from genuinely new primitives will project a surface
that may *look* familiar yet behave in unfamiliar ways — and users
may not bridge the gap on their own. Phase 7 closes the loop with
the lightest credible evidence that the projection is legible to
the people who will use it.

This is symmetric with Phase 4: Phase 4 stress-tests the skeleton
against removed traditional crutches; Phase 7 stress-tests the
flesh against actual user comprehension. Without Phase 7 the
methodology is asymmetric — we verify that the bones hold but never
verify that the skin can be read.

### How to test (lightest credible evidence)

Match the artifact's fidelity to the risk:

- **Lowest risk** — narrate the flow in plain language to a target
  user; ask them to predict what happens next at each step.
  `/reframe explain for <audience>` produces this artifact directly
  — generate it, walk it through with the target user, log
  reactions.
- **Medium risk** — wireframe walkthrough or paper prototype.
- **Higher risk** — interactive mock with real interaction patterns.
- **Highest risk** — working prototype on a thin slice of the
  skeleton.

Reframe does not prescribe research methodology. The discipline is
"the cheapest evidence that would change your mind". Heavier
artifacts are scope creep into UX research; lighter ones leave the
question unanswered.

### Three diagnoses, three feedback paths

When users cannot navigate the flesh, the cause matters — different
causes feed back into different earlier phases. Misdiagnosis turns
the loop into mindless flesh iteration that drifts the skeleton.

1. **Flesh problem.** Skeleton is sound; the projection is awkward.
   *Feedback → Phase 6.* Revise how skeleton state is surfaced
   without changing the skeleton.
2. **Skeleton problem.** No projection of this skeleton can land in
   the user's head — the bones are too foreign for the audience.
   *Feedback → Phase 3.* This is also the most common signal that
   the reframe has slipped into "novelty for novelty's sake".
3. **Essence problem.** The flesh projects the skeleton faithfully
   and the skeleton holds, but it doesn't serve what users actually
   need. The wrong functions were extracted as essence.
   *Feedback → Phase 1.* Hardest diagnosis to face, but the cheapest
   place to learn it is here, not after launch.

### Boundary: this is the last gate before graduation

Phase 7 is the final check before the concept can graduate via
`/reframe close`. It is not the start of full user research — that
discipline belongs downstream, in design-driven's blueprint Verify
sections and in the implementation phase. Phase 7 ends as soon as
there's enough evidence to know which (if any) of the three feedback
paths to walk.

Capture results under `## Comprehension Tests` — append-only, using
the verb-tagged block format (`Date / Artifact / Users / Observation /
Diagnosis / Feedback`). Same shape as Stress Tests, different fields.
See `references/template.md`.

---

## Common traps

Five recurring anti-patterns surface across reframes — *new shoes
on old path*, *novelty for novelty's sake*, *premature flesh*,
*shapeless transfer*, *phantom primitives*. Each has a detection
method and a cure path back into the relevant phase.

These are diagnostic patterns, not phase-bound. The natural places
to check for them are Phase 4 (Stress Test) and Phase 7
(Comprehension Test), where the skeleton and its projection are
under test. See `references/traps.md` for the full catalog.

---

## How reframe relates to the other *-driven skills

Reframe is the most upstream of the methodology skills — it operates
*before* the system has a settled shape. The lifecycle:

```
[concept layer]   reframe          ← shape not yet decided
                    │ (settled)
                    ▼
[structure layer] design-driven    ← shape decided, architecture maintained
                    │
                    ▼
[execution layer] evidence-driven  ← discipline overlay during implementation

  vertical: goal-driven runs in parallel as the destination compass
```

- **Pairs with design-driven as predecessor.** When a concept's
  skeleton settles (Phase 4 stress tests *and* Phase 7 comprehension
  tests both pass), `/reframe close` graduates it into
  `design/DESIGN.md`. Reframe is the
  *pre-architectural sketchbook*; design-driven is *post-settlement
  architecture*. Don't substitute design-driven for reframe in
  unsettled territory — design-driven assumes a shape exists to be
  documented.
- **Pairs with goal-driven as parallel companion.** Goal-driven
  manages "why and how far" (destination); reframe manages "what
  shape in a new paradigm". Different axes. A multi-month initiative
  in unsettled territory often uses both: `GOAL.md` for destination,
  `concepts/<target>.md` for shape. They reference each other but
  neither depends on the other.
- **Light overlap with evidence-driven.** Phase 4 stress tests and
  Phase 7 comprehension tests both borrow evidence-driven discipline
  (don't claim "skeleton holds" or "users understand it" without a
  falsifiable observation). But reframe is primarily conceptual
  exploration, not execution discipline — evidence-driven earns its
  keep later, during implementation of the settled skeleton.

## When NOT to use this skill

- The domain has clear precedent in the new paradigm (follow the
  precedent; use design-driven instead).
- The change is incremental within an existing paradigm (design-
  driven).
- The user wants to *describe* a paradigm, not design within one
  (technical-article-writing).
- No specific domain — vague "let's build something AI native"
  without a target. Get the user to name the domain first; without
  a target there's no essence to extract.
