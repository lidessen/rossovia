# Operating contracts and migrations

This directory holds the collection's **human-initiated operating protocol**
and external-configuration record. It is downstream of
[the design](../DESIGN.md) and [decision 015](../decisions/015-human-initiated-formal-operations.md),
not a second semantic source or a permanent agent headquarters.

The name `operations/` is retained for existing links and history. Read it as
“how an accepted design is operated, migrated, configured, or handed off”, not
as “all design documents”. New semantic design belongs in the
[design map](../README.md).

| Artifact | Role | Authority boundary |
|---|---|---|
| [OPERATING-PROTOCOL.md](OPERATING-PROTOCOL.md) | Repeated mission route from human mandate to disposition | Does not approve, merge, or schedule work |
| [DECISION-BRIEF.md](DECISION-BRIEF.md) | Compact option set and recommendation at a material human gate | Does not decide, turn silence into consent, or replace source evidence |
| [GITHUB-SETTINGS.md](GITHUB-SETTINGS.md) | Evidence-gated manual configuration for the remote repository | Does not change remote settings by itself |
| [Mission Records](../../apps/missions/README.md) | Git-tracked continuity source for one material mission and its return branches | Does not create a queue, accept facts, or schedule work |
| [Conversation Command Entry roadmap](CONVERSATION-COMMAND-ENTRY-ROADMAP.md) | Maps the conversation-entry migration stages to their authoritative design and evidence | Does not replace the owning module contracts or current Mission projection |
| [Rossovia configuration](ROSSOVIA-CONFIGURATION.md) | Maps provider/worker policy, preferences, Settings, and restart ownership | Does not become a second provider policy or expose credentials |
| [Rossovia directory layout](ROSSOVIA-DIRECTORY-LAYOUT.md) | Maps project-local and user-level Rossovia home/artifact boundaries | Does not migrate persisted homes by documentation alone |
| [Rossovia skill sources](ROSSOVIA-SKILL-SOURCES.md) | Separates Main Agent and worker skill sources and loading timing | Does not grant worker access to user-custom skills by implication |
| [Rossovia development Skill](ROSSOVIA-DEVELOPMENT-SKILL.md) | Prompt-shaped mode and delegation guidance for developing a project through Rossovia | Does not implement domain code or become a new authority |
| [Rossovia Dogfood Development](ROSSOVIA-DOGFOOD-DEVELOPMENT.md) | Optional prompt-like profile for rebuilding, replacing, observing, and recovering a local Rossovia runtime | Does not create a daemon, review queue, task lifecycle, or automatic authority |
| [Observations and corrections](../observations/README.md) | Source-linked record relation shared by workflow observer opinions and Principal corrections | Does not merge their authority or create a review queue |

The first founding transition is retained as a completed finite campaign at
[`design/organization/sessions/2026-07-10-formal-operations-preparation.md`](../organization/sessions/2026-07-10-formal-operations-preparation.md).
Future material work opens a new mission only when its side branches need a
durable return contract.
