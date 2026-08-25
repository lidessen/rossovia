# Round 2 对照清单：dual-audience-expression

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-dual-audience-expression`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-DA`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-DA` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`e387da139184e75736ee9308ad738cdaf465adb29edab46db647a6c982302c62`
- 原始来源：`R2-DA` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`96308fb69724225674513ed64e5ca382542fa932494c9cf023a27bd8258ff440`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回设计说明，不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：交付最小安排、一次变更流程和回归判断后停止

## 唯一处理变量

- 候选 skill 方法：`dual-audience-expression`
- 候选 skill 载体：`.agents/skills/dual-audience-expression/SKILL.md`
- 已失效的原预注册载体 SHA-256：`38d2a259fb72fc20de7caff9168a9633dfad6c51f2774f1c619f063471072f00`
- 当前候选载体 SHA-256：`764893985f7c974c8664246da19a84292966dd38b46c3f123bd41c4ec0c706b8`
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

- 目标判断或行动：保持一个可追溯语义核，同时为人类理解和 Agent 行动形成不同视图及变更回归
- 正例：维护者理由与 Agent 行动边界都回到更新后的 named-human 规则
- 负例：继续维护两份无来源关系的复制文本，或把字面相同当成语义一致
- 最近邻 owner：人类解释不替代 Agent 行动表达；Agent 短句不取得规则地位；reviewer 不取得接受或发布权
- 必须保留的来源、约束与未知：真实漂移事故、两类接收需要、生成成本与收益未知、不预设必须两个文件
- 重大缺陷：第二权威、更新顺序失真、回归只比文本、接受权错置、无必要地扩大结构
- 预期可观察差异：treatment 改变唯一依据、视图派生、更新顺序或语义回归；表面文字更一致不计
- 机械判定项：明确规则先改哪处；两类接收结果均可回指；有变更后检查；未让 reviewer 发布
- 需要独立语义判断的项目：安排是否真有一个语义核；两种视图是否各自适配且不独立掌权；生成选择是否成比例
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称同步改善、漂移消除、matched 归因或回归支持
