# 本项目工作流设计前综合稿

状态：`pre-design-synthesis`（本项目专用；不是正式 design，不作为当前 workflow 入口）。

> 本稿是对已有实践观察和旧候选的综合材料，不是正式设计契约。正式 design 必须先经过问题/场景简报、
> 概念与边界分析、正式组织的角色/权责设计、skill 形成判断和独立 review；这些前置材料统一放在
> [`design/project-bootstrap.md`](project-bootstrap.md) 所定义的 bootstrap seed 中。bootstrap seed 是旧项目孵化
> 下一代开发入口与 skills 的载体，不是本稿的正式 workflow 入口。

## 适用范围

本文件描述项目已经能够开始工作之后，Main 如何处理真实的 planning、design、research、skill 和验证任务。
它不负责把一个混乱项目点燃；项目入口不可信、主线刚被用户纠正、冷启动无法判断下一步或需要恢复历史时，
先进入 [`planning/transition-package.md`](../planning/transition-package.md)。它也不是跨项目 harness 规范、
WorkCell 协议、DeepSeek Harness runtime、scheduler、registry 或 implementation authorization。

上一版候选已保存为历史：
[`../archive/legacy/design/harness-workflow-2026-08-26-pre-bootstrap-derived.md`](../archive/legacy/design/harness-workflow-2026-08-26-pre-bootstrap-derived.md)。

## 1. 背景与来源（不构成规范）

上一版把“如何正常工作”和“如何启动工作”混在一起，且把未实践的 workflow Draft 当成了 dogfood 的前置。
本版只保留点火之后仍有实践依据的关系。

当前已有两次有限行为观察：

- 过渡包冷启动：无本轮对话记忆的 Agent 能恢复目标、边界、下一步和交接关系；
- current-only plan 冷启动：无本轮对话记忆的 Agent 不读取旧 plan 快照即可继续，并发现并修正了
  “最近完成波次 / no-open-wave”的投影差异。

这支持 `behavior-observed`，不支持 matched improvement、正式接受或长期回归。

## 2. 正常工作的最小回路（候选）

本节描述的是待正式设计验证的行为关系，不是强制阶段、生命周期状态、固定 checkpoint 或必须逐项填写的
表单。它只有在 Main 已形成来源有界的 bounded work map、且当前 execution wave 确实打开时才适用；当前
`item-ledger` 为 `no-open-wave` 时，不能从本节自动挑选下一项，应保持 hold 或先完成重规划/授权。

```text
接住输入
  → 恢复问题与真实场景
  → 判断复杂度、后果和必要工具
  → 从 current plan 选出最小 work map / Todo
  → 选择直接、顺序或有界并行
  → 执行一个最小可观察动作
  → 观察结果、失败和 unknown
  → 回顾、修订、修剪或回落
  → 回写真实 authority 并交接
  → checkpoint 后决定下一项
```

这是默认判断回路，不是每项工作必须填写的固定表单，也不是所有任务都必须经过的生命周期。低风险、一步、可逆动作可以直接完成；多步骤、多任务、
存在依赖、交接、验证或长时执行时，必须把 work map/Todo 外部化。

### 2.1 接住输入

用户的观点、想法、观察、思辨和半成形计划先做 source-faithful capture。记录首先为了保留记忆，成熟度、
正式性、priority、owner 和 acceptance 不是 capture 前置条件。后续是否进入 plan、design、research、eval
或 skill，另行判断。

### 2.2 恢复问题与场景

先回答：谁在什么场景中遇到什么问题；主要矛盾是什么；什么结果会改变下一判断；哪些是事实、来源、推断、
用户偏好和 unknown。用第一视角理解目标场景，但不把场景想象写成事实，不把想法名称直接当成解决方案。

### 2.3 判断复杂度与工具准备

根据耦合、后果、未知、工作量和可逆性选择处理强度：

- 简单：Main 直接处理，读必要 source，完成后观察；
- 中等：建立最小 work map，必要时顺序委派局部贡献，准备工具和回落点；
- 高：只有存在真实独立贡献时才并行，Main 统一 fan-in、冲突检查和 checkpoint。

工具可以是已有 skill、脚本、fixture、sandbox、CLI/API 或为当前问题临时准备的小工具。临时工具必须说明
用途、允许效果、owner、失败边界和删除/回退方式；一次缺口不自动产生通用平台。

### 2.4 Work map、Task 和 Todo

- `plan.md`：当前顺序、依赖、非目标、出口和交接；它是唯一 current plan carrier；
- Task：一个来源有界、可返回的局部贡献；
- Todo：当前执行者下一项动作、focus、source 和 return；不成为第二 authority、queue 或 scheduler。

多步骤任务只有在 current plan 与 current ledger 共同允许、且当前 wave 已打开时，才从中选择下一项，并把结果、
unknown、decision delta 和 next action 回写真实 owner；`no-open-wave` 不能被解释成“任选一项继续执行”。
没有改变判断的关系时，不为了形式添加 reminder、状态或 record。

### 2.5 直接、顺序、并行和复核

委派只在真实贡献能够独立、输入稳定、写面可分、返回可重连且预期收益超过协调成本时成立。文件多、主题多或
有空闲 Agent 都不是理由。

Main 保留整体目标、source、跨贡献不变量、接受关系、fan-in 和最终写面。sub-agent 不改共享 canonical source，
除非当前 work map 明确给出独立写面和回退方式；reviewer 不因 review 身份取得修复、接受或实现授权。Agent 数量、
角色和拓扑每波按真实贡献决定，不写成固定枚举。

### 2.6 观察、修剪与结算

每次有界实践至少回答：实际观察是什么；哪个判断改变了；哪些步骤、字段、角色或工具没有承重；哪些 unknown
仍不能推断；下一步是继续、修订、回退、等待还是 no-proposal。

没有当前 consumer、不能改变判断、可由其它 source 派生或只为显示流程完整而存在的内容，优先先做 `hold`、
`no-proposal`、`done-for-now` 或合并判断；只有在 canonical owner、consumer、lineage、边界和 move disposition
明确后，才考虑移动或删除，而且不得删除 source、lineage 或当前 record。research、experiment、review 和想法不要求统一经过固定结算形态，但不能无理由长期悬置；
需要结算时回写其真实 source/record/owner，保留 unknown 和 reopen 条件。

## 3. 文档、理论、skill 和证据边界

| 形式 | 拥有 | 不拥有 |
| --- | --- | --- |
| `AGENTS.md` | 每次进入项目都要知道的极简边界和默认动作 | 详细流程、历史、item 清单 |
| `planning/transition-package.md` | 触发过渡时的一次性启动上下文 | 正常 plan、永久 workflow、总控机制 |
| `planning/plan.md` | 当前顺序、依赖、出口、非目标和回落 | 历史、理论、设计正文、完整 standing |
| `design/` | 具体设计 contract、边界和未决选择 | 执行队列和审计流水 |
| `theory/` | 跨任务原则、对象关系和所有权判断 | 当前波次和一次实践结果 |
| `.agents/skills/` | 可选择加载的具体 Agent 判断/行动方法 | 项目事实、接受权、runtime 保证 |
| `skills/` | 有相称证据且可脱离本项目使用的 portable carrier | incubation 草稿和项目路径依赖 |
| `planning/records/` | 无法由正文、Git 或 evidence 重建的观察、review、处置和 lineage | 当前 plan、第二 authority、日常入口 |
| `evals/` / `experiments/` | 可重建的协议、运行证据和实验原型 | 把一次运行升级为理论、设计接受或 runtime 保证 |

如果读者必须先读多个 record 才能理解 plan 或 design，说明 canonical 正文不够完整；应回写正文，而不是继续
增加 record。

## 4. 重新进入过渡层

正常 workflow 不是永久前置。满足以下任一条件时回到 transition package：

- 用户明确要求打回、改变主线或重新组织；
- 当前入口、plan、roadmap 或 authority 出现会改变行动的冲突；
- 冷启动 Agent 无法独立回答当前目标、下一步、禁止事项和回写位置；
- 项目长期中断，或当前工作面无法从 source 恢复；
- 结构迁移前缺少 source、consumer、边界或回退关系。

如果一个简单、可逆动作仍能安全完成，不启动过渡层。过渡层成功后只交出已验证入口、decision delta、剩余
unknown 和下一项工作；临时拓扑不自动进入正常 workflow。

## 5. 当前实践与下一项验证

本稿仍是项目专用的设计前综合稿。当前证据只支持 `transition/plan-entry bounded behavior-observed`：包括两次
冷启动入口观察和 Main 的局部 planning 修正；它不支持正常 workflow 的行为证据、匹配 baseline、跨任务重复、
采用后回归、质量/成本改善、可移植性、WorkCell reopen 或任何实现授权。

下一项验证应选择一个真实的多步骤 planning/design 工作，比较直接处理与本回路的实际恢复成本、协调成本、
decision delta、未知保留和结果质量；不以 Agent 数量、文档数量、流程完整度或 validator 通过作为改善指标。

如果下一波没有改变判断或成本超过收益，回退到更简单的直接处理，并修剪本文件；不为维护本文件创建新的
registry、scheduler、全局状态或 WorkCell/runtime 机制。
