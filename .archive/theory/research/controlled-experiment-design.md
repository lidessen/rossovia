---
kind: research-candidate
id: controlled-experiment-design
status: settled
disposition: canonical-proposal
evidence: behavior-observed
settlement_route: bounded-trial-or-archive
owner: "unknown"
consumer: planning-and-harness-methods
review_at: reopen-on-new-comparison-consumer-or-method-counterexample
---

# 科学对照实验设计研究候选

lifecycle：`settled`
disposition：`canonical-proposal`
evidence：`source-backed`
protocol model：`formed`
pilot：`designed`
long-horizon application：`prepared`
acceptance：`pending`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录研究“如何科学地设计、执行和验证 harness/skill/planning candidate 的对照实验”。它是方法
研究候选，不是新的全局 eval runtime、scheduler、实验设施或 acceptance gate；实际 Run 的观察仍归
对应的 experiment/eval record 和真实 owner。

## 1. 研究问题与边界

用户要解决的不是“有 baseline 和 treatment 两个名字就算实验”，而是以下完整关系能否在运行前、运行中
和运行后被重建：

```text
decision question
  → estimand / observable outcome
  → matched design and frozen card
  → controlled execution
  → integrity / contamination check
  → pre-specified analysis and uncertainty
  → independent review
  → bounded disposition / trial adoption / acceptance
```

范围覆盖 planning、skill、harness 方法和 agent 行为的低风险对照；不默认要求随机化，也不把一次成功、
一次 Agent 自评、格式通过、p-value 或两个输出更长直接写成因果改善。若分配、干预、结果或比较条件
不能被匹配和回读，最强只能返回 `behavior-observed`、`boundary-supported` 或 `uncertain`。

## 2. 来源与可用边界

| 来源 | 实际支持 | 对本项目的用法 | 不能推出 |
| --- | --- | --- | --- |
| 项目 [`evals/skill-evaluation/protocol.md`](../../evals/skill-evaluation/protocol.md) | 冻结 core card、匹配 baseline/treatment、source/runner identity、污染、独立 review、outcome/process/balancing cost、互斥处置和 adoption window | 现行项目实验边界；所有新 pilot 先复用，不复制成第二套 protocol | 不能因遵守 protocol 就获得 behavior 或 acceptance |
| [CONSORT 2010 checklist](https://jamanetwork.com/journals/jama/fullarticle/193759) | 预先写明目标、干预、primary/secondary outcomes、样本量/停止、随机化、分配隐藏、盲法、流失/偏离、效应精度、多重分析和外部有效性 | 把“设计—执行—报告”拆开；agent 实验按适用项取最小子集 | CONSORT 面向随机临床试验，不能原样规定所有 Agent 实验 |
| [J-PAL randomized evaluation elements](https://www.povertyactionlab.org/resource/elements-randomized-evaluation) | 随机化单位、power/样本量，以及 spillover、attrition、partial non-compliance 等内部有效性威胁 | 决定 Agent/任务/批次的比较单位，记录 context contamination 和未遵循条件 | 小型 pilot 不因写出 power 就有足够统计能力 |
| [NIST AI TEVV](https://www.nist.gov/ai-test-evaluation-validation-and-verification-tevv) 与 [AIRC Measure](https://airc.nist.gov/airmf-resources/playbook/measure/) | 测量目标要和 context 对齐；test set、metric、tool、过程和材料需记录；不确定性要如实表达 | 区分 test/verification（是否按 card 执行）、evaluation（结果比较）、validation（是否测到真实目标） | NIST 不替本项目选择 metric、owner 或 acceptance |
| [NIST Engineering Statistics Handbook: DOE](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3.htm) 与 [randomized blocks](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm) | 先定目标，再选过程变量/水平和实验设计；能控制的 nuisance factor 用 blocking，不能控制的用 randomization，并用 replication 估计变异 | 把变量表、控制/随机化/分层、重复和最小设计放在实现之前；不要求所有变量都成为 treatment | DOE 的工程统计原则不能自动决定 Agent 的语义 outcome、owner 或风险接受 |
| [NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf) | 设计阶段就准备验证程序；用 operational/use-case scenarios 检查验证活动；validation 关注预期环境与操作，不能和 qualification/verification 混为一谈 | 先恢复真实场景和 stakeholder expectation，再决定实现检查与行为验证；把“造对”和“解决对的问题”分开 | NASA 的系统工程生命周期不直接规定本项目的 planning、skill 或 harness 载体 |
| [CONSORT 2025 checklist](https://jamanetwork.com/journals/jama/fullarticle/2832868) | 预先写明 primary outcome 的测量变量、分析指标和时间点；报告分配、偏离、缺失、实际干预、效应精度和局限 | 将其收敛为高风险/强确认实验的最小报告检查；小 pilot 也必须冻结 primary outcome 和偏离记录 | CONSORT 面向随机临床试验，不能原样规定所有 Agent 实验 |
| [Google SRE SLI/SLO](https://sre.google/sre-book/service-level-objectives/) 与 [error-budget experiments](https://sre.google/workbook/implementing-slos/) | 用户关心的 service outcome、可观测指标和测量实现要分开；阈值应驱动行动，并随系统和用户变化复审 | 区分目标行为、proxy/metric 和采集实现；给成本/回归设 guardrail 与处置，不把指标本身当价值 | SRE 的 SLO/error budget 不是本项目的统一 acceptance threshold 或 runtime gate |
| [SPEC reproducible performance evaluation principles](https://research.spec.org/fileadmin/user_upload/documents/rg_cloud/endorsed_publications/SPEC_RG_2019_Methodological_Principles_for_Reproducible_Performance_Evaluation_in_Cloud_Computing.pdf) | 先识别变异来源，再决定重复次数；覆盖现实配置；区分 technical reproducibility 与 claim reproducibility | 记录 provider、模型、工作区、任务、上下文和运行身份；只在能支撑目标 claim 时外推，不把一次 benchmark 当泛化 | 性能评估的重复/覆盖原则不能替代语义评审或真实场景 validation |
| [WHO operations and implementation research framework](https://tdr.who.int/publications/m/item/2008-08-15-framework-for-operations-and-implementation-research-in-health-and-disease-control-programs) | 研究要嵌入真实项目运行，把 monitoring、research、evaluation 连接起来，支持实施和规模化学习 | 将实验后的试行、监测、复盘和 settlement 视为设计的一部分，而不是实验结束后的附录 | WHO 的健康项目语境不替本项目决定 owner、伦理边界或 adoption |
| [NIST AI 800-3 overview](https://www.nist.gov/news-events/news/2026/02/new-report-expanding-ai-evaluation-toolbox-statistical-models) | benchmark accuracy 与 generalized accuracy 是不同 estimand；统计方法要随评价目标与数据结构选择 | 每个 pilot 先写清是在测固定 card 表现，还是想外推到任务族 | 不可把一个 benchmark 结果自动推广到所有 planning/harness 任务 |
| [ASA p-value statement](https://doi.org/10.1080/00031305.2016.1154108) | p-value 不是假设为真的概率，也不是效应大小或重要性的替代；设计、摘要、图表和上下文共同决定解释 | 不以显著性阈值替代 effect、uncertainty、cost、boundary 和 practical decision | 不要求每个低风险 pilot 都做复杂显著性检验 |
| [OSF preregistration form](https://preregr.opens.science/reference/form_OSFprereg_v1.html) | 运行前登记研究问题和分析计划，区分 confirmatory 与 exploratory | 对高后果或易受结果影响的 trial 冻结 card/analysis；小 pilot 至少保留 freeze event | 本地 Markdown 不能自动提供不可变 registry 或防篡改保证 |

## 2A. Problem-first correction：先测长时间执行中的遗忘

本研究候选的当前主问题由用户重新校正为：**长时间执行 Agent 是否会遗忘已经建立、后来仍然有效的
目标、约束、决定和进度，以及候选机制是否能让它在干扰、中断、上下文增长或恢复后继续正确行动。**

这里的“遗忘”是功能性定义：状态可能没有被保存（storage loss）、没有被找到（retrieval loss）、被找到
却没有用于行动（use loss）、新旧版本冲突时选错（revision/conflict loss），或中断/重接后不能继续
（resume loss）。不能用“提示被读到”“Agent 自称记得”或一次短任务的正确回答替代这个目标。

因此，实验设计顺序必须固定为：

```text
真实问题
  → 遗忘的操作定义
  → 要改变的连续性机制关系
  → 可制造且可回读的遗忘压力
  → 行为上的主要结果
  → 成本、边界与处置
```

当前用户此前提出的实时记忆、聊天记录、通知输入、Todo/进度和恢复关系，可以组成一个连续性机制
候选，但 exact schema、provider 和 runtime 尚未确定。Vercel AI SDK 与 DeepSeek Harness 的比较不能
直接作为本实验变量，否则模型/provider/runtime 差异会和记忆机制混在一起。主实验设计见
[`long-horizon-agent-forgetting-design.md`](../../planning/records/long-horizon-agent-forgetting-design.md)。

旧的 Todo reminder pilot 只验证了 action-local carrier 的读取观察；它没有制造延迟、干扰、中断或
上下文压力，也没有测下一行动的长期连续性。因此它不能支持或反驳本研究候选的主问题，已重新定位为
辅助的 carrier/readability diagnostic。

## 2B. 从问题到实现：问题优先的设计方法

这次跨行业回看带来的不是一张更长的检查表，而是一个顺序约束：**实现是实验设计之后的一个候选
处置，不是问题定义的起点。** 任何要增加字段、状态、skill、prompt、协议、工具或 runtime 行为的
设计，先经过下面的最小设计调查；它可以压缩成一张 card，不要求每次都新增文档。

```text
真实问题与决策
  → 真实场景与时间线
  → 失败机制 / 竞争解释
  → 变量与系统边界
  → estimand、primary outcome 与 guardrail
  → 最小对照 / 实验设计
  → 实现候选与 verification
  → evaluation、validation、试行或结算
```

### 先回答什么问题

问题必须能落成一条可反驳的关系，而不是“希望系统更聪明/更快/更可靠”：

> 在 `[目标场景、角色和时间范围]` 中，`[对象]` 在 `[可观察条件]` 下不能完成
> `[目标行为]`，造成 `[对用户/系统/项目的后果]`；我们要决定是否用 `[最小改变]`
> 改善 `[primary outcome]`，且不超过 `[成本/安全/回归边界]`。

必须同时写出：

1. **问题事实：** 观察到的失败、频率/暴露机会、受影响对象和后果；一次印象可以触发调查，但不能单独证明普遍问题。
2. **真实场景：** 谁在什么任务、权限、工具、上下文、时间跨度、干扰和恢复条件下行动；不能只用脱离使用环境的 toy prompt 替代。
3. **决策：** 如果结果成立，下一步具体改变什么；如果不成立，保留什么 baseline、关闭什么候选或转给哪个 owner。
4. **主要矛盾：** 当前只选择一个会改变决策的核心差距；相邻问题先列为 out-of-scope，不在一次实验里顺手解决。

“为什么出现”要至少写成一个可检验的机制链，而不是直接把症状命名为根因：

```text
场景条件 → 候选失败机制 → 可观察中间过程 → 主要行为结果 → 实际后果
```

同时列出一个最接近的竞争解释。例如，长时间 Agent 失败可能是 storage、retrieval、use、revision
或 resume 的不同问题；“加一个 reminder”只是 treatment candidate，不能被当成问题定义或根因。

### 变量不是越多越科学

变量表的目的，是判断哪些关系必须保持可归因、哪些噪声需要控制、哪些因素只需记录，而不是把所有
上下文都做成枚举或实验因子。每个候选变量至少标注以下角色：

| 角色 | 要问的问题 | 默认处置 |
| --- | --- | --- |
| treatment / intervention | 本轮究竟改变了哪一条关系？ | 只保留能解释主要结果的最小改变 |
| primary outcome | 哪个行为差异会改变决策？ | 运行前冻结定义、方向、分母、时间点和实用最低差异 |
| mechanism / mediator | 改变是否沿预期机制发生？ | 作为过程/机制观察，不冒充最终效果 |
| confounder | 它是否同时影响 treatment 和 outcome？ | 匹配、随机化、分层、调整或降级因果解释 |
| nuisance / environment | 它会制造变异但不是本轮兴趣吗？ | 能固定则固定；能分块则 blocking；不能控制则 randomize/measure |
| guardrail / constraint | 结果变好时什么不能恶化？ | 预先设为成本、风险、回归或停止边界 |
| measurement / identity | 能否证明这次确实测了同一个对象？ | 记录 source/config/model/provider/runner/workspace 与版本身份 |
| context / population | 结论想外推到哪里？ | 写 target context；不把固定 benchmark 自动推广成任务族结论 |

采用一个四问筛选，而不是凭感觉删除变量：

1. 它是否可能改变 treatment 的实际施加或激活？
2. 它是否可能改变 primary outcome、guardrail 或解释结果的路径？
3. 没有它，是否无法重建、复现或区分这次比较？
4. 它是否涉及安全、权限、不可逆后果或真实使用边界？

只要有一个“是”，就不能静默忽略；应分别归为 `keep`、`control`、`randomize`、`block/stratify` 或
`measure`。只有在它固定且两组相同、明确阻断了影响路径、处于目标场景之外且不改变外推、或经过
敏感性/边界检查证明不会改变当前决策时，才可 `ignore`，并写出理由。无法判断的变量进入 `unknown`
或 sensitivity probe，不得伪装成“无关”。

这也给“变量最小化”一个可操作的定义：删掉变量后，问题、estimand、归因、完整性、guardrail 和
复现关系都不变，才叫最小；删掉只是为了让 card 看起来简单，不叫最小。

### 实验设计是实现前的科学步骤

在选择 schema、prompt、SDK、provider 或代码结构前，先完成一张最小 design card：

| card 区块 | 必须冻结的关系 |
| --- | --- |
| Problem | 问题、真实场景、失败机制、决策和 out-of-scope |
| System model | actor、任务、状态/时间线、输入输出、权限、工具、外部环境 |
| Variable map | treatment、outcome、mediator、confounder、nuisance、guardrail、identity、context，以及 keep/control/ignore 理由 |
| Estimand | 比较单位、target context、primary outcome、最低有用差异、成本和不确定性口径 |
| Design | baseline/treatment、匹配或随机化、blocking/replication、污染/溢出、holdout、停止与失败条件 |
| Implementation | 语义机制到 carrier/协议/代码的映射；哪些检查属于 verification，哪些不能由实现自证 |
| Evidence & disposition | verification、evaluation、validation、独立 review、试行窗口、adopt/adapt/retain/archive/uncertain 路由 |

设计选择按风险和可逆性缩放：

- **局部、低风险、可逆：** Problem + real scenario + primary outcome + 变量处置 + 最小 verification 可以合并成短 card。
- **多步骤、长时间或多 Agent：** 还必须写比较单位、重复/不确定性、污染/溢出、过程与 balancing cost，以及恢复后的验证。
- **不可逆、高后果或需要外推：** 增加独立 review、运行前冻结分析/停止规则、真实 context validation、回滚/试行窗口和采用后观察。

这里的 `verification`、`evaluation`、`validation` 要严格分开：

- **Verification：** 是否按已冻结的设计和实现要求做对、条件是否匹配、数据/日志/身份是否完整。
- **Evaluation：** treatment 相对于 baseline 是否改变 primary outcome，效果大小、成本、边界和不确定性是什么。
- **Validation：** 这个 outcome、场景和成功标准是否真的代表 intended use；换到真实使用环境后是否仍然回答原问题。

任何一层失败，都只能降低证据 standing 或返回下一项最小实践，不能用另一层的“通过”补齐。实现
通过静态检查，不能证明解决了真实问题；行为结果变好，也不能掩盖 treatment 没有按 card 执行。

### 跨行业原则的统一翻译

这些来源可以压缩成五条适用于 Agent/harness 的设计规则：

1. **DOE：** 先定目标和变量；能控制的 block，不能控制的 randomize，变异足够大就 replicate；不要把环境噪声误写成 treatment effect。
2. **系统工程：** 设计阶段就准备验证程序和 operational scenario；“规格上造对”和“在预期操作中有用”是两种不同判断。
3. **临床试验：** 运行前冻结主要结果、分配/比较单位和偏离记录；结果报告效应及精度、缺失、实际干预和局限，而不是只报最好的一项。
4. **SRE：** 先定义用户实际关心的 service outcome，再选择可测的 SLI 和实现；用 guardrail/error budget 连接测量与行动，并定期复审指标是否仍代表用户价值。
5. **真实项目/性能评估：** 记录配置和变异来源，区分 technical reproducibility 与 claim reproducibility；把试行、监测、复盘和结算纳入闭环，而不是事后补一份“实验报告”。

因此，本项目后续的实现设计默认采用 **Problem → Context → Mechanism → Variables → Estimand →
Design → Implement → TEVV → Disposition**。它不是新的 runtime pipeline，也不是所有任务都要
逐项填满的 bureaucracy；它是决定何时可以开始实现、何时只能保留 candidate、何时必须先做实验的
共同判断顺序。

## 3. 最小实验 card

每个多步骤或多任务实验都必须有一个可回读的 card；它可以是现有 manifest 的实例，不创建第二个总表。
card 只保留会改变设计、执行、分析、证据或接受的关系：

1. **问题与决策：** 要回答的具体问题、面向谁、如果结果成立会改变什么；相邻但不回答的问题排除。
2. **estimand 与上下文：** 测固定 benchmark、任务族、行为差距、可行性还是实际效果；target population、
   source snapshot、模型/provider、harness、工具、权限、工作区和时间范围。
3. **单位与分配：** 一个 Agent run、task、case、批次还是 cluster 是比较单位；能随机就随机，不能随机
   就说明匹配、crossover、waitlist 或仅观察设计及其因果上限；spillover/共享记忆时提高随机化单位或测量
   溢出。
4. **baseline/treatment：** 只改变一个能解释的最小关系；其余 task、source、output contract、role、
   tool、budget、reviewer 和 acceptance relation 固定；明确 treatment 是否加载 candidate、何时激活。
5. **outcome 与 cost：** 预先定义 primary outcome、secondary/boundary/regression outcome、balancing
   cost（token、latency、人工 review、失败和等待）；写方向、分母、缺失和实用最低差异，而不是事后挑好看的指标。
6. **执行与污染：** freeze event、hash/identity、启动顺序、分配隐藏或隔离、泄漏、重复运行、流失、
   non-compliance、provider drift、人工干预、partial effect 和 stop rule。
7. **分析与返回：** 运行前固定比较/估计方法和 exploratory 标记；运行后同时返回 outcome、process、
   balancing、integrity、unknown、effect precision/uncertainty、局部和外部有效性，不以 p-value 单独裁决。
8. **review 与处置：** producer、runner、reviewer、acceptance owner 分离；唯一 round disposition 仍由
   项目 protocol 选择 `adopt / adapt-and-retest / retain-baseline / no-proposal / rollback / uncertain`，
   不是把 trial 结果直接升格为 accepted。

### 3A. 多步骤实验的单位层次、分配与重复

长时间 Agent 实验不能把“一个输出”直接当成一个独立样本。至少先区分四层：

| 层次 | 含义 | 默认用途 |
| --- | --- | --- |
| canonical task/source | 可复用的任务定义、来源快照和压力配置 | 定义目标任务族与可外推范围 |
| task instance / pair | 一次被分配条件的任务实例；同一来源的 baseline/treatment 克隆构成 pair | 分配条件和主要比较单位 |
| run | 在一个实例、一个条件、一个 identity 下的一次完整执行 | 估计随机性、失败和执行变异 |
| checkpoint | 运行中的预先定义观察点 | 解释机制和过程；不当作独立重复 |

默认把 baseline/treatment 在 task instance 或 pair 层分配，而不是在 checkpoint 层切换。这样可以避免
前一条件改变了 Agent 的状态、策略或 workspace 后污染后一条件；若必须做 crossover，也只能使用全新的
任务 identity、明确的顺序/携带效应设计，并把它当作另一种 design，而不是同一 run 的两个样本。

可控的任务来源、压力 profile、难度、模型/provider 或时间窗口应先作为 block；block 内再随机分配条件和
运行顺序。不能控制的运行时负载、provider 抖动和外部工具波动至少要测量。共享 memory、workspace、缓存、
候选输出或可见日志会造成 spillover；隔离不了时，应提高随机化到共享资源的 cluster 层，或把结果降为
observational/contaminated，而不是继续把实例当独立样本。

重复也要回答不同问题：独立 task source/instance 的重复支持任务族覆盖，重复同一 source 的 run 支持模型与
运行随机性的估计，checkpoint 只增加机制观察。feasibility pilot 可以先验证条件完整性、污染率、缺失率和
变异是否可测，但“每个条件有一个运行”只能证明覆盖，不能证明 effect。正式或 bounded trial 的重复数必须
在运行前依据 primary outcome、实用最低差异、预期变异、可接受不确定性和资源边界冻结；没有这些输入时，
只能报告 feasibility，不用重复次数制造精度假象。

分配、实际激活、缺失、偏离和污染分别记录。主分析不能事后只保留成功激活的运行；assigned condition、
实际 treatment integrity 和受污染/失败的运行都要回读，缺失处理规则在 freeze 时确定，per-protocol 或
启发式子集只能作为单独的探索结果。

## 4. 怎么执行和验证

### 运行前

- 先把自然语言构想压成一个可证伪的 outcome 和一个 decision，不把“整体变聪明/更像人”直接当 outcome；
- 确定比较单位和污染面；多个 Agent 共享 system prompt、记忆、workspace 或候选输出时，不把它们误当独立样本；
- 冻结 card、task/source/candidate/config/reviewer/acceptance relation 的 revision/hash；高后果或强 confirmation
  需要 pre-registration/frozen analysis；小 pilot 也至少写 freeze event；
- 预先写出 positive、negative、nearest-neighbor、regression 和停止/失败条件；不要结果出来后增加“本来就想测”的 outcome。

### 运行中

- 记录实际分配、首次读取、激活、工具调用、输出、终态、失败、偏离和实际效果；只记录必要数据，不把过程日志
  自动升格成语义证据；
- 对 provider、模型、权限、workspace、候选版本、角色和上下文漂移做 integrity check；一旦污染，标出受影响
  运行并降级，不用“结果看起来合理”掩盖；
- 运行者不能看到结果后调 treatment、card 或 primary analysis 来追逐更好结果；允许的 exploratory 改变要
  开新 round 或单独标记；
- 若是不可逆、高风险或真实外部效果，先回到 owner/安全边界；本 research candidate 不授权真实部署。

### 运行后

- 先做 verification：card 是否执行、条件是否匹配、污染/流失/偏离是什么；再做 evaluation：结果差异、成本和
  不确定性；最后做 validation：该 outcome 是否真的代表目标 context；三者不能合并成“通过”；
- 对小样本和单次 Agent run，优先返回 feasibility/behavior observation，不制造过精确的统计结论；需要外推时
  明确 task population 和 sampling 假设；
- 独立 reviewer 只评审冻结 card、raw output、分析和证据边界，不负责修复或接受；Main/Principal 再把局部结果
  接回 item ledger、candidate record 和下一项最小实践；
- 如果结果支持在有限范围真实使用，进入 [`provisional-adoption.md`](provisional-adoption.md) 的有界试行候选，
  而不是直接 `adopt`；如果差异来自 carrier/runner 不可核验，保持 `attribution-unknown`。

## 5. 当前 pilot 与证据上限

上一轮选择的低风险、可逆 planning 问题是：action-linked Todo reminder 是否会改变下一步 authority/
non-goal 判断。它不能证明整个 layout、reminder、skill 或 harness 有长期收益；只用于验证 card 是否能让
baseline/treatment、outcome/process/balancing、污染和未知可回读。冻结 card 与运行记录见
[`planning/records/controlled-experiment-design-pilot.md`](../../planning/records/controlled-experiment-design-pilot.md)。

用户回看后确认：这个 pilot 的设计对象过窄，既没有把“长时间执行中的遗忘”变成可观察压力，也没有
比较功能性接续。因此本轮已结算为 `diagnostic-only / archive-inconclusive-for-long-horizon-forgetting`；
原始输出和它对 card/载体可回读性的有限观察保留，不删除、不倒写成失败的长期机制实验，也不在同一
record 上无限追加 reminder round。新的主实验设计单独见
[`long-horizon-agent-forgetting-design.md`](../../planning/records/long-horizon-agent-forgetting-design.md)。

## 7. 2026-08-26 settlement event

本研究已把 problem-first、变量角色、比较单位、TEVV 分离和 disposition 规则交给 long-horizon
continuity design，结算为 `settled / canonical-proposal`。旧 reminder pilot 仍是
`diagnostic-only / archive-inconclusive-for-long-horizon-forgetting`；新的 long-horizon card 是独立的
experiment record，不因本方法结算而获得 Run authorization。

剩余的重复数、任务族、runner、独立 reviewer、acceptance 和 adoption/regression unknown 由具体 experiment
owner 在 card freeze 时负责。出现新的 comparison consumer、方法反例或真实 trial return 时 reopen；没有
decision delta 时不继续增加实验设计文本。当前不创建 experiment skill、scheduler、runtime 或统计 gate。

## 6. 来源边界与未知

外部资料支持的是实验设计和报告原则；它们不直接证明本项目某个 candidate 有效。当前仍未知：Agent 非确定性
下的最小重复数、合理的随机化/匹配单位、真实 context spillover、指标与实际价值的相关性、人工 reviewer 的
一致性、成本/质量权衡，以及什么 evidence 足以让真实 owner 接受试行或正式采用。上述 unknown 必须写回
下轮 card，不能用重复术语掩盖。
