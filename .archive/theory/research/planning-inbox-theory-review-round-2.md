---
kind: review-record
id: planning-inbox-theory-review-round-2
status: settled
disposition: static-revise
---

# Planning Inbox theory review — round 2

## 结论

**静态 theory verdict：`revise`。**
**行为状态：`unknown`；后续动作：`adapt-and-retest`。**

本轮只审查修订后的 `theory/research/planning-inbox-synthesis.md` 与
`theory/harness/planning-inbox.md`，不把静态文本、探针清单或一次可读输出当作
行为有效性证明。第一轮 B1–B4 的主问题均已得到实质修订；但新增要求中的
research candidate、experiment candidate 与实际 experiment record 的 standing/owner
仍有一处承重混淆，因此尚不能静态 `accept`。

## 第一轮 B1–B4 逐项复核

### B1 对象是否已经收窄：通过

两份文件都已明确对象不是文件、命令、Todo、计划或 Agent 回复，而是：

```text
raw/source → secretary interpretation → disposition
                         → optional / explicit handoff + provenance
```

Synthesis §2.1 第 57–74 行明确说 execution、evidence、completion、acceptance、
archive、receipt 是 handoff 后可关联的结果或记录，不是 inbox 同一性的必要组成；
harness proposal 第 15–35、39–60 行也把它们放入邻近对象表。这已经修正了第一轮
把文件/列表产品化为全生命周期对象的问题。

仍需在后续行为 probe 中验证合并、重放、修订和 handoff 是否真的保持该边界，但
这是行为 unknown，不再是当前 theory 的 blocking 对象错误。

### B2 authority 与 fresh confirmation：基本通过，保留一个措辞风险

Synthesis 第 111–124 行和候选第 86–101 行已明确：explicit user instruction 或
已有 bounded delegation 可以直接支持保存 raw、可逆本地整理/链接、局部 Todo、
合并建议和有界检查，不要求逐条 fresh confirmation；mere suggestion/inference
不能授权新的 commitment、priority、goal、owner、scope、acceptance 或外部/不可逆
效果。这符合低摩擦秘书 Agent 及 active goal 下的有界委派要求。

还需要一个 non-blocking 文字收窄：`explicit user instruction` 不是无条件的全局
授权。应在后续修订或 method adapter 中明确按指令自身的 action、scope、effect
boundary 和 reversibility 解释；“请记下/整理”与“替我对外承诺/接受”不能只因都
是 explicit 就取得同样权限。当前文本已有不得扩张 scope、需要更强语义回到 owner
的护栏，因此这不再阻断 theory 接受，但行为 probe 必须覆盖权限过宽的反例。

### B3 hold/revisit 与 safe point：通过

Synthesis 第 126–131、211–226 行以及候选第 152–158、198–220 行要求每个非终结
hold/deferral 有可见 reason，并至少连接到 owner decision、safe point、return
condition、下一次运行机会的 review eligibility 或 owner escalation；没有运行机会
只能报告“未复查”，不能声称持续检查。候选同时保留新输入默认不抢主线，只有明确
切换或改变 acceptance/safety boundary 才能重新排序/暂停。

这同时防止了自动抢主线与无限静默搁置，也没有把 revisit 误写成 scheduler、后台
wake、cursor、exactly-once 或 crash recovery 保证。后续只需检验这些关系是否在
实际运行机会中可见，不需再扩大 theory。

### B4 P12/P13 是否正确消融：通过

Synthesis 第 153–181 行已从逐项 P 映射中移除 P12/P13，并明确当前没有对抗性
actor、竞争性 consumer 或误导性输入；只有消融后确实改变 inbox-specific 判断才
恢复它们。候选的 P 冲撞链保留 P01–P11、P14–P16 的局部贡献，未再以全序列覆盖率
为质量指标。

这是正确的 theory delta。P12/P13 后续最多作为条件性研究假设，不应在没有新来源
或 probe 结果时恢复为必需血缘。

## Residual blocking

### B5 candidate 与实际 experiment record 的 standing/owner 仍不稳定

Synthesis 第 81–87 行称：

> experiment candidate 负责待验证的候选干预及其 baseline、controlled variable、
> configuration、run observation 与 evidence standing。

随后又说 research 调查记录与 experiment 运行观察/证据记录各有 standing 和 owner，
前者可以提出后者，二者不可互相冒充。候选第 137–146 行重复了同一结构。这里的
“experiment candidate 负责 run observation/evidence standing”会把实际 Run/Cell
记录重新吸收到 candidate，或至少让 Agent 无法判断谁拥有 observation、证据和
接受关系；这直接违反 harness 对 candidate、Run/Cell、evidence、review、acceptance
的 owner 分离。

最小修订应是：

- `research candidate` 只承载待调查的问题、已有来源、候选推断、矛盾、unknown
  与所需证据；实际调查记录中的观察、来源核验和结论仍属于 research record 的
  source/record owner。
- `experiment candidate` 只承载待验证的干预、baseline、controlled variables、
  configuration 候选、预期观察/证据条件和接受条件；实际 Run/Cell observation、
  effect、failure 与 evidence 属于 experiment record/Cell/runtime owner。candidate
  可以链接或提出该记录，但不拥有它。
- `incubation/planning candidate` 只表示尚未形成正式 research 或 experiment
  关系的方向性计划，不取得 research/experiment evidence standing。
- inbox 的 disposition 只能提出或交接这些 candidate/record 关系；不能因为路由
  名称而替目标 owner 创建实际记录、接受结果或改变 standing。

修订后应能用一个最小反例区分：一句“想试 A”可成为 experiment candidate；一次
真实运行观察可成为 experiment record；前者不能冒充后者，即使二者由同一输入
lineage 连接。这是 object/part/related-result 的概念边界问题，也是当前唯一的
blocking theory issue。

## 新增要求复核

### Raw 可按语义转折拆分但可重建：通过

Synthesis 第 76–79 行、候选第 30–35 和 64–70 行都明确允许按语义转折拆分，同时
保留 batch、顺序、逐字内容、来源、上下文、修订与撤回关系。它没有把 raw 绑定为
单个 Markdown block，也没有允许摘要覆盖原话。主张是可重建语义关系，不是物理
布局合同，符合 `concept-articulation` 的对象/载体区分。

### research / experiment / incubation candidate 与实际记录：部分通过

候选已明确随手写“想做实验”不是 research 结论或 experiment record，并声明不同
record 有各自 standing/owner；方向是正确的。但 B5 所述“experiment candidate 负责
run observation/evidence standing”仍破坏这项区分，须修正后才算完全通过。

### 未固化未来 eval 路径或 schema：通过

两份文件都明确 research、candidate、probe 不是现行实现，行为探针不是行为声明；
候选第 30–35、123–135、222–246 行和 synthesis 第 263–282 行都拒绝固定字段、
标题、标识符、命令、Markdown parser、状态机、批处理周期、Agent 数和 runtime
协议。`research candidate`、`experiment candidate` 等是 standing/owner 的语义
区分，不是闭合枚举或预先 schema。

探针中的 outcome matrix、authority matrix、Markdown boundary 和 long-running
recovery 是未来验证问题，不应被误读为已经选择了评估框架、存储路径或调度机制；
当前文本对此已基本写清。

## Non-blocking observations

### N1 直接授权的 action boundary 可再显式化

如 B2 所述，理论已分 explicit instruction 与 bounded delegation，但可在后续
method/authority adapter 中把 action、scope、effect、reversibility 作为解释条件。
这会降低“用户明确说了”被过度泛化的风险，不要求改变对象理论。

### N2 “可见”不等于永久可查询，当前边界已诚实

hold 的 reason/revisit 要求是可审查语义，不是 durable queue 或 scheduler 合同。
候选已说明没有新运行机会时只能报告未复查。未来若要求跨进程持久可见，应交给
runtime/base，而不是给 Markdown 加更多字段。

### N3 harness 子目录与 owner 比例合理

候选仍把自己定位为 harness 的 living theory 子理论，说明 inbox 是处理关系，而
非 `planning/inbox.md` 的 authority。它把 source、secretary、destination owner、
runtime/base 和 acceptance 分开，没有把 harness 变成 source/goal/Plan 的第二权威。
这是合适的 form-selection 结果；不需要另建 skill、schema 或产品目录。

### N4 consume / clear / archive / complete / acceptance 已保持分离

候选第 160–177 行仍清楚区分 receipt/consume、视图 clear、可恢复 archive、带证据
的 complete、独立 acceptance 和 delete/purge。没有发现第一轮所指出的语义回退。

### N5 P 生成关系与 standing 分离保持良好

Synthesis 已把 P 作为 theory-generation 血缘，把 research 作为 candidate，把
living theory、future probes、implementation、runtime 和接受决定分开。没有发现
把 P、research 或 archive 提升为运行时前置条件的回退。

## 必要修订后的接受条件

下一轮应只检查以下 semantic delta，不应顺势增加 schema 或 runtime 设计：

1. 把 experiment candidate 的 run observation/evidence standing 改为其“预期/所需
   证据关系”或外部关联；实际 observation/evidence 归 experiment record、Run/Cell
   与相应 owner。
2. 用一个“候选干预—实际运行记录”的最近邻反例，验证 candidate 不会被路由文本
   当作 record、completion 或 acceptance。
3. 保留 explicit instruction/bounded delegation 的低摩擦可逆动作，同时让 action、
   scope、effect boundary 和 reversibility 可审查。
4. 重新运行第一轮 B1–B4 的语义回归检查；P12/P13 不得因修订方便而重新加入。

上述修订完成且未引入新的 standing/owner 混淆后，理论 verdict 可再考虑 `accept`；
在此之前保持 `revise / behavior unknown`，并以 `adapt-and-retest` 作为后续行动。
