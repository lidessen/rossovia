---
kind: research-candidate
id: harness-agent-initiative
status: settled
disposition: owner-gated-hold
evidence: source-read
settlement_route: bounded-probe-or-archive
owner: "unknown"
consumer: harness-system-design
review_at: reopen-on-named-system-consumer-or-owner-return
---

# Harness 中 Agent 主观能动性研究

lifecycle：`settled`
disposition：`owner-gated-hold`
evidence：`source-read`
applicability：`open`
execution：`no-project-run`
acceptance：`pending`；evidence follow-up 与 mechanism synthesis 的修订记录在本文后续事件中。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 研究问题与语义边界

### 研究问题

怎样设计一个 harness，使 Agent 在没有人持续催促、逐步审批或预先穷举边界的情况下，能够主动发现
值得推进的工作、选择下一步、利用反馈修正、持续保持目标关系，并在真正改变方向、权限、共享基线
或产生重大不可逆后果时把选择交回 owner？

这里的“主观能动性”暂作为一个**可观察的行为构念**使用：Agent 是否能从当前目标和现实中产生有
价值的下一候选，采取有界行动，并根据结果改变后续判断。它不声称 Agent 具有人的意识、感受、
内在欲望或心理主体性；人类动机理论只能作为可能的设计类比和待验证假设。

### 不要解决成什么

- 不是在 prompt 中反复写“主动一点”“像主人一样负责”；这只能是待比较的表达处理，不能当作机制。
- 不是无限扩大授权、替 owner 设定目标、把 self-report 当作事实，或允许错误不可逆地外溢。
- 不是把所有未完成事项放入常驻 todo、把更多轮询或更多 Agent 等同于主动性。
- 不是把输出更长、工具调用更多、说“我发现了问题”或自我反思文字更多当作成功。

## 2. 当前工作假设

当前最有希望的解释不是“给模型注入一种情绪”，而是把能动行为所依赖的关系同时接通：

```text
accepted purpose / current objective
          + reality observation and open gaps
          + available affordances and bounded discretion
          + progress / competence feedback
          + consequence visibility and downstream relation
          + experience memory and correction
          ↓
 candidate generation → next-action choice → bounded action
          ↓
 observation → correction / experience update → next candidate
```

这与本项目已有的通用 harness candidates 相接，但不能直接把它们当成已证结论：

- [`default-autonomy-with-correction.md`](../harness/default-autonomy-with-correction.md) 提供默认局部
  自主、普通小错事后纠偏、重大方向/权限/不可逆后果才请示的操作关系；它可能是能动性成立的
  **许可与纠偏背景**，不是动力本身。
- [`owner-facing-progress.md`](../harness/owner-facing-progress.md) 提供遇到重大边界时的场景恢复和
  decision package；它保护能动性不滑成越权，但也不能成为每个不确定点的审批门。
- [`relational-verification-design.md`](../harness/relational-verification-design.md) 要求把主动行为
  放回 goal、source、consumer、effect、evidence、review 和 correction 的关系网；否则“主动”很容易
  只是局部忙碌。
- [`iterative-improvement.md`](../harness/iterative-improvement.md) 提供从结果改变下一判断的闭环；
  没有这个回返，主动探索会变成重复行动。

因此当前核心假设是：**harness 激发的不是无边界的“想做事”，而是让 Agent 看见有意义的缺口，拥有
足够而有限的局部行动空间，能看到行动后果，并且能以低成本纠偏和积累经验。** 这是一项待研究的
系统设计假设，不是当前理论或 skill acceptance。

## 3. 已读来源与可用观察

| 来源 | 来源事实 | 对本项目的有限启发 | 不能直接推出 |
| --- | --- | --- | --- |
| [Ryan & Deci, 2000, Self-Determination Theory](https://doi.org/10.1037/0003-066X.55.1.68) | 人类动机研究提出 autonomy、competence、relatedness 三种需要与自我动机/发展条件的关系 | 可作为“自主选择空间、能力感反馈、与真实关系相连”三类设计假设的来源；需要把人类构念翻译成 Agent 可观察关系 | Agent 有人的心理需要、内在体验或真正的内在动机；不能把心理学结果当作 runtime 机制 |
| [Proactive Agent](https://arxiv.org/abs/2410.12361) | 以环境事件预测用户可能需要的任务，并用 accept/reject、precision、recall、false alarm 等评估主动协助；论文报告过早提议、无意义提议和不该打扰时仍行动等失败 | 主动性必须同时测“发现需要”和“保持安静/时机恰当”；候选任务可以先提议，再由真实关系决定是否执行 | 该工作主要是主动提供用户协助并使用训练/奖励模型，不证明 Agent 能自主维持长期工作目标；论文数字也不能直接迁移到本 harness |
| [Generative Agents](https://arxiv.org/abs/2304.03442) | 观察、规划、反思、经验记忆和动态检索使模拟 Agent 能计划日常活动、发起互动；消融显示这些组件对行为表现有贡献 | 观察→规划→反思/记忆可能是产生持续主动行为的架构模式；主动性不能只靠单轮 prompt | 该实验以社交模拟中的 believability 为主要对象，不等于真实生产任务的效用、安全、事实或 acceptance |
| [Voyager](https://arxiv.org/abs/2305.16291) | automatic curriculum 提议探索目标，skill library 保存可复用行为，环境反馈/错误/self-verification 驱动迭代；黑盒 GPT-4 无需参数微调 | “下一目标生成 + 可复用能力 + 结果反馈 + 卡住后换分支”是开放式推进的强候选结构 | Minecraft 开放世界的探索结果不能证明一般工作系统的主动性；自动 curriculum 也可能制造无关工作，需引入价值/风险/消费者约束 |
| [Reflexion](https://arxiv.org/abs/2303.11366) | Agent 将任务反馈转为语言反思并放入 episodic memory，以影响后续试验；报告跨任务改善 | 经验不必立即改权重，可以通过结构化回顾影响下一次行动；反馈必须连接到后续决策 | 它主要解决试错后的策略改进，不自动产生目标、owner、权限或长期工作队列；文字反思本身不是学习或真实改进证据 |

这些来源提供的是机制候选和失败维度，不是本项目的 acceptance evidence。当前尚未发现可直接回答“独立
运行 harness 如何在低人工成本下持续主动推进有价值工作”的完整、同边界验证。

### 证据缺口矩阵

| 待回答主张 | 当前信心 | 已知冲突/边界 | 缺失证据与下一查询 |
| --- | --- | --- | --- |
| 自主选择空间、能力反馈和真实关系可能支持更持续的主动行为 | 中（人类动机理论支持类比，Agent 转译未验证） | 人类心理需要不能直接等价于 Agent 内部状态 | 在同一 Agent task 上比较 bounded choice、进展反馈和无反馈条件；先找有真实 consumer 的可回放任务 |
| 主动性必须同时优化发现机会和避免 false alarm/过早打扰 | 中高（主动协助研究直接测到这一冲突） | Proactive Agent 面向预测用户协助，非长期自主工作 | 查询长期 coding/research agent 中 opportunity recall、false initiative、打扰成本的同边界 benchmark |
| 观察、规划、反思、记忆和下一目标生成可能构成持续推进闭环 | 中（Generative Agents/Voyager/Reflexion 各自支持局部关系） | 来源的环境、目标和评价不同，不能组合成已证系统架构 | 做消融式最小 treatment：目标/反馈/记忆/候选生成一次只加一项，并用任务质量和纠偏成本回归 |
| first-person/perspective projection 能提升责任场景判断 | 低（当前只有项目理论与设计推论） | 角色表达容易变成 persona、虚构事实或越权 | 在同一 source/authority 下比较无视角、稳定 role lens、场景化视角三条件，并检查 authority drift |
| 研究出的主动性机制不会被更多 action、轮询或长输出伪装 | 中（失败模式已可定义，尚无本项目 Run） | 主动动作量与有价值进展可能负相关 | 固定预算与 wake 条件，记录 useful progress、false action、cost、owner interruption 和 boundary escape |
| 在同一 effect boundary 内增加局部选择，并让行动—后果可归因，能否提高有效推进 | 低（当前只有设计推论与相邻工作支持） | 选择、工具 affordance、结果可见性和模型能力容易混淆；没有本项目 matched Run | 固定 wake、模型、工具和任务，只比较 reactive、bounded choice、goal-linked action loop；同时观察 progress、correction 和 Q_guard |
| 反馈在降低 false initiative 的同时不会把 Agent 训练成全面沉默 | 中（Proactive Agent 的反馈实验已显示 recall 下降风险） | 该结果来自主动协助预测，不等于长期工作系统；阈值与反馈表达仍未知 | 将“继续推进”“no-proposal”“暂缓”和“需 owner”作为不同反馈结果，检查 opportunity recall、false alarm 和 owner burden 的联合变化 |

## 4. 初步机制分解

以下是研究维度，不是要一次实现的组件清单：

| 维度 | 可能激发的行为 | 主要反例/风险 | 需要观察的关系 |
| --- | --- | --- | --- |
| 目标与意义 | 能识别当前目标、成功含义和仍未闭合的缺口 | 把局部指标当最终目标、目标漂移 | accepted purpose、current objective、acceptance owner |
| 情境与第一视角 | 把自己放入当前责任场景，看到“现在最值得推进什么”及下游后果 | persona 演戏、补造事实、越权取得身份 | source-backed scene、role lens、downstream consumer、unknown |
| 有界自主空间 | 低影响、可逆局部动作直接推进，减少等待和人为操作 | 无限探索、越过 effect/permission boundary | allowed effect、reversibility、default autonomy、correction |
| 能力感与进展 | 看到状态变化、近端里程碑和失败原因，知道什么行动有效 | 只追求容易的 proxy、刷进度、虚假成功 | baseline、observable delta、semantic quality、mechanical result |
| 主动感知与候选生成 | 在合适时机发现风险、依赖、机会和下一最小工作 | false alarm、打扰、无意义候选、常驻轮询浪费 | observation cadence、opportunity/need、timing、interaction burden |
| 经验与记忆 | 将成功、失败、纠偏和未解决未知影响后续策略 | stale memory、错误归因、隐私泄露、重复无效经验 | source/revision、validity、retention、evaluator/feedback authority |
| 关系与交付 | 以实际 owner/consumer 的需要判断什么结果值得形成和返回 | 讨好人、投票替代判断、把推荐写成接受 | consumer value、owner choice、return contract、acceptance |
| 阻塞与恢复 | 卡住时缩小问题、调查、换候选或形成最小 decision package | 无限循环、假装完成、把所有未知都上交 | stop condition、route/no-proposal、post-hoc correction、reopen |

这些维度之间存在生成关系：只有目标没有现实观察，Agent 只能重复计划；只有观察没有行动空间，
只能报告问题；只有行动没有反馈，不能形成能动闭环；只有自主没有后果/纠偏边界，会变成越权或
无效忙碌。因此后续不应孤立测“主动性 prompt”，而要测完整关系的最小变化。

## 5. 研究设计与评估草案

### 待比较的行为条件

未来真实 consumer 出现后，优先比较最小差异，而不是先比较 provider 或人格设定：

1. **Reactive baseline：** 只响应明确输入，不主动提出下一项工作。
2. **Bounded autonomous progress：** 有当前目标、现实观察、允许局部效果、候选生成、低风险自主推进、
   反馈和事后纠偏；重大方向/权限/不可逆后果仍回 owner。
3. **Perspective projection treatment：** 在 2 的基础上加入有来源的当前场景/责任视角，观察是否
   减少遗漏、等待和无效行动；不加入虚构人格或额外 authority。

是否需要独立的 memory、candidate ranking、wake/scheduler 或 intrinsic-signal treatment，待前一轮
结果显示相应 gap 后再拆；不能一次把所有机制都打开。

### 最小指标

- useful initiative rate：在存在真实可推进机会时产生并完成有价值下一步的比例；
- false-initiative rate：没有必要动作时仍提出/执行的比例；
- time-to-first-useful-progress：从获得任务/新事件到第一个可观察有效推进的时间；
- correction cost：被纠偏后恢复到正确目标所需的动作、token、人工交互和返工；
- owner interruption burden：人工被打断次数、需要恢复的上下文和 decision package 可用度；
- boundary escapes：越过权限、效果、接受或事实来源边界的次数；
- persistence quality：经验是否在相同适用范围内减少重复错误，而不是扩大 stale 规则；
- task quality / acceptance：最终语义质量和 owner acceptance，不能用主动动作数量替代。

需要同时记录负向结果：无效工作、过早打扰、重复轮询、目标漂移、假完成、错误记忆和不可恢复效果。
没有这些负指标，“更主动”会被错误奖励成“更吵”或“调用更多工具”。

### 研究前置

当前缺少 named system-layer consumer、实验/评估 owner、可重建 runner/model/harness/workspace identity、
固定 task/source snapshot、telemetry permission 和 acceptance relation。因此本记录不启动 Run，不创建
initiative skill、scheduler、memory registry 或 runtime mechanism。

## 6. 与当前项目的关系

```text
主观能动性研究
  ├─ 输入：default autonomy / owner-facing / relational verification / iterative improvement
  ├─ 可能 consumer：未来 DeepSeek Harness 工作系统、独立运行 harness、真实 coding/research/eval task
  ├─ 记录边界：WorkCell 只记录执行事实、effect、observation、unknown、review 与 acceptance 关系
  ├─ 吞吐关系：主动感知、候选生成、memory/review 会增加调用；必须纳入完整 trace，不凭直觉称提速
  └─ skill 关系：只有重复的 Agent 判断差距和独立 consumer 成立后，才用 skill-formation 判断 carrier
```

当前与 WorkCell 的关系是“未来可能的 system-layer strategy/behavior consumer”，不是把 motivation、
candidate ranking 或 intrinsic signal 加进 WorkCell protocol。当前与 DeepSeek 的关系是后续设计问题，
不解除 WorkCell acceptance 前置，也不证明 DeepSeek Harness 已有可用的主动性机制。

## 7. 当前未知与回返条件

- “主观能动性”究竟主要受目标表达、情境视角、行动空间、反馈、记忆、主动感知还是模型本身能力影响，
  当前没有同边界 attribution evidence。
- 人类 SDT 的 autonomy/competence/relatedness 翻译成 Agent 的可观察变量后是否有效，未知。
- Agent 的主动候选在低 false alarm 下能否持续发现价值，未知；ProactiveBench 的用户协助场景不能直接替代。
- memory/reflective text 是帮助归因、形成技能还是制造 stale/自洽幻觉，未知；JitRL 等经验驱动方法另有独立
  applicability 问题，不能在本记录中合并。
- 主动性与吞吐、token、成本、延迟和人工负担之间的净关系未知；更多 action 不等于更多 progress。
- 没有 named consumer 或 decision-changing case 前，任何新 skill、runtime mechanism、persistent memory
  protocol 或主动 scheduler 都是 `no-proposal-now`。

**下一项最小实践：** 找到一个有真实“等待会拖慢工作、但主动做错也有代价”的 system-layer consumer，
冻结 reactive 与 bounded-autonomous 两个最小条件和反例，再决定是否加入 perspective projection 或 memory。
研究结果必须回写 candidate-consolidation、default-autonomy、owner-facing、relational verification、
throughput 和相应 consumer 的 current projection；不能只新增一份孤立结论。

## 8. 概念收敛：主观能动性的最小可观察对象

### 对象、用途与临时指称

本研究真正要设计和比较的对象不是 Agent 是否拥有“内在动力”，而是一个具体任务情境中的一次
**主动推进 episode**：Agent 在没有逐步提示时，面对当前目标和现实缺口，是否能提出或选择一个有
意义的下一步，在允许效果内行动，并根据结果继续、修正、停止或把重大选择交回 owner。

为避免把心理概念直接写成 runtime 性质，研究暂用临时指称 **目标关联的有界主动推进**（`goal-linked
bounded initiative`）。它不是 WorkCell 字段、skill 名称或协议状态。当前定义为：

> 在已接受的目的、当前情境和允许效果边界内，Agent 从来源支持的未闭合关系中产生或选择一个此前未被
> 逐步指定的下一行动，采取可观察且可限制的动作，并让结果改变后续判断；必要时返回 `no-proposal`、
> `hold`、纠偏或 owner-decision preparation，而不是为了显示主动而继续行动。

这项定义把“主动”从动作数量转到**目标关系、行动选择、后果观察和下一判断变化**。一次没有新增工具
调用但正确识别“不值得行动”或需要 owner 选择，也可以是主动推进的有效结果；反过来，调用很多工具
但没有有效进展、纠偏或关系保持，不算主动性成功。

### 最小行为关系

```text
source-backed gap / opportunity
          ↓
candidate next action (or no-proposal)
          ↓
bounded choice and local action
          ↓
observable consequence
          ↓
progress / correction / stop / owner package
          ↓
next candidate or settled branch
```

这里的 `candidate` 是研究和判断层的候选，不是预先授权的持久任务队列。一个候选至少要能回答：它
服务哪个 accepted purpose，依赖什么 source，预期改变什么，允许造成什么 effect，如何观察后果，失败
如何止损，以及为什么现在值得做。候选评估不必产生数值 ranking；在关系不足时返回 `hold` 或
`no-proposal` 是正常结果。

### 最近邻与排除边界

| 最近邻 | 它主要拥有的关系 | 为什么不能等同于目标关联的有界主动推进 |
| --- | --- | --- |
| default autonomy | 在稳定常识和允许效果内直接行动的许可背景 | 有许可不代表看见了值得推进的缺口，也不代表行动后改变判断 |
| proactivity | 在用户明确请求之前发现或提出可能有用的行动 | 提前行动可能与当前目标无关、过早打扰或越过边界 |
| persistence | 在失败或延迟后继续尝试 | 重复调用、轮询或拒绝停止不等于有效进展 |
| planning | 表达目标、步骤、依赖和预期结果 | 计划可以存在而没有候选发现、实际行动或后果反馈 |
| curiosity / exploration | 扩展观察和寻找新信息 | 新颖性本身不证明 consumer value、接受关系或效果正当性 |
| owner-facing decision package | 在重大边界处为 owner 准备有限选择 | 它是主动推进可能产生的受控输出，不取得 owner 的接受或授权 |
| motivation / agency 的心理状态 | 人的体验、意图或主体性解释 | 当前 harness 只能检验可观察关系，不能从 self-report 推出内部状态 |

因此“激发主观能动性”在本研究中应改写为：**怎样使有价值的主动推进在低人工交互下更容易发生，
而使无关、越权、重复和不可逆的主动行为更难发生。** 这个改写改变了后续设计和评估对象：要测的
不是语气是否更有激情，而是 useful initiative、false initiative、纠偏成本、人工打断和边界逃逸。

## 9. 激发机制的最小设计假设

当前可采用的最小设计假设是以下关系的联通，而不是新增一个“主动模式”或 motivational prompt：

1. **目的可见：** Agent 能恢复当前 accepted purpose、成功关系和真正未闭合的 gap；不要求每次重新灌输
   全部常识，只补充当前情境的 delta。
2. **场景可见：** 以来源有界的第一视角恢复谁在承担什么目标、谁会消费结果、行动可能造成什么后果；
   不虚构身份、事实或 authority。
3. **局部有路可走：** 对低影响、可观察、可回退的局部行动默认允许直接推进；重大方向、权限、共享
   基线和不可逆效果仍只准备方案并交回 owner。
4. **近端反馈可用：** 行动后能看到状态、事实或失败变化，知道下一判断应继续、改写、换分支还是停止；
   不把模型自报成功当作结果。
5. **犯错代价可控：** 小错可以止损、回退、补偿和事后纠偏，经验只在适用范围内复用；否则 Agent 会
   因为每一步都可能产生高昂后果而趋向等待，或因没有边界而无效扩张。
6. **结果有真实关系：** 进展必须回到 consumer、evidence、acceptance 和 downstream effect；没有
   真实关系的“忙碌”不获得正反馈。
7. **停止也被允许：** 发现没有值得做的下一步、证据不足或需要 owner 选择时，`no-proposal`、`hold`
   和 decision package 是合格动作；不能用更多轮询填充主动性指标。

这些关系是设计候选的必要检查面，不是已证明的充分条件，也不意味着每个任务都需要 memory、反思、
长期 wake 或额外 Agent。后续应先固定目的、来源、模型、任务和效果边界，只改变其中一项主要关系；
只有结果显示某个缺口仍限制 useful initiative，才增加下一项。

### 对后续 harness 的直接含义

- **默认模式应是“主动推进，重大事项回 owner”，而不是“主动前先审批”。** 这把人的负担从逐步
  驾驶转为少数不可逆选择和事后纠偏，同时保留 owner 的责任边界。
- **候选流程应以观察和关系为入口，以结果和下一判断为出口。** 候选生成、排序、memory 或 wake
  不是独立价值；它们只有在能改变这个闭环时才值得引入。
- **perspective projection 是帮助恢复责任场景的 treatment，不是人格设定。** 若加入后只是输出更
  长、出现更多角色措辞或产生 authority drift，就应判为失败或回到 baseline。
- **WorkCell 只记录执行事实、效果、观察、未知、review 和 acceptance 关系。** “想主动”“更有动力”、
  candidate ranking 或 intrinsic signal 不应因为研究需要而进入 WorkCell core。
- **吞吐必须同时计入主动性的成本。** 主动感知、候选生成、反馈和记忆可能增加 token、调用、fan-in、
  review 和纠偏；只有 `T_useful` 改善且 `C_total`、`Q_guard` 不退化，才有后续 adoption 讨论资格。

## 10. 外部一手资料回读：主动推进不是单一能力

本轮只补充四个能直接观察到 Agent 工作闭环的一手来源，不把它们当作已接受的 harness 方案。它们
分别覆盖行动与观察、工具/情境 affordance、统筹与恢复、开放式候选生成与评价；这种拆分比寻找一个
名为“agency”或“autonomy”的总机制更适合当前问题。

| 一手来源 | 来源实际展示的关系 | 对 harness 的有限支持 | 不能从中推出 |
| --- | --- | --- | --- |
| [ReAct](https://arxiv.org/abs/2210.03629) | 将推理、行动和环境观察交错，利用观察更新计划并处理例外 | 主动推进需要让 Agent 能低成本取得新事实，并使新事实回到下一次判断；“先想完整再一次执行”不是唯一形态 | 交错轨迹本身不产生长期目标，也不保证行动与真实 consumer 价值相连 |
| [SWE-agent](https://arxiv.org/abs/2405.15793) | 通过专门的 agent-computer interface，让 Agent 能编辑文件、浏览仓库、运行测试和程序；论文直接研究界面设计对行为和效果的影响 | 能动性部分取决于可用 affordance：Agent 必须有足够清晰、可观察、可回退的局部行动通道；能力不足时，增加激励措辞没有替代作用 | 工具界面改善软件工程结果，不证明一般任务的目标生成、长期保持或内在动机 |
| [Magentic-One](https://arxiv.org/abs/2411.04468) | Orchestrator 维护 task/progress ledgers，规划、分派、追踪进度，并在错误后重规划；论文还报告去掉完整 ledgers 会显著降级，但同时指出短任务可能承受固定编排开销 | “统筹”应成为主动性的独立关系：保存当前目标、已知事实、进展、下一候选、阻塞和恢复线索，让系统可以自行继续而不把人变成每步调度器 | 账本、并行 Agent 或重规划不是主动性的本体；它们可能增加复杂度、重复动作和延迟，也没有证明系统会自主发现值得做的新目标 |
| [The AI Scientist](https://arxiv.org/abs/2408.06292) | 从研究想法生成、代码与实验，到写作和模拟评审，形成可重复的开放式候选—执行—评价流程 | 对开放式工作，主动候选必须进入外部评价和成本约束；“能提出很多想法”只有在实验结果、评价和后续选择改变时才有意义 | 模拟评审和论文产出不能直接证明真实研究价值、事实可靠性、owner acceptance 或安全边界；开放循环也可能廉价地产生大量低价值候选 |

### 本轮判断

四个来源共同支持一个更窄、也更可操作的判断：**harness 不是给 Agent 加一股抽象的“主观能动性”，而
是把“看见缺口—获得局部行动通道—观察后果—更新进度/候选—接受或纠偏”这条关系做得连续、便宜、可
止损。** 其中至少要分开四类责任：

1. **候选生成：** 从已接受目的和现实缺口提出下一步，允许 `no-proposal`；
2. **局部执行：** 在明确的 effect/reversibility 边界内采取行动，并能拿到新观察；
3. **统筹恢复：** 维护当前工作图和进展，避免重复、空转，在失败后换路径或缩小问题；
4. **外部评价：** 用 consumer、evidence、acceptance 和成本判断候选是否值得继续，而非用动作数量或
   自我声称的“已完成”判断。

这使“激发”的方向发生了变化：优先降低**正确行动的摩擦**和**错误行动的恢复成本**，同时提高结果
可见性；而不是提高 Agent 的冲动、表达强度或持续运行时间。对我们提出的“少数大事请示、小事事后
纠偏”，最重要的设计推论是：

- 大多数局部推进无需先获得人的确认，但每一步仍必须回到可观察结果和当前目标，而不是自由游离；
- 人的负担应集中在少数方向、权限、共享基线和不可逆效果，普通不确定性由 Agent 先调查并形成候选或
  decision package；
- `hold`、`no-proposal`、缩小范围、换分支和回 owner 都是正常的主动结果，必须和“继续调用工具”放在
  同一评价面；
- 统筹账本、memory、scheduler、candidate ranking 只能作为闭环的支撑关系，不能预先全部实现为系统
  组件；每项都需要一个真实 consumer 和可反驳的净收益假设。

### 对当前研究设计的修订

本轮不改变研究 standing，也不启动 Run。实验顺序仍保持最小化，但 treatment 的观察面改成四个可
区分层次：

```text
reactive baseline
        ↓
bounded local action + observation
        ↓
progress / recovery coordination
        ↓
candidate generation and external evaluation
```

其中第二层是主动推进的最低行为条件；第三层回答“能否持续推进而不空转”；第四层才回答“能否把主动
性用在值得做的开放问题上”。`perspective projection` 和长期 memory 暂不提前加入，因为当前证据
不足以判断它们是第一限制因素。这样可以避免把工具能力、统筹能力、候选创造力和人格化 prompt 混成
一个 treatment，也能在未来记录 `useful initiative`、`false initiative`、`time-to-first-useful-progress`、
`correction cost`、`owner interruption` 和 `boundary escape` 的变化。

本轮外部资料改变了研究的**分解和探针顺序**，没有改变以下边界：研究对象仍是
`goal-linked bounded initiative`；WorkCell 仍只记录执行事实和证据关系；DeepSeek Harness 仍是后续
system-layer 设计；没有新增 initiative skill、motivation registry、scheduler 或 runtime mechanism。

本节把研究对象从心理状态收窄为可观察的行为关系，但不改变本记录的适用性与证据上限：仍为
`research-candidate / source-read / evidence-follow-up-complete / applicability-open / no-project-run / acceptance-pending`。尚未有
真实 consumer、named owner、baseline/treatment 或可重建 Run，因此不启动评估、不创建 initiative skill、
scheduler、memory registry 或 runtime mechanism。

## 11. 2026-08-26 证据回读：唤醒不是能动性，能动性也不是冲动

### 新增的可用证据

本轮对已有一手来源做了窄回读，并补看了近期的主动问题解决基准。它们没有证明某个通用 harness 方案，
但足以改变研究的分解方式：独立运行首先需要被唤醒并暴露到机会，其次才是判断什么值得做；两者不能
合并成一个 `initiative` 开关。

| 来源 | 来源实际支持的观察 | 对本研究的决策影响 | 证据上限 |
| --- | --- | --- | --- |
| [PROBE: Beyond Reactivity](https://arxiv.org/abs/2510.19771) | 将主动解决拆成发现未指定问题、定位具体瓶颈、执行合适解决；基准包含跨文档的 workplace datastore，端到端最高成功率报告为 40% | 主动性至少要分别观察 opportunity search、bottleneck identification 和 resolution execution；只测“是否提出建议”会高估能力 | 任务为构造的 workplace datastore，不能直接证明长期运行、真实 owner 价值或低交互成本 |
| [Proactive Agent](https://arxiv.org/abs/2410.12361) | 从环境活动预测可能任务，并用人类 accept/reject 标注和 evaluator 评估主动协助 | 候选生成必须同时有“值得做”和“不要打扰”的判断，`reject`/`no-proposal` 不是失败样本之外的噪声，而是能力边界 | 主要面向主动协助，不证明 Agent 能自主保持长期工作目标；其 fine-tuning 结果不是本 harness 的效果证据 |
| [SWE-agent](https://arxiv.org/abs/2405.15793) | 定制 Agent-Computer Interface 改变了 Agent 编辑、浏览、运行测试和处理反馈的能力与表现 | 行动通道的清晰性、可观察性和可恢复性是主动推进的前置条件；增加激励措辞不能弥补缺少 affordance | 软件工程任务中的 interface 结果不能直接迁移为一般任务的目标发现或心理动机 |
| [Magentic-One](https://arxiv.org/abs/2411.04468) | Orchestrator 用 task ledger 和 progress ledger 跟踪事实、计划、分工与进度，并在无进展时重新规划 | 统筹是主动持续推进的支撑关系，应保存进展与恢复线索；但它不能被误写成主动性的本体，也必须计入编排开销 | 多 Agent/ledger 结构的任务结果不能证明独立运行中的净收益，短任务可能不值得承担固定协调成本 |
| [The AI Scientist](https://arxiv.org/abs/2408.06292) | 生成研究想法、实现代码、运行实验、分析结果并模拟评审，构成候选—执行—评价闭环 | 开放式候选只有在外部结果和评价改变后续选择时才有意义；“生成很多想法”本身不算主动性 | 模拟评审和生成论文不等于真实研究价值、事实可靠性或 owner acceptance |

### 关键拆分：五种关系，不是一个“主动模式”

独立运行 harness 至少要把下列关系分开。它们可以协同，但不应先被实现成同一个状态、分数或
registry：

```text
activation / wake
        ↓ 暴露新的事件、开放关系或到期回看机会
situation grounding
        ↓ 恢复目的、场景、缺口、消费者与允许效果
initiative judgment
        ↓ 产生 candidate / no-proposal / hold / owner package
bounded affordance
        ↓ 在局部、可观察、可回退范围内行动
feedback and coordination
        ↓ 观察后果、更新进展、纠偏、停止或选择下一候选
```

1. **唤醒/注意（activation）：** 事件、新信息、开放关系的变化或到期回看让系统获得一次观察机会。
   它解决“有没有机会看”，不决定“值不值得做”。周期扫描只是可能的实现方式，不能把轮询次数当作
   主观能动性。
2. **情境恢复（situation grounding）：** 把当前目的、第一视角责任、事实、未知、消费者和后果放回
   当前场景。`perspective-frame` 的价值在这里：帮助看见关系，不制造人格、事实或权限。
3. **主动判断（initiative judgment）：** 从来源支持的未闭合关系生成或选择下一步，也可以判断
   `no-proposal`。这是“激发”的核心，不是模型表达更积极。
4. **有界行动通道（bounded affordance）：** 给正确候选一条成本低、效果小、结果可见、可回退的路；
   行动通道太弱会让 Agent 等待，过强则把纠偏成本外溢。
5. **反馈与统筹（feedback/coordination）：** 将结果回接目标、进展、consumer 和 evidence，判断继续、
   改变、停止或回 owner；没有这个回接，主动性只是一次性动作。

这个拆分产生一个比“激励 Agent”更准确的系统假设：**harness 的作用是降低正确下一步的激活摩擦和
行动风险，提高结果可见性与纠偏收益，使有价值的主动推进比等待更容易；而不是让 Agent 产生更多冲动。**
这里的“收益”是可观察的目标进展、能力改进或关系闭合，不是模型自报的满足感。

### 对已有探针顺序的修正

后续真实 consumer 出现后，唤醒条件必须在各对照中保持可比，不能把“更频繁唤醒”与“更会判断”混为
一个 treatment。最小顺序修正为：

1. 固定同一个事件/开放关系、模型、工具、效果边界和唤醒预算，比较 reactive 与
   `goal-linked bounded initiative` 是否能从机会找到瓶颈并完成低风险推进；
2. 只有在第一步显示持续性或重复错误是主要缺口时，才加入 progress/recovery coordination；
3. 只有在存在开放式候选需求且外部评价可用时，才加入 candidate generation 与 evaluation；
4. `perspective projection`、长期 memory、ranking 和 scheduler 各自作为后续单变量 treatment，不能
   预先打包成“更主动”的总方案。

每一步都要同时看 `useful initiative`、`false initiative`、`time-to-first-useful-progress`、
`correction cost`、`owner interruption`、`boundary escape` 和 `Q_guard`；若只提高动作量、轮询量或
输出长度，判为无效甚至退化。

本轮真正改变的是研究对象的**因果分解与探针顺序**：`activation` 负责让机会进入视野，
`goal-linked bounded initiative` 负责在机会出现后作出有价值、有界、可纠偏的选择。它没有改变
本记录的适用性开放、无 Run、无新 skill/registry/scheduler/runtime 的边界，也没有把这五种关系写入
WorkCell core。

## 12. 直接回答：怎样激发主观能动性

### 12.1 不是给 Agent 加动力，而是让行动形成闭环

当前最直接的答案是：**不要试图用一句更有感染力的 prompt、人格设定或奖励口号给 Agent 注入“想做事”
的动力；要让它在真实目标中持续看见“什么值得改变、我能改变什么、改变后发生了什么、下一步应如何调整”。**

研究指称仍然是 `goal-linked bounded initiative`；本节把其中可被 harness 设计的关系暂称为
**目标关联行动回路**（`goal-linked action loop`）。这不是新 runtime 状态、skill 名称或 WorkCell
字段，而是用来组织设计和实验的中层假设：

```text
有意义的未闭合关系
        ↓
当前责任场景与可选择的下一步
        ↓
低风险、可观察、可回退的行动
        ↓
行动与后果之间可重建的联系
        ↓
进展/失败/纠偏/停止的反馈
        ↓
更新当前判断、经验和下一候选
```

这条回路中最关键的不是“行动”，而是**选择和后果之间的可归因联系**。如果 Agent 没有选择空间，它只是
执行器；如果行动后看不到结果，它只能猜测自己是否有效；如果结果不影响下一判断，它只是重复调用；如果
任何小错都会造成不可恢复的损失，它会倾向于等待或用表面合规规避责任。反过来，只要动作数量增加而目标
关系没有闭合，也不应称为主观能动性提高。

### 12.2 将“激发”翻译成六个可设计条件

| 条件 | harness 应提供的关系 | 缺失时的典型行为 | 不能偷换成 |
| --- | --- | --- | --- |
| 目的承接 | 当前 accepted purpose、成功关系和未闭合 gap 对 Agent 可见；只补当前 delta | 机械执行、局部优化、目标漂移 | 替 owner 重新定义目标 |
| 局部选择 | 在固定效果边界内由 Agent 选择调查、路径、顺序或合格停止 | 等待逐步指令、只执行预写计划 | 无限授权或扩大 authority |
| 行动可达 | 有清晰、低摩擦、结果可读、可停止的工具和工作环境 | 知道问题却无法推进，或用文字假装推进 | 更多工具、更多并行天然更好 |
| 后果可归因 | 能把自己的候选/动作、实际 effect、观察和结果连起来 | 幻觉式“已完成”、重复错误、无法学习 | self-report、点赞或更长反思 |
| 失败可恢复 | 小错可止损、回退、补偿或事后纠偏；重大效果仍受 owner/硬边界约束 | 过度谨慎，或无边界试错 | 用事后道歉覆盖不可逆伤害 |
| 结果有关系 | 进展回到 consumer、evidence、acceptance、下游 effect 和后续候选 | 自我忙碌、刷任务量、无尽探索 | 把动作数、轮询数或输出长度当 reward |

这里的“目的承接”“局部选择”和“后果可归因”是把人类动机理论转译成 Agent 可观察关系的工作假设，
不是声称 Agent 具有人类的 autonomy、competence、relatedness 或 self-efficacy。Ryan/Deci 的 SDT
说明人类的自主、胜任和关系条件与自我动机相关；Bandura 的 self-efficacy 研究说明能力信念会影响人的
行为改变。它们可以帮助生成设计问题，但不能替代本项目的 Agent 行为证据。相反，近期 agent 研究直接显示，
提高自主动作能力时，若人的纠错变少，就需要相应收窄可造成的 agency；这支持“先增加方法选择，不自动
增加效果权限”的边界。见 [Ryan & Deci (2000)](https://doi.org/10.1037/0003-066X.55.1.68)、
[Bandura (1977)](https://doi.org/10.1037/0033-295X.84.2.191) 和
[Safin & Balta (2026)](https://arxiv.org/abs/2605.12105)。

### 12.3 对“少数大事请示、小事事后纠偏”的具体解释

这条原则之所以能激发能动性，不是因为它向 Agent 发出“你可以随便做”的信号，而是因为它改变了
行动的成本结构：普通局部问题不必为取得许可而停住，错误仍有可控回路，真正改变方向或效果权威时才
把选择交回 owner。它必须同时满足以下顺序关系：

1. **先看见机会：** activation/wake 只把事件或开放关系送入视野，不替 Agent 判断价值。
2. **先恢复场景：** 目的、事实、未知、消费者、效果边界和当前责任必须有来源；常识不反复灌输，变化的
   delta 才进入当前上下文。
3. **先做最小可逆推进：** Agent 自主选择调查、局部修复、验证或停止；不因普通不确定性自动请示。
4. **把反馈写成下一判断：** 反馈不仅要说对/错，还要让 Agent 知道关系改变了什么、哪个假设被削弱、
   应继续、改写、换分支还是形成 owner package。
5. **按后果升级，而不是按疑惑升级：** 方法选择可以在同一 effect boundary 内自主变化；方向、权限、
   共享基线和不可逆效果变化时才进入 owner-facing exception。

这也解释了一个重要反例：Proactive Agent 的实验中，加入反馈能减少 false alarm，却可能让 Agent 变得
过于沉默并损失 recall；所以“纠正它不要乱做”不能简化成全面压制主动行动。反馈必须同时保留“值得做的
机会”和“现在不要打扰/不要行动”的区分，见 [Proactive Agent](https://arxiv.org/abs/2410.12361)。
近期对真实开发者监督工作的探索也把事前控制、共同规划、实时监控和事后审查区分开来，支持把事后纠偏
作为真实监督关系的一部分，而不是把所有责任都前置成审批，见 [Human oversight of agentic systems in
practice (2026)](https://arxiv.org/abs/2606.05391)。该研究为探索性访谈，不能直接证明本项目的净收益。

### 12.4 需要避免的四种“假激发”

- **语气激发：** 反复要求“主动、负责、像 owner 一样”，但没有新的事实、选择或行动通道；只能改变表面
  表达，不能证明行为改变。
- **压力激发：** 用超时、惩罚、不断唤醒或“必须给出下一步”驱动调用；最容易得到虚假进度、过早打扰和
  隐藏风险。
- **奖励激发：** 奖励工具调用、候选数量、输出长度或自评完成；会把主动性退化成 busywork 和 false
  initiative。
- **全局放权激发：** 为了让 Agent 有主观能动性而扩大工具、权限或持久化；这把 agency 与 autonomy
  混成一个旋钮，并把原本可由事后纠偏吸收的小错变成外部事故。

### 12.5 最小验证与当前处置

未来有真实 system-layer consumer 后，最小探针不直接测试“哪个 prompt 更有激情”，而是固定相同的
事件、模型、工具、effect boundary 和 wake budget，比较：

1. reactive：只处理明确输入；
2. bounded choice：拥有局部选择和可回退行动，但不额外增加长期 memory 或 scheduler；
3. goal-linked action loop：在 2 的基础上显式回接行动—后果—进展/纠偏—下一判断。

若第 3 条只增加调用、输出或打扰，而没有改善 useful initiative、time-to-first-useful-progress、
correction cost、owner interruption、boundary escape 和最终 acceptance，就拒绝该机制；若它改善了
有价值推进但损害 false initiative 或 Q_guard，也不能采用。`perspective projection`、长期 memory、
candidate ranking 和 scheduler 继续作为后续单变量 treatment，不先打包成“激发系统”。

## 13. 2026-08-26 settlement event

本轮把“选择空间、行动可达性、后果归因和纠偏回接”的研究综合结算为一次有限
`owner-gated-hold`：它保留了未来 DeepSeek/system-layer 设计可能使用的 decision boundary，但当前没有
named system consumer、research/eval owner、runner、matched Run 或 adoption evidence，不能继续以 active
research 形式扩张。

若出现 named consumer、相同 wake budget 下的可比较 baseline/treatment、真实错误代价或 owner return，按
原有 probe 顺序 reopen；否则到下一 settlement checkpoint 关闭为 `archive-inconclusive / no-proposal`。不创建
initiative skill、motivation registry、scheduler、runtime mechanism，不修改 WorkCell core。
