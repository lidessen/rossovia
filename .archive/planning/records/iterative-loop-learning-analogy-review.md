# 迭代循环与“无监督学习”类比候选审查

状态：`candidate-boundary-observed / source-read / revision-applied / independent-review-complete / acceptance-pending`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录处理 inbox 中“我们现在设计的迭代循环其实比较像无监督学习”这一句话的研究候选。它先判断
类比是否足以改变 theory、skill、protocol 或 runtime 的选择，不把形象说法直接升级为理论结论。

## 1. 来源与问题

主要来源：

- [`inbox-history.md`](../inbox-history.md) 的 `IN-2026-08-24-001A`：原始输入只有“迭代循环其实比较像无监督学习”；
- [`roadmap.md`](../roadmap.md) 的“迭代学习类比”候选：要求调查 theory→skill→eval→再生循环的相似点和不同点；
- [`item-ledger.md`](../item-ledger.md) 与 [`item-loop-coverage-audit.md`](../index/item-loop-coverage-audit.md)：PL-10
  当前仍是 `research candidate / candidate`，其 owner 和 acceptance 仍 unknown；
- [`../theory/harness/iterative-improvement.md`](../../theory/harness/iterative-improvement.md)：当前 living
  theory 对 baseline、controlled delta、实践观察、再认识、证据和接受的关系；
- [`../theory/harness/theory.md`](../../theory/harness/theory.md)：Task、Run、证据、owner、接受和方法/机制的边界；
- Goodfellow 等人的 [Deep Learning 第 5 章](https://www.deeplearningbook.org/contents/ml.html) 与
  [第 15 章](https://www.deeplearningbook.org/contents/representation.html)：无监督学习和无监督表征学习的机器学习语义；
- Sutton 与 Barto 的 [Reinforcement Learning: An Introduction](https://incompleteideas.net/book/bookdraft2018mar21.pdf)：
  交互式学习中 agent、environment、policy、reward、value 与行动反馈的关系。

当前要回答的不是“这个比喻是否有启发”，而是：**它是否指出了一个现有迭代理论没有表达、且会改变
下游设计或验证方式的机器学习关系？**

## 2. 三个对象不能合并

| 对象 | 最小定义 | 主要信号与产物 | 当前与本项目的关系 |
| --- | --- | --- | --- |
| 无监督学习 | 从没有目标标签的输入数据中学习输入分布、结构或表征 | 数据集、学习目标、模型/表征和泛化 | 只可能类比“从观察中发现结构”；不等于当前 planning 闭环 |
| 交互式/在线适应 | 系统在持续交互中根据行动、观察和反馈改变行为或 working state；不必有固定 reward | state/action/observation、反馈、更新后的行为或状态 | 比“无监督”更接近有行动后果的宽关系，但仍不等于当前闭环 |
| 强化学习（RL） | 以 reward signal 定义目标，并通过交互改进 policy；常用 value 估计长期回报 | policy、reward、value、state/action transition | 是交互式学习的较窄奖励驱动特例；只有这些对象真实存在时才可作 RL 类比 |
| 当前迭代改善闭环 | 在 accepted purpose、任务、来源、效果边界和接受关系下，实践产生观察，再改变下一判断 | baseline、candidate、证据、unknown、review、disposition 和后继实践 | 当前 living theory 的既有对象，不需要借用 ML 术语才能成立 |

机器学习术语描述的是学习算法及其数据/目标关系；当前闭环还包含 source authority、Principal/owner、
语义接受、权限效果、污染、回滚和证据 lineage。这些不是“未标注数据”的自然推论。

## 3. 相似点与决定性差异

### 有限相似点

- 都可以包含“当前状态/观察 → 形成内部表示或假设 → 后续判断改变”的连续关系；
- 历史经验可能压缩成表征、working model、skill、memory 或其它可复用形式；
- 结果不一定在第一次行动时显现，后果可能延迟到后续步骤或任务；
- 多次迭代的价值在于改变下一次选择，而不是单纯增加记录或版本数量。

这些相似点支持保留一个研究类比，但还不能决定学习信号、更新对象或算法形态。

### 会改变指称的差异

| 维度 | 无监督学习 | 当前迭代改善闭环 |
| --- | --- | --- |
| 目标来源 | 由学习目标和数据结构定义，通常不需要本项目意义上的接受 owner | 由 accepted purpose、约束、consumer 和 acceptance relation 定义 |
| 标签/反馈 | “没有目标标签”是无监督语义的一部分；可有输入重建或结构目标 | 明确有 baseline、预测、结果观察、semantic review、Principal correction 或接受；不能称为无监督 |
| 学习者 | 模型参数、表征或估计器发生更新 | 可能更新 Agent 方法、skill、working model、protocol、计划或保持 baseline；未必更新模型权重 |
| 行动与环境 | 许多无监督设定可只处理静态数据 | 实践可能改变 workspace、外部系统或项目状态，必须保留 effect boundary、causal identity 和回滚关系 |
| 正确性 | 关注目标函数、表示质量或下游泛化 | 关注目标 outcome、边界安全、证据质量、成本、unknown、语义 review 和 owner acceptance |
| 失败处理 | 可由损失、泛化或优化表现表示 | 还必须能返回 `uncertain`、`no-proposal`、`hold`、rollback、stale/recovery 和 rerun lineage |
| 权威与来源 | 数据/训练目标不自动拥有现实项目的决策权 | source、Principal、consumer、reviewer 和 acceptance owner 的权力分开，不能由模型自报取得 |

尤其是“没有标签”不能被宽泛解释成“没有人逐步告诉 Agent 下一步”。我们的闭环可以减少逐步提示，
但仍依赖目标、约束、观察、反馈和接受关系；它更像来源有界的交互式改进，而不是纯无监督学习。

## 4. 更准确的临时表达

当前最小、不会越界的表达是：**经验驱动的有界闭环改进**（`experience-driven bounded closed-loop
improvement`）。它强调观察和经验会改变下一判断，但不预设参数更新、无标签目标或心理主体性。

如果研究对象明确包含行动对环境的反馈，可以使用更窄的描述：**来源有界的交互式适应**
（`source-bounded interactive adaptation`）。这仍是 research/design description，不是 canonical
theory、skill 名称或 runtime 状态。

“无监督学习”最多作为最近邻对照或局部子过程的比喻：

- 观察中没有人工标签的部分，可以研究是否形成结构发现或 representation-like compression；
- 反馈改变下一行动的部分，先属于 interactive/online adaptation 的研究问题；只有存在明确 reward
  signal、policy/value 或等价奖励驱动关系时，才进一步属于 RL 类比；
- 方法/skill/working model 跨任务保留的部分，另需研究 transfer、staleness 和 regression；
- 这些局部类比不能合并为“整个 harness 是无监督学习”。

## 5. 当前处置与方案比较

| 方案 | 判断 | 当前处置 |
| --- | --- | --- |
| A. 把当前闭环正式命名为无监督学习 | 对象、信号、权威和验收均不匹配 | `no-proposal`；不改 theory/skill/runtime |
| B. 保留无监督学习作为启发性类比，并明确差异 | 能提示 representation、经验压缩和下一判断变化，但不冒充定义 | **保留为有限 research analogy**；使用本记录的临时表达 |
| C. 改称交互式/经验驱动适应 | 更贴近行动—后果—反馈，但仍需具体 consumer 才能确定机制 | `candidate-later`；不现在创建新机制 |
| D. 立即引入 learner、memory、parameter update 或 scheduler | 原始输入没有真实失败、consumer 或需要新增机制的证据 | `no-proposal-now`；不实现、不建 registry |

PL-10 的当前 standing 仍是 `research candidate / candidate`，不因本记录而变成 accepted disposition。
本记录只把类比的**范围**收窄为 `bounded analogy`，并对正式 theory/skill/runtime/mechanism 升级给出
局部 `no-proposal-now`；总体回返仍是 `route-to-real-consumer`。这关闭的是“把类比直接升级成
theory/skill/runtime”的路径，不否定未来针对经验记忆、表征压缩、在线适应或策略更新的独立研究。

## 6. 如果未来重开，研究问题必须怎样变具体

只有出现真实 consumer 和可重建对照时，才从类比拆出一个具体问题，例如：

1. 在同一 task/source/effect boundary 下，结构化经验回顾是否比无回顾减少重复错误？
2. 经验压缩成 working model、skill 或 memory 后，哪些关系保留、哪些 stale，是否改变下一行动？
3. 在相同 wake/interaction budget 下，bounded choice 与 reactive baseline 的差异是否来自反馈闭环，
   而不是更多调用或更长上下文？
4. 若确实没有人工标签，什么可观察目标或后续 acceptance 能判断“学到的结构”有用，而不是只证明
   表征变了？

每个问题都需要自己的 card、baseline/treatment、source snapshot、观察指标、边界反例、独立 review 和
acceptance；不能用“像无监督学习”作为实验设计的替代品。

## 7. 证据上限、允许效果与回返

- **当前 evidence standing：** 一条 inbox/roadmap 类比、两类机器学习来源的概念对照，以及现有
  iterative-improvement theory 的关系重建；没有本项目的 learning Run、matched improvement 或
  accepted theory change。
- **允许效果：** 将 PL-10 的指称范围收窄为有限类比，更新 candidate、item ledger 和 loop projection，
  并为未来 consumer 保留可判别研究问题；不改变 PL-10 的 `research candidate / candidate` standing。
- **禁止效果：** 不创建 unsupervised-learning theory、initiative/learning skill、memory registry、
  scheduler、parameter update、runtime mechanism 或 experiment/eval Run；不把当前 planning 的
  文档变更称为模型学习。
- **revisit：** 出现真实 consumer、重复 gap、明确更新对象、可观察反馈、decision-changing
  counterexample 或独立接受关系时重开；只有类比继续显得形象或文件数量增加时不重开。

## 8. 独立审查返回

独立只读复核先指出两处需要修订的语义问题：不能把交互式/在线适应与强化学习合并为一个对象；
不能把 `bounded analogy` 当成 PL-10 的总体 standing。修订后已拆成四个对象，并明确 PL-10 仍保持
`research candidate / candidate`，`bounded-analogy-scope` 只是本记录的范围结论，`no-proposal-now`
只针对正式 theory/skill/runtime/mechanism 升级。针对性复读返回 `accept`，没有发现改变当前处置的
链接、owner、standing、Run 或越界问题。

该复核只接受本记录的概念边界与规划处置，不接受 theory change、skill、模型学习、实验结果或系统实现。

## 9. 与整体 planning 的关系

这个判断支持现有关系而不替代它们：`iterative-improvement` 继续拥有闭环理论，`practice-cycle` 负责
从实践结果选择下一项最小实践，`skill-formation` 决定是否形成 carrier，`WorkCell` 只处理执行事实和
效果边界，未来 DeepSeek Harness 才可能成为 system-layer consumer。任何“学习”类比都必须回接这些
owner，不创建一个跨层的总学习对象。

本记录完成的是 PL-10 的候选边界审查，不完成 theory acceptance、skill acceptance、模型训练或系统实现。
