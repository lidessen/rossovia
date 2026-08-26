# Reconcile an Evolving Agent Workflow

Apply an approved user-level workflow-source change to one or more existing
tool/device projections without treating synchronization as whole-file mirroring.

1. Fix the old and new workflow-source revisions, the target devices/tools,
   their last receipts, and the intended behavior change. If no trustworthy
   applied baseline exists, perform a read-only audit and treat the update as a
   first reconciliation rather than inventing history.
2. Diff source meaning before source files. Classify changed modules as personal
   instruction, context delivery, capability/tool, permission/safety, hook or
   intervention, agent role, verification, install provenance, secret
   prerequisite, or retirement. These are impact lenses, not a required schema.
3. For each affected target, compare three states: the prior applied projection,
   the current target, and the newly desired projection. Classify target drift
   as equivalent, local override, candidate source improvement, conflict,
   obsolete generated content, or unknown.
4. Read the relevant section of `references/tool-surfaces.md`, then verify the
   installed version's current official configuration, precedence, import, and
   diagnostics surfaces. Do not replay a stale vendor command from the profile
   or invent one when current help is unavailable. When a skills component is
   affected, read `references/tool-surfaces.md` under **Shared skill
   installation** before preparing its action.
5. Prepare a reconciliation ledger. Automatically propose only changes whose
   owner and merge boundary are unambiguous. Require human choice for semantic
   conflicts, changed permission scope, destructive retirement, opaque UI state,
   or promotion of target-local content into the portable source.
6. Checkpoint each target and apply the smallest structural delta. Preserve
   unmanaged keys/text and explicit local overrides. A target-local improvement
   remains local until the human adopts it in the workflow source; never make a
   generated projection bidirectionally authoritative.
7. Rehydrate only newly required credentials through supported interactive or
   secret-manager flows. Never copy a credential from the previous projection
   or source device.
8. Run ordinary-entry probes for the changed behavior and a nearby unchanged
   behavior. Confirm one local override and one machine-local exclusion remain
   intact. Syntax or file equality alone is insufficient.
9. Record the new applied source revision and projection evidence in the target
   receipt. Settle every item as `applied`, `preserved`, `adopt-upstream`,
   `deferred`, `unsupported`, `failed`, or `not-applicable`.

For every exact command or configuration key in the ledger or receipt, include
the official page, inspected `--help`, or runtime diagnostic used in this
activation. Otherwise mark the action `lookup-required` and omit the command or
key. Do not smuggle an unverified command back in as an example or equivalent.

Skills with stable package provenance may update through their currently
verified installer and then pass discovery verification. Do not spend the same
reconciliation machinery on them unless local edits or tool-specific
installation state create a real conflict. If the installer cannot be inspected
now, return its source and `current command lookup required`, not a remembered
or plausible command.
