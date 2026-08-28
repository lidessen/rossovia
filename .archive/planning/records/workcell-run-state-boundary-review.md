# WorkCell 执行状态与记录收尾边界审查

状态：`source-contradiction-observed / simplify-applied-to-design-candidate / acceptance-pending`；
不是协议 acceptance、runtime state、recording queue 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. Review unit、来源与对象

本 review unit 只处理 `WorkCellRun.state` 与 `WorkCellRunRecord` 生成之间的生命周期边界。
canonical source 是 [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) §6.2、§6.5、
§9.2、§17.2、§18.9；相关 planning source 是
[`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) 与
[`workcell-design-acceptance-readiness.md`](workcell-design-acceptance-readiness.md)。

真实对象不是一个新的持久化机制，而是两个现有对象的关系：

- `WorkCellRun.state`：coordinator 内部一次活跃执行的生命周期；
- `WorkCellRunRecord`：终止后可消费的执行事实投影。

它不决定 host cutoff、迟到 observation、retention、correction 或 acceptance owner；这些继续由
§17.2 与 readiness matrix 的对应 owner 关系拥有。

## 2. Source revision 前观察到的矛盾

本 review 在 source revision 前的 protocol baseline 同时表达了以下关系：

1. `WorkCellRun.state` 的 union 包含 `recording`；
2. transition 写成 `completed -> recording -> completed`、`failed -> recording` 和
   `recording -> completed | failed | cancelled`；
3. 同一节又明确 `recording` “不是额外的执行阶段”，而是终止后的记录收尾；
4. `WorkCellRunRecord.execution.state` 已经只允许 `completed | failed | cancelled`；
5. §9.2 把取消拆成 `cancelling → draining → recording`，导致 public Run state、host drain 和
   record production 处于同一条状态轴。

这不是一次 provider 失败或 host policy 的假设，而是当时 design text 内部可复现的状态分类矛盾。
它会让 consumer 无法稳定回答：`completed` 是否已经是执行终态、`recording` 是否可被观察/取消、
以及 RunRecord 尚未完成时是否仍可把执行状态当作终态事实。它还会把 record finalization 误读成
新的 execution state 或隐含 queue/worker 机制。

## 3. 机制设计判断

### Identity

- `WorkCellRun.state` 的对象是执行生命周期，不是记录生命周期；
- `WorkCellRunRecord` 的对象是事实投影，不是活跃执行；
- `recording` 若只是 coordinator 的局部 bookkeeping，就不应成为跨层 canonical state；
- `WorkCellRun` 与 `WorkCellRunRecord` 仍保持一对多不可混淆的 lifecycle boundary，retry/continue
  仍建立新 run。

### Origin 与最简单替代

最简单的替代不是增加 `recordingState`、queue、registry 或新 runtime controller，而是移除
`recording` 这一公共 Run state：

- `WorkCellRun.state` 只保留 `admitting | running | cancelling | draining | completed | failed | cancelled`；
- 取消流程是 `cancelling → draining → terminal execution state`，之后由 coordinator 生成或
  尝试生成 `WorkCellRunRecord`；
- record finalization 可以是实现内部的局部工作，但不是 WorkCell core 的公共 Run state；
- 未确认 effect、usage、failure 或 evidence 仍必须在可生成的 record 中保留为 structured
  `unknown`/`unavailable`，这不等于 record 已被接受或所有 evidence 已齐全。

这个替代减少一个公共状态和一个终态回环，同时保留 bounded drain、unknown effect、执行终态和
事实记录的分离。它没有决定 cutoff、迟到 correction 或 record retention policy。

### Destination

目标关系是：

```text
live execution lifecycle  → terminal execution state
                          → record finalization / RunRecord fact projection
                          → checks / review / acceptance (separate owners)
```

如果未来需要对“Run 已终止但 record 尚未可消费”进行跨进程观察，那是另一个由
protocol/record/evidence owner 定义的 record availability contract；不能用 `recording` 偷带该
contract。

## 4. 最小改变与允许效果

本轮对 design candidate 做的最小改变：

1. 从 `WorkCellRun.state` union 和 public transition 中移除 `recording`；
2. 将 §6.2 与 §9.2 改为“terminal execution state 后进行 record finalization”；
3. 保留 `WorkCellRunRecord.execution.state` 的 terminal facts、unknown effect 和 §17.2 的开放 owner；
4. 在当前 source applicability/readiness projection 中把 `recording` baseline 改为
   `terminal execution state + record finalization`；
5. 不增加字段、状态、队列、registry、event bus、retry controller、host policy 或实现代码。

禁止效果：

- 不选择 A bounded-drain cutoff；
- 不决定 record 是否必须跨进程即时可消费；
- 不决定 Binding expiry/revocation、late correction、retention 或 acceptance；
- 不把本次 source revision 当作协议 acceptance、runtime guarantee 或实现 authorization。

## 5. Owner、证据与回返

| 字段 | 当前值 |
| --- | --- |
| protocol owner | `unknown` |
| coordinator-lifecycle owner | `unknown` |
| record/evidence owner | `unknown` |
| observed evidence | canonical design text 的内部状态矛盾；无 host Run |
| evidence standing | `design-boundary-observed / source-contradiction-observed` |
| disposition | `simplify-applied-to-design-candidate / acceptance-pending` |
| implementation authorization | `false` |
| revisit | owner 对 public state、record availability、drain cutoff 或真实反例提出相反要求时 reopen |

设计接受前，owner 可以保留 `recording` 作为明确的内部非 canonical bookkeeping，但若要重新把它
放回 `WorkCellRun.state`，必须提供会改变决定的跨层 consumer、终态/记录可观察性的反例和相称的
state contract；不能只以“实现方便”恢复旧状态。

## 6. 阶段影响

本审查把一个内部表达矛盾收窄为 `WorkCellRun` 执行状态与 `RunRecord` 记录收尾的单一边界问题。
它推进了 design candidate 的一致性，但不关闭 A bounded drain，也不满足 WorkCell design acceptance。
DeepSeek Harness、Vercel/Pi executor comparison、base/runtime 和所有实现仍等待后续 owner-backed
design decision 与 acceptance。
