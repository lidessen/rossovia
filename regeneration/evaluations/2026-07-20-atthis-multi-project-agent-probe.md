# Atthis Multi-Project Agent Probe

**Status:** accepted bounded probe

**Date:** 2026-07-20

**Carrier:** native read-only sub-agent with disposable Git fixtures

## Claim

The cross-project path in the [Atthis workbench decision](../../design/decisions/038-atthis-workbench-entry.md#ordinary-agent-entry)
lets an ordinary Agent recover heterogeneous project-owned task projections
without making Atthis a second task source. An unsupported project must remain
visible and make the combined task view incomplete.

## Fixture and method

The probe created a disposable Atthis home and three committed Git repositories
under `/tmp/atthis-multi-project-agent-probe.q4mZCk/`. Every Atthis invocation
supplied that home explicitly; the real `~/.atthis` was not used. The Agent ran:

```text
python3 scripts/atthis.py --home <fixture>/home project list
```

The inventory reported all three registered projects as available and returned
only `AGENTS.md` as their instruction file. The Agent read those files, then:

- ran `python3 tools/list_tasks.py` from project Alpha;
- ran `./bin/task-status --compact` from project Beta; and
- reported project Gamma as `unsupported` because its returned instructions
  declared no task-continuity source.

Both declared commands exited zero and their outputs passed the distinct schemas
declared by their projects. The Agent did not inspect Gamma's README, Git history,
branches, or another inferred task source.

## Observed projection

```json
{
  "inventoryComplete": true,
  "taskViewComplete": false,
  "projects": [
    {
      "projectId": "fixture:alpha",
      "support": "supported",
      "tasks": ["alpha-release"]
    },
    {
      "projectId": "fixture:beta",
      "support": "supported",
      "tasks": ["beta-index"]
    },
    {
      "projectId": "fixture:gamma",
      "support": "unsupported",
      "tasks": []
    }
  ]
}
```

The inventory remained complete because every registered workspace was verified.
The combined task view remained incomplete because one available project did not
declare a supported continuity source. This preserves the distinction required
by the [Atthis workbench decision](../../design/decisions/038-atthis-workbench-entry.md#ordinary-agent-entry).

## Mutation evidence

Before and after the query, every fixture retained its original HEAD, clean
tracked status, and task-source blob hash:

| Project | HEAD | Task-source blob before and after |
|---|---|---|
| Alpha | `8892b6a66c5120a81d1b4d3aafa38484dc73dc66` | `b48a454a82204c613c65999bac59a092d9fcebce` |
| Beta | `7c25e76d518073d6e0cea67bc5739d373827c2aa` | `7942bfd65b30f35fd72a59ae545f8f7f1960532f` |
| Gamma | `e1b95412492a68cfa2479ba8bd8726893a0cdf9c` | no task source |

The workbench remained clean at
`5d91fe645fb0c22fda9f8be7f669e612a2b94ec8`, the merge commit for the
[explicit-preference PR](https://github.com/lidessen/skills/pull/39).

## Decision

Accept the third multi-project Mission condition for this bounded Agent path.
This proves heterogeneous declared queries, unsupported-project visibility, and
read-only aggregation. It does not prove that every external project declares a
continuity source, nor does it add automatic execution, scheduling, or a common
cross-project task schema.
