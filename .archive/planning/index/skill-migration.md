# Skills 迁移与迭代 Review Ledger

状态：active planning ledger

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

前置阶段：同一 goal thread 中的 skills 迁移 review（已完成；其结果被 main goal 继承）

范围：判断当前项目内孵化的 skills 是否应继续留在 `.agents/skills/`，还是经过相称验证后
成为可移植的 `skills/`，或应改写、合并、降级或不再提出。

本 ledger 记录 planning/review 的事实、候选处置、证据和回返关系；它不是 skill 内容的
canonical source，不是 eval Run、执行记录或 acceptance source，也不授权移动文件。

## 当前迁移快照（本文件为处置权威）

- 当前实际载体是 `.agents/skills/` 的 11 个 skill；可移植 `skills/` 当前为 0 个。这个计数是
  载体事实，不等于迁移承诺。
- 本文件的逐项登记、对应 candidate record 和后续 review 才是当前 branch 的迁移处置来源：
  `retain-incubation`、`adapt-and-retest`、`no-proposal`、`hold` 等均以这里的当前记录为准。
- `planning/records/archive-skill-inventory.md` 只拥有 archive 集合和历史初筛；其中
  `candidate-next` / `candidate-later` 是初筛标签，不是当前迁移队列，也不会自行触发 move。
- 当前没有 portable 晋升或批量迁移决定。只有出现命名 consumer、脱项目边界的适用证据、以及
  相称的 matched/regression/acceptance 关系，才重新打开 portable 判断；没有这些条件时保留在
  `.agents/skills/` 是有意的 incubation standing。
- 当前三个方法型 candidate（`practice-cycle`、`work-estimation`、
  `mechanism-design-review`）仍按各自逐项记录处理；archive 中的 `code-review`、
  `structural-refactoring`、`disciplined-development` 仍是 archive source/待激活方向，不是当前
  carrier；其中 `disciplined-development` 当前提案为 `no-proposal-now / activation-deferred`，
  也不构成实现授权。
- `artifact-organization` 已完成一次当前 candidate review，处置为
  `no-proposal-now / route-to-design / retain-archive-source`：当前 planning layout 有可观察压力，
  但 accepted target layout、named organization owner 和重复 Agent 行为差距仍未知；不创建 carrier，
  不移动 archive。详见 [`records/artifact-organization-disposition.md`](../records/artifact-organization-disposition.md)。
- 当前 archive migration wave 已 `bounded-review-complete / waiting-for-named-consumer`：29 个
  `archive/skills` source 已完成集合对账和初筛，`candidate-next` 中能形成项目内 carrier 的三个方法
  已进入 `.agents/skills/`，其余 `candidate-next` 已明确为 activation-deferred、implementation-gated
  或 no-proposal。没有新的 named consumer、重复 gap、decision-changing counterexample 或 portable
  acceptance 时，不再做泛化的逐项扫描、批量 move 或新 carrier 提案。
- carrier standing 与旧 round applicability 分开读取：`agent-delegation`、`agent-expression`、
  `concept-articulation`、`dual-audience-expression`、`form-selection`、`human-writing` 和
  `skill-formation` 的 round-2 记录只能支持 `historical-artifacts-observed / current-applicability-uncertain`；
  manifest candidate hash 与当前 carrier 不同，且 round lineage 未闭合。这不撤销 carrier 的
  `retain-incubation`，也不把表中的局部 `behavior-observed` 升格为当前源码的 matched、portable 或
  acceptance evidence；不重跑、不改旧 Run，只有 source/identity/consumer/owner 关系恢复后另开 round。

## 当前观察

截至 2026-08-26 current-source re-read（承接 2026-08-25 的逐项证据）：

- `.agents/skills/` 有 11 个 `SKILL.md`：8 个已有 incubation skill，及本轮新增的
  `practice-cycle`、`work-estimation`、`mechanism-design-review` 三个设计开发方法 candidate；本轮复核确认目录名与 frontmatter `name` 一一对应且唯一，description 与正文符合中文 review 约定；
- `skills/` 目录尚不存在；
- 8 个已有 skill 都是项目内 incubation standing；三个新 candidate 也只取得项目内 incubation
  standing，尚无 portable standing；
- `evals/project-audit/living-skills-round-1.md` 已完成一次逐项边界/重叠/证据审计；
- 审计给出的当前最小处置是 8 个均 `retain / no-proposal`，但不是长期接受或普适有效；
- 三个新 candidate 的当前 evidence standing 是 `format-valid` + planning `behavior-observed`；
  不把它们混入旧 8 个的历史审计结论；
- `mechanism-design-review` 的 round 1 已冻结并完成 baseline/treatment；三案 recommendation 一致，
  只能保留 `behavior-observed` / 局部 `boundary-supported`，matched attribution、acceptance 与
  adoption 仍为 `unknown`；详见 [`records/mechanism-design-review-round-1.md`](../records/mechanism-design-review-round-1.md)；
- “no-proposal”只表示当前没有足够证据支持 portable 晋升或新处置，不表示删除 skill。

## 逐项登记

| skill | 当前载体 | 已知 consumer | 当前处置 | 证据 standing | revisit 条件 |
| --- | --- | --- | --- | --- | --- |
| `agent-delegation` | `.agents/skills/agent-delegation/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、局部 `behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `agent-expression` | `.agents/skills/agent-expression/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `concept-articulation` | `.agents/skills/concept-articulation/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `dual-audience-expression` | `.agents/skills/dual-audience-expression/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `form-selection` | `.agents/skills/form-selection/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `human-writing` | `.agents/skills/human-writing/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `planning-inbox` | `.agents/skills/planning-inbox/SKILL.md` | 项目 `planning/`、goal/Plan 和 project authority；外部 consumer不成立 | `retain-incubation` + portable `no-proposal` | `format-valid`、round 2/3 `behavior-observed`，有局部 boundary qualifier；round-2/3 applicability 均为 current/runtime uncertain | 外部 authority 不再是必要条件，且有脱项目 consumer 与相称验证；旧 round source/identity 恢复后才重开，当前不 move |
| `skill-formation` | `.agents/skills/skill-formation/SKILL.md` | 项目 Agent discovery、评估 fixture；外部 consumer unknown | `retain-incubation` + portable `no-proposal` | `format-valid`、`behavior-observed`；matched 未成立 | 外部 consumer、脱项目边界和 matched/regression evidence |
| `practice-cycle` | `.agents/skills/practice-cycle/SKILL.md` | 当前 planning/design review；外部 consumer unknown | carrier-level `retain-incubation / adapt-and-retest`；current matched branch `no-proposal-now / route-to-owner`；portable review `no-proposal-now`（独立 carrier-level） | `format-valid`、`behavior-observed / attribution-uncertain`；matched、regression、acceptance 未成立 | 先取得 named eval/runner owner，再用同一可核验 runner/model/harness/workspace、真实 activation proof、统一 output schema 重建新 card 并重跑窄 Case B；否则保持 attribution unknown 或 demote/no-proposal |
| `work-estimation` | `.agents/skills/work-estimation/SKILL.md` | 当前 planning item 的工作图与 discovery branch 判断；外部 consumer unknown | carrier-level `retain-incubation / adapt-and-retest`；current Main-only case `no-proposal-now / wait-for-named-consumer-and-decision-changing-case`；portable review `no-proposal-now`（独立 carrier-level） | `format-valid`、当前 planning `behavior-observed / attribution-uncertain`；准确性/matched 未成立 | 真实方案比较、粒度/误差边界 probe、独立 review 和 calibration regression；没有 named consumer 与 decision-changing case 时不继续累积 self-application |
| `mechanism-design-review` | `.agents/skills/mechanism-design-review/SKILL.md` | `design/work-cell-protocol.md` 的机制边界审查；后续 DeepSeek 工作系统设计可能成为 consumer | `rewrite-applied + retain-incubation`；round-1 `adapt-and-retest`；portable `no-proposal` 尚未提出 | `format-valid`、`source-backed`、WorkCell planning `behavior-observed`，局部 `boundary-supported`；matched attribution、acceptance、adoption 未成立 | 见 [`records/mechanism-design-review-candidate.md`](../records/mechanism-design-review-candidate.md) 与 [`records/mechanism-design-review-round-1.md`](../records/mechanism-design-review-round-1.md)：已补 `fixture-stipulated` 边界；仍需 named replay consumer、owner-backed fixture、可重建 runner identity 和独立 review |

共同来源与边界见 [living-skills round-1 审计](../../evals/project-audit/living-skills-round-1.md:3)。
各专项行为观察与最小处置见对应的 `evals/skill-evaluation/reviews/round-2-*-review.md`；
这些记录不能升级为 matched improvement 或长期 acceptance。

## 处置词汇

处置是 review 结果，不是运行状态：

- `pending-review`：还没有足够证据作逐项决定；
- `retain-incubation`：方法仍有价值，但当前项目依赖或证据不足以移植；
- `rewrite`：对象和差距仍成立，现有表达不能可靠改变行为；
- `merge`：与另一个载体拥有同一可独立触发的主要判断，不能合理分开；
- `demote`：更真实的形式是普通文档、reference、项目指令或工具；
- `portable-candidate`：具备脱离本仓库验证的候选条件，进入独立 portable review；
- `accepted-portable`：有明确 acceptance 和 move 关系，可以进入 `skills/`；
- `no-proposal`：当前证据不能支持继续提出该 skill 载体，不等于删除历史 source；
- `hold`：存在外部 owner、consumer、证据或依赖阻塞，并记录回返条件。

## 迭代改进闭环

```text
观察/来源
  → 逐项建模
  → baseline 与行为差距
  → 最小改变或处置候选
  → 正例/反例/最近邻/回归 review
  → 独立语义 review
  → acceptance / retain / rewrite / move / hold
  → 采用后观察
  → 新问题回到下一轮
```

每个 skill 至少记录以下关系：

1. **来源与身份。** 当前 SKILL.md、生成来源、项目 authority、历史材料和可能的外部 consumer。
2. **重复差距。** 哪种 Agent 判断或行动反复出现，不能只因为文件存在就认定差距真实。
3. **最近邻与边界。** 为什么它不是项目指令、普通文档、reference、工具、runtime 或另一个 skill。
4. **baseline。** 不加载候选载体时的行为或现状；若无法建立，只报告 observation，不归因改善。
5. **最小改变。** 一轮只改变能解释的最小语义关系；迁移路径变化和正文重写不要在没有记录的情况下混成一次效果。
6. **行为证据。** 正例、反例、最近邻和回归；高风险或波动任务需要相称重复。
7. **处置与 owner。** 处置候选、证据 standing、独立 reviewer、acceptance owner 和实际 move owner 分开。
8. **回返关系。** 新 consumer、项目依赖变化、来源变化、行为回归、portable review 失败或采用后逃逸时重新打开。

## 本轮出口

本 goal 的 planning 阶段只有在以下关系都可回读时才算达到出口：

- 8 个已有 skill 都有逐项 review 结果，不能只保留组合状态；本轮已由 living-skills 审计覆盖；
- 新增的 incubation candidate 也有独立的对象、触发、边界、证据和回返记录，不能因文件存在
  就进入 portable 或 accepted；
- 每个结果都区分 observation、mechanical conformance、semantic review 和 acceptance；
- 每个 `portable-candidate` 都有脱离本仓库的 consumer、边界和相称验证计划；
- 每个 `retain-incubation`、`hold` 或 `no-proposal` 都有理由和 revisit condition；
- 只有 `accepted-portable` 才能产生进入 `skills/` 的 move；
- 采用后的观察可以重新打开处置，不把 move 或文件存在当作行为收敛；
- 完成 ledger 后，再决定是否进入 Work Cell 设计阶段，不提前开始 base 或 DeepSeek Harness 实现。

## 记录

<details>
<summary>展开历史迁移与迭代记录</summary>

### 2026-08-24：建立 ledger

- 触发：用户要求创建 goal、推进 planning 并同时建立迭代改进闭环；
- 观察：8 个 skill 当前均在 `.agents/skills/`，`skills/` 不存在；
- 动作：建立逐项登记和闭环规则；接入 living-skills round-1 审计及专项 round-2/3 评估；
- 结果：8 个均 retain-incubation；当前 portable 处置均为 no-proposal；不提出 merge、split、rewrite、
  downgrade、delete 或 file move；
- 未取得：portable acceptance、文件 move、owner、priority 或实现授权；
- 下一步：将该结果作为整个 planning 总 goal 的一个已完成分支，转向审查 roadmap/plan 中其他可推进 item。

### 2026-08-24：practice-cycle / work-estimation candidate probe

- **触发和来源：** 当前 WorkCell A/B/C/D review 暴露出“结果是否改变下一项最小实践”和“粗粒度
  设计目标如何拆成必要工作图/发现分支”两个重复但不同的 planning 判断；来源是 archive 两个
  skill、`iterative-improvement` theory、现有 item ledger 和实际 review records。
- **准入/边界：** `practice-cycle` 只处理实践结果到下一实践的学习 handoff；`work-estimation`
  只处理状态转移、必要节点、发现分支与决策粒度。二者不合并，不取代 theory、planning authority、
  form-selection、domain owner 或 runtime；两者都有正触发、负触发和最近邻。
- **最小改变：** 从 archive 迁移并按当前项目规则重写两个 `.agents/skills/` candidate；新增
  [`records/method-skill-probe.md`](../records/method-skill-probe.md) 记录实际 planning probe；不进入 `skills/`，
  不复制 archive references，不改变哲学源、WorkCell canonical 或运行时。
- **行为观察：** WorkCell 从“泛化完成设计”被拆成 A/B、C/D review 与 owner/consumer return；每轮
  结果改变了下一项 review 的对象和 return condition；这支持 `behavior-observed`，但不是匹配
  baseline/treatment、独立 semantic review 或接受。
- **当前处置：** 两个 candidate 均 `retain-incubation`；portable `no-proposal` 尚未转为 move
  候选，`skills/` 目录仍不存在。
- **第二轮对照：** P01/P03 reading parent 的内部 baseline/treatment 已追加记录在
  [`records/method-skill-probe-round-2.md`](../records/method-skill-probe-round-2.md)；两个 candidate 都出现了
  `behavior-observed`，但严格归因仍为 `unknown`，处置为 `adapt-and-retest`，不写成 adopt。
- **下一轮 return：** 在不同 planning/design case 上做 baseline/treatment、正例/反例/最近邻/低风险
  一步任务与回归；若现有 theory/ledger 足够或没有独立 consumer，则返回 `no-proposal` 或
  demote，不保留兼容壳。

### 2026-08-25：practice-cycle round 3 core card 与回返

- **冻结对象：** 新建 [`practice-cycle-round-3.md`](../../evals/skill-evaluation/manifests/practice-cycle-round-3.md)
  与 freeze receipt；task 同时包含 Case A 的简单一步反例和 Case B 的设计发现正例，card、task、
  candidate 与上游 protocol hash 均已记录。冻结后不编辑 card、task 或 candidate。
- **运行观察：** baseline 与 treatment 都在 Case A 直接收口；Case B baseline 选择较窄的
  owner/authority discovery 并 `route`，treatment 选择 `continue` 并扩大为完整关系 map 的
  discovery branch。原始返回与 isolation note 见 round-3 runs。
- **独立 review：** `Parfit` 确认 Case A boundary、Case B action/disposition 差异和实现冻结；同时
  指出 excluded-actions/顶层 unknown 字段 schema 不一致，runner identity、model/harness/workspace
  和 candidate activation 只有 unknown/self-report。见 [`method-probe-round-3-practice-cycle-review.md`](../../evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md)。
- **standing 与处置：** 基础 standing 保留为 `behavior-observed`，归因为 `attribution-uncertain`；
  round disposition 为 `adapt-and-retest`，不是 adopt、portable promote、regression-supported 或
  acceptance。`practice-cycle` 继续 `retain-incubation`。
- **下一轮 return：** 不改 frozen card；用同一可核验 runner/model/harness/workspace identity 重跑
  窄 Case B，补 activation proof，强制统一结构化输出，并由未参与生产的 reviewer 复核；若 identity
  仍不可核验，继续保留 behavior observation 上限，不以重复次数制造 matched 结论。

### 2026-08-25：practice-cycle round 4 回归前置条件审查

- 新增 [`records/method-skill-probe-round-4-precondition-review.md`](../records/method-skill-probe-round-4-precondition-review.md)，
  将 round 3 的回返条件排成 E0–E5 顺序工作图：先命名 eval/runner owner，再建立新 frozen card，
  核验 identity/activation，运行窄 case，独立 review，最后回写 standing。
- 当前四项硬前提仍未齐：runner/model/harness/workspace identity 不可核验、activation proof 仅
  self-report、output schema 不统一、Case B treatment 过宽。因此本轮不启动新 Run，不把该记录写成
  matched 或 regression evidence。
- 当前处置为 `source-observed / precondition-review-complete / independent-review-complete /
  route-to-owner / acceptance-pending`；
  `practice-cycle` 保持 `retain-incubation / attribution-uncertain / adapt-and-retest`。若 named
  owner 或前提无法取得，matched 分支收敛为 `no-proposal-now`，但不删除 candidate 或历史观察。

### 2026-08-25：practice-cycle round 3 source-edge applicability closure

- 新增 [`records/evidence-applicability-review-practice-cycle-round-3.md`](../records/evidence-applicability-review-practice-cycle-round-3.md)，只检查 frozen card、candidate、task、AGENTS、Run output、run identity 和 review 的当前 hash edge；不编辑 round 3 或创建 round 4。
- 所有 source/card/task/output/review edge 当前可回读，但 runtime identity、activation proof、schema 一致性、adoption/regression 和 acceptance 仍 unknown；因此最高仍为 `behavior-observed / attribution-uncertain`，不是 matched、adopt 或 regression-supported。
- `practice-cycle` 继续 `retain-incubation`，round disposition 继续 `adapt-and-retest`；`Lagrange` 独立 review applicability record `accept`。下一 return 仍是 named runner/identity/activation/schema owner-return；前提不齐时不重跑、不移动到 portable `skills/`。

### 2026-08-25：planning-inbox round 3 source/applicability closure

- 新增 [`records/evidence-applicability-review-planning-inbox-round-3.md`](../records/evidence-applicability-review-planning-inbox-round-3.md)，只检查 `planning-inbox-round-3` 的 old/new snapshot、fixture、输入、正式 output、events/stderr、run identity 和 blind-review chain；不编辑 frozen round 或创建新 Run。
- 记录的 candidate/snapshot/fixture/protocol/input/output/review edge 当前可按 hash 回读，失败 sandbox 尝试与正式样本分离；但 runtime identity、candidate activation、完整 prompt/harness/权限/隔离以及当前 `planning/inbox.md` / `inbox-history.md` source relation 仍 unknown。
- 因此 round 仍保持 `behavior-observed / boundary-supported / attribution-uncertain`，既有 project-local 处置仍为 `retain-as-project-local-incubating-candidate / adapt-and-observe`；这不是 protocol round disposition，也不是 matched、adopt、regression-supported 或 portable promotion。`Hubble` 独立复核 applicability record `final accept`；前提不齐时不重跑、不移动到 portable `skills/`。

### 2026-08-25：planning-inbox round 2 source/applicability closure

- 新增 [`records/evidence-applicability-review-planning-inbox-round-2.md`](../records/evidence-applicability-review-planning-inbox-round-2.md)，只检查
  round-2 的 manifest、fixture/payload、candidate snapshot、五项 baseline/treatment、run identity、blind review 和 synthesis；不编辑旧 round 或创建新 Run。
- 文件/事件层面 artifact chain 可回读；candidate snapshot、inbox/history 和 `AGENTS.md` digest 与当前不同，
  但这只是 provenance drift，不证明语义变化；served model、完整 prompt/harness/权限/隔离、activation 和 exit 仍 unknown。
- round 最高仍为 `behavior-observed / boundary-supported / attribution-uncertain`，round disposition `adapt-and-retest`；
  `planning-inbox` 继续 `retain-incubation`，仅当前 applicability/re-run proposal 为 `no-proposal-now`。`Plato` 独立 review
  applicability record `final accept`；不重跑、不 move 到 portable `skills/`。

### 2026-08-24：mechanism-design-review project-local candidate

- **触发和来源：** archive `mechanism-design-review` 的独立机制判断，与 living `skill-formation`、
  harness theory 和 WorkCell 四项开放关系 review；当前 `design/work-cell-protocol.md` 已提供真实
  first consumer。
- **准入判断：** 对象是“新增机制是否真的拥有不可由 prompt、已有 owner 或确定性边界承担的唯一
  工作”，而不是实现机制或代码缺陷。正触发、负触发和最近邻分别由机制提案、普通设计表达/已有
  owner 足够、以及 task-shaping、agent-delegation、code-review、systems-engineering 等 owner 区分。
- **最小改变：** 将 archive 语义按项目 authority 重写为 `.agents/skills/mechanism-design-review/`
  candidate；保留 identity→origin→destination、最简单替代、全生命周期负担、observation/review/
  acceptance/action 分离和 unknown；不复制 archive references，不创建 review queue、runtime gate
  或实现计划。
- **行为观察：** WorkCell probe 将“更可靠所以加机制”的粗问题拆为 bounded drain/unknown effect、
  active Binding expiry/revocation、Event replay 和 retry/continue lineage 四个 owner/consumer
  未知，并保留现有分层。该结果支持 planning `behavior-observed`，但没有匹配 baseline、独立 skill
  semantic review、portable consumer、acceptance 或 regression。
- **当前处置：** `retain-incubation`；`skills/` 仍不存在，archive 仍保留，WorkCell、DeepSeek
  system、base/runtime 和用户 harness 构想仍无实现授权。
- **下一轮 return：** 用一个确有新增机制压力的正例、一个 prompt/已有 owner 足够的反例、一个应路由
  给最近邻 owner 的案例和一次 adoption/regression unknown probe，由独立 reviewer 审查；若候选
  不能稳定区分形式或没有真实 consumer，返回 `rewrite`、`demote` 或 `no-proposal`。

### 2026-08-25：mechanism-design-review round 1

- 冻结 card 后完成 baseline/treatment；M1/M2/M3 recommendation 一致，treatment 只显示更完整的
  owner、unknown、停止边界和邻近路由表达，不能支持 candidate-specific matched improvement。
- 独立 reviewer `Jason` 确认 `format-valid`、`behavior-observed` 和局部 `boundary-supported`；M1
  是 fixture-stipulated 的条件性机制观察，M2 的 negative boundary 成立，M3 应补 `skill-formation`
  路由；matched、acceptance、adoption、regression 仍为 `unknown`。
- round disposition：`adapt-and-retest`；carrier disposition：`rewrite + retain-incubation`。不 move
  到 `skills/`，不修改 WorkCell acceptance，不授权 runtime/base。
- raw outputs、hash、运行限制和下一 return 见 [`records/mechanism-design-review-round-1.md`](../records/mechanism-design-review-round-1.md)。

### 2026-08-25：code-review / structural-refactoring 当前处置

- 两个 archive candidate 已完成一次当前 branch 的 source/consumer/boundary review；`code-review` 的
  对象是 accepted intent 下的决策性代码缺陷，`structural-refactoring` 的对象是行为保持的已接受
  结构迁移，二者不合并成万能 development skill。
- 当前没有 accepted-intent code diff、已接受 base implementation 或真实 consequential refactor，
  因此两个候选分别保持 `no-proposal-now / retain-archive-source`，并保留
  `activation-deferred` / `implementation-gated` 与 `candidate-next` 生命周期；没有创建
  `.agents/skills/` carrier，也没有 portable move。
- `Hubble`（`01a03875-9202-7892-8413-2c6b693b23d3`）独立语义审阅 `final accept`；该结论只接受本条
  planning disposition，不接受 skill、行为改善、WorkCell、DeepSeek 或实现。
- 下一 return 是分别取得真实 accepted-intent code change / behavior-preserving refactor、相称
  baseline/contract、正反例、独立 review 和外部 acceptance；在此前 archive source 保留，不为验证
  候选制造 fake diff 或 fake refactor。

### 2026-08-25：外部 consumer applicability check

- **触发与对象：** 为判断当前 11 个 `.agents/skills/` carrier 是否已有可支持 portable move 的
  外部 consumer，检查了当前主 workspace 及已知 sibling workspace `agent-worker` 的 skill authority、
  同名载体和引用关系。
- **观察：** `agent-worker/CLAUDE.md` 明确规定 `agent-worker/skills/` 是 source of truth，
  `agent-worker/.claude/skills/` 与 `agent-worker/.agents/skills/` 都是 projection（后者当前是前者的
  symlink）；其当前 skill source 是另一组载体，未发现本项目的
  `agent-delegation`、`agent-expression`、`concept-articulation`、`dual-audience-expression`、
  `form-selection`、`human-writing`、`planning-inbox`、`skill-formation`、`practice-cycle`、
  `work-estimation` 或 `mechanism-design-review` 被其直接消费或作为同名 source 引用。另观察到
  `agent-worker/skills/attention-driven` 这一语义相邻 carrier；它不是本项目 `attention-management`
  或 11 个 carrier 的直接消费证据，不能被合并计为 consumer。
- **证据边界：** 这是对已检查 workspace/layout 的 `direct-external-consumer-not-found` observation，
  同时保留 `adjacent-carrier-observed` qualifier；它不是对未来所有 consumer 或语义适用性不存在的
  证明，也没有执行 external behavior Run、portable matched probe 或 acceptance。
- **当前处置：** 11 个 carrier 继续留在本项目 `.agents/skills/` incubation；本次检查范围内的
  portable move proposal 收敛为 `no-proposal-now / retain-incubation`。不创建 `skills/` 镜像、不复制
  正文、不修改 `agent-worker`，也不把 agent-worker 的独立 source 当作本项目 adapter。
- **下一 return：** 出现 named external consumer、明确 source/target 和相称 behavior/regression
  evidence 后，再逐项重开 portable review；若只出现项目内 consumer，仍保持当前处置。

### 2026-08-25：`work-estimation` current planning use review

- **触发与来源：** WorkCell Spec identity review 完成后，需要选择继续堆协议字段、等待 owner、提前设计
  DeepSeek、启动不可归因 matched round、继续 Stage A 方法形成或重开历史 evidence；回到现有
  [`.agents/skills/work-estimation/SKILL.md`](../../.agents/skills/work-estimation/SKILL.md)、
  [`whole-planning-work-estimate.md`](whole-planning-work-estimate.md) 和
  [`records/work-estimation-candidate-review.md`](../records/work-estimation-candidate-review.md)。
- **最小观察：** `work-estimation` 只提供状态转移、branch/dependency、discovery、acceptance observation
  和粒度；Main/planning authority 选择 standing/下一 branch。当前 WorkCell case 是 Main 的
  project-local self-application，不是 named consumer、真实 Run 或 carrier-specific failure。
- **独立 review：** `Kepler` 初轮要求收窄 consumer 与处置边界；`Meitner`（`01a03947-bfd5-7872-b955-736b47992328`）
  复读 `accept`，确认 current→target、named consumer 且 decision-changing 的 reopen 条件、以及 current
  case `no-proposal-now` 与 carrier 总体 standing 已分开。
- **当前 standing / 处置：** carrier 总体保持 `retain-incubation / behavior-observed /
  attribution-uncertain / adapt-and-retest`；当前 Main-only case 关闭为 `no-proposal-now`，不改变 carrier
  总体，也不创建第二 carrier、portable move、预算系统或 runtime guarantee。
- **下一 return：** named consumer 且能改变下一计划选择的 case 出现后，才冻结相称 card/identity/schema 并
  重开 carrier evidence probe；否则不累积重复 Main-only 自评，11 个 carrier 继续留在 `.agents/skills/`。

### 2026-08-25：Round 1 meta-matched historical evidence closure

- 新增 [`records/evidence-applicability-review-round-1-meta-matched.md`](../records/evidence-applicability-review-round-1-meta-matched.md)，
  检查旧 `round-1-meta-matched` F1 baseline/treatment/review 是否能回接当前 `skill-formation`。
- 当前观察是 `theory/philosophy.md` hash match、`gene-expression` source drift、旧
  `theory/harness.md` 路径迁移但 content hash match；fixture/protocol freeze edge、candidate hash、activation
  proof 和 full runtime identity 均不可回建，且 trial ledger 没有 dedicated post-freeze entry。
- 因此旧 round 只保留 `historical-only / hold / no-proposal-now` 的当前 applicability 处置；历史的
  `boundary-supported`/`no-proposal` 不转成 current matched 或 portable evidence。`skill-formation` carrier
  继续 `retain-incubation / portable no-proposal`，不修改、不重跑、不移动。
- 下一 return：named consumer/eval owner、current card/source/candidate hash、可重建 runner/model/harness/
  workspace/activation identity、独立 review 和会改变迁移决定的 case 同时恢复后再开新 round；否则保留
  历史链和 unknown。

### 2026-08-25：archive inventory completeness check

[`records/archive-skill-inventory-completeness-review.md`](../records/archive-skill-inventory-completeness-review.md) 对账了
`archive/skills/*/SKILL.md` 与 [`records/archive-skill-inventory.md`](../records/archive-skill-inventory.md) 的逐项表：
实际 29 个 archive 载体与 29 个唯一清单条目集合相等，没有发现漏项或多项。

这只是机械 inventory provenance，当前 standing 为 `inventory-set-match-observed / independent-review-complete /
acceptance-pending`；不把目录完整性写成 skill 形成、portable 或 accepted evidence。11 个 `.agents/skills/`
carrier 的 incubation standing、逐项 consumer/boundary review、`skills/` 不存在以及所有 move/no-proposal
门槛均不变。`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）已独立 `ACCEPT` 本次 completeness
bookkeeping，不取得 skill、portable、move 或实现权；archive 或清单变化、living carrier 迁移或真实
external consumer 出现时 reopen。

### 2026-08-25：living skill placement completeness

[`records/living-skill-placement-review.md`](../records/living-skill-placement-review.md) 对账了当前
`.agents/skills/*/SKILL.md` 与本 ledger 的逐项表：实际 carrier、frontmatter `name` 与 11 个唯一
skill 标识完全一致，没有发现 placement orphan、重复 canonical carrier 或未登记目录。

当前集合级形式决定是 `retain-project-local-incubation / collection-level-portable-placement-no-proposal-now`：
`.agents/skills/` 是依赖项目 authority、路径和局部 consumer 的可发现 incubation entry；`skills/` 目录
当前不存在，且没有足够的 external/portable consumer、脱项目边界、matched/regression evidence 或
acceptance 支持批量 move。这个集合级决定不覆盖本表中 11 个 skill 的逐项 semantic disposition、
portable standing 和 revisit 条件；普通 living 文档与从属于父载体的 reference 也不是同一种形式。

本轮只完成 placement/form bookkeeping：不创建 `skills/`，不移动、复制或删除 carrier，不把目录对账
写成 skill acceptance、portable promotion、runtime guarantee 或实现授权。`Kepler`
（`01a03943-beb2-76b2-b4cd-04e621c8232a`）已独立 `ACCEPT`，仅覆盖 placement review 的文档边界；
carrier、项目 authority、逐项 consumer/evidence 或 portable boundary 变化时 reopen。

### 2026-08-25：practice-cycle E0 named eval/runner owner-surface check

对 `AGENTS.md`、round-3/round-4 probe records、evaluation protocol/trial ledger/manifests、evidence
maintenance 与当前 migration projection 做了 bounded owner-surface check。没有找到同时承担实际
runner/model/harness/workspace identity、activation proof、统一 schema 和运行回返的 named eval/runner
owner；Main 只能发起 discovery，不能代填该 owner。

当前只新增 branch-level observation：`owner-surface-checked / owner-unknown`，并将当前 matched
branch 保持为 `route-to-owner / no-proposal-now`。`practice-cycle` carrier 仍为
`retain-incubation / adapt-and-retest`，round 3 仍为
`behavior-observed / attribution-uncertain`；不创建新 card/Run，不重跑，不升级 matched、regression、
acceptance 或 portable standing，不 move 到 `skills/`，不授权 WorkCell、DeepSeek 或实现。

下一 return 是 named owner 带回 runner/model/harness/workspace identity、activation/non-activation
evidence、schema version/样例、card/task/source hash、允许效果与失败/停止记录；在此前不进入 round 4
E1。`Chandrasekhar`（Agent `01a03956-a4e0-7711-9b9d-5ac406b69b90`）已独立只读 `ACCEPT` 该
source-bounded projection；该 verdict 只接受 migration/owner bookkeeping，不取得 candidate acceptance、
portable promotion、move 或实现权。

### 2026-08-25：current project-instruction applicability drift correction

重新计算 source fingerprint 发现当前 `AGENTS.md` 已从 practice-cycle round 3 frozen card 记录的
`285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379` 变为
`1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`。差异涉及 planned readings inventory
和 archive move 的 source/consumer/boundary review 规则，因此既有 applicability record 的
`instruction-edge-match` 只能保留为历史观察，当前 project-source applicability 改为 `uncertain`。

本次只更新当前 projection，并保留 frozen card、Run、review 和历史 migration entries；不重跑、不生成
新的 semantic claim、不把 source drift 写成 regression/matched、不移动任何 skill。`practice-cycle` 仍为
`retain-incubation / adapt-and-retest`，当前 owner branch 仍 `route-to-owner / no-proposal-now`；下一
return 是用当前 `AGENTS.md` 建立 fresh/superseding card，并取得 named eval/runner owner、runtime identity、
activation proof、统一 schema 与独立 review。round 3 原有 `Lagrange` accept 不覆盖这次 correction。

### 2026-08-25：archive `SKILL.md` source-scope reconciliation

宽扫描 `find archive -name SKILL.md` 得到 76 个文件，但 migration inventory 的 canonical source 仍是
`archive/skills/*/SKILL.md` 的 29 个：另有 37 个 evaluation fixture/served material、9 个 legacy 历史
材料和 1 个 WorkCell package fixture。详见 [`records/archive-skill-source-scope-reconciliation.md`](../records/archive-skill-source-scope-reconciliation.md)。

当前 migration 读取路径已明确为 `retain-canonical-29 / classify-47-as-historical-or-fixture / no-new-migration-proposal`；
这只修正 inventory source scope，不把 76 个文件展开成 76 个 item，不创建 carrier、不 move、不删除
archive，也不改变 29 项已有 source/consumer/boundary disposition。

### 2026-08-25：practice-cycle / work-estimation carrier disposition reconciliation

[`records/method-skill-carrier-disposition-reconciliation.md`](../records/method-skill-carrier-disposition-reconciliation.md)
将早期 `records/design-development-review.md` 的 `candidate-next` 与当前 round evidence 对齐：

- `practice-cycle`：carrier-level `retain-incubation / adapt-and-retest`；当前不可归因 matched branch
  `no-proposal-now / route-to-owner`；下一 return 先取得 named eval/runner owner，再补 identity、activation、
  schema 和窄 Case B；不启动 round 4；
- `work-estimation`：carrier-level `retain-incubation / adapt-and-retest`；当前 Main-only case
  `no-proposal-now / wait-for-named-consumer-and-decision-changing-case`；不继续累积同类 self-application；
- 两者的 portable review disposition 是独立 carrier-level `no-proposal-now`，不由具体 case disposition
  自动推出；两个 carrier 继续留在 `.agents/skills/`，不 move 到 `skills/`。

`Meitner` 已独立 `ACCEPT` 该 reconciliation record。该 verdict 只接受 migration bookkeeping 与
form/boundary projection，不取得 skill semantic acceptance、portable promotion、move、资源承诺或实现权。

### 2026-08-25：archive inventory status-locus reconciliation

`records/archive-skill-inventory.md` 的初筛表仍保留历史 `candidate-next`/`candidate-later` 标签，容易被误读为
当前逐项 disposition。本条明确 status authority：archive inventory 只拥有 archive 集合与 initial triage；
当前 carrier/branch standing 由本文件逐项表、候选 disposition record 和较晚的 dated projection 承载。
因此 `practice-cycle`/`work-estimation` 的 carrier-level `retain-incubation / adapt-and-retest`、
`mechanism-design-review` 的 project-local `rewrite + retain-incubation`，`code-review` 的
`no-proposal-now / activation-deferred / retain-archive-source`，`structural-refactoring` 的
`no-proposal-now / implementation-gated / retain-archive-source`，以及
当时的 `disciplined-development` `candidate-next / activation-deferred / retain-archive-source` 快照，不再被
初筛表中的旧标签遮蔽。

该 reconciliation 的 standing 为 `source-observed / status-locus-corrected / independent-review-complete /
acceptance-pending`；允许效果仅为修正 status projection 和后续回读路径，不创建新 carrier、不移动到
`skills/`、不删除 archive、不提升行为或 portable acceptance。若 inventory、carrier、consumer、owner
或 evidence 发生变化，按逐项 record reopen，而不是重写整个初筛表。

`Kepler`（Agent `01a03943-beb2-76b2-b4cd-04e621c8232a`）完成独立只读复核并 `ACCEPT`：确认 initial
triage 统计仍保留为历史层、四项 current overlay 与逐项 records 一致，且 phase-complete、WorkCell、
DeepSeek 和 implementation 边界未改变。该 verdict 只接受 status projection bookkeeping，不取得 skill
semantic acceptance、portable promotion、move 或实现授权。

### 2026-08-25：`artifact-organization` candidate disposition

[`records/artifact-organization-disposition.md`](../records/artifact-organization-disposition.md) 回读 archive source、
当前 planning authority 与实际 tree：写入该 record 前 `planning/` 根目录有 85 个 Markdown 文件，
其中 66 个是 review/disposition/reconciliation 或其他 process records；record 写入后为 86/67。
该事实支持 layout pressure，也不能单独证明需要移动、创建新目录或形成 skill。

当前处置为 `no-proposal-now / route-to-design / retain-archive-source`。缺少 accepted target layout、
named organization owner、第二个独立可归因的 Agent layout judgment/action gap，以及会改变
discovery/authority/inheritance/rebuildability 的最小 transition；因此不创建
`.agents/skills/artifact-organization/`，不移动、复制或删除 archive，也不创建 organization campaign。
当前的 route-to-design 已形成待接受的 [`design/planning-artifact-organization.md`](../../design/planning-artifact-organization.md)
candidate；它只表达目标形状与 transition 验收条件，不是 accepted layout。
只有 organization design、owner、transition、独立 review 与接受关系出现后，才重开 transition/carrier
判断。该条不改变 29 项 archive inventory、11 个 incubation carrier、portable `skills/` placement 或
WorkCell/DeepSeek/implementation 边界。

### 2026-08-26：剩余迁移候选与波次状态复核

本次只读复核了剩余 archive candidate 和当前 planning wave 状态。没有新的候选同时满足真实 consumer、
named owner、允许范围、可归因 evidence 与最小迁移条件；`code-review`、`structural-refactoring` 和
`artifact-organization` 继续沿各自的 `no-proposal`、`activation-deferred`、`implementation-gated` 或
`route-to-design` 处置，不创建 carrier、不移动 archive、不启动 Run。

复核同时发现 `scope-reconciliation` 在当前入口中仍被写成“开启”，而 checkpoint 已将其收口；该状态已
统一修正为“最近波次已收口，当前等待下一波选择”，并同步静态 footprint。当前 migration standing 仍为
`bounded-review-complete / waiting-for-named-consumer`；本次只形成 `status-locus-corrected /
independent-review-complete / acceptance-pending` 的历史记录，不改变任何 skill semantic、portable、
phase、WorkCell、DeepSeek 或实现 standing。

</details>
