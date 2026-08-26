# method-skill-probe round 4：A4 回归前置条件审查

状态：`source-observed / precondition-review-complete / independent-review-complete / route-to-owner /
acceptance-pending`；本记录不是
新的 Run、matched improvement、regression、skill acceptance 或实现授权。

## 1. 整体与本次贡献

本记录服务整个 planning goal `01a0370c-d215-7680-909f-6145a34dc1bf` 的 A4：在真实
planning/design case 上检查 `practice-cycle` 与 `work-estimation` 是否改变“观察结果 → 下一项
最小实践/工作图/owner route”的判断，并在相称的回归窗口内保持边界。

本次只做一个前置条件判断：已有 round 3 的结果是否足以开启下一次可归因回归，还是必须先把
runner、activation、schema 和 owner 关系补成可重建的执行契约。它不重新解释 candidate 正文，
不重复 WorkCell review，也不把 planning record 变成 eval protocol 或执行队列。

## 2. 来源与当前结果

- round 2 已记录两个 candidate 只有 `behavior-observed`，runner/model/config/workspace 未匹配，
  下一项是冻结真正的 core card，而不是继续扩写 candidate。
- round 3 的 frozen card、task、baseline、treatment 和独立 review 已存在，见
  [`method-skill-probe-round-3.md`](method-skill-probe-round-3.md) 与
  [`method-probe-round-3-practice-cycle-review.md`](../../evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md)。
- round 3 Case A 保留了“不为一步修正制造循环”的边界；Case B 出现了 baseline 的窄 owner route
  与 treatment 的较宽 `continue` 分支差异，因此有 `behavior-observed`，但不能归因给
  `practice-cycle`。
- 独立 review 已明确：两个 runner identity 不同，model/harness/workspace/权限/可见性未知，
  candidate activation 只有 self-report，baseline/treatment 的返回 schema 不一致，且没有
  adoption window 或 regression evidence。

这些观察支持“当前回归前提未成立”，不支持“candidate 无价值”或“再运行一次即可解决”。

## 3. 前置条件判定

| 前置关系 | 当前观察 | 能否支撑 round 4 | 处理 |
| --- | --- | --- | --- |
| 同一可核验 runner、model、harness、workspace identity | round 3 是两个不同内部 Agent；精确执行身份和 workspace 等仍 unknown | 否 | route 给 eval/runner owner；在未命名 owner 和可核验证据前不启动 Run |
| candidate activation proof | treatment 只有 Agent 自报加载，baseline 也没有运行时“不加载”证明 | 否 | 新 card 必须登记可回读的 activation / non-activation evidence |
| 稳定结构化 output schema | `excluded_actions` 的类型、顶层 unknown 字段命名不一致 | 否 | 新 card 固定 schema version、字段名、类型和缺失值表示；不把自然语言相似当成等价 |
| 区分性 case | Case A 是共同边界；Case B 有差异但 treatment 过宽 | 部分 | 保留 round 3 观察；新 card 将 Case B 缩到一次窄 owner/authority route 或最小 discovery |
| 独立 semantic review | Parfit 未参与生产，已完成 round 3 review | 是，但不足以补齐前四项 | 新 Run 仍需未参与生产的 reviewer；本次 review 不替代它 |
| adoption / regression window | round 3 未启用 | 否 | 只有 candidate 经匹配回归和 acceptance 后才讨论；当前保持 disabled |

结论：**当前不能诚实开启 round 4 的 matched Run。** 最小下一实践不是重跑，而是由 Main
发起 owner discovery 并接回一个有名字、能提供执行边界和证据的 eval/runner owner；实际执行
owner 仍为 unknown。若始终无法提供四项硬前提，则只关闭当前 matched-probe 分支，把
`practice-cycle` 保持为 `behavior-observed / attribution-uncertain / retain-incubation`，不靠运行
次数制造归因，也不替 acceptance owner 作决定。

## 4. 最小工作图与 owner-return

### 必要节点

1. **E0：命名执行 owner。** Main 发起并接回 runner/config/activation evidence 的 owner discovery；
   当前实际 evaluator/runner owner 仍 unknown，所以本节点先于任何新 card 或 Run。
2. **E1：重建 round card。** 以 round 3 snapshot 为 superseded source，建立新 card；固定
   同一 task/source snapshot、candidate hash、model/config、workspace、权限、schema、rubric 和
   reviewer。acceptance owner 可以继续为 `unknown`，但必须记录 acceptance-pending，不能因此
   产生 acceptance/adoption；round 3 frozen card 不回写。
3. **E2：确认 identity 与 activation。** 在 Run 前记录 baseline 不加载、treatment 只加载
   candidate 的可回读证据；不能以 Agent 自称替代 proof。
4. **E3：执行窄 case。** 只在 E0–E2 全部成立后运行 baseline/treatment；Case A 可保留为
   反过度规划反例，Case B 只观察一次窄 route/discovery 是否改变下一判断。
5. **E4：独立 review。** reviewer 只审 action、route、disposition、unknown、边界、schema
   和证据重建性，不取得修复、合并或 acceptance 权。
6. **E5：回写 standing。** Main 根据 raw output、identity、activation、schema 和 review，
   分别记录基础归因 standing（`format-valid`、`behavior-observed` 或 `matched-improvement`）、
   可并存的 qualifier（例如 `boundary-supported`、`regression-supported`）和互斥的 round
   disposition；Main 不拥有 acceptance 权，不得把 E3 的执行完成写成 candidate acceptance。

E0–E5 与 `owner-return` 是本记录提出的 planning work projection，不是已经存在的 owner
assignment、eval protocol disposition 或执行授权。runner/evaluator、reviewer 和运行契约必须
在新 Run 前可核验；acceptance owner 可以保持 `unknown`，但因此只能保持
`acceptance-pending`，不能进入 acceptance/adoption。

### 发现分支与关闭观察

- **D1：identity 不可核验。** 立即关闭本轮 matched-probe 分支，保留 round 3 的观察上限，返回
  `route / no-proposal-now`；不继续 E3。这里的 `no-proposal-now` 只关闭当前 matched 分支，
  不改变 round 3 的 `behavior-observed / attribution-uncertain / adapt-and-retest`，不改变
  candidate 的 `retain-incubation`，也不等同于 acceptance owner 的决定。
- **D2：identity 可核验但 activation proof 不可得。** 不运行 treatment；返回 eval/runner owner
  补证据，保持 `attribution-uncertain`。
- **D3：前置条件齐全但 Case B 与 baseline 不可区分。** 记录 boundary observation，停止
  candidate-specific attribution，回到 `adapt-and-retest` 或只关闭当前 matched-probe 分支的
  `no-proposal-now`；不改变 candidate incubation 或 round 3 的既有 observation standing。
- **D4：匹配运行出现真实 action/route/disposition 差异。** 只进入独立 review，不自动 adoption；
  review 之后才决定是否需要 fresh holdout 或 regression window。

### 交接契约

Main 要从 owner 收回：实际 runner/model/harness/workspace identity、activation evidence、schema
version 与样例、card/task/source hash、允许效果、失败/停止记录和下一步 owner。缺失任一承重字段时，
返回必须明确 `unknown`，不能用“同样环境”“已加载”或输出形状相似替代。

## 5. 处置与整体影响

- `practice-cycle`：继续 `.agents/skills/` incubation；round 3 保留
  `behavior-observed / attribution-uncertain / adapt-and-retest`，本记录把下一项具体化为
  owner-return，不修改 candidate。
- `work-estimation`：不另开无区分度的 round；其当前 `behavior-observed` 仍不足以声称估算准确，
  等一个真实方案比较或 discovery decision 出现后，按同一 card/identity/schema 前提单独建 probe。
- `mechanism-design-review`：不因 A4 前置审查取得新的 WorkCell 机制、registry、runtime 或
  implementation 权；其 named replay consumer / owner-backed fixture 回返保持原状。
- WorkCell、DeepSeek Harness、base/runtime 与用户 harness 构想继续冻结；本记录没有 design
  acceptance 或 implementation authorization。

## 6. Evidence standing 与复核边界

- 本记录的依据是 round 2/round 3 的 frozen artifacts、raw outputs、run identity 和独立 review；
  本记录自身是 planning-level semantic synthesis。
- 当前 standing：`source-observed / precondition-review-complete / independent-review-complete /
  route-to-owner / acceptance-pending`；没有新的行为 Run，也没有 matched、regression、adoption
  或 candidate acceptance standing。
- Main 可检查本记录是否忠实保留了 round 3 的四个硬缺口、owner 不确定性、停止条件和实现冻结；
  独立 reviewer 只需审本记录的边界与回返，不应把它当作对 candidate 的新行为评估。
- 下一 return：取得 named eval/runner owner 并形成新 frozen card；若取得不了，只把当前 matched
  分支收敛为 `no-proposal-now`，保留 round 3 的 incubation candidate、历史观察和
  `behavior-observed / attribution-uncertain / adapt-and-retest` 上限，不等同于 acceptance owner
  的决定。

## 7. 独立复核记录

- reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`），未参与本文生产；初轮
  2026-08-25 verdict 为 `needs-revision`，修订后复读 verdict 为 `accept`。
- 初轮确认 round 3 的 identity、activation、schema、Case B 和 independent review 缺口均被准确
  保留；修订集中在 E0 不得把 Main 写成实际执行 owner、E0–E5 的 projection standing，以及
  `no-proposal-now` 只关闭 matched 分支的范围。
- 复读确认 E1 允许 acceptance owner 保持 unknown 但只能是 `acceptance-pending`，E5 分开基础
  attribution standing、qualifier 与 disposition，D1/D3/下一 return 不扩大 `no-proposal-now`；
  本记录因此为 `independent-review-complete / acceptance-pending`，未取得 protocol acceptance、
  candidate acceptance 或 Principal acceptance。

## 8. 2026-08-25 E0 named eval/runner owner-surface check

本次只检查 E0 所要求的 named eval/runner owner 是否已经在当前可回读的 authority、planning 与
evaluation surface 中出现；不把 Main 的 discovery 责任写成实际执行 owner，也不把现有 reviewer 写成
runner 或 acceptance owner。

检查范围包括 `AGENTS.md`、本记录、round-3 record/manifest、skill migration ledger、evidence
maintenance review、evaluation protocol、trial ledger 与 manifests。当前没有发现能同时提供实际
runner/model/harness/workspace identity、activation/non-activation proof、统一 schema owner 和运行回返
责任的 named eval/runner owner；现有记录只明确保留了这些字段的 unknown 或 route-to-owner 状态。

因此 E0 的当前观察为 `owner-surface-checked / owner-unknown`。最小处置是 Main 发起一次 owner discovery
并等待 owner-return；不新建 card、Run、fixture 或 schema，不重跑 round 3，不进入 matched/regression/
acceptance，也不移动 candidate 或授权 WorkCell、DeepSeek、base/runtime 与实现。该处置只关闭当前
“是否已经具备 E0”判断分支，不改变 round 3 的
`behavior-observed / attribution-uncertain / adapt-and-retest`、`practice-cycle` 的
`retain-incubation` 或 acceptance-pending。

### E0 owner-return 契约

重新打开 E1 前，owner-return 至少要带回实际 runner/model/harness/workspace identity、baseline 与
treatment 的 activation/non-activation evidence、schema version/样例、card/task/source hash、允许
效果、失败/停止记录和下一步 owner。任何字段缺失都保持 `unknown`；只有这些证据回返后，才重新判断
是否值得建立新 frozen card。

本节尚未产生新的行为 evidence；它是 source-bounded planning observation。`Chandrasekhar`
（Agent `01a03956-a4e0-7711-9b9d-5ac406b69b90`，未参与生产）已独立只读复核并 `ACCEPT`，确认检查
范围限定在 checked surface、Main 未被写成执行 owner、underlying standing 未改变，且
`no-proposal-now` 只作用于当前 E0/matched branch。本节因此为
`owner-surface-checked / owner-unknown / independent-review-complete`，不新增行为、matched、
regression、acceptance 或实现 standing。
