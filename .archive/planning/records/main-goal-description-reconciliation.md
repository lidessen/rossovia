---
kind: planning-record
id: main-goal-description-reconciliation
status: active
disposition: objective-revised
evidence: user-directed
settlement_route: goal-service-objective-revision-or-superseding-projection
owner: "unknown"
consumer: planning-main-goal
review_at: goal-scope-change
---

# Main goal 描述回接

source：`user-directed`
scope：`reconciled`
goal service objective：`revised`
project projection：`reconciled`
lifecycle：`active`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 调整原因

当前 goal 的主干仍然正确：盘点整个 planning，建立每项的来源、standing、owner/consumer、证据、处置和
阶段出口，先完成理论/设计，再决定 WorkCell、DeepSeek Harness 和实现。最近新增的用户输入暴露出
三个需要在目标描述中明确、但不应扩张成无界任务的关系：

1. harness 的工作准备应按具体问题的复杂度、耦合、持续时间、后果和工具压力缩放；
2. 复杂问题的工具准备包括复用、选择、创造和打磨 skills/scripts，而不是只依赖预先存在的工具；
3. harness 需要研究如何通过观测、反馈、控制、纠偏和回归，使不稳定环节在目标场景内收敛。

此外，research candidate 不能长期停在 active：研究应在有真实 consumer 后进入 bounded application/trial，
再经过 review 后 adopt/adapt，或明确 archive/no-proposal。这个闭环是目标的工作方式，不是新增 scheduler
或 runtime。

## 2. 当前项目侧目标投影

> 建立并推进整个 planning 的主 goal：以当前 authority 和 source 为基础，盘点 `planning/roadmap/plan`
> 及其关联的 `theory`、`design`、`research`、`evals`、`experiments` 和 incubating skills，逐项识别
> 当前可推进的 planning item，并为每项建立来源、standing、consumer/owner、依赖、允许范围、证据、处置、
> 阶段出口和 revisit 关系。
>
> 在此基础上形成一套按问题复杂度缩放的 harness 工作方法：先认识问题、真实场景、主要矛盾、工作量和
> Plan，再按需选择、创造和打磨 skills、scripts 及其它工具；同时研究通过观测、反馈、控制、纠偏、恢复和
> 回归，使 harness 的不稳定环节在目标场景内逐步收敛为可靠系统。
>
> 形成主 Agent 的项目级工作方法：多步骤、多任务、并行、等待、handoff 和验证由 Plan/Todo/work map 驱动；
> 根据真实依赖、隔离性、协调成本和预期净收益，选择 direct、sequential、parallel 或 nested delegation。
> sub-agent 只承担有来源、有边界、可独立回读的局部贡献；生产、独立 review 和 acceptance 分离，由 Main
> 保留整体目标、authority、冲突、unknown、fan-in 和最终 projection。并行度、Agent 数量、工具调用次数和
> 文档数量都不是目标，不能用委派掩盖协调成本或丢失整体责任。
>
> 在人机协作和 harness 运行关系上，默认自主推进；小错只在可观察、可限制、可回退或可补偿的范围内事后
> 纠偏；重大方向、权限、共享基线、不可逆后果或关键安全行动才请示。设身处地、focus refresh 和重要方法
> 复述只在场景、角色、阶段、风险或纠偏改变注意关系时使用，不机械重复稳定常识。
>
> 按“source/research → bounded application or trial → independent review → adopt/adapt/archive/no-proposal”
> 的闭环推进，不让研究候选长期未结算。优先推进有价值文档/skills 迁移、设计开发与主 Agent 工作方法，
> 再收敛 WorkCell 设计、设计基于 DeepSeek Harness 的工作系统；只有相应设计和接受关系成立后，才建立
> 实现计划并实现系统，最后在已实现的工作系统上承载和验证用户的 harness 构想。
>
> 不把未决规划、研究候选、局部观察或工具准备写成实现授权；在 WorkCell、DeepSeek Harness 和 base/runtime
> 的设计与接受关系成立前，不开始对应实现。

## 3. 保持不变的边界

- 阶段顺序不变：剩余有价值材料和方法 → WorkCell 设计 → DeepSeek 工作系统设计 → 设计接受后的实现；
- 问题复杂度是待观察的 profile，不在 goal 层固化成稳定 enum、分类器或自动调度机制；
- “善假于物”“工欲善其事，必先利其器”和钱学森《工程控制论》是研究来源/方法线索，不是已接受理论、
  skill 或验收标准；
- 工具、skill 和脚本可以成为 bounded application 的候选，但其权限、隔离、持久化、恢复、并发和外部效果
  仍由真实 host/runtime/base owner 负责；
- 当前 goal 仍为 `active`，没有因为描述回接而取得 WorkCell、DeepSeek Harness、base/runtime 或任何实现授权。
- sub-agent、Plan/Todo、默认自主和事后纠偏是方法能力与边界，不是每个任务都必须机械执行的步骤，也不改变
  Main、owner 和 acceptance 的责任归属。

## 4. Goal service 与项目投影的关系

在本轮用户确认旧 goal 已清理后，goal service 已用本 record §2 的文本创建新的 active goal；当前 goal ID
仍为 `01a0370c-d215-7680-909f-6145a34dc1bf`，服务返回的 objective 与项目侧投影一致。README 和 item ledger
继续保留链接，承担发现与回读职责，不形成第二个 goal。后续若 goal scope 变化，必须重新创建带修订血统的
objective，并同步本 record、README 和 current checkpoint；不能只改 projection 而不核对 goal service。
