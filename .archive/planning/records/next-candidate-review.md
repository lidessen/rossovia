# Next Archive Candidate Review

状态：`bounded-review-complete / current-branch-closed / waiting-for-named-consumer`；不是
acceptance、portable promotion、move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录处理 archive inventory 中第二批方向：`agent-tooling`、`agent-environment`、
`task-shaping`、`systems-engineering`。它们的历史正文和评估只能提供候选来源与历史证据；当前
living branch 仍需真实 consumer、当前 owner、匹配探针和外部接受关系。

## 总表

| candidate | 主要判断 | 当前 consumer / owner | 最近邻边界 | 历史证据 standing | 当前 disposition | 回返条件 |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-tooling` | 针对具体任务选择/调整已安装 coding-agent harness 的执行面和工具负担 | 当前无主线 tooling 调优 consumer；未来 DeepSeek/Vercel 对照或 agent operation 可成为 consumer | 不拥有跨设备用户环境迁移、项目 workflow 诊断、multi-agent orchestration 或可移植 model claim | 历史 action/boundary/local mechanism 观察；Flash attribution 和真实 mutation 未证实 | 本 branch `no-proposal-now / archive-only`；不属于当前 WorkCell core 阶段 | named tooling consumer、具体 task envelope 和可观察 burden/gap 出现后，先重开 proposal；再决定是否做 installed surface、权限边界、rollback 与 ordinary/lean probe |
| `agent-environment` | 为用户级 coding-agent 能力形成最小 source，并跨工具/设备 reconciliate、保留 secrets/local state 边界 | 当前没有用户 setup/migration 请求，也没有 desired source；未来用户环境迁移才有 consumer | 不拥有项目 `AGENTS`、provider account/secret、tool implementation 或组织 policy；未给 source 时必须 `NEEDS_INPUT` | 历史 source gate、reconciliation、routing boundary 观察；完整迁移/跨设备 attribution 未成立 | `candidate-later`；当前不触发、不扫描用户环境 | 用户提供 desired source/locator、目标设备和授权后，再做 source/target/previous projection 三方 probe |
| `task-shaping` | 相对保守 reference profile 判断任务是 direct、guarded、transform 或 escalate，并保持全局义务可重连 | 当前无已接受 task primitive consumer；WorkCell 是 later carrier，未来系统设计可能使用 | 不拥有 domain semantic partition、delegation topology、provider/concurrency/budget、execution 或 acceptance | 历史 boundary/修正观察；capability/transform stability 仍 provisional，重构 review reconstruction 曾失败 | `candidate-later`；等待 reference profile 和真实任务形状 consumer | 对 direct baseline、过载变换、domain-owned partition handoff 和 reconstruction/成本做匹配探针 |
| `systems-engineering` | 在实际扰动和 residual risk 下设计端到端可靠性关系，决定观测、控制、恢复和接受 | 当前没有已接受的 whole-system consumer；后续 DeepSeek 工作系统是潜在 consumer | 不拥有普通 planning、单 Cell 执行、模型 capability、任务 packet、runtime queue 或 domain acceptance | 历史 proportionality/boundary supported；consequential System Case 仍 guarded，需要独立 specificity verifier | `candidate-later`；先保留为后续系统设计方法 | 有具体 whole behavior、failure consequence、residual-risk owner 和 operation evidence 后再复审 |

“`candidate-later`”不是删除或否定，而是当前阶段没有足够消费关系；本 branch 的
`no-proposal-now` 也不是方法无效或删除，只关闭当前 proposal。四者都不迁移正文、不创建
`.agents/skills/` 新载体。

## 关系与处置

### `agent-tooling` 与 `agent-environment`

两者都触及 coding-agent harness，但对象不同：

```text
agent-environment
  用户想保留什么 source、哪些投影可重建、哪些 secret/local state 不可复制

agent-tooling
  当前任务在已安装 harness 上需要什么 execution surface、权限和最小负担
```

前者没有 desired source 时应停止在 source gate；后者可以在任务和安装事实已明确时做只读能力
观察。不能因为工具目录可读，就把它当成用户环境 source；也不能因为需要 CLI，就隐含完整
环境迁移。当前没有用户环境 consumer，因此不对本机配置做 audit、tune 或 mutation。

### `task-shaping` 与 `agent-delegation`

`task-shaping` 判断任务是否超出已证实的执行包络，以及怎样保持全局义务的执行形状；
`agent-delegation` 判断真实 bounded contribution 是否值得分出、拓扑如何选择、返回怎样重连。
前者不能自行创建 domain packets，后者也不能替代 execution-profile evidence。`code-review`、
`structural-refactoring`、`project-cognition` 等已有/候选 domain method 拥有各自语义分区时，
`task-shaping` 只能返回 envelope mismatch 和 handoff，不得用示例 packet 抢占 owner。

当前 WorkCell 设计中的 `WorkCell`、`WorkItem`、`WorkLease` 只是执行/调度对象，不是 task
primitive acceptance；不能把 task-shaping 的候选变成 WorkCell core 字段。

### `systems-engineering` 与 WorkCell / DeepSeek system

`mechanism-design-review` 先判断一个机制是否必要、是否比例合适；`systems-engineering` 只有在
多个 fallible parts 的 whole behavior、disturbance、control、recovery 和 residual risk 已成为
具体问题时才接管系统关系。WorkCell 负责 bounded execution/evidence，不保证整个工作系统
可靠；DeepSeek Harness 工作系统未来才可能成为 `systems-engineering` 的真实 consumer。

因此当前不把系统可靠性要求倒灌进 WorkCell core，也不因“Agent 可能犯错”提前新增 queue、
review stage、redundancy 或 runtime control。

## 证据与最小探针

- `agent-tooling` 的历史 first-slice 观察支持本地能力缓存、headless/ordinary surface 选择和
  environment/orchestration 边界；它明确没有完成 Flash-class attribution 或真实配置 mutation
  证据（[`archive/evaluations/2026-07-23-agent-tooling-first-slice.md`](../../archive/evaluations/2026-07-23-agent-tooling-first-slice.md)）。
- `agent-environment` 的历史 probe 支持 source gate、三方 reconciliation 和不复制 secrets/local
  state 的局部行为，但仍有 target/tool/ordinary-entry 的未完成边界；当前更缺实际用户 source
  与目标设备（见 [`archive/evaluations/2026-07-16-agent-environment-reconciliation.md`](../../archive/evaluations/2026-07-16-agent-environment-reconciliation.md)）。
- `task-shaping` 的历史 first slice 已保留 direct/guarded/transform/handoff 边界，但其稳定
  primitive 与协调经济性仍是 provisional；一次独立 review reconstruction 暴露了 packet-local
  absence 和 context repetition 问题（[`archive/evaluations/2026-07-18-task-shaping-first-slice-probe.md`](../../archive/evaluations/2026-07-18-task-shaping-first-slice-probe.md)）。
- `systems-engineering` 的历史 first slice 支持比例控制和独立 specificity verification，但复杂
  System Case 仍不能作为单一 Flash Cell 的可靠 primitive；consequential output 仍需 external
  verifier 和人类/host acceptance（[`archive/evaluations/2026-07-19-systems-engineering-first-slice.md`](../../archive/evaluations/2026-07-19-systems-engineering-first-slice.md)）。

下一轮最小探针分别是：

1. `agent-tooling`：只有 named consumer、具体 task envelope 和可观察 burden/gap 出现后，才冻结
   一个无写入的真实 harness task，比较 ordinary 与 lean/diagnostic surface；
2. `agent-environment`：只有在用户给出 source 和 target 后，做 source/previous projection/target
   的 reconciliation，并保留一个 local-only 与一个 secret boundary 反例；
3. `task-shaping`：用一个 direct task、一个确有 envelope mismatch 的任务和一个 domain-owned
   partition 任务，检查是否保持 direct、guarded/handoff 与 reconstruction；
4. `systems-engineering`：用一个低后果可逆任务和一个有明确 residual-risk owner 的 whole-system
   case，检查是否拒绝 process inflation，并把新引入的具体机制交给独立 source/owner verifier。

在这些 consumer 和 probe 出现前，当前 planning phase 只记录候选、边界和依赖；不改变 WorkCell
设计基线、不创建 portable skill、不开始 DeepSeek 工作系统实现。

## 2026-08-26 当前波次收束

本次对四个剩余 archive candidate 做了 current-source、载体、consumer、owner、证据 standing
和回返条件复核。没有候选同时满足真实 consumer、具名 owner、允许范围、可归因 evidence 与最小迁移
条件，因此当前 branch 正式收束为 `current-branch-closed / waiting-for-named-consumer`：

- `agent-tooling` 保持 `no-proposal-now / archive-only`；
- `agent-environment`、`task-shaping`、`systems-engineering` 保持 `candidate-later`；
- 四者均不创建 `.agents/skills/` carrier，不移动或复制到 `skills/`，不创建 Run，也不改变
  WorkCell → DeepSeek Harness → implementation 的阶段边界。

这里的收束只关闭当前迁移提案，不删除候选或历史来源。只有对应的 named consumer、decision-changing
gap/反例和可回读 owner/证据关系出现时，才按本记录中的单项 probe 重新打开；在此之前不因 archive
目录仍有候选而重复扫描或批量迁移。
