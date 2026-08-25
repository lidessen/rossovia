# 迭代流程审计：从研究到行为证据

> 状态：研究审计与流程候选，不是 living theory、skill 载体或评估协议。
> 日期：2026-08-24。文件只重建当前证据所允许的流程，不恢复 archive 的目录、术语或运行时。

## 审计范围与结论

检查了 `planning/plan.md`、`planning/roadmap.md`、`theory/philosophy.md`、现有
`theory/research/`（尤其 `iterative-improvement.md`）、`evals/skill-evaluation/`
的 protocol、fixture、manifests、round-2 runs/reviews，以及 `.agents/skills/` 的七个
living skill：`skill-formation`、`concept-articulation`、`form-selection`、
`human-writing`、`agent-expression`、`dual-audience-expression`、`agent-delegation`。
同时抽查 archive 的 skill-engineering、practice-cycle、dogfood、harness、workflow
决策与评估记录。精确证据见文内引用；archive 只作历史病例，不是现行设计。

**结论（事实与推断分开）：** 当前项目已经有相当完整的“提出假设—冻结对照—独立复核—
处置—记录”候选，但它仍是研究候选，不是已被行为验证的闭环。`protocol.md:3-6,21-32`
把唯一 treatment 变量限定为候选载体的一次激活，`trial-manifest.md:14-49` 要求冻结来源、
配置与隔离；round-2 独立 review 明确七个载体的静态边界可复原，但七者继续存在的净收益
仍为 `uncertain`，没有行为 trial，不能提出 `matched-improvement` 或收敛主张
（`round-2-design-review.md:14-16,40-48,71-86`）。因此本审计的主要建议是把已有防护串成
不可跳步的状态机，并用 workflow 自身的结果证明流程，而不是再添加一层“更严格”的文档。

## 权威、载体与反馈方向

### 已确立的事实

1. `theory/philosophy.md` 是哲学基础的源文件：它保持“一行一条”哲学序列
   （`theory/philosophy.md:1-37`）。`theory/gene-expression.md` 将哲学序列定义为清单本体，
   区分条目、skill 方法、skill 载体、skill 激活和表型，并明确载体与激活属于表达层，
   不取得语义源权威（`theory/gene-expression.md:14-26,28-35,78-82`）。
2. `planning/plan.md:52-63` 要求先从哲学基础建立理论，再由理论生成并互评 living skills；
   `planning/roadmap.md:1-11` 要求从理论重新生长下一版，不把当前运行时迁完。
3. `theory/research/iterative-improvement.md:243-259` 已给出分诊：稳定、跨环境且改变对象/因果/
   边界的缺口才回到 theory；方法没有内化才改 skill；覆盖缺口改 fixture；匹配、记录、grader
   或 holdout 缺陷改 workflow/protocol/config；没有收益则 `no-proposal` 或 retain。

### 必须保留的方向约束

研究、经验、archive 和运行结果只能检验、反驳或触发从 P 重新生成，不能直接改写哲学序列。
若结构分化自然提出 `theory/harness/`，它只能先成为提案；move 到该路径或接受为 living theory
必须由显式干预决定，并留下来源、理由、接受者和时间。任何 review、分数、载体文本或 runtime
结果都不能自动取得 P 的权威。

## 重建的迭代链

这是基于现有记录的**流程候选**，不是已采用 protocol：

```text
research / run / archive 病例
        ↓ 标 standing、覆盖、矛盾、未知
theory 综合：保持 P 为源；必要时提出 living theory 或 theory/harness 提案
        ↓ 显式接受后才成为上游语义
skill 载体生成：把判断内化，普通激活不回读 P/theory
        ↓ 冻结 artifact、来源、fixture、grader、配置、holdout
独立 review：reviewer 不读候选作者答案、不参与载体写作或 rubric 调整
        ↓ baseline / treatment + 正例、边界、最近 owner、回归、holdout
行为 probe：看判断/行动与表型，不奖标题、篇幅或格式
        ↓ ledger 记录证据等级与未知
Main/指定人类：adopt | adapt-and-retest | rollback | retain-baseline |
no-proposal | uncertain
        ↺ 只把有 standing 的结果送回最近 owner；上游 theory 变化则失效、再生、复评
```

流程顺序的依据是现有研究候选的九步骨架（`iterative-improvement.md:311-329`）：先收集和
重建证据，再选 owner、冻结 baseline、写可证伪假设，运行 matched 对照，独立复核，最后由
Main/指定人类处置；workflow 自身也必须接受 outcome/process/balancing 评估
（`iterative-improvement.md:261-309`）。

## 现有防护、已暴露的风险与剩余缺口

| 风险（越改越差的机制） | 当前防护/证据 | 审计判断 |
|---|---|---|
| baseline ceiling：只挑已很会的题，treatment 无可见增益却继续改 | protocol 要求 baseline/treatment；round-2 设计 review 承认无行为 trial | **部分防护**。须保存能力饱和项、低 ceiling 失败项和真实缺口；不能以格式合格或静态边界代替增量行为。 |
| treatment 污染 control、候选/评审互见 | manifest 的相同输入、唯一变量、runner/reviewer 隔离项；round-2 fixture 要求新鲜互不读取上下文（`fixtures/round-2.md:3-7`） | **有规则但已发生违例**：`round-2-human-writing-review.md:5-7` 披露 reviewer 被系统强制读取候选，故只能作语义复核，不能作干净盲评。 |
| 未冻结：模型、harness、权限、dirty tree 或来源变了 | `protocol.md:8-29`、`trial-manifest.md:14-49` 要求 hash/身份/unknown 记录 | **可操作但执行不齐**。多份 round-2 review 明确模型、工具、harness、working tree 未核实，只能 `behavior-observed`。 |
| reviewer 读候选、rubric 反向适配 | protocol 分离作者、runner、reviewer；设计 review 不授接受权 | **部分防护**。平台强制加载 skill 时必须改为显式污染状态并降级证据，不能仍称 independent。 |
| 只变长、标题化、解释更显著 | protocol 评价“改变判断/行动，不奖励标题结构”（`protocol.md:3-6,54-69`）；human-writing review 观察 treatment 只是更长更显式 | **已有直接反例**。必须把“新目标判断/行动”设为硬门槛，篇幅、结构、格式只能 process measure。 |
| 局部过拟合、fixture 泄漏、holdout 被耗尽 | 正例/边界/最近 owner 规则（`protocol.md:51-52`）；研究候选区分 development、boundary、regression、holdout（`iterative-improvement.md:164-174`） | **方向正确，当前无长期 holdout 证据**。见过 fixture 的失败不能原封不动升级为泛化证明；消耗后必须补新 holdout。 |
| source standing 失真：把 summary、research、候选或历史 review 当事实/权威 | 七个 skill 都区分 theory/research/protocol 与普通激活来源；`theory/gene-expression.md:19-24` 固定 standing | **有语义防护，仍需行为 probe**。round-2 fixture A 专门设置“把 summary 当事实出处”的失败，且一次修正尚未复现（`fixtures/round-2.md:20-25`）。 |
| 并发写/多 Agent 互相覆盖，或把并行误当独立 | `agent-delegation` 规定 Main 保留整体、按真实依赖选择拓扑；研究记录要求并行证据面、顺序综合与独立验证 | **部分防护**。同一权威对象不得由并行 Agent 直接写入；只并行返回带来源地位、覆盖、证据和未知的贡献。 |
| 指标替代目标：pass rate、格式 validator、记录完整率上涨便称改善 | 多维结果向量、`yes/no/uncertain`、重大缺陷与成本记录（`iterative-improvement.md:13-16,172-174`）；round-2 机械检查只支持 `format-valid`（`round-2-design-review.md:71-80`） | **明确防护**。必须同时报告 outcome、process、balancing；记录更多本身只证明流程变化。 |
| 最近问题放大：最显眼的 wording/单个失败变成新 theory、skill 或新结构 | owner 分诊和按频率、后果、证据、成本恢复比例（`iterative-improvement.md:248-255`）；七 skill review 未因旧式简称扩大主线（`round-2-design-review.md:29-36,68-69`） | **较强防护**。仍需把“最近发现”标成观察，直到跨任务/跨环境的重复关系成立。 |
| 只变一个局部后破坏相邻承重关系，或不断在退化版本上叠补丁 | `iterative-improvement.md:87-92,194-204` 要求 controlled delta、回退、retain、no-proposal；archive dogfood 规定保留 known-good tag、smoke check、严重退化重建回退（`archive/design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md:20-39,69-110`） | **可迁移的历史防护**，但不是 living protocol；本项目应只吸收“已知好状态、候选保留、可恢复处置”的关系。 |

archive 还保留两类反例：旧 skill-engineering standalone probe 发现中心行为没有 action/boundary/context 证据，且继承指导会对一次性 prompt 过触发
（`archive/evaluations/2026-07-09-skill-engineering-standalone-harness.md:13-30`）；
旧 test-value gate 则把“确定性 retention contract”与模型质量/成本主张分开，并承认 fresh-agent
归因仍需比较（`archive/evaluations/2026-07-11-disciplined-development-test-value-gate.md:24-78`）。
这些是历史证据，不是当前七个载体已有效的证明。

## Owner 与最小状态

| 对象 | owner | 不可越权的反馈 |
|---|---|---|
| P / 哲学序列 | `theory/philosophy.md`；显式人类干预的理论生成/接受 | 研究或行为结果只能反驳、检验或触发重生成，不能自动写入 P。 |
| living theory（含可能的 `theory/harness/` 提案） | `theory/`，接受前为 proposal | 只有跨环境稳定缺口/矛盾才升级；move 与 accept 必须显式记录。 |
| skill 方法与载体 | `.agents/skills/`，由对应理论生成；`skill-formation` 判准入和生命周期 | 普通激活使用载体内化的方法；载体不能把 P/theory 变成前置阅读，也不能创造 runtime 保证。 |
| protocol / fixture / manifest / grader | `evals/skill-evaluation/` | 评估缺陷先修流程并重跑；不得静默重写旧结果或迁就 treatment。 |
| evidence ledger | 追加式研究/实验记录，Main/指定人类维护 disposition | 保存历史身份、hash、standing、未知、transcript、review 和处置，不以当前路径覆盖旧轮次。 |
| runtime / tool / 权限 / 状态恢复 | runtime 及其真实机制 owner | skill 只能表达边界；跨提示、重启、并发、不可信调用仍成立的保证不能由措辞“实现”。 |

每轮最小状态应能回答：`round_id`、baseline/treatment artifact 与 hash、来源 standing、
唯一 delta、冻结配置、fixture 集合及 holdout 状态、预测/反驳条件、硬约束、运行输出与
transcript、reviewer 隔离、逐项 `yes/no/uncertain`、成本、证据等级、disposition、rollback
锚点以及后继 regression。它对应现有 ledger 最低字段（`iterative-improvement.md:206-241`），
但这里将“污染/未冻结/fixture 是否已被看见”列为显式状态，不允许留在叙述里。

建议的最小状态机是：

`observed → sourced → owner-selected → baseline-frozen → hypothesis-registered →
trial-run → independently-reviewed → dispositioned → regenerated/rolled-back/closed`。

任一承重条件为 `unknown`，只能停在 `trial-run` 或 `independently-reviewed`，证据上限为
`behavior-observed`；污染、来源失真、重大回归或无法重建则直接 `rollback`/`uncertain`，不能
在候选上继续叠改。

## 如何自评 workflow，而不是把流程当元权威

把 workflow 本身当一次受控改变：先冻结旧流程与一组真实历史任务；只改变一个关系（例如
独立 reviewer、holdout 或 hypothesis card）；对匹配任务运行旧/新流程；由未参与设计和执行的
裁定者判断真实缺陷、漏报、误报、采用后回归和成本。研究候选已经给出 outcome/process/
balancing measures（`iterative-improvement.md:281-306`）：不能只看记录完整率、review 数或
分数上涨。最低成功条件应是缺陷发现/净改善提高且重大回归不增加，代价不越过预先设定的预算；
否则结论是 tradeoff 或 `uncertain`。流程也必须支持 `retain-baseline`、`no-proposal` 和
rollback，不能因“这一轮必须产出修改”而制造改变。

当前未知包括：七个 skill 在当前模型/harness 下需要多少 trial 才能区分改善与方差、holdout
大小与刷新率、独立 Agent reviewer 的真实独立性、以及 workflow 在真实任务上是否降低 defect
escape（`iterative-improvement.md:357-365`）。因此本审计不接受“七个载体已证明有净收益”、
“静态 review 已完成收敛”或“archive 的旧流程可直接移植”等结论。
