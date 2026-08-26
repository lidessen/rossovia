# Planning 全局覆盖审计

coverage：`coverage-observed`
projection：`projection-reconciled`
reconstruction：`reconstruction-observed`
review：`independent-review-complete`
revision：`follow-up-clean`
acceptance：`pending`；初版扫描保留为历史
baseline；不是第二份 roadmap、理论、eval ledger 或实现计划。

本文件检查当前主 goal 所要求的 planning 面是否已经有可回读的 item identity。它区分
canonical source、planning item、research evidence、eval record、experiment candidate 和
incubating skill；目录或文件存在本身不产生接受、运行事实或实现授权。

## 1. 覆盖规则

一个对象只有在它有独立的目标关系、consumer/owner、依赖和可改变的下一判断时，才进入
`planning/item-ledger.md` 的独立 item。P01–P16 有独立 source line 和 reading 工作，但
仍由一个父 item 共同拥有；下文的 16 行是有限 work package，不是 16 个互相竞争的
canonical planning item。下面这些情况不自动拆成 item：

- theory/research 记录只是某个 theory、skill 或设计的来源证据；
- evals 中的 fixture、Run、review 和 ledger 只是候选的证据链，不是新的 planning commitment；
- experiments 中的原型或视觉探索没有冻结 hypothesis、consumer 和接受关系；
- planning/inbox 的 raw、receipt 和 clear 事件只是输入 lineage，不是执行队列；
- 多个文件共同表达同一 planning item 时，保留一个 item identity，并在 source map 中列出边。

## 2. 当前 source family 与处置

| source family | 当前 canonical / standing | 是否是独立 planning item | 当前可推进部分 | 不得推出 |
| --- | --- | --- | --- | --- |
| 哲学序列源行 | `theory/philosophy.md`；living source，一行一条 | 是：P01–P16 readings 计划 | 逐条建立 reading，保持源行不变 | 研究、skill 或 review 自动改写 P 源 |
| 哲学/生成理论 | `theory/gene-expression.md` 与 `theory/philosophy.md`；living theory/source | 否，除非出现明确 theory revision | 作为 readings 和下游方法的来源约束 | theory 文件本身是运行时或普通 skill 输入 |
| 未采纳哲学候选 | `theory/philosophy/draft/*.md`；unadopted candidate source，当前不属于 philosophical sequence 或 living theory | 否；除非出现明确的 source/理论 revision、真实 consumer 和接受关系 | 保留候选来源、区分其与现行 source 的地位；不按目录完整性补 reading、改 source 或进入 runtime | draft 文件存在、历史讨论或名称相似不能推出 living theory、P reading、skill、acceptance 或实现授权 |
| living method / design theory | `theory/agent-delegation.md`、`theory/concept-articulation.md`、`theory/expression.md`、`theory/skill-formation.md`；living method/design sources，各文件保持独立权威 | 通常不是 4 个独立 planning item；由 design/development skill suite、WorkCell、throughput 和对应 carrier 按真实 consumer 承载 | 做 source/standing、最近邻、理论关系和 source-revision 回读；必要时把变化接回对应 item；不把理论全量注入普通 skill、eval Run 或 runtime | theory 正文存在、静态 review 或 carrier 引用不能推出 behavior、matched、acceptance、portable move 或 runtime guarantee |
| harness / iterative theory | `theory/harness/theory.md`、`theory/harness/iterative-improvement.md`、`theory/harness/planning-inbox.md`；living design/method sources，各文件保持独立权威 | 不按文件拆 item；迭代闭环关系由 PL-02 承载，planning-inbox 由对应 carrier/输入关系承载，harness 主理论由 WorkCell/throughput 等真实 consumer 承载 | 在对应 planning/design round 中记录 baseline、delta、未知、review、接受、采用后回归；source revision 只回接实际 consumer | 静态接受等于行为改善、收敛、skill acceptance 或 runtime 保证 |
| theory/research | `theory/research/*.md`；research evidence / candidate / review，按文件各有 standing；JitRL 与 `harness-agent-initiative-research` 是已窄读并完成局部 mechanism synthesis 的外部/system-layer research 输入 | 通常不是；由其指向的 theory/skill/design item 承接；JitRL 和主观能动性研究当前都不是独立顶层 planning item | 对 source、冲突、反例、未知和回返条件做 lineage；只有真实 memory/experience consumer、主动性 consumer 或明确 system-layer comparison 出现时，才另行定义独立对象 | research record 自动成为 theory、P、skill 或 acceptance |
| planning inbox | `planning/inbox.md`、`inbox-history.md`；raw/receipt lineage | 当前无 pending item；已清批次的候选已投影到 roadmap/ledger | 新输入先保留 raw，再按 owner 路由 | inbox 清空等于完成、接受或执行 |
| evals | `evals/skill-evaluation/`、`project-audit/`；protocol、fixture、Run、review、evidence；详见 `planning/index/evidence-maintenance-review.md`、`records/evidence-applicability-review-living-skills-round-2.md`、`records/evidence-applicability-review-planning-inbox-round-2.md` | 是一个 evidence-maintenance item；具体 candidate 由各自 owner 认领；mechanism round 1、living skills round-2 和 planning-inbox round-2 已有历史 applicability bookkeeping；planning-inbox round-1 另有静态失效预注册 review | 按现行 protocol 标记 stale/unknown，必要时开新 round；先做 applicability check，不批量重跑；source drift 先追加 stale/recovery，不倒写旧 Run；round-1 保持历史失效预注册，不修旧 card | 历史 Run 或格式校验证明当前 skill/系统有效；ledger closure/applicability record 也不证明 current applicability、matched 或 acceptance；round-1 静态 review 不证明行为 |
| 不完整历史 eval 目录 | `evals/kb-representation-evaluation/`、`human-agent-visualization/`；当前只有 generated artifacts，旧 experiment source/evidence 位于历史路径；`human-agent-visualization` 与 `kb-representation` 均已有 bounded applicability review | `hold / archive-only`，不进入主线 commitment | 只有找到 current source、hypothesis、consumer、evidence owner 和 exact lineage，或建立新 card，才重开；历史 probe 不直接继承 | generated 图片或目录名赋予 eval standing；历史链与当前 artifact 不做无证据合并 |
| experiments | `experiments/` README 及现有原型；prototype/form exploration；PL-11 另有 [`records/concept-fragment-output-disposition.md`](../records/concept-fragment-output-disposition.md) 的 source-bound candidate definition；详见 `planning/index/evidence-maintenance-review.md` | 当前不形成 Run；PL-11 仍是 roadmap experiment candidate | 为每个真正要推进的构想补 hypothesis、baseline、consumer、接受和证据关系；当前 prototypes 与 PL-11 均不启动 Run | 可运行、可展示、定义完成或有多个 variant 等于实验结论、内部思维证据或系统设计 |
| planning artifact organization | [`design/planning-artifact-organization.md`](../../design/planning-artifact-organization.md)；design candidate，接受与 transition 均未成立；[`records/artifact-organization-disposition.md`](../records/artifact-organization-disposition.md) 只负责 archive candidate 的 route-to-design | 否；作为 planning/layout 组织候选嵌入 archive migration 与 planning authority 的现有 item，不创建独立 item | 维护 current layout observation、authority/lifecycle 不变量、owner/acceptance unknown 和 transition 回返条件；待 named owner 与 accepted target layout 后再决定是否形成 bounded transition | design candidate 等于 accepted layout、`records/` 迁移授权、artifact-organization skill 或 cleanup |
| `.agents/skills/` | 当前 11 个项目内 incubating carriers（8 个已有、3 个本轮新增）；逐项 review 已记录或待按 candidate round 回返；round-2 family 与 planning-inbox round-2 的历史产物/当前适用性见对应 applicability records | 已由 skill-migration/item-ledger/evidence maintenance 覆盖 | 新 consumer、差距或回归出现时重开；practice-cycle round 3 已完成 card/run/review，round 4 前置审查已独立复核但确认仍缺可核验 identity、activation proof、统一 schema 和 named owner；living skills 与 planning-inbox round-2 均只完成历史适用性 bookkeeping，暂不启动新 Run；继续不晋升 portable | 载体格式通过等于方法行为接受；历史 `behavior-observed` 与 current applicability uncertainty 不等于 matched、regression、acceptance 或 portable move |
| archive skills/design | v0.5 historical source | 已由 inventory 与两批 review 覆盖，不逐个复制；`candidate-next`/`candidate-later` 是 inventory 的初筛层，当前逐项处置以 `skill-migration.md`、candidate disposition record 和 dated overlay 为准；`attention-management` 的 bounded applicability return 已收敛为 `no-proposal-now / archive-only` | 只对 current disposition 仍允许且出现真实 consumer 的项恢复 consumer/boundary probe；无 consumer 则保留 current disposition，不从初筛标签重开 | archive 文件是 living authority 或迁移授权 |
| WorkCell design | `design/work-cell-protocol.md`；`planning/records/workcell-*.md` 为全部关联 WorkCell planning records，`planning/records/evidence-applicability-review-workcell-*.md` 为 applicability records；design candidate | 是 | canonical protocol/record contract 是 record review、field-boundary review 与 integration review 的 design consumer；四个开放关系、RunRecord/Binding identity、declaration/grant/call/observation/record/check/review/acceptance 字段权威的有限设计回返；各 child 的 standing、source applicability 和 provenance 由对应 record 与 item-ledger 回读，不在本行复制完整清单；digest、snapshot retention、reference correction、late observation、lineage retention、effect-specific payload、owner-backed correlation 与 limit enforcement 均独立 unknown；integration review 只允许 `runId` 作为当前安全 join，不是 canonical shape 或总 status；retry/continue 可复用父 Binding，`bindingRef` 不承担 lineage | design candidate 或 review 不等于 protocol acceptance；B4 只是 design/auditability hypothesis；没有 named external record consumer 时不能写成实际失败或把 `bindingRef` 写成 retention/lineage guarantee；CompletionAction return view 不当 host observation，EffectSummary `observed` 不当 confirmed effect，Usage provider report 不当 host limit fact；integration review 不产生总 status、dedup registry、meter、runtime 或 implementation authorization |
| DeepSeek Harness 工作系统 | `planning/plan.md`、`roadmap.md`；architecture candidate | 是，前置于 WorkCell 接受 | 保留系统对象、边界和比较问题 | 先实现 base 或由 adapter 习惯决定架构角色 |

## 3. P01–P16 reading work-package map

这张表只把父 item 下的 16 个 source entry 展开成可追踪的有限 work package；它不改变
`theory/philosophy.md`，也不把 source line 预先写成 accepted reading。当前统一 owner 类别是“哲学
reading producer + 显式 source/acceptance owner”；具体 named owner 仍 `unknown`。P01/P02/P04、
P04/P08、P05/P07/P09、P06/P11、P07/P10、P12/P13、P15/P16 的关系审查必须在父 item 层
完成，不能由各行单独宣称完成。

每个 reading 的共同出口是：指回一条未改动的 source line；说明对象、属、极/对立端和最近邻；
给出至少一个能从该 entry 生成的方法/设计判断；区分 source、解释、候选与未知；经独立人类
review 后才可作为 reading 保留。reading 不是普通 skill 激活的运行依赖。

| item | source entry | 当前 standing | 当前 bounded contribution | 依赖 / revisit |
| --- | --- | --- | --- | --- |
| P01-reading | `实事求是`；`theory/philosophy.md` P01 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 父 item 已形成 scoped object identity 与 P01→P03 source-constraint relation；`records/philosophy-p01-p03-counterexample-fixture.md` 已形成 Pair A–D 的具体边界并完成 fixture-level 独立 review；当前只允许用该 fixture 继续路由 P02/P04/P15 与 broader cross-relation，P01 reading acceptance 仍未知 | 依赖 gene-expression 术语、显式 acceptance owner 和父 item object identity；P02/P04/P15 最近邻、source、fixture 覆盖或 acceptance owner 变化时 stale/reopen |
| P02-reading | `没有调查，没有发言权`；P02 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“相关调查→证据资格”的最小定义，区分局部观察、问题、假设、证据性断言和接受/处置决定；P01/P04/P03/P15/P08 最近邻已独立复核 | 依赖 P01 的来源边界、P04 的已知/未知和具体 domain/use；具体调查范围或 acceptance owner 改变时 revisit；见 `records/philosophy-p02-reading-review.md` |
| P03-reading | `实践、认识、再实践、再认识`；P03 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open；behavior adapt-and-retest | 父 item 已形成固定对象的四段生成性案例；`records/philosophy-p01-p03-counterexample-fixture.md` 的 Pair C/D 已具体区分“下一判断改变”与重复观察/检验时点，且完成 fixture-level 独立 review；P03/P15/P16 的完整 cross-relation、reading acceptance 和行为证据仍未知 | 依赖 iterative-improvement theory、显式 acceptance owner 和父 item object identity；新 source、对象范围、fixture 覆盖或闭环语义改变时 stale/reopen |
| P04-reading | `知之为知之，不知为不知`；P04 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成已知/未知的最小定义和 P01/P02/P03/P08/P15 最近邻；P04/P15/P16 boundary review 的 B1-B4 已经独立复核，明确 knowledge state、test method、time coverage 与 acceptance 分离；接受仍未知 | 依赖 P03/P15 的检验边界、domain/use 证据充分度和父 item acceptance；unknown contract 改变时 revisit |
| P05-reading | `具体问题具体分析`；P05 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“会改变分析的特殊条件”最小定义、P01/P04/P06/P07/P08/P09 最近邻和一正一反成对案例；明确下游 owner/protocol 才重新评估处置；接受仍未知 | 依赖 concept/agent-expression 边界、P07/P08/P09 父关系和具体 domain/use；对象定义改变时 revisit |
| P06-reading | `为学日益，为道日损`；P06 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“保留承重关系、删除不改变当前判断的复杂性”的最小定义，区分 P05 特殊性、P07 入手点、P09 主次、P11 扰动/成本和 P04 unknown；已完成独立 source/边界 review | 依赖 form-selection/iterative theory、P06/P11 阶段切割和具体 domain/use；若删减与执行 owner/失败方式无法区分则 revisit；见 `records/philosophy-p06-reading-review.md` |
| P07-reading | `天下难事，必作于易`；P07 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“与目标有真实关系、范围可界定且能改变下一项判断的可行入口”最小定义，区分 P05 特殊条件、P06 简化、P09 主次、P10 时机和 P04 known/unknown；见 `records/philosophy-p07-reading-review.md` | 依赖 planning/task shaping 的后续边界和具体 domain/use；若入口与主次/时机无法区分则回修；接受仍未知 |
| P08-reading | `井蛙不可语海，夏虫不可语冰`；P08 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“明确对象、视域、时间和语境的适用范围，跨范围不直接外推而重新问题化”的最小定义，区分 P04 known/unknown、P05 特殊条件、P07 入手点、P09 主次和 P12 对抗信息；P04/P08 boundary fixture 已独立复核；见 `records/philosophy-p08-reading-review.md` | 依赖 concept/agent-expression、具体 domain/use 和真实 Agent route/P05/P08 fixture；跨视域 handoff 或 scope 字段变化时 revisit；接受仍未知 |
| P09-reading | `抓住主要矛盾`；P09 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“在同一对象、目标、范围和约束内识别会改变其他冲突、关键约束或下一判断的局部承重冲突”的最小定义，区分 P05 特殊条件、P07 入手点、P08 scope、P10 时机和 P11 扰动成本；见 `records/philosophy-p09-reading-review.md` | 依赖 agent-delegation/iterative theory、具体 domain/use 和同对象 conflict fixture；整体权威或依赖关系改变时 revisit；接受仍未知 |
| P10-reading | `为之于未有，治之于未乱`；P10 | source-current；reading-candidate；independent-review-complete；research-open；acceptance-pending | 已形成并完成独立 source/边界 review 的解决阶段介入窗口 candidate，与 P07 的分析入口保持同一候选关系的条件性边界；不生成固定提前量 | 依赖外部 owner、accepted effect、可观察 state/risk window 和 P07/P10 boundary；前提或 review 变化时 revisit；见 `theory/philosophy/P10.md`、`records/philosophy-p10-reading-review.md` |
| P11-reading | `治大国若烹小鲜`；P11 | source-current；reading-candidate；independent-review-complete；research-open；acceptance-pending | 已形成并完成独立 source/边界 review 的解决阶段执行扰动/成本 candidate，并与 P06 的分析删减保持同一候选机制关系的条件性边界；不生成预算、阈值或 runtime 优化策略 | 依赖外部 owner-backed contract/effect、可观察执行路径、风险/回退关系和 P06/P11 boundary；前提或 review 变化时 revisit；见 `theory/philosophy/P11.md`、`records/philosophy-p11-reading-review.md` |
| P12-reading | `知彼知己，百战不殆`；P12 | source-current；reading-candidate；research-open；independent-review-complete；conditional-revision-applied；follow-up-clean；acceptance-pending | 已从 source line 重建最小 reading、P12/P13/P02/P04/P08/P09/P15 最近邻和生成性边界；独立 review 已发现固定清单与 effect/判断权限风险并完成最小修订、follow-up clean；当前没有实际对抗 actor 或竞争性 consumer，因此不形成行为、策略或 runtime 结论 | 依赖 named acceptance owner，以及未来的 adversarial consumer；对抗关系或下游 effect 出现时重开；见 `theory/philosophy/P12.md`、`records/philosophy-p12-p13-p16-reading-review.md` |
| P13-reading | `避实击虚`；P13 | source-current；reading-candidate；research-open；independent-review-complete；conditional-revision-applied；follow-up-clean；acceptance-pending | 已从 source line 重建 response 选择的最小 reading、P12/P13/P09/P10/P11/P04 最近邻和生成性边界；独立 review 已指出“虚”不可直接固定为低阻力/低成本分类并完成最小修订、follow-up clean；当前没有可区分的对抗 response effect，因此不推出攻击策略、资源调度或 runtime routing | 依赖 distinct response effect、authority 与 named acceptance owner；真实关系出现时重开；见 `theory/philosophy/P13.md`、`records/philosophy-p12-p13-p16-reading-review.md` |
| P14-reading | `名不正则言不顺`；P14 | source-current；reading-candidate；independent-review-complete；acceptance-pending；research-open | 已形成“在对象/关系足够可区分后选择能稳定指向、避免最近邻误判并支持行动的 designation”的最小定义，区分 P01 source、P04 known/unknown、P08 scope、P06 承重删减和 P15 实践检验；`cellInput` 仅作命名 observation；见 `records/philosophy-p14-reading-review.md` | 依赖 concept-articulation/expression、WorkCell 对象/生命周期/受众/owner 收敛和 bounded naming review；canonical naming 或对象关系改变时 revisit；接受仍未知 |
| P15-reading | `实践是检验真理的唯一标准`；P15 | source-current；reading-candidate；independent-review-complete；research-open；acceptance-pending | `practice-cycle` round-3 已提供真实 planning/design practice consumer；`records/philosophy-p15-practice-use-case.md` 形成 P15-U1，Case A/B/C 已完成独立边界 review；round-3 仍只有 `behavior-observed / attribution-uncertain`，不支持 P15 reading acceptance、matched 或 regression；B1–B4 仍是 hypothetical boundary fixture | 依赖 P15 reading/use-case acceptance owner、相称 evidence 和后续边界实践；P16 的 adoption/time-window consumer 仍独立；见 `records/philosophy-p15-reading-review.md` 与 `records/philosophy-p15-practice-use-case.md` |
| P16-reading | `慎终如始，则无败事`；P16 | source-current；reading-candidate；research-open；independent-review-complete；conditional-revision-applied；follow-up-clean；acceptance-pending | 已从 source line 重建检验时点的最小 reading、P15/P03/P10/P04/P11 最近邻和生成性边界；独立 review 已指出默认全套时点、P03 重叠与 owner authority 风险并完成最小修订、follow-up clean；既有 B1–B4 仍只支持 time-coverage boundary，不形成全程保证、长期监控或 regression | 依赖 adoption/observation consumer、相称窗口、风险/效果 owner 和接受关系；关系改变时重开；见 `theory/philosophy/P16.md`、`records/philosophy-p12-p13-p16-reading-review.md` |

### 父 item 的交叉关系审查

P01/P03 的 scoped object identity、来源约束—观察回返关系和固定对象四段案例见
[`planning/records/philosophy-parent-review.md`](../records/philosophy-parent-review.md)。该记录已完成独立 review，
standing 为 `cross-relation-observed / acceptance-pending`；它不取得 source authority，也不关闭
P01–P16 父 item 的最终接受。具体成对边界 fixture 见
[`records/philosophy-p01-p03-counterexample-fixture.md`](../records/philosophy-p01-p03-counterexample-fixture.md)；
它已完成 fixture-level 独立 review，支持 route distinction，但不取得 reading、behavior 或
acceptance standing。

P04 与 P15/P16 的 knowledge-state / test-method / time-coverage boundary fixtures 见
[`planning/records/philosophy-p04-p15-p16-boundary-review.md`](../records/philosophy-p04-p15-p16-boundary-review.md)。
B1-B4 已独立复核；B2 是同一 Binding 对象上的 hypothetical fixture，mechanism round raw output
只作另一个对象的 attribution 旁证。该 boundary record 本身仍为 `design-boundary-observed /
acceptance-pending`；P15 已由 [`records/philosophy-p15-reading-review.md`](../records/philosophy-p15-reading-review.md)
另行形成 reading candidate；P16 也已形成 source-bound reading candidate，初轮 reading review 已完成并完成条件性最小修订，修订后 follow-up 已 clean，acceptance 仍 pending。

P04 与 P08 的“知识状态—问题边界”区别见
[`planning/records/philosophy-p04-p08-boundary-review.md`](../records/philosophy-p04-p08-boundary-review.md)。F1 固定同一
design/host scope 但证据不足，F2 只改变一个 scope 维度并要求重新问题化，F3 保留局部已知/被支持
观察但不推出 acceptance；三案由 `McClintock` 独立 `ACCEPT`。该 relation 当前为
`design-boundary-observed / independent-review-complete / acceptance-pending`，不创建 P04/P08 新
reading、不把 scope 变成 runtime router，也不取得父 item acceptance。

P05 candidate 的具体案例已覆盖“承重条件改变分析”与“背景增加但判断不变”两类边界；
[`planning/records/philosophy-p05-p07-p08-p09-boundary-review.md`](../records/philosophy-p05-p07-p08-p09-boundary-review.md)
已用同一个 Binding expiry/revocation design object 建立 C1-C4 fixture，分别观察特殊性、入口、
问题范围和主次；已完成独立 review。P07/P08 已另形成 reading candidate 并完成独立 source/边界
review，P09 已另形成 reading candidate 并完成独立 source/边界 review；这组 boundary fixture 不能
替代这些 reading review，也不形成新的 P09 acceptance。

P01/P02/P04 的来源—调查资格—已知边界 fixtures 见
[`planning/records/philosophy-p01-p02-p04-boundary-review.md`](../records/philosophy-p01-p02-p04-boundary-review.md)。
F1/F2/F3 在同一 WorkCell replay claim 上区分 source 存在、调查后可提出的限定断言和 accepted
contract scope 内的 known；F3 是 future contract fixture，不是当前 protocol authority。该关系已
完成独立 review，仍为 `design-boundary-observed / acceptance-pending`。

P06/P11 的简化—扰动成本边界见
[`planning/records/philosophy-p06-p11-boundary-review.md`](../records/philosophy-p06-p11-boundary-review.md)。
F1/F2/F3 区分分析阶段删除非承重复杂性与解决阶段控制 accepted effect 的扰动；它们是同一候选机制
关系的条件性设计演化，不代表同一 runtime object；P11 当前为 `reading-candidate / independent-review-complete /
research-open / acceptance-pending`，该关系和 P11 source/边界 review 均已独立完成，但不取得 reading acceptance。

P07/P10 的入口—时机边界见
[`records/philosophy-p07-p10-boundary-review.md`](../records/philosophy-p07-p10-boundary-review.md)。F1/F2/F3 固定同一条
候选 Binding expiry/revocation 关系从当前未知到 owner/protocol 条件成立的条件性设计/standing 演化，
区分 bounded design review 内的分析入口与未来允许效果的介入窗口；具体 Binding identity 仍 unknown，
P10 当前为 `reading-candidate / independent-review-complete / research-open / acceptance-pending`，该关系
和 P10 source/边界 review 均已独立完成，但不取得 reading acceptance。

P08 reading candidate 已完成独立 source/边界 review；当前保持 `retain-candidate / acceptance-pending`，
不把问题边界写成能力、权限、拒答或 runtime scope 机制。P04/P08 同一对象 fixture 已完成；下一
return 是真实 Agent reading/route 任务，或相称的 P05/P08 同一对象 fixture；若实际任务不能改变
claim strength、owner route 或下一动作，则该 relation 返回 `no-proposal`，不继续扩写。

P09 reading candidate 已完成独立 source/边界 review；当前保持 `retain-candidate / acceptance-pending`，
只支持同一 scope 内的局部主次判断，不取得全局 priority、任务排序、owner 路由、资源分配或 runtime
scheduler 权。后续需回读既有 P05/P07/P08/P09 fixture，观察主要性是否改变其他冲突或下一项解决判断。

P14 reading candidate 已完成独立 source/边界 review；当前保持 `retain-candidate / acceptance-pending`，
只支持对象/关系、受众和行动之间的 designation 对齐，不取得 glossary、命名委员会、canonical naming、
权限、acceptance 或 runtime registry 权。`cellInput` 的 bounded naming review 已建立在
[`records/workcell-naming-review.md`](../records/workcell-naming-review.md)，当前为 `design-boundary-observed / naming-candidate /
independent-review-complete / acceptance-pending`，不改变 WorkCell design candidate
或实现冻结。

P15 reading candidate 已完成 source/边界独立 review；当前保持
`source-bound / reading-candidate / independent-review-complete / acceptance-pending`。`practice-cycle`
round-3 提供了真实 planning/design practice consumer，但现有行为证据上限仍是
`behavior-observed / attribution-uncertain`，不支持 reading acceptance、matched 或 regression；P15-U1 已
形成并完成独立边界 review，但 use-case/reading 接受 owner 仍待命名。P16 继续保持
`cross-boundary-fixture-only`，不因 P15 的 candidate 改变而获得 adoption、长期时点或实践证据。

以下关系不能由单个 reading package 独立关闭；它们属于父 item 的 review：

| relation group | 要保持的区别 | 失败时的处置 |
| --- | --- | --- |
| P01 / P02 / P04 | 来源事实、调查资格、已知/未知边界 | 回到 source/reading review，不把“有材料”写成“已知” |
| P04 / P08 | 主体知道多少，与问题/对象划到哪里 | 保留最近邻反例，不把视域限制写成模型能力结论 |
| P05 / P07 / P09 | 特殊性、可行入口、主要矛盾 | 见 `records/philosophy-p05-p07-p08-p09-boundary-review.md`；不把任务分解、优先级或路由机制写回哲学源 |
| P05 / P08 | 分析条件，与问题/视域边界 | 见 `records/philosophy-p05-p07-p08-p09-boundary-review.md`；scope 外事实须重新问题化，不能写成 unknown 已解决 |
| P06 / P11 | 分析阶段的删减，与解决阶段的扰动/协调成本 | 若区分不能改变判断，保留组合生成而不增第三项 |
| P07 / P10 | 从哪里开始，与何时介入 | 用早/晚和入口/规模反例检查，不推出固定提前量 |
| P12 / P13 | 对抗中的知，与对抗中的应 | reading package 初轮独立 review 已完成并完成条件性最小修订，修订后 `follow-up-clean`；没有真实对抗性 consumer 时，下游策略/行为仍保持 `no-proposal-now`，只保留 reopen 条件 |
| P15 / P16 | 检验手段，与检验时点 | 不把 validator、末端检查或长期监控写成同一关系 |

### 2026-08-26：父 item 最近邻关系覆盖 reconciliation

本节只核对 P01–P16 reading candidate 在各自 `### 最近邻` 小节中声明的关系面，以及已有
parent/boundary record 实际覆盖到的关系；它不是新的哲学 source、reading acceptance 或父 item
acceptance。P01–P16 文件是 planned reading candidate，不能把其中的关系声明误写成
`theory/philosophy.md` 的 source authority。

- 将 16 个 candidate 的 `最近邻` 小节中的 Pxx 关系按无向 pair 去重后，当前关系面为 **55 对**。
- 已有 parent/boundary records 覆盖 **17 对**：P01/P03（1）、P01/P02/P04（3）、P04/P15/P16
  （3）、P04/P08（1）、P05/P07/P08/P09（6）、P06/P11（1）、P07/P10（1）、P12/P13（1）。
  `P15/P16` 的独立表述已包含在 P04/P15/P16 的 3 对中，不重复计数。
- 另有 **38 对** 尚未形成专门的 parent fixture：它们至少有 candidate-level 的最近邻区分，
  其中部分还由其他 bounded record 交叉引用；“没有专门 fixture”不等于“完全没有相关证据”。
  这个数量不是 38 个自动打开的 review 任务，也不能由覆盖率反向要求新建 38 个记录。

当前采用三层处置：

1. 已有 fixture 的 17 对继续作为有限关系出口；其 `independent-review-complete` 仍不等于
   reading/父 item acceptance。
2. 尚无专门 fixture 的 38 对只有在同一具体对象/主张上出现可观察的 claim strength、owner、
   route 或 next-action 变化，且现有交叉证据无法承载时，才选择其中一对建立最小 parent fixture；
   没有 decision delta 时保持 `no-proposal-now`，由对应 reading package 或已有 bounded record 承载。
3. 父 item 的 phase closure 仍需要 named acceptance owner、接受标准以及相称的整体证据；
   55 对关系面与 17 对 fixture coverage 都不能单独关闭 phase 1。

为便于后续回读，当前未形成专门 parent fixture 的 pair 清单为：

`P01/P05`、`P01/P14`、`P01/P15`、`P02/P03`、`P02/P08`、`P02/P12`、`P02/P15`、`P03/P04`、
`P03/P15`、`P03/P16`、`P04/P05`、`P04/P06`、`P04/P07`、`P04/P10`、`P04/P11`、`P04/P12`、
`P04/P13`、`P04/P14`、`P05/P06`、`P06/P07`、`P06/P09`、`P06/P14`、`P07/P13`、`P08/P12`、
`P08/P14`、`P08/P15`、`P09/P10`、`P09/P11`、`P09/P12`、`P09/P13`、`P10/P11`、`P10/P13`、
`P10/P16`、`P11/P13`、`P11/P15`、`P11/P16`、`P12/P15`、`P14/P15`。

这次 reconciliation 将“父 item 的全部 cross-relation 未完成”具体化为“17 对有专门 fixture
出口，38 对尚无专门 fixture，其中部分已有交叉引用，整体接受仍未成立”；下一轮不再按 55 对
批量补文档，只从真实 consumer、source/standing 变化或 decision-changing counterexample 中选择一对。

### P03/P15/P16 的 no-proposal return（2026-08-26）

本轮用 `concept-articulation` 回读了 [`records/philosophy-p01-p03-counterexample-fixture.md`](../records/philosophy-p01-p03-counterexample-fixture.md)
的 Pair D 与 [`records/philosophy-p15-practice-use-case.md`](../records/philosophy-p15-practice-use-case.md) 的 U1-A/U1-B，
检查 P03、P15、P16 是否仍缺少能改变实际路由的区别。结果是现有记录已经形成相称的交叉边界：

| 关系 | 当前可区分的判断 | 当前证据上限 |
| --- | --- | --- |
| P03 | 结果必须改变下一认识/实践；重复观察或单次通过不够 | planning/use-case boundary；无新的行为 Run |
| P15 | 实践必须与主张相称并回到对象产生可归因结果 | U1 `behavior-observed / attribution-uncertain`；不支持 matched 或 acceptance |
| P16 | 只判断风险相关时点的覆盖，不把末端检查写成全程稳定 | hypothetical/time-coverage boundary；无 adoption/regression |

Pair D 已直接说明把检验手段、检验时点和下一判断合并会造成错误升级；U1-A/U1-B 又分别提供了
“有动作但不改变下一判断”和“观察改变 route/disposition 但归因仍不充分”的正反边界。新建一个
P03/P15/P16 专门 fixture 不会改变 claim strength、owner route 或 next action，因此本轮处置为
`no-proposal-now`，不是把它标为已接受，也不是删除已有证据。P03/P15/P16 仍列入“无专门 fixture”的
38 对，但其已有交叉证据不再被描述成纯 `reading-neighbor-only`。

## 4. 当前缺口与下一轮

### 已有覆盖

- planning、roadmap、archive inventory、两批候选 review、skill migration、WorkCell 四项开放
  关系已经有 item 或 projection；
- theory/research 已明确把研究、候选、静态 review 和行为未知分开；
- evals 与 experiments 的入口已区分，但不完整历史 eval 目录和未命名原型仍不能升格；
- planning artifact organization 已有 design candidate 与 route-to-design record，但仍嵌入现有 archive/layout item，未形成独立 item、transition 或 carrier；
- 迭代闭环的语义 owner 已存在，且已在 WorkCell 开放关系与 P01/P03 方法探针上形成多份
  planning round；当前缺的是严格归因、独立接受和采用后回归/重开关系，而不是再建一个总
  workflow skill。

### 本轮形成的 bounded contribution

1. 在单一父 item 下建立 P01–P16 的有限 reading work package，不创建 16 个 canonical item；
2. 把 iterative-improvement 的静态接受与行为 `adapt-and-retest` 分开登记；
3. 把 research/evals/experiments 中“不构成独立 item”的原因写明，避免按文件数量扩张计划；
4. 把不完整历史 eval 与现有 prototypes 留在 `hold/archive-only` 或 roadmap candidate，不改其
   standing。
5. 将 `project-cognition` archive candidate 收敛为 `no-proposal-now / archive-only`；现有 planning
   projection 是当前 owner，未来只有 named later actor、decision delta 和完整 verifier/retention/
   acceptance 关系出现时才 reopen。
6. 将 `attention-management` 的一次 scope correction 与独立重复 gap 分开；由于现有 owner 已覆盖
   相邻判断且没有第二个独立实例，收敛为 `no-proposal-now / archive-only`，不创建第二个主线 carrier。

当前 [phase-1-exit-review.md](../phase-1-exit-review.md) 已将有限下一阶段澄清与 `phase-complete` 分开；前者仍是
candidate-observed/acceptance-pending，后者未成立。P01/P02/P03/P04/P05/P06/P07/P08/P09/P10/P11/P14/P15 candidate 已形成并完成各自 Main/独立 source/边界 review；P12/P13/P16 已形成 source-bound reading candidate，初轮 reading review 已独立完成并完成条件性最小修订，follow-up 已 clean、acceptance 仍 pending；P12/P13 的下游策略仍 no-proposal-now，P16 的 adoption/time-window 实践仍 hold-cross-boundary-fixture-only；P01/P03 另完成父 item 的 scoped
object/cross-relation review，P04/P15/P16 已完成一组独立复核的 boundary fixtures；P01/P03 的具体
成对 fixture 已补齐并完成 fixture-level review，但仍需真实 host fixture/source-backed package 和
named acceptance owner 才能改变 reading/behavior standing；P15-U1 已完成 source/边界 review，但 P15 仍需
reading/use-case acceptance、相称 evidence 和行为归因。方法候选与 WorkCell 已各有 planning round，但方法候选仍需冻结
严格 card、独立盲审和可区分正反例；WorkCell 四项仍需真实 owner/consumer 和协议接受关系。后续
都只修改文档/研究记录，不实现 WorkCell、DeepSeek 或 base。

### 历史/迭代回返（默认折叠）

<details>
<summary>展开 2026-08-25 current projections 与审计回返</summary>

### 2026-08-25 current projection：P15-U1 practice use-case

P15-U1 已把现有 round-3 consumer 收窄为一个可回读 use case：Case A 保留“不会改变后续判断的一步
修正不制造循环”的负边界；Case B 保留 action/disposition 差异但不判定 treatment 更好；B1–B4 保留为
没有真实 host practice 的最近非实例。独立 review 已接受 source/边界和证据上限，U1 当前为
`use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；不创建新 Run，
不提升 `behavior-observed / attribution-uncertain`，不改变 P16、WorkCell、DeepSeek 或实现 standing。

### 2026-08-25 current projection：attention-management applicability

`attention-management` 的 archive source、历史 H2 evidence 与当前 planning owner map 已做 bounded
applicability check。当前唯一事件是一次 scope 偏窄修正，不能证明跨任务的重复 attention-specific gap；
`plan`/`item-ledger`、`practice-cycle`、`agent-delegation` 和 `planning-inbox` 已分别拥有 scope、下一
实践、贡献边界与 active-goal input/回返判断。当前处置为 `no-proposal-now / archive-only`；没有 living
carrier、Run、portable move 或实现授权。只有第二个独立 drift 实例，或现有 owner 无法区分
`switch` 与 `retain/return` 并改变下一行动时，才 reopen。

### 2026-08-25：item-ledger projection field audit

[`item-ledger-field-audit.md`](item-ledger-field-audit.md) 对本文件的 P01–P16 map 做了结构层审计，并在
P15-U1 形成后完成 P15/P16 projection reconciliation：
16/16 行均有 `item`、`source entry`、`current standing`、`bounded contribution` 和
`dependencies / revisit`；其余 goal 字段通过显式继承表回读，而不是把 5 列伪装成完整独立 schema。
此前 15/15 contract-row 结果已由 `Halley` 独立 review 并 `final accept`，P15/P16 reconciliation
由 `Averroes` 独立 review 并 `accept`；本轮新增 PL-16 后，item-ledger 当前为 16/16，新增行的
结构回接已由 `Aquinas` 窄复核并 `accept`，不把既有 reviewer 的覆盖范围扩张解释。

这只是 projection coverage observation：共同 owner 仍为 inherited category、named owner 仍
`unknown`；P12/P13/P16 的 reading candidate standing 与其下游 `no-proposal-now`/`hold-cross-boundary-fixture-only` 仍保持分开；不改变 source/reading acceptance、phase-complete、WorkCell/DeepSeek
前置或 implementation authorization。若 package、字段语义、owner/consumer 或 revisit 关系变化，重新执行结构审计。

### 2026-08-25：item loop projection

[`item-loop-coverage-audit.md`](item-loop-coverage-audit.md) 进一步检查每个顶层 item 是否能回读
`baseline → observation → minimum change → review → acceptance → projection/move → adoption regression`。
16/16 item 已形成结构 projection；此前 PL-01..PL-15 由 `Plato` 独立 review `accept`，本轮新增
PL-16 的闭环字段已由 `Aquinas` 窄复核并 `accept`；P15-U1/P16 的当前拆分也已
同步；这不改变本文件对 item/non-item
边界、P01–P16 work package standing 或 source authority 的判断。当前所有 item 的 acceptance owner
仍未命名；没有 adopted-and-regression-supported item，`N/A（未采用）` 不表示零回归。

### 2026-08-25 current projection：WorkCell command-grant boundary

WorkCell §17.2 的 `CommandGrant.argumentShape` 已有窄的 planning boundary record：
[`records/workcell-command-grant-boundary-review.md`](../records/workcell-command-grant-boundary-review.md)。它把
declaration、`WorkCellBinding` 的 host grant/tool surface、`requestTool` transport request、actual
host call observation、record/effect projection 和 mechanical check 分开，并保留 C1–C4 的需求/授予、
额外参数、shell 别名和 exact argv/实际 effect 反例。

当前处置是 `retain-boundary-candidate / route-to-owner`；`Kepler` 已独立接受原始 planning boundary
review，`Dewey` 已独立复核本段 coverage projection consistency 并 `ACCEPT`。host/security、protocol/record/evidence 与
acceptance owner 仍未命名，canonical CommandGrant shape、security policy、runtime enforcement、provider
comparison 和 implementation 仍未开放；不把历史 exact-argv source 写成 current security evidence。

### 2026-08-25 current projection：WorkCell semantic-review boundary

WorkCell §8 的 `SemanticReview` / `AcceptanceDecision` 已有窄的 planning boundary record：
[`records/workcell-semantic-review-boundary-review.md`](../records/workcell-semantic-review-boundary-review.md)。它保留
`MechanicalCheck`、semantic review、acceptance decision 和 next action 的四层关系，并用 S1–S5 记录
机械通过、review 完成、证据不足、新 rubric/late evidence 和 retry 的边界。

当前处置为 `retain-boundary-candidate / route-to-semantic-review-and-acceptance-owners`；
`Chandrasekhar` 已独立接受原始 planning boundary，coverage projection 尚需独立 provenance review。
业务 rubric、review carrier、Principal/acceptance authority、correction/retention 和任何 runtime/实现
关系仍未决定；不把 review complete 或机械 pass 写成 accepted。

### 2026-08-25 current projection：WorkCell A/B/C/D source applicability

[`records/workcell-current-source-open-relations-applicability-review.md`](../records/workcell-current-source-open-relations-applicability-review.md)
直接回读当前 protocol 的 §5、§6、§7、§9、§11、§12、§17 和 §18 相关 sections。A/B/C/D 的既有 baseline
可回指当前 source，child standing 为 `current-source-supported / applicability-reconciled /
retain-unknown`；该结果只修正 source-level applicability，不选择任何 policy 或 record authority。

仍未知：A cutoff/late correction、B active revocation、C sequence/dedup/gap/replay、D retained lineage/
unknown depth，以及相应 owner/consumer。`Halley` 已独立 `ACCEPT` child bookkeeping；不取得 WorkCell
protocol acceptance、provider comparison、DeepSeek design 或 implementation authorization。

### 2026-08-25 current projection：WorkCell contract projection source revision

`records/workcell-protocol-contract-projection-reconciliation.md` 已对 protocol §6.5/§7.1–§7.3 的
`EffectSummary`、`EffectObservation`、`UsageObservation` named slot 做 wording-only reconciliation。当前
受影响 contract projection 为 `current-source-supported / applicability-reconciled / acceptance-pending`；
canonical shape、authority、retention、correction 和 named owner 仍 unknown。`effects.workspace` 不再被示例
当作已冻结字段；该项不升级为 protocol acceptance、provider comparison 或实现授权，也不覆盖 A/B/C/D policy。

### 2026-08-25 current projection：design/development method carriers

[`records/method-skill-carrier-disposition-reconciliation.md`](../records/method-skill-carrier-disposition-reconciliation.md)
将 `practice-cycle` 与 `work-estimation` 的 carrier-level 和 case-level standing 分开。两者均继续
`retain-incubation / adapt-and-retest`；前者当前 matched branch 为 `no-proposal-now / route-to-owner`，
后者当前 Main-only case 为 `no-proposal-now / wait-for-named-consumer-and-decision-changing-case`。

这只修正 migration/plan projection，不证明 matched improvement、portable、acceptance 或 regression；
`Meitner` 已独立 `ACCEPT` bookkeeping。两个 carrier 仍在 `.agents/skills/`，不创建 `skills/`、不启动
   round 4 或任何实现。

</details>
