# Main-side Delegation Contract

Read this only when the Main Agent is forming or supervising delegated work.
It is not a worker prompt. This file owns the canonical child prompt fragment,
detailed contribution gate, topology, native steering map, and reshape signals.

## Contribution gate

Delegate only when at least one of these relations is concrete:

- two or more source fields can be investigated independently;
- implementation effects have disjoint owners and locally verifiable
  completion evidence;
- a bounded evidence-gathering loop would displace decision-relevant Main
  context;
- a non-producing reviewer can expose a consequential producer-correlated
  failure.

Keep work together when one result changes another's premise, several changes
share one contract or mutable state, the task is locally trivial, or synthesis
would require repeating every delegated investigation.

## Topology

| Task relation | Useful topology | Effect rule |
|---|---|---|
| Independent sources | parallel investigators | read-only or isolated sources |
| Disjoint implementation owners | parallel makers | no shared writable effect |
| Shared contract or state | one maker plus optional investigators | one writer |
| Consequential candidate | maker then fresh reviewer | reviewer stays read-only |
| Strict dependency | sequential work or targeted follow-up | preserve one owner |

For open research, use the first row only when the directions are genuinely
different: give each investigator a bounded question or source family, an
explicit non-goal, and a read-only or isolated effect surface. Main owns the
later synthesis: reconstruct coverage, contradictions, source standing, and
unknowns against the whole acceptance relation. This is an execution method,
not a Plan field, swarm primitive, or new runtime lifecycle.

## Child prompt construction

Build every worker, reviewer, and nested-child prompt from four compact parts,
in order. Include only information that can change the receiver's action. Do
not replace a contribution relation with a title or pass through parent/runtime
terms that the receiver does not need. If any necessary term could change the
receiver's action or return, define it at first use in one operational sentence:
what object it names, its boundary, and why it matters to this contribution.

### 1. Contribution relation, only when decision-relevant

Use plain object and action language. Omit this part when the task contract
already makes the same relation unambiguous; a title adds no useful
differentiation.

```text
Contribution relation:
- Object and bounded action owned here:
- How the result will be used downstream:
- Explicit non-goals and decisions retained elsewhere:
```

### 2. Canonical portable method

Preserve this fragment when changing carriers:

```text
Portable method:
- Use the named sources, candidate, and revision; state missing evidence instead of substituting memory or a summary.
- Keep the result connected to the requested overall outcome and choose the smallest change that closes this contribution without weakening its constraints.
- Stay inside the stated read, change, and decision boundaries. Stop when completion needs a broader owner or changed premise.
- Record observations and check results separately from your claims. Independent semantic review and named-owner acceptance remain separate decisions.
- For a named condition, state `yes`, `no`, or `uncertain` and show its evidence; do not use numeric quality, confidence, or vote-based selection.
- Run the requested local verification. Return the conclusion, source/change evidence, unknowns, and hand-off relation needed to reconstruct the result.
- If narrower delegation is explicitly allowed, give that child these same four prompt parts with the same or tighter boundaries.
```

This is prompt content, not a registry, schema, gate, or runtime state.

### 3–4. Worker task and return contracts

After the two parts above, construct the exact task contract and then the
return contract. Read `worker.md`; inline every constraint from its `Work
within the supplied boundaries` section under the task contract and every field from its
`Return` section under the return contract. Do not paste the file heading or
make the receiver locate it.

```text
Exact task contract:
Object and requested action:
Requested overall outcome or constraint this contribution must preserve:
Working directory and governing sources:
Source revision or candidate identity:
Read boundary:
Allowed changes or other effects: read-only | exact paths/effects
Non-goals and decisions not owned here:
Required evidence and verification:
Stop conditions:
Nested delegation posture: direct only | available when a newly discovered bounded contribution earns its coordination cost
Inherited limits for descendants: same or narrower read, effect, evidence, and authority boundary
Execution constraints: inline the complete worker.md execution section here

Return contract:
Inline the complete worker.md return section here
```

If the contribution cannot be expressed this way, its independence is not yet
formed. Keep it with Main or return to the domain owner that can define the
semantic boundary.

## Reviewer task and return contracts

A reviewer receives the same optional contribution relation and portable
method, followed by its exact task contract and return contract. Read
`reviewer.md`; inline every constraint from its `Review` section under the task
contract and every field from its `Return` section under the return contract.

```text
Exact task contract:
Candidate identity and source revision:
Requested overall outcome or constraint this review must preserve:
Exact claim or acceptance contract:
Read-only evidence boundary:
Highest-risk failure classes:
Required finding and no-finding evidence:
Non-goals and decisions not owned here: no implementation, acceptance, merge, or publication
Nested delegation posture: direct review preferred; a narrow evidence reproduction may be delegated only when independence and final reviewer ownership remain explicit
Inherited limits for descendants: read-only evidence boundary and no implementation or acceptance authority
Review constraints: inline the complete reviewer.md review section here

Return contract:
Inline the complete reviewer.md return section here
```

Do not give the reviewer the maker's desired verdict or ask it to continue the
implementation. Prefer a fresh context that contains the exact candidate,
acceptance contract, and evidence boundary but not the producer's conversation
history or hidden reasoning. When the active environment cannot isolate that
history, record the correlated context as a verification limitation rather
than describing the review as independent.

## Runtime-neutral steering

Map these relations to the active environment's supported capabilities:

- create a fresh delegate for a new independent contribution;
- send one bounded correction when a running contribution's assumption changes;
- follow up the same delegate for a named gap inside its current ownership;
- stop a delegate when its premise, authority, or effect boundary is invalid;
- wait only when Main's next useful action depends on the result.

A worker whose task contract makes nested delegation available and that forms a
smaller delegation owns its local child contract and returns the reconstructed
child claim, not the full child history, to its parent. It cannot widen the
requested overall outcome, effect surface, or granted authority. Topology depth is an
observable choice to evaluate, not success or failure by itself.

Do not encode one harness's tool names, concurrency limits, or context-forking
syntax into this portable method.

## Compressed return and reconstruction

Require this minimum return:

```text
Conclusion:
Evidence: source refs, commands, tests, or changed artifact identity
Sources actually read: file paths, URLs, or record IDs plus revision/version
Source claims used: exact claim plus either `Main must recheck` or `may be relied on only when: <conditions>`
Uncertainties:
Decisions not made here and who must make them:
Hand-off: named downstream use of this result and decisions retained elsewhere
Risks and unresolved relations:
Changed paths or effects:
Nested contributions: none | local benefit, limits given to the child, child evidence, and realized cost
Stop hit: no | yes with reason
Suggested follow-up: only when a named gap remains
```

Main reconstructs results with an obligation map, checks common source
revision, the exact files, URLs, or records read, how each source claim may be
used, uncertainty, retained decisions, and effect ownership, then inspects the
shared diff or artifacts and runs the integration or behavior checks appropriate
to the whole. A worker report cannot admit its own claims. Unless the task
contract and retained evidence state the conditions under which Main may rely
on a child-only claim, Main treats it as a lead or reads the authoritative
source. Pull full traces only when the compressed evidence cannot settle a
material claim.

## Reshape signals

Stop or change topology when:

- two delegates write the same effect or redefine the same contract;
- results depend on different source revisions without a reconciliation path;
- workers repeat the same search or return untraceable conclusions;
- follow-up requests broaden rather than close one named gap;
- the reducer must redo all delegated work;
- a nested contribution expands effects or authority, loses its inherited
  requested overall outcome, hides evidence, or adds cost without a
  decision-changing benefit;
- coordination cost exceeds direct work without producing independent evidence.
