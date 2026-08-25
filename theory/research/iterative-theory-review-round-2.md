# 防退化闭环迭代：第二轮独立理论审查

**审查身份：** 未参与候选写作或第一轮审查的独立 reviewer。
**审查模型：** gpt-5.6-luna。
**审查日期：** 2026-08-24。
**审查性质：** 静态语义与结构审查，不是行为试验。

## 范围与判定口径

本轮读取了 `AGENTS.md`、`theory/philosophy.md`、`theory/gene-expression.md`、
`theory/harness/theory.md`、修订后的 `theory/harness/iterative-improvement.md`，以及
`theory/research/iterative-theory-review.md`、`iterative-improvement.md`、
`iteration-process-audit.md`、`theory-structure.md`。第一轮报告列出的六项重大缺陷见
`theory/research/iterative-theory-review.md:17-30`；本轮以修订版是否形成可复用的语义判断，
而不是是否增加了更多操作文字，逐项复核。

本文中：

- **静态 `yes`** 表示文字已给出足以区分对象、来源、边界和处置的语义关系；不表示运行时已执行。
- **`uncertain`** 表示静态关系方向正确，但其成立依赖冻结的具体对象、实际 workflow、评审独立性或行为结果。
- **`no`** 表示当前文字仍直接否定该要求。没有把“行为未证明”误写成静态 `no`。

## 总结处置

对 `theory/harness/iterative-improvement.md` 作为 **living semantic theory**，本轮建议
**accept（静态语义层面）**：第一轮六项重大缺陷都已在原则层面补上，且修订版明确声明它不是
protocol、skill 载体或 harness base。对“闭环已经行为有效、candidate 已改善、已经收敛或
adopt 后无逃逸”的主张，处置仍为 **adapt-and-retest**：当前没有行为 trial 能把这些语义
关系升级为已证事实。

这不是接受哲学源、接受某个 skill、授权 runtime 效果或授权人类采纳。接受者仍须依其职责
显式决定；本报告只给出二审意见。

## 第一轮六项重大缺陷复核

| 第一轮缺陷 | 静态判断 | 当前证据与剩余边界 |
|---|---|---|
| P16 条件相位 | **yes / uncertain** | 修订版明确说 P16 不是每个对象的完整仪式；相位按风险、效果边界、方差和接受关系出现，低风险局部改变可将不适用相位记为 `N/A` 并说明理由（`theory/harness/iterative-improvement.md:23-25`）。ledger 也要求记录相位是否出现及裁剪理由（`:107-109`），已关闭“每轮无条件跑完整 holdout/长期监测”的语义缺陷。尚不能证明真实 workflow 会在 treatment 前正确选择相位；最好再把适用相位及 `N/A` 理由明确列入冻结 card，而不只在 ledger 事后记录。 |
| acceptance card 预冻结与禁止事后改规则 | **yes / uncertain** | treatment 前必须冻结接受者、硬约束、重大退化定义、目标/边界/回归最小证据、成本预算、组合规则、采用后窗口和 fresh-holdout 使用/刷新规则；结果出现后不能改写，改变即开新 round 或 `uncertain`（`:50-60`）。第一轮的循环判定和事后调权缺陷因此在语义上关闭。实际是否真的在结果可见前冻结、接受者是否越权改 card，仍只能靠行为审计验证。 |
| 必要组合、`combo-only` 与 ablation | **yes / uncertain** | 修订版允许真实不可拆的多文件语义组合，但要求写出不可拆理由；不可拆时只能报告指定组合的 `combo-only` standing，不得归因 theory、skill、fixture、rubric 或 workflow 单项；可拆时应做局部 ablation（`:64-68`）。这已阻止“组合通过即组件均有效”的过度结论。`应做` ablation 的执行强度、必要性主张和实际组合污染仍未被行为证明，因此行为层保持 `uncertain`。 |
| disposition 一致、互斥 | **yes / uncertain** | 当前 living theory 与研究记录统一使用 `adopt`、`adapt-and-retest`、`retain-baseline`、`no-proposal`、`rollback`、`uncertain`（`:111-120`），并分别区分 treatment 前无提案、评估后保留、已施加改变后的回滚和无法归因/接受的未知。六项在语义上互斥，且不是 runtime 状态。实际 ledger、路由器和接受者是否只产生一个处置值，仍需运行验证。 |
| `P → theory → 下游` 传播 | **yes / uncertain** | 修订版已显式写出哲学序列中 P 的变化沿 `P → theory → skill / fixture / rubric / 旧结论` 传播：标记受影响对象 stale，保存影响范围，按新上游重生成候选、独立 review、运行正例/边界/回归/fresh holdout，最后由接受者恢复有效（`:103-105`）。并明确 theory、fixture、workflow 或 grader 改变会使原证据等级失效的相应规则。实际 stale 覆盖、血统保存和恢复顺序尚无运行证据。 |
| 收敛、采用后窗口、fresh holdout | **yes / uncertain** | acceptance card 现在必须预先给出采用后观察窗口及 fresh-holdout 使用/刷新规则（`:50-52`）；关闭改善线须在该窗口内观察正例、边界、回归，并确认无继续可分离的有意义净收益、硬约束与证据稳定、剩余未知不再改变下一行动（`:126-130`）。这已关闭“没有窗口/刷新规则”的静态缺口，且拒绝固定轮数或全员同意。窗口内是否真的有新任务、holdout 是否保持未见、未知是否确实不改变行动，仍未被行为证明。 |

**六项结论：** 没有一项仍构成静态语义阻塞；六项的行为侧均保持 `uncertain`，不应从文字 `yes`
推导运行有效。

## 其他重点审查

| 审查项 | 判断 | 依据与评价 |
|---|---|---|
| 对象同一性 | **yes / uncertain** | 对象由任务/行为关系、目标与硬约束、baseline/candidate 主要差异、环境/效果/证据和接受拥有者共同维持；来源、owner 或预期行动变化则重新问题化，真实耦合保留为组合（`:5-19`）。这比把版本历史当对象更充分。仍缺拆分/合并邻近案例的行为探针，故不能证明真实使用时不会偷换对象。 |
| P03 实践—再认识 | **yes / uncertain** | 要求实践产生新观察、与原预测比较并改变下一判断，重复同一尝试不算迭代（`:21-24`）。这生成了可反驳的语义区分；仅静态文本不能证明下一实践确由观察改变，而非事后叙述。 |
| P15 实践检验 | **yes / uncertain** | 匹配对照、可观察结果、相称评审和多类证据被置于净改善条件中，静态格式、作者自评、单次成功和分数上涨不能直升真理（`:23-24,39-48`）。匹配、grader 公平和评审质量仍无行为证据。 |
| P01/P02/P04/P05/P06/P09/P11 | **yes / uncertain** | 修订版把实情、调查、未知、具体性、受控简化、主要缺口路由和扰动/成本分别连接到对象、来源、边界、delta、owner 与结果（`:27-37`）。`相称`、`重大`、`有意义`等仍须由对象 card 与接受关系具体化，不能作为已验证阈值。 |
| living theory 是否仍过度复制 protocol | **yes / uncertain** | 修订版主动声明 ledger 不是 exact schema，字段和存储属于 protocol；冻结、匹配、角色和记录操作也明确留给 protocol（`:107-109,122-124`）。但四类证据集合、污染清单、处置集合和 ledger 关系仍较接近流程骨架；这是维护和漂移风险，不再是当前语义阻塞。后续应让 protocol 持有字段/状态机细节，living theory 只保留跨载体成立的判断关系。 |
| P 为唯一理论生成源 | **yes** | 修订版明言哲学序列是唯一理论生成源（`:21`）；研究、archive、开源只能调查、反驳、限定或提出从 P 重生成的候选，不能写入共同权威（`:70-74`）。这与 `theory/harness/theory.md:3-5` 的“序列是唯一语义根”一致。 |
| research standing | **yes** | 文件开头把自身定位为 living theory 而非 research/protocol，并明确研究记录、archive、开源不能取得本理论或哲学序列权威（`:1-3`）。研究材料仍是来源、病例、未知和候选；审计也明确研究流程候选不是已采用 protocol（`theory/research/iteration-process-audit.md:16-22,45-47`）。 |
| archive / open-source standing | **yes** | archive、研究、开源可提供调查面、反例和失败类别，但不能替代理论接受；流行度、stars、forks、作者名气和收录不作质量或有效性证据（`theory/harness/iterative-improvement.md:70-72`）。 |
| 结构 acceptance | **yes** | 修订版把结构提议、move、canonical source 改动和 runtime 契约接受分开，要求明确干预、理由和接受者（`:91-103`）。`theory/research/theory-structure.md` 也把结构文档标为 proposal，并保留显式处置记录（`:1-5,118-134`）；research 不因此成为结构权威。 |
| 普通 skill 不回读 P/theory | **yes** | owner 表明确 skill 只消费内化的方法，普通激活不回读 P/theory（`:95-101,103-105`）；这与 `theory/gene-expression.md:78-82` 对“生成后内化、编号仅作血统/诊断/再生入口”的边界一致。任务仍可按自身需要读取事实来源，不能把该边界误解为不读任务事实。 |
| runtime/base 边界 | **yes** | 文件明确不是 harness base，不授权效果；身份、权限、并发、恢复、取消、持久证据和外部效果属于 runtime/base（`:1-3,91-101`）。这符合 `theory/harness/theory.md:24-40,42-57,84-85`：方法条件不可被强制工作流替代，必须跨提示/重启/并发存活的硬属性才进入 base。 |
| 独立验证与污染 | **yes / uncertain** | reviewer 不得生产 exact candidate、不得按 treatment 调 rubric，并可返回反对或 `uncertain`（`:70-76`）；污染条件和降级规则完整（`:87-89`）。然而审计记录已有候选可见、模型/工作区未核实的历史反例，故只能说规则完整，不能声称运行独立性成立。 |
| outcome/process/balancing 区分 | **yes / uncertain** | workflow 评估被要求把真实 outcome、process 和 balancing cost 分开，只有 outcome 改善且重大回归不增、成本不越 card 才可称净改善（`:122-124`）。研究记录仍把真实任务窗口、holdout 更新和 trial 方差列为未知（`theory/research/iterative-improvement.md:357-365`）。 |

## 仍需记录的非阻塞改进

这些不是拒绝 living semantic theory 的理由，但应在 protocol/ledger 或下一轮行为 probe 中处理：

1. **把相位适用性前移到 card。** `N/A` 理由已被要求保留，但最好明确“适用相位/不适用相位及理由”
   在 treatment 前冻结，防止结果后删减观察相位。
2. **把收敛语义变成可复核的对象规则。** 不设全局分数或轮数是正确的；但每个 acceptance card
   应说明何种观察足以支持“有意义净收益不再出现”“证据稳定”和“未知不改变下一行动”，并说明
   采用后窗口中 fresh holdout 如何刷新。
3. **组合证据输出显式包含 ablation 结论。** 无法 ablate 时保留 `combo-only`，可以 ablate 时应记录
   哪些组件被单独检验、哪些仍不能归因，不让“应做”在 protocol 中变成可省略的口头建议。
4. **保持理论与 protocol 的单向依赖。** 当前文本的边界声明已足够，但 protocol 若复制这些语义
   并自行改名，仍会重现第一轮 disposition/standing 漂移；字段、状态和执行顺序应由 protocol
   维护，理论只定义其不可破坏的含义。
5. **为污染和跨 owner 回返指定实际责任。** 理论已有 `routing history`、Principal/接受者和
   stale/恢复关系，但持久 owner、废弃哪些 artifact、何时重跑仍需 workflow 明确，不能靠 prose
   代替机制或记录。

## 重大缺陷、行为未知与静态证据上限

### 重大缺陷

本轮未发现新的、足以阻塞该文件作为 living semantic theory 的静态重大缺陷。第一轮六项重大
缺陷均有对应的语义修订；尤其是 P16 的条件相位和 `N/A`、card 的前置冻结与禁止倒写、
`combo-only`/ablation、统一互斥处置、P 的下游 stale/再生传播，以及采用后窗口/fresh holdout
规则，都已明确写入当前文件。

但“行为有效性尚未证明”是接受边界，不是一个可以由静态文字消除的缺陷。若项目要求把
living theory 的接受等同于已经产生 matched improvement，则本轮处置必须改为
`adapt-and-retest`；本报告不作这种混同。

### 静态证据可支持的最高主张

静态材料最多支持以下主张：

- 该文件形成了从 P03/P15/P16 及相关 P 条目到对象、证据、边界、接受、处置、再生和停止的
  一套可区分的语义理论；
- 研究、archive、开源、结构提议、skill 激活和 runtime/base 没有被错误提升为同一权威；
- 理论文本原则上允许低风险任务裁剪相位，限制必要组合的归因，并在上游变化后使下游 stale；
- 普通 skill 激活不需要回读 P/theory，理论也没有把行为模式伪装成 runtime 机制。

静态材料不能支持：

- 实际 card 在 treatment 前不可变，或相位 `N/A` 没有事后选择；
- baseline/treatment 真正匹配、reviewer 真正独立、grader 公平、污染被发现并正确降级；
- combo-only 以外的组件归因，或 ablation 实际完成；
- P 改变后所有受影响 theory/skill/fixture/rubric/旧结论都被 stale、再生、复评和恢复；
- fresh holdout 未被作者看见且按 card 刷新，采用后窗口没有逃逸回归；
- candidate 有 matched improvement、改善线已经收敛，或已经获得采纳/运行时效果授权。

因此，行为证据的最高当前 standing 仍是“可提出待检验的语义关系/候选”，而不是
`matched-improvement`、`converged` 或 `adopted`。

## 最终建议

**静态 semantic theory：accept。** 保留当前修订版作为 living theory 候选的可接受语义，
不再因第一轮六项问题要求立即重写。
**行为有效性：adapt-and-retest。** 按风险冻结 card，做低风险相位裁剪、必要组合及可行 ablation、
P 上游变更传播、污染恢复和采用后 fresh-holdout 窗口等 probes；由独立 reviewer 和明确接受者
决定下一步。通过这些 probes 之前，不得把静态审查、研究记录、结构记录或 `git diff --check`
报告为净改善、收敛、组件有效或 runtime 保证。

## 2026-08-24 Main 处置记录

依据用户要求建立防退化闭环理论并实施该计划，Main 接受修订后的 `theory/harness/iterative-improvement.md` 为 living semantic theory。接受范围只包括其对象、P 生成关系、owner、证据 standing、处置和再生等语义关系；不包括行为有效性、matched improvement、收敛、组件归因或 runtime 保证。

行为 standing 保持 `adapt-and-retest`。后续 skill 准入、protocol 投影和行为 probes 都是下游候选，必须保持普通 skill 使用者无需回读 P/theory，并分别取得相称证据；用户仍可在 review 后修订或撤回这项语义接受。
