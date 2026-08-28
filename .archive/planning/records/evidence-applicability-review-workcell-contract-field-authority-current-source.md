# WorkCell contract field authority current-source applicability review

状态：`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`；
不是 contract canonical shape acceptance、WorkCell protocol acceptance、host/security 授权、record registry、
runtime 实现、provider choice 或 implementation authorization。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象、触发与来源地位

本记录是 `workcell-contract-field-boundary-review.md` 与
`evidence-applicability-review-workcell-design-revision-2.md` 留下的最小 next practice：直接回读当前
canonical protocol，判断既有 declaration/grant/request/call/return/observation/check 的字段权威
边界是否仍可适用。它只做 source applicability，不补 canonical field shape，不代替
protocol/host-security/record-evidence/acceptance owner。

当前 canonical source：

| field | value |
| --- | --- |
| path | `design/work-cell-protocol.md` |
| Git object SHA-1 | `fa602fafd444d1f738c20ac4b4ec16c9e4d8654e` |
| raw-file SHA-256 | `c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b` |
| line count | `1188` |
| previous current-source edge | Git `7240b23bb8c9a276de1c2ce4a4f03576fb23ded9` / raw `513e7ed9f329976bdeaea5e75e9ad57c60bb1be040baae099344c36a8b26fcb8` |
| older review-time edge | Git `4293057dc1d136fd20ddc7de7144612e458a5b11` / raw `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e` |

旧 edge 只保留为字段边界 review 的 provenance。最新 source 又收窄了 public Run state 与 parent
relation；本次已对受影响 section 完成窄回读。以下结论区分 current-source boundary applicability 与
仍未接受的 shape、host enforcement 和 protocol acceptance。

## 2. Current-source read

本次直接读取并逐项回指：

| current source | 当前可回指的关系 | applicability result |
| --- | --- | --- |
| §4.1 `WorkCellSpec` | `objective`、`workspace`、`requirements`、`limits`、`completion` 属于调用方 declaration；不含 host absolute root、secret、provider session、acceptance 或运行结果 | `supported` |
| §4.2–§4.3 `WorkspaceScope` / `ExecutionRequirements` | `readPaths`/`writePaths`/`commandRequirements` 与 tool/feature/isolation/interactiveInput 是需求和逻辑范围，不是 host grant；自然语言不能扩大范围 | `supported` |
| §4.4 `ResourceLimits` | limits 是运行硬边界，不是 cost estimate、priority、retry 或业务 acceptance | `supported` |
| §4.5 `CompletionContract` | action/output/artifact 三类完成信号正交；声明不等于 call、host observation 或 acceptance | `supported` |
| §5.1 `WorkCellBinding` | Binding 是 host admission 后的实际 workspace、toolSurface、effectPolicy、executor boundary；immutable snapshot 与 Spec 分层可回指 | `boundary supported; mapping/shape open` |
| §5.2 host/adapter boundary | host 负责 workspace、tool、command/network/secret/output enforcement、effect observation、cancellation 与 event/check 输入；executor 不能绕过 Binding 或产生 acceptance | `responsibility boundary supported` |
| §6.1 `WorkCellRunRequest` | request 携带 Spec inline/reference、bindingRef、idempotency 与 parent relation；当前 relation 只为 `retry-of` / `continued-from`，generic Task/WorkItem derivation 留在上游；不重复成为 grant 或运行事实 | `supported` |
| §6.3–§6.4 context/return | host/coordinator 提供受控 context；executor return 只带局部 call/output/usage/adapter evidence，不直接生成 host observation 或 acceptance | `supported` |
| §6.5 `WorkCellRunRecord` | §6.2/§6.5/§9.2 将 terminal execution state 后独立进行 record finalization，与 public Run state 分开；`execution`、`runtime`、`completionChecks`、`effects`、`usage`、`evidence` 是事实/检查投影槽位；完整 shape、authority、retention、correction 未冻结 | `slot/applicability supported; shape open` |
| §7.3 / §8.1–§8.3 | `observed`/`unavailable` 不得变成 zero/success；MechanicalCheck、SemanticReview、AcceptanceDecision 是不同对象和 owner | `standing/authority separation supported` |
| §16 / §17.1–§17.3 / §18.1, §18.4, §18.7 | declaration/grant、execution/effect、failure/record、mechanical check、semantic review 与 acceptance 不能互相升级；需求不能越权成 host effect | `boundary supported; owner/shape open` |

## 3. 与旧 contract-field review 的关系

旧 review 的 bounded unit 仍保留：declaration、host binding/grant、run request、live call、executor
return、host/coordinator observation、record/evidence、mechanical check、semantic review 和 acceptance
的分层。当前 source 直接支持这些对象层级和“不互相代签”的关系；旧 review 中更细的字段候选仍是
review-derived/open candidate：

- requirements 到 grant 的 canonical mapping、拒绝原因的最小结构和 `CommandGrant.argumentShape` /
  argv policy 仍 open；current source 说明需求不等于授予，但没有冻结 mapping contract；
- `CompletionActionCall`、`CompletionActionObservation`、`EffectSummary`、`UsageObservation` 的
  完整 shape、identity、source standing、retention/correction 和跨 transport reconciliation 仍 open；
- `unknown`、`unavailable`、`not-run` 的适用范围和原因表达可由通用 observation/check 规则回指，但不
  能据此反推某个具体字段 family 的 canonical schema；
- host/security enforcement、record retention、late correction、registry authority 和 acceptance
  authority 的实际 owner 未由 current source named；不能用字段存在、provider report、自然语言或
  MechanicalCheck pass 补齐；
- 旧 review 关于不创建通用 `EffectRecord`/registry、不过早增加 queue/retry/event mechanism 的判断
  保留为 review candidate；current source 直接支持的是现有分层与机制未被授权，不把候选写成新的
  canonical prohibition。

这证明的是旧 review unit 对当前 source 的 **boundary applicability**，不是旧候选 field family 已采用。

## 4. Standing、consumer、owner 与处置

| field | current result |
| --- | --- |
| standing | `source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending` |
| source standing | current sections are directly readable; old `7240/513e` and `429/26ec` edges remain historical review provenance |
| consumer | Spec producer、host admission、executor/context、coordinator、record/evidence、mechanical check、semantic review、acceptance surface 可能消费这些关系；实际 named consumer `unknown` |
| owner class | declaration/contract：protocol；grant/enforcement：host/security；submission/return：executor/context；observation/effect/usage：host/coordinator/adapter；retention/correction：record/evidence；check：mechanical-check；semantic/acceptance：各自 authority |
| named owner | 上述 owner class 均无具体 named owner；consumer 不等于 owner |
| evidence standing | source/applicability observation；无 canonical field shape、host enforcement Run、retention/correction evidence、matched adapter fixture 或 protocol acceptance |
| child disposition | `retain-current-source-boundary / reconcile-details-as-open / route-to-owner / no-rerun-now`；仅适用于本 child |
| parent disposition before projection sync | parent 继续保留 field-authority 的 `independent-review-complete / acceptance-pending`；本 child 的 projection 已可回接 readiness/ledger |
| allowed effect | 更新 contract-field provenance、readiness、plan、roadmap、phase、estimate、ledger 与 loop projection；保留 mapping/shape/owner unknown |
| prohibited effect | 不修改 canonical protocol，不新增 field/registry/queue/event bus/retry controller，不重跑旧 Run，不选择 provider，不实现、不把旧 review verdict 写成 acceptance |
| stage exit | 先完成本 child 独立复核与 parent projection sync；然后由 protocol、host/security、executor/context、record/evidence、check、semantic-review 和 acceptance owner 分别对 mapping、shape、authority、retention/correction 和 acceptance 作出结构化决定；该 exit 不自动等于 protocol acceptance |
| revisit | current source 再修订、named owner/consumer、host enforcement fixture、跨 adapter comparison、retention/correction relation 或 acceptance rubric 出现时 reopen |

## 5. Practice-cycle result

- **baseline：** 旧 contract-field review 在 `429/26ec` review-time edge 上形成了 declaration/grant/
  call/observation/check 的边界候选；revision-2 applicability matrix 将 contract field authority 留在
  `current-applicability-pending`。
- **observation：** 该 child 当时读取的 `2ed/f874` source 直接支持需求与授予分离、host 拥有 grant/effect boundary、
  executor return 不冒充 host observation、record/check/review/acceptance 分层和 structured unknown。
- **minimum change：** 新增本 source-applicability child，明确旧候选可回指当前边界，但不把 mapping、
  field shape、owner、retention 或 acceptance 写成已定事实。
- **反观察与剩余未知：** 若需要跨字段 canonical mapping、命令参数 policy、effect/usage shape、host
  enforcement、late correction 或 retention contract，当前 source 本身不能支撑；必须 route 给对应
  owner，不能靠本记录补齐。
- **当前 disposition：** `settle` 仅针对本轮 current-source boundary applicability；contract-field design
  candidate 仍为 `route / acceptance-pending`，本次 exact candidate 已完成 independent review。

## 6. 独立复核与出口

上一 source edge 上的本记录曾由独立 reviewer 复核 source section 回指、旧 edge lineage、current-source
支持范围、consumer/owner 分离、parent projection boundary 和不越权边界。该 reviewer 不取得 field
shape、WorkCell protocol、host/security、provider、runtime 或实现接受权；本次 current-source 窄回读的
exact candidate 也已完成独立复核，canonical protocol 不因本 child 自动修改。

`McClintock`（Agent `01a0393c-3b3d-7932-b3da-4653254e30ce`）的 `ACCEPT` 只覆盖 previous source edge。
复核确认：

- previous protocol fingerprint 与 §4.1–§5.2、§6.1、§6.3–§6.5、§7.3、§8、§16–§18 的回指准确；旧
  `429/26ec` 只保留为 provenance；
- `supported` 只表示 current-source boundary 可回指，未把 mapping、field shape、host enforcement、
  retention/correction、owner 或 acceptance 写成已定事实；
- consumer、owner class、named owner 与 parent `current-applicability-pending` 已分开；允许/禁止
  效果和 revisit 没有越过 source applicability、projection 或实现冻结边界。

该 `ACCEPT` 只覆盖上一 source edge 上本 child 的 source applicability、provenance 和 projection
boundary；不覆盖当前 `fa602faf… / c78876b4…` source。当前 exact candidate 的独立复核由 `Hooke`
完成并 `ACCEPT`，也不取得
contract field canonical shape、host/security enforcement、record retention/correction、WorkCell protocol
acceptance、provider/eval、runtime、DeepSeek 或 implementation acceptance。
