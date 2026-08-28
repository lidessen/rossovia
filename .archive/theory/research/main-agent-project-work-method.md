---
kind: research-candidate
id: main-agent-project-work-method
status: settled
disposition: canonical-proposal
evidence: behavior-observed
settlement_route: bounded-trial-or-canonical-proposal-or-archive
owner: "unknown"
consumer: main-agent-project-scale-work
review_at: reopen-on-next-project-scale-wave
---

# 主 Agent 项目级工作方法研究候选

lifecycle：`settled`
disposition：`canonical-proposal`
boundary：`method-boundary-formed`
evidence：`planning-dogfood-observed`
matched effect：`none-observed`
acceptance：`pending`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录响应用户关于“主 Agent 或任意 Agent 处理项目级别或更大任务时，如何利用 sub agents、本项目哲学、
skills、理论和最新研究，形成科学工作方法”的重要输入。它先研究 Main 如何持有整体并组织有界贡献，
不创建总控 Agent、自动调度器、永久角色 registry、最新研究自动导入器或 runtime orchestration。

## 1. 研究对象与边界

目标不是让 Agent 记住更多文件或输出更长计划，而是使一个项目级工作过程能够重建：

```text
goal / desired state
  → source, authority, standing and unknown recovery
  → whole work map and bounded contribution selection
  → method / theory / skill / research applicability judgment
  → direct, sequential, parallel or nested delegation
  → isolated production and independent review
  → Main fan-in, conflict and authority reconciliation
  → evidence, current projection and next bounded wave
  → settlement / correction / reopen
```

范围覆盖 Main、自身直接工作、sub-agent 委派、项目哲学/理论/skill 的选择与应用、最新研究的来源和适用性
回接、跨文件综合、独立 review、Todo/Plan 驱动和整体 checkpoint。它不把 Main 当作新的 acceptance owner，
不替真实 owner 做重大选择，也不把 sub-agent 数量、并行度、工具调用次数或引用研究数量当作工作质量。

## 2. 当前工作假设

### 2.1 Main 保留整体，不垄断局部劳动

Main 至少保留以下关系：goal/desired state、当前 authority、跨 item 依赖、效果边界、owner/acceptance
边界、贡献合并、冲突裁决、最终 projection 和下一波选择。可委派的是有来源、有边界、可独立回读的局部
贡献，不是整体责任、接受权或不可逆效果授权。

### 2.2 先恢复关系，再选方法和载体

每个局部工作先回答对象、目的、来源地位、当前 standing、允许效果、consumer、未知和返回形状；再判断
是否需要 concept articulation、form selection、agent expression、delegation、mechanism review、
practice cycle 或其它 skill。没有实际判断差距时，不为了“用上 skill”而加载方法；没有独立语义 gap 时，
不创建新的总 skill。

### 2.3 最新研究是候选输入，不是即时规则

最新论文、工具实践或外部方法先记录来源版本/日期、原文主张、实验边界、可迁移部分、冲突和未知；然后
回到当前 goal、consumer、source authority 和证据 standing 判断 applicability。只有真实 decision delta
和相称的 bounded probe 出现，才进入 trial/canonical proposal；否则保留为 settled external input 或 archive，
不把“最新”偷换成“正确”或“当前方法”。

### 2.4 并行由真实关系决定

独立来源、独立效果面和清晰 fan-in 时才并行；共享写面、顺序依赖、同一语义 owner 或高昂重连成本时顺序
处理或合并。producer、mechanical check、independent reviewer 和 acceptance owner 不互换，Main 不能因
委派而丢失整体语境和跨 item 不变量。

## 3. 最小工作方法候选

对项目级或更大任务，Main 在每个 bounded wave 建立一个可回读的 work map；多步骤、多任务、等待、并行、
handoff、验证和 checkpoint 必须由 Todo/Plan 驱动，一步、低风险、可逆且无依赖的动作可不展开。work map
至少保留：

| 关系 | Main 要恢复/决定什么 | sub-agent 可返回什么 |
| --- | --- | --- |
| `goal` | 目标状态、成功关系和不可跨越的阶段门 | 对目标的局部解释和未知，不重写 goal |
| `authority` | 哪个 source/current projection 拥有事实、方向、standing 或接受 | source edge、冲突、建议，不取得 authority |
| `contribution` | 局部 unit、范围、允许效果、排除项和返回契约 | bounded result、evidence、failure、unknown |
| `topology` | direct/sequential/parallel/nested 的真实依赖和 fan-in | 对自身 lane 的执行，不扩张整体拓扑 |
| `method` | 需要哪个 skill/theory/research，为什么以及适用边界 | 来源受限的判断和 method delta |
| `review` | 哪些结果需机械检查、独立语义 review 或 owner 决定 | review finding、覆盖和反例，不输出 acceptance 冒充 |
| `settlement` | trial、proposal、hold、archive、reopen 的去向 | destination 建议、理由、回返触发，不自行结算 owner-owned item |

Main 的 fan-in 至少检查：来源和 standing 是否保留、未知是否被抹平、同一字段/事实是否出现两个 canonical
writer、贡献是否越过允许效果、review 是否独立、下一行动是否能接回 current authority，以及本波是否需要
整体 checkpoint。没有 decision delta 时返回 `done-for-now`/`no-proposal`，不为了显示并行或研究产出继续堆叠。

## 4. 研究问题与最小证据

1. 在相同目标和 source 下，Main+有界 sub-agent work map 是否减少漏项、重复劳动或 authority 混淆，同时不
   增加不可接受的 fan-in、context、handoff 和 review 成本？
2. 如何判断一次 delegation 是真实独立贡献，而不是把整体 prompt 复制多份？
3. 如何让 Main 在读取最新 research 时同时保留时效、来源版本、适用边界和冲突，而不把研究综述变成实时
   主线负担？
4. 哪些情形必须顺序/并行/嵌套，哪些看似可并行但共享语义/写面会造成污染？
5. 如何度量项目级方法的质量：目标进展、decision delta、证据可重建、unknown 保真、owner 负担、总成本、
   返工、延迟和回归，而不是 lane 数、文档数或 token 单项？

当前最小 evidence 不是“使用了本项目所有 skills”，而是一次真实 bounded project-scale wave 的 work map、
贡献边界、source/skill/research applicability、delegation topology、returned evidence、Main fan-in、独立
review 和下一 checkpoint 都可回读，并有一个能改变下一行动的正例或反例。上一条
`research-settlement-wave-2026-08-26` 已提供一次有限 planning dogfood，但不是 project-scale matched Run，
因此仍不声称效率、质量、sub-agent 净收益或科学性已经改善。

## 5. 下一项最小实践与结算

本轮将“research-surface settlement reconciliation”作为真实 project-scale planning wave 使用本方法，
并把它结算为 `settled / canonical-proposal`，不声称 matched improvement：

- **Main 保留：** main goal、planning authority、current item ledger、各研究 record 的 source/standing、
  owner/acceptance unknown、最终 settlement 和 current projection。
- **候选 contribution：** 只读盘点 active research 的 frontmatter、settlement route 和下一回返关系；它与
  Main 的综合/写回有独立的读取边界，本来可以顺序委派给 reviewer。该子进程因环境无法建立 app-server
  权限而未返回，因此按 `no-proposal` 处理；没有 child evidence、并行收益或独立 review 被虚构。
- **实际拓扑：** Main direct/sequential 回读并写回共享 authority。多个 record 的 settlement destination
  不能并行写入，因为它们共同依赖当前 execution surface、settlement rule 和整体 checkpoint。
- **decision delta：** 将 `status: active`、`disposition`、当前 decision surface 与 reopen trigger 分开，
  把已有价值的研究交给 `canonical-proposal` 或有限 `owner-gated-hold`，不再让它们以未结算 active surface
  无限增长；新的信息“干燥/湿润”输入则只进入 inbox capture，不抢当前 wave。
- **证据上限：** 这是 `behavior-observed / attribution-unknown` 的方法 dogfood；没有 direct baseline、
  wall-clock、handoff latency、matched project-scale comparison 或 adoption/regression，因此不支持效率、
  sub-agent 净收益或 skill acceptance。

## 6. Planning dogfood return（2026-08-26）

本轮使用已冻结的 [`research-settlement-wave-2026-08-26`](../../planning/records/research-settlement-wave-2026-08-26.md)
作为一次 bounded planning dogfood：

- Main 保留 goal、population、settlement authority、owner/acceptance unknown、最终结算和 current projection；
- 独立 sub-agent 只读检查 frozen research population，返回逐项 route、证据上限、缺失关系和 reopen condition；
- sub-agent 没有编辑文件、分配 owner、接受 candidate 或改变 canonical authority；Main 对其返回进行 fan-in，
  并将用户对实验问题的修订、5 个 inventory destination 和剩余 active route 回写到 current records；
- 观察到一个有限的 decision delta：提醒 pilot、information architecture、bounded adoption、process audit
  和 philosophy research 由“继续占据 active surface”转为明确的 settled/proposal/archive 去向；
- 未测量 direct baseline、wall-clock、token、handoff、review latency 或返工，也没有独立 project-scale
  acceptance。因此本轮只支持 `planning-dogfood-observed / attribution-unknown`，不支持 delegation 的净收益、
  提速、质量提升或 adoption。

该历史 dogfood 的下一项要求已由本轮实现为一条 settlement wave；未来若要进入 bounded trial，仍须在新的
真实 project-scale wave 上预先冻结 direct-vs-delegated comparison，记录 decision delta、协调/重连成本、
unknown 保真和独立 review。没有匹配基线和相称证据时保持 canonical proposal，不制造总控机制。

本候选优先级来自用户的 source input，不等于 Main 已取得项目 priority、owner 或实现授权；如果下一波没有
真实 project-scale consumer，应保持候选而非自行制造工作。
