<!-- observation-record
{
  "id": "obs-20260715-self-install-source-alias",
  "schema": "observation-record.v1",
  "kind": "observation",
  "occurredAt": "2026-07-15T12:26:48Z",
  "recordedAt": "2026-07-15T13:08:39Z",
  "subject": { "type": "repository-safety-incident", "id": "skills-self-install-source-alias" },
  "observations": [
    { "name": "trigger", "value": "Running `npx skills add . --help` from the repository performed an installation instead of displaying help." },
    { "name": "impact", "value": "The installer targeted `.agents/skills`, which resolves to the repository source directory through `.agents/skills -> ../skills`, and removed source skill contents while reporting success." },
    { "name": "recovery", "value": "Tracked skill files were restored from HEAD; the two untracked skill packages were reconstructed from successful patch records; no tracked deletions or root skills-lock.json remain." },
    { "name": "prevention", "value": "A repository-local probe now copies one skill to a disposable source snapshot, installs into a separate disposable project, and compares file hashes before both are deleted." },
    { "name": "verification", "value": "Five deterministic safety tests passed; disposable installations matched 20 visual-design files and 12 improve-agent-workflow files." }
  ],
  "method": {
    "kind": "instrument",
    "name": "agent terminal observation and recovery audit",
    "limitations": [
      "No pre-incident hash manifest existed for the untracked packages, so their byte-for-byte identity before the incident cannot be independently proven.",
      "The successful disposable probes establish current packaging integrity, not semantic acceptance of either skill."
    ]
  },
  "provenance": {
    "sourceRole": "primary",
    "sources": [
      { "locator": "self: this Markdown source record", "role": "raw" },
      { "locator": "git working tree and Codex terminal transcript for 2026-07-15", "role": "supporting" }
    ]
  },
  "quality": {
    "status": "reviewed",
    "limitations": [
      "Recovery of tracked files is Git-backed; recovery of previously untracked files is patch-history-backed rather than pre-incident-hash-backed."
    ]
  },
  "observer": { "kind": "agent", "id": "codex-primary-session" },
  "recorder": { "kind": "agent", "id": "codex-primary-session" },
  "classification": "internal"
}
-->

# Observation — repository self-install aliased the source tree

## What was observed

At 2026-07-15T12:26:48Z, the agent ran `npx skills add . --help` from this
checkout expecting a read-only help command. The CLI instead installed all
discovered skills. Its target, `.agents/skills`, is a symbolic link to the
repository's own `skills/` source directory, so the installer's overwrite path
and source path referred to the same filesystem state. It removed source skill
contents and still reported the installation as successful.

The tracked skill tree was restored from Git `HEAD`. The untracked
`visual-design` and `improve-agent-workflow` packages were reconstructed from
the session's successful patch records. The post-recovery audit found no
tracked deletion and no accidental root `skills-lock.json`. Because the
untracked packages had no pre-incident hash manifest, exact byte identity with
their pre-incident state cannot be independently established.

## How and where it was observed

The CLI transcript named the source as `/Users/lidessen/workspaces/skills` and
the targets as paths below `~/workspaces/skills/.agents/skills/`. A filesystem
check resolved `.agents/skills` to `/Users/lidessen/workspaces/skills/skills`.
The immediate post-command source loss and the recovery commands remain in the
same Codex session transcript.

## Evidence and limitation

The repository now documents the self-install prohibition and provides
`scripts/probe-skill-installation.py`. Its local suite rejects equal, nested,
and symlink-aliased source/target paths. Fresh disposable probes installed and
hash-matched 20 files for `visual-design` and 12 files for
`improve-agent-workflow`.

This establishes a fail-closed path for future packaging checks and verifies
the current reconstructed packages can be copied intact. It does not prove
semantic skill quality, and it cannot retroactively provide the missing
pre-incident hashes.
