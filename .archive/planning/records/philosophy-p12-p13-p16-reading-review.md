# P12 / P13 / P16 reading candidate 独立 review

状态：`source-current / reading-candidate / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending`；本记录不是哲学源行、living theory、reading acceptance、strategy、runtime policy 或实现授权。

本记录汇总两条彼此独立的只读 review lane：P12/P13 lane 与 P16 lane。reviewer 未参与三份
candidate 的初始写作，也未修改 candidate、source 或接受规则；Main 只根据 review 中明确的
来源和边界问题做了最小修订。随后 follow-up reviewer 只读检查了三条修订边界和跨视图状态，
结论为 `follow-up-clean`；这仍不表示 candidate 获得 acceptance。

## 1. Review 输入与范围

- source：[`theory/philosophy.md`](../../theory/philosophy.md) 中未修改的 P12、P13、P16 行；
- 术语与关系：[`theory/gene-expression.md`](../../theory/gene-expression.md) 的 `知×应对`、
  P15/P16 方法—时点关系，以及彼/己不是极的边界；
- candidate：[`P12.md`](../../theory/philosophy/P12.md)、[`P13.md`](../../theory/philosophy/P13.md)、
  [`P16.md`](../../theory/philosophy/P16.md)；
- 当前处置：[`philosophy-remaining-reading-disposition.md`](philosophy-remaining-reading-disposition.md)；
- 最近邻和既有边界：P04/P15/P16 boundary fixture、P03/P10/P15 reading、
  [`iterative-theory-review.md`](../../theory/research/iterative-theory-review.md)。

review 检查 source fidelity、对象与最小定义、最近邻区分、包含/排除/反例、生成性候选、
允许效果、未知与 reopen 条件；不检查 runtime 行为，也不把静态文件存在当成行为证据。

## 2. Independent review findings

| candidate | 可以保留的部分 | 需要收紧的部分 | 本轮判断 |
| --- | --- | --- | --- |
| P12 | source anchor、对抗关系中的双侧观察、与 P02/P04/P08/P09/P13/P15 的初步区分、未知与越权排除 | “目标/能力/约束/事实/未知”容易变成固定情报清单；生成性候选不能直接“影响”下游判断或取得信息/effect 权限 | source-bound candidate 可保留；已修改为“当前应对问题所需的关系”，作用降为 artifact/projection 候选；follow-up clean |
| P13 | 保留 `知×应对` 相邻关系、排除攻击/欺骗/绕过/资源抢占、将 response branching 保持为候选 | 源行并未给出“虚=低阻力/低成本”的固定分类；“stop/route”不能被 reading 直接授权 | source-bound candidate 可保留；已将“实/虚”改为待 domain/owner 复核的关系性标签，并把后续处置交给 owner；follow-up clean |
| P16 | source 与 P15 的方法—时点区分、拒绝固定 checklist/永久监控、保留未知 | 起始/变化/执行/结束/采用后容易读成默认全套时点；与 P03 的反馈循环有重叠；纠偏/停止/继续必须是 owner 决定 | source-bound candidate 可保留；已加入 purpose/risk/consumer/acceptance 驱动的适用性选择、`not-applicable` 和 P03 边界；follow-up clean |

## 3. Main 最小修订

### P12

- 将双侧恢复从固定字段清单改为“与当前应对问题有关的彼己关系”；具体恢复什么由对象、
  允许效果和证据决定。
- 将生成性候选从“影响 research/planning/evaluation 下一判断”降为供相应 owner 形成判断的
  有来源 artifact/projection 候选；不取得信息、effect 或 routing 权限。

### P13

- 明确“实/虚”不是 source 直接给出的固定 taxonomy；阻力、代价、后果、可恢复性只是待
  domain/owner 复核的观察维度。
- 将“较弱阻力方向”改为在具体证据满足目的且可止损时提出 response candidate，并保留替代项、
  未知和重新判断。
- 将继续、改向、停止或回 owner 改成由相应 owner 根据实际后果判断。

### P16

- 先按目的、风险、consumer 和接受关系选择真正会改变检验的时点；不适用的时点记录
  `not-applicable` 及理由。
- 明确 P16 只暴露时点覆盖断裂，不代替 P03 的认识—实践反馈循环。
- 将纠偏、停止、继续和下一判断交还给相应 owner；补充“若不能改变真实判断或无法与邻近
  条目区分，则回修或 `no-proposal`”的 reopen 条件。

## 4. Evidence ceiling and current disposition

本轮最高只能支持：

- 三份文件仍分别锚定未改 source，且可作为 source-bound reading candidate 保留；
- 三份 candidate 的主要语义风险已经由独立 review 指出，并完成了最小文本修订；
- P12/P13/P16 的修订后 follow-up 已 clean；接受 owner、reading acceptance、行为 evidence 和下游
  方法 consumer 仍未知。

本轮不能支持：

- P12/P13 的 strategy、information policy、security policy 或 runtime routing；
- P16 的 adoption monitor、长期检查协议、runtime gate 或 WorkCell core 字段；
- 任何 behavior Run、matched improvement、regression、reading acceptance、phase transition 或实现授权。

当前处置保持分离：P12/P13 下游仍为 `no-proposal-now`；P16 下游仍为
`hold-cross-boundary-fixture-only`。三份 candidate 的 `follow-up-clean / acceptance-pending` 不因本记录
生成而取得 reading acceptance。

## 5. Follow-up result：clean

独立 follow-up reviewer 只读核对了本轮修改的三条边界和跨视图状态，四项均为 `yes`：

- P12 仍避免固定双侧情报清单，且没有直接判断、信息或 effect 权限（[`P12.md`](../../theory/philosophy/P12.md#L20-L62)）；
- P13 的“实/虚”仍是 domain/owner-bound comparative label，没有退化为低成本偏好或攻击策略
  （[`P13.md`](../../theory/philosophy/P13.md#L14-L59)）；
- P16 按 purpose/risk/consumer/acceptance relation 选择适用时点，支持 `not-applicable`，没有接管
  P03 feedback 或 owner decision（[`P16.md`](../../theory/philosophy/P16.md#L22-L59)）；
- 三份 candidate 仍保持 `follow-up-clean / acceptance-pending`，下游 no-proposal/hold 未被升级
  （本记录与 [`philosophy-remaining-reading-disposition.md`](philosophy-remaining-reading-disposition.md#L32-L35)）。

这次 follow-up 只关闭修订后的窄 review，不关闭 reading acceptance、父关系、行为 evidence 或下游 consumer。

## 6. Remaining acceptance gate

若没有 named consumer、acceptance owner 和能改变下一判断的真实 case，正确处置仍是保持 candidate、
保留 unknown 或 `no-proposal`，而不是为了完成 P01–P16 覆盖率继续创建 strategy、skill 或 runtime 机制。
