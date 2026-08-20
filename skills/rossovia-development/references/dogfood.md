# Dogfood mode reference

Dogfood is the local-Rossovia mode of the broader `rossovia-development`
Skill. Read the project-local [development profile](../../../design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md)
for snapshot tags, paired build/restart, smoke checks, rollback, observer
records, and human intervention.

The important relation is simple: when local Rossovia dogfood is enabled,
Rossovia is the preferred producer and the external harness is an observer or
bounded fallback. Do not turn dogfood into a permanent daemon, queue, or second
task lifecycle.
