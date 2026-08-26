# WorkCell contract 字段与 host-effect 边界审查

状态：`design-review-round-1 / candidate-proposal / independent-review-complete / acceptance-pending`；
不是协议接受、host/security 授权、record registry、runtime 实现、implementation authorization 或 eval Run。

本记录只审查一个 bounded review unit：WorkCell 的声明字段、宿主授予字段、运行时调用、host
观测与事实记录是否有可消费的单一权威边界。它不重新决定 Binding identity/digest、active
revocation、drain cutoff、Event replay、retry/continue lineage 或 Vercel/DeepSeek 对照条件；这些
由已有 review unit 或后续 owner 处理。

## 1. 来源与当前观察

- **canonical source：** [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)。本轮 review-time
  working-tree fingerprint 为 `git hash-object` 产生的 Git object SHA-1
  `4293057dc1d136fd20ddc7de7144612e458a5b11`，以及 `shasum -a 256` 产生的 raw-file SHA-256
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；两者不是同一种 SHA-1 计算，
  且该 edge 早于 contract projection revision，不是当前 canonical fingerprint。当前 source applicability
  由 [`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
  回接。
- **相关段落：** §4 `WorkCellSpec`、`WorkspaceScope`、`ExecutionRequirements`、`ResourceLimits`、
  `CompletionContract`；§5 `WorkCellBinding`；§6 `WorkCellRunRequest`、`WorkCellExecutionContext`、
  `WorkCellExecutionReturn`、`WorkCellRunRecord`；§7 证据；§8 机械检查；§17.1–17.3 未决关系。
- **已有 review：** `workcell-record-boundary-review.md` 单独处理 RunRecord 与 Binding identity；
  `workcell-lifecycle-review.md` 处理 drain/unknown effect 与 active Binding policy；
  `workcell-observation-lineage-review.md` 处理 Event replay 与 retry/continue lineage。本记录不把
  它们的 unknown 重新包装成字段接受。
- **evidence standing：** `design observation`。当前没有真实 protocol/record consumer、host Run、
  security review、跨 adapter comparison 或 acceptance decision。

## 2. 当前字段分层

当前设计已经表达了一个有用但尚未完成 canonical shape 的分层：

| 层 | 当前对象/字段 | 应回答的问题 | 不应承担的关系 |
| --- | --- | --- | --- |
| declaration | `WorkCellSpec.workspace`、`requirements`、`limits`、`completion` | 这次 bounded work 需要什么条件、限额和完成信号？ | 不授予 host effect，不证明执行或验收 |
| binding/grant | `WorkCellBinding.workspace`、`toolSurface`、`effectPolicy`；`executor` 是执行选择，不是 effect grant | host 实际授予什么范围、工具和效果，并选择哪个 executor？ | 不改写 Spec，不证明调用已发生或目标正确 |
| request | `WorkCellRunRequest.spec`、`bindingRef`、`parent` | 请求哪一个声明和绑定开始哪一次 execution？ | 不重复成为运行事实，不自动触发 retry |
| live call | `WorkCellExecutionContext.requestTool`、`submitCompletionAction` | executor 请求哪一个受控动作？ | 不代表 host 已执行、效果已发生或已验收 |
| execution return | `WorkCellExecutionReturn.completionActionCalls`、`output`、`usage`、`adapterEvidence` | executor 返回了哪些局部调用、产物、usage 和 provider 证据？ | 不等于 host observation、RunRecord 或 acceptance |
| observation/record | `CompletionActionObservation`、`EffectSummary`、`UsageObservation`、`RunRecord` | host/coordinator 观察到什么，哪些不可用，如何长期保存？ | 不把 observation 变成 semantic review 或 acceptance |
| check/review/acceptance | `MechanicalCheck`、`SemanticReview`、`AcceptanceDecision` | 可重复事实、语义判断和权威决定分别是什么？ | 不回写前层事实，不由 `pass` 推出 accepted |

这张表是当前 review 的最小语义核，不是已接受的 schema。

## 3. 观察到的字段压力与边界

### 3.1 declaration 与 grant 的映射仍不够可审计

`WorkspaceScope.commandRequirements` 和 `ExecutionRequirements.tools/features` 表达需求；
`WorkCellBinding.toolSurface` 与 `effectPolicy.command/network/secrets` 表达实际边界。设计文字
已经说“需求不等于授予”，但没有给出跨这些字段的 canonical mapping、拒绝原因的最小 shape 或
缺失/降级的记录载体。

这是一个 **design/auditability hypothesis**，不是已观察到的 host 越权或真实 consumer failure：
当前没有 named consumer 能证明它已经误判。若不补充边界，后续 adapter 可能把需求字段当 grant，
或把 Binding 中的 grant 当作 executor 自己可以扩张的配置；这种可能性不能作为当前实现事实。

### 3.2 Completion contract 的三种关系虽已分名，承重类型尚未落定

当前文字区分 `CompletionAction` declaration、`CompletionActionCall` runtime submission、
`CompletionActionObservation` host/coordinator observation，以及 output/artifact 的 mechanical
checks。这一方向正确，但 `CompletionActionCall` 和 `CompletionActionObservation` 在本文件中只被
引用，没有 canonical shape、identity、source/standing、unknown/unavailable 或与 `maxCalls` 的
确定性检查关系。

因此“完成动作已提交”“host 已观察到调用”“调用符合 contract”目前不能只凭现有字段重建。不能
把 `WorkCellExecutionReturn.completionActionCalls` 当作 host observation，也不能把模型返回的
自然语言当作完成证明。

### 3.3 Effect 与 usage 的 record boundary 尚未可消费

`WorkCellRunRecord` 有 `effects: EffectSummary` 和可选 `usage?: UsageObservation`；协议同时指出
`workspaceDiff` 不足以覆盖 command/network/secret effect，并要求 unknown/unavailable。但本文件
没有定义 `EffectSummary`、`UsageObservation`、相关 effect observation 的 canonical shape、来源、
粒度、digest 或缺失原因。

这使以下区别仍是 unknown，而不是可以由字段名自动推出的事实：

- 未请求 effect、请求但未执行、执行且无变化、执行结果不可确认；
- workspace change、command、network、secret 与 provider-local observation 的分别归属；
- usage 未采集、采集为零、采集延迟和 provider 不支持之间的差异；
- `ResourceLimits` 超限的 mechanical check 与实际 usage observation 的对应关系。

### 3.4 Request 与 record 的引用关系需要与本 review 分开处理

`WorkCellRunRequest` 可以 inline `spec` 或引用 immutable spec，也引用 `bindingRef`；`RunRecord`
当前主要保留 `runId`、`requestId`、`cellId` 及 execution/effect/evidence。Spec identity、spec
digest、request retention 与 record correction 的关系尚未决定，但 Binding identity 已在另一
review unit 中单独处理。本记录只保留这个交叉 unknown，不复制字段提案，也不把 request retention
当成 record retention guarantee。

## 4. 处置比较

### 4.1 保持现状

保留现有文字可以继续进行概念讨论，但不能支持跨 host、record 或 adapter 的机械比较；尤其无法
区分“没有 effect”与“effect unavailable”。作为最终 protocol shape 不充分，作为当前 design
candidate baseline 可以保留。

### 4.2 只补 prompt、skill 或 adapter 约定

不足。需求/授予/观测/检查的区别属于跨 adapter 的协议字段与 owner 边界；若只放在 prompt 或
adapter 约定中，host 和 record consumer 仍不能共同验证，也会把权限语义重新交给自然语言。

### 4.3 复用现有 owner，补最小 canonical field family（当前候选）

这是当前最小有效方向：

1. protocol owner 维持 declaration、grant、call、observation、check、review、acceptance 的
   分层，并为承重类型补出最小 shape；
2. host/security owner 只负责 grant 与 host effect observation，不由 executor 推断授权；
3. record/evidence owner 决定 effect/usage 的来源、粒度、digest、`observed`/`unavailable` 与
   correction/retention 关系；
4. acceptance owner 决定何时这些字段足以被消费，不从字段存在或 mechanical pass 推出接受。

这个候选不新增 queue、registry、gate、retry controller、event bus 或新的 acceptance authority。

### 4.4 新增通用 EffectRecord/ContractRegistry 机制

当前拒绝。没有真实 consumer、crash-surviving obligation 或跨系统 owner 证明需要独立 registry；
把缺少字段 shape 直接变成 registry 会扩大生命周期、迁移、修正和恢复负担，并掩盖 protocol/record
owner 尚未决定的语义。

## 5. 当前最小候选与停止边界

```yaml
item: workcell-contract-field-authority-and-effect-boundary
decision: reuse-existing-owners + rewrite-candidate
owner_class:
  - protocol-owner
  - host-security-owner
  - record-evidence-owner
  - acceptance-owner-unknown
baseline_preserved: yes
observed:
  - declaration/grant/request/record layers are named separately
  - several load-bearing types are referenced without canonical shape
hypothesis:
  - incomplete shapes may cause adapter or consumer boundary confusion
minimum_delta:
  - define a field-authority matrix and minimal typed families before implementation
  - preserve explicit unknown/unavailable and source standing
  - keep Binding identity, lifecycle, replay, lineage and provider comparison as separate review units
rejected:
  - prompt-only or adapter-only authority
  - generic EffectRecord registry
  - runtime gate, queue, retry controller, or new acceptance authority
success_condition:
  - a consumer can distinguish required, granted, called, observed, checked, reviewed and accepted
    without free-text inference
failure_disposition: retain-unknown / no-proposal-now; route unresolved shape to protocol/record owner
implementation_authorized: false
revisit_when:
  - a named protocol/record consumer or host/security owner supplies a field contract
  - a matched fixture must compare effect/usage/unknown behavior across adapters
```

## 6. 证据、owner 与回返

- **mechanical observation：** 对候选 shape 检查字段是否能区分 declaration/grant/call/observation/
  check，并保留 `unknown`/`unavailable` 的原因；这不证明 host 强制执行了权限。
- **semantic review：** 独立 reviewer 判断字段是否把 effect、事实、检查、语义判断和接受关系
  保持分离；review 不取得协议接受。
- **acceptance：** 由明确 protocol/record acceptance owner 决定是否接受字段 family；当前为
  `unknown`。
- **next action：** 若 owner 接受最小 field family，再回写 canonical design；若 owner 拒绝，保留
  unknown 并说明由哪个现有 owner 承担，不能用 registry 或 adapter 私约补齐。
- **覆盖上限：** 本轮最多证明设计字段边界与缺口，不证明 host/security runtime、record retention、
  cross-adapter comparability 或 semantic quality。

## 7. 迭代闭环

- **baseline：** 现有对象分层和命名已形成，但承重 effect/call/usage 类型尚未完整定义。
- **minimum change：** 建立本 review unit，列出字段 authority matrix 和最小 owner 路由；不修改
  canonical protocol，不添加机制。
- **positive result：** 明确当前缺口是 protocol/record field contract 问题，而不是先建 runtime
  mechanism 的理由。
- **regression check：** 不把 `CompletionActionCall` 当 observation，不把 `EffectSummary` 缺省当
  no effect，不把 usage 缺省当 zero，不把 requirements 当 grants。
- **projection：** review 完成后同步 `plan`、`roadmap`、`coverage-audit` 与 `item-ledger`；不 move
  到 `design/`，不进入 `skills/`、`evals/` 或 `experiments/`。
- **下一回返：** 先完成独立 review，再由 protocol/record owner 决定是否补 canonical field shapes；
  在此之前 WorkCell、DeepSeek Harness 和 base implementation 仍保持冻结。

## Independent review

独立 reviewer：Rawls（agent `01a03853-062e-73f0-b428-1649cbeb5e73`）已完成终审；确认字段分层、
observed/hypothetical 区分、owner 路由、unknown/unavailable 与不新增机制边界。该 review 仍未取得
protocol/record acceptance，也没有产生 registry、runtime 或 implementation authorization。

### 历史/迭代回返（默认折叠）

<details>
<summary>展开历史窄回返与适用性记录</summary>

### 2026-08-25：CompletionAction contract 窄回返

从本记录的未决字段中拆出 [`workcell-completion-action-contract-review.md`](workcell-completion-action-contract-review.md)，
只处理 `CompletionActionCall` 与 `CompletionActionObservation`。它把
`submitCompletionAction()` 与 `WorkCellExecutionReturn.completionActionCalls` 定义为同一 logical
submission 的两种 transport view，区分 live host observation、return-only evidence、identity/input
unavailable 与独立 MechanicalCheck；不处理 `EffectSummary`、`UsageObservation`、replay、lineage 或
acceptance。`Hubble` 独立 review `final accept`，但该结果只接受候选 review record，仍需 protocol/
host/coordinator/record/acceptance owner 决定是否回写 canonical protocol。

### 2026-08-25：EffectSummary / EffectObservation 窄回返

从本记录的 effect boundary unknown 中拆出 [`workcell-effect-summary-contract-review.md`](workcell-effect-summary-contract-review.md)，
只处理 `EffectSummary` 与 `EffectObservation` 的最小事实 envelope。候选把 `EffectSummary` 保持为
run-bound projection，把 observation 的 `source`、`effectRef`、`phase`、`outcome`、`confirmation` 与
`unavailable reason` 分开；`state: observed` 只表示 observation envelope 可用，不表示 effect outcome
已确认，只有 host observation 可以支持 `confirmation: confirmed`。executor report、adapter evidence、
空 observation、取消后的未知 effect、retry child 与 late evidence 均不被升级为 no-effect 或 host fact。
`Hubble` 独立 review `accept`，但该结果只接受候选 review record；不改变 canonical protocol，不创建
effect registry、runtime controller、security guarantee、retention authority 或 acceptance carrier。

### 2026-08-25：UsageObservation contract 窄回返

从本记录的 usage boundary unknown 中拆出 [`workcell-usage-observation-contract-review.md`](workcell-usage-observation-contract-review.md)，
只处理 `UsageObservation`/`UsageMetric` 的实际使用事实 envelope。候选将 metric kind、measurement
scope、source compatibility、measurement bound 和 unavailable reason 与 `ResourceLimits` 分开；
`value = 0` 不由缺省推导，provider report 不升级成 host limit fact，`resource-limit` 仍由独立
`MechanicalCheck` 表达。`Hubble` 已完成两轮只读审阅并最终 `accept`，但该结果只接受候选 review
record；不改变 canonical protocol，不创建 meter、billing、enforcement controller、retention authority
或 acceptance carrier。

### 2026-08-25：observation / record integration 回返

在三个窄候选完成独立 review 后，新增 [`workcell-observation-record-integration-review.md`](workcell-observation-record-integration-review.md)，
只检查 CompletionAction、EffectSummary、UsageObservation 与 `ExecutionOutcome`、`MechanicalCheck`、
`EvidenceRef` 在同一 `RunRecord` 中的组合。它确认当前唯一安全的跨字段 join 是 `runId`，不把 call、
effect、usage、check identity 或 source 互相冒充，并显式保留 `retry-of`/`continued-from` 作为跨 run
lineage 而非 field correlation。`Hubble` 独立 review `accept`；该结果只接受 integration record，
route 给真实 protocol/record/acceptance owner，不新增总 status、dedup registry、meter、runtime 或
implementation authorization。

### 2026-08-25：CommandGrant argument-shape child boundary

从本记录的 declaration/grant boundary unknown 中拆出
[`workcell-command-grant-boundary-review.md`](workcell-command-grant-boundary-review.md)，只处理
`CommandRequirement.argumentShape`、`WorkCellBinding.toolSurface`/`ToolGrant`、
`EffectPolicy.command`/`CommandGrant`、`requestTool`、actual host call observation 和 command/effect
record 的分层。它保留 C1–C4 反例，并把 failure code 与 `observed: unavailable` / factual `unknown`
分开；不决定完整 argv/shell schema，也不把 exact argv 变成 filesystem confinement。

`Kepler` 独立 review `ACCEPT` 的是原始 boundary record；`Dewey` 已独立复核本 child projection
consistency 并 `ACCEPT`。这两者都不改变本 field-boundary review 的 `acceptance-pending`、canonical protocol、host security
policy、runtime 或 implementation standing。下一回返仍由 host/security 与 protocol/record/evidence
owner 分别判断 grant policy、call/observation shape、failure/retention；未取得前保持 `route-to-owner`。

### 2026-08-25：current-source applicability return

本 review 的 `429/26ec` edge 仍只作 review-time provenance；当前字段权威适用性由
[`evidence-applicability-review-workcell-contract-field-authority-current-source.md`](evidence-applicability-review-workcell-contract-field-authority-current-source.md)
直接回读 `2ed/f874` 并经 `McClintock` 独立 `ACCEPT`。该 return 只确认 declaration/grant/request/call/
return/observation/check/review/acceptance 的边界仍适用当前 source，不接受本 review 的 canonical field
shape、requirements→grant mapping、host enforcement、retention/correction、named owner 或 protocol。

### 2026-08-25：SemanticReview / AcceptanceDecision child boundary

从本记录的 check/review/acceptance boundary 中拆出
[`workcell-semantic-review-boundary-review.md`](workcell-semantic-review-boundary-review.md)，只处理
`MechanicalCheck`、`SemanticReview`、`AcceptanceDecision` 和 next action 的 subject、rubric、snapshot、
findings、blocked/correction/supersession、basis 与 authority 分层。S1–S5 只作设计反例，不定义业务
rubric，也不把 review/check/pass/complete 变成 accepted。

`Chandrasekhar` 已独立 review `ACCEPT` 原始 planning boundary；本 child projection 的独立 provenance
review 仍待补齐。它不改变本 field-boundary review 的 `acceptance-pending`、canonical protocol、Principal
acceptance、runtime 或 implementation standing；下一回返仍由 semantic-review/rubric、protocol/record/
evidence 与 acceptance owner 分别判断。

</details>
