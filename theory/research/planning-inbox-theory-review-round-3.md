# Planning Inbox theory review — round 3

## 结论

**静态 theory verdict：`accept`。**

**行为状态：`unknown`；后续动作：`adapt-and-retest`。**

这是对第三次修订后的 `theory/research/planning-inbox-synthesis.md` 与
`theory/harness/planning-inbox.md` 的最终静态复审。`accept` 只表示当前理论边界、
standing、owner 和形式边界已经足以进入后续验证；不表示秘书 Agent、幂等、并发、
恢复、持续检查或任何具体实现行为已经成立。

## Round-2 B5：已关闭

第三次修订已把 candidate 与实际记录明确分开：

- synthesis 第 81–90 行以及候选第 140–152 行规定，`research candidate` 只承载待
  调查问题、已有来源、候选推断、矛盾、unknown 与所需证据；实际 research record
  的调查观察、来源核验与结论归 record/source owner。
- `experiment candidate` 只承载待验证干预、baseline、controlled variables、
  configuration candidate、预期观察/证据条件与接受条件；它不拥有实际 observation。
- 实际 Run/Cell 的 observation、effect、failure、evidence 归 experiment record、
  runtime/Cell 与 evidence owner；inbox 只能形成 disposition/handoff，不因去向名称
  创建实际 record 或接受结果。
- `incubation/planning candidate` 只表示尚未形成正式 research/experiment 关系的
  方向性计划，不取得 research/experiment standing。
- 最小最近邻反例已经明确：`想试 A` 可以是 experiment candidate；实际跑 A 的观察
  才是 experiment/eval record，前者不能冒充后者。

因此，candidate、实际 research record、experiment/eval Run/Cell observation/evidence
之间的 object/part/related-result 边界已经足够清楚，第一轮 B5 不再 blocking。

## 回归检查

### B1 对象边界：通过

对象仍是 `raw/source → secretary interpretation → disposition → optional/explicit
handoff + provenance`，不是文件、命令、Todo、计划或 Agent 回复。执行、evidence、
completion、acceptance、archive 和 receipt 是可关联的下游结果/记录，不构成 inbox
同一性的必要部分（synthesis 第 45–90 行；候选第 15–37、41–62 行）。

### B2 authority：通过

候选第 88–104 行及 synthesis 第 114–127 行已要求 explicit user instruction 按自身
的 action、scope、effect boundary 和 reversibility 解读；已有 bounded delegation
可授权可逆本地整理、链接、局部 Todo、合并建议和有界检查，无需逐项 fresh
confirmation。mere suggestion/inference 只能形成候选解释、disposition、问题或
hold；不能扩张 commitment、priority、goal、owner、scope、acceptance 或外部/不可逆
效果。此处同时满足低摩擦和不扩权。

### B3 hold、revisit、safe point：通过

每个非终结 hold/deferral 都要求可见 reason，并关联 owner decision、safe point、
return condition、下一次运行机会的 review eligibility 或 owner escalation（候选
第 158–164、204–226 行）。新输入默认不抢 active mainline；没有运行机会时只报告
未复查，不伪装 scheduler、后台 wake、cursor、exactly-once、claim、lease 或 crash
recovery。

### B4 P12/P13：通过

synthesis 第 156–184 行明确移除 P12/P13 的必需推导，理由是当前没有对抗性 actor、
竞争性 consumer 或误导性输入。P01–P11、P14–P16 只保留会改变当前 inbox 判断的
关系，不以全序列覆盖率为质量标准。

## 其余边界复核

### Raw fidelity 与重建：通过

两份文件都允许按语义转折拆分 raw，同时保留 batch、顺序、逐字内容、来源、上下文、
修订和撤回关系，使原话可重建；摘要不能覆盖或无标记纠正原话。explicit、inferred、
unknown 是可审查语义区分而非固定字段（候选第 30–37、64–86 行）。

### Research / eval / experiment standing：通过，保留一个非阻断未知

候选已分开 research candidate、experiment candidate、incubation/planning candidate、
实际 research record 与实际 experiment/eval record。实际运行的 observation/effect/
failure/evidence 不再属于 candidate。这里的 `experiment/eval record` 是对实际运行
记录的开放指称，而不是预先规定 eval schema 或路径；如果未来 eval 与 experiment
拥有不同的 acceptance 或 evidence contract，应由对应 owner 在后续 form/runtime
工作中进一步拆分。当前 theory 没有把它们强行归一，因此不是 blocking。

### 无固定 eval 路径或 schema：通过

候选第 124–152、228–252、254–294 行及 synthesis 第 231–285 行把 candidate、record、
probe、Markdown、runtime 和接受决定的 standing 分开，并明确不预先规定字段、标题、
标识符、命令、文件拆分、评估记录载体/路径、状态机、调度周期或 Agent 数。探针是
待验证问题，不是已经选择的 eval framework。

### Markdown/runtime：通过

低风险单写者 Markdown 只作为 raw source 或可审阅记录；身份、生命周期、权限、
原子写入、并发 claim、恢复、外部效果、持久证据、scheduler 与幂等等硬属性仍归
tool/runtime/base。理论没有把 prompt、Markdown 或 skill 能力说成后台保证。

### consume / clear / archive / complete / acceptance：通过

候选第 166–183 行继续分别定义消费、视图清空、可恢复归档、带证据完成、独立接受和
delete/purge；inbox zero 不是完成或 acceptance 信号。

### 形式与 owner：通过

候选仍是 harness 的 living theory 子理论，不是 `planning/inbox.md` 文件规范，也不
取得 source、goal、Plan、Run 或 acceptance 的第二权威。skill、projection、schema、
runtime 和 eval 载体均留给后续 owner 判断，符合形式选择的最小边界。

## Non-blocking standing note

synthesis 第 283–285 行仍将自身记录为 `theory candidate = revise / behavior unknown`。
这表示该研究综合保留“待明确接受、行为未验证”的 standing，不反驳本轮对候选理论
边界作出的独立静态 `accept`。若项目的治理约定要求 synthesis 与 review verdict
同步，后续 owner 可单独更新其处置标记；本复审不修改候选或研究文件。

## 后续验证边界

静态接受后仍必须 `adapt-and-retest`：验证 raw fidelity、拆分重建、批量澄清、authority
矩阵、合并/重放 lineage、candidate 与实际 record 的最近邻反例、safe-point 插入、
hold 可见性、consume/clear/archive/complete/acceptance 差异，以及第二 writer、并发、
重启、外部效果和 runtime 升级边界。任何成功示例只能提升到相称的行为证据等级，不能
由本报告宣称持续运行、exactly-once、无重复副作用或恢复保证。

## Main 接受记录

**接受时间：** 2026-08-24  
**处置：** `accept` 当前 living theory expression；行为保持 `unknown / adapt-and-retest`。

Main 接受本报告的静态边界判断，允许 `theory/harness/planning-inbox.md` 作为后续
form-selection、skill-formation 和行为评估的语义来源。本接受不批准具体 schema、
`/inbox` runtime、后台执行、并发、恢复、exactly-once 或外部效果，也不把当前临时
`planning/inbox.md` 当作正式形式已经验证。
