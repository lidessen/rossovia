# WorkCell 当前源开放关系适用性回读

状态：`current-source-boundary-observed / applicability-reconciled / independent-review-complete / acceptance-pending`；不是 WorkCell protocol acceptance、owner decision、eval Run、runtime 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录只做一件事：在 executor wording 与 contract projection wording revisions 之后，重新读取当前
[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 中与 A/B/C/D 开放关系直接相关的
source sections，检查既有 planning review 是否仍有可回指的当前 source baseline。它不重跑 A/B/C/D
的语义反例 review，不选择 host/security、record、retention 或 replay policy，也不把当前 source
可回读写成协议已接受。

## 1. 来源、身份和检查边界

当前 canonical source 的可回读身份：

| 项目 | 当前值 |
| --- | --- |
| source | `design/work-cell-protocol.md` |
| Git object SHA-1 | `fa602fafd444d1f738c20ac4b4ec16c9e4d8654e` |
| raw-file SHA-256 | `c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b` |
| line count | `1188` |
| source revision context | executor identity/non-executor comparison wording revision + Effect/Usage/Event named-slot projection wording revision + public Run state/record finalization separation candidate + `derived-from` parent relation simplification candidate |

检查范围直接覆盖当前 source 的：

- §5.1：Binding snapshot、executor identity、expiry 和重新 admission；
- §5.2：host 的取消、停止新调用和已发起效果排空职责；
- §6.1、§6.2、§6.3、§6.5：request parent relation、运行生命周期、`draining`/terminal execution state/
  record finalization、受控
  execution context 和 RunRecord 事实投影；
- §7.1–§7.3：typed Event、EvidenceRef 和 `observed`/`unavailable` standing；
- §9.1–§9.3：failure、取消、默认不自动 retry 和 parent relation；
- §11.1、§12.2：executor comparison 的固定变量与评估维度，作为 revision boundary 的相邻检查；
- §17.2：A/B/C/D 的开放关系；
- §17.1：已形成的 Binding、new-run lineage 和 executor comparison baseline；
- §18.2、§18.9–§18.12：executor comparison 与 A/B/C/D 对应的实现前反例标准。

不检查 provider 效果、host security policy、retention 事实、跨进程 replay、真实 Run 或实现行为。

## 2. Current-source applicability matrix

| relation | 既有 review | 当前 source 可回指的 baseline | 当前 source 仍明确的 open relation | 本记录结论 |
| --- | --- | --- | --- | --- |
| A bounded drain / unknown effect | [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) §3、[`workcell-run-state-boundary-review.md`](workcell-run-state-boundary-review.md) | §6.2 现在分离 `cancelling → draining → terminal execution state` 与 record finalization；§5.2 仍由 host 处理取消、停止新调用和已发起效果的排空；§9.2 仍要求未确认外部效果记录为 `unknown` | cutoff、无界等待的停止点、迟到 observation/correction 和最终记录 owner 仍由 §17.2 保留为开放项 | `current-source-supported / state-boundary-simplified / retain-unknown`；A 的 baseline 可回指当前 source，但候选 policy 未被接受 |
| B Binding expiry / revocation | [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) §4 | §5.1 仍规定 host admission 物化 immutable Binding、executor 属于 identity、expiry 后重新 admission 且不静默沿用旧权限；§6.3 的 Binding 仍是 host/coordinator 提供的受控 context | 活动 run 到期/撤销、in-flight effect、终止结果和 Binding identity 的 record projection 仍由 §17.2 保留为开放项 | `current-source-supported / retain-unknown`；当前 source 支持 baseline，不选择活动撤销 policy |
| C Event order / dedup / replay | [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) §2 | §7.1 仍是封闭 typed `WorkCellEvent` union，并要求新增事件使用版本化 schema；§6.2 仍把 Event 与 RunRecord 作为公共观察面 | identity、sequence、dedup、gap、重启恢复和 Event 是否可作为事实重建源仍由 §17.2 保留为开放项；§18.11 明确要求在 replay 与 observation-only 之间作出可检验区分 | `current-source-supported / retain-unknown`；typed Event 不被升级为 replay contract |
| D retry / continue lineage | [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) §3、[`workcell-parent-relation-boundary-review.md`](workcell-parent-relation-boundary-review.md) | §6.1/§9.3 仍要求 retry 建立新的 request/run，保留原记录，并用 `retry-of` 建立 parent relation；§6.1 与 §17.1 也保留 `continued-from` 的新 run 关系，并排除 provider session 原地 resume；当前 source 已从 v1 union 移除无 consumer 的 `derived-from` | parent record 缺失、最小 retained record、relation authority、retention 和 unknown 深度仍由 §17.2 保留为开放项；§18.12 仍排除 provider session/自然语言作为 lineage authority；generic Task/WorkItem derivation 不进入 WorkCell core | `current-source-supported / relation-set-simplified / retain-unknown`；当前 source 支持两个已定义的关系声明，但不支持可恢复性保证 |

这里的 `current-source-supported` 只表示既有 review 的 baseline 与当前 source sections 能够逐项
回指；它不表示既有 review 的 owner decision、候选 policy、record contract 或 acceptance 已经适用。
`retain-unknown` 仍是四项的 planning disposition。

## 3. 与 executor 及 contract projection revisions 的关系

此前 contract projection applicability child 读取的 source identity 是 `2ed713fe… / f87422b0…`；它现在是
current `fa602faf… / c78876b4…` 之前的 historical source edge，`7240b23… / 513e7ed…` 是中间的
previous current edge。此前 `e8f7f713… / cfe203ba…` 是更早的
contract projection revision 前 edge；contract-specific applicability 由
[`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)
单独承载。本记录的 A/B/C/D baseline 仍只覆盖 unchanged lifecycle/Binding/Event/new-run relations，
不吸收该 contract projection 的字段或 policy acceptance。

executor revision-2 只澄清 §5.1、§11.1、§12.2、§17.1、§18.2 中 executor identity 与 comparison fixed
constraints 的关系。当前 A/B/C/D 的 source sections 与上述 revision 的直接对象不同：

- A/B 依赖的是 lifecycle、host effect 和 Binding expiry/renewal 关系；
- C/D 依赖的是 Event observation、RunRecord、parent relation 和 recovery boundary；
- executor 选择仍可能是未来 eval 的变量，但不能改变 A/B/C/D 的 authority、retention 或 unknown
  语义。

因此本记录只把 A/B/C/D 从“当前 source 尚不可回指”推进到“当前 source baseline 可回指、
semantic/policy applicability 仍 open”。它不把 revision-2 的 `ACCEPT` 扩大到 A/B/C/D，也不把
旧 review 的 `independent-review-complete` 变成 current protocol acceptance。

## 4. 结构化结果

```yaml
source: design/work-cell-protocol.md
source_identity:
  git_sha1: fa602fafd444d1f738c20ac4b4ec16c9e4d8654e
  raw_sha256: c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b
scope: current-source applicability for WorkCell open relations A/B/C/D
observed:
  - current source exposes the reviewed lifecycle, effect, Event and lineage baselines
  - current source now separates public execution state from record finalization without accepting the A cutoff policy
  - current source exposes only retry-of and continued-from as WorkCell parent relations; generic derivation remains upstream
  - current source still marks the corresponding policy and recovery relations open
  - executor and contract projection wording revisions do not by themselves decide A/B/C/D
standing: current-source-boundary-observed / applicability-reconciled / acceptance-pending
disposition: retain-existing-reviews / route-policy-and-owner-decisions / no-rerun-now
implementation_authorized: false
```

## 5. 不越权边界

本记录允许：

- 更新 A/B/C/D 的 source applicability projection；
- 保留四项的 `retain-unknown`、owner class、consumer/retention unknown 和 revisit 条件；
- 让后续真实 owner 直接从当前 source sections 回读 review baseline。

本记录禁止：

- 选择 bounded-drain cutoff、活动 Binding revocation policy、Event replay contract 或 lineage
  retention contract；
- 新增 `eventId`、`sequence`、`gap`、registry、queue、event bus、replay store、retry controller
  或 runtime state；
- 生成 synthetic Run、provider comparison 或 adapter implementation；
- 把 `current-source-supported`、`independent-review-complete` 或 revision-2 `ACCEPT` 写成
  protocol acceptance、security acceptance、record authority 或 DeepSeek/Vercel 结论。

## 6. 下一回返与出口

本 round 的 bounded exit 是：A/B/C/D 各自能从当前 source 回指 baseline、开放关系和不授权边界，
且旧 review 的 source drift 不再阻止 source-level reading。它不关闭 A/B/C/D。

下一回返仍按 owner 分开：

1. host/security/coordinator owner 判断 A cutoff、B 活动撤销/到期与 in-flight effect；
2. protocol/record/evidence owner 判断 Binding identity、迟到 observation/correction、Event
   observation/replay 和 RunRecord 载体；
3. retention/recovery owner 判断 D 的最小保留关系、错误 parent 和 unknown 深度；
4. acceptance owner 决定是否接受上述候选、保留 unknown 或延期。

若没有这些真实 owner、consumer 或新 evidence，四项继续 `retain-unknown / route-to-owner`，不
重复做同一 source read，也不为了制造阶段完成而改写 canonical protocol。

## Independent review

`Halley`（Agent `01a0389c-f0c7-7200-bca2-6ae35783bd6d`）完成两轮只读复核并最终 `ACCEPT`。复核确认：

- 当前 source fingerprint 与 revision-2 record 一致；
- 检查范围已覆盖 §5.2、§6.1、§6.3、§11.1、§12.2、§17.1、§18.2 等相邻依赖；
- A/B/C/D 的 baseline、开放项、`continued-from`、source applicability 上限和 executor revision 边界没有混淆；
- `current-source-supported` 没有扩大为 protocol/host/security/record/retention acceptance；
- projections 只同步 source applicability，不改变四项的 `retain-unknown` 或实现冻结。

该 `ACCEPT` 只覆盖本 current-source applicability card 的修订完整性和 bookkeeping，不构成协议、
host/security、record、retention、DeepSeek 或 implementation acceptance。
