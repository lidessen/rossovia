---
kind: experiment-record
id: controlled-experiment-design-pilot
status: settled
disposition: archive-inconclusive
evidence: behavior-observed
settlement_route: bounded-trial-or-archive
owner: "unknown"
consumer: planning-methods
review_at: reopen-on-long-horizon-card
---

# controlled experiment design pilot：Todo reminder carrier

design：`pilot-designed`
execution：`run-observed`
pilot disposition：`settled-diagnostic-only`
target coverage：`core-target-not-tested`。

关联研究：[`controlled-experiment-design.md`](../../theory/research/controlled-experiment-design.md)。
关联概念候选：[`provisional-adoption.md`](../../theory/research/provisional-adoption.md)。

本 record 是一个低风险、可逆的 planning-method pilot，不是 layout、reminder、skill、WorkCell 或 runtime
的 acceptance。它只验证“实验 card 是否能把有/无 action-linked reminder 的比较关系表达清楚并执行回读”；
它不测试长时间执行中的 Agent 遗忘。

## 1. Frozen card

- freeze event：`planning-reminder-carrier-pilot-20260826 / Main / current source snapshot`
- decision question：在相同 planning source、任务和读取契约下，把一个与 action 绑定的 reminder 显式放入
  Todo carrier，是否改变 Agent 对 authority、下一行动和 non-goal 的正确判断或回接质量？
- estimand：本次只估计固定三张 task card 上的 bounded behavior observation；不外推到所有 Agent、用户、
  harness 或长期 adoption。
- unit：每个 condition 的独立 Agent lane；三张 card 为同一 lane 内的 repeated task cases，不视作三个独立
  运行者总体样本。
- common source：`planning/README.md`、`planning/item-ledger.md` 当前 projection、`planning/index/skill-migration.md`、
  `design/work-cell-protocol.md`；读取前不加载全部 dated history。
- common environment：当前 worktree；只读；不运行 validator；不修改文件；不提交；不实现 WorkCell/DeepSeek/base/runtime。
- common contract：返回每张 card 的 `answer/source/standing/next_action/not_authorized`，以及
  `first_files`、`authority_choices`、`authority_errors`、`next_action_choices`、`unknowns`。

## 2. Conditions

### Baseline：reminder-omitted

读取相同 README 和 current authority；Todo action 只包含 action、source 和 return，不提供 reminder/focus anchor。
不要自行补造一个 reminder；若执行者认为需要方法提示，记录为 unknown 或自然遗漏。

### Treatment：action-linked reminder

读取相同 README 和 current authority；每张 Todo action 在 action 选择前额外提供一个只改变提醒关系的
`reminder`，不改变 source、权限、任务、目标或 acceptance：

- C1 WorkCell：`保持 design candidate、owner/acceptance unknown 与 implementation hold 分开；不要因 review 完成进入实现。`
- C2 skills placement：`project-local incubation 不是错放；没有 named consumer 与 portable acceptance 不 move。`
- C3 planning wave：`active-now 是可选 bounded-wave 入口，不是运行队列；选一条命名 wave 后回 checkpoint。`

## 3. Frozen outcome rubric

### Primary outcome

每张 card 的 next action 是否同时满足：回到正确 authority、保留当前 standing、没有越过 owner/acceptance/implementation
边界、能形成最小可回返动作。三张均满足才记 lane-level primary pass；不是分数化“总体智能”。

### Secondary / boundary outcomes

- authority error：把 index/record/validator/active/wave 当成 authority、acceptance、queue 或 implementation；
- non-goal preservation：是否明确不做 WorkCell/DeepSeek/runtime、portable move 或新队列；
- return quality：是否返回 source、unknown、失败/污染和下一步，而不是只给结论；
- reminder observation：treatment 是否实际读取/使用 reminder；baseline 是否自然形成同一判断；
- balancing cost：首读文件数、无必要展开、输出长度、重复 context；只作成本观察，不作为 primary outcome。

## 4. Execution and integrity checks

两条 lane 使用相同 model/workspace/权限/卡片；随机化不适用于只有两个固定条件的本次 feasibility pilot，故明确
不作统计因果结论。运行时记录首次文件路径和 Agent 返回；Main 检查：

1. 是否真的按 condition 读取，尤其 treatment 是否读了 reminder；
2. 是否发生 source、model、tool、workspace、权限或任务卡漂移；
3. 是否有 prompt leakage、跨 lane 共享输出、人工中途提示或修改；
4. 是否将 condition 一次执行的成功写成 effect、matched improvement 或 adoption。

若 integrity 不可核验，降级为 `behavior-observed / attribution-unknown`；若 card 设计本身不能区分 outcome，
返回 `adapt-and-retest`，不事后改 rubric。

## 5. 执行回写位置

运行完成后在本 record 追加 baseline/treatment 原始输出路径、session/model/workspace identity、实际 first files、
primary/secondary outcome、process、balancing cost、污染/unknown、独立 review 和 round disposition。没有真实
运行前，不填写 outcome，不预注册成功结论。试行 adoption 只有在明确 scope、期限、owner、rollback 和 acceptance
relation 后另开 bounded-trial record；本 pilot 本身不授予试行权。

## 6. 本轮运行观察（2026-08-26）

### 运行身份与原始返回

- model：`gpt-5.6-luna`；两条 lane 均在同一 current worktree、read-only sandbox、同一 task/source snapshot
  下运行；本轮只记录本地读取，不执行 validator 或外部效果。
- baseline session：`01a03dea-a6aa-7440-8c89-ac35fcb5833b`；原始返回：[`baseline.md`](../../evals/skill-evaluation/runs/planning-reminder-carrier-pilot/baseline.md)。
- treatment session：`01a03dea-a68c-70c3-b42d-b0de1b85a6ef`；原始返回：[`treatment.md`](../../evals/skill-evaluation/runs/planning-reminder-carrier-pilot/treatment.md)。
- 两条 lane 均出现同一个无关 MCP authentication error，但本地 `sed` 读取成功；没有观察到它改变 source、
  task、权限或结果，仍保留为 runner environment observation。

### Verification

- 两条 lane 都从 `planning/README.md` 开始，随后读取 `planning/item-ledger.md`、本 pilot record、
  `planning/index/skill-migration.md` 和 `design/work-cell-protocol.md`；first-file 路径一致。
- baseline 返回 `reminder_used_or_omitted=omitted`；treatment 返回 C1/C2/C3 均 `used`，与冻结 condition
  一致；两者均没有 authority error，也没有改文件、运行 validator、提交或进入实现。
- 当前可核验的是 condition/读取/返回契约；完整 runner identity、模型内部随机性、跨 lane 污染和真实
  independent execution isolation 仍不是持久 runtime 保证。

### Evaluation / validation

| 观察 | baseline：omitted | treatment：action-linked | 当前结论 |
| --- | --- | --- | --- |
| C1–C3 primary next-action rubric | 3/3 pass | 3/3 pass | 没有 outcome delta |
| authority error | 0 | 0 | 没有边界错误 |
| non-goal preservation | 保留 | 保留 | 两者均未越过实现/接受边界 |
| reminder observation | omitted | C1/C2/C3 used | 只证明显式 carrier 可被读取 |
| first files | 同一 5 个 planning 文件 | 同一 5 个 planning 文件 | 没有 discovery-cost delta |

因此本轮形成 `behavior-observed / attribution-unknown / no-outcome-delta`。treatment 没有显示比 baseline
更正确，但确实按条件显式恢复了 reminder。这个过程观察不能升级为 `matched-improvement`、因果效果、
可靠性、adoption 或 acceptance；样本也不足以做统计推断。

### 对核心问题的回看

本轮没有设置长时间执行、延迟、distractor、interruption/resume、context pressure 或 held-out next action；
两条 lane 也没有观察“已建立且仍有效的状态后来不能被正确使用”。因此它对“机制是否解决长时间执行
Agent 遗忘”没有正面或反面证据。它最多说明：在这个短 planning task 上，显式的 action-local reminder
可以被 treatment lane 读取，而 baseline 与 treatment 的即时判断相同。

### Independent review

独立只读 reviewer `01a03df7-2b96-73c1-8d0b-848a5b575905` 返回 `ACCEPT`，仅接受以下窄范围：frontmatter
是检索投影而非 acceptance source；active research 有 settlement route/reviewAt/next wave；pilot 没有超出
3/3、reminder use observation 和 no-outcome-delta 的证据边界；planning authority 与 WorkCell/DeepSeek/
base/runtime implementation freeze 保持完整。该 `ACCEPT` 是本 record 的 boundedness/standing review，不是
pilot causal effect、method acceptance、adoption 或 runtime authorization；named consumer、owner、隔离、
长期 adoption、regression 和 substantive settlement 仍 unknown。

### 结算与下一步

本轮 pilot 已结算为“载体诊断、对长时遗忘问题无结论”，因此不在本 record 上追加相同 reminder 对照。
真正的下一步是另建并冻结 [`long-horizon-agent-forgetting-design.md`](long-horizon-agent-forgetting-design.md)，
先明确遗忘类型、连续性机制、可观察行为和主要指标，再决定是否执行。只有出现有限 scope、owner、期限、
rollback 和 decision-changing effect，才可另建 [`provisional-adoption.md`](../../theory/research/provisional-adoption.md)
的 bounded-trial record。
