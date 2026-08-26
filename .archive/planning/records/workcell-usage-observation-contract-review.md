# WorkCell UsageObservation contract 候选

状态：`design-review-round-1 / candidate-proposal / independent-review-complete / acceptance-pending`；
不是 protocol acceptance、resource meter/runtime controller、cost accounting、limit enforcement、
semantic review、completion acceptance 或 eval Run。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录从 [`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md) 中
拆出一个单一 bounded review unit：只为现有 `WorkCellExecutionReturn.usage?: UsageObservation`
和 `WorkCellRunRecord.usage?: UsageObservation` 提出最小的实际使用事实 envelope。它不决定
`ResourceLimits` 的授权、运行时计量实现、费用结算、超限处置、重试、保留或验收。

## 1. 当前来源与缺口

- canonical source：[`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本轮 review-time
  `git hash-object` SHA-1 为 `4293057dc1d136fd20ddc7de7144612e458a5b11`，raw SHA-256 为
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 早于 contract projection
  revision，不是当前 canonical fingerprint。当前 named-slot applicability 由
  [`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)
  回接。
- 相关段落：§4.4 `ResourceLimits`、§6.4–§6.5 executor return/RunRecord、§7.2–§7.3
  `EvidenceRef` 与 observed/unavailable standing、§8.1 `resource-limit` check、§9.2 cancellation、
  §9.3 retry、§11 adapter surface、§12.3 metrics、§17.2 和 §18.4/§18.6。
- 当前设计已区分限额和实际使用，也要求 usage、cached tokens、model fingerprint、网络效果和
  adapter identity 不把未知当作零值；但没有定义 usage metric 的种类、scope、来源、测量精度、
  unavailable reason 或与 `ResourceLimits`/`MechanicalCheck` 的引用关系。
- 因此目前不能从 `usage` 缺省或 provider 返回值推出：实际使用为零、未采集、延迟、provider 不支持、
  host 未观察、部分运行已使用，或某项 limit 已通过/超限。

## 2. 对象 identity、来源、目的地与 owner

| 对象 | 最小身份 | 来源 / 产生者 | 主要 consumer / owner | 回答的问题 | 不承担 |
| --- | --- | --- | --- | --- | --- |
| `ResourceLimits` | Spec/Binding 中属于本次 bounded work 的 limit declaration/grant | caller 声明、host binding 解析 | protocol/host owner | 本次运行允许的硬边界是什么？ | 不表示实际消耗或通过 |
| `UsageMetric` | 关联 `runId`、metric kind 和 measurement scope | host observation、executor report 或 adapter evidence | coordinator 记录；record/evidence 保留 | 在某个 scope 上观察/报告了多少实际使用？ | 不决定 limit、费用或语义质量 |
| `UsageObservation` | 属于一个 `WorkCellRunRecord.runId` 的 metric projection | executor return 可提供局部 report；host/coordinator 汇总记录 | record/evidence、比较和 check consumer | 哪些 usage metric 可用，哪些不可用？ | 不创建计量器，不保证完整覆盖 |
| `MechanicalCheck` | check 自身 `checkId`，引用 limit 与 usage metric | coordinator/check owner | lifecycle/record/eval consumer | 该可观测 metric 是否满足 limit predicate？ | 不变更 usage，不取得 acceptance |
| `EvidenceRef` | evidence 的 uri/digest/kind | host、executor、adapter | record/evidence owner | 大体积或 provider-specific usage 证据在哪里？ | 不成为 usage authority 本身 |

source 不是统一的“可信等级”：`host-observation` 可以支持 host clock、host 计数或 host 输出边界；
`executor-report`/`adapter-evidence` 可以支持 provider 自报 token 或 session usage，但不能单独证明
host 已计量的 `maxToolOutputBytes`、实际 wall time 或 limit enforcement。若 metric 的 source 不能满足
对应 scope，保留 `unavailable` 或有限的 lower/upper bound，不升级为 exact host fact。

## 3. 最小候选 shape

以下只是交给 protocol/host/coordinator/record owner 的候选，不改写 canonical protocol：

```ts
type UsageObservation = {
  metrics: UsageMetric[];
  evidence?: EvidenceRef[];
};

type UsageMetricKind =
  | "steps"
  | "duration-ms"
  | "tool-output-bytes"
  | "output-tokens"
  | "provider-input-tokens"
  | "provider-output-tokens"
  | "provider-cached-input-tokens";

type UsageMetricProvenance =
  | { scope: "run"; source: "host-observation" }
  | { scope: "provider-report"; source: "executor-report" | "adapter-evidence" };

type UsageMetric =
  | {
      state: "observed";
      runId: string;
      kind: UsageMetricKind;
      provenance: UsageMetricProvenance;
      value: number;
      measurement: "exact" | "lower-bound" | "upper-bound";
      observedAt: Timestamp;
      evidence?: EvidenceRef[];
    }
  | {
      state: "unavailable";
      runId: string;
      kind: UsageMetricKind;
      provenance: UsageMetricProvenance;
      reason: StructuredUnavailableReason;
      observedAt?: Timestamp;
      evidence?: EvidenceRef[];
    };
```

`StructuredUnavailableReason` 是候选占位类型，不是当前 canonical protocol 的新定义。候选只固定
以下窄语义：

- `UsageObservation` 是 run-bound fact projection；每个 metric 独立表达 `observed` 或 `unavailable`。
  `metrics` 为空不表示 usage 为零，也不表示本次没有执行；没有 metric 的原因必须由来源/evidence
  或 unavailable observation 诚实表达。
- `value: 0` 是一个已被相应 source 在相应 scope 观察到的零值；它不能由缺省、空数组、provider 不支持
  或延迟采集推导。延迟、未采集、provider 不支持、scope 不适配和部分可用应使用结构化 reason，
  不伪造零值。
- `measurement` 表示当前 source 在该 scope 上的测量关系。`exact` 不是对物理世界的无限保证，
  只表示该 source 声称的范围内没有保留的上下界；`lower-bound`/`upper-bound` 不得被 check consumer
  当作 exact usage。候选不引入估算值；估算若成为独立产品/成本对象，应另建 review unit。
- `provenance` 是显式的 source/scope compatibility relation：`scope: "run"` 只能由
  `source: "host-observation"` 支撑；`scope: "provider-report"` 必须保留
  `source: "executor-report"` 或 `source: "adapter-evidence"`。不兼容的 source/scope 组合必须记录为
  `unavailable`，或使 `resource-limit` check 为 `unknown`/`not-run`，不得合并成 exact host metric。
  provider-specific token breakdown 可以通过 `EvidenceRef(kind = "provider-usage")` 保留，是否进入
  更多 canonical kind 仍由 adapter/protocol owner 决定。
- `source` 区分事实来源，不代表 acceptance、权限或安全保证。executor return 中的 usage 是局部报告；
  host/coordinator 可以记录 provider report，但不得把它当成 host limit enforcement 的证明。
- `ResourceLimits` 与 `UsageObservation` 保持正交。是否超限、是否因超限终止、check 无法运行或结果
  unknown，均由独立 `MechanicalCheck(kind = "resource-limit")` 表达；`UsageObservation` 不增加
  `withinLimit`、`passed`、`accepted`、`retry` 或 `success` 字段。
- 不同 `runId` 的 usage 不在本对象中累加或覆盖。retry/continue 是新 run；迟到 provider usage 是否
  correction、追加 evidence 或不可用，由 record/evidence owner 另行决定。

`StructuredUnavailableReason` 虽仍是候选占位类型，但本 review 要求其最低语义能区分
`delayed`、`not-collected`、`provider-unsupported`、`scope-incompatible`、`source-unavailable` 和
`partial`；这组 kind 是候选的可判别下限，不是对 canonical reason schema 的接受。

本候选不定义 `steps` 的计数点、tokenization、工具输出字节边界、provider report 的可信度、费用计算、
预算换算、采样频率或持久化 retention；这些是相应 protocol/host/adapter/record owner 的后续 decision。

## 4. 更简单替代与反例

| 候选 / 替代 | 结果 | 当前判断 |
| --- | --- | --- |
| 保持 `usage` opaque 或只保留一个数字 | 无法区分 metric kind、scope、零值、provider report 和 unavailable | `insufficient` |
| 把 `ResourceLimits` 改写成 actual usage，或增加 `withinLimits: boolean` | 混淆声明、实际使用、机械检查和 acceptance，且无法表达部分/未知测量 | `reject` |
| 把 provider token report 当作所有 usage | provider report 不能证明 host duration、tool output bytes 或 limit enforcement | `reject` |
| 建立完整 metering ledger、billing/price registry、采样 daemon 或超限 controller | 把字段缺口扩大成运行时计量、结算和控制机制，当前没有 owner/consumer/evidence | `no-proposal` |
| 上述 metric union + source/scope/measurement/unavailable，limit check 独立 | 以最小字段区分实际使用和限额判断，保留有限测量与 unknown，不增加 runtime mechanism | `design-candidate` |

关键反例：

1. **缺省 usage 与真实零值。** executor 没返回 usage 不能写成 `output-tokens = 0`；只有相应
   source 在 scope 上观察到零值才可记录 `value = 0`。
2. **provider report 与 host limit。** provider 返回 `output-tokens = 100`，但 host 未测量工具输出
   字节；可以保留 provider metric，不能由它推导 `maxToolOutputBytes` 通过。
3. **executor failure/cancellation。** 运行失败或取消不抹掉已经观察到的 duration/partial token/tool
   output；未返回的其余 metric 保留 `unavailable`，`ExecutionOutcome` 不替代 usage observation。
4. **延迟或不支持。** provider usage 尚未返回或 provider 不提供 cached tokens，不得写 zero；延迟/不
   支持 reason 与 available metrics 并存。
5. **limit check unknown。** actual metric 存在但单位/scope 无法与 limit 对齐时，`resource-limit`
   check 可以是 `unknown`/`not-run`；不能把 metric 本身改成 failed，也不能把 check unknown 写成 pass。
6. **retry/late usage。** child run 的 usage 与 parent 分开；迟到 usage 不静默重写已有 RunRecord，也
   不把两个 provider report 相加成新的 authority。

## 5. Owner、证据与接受边界

- **protocol owner：** 决定 canonical metric kind、scope、单位、版本和 `UsageObservation` 与事件/
  RunRecord 的关系。
- **host/security owner：** 决定 host 可观察的 duration、step、tool-output 边界和 limit enforcement；
  本候选不创建 meter、controller 或安全保证。
- **executor/adapter owner：** 提供 provider report、局部 usage 和 evidence；不能生成 host fact、
  limit pass 或 acceptance。
- **coordinator/check owner：** 关联 run lifecycle，运行 `resource-limit` mechanical predicate，
  保持 check 与 usage 分离；不修改 usage observation。
- **record/evidence owner：** 决定 metric projection、digest、迟到 usage、correction、retention 和
  unavailable evidence；当前具体 owner 仍 unknown。
- **acceptance owner：** 决定是否采用这组字段；当前 unknown。

当前 evidence standing 是 `design observation / candidate-proposal`：没有真实 host Run、matched
adapter comparison、可重建 token/byte/time fixture、record retention decision 或 named acceptance owner。
独立 review 只能接受本候选记录的表达，不能接受 canonical field shape。

## 6. 迭代闭环与阶段影响

- **baseline：** 协议已有 `ResourceLimits`、`usage` 槽位、`provider-usage` evidence 和 unknown 原则，
  但无法让 consumer 诚实地区分 limit declaration、actual metric、source scope、zero 和 unavailable。
- **minimum delta：** 建立本窄 review unit，提出 metric/source/scope/measurement/unavailable 的候选，
  把 limit comparison 留给独立 MechanicalCheck；不修改 `design/`，不创建 meter、billing、queue、
  retry、controller、security mechanism 或 implementation。
- **成功条件：** consumer 不用缺省、空数组、provider report 或固定短语推断 usage；能区分 observed zero、
  partial/bounded measurement、unavailable 和 limit-check unknown；execution outcome、effect、review
  与 acceptance 仍各自可消费。
- **失败处置：** 若真实 owner 认为候选过重，返回 `retain-unknown` 或 `no-proposal`，并说明现有字段
  如何保持上述区分；不为成本/预算需要制造完整 metering schema。
- **revisit：** named host/adapter/record consumer、取消/延迟 usage fixture、跨 adapter comparison、
  cost owner 或 protocol acceptance rubric 出现时 reopen；若候选开始承载 enforcement、billing、
  retry、retention 或 acceptance，拆成新的 review unit。
- **阶段影响：** WorkCell 仍是 design candidate；DeepSeek Harness、base/runtime、adapter/executor
  和用户 harness 实现仍未授权。

## 7. 独立语义审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 protocol acceptance、host/security authority、record-retention authority、runtime 或实现权。
首轮 disposition 为 `revise`，指出 source/scope 兼容关系只在 prose 中约束、以及 opaque
`StructuredUnavailableReason` 不足以保证 delayed/provider-unsupported 可判别。

最小修订已完成：

- 用 `UsageMetricProvenance` 在候选 shape 中显式限定 `run + host-observation` 与
  `provider-report + executor-report/adapter-evidence` 的兼容关系；不兼容时只能 unavailable 或让
  resource-limit check 保持 unknown/not-run，不能合并成 exact host metric。
- 明确 unavailable reason 的最低可判别 kind：`delayed`、`not-collected`、`provider-unsupported`、
  `scope-incompatible`、`source-unavailable`、`partial`；具体 canonical schema 仍交 protocol/record
  owner。

Hubble 复审结论：`accept`，仅接受本候选 review record，不构成 canonical protocol、runtime 或实现授权。
复审确认：

- `UsageMetricProvenance` 已在 shape 中强制 source/scope 兼容；不兼容组合只能 `unavailable` 或使
  `resource-limit` check 为 `unknown`/`not-run`。
- `StructuredUnavailableReason` 已明确最低可判别 kind，能够区分 `delayed`、`not-collected`、
  `provider-unsupported`、`scope-incompatible`、`source-unavailable` 和 `partial`。
- observed zero、empty observation、partial/unavailable、failure/cancellation、retry child、late
  usage 仍保持各自事实和 unknown；host observation、executor/adapter report、ResourceLimits 与
  MechanicalCheck authority 分离。
- 候选没有越界成 meter、billing、enforcement、retention 或 acceptance carrier。

因此本记录最终维持 `design observation / candidate-proposal / independent-review-complete /
acceptance-pending`；仍需 protocol、host/adapter、record/evidence 与 acceptance owner 决定是否采用。
