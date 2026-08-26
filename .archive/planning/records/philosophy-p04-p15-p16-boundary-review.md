# P04 / P15 / P16 交叉边界 review

状态：`design-boundary-observed / independent-review-complete / acceptance-pending`；本记录是
父 item 的有限 cross-relation fixture，不是 P15/P16 reading、哲学 source、eval protocol 或
acceptance rubric。

## 对象与来源

固定对象：**WorkCell 设计中“Binding 在 admission 后物化、运行期间不可变”的主张**。以下案例
都只改变证据/实践/时点覆盖，不改变这个对象；如果对象从设计主张变成已实现 runtime 行为，
必须重新问题化，不把案例连续性当作事实。

- P04 source：`P04｜知之为知之，不知为不知｜认识·已知边界`，回答当前哪些内容可以称为已知。
- P15 source：`P15｜实践是检验真理的唯一标准｜解决·检验·手段`，回答主张用什么实践检验。
- P16 source：`P16｜慎终如始，则无败事｜解决·检验·时点`，回答检验/观察覆盖哪些时点；它不
  自动推出固定长期窗口或完整监控仪式。
- 当前 design source：[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) 的 Binding
  admission/immutability baseline；当前 WorkCell planning records 仍将运行时效果、owner、
  acceptance 和 adoption window 记为未知。
- 下游边界：`theory/harness/iterative-improvement.md` 与 `evals/skill-evaluation/protocol.md`
  可以表达实践、匹配、采用后窗口和证据 standing，但不能改写 P04/P15/P16 source。

## 最小区别

| 概念 | 当前只判断什么 | 不拥有的判断 |
| --- | --- | --- |
| P04 已知/未知状态 | 某个对象、关系或结论当前是否得到来源/证据支持；没有支持就诚实保留 unknown | 不决定调查资格、检验手段、接受、route/stop 或 runtime 权限 |
| P15 检验手段 | 是否有与主张相称的实践/检验，能把主张带回对象并观察结果 | 不把一次执行、格式通过或自评自动变成已知；不决定检验时点的全部覆盖 |
| P16 检验时点 | 检查发生在开始、改变、执行中、结束或采用后哪些时点，以及遗漏哪一段 | 不决定主张是否为真、不替代实践、不把末端检查变成全程保证 |

三者可以同时为真或同时不充分：有已知的文档事实，不等于已完成实践检验；有实践检验，不等
于所有时点都被观察；有时点记录，也不等于主张已经获得充分知识或接受。

## 具体成对案例

| case | 固定对象与已观察事实 | P04 判断 | P15 判断 | P16 判断 | 不能推出的结论 |
| --- | --- | --- | --- | --- | --- |
| B1：设计事实 vs runtime 事实 | canonical design 明确写出 admission 后 Binding 不可变；没有 host/runtime 实践 Run | “设计文档包含该主张”是已知的 source fact；“运行中确实不可变”仍 unknown | 没有相称实践检验，P15 尚未成立 | 没有开始/执行中/结束或采用后覆盖，P16 尚未成立 | 不能把设计 baseline 写成 runtime guarantee 或协议 acceptance |
| B2：fixture 结果 vs 主张范围 | hypothetical 的可重建 host fixture 在 admission 后尝试改变 Binding，并在该 fixture 范围内记录 unchanged/blocked；没有跨 host policy、并发或采用后覆盖 | “该 fixture 在该范围内观察到什么”可知；“所有运行中都不可变”仍 unknown | 该实践可以检验受限的 Binding immutability 主张；范围外和归因仍需保留 | 若 fixture 只覆盖 admission 与尝试/结束，仍缺执行中撤销和采用后时点 | 不能把局部 fixture 结果写成全局 runtime guarantee 或长期回归 |
| B3：末端检查 vs 全程关系 | 假设一次实施例只在结束时记录 Binding 状态，未观察 admission、执行中撤销或采用后行为 | 只能把“结束时记录的状态”作为局部事实；其他时段保持 unknown | 末端记录是否构成检验取决于主张和 fixture，不能由 P16 替代判断 | P16 覆盖了一个时点，但暴露了开始/中段/采用后的缺口 | 不能由一次末端检查推出全程不可变或长期无回归 |
| B4：实践有效 vs acceptance | 假设有可重建的 host fixture，结果支持 Binding immutability，但 named acceptance owner 尚未决定 | 结果支持的关系可以提高知识 standing，但未自动获得项目接受 | P15 的实践检验可以成立到其相称范围 | P16 的时点覆盖仍需单独记录，不能被接受决定吞掉 | 不能把 P15/P16 或 P04 代替人类/受托 acceptance |

这些是设计/证据 fixtures，不是新的 runtime Run。B1/B2/B3/B4 都明确标注为 hypothetical
boundary cases；已保存的 mechanism round raw output 属于另一个 Event/replay 对象，只作为
独立的 attribution boundary 旁证，不作为本组 Binding fixture 的事实。它们支持边界观察，不支持
`matched-improvement`、哲学 acceptance 或 WorkCell implementation authorization。

## 反例与路由

- **把“有来源”写成“已知”：** B1 失败，回到 P04 的 evidence state，不提前调用 P15/P16。
- **把“做过实践”写成“已检验”：** B2 失败，回到 P15 的实践相称性、匹配与污染 review；保留
  P04 unknown。
- **把“结束时看过”写成“全程稳定”：** B3 失败，回到 P16 的时点覆盖；不补造长期窗口。
- **把“检验支持”写成“已接受”：** B4 失败，交给 named acceptance owner；不修改 P04/P15/P16
  source 或创建 runtime gate。
- **把问题边界混成知识状态：** 若对象范围、受众或上下文尚未稳定，先 route 到 P08/concept
  articulation；P04 只表达在当前范围内已知/未知。

## 当前 standing 与下一 return

- P04：`retain-candidate`；独立 source/边界 review 已完成，但本记录会检验其与 P15/P16 的可
  区分性，接受仍未知。
- P15/P16：没有创建 reading candidate；本轮只建立 cross-relation boundary fixtures，避免在
  没有各自 source review 时偷写解释。
- 父 item：`design-boundary-observed / independent-review-complete / acceptance-pending`。
- 下一项最小实践：由独立 reviewer 检查四案是否保持同一对象、是否确实改变 P04/P15/P16 的路由，
  以及 B2 的 raw evidence 是否被准确标注；若有一案无法区分，回修 relation 或 P04 candidate，
  不批量创建 P15/P16 载体。

## Independent semantic review

reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`），只读、未参与本记录生产、
未修改文件，也没有哲学或 acceptance authority。

- B2 初版曾错误引用 Event/replay mechanism round 作为 Binding immutability 的案例；该问题已
  修订为同一 Binding 对象上的 hypothetical host fixture。mechanism round raw output 已降为独立
  attribution boundary 旁证，不再混入 B1–B4。
- B1、B2、B3、B4 都保持同一 Binding immutability design claim；B1/B3/B4 的 P04/P15/P16
  区分与边界成立，B2 在 hypothetical fixture 范围内成立，但尚无真实 fixture Run，standing
  仍为 `boundary-supported as hypothetical / evidence-unknown`。
- P04 只表达局部知识状态，P15 只表达相称实践检验手段，P16 只表达时点覆盖；没有任何一项
  被写成 acceptance、长期 runtime 保证或实现授权。
- 整体 standing 保持 `design-boundary-observed / independent-review-complete / acceptance-pending`；
  P04 继续 `retain-candidate`，P15/P16 不形成 reading candidate。

下一 return 是未来出现真实 host fixture 时，分别记录 outcome、时点覆盖、归因和 acceptance；在
此之前不把 hypothetical boundary-supported 升格为实践证据。
