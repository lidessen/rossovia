# Rossovia entry map for dogfood

This reference keeps the Skill's prompt small. It is a routing map, not a
second command authority. The current checkout's scoped Workbench instructions
and the project's own sources win when they differ.

## Read only what the request needs

| Question | Source of truth | Read when |
|---|---|---|
| How to resolve a project, worktree, Task, worker, or local action | [Workbench agent instructions](../../../apps/workbench/AGENTS.md) | Before using a Rossovia command or changing persistent Task state |
| How branch, review, publication, merge, and cleanup are authorized | [Operating Protocol](../../../design/operations/OPERATING-PROTOCOL.md) | When the work leaves the local Task/worktree |
| How Rossovia's own local rebuild, restart, observer, and rollback loop is shaped | [Dogfood development profile](../../../design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md) | When Rossovia itself is the target or a runtime snapshot is being replaced |
| What a target product or runtime owns | The target repository's `AGENTS.md`, design, and tests | After project resolution and before editing |
| How a conversation entry task is owned | [Conversation Command Entry roadmap](../../../design/operations/CONVERSATION-COMMAND-ENTRY-ROADMAP.md) | Only for that product surface |

## Ordinary command vocabulary

Use the launcher from the repository root. The exact flags and revision guards
belong to the scoped Workbench instructions; these names are only the semantic
map:

```text
init                         establish/complete the local Workbench home
root add                     add an explicitly supplied workspace root
project list / resolve       inspect registered projects and exact routing
worker list                  inspect current worker capabilities and policy
task list / show             inspect existing Task state before mutation
task create                  create one human-authorized bounded Task
task run                     execute one Task in its bound linked worktree
task attempts                inspect attempt/final/settlement evidence
task submit / append-review  retain a claim or independent assessment
```

Do not copy command flags into a Skill prompt when the scoped Workbench file
already owns them. Do not treat a worker name, a successful attempt, or a
review opinion as acceptance.

## Rossovia self-development safe point

When the target is Rossovia itself, use the existing profile's sequence:

```text
known-good local tag → build the coupled local runtime → restart → smoke check
       ↘ serious regression → rebuild from the tag and retain the observation
```

The optional observer is a read-only worker over standard settled evidence. It
records an opinion or an API visibility gap; it does not become a resident
controller, a queue, or an automatic fixer. “Process recent workflow reviews”
is an ordinary Task prompt that reads those observations and records a
disposition without rewriting the original record.
