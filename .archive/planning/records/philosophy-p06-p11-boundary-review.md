# 哲学序列父 item：P06/P11 简化与扰动成本 boundary review

状态：`source-current / design-boundary-observed / independent-review-complete / acceptance-pending`；
不是新的哲学条目、P11 reading acceptance、WorkCell runtime cost policy 或实现授权。

本记录只检查 P06（分析·简化）与 P11（解决·成本）在同一候选机制关系上的阶段边界。P06 已形成
reading candidate；P11 已形成 reading candidate，但本记录不替 P11 完成独立 reading review 或 acceptance。

## 1. 来源、对象与用途

- **P06 source：** `theory/philosophy.md` 的 `P06｜为学日益，为道日损｜分析·简化`。
- **P11 source：** 同一文件的 `P11｜治大国若烹小鲜｜解决·成本`。
- **关系来源：** `theory/gene-expression.md` 的分析·简化与解决·成本两个坐标；
  `theory/research/philosophy-gene-one.md` 对 P06/P11“同源但靠阶段切割”的修订记录。
- **固定关系：** 当前 WorkCell 设计中，是否因为 Event replay/lineage consumer 未命名而增加
  event bus、replay store、lineage registry 或 provider session resume。这是同一候选机制关系/设计
  问题的条件性演化，不代表同一个 Event、replay、lineage 或 WorkCell runtime object；F1→F2 不是
  runtime state transition，未来重新 admission 产生的对象另作新对象处理。
- **具体用途：** 判断“减少复杂性”是在分析阶段删掉不改变当前判断的候选关系，还是在解决阶段
  控制已经决定的 host/runtime 扰动；避免用 P06 的删减替代 P11 的执行成本判断。

## 2. 最小关系定义

1. **P06：分析删减。** 保留会改变对象身份、证据、unknown、owner route、硬约束或下一判断的
   关系；去掉不改变当前分析的 speculative branch 和重复复杂性。它不决定已接受方案如何执行。
2. **P11：解决扰动/成本。** 在具体方案已经进入解决阶段后，判断执行会产生多少扰动、翻动、协调
   或代价，以及如何避免不必要的反复改变。它不决定分析阶段哪些概念/关系可以被删除。
3. **阶段关系：** P06 可以导致“当前不引入 event bus”这一 design disposition；若未来 owner
   接受 replay contract，P11 才能参与比较 host effect、部署/迁移扰动和重复操作成本。二者不
   共享 acceptance、runtime 或 budget authority。

## 3. 同一候选机制关系的 boundary fixtures

### F1：分析阶段删除 speculative mechanism（P06）

- **条件：** 没有 named replay consumer、retention owner 或 accepted replay contract；当前只知道
  Event 是 typed observation，replay identity/sequence/gap/restart contract 未定。
- **P06 判断：** event bus、replay store、lineage registry、session resume 不是当前改变
  standing 的必要关系，可以保留为 conditional candidate/unknown，不塞进 WorkCell core。
- **P11 不接管：** 这不是在计算执行成本，也不是证明未来机制便宜或昂贵；它只是分析删减。
- **越界：** 若连 consumer/owner unknown、证据边界或 revisit condition 一并删除，就误删承重关系。

### F2：解决阶段控制 accepted effect 的扰动（P11 条件性端）

- **条件：** 假设未来已有 owner-backed contract，已决定要部署某项 effectful adapter 或 replay
  mechanism；问题变成如何减少重复 host call、反复迁移、协调翻动或不必要的 workspace effect。
- **P11 判断：** 比较执行路径的扰动与代价，可能选择更少的翻动或更有界的操作；具体执行仍由
  host/coordinator/runtime owner 决定。这只是同一候选机制关系的条件性设计比较，不代表 F1 的
  设计 claim 已变成 F2 的 runtime object。
- **P06 不接管：** 不能因为某执行路径成本高，就回头删掉已经承重的 contract、unknown、证据
  或安全约束；那会把解决阶段成本错误写成分析阶段简化。
- **越界：** hypothetical execution path 不能证明当前 runtime 已有成本保证或 P11 已形成 reading。

### F3：二者都谈“减少”，但下一判断不同

- **P06 失败反例：** 删除一项仍会改变 owner route 或 acceptance 的 unknown，导致设计无法回读。
- **P11 失败反例：** 方案已经接受，却重复发起 host effect 或频繁翻动 workspace，导致实际执行
  扰动增加。
- **区分：** 前者改变“分析保留什么”，后者改变“解决怎么做”；若替换 F1/F2 后 owner、失败
  方式和下一动作仍然相同，阶段切割不足，P06/P11 关系需回修。

## 4. 当前结果、证据与允许范围

- P06 继续 `retain-candidate / acceptance-pending`；P11 为 `reading-candidate / independent-review-complete /
  research-open / acceptance-pending`。
- 关系当前为 `design-boundary-observed / acceptance-pending`；F1 是当前 design observation，
  F2 是 future accepted-contract 条件性 fixture，不能升级 WorkCell 或 runtime standing。
- 允许：source-linked reading、阶段边界反例、下游 owner route 和 planning projection；不允许：
  修改 P source、把本关系 review 当成 P11 独立 acceptance、建立 event bus/registry、制定预算或实现成本 policy。
- 仍未知：P11 在真实 domain/use 下的最小成本/扰动对象、谁接受执行代价、P06/P11 是否能在真实
  case 中稳定改变不同 owner/route，以及是否需要 separate reading for P11。

## 5. Independent semantic review

独立 reviewer：`Kant`（Agent `01a03792-3537-7960-a2cb-ea1ab05fd389`）；未修改文件，也未取得
哲学、reading、WorkCell、runtime、预算或 acceptance 权。

- 确认 P06/P11 的分析阶段—解决阶段与 owner 边界成立；
- 确认 F1/F2/F3 没有把 hypothetical runtime、执行成本或预算 authority 写成事实；
- 确认 P11 candidate 的条件性 standing 没有被本 fixture 偷偷提升为 acceptance；
- 确认没有取得 reading、WorkCell、runtime 或预算 acceptance。

当前关系 standing 为 `source-current / design-boundary-observed / independent-review-complete /
acceptance-pending`。

## 6. 下一 return

由独立 reviewer 检查 F1/F2/F3 是否保持分析/解决阶段和 owner 边界；若关系可区分，再在真实
effectful host case 中观察 P11 是否改变执行路径或扰动判断；若不能区分，回修 P06 或保持 P11
candidate 不升级，不创建“少动”万能规则。
