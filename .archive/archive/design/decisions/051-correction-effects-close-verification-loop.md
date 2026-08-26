# Decision 051 — A visible correction movement closes failed verification

**Status:** Treatment A trial completed; bounded Treatment B carrier required
**Date:** 2026-07-27
**Extends:** [Decision 050](050-principal-workbench-supervised-mvp.md)

## Observed control gap

The first writable Blog trial produced one settled isolated effect whose
mechanical checks passed and whose independent verification failed. The first
failure was partly caused by a supervisor verifier that required `authorId`
although the accepted Blog contract requires only stable identity, slug, and
author. After that verifier was corrected without changing the candidate, the
same candidate exposed a real implementation defect: `db/schema.ts` used
`index(...)` without importing `index`.

The retained failed effect remains valid historical evidence. It cannot be
re-verified or silently replaced because the [effect journal](../../apps/autonomy/src/effect-journal.ts)
admits one immutable independent-verification event. Directly editing the
candidate now would make the Workbench projection stale without recording who
performed the repair, which failure it answered, or whether the new bytes were
independently verified. Re-authorizing the original
[external Blog runtime](../../apps/autonomy/experiments/agent-era-blog-mission-runtime.ts)
would misrepresent a known local repair as another external model decision and
would violate the receipt's one-use boundary.

Retained evidence:

- Mission: `principal-workbench-dogfood`
- turn: `agent-era-blog-9b5e99c2-794d-48db-ae8a-cc64ce130989`
- effect: `agent-era-blog-9b5e99c2-794d-48db-ae8a-cc64ce130989:batch:1`
- original independent report digest:
  `9e2ca520cde45c893ca27c4613d705151b03b6dceecb56885a3c851dc68533e9`
- corrected v2 candidate check: build and migration passed; the content-contract
  probe failed with `ReferenceError: index is not defined`.

## Required form properties

The system needs a separately visible local correction movement related to the
failed effect. The first live trial has not yet proved that this requires a new
effect-journal lifecycle.

A chat-only or direct file edit is rejected because the Principal cannot
recover its cause, actor, scope, or verification standing. A Skill is rejected
because the gap is enforced execution state, not a repeated judgment method.
A second external execution proposal is rejected for the current repair because
no new external inference is required. Reopening or overwriting the original
effect is rejected because it would destroy historical fact.

The smallest first comparison uses the existing correction path from
[Decision 050](050-principal-workbench-supervised-mvp.md): an ordinary Mission
correction input or project-owned Mission record retains the reason, actor, and
source; Git retains the candidate bytes and diff; a new Blog candidate report
retains independent verification; and the Workbench joins those sources as a
projection. Only an action or reconstruction probe showing that this
combination cannot bind, constrain, or recover the repair would justify a
first-class correction-effect lifecycle.

## Proposed control relation

The desired behavior is:

1. independent verification may reject a settled effect without losing its
   immutable evidence;
2. an authorized local actor may open a separately identified local correction
   movement against that exact failed subject without external inference;
3. the correction is bound to the observed candidate state, declared write
   scope, actor/source attribution, and the failure evidence it answers;
4. Git retains the new bytes and diff while the correction carrier retains
   causal and attribution evidence;
5. a designated independent verifier judges the corrected subject; and
6. the Principal Workbench shows the failed effect and correction as a causal
   chain while keeping product acceptance and integration withheld.

Git remains authoritative for worktree bytes and state. The original append-only
effect journal retains only the original execution and verification evidence.
The Mission source or input retains the correction obligation and attribution;
the new verification report retains its scoped judgment. The Workbench is a
rebuildable projection over those sources. A correction does not amend the
original verdict, inherit external-disclosure authority, grant
commit/merge/publication, or become product acceptance.

## Authority and recovery

| Action | Owner |
|---|---|
| observe the failed verification and propose a bounded repair | supervisor or human participant |
| authorize local correction execution | human instruction or another declared host authority |
| apply the correction inside the declared isolated worktree scope | named local actor |
| retain candidate bytes and diff | Git |
| retain attribution and causal relation | Mission correction carrier |
| retain subject hashes and check result | Blog candidate verifier/report carrier |
| verify the corrected subject | verifier independent of the correcting actor |
| accept product meaning or integration | human Principal through the Mission and integration protocol |

If the candidate state no longer matches the failed effect's verified subject,
the correction must refuse to start rather than guess a base. If correction
execution is interrupted, its carrier must expose that it has no independently
verified result. The owning runtime must determine whether that condition is
represented by existing Mission/Git state or needs a later effect lifecycle. A
failed correction never recursively authorizes another action.

## Minimum comparison trial

Test a Blog-local joined correction movement before adding a new effect type:

- retain one ordinary Mission correction input or project-owned Mission record
  that names the existing failed effect and its exact subject;
- accept no external provider, disclosure, or model budget;
- permit only `db/schema.ts`, the file implicated by the retained failure;
- retain actor/source attribution and the candidate state observed before the
  edit;
- persist a fresh Blog v2 candidate-verification report without allowing the
  correcting actor to accept its own work; and
- project both the original failure and the correction in the Principal
  Workbench.

The exact correction carrier, authorization binding, report location, command,
and projection join are `[owning autonomy/workbench runtime to determine]`.
If this smaller combination cannot reconstruct the cause-to-diff-to-verdict
chain or constrain the write before it occurs, return with that evidence before
proposing a first-class correction effect. This decision does not generalize
the path to every project until the Blog trial demonstrates that the relation
is sufficient.

## Evaluation

Baseline: a direct post-settlement edit makes the current effect stale and
provides no visible repair movement.

Treatment A: apply the missing `index` import through the joined
Mission/Git/report correction movement while leaving the original failed effect
immutable.

Treatment B is conditional: introduce a separately governed correction-effect
lifecycle only if Treatment A cannot bind authority before the write or cannot
reconstruct the correction afterward.

The trial supports this decision only if:

1. the UI preserves the original failed verdict and exposes the related local
   correction separately without making the join a new fact source;
2. stale subject state, paths beyond `db/schema.ts`, external execution, and
   self-acceptance are rejected;
3. the corrected candidate passes the Blog v2 content contract without changing
   unrelated files;
4. commit, merge, publication, and product acceptance remain withheld; and
5. the added runtime and human-attention cost is lower than another external
   execution proposal for this known repair.

Promote Treatment B only if the correction still requires hidden operator
knowledge, cannot be reconstructed from retained evidence, or cannot constrain
the write before it occurs. Reconsider both forms if their protocol burden makes
a fresh isolated execution safer and cheaper.

## Treatment A result

Treatment A was run against the retained Blog failure without another external
model execution. A structured Mission correction input was appended before the
repair, the missing `index` import was added to `db/schema.ts`, and the
[Blog-local verifier](../../apps/autonomy/src/local-correction.ts)
produced an immutable passing report with digest
`44b0ffb003ab18010bac8366bfb207f5fa57a7f939fdc866166700808fea4de5`.
The Workbench projection preserved the original `failed` verdict as stale,
showed the correction separately as `verification-passed`, and kept commit,
merge, publication, and product acceptance withheld.

This supports evaluation conditions 1, 3, and 4. Condition 5 is only partially
supported: the report proves `provider: null` and zero model budget, but the
human and protocol cost was not measured against a comparable fresh execution.
Condition 2 is not satisfied:

- [Mission correction input](../../apps/autonomy/src/mission-input.ts)
  validates a declared subject and scope before it is retained, but the actual
  file edit does not pass through that scope;
- the verifier rejects a changed failed-subject file after the edit, rather
  than constraining the write before it occurs, and its subject comparison
  cannot by itself reject a newly added path outside `db/schema.ts`;
- the retained `actorRef` and `sourceRef` identify the correction input, not
  the local actor that applied the bytes; and
- the report retains before/after hashes but no correction patch or manifest,
  so the exact repair cannot be reconstructed after the dirty worktree moves.

The trial therefore exhibits all three reconsideration signals: hidden
executor knowledge, incomplete reconstruction, and no mechanically constrained
write path. Treatment A remains useful evidence that Mission input, a separate
verification report, and a rebuildable Workbench projection can carry the
causal relation. It is not a sufficient correction execution boundary.

## Minimum Treatment B form

Do not yet create a cross-project correction-effect lifecycle. The minimum next
form is a Blog-local controlled correction-apply runtime capability:

1. read one retained correction input and its exact failed-effect subject;
2. bind the local executor separately from the input actor and source;
3. check Git HEAD, subject hashes, and the complete candidate path delta before
   applying any bytes;
4. admit only a patch whose touched paths are contained by the declared
   correction scope;
5. share the writable-effect worktree lease domain so another effect or
   correction cannot pass preflight against the same candidate concurrently;
6. persist a content-addressed patch and prepared manifest before applying
   bytes, then a final manifest bound to the exact expected after-subject;
7. expose prepared-but-unsettled bytes as interrupted or uncertain rather than
   reconstructing success from operator knowledge; and
8. leave semantic verification to the fixed independent Blog verifier, recheck
   the manifest subject after verification, and keep all
   integration or product authority withheld.

Mission input remains the causal and authorization carrier, Git remains the
candidate-state owner, the controlled apply capability owns only constrained
execution evidence, and the verifier report owns the corrected-subject
judgment. The Workbench remains a projection over those sources.

The first interruption probe showed that a one-shot apply could leave modified
bytes between patch application and final-manifest persistence. The bounded
Blog carrier therefore needs durable prepared and final evidence plus
candidate-wide lease recovery, and its activity projection must distinguish
`apply-interrupted`, `apply-uncertain`, `applied-unverified`, and verified
states. This remains project-specific Treatment B evidence, not a general
effect lifecycle. Generalize only if a substitution probe shows a second
project needs the same invariant mechanism rather than a project-specific
adapter.
