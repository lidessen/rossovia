---
kind: transition-package
id: project-bootstrap-2026-08-26
status: provisional
owner: Main
---

# 项目过渡工作包（临时）

这是当前项目在“正式工作流尚不能可靠自举”时使用的一次性启动包，不是新的 goal、plan、ledger、队列、
状态机或长期 canonical authority。它的目的只有一个：把已有成果压缩成一次可以真实行动、观察、交接和
退出的入口，再交给 [`bootstrap/AGENTS.md`](../bootstrap/AGENTS.md) 这个下一代项目开发种子。

## 为什么进入过渡

用户要求打回上一版 workflow 方案。上一版方案默认 `README → plan → workflow` 已经是可靠入口，但这些
对象本身仍在恢复和重构中；继续用完整 `plan.md` 驱动 workflow 会形成自举循环。WorkCell 设计和实现继续暂停。

## 临时使命

让一个没有当前对话隐含记忆的 Agent 能够：

1. 判断当前项目要先解决什么；
2. 判断当前哪些事情明确不能做；
3. 选择一个真实、最小、可回退的下一行动；
4. 返回可由 Main 复核并交接的结果。

这不是把全部历史整理完，也不是接受新的正式 workflow。

## 当前最小快照

- **方向：** 先恢复本项目可运行的工作面，再从实践中提炼 workflow、结构和 skills。
- **当前目标：** 用户要求的整体 planning/harness 工作继续推进，但不能跨越 WorkCell 实现冻结。
- **可信边界：** [`AGENTS.md`](../AGENTS.md) 的项目边界；[`planning/item-ledger.md`](item-ledger.md) 的当前
  跨 item standing；本项目 inbox 的 [`IN-2026-08-26-018A`](inbox.md#in-2026-08-26-018a)；WorkCell 暂停的当前入口说明。
- **设计前综合而非当前入口：** [`design/harness-workflow.md`](../design/harness-workflow.md) 和旧的
  [`plan.md`](plan.md) workflow-reconstruction 主体；它们可以提供输入，不能作为本次 bootstrap 的 seed work map。
- **下一代开发种子入口：** [`bootstrap/AGENTS.md`](../bootstrap/AGENTS.md)；它承载指导 Agent 开发本项目的 `AGENTS.md`
  和按需 workflow/development skills。分析 maps 不属于 bootstrap 的 active surface。
- **不必读取：** 全部 dated history、全部 records、全部 skills、全部 theory。只在当前判断确实需要时按链接回读。

## 本轮允许效果

- 从上述来源提取一个更小的 seed work map；
- 安排真实独立贡献，并由 Main 负责综合；
- 执行一个局部、可观察、可回退的 planning/design 动作；
- 将结果交给下一 Agent 或正常项目 workflow；
- 修订本工作包自身，或在它失效后将其结算、降级、归档。

## 明确禁止

- 不改写 goal 的方向、owner 或接受关系；
- 不把过渡包变成第二份 plan、ledger、queue、registry 或永久角色；
- 不固定永久 Agent 数量或阶段顺序；bootstrap 先按下一代开发任务设计最小入口和 skills，再通过实践修订；
- 不批量迁移、复制或删除文档/skills；
- 不接受 workflow、WorkCell、DeepSeek Harness 或任何 runtime/implementation；
- 不把文档写成、Agent 返回写成或 validator 通过写成“已经点燃”。
- 不把组建图、skill map 或目录存在写成已经形成班子；必须由可加载的临时 `AGENTS.md`、skills/工具和真实任务
  观察共同证明责任覆盖。

## 第一项真实行动：冷启动交接测试

未参与本工作包设计的 Agent 只读取本文件及本文件明确链接的必要当前 source，不读取完整历史，不依赖本次
对话口头补充，然后返回：

1. 当前问题和真实场景；
2. 下一项最小行动；
3. 允许效果和明确禁止；
4. 结果应回写或交给谁；
5. 仍然无法确定的 unknown。

该 Agent 不修改共享文件。Main 根据返回判断它是否能独立接手；若能，再由 Main 执行一个小型真实 planning
动作；若不能，优先修订本工作包或回到更简单的直接处理，不继续扩写 workflow。

## 点火、交接和回落

达到以下观察，才认为本轮点火：冷启动 Agent 能准确恢复目标、边界和下一步；真实任务产生了可观察进展；
下一步不依赖发起者的隐含记忆；Main 能把结果交给正常 workflow 试行。

点火后只交出：已验证的当前入口、本轮 decision delta、剩余 unknown 和下一项真实工作。临时协调关系和
不再承重的包内容立即失效。

如果冷启动失败、无法确定真实目标、协调成本超过收益、产生更多文档却没有行动，或需要 owner 才能决定，
就停止扩张；保留失败和 unknown，回退到最近可靠 source，不把失败流程固化为 skill、规范或 runtime。

## 本轮点火观察（2026-08-26）

一个未参与本工作包设计、没有本次对话记忆的冷启动 Agent 只读取本包及必要 source 后，能够独立恢复当前
问题、真实场景、下一行动、允许效果、禁止事项、交接对象和 unknown，并判断可以接手 bounded planning action。
它没有修改共享文件，也没有把 WorkCell 或实现当作下一步。

本次 decision delta：过渡包已足以支撑一次有限交接，但还不足以证明正式 workflow、结构或过渡机制已经接受。
Main 已据此把本包加入 `planning/README.md` 的条件式读取入口；下一步仍是选择并执行一个已有 source 支持的
窄 planning/design 动作，随后检查能否脱离本包交给正常 workflow。
