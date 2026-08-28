# Principal correction projection：静态复核

**复核对象：** `evals/skill-evaluation/protocol.md`、`trial-manifest.md`、`trial-ledger.md`

**对照来源：** `theory/harness/iterative-improvement.md` 与
`theory/research/principal-correction-theory-review-round-2.md`。

**Standing：** 本文是静态 projection review；静态文本、模板完成度和字段存在不能证明
实际 worker、暴露记录、复发发现或接受流程已经正确运行。

## 总决定

- **静态 projection：`accept`。** Principal correction 被表达为按事件启用的可选
  projection，并保留了来源、authority、可修订解释、依赖传播、重新评估和 Principal
  acceptance 的关系；没有把它升级为普通 trial 的 baseline/treatment 强制 phase。
- **行为：`unknown`；后续：`adapt-and-retest`。** 当前材料没有运行证据证明真实
  exposure/observed set、safe point、stale/re-evaluation 或 recurrence/reopen 在实际
  worker 中闭合。因此静态接受不能升级为 `adopt`、`matched-improvement` 或“未复发”。
- **Blocking：静态无。** 所列 Principal correction projection 的必要语义边界均已在
  三份载体中有对应表达。
- **Non-blocking：** 建议后续明确低风险普通 trial 如何按风险裁剪 core card 的通用字段。
  当前已正确避免强制 correction/adoption-window 巨型模块，但 core card 本身仍是较宽的
  固定模板；这不阻塞本次 correction projection 的静态接受，需在行为试验或 protocol
  操作化时验证是否造成不必要负担。

## 逐项核对

| 复核项 | 结论 | 证据与边界 |
|---|---|---|
| 普通 trial 不被 correction 巨型 schema 强制 | **Yes** | `protocol.md:43-61` 将条件模块与 core contract 分开，并明确 `principal-correction` 按事件启用；`trial-manifest.md:129-133` 与 `trial-ledger.md:20-25` 均写明普通 trial 不填写。普通 `adoption-window` 也不要求 correction entry（`trial-ledger.md:41-45`）。 |
| correction 可追加 | **Yes** | `protocol.md:100-103` 要求新认识通过 ledger 追加；`trial-ledger.md:20-25` 规定 freeze 后实际收到 correction 时追加 entry。 |
| freeze 后不倒写 | **Yes** | `protocol.md:39-41、98-103`；`trial-manifest.md:3-6、82-88、131-133`；`trial-ledger.md:3-5、22-25、126-133` 均保留 snapshot、旧 entry 和新 round/rerun 血统。 |
| raw/source revision/authority | **Yes** | `trial-ledger.md:27-30` 要求 raw artifact/path/hash、source revision、上下文、authority，无法核验写 `unknown`；`protocol.md:105-112` 将其列为返回的重建关系。 |
| 可修订分类与 authority 边界 | **Yes** | ledger 明列 `correction`、`new-requirement`、`preference`、`noise`、`unknown`，同时规定分类不是固定分类器，Agent/reviewer 不能自授 authority（`trial-ledger.md:28-30`）；与 theory 的可修订解释边界一致（`iterative-improvement.md:47-59`）。 |
| assumption delta/最小 owner | **Yes** | `trial-ledger.md:31-35` 记录指向对象、assumption delta、未改变的 baseline、最小 owner 和 routing history；manifest 在冻结前记录 correction workflow 的 owner 与责任（`trial-manifest.md:135-139`）。 |
| 实际 stale / re-evaluation | **Yes** | ledger 要求实际依赖 edge、受影响 artifact/snapshot/phase、stale 范围及不受影响边的理由，并记录 re-evaluation/review/rerun 与 owner（`trial-ledger.md:33-35`）；这符合 theory 只沿可证明依赖传播的限制（`iterative-improvement.md:72-82、151`）。 |
| Principal acceptance | **Yes** | `trial-ledger.md:32、36-39` 分开记录 Principal/明确受托接受者及权限与 accepted disposition，并明确 review/receipt 不能冒充 acceptance；`trial-manifest.md:135-139` 也不把 reviewer 提议当接受。 |
| adoption window 的冻结边界 | **Yes** | `trial-manifest.md:107-114、140-141` 冻结观察对象、窗口、exposure 范围/纳入排除规则和 owner；结果集合不回写 card。 |
| exposed/observed set 与未复查 | **Yes** | `trial-ledger.md:47-50` 要求实际 `exposed set`、`observed set`、未暴露/丢失/未复查集合及原因；`protocol.md:105-110` 将其列入最终可重建返回。 |
| escape、recurrence/reopen 与改判 | **Yes** | `trial-ledger.md:50-52` 要求 correction escape、recurrence/reopen、等价复现，以及与新需求/偏好/噪声/unknown 的改判；没有把即时修复冒充后续复查。 |
| 分子/分母与 balancing cost | **Yes** | ledger 按指标记录定义、numerator、denominator、暴露范围和窗口（`trial-ledger.md:51-53`），另记实际时间/token/等待/协调/维护/必要外部成本（`:53`）；protocol 返回关系也明确包含分子/分母与 balancing cost（`protocol.md:107-110`）。 |
| 零 exposure 不等于零复发 | **Yes** | `trial-ledger.md:51-52、56-57` 与 `protocol.md:109-112` 明确无真实 exposure、零观察或空集合时写 `unknown`，不得解释为零 escape/recurrence。 |
| 不引入 runtime/telemetry 保证 | **Yes** | `trial-ledger.md:56-57` 明确不提供 telemetry、唤醒、取消、持久化、exactly-once 或回滚保证；`protocol.md:111-112` 要求无机制时写 `unknown`。这与 theory 的 safe point/runtime boundary（`iterative-improvement.md:153-160`）一致。 |
| 无全局阈值/总分 | **Yes** | `trial-ledger.md:56-57` 将 escape、recurrence/reopen、latency、coverage、误分类和负担分开；`protocol.md:93-96、100-112` 与 manifest `:51` 保留对象级 card 关系，不设全局 threshold 或 total score。 |

## 结构与关系判断

projection 保留 protocol 的原有主结构：冻结前 `core card`、条件模块、匹配与污染、standing、
停止/历史/返回；Principal correction 作为按事件启用的附加 projection 插入，而不是改写
baseline/treatment、run output、independent review 或互斥 disposition 的含义。`trial-manifest`
把冻结承诺留在 card，`trial-ledger` 把 freeze 后事件、观察和恢复留在追加记录，形成了
theory 所要求的 `raw correction → assumption delta → 最小 owner → stale impact →
re-evaluation → accepted disposition` 关系，而没有把 research review 直接提升为 theory、
runtime 或 Principal acceptance。

需要保留的行为上限是：若没有真实采用后运行或暴露机会，只能返回“未复查/`unknown`”；若
匹配、独立性、记录机制或输出可重建性不足，也只能降级为行为观察或 `uncertain`。这与二审
研究的决定（`principal-correction-theory-review-round-2.md:7-19、81-88`）一致。

## 后续验证建议

下一轮应使用隔离行为试验覆盖：

1. freeze 前与 freeze 后 correction 各至少一例，确认旧 card/run/review/entry 不被倒写，且
   改变对象、规则、接受者或 phase applicability 时开启新 round；
2. accepted correction 进入新 baseline 或 downstream artifact 后，分别观察真实暴露、
   等价复现、escape、recurrence/reopen 和改判，验证 observed/exposed set 与未复查原因；
3. 构造零 exposure、丢失 observation、不可核验 authority/stale edge 和缺失 runtime 机制，
   确认结果是 `unknown`/`uncertain`，而不是零复发、全局 stale、runtime 保证或总分结论。

这些是行为验证要求，不是本次静态 projection 的新增全局门槛。

## Main 综合处置

**处置：静态 `accept`；行为 `unknown / adapt-and-retest`。** Main 接受 correction
projection 与 living theory 的对应关系；不再为本轮静态问题扩展模板。低风险 core card
的裁剪负担保留为 protocol workflow 的非阻塞观察项，只有实际试验显示它妨碍运行或判断时
再修订，不能因模板较长预先扩大本轮范围。
