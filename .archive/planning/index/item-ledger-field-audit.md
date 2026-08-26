# item-ledger 字段覆盖审计

coverage：`structural-coverage-observed`
projection：`projection-reconciled`
review：`independent-review-complete`
revision：`follow-up-clean`
acceptance：`pending`；本轮新增 package projection 的语义回接已完成窄 follow-up；不是 planning
item acceptance、phase completion、owner assignment 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 审计对象与要求

本记录检查 main goal 要求的最小字段是否在当前 projection 中可回读：

`source → standing → consumer/owner → dependencies → allowed scope → evidence → disposition → stage exit → revisit`

权威仍由 [`planning/item-ledger.md`](../item-ledger.md) 和 [`planning/index/coverage-audit.md`](coverage-audit.md)
拥有；本记录只拥有本次结构覆盖观察，不复制 item 语义。

## 2. 当前结构结果

### 顶层 planning item

- `planning/item-ledger.md` 的总览表有 **16 个**顶层 item。
- 其 contract projection 有 **16 个**对应 item 行，每行包含 6 个非空字段：
  `item`、`consumer / owner`、`dependencies / allowed scope`、`current evidence standing`、
  `disposition / stage exit`、`revisit`。
- overview 与 contract projection 使用不同语言/简写时，按以下稳定的当前顺序一一对应；该顺序
  不是新的 canonical name，任何增删/重排都触发本审计重开：

| item ID | overview label | contract label |
| --- | --- | --- |
| PL-01 | 哲学序列 P01–P16 的 living 解读 | P01–P16 living readings |
| PL-02 | 防退化闭环迭代与 Principal correction | iterative-improvement / Principal correction |
| PL-03 | archive 文档/skills 价值筛选 | archive docs/skills value screening |
| PL-04 | 设计/开发生命周期 skills 套组 | design/development skill suite |
| PL-05 | 当前 11 个 `.agents/skills/` | 11 个 `.agents/skills/`（8 个既有 + 3 个 candidate） |
| PL-06 | Work Cell 协议 | WorkCell protocol |
| PL-07 | DeepSeek Harness 工作系统设计 | DeepSeek Harness work-system design |
| PL-08 | 受控 Agent 行为评估工具 | controlled Agent behavior evaluation tool |
| PL-09 | 旧 skill/eval 证据按现行 protocol 复核 | legacy skill/eval evidence maintenance |
| PL-10 | “迭代循环像无监督学习”类比 | “iterative loop resembles unsupervised learning” analogy |
| PL-11 | 概念碎片式输出 | conceptual fragmented output |
| PL-12 | 冲突角色整合/统一自我 | conflict-role integration / unified self |
| PL-13 | 实时、多来源 DeepSeek Harness 基座 | real-time multi-source DeepSeek Harness base |
| PL-14 | 工作系统实现 | work-system implementation |
| PL-15 | 用户各类 harness 构想 | user harness ideas |
| PL-16 | Agent harness throughput | Agent harness throughput and orchestration |

- `canonical source` 由 overview 的同一 item ID 提供；contract projection 只承载关系字段，因此
  source 与 contract projection 是两层投影，不是缺省 source 或第二 authority。
- 检查结果：16 行均为 6/6 非空；未发现因为字段空缺而无法回读的顶层 item。

### P01–P16 work package

- `planning/index/coverage-audit.md` 的 reading work-package map 有 **16 个**行，P01–P16 各一行。
- 每行包含 5 个非空字段：`item`、`source entry`、`current standing`、`bounded contribution`、
  `dependencies / revisit`。
- P01–P16 的其余 goal 字段按以下明确映射继承，不把 5 列计数误写成 9 列独立语义：

| package IDs | consumer / owner | allowed scope | evidence | disposition / stage exit | revisit |
| --- | --- | --- | --- | --- | --- |
| P01–P11、P14 | 共同 owner：哲学 reading producer + 显式 source/acceptance owner；named owner `unknown` | 每行 `bounded contribution`，并受共同 reading exit 限制：source-linked reading/review/research record，不改 source、不进 runtime | 每行 `current standing`；`source-current`、candidate/absent、review、acceptance 和 behavior qualifier 以各行现值为准 | P01–P11/P14：`retain-candidate / acceptance-pending`；stage exit 是 source line、对象/最近邻、生成性判断、未知边界、独立 review 和 named acceptance | 每行 `dependencies / revisit`；source、术语、关系、domain/use、owner 或 rubric 变化时重开 |
| P12–P13 | 同上；当前没有独立 adversarial consumer，named owner `unknown` | 只允许 source-backed reading/review 与 conditional research/disposition，不创建 strategy 或 runtime policy；初轮 review 已将固定清单与“实/虚”操作化收紧，follow-up clean | `source-current / reading-candidate / research-open / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending` | reading `retain-candidate / follow-up-clean`；下游 strategy/behavior 仍 `no-proposal-now`，reopen-on-adversarial-consumer / distinct-response-effect | 见 `theory/philosophy/P12.md`、`P13.md`、`records/philosophy-p12-p13-p16-reading-review.md` 与 disposition 的各自 trigger |
| P15 | 同上；round-3 已有真实 planning/design consumer；reading/use-case acceptance owner `unknown` | 只允许 source-bound use-case、最近邻边界和相称 review；不改 source、不把 use-case 或 round-3 行为观察写成 reading/runtime 结论 | `source-current / use-case-candidate / independent-review-complete / acceptance-pending`；round-3 仍为 `behavior-observed / attribution-uncertain` | `retain-candidate / use-case-review-complete / acceptance-pending`；stage exit 还需 named reading/use-case acceptance、相称 evidence 和必要边界实践 | 见 `records/philosophy-p15-practice-use-case.md`、`records/philosophy-p15-reading-review.md`；owner、consumer、source 或 attribution 变化时重开 |
| P16 | 同上；真实 adoption/time-window consumer 与接受 owner `unknown` | 允许 source-bound reading/review 与 B1–B4 cross-boundary fixture；不形成实践结论、长期监控或 runtime guarantee；初轮 review 已补适用时点和 `not-applicable` 边界，follow-up clean | `source-current / reading-candidate / research-open / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending / cross-boundary-fixture-only` | reading `retain-candidate / follow-up-clean`；下游 adoption/time-window 实践仍 `hold-cross-boundary-fixture-only`，不形成 reading acceptance | 见 `theory/philosophy/P16.md`、`records/philosophy-p12-p13-p16-reading-review.md`、`records/philosophy-remaining-reading-disposition.md` 与 P04/P15/P16 boundary review |

`consumer / owner` 的共同声明是明确的继承关系，不是每个 reading 已有真实 named owner；若某一
reading 需要独立 consumer/owner，必须在该 work package 或父 item review 中显式增加。
- 检查结果：16 行均为 5/5 非空；未发现 P01–P16 的 source/standing/contribution/dependency/revisit
  字段结构缺失。

## 3. 验证方式与边界

Main 使用当前工作树的结构检查分别统计 `item-ledger.md` contract projection 的 16 行/6 字段和
`coverage-audit.md` P01–P16 map 的 16 行/5 字段，空值检查均为零。该检查证明的是 Markdown projection
的字段存在与当前表格规模，不证明：

- 每个 source、standing 或 review 语义正确；
- owner/consumer 已真实命名、接受或授权；
- `independent-review-complete` 等记录已成为 Principal acceptance；
- WorkCell、DeepSeek Harness、base、runtime 或用户 harness 构想可以实现；
- 16 个顶层 item 或 16 个 reading 已完成全部阶段出口。

当前仍需保留：P12/P13 下游策略/行为的 no-proposal、P15 的 use-case acceptance pending、P16 下游 adoption/time-window 实践的 hold-cross-boundary-fixture-only、WorkCell 的 active-after-prerequisite、
DeepSeek 的前置关系、iterative behavior 的 adapt-and-retest、evidence maintenance 的
partial-closure，以及所有未命名 owner/acceptance unknown。

## 4. 处置与回返

| 字段 | 当前值 |
| --- | --- |
| structural disposition | `retain-current-projection` |
| semantic disposition | `acceptance-pending` |
| consumer / owner | planning owner `unknown`；Main 负责本次结构检查；Principal/acceptance owner `unknown` |
| stage impact | 支持“字段结构已覆盖”的 bounded observation；不改变 `phase-complete = not-established / continue` |
| reopen trigger | 新增/拆分 item、canonical source 变化、字段语义变化、owner/consumer 具体化、projection drift 或新的 stage/revisit 关系 |
| prohibited effect | 不因字段检查创建 skill、移动 portable skill、重跑 eval、打开 WorkCell/DeepSeek/base 实现 |

若后续 item 只出现在 overview 或只出现在 contract projection，或 P01–P16 的共同 owner 不再足以表达
实际边界，应先修正 canonical projection，再重新做该结构审计；不得用重复字段填充制造语义完整。

## 5. 历史 independent review 与当前待复核

`Halley`（Agent `01a0389c-f0c7-7200-bca2-6ae35783bd6d`）未修改文件，完成了两轮 review：

- 初轮指出三项必须修订：P01–P16 的 allowed scope/evidence/disposition/stage exit 只在分散文字中可回读；顶层 overview 与 contract projection 缺少稳定一一映射；P12/P13 与 P15/P16 的处置边界需要分开。
- 在当时的 15-item projection 中，Main 增加 `PL-01..PL-15` 的 audit-only mapping、P01–P16 的显式字段继承表，并拆分 `no-proposal-now` 与 `hold-cross-boundary-fixture-only`；该 review 不覆盖本轮新增 PL-16。
- 二轮结论：`final accept`。同时确认 audit ID 不成为 canonical name；common owner 仍只是继承声明，named owner 仍 `unknown`；结构覆盖不改变 item acceptance、phase transition 或 implementation authorization。

上述 `Halley` review 的覆盖范围止于当时的 PL-01–PL-15。`Aquinas`（Agent `01a03aa6-19ea-7e42-82b9-35faea5bfd8e`）随后对当前 16/16 projection、PL-16 字段和 reviewer scope 做窄复核并 `accept`；这只关闭结构 review，不取得 item acceptance、owner assignment 或实现授权。

上述 review 只覆盖此前的 projection；本轮新增 P12/P13/P16 reading candidate 并调整其 inherited
standing 后，结构 projection 已由独立 review 回读，candidate 修订后的语义字段 follow-up 也已
clean。下一项仍是由 acceptance/consumer 关系决定是否推进，不把结构 review 写成 reading acceptance。

reviewer 不拥有 item acceptance、phase transition、owner assignment 或 implementation authorization。

## 6. 2026-08-25 current projection reconciliation：P15/P16

上一版审计把 P15 与 P16 合并为 `reading absent / cross-boundary-fixture-only`。这与当前来源不再一致：
[`records/philosophy-p15-practice-use-case.md`](../records/philosophy-p15-practice-use-case.md) 已由 `Goodall` 独立复核，
把现有 round-3 consumer 收窄为 P15-U1 source-bound use case；P16 仍没有真实 adoption/time-window
consumer。因此本审计只拆分两行的 inherited fields，并保留 P15 的 acceptance pending 与 P16 的 hold。

- 允许效果：更新本审计的结构投影与字段继承关系；不改 `theory/philosophy.md`、P15/P16 source、
  round-3 Run、fixture、review、skill carrier 或 runtime。
- 证据上限：P15-U1 为 `use-case-candidate / source-bound / independent-review-complete /
  acceptance-pending`；round-3 仍为 `behavior-observed / attribution-uncertain`；P16 仍为
  `cross-boundary-fixture-only`。没有 P15 reading acceptance、matched、regression、adoption 或实现授权。
- 回返：named reading/use-case acceptance owner 与相称实践出现时再更新 P15；P16 只有真实
  adoption/time-window consumer 出现时重开。

本节已由 `Averroes`（Agent `01a03897-4c71-7e01-a400-edefd1391f23`）独立只读复核并 `accept`。
复核确认 P15-U1 与 P16 已正确拆分，source/standing/consumer-owner/allowed scope/evidence/
disposition/stage exit/revisit 可回读，U1 与 round-3 没有被写成 reading acceptance、matched、
regression、adoption 或实现授权，且上一轮结构审计的历史 review 结论未被改写。该结论只接受本次
projection reconciliation，不构成 item、P15 reading、phase 或 implementation acceptance。
