# Round 2 对照清单：agent-delegation

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-agent-delegation`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-AD`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-AD` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`a5a18efc80cfc0c5476a83d64d74d0e840103af506e344a0d14e5e6994f0b046`
- 原始来源：`R2-AD` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`d0759886196d60929d10a6dfad95d334d75c8cf747ea0d12e7a4ca2aa720ffb0`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回工作安排，不启动 Agent、不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：完成贡献划分、返回关系和整体重接安排后停止

## 唯一处理变量

- 候选 skill 方法：`agent-delegation`
- 候选 skill 载体：`.agents/skills/agent-delegation/SKILL.md`
- 已失效的原预注册载体 SHA-256：`4768bd6a54c53ed9257e7a5c1b15709947a68dee0d9243acd1c9655587001b26`
- 当前候选载体 SHA-256：`35c624a5d78e91027cbe69f486c125ea1df98224a93598252a3f46d5d05b5c5a`
- baseline 激活状态：须核实未加载候选载体、未发生候选 skill 激活，也未通过项目自动发现间接读取载体
- treatment 激活状态：须核实只比 baseline 额外加载上述候选载体，并在本任务中发生一次激活；运行时任一 hash 变化即作废本清单或显式建立新版本

## 隔离检查

- 两次运行使用相同模型与设置：`uncertain（未运行）`
- 两次运行收到逐字相同的任务：`uncertain（未运行）`
- 两次运行可见相同的原始来源：`uncertain（未运行）`
- 两次运行使用相同工具、权限与 harness：`uncertain（未运行）`
- 两次运行使用相同 workspace state：`uncertain（未运行）`
- treatment 除候选 skill 载体及其一次激活外没有新增理论、reference、示例或提示：`uncertain（未运行）`
- runner 未读取另一组输出：`uncertain（未运行）`
- reviewer 未参与候选写作或两次运行：`uncertain（未运行）`

## 预注册判断关系

- 目标判断或行动：只拆分独立、可重接且收益超过协调成本的贡献，并由主 Agent 保留跨来源综合和验收整体
- 正例：三组只读、互不阻塞的来源调查
- 负例：并发改写相互依赖的同一小节；为六行机械替换另行委派；按主题数机械分工
- 最近邻 owner：第二写作者可作只读挑战或等待定义稳定后串行贡献；worktree 隔离不替代语义综合
- 必须保留的来源、约束与未知：三组资料可独立取证但结论可能冲突；例子依赖定义；共享文件；主负责人保留验收
- 重大缺陷：写冲突、贡献边界不清、返回不可重建、投票或拼接代替综合、主 Agent 放弃整体
- 预期可观察差异：treatment 改变是否委派、允许效果、必要返回或重接动作；增加角色名和步骤数量不计
- 机械判定项：三类工作均被处置；共享文件没有两个并发 writer；明确最终综合者；没有投票或直接拼接
- 需要独立语义判断的项目：独立面是否真实；贡献返回能否重建证据；主 Agent 保留的整体是否足够；委派成本是否成比例
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称委派改善、matched 归因、regression 支持或设计收敛
