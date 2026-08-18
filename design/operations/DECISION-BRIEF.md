# Principal Decision Brief

**Status:** preparation protocol
**Authority:** [human-initiated operating protocol](OPERATING-PROTOCOL.md)
**Owner:** the role that prepares the decision; **decider:** the Principal

## Purpose

When a human decision is material, a bare request for approval transfers the
agent's unresolved comprehension and comparison work back to the Principal. A
Decision Brief is a small, self-contained presentation contract: it gives the
Principal the working model needed to understand the object, compare the
available choices, and know what each reply authorizes in one response.

It is a decision **projection**, not a decision source. The named Strategy
Case, Work Estimate, PR, or design record retains the facts and rationale. The
brief cannot approve its recommendation, enlarge scope, or turn a missing
alternative into an implicit default.

## Use it only at a real human gate

Use a brief when the Principal must choose a direction, mission, material
budget/continuation, name, external setting, PR disposition, or other durable
commitment. Do not use it for a simple factual clarification, a reversible
local edit, or a choice with no decision delta.

If evidence cannot distinguish the options, include a bounded discovery option
instead of manufacturing a recommendation. If the agent cannot state at least
one consequential alternative, it must say that the decision is not ready.

## Required response shape

Keep the first screen concise but complete enough to orient the decision. The
Principal must not need to open the durable record or source code to learn what
the system is, how it works, why the decision exists, or how the options differ.
Links retain evidence and permit drill-down after that explanation.

```markdown
## Decision: <one sentence>

**Recommendation: A — <short action>**
<why it best meets the mandate and current constraints>

### What this is and why it matters
<plain-language object, purpose, current pressure, and decision boundary>

### How it works
<normal path, named owners and relations, and failure/recovery boundary; use a
small flow or table only when it materially reduces explanation cost>

### What changes and what stays
<current-to-target delta, retained hard constraints, removed or deferred
complexity, and material unknowns>

| Key | Choose this when | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|---|
| A | | | |
| B | | | |
| C — hold or discover | | | |

**Residual risk and acceptance owner:** <what remains uncertain and who accepts it>
**Evidence for drill-down:** <one sentence and source links; never a substitute for the explanation above>
**Your reply:** `A`, `B`, `C`, or `explain <key>`.
```

This is a content contract, not a demand for the same headings at every scale.
A small reversible choice may combine sections into two paragraphs. A module,
runtime, architecture, strategy, or irreversible-effect decision normally
needs the full working model because names and source links alone do not explain
its behavior.

Use two to four options. Include `hold` or a smallest discovery probe when it
is a real alternative; do not add it ceremonially. The recommendation is an
explicit option, never an action taken before the reply.

For an irreversible, high-cost, safety-relevant, or semantic decision, name
the exact commitment and require an explicit key. There is no silent default.
For a low-risk, reversible decision with a pre-authorized policy, state the
policy and its reopening condition instead of asking a performative question.

## Ownership and placement

| Decision | Producing role | Durable source if needed | Brief location |
|---|---|---|---|
| Strategic direction or mission | `strategic-advisory` | Strategy Case | its `Principal Decision Brief` section and the session response |
| Material work or resource continuation | `work-estimation` + designated approver | Work Estimate / Budget Card | the approval request and session response |
| Name or shared definition | `naming-and-articulation` | owning design or definition record | the naming record and session response |
| Integration disposition | verifier / integration steward | PR and review record | active session or human interaction UI; the PR records only the resulting status and source |
| Organization or form change | owning campaign / `form-guidance` | design decision or campaign | the review request and session response |

The producing role must preserve the difference between a fact, a claim, and
an option. The Principal's choice authorizes only the immediate result stated
for that key; later work, budget release, merge, or a semantic change still
requires its named gate.

For integration, keep the option comparison and reply key in the live handoff.
The PR remains a stable change and review record: before a decision it says
that authority is withheld and points to the current handoff; after a decision
it records the selected disposition and source. It does not preserve stale
interactive choices as though they were part of the code change.

## Action and boundary test

The brief works only if a Principal who has not opened the linked files can:

1. explain what the object is and why the decision exists;
2. trace the normal path and the material failure/recovery boundary;
3. distinguish current state, proposed state, hard constraints, and unknowns;
4. compare the consequential alternatives and tradeoffs; and
5. state exactly what their reply authorizes.

It fails if a response hides the alternatives in a long narrative, makes the
recommendation sound pre-committed, invents a false choice, uses an option label
to smuggle in extra authority, or substitutes status labels, file lists, test
counts, citations, or code links for the missing working model.
