# WorkCell observation / record contract 跨字段 integration review

状态：`design-review-round-1 / candidate-synthesis / independent-review-complete / acceptance-pending`；
不是 canonical protocol acceptance、runtime implementation、event bus、meter、effect registry、
retention service、semantic acceptance 或新的 eval Run。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录是上一轮 `UsageObservation` 实践后的 practice-cycle 回返。它不再新增一个字段 shape，而是
检查三个已完成独立 review 的窄候选能否在同一 `WorkCellRunRecord` 中组合，避免局部候选互相升级、
重复计数或把缺失解释成成功/零值。审查对象限定为：

- [`workcell-completion-action-contract-review.md`](workcell-completion-action-contract-review.md)；
- [`workcell-effect-summary-contract-review.md`](workcell-effect-summary-contract-review.md)；
- [`workcell-usage-observation-contract-review.md`](workcell-usage-observation-contract-review.md)；
- 当前 `ExecutionOutcome`、`RuntimeObservation`、`MechanicalCheck`、`EvidenceRef` 与 `WorkCellRunRecord`
  的关系。

## 1. 来源、baseline 与证据 standing

- canonical source：[`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本轮 review-time Git object
  SHA-1 为 `4293057dc1d136fd20ddc7de7144612e458a5b11`，raw SHA-256 为
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 早于 contract projection
  revision，不是当前 canonical fingerprint。当前 source applicability 由
  [`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
  与 contract projection record 回接。
- 当前三个候选的 raw SHA-256：CompletionAction
  `faf410ad56c39bda5824cce40b0985585b091aedd48507be59252fcb00cded54`；EffectSummary
  `57332318bed891350aafca23661c61e8970de1a75f7b33cec66ca0f389765d82`；UsageObservation
  `53618a3d895f1a3d40c018afb5f7d4dfc0c14db2f72690d564aa030903ac5df3`。
- 三个源文件当前 header 均为 `candidate-proposal / independent-review-complete / acceptance-pending`，
  并各自保留 Hubble 的独立 review verdict；这些 hash 证明当前 review input 可回读，不证明 canonical
  protocol 采用。
- 当前没有真实 host Run、跨 adapter matched fixture、record retention decision、named protocol owner
  或 acceptance owner；本 integration review 的证据上限是 `design observation`。

## 2. 跨字段 identity 与唯一 join 关系

在当前候选 standing 下，跨字段能安全共享的最小 join key 只有 `runId`。其他身份不能相互替代。
跨 run 的 `WorkCellRunRequest.parent` 中 `retry-of` / `continued-from` 是独立的 causal lineage
relation，不是三个候选之间的 field join，也不产生 effect/usage/call correlation：

| 身份 / 字段 | 所属对象 | 可回答 | 不可推出 |
| --- | --- | --- | --- |
| `runId` | `WorkCellRun`、各 observation/metric、`RunRecord` | 这些事实属于哪一次 execution？ | 它们是同一 call、同一 effect、同一 metric measurement 或同一 event |
| `callId` / `observationId` | CompletionAction call/observation | 哪次 action submission 与哪次 host observation 相关？ | effect 已发生、usage 已产生、action 已验收 |
| `effectId` / effect observation identity | EffectSummary / EffectObservation | 哪个 effect observation 被记录？ | 它等于 action call、tool call、provider session 或 workspace change set |
| metric kind + provenance | UsageObservation / UsageMetric | 哪个 scope 的 usage report 可用？ | 它等于 effect、host enforcement、limit pass 或 semantic quality |
| `checkId` | MechanicalCheck | 哪个 predicate 的结果可重复检查？ | 它修改事实、取得 acceptance 或触发自动 retry |
| `EvidenceRef` | RunEvidence / 各对象 evidence | 大体积或 provider-specific evidence 的位置与 digest | evidence 自身取得 host authority 或 acceptance |

候选不得通过相同 `observedAt`、数组位置、message arrival order、provider session id 或自由文本把
上述身份重新合并。若未来需要跨对象 correlation，必须由 protocol/record owner 另行定义；本 review
不创建 dedup registry、event sequence 或 lineage mechanism。

## 3. 跨字段 boundary matrix

| 场景 | 应保留的事实 | 明确禁止的升级 |
| --- | --- | --- |
| executor return 同时带 `completionActionCalls`、usage 和 adapter evidence | executor-local call/report/evidence；host observation 仍由 host/coordinator 产生 | return view 不生成 CompletionAction host observation、EffectObservation、host usage 或 acceptance |
| host 收到 action submission，并观察到 workspace effect | action observation 与 effect observation 分开，分别使用自己的 identity/source；二者可共享 `runId` 或 owner-defined evidence ref | action observation 不证明 effect changed；effect observation 不证明 action schema/maxCalls pass |
| provider report 同时带 token usage 与 native tool call | provider-scoped UsageMetric、adapter evidence 和必要的 CompletionActionCall report 分开保留 | provider id/call id 不补出 host `observationId`、host-confirmed effect 或 host limit fact |
| executor failure/cancellation 后已有部分事实 | `ExecutionOutcome` 独立为 failed/cancelled；已观察的 effect/usage/check/evidence 保留，未确认项为 unavailable/unknown | failure code 不覆盖 effect/usage；cancelled 不推出 no effect、zero usage 或 check pass |
| `ResourceLimits` 与 actual usage 可比较 | UsageObservation 记录 metric；`resource-limit` MechanicalCheck 记录 pass/fail/not-run/unknown 及 evidence | usage object 不增加 `withinLimit`；check status 不回写 usage value 或 acceptance |
| output schema 或 completion check 失败 | execution、usage、effect 和 check 各自保留；semantic review/acceptance 另行判断 | check fail 不推出 execution 未发生、effect 不存在或任务未验收的唯一结论 |
| retry/continue 或迟到 usage/effect evidence | child run 独立保留；late evidence 按 record owner 的 correction/evidence relation 记录 | 不按 `cellId`、provider session 或时间把 parent/child 合并；不静默覆盖 canonical projection |

这张表的目的只是检查候选组合是否保持正交，不是新增一套 acceptance criteria，也不是 runtime gate。

## 4. 当前组合结果与未决关系

### 4.1 已保持的组合不变量

- execution outcome、effect observation、usage observation、mechanical check、semantic review 和
  acceptance 仍是不同关系；任何一个对象的 `state` 不代替另一个对象的 authority。
- CompletionAction 的 live/return transport reconciliation 不改变 EffectSummary 或 UsageObservation；
  EffectSummary 的 host confirmation 不改变 usage measurement；UsageMetric 的 limit comparison 不改变
  effect outcome。
- 同一 `runId` 允许存在“execution failed + effect changed + usage partial + check unknown”，也允许
  “execution completed + effect unavailable + usage observed”；这些不是矛盾，前提是来源和 scope 明确。
- 空 observation、可选 return 字段、provider unsupported、迟到 evidence 和 retry child 均不被跨字段
  默认填成 none、zero、pass、success 或 acceptance。

### 4.2 仍然不能由候选决定的关系

- effect observation 与 usage metric 是否共享同一个 host tool call correlation；
- `resource-limit` check 如何引用 lower/upper bound，何时必须返回 unknown；
- 多个 evidence ref 是否构成同一 observation 的完整证据，或只是并列来源；
- late correction 是否生成新 record version、追加 evidence 或保持 canonical unknown；
- provider report 在何种 adapter contract 下可以进入比较 fixture；
- `RunRecord` 是否允许 observation/metric 的迟到补录，以及 record owner、retention 和 acceptance owner。

这些是 protocol、host/security、adapter、coordinator、record/evidence 和 acceptance owner 的 owner-backed
decision，不由 Main 或本 review 代填。

## 5. 更简单替代与 disposition

| 替代 | 问题 | 当前处置 |
| --- | --- | --- |
| 把三个候选合成一个 `ObservationStatus` | 丢失 call/effect/usage 的不同 identity、source 和 owner | `reject` |
| 让 `RunRecord.status` 推导 effect、usage、check 和 acceptance | 用 lifecycle shortcut 覆盖局部事实和 unknown | `reject` |
| 用 `EvidenceRef` 数量或时间顺序做跨字段 dedup | 没有稳定 authority，重试/迟到 evidence 会产生错误合并 | `reject` |
| 立即补 correlation id、event sequence、record version 或 registry | 候选仍缺 named consumer/retention/acceptance owner；会把组合问题扩大成 runtime mechanism | `no-proposal` |
| 保持三个候选各自最小 shape，以 `runId` 做当前唯一安全 join，owner-backed correlation 另行决定 | 能检查当前组合边界，且不新增机制；保留真实未决关系 | `integration-candidate` |

当前 disposition：`continue / route-to-owner`。本轮已足以说明“不应继续盲目增加 observation 字段”；
下一项最小实践应由真实 protocol/record/acceptance owner 选择一个上述未决关系和一个 counterexample，
形成 owner-backed decision 或明确 retain-unknown。若 owner/consumer 仍不存在，保持本 integration record
为 design observation，不创建新的 shape、Run、meter、registry 或实现计划。

## 6. practice-cycle return

- **本次实践：** 在完成 CompletionAction、EffectSummary、UsageObservation 三个窄候选后，检查它们
  在同一 RunRecord 中的 identity、source、unknown、failure/cancellation、limit-check、retry 和 late
  evidence 组合。
- **实际结果：** 组合边界可以保持正交；唯一安全的跨字段 join 是 `runId`；多个 correlation、late
  correction、retention 和 limit-bound comparison 仍无法由当前来源决定。
- **排除的替代：** 没有证据支持把三个候选合成总 status、用 evidence 顺序 dedup，或先创建 registry/
  version/meter 机制。
- **当前 disposition：** `continue / route-to-owner`，不是 `settle`；WorkCell 仍为 design candidate /
  acceptance-pending，字段候选不构成 protocol acceptance。
- **下一最小实践：** named protocol/record/acceptance owner 对一个跨字段 counterexample 做 owner-backed
  decision；允许新增/修改只限该 relation 的最小 wording 或 candidate field，不允许新 runtime mechanism。
- **仍未知：** owner identity、record correction/retention、matched adapter fixture、host enforcement、
  semantic acceptance 与 implementation authorization。

## 7. 独立语义审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 protocol acceptance、record/retention authority、runtime 或实现权。首轮 disposition 为
`revise`，提出补强跨 run `retry-of` / `continued-from` lineage 与 source standing 回读说明。

最小修订已完成：

- 重新核对三个源文件 header，确认当前均为 `candidate-proposal / independent-review-complete /
  acceptance-pending`；明确 hash 只证明 input 可回读，不证明 canonical protocol 采用。
- 明确 `WorkCellRunRequest.parent` 的 `retry-of` / `continued-from` 是跨 run causal lineage，不是
  call/effect/usage correlation，也不允许跨 run 合并事实。

Hubble 复审结论：`accept`，仅接受本 integration review record。复审确认三个候选的 identity/source/
authority 正交，`runId`、failure/cancellation、zero/unavailable、limit-check unknown、retry、late
evidence 和 owner-backed correlation unknown 均保持诚实；本记录没有形成第二套 protocol、总 status、
dedup registry、runtime gate 或 acceptance carrier。

因此本记录最终维持 `design observation / candidate-synthesis / independent-review-complete /
acceptance-pending`；WorkCell 仍为 design candidate，下一步 route 给真实 protocol/record/acceptance
owner，不继续盲目增加字段或机制。
