# Plan

做到这份目录为止，不开始基座实现。哲学基础 / philosophical foundations 指 `theory/philosophy.md` 及其解读，不再叫 Sequence、原则源。

上一版具体在 `archive/v0.5`。完整旧树看那个分支。活树 `archive/` 是历史来源和迁移 staging；先按
source、consumer、boundary 与 standing 区分 canonical migration source、archive-only、evaluation、
legacy 和 package fixture。只有当前 planning item 有明确 move disposition 时才移入目标路径，并在
移动后编辑；仍在 `archive/` 不等于尚未判断或承诺迁移。

## Planning authority

目录发现入口：[`planning/README.md`](README.md)。

当前跨 item standing 只从 [`item-ledger.md`](item-ledger.md) 读取；本文件只拥有
pre-implementation 的顺序、依赖和实现前冻结关系。bounded child/review record 只拥有其观察、review、
source edge/provenance 和 applicability judgment；对应的 theory、design、research、eval 或 skill
source 继续拥有语义 source 与接受关系；`roadmap.md` 拥有长期方向；phase、estimate、loop 文件不产生新的当前 standing。
下面的 dated projection 仅保留历史回返，不以段落出现顺序覆盖 item ledger 或 source record。

## 当前过渡覆盖

用户已将上一版“先完整设计并 dogfood workflow”的路线打回。当前缺少的是把已有成果点燃为可交接工作面的
临时过渡机制，而不是继续扩写最终 workflow。当前过渡入口是 [`transition-package.md`](transition-package.md)。
以下旧主计划和第一阶段主体暂作为未接受候选与历史参考；
不能把完整 `plan.md` 当作 bootstrap 的 seed work map，也不能用写出 workflow 文档代替真实点火。新的
过渡工作包、首个真实动作、交接/回落条件形成后，再重建当前 plan 主体。

## 目标形状与路径规则

目录发现入口是 [`planning/README.md`](README.md)，跨 item 当前 standing 以
[`planning/item-ledger.md`](item-ledger.md) 为准。本节只保留路径规则与 owner 边界；它不是当前
inventory、任务队列或完成证明，新增文件不要求在这里同步登记。

当前路径规则：`design/` 只放仍约束下一版形状的文件；`.agents/skills/` 是本项目技能源；
`skills/` 只在 portable skill 获得相称接受后出现；`archive/` 只保留历史来源和待迁移材料。
具体文件与入口由 README 和 item ledger 发现，不在 plan 中复制。

## 完成条件

活树保持 AGENTS、README、item ledger 与各 canonical source 所定义的 owner 与 standing；空的
`design/` / `research/` / `archive/` 子栏可以等
有文件再出现，`skills/` 也可以在没有已接受 portable skill 时为空或不存在，不为目录形状复制
`.agents/skills/`。`theory/philosophy.md` 仍是一行一条。Work Cell 设计可以存在于 `design/`，
但在取得明确接受和实现授权前，基座代码仍不能开始。

## 主计划：先重建工作流，再到 WorkCell、系统和构想实验

这是当前用户明确给出的顺序主线。它表达阶段依赖，不自动产生 owner、时间承诺或实现授权：

1. **成果回顾与工作流重建。** 回顾已有成果、历史和当前结构，形成可实践的 workflow Draft；不等待
   所有内容正式化，先在真实 planning/design 工作中试行，再按 decision delta、成本、未知和回退结果修正。
   这一步的详细设计、agent 拓扑、文档边界和阶段出口见 [`design/harness-workflow.md`](../design/harness-workflow.md)。
2. **按工作流收敛结构、skills 和文档。** 只迁移有真实 consumer、owner、边界和回退关系的对象；明确
   `AGENTS.md`、harness 文档、theory、skill、design、plan、records、evals 的唯一职责，不做批量搬运或
   为了完整性创建载体。
3. **反复打磨并完成 Work Cell 设计。** 以 `design/work-cell-protocol.md` 为唯一 Draft 设计正文，
   收敛协议、命名、host 效果边界、运行记录、证据、取消/恢复和调度关系。这里的“完成”指
   设计边界达到接受条件，不是开始实现 Work Cell 基座。
4. **设计基于 DeepSeek Harness 的工作系统。** Work Cell 作为执行边界，另行设计系统层的
   Agent/session、通知输入、多来源、实时记忆和聊天记录、todo 并发、双向输出、隔离、取消
   和恢复；保留这些设想为工作系统设计对象，不把它们提前塞入 Work Cell core。
5. **设计评审通过后再实现系统。** WorkCell 协议和工作系统设计都取得明确接受、owner 和
   实现授权后，另建 bounded implementation plan；实现顺序从最小 host/coordinator/adapter
   到完整工作系统，不直接迁移 0.5 runtime。
6. **在已实现的工作系统上承载用户的 harness 构想。** 各种构想分别成为 experiment 或
   eval candidate，沿用统一的 WorkCell、证据和 review 边界；不把某个构想的实验代码反向
   变成系统 core 语义。

实现授权边界是单向的：未形成可审查的输出不能以“先实现再验证”跨越设计边界；但工作流试行、结构
修订和 research/experiment 的处置可以按实际 consumer、后果和回返需要来回调整，不要求每项工作经过
同一组固定阶段或记录形态。

## 当前阶段：工作流重建与成果收敛

当前阶段优先级高于 WorkCell，目标是形成下一阶段可以直接使用的工作方法，而不是继续增加 WorkCell
字段、review record 或候选状态。

### 第一阶段 plan

1. **冻结审计基线：** Main 恢复唯一 authority、当前成果、历史、允许效果、非目标和回退点；WorkCell、
   DeepSeek 和实现保持暂停。
2. **并行全面审计：** 本轮采用 Main + 4 个只读 agent：A 审计成果/authority/历史，B 审计实践优先工作流
   和理论边界，C 审计 skills/harness/theory ownership 与重复，D 审计阶段 plan/迁移拓扑/WorkCell reopen
   条件。各 agent 不修改共享文件、不接受任何对象。
3. **Main fan-in：** 合并冲突、共同遗漏和真正 decision-changing unknown；形成一份 workflow Draft、
   简版 AGENTS 规则和本计划，不继续拆 sibling review。
4. **真实 dogfood：** 用该 Draft 处理一个命名的真实多步骤 planning/design 工作，实践问题优先、复杂度判断、
   工具准备、Plan/Todo、适度委派、回落修剪和 checkpoint；记录实际 decision delta，而不是只记录已阅读。
5. **结构/skills 收敛：** 依据真实 consumer 决定哪些内容留在 `design/`、`theory/`、`.agents/skills/`、
   `planning/`、`records/`、`evals/`；单对象单写者迁移，失败按 manifest 回退。
6. **实践后整体 checkpoint：** Main 复核真实 dogfood 的 decision delta、成本、未知、回落和下一步；必要时
   另请未参与生产的 agent 做 post-dogfood review。只允许选择继续 bounded settlement、hold/no-proposal
   或 reopen WorkCell design review。即使 reopen，也不授权实现。

### 当前 agent 拓扑

第一轮全面整理实际使用了 Main + 4 个并行只读贡献 agent；fan-in 后使用 1 个独立 reviewer。这是本次
审计的历史事实，不是后续配额。后续是否委派、并行多少、是否需要 reviewer，只由真实独立贡献、隔离写面、
依赖和风险决定；Main 始终保留整体和最终写面。

### 当前明确不做

- 不实现 WorkCell、deterministic executor、adapter、provider comparison 或 Run；
- 不开始 DeepSeek Harness 系统设计或实现；
- 不把所有 P01–P16 关系补成 fixture；
- 不批量迁移 archive、不镜像到 portable `skills/`；
- 不创建全局 todo、queue、registry、scheduler 或总控 Agent；
- 不因“流程完整”新增 record、状态组合或独立 skill。

### Research / experiment 结算指引

`research`、experiment candidate、review 和类似开放记录不能无限期停留在
`research-open / acceptance-pending` 的混合表面。需要结算时，应在 bounded wave 内留下问题、决策对象、
来源、证据上限、owner/consumer、下一动作、结算路线和 reopen 条件；可按实际对象回写 canonical source、
进入 bounded trial、形成 proposal、有限 owner-gated hold、保留 unknown 或带理由的 `archive-*`，也可以
直接 no-proposal。不是每次实践都必须创建 research record 或进入同一结算形态。
frontmatter 的 `status` 只用于检索 `active / settled / archived`，不替代正文和 item ledger 的 standing，
也不把 `settled` 当成 accepted。详细规则与当前 inventory 见
[`research-settlement-and-closure.md`](../theory/research/research-settlement-and-closure.md)。

## 已形成的前置输出（摘要）

本节只确认 pre-implementation 的材料已经形成；详细证据、当前 standing 和历史 lineage 回到下方
证据索引与 [`item-ledger.md`](item-ledger.md)，不在这里重新维护一份状态表：

- 活树路径、archive staging、哲学源与 P01–P16 work-package map 已建立；当前 16 个 package
  均有 source-bound reading candidate，其中 P12/P13/P16 的初轮 reading review 已完成并完成条件性最小修订，修订后 follow-up clean、acceptance 仍 pending；
  P12/P13 下游 strategy 保持 no-proposal，P16 下游 adoption/time-window 实践保持 hold。
- `theory/`、`evals/`、`experiments/` 与 `.agents/skills/` 的职责边界已建立；当前 11 个
  incubating skills 和三个设计/开发方法 candidate 的逐项 standing 以 item ledger 为准，portable
  `skills/` 仍为空。
- `design/work-cell-protocol.md` 已形成 WorkCell 协议设计候选；它尚未采纳、尚未实现，也不产生
  provider 选择、协议 acceptance 或实现授权。

## 既有文档/skills 阶段：历史成果与证据回顾

本节保留此前文档/skills 迁移与方法形成波次的成果、证据和未闭关系，供当前工作流重建阶段回顾；
它不再是当前优先执行入口，当前阶段以本文件上方的“工作流重建与成果收敛”为准。

本节描述阶段资格与 pre-implementation 出口，不表示该阶段的执行波次已打开；当前是否继续、等待
owner 或停止，只回读 [`item-ledger.md`](item-ledger.md) 的当前执行面。

### 当前 goal

- goal id：`01a0370c-d215-7680-909f-6145a34dc1bf`（main planning goal）
- objective：盘点整个 planning 及其关联对象，识别当前可推进 item，建立来源、standing、
  consumer/owner、依赖、范围、证据、处置、阶段出口和 revisit 关系，并按迭代改进闭环推进；
  不把未决规划写成实现授权。
- status：active

同一 goal thread 的前一阶段已经完成 skills 迁移 review ledger；其证据保留在
[skill-migration.md](index/skill-migration.md) 与 `evals/project-audit/living-skills-round-1.md`。
该阶段作为本 main goal 的一个已完成 planning 分支，不再限制整个 planning 的范围。

### 当前阶段 standing

- 阶段：incubation/planning candidate，已取得进入当前主计划的用户指示
- owner：unknown
- priority：顺序上优先于 Work Cell 设计，但未给出绝对 priority
- scope：从 archive 和 living theory 中筛选、吸收、重写有价值的文档/skills；形成设计开发
  相关的项目内 skills
- 不包含：portable skill 晋升、Work Cell/base 实现、DeepSeek 工作系统实现、构想实验 Run

### 阶段输出（当前摘要）

当前阶段只把以下关系作为可见出口；具体证据回到所列 canonical source，不在本段复制成第二份
current ledger：

| 输出 | 当前 standing | 权威回读 / 边界 |
| --- | --- | --- |
| archive 文档/skills 迁移清单 | archive canonical source 29 项已对账；`.agents/skills/` 11 项；portable 0 项；当前 archive migration wave 为 `done-for-now / waiting-for-named-consumer` | [`skill-migration.md`](index/skill-migration.md)、[`records/archive-skill-inventory.md`](records/archive-skill-inventory.md)；只有单项 reopen 条件出现时再判断，不批量 move |
| 设计/开发方法形成 | 3 个 project-local candidate 保留 incubation；matched、portable 和 acceptance 未成立 | candidate record / method probe；先处理真实 consumer、runner/evidence 或 code consumer |
| goal 级工作方法持续演化 | `iterative-improvement` 已因长期 goal consumer reopen 为 `active / adapt-and-retest / design-candidate`；设计后 review 与真实 wave 后回落共用 baseline、method snapshot、rollback 和独立 review 边界 | 先在真实多步骤 goal wave 做一次语义 checkpoint 与单一 change hypothesis；不创建 self-improvement registry、scheduler、自动改写器或 runtime mechanism |
| 研究结果到 harness 的应用交接 | research 的 `settled/archive` 不代表 harness 已采用；需要分别回读 semantic handoff、carrier handoff、activation observation 和 adoption/reopen evidence | 有价值但尚未交接的结果只结算 research round，保留目标 item 的 `integration pending` 应用义务；无价值、无 proposal 或有 successor 且没有未决应用义务时才允许归档 |
| planning item 与迭代闭环 | item contract、loop coverage 和最小工作图均可回读；owner、acceptance、adoption/regression 仍按 item 保持 unknown | [`item-ledger.md`](item-ledger.md)、[`item-loop-coverage-audit.md`](index/item-loop-coverage-audit.md)、[`whole-planning-work-estimate.md`](index/whole-planning-work-estimate.md) |
| phase 1 → WorkCell 前置 | 有限 clarification allowance 为历史 candidate；`phase-complete` 未成立；当前 WorkCell 已按用户新优先级暂停 | [`phase-1-exit-review.md`](phase-1-exit-review.md)、[`records/workcell-design-acceptance-readiness.md`](records/workcell-design-acceptance-readiness.md)；不产生 transition 或实现授权 |
| 后续系统与实现 | DeepSeek 工作系统、base/runtime、WorkCell 实现和用户构想 Run 均未授权 | 等对应设计 acceptance、owner 和 implementation authorization |

### 已完成证据索引（默认折叠）

下面保留本阶段已经完成的 source、review、applicability 和 lineage 记录；它们用于追溯，不拥有
当前 standing，也不覆盖 item ledger、canonical source 或 child record。当前先读上面的摘要，再按
需要展开证据索引。

<details>
<summary>展开阶段证据索引</summary>

- 每份迁移材料都有来源、用途、standing 和去向；历史文档不直接冒充 living authority。
- 设计开发相关 skills 先进入 `.agents/skills/`，保持项目 adapter 与通用方法的边界。
- `planning/index/skill-migration.md` 逐项登记当前 11 个 skill：8 个既有 incubation skill 与三个本轮
  新增 candidate；组合状态不再冒充逐项处置。
- 逐项 skills review 已形成 `retain-incubation + portable no-proposal` 结果；后续只在新 consumer、
  新证据或回归出现时重开，不把这条分支重复当作未审查。
- `planning/item-ledger.md` 已开始承载整个 planning 的 item identity、standing、依赖、可推进
  贡献和阶段出口；它不替代各自 canonical source。
- [`planning/index/item-ledger-field-audit.md`](index/item-ledger-field-audit.md) 当前 projection 已回读 16/16
  顶层 item contract rows 与 16/16 reading package rows；PL-01..PL-16 仅为 audit-only mapping，
  P01–P16 的共同 owner 是显式继承声明，不能
  冒充 named owner。P15 与 P16 已按当前 standing 拆分；该审计不改变语义接受、phase-complete 或实现授权。
- [`planning/index/item-loop-coverage-audit.md`](index/item-loop-coverage-audit.md) 又把 16 个顶层 item 显式投影
  到 `baseline → observation → minimum change → review → acceptance → projection/move → adoption
  regression`，并已同步 P15-U1/P16 的当前 projection；已有相称 review 的 item 已完成相应独立
  review，PL-12 的七对象 definition review 与新增 PL-16 的独立 review 已分别由针对性 reviewer
  accept；本轮另完成了 PL-07、PL-13、PL-14、PL-15 的 projection-only downstream boundary review，
  但四者仍未取得相称的 item-level independent review；全体
  acceptance、named owner、真实 consumer 和采用后回归仍未闭合。它不把 `review` 写成 `acceptance`，
  也不把 projection 写成 move。
- [`planning/index/whole-planning-work-estimate.md`](index/whole-planning-work-estimate.md) 已把整个 planning
  恢复为最小工作图，独立区分 A 迁移/方法、B 哲学 reading、C WorkCell、D DeepSeek 系统、E 实现、
  F evidence maintenance 与 R research/experiment 分支；`independent-review-complete` 只表示
  工作图和边界得到复核，不表示任何阶段、资源或实现接受。
- [`planning/records/disciplined-development-review.md`](records/disciplined-development-review.md) 已完成一次
  skill-formation 回返：当前提案关闭为 `no-proposal-now / activation-deferred / retain-archive-source`，
  不创建 carrier；archive `candidate-next` 只保留为 future reopen 标签，planning/design 仍只是 review
  context，真实 code consumer、重复 gap 和独立归因仍未知。
- [`planning/phase-1-exit-review.md`](phase-1-exit-review.md) 已把有限下一阶段澄清 allowance 与
  `phase-complete` 分开，并完成独立 review；2026-08-25 current projection 又对齐了 P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 与 P12/P13/P16 的 package standing；allowance 仍是 candidate-observed，phase 1 仍未完成，
  不产生正式 WorkCell transition 或实现授权。
- `planning/records/workcell-lifecycle-review.md` 已对 bounded drain/unknown effect 与 active Binding
  expiry/revocation 完成一轮独立 review；A/B 继续 `retain-unknown / route-to-owner`，B4 的
  Binding identity 只记录为 canonical record shape 缺口，不补写字段或 runtime 行为。
- [`planning/records/workcell-design-acceptance-readiness.md`](records/workcell-design-acceptance-readiness.md) 已把
  protocol §17 开放项、§18.1–§18.12 反例与现有 WorkCell review records 组合成 15 个 acceptance
  dimensions；Goodall 独立 review `accept`。上文记录的是 current-source child card 之前的
  `source-edge-drift / current-applicability-uncertain` qualifier；该 qualifier 仍适用于 parent/整体
  readiness，但 A/B/C/D child 已由 [`records/workcell-current-source-open-relations-applicability-review.md`](records/workcell-current-source-open-relations-applicability-review.md)
  推进为 `current-source-supported / applicability-reconciled`。这仍不是 policy、protocol acceptance
  或 gate，不改变 WorkCell acceptance、phase transition 或 implementation authorization。最新回返又
  明确 5 个 bundle 只是内部恢复索引，只有重大事项才发送被触发的单个 bundle；局部可逆问题继续自主
  处理并事后纠偏，不把 readiness package 变成全量审批表。
- `planning/index/coverage-audit.md` 已把 P01–P16 展开为父 item 下的 reading work package，并明确
  research、eval、experiment、inbox 和 incubating skill 的 item/non-item 边界；它不新增第二份
  authority。
- `planning/index/evidence-maintenance-review.md` 已盘点当前 eval protocol、audit、历史 round、generated-only
  artifact 和 experiments prototype；它把可继续维护、historical-only、hold、uncertain 与
  not-authorized 分开，不把历史 Run、旧路径 JSON 或可运行原型写成当前 evidence/acceptance。
- [`planning/records/evidence-applicability-review-living-skills-round-2.md`](records/evidence-applicability-review-living-skills-round-2.md)
  又完成了七个 living skill round-2 family 的共性核对：manifest 均声明 `not run`，但对应 run/review
  文件存在；七个 manifest-declared candidate hash 都与当前 `.agents/skills/` 源码不同，且 trial ledger 没有这些
  round 的 lineage entry。当前只承认历史产物与 review 的 `behavior-observed` 上限，不把它们回写成
  current Run、matched、portable 或 acceptance；七个 skill 继续留在 `.agents/skills/` incubation，不
  创建新 Run、不重跑、不编辑旧 card/run/review。
- [`planning/records/evidence-applicability-review-planning-inbox-round-2.md`](records/evidence-applicability-review-planning-inbox-round-2.md)
  又完成了 planning-inbox round-2 的 post-freeze applicability reconciliation：五项 input/output、run identity、
  blind review 和 synthesis 可在文件/事件层面回读，但 candidate、inbox/history 和 `AGENTS.md` edge drift、
  served model/runtime/activation/exit unknown 使 current applicability 仍 uncertain。round 保持
  `behavior-observed / boundary-supported / adapt-and-retest / retain-incubation`；不重跑、不移动到
  `skills/`，只关闭当前 applicability/re-run 提案为 `no-proposal-now`。
- [`planning/records/evidence-applicability-review-practice-cycle-round-3.md`](records/evidence-applicability-review-practice-cycle-round-3.md)
  已完成 practice-cycle round 3 的 post-freeze source-edge applicability check：candidate/card/task/
  output/review 的历史 artifact edge 可回读，但 `AGENTS.md` project-instruction edge 已漂移；runtime
  identity、activation、schema、acceptance 和 adoption 仍 unknown。不新建 Run，不把 source-edge match
  写成 matched improvement。
- [`planning/records/evidence-applicability-review-planning-inbox-round-3.md`](records/evidence-applicability-review-planning-inbox-round-3.md)
  已建立 planning-inbox round 3 old/new comparison 的 post-freeze source/applicability projection：candidate/
  snapshot/fixture/input/output/event/review chain 可回读，但 runtime identity、activation、完整 prompt/
  harness/权限/隔离以及 current inbox source relation 仍 uncertain；`Hubble` 已独立复核 applicability record `final accept`，不新建 Run，不把
  `retain as project-local incubating candidate / adapt-and-observe` 写成 matched 或 portable acceptance。
- `planning/records/evidence-applicability-review-kb-representation.md` 又完成了
  `evals/kb-representation-evaluation/generated/recall-v1/activation.png` 的 bounded applicability
  check：历史 `experiments/...` 链已被观察，但与当前 PNG 的 exact lineage 未闭合，因此保持
  `historical-only / hold / archive-only / no-proposal-now`，不继承历史 probe，不创建新 Run。
- `planning/records/philosophy-reading-review.md` 已记录 P01/P03 的 Main source/nearest-neighbor review；
  `planning/records/philosophy-p02-reading-review.md` 已完成 P02 source/边界和 P01/P04/P03/P15/P08 最近邻的
  独立 review；P02 当前为 `retain-candidate / acceptance-pending`，不把调查资格写成拒答或 runtime gate。
  `planning/records/philosophy-p01-p02-p04-boundary-review.md` 又完成了同一对象上的 F1/F2/F3 fixtures，
  区分 source、证据性发言资格和 known/unknown；F3 仍是 future contract fixture，不是当前 authority。
  `planning/records/philosophy-p06-reading-review.md` 已完成 P06 source/边界独立 review；P06 当前为
  `retain-candidate / acceptance-pending`，其“删减”不取得预算、token、测试删除或 runtime 成本权。
  `planning/records/philosophy-p06-p11-boundary-review.md` 又完成 P06/P11 的 F1/F2/F3 独立 boundary review；
  同一候选机制关系的 F1→F2 条件性设计演化不代表 runtime object 状态迁移；P11 已形成
  `reading-candidate / independent-review-complete / research-open / acceptance-pending`，不把分析删减写成解决阶段成本规则；P11 仍未取得 reading acceptance。
  `planning/records/philosophy-p07-reading-review.md` 已完成 P07 source/边界独立 review；P07 当前为
  `retain-candidate / acceptance-pending`，其“入口”不取得任务拆分、主次、时机、速度/预算或
  runtime 调度权。
  `planning/records/philosophy-p07-p10-boundary-review.md` 又完成 P07/P10 的 F1/F2/F3 独立 boundary review；
  同一条候选 Binding expiry/revocation 关系的 F1→F2 条件性设计/standing 演化已固定，具体 Binding
  identity 仍 unknown；P10 已形成 `reading-candidate / independent-review-complete / research-open /
  acceptance-pending`，不把入口写成固定提前量或时机调度。
  `planning/records/philosophy-p08-reading-review.md` 已完成 P08 source/边界独立 review；P08 当前为
  `retain-candidate / acceptance-pending`，其“问题边界”不取得能力、权限、拒答、通信或 runtime
  scope 机制权。
  `planning/records/philosophy-p09-reading-review.md` 已完成 P09 source/边界独立 review；P09 当前为
  `retain-candidate / acceptance-pending`，其“主次”不取得全局 priority、任务排序、owner 路由、
  资源分配或 runtime scheduler 权。
  `planning/records/philosophy-p14-reading-review.md` 已完成 P14 source/边界独立 review；P14 当前为
  `retain-candidate / acceptance-pending`，其命名/表达不取得 glossary、命名委员会、canonical naming、
  权限、acceptance 或 runtime registry 权；`cellInput` 仍只是命名 observation。
  `planning/records/philosophy-p15-reading-review.md` 已完成 P15 source/边界独立 review；P15 当前为
  `source-bound / reading-candidate / independent-review-complete / acceptance-pending`。`practice-cycle`
  round-3 是真实 planning/design practice consumer，但行为证据上限仍为
  `behavior-observed / attribution-uncertain`，尚不支持 reading acceptance、matched 或 regression；新增
  `records/philosophy-p15-practice-use-case.md` 形成 P15-U1，已完成独立边界 review，但 use-case/reading 接受 owner
  仍 unknown，P16 继续保持 `cross-boundary-fixture-only`。
  `planning/records/philosophy-parent-review.md` 又完成了 scoped object identity、P01 source→P03
  observation 的独立 review 和固定对象四段案例；P01/P02/P03 保持 `retain-candidate`，父关系为
  `cross-relation-observed / acceptance-pending`，最终 acceptance 仍为 `unknown`，不把 candidate
  标成 accepted。
- `theory/philosophy/P04.md` 已形成第三个 reading candidate，并完成独立 source/边界 review；
  当前保持 `retain-candidate / acceptance-pending`。独立 review 要求把 unknown 的表达、回返
  方向、route/stop owner 与 acceptance owner 分开，不把 P04 变成拒答 gate 或流程条件。
- `planning/records/philosophy-p04-p15-p16-boundary-review.md` 已用同一 Binding immutability design claim
  建立 B1-B4 边界 fixtures，并完成独立 review；B2 的 object mismatch 已修正为 hypothetical host
  fixture。当前 boundary record 只支持 `design-boundary-observed`；P15 已由独立的
  `records/philosophy-p15-reading-review.md` 形成 source-bound reading candidate；P16 仍缺真实实践证据，但本轮已形成其 source-bound reading candidate。
- `planning/records/philosophy-remaining-reading-disposition.md` 又把 P12/P13/P16 的 source-bound reading candidate、下游
  `no-proposal-now`/`hold-cross-boundary-fixture-only` 与 reopen 条件写成同一处置记录；四项仍为
  `acceptance-pending`，不按覆盖率批量创建 strategy 或 runtime policy。
- `theory/philosophy/P05.md` 已形成第四个 reading candidate，并完成独立 source/边界 review；
  当前保持 `retain-candidate / acceptance-pending`。它只识别会改变分析的特殊条件，把具体处置
  交给下游 owner/protocol，不成为背景收集、任务排序或 runtime 规则。
- `planning/records/philosophy-p05-p07-p08-p09-boundary-review.md` 已在同一 Binding expiry/revocation
  design object 上建立 C1-C4，分别隔离 P05 特殊条件、P07 入手点、P08 问题范围和 P09 主次；
  已完成独立 review；P07/P08/P09 已各自形成 reading candidate 并完成独立 review，不产生 WorkCell
  实现授权。
- `planning/records/archive-skill-inventory.md` 已完成 archive skills 的初筛；已吸收项不重复迁移，
  `candidate-next` 才进入下一轮 source/consumer/boundary review。
- `planning/records/design-development-review.md` 已完成第一批设计/开发候选的初版 owner、最近邻、
  evidence standing、disposition 和回返条件；它没有把历史评估或文件存在误报成当前接受。
- `planning/records/project-cognition-disposition.md` 已将该 archive candidate 收敛为
  `no-proposal-now / archive-only`：当前没有 named later actor、重复 consumer、真实重建成本或
  item-ledger 之外的 decision delta；只有完整 reopen 关系出现时才重新审查，不创建第二 cognition
  projection 或 living carrier。
- `planning/records/philosophy-p01-p03-counterexample-fixture.md` 已补齐 P01/P03 父 item 的 A–D 成对边界：
  材料与规律、调查资格与 known/tested、观察改变下一实践与重复、检验手段/时点与下一认识改变；
  fixture-level 独立 review 已完成，但 reading acceptance、行为证据、named acceptance owner 和
  WorkCell/runtime authority 仍未成立。
- `mechanism-design-review` 已从 archive candidate 形成项目内 `.agents/skills/` candidate；其
  WorkCell planning probe 只支持低强度 `behavior-observed`，round 1 recommendation 保持一致，
  局部 `boundary-supported`；round-1 后已完成 `rewrite-applied` 的 carrier 收窄，明确
  `fixture-stipulated` consumer 不等于真实外部 consumer；本轮又完成了历史 ledger record 与 upstream
  source drift/recovery applicability review，仍不支持 matched improvement、portable、acceptance 或实现授权。
- `planning/records/work-estimation-evidence-closure.md` 将 F2 收窄为 source drift 检测与历史 record，而非
  current applicability closure；`evals/skill-evaluation/trial-ledger.md` 已追加 card/Run/isolation/
  outcome/process/review/disposition/stale-recovery 字段。三个 WorkCell upstream source 的 frozen/current
  hash drift 保持为 `stale/uncertain`，旧 card/Run/review 不倒写，未来需 recovered source、full identity、
  activation proof、protocol/record-retention/acceptance owner 和新 card。
- `planning/phase-1-exit-review.md` 已把上述 F2 结果重新投影到阶段出口：证据维护的 record/lineage
  只完成历史 ledger record，evidence-maintenance 仍为 `partial-closure`；`phase-complete` 仍为
  `not-established / continue`；append-only、immutable storage、runtime identity、source applicability、
  eval/ledger owner、candidate owner、protocol/record-retention owner、acceptance owner 和 named replay/consumer owner
  仍为 `unknown`；allowance、WorkCell 前置和实现冻结均不变，不预先推出 matched。
- `planning/records/method-skill-probe.md` 已用当前 planning/design review 做 `practice-cycle` 与
  `work-estimation` 的第一轮行为探针；两个项目内 candidate 已创建，但只有
  `format-valid` + `behavior-observed`，没有 portable 或 acceptance 结论。
- `planning/records/method-skill-probe-round-2.md` 已在 P01/P03 reading parent 上完成第二类 case 的内部
  baseline/treatment；独立 reviewer 已完成 standing review，但严格 card/runner identity 不完整，
  两者仍只有 `behavior-observed`，归因保持 `unknown`，处置为 `adapt-and-retest`。
- `planning/records/method-skill-probe-round-3.md` 已为 `practice-cycle` 冻结 core card，并在同一 frozen task
  上完成 baseline/treatment 与独立 review；Case A 保留反过度规划边界，Case B 出现 route/continue
  差异，但 runner、activation 和 output schema 不足以归因，当前为 `behavior-observed /
  attribution-uncertain / adapt-and-retest`，不产生 portable、acceptance 或实现授权。
- `planning/records/method-skill-probe-round-4-precondition-review.md` 已将 A4 的下一项最小实践收敛为
  owner-return：先取得 named eval/runner owner、可核验 identity、activation proof 和统一 schema，
  再决定是否开新 frozen card；当前不启动新 Run，不以重复次数制造 matched 归因。
- `planning/records/next-candidate-review.md` 已完成第二批 tooling、environment、task-shaping 和
  systems-engineering 候选的初版分层；本轮 `records/agent-tooling-disposition.md` 又确认当前 planning
  没有其真实 tooling consumer，因此本 branch 收敛为 `no-proposal-now / archive-only`，其余依赖
  后续 consumer，不提前迁移。
- `attention-management` 的 archive candidate 又经过一次 bounded applicability check：当前只有一次
  scope correction，没有第二个独立 drift 实例或 attention-specific 对照；`plan`/`item-ledger`、
  `practice-cycle`、`agent-delegation` 与 `planning-inbox` 已拥有相邻判断，因此收敛为
  `no-proposal-now / archive-only`，不创建 living carrier、Run 或 portable move。
- `theory/harness/iterative-improvement.md` 的静态语义已接受，但行为 standing 保持
  `adapt-and-retest`；本轮已经在 WorkCell 开放关系与 P01/P03 方法探针上形成多份可回读的
  planning round，但尚未形成严格归因、独立接受或采用后回归证据，不能以文档完整度宣称收敛。
- 候选 skill 能覆盖后续 Work Cell 设计所需的需求确认、设计表达、文档、开发、测试、验证
  和改进判断；具体是否足以接受，由后续 review 决定。
- 对无价值、重复、依赖旧 runtime 或无法形成稳定边界的材料，保留“不迁移”的理由，不为
  填目录而复制。

</details>

### 有限下一阶段澄清条件（不是 phase complete）

在正式进入 Work Cell 设计评审、或把 phase 1 标记为 complete 之前，当前 plan 只允许在以下
四项条件具备时进行有限的 WorkCell design clarification：

- 一份可回读的迁移清单和 source/standing 关系；
- 设计开发 skills 的初版边界、最近邻和使用方式；
- 明确哪些仍是 candidate、哪些已经可以作为当前设计的工作方法；
- 没有把 skill 格式通过、一次成功或文档搬运误报成行为接受。

这些条件形成的是 `bounded-next-stage-clarification allowance` candidate，不是已接受的正式
阶段转换。它只允许 source/standing review、设计反例、fixture contract 和有限 semantic review；
不授权 WorkCell protocol acceptance、adapter、executor、eval Run 或 base/runtime 实现。

### phase 1 status: not-established

当前未成立。P01–P16 的 work-package map 已形成，16 个均有 reading candidate，其中 P12/P13/P16
的 reading review/acceptance 仍 pending；下游 strategy/practice 仍按显式处置保持 no-proposal/hold。但 package 与父关系尚未达到 phase-level closure，至少一个有真实
接受关系的迭代闭环，以及阶段 owner/acceptance owner 的关闭决定仍未形成。
因此可以做有限 WorkCell 澄清，但不能在 roadmap、ledger 或 goal 中写 `phase 1 complete`；正式
进入下一阶段仍需明确 owner/decision。

## 后续阶段：Work Cell 协议设计评审

本阶段的对象是 `design/work-cell-protocol.md`。它承接当前对 0.5 Work Cell、`CellInput`、
Vercel AI SDK/Pi 与 DeepSeek Harness 的讨论，但只形成下一版协议候选，不把历史实现直接
迁入 living tree。

前置条件：当前阶段取得明确的 accepted exit/phase transition；若前置条件未满足，只能进行
上节限定的有限设计澄清，不能宣称进入正式 Work Cell 设计阶段或 Work Cell 已完成。

因此本节保留的是 WorkCell 的设计候选和可审查路径，不是当前打开的执行队列；当前是否打开下一条
bounded wave 仍以 [`item-ledger.md`](item-ledger.md) 的 checkpoint/执行面为准。此前的
[`research-settlement-wave-2026-08-26.md`](records/research-settlement-wave-2026-08-26.md) 已完成并关闭；
`long-horizon-continuity-design-readiness-preparation` 也已按 direct、内部顺序完成并关闭，只更新既有设计
record 的 action probe、candidate boundary 和 trial-input contract，未执行 Run；随后
`research-surface-settlement-reconciliation` 也已完成并关闭，只收敛既有 research record 的 settlement
destination、reopen 条件和 current projection，未创建新 research item 或 Run。当前没有已打开的 wave 或
sibling wave；这不等于整个 planning goal blocked。

### WorkCell 当前 standing

- 阶段：设计候选评审
- consumer：用户已明确为 harness 测试、部分 delegation、主/子模型和 provider/channel 对照
- owner：实验 consumer 已命名；protocol acceptance、core implementation 和 semantic acceptance owner 仍需分别确认
- priority：未指定
- scope：Work Cell core protocol、host binding、core API、运行记录、harness 对照边界，以及一个隔离的 experimental slice
- 不包含：完整 base/runtime、DeepSeek 工作系统、provider 选型结论、语义 acceptance、自动 retry 策略；adapter/provider 必须基于 core API，不进入 core

### 2026-08-26：WorkCell 真实 harness-test consumer 与实现顺序

用户明确说明 WorkCell 实现的用途：把它作为 harness 测试边界，承载部分 delegation、主/子模型测试，
以及 Kimi Code Plan、OpenCode Go、开源模型等不同模型或执行渠道的比较。这一 consumer 使 WorkCell
从纯设计对象变成当前 planning 的真实 design-validation / experimental consumer，但不自动取得
canonical protocol acceptance。

实现顺序调整为（先设计实践，后冻结 API）：

```text
design rehearsal：真实场景 + 工具准备 + Todo/work-map + 设身处地 + 回落修剪
  → minimum core contract freeze
  → deterministic executor + core API + record/evidence path
  → 基于同一 core API 接入第一个现实 adapter
  → direct/delegated 与 model/provider bounded comparison
  → independent review / bounded adoption
  → owner-backed canonical core acceptance 与正式实现决策
```

这里的 experimental slice 与正式 WorkCell core 分开：slice 可以用于发现协议问题和产生真实 Run/Evidence，
但不把一次可运行实现写成 protocol acceptance、DeepSeek Harness 选型或生产 runtime。core API 负责
admission、bounded execution context、effect boundary、typed event、execution return、cancel 和
record/evidence handoff；各 adapter/provider 基于该 API 实现自己的 session、模型调用和工具循环，不能
通过 provider-specific shortcut 改变 core 生命周期、权限或验收语义。具体账号/订阅/本地模型接口需在
adapter 环境检查中逐项确认，不能从产品名称推断兼容性。

当前 design-practice wave 已完成并经独立 review；现在暂停在 user design review。该 wave 使用可回退的 fixture、
纸面 contract 和必要的 disposable/mock executor，回执已说明哪些理论关系实际改变了设计、哪些字段/机制被修剪、
哪些 unknown 仍保留，以及工具是否值得保留。只有 user review 形成 decision delta 后，才把仍承重的内容压成短 owner decision package：experimental slice 是否可作为 consumer、首阶段 host/workspace
隔离、RunRecord identity/evidence retention、comparison 固定变量/允许差异，以及 failure/cancel/unknown
和停止边界。决定前不实现完整 base、DeepSeek system 或 provider selector；非关键 unknown 可在 slice 中
结构化保留并事后纠偏。详细边界见 [`records/workcell-harness-test-implementation-plan.md`](records/workcell-harness-test-implementation-plan.md)。

### 不确定因素处理结果

本轮不把所有“尚未决定”混成一个列表，而按是否能由当前协议来源收敛来处理。

#### 当前保留的设计候选基线

- 当前保留的候选边界为 `WorkCellSpec → WorkCellBinding → WorkCellRunRequest → WorkCellRun →
  WorkCellRunRecord`；`CellInput` 只保留为迁移 adapter 的 legacy handle，尚非协议接受后的 canonical
  边界。
- Binding 在 admission 阶段由 host 物化，运行期间不可变；Spec 不授予 workspace、tool、command、
  network 或 secret effect。
- `WorkCellRun` 是 coordinator 内部生命周期对象；公共观察面是类型化 Event 与 RunRecord。
- `WorkCellRun.state` 只表达公共执行生命周期；`recording` 不再是公共状态，终态后的 RunRecord
  finalization 是 coordinator 的局部过程。该简化仍是 design-candidate，record availability、cutoff、
  late effect、retention/correction 与 owner decision 保持 unknown。
- `WorkCellRunRequest.parent.relation` 当前只保留 `retry-of` / `continued-from`；generic Task/WorkItem
  derivation 不进入 WorkCell core。该简化仍是 design-candidate，parent retention、错误 relation、missing-parent
  unknown、lineage authority 与 owner decision 保持未决。
- completion actions 可以有多个，但分别按 `required` / `maxCalls` 机械检查，不隐含顺序或事务性。
- `Attempt` 不进入 Work Cell core；调度层候选使用 `WorkItem`、`WorkLease`、`AttemptOutcome`；
  `WorkLease` 的 issuer、consumer 和 authority 当前均 `unknown`，不等于 WorkCellBinding 授权。
- v1 不原地恢复 provider session；继续执行或 retry 都建立新 run，分别用
  `continued-from` 或 `retry-of` 关联。
- semantic review、acceptance 和 provider 优选不由 Work Cell core 偷带决定。

这些是当前设计 baseline，不等于协议已经被最终接受；后续若要改变它们，必须给出具体反例、
owner 或新证据，而不是因为某个 adapter 方便就改变核心语义。

#### 保留为明确的外部未知

| 未知 | 当前 standing | 回返条件 | 可能的真实 owner |
| --- | --- | --- | --- |
| 正式 owner、priority、acceptance owner | `unknown` / 未指定 | 用户或真实 goal/Plan owner 明确授权、排序和接受关系 | unknown |
| `RunRequest.spec` inline/reference、不可变 artifact 与 registry 的关系 | design choice open；spec identity review `independent-review-complete / acceptance-pending` | 确定跨进程部署、artifact/registry 生命周期、digest、retention 与 invalid-reference 约束 | protocol/record owner；具体 owner unknown |
| `CommandGrant.argumentShape` 与 argv policy | security boundary open；[`records/workcell-command-grant-boundary-review.md`](records/workcell-command-grant-boundary-review.md) 已完成 planning boundary review | host/security owner 决定 grant、argv/shell policy 和 host effect boundary；protocol/record/evidence owner 决定 actual call/observation、failure/standing 与 retention；C1–C4 反例已形成，但 canonical shape 与安全接受仍未知 | host/security、protocol/record/evidence、acceptance owner 均未命名 |
| semantic review 的 rubric、载体和 reviewer authority | acceptance boundary open；[`records/workcell-semantic-review-boundary-review.md`](records/workcell-semantic-review-boundary-review.md) 已完成 planning boundary review | semantic-review/rubric owner、protocol/record/evidence owner 与 Principal/acceptance owner 分别决定 subject/snapshot、rubric、structured findings、blocked/correction/supersession、basis、authority 和拒绝/延期关系；review complete 不等于 accepted | semantic-review/rubric、protocol/record/evidence、Principal/acceptance owner 均未命名 |
| DeepSeek Harness 与 Vercel AI SDK/Pi 的相对效果 | empirical unknown | 冻结同合同 fixture，完成对照 Run 和 evidence review | eval/evidence owner |

在回返条件满足前，这些项保持 `unknown`、`open` 或 `candidate`，不改写成实现任务；没有
真实 owner 时不填写推测性姓名或团队。

本轮机制审查进一步把 WorkCell 的四个开放 sub-item 投影到
[`item-ledger.md`](item-ledger.md)：“bounded drain / unknown effect”、“active Binding
expiry / revocation”、“Event 顺序/去重/重放”和“retry/continue lineage 恢复”。它们的
owner 仍是 host/security、protocol、record/evidence 等 owner 类别，不是已确认的具体人；在
取得反例和可检验证据前，只允许设计判断，不产生实现授权。
四项的有限回返计划见 [`records/workcell-open-relations-review.md`](records/workcell-open-relations-review.md)，
该文件只定义 fixture、比较空间和退出条件，不改变上述 standing。
该父 projection 已在 A/B/C/D 子记录完成后重新对齐；当前仅表示
`projection-reconciled / source-applicability-uncertain`，不表示旧 review 已适用于当前 protocol
wording，也不表示 protocol acceptance。
本轮对 A/B 的具体回返见 [`records/workcell-lifecycle-review.md`](records/workcell-lifecycle-review.md)：它确认
了 cutoff、迟到 effect、active revocation 和 RunRecord binding identity 的结构性缺口，但没有
选择 host policy、补 canonical 字段或产生实现授权。
本轮对 C/D 的具体回返见 [`records/workcell-observation-lineage-review.md`](records/workcell-observation-lineage-review.md)：
独立 review 已完成；在没有真实 replay/recovery consumer 前，保留 Event 观察面和 RunRecord/保留
关系作为候选事实/因果来源，缺失事实诚实返回 unknown，不创建 event bus、lineage registry 或
session resume。D 仍为 `retain-unknown / route-to-owner`；C 仍为 `retain-unknown`，但 replay 机制
当前 `no-proposal-now-for-replay / route-to-owner`，不构成 protocol acceptance。
父记录的本次 reconciliation 由 `Lagrange` 独立复读接受；该 review 只接受 lineage/bookkeeping，
不取得 source applicability、owner assignment、DeepSeek design 或实现授权。

#### 移出当前 Work Cell 评审范围

以下不是当前协议设计的 blocker，应继续留在 roadmap 层：

- 1+N 基座具体有哪些模块；
- DeepSeek Harness 是基座 carrier 还是 kernel；
- 基座与软件层如何整合；
- 实时多来源、无 compact、todo 轮询并发和双向输出的完整 runtime 语义。

它们可以使用 Work Cell 作为候选执行边界，但不能反向要求 Work Cell core 现在替它们作出
架构决定。

### 评审顺序

按以下顺序逐层收窄；每一步都只修改设计或留下待决定项，不开始基座实现：

1. **概念和命名。** [`planning/records/workcell-naming-review.md`](records/workcell-naming-review.md) 已完成一轮
   bounded naming review 和独立 review，当前仍待命名接受；以名称和 owner baseline 做反例审查，只有
   发现最近邻误判时才修改 `Spec`、`Binding`、`RunRequest`、`Run`、`RunRecord`、`Evidence`、
   `MechanicalCheck`、`SemanticReview`、`AcceptanceDecision` 的边界。
2. **协议形状。** 评审 Spec、CompletionContract、WorkspaceScope、ResourceLimits、
   RunRequest 和 RunRecord 的字段语义、Binding identity 载体、digest source/format/target/owner/retention、
   snapshot retention、reference correction、late observation、lineage retention、版本边界与
   unknown/unavailable 表达；当前 canonical protocol/record contract 是 design consumer，bounded review 为
   `candidate-proposal / independent-review-complete / acceptance-pending`，B4 仅是 design/auditability
   hypothesis；retry/continue 可复用父 Binding，`bindingRef` 不承担 lineage；上述 digest 与四类 record
   retention/correction/late-observation/lineage 关系均为独立 unknown；本 review 不产生 protocol
   acceptance、registry、runtime 或 implementation authorization。详见 [`records/workcell-record-boundary-review.md`](records/workcell-record-boundary-review.md)。
   另有 [`records/workcell-contract-field-boundary-review.md`](records/workcell-contract-field-boundary-review.md) 审查
   declaration/grant/call/observation/record/check/review/acceptance 的字段权威；当前为
   `reuse-existing-owners + rewrite-candidate / independent-review-complete / acceptance-pending`，
   `CompletionActionCall`、`CompletionActionObservation`、`EffectSummary`、`UsageObservation` 等
   承重类型仍未取得 canonical shape；CompletionAction、EffectSummary 与 UsageObservation 已分别形成
   窄候选并完成独立 review，但不新增 registry、gate、runtime 或 acceptance authority。
3. **效果与生命周期。** 评审 host-owned workspace/tool/effect boundary、单 writer、取消、
   draining、部分效果、失败和新 run retry 的因果关系。
4. **调度边界。** 确认 WorkItem、WorkLease、AttemptOutcome、ExecutionCoordinator 与
   WorkCell 的责任，不把调度、任务树或语义计划塞回 Cell core。
5. **适配和评估。** 确认 Vercel AI SDK/Pi、DeepSeek Harness、deterministic executor
   是否能共享同一 WorkCell contract；再决定 eval fixture、controlled variables 和
   evidence standing。
6. **形成接受条件。** 只处理上面列出的真实外部未知和反例；把已解决项、仍未知项、owner、
   evidence 和 revisit condition 分开记录。只有明确接受协议并单独授权后，才建立 implementation
   plan。

### 本阶段出口

至少需要能证明：

- 删除 provider 字段后，Spec 仍可表达完整 bounded work；
- Spec 本身不能授予 host effect；
- execution state、mechanical check、semantic review、acceptance decision 不会互相冒充；
- executor 失败但留下 workspace effect 时，RunRecord 能保留事实；
- Vercel AI SDK/Pi 和 DeepSeek Harness 可以作为替换 executor 进行同合同比较；
- 取消、未知效果、重试和版本升级都有明确语义；
- 没有通过自由文本、regex 或固定短语改变权限、路由、完成或验收。
- 已收敛基线和仍开放未知在文档中可逐项对应，不存在只有“待定”而没有 owner/return condition
  的悬空项。

若这些条件未满足，保留在设计评审或 hold，不将未决项写成实现任务。

### 评审之后才进入的候选工作

以下只是假设性后续去向，不是当前授权：

- `experiments/`：deterministic host、协议 adapter 或 executor 原型；
- `evals/`：fixture、trial protocol、Run、review 和 evidence ledger；
- base implementation：经协议接受后另建 bounded implementation plan；
- provider 选择：基于同合同评估结果另行决定，不由历史 0.5 driver 自动继承。

## 后续阶段：DeepSeek Harness 工作系统设计

这不是 Work Cell 的扩展字段，而是建立在 Work Cell 之上的系统设计阶段。其目标是把用户
提出的 harness 方向形成可审查的系统候选，至少处理：

- 单一主 Agent 与 Agent team 的身份、边界和选择关系；
- 单一会话、实时记忆、聊天记录和是否 compact 的明确策略；
- 长时执行的核心问题先收窄为 [`long-horizon-agent-forgetting-design.md`](records/long-horizon-agent-forgetting-design.md)
  的 `task continuity relation`：当前会话优先复用 work map/focus anchor；跨重启、崩溃、不可信调用的持久
  恢复才进入 base/runtime 机制候选；`no compact`、chat history、memory 和 notification 都不能单独充当语义答案；
- 以通知为统一输入机制时，多来源输入的来源、顺序、优先级和回执；
- todo 轮询并发的任务身份、claim、取消、失败和恢复语义；
- 类似 GPT Live 的即时双向对话，以及两侧输出的隔离、投影和后续动作影响；
- Work Cell 的调度、workspace/effect、evidence 和 acceptance 如何接入系统；
- DeepSeek Harness 在系统中是 provider/session substrate、执行内核还是可替换 adapter；
- compact、记忆重建、并发、断线和恢复时的持久身份与重复效果边界。

本阶段的输出是工作系统设计文档、关键协议和设计评审材料，不是 DeepSeek Harness 代码。
它必须明确哪些是系统不变量、哪些是可替换策略、哪些仍是 experiment candidate。

### 工作系统设计出口

- Work Cell 与系统层的责任不重叠；系统不会通过自然语言或隐式 session 状态绕过 Cell Binding；
- 输入、记忆、会话、todo、输出、并发、取消和恢复都有明确对象与 owner；
- 单主 Agent / team、compact/no-compact、通知来源和双侧输出等分支有可比较的设计选择；
- 没有把“类似人类意识/即时对话”直接写成未经验证的 runtime 保证；
- 设计评审能明确给出 implementation scope、未知、证据要求和 acceptance owner。

## 后置阶段：设计接受后的实现与构想承载

只有 Work Cell 设计和 DeepSeek Harness 工作系统设计都通过明确评审，才创建独立的实现
计划。实现计划至少拆成：

1. Work Cell host/coordinator、协议记录和 deterministic test surface；
2. DeepSeek Harness 工作系统的最小运行时和 adapter；
3. 受控的系统级 eval/实验支撑；
4. 在系统上逐个实现用户的 harness 构想，并为每个构想区分 core、experiment、eval 和
   acceptance。

这四步都不由当前 plan 直接授权；当前只确定它们的先后关系和设计门槛。

## 当前未闭合的 plan gates

本节只列 pre-implementation 仍未闭合的门；item 级 standing 和回返条件以当前
[`item-ledger.md`](item-ledger.md) 及对应 canonical record 为准：

- `phase-complete` 尚未成立；P01–P16 的 reading follow-up/acceptance、父关系和真实接受迭代
  仍按 [`phase-1-exit-review.md`](phase-1-exit-review.md) 管理。
- archive migration 与设计/开发 methods 当前均是 `done-for-now`、`retain-incubation` 或
  `waiting-for-consumer`；不因文件数量批量迁移，不创建 portable 镜像。
- WorkCell 当前为 `paused-by-priority / design-review-deferred / implementation-not-authorized`；只在
  当前 workflow/structure checkpoint 满足 reopen 条件后重新打开 design review，不开始 base、executor、
  runtime 或 eval Run。
- DeepSeek Harness 工作系统仍等待 WorkCell design acceptance；系统设计、实现与用户 harness
  构想均不由本 plan 直接授权。

<details>
<summary>展开 plan gate 的证据索引</summary>

- 哲学序列（16 条）已落源；当前 16 个 source-bound reading candidate 文件均存在，其中 P12/P13/P16 的初轮 reading review 已完成并完成条件性最小修订，修订后 follow-up clean、acceptance 仍 pending。P12/P13 下游 strategy 仍为 `no-proposal-now`，P16 下游 adoption/time-window 实践仍为 `hold-cross-boundary-fixture-only`；不能把 16 个 candidate 写成 16 个 accepted reading。旧解读在 `archive/principles/interpretations/`，下游 strategy/runtime 仍只在各自 reopen 条件成立后形成。
- 后续只有在脱离本仓库事实仍有真实 consumer、边界与相称验证时，才把单个候选 move/promote
  到 `skills/`；当前 8 个既有 skill 的逐项 review 已完成，`practice-cycle`、`work-estimation`
  与 `mechanism-design-review` 保持 project-local candidate，其他候选仍按 item ledger 逐项
  判断，不为填目录复制正文。
- 第一批设计/开发候选已完成初版 review，记录在 `planning/records/design-development-review.md`；本轮
  已用真实 WorkCell planning/design case 形成三个窄方法 candidate，其中
  `mechanism-design-review` 已有项目内载体且完成 round-1 后的窄 carrier rewrite，下一步仍是补 named
  replay consumer、owner-backed fixture、可重建 runner identity 和独立 review，不是批量迁移正文。WorkCell
  四项开放关系的有限回返计划已单独登记，但不提前授权实现。
- 第二批 archive 候选已完成初版 review，记录在 `planning/records/next-candidate-review.md`；当前不触发
  用户环境 setup，不把 task-shaping 或 systems-engineering 提前变成 WorkCell/runtime 机制。
- PL-11“概念碎片式输出”已形成 source-bound candidate definition，记录在
  `planning/records/concept-fragment-output-disposition.md`；当前只定义外显输出对象、最近邻和未来 card 入口，
  不启动 experiment/eval Run，不推断内部思维。PL-12 已完成七对象 definition review，但继续等待
  PL-11 的 accepted observable object、真实 experiment/eval consumer、独立变量与接受关系。
- 全局 coverage audit 已完成，记录在 `planning/index/coverage-audit.md`；16 个 reading candidate 的 `最近邻` 声明去重后形成 55 对关系面，现有专门 parent/boundary fixture 覆盖 17 对，38 对尚无
  专门 fixture，其中 P03/P15/P16 已由 Pair D 与 P15-U1 交叉承载；这不是 38 个自动打开的 review
  任务，只有 decision delta 且现有证据无法承载时才开最小 parent fixture。P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 已形成 candidate
  draft 并完成各自 source/边界独立 review，P01/P03 完成父关系中间 review，P05/P07/P08/P09 已形成并完成独立 review 的关系 fixture；P12/P13/P16 已形成 source-bound candidate，初轮 reading review 已完成并完成条件性最小修订，修订后 follow-up clean，下游 P12/P13 strategy 仍为
  `no-proposal-now`，P16 adoption/time-window 实践仍为 `hold-cross-boundary-fixture-only`；P01–P16 的
  reading acceptance、父 item 的全部 cross-relation 和一个有真实接受关系的迭代 round 仍未完成，不能把
  phase 1 标成 complete。

从 `archive/` 解构吸收（archive 保留，活树产出重写）：

- `archive/design/harness/` 等 → 已重写为 `theory/harness/theory.md`（吸收记录 `theory/research/agent-theory-absorption.md`）
- 仍约束下一版的成形文件 → `design/`；其余留在 `archive/design/`
- `archive/principles/research/` 等 → `theory/research/`（吸收式，非搬运）
- 可移植 skills：`archive/skills/` → `skills/`（吸收式重写；先在 `.agents/skills/` 孵化并验证，再判断是否可移植）
- 本项目 skills → `.agents/skills/`

</details>

### 历史回返索引（默认折叠）

以下 dated projection 保留每轮观察、修订、review 和 lineage，便于追溯；它们不拥有当前
standing，也不覆盖 `item-ledger.md`、canonical source 或 child record。当前先读本文件的主序列、
阶段出口，再按需要展开历史回返。

<details>
<summary>展开 2026-08-25 dated projections</summary>

### 2026-08-25 current projection：代码方法候选

`code-review` 与 `structural-refactoring` 的当前处置已单独记录在
[`records/development-method-candidate-disposition.md`](records/development-method-candidate-disposition.md)：二者
仍是 archive-backed `candidate-next`，当前分别 `activation-deferred` / `implementation-gated`，
而不是 living skill 或 portable candidate。因当前没有 accepted-intent code diff 或真实
behavior-preserving refactor，不创建 carrier、不制造验证性实现；只有真实 consumer、accepted
contract、相称正反例、独立 review 和外部 acceptance 出现后才 reopen。该投影不改变 WorkCell、
DeepSeek Harness 或 base/runtime 的实现冻结。

### 2026-08-25 current projection：WorkCell design source applicability

[`records/evidence-applicability-review-workcell-design.md`](records/evidence-applicability-review-workcell-design.md) 已建立
当前 protocol 与既有 WorkCell review 的 source-edge reconciliation：A/B/C/D 的 frozen source edge
发生 drift，当前适用性保持 `uncertain`；RunRecord binding identity 与 contract-field review 的
旧 protocol edge 曾 match，但随着 executor wording revision 已成为 pre-revision edge。新增
[`records/evidence-applicability-review-workcell-design-revision-2.md`](records/evidence-applicability-review-workcell-design-revision-2.md)
追踪当前 source；不重跑、不产生 WorkCell acceptance 或实现授权。原 applicability record 的
`Hubble` `final accept` 只覆盖旧 source bookkeeping，revision-2 的 current-source review 另行完成。

### 2026-08-25 current projection：CompletionAction contract candidate

[`records/workcell-completion-action-contract-review.md`](records/workcell-completion-action-contract-review.md) 已将
`CompletionActionCall`/`CompletionActionObservation` 从宽泛 field-boundary unknown 中拆成一项窄
design candidate：明确 live submit 与 execution return 的 logical-call reconciliation，显式表达
identity/input unavailable，并让 `maxCalls`/schema validity 留在 MechanicalCheck。`Hubble` 独立 review
`final accept` 仅覆盖候选记录；canonical protocol、Effect/Usage、replay/lineage、acceptance 和实现
仍未开放。

### 2026-08-25 current projection：EffectSummary / EffectObservation contract candidate

[`records/workcell-effect-summary-contract-review.md`](records/workcell-effect-summary-contract-review.md) 已将 effect
字段从宽泛 unknown 中拆成一项窄 design candidate：保持 `EffectSummary` 为 run-bound fact projection，
以 `source`、`effectRef`、`phase`、`outcome`、`confirmation` 和结构化 unavailable reason 区分 host
authority、局部 report 与未知事实。`state: observed` 只表示 observation envelope 可用，不等于 effect
outcome confirmed；`Hubble` 独立 review `accept` 仅覆盖候选记录。取消未知、executor failure 后的
workspace effect、retry child、空 observation 与 late evidence 均保留 honest unknown；canonical protocol、
effect-specific payload、Usage、security policy、retention、runtime、DeepSeek Harness 和实现仍未开放。

### 2026-08-25 current projection：UsageObservation contract candidate

[`records/workcell-usage-observation-contract-review.md`](records/workcell-usage-observation-contract-review.md) 已将 usage
字段从宽泛 unknown 中拆成一项窄 design candidate：以 `UsageMetricProvenance` 显式约束 run/host 与
provider-report/executor-adapter 的 source/scope 关系，以 `measurement`、zero、unavailable kind 和
evidence 区分实际使用事实；`ResourceLimits` 与 `resource-limit` `MechanicalCheck` 保持正交。`Hubble`
两轮独立 review 后 `accept` 仅覆盖候选记录；canonical protocol、meter/billing、enforcement、
retention、DeepSeek Harness 和实现仍未开放。

### 2026-08-25 current projection：observation / record integration review

[`records/workcell-observation-record-integration-review.md`](records/workcell-observation-record-integration-review.md) 对
CompletionAction、EffectSummary、UsageObservation 三个窄候选与 `ExecutionOutcome`、`MechanicalCheck`、
`EvidenceRef` 的跨字段组合做了 practice-cycle 回返，并由 `Hubble` 独立 review `accept`。当前唯一
安全的跨字段 join 是 `runId`；call/effect/usage/check identity、source、unknown、retry lineage 和
late evidence 不互相冒充。该结果 route 给真实 protocol/record/acceptance owner，不再继续盲目增加
字段或机制；WorkCell、DeepSeek Harness 和实现仍未开放。

### 2026-08-25 current projection：attention-management applicability return

`attention-management` 的独立判断是恢复 decision boundary 上的 governing relation；当前 evidence
只证明一次 scope 偏窄修正，不证明重复行为差距。历史 H2 semantic result 已由 post-run audit 判为
不可归因的 false positive，不能升格为当前行为证据。现有 planning owner 已分别承载 scope、下一实践、
delegation 与 active-goal input/回返，因此当前为 `no-proposal-now / archive-only`。只有第二个独立
drift 实例，或 `switch` 与 `retain/return` 的区分在现有 owner 中缺失且改变下一行动时，才 reopen；
WorkCell、DeepSeek Harness 和实现冻结不变。

### 2026-08-25 current projection：P15-U1 practice use-case

[`records/philosophy-p15-practice-use-case.md`](records/philosophy-p15-practice-use-case.md) 将 round-3 Case A/B/C 收窄为
一个 source-bound P15 use case：Case A 是不制造循环的一步修正负触发，Case B 是 action/disposition 改变的
正触发，B1–B4 是不构成真实实践的最近非实例。`Goodall` 独立 review 后，U1 当前为
`use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；它只保留
`behavior-observed / attribution-uncertain`，不产生 P15 reading acceptance、matched/regression、P16
evidence、WorkCell/DeepSeek acceptance 或实现授权。下一 return 是 named reading/use-case acceptance owner
与相称的边界实践；若 U1 不能改变实际判断，则回修或关闭 proposal。

### 2026-08-25 current projection：WorkCell RunRecord identity readiness clarification

`records/workcell-design-acceptance-readiness.md` 将 RunRecord identity 的 owner-return 收窄为两个可比较选项：
显式 `RunRecord.bindingRef`，或等强度、可独立索引且能使 RunRecord 指向 admission Binding identity 的
结构化 record projection。若不加字段，必须另行说明 request/evidence retention、digest、snapshot
correction 和 structured `unknown`；不得复制完整 Binding 或新增 registry。该 readiness wording 不修改
canonical protocol，只有 owner acceptance 后才可决定是否回写 canonical shape；`bindingRef` acceptance、
retention、security、WorkCell protocol acceptance 和实现授权仍未知/冻结。

### 2026-08-25 current projection：WorkCell spec identity boundary

[`records/workcell-spec-identity-boundary-review.md`](records/workcell-spec-identity-boundary-review.md) 将 `WorkCellRunRequest.spec`
的 inline/reference 与 RunRecord 的 Spec identity 投影拆成独立 bounded review：`requestId` 是启动消息
identity，`runId` 是执行 identity，`bindingRef` 是 admission Binding identity，不能互相冒充 Spec identity。
当前最小候选是保留两种传输形态，并由 protocol/record owner 选择一个可结构化关联、在约定保留范围内
支持恢复或比较所采用 Spec 的 record projection；是否需要独立索引由真实 consumer 决定。digest
canonicalization、spec artifact/request/RunRecord retention、correction、invalid-reference 和 registry
authority 仍是独立 unknown。`McClintock` 已独立复核并要求、确认上述边界修订；该 review 不改 canonical
protocol、不创建 registry/runtime fetch、不复制完整 Spec，也不取得 WorkCell、DeepSeek Harness 或实现
授权；下一 return 是 named spec/protocol/record consumer 或 owner-backed decision。

### 2026-08-25 current projection：work-estimation candidate review

[`records/work-estimation-candidate-review.md`](records/work-estimation-candidate-review.md) 将刚完成的 WorkCell Spec identity
回返作为一个 project-local planning self-application，比较了继续堆 WorkCell 字段、提前设计 DeepSeek、
启动不可归因 matched round、继续 Stage A 方法形成和重开历史 evidence。`work-estimation` 只提供 branch、
dependency、discovery 和粒度比较，Main/planning authority 才选择下一 standing/branch。当前只支持
Main-produced `behavior-observed / attribution-uncertain`；`Meitner` 已独立复读该 review 为 `accept`；carrier 总体继续 `retain-incubation /
adapt-and-retest`，但该 WorkCell case 不能算 named consumer evidence，当前处置为
`no-proposal-now`（仅关闭当前 Main-only case，不影响 carrier 总体 incubation）。不支持估算准确性、portable promotion、acceptance
或实现授权；没有 named consumer 且不改变下一决策时关闭同类 Main-only probe。

### 2026-08-25 current projection：Round 1 meta-matched evidence closure

[`records/evidence-applicability-review-round-1-meta-matched.md`](records/evidence-applicability-review-round-1-meta-matched.md) 将旧
Round 1 F1 的 baseline/treatment/review 标为历史链：`theory/philosophy.md` 仍 hash match，但
`gene-expression` 已 source drift，旧 `theory/harness.md` 已路径迁移，fixture/protocol/candidate/activation/
runtime identity 不能完整回建，且没有 trial-ledger entry。当前适用性为 `uncertain`，历史 round 的
`boundary-supported / no-proposal` 不得转成 current matched、portable 或接受；`skill-formation` 仍为
`.agents/skills/` incubation。该 projection 不修改旧 artifact、不重跑、不移动、不改变 phase、WorkCell、
DeepSeek 或实现 standing；下一 return 是 named consumer/owner、current frozen card 和可重建运行关系。

### 2026-08-25 current projection：文档迁移状态 reconciliation

[`records/document-migration-status-reconciliation.md`](records/document-migration-status-reconciliation.md) 已核对 reading
artifact 与当前处置：P01–P11、P14、P15 共 13 个 source-bound reading candidate 文件存在；P12/P13
保持 `no-proposal-now`，P16 保持 `hold-cross-boundary-fixture-only`，因此三者不创建 reading 文件。
本轮纠正 `plan.md` 与 `theory/research/theory-structure.md` 的 stale summary，确认
`theory/harness/theory.md` 是当前 canonical path，并同步 P04/P05 reading artifact 的
`independent-review-complete` standing；不改变 source、reading acceptance、phase-complete、WorkCell、
DeepSeek Harness 或实现冻结。下一 return 是 source/standing/reopen 条件真实变化时再做
相称 reconciliation，不为目录数量补文档。

### 2026-08-25 current projection：P01/P03 artifact standing reconciliation

全量回读发现 P01/P03 reading 文件顶层仍只有 `reading-candidate`，而其 source/边界与父关系 review 及
planning projections 已是 `independent-review-complete / acceptance-pending`。本轮只同步两个 artifact
的 standing；不改变哲学 source、P01/P03 定义、父关系 acceptance、phase-complete、WorkCell、DeepSeek
Harness 或实现冻结。该 round 已由 `Chandrasekhar` 独立复核并 `accept`，仅接受 artifact bookkeeping；
仍不取得 reading/父关系 acceptance、
phase transition、WorkCell、DeepSeek Harness 或实现授权。

### 2026-08-25 current projection：WorkCell executor comparability boundary

[`records/workcell-executor-comparability-review.md`](records/workcell-executor-comparability-review.md) 回读到一个会影响
未来 harness 对照的窄设计歧义：`WorkCellBinding` 完整类型含 `executor`，而 protocol §11.1/§18.2
同时使用“同一个完整 Binding”和“只改变 executor”的表达。当前不把它当 runtime failure，也不新增
comparison object；最小候选是每个 executor 变体各自物化 immutable Binding，固定非 executor 的
workspace/tool/effect 约束，并将 executor selection 与 adapter evidence 作为变化/观测维度。

当前 standing：`design-boundary-candidate / source-revision-applied / current-applicability-reconciled /
independent-review-complete / empirical-unknown / acceptance-pending`；
真实 eval consumer、protocol/eval owner、canonical equality、matched fixture 和任何 provider 优劣均未知。
本轮已将该 candidate 回写为仅限 wording/diagram 的 canonical source revision；不选 Vercel AI SDK/Pi
或 DeepSeek Harness，不启动 matched Run、adapter contract 或实现。revision-2 applicability record 已
由 `Dewey` 独立复核 `ACCEPT`，仅接受 current-source bookkeeping；owner-backed decision、eval card
和 protocol acceptance 仍未成立。
`Chandrasekhar` 已只读独立复核并 `ACCEPT`，仅接受本项 boundary finding，不取得 protocol、eval、provider
或实现授权。

### 2026-08-25 current projection：archive skill inventory completeness

[`records/archive-skill-inventory-completeness-review.md`](records/archive-skill-inventory-completeness-review.md) 只读对账
了 `archive/skills/*/SKILL.md` 与 [`records/archive-skill-inventory.md`](records/archive-skill-inventory.md) 的逐项表：
实际 29 个载体与清单 29 个唯一条目集合相等，当前没有发现 inventory 漏项或多项。

这完成的是迁移 inventory 的机械 completeness check，不是 skill semantic review、portable promotion
或 phase completion。原有逐项处置、11 个 `.agents/skills/` incubation、`skills/` 尚不存在以及
WorkCell/DeepSeek/实现冻结均不变；当前 standing 为 `inventory-set-match-observed /
independent-review-complete / acceptance-pending`，`Halley` 已独立 `ACCEPT` 本次 bookkeeping；该接受不
覆盖 skill semantic、portable、move 或实现。archive/清单变化、新 external consumer 或逐项 source/standing
变化时 reopen。

### 2026-08-25 current projection：P04/P08 boundary relation

[`records/philosophy-p04-p08-boundary-review.md`](records/philosophy-p04-p08-boundary-review.md) 补齐了 coverage audit
中尚未有专门记录的 P04/P08 父关系：P04 处理同一 scope 内证据是否足以称知，P08 处理 claim 是否仍在
同一问题/对象/视域内。F1/F2/F3 分别覆盖同 scope 证据不足、单一 scope 维度转移和 scope+evidence
均明确；`McClintock` 已独立 `ACCEPT`。

当前 relation standing 为 `design-boundary-observed / independent-review-complete / acceptance-pending`；
不修改哲学 source、不创建新 reading、不把 scope 变成 runtime router，不取得 P04/P08 reading、父 item、
WorkCell、DeepSeek 或实现 acceptance。下一 return 是真实 Agent route case，或相称的 P05/P08 同一对象
fixture；若实际任务不能改变 claim strength、owner route 或下一动作，则返回 `no-proposal`。source、
scope 或 evidence contract 变化时 reopen。

### 2026-08-25 current projection：living skill placement completeness

[`records/living-skill-placement-review.md`](records/living-skill-placement-review.md) 已完成当前 living skill carrier
的 placement check：实际 `.agents/skills/*/SKILL.md`、frontmatter `name` 与 `skill-migration.md`
中的 11 个唯一条目相等，没有发现漏登记、重复 canonical carrier 或 placement orphan。

当前判断是 `.agents/skills/` 作为 project-local incubation entry 的落点有意且成立；`skills/` 目录仍
不存在，集合级处置为 `collection-level-portable-placement-no-proposal-now`。这不是 11 个 skill 已被
接受为 semantic/portable 的结论，也不覆盖 `skill-migration.md` 的逐项 standing、disposition 和
revisit。普通 living 文档与从属 reference 也已作为不同形式处理。`Kepler` 已独立 `ACCEPT`，仅覆盖
placement 文档边界。

本轮不创建、移动或复制 carrier，不打开 runtime/实现；WorkCell provider 选择、DeepSeek system 设计
与实现冻结不变。下一 return 仍按逐项 skill 的 named consumer、portable boundary、matched/regression
evidence 和 acceptance 条件推进。

### 2026-08-25 current projection：WorkCell A/B/C/D current-source applicability

[`records/workcell-current-source-open-relations-applicability-review.md`](records/workcell-current-source-open-relations-applicability-review.md)
在 executor wording revision 后直接回读 A/B/C/D 所依赖的当前 protocol sections，确认既有 lifecycle、
Binding、typed Event 和 new-run/parent relation baseline 可回指当前 source。四项 child standing 为
`current-source-supported / applicability-reconciled / retain-unknown`；source-level pending 已解除，
但 cutoff、活动撤销、replay、retention、lineage recovery 和 owner decision 仍未定。

该 projection 不把 child source applicability 写成 protocol acceptance，也不改变当时的
`WorkCell active-after-prerequisite`、DeepSeek system design 或实现冻结；该 standing 已被当前用户新优先级
覆盖为 WorkCell 暂停。`Halley` 已独立 `ACCEPT` child record 的修订完整性；下一 return 仍由真实 host/security、protocol/record/evidence、retention/recovery
和 acceptance owner 分开作出决定。

### 2026-08-25 current projection：practice-cycle / work-estimation carrier disposition

[`records/method-skill-carrier-disposition-reconciliation.md`](records/method-skill-carrier-disposition-reconciliation.md)
已把设计开发方法的 carrier-level standing 与当前 case standing 分开：

- `practice-cycle` carrier 保持 `retain-incubation / adapt-and-retest`；当前 matched branch 关闭为
  `no-proposal-now`，下一动作是 `route-to-owner`，且必须先取得 named eval/runner owner；
- `work-estimation` carrier 保持 `retain-incubation / adapt-and-retest`；当前 Main-only case 关闭为
  `no-proposal-now`，等待 named planning/design consumer 和 decision-changing case；
- 两者 portable review 均作为独立 carrier-level `no-proposal-now`，不由当前 case 自动推出；继续留在
  `.agents/skills/`，不创建 `skills/` 或启动新 Run。

`Meitner` 已独立 `ACCEPT` 该 reconciliation record。当前仍无 matched improvement、regression、
acceptance、portable promotion、WorkCell/DeepSeek 或实现授权。

### 2026-08-25 current projection：migration boundary reconciliation

`phase-1-exit-review.md` 的迁移边界对账已完成独立复核，并同步本计划的当前解释：哲学 source 为
16 条，当前形成 13 个 reading candidate；P12/P13/P16 的缺失文件分别是 `no-proposal-now`、
`no-proposal-now` 和 `hold-cross-boundary-fixture-only`，不是待批量补齐的目录缺口。archive 中
29 个 `SKILL.md` 已完成 inventory set 对账；按 **initial triage snapshot** 统计为 5 个
`absorbed-current`、3 个 `absorbed-no-independent-proposal`、3 个 `no-proposal-now / archive-only`、12 个
`candidate-later` 和 6 个 `candidate-next`。这只关闭 inventory/bookkeeping，不关闭逐项 semantic、
portable 或 acceptance。当前处置不从这个历史计数推导：`mechanism-design-review` 已是
`.agents/skills/` 的 project-local incubation，`practice-cycle`/`work-estimation` 的 carrier-level
保留 incubation 但当前 branch 分别为 `no-proposal-now`，`code-review`/`structural-refactoring` 为
archive source 保留且 activation/implementation deferred，只有 `disciplined-development` 仍保留
`candidate-next / activation-deferred`。当前 `.agents/skills/` 的 11 个 carrier 继续是 project-local
incubation，`skills/` 仍没有 portable carrier；placement 是有意的形式决定，不是迁移遗漏。

因此本阶段的迁移结果必须写成“source/当前文档已形成，archive 已盘点并分流，部分 skills 已孵化”，
不能写成“全部文档已迁移”。`phase-complete` 仍为 `not-established / continue`；candidate-next/later
只在真实 consumer、边界和相称 evidence 出现后重开，不因目录完整或文件存在自动 move。该 projection
不改变 WorkCell → DeepSeek system design → implementation 的冻结顺序。

### 2026-08-25 current projection：WorkCell contract projection source revision

[`records/workcell-protocol-contract-projection-reconciliation.md`](records/workcell-protocol-contract-projection-reconciliation.md)
对 protocol §6.5/§7.1–§7.3 完成了 wording-only revision，修正 `EffectSummary`/`UsageObservation` named
slot 与未冻结 shape 的投影关系，并去掉 `effects.workspace` 的非 canonical shorthand。当前 contract
projection 已完成 current-source applicability reconciliation，但 canonical shape、authority、retention、
correction 和 acceptance 仍 pending；不覆盖 A/B/C/D policy，不产生 provider comparison 或实现授权。

该变化只更新 WorkCell design candidate 的 source fingerprint 与 readiness projection，保持
WorkCell → DeepSeek system design → implementation 的顺序以及 `phase-complete = not-established / continue`。

### 2026-08-25 current projection：WorkCell review-family source provenance

新增 [`records/workcell-review-family-source-provenance-reconciliation.md`](records/workcell-review-family-source-provenance-reconciliation.md)，
收敛多个窄 WorkCell review 把旧 `4293057d… / 26ec714f…` 写成 current source 的问题。旧 edge 现在只保留
为 review-time/pre-contract-projection provenance；该条记录经历 `2ed713fe… / f87422b0…`、
`7240b23… / 513e7ed…` 两个 previous source edge，当前 source 为 `fa602faf… / c78876b4…`。

当前只承认 contract projection、A/B/C/D child card 以及 Binding/Spec/CompletionAction 三个
current-source child 各自已经回指的范围；三个 child 的窄回读与独立复核已完成，但 record
integration/executor review 仍不因 source 回指自动获得 canonical acceptance。该 projection 不创建新字段、
registry、Run、provider comparison 或实现授权，WorkCell → DeepSeek system design → implementation
顺序与 `phase-complete = not-established / continue` 不变。

### 2026-08-25 current projection：archive inventory status locus

复核发现 `records/archive-skill-inventory.md` 的初筛表保留了历史 candidate 标签，而当前 carrier/branch standing
已由 `skill-migration.md` 与较晚 candidate disposition records 分层承载。已在 inventory 中明确这两层的
关系：初筛表负责 archive 集合与历史 triage，后续 dated record 才是 current disposition projection。
这解释了为什么 `mechanism-design-review` 已在 `.agents/skills/` project-local incubation，而
`practice-cycle`/`work-estimation` 的 current case 可以是 `no-proposal-now`，且 `code-review` 与
`structural-refactoring` 分别保留 `activation-deferred` 与 `implementation-gated`，却不等于 archive
candidate 已被删除或 portable move。

本轮只修正 status locus；29 项 inventory、11 个 `.agents/skills/` carrier、`skills/` 为空、phase-complete
未成立，以及 WorkCell → DeepSeek system design → implementation 的冻结顺序不变。

### 2026-08-25 current projection：WorkCell identity review current-source applicability

新增 [`records/evidence-applicability-review-workcell-identity-current-source.md`](records/evidence-applicability-review-workcell-identity-current-source.md)，
对 RunRecord/Binding identity 与 Spec identity 两个既有 review unit 做了 previous-source applicability
回读。既有 source 为 `2ed713fe… / f87422b0…`，随后更新为 `7240b23… / 513e7ed…`，当前 source 为
`fa602faf… / c78876b4…`；更早 `4293057d… / 26ec714f…` 只保留为 review-time historical edge。
`Kepler` 的 `ACCEPT` 只覆盖上一 source edge；child 当前为
`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。immutable Binding、
request `bindingRef`、Spec inline/reference、new-run/parent baseline 的不变观察可保留，
但 RunRecord 的显式 Binding/Spec identity projection、digest semantics、retention/correction、named owner
和真实 consumer 仍 unknown；current-source applicability 已完成的范围不等于 identity projection 或
canonical acceptance。该 projection 不修改 canonical protocol、不接受字段、不创建 registry/Run，
保持 WorkCell → DeepSeek system design → implementation 的顺序与冻结条件。

### 2026-08-25 current projection：P15-U1 named-owner return

对 [`records/philosophy-p15-practice-use-case.md`](records/philosophy-p15-practice-use-case.md) 的 owner return 做了只读
回读：当前 `AGENTS.md`、plan、roadmap、coverage 和 P15 review surface 没有 named reading/use-case
acceptance owner；`Goodall`/`Plato` 是独立 reviewer，不是 acceptance owner。U1 本身仍为
`use-case-candidate / source-bound / independent-review-complete / acceptance-pending`，本次只将当前
owner-return branch 收敛为 `route-to-owner / no-proposal-now`。

该 projection 不指定 owner、不关闭 P15、不创建新 Run/fixture、不修改哲学 source、WorkCell canonical、
DeepSeek 或实现 standing；named owner 与 owner-backed retain/revise/close decision 出现后再 reopen。

### 2026-08-25 current projection：A4 E0 named eval/runner owner-surface

已对 `AGENTS.md`、round-3/round-4 probe records、evaluation protocol/trial ledger/manifests、migration
与 evidence-maintenance surface 做 bounded owner discovery。没有找到能回带实际 runner/model/harness/
workspace identity、activation evidence、统一 schema 和运行回返的 named eval/runner owner；Main 只保留
发起 discovery 的职责。

当前最小处置是 `owner-surface-checked / owner-unknown`，并将 round-4 matched branch 保持为
`route-to-owner / no-proposal-now`。这只关闭 E0 的当前 discovery 分支；`practice-cycle` 仍为
`retain-incubation / adapt-and-retest`，round 3 仍为 `behavior-observed / attribution-uncertain`。
不新建 card/Run/fixture/schema，不重跑、不提升 matched/regression/acceptance/portable standing，不
move、不打开 WorkCell、DeepSeek、base/runtime 或实现阶段。named owner 回带 identity、activation/
non-activation、schema、source hash 与失败/停止记录后才重开 E1。

### 2026-08-25 current projection：archive `SKILL.md` source scope

本轮宽扫描发现 `archive` 下共有 76 个 `SKILL.md`，但迁移 source 不是按文件名全量取值：29 个来自
canonical `archive/skills/*/SKILL.md`，37 个是 evaluation fixture/served material，9 个是 legacy 历史
材料，1 个是 WorkCell package fixture。新增 [`records/archive-skill-source-scope-reconciliation.md`](records/archive-skill-source-scope-reconciliation.md)
把这四类 source class 明确分开。

因此当前 plan 保持“29 项 archive inventory 已盘点，47 个历史/fixture 文件不进入 migration candidate
集合”的解释；不把宽扫描数量写成文档迁移缺口，不批量创建 carrier、不移动/删除 archive，不改变
`.agents/skills/`、`skills/`、WorkCell、DeepSeek 或实现的既有冻结关系。非 canonical class 只有在其
上层 artifact relation 或真实 consumer 改变时才 reopen。

### 2026-08-25 current projection：WorkCell review-family provenance review return

> 历史 qualifier：本段保留 CompletionAction current-source child 建立前的 pending 状态；当前 child
> 结果见紧接其后的 current-source applicability projection。

[`records/workcell-review-family-source-provenance-reconciliation.md`](records/workcell-review-family-source-provenance-reconciliation.md)
已由 `Meitner` 独立只读 `ACCEPT`，确认 `429/26ec → e8f7/cfe203 → 2ed/f874` 只适用于
contract/executor projection family，lifecycle/lineage 的 `00a7/25e` edge 独立保留；executor comparability
也已直接回指 revision-2 applicability 与自身 review record。

该 review 没有把 provenance bookkeeping 升级为 WorkCell acceptance。其当时的 CompletionAction
current-source `pending` qualifier 已由下一节的 current-source child 回读取代；因此仍不补字段、不重跑、
不创建机制、provider comparison、DeepSeek system design 或实现授权。

### 2026-08-25 current projection：CompletionAction current-source applicability

新增 [`records/evidence-applicability-review-workcell-completion-action-current-source.md`](records/evidence-applicability-review-workcell-completion-action-current-source.md)，
直接回读过 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…` 两个 previous source edge 的 §4.5、
§6.3、§6.4、§6.5、§7.3、§8.1、§16、§17.1 与 §18 checks 3/5；当前 source 为
`fa602faf… / c78876b4…`。`Halley` 的 `ACCEPT` 只覆盖上一 source edge，child 当前为
`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。

这保留 CompletionAction 的 previous-source boundary observation，不是 canonical shape：对象槽位、executor return/
host observation、mechanical check/acceptance 的分层已对当前 source 窄回读并复核；完整 shape、identity、
retention/correction、host authority、跨 transport reconciliation、named owner 与 acceptance 仍未决。
因此 parent readiness 仅保留 previous-source boundary observation；当前 source 窄回读与 independent review
已完成，owner-backed decision 仍待定。不修改 protocol、不补字段、不
创建 Run/registry、不打开 WorkCell → DeepSeek system design → implementation 的后续阶段。

### 2026-08-25 current projection：practice-cycle project-instruction applicability drift

当前 `AGENTS.md` SHA-256 为 `1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`，而
practice-cycle round 3 frozen card 记录的是 `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`。
这只把现有 applicability 的 project-instruction edge 修正为 `drift-observed / current-applicability-uncertain`；
candidate/card/task/output/review 的历史 artifact chain、`behavior-observed / attribution-uncertain /
adapt-and-retest`、`practice-cycle` 的 `retain-incubation` 和 owner-return branch 不变。

本条是 current projection maintenance，不是新 Run、semantic claim 或 acceptance。冻结历史不改写；下一
return 仍是 current source 的 fresh/superseding card、named eval/runner owner、runtime identity、activation
proof、统一 schema 与独立 review。条件未齐前不重跑、不移入 `skills/`，WorkCell → DeepSeek Harness →
implementation 的顺序与冻结边界不变。

</details>
