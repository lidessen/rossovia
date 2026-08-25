# Inbox History

> 本文件是 planning inbox 的 source-native processing receipt、raw 保留与 lineage
> 记录。它不是任务队列、Todo、Plan、goal、执行 ledger、research/eval/experiment
> record 或 acceptance source。

## 当前状态

`RCPT-2026-08-24-001` 已先保存六条逐字 raw、处理回执和 lineage，并把它们投影为
`planning/roadmap.md` 中未接受的候选方向。六条 raw 经逐项回读核验后，由
`CLEAR-2026-08-24-001` 从 pending 视图清除；当前 `planning/inbox.md` 没有 pending。
这两个事件都不表示候选已完成、已进入 Plan 或已被接受。

## 承载边界

后续处理回执可以保留可回指的原文或 raw 快照、来源、批次/顺序、处理尝试、disposition、
handoff、修订、重复、合并与未解决关系。回执记录处理事实和 lineage，不把秘书推断
变成 canonical obligation、Plan、goal、Todo、research conclusion、experiment/eval
evidence、completion 或 acceptance。

## Pending 到 History 的规则

1. 先在本文件追加可回读的 raw 保留与处理回执，再从 `planning/inbox.md` 的 pending
   视图清除对应条目。
2. `clear` 只表示条目不再出现在 pending 视图；它不等于 `delete`、`complete`、
   `archive`、`acceptance` 或目的地 owner 已接受 handoff。
3. hold、等待澄清或未完成 handoff 的条目继续留在 pending；回执应保留 reason 与
   revisit/return/owner-escalation 关系，不把未复查伪装成已处理。
4. 若两步之间中断，允许 pending 与 history 暂时重复；下一次通过 lineage 解释和
   修订，不先删除 raw。

本文件和 Markdown 形式不提供 exactly-once、原子迁移、并发 claim、持久 scheduler、
后台唤醒、崩溃恢复或不重复外部副作用保证。出现这些要求时，必须另行选择真实的
tool/runtime/base；不能靠本文件的文字取得保证。

## 记录

### RCPT-2026-08-24-001：六条长期方向的秘书处理

- 来源：当前对话中的用户 `/inbox` 输入，批次 `IN-2026-08-24-001`
- 顺序：`001A` → `001B` → `001C` → `001D` → `001E` → `001F`
- authority：用户授权低摩擦 capture，并在当前 goal 的 safe point 允许整理 planning；只覆盖
  可逆的本地 raw 保留、候选 disposition 与 roadmap projection，不覆盖正式 Plan/goal、
  priority、owner、research/experiment standing、实现或 acceptance。
- 共同 disposition：六条均投影到 `planning/roadmap.md` 的“来自 inbox 的候选方向”；
  roadmap 条目是可回指的长期候选，不是第二份 raw、正式义务或已接受 handoff。
- 共同 unknown：真实 owner、优先级、具体范围和接受条件均未给出；owner 记为 `unknown`。

#### IN-2026-08-24-001A

原文：

> 我们现在设计的迭代循环其实比较像无监督学习；

- 解释与去向：用户提出类比；保留为 research/theory candidate，不能写成已经确认的理论。
- 回返条件：当需要解释或验证当前迭代循环的学习机制时，由当时真实的 research/theory 或
  goal owner 判断是否立项；当前 owner unknown。

#### IN-2026-08-24-001B

原文：

> 后续的计划，我们还需要一个开发生命周期的skills套组，覆盖从确定需求，设计，写文档，开发，测试，验证，改进全生命周期；

- 解释与去向：长期 skill architecture / roadmap candidate；没有进入当前 Plan，也没有取得
  开发承诺。
- 回返条件：当前 theory/skills 阶段达到另行接受的边界、准备规划下一阶段时，重审套组边界、
  复用范围与接受条件；当前 owner unknown。

#### IN-2026-08-24-001C

原文：

> 理论/skill的部分完备之后，代码部分还需要一个可以控制变量测试agent行为的实现，比如测试prompt/skill效果，对比模型能力；

- 解释与去向：eval/experiment tooling 与 implementation candidate；不是现有 Run、effect、
  evidence 或已授权代码任务。
- 回返条件：理论/skill 部分何时“完备”须由真实 goal/acceptance owner 另行判断；达到该边界
  后再由 experiment/evidence 与 implementation owner 决定最小实现，当前 owner unknown。

#### IN-2026-08-24-001D

原文：

> 还有设计验证，能不能通过prompt让agent从对话模式，变成更接近碎片化思考的模式，就是想法是一个概念一个概念蹦出来的，不是完整的句子。就像是没有经过语言模块处理过的原始想法；

- 解释与去向：experiment candidate；当前只可验证可观察输出形式，不能由 prompt 输出推断
  未经语言模块处理的内部思维已经存在。
- 回返条件：先明确“概念碎片”的可观察定义、baseline、变量与证据条件，并与 `001C` 的工具
  候选重审关系；当前 experiment/evidence owner unknown。

#### IN-2026-08-24-001E

原文：

> 然后基于这个再验证多互斥人格形成的统一自我个体agent。因为我一直觉得人的意识思维高绩性来自于人的大脑中矛盾对立的想法，形成意识流，这个实验的目的是看看能不能复刻；

- 解释与去向：依赖 `001D` 定义与证据的 experiment candidate；用户关于意识与矛盾想法的
  判断保留为假设来源，不冒充研究结论。
- 回返条件：先定义“人格”“互斥”“统一自我”和可观察的支持/反驳条件，再由真实
  experiment/evidence 与 acceptance owner 决定是否形成实验；当前 owner unknown。

#### IN-2026-08-24-001F

原文：

> 另外还有就是基于DeepSeek harness实现的harness 基座，这是一个单一主agent/或者agent team，单一会话，无compact设计而是采用实时记忆和查看聊天记录模式，用通知作为单一输入源代替单一用户消息实现多来源信息处理，轮询todo list实现并发。采用类似gpt live的实时对话设计，两边的输出互不干涉，实现类似人类im聊天的模式，发消息是即时的，改变和影响后续动作。

- 解释与去向：与现有 DeepSeek Harness / 1+N 长方向相关的 architecture/implementation
  candidate；保留单主 Agent 与 team 等未决分支，不合并成已批准架构。
- 回返条件：当前理论与 skills 阶段完成并准备设计 base 时，再确定 consumer、输入/记忆/并发/
  输出隔离契约和最小实现；当前 runtime/architecture 与 acceptance owner unknown。

#### 本次处理动作与 clear 条件

- 已执行：逐字 raw、source、批次、顺序、interpretation、disposition、unknown、return relation
  和 authority boundary 已写入本回执；roadmap 只增加未接受候选及本 receipt 的 lineage。
- 未执行：没有建立正式 Plan/goal/Todo、research record、experiment/eval Run、实现任务、
  priority、owner、completion 或 acceptance，也没有实现 harness base。
- clear 条件：本回执与 roadmap projection 可回读且六条逐字 raw 核验一致后，六条可以从
  pending 视图 clear。未决问题已经以候选的 return condition 保存，不需要为了立即回答而
  hold 在 pending；clear 不改变它们的候选 standing。

### CLEAR-2026-08-24-001：pending 视图清除

- 前置回执：`RCPT-2026-08-24-001`
- 核验：`001A`–`001F` 的 history 原文与 clear 前 `planning/inbox.md` 逐项字节一致；roadmap
  projection 和 receipt 均可回读。
- 动作：从 `planning/inbox.md` 的 pending 视图移除批次 `IN-2026-08-24-001` 六条 raw。
- 未取得：delete、complete、acceptance、正式 handoff、Plan/goal/Todo、priority、owner、
  research conclusion、experiment/eval evidence 或 runtime guarantee。
- lineage：后续重新考虑这些候选时，从 roadmap 条目回到 `RCPT-2026-08-24-001` 的逐字 raw
  与 return condition；不把本 clear 事件当成下游决定来源。

### CORR-2026-08-24-001：001C 形式边界澄清

- 来源：`planning-inbox-dogfood-review-round-1` 对 receipt 中“eval/experiment tooling”并列
  表达的非阻塞歧义；它没有观察到 standing 已经混淆。
- 修订：roadmap 当前 projection 明确分开未来 `experiments/` 中的实验性实现/原型，与
  `evals/` 中的协议、fixture、Run、review/evidence；两者现在都只是未建立的相邻形式。
- standing：本 correction 只澄清 `001C` 的候选形式，不倒写原话，不创建原型、eval record、
  实现任务、owner、priority 或 acceptance。`RCPT-2026-08-24-001` 保留当时处理措辞，本条
  作为其追加修订。
