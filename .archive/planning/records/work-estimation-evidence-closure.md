# 现有 mechanism round 的 evidence drift 检测与历史 ledger closure 工作估计

状态：`source-observed / drift-detection-scoped / independent-review-complete / acceptance-pending`；不是资源报价、
新 Run、接受决定或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 当前状态与要改变的决定

当前已有 `mechanism-design-review / round-1` 的冻结 card、baseline/treatment 输出和独立 semantic
review，但 [`evals/skill-evaluation/trial-ledger.md`](../../evals/skill-evaluation/trial-ledger.md) 还没有
这个 round 的 post-freeze record。当前还检测到三个 upstream WorkCell source 相对 frozen card
发生 hash drift。因此决定不是“当前适用性已闭合”，而是：**能否在不改写旧 card、Run 或 review 的
前提下，记录历史 round 的可回读 standing，并追加 source stale/recovery 关系。**

目标状态是：ledger 能引用 frozen card、两次输出、隔离限制、outcome/process/balancing、review、
历史 round disposition 和未知，并追加 source drift/recovery entry；planning projection 能明确这只是
`behavior-observed / boundary-supported / attribution-unknown` 的历史记录，当前 source applicability
保持 `stale/uncertain`，不进入 matched、acceptance、adoption 或 WorkCell/runtime 实现。

当前 owner：eval/ledger owner `unknown`；candidate owner 是 project-local skill owner `unknown`；
Main 只做 bounded projection 和 evidence closure，不取得 Principal acceptance。

## 2. 为什么选择这条 branch

候选 branch 的最小比较如下：

| branch | 当前缺口 | 最小改变是否可在当前工作树完成 | 若现在继续投入的主要风险 |
| --- | --- | --- | --- |
| A4 `practice-cycle` 新 Run | runner/model/harness/workspace identity、activation proof、统一 schema 和 named owner 均不足 | 否；只能做 owner-return，不能诚实启动 matched Run | 重复运行制造伪归因 |
| B1/B2 P01/P03 reading | fixture 已完成，父关系 review 已完成；named acceptance owner 仍 unknown | 只能补接受前提，不能取得 reading acceptance | 把更多反例/文档数量误当作接受进展 |
| F2 mechanism round evidence closure | card、Run、review 和 frozen/current source hash 可回读，但 upstream drift 必须先记录 | 是；可完成历史 record + stale/recovery，不需网络、模型调用或工作区 effect | 把历史 record 误写成 current applicability、行为或接受结论 |

因此选 F2。它能关闭“已有 Run 但 ledger/source applicability 未闭合”的 evidence-maintenance unknown，
同时把 drift 保留下来；A4 和 B1/B2 保留原 return condition，不被本次工作估计吞并。

## 3. 最小必要工作图

| 节点 | 必要改变 | 依赖 | 接受观察 |
| --- | --- | --- | --- |
| E0 source/edge inventory | 固定 card、candidate、task、baseline、treatment、review 和 planning record 的路径/hash | 当前 protocol、冻结 manifest、现有 Run/review | 每条承重 edge 可回读；hash 不靠意图补齐 |
| E1 source drift check | 比较 frozen card 的 upstream hash 与当前 source，并将 drift 的影响标为 `stale/uncertain` | E0 | 不把当前 source 偷换成 Run 时 source；旧 artifact 保留 |
| E2 historical ledger record | 追加 freeze/run/isolation/outcome/process/balancing/review/disposition record；不编辑旧 card、Run 或 review | E0、E1、ledger contract | 历史 round 可重建；缺失字段和 append mechanism 明确写 `unknown` |
| E3 stale/recovery projection | 追加 drift/recovery relation，指定受影响 source、standing 和未来新 round 条件 | E1、E2 | current applicability 不再被写成已闭合；旧结论与未来 round 分开 |
| E4 planning projection sync | 将历史 closure、drift、standing、处置和下一 return 同步到 planning projections | E2、E3 | plan/roadmap/item-ledger/evidence-maintenance 的处置一致 |
| E5 independent review | 由未参与本轮 closure 生产的 reviewer 检查 scope、hash、standing 和边界 | E2、E3、E4 | reviewer 接受记录忠实性，但不代替 Principal acceptance |

## 4. 发现分支与停止观察

- **D1 hash/edge drift：** 本轮已实际发生；标为 stale/uncertain，保留旧 artifact，追加 recovery
  relation，不把 F2 写成 current applicability closure；必要时由 eval owner 开新 round。
- **D2 runner 或 activation 不可核验：** 仍可完成历史 record，但基础归因最高保持
  `behavior-observed`，不写 `matched-improvement`。
- **D3 ledger contract 缺字段：** 在 entry 中写 `unknown` 并 route 给 protocol/ledger owner；不
  通过扩写 prose 创造 append-only、不可变或可重放保证。
- **D4 历史 record 完成但 acceptance owner 仍 unknown：** 保持 `acceptance-unknown`，旧 round
  disposition 继续 `adapt-and-retest`；不启动新 Run，不进入 adopt。

若 E0/E1 发现当前 card 或输出无法建立同一 round 的历史 source edge，则关闭本次 record branch，保留
`run-exists-ledger-entry-missing / source-applicability-uncertain / acceptance-unknown`，不把“记录失败”
写成 trial 失败。

## 5. 粒度、明确省略与证据上限

当前决策只需要“是否能记录已有 round、是否发现 source drift、以及下一步是否继续 adapt-and-retest”的粒度；不需要
token、时间、金钱、P50/P80/P95、executor capacity 或运行成本预测。省略新 Run、fresh holdout、
adoption window、regression、provider comparison、WorkCell protocol 变更和任何实现。

本估计的证据 standing 只有 `source-observed / drift-detection-scoped`。工作图完整不表示工作已执行，
历史 ledger record 也不表示 current applicability、candidate 行为或 acceptance 已成立。

## 6. 下一 owner 与 return

本轮由 Main 完成 E0–E5 的 bounded record；独立 reviewer 只审历史 record 和 drift projection 的
忠实性。后续由 eval/ledger owner 决定是否补 full runner/model/harness/workspace identity、activation /
non-activation proof、protocol/record-retention owner、acceptance owner、匹配条件和新 card；由
candidate/Principal owner 决定是否接受或继续 `adapt-and-retest`。若这些 owner 仍 unknown，保持当前
standing，不把缺口转换成新的实现任务。

## 7. Independent review

reviewer：`Lagrange`（Agent `01a0388c-2464-7191-b316-3315649d9228`），未参与本记录生产，未修改文件，
未运行评估。初轮指出 source drift 必须阻止 current applicability closure，且 owner-return 需明确
full runtime identity、activation proof、protocol/record-retention/acceptance owner；修订后接受。
当前 standing 仍只是 work-estimation / drift-detection record，不是资源估算准确性、行为改善或接受。
