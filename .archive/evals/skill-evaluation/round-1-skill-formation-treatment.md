# Round 1 skill-formation treatment

## Run boundary

This treatment applies `.agents/skills/skill-formation/SKILL.md` to fixture F1.
It uses only the F1 packet, the evaluation protocol, and the skill's living
theory sources. The baseline output was not consulted. This record is a runner
observation and design-review candidate, not human acceptance or an independent
semantic review.

## Admission decisions

### 1. Decision-relevant source selection

**Decision: admit a candidate skill, but do not claim that it improves behavior
yet.**

- **Behavior object and gap:** in research tasks, an Agent must select the
  sources needed for the current decision while preserving whether each source
  is canonical, interpretive, or a projection. Six unrelated tasks show the
  same failure relation: loading the whole corpus displaced source status and
  allowed a projection to become authority.
- **Owned relation:** the candidate would own the conditional judgment
  `current research question × source relevance × declared source status`, and
  the action of loading the smallest sufficient source set without changing
  source authority. It would not own the source facts, decide which document is
  canonical, or confer acceptance authority.
- **Trigger boundary:** positive cases contain a mixed or large corpus and a
  research decision that requires selective loading. A one-off task with an
  explicit source list belongs in the current task expression. Durable facts
  and source-status declarations remain ordinary documentation. Conditional
  catalogues remain references. An always-present repository boundary remains
  a project-local instruction.
- **Nearest owner:** ordinary living documentation owns source identity and
  authority; the candidate skill would only teach the Agent how to select and
  preserve those declarations during an active research judgment.
- **Strongest no-new-form case:** if an existing research skill already owns
  this same object, trigger, and success relation, revise that skill instead.
  The packet says no current skill owns it. Repeating the method in six current
  task prompts would be a weaker alternative because it would leave the
  cross-task loading judgment undiscoverable and duplicated.
- **Evidence needed:** freeze model, sources, tools, harness, and workspace;
  compare matched research tasks with and without only this candidate; test
  metadata discovery separately from the loaded method; include a mixed-corpus
  positive case, an explicit-source-list refusal, an ordinary-document owner
  case, and a projection/canonical regression. Only a matched difference can
  support `matched-improvement`; repeated regressions are needed for
  `regression-supported`.

The six observations establish a real and repeated admission source. They do
not establish that any proposed method expression closes the gap.

### 2. Versioned provider API catalogue

**Decision: reference, with the provider source retaining semantic authority.**

- **Owned relation:** conditional access to versioned fields and error codes
  after a relevant API task has activated the method that needs them.
- **Nearest owner:** the relevant API method owns when and why to consult the
  catalogue; the provider's documentation owns the catalogue facts. A local
  reference may point to or faithfully snapshot those facts, but must declare
  version and source status rather than become a second canon.
- **Strongest no-new-form case:** if the provider's primary catalogue is
  reliably available at task time, link to it directly instead of creating a
  local reference. An independent skill would add a trigger and main judgment
  that the packet does not show.
- **Evidence needed:** observe that relevant tasks retrieve the correct version,
  irrelevant tasks do not load the catalogue, and results retain provider
  attribution. A matched comparison would be required to call this an
  improvement rather than sensible placement.

### 3. No direct push to `main`

**Decision: project-local instruction, normally in the existing repository
entry instructions rather than a new artifact.**

- **Owned relation:** an always-present repository work boundary: every task
  must route shared publication through the permitted path and must not directly
  push `main`.
- **Nearest owner:** repository instructions own the Agent-facing boundary. If
  "never permits" means the property must hold even when instructions are
  ignored or bypassed, branch protection or another enforcing mechanism is the
  runtime owner of that guarantee.
- **Strongest no-new-form case:** update an existing `AGENTS.md` rule if one
  exists; do not create a skill or a second policy document. If branch
  protection already enforces the invariant, no new enforcement artifact is
  needed, though the instruction can still explain the expected workflow.
- **Evidence needed:** for guidance, observe representative repository tasks,
  including a prompt that omits the rule, and compare matched behavior before
  claiming improvement. For a hard guarantee, inspect and test the enforcing
  protection; prompt compliance cannot establish it.

### 4. Single writer across omission and restart

**Decision: tool/runtime mechanism, not a skill or instruction.**

- **Owned relation:** durable writer exclusion or isolated worktree allocation
  whose identity and lease/recovery state survive prompt omission and process
  restart.
- **Nearest owner:** a project-local instruction may explain how Agents should
  cooperate, but it cannot own concurrency, lifecycle, or recovery. The
  harness/runtime that allocates worktrees and authorizes mutation owns the hard
  property.
- **Strongest no-new-form case:** if the execution environment already provides
  a correctly scoped single-writer lock or per-writer isolated worktrees, use
  that mechanism and add nothing. Otherwise the smallest enforcing mechanism
  must be designed; stronger wording is not a substitute.
- **Evidence needed:** deterministic concurrent-writer tests, stale-owner and
  restart recovery tests, and evidence that bypass paths cannot mutate the same
  worktree. Skill-evaluation evidence levels do not turn prompt guidance into a
  runtime guarantee.

## Evidence claim for this treatment

The strongest level established by this runner record is
`behavior-observed`: with `skill-formation` loaded, the result admitted the
repeatable, selectively triggered method gap and transferred the three nearby
objects to reference, project-local instruction, and runtime owners. F1 contains
positive and nearest-owner cases, but this runner is not its own independent
semantic grader; `boundary-supported` remains a review claim to be decided by a
source-aware reviewer. No baseline output was read, so this record makes no
`matched-improvement` or `regression-supported` claim.

## Candidate review of `skill-formation`

**Candidate disposition: retain the current object and boundary; consider a
small rewrite to clarify evidence bookkeeping.** This is a self-application
candidate only. It cannot establish the disposition.

- **Standing:** F1 still presents the repeated meta-judgment the skill claims to
  own: deciding whether a behavior gap belongs to a skill or a neighboring
  form. The loaded method produced differentiated owners instead of treating
  all four important observations as skills. This is one behavior observation,
  not evidence of net benefit.
- **Object and boundary:** creation and review remain one lifecycle judgment—
  whether a selectively loaded method expression should exist—so F1 provides no
  reason to split them. The exclusions for reference, project instructions, and
  runtime align with the nearest-owner cases. There is no observed basis to
  merge, demote, or delete the skill.
- **Form and system relation:** the main judgment is present in `SKILL.md`; its
  canonical semantic claims are linked to living theory rather than copied as
  a second authority. No dependency on another skill or circular skill relation
  was observed. The repository validator is discoverable at
  `scripts/validate-skills.rb`, but the skill currently names only "the
  repository's mechanical validator"; a direct link or command is a possible
  local-expression improvement if fresh runners are observed guessing.
- **Agent expression candidate:** separate two evidence tracks more explicitly
  in the return contract: (a) evidence admitting the target behavior gap and
  form, and (b) evidence that `skill-formation` itself changed the runner's
  behavior. F1 makes the distinction load-bearing: six failures support the new
  source-selection candidate's admission, but they do not evaluate either that
  future skill or the current meta-skill. The present text states the relevant
  cautions, yet a named two-track return could reduce accidental evidence-level
  inflation. This is a rewrite candidate, not a demonstrated defect.
- **Proportionality:** neither candidate rewrite changes the skill's theory,
  main judgment, or directory. No evidence here justifies a new review skill,
  a split, or a broader subsystem.

## Unknowns and human decision

- The baseline result, matched difference, discovery behavior, and regression
  behavior are deliberately unknown in this treatment.
- The packet does not reveal whether the six research tasks shared the same
  model, harness, or corpus topology; recurrence is supported as an observation,
  while transfer breadth remains unknown.
- No source-selection skill candidate or probe packet exists here, so its exact
  name, method expression, discovery metadata, cost, and net benefit remain
  undecided.
- It is unknown whether provider documentation is reliably available, whether
  branch protection already enforces observation 3, or whether a durable
  single-writer mechanism already satisfies observation 4.
- An independent source-aware reviewer must decide whether this treatment
  supports the stated boundaries. The named human owner retains acceptance of
  any new skill and of any proposed rewrite to `skill-formation`.
