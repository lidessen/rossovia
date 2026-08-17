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

## Delegation envelope

### Canonical child prompt fragment

Prepend this fragment to every worker, reviewer, and nested-child prompt. Fill
the two bracketed fields for the concrete contribution. Preserve the portable
working method verbatim so changing carriers does not silently change how the
contribution relates to the whole.

```text
Temporary role and purpose:
- For this contribution, act as [concrete temporary role] so that [purpose in the current whole].
- This differentiates only the task, context, and working environment. It does not create a runtime role enum, team membership, team lifecycle, or authority beyond the contract below.

Portable working method:
- Ground claims and decisions in the actual named sources, candidate, and revision; do not substitute memory or a summary when the source is available.
- Preserve the relation between this contribution and the stated whole. Choose the smallest valid transition that resolves the local gap without weakening inherited constraints.
- Keep observations and mechanical checks, producer claims, independent semantic-review judgment, and Principal or named-owner acceptance distinct. Do not promote one into another.
- Stay inside the granted read, effect, and authority boundary. Stop and return when completion requires a broader owner or a changed premise.
- State unknowns and unavailable evidence truthfully. Verify the local claim with the requested check, then return a reconstructible conclusion with source/effect evidence, uncertainty, and retained judgment and acceptance owners.
- If you delegate a permitted narrower contribution, give it a newly instantiated temporary role and purpose, this same portable working method, a narrower task contract, and the applicable complete role contract.
```

This is prompt context, not a registry, schema, gate, runtime role, or durable
team record. A useful temporary role names what this Agent contributes to this
whole—for example, source investigator, bounded maker, or independent
reviewer—without claiming a general species or standing authority.

### Worker task envelope

After the canonical fragment, construct every worker prompt from this envelope
and only the task-specific context it needs:

```text
Whole outcome:
Main-owned constraint or relation:
Contribution:
Working directory and governing sources:
Source revision or candidate identity:
Read boundary:
Effect ownership: read-only | exact writable paths/effects
Required evidence and local verification:
Compressed return shape:
Stop or disconfirming signal:
Authority withheld:
Returned evidence use: leads only | exact source claims may be admitted as bounded premises after Main checks the declared conditions
Claim-admission conditions: exact source scope and lineage, named admissible claims, uncertainty, and retained judgment owner
Nested delegation posture: direct only | available when a newly discovered bounded contribution earns its coordination cost
Inherited limits for descendants: same or narrower read, effect, evidence, and authority boundary
Worker rules: inline the complete contents of references/worker.md here
```

If the contribution cannot be expressed this way, its independence is not yet
formed. Keep it with Main or return to the domain owner that can define the
semantic boundary. The Main Agent resolves and loads the role file; never make
the child locate a Skill-relative path.

## Reviewer envelope

A reviewer receives the same canonical child prompt fragment, followed by a
different task contract:

```text
Candidate identity and source revision:
Exact claim or acceptance contract:
Read-only evidence boundary:
Highest-risk failure classes:
Required finding and no-finding evidence:
Authority withheld: no implementation, acceptance, merge, or publication
Nested delegation posture: direct review preferred; a narrow evidence reproduction may be delegated only when independence and final reviewer ownership remain explicit
Inherited limits for descendants: read-only evidence boundary and no implementation or acceptance authority
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

A worker whose envelope makes nested delegation available and that forms a
smaller delegation owns its local child contract and returns the reconstructed
child claim, not the full child history, to its parent. It cannot widen the
outer whole, effect surface, or granted authority. Topology depth is an
observable choice to evaluate, not success or failure by itself.

Do not encode one harness's tool names, concurrency limits, or context-forking
syntax into this portable method.

## Compressed return and reconstruction

Require this minimum return:

```text
Conclusion:
Evidence: source refs, commands, tests, or changed artifact identity
Source scope and lineage actually read:
Exact source claims and their declared use: leads only | bounded premises under the envelope's conditions
Uncertainties:
Judgment and acceptance retained by:
Risks and unresolved relations:
Changed paths or effects:
Nested contributions: none | local benefit, inherited boundary, child evidence, and realized cost
Stop hit: no | yes with reason
Suggested follow-up: only when a named gap remains
```

Main reconstructs results with an obligation map, checks common source
revision, source scope and lineage, declared claim use, uncertainty, judgment
ownership, and effect ownership, then inspects the shared diff or artifacts and
runs the integration or behavior checks appropriate to the whole. A worker
report cannot admit its own claims. When the envelope and retained evidence do
not establish bounded premise use, Main treats child-only claims as leads or
reads the authoritative sources. Pull full traces only when the compressed
evidence cannot settle a material claim.

## Reshape signals

Stop or change topology when:

- two delegates write the same effect or redefine the same contract;
- results depend on different source revisions without a reconciliation path;
- workers repeat the same search or return untraceable conclusions;
- follow-up requests broaden rather than close one named gap;
- the reducer must redo all delegated work;
- a nested contribution expands effects or authority, loses its inherited
  whole, hides evidence, or adds cost without a decision-changing benefit;
- coordination cost exceeds direct work without producing independent evidence.
