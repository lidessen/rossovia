# Planning 入口

这是 planning 目录的发现入口，不是第二份 roadmap、item ledger、执行队列或实现授权。
它只说明先读哪里、当前有哪些路由，以及各类记录的权威归属。

当前 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。
当前项目侧目标投影见 [`records/main-goal-description-reconciliation.md`](records/main-goal-description-reconciliation.md)；
它补充复杂度自适应的准备/工具方法、可靠性收敛研究、sub-agent 有界委派、Plan/Todo work map、默认自主纠偏
和 research settlement/application 闭环，不改变原阶段顺序或实现冻结。

当前优先级已切换为：先完成正式项目工作组织的设计前置，并在临时筹备项目中从现有素材组建可加载的班子；上一版
workflow 仅保留为设计前综合稿，WorkCell 设计和实现暂时暂停。当前过渡入口见 [`transition-package.md`](transition-package.md)，
临时筹备项目入口见 [`bootstrap/AGENTS.md`](../bootstrap/AGENTS.md)，工作流综合稿见
[`design/harness-workflow.md`](../design/harness-workflow.md)；正式设计和后续顺序待筹备项目结算后重建，
[`plan.md`](plan.md) 的旧 workflow-reconstruction 主体不作为 seed work map。

## 面向人的最短读取路径

- **Review design：** 直接打开对应的 `design/<design>.md`；不要先读 records、index 或 readiness projection。
- **Review plan：** 直接打开 [`plan.md`](plan.md)；需要长期方向时再打开 [`roadmap.md`](roadmap.md)。
- **查审计：** 只有需要核对来源、反例、证据、迁移或回滚关系时，才打开对应 `records/` 文件。

如果必须先读多个 record 才能理解 design 或 plan，说明正文没有写完整，应回写正文，而不是增加新的流程载体。

## Main 维护时的读取顺序

若当前触发了用户纠正、入口冲突、项目长期中断、冷启动无法判断下一步或其它 bootstrap 条件，先读取
[`transition-package.md`](transition-package.md)，只按其中的最小链接恢复过渡工作面；过渡包点火并交接后，
再回到以下正常维护顺序。没有触发条件时，不把过渡包作为普通任务的必经入口。

1. **当前跨 item 路由：** [`item-ledger.md`](item-ledger.md)
2. **长期方向：** [`roadmap.md`](roadmap.md)
3. **实现前顺序与冻结边界：** [`plan.md`](plan.md)
4. **阶段出口：** [`phase-1-exit-review.md`](phase-1-exit-review.md)
5. **当前工作视图：** [`index/README.md`](index/README.md)
   （只在当前 work map 需要 candidate、coverage、migration、evidence 或 estimate 视图时进入）
6. **具体证据与适用性：** 对应 item 的 child/review record
   （先从 [`records/README.md`](records/README.md) 找 bounded process record）

若 dated projection 与当前索引冲突，保留历史 lineage，并回到当前 authority 和 canonical
source；不能用目录顺序或最后出现的段落解决冲突。

## 最小 context 读取契约

普通 planning 任务先读取本入口、`item-ledger.md` 的当前部分和被选 item 的 canonical source；不要
默认把全部历史、全部 skills 或所有 sibling review 注入上下文。

- `item-ledger.md` 读到 `## 历史/迭代记录（默认折叠）` 之前即停止；只有需要恢复具体 lineage、source
  edge 或旧 review 时才按需读取其后的历史段落。
- `plan.md` 是 current-only carrier；`roadmap.md` 先读当前主体。历史不通过全文 plan 读取，只沿明确的
  record/历史快照链接按需读取。
- 选定 item 后只加载其 canonical source、当前 child/review record 和必要的相邻 owner/consumer 记录；
  不因目录存在就递归读取整个 planning、`theory`、`evals` 或 `.agents/skills/`。
- 如果没有新的 source、consumer、owner、decision delta 或 evidence，停在当前索引并返回 `wait`、
  `hold`、`done-for-now` 或 `no-proposal`，不要为了补上下文继续扫描。

这是一条读取与路由约定，不是新的 authority、loader/runtime guarantee 或实现机制；静态字节减少也不
自动等于 token、latency 或质量改善。

## 当前执行面

| 路由 | 当前可做的最小贡献 | 当前不做 |
| --- | --- | --- |
| `continue` | 以整个 planning 为目标，开启一个命名的 bounded wave；其中可并行放入输入稳定、写面/判断面互不冲突的 contributions，并在波次末统一回写 current projection | 不把每个 item 都变成队列；不因文件数量、coverage 或 review 数量创建新 carrier、任务或 synthetic Run |
| `wait-for-owner` | 只暂停确实需要重大 owner/consumer/acceptance 选择的对应 item；只有该选择会改变方向、权限、共享基线、不可逆效果或解锁关键安全行动时，才做 bounded owner-decision preparation；普通局部问题凭已有方法推进并事后纠偏，其它 item 仍可继续 | 不由 Main 代替 owner 做最终选择、猜测接受者/协议字段或承诺 runtime 行为；局部等待不能升级成全局暂停 |
| `stop / no-proposal` | 保留来源、失败、unknown 和 revisit 条件 | 不实现 WorkCell、DeepSeek Harness、base/runtime，不启动用户构想 Run，不把 archive candidate 批量迁入 `skills/` |

当前跨 item 快照、允许效果和停止条件以 [`item-ledger.md`](item-ledger.md) 的“当前快照”和
“当前执行面”为准。

### 多步骤/多任务的 work-map 驱动

planning 当前把 goal、`plan.md`、`item-ledger.md` 和被选 bounded record 组合成一个可回读的 work map：
Plan 保留整体义务与顺序，item ledger 保留跨 item standing/依赖/回返，bounded record 保留当前贡献和
证据，局部 Todo 只保留执行者下一步、等待或回返条件。Todo action 可以带一个 action-local 的
`focus anchor`（当前载体字段暂称 `reminder`）、`source` 和 `return`，让会改变当前判断的方法在行动边界出现。

这里不另建一个全局 `planning/todo.md`：`form-selection` 已将其判断为没有独立 canonical
owner/consumer 的第二队列。没有 Todo 文件不等于不做 Todo 驱动，关键是下一行动必须从当前 work map
选择并将结果/未知写回；本轮的当前执行 plan 作为 bounded wave 的 Todo carrier 进行 dogfood，持久化记录
仍回写到本入口、item ledger 或对应 record。一步、低风险、可逆且无依赖/交接的动作可不展开 Todo；多步骤、
多任务、并行/等待、handoff、验证或 checkpoint 工作则必须显式保留它。

最小形式见 [`planning-information-architecture.md`](../theory/research/planning-information-architecture.md)
§5：reminder 是工作上下文，不是第二 authority、周期调度器或独立 memory registry；只有被读取、行动、
回写并能改变下一步判断时，才有机会形成可靠性证据。

## 目录形状（2026-08-26）

根目录只保留 7 个稳定入口或 current authority：本入口、item ledger、roadmap、pre-implementation
plan、phase exit、inbox 和 inbox-history。当前 planning 的六层信息结构是：入口、current authority、
direction/commitment、intake/lineage、working indexes、process evidence；它们的关系和理论边界见
[`planning-information-architecture.md`](../theory/research/planning-information-architecture.md)。

[`index/`](index/README.md) 保存 8 个 supporting working view 和一个入口；它们帮助发现与回读，但不拥有
standing、方向、接受或实现授权。这样“根级”不再同时表示 canonical authority 和辅助视图，也不把目录名
误读成生命周期状态。

`records/` 统一保存 81 个 bounded process record 和一个 records 入口，共 98 个 planning Markdown 文件。
路径整理只改变发现路径，不改变 source、standing、owner、evidence、acceptance、lineage 或实现冻结；不要
把 `index/` 或 `records/` 目录名当成新的状态机或 authority。当前只引入一层 index 和一层 records，暂不按
domain 再拆目录。

当前候选的集中发现和对象分类见 [`candidate-consolidation.md`](index/candidate-consolidation.md)。它只
集中 candidate 的对象类型、canonical owner、standing、关系和处置，不替代理论、设计、research、
planning 或 skill 的当前 authority。

当前全局 planning 状态是 `active / item-gated / checkpoint-required`：`closed` 只描述已经结束的
某一波次，不描述整个 planning。最近由用户范围纠正触发的 bounded wave 是 `scope-reconciliation`，
该波次已在整体 checkpoint 收口；当前执行面等待下一条 bounded wave 的选择。它只允许做 authority、
路由和下一波选择的校正，不打开 WorkCell、DeepSeek Harness 或基座实现。

## 整体性回顾与整理

planning 按“有界工作波次 → 整体性 checkpoint → 再开下一波次”推进，而不是把每个发现都直接
追加成新的 sibling item、review 或 skill。一个波次至少包含一次能改变判断的 source/consumer/
boundary contribution、相称的独立 review 和一次 current projection 回写。

这里的 `active-now` 是“有资格成为下一波次入口”，不是“正在执行”。一个 bounded wave 可以包含
多个真正独立的 contributions；只有输入、共享权威和效果面都可分时才并行，存在共享写面或真实
依赖时改为顺序或合并。每一波结束后必须先回到 item ledger 的 checkpoint，再决定下一波。

整体性 checkpoint 还在波次开始、canonical source/authority 改变 current projection、阶段 gate/replan，
或用户指出 planning 堆叠/混乱时触发；若触发后没有 decision delta，只更新现有 current authority 或返回
`no-proposal`，不创建 dated sibling record。

checkpoint 先检查现有 authority、重复 projection、过期 source edge、item 闭环、owner/consumer
等待和阶段边界，再决定以下处置之一：

- 合并或修正已有 current authority；
- 把已闭合的分支标为 done-for-now，保留 reopen 条件；
- 将没有 decision delta 的候选降为 hold / no-proposal；
- 只有确实出现新的独立对象和接受关系时，才开启新的 item 或载体。

因此在 checkpoint 完成前，不新增同层 review、并行调度 skill、WorkCell 字段或独立吞吐设计
文档；外部研究和局部发现先作为待回接证据保留。item-ledger.md 的“整体性回顾 checkpoint”
是本轮结果的当前投影，dated sections 仍只承担 lineage。

## 通用 owner-facing progress 的 planning 应用

“默认自主推进、小错事后纠偏、重大事项才请示”现由通用 harness candidate
[`default-autonomy-with-correction.md`](../theory/harness/default-autonomy-with-correction.md) 承载；
[`owner-facing-progress.md`](../theory/harness/owner-facing-progress.md) 只是其中的重大事项例外通道。
planning 只验证两个应用问题：owner-gated item 是否能局部等待而不冻结全局，以及真正需要请示时
decision package 是否确实降低 owner 恢复成本。

当前 planning 的最小应用规则：在开始/恢复 bounded wave、handoff、review、decision 或 checkpoint
时，仅在 scene/role 变化、明显 scope drift 或重大 decision 附近恢复必要的最小上下文；遇到普通
owner/acceptance 缺口先继续局部工作并事后纠偏，只有重大选择才形成有来源的场景、方案、取舍、unknown
和明确问题，再把选择权交回 owner。它不创建 planning 专属 role registry、runtime identity、
权限、queue 或第二份 authority。重要方法的复述采用通用 harness 的 `focus refresh`：只在 context
恢复、角色/场景变化、checkpoint、重大决定或纠偏等会改变注意关系的边界上刷新相关最小 delta；稳定常识
不重复倾倒，没有收益时跳过。完整规则由 [`default-autonomy-with-correction.md`](../theory/harness/default-autonomy-with-correction.md)
拥有，planning 只作为应用投影。

## 按目的找记录

### 文档与 skills 迁移

- [`skill-migration.md`](index/skill-migration.md)：11 个 `.agents/skills/` carrier 的当前逐项处置；portable `skills/` 当前为 0。
- [`records/archive-skill-inventory.md`](records/archive-skill-inventory.md)：archive 集合和历史初筛，不是迁移队列。
- [`inbox.md`](inbox.md) / [`inbox-history.md`](inbox-history.md)：低摩擦 raw capture 与 source-native 处理回执；不是任务队列、完成记录或接受权威。
- [`../design/planning-artifact-organization.md`](../design/planning-artifact-organization.md)：planning artifact layout 的 design candidate；尚未接受，不授权目录迁移。
- [`records/design-development-review.md`](records/design-development-review.md)：设计/开发方法候选的边界、consumer 和回返条件。
- [`../theory/research/controlled-experiment-design.md`](../theory/research/controlled-experiment-design.md)：问题优先的实现设计与科学实验方法；先恢复真实问题、场景、机制、变量和 estimand，再选择最小实现与验证，不是新的 runtime 或全局实验设施。
- [`index/whole-work-coordination-candidate.md`](index/whole-work-coordination-candidate.md)：跨 planning item 的整体工作协调能力候选；临时 handle，不是正式 skill 或 runtime。
- [`records/next-candidate-review.md`](records/next-candidate-review.md)：第二批 archive candidate 的 candidate-later / no-proposal 边界。
- [`records/disciplined-development-review.md`](records/disciplined-development-review.md)：不创建 carrier 的 archive candidate 回返。

### WorkCell 设计

- [`../design/work-cell-protocol.md`](../design/work-cell-protocol.md)：唯一的 WorkCell Draft 协议设计正文。
- [`records/workcell-design-acceptance-readiness.md`](records/workcell-design-acceptance-readiness.md)：acceptance dimensions 和未决 owner decision 的 projection。
- [`records/workcell-run-state-boundary-review.md`](records/workcell-run-state-boundary-review.md)：`WorkCellRun.state` 与 `RunRecord` record finalization 的 source-boundary simplification candidate。
- [`records/workcell-parent-relation-boundary-review.md`](records/workcell-parent-relation-boundary-review.md)：v1 `retry-of` / `continued-from` parent relation 收窄及其 retention/recovery unknown。
- `records/workcell-*-review.md`：各项窄边界 review；它们不能单独授权协议接受或实现。

### 本项目工作流与 bootstrap seed

- [`bootstrap/AGENTS.md`](../bootstrap/AGENTS.md)：下一代项目开发种子的入口，主体是 `AGENTS.md` 与按触发条件选择的 workflow/development skills；它不是临时班子分析资料目录。
- [`../design/project-bootstrap.md`](../design/project-bootstrap.md)：bootstrap seed 的当前 draft 设计；分析和历史材料不进入 bootstrap active surface。
- [`../design/harness-workflow.md`](../design/harness-workflow.md)：本项目专用的设计前综合稿，不是正式 design；承载已有观察、候选行为关系和待验证边界。
- [`../theory/harness/theory.md`](../theory/harness/theory.md)：跨项目仍成立的 harness 语义理论；不替代本项目工作流和项目 plan。
- `.agents/skills/`：旧项目当前的 canonical 判断方法，也是 bootstrap seed 的主要来源；bootstrap 只有在有独立边界时才形成 project adapter，不无理由复制 canonical 正文。

### 哲学 reading 与关系

- [`index/coverage-audit.md`](index/coverage-audit.md)：P01–P16 package 覆盖与当前缺口。
- `records/philosophy-*-reading-review.md`：单个 reading 的 source/boundary review。
- `records/philosophy-*-boundary-review.md`、[`records/philosophy-parent-review.md`](records/philosophy-parent-review.md)：成对关系和父 item 边界。
- [`records/philosophy-remaining-reading-disposition.md`](records/philosophy-remaining-reading-disposition.md)：P12/P13/P15/P16 的当前处置与 reopen 条件。

### 评估与历史证据维护

- [`index/evidence-maintenance-review.md`](index/evidence-maintenance-review.md)：evals/experiments evidence 的当前 standing map。
- `records/evidence-applicability-review-*.md`：某个历史 artifact 或 round 的 current-source applicability 检查。
- [`index/item-loop-coverage-audit.md`](index/item-loop-coverage-audit.md)：16 个顶层 item 的闭环字段覆盖，不是 acceptance 记录。
- [`index/whole-planning-work-estimate.md`](index/whole-planning-work-estimate.md)：最小工作图和发现分支，不是时间/资源报价。
- [`../evals/skill-evaluation/tools/README.md`](../evals/skill-evaluation/tools/README.md)：评估轮次专用输入生成器与 runner 的归属；它们不是通用脚本或 evidence。
- [`records/research-reading-candidate-jitrl.md`](records/research-reading-candidate-jitrl.md)：JitRL 外部研究输入及其对本项目的适用性边界；不是本项目 evidence、Run 或独立顶层 item。
- [`records/research-reading-candidate-foreagent.md`](records/research-reading-candidate-foreagent.md)：FOREAGENT 外部研究输入及其对执行前候选筛选、吞吐和后续系统设计的适用性边界；已完成 ACL PDF/附录与官方仓库 README 的来源核对，但没有本地复现，不是本项目 evidence、Run 或独立顶层 item。
- [`../theory/research/agent-harness-throughput-research.md`](../theory/research/agent-harness-throughput-research.md)：Agent harness 吞吐的 claim/source/gap、编排候选和最小 probe；不是 runtime 实现。
- [`../theory/research/harness-agent-initiative-research.md`](../theory/research/harness-agent-initiative-research.md)：Agent 主观能动性的 system-layer research candidate；当前以 `goal-linked bounded initiative` 作为临时研究指称，并以 `goal-linked action loop` 组织选择、行动、后果归因和反馈，不是理论结论、skill、Run 或 runtime 实现。
- [`../theory/research/main-agent-project-work-method.md`](../theory/research/main-agent-project-work-method.md)：项目级 Main/sub-agent 工作方法 candidate；Main 保留整体、authority、fan-in、settlement 和 checkpoint，sub-agent 承接有界贡献；当前无 project-scale Run，不是总控 Agent、scheduler、registry 或 runtime 实现。
- [`records/iterative-loop-learning-analogy-review.md`](records/iterative-loop-learning-analogy-review.md)：PL-10“迭代循环像无监督学习”的 bounded analogy review；保持 research candidate standing，不把类比升级为 theory、skill、runtime 或模型学习结论。
- [`records/controlled-agent-evaluation-tool-review.md`](records/controlled-agent-evaluation-tool-review.md)：受控 Agent 行为评估设施的对象、分层、承载性与当前不实现处置；区分 eval-specific evidence/ledger 与 WorkCell canonical Run/RunRecord；不是工具代码、Run 或 acceptance source。
- [`records/conflict-role-integration-review.md`](records/conflict-role-integration-review.md)：PL-12 冲突角色整合候选的七对象定义审查；分开跨角色协调行为、功能性身份连续、本体论统一自我与 consciousness，当前 hold，不是 experiment Run、skill、theory 或 runtime。

## 当前阶段边界

当前执行主线是先恢复工作面，再从实践中提炼工作流：

```text
过渡工作包与真实点火行动
  → 可交接的当前工作面
  → 工作流试行与修正
  → 结构/skills/文档收敛
  → WorkCell 设计接受
  → DeepSeek Harness 工作系统设计
  → 两层设计接受与实现授权
  → 工作系统实现
  → 用户 harness 构想逐项 experiment/eval
```

上面是当前顺序与长期方向的合并投影，不是固定状态机。当前 WorkCell 为
`paused-by-priority / design-review-deferred / implementation-not-authorized`；只有当前工作流
和结构经过真实试行、整体 checkpoint 形成 decision-changing 结果后，才可能重新打开 WorkCell
design review。DeepSeek 工作系统只保留为后续设计对象；WorkCell implementation/base/runtime、工作系统
实现和用户构想 Run 均为 `not-authorized`。任何 planning projection 都不能跨越这些边界。

## 维护规则

- `theory/research/` 与当前 research/experiment record 的 frontmatter 是可检索的生命周期投影：用 `status`
  区分 `active / settled / archived`，用 `disposition` 表示当前去向，必要时补 `settlement_route`、`owner`、
  `consumer`、`review_at`；它们不取代正文、item ledger、source、evidence、acceptance 或 lineage authority。
  `active` 研究必须能在当前 bounded wave 指向下一动作和结算路线；没有路线的记录不能长期保持 active。
- 周期性机械 checkpoint 可运行 `ruby scripts/validate-planning.rb`；它检查路径、Markdown 链接、
  projection 行数/空值、核心 checkpoint、历史折叠边界、标题唯一性和吞吐研究中的静态 accounting，
  但不替代语义 review、owner、acceptance 或实现授权。
- 新增 planning record 前，先确认它对应已有 item，或确实关闭一个 decision-changing unknown。
- 普通当前 standing 回写到现有 authority；dated record 只保存 source、观察、review、处置和 lineage。
- 没有 named consumer/owner、可回读 evidence 或 decision delta 时，使用 `wait` / `hold` /
  `no-proposal`，不要创建兼容壳或空任务。
- 目录索引只做发现和链接；`index/` 的 working view 还可做当前分析，但它不拥有事实、接受、权限、运行状态
  或实现授权。任何多步骤维护动作都要由 Todo/Plan 驱动，并在结束时回到 current authority 做整体 checkpoint。
