# WorkCell EffectSummary / EffectObservation contract 候选

状态：`design-review-round-1 / candidate-proposal / independent-review-complete / acceptance-pending`；
不是 protocol acceptance、host/security 授权、runtime effect registry、effect execution、safety guarantee、
completion acceptance 或 eval Run。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录从 [`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md) 中
拆出一个单一 bounded review unit：只为现有 `WorkCellRunRecord.effects: EffectSummary` 与事件里的
`EffectObservation` 提出最小的事实观察 envelope。它不决定各类 effect 的策略、执行、回滚、重放、
保留、权限，也不把 executor 的返回值升级成 host 已确认的外部效果。

## 1. 当前来源与缺口

- canonical source：[`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本轮 review-time
  `git hash-object` SHA-1 为 `4293057dc1d136fd20ddc7de7144612e458a5b11`，raw SHA-256 为
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 早于 contract projection
  revision，不是当前 canonical fingerprint。当前 named-slot applicability 由
  [`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)
  回接。
- 相关段落：§4.1 `WorkCellSpec` 的 effect requirement、§5 `ToolGrant`/`EffectPolicy`、§6.4–§6.5
  executor return 与 `RunRecord`、§7 event/evidence/observation standing、§9.2 cancellation drain、
  §9.3 retry、§17.2 与 §18.4/§18.6。
- 当前协议已经把 effect policy、host effect boundary、`EffectSummary`、`EffectObservation`、
  `workspaceChangeSet` 和 `unknown` 放在不同语义位置，但没有给出可消费的 effect observation shape、
  effect identity、来源 authority、粒度、结果确认或 unavailable reason。
- 因此当前不能从字段缺省推出：没有请求 effect、请求但未开始、已开始、已完成、完成但无变化、
  结果未确认、未采集，或 provider 只返回了局部报告。`FailureObservation` 也不能单独证明 effect
  状态。

## 2. 对象 identity、来源、目的地与 owner

| 对象 | 最小身份 | 来源 / 产生者 | 主要 consumer / owner | 回答的问题 | 不承担 |
| --- | --- | --- | --- | --- | --- |
| `EffectPolicy` / grant | Binding 中的 host grant identity | host/security 从 Binding 产生 | host/security | 哪些 effect 允许被执行？ | 不证明 effect 已发生 |
| `EffectObservation` | host/coordinator 产生的 `observationId`，关联 `runId` 和可用 `effectId` | host observation、executor report 或 adapter evidence 被记录 | host/coordinator 产生；record/evidence 保留 | 哪个 effect 的哪一层事实被谁、何时观察或报告？ | 不授予 grant，不判断安全、不验收 |
| `EffectSummary` | 属于一个 `WorkCellRunRecord.runId` 的 projection | record/evidence owner 汇总 observations 和 refs | record consumer、比较/evidence consumer | 本次 run 可保留哪些 effect observations？ | 不保证完整覆盖，不代表没有 effect，不创建 registry |
| `MechanicalCheck` | check 自身 `checkId`，引用 observation/evidence | coordinator/check owner | check consumer | effect 是否满足已声明的结构、范围或 limit predicate？ | 不把 pass 变成 semantic acceptance |
| `ExecutionOutcome` | run 的执行结果 identity | coordinator | lifecycle/record consumer | executor/run 如何结束？ | 不替代 effect confirmation |

边界规则：host/security 是 effect authority；coordinator 负责 lifecycle closure；record/evidence owner
负责 projection 和 evidence reference；executor 的 return、provider session 和 adapter evidence 只能是
报告来源，不能单独生成 host-confirmed effect。`EffectSummary` 的缺失或空 observation 列表不表示
“没有 effect”；要表达 no-effect 或 no-change，必须有对应来源和粒度足够的 observation，或保留
`unavailable`。

## 3. 最小候选 shape

以下只是交给 protocol/host/coordinator/record owner 的候选，不改写 canonical protocol：

```ts
type EffectSummary = {
  observations: EffectObservation[];
  evidence: EvidenceRef[];
};

type EffectObservation =
  | {
      state: "observed";
      observationId: string;
      runId: string;
      effectRef:
        | { state: "available"; effectId: string }
        | { state: "unavailable"; reason: StructuredUnavailableReason };
      category: "workspace" | "command" | "network" | "secret";
      phase: "requested" | "started" | "completed" | "outcome";
      outcome: "changed" | "no-change" | "not-applicable" | "unknown";
      confirmation: "confirmed" | "unconfirmed" | "unknown";
      source: "host-observation" | "executor-report" | "adapter-evidence";
      observedAt: Timestamp;
      evidence?: EvidenceRef[];
    }
  | {
      state: "unavailable";
      observationId: string;
      runId: string;
      effectRef:
        | { state: "available"; effectId: string }
        | { state: "unavailable"; reason: StructuredUnavailableReason };
      category?: "workspace" | "command" | "network" | "secret";
      source: "host-observation" | "executor-report" | "adapter-evidence";
      reason: StructuredUnavailableReason;
      observedAt?: Timestamp;
      evidence?: EvidenceRef[];
    };
```

`StructuredUnavailableReason` 是候选占位类型，不是当前 canonical protocol 的新定义。候选只固定
以下窄语义：

- `EffectSummary` 是 run-bound fact projection；它可以有多条 observation，也可以只有 evidence
  refs，但没有 summary-level `none`、`success` 或 `complete` 字段。没有 observations 不足以证明没有
  effect。
- `state: "observed"` 只表示该来源报告被记录且 envelope 可用，不表示 effect outcome 已确认。
  `phase` 表示观察到的关系；`outcome` 表示在当前粒度下能否知道 changed/no-change。观察到
  `requested` 或 `started` 不得被解释为 completed。
- `confirmation` 是 effect outcome 的确认程度，而不是 permission 或 acceptance。只有
  `source: "host-observation"` 可以支持 `confirmed`；executor report 和 adapter evidence 最多支持
  `unconfirmed` 或 `unknown`。host 也可以观察到请求但无法确认结果，此时保留 `state: observed`、
  `outcome: unknown` 或 `confirmation: unknown`。
- `state: "unavailable"` 表示这一项的 effect observation 无法提供，必须保留结构化 reason；不能
  用空数组、零值、`FailureObservation.code` 或自然语言代替。若只知道 category 或 effectRef 的一部分，
  其余部分使用显式 unavailable union。
- `effectId` 是 host/coordinator 可用于相关性的身份，不是全局 effect registry、幂等保证或 replay
  key。category-specific payload、目标、digest、workspace change set、command exit detail、network
  response 和 secret disclosure 仍由对应 owner 另行决定；本候选不发明它们的 canonical shape。
- `observedAt` 是产生该 observation 的 host/coordinator 观测时间。executor 自报时间、provider session
  顺序和 message arrival order 只能进入 evidence，不成为 WorkCell effect authority。
- `EffectSummary` 可以同时保存 confirmed、unconfirmed 和 unavailable observations；它不把它们合并
  成一个更强的 summary state，也不将 retry child run 的 observations 合并进 parent run。

这里的 `phase` 与 `outcome` 是事实层字段，不是 effect lifecycle controller；候选不要求实现取消、
drain、dedup、retry、late correction 或 effect registry。

## 4. 更简单替代与反例

| 候选 / 替代 | 结果 | 当前判断 |
| --- | --- | --- |
| 继续保持 `EffectSummary` opaque，复用 `FailureObservation` | 无法区分 executor failure 与已产生 workspace effect，也无法表达 effect 未确认 | `insufficient` |
| 只增加 `effectsApplied: boolean` 或 `workspaceDiff` | 丢失 command/network/secret、无变化、局部观察、不可用原因和不同来源 authority | `reject` |
| 只保留 `EffectObservation[]`，不区分 source/confirmation | provider 报告可能被 consumer 当成 host 已确认事实 | `insufficient` |
| 建立完整 effect ledger、registry、dedup/replay controller | 把 record field 缺口扩大成 runtime/retention/security 机制，超出当前证据 | `no-proposal` |
| 上述最小 observation envelope，category payload 继续交 owner | 以最小字段区分来源、阶段、结果确认和 unavailable；不新增 runtime 机制 | `design-candidate` |

关键反例：

1. **executor 失败但 workspace 已写入。** `ExecutionOutcome.state = failed` 不覆盖 host 的
   `EffectObservation`；若 host 有 change-set 证据，可记录 `category = workspace`、`outcome = changed`、
   `confirmation = confirmed`；若只能知道调用已开始，则保留 `outcome = unknown`。
2. **工具返回 success，但 host 无法确认 network/secret effect。** executor report 只能是
   `source = executor-report`，不得写成 `confirmation = confirmed`；若 observation envelope 可保留，
   outcome 仍为 `unknown` 或 `unconfirmed`。
3. **没有 effect observation。** 可能是没有请求、没有开始、没有采集或采集失败；空数组不能选择其中
   一个解释。需要 no-effect 结论时，必须由 host/security/record owner 定义可审计的 observation scope。
4. **取消与 bounded drain。** drain cutoff 后未知的在途 effect 仍可保留 `unavailable` 或 observed-but-
   `unknown`；不能因为 run 已 `cancelled` 就写成 no effect，也不能让迟到 evidence 静默覆盖原 projection。
5. **retry / continue。** child run 的 `runId` 和 effect identity 不与 parent 合并；比较 consumer 必须能
   按 run 分开看到各自的 observations。
6. **跨类别误读。** workspace change、command exit、network delivery 和 secret access 不是同一结果
   维度；category 只提供最小分桶，不授权把一种 category 的 confirmed 推广到另一种。

## 5. Owner、证据与接受边界

- **protocol owner：** 决定 `EffectSummary`/`EffectObservation` 是否成为 canonical shape、版本、
  category 集合、字段粒度和与事件/RunRecord 的关系。
- **host/security owner：** 决定 effect grant、执行边界、可确认的 host observation、cutoff 和安全策略；
  不由本候选获得新权限或安全保证。
- **coordinator-lifecycle owner：** 决定 run closure、取消 drain、迟到 observation 的生命周期关系；
  不把生命周期状态当成 effect outcome。
- **record/evidence owner：** 决定 observations 的投影、evidence ref、digest、retention 和 correction
  lineage；当前具体 owner、scope 和修正规则仍 unknown。
- **executor/adapter owner：** 提供局部 report/evidence；不能生成 host-confirmed effect、授权或 acceptance。
- **check/review/acceptance owner：** 分别决定 mechanical predicate、semantic interpretation 和协议接受；
  本候选不合并三者。

当前 evidence standing 是 `design observation / candidate-proposal`：没有真实 host Run、取消/崩溃
fixture、跨 adapter comparison、record retention decision 或 named acceptance owner。`EffectSummary` 的
候选不能自行关闭 lifecycle review A/B、usage contract、security policy 或 effect-specific payload。

## 6. 迭代闭环与阶段影响

- **baseline：** 协议已有 effect policy、RunRecord 的 `effects` 槽位、event 的 `effect.observed` 和
  unknown 原则，但无法让 consumer 诚实地区分 effect source、phase、outcome 和 unavailable。
- **minimum delta：** 建立本窄 review unit，提出 source/authority、effect identity、phase/outcome、
  confirmation 和 unavailable 的最小候选；不修改 `design/`，不创建 registry、queue、retry、drain
  controller、security mechanism 或 implementation。
- **成功条件：** consumer 不用固定短语、空字段或 failure code 推断 effect；能区分 host-confirmed、
  provider-reported、unconfirmed 和 unavailable；能把 execution outcome 与 effect observation 分开；
  retry child 与 late observation 不被静默合并。
- **失败处置：** 若真实 owner 认为该 envelope 过重，返回 `retain-unknown` 或 `no-proposal`，并说明
  现有字段如何保持上述区分；不能为“未来可能需要”制造完整 effect schema。
- **revisit：** named host/security consumer、record/evidence owner、取消/崩溃 fixture、workspace/
  command/network/secret matched comparison 或 protocol acceptance rubric 出现时 reopen；若候选开始
  承载权限、执行控制、rollback、replay、retention 或 semantic acceptance，拆成新的 review unit。
- **阶段影响：** WorkCell 仍是 design candidate；DeepSeek Harness、base/runtime、adapter/executor
  和用户 harness 实现仍未授权。

## 7. 独立语义审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 protocol acceptance、host/security authority、record-retention authority、runtime 或实现权。
最终 disposition：`accept`，仅接受本窄候选 review record。

审阅确认：

- `state: "observed"` 已明确表示 observation envelope 可用，不表示 effect outcome 已确认；只有
  host observation 可以支持 `confirmation: "confirmed"`，executor/adapter 来源只能保持
  `unconfirmed`/`unknown`。
- `source`、`confirmation`、`phase`、`outcome` 分别承担来源、确认程度、事实阶段和结果；没有把
  lifecycle state 当成 effect outcome。
- 空 observation、取消后的未知 effect、executor failure、retry child、late evidence 都保留
  `unknown`/`unavailable`，没有倒推 no-effect 或静默覆盖。
- 候选没有创建 effect registry、security guarantee、runtime controller、retention authority 或
  acceptance carrier。

因此本记录维持 `design observation / candidate-proposal / independent-review-complete /
acceptance-pending`。审阅结论不接受 canonical protocol shape；仍需 protocol、host/security、
coordinator、record/evidence 与 acceptance owner 决定是否采用。
