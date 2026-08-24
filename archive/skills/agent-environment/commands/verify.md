# Verify an Agent Environment

Check whether the declared in-scope agent capabilities actually reach their
ordinary use surfaces and preserve their safety boundaries.

1. Fix the declared setup scope, desired source or source locator, target
   device, relevant versions, ordinary use paths, and expected observations.
   When a portable profile exists, fix its revision. Verification does not
   modify the desired source or accept its own findings.
2. Use supported diagnostics only for the selected surfaces—for example skill
   discovery, harness guidance, runtime configuration, or authentication
   status. Do not inspect unrelated MCP, hook, permission, provider, or account
   state merely because the tool exposes it. Redact values and do not infer
   successful loading from path presence alone.
3. Run one harmless ordinary-use probe per selected capability that exercises a
   distinctive instruction or behavior. Prefer built-in inspection commands;
   otherwise use a bounded prompt whose expected evidence is named in advance.
   If the capability mutates a user-owned state root, the probe must perform and
   clean up a real create–rename–remove operation through the target runtime.
   Existing readable state, a syntax-valid permission entry, or a hook process
   that can write under different permissions is insufficient.
4. Run boundary probes appropriate to the selected scope: confirm one adjacent
   unselected capability was not changed and one relevant unmanaged item was
   preserved. When cross-tool translation is in scope, keep an unsupported
   setting visible rather than silently translating it. For a skill setup,
   confirm that the declared source was used—or that execution stopped for a
   missing source—and that no marketplace candidate silently became desired
   state. For every applied projection, compare the named recurring action with
   the unchanged case and identify any new always-on context, dependency,
   updater, duplicate source, or maintenance obligation. A projection with no
   observable material gain is `repair`, not successful parity. At user scope,
   also classify project-specific truth or specialized behavior as misplaced
   unless an explicit recurring cross-project need justifies it.
   If the target harness was not installed within the declared scope, report
   ordinary-use verification as deferred rather than broadening setup to
   install the runtime.
   When an installed capability-discovery skill can match the same raw request,
   run one classifier-level boundary probe with the actual installed skill set.
   Do not name `agent-environment`, forbid search in the prompt, or reveal the
   expected route. Treat marketplace activity before source input as a failed
   setup boundary even if a later step recovers. Also fail the boundary if the
   run inventories the active host after the raw task declares a different or
   hypothetical target, or performs any lookup before returning `NEEDS_INPUT`
   for a missing selected source.
   Run routing probes in a disposable target with secret-bearing environment
   variables removed and no readable credential, session, or user-data roots.
   A probe that requires live authentication is not an acceptable safety test;
   defer it or use a runtime-supported mock/classifier surface.
5. Compare observations with the declared source and, when present, its profile
   and reconciliation ledger. Classify every in-scope requirement as
   `supported`, `repair`, `manual`, `unsupported`, or `not-tested`; include the
   source and runtime evidence for that disposition.
6. Return the smallest repair for failed items and the event that should reopen
   verification, such as a tool upgrade, profile revision, device replacement,
   changed credential scope, or lost discovery path.

Do not report full success from syntax checks alone. At least one actual
instruction/capability observation and one preservation/exclusion observation
must come from the target environment.
