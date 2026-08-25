# Research — planning inbox 的 P→theory 生产综合

**Standing：** `research / theory-generation candidate`。本文记录从哲学序列、
现行 harness theory、表达 skills 和 planning-inbox 两条研究线生成
`theory/harness/planning-inbox.md` 的理由。它保留公开来源与 archive 病例的
standing、冲撞、未知和探针；不创建产品 schema、运行时协议、任务状态机或
接受决定。

**项目意图（不是现行实现事实）：** 未来 `planning/` 可以有一个低摩擦的
`inbox.md`；用户以 `/inbox` 记录随意想法、观察、疑问、Todo 或半成形计划；
秘书型 Agent 忠实保留并整理，批量暴露需要澄清的地方，再把具有相应 authority
的内容路由到适当的 plan、todo、research candidate、experiment candidate、
incubation/planning candidate、合并、拒绝或归档去向。用户
也可能在一个 active goal 中继续插入输入，Agent 在可运行时反复检查。这里的
“可运行时”是项目意图中的使用关系，不是 prompt 已经拥有后台唤醒、持久身份、
exactly-once、并发 claim 或 crash recovery。

当前事实是：用户已经实际使用 `/inbox` 输入了一批想法，Main 只把它们作了
provisional raw capture 到 `planning/inbox.md`。这支持低摩擦入口的使用场景，
但不证明秘书整理、skill 行为或正式文件 schema 已成立。

## 1. 来源与 standing

| 来源 | standing | 本综合采用的语义 | 不采用的内容 |
|---|---|---|---|
| `theory/philosophy.md` | 哲学序列 canonical source | 16 条是问题处理环节的条目；它们是理论生成源 | 不从本题新增条目，不把方法写回哲学源 |
| `theory/gene-expression.md` | living meta-theory | 一是对象同一性，二是条目，三是环境冲出的 skill；普通激活不回读 P/theory | 不把 inbox 名称或 schema 当成新条目 |
| `theory/harness/theory.md` | living harness design theory | Task 是关系；Plan 是义务；Run/Cell/evidence/review/acceptance 分 owner；硬属性进 base/runtime | 不把本文件当协议或 base 实现 |
| `theory/harness/iterative-improvement.md` | living iterative theory | 对象同一性、baseline/candidate、未知、匹配实践、回归和停止 | 不把“反复检查”规定成每项固定流程 |
| `theory/research/planning-inbox-archive.md` | 本地历史研究 | archive 病例、raw/interpretation、Mission、Todo、safe point、清空差异 | archive 的路径、命令、旧 schema 和 vendor runtime |
| `theory/research/planning-inbox-open-source.md` | 公开来源研究 | GTD、GitHub/Linear、Taskwarrior、Beads、Org/Obsidian/MD Planner、OpenHands/LangGraph/Temporal 等的边界与未知 | 产品机制不自动成为本项目设计 |
| `.agents/skills/concept-articulation` | living Agent method | 对象/最近邻/临时 handle/反例/`no-proposal` | 不让它选择 inbox 载体或写任务契约 |
| `.agents/skills/form-selection` | living Agent method | 比较当前表达、项目指令、文档、projection、有限计划、tool/runtime；选最小真实形式 | 不由目录名推出形式或 runtime 保证 |
| `.agents/skills/human-writing` | living Agent method | 面向人的理解、理由、取舍、未知和行动表达 | 不定义对象或 Agent 契约 |
| `.agents/skills/agent-expression` | living Agent method | 把对象、来源、效果、失败、返回与验收表达成 Agent 可判断的任务 | 不拥有生命周期/权限/并发/接受 |
| `.agents/skills/dual-audience-expression` | living Agent method | 人视图与 Agent 视图共享唯一语义核、可追溯派生、回归 | 不要求两份正文或创造第二 canon |

`planning-inbox-open-source.md` 的 raw/interpretation、明确与推断状态、去向、
幂等、并发、Markdown 边界、持续运行和 12 个 probe 是研究候选而非采纳架构
（`:63-120`）。archive 中 `Observation Chronicle`、`Mission`、Todo probe 和
live input probe 同样只作为有范围的历史病例；当前 `AGENTS.md` 明确 archive
不是现行设计，harness theory 不实现 base。故本文件的结论是来源有界的
theory candidate，不是已有产品行为的声明。

## 2. 对象同一性：什么是“inbox handling relation”

### 2.1 不是一个列表，而是一条有边界的转换关系

本理论的对象不是 `planning/inbox.md` 文件、`/inbox` 命令、一个 Todo 行或一次
Agent 回复，而是：

> 在指定来源、用户/项目上下文和权限内，接住一个或一组任意语言输入，保留
> 其原始语义和不确定性，形成可审查的秘书解释，作出可追溯的去向判断，并在
> 有相应 authority 时把关系交给目标 owner，而不把 capture 偷换成承诺、优先级、
> owner、授权、执行、完成或接受。

它的 inbox 同一性由以下关系共同维持：

```text
raw capture/source
  × source identity, time, context, revision and retention standing
  × secretary interpretation (explicit / inferred / unknown)
  × triage disposition and its reason
  × optional / explicit owner handoff with provenance
```

缺少 source→interpretation→disposition 的可追溯关系，就不能声称这次 inbox
处理已形成可审查结果。handoff 可以没有发生，或只是候选；它不要求下游已经
执行、产生 evidence、完成或被 acceptance。执行、evidence、completion、
acceptance、archive 和 receipt 是 handoff 后可关联的下游结果或记录，不是每个
inbox 处理同一性的必要组成。一个输入可以有多个解释候选，但不能因此生成多个
已接受承诺；多个 raw 输入可以合并为一个 canonical object，但必须保留
all-to-one provenance、冲突和未解决未知。相似词、同一文件、同一用户或同一主题
都不足以证明同一性。

`raw`、`explicit`、`inferred`、`unknown` 是可恢复、可审查的语义区分，不是要求
所有实现采用这些名字或固定字段的合同。原话可以按语义转折拆成多个片段，但应
保留批次、顺序、逐字内容、来源和上下文，使原话可重建；这不是要求物理上保持
一整块 raw。

去向也要保留 standing：research candidate 只承载待调查的问题、已有来源、候选
推断、矛盾、unknown 与所需证据；experiment candidate 只承载待验证的干预、baseline、
controlled variables、configuration candidate、预期观察/证据条件与接受条件；
incubation/planning candidate 只表示尚未形成正式 research 或 experiment 关系的
方向性计划，不取得 research/experiment standing。实际 research record 的调查
观察、来源核验与结论由 record/source owner 负责；实际 Run/Cell 的 observation、
effect、failure、evidence 由 experiment record、runtime/Cell 与 evidence owner
分别负责。inbox 只作 disposition/handoff，不因去向名称创建实际 record 或接受结果。
最小反例是：`想试 A` 可以成为 experiment candidate；实际跑 A 的观察才是
experiment/eval record，前者不能冒充后者。本文不规定评估记录的载体或路径。

### 2.2 最近邻对象

| 对象 | 它回答的问题 | 真实 owner / standing | 最容易混淆之处 |
|---|---|---|---|
| raw capture / source | 用户实际写了/说了什么？ | 输入来源及其保存者；事实/观察材料 | 被摘要覆盖、被解释冒充用户意图 |
| secretary interpretation | 这些原话可能指向什么对象、关系或问题？ | Agent 的候选主张；必须可回到 raw | 把推断写成用户决定、事实或任务 |
| triage disposition | 现在保留、澄清、路由、合并、拒绝还是归档？ | 当前 workflow 的判断；必要时由用户确认 | 把 disposition 当成工作已完成 |
| canonical obligation | 谁要承担什么未完成义务、何时回返？ | 目标项目/任务/Principal owner | 把候选 Todo 当成已授权义务 |
| canonical Plan | 整体要改变什么，约束、依赖、证据和谁接受？ | 任务/项目接受拥有者 | 把计划文档当执行事实或 queue |
| local Todo | 当前执行者保留哪一个局部动作/return condition？ | 当前执行方法或任务 owner | checkbox 全勾替代语义完成 |
| goal | 长期方向、成功关系、invariant 与 non-goal 是什么？ | Principal / goal owner | 新输入自动改 goal 或抢 active mainline |
| active execution | 哪个 Run/Cell 正在以何种效果边界工作？ | runtime/Work Cell/编排 owner | Agent 自报“在处理”成为 liveness 权威 |
| evidence / completion | 观察到什么，某个局部 terminal condition 是否满足？ | 确定性观察者/Cell/任务 owner | mechanical pass 或 run done 代替 acceptance |
| acceptance | 候选是否被采纳，残余风险谁承担？ | Principal 或明确委派接受者 | review、recommendation、receipt 伪装成授权 |
| receipt / record | 某个输入、执行或决定的来源与消费事实是什么？ | 其 source-native recorder | receipt 被当成事实、完成或语义解释 |
| archive | 不再 active 的材料怎样可回读、纠正、恢复？ | source/retention owner | 看不见、清空、归档被误叫完成/删除 |
| memory/projection | 怎样帮助发现或回读 canonical source？ | 声明 source 的派生者 | index/relevance/新鲜度取得第二权威 |

`inbox` 因此不是上述对象之一的替代词。它可以是低风险 Markdown source 或
一个从 source 重建的 view；它不天然拥有 task、goal、priority、owner、执行
或接受。

### 2.3 Authority 与 fresh confirmation

低摩擦不等于取消 authority，也不等于每条 raw 都必须重新打断用户。应区分
authority 的来源和较强语义所需的 fresh confirmation：

| authority 来源 | 可直接支持的动作 | 不可由此扩张的语义 |
|---|---|---|
| explicit user instruction | 在指令自身的 action、scope、effect boundary 与 reversibility 内，保存 raw、可逆本地整理或链接、局部 todo、有界检查 | 不得把明确说过话泛化为新 commitment、priority、goal、owner、scope、acceptance 或外部/不可逆效果 |
| 既有 bounded delegation | 在明定范围、可逆性和副作用边界内执行上述本地动作，并提出 disposition/handoff | 扩大范围、代行 acceptance、产生新的 canonical obligation 或偷渡外部效果 |
| mere suggestion / secretary inference | 形成候选解释、问题、合并建议或 hold | 任何需要较强 authority/evidence 的承诺、优先级、主线改变或接受 |

“未确认”表示形成某种较强语义所需的 authority 或 evidence 尚缺，不表示本轮
没有再次询问用户。显式指令或既有有界委派足以覆盖的可逆本地动作不要求逐条
fresh confirmation；超出边界时才须回到用户、目标 owner 或 acceptance owner。

### 2.4 Hold、延期与重新可见

每个仍非终结的 hold 或 deferral 都必须有可见的 reason，以及至少一种可重新看见
它的关系：依赖的 owner decision、目标 safe point、明确 return condition、下一次
获得运行机会时的 review eligibility，或 owner-defined escalation 条件。没有新的
运行机会时只能说未复查，不能声称持续检查；不规定 scheduler、轮询频率或唤醒保证。

### 2.5 形式理由：为何进入 harness 子目录

目标 `theory/harness/planning-inbox.md` 的对象是 Agent 任务工程中的一段有边界
关系：从 human input 保留 source，经 Agent-facing expression 与秘书判断，形成
disposition，并可带 provenance 交给 Plan/Todo/研究/孵化或拒绝等目标 owner。其
核心困难不是如何写一个收件箱 UI，也不是一种普通文档格式，而是如何保持
source、authority、unknown、safe point、handoff 和接受边界；下游 execution/
evidence/acceptance 仍由各自 owner 负责。

因此它是现有 harness theory 的一个子理论候选：继承 Task/Plan/Run/Cell/evidence/
acceptance 的 owner 与 runtime 边界，并说明 inbox 作为方法表达、projection 和
未来 runtime 的边界。skill 与具体 form 由后续 `skill-formation` 和
`form-selection` 独立判断，本理论不预判。它也不是 `planning/inbox.md`：
后者是未来项目载体，承载使用关系；本文件解释其语义，不能由路径取得源权威。

形式选择的最小结论是：理论对象已有 handoff owner、authority 和硬属性边界，且
`theory/harness/` 已是现行 harness theory namespace；新增一份子理论比新建
产品 schema 或 runtime 目录更小、更真实；skill/form 是否需要独立载体留给
上述独立判断，而不是由本文件预先决定。

## 3. P 冲撞与逐项推导

这些不是把 16 条拼成固定工作流，而是说明当前有证据支持的 P 条目如何在此对象
上改变判断。P 是生成血统；普通未来 skill 激活不应回读 P 或 theory。当前没有
对抗性 actor、竞争性消费者或误导性输入的证据，因此不以 P12/P13 覆盖率作为
理论质量；只有消融后确实改变 inbox-specific 判断，才恢复它们。

| P | 在 inbox 对象上的冲撞 | 推导出的最小判断 |
|---|---|---|
| P01 实事求是 | 用户原话/实际 source 与 Agent 想象、产品标签、旧计划相冲 | 先保存 raw 和 source standing；“用户想要”不能由顺口话题替代真实表达 |
| P02 没有调查，没有发言权 | 任意输入可能只是观察、传闻、问题或候选，不能直接成为事实/承诺 | interpretation 必须标 source、覆盖与证据；缺来源就保持 unknown/clarify |
| P03 实践、认识、再实践、再认识 | 用户纠正、后续输入、执行结果会改变先前解释；一次整理不是终局 | 保留 correction/lineage；只有改变下一判断的观察才构成改进，不重复重述 |
| P04 知之为知之，不知为不知 | 流畅秘书摘要倾向填补意图、优先级、owner、时限和授权 | 显式区分 explicit/inferred/unknown；不确定时批量提出澄清或 hold |
| P05 具体问题具体分析 | 想法、观察、疑问、Todo、半计划在风险、紧迫性、来源和 owner 上不同 | 去向依具体对象/效果/媒介/用户关系决定；不设统一状态表或固定问卷 |
| P06 为学日益，为道日损 | 低摩擦入口与巨型分类/metadata/全量日志相冲 | 保留改变行动的 raw、source、unknown、return 和接受；删除无效仪式与重复字段 |
| P07 天下难事，必作于易 | 用户要快速记录，立即要求完整计划会抬高 capture 成本 | 先允许最小 capture；秘书逐步形成解释；只有真实义务才升级为 Plan/Todo，研究或实验候选也不提前冒充正式记录 |
| P08 井蛙不可语海，夏虫不可语冰 | inbox 看到的是局部语言，不能假装知道整个项目、goal 或外部世界 | 声明上下文范围和视域；跨项目/高后果关系必须回到权威 source/用户澄清 |
| P09 抓住主要矛盾 | 新输入数量、最近性、措辞强度与 active goal/mainline 可能冲突 | 从当前接受关系判断是否 load-bearing；新项默认不抢主线，只有影响 acceptance 才 retain/escalate |
| P10 为之于未有，治之于未乱 | 澄清、去重、保存 return condition 可在小成本时避免丢项和误升格 | 在 safe point、合并前、执行前暴露关键歧义；低风险项不被强制仪式化 |
| P11 治大国若烹小鲜 | 每条即时追问、全局后台队列和复杂整理由打扰/成本放大风险 | 批量澄清、低打扰 projection、最小 owner；只在效果/恢复/并发确需时升级机制 |
| P14 名不正则言不顺 | `inbox`、`todo`、`done`、`archive`、`consume` 等名字跨工具语义不同 | 先定义对象/最近邻/终态，再用名称；临时 handle 不取得 canon，用户视图与 Agent 视图回同一源 |
| P15 实践是检验真理的唯一标准 | 摘要看起来完整、状态存在、checkbox 全勾、格式通过都不能证明忠实或完成 | 用 raw fidelity、边界项、独立 review、实际去向与接受结果检验；静态理论不宣称行为成立 |
| P16 慎终如始，则无败事 | capture、解释、disposition、handoff 及其修订各时点都可能丢 provenance 或误判后续关系 | 按风险检查起点、转换、safe point、终态、消费/归档/完成和恢复；不要求每项走全流程 |

最主要的冲撞链是：P01/P02/P04 保住 source 与未知，P05/P06/P07/P11 控制
具体性、摩擦与复杂度，P09/P10 决定主线与 hold 的可见边界，P14 让对象和终态
可共同判断，P15/P16 检验行为与修订；P03 让用户修正和运行反馈改变后续解释。
P12/P13 当前没有可区分的 inbox-specific 推导，不因覆盖全序列而保留；这些
关系共同生成方法，不生成 inbox-specific 哲学条目。

## 4. 来源矛盾、未知与可证伪探针

### 4.1 可吸收的关系

- 公开 research 对 GTD 的捕获/澄清/承诺/未来可能性区分、GitHub/Linear 的
  triage、duplicate/archive/priority 差异、Beads/Taskwarrior 的 identity/claim，
  以及 OpenHands/LangGraph/Temporal 的 persistence/recovery 只支持“必须分开
  语义 owner”，不支持把任一产品当规范（`planning-inbox-open-source.md:42-73`）。
- raw preservation、explicit/inferred/unknown、destination provenance、保守
  priority/依赖、Outcome matrix 和 Markdown boundary 是可测试候选
  (`planning-inbox-open-source.md:75-86,107-120`)。
- archive 直接显示：completed Todo 可以遗漏 companion facts；received input 不等于
  reconciled baseline；stale parent 必须在 safe point 停止；record/receipt/projection
  不拥有 acceptance；这些是本理论的失败边界，不是产品模板。
- 现行 harness 明确 Task 不是 Todo、Plan 是义务而非 topology，机械证据/评审/接受
  分离，未知必须声明，硬属性归 base/runtime (`theory/harness/theory.md:59-63,95-114,116-157`)。

### 4.2 矛盾与处理

| 张力 | 来源差异 | 处置 |
|---|---|---|
| Inbox zero | GTD 倾向解释并决定去向；Linear triage 可长期保留、snooze、等信息 | 不把视觉清空当完成；采用 source/triage/terminal 条件分离 |
| Markdown | Org/Obsidian/MD Planner 可用；Beads/Taskwarrior 需要结构化 claim/history | 低风险单写者可 Markdown；出现硬属性时升级，不靠更多措辞 |
| Duplicate | GitHub/Linear 指向 canonical；Vikunja 复制；Beads graph link | 术语必须带对象、去向、provenance 和恢复语义，拒绝布尔化 |
| Archive/close/purge | 可恢复 archive 与不可逆 purge 并存 | 消费、归档、完成、删除各自命名，不统一成 clear |
| 自动后台 | skill/prompt 可描述反复检查；Loops/Temporal/GitHub Actions 才提供 wake/runtime | theory 只规定检查时方法；scheduler/worker/ledger 是未来 runtime candidate |
| 秘书解释 | 公开产品有表单、triage、评论，但无统一 LLM fidelity 标准 | theory 要求 raw+interpretation+unknown+澄清；忠实度仍需人工/独立 probe |

### 4.3 Unknown

1. 没有证据给出 LLM 忠实整理的稳定阈值，也没有证明不会把弱意图升格为
   commitment、priority、owner 或 authorization。
2. 没有统一跨 source 的 idempotency、exactly-once、cross-store transaction 或
   claim contract；当前项目也没有 canonical inbox implementation。
3. 没有证据说明一份 Markdown 在多进程/多 Agent、crash、网络分区或长期 query
   下安全；单写者边界和升级时机仍需实际 probe。
4. 没有证据说明批量澄清在所有用户/负载/风险下优于逐条提问或只保留 unknown；
   等待时间、误升格、打断成本和最终完成必须共同测量。
5. 没有定义未来 `/inbox` 的命令入口、authority 载体与边界、敏感内容 retention、goal
   source、planning/inbox.md 的 canonical ownership 或 active-goal scheduler。
6. 没有证据证明 hold 的 revisit/return/escalation 会在未来运行机会中被正确看见；
   没有新的运行机会时只能说未复查，不能声称持续检查。
7. 没有证据证明“可运行时反复检查”会被唤醒、不会漏跑、不会重复 side effect，
   或能在用户插入与进程重启后恢复同一因果身份。

### 4.4 可证伪 probes

这些 probe 只用于未来验证，不是本理论的行为声明：

1. **Raw/interpretation fidelity：** 混合想法、观察、疑问、Todo、半计划与明确
   命令；检查原话、逐项 derived interpretation、unknown、澄清问题，以及是否
   无授权产生 commitment/priority/owner。
2. **Batch clarification：** 比较逐条追问、按 decision cluster 批处理、仅记录
   unknown；测用户打断、等待、澄清轮次、误升格、遗漏和最终接受。
3. **Merge/replay：** 重放同一 capture、相似但冲突 capture、用户回答后旧版本；
   检查 all-to-one provenance、冲突可见、不会重复 canonical 或覆写 raw。
4. **Concurrent claim：** 两个 worker 读取同一 ready relation；只有 runtime 具备
   原子 claim 时才允许声称 single winner；再测 lease expiry、crash、reclaim。
5. **Insertion during handling：** 批处理期间插入、修改、合并、goal switch；
   检查 cursor/revision 不漏项、不重复、不覆盖后写入，且新 input 不自动抢主线；
   每个 hold 都有可见 reason 与 revisit/return/owner escalation 关系。
6. **Outcome matrix：** 对同一 item 分别测试 clarify、retain、snooze、duplicate、
   decline/not-planned、accept-to-plan、complete、archive、delete/purge；检查 raw、
   canonical、history、恢复和下游触发的差异。
7. **Markdown boundary：** 从单写者低风险 Markdown 开始，逐步加入第二 writer、
   claim、依赖、长 history、查询、重启和外部效果，记录何时必须升级 parser/store/
   lock/event runtime。
8. **Long-running recovery：** 在 idle、interrupt、tool failure、process restart、
   workspace change、用户新 goal 时观察 event/cursor/decision/source 是否足以继续，
   且不重复危险 effect。
9. **Priority conservatism：** 给明确和含糊的“紧急/依赖/应该”表达，检验只有
   explicit source/confirmation 才进入 priority/blocker/owner。
10. **Authority boundary：** 分别给予 explicit user instruction、既有 bounded
    delegation 和普通 suggestion，检查可逆本地整理/链接/局部 todo/有界检查能否
    低打扰执行，同时不会扩张 commitment、priority、goal、owner、scope、acceptance
    或外部不可逆效果。

静态文档、格式通过、原话字段存在或一次 Agent 成功只能是 `format-valid`/
`behavior-observed` 线索，不能宣称 `matched-improvement` 或 `regression-supported`。

## 5. 理论生产处置

采用 `theory/harness/planning-inbox.md` 作为最小 living theory 表达。它承载
上述有边界对象、authority、handoff、方法/机制边界和行为探针，不承载：

- `planning/inbox.md` 的具体文件格式、字段顺序、Markdown parser 或命令实现；
- 全局 queue、巨型 lifecycle state machine、固定字段、固定问答轮数、固定批处理
  周期、固定优先级和固定 Agent 数；
- 用户授权、Task/Plan/Goal/Run/acceptance 的第二权威；
- scheduler、wake-up、persistent identity、exactly-once、concurrent claim、lease、
  checkpoint、crash recovery、external side-effect idempotency。

理论进入 harness 子目录的理由是其主判断保持 inbox 转换与 Task/Plan/Run/evidence/
acceptance 的真实边界，同时显式说明哪些关系需要 runtime。它不进入哲学序列；
skill/form 是否形成独立载体由后续 `skill-formation`/`form-selection` 判断，
本理论不预判。普通未来 skill 也不应回读 P/theory，而应使用内化方法与任务事实源。

**处置：** theory expression = `static accept / behavior unknown`；implementation、
schema、runtime、skill/form 的后续选择均不由本理论预判，仍须实际 probe 和各自
owner 的明确接受。静态接受记录见
[`planning-inbox-theory-review-round-3.md`](planning-inbox-theory-review-round-3.md)。
