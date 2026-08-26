# WorkCell parent relation 边界审查

状态：`source-ambiguity-observed / simplify-applied-to-design-candidate / acceptance-pending`；不是协议
acceptance、lineage registry、runtime controller 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. Review unit、来源与对象

本 review unit 只处理 `WorkCellRunRequest.parent.relation` 的 canonical relation set。来源是
[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) §6.1、§8.2、§9.3、§17.1–§17.2、§18.12，
以及 [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) 的 D review。

对象是跨 Run 的 parent relation，不是新的执行状态、记录服务或任务树。当前已有两种被协议规则和
lineage review 完整覆盖的关系：

- `retry-of`：因重试产生的新 request/run；
- `continued-from`：继续执行产生的新 request/run。

上游 Task/WorkItem 是否由另一个任务派生，不属于 WorkCell core 的执行因果语义。

## 2. Source revision 前的 ambiguity

本 review 所依据的 previous source edge 中，`WorkCellRunRequest` 的 relation union 同时声明
`derived-from | retry-of | continued-from`，但：

1. §6.1 的规则只解释新 `requestId`/`runId`、`retry-of` 和 Binding 关系；没有定义 `derived-from`；
2. §9.3 的重试语义只使用 `retry-of`，§17.1 与 §18.12 只把 `continued-from` / `retry-of` 作为 lineage baseline；
3. D review 的 fixture、反例和 recovery unknown 只围绕 `retry-of` / `continued-from`，没有
   `derived-from` 的 consumer、effect merge、恢复或错误 relation contract；
4. 当前没有 named parent-lineage consumer、owner 或 acceptance relation 能够为第三种关系补足这些语义。

这会让调用方猜测 `derived-from` 是否表示 task derivation、fork、resume、retry 的泛化，或是否需要
合并 workspace effect、继承 Spec/Binding、保留 parent record。它不是单纯的命名问题，而是一个未定义
的 load-bearing relation。

## 3. 机制设计判断

### 更简单的选择

| 选择 | 代价与边界 | 当前判断 |
| --- | --- | --- |
| 保留三种 relation 但不定义 `derived-from` | 让不同 consumer 自行猜测语义；可能混淆 task derivation 与 execution lineage | `reject / source-ambiguity` |
| 为 `derived-from` 补完整 core contract | 需要定义 relation object、effect/Spec/Binding inheritance、retention、错误关系和恢复规则；当前没有 consumer/owner | `route-to-owner / no-proposal-now` |
| v1 移除 `derived-from`，保留 `retry-of` / `continued-from` | 删除一个未承载的公共关系；generic task derivation 留给 Task/WorkItem；真实 consumer 出现时另开版本化 review | `simplify` |

最小有效改变是第三项。它不增加新的机制，只收窄 canonical union，使协议只承载已有
`retry/continue` 规则能够解释的执行因果关系。若未来确实需要通用派生关系，必须先给出真实
consumer、owner、effect/identity 规则和相称反例，再作为新的 design unit 回返。

## 4. 最小改变与目标关系

本 review 当时对 design candidate 提出的、现已应用到 canonical source 的最小改变是：

1. 从 `WorkCellRunRequest.parent.relation` 移除 `derived-from`；
2. 将 parent relation 的 canonical v1 关系限定为 `retry-of` 与 `continued-from`；
3. 在规则中明确 generic Task/WorkItem derivation 不由 WorkCell core 表达；
4. 保留 parent record 缺失、retention、错误 relation、Spec/Binding inheritance 和 unknown 深度为 D
   review 的开放关系；
5. 不增加 `derived-from` 的别名、lineage registry、event、queue、retry controller 或 runtime state。

目标关系：

```text
Task / WorkItem derivation       → 上游任务/调度层拥有
retry / continue execution       → new RunRequest + new Run + parent relation
```

这不是对上游 Task/WorkItem schema 的设计，也不阻止 future owner 提出新的跨 Run relation；它只是拒绝
让未定义的 generic relation 进入当前 WorkCell core。

## 5. Owner、证据与未知

| 字段 | 当前值 |
| --- | --- |
| protocol owner | `unknown` |
| lineage / record owner | `unknown` |
| observed pressure | canonical relation union 与后续语义覆盖不一致；没有真实 host Run |
| consumer | 没有 named consumer；D review 只提供 planning-level lineage boundary |
| evidence standing | `source-backed design observation / source-ambiguity-observed` |
| disposition | `simplify-applied-to-design-candidate / acceptance-pending` |
| implementation authorization | `false` |

仍未知：parent relation 的 retention、错误 relation 的结构化结果、parent request/record 缺失时的
unknown 深度、Spec/Binding 是否可复用，以及未来是否存在需要 generic derivation relation 的真实 consumer。

## 6. 反例与回返

- **P1：** 调用方使用 `derived-from` 表示 retry；不能静默把它当作 `retry-of`。
- **P2：** 调用方使用 `derived-from` 表示任务 fork；不能因此合并 parent/child workspace effect 或
  推出共享 Binding。
- **P3：** parent record 不可取；不能凭 relation 名称补出 parent facts。
- **P4：** provider session 仍存在；不能以 session continuity 补回一个未定义的 generic relation。

若出现真实 consumer，必须先回答它是 Task/WorkItem derivation 还是 execution lineage；若是后者，明确
relation identity、effect attribution、Spec/Binding inheritance、retention 和 missing-parent unknown，
再决定是否重新引入一个版本化 relation。若没有 consumer/owner，保持 `retain-unknown / no-proposal-now`，
不继续扩展 parent union。

## 7. 阶段影响

本 review 只收窄 WorkCell design candidate 的 parent relation 表达，仍不关闭 D retry/continue lineage
recoverability、WorkCell protocol acceptance 或 phase 1。DeepSeek Harness、provider comparison、base/runtime
和所有实现仍等待 owner-backed design decision 与 acceptance。
