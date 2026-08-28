---
kind: review-record
id: principal-correction-theory-review-round-2
status: settled
disposition: static-accept-adapt-and-retest
---

# Principal correction delta：静态二审第二轮

**Standing：** `research / independent static review`。**日期：** 2026-08-24。
本文只复核上一轮 review 指出的 recurrence blocking，不修改 living theory 或其他文件。
静态文本、probe 或研究记录都不构成行为有效性证据。

## 决定

- **静态理论：`accept`。** 上一轮唯一 blocking 已由 probe 18 足够关闭：它把
  accepted disposition、新 baseline/下游 artifact、采用后观察窗口或下一次真实暴露、
  语义等价 correction/同一根因重放，以及 escape/recurrence/reopen 区分连成可证伪
  时序；无采用后运行或真实暴露时强制返回 `未复查/unknown`，不把零观察当零复发。
- **行为：`unknown`；行为后续：`adapt-and-retest`。** 当前没有运行证据证明实际暴露
  集合被正确记录、复发被发现、worker 遵守 safe point 或 stale/re-evaluation 真实闭合。
- **blocking：** 静态 blocking 项为无。行为采用仍受真实 exposure、窗口、记录和重测
  结果阻塞，不能由本次静态接受转成 `adopt`。
- **non-blocking：** rate/latency/coverage 的具体分子、分母、暴露量、窗口和成本可在
  相称 protocol projection 中进一步操作化；probe 18 已把“实际暴露集合和未复查”提升
  为必要观察边界，不需要把这些细节写成 living theory 的固定 schema。

## 上一轮 blocking 的逐项复核

| 要求 | 结论 | 证据与上限 |
|---|---|---|
| 接受/采用后窗口 | **Yes** | `theory/harness/iterative-improvement.md:97` 将 adoption window 放入 freeze 前 acceptance card；`:183` 要求按该窗口观察；新增 probe 18（`:210`）在 accepted disposition 且新 baseline/下游 artifact 之后进入风险确定的窗口或下一次真实暴露机会。窗口仍是对象/风险关系，不是全局期限。 |
| 真实暴露集合 | **Yes** | probe 18 明确要求按“实际暴露集合”报告观察范围、复发和未复查；没有暴露机会只能报告 `未复查/unknown`。这阻止把没有流量、没有运行或没有可回读事件误报为零 recurrence。它仍不创造 telemetry。 |
| correction escape | **Yes（静态可检验）** | probe 18 要求在 accepted correction 进入新 baseline/下游 artifact 后重放语义等价修正或观察同一根因，并区分 correction escape；`:179` 还把采用后逃逸列为 workflow outcome。行为 escape rate 仍 unknown。 |
| recurrence / reopen | **Yes（静态可检验）** | probe 18 明确写出 `recurrence/reopen`，并要求与新需求、偏好、噪声/unknown 区分；`:179` 将 recurrence/reopen 列为按对象和观察窗口记录的 workflow 指标。尚没有真实重复事件数据。 |
| 无暴露时 unknown | **Yes** | probe 18 的末句是明确的负证据边界：无采用后运行或暴露机会时只能“未复查/unknown”，不能把零观察当零复发；这与 P04 和 theory `:185` 的未知纪律一致。 |

## 完整边界复核

### 没有把 probe 18 变成固定 schema

理论仍将 falsification probes 定义为“待检验的行为问题，不是固定 protocol”（约
`:191`），并在 evidence ledger 段落声明它不是 exact schema（约 `:164`）。probe 18
规定的是语义时序和最低证据上限：何时才有资格问 recurrence、需观察什么、无暴露如何
降级；它没有规定字段名、数据库、事件格式、scheduler 或统一数值阈值。因此没有把
living theory 偷换成 manifest/ledger 模板。

### 没有引入 runtime 保证

live correction 段落仍明确 safe point 不是自动停止或取消，且取消、持久化、并发 claim、
恢复、事务和外部副作用属于 runtime/base（约 `:153–160`）。probe 18 的“下一次真实
暴露机会”是观察条件，不是唤醒保证；“重放”是候选实验动作，不是 exactly-once、撤销、
补偿事务或外部写入回滚的声明。没有运行机会就 `unknown`，正好保持了边界。

### 没有引入全局门槛

采用后窗口、暴露集合、重放时点和观察范围均按对象风险确定；理论仍否定固定轮数、
Agent 数、阈值或一致同意门槛（约 `:181–185`）。probe 18 不把 recurrence rate、
escape rate、stale coverage 或负担加成总分；`:179` 仍要求 outcome、process 和
balancing cost 分开，指标不能替代 outcome。

### 未倒写 freeze 前后关系

correction 段落仍要求 freeze 前重建 baseline/card，freeze 后追加 correction/stale/
uncertain 与恢复关系，不能改写 card/run/review/ledger（约 `:78–82`）。probe 18 要求
新 baseline 或新下游 artifact 后再观察；它没有把采用后观察倒写进原 acceptance card，
也没有将旧结论伪装成使用了新 correction 的历史证据。

### 未改变 source、owner 或普通 skill 边界

classification 仍是可修订解释，authority 不由语气、频率或 Agent 自报取得（约 `:41–59`）；
接受 correction 仍不默认修 theory，路由先到最小 owner（约 `:72–76、140–149`）。P 仍是
哲学序列的唯一理论生成源，当前 probe 只是对 task/standing/workflow 的补充检验，不是
哲学序列修改候选。普通 skill 使用者仍只消费已内化方法，不承担回读 P/theory 的义务
（约 `:151`）。

## evidence standing 与残余未知

### 当前可以接受的静态主张

1. Principal correction 可以在理论中作为来源有界、可修订解释的改进输入处理，而不被
   自动等同为新需求、偏好、噪声或 theory change。
2. raw、assumption delta、最小 owner、真实依赖 stale、re-evaluation、accepted
   disposition 仍是关系表达，不是固定实现 schema。
3. freeze 前后历史分离、实际依赖传播、safe-point 方法边界、采用后窗口和真实暴露
   观察现在有明确的可证伪 probe；probe 18 已补足 recurrence/escape 的后续时点。

### 仍不能主张的行为事实

- 没有证据证明 Principal 身份、分类或 owner routing 在实际输入上稳定正确；
- 没有证据证明新 baseline 后确有可观测 adoption window 或完整 exposure set；
- 没有证据证明 correction escape、recurrence/reopen、误分类、stale coverage 或
  latency 已改善；
- 没有 runtime 证据证明 live worker 会收到、暂停、取消、持久化、恢复或避免重复副作用；
- 没有行为证据支持 `matched-improvement`、`adopt`、收敛或“未复发”。

## 非阻塞建议与下一步

未来 protocol/eval projection 可在启用 adoption-window 或 correction workflow 时，按
风险记录观察对象、实际暴露集合、窗口起止、分子/分母、缺失观测、重复暴露、人工/运行
成本和未复查原因；低风险对象仍可裁剪并说明理由，不应复制巨型 schema，也不应组成
质量总分。下一轮行为测试应以三类真实 correction 各至少经历一次 accepted/改判、
新 baseline 或下游 artifact、窗口/暴露观察，并把无暴露明确记为 `unknown`。

本轮因此不提出 living theory 继续修订；若上述行为测试失败，应依据失败归属路由到
workflow、fixture、skill 或 runtime/base，而不是以单个失败自动改哲学序列或 theory。

## Main 综合处置

**处置：静态 `accept`；行为 `unknown / adapt-and-retest`。** Main 接受本轮对
living theory 的静态复核：上一轮 blocking 已关闭，不再因这一项继续改理论或哲学序列。
这项处置不是 Principal acceptance，也不证明 correction workflow 已改善；后续先把最小
correction、暴露集合与采用后复查关系投影到 protocol，再用隔离行为试验决定保留、修订或回退。
