# WorkCell canonical protocol contract projection reconciliation

状态：`design-source-reconciled / wording-revision-applied / current-applicability-reconciled / independent-review-complete / acceptance-pending`；不是
协议接受、host/security 授权、runtime 实现或 provider 比较结论。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象与触发

本记录检查当前 [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 的 `WorkCellRunRecord`
与 `WorkCellEvent` 示例，是否会把已有的 `EffectSummary` / `EffectObservation` / `UsageObservation`
窄 contract 候选误读成已经冻结的 canonical shape。

触发来源：

- protocol §6.5 将 `effects: EffectSummary`、`usage?: UsageObservation` 放入 RunRecord；
- protocol §7.1 使用 `EffectObservation` 作为 `effect.observed` 的事件 payload；
- [EffectSummary contract review](workcell-effect-summary-contract-review.md) 与
  [UsageObservation contract review](workcell-usage-observation-contract-review.md) 均明确：当前只是
  source-backed design candidate，canonical shape、owner、retention 和 correction 仍 unknown；
- protocol §6.5 的失败示例使用 `effects.workspace` 这一未在当前候选中定义的 shorthand，可能让读者把
  workspace effect 当成已接受字段。

## 2. Baseline 与观察

revision 前 source fingerprint：

| 算法 | fingerprint |
| --- | --- |
| Git SHA-1 | `e8f7f71344c9b2d7d8aa17457202cc7652f15d3d` |
| raw SHA-256 | `cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3` |

当前观察：

1. RunRecord 的 named slots 与窄 contract 候选之间的关系可回读，但协议正文没有明确“slot 已命名、
   shape 未冻结”；
2. `effects.workspace = observed change set` 是解释性 shorthand，不是当前 `EffectSummary` candidate
   的字段，因此有 source-level projection ambiguity；
3. `effect.observed` 的事件类型只应承载命名关系，不能让事件名称、provider return 或 message arrival
   order 代替 effect authority、confirmation、unavailable、dedup/replay 或 retention contract；
4. 这属于 wording/projection drift，不是已证明的 runtime failure、host security failure 或 provider
   behavior difference。

## 3. 最小改变

本轮只对 canonical design candidate 做三处 wording clarification：

- 在 `WorkCellRunRecord` 示例后声明 `EffectSummary` 与 `UsageObservation` 是命名槽位，当前只固定
  run-bound projection relation，不冻结完整 shape、来源 authority、retention 或 correction；
- 将失败示例中的 `effects.workspace` 改为“observed workspace effect，exact EffectSummary shape remains
  open”的关系表达，避免把 shorthand 当作字段契约；
- 在 `WorkCellEvent` 示例后声明 `effect.observed` 不自动推出完整 envelope、host confirmation、
  unavailable reason、dedup/replay 或 retention。

不改变：

- `WorkCellSpec → WorkCellBinding → WorkCellRunRequest → WorkCellRun → WorkCellRunRecord` identity；
- `EffectSummary`、`EffectObservation`、`UsageObservation` 的候选 owner、unknown、source 与证据上限；
- execution facts、MechanicalCheck、SemanticReview、AcceptanceDecision 的分层；
- A/B/C/D lifecycle/lineage 未决关系、provider-neutral adapter boundary 或 system-layer boundary。

## 4. Revision 后 source

当前 source fingerprint：

| 算法 | fingerprint |
| --- | --- |
| Git SHA-1 | `fa602fafd444d1f738c20ac4b4ec16c9e4d8654e` |
| raw SHA-256 | `c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b` |

revision 关系是 `wording-only / projection-clarification`。旧的独立 review 不自动继承为当前 source
acceptance；需要由 source-applicability review 确认它们的对象和结论仍可回指当前 revision。

## 5. Standing、owner 与允许效果

| 字段 | 当前值 |
| --- | --- |
| source / identity | current protocol revision；对应 revision-2 applicability lineage；两个窄 contract review |
| consumer / owner | protocol、host/security、coordinator、record/evidence、executor/adapter、acceptance；具体 named owner `unknown` |
| dependency | current protocol、field-boundary review、EffectSummary/UsageObservation/observation integration records |
| allowed scope | 只修正 slot 与 candidate shape 的文字投影，更新 source applicability 与 planning projection |
| evidence standing | `source-revision-observed / design-boundary-supported / acceptance-pending`；无 host Run、matched provider Run 或 retention evidence |
| disposition | `retain-contract-candidates / route-to-owner` |
| stage exit | source 示例不再把未冻结字段误报为 canonical；不等于 protocol acceptance 或 phase transition |
| revisit | owner-backed shape/authority/retention/correction decision、真实 host consumer、current source 再修订或新 fixture 出现时重开 |

本轮允许效果只包括上述 wording、source fingerprint 和 projection reconciliation；不创建 registry、meter、
event bus、retry controller、adapter、provider comparison Run 或实现计划。

## 6. Current-source applicability

本次 revision 直接回读了受影响的 protocol §6.5、§7.1、§7.2 与 §7.3，以及
`workcell-contract-field-boundary-review.md`、`workcell-effect-summary-contract-review.md`、
`workcell-usage-observation-contract-review.md` 和 `workcell-observation-record-integration-review.md`。

当前判断：

- RunRecord 的 `effects` / `usage` named slots、Event 的 `effect.observed` 关系和已有四层分离仍能
  从当前 source 回指；
- revision 只消除了 `effects.workspace` shorthand 与未冻结 shape 的误读，不改变这些 review 的对象、
  owner class、unknown、证据上限或允许效果；
- 旧 review 的 historical source edge 仍保留为 lineage，不能因为本次 wording-only revision 自动变成
  protocol acceptance；
- 受影响 contract projection 当前为 `current-source-supported / applicability-reconciled / acceptance-pending`，
  canonical shape、authority、retention、correction 和 named owner 仍 unknown。

该 applicability conclusion 只覆盖本记录列出的 contract projection，不覆盖 A/B/C/D 全部 policy，也不
取得 host Run、provider comparison 或实现授权。

## 7. Independent review

未参与本轮 source revision 生产的 `Dewey`（Agent `01a0394d-c4ad-7e10-a91d-68a232d7ba24`）只读检查并
`ACCEPT`：

1. revision 是否只改变 slot/candidate 的表达，不偷偷接受 shape；
2. `effects.workspace` 是否已不再冒充 canonical field；
3. 当前 fingerprint、旧 review lineage 和 applicability projection 是否可回读；
4. WorkCell、DeepSeek Harness、base/runtime 和 implementation freeze 是否保持。

该 verdict 只接受 source wording、current applicability 和 lineage bookkeeping，不构成
`EffectSummary`/`UsageObservation` canonical acceptance、WorkCell protocol acceptance、provider choice 或
implementation authorization。
