# Rossovia development runtime modes

This reference defines the mode decision for the `rossovia-development` Skill.
It is a prompt-shaped method, not a launcher implementation or a new authority.

## Mode evidence

Confirm the active mode from the current runtime, not from a remembered flag:

| Evidence | Mode conclusion |
|---|---|
| Local Rossovia launcher/runtime is reachable and dogfood is explicitly enabled | local dogfood |
| Launcher is reachable but dogfood is explicitly disabled | external-only |
| Launcher, worker catalog, or local state cannot be verified | external-only with the missing capability recorded |

The desired launcher contract is `--dogfood`: enabling it also enables the
ordinary read-only observer. An explicit disable option may turn the observer
off for a local diagnostic, but a separate observer-enable flag is not required
inside dogfood mode. Until the active runtime implements this contract, use its
current help and record the difference rather than inventing a hidden switch.

## Local dogfood ownership

Rossovia owns the normal Task/Run write effect. An external harness can:

- inspect standard evidence and report a source-linked observation;
- help shape a bounded Task or verify its result; or
- take a fallback write only after Rossovia has hit a named implementation,
  provider, tool, or evidence boundary and that reason is retained.

Do not start a second producer for the same effect. After any fallback edit,
rebuild and restart the local runtime before continuing dogfood.

## External-only ownership

The external harness owns the active development session. Main keeps the whole
and uses the delegation topology only where it buys independent evidence,
attention, isolation, or latency. Direct work remains preferable for a small
coupled change. A design worker and implementation worker must not edit the same
surface; a verifier remains read-only and fresh from producer reasoning.

## Shared boundaries

Both modes use the same project sources, worktree discipline, verification
boundary, return contract, and human acceptance. Mode selection changes the
producer and context carrier; it does not change source authority or acceptance.

If the runtime mode changes during a task, record a mode transition and retain
the original source/effect identity. Do not silently duplicate or restart the
same contribution under another carrier.
