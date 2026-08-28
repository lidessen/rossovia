# Evidence maintenance：evals / experiments standing review

evidence boundary：`evidence-boundary-observed`
review：`independent-review-complete`
acceptance：`pending`；不是新的
eval protocol、Run、实验结论、skill acceptance、WorkCell acceptance 或实现授权。

本记录是整个 planning goal 的 evidence-maintenance item。它盘点当前 `evals/` 与 `experiments/`
中实际存在的对象，区分 protocol、fixture、Run、review、generated artifact 和 prototype 的证据
地位，并决定下一步是保留、标 stale/unknown、开新 round、hold 还是 `no-proposal`。它不以目录、
图片、JSON、运行输出数量或格式通过替代 source、consumer、匹配关系、独立 review 和 acceptance。

## 1. 来源与对象边界

权威入口：

- [`evals/README.md`](../../evals/README.md)：eval 与 experiment 的目录/对象边界；
- [`evals/skill-evaluation/protocol.md`](../../evals/skill-evaluation/protocol.md)：当前 trial contract、
  standing、互斥 disposition、污染、stale/recovery/rerun 与未知规则；
- [`evals/skill-evaluation/trial-manifest.md`](../../evals/skill-evaluation/trial-manifest.md)、
  [`trial-ledger.md`](../../evals/skill-evaluation/trial-ledger.md) 与
  [`holdout-registry.md`](../../evals/skill-evaluation/holdout-registry.md)：冻结 card、运行记录和
  holdout registry 的模板/contract；具体 post-freeze entry 必须作为独立记录追加，不能把模板本身
  当成 Run 或 acceptance；
- [`experiments/README.md`](../../experiments/README.md)：原型/实验性实现不取得 eval standing；
- [`planning/item-ledger.md`](../item-ledger.md) 与 [`coverage-audit.md`](coverage-audit.md)：顶层
  evidence-maintenance item 及其与 reading、skill、WorkCell、DeepSeek 的关系。

当前对象族不是同一层级：

```text
source/protocol → fixture/card → Run/output → independent review → disposition/acceptance
       └──────────── research / planning projection ───────────────┘
prototype / generated artifact ──不能自动进入上面这条证据链
```

## 2. 当前 source map 与处置

| 对象族 | 当前 source / standing | consumer / owner | 依赖 | 允许范围 | 证据上限 | 当前处置与出口 | revisit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 当前 skill-evaluation protocol | `evals/skill-evaluation/protocol.md` 是当前 workflow projection；不是 theory 或 runtime | eval/workflow owner `unknown`；具体 skill owner 是局部 consumer | iterative theory、当前 source、card contract、review/acceptance boundary | 维护 trial contract、standing、污染、stale/recovery/rerun 与未知规则 | 只能证明 protocol 设计可回读，不能证明任何候选行为或接受 | `retain-current-protocol`；不宣称 candidate accepted | theory、source、skill、rubric、runner 或 protocol 改变时开新 round |
| trial manifest、ledger、holdout 模板 | `trial-manifest.md`、`trial-ledger.md`、`holdout-registry.md` 是模板/registry contract；mechanism-design round 已有冻结 card、baseline/treatment Run、review，现已追加历史 ledger record 与三条 upstream source drift/recovery：`manifests/mechanism-design-review-round-1.md`、`runs/mechanism-design-review-round-1/`、`planning/records/evidence-applicability-review-mechanism-design-round-1.md` | eval owner `unknown`；candidate owner 是局部 consumer；protocol/record-retention/acceptance owner `unknown` | 当前 protocol、冻结 card、真实 runner/权限/日志机制、对应 review 和 source snapshot | 对已有 Run 补历史 applicability/ledger record；source drift 追加 stale/recovery；新 Run 仍须冻结新 card 后追加具体运行、review、处置和 lineage | 历史 record 可支持 `behavior-observed / boundary-supported / attribution-unknown`；不能证明 current applicability、append-only、不可变、fresh holdout、matched、regression 或 acceptance | `historical-recorded / source-applicability-stale-uncertain / acceptance-unknown`；不编辑模板，不把已有 Run 补写成当前闭合 | recovered source、full runner/model/harness/workspace identity、activation proof、named consumer/owner 和新 card 出现后重开；否则保持历史 record 与 stale/recovery |
| `planning-inbox-round-1` 失效预注册 | `manifests/planning-inbox-round-1.md` 与 `reviews/planning-inbox-fixture-review.md` 可回读；四项均 `frozen / not run`，静态 review 已指出 task 泄漏候选方法、review-only marker 无 opaque 隔离，且 D source 带入目标语义标签 | planning-inbox skill owner / eval owner `unknown`；当前无需要该 round 结论的已命名 consumer | 若重开需中性 task/source、可审计 payload 隔离、完整 runner/model/harness/workspace identity、activation proof、独立 reviewer 和新 card | 只允许保留失效预注册的 source/review 诊断；不把 manifest 当 Run，不修改冻结 round | 只能支持 `pre-registration-observed / design-defect-observed`；不能支持 behavior、matched、regression、adoption 或 acceptance | `historical-invalid-preregistration / no-rerun-now / acceptance-unknown`；不修旧 card、不补 Run、不把静态 review 写成运行结果 | 新的中性 card、真实 payload isolation、named owner/consumer 和可重建 runtime identity 同时出现时，另开新 round；否则保持历史记录 |
| `evals/project-audit/` living tree / living skills audits | `living-tree-round-2.md` 的 final addendum 已关闭 B1、N1、N2、N3、N5，确认当前无 blocking；仍保留 U1–U3 unknown；`living-skills-round-1.md` 是静态 audit/review | project planning owner `unknown`；下游是 skill migration、phase review、item ledger | AGENTS、living source、当前目录与 protocol | 记录路径、standing、残余问题、portable/no-proposal 和 revisit；可触发 source refresh | 只能支持静态 boundary/current-tree observation，不证明行为改善、matched、Run 或 acceptance | `retain-review-evidence`；以 Round 2 final addendum 的最终状态读取，不把正文中的历史 nonblocking 观察当作当前未关闭项 | living tree、AGENTS、protocol 或 skill 内容改变时重新审计；不倒写历史 round |
| `evals/skill-evaluation/` round manifests、fixtures、runs、reviews | 各 round 的 card/input/output/review/standing；部分 round 支持 `behavior-observed`、boundary qualifier 或 retain/adapt-and-retest | 各 candidate owner `unknown`；eval owner `unknown` | 对应 round card/hash、模型/任务/工具/workspace/runner、rubric 和 reviewer | 逐项复核 applicability、匹配、污染、review、处置和是否需要新 round | 局部 behavior/boundary 观察不能提升为 `matched-improvement`、portable、regression 或 acceptance | `retain-historical / applicability-unknown`；不重跑、不改旧 Run | source snapshot、skill、模型、任务、runner、workspace、rubric 或 consumer 改变时标 stale/开新 round |
| generated-only eval artifact | `evals/human-agent-visualization/generated/project-evidence-bundle.json` 与 `evals/kb-representation-evaluation/generated/` 图片；JSON 内的 `standing`/`sourceRef` 是历史生成投影，不是当前 authority。JSON 声明的 sourceRef 逐项均需标为 `stale/unknown`：`README.md`、`README.zh-CN.md`、`AGENTS.md`、`principles/SEQUENCE.md`、`design/DESIGN.md`、`design/AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md`、`experiments/human-agent-visualization/DESIGN.md`、`operations/workbench/README.md`、`packages/work-cell/README.md`；其中 `README.md`/`AGENTS.md` 等路径即使当前存在，生成 revision/语义也不是 current authority，且 `README.zh-CN.md` 还在 sourceRefs 中被引用为旧/缺失关系 | evidence owner `unknown`；当前无 confirmed consumer | current source、hypothesis、card、consumer、controlled variables、Run/review/acceptance | 只保留历史 artifact 与 source/path 诊断；找到完整链后另开新 round | 不能支持 current source、eval conclusion、behavior、matched、acceptance 或 implementation | `hold / archive-only`；不修图、不改 JSON 伪造 lineage | 找到 current source、hypothesis、consumer、owner、variables 和新 card 后另开 round |
| `experiments/console-redesign/`、`experiments/site-redesign/` 静态 variants | 各目录的 `index.html` 与 `variant-*.html`；form exploration | experiment owner `unknown`；consumer 未命名 | hypothesis、baseline、变量、风险、consumer、接受者和 evidence card | 保留视觉/形式探索；某 variant 进入研究/评估时重新建对象和 card | 可打开页面或有多个 variant 不能证明实验结论、用户偏好或系统设计 | `hold / form-exploration-only` | 明确 hypothesis、baseline、变量、风险、consumer、evidence owner 后选择新 experiment/eval item |
| `experiments/agent-era-blog/` build/prototype artifact | `experiments/agent-era-blog/dist/` 与依赖产物；当前没有可回读的 frozen hypothesis/eval card | experiment owner `unknown`；consumer 未命名 | 同上，另需明确 build/source identity 和风险边界 | 仅保留原型/构建产物，不把 build 成功当效果证据 | 不能证明 prototype 的目标 outcome、可用性、系统接受或生产授权 | `hold / prototype-only` | 补齐 source/hypothesis/consumer/card 后再决定是否保留或另开 experiment |
| WorkCell / DeepSeek / 用户 harness evidence | `design/work-cell-protocol.md`、`planning/records/workcell-open-relations-review.md`、`planning/records/workcell-lifecycle-review.md`、`planning/records/workcell-observation-lineage-review.md`、`planning/plan.md`、`planning/roadmap.md` | future design/evidence owner `unknown`；host/coordinator/eval consumer 未命名 | WorkCell design acceptance、真实 host/consumer、系统 design、实验 card 和 implementation authorization | 只允许 source/边界/fixture planning；不执行 adapter、executor、base 或 system Run | 只能支持 design observation/unknown，不支持 protocol acceptance、system outcome 或 implementation | `not-authorized / retain-design-observation` | 前置 acceptance、consumer、card 和授权成立后再开新 evidence item |

## 2.1 本轮 generated-only applicability check

[`records/evidence-applicability-review-human-agent-visualization.md`](../records/evidence-applicability-review-human-agent-visualization.md)
对 `evals/human-agent-visualization/generated/project-evidence-bundle.json` 完成了一次有界检查：
artifact 当前 SHA-256 为 `7962a44e1f2526f1d92d03d9917051d34c92b725cc2e3bbead480200fbe94a89`，9 个声明
sourceRef 中 2 个路径仍存在但 captured digest 不同，7 个路径缺失。独立 reviewer 在窄范围内接受
`historical-only / hold / archive-only / no-proposal-now` 处置；它没有重算两个现存 source 的 digest，
也没有穷举证明所有 current consumer、owner、Run 或 acceptance 均不存在，因此这些仍保持 unknown。
这项检查没有修改 JSON、恢复旧路径、创建新 Run 或打开实现。

[`records/evidence-applicability-review-kb-representation.md`](../records/evidence-applicability-review-kb-representation.md)
对 `evals/kb-representation-evaluation/generated/recall-v1/activation.png` 完成了第二个有界检查：
当前 generated 目录只有 PNG，但历史 git 对象中可回读旧的 `experiments/...` fixture、source、脚本、
Run evidence 和 development `probe`。旧 fixture 与当前 PNG digest 不同，且没有 exact generation
lineage，因此历史链只能标为 `historical-chain-observed`，当前适用性保持 unknown；artifact 处置为
`historical-only / hold / archive-only / no-proposal-now`，不继承历史结论、不创建新 Run。

## 2.2 mechanism-design round 1 ledger/source applicability closure

本轮对已有 [`mechanism-design-review / round-1`](../records/evidence-applicability-review-mechanism-design-round-1.md)
完成了历史 post-freeze ledger record，而不是新 Run。card、candidate、task、baseline、treatment 和
历史 review 的文件/hash edge 可回读；但 `design/work-cell-protocol.md`、`records/workcell-lifecycle-review.md`
和 `records/workcell-observation-lineage-review.md` 相对 frozen card 已 drift，当前 source applicability 标为
`stale/uncertain`，并在 ledger 中追加 stale/recovery entry。open-relations review 与 harness theory
hash 未 drift。

旧 round 的基础 standing 保持 `behavior-observed`，局部 qualifier 为 `boundary-supported`，归因仍
`unknown`；既有 `adapt-and-retest` 和 `rewrite + retain-incubation` 不被本次 bookkeeping 改写。没有
matched、regression、adoption、Principal acceptance、WorkCell acceptance 或实现授权。下一 return 是
recovered source snapshot、full model/runner/harness/workspace identity、activation proof、protocol/
record-retention/acceptance owner、named consumer 和新 frozen card；不为填 ledger 直接重跑。
该 bounded record 已由 `Lagrange` 独立复核；复核不取得 evidence、candidate 或 Principal acceptance。

## 2.3 practice-cycle round 3 source-edge applicability check

[`records/evidence-applicability-review-practice-cycle-round-3.md`](../records/evidence-applicability-review-practice-cycle-round-3.md)
对已有 `method-probe-round-3-practice-cycle` 做了 post-freeze、no-rerun 检查。当前 candidate、core
card、task、baseline/treatment output 与 independent review 的 SHA-256 均与 frozen/ledger 记录一致；
`AGENTS.md` 的历史 edge 可回读但当前 raw hash 已漂移；run identity 文件也可回读。

这只支持 recorded artifact edge 的 `source-edge-match-observed / runtime-applicability-uncertain /
behavior-observed / attribution-uncertain / acceptance-pending`；当前 `AGENTS.md` project-instruction
edge 已发生 drift，因此整体不能再写成 current source-edge match。两个 runner identity 不同，model/harness/workspace、
activation proof、schema 一致性、freeze immutability、adoption exposure、fresh holdout、regression
和 acceptance owner 仍 unknown/disabled。现有 round `adapt-and-retest`、carrier `retain-incubation`
不变；不编辑 frozen card/Run/review、不把 source-edge match 写成 matched improvement、不创建新 Run。
该 applicability record 的原有 `Lagrange` review 只覆盖当时的 source snapshot；当前 drift correction
尚未取得新的 acceptance。后续只有 named runner/identity、activation、统一 schema、新 narrower card 和
相称 review 齐备后才可另开 round。

## 2.4 planning-inbox round 3 old-vs-new source/applicability check

[`records/evidence-applicability-review-planning-inbox-round-3.md`](../records/evidence-applicability-review-planning-inbox-round-3.md)
对 `planning-inbox-round-3` 做了 post-freeze、no-rerun 检查。当前 candidate/new snapshot、old rollback
snapshot、round fixture、protocol、十份 input、十份正式 output、events/stderr、run identity、blind review、
mapping 和 synthesis 的文件/hash edge 均可回读；失败 sandbox 尝试也与正式样本分离。

这只支持 `source-edge-match-observed / behavior-observed / boundary-supported`，runtime
applicability 与 current-project source applicability 仍 uncertain：served model、完整 system/developer
prompt、harness、权限、candidate activation、fresh context/物理隔离、direct exit，以及当时的
`planning/inbox.md` / `inbox-history.md` 冻结关系均未被完整证明。round 的已有处置仍是
project-local disposition `retain-as-project-local-incubating-candidate / adapt-and-observe`，不是 matched、adopt、regression 或
portable acceptance；不编辑 round、不创建新 Run、不把成本观察写成语义 rollback。

该 applicability record 已由 `Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）独立复核 `final accept`；下一 return 是 named eval/runner owner、可重建 runtime
identity、activation/visibility proof、显式 current inbox source snapshot、新或 superseding card 和
独立 review。前提不齐时保留历史 source-edge observation 与 current-source uncertainty，不为补 ledger
直接重跑。

## 3. 当前事实与证据上限

- 当前 protocol 已明确区分 `format-valid`、`behavior-observed`、`matched-improvement` 及可并存的
  `boundary-supported`、`regression-supported`、`combo-only`；因此旧 round 的局部成功不能被
  汇总成系统接受。
- `living-skills-round-1.md` 已明确：planning-inbox round 2/3 只有局部 `behavior-observed` /
  boundary 或 retain/adapt-and-observe，其他载体的 continued existence 与 portability 仍未由
  matched evidence 证明。
- `round-2-design-review.md` 是静态系统设计 review，明确没有行为 trial，不支持
  `matched-improvement`、`regression-supported`、系统收敛或人类 acceptance。
- 当前 `experiments/` 的静态页面只说明 form/prototype 存在；没有由此推出 hypothesis、效果、
  baseline、consumer、风险或接受关系。
- `living-tree-round-2.md` 的 final addendum 已确认当前 living tree 没有 blocking；Pxx 重建 owner/时机、未来
  harness 子理论是否分化、受控行为工具的正式 owner 仍是独立 unknown，不应被重复展开成新的 planning item。
- generated-only artifact 的旧路径和 current living path 不一致时，路径差异本身是 stale/unknown
  evidence，不是迁移授权，也不应通过修改 artifact 伪造 lineage。
- 历史 experiment 具有 manifest、fixture、脚本或 Run evidence 时，仍需先与当前 generated artifact
  做 exact lineage reconciliation；旧 probe 的 source-hit signal、development standing 或报告结论
  不会因节点标签相似而自动转移。

## 3.1 当前 applicability record scope

截至 2026-08-25，已知可能影响当前 planning 的历史 evidence/applicability family 均已有专门记录：

- generated-only：[`records/evidence-applicability-review-human-agent-visualization.md`](../records/evidence-applicability-review-human-agent-visualization.md)、[`records/evidence-applicability-review-kb-representation.md`](../records/evidence-applicability-review-kb-representation.md)；
- skill/eval round：[`records/evidence-applicability-review-living-skills-round-2.md`](../records/evidence-applicability-review-living-skills-round-2.md)、[`records/evidence-applicability-review-round-1-meta-matched.md`](../records/evidence-applicability-review-round-1-meta-matched.md)、[`records/evidence-applicability-review-practice-cycle-round-3.md`](../records/evidence-applicability-review-practice-cycle-round-3.md)、[`records/evidence-applicability-review-planning-inbox-round-2.md`](../records/evidence-applicability-review-planning-inbox-round-2.md)、[`records/evidence-applicability-review-planning-inbox-round-3.md`](../records/evidence-applicability-review-planning-inbox-round-3.md)、[`records/evidence-applicability-review-mechanism-design-round-1.md`](../records/evidence-applicability-review-mechanism-design-round-1.md)；
- WorkCell source applicability：[`records/evidence-applicability-review-workcell-design.md`](../records/evidence-applicability-review-workcell-design.md)、[`records/evidence-applicability-review-workcell-design-revision-2.md`](../records/evidence-applicability-review-workcell-design-revision-2.md)、[`records/evidence-applicability-review-workcell-identity-current-source.md`](../records/evidence-applicability-review-workcell-identity-current-source.md)、[`records/evidence-applicability-review-workcell-contract-field-authority-current-source.md`](../records/evidence-applicability-review-workcell-contract-field-authority-current-source.md)、[`records/evidence-applicability-review-workcell-completion-action-current-source.md`](../records/evidence-applicability-review-workcell-completion-action-current-source.md)。

这只是 record-scope reconciliation，不是把这些记录合并成一个 acceptance。WorkCell 的三个 current-source
child（identity、contract-field authority、CompletionAction）由 WorkCell readiness/对应 review family
拥有；它们不属于 evidence-maintenance 的缺失项，也不能把 source applicability 写成 canonical protocol
acceptance。当前没有发现另一个已有 evidence family 缺少 applicability record。

## 4. 最小下一实践

下一项不再是对已知 family 批量扫描，而是由新触发器驱动的 bounded maintenance：

1. 只有出现新的 artifact/family，或 source、protocol、candidate、consumer、owner、runner identity、
   acceptance relation 发生变化时，才回读对应 card snapshot/hash、source edge、模型/任务/工具/
   workspace/runner、review 与 disposition；
2. 将新一轮结果分成 `current-applicable`、`stale-needs-new-round`、`historical-only`、`uncertain`，
   不用单一总分；
3. 只有存在 named consumer、可重建 card、相称 controlled variables、独立 reviewer 和接受关系时，
   才提出新 round；否则保留 historical/hold/no-proposal；
4. 对 generated-only eval 与 experiment prototype 只补 source/hypothesis/consumer 关系，不把它们
   改写成 Run 或结论；
5. 将有新触发的结果追加到 current planning projection，并在 source/protocol/consumer 改变时建立
   `stale → recovery/new round` lineage。

在触发器出现前，已知 family 保持各自的 historical/uncertain/hold/no-proposal standing，不创建覆盖性
审计文件，不为填补 ledger 重跑。

允许范围到此为止：不创建评估工具、不运行外部模型、不修改历史 Run、不把 WorkCell/DeepSeek/base
实现提前打开。

## 5. 当前 evidence standing 与 return

当前本记录支持：`evidence-boundary-observed / retain-unknown / independent-review-complete / acceptance-pending`；它没有取得
任何 Run、matched improvement、regression、portable、system acceptance 或 implementation authorization。

独立 review 应检查：每个对象族是否保留了 source、standing、consumer/owner、依赖、允许范围、
证据、处置、出口和 revisit；generated-only artifact 的旧 source mismatch 是否被正确降为 hold；
历史 Run 是否没有被倒写成 current；experiments 是否没有被偷换成 eval；WorkCell/DeepSeek 实现
冻结是否仍成立。若某族没有真实可改变下一判断的 consumer，回到 `hold` 或 `no-proposal`，不为
完成覆盖而增加新 protocol、Run 或 skill。

## 历史/迭代回返（默认折叠）

<details>
<summary>展开 2026-08-25 evidence applicability 与 reconciliation history</summary>

## 2026-08-25 WorkCell design source applicability reconciliation

新增 [`records/evidence-applicability-review-workcell-design.md`](../records/evidence-applicability-review-workcell-design.md)，
只检查当前 `design/work-cell-protocol.md` 与 WorkCell A/B/C/D、RunRecord binding identity、contract-field
authority review 的 source edge；不编辑旧 review、不恢复旧 snapshot、不创建新 Run。

- 当时（executor revision 前）的 protocol raw SHA-256 为 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；
  A/B 与 C/D frozen upstream edges 均与当前 source 不同，旧 snapshot 当前不可回读，因此 current
  applicability 为 `uncertain`，但不推断差异一定改变语义。
- record-boundary 与 contract-field review 的 protocol edge 与当前 source match；这只支持 source
  applicability bookkeeping，不改变它们的 `acceptance-pending`、owner unknown 或 implementation freeze。
- 当前 bounded contribution standing 为 `source-edge-reconciled / historical-review-drift-observed /
  independent-review-complete / acceptance-pending`；record SHA-256 为
  `7b1dafce4b6ba12ff355daa4a5d945cc9ed0d57b72aa861d819d5f331c46fe66`；`Hubble` 独立复核 `final accept`。
  下一 return 是 recovered snapshot、named protocol/
  record-retention/replay consumer 或新 current-source review card。没有这些前提时不重跑、不补 synthetic
  Run、不创建 event bus、lineage registry、retention service 或 runtime。

## 2026-08-25 WorkCell executor wording source revision

`design/work-cell-protocol.md` 随 executor comparability candidate 曾完成仅限 wording/diagram 的 source
revision；该 revision-2 historical raw SHA-256 为 `cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3`，
不是 contract projection revision 后的 current source。
revision-2 applicability record [`records/evidence-applicability-review-workcell-design-revision-2.md`](../records/evidence-applicability-review-workcell-design-revision-2.md)
已由 `Dewey` 独立复核 `ACCEPT`，仅支持 source-revision/current-applicability bookkeeping：旧
A/B/C/D、RunRecord identity 与 contract-field review 保留 pre-revision edge，不能自动成为 current
protocol acceptance；不重跑历史 Run，不启动 matched provider comparison，不改变 WorkCell/DeepSeek/
implementation freeze。

## 2026-08-25 living skills round-2 family applicability check

新增 [`records/evidence-applicability-review-living-skills-round-2.md`](../records/evidence-applicability-review-living-skills-round-2.md)，
对 `agent-delegation`、`agent-expression`、`concept-articulation`、`dual-audience-expression`、
`form-selection`、`human-writing` 和 `skill-formation` 的 round-2 manifest、fixture、当前 candidate、
run 与 review 做了同一项 source/standing reconciliation。

- 七份 manifest 都是预注册清单，execution/output 仍写为 `unknown / not run`，但对应 run/review 文件存在；
  这些文件只支持历史 artifact 存在，不自动成为该 card 的正式 Run。七个 round 在当前 trial ledger 中都没有
  可回读 lineage entry。
- 七份 manifest 中记录的 candidate hash 与当前 `.agents/skills/*/SKILL.md` 全部不同；因此不能把旧
  review 的行为观察投影为当前源码的行为，也不能由此支持 move 到 portable `skills/`。
- 七份 review 的共同上限是不成立 matched comparison；它们最多留下对实际文本产物的
  `behavior-observed` 历史观察。`dual-audience-expression` 还存在额外未成对 baseline，不能补成正式 pair。
- 当前处置为 `historical-artifacts-observed / current-applicability-uncertain / hold`；不编辑旧 manifest、
  Run、review 或 candidate，不重跑，不创建 synthetic Run。七个 carrier 继续 `.agents/skills/` incubation。
- 下一 return 是恢复 named eval/runner owner、card/run/review lineage、当前 candidate hash、完整 runtime
  identity/activation proof、reviewer 独立性和 acceptance owner；前提不齐时关闭当前迁移分支为
  `no-proposal-now`，保留历史 observation。
- `Hubble`（`01a03875-9202-7892-8413-2c6b693b23d3`）两轮独立复核该 applicability record，修订后
  `final accept`；复核只接受 bookkeeping 边界，不取得 skill、portable move、evidence acceptance 或实现授权。

## 2026-08-25 planning-inbox round-2 applicability check

新增 [`records/evidence-applicability-review-planning-inbox-round-2.md`](../records/evidence-applicability-review-planning-inbox-round-2.md)，
只检查已有 round-2 的 manifest、fixture/payload、candidate snapshot、五项 baseline/treatment、run identity、
blind review、synthesis 与当前 inbox/history/project instruction 的 source edge。

- 五项 input/output、JSONL、stderr、`turn.completed`、run identity 和 semantic review chain 可在文件/事件层面回读；
  manifest 的 `frozen / not run` 是预运行登记，未被倒写。
- candidate snapshot、`planning/inbox.md`、`planning/inbox-history.md` 和 `AGENTS.md` 与当前 hash 不同；这是
  mechanical provenance drift，不证明内容或指令语义变化，但使 current applicability 不能直接继承。
- served model、完整 system/developer prompt、harness、权限、隔离、candidate activation 和 direct exit 仍 unknown；
  synthesis 的最高上限保持 `behavior-observed / boundary-supported`，round disposition 仍 `adapt-and-retest`。
- `planning-inbox` 继续 `.agents/skills/` incubation，carrier disposition 保持 `retain-incubation`；只将当前
  applicability/re-run 提案标为 `no-proposal-now`，不修改旧 artifact、不重跑、不移动到 portable `skills/`。
- `Plato`（`01a0387b-f544-7aa1-ab7e-bbc7a3290609`）两轮独立复核后 `final accept`；该 review 不取得 skill、
  portable、WorkCell、DeepSeek 或实现授权。

## Independent review

独立 reviewer：`Zeno`（Agent `01a037ff-9151-7ab1-af12-d5429db4be48`）完成两轮只读复核。初轮指出
generated sourceRef 清单不完整、mechanism-design round 已有 Run/review 但 ledger entry 状态未区分；
Main 修订后，二轮确认对象族、证据上限、历史/当前边界和实现冻结成立。该 review 未修改文件，也未
取得任何 evidence acceptance。

## 2026-08-25 round-1 meta-matched historical applicability closure

新增 [`records/evidence-applicability-review-round-1-meta-matched.md`](../records/evidence-applicability-review-round-1-meta-matched.md)，
只检查 Round 1 F1 的历史 baseline/treatment/review 是否能支持当前 `skill-formation` 迁移判断。

- `theory/philosophy.md` 的历史 hash 与当前一致；`theory/gene-expression.md` 已发生 source drift；历史
  `theory/harness.md` 路径不存在，但迁移后的 `theory/harness/theory.md` 内容 hash 与旧值一致。这只能
  支持局部 source/path bookkeeping，不能证明旧 round 对当前 source 仍适用。
- fixture/protocol 没有由历史记录冻结的 hash edge；treatment 没有 candidate hash、activation receipt 或
  完整 runner/model/harness/workspace identity；`trial-ledger.md` 也没有 dedicated meta-matched post-freeze
  entry。baseline/treatment/review 文件存在，只能支持历史 artifact chain。
- 历史 review 报告的 owner boundary 与 `no-proposal` 保持为历史观察；当前 projection 降为
  `historical-only / hold / no-proposal-now`，不把它升级成 current matched、portable 或 skill acceptance。
- 当前 `skill-formation` carrier 不变，继续 `.agents/skills/` incubation；不编辑旧 output/review、不重跑、
  不创建 synthetic Run。只有 named consumer/eval owner、current card/source/candidate hash、完整 runtime
  identity/activation proof、独立 reviewer 和能改变迁移选择的 case 同时出现时才 reopen。

本记录关闭的是“直接复用旧 Round 1 作为当前证据”的提案，不是删除历史材料，也不改变 WorkCell、DeepSeek
Harness 或实现冻结。`Dewey`（`01a0394d-c4ad-7e10-a91d-68a232d7ba24`）独立复读并 `accept`，只接受
applicability bookkeeping，不接受 skill、历史 round、portable move 或实现。

## 2026-08-25 WorkCell identity review current-source applicability

[`records/evidence-applicability-review-workcell-identity-current-source.md`](../records/evidence-applicability-review-workcell-identity-current-source.md)
只对既有 RunRecord/Binding identity 与 Spec identity review 做 current-source child 回读，不创建 Run、
不编辑旧 output/review。该条记录当时的 protocol fingerprint 为 `2ed713fe… / f87422b0…`，当前 source 已更新为 `7240b23… / 513e7ed…`，旧
`4293057d… / 26ec714f…` 仅是 review-time historical edge。

该 child 经 `Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）只读 `ACCEPT`，支持
`source-applicability-reconciled / design-boundary-observed / independent-review-complete / acceptance-pending`：两个
review 的 baseline 可回指当前 §5.1/§6.1/§6.5/§8.2/§11.1/§17.2/§18，但字段载体、digest semantics、
retention/correction、record/spec consumer 和 acceptance owner 仍 unknown。它不把 source applicability
写成 canonical contract、protocol acceptance、matched comparison 或实现授权；没有 named owner/consumer
   时不重跑、不补字段、不建 registry/runtime mechanism。

</details>
