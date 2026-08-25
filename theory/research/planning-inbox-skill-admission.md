# 规划收件箱 skill 准入审查

**Standing：** `research / skill-formation admission candidate`。本文判断 planning
inbox 是否值得成为可选择加载的项目 skill 载体；它不是 skill 文件、不是接受记录、
不是 `/inbox` 实现或 runtime 设计。本文只提出形式与行为验证候选，不把候选存在
当作行为已成立。

## 结论

**处置：`admit` 一个项目内 incubating candidate，行为状态 `unknown`，后续为
`adapt-and-retest`；不接受为 living skill，不晋升到 `skills/`。**

理由有两层：

1. 用户已明确提出低摩擦 `/inbox`、秘书式整理、批量澄清、去向路由和 active-goal
   safe-point recheck 的配套 skill 意图；实际 `planning/inbox.md` 已收到一批六段
   同批 raw capture。这足以证明一个重复使用关系和项目内使用场景存在。
2. 现有七个 skills 分别拥有概念、形式、Agent 表达、人类写作、双受众、委派和
   skill 准入判断，没有一个拥有“保留任意 planning 输入并在不越权的情况下秘书式
   路由”的主要行为。可是目前没有 matched baseline、失败轨迹或实际秘书整理行为，
   因此只能准入候选进入验证，不能声称 skill 改善或正式接受。

这里的 `admit` 是“值得形成一个最小候选并验证”，不是自动创建、发布、接受或晋升。

## 来源与证据地位

### Living source 与项目边界

- `theory/harness/planning-inbox.md` 已接受为 planning inbox 的语义边界：对象是
  `raw/source → secretary interpretation → disposition → optional/explicit handoff
  + provenance`；它把下游 Plan、Todo、research/experiment record、Run/Cell、
  evidence、completion 和 acceptance 分给真实 owner。
- `theory/skill-formation.md` 要求对象、可重复差距、触发边界、可由方法表达改变的
  行动和可观察结果同时得到支持；否则应研究或 `no-proposal`。
- `AGENTS.md` 将 `planning/inbox.md` 定位为 raw-first capture，将 `evals/` 定位为
  evaluation artifacts，将 `experiments/` 排除为 evaluation record，并规定项目内
  incubating skill 先放 `.agents/skills/`；不得在 `.agents/skills/` 与 `skills/`
  复制两个 canonical 正文。
- `planning/roadmap.md` 与 `planning/plan.md` 仍处于理论、skills 和基座设计阶段，
  不授权 harness base、后台执行或独立 runtime。

### Actual provisional input

当前 `planning/inbox.md` 有同一次 `/inbox` 输入的六个 raw 片段，保留批次、顺序和
逐字原文：迭代循环的观察、开发生命周期 skills 的计划、控制变量评估 Agent 行为的
想法、碎片化思考的设计验证、多互斥人格统一 self 的实验想法，以及 DeepSeek
harness 基座方向。这组材料说明入口必须能接住 observation、半成形计划、实验候选
和系统方向等最近邻，而不能把它们一律写成 Todo 或已接受目标。

它只证明 provisional raw capture 和输入多样性；不证明 secretary interpretation、
triage、handoff、skill 行为、正式 schema、实验记录或接受关系成立。六段来自同一
批次，也不等于已经观察到六次重复的 Agent 行为。

### 三轮 review 的关系

- 第一轮将对象从全生命周期收窄到 capture、interpretation、disposition、handoff，
  并要求 authority、hold/revisit 与 P12/P13 消融。
- 第二轮发现 candidate 与实际 experiment record 的 B5 混淆。
- 第三轮静态接受了 candidate/record、research/experiment/incubation、raw 重建和
  runtime/form 边界，但保持行为 `unknown / adapt-and-retest`。

因此 reviews 支持一个可表达的候选对象和最近邻，不提供 skill 的 matched improvement。

## 候选 skill 的对象与主要判断

### 最小英文 machine name

`planning-inbox`

### 候选中文 description

在本项目 `planning/` 与 goal 约定下，低摩擦接收任意想法、观察、疑问、todo 和半成形计划，忠实保留并秘书式整理，在不扩张承诺、优先级、owner 或授权的前提下批量澄清并将内容交给适当的计划、候选研究/实验、孵化或其他真实 owner。

这只是候选元数据表达，不是已创建的 frontmatter，也不预先规定目录字段。

### 一个主要判断

当 Agent 接触 planning input 时，怎样同时做到：

> 保留可重建的用户 source，区分明确/推断/unknown，选择保留、澄清或可追溯
> handoff 的最小去向，并且不把想法偷换成 commitment、priority、goal、owner、
> scope、record、execution 或 acceptance。

capture 与 secretary process 暂定为同一 skill 的两个模式：

- **capture mode：** 在 `/inbox` 或等价明确入口接住 raw，可按语义转折拆分，但保留
  批次、顺序、逐字内容、来源和上下文；低摩擦优先，不强行解释或追问。
- **process mode：** 在用户请求整理、Agent 到达合理 safe point 或已有有界委派允许
  处理时，形成候选 interpretation、批量澄清和 disposition/handoff；不把去向名称
  当成已创建的下游 record 或接受结果。

两种模式共享 source、authority、最近邻、handoff 和失败边界，且 process 以 capture
为输入；当前没有证据证明它们应由两个可独立选择、独立验证的主要判断承载。若 probe
显示 capture 与 process 的触发、失败、owner 和收益完全独立，再交由 skill-formation
重新判断拆分；不因章节或输入类型多就预先创建多个 skills。

## 触发边界

### 正触发

- 用户显式使用 `/inbox` 或要求把任意表达先作为 planning raw capture；
- 用户要求秘书式整理 inbox、批量合并/去重/澄清、给出 disposition 或建立可追溯
  handoff；
- active goal 的处理在合理 safe point 重新看见新增/修订 planning input，并需要
  判断保留、回返、澄清或交给 owner；
- 项目明确授权 Agent 在 `planning/` 与既有 goal/Plan 约定内做低风险、可逆的本地
  整理、链接、局部 todo 或有界检查。

### 负触发与最近邻

- 普通笔记、聊天摘要或不属于 planning 的 source：由当前任务表达或普通文档承载；
- 已明确的 canonical Plan、goal、Task、local Todo、执行记录或 acceptance：交给它们
  各自 owner，inbox skill 只能提供 source/provenance handoff；
- research candidate 与实际 research record：前者承载待调查问题/来源/推断/矛盾/
  unknown/所需证据，后者由 research record/source owner 负责；
- experiment candidate 与实际 experiment/eval record：`想试 A` 可是 candidate，
  实际跑 A 的 Run/Cell observation/effect/failure/evidence 才是 record；前者不能冒充
  后者；
- incubation/planning candidate：只表示方向性计划，不取得 research/experiment
  standing；
- 一次性高风险决策、外部不可逆效果、发布/接受、跨项目 priority/owner/scope 变更：
  回到真实 Principal、destination owner、runtime 或 protocol owner；
- 需要后台唤醒、持久 identity、并发 claim、取消、恢复、exactly-once 或副作用幂等：
  不是 skill 触发或 skill 能力，交给 runtime/base。

词语“想法”“实验”“紧急”“应该”本身不足以触发较强语义；触发由项目上下文、
真实 source、authority 和预期 action 共同判断。

## Authority、返回和失败边界

### 可做与不可做

explicit `/inbox` 指令或既有 bounded delegation，在其自身 action、scope、effect
boundary 和 reversibility 内，可以支持保存 raw、语义拆分、可逆本地整理或链接、
局部 todo、合并/重复建议、批量澄清和有界检查；不要求每条 raw 都 fresh confirmation。

skill 不能因此扩张 commitment、priority、goal、owner、scope 或 acceptance，不能
代替 Principal 接受，不能创建实际 research/experiment/eval record，不能执行外部
或不可逆效果。普通 suggestion 或 Agent inference 只产生候选 interpretation、
disposition 或 hold。

### 返回关系

返回应让调用者和真实 owner 重建：

- raw 或可重建片段的 source、批次、顺序、上下文和 provenance；
- secretary interpretation 中哪些是 explicit、inferred、unknown，以及冲突和反例；
- disposition 是保留、澄清、候选 handoff、research/experiment/incubation candidate、
  合并、拒绝、归档或 hold 的哪一种关系；
- 依据的 authority、建议的目标 owner、所需澄清、reason、revisit/return 或 escalation；
- 已实际执行的局部动作、证据 standing、失败范围和仍需 Principal/owner 接受的部分。

`consume`、`clear`、`archive`、`complete`、`review` 或 receipt 都不能被返回成已接受、
已执行或已完成。没有运行机会时只返回“未复查”，不返回后台持续检查的断言。

### 失败与安全停止

来源、权限、对象、上下文、目标 owner 或 evidence 不足时，保留 raw，标 unknown/hold，
并返回阻塞它的关系；不要用流畅摘要补齐。遇到重复、冲突、撤回、旧 baseline 或
active goal 改变时，保留 lineage，在 safe point 重新判断或回返最小 owner。工具、
并发、取消、重启、恢复、持久化或外部效果失败时，只报告观察到的局部结果和 runtime
缺口，不由 skill 声称已经恢复或 exactly-once。

## 与现有形式和 skills 的比较

| 候选 | 能真实承载什么 | 主要不足/边界 |
|---|---|---|
| 项目局部指令（含当前 AGENTS/plan 约定） | raw-first、项目路径、goal/Plan 事实和不可越权边界；低成本、始终可见 | 不能选择性加载秘书 process，也不适合承载重复批量澄清和行为方法的完整表达 |
| 普通文档/理论 | 保存定义、理由、来源、未知和审查历史 | 不自动触发，不保证 Agent 在 `/inbox` 或 safe point 使用它 |
| 现有 skills 组合 | concept、form、Agent expression、human writing、dual audience、delegation、skill formation 各自保留真实 owner | 没有一个可发现入口把 planning source、秘书 triage、authority、去向和返回统一为同一主要判断；让普通用户手动组合会增加遗漏和发现成本 |
| 一个 `planning-inbox` skill | 可选择加载一个项目特有的主要方法，覆盖 capture/process 两模式及正负触发 | 需要证明边界和行为收益；不取得项目事实、下游 authority 或 runtime 能力 |
| 多个 capture/triage/goal/experiment skills | 可能分别表达更窄方法 | 当前没有独立触发、失败、owner 和验证证据；过早拆分会复制 source/handoff 边界并制造发现噪声 |
| tool/runtime/base | 可提供确定性写入、身份、并发、恢复、持久证据和外部效果 | 不能替代秘书语义判断；本项目当前不因 skill admission 实现这些硬属性 |
| 有限计划 | 可承载一次有界迁移、fixture 或验证 round | 不是重复使用的选择性方法，不应替代 skill |

因此候选形式是项目 `.agents/skills/` 的 incubating skill，而不是 `skills/` 的可移植
skill、`planning/inbox.md` 的第二权威、或一个新 tool/runtime。项目指令仍保留
canonical facts；候选 skill 只内化方法。未来若脱离 `planning/`、goal、项目 authority
和本仓库路径后，仍能独立定义对象、触发、owner 与收益，且通过验证，才可能由
form-selection/skill-formation 另行判断晋升到 `skills/`；不得复制两份 canonical 正文。

## 相邻 owner

- `concept-articulation` 拥有 research/experiment/candidate/record 等最近邻概念的
  边界形成；本候选消费这些区别，不把词名当定义。
- `form-selection` 拥有“项目指令、普通文档、skill、tool/runtime、projection 或
  有限计划”的形式取舍；本报告只是准入研究，不能代替正式载体选择。
- `human-writing` 拥有人类可理解的澄清说明、理由和结果表达；
  `agent-expression` 拥有把已选方法写成 Agent 可判断、行动、失败和返回的契约。
- `dual-audience-expression` 拥有人类视图、Agent 视图与唯一语义源的同步；inbox
  skill 不得复制第二 canon。
- `agent-delegation` 拥有是否分派秘书/研究/评审贡献及其拓扑与证据重连；本 skill
  不决定多 Agent 并发或委派结构。
- `skill-formation` 拥有本次 admission、后续 retain/rewrite/split/merge/downgrade/
  delete 和证据等级；Principal 或明确受托者拥有最终接受。

## 行为 probes 与主张边界

这些 probe 只验证候选是否值得继续和是否真的改变行为，不是固定 schema 或 runtime
协议：

1. **发现与负触发：** 比较 `/inbox`、整理请求、active-goal safe point 与普通笔记、
   research record、experiment record、canonical Plan；检查候选是否只在 planning
   关系成立时被选择。
2. **raw capture：** 用当前六类混合输入，检查原话、语义拆分、批次、顺序、上下文和
   provenance 可重建，且没有自动生成 priority、commitment、goal、owner 或授权。
3. **secretary process：** 对同一批输入比较不处理、逐条澄清和批量澄清；检查
   explicit/inferred/unknown、冲突、reason、revisit 与低打扰是否改变去向判断。
4. **authority boundary：** 分别给予 explicit instruction、bounded delegation、
   suggestion；检查可逆本地动作无需逐条 fresh confirmation，同时拒绝外部效果、
   acceptance、scope 扩张和新 canonical obligation。
5. **candidate/record nearest neighbor：** 给 `想试 A` 与实际运行 A 的 observation，
   检查 candidate 不冒充 experiment/eval record、Run/Cell、evidence、completion 或
   acceptance；同样检查 research candidate 与 research record。
6. **route与主线：** 将输入路由到 Plan、local Todo、research candidate、experiment
   candidate、incubation/planning candidate、merge、decline、archive 和 hold；检查
   provenance、owner、standing 和下游接受边界不会被名称吞掉。
7. **active goal：** 在主线执行前后和 safe point 插入、修订、撤回新 input；检查不
   自动抢主线、hold 可见、无运行机会诚实返回未复查，且不声称取消/恢复保证。
8. **重放与丢项：** 重放相同、相似冲突、后写入和合并输入，检查不覆盖 raw、不重复
   handoff、不静默丢项，且 stale/return 关系可回读。
9. **匹配与回归：** 与项目指令 alone、现有 skills 组合和 candidate treatment 比较；
   冻结模型、任务、source、工具、权限、harness、workspace 与 reviewer，区分发现
   行为、激活行为、outcome、process 和 balancing cost。

最强主张按实际证据报告：`format-valid`、`behavior-observed`、`boundary-supported`、
`matched-improvement`、`regression-supported`。一次用户要求、六段 raw、格式通过或
候选自评只能支持意图/场景和研究候选，不能支持行为改善或稳定性。

## 最终准入与未知

### Admit 的最小落点

准入候选的建议落点为 `.agents/skills/planning-inbox/`，机器名为 `planning-inbox`；
本报告不创建该目录或 `SKILL.md`。候选首版只应表达上述一个主要判断、两个模式、
正负触发、authority/return/失败边界和最小 probes；不复制 planning facts、理论全文、
下游 record schema 或 runtime contract。

### 仍未知

- 用户明确意图与一次实际 raw batch 是否足以证明跨任务重复的 Agent 行为 gap；
- 项目指令与一个选择性 skill 在发现成本、遗漏率、上下文成本和实际 outcome 上的差异；
- capture/process 是否真的共享一个主要判断，还是未来出现两个独立触发/失败/owner；
- secretary 是否能忠实处理混合输入而不升格 commitment、priority、owner、record 或
  acceptance；
- active-goal safe-point recheck 在真实运行机会中的漏项、重复、stale 和负担；
- 离开本仓库 planning/goal 事实后，候选是否仍有独立可移植对象和收益；
- 任何持续 wake、并发 claim、exactly-once、取消、持久 identity、恢复和外部副作用
  语义，均不由该 skill 提供。

若正/负触发、重复性、独立主要判断或行为收益无法在上述 probe 中区分，后续处置应
为 `no-proposal` 或降级为项目局部指令/普通文档/reference；不得因用户希望有 skill、
候选文件已创建或 `/inbox` 名称存在而继续保留。若候选在项目内通过边界和行为验证，
再由 skill-formation 与 form-selection 独立判断是否保留、改写或晋升；任何接受仍由
Principal/明确受托者作出。
