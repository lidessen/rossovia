# Sync the Packaged Sequence Snapshot

Maintainers only. A target-project task run must not overwrite packaged snapshots.

1. From the skills collection root, run
   `python3 scripts/sync-sequence-snapshot.py <skill-name>`.
2. Use `--all` to refresh every packaged snapshot. The script's
   `SNAPSHOT_SKILLS` declaration is the authoritative current target list; do
   not duplicate that evolving list in this command prompt. Use `--all --check`
   to verify committed projections without writing them.
3. `skill-engineering` always receives the full current interpretation set per
   [portable snapshot decision](../../../design/decisions/004-portable-sequence-snapshots.md).
   Other skills receive only their `Primary` and `Supporting` P-IDs from
   `SKILL.md`.
4. Commit the generated `references/sequence.md` and, for a team-selecting
   skill, `references/sequence-interpretations/` with the skill change. Do not
   hand-edit generated package files.
5. After changing `principles/SEQUENCE.md` or any selected interpretation,
   re-run the script before release. Runtime `refresh-sequence` may compare
   against upstream for one task, but durable refresh happens here.
