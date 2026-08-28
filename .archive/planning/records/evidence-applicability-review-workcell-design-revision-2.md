# WorkCell 设计源适用性回读：executor wording revision（pre-contract projection）

状态：`source-revision-observed / current-applicability-reconciled / independent-review-complete / acceptance-pending`；不是
WorkCell protocol acceptance、matched eval、runtime guarantee 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录承接 [`evidence-applicability-review-workcell-design.md`](evidence-applicability-review-workcell-design.md)，
只处理一次有界的 canonical wording revision：将完整 `WorkCellBinding` 的 executor identity 与
executor comparison 的固定变量明确分开。它不重写旧 review、不创建新 Run、不接受 provider，也不为
旧 review 补造 current-source 证据。

## 1. Source revision

当前 canonical source：[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)。本次 executor revision
后、contract projection revision 前的 working-tree fingerprint 为：

- Git object SHA-1：`e8f7f71344c9b2d7d8aa17457202cc7652f15d3d`；
- raw-file SHA-256：`cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3`；
- 当时长度：`1173` 行。

revision 前 source fingerprint 为 Git SHA-1 `4293057dc1d136fd20ddc7de7144612e458a5b11`、raw SHA-256
`26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`。

本次只修改 design wording/diagram：

1. §5.1 明确 `executor` 是 Binding snapshot 的 identity dimension，不是 capability grant；
2. §11.1 从“同一完整 Binding”改为“同一 Spec + 相同的非 executor Binding 约束”，并明确每个
   executor 变体各自物化 immutable Binding；
3. §12.2、§17.1、§18.2 对齐该关系，保留同类 `WorkCellRunRecord` 的消费标准；
4. 没有新增字段、Binding 类型、registry、queue、lifecycle state、retry controller、provider
   preference 或 implementation code。

因此这是 `rewrite`，不是 mechanism addition；但 source fingerprint 已改变，任何旧 review 是否适用
当前 source 必须重新标记，不能由文字相似或原 review verdict 自动继承。

## 2. Applicability matrix

| review family | revision 前 edge | 对当前 revision 的判断 | 当前上限 |
| --- | --- | --- | --- |
| A/B lifecycle | frozen protocol 与 revision 前 source 已 drift | 仍是 pre-revision design observation；未重新读取当前 wording | `historical/pre-revision / current-applicability-pending` |
| C/D observation/lineage | frozen protocol 与 revision 前 source 已 drift | 仍是 pre-revision design observation；revision 未改变其主对象，但未取得 current-source review | `historical/pre-revision / current-applicability-pending` |
| RunRecord binding identity | review 曾与 revision 前 source match | 当前 source 已变为 revision 后 fingerprint；旧 review 需标为 pre-revision edge，不能直接声称 current match | `pre-revision-source-match / current-applicability-pending` |
| contract field authority | review 曾与 revision 前 source match | 同上；本次 revision 没有改 field shape，但旧 source edge 不再是当前 source match | `pre-revision-source-match / current-applicability-pending` |
| executor comparability | review 在 revision 前 source 上识别并接受 wording candidate | candidate 已回写 canonical design；需要独立 reviewer 对当前 revision 的 source fidelity 和边界复读 | `candidate-rewritten / current-source-review-pending` |
| open-relations planning projection | 其自身文件 edge 未因 protocol wording 改写 | 仍是 planning projection；不能代替当前 protocol review | `projection-current / applicability-limited` |

`pre-revision-source-match` 只表示旧 review 当时读取的文件与 revision 前 source 相同；它不表示旧
结论错误，也不表示 revision 后 source 已被复核。`current-applicability-pending` 保留当前 source
适用性未知，不倒写旧 review 或自动降格其历史 design observation。

## 3. 最小处置

```yaml
source: design/work-cell-protocol.md
revision: executor-comparability-wording
observed:
  - full Binding identity includes executor selection
  - comparison wording now distinguishes non-executor fixed constraints from Binding identity
  - no new mechanism or runtime object was added
affected:
  - prior WorkCell review families need current-source applicability labels
  - executor comparison candidate needs post-revision source review
standing: source-revision-observed / current-applicability-pending / acceptance-pending
disposition: retain-old-reviews / reconcile-current-source / no-rerun-now
implementation_authorized: false
```

允许范围：更新 applicability/readiness/planning projection，或针对当前 source 开一个窄 review；保留
旧 review 的 frozen edge 和证据上限。

禁止范围：不修改旧 review 伪造 current applicability；不重跑 A/B/C/D、provider comparison 或
历史 eval；不创建 registry、event bus、record-retention service、adapter、executor 或 runtime。

## 4. 回返与出口

当前最小回返是独立复读 revision 后的 §5.1、§11.1、§12.2、§17.1、§18.2，确认：

1. revision 只澄清 comparison identity，不把 executor 变成新的权限 authority；
2. 每个变体独立 Binding 与“同类 RunRecord”关系没有偷偷承诺 canonical equality、digest 算法或
   eval result；
3. A/B/C/D、RunRecord identity、contract-field review 的旧结论仍按各自 source edge 保留 unknown；
4. canonical source revision 不等于 protocol acceptance、provider choice 或 implementation authorization。

独立复读通过后，本记录可关闭为 `source-revision-reconciled / independent-review-complete /
acceptance-pending`；若复读发现 wording 改变了其他 owner 的关系，停止回写并为新压力开独立 review
unit。若没有 named protocol/eval/record owner，仍保留 acceptance pending。

## 5. Evidence standing

当前证据只支持 source revision、design wording 和 applicability bookkeeping；没有 matched Run、
provider/harness effect attribution、protocol acceptance、record retention guarantee、replay/recovery
guarantee 或实现授权。

## Independent review

`Dewey`（Agent `01a0394d-c4ad-7e10-a91d-68a232d7ba24`）完成只读独立复核并 `ACCEPT`。复核确认：

- 当时的 protocol fingerprint `e8f7f713… / cfe203ba…` 与本记录、当时的 readiness §6.2 和 comparability §8 一致；该 edge 现标为 pre-contract projection historical source；
- §5.1、§11.1、§12.2、§17.1、§18.2 只澄清 executor identity 与非 executor comparison constraints，
  没有新增字段、机制、lifecycle、权限或实现；
- 每个 executor 变体保持独立 immutable Binding，同类 RunRecord 只是消费/比较边界；canonical
  equality、digest/canonicalization、eval owner/consumer 和 matched Run 仍为 unknown；
- applicability matrix 正确把旧 review 标为 pre-revision，旧 `ACCEPT` 没有被投影为 current protocol
  acceptance；plan、roadmap、item-ledger 保留 current-applicability-pending/uncertain、acceptance
  pending 和 implementation freeze。

该 `ACCEPT` 只覆盖 source/revision applicability 与 boundary projection，不构成 WorkCell protocol、
eval、provider、runtime 或 implementation acceptance。

## 2026-08-25 A/B/C/D current-source child review

[`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md)
已在本 revision 后直接回读 A/B/C/D 所依赖的当前 source sections。结果是四项的 lifecycle、Binding、
typed Event、new-run/parent relation 和 §18.9–§18.12 baseline 均可从当前 source 回指；四项的 cutoff、
active revocation、replay、retention 和 recovery policy 仍为 `retain-unknown`，没有把 revision-2 的
executor wording review 扩大为 A/B/C/D acceptance。

该 child review 只把 A/B/C/D 从 source-level `current-applicability-pending` 推进到
`current-source-supported / applicability-reconciled`；semantic/policy applicability、owner decision、
protocol acceptance 和实现冻结不变。`Halley` 已独立只读 `ACCEPT` 该 child record 的修订完整性。

## 2026-08-25 contract field authority current-source child

revision-2 applicability matrix 中的 `contract field authority` 已由
[`evidence-applicability-review-workcell-contract-field-authority-current-source.md`](evidence-applicability-review-workcell-contract-field-authority-current-source.md)
直接回读当时 current protocol `2ed713fe… / f87422b0…`；其后 previous source 为 `7240b23… / 513e7ed…`，
当前 source 为 `fa602faf… / c78876b4…`。`McClintock` 的独立只读 `ACCEPT` 只覆盖该 previous source
edge。该 child 只把
declaration/grant/request/call/return/observation/check/review/acceptance 的 source boundary 推进为
`current-source-boundary-observed / applicability-reconciled / acceptance-pending`；requirements→grant
mapping、field shape、host enforcement、retention/correction、named owner 和 protocol acceptance 仍 open。
因此 revision-2 的历史 source edge 不被倒写为 current canonical shape，也不触发 protocol edit、Run、
provider comparison 或实现。
