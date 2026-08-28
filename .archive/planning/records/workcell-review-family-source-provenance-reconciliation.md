# WorkCell review family source provenance reconciliation

状态：`source-drift-observed / review-time-edges-labeled / independent-review-complete / acceptance-pending`；不是
WorkCell protocol acceptance、字段 canonicalization、provider comparison、runtime guarantee 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 1. 对象、当前 source 与触发

本记录只处理 WorkCell review family 中“review-time source fingerprint 被读成当前 source”的来源层级
问题。它不重跑旧 review、不替换旧结论、不自动接受字段候选，也不把所有 review 合并为一个 acceptance
unit。

当前 canonical source [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 的可回读身份为：

- Git object SHA-1：`fa602fafd444d1f738c20ac4b4ec16c9e4d8654e`；
- raw-file SHA-256：`c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b`；
- 长度：`1188` 行。

受影响的若干 review 在 contract projection revision 之前读取的 source edge 是 Git SHA-1
`4293057dc1d136fd20ddc7de7144612e458a5b11`、raw SHA-256
`26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`。该 edge 仍是 review provenance，
但不能继续写成 current canonical fingerprint。

## 2. 受影响 family 与适用性

| review family | 旧 edge 的正确地位 | 当前处理 | 不自动推出 |
| --- | --- | --- | --- |
| Binding identity、Spec identity、contract-field authority | pre-contract-projection review-time edge；后续又有 state/parent source revision | 三个 child 的既有 boundary observation 与 provenance 保留；最新 `fa602faf… / c78876b4…` source 的受影响边界已完成窄回读与独立复核；不升级为字段或 protocol acceptance | `bindingRef`、Spec identity projection、field shape、requirements→grant mapping、host enforcement 或 digest acceptance |
| CompletionAction、EffectSummary、UsageObservation | pre-contract-projection review-time edge；后续又有 state/parent source revision | `EffectSummary`/`EffectObservation`/`UsageObservation` 的 named-slot applicability 仍由 [`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md) §6 单独承载；`CompletionAction` child 已完成 current-source 窄回读与独立复核，shape/owner review 仍见 [`workcell-completion-action-contract-review.md`](workcell-completion-action-contract-review.md) | canonical shape、host authority、retention、correction、completion acceptance |
| observation/record integration | pre-contract-projection review-time edge | 保留跨字段 boundary observation；当前只承认 `runId` join 与现有 contract projection reconciliation 的范围 | call/effect/usage/check identity 互相升级、record acceptance 或 runtime correlation |
| executor comparability | executor revision 的 review-time edge，且早于 contract projection revision | 由 [`evidence-applicability-review-workcell-design-revision-2.md`](evidence-applicability-review-workcell-design-revision-2.md) 与 [`workcell-executor-comparability-review.md`](workcell-executor-comparability-review.md) 直接承载 current-source applicability；A/B/C/D child 只作为相邻固定变量检查，不替代 comparability record | matched comparability、canonical equality、Vercel/DeepSeek 选择或 adapter implementation |
| lifecycle、observation/lineage 与旧 applicability record | historical source/applicability edge | 当前 A/B/C/D baseline 只由 [`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md) 回指；policy/recovery unknown 保留 | cutoff、revocation、replay、retention、lineage recovery 或 protocol acceptance |

这些 family 的 source drift 只证明来源身份变化，不证明旧结论必然错误；当前适用性必须按 review unit、
实际变更 section 和 owner 重新判断。旧 `independent-review-complete` 不因 hash 被标注为 historical
而自动变成 current acceptance，也不因新 hash 存在而自动失效。

## 3. 最小改变与允许范围

- 将窄 review 的 `429/26ec` 明确称为 `review-time / pre-contract-projection source edge`；保留其
  historical object、review verdict、未知和回返条件。
- 在旧 applicability correction 中标出当时的 current edge，并把 current source 指回 revision-2、
  current-source child card 与 contract projection reconciliation。
- 在 plan、roadmap、item-ledger 和 readiness 中只同步 provenance/current-applicability projection。

允许效果到此为止：不改 canonical protocol、不补字段、不重跑旧 Run、不创建 registry/event bus/retention
service、不选择 provider、不打开 DeepSeek Harness 或 implementation。

## 4. 证据与出口

- **观察（contract/executor projection family）：** source fingerprint 已由 `429/26ec` 经过 executor
  revision `e8f7/cfe203`、contract revision `2ed/f874` 变为当前 `fa602faf… / c78876b4…`；多项窄
  review 的 header 或 correction 段落曾使用旧“当前”措辞，现已把受影响 child 收窄为 current-source
  narrow-read pending。
- **范围限定（lifecycle/lineage family）：** `workcell-lifecycle-review.md` 与
  `workcell-observation-lineage-review.md` 各自保留 `00a7ec… / 25e859…` 的 review-time/frozen edge；
  它们不被 `429 → e8f7 → 2ed` 这条 contract/executor 演化链代替。
- **最小出口：** 所有旧 edge 能被准确回读为历史；A/B/C/D 的 current-source child 仍明确承载其
  applicability；identity、contract-field、CompletionAction 三个 child 已完成当前 source 窄回读，exact
  candidate 已完成独立复核；不把 projection bookkeeping 误写成 acceptance。
- **当前 standing：** `source-drift-observed / review-time-edges-labeled / independent-review-complete /
  acceptance-pending`；identity、contract-field、CompletionAction current-source child 均为
  `source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete /
  acceptance-pending`，其 canonical shape/owner/acceptance 仍未决。
- **revisit：** canonical source 再修订、相关 section 变化、named protocol/record/host/eval owner、
  真实 consumer 或新的 current-source review card 出现时，按 family reopen；不因目录或 hash 变化批量
  重跑全部 review。

CompletionAction 的下一项不再是重复 source read，而是由 protocol/record、host/coordinator、
executor/context、retention/correction、mechanical-check 与 acceptance owner 对 child 已识别的
shape、authority、submission/return、retention/correction、check 与 acceptance 分工分别作出结构化
决定；在此之前不得把 source applicability 写成 canonical shape 或 WorkCell acceptance。

## 2026-08-25 current source revision：Run state / record finalization

canonical protocol 随 [`workcell-run-state-boundary-review.md`](workcell-run-state-boundary-review.md) 发生
一项 source revision：`WorkCellRun.state` 不再把 `recording` 作为 public execution state，record
finalization 作为 terminal execution state 后的独立关系保留。当前 source 为
`fa602faf… / c78876b4…`（1188 行）；`7240b23b… / 513e7ed9…` 是该 revision 前的 current-source edge，
`2ed713fe… / f87422b0…` 是更早的 edge。

本条只要求 lifecycle/A current-source applicability 由新 review unit 回接；Binding identity、Spec identity、
contract-field、CompletionAction、Effect/Usage、Event/lineage 和 executor child 的既有结论不因 hash
变化自动变成 accepted，也不自动失效。新的 public state boundary 不选择 drain cutoff、record
availability、retention/correction、host policy 或 runtime implementation。

## 2026-08-25 current source revision：parent relation set

canonical protocol 随 [workcell-parent-relation-boundary-review.md](workcell-parent-relation-boundary-review.md)
发生第二项 source revision：WorkCellRunRequest.parent.relation 的 v1 public union 移除没有真实
consumer、owner 或 recovery contract 的 derived-from，当前只保留 retry-of 与 continued-from。
generic Task/WorkItem derivation 不进入 WorkCell core；若未来出现真实跨 Run 关系，必须以新的 consumer、
owner、反例和 versioned review 重新引入。

当前 source 为 fa602faf… / c78876b4…（1188 行）；前一 7240b23… / 513e7ed… 只保留为
previous-source edge。该简化仍是 design-candidate / acceptance-pending：parent record 缺失、
retention、错误关系、unknown 深度和 lineage authority 仍未决，不取得 protocol、runtime 或实现 acceptance。

## 2026-08-25 contract field authority current-source applicability return

新增 [`evidence-applicability-review-workcell-contract-field-authority-current-source.md`](evidence-applicability-review-workcell-contract-field-authority-current-source.md)，
直接回读当时 current protocol `2ed713fe… / f87422b0…` 的 §4.1–§5.2、§6.1、§6.3–§6.5、§7.3、§8、§16–§18；
`7240b23… / 513e7ed…` 是其后的 previous current edge，当前 source 为 `fa602faf… / c78876b4…`。
`McClintock`（`01a0393c-3b3d-7932-b3da-4653254e30ce`）独立只读 `ACCEPT`。

该 child 只确认 requirements/declaration、host Binding/grant、request、live call、executor return、
host observation、record/evidence、mechanical check、semantic review 与 acceptance 的 previous-source 分层
观察仍可保留；requirements→grant mapping、`CommandGrant.argumentShape`/argv policy、承重 field shape、
host enforcement、retention/correction、named owner 和 acceptance 仍 unknown。`McClintock` 的 `ACCEPT`
不覆盖当前 source；parent readiness 保持 current-source narrow-read pending，直到 child 完成窄回读；
不修改 protocol、不补字段、不建立 runtime mechanism。

## 5. Independent review

`Meitner`（Agent `01a03947-bfd5-7872-b955-736b47992328`）未参与本记录生产，已独立只读复核并
`ACCEPT`。复核经历两轮边界修订：

- 确认 `429/26ec → e8f7/cfe203 → 2ed/f874` 只适用于 contract/executor projection family，
  lifecycle/lineage 的 `00a7/25e` historical edge 另行保留；
- 要求 executor comparability 直接链接 revision-2 applicability 与自身 review record，已补齐；
- 要求 CompletionAction 不得循环声称 current applicability，已明确保留
  `current-applicability-pending`，并定义 protocol/record owner 的下一项直接回读。

该 `ACCEPT` 只覆盖 source provenance、review-family scope 和 projection boundary；不取得
CompletionAction shape、WorkCell protocol、provider/eval、runtime、DeepSeek 或 implementation acceptance。

## 2026-08-25 CompletionAction current-source applicability return

新增 [`evidence-applicability-review-workcell-completion-action-current-source.md`](evidence-applicability-review-workcell-completion-action-current-source.md)，
直接回读当时 current protocol `2ed713fe… / f87422b0…` 的 §4.5、§6.3、§6.4、§6.5、§7.3、§8.1、§16、§17.1
与 §18 checks 3/5；`7240b23… / 513e7ed…` 是其后的 previous current edge，当前 source 为
`fa602faf… / c78876b4…`。`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）独立只读 `ACCEPT`
只覆盖 previous source edge。

该 child 只把 CompletionAction 的 declaration/call/return/observation/check 分层和 named-slot
applicability 回指 previous source；旧 `429/26ec` 仍是 review-time edge。当前 source 的窄回读与独立复核已完成。
CompletionActionObservation 的
完整 shape、identity、retention/correction、host authority、named owner、跨 transport reconciliation
以及 acceptance 仍 unknown。child result 不自动覆盖 parent readiness；本 record 的下一项先恢复为
current-source narrow read，之后才是 owner-backed shape/authority/retention/check/acceptance decision。
