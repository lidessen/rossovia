---
kind: review-record
id: planning-inbox-skill-review
status: archived
disposition: superseded-by-round-2
---

# Planning Inbox skill review

## 结论

**静态处置：`revise`。**
**skill 行为：`unknown`；后续动作：`adapt-and-retest`。**

候选 `.agents/skills/planning-inbox/SKILL.md` 已经是一个边界清楚的项目内 incubating
skill candidate，但不能按当前文本接受为可用 skill。主要判断、正负触发、authority、
candidate/record、clear/complete 和 runtime 边界基本成立；两个 blocking 缺口会让 Agent
在真实项目中产生错误的形式动作：

1. 候选没有把当前 `planning/inbox-history.md` 的 source-preserving receipt、append-first
   和 clear 顺序表达成可执行的项目外部契约；仅说返回 receipt，不能防止处理时先清除
   pending raw。
2. `/inbox` 的正触发没有明确它当前只是项目文本约定，不是已经注册的 host command、
   input hook 或后台入口；候选应避免让 skill 名称取得 host 能力。

此外，skill-formation admission 的行为依据仍不足：六条同批 raw 证明了场景和输入
多样性，不证明跨任务重复的 Agent gap 或 skill 的 matched improvement。因此当前
`revise` 不是行为接受；即使完成文字修订，行为仍保持 `unknown`。

## 审查范围与来源 standing

已完整阅读：候选 `.agents/skills/planning-inbox/SKILL.md`、
`.agents/skills/skill-formation/SKILL.md`、`.agents/skills/form-selection/SKILL.md`、
`.agents/skills/agent-expression/SKILL.md`、已接受的
`theory/harness/planning-inbox.md`、`planning-inbox-form-selection.md`、
`planning-inbox-skill-admission.md`、`AGENTS.md`、`planning/inbox.md` 与
`planning/inbox-history.md`。

当前外部契约是：`planning/inbox.md` 只承载 pending raw；history 初始为空，负责
source-native receipt/raw 保留/lineage；先追加 history 再 clear；clear 不等于 delete、
complete 或 acceptance；Markdown 不提供 exactly-once、并发、恢复或后台保证。六条
现有 raw 仍 pending，不能因 skill 载体存在而被消费。

## Blocking

### B1. 没有表达 inbox-history 的 append-first 外部契约

候选在 Capture mode 第 31–36 行正确说可以写 `planning/inbox.md`，Process mode 第
38–45 行正确说 capture 与 process 共享 source/authority/handoff 边界；返回部分第
125–135 行也要求返回 receipt、lineage、clear/complete 区分。但它没有告诉 Agent：

```text
若要从 pending 视图 clear：
先将 raw 快照/可回指原文、来源、处理回执和 lineage 追加到
planning/inbox-history.md；确认可回读后，才从 planning/inbox.md clear。
```

当前 `planning/inbox-history.md` 的规则不是装饰性项目事实，而是防止 raw 丢失和
第二权威的实际写入边界。若 skill 只返回“已整理/已清空”或按 disposition 直接改
`planning/inbox.md`，就可能违反已选形式；这属于 `agent-expression` 要求的允许效果、
失败和返回关系缺失，也是 form-selection 的外部 contract 未进入载体。

最小修订不是复制一套 schema，而是在 Process/返回或 clear 边界加入对现行
`planning/inbox-history.md` 的引用，并明确：hold/等待澄清保留 pending；两步中断时
允许 pending 与 history 重复；不得宣称原子迁移、exactly-once 或恢复。history receipt
仍不拥有 Plan、Todo、goal、研究结论、Run/Cell evidence、completion 或 acceptance。

### B2. `/inbox` 的触发没有排除 host command 假设

候选 description 和第 16–25、31–36、80–90 行把“用户显式使用 `/inbox`”作为正触发，
但没有复述当前项目 contract：它只是文本标记/项目约定，不是 host command、事件订阅、
持久 API、可靠 input hook 或 scheduler。候选虽未直接声称已注册 command，但一个只读到
正触发的 Agent 可能把“选择 skill”误作“获得 host 写入/唤醒能力”。

最小修订是在正触发处写成“用户显式使用项目约定的 `/inbox` 文本标记，或等价明确的
capture 请求”；紧接着注明 host 注册、payload、权限、持久化、重试、identity、后台
唤醒和外部效果不由 skill 提供。没有运行机会时只能返回未复查。未来若 host 真注册
command，应由 host/tool/runtime contract 另行定义，不由 skill 名称取得。

## Non-blocking

### N1. capture 与 process 暂保留同一 skill，但拆分假设仍未验证

候选第 40–50 行把 capture 和 process 作为同一 skill 的两个模式，理由是 process 以
capture 为输入，共享 source、authority、handoff 和失败边界。这个决定目前可保留：
用户要的是一条从低摩擦接住到秘书整理/交接的连续关系，现有材料没有证明两个 skill
拥有可独立选择、独立失败、独立 owner 且仍需分别加载的主要判断。

但两者确实有不同触发和效果：capture 是显式低风险 append，process 可能由用户请求、
bounded delegation 或 active-goal safe point 触发，并可能产生 disposition/handoff。
因此这是 provisional composition，不是已证明的单一 skill。后续 probe 应比较：

- 只要求 capture 时，是否不会自动进入 process；
- 只要求 process 时，是否能从既有 raw 开始而不重复 capture；
- 两者的 owner、失败、上下文成本和验证结果是否仍然可重组；
- 选择一个 skill 是否比两个 skill 减少发现遗漏而没有引入上下文噪声。

若这些关系独立成立，再由 `skill-formation` 判断拆分；不要因为章节多或输入类型多就
预先拆分。

### N2. 主要判断没有明显过宽，但 description 可更强调不自动处理

候选的主要判断是“保留可重建 source、区分 explicit/inferred/unknown、选择保留/澄清/
handoff 的最小去向，并不越权”。正触发包含 capture、process、safe point 和有界本地
整理，负触发排除了普通笔记、canonical Plan/goal/Todo、research/experiment/eval
record、接受、外部效果与 runtime 工作；因此没有把所有 planning 文档或所有 Agent
任务产品化。

description 同时写“接收、整理、批量澄清、交给 owner”，读者可能误以为 `/inbox` 一触发
就自动进入 process。补充 B2 的文本约定与 N1 的“capture-only 时停在 capture”即可，
无需缩短主要判断或拆分 skill。

### N3. raw、authority、candidate/record、clear/complete/runtime 边界基本成立

- Capture mode 第 31–36 行保留批次、顺序、逐字内容、来源和上下文，并声明 capture 不
  自动成为解释、priority、commitment、goal、owner、执行、完成或 acceptance。
- 第 63–75 行将 explicit/inferred/unknown、弱语气、合并建议和 canonical record 分开。
- 第 80–101 行区分 research candidate、experiment candidate、incubation/planning
  candidate 与实际 research/eval/experiment record；`想试 A` 与实际运行反例已经
  内化，candidate 不拥有 Run/Cell observation/evidence。
- 第 103–111 行及第 119–135 行保持 hold、batch clarification、authority、handoff、
  返回与 owner 边界；第 137–149 行没有把 consume、clear、archive、complete、review 或
  receipt 冒充 acceptance。
- 第 150–162 行明确无后台 wake、持久 identity、claim、取消、恢复、exactly-once 和
  副作用幂等，失败只返回局部观察与 runtime 缺口。

这些内容已经把 theory 内化为可使用的方法，不要求普通激活回读 P、theory 或 research。
行为是否真的保真仍 unknown，不是静态文本已证明。

### N4. 没有复制项目 facts 或建立第二 canon

候选声明依赖本仓库 `planning/`、goal/Plan 约定，并将自身放在
`.agents/skills/planning-inbox/`；这符合 `AGENTS.md` 对项目 incubating skill 的落点
要求。它没有复制六条 raw、理论全文、下游 schema 或 runtime contract，也没有让 skill
摘要、receipt、review、clear 或 archive 成为 Plan/goal/record/acceptance 的第二权威。

不过，补充对 `planning/inbox-history.md` 的引用时应保持“遵循现行 source/history
contract”，不要在 skill 中复制 history 文件的完整正文或制造第二份 migration schema。

### N5. `.agents/skills` 落点正确，暂不晋升 `skills/`

候选依赖 `planning/inbox.md`、`inbox-history`、项目 authority、goal/Plan 和本仓库的
research/eval/experiment standing，不能脱离项目事实独立使用；放在 `.agents/skills/`
是正确的 incubating form。`skills/` 只应在方法脱离项目事实仍成立，并有相称行为验证
后再另行判断。当前不应复制一份 portable canonical skill。

### N6. 长度与 token 保真度尚可

候选约 149 行，包含一个主要判断、正负触发、两个模式、source/authority、候选/记录
边界、safe point、返回、失败和探针。相较于承重语义，长度没有明显过度；若删去
history/host 边界或候选/record 反例，反而会破坏 Agent 表达。可删除少量重复句，但
不应以 token 压缩为理由删掉 unknown、允许效果、失败和接受关系。

## 最小修改建议

不直接修改候选；下一版只需做以下最小 semantic delta：

1. 在正触发处声明当前 `/inbox` 是项目文本约定/skill trigger convention，不是 host
   command、input hook 或后台能力。
2. 在 Process mode 或 clear/返回段加入：本项目若要 clear pending，先遵循
   `planning/inbox-history.md` 追加 raw-preserving receipt/lineage，确认可回读后再
   clear；hold 保留 pending；中断可重复，不承诺 exactly-once/runtime 保证。
3. 保留 capture/process 在一个 skill 内的暂定结构，但加上“capture-only 请求在 capture
   后停止；process 只在请求、bounded delegation 或 safe point 机会下发生”，并将拆分
   决定留给后续行为 probe。
4. 不新增 Todo、ideas/archive、eval schema、host command、runtime contract 或第二份
   theory；不把现有六条 raw 写进 skill。

## 准入与验证处置

当前候选可继续作为 `.agents/skills/` 的 incubating candidate，但不应标为行为已接受。
skill-formation 的 admission report 依据用户意图和一批 provisional raw 支持“值得
形成候选”，还没有满足行为差距、重复性、匹配 baseline、负触发和回归证据的更强主张。

未运行 behavior test；后续应按 admission report 的 probes 与
`evals/skill-evaluation/protocol.md` 区分：skill discovery、capture-only、process、
authority、candidate/record、history append-first、active-goal safe point、重放与回归。
当前最强状态只能是 `format-valid`（若机械检查通过）与 behavior `unknown`，不能声称
`behavior-observed`、`matched-improvement` 或 `regression-supported`。

若完成上述两项 blocking 文本修订后，代表性 probe 仍不能区分 skill 相比项目指令与
现有 skills 组合的净收益，最终处置应退回 `uncertain`/`no-proposal` 或降级为项目局部
指令、普通文档或 reference；不得因候选文件存在或 `/inbox` 名称存在而继续保留。
