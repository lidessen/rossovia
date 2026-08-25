# planning-inbox skill：round-2 → round-3 静态 delta review

## 范围与证据 standing

本 review 只读取了 `AGENTS.md`、当前 `.agents/skills/planning-inbox/SKILL.md`、
`evals/skill-evaluation/snapshots/planning-inbox-round-2.md`、
`evals/skill-evaluation/snapshots/planning-inbox-round-3.md`，以及
`evals/skill-evaluation/reviews/planning-inbox-round-2-synthesis.md`。不修改 skill，也
不把 snapshot 当成实际运行结果。

round-2 synthesis 给出的证据 standing 是同一请求配置下的 `behavior-observed`、
output-level `boundary-supported`，不是 `matched-improvement`、稳定泛化或因果归因。
它同时报告 treatment 在 A–E 中保留 source/authority/standing 边界，并报告 treatment
输出约为 baseline 的 1.82 倍；这些证据支持 round-3 三条改动的方向和成本动机，但没有
证明 old→new 的回归行为。

## 三条实际变化

### 1. clear 前的 history 条件明确要求“逐字 raw”

round-2 的条件是把“可回读的 raw/source（快照或可回指原文）、receipt 和 lineage”追加
到 history；round-3 改为先追加“逐字 raw”、可回读 source、receipt 和 lineage，再 clear
pending。它是对 capture exact raw 的收紧，不是把 capture 变成 process 或增加新的 runtime
保证。

- **静态处置：`accept`，nonblocking。** 该变化直接加强 source fidelity，并保留
  append-first 顺序：history 可回读关系成立后才移除 pending。它与当前 form 的逐字、批次、
  顺序、来源、上下文可重建要求一致，也没有改变 hold 留在 pending、两步中断时允许
  pending/history 同时存在、不能声称原子迁移或 exactly-once 的边界。
- **行为证据关系：** round-2 A/B 的 treatment 保留逐字 raw，C 保留 history 中断、
  hold、重复、clear 与 complete 的区别；这支持把“逐字 raw”写成 clear 前的承重条件，
  但尚未显示旧文字在某个相同输入上一定会漏掉 raw。
- **clear/complete 与 owner/runtime：** 变化只约束 clear 前的 history receipt，不把
  clear 变成 complete、acceptance 或 owner handoff；没有引入 host command、持久化、
  恢复、事务或其他 runtime 能力。

仍需 old-vs-new retest：含标点、语义转折、批次顺序和修订关系的 capture；history 已追加
但 clear 前中断；hold、clear、complete、acceptance 混在同一批时的处理。验收应确认
history 中的 raw 逐字可重建、pending 不会先移除，也不会把 clear 说成完成。

### 2. 对稳定可回指且不 clear 的 source 允许用 ID/path/lineage，且只展开承重语义

round-3 新增两条表达约束：只展开会改变 disposition、authority、owner 或下一行动的
explicit/inferred/unknown；同一批次共享边界只说一次并回指；若 source 稳定可回指且当前
不 clear，可以用 ID/path/lineage，不必机械重抄整段。它同时保留 capture 或 clear 前写入
history 必须逐字 raw 的例外。

- **静态处置：`uncertain`，nonblocking 风险，建议带回归门槛。** 变化准确对应 synthesis
  报告的成本问题：treatment 输出增加 2,933 tokens，约为 baseline 的 1.82 倍，而且
  synthesis 明确建议同样的三项最小压缩。其保护条件也足够清楚，不能把它视为单纯追求
  更短输出。
- **未见直接矛盾：** source 稳定且可回指是前提；capture/clear 的逐字 raw 义务没有被
  放宽。candidate/record、clear/complete、owner/acceptance、runtime 边界的正文没有被
  重定义，压缩本身不能制造 record、正式 owner 或 runtime。
- **主要风险：** “稳定可回指”若在实际输入中并不成立，ID/path/lineage 会退化成不可
  回读的短标签；“同一批次共享边界说一次”也可能把每条 raw 的来源、版本、冲突、
  candidate/record standing 或下一责任误折叠。若压缩让调用者无法重建 source，成本优化
  就越过了 skill 的目标，而不只是减少冗余。

仍需 old-vs-new retest：source 可稳定回指、source 缺失/过期、当前 clear 与当前不 clear
两类输入；单批次内同时有普通 future input、research candidate、experiment candidate、
实际 Run/research record 的混合材料；还要检查 explicit owner 与 owner unknown 的边界。
比较不能只看 token 数，必须同时检查 raw lineage、authority、candidate/record、证据
standing、clear/complete 和下一行动是否仍可重建。

### 3. source 未给真实 owner 时显式标为 `owner unknown`，角色类型只作候选路由

round-3 在“source 尚未接受或 authority 尚未覆盖时保留候选/待确认/hold”后新增：若
source 没有真实 owner，明确写 `owner unknown`；工程、实验、研究等只表示候选路由或
可能的 owner 类型，不能写成现任正式 owner。

- **静态处置：`accept`，nonblocking。** 这是对 synthesis 所指出的唯一非 blocking 风险
  的直接修正：A 类输出中的工程、实验、理论等角色可能被读成 source 已给出的正式 owner。
  新文字把“谁可能处理”与“谁已经有权决定”分开，和 authority、acceptance、真实 owner
  负责 Plan/goal/执行/complete 的边界一致。
- **未见矛盾：** 条件只针对 source 未给 owner 的情况，不会抹掉 source 明确提供的真实
  owner；也没有把角色路由升级成接受、priority、commitment 或外部效果。

仍需 old-vs-new retest：source 明确给出 owner、source 未给 owner、需要 named owner
acceptance 的外部/不可逆效果、只有 reviewer/secretary 建议的 candidate handoff，以及
实验/研究 record 已有但 acceptance 未成立的输入。应确认缺 owner 时返回 `owner unknown`
或 hold，而不是流畅地补出正式责任人。

## 对承重关系的综合检查

- **Capture exact raw：** 变化 1 明确加强；变化 2 明确声明压缩不适用于 capture 或 clear
  前 history。逐字内容、批次、顺序、来源和上下文仍是可重建条件。
- **History append-first：** 变化 1 保持并强化“先追加 raw/source、receipt、lineage，后
  clear pending”；中断仍可两处可见，不声称原子迁移或恢复。
- **Clear / complete：** 三条都没有把 view clear 当成 complete；complete 仍需要目标
  关系满足终止条件和证据，acceptance 仍由有权 owner 采纳。
- **Candidate / record：** 规则本身未改变，experiment/research candidate 与实际
  Run/research record 仍分开。变化 2 的批量压缩是这里最需要回归的地方，因为省略共同
  语境时最容易误删 standing 或 lineage。
- **Owner / runtime：** 变化 3 改善 owner unknown；三条没有新增 wake、持久 identity、
  并发 claim、取消、事务、事件游标、exactly-once 或外部副作用能力。safe point 和
  “反复检查”仍只能表示方法上的下一次运行机会。
- **Token cost：** 这不是无证据的格式瘦身：round-2 已报告真实 output 增量，且 synthesis
  已限定为三项最小变化。可是 round-3 尚无成本测量或 old→new 行为结果，不能预先声称
  压缩净改善。

## 最终处置

**总体：`uncertain`，非语义 blocking；建议 `adapt-and-retest`。**

静态方向上，变化 1 和变化 3 可接受；变化 2 是有证据动机、但必须以 source 可回指和
语义不丢失为条件的压缩候选。没有发现三条变化引入与 capture exact raw、history
append-first、clear/complete、candidate/record、owner 或 runtime 相矛盾的 blocking 缺陷。

但“最终 accept/retain”仍被 old-vs-new 行为证据门槛阻挡：应以相同 payload 比较 round-2
旧 snapshot 与 round-3 新 snapshot，覆盖 capture-only、history clear 中断、mixed
standing、explicit/unknown owner 和无 runtime 能力的情况；同时记录输出负担。若压缩令任何
承重关系退化，应只回退变化 2 或保留旧表达，不因 token 下降而接受；只有在边界保持且
负担实际下降后，才可由独立 review 决定 retain。
