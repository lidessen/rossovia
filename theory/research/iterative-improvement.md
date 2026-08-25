# 闭环迭代怎样产生净改善而不是退化：研究记录

> 状态：公开研究记录，不是 living theory，不修改哲学序列，也不直接规定现行 workflow。
> 本文把外部来源直接支持的结论、基于多来源形成的推断、以及可供本项目验证的候选方案分开。
> 检索时间：2026-08-24。技术主张只采用官方材料或原始论文。

## 研究问题与边界

这里研究的对象不是“多改几轮”，而是一种可持续审计的改进关系：每轮都从一个可指认的
当前状态出发，提出可能被证伪的改变，限制改变和暴露面，以独立证据判断收益、退化与未知，
再决定采用、调整、回退或不改；同时还要检验这套判断流程本身是否提高了缺陷发现和净收益。

“净改善”不能只等于某个现有分数上涨。一次改变至少可能同时影响：目标行为、原有能力、
边界误触发、来源保真、时间、token、维护和协调成本。若这些量没有共同单位或预先认可的
权重，就不应临时压成一个总分；较稳妥的对象是一个带硬约束、主结果和 balancing measures
的结果向量。

本文不证明本仓库当前流程有效。`evals/skill-evaluation/` 只作为待检查的项目现状，
不能反过来充当外部证据。archive、既有 skill 和受欢迎的开源 skill 可以提供历史病例、
失败样本与改变候选；它们的存在、沿用时间或流行度本身不构成正确性或适用于本项目的证据。

## 一、先把“改善”写成可失败的预测

### 来源主张

Institute for Healthcare Improvement 的 PDSA 指引要求在试验前写出目标、待回答问题、结果
预测和数据收集计划；Study 阶段把观察结果与预测比较，而不是只在事后解释结果。早期试验应
尽可能小，扩大前要在不同条件下反复测试；失败的 change test 是自然结果，若变化没有带来
改善，应准备停止。[IHI, *Model for Improvement: Testing Changes*](https://www.ihi.org/library/model-for-improvement/testing-changes)

OpenAI 的官方评估指南同样把 objective、dataset、metrics、run-and-compare 和 continuous
evaluation 列成一个顺序；它反对凭感觉判断，并要求 task-specific eval 反映真实分布，记录
开发日志，在每次改变上持续运行评估。[OpenAI, *Evaluation best practices*](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 研究推断

一个闭环只有在改变前记录了“什么变化、为什么可能改善、在哪些观察下算失败”时，才产生
可积累的认识。先改后解释会把任何结果都吸收成成功故事；“继续润色直到感觉好”因此不是
可检验的闭环。

### 项目候选

每轮改变先记录一条 **change hypothesis**：

- baseline 是哪个可复现状态；
- 观察到的具体差距及其证据是什么；
- 只改变哪一个主要关系；
- 预期在哪类正例、边界例或回归例上出现什么可观察差异；
- 哪些结果会反驳该假设；
- 哪些承重关系不得退化；
- 数据不足时如何返回 `uncertain`，而不是强迫给出采用结论。

“能写出假设”不等于“值得改”。若没有可观察差距、没有可判别预测，或改变成本明显高于
问题后果，本轮的合法结果应是 `no-proposal`。

## 二、controlled delta、可逆性与暴露范围

### 来源主张

Google 的工程评审实践把一个小 change list 定义为一个自足的最小改变；小改变更易完整
review、更易判断是否引入 bug，也更易回退。它还建议把重排与功能修改分开，并在修改逻辑时
同时保留相关测试。[Google, *Small CLs*](https://google.github.io/eng-practices/review/developer/small-cls.html)

Google SRE 把 canary 定义为对局部、限时部署的改变进行评估，并让其余系统成为 control；
小而自足的 release artifact 更便宜、更容易 rollback。它也提醒同时运行相互重叠的 canary
会污染信号并增加认知负担。[Google SRE, *Canarying Releases*](https://sre.google/workbook/canarying-releases/)

Microsoft Experimentation Platform 的公开实践说明：若 treatment 与 control 共享会被改变的
组件，效果会泄漏到 control，归因因此偏置；它建议在实验设计阶段检查共享基础设施、资源和
配置是否给任一变体带来非预期差异。[Microsoft Research, *Patterns of Trustworthy Experimentation: Pre-Experiment Stage*](https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-pre-experiment-stage/)

NIST 把 baseline configuration 定义为经 review、在某一时点同意、此后只能通过 change
control 改变的一组规格；配置变更控制包含提出、论证、实施、测试、review 和处置。
[NIST, *SP 800-171 Rev. 3 — Configuration Management*](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html)
NIST SP 800-53 的 CM-2(3) control enhancement 另行要求保留组织指定数量的先前 baseline
configuration，以支持 rollback。[NIST, *SP 800-53 Rev. 5 — Security and Privacy Controls*](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)

### 研究推断

controlled delta 不是机械地“一轮只能改一行”，而是让本轮的主要因果差异可指认。多个文件
可以共同实现同一个语义改变；反过来，同一文件中的理论修订、措辞整理、fixture 改动和评估
规则改动可能是四个不同变量。可逆性也不只是 Git 能恢复旧文本，还要求知道改变前的语义、
评估输入和采用理由，才能判断回到哪里以及回退什么。

### 项目候选

- 每轮指定一个主要 semantic delta；必要的跨文件同步可以同轮发生，但必须列明为何不可拆。
- theory、skill、fixture 与 grader/workflow 不在同一次结果归因中一起朝有利方向改写。
- 在改变前冻结 baseline 的相关 artifact、配置、任务、来源、工具、模型/harness 和 grader。
- 先用局部 treatment 验证；扩大到其他 skill 或 theory 前运行相邻边界与系统回归。
- 采用前保留可恢复的旧状态和明确 rollback 条件。若退化发生，先恢复已知状态，再诊断，
  不在退化版本上连续叠加补丁。

## 三、并行研究、独立验证与顺序依赖不是同一件事

### 来源主张

NIST AI RMF 指出，独立 review 可以提高测试有效性并缓解内部偏差和利益冲突；它还要求由
未担任一线开发者的内部专家或独立 assessor 参与定期评估，并记录 test set、metric 和 TEVV
工具细节。[NIST, *AI RMF Core — Measure*](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

Google 的小变更实践区分“可以同时 review 的自足变化”和有提交顺序的依赖变化；可并行不是
由主题数量决定，而取决于它们是否真的彼此独立。[Google, *Small CLs*](https://google.github.io/eng-practices/review/developer/small-cls.html)

### 研究推断

并行最适合减少共同锚定和等待：例如分别查外部一手来源、archive 历史病例与开源实现，或让
未参与作者工作的 reviewer 检查来源和边界。理论综合、依赖上游定义的下游写作、以及将多个
证据重新接成一个结论，通常有真实顺序。把这些工作也并行写入同一权威对象，会把“多视角”
变成互相污染的多个 treatment。

独立 reviewer 也不是简单换一个 Agent。若 reviewer 看过作者的目标答案、参与过 rubric 调整，
或只能看到作者筛选的证据，其判断仍然可能相关。独立性至少需要分离角色、输入和允许效果，
并保留 reviewer 可以返回 `uncertain`、反对意见或“评估本身有缺陷”的出口。

### 项目候选

一轮可拆成以下贡献关系，而不是固定的 Agent 数量：

1. **并行证据面：** 独立调查公开一手来源、archive、已有运行失败和开源 skill；各自返回来源
   standing、支持范围、矛盾、未知，不直接修改共同权威。
2. **主综合：** 一位保留整体的人解释证据间的关系，提出一个 change hypothesis；不能投票或
   拼接代理综合。
3. **顺序改动：** 作者只实现已选 delta；下游 artifact 在上游语义稳定后再生成。
4. **独立验证：** reviewer 不参与作者改动，能看到冻结来源、manifest、baseline/treatment 和
   rubric，但不自动获得采用权。
5. **主接受：** Main 或请求中指定的人类根据证据 ledger 决定采用、改写、回退或 no-proposal。

## 四、评估组合：正例、边界、回归与 holdout

### 来源主张

Anthropic 的 Agent eval 指南要求同时测试行为应该发生和不应该发生的情形；单边 eval 会产生
单边优化。它区分 capability eval 与 regression eval：前者寻找尚未掌握的能力，后者保护原有
高通过率行为，capability 饱和后可进入持续回归集合。[Anthropic, *Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

同一指南还要求稳定、隔离的 trial 环境；grader 应按任务选择 deterministic、model-based 与
human 方法，LLM grader 要用人类专家校准并允许返回 Unknown。必须阅读 transcript 和 grade，
因为低分可能来自任务含混、grader bug 或 harness 限制，而不是被评对象。[Anthropic, *Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

OpenAI 的官方指南主张 held-out set、典型/边界/对抗样本、人工专家标注，以及在每次改变上持续
评估；它也提醒单一分数不足，应结合 human judgment。[OpenAI, *Evaluation best practices*](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

Dwork 等人的原始研究指出，分析者反复根据同一数据上的结果选择下一项分析，会破坏传统
holdout 的统计有效性；他们提出 reusable holdout 来限制对 holdout 的访问并在自适应分析中
保存验证能力。这个数学方法不能直接搬成文档 review 规则，但它确立了一个相关危险：反复看见
同一评估结果再调参，会逐步把改变拟合到评估本身。[Dwork et al., *The reusable holdout: Preserving validity in adaptive data analysis*](https://pubmed.ncbi.nlm.nih.gov/26250683/)

Dehghani 等人的原始研究表明，不同 benchmark task、超参数调优和评估选择会显著改变算法的
相对排名；benchmark 选择本身编码了什么被视为重要。[Dehghani et al., *The Benchmark Lottery*](https://arxiv.org/abs/2107.07002)

### 研究推断

正例只证明“会做”，边界例检查“会不会到处做”，回归检查“是否破坏曾经会做的事”，holdout
检查“是否只会通过已经被作者反复看见的题”。它们回答不同问题，不能互相替代。

当 fixture、rubric 或 grader 已经被用来指导某次修改，它就成为 development evidence；即使
继续称它为 test，也不能再单独证明泛化。把每次真实失败立即加入 regression 很有价值，但还
需要保留作者未见的 holdout 或新鲜外部任务。否则流程会优化为“通过已知题”，也就是本项目
语境中的 Goodhart 风险。

### 项目候选

每个行为关系至少分四个集合：

- **development 正例：** 目标行为应发生；可供作者诊断和调试。
- **boundary / nearest-owner：** 行为不应发生，或应转交相邻 owner；防止过度激活。
- **regression：** 已经有可靠证据支持且以后不应丢失的行为；每次相关改变都运行。
- **holdout：** 作者和改写 Agent 未见的代表性任务；只在候选达到预定门槛时由独立 runner
  运行，使用后若进入日常调试集合，就补充新的 holdout。

不要只报告 pass rate。至少同时报告重大缺陷、边界误触发、原有能力回退、uncertain、grader
分歧、trial 方差和成本。测试多次后仍须保存 transcript/outcome，使 reviewer 能判断分数是否
测到了真正关系。

## 五、负结果、rollback 与 no-proposal 是闭环输出

### 来源主张

IHI 明确把 failed change tests 视为改进过程的自然部分，要求记录意外观察、比较预测与结果，
并在变化没有改善时准备终止。[IHI, *Model for Improvement: Testing Changes*](https://www.ihi.org/library/model-for-improvement/testing-changes)

Google SRE 的 canary 实践在 candidate 指标明显差于 control 时要求暂停并 rollback；局部、限时
暴露的价值正是以较低系统成本取得改变信息。[Google SRE, *Canarying Releases*](https://sre.google/workbook/canarying-releases/)

### 研究推断

若流程要求每轮都提交修改，作者就会把噪声解释成进步，把未证实问题升级为 theory，或者修改
fixture 来迁就 treatment。能够稳定地产出“假设未获支持”“保留 baseline”“回退”“未知”与
“暂不提案”，是防退化能力，不是停滞。

### 项目候选

一轮 disposition 只允许依据实际证据选最窄项：

- `adopt`：目标关系改善，硬约束和相关回归未退化，证据满足预注册门槛；
- `adapt-and-retest`：发现方向可能成立，但 delta、载体或评估存在可分离缺陷；
- `rollback`：出现重大退化、来源失真、归因污染或不可接受成本；
- `retain-baseline`：没有足够证据证明 candidate 优于 baseline；
- `no-proposal`：没有可观察收益、问题不值得改变，或继续修改只会增加复杂度；
- `uncertain`：环境、样本、grader 或来源不足以作出归因。

负结果也要进入 ledger：它至少减少未来重复试错，并可能暴露 fixture、grader 或 workflow 的
缺陷。但负结果不自动证明反命题，也不应只因“已经投入很多”而继续。

## 六、可复现的 artifact/config/hash/evidence ledger

### 来源主张

NIST AI RMF 要求正式记录不确定性、benchmark、测试结果、test set、metric 和 TEVV 工具，
并明确要求评估和记录所采用 TEVV metric 与过程本身的有效性。[NIST, *AI RMF Core — Measure*](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

NIST Playbook 进一步说明，记录 measurement approach、test set、metric、process、material 和
相关细节，是可重复、一致测量的基础；记录工具本身也应定期评估和更新。[NIST, *AI RMF Playbook — Measure*](https://airc.nist.gov/airmf-resources/playbook/measure/)

Git 的官方文档说明，`git hash-object` 根据对象类型和文件内容计算 object ID；内容寻址可用来
指认某次运行实际读取的 artifact，而不依赖可能继续变化的路径名。[Git, *git-hash-object*](https://git-scm.com/docs/git-hash-object)

### 研究推断

路径和标题只能说明“打算读什么”，hash 或不可变 revision 才能帮助说明“当时实际读了哪一版”。
但 hash 只证明内容身份，不证明内容正确；ledger 还必须保存来源 standing、改变假设、结果和
接受判断。可重复也不等于有效：稳定复现一个坏 grader 仍然是坏评估。

### 项目候选

每轮 ledger 至少记录：

| 类别 | 最低记录 |
|---|---|
| 身份 | trial/round ID、时间、责任角色、工作区/commit 状态 |
| baseline | 相关 theory、skill artifact、fixture、protocol、任务来源的路径与内容 hash |
| 配置 | 模型及设置、harness、工具、权限、环境、随机性/重复次数 |
| 假设 | 缺陷证据、controlled delta、预测、反驳条件、硬约束、rollback 条件 |
| 运行 | baseline/treatment 输入、输出、transcript/outcome、错误和意外观察 |
| 评价 | grader/rubric 版本、独立 reviewer、逐项 yes/no/uncertain、分歧与校准状态 |
| 处置 | 最强证据级别、adopt/adapt/rollback/retain/no-proposal、理由与接受者 |
| 后继 | 新 regression、消耗的 holdout、待补证据、下一轮是否值得开始 |

ledger 应追加记录历史，不把新结论倒写成旧轮次早已知道的事实。对被 supersede 的 artifact 保留
指针和处置理由，而不是让当前路径覆盖历史身份。

## 七、什么时候改 theory、skill、fixture 或 workflow

以下是**项目候选分诊**，不是外部标准的直接规定。它依据本项目现有 owner 区分，把同一失败
放回最接近的成因层，避免每个新问题都升级为 theory 或把 grader 改成迁就 candidate。

| 观察到的主要缺口 | 优先改变 | 不应立即做什么 |
|---|---|---|
| 多个环境中重复出现、会改变对象/因果/边界的稳定关系缺失；现有 living theory 无法解释或相互矛盾 | 补充、精简或修订 **theory**，随后再生受影响 skill | 不因一次措辞偏好或单个 fixture 失败增加理论层级 |
| theory 足够，但选择性加载的方法未把判断内化，普通激活会漏掉承重关系或误触发 | 改 **skill 方法/skill 载体**，保持普通使用者无需回读 P/theory | 不把任务事实硬编码进通用 skill，不让 P 成运行时依赖 |
| 一个重要行为、边界、最近 owner 或已修缺陷没有被现有任务覆盖 | 新增/修订 **fixture**，先证明任务可解、rubric 公平 | 不在看到 treatment 后把预期改成 treatment 的表面形态 |
| baseline/treatment 不匹配、角色污染、记录不足、grader 无法重建、holdout 被耗尽，或同类评估缺陷反复发生 | 改 **workflow/protocol/manifest/grader**，并重新验证旧结论 | 不把流程错误记成 skill 失败，也不静默重写历史结果 |
| 只有一次运行的环境/工具/权限/模型差异 | 改 **run config 或实验记录**，必要时重跑 | 不先提升为通用 theory 或 skill |
| 没有新证据，继续变化没有可观察收益 | **no-proposal / retain** | 不为显示迭代而改文件、改名或扩充结构 |

一个失败可能同时暴露多层缺口，但处理仍应按依赖顺序：先修无法有效测量的 fixture/workflow，
再重跑以判断对象是否真的失败；若 theory 变化，则明确使下游 skill artifact 失效并重新生成、
review 和回归。不能同时改 theory、skill 和评分规则后把新分数归因给其中任一项。

## 八、怎样验证 workflow 本身真的更好

### 来源主张

IHI 的测量课程把 outcome、process 与 balancing measures 作为一组；测量不是改进的装饰，而是
判断 change 是否带来 improvement 的必要部分。[IHI, *QI 103: Testing and Measuring Changes with PDSA Cycles*](https://www.ihi.org/learn/courses/open-school/catalog/qi-103)

NIST 不只要求用 TEVV 测对象，还明确要求评估并记录 TEVV metrics 与 processes 的有效性，
并周期性判断 AI RMF 是否改善了组织管理风险的能力。[NIST, *AI RMF Core — Measure 2.13*](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
[NIST, *Effectiveness of the AI RMF*](https://airc.nist.gov/airmf-resources/airmf/4-effectiveness/)

Anthropic 把自动 eval、生产监控、A/B test、用户反馈、transcript review 和系统人评视为不同且
互补的证据层；自动 eval 若不反映真实使用会产生虚假信心。[Anthropic, *Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 研究推断

“流程更严格”“记录更多”只是 process change，不是 outcome improvement。流程本身的主要结果
应是：在可比工作上更早、更准地发现会影响采用判断的真实缺陷，并让最终采用的改变具有更高
的净收益和更低的逃逸回归；同时不能以不可接受的时间、token、协调成本或否决率换取这些结果。

### 项目候选：workflow evaluation card

1. **先冻结旧流程 baseline。** 选择一组任务，其中一部分含独立设计者植入、且对 runner 隐藏的
   承重缺陷，另一部分来自真实历史但由未参与改动者事后裁定。记录旧流程发现了什么、漏了什么、
   误报什么、用了多少成本。
2. **只改变一个 workflow 关系。** 例如增加独立 reviewer、增加 holdout、或加入 change
   hypothesis；不要一次启用整套新流程后声称知道哪一环有效。
3. **matched / randomized when feasible。** 在难度和缺陷类型匹配的任务对上随机分配流程；若
   做不到，只提出较弱的前后观察，不作因果主张。
4. **独立裁定。** outcome adjudicator 不参与流程设计和执行，先按来源判断哪些是真缺陷、哪些
   建议真正改善对象；允许 grader/workflow defect 单独分类。
5. **运行未见任务和回归。** 开发集支持诊断，holdout 检查泛化；之后用真实新任务持续观察
   defect escape，不能用一次合成试验替代长期效果。

建议并列记录三组 measure：

| measure 家族 | 候选指标 |
|---|---|
| outcome | 重大缺陷 recall、误报率、采用后回归逃逸率、独立 reviewer 确认的净改善比例、rollback 率 |
| process | 有可证伪 hypothesis 的轮次比例、matched manifest 完整率、独立 review 覆盖、结果可重建率、holdout 暴露次数 |
| balancing | 每轮时间/token/Agent 数、协调等待、reviewer 分歧、有效改变被错误拒绝、记录维护成本、用户等待 |

这里的“净改善比例”应按预先定义的多维接受规则计算，例如“目标缺陷被修复，且无重大回归，
成本未越过预算”；不要在结果出现后临时给各维度加权。若新 workflow 只提高记录完整率，却没有
提高缺陷 recall、减少逃逸或改善采用质量，应只承认 process improvement。若缺陷发现上升但
误报和成本也显著上升，结论是 tradeoff 或 uncertain，不是自动成功。

workflow 的改动也进入同一闭环：预注册其预测，保留旧流程，限量试行，由独立 reviewer 判断，
失败时回退。这样“改进流程”不会成为不受评估的元权威。

## 九、候选的闭环骨架

以下骨架是对研究证据的本项目化候选，不是已经采用的 living theory：

1. 从运行、review、archive、公开研究和开源 artifact 中收集差距；标明 standing，不以流行度
   代替证据。
2. 分开可并行的证据贡献；由 Main 恢复共同对象、冲突和未知。
3. 决定最接近的 owner：theory、skill、fixture、workflow/config，或 no-proposal。
4. 冻结 baseline、artifact hash、配置、fixture/rubric 和 holdout 状态。
5. 写可证伪 change hypothesis、一个主要 controlled delta、硬约束与 rollback 条件。
6. 运行 matched baseline/treatment；先局部，后边界和回归；非确定行为运行足够重复。
7. 由独立 reviewer 检查来源、outcome、transcript、grader 公平性、未知和成本。
8. Main/指定人类选择 adopt、adapt、rollback、retain、no-proposal 或 uncertain，并追加 ledger。
9. 若上游 theory 变化，再生受影响的下游 skill；普通 skill 使用者不回读 P/theory。
10. 用 outcome/process/balancing measures 评估本轮 workflow；只有新证据才开始下一轮。

这个顺序允许必要回返：reviewer 可以把失败退回 fixture 或 workflow，行为结果可以暴露 theory
缺口，skill 激活可以暴露表达缺失。但回返不改变权威：评估输出只提出证据和候选，不自动重写
theory、skill 或接受标准。

## Adopted evidence / contradiction / unknown / no-proposal

### Adopted evidence（可进入后续理论候选的证据）

- 改变前写目标、问题、预测和数据计划，小范围测试，再把结果与预测比较；失败与停止都是正常
  输出。直接证据：IHI PDSA。
- 小而自足、可回退的改变，以及 treatment/control 隔离，降低归因和恢复难度。直接证据：
  Google engineering/SRE、Microsoft experimentation、NIST configuration management。
- 独立 review、记录不确定性、test set、metrics、tools，以及评估 TEVV 过程自身，有助于降低
  偏差并使判断可追踪。直接证据：NIST AI RMF。
- 正反两侧、capability 与 regression、稳定隔离环境、transcript 检查和人类校准是互补关系。
  直接证据：Anthropic、OpenAI。
- 对同一评估反复自适应会损害验证有效性；benchmark 选择和调优可能改变相对结论。直接证据：
  Dwork 等、Dehghani 等。把它转成项目 holdout 规则仍属于待验证推断。

### Contradiction / tension（不能压平的张力）

- IHI 允许多个 change ideas 形成相互作用的 linked tests；controlled delta 要求可归因。解决方向
  不是禁止组合，而是先分别建立证据，再对必要组合另立假设。
- 快速小试能降低失败成本，却可能因样本太小漏掉较弱效果；扩大样本提高把握，又增加暴露成本。
  需要按风险和所需置信度逐步放大，不能把“小”当成永恒规模。
- 公开、可审计 fixture 有利于诊断；未暴露 holdout 有利于泛化判断。两者必须分层，不能要求
  同一集合同时完全公开又完全未见。
- 独立 review 减少共同偏差，但增加等待、token 和协调成本；应按风险和归因需要使用，不应把
  每个微小改动都升级为多 Agent 仪式。

### Unknown（仍需项目实证）

- 对当前模型、harness 和七个候选 skill，怎样的 trial 数量才能区分真实改善与运行方差。
- 哪些缺陷严重度、成本阈值和回归集合足以构成本项目认可的“净改善”。
- 需要保留多大、更新多快的 holdout，才既防止过拟合又不过度消耗维护资源。
- 独立 Agent reviewer 与同一模型不同上下文之间有多少真实独立性；怎样校准 reviewer 的误报、
  漏报和锚定。
- archive 与外部高评价 skill 能提供多少新失败类别；其受欢迎程度是否与本项目目标行为相关。
- workflow 改进能否在真实任务而非合成植入缺陷上提高缺陷发现、降低逃逸并保持合理成本。

### No-proposal（本研究暂不支持）

- 不直接新增哲学条目；现有证据是否由既有条目冲撞即可生成，需另行理论综合。
- 不因本研究立即新增 `iterative-improvement` skill；先判断方法是否重复出现、能否由现有
  `skill-formation`、`agent-delegation` 与评估 protocol 共同覆盖，以及独立载体是否有净收益。
- 不把 PDSA、软件 canary 或统计 reusable holdout 原样移植为 Agent 文档流程；它们的对象、
  风险和统计假设不同。
- 不规定固定轮数、Agent 数、文件数或统一总分；这些都应由风险、依赖、方差和成本决定。
- 不把 archive 年代、开源 star、作者名气、文档长度或评审一致当成采用证据。

## 候选行为 probes（尚未成为 fixture）

1. 给出一个“表达不够好”的笼统反馈：应先要求或恢复 baseline、具体差距和可失败预测，而不是
   立即重写全部 theory 与 skills。
2. 同一轮有人提议同时改 theory、skill 和 rubric：应拆出主要 delta；若上游必须先变，按顺序
   再生下游，不把新分数归因给任一单项。
3. 三个互不重叠的来源面和一个依赖定义的写作任务：来源调查可并行，综合与依赖写作顺序进行；
   Main 保留共同结论和接受。
4. treatment 在正例上提升但所有边界例都过度激活：应判为 tradeoff/退化，不因单项分数上涨
   采用。
5. treatment 只通过作者反复看过的 fixture，holdout 无差异或更差：应拒绝泛化/净改善主张，
   保留结果为 eval-overfit 证据。
6. reviewer 发现 baseline 与 treatment 的模型、来源 hash 或工作区不同：只允许
   `behavior-observed` 或重跑，不声称 matched improvement。
7. 一次失败来自 fixture 未说明文件路径，而 grader 暗中要求固定路径：先修 fixture/workflow，
   不改 skill 来学习隐藏答案。
8. candidate 没有改善且增加 token 与维护成本：合法结论是 retain-baseline/no-proposal；不得为
   “完成一轮”制造新文件。
9. theory 被新证据实质修订：受影响 skill 要重新生成、独立 review 和回归；普通激活仍只读
   skill artifact，不回读 P/theory。
10. 新 workflow 的记录完整率提高，但缺陷 recall、逃逸率和采用质量没有改变：只能声称 process
    improvement，不能声称闭环带来净改善。
11. 新 workflow 发现更多真缺陷，但误报、token 和等待也大幅增加：返回明确 tradeoff 和未知，
    由预注册阈值决定是否采用，不临时改权重。
12. archive 或高 star 开源 skill 提供一个新做法：记录其来源和适用环境，将它变成 change
    hypothesis；不得直接覆盖 living theory 或现行 skill。
