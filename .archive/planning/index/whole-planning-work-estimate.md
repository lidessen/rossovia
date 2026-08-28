# 整个 planning 的最小工作图与发现分支

planning boundary：`planning-boundary-observed`
review：`independent-review-complete`
acceptance：`pending`；不是第二份
roadmap、资源报价、时间承诺、执行队列或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录把 [`plan.md`](../plan.md)、[`roadmap.md`](../roadmap.md)、[`item-ledger.md`](../item-ledger.md)、
[`coverage-audit.md`](coverage-audit.md)、archive 候选审查和当前 WorkCell 回返记录恢复成一张
最小工作图。它只回答“为了改变当前 planning 状态，下一步最少需要哪些关系”；各 item 的语义、
standing 和 owner 仍由各自 canonical source 拥有。

## 0. 当前执行面（默认只读这里做路由）

总工作图只保留三类当前动作；具体 standing 以 [`item-ledger.md`](../item-ledger.md) 为准，本文件
第 8 节之后的 dated sections 仅作历史/迭代证据。工作图中的 A/B/C/D/E/F/R 是潜在分支，不是
并行执行队列；每完成一个有界波次，必须先回到 [`item-ledger.md`](../item-ledger.md) 的整体性
checkpoint，再决定是否开启下一分支。

| 路由 | 现在做什么 | 不做什么 |
| --- | --- | --- |
| `continue` | 以整个 planning 为目标开启一个命名 bounded wave；从 B1/B2、F1/F2、throughput 或满足 reopen 条件的 A1/A2 中选择互不冲突的 contributions，能并行时并行，完成后只同步 current projection | 不在同一 wave 外开无界 sibling 分支，不重复已经完成的 WorkCell source/applicability review，不因 archive 数量、Pxx 覆盖率或 review 数量创建新 carrier/任务 |
| `wait-for-owner` | 只等待确实需要重大 owner/consumer/acceptance 选择的对应 item；若方向、权限、共享基线、不可逆效果或关键安全行动受影响，才做 bounded owner-decision preparation；普通局部缺口先自主推进并事后纠偏，其它 item 可继续 | 不把 Main-only 自用、历史 artifact、validator 通过或 planning review 写成 acceptance/matched；不由 Main 替 owner 决策，也不把局部等待升级成全局暂停 |
| `stop / no-proposal` | 对没有 decision delta 的重复 probe、不可归因 Run、portable move、WorkCell/DeepSeek/base/runtime 实现保持关闭 | 不为“看起来完整”而增加 queue、registry、gate、资源估算或实现授权 |

默认阅读顺序：本节 → 第 1–5 节的当前工作图 → `item-ledger.md` 的对应 item → 必要时展开第 8
节之后的历史记录。这样可以把“下一步可做”和“为什么还不能做”分开，不改变任何 canonical
standing 或 owner。

## 1. 当前状态、目标状态与决策容忍度

### 当前状态

- 用户主序列已经明确：有价值的文档/skills 迁移与方法形成 → WorkCell 设计 → DeepSeek Harness
  工作系统设计 → 两层设计接受后实现 → 在系统上承载各类 harness 构想。
- `item-ledger.md` 已覆盖 P01–P16、skills、WorkCell、DeepSeek、eval/experiment、历史 evidence
  和 roadmap candidates，但仍有大量 `unknown`、`candidate`、`acceptance-pending` 与 owner 缺口。
- [`item-ledger-field-audit.md`](item-ledger-field-audit.md) 已对顶层 contract projection 与 P01–P16
  package map 做结构回读，16/16 与 16/16 均通过；它只确认字段覆盖，不关闭上述 standing 或 owner 缺口。
- [`item-loop-coverage-audit.md`](item-loop-coverage-audit.md) 已为 16 个顶层 item 补出
  `B/O/D/R/A/P/G` 闭环 projection；已有相称 review 的 item 已分别回读，PL-12 的七对象
  definition review 与 PL-16 的结构 review 也已完成；这使未闭 acceptance、owner、consumer、identity
  和 adoption regression 可被路由，但不把 loop projection 当作循环完成。
- [`records/workcell-design-acceptance-readiness.md`](../records/workcell-design-acceptance-readiness.md) 已将 WorkCell
  的 15 个 acceptance dimensions、§17/§18 映射和 owner decision 缺口集中投影；它复用已有 review，
  不增加 gate 或 runtime mechanism，且不改变 C4 的 `active-after-prerequisite`。
- `.agents/skills/` 有 11 个 incubation skill；没有 portable `skills/`；不以目录数量或 validator
  通过推导迁移完成。
- WorkCell A/B/C/D 都已经完成 planning-level 的独立 review，且 `WorkCellRun.state` 与 RunRecord
  finalization 的内部矛盾已在设计候选中收窄为“公共 Run 不暴露 `recording`，终态后由协调器完成记录”；
  A/B/D 仍是 `retain-unknown / route-to-owner`，C 仍是 `retain-unknown` 但当前对 replay 机制为
  `no-proposal-now-for-replay / route-to-owner`；WorkCell 设计没有 acceptance，也没有实现授权。
- phase 1 的 `bounded-next-stage-clarification allowance` 已可支撑有限澄清，但
  `phase-complete` 尚未成立。

### 可接受的目标状态粒度

此前的 whole-planning 路由不需要 token、时间、金钱、P50/P80/P95 或 executor capacity。现在用户
明确提出 harness 吞吐问题，因此这些指标只在下一波次的固定对照 probe 中采集，不提前写成预算或
性能结论。对本 goal 来说，足够的 planning 粒度仍是：

1. 每个 planning item 有 source、identity、consumer/owner、依赖、允许范围、evidence standing、
   disposition、stage exit 和 revisit；
2. 每个能改变后续决定的未知都有一个可关闭或保留的 discovery branch；
3. 只有当阶段出口、协议/系统 owner、接受关系和证据足够时，才发生阶段转换或实现授权。

更细的估算只有在出现真实 consumer、需要比较方案或需要资源 projection 时才有决策价值。把文档
数量、skill 数量或 review 次数换成数字，不会改变当前选择，因此省略。

## 2. 最小工作图

```text
G0  恢复整个 planning 的 item/standing/owner/出口
 ├─ A 迁移与方法形成
 │   ├─ A1 archive/living source inventory 与逐项去向
 │   ├─ A2 设计/开发方法 candidate 的边界与 consumer review
 │   ├─ A3 当前 incubation skill 的逐项保留/改写/降级/portable no-proposal
 │   ├─ A4 至少一个真实 planning/design case 的行为观察、独立 review 与回归 return
 │   └─ A5 iterative-improvement / Principal correction 的严格归因、接受与 adoption/reopen
 ├─ B 哲学序列与父关系
 │   ├─ B1 P01–P16 reading work package 的 source/standing 覆盖
 │   ├─ B2 会改变分析的父 item relation 反例与 boundary fixture
 │   └─ B3 reading/relation acceptance owner 与 phase exit decision
 ├─ C WorkCell 设计
 │   ├─ C1 A/B/C/D open relation 的设计 review 与 unknown 投影（已完成一轮）
 │   ├─ C2 命名的 host/security、protocol/record、evidence、recovery consumer/owner；replay 仅在触发条件出现时重开
 │   ├─ C3 owner-backed contract、反例、接受决定与设计回归
 │   └─ C4 WorkCell design acceptance / explicit transition（未成立）
 ├─ D DeepSeek Harness 工作系统设计
 │   ├─ D1 在 WorkCell 接受后恢复 system objects、边界、输入/记忆/session/todo/并发/输出/恢复
 │   ├─ D2 明确 carrier/kernel、host/coordinator、隔离和接受 owner
 │   └─ D3 system design acceptance（未开放）
 ├─ E 实现与构想实验
 │   ├─ E1 WorkCell/system 两层设计接受与 implementation authorization
 │   ├─ E2 最小工作系统实现与验证
 │   └─ E3 用户 harness 构想逐项成为 experiment/eval（均未授权）
 ├─ F evidence / eval maintenance（可并行的低风险支线）
     ├─ F1 标记历史 evidence 的 source/run/consumer 缺口
     └─ F2 只有 card、Run、review、evidence standing 齐全时才重开或重跑
 └─ R roadmap research / experiment candidates（当前多为 candidate 或 hold）
     ├─ R1 将类比或构想先形成 source-backed research question
     ├─ R2 为概念碎片、冲突角色等实验定义可观察对象、变量和接受者
     ├─ R3 只有 controlled card、Run、review 与 evidence standing 齐全时才形成 eval/experiment
     └─ R4 研究 Agent 主观能动性的主动发现、有限自主、反馈、记忆与纠偏关系
```

这张图的节点不是任务数量，也不要求按字面逐个执行。节点只有在改变 standing、关闭
decision-changing unknown、验证硬约束或保留后续接受所需关系时才保留。

## 3. 可重新选择的 branch（当前波次已关闭）

| branch | 当前最小贡献 | 依赖 | 接受观察 | 当前处置 |
| --- | --- | --- | --- | --- |
| A1/A2 | archive migration inventory 与设计开发方法候选已完成当前 bounded review；只有新 consumer、重复 gap 或 decision-changing boundary 出现时，才选择单项 reopen；`project-cognition` 已完成 `no-proposal-now / archive-only` | archive source、living owner map | 新开候选必须能与最近邻区分，且有 named consumer | `done-for-now / waiting-for-named-consumer`；不因候选数量创建正文 |
| A3 | 保留 11 个 `.agents/skills/` 的逐项 standing；按新 consumer、回归或 portable probe 重开 | 项目 authority、skill/eval records | 每项区分 format、behavior、matched、acceptance、adoption/reopen | `done-for-now / retain-incubation / waiting-for-new-consumer`；当前不 move 到 `skills/` |
| A4 | 等 named eval/runner owner、可核验 identity、activation proof 与统一 schema；前置成立后再决定是否验证 `practice-cycle` / `work-estimation` 的触发与转交 | 同一 runner/config/source snapshot、独立 reviewer、可回读 activation evidence | 正例、反例、最近邻、一步任务和回归不混淆；前置不成立时 route/no-proposal，不运行不可归因 Run | `route-to-owner / no-proposal-now` for current matched branch；carrier 仍 `retain-incubation` |
| A5 | 等真实 round、独立 reviewer、acceptance owner 和 adoption/reopen return；当前不另开 Principal correction wave | 真实 round、独立 reviewer、acceptance owner | 观察结果能改变下一实践，且不把一次成功写成长期收敛；采用后可 reopen | `adapt-and-retest / owner-gated / waiting-for-owner-return` |
| B1/B2 | 只有 source、最近邻、consumer 或 acceptance decision delta 出现时，才重开有限 source-linked review；P01/P03 具体 A–D fixture 已完成 | 术语、source line、父关系对象 | reading 与最近邻、生成性例子、未知和下游 owner 分开 | `candidate / acceptance-pending / waiting-for-decision-delta`；当前不打开 sibling branch |
| C1 | 已完成 A/B/C/D 第一轮独立 review；Run state/record finalization 的来源内矛盾已完成最小简化；后续只做记录校正与 owner/consumer return | 当前 design candidate 与 [`records/workcell-run-state-boundary-review.md`](../records/workcell-run-state-boundary-review.md) | no authority/retention/replay/runtime overclaim；不把记录终结过程变成公共生命周期状态 | `state-boundary-simplified / done-for-now` for this round；A/B/D retain-unknown，C retain-unknown 且 replay 分支 no-proposal-now |
| F1/F2 | 保留历史 skill/eval 证据的 stale/unknown/可重开条件；mechanism round 1 已完成历史 ledger record，并发现三条 upstream source drift；不倒写旧 Run | 当前 source snapshot、现行 protocol | 历史记录、source drift/current applicability 和 evidence standing 不混淆 | `done-for-now / retain-unknown / reopen-on-new-evidence`；source recovery/full identity/owner 成立后才开新 round |
| R1/R2/R3/R4 | 只整理 research question、实验对象和 eval fixture 需求；主观能动性已形成来源有界的研究记录，并完成一手来源 evidence follow-up，进一步形成 `goal-linked action loop` 机制综合，将目的、局部选择、行动 affordance、后果归因、反馈纠偏和合格停止连起来；不直接启动实验 | 明确定义、变量、风险与接受者 | research、experiment、eval Run 和 evidence 不互相冒充；唤醒机会、主动判断、效果权限和后果归因保持可区分 | `candidate / mechanism-synthesis-revised / acceptance-pending` / `hold` / `active-after-prerequisite` |

这里的“可以推进”只表示可做有界 planning/research/design contribution；它不表示下一阶段已经
开放，也不替 owner 做接受决定。

## 4. 发现分支与关闭观察

### A：candidate 是否形成独立 skill

- **开启：** 出现真实 task/consumer，且现有 living owner 无法承载重复判断。
- **关闭为 retain/no-proposal：** 没有 consumer、现有 owner 已足够，或历史差距不能在当前 branch
  重建；保留来源和理由，不创建兼容壳。
- **当前实例：** `agent-tooling` 已在 [`records/agent-tooling-disposition.md`](../records/agent-tooling-disposition.md)
  收敛为 `no-proposal-now / archive-only`，因为没有主线 tooling consumer；`agent-environment`、
  `task-shaping`、`systems-engineering` 等保持 candidate-later，不触发本机环境扫描或正文迁移。

### B：reading / 父关系是否足以关闭 phase 1

- **开启：** source-linked reading、最近邻和会改变分析的成对反例可被独立复核。
- **关闭为 candidate/unknown：** 关系只能作为 boundary observation，或没有 acceptance owner；
  不把 hypothetical fixture 写成 reading acceptance。
- **阶段影响：** 完整 P01–P16 package、父关系、至少一个真实接受的迭代闭环和阶段 owner/acceptance
  owner 仍缺时，`phase-complete` 保持 `not-established`。

### C：WorkCell 是否能从澄清进入正式设计接受

- **开启：** 真实 host/security、protocol/record/evidence 或 replay/recovery consumer/owner
  明确提出必须改变的 contract。
- **关闭为 retain-unknown：** consumer/owner 仍缺；保持 observation-only、bounded-lineage、
  unknown 和 route-to-owner；对 replay 机制当前 `no-proposal-now`，仅在 named replay consumer、
  owner-backed decision、source revision 或反例出现时重开；不新增 event bus、registry、session resume、
  queue 或字段。
- **正式出口：** 四项结构化结果、owner-backed contract、独立 review、design acceptance decision
  和设计回归/unknown 都可回读后，才讨论 explicit transition；adoption/reopen 是后续采用证据，
  不偷变成正式设计阶段门；当前未达到。

### D/E：DeepSeek 系统与实现

- **开启：** WorkCell design acceptance/accepted exit 成立后，恢复系统对象、边界和依赖；系统层
  consumer/owner 可以在设计阶段作为待确认输入，不要求与 WorkCell 同时成熟。
- **关闭为等待：** WorkCell accepted exit 尚未成立，或系统 consumer/owner 仍不足以支持具体判断，
  就只保留 system design candidate/unknown，不设计 runtime，不实现 base，不把 Vercel AI SDK 或
  DeepSeek Harness 的 provider 能力写成系统语义。

### F：历史 evidence 是否重开

- **开启：** 当前 source/protocol、card、Run identity、consumer 和接受问题可恢复。
- **关闭为 hold：** 只有 generated artifact、控制变量缺失、owner/consumer 不明或重跑不能改变
  当前决定；不把历史“supported”写成 current acceptance。

## 5. 当前下一项最小实践

前一轮整体 checkpoint 已收口旧 review wave；用户明确整个 planning 都是目标后，最近的
`scope-reconciliation` wave 也已收口。当前全局执行面为 `active / item-gated / checkpoint-required`，
先依据当前执行面选择下一条命名 bounded wave。下一项按以下顺序恢复：

1. 对 WorkCell、吞吐、方法或 P15 的等待关系，先判断它是否真的是重大方向、权限、共享基线、不可逆
   效果或关键安全行动；只有是时才完成 bounded owner-decision preparation：设身处地恢复决策者面对
   的目标、约束和后果，查证 current source，提出可比较方案及取舍，明确需要 owner 选择的问题；普通
   局部缺口先自主推进并事后纠偏，重大 package 返回后只回写对应 current projection。准备方案不等于
   代替 owner 接受。
2. 若出现 decision-changing source、counterexample 或可回读 evidence，从 B1/B2、F1/F2、A1/A2、
   throughput candidate 或主观能动性 research candidate 中选择一个或多个输入稳定、写面互不冲突的 bounded contributions；它们
   可以在同一 wave 内并行，但必须分别回接 source、evidence 和 unknown。
   throughput candidate 若其 owner、identity、schema、clock 与 telemetry 前置成立，具体按 canonical
   research §18 先做 loading branch，再做 topology branch，最后做 failure/reconnect branch；任一质量、
   unknown 或边界回归都回到 direct 或 `no-proposal`，不以 lane 数或静态 footprint 代替有效进展。
   主观能动性 candidate 当前已完成概念边界、关系假设、一手来源 evidence follow-up 和
   `goal-linked action loop` 机制综合；若真实 consumer 和评估前置成立，先在相同唤醒预算与 effect
   boundary 下比较 reactive、bounded choice 和 action loop，再按结果决定是否加入 perspective projection、
   memory 或其它 treatment；不把动作数量、输出长度或 self-report 当作主动性证据。
3. 若没有上述变化，处置为 `wait / route-to-owner / no-proposal`，不重复旧 review、不创建
   synthetic Run、carrier、queue、registry 或新的工作估计。

这条选择规则不改变各 branch 的 standing；详细 source、owner、允许范围和 revisit 回到
[`item-ledger.md`](../item-ledger.md) 与对应 canonical record。

<details>
<summary>展开已完成的 next-practice lineage</summary>

### 历史代表性窄回返：WorkCell Run state / RunRecord finalization 边界

本轮观察到 canonical protocol 同时把 `recording` 写进公共 `WorkCellRun.state`，又说明它不是执行
阶段；`WorkCellRunRecord.execution.state` 已只保留终态。最小改变是从公共 Run state 移除 `recording`，
把终态后的 record finalization 保留为协调器内部过程，并将 cutoff、迟到 effect、record availability、
retention/correction 和 owner decision 继续保留为 unknown。该变化已由
[`planning/records/workcell-run-state-boundary-review.md`](../records/workcell-run-state-boundary-review.md) 记录并回接
当前 source projection；它是 `design-candidate / acceptance-pending`，不是 protocol acceptance 或
实现授权。

下一项最小实践因此不是再开一个生命周期 review：整体性 checkpoint 已完成；当前波次保持关闭。
若出现 named owner 或能改变 contract 的反例，路由给对应 owner；否则只从 A1/A2、B1/B2、F1/F2
或用户已提出的上述 throughput research/design candidate 中选择一个能改变真实 standing 的 bounded
contribution。

本记录的独立语义 review 已完成，未发现工作图越权或关键漏项；前一轮已将一个 F1 generated-only
artifact 的 applicability check 投影回 `item-ledger.md`、`plan.md`、`roadmap.md`、`coverage-audit.md`
和 `evidence-maintenance-review.md`。该对象现在闭合为 `historical-only / hold / archive-only /
no-proposal-now`，其 consumer、owner、Run 和 acceptance 未知仍被保留；后续不得重复重跑或修补它。
本轮另完成 item-ledger 的结构字段覆盖审计并经 `Halley` final accept；该审计不替代语义 review，下一项
仍按能改变真实 unknown、下游判断或最近邻边界的 A/B/F bounded contribution 选择。
本轮再完成 16 个 item 的闭环覆盖投影；既有 15 个 item 的结构审计已由 `Plato` final accept，PL-16
的独立 review 已由 `Aquinas` 窄复核并 accept；下一项仍必须由真实 owner/consumer
选择，不能为了填满循环字段而制造 round 或机制。
本轮又完成 WorkCell acceptance-readiness projection，并经 `Goodall` final accept；下一项若没有真实
owner，仍不继续堆叠 WorkCell 字段，而转向其它能改变判断的 A/B/F bounded contribution。
本轮按 F2 选择了已有 mechanism round 的 evidence closure；结果不是 current applicability closure，
而是历史 ledger record 加三条 upstream source 的 `stale/recovery` 投影。下一步仍从 A/B/F 中选择一
个有明确 source 和低外部风险的未闭合 item 做回返，而不是重新打开已经完成的 WorkCell C/D round；
A4 已先完成前置条件审查，暂不增加新 Run：

1. 对一个 archive `candidate-next` 做 no-proposal / retain / candidate 的最小判断，或；
2. 对一个尚未完成的哲学 reading/父关系 package 补 source-linked boundary fixture，或；
3. 对另一个尚未完成 applicability check 的历史 evidence 目录完成 current standing audit。

本轮随后选择了 R2 的一个低风险 bounded contribution：为“概念碎片式输出”形成 source-bound candidate
definition，明确外显 output object、最近邻、未来 card 入口和 no-run 边界。它把 PL-11 从“对象尚未定义”
推进到 `candidate-definition-observed / hold`，但没有取得 experiment/eval owner、Run、matched 或 acceptance；
PL-12 仍被该前置关系阻止。

本轮 F2 已实际完成上述第三类工作的一个具体 round，但 source drift 使其 current applicability
保持 `stale/uncertain`。未来只有 recovered source snapshot、full model/runner/harness/workspace
identity、activation/non-activation proof、protocol/record-retention/acceptance owner、named consumer
和新 frozen card 同时可回读，才可重新判断 matched 或 acceptance；不为补齐 ledger 直接重跑。

A4 的 owner-return 记录在 [`records/method-skill-probe-round-4-precondition-review.md`](../records/method-skill-probe-round-4-precondition-review.md)。
只有 named owner 能提供 E0–E2 的可回读前提，才进入窄 Case B 的新 frozen card；否则保持现有
`behavior-observed / attribution-uncertain` 上限并关闭 matched 分支，不把重跑次数当作收敛。

本轮对 `practice-cycle / round-3` 做的是一次 post-freeze source-edge applicability check，而不是
current causal closure：candidate、card、task、AGENTS、output 和 review 的 hash edge 可回读，但 runtime
identity、activation、schema、adoption/regression 和 acceptance 仍 unknown。该 bounded contribution 已有
独立 review，保留 `adapt-and-retest / retain-incubation`，不创建新 Run、不移动载体；下一 return 仍由 named
runner/identity/activation/schema owner 提供前提。

本轮 F 又选择 `planning-inbox / round-3` 做 source/applicability check：记录了 old/new snapshot、fixture、
input/output/event/review chain 的当前 hash edge，并确认失败 sandbox 尝试不属于正式样本；但 runtime identity、
activation、完整 prompt/harness/权限/隔离和 current inbox source relation 仍 unknown。它是
`behavior-observed / boundary-supported / retain-project-local / adapt-and-observe` 的历史
适用性投影，不是 matched closure；record 已由 `Hubble` 独立 review `final accept`，不创建新 Run、不移动载体。

本轮 A1/A2 已将 `project-cognition` 从 `hold` 收敛为 `no-proposal-now / archive-only`，关闭了当前
创建第二 cognition model 的提案，但没有关闭未来 reopen；B1/B2 又补齐并 review 了 P01/P03 的具体
A–D counterexample fixture，关闭了“只有抽象关系、没有 route-changing case”的记录缺口，但没有关闭
reading acceptance。选择规则仍是：优先能关闭一个真实 unknown、改变一个下游决定或验证一个最近邻边界的 item；如果三者
都不能改变当前决定，就只保留 branch，不创建新载体或新任务承诺。

本轮 F1 又完成了 `kb-representation` generated recall artifact 的 applicability check：历史实验链
可回读，但当前 PNG 的 exact lineage 未闭合；该对象已从“待检查 generated-only 目录”收敛为
`historical-only / hold / archive-only / no-proposal-now`。这关闭的是当前重跑/修补提案，不是对
历史 experiment 的效果接受，也不改变后续 source/consumer/lineage 出现时的 reopen 条件。

</details>

## 6. 省略和不授权

- 不估算实现工期、token、金钱、provider 成本或并发容量；
- 不把 item、skill、Cell、Agent 或 review 次数当作资源节点；
- 不猜测 owner、接受者、优先级或截止日期；
- 不为 `agent-environment` 扫描用户配置，不触碰 secrets/local state；
- 不为了验证 `code-review` / `structural-refactoring` 制造 fake code change；
- 不开始 WorkCell、DeepSeek Harness、base/runtime 或用户 harness 构想实现；
- 不把本记录变成第二份 roadmap、总 workflow skill 或新的 planning authority。

## 7. Evidence standing

- 来源：当前 living planning 与已有 planning review records；
- 结果：`planning-boundary-observed / independent-review-complete`，`Bernoulli`
  （`01a03774-25f0-7870-8359-be79db614ce0`）独立复核了覆盖、分支、阶段门和授权边界；
- 未取得：资源估算准确性、阶段 acceptance、owner-backed contract、portable skill acceptance、
  实现授权或任何新的 external effect；
- 回返：独立 review 后同步 projections；若发现漏项或节点偷带承诺，缩小图并保留 unknown，而不是
  扩大 scope。

<details>
<summary>展开历史/迭代工作记录（不覆盖当前工作图）</summary>

## 8. 2026-08-25 设计/开发代码方法候选投影

本轮把 A1/A2 中的两个 archive candidate 收敛为一个可回读的窄分支：

- `code-review` 只在真实 accepted-intent code diff 出现后激活；当前
  `no-proposal-now / activation-deferred / retain-archive-source`；
- `structural-refactoring` 只在真实行为保持结构迁移出现后激活；当前
  `no-proposal-now / implementation-gated / retain-archive-source`；
- 两者不合并，不创建 `.agents/skills/` carrier，不移动到 `skills/`，不制造 fake diff/refactor；
- `Hubble` 独立 review `final accept` 只覆盖 planning disposition，不覆盖 skill acceptance、行为
  改善、portable promotion、WorkCell/DeepSeek 或实现；
- 下一项最小实践仍需真实 consumer、accepted contract、相称正反例、independent review 和 external
  acceptance；在此之前该分支不增加执行任务或资源估计。

该投影减少了当前 planning 的悬空状态，但不关闭 phase 1；WorkCell 与 DeepSeek 的前置关系和实现
冻结保持不变。

## 9. 2026-08-25 WorkCell design source applicability branch

本轮选择一个能改变当前设计证据 standing 的 A/B/F bounded contribution：回读现行 protocol 与旧
WorkCell review 的 source edge。结果是：

- A/B lifecycle 与 C/D observation/lineage 的 frozen protocol edge 均 drift，旧 snapshot 不可回读，
  所以 current applicability 保持 `uncertain`，不能把旧独立 review 当作当前 protocol coverage；
- RunRecord binding identity 与 contract-field review 的 protocol edge match，但它们仍是
  design-candidate / acceptance-pending；
- 最小处置是不改 protocol、不重跑、不补 synthetic Run，只保存 match/drift/unknown 以及 recovered
  snapshot、named consumer/owner 或 current-source review card 的回返条件。

该分支不增加机制或实现工作图；它减少的是“旧 review 是否仍覆盖当前设计”的不确定性，不改变
WorkCell acceptance、DeepSeek 前置、phase-complete 或实现冻结。该 record 已由 `Hubble` 独立复核
`final accept`，但只接受 source applicability bookkeeping。

## 10. 2026-08-25 CompletionAction contract candidate branch

本轮从 WorkCell field-boundary unknown 中恢复一个可独立审查的最小工作单元：

- 明确 `submitCompletionAction()` 与 `WorkCellExecutionReturn.completionActionCalls` 是同一 logical
  submission 的两种 transport view，避免 `maxCalls` 与 observation double count；
- 用显式 union 表达 call identity/input 的 available、referenced、unavailable，避免缺省字段承担
  unknown 语义；
- 让 action/schema/`maxCalls` validity 由 `MechanicalCheck` 持有，避免 observation 变成 acceptance；
- 不处理 effect、usage、replay、lineage、runtime 或 protocol acceptance。

该 candidate 已经独立 review `final accept`，但仍需真实 protocol/host/record/acceptance owner 决定
是否回写 canonical design；因此不新增 implementation work node，也不改变 WorkCell/DeepSeek 前置。

## 11. 2026-08-25 EffectSummary / EffectObservation contract candidate branch

本轮从 WorkCell field-boundary unknown 中恢复一个独立、低外部风险的最小设计工作单元：

- 建立 [`records/workcell-effect-summary-contract-review.md`](../records/workcell-effect-summary-contract-review.md)，只
  处理 `EffectSummary`/`EffectObservation` 的 source、effect identity、phase、outcome、confirmation
  与 unavailable envelope；
- 由 `Hubble` 完成只读独立 review，最终 `accept` 仅覆盖候选 review record；
- 保留 executor failure 后的 workspace effect、取消未知、空 observation、retry child 与 late evidence
  的不确定性；不把 `state: observed` 写成 confirmed，不把 provider report 当 host authority；
- 不修改 canonical protocol，不创建 effect registry、runtime controller、retention/rollback 机制，不
  新增 WorkCell、DeepSeek Harness 或 implementation work item。

估计处置：这是一个已完成独立 review 的 design clarification candidate，尚未取得协议/host/security/
record/acceptance owner 的采用决定；后续只有 named consumer、effect-specific fixture 或 owner-backed
contract 出现才进入更重的 shape review，当前不追加执行估计。

## 12. 2026-08-25 UsageObservation contract candidate branch

本轮从 WorkCell limits/usage field-boundary unknown 中恢复一个独立的最小设计工作单元：

- 建立 [`records/workcell-usage-observation-contract-review.md`](../records/workcell-usage-observation-contract-review.md)，
  只处理 metric kind、provenance、measurement、zero/unavailable 和 evidence envelope；
- `Hubble` 两轮只读独立 review 后 `accept`，仅覆盖候选 review record；
- 将 `ResourceLimits`、actual usage 与 `resource-limit` `MechanicalCheck` 分开，保留 provider report、
  partial usage、取消/失败、retry child 与 late usage 的 unknown；
- 不修改 canonical protocol，不创建 meter、billing、enforcement controller、retention/rollback 机制，
  不新增 WorkCell、DeepSeek Harness 或 implementation work item。

估计处置：这是已完成独立 review 的 design clarification candidate，尚未取得 protocol/host/adapter/
record/acceptance owner 的采用决定；只有 named consumer、matched usage fixture 或 owner-backed contract
出现才进入更重的 shape review，当前不追加执行估计。

## 13. 2026-08-25 observation / record integration review branch

本轮将三个已完成独立 review 的窄字段候选做一次跨字段组合回返：

- 检查 CompletionAction、EffectSummary、UsageObservation 与 `ExecutionOutcome`、`MechanicalCheck`、
  `EvidenceRef` 在同一 RunRecord 中的 identity、source、unknown 和 failure/retry/late evidence 关系；
- 结果确认当前唯一安全的跨字段 join 是 `runId`，跨 run `retry-of` / `continued-from` 只保留 lineage；
- `Hubble` 独立 review `accept`，仅覆盖 integration record；
- 不新增总 status、dedup registry、meter、billing、runtime、retention 或 implementation work item。

估计处置：本项已完成当前证据范围内的 integration clarification，下一步 route 给真实
protocol/record/acceptance owner；没有 owner 或 counterexample fixture 时，不继续叠加字段或追加执行估计。

## 14. 2026-08-25 living skills round-2 applicability branch

本轮把 evidence-maintenance 的下一项最小实践落在七个 living skill 的共同证据缺口：

- manifest 都声明 `not run`，但对应 run/review 文件存在；
- manifest 中记录的 candidate hash 与当前 `.agents/skills/` 源码全部漂移；
- trial ledger 没有这七个 round 的可回读 lineage entry；`dual-audience-expression` 还存在额外未成对
  baseline，不能当作普通 pair。

最小改变是新增 [`records/evidence-applicability-review-living-skills-round-2.md`](../records/evidence-applicability-review-living-skills-round-2.md)，
仅记录历史产物、source/hash edge、review 上限和 current applicability unknown；不改旧 card/run/review，
不重跑，不新增评估工具，不移动 skill。估计处置为 `historical-only / hold / no-proposal-now`，
下一 return 是恢复 named eval/runner owner、完整 runtime identity、activation proof、当前 candidate
hash、明确 lineage 和新 card；前提不齐时不追加执行估计。

该选择已落到 [`records/evidence-applicability-review-planning-inbox-round-2.md`](../records/evidence-applicability-review-planning-inbox-round-2.md)：
记录的 artifact chain standing 为 `historical-chain-observed / source-applicability-uncertain /
runtime-applicability-uncertain / independent-review-complete / acceptance-pending`；`Plato` 独立 review
`final accept`。这只接受 work-estimation 选择的 bounded bookkeeping，不把估计或 applicability record
写成资源承诺、matched、skill acceptance 或 portable move。

## 15. 2026-08-25 next-practice work estimate：planning-inbox round-2 applicability

本次用 `work-estimation` 对当前可推进分支做了最小粒度比较。目标状态不是“完成全部 planning”，而是
把一个已有历史 evidence chain 从“文件存在但 current standing 不明”推进到可回读的
`historical / current-applicability / runtime-applicability / disposition` 分类。

| branch | 当前缺口 | 最小必要工作 | 当前决策容忍度 | 处置 |
|---|---|---|---|---|
| WorkCell owner-backed acceptance | named protocol/record/host-security/replay consumer 与 acceptance owner 未命名 | 只能做 owner-return/discovery，不足以执行新的 contract decision | 只需知道是否存在真实 owner；不需要再增加字段 | `route / wait-for-owner` |
| method strict card/regression | eval/runner owner、完整 identity、activation proof、统一 schema 缺失 | 不能合法开新 matched Run；只能保留前置审查 | 只需判断前置是否齐，不估算运行成本 | `route / no-rerun` |
| P15/P16 relation | P15 已有 `practice-cycle` round-3 planning/design consumer并形成 source-bound reading candidate；P16 仍缺 adoption/time-window consumer 与 acceptance | 只对 P15 做 source-bound reading review；不补造 P15/P16 fixture Run 或长期机制 | P15 只需确认 candidate 是否能区分实践、standing 和 acceptance；P16 仍只需保留 time-coverage boundary | P15 `reading-candidate / independent-review-complete / acceptance-pending`；P16 `hold-cross-boundary-fixture-only` |
| planning-inbox round-2 applicability | manifest、五组 Run、run-identity、blind review、synthesis 已存在，缺 post-freeze applicability record | 回读 source/hash edge、记录 runtime/activation unknown、独立 review、接回 ledger/projection | 文件/事件层级足够；不需要新运行或资源数字 | **selected** |

选中项的最小工作图为：

```text
manifest + fixture + candidate + current project source
  → run-identity/output/review edge reconciliation
  → current applicability and standing record
  → independent review
  → trial-ledger + whole-planning projection
```

发现分支只有两个：若 named owner、current source snapshot、完整 runtime identity/activation 和新 card
可恢复，则未来另开 current round；否则保留历史 `behavior-observed / boundary-supported /
attribution-uncertain` 并关闭当前迁移分支为 `no-proposal-now`。本项明确省略重跑、语义重评分、skill
move、WorkCell/DeepSeek 设计或实现，因为它们不会在当前决策容忍度内改变 applicability 判断，或缺少必要 owner。

本估计不产生时间、token、金钱、executor capacity 或执行保证；它只恢复当前下一实践所需的最小工作图。

## 16. 2026-08-25 P15 reading candidate branch

上一版将 P15/P16 合并视为 `hold-cross-boundary-fixture-only`；`practice-cycle` round-3 在真实
planning/design case 上提供了一个能改变下一 action/route/disposition 的 practice consumer，因此不应再把
P15 与 P16 共享为同一 current disposition。

- **P15 最小状态转移：** source line + round-3 consumer → source-bound reading candidate → P15-U1
  source/边界 use-case review → reading/use-case acceptance pending；已由 `Plato` 与 `Goodall` 分别复核
  reading/U1 record，但不产生 P15 truth、matched、regression、adoption 或 implementation standing。
- **P16 保留：** 仍等待真实 adoption/observation consumer 和 time-window evidence；B1–B4 继续是
  hypothetical boundary fixture。
- **省略：** 不开 P15 专属 Run、不修改 P04/P15/P16 source、不把 round-3 的 attribution-uncertain 变成
  P15 behavior acceptance、不自动创建 P16 reading。

该分支的下一 return 是 named reading/use-case acceptance owner、相称 evidence 和必要的后续边界实践；若
U1 不能改变主张 standing、下一行动或 owner route，回修 P15 或关闭为 `no-proposal`。这只是 whole-planning
的一个 source-backed candidate contribution，phase-complete、WorkCell、DeepSeek 和实现冻结不变。

## 17. 2026-08-25 P15-U1 practice use-case branch

P15 的下一返回已由 [`records/philosophy-p15-practice-use-case.md`](../records/philosophy-p15-practice-use-case.md) 具体化为 U1：
同一 round-3 consumer 中，Case A 提供不制造循环的负触发，Case B 提供 action/disposition 改变的正触发，
B1–B4 作为没有真实 host practice 的最近非实例。独立 review 发现并修正了一个 Case A 执行事实和一个
P04/attribution 归属问题，最终接受 U1 的 planning-level boundary record。

- **状态转移：** `P15 source-bound reading candidate` → `P15-U1 use-case-candidate / independent-review-complete`。
- **证据上限：** round-3 仍为 `behavior-observed / attribution-uncertain`；U1 不产生 matched、regression、
  reading acceptance 或 treatment superiority。
- **省略：** 不重跑、不创建 P15 专属 Run、synthetic host fixture、固定测试数量、自动 gate、runtime、
  WorkCell/DeepSeek 设计接受或实现。
- **下一 return：** named reading/use-case acceptance owner 与相称边界实践；若 U1 不改变实际判断，则回修
  P15 或关闭 proposal。

## 18. 2026-08-25 attention-management applicability branch

本轮对 archive `attention-management` 做了最小 source/consumer/boundary review。唯一可回读的当前事件是
一次 scope 从 skills 迁移扩展到整个 planning 的修正；没有第二个独立 drift 实例、重复失败或 matched
attention-specific comparison。其 governing-relation 判断与现有 `plan`/`item-ledger`、`practice-cycle`、
`agent-delegation`、`planning-inbox` 的相邻 owner 尚不能区分为独立 carrier；历史 H2 semantic result 又被
post-run audit 判为不可归因的 false positive。

- **最小状态转移：** `candidate-later` → `no-proposal-now / archive-only`。
- **省略：** 不创建 `.agents/skills/attention-management/`、不新增 Run/评估、不移动 archive、不改
  WorkCell/DeepSeek/实现顺序。
- **下一 return：** 第二个独立 drift 实例，或现有 owner 无法区分 `switch` 与 `retain/return` 并改变
  下一行动时，才重新估算并 review；否则该 branch 已在当前证据范围内 settle。

## 19. 2026-08-25 `work-estimation` current-use review

本轮把刚完成的 WorkCell Spec identity review 作为一个 project-local planning self-application，比较
继续堆 WorkCell 字段、提前设计 DeepSeek、启动不可归因 matched round、继续 Stage A 方法形成和重开历史
evidence。`work-estimation` 只提供 branch、dependency、discovery branch、acceptance observation 和
决策粒度；Main/planning authority 负责选择下一 standing/branch，`practice-cycle`、`form-selection`、
`skill-formation` 和各 domain owner 保持各自权威。

| branch | dependency | 最小必要工作 | acceptance observation | discovery open/close | disconfirming observation | next owner |
| --- | --- | --- | --- | --- | --- | --- |
| WorkCell 字段继续增加 | named protocol/record/host owner | owner-return 或 bounded contract review | owner-backed decision 可回读 | owner/consumer 出现时 open；否则 wait | 新字段不改变任何 unknown | protocol/record/host owner |
| DeepSeek system design | WorkCell design acceptance | 只保留 system question | accepted WorkCell exit + system owner | 前置成立时 open | system object 倒灌 WorkCell core | system owner |
| practice-cycle matched round | named runner/identity/activation/schema/card | 先补前置，不直接 Run | matched/review evidence 可回读 | 前置齐时 open；缺任一承重字段 close/no-rerun | 重复 Main 自评不能证明 matched | eval/runner owner |
| Stage A method formation | Main/planning authority 选择；carrier disposition 由 skill-formation 判断 | 复核当前 project-local use 和下一 probe | 只能证明 current boundary/standing | named consumer 且 decision-changing case 出现时 open；Main-only case 不重开 carrier evidence probe | 工作图不改变下一 branch | Main/planning authority / skill-formation |
| historical evidence reopen | source/Run/consumer/owner 可恢复 | applicability audit 或 route | current standing 能从 artifact chain 重建 | source/owner 恢复时 open；仅填 ledger 时 close | source edge 不可回读或不改变决定 | eval/evidence owner |

当前粒度只需 branch、owner、停止观察和是否改变下一选择，不需要 token、时间、金钱、executor capacity
或 deadline。Main 的多次自用记录支持低强度 `behavior-observed`，但不提供 named consumer、carrier-specific
attribution、估算准确性或资源预测证据。carrier 总体继续 `retain-incubation / adapt-and-retest`；本次
WorkCell case 单独关闭为 `no-proposal-now`，不影响 carrier 总体 incubation。没有 named consumer 且工作图
不改变下一决策时，关闭同类 Main-only probe，不继续累积重复自评；WorkCell、DeepSeek、base/runtime 和实现
冻结不变。

## 20. 2026-08-25 Round 1 meta-matched historical evidence closure

本轮选择 F1 evidence-maintenance branch，目标是判断旧 `round-1-meta-matched` 是否仍能支撑当前
`skill-formation` 的迁移选择，而不是重复创建行为 Run。

| 关系 | 当前观察 | 最小处置 | 出口 / revisit |
| --- | --- | --- | --- |
| source edge | `philosophy` hash match；`gene-expression` drift；旧 `theory/harness.md` 路径缺失但新路径 content hash match | 标记 `source-applicability-uncertain`；不把 path/content coincidence 当 current authority | current source/card/consumer relation 可恢复时重开；否则保持历史 |
| fixture/protocol edge | F1 fixture 与 protocol 未在历史记录中保存 freeze hash | 标记 `fixture/protocol-edge-unreconstructible` | 新 round 必须冻结 card、fixture、protocol hash |
| candidate/activation edge | treatment 没有 candidate hash、activation receipt 或 non-activation proof | 标记 `candidate-edge-unreconstructible` | named eval owner 与 activation contract 恢复后才运行 |
| runtime/ledger edge | baseline/treatment/review 文件存在，但无 dedicated trial-ledger entry、full runner/model/harness/workspace identity | 只保留 file-level historical chain | 新 Run 需完整 identity、独立 review 和 current consumer |
| migration consequence | 旧 review 的 owner boundary/`no-proposal` 不能转成 current matched/portable/acceptance | current applicability `historical-only / hold / no-proposal-now`；carrier unchanged | `skill-formation` 继续 `.agents/skills/` incubation，缺条件不重跑不 move |

当前 F1 closure 是 `planning-boundary-observed / source-applicability-uncertain / independent-review-complete`；
不改变 phase 1、WorkCell、DeepSeek、实现冻结或其余 archive candidate 的处置。它满足“历史 evidence
逐项给出 source、standing、consumer/owner、依赖、允许范围、证据上限、处置、阶段出口和 revisit”这一
bounded maintenance contribution。`Dewey`（`01a0394d-c4ad-7e10-a91d-68a232d7ba24`）独立复读并
`accept`，只接受 bookkeeping，不取得任何 skill、phase、WorkCell、DeepSeek 或实现接受。

## 21. 2026-08-25 文档迁移状态 reconciliation

本轮选择 A1 文档状态投影作为低风险 bounded contribution，而不是创建缺少依据的 reading。当前最小
工作图是：读取 source/文件清单 → 对照 P12/P13/P15/P16 disposition → 修正 stale summary → 独立
复核 → 机械验证。观察到 13 个 reading candidate 文件（P01–P11、P14、P15）与 3 个有明确处置而
不存在文件的 package（P12/P13/P16）。

| 关系 | 当前观察 | 最小处置 | 出口 / revisit |
| --- | --- | --- | --- |
| 哲学 source 与 reading artifact | 16 条 source 不变；13 个 candidate 文件存在 | 分开表达 source coverage 与 reading formation | source 或对应 reading standing 改变时重开 |
| P12/P13/P16 缺失文件 | 缺失是 disposition 结果，不是待批量补齐的目录缺口 | 保留 `no-proposal-now` / `hold-cross-boundary-fixture-only` | adversarial/response/adoption consumer 与接受关系出现时再 reopen |
| plan/research projection | 两处 current summary 有 stale overclaim/path wording，P04/P05 artifact standing 曾落后于 projection | 修正派生视图并同步 P04/P05 standing，保留历史 proposal 段落的历史地位 | 新 source、standing 或 canonical path 变化时 reconciliation |

当前结果为 `planning-boundary-observed / artifact-standing-reconciled / projection-corrected / independent-review-complete`；不提供
reading acceptance、portable promotion、phase transition、WorkCell/DeepSeek 或实现授权。所需粒度是
状态投影一致性，不需要 token、时间、金钱或 runner 估算。

## 22. 2026-08-25 P01/P03 artifact standing reconciliation

本轮是 A/B reading artifact 的最小同步：回读 P01/P03 正文、source/边界 review、父关系 review 与
planning projection，发现只有顶层 status 落后。最小改变是把两个 artifact 对齐为
`source-current / reading-candidate / independent-review-complete / acceptance-pending / research-open`。

| 关系 | 当前观察 | 最小处置 | 出口 / revisit |
| --- | --- | --- | --- |
| P01/P03 artifact ↔ planning standing | review evidence 与 projection 已完成，artifact 顶层字段过窄 | 只修顶层 standing | 独立 review 通过后关闭；证据不足则降回准确 standing |
| reading acceptance ↔ review | review 只支持 candidate 保留，不支持 acceptance | 保留 `acceptance-pending` | named acceptance owner 与相称 evidence 出现时 reopen |
| P01/P03 parent relation | 父关系仍 `cross-relation-observed / acceptance-pending` | 不改父关系 | 新反例、source 或 acceptance relation 改变时 revisit |

当前结果为 `artifact-standing-reconciliation / independent-review-complete / acceptance-pending`；不改变
P12/P13/P16 处置、skill migration、phase 1、WorkCell、DeepSeek 或实现冻结。

## 23. 2026-08-25 WorkCell executor comparability boundary

这是一项影响后续 eval 分支但不需要运行器的窄 design-boundary work。工作图为：回读 Binding 类型与
provider comparison wording → 识别完整 Binding identity 与“只改 executor”的冲突 → 比较保留原文、
澄清非 executor 约束、新增 comparison mechanism、直接 matched Run 四条路径 → 保留最小 rewrite
candidate → 独立 review → 回写 wording-only source revision 并做 applicability reconciliation →
owner-backed decision → 再决定 eval fixture。

| 分支 | 最小必要工作 | 当前出口 | 不得推出 |
| --- | --- | --- | --- |
| 保留“同一个完整 Binding” | 需要解释 executor field 如何同时变化 | 当前不作为 eval contract | 可比性成立 |
| 每变体各自 Binding、固定非 executor 约束 | wording review + owner decision | 当前最小 candidate | protocol 已接受或 equality 已定义 |
| 新增 ComparisonBinding/registry | 需要真实 consumer/authority | 暂不提案 | 因比较需要 core mechanism |
| 直接跑 Vercel/DeepSeek | 需要 named runner、fixture、identity 和 owner | 后置 | harness effect attribution |

当前粒度只支持 `design-boundary-candidate / source-revision-applied / current-applicability-reconciled /
independent-review-complete / empirical-unknown / acceptance-pending`；不估 token/时间/成本，
因为 matched Run、consumer 和 acceptance owner 仍不可确定。candidate 已完成仅限 wording/diagram 的
source revision；current applicability reconciliation 已由 revision-2 record 和 `Dewey` 独立 review
完成，但仍不改变“WorkCell design acceptance → DeepSeek system design → implementation”的依赖顺序。

## 24. 2026-08-25 P04/P08 boundary relation

本轮从 B2 选择 P04/P08 的 source-linked boundary contribution，因为 `coverage-audit.md` 已明确列出
该父关系但尚无专门 record。最小工作图为：恢复 P04/P08 的对象与用途 → 固定同一 Binding immutability
claim → 分别构造“同一 scope 证据不足”“单一 scope 维度变化”“scope 与证据均明确”三案 → 独立
semantic review → 回写父 item projection。

| 分支 | 必要工作 | 当前出口 | 不得推出 |
| --- | --- | --- | --- |
| F1：同一 scope、证据不足 | 固定 host/Binding/version/time/claim，保留 evidence unknown | `P04 unknown`，人工/局部 handoff 到 evidence/acceptance owner | P08 scope mismatch、拒绝或 runtime gate |
| F2：单一 scope 维度变化 | 保留原局部观察，只改变 host 等一个 scope 维度 | P08 要求重新问题化，建立新 claim/scope | 将范围外直接写成 P04 unknown/false/forbidden |
| F3：scope 与证据明确 | 保留局部观察、scope 和 acceptance 分离 | 局部 known/supported observation，仍 acceptance-pending | 全局 runtime guarantee、regression 或 protocol acceptance |

当前 record [`records/philosophy-p04-p08-boundary-review.md`](../records/philosophy-p04-p08-boundary-review.md) 已由
`McClintock` 独立 `ACCEPT`；standing 为 `design-boundary-observed / independent-review-complete /
acceptance-pending`。这完成了一个父关系 boundary record，不关闭 P04/P08 reading acceptance、phase 1、
WorkCell 或 DeepSeek 前置；下一 return 是真实 Agent route case，或相称的 P05/P08 同一对象 fixture；
若实际任务不能改变 claim strength、owner route 或下一动作，则 relation 返回 `no-proposal`。

## 25. 2026-08-25 WorkCell `CommandGrant.argumentShape` boundary return

本轮选择 §17.2 的 command authorization gap 作为下一最小工作图：恢复 declaration、host grant、
transport request、actual host observation 和 effect/record 的关系 → 回读历史 exact-argv/no-shell
限制但不继承其 authority → 构造 C1–C4 需求/授予、额外参数、shell 别名、exact argv/实际 effect
反例 → 独立 boundary review → 将 owner decision 与 canonical/runtime 影响分开投影。

| 分支 | 最小必要工作 | 当前出口 | 不得推出 |
| --- | --- | --- | --- |
| 直接冻结完整 `CommandGrant` schema | 需要 host/security 与 record owner 的字段、执行和保留决定 | 当前不选 | 当前 protocol 已接受或安全策略已确定 |
| 保留结构化 argv/invocation 的 wording candidate | C1–C4、failure code 与 observation standing 分层、独立 review | `retain-boundary-candidate / route-to-owner` | exact argv、shell policy、filesystem confinement 或 runtime enforcement |
| 用自由文本/regex/shell string 表达授权 | 语义和解释器边界不可稳定重建 | `reject` | 可移植或安全的 command contract |
| 直接实现 parser/runner 或启动 provider Run | 需要 owner-backed contract、实现授权和相称 eval | 暂不提案 | WorkCell acceptance、DeepSeek/Vercel 结论或实现许可 |

当前粒度只支持 `source-backed design observation / historical-support-limited / independent-review-complete /
acceptance-pending`；`Kepler` 的 ACCEPT 只覆盖本 planning boundary record。由于没有 named owner、
current host consumer 或 security Run，不进行 token/时间/成本换算，也不修改 canonical protocol。

## 26. 2026-08-25 WorkCell semantic-review boundary return

本轮最小工作图为：恢复 §8 的四层对象关系 → 区分 `MechanicalCheck`、`SemanticReview`、
`AcceptanceDecision` 和 next action → 固定 S1–S5 反例 → 保留 subject/rubric/snapshot/findings/
blocked/correction/supersession/basis unknown → 独立 review → 路由给 semantic-review/rubric、
protocol/record/evidence 和 Principal/acceptance owner。

| 分支 | 最小必要工作 | 当前出口 | 不得推出 |
| --- | --- | --- | --- |
| 继续只用 `pass`/`complete` 和自然语言 | 无法区分机械事实、语义判断和接受 authority | `reject` 作为最终 contract；保留 source boundary | reviewer 或 check 自动 accepted |
| 复用现有对象并澄清交接 | S1–S5、structured findings、blocked/unknown 和新 causal review relation | `retain-boundary-candidate / route-to-semantic-review-and-acceptance-owners` | 业务 rubric、Principal decision 或 runtime gate 已确定 |
| 创建 review queue/gate/approval workflow | 需要真实 mandatory consumer、authority 和实现授权 | 暂不提案 | 因 review 未决就增加永久机制 |

当前粒度只支持 `source-backed design observation / independent-review-complete / acceptance-pending`；
`Chandrasekhar` 的 ACCEPT 只覆盖该 planning boundary。没有 named rubric、review、record 或 acceptance
owner，不估算资源、不创建 Run、不修改 canonical protocol，也不开放 DeepSeek 或实现阶段。

### 26. 2026-08-25 WorkCell A/B/C/D current-source applicability

本轮最小工作图为：读取 revision-2 后的当前 protocol sections → 将 A/B/C/D baseline 与当前 source
逐项回指 → 保留 cutoff、撤销、replay、retention、lineage 和 owner unknown → 独立复核 → 同步
projection。它不需要新 Run、provider comparison 或实现。

| 分支 | 当前 disposition | 失败/停止条件 |
| --- | --- | --- |
| 直接接受 A/B/C/D policy | `no-proposal` | current-source read 不能替代 host/security/record/retention owner |
| 重跑旧 A/B/C/D semantic review | `no-rerun-now` | 没有新 consumer、owner 或 source semantic change；重复 review 不改变决定 |
| 建立 current-source applicability child card | `completed-for-this-round` | 只允许 source-level baseline 回指；不得扩展为 protocol acceptance |

当前 child standing 为 `current-source-boundary-observed / applicability-reconciled /
independent-review-complete / acceptance-pending`；`Halley` 已独立接受修订完整性。WorkCell、DeepSeek
system design 和实现冻结不变。

### 27. 2026-08-25 practice-cycle / work-estimation carrier disposition

本轮最小工作图为：恢复两个 carrier 的当前 source 与 round evidence → 分离 carrier-level disposition
和 case-level disposition → 检查 portable/acceptance/implementation 边界 → 独立 review → 同步 migration
projection。它不需要新 Run，也不需要把两者合并。

| 分支 | 当前 disposition | 关闭/重开观察 |
| --- | --- | --- |
| 启动 practice-cycle round 4 matched Run | `no-proposal-now / route-to-owner` | named eval/runner owner、identity、activation、schema 和窄 Case B 全部成立后才 reopen |
| 继续累积 practice-cycle Main-only evidence | `reject` | 没有新 owner/identity/decision-changing case 时，重复 self-application 不改变 standing |
| 继续 work-estimation Main-only current-use probe | `no-proposal-now / wait` | named planning/design consumer 与 decision-changing comparison/discovery case 出现后才 reopen |
| 保留两个 project-local carriers | `retain-incubation / adapt-and-retest` | 主要判断、边界和未来 consumer 仍成立；portable review 独立保持 no-proposal |

当前粒度只支持 `format-valid / behavior-observed / attribution-uncertain / independent-review-complete /
acceptance-pending`；不估算资源、不声称 matched、regression、portable 或接受，不打开 WorkCell、DeepSeek
或实现阶段。

### 28. 2026-08-25 WorkCell identity review current-source applicability

本轮不是重新估算 WorkCell，也不是重复 identity review；它把上一项 bounded source-applicability
practice 接回整个工作图。该条记录当时的 canonical protocol fingerprint 为 Git `2ed713fe…` / raw
`f87422b0…`；当前 source 已更新为 `7240b23… / 513e7ed…`，两个 identity review 中的 `4293057d…`
/ `26ec714f…` 只保留为 review-time historical edge。RunRecord/Binding identity 与 Spec identity 仍是两个分开的 review unit。

| 关系 | 当前观察 | 最小处置 | 出口 / revisit |
| --- | --- | --- | --- |
| Binding / request source | §5.1 的 host-owned immutable Binding、§6.1 的 `bindingRef` 与 request/run/parent 区分可回指当前 source | 保留 source-applicability child，不补字段或 registry | protocol/record/host owner 决定 record projection、digest、retention/correction 时 reopen |
| Spec / record source | §6.1 的 inline/reference 与 §6.5 的 RunRecord 事实投影可回指；当前 RunRecord example 没有显式 Binding/Spec identity slot | 保留 discrepancy 为 design/auditability hypothesis，路由给 record/spec/evidence owner | named consumer、canonicalization、retention 或 acceptance decision 出现时另开 shape review |
| planning consequence | source applicability 已经经独立只读 review，但字段、owner、consumer、acceptance 仍未知 | 只同步 readiness/ledger/plan/roadmap/phase projection，不重跑、不创建 Run | owner return 或新 source/consumer/evidence 改变下一选择时重开 |

当前结果为 `source-applicability-reconciled / design-boundary-observed / independent-review-complete /
acceptance-pending`；这项实践完成的是当前 source 可回读，不提供协议接受、资源估算、matched Run、
DeepSeek 设计或实现授权。它只把“下一项工作”从重复 source read 收敛为 owner/consumer return，
因此不新增工作节点或 resource estimate。

### 29. 2026-08-25 P15-U1 named-owner return check

本轮对 P15-U1 进行的是 owner discovery，而不是新的 practice 或 resource estimate。只读回读当前
authority/planning surface 后，未发现 named reading/use-case acceptance owner；因此最小状态转移是：

```text
U1 source-bound use-case candidate
  → owner surface checked
  → route-to-owner / no-proposal-now (current self-application branch only)
  → retain candidate and wait for owner-backed disposition
```

| 关系 | 当前观察 | 最小处置 | 出口 / revisit |
| --- | --- | --- | --- |
| U1 acceptance | `Goodall`/`Plato` 已完成独立 review，但不拥有 reading/use-case acceptance | 保留 `acceptance-pending`，不由 Main 代填 owner | named owner 给出 retain/revise/close 与相称 practice 时 reopen |
| current practice branch | round-3 只支持 `behavior-observed / attribution-uncertain`，runner/activation/schema 前置仍不足 | 关闭重复 Main-only self-application；不新建 Run/fixture | named runner/owner/identity/schema 与 decision-changing case 同时出现时再评估 |
| planning consequence | 无新信息能改变 P15 candidate 本身的 standing | 只同步 route projection，不增加 work node、资源估算或阶段转换 | owner、source、consumer、rubric 或 attribution evidence 改变时重开 |

当前结果为 `owner-absence-observed / route-to-owner / acceptance-pending`；它只关闭一个无区分度的
self-application branch，不是 P15 `no-proposal`、reading rejection、phase completion 或实现授权。

### 2026-08-25 A4 E0 owner-surface check

| 关系 | 当前状态 | 对工作量判断的影响 |
| --- | --- | --- |
| named eval/runner owner | checked surface 未发现；仍 `unknown` | 不估算 round 4 的 Run/card/fixture/schema 工作量，也不把 Main discovery 当作 owner capacity |
| 最小下一步 | owner-return，带回 identity、activation、schema、source hash 和失败/停止记录 | 只保留一个 bounded discovery return；不增加长期机制、队列、preflight 或预算系统 |
| 当前处置 | `route-to-owner / no-proposal-now`；carrier 仍 `retain-incubation` | 该 branch 不产生 matched、regression、acceptance、portable move 或实现授权 |

这里不做 token、时间或金钱换算：承重 owner 与执行契约尚未存在，进一步精细估算不会改变当前选择。
owner-return 后若形成 decision-changing case，再恢复最小必要工作图；否则保持当前收敛状态。

### 2026-08-25 archive `SKILL.md` source-scope check

| 对象 | 当前观察 | 对工作图的影响 |
| --- | --- | --- |
| 宽路径下的 `SKILL.md` | 76 个文件：canonical inventory 29，evaluation 37，legacy 9，package 1 | 不按 76 个文件估算迁移；47 个非 canonical 文件继续由其上层 artifact relation 拥有 |
| canonical migration source | `archive/skills/*/SKILL.md` 的 29 项已与 inventory 对账 | 不新增 migration item；逐项 candidate/absorbed/no-proposal review 继续沿用 |
| 最小下一步 | 保留已独立复核的 source-scope projection；等待真实 source relation/consumer 变化 | 只产生一次 provenance correction，不估算批量 move、carrier 或 portable promotion |

本项不做 token、时间或金钱换算：观察改变的是 source scope，不是已授权工作量；只有非 canonical artifact
出现真实 current consumer 或 source relation 变化时，才恢复其最小必要工作图。

### 2026-08-25 WorkCell review-family provenance review return

| 关系 | 当前结果 | 工作量边界 |
| --- | --- | --- |
| source provenance | `independent-review-complete`；contract/executor 与 lifecycle/lineage edge 已分层 | 不再估算或重跑整组旧 review |
| CompletionAction applicability | **历史快照（child return 前）：** `current-applicability-pending`；后续 child 已解除 source-level pending | 只保留 owner-backed structured decision；不预估字段、registry、Run 或 runtime |
| overall WorkCell | `acceptance-pending` | 不开放 DeepSeek/provider comparison/implementation；有 named owner 后再恢复最小工作图 |

本次 review 的产出是减少 provenance 误读，不产生新的资源估算或长期机制。

### 2026-08-25 CompletionAction current-source applicability return

| 关系 | 当前结果 | 工作量边界 |
| --- | --- | --- |
| source applicability | `current-source-boundary-observed / applicability-reconciled / independent-review-complete / acceptance-pending` | source read 与独立复核已完成；不再估算重复 source read |
| CompletionAction shape/owner | canonical shape、authority、identity、retention/correction、named owner、acceptance `unknown` | 只保留一次 owner-backed structured decision；不估算字段实现、registry、Run、runtime 或 provider comparison |
| overall WorkCell | `acceptance-pending` | DeepSeek system design 与 implementation 继续冻结 |

本轮估计的变化是把一个 source-applicability pending 分支收敛为 owner-backed decision 分支，不代表新增
实现工作量或 phase transition。

</details>
