# Agent Work Model

Use this model to locate a failure, not to impose a universal lifecycle. A task
may skip, combine, or revisit these relations.

## In plain words

An agent can act well only when the human's intent meets the right project
truth, method, capability, and verification at the moment each can affect the
work. A visible failure near the output may be caused earlier in that relation.

## Surfaces and ownership

| Relation | Evidence to inspect | Likely owning surface | Common false repair |
|---|---|---|---|
| Intent and authority | user request, accepted decision, scope, approval | human and governing project source | making the agent infer policy or acceptance |
| Discovery | repository entry instructions, skill metadata, runtime discovery trace | AGENTS/project instruction or runtime projection | adding more prose to an undiscovered file |
| Guidance | selected skill, prompt, direct reference, loaded context | owning method or context path | copying all doctrine into always-on context |
| Action and capability | tool schema, CLI help, adapter, permissions, execution trace | tool/runtime owner | explaining around a missing or awkward capability |
| Verification | acceptance condition, tests, review evidence, submission boundary | designated verifier and project checks | treating agent output or a shallow unit test as acceptance |
| Handoff and recovery | changed files, decision record, issue/PR, work log | named durable source or bounded record | creating a second task board or permanent coordinator |

## Diagnosis gates

1. **Observed or inferred?** Preserve the raw symptom and mark causal claims
   until the path supports them.
2. **Truth or delivery?** If the governing content is absent or disputed,
   delivery changes cannot repair it.
3. **Guidance or capability?** Repeated instructions cannot create a tool,
   enforce a schema, or preserve runtime state.
4. **Capability or acceptance?** A tool can return evidence; it cannot decide
   that its own work satisfies project authority.
5. **Source or projection?** A generated index, injected summary, or dashboard
   remains rebuildable access to a named source unless separately governed.
6. **Local or recurring?** A one-off correction belongs in the task. Create or
   alter a durable agent surface only when the decision must recur or survive.

## Minimal intervention table

| Leading gap | Prefer | Escalate only when |
|---|---|---|
| unclear reusable judgment | correct the owning skill or instruction | no existing owner can express the repeated gate |
| missed governing context | repair discovery or delivery from the named source | the runtime lacks the required delivery capability |
| costly or ambiguous action | simplify the tool/CLI contract or adapter | a new runtime capability is actually required |
| weak verification | add one meaningful action/boundary probe or acceptance path | the project needs a separately governed verifier |
| lost continuity | extend the existing durable source or handoff | a bounded campaign truly spans sessions or actors |

Do not score every surface or optimize all of them. Select the mismatch whose
repair changes the target action, preserve secondary hard constraints, and stop
when the evidenced behavior is sufficient.
