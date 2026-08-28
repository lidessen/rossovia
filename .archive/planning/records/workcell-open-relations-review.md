# WorkCell 开放关系设计回返

状态：`design-review-plan / projection-reconciled / source-applicability-uncertain / independent-review-complete / acceptance-pending`；不是协议接受、eval Run 或实现授权。

本文件是 `design/work-cell-protocol.md` 四个开放 lifecycle/record relation 的有限评审计划。
它把已经识别出的未知变成可以交给真实 owner 判断的 fixture 与回返条件，但不以计划文字
创造 deadline、权限撤销、事件重放或持久恢复保证。

## 1. 对象、来源和使用关系

- **canonical source：** [`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)，
  目前仍是 design candidate；四个 sub-item 的 planning projection 在
  [`item-ledger.md`](../item-ledger.md) 中。
- **受众：** protocol owner、host/security owner、record/evidence owner，以及后续的独立
  design reviewer。当前没有具体姓名，不能用推测性 owner 填空。
- **目的：** 让每个开放关系得到一个最小选择空间、反例、结构化结果和 revisit 条件，供后续
  设计评审据此修改 canonical design 或保留 unknown。
- **行动：** reviewer 逐项判断 `decision-proposed`、`retain-unknown` 或 `no-proposal`，并
  记录 owner 类别、未解决事实、反例和所需的新来源。
- **媒介与生命周期：** 这是 planning 阶段的有限 review record；设计接受或该轮被 supersede
  后退役，不成为 runtime registry、事件总线、永久队列或 skill。

## 2. 共同边界

本轮只做声明式设计回返：

1. 固定当前协议 baseline、字段语义和四项未知，不通过 adapter 方便性偷偷决定协议；
2. 使用可复述的 synthetic fixture 或历史 failure shape，不启动 provider、host、网络或真实
   workspace effect；
3. 结果必须区分“协议应保证什么”“运行时实际观察到什么”“仍无法确认什么”；
4. 不新增通用 registry、queue、event bus、自动 retry、provider session resume 或自由文本
   action vocabulary；若评审认为它们必要，先记为新架构候选并交回 owner；
5. 不把本文件的 review 结果写成 `matched-improvement`。没有真实匹配 Run 时，eval standing
   仍为 `unknown`，最多只保存设计判断和待验证条件。

## 3. 共同 fixture envelope

每项 fixture 都使用同一份 envelope，避免“写出一个漂亮方案”被误认为已经证明：

```yaml
fixture_id: <stable review id>
source_revision: <design source revision or content hash>
baseline: <current protocol wording and invariant>
case: <one concrete lifecycle or record situation>
owner_class: <protocol | host-security | record-evidence | acceptance>
decision_space: <finite alternatives, including retain-unknown>
observable_facts: <facts a consumer could actually observe>
counterexample: <case that rejects an unsafe alternative>
unknowns: <facts not supplied by the source>
return: <decision, evidence standing, revisit trigger>
```

每个 fixture 的 reviewer 还要回答：

- 是否改变了 `Spec → Binding → RunRequest → Run → RunRecord` 的现有 identity；
- 结果属于协议语义、host policy、记录投影，还是外部 acceptance；
- 是否可能让未确认 effect 被写成“没有 effect”；
- 是否把 provider session、自然语言或事件到达顺序误当成 canonical authority；
- 若无法作出选择，最小缺失来源是谁拥有，以及应该怎样重新开启一轮。

## 4. 四个 fixture 组

### A. bounded drain 与 unknown effect

**来源边界：** `design/work-cell-protocol.md` §6.2、§9.2。当前 baseline 允许取消进入
`draining`，并要求对无法确认的外部效果记录 `unknown`，但尚无有界停止等待和最终记录 owner。

**最小案例：** 一个 run 已发起 host call；分别给出 host call 合作返回、取消后迟迟不返回、
以及效果可能已经发生但没有可核验回执三种变体。

**必须比较的选择：**

- 谁拥有 drain cutoff 和停止等待的决定；
- cutoff 后 run 的结构化终态如何表达“已停止等待”与“effect unknown”；
- 谁在未返回调用仍存在时完成最终 `RunRecord`，以及迟到事实如何被处理；
- 哪些事实可以回写，哪些不能被补成成功或无效果。

**反例：** 不合作 executor 让 `draining` 无界挂起；或 coordinator 因没有回执而把外部
effect 写成 `none`。

**出口：** 得到 host/coordinator/record owner 的分工和可检验的终态关系；否则保留
`retain-unknown`，不得增加实现状态来遮盖缺口。

### B. active Binding expiry / revocation

**来源边界：** §5.1、§6.3、§9。当前 baseline 是 admission 时物化 Binding、运行期间使用
不可变快照；但活动 run 遇到 host policy 到期或撤销时的关系未定。

**最小案例：** run 已 admission，随后分别发生：Binding 到期但无新 effect、正在执行 host
effect、host 明确撤销该 effect 权限。

**必须比较的选择：**

- 继续使用 admission snapshot；
- 由 host-owned policy 触发取消/排空；
- 以另一种结构化结果结束，并明确它不授予新权限。

**反例：** 活动 run 静默获得到期后的新权限；或 protocol 自行猜测撤销原因并伪造 semantic
acceptance。

**出口：** 明确 snapshot、host policy、run result 和记录的关系，且每一种终态都能表达“权限
未扩大”；若没有真实 security owner，保留 `open`，不以 Vercel/DeepSeek adapter 行为代定。

### C. Event 顺序、去重、重放

**来源边界：** §7、§17.2。当前有类型化 `WorkCellEvent`，但没有承诺 sequence、duplicate、
gap 或 replay；`RunRecord` 是候选公共事实投影。

**最小案例：** 给同一个 run 一组正常事件、重复事件、乱序事件、缺口事件和进程重启后重新
观察的事件流；不实现 event bus，只描述 consumer 可依赖的事实。

**必须比较的选择：**

- **只观察：** Event 不承担完整事实重建，RunRecord 是公共事实 authority；
- **可重放：** 必须由 owner 补齐事件 identity、顺序、幂等、缺口和恢复边界。

**反例：** consumer 把重复 Event 当成两次 effect，或把缺失 Event 当成未发生；协议声称可
重放却没有可验证的 sequence/gap 关系。

**出口：** 二选一得到明确的 consumer contract；若真实跨进程 consumer 尚未存在，不因“以后
可能需要”创建 event bus，先记录 `retain-unknown` 和 revisit trigger。

### D. retry / continue lineage 可恢复性

**来源边界：** §3.1、§6.1、§8.2、§9.3。当前 baseline 保留新 run，并以 `retry-of` 或
`continued-from` 建立 parent relation；不能依赖 provider session 或自然语言。

**最小案例：**

1. request 与 parent request/run record 都保留；
2. child record 保留但 parent record 暂时不可取；
3. provider session 仍存在，但 canonical request/run relation 缺失；
4. parent relation 指向无效或错误 relation 的记录。

**必须比较的选择：**

- 仅凭保留的 request/run record 能恢复到什么粒度的因果；
- parent 缺失时应返回哪一种结构化 unknown；
- lineage 是否需要 retention、digest 或 authority 约束；
- provider session 和自由文本应明确被排除在何种恢复判断之外。

**反例：** 只因 provider session 尚在就把 retry 当作 continue，或 parent record 缺失时凭
自然语言补回因果关系。

**出口：** 明确可恢复的最小 record 集合、关系错误的诚实失败表达和 retention owner；否则
保留新 run baseline 与 `causal identity unknown`，不引入 session resume。

## 5. Review record 与阶段出口

每项完成一次回返时，只追加以下结果，不覆盖 source 或旧判断：

```yaml
item: <A|B|C|D>
owner_class: <confirmed category or unknown>
decision: <decision-proposed | retain-unknown | no-proposal>
baseline_preserved: <yes/no and why>
counterexample_result: <what unsafe alternative was rejected>
structured_observation: <consumer-visible relation>
evidence_standing: <design observation | unknown | later eval required>
revisit_when: <owner/source/consumer change>
implementation_authorized: false
```

四项共同通过条件：

- 每项有 owner 类别、明确反例和结构化结果；
- `RunRecord`、host authority、Event authority、lineage authority 没有互相冒充；
- unknown 能被保留，且没有通过文字制造权限、恢复、重放或持久效果；
- 所有仍未决定的字段都有缺失来源和回返触发器；
- 设计 reviewer 能逐项对照 `design/work-cell-protocol.md`，而不是只对照本计划。

这只允许回写设计候选或保留 unknown。真正进入 adapter contract、host fake、deterministic
executor、eval fixture 或实现计划，仍需 WorkCell 设计阶段接受、owner/acceptance 明确和新的
授权。

## 6. 当前处置

- 形式选择：新建这一份有限 planning/review record 是最小真实形式；不新建 skill、runtime、
  eval ledger 或第二份 WorkCell protocol。
- 当前 standing：A/B/D 仍为 `open`；C 为 `retain-unknown / no-proposal-now-for-replay / route-to-owner`；
  四项都没有 matched evidence。
- 下一轮：由真实 owner 选择一项回返，优先 A（效果边界）、B（权限边界）或 D（因果恢复）；C
  只有在 replay consumer/evidence 触发后才重新打开，不能在没有真实 consumer/retention owner
  时假设更强契约。
- 若新的 owner 或 source 改变了四项的 identity、责任或生命周期，开新 review round，并在
  `planning/item-ledger.md` 追加 lineage；不修改旧 round 以制造连续性。

## 7. 2026-08-25 current parent projection reconciliation：A/B/C/D

本文件原先把 A、B、C、D 统一投影为 `design-review-plan / open`。这仍准确描述本文件作为
共同 fixture 计划的历史角色，但不再足以表达当前子记录的 evidence standing。现有子记录已经
分别完成了第一轮 bounded review：

| relation | current child record | current projection | unresolved relation |
| --- | --- | --- | --- |
| A bounded drain / unknown effect | [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) | `design-review-round-1 / independent-review-complete / unresolved-owner / acceptance-pending / retain-unknown / route-to-owner` | host/security cutoff、迟到 observation/correction 与 record owner |
| B Binding expiry / revocation | [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) | `design-review-round-1 / independent-review-complete / unresolved-owner / acceptance-pending / retain-unknown / route-to-owner` | active-run host policy、Binding identity 与 effect confirmation 的 canonical 载体 |
| C Event order / dedup / replay | [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) | `design-review-round-1 / source-provenance-reconciled / independent-review-complete / unresolved-consumer / acceptance-pending / retain-unknown / no-proposal-now-for-replay / route-to-owner` | named replay consumer、Event contract、record/evidence owner 与 retention；当前不扩展 replay 机制 |
| D retry / continue lineage | [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) | `design-review-round-1 / source-provenance-reconciled / independent-review-complete / unresolved-consumer / acceptance-pending / retain-unknown / route-to-owner` | recovery consumer、parent relation authority、retention 与缺失 parent 的最大恢复粒度 |

这次只更新父 planning record 的 projection 和 lineage，不把四项写成已决定的 protocol contract。
A/B 的 `retain-unknown` 与 C/D 的 `retain-unknown` 分别保留各自 owner/consumer 缺口；不存在
WorkCell protocol acceptance、provider comparison、runtime guarantee、DeepSeek Harness design
acceptance 或 implementation authorization。没有新增 state、queue、registry、event bus、retry
controller、session resume 或 eval Run。

本次对 C 的进一步收束只关闭“在没有 named consumer/evidence 时继续设计 replay 机制”的当前分支，
不选择 observation-only protocol acceptance，也不宣布 Event replay 永久不需要。未来出现 named
cross-process consumer、record/evidence owner decision、source revision 或会改变判断的 counterexample
时，C 按新的 bounded review 重新打开；在此之前以 typed Event + RunRecord 候选事实投影维持
`retain-unknown / no-proposal-now-for-replay`。

此前的 applicability qualifier 是 current-source child card 之前的 parent projection：
`planning/records/evidence-applicability-review-workcell-design.md` 记录 A/B/C/D 的 frozen protocol edge 与当时
`design/work-cell-protocol.md` 存在 `source-edge-drift / current-applicability-uncertain`。后续
[`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md)
已直接回读当前 source，并将 child baseline 推进为 `current-source-supported / applicability-reconciled`；
这仍不表示 policy、protocol acceptance 或 runtime applicability 已确认。父记录的整体
`projection-reconciled / source-applicability-uncertain` 继续保留，用于表示其它 review family 和 owner
decision 尚未闭合。

按 `mechanism-design-review` 的最小处置判断，当前结论是 `reuse-existing-projections + simplify`：
父记录不再重复设计字段或机制，只把子记录的来源、standing、未决关系和下一 return 接回共同
fixture envelope。若真实 owner/consumer 出现，后续应在相应子记录开启新的 bounded round；若仍不存在，
保留各自 unknown，不以父记录制造收敛。

本节的当前 evidence standing 是
`projection-reconciled / source-applicability-uncertain / design-observation / acceptance-pending`；
它只改变可回读性，不改变 `WorkCell active-after-prerequisite`。

## 2026-08-25 owner / consumer surface check

本轮只检查当前工作区中与 A/B/C/D 直接相关的有限 surface：`AGENTS.md`、当前
`design/work-cell-protocol.md`、`planning/records/workcell-*` review/readiness records、`item-ledger.md`
以及现有 `evals/` / `experiments/` 入口。检查结果是：能回读的只有
`protocol`、`host/security`、`coordinator-lifecycle`、`record/evidence`、`retention/recovery` 和
`acceptance` 等 owner class；没有发现可交回决定的 named owner，也没有发现 named cross-process
replay/recovery consumer。已有 reviewer 只拥有本轮 review 的检查范围，不因此成为 acceptance owner。

这关闭的是“在没有新 owner/consumer 的情况下继续增加 A/B/C/D 内部 fixture”的当前分支，处置为
`owner-surface-checked / no-proposal-now / route-to-owner`。A/B/D 本身继续保持各自的
`independent-review-complete / retain-unknown / acceptance-pending`；C 进一步收束为
`independent-review-complete / retain-unknown / no-proposal-now-for-replay / route-to-owner /
acceptance-pending`。这不把 owner 缺失改写成协议决定，也不把 canonical protocol、reviewer 或
adapter 当成 owner。

本轮 evidence standing 只是 workspace-scoped static planning observation，不是行为 Run、security
acceptance、matched comparison 或 protocol acceptance。允许效果仅为更新 next-return 和 item
projection；禁止补字段、选择 cutoff/revocation/replay/retention policy、创建 registry/runtime、
启动 provider/eval Run 或打开 DeepSeek/实现阶段。只有 named owner、真实 cross-process/recovery
consumer、协议 source/evidence 变化、owner-backed decision 或会改变判断的 counterexample 出现时，
才在对应 A/B/C/D child record 开新 round。

## Independent review

`Lagrange`（Agent `01a0388c-2464-7191-b316-3315649d9228`）完成两轮只读复核。初轮指出父 projection
遗漏既有 A/B/C/D 的 `source-edge-drift / current-applicability-uncertain` qualifier；修订后复读
`accept`。复核确认 A/B/C/D 的 child standing、`reuse-existing-projections + simplify` 处置以及
source applicability、protocol acceptance、runtime/DeepSeek/implementation 边界均可区分；该结论
只接受本次 parent projection reconciliation，不构成 WorkCell protocol acceptance。

## 2026-08-25 current-source applicability child projection

[`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md)
直接回读 revision-2 后的 §5.1/§5.2、§6.1–§6.3/§6.5、§7、§9、§11.1、§12.2、§17 和 §18.2/§18.9–§18.12。
A/B/C/D 的既有 baseline 现在可从当前 source 回指，child standing 为
`current-source-supported / applicability-reconciled / retain-unknown`；这只消除 source-level
回指缺口，不选择 cutoff、活动撤销、Event replay、retention 或 lineage policy。

父记录仍保持 `projection-reconciled / source-applicability-uncertain / acceptance-pending`，因为
readiness 的其他 review family 与 owner-backed semantic/policy acceptance 仍未闭合。该 child record
由 `Halley` 独立只读 `ACCEPT`，不取得 protocol、host/security、record、retention、runtime、DeepSeek
或 implementation acceptance。
