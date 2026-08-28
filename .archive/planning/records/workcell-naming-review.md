# WorkCell 命名分层审查

状态：`design-boundary-observed / naming-candidate / independent-review-complete / acceptance-pending`；
不是协议接受、实现授权、命名 registry 或新的 canonical design。

本记录只审查 [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 当前命名是否忠实区分
对象、生命周期、owner、受众和 authority。它不因为名称看起来整齐就批准协议，也不把旧 `CellInput`
机械改名成另一种万能容器。

## 1. 命名判断标准

一个 canonical 名称必须同时回答：

1. 它是什么对象，还是一次请求/返回/运行/记录；
2. 它由哪个 owner 创建、解析、观察或接受；
3. 它的生命周期是否与相邻对象不同；
4. 它能否在不依赖 provider、调度器或自然语言的情况下稳定指向同一个关系；
5. 名称是否会暗示它拥有权限、事实、语义验收或 runtime 保证。

命名只表达对象和关系，不产生 authority。`Spec` 不授予效果，`Binding` 不等于语义接受，`Run`
不等于成功，`Record` 不等于完整事实，`Review` 不等于 `AcceptanceDecision`。

## 2. 当前 canonical 分层

| 层 | 保留名称 | 该名称实际指向 | owner / authority | 命名边界 |
| --- | --- | --- | --- | --- |
| 声明 | `WorkCellSpec` | provider-neutral 的 bounded work 声明 | caller；语义 owner/acceptance owner `unknown` | 不放绝对路径、secret、provider session、结果或 acceptance |
| 宿主授权 | `WorkCellBinding` | host 根据 Spec/policy 物化的资源与效果边界 | host/security 或 orchestrator；具体 owner `unknown` | 不把声明需求写成 grant；不由 Agent/executor 创建或扩大 |
| 启动请求 | `WorkCellRunRequest` | 请求一次 execution 的消息/对象 | caller/coordinator；acceptance owner `unknown` | 不重复 Spec，不把 request 当 Run 或结果 |
| 活跃生命周期 | `WorkCellRun` | coordinator 内部一次实际执行 | coordinator；host effect owner 另行负责 | 不用 `Session`、`Attempt` 或 `Result` 覆盖其 identity；不跨层表达 acceptance |
| 持久事实投影 | `WorkCellRunRecord` | 可保留、可比较的 execution facts projection | record/evidence owner `unknown`；不是 source authority | 不把它叫 `Result`，不因可重建投影而成为 source authority |
| 规范化观察 | `WorkCellEvent` | 类型化运行观察 | coordinator/record-evidence owner `unknown` | 不把 Event delivery order、provider trace 或时间戳自动变成事实/重放 authority |
| 证据索引 | `RunEvidence`、`EvidenceRef` | 运行证据集合与具体证据引用 | record/evidence owner `unknown`；reviewer 是 consumer，不是自动 authority | 不用 `Trace` 统称所有证据；不把引用本身当内容或接受 |
| executor surface | `WorkCellExecutionContext`、`WorkCellExecutor`、`WorkCellExecutionReturn` | executor 可使用的受控接口、执行器和局部返回值 | executor/adapter owner `unknown`；不拥有 acceptance | `Context`/`Return` 只在 executor 边界使用；不能表示持久记录或语义结论 |
| 完成契约 | `CompletionContract` | Spec 中声明完成条件、动作、输出和 artifacts 的结构 | caller 创建；semantic owner/acceptance owner `unknown` | 不授予效果，不等于完成事实或验收 |
| 完成动作声明 | `CompletionAction` | `CompletionContract` 中描述的单个结构化动作 | caller 声明；executor/coordinator 只消费；acceptance authority `unknown` | 不等于动作已提交、已观察或被接受 |
| 完成动作提交 | `CompletionActionCall` | executor 向 host/coordinator 提交一次动作调用 | executor 产生；host/coordinator 是接收与 admission owner，具体 authority `unknown` | 只表示 submission，不表示动作发生或成功 |
| 完成动作观察 | `CompletionActionObservation` | host/coordinator 对动作调用及其局部效果的运行观察 | host/coordinator 产生；record/evidence owner `unknown` | 观察不等于语义完成或 acceptance |
| 机械检查 | `MechanicalCheck` | coordinator 对结构、范围、文件或协议谓词的可重复检查结果 | coordinator 产生；不拥有 semantic acceptance | 不用 `passed`、`Verification` 或 `Success` 代替；不声称内容正确 |
| 语义审查 | `SemanticReview` | 外部 reviewer 按 rubric 对目标质量作出的审查 | reviewer 产生；review authority `unknown` | 不回写执行事实，不等于最终 acceptance |
| 验收决定 | `AcceptanceDecision` | 指定 authority 对 subject 作出的接受、拒绝或延期决定 | acceptance authority `unknown` 产生 | 不由动作、机械检查或 provider 自动推出 |
| 工作区/资源 | `WorkspaceScope`、`WorkspaceBinding`、`WorkspaceChangeSet`、`ResourceLimits`、`UsageObservation` | 声明范围、实际绑定、变更摘要、硬限额和实际使用观测 | caller 声明 scope/limits；host 解析 binding；coordinator/record owner 记录 change/usage | limit 不是 estimate，usage 不是 budget，scope 不是 grant |

结论：上表的核心生命周期名称可以暂时保留；其价值来自生命周期和 authority 边界，而不是名称
本身已获得协议接受。

## 3. `CellInput` 与相邻旧名称

`CellInput` 不进入下一版核心接口、持久记录或跨进程协议。它同时暗示“调用输入”“声明”“宿主
绑定”和“运行参数”，无法稳定指向单一对象。

迁移期唯一允许的关系是：

```text
LegacyCellInput --explicit adapter--> WorkCellSpec + WorkCellRunRequest
                                      --host admission--> WorkCellBinding
```

以下旧名不能作为隐式别名继续扩张：

- `CellConfig`：会把声明、host policy 和运行选择混成配置；
- `CellContext` / `Capabilities`：会把实际 grant、需求和运行上下文混成一物；
- `RunInput`：会遮蔽 Spec 与 Request 的生命周期差异；
- `CellResult` / `ExecutionResult`：会把局部返回、事实记录和语义结果混成一物；
- `Session` / `Attempt`：分别暗示 provider continuity 或重试语义，不足以表达 WorkCell run identity；
- `Trace` / `RawStep`：不能同时承担规范化事件、原始 adapter evidence 和事实投影。

## 4. 需要保留为候选、暂不强改的名称

### `WorkCellExecutionReturn`

它名字略像函数返回值，但当前正好位于 `WorkCellExecutor.run(...)` 的局部边界，且设计已经规定它
不是 `WorkCellRunRecord`、不是 `AcceptanceDecision`。在没有真实 executor consumer 之前，不把它
改成更含混的 `Outcome` 或 `Result`；若未来需要持久化或跨进程消费，应另命名为明确的 observation/
report 对象，而不是扩展 Return 的语义。

### `WorkCellExecutionContext`

`Context` 本身偏泛，但当前 interface 同时携带只读 Spec/Binding、受控 observe/tool/completion surface。
在没有 executor consumer 证明 `Context` 会导致对象或 authority 混淆前，保留完整前缀；不要缩成
`DriverContext`、`RuntimeContext` 或 `Context`。

### `WorkCellRunRecord`

名称比 `ExecutionResult` 长，但明确说明它是 Run 的 retained record。不要为缩短名称改成 `RunResult`；
若未来出现不同用途的审计/投影，应新建带用途的 record/projection 名称，不复用 `Record` 泛称。

## 5. 调度层名称不得回流 WorkCell core

当前设计后段还出现 `WorkItem`、`WorkLease`、`AttemptOutcome`、`CellBatch`、`recordOutcome`。它们
属于 WorkSource/coordinator/system 层，不是 WorkCell 的执行语义：

- `WorkItem` 是上游稳定工作条目，不等于 `Task`、`WorkCellSpec` 或 `WorkCellRun`；
- `WorkLease` 是尚未确定签发者、消费者和 authority 的 system-layer lease candidate，不等于
  `WorkCellBinding` 的 host effect grant；
- `AttemptOutcome` 是调度源接收的事实结果，若跨系统成为 canonical 名称，优先使用
  `WorkItemAttemptOutcome`，避免与 WorkCell run outcome 混淆；
- `CellBatch` 仍是 system-layer candidate/no-proposal-until-consumer；不要因为名称更完整就把它
  改成 preferred canonical `WorkCellBatch`，除非真实 batch consumer、隔离 owner 和接受关系成立；
  当前 `isolation: "required"` 只能是待验证设计假设，不能写成 runtime guarantee；
- `recordOutcome` 只表示调度源记录事实，不表示完成、接受、继续、重试或停止。

本轮只对 design candidate 中与上述边界冲突的 wording 做最小同步：将 `WorkLease` 降为
issuer/consumer/authority unknown 的 system-layer candidate，并将 `CellBatch` 的 isolation 明确为
待验证假设；没有把调度层移入 WorkCell core，也没有改变协议接受 standing。

## 6. 当前命名 standing 与出口

- `CellInput`：`legacy-adapter-only / not-canonical`；不进入核心协议。
- `WorkCellSpec`、`WorkCellBinding`、`WorkCellRunRequest`、`WorkCellRun`、`WorkCellRunRecord`、
  `WorkCellEvent`：`retain-candidate`；名称与生命周期边界当前可回读，但尚未协议接受。
- `WorkCellExecutionContext`、`WorkCellExecutor`、`WorkCellExecutionReturn`：`retain-local-boundary`
  直到有真实 executor consumer；不得从局部返回推出持久事实或 acceptance。
- `WorkItem`、`WorkLease`、`AttemptOutcome`、`recordOutcome`：`system-layer / do-not-promote-to-core`；
  `WorkLease` 的 issuer/consumer/authority 仍 `unknown`；`CellBatch`：`system-layer candidate /
  no-proposal-until-consumer`，不预先确定替代名。

本记录的证据上限是 naming/source/authority boundary observation；没有取得 WorkCell protocol acceptance、
provider choice、DeepSeek/Vercel adapter choice 或实现授权。

## Independent review

独立 reviewer：`Popper`（初轮，Agent `01a03823-f360-7b80-95b4-d75a1c1d6348`）、`Euler`（修订轮，
Agent `01a0382d-362d-76e0-9972-a7b3390a9702`）和 `Curie`（最终轮，Agent
`01a0382e-ee50-7513-b124-246f503c8d3b`）；均只读、未修改文件。前两轮指出完成对象 owner/lifecycle、
WorkLease 与 CellBatch 的 boundary wording 和 design projection 需要修订；Main 已完成最小同步，
Curie 最终确认上述七个完成对象、legacy mapping、executor surface、WorkLease、CellBatch、owner/authority
unknown 及 projection 边界成立。该 review 仍未取得 naming acceptance 或 WorkCell protocol acceptance。
