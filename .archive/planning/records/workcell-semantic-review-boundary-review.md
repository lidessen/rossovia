# WorkCell `SemanticReview` / `AcceptanceDecision` 边界回返

状态：`design-boundary-candidate / source-backed / independent-review-complete / acceptance-pending`；
不是 semantic acceptance、Principal decision、runtime gate、review queue 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 1. 本轮对象与来源

本记录处理 WorkCell §8 和 §17.2 的一个窄缺口：协议已经区分机械检查、语义审查和验收决定，
但尚未把 review 的输入快照、rubric、reviewer 关系、结构化 findings、阻塞/延期以及与
`AcceptanceDecision` 的交接边界形成可由 owner 判断的 planning record。

- canonical source：[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) §8.1–§8.3、§16、§17.2、§18；
- current readiness projection：[`workcell-design-acceptance-readiness.md`](workcell-design-acceptance-readiness.md) 的
  semantic review / acceptance authority dimension；
- adjacent field boundary：[`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md)；
- related authority boundary：[`theory/research/agent-delegation.md`](../../theory/research/agent-delegation.md) 的
  producer/reviewer/acceptance 分离；
- owner classes：semantic-review/rubric、protocol/record/evidence、Principal/acceptance；named owner 当前均
  `unknown`。

本记录不定义业务 rubric，不替某个 Task 决定质量，不把 reviewer 名称变成 authority，也不把
`SemanticReview.state = complete` 推成 `AcceptanceDecision.accepted`。

## 2. 对象、身份与权威关系

| 层 | 对象/关系 | 它负责的判断 | 它不能取得的权威 |
| --- | --- | --- | --- |
| execution fact | `WorkCellRunRecord`、`RunEvidence` | 运行发生了什么、有哪些 effect/check/evidence | 不判断业务正确性或接受 |
| mechanical observation | `MechanicalCheck` | schema、artifact、范围、资源等可重复谓词是否满足 | 不判断目标是否合理、质量是否满足或是否接受 |
| semantic judgement | `SemanticReview` | 对指定 run/产物按指定 rubric 的独立语义判断、finding、unknown 或 blocked | 不回写 execution facts，不授予权限，不接受或发布 |
| authority decision | `AcceptanceDecision` | 指定 Principal/acceptance owner 是否接受、拒绝或延期，以及承担什么 basis | 不改变历史 execution/review facts；不自动产生 retry/continue |
| next action | Task/orchestrator/owner 的新决定 | 根据 review、unknown 或 acceptance 决定新 run、补证据、route 或 stop | 不由 review `complete` 自动生成；新 run 需新 causal identity |

当前 `SemanticReview` 的 source shape 是 `reviewId`、`runId`、`reviewer`、`rubricRef`、`state` 和
`findings`；`AcceptanceDecision` 的 source shape 是 `decisionId`、`subject`、`authority`、`state`、
`basis` 和 `decidedAt`。这些是 design candidate，不是已接受 schema。特别是 `rubricRef`、
`StructuredFinding`、review input snapshot、`basis: string[]` 的可追溯性和 correction/supersession
关系仍需 owner 决定；不能用自然语言或固定短语替代这些承重关系。

## 3. 最小设计候选

本轮只保留一条不新增机制的 boundary candidate：

1. 一个 `SemanticReview` 针对一个明确 subject/run、一个可识别的 rubric 版本和一次 reviewer
   judgment；它消费 RunRecord/Evidence 的可回读 snapshot/ref，但不复制或修改执行事实。
2. `state: pending | complete | blocked` 只表达 review 生命周期；`blocked` 必须保留缺失来源、
   失败位置和回返条件，不能偷变成 rejected 或 accepted。
3. `findings` 至少应能结构化表达 observation、claim、evidence/unknown、severity 或 disposition
   的 owner-defined 关系；具体字段和 rubric 仍不冻结。
4. `AcceptanceDecision` 必须由明确 authority 对 subject 作出 `accepted | rejected | deferred`；
   review 可以作为 basis，但 review verdict、机械 check pass 或 executor 自报都不能代替该决定。
5. 若需要修正、补证据或 retry，保留原 review/decision 的事实并产生新的 review/decision 或新 run
   relation；不静默覆盖原记录。

这是 `reuse-existing-owners + clarify-boundary` candidate，不是新增 review queue、gate、registry、
approval workflow 或 acceptance authority。是否把完整 findings 放在 WorkCell record、外部 review
artifact，或只保存结构化 reference，由 record/evidence owner 决定。

## 4. 最小反例组

以下是设计 review fixture，不是当前 Run 或 acceptance。

### S1：机械通过不等于语义通过

- output schema、artifact path 和 resource limit 都通过；
- 产物仍可能没有满足上游任务意图；
- `MechanicalCheck` 可以为 `pass`，但仍需独立 `SemanticReview`，`AcceptanceDecision` 仍缺失。

### S2：review 完成不等于接受

- reviewer 的 `SemanticReview.state` 为 `complete`，finding 建议采用；
- 没有指定 Principal/acceptance owner 或其决定为 `deferred`；
- 不能把 reviewer recommendation、分数或自然语言“通过”转换成 `accepted`。

### S3：证据不足应阻塞或未知

- RunRecord、workspace evidence 或 rubric 所需输入不可取；
- review 应保留 `blocked`/unknown、缺失来源和 return，不伪造 rejected/accepted，也不回写 execution。

### S4：新证据/新 rubric 不静默改写旧判断

- 同一 run 后来出现 late evidence、rubric revision 或 correction；
- 应明确新 review identity、supersedes/related 关系和有效范围；原 review 仍是历史事实，不被静默覆盖。

### S5：语义 review 不是 retry controller

- review 发现缺陷或 unknown；
- 下一动作由 Task/orchestrator/owner 决定，若重跑必须生成新 `WorkCellRunRequest`/`runId` 并保留 parent
  relation；`SemanticReview` 不拥有自动重试、权限扩大或调度权。

## 5. 当前处置、证据与出口

- 当前处置：`retain-boundary-candidate / route-to-semantic-review-and-acceptance-owners`；
- evidence standing：`source-backed design observation`；已有协议文字和相邻 owner-boundary evidence，
  没有 named rubric owner、真实 semantic review consumer、AcceptanceDecision Run 或 adoption evidence；
- 允许效果：更新 readiness、plan、roadmap、coverage、item-loop 和 item ledger 的 projection；由 owner
  决定后再另开 canonical source revision/applicability review；
- 禁止效果：不回写 canonical protocol，不制定业务 rubric，不创建 reviewer queue/gate/registry，不把
  reviewer verdict 写成 acceptance，不开始 WorkCell/DeepSeek/base implementation 或 provider comparison。

本项的 planning-boundary 出口是：semantic-review/rubric owner、protocol/record/evidence owner 和
acceptance owner 分别能对 S1–S5 选择 `accept-planning-boundary-candidate`、`retain-unknown`、
`no-proposal` 或延期，并说明 review subject/snapshot、rubric identity、structured finding、blocked/
correction/supersession、acceptance basis 和 next-action owner。该 `accept-planning-boundary-candidate`
只关闭本 planning record，不接受 `SemanticReview`、`AcceptanceDecision` 或业务 rubric 的 canonical
schema，也不授予 Principal/implementation 权。

## 6. 下一 return

向 owner 交回以下最小问题：

1. `SemanticReview` 的 subject 是 run、record、artifact 还是上游 task projection；如何固定 input
   snapshot/ref？
2. `rubricRef` 如何版本化，谁拥有 rubric，缺失或变更时 review 是 blocked、superseded 还是新 review？
3. `StructuredFinding` 至少需要哪些结构化字段，如何区分 observation、claim、evidence、unknown 和
   recommendation？
4. `AcceptanceDecision.basis` 如何指向 review/evidence，而不依赖自由文本；谁拥有 accepted/rejected/
   deferred 的后果？
5. correction、late evidence、retry 和 new review 如何保持原事实、因果 identity 与 retention 边界？

没有 named owner 时，下一步保持 `retain-unknown / route-to-owner`，不通过增加 rubric 字段或 review
机制制造收敛。

## 7. 独立 review

`Chandrasekhar`（`01a03956-a4e0-7711-9b9d-5ac406b69b90`）已独立复核并 `ACCEPT`：确认
`MechanicalCheck`、`SemanticReview`、`AcceptanceDecision` 与 next action 的 owner/authority 分层；
subject、rubric、snapshot、findings、blocked、correction/supersession、basis 和 next-action owner 的
未知均被保留；S1–S5 是有限设计反例，不冒充 Run 或 acceptance。

该 verdict 只接受本 planning boundary record，不定义业务 rubric、不代行 Principal acceptance、不创建
runtime gate/queue，也不授权 WorkCell、DeepSeek Harness 或任何实现。
