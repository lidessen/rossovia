# P04 / P08 交叉边界 review

状态：`source-current / design-boundary-observed / independent-review-complete / acceptance-pending`；本记录是
哲学序列父 item 的有限 source-linked boundary fixture，不是哲学 source、reading acceptance、skill、
权限规则或 runtime scope 机制。

## 对象、来源与用途

本轮固定一个下游候选对象：**关于 WorkCell Binding immutability 的设计/host claim**。这里的对象
不是已实现的 runtime 行为，而是一个需要区分“当前设计记录知道什么”和“这项 claim 是否仍在当前
问题范围内”的 planning/design claim。

- P04 source：[`theory/philosophy.md`](../../theory/philosophy.md) P04，`知之为知之，不知为不知｜认识·已知边界`。
- P08 source：同一文件 P08，`井蛙不可语海，夏虫不可语冰｜分析·问题边界`。
- 术语/序列关系：[`theory/gene-expression.md`](../../theory/gene-expression.md) 将 P04 放在认识的
  “已知边界”，将 P08 放在分析的“问题边界”。
- 下游材料：[`theory/philosophy/P04.md`](../../theory/philosophy/P04.md)、
  [`theory/philosophy/P08.md`](../../theory/philosophy/P08.md)、
  [`philosophy-p04-p15-p16-boundary-review.md`](philosophy-p04-p15-p16-boundary-review.md) 和
  当前 WorkCell design/review records。
- 具体用途：让后续 Agent/人类在遇到“证据不足”与“问题范围不一致”时选择不同的下一动作，避免
  把 scope mismatch 偷换成 unknown，也避免把局部 design fact 外推成 runtime fact。

工作 handle：`知识状态—问题边界区分`。它是本轮临时指称，不新增哲学术语，也不取得 canonical
命名权。

## 最小区别

| 关系 | P04：已知边界 | P08：问题边界 |
| --- | --- | --- |
| 直接对象 | 当前已指认对象、关系或结论的证据状态 | 当前问题/观察覆盖的对象、条件、视域、时间与语境 |
| 核心问题 | 现有材料是否足以把这项 claim 称为已知 | 当前 claim 是否仍在原问题范围内，跨出后是否需要重新问题化 |
| 缺口表达 | `unknown / source-insufficient / relation-unobserved` | `out-of-scope / scope-unshared / re-problemize-needed` |
| 下一路由 | 回到调查、实践、record 或 acceptance owner；仍由相应 owner 决定行动 | 回到对象、consumer、host/时间/条件边界；先重新定义 claim，不直接复用原结论 |
| 不拥有 | 不决定发言资格、检验手段、接受、权限或 runtime | 不决定能力、权限、拒答、优先级、任务入口或 runtime routing |

两者可以同时成立：范围已经明确但证据不足（P08 stable、P04 unknown），也可以在原范围内有已知
局部事实但尝试转移到新 host/时间/consumer（P04 local fact known、P08 transfer not established）。
这里的“scope mismatch”“re-problemize-needed”等词是由 `gene-expression.md` 与 P04/P08 reading
形成的本轮候选解释，不是 P04/P08 源行直接规定的正式路由术语。

## Boundary fixtures

固定 claim：**“admission 后的 WorkCell Binding 在允许范围内保持 immutable”**。该 claim 的
设计 source/review 仍是 candidate，不是 runtime fact。

### F1：范围固定，证据不足

- 当前问题冻结为“同一 design revision、同一 host contract、同一 Binding 和同一时间窗口内，
  immutability claim 是否已经得到足够支持”；对象、host 条件、版本、时间和 claim 范围已写明。
- revocation、drain 和在途 effect 只作为这项 immutability claim 的证据缺口；它们不是本案另行
  打开的新问题。当前没有 owner-backed contract 或 runtime Run。
- P08：问题范围稳定，未发生 scope mismatch。
- P04：该 claim 在当前证据下不能称为已知，保留 `unknown`。
- 下一动作：由人工/局部 handoff 路由到 protocol/host/security/acceptance owner，或保留 bounded
  design unknown；这不是自动 router，也不把 `unknown` 变成拒绝或 runtime gate。

### F2：局部事实存在，范围发生变化

- 假设未来在一个指定 host、指定 Binding、指定时间窗口内得到可回读的局部观察：该 host 没有在
  admission 后接受某次 Binding mutation。
- 只改变一个 scope 维度作为对照；例如只把 host 换成另一个 host，同时固定 Binding policy、版本、
  时间窗口和观察条件。不要把 host、policy、version、window 一次混合改变。
- 若把这条局部观察直接用于另一个 host，P04 可以保留“原 host/窗口内观察到的事实”，但不能自动
  给新 claim 一个已知/未知结论。
- P08：新 host 没有被证明与原问题共享范围，先标记 scope mismatch 并重新问题化；不能把范围外
  直接写成 P04 `unknown`、`false` 或 `forbidden`。
- 下一动作：恢复新 host/consumer 的对象与范围，再决定是否形成新的 claim/fixture；其他 scope
  维度应在后续独立对照中分别改变。

### F3：范围与证据都明确，但不等于接受

- 在明确的 design/host scope 内，source、fixture、观察与 review 都可回读，并支持“该 scope 内
  未观察到 mutation”的限定事实。
- P04：该限定观察在其证据范围内可称为已知/被支持；P08：它仍在指定 scope 内。
- 但该结果不推出所有 host、并发、重启、retry、采用后时间或 runtime 都满足，也不推出 protocol
  acceptance、长期 regression 或 implementation authorization。
- 下一动作：保留 claim scope、证据范围和未知，交给 named acceptance owner 决定是否接受；如要扩展
  scope，重新执行 F2 的问题化。

## 包含、排除、最近对照与反例

| 探针 | 应保持的区别 | 若失败的处置 |
| --- | --- | --- |
| 包含 | 先写清对象、host/Binding、版本、时间和 claim，再分别记录证据状态与适用范围 | 回到对象/来源，不能用一个“unknown”字段吞掉两种缺口 |
| P04 邻近排除 | 材料不足、关系未观察或 acceptance 未决定时，不把 claim 写成已知 | 路由 evidence/record/acceptance owner；不自动拒绝行动 |
| P08 邻近排除 | 新 host、版本、consumer 或时间窗口不共享原条件时，不直接复用局部结论 | 重新问题化并建立新 scope；不把 scope 外偷换成 false/unknown/forbidden |
| 最近对照 | F1 是同一范围内的 evidence insufficiency；F2 是范围变化导致的 claim transfer failure | 若两者不能改变下一路由，回修关系或返回 `no-proposal` |
| 反例 | 只给一个名称“Binding immutable”，不提供对象/host/时间/证据，或把 design source 直接写成 runtime fact | 标记概念/claim 不可恢复，回到 P04/P08 与相应 owner；不创建 scope router 或验证器 |

P05 的特殊条件、P07 的可行入口、P09 的主次关系和 P15 的实践手段仍由各自 reading/父关系拥有；
本记录只借它们作为最近邻排除，不把 P04/P08 扩成全局路由或任务策略。

最小三行对照如下：

1. 同一 scope、证据不足 → P08 保持 scope stable，P04 返回 `unknown`，下一动作是 evidence/acceptance
   handoff；
2. 同一局部证据、scope 改变 → P04 保留局部已知/被支持观察，P08 要求重新问题化，下一动作是恢复
   新对象与条件；
3. scope 与证据均明确 → 局部观察可在其范围内称为已知/被支持，但仍不等于 acceptance，下一动作是
   保留 scope/证据并交给 acceptance owner。

## 当前 standing、允许范围与未知

- P04 reading：继续 `source-current / reading-candidate / independent-review-complete / acceptance-pending`；
  本记录只为其与 P08 的区别增加 boundary observation。
- P08 reading：继续 `source-current / reading-candidate / independent-review-complete / acceptance-pending`；
  本记录不把 scope 变成能力、权限、拒答或 runtime router。
- 父 item relation：`design-boundary-observed / independent-review-complete / acceptance-pending`。
- 允许：修改本 boundary record、coverage/plan/roadmap/item-ledger projection，追加具体 source-linked
  counterexample；未来真实 host fixture 出现时另建 evidence record。
- 禁止：修改 `theory/philosophy.md`、创建 P04/P08 新 reading、创建 runtime scope mechanism、把
  hypothetical fixture 写成 behavior Run、matched、regression 或 acceptance。
- 未知：该区分在真实 Agent reading/route 任务中是否改变行为；named reading/parent acceptance owner；
  具体 host/record/evidence owner；未来 runtime claim 的实际 scope。

最小 owner matrix（当前均未命名）：

| 关系 | 需要谁作判断 | 当前 owner |
| --- | --- | --- |
| claim/design definition | 确定 immutability claim 的对象、版本和允许范围 | `claim/design owner: unknown` |
| scope/consumer boundary | 确定 host、consumer、时间窗口和 transfer 是否仍属同一问题 | `scope/consumer owner: unknown` |
| evidence/fixture | 提供可回读 source、fixture、观察和运行身份 | `evidence/fixture owner: unknown` |
| reading/parent acceptance | 按 source/reading rubric 接受或延期 P04/P08 relation | `reading/parent acceptance owner: unknown` |

## 下一 return 与证据上限

独立 reviewer `McClintock`（`01a0393c-3b3d-7932-b3da-4653254e30ce`）已只读 `ACCEPT`：确认 F1 将
同一 scope 内的 evidence insufficiency 路由到 evidence/acceptance 缺口，F2 将单一 scope 变化路由
到重新问题化，F3 没有越过 acceptance；同时确认本记录没有升级为 reading acceptance、runtime scope
机制、WorkCell authority 或 general router。当前最高 evidence standing 仍只能是
`design-boundary-observed`；没有 behavior Run、matched comparison、regression、reading acceptance
或 WorkCell protocol acceptance。

下一 return 是真实 Agent route case，或回读/形成相称的 P05/P08 同一对象 fixture；若实际任务不能
改变 claim strength、owner route 或下一动作，则本 relation 返回 `no-proposal`，不保留额外 fixture；若
source、reading definition、host scope 或 evidence contract 改变，则沿
`P → theory → reading → parent fixture → downstream design` 标记受影响投影 stale 并重开。
