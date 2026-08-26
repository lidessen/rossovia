# Round 2 对照清单：concept-articulation

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-concept-articulation`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-CA`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-CA` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`7eecf3fc209dca9f81f23a2a68e69045cab8a71f9754790722cab8ba97de929e`
- 原始来源：`R2-CA` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`7b0d4b02729687aee967a256a0631c1d104548696c7dc1e8951e122f17b58ac7`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回文字，不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：形成最小必要概念组并完成名称建议后停止

## 唯一处理变量

- 候选 skill 方法：`concept-articulation`
- 候选 skill 载体：`.agents/skills/concept-articulation/SKILL.md`
- 已失效的原预注册载体 SHA-256：`9c53cca1c49fec621d4ca427263f241f06f64b757013fe7e567ee6672ba1883d`
- 当前候选载体 SHA-256：`147de22b52863041b6daf65dcafff9bf6bb554a8570b3a25a238d9b1d4540e1a`
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

- 目标判断或行动：从对象、特征和交接关系建立最小必要区别，先定义后命名，并让区别改变下一步判断
- 正例：区分执行结果、结构符合、语义建议、有权接受和已发生的外部发布效果
- 负例：按记录数机械造词，或继续用“完成”替代所有判断
- 最近邻 owner：执行结果不取得产物符合；review 建议不取得接受；接受不等同于当前外部效果
- 必须保留的来源、约束与未知：撤回后仍存在旧生产内容；名称语言偏好与“完成”是否保留均未知
- 重大缺陷：先名后定义、定义循环、接受/发布权错置、区别不能支持交接动作
- 预期可观察差异：概念边界或命名顺序修正了 baseline 的实际混淆；同义改写和表格变整齐不计
- 机械判定项：使用临时指称；名称出现在定义之后；给出包含、最近排除和可证伪例子
- 需要独立语义判断的项目：概念组是否最小且充分；时间变化和外部效果是否被正确表达；名称是否与定义相称
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称任何行为改善、边界支持、matched 归因或设计处置
