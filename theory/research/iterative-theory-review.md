# 防退化闭环迭代：独立理论审查

**审查身份：** 未参与候选写作的独立 reviewer。  
**审查范围：** `AGENTS.md`、`theory/philosophy.md`、`theory/gene-expression.md`、
`theory/harness/theory.md`、`theory/harness/iterative-improvement.md`，以及指定的
`theory/research/` 记录和 `.agents/skills/concept-articulation/SKILL.md`、
`.agents/skills/form-selection/SKILL.md`。  
**审查性质：** 静态语义与结构审查，不是行为试验。

## 结论

当前**不接受** `theory/harness/iterative-improvement.md` 作为已经行为成立的
living theory；处置为 **adapt-and-retest**。候选已经形成较强的理论候选：它明确了
改善关系、来源 standing、主要 delta、污染、未知、owner、再生和停止，且没有把 research、
archive 或 open-source 直接升格为理论源。可是，文本仍有以下会影响接受的重大问题：

1. P16 的“全程”检查被写成几乎每轮都要执行完整的 positive/boundary/regression/holdout
   与 ledger，和 harness theory 明确的“阶段按条件出现、不要求每个任务经过每个阶段”
   （`theory/harness/theory.md:84-85`）有张力，容易把方法义务固化成仪式。
2. 接受阈值、重大退化、相称证据、成本边界和“有意义的净收益”主要以接受者判断为前提，
   但没有要求在 treatment 前冻结可追溯的阈值、接受者和变更规则；因此仍有事后调权、循环
   判定和无法证伪的空间。
3. 必要组合被允许，但“不可拆分”的判定没有独立的必要性检验或组合专属证据等级；这会让
   同轮改 theory/skill/fixture/rubric 的结果仍可被合理化为一个组合。
4. disposition 的名称与研究记录不一致：候选使用 `adapt`、`retain`，研究记录使用
   `adapt-and-retest`、`retain-baseline`。这会使 ledger、路由和接受者对处置含义产生分叉。
5. 上游再生只明确写了“theory 改变后”使下游失效；哲学源 P 改变时如何标记受影响 theory、
   再生成、复评与接受没有同样明确的传播规则。
6. 收敛、停止和 adoption 后观察都有正确方向，但缺少风险相称的观察窗口、fresh holdout
   更新与“仍未知是否改变下一行动”的判定方式，静态上不能区分真正收敛与暂时没有新问题。

因此，建议保留核心语义，先作最小适配，再用未见任务、污染注入、上游变更和不同风险等级
的行为试验复测。不能由本报告、静态 review 或 `git diff --check` 宣称净改善、收敛或运行时有效。

## 逐项审查

| 审查项 | 判断 | 依据与问题 |
|---|---|---|
| 对象同一性 | **uncertain** | `iterative-improvement.md:7-19` 以任务/行为关系、目标、硬约束、delta、环境、效果、证据和接受拥有者维持同一性，明显优于“版本历史”对象；也规定来源、owner 或预期行动变化时重新问题化。缺少的是可操作的同一性探针：何时只是 candidate 改善，何时已变成新任务/新接受关系；没有最近邻对象、拆分/合并反例。`concept-articulation/SKILL.md:59-97,133-141` 所要求的对象证据、同一性威胁和行动探针尚未被引用为此对象的检验。 |
| P03 | **yes / uncertain** | `:23` 要求实践产生新观察、比较原预测并改变下一判断，且重复尝试不算迭代，确实生成了判定。未定义如何证明下一实践确实由观察改变，而不是事后重述；需行为 probe。 |
| P15 | **yes** | `:24,41-48,74,78-83` 将匹配对照、可观察结果、相称评审和多类证据与“不能以单次成功直升真理”绑定，实际改变了接受判断。静态上无法证明匹配、grader 与评审在运行中真实成立。 |
| P16 | **yes / uncertain** | `:25,66,87,103,134-136` 把起点、改变前、执行中、结束、采用后都纳入检查，并保留未知/逃逸回归，非装饰列号。但全套结束检查似乎默认适用于每轮，且采用后观察没有 owner、窗口和停止规则，和 `harness/theory.md:84-85` 的条件阶段原则有张力。 |
| P01 | **yes** | `:29` 要求实际任务、缺口和结果，区分“想改什么”与“发生了什么”，形成 baseline—观察—再建模关系。 |
| P02 | **yes / uncertain** | `:30,52-58,70` 要求来源、覆盖、冲突、反例和未知；但“相称调查”没有按风险或任务类型的可复核判定，仍依赖 reviewer 直觉。 |
| P04 | **yes** | `:31,57,83,87,136` 将 unknown、污染、grader 不公、未冻结和证据降级写成合法结果，且不强迫成功结论。 |
| P05 | **yes / uncertain** | `:32,64,91-99,134` 要求 delta、fixture、成本、owner 随具体任务而定，不设固定轮数/Agent 数。相反，“相称”“有意义”“重大”没有提供风险分层的判定样例，需防止上下文性变成不可反驳。 |
| P06 | **yes / uncertain** | `:33,64-66` 将 controlled delta 定义为简化因果而非最短文本，并禁止删掉来源、边界、未知、回退和接受关系。没有明确如何判断被删内容“不改变判断”，与现有 `form-selection` 的最小真实形式原则相同但缺少行动验证。 |
| P09 | **yes** | `:34,91-99` 以主要缺口和最小 owner 路由，反对按篇幅、最近性或重复票数升格理论；这是实际分诊判断。 |
| P11 | **yes / uncertain** | `:35,64-66,130` 处理扰动、暴露、方差、依赖和协调成本，并允许必要组合与逐步扩大。没有明确风险/成本预算由谁预先接受，容易在结果后选择“可接受”范围。 |
| research standing | **yes** | `:3,70,140` 及研究记录 `iterative-improvement.md:18-20,243-259,367-375` 明确 research 是记录/候选，不能直接改变 P 或 living theory。 |
| archive standing | **yes** | `:70,140` 把 archive 限定为检验、反驳、限定或触发从 P 重生成的材料；没有把年代、复制或旧实现当作现行设计。建议把“触发重生成”措辞改为“提出重生成候选”，以免被解读为自动行动。 |
| open-source standing | **yes / uncertain** | `:70,140` 没有将 open-source 当理论源或接受证据，方向正确；但未像 `skill-practice-synthesis.md:27-28` 那样明确排除 stars、forks、市场收录、作者名气和流行度作为质量主张，且没有写出其最多只能提供做 probe 的候选和失败类别。 |
| 净改善 | **yes / uncertain** | `:41-48` 用带硬约束的结果向量取代事后总分，要求目标、边界/回归、证据、成本和外部效果共同成立。`重大退化`、`预先认可范围`、`相称`和 tradeoff 的可接受边界仍未冻结，故不能单凭文本判定。 |
| controlled delta | **yes** | `:62-66` 正确区分主要因果差异与“一行变更”，允许一个语义组合跨文件，并要求不可拆理由、baseline 快照和回退锚点；也禁止在退化版本上连续叠补丁。 |
| 必要组合 | **uncertain** | `:64` 承认 theory/skill/fixture/rubric/workflow 可组成预先声明的不可拆 treatment，并禁止把结果归因到单项；但没有要求组件 ablation、组合必要性反证或 `combo-only` 证据 standing。应至少区分“组合有效”与“每个组成部分有效”。 |
| 并行研究 | **yes** | `:68-72` 仅在真实可分的 evidence lane 使用并行，各 lane 返回 standing、覆盖、冲突、反例、未知，不直接写共同权威；Main 负责重连不变量。 |
| 顺序综合 | **yes** | `:72` 将共同对象/冲突恢复、change hypothesis、上游理论接受、下游生成、修改后独立验证放入真实依赖顺序，且反对摘要拼接和多数投票。 |
| 独立验证 | **yes / uncertain** | `:74` 指定 reviewer 不生产 exact candidate、不改 rubric、可反对或 uncertain，且不拥有接受权。未定义 reviewer 是否看过研究 lane、历史失败或候选类别，以及如何验证其输入隔离；研究审计显示实际 round 曾发生候选可见污染（`iteration-process-audit.md:74-78`），所以文本规则尚未获得行为支持。 |
| positive / boundary / regression / holdout | **yes / uncertain** | `:76-83` 四类集合的语义区别清晰，holdout 消耗后不能继续冒充 holdout。遗漏了研究记录 `iterative-improvement.md:283-293` 的 matched/randomized-when-feasible、重复次数、真实新任务和 holdout 刷新等条件，不能据此判定泛化或长期逃逸。 |
| 污染 | **yes / uncertain** | `:85-87` 覆盖模型、来源 hash、任务、harness、权限、workspace、共享 mutable component、角色互见、结果后改 fixture/rubric、holdout 消耗和终态不可重建；污染时降级为 observed/uncertain。缺少污染状态的持久 owner、发现后是否废弃哪些 artifact、以及采用后污染监测。 |
| owner 路由 | **yes / uncertain** | `:89-103` 的 theory/skill/fixture/workflow/runtime 表清晰，普通激活不回读 P/theory，结构提议与接受分开。表中没有单列 Principal/acceptance owner，且跨层故障在 theory→skill→fixture→workflow 的回返中没有循环终止或责任交接记录。 |
| ledger | **yes / uncertain** | `:105-118` 记录身份、baseline、配置、假设、运行、评价、处置和后继，保存历史而不倒写，接近研究记录要求（`iterative-improvement.md:206-241`）。但“每轮至少”字段很像 protocol/schema；若不是所有任务均适用，应声明按风险裁剪并记录裁剪理由。 |
| disposition | **uncertain** | `:117-120` 解释 `adopt/adapt/retain/no-proposal/rollback/uncertain`，并正确说它们不是 runtime 状态；但研究记录使用 `adapt-and-retest`、`retain-baseline`（`iterative-improvement.md:194-204`），名称和边界不一致。`adapt` 与 `uncertain`、`retain` 与 `no-proposal` 的互斥条件还依赖未冻结阈值。 |
| 上游再生 | **uncertain** | `:103` 对 theory 改变后的 stale、重生成、独立 review、正/边界/回归和再接受写得完整；但哲学源 P 改变只在“哲学序列是唯一理论生成源”中间接出现，没有显式 P→受影响 theory→skill 的传播、影响范围和接受记录。 |
| workflow 自评 | **yes / uncertain** | `:122-130` 明确把 outcome/process/balancing 分开，冻结旧流程、只变一个流程关系，并要求未参与设计执行的裁定者；与研究候选 `iterative-improvement.md:261-309` 一致。缺少自评裁定者的污染处理、长期真实任务窗口及随机/匹配不可行时的证据降级说明。 |
| 收敛/停止 | **yes / uncertain** | `:132-136` 不使用固定轮数、Agent 数或全员同意，允许 no-proposal、成本过高、owner 覆盖、风险保守和 uncertain 停止。`有意义的净收益`、`证据关系稳定`、`剩余未知不改变行动`没有时间窗口、fresh holdout 或预注册判定，因而可以无限延迟或过早关闭。 |
| 结构提议、acceptance/move | **yes** | `:101` 明确结构提议可由重复 owner 关系自然出现，但 acceptance、move、canonical source 改动和 runtime 契约必须由明确干预/理由/接受者完成。`theory-structure.md:9-18,128-134` 提供了一个已有的显式 proposal→accept/move 记录范例。 |
| 方法表达/runtime 边界 | **yes / uncertain** | `:3,99,101,103,140,153` 反复区分方法/载体与 runtime 的身份、权限、并发、恢复、取消、持久证据和外部效果；符合 `harness/theory.md:45-57,84-85,121-145`。但 `:25` 的全套过程检查、`:107-118` 的 mandatory ledger 和 `:124-130` 的 workflow 评估若成为每次运行硬要求，会把方法义务过度机制化，和“不要求每个任务经过每个阶段”冲突。 |

## 重大缺陷与最小修订

### 1. 把 P16 的时点原则改为条件性承重义务

保留开始、改变前、执行中、结束和采用后的“检查相位”作为判断原则，但不要暗示每个
低后果局部任务都必须运行完整 holdout、长期监测和全量 ledger。以任务的风险、效果边界、
方差和接受契约决定哪些相位实际出现；未出现的相位记录 `not-applicable` 及理由。这样才能
同时保留 P16 的全程意识和 harness theory 的条件阶段原则。

### 2. 在 treatment 前冻结接受关系

在 change hypothesis 中显式冻结：接受者、硬约束、重大退化定义、目标/边界/回归的最小
证据、成本预算、组合 treatment 规则、采用后观察窗口和 fresh holdout 规则。结果出现后
改变其中任一项应产生新 round 或返回 `uncertain`，不得倒写旧 ledger。接受者仍可作最终
风险判断，但不能事后创造“通过”的标准。

### 3. 为必要组合区分“组合成立”和“组件归因”

若无法拆分，处置只能证明该组合在指定边界下的行为，不能证明 theory、skill、fixture 或
rubric 的单独效果。增加一个最小的组合证据 standing，或要求能做的局部 ablation；组件
改变后仍要按依赖再生，而不是用组合结果替代组件验证。

### 4. 统一 disposition 与传播规则

采用研究记录已经使用的 `adapt-and-retest`、`retain-baseline`，或在候选中声明同义别名和
互斥条件。补充 P 改变时的 lineage：受影响的 theory 标记 stale，受影响的 skill/载体、
fixture、rubric 和旧结论分别标记影响范围，完成再生成、独立复核、正/边界/回归试验和
显式接受后才恢复有效。

### 5. 补上对象与收敛探针，而不是新增固定门数

增加同一对象拆分/合并、相邻任务、低风险局部任务、fresh holdout 刷新、采用后逃逸窗口、
P 上游变化和污染恢复的行为 probe。不要在 living theory 中写死统一样本数或分数阈值；
应要求 protocol/acceptance owner 对每个对象给出风险相称的可复核规则。

## 循环、遗漏、重复与不可证伪性

- **潜在循环：** `adopt` 需要接受者判断范围可接受；范围又可由结果后接受；`uncertain` 可
  无限暂停；理论改动又会使下游失效并重新开始。冻结 acceptance card、记录 `not-applicable`
  和使用风险相称的停止窗口，可以把循环变成可追踪的再开/关闭，而不是自动成功。
- **潜在循环：** `theory` 负责稳定跨环境对象/因果/边界，`workflow` 负责测量缺陷，`skill`
  负责内化缺陷；同一观察可跨三层，当前只有“主要缺口/最小 owner”，没有强制记录次要
  owner、回返次数和最终责任人。建议 ledger 增加 routing history，而非把所有失败升格为理论。
- **遗漏：** P 改变传播、组合必要性、采用后观察窗口、fresh holdout 更新、接受阈值冻结、
  Principal owner、随机/匹配不可行时的证据降级、低风险任务的相位裁剪。
- **重复：** 候选的对象/证据/ledger/处置/流程自评大幅复述
  `theory/research/iterative-improvement.md` 与 `iteration-process-audit.md`。研究材料可保留
  证据与病例，living theory 应主要保留可跨场景复用的语义判断，具体字段、状态和试验骨架
  交给 protocol/skill/workflow 的相应 owner，避免 research 与 living theory 形成第二份协议。
- **不可证伪处：** “相称”“重大”“有意义”“稳定”“成本高于后果”“不再改变下一行动”
  都可在缺少预先约定时被重新解释；现有十个 falsification probes (`:142-153`) 是有价值的
  方向，但条件式文字本身不能证明运行会拒绝错误结论。需要冻结 probe 的输入、裁定者、
  结果处置和未知出口，而非继续增加 prose。

## 证据结论

静态审查可支持的最高结论是：候选已把指定 P 条目转成一套相互关联的判断，并保持了
research/archive/open-source 的较低 evidence standing；它在概念上覆盖了对象、证据、边界、
owner、再生、流程自评和 runtime 边界。静态审查不能证明：

- 下一轮真的因新观察而改变；
- candidate 相对 baseline 有 matched improvement；
- reviewer 真正独立、holdout 未污染、grader 公平；
- 必要组合而非单一因素产生结果；
- adopt 后没有逃逸回归，或停止确实是收敛而非样本不足。

完成上述最小适配并通过行为 probes 前，保留 `adapt-and-retest`，不把本文件或候选文本
升级为行为协议、runtime 契约或接受授权。
