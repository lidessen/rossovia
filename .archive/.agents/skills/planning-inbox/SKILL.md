---
name: planning-inbox
description: 在本项目 planning/ 与 goal 约定下，低摩擦接收任意想法、观察、疑问、待办和半成形计划，忠实保留并秘书式整理，在不扩张承诺、优先级、owner 或授权的前提下批量澄清并交给适当的真实 owner。
---

# 规划收件箱

本 skill 处理本项目 planning inbox 的一个主要判断：接住任意 planning input 时，怎样
保留可重建的 source，形成可审查的秘书整理，选择保留、澄清或可追溯 handoff 的最小
去向，同时不把想法偷换成 commitment、priority、goal、owner、scope、record、执行
或 acceptance。

本载体依赖本仓库的 `planning/`、goal/Plan 约定和项目 authority，因此是项目内
`.agents/skills/` 的 incubating skill。普通使用不回读 P、theory 或 research；任务
自身的事实和目标仍以当前项目 source 与真实 owner 为准。

## 何时使用

在以下情形选择本 skill：

- 用户显式使用当前项目约定的 `/inbox` 文本标记，或等价明确的 capture 请求，要求把
  后续表达先作为 planning raw capture。这里的 `/inbox` 只是文本约定和 skill trigger，
  不是已注册的 host command、input hook、后台 scheduler 或可靠 API；host 的 payload、
  权限、持久化、重试和唤醒能力不由本 skill 提供；
- 用户要求秘书式整理、批量澄清、合并/去重、给 inbox item 找 disposition 或形成
  可追溯 handoff；
- active goal 在一个合理 safe point 获得新的 planning input，需要判断保留、回返、
  澄清或交给 owner。

不要用本 skill 接管普通笔记、已经成立的 Plan/goal/待办、实际 research 或
experiment/eval record、执行记录、接受决定、发布/外部效果，或需要后台唤醒、持久
identity、并发 claim、取消、恢复、exactly-once 和副作用幂等的 runtime 工作。

## 两种模式

### Capture mode

本 skill 中的 `raw` 指 source-faithful capture：它保留用户表达的语义、语气强弱、范围、
否定、不确定性、顺序、来源和上下文，但不要求逐字抄录。记录员可以适当修正语法、错别字
和不通顺表达，使记录可读；不得借语言修正加入、删除或改变用户没有表达的意图。

capture 的首要目的，是保留用户已经表达过的观点、想法、观察和思辨，避免用户以后因为没有记录而重复
说明；是否成熟、正式、值得研究、应进入设计或已有 canonical 去向，不是 capture 的前置条件。成熟度、
正式性、priority、owner、acceptance 和后续载体只在 process/handoff 时判断，不能成为先记录的门槛。

`/inbox` 表示低摩擦接收：先把用户后续表达保留为语义保真的 raw，不强迫用户立即分类、
计划或回答问题。原话可以按语义转折拆成片段，也可以形成轻度规范化表达；如果修正可能
改变 actor、范围、否定、模态、时序、因果或不确定性，就保留歧义、标记未知或请求澄清，
不要用通顺句子替用户补全。

如果当前项目 authority 允许本地可逆写入，把 raw 追加到项目约定的 `planning/inbox.md`
capture source。若写入权限、source 或上下文不明，只返回可保存的 raw capture 与
阻塞原因，不声称已经写入。capture 不自动成为解释、priority、commitment、goal、
owner、执行、完成或 acceptance。

### Process mode

只有用户要求整理、已有 bounded delegation 覆盖，或 Agent 在合理 safe point 获得运行
机会时，才对一个或一批 raw 做秘书处理：回读 source，提出 interpretation，暴露
 unknown/冲突，批量澄清并给出 disposition 或 handoff 候选。不要因为 capture 已被
 读取、视图已清空或某个 item 最近出现，就把它说成已完成。

若要从 pending 视图 clear，必须先把语义保真的 raw、可回读的 source（快照或可回指来源）、
receipt 和 lineage 追加到当前项目约定的 `planning/inbox-history.md`，确认当前运行机会
能够回读后，才从 pending 的 `planning/inbox.md` clear。hold 或等待澄清必须留在 pending；两步
之间中断时允许 pending 与 history 同时存在并在后续重复处理，不得声称原子迁移、
exactly-once 或恢复保证。

capture 与 process 共享 source、authority、最近邻、handoff 和失败边界。若某次任务
只需要 capture，就停在 capture；不要为了形式完整强行走 process。

## 保留 source，解释不冒充用户语义

整理时让调用者能恢复：

- 用户表达的语义、来源、批次、顺序、上下文和修订/撤回关系；
- 哪些是用户明确说出的或 source 直接支持的内容（explicit）；
- 哪些是 Agent 为帮助整理提出的候选对象、关系或去向（inferred）；
- 哪些目标、事实、priority、owner、时限、授权、依赖或接受条件仍未知（unknown）。

`explicit`、`inferred`、`unknown` 是可审查语义，不是必须采用的字段合同。只展开其中
会改变 disposition、authority、owner 或下一行动的部分；同一批次共享的边界说一次并
回指，不能把这些区分渲染成固定字段模板。弱语气如“应该”“紧急”“以后做”“看起来像”
“顺便”不能单独证明承诺、priority、blocker、owner 或授权。不能判断时保持 unknown
或 hold，不要用流畅句子填空。

若 source 仍稳定可回指且当前不 clear，可以用 ID、path 或 lineage 回指 raw，不必机械
重抄整段；capture 或 clear 前写入 history 仍须保留语义保真表达和 source provenance，
不要求默认保存逐字原文。若外部契约另行要求审计原文，再由对应 owner 增加原文保留关系。

多个 raw 可以建议聚类、重复或合并，但只有对象身份和关系确实一致时才提出合并；
保留每个来源、版本、语气、冲突和未解决部分。建议合并不等于目标 owner 已接受为
一个 canonical object。

## Authority 与秘书动作

explicit `/inbox` 指令或既有 bounded delegation，可以在其自身的 action、scope、
effect boundary 和 reversibility 内支持：

- 保存 raw、按语义转折拆分并保持可重建关系；
- 可逆的本地整理、链接、重复/合并建议和有界检查；
- 建立局部待办或批量提出澄清；
- 形成 disposition/handoff 候选并附 provenance。

这些动作不要求每条 raw 都 fresh confirmation，但同一 authority 不得扩张为新的
commitment、priority、goal、owner、scope 或 acceptance，不得代行接受或偷渡外部/不可逆
效果。普通 suggestion 或 secretary inference 只能形成候选解释、问题或 hold。

需要改变主线、canonical obligation、Plan/goal、priority、owner、scope、接受关系或
外部效果时，回到用户、目标 owner、Principal、接受 owner 或真实 runtime；不要把
秘书排序当成授权。

## Disposition 与最近邻

Disposition 只是当前处理判断，不是完成状态。根据 source、authority、风险和目标 owner，
可以提出或记录：保留在 inbox、需要澄清、候选进入 Plan、局部待办、research candidate、
experiment candidate、incubation/planning candidate、建议合并/可能重复、拒绝/不纳入、
归档或 hold。这些是开放的语义例子，不是固定枚举或状态机。

保持以下边界：

- `research candidate` 只承载待调查问题、已有来源、候选推断、矛盾、unknown 与所需
  证据；实际 research record 的调查观察、来源核验与结论归 record/source owner。
- `experiment candidate` 只承载待验证干预、baseline、controlled variables、
  configuration candidate、预期观察/证据条件与接受条件；实际 Run/Cell 的 observation、
  effect、failure、evidence 归 experiment record、runtime/Cell 与 evidence owner。
- `incubation/planning candidate` 只表示尚未形成正式 research 或 experiment 关系的
  方向性计划，不取得 research/experiment standing。
- `想试 A` 可以成为 experiment candidate；实际跑 A 的观察才是 experiment/eval record，
  前者不能冒充后者。inbox 只做 disposition/handoff，不因名称创建实际 record 或接受
  结果。
- Plan、goal、待办、执行、completion 和 acceptance 各由其真实 owner 负责；inbox 的
  摘要、receipt、review、clear 或 archive 不取得第二权威。

目标 source 尚未接受或 authority 尚未覆盖时，只保留候选、待确认或 hold，不写成已授权
obligation。source 未给出真实 owner 时明确写 `owner unknown`；工程、实验、研究等只表示
候选路由或可能的 owner 类型，不能表达成现任正式 owner。去向离开 inbox 当前视图时，
保留能回到 raw 的来源、决定、转换或 lineage。

## 批量澄清、hold 与 active goal

多个 raw 共享一个会改变去向的决策关系时，可以批量澄清。按 owner、影响、承诺关系、
依赖或接受条件聚组，而不只按词面主题聚组。让用户看到相关原话、候选解释、explicit/
inferred/unknown 边界、冲突、可选回答或继续 hold 的选择，以及回答会改变什么；没有
默认答案时不要暗示默认。

每个非终结 hold/deferral 都要有可见 reason，并连接到至少一种 revisit/return 关系：
依赖的 owner decision、目标 safe point、明确 return condition、下一次运行机会的
review eligibility 或 owner escalation。无理由静默延后不算已处理。

active goal 中出现新 input 时，下一次获得运行机会的合理 safe point 重新读 source、
当前 goal/Plan 和接受关系，判断是保留、作为旁证/局部待办、带回 owner、由用户明确
切换主线，还是停止/回退/请求澄清。新 input 默认不因新、长、情绪强或词面紧急而抢主线。

“反复检查”只是方法表达：没有新的运行机会时只能说未复查，不能声称持续检查。safe
point 不保证后台 wake、持久 identity、并发 claim、取消、exactly-once、崩溃恢复、
事件游标或不重复外部副作用；这些属于 runtime/base。

## 返回与失败

返回紧凑但可重建的结果：source-faithful raw/provenance、interpretation 中的 explicit/inferred/unknown、
disposition/handoff、authority 来源、目标 owner、reason、revisit/return/escalation、
实际执行的低风险动作、证据 standing、失败范围和仍需谁决定。不要只返回“已整理”“已消费”
或“已清空”。

明确区分：consume 是读取/处理尝试，clear 是视图移除，archive 是可回读保留，complete
是目标关系满足终止条件并有证据，acceptance 是有权 owner 采纳；它们不能互相冒充。

遇到 source、权限、对象、上下文、owner、evidence 或运行机会不足时，保留 raw，返回
unknown/hold 及阻塞关系。遇到重复、冲突、撤回或旧 baseline 时保留 lineage，在 safe
point 重新判断或回返 owner。工具/runtime 失败时只报告观察到的局部结果和缺口，不声称
已恢复、已取消或 exactly-once。

候选 skill 的行为仍需通过正例、反例、最近邻、authority、重放、active-goal 插入和回归
验证；一次成功、格式通过或用户提出需求不等于行为改善或稳定。
