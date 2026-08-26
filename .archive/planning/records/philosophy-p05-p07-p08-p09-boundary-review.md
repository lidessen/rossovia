# P05 / P07 / P08 / P09 交叉边界 review

状态：`design-boundary-observed / independent-review-complete / acceptance-pending`；本记录是
哲学序列父 item 的有限关系 fixture，不是新的哲学条目、P07/P08/P09 reading、WorkCell runtime
行为、eval protocol 或 acceptance rubric。

## 对象、来源与限制

固定对象：**一个 WorkCell 运行中，Binding 发生过期或撤销时，协议如何分析它与 host effect
的关系，并把结果交给下游处置 owner**。C1、C2、C4 都围绕这个同一设计问题；改变的是条件、
进入问题的第一步或多个冲突的比较。C3-A 仍在该对象内，C3-B 则是为测试 P08 而引入的相邻
scope-boundary comparator，不冒充同一对象实例。它们全部是 `design/fixture observation`，
不是已实现的 host、provider 或 WorkCell runtime 事实。

- P05 source：[`theory/philosophy.md` P05](../../theory/philosophy.md#L15)，`分析·特殊性`；当前
  candidate 是 [`theory/philosophy/P05.md`](../../theory/philosophy/P05.md)。
- P07 source：[`theory/philosophy.md` P07](../../theory/philosophy.md#L19)，`分析·入手点`。
- P08 source：[`theory/philosophy.md` P08](../../theory/philosophy.md#L21)，`分析·问题边界`。
- P09 source：[`theory/philosophy.md` P09](../../theory/philosophy.md#L23)，`解决·主次`。
- 关系来源：[`theory/gene-expression.md`](../../theory/gene-expression.md) 的生成链把四者放在
  “特殊性 → 简化 → 入手点 → 问题边界”与“主次”的相邻位置；
  [`theory/research/philosophy-gene-one.md`](../../theory/research/philosophy-gene-one.md) 记录
  P05 的“不套成法、按对象来”和 P09 的“先解哪一根”来源解释，以及 P07/P08 当前的研究开放状态。
- 当前下游设计：[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 仍是 design
  candidate；host effect、owner、acceptance 和真实运行证据不能由本记录补造。

## 最小区别

| 概念 | 本轮只判断什么 | 不拥有的判断 |
| --- | --- | --- |
| P05 特殊性 | 哪些对象条件、关系、限制或用途会改变当前分析，或使下游 owner/protocol 重新评估 | 不决定从哪里开始、不划定问题范围、不替多个冲突排序、不直接给出处置或 runtime policy |
| P07 入手点 | 在问题已经确定后，先从哪个有界、可处理的子问题或观察入口开始 | 不把“最小入口”变成固定 step、不替 P05 判断条件、不取得主次或 acceptance 权 |
| P08 问题边界 | 当前问题包括哪个对象、关系、时段、受众或视域；哪些相邻事实必须另行问题化 | 不因范围内已有材料就声称已知，不把 provider 内部或跨域事实自动纳入 WorkCell 问题 |
| P09 主次 | 多个冲突同时存在时，哪一根是当前必须先处理的主要矛盾 | 不制造特殊条件、不扩大范围、不规定具体 route、retry、取消或 runtime 保证 |

四者可以连续使用，但不能互相代替：P05 先让差异进入分析，P08 检查分析对象的边界，P07
选择一个可开始的入口，P09 在已界定的冲突中恢复当前先后。实际顺序仍是本轮设计关系的
候选，不是从 source 直接推出的 runtime pipeline。

## 固定对象的成对案例

### C1：特殊条件改变分析，而不是选择入口或主次

固定问题仍是“活动 Binding 过期/撤销后如何分析其与 host effect 的关系”。

下表先使用单变量对照；policy、目标和其他可见条件保持不变。

| 案例 | 仅改变的条件 | P05 应观察到的差异 | 不能由 P05 推出的结论 |
| --- | --- | --- | --- |
| C1-A | admission 后尚未开始 host effect；撤销 policy、effect 状态和安全 owner 均可见 | 形成“尚未开始 effect”的分析条件 | 不自动决定先查哪一个字段、最终允许/拒绝/取消哪种处置 |
| C1-B | 只把 C1-A 的 effect 状态改为“host effect 已开始”；policy、owner 和可见性不变 | “已开始 effect”本身改变分析对象中的关系 | 不自动推出回滚、继续、停止、补偿或 acceptance |
| C1-C | 回到 C1-A，只把安全 owner 改为未知；effect 尚未开始且状态可见 | “owner 未知”改变下游交接与未知表达 | 不自动推出应创建 owner、升级权限或由 P05 代行处置 |

C1 的承重变量是对象条件；如果把 provider 名称、格式偏好或无关历史附加到 C1-A，而 host
effect、policy、owner、目标均不变，分析与下游处置不变。这类增加不是 P05 的特殊性。若同时
改变 effect 是否开始、效果是否未知和 owner 是否未知，则只是复合特殊性对照，不能归因于某一
个变量。P05 candidate 的成对案例与此相接，但本 fixture 不把 C1 写成 runtime 规则。

### C2：同一条件下，P07 只改变第一步

在 C1-B 的条件冻结后，固定对象和问题范围不变，只比较两个可能的第一步：

| 案例 | 第一入口 | 边界判断 |
| --- | --- | --- |
| C2-A | 先确认 Binding 的撤销状态、适用 policy 和当前 owner | 这是 admission/authorization 关系的有界入口，不能因此忽略已开始 host effect |
| C2-B | 先确认 host effect 是否已经开始、当前 effect 状态能否取得 | 这是 effect/未知关系的有界入口，不能因此把 effect 观察误写成撤销原因或最终处置 |

这不是让 P07 任意选择便利入口，也不是把信息增益或 work-estimation 的最优探针冒充 P07。
当前 design fixture 只把“易”操作化为：关系可取得、可局部处理、失败后果可控，并且能形成
下一项有界工作；C2-A 若 Binding record 已由当前 contract 直接提供，C2-B 若 effect observation
endpoint 已可取得，分别只是两种“可行入口”条件。这个操作化是生成性的设计表达，不是 P07
source 本身；若两者在同一上下文中都不能显示出哪一个更易/更可行，必须保留 `uncertain`，不能
凭 P07 强行选一个。具体选择仍需 WorkCell design owner/protocol 定义，P07 没有接受或调度权。

### C3：P08 改变问题范围，不是把边界外事实塞进来

固定同一活动 Binding、同一撤销条件和同一 host effect 事实，只改变本轮问题的声明范围：

| 案例 | 当前问题范围 | P08 应保留的边界 |
| --- | --- | --- |
| C3-A | “本次 WorkCell run 是否仍能依据 Binding/host contract 表达撤销后的关系和未知 effect” | run、Binding、host contract 与记录范围内的关系在内；可检查的 provider 行为若未纳入 contract，不能直接充当事实 |
| C3-B | “provider 内部在撤销后究竟执行了哪些未暴露操作” | 这是相邻但不同的 provider observability/security 问题；除非重新取得 authority 和 contract，否则不能沿用 C3-A 的 WorkCell 结论 |

C3-B 不是固定对象的第二个实例，也不是证明 P08 的完整 reading；它只说明超出当前 design
contract 的事实必须重新问题化。处理顺序是：先由 P08 判断是否属于当前问题范围；若不属于，
标为 `out-of-scope` 并建立新的问题/authority；只有当事实属于当前范围且已有相应 authority、
但证据不足时，才由 P04 表达 `unknown`。P05 也不能把范围外内容伪装成对象特殊性。

### C4：P09 只恢复多个冲突中的当前主次

固定 C1-B 的特殊条件、C3-A 的问题范围和 C2 的已选入口。此时可能同时有三根冲突：

1. 撤销 policy 与安全授权是否仍允许继续；
2. host effect 已开始但结果未知，是否存在不可逆外部风险；
3. 当前记录是否足以支持 owner 作出下一判断。

这里先只保留三根待比较的 hypothetical main-conflict candidates：安全授权关系、不可逆
effect 风险、以及 owner 所需的记录充分性。不同条件和后果可能改变比较结果，但“哪一根是
主要矛盾”仍需由下游 owner/protocol 在当前 scope 和 contract 内判断；本 fixture 不预设某一
根必然优先。P09 只表达主次比较，不推出 route、retry、cancel、compensation、acceptance、
长期保证或 runtime gate。

## 最近邻与失败路由

| 观察到的失败 | 说明 | 回返位置 |
| --- | --- | --- |
| 只增加背景，却没有改变分析 | 把信息量误当成特殊性 | P05 candidate 的非承重反例；必要时回到 P06 的删减边界 |
| 入口改变了问题范围 | 把 P07 的开始位置误写成 P08 的对象边界 | 重新问题化，分别记录 scope 与 entry；不把两者合并 |
| 范围外 provider 事实被当成当前 run 事实 | 把 P08 的 boundary 穿透成事实或权限 | 标为 `out-of-scope`，不计作当前对象的 unknown；只有新 scope/authority 内证据不足时，才保留 P04 `unknown` |
| 局部高风险自动成为全局主要矛盾 | 把 P05 的显著差异或 P07 的先手误写成 P09 | 由当前 scope、后果和 owner 重新审 P09，不扩大 WorkCell core |
| 主次选择直接产出处置 | 把“先处理哪根”误写成 route、retry、cancel 或 acceptance | 交给下游 owner/protocol；本记录不授权实现 |

若同一对案例无法改变相应的 route、下一问题或综合判断，则该区别仍只是词汇区别；应保留
`boundary-uncertain`，不为 P07/P08/P09 批量创建 reading candidate。

## 当前处置与 return condition

- P05：既有 candidate review 仍为 `retain-candidate / independent-review-complete / acceptance-pending`
  （见 [`philosophy-reading-review.md`](philosophy-reading-review.md)）；本记录本身仍只检验它
  与入手点、问题边界、主次的相邻关系，不借关系 fixture 重复取得 P05 acceptance。
- P07/P08/P09：在本 relation fixture 建立时曾保持 `reading absent / boundary-fixture-only /
  research-open`；之后 P07、P08、P09 已分别形成并完成独立 source/reading review。本 fixture
  不替代这些 reading review，也不形成新的 P09 acceptance。
- 更广的 P01–P16 父 item：仍为 `design-boundary-observed / independent-review-complete / acceptance-pending`；
  本 relation 本身已完成独立 review，但不代表父 item 的全部交叉关系已关闭。
- 证据等级：`design/fixture observation`；无 behavior Run、matched comparison、regression、
  acceptance 或 WorkCell implementation authorization。
- 下一 return：由独立 reviewer 检查四案是否保持同一对象、四个变量是否真的可区分、C3 是否把
  scope boundary 与 unknown 混淆、C4 是否把主次越权成 route；发现问题时只修本 relation 或
  P05 candidate，不能顺手创建 P09 载体；P07/P08 的后续 candidate 由各自 source/reading review
  独立形成。

## Independent semantic review

reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`）；未参与本记录生产，未修改
文件，也没有哲学 source、reading、theory、skill、runtime 或最终 acceptance 权。初次 review 返回
`uncertain / revision-pending`，指出 C1 的复合变量、C2 的 P07“易/可行”表达、C3-B 的相邻对象
身份、C3 的 scope→unknown 顺序和 C4 的主次越权风险；以上最小修订已回写本文件。

二次 review 后，关系 standing 为 `design-boundary-observed / independent-review-complete /
acceptance-pending`；C1 是单变量 design fixture，C2 是带“可取得/可局部处理/后果可控”限定的
P07 生成性表达，C3-B 明确为 scope comparator，C4 只保留 hypothetical main-conflict candidates。
两轮 review 都没有产生 behavior、matched、regression、哲学/reading acceptance 或 WorkCell
implementation authorization。
