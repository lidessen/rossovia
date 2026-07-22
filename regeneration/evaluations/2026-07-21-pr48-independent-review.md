# PR 48 independent review

**Reviewed revision:** `f425866`

**Pull request:** [#48 — Build supervised autonomy MVP and unified task system](https://github.com/lidessen/skills/pull/48)

**Decision:** no source-confirmed merge blocker; retain the bounded residuals below.

## Review formation

The review used four read-only Work Cells rather than asking one model to absorb
the 12,027-line change as one prompt. Each packet owned one causal boundary:

1. the Work Cell Task kernel and proof boundary;
2. delegate admission, Task binding, and parent/child timelines;
3. Mission input, reconciliation, turns, runner, and supervision; and
4. the reconnecting Work Cell, autonomy, record, design, and CI interfaces.

The final run used `deepseek-chat`, four concurrent Cells, caller-defined
`submit_review` terminal tools, and no write or command authority. The Task
kernel packet was repeated with `read-update` Task projection after the first
reviewer created an unnecessary Task and left it `in_progress`; Work Cell
correctly rejected that first attempt as unsettled. The replacement run passed.

| Evidence run | Result | Observed usage |
|---|---:|---:|
| `2931d89a-a7c4-4a4f-929b-8c08970c8621` | 3 passed; Task packet rejected for its own unsettled Task | 1,442,778 total tokens; 856,192 cached input |
| `f3d52375-33ff-45a3-ad47-5b6f948ffbf9` | replacement Task packet passed | 212,411 total tokens; 110,592 cached input |

An earlier four-Cell Kimi K3 run (`1adbfd02-519d-46ed-9d59-798355f7dfa2`)
timed out before structured settlement after 2,280,807 total tokens. It is
negative execution evidence, not review evidence. A focused DeepSeek trial
also showed that `outputSchema` alone does not reliably make a tool-using
reviewer stop; the accepted review formation therefore used a terminal tool as
the explicit end action.

## Source verification of proposed findings

The model reports were treated as leads rather than acceptance authority. Each
candidate was followed into its direct implementation boundary. No candidate
survived that check:

- malformed or dangling Task dependencies are parsed through `TaskStore` and
  returned as structured Task verification errors in
  [`verifyTaskCycle`](../../packages/work-cell/src/run-cell.ts); they do not
  escape through the later blocked count;
- `owner: null` is the intentional update command for deleting an owner in
  [`TaskStore.update`](../../packages/work-cell/src/task-store.ts), so resetting
  a failed delegated Task does not violate `TaskSchema`;
- [`FileMissionTimeline.resolveBatch`](../../operations/autonomy/src/delegate-timeline.ts)
  reconstructs the parent ready barrier directly from settled child timelines,
  defeating the proposed crash-window deadlock;
- one [`DelegateLoopSession`](../../operations/autonomy/src/delegate-loop.ts)
  serializes batches and marks Task ownership before it can advance again, so
  the proposed same-session double claim is unreachable;
- a Task Shape profile revision and `execution-profile.v1` are different kinds
  of version: capability-evidence revision versus execution-record schema
  version. Comparing those strings would introduce a false invariant;
- [`FileMissionTimeline.recoverTurn`](../../operations/autonomy/src/delegate-timeline.ts)
  rejects recovery after settlement, so a post-settlement recovery cannot be
  hidden by `missionTurnNeedsRecovery`;
- CI runs the complete autonomy package test suite, including delegate
  admission and delegate loop tests, in
  [the verification workflow](../../.github/workflows/verify.yml); per-module
  coverage thresholds were never an accepted merge condition; and
- generic Swarm summaries deliberately carry `authority: none`; Mission
  authority remains in Mission records rather than leaking into the generic
  Work Cell contract.

Several reviewer entries explicitly disproved themselves while still placing
the candidate in `findings`. They were discarded rather than downgraded. This
run therefore supports the project rule that Agent review answers whether the
change appears correct, but the acceptance gate must still check whether each
claimed defect is reachable from the source.

## Residuals and next observations

- The local runner uses a per-user `0700` Unix-socket directory as its caller
  trust boundary. `actorRef` is durable attribution, not independent
  authentication. A multi-user or remote carrier must add a real authorization
  adapter rather than treating the string as proof.
- The review estimate was materially wrong. Repeated tool-loop prompts make
  billed input grow with every step even when most input is cached. Future
  large reviews should estimate cumulative step input, restrict each packet to
  explicit files, remove irrelevant Task-create authority, and prefer an
  explicit terminal action.
- Kimi K3 did useful inspection but could not finish the separate structured
  settlement inside the current duration. It remains suitable for narrower
  terminal-tool review packets; this run does not support broad
  `outputSchema`-settled review packets on that route.
- The MVP still intentionally lacks writable effect execution and semantic
  Mission completion authority. Those are later guarded slices, not omissions
  silently treated as complete here.

## Existing verification

At the reviewed revision, Work Cell tests passed 132/132, autonomy tests passed
45/45, both package typechecks passed, the intervention-reconciliation tests
passed 2/2, and the pull-request verification workflow passed. The independent
review found no source-confirmed reason to withhold Ready status.
