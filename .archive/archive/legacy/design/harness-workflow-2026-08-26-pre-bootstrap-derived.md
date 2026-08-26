# 本项目工作流设计（Draft）

状态：保留候选（本项目专用；当前过渡点火前不作为执行入口）。

Review 入口：本文件。它是本项目到 WorkCell 设计/实现之前的项目工作流，不是跨项目 harness
规范、WorkCell 协议、DeepSeek Harness runtime、scheduler、registry 或实现授权。它可以为后续
harness 设计提供实践输入，但本文件自身不取得可移植或 runtime 的效力。

当前 standing：上一版 workflow 解决的是项目已经能够开始之后如何运行；它没有解决当前项目如何从分散
成果、历史和未可靠入口中启动。因此本文件暂不作为 bootstrap 的 seed work map，也不被视为已实践、已接受
或当前唯一工作入口。新的过渡层先通过真实点火行动形成；之后再决定本文件是修订、保留、拆分还是降级。

## 1. 当前要解决的问题

当前项目已经形成了不少理论、设计、research、skills、planning 和历史 review，但成果的形成速度
快于以下关系的闭合：

- 哪些内容是当前真正可用的 canonical source；
- 哪些内容只是试行中的方法，哪些只是尚未实践的想法；
- 哪些结果已经改变后续工作，哪些只被记录或复述过；
- 哪些历史资料仍有价值，哪些已经退出当前工作面；
- 哪些文档是工作流入口，哪些只是证据与 lineage；
- 哪些成果已经进入版本化 checkpoint，哪些仍散落在未提交的 living tree。

因此当前优先级不是继续生产更多 WorkCell review，而是把已有成果压缩成一套本项目可直接使用、可以试行、
可以回退、可以从实践结果继续修正的工作流。

## 2. 核心判断

### 2.1 实践不等待正式化

“正式文档”不是实践的前置条件。一个想法、Draft、试行方案或已有正式方法，只要能够说明当前问题、
适用场景、允许效果和返回观察，就可以在有界工作中先实践。

实践的结果再决定它应当：

- 回写当前文档；
- 保留为试行方法；
- 形成或修订 skill；
- 进入 research/experiment/eval；
- 回退到更简单的做法；
- 暂停、保留 unknown 或 no-proposal。

“Draft / trial / formal / idea”是帮助人恢复使用关系的描述，不是每项工作都必须经过的固定状态机。

### 2.2 实践优先不是无边界试错

实践前仍要恢复最小问题关系：真实问题、目标场景、主要矛盾、允许效果、不可逆面、观察方式和返回位置。
不需要先穷尽所有理论、所有字段或所有候选方案；但不能在不知道要解决什么问题时以“试试看”替代设计。

### 2.3 工作流本身也要被实践

工作流不是一份写好后要求所有人照做的长流程。每次有界工作都可以同时观察：

- 是否找到了正确的 authority；
- 是否选了足够小的工作单元；
- 是否值得准备工具或委派；
- 是否保留了未知和失败；
- 是否真正改变了下一步判断；
- 流程成本是否超过收益。

没有改变判断的步骤、字段、record 或角色，不因为“流程完整”而保留。

## 3. 最小工作流

```text
记住输入
  → 恢复问题与场景
  → 判断复杂度和必要准备
  → 形成最小 work map / Todo
  → 选择直接、顺序或并行贡献
  → 实践一个最小可观察动作
  → 观察结果、失败和未知
  → 回顾、纠偏或回落修剪
  → 结算当前成果并保留回返条件
  → checkpoint 后选择下一波
```

这是一条默认回路，不是每项工作都必须展开的九步表单。一步、低风险、可逆的动作可以直接完成；
多步骤、多任务、存在依赖、交接、验证或长时执行时必须外部化 work map/Todo。

### 3.1 记住输入

用户表达的观点、想法、观察、思辨和半成形计划先做 source-faithful capture。记录的目的首先是避免
信息丢失和用户重复表达，不以成熟度、正式性、优先级、owner 或后续载体为前置条件。

### 3.2 恢复问题与场景

从第一视角恢复目标场景：谁在什么上下文中，面对什么问题，能看到什么，能做什么，什么结果会改变
下一判断。区分事实、来源、推断、未知和用户偏好；不把想法名称直接当成对象或解决方案。

### 3.3 判断复杂度和工具准备

按问题的耦合、后果、未知、工作量和可逆性选择处理强度：

| 复杂度 | 默认工作形状 | 必要准备 |
| --- | --- | --- |
| 简单 | Main 直接处理 | 读取必要 source，完成后直接观察 |
| 中等 | Main 建最小 work map，可顺序委派一个局部贡献 | 问题分析、主要矛盾、工具/skill 检查、回退点 |
| 高 | Main 保留整体；只有发现真实独立贡献时才并行，统一 fan-in 和 review | 更细工作量图、工具准备、权限/效果边界、独立复核、checkpoint |

工具准备包括现有 skills、脚本、fixture、sandbox、CLI/API 和临时工具。缺工具时可以为当前问题创建
最小临时工具，但要记录用途、owner、允许效果、删除/回退方式；不从一次缺口直接建立通用平台。

### 3.4 Work map 与 Todo

Plan 保存整体义务、来源、依赖、证据、接受和重连关系；Task 是有界贡献；Todo 是当前执行者下一步
和回返条件。多步骤任务必须从 work map 选择下一项，并把结果、未知和 next action 写回。

Todo 可以带 action-local focus、source、return，但它不是第二个 authority、队列、scheduler 或 memory
registry。没有会改变当前判断的关系时，不添加 reminder 或其它字段。

### 3.5 直接、顺序、并行和独立复核

委派由真实贡献边界决定，不由文件数量或“多 Agent 看起来更快”决定。

本次全面审计实际采用了 Main + 4 个只读 Agent。下面的分工是本次波次的历史事实和返回边界，不是
以后每次工作的默认人数或角色枚举；后续只按能独立改变判断的贡献拆分，贡献不独立时由 Main 直接处理：

| Agent | 有界贡献 | 不接管 |
| --- | --- | --- |
| A | authority、成果和历史回顾 | 不改 canonical source、不做接受 |
| B | 实践优先工作流与理论/研究边界 | 不把候选理论写成正式规则 |
| C | skills、harness 文档、理论文档的 ownership 和重复审计 | 不批量合并、移动或创建 portable skill |
| D | 阶段 plan、迁移拓扑、WorkCell reopen 条件 | 不实现、不接受 WorkCell |

Main 保留整体 scope、权威、跨贡献不变量、fan-in、最终写入和用户 review。需要时可在生产贡献完成后
另行安排未参与生产的独立 reviewer；reviewer 不取得修改、接受或实现授权。

共享写面、同一 canonical source 或真实依赖存在时不并行多写者：先只读调查，Main 单写，修改后再 review。

本次 reviewer 属于 Draft 进入 dogfood 前的独立复核；真实 dogfood 结束后的 checkpoint 是另一种关系，
要重新观察工作流是否改变了实际工作，不能用一次文档 review 冒充行为证据。

### 3.6 观察、纠偏和回落

每次实践至少回答：

- 实际观察是什么；
- 哪个判断被改变；
- 哪些步骤、字段、角色或工具没有承重；
- 哪些未知仍然不能推断；
- 下一步继续、修订、回退、等待还是 no-proposal。

设计 review 和实践后都要做一次修剪。没有当前 consumer、不能改变判断、可从其它 source 派生、或只为
显示流程完整而存在的内容，优先降为正文、历史、projection 或删除候选；不自动扩充状态和记录。

## 4. 文档、理论、skill 和证据的边界

| 形式 | 唯一职责 | 不拥有 |
| --- | --- | --- |
| `AGENTS.md` | 极简、稳定、每次进入项目都要知道的工作边界和默认动作 | 详细论证、历史、当前 item 清单 |
| `design/harness-workflow.md` | 本项目工作流的详细设计、适用条件、拓扑、实践和出口 | 跨项目规范、runtime 强制、WorkCell contract、最终接受 |
| `theory/` | 跨任务仍成立的语义原则、对象关系和所有权判断 | 本项目执行清单和一次实践结果 |
| `.agents/skills/` | 可选择加载的具体 Agent 判断/行动方法 | 项目事实、接受权、硬 runtime 保证 |
| `skills/` | 已有相称证据且脱离项目事实仍可独立使用的 portable carrier | incubation 草稿和项目路径依赖 |
| `design/<name>.md` | 具体设计 contract、对象、边界和未决设计选择 | 审计流水、总任务队列 |
| `planning/plan.md` | 当前阶段、顺序、依赖、非目标和出口 | 理论正文、每次 review 的全部历史 |
| `planning/inbox.md` | 用户输入的记忆保全和低摩擦 capture | priority、接受、执行完成 |
| `planning/records/` | 无法由正文、Git 或现有 evidence 重建的审计回执 | 日常 review 入口、第二 authority |
| `theory/research/` | 研究来源、推论、矛盾、unknown 和研究结论 | 已接受理论、项目 Run |
| `evals/` / `experiments/` | 可重建的验证协议、运行证据和实验原型 | 把一次运行升级成理论或设计接受 |

如果一个读者必须先读多个 record 才能理解 design 或 plan，应回写 canonical 正文，而不是增加更多 record。

## 5. 第一阶段：工作流重建与 pre-WorkCell 计划

### 阶段目标

形成下一阶段可直接使用的本项目工作流，并用它整理当前成果、历史和载体边界。阶段完成不表示 WorkCell 已接受，
更不表示可以实现 WorkCell。

### 波次 1：冻结审计基线

- Main 确认 current authority、用户新要求、允许效果、非目标和回退点。
- 只读 agent 并行恢复成果、历史、理论、skills 和结构。
- Main fan-in，形成唯一的当前问题清单，不再新增 sibling review。

出口：每个关键判断有唯一 source；WorkCell、DeepSeek 和实现仍为暂停；当前差异可被实践处理。

### 波次 2：工作流 Draft 与真实 dogfood

- 将本文件和 `AGENTS.md` 的简版作为一个可用 Draft。
- 下一波使用现有 `planning/plan.md` 作为 work-map carrier，处理一个真实对象：让冷启动的 Main 或
  人类 reviewer 从 `planning/README.md → planning/plan.md → design/harness-workflow.md` 恢复当前优先级、
  下一动作和 WorkCell standing；不制造 synthetic Run。
- 使用问题优先、复杂度判断、工具准备、work map、适度委派、回落修剪和 checkpoint。
- baseline 是现有入口中重复的旧阶段/standing 表述；单一 change hypothesis 是：把当前入口、详细工作流
  和阶段 plan 收敛到同一顺序，能减少恢复时的冲突查找和重复读取。允许效果只包括修正文档入口、引用和
  当前 plan projection，不包括文件迁移、WorkCell 实现或新 runtime 机制。
- 观察冷启动者能否回答“现在做什么、为什么、下一步是什么、WorkCell 是否暂停、结果回写哪里”，以及
  需要跨越多少 authority；结果回写 `planning/plan.md` 当前阶段或已有 canonical source。若没有 decision
  delta、成本超过收益或出现新冲突，则停止、回退到原入口并记为 `no-proposal`，不把试行写成接受。

出口：形成至少一个 decision delta；若没有，返回 no-proposal 或改写，不把工作流写成接受结论。

### 波次 3：结构和 ownership 收敛（按结果选择，不是必经 gate）

- 以实际消费关系决定 design、plan、theory、skill、records、evals 的落点。
- 只合并真正重复的正文；不因相似主题合并不同 owner。
- 将 child-level current status 从 roadmap/plan 中降回 canonical source 或必要的 current projection。
- 明确 11 个现有 project-local skills 的保留、窄化、降级或后续验证条件。

出口：人类可以直接打开 design 看设计、打开 plan 看计划；Main 可以按最小路径恢复工作；没有双 canonical。

### 波次 4：单对象迁移和 skill 形成（只有真实 consumer 解锁时才进入）

只处理前一波或其它现有证据已证明有真实 consumer、owner、边界和收益，且当前 planning item 明确给出
move/disposition 的对象。工作流只提供判断方法，不授权迁移或新 carrier：

1. 先写 source/consumer/allowed effect/rollback；
2. 单对象、单 owner、单写者 move 或原地修订；
3. 同步 living links 和 validator；
4. 用 cold-reader 或真实工作观察；
5. 失败就按 manifest 回退，不创建兼容副本；
6. 只有重复的 Agent 判断差距才形成 `.agents/skills/` candidate；carrier 接受、portable `skills/`
   晋升和最终采用仍需各自 owner、consumer 与相称证据。

出口：每个迁移或新 carrier 都有实际使用观察和回退方式；没有批量迁移或目录完整性驱动的载体。

### 波次 5：整体 checkpoint 与 WorkCell reopen 决定（按需执行）

Main 汇总当前工作流实践、结构变化、skills 使用观察、历史结算和剩余未知，只允许三种结果：

- `continue-bounded-settlement`：工作流或结构仍需继续实践；
- `hold/no-proposal`：没有足够 consumer、owner 或 decision delta；
- `reopen-workcell-design-review`：当前工作流 dogfood 已有可回读 decision delta，结构没有双 canonical，
  未决事项有明确 owner/consumer 或 no-proposal 处置，且用户可以直接打开 WorkCell Draft review。

即使 reopen，也只重新打开 WorkCell 设计 review，不打开 implementation。WorkCell implementation 必须另有
设计接受、core/host/record owner、最小实现 plan、独立复核、回退和明确授权。

## 6. 验证和证据上限

分别报告：

- `format-valid`：链接、路径、结构校验通过；
- `source-reconciled`：当前文档与唯一 authority 一致；
- `behavior-observed`：真实工作确实找到并使用了工作流/载体；
- `boundary-supported`：正例、拒绝案例和最近邻边界成立；
- `matched-improvement`：相同任务和条件下相对 baseline 有可归因改善；
- `accepted`：真实 owner 明确采用；
- `regression-supported`：后续波次仍保持正确。

多个 Agent 返回、一份文档存在、validator 通过或一次顺利实践，都不能单独证明 adoption、matched improvement
或 acceptance。

## 7. 当前处置

当前工作流为 `Draft / practice-first / pre-WorkCell`。本文件、`AGENTS.md` 简版和
`planning/plan.md` 的第一阶段计划是可实践的当前工作面；它们仍可被真实工作结果修订。

WorkCell 当前明确为 `paused-by-priority / design-review-deferred / implementation-not-authorized`。
重新打开条件由本文件 §5 波次 5 产生，不由时间、文件数量、review 数量或候选数量自动触发。
