---
kind: research-candidate
id: agent-harness-throughput
status: settled
disposition: owner-gated-hold
evidence: source-observed
settlement_route: bounded-probe-or-archive
owner: "unknown"
consumer: harness-system-design
review_at: reopen-on-named-runner-or-latency-consumer
---

# Agent harness 吞吐研究与编排设计候选

lifecycle：`settled`
disposition：`owner-gated-hold`
evidence：`trace-schema-formed`（source-observed；inference-backed）
review：`independent-review-complete`（只覆盖 trace-schema/design boundary 以及 route/footprint bookkeeping）
execution：`design-only`
acceptance：`pending`；不覆盖性能、latency、Run、acceptance 或实现，不是 runtime 设计接受、WorkCell 协议变更、并行 skill acceptance 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 结论先行

当前最值得验证的不是增加 Agent 数，而是把执行面收敛为：**单层、读多写少、依赖感知、一次有界 fan-out、一次显式 fan-in、指定 authority/owner 单写**。Main 负责 fan-in；只有获得对应写权限时才执行 projection 写回。

推荐的速度假设是：

```text
Main 预检/路由
  → 冻结 source revision 与共同 contract
  → 独立只读 lane 有界并行
  → Main 冻结 candidate / effect surface
  → producer lane 在隔离效果面上并行
  → mechanical check 与独立 semantic review 并行
  → Main 重连、冲突裁决、acceptance / projection 顺序执行
```

只有当节省的分支工作量超过 fan-out、重复 context、排队、交接、fan-in 和返工成本时，并行才是提速。并行 Agent 数不是目标变量。

主动运行还要把“唤醒机会”和“主动判断”拆开计量：event/clock/open-loop wake 可能增加固定调用，
但它只让系统看到机会；真正的收益必须来自更快的有价值进展，而不是 wake 数、lane 数或候选数量增加。
因此任何后续 initiative probe 都要把 activation cost、initiative judgment、action、feedback、
coordination 和 correction 分段记录，并沿用 `T_useful / C_total / Q_guard` 判断净收益。

本候选不把调度、批次、队列、取消、容量、锁、恢复或单写者保证塞进 `WorkCell` core；这些属于外层 system/orchestrator/runtime，当前只做设计和验证边界。

## 2. claim / source / gap matrix

| claim | 当前 standing | source / observation | gap 与限制 |
| --- | --- | --- | --- |
| 当前计划存在若干顺序依赖，可能形成实际关键路径 | plan-observed / hypothesis | `planning/plan.md` 的阶段顺序与 `planning/item-ledger.md` 的 owner-return 路由支持顺序依赖；它们只使关键路径成为待验证假设 | 没有完整 wall-clock、queue、handoff 或 review latency，不能把实际慢归因于这些依赖、模型或等待 |
| 当前 round 的输入负担可量化 | local-observed | `evals/skill-evaluation/runs/planning-inbox-round-3/run-identity.md`：10 个 arm，合计 `166211 input / 68608 cached / 13329 output / 6240 reasoning` tokens | 没有每个 arm 的完整 start/end、queue、handoff、review latency；token 不是 latency 的等价物 |
| 当前 runner 至少有 pair-level 并行和 pair barrier | local-observed | `evals/skill-evaluation/tools/planning-inbox-round-3/run-planning-inbox-round-3.sh` 接收一个 item，并在 old/new pair 完成后返回 | 不能仅凭脚本和 stderr 时间推断 A–E 的全局调度或并发上限 |
| 独立调用适合依赖感知的结构并行 | source-supported, bounded | [LLM Compiler](https://arxiv.org/abs/2312.04511) 描述 planner、ready-task fetching 与 parallel executor；报告的最高收益只适用于其 benchmark/config | 任务、模型、工具独立性不同，不能外推固定倍数 |
| 有序依赖与失败结果必须显式保留 | provider/framework guidance | [Anthropic parallel tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use)；[Temporal parallel Activities](https://go.temporal.io/platform-hub/ai-engineering/ai-patterns) | provider/framework 语义不是本项目的 runtime 保证；浏览器和 computer-use 更偏顺序 |
| fan-out 需要显式 fan-in 与进度/证据账本 | source-supported, design implication | [Microsoft Concurrent workflows](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/concurrent)；[Magentic-One](https://arxiv.org/abs/2411.04468) | aggregator 只解决组合路径，不自动解决事实、冲突或 acceptance |
| 上下文压缩可能降成本但不能默认截断 | source-supported, bounded | [LongLLMLingua](https://arxiv.org/abs/2310.06839) 支持问题感知压缩和恢复，但关键组件移除会损害效果 | 压缩有自身成本，且可能删除证据；必须保留 source manifest 和恢复路径 |
| 特定多采样/一致性候选存在条件性早停证据 | source-supported, conditional | [Early-stopping self-consistency](https://arxiv.org/abs/2401.10480) 报告特定 benchmark 的采样减少 | 不能外推到所有独立候选；一致不等于正确，必须有 sufficiency rule，且不能替代 acceptance |
| 执行前候选筛选可能用推理换昂贵执行 | source-supported, conditional | [FOREAGENT research record](../../planning/records/research-reading-candidate-foreagent.md)；[ACL paper](https://aclanthology.org/2026.acl-long.182.pdf) 报告 pairwise preference、Verified Data Analysis Report 和 Predict-then-Verify | 论文只覆盖特定 MLE-Bench treatment；预测、报告生成/核验、并发、漏选、回退与真实执行成本尚未在本 harness consumer 中测量 |
| skill 全量加载是否是瓶颈 | unknown | 当前 11 个 `.agents/skills/` 为 1,585 行、132,783 bytes；评估脚本能加载 snapshot，但没有生产 loader 的按需加载/缓存证据 | 必须做 loading probe，不能只按文件大小推断 wall-clock |
| 增加 Agent 数是否提高净吞吐 | unknown | `agent-delegation` 与现有 round 都只支持条件性并行，尚无 matched latency/cost/quality | 必须比较 direct baseline 与固定 treatment，并观察返工、覆盖和 acceptance 质量 |

因此当前最强结论是结构性候选，不是性能结论：`dependency-aware DAG → bounded fan-out → provenance-preserving fan-in → verification → adaptive stop`。

## 3. 边界与候选命名

以下名称只属于 system/orchestration 设计候选，不是 WorkCell core 的新协议字段：

| 名称 | 含义 | 不拥有的东西 |
| --- | --- | --- |
| `PlanningEnvelope` | Main 给本轮工作的目标、硬约束、接受关系和允许效果 | 不授予 host effect，不替代 `WorkCellRunRequest` |
| `SourceManifest` | canonical source、revision、精确引用、读取范围和 source standing | 不把摘要升级成 source，不隐藏 unknown |
| `LaneAssignment` | 一个独立 contribution 的对象、输入、效果面、返回 schema 和停止条件 | 不改变整体 priority、owner 或 acceptance |
| `LaneResult` | 一个 lane 的 claim、evidence refs、coverage、unknown、failure、effect、usage 和 source revision | 只是 system-layer conceptual role，不代表 WorkCell record、完成、接受或多数票 |
| `FanInDecision` | Main 对分支结果的重连、冲突、缺失、stale 和下一动作的判断 | 不自动 move、commit、accept 或授权 runtime |
| `ProjectionUpdate` | 经过 Main 判断后交给指定 authority/owner 写回既有 current authority 的最小变化 | 不允许 child 直接写 `plan.md`、`roadmap.md` 或 `item-ledger.md`，也不是 WorkCell record |

这些名称避免把一个泛化的 `input` 同时承担任务、权限、状态和记录意义；若未来真正进入 runtime，应先由机制设计 review 确认对象 owner、生命周期、持久化和失败语义。

## 4. 推荐拓扑

### P0：Main 预检与路由（顺序）

先恢复：对象、canonical source、source revision、owner/acceptance、mutable surface、依赖图、允许效果和是否值得委派。若输入不稳定、后项依赖前项或共享写面冲突，直接顺序处理或等待。

### P1：只读 evidence lanes（并行）

只并行真正独立的来源调查、archive/research/eval applicability、不同边界的只读 review，或固定 fixture 下彼此独立的 provider comparison。每个 lane 只带自己的 `SourceManifest` 与 lane-specific context。

### P2：Main 冻结共同接口（顺序）

Main 检查覆盖、来源 standing、冲突和遗漏，冻结 candidate snapshot、effect surface、返回 schema 和下一步。P2 之前不能让 producer 或 reviewer 基于不同 revision 同时推进。

### P3：bounded producers（可并行）

仅当每个 producer 具有独立 workspace/effect surface，且结果可以用 `LaneResult` 回接时并行。共享 canonical 文档、共享 registry、共享 mutable state 或同一个未冻结协议时不并行。

### P4：检查与 review（条件并行）

candidate snapshot 冻结后，mechanical check 与独立 semantic review 可以并行；reviewer 不能直接修改 producer candidate。若 reviewer 产生修订，它转为新的 producer revision，必须重新 review。

### P5：Main fan-in（顺序）

Main 按 source standing、覆盖、未知、失败和效果面重连，不按 Agent 数或多数票裁决。缺失结果不是成功；source revision 漂移使 lane result stale；冲突没有可判定依据时保持 unknown。

### P6：acceptance 与 projection（顺序）

acceptance owner 单独决定接受；Main 只形成接受后的最小语义变化，并由对应 authority/owner 在获得明确写权限后写回已有 authority。projection、move、实现授权和 runtime effect 不由 fan-in 自动发生。

## 5. 并行准入与拒绝规则

### 允许并行

- 输入 source 和 revision 已冻结；
- lane 之间没有数据、状态、权限或推理依赖；
- 效果面只读或可隔离、可识别、可回滚；
- 返回可以单独判断，且有统一 schema；
- Main 能在 fan-in 时保留 provenance、coverage、unknown、failure 和 conflict；
- 预期节省的关键路径大于 fan-out、context、等待、交接和返工成本。

### 必须顺序或直接执行

- 对象、命名、canonical source、contract 或 acceptance 仍在争议；
- 后一个动作需要前一个结果来决定输入；
- 多个 Agent 要写同一个 canonical surface；
- provider 调用有 session、browser、computer-use 或顺序工具依赖；
- producer、reviewer、acceptance owner 的角色会因并行而混合；
- 并行结果只能靠投票拼成结论，不能回到共同 source；
- cancellation、retry、resume、idempotency 或 at-least-once 语义尚未由 runtime 提供。

skill 文字只能表达准入、返回和判断边界，不能保证锁、事务、取消、容量、恢复或单写者；这些是 mechanism/runtime 的责任。

## 6. skill 与 context 设计

### 热路由包 + 条件加载

默认只加载项目 authority 的最小入口、当前任务 envelope、一个主判断 skill 和必要的相邻 skill。完整 planning 历史、全部 P reading、全部 `.agents/skills/` 不应成为普通 child 的隐含前置上下文。

### Conditional route dependency reconciliation（2026-08-25）

建议路由不是固定 pipeline，而是由对象状态触发的条件 DAG：

```text
authority + PlanningEnvelope + SourceManifest
  → 对象/术语不稳时 concept-articulation
  → 需要比较规模、依赖或 probe 粒度时 work-estimation
  → 需要分出真实贡献时 agent-delegation
  → 已冻结 contribution 后 agent-expression
  → 需要选择承载形式时 form-selection
  → 只有观察到重复行为差距时 skill-formation
  → 真实双受众关系成立时 dual-audience-expression
       → human-writing / agent-expression 的视图可在共享语义核后并行
  → 准备增加硬机制时 mechanism-design-review
  → 已有实践结果需要改变下一判断时 practice-cycle
```

当前 11 个 carrier 的触发、前置和并行边界对账如下：

| 触发关系 | 主 skill | 前置与返回 | 可并行/必须顺序 |
| --- | --- | --- | --- |
| raw planning input、capture 或 safe-point handoff | `planning-inbox` | 保留 source-native raw/receipt；不形成 commitment、执行或 acceptance | capture 后才能路由下游；不与执行 lane 混为同一贡献 |
| 对象、定义、正式指称或最近邻不稳 | `concept-articulation` | 需要 source、用途和可改变的行动/判断；返回概念边界与 `no-proposal` 理由 | 必须先于依赖该对象的 delegation/expression/form；可与不依赖该对象的只读来源调查并行 |
| 需要比较方案、规模、依赖或 discovery probe 粒度 | `work-estimation` | 需要目标状态与现有证据；返回最小工作图和省略项，不作预算或执行承诺 | 在 topology 选择前顺序使用；不同 source 的估算不可直接合并成成本结论 |
| 是否分出真实有界贡献、选择 direct/sequential/parallel/nested | `agent-delegation` | 对象、整体义务、source/effect surface 已足够稳定；返回 lane 边界、拓扑和 fan-in 关系 | 决定后才由 `agent-expression` 写 lane contract；独立 lane 可在冻结共同接口后并行 |
| 已确认 contribution 需要交给 Agent | `agent-expression` | 接收 delegation 的对象、来源、non-goals、允许效果、失败和返回 schema | 每个 lane 单独表达；多个 lane 的表达可并行，但不能共享未冻结 contract 或 mutable surface |
| 语义已稳定但需要选择 task/document/reference/skill/runtime 等载体 | `form-selection` | 返回最小真实形式与 owner/lifecycle 边界；不定义对象、不写正文 | 先于依赖形式的 writing/carrier；不因形式不确定预建容器 |
| 同一判断/行动差距在真实实例中重复，且可能值得可选载体 | `skill-formation` | 需要行为 gap、重复性、最近邻和预期改变；返回 retain/rewrite/split/merge/demote/no-proposal | 不在一次性任务上与 writing 并行；通常在 practice/evidence 之后触发，不能替代 `form-selection` |
| 人和 Agent 是真实不同接收者，且共享语义核会漂移 | `dual-audience-expression` | 建立唯一权威、派生关系和同步/回归；不独立定义概念或写出两份 canon | 语义核稳定后，`human-writing` 与 Agent view 可并行生产；同步/冲突回接仍顺序进行 |
| 需要面向人的文章、说明或决策表达 | `human-writing` | 需要稳定对象、来源、读者、目的和形式；返回可理解的自然表达 | 可与独立 Agent view 并行，但必须共享已确定语义核；不与 concept/form 判断并行猜测 |
| 需要 Agent 判断、行动、失败处理和 evidence-bearing return 的表达 | `agent-expression` | 需要稳定 contribution/object、source standing 和 allowed effect；返回可执行任务/方法内容 | 与 human-writing 只在 dual-audience 关系已建立后并行；不能代替 delegation topology |
| 准备新增 state/record/queue/lock/retry/gate/registry/lifecycle mechanism | `mechanism-design-review` | 先恢复真实对象、现有 owner 和最小处置；返回 keep/reuse/rewrite/no-proposal | 可与只读 evidence lanes 并行；必须先于机制实现或 runtime proposal，不与实现假设并行 |
| 一次实践、失败或含混结果已经产生，需要改变下一判断 | `practice-cycle` | 返回最小下一实践、修订、unknown 和 reopen 条件；不替 domain owner 验收 | 必须在结果之后；可把结果路由给其真正 owner，不包成新的总 workflow |

这张表修正了原先箭头表达的两个风险：`concept-articulation` 不能排在 delegation 之后作为事后
补救；`skill-formation` 也不能与普通 `form-selection` 并列成每次任务的默认路由。此次 route
reconciliation 是 `conditional-route-observed / design-only / review-pending`，不改变任何 carrier
standing 或运行授权。技能的重叠仍按主要判断、来源、效果面和返回 schema 处理，不按文件数、职业角色
或阶段名硬拆。

当前不新增一个“并行调度 skill”。如果 loading probe 证明每次路由重复恢复同一套判断，下一步优先改 loader/route pack；只有出现独立触发、失败边界、owner 和可验证行为差距时，才进入 skill-formation。

## 7. 性能、质量与成本观测

每个 matched probe 至少记录：

| 层 | 指标 | 用途 |
| --- | --- | --- |
| wall clock | queue wait、child start/end、model time、tool time、fan-out/fan-in、review、rework | 找真正关键路径 |
| usage | input、cached input、output、reasoning、tool calls、cost | 判断 context 和并行的真实代价 |
| context | source 重读次数、skill bytes/tokens、cache hit、压缩/恢复、handoff size | 判断加载与交接负担 |
| quality | source coverage、unknown 保留、冲突、failure、stale、返工、最终 acceptance | 防止以速度换错结论 |
| effects | writer 数、共享面冲突、取消、retry、recovery、partial result | 验证效果边界和运行安全 |

用以下粗粒度 accounting model 判断是否值得保留并行；它不是完整 latency model，未覆盖资源争用、capacity queue、尾延迟、retry/failure 和 reviewer 等待：

```text
T_direct  = setup + Σ independent work + rework_direct
T_parallel = setup + max(ready lane work) + coordination + fan-in + rework_parallel

保留条件：wall-clock 改善，关键质量不回归，unknown/证据不丢失，且 token/cost/复杂度在可接受范围。
```

任何单次成功、Agent 数增加、token 下降或模型自报完成都不足以证明 harness 变快。

## 8. 最小验证路线

这是一张设计 probe card，不是已经授权的 Run：

1. **Trace baseline：** 给当前真实 planning case 增加统一的启动、排队、模型调用、返回、handoff、review 和写回时间戳；先确认慢在何处。
2. **Loading comparison：** 同一任务比较 full skill context、单主 skill、route pack + 相邻 skill；记录 token、首响应等待、总耗时、遗漏和回读次数。
3. **Read-only fan-out comparison：** 同一 source snapshot、model、workspace、权限和 acceptance，比较 direct、2-lane、4-lane；记录 wall-clock、总 usage、fan-in/rework 和最终质量。
4. **Negative topology cases：** 注入共享写面、source revision drift、顺序依赖、browser/session 依赖；检查系统拒绝并行或将结果标为 stale，而不是盲目加速。
5. **Review/reconnect case：** producer 返回缺失 source、错误 standing、冲突和 partial failure；检查 Main 是否保留 unknown、重连、重新 review，并拒绝把 review 当 acceptance。

如果真实 consumer 的工作形态是“先生成多个候选，再进行昂贵执行”，才在 baseline 已可重建后增加
**conditional candidate-selection branch**：固定候选生成预算、任务/source snapshot、模型和质量
目标，比较 direct execution 与 prediction-gated execution；单独记录预测调用、数据报告生成/核验、
候选多样性、被跳过的候选、false negative、回退执行和最终质量。它是 throughput treatment，不是
WorkCell 字段、通用 gate 或 provider 选择；没有这样的 consumer 时保持 `no-proposal-now`。

只有 baseline/treatment 的 runner、model、harness、workspace、权限、source、task 和 card identity 可重建，才允许讨论 matched improvement。当前仓库还没有这些运行时遥测和 named eval/runner owner，因此不启动实现或性能承诺。

## 9. 当前不确定与停止条件

| unknown | 目前不猜测的内容 | reopen / next evidence |
| --- | --- | --- |
| 真正瓶颈 | 模型、context、CLI、MCP、磁盘、队列、owner wait 尚未分解 | trace baseline |
| 并发上限 | 当前脚本和控制面不能证明 scheduler/capacity | runner telemetry 与固定 fan-out probe |
| skill loader | 是否按需加载、缓存或重复注入未知 | loading comparison |
| fan-in 质量 | 多 lane 是否减少或增加 Main 返工未知 | reconnect case + independent review |
| early stop | 一致性是否足够可靠未知 | 有明确 sufficiency rule 的独立候选 fixture |
| candidate selection | 预测成本是否小于节省的执行成本、confidence 是否校准、漏选是否可恢复未知 | 真实候选搜索 consumer、固定生成预算、pairwise/listwise 选择记录和 direct/predict-then-verify 对照 |
| provider 选择 | Vercel AI SDK、DeepSeek harness 或其它 adapter 的速度/成本比较未测 | 同合同、同 fixture、同 runner 的 provider comparison |

停止条件：没有 named consumer/runner、没有可重建 identity、没有 decision-changing measurement，或并行收益小于协调和 context 成本时，回到直接/顺序处理，不再新增调度机制。

## 10. 当前处置

- system-layer topology：`candidate / acceptance-pending`；
- WorkCell core：不变，继续 `active-after-prerequisite`；
- `.agents/skills/`：不新增并行 carrier，继续 incubation；
- Vercel AI SDK / DeepSeek Harness：只作为未来同合同 adapter/provider comparison 的候选，不在本记录中选定；
- implementation/runtime：`not-authorized`。

trace baseline 的 schema design 已形成并完成边界 review。下一项最小实践改为等待 named eval/runner
owner 返回冻结 card、可重建 identity、schema/clock/telemetry permission；只有这些关系成立后，才
决定是否执行一个固定 trace baseline。loading、fan-out、negative topology 和 provider comparison
仍是后续独立 probe，不在本轮继续展开；若 owner return 不成立，则关闭当前 matched 分支为
`no-proposal-now`，不进入 runtime 设计。

## 11. 独立 review disposition

Herschel（Agent 01a03a98-107d-71a0-bb5d-b6859848ea39）完成只读 review，建议
accept-with-revisions：拓扑、WorkCell 外层边界、source 限制和未授权声明成立；但要求把“顺序依赖”
与“实际关键路径”分开，把单写者收窄为指定 authority/owner 的写权限，并把 early stop 限定为特定
多采样/一致性候选。上述三项已在本记录中修订；LaneResult 与 ProjectionUpdate 也显式标为
system-layer conceptual role，不是 WorkCell canonical record。

当前 review 只接受这份研究/设计候选的边界与表达，不接受性能 improvement、WorkCell protocol change、
parallel skill、runtime design 或 implementation authorization。

## 12. Static trace baseline 回返（2026-08-25）

### 对象与 baseline

对象是既有 `planning-inbox-round-3` 的 runner、正式 output、JSONL、stderr 和 run identity；本次只读
读取，没有重跑、改写或新增 Run。baseline 是当前 runner 实际表达的拓扑，不把外部启动器的行为冒充
runner 内部保证。下述 birth/mtime 是本次读取时的 current filesystem observation / non-persisted，
没有写入既有 `run-identity.md`，不能当作可由 Run artifact 独立重建的 timing evidence。

### 直接观察

- `evals/skill-evaluation/tools/planning-inbox-round-3/run-planning-inbox-round-3.sh` 只接受一个 item（A–E）；每次调用以后台方式启动 old/new 两个 arm，
  两个 arm 都结束后才返回 pair completion。它支持 item 内 pair-level 的启动拓扑与 pair barrier，
  但不证明实际并发重叠、也不证明 A–E 的全局 scheduler。
- `run-identity.md` 记录十个正式 arm 的 usage 合计为 `166211 input / 68608 cached / 13329 output /
  6240 reasoning` tokens；十个 JSONL 都只有一个 `turn.completed`，可见事件中没有 tool call。
- stderr sidecar 的 filesystem birth metadata 显示 A-old/A-new 在 18:42:31 创建，B–E 的八个 sidecar
  在 18:43:07 创建；正式 output 的最后修改时间分布到 18:43:43。它只支持“sidecar 文件创建时间
  存在分组”的观察，不等同于进程 start/end、scheduler batch、模型耗时或 queue wait。
- JSONL 事件没有可用于 child start、model call、handoff、fan-in 或 review 的时间戳；stderr 只有
  Cloudflare MCP `AuthRequired` warning，不能据此归因 latency。

### 判断更新

| 层 | 当前结果 | 不能推出 |
| --- | --- | --- |
| item 内拓扑 | `source-observed: runner background-launches old/new + pair barrier; actual overlap/timing unknown` | 不推出真实并发重叠、全局并发上限或 pair 之外的调度保证 |
| item 间启动 | `filesystem-metadata evidence: A 与 B–E 分组创建` | 不推出外部 scheduler 的具体波次、排队原因或 wall-clock speedup |
| context/usage | `usage observed, 每个 arm 带独立输入` | 不推出输入处理就是主要 latency 来源 |
| runtime trace | `insufficient` | 不推出模型、CLI、MCP、磁盘、队列或 owner wait 的归因 |

当前 hypothesis 保持：重复 context、粗粒度 batch barrier 和 goal/owner 串行路径值得验证；真正瓶颈
仍是 `unknown`。这次 static trace 没有把研究候选提升为 performance evidence，也没有改变 WorkCell、
DeepSeek 或 implementation 的阶段边界。

### disposition 与下一实践

处置（本节为 dated static-trace history，current standing 见 §14）：`continue / design-only / owner-gated / trace-gap-narrowed`。下一项最小实践只是为一个固定
planning case 设计可重建的 trace baseline，至少定义 process/arm start、queue/ready、model/tool、
return、handoff、review 和 projection timestamps；在 named eval/runner owner、冻结 card、统一 schema
和 runtime telemetry 权限成立前不得执行 Run。若这些前置关系无法取得，则保持 unknown，关闭 matched-
probe 分支为 `no-proposal-now`，不制造调度机制。

## 13. Static trace review disposition

Anscombe（Agent `01a03a9e-40ba-7fe3-b74e-c88a779a6b87`）完成只读 review，确认 runner、run identity
和 filesystem stat 的证据层级已基本分开；建议把 sidecar birth/mtime 标为 non-persisted current
filesystem observation，把“分组启动/批次间隔”收窄为“sidecar 文件创建时间分组”，并明确下一实践
为 owner-gated design-only。上述三项已修订；未发现新 Run、额外 artifact、runtime 授权或性能结论。

该 review 只接受 static trace 回返的证据上限与下一设计边界，不接受 matched improvement、scheduler
capacity、runtime telemetry 已存在或任何实现授权。

## 14. Trace baseline 设计回返（2026-08-25）

### 对象、owner 与允许效果

本次最小实践只设计一个固定 planning case 的诊断 trace，不执行 probe。trace 是评估/研究证据的
临时记录，不是 WorkCell record、Run completion、runtime state、acceptance 或新的 scheduler
mechanism。它的目标是把 queue/ready、lane、model、tool、handoff、review 和 projection 的等待与
工作时间分开；它不能在没有可比时钟的情况下制造 wall-clock 结论。

当前 named eval/runner owner、trace authority 和 acceptance owner 都是 `unknown`。Main 只维护这份
设计候选，不能代填 owner、发起 Run 或授予 telemetry 权限；未来的 runner owner 负责产生原始
observation，独立 reviewer 负责检查证据边界，acceptance 仍由未命名的接受者决定。

### 固定 case card（设计模板，不是 Run）

执行前必须冻结以下承重关系；缺一项就保持 owner-gated，不执行：

| 关系 | 最小内容 | 不能推出 |
| --- | --- | --- |
| case identity | `case_id`、`card_version`、task/source digest、candidate snapshot revision | 不把旧 round artifact 当作新的 matched baseline |
| execution identity | model/provider、harness/CLI revision、workspace、permission profile、runner revision | 不把请求模型名当作实际 served model 或 runtime identity |
| topology | direct 或 lane topology、fan-out width、fan-in owner、允许 writer | 不把 Agent 数当作并行收益 |
| effect/quality | allowed effect、source/acceptance consumer、quality rubric、停止条件 | 不把 review、validator 或 self-report 当 acceptance |
| telemetry authority | 采集 owner、schema version、clock source、retention/visibility permission | 不把文件 birth/mtime 或 token usage 当 process/model timing |

### 最小 trace span schema

单条 span 只表达一个可观察时间区间或事件，不把任务输入、权限、运行状态和记录事实都压进一个
泛化的 `input`/`state` 字段。以下是 design-level minimum；字段名不是 WorkCell protocol 或
runtime contract：

| 字段 | 作用 | 必须保留的未知/限制 |
| --- | --- | --- |
| `trace_id`、`span_id`、`parent_span_id` | 将同一 card 的 case/lane/子操作重新连接 | 不能跨 card、跨 runner 或 source revision 猜 causal identity |
| `case_id`、`unit_id`、`lane_id` | 区分 direct unit、独立 lane、handoff 和 review subject | 缺少 unit/lane mapping 时只保留 case-level observation |
| `span_kind` | `case`、`lane`、`queue`、`model`、`tool`、`handoff`、`review`、`projection` | kind 是观测分类，不是 runtime lifecycle 或自动动作 |
| `clock_id`、`started_at`、`ended_at`、`timing_quality` | 记录同一时钟域内的开始、结束和完整度 | 不同 `clock_id` 不直接相减；`partial`/`not-comparable` 只能返回 unknown |
| `source_revision`、`card_version` | 防止 source/card 漂移后仍合并结果 | revision 不匹配时结果 stale，不能参与 matched comparison |
| `status` | `completed`、`failed`、`cancelled`、`stale` 或 `unknown` 的观测结果 | status 不是 completion、acceptance、retry 或 recovery controller |
| `usage_ref`、`error_ref`、`effect_ref` | 指向 usage、失败和效果证据的原始记录 | 缺失引用不补猜；usage 不是 latency，effect 不是 quality acceptance |
| `observed_by`、`recorded_at` | 说明哪个采集者记录了这条 observation 及其记录时间 | 采集者不是 owner；记录存在不证明事实已被接受 |

### 派生规则与反观察

- 只有同一 `clock_id`、完整 `timing_quality`、相同 `case/card/source revision` 的 span 才能计算
  queue wait、model/tool time、handoff、review、fan-out/fan-in 或 projection duration；其它结果写
  `unknown`，不以近似时间补齐。
- filesystem birth/mtime、JSONL 缺少事件、token usage、Agent 自报完成和 sidecar 分组只能分别作为
  filesystem observation、artifact gap、usage observation、自报或文件分组 observation；它们不能
  回填 `process start/end`、model time、queue wait 或 wall-clock speedup。
- source revision 漂移、缺失 parent span、重复 span、clock 不可比或 partial failure 时，Main 只
  保留 stale/unknown 和失败 provenance；不能将 partial result 当作成功 fan-in。
- trace 只能支持“哪里可观察、哪里缺测”和之后的 probe 选择；不能单独证明并行更快、质量更好、
  provider 更优或需要新增 runtime mechanism。

### 当前处置与下一出口

本次实践的处置为 `trace-schema-formed / design-only / owner-gated / acceptance-pending`：它把
“至少记录哪些边界”从一行 probe checklist 收敛成可评审的 design candidate，但真正瓶颈、loading
成本、fan-out 净收益和 provider 选择仍为 `unknown`。只有 named eval/runner owner 带回冻结 card、
可重建 identity、schema/clock/telemetry permission 和一个独立 review 后，才可决定是否执行一个
trace baseline；若这些关系仍不可得，则关闭 matched 分支为 `no-proposal-now`，保留未知，不再添加
调度机制或新 skill。

按 `mechanism-design-review` 的处置，保留这份评估记录设计（`keep`），对新增 scheduler、queue、
registry、runtime state 或强制 lifecycle 机制返回 `no-proposal`；现有 runner/eval owner 的最小
遥测与确定性证据边界足以作为下一候选，直到真实失败、后果和唯一机制属性出现。

## 15. Trace baseline 设计 review disposition

Poincare（Agent `01a03aae-d9eb-7030-b908-448fc1bf73ee`）完成 section 14 的独立只读复核并
`accept`：确认它明确是 design-only diagnostic record，不是 WorkCell/runtime mechanism；保留
owner、clock、source revision 和 causal identity 的未知；并明确 token、filesystem birth/mtime 与
self-report 不能证明 latency。该 review 只接受 trace schema 的边界表达，不接受 Run、telemetry
availability、matched improvement、性能结论或实现授权。

## 16. Static context footprint observation（2026-08-25）

### 对象与测量边界

本节只测量当前工作树中可能进入 Agent context 的 Markdown 原始字节和行数，不测模型 token、loader
行为、首响应时间、总 wall-clock 或缓存命中。`item-ledger.md` 的 current projection slice 定义为从
文件开头到 `## 历史/迭代记录（默认折叠）` 之前；它包含 authority map、当前快照、执行面、整体 checkpoint、
总览、contract projection、当前不突进分支和迭代记录要求。历史标题本身及其后的内容是默认折叠的
lineage。该分界是读取约定与当前结构观察，不是新的 authority 或永久 loader contract。

### 直接观察

| context surface | lines | bytes | 解释边界 |
| --- | ---: | ---: | --- |
| `AGENTS.md` | 42 | 3,634 | 项目入口与边界；不证明 loader 实际加载它 |
| `planning/README.md` | 108 | 7,107 | discovery/read-order 入口；不证明历史不会被额外读取 |
| `planning/item-ledger.md` current projection slice（历史标题之前） | 337 | 50,515 | 当前 projection 的静态 footprint；不替代完整 ledger |
| `planning/item-ledger.md` full file | 2,055 | 209,911 | current + history；其中 159,396 bytes 位于 current slice 之后 |
| `planning/plan.md` | 934 | 76,550 | pre-implementation 顺序及历史；不证明每个 child 都需全量加载 |
| `planning/roadmap.md` | 548 | 40,556 | long direction 及历史；不证明应作为每个 child 的默认 context |
| 11 个 `.agents/skills/SKILL.md` 合计 | 1,550 | 129,906 | 当前 skill corpus；不证明全量加载是瓶颈 |

按原始字节相加，`AGENTS + README + item-ledger current projection slice` 为 61,630 bytes；加入完整
`plan.md`、`roadmap.md` 后为 178,736 bytes；若再全量加入 11 个 skills 则为 308,642 bytes。若按
当前文件直接全量读取，则同一组 planning authority（`AGENTS + README + item-ledger + plan + roadmap`）
为 338,132 bytes，加上 skills 为 468,038 bytes。这些是静态上限式 accounting，不是实际 served
context、token 或 latency。

本轮收回 roadmap 对 item/review current projection 的重复正文，并修正 item-ledger 的历史 preamble
边界及 WorkCell source-map wording；plan、skills 和历史 dated sections 未因此改变。上述重测只更新静态 source footprint，不构成 loader、cache、token
或 wall-clock 改善证据。

### 独立回读回返（2026-08-25）

一名只读 continuation reviewer 对 authority split、roadmap consolidation、静态 accounting 和下一波
路由做了独立检查，未修改文件。review 确认 roadmap/ledger/plan 的 authority 分层、数值重测和实现冻结
一致；同时发现原先把第 334–338 行的历史说明包含在 current slice，已按本节的 1–333 定义修正。
该回返只完成 static-footprint boundary bookkeeping 与 route review，不取得 throughput acceptance、
性能结论、named owner、Run 或实现授权。

### 判断更新与允许效果

- 当前最强观察从“skills 可能很大”收窄为两个待比较的 context surface：`item-ledger` 的历史重复，
  以及全量 skills/plan/roadmap 的条件加载；两者都还不能被归因成实际慢。
- 一个可能的 route-pack 设计是默认读取入口 + current projection，在需要追溯时再按 source/record
  读取历史；这只是 loader/projection candidate，不创建第二份 ledger、不改变 authority hierarchy，
  也不授权移动 `planning` records。
- 下一项 loading probe 应至少比较：full-file planning context、current-slice-aware planning context、
  以及 current slice + 单一主 skill + 必要相邻 skill；同时保留 source coverage、unknown、回读次数、
  token/usage 和 latency 的独立记录。
- 在实际 loader、runner、model、clock、permission 和 card identity 可重建前，不能把静态字节减少
  写成速度提升、成本下降、质量不变或需要新 runtime 机制。

本节为 `static-context-footprint-observed / correction-applied / independent-review-complete / acceptance-pending`
的局部观察；它不改变本
研究候选的 `owner-gated / acceptance-pending` 总 standing，也不新增 trace schema、parallel skill、
WorkCell 字段、Run 或实现授权。

## 17. Current source footprint reconciliation（2026-08-26）

后续 current planning edits 使 §16 的静态数值不再代表当前工作树；本节保留旧测量作为历史观察，并按
同一语义边界重测当前 source。`item-ledger.md` 的 current slice 仍只取历史标题之前，未把历史内容删除、
移动或复制到第二份 ledger。

| context surface | current lines | current bytes | 与旧测量的关系 |
| --- | ---: | ---: | --- |
| `AGENTS.md` | 54 | 5,415 | current project-entry wording after routing bootstrap through the next-generation seed, marking the previous workflow as design-prework rather than formal design, and separating seed development from the old committee framing |
| `planning/README.md` | 245 | 21,881 | current read/checkpoint entry plus conditional transition-package route, bootstrap seed route, design-prework/formal-design separation, separate human design/plan/audit routes, records/index routing, one-level planning artifact organization, the planning work-map application, action-linked reminder rule, research settlement/frontmatter route, Main project-work method route, problem-first design method route and main-goal scope projection; it remains a discovery projection, not a second authority |
| `planning/item-ledger.md` current projection（历史标题之前） | 705 | 98,819 | current projection after path transition, index-layer and field-expression/work-map rule reconciliation, structured current snapshot replacing composite standing strings, frontmatter pruning application, research-to-harness application-handoff boundary, current application handoff audit including long-horizon design consumer receipt and follow-up review, design-use receipt correction, goal-scoped method-evolution projection, WorkCell harness-test consumer and design-practice-before-review projection, P12/P13/P16 independent review and follow-up-clean reconciliation, initiative evidence/mechanism synthesis, parent-relation coverage reconciliation, owner-package interaction simplification, Main layout-dogfood adoption observation, matched cold-reader/reminder probe return, research settlement/frontmatter projection, Main project-work dogfood return, long-horizon forgetting problem correction, task-continuity mechanism boundary, problem-first design method synthesis, long-horizon variable-boundary mapping, provisional task-continuity concept boundary, task-level allocation/replication and contamination-boundary mapping, main-goal scope and sub-agent method reconciliation, harness candidate routing, design/development current-snapshot reconciliation and applicability observation, complexity/tool-readiness boundary review, engineering-control source review, GitHub source discovery and continuity design-readiness preparation; history unchanged |
| `planning/item-ledger.md` full file | 2,478 | 267,425 | current file observation after path transition, index-layer and field-expression/work-map rule reconciliation, structured current snapshot replacing composite standing strings, frontmatter pruning application, research-to-harness application-handoff boundary, current application handoff audit including long-horizon design consumer receipt and follow-up review, design-use receipt correction, goal-scoped method-evolution projection, WorkCell harness-test consumer and design-practice-before-review projection and prior WorkCell/throughput/initiative updates, parent-relation coverage reconciliation, owner-package interaction simplification, focus-refresh method clarification, roadmap projection deduplication, layout/settlement/Main dogfood returns, settled auxiliary projections, long-horizon forgetting problem correction, task-continuity and current/history snapshot reconciliation, WorkCell canonical consistency audit, problem-first design method synthesis, long-horizon variable-boundary mapping, provisional task-continuity concept boundary, task-level allocation/replication and contamination-boundary mapping, main-goal scope and sub-agent method reconciliation, harness candidate routing, design/development current-snapshot reconciliation, applicability observation and checkpoint history return, complexity/tool-readiness boundary review, engineering-control source review, GitHub source discovery and continuity design-readiness preparation |
| `planning/plan.md` | 114 | 7,611 | current-only plan carrier after transition bootstrap and plan/history separation; routes the current bounded action through the next-generation bootstrap seed redesign and retains only current authority, bounded wave, allowed effects, non-goals, handoff, rollback and replan conditions; historical plan snapshot remains outside the normal planning read surface |
| `planning/roadmap.md` | 586 | 46,700 | current file observation after path transition, workflow reconstruction priority, index-layer link reconciliation, bounded-record authority clarification, wave-boundary clarification, controlled-experiment/provisional-adoption/research-settlement, Main project-work method and goal-scoped method-evolution entries, research-to-harness application-handoff boundary, frontmatter pruning application, WorkCell harness-test consumer and design-practice-before-review projection, complexity/tool-readiness and engineering-control settlement projections, initiative evidence/mechanism synthesis entry, task-continuity direction for long-horizon forgetting, PL-08 facility review revision/review return, PL-10 analogy review return, PL-12 definition review entry, engineering-control source fingerprint update, research-surface settlement reconciliation and projection deduplication back to item ledger/research records |
| 11 个 `.agents/skills/SKILL.md` 合计 | 1,589 | 133,189 | current skill corpus after capture-as-memory-preservation clarification and work-map/field-expression rule additions |

按原始字节相加，入口 + current ledger（实际为 `AGENTS.md + planning/README.md + current ledger`）为 `126,115` bytes；再加入 current plan/roadmap 为 `180,426` bytes；
再加入 11 个 skills 为 `313,615` bytes。全量 current authority 为 `349,032` bytes，加上 skills 为 `482,221`
bytes。上述数字只是静态 accounting；它们没有证明 loader 实际采用该边界，也没有证明 token、latency、
cache 或质量改善。

本次 reconciliation 的最小改变是把读取边界从易漂移的固定行号改为现有历史标题，并把当前入口明确为
按需 route pack；不新增 loader、cache、scheduler、parallel skill、Run 或 runtime。当前 standing 仍为
`source-observed / inference-backed / trace-schema-formed / independent-review-complete / design-only /
owner-gated / acceptance-pending`。后续若当前主体继续变化，只更新 current measurement；若要验证速度，
仍需 named runner、可重建 card/identity、统一 clock/schema 和 telemetry permission。

## 18. 最小吞吐决策面与 work-estimation 回返

前面的 accounting model 能说明应观察哪些组成部分，但还不能说明一次 probe 结束后怎样改变下一项
判断。本节补一个最小的 decision surface；它是研究设计，不是性能承诺、runtime schema 或 Run 授权。

### 18.1 目标状态与最小模型

吞吐优化的目标不是“更快返回”或“调用更多 Agent”，而是在固定任务、source、权限和接受关系下，更快
形成可接受的有效进展，同时不丢证据、不增加不可接受的成本或纠偏负担。当前只需估算到能区分下一项
选择的粒度，不预设数值阈值：

```text
T_useful = setup + queue + critical_model/tool_path + handoff + review + rework
C_total  = model/tool usage + coordination + context/handoff + human interruption
Q_guard  = acceptance/quality + source coverage + unknown preservation + boundary safety
```

其中 `T_useful` 不是单纯的 process wall clock：它要到达一个可观察的有效进展点；`C_total` 不能只看
token；`Q_guard` 不是把质量压成一个分数，而是保留必须同时满足的质量与边界条件。具体容忍度由真实
consumer/acceptance owner 决定，当前保持 `unknown`。

### 18.2 只改变一个主要变量的 probe 顺序

为了避免把“条件加载”和“并行拓扑”混成一个无法归因的结果，最小顺序是：

1. **loading branch：** 固定 direct topology，只比较 full-file、current-slice-aware route pack 和
   route pack + 必要相邻 skill；观察 `T_useful`、`C_total`、source coverage、unknown 和回读次数。
2. **topology branch：** 固定同一 context、source snapshot、model、workspace、权限和接受条件，比较
   direct、2-lane 和 4-lane；观察关键路径、fan-in/rework、质量和人工打断，不把 lane 数当作结果。
3. **reconnect branch：** 在固定 topology 下加入缺失 source、stale、冲突和 partial failure，确认速度
   变化没有来自丢弃证据、跳过 review 或把 unknown 误写成成功。

每一 branch 只在上一 branch 的主要混杂因素已能区分时开启；如果 loading 与 topology 都没有可解释的
差异，返回 `no-proposal`，不继续增加 lane 或 context 变体。

### 18.3 观察结果到下一分支的路由

| 观察 | 下一项最小判断 | 不能直接推出 |
| --- | --- | --- |
| queue/ready 占主要时间 | 检查 runner capacity、依赖 barrier 或 owner wait 的真实来源 | 需要新 queue、scheduler 或更高并发 |
| model/context 占主要时间，且质量守住 | 比较 route pack、缓存和最小 handoff 的独立贡献 | 静态字节减少等于 wall-clock 提升 |
| handoff/fan-in/rework 占主要时间 | 收窄 lane contract、返回 schema 或合并 topology | 并行本身无价值，或需要统一总 workflow |
| review/acceptance 占主要时间 | 区分不可并行的 authority 判断与可并行的准备工作 | 可以绕过 review、owner 或 acceptance |
| quality、unknown 或 boundary safety 退化 | 关闭该 treatment，回到 direct 或减少变量 | 用 token/时间收益抵消语义损失 |

这张表把测量结果接回 work-estimation 的“下一状态/发现分支”判断；它不把任何观察自动升级为方案接受。

### 18.4 停止与接受边界

一个 topology 或 loading candidate 只有在以下关系都可回读时，才有资格进入后续 adoption 讨论：

- `T_useful` 在预先约定的容忍度内改善；
- `C_total` 和人工打断没有超过接受者能容忍的范围；
- `Q_guard` 的 source coverage、unknown、review、acceptance 和 boundary safety 没有回归；
- failure、stale、取消、重连和 partial result 的边界仍可观察；
- baseline/treatment 的 runner、model、harness、workspace、card 和 clock 可重建。

任一关系缺失时，只能保留 `unknown`、`hold` 或 `no-proposal-now`；不能用更多重复 Run、更多 Agent 或
更多 tokens 掩盖不可归因。当前尚无 named owner、可重建 identity 或 telemetry permission，因此本节
只形成 `decision-surface-designed / design-only / acceptance-pending` 的研究观察，不启动 probe。

### 18.5 条件性 candidate-selection branch（来源回接）

FOREAGENT 的来源阅读改变了吞吐研究的候选空间，但没有改变当前 probe 的默认顺序。只有真实工作
consumer 存在可区分的候选集合，且单次候选执行足够昂贵，才允许把它作为一个独立 branch 打开：

```text
同一候选生成预算 / task / source / model / quality guard
  → direct: 生成后按原策略执行
  → treatment: 生成后做相对预测，再执行保留的候选，并保留回退
```

这个 branch 的最小观察是：

- `C_predict`：候选比较、数据报告生成/核验、模型调用与并发排队；
- `C_execute_saved`：少执行了多少真实候选，以及是否把节省转成 `T_useful`；
- `Q_guard`：真实胜者保留率、false negative、候选多样性、unknown、review/acceptance 和边界安全；
- `fallback`：低 confidence、冲突、listwise 不一致、报告无效或预测失败时是否回到 direct execution。

只有 `C_predict + C_execute_remaining` 的总成本下降、`T_useful` 改善且 `Q_guard` 不回归时，才保留
该 treatment；否则关闭为 `no-proposal-now`。论文的 `m=10`、`c=0.7`、`k=1` 只是外部 treatment
参数，不迁移为当前默认值。pairwise 预测也不能直接当作全局排序或 acceptance；候选 identity、选择
observation 和实际 WorkCell Run/RunRecord 必须分开。
