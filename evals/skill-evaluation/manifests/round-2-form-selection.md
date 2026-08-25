# Round 2 对照清单：form-selection

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-form-selection`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-FS`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-FS` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`3ccd412e75f7ebc3f2a93624ac76afc6c5b2e8b6072cd773abfbb036b4a10761`
- 原始来源：`R2-FS` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`87c19e600812787cc2682d3fe142f3e701c6e9da50eef8de24293f740f283183`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回文字，不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：完成 A 至 G 的形式处置和一次末尾位置检查后停止

## 唯一处理变量

- 候选 skill 方法：`form-selection`
- 候选 skill 载体：`.agents/skills/form-selection/SKILL.md`
- 已失效的原预注册载体 SHA-256：`0afe3b6badcfc7e4c1562d86b1a04eb06ab1bd0ed5f119cd9eadc4f0f006dc37`
- 当前候选载体 SHA-256：`1c4a8a6672edf5967118a7e404389a34d8771d24f489e2a3a386b316492bac6b`
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

- 目标判断或行动：按对象、地位、生命周期和接收情形选择最小真实形式，并拒绝统一新子系统
- 正例：A 的耐久解释与 B 的选择性方法载体
- 负例：每项各建一份长期文件并放入 `knowledge-system/`
- 最近邻 owner：C 的条件性版本事实、D 的持续项目边界、E 的有限工作、F 的硬效果机制、G 的可重建视图
- 必须保留的来源、约束与未知：供应商仍拥有字段事实；D 从任意入口可见；F 可绕过文字；生成成本尚未测量
- 重大缺陷：第二权威、生命周期失真、方法吞并硬约束、以路径整齐代替形式判断
- 预期可观察差异：treatment 修正载体准入、降级、转交或拒绝；仅改变目录名不计
- 机械判定项：A 至 G 均有处置；明确 G 的来源关系；文件位置只在判断末尾出现
- 需要独立语义判断的项目：形式是否真实且最小；C/D/F 是否交给足够近或足够强的 owner；是否避免过度结构化
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称任何形式判断改善、matched 归因或收敛
