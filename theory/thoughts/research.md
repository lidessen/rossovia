# 研究、实验方法与 harness 研究候选

> 用户关于受控实验、试行采用、研究结算、harness 研究方向与设身处地方法的原始想法。
> 注：004A/004B/005A/006B/007A/007B 在归档回执中未保留逐字原文，以下按处理回执整理要点；
> 归档保留的用户原话片段：「插入进去」「借鉴参考」「不能长期未结算」。

## IN-2026-08-26-004A — 受控实验

要点（逐字原文未保留）：

- 用户提出受控实验方向，原话片段含「插入进去」；处理为 controlled-experiment-design 候选：先明确实验要解决的真实问题、baseline、对照与证据条件，再决定是否 Run。

## IN-2026-08-26-004B — 试行采用（bounded trial adoption）

要点（逐字原文未保留）：

- 用户提到「借鉴参考」方向；处理为有界试行采用候选：暂用 `bounded trial adoption / 有界试行` 描述受限采用关系，不创建全局 status enum、政策 registry 或永久 acceptance。

## IN-2026-08-26-005A — 研究结算与闭环

要点（逐字原文未保留）：

- 用户提出研究「不能长期未结算」；处理为 research settlement：`research-open` 只能是临时状态，合法路线包括 bounded trial、canonical proposal、有限 owner-gated hold 和有理由的 `archive-*`。

## IN-2026-08-26-006B — 主 Agent 项目级工作方法

要点（逐字原文未保留）：

- 用户提出主 Agent 在项目级/更大任务中恢复整体、选择方法、利用哲学/theory/skills/最新研究、委派有界贡献、fan-in、review、checkpoint 和 settlement 的工作关系；并保留用户对该方向「比较重要且优先级比较好」的 source-native 判断。
- 边界：不是总控 Agent、自动最新研究导入器、scheduler、registry 或 runtime。

## IN-2026-08-26-007A — 问题复杂度与工具准备

要点（逐字原文未保留）：

- 用户提出「复杂度决定处理方式」「必要时创造/打磨工具」；按问题 profile 调整准备深度和工具 readiness，不预设全局复杂度 enum 或自动调度。

## IN-2026-08-26-007B — 工程控制论与 harness 可靠性

要点（逐字原文未保留）：

- 用户提出「研究工程控制论使不稳定性收敛」；把扰动、状态、观测、反馈、纠偏、恢复和 residual risk 映射到 harness 工程。先核验钱学森《工程控制论》的版本与概念，不把类比直接写成理论或 runtime guarantee。

## CORR-2026-08-26-002 — 实验问题先于载体对照

原文（用户回看 pilot 后的纠正，语义保真）：

> 实验首先要明确它要解决的真实问题；上一轮 reminder 对照没有制造或观察长时间执行 Agent 的遗忘，因此不能回答机制是否有效。

修订：主问题收窄为长时间执行中的功能性遗忘与连续性——已经建立且仍有效的目标、约束、决定和进度，在延迟、干扰、中断、上下文压力或恢复后是否仍能被正确使用。storage、retrieval、use、revision、goal/progress、resume 作为诊断层，不把「reminder 被读取」当成主结果。

## IN-2026-08-25-002A — 设身处地

原文：

> 又想到一个，设身处地，我觉得这很多地方可以用到。设身处地、换位思考，本质上是把自己或者 agent 放在一个目标场景里，以第一视角去观察和行动。这在写 prompt 和 skill 的时候是有用的，和之前营造 harness 氛围的说法是呼应的。设身处地既是价值观，也是方法论。

去向：与 owner-facing-progress / situated decision 方向一致；它是价值观也是方法论，不是 roleplay 或人格。
