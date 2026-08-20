# Rossovia project entry

This is the project-local entry for the Rossovia coordinating Agent. It is not
the project's `AGENTS.md`, and it is not a worker prompt.

Use it to orient the host Agent to the project without making the host config
another source of project rules:

- project development rules: [`AGENTS.md`](AGENTS.md);
- Rossovia runtime and migration: [`apps/workbench/AGENTS.md`](apps/workbench/AGENTS.md)
  and [`design/operations/CONVERSATION-COMMAND-ENTRY-ROADMAP.md`](design/operations/CONVERSATION-COMMAND-ENTRY-ROADMAP.md);
- host configuration and secondary Settings surfaces:
  [`design/operations/ROSSOVIA-CONFIGURATION.md`](design/operations/ROSSOVIA-CONFIGURATION.md);
- user-home and project-local directory ownership:
  [`design/operations/ROSSOVIA-DIRECTORY-LAYOUT.md`](design/operations/ROSSOVIA-DIRECTORY-LAYOUT.md);
- skill source and loading boundary:
  [`design/operations/ROSSOVIA-SKILL-SOURCES.md`](design/operations/ROSSOVIA-SKILL-SOURCES.md);
- dogfood development loop:
  [`design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md`](design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md).

The host Agent may use these pointers to select the smallest relevant source
and form a receiver-specific worker prompt. It must not copy this file,
`AGENTS.md`, or a full skill catalog into every worker. Worker context is an
explicit, compact projection owned by the active harness adapter.
