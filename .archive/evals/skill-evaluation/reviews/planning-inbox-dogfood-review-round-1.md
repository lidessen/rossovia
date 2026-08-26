# planning-inbox 真实 dogfood 独立 review（round 1）

## Review 范围与结论

本 review 只检查本次真实 `planning/inbox.md` 批次 `IN-2026-08-24-001` 的秘书处理、
roadmap projection、history receipt 和 clear；不把 round 3 old/new 的有限输出观察升级为
真实 inbox 行为证据，也不修改被评文件。

综合处置：`accept with bounded retain / behavior-observed / boundary-supported`。

这次真实 exposure 没有发现需要 rollback 的语义退化：raw 可恢复，history/clear 顺序成立，
候选没有冒充 Plan、Todo、Run、research record、owner 或 acceptance，且没有实现 harness
base。当前最高 standing 仍只是一次真实 dogfood 的边界支持观察；不能据此宣称
`matched-improvement`、稳定改善、portable skill 接受或晋升到 `skills/`。

有两项非阻塞修订建议：

1. 对 `001C` 的“eval/experiment tooling 与 implementation candidate”继续保留候选地位，
   但后续文案可更明确区分“未来工具/原型实现”和 `evals/` 中的协议、Run、evidence，避免
   读者把候选工具理解成实际评估记录。
2. 后续若要把本次 clear 作为可审计变更展示，应该让 inbox 在进入版本控制后留下明确的
   pre-clear source snapshot 或可比较的提交边界；本次工作区中的 `git diff` 不能承担这项
   证明，见下文证据限制。

## 1. raw、顺序、批次与来源可恢复性

通过当前 `planning/inbox-history.md:38-112` 与冻结的
`evals/skill-evaluation/payloads/planning-inbox-round-2/A.md` 逐条比较，`001A` 至 `001F`
的六段原话内容一致，编号顺序为 A→B→C→D→E→F，且仍以同一批次
`IN-2026-08-24-001` 关联。history 对每条保留了原话、解释、去向和 return condition；
roadmap 也回指批次与 `RCPT-2026-08-24-001`（`planning/roadmap.md:19-23`）。

因此本次没有出现以下错误：

- 用摘要覆盖原话或改变原话语气；
- 拆分时丢失批次、顺序或条目身份；
- 只保留 roadmap 摘要而无法回到 raw；
- 将用户表达改写成已经确立的理论、计划或实验结论。

需要准确记录一个工作区事实：`planning/inbox.md` 和 `planning/inbox-history.md` 当前均为
未跟踪文件（`git status --short` 为 `??`），所以 `git diff -- planning/inbox.md` 没有
clear 前删除块。上述 raw 核验使用了 round 2 冻结 payload 作为 clear 前 source 的独立
保留物，并与 history 原话比较；这足以支持当前内容的恢复性观察，但不是一份由版本控制
直接展示的删除 diff。history 中“逐项字节一致”的说法应理解为 raw 内容核验，不应扩大为
当前 Git 提供了 pre-clear commit 级证据。

## 2. history/receipt 先于 clear，且 clear 没有冒充完成

顺序在语义和文件记录上均成立：

- `planning/inbox-history.md:9-12` 先说明 `RCPT` 保存六条 raw、回执、lineage，并投影到
  roadmap，之后才由 `CLEAR` 清除 pending；
- `planning/inbox-history.md:114-122` 明确记录已执行的 receipt、disposition、unknown、
  return relation 和 authority boundary，以及 clear 条件；
- `planning/inbox-history.md:124-133` 的 `CLEAR-2026-08-24-001` 以
  `RCPT-2026-08-24-001` 为前置回执，并把动作限定为从 pending 视图移除；
- `planning/inbox.md:3-11` 将当前空 pending 视图链接回 receipt，并明确“不表示候选已完成或
  接受”。

这与 skill 的 history-before-clear 约束一致（`.agents/skills/planning-inbox/SKILL.md:47-61`）。
没有看到把 consume、clear、archive、complete、acceptance 或 owner handoff 混为一谈的
实际结果；history 还明确排除了 delete、Plan/goal/Todo、priority、owner、record、evidence
和 runtime guarantee。

清除未决问题是否需要继续留在 pending：本批条目不是“等待用户澄清后才能完成当前清除”的
hold，而是已形成带 return condition 的候选 disposition。A–F 的未知项均保存了回返关系，
因而这次 clear 可以成立；它不应被描述为未知已经解决。若未来某条变成真正的 hold、未完成
handoff 或等待澄清，则必须重新留在 pending，不能沿用本次 clear 模式。

## 3. roadmap projection 是否是最小真实形式

当前 roadmap 的投影保持了候选而非义务的最小形式：`planning/roadmap.md:21-23` 统一声明
没有进入当前 Plan、没有 priority、承诺、正式 owner 或 acceptance，逐字来源与 lineage
留在 history。六项内容也分别保留了必要的依赖和边界：

- `001A` 被写成 research/theory candidate，不是已确认的“无监督学习”理论
  （`roadmap.md:25-26`）；
- `001B` 被写成后续 skills architecture / roadmap candidate，未进入当前 Plan
  （`roadmap.md:27-28`）；
- `001C` 被写成受控 Agent 行为评估工具的候选实现，未写成已有 Run、结论或已授权开发
  （`roadmap.md:29-31`）；
- `001D` 只指向可观察输出形式的候选实验，未把“原始想法”当作可证内部事实
  （`roadmap.md:32-33`）；
- `001E` 保留为依赖 `001D` 定义和证据的候选，仍要求定义人格、冲突/互斥、统一行为和
  成功条件（`roadmap.md:34-35`）；
- `001F` 保留单主 Agent/team 等未决分支，并明确当前分支不实现 base
  （`roadmap.md:36-39`）。

这些表述没有擅自生成当前 Plan/Todo、priority、实际 Run、research record、experiment
record、实现任务或 owner。`planning/roadmap.md:41-42` 还统一写出 owner 为 `unknown`，
并把未来进入 Plan、record、Run、实现或 acceptance 的决定交还真实 owner。

形式上，这次 projection 也没有过度展开目录/文件名问题；`.agents/skills/` 与 `skills/`
的区分只作为 roadmap 的既有方法边界出现，没有把路径选择放大成六条输入的主问题。

## 4. research、eval、experiment 与 harness base 边界

边界整体保持，未发现 standing 混淆：

- `001A` 是 research/theory candidate；没有新增研究来源、调查观察或结论，因此不是
  `theory/research/` 的实际 research record。
- `001C` 是未来受控评估/实验工具的 implementation candidate；没有 Run、Cell、effect、
  evidence 或可复现执行结果。它没有被写入为当前 `evals/` 记录，也没有触发代码实现。
- `001D` 和 `001E` 是 experiment candidate；没有创建 experiment Run、观察或接受结果。
  `001E` 明确保留用户假设作为假设来源，未冒充意识或统一自我的研究结论。
- `001F` 是 harness architecture/base 的候选方向；roadmap 与 history 都明确“不实现
  base”，也没有把实时记忆、通知输入、todo 轮询并发或双向输出写成已经存在的 runtime
  保证。

非阻塞的表达风险仅在 `inbox-history.md:76` 的“eval/experiment tooling 与
implementation candidate”：它把未来工具的可能用途并列在同一短语中。当前上下文中的
“candidate”与“不是现有 Run/effect/evidence”已经阻止了 standing 冒充，因此不是本轮
rollback 理由；后续若形成实现或 eval 设计，应分别指明：实现/原型属于 `experiments/` 的
候选，协议、Run、review 与 evidence 属于 `evals/`，实际 record 不能由 inbox 名称创建。

## 5. `.agents/skills/` 与 `skills/` 放置

放置决定合理：`.agents/skills/planning-inbox/SKILL.md:13-15` 明确该 skill 依赖本仓库的
`planning/`、goal/Plan 与项目 authority，因此是 project-local incubating skill；它没有被
晋升到 `skills/`。这与本次 behavior standing 仅为一次真实 dogfood 观察相称，也避免把
项目路径和 authority 偷换成可移植方法。

这项路径判断在本次处理中没有被过度放大：它只是载体生命周期/依赖边界，没有改变六条 raw
的 disposition，也没有创建第二份 canonical skill。没有发现 `.agents/skills/` 和 `skills/`
之间的重复正文问题。

## 6. 此前纠正是否在真实 exposure 中重现

以 round 3 synthesis 中列出的 correction observation window 为基准，本轮结果如下：

| 既有纠正/失败根 | 本轮观察 | 分类 |
|---|---|---|
| raw 丢失、无法回指或逐条关系被压扁 | 六条原话、ID、顺序、批次、history 和 roadmap lineage 均可恢复 | 未复现；没有 escape/recurrence |
| owner 类型被当成正式 owner | 六条统一保留 `owner unknown`，工程/研究/实验只是去向或决定类型 | 未复现；没有 escape/recurrence |
| clear 被说成 complete/acceptance | clear 只写成 pending 视图移除，且多处明确排除完成/接受 | 未复现；没有 escape/recurrence |
| candidate 被升级为 Plan、Run、research/evidence 或实现 | roadmap/history 均保留 candidate standing，未写现有 record 或授权执行 | 未复现；没有 escape/recurrence |
| 复杂批次关系丢失 | A→F 顺序和共同批次保留，`001D→001E` 依赖和 `001C↔001D` 重审关系可见 | 未复现；没有 escape/recurrence |
| `experiments/` 与 `evals/`、research record 混淆 | 当前文件没有创建 record，边界文本总体正确；`001C` 短语有轻微歧义 | 潜在风险，尚未形成 recurrence |
| theory/P 回读、路径或目录问题压倒实际任务 | skill 明确普通使用不回读 P/theory；路径仅作 project-local 依据 | 未复现；不是本次主要行为缺陷 |

因此，本轮没有理由触发 reopen 或 rollback。`001C` 的短语清晰度是新的局部改进机会，
不是已观察到的同根失败；应在下一次 eval/tooling candidate exposure 中重放验证。若下一次
出现 raw 不可恢复、clear/complete 混淆、owner 被类型替代、候选升级或批次依赖丢失，应按
correction protocol 立即 reopen，而不是用“inbox 已清空”抵销。

## 7. Unknown、证据上限与建议

仍需保留的 unknown：

- `planning/inbox.md` 的 pre-clear 版本没有 Git commit/diff 级可审计边界；本次依靠冻结
  payload、fixture 与 history 复核；
- 这次 review 证明的是工作区 artifacts 与实际处理结果的语义边界，不证明 host `/inbox`
  命令、持久化、唤醒、exactly-once、并发 claim、恢复或 runtime base 已实现；
- 六条候选的真实 owner、priority、scope、接受条件以及“理论/skill 完备”的判定仍 unknown；
- 本次没有足够证据证明 portable skill、跨项目可用性或稳定成本改善。

建议处置：保留当前 `.agents/skills/planning-inbox/` 候选、保留 old snapshot rollback
anchor，继续观察；不晋升 `skills/`，不删除历史，不实现 harness base。下一次若形成
`001C` 的具体评估工具设计，单独建立 candidate→protocol→Run/evidence 的 provenance，
并在文件名和目录上分开 `experiments/` 与 `evals/`。

## Main disposition

`accept with bounded retain`：本次真实 dogfood 通过语义边界 review，支持继续在本项目中
使用当前 incubating skill；behavior standing 上限为 `behavior-observed / boundary-supported`
（单次真实 exposure），不升级为 `matched-improvement`、稳定改善、portable adoption 或
自动接受。保留本报告作为后续 correction observation window 的 baseline。
