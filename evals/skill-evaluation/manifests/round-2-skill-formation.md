# Round 2 对照清单：skill-formation

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-skill-formation`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-SF`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-SF` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`3dd4ddd7f25b52a77b91faab5f2f4f503aeaae21d4605dd340a970dcafaa8751`
- 原始来源：`R2-SF` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`c74a067c81361817f885f48f92aae0bf9a27be6bea8913f7cee0fc430c10b230`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回文字，不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，porcelain 摘要不足以标识完整内容）`
- 其他上下文：两次只接收本项 task/source；不得接收本项“评审预注册”、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：完成逐字任务要求后停止，不扩展题面

## 唯一处理变量

- 候选 skill 方法：`skill-formation`
- 候选 skill 载体：`.agents/skills/skill-formation/SKILL.md`
- 已失效的原预注册载体 SHA-256：`449c1f5f9fe92d1742be28160941c392c1a7e93b5dddfeadf8051a8925d84942`
- 当前候选载体 SHA-256：`60e04d161bc84ba049b4d0d86ee2245335bc008c2d3b48dda0ca3dd491ab8eda`
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

- 目标判断或行动：只把反复、任务条件下、尚无更近 owner 的材料选择与来源地位差距列为 skill 方法及其载体候选，并拒绝将局部修正、版本事实和硬效果保证并入同一方法
- 正例：事实包 A，且只能进入 skill 方法及其载体的候选判断
- 负例：把四项统一编码为一个 skill，或从单次重跑直接声称改善
- 最近邻 owner：B 的局部文档；C 的带来源版本事实；D 的效果机制
- 必须保留的来源、约束与未知：A 的七次观察、一次临时提示重跑、成因与现有 owner 未知、没有 matched 证据
- 重大缺陷：owner 错置、证据越级、让方法承担跨重启硬保证
- 预期可观察差异：准入、拒绝、转交或证据校准发生实质变化；增加篇幅或 skill 术语不计
- 机械判定项：四项均被处置；候选载体与 task/source 的运行时 hash 分别符合本清单；输出没有宣称已完成 matched 验证
- 需要独立语义判断的项目：A 是否被有条件准入；B/C/D 的转交是否真实；不新增形式情形是否足够强；处置是否成比例
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称 `behavior-observed`、`boundary-supported`、`matched-improvement`、`regression-supported`，也不能决定候选载体 retain/rewrite/delete
