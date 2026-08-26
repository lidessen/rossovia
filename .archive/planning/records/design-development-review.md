# Design / Development Skill Candidate Review

状态：`bounded-review-complete / current-projections-reconciled / acceptance-pending`；不是
skill acceptance、portable promotion、move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录处理 `planning/records/archive-skill-inventory.md` 第一批候选。它的工作不是把 archive
正文搬进 `.agents/skills/`，而是判断每个候选是否有可重复的独立判断、真实 consumer、最近邻
owner、相称证据和下一轮回返条件。archive/evaluations 中的结果只作为历史证据；当前 living
branch 仍须重新确认当前 source、consumer、边界和接受关系。

## 与阶段的关系

当前主计划第 1 阶段要求先形成需求、设计、文档、开发、测试、验证和改进相关的方法，但明确
不因目录完整而晋升 portable skill，也不因此授权 Work Cell、DeepSeek Harness 或 base 实现
（[`planning/plan.md`](../plan.md)）。当前项目已经有 8 个 incubating skill 的逐项 review；那一
分支保持 `retain-incubation + portable no-proposal`，不在本批次重复审查
（[`planning/index/skill-migration.md`](../index/skill-migration.md)）。

本批次的最小结果是：候选 owner map、交叉边界、证据 standing、下一探针和阶段门槛。只有在
真实 consumer 与行为探针成立后，才另建 `.agents/skills/<stable-id>/` candidate；`skills/`
目录仍保持不存在。

## 当前新增的能力缺口（不改变本表既有处置）

本轮 planning 主线暴露出一个与现有候选相邻但尚未归属的整体工作协调 gap：
[`whole-work-coordination-candidate.md`](../index/whole-work-coordination-candidate.md)。它暂以
`whole-work-coordination` 为临时 handle，处理跨 item 的整体状态恢复、bounded wave 选择、
并行/顺序边界、fan-in 和 checkpoint；不把 `systems-engineering`、`agent-delegation`、
`work-estimation` 或 `practice-cycle` 合并，也不取得 runtime 调度或接受权。该记录当前只是
`candidate-definition-observed / carrier-not-selected`，后续是否形成独立 carrier 取决于真实
planning/design consumer、边界实践和独立 review。

## 本轮新增的通用字段表达候选

本轮补入一条跨设计场景的方法候选：在定义类型或分类字段前，先判断它是开放描述的 `label`、长期稳定
且有机械消费者的 `enum`、多个独立维度的属性组合、仅用于展示的派生投影，还是结构/约束/动作不同的
变体。其 canonical 语义规则由 [`theory/expression.md`](../../theory/expression.md) 承载，关系影响由
[`theory/harness/relational-verification-design.md`](../../theory/harness/relational-verification-design.md)
和 `mechanism-design-review` 检查；WorkCell 只消费其边界，不建立统一类型 registry。

当前 standing 为 `design-candidate / source-bounded / behavior-unverified / acceptance-pending`。
这次记录不创建 enum 注册表、不把分类升级成状态/权限/验收机制，也不新增 planning item；下一回返是
在真实协议或设计字段中做正例、最近邻/开放值、值域演化、派生漂移和变体结构差异的边界检查。

## 本轮新增的 work-map 驱动候选

多步骤或多任务执行默认由 Plan、Task、Todo 组成的最小 work map 驱动：Plan 保留整体义务与依赖，Task
界定 bounded contribution，Todo 保留当前执行者的下一行动、等待、失败和回返。它要求复用已有 canonical
载体、从 work map 选择下一步并将结果/未知写回，不要求每个微动作建条目，也不创建第二 planning authority、
全局队列或 runtime scheduler。一步且低风险可逆、无依赖/交接的动作是明确例外；跨重启、并发、崩溃或不可信
调用仍需 runtime/base 才能取得硬保证。

当前 standing 为 `design-candidate / source-bounded / behavior-unverified / acceptance-pending`，
主要 consumer 是当前 planning/design 协调和 Agent 任务表达；`whole-work-coordination-candidate` 保留
跨 item 的 wave/fan-in/checkpoint 边界。下一回返是观察真实多步骤 wave 是否减少遗漏、错误的全局冻结和
返回后未回接，而不以“清单存在”作为完成证据。

## 初始总表

| candidate | 独立主要判断 | 当前 consumer / owner | 与最近邻的边界 | 历史证据 standing | 当前 disposition | 下一回返 |
| --- | --- | --- | --- | --- | --- | --- |
| `disciplined-development` | 开发中从实际证据选择最小改变，并在声明完成前用可证伪观察检查；不是完整 workflow | 当前没有正式 living carrier；可作为后续开发方法的轻量基线 | 不拥有任务/载体选择、迭代下一步、代码 review 或 runtime 强制；与 `practice-cycle` 的区别是结果是否必须改写下一判断 | `behavior-observed`；狭窄 deterministic 修复和边界被观察，独立归因未成立 | `no-proposal-now / activation-deferred / retain-archive-source`；archive `candidate-next` 仅是 future reopen 标签 | 出现真实 development consumer、重复 failure gap 和可独立检查的反例后，重新做 source/consumer/boundary probe |
| `practice-cycle` | 给定实际结果，选择能改变当前理解的下一最小实践，或 settle / route | 窄方法候选；更宽的迭代循环由 `theory/harness/iterative-improvement.md` 及各 owner 承载，当前没有确认的 living consumer | 不创建通用 plan/task board，不取代 domain method、`form-selection` 或接受权；不把重复动作当学习 | `behavior-observed`（历史 action/one-step 观察）；当前没有 matched improvement 或 regression；round 4 前置审查显示 identity/activation/schema/owner 仍不足 | **历史 pre-reconciliation：** `candidate-next`；当前 standing 见 reconciliation projection：carrier `retain-incubation / adapt-and-retest`，case `no-proposal-now / route-to-owner`，portable review 独立 `no-proposal-now` | 先取得 named eval/runner owner 与四项可回读前提，再做窄 Case B probe；若不可得则保持 attribution unknown 或 no-proposal |
| `work-estimation` | 在资源换算前恢复目标状态、必要工作图、发现分支和决策容忍度；不是价格或预算批准 | 当前 planning item 可作为低风险 consumer；资源/预算转换仍属其他 owner | 不取代战略选择、`practice-cycle`、`form-selection` 或 runtime envelope；不把节点直接等同 token/time/money | archive-backed `behavior-observed`；有局部边界观察，但当前校准/运行 enforcement 未成立 | **历史 pre-reconciliation：** `candidate-next`；当前 standing 见 reconciliation projection：carrier `retain-incubation / adapt-and-retest`，case `no-proposal-now / wait-for-named-consumer-and-decision-changing-case`，portable review 独立 `no-proposal-now` | 用当前 planning item 比较 coarser/finer estimate、discovery branch 和 one-step no-estimate；检查是否改变下一决策 |
| `code-review` | 针对已提出代码变更恢复契约和影响面，报告有可达失败路径的决策性缺陷；不是实现或 merge authority | 当前无已接受 base implementation consumer；未来 WorkCell/system implementation 有明确 later consumer | 不拥有未接受架构、普通实现、结构性重构或并发拓扑；可把 accepted refactor route 给 `structural-refactoring` | archive-backed historical behavior/boundary observation；当前 branch 没有 matched improvement 或 fresh run | `no-proposal-now / activation-deferred / retain-archive-source`；archive `candidate-next` 仅是 future reopen 标签 | 真实 accepted-intent diff、命名 acceptance/merge owner、可回读 contract/baseline 和独立 positive/negative boundary 出现后重开 |
| `structural-refactoring` | 在行为和约束保持下重构已存在代码结构，选择边界、迁移路径和 checkpoint | 当前无主线代码 consumer；未来实现阶段有 later consumer | 不做 routine cleanup、feature 或未决 architecture；不拥有最终 acceptance；`code-review` 发现 defect，本方法保持行为执行结构 | archive-backed historical behavior/boundary observation；因果归因与跨项目 transfer 未成立 | `no-proposal-now / implementation-gated / retain-archive-source`；archive `candidate-next` 仅是 future reopen 标签 | 真实 accepted-intent behavior-preserving refactor、named structural pressure、no-refactor 对照和 caller/state/regression evidence 出现后重开 |
| `mechanism-design-review` | 设计机制前判断对象/起因/目的，并比较 prompt、现有 owner、确定性检查与新机制的全生命周期负担 | `design/work-cell-protocol.md` 是当前 first consumer；系统设计是后续 consumer | 不实现已接受机制，不创建 review queue/gate/runtime；不取代 `task-shaping`、`agent-delegation`、`code-review` 或 `systems-engineering` | project-local candidate；WorkCell planning probe 已有低强度 `behavior-observed`，独立 review 发现 review unit/路由/lineage/return 缺口；round-1 后已收窄 fixture-stipulated consumer 边界；matched、acceptance 和 regression 未成立 | `rewrite-applied + retain-incubation`；保留 `.agents/skills/` candidate，不进入 portable `skills/` | 取得 named replay consumer、prompt/owner 足够反例、最近邻路由、重启 fixture、可重建 runner identity 和 adoption/regression unknown review；若形式仍不成立则 demote/no-proposal |
| `project-cognition` | 为指定后续决策建立/刷新可验证的 source-linked working model，并决定是否值得持久化 | 当前 `planning/item-ledger.md` 拥有 planning item standing；额外 cognition consumer 尚未明确 | 不拥有 project facts、context delivery、code review、planning authority 或 acceptance；item ledger 不是自动 cognition projection | 历史有 action、authority correction、boundary 和 matched comparison；当前分支没有 named later actor、重复 consumer、重建成本或 decision delta | `no-proposal-now / archive-only`；历史价值保留，当前不新增第二个 project model | 只有 named later actor、真实重复重建/遗漏观察、decision delta、external verifier/retention owner 和接受关系共同出现时重开 |

“`candidate-next`”表示下一轮可以恢复其 consumer/boundary，不表示现在已接受；“`candidate-later`”
表示方向成立但当前阶段没有足够真实消费关系。任何候选都不能只凭 archive 文件存在晋升。

## 独立边界

### 1. 开发纪律、实践闭环、工作量判断

三者可能在同一次开发中相邻，但不是一个万能 development skill：

```text
disciplined-development
  └─ 当前行动如何以证据、最小改变和可证伪检查保持诚实

practice-cycle
  └─ 实际结果怎样改变下一次实践，或使当前问题 settle / route

work-estimation
  └─ 在资源换算前，必要工作图和 discovery branch 怎样支持当前决策
```

`disciplined-development` 可以是其他方法的轻量行为底座，但不能因此自动成为任何任务的
强制 preflight。`practice-cycle` 只有在结果会改变后续判断时触发；没有学习 handoff 的一步
小改动回到 ordinary development。`work-estimation` 只在粒度、替代方案、资源承诺或 discovery
分支会改变当前选择时触发；它不能给 runtime 预算硬保证。

现有历史证据支持保留这三个不同问题的候选，但还不足以决定它们必须成为三个 carrier。下一轮应
先做相邻任务路由 probe；若一个真实 consumer 中始终由同一主要判断和同一失败关系完成，才
考虑合并；若有独立触发、失败和验证关系，才保留拆分。

### 2. 代码审查与结构重构

两者的时序和 acceptance 对象不同：

```text
accepted intent + proposed code change
  → code-review: 发现决策性缺陷/残余风险，交给 acceptance owner
  → 若需要行为保持结构迁移：structural-refactoring
  → ordinary development + independent verification
```

`code-review` 不因发现架构疑问而替代 design owner；`structural-refactoring` 不因文件很大、
有 AST 或有多个 Agent 就自动拆分，也不改变产品行为。两者都不能自己 merge、accept 或创建
refactor runtime。当前没有实现 consumer，因此本轮只完成 owner map 和 probe 设计。

### 3. 机制设计审查与项目认知

`mechanism-design-review` 处理“是否需要增加可强制/可持久化的机制，以及最小 treatment 是什么”；
`project-cognition` 处理“是否值得为指定后续决策持久化 source-linked working model”。前者的
潜在 first consumer 是当前 WorkCell 设计候选，后者则需要先证明 item ledger 不能满足某个命名
后续决策。两者都不应自动建立 registry、projection、review queue 或第二 planning authority。

## 证据与风险边界

- archive 里的 skill 正文说明了对象、边界和方法候选，但不能替代当前 living source。
- 旧评估中的“supported”最多证明对应历史环境的局部行为；没有当前 branch 的匹配 baseline、
  独立 review、回归和真实 consumer，就不写成当前 accepted。
- `mechanism-design-review` 已完成 WorkCell-specific planning probe，并形成项目内 candidate；独立
  review 见 [`mechanism-design-review-candidate.md`](mechanism-design-review-candidate.md)，当前载体
  处置为 `rewrite-applied + retain-incubation`；本次 rewrite 只收窄 fixture-stipulated consumer 的证据地位。
  round 1 的三案 baseline/treatment recommendation 一致，只保留 source-backed / planning
  `behavior-observed` 与局部 `boundary-supported`，matched attribution、
  独立接受和 adoption 仍为 `unknown`，见 [`mechanism-design-review-round-1.md`](mechanism-design-review-round-1.md)。
- `project-cognition` 的历史对照较强，但持久化是否仍有净收益取决于当前 item ledger、后续
  Agent/决策和重建成本；不能因历史有 projection 就在本项目再建一份。
- 没有候选获得 portable promotion；没有创建 `skills/`；没有移动 archive；没有开始 base、
  executor、WorkCell 或 DeepSeek Harness 实现。

## 本轮 bounded contribution 与阶段出口影响

本轮将 `planning/records/archive-skill-inventory.md` 的初筛推进为可回读的 candidate review，并把
`mechanism-design-review` 形成项目内 candidate，但不把它改写为 accepted。它满足当前 phase 的
一个中间出口：已有候选的初版 owner/boundary/evidence/revisit map 和一个真实 WorkCell consumer；
`mechanism-design-review` 已完成一轮冻结 matched-probe 形状与独立 review，但因 runner identity
不可重建且三案 recommendation 一致，仍缺 matched attribution、regression 和最终 acceptance；其他
candidate 仍按各自回返条件推进。

其中，原先为 `mechanism-design-review` 选择的 WorkCell bounded probe 已执行并回写到
[`planning/item-ledger.md`](../item-ledger.md) 与 [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)。
结果是保留当前分层、不新增万能机制，同时把 drain、Binding expiry、Event replay 和 lineage
恢复列为明确的 design unknown/acceptance counterexample。

因此当前阶段继续保持 active，不能进入“WorkCell 设计已完成”或 implementation plan。下一步按
以下顺序推进：

1. 为四个 WorkCell lifecycle/record unknown 找到对应 owner、反例和可检验结果；
2. 为 `mechanism-design-review` 继续做带 named replay consumer 的机制压力正例、prompt/owner 足够
  反例、最近邻路由和可重建 runner identity 的独立 review；同时在一个真实 planning/design case 中验证 `practice-cycle` 与 `work-estimation` 的触发、
   互相转交，以及现行 iterative-improvement theory 是否已经足够承载该关系；
3. 有真实代码变更后再恢复 `code-review` 与 `structural-refactoring`，不为验证 skill 先做
   fake implementation；
4. `project-cognition` 已在 [`project-cognition-disposition.md`](project-cognition-disposition.md)
   中收敛为 `no-proposal-now / archive-only`；只有出现 named later actor、真实重复重建/遗漏观察、
   decision delta、external verifier/retention owner 和接受关系时才重开，不创建 temporary model
   之外的当前 carrier。

这些是下一轮 return conditions，不是自动任务队列或实现授权。

### 2026-08-25 当前代码方法候选投影

`code-review` 与 `structural-refactoring` 的当前 branch disposition 已单独收敛于
[`development-method-candidate-disposition.md`](development-method-candidate-disposition.md)：二者
仍保持 `candidate-next`，但当前分别为 `no-proposal-now / activation-deferred` 与
`no-proposal-now / implementation-gated`，archive source 保留且不创建 living carrier。该窄投影
经 `Hubble` 独立语义审阅 `final accept`；它只说明当前没有真实代码 consumer，不改变本表原有的
“有真实代码变更后再恢复”顺序，也不取得 implementation、WorkCell 或 DeepSeek authorization。

### 2026-08-25 当前 carrier disposition reconciliation

[`method-skill-carrier-disposition-reconciliation.md`](method-skill-carrier-disposition-reconciliation.md)
修正了本表中 `practice-cycle` 与 `work-estimation` 的 stale `candidate-next` projection。两者的
carrier-level 当前处置均为 `retain-incubation / adapt-and-retest`；`practice-cycle` 的当前 matched
branch 为 `no-proposal-now / route-to-owner`，`work-estimation` 的当前 Main-only case 为
`no-proposal-now / wait-for-named-consumer-and-decision-changing-case`。portable review disposition
另行记录为 carrier-level `no-proposal-now`，不由当前 case 自动推出。

`Meitner` 已独立 `ACCEPT` 本 reconciliation record。它不改变本表其它 archive candidate 的历史
`candidate-next`，不把两个方法合并，不创建 portable carrier，不启动 round 4，也不授权 WorkCell、
DeepSeek 或实现。

### 2026-08-26 问题优先的实现设计方法回接

用户要求重新审视“实现设计从哪里开始”。本轮参考工业 DOE、NASA 系统工程、临床试验报告、SRE、云性能
评估和真实项目实施研究后，将共同方法回接到 [`controlled-experiment-design.md`](../../theory/research/controlled-experiment-design.md)
的 §2B：

```text
Problem → Context → Mechanism → Variables → Estimand → Design → Implement → TEVV → Disposition
```

这不是新增一个泛化 `design-method` skill，也不是强制每次生成一套表单。它是三个现有 owner 之间的
设计参考：

- `mechanism-design-review` 继续判断是否真的需要新增机制及其最小处置；
- `controlled-experiment-design` 承载问题、场景、变量、对照、验证和结算的科学设计关系；
- `practice-cycle` 在实际结果出现后决定下一项最小实践、route 或 settlement。

本轮先在长时间 Agent continuity card 上完成一次真实映射，形成了变量图、task-level estimand，并把
`task continuity relation` 从机制名收窄为 provisional semantic target；当前三个 decision-changing
unknown 已转为 candidate implementation 的最小实例化、任务族覆盖/数值重复与精度方案和 guardrail 接受范围，
另有概念 action probe/正式 designation unknown。任务级分配、checkpoint 嵌套、独立重复和污染控制的结构
已经在 long-horizon card 形成设计候选，但没有 named runner、任务族或 variance/effect 输入，尚不能冻结
数字。这只支持 `source-backed / method-boundary-formed / applicability-observed` 和
`no-matched-method-effect`，没有 portable skill acceptance 或 implementation authorization。下一步先处理
上述设计 unknown；若后续没有第二个可比较 consumer、独立 review 或 matched method-effect，回到
`no-proposal`，不创建 sibling skill。
