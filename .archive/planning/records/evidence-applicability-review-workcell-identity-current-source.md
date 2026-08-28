# WorkCell identity review 的 current-source applicability

状态：`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`；不是协议接受、字段接受、registry、runtime、eval Run 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象、来源与边界

本记录只检查两个已有 bounded review unit 在当前 canonical protocol 上是否仍可回读：

- [`workcell-record-boundary-review.md`](workcell-record-boundary-review.md)：RunRecord 如何关联 admission Binding identity；
- [`workcell-spec-identity-boundary-review.md`](workcell-spec-identity-boundary-review.md)：request/RunRecord 如何保留采用的 Spec identity。

这不是把两个 review unit 合并成一个 schema。它只做 source/applicability reconciliation：确认旧 review
观察、当前 protocol baseline 和仍开放的 owner decision 之间的关系。Binding identity、Spec identity、
lineage、retention、digest canonicalization 和 registry authority 仍分别由原 review unit 或 protocol
owner 处理。

当前 canonical source [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 的 fingerprint 为：

- Git object SHA-1：`fa602fafd444d1f738c20ac4b4ec16c9e4d8654e`；
- raw-file SHA-256：`c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b`；
- 1188 lines。

`7240b23… / 513e7ed…` 是本 child 既有回读所依据的 previous current-source edge；
`4293057d… / 26ec714f…` 是更早的 contract projection review-time edge。两者现在都只保留为历史
provenance，不再当作 current canonical fingerprint。最新 source 又收窄了 public Run state 与 parent
relation；本次已对受影响 section 完成窄回读，以下结论把不变观察与两项 source-level simplification
分开，不把它们升级为字段或协议 acceptance。

## 2. 当前 source 回读结果

| source section | current observation | applicability standing |
| --- | --- | --- |
| §5.1 `WorkCellBinding` | host 在 admission 物化带 `bindingId` 与 digest 的 immutable Binding snapshot；Binding 是 host-owned effect boundary，不能由 Spec 或 executor return 代替 | `current-source-supported`；digest 来源/格式/计算 owner/retention 仍 unknown |
| §6.1 `WorkCellRunRequest` | `spec` 仍允许 inline 或 `{ specRef, digest }`；`bindingRef` 仍为 `{ bindingId, digest }`；`requestId`、`runId` 和 parent relation 分开；当前 parent relation 只为 `retry-of` / `continued-from`，generic Task/WorkItem derivation 留在上游 | `current-source-supported`；inline/reference 选择、Spec identity projection 和 Binding record projection 仍未接受 |
| §6.5 `WorkCellRunRecord` | 当前 canonical example 仍有 `runId`、`requestId`、`cellId`、execution/runtime/evidence 等，但没有显式 `bindingRef` 或 Spec identity slot；§6.2/§6.5/§9.2 将 terminal execution state 后的 record finalization 与 public Run state 分开，不改变该 record projection boundary | `current-source-supported`；该 discrepancy 仍是 design/auditability hypothesis，不是实际 consumer failure |
| §8.2 / §11.1 | retry/continue 产生新 run；当前 source 只保留 `retry-of` / `continued-from`；executor comparison 固定非 executor 约束，各变体拥有自己的 immutable Binding identity | `current-source-supported`；lineage、canonical equality 和 eval fixture 仍由独立 owner/consumer 决定 |
| §17.2 / §18.1 / §18.12 | Spec inline/reference、Binding identity、identity/lineage counterexamples 仍被列为开放或待检验关系 | `current-source-supported`；开放项未被本次回读升级为 acceptance |

由此可确认：两个旧 review 的核心 boundary observation 可以回指当前 source；source revision 没有
自动解决 `RunRecord → Binding identity` 或 `RunRecord → Spec identity` 的载体选择。当前仍不存在
named record/evidence consumer、retention owner、跨 adapter comparison fixture 或 acceptance decision。

## 3. 当前结论与最小处置

- **previous applicability：** 两个 review unit 的 baseline/边界观察在 previous source 上为
  `current-source-supported`；其候选字段、digest 语义、retention、correction 和 owner policy 仍是
  `acceptance-pending / unknown`。
- **当前 source applicability：** 受影响边界已完成窄回读并为 `current-source-supported`，且本次
  exact candidate 已由独立 reviewer 复核；该结果只说明 source boundary 可回指，不接受字段、协议
  或 owner decision。
- **最小处置：** `retain-current-source-boundary / reconcile-details-as-open / route-to-protocol-record-and-spec-owners / no-rerun-now`。
  保留旧 review lineage，不重写两个旧 review，也不在本记录中合并 `bindingRef` 与 Spec identity。
- **允许效果：** 更新 readiness、item ledger、plan、roadmap 和 evidence-maintenance 的 source/
  applicability projection；在 named owner/consumer 出现后，对对应 review unit 另行形成 source revision
  或 canonical shape decision。
- **禁止效果：** 不修改 `design/work-cell-protocol.md`；不添加 `bindingRef`、Spec identity slot、digest
  algorithm、registry、fetch、retention service、lineage store、host policy、adapter、Run 或实现。

## 4. Owner return 与出口

| owner class / consumer | 必须返回的决定 | 当前证据上限 |
| --- | --- | --- |
| protocol + record/evidence owner | RunRecord 是否需要结构化 Binding identity projection；若不需要，如何在 request/evidence 不可取时表达 structured `unknown` | 只能支持当前 boundary observation，不能代替 acceptance |
| Spec producer/versioning + protocol/record owner | inline/reference 是否只是传输选择，以及采用的 Spec identity 如何在约定保留范围内恢复/比较 | 不能决定 canonicalization、registry 或永久 retention |
| host/security owner | Binding identity 的来源和 snapshot authority 是否能被 record 引用，同时不把 record 变成 grant authority | 不能从 `bindingId` 推出实际权限执行 |
| eval/comparison owner | 是否存在真实跨 adapter consumer，以及比较中 Spec/Binding identity 的固定维度 | 当前无 matched Run 或 canonical equality contract |

当前 child exit 只是：每个旧 review 都能回指当前 source，且旧 edge 被正确标为 historical；它不关闭
WorkCell acceptance、§17.2 open items、provider comparison 或 implementation prerequisite。若 owner
不能形成选择，保留 `retain-unknown`/`no-proposal-now`，不继续叠加字段。

## 5. Revisit 与 evidence standing

- **revisit：** canonical protocol、两个 review unit 的 source identity、named record/spec consumer、
  retention/correction policy、跨 adapter fixture、digest/canonicalization contract 或 acceptance owner
  变化时重开；若某字段开始承担 lineage、effect authority 或 registry lookup，拆成新的 review unit。
- **证据：** 当前 source section read、旧 review 的 review-time edge、source provenance reconciliation；
  没有真实 Run、record consumer、host security acceptance、matched comparison、runtime guarantee 或实现。
- **previous-source 最高 standing：** `source-applicability-reconciled / design-boundary-observed / acceptance-pending`；
  current source 的最高 standing 为 `source-revision-observed / current-source-supported /
  applicability-reconciled / independent-review-complete / acceptance-pending`。
  source applicability 的收敛不等于 candidate contract、protocol acceptance 或 owner-backed decision。

## Independent review

本次窄回读由 Main 按当前 canonical source 完成；`Hooke` 已独立复核本次 exact candidate。
`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）的 `ACCEPT` 只覆盖上一 source edge 上的
§5.1/§6.1/§6.5/§8.2/§11.1/§17.2/§18 回指、旧 hash 的 historical lineage 和两个 review unit 的
分离；它不覆盖本次 `fa602faf… / c78876b4…` source。

`Hooke`（Agent `01a03ad0-e882-7110-9b35-d1d3c33570f1`）随后独立只读复核并 `ACCEPT` 本次 exact
candidate：确认 raw SHA-256、1188 行、§6.1 parent relation、§6.2/§6.5/§9.2 record finalization
回指以及 Binding/Spec identity 的 unknown 边界准确。该 `ACCEPT` 只覆盖 current-source applicability、
provenance 和 projection boundary，不取得字段、协议、registry、runtime 或实现接受权。
