# WorkCell spec identity 与 request/record 边界审查

状态：`design-review-round-1 / candidate-proposal / independent-review-complete / acceptance-pending`；不是协议接受、spec registry
授权、runtime 实现、implementation authorization 或 eval Run。

本记录只审查一个 bounded review unit：`WorkCellRunRequest.spec` 的 inline/reference 形态，如何在
request、RunRecord、跨 adapter 比较和 retry/continue 关系中保留 **spec identity**。它不重新决定
`WorkCellBinding` identity、Binding authority、spec 内容、digest 算法、registry 生命周期或完整
lineage retention；Binding identity 仍由 [`workcell-record-boundary-review.md`](workcell-record-boundary-review.md)
单独处理。

## 1. 来源与当前观察

- **canonical source：** [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)，本轮 review-time
  fingerprint 为 `git hash-object` 产生的 Git object SHA-1
  `4293057dc1d136fd20ddc7de7144612e458a5b11`，以及 `shasum -a 256` 产生的 raw-file SHA-256
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 早于 contract projection
  revision，不是当前 canonical fingerprint。当前 source applicability 由
  [`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
  回接。
- **相关段落：** §3–§4 的 `WorkCellSpec` 可持久化/可比较定位、§6.1 的 `WorkCellRunRequest.spec`、
  §6.5 的 `WorkCellRunRecord`、§8.2 的 retry/continue、§11 的 adapter comparability、§17.2 的
  spec inline/reference open item、§18.1/§18.12 的 identity/lineage 反例。

当前 source 同时表达了四件事：

1. `WorkCellSpec` 是 provider-neutral、可持久化且可比较的声明；
2. `WorkCellRunRequest.spec` 可以是 inline `WorkCellSpec`，也可以是
   `{ specRef: string; digest: string }`；
3. `specRef` 的 authority、digest 的 canonical source/格式/计算 owner、不可取和 retention 尚未定义；
4. `WorkCellRunRecord` 示例保存 `requestId`，但没有显式的 spec identity、`specRef` 或 digest projection。

因此当前存在一个与 Binding identity 不同的边界观察：request 的 identity（`requestId`）只标识一次
启动消息，不自然等于被执行的 Spec identity；若 request 不可取，RunRecord 也没有明确的结构化关系
指向原 Spec。这个差异是 design/auditability hypothesis，不是已观察到的 record consumer failure。

## 2. Review unit：identity、owner、压力

### Identity

- **subject：** 一次 request/run 所采用的 `WorkCellSpec` identity；不是 Spec 内容的完整复制，也不是
  host grant、executor session 或新的 registry。
- **cardinality（候选而非已接受事实）：** 本 review 候选要求一个 RunRecord 至多关联一个 admission
  时采用的 Spec identity；同一 Spec 可以服务多个 request/run，不能预先把 `requestId` 当作可比较的
  Spec identity。
- **owner class（候选而非既定职责）：** Spec producer/versioning、protocol、record/evidence 和 eval
  owner 可能分别影响声明 identity、request/record contract、事实投影/retention 与比较 consumer；具体
  owner 当前均为 `unknown`。
- **nearest neighbors：** `requestId` 是 launch-message identity，`runId` 是 execution identity，
  `bindingRef` 是 host admission identity；三者都不能自动冒充 Spec identity。

### 可观察压力

当前只有两类有界压力：

1. `WorkCellSpec` 被定义为可比较，但同一 Spec 的多次 request、inline 与 reference 两种传输形态如何
   机械地比较，尚不能从 RunRecord 独立重建；
2. §18.12 的有限 request/run record lineage 要求与本项有交叉影响：若 parent request 不可取，Spec
   identity 的回查和 retry/continue 因果都可能不完整；前者不能用来证明或恢复后者，lineage contract
   仍由 observation/lineage review 单独处理。

尚无 named cross-adapter consumer、真实 retention policy、record audit failure 或 matched harness Run。
因此不能把“必须新增字段”写成已验证事实。

## 3. 需要保持的关系

以下是 review 候选希望 owner 能区分的关系，不是当前 canonical schema：

```text
RunRecord --specIdentity--> declared WorkCellSpec identity
RunRecord --bindingRef----> admission WorkCellBinding identity
RunRecord --runId----------> one execution
RunRecord --requestId------> one launch message
spec identity != binding authority != execution outcome
```

Spec identity 只能支持关联、比较和 honest `unknown`；它不授予 workspace、tool、network 或 secret effect，
也不证明 Spec 内容实际被 executor 正确消费。

## 4. 有限处置比较

| 处置 | 结果 | 当前判断 |
| --- | --- | --- |
| 保持 inline/reference union，仅由 `requestId` 间接回找 Spec | 最少改动；request 可取时能回溯，但 request 不可取、跨 run 比较和 parent 缺失时的 identity 仍 unknown | `retain-unknown`；作为 baseline 保留 |
| 允许 inline 或 reference 作为传输形态，并在 request/record 形成同一结构化 spec identity projection | 保留部署灵活性，同时使 RunRecord 能结构化关联 Spec；digest canonicalization、retention 和缺失结果仍需 owner 决定 | `design-candidate`；当前最小候选 |
| 引用既有不可变 Spec artifact，但不新增 registry | 可能支持跨进程回查；artifact authority、寻址、retention、不可取和 digest 关系仍需 owner 定义 | `retain-candidate`；不等于 registry 或 runtime fetch |
| 默认 immutable `specRef` 并建立 registry | 可复用和跨进程寻址，但新增 registry authority、生命周期、保留、修正和不可取语义 | `no-proposal-now`；没有真实 consumer 不先建机制 |
| 把完整 `WorkCellSpec` 复制进每个 RunRecord | 可能减少回查，也可能是未来审计 consumer 的内容 snapshot；会扩大 record 与 declaration 的耦合、版本和 retention 负担 | `defer / no-proposal-now`；identity projection 与内容 snapshot 是两个 review unit |

## 5. 当前最小候选与停止边界

当前最小候选是：保留 `WorkCellRunRequest.spec` 的 inline/reference 传输选择，但由 protocol/record owner
明确一个可结构化关联、并在约定保留范围内支持恢复或比较的 Spec identity record projection（例如
`specRef` 加明确 digest metadata，或等强度的 canonical identity）；是否需要独立索引由真实 consumer
决定。该候选不是已接受的字段名或 schema。

候选必须满足：

- request identity、run identity、spec identity、binding identity 可分别消费；lineage relation 仍由独立
  contract 表达；
- 如果采用 reference，owner 必须说明它指向的不可变 identity/version、artifact authority 与 fetch/retention
  关系；引用本身不自动创建 registry authority 或 runtime fetch guarantee；
- inline 形态不能因为没有 `specRef` 就退化为无 identity；若 identity/digest 无法计算或回查，必须保留
  结构化 `unknown`/`unavailable` 及来源；digest mismatch、引用版本冲突或格式非法则应有结构化
  `fail`/`invalid-reference`，不靠自然语言补回；
- retry/continue 的 child record 可以复用父 Spec identity，但该关系仍由 `parent`/lineage contract
  表达，Spec identity 不承担 `retry-of` 或 `continued-from`；
- digest 的算法、canonicalization、目标 snapshot、计算者、跨版本相等关系仍是独立 unknown；Spec
  artifact retention、request retention、RunRecord retention 和 correction 也分别未知，不由一个
  `retention` 概念代替；不在本 review 中猜定。

本轮明确不处理：Binding identity/digest、完整 Spec snapshot、spec registry、request/run retention
policy、Event replay、parent lineage store、provider adapter translation、runtime fetch、host policy
或任何实现任务。

## 6. 证据、owner 与回返

- **evidence standing：** `design observation / candidate-proposal`；无真实 Run、record consumer、
  matched harness comparison、security review 或 acceptance。
- **owner class：** Spec producer/versioning、protocol、record/evidence 和 eval owner 可能分别影响声明
  identity、canonical request/record contract、projection/retention 与比较 consumer；这些是候选 owner
  class，不是已授予职责；acceptance owner 当前 `unknown`。
- **mechanical observation：** 对同一声明的 inline/reference request，检查是否能从 record 读取并匹配
  结构化 Spec identity；缺失/不可取返回 `unknown`/`unavailable`，digest mismatch、引用版本冲突或格式
  非法返回结构化 `fail`/`invalid-reference`，canonicalization 未定义导致无法判断相等时仍为 `unknown`；
  这不证明 executor 正确执行。
- **semantic review：** 独立 reviewer 判断 identity、内容 snapshot、authority、execution 和 lineage
  是否被分开；review 不取得协议接受。
- **acceptance：** 由明确 protocol/record/acceptance owner 决定是否接受 projection、inline/reference
  默认和 digest/retention 关系；当前 `unknown`。
- **next action：** 若 owner 接受最小 projection，再回写 canonical request/record shape；若 owner 认为
  request retention 已足够，必须明确 request 不可取、跨 run 比较和 parent 缺失时的 structured unknown，
  不能只保留一句“由 request 回查”。

## 7. 迭代闭环与停止条件

- **baseline：** request 支持 inline/reference；record 只显式保存 `requestId`；§17.2 将默认形态列为
  open；Binding identity 已有独立 review。
- **minimum delta：** 建立本 bounded review，比较间接回查、结构化 projection、registry 和完整复制；
  不修改 canonical protocol，不增加 runtime state 或 registry。
- **成功观察：** owner 能明确回答“一个 RunRecord 如何指向采用的 Spec identity”，并保持 request/run/
  binding/lineage 区分；缺失关系可诚实表示 unknown。
- **失败处置：** 若没有真实 consumer 或 owner 无法决定，保持 `retain-unknown / route-to-owner`；不
  继续叠加字段、registry、fetch mechanism 或 implementation plan。
- **revisit：** named cross-adapter comparison、record retention owner、spec versioning policy、真实
  retry recovery 或 acceptance rubric 出现时重开；若候选开始承担内容快照、权限、replay 或 lineage，
  拆成新的 review unit。

## Independent review

`McClintock`（agent `01a0393c-3b3d-7932-b3da-4653254e30ce`）独立复核后要求最小修订并确认：本记录
确实是与 Binding identity、observation/lineage 和 contract-field review 不同的 request/record contract
unit，且没有越过 protocol acceptance、registry、runtime 或 implementation authorization。已按复核收窄：
lineage 降为交叉影响；cardinality/owner 降为候选；不可变 artifact 与 registry 分开；“独立索引”改为
结构化关联和约定保留范围；完整 Spec snapshot 降为另一个待审 unit；缺失/不可取与
`invalid-reference` 分开；Spec artifact、request、RunRecord retention 分开。该 review 只接受边界修订，
不取得 Spec projection、protocol acceptance、registry、runtime 或实现授权。
