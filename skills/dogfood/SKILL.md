---
name: dogfood
description: >-
  Use when a user enters through Rossovia and asks to improve, fix, optimize,
  or develop a named project, including Rossovia itself. This on-demand Skill
  guides project discovery, linked-worktree and Task setup, bounded execution,
  verification, local rebuild/restart, snapshot rollback, and optional review
  observation through Rossovia's existing capabilities. It does not implement
  domain code, stay resident, create a new lifecycle, or replace project
  authority. Trigger phrases include "dogfood", "自我改进", "优化下项目",
  "修一下", and "让 Rossovia 修改自己".
argument-hint: "[project or repository] [requested improvement]"
---

# Dogfood

## Principle expression

**Primary:** P16
**Supporting:** P09, P15, P13

## Purpose

Use this Skill only when a user wants Rossovia to improve a real project through
the Rossovia conversation entry. It is a method for choosing and using the
existing project, Task, worker, worktree, evidence, and local runtime surfaces;
it is not the implementation method for the project's code.

The Skill is loaded for the request and then released. Do not add its workflow
to a resident instruction, a daemon, a queue, or every ordinary coding turn.
When the request is only to review a running product from a user's perspective,
use `product-dogfood-review` instead. When it is ordinary coding outside
Rossovia, do not activate this Skill.

## Start with the user's request

Recover this small object before using a tool:

```text
Project/repository the user means:
Change or improvement requested:
Observable outcome that would count as useful:
Boundaries, affected surfaces, and non-goals:
Current runtime or local snapshot, if Rossovia itself is the target:
Human authority still required:
```

Do not infer a project from a vague noun, a directory scan, or a previous
conversation. If the project is missing or ambiguous, ask for the smallest
identity needed to resolve it. If the requested outcome is not concrete enough
to verify, turn it into one bounded next observation before creating a Task.

## Rossovia development loop

Follow the existing Rossovia entry and its authority boundaries; the detailed
source map and command vocabulary are in
[references/rossovia-entry.md](references/rossovia-entry.md).

1. **Resolve the project.** Confirm that the named project is registered and
   that its current local Git root can be read. Register only an explicitly
   supplied project identity; never discover and register arbitrary folders.
2. **Find a safe worktree.** Inspect the project's current work and Tasks. Use
   one exact linked worktree for one write owner. If no suitable worktree exists,
   create or rebind it through the normal Workbench Task surface. Do not edit a
   primary checkout, share a dirty worktree, or create a parallel lifecycle in
   the Skill.
3. **Shape one Task.** State the smallest change, the files or behavior in
   scope, the acceptance observation, the checks that can disconfirm it, and
   the return evidence. Keep a second problem as a later observation unless it
   is required to make this Task truthful.
4. **Select an available worker.** Query the current worker catalog and host
   policy. Use the economical available profile for routine implementation;
   use a stronger or different profile only when the task's ambiguity or
   consequence makes that change decision-relevant. Record the actual resolved
   worker/provider/model in the Task evidence. Do not encode today's account
   availability or provider order in this Skill.
5. **Run through Rossovia.** Start the exact Task in its bound worktree. Do not
   bypass the Task surface with an untracked edit, a second runner, or an
   invented retry. A failed run is evidence for correction or recovery, not a
   reason to silently restart with a new identity.
6. **Verify the user outcome.** Re-read the changed source and run the smallest
   representative check at the real boundary. Separate mechanical checks,
   product/use observations, worker claims, and Principal acceptance. If the
   check cannot run, return the missing capability and its consequence rather
   than calling the change successful.
7. **Advance the local runtime when Rossovia itself changed.** Preserve a
   known-good local snapshot, build the coupled local runtime, restart it, and
   perform a smoke check before using the replacement for more work. Keep
   moving forward for ordinary usability observations; roll back only a
   serious boot, state, control, data, or core-task regression. The snapshot
   tag is a local rollback anchor, not a release or acceptance.
8. **Return a reconstructible result.** Report project, Task, worktree, source
   identity, changed behavior, checks, runtime identity, unresolved gaps, and
   the next human decision. A worker result is evidence; it is not acceptance,
   merge, publication, or a license to create follow-up work.

## Optional observation and review

If the local Rossovia runtime has its observer option enabled, let it record a
small read-only opinion after a settled Task or conversation Run. The observer
uses standard Task/attempt/transcript/diff/check APIs and records only findings
that could change the next practice: defect, regression, friction, ambiguity,
or a query/observability gap. It must not edit, retry, accept, merge, roll
back, or block the task.

If evidence is not visible through the standard API, record that as the finding
and name the smallest structured field or locator that would make the next
review possible. Do not teach the observer to read private files as a shortcut.
At a human-chosen point, “process recent dogfood reviews” is an ordinary Task
prompt: read unprocessed observations, avoid duplicates, and record for each
`read/commented`, `routed to a normal change Task`, `deferred`, or `no change`.
This is a prompt-shaped convenience, not an inbox, scheduler, queue, or new
schema. It never mutates the original observation.

## When Rossovia cannot cross the boundary

Prefer Rossovia dogfood. If an implementation, provider, tool, or evidence
surface prevents it from making the next truthful step, the user may intervene
directly in the source. Record why the normal path was insufficient, keep the
change smallest, and return to the same resolve → worktree → verify → rebuild/
restart loop. Direct intervention does not silently grant acceptance or merge
authority; it makes the blocked capability a visible improvement candidate.

## Non-goals

- no project implementation recipe or framework-specific code;
- no resident prompt, daemon, observer queue, or special review lifecycle;
- no automatic Task creation, retry, acceptance, rollback, merge, or publish;
- no provider/model preference copied from a transient account or session;
- no replacement for the Workbench instructions, Operating Protocol, project
  design, or Principal decision.

## Return contract

```text
Project and requested outcome:
Resolved project/worktree/Task identity:
Source and runtime snapshot:
Change and observable result:
Checks and boundary evidence:
Worker/observer evidence and limitations:
Unresolved risk or query gap:
Next ordinary action and Principal decision:
```

## Principle source

When the host declares `principles/SEQUENCE.md`, it governs this activation;
read only P16, P09, P15, and P13. Otherwise use the packaged
[Sequence snapshot](references/sequence.md). The snapshot is a read-only
lineage projection, not a second canon.
