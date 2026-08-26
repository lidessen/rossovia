---
kind: research-candidate
id: harness-problem-complexity-and-tool-readiness
status: settled
disposition: canonical-proposal
evidence: source-observed
settlement_route: bounded-application-or-archive
owner: "unknown"
consumer: "main-agent-project-scale-work (candidate)"
review_at: reopen-on-second-consumer-or-tool-boundary-counterexample
---

# Harness 问题复杂度与工具准备研究候选

lifecycle：`settled`
disposition：`canonical-proposal`
evidence：`behavior-observed`
boundary：`formed`
application：`observed`
attribution：`unknown`
acceptance：`pending`。

本记录承接 inbox [`IN-2026-08-26-007A`](../../planning/inbox.md) 的用户输入。它研究 harness 如何
根据具体问题的复杂度和风险调整准备深度，并决定复用、选择、创造或打磨工具；不创建复杂度枚举、全局
工具调度器、临时 skill registry 或新的 runtime。

## 1. 研究对象

当前研究对象是 **complexity-adaptive problem preparation and tool readiness**：

```text
problem / real scenario
  → observed complexity and consequence profile
  → proportional problem analysis, work estimate and plan
  → tool/skill/script readiness decision
  → execution and feedback
  → useful progress, rework, cost and guardrail observation
```

用户明确提出两条关系：简单问题应采用简单处理方式；中高复杂度问题需要更充分的问题分析、主要矛盾
分析、工作量评估、Plan 和工具准备，必要时临时创造和打磨工具。这里的“复杂度”暂作为需要观察和
解释的 profile，不预先固化成长期稳定的 enum；“善假于物”和“工欲善其事，必先利其器”是研究来源
与方法隐喻，不是已经接受的机制名称。

## 2. 问题与真实场景

待验证的问题假设是：一种对所有任务使用同样准备深度的 harness，可能在简单、低风险任务上制造不必要
开销，也可能在长时、高耦合或高后果任务上准备不足；工具缺口又可能被误当成模型能力缺口，或通过临时
手工动作反复付出。当前只有用户观察和已有 planning 方法的局部经验，尚无频率、效果或普遍性证据。

目标场景是 Main 或任意 Agent 接到一个真实的多步骤、项目级或更大任务时，必须在行动前决定：

- 是否需要问题分析、主要矛盾识别、工作量估计和显式 Plan；
- 现有 theory、skill、reference、script、外部工具是否足够；
- 是直接使用、局部适配、临时创建，还是投入打磨成为可复用工具；
- 何时停止准备并进入行动，何时因工具缺口返回重新设计。

低复杂度不等于可以忽略安全、权限、不可逆效果或最低验证；复杂度 profile 至少要和 consequence、
reversibility、external effect 一起看，不能只用任务长度或 token 数代替。

## 3. 语义边界与最近邻

| 最近邻 | 它拥有的关系 | 本候选不替代它的部分 |
| --- | --- | --- |
| `work-estimation` | 判断恢复工作图所需的最小工作量粒度 | 不决定所有工具、复杂度等级或全局优先级 |
| `agent-delegation` | 判断局部贡献是否可委派、拓扑和 fan-in | 不拥有问题建模或工具生命周期 |
| `skill-formation` | 判断重复判断差距是否值得形成可加载 skill | 不要求每个临时工具都晋升 skill |
| `form-selection` | 为已确立语义对象选择最小真实载体 | 不证明工具准备本身改善了结果 |
| `agent-harness-throughput` | 比较加载、拓扑、交接和 fan-in 的净成本 | 不决定某个任务应该准备到什么深度 |
| tool/runtime/host | 提供真实权限、执行、隔离、持久化和外部效果 | 不能由方法文字创造 hard guarantee |

本候选不做以下事情：

- 不把复杂度划成一个全局稳定的 `simple / medium / complex` 枚举并据此自动路由；
- 不把工具数量、skill 数量、Plan 长度或准备 token 当作工作质量；
- 不把临时创建的 skill/script 自动写入 `.agents/skills/` 或 portable `skills/`；
- 不以“使用了更多工具”推断 Agent 更有能力，也不把外部工具调用授权写进方法；
- 不把一次准备成功升级为复杂度分类器、通用效率改善或 runtime 调度机制。

### 3.1 本地 source / nearest-boundary review（2026-08-26）

本轮回读现有 living skill 和 research 后，暂不发现需要另造一个“复杂度管理”或“工具管理”总机制的
证据：

- [`work-estimation`](../../.agents/skills/work-estimation/SKILL.md) 已拥有“恢复目标状态、构造最小工作图、
  保留 discovery branch、按当前决策选择估算粒度”的关系，但明确不负责工具选择、预算批准或执行保证；
- [`agent-delegation`](../../.agents/skills/agent-delegation/SKILL.md) 已拥有按真实依赖、隔离性和净收益选择
  direct/sequential/parallel/nested 的关系，但不拥有问题建模或工具生命周期；
- [`skill-formation`](../../.agents/skills/skill-formation/SKILL.md) 已拥有从重复行为差距判断是否形成可加载 skill
  的关系，且明确一次性工具、确定性变换和 runtime 保证应回到其他形式；
- [`form-selection`](../../.agents/skills/form-selection/SKILL.md) 已拥有为已确立语义对象选择最小载体的关系，
  不负责证明准备动作改善结果；
- [`agent-harness-throughput-research`](agent-harness-throughput-research.md) 已拥有
  `T_useful / C_total / Q_guard` 和吞吐/协调成本的观察入口，但不决定一个具体问题需要多深的前置分析；
- [`controlled-experiment-design`](controlled-experiment-design.md) 已形成
  `Problem → Context → Mechanism → Variables → Estimand → Design → Implement → TEVV → Disposition`，
  可承接后续 preparation 的对照验证，但不应被改成所有任务的固定前置流程。

因此当前可辨认的独立 gap 不是“再造一个 skill 来讲工具很多”，而是把**问题特征/后果 profile 如何改变
已有 work-estimation、delegation、form-selection 和 tool-readiness 判断**在项目级工作入口处接起来，并把
临时工具的作用面、权限、验证和回收保留到当前 work map。这个 gap 仍需要真实 consumer 才能判断是否值得
形成独立载体；当前只支持继续作为 research candidate，不提出新 skill、registry、scheduler 或 enum。

## 4. 工作模型与变量候选

### 4.1 复杂度 profile 候选

以下是待研究的观察维度，不是固定字段合同或枚举值：

| 维度 | 需要观察的压力 | 可能改变的准备关系 |
| --- | --- | --- |
| ambiguity / novelty | 目标、来源或成功标准不清，已有方法不能直接套用 | 问题澄清、source review、concept articulation |
| dependency / coupling | 步骤、角色、工具或文件之间存在顺序和共享关系 | work map、Plan、delegation topology、fan-in |
| duration / state | 任务跨较长时间、上下文、会话或中断边界 | checkpoint、continuity、回返和记录 |
| consequence / reversibility | 错误会造成不可逆、外部或高成本后果 | owner review、guardrail、试行和 rollback |
| source / environment spread | 来源、provider、权限、工具或环境不一致 | identity、隔离、adapter 和验证 |
| coordination / contention | 多 Agent、共享写面或资源竞争 | 顺序/并行判断、独立 effect surface、fan-in |

一个任务可以在某些维度简单、在另一些维度高风险；未知本身也可能提高准备要求。后续需要检验这些
维度是否能改变下一步选择，而不是追求一套完整分类学。

### 4.2 方法与工具关系

候选的最小决策路径是：

```text
已有方法/工具足够
  → 直接使用并记录边界
局部缺口且一次性
  → 在当前 work map 中临时补充，保留来源、效果面和回收关系
缺口重复且有独立判断边界
  → 进入 skill-formation review，决定是否形成 incubating skill
机械、确定性、重复性负担
  → 优先考虑 script/tool；语义判断仍由 Agent/ reviewer 持有
需要权限、隔离、持久化或外部效果
  → route 到 host/runtime owner，不由 skill 文字宣称保证
```

临时工具的“临时”表示其生命周期、作用面和回收关系受当前任务约束，不表示可以不记录来源、版本、
权限、失败和使用结果。是否晋升为可复用 carrier，必须由真实重复 consumer、边界和接受证据另行判断。

## 5. 研究问题

1. 哪些可观察的问题特征确实改变准备深度，而不是只增加形式负担？
2. 如何让低复杂度任务保持轻量，同时不漏掉高后果任务的最低检查？
3. 如何判断现有 skill/reference/script 已足够，何时局部适配，何时临时创造，何时值得长期打磨？
4. 临时工具的创建、验证、版本、权限、回收和失败如何被最小记录，且不形成第二个工具管理系统？
5. 准备投入的净价值应如何衡量：有价值进展、返工、延迟、token、工具成本、review 负担和质量 guardrail
   之间是什么关系？
6. 复杂度 profile 与 `T_useful / C_total / Q_guard`、Main project work method、skill-formation 和
   controlled-experiment-design 如何互相连接而不重复？

## 6. Bounded application candidate

在出现真实的多步骤或项目级 wave 后，候选应用可以只增加一张短的 tool-readiness note：

1. 写出目标场景、主要矛盾、复杂度/后果 profile 和最低不可省略的准备关系；
2. 盘点已有 source、skills、scripts、工具和权限，说明复用、局部适配、临时创建或不准备的理由；
3. 冻结最小 Plan 与停止条件，执行后记录准备成本、实际使用、未命中、返工、回收和下一步判断；
4. 若有 direct baseline、相似任务和独立 review，再讨论 preparation method 的 bounded effect；否则只报
   `method-observed / attribution-unknown`。

该应用优先复用 `work-estimation`、`agent-delegation`、`skill-formation`、`form-selection` 和
`controlled-experiment-design`；不创建新的总控 Agent、tool registry、scheduler 或 runtime。当前尚未
指定 named consumer、runner、owner、任务族或接受 rubric，因此不启动 Run、不承诺效率提升。

## 7. 2026-08-26 bounded planning application return

本轮把当前 planning 的 research-surface settlement 作为真实 project-scale planning wave 应用本候选，
不是 synthetic Run 或性能实验。问题场景是：多个 research-like record 都有 source、consumer class 和
reopen route，但当前没有打开的 wave；如果继续把它们写成 active，容易重复综述、扩大 active surface，或
把 owner wait 误读成全局冻结。

### 准备判断

- **问题/后果 profile：** 语义耦合高（共同的 settlement authority、current projection 和 owner/acceptance
  边界），外部后果低且本地修改可回退；因此需要完整的 source/standing/settlement 回读，但不需要新 runtime
  或长期工具管理。
- **主要矛盾：** 研究记录的 `status: active`、`disposition` 和“当前是否占据 decision surface”曾被混在
  一起；本轮必须先区分 settlement destination，再决定是否继续 active，而不是先增加更多研究文本。
- **复用工具：** 复用 `research-settlement-and-closure`、`agent-delegation`、`work-estimation`、`rg`、
  `apply_patch` 和现有 planning/skill validators；没有创建临时 script、skill、registry 或 scheduler。
- **拓扑：** 由于所有 settlement 写回共享 current authority，实际采用 Main direct/sequential；只读
  独立 inventory 本来可以委派，但子进程无法在当前环境建立 app-server 权限，返回 `no-proposal`，不把失败
  当作 child evidence，也不把它记成 parallel gain。

### 观察与边界

本轮识别出 7 个 research-like active surface：controlled experiment、throughput、initiative、engineering
control、complexity/tool readiness、iterative improvement 和 Main project method。它们分别已有 canonical
proposal 或 owner-gated-hold 的合理去向；因此现在把 settlement destination 回写为 current projection，
并保留 owner/runner/acceptance、primary-source access、matched effect 和 adoption regression unknown。

本次只支持 `behavior-observed / attribution-unknown / canonical-proposal`：准备关系改变了下一项处置，
但没有 direct baseline、匹配 wave、wall-clock 或独立 project-scale acceptance，不能声称准备方法提高了效率。

## 8. 证据、结算与回返

- **研究成立的最低前提：** 找到可核验的来源和最近邻边界，并在真实 wave 中观察一次准备选择如何改变
  下一步判断；一次写出 checklist 不足以证明方法有效。
- **应用结果：** 有 matched baseline/treatment、相称任务覆盖、独立 review 和 guardrail 时，才可讨论
  `matched-improvement`；否则保持 `behavior-observed`、`boundary-supported` 或 `unknown`。
- **结算：** 有真实 consumer 后进入 bounded application/trial；若准备收益无法超过成本、复杂度 profile
  不改变决策，或工具边界无法稳定，返回 `no-proposal / retain-baseline / archive-inconclusive`。
- **回返：** 出现第二个独立 consumer、重复的准备失配、工具污染/权限反例，或真实高后果场景需要更强
  保证时，重开 source/boundary review；runtime hard property 另交机制 owner。

当前仍未知 source/版本、profile 的跨场景可观察性、成本/收益关系、named owner 和 acceptance；本轮将研究
结算为 `settled / canonical-proposal`，不是 skill acceptance、portable promotion、WorkCell/DeepSeek/base
实现授权。出现第二个独立 consumer、重复的 tool-readiness 失配、权限/污染反例或可比较效率证据时 reopen；
若未来应用只增加形式负担而不改变下一判断，则改为 `no-proposal / archive-inconclusive`。
