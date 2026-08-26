# Harness 认知要点

> 从归档 `.archive/theory/harness/`、`.archive/theory/`（Agent 层理论）与 `.archive/design/` 提取的要点。

## Harness 理论（theory/harness/theory.md）

**Thesis：Agent harness 是面向 Agent 的任务工程（task engineering for Agents）。** 把以人类语言表达的工作，重建为有界 Agent 能可靠执行的工作单元：重建真实任务、重表达为具体变换、构建工作环境、拆分或保持整体、重组局部分结果而不丢失原始约束。

- **可靠性**是可观察、可包含、可纠正的分辨力——保留使错误可见、可遏制、可修正的区分，直到未授权或不可逆的后果逃离之前。简单 harness 可能比全面貌的更可靠。
- **Base 与方法表达层（所有权测试）**：base 是最小稳定机制（绑定实际上下文/工具/工作区/隔离/效果边界，保持 Task/Run/Cell 生命周期与取消恢复语义，强制权限与事务边界，发出可重建证据，翻译外部协议）；方法表达层（skills、系统提示词、任务表达、计划与返回）骑在 base 上。若方法可改而同一 Task/Run/Cell/effect/evidence/acceptance 契约保持真实 → 方法层；若改动需要新生命周期状态、因果同一性、并发控制、恢复、权限强制或持久证据 → 已越过 base。
- **行为模式不机制化**：方法是条件的；方法比不变量演化快；机制不能制造语义判断；机制耦合隐藏替换失败。单次提示词失败不是机制证据。判定用 yes / no / uncertain，不用数值。
- **主对象：任务变换（Task 是关系）**：期望改变 × 约束对象与源 × 工作环境 × 允许效果 × 结果证据 × 可接受的拥有者。变换模型不是强制线性工作流。

### Plan 是义务，拓扑是可替换方法；work map 驱动

- **Plan** 保留整体必须完成什么、后来的拥有者如何知道已完成：结果、硬约束、权威源、贡献边界、依赖、证据与接受条件、合成拥有者、重连条件。它不编码供应商、worker 数、固定深度或 swarm 运行时——那些是执行选择（拓扑：直接/顺序、独立并行探索、嵌套多层并行，由真实关系选择）。
- **多步骤/多任务默认由外部化 work map 驱动**：Plan 保留整体义务；Task 是有界的可执行贡献（对象、目标、来源/允许效果、完成观察、证据、返回关系）；Todo 是当前执行者的可行动义务与回返条件。例外仅限一步完成、无依赖、低风险可逆且完成关系直接可观察的动作。work map 不是静态承诺：发现新依赖/未知/owner-return 时先更新关系再继续。
- 语义 Plan 回答"整体必须完成什么"；「Swarm」是方便名，不是 Plan 原语或运行时物种。

### 候选想法如何进入后续 work：应用证据链

「已经记录」不等于「已经使用」，「被提到」也不等于「已经验证」。关系链：

```text
source capture → candidate definition → matched consumer/applicability condition
  → action-local application → application receipt
  → trial/design review/runtime evaluation
  → adopt / adapt-and-retest / retain-baseline / no-proposal / archive / uncertain
```

**研究结算与系统采用是两条相交但不相等的链**：`research result → research disposition` 与 `research result → semantic handoff → carrier handoff → activation observation → adoption/reopen evidence`。`archive-*` 只说明研究结果离开 active research surface，不表示 harness 已吸收；有价值但未完成下游交接的结果必须保留 `integration pending` 的应用义务，不能把应用义务一同归档。

面向实际系统的候选至少观察四层独立证据：**semantic handoff**（结论进入 theory/design/plan/skill candidate）、**carrier handoff**（载体有 source identity/revision/lineage/review）、**activation observation**（真实 harness 确实选择读取执行）、**adoption evidence**（后续 work 观察到目标关系并作出保留/改写/回退/不采用决定）。载体存在≠activation，activation≠效果。

### 对象论与四种认知动作

- **对象论：谁可以为此发言。** 每个对象有单元、源、权威、终态条件与易混淆邻居。例如：Intent/Task/acceptance 由 Principal 或委派域拥有者拥有；Run 与效果边界由编排与边界拥有机制拥有；机械证据由确定性观察者拥有；语义评审由独立知源评审者拥有；接受由 Principal 或明确委派的接受拥有者拥有；投影由声明源与渲染者拥有。
- **四种认知动作（「验证」不是一种动作）**：① 观察（现在可复现地发生了什么）② 机械符合（满足显式可判定契约）③ 语义判断（真实相关/充分/安全/忠于请求变换，带不确定性）④ 权威（候选可引起效果或被采纳）。评审推荐，不授权。
- **效果、因果同一性与真未知**：潜在不可逆外部效果用严格因果所有权；未知是声明，不是待办或模糊词；确定性门不能证明语义质量。
- **机制派生与生成性**：从「累加机制」改为「派生机制」——疑似需要新机制先过准入检查（命名硬属性、最小机制、现有机制无法保留的关系、缺少它的失败是真实的）。生成性＝结论可从无例外表推出的能力。

## 委派（agent-delegation）

**委派是保持整体关系的有界转交。** 分出去的是有界贡献，不是整体责任。

- **Main 拥有整体关系，不垄断劳动**：Main 是关系位置——持有整体、重组局部贡献、形成候选；不亲自完成每项调查，不因表演负责而重做局部工作。综合责任 ≠ 最终接受权；除非 Principal 明确委派，采纳/合并/发布仍属原接受拥有者。
- **分解只发生在真实贡献边界**：文件数、主题数、角色、Agent 数、篇幅都不是分解证据。真实收益：隔离深调查、并行独立来源面、调用 Main 不具备的能力、效果交不同拥有者、独立语义证据。收益必须抵偿交接与重组成本；分解是 P05 对当前特殊性的重新判断，一旦证据改变可以恢复整体或改顺序。
- **Producer、reviewer 与接受者保持分离**：producer 形成候选/记录来源/跑机械检查（生产证据，不是独立正确性）；reviewer 的价值在没参与 exact candidate 形成、没有被评对象写效果，能依据原任务与验收关系形成新语义主张。Reviewer 修复候选就成为新 producer；独立性始终有范围（共享错误规格、同一失真摘要、相同模型倾向产生共同盲点）。
- **证据重连使局部贡献回到整体**：child 返回的是带 standing 的局部主张，不是自动事实；压缩可删冗余轨迹，不能切断决定性来源、限定和效果证据。Main 综合不是拼接报告或多数投票，而是恢复关系；嵌套委派不改变这项义务。
- **比例**：局部发现不取得全局主次；新近、具体、写得最长或被多个 Agent 重复报告不因此成为主线（P09）。过度委派同样校正：协调对象成本超过原工作就没有净贡献。

## Skill 形成（skill-formation）

**skill 载体是在相关任务中被选择性加载、用来表达某个 skill 方法并改变 Agent 重复判断或行动的载体。**

- **形成的七个关系**：对象可指认（哪个 Agent 在什么环境对什么对象缺哪类判断/行动）；差距有现实来源（真实任务/纠正/失败轨迹/可复现 baseline）；关系可重复（跨任务重现的判断关系）；触发可分辨（正例/反例/最近邻有可表达边界）；方法可由表达改变（提示外硬属性不属 skill）；生成关系已内化（激活后无需回读条目/理论即可恢复主要判断）；结果是较小的真实形式；结果可观察。
- **相邻形式与所有权**：一次任务表达/项目局部指令/普通文档/reference/skill 载体/脚本工具/runtime base 各拥有不同关系，不因内容像什么而转移。
- **生命周期：存在是持续的主张**：创建（把有据方法置为候选，不置为权威）、改写、拆分（独立触发/失败/验证并能重组）、合并（同一对象/触发/成功关系）、降级（知识归文档、常量归指令、变换归工具、硬属性归 runtime）、删除（差距消失/被覆盖/无净收益）。由频率、影响、证据强度、修复成本与整体关系决定改动落在哪层。
- **Review 六面**：成立性、对象与边界、形式与上下文、Agent 表达、行为与回归、体系关系。设计（应否存在）与表达（文字如何优化）分开判断。
- **证据等级**：`format-valid → behavior-observed → boundary-supported → matched improvement → regression-supported`。等级描述可说到什么，不是自动晋级；没有 matched baseline 不声称因果改善，没有反例不声称边界成立，没有长期观察不声称稳定。

## Harness 子理论

### 默认自治与事后纠偏（default-autonomy-with-correction）

- **核心**：默认不是"每个不确定点先请示"，而是凭已有常识、稳定方法和当前上下文自主处理绝大多数局部事情；小错通过观察、纠偏和经验吸收解决；只有可能改变整体方向、价值判断、权限关系、共享基线或造成重大不可逆后果的事才打断 owner。"事后纠偏"只有在影响可观察、可限制、可回退或可补偿时才是合适主模式。
- **独立运行的四种关系**（不压成一个审批状态）：普通运行、事后纠偏、重大事项请示（形成尽可能短的选择题，只暂停受影响分支）、经验吸收（判断修正是否可跨场景复用，复用范围扩大时增加验证）。
- **focus refresh / focus anchor**：长任务、上下文压缩、角色交接和错误恢复会让承重方法被稀释；有意识花少量 token 从 canonical source 选少数方法形成短的 focus anchor（目标、关键方法、边界、下一步），触发由语义边界决定（开始/恢复、角色变化、checkpoint、交接），不是固定轮数。
- **Candidate 三类**：local correction candidate（默认自主尝试，不好就回退）；reusable method candidate（反复出现，先在真实 consumer 观察比较再决定晋升）；constitutional candidate（改变目标/价值/权限/共享协议/base/不可逆效果，先形成 decision package 得到 owner 选择）。
- **事后纠偏闭环**：发现偏差 → 限制影响（必要时停止/回退/补偿）→ 区分偶发/上下文/方法缺口/目标改变 → 最小 correction candidate → 隔离验证 → 保留 baseline/观察/未知/回退 → 重复或扩大才沉淀或上移。系统可以自主纠正自己的局部工作，但不能用"自我纠偏"代替 owner 的价值选择、接受、发布或不可逆授权。

### 防退化的闭环迭代（iterative-improvement）

- **有边界的改善关系**：从可复现 baseline 产生 candidate，判断是否改善目标关系，保持硬约束并留下可重建证据。P03 规定实践与认识往复（只有改变下一判断的观察才构成迭代）；P15 规定检验手段（回到有匹配对照、可观察结果和相称评审的实践）；P16 规定检验全程时点（低风险可逆对象可记 N/A 并说明理由）。
- **净改善不是总分**：目标 outcome、边界/回归、证据质量、时间与 token、协调等待、维护和外部效果分别记录；无共同单位不得在结果出现后临时调权。结果是带硬约束的向量。
- **change hypothesis + acceptance card**：每轮在治疗前冻结 acceptance card（接受者、硬约束、重大退化定义、最小证据、成本预算、观察窗口、fresh holdout 规则）；结果出现后不能为通过而改写，必须改就开新 round 或置 uncertain。
- **证据集合**：positive（目标行为应发生）、boundary/nearest-owner（不应发生或应转交）、regression（已支持行为须保留）、holdout（作者未见，只用于独立泛化）。四类回答不同问题，不能互相替代；被反复调参的集合降为 development evidence。
- **污染与证据降级**：模型/来源 hash/任务/harness/权限/工作区不一致、control 共享被改的 mutable 组件、隔离破坏、fixture 在看见结果后改写、holdout 被消耗 → 只能报已观察行为或 uncertain，先修 workflow/fixture/config 再重跑。
- **Owner 路由**：主要缺口送到最小 owner（theory/skill/fixture/workflow/runtime/base），不因 correction 名称自动改理论；上游 P 变化沿 `P → theory → skill/fixture/rubric/旧结论` 血统传播 stale 并重生成。
- **处置集合**：`adopt / adapt-and-retest / retain-baseline / no-proposal / rollback / uncertain`——证据处置，不是 runtime 状态或必经门。
- **流程本身也必须被检验**：区分真实 outcome、process 与 balancing cost；"更严格/记录更多/用了更多 Agent"是 process 观察，不是 outcome 改善。
- **收敛**：回到冻结的 acceptance card（观察窗口、fresh holdout 规则），不是轮数或所有人同意；未知未解决时闭环暂停，不因文件完成或时间耗尽自动消失。
- **Principal correction 是来源有界的改进输入**：必须保留 raw、来源与 authority、指向的对象与 revision；语气、频率或自报不能单独取得 Principal 身份。

### Owner-facing progress 与设身处地（owner-facing-progress）

- **总方法（六步判断）**：识别边界（等待哪个 decision/acceptance/effect/source）→ 恢复 authority（owner 不可恢复报 unknown，不从文件名/角色名猜测）→ 先做有界调查 → 判断是否值得打扰 owner（局部可逆低影响就自主继续）→ 设身处地形成 decision package（第一视角重建决策者需要看到和回答的问题，给出可比较方案/取舍/风险/回返条件）→ 保留选择权并继续独立工作（只暂停受影响分支）。这是一组判断关系，不是固定工作流。
- **Situated decision preparation（设身处地）**：把自己放到有来源边界的目标场景里第一视角检查（主体在完成什么、看到什么、缺什么、能承担什么后果、需要谁作哪个决定）。只改变观察与表达视角，不改变事实/authority/效果/接受关系；场景事实不足保留 unknown。
- **Perspective frame（三层投影）**：`stable anchors`（goal/scope、canonical authority、non-goal、接受/效果边界、不变量——来自 source）+ `role lens`（该主体的观察责任、可提出/不可选择的决定、风险——描述责任视角不授予权限）+ `scene frame`（当前事件/对象/目标/约束/事实/unknown/允许效果/下一步——场景变动优先刷新）。是可丢弃、可检查的投影，不成为新事实权威；可作为 focus refresh 的承载视图。

### 规划收件箱（planning-inbox）

- 低摩擦接收任意想法、观察、疑问、待办和半成形计划；忠实保留（语义保真 capture，可修正语法错别字但不得改变语意）并秘书式整理；capture 与 process 分离，clear 前必须把可回读回执写入 history；不把想法偷换成 commitment、priority、goal、owner 或 acceptance。
- **五个词不能互换**：consume（被读取/处理尝试）≠ clear（视图移除）≠ archive（不再 active 但可回读纠正恢复）≠ complete（目标关系满足终止条件并有证据）≠ delete/purge（破坏 source，需明确权限）。"inbox zero"最多是视图观察，不能作为完成信号。
- **goal / Plan / local Todo / execution record / acceptance 不可合并**：各自拥有不同关系；raw 可以是既有 Plan 的新证据，也可以确认为局部 Todo，而不改变 goal；会改变整体接受关系或主线的输入要带回 Plan/goal owner。
- **载体能力分界**：方法表达/项目指令/Markdown/script/tool-runtime 各能表达什么、不能凭文字取得什么（强制执行、唤醒、权限、原子性、恢复）。出现第二个 writer、需要原子 claim/事务、跨 store 交接、长历史、持久身份、后台唤醒、不可逆外部效果、exactly-once 等要求时，Markdown 适用性必须重新检验。

### 关系验证与系统设计（relational-verification-design）

- **核心**：theory/method/skill/task expression/WorkCell/evidence/review/acceptance/correction 是同一验证系统中不同对象、关系、时间片或受众视图。局部工作 + 系统回看并存：每次只选当前真实压力、最小对象和最小改变，同时在改变判断的边界处检查必要的上游、横向、下游、时间与证据关系。激活/唤醒只说明获得观察机会，不能替 initiative judgment。
- **关系面**（按风险检查，不每次机械填）：上游语义、权威与责任、横向边界、下游使用、时间与纠偏、证据与验证。
- **work map 是系统关系的投影**：Plan/Task/Todo 是同一 work map 的不同关系视图；检查下一行动能否从 authority/依赖/允许效果/完成观察/返回关系中重建。
- **三种主张严格区分**：局部观察（candidate 在指定范围产生预期变化）≠ 关系支持（未破坏已声明不变量或残余未知已保留）≠ 系统采用（owner 已采纳且影响范围/回退/观察/接受 standing 可回读）。局部 review 不能自动取得全局 acceptance。

## 设计认知（design/）

- **Work Cell 执行协议（work-cell-protocol）**：当前唯一 WorkCell 设计正文（Draft）；分层模型 WorkCellSpec/WorkspaceScope/ExecutionRequirements/ResourceLimits/CompletionContract，宿主绑定与效果边界，运行请求/运行态/运行记录（WorkCellRunRecord），事件与证据模型（EvidenceRef/RunEvidence），机械检查/语义审查/接受分离。WorkCell 明确暂停于 `paused-by-priority / design-review-deferred`。
- **工作流综合稿（harness-workflow）**：`pre-design-synthesis` 综合稿，不是正式 design；正式设计必须先经过问题/场景简报、概念与边界分析、角色/权责设计、skill 形成判断和独立 review。
- **下一代项目种子（project-bootstrap）**：bootstrap = `AGENTS.md` + skills，用老项目孵化下一代项目开发入口（见 thoughts/workflow.md 的 024A）。
- **Planning 文档组织（planning-artifact-organization）**：文档组织的唯一设计正文（Draft）：实用、有效、有明确目的，避免形式主义。
