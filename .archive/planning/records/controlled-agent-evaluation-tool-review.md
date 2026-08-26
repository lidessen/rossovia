---
kind: review-record
id: controlled-agent-evaluation-tool-review
status: settled
disposition: bounded-record
evidence: independent-review-complete
---

# 受控 Agent 行为评估设施候选审查

boundary：`candidate-boundary-observed`
revision：`applied`
review：`independent-review-complete`
implementation：`not-authorized`
acceptance：`pending`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录处理 roadmap 中“受控 Agent 行为评估工具”这一方向的对象、边界和最小去向。这里暂用
**受控 Agent 行为评估设施**（`controlled-agent-evaluation facility`）作为 working designation，
因为目标不是先做一个万能工具，而是让一个真实的评估 consumer 能在固定变量下比较 Agent 行为，
并留下可重建的证据。该指称不是 canonical runtime 名称、skill 名称或实现授权。

## 1. 来源与问题

主要来源：

- [`roadmap.md`](../roadmap.md) 的 inbox candidate：控制变量，比较 prompt/skill 效果与模型能力；
- [`plan.md`](../plan.md) 的实现前顺序：先形成理论/skill 边界，再决定实验/评估实现；
- [`evals/README.md`](../../evals/README.md) 与 [`evals/skill-evaluation/protocol.md`](../../evals/skill-evaluation/protocol.md)：
  评估对象、fixture、Run、review、ledger 与 evidence 的现行边界；
- [`item-ledger.md`](../item-ledger.md)：当前 planning standing、owner/consumer unknown、依赖和允许的
  下一步；本记录不覆盖它的当前索引；
- [`theory/harness/theory.md`](../../theory/harness/theory.md)：Task、Run、Work Cell、evidence 与
  acceptance 的 owner 分离；
- [`agent-harness-throughput-research.md`](../../theory/research/agent-harness-throughput-research.md)：
  trace、loading、topology 和成本/质量关系的证据要求；
- [`harness-agent-initiative-research.md`](../../theory/research/harness-agent-initiative-research.md)：
  useful initiative、false initiative、反馈和纠偏的可观察比较要求。

当前问题不是“有没有一个测试脚本”，而是：**在一个被接受的目标、任务、来源、权限和效果边界内，
怎样把 baseline、treatment、运行身份、实际观察、独立 review 和 acceptance 连接起来，使比较结果
能回答一个具体问题，而不把输出差异、调用次数或一次成功冒充行为改善。**

## 2. 对象边界：不是一个万能 Tool

“评估工具”目前混合了至少十个不同对象。它们不能因为都由代码承载就合并为一个 `Tool`：

| 对象 | 它回答什么 | 当前 source/owner 状态 | 不拥有的关系 |
| --- | --- | --- | --- |
| evaluation question | 本轮要比较什么行为或能力 | eval consumer；当前未命名 | 不拥有 card、运行身份或接受 |
| core card | 哪些变量固定、哪个 treatment 改变、如何冻结和回读 | `evals/` protocol；card owner 未命名 | 不拥有 fixture 内容、运行事实或接受 |
| fixture / task / source snapshot | 对什么任务和来源执行、如何重建输入 | `evals/` fixture/source；owner 未命名 | 不证明已运行、匹配或已接受 |
| rubric | 哪些 outcome/process/boundary 观察与限制需要判断 | eval/review owner；当前未命名 | 不代替语义 review 或接受 |
| runner / control surface | 如何在隔离、固定配置下启动并收集一次比较 | future eval runner surface candidate；owner unknown | 不创造语义结论、权限或 acceptance |
| WorkCell executor | 如何执行一个有界工作单元并返回其执行事实 | WorkCell design/host boundary；owner unknown | 不拥有评估问题、比较结论或接受 |
| provider adapter | 如何翻译某个外部 provider/protocol 的请求与返回 | adapter/integration boundary；owner unknown | 不拥有通用生命周期、Task 意义或模型优劣 |
| eval run evidence | 评估运行实际看到了什么、是否污染、如何重建 | `evals/` evidence；runner/record owner unknown | 不替代 WorkCell canonical Run/RunRecord，也不把观察升级为改善 |
| eval ledger / disposition record | 如何追加 review 限制、处置和 rerun lineage | `evals/` ledger；接受 owner unknown | 只能记录 disposition，不能取得采用、回滚或接受权威 |
| prototype implementation | 某种 runner、收集器或界面代码 | `experiments/`，若仍为原型 | 目录位置不产生 evidence standing |

建议把整体称为“评估设施候选”只作为规划层的组合指称；各子对象仍按原有 owner、生命周期和 evidence
standing 分开。若未来出现真实工具代码，代码原型进入 `experiments/`；评估 protocol、card、fixture、
评估 Run、review、eval-specific evidence/ledger 进入 `evals/`。WorkCell 的 Run、RunRecord、host
observation 及其 retention/correction 仍由 WorkCell/protocol/record/evidence owner 拥有，不因被评估
设施调用或引用而迁入 `evals/`，也不把一个目录或仓库当作所有对象的 canonical source。

## 3. 最近邻与排除

| 最近邻 | 区别 |
| --- | --- |
| `evals/skill-evaluation` protocol | 规定怎样冻结、运行、记录和返回；它不是 runner 实现 |
| WorkCell | 执行有界工作并记录事实；它不负责比较 treatment 是否有价值 |
| provider adapter | 翻译 Vercel AI SDK、Pi、DeepSeek 等请求/返回；它不拥有同合同下的比较结论 |
| experiment prototype | 可以探索实现形状；它不自动成为正式 Run 或 evidence |
| benchmark | 可以提供任务与指标集合；它不自动提供本项目的 authority、effect boundary 或 acceptance |
| test script / validator | 证明局部机械谓词；不能证明语义质量、行为改善或 owner acceptance |
| WorkCell `WorkCellRunRecord` | 保存一次执行事实投影；不能承载 baseline/treatment 的完整比较语义 |
| DeepSeek Harness 工作系统 | 后续 system-layer consumer；不能成为当前评估设施的隐含实现前提 |

特别排除两种误读：

1. 现有 eval 文件、历史 runner 或可运行的 experiment 不等于当前已有一套可复用评估工具；
2. 有了一个工具不等于变量已经控制。匹配、隔离、身份、来源、权限、时钟、reviewer 和 acceptance
   仍需由每个 evaluation question 的 card 明确。

## 4. 当前 consumer、owner 与依赖

### 可能的 consumer

- 方法/skill 行为比较：比较某个 project-local skill 的 baseline/treatment；可以优先复用现有
  `evals/skill-evaluation` 协议，不必等待 WorkCell runtime；
- WorkCell executor/provider 比较：在同一个 WorkCell contract 下比较 Vercel AI SDK、Pi、DeepSeek
  Harness 或 deterministic executor；依赖 WorkCell contract、adapter surface 和可重建 runner；
- 后续 DeepSeek 工作系统评估：比较通知、记忆、todo 并发、双向输出或恢复策略；依赖 WorkCell
  acceptance 与 system design candidate；
- 用户 harness 构想实验：依赖已接受的工作系统和每个构想自己的 object、baseline、effect、evidence
  与 acceptance。

这些是 consumer 类别，不是已命名 consumer。当前没有确定的第一项评估问题、eval/runner owner、
工具维护 owner 或 acceptance owner，均保持 `unknown`。

### 依赖图

```text
理论/skill 边界 + evaluation question
                 ↓
     core card + fixture/source + rubric
                 ↓
              eval runner
              ↙       ↘
 WorkCell executor   provider adapter
              ↘       ↙
       eval Run observations
                 ↓
       independent review
                 ↓
       eval evidence ledger ──→ acceptance owner decision
```

涉及 WorkCell 的评估还要引用但不吞并 WorkCell 自己的 Run/RunRecord、host effect 和 retention/correction
事实；涉及 provider 的评估还要保留 adapter 的 provider identity。ledger 可以记录接受者的 disposition，
但接受权威不属于设施、runner、executor 或 adapter。

方法/skill 比较可以沿现有 skill protocol 形成局部 card；涉及 WorkCell/provider 的比较则依赖
WorkCell design acceptance。DeepSeek system comparison 不应反向成为 WorkCell core 的字段来源。

## 5. 最小设施候选

若未来 consumer 和 owner 出现，最小设施应只承载以下六类能力：

1. **冻结：** 分别记录 question、core card、task/source snapshot、fixture、baseline/treatment、
   模型/provider、harness、workspace、权限、rubric、停止条件和允许效果；card 引用这些对象，不能
   用“冻结一张 card”代替 fixture 或 rubric 的身份；
2. **隔离与身份：** 为每个 arm 保留可重建的 runner、card、workspace、source、candidate 和输出身份；
3. **执行：** runner 调用明确分离的 WorkCell executor 与 provider adapter；不把评估器偷偷变成新的
   WorkCell core，也不让 adapter 承担通用生命周期或比较结论；
4. **采集：** 保存 eval-specific output、event、usage、effect、failure、unknown、污染和时钟，并
   引用而不复制 WorkCell canonical Run/RunRecord；缺失的事实保持 `unknown`；
5. **比较：** 将 outcome、process、balancing cost、source coverage、quality 和 boundary safety
   分开，交给独立 reviewer；
6. **回返：** eval ledger 记录证据、review 限制、处置候选和 stale/recovery/rerun lineage；由接受者
   决定 `adopt`、`adapt-and-retest`、`retain-baseline`、`no-proposal`、`rollback` 或 `uncertain`。
   设施不取得 acceptance、采用或回滚权威。

这不是新协议提案。现有 [`evals/skill-evaluation/protocol.md`](../../evals/skill-evaluation/protocol.md)
已经承载大部分 card、隔离、standing、review 和 ledger 关系；未来实现首先应证明现有协议不能承载
某个真实 consumer，再决定是否增加 runner/control surface。当前不提出新的全局 schema、registry、
queue、scheduler 或 score。

## 6. 方案比较与当前处置

| 方案 | 适用条件 | 当前判断 |
| --- | --- | --- |
| A. 复用现有 eval protocol，先做单个固定问题的 runner/fixture | consumer 已明确，变量少，现有 protocol 足够 | **首选候选**；仍需 owner、card 和 identity |
| B. 现在先做通用评估平台 | 已有多个稳定 consumer，边界和维护 owner 相同 | `no-proposal-now`；当前会过早固化 loader、runner、指标和 runtime |
| C. 把评估能力直接做进 DeepSeek Harness | 系统设计和 WorkCell 已接受，评估确实是系统核心职责 | `deferred`；依赖后续 system design，不作为当前前置实现 |
| D. 每个 experiment 自带一套 runner | 试验高度异质且没有共享 contract | 只能作为局部 prototype 候选；容易重复、无法比较，需后续 review |

当前最小处置为：`retain-protocol-first / no-proposal-now-for-general-tool / route-to-consumer`。
不创建工具代码、不创建新的 runtime、不中断现有 WorkCell/DeepSeek 阶段顺序，也不把历史产物升级为
当前评估工具 evidence。

## 7. 最小下一实践与接受出口

在不启动 Run 的前提下，下一步只需由真实 consumer/owner 分别冻结一个 evaluation question、core card、
fixture/task/source snapshot 和 rubric，至少回答：

- 要比较的具体行为或能力是什么，而不是泛称“Agent 效果”；
- core card 如何声明 baseline 与 treatment 的唯一主要差异；
- task、source、model/provider、harness、workspace、权限和 reviewer 如何固定；
- 观察对象是 output、action、effect、progress、failure 还是 acceptance；
- 哪些结果属于 `unknown`、污染、负向反例或不可归因；
- 谁能接受、采纳、保留 baseline 或要求 rerun；
- 如果结果有价值，如何进入下一个方法/WorkCell/system decision；如果无价值，如何停止。

只有下列关系同时成立，才有资格讨论“设施实现”或复用：

1. 有 named consumer、card/fixture/rubric owner、runner owner、evidence reviewer 和 acceptance owner；
2. 有可重建的 question、card、fixture、task/source snapshot、candidate/config、model/harness/workspace/
   permission identity；
3. 有清楚的 allowed effect、隔离、取消、失败、回滚与保留规则；
4. 现有 protocol/fixture 不能承载该问题，且新增能力能改变下一项判断；
5. 有独立 review，且不会把输出长度、工具调用次数、一次成功或 self-report 当作行为改善；
6. 接受者同意结果如何进入 adoption、regression 或 no-proposal。

任一条件缺失，都保持 `candidate / hold / no-proposal-now`，不通过创建更多脚本或更多 Agent 来填补。

## 8. 证据上限、允许效果与 revisit

- **当前 evidence standing：** roadmap/plan candidate、现有 eval protocol boundary observation、历史
  eval artifact observation；没有本候选的 named consumer、current tool Run、matched improvement 或
  acceptance。
- **允许效果：** 更新本 review、item ledger、loop projection 和后续 card/fixture 需求；必要时在
  真实 consumer 出现后创建单项 experiment/eval candidate。
- **禁止效果：** 不实现评估平台，不创建通用 runner/registry/queue，不选择 Vercel AI SDK 或 DeepSeek，
  不修改 WorkCell core，不启动 synthetic Run，不把历史产物改写为当前 evidence。
- **revisit：** named consumer/owner、WorkCell acceptance、明确 provider comparison、现有 protocol
  无法承载的真实失败、可重建 runner/telemetry、或新的接受/风险关系出现时重开；仅有“以后需要一个工具”
  或文件数量增加时不重开。

## 9. 独立审查返回

只读独立审查指出：原稿把 card/fixture、WorkCell executor/adapter、eval evidence/ledger 和评估接受
权限表达得过宽，并让主序列看起来像所有评估都必须先于 WorkCell acceptance。本次修订已拆开这些对象，
将 eval-specific record 与 WorkCell canonical record 分开，并把 acceptance 收窄为接受者的权威；处置
仍保持 `retain-protocol-first / no-proposal-now-for-general-tool / route-to-consumer`。

本节只记录审查与修订 lineage，不把审查本身当作 candidate acceptance。修订后的针对性独立复读返回
`accept`：六个对象/权能边界均清楚，相关链接存在，没有改变当前处置的 decision-changing finding。
该结果只接受本记录的 bounded boundary review，不接受评估设施、工具实现、Run 或任何实验结果。

## 10. 与主 goal 的回接

本 review 完成的是 PL-08 的对象和边界补齐，不完成工具实现，也不改变主序列：

```text
方法/skill 局部评估：
  question → card/fixture/rubric → 现有 eval protocol → eval evidence/review → acceptance

WorkCell/provider 比较：
  WorkCell design acceptance → executor/adapter → eval card/Run evidence → review → acceptance

DeepSeek system 比较：
  WorkCell + system design acceptance → system consumer/card → eval evidence/review → acceptance
```

方法/skill 的局部评估可以在现有 protocol 内先独立形成；WorkCell/provider 和 DeepSeek system 的比较
必须等各自前置设计与接受关系成立。这个区分避免“想要控制变量”被错误解释成应立即实现一个大平台，
也避免后续系统设计没有可用的评估出口。
