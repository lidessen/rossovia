# 防退化的闭环迭代

> living theory。本文由 `theory/philosophy.md` 的哲学序列生成，说明在 Agent 任务工程中怎样通过实践与再认识取得净改善，同时使退化、污染、未知和停止都可见。它是方法与设计理论，不是评估 protocol、skill 载体或 harness base；研究记录、archive 和开源材料不能取得本理论或哲学序列的权威。

## 对象、来源与边界

这里的对象不是“多改几轮”，也不是某个文件的版本历史，而是一个有边界的**改善关系**：在指定任务、来源、环境和效果边界中，从可复现的 baseline 产生 candidate，判断 candidate 是否改善目标关系，同时保持预先声明的硬约束，并留下可重建的证据。

对象同一性由以下关系维持：

```text
同一个任务/行为关系
  × 目标改变与硬约束
  × baseline 与 candidate 的主要差异
  × 环境、效果边界与证据
  × 可接受的拥有者
```

“改善”若脱离这些关系，只是名称。一次变更可以改善 artifact，也可以改善产生和判断变更的 workflow；后者是二阶对象，不能把流程记录更多误报成任务结果更好。对象、来源状态、拥有者或预期行动一旦变化，应先重新问题化，不能沿用旧轮次的结论。若一项改变使约束、效果或接受关系可独立分离，应拆成多个对象；若拆分会丢失真实耦合，则保留合并对象并明确其组合边界，不能靠文件边界或名称决定同一性。

哲学序列是唯一理论生成源。本理论的主冲撞是：

- **P03「实践、认识、再实践、再认识」**把迭代规定为认识与行动的往复。实践不是执行完一遍后的装饰性验证：它产生新观察；再认识要把观察与原预测比较，修正对象模型、边界或假设；下一次实践必须由这项新认识决定。重复同一尝试不构成迭代，只有改变下一判断的观察才构成。
- **P15「实践是检验真理的唯一标准」**规定检验手段。漂亮的理论、静态格式、作者自评、单次成功、分数上涨或路径存在都只能是线索；关于是否改善的主张，必须回到有匹配对照、可观察结果和相称评审的实践。P15 不授权把任何一次实践结果直接升级为真理。
- **P16「慎终如始，则无败事」**规定检验的全程时点，但不规定每个对象都走完整仪式。开始、改变前、执行中、结束和采用后这些相位，按对象的风险、效果边界、方差和接受关系决定是否出现；出现时要检查相应的对象、来源、配置、污染、越界、结果、成本和未知。低风险、局部、可逆的对象可以把不适用的相位记为 `N/A` 并说明理由，不因此强行补齐完整 holdout、长期观察或 ledger。只在末端看结果，会把起点漂移和过程污染藏成“成功”。

这些主条目在环境中与其他条目发生实际冲撞，而非装饰性列号：

- **P01「实事求是」**要求从实际任务、实际缺口和实际结果出发，反对把“想改什么”当成“发生了什么”。它与 P03 的冲撞产生 baseline—观察—再建模的对象闭环。
- **P02「没有调查，没有发言权」**要求每个预测和结论有相称调查。它与 P15 的冲撞规定实践前要收集来源、覆盖和对照，且可并行调查的证据面不得直接写入共同权威。
- **P04「知之为知之，不知为不知」**把未知变成合法结果。样本不足、来源身份不明、grader 不公平、模型或 harness 未冻结时，不能用自信措辞补齐因果；最多返回 `uncertain` 或降级的证据主张。
- **P05「具体问题具体分析」**要求 delta、fixture、成本和 owner 随任务、环境、效果后果而定；没有固定轮数、Agent 数、文件数或统一门槛能替代这种判断。
- **P06「为学日益，为道日损」**要求删去不改变判断的复杂性，却不能删掉来源、边界、未知、回退和接受这些承重关系。controlled delta 是简化因果，不是追求最短文本或最少记录。
- **P09「抓住主要矛盾」**要求识别本轮真正要解决的主要缺口，并将发现路由到最接近 owner；不能因某个问题写得最长、出现得最近或被多个相关 Agent 重复就升级为理论。
- **P11「治大国若烹小鲜」**约束扰动与协调成本。局部、可逆、隔离的改变通常更能保留归因，但风险、方差和依赖也可能要求必要组合或逐步扩大；不能把“小”变成永恒仪式。

因此，本理论不是把 P03、P15、P16 拼成一个固定流程，而是把它们与 P01、P02、P04、P05、P06、P09、P11 的张力落实为可回到对象、证据、边界、成本和时点的判断。

## Principal correction 作为来源有界的改进输入

Principal 的修正不是任意反馈 token，也不是每条新话都自动要求改理论。对一个已经
存在的任务、目标、约束、预期行为、standing 或接受关系，Principal source 指出
实际表达、观察结果或下游解释与该关系发生偏差时，才形成 correction candidate。它
必须保留 raw、来源与 authority、指向的对象和 revision；语气、频率或 Agent 自报
不能单独取得 Principal 身份。

同一消息可以同时包含多种关系，下面只是可修订的解释区分，不是固定字段、封闭
分类器或一次性决定：

| 解释 | 当前改变的关系 | 不应直接推出 |
|---|---|---|
| correction | 已接受的目标、约束、预期行为或下游解释与实际不符 | 自动修改 theory、skill、runtime 或接受结果 |
| 新需求 | 改变目的、范围、受众、约束或成功条件；旧基线即使正确也仍可提出 | 把旧结果追溯为错误 |
| 偏好 | 任务关系基本不变，只改变风格、排序、取舍或成本权重 | 升格为全局规范、硬约束或新目标 |
| 噪声/unknown | 权限、上下文、对象、复现或事实不足，或输入互相冲突 | 静默丢弃或伪装成已判定 |

分类是 secretary/reviewer 的可修订解释；Principal/authority 仍由真实 source、
委派关系和目标 owner 决定。没有足够 authority/evidence 时，可以保留 unknown 或
hold；不应为了闭环数量把新需求、偏好或噪声强行归为 correction。

对已接受的 correction，最小可重建关系是：

```text
raw correction
  → assumption delta
  → 最小 owner
  → stale impact
  → re-evaluation
  → accepted disposition
```

这里的 `assumption delta` 是对当前对象、约束、证据或接受关系的具体改变；`stale
impact` 只列出有证据支持受影响的边，不把所有下游自动标 stale。review 可以提出
解释、影响分析和处置建议，但不能代替 Principal 的 acceptance。合法处置包括接受
为 correction、改判为新需求或偏好、拒绝、hold/unknown；接受 correction 也不等于
默认修订 theory。

freeze 前，若 correction 改变对象、目标、约束或 acceptance card，应重新问题化并
重建相称的 baseline/card；不能在旧假设下继续把 candidate 当作同一轮。freeze 后不
倒写 card、run、review 或 ledger；应追加 correction/stale/uncertain 与恢复关系，
并在需要时开启新 round。历史 artifact 保留原 standing，直到新 round 的 review 和
Principal acceptance 建立新的有效关系。

## 净改善不是一个总分

候选只有在以下关系同时成立时，才可提出净改善主张：

1. 预先声明的目标行为、缺陷或能力在相称的正例和匹配对照中改善，且差异可归因于本轮主要改变；
2. 相关硬约束、来源保真、效果边界和已接受的能力没有重大退化；
3. 边界误触发、回归、污染、未知和 balancing cost 均在 treatment 前由接受关系认可的范围内，或其 tradeoff 已由接受拥有者明确承担；
4. 证据足以让拥有者重建“改了什么、为何认为有效、何处不适用、仍不知道什么”。

结果应是带硬约束的向量，而不是事后加权的总分：目标 outcome、边界/回归、证据质量、时间与 token、协调等待、维护和外部效果分别记录。各维度没有共同单位时，不得在结果出现后临时调权。目标分数上涨而边界大量误触发，或记录完整率上涨而缺陷逃逸不变，都是 tradeoff 或 process improvement，不是自动的净改善。

## 一个可失败的改变

每轮只在有可观察差距时提出 `change hypothesis`。在 treatment 前，它还必须冻结一张面向当前对象的 `acceptance card`：接受者（Principal 或明确受托者）、硬约束、重大退化的定义、目标/边界/回归的最小证据、成本预算、必要组合的判断规则、采用后的观察窗口，以及 fresh holdout 的使用与刷新规则。它们是该对象的判断关系，不是全局轮数或统一阈值；结果出现后不能为通过而改写。若必须改变其中任何一项，应开启新的 round，或把当前 round 置为 `uncertain`，不得倒写旧结论。

change hypothesis 至少说明：

- 当前 baseline 是什么，为什么称为在该上下文中的 `known-good`；它不是普遍正确，只是已有证据支持、可复现且可回到的比较点；
- 缺口的观察、来源 standing、覆盖范围、最近 owner 和仍未知；
- 一个主要的 semantic delta，以及它将在哪些正例、边界例和回归例产生什么可观察预测；
- 什么观察会反驳假设、触发 rollback、降低证据等级或使本轮 `uncertain`；
- 必须保持的硬约束、污染条件、成本边界和接受关系，以及 acceptance card 如何解释反驳、未知和回退。

没有可判别预测、没有可信 baseline、差距只来自措辞偏好，或改变成本明显高于问题后果时，合法结果是 `no-proposal` 或 `retain-baseline`，而不是为了显示迭代而改文件。

### Controlled delta 与必要组合

controlled delta 指主要因果差异可指认，不等于“一轮只能改一行”。多个文件可共同表达一个语义改变，但须在假设中写明共同关系和不可拆分的理由。必要组合不能自动取得更高的证据 standing：若无法拆开，结果只能是该指定范围内的 `combo-only` standing，只支持这个组合成立，不归因于 theory、skill、fixture、rubric 或 workflow 中的任何单一组件；能做局部 ablation 时应做，以便缩小归因。组合结果不能替代组件各自按依赖再生和复评。

开始前保留 baseline 的 artifact、来源、任务、配置、模型、harness、fixture、grader、holdout 状态及回退锚点；候选单独保存，不能在退化版本上继续叠加补丁。先局部暴露、再按风险和方差扩大，不把局部通过误称为全局成立。

## 证据的并行、顺序与独立性

并行只适用于真实可分的 evidence lanes：例如互不依赖的一手来源调查、历史/archive 病例、已有运行失败和开源实现。各 lane 返回来源地位、覆盖、冲突、反例和未知，不直接修改共同权威；archive、研究和开源做检验、反驳、限定或提出从 P 重生成的候选，不能直接写入哲学序列或替代理论接受。开源项目的 stars、forks、收录、作者名气或其他流行度不能作质量、有效性或接受证据；最多提供待探针的候选和失败类别。

顺序来自真实依赖：先恢复共同对象和冲突，再综合 change hypothesis；依赖上游理论的 skill 生成要在理论接受后进行；修改后再做独立验证与接受判断。并行贡献不能靠拼接摘要或多数投票取得整体结论，Main 或指定的整体拥有者必须重连跨 lane 的不变量、缺口和证据。

独立验证要求 reviewer 未参与 exact candidate 的生产、未依据 treatment 调整 rubric、具有冻结的来源与 manifest，并可返回反对、`uncertain` 或“评估本身有缺陷”。换一个 Agent、换一个窗口或出现一致票数都不自动产生独立性。作者可自检和运行机械检查，但生产证据不等于独立正确性；接受仍属于 Principal 或明确受托的接受拥有者。

### 证据集合

- **positive：** 目标行为应发生的代表性任务，检查能力或缺陷修复；
- **boundary / nearest-owner：** 行为不应发生，或应转给相邻 owner，检查过度激活和越权；
- **regression：** 已由较强证据支持、相关改变后仍须保留的既有行为；
- **holdout：** 作者和改写者未见的代表性任务，只用于独立泛化判断。被反复用于调参的集合降为 development evidence，不能继续冒充 holdout。

四类集合回答不同问题，不能互相替代。每次报告同时保留重大缺陷、边界误触发、回归、`uncertain`、grader 分歧、运行方差和 balancing cost，而不只报 pass rate。

### 污染与证据降级

以下任一情况会破坏 matched improvement 的归因：baseline/treatment 的模型、来源 hash、任务、harness、权限或工作区不一致；control 共享了 treatment 改过的 mutable 组件；作者、reviewer 或 runner 互相暴露了本应隔离的候选；fixture/rubric 在看见结果后改写；holdout 被消耗；输出或终态无法重建。此时只能报告已观察到的行为或 `uncertain`，先修 workflow/fixture/config 并重跑，不能把污染解释成负面或正面效果。

## Owner 路由与再生

同一观察可能跨层，但先把主要缺口送到最小 owner：

| 主要缺口 | 优先 owner | 边界 |
|---|---|---|
| 跨环境反复出现、改变对象/因果/边界，现有解释矛盾 | `theory` | 以 P 为唯一源提出重生成候选；不因一次措辞失败改理论 |
| theory 足够，方法未内化、漏判或过度触发 | `skill` | 改方法/载体；普通激活不回读 P/theory |
| 重要正例、边界、最近 owner 或已修缺陷未被任务覆盖 | `fixture` | 修任务与公平 rubric；不迁就 treatment 隐藏答案 |
| baseline/treatment 不匹配、角色污染、记录或 grader 无法重建、holdout 失效 | `workflow` | 修 manifest、隔离、记录、评审关系并重跑 |
| 身份、权限、并发、恢复、取消、持久证据或外部效果在提示之外必须成立 | `runtime/base` | 交给真实机制；文字不能创造硬保证 |
| Principal correction 改变当前对象、任务、约束、standing 或 form | 先交给被指向对象的最小 owner，再按 delta 路由到 `theory` / `skill` / `fixture` / `workflow` / `runtime/base` | 不因 correction 名称自动改理论、全局标 stale 或代替 acceptance |

结构提议可以从反复的 owner 关系中自然出现，例如提出一个新的 theory 文件或目录；提议不等于接受。接受、move 到 living tree、改 canonical source 或把结果变成运行时契约，必须由明确干预、明确理由和明确接受者完成，不能由 review、分数、载体文本或自动脚本隐式授权。

上游变化会使下游结论失效。哲学序列中的 P 变化，沿 `P → theory → skill / fixture / rubric / 旧结论` 的血统传播：先标记受影响的 theory，再标记其生成或依赖的 skill、fixture、rubric 和旧结论为 stale，保存影响范围但不把它们当作当前有效依据；随后按新上游重新生成候选、独立 review、运行相称的正例/边界/回归与 fresh holdout，并由接受者显式恢复有效。被接受的 Principal correction 也可能改变 task/object、constraint、standing 或 form，沿实际可证明的依赖边传播到相应 skill、fixture、rubric、protocol projection、eval record 或旧结论；只标受影响的边，不因一条意见全局 stale。theory 的对象、边界或推导关系变化遵循同一传播；fixture、workflow 或 grader 变化若影响可比性，旧结果保留但不再支持原证据等级，须在修复后重跑。任何再生、移动或结构改变都只是候选，不自动改变 canonical source、载体或接受关系。普通 skill 使用者只消费已内化的方法，不承担回读哲学序列或理论的运行时义务。

### Live correction 与 safe point

如果 Principal correction 在 worker/subagent 已依据旧 baseline、assumption 或 source
revision 工作时到达，方法只能要求在下一合理 safe point 重新基线化、保留旧锚点或
回返最小 owner，并把 correction 的 stale/re-evaluation 关系带入后续判断。safe point
不是自动停止或取消；在没有运行机会时只能报告未处理/未复查，不能声称已完成 correction。
取消、持久化、并发 claim、恢复、事务和外部副作用仍由 runtime/base 负责，理论文字
不能创造这些保证。

## 追加式 evidence ledger

ledger 是风险裁剪的语义关系记录，不是 living theory 规定的 exact schema，也不是把当前结论倒写进旧轮次；具体字段和存储属于 protocol。它应足以重建对象、来源 standing、baseline 与 delta、预测和反驳、相位是否出现及 `N/A` 理由、观察与证据边界、污染与未知、成本、`routing history`、Principal/接受者、处置和后继血统。低风险对象可以记录较少关系，但不能省掉作出该裁剪的理由；组合证据要标出 `combo-only`。追加记录保留被 supersede 的 artifact 与旧结论，不能用新结果覆盖历史。

每个 round 的处置只能从以下互斥集合中选择：

- `adopt`：满足冻结的 acceptance card，目标关系改善且没有重大退化，接受者明确采纳；
- `adapt-and-retest`：方向或缺口仍有依据，但当前 delta、载体或证据有可分离缺陷，调整后须开新 round；
- `retain-baseline`：已评估 candidate 但不采纳，baseline 因风险、退化或 tradeoff 更合适；
- `no-proposal`：treatment 前没有足以提出候选的可观察收益，或预期改变只会增加复杂度；
- `rollback`：candidate 或已采纳改变已经产生不可接受退化，回到已知锚点并保留退化证据；
- `uncertain`：污染、归因、最小证据或接受关系尚未成立，不能作出上述决定。

`retain-baseline` 是评估后的保守选择，`no-proposal` 是尚未提出 treatment 的停止；`rollback` 是已经施加改变后的恢复动作，不能用来替代普通拒绝。它们是证据处置，不是 runtime 状态，也不是必须按顺序经历的门。

## 流程本身也必须被检验

“更严格”“记录更多”“用了更多 Agent”是 process 观察，不是 outcome 改善。workflow 本身若成为改善对象，也必须区分真实 outcome（缺陷发现、误报、采用后逃逸、净改善和最终质量）、process（可重建性、独立性和污染识别）与 balancing cost（时间、token、协调、等待、分歧和维护）。对 correction 闭环，还可按对象和观察窗口记录 correction escape、recurrence/reopen、route/re-evaluation latency、stale coverage 以及误分类/负担；它们不能合成一个全局分数，也不能用“记录更多”替代 outcome。比较应恢复可比的 baseline、任务和接受关系，并由相称的独立判断重连这些差异；具体冻结、匹配、角色和记录操作属于 protocol，不在本理论规定。只有 outcome 改善、重大回归不增加且成本未越过 acceptance card，才可声称 workflow 带来净改善；仅 process 变好就称 process improvement，tradeoff 无法接受则保留 `uncertain`。

## 收敛、停止与未知

收敛不是“轮数达到 N”、Agent 数达到某值或所有人同意。对当前对象，必须回到 treatment 前冻结的 acceptance card：在其中规定的采用后观察窗口内，按其中的 fresh holdout 规则（包括明确的 `N/A` 理由）观察代表性正例、边界和回归；只有继续可分离的 delta 已不再产生有意义的净收益，硬约束与证据关系稳定，剩余未知已被明确承担或不再改变下一行动时，才可关闭该改善线。观察窗口和 fresh holdout 规则随对象和风险而定，不设全局轮数或阈值。停止也可以因为 `no-proposal`、成本超过收益、问题已由其他 owner 覆盖，或风险要求保守保留 baseline。

若仍缺少能区分候选的来源、匹配配置、独立评审或足够样本，应停止产生新改动并返回 `uncertain`，而不是把“不知道”升级成失败或成功。未知未被解决时，闭环可以暂停；它不能由文件完成、仪式结束或时间耗尽自动消失。

## 修订纪律与 falsification probes

修订本理论，必须有证据改变了对象同一性、某个哲学冲撞的解释区分或 owner/证据推导关系。供应商怪癖、一次提示失败、单个 fixture、开源 star、archive 年代、篇幅、格式或 reviewer 喜好，先归 skill、fixture、workflow/config 或 runtime；理论变化后再按上游失效规则再生下游。理论文字不会授权新机制、效果或人类接受。

以下探针可证伪本理论的当前表达；它们是待检验的行为问题，不是固定 protocol：

1. 给出笼统的“表达不够好”反馈，若方法无法先恢复 baseline、差距、owner 和可失败预测，而直接重写，说明 P01/P02/P09 的闭环边界未成立。
2. 给 treatment 正例改善但 boundary 全部过度触发，若仍 `adopt`，说明净改善和 P04/P05 的未知边界失效。
3. 让作者反复看同一 fixture 后 treatment 通过而 holdout 无改善，若仍声称泛化，说明 holdout 与 P15 的实践检验被污染。
4. 令 baseline 与 treatment 的来源 hash、模型或工作区不同，若系统仍给出 matched improvement，说明 P16 的全程时点和污染降级失效。
5. 同一轮同时改 theory、skill 和 rubric，若无法拆分主要 delta 或按依赖顺序再生，说明 controlled delta 与 owner 路由不足。
6. 让 reviewer 参与候选生产或 rubric 调整，若其意见仍被称为独立验证，说明独立性边界只是角色名。
7. 观察 workflow 记录更多但缺陷 recall、逃逸和采用质量不变，若仍称 workflow 净改善，说明 outcome/process/balancing 区分失效。
8. 让一个新发现只出现在单一环境且成本高于后果，若它自动生成理论、结构或 runtime，说明 P05、P06、P11 与显式接受边界失效。
9. 让理论上游发生实质变化，若旧 skill 继续被当作有效而不重生成、review 和回归，说明血统和再认识没有闭合。
10. 在提示被忽略、并发写入、重启或外部调用后观察硬保证消失，若仍要求 skill 文字负责，说明方法表达与 runtime/base 的所有权混淆。
11. 让一个候选同时影响两个可独立接受的任务，若不能拆分对象、分别冻结 acceptance card 并分别处置，说明对象同一性和主要 owner 不成立；反过来让真实耦合的两个任务被强行拆开，若组合不变量丢失，说明拆分边界失效。
12. 对低风险、局部、可逆改变裁剪一个 P16 相位，若仍要求无条件补齐完整 holdout、长期观察或 ledger，说明条件性时点和 `N/A` 理由被仪式化；若不记录裁剪理由就声称通过，说明 P16 也失效。
13. 改变哲学序列中的一个上游 P，若受影响 theory、skill、fixture、rubric 和旧结论没有依次 stale、提出再生候选、复评并显式接受，说明上游传播没有闭合。
14. 注入模型、来源、工作区或角色可见性的污染，随后修复隔离并重跑，若仍把受污染结果当作 matched improvement，或没有保留污染与恢复血统，说明污染降级与恢复关系失效。
15. 给出一批按语义转折拆分的 raw correction，若不能重建原话、顺序、来源和上下文，或把物理整段当作唯一 fidelity 条件，说明 raw/source 的对象边界失效；再检查受影响 candidate、fixture 和旧结论是否只按可证明依赖 stale 并重评。
16. 对同一输入分别给出“想试 A”和“实际跑 A 的观察”，若 experiment candidate 冒充 Run/Cell observation、effect、failure、evidence 或 acceptance，说明 candidate 与 record 的 owner/standing 边界失效；再检查相关 baseline、card、review 和下游记录是否重新评估。
17. 改变评估记录的 canonical form/路径 standing，若历史 artifact 被倒写、旧引用继续作为当前依据，或新 owner/新 round 未经接受就生效，说明 form/structure 的 correction 没有触发 stale、re-evaluation 和 accepted disposition；该探针不预设具体目录。
18. 在 correction 已形成 accepted disposition、受影响对象已采用新 baseline 或生成新的下游 artifact 后，于该对象按风险确定的观察窗口或下一次真实暴露机会，重放语义等价的修正或观察同一根因；若不能区分 correction escape、recurrence/reopen 与新需求、偏好、噪声/unknown，或没有按实际暴露集合报告观察范围、复发与未复查，说明闭环只验证了即时修补。没有采用后运行或暴露机会时，结论只能是“未复查/unknown”，不能把零观察当作零复发。

本文件提出的是可检验的语义关系与失败条件；静态文本、研究记录或机械检查本身不证明行为已经成立、candidate 已改善、已经收敛或已被接受。
