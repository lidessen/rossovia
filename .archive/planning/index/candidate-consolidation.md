# 当前候选集中处置图

consolidation：`consolidation-pass`
source：`source-linked`
relations：`relation-reconciled`
reconstruction：`source-native-reconstruction-observed`
review：`independent-review-complete`
revision：`follow-up-clean`
bulk move：`no-bulk-move`
acceptance：`pending`

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本文件是当前候选的集中发现和路由投影，不替代任何 canonical theory、design、research、planning
authority、skill carrier、eval Run 或 acceptance source。它解决的是一个容易反复发生的混淆：
`candidate` 可能指阅读候选、理论候选、设计候选、研究问题、实验候选或 skill 载体候选；这些对象
不能因为共享一个词就合并成一个生命周期。

## 读取优先级与集中原则

1. 跨 item 的当前 standing 先读 [`item-ledger.md`](../item-ledger.md)。
2. 理论、设计、研究和 carrier 的语义/证据分别回到各自 source；本图只保留对象身份、关系和处置。
3. dated review、历史 archive 和旧 Run 保留 lineage，不因集中而倒写或删除。
4. “集中”只意味着一个发现入口和一张处置关系图，不意味着创建一个新的总 theory、总 skill、总 registry
   或把所有内容复制到一个文件。
5. 没有 named consumer、真实重复 gap、decision-changing counterexample 或相称 acceptance relation
   时，处置为 `done-for-now`、`hold` 或 `no-proposal`，不为了填满候选表继续新增载体。

## 对象分类与当前处置

| 对象族 | 当前 canonical / source | 当前 standing 与 consumer | 集中处置 | 下一回返 |
| --- | --- | --- | --- | --- |
| 哲学序列的 reading packages | [`theory/philosophy/P01.md`](../../theory/philosophy/P01.md)–`P16`；语义根是 [`theory/philosophy.md`](../../theory/philosophy.md) | 16 个 source-bound reading candidate / acceptance-pending；P12/P13/P16 初轮独立 review 已完成并完成条件性修订，follow-up clean；下游方法 consumer 和 acceptance owner 多数仍 unknown；P12/P13 下游 strategy 为 no-proposal-now，P16 下游 adoption/time-window 实践为 cross-boundary-fixture-only | 保持一个父 item 下的有限 packages；不把 reading 当 theory source、skill 或 implementation requirement | source、术语、最近邻、生成关系或 acceptance owner 发生 decision delta 时按 package 重开；等待 acceptance/consumer，不按覆盖率批量创建 strategy/runtime |
| 未采纳的哲学候选 | `theory/philosophy/draft/` 中的 [`bounded-autonomy.md`](../../theory/philosophy/draft/bounded-autonomy.md)、change-rate-layering、controlled-exploration、divide-and-conquer、parsimony-decision-delta、requisite-variety、seeded-regeneration | draft / unadopted；多来自 v0.5 research/interpretation，尚未成为 philosophical sequence、living theory 或当前方法 source | 继续作为未采纳候选和历史研究入口；不因名称相近就并入 P 条目、harness theory 或 skill，不直接改写哲学 source | 只有 source-backed 的新区别、与现行 sequence 的冲突、明确 consumer 和独立 review 同时出现时才重开；否则保持 draft |
| 活树 harness theory | [`theory/harness/theory.md`](../../theory/harness/theory.md)、[`iterative-improvement.md`](../../theory/harness/iterative-improvement.md)、[`planning-inbox.md`](../../theory/harness/planning-inbox.md) | living semantic theory；不是等待迁移的普通 candidate | 继续作为理论 owner；研究、design 和 skill 只能引用或回接，不复制理论正文 | 只有来源解释、生成规则或反例改变时改理论；单次 prompt/文档失败先回到方法或载体 review |
| 通用 harness design candidates | [`default-autonomy-with-correction.md`](../../theory/harness/default-autonomy-with-correction.md)、[`owner-facing-progress.md`](../../theory/harness/owner-facing-progress.md)、[`relational-verification-design.md`](../../theory/harness/relational-verification-design.md) | design-candidate / source-bounded / behavior-unverified / acceptance-pending；planning、WorkCell 是局部 consumer | 三者保留为三个有关系但不相同的 candidate：默认运行关系（含 `focus refresh`）、重大事项例外通道、系统性关系视角；不合成一个大而全的 theory 或 skill | 跨 harness consumer、边界反例、独立 review 和 acceptance 关系出现后分别收敛；当前不选 carrier、不进 runtime |
| harness 主观能动性研究 | [`theory/research/harness-agent-initiative-research.md`](../../theory/research/harness-agent-initiative-research.md) | research candidate / source-read / evidence-follow-up-complete / mechanism-synthesis-revised / applicability-open / no-project-run；真实 consumer、owner 和 runner unknown；研究用临时指称为 `goal-linked bounded initiative`，并以 `goal-linked action loop` 组织目的承接、局部选择、行动可达、后果归因、反馈纠偏和真实结果关系 | 先作为 research 输入，明确“主观能动性”只指可观察的目标关联主动发现、选择、推进、纠偏或合格停止；把方法选择空间与效果权限分开；与 activation、autonomy、proactivity、persistence、planning 和心理动机状态分开；不直接写成意识结论、理论条目或 skill | 形成真实 system-layer consumer 和可比较 baseline/treatment 后，在相同唤醒预算与 effect boundary 下比较 reactive、bounded choice 和 goal-linked action loop，再决定是方法、skill、runtime 还是仅保留研究输入 |
| WorkCell 协议设计 | [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；`planning/records/workcell-*.md` 为 child records | design candidate / source-applicability 分项回读 / protocol acceptance pending；named owner/consumer 未确认 | design 继续由协议 source 拥有；child review 只回接局部字段、关系和未知；不因 review 数量创建新的协议层 | owner-backed decision 或改变 contract 的反例；在此以前不实现、不把 executor 或 harness 研究写进 core |
| planning artifact organization | [`design/planning-artifact-organization.md`](../../design/planning-artifact-organization.md)；[`records/artifact-organization-disposition.md`](../records/artifact-organization-disposition.md) | design candidate；当前 `no-proposal-now / route-to-design / retain-archive-source` | 作为 layout/transition 设计，不创建 artifact-organization skill，不把 planning records 搬成另一套权威 | accepted target layout、named organization owner 和重复行为 gap 同时出现时重开 |
| whole-work coordination | [`whole-work-coordination-candidate.md`](whole-work-coordination-candidate.md) | planning candidate / carrier-not-selected；planning 是当前 consumer，整体 owner 仍由 main goal 持有；`goal-linked bounded initiative` 作为可被统筹消费的局部行为关系 | 保持 planning projection；吸收通用 harness 的 relational/default-autonomy/owner-facing 关系，把 initiative candidate 接回整体 wave/fan-in/checkpoint，不复制成 generic theory 或“并行 skill” | 真实重复的独立判断差距、稳定 consumer、正反例和独立 review 出现后，才按 `skill-formation` 判断载体 |
| 当前 11 个 incubating skills | 项目入口为 `.agents/skills/`；逐项 standing 见 [`skill-migration.md`](skill-migration.md) | 8 个既有 carrier 为 retain-incubation；`practice-cycle`、`work-estimation`、`mechanism-design-review` 为 project-local method candidate；portable `skills/` 为 0 | `.agents/skills/` 是已经作出的 project-local form decision，不是未纠正的错放；不建立 portable 镜像；不把三个通用 harness candidate 直接塞入 skill | 逐项 named consumer、脱项目边界、matched/regression/acceptance 关系出现后单项 review；不批量 move |
| archive skill candidate pool | [`planning/records/archive-skill-inventory.md`](../records/archive-skill-inventory.md)、[`records/next-candidate-review.md`](../records/next-candidate-review.md)、各 disposition record | historical source / candidate-next、candidate-later 或 no-proposal；不是 current carrier | 保留 source、历史证据和当前不迁移理由；`code-review`、`structural-refactoring`、`disciplined-development` 等不因“有价值”自动进入 living path | 真实 consumer、accepted intent/contract、独立 review 和 acceptance 出现时按单项重开 |
| research records and external readings | `theory/research/`；代表性入口为 [`agent-harness-throughput-research.md`](../../theory/research/agent-harness-throughput-research.md)、[`harness-agent-initiative-research.md`](../../theory/research/harness-agent-initiative-research.md)、[`records/iterative-loop-learning-analogy-review.md`](../records/iterative-loop-learning-analogy-review.md)、[`records/research-reading-candidate-jitrl.md`](../records/research-reading-candidate-jitrl.md) 与 [`records/research-reading-candidate-foreagent.md`](../records/research-reading-candidate-foreagent.md) | research evidence、research candidate、applicability record 三种 standing 分开；PL-10 仍为 `research candidate / candidate`，JitRL 与 FOREAGENT 已完成窄读和适用性对账；这些都不等于 theory acceptance | research 继续作为来源、推论、矛盾和 unknown 的 owner；throughput、JitRL、FOREAGENT、主观能动性与 PL-10 类比保持各自 current record；其它 review 不晋升为 theory/skill | source、consumer、runner、decision delta 或适用性改变时按原 record 回接；不把论文/历史 review 当项目 Run |
| experiment / eval candidates | [`records/concept-fragment-output-disposition.md`](../records/concept-fragment-output-disposition.md)、[`records/conflict-role-integration-review.md`](../records/conflict-role-integration-review.md)、roadmap candidate 和 [`living-skills-round-1.md`](../../evals/project-audit/living-skills-round-1.md) | candidate definition / hold / no-proposal 或 future experiment/eval；PL-12 已完成七对象 definition review 但仍依赖 PL-11 与真实 consumer；当前未授权用户构想 Run | 保留 hypothesis、变量、接受与 evidence 缺口；实验原型归 `experiments/`，protocol/Run/review/evidence 归 `evals/`；不把本体论统一自我或 consciousness 作为当前实验指标 | named consumer、可重建 identity、baseline/treatment、独立 review 和 acceptance 成立后再开 Run |
| DeepSeek Harness 工作系统 | [`planning/plan.md`](../plan.md)、[`roadmap.md`](../roadmap.md) | architecture candidate / active-after-prerequisite；依赖 WorkCell design acceptance | 只保留后续系统设计方向；不把当前 generic theory、JitRL 或 throughput research 误写成系统设计已经接受 | WorkCell 设计通过明确接受关系后，才形成 system-layer bounded design |

## 关系回接图

```text
哲学 source / living theory
          ↓ 生成与约束
method candidate / design candidate / research question
          ↓ 选择最小真实载体
skill carrier / project document / experiment or eval candidate
          ↓ 在具体 consumer 中激活
行为、产物、effect、observation、unknown
          ↓ 独立 review 与 acceptance
保留 / 修订 / 降级 / move / reopen
          ↺ 只沿实际受影响关系回接，不全局污染
```

这里的 `method candidate`、`design candidate` 和 `research question` 不是同一层：前者假设某种可
重复的方法可能有用，后者约束协议/系统形状，最后者还没有足够依据成为方法。`skill carrier` 也
不是 method 本身；它只是在真实选择性加载关系成立时的一种表达形式。

## 本轮集中决定

### 保留而不合并

- 三个通用 harness candidate 的相邻关系已经明确，但它们分别回答“默认怎么运行”“何时需要把问题
  交给 owner”“局部改变如何回看验证系统关系”，合并会抹掉触发和失败边界。
- `practice-cycle`、`work-estimation`、`mechanism-design-review` 也不合并为 development skill：
  一个消费实践结果，一个恢复工作图，一个审查是否值得增加硬机制。
- 哲学 reading、research record、design candidate 和 skill carrier 不因都写了“当前未知”而合并。

### 已确认的错放风险与修正

- `.agents/skills/` 不是“还没有搬出去”的临时目录；它是当前 project-local incubation 入口。
- 通用 harness 机制没有错放到 `.agents/skills/`；当前三个通用 candidate 均在 `theory/harness/`，
  尚未选择 carrier 是有意的。
- `theory/research/` 的论文、review 和适用性记录不能冒充 theory source、skill acceptance 或 eval
  evidence；各自保留 research standing。
- `planning/` 的 review/ledger 是跨对象的 projection/lineage，不反过来成为 WorkCell、theory 或
  skill 的 canonical 正文。

### 当前不做

- 不批量移动、复制、删除或重命名现有 candidate/skill；不建立 portable `skills/` 镜像。
- 不因“主观能动性”这个新问题立即创建 `initiative` skill、motivation registry、scheduler 或
  runtime 状态；先完成研究并找到真实 consumer。
- 不启动新的 sibling review wave；没有 decision delta 的重复 self-application 直接 `done-for-now`
  或 `no-proposal`。

## 下一项最小实践

1. 以本图为当前候选发现入口，后续任何新 candidate 先登记对象类型、canonical owner、consumer、
   standing、允许效果和 revisit，再决定载体。
2. 只有在出现真实 system-layer consumer、named research/eval owner、可比较 baseline/treatment，且
   确实存在“等待会拖慢、主动做错有代价”的场景后，才打开“主观能动性”研究的窄问题：在相同唤醒
   机会和 effect boundary 下，检验 `goal-linked action loop` 是否能让 Agent 从目的/缺口形成局部选择，
   把行动与后果归因，并根据反馈继续、纠偏、停止或回 owner；把安全越权、无效忙碌、重复轮询、过度
   打扰和反馈导致的全面沉默作为反例一起定义。前述关系未出现时保持 `no-proposal-now`，不打开研究
   wave。
3. 研究 wave 真正打开后，先固定唤醒预算，比较 reactive baseline、bounded choice 和 `goal-linked
   action loop`，不先比较“人格 prompt”或模型名称；若没有机会暴露、行动 affordance 或后果可见性，
   先判断是 activation/affordance/observability 缺口，不把它误归因于主动判断。
4. 这项研究返回后，按 relational-verification-design 检查它对默认自治、owner-facing exception、
   skill routing、throughput、WorkCell observation/evidence 和后续 DeepSeek system 的影响；只更新
   受影响的 authority/projection。

## 出口与回返

本轮 consolidation 的出口是：候选对象可以按类型找到唯一 canonical/record owner；三类相邻
candidate 没有被错误合并；`.agents/skills/` 的 placement 结论明确；新研究问题拥有独立的
research standing；没有新实现授权。若出现 source revision、named consumer、重复 gap、
decision-changing counterexample、owner/acceptance 变化或 adoption regression，则只重开受影响的
对象族，并在 checkpoint 再检查整体关系。
