# planning-inbox round 3：old-vs-new candidate fixture

本文件是 round-3 的 review-only 预注册，不运行、不评分、不修改 round2 的 payload、fixture、
manifest、runs 或 snapshot。五项 A–E 复用 round2 payload 的完整文件字节；它们是相同的
任务/source，不是 fresh holdout。

本轮比较两个已冻结 candidate snapshot，而不是 baseline/treatment：

- old arm 只额外加载 `evals/skill-evaluation/snapshots/planning-inbox-round-2.md`；
- new arm 只额外加载 `evals/skill-evaluation/snapshots/planning-inbox-round-3.md`；
- 两臂都使用同一 item 的 payload、同一目标模型和各自 fresh ephemeral context；不读取本
  文件或 manifest 的 review-only 判据。

## Semantic floor（继承 round2，不得回退）

round2 已由盲评和 synthesis 建立的最低语义关系，在本轮不得被“压缩”削弱：

- A：六条 raw 的原话、顺序、批次和可回指关系仍须保留；秘书去向、补问、authority、候选
  路由与正式 record/承诺的边界不能丢。
- B：capture 必须仍保留用户原话、`/inbox`、批次和来源，并停在用户要求的暂不展开；不能
  为短而省略 source，也不能把文本标记说成 host 能力或已写入。
- C：给定 pending/history/中断事实仍须保留 history 先于 pending 清除的关系、hold 留
  pending、clear 不等于 complete、重复和中断 lineage；文字不创造 atomic/exactly-once/
  recovery/claim 或外部效果。
- D：普通 future input 不因新、长、感觉紧急而抢当前 goal；当前接受边界的用户纠正须保留
  authority，等下一次可保存检查结果时重读相关关系；不能倒写、自动切换或声称后台接收。
- E：`想试 A` 与实际 Run observation、待查研究问题与 source-checked research record
  继续保持不同 standing；秘书路由不能制造 effect、research conclusion 或 acceptance。

语义 floor 任一重大回退即否决 new arm 的保留，不因输出更短或 token 更低而抵销。

## 唯一语义 delta（review-only）

new snapshot 相对 old snapshot 只引入下列同一压缩/明确化关系；没有新目标、新 owner、新
runtime 能力或新接受权：

1. 当 source 已稳定可回指且当前不执行 clear 时，可用 ID、path 或 lineage 回指 raw，不必
   机械重抄整段；capture 或 clear 前写 history 仍须保留逐字 raw。
2. 只展开会改变 disposition、authority、owner 或下一行动的 explicit/inferred/unknown；
   同一批次的共同边界说一次并回指，不把它渲染成固定字段模板。
3. source 没有真实 owner 时，明写 `owner unknown`；工程、实验、研究等仅是候选路由或
   可能的 owner 类型，不能写成现任正式 owner。

这三点是本轮唯一预注册 delta。任何其他行为变化、格式扩张、理论回读或外部效果都不属于
本轮因果对象。

## Item-specific delta predictions（review-only）

### A：六条 raw dogfood

- new 可能以 `IN-2026-08-24-001A`–`001F`、批次和 source path/lineage 回指共享 raw 与
  共同边界，减少逐条重复展开。
- new 仍须让每条结果回到原话、保留候选去向/补问/谁决定；source 没有正式 owner 时应
  写 `owner unknown`，不能把理论/工程/实验等类型写成已存在责任人。
- major regression：丢失或改写任一 raw、无法按 ID 回指、候选路由变成正式路线图/owner/
  acceptance，或压缩使用户无法恢复逐条关系。

### B：capture-only

- new 不应把本项当作可压缩的 process summary；必须逐字保留用户消息、`/inbox`、批次、
  来源和“先记着不要分析”。本项是对 delta 的负向边界 probe。
- 允许观察到输出更短，但 source fidelity、capture 停点和不得声称写入/host command 的
  floor 不能下降；任何 raw 丢失或主动分析都构成 semantic major regression。

### C：整理并清空、中断

- new 可用 `P-C1`–`P-C3`、pending/history path 和中断 lineage 回指已给事实，把共同的
  clear/complete、重复和恢复限制说一次；涉及 clear 时不得以回指替代 history 中应保留的
  逐字 raw/source/receipt/lineage。
- owner 未由 source 给出时应写 `owner unknown` 或候选路由；不能把“用户要求清空”扩张为
  已完成、已接受或系统恢复。
- major regression：省略 append-before-clear 关系、移除 hold、把中断说成原子迁移/恢复，
  或因压缩丢失 C2 的重复与 pending/history 双存事实。

### D：active goal 插入

- new 可用当前 goal、当前受限步骤、消息 1/消息 2 与下一次可保存检查时点回指共同边界，
  不必重复所有一般性失败边界。
- 消息 1 仍只是 future planning input；消息 2 的具体接受者和 source authority 要保留，
  但未给出更具体 owner 时应写 `owner unknown`/候选路由。不得把压缩写成自动 safe-point、
  wake、cancel、persist 或 acceptance。
- major regression：普通想法抢主线、接受边界纠正丢失、当前步骤被倒写，或声称后台已收到/
  恢复/取消。

### E：candidate 与 record

- new 可用材料 ID、Run `R-17`、research `RR-03` 和共同 source/lineage 边界减少重复，但
  仍须分别标出待验证提议、实际运行观察、待查研究问题和已对照研究记录。
- source 没有指定正式 owner 时，应写 `owner unknown` 或候选路由；reviewer 对照事实不
  自动取得 acceptance。
- major regression：把“想试 A”变成已运行/有效，把待查问题变成结论，或将 Run/RR 记录的
  observation/evidence 与秘书推断混为一谈。

## Payload locks

| item | round2 payload | SHA-256 | round2 semantic oracle |
|---|---|---|---|
| A | `evals/skill-evaluation/payloads/planning-inbox-round-2/A.md` | `d920d43f4a7c3562d9de1583793ea48891c3ccf97d8ca149e169d63d6b863078` | round2 fixture A floor |
| B | `evals/skill-evaluation/payloads/planning-inbox-round-2/B.md` | `9a60494a01b5f0a0d3aba64eb956096a43e69f920dda19bb04590ad9a16768b4` | round2 fixture B floor |
| C | `evals/skill-evaluation/payloads/planning-inbox-round-2/C.md` | `f9574a759a6a42d8c361916c20d04a7905670d1573e658889803752ace936f8b` | round2 fixture C floor |
| D | `evals/skill-evaluation/payloads/planning-inbox-round-2/D.md` | `37ae8a6e87fc640667022892f0f0f221226cef85fe88c0da599e5071feaef56e` | round2 fixture D floor |
| E | `evals/skill-evaluation/payloads/planning-inbox-round-2/E.md` | `13458edde1ccc248ae98ef208722d801489515d52253a2133df019713a59e497` | round2 fixture E floor |

payload hash 算法沿用 round2：UTF-8、LF、完整文件字节 SHA-256；不 trim、提取、脱敏或重排。

## Evidence and cost boundary

本 fixture 只预注册 old/new 的 semantic comparison，不运行、不生成 behavior standing。任何
输出长度、token、等待或协调成本下降，都只作为 balancing observation；不得设硬 token 阈值、
总分或“更短即通过”。未核实的 served model、system/developer prompt、harness、权限、fresh
context 隔离、candidate 激活、runner 可见边界和直接退出状态均保持 `unknown`。

old candidate 是可回退锚点；若 new 产生任一 semantic major regression，处置只能保留 old
snapshot 或回退，不得用成本下降覆盖。若 new 保持 semantic floor 且减少不必要机械展开，
仍需独立 review 才能决定 `retain`；本静态 fixture 不授予接受权。
