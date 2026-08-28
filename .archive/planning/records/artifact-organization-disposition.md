# `artifact-organization` 当前处置

状态：`source-recovered / current-layout-observed / bounded-transition-applied /
no-skill-proposal / adoption-review-pending / acceptance-pending`；
不是 skill acceptance、portable promotion、长期 layout acceptance 或 cleanup campaign。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象、来源与环境

本记录审查 archive 中的 `artifact-organization` 是否应恢复为当前 project-local skill carrier，
以及当前 planning tree 是否已经出现足以触发一次组织 transition 的设计与 consumer。

主要来源：

- [`archive/skills/artifact-organization/SKILL.md`](../../archive/skills/artifact-organization/SKILL.md)：
  只拥有历史方法来源，不是当前 skill authority；
- [`planning/README.md`](../README.md)：当前 planning 的发现入口、读取顺序与停止边界；
- [`planning/item-ledger.md`](../item-ledger.md)：跨 item standing 与当前路由 authority；
- [`planning/plan.md`](../plan.md)：实现前顺序和目录角色约定；
- 当前 worktree 的实际路径和文件类别。

历史方法的主要判断是：在 accepted design 已存在时，审查 artifact 的 authority/lifetime layout
是否产生 material gap，并在 gap 改变 authority、inheritance、重复行动或 rebuildability 时执行
一个最小、可验证的 organization transition。它不拥有普通清理、目录美化、协议设计或 skill authoring。

## 2. 当前观察

本记录形成时的审计快照 85/66、86/67、87/68 和 89 个顶层 Markdown 文件都属于 transition 前历史
观察，不是当前计数或 acceptance evidence。2026-08-26 按用户对 planning 混乱的明确纠正执行第一轮
路径整理后，历史快照曾是根目录 15 个稳定入口或 current index、`planning/records/` 81 个 bounded
process records 及其入口、全部 97 个 planning Markdown。第二轮已将 8 个 supporting view 移入
`planning/index/`；当前是根目录 7 个稳定入口/authority、index 8 个 view 加入口、records 81 个
record 加入口，全部 98 个 planning Markdown。两轮路径变化均可由 manifest 重建，正文、source、standing、
lineage 和接受关系未被改写。
用户此前已经对 planning 的可读性和结构混乱提出纠正；当前树形事实也确认，第一轮之后 supporting
working view 仍与 canonical authority 共处根级，因此需要第二轮分层。

但当前已有明确的语义路由，且本轮已把物理发现路径与语义 authority 分开：

- `planning/README.md` 规定先读 `item-ledger → roadmap → plan → phase exit → index view（按需） → child record`；
- `item-ledger.md` 明确拥有跨 item 当前 standing，`roadmap.md` 和 `plan.md` 各自保留长期方向与
  pre-implementation 顺序；
- `planning/index/` 保存 supporting working view，`planning/records/` 下的 review/disposition 文件保存
  source、观察、未知、review、处置和 lineage；两者都不是独立 authority；
- `design/` 当前只保留仍约束下一版形状的 WorkCell 协议候选，`.agents/skills/` 是项目内
  incubation 入口；这些落点与 `AGENTS.md` 的当前约定一致。

因此观察仍只支持“需要降低根目录发现压力”，不证明 target layout 已被长期接受，也没有发现一个
必须由 skill 反复执行的独立 Agent 判断差距。本轮移动是用户明确纠正下的 bounded transition，不把
它升级为 skill、runtime 或永久组织政策。

## 3. skill 准入判断

### 行为对象与预期改变

- 对象：在已有 accepted organization design 的 carrier 上判断路径/角色是否失配，并选择最小
  transition；
- 正向改变：先恢复 semantic source、durable evidence、living expression、process artifact 与
  projection 的 authority/lifetime，再决定是否移动；
- 负向行为：把文件数量、个人审美、一次性清理或新目录偏好当成 organization gap；
- 最近邻 owner：`planning/README.md`/`item-ledger.md` 负责当前 planning 路由与 standing，
  `form-selection` 负责最小真实形式，项目 design owner 负责 accepted target layout，
  `skill-formation` 负责是否需要可选择加载的载体。

### 准入结果

当前返回 `no-skill-proposal / retain-design-candidate / adoption-review-pending`：

1. 当前确有一次可观察的 planning layout pressure，但尚未有第二个独立、可归因的 Agent 判断或
   行动差距；
2. 当前 planning authority 已经通过入口和 item ledger 分担了主要路由判断，不能仅凭根目录拥挤
   推出新的 skill carrier；
3. accepted target layout、named organization owner 和长期维护关系仍未成立；本轮 transition 只改变
   process record 的发现路径，未改变 discovery/authority/inheritance/rebuildability 的语义；
4. 因而把 archive 正文迁入 `.agents/skills/artifact-organization/` 会把“需要 design”误写成
   “方法已经准入”，也会制造一个与 planning authority 重叠的 carrier。

本次不创建 carrier，不移动、复制或删除 archive，不创建 organization campaign，不改变当前
planning 的 authority hierarchy，也不把历史计数或当前 98 个文件的目录统计写成 acceptance evidence。

## 4. 允许效果、阶段出口与回返

| 字段 | 当前值 |
| --- | --- |
| consumer / owner | 当前 consumer 是 planning reader 与维护者；accepted organization owner `unknown` |
| dependency | `AGENTS.md`、`planning/README.md`、`item-ledger.md`、已接受的 future layout design |
| allowed scope | 保留 source/观察/边界；已执行 records path transition 与 supporting-view index transition，不扩展 domain 层级、不改语义 |
| evidence standing | `archive-source / layout-observed / repeatedness-uncertain / target-design-missing` |
| disposition | `no-skill-proposal / retain-design-candidate / adoption-review-pending / retain-archive-source` |
| stage exit | 出现 accepted target layout、named owner、最小 transition、保留/可重建关系、独立 review 与外部接受；不能用目录减少代替出口 |
| revisit | adoption review、新的独立 layout drift、accepted organization target、named owner 或 discovery/authority regression 出现时重开 |

### 4.1 已执行 transition manifest

第一轮的 root keep set 与 process-record manifest 只具有历史回滚意义：它把 81 个 bounded record
各自移动一次到 `planning/records/<same-name>.md`，并新建 `planning/records/README.md` 作为入口；它
不应再被解释为当前 root keep set。

第二轮的当前 root keep set 是：`README.md`、`item-ledger.md`、`roadmap.md`、`plan.md`、
`phase-1-exit-review.md`、`inbox.md`、`inbox-history.md`。当前 index manifest 是：
`candidate-consolidation.md`、`coverage-audit.md`、`evidence-maintenance-review.md`、
`item-ledger-field-audit.md`、`item-loop-coverage-audit.md`、`skill-migration.md`、
`whole-planning-work-estimate.md`、`whole-work-coordination-candidate.md`；它们各自只移动一次到
`planning/index/<same-name>.md`，并新建 `planning/index/README.md` 作为入口。

两轮 manifest 都只定义可回滚路径边界，不复制旧正文，不改变 source、standing、lineage 或接受关系；
当前长期 layout 仍待 adoption review。

如果后续只是希望“让 planning 看起来更整齐”，应先在 design 层定义组织目标和保留关系；如果
目标只是一次性调整文件，使用当前任务表达或 bounded transition record，不先创建 skill。只有在
同一判断跨任务重复、正反触发与最近邻可区分、skill 形式的净收益得到支持后，才重新运行
`skill-formation` 准入。

## 5. 结论边界

本记录完成的是 archive candidate 的当前处置，不是 planning layout 的最终设计。它确认当前
`candidate-later` 不应直接进入迁移队列，并把后续真实入口收敛为“先有 organization design，再
决定是否需要 transition 或 carrier”。当前已形成待审查的
[`design/planning-artifact-organization.md`](../../design/planning-artifact-organization.md) candidate，
不代表 target layout 已接受。WorkCell、DeepSeek Harness、base/runtime 与其他实现边界不受影响。
