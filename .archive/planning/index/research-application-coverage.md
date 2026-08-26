# Research application coverage

coverage：`source-scan-complete / handoff-projection-observed`
review：`independent-review-complete`
acceptance：`pending`

这是一个 supporting view，用来回答一个窄问题：**已经结算的 research result 是否有明确的下游落点，
还是会在 research/archive 处理中静默丢失。**它不是 research authority、item ledger、adoption registry、
自动 loader 或 runtime gate；具体语义、standing、证据和 owner 仍回到各 canonical source。

## 1. 扫描范围与判定

本轮扫描 `theory/research/*.md` 中带有 `settlement_route` 的 12 个 current research records；没有该字段
的 review round、process record 或历史 review 不单独创建 application obligation，而由其 successor、
parent item 或 records lineage 承载。另行回读 `planning/item-ledger.md` 的 current application audit，
并把长周期遗忘与 WorkCell design-use 作为 planning records 的独立下游对象。

每行分别检查：

```text
research result
  → semantic handoff
  → carrier handoff
  → current application observation
  → activation observation
  → adoption / reopen evidence
```

“没有 runtime activation”不是失败；如果目标本来是 planning、theory 或 reading，则记录其目标层级。只有
有价值且目标是实际工作系统、但没有 carrier/owner/activation 的结果，才必须保留 `integration pending`，
不能随 research settlement 一起归档。

## 2. Current research-to-application projection

| research record | settlement / target | semantic + carrier handoff | current application observation | activation / adoption | archive gate / next return |
| --- | --- | --- | --- | --- | --- |
| [`controlled-experiment-design.md`](../../theory/research/controlled-experiment-design.md) | `canonical-proposal`；planning/harness methods | 已交给 long-horizon forgetting design、WorkCell design-use 和 plan/ledger 的 experiment boundary | problem-first、变量、estimand、TEVV 与 disposition 已实际改变 long-horizon design；design-use receipt 已独立 review | 无 Run、runner activation 或 trial adoption | 保留 `integration pending` 到真实 owner/runner/guardrail；不能 archive |
| [`agent-harness-throughput-research.md`](../../theory/research/agent-harness-throughput-research.md) | `owner-gated-hold`；harness-system-design | trace schema、loading/topology branches 和 candidate-selection branch 已进入 throughput record/plan | 只观察到 design/trace/footprint boundary；无 latency consumer | 无 telemetry/runner activation、matched effect 或 adoption | 保持 hold；named runner/latency consumer 返回，或下一 checkpoint 无回返后转 `archive-inconclusive / no-proposal` |
| [`harness-agent-initiative-research.md`](../../theory/research/harness-agent-initiative-research.md) | `owner-gated-hold`；harness-system-design | `goal-linked bounded initiative/action loop` 已进入 harness theory、item ledger 和 research settlement | 形成 mechanism synthesis，但尚无真实 system consumer | 无 system activation、baseline/treatment 或 adoption | 保持 hold；等待真实“等待会拖慢且主动做错有代价”的 consumer；无回返不能无限延期 |
| [`harness-engineering-control-and-reliability.md`](../../theory/research/harness-engineering-control-and-reliability.md) | `canonical-proposal`；harness-system-design candidate | feedback、disturbance、observation、stability 和 effect boundary 已进入 harness theory/plan | 当前为 source/design application；没有实际 controller 或 runtime claim | 无 system activation 或 reliability adoption | `integration pending`；等 primary source/真实 reliability consumer，或按 settlement route 结算为 archive/no-proposal |
| [`harness-problem-complexity-and-tool-readiness.md`](../../theory/research/harness-problem-complexity-and-tool-readiness.md) | `canonical-proposal`；Main project-scale work candidate | complexity profile、tool preparation、direct/sequential/parallel choice 已进入 Main method、plan/ledger | 已在 planning wave 形成 bounded design-use observation；没有 matched tool/throughput effect | 无 portable/runtime activation；planning use 不等于一般 harness adoption | 保留 incubation/application obligation；等第二 consumer、tool-boundary counterexample 或可比较收益 |
| [`iteration-process-audit.md`](../../theory/research/iteration-process-audit.md) | `canonical-proposal`；planning iteration process | baseline→observation→change→review→acceptance→adoption projection 已交给 iterative-improvement 与 item-loop audit | 已成为 planning loop 的结构化审计方法 | 无 project-scale runtime activation 或 regression window | 保留到真实多步骤 wave；无 decision delta 时可 no-proposal/archive |
| [`iterative-improvement.md`](../../theory/research/iterative-improvement.md) | `active / adapt-and-retest`；harness iteration methods | baseline、method snapshot、rollback、semantic checkpoint 和 method evolution loop 已进入 theory/plan | 设计层已应用；真实 project-scale goal wave 尚未完成 | 无可靠 safe-point loader、method snapshot activation 或 adoption | 保持 active 到下一真实 wave；不能因理论已写入而 archive |
| [`main-agent-project-work-method.md`](../../theory/research/main-agent-project-work-method.md) | `canonical-proposal`；Main project-scale work | Main 保留整体、delegation topology、fan-in、unknown 和 settlement 的方法已进入 plan/ledger | planning dogfood 已观察；无 direct-vs-delegated matched comparison | 无一般 harness activation、adoption 或 regression | 保留 `integration pending`；下一真实 project-scale wave 冻结 comparison，若无 decision delta 再结算 |
| [`philosophy-gene-one.md`](../../theory/research/philosophy-gene-one.md) | `canonical-proposal`；philosophy reading rebuild | 已交给 P01–P16 source-bound reading packages，不是 harness runtime 候选 | reading/source/最近邻 work package 已形成 | 不适用：目标是 source/reading layer，不是 runtime | 不因没有 harness activation 归档；按 reading acceptance、source revision、人类命名回返 |
| [`planning-information-architecture.md`](../../theory/research/planning-information-architecture.md) | `canonical-proposal`；planning read model | 六层 planning layout、frontmatter pruning、index/records boundary 已交给 README、ledger、plan/records | 已在当前 planning maintenance 真实使用；design-use/adoption unknown | 不适用生产 runtime；尚无长期 reader/维护 adoption | 保留 planning application obligation；新 authority 误读、field drift 或第二 consumer 时 reopen |
| [`provisional-adoption.md`](../../theory/research/provisional-adoption.md) | `canonical-proposal`；planning/harness methods | candidate→scope/owner/期限/effect/rollback/acceptance 关系已进入 settlement/plan | 当前只形成试行方法边界，没有真实 trial | 无 bounded trial activation/adoption | 保留到真实 candidate/trial owner；无真实对象时可 no-proposal，不把 proposal 当 adopted |
| [`research-settlement-and-closure.md`](../../theory/research/research-settlement-and-closure.md) | `canonical-proposal`；planning/research maintenance | settlement、application handoff、archive gate 已进入 harness theory、records README、item ledger | 已在当前 research settlement wave 实际应用；覆盖 handoff distinction | 不产生 runtime activation；它是维护方法 | 继续作为 canonical maintenance rule；active surface growth 或 metadata burden counterexample 时 reopen |

## 3. Archive-gate result

本次 scan 的当前结论：

- 没有发现“有价值、目标为实际 harness、已经归档但没有下游落点”的 current canonical research record；
- 仍有价值但没有 activation 的项目被保留为 `canonical-proposal`、`owner-gated-hold` 或 `active / adapt-and-retest`，并在 item/plan projection 中保留下一回返；
- 目标是 theory、reading 或 planning 的记录，不因没有 runtime activation 被误判为缺失；它们的 handoff 目标层级已明确；
- `carrier exists`、`design-use observed`、`activation` 和 `adoption` 没有被合并成一个状态；当前实际 harness activation/adoption 仍大面积 unknown；
- 带 `archive-*` disposition 的历史 review round 必须有 superseder、no-proposal 或无应用义务理由；本 view 不允许用“research settled”替代该检查。

本 view 目前只支持 `source-scan-complete / handoff-projection-observed / activation-adoption-unknown`，不支持
research 全部应用完成、harness 采用、WorkCell acceptance 或 runtime guarantee。独立 reviewer 已完成；
下一步仍是逐项抽查上表中最容易误归档的 `canonical-proposal` 与 `owner-gated-hold`，然后将任何 decision delta
回写对应 canonical source，而不是在本 view 继续堆状态。

独立只读 reviewer `01a03e96-5db8-7891-a772-e6b0e612d44c` 返回 `ACCEPT`：确认 12 条扫描区分了
目标层级 handoff 与 harness activation，保留了未完成的 `integration pending`，且 archive-gate 结论没有
越过 source scan 能支持的证据上限。该 verdict 只接受本 working view 的 bounded projection，不接受所有
research 已应用、harness 已采用或 runtime guarantee。
