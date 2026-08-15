# Conversation Command Entry P7 whole verification

## Verdict

**Not ready for Principal product acceptance.** The frozen product at `520c76857d048d6a22ad67374b8d27b622856df0` has a usable real browser conversation shell, durable create/correct actions, exact isolated Task execution, owner-backed activity, distinct response interruption and persistent stop, and reconnect replay. The named [P7 packet](./2026-08-13-conversation-command-entry-implementation-plan.md#p7--independent-whole-verifier) nevertheless requires every Mission row to be evidenced or returned as a finding; the run exposed material breaks in the create-to-execute path, compact multi-project context, coordinator observed identity, terminal control projection, and result-claim handoff.

This record is verification evidence only. It does not revise the [System Case](./2026-08-13-conversation-command-entry-system-case.md), change implementation, accept a Task, settle the Mission, or grant integration authority.

## Frozen sources and envelope

- Product/base: `520c76857d048d6a22ad67374b8d27b622856df0`.
- P7 coordination start: `ab3845b601d704b6fb85fe703e965167d4b6700b`.
- Disposable Workbench home: `/private/tmp/rossovia-p7-whole-verification.Z65eKl/home` (removed after evidence capture).
- Registered projects: `p7-skills-dogfood` and `p7-worker-dogfood`; each had a clean primary workspace and a clean linked `dogfood-run` Worktree.
- Production entry: real `operations/workbench/src/ui/server.ts` at `http://127.0.0.1:51257`, not a diagnostic handler.
- Browser entry: repository-pinned Playwright CLI, session `p7-conversation-520c76`.
- Conversation: `fcd5fe2d-d0be-4115-80af-512671b1a47f`.
- No Principal Workbench home, existing Task, Mission source, or product source was mutated by the verifier.

The exact [named dogfood](./2026-08-13-conversation-command-entry-implementation-plan.md#named-end-to-end-dogfood-two-workbench-daily-correction) was used as the comparison contract. Where the contract could not proceed safely, the verifier stopped that relation, recorded the durable refusal, and continued only with a separately isolated fixture Task.

## Deterministic and visual evidence

- [Deterministic tests](evidence/2026-08-13-conversation-command-entry/deterministic-tests.txt) retain focused/full suites, all four package typechecks, environment limitations, and diff-check standing.
- [Provider observation](evidence/2026-08-13-conversation-command-entry/provider-observation.json) separates requested coordinator policy from observed worker route evidence.
- [Dogfood event projection](evidence/2026-08-13-conversation-command-entry/dogfood-events.jsonl) preserves selected exact event IDs, sequence, Task/attempt/carrier identities, failure, stop, response interruption, and reconnect observation. Its disposable raw journal had SHA-256 `39b45ef1ff5297e122767b148a7286e6a95abf2c7044a0d6bd9558cd1d672ae1`.
- [Desktop snapshot](evidence/2026-08-13-conversation-command-entry/desktop.snapshot.md), [desktop screenshot](evidence/2026-08-13-conversation-command-entry/desktop.png), [mobile snapshot](evidence/2026-08-13-conversation-command-entry/mobile.snapshot.md), and [mobile screenshot](evidence/2026-08-13-conversation-command-entry/mobile.png) were captured after reconnect.
- [Console](evidence/2026-08-13-conversation-command-entry/console.txt) is 0 errors / 0 warnings at both sizes. [Geometry](evidence/2026-08-13-conversation-command-entry/geometry.json) shows no horizontal overflow; the 390×844 composer remains visible.

The selected event projection is not the complete journal. The raw journal and canonical disposable `tasks.json` were hashed and then removed with the disposable home, so their hashes identify the observed source but cannot reconstruct it. Claims below that depend only on the removed Task terminal snapshot are explicitly labeled verifier observations rather than independently reproducible facts.

## What worked

1. The browser submitted ordinary language and durably displayed `message.received`, `turn-started`, action, and terminal events.
2. DeepSeek selected one typed `task_create`, then appended a `task_correct` to the same canonical Task `f514e85b-ff66-43ef-b099-1d8154b9a26b`, advancing it from revision 1 to 2 without a CLI form.
3. A Task explicitly bound to an isolated Worktree started through `deepseek-pro`; Work Cell retained provider `deepseek`, model `deepseek-v4-pro`, effort `max`, direct route, fingerprint, usage, attributable activity, and exact workspace diff.
4. A second registered project received a distinct Task and carrier. Its live carrier was stopped from the browser; `control.json` preceded `control-stopped`, the Cell was cancelled, and the Worktree remained clean.
5. A separate inquiry turn was interrupted and settled as `coordinator.turn-interrupted`; the prior persistent stop remained intact. Tool interruption remained visibly unsupported, as designed.
6. A page reload preserved the same local conversation ID, reconnected, replayed journal events through sequence 44 in order, and did not repeat an effect.
7. The verifier sent no accept action. Before cleanup it observed all three disposable Tasks as `open`, `nextActor=agent`, with zero result claims; because the canonical `tasks.json` was not retained, this terminal standing remains a verifier observation rather than independent Passed evidence.

## Findings returned to owners

### F1 — HIGH — browser create can produce an unexecutable Task

The first browser `task_create` correctly resolved `p7-skills-dogfood` but bound the Task to its registered primary workspace. The subsequent exact `task_continue` failed durably: `task p7-skills-dogfood must use an isolated Worktree rather than the primary workspace`. The conversation surface has no Task rebind operation, so the same corrected obligation could not proceed. This breaks the [create/correct/continue relation](./2026-08-13-conversation-command-entry-system-case.md#from-one-explicit-message-to-the-existing-task-and-mission-operations) even though every individual boundary failed closed.

Smallest owner correction: creation intended for execution must select a clean observed isolated Worktree, or the conversation must expose an exact rebind/recovery path before `continue`; it must never create a Task that the next supported operation cannot run.

### F2 — HIGH — compact context loses earlier project Tasks

After canonical state retained two `skills-dogfood` Tasks and one `worker-dogfood` Task, a read-only coordinator inquiry stated that `skills-dogfood` had no Task. The turn disclosed the current tasks source digest but projected only the latest worker-dogfood Task. This makes a multi-project daily coordinator unable to reason truthfully about earlier active obligations and violates the named walkthrough's requirement that the first Task history remain intact.

Smallest owner correction: bounded context may summarize, but it must retain one truthful card for every currently relevant open Task across registered projects and correlate carrier standing back to Task/project identity; omission must be stated as unavailable, never as absence.

### F3 — HIGH — coordinator observed provider/model remains unknown

All nine coordinator turns retained the requested `deepseek / deepseek-v4-pro / thinking / max` policy. The eight settled turns retained token usage and the DeepSeek fingerprint, while the ninth interrupted turn retained neither terminal usage nor fingerprint and displayed `未报告 · unknown`. Across the settled turns, journal/UI observed provider, model, and effort still remained unavailable (`unknown/unknown`). Worker execution separately proved the current direct DeepSeek Pro/max route. The current coordinator therefore honors the [requested-versus-observed boundary](./2026-08-13-conversation-command-entry-system-case.md#deepseek-pro-reasoningmax-is-policy-not-mechanism) by not lying, but it does not meet the Mission requirement to retain actual coordinator identity.

Smallest owner correction: normalize the adapter's returned model ID and provider identity into coordinator observed evidence without inferring effort; keep observed effort unavailable unless independently returned.

### F4 — MEDIUM — terminal carrier still exposes a stop affordance

After the first isolated carrier displayed `finished status=passed`, the UI still rendered an enabled “停止该工作” button. Pressing it was safely journaled as `action.failed` with zero effect because the carrier was no longer live. Safety is correct; the projection is stale and invites a meaningless consequential action.

Smallest owner correction: derive the control affordance from owner-backed live standing and disable/remove it as soon as terminal evidence is visible, while retaining the terminal activity history.

### F5 — HIGH — named walkthrough cannot produce its required result claims

The passed Work Cell left a valid diff and recorded settlement, but the verifier observed its canonical Task still open with zero result claims. It also observed no result claim on the stopped second Task. Neither the coordinator operation vocabulary nor the ordinary worker path produced a claim during the run, although the removed canonical `tasks.json` means the final zero-claim standing is not independently reconstructable from this package. The evidence-linked claim handoff required by step 6 of the named walkthrough was therefore not demonstrated. The verifier did not synthesize claims on their behalf and did not accept anything.

Smallest owner correction: define one explicit post-attempt result-claim handoff owned by the worker/carrier or an exact browser Task action; it must bind Task revision, attempt/Cell evidence, diff/check standing, and semantic uncertainty without auto-accepting.

### F6 — MEDIUM — concurrent project registration loses an update

Two independent `rossovia register` commands against the dogfood home both returned success when launched concurrently, but the next project list retained only one project. A fresh no-model reproduction at the same frozen source repeated the behavior: both commands exited 0, while the final project list and `projects.json` retained only `p7-register-alpha`. The exact commands, exits, result payloads, final list, and state hashes are retained in [deterministic tests](evidence/2026-08-13-conversation-command-entry/deterministic-tests.txt). This is outside the conversation journal yet directly threatens multi-project setup integrity.

Smallest owner correction: serialize the projects/workspaces state write or use compare-and-swap/retry so concurrent successful registrations cannot overwrite one another.

## Mission coverage

| Mission/System Case row | Standing | Evidence or finding |
|---|---|---|
| Browser Task create and same-obligation correction | Passed | Same Task ID `f514e85b…`, revision 1→2, sequences 2–8. |
| Attributable progress and settled output | Partial | Exact attempts/activity/Cell refs exist; result claim is missing (F5). |
| DeepSeek Pro/max requested and observed | Partial | Worker route proved; coordinator observed identity missing (F3). |
| One synthesis owner and temporary contributors | Unverified | One coordinator owned every turn; no contribution was selected in this bounded fixture, so formation behavior is supported only by deterministic tests. |
| Duplex input during output/work | Partial | Response interrupt and live work stop are distinct; same-Task correction could not safely replace execution because F1 blocked the original Task. |
| Provisional versus durable state | Passed | In-flight turn/activity UI stayed provisional; journal action/turn terminals replayed durably. |
| Response/tool/persistent interruption | Passed with declared boundary | Response and persistent stop passed; tool interrupt remained visibly unsupported. |
| Reconstruct after connection loss | Passed | Same ID/cursor replay through sequence 44, no duplicate effect. |
| Runtime and UI independently testable | Passed | Focused/full suites, typechecks, production browser evidence. |
| Multi-project daily use | Partial | Distinct projects/Tasks/Worktrees and live second-project stop proved; multi-project context loss is F2. |
| Principal acceptance separate | Partial | No accept action was sent and the UI showed no completed Task; the removed canonical `tasks.json` prevents independent reconstruction of every Task's final lifecycle/result-claim standing. |
| No voice/scheduling/standing roster/vote/new authority | Passed | No such contract, state, event, or UI appeared in source or evidence. |

## Principal handoff

Recommendation: return F1–F5 to the owning conversation/runtime/UI packets before product acceptance; track F6 as a Workbench state-write correction. The product is already useful for supervised create/correct, explicit isolated execution, stop, and reconnect, but it does not yet replace Codex as a trustworthy multi-project daily entry because it can lose prior active obligations and cannot close the result-claim loop.

The retained Autonomy fixture-environment limitation and missing independently observed coordinator effort are explicit residuals. No Task, Mission, or product acceptance is implied by this verification commit.
