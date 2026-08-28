# Planning Item Ledger

状态：active planning ledger

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

当前 goal 描述的项目侧投影见 [`planning/records/main-goal-description-reconciliation.md`](records/main-goal-description-reconciliation.md)；
该投影补充复杂度自适应准备、工具创造/打磨、harness 可靠性收敛、sub-agent 有界委派、Plan/Todo work map、
默认自主纠偏和 research settlement/application 闭环，
不改变当前阶段顺序、item standing 或实现冻结。

用途：把 `planning/plan.md`、`planning/roadmap.md` 及其关联的 theory、design、research、
evals、experiments 和 incubating skills 中的 planning item 投影成可回读的对象，判断哪些
现在可以形成 bounded contribution，哪些只能等待前置决定。

本 ledger 不是第二份 roadmap，也不是实现任务队列。它记录当前 standing、依赖、可推进部分、
出口和回返条件；具体内容仍由各自的 canonical source 拥有。

## 当前读取规则（authority map）

为避免把同一条关系在多个 dated projection 中重复当成当前状态，按以下顺序读取：

1. **当前 item standing：** 以本文件的“总览”和“顶层 item contract projection”为跨 item 当前索引；
   其中明确写出的 `unknown`、`pending`、`not-authorized` 不由其他投影段落的措辞覆盖。
2. **具体证据与 source applicability：** 以对应 child/review record 的当前 header、source fingerprint、
   evidence standing 和 independent review 为准；本 ledger 只引用其结论，不复制完整证据。
3. **方向与顺序：** `roadmap.md` 只拥有长期方向，`plan.md` 只拥有 pre-implementation 顺序；它们不再
   各自承载每一轮 child 的完整状态表。
4. **阶段与工作量：** `phase-1-exit-review.md` 只拥有 phase exit 判断，`whole-planning-work-estimate.md`
   只拥有工作图/估计边界，`item-loop-coverage-audit.md` 只拥有闭环覆盖审计；这些文件的 dated sections
   是 lineage/projection history，不是第二个当前状态源。
5. **冲突处理：** 若 dated history 与当前索引冲突，保留 history，当前读取回到本 ledger、对应 canonical
   source 和 child record；不能用“最后出现的段落”自动解决冲突，无法判定时保持 `unknown`。

### 状态表达规则

`status` 只表示当前对象的生命周期；`standing`、`evidence`、`disposition`、`execution` 和
`authorization` 等各自独立的关系不能拼成一个斜杠值。开放的描述和检索信息使用 `label`，已完成的 review、
reconciliation 和 preparation 使用带来源的事件/lineage。当前入口可以把这些属性并排展示，但这个组合只是
派生 projection，不是新的 enum 或状态机；历史记录中的旧组合状态只作为历史快照，不覆盖当前字段。

### 当前快照（2026-08-26）

| area | lifecycle | current standing | evidence / current application | next permitted move |
| --- | --- | --- | --- | --- |
| archive migration | current | waiting for named consumer | `archive/skills` 29 项已对账；其余 47 项为 evaluation/legacy/package fixture；`.agents/skills/` 11 个，portable `skills/` 0 个；artifact-organization 已有 no-proposal/route-to-design 处置 | 只有 named consumer、重复 gap、decision-changing counterexample 或 portable acceptance 出现时，才单项重开；不泛化扫描、批量 move 或新建 carrier |
| design/development methods | current | retain incubation | 一张 card 已应用但没有 matched method effect；`controlled-experiment-design` 已形成 canonical proposal；`practice-cycle`、`work-estimation`、`mechanism-design-review` 仍是 project-local candidates，portable acceptance 未成立 | 等真实 consumer、任务族/precision、guardrail 和可重建 runner/evidence；不制造 fake Run |
| WorkCell | candidate | user consumer named; design review awaiting user | 用户已明确 WorkCell 的真实 consumer 是 harness 测试、delegation、主/子模型及 provider/channel 对照；A/B/C/D、identity、CompletionAction、contract-field 的 current-source child 已窄读并独立复核；15 个 acceptance dimensions 已聚合为 5 个内部 decision bundles；canonical shape、policy、retention/correction 和 protocol acceptance 仍 unknown；experimental-slice plan 已形成，明确 adapter/provider 基于 core API，不进入 core；design rehearsal 已完成并经独立 reviewer 接受为 bounded design-use | 等 user review 的具体 decision delta；review 前只允许 source/反例/设计文字和规划校验，不实现 core、deterministic executor、adapter/provider 或 Run；review 后再判断 minimum-contract-freeze，不把 slice 写成 canonical protocol acceptance、DeepSeek system 或 provider 结论 |
| Agent harness throughput | settled | owner-gated hold | trace schema 和 independent review 已形成；静态 trace 只观察到 pair barrier、sidecar 分组和 footprint；没有 latency/performance conclusion | 等 named eval/runner、冻结 card/identity、schema/clock 和 telemetry permission；前置成立后先做 loading branch，再决定 topology/failure probe；无回返则 no-proposal/archive |
| JitRL research candidate | settled | applicability reconciled | 论文原文与公开仓库已窄读；仍是外部研究输入，无 project Run/evidence | 只有真实 memory/experience consumer 或 system comparison 出现时，才建立 bounded experiment；不改 WorkCell/throughput/DeepSeek |
| long-horizon forgetting experiment | active | design candidate | problem-first card、变量/estimand、task continuity relation 的 provisional boundary、action probe 和 trial-input contract 已形成；Run 未授权 | 等 named owner/runner/evidence/reviewer、任务族/holdout、variance/effect 和 guardrail 输入；缺任一关系就 hold/no-proposal，不启动 Run |
| FOREAGENT research candidate | settled | applicability reconciled | ACL PDF/附录与官方仓库 README 已核对；无本地复现，不是本项目 evidence | 只有真实 candidate-search consumer 或 throughput comparison 出现时，才建立 system/eval object；先对账预测、报告、执行和回退成本 |
| Agent initiative research candidate | settled | owner-gated hold | 研究对象已收窄为 `goal-linked bounded initiative`，并形成 `goal-linked action loop` proposal；无 system consumer/Run | 等真实“等待会拖慢、主动做错有代价”的 consumer、named owner 和可比较 baseline/treatment；无回返则 archive/no-proposal |
| Research settlement and closure | settled | canonical proposal | frontmatter、settlement route、inventory 结算和 application-handoff boundary 已在 planning maintenance 中观察 | 新 active surface growth、维护负担反例或 decision-changing evidence 出现时，另开 bounded maintenance round；不建 scheduler/registry/runtime gate |
| Main agent project work method | settled | canonical proposal | planning dogfood 已观察，但没有 direct matched effect；proposal 已交给 planning method surface | 下一条 project-scale wave 冻结 direct-vs-delegated comparison，记录 coordination cost、decision delta、unknown 保真和 review；不建总控 Agent/registry/runtime |
| Harness problem complexity and tool readiness | settled | canonical proposal | 已在 planning wave 观察问题 profile、工具复用和 direct/sequential 选择如何改变 settlement；attribution 仍 unknown | 等第二独立 consumer、tool-boundary counterexample 或可比较成本/收益；否则不建新 skill/scheduler/registry/Run |
| Harness engineering control and reliability | settled | canonical proposal | 已形成反馈、扰动、观测、稳定性和作用能力边界；source/application evidence 仍有限 | 等 primary-text access、真实重复失败/扰动 consumer 或改变映射的反例；不创建 controller/runtime hard guarantee |
| DeepSeek Harness work system | candidate | prerequisite pending | 只保留对象、边界和系统设计问题；依赖 WorkCell design acceptance | WorkCell design/acceptance 成立后再形成 system design；当前不实现 |
| implementation/base | not-authorized | design gate not met | 没有 accepted WorkCell + work-system design 或 implementation authorization | 保持冻结，待两层设计和接受关系成立后另建 implementation plan |

P01–P16 的父关系 coverage 当前以 [`coverage-audit.md`](index/coverage-audit.md) 的 reconciliation 为准：
16 个 candidate 的 `最近邻` 声明去重后有 55 对，已有专门 parent/boundary fixture 覆盖 17 对，38 对
尚无专门 fixture，其中 P03/P15/P16 已由 Pair D 与 P15-U1 交叉承载。这不是 38 个待办；只有具体
对象上的 decision delta 且现有证据无法承载时才开最小 parent fixture，否则保持 `no-proposal-now`。
该 coverage observation 不改变 16 个 reading 的
`candidate / acceptance-pending / owner-gated`、phase-complete、WorkCell 或实现 standing。

### 当前执行面（本轮只读这里做路由；同一时间只开一条命名的 bounded wave）

下面是从当前快照和 contract projection 得出的最小路由，不是新的 item 表，也不覆盖各 canonical
source。若某项没有新的 source、consumer、owner、decision-changing counterexample 或可回读 evidence，
就不要为了“保持 active”再创建 planning 文件。

这里的“执行面”还要区分三层：总览中的 `active-now` 只表示该 item 有资格成为下一条 bounded
wave；它不表示该 item 正在运行。全局 planning 可以保持 active，但某个 item 仍然可以
`wait-for-owner`；局部等待不再自动冻结其它有独立边界的 item。最近由用户范围纠正触发的
`scope-reconciliation` wave 与 [`research-settlement-wave-2026-08-26.md`](records/research-settlement-wave-2026-08-26.md)
已在本 checkpoint 收口；本轮 `long-horizon-continuity-design-readiness-preparation` 与随后
`research-surface-settlement-reconciliation` 均已按 direct、内部顺序完成并关闭：前者只更新既有 long-horizon
record，后者只回写已有 research record 的 settlement destination、reopen 条件和 current projection，
没有执行 Run。当前没有已打开的 wave，也没有已打开的 sibling wave，等待下一条 bounded wave 选择。已结算
record 只保留 lineage，不自动继续运行；下一波仍只修正整体路由、结算和选择，不打开新的 WorkCell/DeepSeek
设计层或实现。

| 路由 | 当前范围 | 下一步允许效果 |
| --- | --- | --- |
| 继续推进 | planning authority/history 分层；已有 evidence 的 standing 纠偏；已有 bounded reading/design review 的最小回返 | 修正当前索引或已有 child record；必要时做窄 source/applicability review，不创建 synthetic Run |
| 等待真实关系 | WorkCell owner-backed decision；`practice-cycle`/`work-estimation` 的 named runner/consumer；P15 reading/use-case acceptance；主观能动性研究的 system-layer consumer/owner | 只有重大方向、权限、共享基线、不可逆效果或关键安全行动需要 owner 选择时，才做 bounded owner-decision preparation；普通局部缺口先自主推进并事后纠偏；不由 Main 代填 owner、acceptance 或 protocol 字段；研究没有 consumer 前不启动 Run 或新机制 |
| 明确停止/不提案 | DeepSeek 工作系统、WorkCell/base/runtime 实现、用户 harness 构想 Run、`planning-inbox-round-1` 失效预注册、PL-11 未具名执行分支 | 保留来源、失败/未知和 revisit；不重跑、不迁移、不实现 |

## 整体性回顾 checkpoint（2026-08-26）

status：`closed`
standing：`reconciled`
execution：`no-open-wave`
authorization：`implementation-not-authorized`

以下回读结果与 dated record 保留本轮完成的具体工作、证据上限和回返条件；它们不是新的状态机，也不是新
item、阶段转换、实现授权或新的执行队列。

### 回读结果

- **authority 没有需要改写的根本冲突：** README.md 负责入口，item-ledger.md 负责跨 item
  当前 standing，roadmap.md 负责方向，plan.md 负责顺序，phase-1-exit-review.md 负责
  phase 判断，whole-planning-work-estimate.md 负责最小工作图；dated projection 不覆盖这些
  authority。
- **路径和信息层已完成两轮 bounded transition：** 当前 `planning/` 根级只保留 7 个稳定入口/
  authority 文件；`planning/index/` 保存 8 个 working view 和一个入口；81 个 dated/bounded record
  位于 `planning/records/`，另有该目录的 README；当前共 98 个 planning Markdown 文件。两轮只改变
  文件路径、相对链接、读取入口和层次提示，不改变任何 item 的 standing、owner、依赖、acceptance 或
  WorkCell/DeepSeek/base/runtime 实现冻结；index 与 records 仍由根级 authority 和 item ledger 通过链接
  读取，不形成第二份总表。
- **历史量仍大但主视图已收敛：** 89 个文件、16,396 行是路径 transition 前的历史测量；当前
  `planning/` 有 98 个 Markdown 文件（含 `index/` 与 `records/` 的入口和保留的 dated/bounded lineage）。
  新增数量主要来自保留原始记录与显式入口，不代表把同一 authority 复制成多份；默认
  读取仍只走根级入口、item ledger、被选 canonical source 和必要 record。仅 plan.md、roadmap.md、本
  ledger 就有 30、35、91 个 dated sections；这些段落继续默认折叠，后续只在当前 authority 或已知结构
  缺口上做整理，不以删除历史换取假性精简。
- **信息层与 Todo reminder 已形成设计候选：** `README` 负责 orientation，item ledger 负责 current
  authority，roadmap/plan/phase exit 负责 direction/commitment，inbox/history 负责 intake/lineage，
  `index/` 负责 working views，`records/` 负责 process evidence；它们不是六份平行 authority。当前
  bounded wave 的 Todo 可携带 action-local `reminder`、`source`、`return`，但仍须在执行前读取、执行后
  回写，不能由字段名宣称可靠，也不创建全局 todo queue、scheduler 或 memory registry；理论、来源和未知
  见 [`planning-information-architecture.md`](../theory/research/planning-information-architecture.md)。
- **layout 采用后的首轮 Main dogfood 已完成：** 使用当前 source snapshot 恢复 WorkCell standing、skills
  placement/migration 和下一步路由三个真实 planning 问题；本次未观察到 broken link、current authority
  误读或 index/validator 被误读成 acceptance/queue/实现授权。该结果只支持 `main-dogfood-observed /
  adoption-unknown`：Main 熟悉当前目录，不能单独宣称 layout adoption 或 discovery cost 改善。随后完成
  同一 worktree、同一模型和同一组 card 的 treatment/baseline 只读 probe；treatment 报告 planning 首读
  5 个文件，baseline 报告 9 个文件，两者答案和 authority 选择均正确，方向性支持读取契约减少首轮展开，
  但没有 token、时间、质量或长期 adoption 证据，仍不得写成 `matched-improvement`。
- **Todo reminder pilot 的重新结算：** 两条 lane 都完成了即时 planning 判断，treatment 读取了 reminder，
  但 primary 都是 3/3，且没有延迟、distractor、interruption/resume、context pressure 或 held-out next
  action；因此它只能结算为 `settled / archive-inconclusive` 的 carrier/readability diagnostic，对“长时间
  执行 Agent 遗忘”没有证据。不能继续用同一 card 追加 reminder round；新的主实验设计见
  [`long-horizon-agent-forgetting-design.md`](records/long-horizon-agent-forgetting-design.md)。
- **长时间执行遗忘主问题已重新锚定：** 新 card 先定义 storage/retrieval/use/revision/goal-progress/resume
  的功能性遗忘，再比较连续性机制与 baseline 的 checkpoint next-action correctness；provider、WorkCell
  和 runtime 不是该 card 的隐含变量。当前只形成 `design-candidate / run-not-authorized`，没有 long-horizon
  behavior、matched improvement 或 adoption 证据。
- **问题优先设计方法已在长时遗忘 card 上完成一次真实映射：** 将 `task continuity relation`、task-level
  primary outcome、六类 mechanism/mediator、confounder/nuisance、guardrail、identity 和 target context
  分开，并形成 provisional `Δ continuity` estimand 与任务级配对/任务族内随机分配形状。映射已形成
  `task continuity relation` 的 provisional semantic boundary；任务级分配、checkpoint 嵌套、独立重复和污染
  控制的结构已经形成设计候选。当前三个 decision-changing unknown 收窄为 candidate implementation 的最小
  实例化、任务族覆盖/数值重复与精度方案和 guardrail 接受范围，另保留概念 action probe/正式 designation
  unknown。因此只支持 `problem-first-card-applied / variable-boundary-formed / concept-boundary-formed-provisional /
  allocation-boundary-formed`，不支持 Run、matched effect、skill acceptance 或实现授权。
- **连续性机制边界已进一步分层：** `task continuity relation` 是当前主实验要冻结的 semantic target，不是
  memory、resume、record 或 runtime mechanism；实际 treatment 仍需选择一个能实例化该关系的 candidate
  implementation。active session 优先复用既有 work map/focus anchor，chat history、real-time memory、
  notification、Todo 和 `no compact` 只是载体/策略，不能单独证明解决遗忘；跨重启、崩溃或不可信 caller
  的硬保证才 route 到 base/runtime mechanism review。当前没有新增 WorkCell 字段、memory registry、
  scheduler、provider 选择或实现授权。
- **Research settlement 的生命周期观察：** 当前 `theory/research/` 已统一加上可检索 frontmatter；`status`
  只表示 `active / settled / archived` 的粗粒度生命周期，`disposition`、`settlement_route`、owner、consumer
  和 `review_at` 分开表达去向与回返。这样不会把历史 review 继续算作 active research，也不会把有未知但有真实
  下一动作的 candidate 误写成 accepted。新的 closure research 提出：`research-open` 只能是临时工作状态，
  每个 active item 必须进入 bounded trial、canonical proposal、owner-gated hold 或有理由的 archive；本轮
  已完成五项 inventory record 的结算，并把 closure rule 自身转为 `settled / canonical-proposal`，未删除或
  正式接受任何 candidate。
- **Current standing 对账：** 整体回顾发现四份已结算 research 的正文开头仍保留旧的 `research-candidate`、
  `inventory-pending`、`acceptance-pending` 或 `Disposition: open` 表述，另有一份旧 inventory 表和 wave
  snapshot 把历史阶段写得像当前 route，容易覆盖 frontmatter 的当前检索结果。已只修正正文 current projection
  和历史快照标注，并保留 dated history；`settled / canonical-proposal` 仍不等于 formal acceptance，不改变
  任何 candidate、owner、phase 或实现边界。
- **WorkCell canonical consistency audit：** 直接回读 `design/work-cell-protocol.md` 的当前主体、命名表、迁移表、
  lifecycle、parent relation、failure/observation、provider boundary 和 §16–§18。结果是 `CellInput` 及
  `Session`/`Attempt`/`Trace`/`Verification` 等旧名只出现在明确的 legacy、最近邻或迁移说明中；当前 core
  仍使用 `Spec → Binding → RunRequest → Run → RunRecord`，parent 只保留 `retry-of`/`continued-from`，
  `status` 只在局部 check/review shape 使用，Task/WorkItem/CellBatch 等仍在上游或 system-layer。未发现会改变
  当前协议理解的命名或生命周期冲突，因此 `no-proposal / retain-current-boundary`，不修改 canonical design。
- **问题优先的实现设计方法已形成研究投影：** 参考工业 DOE、NASA 系统工程、临床试验报告、SRE、云性能
  评估和真实项目实施研究，将现有受控实验候选扩展为 `Problem → Context → Mechanism → Variables →
  Estimand → Design → Implement → TEVV → Disposition` 的共同顺序，并明确变量只能在影响 treatment、
  outcome、归因、完整性或安全时保留；其余必须有理由地控制、测量或忽略。该方法与
  `mechanism-design-review`、`practice-cycle` 保持 owner 分离，当前仅为 `source-backed /
  method-boundary-formed / applicability-open`，没有 matched method effect、skill acceptance 或实现授权。
  下一回返是在真实 WorkCell design 或 long-horizon continuity card 中复用一次 design card，检查它是否改变
  问题定位、变量取舍和实验决策；没有 consumer 或 decision delta 就 `no-proposal`，不新增 sibling skill。
- **Main agent project-work method 的接入：** 用户新增的项目级工作方法输入已形成
  [`main-agent-project-work-method.md`](../theory/research/main-agent-project-work-method.md) candidate；它把
  Main 的整体/authority/fan-in/settlement 责任与 sub-agent 的 bounded contribution 分开，把本项目哲学、
  theory、skills 和最新 research 作为需做 applicability judgment 的输入。用户的重要性和优先级表达保留在
  source/ledger projection，但没有转成正式 project priority；本轮 settlement wave 已产生 bounded
  planning-dogfood observation，但没有 direct baseline 或 project-scale matched Run，不先制造新的总控机制。
- **执行状态需要与候选资格分开：** 总览中的多个 `active-now` 是可选入口，不是并行队列；本轮
  `research-settlement-wave-2026-08-26` 已结算，其余 item 处于 `awaiting-wave-selection` 或等待 owner
  return。这是局部执行状态，不是整个 planning goal 的全局 blocked。
- **当前分支被过度泛化为 active：** A/B/F 的多个节点仍可在条件满足时推进，但不少实际分支
  已经是 owner-return、done-for-now 或 no-proposal-now；WorkCell 窄边界回返已收敛到
  owner-backed decision / decision-changing counterexample，不应继续按字段逐项扩张。
- **吞吐问题已有证据入口但没有性能结论：** 本地 round-3 记录了 10 个 arm 和
  166211 input / 68608 cached / 13329 output / 6240 reasoning tokens，却没有完整 wall-clock、
  queue、child wait、handoff 或 review latency；因此只能把重复 context、批次屏障和串行 owner
  等待列为待验证假设，不能直接把“更多 Agent”写成优化。最新 static trace 只确认 item 内
  old/new pair barrier，并观察到 A 与 B–E 的 sidecar 分组创建；其余调度和耗时仍是 unknown，
  详见 [吞吐研究回返](../theory/research/agent-harness-throughput-research.md)。

### 本轮整理决定

1. 现有 dated record 不删除、不整体改写；当前读取统一回到本节、各 item canonical source 和
   child record。以后只修当前 authority，不在每次回返时把同一 standing 复制到所有 projection。
2. 当前 WorkCell field/boundary review wave 暂停在 route-to-owner；没有 named owner、真实
   consumer 或改变 contract 的反例时，不再开新的窄 review。
3. .agents/skills/ 继续是 incubation；不因为并行问题创建“并行调度 skill”，也不因为文件
   数量补建 portable skills/。
4. 用户提出的 harness 吞吐研究已收敛为一份单一的 research/design candidate：
   [agent-harness-throughput-research.md](../theory/research/agent-harness-throughput-research.md)。
   它把 claim/source/gap matrix、拓扑、skill/context、观测指标和 probe 边界放在一起；本轮又形成了
   最小 trace baseline schema，并由独立 reviewer 接受其 design-only 边界；仍不是 runtime、WorkCell
   变更或实现授权。
5. 每个波次结束后必须回到本 checkpoint 规则：先合并、收束、等待或关闭，再开新的 sibling
   branch。没有 decision delta 的重复 self-application 不再产生 planning 文件。
6. 本轮 B1 的 P01/P03 projection reconciliation 已把既有 Pair A–D fixture、fixture review 和 P02/P04/P15/P16
   revisit 接回 current source；不再重复生成同一 fixture。只有新的 source、最近邻、consumer 或
   acceptance decision delta 出现时，才在对应 package reopen。
7. 独立 consistency audit 发现 throughput 总览落后于 contract projection；现已统一为
   `trace-schema-formed / independent-review-complete / design-only / owner-gated`，并把 independent
   review 明确列为固定 trace baseline 的执行前置。旧的 `trace-gap-narrowed` 只保留在 dated static-trace
   history，不再作为 current standing；不新增 trace schema、Run 或 runtime。
8. 本轮 current-standing 对账发现 frontmatter 与四份已结算 research 正文开头存在明确时间层级冲突：
   `research-settlement-and-closure`、`provisional-adoption`、`planning-information-architecture` 和
   `philosophy-gene-one` 的旧 current wording 可能把已结算 proposal 读成仍 open/pending。已修正四份
   canonical record 的当前投影，保留 dated history；不批量重写其它历史文本，不把 proposal 升级为 acceptance，
   不改变 WorkCell/DeepSeek/base/runtime 冻结。
8. 本轮 current-source reconciliation 又确认 WorkCell v1 parent relation 已收窄为
   `retry-of` / `continued-from`，`derived-from` 不再属于当前 core union；generic Task/WorkItem derivation
   留在上游。该项只改变 source-boundary projection，不代表 parent retention、lineage recovery、protocol
   acceptance 或实现已经成立；没有新的 consumer/owner/反例时不再扩展 relation union；canonical source/source
   identity、相关 applicability review、acceptance/decision 或 evidence standing 变化时重新回读。
9. 本轮整体回顾又发现：canonical source 在 child review 之后发生 revision 时，旧 child 的独立 `ACCEPT`
   只能保留为 previous-source provenance；受影响 child 必须降为
   `source-revision-observed / current-source-narrow-read-pending / acceptance-pending`，并先修正
   现有 child、readiness、plan、roadmap 与 ledger 的 current projection，再决定是否需要新的 review。
   没有完成 source identity 与 changed-section 窄回读前，不得把旧 applicability 计为 current complete，
   也不得继续堆 sibling artifact。
10. `active-now` 不再承担“正在执行”的含义；只有当前执行面明确选中的一条 bounded wave 才算打开。
    波次结束后先回到本 checkpoint，执行 `merge / done-for-now / wait / no-proposal` 之一，再决定是否
    选择下一条入口。
11. JitRL research candidate 已完成一次 source-read 与 applicability reconciliation；该更新关闭现有
    阅读候选的当前窄分支，不打开 sibling wave，也不改变 WorkCell、throughput、DeepSeek 或实现的
    standing。
12. 本轮对 WorkCell source identity 做了整体核对：旧 `4293057d… / 26ec714f…`、
    `2ed713fe… / f87422b…` 与 `7240b23… / 513e7ed…` 只出现在明确标注的 historical/review-time
    provenance、previous-source record 或 reconciliation 中；当前 projection 统一回指
    `fa602faf… / c78876b4…`。未发现仍把旧 fingerprint 当作 current source 的有效读取入口，因而
    不新增 review、不重跑 applicability，也不改写历史 lineage。
13. 本轮 authority audit 发现 `roadmap.md` 的非 dated 主体重复承载了 P01–P16、skills、evidence
    和 WorkCell 的 current projection；已将这些重复摘要收回 item ledger/child record，roadmap 现在只保留
    长期方向、阶段顺序、WorkCell 设计候选和 inbox 候选，历史 dated projection 继续保留为 lineage。
    这只降低读取和维护成本，不改变任何 item standing、owner、phase、acceptance 或实现冻结。
14. 本轮继续回读发现 `plan.md` 顶部的 archive 路径规则仍把 archive presence 误写成“尚未迁入”，
    `已完成` 列表也落后于当前 reading artifacts；已直接修正为与 `AGENTS.md` 一致的
    source/consumer/boundary/move disposition 规则，并保留 P12/P13 下游 no-proposal、P16 下游
    hold 的 standing；本轮进一步发现 P12/P13/P16 的 source-bound reading package 也需要进入当前投影。
    这只是 current authority correction，不是批量迁移、reading acceptance 或阶段转换。
15. 本轮候选集中处理已建立 [`candidate-consolidation.md`](index/candidate-consolidation.md)：它集中对象类型、
    canonical owner、standing、consumer、处置和回返，不把 reading、theory、design、research、experiment
    与 skill carrier 合并成一个生命周期；未采纳的哲学 draft 也继续保持 draft，不进入当前 source。
16. “Agent 主观能动性”已作为 system-layer research candidate 接入当前快照和 roadmap；它先研究主动发现、
    有界推进、反馈和纠偏的可观察关系，不取得理论、skill、scheduler、memory registry、runtime 或 WorkCell
    语义。没有真实 consumer、owner 和可比较 baseline/treatment 前，不启动 Run。
17. WorkCell readiness 在不改变 canonical protocol 的前提下，将 15 个 acceptance dimensions 聚合为 5 个
    owner-decision bundles，便于一次恢复语义/授权、事实/记录、生命周期/lineage、替换/系统边界、评审/接受/阶段出口；
    该 package 仍是 `decision-preparation-observed / acceptance-pending`，不替 owner 接受，也不产生 phase transition 或实现授权。
18. 本轮对主观能动性研究使用 `concept-articulation` 做了窄概念回返：研究对象暂定为
    `goal-linked bounded initiative`，以“来源支持的缺口 → 候选或合格停止 → 有界行动 → 可观察后果 →
    继续/纠偏/owner package → 下一判断”区分 autonomy、proactivity、persistence、planning 和心理动机
    状态。该回返只改变 research candidate 的可观察边界与后续比较顺序，不把它写成 theory、skill、
    WorkCell 字段或 runtime mechanism；真实 consumer、owner、baseline/treatment 和 Run identity 仍未知。
19. 本轮对 WorkCell canonical design 做了 current-body 一致性回读：确认旧名、外层调度对象、局部 status、
    public Run/RunRecord 边界和 `retry-of`/`continued-from` 没有互相回流。该审查结论为
    `no-proposal / retain-current-boundary`；不新增字段、命名表、registry、review record、provider comparison
    或实现授权。后续只有新 source、最近邻误判、真实 consumer 或 decision-changing counterexample 出现时才 reopen。
21. 本轮对主观能动性研究做了一次一手来源 evidence follow-up：PROBE 将主动解决拆为机会发现、瓶颈
    定位和解决执行；Proactive Agent 显式保留 accept/reject；SWE-agent 说明行动 affordance 会改变
    Agent 的可执行性；Magentic-One 和 The AI Scientist 分别支持统筹恢复与候选—执行—评价闭环，但
    都不能直接证明本 harness 的长期净收益。由此把 activation/wake、situation grounding、initiative
    judgment、bounded affordance、feedback/coordination 分开，并要求未来对照保持相同唤醒预算；该回返
    只改变研究分解和 probe 顺序，不取得新机制、Run、skill 或 runtime 授权。
19. 本轮发现项目入口关于 planned readings 的旧投影与当前 living-tree 约定冲突：P12/P13/P16 过去的
    no-proposal/hold 被误写成 reading artifact 不应存在。已从三条未改动的 source line 建立
    `theory/philosophy/P12.md`、`P13.md`、`P16.md` 三个 source-bound reading candidate，并把
    `coverage-audit.md`、`plan.md`、`phase-1-exit-review.md`、`records/document-migration-status-reconciliation.md`、
    `theory-structure.md` 与本 ledger 的当前 projection 对齐。三份 candidate 均 `review-pending /
    acceptance-pending`；P12/P13 下游 strategy 仍 no-proposal，P16 下游 adoption/time-window 实践仍
    hold。该修正只更新 artifact standing、当前 projection 与历史 lineage，不改 source、不取得 reading
    acceptance、phase completion、WorkCell/DeepSeek、skill、runtime 或实现授权。
20. 本轮将 P12/P13 与 P16 分到独立只读 review lane；review 发现了固定信息清单、将“实/虚”过度
    操作化、默认全套时点以及 reading 越过 owner/effect 边界等问题。Main 已按来源做最小修订，并
    新建 [`records/philosophy-p12-p13-p16-reading-review.md`](records/philosophy-p12-p13-p16-reading-review.md) 留下
    findings、revision 和证据上限。三份 candidate 进入 `conditional-revision-applied /
    follow-up-clean / acceptance-pending`；这不改变下游 no-proposal/hold、phase、WorkCell、
    DeepSeek 或实现冻结。
22. 本轮继续处理“如何激发主观能动性”这一 harness 研究问题：在已有 activation/wake、情境恢复、
    有界 affordance 和反馈/统筹拆分上，新增 `goal-linked action loop` 作为研究层机制综合；它强调
    选择与后果的可归因联系、真实 consumer 结果和合格停止，区分“方法选择空间”与“效果权限”。新增
    的 Autonomy/Agency、开发者监督和 Proactive Agent 证据支持这组候选关系及其反例，但不构成本项目
    的 consumer、owner、Run 或 acceptance evidence；因此不改 WorkCell、不创建 initiative skill、
    scheduler、memory registry 或 runtime，也不解除 DeepSeek 的前置条件。
23. 本轮对 P01–P16 candidate 的 `最近邻` 关系做了 source-bound coverage reconciliation：16 个
    candidate 去重后有 55 对关系，现有专门 parent/boundary fixture 覆盖 17 对，另有 38 对尚无
    专门 fixture，其中部分已有其他 bounded record 交叉承载。这把“父 item cross-relation 未完成”
    从模糊缺口收敛为可回读的 coverage observation；38 对不自动展开为 38 个任务，只有具体对象
    上的 decision delta 且现有证据无法承载时才开最小 parent fixture。该回返不改变 reading acceptance、
    phase-complete、owner unknown、WorkCell/DeepSeek 或实现冻结。
24. 本轮用 `concept-articulation` 回读 P03/P15/P16：Pair D 与 P15-U1 已分别承载“下一判断改变”、
    “相称实践产生可归因结果”和“风险相关时点覆盖”的边界；新建专门 fixture 不会改变当前 claim
    strength、owner route 或 next action。因此对 P03/P15/P16 返回 `no-proposal-now`，保留现有
    交叉证据，不把“无专门 fixture”误写成“无 coverage”，也不改变 reading acceptance、phase、
    WorkCell/DeepSeek 或实现冻结。
25. 本轮用 `practice-cycle` 回读 whole-work coordination 的 owner-decision preparation：原先“形成
    第一份 RunRecord identity decision-ready package”的下一步已经由 WorkCell readiness §4.1/§4.2
    完成；当前应等待 named owner 的选择或 decision-changing correction，不重建 package、不继续
    堆叠 WorkCell 字段或新机制。该回返只修正 planning candidate 的下一步，WorkCell acceptance、
    phase、DeepSeek 和实现授权仍未成立。
26. 本轮对 PL-10“迭代循环像无监督学习”完成 source-backed bounded analogy review：区分无监督学习、
    交互式/在线适应、强化学习与当前迭代改善闭环，并将“经验驱动的有界闭环改进”作为范围性表达。
    PL-10 的 `research candidate / candidate` standing 不变；只对正式 theory/skill/runtime/mechanism
    升级返回 `no-proposal-now`，不创建 learning skill、memory registry、scheduler、Run 或模型学习结论。
    独立复读已接受该边界；真实 consumer、明确更新对象、可观察反馈和接受关系仍未知。
27. 最近一条 bounded wave 完成了 FOREAGENT 外部研究候选的 ACL PDF/附录和官方仓库来源核对，并完成了 PL-12 的七对象 definition review。
    FOREAGENT 已确认是 pairwise candidate preference + Verified Data Analysis Report + confidence gate + Predict-then-Verify；
    论文的 6×/3.2×/+6% 仍是特定 MLE-Bench treatment，端到端成本、迁移性和项目 consumer 未验证。PL-12 的跨角色
    协调行为与功能性身份连续分别保留为 definition candidate，本体论统一自我与 consciousness 分别
    no-proposal，实验仍依赖 PL-11、真实 consumer 和接受关系。该 wave 不新增顶层 item，不改 WorkCell、
    throughput、DeepSeek 或实现 standing；随后已修复 plan/whole-estimate/item-loop 的旧 current projection。
28. FOREAGENT 的来源阅读产生了一个真实 decision delta：吞吐研究新增了仅在存在“多候选生成→昂贵执行”
    consumer 时才打开的 candidate-selection branch。它要求将预测/数据报告/并发/回退成本、false negative、
    候选 identity 和实际执行质量一起纳入 `T_useful / C_total / Q_guard` 对照；论文的 `m=10`、`c=0.7`、`k=1`
    不迁移为默认参数。该回返只修改 throughput research 与 current projection，不创建 selector、WorkCell 字段、
    Run、runtime 或 DeepSeek 设计；无真实 consumer 时保持 `no-proposal-now`。
29. 本轮完成了 PL-07/PL-13/PL-14/PL-15 的 projection-only downstream boundary review：用现行 plan、roadmap、
    ledger 和 whole-work estimate 区分工作系统语义、base/runtime 架构问题、未来实现与构想实验，修正了
    PL-07 recovery 语义与 PL-13 runtime enforcement 的最近邻边界，也移除了 PL-13 对 PL-14 实现授权的
    隐含承诺。首轮独立 reviewer `Aquinas`（`01a03d70-d8a8-7673-94e6-c6d804bbbdeb`）提出 revise；
    后续独立只读 reviewer（`01a03d75-945c-7be1-a220-2f8d40322c82`）对修订版返回 `ACCEPT`。该结论只
    接受 projection bookkeeping，四个 item 仍按各自 ledger standing，item-level review、acceptance owner、
    system Run、implementation Run、experiment/eval Run 和实现授权均未成立。
30. 本轮将 WorkCell readiness 的 B1–B5 从可能的全量 owner 表单收窄为内部恢复索引：只有重大方向、权限、
    共享基线、不可逆后果或关键安全行动才发送被触发的单个 bundle；局部可逆问题继续自主处理并事后
    纠偏，未触发项省略。独立只读 reviewer（`01a03d7b-93bd-7662-8054-6e8bf0a98774`）返回 `ACCEPT`；
    该结论只接受交互投影，不创建 approval gate、owner registry、runtime state 或新的 acceptance
    authority，不改变 WorkCell/DeepSeek/实现冻结。
31. 本轮回读用户提出的“重要方法定期复述、用 token 换专注”后，发现此前只有 `focus recitation` 检验
    句，没有通用的选择、触发、角色/场景增量刷新和跳过规则。已将其收敛为
    `focus refresh` / `focus anchor`，由 `theory/harness/default-autonomy-with-correction.md` 拥有，
    `owner-facing-progress.md` 只承载 perspective-frame 应用视图；context 恢复、角色/场景变化、
    checkpoint、重大决定、纠偏和必要交接时才刷新相关 delta，没有注意收益时跳过。该修订只补通用方法
    的表达边界，不创建 focus skill、memory/registry、approval gate、runtime state 或新的 authority；
    behavior、matched、adoption 和 acceptance 仍未知。
32. 本轮执行了一项 roadmap authority/form reconciliation：非 dated 主体曾重复承载外部研究和候选的
    当前 standing、证据和处置，虽然其 authority 声明已经规定这些关系回到 item ledger 与各 canonical
    record。现已将 roadmap 收窄为长期方向、阶段顺序和候选发现入口；JitRL、FOREAGENT、主观能动性及
    实验候选的详细状态仍由各自 record 拥有。该项只减少重复与漂移风险，不改变任何 item standing、owner、
    phase、acceptance 或实现冻结。
33. 本轮把 planning 的 bounded records 从根目录移入 `planning/records/`，保留 15 个根级 authority/
    entrance 文件；同步修正 README、plan、roadmap、item ledger、脚本校验和所有本地链接，并经独立
    review 后完成 validator 回归。它是 path/reading-route 整理，不是新 item、standing、owner、
    acceptance 或实现授权；后续仍需在采用后回顾是否真的降低默认读取与维护成本。
34. 本轮把“label / enum / 属性组合 / 派生投影 / 变体”的选择收敛为字段表达的通用 design candidate：
    `expression` 只拥有语义到字段形态的保真表达，概念稳定性由 concept articulation 判断，进入权限、
    路由、生命周期或验收的关系仍由 mechanism review 检查；不创建统一 type registry，不把 enum 自动
    当成状态或权限机制。当前为 `source-bounded / behavior-unverified / acceptance-pending`。
35. 本轮把多步骤/多任务的 Plan、Task、Todo work map 收敛为 harness 的方法层近强制规则：复用一个
    canonical work map 驱动下一行动、依赖、等待、fan-in 和回返；一步、低风险、可逆且无依赖/交接的动作
    可例外。该规则不创建第二 planning authority、全局 Todo queue 或 runtime scheduler；需要跨重启、
    并发、崩溃或不可信调用仍成立时，必须另有 base/runtime 机制。当前为 `source-bounded /
    behavior-unverified / acceptance-pending`，下一步观察真实 bounded wave 的遗漏、错误全局冻结和
    回接质量。
36. 本轮针对“planning 目录仍然混乱”的整体回顾，先补做信息结构研究，再把 supporting working views
    从根目录移入 `planning/index/`；六层模型区分 orientation、current authority、direction/commitment、
    intake/lineage、working indexes 和 process evidence。理论只提供减少不确定性、改善 information scent、
    渐进展开和降低无关上下文的设计支撑，不能直接推出最优目录、性能收益或固定层数；当前 layout 仍是
    `design-candidate / acceptance-pending`，下一步需观察实际发现成本和 authority 误读。
37. 本轮把用户提出的 Todo reminder 作为 work-map 的局部表达候选：`repeat` 是脱离行动边界的复述，
    action-local `focus anchor` 是绑定 Todo action、canonical source 和 return 的最小判断提示，面向载体
    的 `reminder` 只是暂定字段名，`focus refresh` 负责按 role/scene/decision 边界选择恢复内容。当前
    执行 plan 已用这一形式做 dogfood；若未来验证需要跨重启、并发、崩溃或不可信调用仍保证出现，必须
    另行设计 host/base/runtime 机制，不能把 Markdown 或 prompt 当作保证。
38. 本轮对第二轮 `planning/index/` transition 做了采用后的最小 Main dogfood：沿当前 README 读取契约
    恢复 WorkCell standing、skills placement/migration 和下一步路由，未发现 broken link、authority 误读
    或把 supporting view 误写成 acceptance/queue/实现授权。该实践只把 layout 从“已验证结构”推进到
    `main-dogfood-observed / adoption-unknown`；独立只读 reviewer `01a03ddb-8867-70f3-b9a2-04b975cb3ea7`
    仅接受本记录的 boundedness、路径/standing 一致性和下一项 probe，不接受 layout adoption、discovery-cost
    改善、reminder 可靠性或实现授权。由于 Main 熟悉目录且没有旧布局 matched baseline、独立 reader、行为
    计时或 reminder omission 观察，下一步应做固定 task card 的 independent cold-reader probe，而不是继续
    加目录或宣称 adoption。
39. 本轮完成预先冻结的 matched cold-reader probe：两个独立只读 lane 使用同一当前 worktree、同一模型和
    三张 card。treatment 从 `planning/README.md` 开始，报告 5 个 planning 首读文件；baseline 不先读
    README，报告 9 个 planning 首读文件，包含额外的 `plan`、`roadmap`、`phase` 和 placement/archive
    资料。两者均正确恢复 C1 WorkCell `active-after-prerequisite`、C2 无 portable move 授权、C3 当前无已
    打开 wave 且需选择命名 bounded wave，也均无 authority error。这个结果是
    `matched-read-probe-observed / adoption-unknown`，不是 `matched-improvement`：没有独立计时、token、
    质量、长期 adoption 或 regression。两者都 omitted reminder，形成 `reminder-omission-observed /
    reminder-reliability-unknown`；下一轮只做 action-linked Todo carrier 的有/无 reminder 对照，失败时先
    回修 form/入口，不新增 scheduler、registry 或 runtime。
40. 本轮把“research 不能长期未结算”接入整体 planning：新增
    [`research-settlement-and-closure.md`](../theory/research/research-settlement-and-closure.md)，将 research
    candidate、research record 与 settled destination 分开，并规定每个 active research 必须有 question、
    decision、source、settlement route、next wave、owner/consumer、reviewAt 和 return condition。同时为
    `theory/research/` 和当前 research/experiment record 增加 frontmatter 检索投影；历史 review 以
    `settled`/`archived` 区分，当前有真实下一动作的 candidate 保留 `active`，不把 metadata 当接受权威。
    本轮完成的是规则与 inventory，不自动接受、删除或批量归档 substantive research；下一 bounded wave 先
    做 settlement card，逐项决定 `bounded-trial-ready`、`canonical-proposal`、owner-gated hold 或
    `archive-*`，无 decision delta 则不再创建同层 research。
41. 独立只读 reviewer `01a03df7-2b96-73c1-8d0b-848a5b575905` 对 frontmatter、research settlement 规则、
    reminder pilot 证据边界和 no-implementation boundary 返回 `ACCEPT`；该接受只覆盖当前 checkpoint 的
    boundedness/standing bookkeeping，不覆盖 pilot 因果效果、方法接受、采用、named consumer/owner、隔离、
    regression 或任何 runtime。按 reviewer 建议，已区分 checkpoint review 与 pilot record 的
    `independent-review-pending`、把 `pilot-pending` 改为 method-acceptance/next-card 语义，并区分 round
    disposition 与 record lifecycle `status: active`；active consumer 字段也明确为 consumer class/route，
    不是 named consumer。本轮仍没有真实 settled/archive settlement card，下一 wave 必须补齐这一点。
42. 用户回看受控实验后指出，上一轮 reminder 对照没有先回答“这个实验要解决什么问题”，因而不能用来
    判断机制是否缓解长时间执行 Agent 的功能性遗忘。本轮保留旧 raw output 和有限的 carrier 观察，但将
    pilot 结算为 `settled / archive-inconclusive`，不再把它当作主机制证据；新增
    [`long-horizon-agent-forgetting-design.md`](records/long-horizon-agent-forgetting-design.md)，把问题、
    遗忘类型、连续性机制、刺激、primary outcome、隔离和处置顺序冻结为下一项设计候选。该修订不授权
    provider 比较、WorkCell/DeepSeek/base/runtime 实现或实际 Run。
43. 本轮按 settlement contract 回读了 wave-open population、source、lineage、destination、证据上限和
    reopen 条件：Todo pilot、planning information architecture、bounded trial adoption、iteration-process-audit
    和 philosophy-gene-one 已分别结算，closure rule 自身也转为 `settled / canonical-proposal`；long-horizon
    forgetting card 保持独立 active candidate。settlement wave 已标记 `wave-complete` 并关闭 current execution
    surface；剩余 active item 不因 wave 结束而自动运行、接受或实现。
44. 本轮从 DeepSeek 工作系统方向、harness theory、work-map/focus-anchor 方法和长时遗忘主实验 card 回接
    机制对象：将 `task continuity relation` 与 chat history、memory、notification、Todo、WorkCell RunRecord
    和 base/runtime 的 owner 分开；当前会话采用已有方法优先，跨重启/崩溃/不可信 caller 的保证保留为
    mechanism candidate。该 design boundary 只支持 `mechanism-review-formed`，不支持 schema、provider、
    runtime 或 Run acceptance。

### 下一项最小实践

前一轮 checkpoint 已关闭“继续堆叠 planning artifact”的旧 review wave；当前全局 planning 不再标为
全局 closed，而是进入 `active / item-gated / checkpoint-required`。三个已有 WorkCell child 已完成对
`fa602faf… / c78876b4…` 的窄 source read 与独立复核；projection 已再次稳定，下一步处理已形成候选的
owner return；owner return 无法取得时，仍可从其它具备独立输入和边界的分支中选择 bounded contribution：

- **planning information layer / Todo carrier：** 旧 reminder pilot 已结算为 carrier/readability diagnostic，
  不重复同一短 card，也不把 action-local reminder 当作长时记忆机制。若以后仍要验证 Todo 入口，必须另有
  明确的 carrier decision；当前主线先处理长时间执行遗忘 card，不取得 scheduler、memory registry 或跨重启保证。

- **research settlement wave：** 本轮已完成并关闭；`research-settlement-and-closure.md` 现为
  `settled / canonical-proposal`。后续只有 active surface growth、结算规则反例或 decision-changing
  evidence 出现时，才另开一条命名 maintenance wave。剩余 active research（controlled experiment method、
  throughput、initiative、iterative-improvement、Main method、long-horizon forgetting card）分别按当前
  route 选择，不由历史 wave 自动推进。

  若未来 reopen，Todo 仍须携带 `reminder + source + return`；目标是减少 active surface，不是把所有未知
  强行判为无价值。没有 decision delta 的项归 `archive-inconclusive`/`no-proposal`，真实 owner 缺失但重大
  选择确实阻塞的项最多保留一轮 `owner-gated hold`，到 reviewAt 仍无回返就结算。

- **Main agent project-work method：** 复用下一条真实多步骤 wave，Main 先写一个最小 work map，按
  `agent-delegation` 判断 direct/sequential/parallel/nested，把一个独立 inventory/source-review bounded
  contribution 交给 sub-agent，再由 Main fan-in、独立复核和 checkpoint。必须同时记录不委派的对照、协调/重连
  成本、decision delta、unknown 保真和越权/authority error；没有净收益就 `no-proposal`，不要因用户重要性
  制造 synthetic project Run。

- [Agent harness throughput research/design candidate](../theory/research/agent-harness-throughput-research.md) 的 named eval/runner owner、冻结 card/identity 和 telemetry permission return；不再新增 trace schema；前置成立后按 §18 先做 loading branch，再做 topology，最后做 failure/reconnect，不把静态 footprint 或 lane 数直接写成提速结论；若出现真实“多候选生成→昂贵执行” consumer，再单独冻结 direct/predict-then-verify 对照，计入预测/报告/回退成本与 false negative；
- [Agent initiative research candidate](../theory/research/harness-agent-initiative-research.md) 当前只推进 `goal-linked bounded initiative` 的研究边界及 `goal-linked action loop` 的机制假设：在相同唤醒机会和 effect boundary 下，比较是否能从目的/缺口形成局部选择、取得可观察后果、完成反馈纠偏或合格停止；后续只等待真实 system-layer consumer、research/eval owner 和可比较 baseline/treatment，再冻结 reactive/bounded-choice/action-loop 对照；不重复扩展文献综述，不创建 initiative skill、scheduler、memory registry 或 runtime；
- [Harness problem complexity and tool readiness](../theory/research/harness-problem-complexity-and-tool-readiness.md) 已完成第一轮 local source/nearest-boundary review：现有 `work-estimation`、`agent-delegation`、`skill-formation`、`form-selection`、吞吐研究和问题优先实验设计已覆盖相邻关系；当前独立 gap 收窄为问题/后果 profile 如何改变这些已有判断，以及临时工具如何在当前 work map 内保留作用面、权限、验证和回收关系。下一步只在真实 project-scale consumer 中做 tool-readiness application；
- [Harness engineering control and reliability](../theory/research/harness-engineering-control-and-reliability.md) 已完成第一轮 source fingerprint 和现代控制概念边界：1954 英文原版书目/目录已核验，Internet Archive 原始 artifact 已定位但当前 access-restricted；GitHub 只找到未标明版本、来源和授权的中文候选副本；IEEE/NASA 与 Gao 2014 二手论文支持反馈、扰动、可观测性、稳定性、作用能力和可验证可靠性之间的区分；原书关键章节和 harness 映射仍未完成。下一步先核对 GitHub 候选副本的扉页/版次/hash/授权，或取得借阅/扫描权限后做可核读原书的窄回读，随后只有在真实重复失败/扰动 consumer 出现时才做 reliability control card；
- 已有 B1/B2、F1/F2 或 throughput 分支中，确实能改变 standing 的 bounded contribution；A1/A2
  只有出现单项 reopen 条件时才重新进入选择面。彼此无共享写面且可分别回读的 contribution 可以
  在同一 wave 内并行，否则按依赖顺序处理。

在该 wave 完成 source、review、projection 和下一次 checkpoint 之前，不开启另一条 sibling wave，不新增
WorkCell/DeepSeek 设计层，也不进入 runtime 或实现。

## 判定词汇

- `active-now`：当前已有足够来源和边界，可以形成有界 planning/research/design contribution；
- `active-after-prerequisite`：方向明确，但必须等待指定前置出口；
- `candidate`：有方向或来源，但尚未形成当前承诺；
- `hold`：缺少 owner、定义、证据或接受关系，继续推进会偷带承诺；
- `done-for-now`：当前阶段已得到相称处置，后续由新证据或回返条件重开；
- `not-authorized`：不是“不能做”，而是当前 plan 尚未授权该种实现或外部效果。

## 总览

| item | canonical source | standing | 当前可推进部分 | 当前处置 | 前置/出口 |
| --- | --- | --- | --- | --- | --- |
| 哲学序列 P01–P16 的 living 解读 | `theory/philosophy.md`、`theory/gene-expression.md`、`theory/philosophy/`、`planning/index/coverage-audit.md`、`planning/records/philosophy-reading-review.md`、`planning/records/philosophy-p02-reading-review.md`、`planning/records/philosophy-p01-p02-p04-boundary-review.md`、`planning/records/philosophy-p06-reading-review.md`、`planning/records/philosophy-p06-p11-boundary-review.md`、`planning/records/philosophy-p07-reading-review.md`、`planning/records/philosophy-p07-p10-boundary-review.md`、`planning/records/philosophy-p08-reading-review.md`、`planning/records/philosophy-p09-reading-review.md`、`planning/records/philosophy-p10-reading-review.md`、`planning/records/philosophy-p11-reading-review.md`、`planning/records/philosophy-remaining-reading-disposition.md`、`planning/records/philosophy-p12-p13-p16-reading-review.md`、`planning/records/philosophy-p14-reading-review.md`、`planning/records/philosophy-p15-reading-review.md`、`planning/records/philosophy-parent-review.md`、`planning/records/philosophy-p04-p15-p16-boundary-review.md`、`planning/records/philosophy-p05-p07-p08-p09-boundary-review.md` | candidate / acceptance-pending / owner-gated | 保留一个父 item；其下建立 16 个有限 reading work package；P01/P03 已完成 Main、独立 source/边界和父 item scoped cross-relation review，P02 已形成并完成独立 source/边界 review，P04 已形成并完成独立 source/边界 review，P06 已形成并完成独立 source/边界 review，P07 已形成并完成独立 source/边界 review，P08 已形成并完成独立 source/边界 review，P09 已形成并完成独立 source/边界 review，P14 已形成并完成独立 source/边界 review，P15 已形成并完成独立 source/边界 review，P12/P13/P16 已形成 source-bound reading candidate；初轮独立 review 已完成，Main 已完成条件性最小修订，修订后 follow-up clean，P04/P15/P16 boundary fixtures 已独立复核，P05 已形成并完成独立 source/边界 review；P01/P02/P04 的 F1-F3 关系 fixture 已独立复核；P06/P11 的 F1-F3 关系 fixture 已独立复核；P05/P07/P08/P09 的 C1-C4 关系 fixture 已建立并完成独立 review；P07/P10 的 F1-F3 关系 fixture 已独立复核，P01/P03 Pair A–D 具体成对 fixture 已完成 fixture-level 独立 review；P12/P13 下游 strategy 仍 `no-proposal-now`，P16 下游 adoption/time-window 实践仍 `hold-cross-boundary-fixture-only`，最终接受仍未知 | P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 保留 candidate / acceptance-pending；P12/P13/P16 保留 reading candidate / follow-up-clean / acceptance-pending；下游 P12/P13/P16 处置仍分别为 `no-proposal-now`、`no-proposal-now`、`hold-cross-boundary-fixture-only`；不因覆盖率批量创建 strategy 或 runtime | 16 条 source 不变；每个 package 有来源、定义、关系、生成性示例和 review；P01/P03 不再重复生成同一 fixture，后续只在 source、最近邻、consumer、reading review 或 acceptance delta 出现时继续回返 |
| 防退化闭环迭代与 Principal correction | `theory/harness/iterative-improvement.md`、`theory/research/iteration-process-audit.md`、`theory/research/principal-correction-theory-review.md`（上一轮历史 review）、`theory/research/principal-correction-theory-review-round-2.md`（当前静态复核）、`evals/skill-evaluation/protocol.md`、`evals/skill-evaluation/reviews/principal-correction-projection-review.md` | living semantic theory / static semantic accepted / behavior candidate | `adapt-and-retest / owner-gated` | probe 18 已关闭上一轮关于采用后 recurrence/escape 时点的静态缺口；protocol projection 也已独立静态复核；行为、匹配归因、真实 exposure、接受与 adoption 仍 unknown；当前不再新建总 workflow skill，等待真实 runner/consumer/acceptance 关系 | 严格 card、独立接受、采用后窗口与回归/unknown 关系出现时 reopen |
| archive 文档/skills 价值筛选 | `archive/skills/`、`archive/design/`、`theory/research/`、`planning/records/next-candidate-review.md` | current main plan phase 1 | `done-for-now / waiting-for-named-consumer` | inventory 已建立；两批 candidate review 已记录；不直接复制 | 每项有 source、用途、standing、去向和不迁移理由；新 consumer 或 decision delta 出现时单项 reopen |
| 设计/开发生命周期 skills 套组 | `planning/roadmap.md`、`planning/index/coverage-audit.md`、`theory/agent-delegation.md`、`theory/concept-articulation.md`、`theory/expression.md`、`theory/skill-formation.md`、`theory/harness/theory.md`、`theory/harness/iterative-improvement.md`、`theory/harness/planning-inbox.md`、archive 候选、living skills、`planning/records/design-development-review.md`、`planning/records/disciplined-development-review.md`、`planning/records/method-skill-probe.md`、`planning/records/method-skill-probe-round-3.md`、`planning/records/method-skill-probe-round-4-precondition-review.md`、`planning/records/mechanism-design-review-candidate.md` | current plan direction | `retain-incubation / waiting-for-consumer` | `practice-cycle`、`work-estimation` 与 `mechanism-design-review` 保持三个 project-local incubation candidate；living theory 与 carrier standing 分开；`disciplined-development` 当前提案已关闭为 `no-proposal-now / activation-deferred / retain-archive-source`，不创建 carrier；三个 carrier 不急于 portable promote | 需求→设计→文档→开发→测试→验证→改进的边界、最近邻、真实 consumer、matched probe 与回归可审查；理论 source revision 或真实 development consumer 出现后才 reopen 对应关系 |
| 当前 11 个 `.agents/skills/`（8 个已有 + 3 个本轮 candidate） | `planning/index/skill-migration.md`、`evals/project-audit/living-skills-round-1.md`、[`records/evidence-applicability-review-living-skills-round-2.md`](records/evidence-applicability-review-living-skills-round-2.md)、各 candidate round | mixed incubation standing | `done-for-now / retain-incubation` | 8 个已有保持 `done-for-now / retain-incubation`；其中 7 个 round-2 family 仅有历史 artifact，current applicability uncertain；三个本轮 candidate 保持项目内 incubation，均无 portable promote | carrier standing 与 round applicability 分开；新 consumer、source/identity 恢复或回归时按逐项 round 重开；不创建 `skills/` 镜像 |
| Work Cell 协议 | `design/work-cell-protocol.md`；全部关联 planning records 见 `planning/records/workcell-*.md`，applicability records 见 `planning/records/evidence-applicability-review-workcell-*.md` | design candidate | `active-after-prerequisite` | current-source applicability 已按 child 分开回读；canonical shape、policy、owner、retention/correction、protocol acceptance 仍 unknown；只允许 design review、counterexample 和 fixture contract | accepted phase-1 exit/explicit transition、protocol/host-security/record/evidence/acceptance owner 决定；不进入实现 |
| Agent harness throughput and orchestration | `theory/research/agent-harness-throughput-research.md`、`theory/research/agent-delegation.md`、`evals/skill-evaluation/tools/planning-inbox-round-3/run-planning-inbox-round-3.sh`、`evals/skill-evaluation/runs/planning-inbox-round-3/run-identity.md` | system-layer research/design candidate | `design-only / trace-schema-formed / independent-review-complete / owner-gated` | 已有 claim/source/gap matrix、bounded topology、conditional skill/context route DAG、指标和 static trace return；静态 footprint 的最新数值与语义读取边界由吞吐研究 §17 统一记录；current evidence 为 source-observed + inference-backed + trace-schema-formed + independent-review-complete，尚无完整 latency/performance conclusion；只允许回读和可复现 probe 设计，不改 WorkCell/DeepSeek/runtime、不新建 parallel skill | named eval/runner owner、固定 task/source snapshot、冻结 card/identity、统一 schema/clock、telemetry permission 和与固定 trace baseline 相称的 independent review 全部满足后，才可决定是否形成 Run；在此之前不执行、不实现；revisit：runner/consumer、任务卡、provider、telemetry 或性能/质量证据改变时重开；无 decision delta 时保持 owner-gated/no-proposal |
| DeepSeek Harness 工作系统设计 | `planning/plan.md`、`planning/roadmap.md` | architecture candidate | `active-after-prerequisite` | Work Cell 设计接受后再形成系统设计 | 输入/记忆/session/todo/并发/输出/恢复对象与 owner 明确 |
| 受控 Agent 行为评估工具 | `planning/roadmap.md`、[`records/controlled-agent-evaluation-tool-review.md`](records/controlled-agent-evaluation-tool-review.md)、`evals/`、`experiments/` | experiment/eval candidate；当前 working designation 为“受控 Agent 行为评估设施” | `candidate-boundary-observed / revision-applied / independent-review-complete / implementation-not-authorized / acceptance-pending` | 已拆分 evaluation question、core card、fixture/task/source、rubric、runner、WorkCell executor、provider adapter、eval-specific evidence/ledger 与 prototype；修订后的针对性复读已返回 accept，但只覆盖 bounded boundary review；WorkCell Run/RunRecord 仍由其自身 owner 拥有，接受权威仍在 acceptance owner；当前只允许 protocol/fixture planning，不实现通用工具 | `theory/skill` 边界、真实 consumer、各对象 owner、变量、card、Run、设施/实验 acceptance 成立后再决定是否需要设施实现 |
| 旧 skill/eval 证据按现行 protocol 复核 | `evals/project-audit/`、`evals/skill-evaluation/`、`planning/index/evidence-maintenance-review.md`、各 applicability record | evidence maintenance candidate | `done-for-now / retain-unknown / reopen-on-new-evidence` | 当前 protocol/audit 保留；已知 historical/evidence family 均有对应 applicability record；living-tree Round 2 final addendum 已确认无 blocking，generated-only 与 prototype 继续 hold；WorkCell current-source child 由 WorkCell readiness owner 拥有，不作为 evidence-maintenance 漏项 | 只有新 artifact、source/protocol/candidate、consumer/owner、runner identity 或 acceptance relation 变化时，才重开对应 family；否则不批量扫描、不重跑、不新增覆盖性 record |
| “迭代循环像无监督学习”类比 | `planning/roadmap.md`、inbox history、[`records/iterative-loop-learning-analogy-review.md`](records/iterative-loop-learning-analogy-review.md) | research candidate | `candidate / bounded-analogy-scope / formal-upgrade-no-proposal / independent-review-complete / acceptance-pending` | 已区分无监督学习、交互式/在线适应、强化学习和当前迭代改善闭环；保留有限类比，不把它写成 theory/skill/runtime；当前没有 learning Run、matched improvement 或 accepted theory change | 只有真实 consumer、明确更新对象、可观察反馈、decision-changing counterexample 和接受关系出现时，才把类比拆成独立 research question；当前 route-to-owner |
| 概念碎片式输出 | `planning/roadmap.md`、inbox history、[`records/concept-fragment-output-disposition.md`](records/concept-fragment-output-disposition.md) | experiment candidate | `candidate-definition-observed / hold / no-proposal-now-for-execution` | 已形成外显输出对象、最近邻和未来 card 入口；不推断内部思维、不启动 Run | named experiment/eval consumer、变量、可重建 identity、独立 review 与接受关系明确 |
| 冲突角色整合/统一自我 | [`records/conflict-role-integration-review.md`](records/conflict-role-integration-review.md)、`planning/roadmap.md`、inbox history | dependent experiment candidate；已完成七对象 definition review：跨角色协调行为与功能性身份连续分别保留；本体论统一自我与 consciousness 分别 no-proposal | `hold` | 依赖 PL-11 的可观察输出对象与证据；不把意识/本体论统一自我写成结论，不将普通仲裁当作跨角色协调 | PL-11 前置实验、分别的对象/变量、风险与接受者明确 |
| 实时、多来源 DeepSeek Harness 基座 | `planning/roadmap.md`、inbox history | architecture candidate | `active-after-prerequisite` | 只保留系统设计问题，不实现 base | Work Cell 与系统设计完成，输入/并发/恢复/输出隔离收敛 |
| 工作系统实现 | `planning/plan.md` | post-design item | `not-authorized` | 设计接受后另建 implementation plan | Work Cell + 工作系统设计均获接受和实现授权 |
| 用户各类 harness 构想 | `planning/plan.md`、roadmap candidates | post-system experiment/eval | `not-authorized` | 系统实现后逐个拆成 experiment/eval | 每个构想单独定义 object、baseline、effect、evidence、acceptance |

### 已结算的辅助 projection

以下两个对象已从 active research surface 结算，但仍作为当前 planning 的可回读 proposal；它们不增加
顶层 item 数量，也不取得 item ledger、acceptance 或 runtime authority：

- `planning-information-architecture / Todo carrier`：`settled / canonical-proposal / behavior-observed /
  adoption-unknown`；六层结构、path transition 和 action-local carrier 已交给 current planning projection。
  新 discovery-cost、authority 误读、真实 adoption 或长时 carrier decision delta 出现时，以新 card reopen。
- `planning-information-architecture / frontmatter pruning`：本轮已完成一次设计后回落应用；静态盘点确认
  `kind/id/status/disposition` 是当前稳定核心，`evidence` 与 `consumer/owner/settlement_route/review_at`
  按真实路由、证据和结算作用条件保留，事件与组合状态回到正文/lineage。当前 standing 为
  `design-validation-observed / adoption-unknown`；初始设计 review 和真实 wave 后都必须做字段承重、派生、
  重复与历史可回读检查，不创建 field registry、自动 pruner 或字段数量阈值。详见
  [`planning-information-architecture.md`](../theory/research/planning-information-architecture.md) 的
  2026-08-26 frontmatter pruning section；出现独立 consumer、字段漂移或反例时再 reopen。
- `research settlement → harness application handoff`：本轮补齐“研究结算不等于系统采用”的边界；
  `semantic handoff`、`carrier handoff`、`activation observation` 和 `adoption/reopen evidence` 分开回读。
  有价值但尚未完成交接的结果可以结束 research round，但必须在目标 item/plan 保留 `integration pending`
  应用义务；只有无价值、无 proposal、被 successor 取代或已完成应用义务关闭的结果才可安全归档。当前是
  `design-candidate / adoption-boundary-formed / no-runtime`，不创建 adoption registry、自动 loader 或把
  archive 内容全量灌入上下文。
- `bounded trial adoption relation`：`settled / canonical-proposal / concept-boundary-formed`；只保留
  candidate→scope/owner/期限/允许效果/rollback/acceptance 的关系模型，不创建全局 enum、registry 或 gate。
  出现真实 candidate 和 bounded-trial owner/acceptance relation 时另建 trial record。
- `goal-scoped method evolution`：因用户新增的长期 goal/无限执行 consumer，
  [`iterative-improvement.md`](../theory/research/iterative-improvement.md) 已按 §10 reopen 为
  `active / adapt-and-retest / design-candidate`。当前只允许任务执行回路与方法演化回路、语义 checkpoint、
  method snapshot、baseline/rollback、独立 review 和 bounded comparison；不创建 self-improvement registry、
  scheduler、自动改写器或 runtime mechanism。真实 goal wave、runner、reviewer、接受关系和可重建记录形成
  后才进入 trial preparation。

### 当前应用交接审计

以下是当前已有候选在“研究结算 → harness/工作方法应用”链上的最小 projection。它刻意把 semantic/carrier
hand-off、当前 work 的 application observation 和真实 harness activation 分开；`not-observed` 不是失败，也
不是 archive 理由，而是下一条 bounded wave 的明确缺口。

| candidate | semantic / carrier handoff | current application observation | harness activation / adoption | 下一条回返 |
| --- | --- | --- | --- | --- |
| `planning-information-architecture / frontmatter pruning` | 已进入 research canonical proposal、records README、item ledger、plan/roadmap；保留 source 与 lineage | 当前设计 review 已应用到字段盘点和字段形态，`design-validation-observed` | 未有真实 harness loader/runner activation；长期维护收益 unknown | 下一次记录 reopen 或第二独立 consumer 出现时，做修剪后的 reader/维护回返 |
| `goal-scoped method evolution` | 已进入 `iterative-improvement`、item ledger、plan/roadmap；baseline/snapshot/rollback 关系已形成 | 尚未完成真实 project-scale goal wave；当前只有 design candidate | 未观察到 goal harness 在 safe point 自动/可靠加载方法快照；不创建此保证 | 下一条真实多步骤 goal wave：冻结 baseline，插入一次 semantic checkpoint，形成 application receipt |
| `research → harness application handoff` | 已进入 harness theory、research settlement、records README 和 planning projection | 当前 planning maintenance 已形成 design-use/application observation；它不是 harness activation | 未进入 WorkCell/DeepSeek/base/runtime；真实 activation 与 adoption 全 unknown | 在首个匹配的真实 harness/runner wave 中验证 candidate pack → Todo → application receipt → independent review → settlement |
| `long-horizon agent forgetting design` | 已将 controlled-experiment、planning-information-architecture/P06 pruning 和 work-map/focus-anchor 关系交给既有 experiment design record | 当前 design wave 已将问题、变量、estimand、action probe、candidate boundary 和 trial-input contract 收束；明确当前设计形状不纳入 provider/memory registry/runtime 等不承重项；design-use receipt 已经独立复读并接受 | 只有 planning/design application observation；没有真实 runner activation、matched effect 或 adoption | 等 named consumer/owner、任务族/holdout、runner/evidence、guardrail 和 acceptance route；随后才决定 bounded trial 或 no-proposal/archive |
| `Main project-work method` | 已有 research candidate、plan/roadmap/ledger carrier | settlement wave 有 `planning-dogfood-observed`，但无 direct matched comparison | 未证明一般 harness/team runtime 的稳定 activation 或净收益 | 下一条真实多步骤 wave 做 direct-vs-delegated bounded comparison，并独立 review |
| `harness complexity/tool readiness`、`engineering control/reliability` | 已有 source-bounded research records 和 planning projection | 当前只有 design/source application，未形成第二真实 consumer | 未进入实际 harness system；不得从文档 presence 推断可靠性 | 真实 consumer、扰动/工具边界和 runner 形成后再做 bounded application；否则 no-proposal/archive |

这张表不是第二个总表：当前 standing、owner、证据和阶段出口仍以各 canonical source 与本 ledger 总览为准。
它只承担“有没有完成下游应用交接”的可回读投影；任何 row 进入 archive 前，必须先解决其未完成的应用义务，
或明确记录 no-proposal、无价值、successor 与 reopen 条件。

## 顶层 item contract projection

上表适合快速判断“现在能不能动”；本表把 main goal 要求的关系压成同一投影，避免把缺省值
误写成已决定事实。`unknown` 是当前证据或授权确实缺失，不是待 Main 猜测的字段；具体语义
仍由每个 item 的 canonical source 拥有。本表不创建 owner、consumer 或实现授权。

| item | consumer / owner | 依赖与允许范围 | 当前证据 standing | disposition / 阶段出口 | revisit |
| --- | --- | --- | --- | --- | --- |
| P01–P16 living readings | reading producer；具体 acceptance owner `unknown`；下游方法 consumer later | 依赖 `philosophy.md`、gene-expression 术语和父 item 交叉关系；只允许 source-linked reading、review 和 research record，不改 source、不进 runtime | source-current；16 个 package 均为 reading-candidate + acceptance-pending；P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 已 independent-review-complete；P12/P13/P16 为 research-open + independent-review-complete + conditional-revision-applied + follow-up-clean；父 item P01/P03 scoped cross-relation 为 `cross-relation-observed`，且 Pair A–D fixture 已完成 fixture-level independent review；P02/P04/P15/P16 boundary 为 `design-boundary-observed / independent-review-complete`，P05/P07/P08/P09 boundary 为 `design-boundary-observed / independent-review-complete`，P06/P11 boundary 为 `design-boundary-observed / independent-review-complete`，P07/P10 boundary 为 `design-boundary-observed / independent-review-complete`；P12/P13 下游 strategy 仍 `no-proposal-now`，P16 下游 adoption/time-window 实践仍 `hold-cross-boundary-fixture-only`；P15 的 round-3 consumer 仍只有 `behavior-observed / attribution-uncertain`，行为/接受未知 | `candidate / acceptance-pending / owner-gated` for all 16 reading packages；P12/P13/P16 的初轮 review 已完成、修订后 follow-up clean，下游处置不归并为 reading standing；P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 与父关系均未取得 accepted reading standing；P02/P04/P15/P16 仍需各自最近邻/consumer/acceptance 关系和相称证据，named acceptance owner 仍 unknown | source、术语、最近邻、fixture 覆盖或下游生成关系变化时重开；详见 `coverage-audit.md`、`records/philosophy-remaining-reading-disposition.md`、`records/philosophy-p12-p13-p16-reading-review.md`、各 P reading review、父关系 review 与 boundary records |
| iterative-improvement / Principal correction | semantic theory owner；planning/design owner 承载当前 consumer；具体 acceptance owner `unknown` | 依赖真实 round、独立 review、接受和 adoption window；只允许 observation、最小 semantic delta、projection 和 review，不建总 workflow/runtime | `static semantic accepted`（probe 18 的 round-2 theory review 与 correction projection review）；behavior `adapt-and-retest`；现有 rounds 的严格归因、真实 exposure、Principal acceptance 与 adoption 仍 unknown | `adapt-and-retest / owner-gated`；形成可回读 round，之后取得可重建的采用后 regression/reopen 关系 | theory、consumer、接受 rubric 或回归结果改变时重开 |
| archive docs/skills value screening | skill-formation/main planning owner；consumer 由各候选分别确认 | 依赖 archive source 与 living authority；允许 inventory、吸收、重写候选和 no-proposal，不直接搬运或批量创建载体 | inventory/初筛及已有 candidate review；历史 evidence 不能直接升格 | `done-for-now / waiting-for-named-consumer`；当前 migration wave 已完成相称筛选，候选均有 source、边界、standing、去向和不迁移理由 | 新 consumer、新证据、archive/living authority 或 decision-changing boundary 变化时按单项重开 |
| design/development skill suite | project skill owner `unknown`；当前 consumer 是 planning/design review，后续 WorkCell design | 依赖候选独立判断、最近邻、匹配 probe 和回归；只允许 `.agents/skills/` incubation，不进 portable `skills/` | `format-valid` + planning `behavior-observed`；matched/acceptance 未成立 | `retain-incubation / waiting-for-consumer`；完成独立 review、真实 consumer 和相称 regression，或返回 no-proposal/demote | consumer、边界、归因或采用后回归变化时重开 |
| 11 个 `.agents/skills/`（8 个既有 + `practice-cycle`、`work-estimation`、`mechanism-design-review` 三个 candidate） | 项目 Agent discovery/eval consumer；具体 external owner `unknown` | 依赖项目 authority；允许保留和项目内激活，不复制到 `skills/`、不因格式通过而 move | 8 个既有：逐项 `format-valid` + 局部 `behavior-observed`；practice-cycle round 3 为 `format-valid` + `behavior-observed / attribution-uncertain`，work-estimation 与 mechanism-design-review 仍按各自 round standing；portable matched 未成立 | 既有 8 个 `done-for-now / retain-incubation + portable no-proposal`；三个 candidate 继续项目内 incubation，practice-cycle 为 `adapt-and-retest`，不晋升 portable | 新 external consumer、脱项目边界证据、统一 runner/activation/输出 schema 或 regression 时按逐项 item 重开 |
| WorkCell protocol | 当前 design consumer；future host/coordinator/evidence consumers；named owner/acceptance owner `unknown` | 依赖 accepted phase-1 exit/explicit transition、host/security、protocol/record/evidence owner；只允许 source-backed design review、counterexample 和 fixture contract，不实现 runtime | A/B/C/D child 已回指最新 source；identity、CompletionAction、contract-field 三项已完成对 `fa602faf… / c78876b4…` 的 section-level 窄回读与独立复核，旧 source applicability 仍保留为 historical provenance；本轮 state/record finalization simplify candidate 与 parent relation set simplification 已回接当前 source；当前 v1 parent relation 只保留 `retry-of` / `continued-from`，generic derivation 留在上游；owner-surface check 未发现 named owner/consumer；canonical shape、policy、field mapping、digest、host enforcement、retention/correction、owner 与 protocol acceptance 仍 unknown | `active-after-prerequisite / child-applicability-reconciled / overall-source-applicability-uncertain / independent-review-complete`；下一步只等待 owner-backed decision 或 decision-changing counterexample；不创建 registry/meter/runtime，不开始 adapter plan | named owner/consumer、source、phase decision、field shape、retention/correction、policy 或 acceptance rubric 变化时 reopen |
| Agent harness throughput and orchestration | named eval/runner owner `unknown`；Main 只维护研究 candidate，不能代填 owner、consumer 或 telemetry permission | 依赖 `agent-delegation` 的来源边界、固定 task/source snapshot 与现有 runner identity；只允许 claim/source/gap、拓扑、conditional skill/context route DAG、指标和 probe 设计，禁止 WorkCell/DeepSeek/runtime 实现、parallel skill 或 synthetic Run | `source-observed + inference-backed + trace-schema-formed + independent-review-complete`；已观察 pair barrier、sidecar 创建分组、usage/events/tool-call 事实；静态 footprint 的最新数值与语义读取边界由吞吐研究 §17 统一记录；current evidence 为 source-observed + inference-backed + trace-schema-formed + independent-review-complete，尚无完整 latency/performance conclusion；只允许回读和可复现 probe 设计，不改 WorkCell/DeepSeek/runtime、不新建 parallel skill | `design-only / trace-schema-formed / independent-review-complete / owner-gated`；下一出口是 named owner + frozen card/identity + schema/clock + telemetry permission + independent review，之后才决定是否执行一个固定 trace baseline 或 loading comparison；没有 owner return 则关闭 matched 分支为 no-proposal，不再扩展设计 | runner topology、consumer、provider、telemetry、质量/延迟证据或 owner 返回改变时 reopen |
| DeepSeek Harness work-system design | future work-system consumers；owner `unknown` | 依赖 WorkCell design acceptance；只允许对象、边界、依赖和系统设计，不决定 carrier/kernel、不实现 | architecture candidate；没有 current design acceptance 或 matched evidence | `active-after-prerequisite`；输入/记忆/session/todo/并发/输出/恢复及 owner 可审查后再进入 implementation planning | WorkCell、provider comparison 或真实工作系统 consumer 变化时重开 |
| controlled Agent behavior evaluation facility | future eval/evidence owner `unknown`；consumer 尚未命名 | 依赖 theory/skill boundary、fixture、controlled variables 和 acceptance；当前只允许 protocol/fixture planning 与现有 protocol 的承载性检查 | `roadmap candidate + protocol boundary observation + current bounded review`；历史/generated artifacts 不能替代 current Run | `retain-protocol-first / no-proposal-now-for-general-tool / route-to-consumer`；有 named consumer、card、Run、review 和 evidence standing 后再决定是否实现 runner/control surface | protocol、consumer、工具边界、无法承载的真实问题或风险后果变化时重开 |
| legacy skill/eval evidence maintenance | eval/evidence owner `unknown`；各 skill/item owner 是局部 consumer | 依赖当前 source snapshot、现行 protocol 和 run identity；允许标 stale/unknown、补 card 或规划重跑，不倒写历史 | historical Run/review；部分 generated-only 或控制变量不完整，当前有效性 unknown | `done-for-now / retain-unknown / reopen-on-new-evidence`；逐项决定复核、重跑、hold 或 no-proposal | source/protocol、run identity、consumer 或接受关系变化时重开 |
| “iterative loop resembles unsupervised learning” analogy | research owner `unknown`；暂无 confirmed consumer | 依赖明确比较维度、来源、反例；当前已有 bounded analogy review；只允许 research question/reference，不写成 theory 或 runtime | `roadmap/inbox research candidate + source-backed bounded analogy review`；无 learning Run、matched improvement 或 accepted theory change | `research candidate / candidate` standing 保持不变；仅对 formal theory/skill/runtime/mechanism upgrade `no-proposal-now`，并保留 `bounded-analogy-scope` | 出现具体 consumer、明确更新对象、可观察反馈、decision-changing counterexample 或接受关系时重开；否则 route-to-owner |
| conceptual fragmented output | experiment/eval owner `unknown`；暂无 consumer | 依赖 raw hypothesis、roadmap experiment boundary、可观察定义、变量、证据和 acceptance/ethics；不允许推断内部思维或直接实现 | `source-backed / candidate-definition-observed / independent-review-complete`；无 Run、matched、regression 或 acceptance | `candidate-definition-observed / hold / no-proposal-now-for-execution`；先取得 named consumer/owner 与可重建 card | 定义反例、变量、owner、identity 或风险接受关系变化时重开；见 `records/concept-fragment-output-disposition.md` |
| conflict-role integration / unified self | experiment/eval owner `unknown`；依赖前项 consumer | 依赖 PL-11 的可观察输出对象，以及 role-conditioned behavior、可观察互斥角色约束、role conflict、跨角色协调行为、功能性身份连续、本体论统一自我和 consciousness 的独立定义；不实现系统、不反推理论 | [`records/conflict-role-integration-review.md`](records/conflict-role-integration-review.md) 已完成七对象 definition review；跨角色协调行为与功能性身份连续分别保留 definition candidate；本体论统一自我与 consciousness 分别 no-proposal；PL-11 前置对象尚未被实验接受 | `hold`；前置 experiment、独立变量和 acceptance 成立后再拆独立 item；不把本体论统一自我或 consciousness 作为 acceptance 指标 | PL-11 前置、对象定义、风险或接受者变化时重开 |
| real-time multi-source DeepSeek Harness base | architecture/base owner `unknown`；future system consumer | 依赖 WorkCell 与工作系统设计接受；只允许 architecture question，不实现 base、queue 或 runtime | architecture candidate；无 current consumer/acceptance | `active-after-prerequisite`；系统对象、隔离、并发、恢复和 owner 成立后另建 bounded implementation plan | WorkCell、系统设计或 carrier/kernel 结论变化时重开 |
| work-system implementation | implementation owner `unknown`；设计接受后的 future consumer | 依赖 WorkCell + work-system design 的明确 acceptance 和 implementation authorization；当前不允许代码实现 | `not-authorized`；无 accepted design/implementation plan | `not-authorized`；只有 bounded implementation plan、owner、验收和回滚关系成立后才可进入 | 任一设计接受、授权或 scope 改变时重开 |
| user harness ideas | user/goal owner；每个构想未来独立 experiment/eval consumer | 依赖已实现并接受的 work system；当前只允许保留、拆分和定义候选，不改 core | post-system candidate；没有 system consumer 或 experiment acceptance | `not-authorized`；每个构想具备 object、baseline、effect、evidence、acceptance 后独立推进 | 系统实现、构想定义或风险接受关系变化时重开 |

这张 projection 的完整性标准是：每个顶层 item 都明确记录 source（总览表）、standing、当前
可推进部分、consumer/owner、依赖、允许范围、证据、disposition、阶段出口和 revisit；缺失的
具体人名、真实 consumer 或接受者仍明确写成 `unknown`。P01–P16 的逐项字段由
`coverage-audit.md` 的共享 contract 和 16 行 package 表承载，WorkCell 四项则由本文件的
sub-item 表及对应 review records 承载。

## 可重开的 bounded branch（不表示当前已打开）

本节是资格与回返条件地图，不是执行队列。只有上面的“当前执行面”明确选中一条 bounded wave，
分支才算打开；当前没有已打开的 wave，也没有已打开的 sibling wave；其余分支仍需经过 checkpoint 和下一波
选择，不因本节保留候选就并行推进。这不改变全局 planning 的
`active / item-gated / checkpoint-required` standing。

### A. 哲学解读补齐

这是已有 source、目标文件模式和明确出口的 bounded contribution。它不要求实现 runtime，
也不应把 archive interpretation 直接当作 living truth。每篇应回到对应 source line、当前
术语和基因关系；完成后由人类 review 判断是否忠实和是否足够支撑后续方法。

### B. 剩余文档/skills 迁移筛选（当前波次已收口）

`archive/skills/` 当前仍有一批历史载体，但“存在文件”不能证明“值得迁移”。第一步是建立
候选 inventory，按以下去向处理：

- 吸收为 living theory/research：它保存的是稳定语义或证据，而不是可选择方法；
- 进入 `.agents/skills/` candidate：有重复 Agent 判断差距和明确触发边界；
- 合并到已有 skill：实际拥有同一主要判断和失败边界；
- 降级为 reference/普通文档/工具候选：不需要选择性方法载体；
- `no-proposal`：证据不足或已有 owner 更近；
- 保留 archive：只作为历史反例或来源，不进入当前设计。

本分支的最小改动是 inventory 和处置，不是把 29 个 archive skill 全部迁入。当前 inventory、
candidate review 和三个项目内方法 carrier 已完成相称的阶段性处理；本分支现在是
`done-for-now / waiting-for-named-consumer`，只有单项出现真实 consumer、重复 gap 或改变下一判断
的边界证据时才 reopen。

### C. 设计开发 skills 套组

在 B 的 inventory 基础上，优先识别后续 WorkCell 设计真正需要的判断：

- 需求/任务关系的重建；
- 概念、命名和边界；
- 设计方案与协议表达；
- 人类文档和 Agent-facing 表达；
- 开发变更、代码 review、测试和验证；
- 迭代改进、回归、证据和接受关系。

这里不预设“一套完整 skills”一定是正确形式。每个 candidate 仍需有独立主要判断，避免
把整个开发生命周期重新包装成一个万能 skill。

### D. 迭代闭环的 planning 应用

`theory/harness/iterative-improvement.md` 已被 Main 接受为 living semantic theory，但它的
行为 standing 仍是 `adapt-and-retest`。当前可推进的不是再造一个“总闭环” skill，而是在一个
真实低风险 planning item 上记录：当前 baseline、观察到的差距、最小 semantic delta、反例/未知、
独立 review、接受关系、projection/move 以及采用后 regression/reopen。本轮已在 WorkCell 与
P01/P03 方法探针上形成初步记录，但严格归因、独立接受、采用后窗口仍是 `unknown`；若其中一项
没有真实 owner 或运行机会，就保留 `unknown`，不把文档完整度写成收敛。

### E. 设计开发方法候选

本分支当前把三个窄判断编码为项目内 candidate：

- `practice-cycle`：实际结果改变下一项最小实践，或把矛盾 route 给更近的 owner；
- `work-estimation`：恢复目标状态、必要工作图、discovery branch 和当前决策所需粒度。
- `mechanism-design-review`：在设计准备增加可强制、可持久化或可恢复机制时，恢复对象/来源/目标，
  比较 prompt、已有 owner、确定性边界与新机制的全生命周期负担；不创建机制、不取得接受权。

三者不合并成“开发总 skill”，也不替代 `iterative-improvement` theory、item ledger、domain
method、预算/资源 owner 或 runtime。第一轮真实 probe 和载体准入记录见
[`records/method-skill-probe.md`](records/method-skill-probe.md)；当前均为 `retain-incubation`，证据只有
`format-valid` + `behavior-observed`，portable `skills/` 仍不创建；第二轮 P01/P03 对照及其
归因限制见 [`records/method-skill-probe-round-2.md`](records/method-skill-probe-round-2.md)。

## 当前不突进的分支

- Work Cell 可以做有限的设计审查，但不能在方法 skills 阶段尚未形成出口时宣称完成；
- DeepSeek Harness 工作系统要等待 Work Cell 设计收敛；
- base、executor、runtime、实时并发和恢复实现均未授权；
- 概念碎片和统一自我实验缺少定义与接受条件，保持 hold；
- provider 选型和 DeepSeek carrier/kernel 判断不由当前 planning ledger 偷定。

## WorkCell 设计中的四个开放 sub-item

这些是 `WorkCell 协议` item 的 planning projection；只有 owner return 或 decision-changing counterexample
出现并被当前执行面选中时，才推进其中一项；当前波次不因这张表打开。协议语义仍由
[`design/work-cell-protocol.md`](../design/work-cell-protocol.md) 拥有。它们当前可以推进到设计
判断、反例和 owner 回返，不能降级成实现任务。

| sub-item | source / standing | consumer / owner | 依赖与允许范围 | 当前证据与缺口 | disposition | 阶段出口 / revisit |
| --- | --- | --- | --- | --- | --- | --- |
| bounded drain 与 unknown effect | design §6.2、§9.2；`open design unknown` | host/coordinator lifecycle owner；host/security 负责 effect cutoff；record owner 负责保留事实 | 依赖取消、已发起 host call、executor 是否合作；允许设计反例和 deterministic contract fixture，不允许实现 runtime | 当前只有“尽量排空”和 `unknown` 表达，没有截止/强制收尾关系 | `open`；保持现有生命周期，不增加自动 retry | 明确截止、停止等待、未确认效果和最终 RunRecord；executor 不合作或取消语义改变时 revisit |
| active Binding expiry / revocation | design §5.1、§6.3、§9；`open host/security unknown` | host/security owner；protocol owner 负责 run 结果表达 | 依赖 admission snapshot、host policy、权限撤销；只允许设计选择和安全反例，不允许借 adapter 习惯定案 | 已有“运行前物化、期间不可变”和“过期需重新 admission”，但活动 run 的冲突未定义 | `open`；不假设静默继续或自动取消 | 选定 snapshot 继续、host-owned cancel 或其他结构化结果，并验证无权限扩大；host policy 变化时 revisit |
| Event 顺序、去重、重放 | design §7、§17.2；`public observation contract unknown` | protocol/evidence owner；当前未发现 named cross-process consumer | 依赖 Event 是否需要重建事实、RunRecord 是否唯一公共事实；当前只允许保留 observation-only 候选和 reopen 条件，不实现 event bus | Event 已有 typed union，但没有 sequence、duplicate、gap、replay contract；当前没有 consumer 或 evidence 要求 replay | `retain-unknown / no-proposal-now-for-replay / route-to-owner`；不继续扩展 replay 设计 | named cross-process consumer、record/evidence owner 的 observation-only/replay decision、source 或 counterexample 改变时 reopen；在此之前保持 RunRecord 为候选公共事实投影 |
| retry / continue lineage 可恢复性 | design §3.1、§6.1、§8.2、§9.3；`causal identity unknown` | protocol/record owner；evidence reviewer 验证恢复事实 | 依赖 request/run record 的保留与 parent relation；允许 lineage fixture 和记录 contract，不依赖 provider session 或自由文本 | Request 有 `parent`，Record 主要保存 requestId；父请求缺失时链条可恢复性尚未证明 | `open`；保留新 run 与 `retry-of` / `continued-from` 基线 | 仅凭保留记录恢复真实因果，父记录缺失有诚实 unknown；record retention 或关系改变时 revisit |

四项的共同 design-sub-item exit 是：每项有明确 owner 类别、反例、结构化结果和证据 standing；没有任何
一项可以因为“需要更可靠”而直接新增 runtime state、queue、registry 或自动化策略。完成这些
设计回返后，才可以进入 adapter contract / host fake / deterministic executor 的另行实现
计划；在此之前 WorkCell 仍是 `active-after-prerequisite`。

有限回返计划和 fixture envelope 记录在
[`records/workcell-open-relations-review.md`](records/workcell-open-relations-review.md)。它是当前 WorkCell
design candidate 的 planning projection，不是第二份协议，也不产生运行时保证。
该父 projection 已在 A/B/C/D 子记录完成后完成 reconciliation；当前 qualifier 为
`projection-reconciled / source-applicability-uncertain`，因为既有 A/B/C/D frozen source edge
与当前 protocol source 存在 drift。`Lagrange` 独立复读仅接受这次 bookkeeping，不改变四项
`retain-unknown / route-to-owner`、WorkCell `active-after-prerequisite` 或实现冻结。
本轮 A/B 的具体边界审查记录在
[`records/workcell-lifecycle-review.md`](records/workcell-lifecycle-review.md)；它发现了 bounded cutoff、迟到
effect、active revocation 和 RunRecord binding identity 的字段/owner 缺口，但 disposition
仍为 `retain-unknown`，没有改写 canonical protocol。
本轮 C/D 的观察与因果边界审查记录在
[`records/workcell-observation-lineage-review.md`](records/workcell-observation-lineage-review.md)；在没有真实
replay/recovery consumer 前，保留 Event 观察面和 canonical request/run relation authority，
不引入 event bus、lineage registry 或 provider session resume。

## 迭代记录要求

每个 item 的下一轮至少需要记录：

1. 本轮观察和来源；
2. item identity 是否保持，是否与最近邻或其他 item 合并/拆分；
3. 可证伪的 change hypothesis、baseline、最小 semantic delta 及其不改变的关系；
4. 正例、边界、回归、未覆盖和污染/失败；
5. 当前 disposition、owner/consumer 和接受关系；
6. 是否已 projection/move，若没有则说明保留在哪个 canonical source；
7. 采用后观察窗口、reopen/recurrence 或 `unknown`；
8. 下一轮的 return condition；
9. 是否改变了 plan 的阶段出口或 roadmap standing。

## 历史/迭代记录（默认折叠）

以下记录保留每轮观察、修订、review、projection 和 lineage；它们不拥有当前 standing，也不覆盖
上面的当前快照、总览、contract projection 或各自 canonical source。当前先读上面的索引，再按需要展开
历史记录；新的 round 继续追加在本折叠区，不在当前索引中重复复制。

<details>
<summary>展开历史/迭代记录</summary>

### 2026-08-24：主 goal 范围纠正

- 观察：前一轮 goal 只覆盖 skills 迁移，未覆盖整个 planning；
- 修订：将主 goal 扩展为整个 planning item ledger，skills review 保留为已完成分支；
- 当前可推进：哲学解读、archive inventory、设计开发 skills 形成、旧 eval 证据复核；
- 明确不推进：WorkCell/base/DeepSeek 系统实现和用户 harness 构想实现；
- 下一步：从 archive 文档/skills inventory 与哲学解读的 bounded 计划中选择最小实际贡献。

### 2026-08-24：第一批设计/开发候选 review

- 观察和来源：审查 `disciplined-development`、`practice-cycle`、`work-estimation`、
  `code-review`、`structural-refactoring`、`mechanism-design-review`、`project-cognition` 的
  archive 正文、历史评估、living owner 和当前 plan；局部只读返回已由 Main 综合。
- identity/边界：前三者不合并；`practice-cycle` 限定为结果改变下一实践；代码审查、行为保持
  重构、机制设计审查和项目认知也各有独立主要判断，不合并、不拆分。
- disposition：前六项保留为 `candidate-next`（其中 code/refactor 等待真实 code consumer，
  mechanism 优先等待 WorkCell design probe）；`project-cognition` 收敛为 `no-proposal-now / archive-only`。
- evidence：历史材料最多提供 archive-backed `behavior-observed` 或局部 boundary observation；
  当前分支尚无 fresh matched improvement 或 regression-supported acceptance。
- 最小改变：新增 `planning/records/design-development-review.md` 作为 review record；不创建 `.agents/skills`
  新载体、不移动 archive、不建立第二个 planning/project cognition、不开 WorkCell/base 实现。
- 下一轮 return：先做 mechanism-design-review 的 WorkCell 反例 probe，再在真实 planning/design
  case 中验证 practice-cycle/work-estimation；code review/refactor 直到真实代码变更；project
  cognition 先等待 named later actor 和 decision delta。
- 阶段影响：phase 1 仍 active；新增了可回读的中间出口，但没有满足进入 WorkCell 反复设计的完整
  阶段出口，也没有改变 roadmap 顺序或实现授权。

### 2026-08-25：project-cognition no-proposal disposition

- **触发与来源：** `project-cognition` archive candidate 的历史正例、temporary-model 边界和 scale-control
  反例，连同当前 [`item-ledger.md`](item-ledger.md)、`records/archive-skill-inventory.md` 与
  `records/design-development-review.md` 的 owner map，见 [`records/project-cognition-disposition.md`](records/project-cognition-disposition.md)。
- **最小改变：** current planning 没有 named later actor、重复 consumer、真实重建成本或 item-ledger
  之外的 decision delta；现有 planning projection 已是更近的 current owner。因此将 candidate 从
  `hold` 收敛为 `no-proposal-now / archive-only`，不创建 `.agents/skills/project-cognition/`、第二
  cognition projection 或 portable mirror。
- **独立 review：** `Codex` 于 `2026-08-25` review 认为处置实质成立；修订后要保持三处 projection
  同步。review 没有取得当前 portability、regression、external verifier、retention owner 或 acceptance
  证据，这些继续是 unknown。
- **出口与回返：** 只有 named later actor、真实重复重建/遗漏观察、decision delta、external verifier/
  retention owner 和接受关系共同出现时 reopen；archive source 保留，不删除、不改写为当前 authority。

### 2026-08-25：P01/P03 counterexample fixture

- **触发与来源：** P01/P03 父 item review 的独立 reviewer 指出原有反例仍偏抽象；回到
  `theory/philosophy.md`、P01/P03/P04 readings、`design/work-cell-protocol.md` 和 C/D observation
  review，建立 [`records/philosophy-p01-p03-counterexample-fixture.md`](records/philosophy-p01-p03-counterexample-fixture.md)。
- **最小改变：** 形成 A–D 四组 route-changing pairs：材料与规律、调查资格与 known/tested、观察改变
  下一实践与重复、检验手段/时点与下一认识改变；明确 conditional/historical facts 不成为 current
  authority，不修改哲学 source。
- **独立 review：** `Codex` 于 `2026-08-25` 接受 fixture-level review；窄范围未独立读取 P02/P15/P16
  canonical files，因此其区别只保留为 bounded fixture claim，不宣称完整 source review。
- **当前 standing：** fixture 为 `source-current / design-boundary-observed / independent-review-complete /
  acceptance-pending`；P01/P03 reading、行为、named acceptance 和 WorkCell/runtime authority 仍未成立。
- **下一 return：** 在真实 host fixture、source-backed package 或 named acceptance owner 出现后检验
  reading route；若区别不能改变判断，回到父关系合并/拆分或 `no-proposal`，不扩写哲学条目。

### 2026-08-24：WorkCell mechanism candidate probe

- 对象和来源：以 `design/work-cell-protocol.md` 的 `Binding`、`Run`、`RunRecord`、Event、
  MechanicalCheck/SemanticReview/AcceptanceDecision、取消排空和 retry/continue lineage 为
  mechanism review 对象；用当前设计候选和 0.5 的已记录混合边界作 source/inference 分离。
- identity/origin/destination：保留 host-owned effect boundary、coordinator-owned run lifecycle、
  fact record 与 external semantic/acceptance authority 的分离；其起因是旧 `CellInput`、status、
  provider session 和验收含义混在一起，目标是保留失败后效果、取消未知效果和新 run 因果。
- 最小 treatment：`keep` 现有分层，不增加通用 registry、review queue、自动 retry 或新的万能
  action vocabulary；把四个尚未闭合的 lifecycle/record relation 写为 design unknown 和验收
  反例，而不是用额外状态掩盖它们。
- 新开放项：不合作 executor 的 bounded drain/unknown effect；active run 的 Binding expiry/revocation；
  Event 的顺序/去重/重放；retry/continued lineage 在 request/run record 不完整时的可恢复性。
- disposition：WorkCell 仍为 `active-after-prerequisite` design candidate；mechanism-design-review
  保持 `candidate-next with prerequisite`。本 probe 没有完成协议 acceptance，也没有产生实现授权。
- 下一轮 return：由 host/security、protocol、evidence/acceptance owner 分别给出上述关系的
  owner、反例和可检验结果；在此之前保留 baseline、unknown 和 implementation hold。

### 2026-08-24：第二批 archive candidate review

- 观察和来源：审查 `agent-tooling`、`agent-environment`、`task-shaping`、`systems-engineering`
  的 archive 正文、references、历史评估和当前 WorkCell/planning owner map；记录见
  [`records/next-candidate-review.md`](records/next-candidate-review.md)。
- identity/边界：工具层操作与用户环境 source/reconciliation 不合并；task shaping 与委派拓扑、
  domain semantic partition 不合并；whole-system reliability 不等同于 WorkCell execution 或
  普通 planning。
- disposition：`agent-tooling` 当前 branch 收敛为 `no-proposal-now / archive-only`；其余三项为
  `candidate-later`。没有任何新 carrier、portable move、runtime mechanism 或实现授权。
- evidence：历史材料提供局部 action/boundary/provisional evidence；当前 branch 尚无相应真实
  consumer、fresh matched round 或 regression-supported acceptance。
- 依赖：agent-environment 依赖 desired source/target/authorization；task-shaping 依赖 reference
  profile 与 domain handoff；systems-engineering 依赖具体 whole behavior、failure consequence
  与 residual-risk owner；agent-tooling 依赖冻结 harness task 和 rollback。
- phase 影响：phase 1 的 candidate map 更完整，但 WorkCell 阶段门槛、DeepSeek system 顺序和
  实现边界均不改变。

### 2026-08-25：agent-tooling current disposition

- **触发与来源：** A1/A2 的下一 candidate map 曾把 `agent-tooling` 标为唯一 `candidate-next`；
  回读 archive skill、历史 first-slice、当前 planning consumer 和最近邻 owner 后，新增
  [`records/agent-tooling-disposition.md`](records/agent-tooling-disposition.md)。
- **最小改变：** 历史方法只涉及具体任务上的已安装 harness execution surface / burden；当前主
  任务是 planning/WorkCell 前置审查，没有 ordinary/lean tooling task、installed surface、
  permission profile、rollback 或 named tooling consumer，因此不把 planning 当作 tooling consumer。
- **独立 review：** `Goodall`（Agent `01a03883-ed7f-71b0-ac1d-7ab753d93fad`）初轮指出 proposal
  reopen 与 material probe 条件、route 语言和当前状态范围需要区分；修订后接受记录，未修改文件，
  未运行 tooling probe，也未取得 acceptance。
- **当前 standing：** `source-observed / no-proposal-now / archive-only /
  independent-review-complete / acceptance-pending`；历史 action/boundary 观察仍保留，当前
  behavior、matched、regression、portable 和 runtime standing 均未成立。
- **阶段影响：** 当前 branch 少一个没有 consumer 的 carrier/probe 提案，但 archive、未来 reopen
  条件和其他三项 candidate-later 不变；不扫描或修改用户环境，不改变 WorkCell/DeepSeek/实现冻结。
- **下一 return：** named tooling consumer、具体 task envelope 和可观察 burden/gap 出现后，先
  重新打开 proposal；随后才决定是否建立无写入 ordinary/lean matched probe。

### 2026-08-24：全局 planning coverage audit

- 观察和来源：`planning/plan.md`、`roadmap.md`、`inbox.md`、`theory/research/`、`evals/`、
  `experiments/` 和 `.agents/skills/` 的 object/standing 不完全相同；P01–P16 此前只作为一个
  合并 item，迭代闭环的 theory standing 也未在总账中单独投影。
- 最小改变：新增 [`coverage-audit.md`](index/coverage-audit.md)，在父 item 下登记 16 个有限 reading
  work package，登记
  iterative-improvement 的静态接受/行为 `adapt-and-retest`，并把 research、eval records、
  generated-only artifacts、experiments 和 incubating skills 的非 item 边界写明。
- identity/authority：不修改哲学源行、理论正文、research/eval record 或实验原型；coverage
  audit 是可退役的 planning projection，不取得任何 canonical authority。
- 当前 disposition：P readings 与迭代闭环保持 `active-now`；generated-only eval 目录保持
  `hold/archive-only`；没有新增 skill、runtime 或实现授权。
- 下一轮 return：形成一个低风险 P01/P03 reading draft，并在一个真实 planning item 上完成一次
  可回读的迭代 round；两者都需独立 review 与明确接受关系，证据不足时返回 `unknown`。

### 2026-08-24：P01/P03 reading candidate

- 观察和来源：父 item 的 source line 已稳定，P01/P03 具有可区分的来源/循环关系，但
  `theory/philosophy/Pxx.md` readings 尚未重建；`theory/research/philosophy-gene-one.md` 同时
  保留历史审次和当前裁决，不能直接当作 reading 正文。
- 最小改变：新增 [`theory/philosophy/P01.md`](../theory/philosophy/P01.md) 与
  [`theory/philosophy/P03.md`](../theory/philosophy/P03.md) 两个 `reading-candidate`，只写来源、
  定义、最近邻、生成性例子、未知和 review 出口；不改 `theory/philosophy.md`。
- 关系保持：P01 保持“来源/实际→规律”，P03 保持“实践观察改变下一认识/实践”；二者均不取得
  skill、协议、权限、acceptance 或 runtime owner。
- 当前 disposition：candidate draft；source-current，reading-pending，research-open；没有
  独立 review 或 reading acceptance。
- 下一轮 return：对 P01/P03 做独立 source/nearest-neighbor review，并补父 item 的交叉关系；若
  review 发现定义不能区分最近邻，回修 candidate，不复制新的 source 或 skill。

独立 review 的当前记录见 [`records/philosophy-reading-review.md`](records/philosophy-reading-review.md)；本轮
因 reviewer 未返回而保持 `uncertain`。

### 2026-08-24：planning coverage iteration round

- **baseline / observation：** 总 ledger 只有一个粗粒度 P01–P16 项，缺少 research/eval/experiment
  的 source-family 覆盖说明，也没有 Pxx reading；这限制了下一步究竟是补读、补方法还是补
  evidence 的判断。观察来源是当前 `plan`、`roadmap`、`inbox`、living theory、research、evals、
  experiments 和 `.agents/skills` 的真实目录与 standing。
- **change hypothesis / minimum delta：** 保留一个父哲学 item，在其下建立 reading work package；
  增加 coverage projection；只生成 P01/P03 candidate，不修改 P source、理论、skill 或 runtime。
- **review / evidence：** 独立只读审查确认 16 个 package 有真实 source line，但不能成为 16 个
  canonical item；`git diff --check`、尾随空格检查和 `ruby scripts/validate-skills.rb` 通过。上述
  只支持结构/格式观察，不支持 reading 正确性或行为改善。
- **acceptance / projection：** 当前没有 named acceptance owner，因此处置为 `uncertain`；本轮
  只投影到 `coverage-audit.md`、`item-ledger.md` 和两个 `reading-candidate`，没有 move 到
  portable skills，也没有改写哲学源。
- **adoption window / regression：** `N/A`，因为 candidate 尚未被接受或采用；不能把没有观察
  到回归写成“零回归”。下一轮需独立 review P01/P03，并在一个真实 planning item 上完成相称的
  accepted/unknown round。

### 2026-08-24：WorkCell 开放关系回返计划

- 观察和来源：四项未知已在协议 §17.2、设计验收标准 §18 和本 ledger 中重复出现，但此前只有
  item 描述，没有一个能交给 owner 逐项回返的最小 review 形式。
- 最小改变：新增 `records/workcell-open-relations-review.md`，统一记录受众、owner 类别、fixture
  envelope、四组反例、结构化结果和 revisit 条件；不修改协议 canonical semantics。
- 形式处置：选择有限 planning/review record；不创建 skill、eval ledger、runtime registry、
  event bus 或实现任务。
- 当前 standing：`design-review-plan`；四项仍 `open`，没有 matched evidence，也没有实现授权。
- 下一轮 return：真实 owner 先回返 bounded drain 与 Binding expiry/revocation；若 owner、真实
  consumer 或 source 改变，再开新 round 并保留 lineage。

### 2026-08-24：WorkCell A/B 生命周期边界回返

- **观察和来源：** 重新核对 `design/work-cell-protocol.md` §5.1、§6.2、§6.5、§7、§9、§17.2、§18，
  并使用四个最小 fixture 审查 bounded drain/unknown effect 与 active Binding expiry/revocation；
  当前 design content hash 为 `00a7ec7f4b6e11771f5774e2f5511f5c73df2552`。
- **identity / boundary：** `Spec → Binding → RunRequest → Run → RunRecord` 保持不变；A 被
  区分为 host cutoff、coordinator lifecycle close、effect observation 和 late evidence；B 被
  区分为 admission snapshot、host/security policy、active-run outcome、effect confirmation 和
  record audit identity，不与 executor/provider 选型合并。
- **最小改变：** 新增 [`records/workcell-lifecycle-review.md`](records/workcell-lifecycle-review.md)；记录 A2
  无界 draining、A3 缺少回执误判无 effect、A4 迟到事实无 lineage，以及 B1/B2/B3/B4 对 snapshot、
  active policy、撤销和 binding identity 的反例。没有修改 `design/` canonical，不增加 runtime
  state、权限机制、event bus、自动 retry 或实现任务。
- **当前 disposition：** A、B 均为 `retain-unknown`；候选最低关系是“host/security 拥有 cutoff
  和撤销 authority，coordinator 有界收尾，record 保留 observed/unknown 分离”，但没有真实
  owner 或字段合同，不能写成 accepted design。RunRecord 示例缺少 bindingRef/digest 与正文
  “保存引用”的不一致，已作为 protocol/record owner 的待决项登记。
- **evidence / acceptance：** 仅有 `design observation`，无 host/security review、matched Run、
  independent protocol acceptance 或 adoption window；不能宣称收敛或零回归。
- **下一轮 return：** 由真实 host/security owner 决定 A cutoff 和 B active policy，再由
  protocol/record owner 确定终止/效果/Binding identity 的 canonical 载体；在此之前 WorkCell
  仍为 `active-after-prerequisite`，C/D 保持原 open round。

### 2026-08-24：WorkCell C/D 观察与因果边界回返

- **观察和来源：** 重新核对 `design/work-cell-protocol.md` §6.1、§6.5、§7、§8.2、§9.3、§17.2、§18，
  审查 typed Event 的观察/重放边界，以及 `retry-of` / `continued-from` 在父请求或记录不可取
  时的可恢复性。
- **identity / boundary：** C 区分 typed observation 与 replay contract；D 区分新 request/run、
  canonical parent relation、retention 和 provider session；不把两组关系合并成一个 trace 或
  session 语义。
- **最小改变：** 新增 [`records/workcell-observation-lineage-review.md`](records/workcell-observation-lineage-review.md)，
  用 C1–C4、D1–D4 反例和有限候选关系固定当前边界；没有修改 `design/` canonical，不新增
  event bus、replay store、lineage registry、session resume 或实现任务。
- **当前 disposition：** C、D 均为 `retain-unknown`。当前最小方向是：没有真实 replay/recovery
  consumer 时，Event 不承担完整事实重建，RunRecord 与保留的 canonical request/run relation
  负责 authority；缺失关系只能返回 unknown。真实 consumer、retention owner 和字段合同仍未知。
- **evidence / acceptance：** 仅有 `design observation`，无跨进程 replay、重启恢复、retention
  review、independent acceptance 或 adoption window；不能宣称已收敛。
- **下一轮 return：** 命名真实 Event/recovery consumer，或由 protocol/record owner 明确接受
  observation-only / bounded-lineage contract；在此之前四项共同阶段出口未满足，WorkCell 仍
  为 `active-after-prerequisite`。

### 2026-08-24：practice-cycle / work-estimation 载体候选

- **观察和来源：** archive 的两个窄方法与当前 `iterative-improvement` theory、item ledger、
  WorkCell A/B/C/D review 共同显示两个重复 planning 判断：实践结果怎样改变下一步，以及粗粒度
  目标怎样拆为必要工作图和发现分支。
- **准入与 identity：** `practice-cycle` 与 `work-estimation` 的触发时序、主要判断、失败边界
  和验证关系不同，不合并；前者不是总闭环，后者不是预算/资源批准。二者均不取得 theory、
  planning authority、runtime 或 acceptance owner。
- **最小改变：** 新增 `.agents/skills/practice-cycle/SKILL.md`、`.agents/skills/work-estimation/SKILL.md`
  作为 project-local incubation candidates，并新增 [`records/method-skill-probe.md`](records/method-skill-probe.md)；
  从 archive 迁移语义后按当前项目 owner/standing 规则重写，不复制 archive 正文或 references。
- **行为和证据：** 实际 WorkCell planning 从“完成设计”粗项转为 A/B、C/D review 和 owner/consumer
  return；结果改变了下一实践与工作图粒度，达到 `behavior-observed`。这是 Main 自用 probe，
  不是 matched improvement、independent semantic review、portable acceptance 或 regression。
- **当前处置：** 两个 candidate 均 `retain-incubation`；`skills/` 不存在；WorkCell、DeepSeek
  system、base/runtime 和用户 harness 构想仍无实现授权。
- **下一轮 return：** 在不同 planning/design case 上建立 baseline/treatment，覆盖正例、反例、
  最近邻、一步任务和回归；若现有 theory/ledger 已足够或没有独立 consumer，则返回 `no-proposal`
  或 demote。

### 2026-08-24：P01/P03 parent 第二轮方法对照

- **观察和来源：** 以 P01/P03 reading parent 作为不同于 WorkCell lifecycle 的 planning/design case，
  使用固定 source/task 输入，分别执行不加载候选与只加载一个候选的内部只读对照；来源 hash、
  runner 身份和输出限制见 [`records/method-skill-probe-round-2.md`](records/method-skill-probe-round-2.md)。
- **practice-cycle 结果：** baseline 已能找到独立 review；treatment 更明确把“继续补写/接受/实现”
  收敛为 independent semantic review probe，并保留 owner/unknown；行为观察成立，但 matched
  attribution unknown。
- **work-estimation 结果：** baseline 已能恢复必要工作图和 discovery branches；treatment 将 N0–N4、
  acceptance gate、真实 consumer 分支和不需要 token/time 的粒度写得更显式；不能归因于候选，
  attribution 仍 unknown。
- **过程与处置：** 外部严格 `codex exec` runner 因私有文档外发风险被拒，未形成有效 eval Run；
  内部 Agent 返回只读结果，运行前没有预冻结严格 card。随后独立 reviewer `Epicurus` 审查了
  record，确认 baseline 已有相近核心判断、matched/adopt 不成立，两个 candidate 均保持
  `adapt-and-retest`；证据为低强度 `behavior-observed`，不 adopt、不 portable、不改变 P01/P03
  acceptance。
- **下一轮 return：** 先冻结 core card 和同一 runner identity，再加入“简单任务拒绝过度规划”和
  “需要 discovery branch”的区分性正/反例，并由未参与生产的 reviewer 盲审；若仍不可区分，考虑
  `no-proposal` 或 demote，而不是继续扩张 skill。

### 2026-08-25：practice-cycle round 3 frozen comparison

- **触发与来源：** 遵循 round 2 的下一回返，新增冻结 core card、同一 task 中的简单一步反例与
  设计 discovery 正例；来源、task、candidate、protocol 和 AGENTS hash 见 freeze receipt。
- **生产与观察：** baseline `Copernicus` 与 treatment `Cicero` 分别只读运行；Case A 都选择
  直接收口，Case B baseline 选择窄 owner/authority route，treatment 选择较宽的 continue/discovery
  branch。原始输出分别保存，未修改 source、skill 或 WorkCell design。
- **独立 review：** `Parfit` 指出 Case B treatment 过宽，且两份 output schema 不一致；两个 runner
  identity 不同，activation 只有 self-report，model/harness/workspace/role visibility unknown。
  见 `evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md`。
- **standing 与处置：** `behavior-observed / attribution-uncertain`；round disposition 为
  `adapt-and-retest`。不支持 matched-improvement、regression-supported、adoption、acceptance 或
  portable move；`practice-cycle` 继续 `retain-incubation`。
- **下一轮 return：** 不编辑 frozen card；用同一可核验 runner/model/harness/workspace identity 重跑
  窄 Case B，补 activation proof，强制统一结构化 output schema，并由新 reviewer 检查最小性和 route；
  identity 若仍 unknown，则保留 attribution 上限，不用重复次数制造 matched 结论。

### 2026-08-25：practice-cycle round 4 回归前置条件审查

- **触发与来源：** round 3 review 要求补齐可核验 runner/model/harness/workspace identity、真实
  activation proof、统一 output schema 和更窄的 Case B；本轮先按 `practice-cycle` 的“结果 → 最小
  下一实践/route”判断检查这些条件是否已具备。
- **最小贡献：** 新增 [`records/method-skill-probe-round-4-precondition-review.md`](records/method-skill-probe-round-4-precondition-review.md)，
  将 E0 命名 eval/runner owner、E1 新 frozen card、E2 identity/activation、E3 窄 case、E4 独立
  review、E5 standing 回写恢复为顺序工作图；没有 E0–E2 不开 Run。
- **当前处置：** `source-observed / precondition-review-complete / independent-review-complete /
  route-to-owner / acceptance-pending`；没有新 Run、matched、regression、adoption 或 acceptance
  standing。`practice-cycle` 继续
  `retain-incubation / attribution-uncertain / adapt-and-retest`，`work-estimation` 不另开无区分度 round。
- **阶段影响：** WorkCell、DeepSeek Harness、base/runtime 和用户 harness 构想仍冻结；该记录不创建
  eval queue、runtime guarantee、机制、portable skill 或实现授权。
- **下一 return：** 先取得 named eval/runner owner 和四项可回读前提；无法取得时收敛为
  `no-proposal-now`，保留历史 behavior observation，不用重复次数制造因果结论。

### 2026-08-24：mechanism-design-review candidate 形成与独立 review

- **观察和来源：** archive 的机制设计审查与 WorkCell 四项开放关系共同显示一个可重复的设计
  判断：面对新增 state/record/queue/retry/gate/registry 等提案，先判断真实对象、来源、目标和
  owner，再比较 prompt、已有 owner、确定性边界与新增机制的全生命周期负担。当前 first consumer
  是 `design/work-cell-protocol.md`。
- **最小改变：** 形成 `.agents/skills/mechanism-design-review/SKILL.md` 项目内 candidate；初版
  review 后按独立 reviewer 意见补 review unit、case-level observed/hypothetical、最近邻路由、
  source lineage、project adapter 和 return contract。不复制 archive references，不创建 runtime
  gate、review queue、registry 或实现任务。
- **独立 evidence：** `Jason`（`01a03787-cf5d-7383-9110-b1941e3670a3`）独立审查载体，确认核心
  判断可指认、source-backed，且没有直接越权；同时发现 review unit、路由、lineage 和返回关系
  不足。该 review 不是 acceptance，也没有 matched baseline/treatment 或 adoption window。
- **当前处置：** `rewrite + retain-incubation`；证据为 `format-valid` + planning-level
  `behavior-observed`，matched、portable、acceptance、regression 均未知。完整记录见
  [`records/mechanism-design-review-candidate.md`](records/mechanism-design-review-candidate.md)。
- **阶段影响：** 设计开发方法 candidate 从两个增为三个，但 phase 1 仍 active；WorkCell 仍为
  `active-after-prerequisite`，DeepSeek Harness、base/runtime 和用户 harness 构想仍无实现授权。
- **下一轮 return：** 冻结同配置 baseline/treatment，覆盖机制压力正例、prompt/owner 足够反例、
  最近邻路由案例和 adoption/regression unknown；若仍不能稳定区分，返回 `rewrite`、`demote` 或
  `no-proposal`，不继续扩张载体。

### 2026-08-25：mechanism-design-review round 1 baseline/treatment 回返

- **冻结与来源：** card、task、candidate 和 upstream source 已写入 frozen manifest；baseline/treatment
  raw outputs 与 SHA-256 见 [`records/mechanism-design-review-round-1.md`](records/mechanism-design-review-round-1.md)。
- **观察：** M1/M2/M3 的 recommendation 在两次运行中分别一致为 `mechanism-candidate`、
  `no-proposal`、`route-unknown`；treatment 对 owner、硬关系、邻近路由和停止/effect boundary
  更明确，但由于 runner 的 full model/system/harness identity 不可独立核验，不能归因为 matched improvement。
- **standing：** `format-valid` + `behavior-observed`，局部 `boundary-supported`；matched attribution、
  acceptance、adoption 和 regression 为 `unknown`。没有文件安装、外部效果、runtime state 或实现授权。
- **处置：** round disposition 为 `adapt-and-retest`；载体继续 `rewrite + retain-incubation`，不 portable、不 adopt、
  不改 WorkCell acceptance。
- **独立 review：** `Jason`（`01a03787-cf5d-7383-9110-b1941e3670a3`）确认 M1 为 fixture-stipulated 的
  条件性机制观察，M2 negative boundary 成立，M3 需补 `skill-formation` 路由；差异不足以支持 matched improvement。
- **下一 return：** M1 补 named replay consumer、record/retention owner、重启/重复/乱序/缺口 fixture；保留
  M2 negative 与 M3 nearest-owner case；独立 reviewer 回写后再判断是否 `retain-baseline`、`no-proposal` 或继续回返。

### 2026-08-24：P01/P03 独立 source/边界 review

- **观察和来源：** 独立 reviewer `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）只读
  审查 `P01.md`、`P03.md`、`philosophy.md`、`gene-expression.md` 与本 item 的 reading review；
  未参与 candidate 生产、未修改文件，也未把 Main 自审或格式检查当作 acceptance。
- **source/identity：** P01 的来源—材料—规律关系、P03 的实践—认识—再实践—再认识关系均足以
  保留 candidate；P03 的“下一判断或行动改变才构成深化”仍是解释性操作化标准，不取得 source
  authority 或通用 acceptance gate。
- **最近邻与反例：** P01/P02/P04/P15、P03/P01/P15/P16 的方向区分成立，但仍需“有材料但调查
  不足”“材料未支撑规律”“重复实践未改变”“改变判断但未形成下一实践”等成对反例；父 item
  还缺共同 object identity 与 P01 source→P03 observation 的具体链条。
- **当前 disposition：** P01、P03 均 `retain-candidate`；父 item 为
  `unknown / independent-review-complete / acceptance-pending`。没有接受 reading、portable skill、
  WorkCell/runtime 或实现授权。
- **最小改变与投影：** 将独立 review 追加到 [`records/philosophy-reading-review.md`](records/philosophy-reading-review.md)，
  并把 P01/P03、coverage、plan 的 standing 从 `independent-review-pending` 更新为
  `independent-review-complete / acceptance-pending`；没有修改哲学源行。
- **下一轮 return：** 补父 item object identity、P01 source→P03 observation 链条和成对反例；若
  acceptance owner 仍未知，保持 `acceptance-pending / unknown`，不因独立 review 完成而标 accepted。

### 2026-08-25：P01/P03 父 item 交叉关系 review

- **触发与来源：** 上一轮独立 review 明确缺少共同 object identity、P01 source→P03 observation
  链条和父 item 成对反例；回到 `philosophy.md`、`gene-expression.md`、P01/P03 readings、
  `coverage-audit.md` 与下游 iterative theory，新增 [`records/philosophy-parent-review.md`](records/philosophy-parent-review.md)。
- **最小改变：** 以临时 handle `认识阶段的来源—深化关系` 建立 scoped parent projection；明确共同
  identity 是 source-backed inference，不是新增“一”或哲学条目；把箭头解释为来源约束与观察回返，
  不把 P01 source 直接写成 P03 observation；补固定对象的 P01→P03 四段生成性案例。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）确认关系基本忠实、
  P01/P03 与 P02/P04/P15/P16 的主要邻近区别成立；具体成对反例仍不足以支持 accepted reading。
- **当前 standing：** P01/P03 继续 `retain-candidate`；父关系为 `source-current / cross-relation-observed /
  independent-review-complete / acceptance-pending`；named acceptance owner、完整 P01–P16 cross-relation
  和 reading 行为影响仍 `unknown`。
- **阶段影响：** 哲学 reading 分支形成一个可回读的父关系中间出口，但不关闭 P01–P16 父 item，
  不改哲学源，不产生 skill、WorkCell、DeepSeek 或 runtime 实现授权。
- **下一 return：** 在 P04/P15/P16 package review 中补具体成对边界案例；若新证据要求合并/拆分，
  开新 candidate round，不倒写本记录；在 named acceptance owner 与 rubric 出现前继续保持 pending。

### 2026-08-25：P04 reading candidate 与独立 review

- **触发与来源：** P01/P03 父关系 review 保留了“有材料/有实践不等于已知/已检验”的边界缺口；
  回到 `philosophy.md` P04、`gene-expression.md` 的认识生成链、P01/P03 readings 与
  P01/P03/P08/P15/P16 cross-relation，新增 [`theory/philosophy/P04.md`](../theory/philosophy/P04.md)。
- **最小改变：** 只形成 P04 reading candidate，定义“当前证据足以称知/不足则保留 unknown”，
  并区分 P01 来源、P02 调查资格、P03 深化、P08 问题边界和 P15 检验手段；不把 unknown 写成
  评分、拒答 gate、route/stop 权限或 acceptance rule。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）确认 source fidelity
  和最近邻成立，建议把可回返方向限定为需要交接的 planning/evidence context，并把 domain/use
  证据充分度与 acceptance owner 的接受决定分开；该修订已回写 candidate。
- **当前 standing：** `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`；处置 `retain-candidate`，无 behavior、matched、regression
  或 acceptance evidence。
- **阶段影响：** P01–P16 父 item 下从两个增为三个 reading candidate；phase 1 仍 active，P04
  不关闭父 item，也不产生 skill、WorkCell、DeepSeek 或 runtime 实现授权。
- **下一 return：** 用 P04/P15/P16 具体成对案例检查知识状态、检验手段、检验时点和下一判断是否
  混淆；若 boundary 不能稳定区分，回修 candidate，不修改哲学源。

### 2026-08-25：P04 / P15 / P16 boundary fixtures

- **触发与来源：** P04 独立 review 要求把“已知/未知”与 P15 的实践检验手段、P16 的检验时点
  分开；回到三条 source、`gene-expression.md` 的“手段×时点”关系、WorkCell Binding design
  baseline 与 mechanism round raw evidence，新增 [`records/philosophy-p04-p15-p16-boundary-review.md`](records/philosophy-p04-p15-p16-boundary-review.md)。
- **初始问题与修订：** 初版 B2 错把 Event/replay mechanism round 的对象放入 Binding immutability
  固定对象集合；独立 review 发现 object identity 断裂。已将 B2 改为同一 Binding 对象上的
  hypothetical host fixture，并把 mechanism raw output 降为独立 attribution 旁证。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）复核 B1-B4 同一对象
  成立；P04 只表达局部 knowledge state，P15 只表达相称 practice/test method，P16 只表达
  time coverage，三者不取得 acceptance、长期 runtime guarantee 或实现授权。
- **当前 standing：** B1/B3/B4 为 `boundary-supported`；B2 为 `boundary-supported as hypothetical /
  evidence-unknown`；整体 `design-boundary-observed / independent-review-complete / acceptance-pending`。
  P04 继续 `retain-candidate`；P15/P16 不创建 reading candidate。
- **阶段影响：** 父 item 关系得到一组可回读的最小边界 fixtures，但没有提升哲学 reading acceptance，
  不产生真实 host Run、matched improvement、adoption、WorkCell 或 runtime 实现授权。
- **下一 return：** 未来出现真实 host fixture 时，分别记录 outcome、时点覆盖、归因和 acceptance；
  当前不把 hypothetical fixture 或机制 round 的旁证升格为实践证据。

### 2026-08-25：P05 reading candidate 与独立 review

- **触发与来源：** P04/P15/P16 boundary review 后，分析阶段仍缺“特殊条件是否真正改变分析”的
  reading；回到 `philosophy.md` P05、`gene-expression.md` 特殊性环节、P05 research 与现有
  WorkCell design/fixture records，新增 [`theory/philosophy/P05.md`](../theory/philosophy/P05.md)。
- **最小改变：** 只形成 P05 candidate，定义为识别会改变当前分析的对象/条件/关系/目的差异；
  区分 P01/P04/P06/P07/P08/P09，不把具体性变成背景收集、无限定制、任务排序或 runtime 规则。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）确认 source fidelity
  和最近邻成立；要求把“改变处置”降为“使下游 owner/protocol 重新评估处置”，并补一正一反
  成对案例。修订已回写 P05。
- **当前 standing：** `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`；处置 `retain-candidate`，无 behavior、matched、regression
  或 acceptance evidence。
- **阶段影响：** P01–P16 父 item 下从三个增为四个 reading candidate；phase 1 仍 active，P05
  不关闭父 item，不产生 skill、WorkCell、DeepSeek 或 runtime 实现授权。
- **下一 return：** P05/P07/P09 与 P05/P08 的 C1-C4 父关系 fixture 已独立复核；后续若新增具体
  案例不能改变分析，回修 P05 或返回 `no-proposal`，不创建万能定制载体。

### 2026-08-24：P05 / P07 / P08 / P09 交叉边界 review

- **触发与来源：** P05 candidate 的下一 return 要求用具体案例检验它与 P07 入手点、P08 问题
  边界、P09 主次的区别；回到 `philosophy.md` 四条 source、`gene-expression.md` 生成链、
  `philosophy-gene-one.md` research、P05 candidate 与 WorkCell Binding expiry/revocation design
  question，新增 [`records/philosophy-p05-p07-p08-p09-boundary-review.md`](records/philosophy-p05-p07-p08-p09-boundary-review.md)。
- **最小改变：** 用同一 design object 建立 C1-C4；C1 采用单变量特殊条件，C2 把“易/可行”限定
  为生成性的可取得/可局部处理/后果可控表达，C3-B 明确为固定对象外的 scope comparator，C4
  只保留 hypothetical main-conflict candidates。P07/P08/P09 不因此创建 reading candidate。
- **独立 review 与修订：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）先返回
  `uncertain / revision-pending`，指出变量混合、P07 语义退化、scope/unknown 混淆和 P09 越权；
  Main 只做上述最小修订后，reviewer 二次确认关系可标 `independent-review-complete`，并要求
  C3 的 out-of-scope 不计作当前 P04 unknown。reviewer 未修改文件，也未取得 source、reading、
  theory、skill、runtime 或 acceptance 权。
- **当时 standing：** 关系 `design-boundary-observed / independent-review-complete / acceptance-pending`；
  P05 继续 `retain-candidate`，P07/P08/P09 当时为 `reading absent / boundary-fixture-only`。没有
  behavior Run、matched comparison、regression、哲学/reading acceptance 或 WorkCell implementation
  authorization；C2 的真实 contract 区分能力和 C4 的真实 owner 主次稳定性仍 unknown。之后 P07/P08/P09
  已分别形成并完成独立 source/reading review，本历史 round 不取得它们的 reading acceptance。
- **阶段影响：** coverage、plan、roadmap 和 P05 reading review 已同步；当前 `.agents/skills/` 的
  11 个载体也已在 coverage/ledger 分开记录为 8 个既有 incubation 与 3 个本轮 candidate，没有
  创建 `skills/` 镜像。phase 1 仍 active，WorkCell、DeepSeek Harness 和 base/runtime 仍未获实现授权。
- **下一 return：** 补其他父 item relation 的相称成对案例；若真实 domain contract 或 owner 观察
  无法稳定区分 P07/P08/P09，回到 boundary-uncertain 或 no-proposal，不把关系文字扩大成 reading、
  runtime gate 或新的总 workflow skill。

### 2026-08-25：phase-1 bounded clarification allowance 与 phase-complete review

- **触发与来源：** 当前 `plan.md` 的“阶段出口”列出四项最小条件，但“还要做”又明确完整
  P01–P16 readings、父 item cross-relation 和真实接受迭代尚未完成；这使“可以开始有限澄清”
  与“phase 1 complete”发生概念混用。回到 `plan.md`、`roadmap.md`、`coverage-audit.md`、
  skill/eval standing 和本 ledger，新增 [`phase-1-exit-review.md`](phase-1-exit-review.md)。
- **初次 review 与最小修订：** `Kant`（`01a03792-3537-7960-a2cb-ea1ab05fd389`）确认四项
  证据足以支持有限澄清 candidate，但不足以支持 accepted exit；确认未闭 readings、父关系、
  迭代接受和 owner unknown 阻止 `phase-complete`。初次 review 指出原 `stage-entry gate` 只是
  对 plan 既有有限澄清例外的临时命名；Main 将其改称
  `bounded-next-stage-clarification allowance`，补充允许范围、phase commitment projection
  与 owner/decision/失效条件 unknown。
- **当前 standing：** allowance 为 `candidate-observed / independent-review-complete /
  acceptance-pending`；`phase-complete` 为 `not-established / continue`。WorkCell 仍
  `active-after-prerequisite`，DeepSeek Harness 与 base/runtime 仍未授权；本记录不产生正式
  phase transition、protocol acceptance、implementation plan 或 eval Run。
- **允许范围与下一 return：** 在明确 owner/decision 前，只做 source/standing review、设计反例、
  fixture contract 和有限 semantic review；补其它 planning item 与父关系的有界贡献。Kant 二次
  review 确认 allowance 与 phase-complete 的行动边界、父 item work package 表达和无实现授权；
  owner/decision/失效条件仍未知。

### 2026-08-25：WorkCell A/B lifecycle 独立 review

- **触发与来源：** phase-1 allowance review 确认当前只允许有限 WorkCell design clarification；
  A（bounded drain/unknown effect）和 B（active Binding expiry/revocation）已有 baseline、A1–A4/
  B1–B4 fixture 与有限候选，但缺独立语义 review。回到 [`records/workcell-lifecycle-review.md`](records/workcell-lifecycle-review.md)
  与 [`design/work-cell-protocol.md`](../design/work-cell-protocol.md)，没有修改 canonical protocol。
- **独立 review：** `Pasteur`（`01a03792-35c1-72c2-9871-07b9b2d108a3`）确认 A/B 保持
  `Spec → Binding → RunRequest → Run → RunRecord` identity，候选与 acceptance/runtime 边界清楚；
  要求把 A-1 的 cutoff→recording 句子标为 proposed relation，并把 B4 从“消费者必然无法确认”
  收窄为“canonical record shape 未显式且可强制表达 Binding identity，evidence 仍可能承载”。
  最小修订已回写，未新增机制或字段。
- **当前 standing：** A/B 为 `design observation / independent-review-complete / retain-unknown /
  route-to-owner`；真实 host/security、protocol、record/evidence owner、host Run、security review、
  record consumer、matched comparison 和 adoption regression 仍未知。
- **阶段影响：** WorkCell 仍 `active-after-prerequisite`；C/D 未被提前打开；DeepSeek Harness、
  adapter、executor、eval Run 和 base/runtime 仍未授权。
- **下一 return：** 将 A cutoff、迟到 observation/correction、B active policy 和 Binding identity
  canonical 载体路由给真实 owner；若 owner 仍未知，保留 `retain-unknown`，不由 provider/adapter
  行为代定协议。

### 2026-08-25：WorkCell C/D observation/lineage 独立 review

- **触发与来源：** A/B lifecycle review 完成后，回返 C（Event 顺序、去重、重放）与 D（retry/continue
  lineage 可恢复性）；核对 [`records/workcell-observation-lineage-review.md`](records/workcell-observation-lineage-review.md)
  与 [`design/work-cell-protocol.md`](../design/work-cell-protocol.md)。本轮没有修改 canonical protocol。
- **来源 provenance：** 记录同时注明 `git hash-object` 的 Git SHA-1 与 `shasum -a 256` 的 SHA-256；
  两值差异由算法解释，没有 content drift 证据，不把本轮标成 stale/source-changed。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）先指出 C-1、D-1 和
  parent pointer 有把候选关系读成 authority/retention/verified lineage 的风险；最小收窄后复核确认
  `independent-review-complete`。C-1 为 candidate public fact projection，D-1 为 candidate relation
  source，child pointer 只证明 child 声明关系。
- **当前 standing：** C/D 为 `design observation / independent-review-complete / retain-unknown /
  route-to-owner / acceptance-pending`；真实 replay/recovery consumer、Event replay contract、
  RunRecord/evidence owner、parent relation canonical 载体和 retention owner/期限仍未知。
- **阶段影响：** WorkCell 仍 `active-after-prerequisite`；没有协议、record、consumer、runtime 或
  implementation acceptance；不引入 event bus、replay store、lineage registry、session resume 或
  新字段。
- **下一 return：** 命名真实 replay/recovery consumer，或由 protocol/record owner 接受 observation-only /
  bounded-lineage contract；随后才判断字段级 contract 或 adapter plan。owner 仍未知时继续保留
  `retain-unknown`，转向其它 planning item 的有界回返。

### 2026-08-25：整个 planning 的最小工作图与发现分支

- **触发与来源：** 用户明确将 goal 范围扩大为整个 planning item，而不是只推进最近的 WorkCell
  review；回到 `plan.md`、`roadmap.md`、本 ledger、`coverage-audit.md`、archive candidate reviews、
  skills migration ledger、research/eval/experiment standing 和现有 WorkCell 回返记录，新增
  [`whole-planning-work-estimate.md`](index/whole-planning-work-estimate.md)。
- **最小改变：** 将主序列拆成 A 迁移/方法、B 哲学 reading/父关系、C WorkCell、D DeepSeek 系统、
  E 实现/构想实验、F evidence maintenance 与 R research/experiment candidates；分别标出当前可
  推进 branch、发现分支、阶段门和省略项，不把工作换算成 token、时间、金钱或资源承诺。
- **独立 review：** `Bernoulli`（`01a03774-25f0-7870-8359-be79db614ce0`）指出 A5 需显式保留
  iterative-improvement / Principal correction，C 的 adoption/reopen 不能偷变成 design gate，
  D/E 只依赖 WorkCell accepted exit 而不要求 system consumer 同时成熟；修订后确认覆盖、边界和
  授权关系无阻塞缺陷。
- **当前 standing：** 记录为 `planning-boundary-observed / independent-review-complete /
  acceptance-pending`；它是 planning projection，不是第二份 roadmap、资源估算、执行队列或
  authority。phase 1、WorkCell design、DeepSeek system design 和 implementation acceptance 均未
  因此改变。
- **当前可推进：** 优先从 A/B/F 中选择能关闭真实 unknown、改变下游决定或验证最近邻边界的有界
  item；A4/A5 继续 `adapt-and-retest`，R 支线保持 candidate/hold/active-after-prerequisite。
- **下一 return：** 选择一个有 source、低外部风险且能改变决定的 archive candidate、哲学 reading/
  parent relation 或历史 evidence 目录；若不能改变当前决定，只保留 branch，不创建新载体或新承诺。

### 2026-08-25：`disciplined-development` skill-formation 回返

- **触发与来源：** 全局工作图把 A1/A2 标为下一可推进 branch；回到 archive 的
  `disciplined-development`、`AGENTS.md`、现有 `practice-cycle` / `work-estimation` /
  `mechanism-design-review` 与 [`records/design-development-review.md`](records/design-development-review.md)，新增
  [`records/disciplined-development-review.md`](records/disciplined-development-review.md)。
- **最小改变：** 判断它是否值得迁入 `.agents/skills/`，不直接复制 archive 正文；明确
  `skill-formation` 拥有“是否形成载体”，`form-selection` 拥有“项目指令/reference/skill 等形式
  选择”，其它现有 skills 保持各自局部 owner。
- **独立 review：** `Kant`（`01a03792-3537-7960-a2cb-ea1ab05fd389`）要求把 planning/design
  区分为 review context 而非 adopted behavior consumer，弱化 AGENTS/现有 skills 已覆盖完整方法
  的表述，并列出当前 planning-level observation；修订后确认没有遗漏已接受 code consumer。
- **初始 review standing：** `disciplined-development` 当时为 `candidate-next / activation-deferred /
  retain-archive-source / independent-review-complete / acceptance-pending`；没有创建 carrier，
  没有 portable、matched、regression 或 acceptance evidence。当前提案关闭状态见本 ledger 顶部快照。
- **阶段影响：** 设计/开发方法套组仍有三个 project-local incubation candidate；本回返不增加第 12
  个 `.agents/skills/`，不改变 phase 1、WorkCell、DeepSeek 或实现 standing。
- **下一 return：** 出现 accepted-intent 的真实 code/design change、重复 failure gap、不能由现有
  owner 独立承担的判断和可证伪反例后，才做 baseline/treatment probe；否则保持 archive candidate，
  不为完成目录而迁移。

### 2026-08-25：P02 reading candidate 与独立 source/边界 review

- **触发与来源：** 全局工作图将 B1/B2 作为可推进支线；coverage audit 显示 P02 仍为 reading absent，
  且 P01/P04 的最近邻关系需要一个“来源—调查资格—已知/未知”的中间对象。回到
  `theory/philosophy.md` P02、`gene-expression.md`、`philosophy-gene-one.md` 和 P01/P04/P05
  candidates，新增 [`theory/philosophy/P02.md`](../theory/philosophy/P02.md) 与
  [`records/philosophy-p02-reading-review.md`](records/philosophy-p02-reading-review.md)。
- **最小改变：** 将 P02 定义为“相关调查→证据资格”，区分局部观察、问题、假设、证据性断言和
  接受/处置决定；不把“发言权”写成拒答、权限、调查队列、acceptance gate 或 runtime 规则，
  不修改 `theory/philosophy.md`。
- **独立 review：** `Jason`（`01a03787-cf5d-7383-9110-b1941e3670a3`）确认 source fidelity、
  P01/P04/P03/P15/P08 最近邻、低强度案例和 unknown/acceptance 边界成立；未修改文件，也未取得
  哲学、reading、theory、skill 或 acceptance 权。
- **当前 standing：** P02 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从四个增为五个 reading candidate；父 item、phase 1、WorkCell、
  DeepSeek 和实现 standing 均未关闭或提前开启。
- **下一 return：** 补 P01/P02/P04 的父关系成对反例，并在具体 domain/use 中检验“相关调查”的
  最小范围是否改变 claim strength、owner route 或 acceptance standing；不能改变实际判断时回修
  P02 或返回 `no-proposal`，不创建拒答机制。

### 2026-08-25：P01/P02/P04 父关系 boundary fixtures

- **触发与来源：** P02 reading review 的下一 return 要求检查 P01 来源、P02 调查资格和 P04
  已知/未知是否被合并；回到三条 source、P01/P04 readings、`gene-expression.md` 生成链和
  current WorkCell Event replay design observation，新增
  [`records/philosophy-p01-p02-p04-boundary-review.md`](records/philosophy-p01-p02-p04-boundary-review.md)。
- **最小改变：** 在同一 replay claim 上建立 F1（source 存在但未调查）、F2（已调查但关系仍
  unknown）和 F3（future contract 条件性 fixture），分别固定 P01=source、P02=evidence-qualified
  claim、P04=known/unknown；不修改哲学 source，不创建调查/拒答/权限/runtime 机制。
- **独立 review：** `Pasteur`（`01a03792-35c1-72c2-9871-07b9b2d108a3`）确认 F1/F2、P15/P08
  最近邻和越权边界；指出 F3 的对象漂移风险。修订后 F3 明确为 future contract fixture，区分
  conditional claim 与 accepted contract scope 内 known，二次 review 完成。
- **当前 standing：** 关系为 `design-boundary-observed / independent-review-complete /
  acceptance-pending`；仍未知的是 domain/use 的调查最小范围、证据权重、冲突处理和 named
  acceptance owner。
- **阶段影响：** P01/P02/P04 父关系得到一组可回读 boundary fixtures，但 P01/P02/P04 reading
  acceptance、父 item 完整 cross-relation、phase 1、WorkCell 和 DeepSeek standing 均未关闭。
- **下一 return：** 在真实 domain/evidence case 中观察“调查完成但结论仍 unknown”是否改变 claim
  strength 或 owner route；若不能改变，回修 P02 或返回 `no-proposal`，不扩成全局调查流程。

### 2026-08-25：P06 reading candidate 与独立 source/边界 review

- **触发与来源：** P02 与 P01/P02/P04 boundary fixtures 完成后，coverage audit 中 P06 仍为
  reading absent；回到 P06 source、`gene-expression.md` 的分析·简化坐标、P06/P11 修订记录和
  current planning work graph，新增 [`theory/philosophy/P06.md`](../theory/philosophy/P06.md) 与
  [`records/philosophy-p06-reading-review.md`](records/philosophy-p06-reading-review.md)。
- **最小改变：** 将 P06 定义为“保留会改变当前判断的承重关系，删除不改变判断的复杂性”，区分
  P05 特殊性、P07 入手点、P09 主次、P11 解决阶段扰动/成本和 P04 unknown；不把它写成全局压缩器、
  token/预算优化、测试删除规则或 runtime 成本机制。
- **独立 review：** `Jason`（`01a03787-cf5d-7383-9110-b1941e3670a3`）确认 source fidelity、
  最近邻、案例和 acceptance/behavior standing 无越权；未修改文件，也未取得 acceptance 权。
- **当前 standing：** P06 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从五个增为六个 reading candidate；P06/P11 父关系仍未关闭，
  phase 1、WorkCell、DeepSeek 和实现 standing 不变。
- **下一 return：** 用同一对象做 P06/P11 boundary fixture，检验分析删减与解决阶段扰动是否改变
  owner、失败方式和下一动作；若无法区分，回修 P06 或返回 `no-proposal`，不扩成全局压缩流程。

### 2026-08-25：P06/P11 简化与扰动成本 boundary fixtures

- **触发与来源：** P06 reading review 的下一 return 要求检验它与 P11 的阶段边界；回到 P06/P11
  source、`gene-expression.md` 的分析/解决坐标、P06/P11 研究修订和 WorkCell mechanism unknown，
  新增 [`records/philosophy-p06-p11-boundary-review.md`](records/philosophy-p06-p11-boundary-review.md)。
- **最小改变：** 在同一 replay mechanism 对象上建立 F1（分析阶段删掉非承重 speculative mechanism）、
  F2（未来 accepted effect 的解决阶段扰动/成本）和 F3（两者都谈减少但 owner/下一动作不同）；
  不修改 P source，不形成 P11 reading，不建立 runtime 或预算 policy。
- **独立 review：** `Kant`（`01a03792-3537-7960-a2cb-ea1ab05fd389`）确认 P06/P11 阶段与 owner
  边界成立，F1/F2/F3 未将 hypothetical runtime、执行成本或预算写成事实；P11 仍为 reading absent。
- **当前 standing：** 关系为 `source-current / design-boundary-observed / independent-review-complete /
  acceptance-pending`；P06 继续 `retain-candidate`，P11 保持 `reading absent / research-open`。
- **阶段影响：** P01–P16 reading package 与父关系覆盖增加，但没有关闭 P06/P11 reading、phase 1、
  WorkCell 或 DeepSeek 前置，也没有实现授权。
- **下一 return：** 在真实 effectful host case 中观察 P11 是否改变执行路径或扰动判断；若 P06/P11
  仍无法由 owner、失败方式和下一动作区分，回修 P06 或保持 P11 absent，不创建“少动”万能规则。

### 2026-08-25：P07 reading candidate 与独立 source/边界 review

- **触发与来源：** P06/P11 boundary review 完成后，coverage audit 中 P07 仍为 reading absent；
  回到 P07 source、`gene-expression.md` 的分析·入手点坐标、P05/P06/P09/P10/P04 最近邻和当前
  planning work graph，新增 [`theory/philosophy/P07.md`](../theory/philosophy/P07.md) 与
  [`records/philosophy-p07-reading-review.md`](records/philosophy-p07-reading-review.md)。
- **最小改变：** 将 P07 定义为“与目标有真实关系、范围可界定且能改变下一项判断的可行入口”，
  区分 P05 特殊条件、P06 简化、P09 主次、P10 时机和 P04 known/unknown；不把它写成任务拆分、
  优先级、速度/预算策略、runtime 调度或 WorkCell 实现授权。
- **独立 review：** `Socrates`（`01a037df-885e-78d2-8e3a-ef9173734daf`）确认 source fidelity、
  最近邻、案例和 acceptance/behavior standing 无越权；未修改文件，也未取得 acceptance 权。
- **当前 standing：** P07 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从六个增为七个 reading candidate；P05/P07/P09 关系已独立
  fixture review，但父 item、phase 1、WorkCell、DeepSeek 和实现 standing 均未关闭或提前开启。
- **下一 return：** 在 P07/P10 或 P05/P07/P09 的具体对象上检查入口是否真正改变下一项判断，且
  不被误写成主次或时机；若不能区分，回修 P07 或返回 `no-proposal`，不创建统一任务拆分器。

### 2026-08-25：P07/P10 入口与时机 boundary fixtures

- **触发与来源：** P07 reading review 的下一 return 要求检验入口是否被误写成时机；回到 P07/P10
  source、`gene-expression.md` 的分析/解决坐标、P07/P10 最近邻和当前 WorkCell Binding
  expiry/revocation design observation，新增 [`records/philosophy-p07-p10-boundary-review.md`](records/philosophy-p07-p10-boundary-review.md)。
- **最小改变：** 在同一条候选 Binding expiry/revocation 关系上建立 F1（当前 bounded design
  review 内的 source/owner/unknown 入口）、F2（未来 owner/protocol-accepted contract/effect
  的介入窗口）和 F3（同一关系上“先”但下一判断不同）；明确 F1→F2 是状态演化，不修改 P source，
  不形成 P10 reading，不建立 cutoff/revocation scheduler、priority policy 或实现。
- **独立 review 与迭代：** `Singer`（`01a037e3-5f7c-7f50-ad4d-187108828d29`）初轮指出 F1/F2
  对象连续性、owner/protocol acceptance 表达和 F3 同对象锚定不足；Main 三次最小修订后，二次
  review 确认入口/时机、阶段和 owner 边界成立，未修改文件，也未取得 acceptance 权。
- **当时 standing：** 关系为 `source-current / design-boundary-observed / independent-review-complete /
  acceptance-pending`；在 P10 reading candidate 形成前，P07 继续 `retain-candidate`，P10 保持
  `reading absent / research-open`。这条历史记录不覆盖当前 P10 projection。
- **阶段影响：** 父关系 coverage 增加一条可回读 fixture，但 P10 reading、父 item 完整 cross-relation、
  phase 1、WorkCell、DeepSeek 和实现 standing 均未关闭或提前开启。
- **当时下一 return：** 只有真实 effectful host case 提供 owner、状态窗口和允许效果后，才观察 P10
  是否改变介入判断；否则保持 P10 absent，不创建“越早越好”规则或统一调度机制。后续 P10 candidate
  已另行建立，当前回返见 `records/philosophy-p10-reading-review.md`。

### 2026-08-25：P08 reading candidate 与独立 source/边界 review

- **触发与来源：** P07/P10 relation review 完成后，coverage audit 中 P08 仍为 reading absent；
  回到 P08 source、`gene-expression.md` 的分析·问题边界坐标、P04/P05/P07/P09/P12 最近邻和
  当前 WorkCell cross-consumer handoff observation，新增 [`theory/philosophy/P08.md`](../theory/philosophy/P08.md)
  与 [`records/philosophy-p08-reading-review.md`](records/philosophy-p08-reading-review.md)。
- **最小改变：** 将 P08 定义为“明确对象、视域、时间和语境的适用范围，跨范围不直接外推而重新
  问题化”，区分 P04 known/unknown、P05 特殊条件、P07 入手点、P09 主次和 P12 对抗信息；不把
  scope boundary 写成能力、权限、拒答、通信禁止或 runtime scope 机制，不修改 `philosophy.md`。
- **独立 review：** `Fermat`（`01a037ec-21a8-7d40-a036-71bf38f32e31`）确认 source fidelity、
  最近邻、案例和 acceptance/behavior standing 无越权；未修改文件，也未取得 acceptance 权。
- **当前 standing：** P08 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从七个增为八个 reading candidate；P04/P08、P05/P08 boundary
  关系仍需具体 fixture，父 item、phase 1、WorkCell、DeepSeek 和实现 standing 均未关闭或提前开启。
- **下一 return：** 在同一对象上观察 scope 外、证据不足和特殊条件变化是否分别改变 claim strength、
  owner route 或下一动作；若不能区分，回修 P08 或返回 `no-proposal`，不创建 scope router 或权限机制。

### 2026-08-25：P09 reading candidate 与独立 source/边界 review

- **触发与来源：** P08 candidate 完成后，P05/P07/P08/P09 的既有 C1-C4 fixture 仍缺一个可独立
  回读的“主次” reading；回到 P09 source、`gene-expression.md` 的解决·主次坐标、P05/P07/P08/P10/P11
  最近邻和当前 WorkCell conflict observation，新增 [`theory/philosophy/P09.md`](../theory/philosophy/P09.md)
  与 [`records/philosophy-p09-reading-review.md`](records/philosophy-p09-reading-review.md)。
- **最小改变：** 将 P09 定义为同一对象、目标、范围和约束内会改变其他冲突、关键约束或下一判断
  的局部承重冲突；区分 P05 特殊条件、P07 入手点、P08 scope、P10 时机和 P11 扰动成本；不把
  主要性写成全局 priority、任务排序、owner 路由、资源分配、deadline、runtime scheduler 或
  acceptance gate，不修改 `philosophy.md`。
- **独立 review：** `Heisenberg`（`01a037f0-533d-7f00-bbf1-23dea342bafe`）确认 source fidelity、
  最近邻、案例和 acceptance/behavior standing 无越权；未修改文件，也未取得 acceptance 权。
- **当前 standing：** P09 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从八个增为九个 reading candidate；既有 P05/P07/P08/P09 fixture
  现在可回读 P09，但父 item、phase 1、WorkCell、DeepSeek 和实现 standing 均未关闭或提前开启。
- **下一 return：** 回读既有同对象 fixture，检查主要性是否真正改变其他冲突、关键约束或下一项解决
  判断，并保留非主要项的 owner/风险/回返；若不能区分，回修 P09 或返回 `no-proposal`，不创建
  万能 priority 机制。

### 2026-08-25：P14 reading candidate 与独立 source/边界 review

- **触发与来源：** 当前 WorkCell 命名问题仍缺一个 source-backed 的表达边界，尤其是 `cellInput` 可能
  混合对象、生命周期、受众和 authority；回到 P14 source、`concept-articulation.md`、P01/P04/P08/P06/P15
  最近邻和 `design/work-cell-protocol.md`，新增 [`theory/philosophy/P14.md`](../theory/philosophy/P14.md)
  与 [`records/philosophy-p14-reading-review.md`](records/philosophy-p14-reading-review.md)。
- **最小改变：** 将 P14 定义为“对象/关系足够可区分后，选择能稳定指向、避免最近邻误判并支持行动
  的 designation”，区分 source、known/unknown、scope、承重删减和实践检验；不把名称写成 glossary、
  命名委员会、canonical naming、权限、acceptance 或 runtime registry，不修改 WorkCell design。
- **独立 review 与迭代：** `Dirac`（`01a037f3-8c01-7880-b32b-e968dfe5deac`）初轮指出 P15 wording
  会误把它写成 acceptance 权主体；Main 修订为 P15 只提供实践检验、命名接受由指定 owner 决定，
  二次 review 确认通过；未修改文件，也未取得 acceptance 权。
- **当前 standing：** P14 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；没有 behavior Run、匹配对照、
  regression 或 reading acceptance。
- **阶段影响：** P01–P16 父 item 下从九个增为十个 reading candidate；`cellInput` 仍只是命名
  observation，父 item、phase 1、WorkCell、DeepSeek 和实现 standing 均未关闭或提前开启。
- **下一 return：** 等 WorkCell 对象、生命周期、受众和 owner 进一步收敛后，做 bounded naming review；
  若名称不能改变目标主体的对象、责任、来源或下一步区分，回修 P14 或返回 `no-proposal`，不创建第二
  glossary 或名称即权威机制。

### 2026-08-25：phase-1 current projection reconciliation

- **触发与来源：** 新增 P08、P09、P14 后，`phase-1-exit-review.md`、`roadmap.md` 和部分历史性
  projection 仍保留旧的“四个/八个 candidate”当前措辞；回到 `coverage-audit.md`、各 P reading
  review、父关系 records 和 [`phase-1-exit-review.md`](phase-1-exit-review.md) 做 current-state audit。
- **最小改变：** 将当时 projection 对齐为 P01/P02/P03/P04/P05/P06/P07/P08/P09/P14 十个
  `reading-candidate / independent-review-complete / research-open / acceptance-pending`，将当时的
  P10/P11/P12/P13/P15/P16 保持 `reading absent / research-open`，并把旧数量限定为历史 observation；
  不改变 phase-complete 标准、allowance、WorkCell/DeepSeek 前置或实现冻结。
- **独立 review：** `Darwin`（`01a037f8-a8f4-7912-b336-5fcfff5dfba1`）指出 research-open、来源
  列表和当前关系集合三个缺口；修订后确认 projection、历史时间性和实现边界一致，未修改文件，也
  未取得 phase acceptance 权。
- **当时 standing：** `phase-1-exit-review.md` 为 `planning-boundary-observed / projection-reconciled /
  independent-review-complete / acceptance-pending / phase-not-complete`；allowance 仍
  `candidate-observed / acceptance-pending`。
- **阶段影响：** 这是 projection repair，不是 phase transition；P10/P11/P12/P13/P15/P16、父关系
  完整接受、iteration matched/adoption/regression 和 named owner 仍是后续缺口。
- **下一 return：** 继续从剩余 source-backed package、父关系或 evidence maintenance 中选择能改变
  决策的 bounded contribution，并在新 candidate/关系出现时同步 current projections。

### 2026-08-25：evals / experiments evidence maintenance boundary review

- **触发与来源：** phase projection repair 后，evidence-maintenance 顶层 item 仍只有分散的
  `evals/README.md`、当前 protocol、project audits、历史 round、generated-only artifact 和
  experiments README，缺少同一份 source/standing/处置 projection；新增 [`evidence-maintenance-review.md`](index/evidence-maintenance-review.md)。
- **最小改变：** 逐对象族区分 current protocol/audit、历史 Run/review、post-freeze ledger unknown、
  generated-only artifact、prototype/form exploration 和 WorkCell/DeepSeek not-authorized；把旧路径
  JSON 的 source mismatch 降为 `hold / archive-only`，不倒写历史、不批量重跑、不创建评估工具。
- **独立 review：** `Zeno`（`01a037ff-9151-7ab1-af12-d5429db4be48`）初轮指出 generated sourceRef
  清单与已有 mechanism-design Run/ledger-entry standing 的两个缺口；修订后第二轮确认对象族、证据
  上限、历史/当前边界和实现冻结成立，未修改文件，也未取得 evidence acceptance。
- **当前 standing：** 本记录为 `evidence-boundary-observed / retain-unknown / independent-review-complete /
  acceptance-pending`；下一项是逐 round applicability check，不是当前 Run、matched improvement、
  regression 或 acceptance。
- **阶段影响：** evidence-maintenance item 获得一份可回读的 source map；generated-only eval 与
  experiments prototype 仍不进入主线 commitment，WorkCell、DeepSeek 和 base 实现冻结不变。
- **下一 return：** 由独立 reviewer 检查对象族的 source、consumer/owner、允许范围、证据上限、
  处置和 revisit；若没有真实 consumer 或可重建 card，保持 hold/unknown/no-proposal。

### 2026-08-25：mechanism-design round 1 evidence drift / ledger closure

- **触发与来源：** evidence-maintenance review 发现 `mechanism-design-review / round-1` 已有 frozen card、
  baseline/treatment Run 和独立 review，但 `evals/skill-evaluation/trial-ledger.md` 缺少 post-freeze
  record；本轮按 [`records/work-estimation-evidence-closure.md`](records/work-estimation-evidence-closure.md) 比较 A4、
  P01/P03 和 F2，选择 F2 做历史 record 与 source drift 检测。
- **最小改变：** 新增 [`records/evidence-applicability-review-mechanism-design-round-1.md`](records/evidence-applicability-review-mechanism-design-round-1.md)，
  并向 trial ledger 追加 applicability、run-output、isolation、outcome、process、independent-review、
  disposition 和 stale/recovery entry；不编辑 frozen card、Run、既有 review，不运行新模型。
- **关键观察：** card、candidate、task、output hash 可回读；`design/work-cell-protocol.md`、
  `records/workcell-lifecycle-review.md`、`records/workcell-observation-lineage-review.md` 三条 frozen upstream edge
  已 drift，open-relations review 与 harness theory 未 drift。这个发现使 F2 收窄为 historical record +
  `stale/uncertain` source applicability，而不是 current closure。
- **独立 review：** `Lagrange`（Agent `01a0388c-2464-7191-b316-3315649d9228`）初轮指出 source drift、
  ledger envelope 和 next owner 字段缺口；两轮最小修订后接受，未修改文件，也未运行评估。
- **当前 standing：** historical Run record 可回读；基础为 `behavior-observed`，局部
  `boundary-supported`，归因 `unknown`；旧 round `adapt-and-retest`、carrier `rewrite + retain-incubation`、
  current source applicability `stale/uncertain`，acceptance、matched、regression、adoption 仍 pending/unknown。
- **阶段影响：** evidence-maintenance 得到一条历史 ledger record，但仍为 `partial-closure`，没有改变
  WorkCell 四项 unknown、phase-complete、DeepSeek 前置或实现冻结；结果已回写
  [`phase-1-exit-review.md`](phase-1-exit-review.md) 的 current projection reconciliation。
- **下一 return：** recovered source snapshot、full model/runner/harness/workspace identity、
  activation/non-activation proof、protocol/record-retention/acceptance owner、named replay/consumer owner、source/task
  identity、owner-backed normal/duplicate/out-of-order/gap/post-restart fixture、新 frozen card 和未参与
  生产的 independent review 出现后才重开；matched 不预先推出，否则不为补齐 ledger 直接重跑。

### 2026-08-25：human-agent-visualization generated artifact applicability check

- **触发与来源：** evidence-maintenance review 要求先逐项检查 generated-only object 的当前适用性；
  对 [`evals/human-agent-visualization/generated/project-evidence-bundle.json`](../evals/human-agent-visualization/generated/project-evidence-bundle.json)
  建立 [`records/evidence-applicability-review-human-agent-visualization.md`](records/evidence-applicability-review-human-agent-visualization.md)。
- **最小改变：** 确认 artifact 于 `2026-08-11` 生成，当前 hash 为
  `7962a44e1f2526f1d92d03d9917051d34c92b725cc2e3bbead480200fbe94a89`；9 个 sourceRef 中 2 个路径存在但
  digest 已变，7 个路径缺失。将该对象保持为 `historical-only / hold / archive-only / no-proposal-now`，
  不修 JSON、不恢复旧路径、不新建 Run。
- **独立 review：** 窄范围 reviewer `Codex` 于 `2026-08-25` 接受 applicability record；它明确未重算
  两个现存 source digest，也未穷举 current consumer/owner/Run/acceptance，因此这些继续记为 unknown。
- **当前 standing：** applicability record 为 `historical-only / applicability-observed /
  independent-review-complete / acceptance-pending`；generated-only artifact 不能支持 current source、
  eval conclusion、behavior、matched、portable、acceptance 或实现授权。
- **下一 return：** 只有 current source、hypothesis、named consumer/owner、controlled variables、card、
  runner、independent review 与 acceptance 关系共同出现时，才另开新 round；否则维持 hold/no-proposal。

### 2026-08-25：kb-representation generated recall artifact applicability check

- **触发与对象：** evidence-maintenance review 仍有一个未逐项检查的 generated-only 对象；本轮审查
  [`evals/kb-representation-evaluation/generated/recall-v1/activation.png`](../evals/kb-representation-evaluation/generated/recall-v1/activation.png)，
  并保留当前 PNG 的尺寸、digest 和 git provenance。
- **历史链与当前边界：** `d3676ba` / `fb79857` 的历史 git 对象中确有旧的
  `experiments/kb-representation-evaluation` fixture、12 个 source、生成/评分脚本、Run evidence
  和 `probe` report；但旧 fixture 的 digest 与当前 PNG 不同，当前 generated path 不能直接继承
  历史 source-hit signal 或 experiment standing。exact lineage/current applicability 保持 unknown。
- **独立 review：** `Plato`（Agent `01a0387b-f544-7aa1-ab7e-bbc7a3290609`）初轮指出历史链、当前
  path 范围和 digest 差异未被区分；修订后确认 bounded absence、lineage reconciliation、处置和
  实现冻结成立，未修改文件，也未取得 evidence acceptance。
- **当前 standing：** applicability record 为
  `historical-chain-observed / current-applicability-unknown / applicability-reviewed /
  independent-review-complete / acceptance-pending`；artifact 处置为
  `historical-only / hold / archive-only / no-proposal-now`。不创建 Run，不把图内容写成 recall、
  model、system 或引用效果结论。
- **下一 return：** 只有 source/hypothesis/consumer/owner 和 exact lineage reconciliation 共同
  出现，才决定接回历史链或按新 artifact 新建 card/Run；否则不重复检查、不修图、不重跑。

### 2026-08-25：P10 reading candidate 与 P07/P10 boundary projection

- **触发与来源：** evidence-maintenance item 完成边界复核后，P07/P10 boundary fixture 已独立确认
  能区分分析入口和未来解决介入窗口，但 P10 仍没有可回读的 source-bound reading candidate；回到
  `theory/philosophy.md` P10、`gene-expression.md` 的解决·时机坐标、`philosophy-gene-one.md` 的
  序列研究记录、P07/P09/P11/P04/P16 最近邻和 [`records/philosophy-p07-p10-boundary-review.md`](records/philosophy-p07-p10-boundary-review.md)，
  新增 [`theory/philosophy/P10.md`](../theory/philosophy/P10.md) 与 [`records/philosophy-p10-reading-review.md`](records/philosophy-p10-reading-review.md)。
- **最小改变：** 将 P10 暂定为“在外部已有相称对象、状态/风险窗口、允许效果、owner 和接受边界时，
  只比较现在介入与延后介入的时机差异”；明确 P10 不拥有 admission/授权判断，不生成固定提前量、
  deadline、timeout、scheduler、cutoff、revocation policy 或自动 effect。F1→F2 降级为同一候选关系
  的条件性设计/standing 演化，具体 Binding identity 保持 unknown，不声称 runtime 状态迁移。
- **独立 review 与迭代：** `Einstein`（`01a03808-8ba7-7e02-b35e-1288c7ea6dae`）初轮确认 source、
  最近邻和越权排除基本成立，但指出 source anchor、P10 authority、候选关系/具体 Binding identity
  和案例条件性四个缺口；Main 完成最小修订后，二轮确认 source、最近邻、条件性边界、current
  projection 和实现冻结成立，未修改文件，也未取得 reading acceptance。
- **当前 standing：** P10 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；P07/P10 relation 仍为
  `source-current / design-boundary-observed / independent-review-complete / acceptance-pending`。
  没有 P10 behavior Run、matched comparison、regression 或 reading acceptance。
- **阶段影响：** 当前 reading candidate 从十个增为十一个；phase-complete、父 item 完整接受、WorkCell、
  DeepSeek 和实现 standing 均不变，P10 的独立 review 完成不等于 reading acceptance。
- **下一 return：** 在真实 domain/use 中观察“现在/延后”是否改变 owner、
  失败方式或下一动作，回修 candidate 或返回 `no-proposal`，不创建统一预防器或调度机制。

### 2026-08-25：P11 reading candidate 与 P06/P11 boundary projection

- **触发与来源：** P06/P11 boundary fixture 已独立确认分析删减与解决扰动可以按阶段区分，但 P11
  仍没有 source-bound reading candidate；回到 `theory/philosophy.md` P11、`gene-expression.md` 的
  解决·成本坐标、`philosophy-gene-one.md` 的序列研究记录、P06/P10/P09/P04/P15 最近邻和
  [`records/philosophy-p06-p11-boundary-review.md`](records/philosophy-p06-p11-boundary-review.md)，新增
  [`theory/philosophy/P11.md`](../theory/philosophy/P11.md) 与 [`records/philosophy-p11-reading-review.md`](records/philosophy-p11-reading-review.md)。
- **最小改变：** 将 P11 暂定为“在外部已有相称对象、解决方案、允许效果、硬约束、owner 和接受边界
  时，只比较执行路径的必要动作、扰动、协调和风险代价，减少不改变目标的反复翻动，同时保留安全、
  证据、可逆性和必要组合的承重动作”；明确 P11 不拥有方案 admission、预算批准、成本阈值、retry、
  runtime 优化或自动执行权。P06/P11 F1→F2 降级为同一候选机制关系的条件性设计演化，不代表同一
  Event/replay/lineage/runtime object 的状态迁移。
- **独立 review：** `Tesla`（`01a03813-7ef8-70e2-8fa6-cef9e385fa6c`）初轮确认 source、最近邻、
  成本越权排除、安全/证据/unknown/回退保留均成立；指出 P06/P11 旧 fixture 的 runtime 对象连续性
  歧义和 current projection 未同步。Main 完成最小修订后，二轮确认对象连续性、current projection、
  成本边界和实现冻结成立，未修改文件，也未取得 reading acceptance。
- **当前 standing：** P11 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`，处置 `retain-candidate`；P06/P11 relation 仍为
  `source-current / design-boundary-observed / independent-review-complete / acceptance-pending`。
  没有 P11 behavior Run、matched comparison、regression 或 reading acceptance。
- **阶段影响：** 当前 reading candidate 从十一个增为十二个；phase-complete、父 item 完整接受、WorkCell、
  DeepSeek 和实现 standing 均不变，P11 的独立 review 完成不等于 reading acceptance。
- **下一 return：** 重新做 P11 source/boundary review；若真实 domain/use 不能使扰动/成本改变 owner、
  失败方式、回退或下一动作，回修 candidate 或返回 `no-proposal`，不创建统一成本策略或 runtime 优化器。

### 2026-08-25：P12/P13/P15/P16 remaining-reading disposition

- **触发与来源：** P11 reading review 完成后，父 item 仍有 P12/P13/P15/P16 未形成 candidate；回到
  `theory/philosophy.md` 四条 source、`theory/research/planning-inbox-theory-review.md` 及其 round records、
  `records/philosophy-p04-p15-p16-boundary-review.md`、当前 coverage/phase projection，新增
  [`records/philosophy-remaining-reading-disposition.md`](records/philosophy-remaining-reading-disposition.md)。
- **最小改变：** P12/P13 当前标为 `no-proposal-now`：没有实际对抗 actor、竞争性 consumer、误导输入、
  response effect 或防御性资源分配，不能按覆盖率形成 reading；P15/P16 保留 `hold-cross-boundary-fixture-only`：
  B1–B4 只区分 knowledge、practice method、time coverage 和 acceptance，不是真实 Run。四者都记录 reopen
  trigger，不把当前处置写成永久删除 source。
- **当前 standing：** 该 disposition 为 `source-current / disposition-observed / independent-review-complete /
  acceptance-pending`；P12/P13 仍 `source-current / reading absent / research-open / acceptance-pending /
  no-proposal-now`，P15/P16 仍 `source-current / reading absent / research-open / acceptance-pending /
  cross-boundary-fixture-only`，没有 reading acceptance、behavior Run、matched、regression 或实现授权。
- **独立 review：** `Lorentz`（Agent `01a03833-14c4-7f62-94e4-e43cab81e8c9`）确认四项处置、证据上限、
  reopen trigger 和 current projections 一致；未修改文件，也未取得 reading/phase/runtime/实现授权。
- **阶段影响：** P01–P11、P14 的 12 个 candidate standing 不变；P12/P13/P15/P16 的未形成状态获得明确
  的 no-proposal/hold/reopen 关系，phase-complete、WorkCell、DeepSeek 和实现 standing 不变。
- **下一 return：** 由独立 reviewer 检查四条处置是否有真实 consumer、可改变下一判断的 reopen trigger 和
  相称证据上限；未满足条件时保持当前处置，不为 coverage 创建 reading、strategy、validator 或 runtime 机制。

### 2026-08-25：WorkCell naming boundary review

- **触发与来源：** P14 reading review 的下一 return 要求在 WorkCell 对象、生命周期、受众和 owner
  进一步收敛后做 bounded naming review；回到 [`design/work-cell-protocol.md`](../design/work-cell-protocol.md)
  的 canonical name table、legacy `CellInput` mapping、executor surface、Completion/Review/Acceptance
  boundary 和 system-layer scheduler names，新增 [`records/workcell-naming-review.md`](records/workcell-naming-review.md)。
- **最小改变：** 确认 `CellInput` 只保留为 `legacy-adapter-only / not-canonical`；暂保留
  `WorkCellSpec → WorkCellBinding → WorkCellRunRequest → WorkCellRun → WorkCellRunRecord` 及
  Event/Evidence 生命周期名；补出 CompletionAction declaration、runtime call/observation、MechanicalCheck、
  SemanticReview、AcceptanceDecision 的不同 owner/lifecycle；WorkLease 降为 issuer/consumer/authority
  unknown 的 system-layer lease candidate，CellBatch 不预先提升为 `WorkCellBatch` 或 runtime isolation guarantee。
- **当前 standing：** 本记录为 `design-boundary-observed / naming-candidate / independent-review-complete /
  acceptance-pending`；只对 design candidate 中与边界冲突的 wording 做了最小同步，没有取得 WorkCell
  protocol acceptance、命名 acceptance、
  provider choice、DeepSeek/Vercel adapter choice 或实现授权。
- **下一 return：** 由明确的命名/协议 acceptance owner 判断是否接受这组候选名称及其边界；在 owner、rubric
  或真实 consumer 未形成前，保留 `naming-candidate / acceptance-pending`，不创建 glossary、registry
  或 system mechanism。

## 2026-08-25：whole-planning current projection

本节是当前 main goal 的收口投影，不创建第二份 roadmap，也不把“可推进”解释成已经获得 owner、
预算、阶段接受或实现授权。

### 当前可形成真实 bounded contribution 的部分

1. **WorkCell 有限设计澄清。** 命名 boundary、RunRecord/Binding identity、CompletionAction、EffectSummary、
   UsageObservation 及 observation/record integration review 已完成独立 review，但仍为 design candidate /
   acceptance-pending；下一回返不是继续叠加字段，而是等待 protocol/record/host-security/acceptance owner
   对 field shape、unknown/unavailable、版本边界、cross-field correlation 和 host effect 关系作出可接受
   contract，或在新反例出现时另开 bounded review。允许范围仍是 source-backed design review、反例和 fixture
   contract；不创建 adapter、executor、event bus、registry、meter 或 runtime。
2. **设计开发 skills 的严格回归。** `practice-cycle`、`work-estimation`、`mechanism-design-review`
   继续留在 `.agents/skills/` incubation；下一回返是 named replay consumer、可重建 runner identity、
   matched card/baseline-treatment、独立 review 和 adoption/regression window。没有这些证据，不移动到
   `skills/`，也不扩成“开发总 skill”。
3. **evidence maintenance。** 已知 historical/evidence family 的 applicability scope 已有对应 record；
   只有新 artifact、source/protocol/candidate、consumer/owner、runner identity 或 acceptance relation
   变化时，才对对应 family 决定补 card/ledger、重跑、hold 或 no-proposal。generated-only 目录和
   experiments prototype 不批量升格为当前 evidence，不因维护动作创建新 Run 或工具。
4. **哲学 reading / relation。** P01–P11、P14 的 candidate 可等待 named acceptance 或在真实
   domain/use 中补能改变下一判断的反例；P12/P13 保持 `no-proposal-now`，P15/P16 保持
   `cross-boundary-fixture-only`，只在各自 reopen trigger 出现时重开，不按 coverage 继续扩写。

### 当前只保留为前置后的 candidate

- **DeepSeek Harness 工作系统设计：** 等 WorkCell design acceptance；在此前只保留输入、记忆、session、
  todo、并发、输出、取消和恢复的设计问题，不选 carrier/kernel，不实现系统。
- **实时、多来源 harness base：** 等 WorkCell 与工作系统设计接受，并取得系统 owner/consumer；不实现
  queue、runtime 或实时双向输出。
- **用户各类 harness 构想：** 等工作系统实现后分别成为 experiment/eval candidate；当前不实现或
  把构想写回 core。

### 当前停止或明确不提案

- 没有真实 adversarial consumer/effect 时，不为 P12/P13 创建 strategy、routing 或 runtime policy。
- 没有真实 practice/adoption consumer、可重建 fixture/Run、相称 review 和 acceptance owner 时，不为
  P15/P16 创建 reading、实践结论或长期 regression 机制。
- 没有明确设计 acceptance 和 implementation authorization 时，工作系统实现保持 `not-authorized`。

当前最小回返顺序是：WorkCell owner-backed acceptance/counterexample → 方法 candidate 的严格 card 与回归
条件 → evidence 适用性维护；DeepSeek 工作系统和实现继续等待前置。该顺序是当前 planning projection，不是绝对 priority；
owner、acceptance owner 和资源仍为 `unknown`。

### 2026-08-25：设计/开发代码方法候选当前处置

新增 [`records/development-method-candidate-disposition.md`](records/development-method-candidate-disposition.md) 作为
`code-review` 与 `structural-refactoring` 的窄 projection：两者分别保持
`no-proposal-now / retain-archive-source`，前者 `activation-deferred`，后者
`implementation-gated`，候选生命周期仍为 `candidate-next`。当前没有 accepted-intent code diff、
已接受 base implementation 或真实 behavior-preserving refactor，因此不创建 living carrier、不移动
到 `skills/`，也不为验证方法制造 fake change。`Hubble` 独立语义 review `final accept`，只接受该
planning disposition；未来真实 consumer、contract、相称正反例、独立 review 与外部 acceptance 出现
后才 reopen。该 projection 不改变 phase-complete、WorkCell/DeepSeek 前置或实现冻结。

### 2026-08-25：item-ledger 字段覆盖审计

- **触发与来源：** whole-planning goal 要求每个 planning item 都可回读
  `source → standing → consumer/owner → dependencies → allowed scope → evidence → disposition →
  stage exit → revisit`；回到本 ledger 的 overview/contract projection、`coverage-audit.md` 的
  P01–P16 work-package map，新增 [`item-ledger-field-audit.md`](index/item-ledger-field-audit.md)。
- **最小改变：** 在 PL-16 加入当前 projection 之前，结构检查确认当时顶层 overview/contract
  projection 为 15/15 对应行、每行 6 个非空 contract fields；P01–P16 为 16/16 行、每行 5 个
  非空 package fields，并用当时的 PL-01..PL-15 audit-only mapping 与显式继承表补足回读关系。
  P12/P13 保持 `no-proposal-now`，P15/P16 保持
  `hold-cross-boundary-fixture-only`，不因 coverage 形成 reading 或实践结论。
- **独立 review：** `Halley`（Agent `01a0389c-f0c7-7200-bca2-6ae35783bd6d`）指出的映射、显式
  继承和处置拆分问题已修订，二轮结论为 `final accept`；确认 audit ID 不成为 canonical name，
  common owner 仍不是 named owner。
- **当前 standing：** `structural-coverage-observed / independent-review-complete /
  acceptance-pending`。它只证明 projection 字段结构可回读，不证明 item/reading 语义正确、owner
  已接受、phase-complete、WorkCell/DeepSeek/base 可实现或已有实现授权。
- **阶段影响：** 不改变 `phase-complete = not-established / continue`、各 item 的现有 standing、
  WorkCell/DeepSeek 前置关系、`.agents/skills/` incubation 位置或任何 implementation boundary。
- **下一 return：** 若新增/拆分/重排 item、canonical source 或字段语义变化、owner/consumer 具体化、
  projection drift 或 stage/revisit 关系改变，重新执行该结构审计；不得用重复字段制造语义完整。

### 2026-08-25：planning item 迭代闭环覆盖审计

- **触发与来源：** main goal 还要求按观察、最小改变、review、acceptance、projection/move 与采用后
  回归推进；字段覆盖审计只证明“关系可回读”，没有证明循环位置可回读。因此新增
  [`item-loop-coverage-audit.md`](index/item-loop-coverage-audit.md)，沿用当时的 PL-01..PL-15 audit-only
  mapping。
- **最小改变：** 在 PL-16 加入前，为当时的 15 个顶层 item 显式登记 `B/O/D/R/A/P/G`：baseline、observation、minimum
  change、independent review、acceptance、projection/move、adoption regression。`N/A（未采用）` 被
  明确区别于“无回归”；`review ≠ acceptance`、`projection ≠ move`。
- **独立 review：** `Plato`（Agent `01a0387b-f544-7aa1-ab7e-bbc7a3290609`）检查当时的 15 行字段、前置
  关系与阶段边界，结论为 `accept`；未修改文件、未创建 Run、未运行评估。
- **当前 standing：** `loop-coverage-observed / independent-review-complete / acceptance-pending`。
  PL-01/02/03/04/05/06/09 有局部或 planning-level review；全部 item 的 named acceptance owner
  仍 `unknown`，没有 item 可声称 `adopted-and-regression-supported`。
- **阶段影响：** 机制能够捕获并路由未收敛的 owner、consumer、identity、acceptance 和 adoption
  unknown，但不能自行解决它们；`phase-complete = not-established / continue`，WorkCell、DeepSeek、
  base、portable move 和实现授权不变。
- **下一 return：** 由真实 owner/consumer 选择能改变判断的 A/B/F 或 WorkCell owner-return；不为填满
  B/O/D/R/A/P/G 再建 round、总 workflow、queue、registry 或 runtime gate。

### 2026-08-25：WorkCell design acceptance-readiness projection

- **触发与来源：** protocol §17/§18 与 WorkCell naming、lifecycle、observation/lineage、record identity
  和 contract-field review 已分别完成，但缺少一处能让未来 owner 逐项判断的 readiness projection；新增
  [`records/workcell-design-acceptance-readiness.md`](records/workcell-design-acceptance-readiness.md)。
- **机制判断：** 采用 `reuse-existing-projections + simplify`；该记录只重连已有 source/review，
  不创建 acceptance gate、queue、registry、runtime state、retry controller 或新的 authority。
- **最小改变：** 显式登记 15 个 acceptance dimensions，覆盖 §17.2 的 spec/reference、CommandGrant、
  semantic review、A/B/C/D、provider comparison、system boundary、formal owner/priority/acceptance，
  并逐项映射 §18.1–§18.12；`readiness exit` 明确是 owner 判断的候选条件，不是 Main 可执行的 gate。
- **独立 review：** `Goodall`（Agent `01a03883-ed7f-71b0-ac1d-7ab753d93fad`）两轮 review 后 `final accept`；
  确认 Event 与 Binding expiry/revocation 的 owner/unknown 边界、反例映射和非 gate 语义。
- **当前 standing：** `acceptance-readiness-observed / independent-review-complete / acceptance-pending`；
  没有 named owner-backed decision、protocol acceptance、phase transition、runtime guarantee 或实现授权。
- **阶段影响：** WorkCell 仍 `active-after-prerequisite`；DeepSeek/system design、provider comparison、
  base/runtime 和 implementation 仍等待前置，不因 readiness projection 提前开放。
- **下一 return：** 由真实 protocol/host-security/record-evidence/acceptance owner 选择一行 dimension
  作出 `accept`、`retain-unknown`、`no-proposal` 或延期决定；无 owner 时保持 unknown，转向其他真实 bounded
  contribution，不继续叠加字段或机制。

### 2026-08-25：practice-cycle round 3 source-edge applicability closure

- **触发与来源：** evidence-maintenance 对历史 round 的逐项检查继续推进；本轮把 frozen `practice-cycle`
  round 3 的 candidate、card、task、AGENTS、freeze receipt、baseline/treatment output、run identity 和
  independent review 重新接回当前 source edge，新增
  [`records/evidence-applicability-review-practice-cycle-round-3.md`](records/evidence-applicability-review-practice-cycle-round-3.md)。
- **最小改变：** 只做 post-freeze hash/lineage applicability projection，并向 trial ledger 追加
  source-edge record；不编辑 frozen card、candidate、Run 或既有 review，不重跑、不创建 round 4、不移动
  到 portable `skills/`。
- **关键观察：** candidate/card/task/AGENTS/output/review 的当前 hash edge 可回读，artifact chain 在
  file-hash 层面可重建；但 freeze immutability、full runtime identity、activation proof、统一 output
  schema、adoption/regression 和 acceptance 仍 unknown。因此该 round 最高仍为
  `source-edge-match-observed / runtime-applicability-uncertain / behavior-observed / attribution-uncertain`，
  不是 matched、adopt 或 regression-supported。
- **独立 review 与处置：** `Lagrange`（`01a0388c-2464-7191-b316-3315649d9228`）接受该 applicability
  record；round 继续 `adapt-and-retest`，carrier 继续 `retain-incubation`。这条记录不改变 PL-02、A4
  前置审查、`phase-complete` 或任何实现冻结。
- **下一 return：** 由 named eval/runner owner 返回可核验 runner/model/harness/workspace identity、真实
  activation/non-activation proof、统一结构化 schema 和更窄的新 card 后，才重开 matched 判断；前提不齐时
  保持当前 standing，不为补齐 ledger 直接重跑。

### 2026-08-25：practice-cycle current project-instruction applicability drift correction

- **新观察：** 当前 `AGENTS.md` SHA-256 为
  `1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`，与 round-3 frozen card 记录的
  `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379` 不同；差异涉及 planned readings
  inventory 与 archive move 的 source/consumer/boundary review 规则。
- **当前投影：** candidate/card/task/output/review 的历史 artifact edge 仍可回读，但 project-instruction
  edge 改为 `drift-observed / current-applicability-uncertain`。round 仍为
  `behavior-observed / attribution-uncertain / adapt-and-retest`，carrier 仍
  `retain-incubation`；不提升 matched/adoption/regression，不改 frozen artifact，不重跑。
- **审查边界：** 既有 `Lagrange` accept 只覆盖 source drift 前的 applicability record，不覆盖本次 correction。
  下一 return 仍是当前 `AGENTS.md` 的 fresh/superseding card、named eval/runner owner、runtime identity、
  activation proof、统一 schema 与独立 review。

### 2026-08-25：planning-inbox round 3 source/applicability closure

- **触发与来源：** evidence-maintenance 仍有已实际运行、但没有 post-freeze applicability projection 的
  old-vs-new round；本轮回到 `planning-inbox-round-3` manifest、old/new snapshot、fixture、输入、output、
  events/stderr、run identity、blind review、mapping 和 synthesis，新增
  [`records/evidence-applicability-review-planning-inbox-round-3.md`](records/evidence-applicability-review-planning-inbox-round-3.md)。
- **最小改变：** 只建立当前 hash/lineage applicability record，并向 trial ledger 追加 record；不编辑
  manifest、snapshot、candidate、input、Run、review，不重跑、不创建新 skill、不移动到 portable `skills/`。
- **关键观察：** recorded artifact chain 当前可回读，candidate 与 new snapshot、old rollback anchor、
  fixture、protocol、十份 input、十份 formal output、event/stderr、run identity 和 review chain 均可按
  hash 复核；失败 sandbox 尝试与正式样本分离。runtime identity、activation、完整 prompt/harness/权限/隔离
  以及当前 `planning/inbox.md` / `inbox-history.md` source relation 未被完整证明。
- **当前 standing 与处置：** `source-edge-match-observed / runtime-applicability-uncertain /
  current-source-applicability-uncertain / behavior-observed / boundary-supported /
  attribution-uncertain / acceptance-pending`；round 原有 project-local 处置保持
  `retain-as-project-local-incubating-candidate / adapt-and-observe`，它不是 protocol round disposition，
  也不是 matched、adopt、regression-supported 或 portable promotion。`Hubble` 独立复核 applicability
  record `final accept`；不改变 PL-05、evidence-maintenance、phase-complete 或实现冻结。
- **下一 return：** named eval/runner owner、可重建 model/harness/workspace identity、activation/visibility
  proof、显式 current inbox source snapshot、新或 superseding card 和独立 review 出现后，才重开更强结论；
  前提不齐时保留历史 observation 与 current-source uncertainty，不为补齐 ledger 直接重跑。

### 2026-08-25：WorkCell design source applicability reconciliation

- **触发与来源：** 既有 A/B lifecycle 与 C/D observation/lineage review 保存了 source fingerprint，
  但当前 `design/work-cell-protocol.md` 已有不同 raw SHA-256；record-boundary 与 contract-field review
  曾与 revision 前 protocol source match。新增 [`records/evidence-applicability-review-workcell-design.md`](records/evidence-applicability-review-workcell-design.md)
  逐对象记录旧 edge，并由 revision-2 applicability record 记录当前 source revision。
- **最小改变：** 第一轮只建立 source-edge reconciliation；第二轮将已接受的 executor wording candidate
  回写为仅限 diagram/text 的 `design/` source revision，并新增 current-source applicability record；不编辑旧
  review、不恢复旧 snapshot、不运行模型或新 Run。
- **当时 standing（current-source child card 前）：** A/B/C/D 为 `source-edge-drift / current-applicability-uncertain`；open-relations
  文件自身未内嵌 frozen source fingerprint，但既有 applicability record 记录其 frozen/current 同值
  edge；record-boundary/contract-field 的 match 仅针对 revision 前 source，当前均需重新标记
  `current-applicability-pending`。第一轮记录由 `Hubble` 独立审阅 `final accept`，不把 hash match 写成
  semantic acceptance；revision-2 当时另行等待 current-source review。后续
  [`records/workcell-current-source-open-relations-applicability-review.md`](records/workcell-current-source-open-relations-applicability-review.md)
  已完成该 source-level child return。
- **下一 return（该 round 的历史出口）：** recovered source snapshot、named protocol/record-retention/replay/recovery
  consumer 或 current-source review card 出现后，分别重开相应 relation；current-source child 已满足
  source-level 回指，但四项 policy/owner unknown 与 implementation freeze 不变。

### 2026-08-25：CompletionActionCall / Observation 窄 contract candidate

- **触发与来源：** `records/workcell-contract-field-boundary-review.md` 确认 CompletionAction 的 declaration、
  executor return、host observation 与 check 已分名，但 `CompletionActionCall`/`Observation` 没有可消费
  shape；新增 [`records/workcell-completion-action-contract-review.md`](records/workcell-completion-action-contract-review.md)。
- **最小改变：** 只提出候选 field family，明确 live submit 与 execution return 是同一 logical call 的
  transport views，return-only 不产生 host `observed`，identity/input unavailable 显式结构化，schema/
  `maxCalls` 留给 MechanicalCheck；不改 canonical protocol、不新增 registry/event bus/runtime。
- **当前 standing：** `candidate-proposal / independent-review-complete / acceptance-pending`；`Hubble`
  独立 review `final accept`。`EffectSummary`、`UsageObservation`、A/B/C/D、replay/lineage 和最终
  acceptance 仍是独立 unknown。
- **下一 return：** protocol、host/coordinator、record/evidence 与 acceptance owner 决定是否采用；若
  候选过重则返回 `retain-unknown/no-proposal` 并保留对象分层，不把 review verdict 写成 canonical
  schema 或实现授权。

### 2026-08-25：EffectSummary / EffectObservation 窄 contract candidate

- **触发与来源：** `records/workcell-contract-field-boundary-review.md` 确认 `EffectSummary` 与
  `EffectObservation` 只有引用、没有可消费的 source、effect identity、phase、outcome、confirmation
  和 unavailable boundary；该 review input 记录的 protocol source hash 为 SHA-1
  `4293057dc1d136fd20ddc7de7144612e458a5b11`、raw SHA-256
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；当前 source revision 由
  revision-2 applicability record 追踪。
- **最小改变：** 新增 [`records/workcell-effect-summary-contract-review.md`](records/workcell-effect-summary-contract-review.md)，
  保持 `EffectSummary` 为 run-bound fact projection；`state: observed` 只表示 envelope 可用，只有
  host observation 可以支持 confirmed；executor/adapter report、空 observation、取消未知、retry child
  和 late evidence 不被升级为 no-effect 或 host fact。
- **当前 standing：** `candidate-proposal / independent-review-complete / acceptance-pending`；
  `Hubble` 独立 review `accept`，仅接受候选 review record，不接受 canonical protocol shape。
- **下一 return：** protocol、host/security、coordinator、record/evidence 与 acceptance owner 决定
  是否采用；在此之前不补 effect-specific payload，不创建 registry、runtime controller、retention
  authority、security guarantee、WorkCell/DeepSeek 实现或新的 eval Run。

### 2026-08-25：UsageObservation 窄 contract candidate

- **触发与来源：** `records/workcell-contract-field-boundary-review.md` 确认 `UsageObservation` 只有槽位、没有
  metric kind、scope、source、measurement、unavailable reason 或与 `ResourceLimits`/`MechanicalCheck`
  的可消费关系；该 review input 记录的 protocol source hash 为 SHA-1 `4293057dc1d136fd20ddc7de7144612e458a5b11`、
  raw SHA-256 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；当前 source revision
  由 revision-2 applicability record 追踪。
- **最小改变：** 新增 [`records/workcell-usage-observation-contract-review.md`](records/workcell-usage-observation-contract-review.md)，
  保持 `UsageObservation` 为 run-bound fact projection；用 `UsageMetricProvenance` 显式约束
  run/host 与 provider-report/executor-adapter 的兼容关系，区分 observed zero、partial、delayed、
  not-collected、provider-unsupported、scope-incompatible 和 source-unavailable；limit comparison
  仍由独立 `resource-limit` `MechanicalCheck` 表达。
- **当前 standing：** `candidate-proposal / independent-review-complete / acceptance-pending`；`Hubble`
  两轮独立 review 后 `accept`，仅接受候选 review record，不接受 canonical protocol shape。
- **下一 return：** protocol、host/security、adapter、coordinator、record/evidence 与 acceptance owner
  决定是否采用；在此之前不创建 meter、billing、enforcement controller、retention authority、
  WorkCell/DeepSeek 实现或新的 eval Run。

### 2026-08-25：observation / record integration review

- **触发与来源：** `UsageObservation` 完成独立 review 后，practice-cycle 判断继续增加字段的边际收益
  已下降；回到 CompletionAction、EffectSummary、UsageObservation 及当前 `ExecutionOutcome`、
  `MechanicalCheck`、`EvidenceRef` 的组合关系。
- **最小改变：** 新增 [`records/workcell-observation-record-integration-review.md`](records/workcell-observation-record-integration-review.md)，
  不改 canonical protocol，只检查同一 RunRecord 中的 identity、source、unknown、failure/cancellation、
  limit check、retry 和 late evidence；确认当前唯一安全跨字段 join 是 `runId`，跨 run `retry-of` /
  `continued-from` 仍是 lineage。
- **当前 standing：** `candidate-synthesis / independent-review-complete / acceptance-pending`；`Hubble`
  独立 review `accept`，仅接受 integration record，不接受 canonical protocol 或字段采用。
- **下一 return：** route 给真实 protocol/record/acceptance owner，选择一个 cross-field counterexample
  作 owner-backed decision；在 owner/consumer 出现前，不继续叠加字段、总 status、dedup registry、meter、
  runtime 或新的 eval Run。

### 2026-08-25：living skills round-2 evidence applicability reconciliation

- **触发与来源：** evidence-maintenance 已完成 protocol、generated artifact、WorkCell design、practice-cycle
  和 planning-inbox 的局部 applicability checks；下一项暴露出七个 living skill round-2 manifest 都是预注册清单，
  execution/output 声明为 `unknown / not run`，但 filesystem 中存在对应 run/review 文件。新增
  [`records/evidence-applicability-review-living-skills-round-2.md`](records/evidence-applicability-review-living-skills-round-2.md)。
- **最小改变：** 只重连 manifest、fixture、current candidate、run/review 和 trial-ledger 的 source/hash
  边；不把 artifact 存在升级为 Run，不编辑旧 card/run/review，不重跑，不创建 skill 或评估工具。
- **关键观察：** 七个 manifest-declared candidate hash 与当前 `.agents/skills/` 源码全部不同；trial ledger 没有这七个
  round 的 lineage entry；`dual-audience-expression` 还有额外未成对 baseline。对应 reviews 能支持对已有
  文本的历史 `behavior-observed` 上限，但不能支持 current applicability、matched、portable、regression
  或 acceptance。
- **当前 standing / 处置：** 本 reconciliation 为 `historical-artifacts-observed / current-applicability-uncertain /
  independent-review-complete / acceptance-pending`，item disposition 为 `uncertain / historical-only / hold`；
  `Hubble` 已在修订后 final accept applicability bookkeeping。
  七个 carrier 继续 `.agents/skills/` incubation，不因文件存在 move、delete 或 rewrite。
- **下一 return：** named eval/runner owner、明确 card/run/review lineage、当前 candidate hash、完整 model/
  harness/tool/permission/workspace/activation identity、reviewer 独立性和 acceptance owner 恢复后，才开新的
  current round；否则保留历史 observation 并关闭当前迁移分支为 `no-proposal-now`。

### 2026-08-25：planning-inbox round-2 evidence applicability reconciliation

- **触发与来源：** 上一项 living skills round-2 family 核对之后，`planning-inbox-round-2` 仍有五项
  baseline/treatment、run identity、blind review 和 synthesis，但没有 post-freeze applicability projection；新增
  [`records/evidence-applicability-review-planning-inbox-round-2.md`](records/evidence-applicability-review-planning-inbox-round-2.md)。
- **最小改变：** 只回读 manifest、fixture/payload、candidate snapshot、current inbox/history/AGENTS、输入输出、
  events/stderr、run identity 和 review chain 的 source/hash edge；不编辑旧 artifact，不重跑，不重算 semantic score。
- **关键观察：** 文件/事件层面 artifact chain 可重建；candidate snapshot、inbox/history 和 AGENTS digest 与当前
  不同，这只是 mechanical provenance drift，不证明语义变化；served model、完整 prompt、harness、权限、隔离、
  activation 和 exit 仍 unknown。round synthesis 的最高上限是 `behavior-observed / boundary-supported`，round
  disposition 为 `adapt-and-retest`。
- **当前 standing / 处置：** `historical-chain-observed / source-applicability-uncertain / runtime-applicability-uncertain /
  independent-review-complete / acceptance-pending`；planning-inbox 继续 `retain-incubation`，仅当前
  applicability/re-run 提案为 `no-proposal-now`。`Plato` 已独立复核并 `final accept`。
- **下一 return：** 只有 named eval/runner owner、当前 candidate/source snapshot、完整 runtime identity/activation、
  fresh/superseding card、独立 reviewer 和真实 dogfood exposure/acceptance owner 恢复后，才开新 round；否则保留历史
  observation，不移动到 `skills/`。

### 2026-08-25：P15 reading candidate re-open

- **触发与来源：** 既有 `records/philosophy-p04-p15-p16-boundary-review.md` 只提供 B1–B4 hypothetical boundary fixture，
  因而 P15 原先保持 `hold-cross-boundary-fixture-only`；随后 `records/method-skill-probe-round-3.md` 在真实
  planning/design case 上固定 task、baseline/treatment、action、route 和 disposition，出现了可回读的
  practice consumer。新增 [`records/philosophy-p15-reading-review.md`](records/philosophy-p15-reading-review.md) 与
  [`../theory/philosophy/P15.md`](../theory/philosophy/P15.md)。
- **最小改变：** 只形成 P15 source-bound reading candidate，定义“相称实践怎样使主张面对对象、观察结果并
  更新 standing”，并区分 P04 knowledge、P08 scope、P16 time coverage、P03 next-practice relation 和
  semantic review/acceptance；不修改哲学 source，不形成 P16 candidate，不创建 Run、验证器或 runtime gate。
- **独立 review：** `Plato`（`01a0387b-f544-7aa1-ab7e-bbc7a3290609`）初轮指出 P08 术语沿用了旧 archive
  语境，且 superseding projection 不够显式；Main 修订为当前 living P08“问题边界/视域”，明确仅 supersede
  P15 的旧 hold 提案。Plato 复读 `accept`；未修改文件，也未取得 reading 或 acceptance 权。
- **当前 standing：** P15 为 `source-current / reading-candidate / independent-review-complete /
  research-open / acceptance-pending`；round-3 仍只有 `behavior-observed / attribution-uncertain`，不支持
  P15 reading acceptance、matched、regression、adoption 或 WorkCell/DeepSeek/实现授权。P12/P13/P16 与 B1–B4
  的 standing 不变。
- **下一 return：** P15 专属 boundary/use case、相称 evidence 和 reading acceptance owner 出现后再决定是否
  继续；若实践关系不能改变主张 standing、下一行动或 owner route，回修 P15 或返回 `no-proposal`。P16 继续
  等待 adoption/time-window consumer，不因 P15 candidate 自动打开。

### 2026-08-25：attention-management applicability return

- **触发与来源：** archive inventory 中的 `attention-management` 可能与本轮 scope correction 相邻；其
  archive 方法拥有“恢复 governing relation”的局部判断，但明确不拥有 planning、delegation 或下一实践选择。
  历史 H2 development probe 的语义 pass 已被 post-run audit 判为 false positive，不能作为当前行为接受。
- **最小改变：** 回读该 archive source、当前 scope correction、`plan`/`item-ledger`、`practice-cycle`、
  `agent-delegation` 和 `planning-inbox` 的 owner 边界；不创建 living carrier、Run、评估或新 planning item。
- **关键观察：** 当前只有一次 scope 偏窄修正，没有第二个独立 drift 实例、重复失败或 matched
  attention-specific 对照；相邻 owner 已能分别承载 scope、下一实践、贡献边界和 active-goal input/回返。
- **当前 standing / 处置：** `no-proposal-now / archive-only`；该结论不表示方法永久无价值，也不把
  现有 owner 写成注意力正确性保证。
- **下一 return：** 第二个独立 drift 实例，或现有 owner 无法区分 `switch` 与 `retain/return` 且该差异
  改变下一行动时，才重新进行 source/consumer/boundary review。

### 2026-08-25：P15-U1 practice use-case

- **触发与来源：** P15 的下一返回要求一个能区分 P04/P08/P03/P16 的专属 use case；已有 round-3 Case A/B
  提供真实 planning/design practice consumer，新增 [`records/philosophy-p15-practice-use-case.md`](records/philosophy-p15-practice-use-case.md)。
- **最小改变：** 只把 Case A 的负触发、Case B 的 action/disposition 差异和 B1–B4 的 hypothetical 非实例
  组织为 P15-U1；不修改 frozen card/task/candidate，不创建新 Run 或 runtime mechanism。
- **独立 review：** `Goodall` 先指出 Case A 的“实际执行”表述和 P04 attribution 归属错误；Main 修订后
  复核 `accept`。该 review 只覆盖 U1 的 source/边界/standing，不取得 P15 reading 或 use-case acceptance。
- **当前 standing：** `use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；
  evidence 上限仍为 `behavior-observed / attribution-uncertain`。
- **下一 return：** named reading/use-case acceptance owner 与相称边界实践；若 U1 不能改变实际判断，回修
  P15 candidate 或关闭 use-case proposal，不创建第二套检验机制。

### 2026-08-25：WorkCell readiness/source provenance reconciliation

- **触发与来源：** 父级 `records/workcell-open-relations-review.md` 与 readiness projection 已接回 A/B/C/D
  子记录，但独立复核发现 A/B/C/D 仍把 review-time hash 表达得像当前 protocol fingerprint。
  `records/evidence-applicability-review-workcell-design.md` 的 revision 前 authoritative fingerprint 为 Git
  SHA-1 `4293057d…`、raw SHA-256 `26ec714f…`；当前 executor wording revision 的 fingerprint 由
  `records/evidence-applicability-review-workcell-design-revision-2.md` 记录为 `e8f7f713… / cfe203ba…`。
- **最小改变：** 将 A/B 的 `00a7ec…`、C/D 的 `00a7ec…/25e859…` 明确标为 review-time/frozen edge，
  并在 readiness 继承 `source-edge-drift / current-applicability-uncertain`；这是 current-source child
  前的 provenance correction，不编辑旧 semantic standing，不改 protocol source，不创建 Run、机制或实现。
- **独立 review：** `Plato`（`01a0387b-f544-7aa1-ab7e-bbc7a3290609`）初轮指出 provenance
  混淆，修订后复读 `accept`。该结论只接受 provenance reconciliation，不构成 WorkCell protocol、
  readiness、DeepSeek 或 implementation acceptance。
- **当时 standing（current-source child card 前）：** A/B/C/D 的 historical design observation、
  `retain-unknown / route-to-owner` 和 `source-edge-drift / current-applicability-uncertain` 保持；
  record-boundary/contract-field 的 source-edge-match 与 `acceptance-pending` 保持。后续 child card
  已完成 source-level 回指；policy、owner、consumer、record/retention 和 implementation standing
  仍按当前 projection 保持 unknown/冻结。

### 2026-08-25：incubating skills external consumer applicability

- **触发与来源：** 为推进“剩余有价值文档/skills 迁移”分支，检查了 11 个当前 `.agents/skills/`
  carrier 与 sibling workspace `agent-worker` 的 skill authority、同名目录和引用关系；其
  `CLAUDE.md` 明确规定 `skills/` 是 source of truth，`.agents/skills/` 是 `.claude/skills/` projection。
- **最小观察：** `agent-worker/skills/` 当前没有本项目 11 个 carrier 的同名 source 或直接消费引用；
  同时观察到语义相邻的 `agent-worker/skills/attention-driven`，但它不是本项目 carrier 的直接
  consumer。结论只是在已检查 workspace/layout 范围内的 `direct-external-consumer-not-found /
  adjacent-carrier-observed`，不证明未来 consumer 或语义适用性不存在，也不构成 portable behavior
  evidence。
- **当前 standing / 处置：** portable move proposal 在本次检查范围内为
  `no-proposal-now / retain-incubation`；11 个 carrier 继续留在项目 `.agents/skills/`，不创建
  `skills/` 镜像，不复制正文，不修改 `agent-worker`，不把其独立 skill source 当作本项目 adapter。
- **下一 return：** named external consumer、source/target、明确边界和相称 behavior/regression
  evidence 出现后，逐项重开 portable review；只有项目内 consumer 时保持当前处置。该观察不改变
  WorkCell、DeepSeek Harness 或 base/runtime 的冻结。

### 2026-08-25：WorkCell RunRecord identity readiness clarification

- **触发与来源：** `records/workcell-record-boundary-review.md` 已将 RunRecord→Binding identity 的最小候选
  收窄为显式 `bindingRef` 或等强度的结构化 record projection；readiness matrix 原先没有把“可独立
  索引、能指向 admission Binding identity”和 owner 回写边界写全。
- **最小改变：** 只修订 readiness projection：protocol/record owner 在两个选项中作出选择；若不加字段，
  必须说明 request/evidence retention、digest、snapshot correction 和 structured `unknown`。不修改
  canonical protocol，不复制完整 Binding，不新增 registry 或 runtime。
- **独立 review：** `Goodall` 初轮指出 projection 未明确“不修改 canonical protocol”且替代 projection
  过宽；修订后复读 `accept`。该 review 只覆盖 readiness wording，不取得 bindingRef、protocol、security、
  retention、WorkCell acceptance 或实现权。
- **当前 standing / 下一 return：** readiness 仍为
  `acceptance-readiness-observed / source-applicability-uncertain / independent-review-complete /
  acceptance-pending`；下一步仍是 named protocol/record owner 的 owner-backed decision，未取得前保持
  `retain-unknown / route-to-owner`，不回写 canonical protocol。

### 2026-08-25：WorkCell spec identity boundary

- **触发与来源：** `design/work-cell-protocol.md` §6.1 允许 `WorkCellRunRequest.spec` inline 或
  `{specRef, digest}`，但 §6.5 的 RunRecord 只显式保存 `requestId`；§17.2 又把默认形态列为 open。
  新增 [`records/workcell-spec-identity-boundary-review.md`](records/workcell-spec-identity-boundary-review.md)，并与
  Binding identity、observation/lineage 和 contract-field review 分开。
- **最小改变：** 保留 inline/reference 为传输候选，比较 requestId 间接回查、结构化 Spec identity
  projection、既有不可变 artifact、immutable registry 和完整 Spec 复制；当前只保留“可结构化关联且在
  约定保留范围内支持恢复/比较”的 projection 候选，是否独立索引由真实 consumer 决定。不改 canonical
  protocol、不创建 registry/runtime fetch、不复制完整 Spec。
- **当前 standing：** `design observation / candidate-proposal / acceptance-pending`；这是
  design/auditability hypothesis，不是 record consumer failure。digest canonicalization、Spec artifact/
  request/RunRecord retention、correction、不可取、`invalid-reference` 和跨版本相等关系仍独立 unknown；
  `requestId`、`runId`、`bindingRef` 和 Spec identity 不互相冒充；完整 Spec snapshot 另为待审 unit。
- **下一 return：** named spec/protocol/record consumer 或 owner-backed decision；若 owner 认为 request
  retention 已足够，必须明确 request 不可取、跨 run 比较和 parent 缺失时的 structured `unknown`，否则保持
  `retain-unknown / route-to-owner`，不进入 adapter、DeepSeek Harness 或实现计划。

### 2026-08-25：`work-estimation` current planning use review

- **触发与来源：** 当前 WorkCell Spec identity review 结束后，需要决定继续堆 WorkCell 字段、等待 owner、
  提前设计 DeepSeek、启动不可归因 matched round、继续 Stage A 方法形成或重开历史 evidence；回到
  [`.agents/skills/work-estimation/SKILL.md`](../.agents/skills/work-estimation/SKILL.md)、
  [`whole-planning-work-estimate.md`](index/whole-planning-work-estimate.md) 和
  [`records/work-estimation-candidate-review.md`](records/work-estimation-candidate-review.md)。
- **最小改变：** 把 `work-estimation` 明确为 estimate/propose 方法：它提供 branch、dependency、
  discovery、acceptance observation 和粒度；Main/planning authority 选择 standing/下一 branch，
  `practice-cycle`、`form-selection`、`skill-formation` 和 domain owner 不被吞并。新增 review 不创建
  第二 carrier、不启动 Run、不改 WorkCell/DeepSeek 或实现边界。
- **独立复核修订：** `Kepler` 指出 WorkCell case 只能算 Main self-application，不能算 named consumer
  或 carrier-specific evidence；并要求每个 branch 有 dependency、acceptance observation、discovery
  open/close、disconfirming observation 和 next owner。修订后由 `Meitner` 独立复读 `accept`。
- **当前 standing：** carrier 总体保持 `retain-incubation / behavior-observed / attribution-uncertain /
  adapt-and-retest`；本次 WorkCell case 单独关闭为 `no-proposal-now`，不影响 carrier 总体 incubation；
  named consumer、matched、regression、portable acceptance 和资源预测均未知。没有 named consumer 且
  工作图不改变下一选择时关闭同类 Main-only probe，不累积重复自评。
- **下一 return：** 取得 named planning/design consumer 和可区分的粗/细粒度或 discovery-branch case，再
  冻结相称 card、runner/source identity 和独立 review；否则保持 carrier incubation，不进入 `skills/`，不
  把方法变成 planning preflight、预算系统或 runtime guarantee。

### 2026-08-25：Round 1 meta-matched historical evidence applicability closure

- **来源/对象：** `evals/skill-evaluation/round-1-meta-matched-{baseline,treatment,review}.md`、Round 1 F1
  fixture、当前 `skill-formation` carrier、`evals/skill-evaluation/protocol.md` 与 `trial-ledger.md`。
- **最小改变：** 只做 source/path/hash、candidate/activation、运行 identity 和 ledger edge reconciliation；
  不修改历史 artifact、不重跑、不创建 synthetic Run。
- **观察：** `theory/philosophy.md` hash match；`gene-expression` drift；旧 `theory/harness.md` 缺失但
  `theory/harness/theory.md` content hash match；fixture/protocol freeze、candidate hash、activation 和
  full runtime identity 不可回建，ledger 无 dedicated meta-matched entry。
- **当前 standing/处置：** 历史 chain `historical-only / hold / no-proposal-now`；历史 boundary observation
  不支持 current matched、portable 或 acceptance。`skill-formation` carrier 维持
  `retain-incubation / portable-no-proposal`，不改变其它 10 个 carrier 的 standing。
- **依赖/出口：** named consumer/eval owner、current source/card/candidate hash、完整 model/harness/tool/
  permission/workspace/activation identity、独立 reviewer 和会改变迁移选择的 case；缺任一项即保留
  historical/uncertain，不直接重跑。
- **独立 review / 下一 owner：** `Dewey`（`01a0394d-c4ad-7e10-a91d-68a232d7ba24`）复读 `accept`，只接受
  applicability bookkeeping；evidence-maintenance / skill-migration owner 仍 `unknown`，不取得 skill、
  phase、WorkCell、DeepSeek 或 implementation acceptance。

### 2026-08-25：文档迁移状态 projection reconciliation

- **来源/对象：** `theory/philosophy.md` 的 16 条 source、当前 `theory/philosophy/Pxx.md` 文件清单、
  `records/philosophy-remaining-reading-disposition.md`、`coverage-audit.md`、`plan.md` 与
  `theory/research/theory-structure.md`。
- **观察：** 当前有 P01–P11、P14、P15 共 13 个 reading candidate 文件；P12/P13/P16 没有文件，且
  分别由 `no-proposal-now`、`no-proposal-now`、`hold-cross-boundary-fixture-only` 解释。两个派生摘要
  曾把“目标 P01…P16”写得像当前迁移状态，harness theory 的旧根路径也需要在现行摘要中明确为历史快照。
- **最小改变：** 只修正 `plan.md` 与 `theory-structure.md` 的当前状态表达，同步 P04/P05 reading artifact
  的 `independent-review-complete` standing，新增
  [`records/document-migration-status-reconciliation.md`](records/document-migration-status-reconciliation.md)；不改
  source、不创建 P12/P13/P16、不移动 skill/archive。
- **当前 standing/处置：** `source-current / artifact-inventory-observed / projection-corrected / acceptance-pending`；
  `retain-current-projection / no-new-reading-proposal`。该条不关闭 reading acceptance、phase 1 或任何实现前置。
- **依赖/出口：** reading source、standing、Pxx review、唯一 canonical path 与双受众投影均能回读；若
  source、artifact、standing 或 reopen 条件改变则重开。`Chandrasekhar`（`01a03956-a4e0-7711-9b9d-5ac406b69b90`）
  最终只读复核 `accept`，仅覆盖本条 bookkeeping，不覆盖 reading acceptance 或阶段/实现授权。

### 2026-08-25：P01/P03 artifact standing reconciliation

- **来源/对象：** P01/P03 reading files、`records/philosophy-reading-review.md`、`records/philosophy-parent-review.md`、
  `coverage-audit.md` 与本 ledger 的 P01/P03 rows。
- **观察：** planning evidence 已标 `independent-review-complete / acceptance-pending`，但 P01/P03
  artifact 顶层仍只有 `reading-candidate`；正文已有独立 source/边界 review 的说明。
- **最小改变：** 只同步 P01/P03 顶层 status 为 `source-current / reading-candidate /
  independent-review-complete / acceptance-pending / research-open`；不改 source、定义、父关系或 acceptance。
- **当前 standing/处置：** `artifact-standing-reconciliation / independent-review-complete /
  acceptance-pending`；保留 candidate，不产生 reading acceptance、behavior、portable move 或实现授权。
- **出口/revisit：** `Chandrasekhar`（`01a03956-a4e0-7711-9b9d-5ac406b69b90`）独立复核 `accept`，仅
接受 artifact bookkeeping；若未来 source/边界 evidence 不足则恢复准确 standing，并标记受影响
projection stale。

### 2026-08-25 WorkCell executor comparability boundary

| 字段 | 当前值 |
| --- | --- |
| item | WorkCell provider-neutral executor comparability |
| source | `design/work-cell-protocol.md` §5.1、§11.1、§12.2、§17.2、§18.2；`records/workcell-design-acceptance-readiness.md` |
| observation | pre-revision source 中完整 `WorkCellBinding` 含 `executor`，但 §11.1/§12.2 的比较 wording 未区分完整 identity 与固定维度；当前 source 已完成该 wording clarification |
| current standing | `design-boundary-candidate / source-revision-applied / current-applicability-reconciled / independent-review-complete / acceptance-pending / empirical-unknown` |
| minimum disposition | 每个 executor 变体各自物化 immutable Binding；固定非 executor workspace/tool/effect 约束；暂不新增 comparison type 或 runtime mechanism |
| owner / consumer | protocol/eval owner、真实 eval consumer、canonical equality owner：`unknown` |
| evidence | 仅 design-boundary observation；无 matched Run、无 harness effect attribution、无 provider 优劣结论 |
| allowed effect | 更新 review/readiness/plan/roadmap projection；已完成仅限 wording/diagram 的 canonical source revision；owner 接受后再决定是否形成 eval contract |
| prohibited effect | 不选 Vercel/DeepSeek、不创建 registry/queue/session resume、不启动 adapter/runtime 实现 |
| exit / revisit | independent review + owner-backed decision；出现 named consumer、matched fixture 或 Binding/executor identity source change 时 reopen |

独立 reviewer `Chandrasekhar` 已 `ACCEPT`，仅接受 boundary/projection；`Dewey` 已独立复核 revision-2
current-source bookkeeping 并 `ACCEPT`；不取得 canonical protocol、eval、provider 或实现授权。当前 source revision 与 pre-revision review 的适用性由
[`records/evidence-applicability-review-workcell-design-revision-2.md`](records/evidence-applicability-review-workcell-design-revision-2.md)
追踪。记录：[`records/workcell-executor-comparability-review.md`](records/workcell-executor-comparability-review.md)。本条不改变
WorkCell design acceptance、DeepSeek system design 前置或实现冻结。

### 2026-08-25：archive skill inventory completeness

| 字段 | 当前值 |
| --- | --- |
| item | archive skill inventory completeness |
| source | `archive/skills/*/SKILL.md`；`records/archive-skill-inventory.md`；`skill-migration.md`；`skill-formation` |
| observation | 实际 archive 载体 29 个；inventory 唯一条目 29 个；缺失集与多余集均为空 |
| current standing | `inventory-set-match-observed / independent-review-complete / acceptance-pending` |
| minimum disposition | `retain-inventory / no-new-migration-proposal`；保留逐项原 disposition |
| owner / consumer | migration planning owner、逐项 semantic owner、portable acceptance owner：`unknown` |
| evidence | 只支持 archive path 与 inventory set 的机械一致性；不支持 behavior、matched、portable、regression 或 acceptance |
| allowed effect | 更新 inventory、skill-migration、plan、roadmap 的 provenance projection |
| prohibited effect | 不创建 carrier、`skills/`、Run、portable move；不移动/删除 archive；不把 29/29 写成 skill acceptance |
| exit / revisit | 独立 review 确认后关闭本次 check；archive/清单增删改名、living carrier 迁移或 external consumer 出现时 reopen |

该项使用 `skill-formation` 的形式准入边界进行 review；`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）
已独立 `ACCEPT`，仅覆盖 completeness bookkeeping，不取得 skill、portable、move 或实现权。它不改变
P01–P16、WorkCell、DeepSeek 或实现 standing。

### 2026-08-25：P04/P08 boundary relation

| 字段 | 当前值 |
| --- | --- |
| item | P04/P08 parent relation：knowledge state vs problem boundary |
| source | `theory/philosophy.md` P04/P08；`theory/gene-expression.md`；P04/P08 reading candidates；`records/philosophy-p04-p08-boundary-review.md` |
| observation | F1 固定同一 scope 但证据不足；F2 只改变一个 scope 维度并要求 re-problemize；F3 scope 与 evidence 明确但不等于 acceptance |
| current standing | `design-boundary-observed / independent-review-complete / acceptance-pending` |
| minimum disposition | 保留一个 source-linked boundary record；不创建新 reading 或 scope mechanism |
| owner / consumer | claim/design、scope/consumer、evidence/fixture、reading/parent acceptance owner：均 `unknown` |
| evidence | source/reading/semantic boundary observation；无 Agent behavior Run、matched、regression、reading acceptance 或 WorkCell acceptance |
| allowed effect | 更新 coverage、whole estimate、plan、roadmap 与本 ledger 的 relation projection；真实 route case 出现时另开 evidence |
| prohibited effect | 不改哲学 source；不把 scope 外写成 unknown/false/forbidden；不创建 runtime router、权限机制或实现授权 |
| exit / revisit | 下一 return 是真实 Agent route case 或相称的 P05/P08 同一对象 fixture；若不能改变 claim strength、owner route 或下一动作则返回 `no-proposal`；source、scope、evidence contract 或 owner 改变时 reopen |

`McClintock`（`01a0393c-3b3d-7932-b3da-4653254e30ce`）已独立 `ACCEPT`，仅接受本 relation 的语义
边界与 projection，不取得 P04/P08 reading、父 item、WorkCell、DeepSeek 或实现 acceptance。

### 2026-08-25 living skill placement completeness

| 字段 | 当前值 |
| --- | --- |
| item | living skill carrier placement：`.agents/skills/` incubation vs `skills/` portable form |
| source | `.agents/skills/*/SKILL.md`；`skill-migration.md`；`AGENTS.md` Skill locations；`form-selection`；`records/living-skill-placement-review.md` |
| observation | 实际 carrier、frontmatter `name` 与迁移表均为同一 11 项集合；`skills/` 目录不存在；没有发现 orphan、duplicate canonical carrier 或未登记 placement |
| current standing | `placement-set-match-observed / form-decision-observed / independent-review-complete / acceptance-pending` |
| minimum disposition | `retain-project-local-incubation / collection-level-portable-placement-no-proposal-now`；逐项 semantic/portable standing 仍以 `skill-migration.md` 为准 |
| owner / consumer | project planning/skill owner、portable acceptance owner、move owner：`unknown`；项目 Agent discovery 是 observed consumer，不等于 external consumer |
| evidence | 只支持集合对账与 form/authority/lifecycle 边界；不支持 behavior、matched、portable、regression、adoption 或 skill acceptance |
| allowed effect | 更新 placement、skill-migration、plan、roadmap 与本 ledger 的 projection；按逐项条件重开 semantic 或 portable review |
| prohibited effect | 不创建 `skills/`，不移动/复制/删除 carrier；不创建 mirror/runtime loader/registry；不把集合级决定覆盖逐项 standing 或授权实现 |
| exit / revisit | 本次 placement check 经独立 review 关闭；carrier、项目 authority、逐项 consumer/evidence、portable boundary 或普通文档/reference 形式关系变化时 reopen |

`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）已独立 `ACCEPT`，仅覆盖 placement review 的
文档边界，不取得任何 skill semantic acceptance、portable move、runtime 或实现权。

### 2026-08-25 WorkCell `CommandGrant.argumentShape` boundary

| 字段 | 当前值 |
| --- | --- |
| item | WorkCell declaration/grant/call/observation command boundary：`CommandGrant.argumentShape` |
| source | `design/work-cell-protocol.md` §4.2、§5.1、§5.2、§6.4、§9.1、§17.2、§18.7；`records/workcell-contract-field-boundary-review.md`；`records/workcell-design-acceptance-readiness.md`；历史 `archive/packages/work-cell/README.md` |
| observation | `CommandRequirement` 是需求；`WorkCellBinding.toolSurface`/`ToolGrant` 与 `effectPolicy.command`/`CommandGrant` 是 host grant；`requestTool` 是 transport request；actual host call observation、effect/record projection 和 mechanical check 不能由 executor return 或 `tool.requested` 冒充；failure code 与 `observed: unavailable`/事实 `unknown` 分开 |
| current standing | `design-boundary-candidate / source-applicability-limited / independent-review-complete / acceptance-pending` |
| minimum disposition | `retain-boundary-candidate / route-to-owner`；只保留结构化 argv/invocation wording candidate，不冻结完整 `CommandGrant` schema |
| owner / consumer | host/security owner：grant、argv/shell policy、host effect boundary；protocol/record/evidence owner：call/event/observation shape、failure/standing、retention；acceptance owner：均 `unknown`；当前无 named host consumer/Run |
| evidence | current protocol/design observation 与历史 exact-argv/no-shell support；无 current host Run、security acceptance、matched adapter comparison、runtime enforcement 或 implementation evidence |
| allowed effect | 更新 readiness、plan、roadmap、whole-planning estimate、item-loop 与本 ledger；owner decision 后另开 source revision/applicability reconciliation |
| prohibited effect | 不修改 canonical protocol，不把 exact argv 当 filesystem confinement，不实现 command runner/shell sandbox/argv parser/policy registry，不启动 provider comparison 或实现 |
| exit / revisit | host/security 与 protocol/record/evidence owner 分别对 C1–C4 选择 `accept-planning-boundary-candidate`、`retain-unknown`、`no-proposal` 或延期，并保留 acceptance pending；owner、source、consumer、security policy、call/effect shape 或 retention 变化时 reopen |

`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）已独立 `ACCEPT`，只接受该 planning boundary
review，不构成 `CommandGrant` canonical schema、host security policy、protocol acceptance、runtime
enforcement 或 implementation acceptance。

### 2026-08-25 WorkCell `SemanticReview` / `AcceptanceDecision` boundary

| 字段 | 当前值 |
| --- | --- |
| item | WorkCell semantic review / acceptance authority boundary |
| source | `design/work-cell-protocol.md` §8.1–§8.3、§16、§17.2、§18；`records/workcell-design-acceptance-readiness.md`；`records/workcell-contract-field-boundary-review.md`；`theory/research/agent-delegation.md`；`records/workcell-semantic-review-boundary-review.md` |
| observation | `MechanicalCheck` 是机械观察；`SemanticReview` 是按 rubric 的语义判断；`AcceptanceDecision` 是 Principal/acceptance authority 的决定；next action 是 Task/orchestrator/owner 的新决定；subject、rubric、snapshot、findings、blocked/correction/supersession、basis 和 owner 仍未闭合 |
| current standing | `design-boundary-candidate / source-backed / independent-review-complete / acceptance-pending` |
| minimum disposition | `retain-boundary-candidate / route-to-semantic-review-and-acceptance-owners`；复用现有对象并澄清交接，不创建 review queue/gate |
| owner / consumer | semantic-review/rubric owner、protocol/record/evidence owner、Principal/acceptance owner：`unknown`；当前无 named semantic review consumer 或 acceptance decision |
| evidence | protocol/source-backed design observation 与 S1–S5 bounded counterexamples；无业务 rubric acceptance、真实 semantic review Run、Principal decision、adoption 或 regression evidence |
| allowed effect | 更新 WorkCell readiness、plan、roadmap、coverage、item-loop、whole-planning estimate 与本 ledger；owner decision 后另开 source revision/applicability review |
| prohibited effect | 不修改 canonical protocol，不定义业务 rubric，不把 reviewer/check/pass/complete 写成 accepted，不创建 review queue/gate/registry，不授权 WorkCell/DeepSeek/base 实现 |
| exit / revisit | semantic-review/rubric、protocol/record/evidence 与 acceptance owner 分别对 S1–S5 选择 `accept-planning-boundary-candidate`、`retain-unknown`、`no-proposal` 或延期；rubric、subject/record、late evidence、correction、authority、consumer 或 retention 变化时 reopen |

`Chandrasekhar`（`01a03956-a4e0-7711-9b9d-5ac406b69b90`）已独立 `ACCEPT`，只接受该 planning
boundary record，不构成 semantic review、business rubric、Principal acceptance、protocol acceptance、
runtime 或 implementation acceptance。

### 2026-08-25：WorkCell A/B/C/D current-source applicability

| field | current result |
| --- | --- |
| item | A bounded drain/unknown effect；B Binding expiry/revocation；C Event observation/replay；D retry/continue lineage |
| source | current `design/work-cell-protocol.md` §5.1/§5.2、§6.1–§6.3/§6.5、§7、§9、§11.1、§12.2、§17、§18.2/§18.9–§18.12；revision-2 applicability record；四项 child review；current fingerprint `fa602faf… / c78876b4…` |
| observation | current source 仍承载四项的 lifecycle、Binding、typed Event、new-run/`retry-of`/`continued-from` baseline；policy、retention、replay、recovery 仍开放 |
| standing | `current-source-boundary-observed / applicability-reconciled / independent-review-complete / acceptance-pending` |
| disposition | `retain-existing-reviews / route-policy-and-owner-decisions / no-rerun-now`；A/B/D `retain-unknown / route-to-owner`；C `retain-unknown / no-proposal-now-for-replay / route-to-owner` |
| owner / consumer | host/security、coordinator、protocol/record/evidence、retention/recovery、acceptance owner；具体 owner 与 named consumer unknown |
| evidence | current-source section read；historical pre-contract-revision edge `e8f7f713… / cfe203ba…`；旧 round source `2ed713fe… / f87422b0…` 与 previous current edge `7240b23… / 513e7ed…` 均仅保留为历史；无 host Run、replay Run、retention evidence 或 protocol acceptance |
| allowed effect | 更新 source applicability 与 planning projections；保持旧 review lineage 和未知 |
| prohibited effect | 不选择 cutoff/revocation/replay/retention/lineage policy；不增加字段、registry、queue、runtime、provider comparison 或实现 |
| exit / revisit | current source 或相关 review source identity 改变、真实 owner/consumer/evidence 出现时 reopen；C 的 replay 分支仅在 named replay consumer、owner-backed decision 或会改变判断的 counterexample 出现时重开；本 round exit 不关闭 A/B/C/D 的 unknown |

`Halley` 已独立只读 `ACCEPT` 该 child record 的修订完整性。该 verdict 只接受 source applicability
bookkeeping，不构成 WorkCell protocol、host/security、record、retention、DeepSeek 或 implementation
acceptance。

### 2026-08-25：practice-cycle / work-estimation carrier disposition reconciliation

| field | current result |
| --- | --- |
| item | `practice-cycle` 与 `work-estimation` project-local incubation carriers |
| source | 两个当前 `SKILL.md`、`records/design-development-review.md`、`skill-migration.md`、round-3/round-4 practice-cycle records、`records/work-estimation-candidate-review.md` 与 `records/work-estimation-evidence-closure.md` |
| observation | `practice-cycle` 有 round-3 behavior observation 但 identity/activation/schema/owner 前置不足；`work-estimation` 有重复 Main-only planning observation 但没有 named consumer 或 accuracy/matched evidence |
| standing | carrier-level：两者均 `retain-incubation / adapt-and-retest`；case-level：practice-cycle `no-proposal-now / route-to-owner`，work-estimation `no-proposal-now / wait-for-named-consumer-and-decision-changing-case` |
| portable | 两者独立 carrier-level portable review disposition 为 `no-proposal-now`；不由 case disposition 自动推出，不 move 到 `skills/` |
| owner / consumer | eval/runner owner、planning/design consumer、skill-formation owner、acceptance owner：具体 named owner/consumer unknown |
| evidence | `format-valid`、`behavior-observed / attribution-uncertain`；无 matched improvement、regression、adoption 或 carrier acceptance |
| allowed effect | 修正 carrier/case/portable standing projection，保留两个方法的边界与 revisit |
| prohibited effect | 不合并两个 skill，不启动 round 4 或新 Run，不创建 preflight/预算系统，不授权 WorkCell/DeepSeek/base/runtime 或实现 |
| exit / revisit | named eval/runner owner + identity/activation/schema + narrow Case B，或 named planning/design consumer + decision-changing case 出现时 reopen；否则保持当前处置 |

`Meitner` 已独立只读 `ACCEPT` 该 reconciliation record。该 verdict 只接受 migration/planning bookkeeping，
不构成 skill semantic acceptance、portable promotion、move、资源承诺或实现授权。

### 2026-08-25：migration boundary current projection

本条把 [`phase-1-exit-review.md`](phase-1-exit-review.md) 的最新迁移边界接回 item ledger；不新增顶层
item，也不把 inventory 完整性当作 phase completion。

| 对象 | 当前 observation | 当前 disposition / exit |
| --- | --- | --- |
| 16 条 philosophical source | `theory/philosophy.md` 已在现行路径；source line 不变 | `source-current`；不再因 reading 数量补写 source |
| 16 个 reading package | P01–P11、P14、P15 有 13 个 candidate 文件；P12/P13/P16 按各自 disposition 不建文件 | 13 个继续 `reading-candidate / acceptance-pending`；P12/P13 `no-proposal-now`；P16 `hold-cross-boundary-fixture-only` |
| archive skill inventory | 29 个 archive `SKILL.md` 与 29 项清单集合相等；initial triage snapshot 为 5 absorbed-current、3 absorbed-no-independent-proposal、3 archive-only、12 candidate-later、6 candidate-next；current branch 以 `skill-migration.md`、candidate disposition record 和 dated overlay 为准 | `inventory-complete / semantic-and-portable-acceptance-pending`；archive 继续保留历史来源；初筛计数不等于当前逐项 disposition |
| living skill placement | `.agents/skills/` 11 个，`skills/` 0 个；placement 与项目 authority/consumer 相关 | `retain-project-local-incubation / collection-level-portable-no-proposal`；不批量 move |

允许效果仅为同步 plan/roadmap/ledger 的当前 projection 和 reopen 条件；禁止效果仍是批量迁移、portable
promotion、phase transition、WorkCell/DeepSeek/base 实现。下一 return 是具体 candidate 的真实 consumer
或 owner-backed decision，而不是继续增加 inventory 字段。

### 2026-08-25：WorkCell contract projection source revision

[`records/workcell-protocol-contract-projection-reconciliation.md`](records/workcell-protocol-contract-projection-reconciliation.md)
对 protocol §6.5/§7.1–§7.3 做了 wording-only source revision：`EffectSummary`、`EffectObservation`、
`UsageObservation` 继续是 named slots/候选 projection，不是已接受 canonical shape；失败示例不再用
`effects.workspace` 作为隐含字段。受影响 contract projection 当前为
`current-source-supported / applicability-reconciled / acceptance-pending`，而 authority、retention、
correction、named owner、A/B/C/D policy 与 protocol acceptance 仍 unknown。该条只更新 PL-06 source/
projection lineage，不改变 WorkCell → DeepSeek system design → implementation 的顺序，也不授权实现。

### 2026-08-25：archive inventory status-locus reconciliation

`records/archive-skill-inventory.md` 的初筛标签与较晚的逐项 carrier disposition 曾存在可误读的时间层级差异。
本轮只把 inventory 明确限定为 archive 集合/initial triage source，并将 current standing 回接
`skill-migration.md`、candidate disposition record 与 dated projection；不新增 planning item，不重复
迁移正文。

| observation | current disposition | allowed effect / exit |
| --- | --- | --- |
| 初筛表中的旧 `candidate-next` 不等于当前未判断；五项方法 carrier/branch 已有较晚 overlay | status-locus-corrected / acceptance-pending | 只修正 current projection；`practice-cycle`、`work-estimation`、`mechanism-design-review`、`code-review` 与 `structural-refactoring` 的具体 standing 仍按各自 record 回读 |
| archive 集合仍为 29 项，living `.agents/skills/` 仍为 11 个，portable `skills/` 仍为 0 | inventory/placement unchanged | 不创建 carrier、不 move、不删除 archive；出现新 consumer/owner/evidence 时按 item reopen |

本项不改变 skill semantic acceptance、portable promotion、phase-complete、WorkCell/DeepSeek 或实现冻结。

### 2026-08-25：WorkCell review-family source provenance reconciliation

| observation | current standing | minimum change / exit |
| --- | --- | --- |
| 多个窄 review 的 `4293057d… / 26ec714f…` 是 contract projection revision 前的 review-time edge；该历史条目当时的 protocol 为 `2ed713fe… / f87422b0…`，当前已更新为 `7240b23… / 513e7ed…` | `source-drift-observed / review-time-edges-labeled / acceptance-pending` | 保留旧 review lineage，修正 header/correction 的 current wording；由 review-family、contract projection 与 current-source child record 分别承载 applicability |
| Effect/Usage named-slot 与 A/B/C/D baseline 已有窄 current-source reconciliation；Binding/Spec/CompletionAction/record integration/executor 的 canonical acceptance 仍未知 | `applicability-scoped / owner-return` | 不批量重跑、不补字段、不建 registry/Run；named owner/consumer 或新的 current-source card 出现时按 family reopen |

本项只更新 PL-06/相关 WorkCell review 的 provenance projection，不改变 protocol acceptance、provider/DeepSeek
选择、phase-complete 或 implementation authorization。

### 2026-08-25：WorkCell identity review current-source applicability

| field | current result |
| --- | --- |
| item | RunRecord/Binding identity 与 Spec identity 的 current-source applicability child；不合并两个 canonical review unit |
| source | 该 child 的既有回读覆盖 `design/work-cell-protocol.md` §5.1、§6.1、§6.5、§8.2、§11.1、§17.2、§18.1/§18.12；旧 Git `2ed713fe…` / raw `f87422b0…` 与 previous current edge `7240b23…` / `513e7ed…` 仅为 historical edge；当前 source `fa602faf…` / `c78876b4…` 的受影响边界已完成窄回读与独立复核 |
| observation | immutable Binding、request `bindingRef`、Spec inline/reference、new-run/parent baseline 可回指当前 source；RunRecord 仍没有显式 Binding/Spec identity slot，digest/canonicalization、retention、correction、registry authority 和 named consumer 仍 unknown |
| standing | `source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending` |
| minimum disposition | `retain-current-source-boundary / reconcile-details-as-open / route-to-protocol-record-and-spec-owners / no-rerun-now` |
| owner / consumer | protocol、record/evidence、Spec producer/versioning、host/security、eval/comparison、acceptance owner；具体 named owner/consumer unknown |
| allowed effect | 更新 readiness、evidence-maintenance、item-loop、plan、roadmap 的 source/applicability projection；owner decision 后另开 canonical shape/applicability review |
| prohibited effect | 不修改 canonical protocol，不添加 `bindingRef`/Spec slot、digest algorithm、registry、fetch、retention service、lineage store、Run、adapter 或实现 |
| exit / revisit | 两个 review 都能回指当前 source，且 owner 对字段或 `retain-unknown/no-proposal` 及 structured unknown 作出决定；source、consumer、retention/correction、comparison fixture 或 acceptance owner 变化时 reopen |

### 2026-08-25：practice-cycle E0 named eval/runner owner-surface check

| field | current result |
| --- | --- |
| item | A4 round-4 precondition E0；不创建新 Run 或新的 skill candidate |
| source | `AGENTS.md`、round-3/round-4 probe records、evaluation protocol/trial ledger/manifests、`skill-migration.md` 与 `evidence-maintenance-review.md` |
| observation | checked surface 没有 named eval/runner owner 能同时回带 runner/model/harness/workspace identity、activation proof、统一 schema 和运行回返；这些关系仍为 `unknown` / `route-to-owner` |
| standing | `owner-surface-checked / owner-unknown`；underlying `practice-cycle` 仍 `retain-incubation`，round 3 仍 `behavior-observed / attribution-uncertain / adapt-and-retest` |
| independent review | `Chandrasekhar`（`01a03956-a4e0-7711-9b9d-5ac406b69b90`）独立只读 `ACCEPT`；仅覆盖 checked-surface、branch scope 与不越权边界 |
| minimum disposition | 当前 matched branch `route-to-owner / no-proposal-now`；只关闭 E0 discovery 分支，不关闭 candidate 或 acceptance |
| owner / consumer | Main 只负责发起 discovery；实际 eval/runner、schema、review 与 acceptance owner 仍 unknown |
| allowed effect | 更新 round-4、migration、plan、roadmap、phase、estimate 与 loop projection；等待 owner-return |
| prohibited effect | 不指定 owner、不新建 card/Run/fixture/schema、不重跑、不提升 matched/regression/acceptance/portable standing，不 move、不实现 |
| exit / revisit | named owner 回带 identity、activation/non-activation、schema、card/task/source hash 与失败/停止记录后，才重开 E1；否则保持当前边界 |

### 2026-08-25：P15-U1 named-owner return check

| field | current result |
| --- | --- |
| item | P15-U1 planning/design practice use-case 的 acceptance owner return；不重开已完成 source/边界 review |
| source | `AGENTS.md`、`plan.md`、`roadmap.md`、`coverage-audit.md`、`records/philosophy-p15-reading-review.md`、`records/philosophy-p15-practice-use-case.md` |
| observation | 当前 checked authority/planning surface 没有 named reading/use-case acceptance owner；`Goodall`/`Plato` 只拥有独立 review |
| standing | U1 `use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；owner-return branch `route-to-owner / no-proposal-now` |
| minimum disposition | 保留 P15 candidate/U1 与 round-3 evidence，关闭当前 owner-return self-application；不把 no-proposal branch 解释成 P15 无价值 |
| owner / consumer | round-3 planning/design consumer 已有；reading/use-case acceptance owner 与 practice/evidence owner 仍 unknown |
| allowed effect | 更新 P15、phase-1、plan、roadmap、coverage/ledger 的 route projection；named owner 出现后重新形成窄 decision |
| prohibited effect | 不指定 owner、不接受 reading、不新增 practice/fixture/Run、不修改哲学 source、WorkCell、DeepSeek 或实现 |
| exit / revisit | named owner 给出 retain/revise/close 与相称 next practice；或 source、consumer、rubric、attribution evidence 变化时 reopen |

### 2026-08-25：archive `SKILL.md` source-scope reconciliation

| field | current result |
| --- | --- |
| item | archive `SKILL.md` source scope；不新增 migration item |
| source | `find archive -name SKILL.md` 与 `find archive/skills -mindepth 2 -maxdepth 2 -name SKILL.md`；[`records/archive-skill-source-scope-reconciliation.md`](records/archive-skill-source-scope-reconciliation.md) |
| observation | 宽扫描共 76 个：canonical `archive/skills` 29、evaluation fixture/served material 37、legacy 9、package fixture 1 |
| standing | `source-scope-observed / inventory-scope-reconciled / acceptance-pending`；migration inventory 仍为 canonical 29 |
| independent review | `Dewey`（`01a0394d-c4ad-7e10-a91d-68a232d7ba24`）独立只读 `ACCEPT`；确认 76 总数、29/37/9/1 分类、source authority 与不越权边界 |
| minimum disposition | `retain-canonical-29 / classify-47-as-historical-or-fixture / no-new-migration-proposal` |
| owner / consumer | archive inventory/source-scope owner、逐项 semantic owner、portable acceptance owner 仍 unknown；非 canonical class 由其上层 evaluation/legacy/package record 负责 |
| allowed effect | 修正 inventory provenance、plan、roadmap、phase、loop 与后续审计命令的 source class |
| prohibited effect | 不把 76 展开成 migration items，不复制/移动/删除 47 个文件，不创建 carrier、Run、portable move、WorkCell/DeepSeek 设计或实现 |
| exit / revisit | archive path class、inventory authority、非 canonical artifact 的 current-source 声明或真实 consumer 改变时 reopen；独立 review 后关闭本次 ambiguity |

### 2026-08-25：WorkCell review-family provenance review return

> 历史快照：以下记录发生在 CompletionAction current-source child 建立前；当前 child 结果见后续条目。

| field | current result |
| --- | --- |
| item | WorkCell review-family source provenance；不改变 canonical protocol |
| source | 该历史快照中的 protocol `2ed713fe… / f87422b…`；当前 source 已更新为 `7240b23… / 513e7ed…`；旧 contract/executor edge `429/26ec`、`e8f7/cfe203`；lifecycle/lineage edge `00a7/25e`；review-family record与各直接 applicability records |
| observation | `Meitner` 发现并促成修正：executor comparability 需直接链接 revision-2/自身 review；contract/executor 与 lifecycle/lineage source chain 必须分开；CompletionAction 无独立 current-source record |
| standing | `source-drift-observed / review-time-edges-labeled / independent-review-complete / acceptance-pending`；CompletionAction applicability 保持 pending |
| independent review | `Meitner`（`01a03947-bfd5-7872-b955-736b47992328`）独立只读 `ACCEPT`，经过两轮边界修订 |
| minimum disposition | `retain-review-lineage / route-CompletionAction-current-source-read / no-rerun-now` |
| owner / consumer | protocol/record owner 尚 unknown；CompletionAction shape/owner review 与 source applicability 不互相代签 |
| allowed effect | 更新 provenance、readiness、plan、roadmap、phase、estimate 与 loop projection；保留 current-applicability-pending |
| prohibited effect | 不补 CompletionAction 字段、不创建 registry/Run/runtime、不接受 WorkCell/provider/DeepSeek/实现 |
| exit / revisit | protocol/record owner 直接回读 CompletionAction 相关 sections并形成独立 applicability record；source、consumer、owner 或 protocol revision 变化时 reopen |

### 2026-08-25：CompletionAction current-source applicability return

| field | current result |
| --- | --- |
| item | CompletionAction current-source applicability child；不合并 CompletionAction canonical shape review |
| source | 该 child 的既有回读覆盖 protocol §4.5、§6.3、§6.4、§6.5、§7.3、§8.1、§16、§17.1、§18 checks 3/5；旧 `2ed713fe… / f87422b0…`、`7240b23… / 513e7ed…` 与 `429/26ec` 均为 historical edge；当前 source `fa602faf… / c78876b4…` 的受影响 section 已完成窄回读与独立复核 |
| observation | current source 支持 declaration/call/return/observation/check 的对象分层、named-slot applicability、executor return 不直接产生 host observation、mechanical check 不等于 acceptance；CompletionActionObservation 完整 shape 与详细 status mapping 仍 open |
| standing | `source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending` |
| minimum disposition | child：`retain-current-source-boundary / reconcile-details-as-open / route-to-owner / no-rerun-now`；parent：shape/owner/acceptance 继续 `route-to-owner / no-rerun-now` |
| consumer | protocol declaration、executor/context、host/coordinator、record/evidence、mechanical check、acceptance surface；named consumer unknown |
| owner class / named owner | shape/contract、submission/return、host authority、retention/correction、mechanical check、acceptance 分别 route；具体 named owner 全部 unknown |
| independent review | `Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）独立只读 `ACCEPT`；只接受 source applicability/provenance/projection boundary |
| allowed effect | 更新 provenance、readiness、plan、roadmap、phase、estimate 与 loop projection；保留 canonical shape/owner/acceptance unknown |
| prohibited effect | 不改 protocol、不补字段、不建 registry/Run/runtime、不重跑、不选 provider、不打开 DeepSeek 或实现 |
| exit / revisit | 各 owner 对 shape、authority、submission/return、retention/correction、mechanical check 与 acceptance 作出结构化决定；source、consumer、owner、fixture、rubric 或 protocol revision 变化时 reopen |

### 2026-08-26：frontmatter / 正文 current-standing 对账

| field | current result |
| --- | --- |
| item | `research-settlement-and-closure`、`provisional-adoption`、`planning-information-architecture`、`philosophy-gene-one` 的 current projection；不重写历史审次 |
| observation | 四份已结算 record 的 frontmatter 已为 `settled`，但正文开头仍有旧的 `research-candidate`、`inventory-pending`、`acceptance-pending` 或 `Disposition: open` 表述；旧 inventory 表和 wave snapshot 也存在 current/history 时间层级歧义 |
| minimum change | 只把正文开头改为与 frontmatter 和较晚 disposition 一致的 current standing，并把旧 inventory/wave 数字标为历史快照；补充 proposal 不等于 formal acceptance/adoption 的边界；保留 dated review 与 source lineage |
| standing | `current-standing-reconciled / settled-proposal-preserved / acceptance-unknown` |
| allowed effect | 改善检索与人工回读的一致性，更新本 ledger checkpoint 与历史 lineage |
| prohibited effect | 不改 source line、reading acceptance、owner、priority、phase、WorkCell/DeepSeek/base/runtime standing；不批量重写其它历史段落，不自动归档或采用 |
| exit / revisit | 新 source revision、human naming/acceptance、真实 bounded-trial consumer、authority conflict 或新的 current/history mismatch 出现时，按单一 record 开新 reconciliation round |

### 2026-08-26：WorkCell canonical design consistency audit

| field | current result |
| --- | --- |
| item | `design/work-cell-protocol.md` 当前主体；不重开已完成的 child applicability review，不创建新的 review record |
| source | 当前 canonical design 的命名表、legacy migration、Spec/Binding/RunRequest/Run/RunRecord lifecycle、parent relation、failure/cancellation/observation、provider boundary、§16 invariants 与 §17–§18 open/acceptance sections |
| observation | `CellInput`、`Session`、`Attempt`、`Trace`、`Verification` 等旧名只出现在 legacy/最近邻/迁移说明；当前 core 使用 canonical lifecycle；parent 只保留 `retry-of`/`continued-from`；`status` 只在局部 check/review shape 出现；Task/WorkItem/CellBatch 仍分别属于上游或 system layer |
| finding | 未发现会改变当前协议理解的命名、生命周期、parent relation、状态层级或 owner 边界冲突 |
| standing | `current-body-read / no-proposal / retain-current-boundary / acceptance-pending` |
| allowed effect | 关闭本轮重复 naming/lifecycle review 分支，保留当前 canonical design 与已有 readiness package；后续只在新 source、最近邻误判、真实 consumer 或 decision-changing counterexample 出现时 reopen |
| prohibited effect | 不改 canonical protocol、不补字段、不新增 registry/review record、不选择 provider、不打开 DeepSeek 或 runtime/implementation |
| evidence limit | workspace-scoped static design observation；不证明 protocol acceptance、adapter comparability、runtime behavior 或 provider 优劣 |

### 2026-08-26：long-horizon continuity design-readiness preparation

| field | current result |
| --- | --- |
| item | `long-horizon-agent-forgetting-design` 的 design-readiness preparation；不创建新 planning item、不执行 Run |
| source | [`records/long-horizon-agent-forgetting-design.md`](records/long-horizon-agent-forgetting-design.md) §3A–§3D；当前 item-ledger execution surface；`controlled-experiment-design` 的 problem-first/verification-evaluation-validation 边界；`whole-work-coordination-candidate` 的局部等待与全局推进边界 |
| observation | 先用 action probe 将 continuity 从“复述/记录”区分到后续有后果行动；再形成当前会话 `work-map continuity projection` 的最小 candidate boundary；最后列出 consumer、任务族、分配、重复/precision、guardrail、runner/identity、review/acceptance 等启动前关系，明确不预填数值 |
| topology | Main 直接执行、内部顺序为 `action probe → candidate boundary → trial-input contract`；此前使用一次只读独立 review 只做 wave selection，未改文件、未替 Main 作接受决定；共享同一 record 的语义与 acceptance 边界，不再拆并行 lane |
| standing | `action-probe-formed / candidate-boundary-formed / trial-input-contract-prepared / design-candidate / run-not-authorized / acceptance-pending` |
| owner / consumer | 语义 consumer 为 `long-horizon-agent-continuity`；真实 trial owner、runner、evidence owner、independent reviewer、acceptance owner 仍 unknown；不把 planning consumer 自动升级为 trial owner |
| minimum disposition | `retain-design-candidate / wait-for-owner-backed-inputs / no-run-now`；缺任一启动关系时保持 `design-ready hold / no-proposal-now`，不继续增加 reminder、memory registry、scheduler 或 runtime 字段 |
| allowed effect | 更新既有 design record、item-ledger、plan/roadmap 的 current projection 和 revisit 条件；后续 owner 形成完整输入后，另开 bounded trial preparation |
| prohibited effect | 不创建 synthetic Run、task fixture、candidate registry、WorkCell 字段、provider comparison、base/runtime guarantee、DeepSeek system design 或实现 |
| exit / revisit | named owner/consumer、任务族/holdout、variance/effect/precision 输入、guardrail threshold、可重建 runner/evidence identity 和 acceptance route 形成时重开；否则保持当前 design candidate 并可归档为 no-proposal |

### 2026-08-26：research-surface settlement reconciliation

| field | current result |
| --- | --- |
| item | 当前 research-like surface 的结算维护；不重新综述来源，不创建新的 research item、Run 或 runtime |
| source | [`theory/research/research-settlement-and-closure.md`](../theory/research/research-settlement-and-closure.md) §3–§8；7 份现行 active research candidate/record；本 ledger 当前 snapshot/execution surface；已存在的 long-horizon design-readiness record |
| observation | `controlled-experiment-design`、`harness-problem-complexity-and-tool-readiness`、`harness-engineering-control-and-reliability`、`iterative-improvement` 与 `main-agent-project-work-method` 已形成 `canonical-proposal` handoff；throughput 与 Agent initiative 已形成有限 `owner-gated-hold`；它们不再以未结算 research-open 形式占据 current surface |
| topology | Main direct/sequential；共享 settlement authority 和 current projection，不并行多写；只读 inventory 委派本可分出，但子进程因 app-server 权限失败，按 `no-proposal` 处理，没有形成 child evidence 或 parallel claim |
| standing | `settlement-reconciliation-observed / no-matched-effect / no-new-research-surface / acceptance-pending` |
| owner / consumer | 各项保留原 consumer class 与 owner `unknown`；proposal/hold 不把 planning consumer、Main 或 reviewer 自动升级为 acceptance owner；long-horizon experiment record 仍独立为 active design candidate |
| minimum disposition | 研究结果交给下游 proposal 或有限 hold；owner-gated hold 到下一相称 checkpoint 无回返时必须转 `archive-inconclusive / no-proposal`，不能只顺延 `review_at` |
| allowed effect | 更新各 canonical research record 的 frontmatter/current standing、settlement event、item-ledger/plan/roadmap projection 和 reopen 条件；保留 source、unknown、lineage 与 evidence ceiling |
| prohibited effect | 不把 proposal 写成 acceptance，不启动 Run，不创建全局 research registry/scheduler、skill、controller、WorkCell/DeepSeek/base/runtime 或实现 |
| exit / revisit | named consumer/owner/runner、primary-source access、真实 trial/反例、第二独立 consumer 或 adoption/regression evidence 出现时 reopen；新想法先留 inbox，必须有 settlement route 才进入 research inventory |

</details>
