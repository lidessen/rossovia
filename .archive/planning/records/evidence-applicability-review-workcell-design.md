# WorkCell 设计源适用性回读

状态：`source-edge-reconciled / historical-review-drift-observed / independent-review-complete / acceptance-pending`；
不是 WorkCell protocol acceptance、设计阶段转换、eval Run、runtime/registry 或实现授权。

本记录的 current-edge reconciliation 截止于 executor wording revision 之前；其 `26ec714f…` 是当时的
current edge，不应被读取为当前 canonical fingerprint。executor revision 后的适用性由
[`evidence-applicability-review-workcell-design-revision-2.md`](evidence-applicability-review-workcell-design-revision-2.md)
承载；contract projection revision 后的 named-slot applicability 由
[`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)
承载。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录只检查现行 WorkCell design candidate 与既有 A/B/C/D、record-boundary、contract-field review
之间的 source applicability。它不重写旧 review、不重跑模型、不恢复假定的旧 source snapshot，也不
把当前文件的 hash 一致写成设计语义已接受。

## 1. 当时 canonical source edge 与检查范围

canonical source 是 [`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本记录当时
可回读的 source edge 为：

- `git hash-object` SHA-1：`4293057dc1d136fd20ddc7de7144612e458a5b11`；
- `shasum -a 256` raw-file SHA-256：`26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；
- 当时长度：`1160` 行。

本轮检查的对象是：

1. A/B：[`workcell-lifecycle-review.md`](workcell-lifecycle-review.md)；
2. C/D：[`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md)；
3. 共同 fixture 计划：[`workcell-open-relations-review.md`](workcell-open-relations-review.md)；
4. RunRecord identity：[`workcell-record-boundary-review.md`](workcell-record-boundary-review.md)；
5. 字段 authority：[`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md)。

本记录的 source check 是文件边缘的可重建性检查；它不判断任何 provider、host、security、record
retention、replay 或 acceptance 行为是否成立。

## 2. Source edge reconciliation

| review record | frozen/source edge | record-time current edge | 当时适用性 | 影响 |
| --- | --- | --- | --- | --- |
| A/B lifecycle | `design/work-cell-protocol.md` frozen raw SHA-256 `25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272`；记录自身 frozen SHA-256 `841787451b4c238c357dd1a65aaa2155469c8e44f7ad74ad97aa06093cbff2c5` | record-time protocol `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；review `defd78ec0f8bdaca9a9bad1f8dda96fe33af22a9d01d9f675e91927716ea0c90` | `source-edge-drift / current-applicability-uncertain` | A/B 的反例与 `retain-unknown` 仍是历史 design observation；不能直接声称覆盖当前 protocol wording |
| C/D observation/lineage | protocol 同一 frozen raw SHA-256 `25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272`；记录自身 frozen SHA-256 `7b1e9ba2647d0ef9621149dbe51dc534a5edc607898ed62329cc1dd47541dd00` | record-time protocol `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；review `4b7001ce08a3a0e7ae75237e2477e12d844c07baedd04c25f0bd0d3e9181f711` | `source-edge-drift / current-applicability-uncertain` | C/D 的 observation-only、lineage unknown 和 provider-session 排除仍保留为历史判断；不能直接声称当前字段已被复核 |
| open-relations fixture plan | 文件自身没有内嵌 frozen raw fingerprint；既有 applicability record 记录 frozen/current 同值 `39075760b3f1fcd96267cd230c47d10535d252ac45bc0957cd81d32ce4057bcc` | record-time current review file 同为 `39075760b3f1fcd96267cd230c47d10535d252ac45bc0957cd81d32ce4057bcc`；protocol 见上 | `record-time-source-edge-match / applicability-limited` | 继承的 edge 只支持 source bookkeeping；计划本身仍不能作为某个 protocol revision 的语义 acceptance evidence |
| RunRecord binding identity | record-time protocol raw SHA-256 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e` | record-time protocol 同值；review raw SHA-256 `41e432f42f8deae5f5585c357be25da28b0c6bfcc1d8c723f119fd0ad97f284d` | `record-time-source-edge-match` | 该 review 的 design-candidate standing 可继续回读；仍不等于 `bindingRef` acceptance、retention 或 security guarantee |
| contract field authority | record-time protocol raw SHA-256 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e` | record-time protocol 同值；review raw SHA-256 `0adcf6b1606ae487c9c6147fb9a117e97ff471974000abd25411ccef19252a2a` | `record-time-source-edge-match` | 字段 owner/边界 review 仍适用；`CompletionActionObservation`、`EffectSummary`、`UsageObservation` 等 canonical shape 仍待 owner 判断 |

`source-edge-drift` 只说明冻结来源与当时文件不同，不说明差异一定改变了某一条语义；由于旧
snapshot 不在当前可回读链中，本轮不能进一步归因。相反，`source-edge-match-observed` 只说明
review 读取的 protocol 文件与当时 raw fingerprint 相同，不把 review verdict 写成 acceptance；当前
canonical source 与后续 applicability 由 revision-2、current-source child 和 contract projection record 承载。

## 3. 当前 standing 与最小处置

```yaml
source: design/work-cell-protocol.md
source_identity_at_record_time:
  git_sha1: 4293057dc1d136fd20ddc7de7144612e458a5b11
  raw_sha256: 26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e
check: post-freeze source-applicability reconciliation (historical pre-executor edge)
observed:
  - A/B and C/D frozen upstream edges drift from the record-time source
  - record-boundary and contract-field review edges matched the record-time source
  - old source snapshot and named protocol/record-retention/eval owners are unavailable
standing: source-edge-reconciled / historical-review-drift-observed / acceptance-pending
disposition: retain-design-observation / no-rerun-now / recover-before-current-claim
implementation_authorized: false
```

最小处置是保留所有旧 review 与当前 source，不倒写旧 hash，不把 A/B/C/D 旧结论删除或升级；在
当前 planning projection 中将 A/B/C/D 的 current applicability 保持 `uncertain`，将
record-boundary/contract-field 标为 source-edge match 但仍 `acceptance-pending`。不创建新 Event
bus、replay store、lineage registry、retention service、host fake、adapter 或 implementation plan。

## 4. 迭代闭环与回返

- **baseline：** 既有 review 各自保存了一个 source fingerprint，但部分 fingerprint 与当前
  protocol 不同；旧记录已有 `independent-review-complete`，却不能自动变成当前 source review。
- **observation：** 当前 source edge 可以逐文件重算；A/B/C/D 的旧 snapshot 不可从当前工作树
  直接回读，record-boundary 与 contract-field 的 protocol edge 可回读。
- **minimum change：** 新增本 source-applicability record，按对象保留 match/drift/unknown；不
  改 canonical design、不运行新模型、不覆盖历史 record。
- **接受上限：** 只支持 source applicability bookkeeping；不支持 protocol semantic acceptance、
  matched behavior、runtime applicability、replay/recovery guarantee 或 implementation readiness。
- **reopen：** 任一真实 protocol/host-security/record-evidence owner、named replay/recovery
  consumer、可恢复旧 snapshot 或新的 current-source review card 出现时，分别重开 A/B/C/D；不得用
  一次总 review 把四个不同 owner 的关系合并关闭。`workcell-record-boundary-review.md` 与
  `workcell-contract-field-boundary-review.md` 继续分别沿 protocol/record/evidence/host-security
  owner 路径返回；它们的 source match 不自动触发 acceptance，也不并入 A/B/C/D 的 reopen。
- **停止：** 若没有旧 snapshot、consumer 或 owner，维持 `historical-review-drift-observed /
  current-applicability-uncertain`，不为了填 ledger 重跑或补 synthetic Run。

## 5. 当前阶段影响

- WorkCell 仍是 design candidate，A/B/C/D 仍为 owner/consumer 未定的 bounded design unknown；
  record-boundary 与 contract-field review 的 source match 不改变其 acceptance-pending standing。
- `phase-complete` 仍为 `not-established / continue`；bounded-next-stage clarification allowance
  仍只允许 source/standing、反例、fixture 和有限 semantic review。
- DeepSeek Harness 工作系统、provider comparison、base/runtime、adapter/executor 和用户 harness
  构想实现仍等待 WorkCell design acceptance，不因本次 source check 提前开放。
- 本记录不产生新 eval Run；历史 mechanism-design round 中已经登记的 stale/recovery standing 保持
  不变，本记录只是把同一 source drift 对 WorkCell review family 的影响逐项显式化。

## 6. 独立语义与证据审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 protocol acceptance、阶段转换、runtime、record-retention 或实现授权。

初轮指出两处最小问题：open-relations 的既有 inherited source edge 未被表达，以及
record-boundary/contract-field 的独立 reopen 路径未显式写出。修订后复核结论为 `final accept`，确认：

- source drift 不被误写成语义变化，source match 不被误写成 review/protocol acceptance；
- open-relations 的 frozen/current 同值 edge 被正确保留为 bookkeeping evidence；
- record-boundary 与 contract-field 的 owner-return 不并入 A/B/C/D；
- no-rerun、stop、phase、WorkCell/DeepSeek/base/runtime/implementation freeze 边界成立。

该 `final accept` 仅接受本 applicability record；当前 standing 仍为 `acceptance-pending`，无需新 Run
或协议实现。
