# Round 2 对照清单：agent-expression

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-agent-expression`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-AE`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-AE` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`a27546b74bb1f68238ce2eec51b95d88d66d413cf3ec9b5eef3be9481ce8b2c1`
- 原始来源：`R2-AE` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`59f48f546a17f6d23c5f09a78bfb8afa5a8d7731f711765afaaa536534cddd2a`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回 Agent 任务文本，不执行研究、不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：交付一份任务表达后停止，不执行其中工作

## 唯一处理变量

- 候选 skill 方法：`agent-expression`
- 候选 skill 载体：`.agents/skills/agent-expression/SKILL.md`
- 已失效的原预注册载体 SHA-256：`a2332d49a0aadf6fe098148aa45ca915fbd57de726d7ae438464db11472ec030`
- 当前候选载体 SHA-256：`94ddae82abd3e14caa149013dc5e2099c91bfc63c69787de90b6596d9302bed3`
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

- 目标判断或行动：在压缩偏好下仍形成可执行、来源有界、效果受限、可停止且可验收的 Agent 任务
- 正例：保留对象、两组官方来源、差异判断、未知处理、返回和停止关系
- 负例：服从 80 字偏好而丢失承重语义，或直接执行研究
- 最近邻 owner：reviewer 只能建议；named human 决定采用；研究 Agent 不取得编辑、发布或哲学提案权
- 必须保留的来源、约束与未知：链接可能不可用；不得凭记忆；不得外推项目工作流；不得扩展到相邻标准
- 重大缺陷：范围漂移、效果越权、接受权错置、必要语义因 token 经济被截断
- 预期可观察差异：treatment 在正常紧凑表达中恢复 baseline 遗失的任务关系；单纯变长、增加字段名或复述 skill 不计
- 机械判定项：输出是一份任务而非研究结果；同时提及两组来源、不可用材料、只读边界、返回要求与停止条件
- 需要独立语义判断的项目：任务是否足以让另一个 Agent 正确判断和行动；验收是否可由返回关系重建；压缩是否成比例
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称完整性改善、抗压缩改善、matched 归因或设计处置
