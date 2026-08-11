# Direct versus Nested Delegation — Review Record

**Candidate:** working tree above `c41561db2d2295acec3b59c5581131e09408a02f`

## Initial finding

**Severity:** medium

The initial record described the arms as runtime-matched and effect-contained
more strongly than its retained evidence supported. The task packet and arm
returns established the intended prompt relation and producer-reported effects,
but did not retain serving model identities, task-delivery metadata,
sandbox/tool capability, or independent effect telemetry. Source hashes proved
source stability, not runtime equivalence or absence of external effects.

**Required disposition:** either retain runtime evidence capable of verifying
those claims, or clarify them as declared prompt conditions and arm-reported
observations rather than independently established runtime facts.

## Re-review disposition

The finding is resolved. The revised README and frozen task packet now call the
work a paired prompt-and-return comparison, explicitly withhold runtime matching
and effect-containment proof, distinguish the direct arm's instruction from its
unretained capability surface, and label effect and timing observations as
arm- or parent-reported. The Herdr follow-up and theory standing are directional,
not causal. `arm-nested-child.md` retains the complete child return and matches
the nested parent's B/D reconstruction, lineage, and inherited authority.

## Final standing

**Verdict:** ready-with-residual-risk

**Residual uncertainty:** serving model identities, reasoning configuration,
sandbox and native tool capabilities, task-delivery metadata, independent effect
telemetry, provider token usage, and causal attribution for the 31/102-second
difference remain unavailable.

**Authority note:** review evidence only; no acceptance, implementation, commit,
merge, publication, or other effect authority.
