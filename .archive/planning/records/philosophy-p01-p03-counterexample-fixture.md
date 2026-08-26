# P01/P03 父 item：具体成对边界 fixture

状态：`source-current / design-boundary-observed / independent-review-complete / acceptance-pending`。

本记录补充 [`philosophy-parent-review.md`](philosophy-parent-review.md) 仍缺的具体成对边界案例。
它只形成 source-linked planning fixture，不修改 `theory/philosophy.md`，不形成新的哲学条目、
reading acceptance、skill、runtime gate 或 WorkCell protocol authority。

## 1. 对象、来源与用途

| 字段 | 当前值 |
| --- | --- |
| object | 同一 WorkCell Event 观察面上的 replay-contract 判断 |
| purpose | 区分 P01 的来源/规律边界、P03 的实践—观察—下一判断关系，以及 P02/P04/P15/P16 最近邻 |
| source authority | `theory/philosophy.md` P01/P03；术语与层级由 `theory/gene-expression.md` 约束 |
| design source | `design/work-cell-protocol.md`；`planning/records/workcell-observation-lineage-review.md` |
| historical planning evidence | `planning/records/mechanism-design-review-round-1.md`，只作历史/条件性观察，不是当前协议事实 |
| current consumer | P01/P03 parent reading review 与 coverage audit |
| acceptance owner | unknown |

当前 source 允许的最小事实是：Event 有类型化观察面，但 sequence、duplicate、gap、replay 和
lineage 的具体 contract 尚未由当前协议接受；真实跨进程 replay consumer 也尚未命名。以下案例
因此标为 `design-boundary` 或 `conditional planning fixture`，不标为行为 Run 或已接受设计。

## 2. 具体成对案例

### Pair A：材料存在，但调查不足以取得规律性断言

| 维度 | A1：越界候选 | A2：相称判断 |
| --- | --- | --- |
| observed material | 当前协议有 Event 类型/观察面；C/D review 记录 sequence、duplicate、gap、replay contract 尚未定义 | 同一材料与 unknown 一起保留 |
| proposed claim | “Event 既然要跨进程使用，就必须立即新增 durable replay store、幂等键和 event bus” | “当前知道 Event 观察面存在；是否需要 replay semantics 仍 unknown，需先命名 consumer/owner” |
| why it differs | 把局部材料和未来规律混为已成立设计 | 从实际材料出发，同时不把未调查的规律写成事实 |
| nearest owner | P01 被偷换成 P02/P15 或 runtime mechanism | P01 保持来源约束；P02/P04/P15 的后续判断分别保留 |
| standing | rejected planning claim | source-backed boundary observation |

A1 不是“更积极的 P01”，而是把材料存在误当成规律成立。A2 也不等于“什么都不能做”：它
保留当前可观察事实，并把缺口交给后续 consumer/owner review。

### Pair B：有调查资格，不等于已知或已检验

| 维度 | B1：调查后过度升级 | B2：分开资格、状态与检验 |
| --- | --- | --- |
| additional condition | 一个未来 fixture 明确给出 named replay consumer、允许效果、record owner 和可观察 failure | 同样条件只作为待 review 的 contract input，不改变当前 authority |
| proposed claim | “已有 consumer，所以 replay order/idempotency 已知且协议应直接实现” | “该条件使 replay contract 值得进入 owner-backed design review；具体 order/idempotency 与 acceptance 仍待证据” |
| nearest owner | P02 的调查资格被写成 P04 的 known，或被写成 P15 的 accepted test | P02 只说明可提出相称问题/调查；P04 保留未观察关系为 unknown；P15 仍需实践检验 |
| standing | rejected overclaim | conditional design fixture |

这对案例确保“有来源/有调查”不会直接越过 P04 的 known boundary 或 P15 的 practice-test
boundary。它也不把 named consumer 这个未来条件伪写成当前事实。

### Pair C：观察改变下一实践，才是 P03 的深化

| 维度 | C1：观察改变判断与下一实践 | C2：重复观察但没有下一判断变化 |
| --- | --- | --- |
| baseline | 当前保留 observation-only 与 replay/lineage unknown | 同一 baseline |
| new observation | 一个真实、来源可回读的 consumer 使 duplicate/gap/restart 的恢复结果成为实际决策问题 | 重新读取同一 source，仍没有新 consumer、owner 或 failure relation |
| changed recognition | 从“是否需要 replay semantics 尚 unknown”改为“需要比较 observation-only 与 owner-backed replay contract” | 原判断仍为 observation-only/unknown |
| next practice | 冻结 normal/duplicate/out-of-order/gap/post-restart fixture，交给 protocol/evidence owner review | 不新增 fixture、不重跑成功 siblings；保留 unknown 或返回 no-proposal |
| P03 test | 新观察改变下一判断和行动，满足 P03 的方向性关系 | 次数增加但下一判断不变，不足以称为 P03 深化 |
| standing | conditional planning fixture；真实 evidence 未取得 | negative boundary fixture |

C1 仍不是当前 replay consumer 的事实；它只给出未来何种观察足以改变下一实践的可检验形状。
C2 防止把“又看了一遍”“又跑了一次”或文档增加当作认识深化。

### Pair D：检验手段/时点不等于下一认识改变

| 维度 | D1：错误升级 | D2：保持最近邻边界 |
| --- | --- | --- |
| observation | mechanical check 或单次 terminal observation 通过 | 同一 check 只说明该 check 的局部结果与时点 |
| claim | “所以 replay contract 已被实践证明”或“所以长期恢复不会再改变判断” | “P15/P16 的问题尚未由此关闭；仍需相称实践、时间窗口和下一判断观察” |
| relation | 把 P15 的检验手段、P16 的时点和 P03 的深化合并 | P03 看下一判断是否改变，P15 看检验手段，P16 看检验时点 |
| standing | rejected overclaim | nearest-neighbor boundary observation |

## 3. 概念与行动检验

当前临时工作指称仍是“来源—实践观察—下一判断关系”，不是新的 canonical term。移除 P01/P03
名称，只保留上述对象、source、观察和下一实践，四对案例仍能按以下路由区分：

- 材料存在但规律未调查：保留 P01 source observation，转 P02/P04/P15，而不是新增机制；
- 条件成立但关系未观察：保持 P04 unknown 与 conditional design fixture；
- 新观察改变下一判断：形成 P03 的下一 practice candidate；
- 检验通过但下一判断未改变：不升级为 P03、P15 或 P16 的 acceptance。

若未来反例显示 A/B 或 C/D 无法改变 reading 路由，父关系应回到合并/拆分判断；若实际 owner、
consumer 或 source 改变，则本 fixture 标 stale 并重建，不修改旧记录伪造连续性。

## 4. 权威、证据上限与出口

- `theory/philosophy.md` 的源行不变，`P01.md`/`P03.md`/`P04.md` 只提供当前 candidate reading，
  不取得 source authority。
- 当前 fixture 最高 standing 是 `design-boundary-observed / conditional planning fixture`；
  没有行为 Run、matched improvement、reading acceptance、protocol acceptance 或 implementation
  authorization。
- 允许后续在真实 consumer 出现后，把 C1 的条件改造成冻结 fixture；不允许现在新增 event bus、
  lineage registry、replay runtime、provider session resume 或 DeepSeek system module。
- 父 item 的 named acceptance owner 仍 unknown；本记录只能支持 coverage/parent review 回读。

## Independent review

Independent bounded reviewer: `Codex`, `2026-08-25`, verdict `accept` for this fixture-level review.

The reviewer verified that Pair A distinguishes material from established law, Pair B distinguishes
investigation eligibility from known/tested relations, Pair C distinguishes changed next practice from
repetition, and Pair D distinguishes test method, timing and changed recognition. P01 remains
source/material-oriented and P03 remains practice/observation/next-judgment-oriented. Historical and
conditional material stays explicitly non-current, and the fixture grants no WorkCell, runtime, protocol,
implementation or acceptance authority.

The reviewer did not independently read the canonical P02/P15/P16 files in this narrow review; those
distinctions are therefore retained as bounded fixture claims, not as a new complete source review.
Named acceptance owner, Agent behavior change, replay/recovery consumer, retention authority and accepted
Event/lineage contract remain unknown.
