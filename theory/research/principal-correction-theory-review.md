# Principal correction delta：独立静态二审

**Standing：** `research / independent static review`。**日期：** 2026-08-24。
本文只审查现行 `theory/harness/iterative-improvement.md` 的 Principal correction delta，
不修改 theory、候选、protocol 或 eval 记录，也不把静态证据写成行为证据。

## 总结决定

- **静态决定：`revise`（窄范围）。** 理论已经表达了大部分所需关系，但三条用户
  correction 对应的 probe 仍主要验证当前事件的 raw/owner/stale/re-evaluation，未明确
  要求在接受、采用后窗口和新 artifact 产生后检查同类 correction 的 recurrence/reopen。
  这会允许“修了当前文本”被误认为闭环已关闭。
- **行为决定：`unknown`；下一步：`adapt-and-retest`。** 文本、研究记录和 protocol
  projection 不能证明 source 被接收、worker 在 safe point 停止、stale 传播完整或
  correction 已内化。须在不倒写旧记录的前提下，增加复发/逃逸的行为探针并重测。
- **哲学序列：`no-proposal`。** 当前材料说明的是对现有任务/standing/form 的
  correction，不构成哲学序列条目的新冲撞或 P 的 source correction。

## 逐项核查

| 检查项 | 结论 | 静态证据与边界 |
|---|---|---|
| correction / 新需求 / 偏好 / 噪声区分可修订，authority 不由语气自动取得 | **Yes** | iterative theory §Principal correction（约第 41–59 行）明确四类只是可修订解释；语气、频率、Agent 自报不能取得 Principal 身份，authority 回到真实 source、委派和 owner。planning-inbox 的 explicit/inferred/unknown 与 authority 段落同向。尚不证明实际分类一致。 |
| raw → assumption delta → owner → stale → re-eval → accepted disposition 是改善理论关系，不是固定 schema | **Yes** | iterative theory 约第 61–76、162–175 行将其称为最小可重建关系，并明确 ledger 不是 exact schema；protocol 也声明它只是 theory 的 workflow projection。理论仍然要求该关系可重建，但没有把字段名或存储形式升格为普适合同。 |
| freeze 前后不倒写 | **Yes** | theory 约第 78–82 行区分 freeze 前重建 baseline/card 与 freeze 后追加 correction/stale/uncertain；`evals/skill-evaluation/protocol.md` 约第 39–41、`trial-manifest.md` 开头及 `trial-ledger.md` 开头明确旧 card/run/review/ledger 不编辑，改变规则、候选、接受者或 phase 开新 round。旧历史 standing 得到保护。 |
| stale 只传播真实依赖 | **Yes** | theory 约第 72–75、151 行要求有证据支持的边，明确“不因一条意见全局 stale”；`trial-manifest.md` 的 upstream edge list 与 ledger 的 stale/recovery entry 将影响范围、旧 snapshot、owner 和 rerun 分开记录。实际影响图的完整性仍 unknown。 |
| live worker safe point 不假装 runtime | **Yes** | theory 约第 153–160 行只要求下一合理运行机会重新基线化、保留旧锚点或回返 owner，明确 safe point 不是自动停止/取消；取消、持久化、并发、恢复、事务和外部效果归 runtime/base。planning-inbox 同样声明没有唤醒、exactly-once、claim、crash recovery 等保证。行为是否做到仍 unknown。 |
| escape / recurrence / latency / stale coverage / 误分类 / 负担是 workflow outcome，有窗口、分母、成本边界且不组成总分 | **部分 Yes；分母/暴露量需补强** | theory 约第 84–92、177–179、181–185 行区分 outcome/process/balancing cost、按对象与观察窗口记录 correction 指标，并禁止全局总分；acceptance card 有 cost budget、adoption window 和 fresh-holdout 关系。可是 theory 本身没有明确要求每个比例指标声明 numerator、denominator、exposure、观察起止和未观测量。open-source research 已提出该边界，但 protocol 的 adoption-window 也只提供任务范围/窗口字段。属于非阻塞的 workflow/protocol 补强，不应新增理论 schema。 |
| correction 不默认修 theory 或默认采纳 | **Yes** | theory 约第 52、74–76、142–149、166–175 行明确 correction 不自动改 theory/skill/runtime/acceptance；合法处置含改判、拒绝、hold、`retain-baseline`、`adapt-and-retest`、`uncertain`，Principal/明确接受者仍拥有采用权。 |
| 三条用户 correction probe 检查 recurrence，而不只修当前文本 | **No（本轮主要 blocking gap）** | theory probes 15–17（约第 207–209 行）分别检查 raw 重建、candidate/record standing、canonical form/path 的 stale 与重评估；它们没有明确重复进入接受/采用后窗口，再检查同一 root object/assumption 或等价 correction 是否 reopen/escape。第 179 行虽列 recurrence 指标，第 201–203 行及 open-source research 的 escape/recurrence probe 也提供方向，但没有把三条已知 correction 的 probe 与该后续时点绑定。 |
| 是否需要修改哲学序列 | **No-proposal** | 本 delta 修订的是 source standing、owner、form、workflow 和 live boundary；没有证据显示 P 的哲学冲撞、定义或唯一生成权发生变化。若未来跨环境反复出现改变 P 冲撞解释的证据，才按理论修订纪律另行提出。 |
| 普通 skill 用户不回读 P/theory | **Yes** | theory 约第 151 行明确普通 skill 使用者只消费已内化方法；planning-inbox 开头、protocol 约第 13–15 行进一步区分普通使用与维护/诊断/再生追溯。它不把运行时回读义务偷偷放给普通 skill。 |

## 证据链与 standing 对齐

### Theory 与 planning-inbox

现行 theory 已把 correction 限定为来源有界的 candidate，而不是任意 feedback token；
保留 raw/source/revision，承认同一消息的多种解释，要求最小 owner、真实依赖 stale、
重新评估和接受者处置。planning-inbox 提供相容的 raw-first、explicit/inferred/unknown、
authority、hold、safe point、handoff 和普通使用边界；它没有把 receipt、triage 或
Agent 解释提升为 acceptance。

这两份 living theory 的静态语义是可接受的：它们表达判断关系和边界，不要求每个项目
使用固定字段、文件或后台机制。`P → theory → skill/fixture/rubric/旧结论` 的传播也
被区分为实际可证明的依赖，未变成全局广播。

### Protocol / manifest / ledger

当前 `evals/skill-evaluation/` projection 与 theory 的边界一致：

- `protocol.md` 把 manifest 定位为 treatment 前 core card，把 ledger 定位为 freeze 后
  append-only projection；普通 skill 用户不回读 P/theory/protocol。
- `trial-manifest.md` 将 phase applicability、cost、adoption window、stale/recovery、
  upstream edge、freeze event 和 snapshot hash 分开，允许低风险裁剪并要求记录裁剪理由。
- `trial-ledger.md` 追加 run、污染、outcome/process/cost、review、互斥 disposition 和
  stale/recovery/rerun；它明确 hash、历史、接受和 runtime 语义不能由 prose 创造。

这些载体支持 freeze 前后的历史分离和多维 standing，但没有在现有模板中专门形成
Principal correction recurrence 的 mandatory module。因为 theory 已将指标交给相称
protocol，当前应作最小 projection 补强而不是把 schema 写回 theory；若不补，行为
验证仍只能 `unknown`。

## Blocking 与 non-blocking

### Blocking：三类 correction 的后续 recurrence 闭环未被 probe 明确覆盖

需要在现有 probes 15–17 或一个相邻的 cross-probe 中加入同一时序：

```text
raw correction
  → disposition / Principal acceptance
  → 新 baseline 或 accepted artifact
  → adoption/观察窗口
  → 同一 root object、等价语义或下游复现
  → recurrence / reopen / escape 判断
```

必须区分真实 recurrence 与新需求、偏好、独立新缺陷和噪声；若没有新的运行机会，
结果只能是 `not rechecked`/`unknown`。该缺口是 blocking 的理由不是因为需要新 runtime，
而是因为“已形成 correction 关系”尚未有办法证明它改变了后续闭环；静态 theory 的
单次 stale/re-eval 关系不足以支持 adopt 或 convergence。

### Non-blocking：指标分母、暴露量和成本记录需在 workflow 侧明示

应在未来启用 `adoption-window` 或 correction workflow 的 card/ledger projection 中，
为 rate/latency/coverage 指标写明：观察对象与暴露集、numerator/denominator、窗口起止、
未观测/丢失事件、时间/运行次数以及 token/协调/人工审查/外部效果成本。它不应变成
总分，也不应要求低风险 trial 复制巨型 schema；未启用时保留裁剪理由并报告 `N/A` 或
`unknown`。当前 theory 已有“对象与观察窗口”“cost/balancing cost”“不合成总分”的
语义，故这是可在 projection/probe 中完成的非阻塞精化。

## 最小修订建议（不写入本轮其他文件）

1. 保留现有 correction 分类、authority、raw-first、owner、stale、freeze、safe point、
   disposition 和 ordinary-skill 边界，不改哲学序列，不新增固定字段或默认 runtime。
2. 为 probes 15–17 增加“接受/拒绝/改判后，在相称 adoption window 或新 artifact 中重复
   检查”的语义条件；至少记录 recurrence、reopen、escape、未复查和新需求/偏好/噪声
   改判的区别。
3. 在 protocol projection 的相称模块补足 ratio 的 denominator/exposure/window/cost
   边界；不得将这些指标压成单一 quality score，也不得倒写旧 round。
4. 新 probe 通过前不把当前 correction delta 标为行为有效；下一次结果应返回
   `adapt-and-retest` 或 `uncertain`，而非因为文本完整而 `adopt`。

## 最终边界

本审查支持的只是静态关系：理论把 Principal correction 从普通反馈中分离，阻止自动
改 theory/默认采纳，维护 freeze 前后历史，按实际依赖传播 stale，并把 safe point 与
runtime 硬保证分开。它不证明 correction 已被收到、已由正确 owner 接受、旧 worker 已
停止、下游已完全重评、采用后没有 recurrence，或普通 skill 已在运行中正确行动。
