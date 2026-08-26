---
kind: research-candidate
id: research-settlement-and-closure
status: settled
disposition: canonical-proposal
evidence: source-backed
settlement_route: canonical-proposal-or-archive
owner: "unknown"
consumer: planning-and-research-maintenance
review_at: reopen-on-active-surface-growth
---

# Research settlement and closure

lifecycle：`settled`
disposition：`canonical-proposal`
evidence：`source-backed`
boundary：`lifecycle-boundary-formed`
wave：`observed`
这表示结算规则已形成 canonical proposal，不表示正式接受、自动归档或运行时授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录响应用户对“research 会一直增长、扰乱项目”的整体观察。它研究的不是如何把研究写得更多，而是
如何让 research、experiment candidate、method candidate 和类似开放项在有限工作波次内获得真实去向。
它不自动接受、归档或删除任何现有研究，也不建立 scheduler、registry 或全局状态机。

## 0. 检索投影：frontmatter

每个 `theory/research/*.md` 与当前 planning research/experiment record 都在文件开头保留一层可检索
frontmatter。它是正文语义的检索投影，不是第二份 authority，也不替代正文的来源、证据、owner、接受或
lineage 判断。

- `kind`：区分 `research-candidate`、`research-record`、`review-record`、`concept-candidate` 和
  `experiment-record`；它表示记录关系，不表示质量或接受。
- `status`：只使用稳定的粗粒度生命周期词：`active`（仍在当前 decision surface）、`settled`（已有
  暂定去向/交接，仍可由新证据重开）或 `archived`（不在当前 surface）。它不替正文里的长 standing
  串，也不把 `settled` 解释为 accepted。
- `disposition`：当前处置关系，例如 `bounded-trial-ready`、`canonical-proposal`、`no-proposal`、
  `archive-inconclusive` 或 `superseded-by-round-2`；它不与 `status` 或 evidence 合并成万能 enum。
- active record 还应尽量给出 `settlement_route`、`owner`、`consumer` 和 `review_at`；如果暂时 unknown，
  必须显式写出 unknown 和回返条件，而不是省略后伪装成无依赖。
- `consumer` 可以写成 consumer class/route（例如 `planning-methods` 或 `harness-system-design`），不等于
  已找到 named consumer；named owner、独立 reviewer、隔离条件、采用窗口和 settlement evidence 仍需正文和
  bounded record 回读。

frontmatter 的改变只改变检索和维护投影；若它与正文或 canonical source 冲突，先修正 projection 并回到
正文/owner 重建 standing，不用 frontmatter 覆盖事实。

## 1. 核心判断

`research-open` 只能描述一个暂时的工作状态，不能成为长期容器。研究的价值在于改变下游判断、形成
可试行的对象、进入正式接受路径，或证明当前不值得继续投入；如果研究只不断产生新的 open question，
却没有 settlement relation，它会把 planning 的探索空间当成项目主线并持续膨胀。

对用户所说的 candidate-driven research，最小闭环是：

```text
raw idea / research question
  → bounded research round
  → decision-changing result
  → bounded trial / canonical acceptance proposal
  → adoption observation and settlement

or

bounded research round
  → no decision value / insufficient value / superseded
  → reasoned archive with revisit trigger
```

“归档”不是删除或否定历史，而是把它从当前 active decision surface 移出，保留 source、结论、未知、
reason、lineage 和 reopen trigger。研究可以被归档为 `no-value`、`inconclusive-costly` 或 `superseded`；
不能把“暂时没空处理”伪装成其中任一个。

## 2. 研究对象与结算对象分离

需要区分三种东西：

- **research candidate：** 待调查的问题、来源、假设、矛盾、unknown 和预期改变的决策；还未完成研究；
- **research record：** 已执行的调查、来源核验、观察、反例、推断、限制和下一判断；
- **settled destination：** 研究结果交给真实下游后形成的 bounded trial、canonical proposal、design/skill/eval
  candidate，或带理由的 archive disposition。

research record 完成一轮调查并不等于结算；只有它通过明确链接把结果交给下游，或把“不再继续”的理由
写入 archive disposition，才离开当前 research surface。

## 2.1 研究结算不等于 harness 采用

这里有一个必须单独守住的边界：`research settled` 只说明研究问题获得了一个有理由的去向，不说明结果已经
进入 harness、被某个 skill/方法载体加载，或在后续 work 中产生过作用。如果不拆开这两个关系，就会出现
“研究处理完成 → 资料归档 → 实际系统从未吸收”的假完成。

对需要进入工作系统的候选，至少要区分四个可回读的交接层级：

1. **semantic handoff：** 研究结论已经交给明确的 theory、design、plan、skill 或 system candidate；记录
   目标 source、允许效果、边界和接受者。
2. **carrier handoff：** 目标载体已经形成或修订，例如项目内 skill、工作方法、协议设计或有界试行卡；保留
   source identity、revision、lineage 和独立 review。载体存在不代表 harness 已加载。
3. **activation observation：** 在真实 harness/runner 的可重建 work 中，能证明该载体被选择、读取或执行，
   并留下 application receipt；只在文档中被链接、复述或复制不算 activation。
4. **adoption evidence：** 在相称的后续 work、回归窗口或 matched trial 中，观察到它实际改变了目标关系，
   并由接受者决定保留、改写、回退或不采用。一次 activation 只能证明使用，不自动证明效果。

这四层不是 frontmatter 的公共状态串，也不要求所有研究都走到 runtime。它们是判断“当前主张走到了哪里”的
独立关系：一个设计研究可能在 semantic handoff 后完成本轮，但一个声称改善 harness 行为的方法，至少要把
carrier、activation 和相称的 adoption/reopen 关系交给对应 owner。

因此，归档的允许条件要分开看：

- `archive-no-value`、`archive-inconclusive` 或 `archive-superseded` 只在当前结果没有未完成的应用义务，或已有
  明确 successor/无价值理由和 reopen trigger 时成立；它们不能掩盖“有价值但尚未交接”；
- 有价值但 consumer、carrier、owner 或 activation 尚未形成的候选，研究记录可以结算为 proposal，但其下游
  application obligation 必须留在当前 item/plan projection，使用 `integration pending` 的正文关系和 review
  条件，不能把目标候选一起归档；
- 已完成 semantic/carrier handoff 但尚无真实 activation 的候选，必须明确标为“未验证加载”，不能把载体存在
  误写成 harness 已采用；
- 只有 application receipt、相称的 independent review 和明确的采用/不采用/回退决定都能回读时，才可以关闭
  该 application obligation。关闭研究记录与关闭应用义务是两个事件，必须各自留下 lineage。

最小的 downstream handoff 可以由现有 `consumer`、`owner`、`settlement_route`、`review_at`、item ledger 和
Todo 的 `candidate_source/applicability/focus/return` 关系承载；不因此新增全局 adoption registry、自动 loader
或把所有 archive 内容灌入每次上下文。未来若要保证跨重启、并发或不可信 caller 仍会 activation，必须再由
host/base/runtime 提供可重建的选择、持久化和恢复证据。

## 3. 结算契约

每个新增 research candidate 在进入 current planning projection 前，至少要有以下关系：

| 关系 | 要回答什么 | 缺失时的处置 |
| --- | --- | --- |
| `question` | 调查什么，不调查什么 | 不能打开 research round |
| `decision` | 结果会改变哪个真实判断/行动/形式 | 只有背景兴趣时降为 inbox 或 archive candidate |
| `source` | 当前 authority、证据、冲突与 unknown | source 不足时 hold，但必须有 return |
| `settlementRoute` | trial、canonical proposal、design/skill/eval handoff 或 archive 哪个下游接收 | unknown 必须在下一 checkpoint 解决或归 archive-inconclusive |
| `nextWave` | 下一项最小调查/试验是什么 | 没有下一动作不保留 active research |
| `owner/consumer` | 谁使用、回写或接受结果 | unknown 可短期保留，但必须带 owner discovery/route 条件 |
| `reviewAt` | 在哪个 bounded wave/checkpoint 结算或重开 | 不使用无限期 `research-open` |
| `returnCondition` | 哪个新证据会 reopen，什么情况直接归档 | 没有回返关系不能称为 hold |

这里 `reviewAt` 是 planning checkpoint 或明确的下一运行机会，不声称后台 scheduler 会自动唤醒；没有新的
运行机会只能诚实写“未复查”，不能写成持续监控。

## 4. 结算去向

结算去向不是一个与 evidence standing 混合的万能 enum；它是当前 research record 对下游的关系。

### A. `bounded-trial-ready`

研究已经形成可在有限 scope、期限、允许效果、保护条件、baseline/treatment、outcome、rollback 和 review
owner 下试行的 candidate。它进入 [`provisional-adoption.md`](provisional-adoption.md) 的 bounded trial
record；试行仍不等于正式接受。

### B. `canonical-proposal`

研究结果稳定到足以改动 theory、design、protocol、plan 或 skill candidate，但接受关系仍由对应 owner
决定。研究 record 结算为 proposal/acceptance handoff，不继续以独立 research-open 占据主线。

### C. `archive-no-value`

研究对当前 decision、consumer、风险或可行行动没有足够价值，且没有合理的新证据触发条件。保留结论和
来源用于历史追溯，但从 active planning surface 移出。

### D. `archive-inconclusive`

研究没有得到可支持的结论，且继续投入的成本、污染、owner 缺失或边界风险不值得当前阶段承担。它不是
“结论为假”，而是“当前不值得继续作为 active research”；如果未来出现 named consumer、source/runner
identity 或 decision-changing evidence，再按 revisit trigger 新开 round。

### E. `archive-superseded`

问题已由新的 source、canonical design、experiment 或更合适的 research object 取代；保留 supersedes edge，
不在旧记录上追加假性 current standing。

### F. 受限 `owner-gated hold`

只有重大 owner/权限/共享基线/安全选择确实阻止下一步时才可暂留；必须同时有 reason、named owner class 或
明确 `owner unknown`、reviewAt、escalation/return 和允许的局部 preparation。它是临时例外，不是研究的
常规终态，也不能无限续期；到 reviewAt 仍无真实回返，结算为 archive-inconclusive 或 no-proposal。

## 5. 对现有 planning 的初步分流

以下表保留为第一版 inventory 与当时的候选分流，不覆盖当前 item ledger 或本记录 §7 的结算结果；它不倒写
各 canonical source。当前 route 变化必须回到对应 canonical record 和 item ledger，不能由这张历史表推断。

| 当前 research-like item | 当前观察 | 第一结算路线候选 | 未决边界 |
| --- | --- | --- | --- |
| Todo reminder carrier | pilot 已观察：treatment 3/3 使用 reminder，但与 baseline 都 3/3 primary pass，无 outcome delta；未制造长时遗忘压力 | 已结算 `settled / archive-inconclusive` 的 carrier/readability diagnostic；不在原 record 上重复同一短 card | 若未来重开，必须有长时间执行问题、独立任务实例、primary outcome 和真实 consumer |
| controlled experiment design | problem-first 规则已修订；旧 pilot 仅为窄 carrier diagnostic，新的主 card 见 [`long-horizon-agent-forgetting-design.md`](../../planning/records/long-horizon-agent-forgetting-design.md) | 保持 `active / adapt-and-retest` candidate；先冻结 long-horizon forgetting card，再决定 bounded trial 或 archive | named experiment/evidence owner、连续性机制关系、重复/匹配单位、隔离、regression 和 owner acceptance |
| long-horizon agent forgetting experiment | 新建 design candidate；问题、遗忘类型、机制关系、刺激、checkpoint primary outcome 和 provider 混淆边界已形成 | 保持 `active / bounded-trial-ready` 之前的设计阶段；没有 named runner/identity/precision plan 不启动 Run | 真实 long-horizon task consumer、runner、可重建 identity、独立 review 和接受关系 |
| provisional adoption | 概念边界、最近邻、最小结构和进入/退出关系已形成；没有真实采用 consumer 或 trial | 已结算 `settled / canonical-proposal`；不创建全局状态 enum 或 policy registry | 真实 bounded trial 仍需新 candidate、owner、scope/期限/允许效果/rollback 和 acceptance relation |
| research settlement and closure | lifecycle boundary、frontmatter projection 和第一项 pilot 结算已形成；该表形成时 settlement wave 尚未关闭 | 已结算 `settled / canonical-proposal`；若 active surface growth 或 closure 规则反例出现，再以新 maintenance round reopen | 能否继续减少 active surface，而不是制造 metadata、review 或 scheduler 负担 |
| planning information architecture | 六层信息结构、`planning/index/` transition、Main dogfood 和 cold-reader 观察已形成；adoption 和长期收益未知 | 已结算 `settled / canonical-proposal`；新的 discovery-cost/authority probe 另开 round | 是否出现新的 decision delta、authority 误读或真实 adoption evidence |
| Agent initiative | 研究边界和机制假设已形成，但无 named system consumer、无 Run | `owner-gated hold` 一轮；无 consumer 回返则 `archive-inconclusive` | 主观能动性未来是否进入 DeepSeek/system design，不能用现有文献替代 |
| Agent harness throughput | source/trace/design 已形成，named runner/telemetry owner 未回返 | `owner-gated hold`；无 owner return 则 `archive-inconclusive / no-proposal` | 是否有真实 latency consumer 和可重建 Run |
| Main agent project work method | 用户标记为重要且优先级较好；本次 settlement wave 已产生 `planning-dogfood-observed / attribution-unknown`，但没有 matched direct comparison | 保持 `active / adapt-and-retest`；下一条真实多步骤 wave 预先冻结 direct-vs-delegated comparison；无 decision delta 或协调净成本过高则 `archive-inconclusive / no-proposal` | named project-scale consumer、贡献隔离、适用性回接、协调成本、direct baseline 和 acceptance owner |
| information management / archive freshness | `IN-2026-08-26-006A` 仍是 inbox raw candidate，用户明确标记为值得研究但不紧急，尚未进入 active research surface | 保留在 inbox；待有可用 bounded wave 时先冻结 archive value、freshness/staleness、source revision 和 reopen card，再决定研究或 `no-proposal` | archive 如何被发现/复用，current/in-progress/stale/superseded 的最近邻，时效 owner、触发器和维护成本 |
| iterative improvement / iteration process | `iteration-process-audit` 已结算为 `settled / canonical-proposal` 并交给 `iterative-improvement`；方法本身仍无 project-scale behavior Run | `iterative-improvement` 保持 active，等待一次真实多步骤 wave 的 bounded dogfood；没有 decision delta 则 `archive-inconclusive / no-proposal` | runner/consumer、改善对象、对照、采用窗口和 regression owner |
| philosophy-gene-one | 总研究已形成三方向框架和 16 条 source-bound proposal；逐项 reading/rebuild 与下游使用关系仍 pending | 已结算 `settled / canonical-proposal`；逐项 package 不再由总研究重复承载 | source revision、人类点名定稿、reading owner、source-bound package、最近邻和下游 acceptance relation |
| P01–P16 reading packages | 仍有 source-bound reading/acceptance pending，部分已有独立 review | 逐项 `canonical-proposal` 或 `archive-inconclusive`，不得继续以无期限 research-open 聚集 | reading acceptance owner、最近邻和真实使用关系需要逐项结算 |
| 历史 research review / archive audit | 已完成 source/review/lineage 作用，部分只是过程证据 | `archive-superseded` 或保持 bounded record，不重新打开 research | 是否存在新的 source/consumer/decision delta |

该表不把“有未知”当作继续研究的充分理由。未知只有在会改变当前 decision、且有真实下游和相称最小调查
时，才值得保持 active。

## 6. 结算操作规则

1. 新 research input 先进入 inbox，记录 raw、source、decision candidate 和 return；没有 `settlementRoute`
   不进入长期 current research inventory。
2. 开始一轮 research 前冻结 card：问题、来源、owner/consumer、最小 evidence、停止条件和下一 destination。
3. 一轮完成后必须在同一 bounded wave 内追加 `settlement event`：结果、证据上限、destination、reason、
   source/lineage、reopen trigger；不要只把 status 改成更长的 `research-open / acceptance-pending`。
4. 能形成真实有限效果的结果，交给 controlled experiment / bounded trial；没有可执行对象或 decision value
   的结果，归档；稳定到改变 canonical source 的结果，交给对应 acceptance owner。若结果有价值但尚未完成
   semantic/carrier/activation 交接，只关闭 research round，不关闭下游 application obligation。
5. 每次 checkpoint 先扫描 active research 的 `reviewAt` 和 destination；没有 decision delta 的不重新综述，
   直接 `done-for-now` 或 archive；不得因研究文件数量增加而创建新的同层 research record。
6. 归档后只在 reopen trigger 命中时创建新 round，保留 `supersedes`/`reopens` lineage；不得把旧 archive
   直接恢复为 current fact。

## 7. 当前处置与下一步

本记录现结算为 `settled / canonical-proposal`。本轮 settlement wave 已证明这套规则可以在不删除历史、
不偷换 acceptance 的前提下，把五个 research-like surface 交给 canonical proposal 或 archive，并为剩余
active item 保留 consumer、证据上限和 reopen 条件；因此它不再以 `research-open` 占据当前主线。

如果 active surface 后续增长，或出现“结算规则制造的 metadata/review 成本超过减少的 unresolved surface”
这一反例，再以新的 bounded maintenance round reopen；不创建永久 scheduler、registry 或 runtime gate。

## 8. 2026-08-26 research-surface settlement reconciliation

本轮因当前 checkpoint 仍发现多份 `status: active` 的 research-like record，开启一条限定在现有 source 和
frontmatter 的 maintenance wave。目的不是重新综述研究内容，而是检查每项是否已经有真实去向，避免把
`active`、`acceptance-pending` 和“当前可执行”混成一个长期容器。

| record | current destination | why it is settled now | reopen trigger / remaining unknown |
| --- | --- | --- | --- |
| controlled experiment design | `canonical-proposal` | problem-first、变量、TEVV、分配和 disposition 已交给 long-horizon design | 新 comparison consumer、方法反例、experiment owner、runner 和 acceptance |
| agent harness throughput | `owner-gated-hold` | trace/identity/decision surface 已形成，但没有 named runner、telemetry 或 latency consumer | named runner/consumer、冻结 card/clock/telemetry，或无回返后的 archive |
| Agent initiative | `owner-gated-hold` | `goal-linked bounded initiative/action loop` 已形成边界，但没有 system consumer 或可比较 Run | named consumer、owner、wake-budget comparison 或真实错误代价 |
| engineering control and reliability | `canonical-proposal` | source fingerprint、反馈/可观测性/稳定性/作用能力边界已交给后续 system design | primary-text access、真实扰动 consumer 或改变映射的反例 |
| complexity and tool readiness | `canonical-proposal` | 在本轮真实 planning wave 中观察到 profile、工具复用和 direct/sequential 选择如何改变下一处置 | 第二 consumer、tool boundary counterexample、可比较成本/收益 |
| iterative improvement | `canonical-proposal` | 方法 proposal 已交给 living theory 与 planning/application surfaces | project-scale regression、new consumer 或 adoption evidence |
| Main project work method | `canonical-proposal` | 本轮完成真实 planning dogfood，并明确 Main 保留整体、委派 no-proposal 与 shared-authority sequential fan-in | 新 project-scale wave 的匹配 direct/delegated 对照和独立 review |

这些 destination 不是 acceptance，也不是自动进入 trial；它们把 research result 交给下游或临时 hold，并保留
source、证据上限、owner unknown 和 reopen 条件。`long-horizon-agent-forgetting-design` 仍作为独立的
experiment-record/design-candidate 保持 active，因为它是待 owner 输入的试行设计，而不是未结算的 research
综述；`main-goal-description-reconciliation` 仍是当前 goal projection。新的信息“干燥/湿润”仍只在 inbox
pending capture，尚未进入本轮 settlement inventory。

本 wave 的结论是 `settlement-reconciliation-observed / no-matched-effect / no-new-research-surface`。如果下一
checkpoint 发现 owner-gated hold 没有实际回返，必须按规则转为 `archive-inconclusive / no-proposal`，不能只
把 `review_at` 向后移动；如果新增 research input 没有 settlement route，则留在 inbox，不进入长期 inventory。
