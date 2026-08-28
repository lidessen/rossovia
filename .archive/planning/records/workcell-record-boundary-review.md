# WorkCell RunRecord binding identity 边界审查

状态：`design-review-round-2 / candidate-proposal / independent-review-complete / acceptance-pending`；
不是协议接受、host/security 授权、record registry、runtime 实现、implementation authorization 或 eval Run。

本记录只审查一个 bounded review unit：`WorkCellRunRecord` 是否需要显式保留它所对应的
`WorkCellBinding` identity。它不同时决定 drain cutoff、active revocation、Event replay、lineage
retention 或 `EffectSummary` 的完整 shape；这些仍由既有 A/B/C/D review 和相应 owner 处理。

## 1. 来源与当前观察

- **canonical source：** [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)，本轮 review-time
  working-tree fingerprint 为 Git object SHA-1 `4293057dc1d136fd20ddc7de7144612e458a5b11`，
  以及 `shasum -a 256` 产生的 raw-file SHA-256
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；两者不是同一种 SHA-1 计算，
  且该 edge 早于 contract projection revision，不是当前 canonical fingerprint。当前 source applicability
  由 [`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
  回接。
- **相关段落：** §5.1 的 `WorkCellBinding` 与 `bindingId`、§6.1 的 `WorkCellRunRequest.bindingRef` 及其
  digest metadata、
  §6.5 的 `WorkCellRunRecord`、§17.2 的 Binding identity unknown、§18 的审计反例。
- **既有 planning evidence：** [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md) 的 B4
  fixture 已观察到 RunRecord 示例没有显式 `bindingRef`/digest；它把问题限定为 canonical record
  shape 的载体缺口，没有自行补字段或宣称 consumer 必然无法确认。

当前 source 同时表达了三件事：

1. host 在 admission 时物化带 `bindingId` 的 Binding snapshot；正文另以 digest 描述 snapshot 引用，
   但 digest 的 canonical 来源、格式、计算者和保留目标尚未定义；
2. RunRequest 明确引用 `{ bindingId, digest }`；
3. 运行记录保存 binding 引用和 observation，但 `WorkCellRunRecord` 的 canonical type 示例没有
   `bindingRef` 字段，完整示例也没有把它放入 RunRecord。

这不是权限缺口本身：Spec 不授予 effect，Binding 仍由 host 拥有；它是事实投影能否独立指向实际
admission snapshot 的 record-boundary discrepancy。

## 2. Review unit：identity、owner、压力

### Identity

- subject：一次 `WorkCellRunRecord` 对应的实际 `WorkCellBinding` snapshot identity；不是 Binding
  内容复制，也不是新的授权对象。
- cardinality：每个 RunRecord 至多记录一个 admission Binding identity；retry/continue 产生新
  RunRecord，引用可以与父 run 相同或不同，不由该字段承担 `retry-of` / `continued-from` lineage。
- lifecycle：host 在 admission 创建/物化 Binding；coordinator 在启动请求时绑定引用；record/evidence
  owner 负责保留或投影事实；acceptance owner 仍 `unknown`。
- 最近邻：`WorkCellRunRequest.bindingRef` 是启动输入；`WorkspaceBinding` 是实际资源边界；
  `EvidenceRef` 是证据引用；它们不能互相冒充 RunRecord 的 binding identity。

### Origin：可观察压力

- 当前 canonical protocol/record contract 是本 review 的 design consumer：它需要明确一条 RunRecord
  如何关联 host policy/binding snapshot。仅看 `requestId` 在 request 不可取、多个 request 版本或跨
  adapter 比较时可能无法稳定恢复；这是待验证的 design hypothesis，不是已有 record consumer 的实际失败。
- 当前 `bindingRef` 只在 RunRequest 示例中出现，而 RunRecord 公开事实投影没有同样明确的字段；
  通过自由文本、provider session 或 evidence URI 猜回 identity 不满足结构化合同。
- 压力是 design observation + auditability hypothesis，不是 host Run、安全事件或 acceptance 证据；
  当前仍没有 named external record consumer、retention owner 或具体 audit rubric。

### Destination：必须保持的关系

RunRecord consumer 至少能区分：

```text
RunRecord --bindingRef--> admission Binding snapshot identity
RunRecord --effects/evidence--> observed or unavailable facts
Binding identity != Binding authority grant
```

显式 identity 只能支持关联、比较和 unknown 表达；它不证明 host 确实执行了所有 Binding policy，也
不把 record owner 变成 security authority。

## 3. 有限处置比较

| 处置 | 结果 | 当前判断 |
| --- | --- | --- |
| 保持现状，只依赖 RunRequest 或 EvidenceRef 间接关联 | 不新增字段；但 request/evidence 不可取时的审计能力仍是未验证 hypothesis，且不能让 URI、prompt 或 provider record 变成隐式 authority | `retain-unknown`；在 canonical protocol/record review 中继续比较 |
| 在 RunRecord 加显式 `bindingRef: { bindingId, digest }` | 用最小结构化引用候选闭合 RunRecord→Binding identity 关系；不复制权限内容、不新增 runtime state；digest 语义仍需另行定义 | `design-candidate`，需 protocol/record owner 与 acceptance owner 判断 |
| 把完整 WorkCellBinding 复制进 RunRecord | 记录与授权内容强耦合，扩大 secret/tool/policy 暴露和版本负担 | `no-proposal`；违反 identity 与 authority 分离 |
| 建立独立 lineage/registry 解决该单一缺口 | 为一次 record identity 关系增加新的持久机制、retention 和 owner | `no-proposal`；当前没有 named consumer 或不可由字段解决的压力 |

## 4. 当前最小候选与边界

当前推荐的最小候选是：在 canonical `WorkCellRunRecord` 设计中明确一个以 `bindingId` 为核心、可带
digest reference metadata 的 `bindingRef`，或由 protocol/record owner 提供同等强度、可独立索引的
结构化 record projection。`digest` 不是当前 `WorkCellBinding` 类型已接受的字段；其 snapshot 目标、
格式、计算 owner、保留和不可取表达仍为 unknown。二者尚未二选一接受；在接受前不修改 runtime、registry
或 host policy。

候选必须满足：

- `bindingRef` 是关联标识，不是新的 capability grant；
- 若采用 digest，它必须指向 admission snapshot/version，而不是 provider session 或可变 host object；
  当前不预先决定算法、载体或 retention；
- 缺失、不可取或不匹配时返回结构化 `unknown`/`unavailable`，不凭自然语言补回；
- retry/continue 的 child record 独立记录 binding reference；该引用可以和父 run 相同或不同，且不承担
  lineage；
- snapshot retention、reference correction、late observation、lineage retention 和具体载体是彼此
  独立的 unknown：各自的 owner、规则、保留/修正结果和可消费窗口均未确定；`bindingRef` 本身不保证
  snapshot 可长期取得、可反解、被保留或支持 lineage recovery；
- semantic review、acceptance 和 security policy 不从 `bindingRef` 自动推出。

本轮明确不处理：Binding 到期/撤销的活动 run policy、drain cutoff、EffectSummary 全部字段、Event
replay、parent lineage retention、provider adapter translation。这些关系若被混入，会拆成新的
review unit。

## 5. 证据、owner 与回返

- **evidence standing：** `design observation / candidate-proposal`；没有真实 Run、record consumer、
  security review、matched harness comparison 或 acceptance。
- **owner class：** host 负责 Binding identity 的来源；protocol owner 决定 canonical contract；
  record/evidence owner 决定 projection/retention；acceptance owner `unknown`。
- **mechanical observation：** 若候选载体被接受，能否从 RunRecord 读取并匹配 `bindingId` 及其可用的
  digest metadata，以及缺失/不匹配是否保留 `unknown`；这不证明权限实际执行。
- **semantic review：** 由独立 reviewer 判断字段是否忠实区分 identity、authority、effect 和 evidence；
  review 不取得 acceptance。
- **acceptance：** 由明确 protocol/record acceptance owner 决定是否接受 `bindingRef` 载体；当前
  `unknown`。
- **next action：** 若 owner 接受最小候选，再回写 `design/work-cell-protocol.md` 的 RunRecord shape；若
  owner 认为现有 request/evidence 足够，必须说明 request retention、跨 adapter 比较和缺失事实的
  structured unknown contract，不能只删除字段。

## 6. 迭代闭环与停止边界

- **baseline：** Binding 有 identity/digest，RunRequest 有 `bindingRef`，RunRecord canonical shape
  没有显式对应字段；B4 已将其记录为载体缺口。
- **minimum delta：** 建立本 review unit，比较字段投影、间接关联、完整复制和 registry 四种处置；
  不直接修改 canonical design。
- **成功判据：** 设计 owner 能明确回答 RunRecord 如何指向 admission Binding identity，且不把 identity
  变成 authority；缺失事实仍能表示 unknown。
- **失败处置：** 若 canonical protocol/record owner 不接受该载体，返回 `retain-unknown` 或
  `no-proposal-now`，并要求明确 request/evidence retention 与 structured unknown contract；不创建
  registry、runtime gate、host fake、adapter 或 implementation plan。
- **revisit：** 真实 record/evidence consumer、host/security owner、跨 adapter comparison fixture 或
  acceptance rubric 出现时重开；若新的字段会承担 effect/lineage/replay 语义，拆成新的 review unit。

## Independent review

独立 reviewer：Franklin（agent `01a0384d-83bc-7571-9ab1-516602636de7`）已完成终审；确认
canonical protocol/record contract 的 design-consumer 位置、B4 hypothesis 边界、digest 与
retention/correction/late-observation/lineage 的独立 unknown、retry/continue 的父 Binding 复用和
`bindingRef` 不承载 lineage。该 review 仍未取得 `bindingRef` acceptance，也没有产生 protocol
acceptance、registry、runtime 或 implementation authorization。
