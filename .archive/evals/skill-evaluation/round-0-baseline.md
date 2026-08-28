# Round 0 baseline

This is the no-target-skill response to the Round 1 fixtures. It uses only the
frozen philosophical, gene-expression, harness, protocol, and fixture sources
named by the baseline runner. It is a behavior observation, not evidence that a
candidate skill improved behavior.

## F1 — Skill admission and neighboring owners

| Observation | Choice | Owned relation | Strongest no-new-form case | Evidence needed before claiming improvement |
|---|---|---|---|---|
| Six research tasks lost source-status distinctions after loading a whole policy corpus | Candidate skill, initially project-local | At activation time, select only decision-relevant sources while preserving which source is authoritative, derived, or merely contextual | Do not create it if an existing selectively loaded method already owns both relevance selection and source authority, or if the failure disappears when the task names its sources and status explicitly | Run matched research tasks with and without the candidate under the same model, source packet, task, tools, and workspace. Improvement requires fewer authority substitutions without losing necessary evidence, plus boundary cases in which the skill declines unrelated document, instruction, and runtime work |
| Provider API catalogue | Reference | Preserve provider-owned field and error-code facts for lookup after the relevant API task is active; the provider remains the factual owner | Use the provider's primary catalogue directly if it is reliably available and selective loading adds no local value; do not create a skill merely to restate changing fields | Show that the reference makes relevant facts reconstructable and current without being mistaken for a method or a new authority. This is reference usefulness evidence, not skill improvement |
| No direct pushes to `main` in this repository | Project-local instruction | Constrain every repository task regardless of which optional method is loaded | No new artifact if an existing repository entry instruction already states the rule unambiguously and is reliably in scope | Demonstrate on representative task entry paths that the rule is present and obeyed. A selectively loaded skill would be the wrong comparison because the restriction must always apply |
| Concurrent writers must never mutate the same worktree, including across omitted prompts and restarts | Tool/runtime | Preserve a single-writer or transactional invariant despite prompt omission, concurrency, and process restart | No new mechanism only if the current workspace/runtime already enforces the invariant and restart/concurrency probes establish that it cannot be bypassed | A reproducible contention and restart test must fail safely before and after process restart. Prompt compliance alone cannot establish improvement |

The first observation is the only candidate skill because it describes a
repeatable, activation-time Agent judgment not currently owned by another
skill. The other cases are, respectively, changing factual material, an
always-on local boundary, and a hard invariant that must survive the method
expression layer.

## F2 — Concept articulation

I will use the temporary handles `V-a` through `V-d` until the boundaries are
stated.

| Handle | Direct broader concept | Differentiating characteristic | Inclusion | Nearest exclusion | Falsifying example |
|---|---|---|---|---|---|
| `V-a` | Observation of an execution | Reports the terminal status of one named command invocation | “This invocation exited with status zero” | Whether the command's product satisfies a separate contract | The invocation exited with status 1, so `V-a` cannot truthfully report a zero exit |
| `V-b` | Deterministic contract evaluation | Applies a reproducible predicate to a named artifact | A produced file is checked against its schema and satisfies it | Whether the artifact is relevant, sufficient, or faithful to intent | The command exits zero but the file lacks a required schema field; execution success does not establish `V-b` |
| `V-c` | Interpretive result judgment | An independent, source-aware reviewer compares a candidate with its sources and intent and issues a reasoned recommendation under uncertainty | A reviewer judges that a design fits the cited sources and requested change | A decision to adopt, publish, or authorize effects | A reviewer never compares the design with its sources and merely notes that its schema is valid; that does not establish `V-c` |
| `V-d` | Authoritative adoption decision | The named human owner decides whether to accept the candidate and authorize publication | The owner accepts and publishes the result | A reviewer's recommendation that the owner should accept | An independent reviewer recommends publication but the named human owner has not decided; `V-d` has not occurred |

With those definitions stable enough to distinguish substitution, I would name
them:

- `V-a`: **execution-status observation**;
- `V-b`: **mechanical conformance**;
- `V-c`: **semantic review judgment**;
- `V-d`: **human acceptance**.

“Verification” should not remain the name of a state spanning all four. An exit
status can be evidence used by mechanical conformance; mechanical evidence can
inform semantic review; semantic review can inform acceptance. None acquires
the next concept's authority merely by preceding it.

## F3 — Form selection

| Object | Truthful form and ordinary placement | Canonical source | Lifetime and owner | Expected consumer |
|---|---|---|---|---|
| Durable explanation of what counts as a skill | A theory document, for example `theory/skill.md` | The theory document itself | Durable and revised when the conceptual account changes; owned by the theory maintainers | Maintainers and Agents that need the durable account |
| Repeatable method loaded only when deciding whether to create a skill | A selectively loaded project skill at `.agents/skills/skill-formation/SKILL.md` | The skill is canonical for its activation-time method, while its conceptual claims remain traceable to the theory | Lives while the repeated judgment gap exists; owned by its skill maintainers | An Agent facing a skill-admission decision |
| Provider-owned API fields and error codes | The provider's primary API catalogue; if a local selective aid is necessary, a clearly attributed versioned reference beside the consuming API method rather than a new subsystem | The provider page, not the local copy | Changes with the provider; provider owns facts, local maintainer owns only freshness and attribution of any reference | An Agent already working on that provider's API |
| One-time old-folder to new-folder migration | A finite migration plan/checklist such as `planning/old-to-new-migration.md` | That plan while the migration is active, together with the actual repository state for completed effects | Ends when migration, reference updates, and checks are complete; owned by the migration owner | Implementer and reviewer during the migration |
| Summary derived entirely from the durable explanation | A marked projection at the nearest existing entry page, such as the relevant section of `theory/README.md` | The durable theory document | Rebuilt or updated when the source changes; projection maintainer owns rendering, not the claim | Readers navigating to the theory |

The closing placement check is whether the path communicates the object's
ordinary owner and lifetime, all living references point to the canonical
source, and the summary cannot silently become a second authority. No separate
directory is justified solely by these five examples.

## F4 — Human writing

A skill is a method expression that an Agent loads selectively when a task
reaches the judgment or action the method supports. Its object is therefore not
the `SKILL.md` file. The object is a repeatable gap in Agent behavior: a choice
or action that repeatedly goes wrong, remains unowned by a nearer form, and can
plausibly change when the method is available. The file is only one expression
of that method in a particular environment.

This distinction matters because a structurally valid skill may still have no
behavioral value. Correct metadata and a well-formed document show that the
carrier can be loaded; they do not show that an Agent makes a better decision,
refuses neighboring work, or preserves the task's constraints. Those claims
need comparable behavior evidence. As the evidence changes, the method may be
rewritten, split, merged with a better owner, downgraded to a reference or local
instruction, or deleted rather than preserved for its own sake.

The repository does not yet know a generally sufficient number of matched
trials. Trial count alone would not settle the question in any case: source
coverage, boundary cases, consequence, and repeatability also matter. For now,
the defensible claim is narrower—use matched tasks and independent review to
learn whether a candidate changes the intended behavior, and retain uncertainty
about how much evidence will generalize beyond the observed conditions.

## F5 — Agent expression under brevity pressure

### Research task

Compare ISO 704 and W3C SKOS using only their primary pages and the normative
references directly linked from those pages. Determine what each source
supports about **concept**, **definition**, and **label**.

This is read-only research. Do not edit files, propose a philosophy entry, use
secondary sources, or infer that either standard mandates this repository's
workflow. If a named page or directly linked normative reference is
unavailable, record that limitation; do not fill the gap from memory.

Return a compact source-linked report containing:

1. claims supported by ISO 704;
2. claims supported by W3C SKOS;
3. material disagreements or differences in scope;
4. unavailable or unresolved evidence; and
5. the narrowest joint or separate conclusion the checked evidence defends.

For each material claim, link the supporting primary source and distinguish
source text from your inference. The work is acceptable when another reviewer
can trace every material claim, the report preserves disagreements and
unknowns, and it makes no repository-workflow claim that the sources do not
support. Stop after both primary pages and their directly linked normative
references have been checked and the report above is complete.

## F6 — Dual audience

The one semantic source should be a durable authority-boundary statement in the
harness theory, identified by a stable section anchor. It should contain all of
the following in one place:

> A semantic reviewer compares a candidate with its sources and intent and may
> recommend acceptance. Only the named human owner may accept the candidate or
> authorize publication. If a reviewer recommendation is treated as
> acceptance, advisory judgment has acquired an effect authority it does not
> own; the result may be published without the principal's decision.

The maintainer view may present the source statement with its rationale and a
worked failure case in an explanatory page. The Agent view may reduce the same
statement to an actionable instruction: identify the human acceptance owner,
return a sourced recommendation, and do not mark the result accepted or publish
it. Both views must link to or be generated from the stable source anchor and
must identify themselves as views, not policy sources.

After the rule changes, update the semantic source first, then rebuild or
review both views. The regression check should establish that (a) both views
resolve to the current source version, (b) a reviewer can still recommend but
cannot produce acceptance or publication effects, and (c) the named human
owner's decision is represented distinctly. A text-diff check can detect stale
projections, but the authority-boundary behavior test is required because
matching words alone do not establish the rule.

## F7 — Delegation and retained whole

### Independent source investigations

Use three parallel, read-only contributions because the source surfaces are
independently knowable and their effects are separable:

- one contributor investigates terminology standards;
- one investigates human technical writing;
- one investigates multi-Agent evaluation.

Each contribution is bounded by its named source family and may only observe
sources. It must return source-linked claims, source status, scope covered,
disagreements within that surface, and declared unknowns. The main Agent owns
synthesis. The overall research question, cross-surface constraints, acceptance
conditions, and any conclusion spanning source families remain whole.

### One reconciled theory section

Keep the central writing with one synthesis owner and proceed sequentially from
the three evidence returns. The owner may request read-only challenges to a
specific claim, but contributors do not independently author competing versions
of the same central section. Only the synthesis owner may edit the section and
must return one argument with claim-to-source traceability, unresolved tensions,
and a declared narrow conclusion. The central claim, vocabulary, argumentative
arc, and responsibility for reconciling disagreement remain whole; neither
concatenation nor a vote can perform that reconciliation.

### Two proposed writers for one file

Refuse concurrent edits to the same worktree and file. Use one writer with
write effects and make the other contributor a read-only reviewer, or serialize
the writers under the same synthesis owner if both contributions are necessary.
The writer returns the diff, checks, and unresolved issues; the reviewer returns
findings rather than a competing edit. The file's coherence, shared
terminology, user changes, and final acceptance remain whole with the synthesis
owner. Separate worktrees could isolate candidate effects, but they would not
remove the need for one owner to reconcile the same-file result.

## F8 — Proportionality

| Observation | Likely owning layer | Current evidence strength | Consequence | Smallest next action | Evidence that would justify escalation |
|---|---|---|---|---|---|
| One slightly vague heading; readers still reach the correct canonical source | Local document expression | `behavior-observed`: the wording defect and successful discovery are observed, but no repeated failure is shown | Low; clarity may be imperfect without authority loss or blocked work | Make no structural change. Record or locally rename the heading during the next relevant edit if a clearer noun is known, then check links | Repeated misrouting, search failure, or readers treating a projection as canonical would justify a focused information-structure fix; only a broader repeated judgment gap would raise a skill question |
| Three skill trials cross-trigger on the same neighboring task and issue contradictory instructions | Skill design and method-expression boundary | `boundary-supported`: repetition across three trials directly implicates activation/ownership boundaries, though no matched repair has been tested | High for the affected task family because the Agent receives incompatible owners | Freeze expansion, compare the skills' objects, triggers, inclusions, and nearest exclusions, then assign one owner or narrow the boundaries; rerun the same boundary fixtures | Matched trials showing that a revised boundary removes cross-triggering without losing positive activation would support the repair. Escalate to theory only if the conflict exposes an unresolved conceptual distinction rather than bad skill design |
| A process can publish twice after restart because effect identity is not persisted | Runtime/base effect and causal-identity mechanism | `boundary-supported` for ownership and `behavior-observed` for the failure; the packet does not report a repaired regression | Critical because an external effect can be duplicated and prompt wording cannot preserve identity across restart | Contain duplicate publication, capture a failing restart/idempotency probe, and specify the minimal persisted effect identity before changing broader architecture | A reproducible restart trace establishing the same logical effect is issued twice and locating the missing identity boundary justifies the minimal mechanism repair. Broader theory change requires evidence that the existing base/method ownership distinction is wrong, not merely that this implementation violates it |

Priority is the duplicate publication gap first because its consequence and hard
ownership are strongest, then the repeated contradictory skill boundaries, and
finally the local heading. This ordering follows consequence, frequency,
evidence, and repair scope rather than the amount of detail supplied or which
observation is newest.

## Evidence status

This artifact establishes only `behavior-observed` for the baseline runner's
responses. It does not establish `matched-improvement`, because no candidate
skill was added and no matched treatment was run. Semantic grading and any
claim that a candidate supports boundaries belong to an independent reviewer.
