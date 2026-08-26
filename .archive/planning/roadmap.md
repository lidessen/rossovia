# Roadmap

从理论重新生长下一版，而不是把现在的运行时迁完。基座和 harness 都可以大改；当前先完成理论、设计和可审查的边界，再决定是否进入实现。

## 要长成的形状

- **理论与设计。** 哲学基础（理论：`theory/gene-expression.md`，源：`theory/philosophy.md` 与解读）、harness 理论、研究记录，以及仍约束下一版的成形文件。当前已有 Work Cell 协议设计候选：`design/work-cell-protocol.md`。
- **方法。** `skills/` 放可独立使用的抽象方法；`.agents/` 放本项目自己的 skills。
- **基座。** 1+N：一个入口，N 个模块，例如任务、git/worktree，可以基于 DeepSeek Harness。
- **软件层。** 相对基座的 harness 方法层（当时说的后训练）：skills、prompt、任务表达骑在基座上，不靠改权重。
- **整合。** 入口把基座和软件层收成一次能用的整体。这一层还没有想好。

## Planning authority

目录发现入口：[`planning/README.md`](README.md)。

本文件只拥有长期方向与阶段顺序的方向性表达；跨 item 当前 standing 以
[`planning/item-ledger.md`](item-ledger.md) 为准，bounded record 只承载观察、review、source edge/provenance
和 applicability judgment；具体语义 source、证据权威与接受关系仍回到对应的 theory、design、research、
eval 或 skill source。
本文件下面的 dated sections 是 roadmap lineage，不是第二份当前状态表；不要用最后出现的 projection
覆盖 item ledger 中的 `unknown`、`pending` 或 `not-authorized`。

## 仍开放

- N 具体是哪些模块
- DeepSeek Harness 是载体还是内核
- 基座和软件层怎么合成，而不另造一套平行系统

## 当前主序列

当前主线不是直接实现 base，而是按以下顺序推进：

1. 回顾已有成果与工作历史，先形成可实践、可回退、边实践边修正的工作流，并用真实 planning/design
   工作验证它；详细工作流见 [`../design/harness-workflow.md`](../design/harness-workflow.md)；
2. 按实际 consumer、owner、边界、证据和回退关系，收敛结构、文档和 skills；只迁移经过相称判断的对象；
3. 继续迁移有价值的文档和 skills，形成需求、设计、文档、开发、测试、验证、改进相关的
   项目内方法 skills。逐项留存、晋升和不迁移判断回读
   [`planning/item-ledger.md`](item-ledger.md) 的 PL-01/PL-05 投影及其链接的
   [`planning/index/skill-migration.md`](index/skill-migration.md)、archive inventory、method review 和
   phase exit records；不在 roadmap 复制 review 清单；
4. 在前置工作流和结构达到可审查出口后，反复打磨并完成 Work Cell 协议设计；
5. 在 Work Cell 边界之上设计基于 DeepSeek Harness 的工作系统；
6. 两层设计都通过明确评审后，再建立实现计划并实现系统；
7. 在已实现的工作系统上承载用户的各类 harness 构想，并按 experiment/eval 边界逐个验证。

这条序列是当前用户明确给出的 planning direction。阶段顺序已明确，但 owner、绝对
priority、每阶段的具体时间和最终 acceptance owner 仍未指定。

这里的主序列和下方设计候选表示方向与可重开资格，不表示后续阶段已经打开；当前波次的
开闭、等待 owner 或 no-proposal 处置只回读 [`item-ledger.md`](item-ledger.md) 的当前执行面。

当前 WorkCell 明确暂停于 `paused-by-priority / design-review-deferred`；上面的 WorkCell 顺序是
后续方向，不是当前 active work。只有工作流真实试行和整体 checkpoint 产生足够的 decision delta，才
重新打开 WorkCell design review；实现仍需另行授权。

当前执行纪律是“有界工作波次 → 整体性 checkpoint → 再开下一波次”。Agent harness 吞吐目前只
形成 [`theory/research/agent-harness-throughput-research.md`](../theory/research/agent-harness-throughput-research.md)
这一份 system-layer research/design candidate，用于验证依赖感知并行、条件加载、fan-in 和遥测；
它不改变上述阶段顺序，不扩展 WorkCell core，也不授权 runtime 或实现。外部研究输入（包括
JitRL、FOREAGENT）只作为该类研究的来源候选，具体适用性回读各自 research record。

当前 planning 的 item standing、consumer/owner、依赖、证据、处置、阶段出口与 revisit 统一回读
[`planning/item-ledger.md`](item-ledger.md)；P01–P16、skills、evidence 和 WorkCell 的详细
current projection 不在 roadmap 重复维护。phase、迁移、WorkCell applicability 和 evidence lineage
分别回到对应的 current record；dated projection 只保留历史观察和 provenance。

当前仍未成立的关系是：phase-complete、WorkCell protocol acceptance、DeepSeek system design
acceptance、implementation authorization 和用户 harness 构想的 experiment/eval acceptance。没有
这些关系时，不从 roadmap 的长期方向或历史 projection 推出执行授权。

## 当前 Work Cell 设计候选

`design/work-cell-protocol.md` 是当前 living tree 中约束下一版形状的设计候选，standing
仍是“候选”，不是已采纳规范，也不是基座实现授权。

它提出以以下边界替代 0.5 的单一 `CellInput`：

```text
WorkCellSpec → WorkCellBinding → WorkCellRunRequest
             → WorkCellRun → WorkCellRunRecord
             → Evidence / MechanicalCheck / SemanticReview / AcceptanceDecision
```

当前方向是：

- `WorkCellSpec` 只描述 provider-neutral 的 bounded work；
- `WorkCellBinding` 由 host 解析实际 workspace、工具和效果权限；
- 运行事实、机械检查、语义审查和验收不共用一个 `status`；
- Vercel AI SDK/Pi 与 DeepSeek Harness 都是可替换 executor/adapter；
  当前生命周期、parent relation、record boundary、field authority 和 `CellBatch` 的未决项均回读
  [`planning/records/workcell-design-acceptance-readiness.md`](records/workcell-design-acceptance-readiness.md) 及其
  linked child reviews；roadmap 不复制这些 current projections，也不把它们写成 acceptance。

它当前处于主序列第 2 阶段的设计候选位置，并新增一个由用户明确命名的 harness-test experimental
consumer。该 consumer 可以在最小 core contract freeze 后承载 deterministic executor、core API、
record/evidence 和 adapter 验证，但不等于 canonical protocol acceptance。进入正式下一阶段前仍需完成设计评审：对 canonical
命名、Binding 物化方式和运行/记录公共边界做反例审查，并继续处理取消与恢复语义、adapter
可比条件、Work Cell 与调度层的正式关系及真实 owner/acceptance owner。评审期间不产生
完整 base、provider selector 或 acceptance；experimental slice 的开放关系以
[`records/workcell-harness-test-implementation-plan.md`](records/workcell-harness-test-implementation-plan.md) 为准。

## 来自 inbox 的候选方向

以下内容来自 `IN-2026-08-24-001`，原始来源与处理 lineage 保存在
`planning/inbox-history.md` 的 `RCPT-2026-08-24-001`。本节只保留长期方向和发现入口；各候选的
当前 standing、consumer/owner、证据、处置和回返条件以 linked record 与
[`item-ledger.md`](item-ledger.md) 为准。

- **迭代学习类比：** 见 [`records/iterative-loop-learning-analogy-review.md`](records/iterative-loop-learning-analogy-review.md)；保留为 bounded research candidate，不把类比升级为 theory、skill、runtime 或模型学习结论。
- **设计/开发方法套组：** 已吸收进主序列第 1 阶段；逐项迁移、边界和行为判断见 [`skill-migration.md`](index/skill-migration.md) 与 method records。
- **受控 Agent 行为评估设施：** 见 [`records/controlled-agent-evaluation-tool-review.md`](records/controlled-agent-evaluation-tool-review.md)；先 protocol/fixture，再决定是否需要实验性设施。
- **概念碎片与冲突角色：** 分别见 [`records/concept-fragment-output-disposition.md`](records/concept-fragment-output-disposition.md) 和 [`records/conflict-role-integration-review.md`](records/conflict-role-integration-review.md)；先定义可观察对象，再决定是否形成 experiment/eval。
- **实时、多来源工作系统：** 作为 DeepSeek Harness 后续系统设计方向，保留单主 Agent/team、会话、记忆、通知、todo 并发、双向输出、隔离和恢复等问题；当前先以 [`long-horizon-agent-forgetting-design.md`](records/long-horizon-agent-forgetting-design.md) 的 `task continuity relation` 作为长时遗忘的设计入口，区分 active-session work map 与跨重启 base/runtime guarantee；不在 roadmap 预先决定载体或实现。
- **外部研究输入：** JitRL 见 [`records/research-reading-candidate-jitrl.md`](records/research-reading-candidate-jitrl.md)，FOREAGENT 见 [`records/research-reading-candidate-foreagent.md`](records/research-reading-candidate-foreagent.md)；它们用于提出吞吐、经验、候选筛选和系统层研究问题，不直接成为项目方法、evidence 或实现依据。

## 新增 harness 研究候选

- **受控实验与有界试行：** 见 [`controlled-experiment-design.md`](../theory/research/controlled-experiment-design.md)、
  [`provisional-adoption.md`](../theory/research/provisional-adoption.md) 和
  [`research-settlement-and-closure.md`](../theory/research/research-settlement-and-closure.md)。它们把对照实验、
  试行采用和 research 结算作为方法候选接入；frontmatter 只提供检索投影，具体 standing、证据与 owner
  仍回到 canonical record。没有形成 bounded decision delta 的研究不继续占据 active surface。
- **主 Agent 项目级工作方法：** 见 [`main-agent-project-work-method.md`](../theory/research/main-agent-project-work-method.md)。
  这是用户明确标记为重要且优先级较好的 system/project-method candidate：研究 Main 如何恢复整体、选择和
  委派有界贡献、应用本项目哲学/theory/skills、回接最新研究、fan-in 和结算；不把用户表达直接写成正式
  project priority，不创建总控 Agent、scheduler、registry 或 runtime。下一步只在真实多步骤 wave 做 bounded
  dogfood，证据不足则 archive/no-proposal。
- **Goal 级工作方法持续演化：** 见 [`iterative-improvement.md`](../theory/research/iterative-improvement.md) 的
  2026-08-26 reopen。长期或无限执行的 goal 需要在语义 checkpoint/safe point 回顾实际使用的方法，保留有效
  方法、修订有证据的问题，并保留 baseline、rollback、lineage 与独立 review；设计完成后的初始 review 也要
  先做字段/机制修剪。当前是 `design-candidate / adapt-and-retest`，下一步只做一次真实 goal wave 的 bounded
  方法快照与 change hypothesis，不把持续改进预先实现成 registry、scheduler、自动改写器或 runtime。
- **应用交接不能被 research archive 吞掉：** 研究结算只关闭研究轮次；面向 harness 的候选还要有 semantic
  handoff、carrier handoff、真实 activation 和 adoption/reopen evidence。若有价值但尚未完成交接，应用义务
  留在目标 item/plan 的 current projection；只有无价值、无 proposal 或已有 successor 且没有未决应用义务时
  才归档，不创建全局 adoption registry 或自动 loader。
- **问题复杂度与工具准备：** 见 [`harness-problem-complexity-and-tool-readiness.md`](../theory/research/harness-problem-complexity-and-tool-readiness.md)。
  研究具体问题如何决定分析、估计、Plan、skills/scripts 与临时工具准备深度；不预设全局复杂度 enum、
  tool registry 或自动调度；本轮已在真实 planning settlement wave 中完成一次 bounded application，结果仍只
  支持 canonical proposal，不支持性能、portable skill 或 runtime 结论。下一步仍须等待第二个真实 consumer、
  tool-boundary counterexample 或可比较成本/收益。
- **工程控制与 harness 可靠性：** 见 [`harness-engineering-control-and-reliability.md`](../theory/research/harness-engineering-control-and-reliability.md)。
  研究扰动、观测、反馈、纠偏和稳定性收敛与 harness system design 的关系；已完成 1954 英文原版的书目/目录
  fingerprint 和 IEEE/NASA 相邻概念边界；当前已结算为 canonical proposal，原书关键章节访问和真实
  reliability consumer 仍是 reopen 条件；不把类比直接升级为理论、controller 或 runtime guarantee。
- **Agent 主观能动性：** 见 [`harness-agent-initiative-research.md`](../theory/research/harness-agent-initiative-research.md)。roadmap 只保留“主动发现—有界行动—反馈纠偏—重大事项回 owner”的研究方向；当前研究已结算为有限 owner-gated hold，无 named system consumer 或 matched Run 时不继续扩张；对象定义、来源、对照条件、standing 和不启动 Run 的边界由 research record 拥有。

2026-08-26 的 research-surface settlement reconciliation 已将上述 research-like surface 分流为
`canonical-proposal` 或有限 `owner-gated-hold`；它们不再作为未结算的 `research-open` 占据 roadmap 主线。
具体 current standing、owner unknown、reopen 条件和长期记录以 [`planning/item-ledger.md`](item-ledger.md)
及各 canonical research record 为准；新的想法先进入 [`inbox.md`](inbox.md)，没有 settlement route 不进入
长期 research inventory。

本节不创建新的 owner、priority、acceptance 或执行队列；需要推进时回到当前 item ledger 选择 bounded wave。

### 历史回返索引（默认折叠）

以下 dated projection 保留 roadmap 的观察、修订、review 与 lineage；它们不拥有当前 standing，
也不覆盖 `item-ledger.md`、canonical source 或 child record。当前先读长期方向、主序列和
`Replan when`，再按需要展开历史回返。

<details>
<summary>展开 2026-08-25 roadmap projections（上半段）</summary>

### 2026-08-25：设计/开发候选的当前等待状态

`code-review` 与 `structural-refactoring` 已按 [`records/development-method-candidate-disposition.md`](records/development-method-candidate-disposition.md)
完成当前 branch 处置：保留 archive source，分别保持 `activation-deferred` 与
`implementation-gated`，不创建 `.agents/skills/` carrier，不移动到 portable `skills/`。原因是当前
没有 accepted-intent code diff 或真实 behavior-preserving refactor；下一步只有在真实代码消费者、
accepted contract、独立 review 和外部 acceptance 可回读时才重开。该处置不改变 WorkCell 设计候选、
DeepSeek Harness 前置或实现冻结。

### 2026-08-25：WorkCell design source applicability

[`records/evidence-applicability-review-workcell-design.md`](records/evidence-applicability-review-workcell-design.md) 对
当前 WorkCell protocol source 与已有 review family 做了 post-freeze reconciliation：A/B/C/D 的旧
source edge drift，当前适用性保持 `uncertain`；RunRecord identity 与 contract-field review 的 edge
match，但仍不等于 protocol acceptance。当前只保留 source/standing/回返关系，不恢复旧 snapshot、不
重跑、不创建新的 runtime mechanism；该 record 已由 `Hubble` 独立复核 `final accept`，仅接受 source
bookkeeping；WorkCell、DeepSeek Harness 和实现冻结不变。

### 2026-08-25：CompletionAction contract candidate

从当前 field-boundary unknown 中拆出 [`records/workcell-completion-action-contract-review.md`](records/workcell-completion-action-contract-review.md)，
只处理 `CompletionActionCall` 与 `CompletionActionObservation`：live submit 与 execution return 是
同一 logical call 的 transport views，return-only 不产生 host `observed`，identity/input unavailable
显式保留，schema/`maxCalls` 由 MechanicalCheck 表达。`Hubble` 独立 review `final accept`，但只接受
候选 review record；canonical protocol、Effect/Usage、replay/lineage、WorkCell acceptance 和实现
冻结不变。

### 2026-08-25：EffectSummary / EffectObservation contract candidate

从 WorkCell field-boundary unknown 中再拆出 [`records/workcell-effect-summary-contract-review.md`](records/workcell-effect-summary-contract-review.md)。
本轮只处理 effect 事实 envelope：`EffectSummary` 保持为 run-bound projection，`EffectObservation` 显式
携带 source、effect identity、phase、outcome、confirmation 与 unavailable reason；`state: observed`
不等于 effect 已确认，只有 host observation 可以支持 confirmed。`Hubble` 独立 review `accept`，但只
接受候选记录；executor/adapter report、空 observation、取消未知、retry child 与 late evidence 不被升级
为 no-effect、host fact 或安全保证。该候选不改 canonical protocol、不创建 effect registry/runtime
controller、不关闭 Usage/A-B/retention/acceptance，也不改变 WorkCell、DeepSeek Harness 或实现冻结。

### 2026-08-25：UsageObservation contract candidate

从 WorkCell limits/usage field-boundary unknown 中再拆出 [`records/workcell-usage-observation-contract-review.md`](records/workcell-usage-observation-contract-review.md)。
本轮只处理实际使用事实 envelope：`UsageMetricProvenance` 显式约束 run/host 与 provider-report/
executor-adapter 的兼容关系，observed zero、delayed、not-collected、provider-unsupported、
scope-incompatible、source-unavailable 和 partial 保留可判别边界；`ResourceLimits` 与
`resource-limit` MechanicalCheck 不合并。`Hubble` 两轮独立 review 后 `accept`，但只接受候选记录；
该候选不改 canonical protocol、不创建 meter/billing/enforcement controller、retention authority 或
实现，不改变 WorkCell、DeepSeek Harness 与实现冻结。

### 2026-08-25：observation / record integration review

在 CompletionAction、EffectSummary、UsageObservation 三个窄候选完成独立 review 后，新增
[`records/workcell-observation-record-integration-review.md`](records/workcell-observation-record-integration-review.md) 做
跨字段 practice-cycle 回返。结果是：同一 `runId` 可以组合 execution failure、partial usage、effect
changed 和 check unknown；但 `runId` 不是 call/effect/metric correlation，跨 run 的 `retry-of` /
`continued-from` 仍只是 lineage。Hubble 独立 review `accept` 仅覆盖 integration record；下一步 route
给真实 protocol/record/acceptance owner，不继续叠加字段、总 status、dedup registry 或 runtime 机制。

</details>

## Replan when

- 理论不再是生长源
- 基座被规定必须继承当前运行时
- 1+N 或「基座 + 软件层」不再是目标形状
- Work Cell 设计候选完成评审并取得明确的实现授权
- 当前主序列发生改变，或文档/skills 迁移阶段无法形成足够支持 Work Cell 设计的可审查方法

### 历史回返索引（replan 之后，默认折叠）

以下 dated projection 同样只保留 lineage 和可追溯证据，不是 `Replan when` 的新增条件，也不产生
阶段转换或实现授权。

<details>
<summary>展开 2026-08-25 roadmap projections（下半段）</summary>

### 2026-08-25：living skills round-2 evidence applicability

对七个 living skill 的 round-2 family 新增
[`records/evidence-applicability-review-living-skills-round-2.md`](records/evidence-applicability-review-living-skills-round-2.md)。
核对发现：manifest 都是预注册清单且 execution/output 声明为 `unknown / not run`，但同名 run/review 产物存在；manifest 中记录的 candidate hash
与当前 `.agents/skills/` 源码全部不同；这些 round 也没有接入 trial ledger。结论只支持
`historical-artifacts-observed / current-applicability-uncertain`，不支持 current matched、portable
promotion、acceptance 或迁移到 `skills/`。保留历史文件，不倒写 manifest/run/review，不直接重跑；
只有 named eval/runner owner、完整 identity/activation、当前 candidate hash、明确 lineage 和新 card
恢复后，才开新的 round。这样“skills 是否已被判断过”被收敛为：有历史观察，但当前载体未完成可归属判断，
因此继续位于 `.agents/skills/` incubation。

### 2026-08-25：planning-inbox round-2 evidence applicability

在七个 living skill round-2 family 核对之后，进一步检查
[`records/evidence-applicability-review-planning-inbox-round-2.md`](records/evidence-applicability-review-planning-inbox-round-2.md)。
round-2 的五项 input/output、run identity、blind review 与 synthesis 已在文件/事件层面可回读，
但 manifest 仍是 `frozen / not run` 的预运行状态，candidate snapshot、`planning/inbox.md`、
`planning/inbox-history.md` 和 `AGENTS.md` 的 digest edge 与当前不同，served model、完整 prompt、
harness、权限、activation 和 exit 仍 unknown。该差异只是 provenance drift，不证明语义变化；它只阻止
当前适用性直接继承。保留 `behavior-observed / boundary-supported / adapt-and-retest`，
`planning-inbox` 继续 `.agents/skills/` incubation；只关闭当前 applicability/re-run 提案，不创建新 Run
或 portable move。

### 2026-08-25：attention-management applicability return

对 archive `attention-management` 的 bounded review 发现：当前只有一次 scope correction，没有第二个
独立 drift 实例、重复失败或 attention-specific matched comparison；其局部 governing-relation 判断已由
`plan`/`item-ledger`、`practice-cycle`、`agent-delegation` 和 `planning-inbox` 分别承载。历史 H2 的语义
pass 已被 post-run audit 判为 false positive，不能作为当前行为接受。因此该候选从 `candidate-later`
收敛为 `no-proposal-now / archive-only`，不创建 living carrier、Run、portable move 或实现授权。只有
第二个独立 drift 实例，或 `switch` 与 `retain/return` 的区分在现有 owner 中缺失且改变下一行动时才 reopen。

### 2026-08-25：P15-U1 practice use-case

[`records/philosophy-p15-practice-use-case.md`](records/philosophy-p15-practice-use-case.md) 已将 round-3 的真实 planning/design
consumer 具体化为 P15-U1：Case A 作为不制造循环的负触发，Case B 作为 action/disposition 改变的正触发，
B1–B4 作为没有真实 host practice 的最近非实例。`Goodall` 独立 review 后，U1 为
`use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；只支持
`behavior-observed / attribution-uncertain`，不产生 P15 reading acceptance、matched/regression、P16
evidence 或 WorkCell/DeepSeek/实现授权。下一步是 named reading/use-case acceptance owner 与相称边界实践。

### 2026-08-25：P15-U1 named-owner return check

只读检查当前 authority/planning surface 后，未发现 named reading/use-case acceptance owner；`Goodall` 与
`Plato` 的角色仍是独立 review。U1 本身 standing 不变，当前 owner-return branch 关闭为
`route-to-owner / no-proposal-now`：不指定 owner、不再累积 Main-only self-application、不新建 Run 或
fixture。未来出现 named owner、owner-backed disposition 和相称 evidence 时 reopen；这不改变 P15 candidate、
P16、phase-complete、WorkCell、DeepSeek 或实现冻结。


### 2026-08-25：incubating skills external consumer applicability

对当前 11 个 `.agents/skills/` carrier 与 sibling workspace `agent-worker` 做了只读 consumer/authority
核对：`agent-worker/skills/` 是独立 source of truth，`.claude/skills` 与 `.agents/skills` 是 projection；
当前未发现本项目 carrier 的同名 source 或直接消费引用，但观察到语义相邻的 `attention-driven` carrier，
不能把它计为直接 consumer。因此本次检查范围内 portable move 保持
`no-proposal-now / retain-incubation`，standing 为 `direct-external-consumer-not-found /
adjacent-carrier-observed`；该 observation 不证明未来没有 external consumer 或语义适用性，也不产生
portable acceptance、WorkCell/DeepSeek 或实现授权。后续只有 named external consumer、source/target 和
相称 behavior/regression evidence 出现时才逐项重开。

### 2026-08-25：WorkCell RunRecord identity readiness clarification

WorkCell readiness 已将 RunRecord→Binding identity 的下一 owner-return 明确为：显式
`RunRecord.bindingRef`，或等强度、可独立索引的结构化 record projection；后者必须能使 RunRecord 指向
admission Binding identity，并说明 request/evidence retention、digest、snapshot correction 与
structured `unknown`。该 projection 不修改 canonical protocol；只有 owner acceptance 后才决定是否回写
shape，不复制 Binding、不新增 registry，也不改变 WorkCell/DeepSeek/实现冻结。

### 2026-08-25：WorkCell spec identity boundary

新增 [`records/workcell-spec-identity-boundary-review.md`](records/workcell-spec-identity-boundary-review.md)，把
`WorkCellRunRequest.spec` 的 inline/reference 传输选择与 RunRecord 的 Spec identity 投影从 Binding identity
和 retry/continue lineage 中分开。当前只有 design/auditability hypothesis：`requestId`、`runId`、
`bindingRef` 不自动等于 Spec identity；没有真实 consumer 或 retention owner，不能先建 immutable registry。
保留 inline/reference 为候选，未来由 protocol/record owner 决定结构化 projection、digest、artifact/request/
RunRecord retention 和不可取的 `unknown`；引用冲突或格式非法则需结构化 `invalid-reference`，是否独立索引
由真实 consumer 决定。`McClintock` 已独立复核该 bounded unit 并确认它仍为 acceptance-pending。本轮不改
protocol、不创建 registry/runtime、不进入 adapter 或实现计划。

### 2026-08-25：`work-estimation` current-use review

[`records/work-estimation-candidate-review.md`](records/work-estimation-candidate-review.md) 把 WorkCell Spec identity 回返
标为 Main 的 project-local planning self-application，而非 named consumer 或 carrier-specific evidence。
`work-estimation` 只提供 branch、dependency、discovery、acceptance observation 和决策粒度；Main/planning
authority 选择下一 standing，`skill-formation` 决定 carrier disposition。`Meitner` 已独立复读该 review 为 `accept`；carrier 总体继续
`retain-incubation / behavior-observed / attribution-uncertain / adapt-and-retest`，当前 case 为
`no-proposal-now`（仅关闭当前 Main-only case，不影响 carrier 总体 incubation）；没有 named consumer 且不改变下一选择时停止重复
Main-only probe。本轮不迁移、不 portable promote、不改 WorkCell/DeepSeek 顺序或实现冻结。

### 2026-08-25：Round 1 meta-matched historical evidence applicability

[`records/evidence-applicability-review-round-1-meta-matched.md`](records/evidence-applicability-review-round-1-meta-matched.md) 完成了旧
`round-1-meta-matched` F1 的 source/lineage closure。当前 `theory/philosophy.md` 与旧 hash 一致，但
`theory/gene-expression.md` 已 drift，旧 `theory/harness.md` 已迁移路径；fixture/protocol freeze、candidate
hash、activation 和 runtime identity 未可重建，`trial-ledger` 也没有对应 post-freeze entry。该 round 因此只
保留 `historical-only / hold / no-proposal-now`，不支持当前 skill matched、portable promotion 或 acceptance。
`skill-formation` 仍留在 `.agents/skills/` incubation；只有 named consumer/owner、current card/source/
candidate identity、完整运行关系和能改变迁移选择的 case 出现时 reopen。不创建新 Run，不改变 WorkCell、
DeepSeek Harness 或实现冻结。

### 2026-08-25：文档迁移状态 reconciliation

[`records/document-migration-status-reconciliation.md`](records/document-migration-status-reconciliation.md) 将“16 条哲学
source”与“13 个已形成 reading candidate 文件”分开。当前 P01–P11、P14、P15 有 reading candidate；
P12/P13 仍 `no-proposal-now`，P16 仍 `hold-cross-boundary-fixture-only`。本轮修正的是 plan 与
theory-structure 的派生摘要，并确认 harness theory 的 canonical path 已是
`theory/harness/theory.md`；同时同步 P04/P05 artifact 的 review standing。不创建缺乏 consumer/证据的 reading，不改变 phase、WorkCell、DeepSeek 或
实现 standing。该 item 的下一 return 是 source/standing/reopen 条件变化，而非填充 Pxx 目录。

### 2026-08-25：P01/P03 artifact standing reconciliation

P01/P03 reading 文件的顶层 standing 已与 `records/philosophy-reading-review.md`、`records/philosophy-parent-review.md`、
coverage 和 item ledger 对齐为 `source-current / reading-candidate / independent-review-complete /
acceptance-pending / research-open`。这只是 artifact bookkeeping；不关闭 P01/P03 reading acceptance、
父关系 acceptance 或 phase 1，也不打开 WorkCell、DeepSeek Harness 或实现。

### 2026-08-25：WorkCell executor comparability boundary

当前 WorkCell provider-neutral baseline 暴露出一个有限的 source wording ambiguity：`WorkCellBinding`
包含 `executor`，因此 §11.1/§18.2 的“同一个完整 Binding、只替换 executor”不能直接构成可执行的
对照条件。新增 [`records/workcell-executor-comparability-review.md`](records/workcell-executor-comparability-review.md)，
只保留最小 rewrite candidate：每个 executor 变体各自获得 immutable Binding，固定非 executor 的
workspace/tool/effect 约束；不新增 `ComparisonBinding`、registry、queue 或 runtime state。

该 item 仍是 `design-boundary-candidate / source-revision-applied / current-applicability-reconciled /
independent-review-complete / empirical-unknown / acceptance-pending`；没有 matched Run、
named eval/protocol owner 或 canonical equality contract，因此没有 Vercel/DeepSeek 结论，也不进入
adapter/runtime 实现。candidate 已回写为仅限 wording/diagram 的 source revision；revision-2 current-source
review 已由 `Dewey` 独立复核 `ACCEPT`，但 owner-backed wording acceptance、eval card 和 matched fixture
仍未成立。
`Chandrasekhar` 已只读独立复核并 `ACCEPT`，仅接受 boundary finding 和 projection；不取得 protocol、
eval、provider 或实现授权。

当前 revision 由 [`records/evidence-applicability-review-workcell-design-revision-2.md`](records/evidence-applicability-review-workcell-design-revision-2.md)
承载：旧 A/B/C/D、RunRecord identity 和 contract-field review 保留 pre-revision edge；新 source
revision 已完成 current-source bookkeeping review，但不被旧 review 自动接受。该条不改变 WorkCell
acceptance、DeepSeek 前置或实现冻结。

### 2026-08-25：archive skill inventory completeness check

对 `archive/skills/*/SKILL.md` 与 [`records/archive-skill-inventory.md`](records/archive-skill-inventory.md) 做了只读集合
对账：29 个实际 archive 载体与 29 个唯一 inventory 条目一致，没有发现漏项或多项。该结果只证明
迁移清单的机械完整性，不证明任何 archive skill 值得迁移、已经形成、可 portable 或已接受。

当前处置为 `retain-inventory / no-new-migration-proposal`；不创建 `.agents/skills/` 新 carrier，不创建
`skills/`，不移动/删除 archive。逐项 consumer、boundary、行为证据和 acceptance 仍按原 review 与
revisit 条件推进；`Halley` 已独立 `ACCEPT` 本次 completeness bookkeeping，不取得 skill、portable、move
或实现权。清单或 archive 变化、living carrier 迁移或真实 external consumer 出现时 reopen。

### 2026-08-25：P04/P08 boundary relation

补充 [`records/philosophy-p04-p08-boundary-review.md`](records/philosophy-p04-p08-boundary-review.md)，完成父 item 中
P04“证据状态”和 P08“问题/视域边界”的有限区分。F1 将同一 scope 内证据不足路由为 P04 unknown，
F2 只改变一个 scope 维度并要求重新问题化，F3 保留局部 supported observation 与 acceptance 分离。
`McClintock` 已独立 `ACCEPT`，但该记录仍是 `design-boundary-observed / acceptance-pending`，不改变
P04/P08 reading acceptance、phase-complete、WorkCell/DeepSeek 前置或实现冻结。

### 2026-08-25：living skill placement completeness

[`records/living-skill-placement-review.md`](records/living-skill-placement-review.md) 已核对当前 living skill placement：
实际 `.agents/skills/*/SKILL.md`、frontmatter `name` 与迁移表中的 11 个唯一条目完全一致；没有发现
漏登记、重复 canonical carrier 或 placement orphan。

因此 `.agents/skills/` 继续作为依赖本项目 authority、路径和局部 consumer 的 incubation entry；`skills/`
目录当前不存在，集合级处置为 `collection-level-portable-placement-no-proposal-now`。该集合级落点决定
不覆盖逐项 skill 的 semantic disposition、portable standing 或 revisit，也不把普通 living 文档与从属
reference 混为同一形式。`Kepler` 已独立 `ACCEPT` placement 文档边界，仅此而已。

本轮不创建、移动或复制 carrier，不改变 WorkCell → DeepSeek system design → implementation 的顺序
与冻结条件。下一 return 是逐项出现 named external consumer、portable boundary、matched/regression
evidence 或 acceptance 时再 reopen。

### 2026-08-25：WorkCell `CommandGrant.argumentShape` boundary return

[`records/workcell-command-grant-boundary-review.md`](records/workcell-command-grant-boundary-review.md) 对 §4.2、§5.1、
§17.2、§18.7 的 command authorization gap 做了窄设计回返。它区分了 declaration requirement、
`WorkCellBinding` 的 `ToolGrant`/`CommandGrant` host grant、`requestTool` transport request、actual
host call observation、RunRecord/effect projection 和 mechanical check；并用 C1–C4 保留需求不等于
授予、额外参数、shell 别名和 exact argv 不等于隔离证明的边界。

当前只保留 wording-level candidate：结构化 argv/invocation 约束，不以自由文本或隐含 shell 作为
权限；failure code 与 `observed: unavailable` / factual `unknown` 分开。`Kepler` 已独立 `ACCEPT`，
仅接受本 planning boundary review。host/security 仍决定 grant/argv/shell/effect policy，
protocol/record/evidence owner 仍决定 call/event/observation/failure/retention；canonical protocol、
host security policy、runtime enforcement、provider comparison 和实现均未开放。

### 2026-08-25：WorkCell `SemanticReview` / `AcceptanceDecision` boundary return

[`records/workcell-semantic-review-boundary-review.md`](records/workcell-semantic-review-boundary-review.md) 对 §8 的
`MechanicalCheck`、`SemanticReview`、`AcceptanceDecision` 与 next action 做了窄边界回返。它补足了
subject/run、rubric identity、input snapshot/ref、structured findings、blocked、correction/supersession、
acceptance basis 和下一动作 owner 的待决关系，并以 S1–S5 区分机械通过、review 完成、证据不足、
新 rubric/late evidence 和 retry。

`Chandrasekhar` 已独立 `ACCEPT`，仅接受 planning boundary record。当前仍是
`retain-boundary-candidate / route-to-semantic-review-and-acceptance-owners`；不定义业务 rubric、不
代行 Principal acceptance、不创建 review queue/gate，不改变 WorkCell → DeepSeek system design →
implementation 的顺序与冻结条件。

### 2026-08-25：WorkCell A/B/C/D current-source applicability

新增 [`records/workcell-current-source-open-relations-applicability-review.md`](records/workcell-current-source-open-relations-applicability-review.md)，
在 executor wording revision 后直接回读 A/B/C/D 依赖的当前 protocol sections。四项的 baseline 现在可从
当前 source 回指，child standing 为 `current-source-supported / applicability-reconciled /
retain-unknown`；这不是对 cutoff、活动 Binding 撤销、Event replay、retention 或 lineage recovery 的
接受。

`Halley` 已独立 `ACCEPT` 该 child record 的修订完整性。这里的 `active-after-prerequisite` 是
2026-08-25 历史 snapshot 的措辞；当前已被用户新优先级覆盖为
`paused-by-priority / design-review-deferred / implementation-not-authorized`，真实 owner、协议
acceptance、provider comparison、DeepSeek system design 和所有实现分支仍冻结。

### 2026-08-25：设计开发方法 carrier disposition reconciliation

[`records/method-skill-carrier-disposition-reconciliation.md`](records/method-skill-carrier-disposition-reconciliation.md)
将 `practice-cycle` 与 `work-estimation` 从模糊的 `candidate-next` projection 收敛为分层处置：两个
carrier 都保留 `retain-incubation / adapt-and-retest`；前者当前 matched branch 为
`no-proposal-now / route-to-owner`，后者当前 Main-only case 为
`no-proposal-now / wait-for-named-consumer-and-decision-changing-case`。

这不是删除、portable move 或 acceptance。`Meitner` 已独立 `ACCEPT` bookkeeping；round 4 仍等待
named eval/runner owner、可重建 identity、activation proof、统一 schema 和窄 Case B，WorkCell、
DeepSeek system design 与实现冻结不变。

### 2026-08-25：migration boundary reconciliation

当前 roadmap 对“迁移”的解释与 phase projection 对齐：16 条哲学 source 已落在现行路径，13 个 reading
candidate 已形成，P12/P13/P16 保持显式 absent/open disposition；archive skill inventory 的 29 项集合已
完成对账，但不等于 29 项都应迁入 living tree。当前 11 个 carrier 仍位于 `.agents/skills/` incubation，
`skills/` 为 0；这是一项基于项目 authority、consumer 和证据的 placement decision。

主序列因此继续推进，但当前推进形态是 source/standing/consumer/owner/依赖/证据/处置的逐项收敛与
projection reconciliation，不是 archive 的批量搬运。`candidate-next` / `candidate-later` 只在真实
consumer、相称 boundary evidence 和 acceptance relation 出现时 reopen；`phase-complete` 仍未成立，
WorkCell、DeepSeek Harness 和实现冻结不变。

### 2026-08-25：WorkCell contract projection source revision

当前 protocol 的 `EffectSummary`、`EffectObservation`、`UsageObservation` 只作为 named slots 与
run-bound projection 关系存在；完整 shape、authority、retention 和 correction 仍由 owner 决定。新增
的 wording-only revision 消除了 `effects.workspace` shorthand 的误读，并完成了受影响 contract projection
的 current-source reconciliation。该项不改变 A/B/C/D policy、WorkCell acceptance、provider comparison、
DeepSeek system design 或实现冻结。

### 2026-08-25：archive inventory status locus

`records/archive-skill-inventory.md` 的初筛表继续作为 archive 集合与历史 triage 记录；本轮已明确它不拥有较晚
carrier/branch disposition。current standing 以 `skill-migration.md`、candidate disposition record 和
dated projection 为准：`mechanism-design-review` 继续是 `.agents/skills/` project-local incubation，
`practice-cycle`/`work-estimation` 的 carrier-level 继续 incubation 而当前 branch 各自关闭为
`no-proposal-now`；`code-review` 保留 `no-proposal-now / activation-deferred / retain-archive-source`，
要求 accepted-intent code diff 与相应 acceptance/merge owner，`structural-refactoring` 保留
`no-proposal-now / implementation-gated / retain-archive-source`，等待真实行为保持的实现 consumer。

该 reconciliation 只修正迁移状态的读取路径，不把 inventory completeness 写成 migration completion；29 个
archive inventory、11 个 project-local carriers、`skills/` 为空、`phase-complete = not-established / continue`
以及 WorkCell → DeepSeek system design → implementation 的顺序均不变。

### 2026-08-25：WorkCell review-family source provenance

[`records/workcell-review-family-source-provenance-reconciliation.md`](records/workcell-review-family-source-provenance-reconciliation.md)
已将窄 review 中旧 `4293057d… / 26ec714f…` 的地位收窄为 contract projection revision 前的 review-time edge，
经历 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…` 两个 previous current edge；当前 source
已由后续 Run state 与 parent relation revisions 更新为 `fa602faf… / c78876b4…`。这避免把旧 Spec、Binding、CompletionAction、Effect/Usage、
integration 或 executor review 误读为当前协议接受；Effect/Usage 与 A/B/C/D 只在各自 current applicability
record 的范围内继续有效。

该回返只修正 provenance/applicability projection，不改 archive migration standing、WorkCell acceptance、
DeepSeek system design、phase completion 或任何实现冻结。

### 2026-08-25：WorkCell identity review current-source applicability

新增 [`workcell identity current-source applicability record`](records/evidence-applicability-review-workcell-identity-current-source.md)，
将 RunRecord/Binding identity 与 Spec identity 的旧 review edge 回接当前 protocol
既有 source snapshot 依次为 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…`，当前 source 为
`fa602faf… / c78876b4…`。该条仅确认 immutable Binding、request `bindingRef`、Spec inline/reference 和
new-run/parent baseline 的 source applicability；RunRecord identity projection、digest/canonicalization、
retention/correction、named owner、真实 record/spec consumer 和 cross-adapter comparison 仍 unknown；受影响
边界的窄回读与独立复核已完成。`Kepler` 的 `ACCEPT` 只覆盖上一 source edge，不合并 review unit、不改
canonical protocol、不添加字段/registry/Run，不改变 WorkCell acceptance、
DeepSeek system design 或 implementation freeze。

### 2026-08-25：A4 E0 owner-return projection

本次只完成 eval/runner owner surface 的 bounded check：当前 authority、planning 和 evaluation records
没有 named owner 能同时提供 runner/model/harness/workspace identity、activation/non-activation proof、
统一 schema 和运行回返。路线因此保持为 `route-to-owner / no-proposal-now`，而不是把 owner 缺失解释成
candidate 无价值或把 Main 写成执行 owner。

这条 roadmap projection 不增加 round 4 Run、card、fixture 或长期机制；`practice-cycle` 的 carrier
仍留在 `.agents/skills/` incubation，portable `skills/` 不变，WorkCell → DeepSeek system design →
implementation 顺序与冻结条件不变。只有 named owner 带回可重建执行契约后，才重新判断 E1 和下一项真实
实践。

### 2026-08-25：archive `SKILL.md` source-scope projection

`archive` 宽扫描的 76 个 `SKILL.md` 已按 path class 对账：canonical migration source 仍是
`archive/skills` 的 29 个；其余 47 个分别属于 evaluation fixtures/results、legacy 历史材料和
WorkCell package fixture。它们不是遗漏的 47 个 living/document migration item。

roadmap 当前保留 `retain-canonical-29 / classify-47-as-historical-or-fixture`：该 projection 只修正
inventory source scope 和后续审计入口，不触发批量迁移、carrier 创建、portable move、archive 删除或
WorkCell → DeepSeek system design → implementation 顺序变化。只有 artifact source relation 或真实
consumer 改变时，才重新判断非 canonical class 是否需要单独处理。

### 2026-08-25：CompletionAction current-source applicability return

新增 [`records/evidence-applicability-review-workcell-completion-action-current-source.md`](records/evidence-applicability-review-workcell-completion-action-current-source.md)，
将 CompletionAction 相关 declaration、submission、return、observation 与 mechanical-check 关系直接
回读到 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…` 两个 previous source edge；当前 source
为 `fa602faf… / c78876b4…`。`Halley` 的 `ACCEPT` 只覆盖上一 source edge，child 当前为
`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。

该 return 保留 previous-source boundary observation，并已解除当前 source applicability pending；它仍不
接受 CompletionAction canonical shape、host authority、identity、retention/correction、named owner、
provider 或 WorkCell protocol。下一步是 owner-backed 的 shape/authority/retention/check/acceptance 分工
决定；DeepSeek system design 与实现仍冻结。

### 2026-08-25：practice-cycle current project-instruction applicability drift

当前 `AGENTS.md` 已从 practice-cycle round 3 frozen card 记录的
`285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379` 变为
`1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`。因此 recorded card/candidate/
task/output/review edge 仍可回读，但 project-instruction edge 当前为 `drift-observed /
current-applicability-uncertain`；`practice-cycle` 继续 `retain-incubation / adapt-and-retest`，不把该
漂移解释成 matched、regression 或 phase change。

本次只做 current projection reconciliation：保留 frozen card/Run/review，不重跑、不 move、不创建机制，
不打开 WorkCell → DeepSeek system design → implementation 的后续阶段。下一 return 是当前 source 的
fresh/superseding card、named eval/runner owner、runtime identity、activation proof、统一 schema 和独立
review；原有 `Lagrange` accept 不覆盖这次 correction。

### 2026-08-25：WorkCell review-family provenance review return

> 历史快照：以下段落记录 CompletionAction current-source child 建立前的状态；当前 source-level applicability 结果见前面的 CompletionAction return 段落。

`records/workcell-review-family-source-provenance-reconciliation.md` 已经独立复核并接受为 provenance projection：
当前 protocol fingerprint 与旧 review-time edge 的层级、contract/executor 与 lifecycle/lineage 的不同
source 演化链，以及 executor comparability 的直接 applicability 记录均已明确。

这只关闭 source-label ambiguity，不关闭 WorkCell protocol acceptance。CompletionAction 仍为
`current-applicability-pending`，其下一项是 owner-backed current-source read；WorkCell → DeepSeek
system design → implementation 的顺序和冻结条件不变。

</details>
