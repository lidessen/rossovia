# P15 practice use-case：planning/design round-3 的主张检验

状态：`use-case-candidate / source-bound / independent-review-complete / acceptance-pending`；本记录不是
P15 哲学源行、P15 reading acceptance、practice-cycle acceptance、WorkCell acceptance、eval Run 或实现授权。

## 1. 目的与来源

P15 reading candidate 已有一个真实的 planning/design consumer，但此前主要以“存在 consumer”描述，尚未
把它收窄成一个足以区分 P04、P08、P03 和 P16 的具体 use case。本记录只把已经完成的 round-3 观察重新
组织成一个 source-bound use case；不新增实践、不重跑、不修改 frozen card/task/candidate。

来源关系如下：

- **哲学源：** [`theory/philosophy.md`](../../theory/philosophy.md) 的 `P15｜实践是检验真理的唯一标准｜解决·检验·手段`；源行不变。
- **reading candidate：** [`theory/philosophy/P15.md`](../../theory/philosophy/P15.md)；它拥有当前 P15 的候选解释，
  不是新的哲学源。
- **实际实践：** [`method-skill-probe-round-3.md`](method-skill-probe-round-3.md) 的 Case B；其冻结 card、
  task、baseline/treatment、runner identity 和 review 由该 round 及其 eval records 拥有。
- **独立行为 review：** [`method-probe-round-3-practice-cycle-review.md`](../../evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md)；
  它把当前证据上限定为 `behavior-observed / attribution-uncertain`。

## 2. Use-case contract

| 关系 | 当前有界表达 |
| --- | --- |
| use-case id | `P15-U1-planning-practice-standing` |
| 对象 | WorkCell field-boundary planning/design case 中，一个关于“下一项行动/route/disposition 应如何选择”的候选主张 |
| 待检验主张 | 在对象、范围和当前未知已经指认后，一次相称实践的结果可以改变下一行动或主张 standing；改变必须能回到具体观察、范围和归因限制 |
| 实践 | round-3 Case B 的 baseline/treatment：两组都处理同一 planning/design task；baseline 选择较窄的 owner/authority discovery 并 `route`，treatment 选择 `continue` 并扩大 discovery relation map |
| 可观察结果 | 下一 action 与 disposition 出现差异；两组都保留 owner、canonical shape、host、adapter、acceptance unknown，并拒绝补 schema、建 registry、执行 host Run 或启动实现 |
| 当前更新 | 只把“实践结果会改变下一判断”记为局部 `behavior-observed`；由于 runner、model、harness、workspace、权限、activation 和 output schema 未完全核验，归因保持 `attribution-uncertain`，不判定哪一 arm 更好 |
| 允许效果 | 更新本 use case 的 evidence standing、边界和下一 review/route；不修改哲学源、WorkCell canonical、运行时、接受关系或任何外部效果 |
| 失败/反观察 | 若差异只来自未控制的 runner/role/schema，或实践结果不能改变主张 standing、下一 action 或 owner route，则 P15 专属区别不足，应回修 candidate 或返回 `no-proposal` |

## 3. 成对边界

### U1-A：一步修正的负触发

round-3 Case A 是确定性的一步文档修正。baseline 与 treatment 都选择直接交给既有 owner 完成单行替换并运行
`git diff --check`，但该修正和检查在该 case 中未实际执行；两组都拒绝制造 practice-cycle、discovery branch
或更大计划。

它的作用不是证明 P15 已通过，而是给出 P15 的负边界：一次可逆、不会改变后续判断的修正，不因
“有执行”就自动形成 P15 use case、循环或新的 evidence item。

### U1-B：结果改变下一判断的正触发

Case B 的观察使下一步不再只是“继续写协议或立即实现”的二选一，而显露了 owner/authority discovery
的粒度和 route/continue 的差异。这里的正触发是：实践结果改变了下一行动或 disposition，使当前
主张必须保留更窄或更宽的 standing；不是 treatment 的 discovery 更宽，所以 treatment 更正确。

### U1-C：最接近的非实例

P04/P15/P16 boundary review 中的 B1–B4 仍是 hypothetical Binding fixture，没有真实 host practice；
它们可以检验知识状态、检验手段和时点覆盖之间的设计边界，但不构成 P15-U1 的行为 evidence。

## 4. 最近邻与责任分界

| 最近邻 | 它在 U1 中拥有的关系 | P15-U1 不推出 |
| --- | --- | --- |
| P04 | 区分当前对象/证据状态中可以称为已知的部分与必须保留的未知；U1 的未核验关系只能作为证据边界被保留 | 不把未知变成拒答、停止或接受门；`attribution-uncertain` 的具体来源属于 round-3 的 evidence/attribution limitation，不是 P04 自身的结论 |
| P08 | 限定 Case B 的具体 planning/design 对象与 scope，阻止 discovery map 外推成全局协议 | 不把一次局部结果扩张成所有任务的适用性 |
| P03 | 说明观察如何回到下一认识/实践，且下一 action 必须真的改变 | 不拥有“什么实践才检验主张”的具体手段或最终接受 |
| P16 | 指出本 use case 没有开始/执行中/结束/采用后完整时间窗口 | 不把一次 round 写成长期稳定或 adoption regression |
| semantic review / acceptance | 检查 evidence 是否忠实、决定是否接受 reading 或 use case | P15 不拥有独立 review、Principal acceptance 或 adoption 权 |

## 5. 证据上限与省略

当前可以成立：

- P15 source line、reading candidate、实际 round-3 consumer 和 U1 的对象/实践/观察可互相回指；
- U1 同时保留正触发（Case B）和负触发（Case A）；
- 观察支持 `behavior-observed / attribution-uncertain`，并说明为何不能把 route/continue 差异归因给
  `practice-cycle` 或判定 treatment 更优。

当前不能成立：

- P15 reading truth、P15 reading acceptance、`matched-improvement`、`regression-supported` 或 portable move；
- “实践执行成功就是真理”“重复运行次数等于收敛”或“有 review 就等于 acceptance”；
- P16 的 adoption/time-window evidence、WorkCell protocol acceptance、DeepSeek Harness 设计接受或任何实现授权。

本记录明确省略新的 P15 Run、synthetic host fixture、固定测试数量、自动 gate、validator、retry、runtime
mechanism 和 provider comparison；它们不会在当前 owner/identity/acceptance 缺口下改变 U1 的 standing。

## 6. Review 出口与下一 return

独立 reviewer 应检查：

1. U1 的实践、观察和 standing 都能回到现有 round-3 evidence，而不是由本记录制造；
2. Case A 确实排除“所有执行都需要 P15 cycle”，Case B 确实保留 action/disposition 差异；
3. P04/P08/P03/P16 的边界会改变 U1 的解释或处置，且没有把它们重写成 P15；
4. `behavior-observed / attribution-uncertain` 没有被提升成 matched、acceptance 或长期回归；
5. use case 的接受仍交给明确的 reading/use-case owner，而不是 reviewer、Main 或本记录。

若 review 通过，U1 的 standing 仍为 `use-case-candidate / source-bound / acceptance-pending`；它只把
P15 的下一返回从“需要一个 use case”具体化为“需要一个有 named owner 的相称 acceptance/边界实践”。
若 review 发现 U1 与 P04/P03/P08/P16 无法改变实际判断，或所有差异都可由未控制的运行身份解释，则
回修 P15 candidate 或关闭 P15 use-case proposal，不创建第二套检验机制。

## 7. Independent semantic/source review

独立 reviewer：`Goodall`（Agent `01a03883-ed7f-71b0-ac1d-7ab753d93fad`）；只读、未修改文件，也未取得
P15 reading、use-case、Principal acceptance、WorkCell 或实现权。

初轮 verdict 为 `needs-revision`：指出 U1-A 把 round-3 “要求完成修正并运行检查”写成了实际执行，且
把 runner/activation/schema 的 attribution limitation 归给 P04。Main 已将 U1-A 明确为该 case 未实际执行，
并把 P04 收窄为 known/unknown 边界，将 `attribution-uncertain` 保留为 round-3 evidence limitation。

复读 verdict：`accept`。确认 U1 的 source、Case A/B/C 边界、P04/P08/P03/P16 最近邻、证据上限和 no-Run/
implementation freeze 均成立。该 verdict 只接受本 use-case 的 planning-level source/边界 record，不构成
P15 reading acceptance、matched improvement、regression、adoption 或任何实现授权。

## 8. 2026-08-25 named-owner return check

本轮按上一项实践的出口检查当前仓库是否已经出现可接受 P15 reading/use-case 的 named owner。只读回读了
`AGENTS.md`、`planning/plan.md`、`planning/roadmap.md`、`planning/index/coverage-audit.md`、本记录和
`philosophy-p15-reading-review.md`；这些来源都只声明 owner class 或 acceptance owner 为 `unknown`，
没有形成可回指的 Principal/reading/use-case acceptance assignment。

| field | current result |
| --- | --- |
| owner-return observation | 当前没有 named reading/use-case acceptance owner；已有 `Goodall`/`Plato` 只拥有独立 review，不拥有 acceptance |
| underlying U1 standing | `use-case-candidate / source-bound / independent-review-complete / acceptance-pending`，不改变 |
| current branch disposition | `route-to-owner / no-proposal-now`；只关闭当前 owner-return/proposal branch，不关闭 P15 candidate |
| allowed effect | 更新 P15/phase/plan/roadmap/ledger 的 route projection；保留 U1、round-3 evidence、unknown 和 revisit |
| prohibited effect | 不指定 owner、不接受 reading、不新增实践/fixture/Run、不修改 P15 source、WorkCell、DeepSeek 或实现 |
| exit / revisit | named owner 能给出 retain/revise/close 与下一窄 practice decision 时 reopen；owner、source、consumer 或 acceptance rubric 变化时 reopen |

该检查的证据上限是 `owner-absence-observed / route-to-owner / acceptance-pending`，且只覆盖已检查的
planning/authority surface；它不是对未来 owner 不存在的全局证明，也不是 P15 的 `no-proposal`。在 owner
出现前不继续累积 Main-only self-application，不启动新 round；P15 candidate 与既有
`behavior-observed / attribution-uncertain` 保持不变。

## 9. Independent review of owner-return projection

`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）完成只读复核并 `ACCEPT`：确认 owner absence 只是在已检查
authority surface 上的 observation，U1 underlying standing 与 acceptance-pending 未被关闭，
`route-to-owner / no-proposal-now` 只作用于当前 owner-return/self-application branch，且六处 planning
projection 一致。该 verdict 不取得 P15 reading/use-case acceptance，也不改变 WorkCell、DeepSeek、phase 或实现边界。
