# WorkCell 设计接受准备投影

状态：`acceptance-readiness-observed / source-applicability-uncertain / independent-review-complete / acceptance-pending`；不是
协议接受、实现 gate、runtime state、review queue、registry 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 目的与最小形式

[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 已有设计 baseline、§17 的开放项和
§18 的实现前设计验收标准；A/B lifecycle、C/D observation/lineage、命名、RunRecord identity 和
contract-field boundary 也各自有 review record。本记录只把这些已有关系投影成一张可由未来真实
owner 判断的 readiness map：

```text
design baseline → bounded review evidence → owner decision / accepted unknown
                → protocol projection → independent acceptance review
                → separate implementation authorization
```

它不创建第二份 protocol，不决定 provider，不把“已有 review”升级为 acceptance，也不要求所有
unknown 在设计阶段被消灭。一个开放项可以在 owner 明确接受其 `unknown`、适用范围、回返触发器和
不授权边界后继续存在；没有这样的 owner-backed decision，就不能称为 design accepted。

## 2. 机制设计判断

| 项目 | 当前判断 |
| --- | --- |
| 真实对象 | WorkCell 设计候选的 acceptance-readiness projection；不是 runtime gate 或 acceptance authority |
| 当前压力 | 接受条件分散在 protocol §16–§18、A/B/C/D、命名、record 和 field-boundary records；未来 owner 无法从一处看到每个决定的来源、证据和未决边界 |
| 已有 owner | protocol、host/security、record/evidence、executor/adapter、semantic review、acceptance、phase/implementation 等 owner 类别已能区分；具体人名大多 `unknown` |
| 最小处置 | 复用现有 review records，增加一份只读 projection；不增加状态、动作、队列、registry、重试控制器或新的 authority |
| 更简单替代 | 继续只读分散文件；它不新增语义，但不能稳定回读 cross-dimension readiness，因此保留为低可读性 baseline |
| 当前结论 | `reuse-existing-projections + simplify`；该文档本身不取得任何接受权 |
| 推翻条件 | 真实 owner 证明现有 protocol §17/§18 与 review records 已能无歧义回读，则删除本 projection，回到单一现有来源 |

## 3. Acceptance dimension matrix

`review standing` 只描述现有 review 是否完成；`owner decision` 是未来真正接受时必须回答的关系，
不能由 reviewer 代答。`candidate exit evidence` 是进入 design acceptance review 所需的最小证据，
不是实现证据。

| dimension | canonical source / current review | review standing | owner decision still required | candidate exit evidence | current status |
| --- | --- | --- | --- | --- | --- |
| identity / naming / legacy mapping | protocol §3、§14；[`workcell-naming-review.md`](workcell-naming-review.md) | naming boundary `independent-review-complete` | protocol/naming owner 接受 `WorkCellSpec → Binding → RunRequest → Run → RunRecord`、executor surface 和 `CellInput` legacy-only mapping | canonical names、最近邻旧名、owner/lifecycle 和 migration adapter 边界无冲突；P14 不拥有 naming authority | `candidate / acceptance-pending` |
| declaration vs host grant | protocol §4–§5；[`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md)；[`workcell-command-grant-boundary-review.md`](workcell-command-grant-boundary-review.md)；[`evidence-applicability-review-workcell-contract-field-authority-current-source.md`](evidence-applicability-review-workcell-contract-field-authority-current-source.md) | field-boundary `independent-review-complete`；current-source applicability child `current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`；command-grant boundary `independent-review-complete / source-applicability-limited`；`design observation` | host/security owner 决定 requirements→grant、`CommandGrant.argumentShape`、argv/shell policy 与 host effect boundary；protocol/record/evidence owner 决定 call/event/observation shape、failure/standing 和 retention；缺失/拒绝/不可确认的结构化结果仍未接受 | 不把 Spec 需求当作 grant；不把 `ToolGrant`/request/`tool.requested` 当作 host execution；不靠自然语言扩大 effect；host-owned authority、failure code 与 `observed: unavailable` / factual `unknown` 可区分 | `candidate / owner unknown / acceptance-pending` |
| request / Binding / RunRecord identity | protocol §5–§6；[`workcell-record-boundary-review.md`](workcell-record-boundary-review.md) | record identity `independent-review-complete / candidate-proposal` | protocol + record/evidence owner 在显式 `RunRecord.bindingRef` 与等强度、可独立索引且能使 RunRecord 指向 admission Binding identity 的结构化 record projection 之间作出选择，并决定 spec/request identity、digest、snapshot reference 与缺失/修正边界 | RunRecord 能独立指向 admission Binding identity，且 identity 不变成 authority；若不加字段，record projection 如何由 request/evidence retention 支撑及其 structured `unknown` contract 必须明确；不复制完整 Binding、不新增 registry | `candidate / acceptance-pending` |
| executor context / return / observation | protocol §6；field-boundary review | field layers reviewed；typed shapes incomplete | executor/adapter 与 host/coordinator owner 决定 `CompletionActionCall`、host observation、`EffectSummary`、`UsageObservation` 的最小 shape | return 不冒充 host observation、record、review 或 acceptance；`unknown/unavailable` 有来源和原因 | `candidate / shape-owner unknown` |
| completion / output / artifacts / checks | protocol §4.5、§6.4、§8、§18 checks 1/3/5 | naming/field reviews support separation；无 implementation fixture | protocol + record/check owner 决定 action declaration/call/observation、output/artifact check 和 multiple-action semantics | §18 的 completion counterexamples 通过；机械检查不升级为 semantic review/acceptance；无顺序/事务隐含 | `candidate / acceptance-pending` |
| limits / usage / effects | protocol §4.4、§6.5、§7；field-boundary review；[`workcell-effect-summary-contract-review.md`](workcell-effect-summary-contract-review.md)；[`workcell-usage-observation-contract-review.md`](workcell-usage-observation-contract-review.md) | EffectSummary/EffectObservation 与 UsageObservation 窄候选均 `independent-review-complete`；canonical shape 仍未知 | host/security + coordinator + adapter + record/evidence owner 决定 effect authority、usage metric kind/scope/source、confirmation、unavailable reason 与 evidence 粒度 | limits、actual usage、effect observation 和 resource-limit check 分开；observed zero、provider-reported、unavailable、partial 与 check unknown 不被混淆 | `candidate / acceptance-pending` |
| cancellation / bounded drain / late observation | protocol §6.2、§9.2、§17.2；[`workcell-lifecycle-review.md`](workcell-lifecycle-review.md)；[`workcell-run-state-boundary-review.md`](workcell-run-state-boundary-review.md) | A `independent-review-complete / state-boundary-simplified / retain-unknown` | host/security + coordinator + record owner 决定 cutoff、record finalization、迟到 observation/correction 和未确认 effect | §18.9 反例可区分；不合作 executor 不得无界挂起；cutoff 后仍可记录 unknown | `open / acceptance-pending` |
| Binding expiry / revocation | protocol §5.1、§6.3、§9、§17.2；lifecycle review | B `independent-review-complete / retain-unknown` | protocol + host/security + coordinator-lifecycle + record/evidence owner 共同决定 admission snapshot、活动 run、撤销/到期、in-flight effect 的结构化关系；具体 owner `unknown` | §18.10 通过；不得静默获得新 grant；终止、policy observation、effect confirmation、acceptance 分开 | `open / owner unknown` |
| Event observation / replay | protocol §7、§17.2；[`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md) | C `independent-review-complete / retain-unknown`；当前未发现 named cross-process consumer | protocol + record/evidence owner 决定 observation-only 还是 sequence/dedup/gap/replay contract；当前只保留 observation-only 候选，不扩展 replay 机制；named consumer 只是触发条件，不自动成为 owner | §18.11 通过；当前没有 consumer/evidence 要求 replay，RunRecord 继续是候选公共事实投影而非事件重建保证 | `retain-unknown / no-proposal-now-for-replay / route-to-owner`；不是 protocol acceptance |
| retry / continue lineage | protocol §6.1、§8.2、§9.3、§17.2；observation/lineage review | D `independent-review-complete / retain-unknown` | protocol + record/retention owner 决定 parent relation、最小 retained records、错误关系和 unknown 深度 | §18.12 通过；每次是新 run；provider session/free text 不成为 lineage authority | `open / retention owner unknown` |
| provider-neutral adapter comparability | protocol §11、§17.2；[`workcell-executor-comparability-review.md`](workcell-executor-comparability-review.md)；eval protocol | design boundary review complete；没有 matched Run | eval/protocol owner 决定同一 Spec、非 executor Binding 约束、tool surface、model、fixture 的可比条件，并确认完整 Binding identity 与比较固定维度的关系 | 每个 executor 变体可有自己的 immutable Binding；只改变 executor selection/必要 adapter translation；confounder 结构化记录；不由协议预选优胜者 | `design-boundary-candidate / empirical-unknown / acceptance-pending` |
| system-layer boundary | protocol §10、§17.2；roadmap/plan | naming boundary observed；system consumer absent | system/work-system owner 决定 WorkItem、WorkLease、CellBatch、carrier/kernel 与调度层关系 | 不把 scheduler、batch、lease、DeepSeek carrier 回流 WorkCell core；`isolation` 仍是待验证假设 | `active-after-prerequisite` |
| semantic review / acceptance authority | protocol §8、§16、§18；phase-1 review；[`workcell-semantic-review-boundary-review.md`](workcell-semantic-review-boundary-review.md) | semantic/review boundary `independent-review-complete / source-backed`；无 named acceptance | semantic-review/rubric owner、protocol/record/evidence owner 与 Principal/acceptance owner 分别决定 subject/snapshot、rubric、structured findings、blocked/correction/supersession、basis、authority 和拒绝/延期关系 | review、mechanical check、acceptance decision、next action 各自可消费；没有 authority 只记录 observation；review complete 不等于 accepted | `candidate / acceptance-owner unknown / acceptance-pending` |
| spec identity / inline vs immutable reference | protocol §6.1、§17.2；[`workcell-spec-identity-boundary-review.md`](workcell-spec-identity-boundary-review.md)；Binding identity 另见 [`workcell-record-boundary-review.md`](workcell-record-boundary-review.md) | spec request/record boundary `candidate-proposal / independent-review-complete / acceptance-pending` | protocol + record/evidence owner 决定 inline/reference 传输形态、可结构化关联且在约定保留范围支持恢复/比较的 Spec identity projection、digest、retention 与不可取行为；是否独立索引由真实 consumer 决定；不得让 `requestId`、`bindingRef` 或 registry authority 互相冒充 | §18.1/§18.12 的 identity 与 lineage 仍可重建；inline/reference 只是传输选择；引用不是 registry 或 runtime authority；缺失关系保留 structured `unknown`，引用冲突保留 `invalid-reference` | `candidate / independent-review-complete / owner unknown` |
| formal owner / priority / acceptance | protocol §17.2、plan、roadmap、phase-1 review | planning projection 可回读；具体 owner 未命名 | Principal/phase owner 决定正式 protocol owner、priority、acceptance owner 与 design transition 的受托关系 | 每个 owner-backed decision 有来源、范围、证据、接受/延期和 revisit；Main 不代填 | `open / owner unknown` |

### 3.1 §17 / §18 显式映射

下面的映射只让 acceptance review 能逐项回指 protocol；它不新增一组验收标准，也不把这些反例
写成已经通过。

| protocol reference | 对应 dimension | 当前证据上限 |
| --- | --- | --- |
| §18.1：删除 provider 后 Spec 仍表达 bounded work | identity / naming；declaration vs host grant | design baseline；未有 accepted contract |
| §18.2：替换 Vercel AI SDK/Pi 与 DeepSeek Harness 后消费同类 RunRecord | provider-neutral adapter comparability | empirical unknown；无 matched Run |
| §18.3：无 acceptance 字段仍记录执行事实与机械检查 | completion / checks；semantic review / acceptance | owner boundary observed；acceptance carrier unknown |
| §18.4：executor 失败但已有 workspace effect | limits / usage / effects；cancellation/record | design hypothesis；EffectSummary shape/owner unknown |
| §18.5：output schema 失败不等于 Cell 未运行 | executor return / observation；completion/output/checks | field boundary reviewed；无 implementation fixture |
| §18.6：取消时未确认 effect 可表达 `unknown` | cancellation / bounded drain / late observation | A retain-unknown；host/record owner unknown |
| §18.7：自由文本不能扩大 Binding | declaration vs host grant | field-boundary review；host enforcement未验证 |
| §18.8：CellBatch 不推出 shared mind/synthesis authority | system-layer boundary | candidate；system consumer/owner unknown |
| §18.9：不合作 executor 不得让 draining 无界挂起 | cancellation / bounded drain / late observation | A retain-unknown；无 host Run |
| §18.10：Binding 到期/撤销有 host-owned 结果 | Binding expiry / revocation | B retain-unknown；共同 owner unknown |
| §18.11：Event replay 或 observation-only 语义可检验 | Event observation / replay | C retain-unknown / no-proposal-now-for-replay；consumer/owner unknown |
| §18.12：retry/continue lineage 可在有限记录下诚实恢复 | retry / continue lineage；spec reference | D retain-unknown；retention owner unknown |

`§17.2` 的 spec inline/reference、CommandGrant argument shape、semantic review carrier/rubric、A/B/C/D、
provider comparability、system-layer boundary 与 formal owner/priority/acceptance，分别已在 matrix
对应行登记；它们仍是 owner decision 或 empirical unknown，不是本 projection 的自动出口。

## 4. Readiness exit（owner 判断的候选条件，不是 gate）

以下不是提交正式 acceptance review 的强制前提，而是 owner 在判断 design candidate 是否可接受时
可采用的最小候选条件。缺失时，owner 可以明确选择延期、`retain-unknown` 或继续 review；Main 不得
把它们执行成自动 gate。

1. 每个 dimension 指向一个 canonical source、一个已有 review 或明确的 `not-opened`，不靠本表
   复制语义；
2. 每个 open item 有 owner class、有限 decision space、反例/未知和 revisit trigger；没有 named
   owner 时明确保留 `unknown`，不能由 Main 或 adapter 代填；
3. 对 §18 的 12 项反例，能区分协议语义、host policy、record projection、eval empirical unknown
   和 system-layer decision；不能用自然语言或固定短语承担权限、完成、重放、lineage 或 acceptance；
4. protocol baseline 与 review records 的对象 identity、名称、字段 authority 和禁止事项一致；若
   修订 canonical protocol，必须产生 source revision、影响边界、独立 review 和 projection reconciliation；
5. 每个 owner-backed decision 明确是 `accept`、`retain-unknown`、`no-proposal` 或回修候选，并声明
   允许效果、失败/恢复边界和是否需要新的 evidence；review 完成不算 acceptance；
6. acceptance decision 本身、阶段 transition 和 implementation authorization 分开记录；即使
   design accepted，也必须另有 implementation plan、owner、验收和回滚关系，才能开始实现。

当前没有满足上述候选条件的 named owner-backed decision；因此本记录只处于 readiness observation，
不把 `independent-review-complete` 写成 WorkCell design acceptance，也不自动阻止未来 owner 进行
acceptance review、phase transition 或另行形成 implementation authorization。

### 4.1 Owner-decision preparation：RunRecord identity

这是一次为真实 owner 减少恢复成本的 decision preparation，不是 owner decision、协议修改或实现授权。
它应用通用 harness candidate [`owner-facing-progress.md`](../../theory/harness/owner-facing-progress.md)：
先把自己放到未来 record/evidence consumer 的第一视角，再从当前 source 恢复必须回答的问题。

#### 场景重建

设想我是一个在运行结束后读取 `WorkCellRunRecord` 的 record/evidence consumer：原始 request 可能
已不可取，provider session 不能作为 canonical authority，且需要比较不同 adapter 的运行。我要能
回答“这条记录采用了哪个 admission Binding snapshot”，同时区分：

- `requestId`：一次启动消息的 identity；
- `runId`：一次执行的 identity；
- `bindingId`：host admission 产生的 Binding snapshot identity；
- Binding identity 与 capability grant、Effect、Usage、SemanticReview、Acceptance 不同。

#### 可选择方案

| 方案 | 做法 | 收益 | 代价与未决 | 当前边界 |
| --- | --- | --- | --- | --- |
| A：显式 `RunRecord.bindingRef` | 在 RunRecord 记录以 `bindingId` 为核心、可带 digest metadata 的结构化引用 | 可独立索引和比较；不依赖 provider session 或自由文本；最直接表达 record→admission Binding identity | 需要决定 digest 的 snapshot/version、retention、correction、缺失/不匹配结果；新增 canonical field 需 protocol/record owner 接受 | 引用只表达 identity，不是 grant；缺失/不可取仍为 structured `unknown`/`unavailable`；不复制完整 Binding |
| B：不新增 canonical field，采用等强度 projection | 由 request/evidence retention 提供可独立索引、可回读的结构化 record projection | 保持核心字段最小；若现有 retention 已足够，可避免字段迁移 | 必须证明 request/evidence 不可取、跨 adapter 比较和 parent 缺失时仍能诚实表达 `unknown`；不能只说“以后回 request” | 不建立 registry、不靠 URI/prompt/provider record 猜 identity；projection 的 authority、保留和修正仍需 owner 明确 |
| C：完整复制 Binding 或新建 registry | 把完整 Binding 放入 RunRecord，或增加独立 lineage/registry | 表面上回查方便 | 扩大 secret/tool/policy 暴露、retention 和 authority；为单一 identity 缺口引入过重机制 | `no-proposal`；当前不进入比较选择 |

#### 给决策者的问题

protocol/record/evidence/acceptance owner 只需在以下有限空间作出选择：

1. 选择 A，接受 `bindingRef` 的最小 identity 语义；
2. 选择 B，并明确 projection 的 retention、独立索引、不可取和 structured unknown contract；或
3. 暂时 `retain-unknown / no-proposal-now`，直到出现真实 record consumer 或 audit/comparison pressure。

候选建议（不是代行决定）：如果未来 consumer 必须在 request 不可取时独立读取和比较 admission
Binding，A 是较直接的最小载体；如果当前没有这样的真实 consumer，先选择 3，避免为了完整感提前加字段。
无论选择哪项，都不改变 host/security authority、不复制 Binding、不创建 registry、不进入 runtime。

#### 回接与成功观察

- **允许效果：** 更新本 readiness projection、对应 review record 的 decision package 和 owner return
  关系；owner 接受后才讨论 canonical protocol 回写。
- **成功观察：** owner 能在 A/B/`retain-unknown` 中选择或提出修改，并明确 identity、authority、retention、correction、
  missing/unavailable 和 revisit；Main 不需再替 owner 重建整个问题。
- **证据上限：** `source-backed / decision-preparation-observed / acceptance-pending`；本 package
  不等于 protocol acceptance、matched adapter comparison、runtime guarantee 或 implementation authorization。

### 4.2 Consolidated owner-decision package：把 15 个维度收敛为 5 个重大选择

4.1 只准备了 RunRecord identity 的一个局部选择。为了减少决策者反复恢复上下文的成本，下面把第 3 节
的 15 个 dimension 按实际共同决定的关系聚成 5 个 bundle。它们只是一次 owner return 的阅读顺序，
不改变各 dimension 的 canonical source、owner class、证据 standing 或 acceptance 边界。

这里的“一次”只表示一次恢复上下文的 package，不表示由一个人替所有 bundle 一次性审批。每个 bundle
仍按 owner class 分发和返回；没有权限接受 B1 的 owner 不能代替 B5 作阶段或实现决定，Main 只负责把
各返回按来源、影响和未知重新接回 readiness。

#### 决策场景

设想我是决定 WorkCell v1 是否可以进入正式 design acceptance 的 owner：我需要确认核心对象和效果
边界已经足够稳定，同时知道哪些地方可以诚实保留 unknown，哪些选择会改变共享协议或阶段出口。当前
不需要决定 provider 优劣，也不需要批准实现；任何 bundle 都可以选择 `retain-unknown` 或 `revise`，
而不是被迫消灭所有未知。

| bundle | 合并读取的 dimension | 需要 owner 回答的一个问题 | 当前最小建议（不是决定） |
| --- | --- | --- | --- |
| B1 语义与授权边界 | identity/naming/legacy；declaration vs host grant；completion/output/artifacts/checks | `Spec → Binding → RunRequest → Run → RunRecord` 的对象关系、requirements→grant、完成声明/调用/观察/检查是否保持分层？ | 保留现有分层；不把 `CellInput`、自由文本、机械检查或 executor return 升格为 grant、完成或 acceptance；若某个字段需要新增，先指出它改变的关系 |
| B2 事实与记录边界 | request/Binding/RunRecord identity；executor context/return/observation；limits/usage/effects | 哪些是 host/coordinator 可观察事实，哪些只是 executor/provider report，记录如何保留 source、unknown 和 effect confirmation？ | 保留 typed fact envelope 与 unknown；不复制完整 Binding，不以 provider report 替代 host observation，不为单一 identity 缺口建立 registry；`bindingRef` 仍由 4.1 的 A/B/`retain-unknown` 选择 |
| B3 生命周期与 lineage | cancellation/drain/late observation；Binding expiry/revocation；event observation/replay；retry/continue lineage | 取消、到期、迟到事实、缺失父记录和 retry/continue 如何在有限记录中诚实表达，哪些关系暂不承诺？ | 接受 `retain-unknown` 作为合法设计结果；当前不新增 replay、queue、retry controller 或全局 registry；公共 parent relation 继续只保留已收窄的 `retry-of` / `continued-from` 候选 |
| B4 替换与系统边界 | provider-neutral adapter comparability；system-layer boundary | 替换 executor/provider 时哪些非 executor 约束必须固定，哪些 `WorkItem`/`WorkLease`/`CellBatch` 关系属于外层系统？ | 保持每个 executor 变体有独立 immutable Binding；不把调度、batch、lease、DeepSeek carrier 或 isolation 假设回流 WorkCell core；无 matched Run 时保持 empirical unknown |
| B5 评审、接受与阶段出口 | semantic review/acceptance authority；spec identity inline/reference；formal owner/priority/acceptance | 谁能接受 design、接受哪些 unknown、何时允许 phase transition，如何让 review、acceptance、transition 和 implementation authorization 分开？ | 先命名 owner/acceptance relation，再决定 readiness exit；review 不等于 acceptance，design acceptance 也不自动产生 implementation authorization |

#### 低交互触发规则

`B1`–`B5` 是 Main 恢复整体关系的内部索引，不是要求 owner 每轮填写的五项审批表。默认先用已有
常识、当前 source 和已接受的方法处理局部、可逆、低影响问题；只有某个 bundle 的选择会改变整体
方向、权限、共享协议/基线、不可逆效果，或确实解锁关键安全行动时，才把该 bundle 单独形成短 decision
package 给对应 owner。没有命中这些条件时，不因 bundle 尚未命名或全部 unknown 就打扰 owner，保持
局部工作继续并在结果中记录必要的纠偏。

因此，5 个 bundle 的存在不产生“五次请示”、全量边界预填或统一审批门；一次 package 也不要求携带
与当前决定无关的 bundle。只有受影响的分支可以暂停，独立的 planning/design/research contribution
继续推进；owner 返回后再按 source、影响和 unknown 回接。若判断本身不重大且可回退，Main 可以直接
采用候选方案，留下 observation 和 revisit trigger，而不是生成 owner package。

#### 一次 owner-facing package 的最小格式

实际 owner 不必重新恢复 15 行表；只在某个 bundle 命中重大触发条件并收到该 bundle 后，返回该 bundle
的最小决定即可。未触发或与当前 owner 无关的 bundle 省略，不返回空值或占位审批：

```text
triggered_bundle: B2
decision: accept-current-boundary | retain-unknown | revise
owner: <actual owner or unknown>
affected_source: <canonical section>
revisit: <trigger>
```

每个返回还要附带实际 owner（无法恢复则明确 `unknown`）、影响的 canonical section、允许效果、
失败/恢复边界和 revisit trigger。`accept-current-boundary` 只表示该 bundle 的设计边界可以作为
当前接受输入，不表示整个 WorkCell protocol 已接受；`retain-unknown` 也必须说明它是否阻止阶段出口。

#### 回接关系与停止边界

- 若 B1/B2 的选择只改变 wording 或字段投影，回写对应 protocol/readiness source，并重新做窄 source
  applicability review；不得顺带修改 B3–B5。
- 若 B3 暴露真实 retention、恢复、取消或效果控制的硬约束，才把问题转给 mechanism/runtime owner；
  设计上的 unknown 不自动产生机制。
- 若 B4 需要 provider comparison，先形成固定 Spec、非 executor Binding 约束、fixture 和 review；
  不把比较计划写成 provider selection。
- 只有 B5 取得明确 acceptance relation、design exit 和实现授权，才可离开当前 design-only 状态；
  在此之前 WorkCell、DeepSeek Harness 和 base/runtime 实现继续关闭。

这个 package 的作用是让真正被触发的 owner 选择少数关系、共享一次必要的上下文恢复，而不是让 Main
代替 owner 选择或把所有 bundle 变成审批；没有命中重大触发条件时，最小结果可以是 Main 的局部处理
与事后纠偏，不必生成 package。没有 named owner 但确已命中重大触发条件时，才保留
`decision-preparation-observed / route-to-owner / acceptance-pending`。

## 5. 当前最小回返

- **最小实践：** 由真实 protocol/host-security/record-evidence/acceptance owner 选择一行 dimension，
  对照其 source、现有 review 和一个反例作出 owner-backed decision；没有 owner 时，Main 先完成
  bounded owner-decision preparation，形成可选择的方案包并保留本行 unknown，再 route 给 owner 或
  转向 A/B/F 的其它真实 bounded contribution。
- **允许范围：** 更新本 projection、对应 review record 或 design candidate 的最小 wording；不新增
  runtime state、registry、queue、event bus、retry controller、adapter 或 eval Run。
- **成功观察：** 一个 dimension 的 owner、决定、证据上限、revisit 和 projection 可被独立 reviewer
  重建，且不关闭其它未决 dimension。
- **identity row 的具体回返：** protocol/record owner 选择显式 `RunRecord.bindingRef` 或等强度、可
  结构化关联且在约定保留范围支持恢复/比较的 record projection；是否需要独立索引由真实 consumer 决定。
  Binding 选择必须说明 request/evidence 不可取时的 `unknown`、snapshot retention 与 correction 边界；
  Spec identity 选择还必须区分 artifact、request、RunRecord retention，以及 `invalid-reference`。
  Main 不代作字段接受，不复制 Binding，不创建 registry。本 projection 不修改 canonical protocol；只有
  owner acceptance 后，才可决定是否回写 canonical shape。
- **失败处置：** 若 owner 不能区分选择或证据不足，记录 `retain-unknown`/`route-to-owner`，不继续
  叠加字段或机制。
- **后续关系：** provider comparison、DeepSeek work-system design 和所有 implementation 仍等待
  WorkCell design acceptance；本记录不改变该前置。

## 6. Evidence standing 与 boundary

- 来源：当前 protocol §16–§18、WorkCell naming/lifecycle/observation-lineage/record/field reviews、
  plan、roadmap 和 phase-1 projection。
- 结果上限：`acceptance-readiness-observed`；已有局部 independent review，不等于 protocol acceptance、
  matched provider comparison、runtime guarantee 或 implementation authorization。
- 未取得：named protocol/host/security/record/acceptance owner、owner-backed decision、跨 adapter
  Run、phase transition 或实现授权。
- 不能推出：Vercel AI SDK/Pi 或 DeepSeek Harness 的优劣；WorkCell 的 adapter contract；WorkItem/
  WorkLease/CellBatch 的系统语义；任何永久 retention/replay/revocation 保证。

## 6.1 Current source-applicability qualifier

[`evidence-applicability-review-workcell-design.md`](evidence-applicability-review-workcell-design.md) 记录了
current-source child card 之前的 post-freeze source reconciliation：A/B lifecycle 与 C/D
observation/lineage 的 frozen protocol edge 相对当时的 `design/work-cell-protocol.md` 为
`source-edge-drift / current-applicability-uncertain`；record-boundary 与 contract-field review 的
protocol edge 当时是 `source-edge-match-observed`。后续
[`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md)
已把 A/B/C/D child baseline 回指当前 source，但 readiness matrix 仍不能把 child applicability 写成
policy、protocol acceptance 或 gate，也不能把 `acceptance-readiness-observed` 当作 overall acceptance。

本节只增加继承的 provenance qualifier；不修改 canonical protocol、旧 review、source snapshot 或
任何 owner decision，不创建 Run、registry、runtime mechanism、DeepSeek design 或 implementation。
source applicability 恢复的最小回返是 recovered snapshot、named protocol/record/replay consumer 或
针对当前 source 的新 bounded review card。当前已形成 A/B/C/D 的 bounded current-source child card；
它只解除 child 的 source-level pending，readiness 整体仍保留 `source-applicability-uncertain`，因为
其它 review family 和 owner-backed policy applicability 尚未闭合。

本次 qualifier 与 A/B/C/D 的 source provenance correction 已由 `Plato`（Agent
`01a0387b-f544-7aa1-ab7e-bbc7a3290609`）独立只读复核并 `accept`：A/B 的 `00a7ec…`、C/D 的
`00a7ec…/25e859…` 只作为 review-time/frozen edge，revision 前的 protocol fingerprint 为
`4293057d… / 26ec714f…`；revision 后的当前 fingerprint 见 §6.2 与 current-source child card。该结论只接受 provenance reconciliation，不构成 readiness、protocol、
runtime、DeepSeek 或 implementation acceptance。

## 7. Independent review

`Goodall`（Agent `01a03883-ed7f-71b0-ac1d-7ab753d93fad`）完成两轮独立 review，未修改文件，最终
结论为 `accept`：

- matrix 显式覆盖 §17.2 各开放项及 §18.1–§18.12；
- Event、Binding expiry/revocation 的 owner class 与 unknown 边界诚实；
- readiness exit 已明确为 owner 判断的候选条件，不是 gate，Main 不取得阻止或授权权力。

最终 standing 为 `acceptance-readiness-observed / source-applicability-uncertain / independent-review-complete / acceptance-pending`；
仍不代表 WorkCell protocol acceptance、phase transition、runtime guarantee 或 implementation authorization。
reviewer 不拥有协议接受、owner assignment、phase transition 或 implementation authorization。

## 8. 2026-08-26 低交互 owner package 回返

本轮把用户提出的“重大事项请示、小事事后纠偏”接回 WorkCell readiness。观察到 4.2 的五个 bundle
虽然已经说明不是一次性审批，但返回示例仍可能诱导接收者逐项回应；这会把内部恢复索引误变成人工
前置表单，也与 `default-autonomy-with-correction` 的低风险默认自治不一致。

最小改变是把 bundle 的存在与 owner 打扰分开：

- `B1`–`B5` 只作为 Main 的内部 cross-dimension recovery index，不是每轮必须发送或填写的表；
- 只有某个 bundle 涉及整体方向、权限、共享协议/基线、不可逆后果，或确实解锁关键安全行动时，才
  对对应 owner 发送该 bundle 的 sparse decision package；未触发 bundle 省略；
- 局部、低影响、可回退的问题继续由 Main 按已有常识和当前 authority 处理，并通过 observation、
  correction 或 rollback 事后回接；只暂停受重大决定影响的分支；
- 该规则只改变 owner-facing expression 和交互负担，不产生 owner registry、approval gate、全局
  blocked state、runtime state 或新的 acceptance authority。

独立只读 reviewer（`01a03d7b-93bd-7662-8054-6e8bf0a98774`）返回 `ACCEPT`，确认 bundle 是内部索引、
只返回触发项、局部工作可以继续、重大事项路由 owner，且没有隐含审批或 runtime 机制。该 verdict 只
接受本节的 projection wording；不接受 WorkCell protocol、owner assignment、phase transition 或实现
授权。当前 readiness 仍为 `acceptance-readiness-observed / source-applicability-uncertain /
independent-review-complete / acceptance-pending`。

## 9. 2026-08-26 harness-test consumer 与 core API 实现候选

用户明确给出 WorkCell 的真实 consumer：用于 harness 测试、部分 delegation、主/子模型测试，以及
Kimi Code Plan、OpenCode Go、开源模型等不同模型或执行渠道的比较。这解除“没有真实 consumer”的一项
发现缺口，但不替 protocol acceptance、core implementation owner 或 semantic acceptance owner 做决定。

基于该 consumer，新增一个与正式 core 分开的 `experimental-slice-candidate`：

```text
minimum core contract freeze
  → deterministic executor + WorkCell core API + record/evidence
  → adapters/providers 基于 core API 接入
  → bounded direct/delegated 与 model/provider comparison
```

这里的 core API 负责 admission、bounded execution context、effect boundary、typed event、execution
return、cancel 和 record/evidence handoff；adapter/provider 负责 session、模型调用、工具循环和原始
provider evidence 的映射，不能改变 core 生命周期、权限或验收语义。具体订阅、CLI、API 和本地模型接口
仍需在 adapter 环境检查中确认，不能从产品名称推断兼容性。

在进入该 slice 前，先用 fixture、纸面 contract 和必要的 disposable/mock executor 做 design rehearsal，
实际应用问题优先、善假于物/工具准备、设身处地、Todo/work-map 和设计后回落修剪；回执必须记录
decision delta、被删除/降级的字段或机制、unknown、工具保留理由与 rollback anchor。该 rehearsal 不产生
canonical Run 或协议接受。

该候选随后才允许为 design-validation consumer 形成 deterministic executor、最小 API 和 evidence path；
它不把可运行 slice 写成 canonical protocol acceptance、DeepSeek Harness 选型、生产 runtime 或
provider 优劣。五项最小 owner decision、允许效果和停止条件见
[`workcell-harness-test-implementation-plan.md`](workcell-harness-test-implementation-plan.md)。
当前 readiness 保持 `acceptance-pending`；该 consumer 只改变下一条可推进的 bounded contribution，
不改变正式 WorkCell → DeepSeek system → implementation 的阶段门。

## 历史/迭代回返（默认折叠）

<details>
<summary>展开 2026-08-25 WorkCell readiness revisions 与 applicability returns</summary>

## 2026-08-25 executor comparability boundary return

[`workcell-executor-comparability-review.md`](workcell-executor-comparability-review.md) 对 §5.1、§11.1、§12.2、§17.2
和 §18.2 做了窄边界回读：完整 `WorkCellBinding` 包含 `executor`，所以“同一个完整 Binding 下只替换
executor”不能直接作为比较 contract。当前最小 rewrite candidate 是：每个 executor 变体各自获得不可变
Binding，固定 workspace、tool surface、effect policy 等非 executor 约束；不新增
`ComparisonBinding`、registry 或 runtime state。

该 candidate 只收窄 protocol/eval owner 的待决 wording，不证明 matched Run、harness effect、provider
优劣或 protocol acceptance。`canonical equality`、真实 eval consumer、owner 和 matched fixture 仍为
unknown；本 readiness 继续 `acceptance-readiness-observed / source-applicability-uncertain /
acceptance-pending`，且没有实现授权。该 candidate 随后已回写为仅限 wording/diagram 的 source
revision；revision 后的适用性由 §6.2 和 revision-2 applicability record 单独追踪。

本项的独立 review 已由 `Chandrasekhar` 只读 `ACCEPT`；该 verdict 只接受 boundary finding 和
projection，不接受 canonical protocol、eval contract、provider 优劣或实现。

## 6.2 Historical source revision snapshot：executor wording（当时的 current source）

`design/work-cell-protocol.md` 随 executor comparability candidate 完成了仅限 wording/diagram 的
 revision。该时点 fingerprint 为 Git SHA-1 `2ed713fe5b88d73939fc4330b3ae6092a790793c`、raw SHA-256
`f87422b0db307cbc064013f406cd36b60ba4f9bd847649052493ecc1e0a6ae6e`；contract projection revision 前
fingerprint 为 `e8f7f71344c9b2d7d8aa17457202cc7652f15d3d / cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3`，
再前的 executor revision source edge 是 `4293057d… / 26ec714f…`。

revision 明确 `executor` 是 Binding snapshot identity dimension，比较固定的是非 executor 的
workspace/tool/effect 约束，并要求各 executor 变体各自物化 immutable Binding；没有增加 core field、
registry、queue、lifecycle state 或实现。由于 source 已改变，既有 A/B/C/D、RunRecord identity 和
contract-field review 不能仅凭旧 hash 继承 current applicability。

当前适用性由 [`evidence-applicability-review-workcell-design-revision-2.md`](evidence-applicability-review-workcell-design-revision-2.md)
承载，standing 为 `source-revision-observed / current-applicability-reconciled / independent-review-complete /
acceptance-pending`；
executor revision-2 适用性是 pre-contract-revision record；contract projection revision 的 current
applicability 由 [`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)
承载。
本 section 不把 source revision、原有 executor review 或后续 independent review 升级为 WorkCell
protocol acceptance、provider choice、matched eval 或实现授权。

`Dewey`（Agent `01a0394d-c4ad-7e10-a91d-68a232d7ba24`）已对 revision-2 applicability 做只读独立复核并
`ACCEPT`；该 verdict 只确认 source fingerprint、旧 review 的 pre-revision standing、revision 的
wording-only 边界和 projection 一致性，不改变本 readiness 的 `acceptance-pending` 或实现冻结。

## 2026-08-25 CompletionAction contract candidate projection

[`workcell-completion-action-contract-review.md`](workcell-completion-action-contract-review.md) 对 §18.3/
§18.5 相关的 `CompletionActionCall`/`CompletionActionObservation` 做了窄字段候选回返，并由 `Hubble`
独立 review `final accept`。它只补齐 owner 可比较的 submission/observation/check 边界：live submit
与 execution return 是 transport views，return-only 不产生 host `observed`，identity/input unavailable
显式保留。该候选仍需 protocol、host/coordinator、record/evidence 与 acceptance owner 判断，不改变
本 readiness projection 的 `acceptance-pending`，也不关闭 Effect/Usage、取消、Event、lineage 或 provider
comparison dimensions。

## 2026-08-25 EffectSummary / EffectObservation contract candidate projection

[`workcell-effect-summary-contract-review.md`](workcell-effect-summary-contract-review.md) 从 field-boundary
unknown 中拆出一个窄 candidate，并由 `Hubble` 独立 review `accept`。候选保持 `EffectSummary` 为
run-bound fact projection，分别记录 source、effect identity、phase、outcome、confirmation 和
unavailable reason；`state: observed` 不是 effect 已确认，只有 host observation 可以支持 confirmed。
该候选保留 executor failure 后的 workspace effect、取消后的 unknown、空 observation 的不确定性、
retry child 分离和 late evidence 非静默覆盖；不关闭 Usage、A/B lifecycle、security policy、retention、
canonical protocol 或实现授权。

## 2026-08-25 UsageObservation contract candidate projection

[`workcell-usage-observation-contract-review.md`](workcell-usage-observation-contract-review.md) 从 limits/
usage unknown 中拆出一个窄 candidate，并由 `Hubble` 两轮独立 review 后 `accept`。候选明确
`UsageObservation` 是 run-bound fact projection：`UsageMetricProvenance` 显式约束 run scope 与
host-observation、provider-report 与 executor/adapter report 的兼容关系；zero、delayed、not-collected、
provider-unsupported、scope-incompatible、source-unavailable 和 partial 保留可判别边界；limit comparison
仍由独立 `MechanicalCheck` 表达。该候选不关闭 ResourceLimits owner、EffectSummary、cost/metering、
retention、canonical protocol 或实现授权。

## 2026-08-25 observation / record integration review projection

[`workcell-observation-record-integration-review.md`](workcell-observation-record-integration-review.md) 对
CompletionAction、EffectSummary、UsageObservation 三个窄候选与 `ExecutionOutcome`、`MechanicalCheck`、
`EvidenceRef` 做了跨字段组合审查，并由 `Hubble` 独立 review `accept`。结果只确认组合边界：当前
跨字段安全 join 只有 `runId`；call/effect/usage/check identity、source、unknown、retry lineage 和
late evidence 不互相升级。它 route 给真实 protocol/record/acceptance owner，不改变本 readiness 的
`acceptance-pending`，也不授权 canonical protocol、runtime 或实现。

## 2026-08-25 A/B/C/D current-source applicability return

[`workcell-current-source-open-relations-applicability-review.md`](workcell-current-source-open-relations-applicability-review.md)
在 executor wording 与 contract projection wording revisions 后直接回读 A/B/C/D 所依赖的当前 source sections。四项的 lifecycle、Binding、
typed Event、new-run/parent relation 和 §18.9–§18.12 baseline 均可回指当前 protocol，child standing 为
`current-source-supported / applicability-reconciled / retain-unknown`。

这只解除 A/B/C/D 的 source-level `current-applicability-pending`；cutoff、active revocation、Event
replay、retention、lineage recovery、owner decision 和 protocol acceptance 仍 unknown。readiness 的
整体状态仍为 `acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending`，
因为其它 review family 和 owner-backed decisions 尚未闭合。`Halley` 已独立 `ACCEPT` child record，
只覆盖 source applicability bookkeeping。

## 2026-08-25 contract projection source revision

新增 [`workcell-protocol-contract-projection-reconciliation.md`](workcell-protocol-contract-projection-reconciliation.md)，
对当前 protocol §6.5/§7.1–§7.3 的 `EffectSummary`、`EffectObservation`、`UsageObservation` named slot
与窄 contract candidate 做了 source-level reconciliation。revision 只澄清 slot 与未冻结 shape 的关系，
并移除 `effects.workspace` 这一可能被误读为 canonical field 的 shorthand；不增加 core field 或 runtime
mechanism。

该记录的 current applicability 为 `current-source-supported / applicability-reconciled / acceptance-pending`，
但只覆盖列出的 contract projection；canonical shape、host authority、retention、correction、named owner、
A/B/C/D policy、provider comparison 和 protocol acceptance 仍 unknown。readiness 总体仍为
`acceptance-readiness-observed / source-applicability-uncertain / independent-review-complete / acceptance-pending`，
不改变 WorkCell → DeepSeek system design → implementation 的前置关系。`Dewey` 已对最终记录复读并
`FINAL ACCEPT`，只接受 source wording/applicability bookkeeping。

## 2026-08-25 WorkCell review-family source provenance reconciliation

[`workcell-review-family-source-provenance-reconciliation.md`](workcell-review-family-source-provenance-reconciliation.md)
发现多个窄 review 的 `4293057d… / 26ec714f…` 仍被表述为 current source；这些值现在统一标为
contract projection revision 前的 review-time edge。该历史段落经历的 canonical source 是
`2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…`；当前 source 为 `fa602faf… / c78876b4…`。

本轮只修正 source provenance 和 applicability 回读路径：Effect/Usage named-slot projection 继续由
contract projection record 承载，A/B/C/D baseline 继续由 current-source child card 承载，其余 Binding、
Spec、CompletionAction、record integration 和 executor review 不因新 hash 自动获得 current acceptance。
readiness 总体仍为 `acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending`；
不改变 WorkCell → DeepSeek system design → implementation 的顺序或冻结条件。

## 2026-08-25 WorkCell review-family provenance review return

review-family source provenance 已由 `Meitner` 独立只读 `ACCEPT`，但该接受只覆盖旧 edge 的历史地位、
current source applicability 的分层和不越权边界。当前 readiness 继续为
`acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending`。

具体残余边界：Effect/Usage 与 A/B/C/D 的 current-source child/applicability 仍按各自 record 承载；
executor comparability 已直接回指 revision-2 与自身 review；identity、contract-field、CompletionAction
三个 child 的 previous-source applicability 已完成 current-source 窄回读与独立复核，均达到
`independent-review-complete / acceptance-pending`。这不是新增字段的理由，下一项只允许 protocol/record
owner 的 owner-backed wording、shape 或 acceptance decision。

## 2026-08-25 WorkCell identity review current-source applicability

新增 [`evidence-applicability-review-workcell-identity-current-source.md`](evidence-applicability-review-workcell-identity-current-source.md)，
对 RunRecord/Binding identity 与 Spec identity 两个既有 bounded review unit 直接回读当前 protocol
§5.1、§6.1、§6.5、§8.2、§11.1、§17.2、§18.1/§18.12。当前 source 为
既有 source 依次为 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…`；当前 source 为
`fa602faf… / c78876b4…`，两个 review 中的 `4293057d… / 26ec714f…` 只保留为 contract projection
revision 前的 review-time edge。

child 的 previous-source 结果为 `current-source-supported / applicability-reconciled / acceptance-pending`；
当前 child 为 `source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。Binding 的
host-owned immutable snapshot、RunRequest 的 `bindingRef`、Spec 的 inline/reference、new-run/parent
baseline 和 RunRecord 的事实投影等不变观察可保留；受影响边界完成窄回读前，不将其计为 current source
完成证据。RunRecord 仍没有显式 Binding/Spec identity
slot，digest canonicalization、snapshot/record retention、correction、registry authority、named owner
和真实 consumer 仍 unknown。该 child 不合并两个 review unit，不接受字段、不改 canonical protocol，
该 child 已经通过 `Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）只读 `ACCEPT`；readiness 总体仍为
`acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending`，
不改变 WorkCell → DeepSeek system design → implementation 的前置关系。

## 2026-08-25 contract field authority current-source applicability

新增 [`evidence-applicability-review-workcell-contract-field-authority-current-source.md`](evidence-applicability-review-workcell-contract-field-authority-current-source.md)，
直接回读过 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…` 两个 previous source edge 的 declaration、host grant、request、call、return；当前 source 为
`fa602faf… / c78876b4…`，
observation、record、check、review 与 acceptance 分层；`McClintock`（`01a0393c-3b3d-7932-b3da-4653254e30ce`）
独立只读 `ACCEPT` 只覆盖 previous source。child standing 为
`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。

这保留 contract-field authority 的 previous-source boundary observation；requirements 与 grant、executor return 与
host observation、MechanicalCheck 与 SemanticReview/AcceptanceDecision 的不变边界可回指，当前 source
窄回读与独立复核已完成；mapping、承重
field shape、host enforcement、retention/correction、named owner 和 protocol acceptance 仍 unknown。
readiness 总体仍为 `acceptance-readiness-observed / source-applicability-uncertain / independent-review-complete /
acceptance-pending`，不授权 protocol 修改、runtime mechanism、provider/DeepSeek 或实现。

## 2026-08-25 CompletionAction current-source applicability

新增 [`evidence-applicability-review-workcell-completion-action-current-source.md`](evidence-applicability-review-workcell-completion-action-current-source.md)，
直接回读过 `2ed713fe… / f87422b0…` 与 `7240b23… / 513e7ed…` 两个 previous source edge 的 CompletionAction declaration、submission、return；当前 source 为
`fa602faf… / c78876b4…`，
observation 与 mechanical-check sections；`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）独立只读
`ACCEPT` 只覆盖 previous source。child standing 为
`source-revision-observed / current-source-supported / applicability-reconciled / independent-review-complete / acceptance-pending`。

这保留 CompletionAction 的 previous-source boundary observation；当前 source 对象槽位、executor return
与 host observation 分层、mechanical check 与 acceptance 分层的适用性已由该 child 窄回读并经独立复核；
完整 canonical shape、identity、retention/correction、host authority、跨 transport reconciliation、
named owner 与 WorkCell acceptance 仍 unknown。readiness 总体仍为 `acceptance-readiness-observed /
source-applicability-uncertain / independent-review-complete / acceptance-pending`；不修改 protocol、
不补字段、不创建 Run/registry、不开放 provider/DeepSeek/实现。下一出口是各 owner 的结构化决定，不是
重复 source read。

## 2026-08-25 current source revision：Run state / record finalization boundary

本轮 [`workcell-run-state-boundary-review.md`](workcell-run-state-boundary-review.md) 发现并收窄了
`WorkCellRun.state` 中 `recording` 与 `WorkCellRunRecord` 终态事实之间的内部矛盾：当前 design candidate
已将 public execution state 与 record finalization 分开，未新增 runtime state、queue 或 record
availability contract。

当前 canonical source fingerprint 为 Git SHA-1
`fa602fafd444d1f738c20ac4b4ec16c9e4d8654e`、raw SHA-256
`c78876b4f337f38b0adb34d2b44f76f429ba51d5a1690a0da3b2c7ca0e2a4e9b`，1188 行。`7240b23… / 513e7ed…`
及更早 fingerprint 只保留为 previous source/review-time edge。

该 revision 只把 readiness matrix 的 A 行从 `draining → recording` 校正为
`draining → terminal execution state → record finalization`；A cutoff、迟到 observation/correction、
record retention、Binding policy、named owner 和 protocol acceptance 仍 unknown。readiness 总体仍为
`acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending`，不改变
WorkCell → DeepSeek system design → implementation 的前置关系。

## 2026-08-25 WorkCell parent relation simplification

[workcell-parent-relation-boundary-review.md](workcell-parent-relation-boundary-review.md) 发现 §6.1 的
derived-from 没有 current consumer、owner、retention 或 recovery contract。design candidate 已将
WorkCell v1 parent relation union 收窄为 retry-of / continued-from；generic Task/WorkItem derivation
留在上游，不回流 WorkCell core。

该变化只消除一个无语义承载的公共关系候选，不定义 parent record retention、错误 relation、missing-parent
unknown、lineage authority 或可恢复性保证。D readiness 仍为 open / retention owner unknown，总体仍为
acceptance-readiness-observed / source-applicability-uncertain / acceptance-pending；不授权协议接受、
runtime mechanism、provider/DeepSeek 或实现。

</details>
