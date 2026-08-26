# WorkCell CompletionActionCall / Observation contract 候选

状态：`design-review-round-2 / candidate-proposal / independent-review-complete / acceptance-pending`；
不是 protocol acceptance、host/security 授权、runtime 实现、completion acceptance 或 eval Run。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录从 [`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md) 中
拆出一个单一 bounded review unit：把 executor 提交的 `CompletionActionCall` 与 host/coordinator
观察到的 `CompletionActionObservation` 形成可审查的最小候选。它不同时决定 `EffectSummary`、
`UsageObservation`、Event replay、retry/continue lineage 或最终语义验收。

## 1. 当前来源与缺口

- canonical source：[`../design/work-cell-protocol.md`](../../design/work-cell-protocol.md)；本轮 review-time
  `git hash-object` SHA-1 为 `4293057dc1d136fd20ddc7de7144612e458a5b11`，raw SHA-256 为
  `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 早于 contract projection
  revision，不是当前 canonical fingerprint。当前 source applicability 由
  [`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
  回接。
- 相关段落：§4.5 `CompletionContract`、§6.3 `submitCompletionAction`、§6.4
  `WorkCellExecutionReturn.completionActionCalls`、§6.5 `RuntimeObservation`、§8
  `MechanicalCheck`、§17.2 与 §18.3/§18.5。
- 现行文字已经区分三层：声明 `CompletionAction`、executor 提交 `CompletionActionCall`、host
  观察 `CompletionActionObservation`；但后两者只有引用，没有 canonical shape、identity、
  unknown/unavailable、输入保留或与 `maxCalls` 的机械检查关系。
- 当前没有 accepted host/coordinator、record/evidence 或跨 adapter consumer；因此本记录是
  design candidate，不是从 runtime failure 归因出的必需改动。

## 2. Identity、owner 与边界

| 对象 | 最小身份 | 主要 owner | 回答的问题 | 不承担 |
| --- | --- | --- | --- | --- |
| `CompletionAction` | Spec 中的 `name` + input schema | protocol/caller owner | 允许声明哪些结构化完成动作？ | 不证明调用、效果或语义完成 |
| `CompletionActionCall` | executor 在一个 `runId` 内提交的 call identity（可能 unavailable） | executor 产生，host/coordinator 接收 | executor 报告提交了哪个 action、带什么 input？ | 不证明 host 已观察、已执行或已验收 |
| `CompletionActionObservation` | host/coordinator 产生的 `observationId`，关联 `runId` 与可用的 `callId` | host/coordinator；record/evidence owner 保留 | host 实际观察到什么，哪些输入/时间/证据可用？ | 不授予 effect、不判断目标质量、不代替 acceptance |
| `MechanicalCheck` | check 自身的 `checkId`，引用 observation | coordinator/check owner | action name/input 是否符合声明、`maxCalls` 是否满足？ | 不把 pass 写成任务正确或 accepted |

`callId` 是相关性标识，不是全局 authority；`observationId` 由 host/coordinator 生成，不能由
模型返回的自然语言或 provider session 充当。若 executor 没有可用的 `callId`，候选必须显式记录
`callIdentity.state = "unavailable"`，不能用 `callId` 缺省来猜测“没有 callId”“尚未观察到”或“幂等”。

### 2.1 两个提交入口的关系

`WorkCellExecutionContext.submitCompletionAction()` 和
`WorkCellExecutionReturn.completionActionCalls` 是同一个 logical action submission 的两种 transport
view，不是两次独立 call：

- live `submitCompletionAction()` 是 host/coordinator 在收到提交时产生 observation 的主要入口；
- `completionActionCalls` 是 executor 在 execution return 中报告的 call 列表，属于 reconciliation
  input/adapter evidence，不会因为列表再次出现就自动产生第二次 observation；
- 若两种 view 都存在，coordinator 按可用的 call identity、action name 和 input evidence 合并；一致时
  形成一个 observation，冲突或无法合并时保留 `unknown`/`not-run` 的 reconciliation check，不把
  transport message 数量当成 `maxCalls` 计数；
- 若只有 return view，最多记录 executor-reported submission；它不证明 host 在 live boundary 观察到
  或执行了 action。若只有 live view，则 return 缺失不被写成未提交；两者的缺失分别由 observation/
  evidence standing 表达。

这里的合并是 record/check 语义，不创建 event bus、幂等 registry 或 runtime dedup controller。

## 3. 最小候选 shape

以下只是交给 protocol/host/record owner 的候选，不改写 canonical protocol：

```ts
type CompletionActionCall = {
  callIdentity:
    | { state: "available"; callId: string }
    | { state: "unavailable"; reason: StructuredUnavailableReason };
  actionName: string;
  input:
    | { state: "inline"; value: JsonValue }
    | { state: "referenced"; ref: EvidenceRef }
    | { state: "unavailable"; reason: StructuredUnavailableReason };
};

type CompletionActionObservation =
  | {
      state: "observed";
      observationId: string;
      runId: string;
      source: "live-submission" | "reconciled";
      callRef:
        | { state: "matched"; callId: string }
        | { state: "unavailable"; reason: StructuredUnavailableReason };
      actionName: string;
      input:
        | { state: "inline"; value: JsonValue }
        | { state: "referenced"; ref: EvidenceRef }
        | { state: "unavailable"; reason: StructuredUnavailableReason };
      observedAt: Timestamp;
    }
  | {
      state: "unavailable";
      observationId: string;
      runId: string;
      source: "live-submission" | "execution-return" | "reconciled";
      callRef:
        | { state: "matched"; callId: string }
        | { state: "unavailable"; reason: StructuredUnavailableReason };
      actionName?: string;
      reason: StructuredUnavailableReason;
      observedAt: Timestamp;
      evidence?: EvidenceRef[];
    };
```

`JsonValue` 与 `StructuredUnavailableReason` 在这里是候选 schema 的占位类型，不是对当前
canonical protocol 的新增定义。候选的语义是：

- `CompletionActionCall` 记录 executor 的 submission report，不把提交当成 host effect；input 可以
  inline、引用 evidence，或结构化标记 unavailable。它的表示方式不预先决定 input 是否通过 action
  schema。
- `CompletionActionObservation` 只由 host/coordinator 产生；`state: observed` 表示 host 通过 live
  submission 观察到一次 logical submission，或已把 live submission 与 execution return 成功
  reconciliation。`source: "execution-return"` 只允许出现在 `unavailable` observation 或 adapter
  evidence 中；return-only 不产生 observed。`source` 让 consumer 知道 live、return-only unavailable
  或两者 reconciliation 的边界。
- `actionName` 来自结构化 action declaration，不能由自然语言或固定短语路由；未知 action、无效
  input、超过 `maxCalls` 和两种 transport view 冲突都由独立 `MechanicalCheck` 表达。输入表示
  本身不等于 schema validity；若 input 不足以检查，check 使用 `unknown`/`not-run`，而不是伪造 pass。
- `observedAt` 是 host/coordinator 的观测时间；executor 自报时间只能进入 adapter evidence，
  不能成为协议顺序或效果时间的 authority。
- 该 shape 不表达 action 是否改变 workspace、command、network 或 secret；这些仍属于
  `EffectSummary`/effect observation 的独立 review。

## 4. 反例与更简单替代

| 处置 | 结果 | 当前判断 |
| --- | --- | --- |
| 保持 `completionActionCalls: unknown[]`，由 RunRecord 或文字推断 observation | 无法区分 executor 提交、host 观察和缺失事实；consumer 可能把 provider return 当作 host effect | `reject` |
| 只增加一个 `passed`/`accepted` 字段 | 把 schema/maxCalls 机械检查、语义完成和权威验收混在一起 | `reject` |
| 复用 `MechanicalCheck` 代替 observation | check 能表达谓词结果，但不能保存 host 是否观察到哪一次 call 及其 identity | `insufficient` |
| 将完整 action result/effect 复制进 observation | 把 action signal、外部 effect、workspace 变化和验收绑定，扩大 owner/retention 负担 | `no-proposal` |
| 采用上述 call/observation 两层候选，check 独立引用 | 以最小结构关系区分提交、观察、机械检查；保留 unavailable 和 unknown，不增加 runtime mechanism | `design-candidate` |

关键反例：

1. executor 返回 `completionActionCalls`，但 host 在取消/崩溃边界无法确认是否收到；不能写成
   action 未提交或目标未完成，只能保留相应 source 的 `unavailable`/unknown。
2. live submit 与 execution return 同时报告同一 action；必须按 transport view reconciliation 形成
   一个 logical observation，不能把两条消息计成两次 `maxCalls` 或语义完成；无法匹配时保留
   reconciliation `unknown`。
3. call identity 缺失或 input 只能拿到 digest；不能用可选字段缺省来推断没有提交、幂等或 schema pass。
4. 同一可用 `callId` 被重复投递；不能仅凭重复文字或 arrival order 把它计成两次语义完成，是否幂等
   由 host/check owner 另行定义。
5. action schema 通过但 workspace 没有预期文件；observation 与 mechanical check 可以通过，
   semantic review/acceptance 仍可拒绝，不能倒写前层事实。
6. provider session 有 native tool call id，但 canonical WorkCell call 未保留；session id 只能是
   adapter evidence，不能补出 `observationId` 或 host authority。

## 5. Owner、证据与接受边界

- **protocol owner：** 决定候选是否成为 canonical `CompletionActionCall`/Observation shape，及
  版本、未知字段和输入保留边界。
- **executor owner：** 产生 call；不能生成 host observation 或 acceptance。
- **host/coordinator owner：** 接收 call、生成 observation、记录观测时间和 unavailable 原因；
  不因观察到 call 就授予额外 effect。
- **record/evidence owner：** 决定 input 是否 inline、digest/evidence 如何保留、迟到/不可取事实
  如何投影；当前 owner/retention 仍 unknown。
- **check owner：** 运行 schema、action identity、`maxCalls` 等 mechanical predicates；check 不
  取得 semantic review 或 acceptance 权。
- **acceptance owner：** 决定协议是否采用该 shape；当前 unknown。

当前 evidence standing 是 `design observation / candidate-proposal`：没有真实 host Run、跨 adapter
comparison、record retention、matched fixture 或 semantic acceptance。候选若被拒绝，应保留当前
对象分层并明确由 `WorkCellExecutionReturn`/RunRecord 怎样表达 unavailable；不能退回到自然语言推断。

## 6. 迭代闭环与阶段影响

- **baseline：** 当前协议已命名 declaration/call/observation，且有两个 submission transport view，
  但没有说明它们的 logical-call reconciliation，后两者也没有可消费 shape。
- **minimum delta：** 建立这一份窄 contract candidate，补充 transport-view、identity/input availability
  和 mechanical validity 的分离；不修改 `design/`、不创建 runtime 状态、
  不创建 action registry 或 event bus。
- **成功条件：** owner 能明确区分 executor submission、host observation、mechanical check 和
  semantic acceptance；两个 transport view 不会被计成两次 logical call；缺失 input/identity/time、
  或 view 冲突能结构化表达 `unavailable`/`unknown`/`not-run`。
- **失败处置：** 若 owner 认为候选过重，返回 `retain-unknown` 或 `no-proposal`，并说明现有字段
  如何保持上述区分；不以“以后需要”强加 shape。
- **revisit：** named host/coordinator consumer、record/retention owner、取消/崩溃 fixture、跨
  adapter comparison 或 protocol acceptance rubric 出现时 reopen；若候选开始承载 effect、replay、
  lineage 或 acceptance，拆成新 review unit。
- **阶段影响：** WorkCell 仍为 design candidate；`EffectSummary`、`UsageObservation`、A/B/C/D
  unknown 不被本记录关闭；DeepSeek Harness、base/runtime、adapter/executor 和用户 harness 实现
  仍未授权。

## 7. 独立语义审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 protocol acceptance、runtime、host/security、record-retention 或实现授权。

初轮指出三项问题：两个 submission transport view 的 logical-call lifecycle 未闭合、identity/input
unavailable 没有显式结构、以及 input representation 与 validity check 混淆。修订后又指出
`execution-return` 不得直接产生 `Observation.state = "observed"`；再次收窄后最终结论为
`final accept`（仅针对本候选 review record）。确认：

- `observed` 只来自 `live-submission` 或成功 `reconciled`；return-only 只能保留为 call/evidence 或
  `unavailable`；
- identity/input availability、reconciliation、`maxCalls`/schema MechanicalCheck 与 semantic
  acceptance 彼此分开；
- effect、replay、lineage、runtime authority、retention 和实现边界没有被候选吞并。

该结论只接受当前 design candidate 的表达，不接受 canonical protocol shape；仍需 protocol、host/
coordinator、record/evidence 与 acceptance owner 决定是否采用。
