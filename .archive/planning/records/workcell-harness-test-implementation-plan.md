---
kind: implementation-plan-record
id: workcell-harness-test-implementation-plan
status: active
disposition: design-review-awaiting-user
evidence: user-scoped-consumer-and-design-source
settlement_route: bounded-prototype-review-or-no-proposal
owner: user
consumer: harness-testing-and-model-provider-comparison
review_at: user-design-review
---

# WorkCell harness 测试实现计划候选

## 1. 为什么现在推进

用户明确给出真实 consumer：希望用 WorkCell 承载 harness 测试、部分任务 delegation、主模型/子模型
测试，以及 Kimi Code Plan、OpenCode Go、开源模型等不同模型或执行渠道的效果比较。

这使 WorkCell 不再只是抽象协议设计；它可以成为当前 planning、skill、delegation 和 harness 方法的
真实执行边界与 evidence producer。它仍不等于 DeepSeek Harness 工作系统，也不要求先实现完整的
多来源记忆、session、todo scheduler 或 runtime base。

## 2. 两条实现路线必须分开

```text
minimum WorkCell contract freeze
  ├─ experimental slice：用于验证协议、隔离、记录和 provider/model 对照
  └─ canonical core：在 owner-backed protocol acceptance 后实现为正式基座
```

experimental slice 可以成为设计验证的真实 consumer，但不能冒充 canonical protocol acceptance、
生产 runtime 或 provider 优选结论。若 slice 发现协议边界错误，应回写 design record 并暂停扩展，
而不是用实现事实反向宣布设计已接受。

## 2.1 先做设计实践，再冻结 core API

设计阶段需要主动实践尚未正式化的方法，而不是只把它们写成口号。WorkCell 这一波先用可回退的
fixture、纸面 contract 和必要时的 disposable/mock executor 做 design rehearsal；它不是 canonical
implementation，也不产生生产运行事实。

本波实际应用以下关系：

- **问题优先与具体问题具体分析：** 先描述真实 harness-test 场景、主要矛盾、可观察 outcome、风险和
  依赖，再决定是否需要 core API、adapter 或工具；不从“要接很多模型”反推总系统。
- **善假于物、工欲善其事必先利其器：** 盘点当前可用的 skills、eval fixtures、deterministic runner、
  workspace sandbox、CLI/API 入口和 evidence 工具；缺少承重工具时只创建最小临时工具并记录用途、
  owner、可回退路径和停止条件，不先建通用平台。
- **设身处地：** 分别站在 WorkCell core、adapter、delegated worker、Main/fan-in、reviewer 和用户
  provider-account 的第一视角，检查每一方当时能看到什么、能做什么、失败后如何返回；不把某个角色
  的便利写成全系统语义。
- **Todo/work-map 驱动：** 每个场景先形成 source、applicability、focus、return 的局部 Todo，执行后
  写 application/design-use receipt；没有回执的尝试不进入 core 设计结论。
- **设计后回落与修剪：** 先保留 baseline snapshot，实践后逐项检查字段、状态、机制和工具是否仍改变
  decision、attribution 或 safety；不能承重的候选降级为 projection、adapter-local、fixture-only 或
  no-proposal，并保留 rollback anchor 和理由。

最小 rehearsal 场景为：

1. 一个 deterministic bounded work：检查 Spec/Binding/Run/Record 的最小边界；
2. 一个 direct 与有限 delegation 的对照：检查 WorkCell 是否只承载单个 bounded contribution；
3. 一个失败/取消/未知外部效果场景：检查 evidence、回落和停止边界；
4. 一个 provider/model adapter 假设场景：检查 core API 与 adapter/provider 的责任分界，不推断真实产品兼容性。

设计实践的输出不是“通过/失败”总状态，而是：改变了哪些设计判断、删除了哪些字段/机制、哪些仍是
unknown、哪些工具值得保留，以及是否达到 minimum-contract-freeze。若没有 decision delta，返回
`design-practice-no-proposal`，不继续扩张实现面。

### 2.2 Design rehearsal work map 与回执（2026-08-26）

```text
- [x] recover matching sources and current WorkCell baseline
  source: design/work-cell-protocol.md §1–§12、§17–§18；workcell-design-acceptance-readiness.md；
    mechanism-design-review、work-estimation、practice-cycle、agent-delegation
  applicability: 用户 consumer 需要一个可比较、可回退、能保留事实的执行边界
  return: core/adapter、execution/review/acceptance、design-only/implementation 边界

- [x] run problem-first and perspective rehearsal
  focus: direct worker、delegated worker、Main/fan-in、adapter、reviewer、account/provider 视角
  return: 各角色可见输入、允许效果、返回物和失败后的责任不互相越权

- [x] run tool-readiness rehearsal
  focus: 复用现有 skills、eval fixtures、deterministic/mock executor 和 evidence ledger；
    不为模型比较预建 provider registry、scheduler 或通用脚本平台
  return: 当前可复用工具、缺口、临时工具的创建条件和 rollback anchor

- [x] perform source-bound design rehearsal for four bounded scenarios
  scenarios: deterministic bounded work；direct vs limited delegation；cancel/partial/unknown effect；
    provider adapter mapping
  evidence: protocol §4–§12；linked WorkCell boundary/lifecycle/effect/executor review records；本节 scenario receipt
  return: core API 需要承载的最小事实、adapter 只能映射的 provider-specific 资料、保留的 unknown；不宣称 runtime Run

- [ ] execute a reconstructible fixture or mock run
  applicability: 只有 fixture、runner、identity、workspace 和 evidence schema 冻结后才打开
  return: actual RunRecord/Evidence 或明确的 no-proposal；当前未执行

- [x] perform design-stage pruning and rollback check
  focus: 删除不改变 decision/attribution/safety 的 core 字段或机制；保留 baseline snapshot 与
    rollback anchor；不把 rehearsal 结果写成 protocol acceptance
  return: 修剪清单、仍开放关系和 minimum-contract-freeze 判断

- [x] independent review and reconcile
  focus: 独立检查 design-use 是否真实改变 core/API 边界，以及是否误把 mock rehearsal 当 Run/acceptance
  return: `ACCEPT`；补齐 scenario-level evidence entry、未执行 runtime fixture、minimum-contract-freeze pending

- [ ] owner decision
  focus: 决定 experimental slice 是否开放及五项最小效果/记录/比较/停止边界
  return: accept-current-boundary | retain-unknown | revise；未决项不进入实现
```

### 2.3 Rehearsal observation and pruning receipt

| rehearsal surface | evidence entry / observation type | observed design delta | retained boundary / unknown |
| --- | --- | --- | --- |
| problem-first + perspective | protocol §1、§11–§12；`main-agent-project-work-method`、`agent-delegation`；design-use observation | 目标从“接入很多模型”收窄为“同一 bounded work contract 下产生可比较执行事实”；Main、worker、adapter、reviewer 和 account 的责任被分开 | core 不负责 provider 选择、语义验收或账号权限；真实 adapter/consumer identity 仍待确认 |
| tool readiness | `evals/skill-evaluation/protocol.md`、`trial-ledger.md`、现有 skill/eval fixture、`scripts/validate-planning.rb`、`scripts/validate-skills.rb`；inventory/design-use observation，未产生 runtime output | 复用现有 `agent-delegation`、`agent-expression`、`mechanism-design-review`、`work-estimation`、`practice-cycle`、`concept-articulation`、现有 eval fixture/ledger；第一波只需 deterministic/mock executor 与 evidence path，不创建通用 provider registry 或 scheduler | 是否需要新脚本、sandbox 和真实 CLI/API 适配器留到 named environment check；临时工具必须有 owner、用途和 rollback；本回合没有创建新工具 |
| deterministic bounded work | protocol §4–§8；`workcell-contract-field-boundary-review.md`、`workcell-record-boundary-review.md`；paper contract rehearsal，未执行 Run | core API 必须能表达 admission、execution context、typed event、execution return、record/evidence handoff 和 mechanical check | RunRecord identity、retention/correction、host command policy 仍是 owner-backed unknown |
| direct vs limited delegation | protocol §10；`whole-work-coordination-candidate.md`、`agent-delegation`；work-map fixture rehearsal，未执行 delegated runner | 上游 Plan/Todo 产生多个 bounded contribution；每个 contribution 独立 Run，Main 只做 fan-in/review，不把任务树或全局 priority 放进 Cell | capacity、lease、shared workspace 和真实 delegated runner 尚未验证 |
| cancel/partial/unknown effect | protocol §9；`workcell-lifecycle-review.md`、`workcell-effect-summary-contract-review.md`；failure/cancel counterfactual rehearsal，未执行 host effect | 取消必须区分 request、drain、finalization；executor failure 不能抹掉已产生或未知的 workspace effect | late effect、replay/retention、host confirmation 仍需真实 owner/fixture；不自动 retry |
| provider adapter mapping | protocol §11–§12；executor comparability/readiness records；API mapping rehearsal，未接入真实 provider | core 暴露 stable API；adapter 映射 session/model/tool loop/raw transcript/usage 到 execution return 与 adapterEvidence；provider-specific shortcut 不得改生命周期或权限 | Kimi/OpenCode/开源模型的实际接入方式、账号/订阅环境和模型 identity 仍需逐项检查 |

### 2.4 Rehearsal pruning result

本次设计推演建议删除或降级以下候选，不进入第一版 core API；这些还没有作为 canonical protocol 的
不可逆修改，后续可由新证据按 rollback/reopen 关系回看：

- provider/model/account/channel 具体值：降为 adapter、Binding observation 或 trial metadata；
- 全局 Todo、任务树、priority、scheduler、lease 和 CellBatch：留在上游 orchestration candidate；
- semantic acceptance、review rubric 和“passed”总状态：留在独立 review/acceptance layer；
- automatic retry、session resume、memory registry、永久 replay/retention：留为后续 mechanism/owner decision；
- 为每个 provider 预建统一 registry 或比较器：只有真实多 provider consumer 和固定 comparison card 后才重开。

本次仍保留为 core API 承重关系：bounded execution context、host effect boundary、typed lifecycle/event、
execution return、cancel/drain、failure/unknown、RunRecord/evidence handoff 和新 Run 的 parent lineage。
该修剪是 `design-practice-observed / adoption-unknown`；它没有证明字段减少带来性能收益，也没有关闭
canonical protocol acceptance。当前 `minimum-contract-freeze: not-established`、`runtime-fixture-run: not-executed`、
`implementation-authorized: false`；下一步必须先补可重建 fixture/runner/identity/evidence 或明确
`design-practice-no-proposal`，不能从本节直接进入 provider comparison。

回落锚点：本次 rehearsal 没有修改 `design/work-cell-protocol.md` 的 canonical 内容；当前 protocol
SHA-256 为 `d2af8fab375029f61a651f7fab1ca0cef7984ba08880e065c74b8bf7ed43a805`。本 record 与 readiness/plan/ledger
只保存 design-use projection；若后续 reviewer 否定本次推演，回退这些 projection 即可，不需要倒写
canonical protocol 或旧 review/evidence。

独立只读 reviewer `01a03e91-c598-7b40-b404-e325e931769d` 返回 `ACCEPT`：确认 core API 与
adapter/provider 分界清楚，design-use 与 runtime execution 已分开，四个场景有 evidence entry 与
scenario-level delta，回落/修剪边界可回看，且 `minimum-contract-freeze` 仍明确未成立。该 verdict 只
接受本节的 bounded design-use receipt，不接受 protocol、Run、provider compatibility、adoption 或实现授权。

## 3. 第一阶段最小执行边界

只实现能支撑一个可重建 bounded work 的最小对象：

```text
WorkCellSpec
  → host-resolved WorkCellBinding
  → WorkCellRunRequest
  → WorkCellRun
  → WorkCellRunRecord + WorkCellEvent + EvidenceRef
```

第一阶段必须具备：

- 固定 `cellId`、`requestId`、`runId` 和 source/fixture revision；
- 相对 workspace scope、工具/命令 effect boundary 和 resource limit；
- admission、start、event、completion、failure、cancel/drain、record finalization；
- executor 返回与 host observation 分开，provider 原始资料进入 `adapterEvidence`；
- mechanical check、semantic review 和 acceptance decision 分开，不用 `passed` 代表最终成功；
- retry/continue 产生新 Run，并保留 `retry-of` / `continued-from` lineage；
- deterministic executor，先验证协议、失败、取消、证据和记录，不依赖模型。

第一阶段不实现：全局队列、自动重试、memory registry、DeepSeek session kernel、WorkCell 内部 Todo
树、provider 选择器、永久 retention/replay 保证或语义验收器。

## 4. Core API 与 adapter/provider lane

WorkCell core 先提供稳定、provider-neutral 的执行 API；adapter/provider 基于这组 API 实现，不进入
core 的 canonical 对象、字段和生命周期。换句话说：

```text
WorkCell core API / contract
  → Vercel/Pi adapter
  → DeepSeek Harness adapter
  → Kimi Code adapter
  → OpenCode adapter
  → local/open-model adapter
```

core API 至少承载 admission、bounded execution context、tool/effect boundary、typed event、execution
return、cancellation、record/evidence handoff；adapter 负责把各 provider 的 session、模型调用、工具循环、
原始记录和 usage 映射到这些 API。adapter 不能通过 provider-specific shortcut 改变 core 生命周期、权限或
验收语义。

各 provider/model 基于同一 core API 接入。对照卡固定：

- 同一 `WorkCellSpec`、fixture、初始 workspace、tool surface、effect policy、completion contract；
- 同一任务目标、资源限额、取消条件和 mechanical checks；
- model/provider/account/channel、adapter revision 和实际 session identity 单独记录；
- 每个 executor 物化自己的 Binding；比较固定的是非-executor admission 条件，不强行共享完整 Binding；
- provider-specific transcript、token/cost、tool call 和错误只作为 adapter evidence；
- 订阅或本地模型的 credential 由外部运行环境管理，WorkCell 不保存或升级凭据，也不自动扩大消费权限。

候选 lane 包括已有 Vercel AI SDK/Pi/DeepSeek 路径、Kimi Code Plan、OpenCode Go 以及可接入的开源模型。
具体能否通过 CLI、API、账号订阅或本地 endpoint 接入，必须在各 adapter 的 source/环境检查中确认，
不能从产品名称推断兼容性。

## 5. Delegation 的最小用法

上游 Plan/Todo/work map 负责拆分任务；每个可独立执行的 bounded contribution 生成一个 WorkCell。
WorkCell 只记录该 contribution 的执行事实，不拥有全局 priority、synthesis authority 或 acceptance。

第一类真实 probe：同一 planning/design fixture 下比较 direct lane 与有限 delegated lane；记录关键路径、
fan-in/rework、证据完整性、unknown 保留、成本和最终 review。不能用 Agent 数量或完成字数替代效果。

## 6. 进入实现前的最小冻结

在写正式 core 前，只需由 user/acceptance owner 对以下五项作出可回读决定：

1. experimental slice 是否允许作为 design-validation consumer；
2. 第一阶段的 host effect 和 workspace 隔离范围；
3. RunRecord 最小 identity/evidence retention；
4. adapter comparison card 的固定变量和允许差异；
5. 失败、取消、未知外部效果和停止条件。

这不是要求一次审批完整协议，也不是要求预先决定所有 provider。没有其中的安全/记录边界时，保持
design-only；其它非关键未知可以在 slice 中以结构化 `unknown` 保留并事后纠偏。

### 6.1 建议的默认 owner decision package

为减少交互成本，先给出一套可回退的默认方案；它不是替 user 自动接受，只有在 user/acceptance owner
明确保留或修改后才成为 freeze input。

| bundle | 建议默认决定 | 允许效果 | 明确不包含 |
| --- | --- | --- | --- |
| consumer | `accept-experimental-slice-as-design-validation` | 用于协议 rehearsal、deterministic/mock fixture、有限 delegation 和后续 adapter 对照 | 不代表 canonical protocol acceptance、生产部署或 provider 优胜 |
| host/workspace | 每个 Run 使用隔离临时 workspace；首波默认无网络、无 secret、命令按显式 allowlist；shared write 先禁止 | 允许读 fixture、写 Run-local artifacts、产生可核验 diff | 不授予任意 shell、跨 Run 写入、账号权限或不可逆外部效果 |
| record/evidence | 每个 Run 必须保存 `cellId/requestId/runId`、source/fixture hash、Binding snapshot、typed events、execution return、mechanical checks 和 evidence refs；raw provider 资料作为 adapter evidence | 允许缺失项结构化为 `unknown/unavailable`，保留本地 bounded artifact | 不承诺永久 retention、跨进程 replay 或 semantic acceptance |
| comparison | 固定 Spec、fixture、非 executor workspace/tool/effect/limits/completion 条件；每个 executor 有自己的 Binding；provider/model/channel/account 作为比较维度记录 | 可比较 direct/delegated 或不同 adapter/model 的行为和成本 | 不把 Binding identity 差异隐藏，不从一次 Run 推出 provider 结论 |
| failure/stop | 默认不自动 retry；cancel 经过 request→drain→finalization；未知外部效果不得写成无效果；缺 identity/evidence/schema 时停止该 comparison lane | 可保留 partial Run、回退到 baseline、将结果标为 unknown/no-proposal | 不自动恢复 session、不吞掉 late effect、不用更多重复掩盖不可归因 |

建议的最小冻结判断为 `accept-current-boundary`；若其中任何安全/记录前提不被接受，则只需返回
`retain-unknown` 或 `revise` 对应行，不需要重新审阅整份协议。该 package 仍需 owner 回写后，才把
`minimum-contract-freeze` 从 `not-established` 改为成立。

### 6.2 当前暂停点

在 user 完成设计 review 前，明确暂停：

- 不创建 WorkCell core API 的代码、deterministic executor、adapter、provider integration 或 Run；
- 不把本 record 的默认方案写成 protocol acceptance、implementation authorization 或 provider choice；
- 允许继续做只读 source review、设计文字修订、反例补充和规划一致性校验；
- user review 返回后，只按具体 decision delta 修订本 record、readiness projection 和 canonical design，
  再重新判断是否达到 minimum-contract-freeze。

## 7. 阶段出口

experimental slice 只有在以下证据具备后，才可用于真实 harness 对照：

- deterministic executor 的 lifecycle/record/effect boundary 测试通过；
- 至少一个真实 adapter 能在可重建 fixture 上产生完整 RunRecord/Evidence；
- provider/model/channel identity 可重建，失败和 partial effect 不被吞掉；
- direct/delegated 或 provider comparison 的 evaluation card、独立 review 和回退路径存在；
- 结果明确区分 protocol behavior、adapter behavior、model behavior 和 semantic quality；
- 任一失败都能回写 design candidate、保留 unknown，并停止无归因的扩展。

这些证据只支持 bounded experimental adoption；不自动支持 WorkCell protocol acceptance、DeepSeek Harness
选型、生产部署或 base/runtime 实现授权。

## 8. 当前处置

`design-review-awaiting-user / user-consumer-named / minimum-contract-freeze-pending`。

下一步等待 user design review；review 前不实现 deterministic executor、core API、record/evidence path、
adapter 或 provider integration。review 后再按具体 decision delta 回写设计，再把仍然承重的五项压成一个短
owner-facing decision package，收到明确接受后才考虑 deterministic executor 和最小 core API、record/evidence
path，基于该 API 接入一个现实可用的 adapter，最后才开模型/provider 对照。完整 WorkCell
core 与 DeepSeek 工作系统仍遵守各自的设计接受前置。
