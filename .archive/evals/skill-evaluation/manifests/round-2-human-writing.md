# Round 2 对照清单：human-writing

本文件是预注册清单，不是运行记录。baseline 与 treatment 必须引用本文件；运行者只有在实际核实后才能把 `unknown` 改成具体值或 `yes`。

术语与候选载体修订使旧的预注册身份失效；下列哈希标识 2026-08-24 当前版。模型、harness 与实际激活仍未核实，不得据此声称 matched。

## 实验身份

- trial id：`round-2-human-writing`
- fixture 与版本：`fixtures/round-2.md` 的 `R2-HW`
- 执行时间：`unknown（未运行）`
- baseline 产物：`unknown（未运行）`
- treatment 产物：`unknown（未运行）`
- 独立 reviewer 产物：`unknown（未运行）`

## 共同冻结条件

- runner 配置标识：`round-2-runner-config-v1`；要求两次使用相同配置、不同新鲜上下文，且互不可见输出
- 模型与版本：`unknown（当前子 Agent 环境未暴露可核实的精确模型身份）`
- 推理或采样设置：`unknown`
- 原始任务：`R2-HW` 的标记区间 `TASK-BEGIN` 至 `TASK-END` 之间的逐字内容
- 原始任务 SHA-256：`b7b2f6997b5005b07240bbe84b75414013dd8ce47286e36d69af959140f62876`
- 原始来源：`R2-HW` 的标记区间 `SOURCE-BEGIN` 至 `SOURCE-END` 之间的逐字内容
- 原始来源 SHA-256：`238698b50779301232f9d6eabebb71b7ab0df0a60cfa21746053b4d7bba43a88`
- fixture 文件 SHA-256：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- 工具及版本：目标任务不需要工具；实际暴露的工具为 `unknown`
- 权限与允许效果：预期只返回文字，不读写仓库、不访问网络；实际强制边界为 `unknown`
- harness / system / developer 指令身份或哈希：`unknown（当前子 Agent 环境不能完整取得并核实）`
- repository `HEAD`：`2e07004c31ba33361e494f10a9b35370b9cebcd9`
- working tree 身份或快照：`unknown（预注册时工作树非干净，未冻结完整快照）`
- 其他上下文：两次只接收本项 task/source；不得接收评审预注册、其他 living skill 载体、候选的配套 P/theory/research/archive、另一组输出或旧评审
- 停止条件：交付一段可直接使用的解释后停止

## 唯一处理变量

- 候选 skill 方法：`human-writing`
- 候选 skill 载体：`.agents/skills/human-writing/SKILL.md`
- 已失效的原预注册载体 SHA-256：`b26a4d4bccc53af5ac7e5a0a73bf8abb907093dbb974875b52c20454a6eff146`
- 当前候选载体 SHA-256：`67fc61fef467a3cad01268ff6bcc1384ff72fe7102c3c4e9ebc41806daab108e`
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

- 目标判断或行动：让具体维护者恢复“载体合格不等于方法有价值”的论证、处置理由与证据限度
- 正例：形成完整自然的设计解释，并把行为差距作为对象
- 负例：把事实包改写成检查表，或将一次未核实 matched 的结果写成已证明改善
- 最近邻 owner：验证器命令留在操作手册，不进入这段理论论证
- 必须保留的来源、约束与未知：九个格式合格、三个无目标变化、两个误加载、一次隔离未核实、外推次数未知
- 重大缺陷：来源失真、论证断裂、不确定性被抹平、文件存续取代行为价值
- 预期可观察差异：读者能否准确说明删除为什么合理及何时尚不能删除；文风更漂亮或更长不计
- 机械判定项：没有复制验证器命令；没有把未核实对照写成 matched；输出不是字段目录
- 需要独立语义判断的项目：论证是否连贯；例证与结论力度是否相称；是否为目标维护者提供足够上下文
- 载体自足检查：treatment 是否仅凭候选 `SKILL.md` 与 task/source 完成方法；若要求回读 P 才能行动，记为重大缺陷

## 完成记录

- baseline 运行身份：`unknown`
- treatment 运行身份：`unknown`
- 隔离偏差：`unknown`
- 最强可用证据等级：`无（仅预注册，尚无行为观察）`
- 尚不能提出的主张：不能声称写作改善、读者理解改善、matched 归因或 skill 处置
