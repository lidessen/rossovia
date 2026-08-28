# Project-cognition archive candidate：当前处置 review

状态：`source-observed / no-proposal-now / independent-review-complete / acceptance-pending`。

本记录处理 archive 中 `project-cognition` 是否应在当前 living planning 形成可选择加载的
skill 载体或第二个持久 cognition projection。它不是 project facts、planning authority、WorkCell
协议、runtime 机制或实现计划，也不删除 archive 历史。

## 1. 对象与主要判断

| 字段 | 当前观察 |
| --- | --- |
| historical candidate | `archive/skills/project-cognition/SKILL.md` |
| proposed method | 为指定后续决策建立/刷新 source-linked working model，并决定临时模型还是持久 projection |
| current living carrier | none |
| current planning consumer | `planning/item-ledger.md` 已拥有 item standing projection；这不是该 candidate 所需的 later cognition consumer |
| named later actor | none |
| recurring reconstruction failure | 当前 living planning 未命名或量化；历史材料中的重复重建不能直接移植为当前事实 |
| decision delta outside current owner | none established |
| persistence / retention owner | unknown |
| external verifier | unknown |

`project-cognition` 的不可约判断不是“把项目扫描成一份更完整的摘要”，而是：给定命名的
后续 actor 或反复决策，判断是否值得保留一个可验证、可选择刷新且不拥有事实权的 working model。
没有后续 actor、重复决策或 decision delta 时，它自己的方法要求使用 temporary source-linked
model 后停止。

## 2. 来源与历史证据 standing

- archive skill 正文把“是否持久化”放在第一步，并明确：没有 later actor、recurrence 或 decision
  delta 时，temporary model 通常是更小、更安全的形式；它也禁止把 generator、projection 或
  Work Cell 当 verifier。
- [`archive/evaluations/2026-07-16-project-cognition-skill-positive-probe.md`](../../archive/evaluations/2026-07-16-project-cognition-skill-positive-probe.md)
  支持在一个命名项目和后续决策明确的历史环境中，skill 能选择 temporary/durable cognition、
  进行 source-linked reconstruction，并把外部 verifier 与 generator 分开；其中也有一次没有
  later actor 的 bounded question 返回 `persistence: declined`。
- [`archive/evaluations/2026-07-15-project-cognition-scale-control.md`](../../archive/evaluations/2026-07-15-project-cognition-scale-control.md)
  支持 typed coverage ledger 能约束一次具体的 scale/projection error，但明确不能从单一上下文
  直接创建 general project-cognition skill 或新的 runtime carrier。
- 当前 `planning/records/archive-skill-inventory.md`、`planning/records/design-development-review.md` 和
  `planning/records/next-candidate-review.md` 均把它放在 `hold`：等待 named later actor、重复重建成本和
  decision delta，而不是等待更多文件或一份更完整的摘要。

这些材料最多形成 `archive-backed behavior/boundary observation`。它们不能证明当前 living
planning 已有 consumer、portable 方法接受、当前归因或持久 projection 的净收益。

## 3. 当前形式比较

| 形式 | 当前判断 | 处置 |
| --- | --- | --- |
| 当前任务中的 temporary source-linked model | 足以支持本 goal 的一次 planning review；不产生第二 authority | 保持为 Main 的直接工作形式 |
| `item-ledger` / `coverage-audit` 等当前 planning projections | 已经由 planning owner 保存 standing、依赖、出口和 revisit；不是 project-cognition 的通用 carrier | 继续由现有 owner 维护，不复制为 cognition model |
| living `.agents/skills/project-cognition/` | 没有 named later actor、重复 consumer 或当前 decision delta 支持其准入 | `no-proposal-now`；不创建 |
| portable `skills/project-cognition/` | 当前没有脱离本仓库事实的 consumer 或 matched evidence | `no-proposal-now`；不创建 |
| archive historical candidate | 仍能提供方法来源、边界和反例 | `archive-only / retain-source` |

## 4. 边界、允许范围与出口

允许：

- 在一个未来明确命名 actor、决策和 source revision 的任务中重新判断 temporary/durable form；
- 保留 archive source 与历史 probe，作为 candidate formation 的来源和反例；
- 当现有 item ledger 无法支持一个真实 later decision 时，建立新的 bounded projection proposal。

不允许：

- 因为 planning 文件很多，就创建第二份项目认知模型；
- 将 `item-ledger`、generated artifact 或 Agent summary 说成 canonical project facts；
- 在没有 external verifier、retention owner 和接受关系时建立 durable projection；
- 因该 candidate 直接增加 WorkCell registry、memory store、queue、retrieval service、DeepSeek
  Harness 模块或任何 base/runtime 实现。

Reopen 条件必须同时至少包括：

1. named later actor 或可重复的 later decision；
2. 当前 source-linked reconstruction 的真实成本、失败或遗漏观察；
3. 该 working model 相对于现有 planning owner 的 decision delta；
4. external verifier、source revision、projection retention/删除 owner 和接受关系；
5. 能区分 temporary model、现有 planning projection 与 durable cognition carrier 的 probe。

## 5. 当前处置

将 `project-cognition` 从 `hold` 收敛为 `no-proposal-now / archive-only`。这是当前阶段的
bounded disposition，不是永久删除、方法否定或未来禁止；它关闭的是“现在创建 living carrier
或第二 projection”的提案，不关闭 future reopen。

阶段影响：A1/A2 获得一个明确的不迁移出口；当前 11 个 `.agents/skills/` 不增加第 12 个载体，
`skills/` 不新增 portable mirror；本 disposition 不授权任何实现，也不对工作树中无关实现状态作穷举
断言；WorkCell、DeepSeek Harness 和 base implementation 的冻结不变。

## Independent review

Independent bounded reviewer: `Codex`, `2026-08-25`, verdict `accept after projection sync`.

The reviewer verified that the historical sources support only a conditional method and temporary-model
boundary; current named actor, recurrence, decision delta, verifier, retention owner and acceptance remain
unknown; archive retention preserves future reopen; and no second planning authority or runtime
implementation is authorized. The initial review identified projection drift in
`archive-skill-inventory.md`, `design-development-review.md`, and `item-ledger.md`; those three projections
were synchronized to this disposition. Current portability and regression evidence remain unknown.
