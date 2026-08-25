# Principal 修正闭环审计

**Standing：** `research / internal audit`。本文是对现有闭环的来源有界审计，不是
living theory、protocol、skill、fixture、runtime 或接受决定；不把本审计写成已经
实现的机制。它只分析三条 Principal correction 为什么在用户指出前没有被现有闭环
处理，并提出可证伪的最小改进候选。

## 范围与来源

本审计完整读取：

- `theory/harness/iterative-improvement.md`；
- `theory/harness/planning-inbox.md`；
- `evals/skill-evaluation/protocol.md`、`trial-manifest.md`、`trial-ledger.md`（审计读取时
  尚位于 `experiments/skill-evaluation/`，随后按 Principal correction 整体迁移）；
- `theory/research/planning-inbox-theory-review.md` 与
  `planning-inbox-theory-review-round-2.md`；
- `theory/research/theory-structure.md`。

来源之间的 standing 不相同：iterative/planning-inbox 是 living theory；protocol、
manifest、ledger 是 workflow projection/template/追加记录；两轮 review 是静态
审查；theory-structure 是结构研究提案。用户指出的三条 correction 是 Principal
source，不是 review 推断。现有文本、路径和一次 review 都不能代替 Principal
接受，也不能证明闭环行为。

## 总结判断

当前闭环有“baseline → candidate → review → disposition”和上游 stale 传播的
概念，但没有一个明确、可重建的关系把下列事件连起来：

```text
Principal correction
  → assumption delta
  → owner routing
  → stale propagation
  → re-evaluation
  → accepted disposition
```

因此三条 correction 的共同失败不是“少了一个字段”，而是 correction 被当作
评论、额外要求、局部文字修订或路径意见，未被提升为改变既有假设和下游有效性的
来源事件。既有 acceptance/review 主要回答“候选是否满足当前 card/理论”，而不
回答“Principal 是否改变了 card、对象边界、owner 或 record standing”。

## 三条 Principal correction

### 1. raw 可以按语义转折拆分

#### 被击中的旧假设

旧的 raw-first 关系正确要求保留原话，却容易把 raw 想成单一物理段落：raw fidelity
被测试为“不覆盖原文”，没有成为明确的可重建关系（批次、顺序、逐字片段、来源、
上下文）。因此 Main 将同批原文拆成六个片段时，拆分行为可能被误判为修改原话，
或反过来只保留摘要而失去重建能力。

#### owner 与 stale edge

- Principal/user 拥有原始表达及其修正权。
- Secretary/Agent 只能负责可追溯的分段、解释和 disposition；不得自行改变 raw
  的语义。
- planning-inbox theory 与其 raw fidelity probe 是直接受影响的 theory/fixture；
  若存在实际 skill/form projection，它们依赖该语义并应标为待复评，而不是自动
  变成新 canonical source。
- protocol 只有在 fixture 或 card 把 raw fidelity 作为本轮目标时才受影响；不能
  由一次分段 correction 倒写已经冻结的 card/ledger。

#### 为什么既有 review 没覆盖

第一轮 review 只要求 raw、interpretation、unknown 可分离，第二轮确认了“可按语义
转折拆分并重建”，但这是用户 correction 之后的静态复核。既有 acceptance card 和
probe 没有一个最小反例明确区分“物理整段”与“可重建原话”；review 因而能接受
raw-preservation 的抽象表述，却不能提前发现分段这一载体/语义边界。

#### 是否回写

- theory：应回写为可重建语义，已由后续 planning-inbox theory 修订候选承接；
  这不是新增 schema。
- skill/form：当前 `no-proposal`。只有独立行为 probe 证明现有方法仍漏掉片段
  顺序、逐字内容或上下文，才由 skill-formation/form-selection 判断载体。
- protocol/fixture：应在未来 raw fidelity fixture 中加入“六片段重建”反例；不必
  为此新增 runtime。

### 2. research 与 experiment record 不可混用

#### 被击中的旧假设

第一版和修订后的 theory 将 research candidate、experiment candidate、run
observation/evidence 放在同一段去向表达中。虽然文本说二者有不同 standing/owner，
但“experiment candidate 负责 run observation/evidence standing”仍可能让 candidate
吞并实际记录，或让 Agent 把“想做实验”当作已发生的运行。

#### owner 与 stale edge

- Principal/项目 owner 决定是否形成 candidate 或改变项目关系。
- research candidate 只承载待调查的问题、已有来源、候选推断、矛盾、unknown 和
  所需证据；实际 research record 的调查观察、来源核验和结论由 research
  record/source owner 负责。
- experiment candidate 只承载待验证干预、baseline、controlled variables、
  configuration candidate、预期观察/证据条件和接受条件；实际 Run/Cell 的
  observation、effect、failure、evidence 属于 experiment record、runtime/Cell
  与 evidence owner。
- incubation/planning candidate 不取得 research 或 experiment standing。
- 受影响边是 planning-inbox theory、两轮 review 的 B5、相关 candidate/record
  fixture，以及 protocol 中 outcome/evidence/owner 的投影；既有 run/ledger 是
  历史记录，不应倒写成新 standing。

#### 为什么既有 review 没覆盖

第一轮只验证“研究/孵化不是同一桶”的方向；第二轮才把 candidate 与实际
experiment record 的混淆判为唯一 blocking B5。既有 review 的最近邻矩阵没有使用
最小反例 `想试 A` / `实际跑 A 的观察`，也没有把 candidate、Run/Cell、evidence
和 acceptance 的 owner 作为必须分开的交接；所以静态文本看似区分，闭环却没有在
第一次生成时发现 standing 泄漏。

#### 是否回写

- theory：应最小回写 candidate 的预期/所需证据关系与实际 record 的 owner 分离；
  不把实际 observation 写回 candidate。
- skill/form：不预判新增 skill 或载体；若 probe 显示秘书仍将候选冒充运行记录，
  再由 skill-formation/form-selection 判断。
- protocol/fixture/eval：应加入 candidate→record 的 nearest-owner 反例和
  `想试 A`/实际运行观察的分离检查；现有 protocol/ledger 的 historical identity
  保持不变。

### 3. evaluation records 不应归在 `experiments/`

#### 被击中的旧假设

审计时的 workflow 以 `experiments/skill-evaluation/` 承载 protocol、manifest、ledger
及相关运行/审查材料，隐含“评估记录属于 experiments 子树”的形式假设。Principal
指出 evaluation records 应有独立的 `evals/` 语义 owner；这不是把某个运行结果
变好，而是纠正 record 的载体、生命周期和责任边界。历史路径不能因此被倒写。

#### owner 与 stale edge

- Principal/Main 或明确结构接受者拥有 eval record 的 canonical form/位置决定；
  protocol owner 负责 workflow projection；run/review/ledger owner 负责记录事实。
- `theory-structure.md`、protocol、manifest、ledger 的路径引用和“当前评估入口”
  是受影响的结构/workflow edges；已有 manifests、runs、reviews、hash 和历史
  standing 是历史 artifact，不应被静默迁移叙述。
- 若未来显式接受独立 `evals/`，依赖它的链接、fixture、fresh holdout、review
  入口和新 round 需要重新生成或建立新入口；旧结果只保留为历史观察。

#### 为什么既有 review 没覆盖

两轮 planning-inbox review 关注对象语义、authority、hold 和 candidate/record，
没有把 evaluation record 的 canonical form 当作被审查的对象。iterative theory
虽然要求 form/owner/stale 边界，theory-structure 也记录了 structure proposal，
但没有一个 Principal correction intake 把“路径改变意味着 owner/lifecycle 改变”
送入 proposal→accept/move→stale→rerun 闭环。protocol 只把 manifest/ledger 当作
当前 workflow 载体，不能自行接受新的根目录。

#### 是否回写

- theory：除非路径改变了对象、owner 或 standing，否则不应把 `evals/` 写成
  planning-inbox 语义。可在结构/form review 中记录待接受的 canonical-form correction。
- skill：`no-proposal`；目录位置不是 Agent 行为 gap。
- form/structure/protocol：应由明确 owner 单独提出并接受独立 eval form/入口，
  再按依赖标记旧引用 stale、保留历史并建立新 round；本审计不迁移、不预建路径。
- fixture/eval record：未来新 round 应使用接受后的入口；旧 fixture/run 不因路径
  变化而伪装成当时使用了新入口。

## 为什么既有闭环会漏掉 Principal correction

### 1. correction 没有一等 source standing

理论承认 correction、未知和 stale，但没有说明 Principal correction 如何区别于
普通建议、review comment、运行观察或新 raw。于是用户的三条话在进入理论前被当作
“补充要求”，没有自动形成 assumption delta。没有 delta，就无法确定哪个 owner、
哪些 artifact 和哪些旧结论失效。

### 2. acceptance card 是 candidate-first，不是 correction-first

manifest 在 treatment 前冻结对象、baseline、candidate、边界和接受者；ledger 在
freeze 后追加运行、review、stale/recovery 和 disposition。这能防止倒写，但没有
一个 Principal correction 入口：用户在 freeze 前指出新边界时，旧 card 可能继续被
视为当前；freeze 后则只能由人工知道应开新 round，无法从记录重建“谁改了假设、
为什么旧结论 stale、哪个 owner 接手”。

### 3. stale propagation 没有从 source correction 自动触发

iterative theory 给出 `P → theory → skill/fixture/rubric/旧结论` 的血统，也要求
上游变化标记 stale、重生成、独立 review、回归和 fresh holdout。但三条 correction
不是 P 变化，而是 Principal 对现有对象/形式/record standing 的修正；既有边列表
没有明确的 correction event、assumption delta、影响范围和回返责任。因此静态
review 通过后，仍可能只有用户指出才发现 stale edge。

### 4. review 看到了候选，没看到 live correction escape

两轮 review 能发现 B1–B5，是因为 review 本身读取了修订后的文本；它没有测试
“修正到达时已有 Agent/runner 正在使用旧 baseline 或旧 owner 假设”。没有 safe-point
前后的 live subagent baseline，也没有 correction escape 记录，无法知道修正是否
阻止了旧候选继续运行、是否重新冻结 card，或是否把历史结果误当当前依据。

## Safe point 与 live subagent baseline

现有 planning-inbox theory 只把 safe point 表达为 Agent 再次获得运行机会时重新读
source、识别新增/修订并决定是否抢主线；它明确不声称后台唤醒、持久 identity、
exactly-once、并发 claim 或 crash recovery。这是诚实的 runtime 边界，但不足以证明
Principal correction 在 live work 中被看见。

最小可检验关系应是：

1. 冻结当前 live subagent 所依据的 baseline、assumption、owner 和 source revision；
2. 在一个 safe point 注入 Principal correction，不能把 correction 静默当作普通新
   input，也不能覆盖旧 baseline；
3. 标出受影响 candidate/fixture/protocol/eval record 或旧结论的 stale edge，
   说明当前 Agent 是停、继续完成有界安全动作，还是回返 owner；
4. 重新形成 candidate、card 或记录后，由独立 review/re-eval 和 Principal acceptance
   决定恢复，而不是由 Agent 自报“已更新”恢复。

如果没有新的运行机会，只能报告“未复查”；不能声称 live subagent 已停止、已恢复或
已处理 correction。这些是可证伪的运行关系，不是本报告赋予 runtime 的保证。

## Correction escape 与 recurrence 指标

这些是未来审计/实验的观察指标，不是现有系统已具备的 telemetry：

| 指标 | 观察问题 | 失败含义 |
|---|---|---|
| correction escape | 多少 Principal correction 只有在用户重复指出后才进入记录/owner 路由 | source→assumption 闭环没有入口 |
| assumption delta latency | 从 correction 到旧假设、受影响 artifact 和 owner 被明确的时间/运行次数 | 发现了 correction 但未形成可行动 delta |
| stale coverage | 被列出的受影响 theory、candidate、fixture、protocol、record、旧结论占应受影响边的比例 | stale propagation 不完整 |
| safe-point response | correction 到达后，live work 是否在下一个合理边界停止、保留、回返或重评 | 旧 baseline 继续污染 live work |
| owner routing accuracy | correction 是否到达真正的 theory/form/protocol/record/runtime owner，而非最近 Agent | review/record/接受权越界 |
| re-eval closure | 已标 stale 的对象是否产生新 round/review/fresh evidence 或有理由 retain-baseline/no-proposal | stale 只被标记，没有闭环 |
| recurrence | 同类 correction 在接受修订后再次出现在新 artifact、fixture、record 或 review 中 | 修订未内化、未传播或未改变行为 |
| false closure | correction 被标成“已处理”但没有 Principal disposition、owner acceptance 或可回读 provenance | receipt/clear/review 被冒充完成 |

指标应按对象和风险解释，不合成全局分数。没有可靠 runtime/event 机制时，只能依靠
可回读记录或声明 unknown；不能因为“没有再次发现”而声称没有 recurrence。

## 最小可证伪改进候选

### C1：correction relation candidate

提出一个方法层关系，不规定字段或存储：Principal correction 必须能回指 source，
指出 assumption delta，路由到最小 owner，列出 stale 影响范围，并在 safe point
安排 re-evaluation 与 accepted disposition。可接受结果包括 `adapt-and-retest`、
`retain-baseline`、`no-proposal`、`rollback` 或 `uncertain`；review 只能建议，
不能代替 Principal acceptance。

**Probe：** 分别注入三条 correction，在 freeze 前、live run 中、旧结果已存在后三个
时点检查是否能重建 source、delta、owner、stale edge、下一行动和接受者；任何一步
只能口头说明时，C1 不成立。

### C2：三个最近邻 fixture

仅作为未来 eval candidate：

- 六个按语义转折拆分的 raw 片段，检查批次、顺序、逐字内容、来源与上下文可重建；
- `想试 A` 的 experiment candidate 与实际跑 A 的 Run/Cell observation/evidence
  record，检查二者不互冒 standing/owner；
- 旧 evaluation 入口与 Principal 提议的新 canonical form，检查历史 artifact 不被
  倒写、旧引用可标 stale、新 round 可重建。

**Probe：** baseline/treatment、reviewer 隔离、source hash、workspace 和 acceptance
关系按风险冻结；若条件未知，只报告 `behavior-observed` 或 `uncertain`，不宣称
matched improvement。

### C3：safe-point correction escape probe

在已有 live subagent 依据旧 baseline 工作时注入 correction，比较 safe point 前后
是否保留旧锚点、阻止越界效果、标 stale、回返 owner 并等待新 re-eval。该 probe 不
要求后台唤醒、持久 identity、exactly-once 或 crash recovery；若这些硬属性成为真实
目标，再另行交给 runtime/base owner。

## No-proposal 与当前处置

本审计不提出：全局 correction daemon、自动迁移到独立目录、固定 correction schema、
新增 inbox skill、自动接受、自动清除旧记录、把三条 correction 写回哲学源 P，或用
prompt 声称并发/恢复/持久性保证。这些均为 `no-proposal`，除非后续有独立来源、真实
owner 和风险相称的行为证据。

当前最小处置是：

- 三条 Principal correction 作为 source 保留；
- C1–C3 只作为可证伪候选，不宣称已实现；
- B5 candidate/record owner 分离需回写 planning-inbox theory；
- `evals/` 独立入口若要成立，需由结构/form/protocol owner 单独提出并显式接受，
  历史 `experiments/skill-evaluation` 记录不倒写；
- 在 correction escape、stale coverage、safe-point response 和 recurrence 有实测
  之前，闭环 standing 保持 `revise / behavior unknown`，后续行动为
  `adapt-and-retest`。

本报告自身是 research evidence，不是上述修订的接受记录；静态审计、`git diff --check`
或一份可读报告都不能证明 correction loop 已闭合。
