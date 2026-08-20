# Observations and corrections

This is the design home for source-linked evidence that can improve the next
practice. It describes two related record families; it does not introduce an
inbox, queue, review lifecycle, or cross-source runtime projection.

## Keep the record families separate

“Observation” is the broad relation. The concrete terms below name different
producers and authorities:

| Record | Durable source | Writer | Reader | Authority |
|---|---|---|---|---|
| Workflow observer review | `<home>/state/workflow-reviews.jsonl` | `appendWorkflowReview` | `readWorkflowReviews` and the secondary UI projection | A worker opinion about a settled project attempt; it cannot change the Task or Worktree |
| Intervention observation | `<state-file>` plus `<state-file>.observations/*.json` | `intervention observe` or an intervention hook | `intervention status` | Prompt evidence retained as byte count and digest; it is not a review verdict |
| Principal correction | `<state-file>.receipts/*.json` | `intervention correct` | `intervention status` | A Principal direction for the next practice; Task mutation still uses the canonical Task command |

The workflow review log has its own schema (`reviewId`, `recordedAt`,
`subject`, `observer`, `standing`, `evidenceRefs`, and `finding`). Intervention
state has a different schema for prompt observations and correction receipts.
The readers may normalize legacy workflow records while reading, but neither
reader merges the two source families.

`intervention status` returns a read-only, intervention-local record projection
so a caller can inspect prompt observations and Principal corrections together.
That projection is not the workflow observer log and is not a unified runtime
view of all observations. The UI's observer surface reads workflow reviews;
the intervention CLI reads intervention state. Any future secondary surface
must preserve these source and authority boundaries.

## Authority and processing

Workflow observer reviews are project-agnostic. Dogfood is one producer mode,
not their data model. The observer uses standard Task/attempt/transcript/diff/
check APIs and can review any registered project's settled work. Processing a
workflow review is an ordinary Task prompt (“read, comment, route, defer, or no
change”), not an inbox, scheduler, or special review lifecycle.

`rossovia task correct` is different: it mutates the canonical revision-
guarded Task and can reopen or supersede a submitted claim. It may cite an
intervention correction, but it is not another spelling of the intervention
command. The old top-level `correct` writer is removed during development;
old persisted workflow records remain readable only through the compatibility
reader.

New workflow and intervention public identifiers use the `rossovia.*`
namespace. The existing `ROSSO_HOME` environment variable and
`rosso.dogfood-review.v1` log version are persisted identifiers; they are
accepted only as read-compatible legacy inputs until a separately verified
home/namespace migration exists.

## CLI relation

```text
rossovia intervention observe   # retain prompt evidence without prompt text
rossovia intervention correct   # append one Principal correction receipt
rossovia intervention status    # read the intervention-local projection
rossovia observer                # run one detached workflow review
```

## Source map

- Intervention source and local projection: [`apps/workbench/src/interventions.ts`](../../apps/workbench/src/interventions.ts)
- Workflow observer source and append-only log: [`apps/workbench/src/workflow-observer.ts`](../../apps/workbench/src/workflow-observer.ts)
- Canonical Task correction: [`apps/workbench/src/tasks.ts`](../../apps/workbench/src/tasks.ts)
- Secondary workflow-review surface: [`apps/gateway/src/ui-server.ts`](../../apps/gateway/src/ui-server.ts)
- Operating route: [`../operations/OPERATING-PROTOCOL.md`](../operations/OPERATING-PROTOCOL.md)
