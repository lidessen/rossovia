# Main-side Delegation Contract

Read this only when the Main Agent is forming or supervising delegated work.
It is not a worker prompt. This file owns the detailed contribution gate,
topology, native steering map, and reshape signals.

## Contribution gate

Delegate only when at least one of these relations is concrete:

- two or more source fields can be investigated independently;
- implementation effects have disjoint owners and local acceptance;
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

## Delegation envelope

Construct every worker prompt from this envelope and only the task-specific
context it needs:

```text
Whole outcome:
Main-owned constraint or relation:
Contribution:
Working directory and governing sources:
Source revision or candidate identity:
Read boundary:
Effect ownership: read-only | exact writable paths/effects
Required evidence and local acceptance:
Compressed return shape:
Stop or disconfirming signal:
Authority withheld:
Recursive delegation: forbidden | exact bounded allowance
Worker rules: inline the complete contents of references/worker.md here
```

If the contribution cannot be expressed this way, its independence is not yet
formed. Keep it with Main or return to the domain owner that can define the
semantic boundary. The Main Agent resolves and loads the role file; never make
the child locate a Skill-relative path.

## Reviewer envelope

A reviewer receives a different contract:

```text
Candidate identity and source revision:
Exact claim or acceptance contract:
Read-only evidence boundary:
Highest-risk failure classes:
Required finding and no-finding evidence:
Authority withheld: no implementation, acceptance, merge, or publication
Recursive delegation: forbidden
Reviewer rules: inline the complete contents of references/reviewer.md here
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

Do not encode one harness's tool names, concurrency limits, or context-forking
syntax into this portable method.

## Compressed return and reconstruction

Require this minimum return:

```text
Conclusion:
Evidence: source refs, commands, tests, or changed artifact identity
Risks and unresolved relations:
Changed paths or effects:
Stop hit: no | yes with reason
Suggested follow-up: only when a named gap remains
```

Main reconstructs results with an obligation map, checks common source
revision and effect ownership, inspects the shared diff or artifacts, and runs
the integration or behavior checks appropriate to the whole. Pull full traces
only when the compressed evidence cannot settle a material claim.

## Reshape signals

Stop or change topology when:

- two delegates write the same effect or redefine the same contract;
- results depend on different source revisions without a reconciliation path;
- workers repeat the same search or return untraceable conclusions;
- follow-up requests broaden rather than close one named gap;
- the reducer must redo all delegated work;
- coordination cost exceeds direct work without producing independent evidence.
