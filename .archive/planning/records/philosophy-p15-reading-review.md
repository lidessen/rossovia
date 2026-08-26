# P15 reading candidate 的 source / boundary review

状态：`source-current / reading-candidate / independent-review-complete / research-open / acceptance-pending`；本记录不是
P15 哲学源行、P15 reading acceptance、practice-cycle acceptance、WorkCell acceptance、eval protocol 或实现授权。

## 1. 为什么现在重开

此前 [`philosophy-remaining-reading-disposition.md`](philosophy-remaining-reading-disposition.md) 将 P15 保留为
`hold-cross-boundary-fixture-only`，理由是当时只有 hypothetical Binding fixture，没有真实 practice consumer。

当前出现了一个更窄且可回读的 consumer：[`method-skill-probe-round-3.md`](method-skill-probe-round-3.md) 在真实
planning/design case 上固定 task、candidate、baseline/treatment 和 review，观察“实践结果是否改变下一项
行动/route/disposition”。该 round 没有取得 matched 或 acceptance，但它足以改变“P15 是否有一个可形成的
source-bound reading candidate”的判断。因而本记录只重开 P15，不同时重开 P16；P16 仍等待 adoption/time-window
consumer。

这不是把 round 3 写成 P15 的证明，而是把它作为 P15 reading candidate 的生成性 consumer：实践结果、范围、
归因和接受边界可以被同时区分。

本记录明确 supersede 旧 disposition 中 **P15 这一行的当前处置提案**：P15 从
`hold-cross-boundary-fixture-only` 进入 `reading-candidate / research-open / acceptance-pending`；这不是
P15 reading acceptance。P12、P13、P16 的处置不变，B1–B4 仍是原记录中的 hypothetical boundary fixtures，
旧记录的 source 与历史观察也不被改写。

## 2. Source 与 candidate contract

- **source：** [`theory/philosophy.md`](../../theory/philosophy.md) 的 `P15｜实践是检验真理的唯一标准｜解决·检验·手段`；
  source line 不可由本记录修改。
- **reading：** [`theory/philosophy/P15.md`](../../theory/philosophy/P15.md)；这是 source-bound candidate，不是新的哲学源。
- **对象：** 主张、相称具体实践、可观察结果和主张 standing 的关系。
- **主要判断：** 当前主张需要什么实践，实践结果在什么范围和归因上改变它的 standing。
- **允许范围：** source-linked reading、boundary clarification、planning/evidence practice selection 和
  unknown projection。
- **禁止越权：** 不创建全局 test plan、synthetic Run、固定测试数量、自动质量门、runtime gate、acceptance
  规则、WorkCell implementation 或 DeepSeek system。

候选定义为：对已经指认对象、范围和主张的候选判断，选择能够在具体条件下使主张面对对象并产生可观察结果的
相称实践；按结果、范围、归因和反例更新主张 standing。一次执行、文件存在、格式通过、自评成功或 reviewer
推荐都不能自动成为主张为真、matched、regression 或 acceptance。

## 3. 最近邻与边界审查

| 邻近对象 | P15 只拥有 | 不拥有 |
| --- | --- | --- |
| P04 已知/未知 | 是否有相称实践把主张带回对象 | 当前知识状态的全部来源与事实权 |
| P08 问题边界/视域 | 约束实践结果的对象、范围和适用视域 | 实践检验本身、主张 standing 或接受 |
| P16 检验时点 | 选择检验手段并观察其结果 | 开始、执行中、结束、采用后的完整时点覆盖 |
| P03 实践—认识—再实践 | 使一次实践结果能回到主张 standing | 下一实践的完整循环选择 |
| semantic review / acceptance | 为 review 或 acceptance 提供有界实践证据 | 独立语义评审、Principal acceptance 或采纳权 |

具体边界案例：

1. `method-skill-probe-round-3` 的 Case B baseline/treatment 在下一 action 和 disposition 上出现差异；这支持
   `behavior-observed`，但 runner/model/harness/workspace/权限/activation/schema 不全可核验，所以归因仍
   `unknown`，不支持 `matched-improvement` 或 candidate acceptance。
2. WorkCell Binding immutability 的 B1–B4 仍是 hypothetical fixture；它们能说明 P15 与 P04/P08/P16 的边界，
   但没有真实 host practice，不能升级为 P15 behavior evidence。
3. validator 通过、SKILL.md 可加载、文件存在或 protocol 字段齐全只支持其自身的机械事实，不能替代实践结果。

## 4. 当前证据与待验证关系

当前支持：

- P15 source line 可回读，`P15.md` 明确保留 source、对象、主判断、最近邻、允许效果、未知和回返；
- 现有 planning/design practice consumer 足以证明“P15 reading candidate 不再完全没有当前 consumer”；
- 当前 round 的 evidence upper bound 被保留为 `behavior-observed / attribution-uncertain`，没有把方法实践
  升格成 P15 reading truth 或接受。

当前仍未知：

- P15 reading 是否忠实解释 source、且在真实案例中能稳定区分 P04/P08/P16/P03；
- “相称实践”是否能在不同风险、效果和接受关系下改变实际下一行动，而不是只改善 planning 文字；
- P15 reading 的独立语义 review、P15 专属 matched comparison、regression 和 reading acceptance；
- 具体 practice/evidence owner 与 acceptance owner。

[`philosophy-p15-practice-use-case.md`](philosophy-p15-practice-use-case.md) 已把 round-3 Case A/B/C 收窄为
P15-U1；该记录当前为 `use-case-candidate / source-bound / independent-review-complete / acceptance-pending`，
只推进了对象、最近邻和回读关系，没有增加行为或接受证据。

## 5. Review 与出口

独立 review 应检查：

1. P15 source line 未被改写，reading 没有把“执行过就是真的”写成结论；
2. P04/P08/P16/P03 的最近邻确实改变案例路由，且没有把 P15 变成全局测试流程；
3. round 3 的 `behavior-observed / attribution-uncertain` 上限没有被夸大；
4. P15 不拥有 review、acceptance、runtime、权限或效果；
5. reading 的生成性候选与 `practice-cycle` 的下一实践判断保持可重组而非循环依赖。

若 review 发现边界不能改变真实判断，回修 `P15.md` 或返回 `no-proposal`；U1 已完成边界 review，但 P15
standing 仍为 `reading-candidate / research-open / acceptance-pending`，下一步是 named reading/use-case
acceptance owner 与相称实践，而不是创建 runtime 或把 P16 一并打开。

## 6. Independent semantic/source review

独立 reviewer：`Plato`（Agent `01a0387b-f544-7aa1-ab7e-bbc7a3290609`）；只读、未修改文件，也未取得
哲学源、reading、practice-cycle、WorkCell 或 acceptance 权。

初轮 verdict 为 `needs-revision`：指出 P08 被错误写成旧 archive 语境的“可证伪性”，且 superseding projection
不够显式。Main 已将 P08 修订为当前 living source 的“问题边界/视域”，并明确本记录仅 supersede 旧 P15
的 `hold-cross-boundary-fixture-only` 提案，P12/P13/P16 与 B1–B4 不变。

Plato 复读 verdict：`accept`。确认 P15 source fidelity、P04/P08/P16/P03 与 semantic review/acceptance
边界、round-3 evidence upper bound 和实现冻结均成立。该 verdict 只接受本 review record，不构成 P15
reading acceptance、truth claim、matched improvement、regression、WorkCell acceptance 或实现授权。
