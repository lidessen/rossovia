---
kind: experiment-record
id: long-horizon-agent-forgetting-design
status: active
disposition: design-candidate
evidence: source-bounded
settlement_route: bounded-trial-or-archive
owner: "unknown"
consumer: long-horizon-agent-continuity
review_at: mechanism-card-freeze
---

# 长时间执行 Agent 遗忘：主实验设计候选

artifact：`experiment-record / design-candidate`
problem：`problem-reanchored`
design：`trial-input-contract-prepared`（problem-first card、变量、概念、机制和 allocation 边界已形成）
execution：`run-not-authorized`
acceptance：`pending`。

本 record 回应用户对上一轮对照实验的纠正：我们要验证的不是 Todo reminder 是否被读取，而是
长时间执行中 Agent 能否持续保有并正确使用仍然有效的目标、约束、决定和进度。它是主实验设计候选，
不是已经执行的 Run，也不授权 WorkCell、DeepSeek Harness、base 或 runtime 实现。

## 1. 先定义实验要解决的问题

### 决策问题

在相同模型、任务、工具、权限和预算下，一个明确的连续性机制，是否能降低长时间执行 Agent 的
**功能性遗忘**，并提高中断、干扰或上下文压力后的正确接续？如果不能，应该保留 baseline；如果只
改善记录/读取而不改善接续结果，结论应停在载体或过程诊断，不进入 adoption。

### 功能性遗忘的操作定义

在某个较早时点已经建立、后来仍然有效且没有被新来源撤销的状态，在延迟、干扰、上下文增长、
中断恢复或会话重接后，Agent 不再能可靠地取回、判断或使用它，导致错误的下一行动、重复工作、
违反约束、目标漂移或无法恢复进度。这里测的是行为连续性，不是 Agent 自称“记得”。

### 不要混入的相邻问题

| 相邻问题 | 关系 | 本卡是否作为主问题 |
| --- | --- | --- |
| action-local reminder 是否被读取 | 局部 carrier/readability | 否；旧 pilot 只回答这个窄问题 |
| Agent 是否更主动 | initiative/activation | 否；可能是下游效果，不能替代遗忘定义 |
| 并行是否更快 | throughput/coordination | 否；速度只能是 balancing outcome |
| Vercel AI SDK 还是 DeepSeek Harness | provider/adapter 选择 | 否；更换 provider 会混入模型和 runtime 差异 |
| 是否有一条记录保存了事实 | storage/integrity | 是次级诊断，不等于 Agent 实际使用 |

## 2. 要验证的语义目标与机制候选仍需分开

当前首先要冻结的不是一个机制，而是一个**语义目标**：后续行动是否仍与先前建立且仍有效的任务状态
保持正确关系。任何能够建立这条关系的 carrier、检索策略、恢复流程或 runtime contract，才是后续的
机制候选。`reminder`、实时记忆、聊天记录、通知输入、Todo/进度和恢复关系都可能承载它，但没有一个
名称本身能证明连续性已经成立。

运行前必须冻结 treatment 的最小关系，例如：

```text
较早建立且仍有效的任务状态
  → 在后续决策点仍能确定其适用范围和有效性
  → 当前行动符合该状态对目标、约束、决定和进度的要求
  → 行动结果可观察、可纠偏
```

持久化、来源/版本、检索和恢复是实现这条关系的可能路径；只有当实验问题包含跨进程或版本冲突压力时，
它们才成为该轮 treatment 的必要组成。若只能证明“状态被写入”或“提示被读到”，还没有验证连续性；
如果 treatment 同时改变了模型、工具、任务提示、权限、上下文预算和复盘方式，也不能归因于它。

### 2A. 机制设计审查：不要把载体当对象

当前应先把几个相邻对象拆开：

| 对象 | 它能拥有的关系 | 它不能单独证明/保证的关系 |
| --- | --- | --- |
| `work map / Todo / focus anchor` | 当前目标、下一行动、依赖、回返和最小方法提示的表达 | 跨进程持久化、崩溃后恢复、不可绕过的写入或读取 |
| chat history | 对话来源、顺序和历史证据 | Agent 在长上下文中会取回、理解并使用关键状态 |
| real-time memory | 可能的保存/检索载体 | 记录就是有效状态、最新版本或正确行动 |
| notification | 多来源输入机会和来源线索 | 顺序、去重、优先级、恢复和效果隔离 |
| WorkCell Run/RunRecord | 一次执行的 identity、生命周期、效果和 evidence | 负责系统层语义记忆或目标连续性 |
| base/runtime | 在重启、并发、不可信 caller 和外部效果下强制持久/恢复关系 | 决定目标、约束或最新决定的语义内容 |

因此当前 working designation 保留为 **task continuity relation / 任务连续性关系**，而不是 `memory`、
`resume` 或 `task memory`。它描述的是关系，不是记录、模块或生命周期阶段：

```text
有效 goal / constraint / latest effective decision / progress
  → later decision point 中同一 task state 的适用性与有效性
  → current action 对该 state 的正确承接
```

它的最小语义包括：同一 task instance、仍有效的 task-relevant state、后续 decision point，以及后续
action 对该 state 的正确承接。`source/revision` 在存在来源冲突或版本压力时加入；它们是支持有效性判断的
关系，不是连续性概念本身。它不要求先建立承载所有历史经验的 memory registry，也不把 `no compact` 当作
解决方案。

### 2B. 最近邻与边界

| 最近邻 | 它是什么 | 为什么不是 `task continuity relation` |
| --- | --- | --- |
| persistence / storage | 状态或记录在时间/进程边界后仍存在 | 存在不等于后来被找到、判断或用于行动 |
| retrieval | 在需要时把记录或输入取回 | 取回不等于内容仍有效，也不等于行动承接正确 |
| memory | 保存、索引或检索的载体/子系统 | 载体可以支持关系，但不拥有任务语义或正确行动 |
| resume / recovery | 执行从中断、重启或故障后继续 | 进程恢复可能成功但恢复了过时状态，属于 runtime 过程而非语义成功 |
| work map / Todo / focus anchor | 当前目标、依赖、下一行动和回返的表达 | 是当前 carrier/projection，不能单独保证跨进程持久化或有效版本选择 |
| lineage / revision | 来源、版本、继承和冲突关系 | 支持判断状态是否有效，但不等于 Agent 实际承接了状态 |
| WorkCell Run / RunRecord | 一次执行的 identity、生命周期、效果和 evidence | 记录执行事实，不拥有任务语义连续性 |

包含项是：同一长时任务中，早期确立的仍有效约束使后续行动没有越界；早期决定和进度使后续行动从正确
位置继续。排除项是：记录完整但 Agent 仍违反约束；恢复了进程但选择了 stale decision；或 Agent 偶然做对
了，但没有证据表明它承接了先前状态。

以下反例会迫使边界重做：若一个后续行动不需要任何先前 task state，却被计为 continuity success，说明
外延过宽；若只有跨重启场景才能称为 continuity，说明把语义关系错误收窄为 runtime recovery；若状态的
有效性、当前行动和 task identity 无法区分，说明概念还不能进入正式实验。

当前不提升正式 machine designation：`task continuity relation` 仍是 bounded research 的 working
handle；它比 `memory`、`resume` 和 `task memory` 少携带未经证实的载体/生命周期假设，先保留此名并在
行动 probe 后再判断是否需要更精确的正式指称。无限保留聊天记录可能缓解来源缺失，也可能增加检索干扰、
上下文压力和 stale 选择，必须作为待比较策略而不是机制结论。

机制审查的当前结论是分层的：

- **当前会话内：** 优先复用已有 Plan/Task/Todo work map 与 action-local focus anchor；不新增 runtime
  mechanism。若它们已能让 Agent 在 checkpoint 正确接续，问题属于方法/表达和载体可发现性。
- **跨中断、重启、崩溃或不可信调用：** 如果必须保证 continuity state 被保存、版本可辨、恢复可回读，
  这是 base/runtime/host 的 mechanism candidate；Markdown、prompt 或 skill 只能表达要求，不能宣称保证。
- **实验变量：** 主实验的语义目标是 task continuity relation；实际 treatment 必须是一个具体、单一的
  candidate implementation，用来实例化该关系并与 baseline 比较。chat history、real-time memory、
  notification、Todo 和 provider 是载体/适配选择，不能同时作为 treatment 变化。

当前处置为 `reuse-for-active-session / mechanism-candidate-for-restart-boundary / acceptance-pending`。
这只是设计判断，不是 runtime schema、WorkCell 字段、provider 选择或实现授权。

## 3. 忘记的类型与分层诊断

实验需要把失败拆开，否则一个总分无法告诉我们机制应该修哪里：

1. **storage loss：** 有效状态根本没有被记录，或记录不完整；
2. **retrieval loss：** 记录存在，但在需要时没有被找到或加载；
3. **use loss：** 状态已取回，但 Agent 没有把它用于当前判断；
4. **revision/conflict loss：** 新旧决定、来源或约束冲突，Agent 选用了过时版本；
5. **goal/progress loss：** 目标、非目标、已完成项或下一行动丢失，导致漂移或返工；
6. **resume loss：** 中断、重连、上下文压缩或进程恢复后不能从正确位置继续。

第一轮不应同时把六种压力全部塞进一个 treatment。建议先做 `distractor + interruption/resume` 的
功能性连续性卡；上下文压力/压缩和新旧版本冲突分别作为后续卡，避免无法解释改善或退化来自哪里。

## 3A. Problem-first design card projection

把上一节的语义对象压成当前实验所需的最小变量图如下。这里的“固定”表示为了归因而保持两组一致，
不是声称该变量在真实系统中没有影响；“记录”表示它可能制造变异或影响解释，但当前不是 treatment。

| 变量角色 | 当前对象 | 当前处置 | 仍需冻结/验证的关系 |
| --- | --- | --- | --- |
| treatment | 一个具体 candidate implementation，使同一 task instance 中仍有效的 task-relevant state 在后续 decision point 被正确承接 | 只改变该 implementation；模型/provider/task/tool/权限等不得同时变化；语义目标保持不变 | candidate 是保存、检索、版本判断还是行动重连；若不能拆出，降低归因强度 |
| primary outcome | task-level 的 `checkpoint functional-continuity success rate` | 运行前冻结 checkpoint、分母、首次有后果行动和“不需计划外补充”的判定 | 任务级聚合方式、任务族覆盖和实用最低差异 |
| mechanism / mediator | storage、retrieval、use、revision/conflict、goal/progress、resume 六类失败 | 作为分层诊断，不合成为主分数，不把“写入/读取”冒充功能效果 | 每类失败的可观察证据和互斥/重叠编码规则 |
| confounder | model、provider、task/source、tool、permission、role、budget、干扰脚本、checkpoint 位置、任务复杂度 | 固定或在任务族内匹配/分层；无法匹配时降低因果主张 | task assignment、任务族和 checkpoint 的分配单位；共享 memory/workspace 是否造成 spillover |
| nuisance / environment | provider transient error、运行时抖动、上下文长度、时间/负载、外部工具波动 | 记录并在可行时 block/randomize；污染或不合规 run 单独降级 | 最小重复数、运行顺序、是否需要 warm-up/冷启动控制 |
| guardrail / constraint | 目标/约束违反、stale record 使用、false recall、任务质量回归、token/latency/storage/review cost | 预先列为不能明显恶化的边界，不用主指标抵消 | 采用阈值、停止条件和成本可接受范围由 owner 冻结 |
| measurement / identity | source snapshot、candidate/config revision、model/provider、harness、runner、workspace、时间戳和 raw output | 必须记录，缺失时不声称 matched effect | identity hash、隔离方式、日志完整性和人工干预记录 |
| context / population | 有早期 milestone、延迟/干扰/中断、后续有后果行动的长时任务族 | 当前目标外推范围只限该类任务；不把短 prompt 或单一任务推广为一般 Agent 能力 | 真实 consumer、任务族抽样、代表性和 holdout |

### 当前 estimand 与设计形状

当前要估计的不是“记忆模块是否存在”，而是固定目标任务场景下，能实例化该语义关系的 candidate
implementation 与 baseline 之间的行为差异：

```text
Δ continuity = P(task-level checkpoint success | candidate implementation)
                 − P(task-level checkpoint success | baseline)
```

它是一个设计候选，不是已执行的统计结果。当前首选形状是**任务级配对或任务族内随机分配**，checkpoint
作为同一 task 的嵌套观察点；若只能做单条 baseline/treatment lane，只能报告 behavior observation，不能
称为 matched improvement。成本差异和 guardrail 单独报告，不折算成一个隐藏总分。

### 必须保留、可控制与可忽略

- `task continuity relation`、task/source identity、checkpoint、primary outcome 和 guardrail 是本卡的
  必须保留项；删掉会改变问题、estimand、归因或安全边界。
- model/provider/tool/permission/budget/任务复杂度等不是本轮兴趣，但会影响结果，因此必须固定、匹配、
  分层、随机化或记录，不能写成“无关变量”。
- initiative、throughput、provider selection、载体可读性和完整 memory architecture 当前在目标场景外；
  它们可以作为后续研究或 balancing observation，但不进入本卡 primary estimand。若后续结果表明它们改变
  treatment 激活、结果解释或真实采用决策，就必须重新纳入变量图，而不是继续忽略。

这次映射已把 `task continuity relation` 的语义边界形成一个 provisional、source-bounded 定义；它仍需
用后续行动是否正确承接先前状态来检验，尚未取得正式 designation。当前已完成一条窄的 design-readiness
准备：先把概念压成可观察的 action probe，再给出一个只作用于当前会话的 candidate implementation boundary，
并列出正式 trial 必须由 owner 冻结的输入，不预填任何数值。

仍未闭合的 decision-changing unknown 不是“还要再多写一张设计表”，而是：是否有真实 owner-backed
consumer、哪个任务族能代表目标场景、根据实际最低差异/变异/精度与资源边界应采用什么重复和 precision
计划、guardrail 的接受范围，以及可重建 runner/evidence/reviewer/acceptance identity。因而本卡仍然是
design candidate，不能进入 Run。

### 3B. Action probe：连续性必须落到后续行动

本 probe 不要求 Agent 复述早期内容，而要求它在不被计划外补充关键事实的情况下采取一个有后果的下一步。
最小观察单元固定为：

1. **早期状态：** 在同一 task instance 中建立一个 goal、一个不可违反 constraint、一个仍有效的 latest
   effective decision 和一个 progress fact；每项都能回指 source 与当时的有效范围。
2. **间隔压力：** 插入预先可重建的延迟、distractor 或 interruption，但不把关键状态重新注入后续输入。
3. **后续 decision point：** 在 checkpoint 让 Agent 选择或执行第一项有后果的行动，并记录它实际可见的
   来源、输入和人工介入。
4. **连续性判断：** 只有当该行动同时承接当前有效 goal、decision、constraint 和 progress，且无需计划外
   补充已经给过的关键事实，才记为 functional-continuity success；“能复述”或“碰巧做对”不单独算通过。

该 probe 的诊断边界如下：记录存在但未被找到是 retrieval loss；找到但行动不承接是 use loss；选了已被
新来源替代的状态是 revision/conflict loss；行动不需要任何早期状态却被计为成功，或 action/state 关系无法
观察，则说明 probe 不能支撑 continuity claim。正式 trial 前必须为这些类别保留可回读证据，不能只保留总分。

### 3C. 一个最小 candidate implementation boundary

为使 treatment 不停留在抽象语义，本轮暂定一个工作性候选：**work-map continuity projection**。这不是
canonical 字段名、skill 名或协议对象，只是本实验的 candidate handle：

- 在早期 milestone，把上述四类仍有效的 task state 以 source-linked、范围明确的 projection 放入已有的
  active-session Plan/Task/Todo work map，并让当前 action-local focus anchor 指向它；不建立新的全局
  memory registry，也不把全部聊天历史当作 treatment。
- 在预先冻结的 checkpoint，Agent 在第一项有后果行动前读取该 projection；若已有来源冲突，只有在当前
  任务确实需要时才携带 source/revision 关系，用来判断有效性，不把它偷换成新的连续性概念。
- 该候选只改变这条 projection 的表达和可见性；模型、provider、任务、工具、权限、预算、干扰脚本、
  checkpoint 和评分保持不变。它不自动 wake、retry、schedule、compact 或保证跨进程恢复。
- 如果真实问题要求崩溃/重启后仍不可绕过地保存、辨识和恢复状态，必须另开 base/runtime mechanism
  candidate；不能把当前会话 projection 的结果外推成硬保证。

因此它目前只达到 `candidate-boundary-formed`，还不是 accepted treatment、WorkCell schema 或实现授权。
若后续无法在不新增其它变量的情况下描述该 projection，主实验应退回 `design-hold / no-proposal`，而不是
继续扩大 candidate。

### 3D. Trial-input contract：只定义需要什么，不预填数值

正式 trial 或相称 bounded trial 至少需要下面这些输入。它们是启动前的关系与证据要求，不是现在要创建的
registry 或运行队列：

| 输入 | 启动前必须能回读的内容 | 当前状态 |
| --- | --- | --- |
| consumer / authority | 真实长时任务 consumer、trial owner、evidence owner、independent reviewer 和 acceptance owner 的职责与回返关系 | named owner/acceptance unknown |
| task family / population | 任务确实有早期状态、间隔压力和后续有后果 action；任务族标签、代表性边界和 holdout 关系 | task family/holdout unknown |
| unit / allocation | task instance 或 matched pair 的分配单位、checkpoint 嵌套规则、运行顺序、独立 workspace/cache 和 spillover 处理 | 结构候选已形成，具体 card unknown |
| repetition / precision | primary outcome、实用最低差异、预期变异、可接受不确定性与资源边界如何共同决定重复和 precision 计划 | 无输入，不写数字 |
| guardrail | constraint violation、stale use、false recall、task quality regression、token/latency/storage/review cost 的停止/接受边界 | owner threshold unknown |
| runner / identity | source/config/candidate revision、model/provider/harness、runner、workspace、时间戳、raw output、人工介入、treatment integrity 和污染标记 | reproducible runner/evidence schema unknown |
| analysis / disposition | 主指标与六类 failure 的编码、缺失/偏离处理、独立 review、matched-improvement、retain-baseline、archive 或 no-proposal 的出口 | acceptance route pending |

缺任何一项时，允许的结论是 `design-ready hold / no-proposal-now`，保留缺口与 revisit 条件；只有这些关系
形成并由相应 owner 冻结后，才可以另开 bounded trial preparation。即使形成，也不自动授权 WorkCell、
DeepSeek Harness、base/runtime 或 provider comparison。

## 4. 主实验 card

### 4.1 比较单位与条件

- **单位：** 一个完整的长时任务实例；checkpoint 是嵌套观察点，不把同一 run 的多个 checkpoint 当成
  独立样本。任务实例应有可匹配的复制或任务族，不能只比较一条 baseline lane 和一条 treatment lane。
- **Baseline：** 普通会话/上下文可用，但没有本卡要检验的结构化连续性关系；具体是否保留聊天历史、
  如何处理上下文压力，必须在冻结 card 时写清，不能运行后补定义。
- **Treatment：** 只增加一个已经冻结、能实例化 `task continuity relation` 的 candidate implementation；
  模型/provider、task source、工具、权限、system/user contract、预算、干扰脚本、checkpoint 和评分方式
  保持相同。具体 carrier 尚未选择，不在本卡中预先把某个字段、SDK 或 runtime 当成答案。
- **辅助对照：** 旧 reminder-only pilot 可以作为 carrier 诊断或负邻近对照，但不能冒充本主实验的
  baseline/treatment。

### 4.1A 任务级分配、重复与污染控制

当前采用四层实验单位，避免把长时执行过程中的多个观察点误当成多个独立证据：

| 层次 | 本卡含义 | 作用 |
| --- | --- | --- |
| canonical task/source | 任务定义、来源快照、压力配置和任务族标签 | 决定 target context 与外推边界 |
| task instance / pair | 被分配 baseline 或 treatment 的一次任务实例；同源的两个独立实例可组成 pair | 主要分配与比较单位 |
| run | 一个实例、一个条件和一个完整 identity 下的一次执行 | 估计模型/运行随机性、失败和偏离 |
| checkpoint | 预先固定的后续决策点 | 嵌套行为观察，不是独立重复 |

分配方案候选如下：

1. 以 task instance 或 matched pair 分配 baseline/treatment；同一 run 内不在 checkpoint 之间切换条件。
   treatment 可能改变状态、策略或可见来源，默认不做 crossover；若以后必须 crossover，要新建独立
   card，使用新的 task identity，并显式分析顺序和携带效应。
2. 以任务族、压力 profile、难度和其它已知可控变异做 block，在 block 内随机化条件和运行顺序。模型、
   provider、工具、权限和预算在本轮固定；若它们成为研究因素，必须另建 factor/对照设计，不能在本卡中
   偷换。
3. 每个实例使用独立 workspace、memory/cache、候选输出和可见日志。若共享资源不可避免，随机化单位要
   提升到共享资源的 cluster，或将受影响结果标为 spillover/contaminated；不能继续把它们当作独立样本。
4. 独立 task source/instance 的重复回答任务族覆盖；同一 source 的多次 run 只主要回答模型/运行随机性。
   checkpoint 只能增加机制诊断。pilot 中每条件一个运行至多证明条件覆盖和日志完整，不能证明 effect。
5. 正式或 bounded trial 的重复数、任务族覆盖和精度计划必须在运行前根据 primary outcome、实用最低差异、
   预期变异、可接受不确定性和资源边界冻结；在这些输入出现前，不写数字、不启动 Run。

分配、实际激活、缺失、偏离、provider 失败和污染分开记录。不能事后只保留“成功激活”的运行；assigned
condition、treatment integrity 和缺失处理规则都必须可回读，per-protocol 子集只能作为另外标记的探索结果。

### 4.2 任务与遗忘刺激

每个任务实例至少包含：

1. 在早期 milestone 明确建立一个目标、一个不可违反约束、一个后来仍有效的决定和一个进度事实；
2. 让 Agent 继续处理与这些状态有关但不立即重复它们的工作；
3. 插入预先固定的 distractor 或 interruption；
4. 在 checkpoint 让 Agent 在不重新提供关键事实的情况下采取下一项有后果的行动；
5. 记录是否正确接续、是否返工、是否越过 non-goal、是否需要人工重新提示。

刺激必须可复现，并且 baseline/treatment 看到相同的任务、干扰、来源和时间关系。不能用“请回忆刚才
内容”作为唯一测试，因为那可能只测文字复述，而不是能否在真实行动中保持连续性。

### 4.3 Primary outcome

主指标为 **checkpoint functional-continuity success rate**：在每个预先冻结的 checkpoint，Agent 的
第一次有后果的下一行动同时满足当前有效目标、最新有效决定、不可违反约束和真实进度，且不需要
计划外人工补充已经给过的关键事实。

secondary/balancing outcomes：

- 分层记录 storage、retrieval、use、revision、goal/progress、resume 各类失败；
- 约束/目标违反率、重复工作和返工量、恢复成功率；
- 任务完成质量、失败类型、人工纠偏次数；
- 首次正确接续延迟、输入/输出 token、工具调用、额外存储/检索成本；
- false recall、stale record 使用、来源缺失和 treatment integrity。

不要把这些指标事后合成为一个漂亮的总分；主指标只回答“能否正确继续”，其余指标解释为什么改善或
没有改善以及是否值得付出成本。

## 5. 执行前的验证与隔离

运行前必须冻结：task/source snapshot、任务族/block 规则、模型/provider、harness 版本、treatment relation、
分配单位与运行顺序、干扰脚本、checkpoint、评分 rubric、重复数/精度计划、缺失与污染处理、停止条件、runner identity、时间戳 schema 和
独立 reviewer。至少检查：

- treatment 没有把关键事实重新偷偷注入 prompt；
- baseline/treatment 没有共享会污染结果的 memory、workspace、缓存或候选输出；
- interruption/resume 的时点、权限和输入边界一致；
- 记录存在不被误写成 Agent 已经使用，Agent 自评不被误写成 behavior evidence；
- 外部 provider/MCP 失败、模型漂移、人工提示和不合规 run 被单独标记；
- 任务族覆盖和重复数足以区分结果；若还没有最低差异、变异或精度依据，或实际数量不足，只能结论为
  feasibility，不能声称 effect。

verification、evaluation 和 validation 要分开：先确认 card 是否按条件执行，再比较行为和成本，最后判断这个 task
是否真的代表我们要解决的长时间执行问题。只有一条短任务、三张局部 card 或 reminder 被读取，均
不能支持长时遗忘结论。

## 6. 分析与处置

- 有 primary outcome 的方向性差异、完整 identity、无关键质量回归、独立 review 和相称重复，才可讨论
  `matched-improvement`；
- 只看到记录写入、提示读取或过程变好，返回 `behavior-observed / attribution-unknown`；
- 结果无差异，或改善不超过额外 token/latency/维护成本，返回 `retain-baseline` 或
  `archive-inconclusive / no-proposal`；
- 只有在真实 consumer、scope、owner、期限、rollback、acceptance 和 adoption/regression window 都有
  回读关系时，才另开 `bounded-trial`；
- 若 treatment 只在某一类遗忘上有效，拆出该边界，不把它宣传为“解决 Agent 遗忘”。

本卡目前不预设样本量和 effect size；在 owner、任务族、runner 和可接受精度确定后，必须在运行前冻结，
不能看到结果后决定“这次算不算够”。没有这些前置关系时，本卡保持设计候选，不执行。

## 7. 依赖、边界与回返

本卡依赖：

- `theory/research/controlled-experiment-design.md` 的 problem-first card、验证/评估/验证目标分离和
  evidence standing；
- 用户提出的实时记忆、聊天记录、通知、Todo/恢复工作系统方向；它们仍是 architecture candidate；
- 一个能够产生可重建 long-horizon task run 的真实 consumer、runner 和 evidence owner。

本卡不决定 Vercel AI SDK 与 DeepSeek Harness 的选型，也不改变 WorkCell core。若要比较 provider，必须
另开同一连续性合同下的 provider comparison；否则 provider 差异会遮蔽机制差异。若真实 consumer、
可重建 identity 或 primary outcome 不成立，本卡归档为 `archive-inconclusive`，保留来源和未解决问题，
不继续增加 reminder、memory registry、scheduler 或 runtime 字段。

## 8. Design-use receipt：problem-first design 与回落规则的真实 consumer（2026-08-26）

本卡作为当前 planning/design wave 的真实 design consumer，回读并应用了以下已有候选；这不是把方法名称
复制到正文，而是记录它改变了哪一个设计判断：

### 8.1 Application work map

```text
- [x] recover the matching candidate pack
  candidate_source: controlled-experiment-design.md; planning-information-architecture.md; theory/harness/theory.md
  applicability: this card defines a complex, multi-step design with variables, evidence and a future trial boundary
  focus: apply problem-first ordering, design-stage pruning, work-map/focus-anchor and handoff distinctions
  return: record which design judgment changed and which evidence remains unknown

- [x] apply problem-first design to the card
  source: controlled-experiment-design.md
  focus: problem/context/mechanism/variables/estimand/design/TEVV/disposition, not carrier-first expansion
  return: primary target, diagnostics, confounders, guardrails, allocation and trial-input contract

- [x] perform the design-stage pruning pass
  source: planning-information-architecture.md; P06 pruning relation
  focus: retain only relations that change decision, attribution or safety; do not add provider/memory/runtime fields
  return: resulting design shape, omitted relations and the reason they remain outside this card

- [x] independent review and reconcile
  source: this section and research-settlement-and-closure.md §2.1
  focus: distinguish design-use receipt from activation/adoption; preserve unknown and no-run boundary
  return: revise if needed, otherwise close this receipt while keeping application obligation open
```

| candidate source | applicability | observed action/decision delta | evidence limit |
| --- | --- | --- | --- |
| [`controlled-experiment-design.md`](../../theory/research/controlled-experiment-design.md) | 本卡要设计一个有成本、有变量、需要对照和接受关系的长时 Agent 实验 | 将顺序固定为 problem → context → mechanism → variables → estimand → design → TEVV → disposition；把 reminder 读取从主问题降为邻近 carrier，把 task-level checkpoint continuity 设为 primary target，并把 storage/retrieval/use/revision/goal-progress/resume 分层为诊断 | source-backed design application；没有 Run、matched effect 或 adoption |
| [`planning-information-architecture.md`](../../theory/research/planning-information-architecture.md) 与 P06 修剪关系 | 初始 design review 可能不断增加字段、机制和压力变量 | 当前设计形状不纳入不改变本卡 decision/attribution/safety 的 provider choice、memory registry、scheduler、runtime 字段和预填数值；保留 task identity、有效状态、checkpoint、primary outcome、guardrail、runner/evidence 关系 | 观察到设计收束，不证明相对于未修剪版本的因果改善、长期维护负担或实验结果改善 |
| [`theory/harness/theory.md`](../../theory/harness/theory.md) 的 work-map/focus anchor 与应用交接规则 | 本卡需要把连续性语义落到一个可比较的当前会话 carrier，同时不能把载体冒充 runtime 保证 | 形成 `work-map continuity projection` 的 candidate implementation boundary，并显式区分 semantic handoff、carrier handoff、activation 和 adoption；不把它写成 WorkCell 字段、memory module 或硬保证 | 当前只证明 design/carrier boundary 已应用；没有真实 harness runner activation |

本次回执的交接判断为：

- **semantic handoff：** 已完成；上述候选改变已经进入本实验设计的 current body 和 item-ledger projection；
- **carrier handoff：** 已完成到 experiment design record 的 candidate carrier；具体 treatment carrier、runner 和
  acceptance owner 仍 unknown；
- **current application observation：** 观察到当前 planning/design work 使用了这些关系，并形成了本节
  design-use receipt；这不是 harness activation；
- **activation observation：** 未观察到真实 WorkCell、DeepSeek Harness、base/runtime 或 long-horizon runner
  选择、加载或执行这些载体；
- **adoption evidence：** 未形成；必须等 named consumer、任务族、runner、独立 reviewer 和 acceptance route
  成立后再开 bounded trial 或返回 no-proposal。

独立只读 reviewer `01a03e80-f09a-7a52-88f9-60345924a2d4` 在本轮返回 `REVISE`：接受上述 design-use
observation 的有界性，但要求明确区分 planning/design use 与真实 activation，并降低 pruning 的因果措辞。
本节已按该意见修订；该 review 不取得 experiment acceptance 或 adoption authority。

修订后的 follow-up 独立只读 reviewer `01a03e82-f290-7a53-afa5-036dd4663775` 返回 `ACCEPT`：确认
planning/design use 与 harness activation/adoption 已分开，pruning claim 与 evidence 相称，item-ledger
projection 一致，且没有额外的最小修订。该接受只覆盖本节 bounded design-use receipt，不覆盖实验 Run、
matched effect、harness adoption、protocol acceptance 或任何实现授权。

随后针对新增的 application work map，独立只读 reviewer `01a03e87-7240-76f3-beb6-01cb41c6dd64` 仅审阅
本节并返回 `ACCEPT`：确认四项 checklist 可以关闭 bounded design-use receipt，且没有把它写成真实 runtime
activation/adoption；该 reviewer 同样确认 evidence limits 已显式记录。它不扩大前两次 review 的范围，
也不取得 experiment Run、matched effect、harness adoption、protocol acceptance 或实现授权。

因此本次 disposition 保持 `retain-design-candidate / wait-for-owner-backed-inputs / no-run-now`。这条 receipt
关闭的是本轮设计方法的应用核对，不关闭实验 application obligation；有价值但未完成实际 activation 的候选
不能因本 record 后续 research 结算而自动归档。
