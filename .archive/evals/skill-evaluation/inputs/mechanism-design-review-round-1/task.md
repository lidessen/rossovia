# mechanism-design-review probe task

这是一个只读、无 effect 的 design-review task。不要修改 source、candidate、protocol、plan、
workspace 或任何外部系统；不要创建 runtime、queue、registry、eval implementation 或 acceptance。

## Authoritative sources

请只把以下文件作为本题的 project facts；它们的 standing 由文件自身和 AGENTS 约束决定：

- `design/work-cell-protocol.md`
- `planning/records/workcell-open-relations-review.md`
- `planning/records/workcell-lifecycle-review.md`
- `planning/records/workcell-observation-lineage-review.md`
- `theory/harness/theory.md`

不要把文件存在、历史 archive、provider feature list 或本题中的 proposal 自动当成 accepted fact。

## 任务对象

对以下三个 case 分别做一个 mechanism/design review。每个 case 是独立 review unit；不要把三个
case 合成一个总机制，也不要用一个 case 的结论替代另一个 case。

### M1：有明确的跨进程恢复 consumer

一个真实的跨进程 consumer 需要在 coordinator 重启后，从规范化 WorkCellEvent 恢复某个 run 的
观察顺序、去重和缺口；当前 source 只定义 typed Event，没有稳定 identity、sequence、gap 或
replay contract。提案是增加 durable event log、事件 identity、sequence、dedup 和 replay
恢复关系。

### M2：没有 replay consumer 的当前观察面

当前没有真实跨进程 replay consumer；已有 typed Event 只用于实时/尽力而为观察，RunRecord 是
完成 run 的候选公共事实投影。提案是为了“以后可能需要”增加 event bus、replay store 和
lineage registry，并让 consumer 从事件顺序推断 effect。

### M3：形式选择与机制选择混淆

有人发现设计 review 中经常把“是否应该增加一个机制”的判断写成长 checklist，于是提出把
整个判断固定成项目必加载 rule、普通 reference、可选择 skill、可重建 projection 或 runtime
gate 之一，但没有先稳定对象、失败后果和接受关系。

## 返回契约

对每个 case 返回以下结构；事实不足时写 `unknown`，不要补猜：

```yaml
case_id: M1 | M2 | M3
review_unit: <本 case 的单一压力和 proposal>
observed_facts: <来源直接支持的事实>
hypotheses: <仍未被来源证明的假设>
object_and_owner: <对象、unit、当前 owner、常见混淆对象>
destination: <必须成为真的最小关系>
simpler_alternatives: <prompt/skill、已有 owner、确定性边界等比较>
recommendation: <keep | prompt | reuse | simplify | mechanism-candidate | route-unknown | no-proposal>
nearest_owner_route: <若不是本 review 的问题，交给谁以及原因>
unknowns: <改变判断、归因或下一步的缺口>
stop_and_effect_boundary: <失败时停止在哪里；本 review 没有产生哪些 effect>
evidence_standing: <design observation | unknown；不要宣称 acceptance>
next_return: <最小下一项 review/probe、owner 和触发条件>
```

最后追加一段 cross-case note：哪些判断可由本 task 观察，哪些需要真实 consumer、matched
baseline/treatment、独立 semantic review、acceptance 或 adoption regression 才能成立。不要
把输出变成 WorkCell 协议修改或实现计划。
