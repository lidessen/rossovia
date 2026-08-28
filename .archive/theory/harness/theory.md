# Agent harness theory

> 活树版。由 `archive/design/harness/THEORY.md` 等 v0.5 资料**解构吸收重写**而来，原出处见
> `theory/research/agent-theory-absorption.md`。本文件是哲学条目在 Agent 环境中生成的**二→三方法／设计理论**：
> 它不是哲学条目，不创建运行时协议、不授权效果、不修订哲学序列；序列是唯一语义根。

## 定位与血统

**主血统：** P01（认识·来源）＋ P15（检验·手段）。
**支持：** P05（特殊性）、P07（入手点）、P09（主次）、P10（时机）、P11（成本）、P13（对抗·应）。
**旧版映射**（v0.5 → 现行）：旧 P15「最小有效跃迁」→ P07 + P10 + P11 组合；旧 P04 → P01；旧 P16 → P14；
旧 P09「注意力分层」→ P09 语义迁移；旧 P11「权威」/旧 P14「投影」→ 无直接条目，由解读/设计层承载。

## Thesis

An agent harness is **task engineering for Agents**（面向 Agent 的任务工程）：把以人类语言表达的工作，
重建为有界 Agent 能可靠执行的工作单元——重建真实任务、重表达为具体变换、构建工作环境、拆分或保持整体、
重组局部分结果而不丢失原始约束。

可靠性不是通过的门数，也不是没有错误中间态；它是**可观察、可包含、可纠正**的分辨力——能保留那些使
错误可见、可遏制、可修正的区分，直到未授权或不可逆的后果逃离之前。简单 harness 可能比全面貌的更可靠：
它产生更好的可执行任务、更少的假记录与恢复故事。

## Base 与方法表达：所有权测试

类比模型 base/post-training 是**架构的**，不是权重主张。本文件里后者称为**方法表达层**：skills、系统提示词、
接收者面向的任务表达、计划与返回。它可以教 agent 如何分解、反思、调查、协作或选择下一步——不改变 base 契约。

**base** 是最小稳定机制，使一次调用真实且可恢复；它拥有必须在混乱提示词、供应商替换、进程重启、并发、
绕过首选措辞的调用者面前存活的属性：

- 绑定实际上下文、工具、工作区、隔离、模型适配器与效果边界；
- 保持 Task、Run、Work Cell、身份、生命周期、取消与恢复语义；
- 强制权限、单写者或事务边界、执行/验证/接受分离；
- 发出可重建范围、来源、不确定性与终态含义的证据；
- 翻译外部协议而不把其怪癖搬进通用生命周期或 Task 语义。

**边界是所有权测试，不是新运行时层或强制工作流：** 若方法可改而同一 Task/Run/Cell/effect/evidence/
acceptance 契约保持真实，它属方法表达；若改动需要新生命周期状态、因果同一性、并发控制、恢复、权限强制
或持久证据，它已越过 base 或适配器。

## 行为模式不机制化

四条理由（也是「道日损」式简化与「烹小鲜」式低扰动论证的展开）：

1. **方法是条件的。** 迭代、角色分化、并行调查只在特定不确定性、耦合与效果条件下有用；固定运行时路径
   把判断变成仪式。
2. **方法比不变量演化快。** 新提示词、skill、模型或接收者可能改进方法而不改变 Run 或 effect 的含义；
   把它编进 base 使无害的方法演化变成生命周期迁移。
3. **机制不能制造语义判断。** 调度器可以启动 Run 并收集返回；它不能判定设计是否连贯、两项研究主张
   是否真正调和。
4. **机制耦合隐藏替换失败。** 当贡献契约与效果边界不变时，供应商/模型/提示词/拓扑应可替换；若每个方法
   都要新角色枚举、图模式、队列或终态，base 吸收了它不拥有的语义。

反之：当命名硬属性否则无法保留时才加/改机制（两个写者改同一 Worktree、重启丢失唯一因果身份、取消不能
停止外部效果、必须可重建的结果没有权威证据）。单次提示词失败**不是**机制证据；它是方法/上下文探针的
`yes` 证据、架构变更的 `uncertain` 证据。判定用 `yes / no / uncertain`，不用数值。

## 主对象：任务变换

Task 不是用户的句子、提示词、数据库行或 Todo 列表；它是**关系**：期望改变 × 约束它的对象与源 × 工作
可发生的环境 × 行为者可能造成的效果 × 结果必须留下的证据 × 能接受的拥有者。任务工程保持该关系，只改变
其形式给 Agent。

```text
human intent + world/project sources + constraints + authority
                              │ 重建与重表达
                              ▼
   task model: object, desired change, invariants, evidence, acceptance
                              │ 构建环境
                              ▼
  context + workspace + tools + capabilities + budget + effect boundary
                              │ 保持整体或划分
                              ▼
       one or more explicit Agent-executable work units / Runs
                              │ 执行并返回证据
                              ▼
              candidates + observations + declared unknowns
                              │ 重组整体关系
                              ▼
       synthesis + mechanical checks + semantic review + acceptance
```

这是变换模型，不是强制线性工作流。小局部修复可从任务模型直接进入一个工作单元；大跨项目变更可递归分析、
划分、执行、重组。模型说明当某阶段存在时哪些关系必须保持真实；不要求每个任务都有每个阶段。

**Agent 可执行工作单元**有足够身份而无需猜测：命名输入与源地位、一个请求的变换、可用环境与能力、
允许效果、完成或返回条件、回到整体的证据关系。稳定执行不意味着确定性答案；它意味着歧义、失败与部分
成功保持可观察，不能悄然逃出单元权威。

**分解只发生在真实边界**：独立可知的源、可分离的效果、有界上下文、稳定接口、合成拥有者可重建的证据。
文件、角色、模型、主题不单独定义有效单元。约束或效果仍耦合时保持整体。**重组因此不是拼接或多数投票**：
它恢复跨单元不变量、消解矛盾、向原接受拥有者形成单个候选。

## Plan 是义务，拓扑是可替换方法

语义 Plan 回答「整体必须完成什么、后来的拥有者如何知道已完成」：保留结果、硬约束、权威源、贡献边界、
依赖、证据与接受条件、合成拥有者、重连/合并条件。它不编码供应商、worker 数、固定深度、角色枚举或
特定 swarm 运行时——那些是执行选择，与 Plan 耦合会让载体变化看起来像意义变化。

主 Agent 从 Plan 的实际关系选择拓扑：

| 拓扑 | 何时用 | 返回与边界要求 |
|---|---|---|
| 直接/顺序 | 约束、效果或下一步判断耦合 | 一个拥有者保持整体关系；每步改变命名源/决策/效果 |
| 独立并行探索 | 源族/假设/只读调查可分离且可调和 | 每个贡献者有差异化问题/源面，返回证据、覆盖、边界、未知 |
| 嵌套/多层并行 | 后贡献真实依赖前贡献且依赖降低上下文或效果冲突 | 每层有真界面与合成/重连拥有者；额外深度要挣得协调成本 |

**实践节奏与拓扑正交。** 多轮实践不是贡献之间的拓扑；直接、顺序、并行或嵌套中的任何一种，都可以在新观察
确实会改变下一判断时进入下一轮。每轮记录学到什么、仍未知和最小改变的下一次；重复同一尝试不算迭代。

「Swarm」是一个方便名，不是 Plan 原语或运行时物种。Plan 可从直接执行移到单层或嵌套载体而不改变
语义义务；反之，若换拓扑改变 Task 意义/效果权威/生命周期/证据语义，问题在 harness 或适配器的破界，
不是让 Plan 规定 swarm。

### 多步骤与多任务执行默认由 work map 驱动

凡是包含多个步骤、多个任务、真实依赖、owner handoff/wait、验证与回返，或会跨上下文/较长时间执行的
工作，默认必须先形成一个可回读的外部化 work map，再从中选择下一项行动。能使用的低成本载体都可以
承接它：goal/plan 工具、项目 Plan、task ledger、局部 Todo、当前工作记录；不依赖对话记忆，也不要求
每个微小动作单独建卡。

这里的三个词不是同一个对象：

- **Plan** 保留整体义务、约束、来源、依赖、证据、接受和重连关系；它不变成运行队列或调度器。
- **Task** 是有界的可执行贡献，至少能说明对象、目标、来源/允许效果、完成观察、证据和返回关系；它
  不是把每个想法都包装成任务。
- **Todo** 是当前执行者的可行动义务与回返条件，承载下一步、依赖、等待、失败和重新打开；“由 Todo
  驱动”意味着下一项从它选择，结果、未知和回返会写回它，而不是事后补一份清单。

因此，**多步骤/多任务是方法层面的近强制规则**：没有最小 work map 不应开始正式执行。例外仅限于
一步完成、没有依赖/交接、低风险可逆且完成关系在当前上下文中直接可观察的动作；例外应保持明确而不
把简单动作膨胀成流程。尽可能使用一切可用方式，指的是复用一个已有 canonical work map，而不是复制
出多个 Todo、Plan 或第二队列。

work map 不是静态承诺。发现新依赖、未知、owner-return 或验证失败时，先更新当前关系，再选择继续、并行、
等待、route、replan 或 settle；勾选完成不等于语义接受。并行时，它可以表达依赖、fan-out 和 fan-in，
但不因此取得 runtime 的并发、恢复、权限或调度保证。若要求在提示被忽略、进程重启、崩溃或不可信调用后
仍不可绕过，必须另有 base/runtime 机制；文字 Todo 只能诚实表达方法要求。

### Todo 中的 action-local focus anchor

当某个 Todo action 容易遗漏一条会改变当前判断的方法、边界或回返关系时，Todo 可以携带一个最小的
action-local `focus anchor`。面向人或 Agent 的载体字段当前可暂称 `reminder`，但它不是调度提醒、周期
事件、状态枚举、memory registry 或新的 authority；它只是在选择该 action 时恢复一条已经存在的关系。

最小关系通常由三部分组成：

- **focus：** 这次 action 不能漏掉的最小方法、约束或判断关系；
- **source：** 回到哪一个 canonical source、版本或精确引用核对它；
- **return：** action 完成、失败、过期或遇到未知后，把什么观察写回哪里，或何时重新打开。

因此它和脱离行动边界的 `repeat` 不同：`repeat` 只是再次说一遍，`focus anchor` 与当前 action、来源和
回返相连，才有机会降低遗漏方法的概率。使用顺序是“先从 work map 选 action，再恢复最小 anchor，执行
并观察，最后回写结果/未知并使旧 anchor 失效或更新”；没有会改变判断的增量时跳过，不把全部方法塞进每个
Todo。示意形式如下：

```text
Todo action: reconcile planning information layers
focus: index is a working view; current standing returns to item-ledger
source: planning-information-architecture.md §4
return: update the projection and re-run the structural checkpoint
```

`reminder` 这个词只描述当前承载形式，不冻结未来协议字段名；如果进入 runtime，应重新做对象、owner、
持久化、失效、并发和失败语义的机制审查。只把文字写在一个不会被 action selector 读取的文件里，或只在
完成后补一条说明，都不能证明它比 repeat 更可靠。跨重启、并发、崩溃或不可信调用仍要保证出现时，依然
需要 host/base 的持久化与恢复机制。

## 候选想法如何进入后续 work：应用证据链

“已经记录”不等于“已经使用”，“被提到”也不等于“已经验证”。一个用户想法只有沿着下面这条关系进入
真实 work，才有可审计的应用机会：

```text
source capture
  → candidate definition
  → matched consumer / applicability condition
  → action-local application
  → application receipt
  → trial / design review / runtime evaluation
  → adopt / adapt-and-retest / retain-baseline / no-proposal / archive / uncertain
```

这是一条关系和证据链，不是新的全局状态枚举。每一跳可以由不同的 canonical source 承载，但必须能回指
上一步；没有匹配 consumer 的想法可以保持 candidate，不应被伪装成已经进入计划。

这里还必须把“研究结算”和“系统采用”拆成两条相交但不相等的链：

```text
research question → research result → research disposition

research result → semantic handoff → carrier handoff → activation observation → adoption/reopen evidence
```

`research disposition: archive-*` 只说明当前研究结果离开 active research surface；它不自动表示 harness 已
吸收。一个有价值但尚未完成下游交接的结果，可以结束 research round，但必须在目标 item/plan 中保留
`integration pending` 的应用义务和回返条件，不能把应用义务一同归档。相反，`no-proposal`、无价值、被 successor
取代等有理由的结果，才可以在没有未决应用义务时归档。

面向实际系统的候选，至少要分别观察：

- **semantic handoff：** 结论进入明确的 theory/design/plan/skill/system candidate；
- **carrier handoff：** 目标载体有 source identity、revision、lineage 和相称 review；
- **activation observation：** 真实 harness/runner 在可重建 work 中确实选择、读取或执行该载体；
- **adoption evidence：** 后续 work 或 trial 观察到目标关系和边界，并完成保留、改写、回退或不采用决定。

载体存在不等于 activation，activation 也不等于效果；这四层是独立的应用证据，不是要添加到一个长 status
字符串里的四个枚举值。若未来要求跨重启、并发或不可信调用后仍必须 activation，需要 host/base/runtime 提供
持久化、选择和恢复证据，文档或 archive link 不能替代它。

### 1. 候选必须有最小应用契约

当一条想法从 inbox/research 进入可推进候选时，Main 或对应 owner 只需补齐与当前判断有关的最小关系：

- 它要改变的具体问题、对象或设计判断；
- 什么 work/context 才适用，什么最近邻或边界不适用；
- 允许改变的效果，以及明确不能由它推出的结论；
- 当前 consumer、最小 owner、预期观察和回返位置；
- 若要验证因果，采用哪张 baseline/treatment/acceptance card；若不需要实验，哪种 design review、反例或
  真实应用足以支持本轮判断。

这组关系可以留在 candidate record、plan 或 work-map 中，不要求每个想法都新增 frontmatter 字段。已有
`consumer`、`owner`、`settlement_route`、`review_at` 和 action-local `reminder` 足够时，不再创造同义字段。

### 2. 只在匹配的 work 中拉取

开始一个新的 design、development、research 或 evaluation work 时，Main 先从当前 source 和 item ledger
恢复与该 work 的问题、对象和边界真正匹配的候选小包；不把所有用户想法灌入所有上下文。匹配后才把其中最小
的一条放入 Todo action 的 focus/source/return 关系中。若候选不适用，应记录 `not-applicable` 与理由；若
前置未成立，应记录 `deferred` 与回返条件。两者都比沉默跳过更诚实，也不需要用户每次手动提醒。

应用前的 Todo 形状可以是：

```text
action: design the field shape
candidate_source: planning-information-architecture.md §2026-08-26
applicability: this design introduces or revises frontmatter fields
focus: keep only fields that change a current decision or route
allowed_effect: revise the design proposal and record a counterexample
return: application receipt with retained, demoted, merged or no-proposal result
```

### 3. 应用必须留下回执

回执不是“我读过这条原则”，而是说明它是否改变了动作或判断：

```text
candidate_source
consumer/work
relation: applied | not-applicable | deferred | trial-prepared
action_or_decision_delta
observation / counterexample / unknown
evidence boundary
next route and owner
```

`applied` 只有在候选确实改变了设计、任务选择、工具准备、实验方案或停止判断时才能使用；只出现在上下文、
被复述或被链接不算应用。`not-applicable`、`deferred` 和负结果必须保留，避免下一轮把同一想法误认为从未
处理而重复堆叠。

### 4. 按主张类型选择验证方式

- **设计形态或信息结构主张：** 初始设计完成后的独立 review 必须做一次删减、最近邻和反例检查；真实
  consumer 使用后再检查是否改变判断，不把静态字段存在当作效果证据。
- **方法效果主张：** 冻结 baseline、主要 delta、正例/边界/回归和接受关系，进入 bounded comparison 或
  试行卡；不能用一次成功的 dogfood 冒充匹配改善。
- **长期采用主张：** 需要采用后的回归/逃逸观察；短期使用只能说明 `applied` 或 `behavior-observed`。
- **跨重启、并发、取消、权限或外部效果的硬保证：** 必须由真实 host/base/runtime 和可重建评估验证；
  文档、prompt 或 Todo 不能宣称已经保证。

### 5. 每个波次和 goal safe point 都做应用对账

波次结束时，Main 不只检查 Todo 是否勾选，还要对账：本波匹配了哪些 candidate、每个候选得到什么回执、哪些
仍未采样、哪些需要进入试行/改写/回退/归档。长期或无限执行的 goal 在语义 checkpoint 或相称 safe point
执行同一对账；“未匹配”是可见结果，不是静默遗忘。只有真实 consumer、作用边界和证据回执出现时，候选才
能进入共享方法或系统设计；否则回到 `candidate`、`hold` 或结算路径。

这条链能提供的是**流程级保证**：进入当前 authority 的候选不会在没有匹配、回执或结算理由的情况下悄悄消失。
它不能单独保证模型一定遵循文字；若要在提示被忽略、进程重启或不可信调用后仍强制发生，才需要把选取、持久化
和恢复关系提升给 host/base/runtime，并另做机制审查。

它也内置了用户要求的“回落”：初始设计 review 先修剪无承重字段和机制，实践后再根据回执保留有效关系、合并
重复关系、降级派生 projection 或归档无价值候选。没有 decision delta 的候选不继续生成 sibling artifact。

## 对象论：谁可以为此发言

第一个设计动作是本体的。`verification`、`retry`、`success` 这类名字不是拥有者。每个对象有单元、源、
权威、终态条件与易混淆邻居：

| 对象 | 真实拥有者 | 它可以建立 | 它不得建立 |
|---|---|---|---|
| Intent / Task / acceptance | Principal 或委派域拥有者 | 请求、约束、合格决策 | 一个 Run 已完成它 |
| Run 与效果边界 | 编排与边界拥有机制 | 一个因果执行身份与允许控制/效果 | 语义质量或接受 |
| Cell 执行 | Work Cell | 有界工具活动、声明的终态证据、机械结果形状 | 工作解决了 Task |
| 适配器 | 一个外部协议的集成 | 请求/响应翻译、供应商标识、错误语义 | 通用生命周期、Task 意义、终局权威 |
| 机械证据 | 其确定性观察者 | 关于命名现存主体的可复现事实 | 相关性、完备性、有用性、意图满足 |
| 候选/结果主张 | 其生产者 | 被提议的与引用的证据 | 独立正确性 |
| 语义评审 | 独立、知源的评审者 | 关于候选适配与不确定性的推理发现 | 效果、合并、发布或接受权威 |
| 接受 | Principal 或明确委派的接受拥有者 | 采纳、残余风险判断、授权不可逆承诺 | 事后证明每个判断客观正确 |
| 投影 | 其声明源与渲染者 | 源事实的可检查重建 | 独立事实、活性或权威 |

典型模块所有权可据此落图，但模块物理迁移不移动它不拥有的事实或权威。

## 四种认知动作（「验证」不是一种动作）

许多 harness 因把这一切都叫「verification」而变得不透明。它们不是同一状态的不同阶段，回答不同问题、
需要不同拥有者：

1. **观察**：现在可复现地发生了什么/存在什么？摘要、路径、模式、命令退出、工具痕迹、编码断言可回答。
   改变工作区或调用外部 API 的观察者是执行，不是观察。
2. **机械符合**：观察主体满足显式、可判定契约吗？是范围化的观察（形状、命名测试通过）。
3. **语义判断**：给定源、意图、候选与证据，结果是否真实相关、充分、足够安全、忠于请求变换？即使评审者
   是 Agent，这仍是带不确定性的解释性比较。
4. **权威**：候选可以引起效果或被采纳吗？效果权威属于因果边界；接受属于 Principal 或委派接受拥有者。
   评审推荐，不授权。

顺序不普适。低后果的局部工作可能只需测试加人检；发布可能需要写前的新鲜权威、接受前的独立评审。
**不变的是证据含义**：机械通过仍是机械通过，评审仍是给接受拥有者的主张。

## 效果、因果同一性与真未知

潜在不可逆的外部效果用严格因果所有权；同一系统不得在 UI 已调用「重试」时暗中新建 Run。UI 可投影
live/terminal/unknown，但不得仅为避免显示 unknown 而自造持久活性权威。

证据与未知：结果必须让范围、源、不确定性、终态含义可重建；未知是**声明**而不是待办或模糊词。
确定性门不能证明语义质量——门证明的是其断言范围，不是相关性、完备性或意图满足。

## 机制派生与生成性

从「累加机制」改为「派生机制」：每当疑似需要新机制，先过机制准入检查——命名硬属性、最小机制、
现有机制无法保留的关系、缺少它的失败是真实的。**生成性** = 结论可从无例外表推出的能力；
一个审查门若只靠例外表，它没有生成性，不应作为机制。

## 当前通用设计候选

“默认凭常识自主运行、小错事后纠偏、重大方向/权限/共享基线/不可逆后果才请示”当前统一记录为
[`default-autonomy-with-correction.md`](default-autonomy-with-correction.md) 这一通用 harness design
candidate。它是人与独立运行 harness 的上层工作关系；[`owner-facing-progress.md`](owner-facing-progress.md)
是其中的重大事项例外通道，planning、WorkCell 等只是 consumer。上述链接不表示 candidate 已接受为
skill、runtime mechanism 或 base contract。长任务或角色/场景切换中的重要方法复述由该 candidate 的
`focus refresh` / `focus anchor` 规则承载；它是增量 context projection，不是新的 authority、审批门或
runtime state。

“所有设计都是验证系统的局部投影，不能只按孤立载体判断”当前记录为
[`relational-verification-design.md`](relational-verification-design.md) 这一通用 design candidate。
它要求在局部 delta、最小 context 和系统性关系回看之间保持张力；不要求建立全局 graph、统一 schema
或新的 review/runtime gate。

“多步骤/多任务执行默认由 Plan、Task 和 Todo 组成的最小 work map 驱动”当前记录为本理论的通用方法
candidate。它要求下一行动、依赖、等待、回返和 fan-in 可回读，但不创建第二 planning authority、
全局 Todo queue、runtime scheduler 或强制状态机；当前 behavior、matched improvement、adoption 和
runtime guarantee 仍待真实 consumer 与回归观察。

“如何在减少人工催促和审批的同时，让 Agent 主动发现、选择、推进并纠偏”当前先作为独立 research
 candidate 记录在 [`../research/harness-agent-initiative-research.md`](../research/harness-agent-initiative-research.md)。
该记录当前以 `goal-linked bounded initiative` 为对象，并以 `goal-linked action loop` 组织目的承接、
局部选择、行动可达、后果归因、反馈纠偏和合格停止；它与默认自治、设身处地和系统性验证相连，但尚未
成为理论结论、skill、runtime mechanism 或 WorkCell 字段；研究的当前对象、来源、指标和 unknown 仍由
该 research record 拥有。

## 项目应用（吸收自三 dogfood 线等）

本 harness 的发展同时观察三条线：harness base（运行时机制）、方法表达层（skills/提示词/上下文/计划/
实践选择）、本项目的工作流（路由、入口、dogfood 启动、观察记录、评审处理、构建/重启/回滚、日常 UI）。
每条发现应命名其主要线、证据、拥有者、下一个探针；改动跨线只在证据显示拥有线无法单独保持所需关系时。
提示词失败不是 base 证据；缺失生命周期/恢复不变量不是 skill 问题；同一 Task/Run 证据可同时告知三条线，
但一条线对下一步保持主要，且没有线成为第二权威。

## 修订纪律

修一个应用场景，当代表性失败显示其拥有者无法观察、包含、恢复或为硬约束指派权威。改本理论，
只有当证据改变了某条解释区分或推导规则。供应商怪癖、单次提示词失败、新 UI 偏好先归适配器/skill/
策略/本地设计。理论更新本身不授权新机制、架构变更、效果或人类接受。
