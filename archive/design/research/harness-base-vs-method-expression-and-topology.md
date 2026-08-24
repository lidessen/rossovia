# Harness 基座与方法表达层的职责边界

**Status:** source-bound design research
**Observed:** 2026-08-20
**Disposition:** `open`
**Scope:** 研究 harness 基座、skills/system prompt 方法表达、语义计划与执行拓扑的边界；比较多轮实践迭代与并行探索—综合模式。
**Source limitations:** 当前结论主要来自仓库设计理论、Skill 合同和既有研究；尚未进行新的跨模型、跨 carrier 匹配实验。

> 本记录是可修订的项目研究，不创建 runtime，不改变 Sequence，也不授予任何层新的事实、效果或接受权。

## Question

在 Agent 能力不稳定、上下文有限、执行 carrier 可替换的前提下：

- harness 基座必须保证什么；
- skills/system prompt 应该承担什么；
- 语义计划如何与执行拓扑解耦；
- 多轮迭代、顺序执行、单层并行、嵌套并行何时可以互换；
- 什么情况下必须改变机制，而不是继续修改 prompt。

## Distinctions

### Harness 基座

Harness 的核心不是更长的 prompt 或更多 Agent，而是把任务转化为可执行、可观察、可重建的 Agent work unit，并保留：

- 真实 workspace、工具和效果边界；
- Run/Cell 身份、停止、恢复、取消与因果关系；
- 单写入者、权限、资源和外部效果控制；
- source revision、机械证据、未知状态和返回契约；
- 子结果与整体约束之间的重建关系；
- 独立 review 与 Principal acceptance 的边界。

这与 [`Agent harness theory` 的 Thesis](../../design/harness/THEORY.md#thesis)、[`Primary object: task transformation`](../../design/harness/THEORY.md#primary-object-task-transformation) 和 [Harness owner map](./coding-harness-runtime-substitution-2026-08-15.md#rossovia-owner-map-after-substitution) 一致。

### Skills/system prompt 方法表达层

本稿暂把“后训练层”作为工作称呼：指模型参数之外的 Skill、system prompt、任务表达和 receiver-facing context；它不等同于 SFT、RL 或权重训练。其职责是：

- 让 Agent 看到当前行动需要的 source、方法和边界；
- 表达如何形成贡献、如何记录证据、如何反思和返回；
- 在不改变运行时事实的前提下改善任务理解和行动表达。

它不能凭文字：

- 创建不存在的工具或 workspace；
- 授予写入、提交、发布或接受权；
- 制造独立 reviewer、持久 Run、恢复能力或单写入者；
- 将 summary、projection、child claim 变成事实。

参见 [`context-engineering` Scope](../../skills/context-engineering/SKILL.md#scope) 与 [Harness theory: Prompt text is only one projection](../../design/harness/THEORY.md#agent-working-environment-a-receiver-specific-local-world)。

### 语义计划与执行拓扑

语义计划回答“整体必须保留什么”：

- overall outcome；
- source revision；
- global obligations；
- contribution units 与依赖；
- coverage、reconstruction、verification；
- effect owner、acceptance owner；
- 未解决关系与停止条件。

执行拓扑回答“这些 work unit 由什么 carrier 执行”：

- Main 直接执行；
- 严格依赖下顺序执行；
- 独立贡献的单层并行；
- 有明确局部收益时的嵌套/多层并行。

[`runtime-mapping`](../../skills/agent-delegation/references/runtime-mapping.md#keep-the-semantic-topology-fixed) 明确要求 carrier 改变时保持 contribution contract、效果边界、返回证据和 Main 重建责任不变。因此，计划不应编码 provider、并发数、固定深度、role enum 或特定 workflow runtime。

## Evidence

1. [`agent-delegation` contribution gate](../../skills/agent-delegation/references/delegation.md#contribution-gate) 只在独立 source、分离 effect、注意力冲突或独立 review 关系真实存在时委托；共享 contract/state 保持单写入者。

2. [`agent-delegation` topology table](../../skills/agent-delegation/references/delegation.md#topology) 已给出：
   - independent sources → parallel investigators；
   - disjoint effects → parallel makers；
   - shared state → one maker；
   - consequential candidate → maker then fresh reviewer；
   - strict dependency → sequential work。

3. [`runtime-mapping` carrier selection](../../skills/agent-delegation/references/runtime-mapping.md#select-the-execution-carrier) 将 direct、native delegate、persistent Run、bounded hybrid 视为不同 carrier，而非不同语义组织。

4. [`agent-delegation-and-dynamic-workflows`](./agent-delegation-and-dynamic-workflows.md#compared-forms) 区分 Agent-as-tool、handoff、fixed parallel batch、dynamic workflow 和 shared team。Dynamic workflow 只在后续调用依赖前序结果时有必要；handoff 不等于普通分解。

5. [`autonomous-collective-agent-systems` Project synthesis](./autonomous-collective-agent-systems.md#project-synthesis) 指出反馈环可以是 local、parallel、hierarchical 或 distributed，拓扑应服从依赖与扰动，而不是固定组织图。Agent 数量、活动量和一致性都不是 collective intelligence 的替代指标。

6. [`agent-cognition-memory-engineering` Cheap swarm](./agent-cognition-memory-engineering.md#cheap-swarm-where-the-reaction-is-real) 要求并行探索具有独立 source facets、差异化方法、coverage/uncertainty/boundary obligation、source-based reconciliation 和外部 acceptance；简单复制同一 prompt 后投票或拼接会放大相关错误。

## Plan / topology decoupling

当前建议：

| 关系 | 计划层保留 | 拓扑层可替换 |
|---|---|---|
| 任务整体 | outcome、invariants、source revision、acceptance | direct 或分解 |
| 局部贡献 | question、sources、effects、return evidence | sequential、single-level parallel |
| 依赖关系 | predecessor、coverage、reconstruction | barrier、follow-up、dynamic workflow |
| 多层贡献 | inherited whole、same/narrower authority、local benefit | nested child 或直接由 Main 完成 |
| 结果处理 | source reconciliation、uncertainty、review、acceptance | native child、persistent Run、hybrid carrier |

因此：

- 计划可以在 direct、顺序、单层并行、多层并行之间迁移；
- carrier 变化不应改变计划的语义；
- 计划若无法表达 coverage、reconstruction 或 acceptance，首先是 task-shaping/domain-plan 问题；
- carrier 若无法保留这些关系，才是 mechanism/adapter 问题；
- 多层 swarm 不是默认升级路线，只是待验证的拓扑选择。

## Multi-round practice pattern

多轮不应被理解为“同一 prompt 自动重试”。其最小形式来自 [`practice-cycle`](../../skills/practice-cycle/SKILL.md#core-method)：

1. orient：读取实际状态与上一轮结果；
2. name contradiction：明确当前阻碍与硬约束；
3. choose smallest practice：选择能改变判断的最小 probe/action；
4. act and observe：由指定 owner 执行；
5. reflect：对照 disconfirming observation；
6. settle / continue / route；
7. 只有 decision-changing learning 才外化。

Harness 必须保留 attempt/run lineage、source revision、effect evidence、terminal standing 和恢复边界。Skill/system prompt 可以教 Agent 如何反思和返回，但不能凭文字建立这些持久事实。

## Parallel exploration → synthesis pattern

建议的最小模式：

1. Main 冻结整体 outcome、source revision、hard constraints 和 acceptance owner；
2. task-shaping 判断整体是否可直接执行、需要 guarded execution 或 transformation；
3. 只形成具有真实独立性的 contribution；
4. 每个 contributor 获得 receiver-specific task/return contract；
5. 并行执行只允许在 read-only 或 disjoint effects 下发生；
6. Main 根据 source、coverage、uncertainty 和 cross-unit relations 重建整体；
7. 独立 reviewer 检查 candidate，但不接受、合并或发布；
8. Principal 或指定 acceptance owner 负责最终采纳。

Synthesis 不能只是拼接、投票或接受 schema-valid child report。若 reducer 必须重新执行所有子调查，说明切分没有消除主要不稳定性。

## When mechanism must change

| 观察到的缺陷 | 改机制？ | 改 Skill/system prompt？ | 当前判断 |
|---|---:|---:|---|
| Agent 不知道 authoritative source，但 runtime 已有可达路径 | no | yes | yes |
| 方法、non-goal、return contract 表达不清 | no | yes | yes |
| prompt 声称有工具，但工具实际不存在或效果未受 host 控制 | yes | no | yes |
| child identity、stop、restart、recovery 或 lineage 无法重建 | yes | no | yes |
| 多个执行者可写同一共享效果 | yes | no | yes |
| carrier/adaptor 删除或改写了冻结的 child prompt | yes | no | yes |
| 计划缺少整体约束、coverage 或 reconstruction | no，先修 task/domain plan | possibly | yes |
| 模型能力在真实 matched probe 中仍不满足任务容忍度 | no，先 task-shape/model-policy | maybe | uncertain |
| 只是怀疑更长 prompt、更多 Agent 或更深 swarm 会更好 | no immediate change | no immediate change | uncertain |
| 语义 correctness、acceptance 或 irreversible judgment 被自动化吞掉 | yes，恢复 authority boundary | no | yes |

规则：若缺陷跨越真实效果、生命周期、恢复、持久身份、并发或证据边界，必须改机制；若机制已能提供真实能力，只是 Agent 没有在正确时机获得方法或 source，优先改 context/skill expression。若尚无 matched evidence，保持 `uncertain`，不得用主观评分替代验证。

本研究的判断统一采用 `yes / no / uncertain`，不使用数值评分、加权总分或“可靠度分数”。

## Existing-sequence coverage

本研究不提出新的 P-ID，也不修改 Sequence。当前已有覆盖：

- P09：注意力分层，支持 source 与方法按行动时机交付；
- P02：以实际 runtime 和 source evidence 为准；
- P03：实践—认识—再实践，支持多轮迭代；
- P05：具体问题具体分析，支持按任务依赖选择拓扑；
- P08：可证伪性，要求 disconfirming observation；
- P13/P14：claim、projection、verification 与 fact authority 分离；
- P15：只选择保留硬约束的最小有效跃迁。

这些关系已在 [`principles/SEQUENCE.md`](../../principles/SEQUENCE.md)、各 Skill 的 Principle expression 以及 [Harness theory](../../design/harness/THEORY.md#three-constraint-axes) 中表达。

## Possible decision delta

当前可见的最小决策变化不是增加一个 runtime，而是明确一条跨文档边界：语义计划固定整体约束与重建关系；harness 负责真实执行、效果、生命周期和证据机制；Skill/system prompt 负责 receiver-facing 方法表达与 source delivery；direct、sequential、single-level parallel、nested parallel 仅是可替换 carrier。

只有在后续 matched probe 表明现有 carrier 无法保留这些关系，或现有方法表达反复导致同一可观察的行动缺陷时，才分别考虑 mechanism/adapter 变更或 Skill/context 修订。

## Comparative inspiration only

《道德经》在此只作比较启发，不是工程证据、Sequence 来源或命名来源。比如“有无相生”可帮助提醒我们区分机制所能提供的实际能力与方法表达所能显现的行动空间；“反者道之动”可启发对失败后改变下一实践的关注。

这些比较不强行命名任何 runtime、topology、Skill 或 principle，也不把经典语句转译成未经验证的设计规则。是否保留这些比喻，仍待 Principal 确认。

## Strongest no-proposal case

现有 `context-engineering`、`task-shaping`、`practice-cycle`、`agent-delegation`、`rossovia-development` 和 Harness theory 已经覆盖：

- 方法表达与 runtime 能力的区分；
- 计划与 carrier 的区分；
- direct/sequence/parallel/nested 的条件选择；
- Main synthesis、独立 review 和 acceptance；
- 机制变化的 owner 与 failure boundary。

因此当前没有新增 runtime、固定 swarm schema、统一 workflow engine 或新的 Sequence principle 的必要。若此研究产生实际决策变化，最小结果应是补充一份 source-linked design note 或对现有文档做边界澄清，而不是先实现机制。

## Disposition and next evidence

**Disposition:** `open`

后续只需验证几个关键未知：

- 同一语义计划在不同 carrier 上是否保持等价的 effect、return、review 和 acceptance 关系；
- 多层拓扑是否在任务真实需要时减少 Main 的注意力负担，而不是增加重建成本；
- 方法表达的改善是否跨模型/跨 carrier 保持，还是仅是单一 prompt 效应；
- 什么时候应将“后训练层”改称为更准确的“运行时方法表达层”。

## 待确认术语

- **“后训练”**：是否只是 Skill/system prompt/context expression，还是包含权重层训练？建议暂用“运行时方法表达层”，避免与 SFT/RL 混淆。
- **“Harness 基座”**：是否特指 Work Cell/Orchestration/Integration 的执行机制，还是包括整个 task-engineering 关系？建议明确为“机制 + adapter + runtime-owned evidence”，不把 provider policy 混入核心。
- **“Plan”**：建议限定为 semantic obligation/reconstruction plan，不指 scheduler 或 execution graph。
- **“Swarm”**：建议作为比较用俗称，不注册为固定 runtime 类型；正式文本使用“parallel contributors”与“nested contribution”。
- **“多轮”**：建议限定为 observation 改变 next practice，而非自动 retry。
- **“Synthesis”**：应指 Main 对 source、coverage、uncertainty 和 cross-unit relations 的重建，不是拼接或多数表决。

## References

- [Harness theory](../../design/harness/THEORY.md)
- [`agent-delegation`](../../skills/agent-delegation/SKILL.md)
- [Delegation contract](../../skills/agent-delegation/references/delegation.md)
- [Runtime mapping](../../skills/agent-delegation/references/runtime-mapping.md)
- [`context-engineering`](../../skills/context-engineering/SKILL.md)
- [`task-shaping`](../../skills/task-shaping/SKILL.md)
- [`practice-cycle`](../../skills/practice-cycle/SKILL.md)
- [`rossovia-development`](../../skills/rossovia-development/SKILL.md)
- [Agent Delegation and Dynamic Workflow Forms](./agent-delegation-and-dynamic-workflows.md)
- [Autonomous Collective Agent Systems](./autonomous-collective-agent-systems.md)
- [Agent Cognition and Memory Engineering](./agent-cognition-memory-engineering.md)
- [Coding Harness Runtime Substitution](./coding-harness-runtime-substitution-2026-08-15.md)
- [Research template](../../skills/principle-cultivation/references/research-template.md)
