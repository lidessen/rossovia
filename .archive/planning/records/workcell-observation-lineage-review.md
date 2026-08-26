# WorkCell 观察与因果边界回返：C/D

状态：`design-review-round-1 / source-provenance-reconciled / independent-review-complete / unresolved-consumer / acceptance-pending`；
不是协议接受、eval Run 或实现授权。

本记录承接 [`workcell-open-relations-review.md`](workcell-open-relations-review.md) 和
[`workcell-lifecycle-review.md`](workcell-lifecycle-review.md)，回返 C（Event 顺序、去重、
重放）和 D（retry/continue lineage 可恢复性）。本轮不实现 event bus、replay store、session
resume、registry 或 retention service；只判断消费者能依赖的最小关系，并保留缺失 owner/consumer
时的 unknown。

## 1. 来源和共同边界

- **canonical source：** [`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)。本轮记录的
  review-time/frozen source edge 是 Git object SHA-1 `00a7ec7f4b6e11771f5774e2f5511f5c73df2552` 与
  secondary SHA-256 `25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272`；它们不是
  当前 protocol fingerprint。旧记录未注明算法，两个值不能作为内容 drift 的直接证据；本轮已明确
  算法，不把它们混作一个 current hash。
- **planning source：** [`item-ledger.md`](../item-ledger.md) 的 C/D sub-item，以及
  [`workcell-open-relations-review.md`](workcell-open-relations-review.md) 的 fixture envelope。
- **当前 evidence standing：** `design observation`；没有跨进程事件消费者、重启 Run、保留策略
  实验或独立 protocol acceptance。
- **共同不变关系：** Event 是规范化观察对象；RunRecord 是候选事实投影；新的 retry/continue
  必须产生新的 request/run；provider session、自然语言和字符串事件都不是 canonical authority。

本记录区分两种问题：Event 能否被消费者安全地观察/重放，和因果关系能否从保留的 request/run
record 恢复。它们相关，但不能用一个“trace”或一个 provider session 同时解决。

## 2. C：Event 顺序、去重、重放

### 2.1 当前 baseline 与缺口

当前协议已经有封闭的 `WorkCellEvent` 联合类型，并要求新增事件版本化；事件类型包括 run
admitted、tool requested/completed、effect observed、cancel requested、run terminated 和
check completed。当前协议没有承诺：

- 每个事件的稳定 identity、所属 run 的统一 envelope 和 sequence；
- 重复事件如何识别，乱序事件是否可接受；
- 缺口、进程重启和消费者断线后的恢复边界；
- consumer 是否可以仅凭 Event 重建 tool/effect/run 的事实；
- `normalized-events` evidence 是可重放日志，还是仅供事后核查的摘要引用。

因此“有结构化事件”不等于“事件流可重放”。时间戳也不能替代顺序或去重 authority：两个
事件可能同一时间、乱序到达，或在同一调用上重复投递。

### 2.2 最小 fixture 与反例

| fixture | 可观察情况 | 必须避免的误判 |
| --- | --- | --- |
| C1 正常流 | admitted、tool requested/completed、effect observed、terminated 顺序到达 | 不把正常到达误当成已承诺的 replay contract |
| C2 重复流 | 同一 tool completion 或 effect observation 重复投递 | 不把一次 effect 计成两次 effect |
| C3 乱序/缺口 | terminated 先到，或 tool completed 缺失 | 不从事件到达顺序猜测完整事实 |
| C4 重启后观察 | consumer 丢失部分事件，只能拿到 RunRecord 与 evidence ref | 不把缺失 Event 当作“未发生”，也不靠 provider session 补齐 |

### 2.3 有限候选关系

**C-1：只观察，candidate public fact projection。** Event 只提供实时/尽力而为的规范化观察；
消费者不能用 Event 单独重建完整事实。当前候选只把可取得的 RunRecord/evidence 作为事实投影
来源；重复、乱序和缺口仍由 record/evidence contract 或 explicit unknown 处理。没有真实跨进程
replay consumer 时，这是当前最小候选，尚不是已接受的 authority，也不引入新机制。

**C-2：可重放事件流。** 若真实 consumer 需要从 Event 恢复事实，protocol/evidence owner
必须另行定义稳定 event identity、run 关联、sequence、dedup、gap 和重启恢复关系，并给出
可检验 fixture。仅给事件增加“顺序字段”但没有 gap/retention/authority 关系，不足以称为
replay。

**C-3：provider trace 作为补全源。** 用 provider session、rawSteps 或 prompt history 补回
缺失 Event。该候选被边界排除：provider-specific evidence 可以保留，但不能成为 WorkCell
事实或权限/完成判断的替代 authority。

### 2.4 本轮结构化结果

```yaml
item: event-order-dedup-replay
owner_class: protocol + record-evidence
consumer: unknown; no named cross-process replay consumer
decision: retain-unknown
baseline_preserved: yes
candidate_minimum:
  - until a replay consumer is named, Event is observation rather than a complete fact source
  - available RunRecord/evidence can provide a candidate public fact projection for completed runs;
    this is not an accepted authority or retention guarantee
  - duplicate, gap, and unavailable observations must not be inferred as effect absence
  - a replay claim requires a separately testable event contract
counterexample_result:
  - C2 rejects duplicate-as-second-effect
  - C3 rejects arrival-order-as-fact-order
  - C4 rejects provider-session reconstruction
structured_observation: >-
  Typed Event and replayable Event are different contracts; without the latter, consumers rely on
  RunRecord and explicit evidence standing rather than reconstructing a run from delivery order.
evidence_standing: design observation; later consumer contract or eval fixture required
implementation_authorized: false
revisit_when: >-
  A real cross-process consumer requires replay, or a protocol/evidence owner explicitly accepts
  the observation-only contract and specifies the RunRecord/evidence boundary.
```

本轮不向 `WorkCellEvent` 类型强行添加 `eventId`、`sequence` 或 `gap` 字段；是否需要这些字段
取决于真实 consumer 和 retention authority。当前应先把“不能重放”作为 honest unknown/限制，
而不是把“未来可能重放”写成能力。

## 3. D：retry/continue lineage 可恢复性

### 3.1 当前 baseline 与缺口

当前协议已经区分：

- 一个真实执行有新的 `requestId` 与 `runId`；
- retry 使用 `parent.relation = "retry-of"`；continue 使用 `continued-from`；
- 当前设计候选把相关 run 的事实分别归属，两次 effect 不合并；是否保留、保留多久及由谁负责
  仍为 unknown；
- v1 不原地恢复 provider session；
- `WorkCellRunRequest` 有 `parent`，但示例 `WorkCellRunRecord` 主要保存 `requestId`，没有把
  parent relation 或 lineage digest 明确列为 record 字段。

缺口不在“是否要新 run”，而在“父请求或父记录不可取时还能诚实恢复到哪一粒度”：仅有 child
record 是否足够、parent relation 是否要由 retained request 作为 authority、错误 relation
如何暴露、retention 谁负责，当前都未定。

### 3.2 最小 fixture 与反例

| fixture | 可观察情况 | 必须避免的误判 |
| --- | --- | --- |
| D1 完整链 | child request、parent request 和两份 run record 都保留 | 不把“当前可恢复”误报成 retention contract 已接受 |
| D2 父记录不可取 | child 保留 `parent`，但 parent request/record 暂时或永久不可取 | 不凭 child 自由文本补出父 run 的事实 |
| D3 relation 错误 | `retry-of` 指向继续关系，或 parent 指向不存在/错误 run | 不把错误 lineage 当作普通 retry 成功解析 |
| D4 provider session 尚存 | provider session 可访问，但 canonical request/run relation 缺失 | 不以 session continuity 冒充 WorkCell causal identity |

### 3.3 有限候选关系

**D-1：retained request/run relation candidate source。** 候选保留 parent relation、child/parent
identity 和足够 digest；在记录/请求齐全时尝试恢复 retry/continue，在缺失时返回结构化 unknown。
具体放在 RunRecord、Request retention 或独立 lineage evidence，需 record owner 决定；这不是已
接受的 authority 或 retention guarantee。

**D-2：外部 lineage registry。** 由独立 registry 长期保存因果关系。这个候选可能有真实系统
价值，但当前没有 consumer、retention owner 或 registry 需求，不能因为“将来要恢复”就进入
WorkCell core。

**D-3：provider session resume。** 直接把 session continuation 当作 WorkCell lineage。该
候选被 D4 排除：session 可以是 adapter evidence，却不能证明 WorkCell 的 `retry-of` 或
`continued-from` 关系，也不能决定 workspace effect 是否应合并。

### 3.4 本轮结构化结果

```yaml
item: retry-continue-lineage-recoverability
owner_class: protocol + record-evidence + retention
consumer: unknown; no named recovery consumer
decision: retain-unknown
baseline_preserved: yes
candidate_minimum:
  - every retry/continue remains a new request and new run
  - retained canonical relations, not provider sessions, are the candidate causal source; the
    protocol/record owner has not accepted their authority or retention guarantee
  - missing parent records produce an honest unknown at the unsupported recovery depth
  - effects from related runs remain separately attributable
counterexample_result:
  - D2 rejects inventing parent facts from an incomplete child record
  - D3 rejects silently accepting an invalid parent relation
  - D4 rejects session continuity-as-lineage
structured_observation: >-
  Lineage recovery is bounded by retained canonical request/run relations; a child parent pointer can
  show that the child declared a relation, but without an available canonical authority it cannot
  prove the relation or the missing parent's facts.
evidence_standing: design observation; later retention/record contract or recovery fixture required
implementation_authorized: false
revisit_when: >-
  A real recovery consumer specifies the minimum retained records and acceptable unknown behavior,
  or a record owner resolves where parent relation and lineage identity are canonical.
```

## 4. 迭代闭环记录

- **baseline / observation：** C 有封闭 typed Event，但没有 identity、sequence、duplicate、gap
  和 replay contract；D 有新 run 与 parent relation，但父请求/记录缺失时的恢复边界、retention
  authority 和 record projection 未证明。
- **change hypothesis / minimum delta：** 用 C1–C4、D1–D4 和有限候选关系把“观察”与“可重放”、
  “有 parent 指针”与“可恢复因果”分开；不修改 canonical protocol，不引入 event bus、replay
  store、lineage registry 或 session resume。
- **positive result：** 找到一个可暂时采用的最小候选方向：没有真实 replay/recovery consumer
  时，Event 不承担完整事实重建；可取得的 RunRecord/evidence 与保留的 canonical request/run
  relation 只能作为候选事实/因果来源，不能替代未接受的 owner、authority 或 retention contract；
  缺失处明确返回 unknown。
- **boundary / regression check：** 不能因类型化 Event 就宣称可重放，不能因 child 有 parent
  pointer 就宣称父事实可恢复，不能把 provider session、rawSteps 或时间顺序当成 authority。
- **evidence / acceptance：** 仅有 `design observation`；没有 consumer acceptance、matched
  restart/recovery Run 或 adoption window，不能写成已收敛。
- **projection / move：** 只投影到本文件、`item-ledger.md`、`plan.md` 和 `roadmap.md`；不 move
  到 `design/` canonical，不创建 runtime/eval implementation。
- **下一轮 return：** 先命名真实跨进程 Event consumer 或 recovery consumer；若仍无 consumer，
  protocol owner 可明确接受 observation-only / bounded-lineage contract，再决定是否需要字段级
  设计。

## 5. 阶段影响

本轮完成了 WorkCell 四个开放关系的第一轮 planning-level review，但四项仍不是协议 acceptance：
A/B 的 host/security policy 和 record shape 未定，C/D 的 consumer/retention owner 未定。WorkCell
仍为 `active-after-prerequisite`，DeepSeek Harness 工作系统与所有实现分支仍等待 WorkCell
设计接受和单独授权。

## 6. Source provenance reconciliation

独立 reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`）；未修改文件，也未取得
协议、record、consumer、runtime 或实现 acceptance。

- `git hash-object` 复核得到记录中的 SHA-1；`shasum -a 256` 得到单独记录的 SHA-256；差异由
  算法解释，当前没有证据证明 canonical design 内容已经改变。
- 因此不把旧 C/D planning round 标记为 `stale/source-changed`，也不倒写旧结论；当前 semantic
  standing 仍只为 `design observation / retain-unknown`。
- provenance 已明确；exact semantic review 指出的 C-1、D-1 和 parent pointer 措辞收窄已经完成，
  没有剩余的 authority、retention、lineage 或 runtime 越权语义缺陷。

## 7. Independent semantic review

独立 reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`）；二次 review 已完成。

- C-1 已明确为 `candidate public fact projection`，不是已接受的 authority 或 retention guarantee；
- D-1 已明确为 `candidate relation source`，由 record owner 决定载体，retention 仍 unknown；
- child 的 `parent` pointer 只证明 child 声明了关系，不能证明 relation 或缺失 parent 的事实；
- Event/replay、RunRecord/evidence、missing-parent unknown、provider-session 排除和 acceptance/runtime
  边界均保持为 design observation；没有协议、record、consumer、runtime 或实现 acceptance。

因此 C/D 当前 standing 为 `design observation / independent-review-complete / retain-unknown /
route-to-owner / acceptance-pending`。剩余未知包括真实 replay/recovery consumer、Event replay
contract、RunRecord/evidence owner、parent relation 的 canonical 载体、retention owner/期限，以及
缺失 parent 时可恢复的最大粒度。

## 8. 2026-08-25 source provenance correction（pre-executor source edge）

`evidence-applicability-review-workcell-design.md` 当时重新计算的
`design/work-cell-protocol.md` 的 fingerprint 为 Git SHA-1 `4293057dc1d136fd20ddc7de7144612e458a5b11`
和 raw-file SHA-256 `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该值是
contract projection revision 前的 source edge。因此本记录第 1 节的 `00a7ec…`/`25e859…` 只保留为
C/D review-time/frozen edge，不再作为当前 source hash 使用；当前 source/applicability 由 current-source
child card 与 review-family reconciliation 回接。

这只修正 provenance 表达，不修改 C/D 的 historical design observation、observation-only/
bounded-lineage 边界、`retain-unknown`、owner/consumer 缺口或实现冻结；当前 source applicability
仍为 `uncertain`，需要 recovered snapshot 或 current-source review card 才能重新评估 C/D。
