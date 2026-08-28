---
kind: research-record
id: iterative-improvement-skill-admission
status: settled
disposition: no-proposal
---

# 防退化闭环迭代是否应成为独立 skill：准入审查

> 审查模型：gpt-5.6-luna。日期：2026-08-24。
> 本文是研究记录，不是 skill、living theory、protocol 或 harness base；不创建候选
> `SKILL.md`，也不改变任何现有 owner。

## 结论先行

**verdict：`no-proposal`。** 当前没有足够证据表明“防退化闭环迭代”是一个应被选择性加载、
并能独立改变 Agent 重复判断或行动的 skill 方法。应保留现有理论与流程候选，由现有 owner
承接，不新增 skill 载体。

最高 standing 分两层记录：

- 对已有 round-2 运行中的局部行为，最高只能是 `behavior-observed`；模型、harness、权限、
  workspace、候选 hash、唯一处理变量或 reviewer 隔离有未核实项，不能升级为
  `boundary-supported`、`matched-improvement` 或 `regression-supported`。
- 对“防退化闭环”作为独立 skill 的准入主张，尚未形成 candidate，因而没有 candidate-level
  standing；当前审查结论是研究观察支持的 `no-proposal`，不是 retain、delete 或 adopt。

这不是因为用户希望闭环，也不是因为 `theory/harness/iterative-improvement.md` 已经存在。
理论接受只证明一组 living semantic relations 可被讨论；二审明确把行为有效性、matched
improvement、收敛、组件归因和 runtime 保证留在 `adapt-and-retest`，不能把它们转写成 skill
准入证据（`theory/research/iterative-theory-review-round-2.md:23-32,84-126`）。

## 被审对象与准入缺口

### 实际对象

现有材料中的对象是一个有边界的改善关系：在指定任务、来源、环境、效果边界和接受关系中，
从可复现 baseline 产生 candidate，比较目标行为与硬约束是否保持，并留下可重建证据
（`theory/harness/iterative-improvement.md:5-19`）。它可以指向 artifact，也可以指向产生和
判断变更的 workflow；二者是不同对象，不能因都叫“迭代”而合并。

### 可能被误认成 skill 的主要判断

若把它抽象成 Agent 方法，最接近的一个判断是：

> 面对一个被观察到的 Agent 工作缺口，判断是否存在足够可归因的下一步改变；若有，冻结
> baseline 与接受关系、提出一个受控 delta，选择最小 owner 并返回证据；若没有，保留
> baseline 或返回未知，而不为显示迭代而改动。

这个判断同时跨越 theory 的对象与解释、skill 的方法内化、fixture 的覆盖、workflow/protocol
的匹配与隔离、runtime 的硬属性以及 Principal 的接受。它不是当前某个具体任务中独立触发的
局部方法。尤其是 theory 已把“不能提出候选时返回 `no-proposal` 或 `retain-baseline`”、
owner 路由、controlled delta、污染降级和停止关系作为语义规定
（`theory/harness/iterative-improvement.md:50-68,87-105,111-130`）；把同一组关系再包成
可选 skill 会复制跨 owner 的规则，而没有形成较小的独立行为对象。

### 缺少的重复性证据

skill-formation 要求真实任务、纠正、失败轨迹或可复现 baseline 证明差距，且该差距跨任务
重复、触发可分辨、能由方法表达改变并可观察验证（`theory/skill-formation.md:45-70`；
`.agents/skills/skill-formation/SKILL.md:45-80`）。本次材料没有给出这样的独立证据集合：

- `iteration-process-audit.md` 的结论是已有“提出假设—冻结对照—独立复核—处置—记录”候选，
  但仍未被行为验证；主要建议是检验现有 workflow，而不是再添加一层“更严格”的文档
  （`theory/research/iteration-process-audit.md:16-22`）。
- 审计列出的未知正是 workflow 自身需要回答的未知：当前模型/harness 下的 trial 方差、
  holdout 大小与刷新、reviewer 独立性、以及是否降低 defect escape
  （`theory/research/iteration-process-audit.md:118-131`）。未知不能被 skill 文件的存在
  伪装成重复行为缺口。
- round-2 各 skill review 最多观察到局部产物差异；多份 review 明确因共同条件未核实而停在
  `behavior-observed`。例如 `agent-expression` 的 treatment 主要更完整、更长而未改变核心
  行动（`evals/skill-evaluation/reviews/round-2-agent-expression-review.md:5-8,26-37`）；
  `human-writing` 也要求不把更长、更显式当作行动改善
  （`evals/skill-evaluation/reviews/round-2-human-writing-review.md:23-29`）。这不能推出一个新的“迭代闭环”行为缺口。
- `skill-formation` 的 round-2 结果反而支持在同因性、现有 owner 覆盖和 matched 条件未知时
  保持 `no-proposal`，而不是先制作窄实验载体
  (`evals/skill-evaluation/reviews/round-2-skill-formation-review.md:13-28`)。

因此目前只有流程候选、静态语义审查和若干局部行为观察，没有跨 theory/skill/fixture/workflow
改进任务重复出现且由新增 skill 独占的 Agent 判断/行动差距。

## 现有六个 skill 与 owner 覆盖

以下是除 `skill-formation` 外的六个现有载体。它们各自已有稳定的 description 和一个主要
判断；“闭环迭代”若进入普通激活，必须说明为什么这些 owner 都不能承接，但当前证据没有做到。

| 现有 skill | description / 主要判断 | 对本审对象的覆盖边界 |
|---|---|---|
| `agent-expression` | 将来源有界的任务或方法表达成 Agent 能判断、行动和返回的内容；主要判断是怎样保留对象、来源、效果、未知、失败、返回和验收关系。 | 可承接把已接受的迭代方法表达成一次有边界的 Agent 任务；不拥有迭代理论、载体准入或 runtime。 |
| `concept-articulation` | 从对象证据形成足以区分最近邻的概念、定义和正式指称，并做行动检验。 | 可承接“改善”“baseline”“退化”“收敛”等概念不稳时的概念形成；不能由名称或术语稳定性推出 skill。 |
| `dual-audience-expression` | 为同一来源有界语义核形成面向人和 Agent 的两个视图，保持唯一权威、派生、同步和语义回归。 | 可承接 theory/研究记录与 Agent 可执行视图之间的同步；不拥有 workflow state machine 或第二权威。 |
| `form-selection` | 为已确立语义对象在任务表达、项目指令、普通文档、reference、skill、工具/runtime 等候选中选择最小真实形式。 | 这是当前准入决定的最近形式 owner：若现有 theory、protocol 和当前任务已承载对象，就返回不创建新载体；识别出 skill 候选后仍须交回 `skill-formation`。 |
| `human-writing` | 依照读者、目的、场合和媒介，把来源有界对象写成使人理解、判断或行动的自然表达。 | 可承接研究审查、决策理由和操作说明的写作；文字更长或更清楚不是迭代 outcome。 |
| `agent-delegation` | 判断有界贡献是否应交给另一 Agent，选择拓扑并把带 source standing、覆盖、证据和未知的结果重连回 Main。 | 可承接闭环某一独立 evidence lane 的委派、顺序/并行和综合；不拥有改善对象、protocol 匹配或 runtime 强制。 |

`skill-formation` 自身拥有“重复 Agent 判断/行动差距是否值得选择性载体”的准入和生命周期，
包括 `no-proposal`、改写、拆分、合并、降级和删除（`.agents/skills/skill-formation/SKILL.md:83-104`）。
它不是要求所有可复用流程都变成 skill，而是本次 review 的直接 owner。

## 相邻形式的排除与最近 owner

### 普通 theory / research

改善关系的对象、controlled delta、acceptance card、证据集合、污染降级、处置集合、owner
路由、上游 stale/再生和停止，已在 living theory 中定义；研究审计保存事实、未知和流程候选，
不取得理论或 protocol 权威。理论明确说它不是 protocol、skill 载体或 harness base
（`theory/harness/iterative-improvement.md:1-3`）。这使普通 theory/research 成为当前最小真实
语义形式，而不是新 skill 的证据。

### protocol / workflow / fixture

匹配变量、manifest、baseline/treatment、fixtures、holdout、reviewer 隔离、证据等级和
收敛条件属于 `evals/skill-evaluation/protocol.md`；其唯一处理变量是候选载体的一次激活，
承重条件不完整时不得声称 matched improvement（`protocol.md:19-32,51-78`）。审计建议把已有
防护串成流程状态，而非增加文档层（`iteration-process-audit.md:45-68`）。若实际缺口是污染、
未冻结、fixture 泄漏、grader 不公平、holdout 失效或无法重建，应由 workflow/protocol/config
修复并重跑，不由 skill 激活解决（`iterative-improvement.md:91-105`）。正例、边界、最近 owner、
回归和 fresh holdout 的覆盖缺口也应由 fixture owner 承接。

### 项目局部指令与 runtime/base

仓库边界、living/archive 路径、术语和“不要实现 harness base”等始终有效规则属于项目指令，
不是选择性 skill。必须在提示被忽略、模型/供应商替换、重启、并发或不可信调用下仍成立的身份、
权限、取消、恢复、事务、持久证据和外部效果属于 harness base/runtime
（`theory/harness/theory.md:24-40,42-57`）。skill 只能表达期望边界，不能实现硬保证。

### 现有 skill 的局部方法

方法未内化、漏判或过度触发时，按主要缺口修改对应现有 skill；它不是把所有 owner 的回馈收编成
元 skill。理论的 owner 表也明确将“theory 足够但方法未内化”送到 skill，将“匹配/记录/grader
缺陷”送到 workflow，将硬属性送到 runtime（`theory/harness/iterative-improvement.md:91-105`）。

## 作为拒绝准入的最小边界卡

下列内容不是新 skill brief，而是把本次 `no-proposal` 的判断边界写成未来可证伪的检查；它
说明即使将来出现候选，也不能因“闭环”这一名称直接准入。

| 关系 | 当前审查定义 |
|---|---|
| 一个主要判断 | 是否基于实际、可重复的 Agent 缺口提出一个可归因的下一改变，或在证据/成本不足时保持 baseline、返回 unknown 并路由最近 owner。 |
| 正触发 | 已有真实任务/轨迹中的可观察差距；不同任务或环境重复同一判断关系；可信 baseline、目标/边界/回归预测和接受关系已冻结；现有 owner 无法独立承接；下一观察会改变行动。 |
| 负触发 | 只有“表达不够好”、格式/篇幅/记录更多、单一 fixture 或单次失败；问题已由 theory/protocol/fixture/既有 skill/project instruction 覆盖；缺少 baseline、匹配配置、独立评审或 holdout；需要 runtime 硬保证；维护与协调成本高于后果。 |
| 最近 owner | 语义对象/因果/边界矛盾→`theory`；方法未内化→对应现有 `skill`；任务覆盖/最近 owner 例缺失→`fixture`；匹配、隔离、记录或 grader→`workflow/protocol/config`；任务表达→`agent-expression`；载体形式→`form-selection`；载体准入/生命周期→`skill-formation`；硬属性→`runtime/base`；最终采纳→Principal/接受者。 |
| 允许效果 | 读取来源、观察并保留 baseline/candidate，提出受控 change hypothesis，记录证据与未知，返回 owner 路由建议；不得改写哲学序列、living theory、protocol、runtime 契约、接受决定或未经授权的外部效果。 |
| 返回 | `no-proposal`、`retain-baseline`、`adapt-and-retest`、`rollback` 或 `uncertain` 之一；附对象、来源 standing、覆盖/未覆盖、唯一 delta、预测/反驳、成本、污染、反例、未知、回退锚点和下一 owner。最终接受不由 Agent 或 reviewer 取得。 |

这张边界卡显示该判断是一个跨层综合关系，而非已被发现的独立 skill 触发器。若未来试验把它
编码为载体，必须先证明其在普通激活中自足，不要求回读 P/theory；protocol 也明确把回读理论
作为载体不自足的重大缺陷（`protocol.md:54-69`）。

## 维护/发现成本与 baseline ceiling

独立载体的新增成本包括：额外发现入口和激活误触发；与 theory/protocol/项目指令/六个 skill
重复规则的漂移；把条件方法变成所有任务都要经过的仪式；新增载体、fixture、manifest、review
和回归维护；以及把“流程更严格/记录更多”误当 outcome 改善。`agent-delegation` 的比例规则也
要求额外 Agent、协调文档和 review 先挣得净收益，不能因多主题、多文件或有空闲 Agent 就扩张
拓扑（`.agents/skills/agent-delegation/SKILL.md:35-43,105-113`）。

现有 baseline ceiling 很高：round-2 review 多次发现 baseline 已保留核心来源、边界、停止、
接受和返回关系，treatment 只增加显式程度或篇幅；即使 isolated review 发现 stale projection
或边界拒绝的局部增量，也因共同条件未完整冻结而只能停在 `behavior-observed`
（`evals/skill-evaluation/round-2-design-review.md:38-48,71-86`；
`evals/skill-evaluation/reviews/round-2-dual-audience-expression-isolated-review.md:14-34`）。
在这种 ceiling 下，先加一份“闭环 skill”会使过程更显著，却没有证明目标行为、缺陷发现、采用后
逃逸或最终质量改善；理论明确禁止只以 process 变好声称 workflow 净改善
（`theory/harness/iterative-improvement.md:122-130`）。

## 行为 probes：何时可以重新打开准入

当前不创建 candidate。若未来要重新审查，最低要有能区分“新增 skill 方法”与现有 owner/流程
修复的探针：

1. **跨任务重复性：** 在不同主题、不同 Agent 任务和不同环境中，复现同一个“无依据地继续
   改动/跳过 baseline 或把过程记录当成 outcome”的判断差距；同时给出正例、负例和最近 owner
   例，不能只重复同一 fixture。
2. **matched 行为比较：** 按同一 manifest 冻结模型、任务、来源、工具、权限、harness、
   workspace 和 reviewer 隔离；baseline 不加载候选，treatment 只多一次候选激活。比较实际
   判断/行动、边界拒绝、证据返回和成本，不比较标题、篇幅或 Agent 数。
3. **owner 路由 probe：** 让缺口分别属于 theory、现有 skill、fixture/workflow、
   agent-expression、form-selection、agent-delegation 和 runtime；候选必须正确拒绝不属于
   自己的情形，且不能把理论/protocol 回读变成普通激活前置。
4. **防退化 probe：** treatment 正例改善但 boundary 过度触发、回归失败、holdout 被看见、
   来源 hash/模型/工作区不匹配、reviewer 参与生产、或采用后窗口出现逃逸时，必须返回
   `retain-baseline`、`rollback` 或 `uncertain`，不能继续叠加补丁。
5. **流程 outcome probe：** 将“新增 hypothesis card、独立 reviewer 或 fresh holdout”作为
   workflow 的单一 delta，与旧流程匹配比较真实缺陷发现、误报、采用后回归和 balancing cost；
   记录完整率、review 数或更长输出的上升只能作为 process 观察。
6. **baseline ceiling 与停止 probe：** 给出 baseline 已足够完成核心行动的任务，观察候选是否
   返回 `no-proposal`/`retain-baseline`，而不是为证明迭代价值制造变化；连续重复且没有新观察
   不算新 round。

在这些 probes 之前，最高仍是 `behavior-observed`，不能支持新 skill 的边界或因果净收益。

## 最终 owner 处置

本轮由以下 owner 覆盖，不新增独立 skill：

- **语义判断与迭代关系：** `theory/harness/iterative-improvement.md`；其接受边界和行为未知
  仍由理论 review / Main 的显式处置持有。
- **实验契约、fixture、manifest、grader、holdout、隔离和 evidence standing：**
  `evals/skill-evaluation/` 的 workflow/protocol owner；已有审计建议先把流程候选按真实
  workflow 验证。
- **方法表达与载体选择：** `agent-expression`、`form-selection`、`skill-formation`；各自只
  承接自己的主要判断，不合并为元 skill。
- **独立 evidence lane 与综合拓扑：** `agent-delegation`，由 Main 保留整体和最终综合。
- **项目持续边界：** `AGENTS.md` 等项目局部指令。
- **身份、权限、并发、恢复、取消、持久证据和外部效果：** harness/runtime/base。
- **采纳、回退风险和是否进入 living tree：** Principal 或明确接受者；review 不取得接受权。

因此本轮处置是 **`no-proposal` + retain existing owners**。只有未来出现跨任务、跨环境、可匹配
且边界/回归支持的新增 Agent 行为差距，证明现有 owner 无法在其边界内承接，才可重新提出
`admit candidate`；在那之前，不建议为“防退化闭环迭代”命名、创建或加载独立 skill。
