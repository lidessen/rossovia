# Planning Inbox theory review

## 结论

**结论：`revise`。**

这是对候选 living theory 的静态、来源约束审查，不是运行验证，也不证明秘书 Agent、safe point、幂等、恢复或 handoff 行为有效。候选已经形成了一个可审查的 inbox-specific 对象，但目前仍有四个 blocking 问题：对象边界把下游生命周期混进了 inbox 对象；把“来源明确/已确认”写得过于像每项都必须重新确认；safe point 只防止抢主线，尚未防止被无限搁置；P12/P13 没有显示出区别于其他 P 的 inbox-specific 判断。修正这些问题后，才可再审查是否 `accept`。

## 审查范围与来源状态

已完整阅读：`theory/philosophy.md`、`theory/gene-expression.md`、`theory/harness/theory.md`、`theory/harness/iterative-improvement.md`、`theory/research/planning-inbox-open-source.md`、`theory/research/planning-inbox-archive.md`、`theory/research/planning-inbox-synthesis.md`、`theory/harness/planning-inbox.md`，以及 `concept-articulation`、`form-selection`、`dual-audience-expression` 三份 SKILL.md。

任务所称的第二份 planning inbox research 文件 `theory/research/planning-inbox-research.md` 在工作树中不存在；本审查以现存的 open-source research 与 archive research 两条研究线代替。这个来源账本问题不改变本次静态判断，但应在后续研究索引中明确，而不应把缺失文件默认为已读。

## Blocking

### B1. 对象同一性越过了 inbox 的边界

`theory/harness/planning-inbox.md` 第 15–29 行及 synthesis §2.1 将 execution、evidence、completion、acceptance、archive/receipt lineage 都列入“同一对象必须保持的关系”。这使 inbox 条目的同一性依赖未来是否执行、是否产生证据、是否被接受，容易把文件/列表的产品生命周期伪装成理论对象。

更稳定的对象应是一个有边界的关系：

```text
source capture → secretary interpretation → disposition →
optional / explicit owner handoff with provenance
```

目的地的 obligation/Plan/goal、execution、evidence、completion、acceptance 是 handoff 后可关联的下游结果，不是每个 inbox 条目的构成部分。receipt、archive、correction、lineage 可以是对上述关系的记录和可追溯性，但不能因此让 inbox 成为全生命周期系统。

这改变了 `concept-articulation` 所要求的对象/载体/邻近对象区分，也符合 harness theory 对 Task、Plan、Run、Cell、evidence、acceptance 各自 owner 的区分。应把“缺少下游关系就不能称为同一条已处理 item”改为“缺少 source→interpretation→disposition 的可追溯关系，才不能称为该次 inbox 处理已形成可审查结果”。

### B2. 既有授权不应被写成逐条重新确认的门槛

候选第 7–8、102–111、151–153 行使用“已确认或来源明确”“真正去向 owner 赋予意义”“目标 owner 尚未确认则 hold”等表述。按最严格读法，即使用户已有明确指令，或已有 active goal/Plan 向 Agent 委派了有界权限，每条 raw item 也必须再获得一次确认。这不符合低摩擦秘书 Agent 的要求。

应明确区分 authority source 与 fresh confirmation：

- 用户明确指令，或既有委派中明定的范围、可逆性和副作用边界，可以直接授权保留 raw、加注解释、提出去重/合并、链接已有 Plan、建立可逆本地 Todo、执行有界的本地检查等；这些动作不需要对每条 item 再次打断用户。
- 同一授权不能偷偷产生新的 commitment、priority、goal、owner、外部效果，不能扩大 scope，不能越过 acceptance owner 代为接受，也不能把建议变成 canonical obligation。
- “未确认”应指缺少形成某种较强语义的 authority/evidence，而不是一律指“本轮没有再次问过用户”。

因此需要改写 owner/authority 关系：secretary 负责忠实解释和 disposition proposal；显式指令/有界 delegation 是本地可逆动作的授权来源；目的地 owner 负责 canonical obligation、主线变更和语义接受；runtime 负责真实的 claim、并发、恢复和外部效果。这个修订也保留了“review/recommendation/consume/record 不等于 authorization”的正确边界。

### B3. safe point 不能只防止抢主线，还要使 hold 可被重新看见

第 157–175 行正确规定新输入默认不自动抢 active goal，并列出 hold、supporting evidence、return condition、bring conflict、explicit switch、stop/revert 等选择。但只说“hold / later triage”仍允许 Agent 通过不断延后而永远不处理新输入；“反复检查”又不能被理解为已有后台监控。

理论应要求每个非终结的 hold/deferral 具有可观察的理由与再考虑关系，例如依赖的 owner decision、目标 safe point、显式 return condition、下一次获得运行机会时的 review eligibility 或 owner-defined escalation 条件。它不需要规定 scheduler、轮询频率或唤醒保证，也不能声称一定会被唤醒；但不得把无理由的静默搁置当作已处理。没有新的运行机会时，只能说状态未被复查，不能声称持续检查。

这会把 P09/P10 的“主线/未乱”从单向防抢占补成可观察的延期关系，同时遵守 harness theory 关于 runtime 不由文本提供 wake、cursor、恢复保证的边界。

### B4. P12/P13 目前是覆盖率式套用

synthesis 的 P 映射以及当前候选对 P12/P13 的解释是：知道 source/user intent 与 target consumer/owner constraints，并优先处理 unknown/conflict/acceptance gap 而非容易分类的项。前者已有 P02/P05、harness 的 authority/owner 关系支持；后者已有 P04/P05/P09/P14 及 iterative-improvement 的风险导向。现有材料没有证明 inbox 会出现需要 P12“知彼知己”或 P13“避实击虚”才能作出不同判断的对抗结构。

P12/P13 应从必需的血缘/方法依据中删除或降级为条件性类比：只有研究或 probe 证明存在实际的对抗 actor、竞争性消费者、误导性输入或防御性资源分配，且移除该 P 会改变 disposition/owner 判断，才保留。不能以 P01–P16 全覆盖作为 living theory 的质量标准。

当前真正改变判断的 P 关系大致是：P01/P02/P04 支持 source fidelity 与 unknown；P03/P15/P16 支持修正、证据和终态检验；P05 支持按具体 input/authority/form 判断；P06/P14 防止 schema 和命名膨胀；P07 支持低摩擦接住；P09/P10/P11 支持主线、safe point 与中断成本；P08 约束视角边界。P12/P13 在没有额外 evidence 前不应继续占据同等地位。

## Non-blocking

### N1. raw / explicit / inferred / unknown 的语义区分是对的，但不要变成字段合同

第 21–34、63–87 行和 research 对 raw-first、弱意图不升级、解释与 unknown 分离、合并保留 lineage 的要求是合适的，尤其是“应该/紧急/以后做/顺便”等弱词不自动证明 commitment、priority、blocker、owner 或 authorization。

需要微调的是表达：理论应要求当一个判断影响 handoff、authority 或风险时，其 evidence status 可被恢复和审查；不应要求所有实现都以 `raw`、`explicit`、`inferred`、`unknown` 固定字段表示。合并是建议或解释关系，只有真实同一性和目标 owner 接受后才可形成 canonical 合并对象；lineage 不应被 schema 化为唯一布局。

### N2. consume、clear、archive、complete、acceptance 已有良好区分

第 121–134 行是候选的强项：consume 是本次输入被读取/处理的事件；clear 是从当前 inbox 视图移除；archive 是保留历史；complete 需要终端证据；acceptance 是 owner 对语义结果的接受；delete 另有不可逆效果。应继续避免用“inbox zero”或 checkbox 代替完成/接受。这里无需新增 P 或 runtime 语义。

### N3. Markdown 与 runtime 边界准确，但需保留“单写者只是条件性形式”

第 179–201 行准确地把 identity、lifecycle、permissions、atomicity、concurrency、recovery、persistent evidence、scheduler、external effects、exactly-once/idempotency 归给 runtime；没有假后台或文本保证。低风险、单写者 Markdown 作为 raw source 是条件性选择，不是系统保证。后续 form/skill 仍应由真实 audience、owner、lifecycle 和 external contract 选择，不能由本 theory 预定 schema、命令或 skill。

### N4. 放在 `theory/harness/` 基本合理，但 owner 文字还可收窄

Inbox 候选讨论的是 task engineering 中 source、authority、handoff、effect boundary、evidence 和 acceptance 的关系，放在 harness 子理论比放在应用文件格式或个人 Todo 产品目录更合适。它不应因此取得 source/goal/Plan 的独立 authority；这些仍由 parent harness 的 Principal/delegated owner、destination owner、orchestrator/effect mechanism 分别承担。可在候选中明确这是 harness-facing relation，而不是一个由 harness 单独拥有的数据库实体。

### N5. form/skill 的后续选择被正确留空

候选已声明自己不是 file spec、command、skill 或 runtime，也没有固定字段；这符合 `form-selection` 与 `dual-audience-expression` 的边界。若未来确有 Agent 与人类视图的独立漂移风险，再决定是否需要双受众派生视图；目前不能因“秘书 Agent”这一受众就预先新增 skill 或把解释投影当成权威。

### N6. 研究文件名缺失是证据账本问题，不是本理论的对象性反证

现存 open-source research 和 archive research 已覆盖 GTD capture/clarify、GitHub/Linear intake、成熟开源系统的 claim/dependency/history/recovery、Markdown 工具和秘书式 raw/interpretation/ambiguity 分层。缺失的 `planning-inbox-research.md` 仍应在后续维护中修复索引或说明，不应在本 review 中伪造读取记录。

## 建议的最小修订方向

不直接改候选文件；以下是复审时应检查的 semantic delta：

1. 将 inbox 对象收窄为 source capture、secretary interpretation、disposition、可选/显式 handoff 与 provenance；把 execution/evidence/completion/acceptance/archive 作为关联结果或记录，不作为对象同一性的必要组成。
2. 加入 authority matrix：explicit user instruction、bounded delegation、mere suggestion 三者分别能做什么；明确有界可逆本地动作不要求 fresh confirmation，外部不可逆效果、主线切换、承诺/优先级/接受仍需相应 owner/authority。
3. 为 hold/deferral 增加 reason、revisit condition 或 owner-defined visibility/escalation 关系；同时声明没有 runtime wake/run opportunity 时不提供持续检查保证。
4. 移除或降级 P12/P13；只有出现具体对抗证据且消融后改变判断时才恢复。不要以 P 覆盖率验收。
5. 将 raw/interpretation/unknown 的要求写成可审查语义，而不是隐含字段/schema 要求。

## 后续 probes 与复审验收

静态理论通过后仍须由独立运行验证回答以下问题，不能在本文件中预先宣称有效：

- raw、语气、弱意图和未知是否在批量整理后仍可恢复；一条 raw 多种解释、多个 raw 合并、冲突修正是否保留 lineage。
- 显式指令、有界 delegation、普通建议分别能否执行可逆本地动作；是否会偷渡 commitment、priority、owner、goal、外部效果或 acceptance。
- active goal 插入、safe point、hold 后重新可见、return condition 和显式 mainline switch 是否产生正确的 owner 路由；没有后台运行时是否诚实报告未检查。
- 消融 P12/P13 后是否真的改变任何 inbox-specific disposition；若不改变，应保持降级。
- consume/clear/archive/complete/acceptance 的 receipt 与终态是否不会互相冒充。
- 单写者 Markdown、第二写者、重放、并发、崩溃恢复、外部副作用出现时，是否正确升级到 runtime 而不是靠 prompt/Markdown 声称保证。

在这些 probe 之前，本候选的正确状态是 `revise / behavior unknown`，不是 `accept`。
