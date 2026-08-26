# WorkCell executor 可比性边界审查

状态：`design-boundary-review / pre-revision-source / independent-review-complete / acceptance-pending / empirical-unknown`；不是
WorkCell protocol acceptance、provider 选择、matched Run、runtime guarantee、eval 结论或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录只审查 WorkCell 在替换 executor 时的比较边界。它不决定 Vercel AI SDK/Pi 与 DeepSeek
Harness 谁更好，也不创建新的 comparison protocol、registry、Binding 类型或运行机制。

## 1. 来源与对象

本轮 review 读取的 canonical source 是 [`design/work-cell-protocol.md`](../../design/work-cell-protocol.md)，
review-input 的 review-time working-tree source fingerprint 为：

- Git object SHA-1：`4293057dc1d136fd20ddc7de7144612e458a5b11`；
- raw SHA-256：`26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`。

该 edge 是 executor wording revision 之后、contract projection revision 之前的 historical input，不是
当前 canonical fingerprint；current source applicability 由 revision-2、current-source child card 和
[`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
回接。

直接来源关系：

1. §5.1 的 `WorkCellBinding` 类型包含 `workspace`、`toolSurface`、`effectPolicy` 和
   `executor: ExecutorSelection`；Binding 在 admission 时物化，运行期间不可变。
2. §11.1 的比较图写成“同一个 `WorkCellSpec` + 同一个 `WorkCellBinding`”，然后替换
   Vercel AI SDK/Pi 与 DeepSeek Harness executor。
3. §12.2 又要求固定 Spec、workspace fixture、tool schema/effect policy、completion contract、
   model、limits、取消条件和 mechanical checks，只允许 executor selection 与必要 adapter
   translation 不同。
4. §17.1 将该关系列为 provider-neutral design baseline，§17.2 将其列为待验证的可比性事项，§18.2
   将其列为实现前反例；当前没有 matched Run，也没有真实 eval/protocol owner。

真实对象不是一个新 runtime 对象，而是“executor replacement comparison 的等价性边界”：未来
   eval consumer 需要知道哪些输入被固定、哪个维度被改变，以及两个 RunRecord 是否仍属于同一类
   公共观察面。当前 owner、consumer、acceptance owner 均为 `unknown`。

## 2. 当前发现

若“同一个 `WorkCellBinding`”按完整结构理解，它包含 `executor`，因此两个变体不能同时满足：

```text
binding.executor = VercelAiSdkWorkCellExecutor
binding.executor = DeepSeekHarnessWorkCellExecutor
```

若把“同一个 Binding”宽松解释为“workspace、tool surface、effect policy 等非 executor 约束相同”，
则比较意图可以成立，但这个投影关系当前没有在协议文字中明确表达。

因此当前结论是：

- 这是 source wording 的 identity/equivalence ambiguity，不是已观察到的 runtime bug；
- `executor` 目前既是 Binding 中的选择，又是 §12.2 试图改变的比较维度；
- 在 ambiguity 消除前，不能把“两个变体共享完整 Binding”当成可执行的 eval contract；
- 不能由该 ambiguity 反推需要 `ComparisonBinding`、`ExecutorAgnosticBinding`、registry、第二类
  digest 或新的 runtime state。

## 3. owner、允许效果与边界

| 项目 | 当前判断 |
| --- | --- |
| source owner | WorkCell protocol design source；具体 protocol owner `unknown` |
| future consumer | eval/protocol consumer；当前不存在 matched Run，具体 consumer `unknown` |
| acceptance owner | WorkCell design/eval acceptance owner `unknown` |
| 最小允许效果 | 修订 §11.1、§12.2、§17.1、§18.2 的比较 wording，使完整 Binding identity 与比较固定维度不冲突 |
| 不允许效果 | 不新增 core type、registry、comparison queue、executor ranking、provider preference 或 adapter implementation |
| 当前 evidence 上限 | design-boundary observation；经验可比性仍为 `empirical-unknown` |

## 4. 方案比较

| 方案 | 能否保持当前 core | 主要问题 | 当前处置 |
| --- | --- | --- | --- |
| A. 保留“同一个完整 Binding”字面义 | 表面不加字段 | 与 Binding 内含 executor selection 冲突，无法定义唯一变化量 | 不采纳为 eval contract |
| B. 每个变体各自物化 Binding，但固定非 executor 约束 | 不加新对象；符合 Binding 的 admission/immutability | 需要明确“等价”只覆盖 workspace、toolSurface、effectPolicy 等固定约束；具体 canonical equality 仍由 eval owner 决定 | **最小 rewrite candidate** |
| C. 新增 `ComparisonBinding` / executor-agnostic Binding | 可显式承载比较关系 | 新增 core 机制和 authority；没有真实 consumer/owner 支撑，且可能把 eval 关系倒灌 runtime | 暂不提案 |
| D. 直接运行两种 adapter 再从结果反推可比 | 可以获得经验数据 | 在比较输入尚未定义时，无法区分 harness effect 与 Binding 差异；不能修复 protocol wording | 后置，须先完成 B 的 owner review |

## 5. 最小修订候选

候选语义如下，供 protocol/eval owner 接受或回修；本轮不直接回写 canonical source：

```text
同一 WorkCellSpec + 相同的非 executor Binding 约束
        │
  每个 executor 变体各自获得一个不可变 WorkCellBinding
  仅 ExecutorSelection 与必要 adapter translation 不同
        │
  同一类 WorkCellRunRecord + provider/adapter evidence
```

对应的自然语言约束是：

1. 不要求两个变体共享同一个完整 `WorkCellBinding`；由于 `executor` 是 Binding 字段，每个变体
   应有自己的 immutable Binding identity。
2. 比较固定的是同一 Spec，以及 workspace、tool surface、effect policy、fixture、completion
   contract、model/limits/取消条件等由 eval owner 明确列出的非 executor 条件。
3. `executor`/`adapterVersion`/provider evidence 是变化或观测维度；不改变 WorkCell 生命周期、
   host authority、RunRecord 类别或 acceptance 语义。
4. “相同/等价”不在本记录中发明 canonicalization、digest 或 registry；若真实 eval consumer
   需要精确定义，必须由该 consumer 与 protocol/evidence owner 另开有界决定。
5. 若某一条件无法固定或不可取，记录为结构化 confounder/unknown，不把两个 Run 直接归因于
   harness 差异。

## 6. 当前处置与回返

当前处置：`rewrite-candidate + retain-unknown`。

本轮允许：

- 新增本 review record；
- 将 readiness/plan/roadmap/item ledger 投影到该记录；
- 由 protocol/eval owner 接受、回修或明确保留该 wording candidate；
- 在 owner 接受比较边界后，再设计 matched fixture 和最小 eval protocol。

本轮禁止：

- 直接把本候选写成 protocol 已接受；
- 选择 Vercel AI SDK/Pi 或 DeepSeek Harness 为默认 provider；
- 因比较需要给 core 增加 `ComparisonBinding`、registry、queue、session resume 或 ranking；
- 在没有 matched fixture、consumer 和 owner 的情况下宣称 harness 效果、成本、恢复性或质量
  优劣；
- 开始 adapter contract、host fake、deterministic executor 或 WorkCell runtime 实现。

最小出口是：protocol/eval owner 能明确接受 B，或明确记录 `retain-unknown` 并说明回返触发器。
没有 owner 时，Main 只保留该 candidate，不代签 acceptance。

回返触发器：出现 named eval consumer、protocol owner、真实 matched fixture、需要跨 run 比较的
record/evidence contract，或 canonical protocol 对 Binding/executor identity 作出修订时，开启新的
bounded review round，并重新计算 source applicability。

## 7. Independent review

本记录创建后需由独立 reviewer 只读核对：

1. 是否准确区分完整 Binding identity 与比较时固定的非 executor 约束；
2. 是否把 `rewrite-candidate` 错写成 protocol acceptance 或 empirical result；
3. 是否避免借比较需求新增 core mechanism；
4. 是否保留 eval consumer、canonical equality、matched Run 和 owner 的 unknown；
5. 是否能正确回接 [`planning/records/workcell-design-acceptance-readiness.md`](workcell-design-acceptance-readiness.md)
   的 provider-neutral comparability dimension。

预期 review 结果只影响本记录与 planning projection；不会授权 protocol 回写或实现。

本记录已由 `Chandrasekhar`（Agent `01a03956-a4e0-7711-9b9d-5ac406b69b90`）只读独立复核并
`ACCEPT`。复核确认：完整 `WorkCellBinding` 确含 `executor`；§11.1/§12.2/§18.2 的等价性歧义判断
准确；各 executor 变体独立物化 immutable Binding、固定非 executor 约束是最小 rewrite candidate；
protocol/eval owner、consumer、canonical equality 与 matched Run 仍为 unknown；本记录没有取得
protocol acceptance、provider choice、runtime guarantee 或实现授权。

## 8. Canonical wording revision projection

在上述 candidate review 后，`design/work-cell-protocol.md` 曾完成一次仅限 wording/diagram 的
executor revision：Git SHA-1 `e8f7f71344c9b2d7d8aa17457202cc7652f15d3d`、raw SHA-256
`cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3`；这是 contract projection revision
前的 historical source edge。该 revision 明确 `executor` 是
Binding identity dimension，并把 comparison 固定条件改为非 executor Binding 约束；没有新增
机制、字段、registry、queue、lifecycle state 或实现。

本记录原先的独立 review 针对 revision 前 source；当前 source applicability 曾由
[`evidence-applicability-review-workcell-design-revision-2.md`](evidence-applicability-review-workcell-design-revision-2.md)
单独承载；该 record 已由 `Dewey` 独立复读并 `ACCEPT`。原 `ACCEPT` 仍只接受 candidate 的
boundary finding，不自动接受 revision 后 protocol、eval contract、provider choice 或实现。
