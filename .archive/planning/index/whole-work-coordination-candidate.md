# Whole-work coordination capability candidate

definition：`candidate-definition-observed`
behavior：`planning-behavior-observed`
boundary：`boundary-reconciled`
acceptance：`pending`
carrier：`not-selected`。

这是一个当前 planning/design consumer 的能力候选，不是正式 skill 名称、portable promotion、
runtime orchestrator、queue、registry、priority authority 或实现授权。文件名中的
`whole-work-coordination` 只是临时 handle；正式 designation 要等概念边界和行动检验成立后再选。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象与观察来源

### 对象

候选对象是：在一个整体目标包含多个 planning item、owner、依赖、证据和阶段边界时，持续恢复整体
关系，并据此选择当前 bounded wave 的组成、拓扑、综合和 checkpoint，使局部工作能够回到整体，
同时不把局部等待、局部成功或局部发现误写成全局状态。

它关心的是 **whole-work relation**，不是文件、任务列表或 Agent 数量。它需要能够回答：

- 整体目标、硬约束、non-goals、canonical authority 和接受关系是什么；
- 各 item 当前处于什么 standing，哪些依赖已成立，哪些只是 candidate/unknown；
- 哪些贡献可以直接做、顺序做、并行做、等待 owner 或明确 no-proposal；
- 局部结果回到整体后改变了哪个义务、依赖、阶段出口或下一 wave；
- 什么时候应做整体 checkpoint、合并 projection、重排 branch、settle、route 或继续。

### 当前观察与来源地位

- 用户反复纠正当前目标是“整个 planning”，而不是单个 WorkCell、吞吐或迁移 item；这是当前
  goal 的 explicit scope evidence。
- 当前 planning projection 曾把某些 item 的 `waiting-for-owner` 扩大成整个 planning 的
  `closed`；本轮已将全局与 item-level route 分开。这是当前 planning 中已经观察到的 coordination
  failure，不是抽象的未来风险。
- 用户指出不能持续堆叠局部 artifact，需要定期整体回顾和整理；现有 checkpoint 规则已部分承载
  该要求，但缺一个明确拥有“整体 wave 选择与 fan-in”的方法边界。
- 当前已有 `agent-delegation`、`work-estimation`、`practice-cycle`、`planning-inbox` 和
  `form-selection` 等局部方法；它们的 scope 与该缺口的最近邻关系见下文。
- archive 的 `systems-engineering` 是 whole-system reliability 的历史候选，但其正文明确不拥有
  generic planning、task packet、runtime queue 或单 Cell 执行，因此不能直接当作本候选的现行载体。

上述前三项是当前 worktree/user interaction 中的 planning-level observation；“缺一个可独立
选择加载的 method carrier”仍是 inference，尚未接受。

## 2. 候选主要判断

临时表达为：

> 给定一个拥有整体目标和接受边界的工作，如何恢复跨 item 的当前状态与依赖，选择相称的 bounded
> wave 和 direct/sequential/parallel/hold 拓扑，把局部结果按来源、证据和未知接回整体，并在
> checkpoint/replan 时保持阶段、owner 和 non-goal 不被局部结果改写？

它不是要替人决定产品优先级，也不是把所有工作变成一套固定 workflow。它提供的是一种可重建的
整体判断：局部贡献只有在说明其影响的整体义务、下游使用、证据覆盖和未决关系后，才改变 whole-work
projection。

## 3. 最近邻边界

| 最近邻 | 它拥有的主要判断 | 本候选不接管的部分 |
| --- | --- | --- |
| `agent-delegation` | 一个真实 bounded contribution 是否值得分出，以及 direct/sequential/parallel/nested 拓扑和返回重连 | 不拥有整个 planning 的 item graph、阶段出口、全局 checkpoint 或长期 branch 处置 |
| `work-estimation` | 为当前决策恢复最小工作图、发现分支、依赖和估算粒度 | 不选择整体战略优先级、调度多个 item 或综合执行结果 |
| `practice-cycle` | 一次真实实践产生结果后，下一项最小实践如何 settle/continue/route/uncertain | 不维护跨 wave 的总状态，也不代替阶段/acceptance 判断 |
| `planning-inbox` | 接住 raw、保留 provenance、做 triage 并把关系交给对应 owner | 不把 capture 或 triage 变成 Plan、goal、执行队列或全局 priority |
| `form-selection` | 已确立语义对象应以文档、projection、skill、工具或其它最小形式承载 | 不决定整体工作应如何推进 |
| `goal-linked bounded initiative` | 在具体任务中从来源支持的缺口选择、执行并回看一个有界的下一步 | 不拥有跨 item 的总状态、wave 拓扑、fan-in 或阶段出口；它是统筹可消费的一种局部行为关系 |
| `systems-engineering` | 在真实扰动、失败后果和 residual risk 下设计足够可靠的 whole system | 不拥有 generic planning、普通任务统筹或项目 wave 选择 |
| runtime/orchestration | 执行已经准备好的 Run、并发、取消、恢复、队列或 provider 关系 | 不由文字方法取得 runtime hard guarantee，也不替 planning owner 决定整体义务 |
| project management | 组织资源、外部承诺、时间和责任安排 | 不由本候选虚构预算、组织权限或外部 priority |

最容易误判的两个邻居是 `agent-delegation` 和 `systems-engineering`：前者是 whole-work 中的
contribution topology 子判断，后者是 failure/control/residual-risk 的 system design 子判断；本
候选只有在跨 item 的 wave、fan-in、checkpoint 和阶段回接构成独立、重复的行动差距时才成立。

## 4. 允许的最小方法形状

候选方法至少要保持以下关系，但不预先规定固定字段、状态机或 runtime schema：

1. **恢复整体 anchor：** goal、Plan、canonical source、hard constraints、non-goals、当前
   acceptance boundary 和不可越过的 implementation boundary。
2. **恢复工作图：** item standing、依赖、owner/consumer、证据、未知、阶段出口和可回返关系；
   区分 current authority 与 dated projection。
3. **找当前 decision-changing gap：** 不按文件数量、最长文本、最近发现或 Agent 空闲度选主线。
4. **按影响决定是否准备 owner decision：** 缺少 owner 或 acceptance 不自动触发 package。只有方向、
   权限、共享基线、不可逆效果或关键安全行动确实需要 owner 选择时，才把自己/Agent 放进目标场景的
   第一视角，恢复决策者面对的目标、约束、后果和真实 source，提出方案、取舍与待决问题；普通局部
   缺口先自主推进并事后纠偏。package 以加快重大决策为目的，可以共享一次上下文恢复再按 owner
   class 分发，但不暗示由一个 owner 替所有责任边界作决定；它不取得 owner 的选择、acceptance、
   priority 或授权。
5. **选择 wave 与拓扑：** 对输入稳定、效果面分离、返回可独立综合的 contributions 才并行；有
   共享权威或真实依赖时顺序或合并；缺 owner 时只挂起对应 item，但继续做有界 decision preparation。
   对独立运行场景，先区分 activation/wake（让事件、开放关系或到期回看进入视野）与 initiative
   judgment（判断哪个缺口值得推进）；增加唤醒频率或 lane 数不能替代后者。
   对当前尚未逐步指定的下一步，统筹还要检查它是否符合
   [`goal-linked bounded initiative`](../../theory/research/harness-agent-initiative-research.md)：
   候选必须连到 accepted purpose 和现实缺口，在同一 effect boundary 内有局部选择，行动有界且后果可
   归因，结果能改变下一判断；这组关系暂称 `goal-linked action loop`。合格的 `no-proposal`、`hold`、
   纠偏或 owner package 也算有效推进结果。调用次数、并行 lane 数和“主动”措辞本身不构成 progress。
6. **表达 contribution contract：** 每项返回其改变的整体义务、来源、允许效果、覆盖、未知、
   验证和下游使用；不把局部结果直接提升为全局 acceptance。
7. **fan-in 与冲突处理：** Main 恢复共同遗漏、冲突、跨 item 不变量和接受关系，更新现有 current
   authority，而不是为每个返回创建 sibling projection。
8. **checkpoint / replan：** 波次结束、canonical source 改变、阶段 gate/replan 或用户纠正时，
   合并、保持 done-for-now、重开、route 或 no-proposal；必要时改变拓扑，但不抹掉旧未知和来源。
9. **work-map 驱动：** 多步骤/多任务默认先复用一个可回读的 Plan/Task/Todo work map，再从中选择当前
   bounded action；Plan 保留整体义务，Task 保留贡献边界，Todo 保留下一步、依赖、等待、失败和回返。
   它应支持 wave 的 fan-out/fan-in 和局部 owner wait 的可见性，但不制造第二 planning authority、全局
   Todo queue 或 runtime scheduler。一步且低风险可逆、无依赖/交接的动作是明确例外；清单勾选也不替代
   evidence、semantic review 或 acceptance。

这些是方法判断，不是要求 runtime 自动排队、自动 retry、自动 wake、自动 priority 或自动接受；其中
activation/wake 只是机会暴露关系，不能因它存在就声称已形成主动性。

## 5. 证据、阶段与 carrier 处置

当前最强 standing 是 `candidate-definition-observed / planning-behavior-observed`：

- 当前 goal 中已有真实 consumer：整个 planning 的主线恢复与本轮目录/脚本治理；
- 已观察到至少一个负面边界：item-level owner gate 被错误扩大为 global closed；
- 已观察到用户要求的整体 checkpoint 与“不持续堆叠”约束；
- 主观能动性研究的 evidence follow-up 已补出 activation/wake 与 initiative judgment 的边界，并形成
  `goal-linked action loop` 的机制综合，但尚未有真实 consumer 或 matched 行为证据；
- 尚没有匹配 baseline/treatment、独立语义接受、采用后回归或 portable consumer。

因此当前只做三件事：

1. 保留本 candidate 作为 source-linked design/planning record；
2. 在真实 planning/design wave 中继续观察它是否能稳定区分 `agent-delegation`、
   `work-estimation` 和 `practice-cycle`，并是否减少全局/局部状态误判；
3. 在边界和 consumer 稳定前，不创建正式 `.agents/skills/` carrier，不进入 `skills/`，不创建
   workflow engine、queue、registry、scheduler 或新的 planning authority。

## 6. 下一项最小实践

在 `item-ledger.md` 选定下一条 bounded wave 后，使用当前 planning goal 做一个窄的 source-linked
boundary practice，不启动 synthetic Run；在 wave 尚未选定前只保留当前候选与回返条件，不预先打开
该实践：

- **正例：** 一个 item 等待 named owner，另一个有独立 source 和允许效果的 item 仍可进入同一
  bounded wave；检查是否保持 item-level gate 与 global progress 的区分。
- **并行边界：** 两个 contributions 输入和写面互不冲突时并行；存在共享 current authority 时改为
  单写者顺序；检查是否能说明拓扑改变的理由。
- **反例：** 没有 decision delta 的重复 review、无法重建 identity 的 Run 或缺少 acceptance owner
  的候选，检查是否返回 wait/hold/no-proposal，而不是继续堆 artifact。
- **fan-in：** 返回后只更新现有 current authority，检查是否保留来源、覆盖、未知、owner 和
  revisit，而不创建第二份总 plan。

接受观察不是“写出一份完整流程”，而是下一判断是否发生了可回读变化：整体未被局部 gate 冻结、
独立贡献真的减少关键路径、局部结果正确回接、或反例能让方法拒绝不应开启的分支。接受 owner、
runner identity 和回归窗口目前仍 `unknown`。

## 7. 2026-08-25：波次状态与全局状态边界实践

### 实际对象与实践

- 对象：main planning goal 的全局 standing、当前 bounded wave 是否打开，以及 owner-return 等待
  的局部处置。
- 触发：当前 `item-ledger.md` 的 checkpoint 同时出现“没有已打开 sibling wave / closed waiting”
  与“全局 planning active / item-gated / checkpoint-required”的表达，可能把波次关闭误读成全局
  blocked。
- 最小改变：将当前波次状态改为 `checkpoint-required / awaiting-next-wave-selection`，并明确
  这是局部执行状态；同步修正 `plan.md` 与可重开分支的 current wording。没有改变任何 item 的
  owner、acceptance、依赖、允许效果或实现边界。

### 结果与 standing

- 观察：当前没有 sibling wave 正在运行，但整个 planning goal 仍可在 checkpoint 后选择独立
  bounded contribution；缺 owner 的 item 继续局部等待，不再自动冻结其它 item。
- 处置：本次状态歧义 `settle`；whole-work-coordination candidate `continue`。仍需观察后续真实
  wave 是否能正确选择独立贡献、完成 fan-in，并在 owner return 或 decision-changing evidence
  后重排，而不是只依赖文字约定。
- 证据：`planning/README.md`、`planning/plan.md`、`planning/item-ledger.md` 与本 candidate 的
  current wording 已一致；planning/skill mechanical validators 通过。该结果是
  `planning-behavior-observed / boundary-reconciled`，不是 matched improvement、独立 semantic
  acceptance、runtime guarantee 或新的调度权。

### Owner-decision preparation correction

- **来源：** 当前对话中的 Principal 指令；对“等待 owner”这一类处理方式的统一修订。
- **废止的旧假设：** owner 未命名时只能记录 `owner return`、`unknown` 或等待其它变化。
- **新不变量修订：** 等待关系仍保留 owner 的选择权，但只有重大方向、权限、共享基线、不可逆效果
  或关键安全行动需要 owner 选择时，Main 才在允许范围内完成 decision preparation；普通局部缺口先
  依已有常识和方法推进并事后纠偏。
- **目的与边界：** 目的是减少 owner 的恢复和分析成本、加快推进，不是替 owner 工作、偷懒或取得
  acceptance、priority、scope、协议字段或 runtime 授权。方案包的推荐只是候选，owner 仍可选择、
  修改、延期或拒绝。
- **当前 standing：** `principal-correction-observed / planning-method-updated / behavior-unverified /
  acceptance-pending`。这是当前方法规则，不宣称已经通过 matched 或 regression evidence。
- **当前最小实践已形成：** WorkCell readiness 的 4.1 已围绕 RunRecord identity 形成 A/B/C
  decision-ready package，4.2 又将 15 个维度聚合为 5 个 owner-decision bundle；它们已经保留
  source、unknown、回返和不授权边界。下一步不是重建 package，而是等待 named owner 在有限选项
  间作出选择或提出 decision-changing correction，并把结果回接 item ledger 与 canonical source。
  在 owner 返回前保持 `route-to-owner / acceptance-pending`，不继续堆叠 WorkCell 字段、review 或
  新机制。

### Generic owner-facing progress application

通用 owner-facing 语义由 [`theory/harness/owner-facing-progress.md`](../../theory/harness/owner-facing-progress.md)
承载；局部设计与整体关系的回看采用 [`theory/harness/relational-verification-design.md`](../../theory/harness/relational-verification-design.md)。
本 candidate 只保留 planning 的应用观察：在 owner-gated item 上，先以对应 decision owner 或
下游 consumer 的第一视角恢复目标场景，准备带 source、unknown、方案、取舍、推荐边界和明确问题的
decision package；owner 仍保留选择权，Main 不把它写成 acceptance、协议字段或 runtime authorization。

planning 的专门检验是：这个 application 是否让 item 局部等待而不冻结整体，是否让 owner 能在有限候选
间作决定，是否在 owner 返回后能把 decision delta 重新接回 item ledger 和现有 source。角色与场景恢复、
以及按风险选择 `focus refresh` 的方法边界由通用 harness theory 拥有；本 candidate 只观察它们是否帮助
planning 保持整体 anchor、避免局部 gate 放大全局停滞。它们的 generic standing 仍是
`design-candidate / behavior-unverified / acceptance-pending`。

## 8. 正式名称与后续决策

`whole-work-coordination` 只是临时 handle。只有以下关系稳定后才选择正式 designation 和载体：

- 概念能与 `agent-delegation`、`systems-engineering`、`planning-inbox` 和 runtime orchestration
  在真实案例中稳定区分；
- 至少有两个非重复 planning/design consumer，且同一主要判断反复出现；
- 正例、反例、最近邻 route 和 fan-in/regression 结果可独立 review；
- 载体相比当前 task expression、现有 skills 和 project instruction 的净收益成立。

如果后续观察表明它只是 `agent-delegation` 加 `practice-cycle` 的组合，不形成独立 skill；如果
需要跨重启、并发、不可信 caller 仍成立的 identity、queue、cancel、recovery 或 effect 保证，
则转交 WorkCell/runtime，而不是扩张本候选。

## 9. 2026-08-26：迁移候选与波次状态回返

本次以整个 planning goal 为整体，做了两个输入面分离的只读贡献：一项复核 archive migration 是否出现
新的真实 consumer，另一项复核 README、item ledger、plan、roadmap、candidate map 的当前 standing 与
阶段顺序。Main 负责交叉检查共同遗漏和最终回接。

- **迁移观察：** 没有新的 archive candidate 同时具备明确 consumer、owner、允许范围和可归因证据。
  `code-review` 仍为 `no-proposal-now / activation-deferred`，`structural-refactoring` 仍为
  `implementation-gated`；`artifact-organization` 仍只能 route-to-design。29 项 archive inventory、
  11 个 project-local carrier 和 portable `skills/` 为 0 的 standing 不变。
- **协调观察：** 一处 current projection 把已经收口的 `scope-reconciliation` 写成仍在开启；已在
  README、item ledger 和 whole-planning estimate 统一为“最近波次已收口，当前等待下一波选择”，历史
  lineage 未改写。
- **形式/权威观察：** `roadmap.md` 的非 dated 主体还重复写了外部研究和候选的 current standing、
  证据与处置，和其“只拥有长期方向与阶段顺序”的 authority 声明不一致。已将 roadmap 收窄为方向、
  阶段顺序和候选发现入口，把详细状态回收到 item ledger 与各 canonical record；这只是 projection
  去重，不改变任何 item standing、owner、phase、acceptance 或实现冻结。
- **standing 与处置：** 本次是 `planning-behavior-observed / boundary-reconciled / acceptance-pending`；
  migration 分支 `done-for-now / waiting-for-named-consumer`，whole-work candidate 继续保留为
  `continue`。没有创建 carrier、Run、queue、registry、scheduler 或实现授权。
- **下一回返：** 等待真实 consumer、named owner、decision-changing counterexample 或可回读 evidence；
  在此之前不重复 archive 扫描，不把候选数量或状态校正当成迁移完成、matched improvement 或 acceptance。
