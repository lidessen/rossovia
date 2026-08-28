# Migrate an Agent Environment

Reconstruct an accepted personal coding-agent environment on a target device
without treating the source device as a disk image.

1. Fix the source profile revision, source and target devices, in-scope tools,
   accepted outcomes, exclusions, and rollback boundary. If no portable source
   exists, audit the source device and prepare a proposed profile before any
   target mutation.
2. Inventory the target independently. Classify target-only instructions,
   configurations, skills, permissions, and capabilities as preserve, local
   override, conflict, retire, or unknown. Never delete target-only state merely
   because it is absent from the source profile.
3. Build a reconciliation ledger with one row per portable workflow component:
   `source locator`, `target surface`, `classification`, `action`, `rollback`,
   `verification`, and `status`. Keep secret prerequisites and machine-local
   exclusions in separate rows with no values.
4. Read only the relevant sections of `references/tool-surfaces.md`, then verify
   current official documentation and target versions. Prefer supported native
   import or settings-sync flows when they preserve the declared source and can
   be audited afterward. Treat their result as a tool projection, not the
   portable source.
5. Apply the smallest ordered transitions. Install or activate the tool,
   reconcile non-secret configuration, install referenced skills/plugins,
   configure MCP/hooks/permissions, then perform interactive authentication.
   Checkpoint before each step and stop on syntax, precedence, ownership, or
   concurrent-change conflicts.
6. Verify from the target's ordinary entry paths. Confirm instruction delivery,
   one portable capability, authentication status without values, and one
   preserved target override. Confirm at least one excluded session/cache item
   was not copied.
7. Settle every ledger row as `applied`, `preserved`, `adopt-upstream`,
   `deferred`, `unsupported`,
   `failed`, or `not-applicable`. Return the receipt and the exact manual action
   for any non-settled requirement. Do not call a partial migration complete.

When source and target tools differ, translate intent only where the target has
a faithful supported surface. Keep the remainder as an explicit tool-specific
commitment or unsupported item; never fabricate semantic parity.
