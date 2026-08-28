# WorkCell 生命周期边界回返：A/B

状态：`design-review-round-1 / independent-review-complete / unresolved-owner / acceptance-pending`；
不是协议接受、eval Run 或实现授权。

本记录承接 [`workcell-open-relations-review.md`](workcell-open-relations-review.md)，只回返
其中 A（bounded drain 与 unknown effect）和 B（active Binding expiry / revocation）。本轮
不新增 runtime 状态、host 实现、adapter contract 或安全策略；它的作用是把当前设计里已经
可观察的缺口和最小决策空间固定下来，交给真实的 protocol、host/security 和 record owner
继续判断。

## 1. 来源、范围和审查 standing

- **canonical source：** [`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本轮 review
  记录的 working-tree content hash 为 `00a7ec7f4b6e11771f5774e2f5511f5c73df2552`，这是本轮的
  frozen/review-time source edge，不是当前 protocol fingerprint。
- **planning source：** [`item-ledger.md`](../item-ledger.md) 的 WorkCell sub-item，以及
  [`workcell-open-relations-review.md`](workcell-open-relations-review.md) 的共同 fixture
  envelope。
- **审查范围：** §5.1 Binding、§6.2 Run lifecycle、§6.5 RunRecord、§7 Event、§9 失败/取消/恢复、
  §17.2 未决项和 §18 设计反例。
- **当前证据：** `design observation`；来源是协议文本的字段/不变量和反例检查，没有 host
  Run、security review、跨进程 consumer 或 acceptance decision。
- **当前结论：** A、B 均为 `retain-unknown`。本记录可以成为下一轮协议修改的输入，不能把
  候选关系写成已承诺的 deadline、撤销策略或记录持久化保证。

## 2. 共同审查方法

每个关系都按以下顺序处理：

1. 恢复当前 baseline，不把设计验收标准误读为已有实现能力；
2. 用最小反例区分协议语义、host/security policy 和记录投影；
3. 写出有限的候选关系，明确哪些是提案、哪些仍缺来源；
4. 检查是否会把未确认 effect 写成“无 effect”，或把 provider 行为当作 authority；
5. 只把审查结果投影到 planning；若没有 owner 和接受关系，保留 `unknown` 并记录回返条件。

共同不变关系：

```text
WorkCellSpec -> WorkCellBinding -> WorkCellRunRequest -> WorkCellRun -> WorkCellRunRecord
```

本轮不改变这些对象的 identity，也不把 `WorkCellRun` 变成公共持久化队列。`RunRecord` 的
作用仍是事实投影；mechanical check、semantic review 和 acceptance 不因本轮而合并进入
execution outcome。

## 3. A：bounded drain 与 unknown effect

### 3.1 当前 baseline（pre-revision review-time edge）

本 review 所依据的 pre-revision source edge 中，可确认关系曾是：

- 取消至少经过 `cancelling -> draining -> recording`；
- `draining` 等待已发起的 host tool call 安全结束，或将无法确认的效果标记为 `unknown`；
- `recording` 要保留 effect、usage、failure 和 evidence；
- 未确认的外部效果不能因为没有返回值而被写成“没有发生”；
- executor 不负责自动重试，host 负责效果边界，coordinator 负责运行生命周期。

当前 canonical source 已将 public execution state 收窄为 `cancelling -> draining -> terminal execution
state`，再独立进行 record finalization；以下 A 的 baseline 与候选必须按上述 source-revision qualifier
阅读，不再作为当前 `recording` state 的主张。

该 pre-revision source edge 没有定义：

- 谁拥有 drain cutoff 和停止等待的决定；
- cutoff 到达时 `WorkCellRun` 如何进入可记录的终止关系；
- 未返回的调用仍可能产生效果时，谁完成最终 `RunRecord`；
- cutoff 后迟到的返回或 host observation 是新 evidence、record correction，还是不可用；
- `ExecutionOutcome` 与 `EffectSummary` 如何共同表达“运行已收尾，但某个 effect 仍未知”。

这里有一个字段层面的边界：`FailureObservation` 已有 `timed_out`、`cancelled` 和 `unknown`，
但这些 code 不能单独证明某个外部 effect 的状态；“执行终止原因”和“效果是否确认”不能互相
替代。当前 `EffectSummary` 的完整 shape 也没有在本协议中给出，因此不能假设它已经能表达
未确认的单个调用、范围或迟到 observation。

### 3.2 最小 fixture 与反例

| fixture | 可观察情况 | 必须避免的误判 |
| --- | --- | --- |
| A1 合作返回 | 取消后 host call 在安全边界内返回，effect 有可核验结果 | 不把正常 drain 误标为未知或失败以外的新 acceptance 含义 |
| A2 不合作调用 | 取消后调用持续不返回，executor/host 没有及时终止回执 | 不让 `draining` 变成无界生命周期 |
| A3 可能已发生 | 外部命令/网络效果可能已经发生，但没有可核验回执 | 不因缺少回执写成 `none`、零值或成功 |
| A4 迟到事实 | `RunRecord` 收尾后才收到调用结果或 host observation | 不静默重写既有事实，也不丢失能改变判断的 evidence |

### 3.3 有限候选关系

下面只是交给 owner 的候选，不是当前 canonical decision：

**A-1：host/coordinator 有界收尾（候选）。** 若 host/security owner 选择安全截止和已发起
效果的停止规则，coordinator 可以在 cutoff 后结束等待并开始 record finalization；record owner 以
结构化 observation 保留已确认与未确认部分。这个候选保持现有 `draining` 名称，不以额外 lifecycle
state 掩盖“仍有未知效果”；本轮不把 cutoff、record finalization 关系或 owner 分工写成 canonical
runtime 行为。

**A-2：无界等待。** 继续等待所有调用返回，再完成 record。这个候选被 A2 反例排除：它使
不合作 executor 取得对 WorkCell 生命周期的无限控制，不能满足 §18 的 bounded drain 反例。

**A-3：提前收尾并宣称无效果。** cutoff 后直接把未返回调用当作没有 effect。这个候选被
A3 反例排除：没有回执只说明 observation unavailable，不说明 effect absent。

**A-4：迟到事实静默覆盖。** 让迟到回执直接修改既有 `RunRecord`，但不保留版本、来源和
变更关系。这个候选暂不接受：它会破坏 durable fact projection 的可追溯性；是否允许带
明确 lineage 的 correction 需要 record/evidence owner 决定。

### 3.4 本轮结构化结果

```yaml
item: bounded-drain-unknown-effect
owner_class: host-security + coordinator-lifecycle + record-evidence
decision: retain-unknown
baseline_preserved: yes
candidate_minimum:
  - host/security owns the safety cutoff for initiated effects
  - coordinator owns bounded lifecycle closure after the cutoff
  - record owner preserves observed and unconfirmed effect separately
  - late observations cannot silently rewrite the canonical fact projection
counterexample_result:
  - A2 rejects unbounded draining
  - A3 rejects missing-ack-as-no-effect
  - A4 rejects untracked late mutation
structured_observation: >-
  On the pre-revision source edge, the run may reach recording while an initiated effect remains
  unconfirmed; the current source instead separates terminal execution state from record finalization,
  while execution termination and effect observation remain separate relations.
source_standing: pre-revision-observed / current-source-boundary-reconciled-elsewhere
evidence_standing: design observation; later host/security contract and record fixture required
implementation_authorized: false
revisit_when: >-
  A real host/security owner specifies cutoff and termination authority, or a record consumer
  requires a testable late-observation/correction contract.
```

**字段决策仍未知：** 是否用既有 `timed_out`/`cancelled` 加独立 effect observation 表达，或
需要版本化的终止/收尾 observation；迟到事实是否进入追加 evidence 或有界 correction；这些
不能由 Vercel AI SDK、Pi 或 DeepSeek Harness 的返回习惯决定。

## 4. B：active Binding expiry / revocation

### 4.1 当前 baseline

当前协议的可确认关系是：

- `WorkCellBinding` 在 admission 时由 host 根据 Spec 和 host policy 物化；
- 运行使用 binding snapshot，且 snapshot 在运行期间不可变；
- Spec 本身不授予 workspace、tool、command、network 或 secret effect；
- Binding 可以有 host 定义的过期时间，过期后必须重新 admission，不能静默沿用旧权限；
- Binding owner 是 host/orchestrator，不是 Agent 或 executor；
- admission 不匹配应结构化为 `capability_missing` 或 `admission_rejected`。

当前 baseline 对“运行开始后 host policy 变化”只给出问题，没有给出关系：不可变 snapshot
是指记录的声明不可变，还是意味着 host 在活动 run 中必须继续允许其 effect；到期/撤销是
只阻止新 admission，还是可以中断活动 run；正在进行的 effect 如何收尾；最终记录怎样说明
权限没有扩大，均未定。

此外存在一个需要 protocol owner 处理的内部不一致：§5.1 的文字说运行记录保存 binding
引用和 observation，但 `WorkCellRunRecord` 示例只列出 `runId`、`requestId`、`cellId`、
execution、runtime、effects、usage 和 evidence，没有显式 `bindingRef`/digest。当前 canonical
record shape 没有使 Binding identity 关系显式且可强制；evidence 或 host evidence 仍可能承载
该关系，因此本轮只能记录为载体缺口，不能断言消费者必然无法确认，也不能擅自补写具体字段。

### 4.2 最小 fixture 与反例

| fixture | 可观察情况 | 必须避免的误判 |
| --- | --- | --- |
| B1 到期、无新 effect | run 已 admission，binding 到期，下一步尚未发起 effect | 不把到期自动解释成权限扩大，也不把时间经过误报成语义失败 |
| B2 到期、effect 在途 | binding 到期时 host effect 正在执行，结果尚未确认 | 不把 snapshot 不可变误读成可以无条件继续所有效果 |
| B3 明确撤销 | host/security 明确撤回某项 tool、workspace 或外部效果 | 不让 adapter 自行恢复权限，也不把撤销原因猜成 acceptance judgment |
| B4 记录审计 | run 完成后需要知道实际使用的 binding identity 与 policy observation | 不让 provider session、prompt 或自由文本成为授权事实来源 |

### 4.3 有限候选关系

**B-1：snapshot 继续，但不扩大权限。** host 明确规定 admission snapshot 在本次活动 run
中继续有效；到期只影响后续 admission，不新增 grant；在途 effect 仍按 A 的 drain/unknown
关系记录。这个候选要求 security owner 证明其适用于 host policy，而不是由协议默认推出。

**B-2：host-owned cancel/drain。** host/security policy 触发活动 run 的取消和有界排空；
coordinator 记录结构化的终止/取消 observation，未确认 effect 仍独立为 unknown。这个候选
要求 host 说明撤销的作用范围和停止规则，不能只把 `cancelled` 当作足够的安全证明。

**B-3：结构化 policy-revoked 结果。** 将到期或撤销作为 host-owned observation，并让 run
以可区分的结构化结果结束；它仍不代表 semantic review 或 acceptance。是否需要新 failure
code、现有 `host_failure`/`cancelled` 是否足够、以及 observation 是否进入 RunRecord 或
Evidence，均待 protocol/security/record owner 共同决定。

本轮不选择 B-1、B-2 或 B-3。它们的差异来自 host/security policy 和记录消费者的真实需要，
不是来自 executor/provider 的能力差异。无论最终选择哪一种，都必须保持两条硬边界：

1. 到期或撤销不得静默产生新 grant；
2. 运行结果必须能区分执行终止、权限 policy observation、effect 是否确认和后续 acceptance。

### 4.4 本轮结构化结果

```yaml
item: active-binding-expiry-revocation
owner_class: host-security + protocol + record-evidence
decision: retain-unknown
baseline_preserved: yes
candidate_minimum:
  - host/security owns expiry and revocation authority for active effects
  - executor cannot renew, widen, or infer a Binding
  - active-run outcome must be structured and must not imply acceptance
  - canonical record must retain enough Binding identity for effect audit
counterexample_result:
  - B1/B2 reject treating immutable snapshot as silent perpetual authorization
  - B3 rejects adapter-owned permission recovery
  - B4 exposes the current RunRecord binding-reference inconsistency
structured_observation: >-
  An admission snapshot, host policy observation, active-run termination, and effect confirmation
  are separate relations; expiry/revocation cannot be resolved from the executor return alone.
evidence_standing: design observation; security owner and record contract required
implementation_authorized: false
revisit_when: >-
  A real host/security owner chooses the active-run policy and a protocol/record owner resolves
  where Binding identity, expiry/revocation observation, and effect uncertainty are canonical.
```

## 5. 迭代闭环记录

- **baseline / observation：** A 只有“尽量排空”和 `unknown`，没有 bounded cutoff、迟到事实
  和最终记录关系；B 有 immutable admission snapshot 和重新 admission 文字，但没有 active
  revocation outcome，且 Binding identity 在 RunRecord 示例中缺位。
- **change hypothesis / minimum delta：** 新增本 review record，分别用四个 A/B fixture、反例
  和有限候选关系把“不能由 provider 猜定”的缺口结构化；不修改 canonical protocol，不新增
  runtime 状态、权限字段或持久化机制。
- **positive result：** 找到两个可复述的协议缺口，并确认它们分别跨越 host/security、
  coordinator lifecycle、protocol 和 record/evidence owner；现有对象 identity 可以保持。
- **boundary / regression check：** 没有真实 owner 时不能选择 B-1/B-2/B-3；不能把 A 的
  candidate minimum 写成 accepted cutoff；不能把 review record 里的 policy language 当成
  runtime guarantee，也不能借事件、provider session 或自然语言补回事实。
- **evidence / acceptance：** 当前为 `design observation`；没有 matched Run、security review、
  independent protocol acceptance 或 adoption window，故不写成“已收敛”或“零回归”。
- **projection / move：** 只投影到本文件、`item-ledger.md` 和 `plan.md` 的可回读入口；不 move
  到 `design/` canonical、不建立 skill、eval fixture、host fake 或 implementation plan。
- **下一轮 return：** 先取得 host/security 对 A cutoff 与 B active policy 的真实判断，再由
  protocol/record owner 决定字段/证据载体；若 owner 仍未知，保留本轮 `retain-unknown`，不
  通过增加名称或状态制造收敛。

## 6. 阶段影响

本轮使 WorkCell 从“有四项开放关系的设计候选”推进到“已对 A/B 完成一轮边界审查，但 owner
和字段合同仍未知”。它没有满足 WorkCell 设计接受条件，也没有解除
`active-after-prerequisite`、DeepSeek Harness 工作系统依赖或实现禁令。C（Event 顺序/去重/
重放）和 D（retry/continue lineage）仍按原有限回返计划等待后续独立 round。

## 7. Independent semantic review

reviewer：`Pasteur`（Agent `01a03792-35c1-72c2-9871-07b9b2d108a3`）；未修改文件，也未取得协议
acceptance、host/security authority、record authority、runtime 或实现权。

- **对象 identity：** A/B 保持 `WorkCellSpec → WorkCellBinding → WorkCellRunRequest → WorkCellRun
  → WorkCellRunRecord`，没有把 review record 变成新的 runtime 对象。
- **边界区分：** A1-A4/B1-B4 在当前 design observation 范围内能区分 host effect、coordinator
  drain、unknown effect、迟到 evidence、expiry、在途 effect、revocation 与 record audit；
  acceptance 被明确排除。
- **候选 standing：** A-1、B-1/B-2/B-3 仍是交给 owner 的候选，不是 canonical decision。A-1
  的 cutoff→record finalization 已补为候选关系；B4 已收窄为 canonical record shape 未显式且可强制表达
  Binding identity 的载体缺口，不再断言消费者必然无法确认。
- **当前 disposition：** `retain-unknown / route-to-owner`。应交给真实 host/security owner
  判断 cutoff 与活动撤销，再由 protocol/record-evidence owner 决定 Binding identity、迟到
  observation 和 correction 的载体；不需要新增机制或重写 A/B。
- **未知与证据：** 没有真实 host Run、security review、record consumer、matched comparison、
  runtime evidence 或 adoption regression，最高仍为 `design observation`；A cutoff、迟到事实
  correction owner、B active policy、Binding identity canonical 载体和 acceptance authority 仍未知。

## 8. 2026-08-25 source provenance correction（pre-executor source edge）

`evidence-applicability-review-workcell-design.md` 当时重新计算的
`design/work-cell-protocol.md` 的 fingerprint 为 Git SHA-1 `4293057dc1d136fd20ddc7de7144612e458a5b11`
和 raw-file SHA-256 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该值是
contract projection revision 前的 source edge。因此本记录第 1 节的 `00a7ec…` 只能作为 A/B
review-time/frozen edge，不再作为当前 source hash 使用；当前 source/applicability 由 current-source child
card 与 review-family reconciliation 回接。

这只修正 provenance 表达，不修改 A/B 的 historical design observation、`retain-unknown`、反例、
owner 缺口或实现冻结；当前 source applicability 仍为 `uncertain`，需要 recovered snapshot 或
current-source review card 才能重新评估 A/B。
