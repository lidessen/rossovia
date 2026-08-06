# Research — Agent Attention, Disposition, and Habit

**Disposition:** open
**Scope:** Investigate how an Agent can keep the governing relation of a long
task decision-relevant; whether accepted Principles can be compiled into an
integrated working disposition; and whether role-entry, recurring phrases, or
habitual actions improve behavioral stability.
**Source limitations:** Evidence spans long-context retrieval, instruction
following, role prompting, prompt repetition, and recent long-horizon Agent
preprints. None directly establishes a universal neural pathway for coding
Agents or proves that a Codex, Claude Code, or Cursor adapter has the same
effect.

> This record owns the hypotheses and their history. An unverified or rejected
> hypothesis remains here with its evidence state, falsifiers, and outcome; a
> negative result changes its standing rather than erasing it. This research
> has no P-ID or runtime authority.

## Question

What should a general Agent-attention method preserve, reconstruct, reinforce,
or reset so that a long-running Agent continues to make decisions from the
actual task, accepted authority, and governing relations instead of drifting
into a locally absorbing branch?

Three related but distinct questions follow:

1. Can accepted Principles be expressed as a coherent working character that
   changes decision tendencies more reliably than a list of rules?
2. Does a short pre-action orientation pass help an Agent enter that character
   and form the task before acting?
3. Can recurring phrases or habitual actions maintain the intended decision
   tendency as the trajectory grows?

The earlier
[prompt-composition inquiry](theory-generativity-and-expression-selection.md#prompt-composition-and-reasoning-paths)
owns the general carrier and language-ablation evidence. This record owns the
long-task attention relation and the continuing history of the hypotheses
below.

## Terms and claim boundary

Transformer attention is an internal weighted aggregation computed during a
forward pass; [the original Transformer account](https://arxiv.org/abs/1706.03762)
does not describe a durable goal balance, working identity, or attention
reserve that visibly drains during a task.

This inquiry uses **active attention** as an engineering term: the small set of
goals, relations, constraints, and evidence that actually shape the Agent's
next action. A fact can remain somewhere in the context or an external source
without occupying active attention at the decision where it matters.

A **working disposition** is a prompt-conditioned tendency to notice, prefer,
or avoid certain actions. It is not a claim that the model has acquired a
human personality, durable beliefs, or changed parameters. An integrated
character prompt is one lossy carrier for that disposition, not a semantic
source.

A **habit cue** is a repeated expression; a **habit action** reconstructs or
checks a decision relation at a defined event boundary. Saying the cue and
performing the action are separate outcomes.

## Evidence that long context does not guarantee active use

[Lost in the Middle](https://arxiv.org/abs/2307.03172) found strong position
effects in multi-document QA and key-value retrieval: relevant information was
often used better at the beginning or end than in the middle. Repeating the
query around the evidence nearly repaired a synthetic retrieval case but did
little for the more semantic QA case. [RULER](https://arxiv.org/abs/2404.06654)
likewise showed that models which pass simple needle retrieval can still
degrade on multi-needle, tracking, and aggregation tasks. These results support
testing decision-time reactivation, but reject the universal claim that one
repetition repairs complex reasoning.

A later controlled study reported that
[context length can hurt performance despite perfect retrieval](https://arxiv.org/abs/2510.05381):
placing the relevant evidence immediately before the question did not remove
the length effect, while making a model first restate the retrieved evidence
produced only a bounded improvement. The engineering problem is therefore not
only storage or retrieval; it includes making a usable state at the point of
action.

Long-horizon mechanisms offer directional, not universal, evidence.
[ReSum](https://arxiv.org/abs/2509.13313) periodically compresses a search
trajectory into a compact reasoning state. A newer preprint,
[Remember When It Matters](https://arxiv.org/abs/2607.08716), reports that a
separate memory policy which selectively injects grounded reminders improves
Terminal-Bench 2.0 and tau2-bench, and outperforms passive exposure, always-on
injection, ordinary retrieval, and advisor-only variants. This supports
selective reactivation at state-changing boundaries; it does not require a
memory sub-Agent or prove a particular host hook.

## Evidence for recurrence and enacted patterns

The closest direct evidence for the habit conjecture is
[We Are What We Repeatedly Do: Improving Long Context Instruction Following](https://aclanthology.org/2026.findings-eacl.254/).
Across its tested open-weight models and verifiable style, security, and
alignment instructions, the pattern of prior assistant behavior affected later
compliance more than instruction placement alone. Histories whose assistant
turns consistently enacted the instruction produced better later compliance;
the best condition combined compliant history with repeated instruction. Its
re-instruction, teaching, rewriting, and summarization mitigations had
model-dependent results. This is evidence that an enacted trajectory can
condition later behavior. It does not show that a catchphrase stabilizes
engineering judgment, and it warns that a wrong repeated pattern may reinforce
the wrong tendency.

[RefuteBench](https://aclanthology.org/2024.findings-acl.818/) observed models
reverting from user corrections as conversations grew and reported a simple
recall-and-repeat mitigation. A recent preprint found that
[repeating the full input improved many non-reasoning model evaluations](https://arxiv.org/abs/2512.14982),
while reasoning-enabled results were mainly neutral to slightly positive; equal
length punctuation padding did not reproduce the gains. These findings make
recurrence testable, but do not identify semantic catchphrases, periodic
timing, or persistent neural activation as the cause.

## Evidence for role, character, and pre-action orientation

Role evidence remains mixed. Strategically constructed role-play prompts
improved many tasks in a [twelve-benchmark reasoning study](https://aclanthology.org/2024.naacl-long.228/),
but its treatment included task-selected relations, a role-feedback turn, and
an immersion response. A broader comparison of 162 personas, four model
families, and 2,410 factual questions found
[no overall persona advantage and substantial context dependence](https://aclanthology.org/2024.findings-emnlp.888/).
Recent work also reports that irrelevant persona attributes can materially
damage performance, and that
[persona assignment can introduce motivated reasoning](https://aclanthology.org/2026.findings-acl.585/).
The safe hypothesis is not that a role noun activates expertise. It is that a
compact carrier which preserves operative responsibilities, relations, and
contrasts may alter action selection.

Constitutional methods do not establish that pasting a list of Principles into
a system prompt internalizes them. [Constitutional AI](https://arxiv.org/abs/2212.08073)
combined principles with critique, revision, supervision, preference modeling,
and reinforcement learning. Static prompt composition needs its own evidence.

[Step-Back Prompting](https://arxiv.org/abs/2310.06117) supports a narrower
pre-action hypothesis: deriving a task's higher-level concepts before solving
improved several reasoning benchmarks. It does not test acting rehearsal,
identity immersion, or long-horizon coding behavior. A role-entry treatment
must therefore be compared with an equal-cost non-theatrical orientation pass.

## Hypothesis ledger

The hypotheses below are intentionally retained before validation.

### H1 — Governing-relation reactivation

**Standing:** unverified; supported directionally.
**Conjecture:** At a correction, phase change, branch return, or other material
decision boundary, selectively reconstructing the smallest governing relation
will reduce local depth-first drift better than leaving the relation only in
history or repeating the full doctrine.
**Possible mechanism:** Recency, query-aware contextualization, and a usable
compact state make decision-relevant relations easier to apply.
**Falsifier:** A matched baseline performs as well, always-on/full repetition
performs better at equal cost, or the cue causes premature branch exit when the
local issue is load-bearing.

### H2 — Integrated working character

**Standing:** unverified; first valid Work Cell development comparison was
inconclusive because its blind judge falsely admitted an out-of-scope relation
as a concrete lower-owner defect.
**Conjecture:** With identical semantic atoms and comparable length, an
integrated account of position, responsibility, tensions, and habitual moves
will produce more stable action and authority judgments than a disconnected
Principle list.
**Possible mechanism:** The integrated form supplies relations among the atoms
instead of requiring the model to compose them during each decision.
**Falsifier:** The list matches the integrated carrier, gains reduce to one
concrete action phrase, or narrative details introduce unsupported priority,
stereotype, self-authorization, or task-specific bias.

The frozen H2 carrier comparison is retained in the
[2026-08-06 development probe](../../regeneration/evaluations/evidence/2026-08-06-attention-management-h2/README.md).
Its first invocation failed at the sandbox network boundary with zero model
tokens. After explicit disclosure authority, the runtime-pinned retry settled
all four Cells under matched observed execution identity and the blind judge
returned a tie. Independent audit then rejected the judge's pass on the
required concrete-defect criterion: every cited “defect” was an unverified file
outside worker read scope, and workers described it as unavailable context or a
certification blocker rather than an observed candidate defect. The run is
therefore useful execution evidence but semantically non-discriminating, not an
established fixture ceiling and not evidence for or against H2. Do not select
another rerun by verdict; first repair the evaluator boundary and qualify a
task population with untreated variance or failure.

### H3 — Role-entry orientation

**Standing:** unverified.
**Conjecture:** Before the first consequential action, a bounded pass that
reconstructs the Agent's position, object, governing relations, acceptance,
and likely distraction will improve later decisions over the same carrier
without that pass.
**Possible mechanism:** Pre-action formation may activate the operative
relations before local solution tokens dominate the trajectory.
**Falsifier:** An equal-token neutral or non-role orientation pass matches it,
the gain is explained by extra reasoning time, or it delays simple tasks
without improving material decisions.

### H4 — Meaning-bearing catchphrase

**Standing:** unverified.
**Conjecture:** A short recurring phrase that compresses a governing relation
may maintain the intended decision tendency better than equal-token neutral
repetition.
**Possible mechanism:** The cue repeatedly reinstates a semantic association
and a recent decision frame.
**Falsifier:** Only phrase reproduction rises; neutral repetition matches it;
or the phrase causes mechanical return to an obsolete mainline after a genuine
task switch.

### H5 — Habit action over slogan

**Standing:** unverified; supported directionally by enacted-history evidence.
**Conjecture:** At the same trigger and token budget, performing a compact
reorientation action—reconstruct object, relation, contradiction, and next
action—will stabilize decisions more than merely saying a catchphrase.
**Possible mechanism:** The action produces decision-ready state and a history
of compliant reasoning behavior, not only a lexical cue.
**Falsifier:** A schema-matched observation-only action performs equally, the
gain is explained by more hidden reasoning or latency, or the habit itself
becomes a ritual that ignores concrete exceptions.

### H6 — Selective reinforcement over constant repetition

**Standing:** unverified; supported by one recent Agent preprint.
**Conjecture:** Event-triggered reinforcement at material boundaries will
outperform repeating the same carrier every turn on task success, context cost,
and resistance to obsolete anchors.
**Falsifier:** Fixed periodic or every-turn repetition produces a stable,
cross-task advantage at comparable cost, or selective triggers routinely miss
the onset of drift.

## Existing-Sequence coverage and method gap

- **P09** owns attention layering and whether information changes the current
  decision enough to occupy active context.
- **P04** owns forming the actual object and selecting the governing
  contradiction rather than following the loudest local problem.
- **P03** owns re-forming understanding from practice and testing it again.
- **P15** owns the smallest valid transition after that diagnosis.
- **P16** owns whether a Principle expression lets the acting subject decide.

No new Principle is justified. The recurrent method gap is downstream: at a
live Agent decision boundary, determine which governing relation should occupy
active attention and whether to continue, retain a load-bearing branch, return
to the mainline, switch tasks, cue, or reset. This is distinct from owning the
source content, choosing a runtime delivery surface, planning all work, or
selecting the next practice after an outcome.

## Next campaign

First qualify tasks with repeated untreated runs. Then preserve fixed execution
identity and compare adjacent treatments rather than selecting a narrative
winner:

1. neutral baseline versus one-shot role framing;
2. one-shot framing versus equal-token neutral recurrence;
3. neutral recurrence versus a meaning-bearing catchphrase;
4. an observation-only boundary action versus a decision-forming habit action;
5. a Principle list versus a semantic-atom-matched integrated character;
6. the accepted carrier with and without an equal-cost pre-action orientation.

Use cases that require `return`, `retain`, and genuine `switch`, including a
Principal correction and a locally discovered issue that really does block
acceptance. Score first action, hard-boundary violations, irrelevant branch
steps, and whole-task acceptance. Record phrase reproduction, style, latency,
and token use separately. Confirmation uses held-out cases and a second model
family before any portable claim.
