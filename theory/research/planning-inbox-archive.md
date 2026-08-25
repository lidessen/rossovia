# Research — planning / inbox / capture / triage archive evidence

**Standing：** `research / local evidence lane`。本文是现行 living tree 与
`archive/` 病例的来源有界调查，不是 living theory、skill 载体、runtime
protocol、接受决定或实现授权。`archive/` 只作为历史病例与反例，不作为现行
模板；archive 中出现的命令名、字段、路径、阈值和 vendor/runtime 绑定均不
自动迁入。

**范围：** `AGENTS.md`、`planning/plan.md`、`planning/roadmap.md`、现行
`theory/harness/`、相关 living theory/skills，以及 archive 中和
inbox/capture/triage/todo/plan/roadmap/queue/workflow/goal/continuous
execution、执行记录、输入重连与接受有关的设计、skills、实验和失败记录。

## 1. 来源与 standing

| 来源 | 当前 standing | 这次能支持的事实 | 不能支持的事实 |
|---|---|---|---|
| `AGENTS.md` | living project instruction | 活树路径、术语、archive 边界、harness 不实现 base | 不定义 inbox、todo 或 runtime 协议 |
| `planning/plan.md` / `roadmap.md` | living planning | 目标树、长期方向、当前仍开放的 base/模块问题；“基座代码还没开始” | 不授权实现、文件数量或固定 workflow |
| `theory/harness/theory.md` | living design theory | Task/Plan/Run/Cell、证据、接受、拓扑、runtime ownership 的语义区分 | 不是协议、schema、实现或接受决定 |
| `theory/harness/iterative-improvement.md` | living method/design theory | baseline/candidate、匹配证据、未知、停止与净改善的边界 | 不把多轮、ledger 或日志变成强制 runtime |
| `.agents/skills/*` 与相邻 living theory | living method/skill expression | 注意、委派、skill 形成、形式选择、Agent-facing 返回的判断与出口 | 不拥有项目真理、接受、生命周期、并发或恢复 |
| `archive/design/*`、`archive/skills/*`、`archive/legacy/*` | historical v0.5 design/skills | 可引用的历史决策、旧设计、反例和失败路径 | 不是当前设计、模板、兼容契约或现行命名 |
| `archive/evaluations/*`、`archive/evaluations/evidence/*` | historical evidence | 在特定冻结 fixture、模型、adapter 与权限下的观察及其限制 | 不推出普遍能力、当前可靠性或理论权威 |
| `archive/chronicle/*` | historical pilot | observation/record/projection/correction 的病例边界 | 不自动成为当前日志协议 |

当前项目入口明确指出：哲学基础是 `theory/philosophy.md`，harness theory
只在 `theory/harness/theory.md`，`archive/` 是 v0.5 文档暂存，活树目前
不实现 harness base（`AGENTS.md:5-24`；`planning/plan.md:1-31`）。因此本
报告只提出研究层处置，不修改 living theory、planning、skills 或 protocol。

## 2. 现行 living 事实

### 2.1 Planning、Plan 与 Task 不是同一个对象

现行 roadmap 只给出方向：理论/设计、可独立使用的方法 skills、本项目
`.agents/skills`、未来 1+N base 与软件层；N 的具体模块、载体与合成方式仍
开放（`planning/roadmap.md:1-17`）。计划文件的完成条件是活树结构和理论
迁移，不是基座代码（`planning/plan.md:7-31`）。所以 `planning/` 是项目
方向与短期准备的 source，不是可执行任务队列，也不产生“正在执行”的事实。

现行 harness 的核心区分是：Task 不是用户句子、提示词、数据库行或 Todo
列表，而是“期望改变 × 对象与源 × 环境 × 可能效果 × 必留证据 × 接受拥有者”
的关系（`theory/harness/theory.md:59-63`）。Plan 回答整体必须完成什么、
后来拥有者如何知道完成；它保留结果、硬约束、权威源、贡献边界、依赖、
证据、接受、合成拥有者与重连条件，但不编码供应商、worker 数、固定深度、
角色枚举或 swarm runtime（`:95-114`）。

这使“plan 文件存在”“todo 被勾选”“run 返回”“结果已接受”不能互相代称。
小任务可以直接进入一个 work unit；模型是变换关系，不要求每个任务走同样
阶段（`:65-93`）。分解只在源、效果、上下文、接口和可重建证据真正可分离
时发生；重组不是拼接或多数投票（`:91-93`）。

### 2.2 执行、观察、验证、评审、接受各自发言

现行对象表规定：Intent/Task/acceptance 由 Principal 或委派域拥有；Run
拥有因果执行身份与效果边界；Cell 只拥有有界工具活动和终态证据；机械证据
只建立可复现事实；候选只提出主张；语义评审只提出适配/未知的推理发现；
接受才由 Principal 或明确委派的接受拥有者采纳、承担残余风险并授权不可逆
承诺（`theory/harness/theory.md:116-133`）。

“验证”也不是一个总状态：观察、机械符合、语义判断、权威是四种不同动作；
机械通过不证明相关性、完备性、意图满足，评审不授权（`:135-149`）。未知
必须声明，不能塞回 Todo、模糊状态或成功措辞（`:151-157`）。

### 2.3 方法、文件、脚本、runtime 的所有权测试

若改变可以保持同一 Task/Run/Cell/effect/evidence/acceptance 契约，属于
方法表达；若需要新生命周期、因果同一性、并发控制、恢复、权限强制或持久
证据，已越过方法层进入 base/adapter（`theory/harness/theory.md:24-40`）。
迭代、角色、并行调查是条件性方法，不应因某次失败变成固定运行时路径；单次
提示词失败也不是 base 证据（`:42-57`）。

living skill-formation 给出同一出口：一次性工作归当前任务，项目始终规则归
项目指令，持久知识归普通文档，确定性变换/外部操作归脚本或工具，生命周期、
身份、权限、并发、恢复、持久效果归 runtime/base，证据不足时返回研究或
`no-proposal`（`.agents/skills/skill-formation/SKILL.md:54-66`）。
形式选择进一步规定：有限计划可以承载临时义务、依赖、证据、综合与接受条件，
但完成后应能退役，不变成永久语义残骸（`.agents/skills/form-selection/SKILL.md:85-97,126-137`）。

### 2.4 相关 living 方法的可吸收边界

- `attention-management` 只判断当前决策边界上哪个 governing relation 应
  占据注意，以及最小 cue/reset/reform；它明确不把 todo 变成语义权威、不让
  每个局部问题进入主线，也不把真正的 task switch 误叫 return
  （`archive/skills/attention-management/SKILL.md:22-37,75-117`；这是历史
  skill 的内容，但其相同判断已在 living 研究/理论中被吸收，见下文 standing）。
- 现行 harness 对拓扑的结论是 direct/sequential/parallel/nested 随实际关系
  选择；Plan 不绑定 queue、swarm 或固定角色，重复同一尝试不算迭代
  (`theory/harness/theory.md:95-114`)。
- `skill-formation` 要求一个可重复的判断/行动差距、正负触发、最近邻、可检验
  成功/拒绝/转交，且 skill 不是 runtime 保证或一次性计划
  (`.agents/skills/skill-formation/SKILL.md:28-64,83-104`)。

## 3. Archive 病例与可用证据

### 3.1 Goal / record / close：方向、路径、结束不是一件事

历史 `goal-driven` 把多周不确定 initiative 分为稳定 compass 与不断变化的
path：`GOAL.md` 记 why，record 记 tried/observed，新 Agent 可恢复方向但不把
记录当方向（`archive/legacy/skills/goal-driven/SKILL.md:7-19,92-107`）。它
要求每次 session 的 criteria check 引用当次具体观察；没有观察只能是
`unclear`，不是 ✓（`:156-189,240-258`）。这提供了“计划/目标状态不能由日志
数量或乐观叙述代替”的历史证据。

同一 skill 还有三类容易混淆的事件：设置目标时逐节 human approval；结束 session
时写 evidence-bearing record；证据威胁 General Line 时以 Type A/Type B STOP
停下并等人决定（`:126-238`）。中断但未获确认的 session 会保留
`[unconfirmed draft]`，下一 session 先 ratify/revise，再继续（`:200-204`）。

close 只适用于 achieved、abandoned、superseded 三种终态；暂停不等于 close，
关闭时先写 retrospective，再归档，并且“终态由 human 决定，不能为了绕过
STOP 而 close”（`archive/legacy/skills/goal-driven/commands/close.md:1-24,126-137`）。
这些是历史方法证据，不是现行文件名、月份轮转或阈值的授权。

### 3.2 Mission continuity：有限开放义务，不是全局 backlog

历史 Decision 021 采用一个 Git-tracked Mission Record 表达 material multi-session
mission：一条 mainline contradiction/acceptance，有限 branch 集，branch 必须
有 source、purpose、parent、return condition、status；`closed` 必须给出
`integrate`、`no-change` 或 `abandon` 和 concrete `mainlineDelta`
（`archive/design/decisions/021-git-tracked-mission-continuity.md:7-42`）。

进入 Mission 的 gate 不是“出现一个念头”：义务必须获授权、跨 safe point 未完、
遗忘会损害 acceptance/mainline return、并且有独立 return/closure condition；
立即步骤留在当前 plan，未批准 idea/observation 不成为 active task
（`:44-68`）。该记录明确禁止 global backlog、worker queue、issue tracker、
resident manager、automatic continuation，并禁止从 Git/PR/Issue/log/prose 自动
创建或关闭 commitment（`:64-97`）。

这是一条重要的“不要把 inbox/queue 语义扩大为任务权威”证据。它也说明一个
有限的 operational carrier 可以存在，但只在跨 safe point 且会影响主线时存在。

### 3.3 Todo carrier：勾选完成不等于语义完成

`todo-obligation-carrier` 是 development probe，明确只测试“具体 obligation
与 reopen condition”对 salient branch 后返回的假设，不声称每个任务都需要
Todo 或一种 carrier 可泛化（`archive/evaluations/evidence/2026-08-06-todo-obligation-carrier/README.md:1-27`）。
它把 obligation arm 与 ceremony arm 的差异隔离为内容：前者写 primary artifact、
companion return obligation、whole-task reconciliation 与 reopen condition，
后者只写 Prepare/Execute/Finish（`.../README.md:41-50`；`semantic-audit.md:17-42`）。

该运行最终**无效**：observer 读取了错误的 tool-call surface；两 arm 都没有
维护冻结的 read-then-update cadence；manifest digest 也有 provenance 错误
（`.../RESULT.md:1-14,67-102`）。重建后仍发现两 arm 都有 initial/final 三项
checkbox，但 0/4 维护了每次 artifact write 前的 required read-then-update；
且 companion index 遗漏事实。结论明确写出：completed three-item Todo 可以与
companion facts omission 共存，Todo completion 不是 semantic completion
（`.../RESULT.md:77-102,121-142`）。这是一条直接的失败证据，不是 obligation
carrier 的正面因果结论。

后续 `todo-return-trigger` 把 Todo maintenance 改为观察变量，改测一个
host-owned、事件定时的 return-trigger；treatment 只重新呈现已经存在的 open
companion obligation，semantic completion 仍由独立 artifact review 判断
（`archive/evaluations/evidence/2026-08-06-todo-return-trigger/README.md:16-28,51-73`）。
即使该 packet freeze-ready，也没有 external run authorization，且它只支持
“可测试的最小机制 seam”，不支持周期提醒、普遍 Todo 或长期运行结论
（`:1-14,151-174,225-231`）。

### 3.4 Live input / queue recovery：收到、重连、执行、接受分层

历史 live Mission input probe 将新 Principal input 置于 durable safe point：旧
parent 停为 `input-pending`，其 child settlement 只作 evidence，不能继续 stale
parent；输入经 proposer 与独立 verifier，再由 authority-bearing host commit，
最后以新 intent anchor 开新 turn（`archive/evaluations/2026-07-21-live-mission-input-reconciliation-probe.md:7-16,46-56`）。
该病例明确是 synthetic/read-only/fixture authority，不能证明自然语言 authority
inference 或 writable safety（`:83-97`）。

queue-recovery probe 进一步显示：两个输入在 turn 中到达，carrier graceful restart
后仍保留 ordered queue；只 commit watermark 1 时不能开新 turn，直到最终
reconciled watermark 2 才启动一个 fresh anchor-bound turn（`archive/evaluations/2026-07-21-live-mission-queue-recovery-probe.md:7-16,44-56`）。
早期失败还暴露了两类问题：实验重复猜 runtime-owned filename hash；verifier 将
progress watermark 错写进 active intent statement，造成 durable purpose drift
（`:63-87`）。最终 claim 仍 guarded：只测 graceful restart、synthetic inputs、
fixture authority、read-only；crash、conflicting corrections、automatic semantic
authority、writable execution 均未知（`:89-102`）。

### 3.5 Observation chronicle：记录可重建，不自封真理

历史 Observation Chronicle 将 source-native record → Observation Record →
claim/review/decision → projection；record 只保留 provenance-preserving statement，
report/metric/dashboard/index 必须指回 source，不能因方便成为事实源
（`archive/chronicle/README.md:7-20`）。每个 record 用 immutable path；旧观察不
回写成“当时就知道”，修正追加 correction record；每文件一条避免并行 worktree
共享 JSONL append point 冲突（`:22-42`）。Recorder 不得改 raw source、覆盖历史、
推断因果、接受工作或把 schema validity 变成 truth（`:44-56`）。

这支持“执行记录 ≠ 接受”和“归档/投影 ≠ 语义权威”，但 Chronicle 本身是历史
pilot，不是本树的通用 logging product。

### 3.6 Personal task app：Inbox 作为 view 的历史设计（非当前规范）

archive 的 personal-task-app 试验把唯一 canonical Task 与多个 projection 分开：
Inbox 是未归类 open task 的 projection，不是容器；Today/project/board 都读同一
Task record；Review 是完成任务和 focus record 的只读时间投影
（`archive/experiments/personal-task-app/DESIGN.md:99-146`）。capture 只收标题，
默认落 Inbox，不强迫 triage；triage/schedule 是后续对同一 Task 的字段变更，
不是复制 Task（`:181-215`）。完成时从 open list 离开但仍在 Review，可 reopen；
archive 对 project 设计被规定为可逆（`:156-164,237-243`）。

这些区分可作为历史概念病例，但没有得到 living acceptance；不能据此创建
Inbox、Today、Review、board 或 canonical task schema。

### 3.7 Raw capture 与“秘书式”结构化：保留原话，不偷换授权

新增问题要求的最接近历史证据不是一个现行 inbox 实现，而是 cognition/memory
与 Chronicle 的 source/projection 边界。`agent-cognition-memory-engineering`
把 lifecycle 明确拆为 capture、formation、retrieval、update、maintenance、
acceptance，并警告不能把每个 event 变成永久 memory，不能给 extractor 隐藏的
fact authority（`archive/design/research/agent-cognition-memory-engineering.md:10-21`）。
其 repeated-failure 表直接命名了本问题的风险：raw event 与 admitted memory
共享 store/status 会把 retention 误当 truth；一个 extractor 同时选择、抽象、
泛化和 mutation 会造成不可审查的语义权威与 provenance loss；background thread
会造成 lost/duplicate/invisible work（`:177-189`）。

该研究给出比“自动整理”更窄的历史候选：ingress 先做 deterministic scope、
privacy、identity、dedup、debounce，capture-worthy 不等于每个 raw event 都成为
durable source；ordinary conversation/traces 可合并为 bounded episode，在 quiet
或 task boundary 再处理；source identity、predecessor、lineage、supersession 和
rebuildable projection 才是 deterministic kernel，extraction、semantic relation、
relevance、refresh scope 仍是 domain judgment；Cells propose，host admits or
supersedes（`:191-219`）。这支持“秘书可以做可回溯整理”，不支持“秘书替用户
决定承诺、优先级或授权”。

Chronicle 的历史 Decision 018 是更直接的形式证据：

```text
source-native record → Chronicle receipt → claim / review / decision → projection
```

source-native record 保留原始观察与上下文；receipt 只声明 provenance、method、
limitation、correction relation；claim/review/decision 才能作 inference 或 commit；
projection 只改善访问、可重建、无 fact authority
（`archive/design/decisions/018-observation-chronicle-pilot.md:21-53`）。对于未
自动记录的人的观察，历史规定保留最小 source/exact wording where feasible，并
明确 observer、recorder、source unavailable；Agent 可代录，却不能替人表达
preference、approval 或 strategic decision（`:55-70`）。这可迁移为原话与结构化
视图并存，但 receipt 不得冒充解释或接受。

Event-triggered reflection sidecar 进一步规定：只有会改变后续决定的 anomaly、
correction、source/projection conflict 或不能诚实 settle 的结果才形成 candidate；
recorder 保存 observation/method/limitation/source ID，不诊断 cause、不自动开 task；
safe point 再问是否改变下一 practice，若不改变，记录留着但不继续消耗注意
（`archive/design/decisions/019-event-triggered-reflection-sidecar.md:18-55`）。
这提供了对零散观察、疑问、半成形计划的保守出口：先捕获并保留，不因被捕获就
成为 active commitment。

对“批量汇总需用户澄清的歧义”，历史 Decision Brief 是最接近的可用证据，但它
是人类决策呈现形式而非 inbox 规则。Brief 明确是 decision projection，不是
decision source，不能 approve recommendation、扩大 scope 或把缺失 alternative
变成默认（`archive/design/operations/DECISION-BRIEF.md:7-18`）；输出必须区分
current state、proposed state、hard constraints、unknowns、options、tradeoffs，
并让 Principal 知道每个 reply key 只授权什么（`:31-79,102-115`）。当 evidence
不足以区分选项时，加入 bounded discovery/hold，而不是制造 recommendation
（`:20-29,72-79`）。因此可汇总“需要澄清的项”，但汇总的每行应是“原话 + 可回溯
解释 + 冲突/未知 + 一个澄清问题 + 若回复将授权的范围”，不是自动批量勾选或升格。

历史 PlugMem 研究（仍为 open design research）也保留了同一边界：episodic
source experiences、semantic/propositional observations、procedural lessons
可以作为三种 derived view，但每个 node 必须回指 source locator/revision/digest、
extraction record 和 applicability scope；抽象影响动作前必须回到 exact source
witness；不自动 admit semantic memory（`archive/design/research/plugmem-task-agnostic-memory.md:48-67,123-152`）。
它明确未在本项目复现，不能变成 inbox 或 memory database 的授权（`:1-27,154-172`）。

据此，秘书式整理的最小语义账本应保留以下彼此不可互换的字段（只是研究候选，
不是 schema proposal）：

这里的 raw capture 不预设它是“任务”：随意想法、观察、疑问、明确 Todo、半成形
计划、用户偏好或暂时无法分类的片段都可以先作为同一种 source-bearing input
保存；类型、关系和行动只是后续的候选解释。正因为输入形态开放，结构化层必须
逐项回指原话并把“未分类/待澄清”作为正常结果，而不能用统一 Task 字段强行收敛。

| 层 | 最小内容 | standing / 可做的事 | 明确不能做的事 |
|---|---|---|---|
| raw capture | 原话/原文、来源、时间、上下文、capture identity | 忠实保留、去重候选、让用户回读 | 不代表已理解、真实、承诺或授权 |
| interpreted projection | 结构化摘要、候选对象/主题、与原话的逐项链接 | 帮用户扫描、合并相似项、指出关系 | 不覆盖原话，不取得 canonical truth |
| inference | 明示“Agent 推断”、依据、置信/证据等级、相反解释 | 提供可接受/拒绝的解释候选 | 不伪装成用户意图、事实或优先级 |
| obligation candidate | 候选 todo/plan/goal 关系、依赖、return condition | 供用户确认、转交现有 owner | 不自动成为 active Task、Plan、Mission 或 priority |
| ambiguity batch | 原话片段、冲突点、缺失来源、需用户回答的问题、回答后的影响范围 | 一次呈现多个独立澄清项，支持 hold/discover | 不以缺省值、排序或推荐偷渡决定 |
| accepted projection | 用户显式确认的解释/承诺/授权及 source link | 进入其真正 owner 的 source | 不让 inbox/summary 成为第二权威 |

### 3.8 原话、推断、未知与承诺的反向失败

- **过度解释：** 摘要把“也许可以做”写成“要做”，把观察写成事实，把问题写
  成需求，把情绪/偏好写成优先级。必须把 inference 标为 Agent-generated，保留
  原话和反例，未知不能用流畅句子填平。
- **捕获即承诺：** 每条消息都立即形成任务，导致 duplicate work、partial context、
  token burn 和 noisy durable state；历史研究明确要求 scope/debounce/episode，
  而 reflection sidecar 只在 decision-changing 时形成 candidate。
- **结构化覆盖 source：** 只存 normalized item、关键词或 embedding，删除原话、
  时间和 source locator；一旦误解，用户无法逐项纠正，projection drift 会冒充
  fact drift。
- **优先级放大：** Agent 把最近、重复、情绪强、字数长或自己聚合最多的项设为
  important；这违反“结构化是 access view，不是 priority authority”。应批量列出
  unresolved/ambiguous，不替用户排序，除非现有 source 已声明排序规则。
- **授权偷渡：** 汇总中带着“建议继续”“已决定”“可以直接执行”的默认 action；
  Decision Brief 的 reply key 必须明确 immediate authorized result，缺少人类回复
  就保持 hold。
- **歧义压扁：** 将多条相近但不一致的原话合成一个大项，造成冲突丢失；合并只在
  能保留每个 source、差异与 reopen 条件时成立，否则分行并列，请用户澄清。
- **重复消费/澄清丢失：** 批量处理没有 stable capture identity、attempt/receipt
  lineage 或 idempotent outcome，重试会重复建任务，失败会让待澄清项消失；这类
  identity/ordering/recovery 若被证明为硬要求，归 runtime，不归秘书 prompt。

## 4. 可吸收、矛盾与废弃

### 4.1 可吸收的语义（候选，不自动升格）

1. **义务而非条目数量。** 计划/continuity carrier 应命名 source、责任、依赖、
   return/reopen、证据和接受关系；“有三项”“状态变成 done”没有语义完备性。
2. **单一 canonical owner，projection 不创造事实。** Inbox/status/dashboard/
   queue/list 都应被视为声明其 source 的 view；消费者只能回源，不得因新鲜、
   显眼或聚合而成为第二权威。
3. **输入水位与意图锚点分开。** received input 是已到达的事实；reconciled input
   才是当前执行可依赖的 baseline。旧执行必须在 safe point 停止，不能把“收到”
   当“已采用”。
4. **记录保留未知与修正。** execution record 记发生了什么、来源、限制和终态
   含义；correction 追加，不抹平旧记录；record/receipt/settlement 都不能替代
   semantic review 或 Principal acceptance。
5. **并发与重启是硬属性候选。** 单写者/CAS、事件 idempotency、持久 ordering、
   exact lineage、safe-point recovery、权限/效果边界一旦被证明必须跨提示、
   restart、并发和不可信调用保持，应由 runtime/base/adapter 拥有，而不是由
   Todo、skill 或文字承诺。
6. **优先级从关系而非噪声得出。** 当前 governing relation/principal tension
   要从任务、接受和证据恢复；最近、最多、最响、重复出现或 Agent 自己标高的
   条目不自动升级主线。

### 4.2 与 living tree 冲撞的历史部分

- 历史 `goal-driven` 的 `GOAL.md`、`OPEN-STOPS.md`、月度 records、两周/30 条
  entry 阈值和固定命令是其旧载体，不是当前 Plan/Task 语义。可吸收“compass/path
  不对称、evidence-bearing stop、human closure”，不能搬文件树和时间阈值。
- 历史 Mission Record 的 JSON path、`rossovia mission` 命令、Git commit/prune
  和 Workbench state 是 v0.5 runtime/design。可吸收有限 continuity obligation
  与 branch closure；不把 Mission、queue 或 task board加入当前活树。
- 历史 Todo probe 的 read/update cadence、特定三 checkbox、provider-shaped trace
  parser 和工具调用路径已被运行证据反驳或证明不可假设；不能成为普通方法模板。
- 历史 live probes 的 Flash/OpenCode/DeepSeek adapter、watermark schema、fixture
  authority 只证明 guarded、read-only 机制病例；不构成当前 base 接口或模型策略。
- 历史 Chronicle 的 JSON schema、append-only record path 和 validator 可作来源
  研究，但不自动成为现行执行日志协议。
- archive 中仍使用 `Sequence`、旧 P-ID、旧 project/runtime 命名的文本，与当前
  `哲学序列 / philosophical sequence` 术语和 living tree 不同；它们只用于历史
  对照，不能回写当前 source。

### 4.3 当前证据支持的废弃 / `no-proposal`

对以下方向当前均为 `no-proposal`：

- 新增全局 inbox、全局 backlog、常驻 queue/manager、自动继续或 continuous
  execution daemon；
- 新增一个“todo/inbox/triage”总 skill，或预先决定 skill 数量、目录树和统一
  workflow；
- 用关键词、状态字段、checkbox、最近写入或自动分类推断义务、优先级、完成、
  接受或用户授权；
- 将 archive 的 goal/mission/task app 文件名、月度节奏、固定阈值、CLI 命令或
  runtime schema 迁入 living tree；
- 用一份执行日志、Todo、projection 或 queue 同时拥有 plan、事实、接受和效果
  权威；
- 在未证明跨 restart/concurrency/untrusted caller 的硬缺口前实现 harness base，
  或把事件提醒/提示词写成 runtime guarantee；
- 因单次 archive probe、一次成功、格式通过、多个 Agent 一致或 checkbox 全勾而
  宣称普遍可靠性。

## 5. 最常见的混淆对照

| 名称 | 实际问题 | 可以承载 | 不可以替代 |
|---|---|---|---|
| capture | 现在把一个候选意图/事实接住吗 | 原始输入及其 source/time/identity | triage、计划、授权、完成 |
| inbox | 哪些未分类项可被发现 | canonical source 的 projection | 独立容器、优先级、active task authority |
| triage | 这个项是否进入哪个已拥有的计划/队列、需何种证据 | 受约束的分类、路由、询问/拒绝 | capture、语义接受、自动提高优先级 |
| todo | 当前执行者要保留哪些局部义务/return condition | bounded reminder/obligation projection | 整体 Plan、Task acceptance、semantic completion |
| plan | 整体必须改变什么、约束、依赖、证据和谁接受 | 义务关系与可替换执行拓扑 | live run、事实记录、已接受结果 |
| goal | 长期方向/成功关系与不可违背条件 | compass/criterion/非目标（若有真实 owner） | 当前步骤、执行状态、自动 close |
| execution record | 哪个 Run/Cell 做了什么、观察到什么、何时停止 | provenance、usage、effects、unknown、terminal meaning | 语义正确性、接受、授权 |
| completion | 某对象的完成条件是否满足 | 对 Task/Cell/branch 的局部终态声明 | 更大 Task 已接受、目标已达成 |
| acceptance | Principal 是否采纳候选并承担风险/授权效果 | 最终采纳与残余风险决定 | 由工具状态、review、Todo 或 Agent 自报代行 |
| archive | 旧记录/已结束 carrier 如何保留且不再支配现在 | 可回读历史与 provenance | 清空、消费、完成、删除、active priority |

这些名称的关键区分是对象、owner、source、lifecycle、evidence、effect 和
acceptance；不能从 UI 标签、文件夹名或“看起来像列表”推断。

## 6. 清空语义：消费、归档、完成不是同一个动作

| 动作 | 语义 | 记录是否保留 | 对 active state 的影响 | 必须避免的误读 |
|---|---|---|---|---|
| 消费 / consume | 某消费者已读取/领取一个特定输入或 receipt | 应保留输入 identity、consumer、时间、result/unknown；通常需 idempotency | 只改变该输入的消费 standing；不证明执行、完成或接受 | “读过”≠“采用/完成” |
| 归档 / archive | 把不再 active 的记录移出当前工作面，保留可回读历史 | 保留 source、原因、状态、correction/lineage | 不应再触发 active work；必要时可 reopen/继任 | “看不见”≠“已完成”；移动路径≠改变事实 |
| 完成 / complete | 对命名对象满足其 terminal condition | 保留终态证据、残余未知、接受关系；可能允许 reopen | 关闭该对象，但不替父 Plan/Goal/Project 自动关闭 | “run done”≠“Task accepted” |
| 清空 / clear | UI/载体不再显示当前集合，含义必须由 owner 明确 | 若是 projection refresh，可无损重建；若是 destructive delete，需另有 authority | 不能默默改变 source、接受或义务 | “列表空”≠“世界已无义务” |

历史 Decision 021 的 settled Mission 是关闭所有 branch、留下 closure source、
提交最终状态后才 prune active record，Git history 仍保留 source state
（`archive/design/decisions/021-git-tracked-mission-continuity.md:28-42,110-122`）。
历史 task app 则把 completed task 从 open view 移走但保留 Review，并支持 reopen
（`archive/experiments/personal-task-app/DESIGN.md:121-145,237-243`）。两者共同
支持“从当前 view 消失不等于删除/完成”，但不能直接规定未来实现。

## 7. 失败模式与现有证据

### 7.1 并发写 / 重复消费

- Chronicle 直接记录：共享 JSONL append point 会在 parallel worktrees 冲突，
  所以历史 pilot 采用每 record 一文件、后续再生成 JSONL projection
  (`archive/chronicle/README.md:22-42`)。
- 旧 Workbench 文档保留 revision check、原子 Worktree lease、single-writer
  限制；MVP 不支持两个 writer 同读同一 revision 的并发 mutation，不能手工删
  lease 或靠 stale-lock 推断（`archive/apps/workbench/README.md:405-419`）。
- Todo return-trigger 的本地 probe 专门测试 duplicate write、failed write、early
  settlement 不重复投递 trigger；这里的 exact-once 是 probe seam 的机械属性，
  不是 semantic completion（`archive/evaluations/evidence/2026-08-06-todo-return-trigger/README.md:136-158,197-205`）。
- 因此，若未来确有 shared input/queue，至少需要 owner、revision/compare-and-set、
  stable event identity、idempotent consume、durable append/ordering 和可重建
  settlement；这些是 runtime/base 候选，当前不提实现。

对 raw capture 还需额外区分：**同一原话的重复到达**（可由 source/event identity
去重，但保留 duplicate observation）与**两条不同原话的相似解释**（不能仅靠
embedding/关键词合并）；**同一澄清项的重复展示**（可用 projection 去重）与
**用户已回答后的重复消费**（必须回到 accepted source revision）。当前 archive
只有局部 probe，没有足够证据定义通用 idempotency contract。

### 7.2 丢项、过早清空、成功分支遮蔽

- Mission branch 不能因漂亮报告或 partial artifact 消失；closed 必须有
  disposition 与 mainline delta，未返还 branch 会阻止 close
  (`archive/design/decisions/021-git-tracked-mission-continuity.md:19-42,110-118`)。
- Todo invalid run 显示即便三个 checkbox 最终全勾，companion index 仍可遗漏
  日期、slot、release 等事实；勾选是 carrier state，不是 whole-task acceptance
  (`archive/evaluations/evidence/2026-08-06-todo-obligation-carrier/RESULT.md:104-142`)。
- queue recovery 把 stale parent 的 child evidence 保留但拒绝继续 stale parent；
  这避免“新输入到达后旧分支仍执行”与“输入被吞掉”（`archive/evaluations/2026-07-21-live-mission-queue-recovery-probe.md:44-56`）。

### 7.3 优先级放大

当前 living 规则要求从实际 object/relations 找 principal contradiction，而不是
从 loudest local problem、最近文本、重复 Agent 或偏好 slogan 推断主线
(`theory/harness/theory.md:116-130`; `archive/skills/attention-management/SKILL.md:77-101`)。
历史 goal review 也要求每次重新识别 principal tension，不能因近期 entry 最长、
最频繁或“所有 criteria 对称”而持平处理（`archive/legacy/skills/goal-driven/commands/review.md:21-57`）。
所以自动按 recency、count、urgency label、未读数或 Agent 重复提及放大优先级，
没有现行证据支持。

### 7.4 长期运行忘目标 / 记录腐烂

历史 compass/path 不对称、每 session evidence rule、OPEN-STOPS index 和周期
review 是针对“长期任务忘方向、STOP 忘记、GOAL 漂移”的病例方法
(`archive/legacy/skills/goal-driven/SKILL.md:92-124,260-274`; `commands/review.md:62-110`)。
但 living theory 明确不要求每个任务都走完整阶段，也不把持续 reminder 变成
runtime；应先确认是否有真实重复差距，再选择有限计划、attention cue、文档或
runtime owner。长期运行的持久身份、恢复、并发和终态仍属 base hard-property
测试，而不是“再写一份 goal”。

### 7.5 用户随时插入 / 任务切换

历史 input probes 支持的最小分层是：新 input durable receipt → stale turn 在
safe point 停止 → 独立 propose/verify → 显式 authority commit → 新 anchor-bound
turn。收到新消息不能自动改变 active intent，也不能把已运行 parent 的旧结果
接回新 baseline（`archive/evaluations/2026-07-21-live-mission-input-reconciliation-probe.md:46-56,70-97`）。
living attention 方法同样把 Principal completed/paused/handed-off/replaced
归为 `switch`，需要重新形成 anchor，不得叫 return old mainline
(`archive/skills/attention-management/SKILL.md:85-101`; historical carrier)。
当前未有生产 evidence 证明自然语言插入、冲突修改、crash 中断或 writable effect
可以安全自动处理。

## 8. 形式与 owner 的最小映射

| 需要表达的关系 | 首先考虑的形式 | 形式能做什么 | 明确不能做什么 |
|---|---|---|---|
| 当前任务/一次变换 | 当前 task expression / local instruction | 说明对象、约束、允许效果、返回和 acceptance | 不创造长期队列或跨 session 权威 |
| 一项有界、会跨 safe point 的义务 | 有限 Plan 或现有项目声明 source | 保留依赖、return/reopen、证据和接受条件 | 不固定 worker/queue/runtime 拓扑 |
| 可重复的注意/路由判断 | 现有/未来 skill（仅有重复差距才提案） | 选择、保留、return、switch、ask、转交 | 不强制生命周期、并发、权限、完成 |
| 项目总是适用的规则 | 项目 `AGENTS.md` / canonical project source | 约束该项目的事实与入口 | 不成为跨项目通用 skill 或 runtime |
| 可重建的执行/观察事实 | source-native record / Chronicle-like record（如 owner 接受） | 路径、digest、usage、限制、终态和 correction | 不作语义接受或真理源 |
| 稳定字段投影 | projection / status / inbox view | 从 canonical source 重建可消费视图 | 不独立创建/关闭 commitment |
| schema/hash/order/路径等确定性动作 | script/tool/adapter | 验证形状、记录事实、投影、拒绝 malformed input | 不判断意图满足、相关性、优先级或接受 |
| identity、lease、CAS、idempotency、restart、safe point、权限与外部效果 | runtime/base/adapter | 在 prompt 被绕过、重启、并发、不可信调用下保持硬属性 | 不替代语义判断、计划或人类接受 |

## 9. Living tree 的最小候选与 no-proposal

### 最小候选（仅研究候选，不在本轮实施）

1. 保持本文件为唯一 research record，并在后续真实任务出现时用最小 probe
   区分 capture/inbox/triage/todo/plan/goal/record/acceptance；不先创建任何新
   skill 或目录。
2. 若重复证据显示当前 Agent-facing 方法在“外部化义务后忘记 companion / 把
   checkbox 当完成 / 把用户插入当可继续”上出现同一判断差距，先由对应现有
   owner（harness theory、attention、delegation、form-selection 或
   skill-formation）决定是补一条边界、一个有限 reference，还是返回
   `no-proposal`。不能从本病例预先决定 skill 数量。
3. 若未来实现确实遭遇跨 restart/concurrency/untrusted caller 的可重现硬缺口，
   另开 runtime/base 研究，先冻结对象、来源、效果、接受、failure evidence 与
   最小 mechanism；不把本报告的表格直接变成协议。

### 明确 no-proposal

- 本轮不改 `theory/harness/`、`planning/`、`.agents/skills/`、protocol 或
  `AGENTS.md`。
- 不迁入 archive 的 `GOAL.md`、Mission JSON、Todo schema、Chronicle schema、
  personal-task-app domain model 或 Workbench CLI。
- 不提出“inbox skill”“todo skill”“triage skill”“continuous-execution skill”
  或总管 skill；是否形成 skill 必须由重复行为 gap、边界、相邻 owner 和匹配
  证据重新判断。
- 不提出全局 priority queue、自动 close/consume/archive、周期提醒 daemon、
  自动从 prose/Git/PR/log 产生任务、自动从 done/green/test 推断 acceptance。
- 不提出“每条 capture 自动生成结构化任务”的秘书 runtime；不把 Agent 摘要、
  去重、排序、推断、承诺和授权合并为一个 extractor；不丢原话、source locator、
  inference/unknown 标记或用户澄清历史。
- 不把历史 read/update cadence、watermark、lease、event trigger 的具体字段
  当成 current runtime contract；它们只提供 future mechanism probes 的案例。

## 10. 未知与下一次可区分的证据

- 当前 living tree 没有 canonical inbox、capture store、triage source、todo
  carrier、global queue 或 continuous execution runtime；上述对象边界目前来自
  theory 与 archive 病例的对照，不是现行实现事实。
- archive probes 多为 synthetic、read-only、guarded 或 development-invalid；
  没有证据说明 obligation carrier、return-trigger、Mission queue 或 goal review
  在真实用户任务、不同模型、crash/restart、冲突 input、并发 writers、writable
  effects 下普遍可靠。
- 没有当前接受拥有者、用户授权模型或未来 Task/Run schema 的明确定义；因此不
  能决定“清空”是消费、归档、完成还是删除，必须先命名 source/owner/terminal
  condition。
- 未知是否存在跨项目重复的 capture/triage/long-running forget gap；在无代表
  任务、baseline、boundary 和独立 acceptance 前，保持 `no-proposal`。
- 当前没有可证明的“批量澄清”用户流程、歧义合并规则、用户授权语法或 raw
  capture 的隐私/retention policy；这些不是由历史 Decision Brief 或 memory
  research 自动补齐的协议。
- 若要前进，最小可区分 probe 是一个有明确 primary/companion acceptance 的
  只读或可逆任务：比较无 carrier、obligation projection、单次事件触发，机械
  只记录 host trace/identity/artifact bytes，独立 reviewer 判断语义完成；任何
  结果都需保留未知、成本、越界和接受 owner。这个 probe 仍需人类明确授权，
  不是本轮实现计划。

**结论：** 当前最稳的吸收不是一套 inbox/plan/todo/queue 产品，而是一组对象
与权威区分：capture 接住输入，inbox 显示 projection，triage 路由已声明的
义务，Plan 保留整体义务，Todo 只作有界 attention/return carrier，execution
record 记录事实，review 提出语义判断，acceptance 才关闭/采纳；consume、archive、
complete 各有不同终态。living tree 现在只保留研究与 `no-proposal`，等待真实
重复差距再由正确 owner 形成最小表达或 runtime 机制。
