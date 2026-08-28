# Evidence applicability review：human-agent-visualization generated bundle

状态：`historical-only / applicability-observed / independent-review-complete / acceptance-pending`。

本记录是整个 planning goal 下 evidence-maintenance item 的一次有界 applicability check。它只判断
已有生成物是否仍能进入当前 planning 的证据链，不创建新的 eval、experiment、Run、review、skill
acceptance、WorkCell acceptance 或实现授权。

## 1. 对象身份

| 字段 | 当前值 |
| --- | --- |
| object | `evals/human-agent-visualization/generated/project-evidence-bundle.json` |
| object family | generated-only projection artifact |
| format | `human-agent-visualization.project-evidence-bundle.v1` |
| builder | `local-project-lens-builder`, `mvp-r3` |
| generatedAt | `2026-08-11T09:41:45.102Z` |
| current artifact SHA-256 | `7962a44e1f2526f1d92d03d9917051d34c92b725cc2e3bbead480200fbe94a89` |
| captured subject | repository `skills`; dirty subject; intent `understand`; audience `项目负责人` |
| captured question | 每次修改后，这个项目的目标、主要系统、责任边界、实现状态和设计偏差分别是什么？ |
| current consumer | none confirmed |
| evidence owner | unknown |

The artifact is retained as a historical diagnostic object. Its embedded `standing`, `sourceRef`,
projection and verification fields are part of the old generated projection; they do not become current
authority merely because the JSON remains readable.

## 2. Source applicability

The artifact declares nine source references. The check was run against the current living tree on
2026-08-25:

| captured sourceRef | current path | captured revision vs current observation | disposition |
| --- | --- | --- | --- |
| `README.md` | present | captured `7fa0e120...`; current `f417c4ce...`; mismatch | stale |
| `README.zh-CN.md` | missing | captured source has no current path | stale/missing |
| `AGENTS.md` | present | captured `a56f368f...`; the prior check observed `28545543...`, while the current raw file is `1075e5f3...`; mismatch | stale |
| `principles/SEQUENCE.md` | missing | current source is governed by living-tree terminology and paths, not this historical path | stale/missing |
| `design/DESIGN.md` | missing | no current living path at this location | stale/missing |
| `design/AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md` | missing | no current living path at this location | stale/missing |
| `experiments/human-agent-visualization/DESIGN.md` | missing | no current living path at this location | stale/missing |
| `operations/workbench/README.md` | missing | no current living path at this location | stale/missing |
| `packages/work-cell/README.md` | missing | no current living path at this location | stale/missing |

The two surviving paths do not preserve applicability: both captured digests differ from the current
files. The seven missing paths cannot be repaired by guessing a replacement because the current tree has
different authorities and boundaries. Path presence, source excerpt readability, and JSON format validity
therefore provide only `format-valid / historical-only` standing.

## 3. Evidence-chain check

| required relation | observation | standing |
| --- | --- | --- |
| current source | no matching nine-source snapshot; two paths changed and seven are absent | not established |
| current hypothesis | captured question exists, but no current research/eval hypothesis is named in this object | not established |
| named consumer | none confirmed | not established |
| owner / authority | no evidence owner or acceptance owner is named | not established |
| controlled variables | no frozen artifact card records source set, task, model, tools, workspace, or runner | not established |
| Run identity | no corresponding current Run was identified in this bounded check | not established |
| independent review | applicability review completed; no review exists here that turns the artifact into a current evaluation | current-eval review not established |
| acceptance | none confirmed | not established |
| implementation authorization | none; this artifact cannot authorize implementation | explicitly absent |

The complete relation required for a new evidence round is therefore absent:

```text
current source → hypothesis → consumer/owner → frozen card/variables → Run
→ independent review → disposition/acceptance
```

The `AGENTS.md` value above is a current-observation correction to the prior applicability check, not a
revision of the generated artifact or its historical source set. The historical-only disposition remains
unchanged; the earlier reviewer acceptance covers the original path/hash check and does not accept this later
source observation.

## 4. Disposition and boundary

Disposition: `historical-only / hold / archive-only / no-proposal-now`.

Allowed actions:

- retain the JSON for historical source/path diagnostics;
- cite this applicability check as evidence that the old generated projection is stale;
- revisit only after a current source, hypothesis, named consumer, owner, controlled variables, new card,
  runner identity, independent reviewer, and acceptance relation exist together.

Disallowed actions for this item:

- editing the JSON or its embedded sourceRefs to simulate current lineage;
- moving old paths or recreating historical documents solely to make the bundle pass;
- treating the projection as a current project summary, eval conclusion, behavior observation, matched
  improvement, portability evidence, or acceptance;
- opening a new round merely to fill coverage or to validate the generated format;
- inferring WorkCell, DeepSeek harness, or base implementation requirements from this artifact.

## 5. Return to planning

This check closes the current applicability branch with no new Run and no design/implementation scope.
The parent evidence-maintenance item remains `acceptance-pending`; its next trigger is not a batch rerun,
but the appearance of a real current consumer and a reconstructible evidence chain. Until then this object
stays historical-only while the planning goal proceeds through the design/method branches.

## Independent review

Independent bounded reviewer: Codex, `2026-08-25`, verdict `accept` for this applicability record.

The reviewer independently verified the artifact SHA-256 and the 2-present/7-missing path split, and
confirmed that `historical-only / hold / archive-only / no-proposal-now` is justified and that the record
forbids artifact rewrite and implementation. The reviewer did not independently recompute the two present
file digests and did not exhaustively establish the absence of every possible current consumer, owner, Run,
or acceptance relation; those remain explicit unknowns rather than negative facts.
