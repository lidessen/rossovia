# agent-tooling 当前处置

状态：`source-observed / no-proposal-now / archive-only / independent-review-complete /
acceptance-pending`；本记录不是 skill acceptance、portable promotion、工具调优、环境 mutation
或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象与当前判断

历史 `agent-tooling` 只拥有一个窄判断：**给定具体任务和已安装 coding-agent harness，选择或
调整执行面与 tooling surface，使 Agent 保留足够能力并减少可避免负担。** 它不拥有用户环境
迁移、项目 workflow 诊断、multi-agent orchestration、model capability claim、WorkCell 调度或
runtime 强制。

当前主任务是整个 planning 的 source/standing/owner/出口整理，以及 WorkCell/DeepSeek 设计
前置审查；它没有提出一个需要 ordinary/lean harness、权限 profile、hook/MCP/plugin reduction
或 rollback 的具体 tooling task。因此本轮不能把当前 planning work 当成 `agent-tooling` 的真实
consumer，也不能仅因 Codex/CLI 可用就创建 `.agents/skills/agent-tooling/` carrier。

## 2. 来源与历史证据

- 历史正文：[`archive/skills/agent-tooling/SKILL.md`](../../archive/skills/agent-tooling/SKILL.md)，
  其对象、正负触发和最近邻边界仍可辨认，但 archive 不是 living canonical。
- 历史 first-slice：[`archive/evaluations/2026-07-23-agent-tooling-first-slice.md`](../../archive/evaluations/2026-07-23-agent-tooling-first-slice.md)。
  它观察到本地 capability cache、ordinary/headless/clean diagnostic surface 选择、工具负担
  reduction 边界，以及不按 installed count 删除工具；也记录了 Cursor keychain failure 和
  未授权 Flash 路线，因此没有把 Flash-class attribution 或真实配置 mutation 写成事实。
- 当前候选 map：[`next-candidate-review.md`](next-candidate-review.md) 曾把它标为
  `candidate-next`，条件是冻结无写入 task、installed harness、权限边界和 rollback 后做
  ordinary/lean matched probe。
- 当前工作树检查未观察到 `.agents/skills/agent-tooling/` 或 portable `skills/` carrier；本记录也
  没有创建任何一个。这个观察不替代对所有外部环境或其他 branch 的全局审计。

历史证据支持“方法候选仍有可能有用”，但不能证明当前 branch 存在重复 gap、当前 consumer、
matched improvement、regression 或 acceptance。

## 3. 形式与最近邻判定

| 关系 | 当前判断 | 处置理由 |
| --- | --- | --- |
| 是否形成 living skill carrier | `no-proposal-now` | 没有当前具体 task envelope、installed surface、权限/接受条件和可归因差距；当前 planning 任务也不属于它的 owner |
| 是否降级为普通 reference | 暂不 | 历史方法的判断对象和未来 probe 仍可独立恢复；当前只是没有 consumer，不是已证明其只需 reference |
| 是否删除历史来源 | 否 | archive 与历史评估保留未来 reopen 的对象、边界和失败证据 |
| 是否迁移到 portable `skills/` | 否 | 没有脱项目当前事实的 consumer、matched evidence、回归和接受关系 |
| 与 `agent-environment` 的边界 | 保持 | environment 负责 desired setup、跨设备 reconciliation、secrets/local state；tooling 只处理已安装 harness 的任务执行面 |
| 与 `agent-delegation` / WorkCell 的边界 | 保持 | tooling carrier 不是贡献拆分、调度、组合、claim、取消或恢复机制 |
| 与 `task-shaping` / `systems-engineering` 的边界 | 保持 | tooling 不能替代任务包络判断或 whole-system reliability owner |

因此当前处置是 `no-proposal-now / archive-only`，不是 `demote`、`delete` 或“方法无效”。它
只关闭本 branch 的 carrier/probe 提案，保留未来在真实任务出现时重新判断的入口。

## 4. 未来 reopen 的最小入口

以下关系足以重新打开 `agent-tooling` 的 proposal，但不自动证明 proposal、carrier 或行为已接受：

1. named tooling consumer 和具体 task envelope：任务、workspace、目标产物、接受条件及失败后果；
2. 一个可观察 burden/missing-capability/failure，说明 ordinary surface 与 lean/diagnostic
   alternative 之间存在会改变下一选择的差异；
3. 当前 owner 能说明该差距不属于 `agent-environment`、项目 workflow、`agent-delegation`/WorkCell
   或 model-evaluation 的更近边界。

只有 proposal 真正开启后，才需要为 material claim 建立后续 probe：读取已安装 harness、版本、
auth carrier、ordinary entry、有效 rules/skills/hooks/MCP/plugins、工具和权限边界；固定任务、
模型/auth carrier、workspace、输入和 acceptance，比较只改变 tooling surface 的 baseline/treatment；
优先无写入或可回滚 task，并由独立 reviewer 判断 capability retained、burden changed、遗漏能力、
wrong surface、延迟/usage、hook failure、recovery 和 rollback。这样才可能讨论 matched、regression
或 acceptance；proposal 本身不取得这些 standing。

若只出现“需要 CLI”或“目录里有很多 tools”，这既不是 `agent-tooling` 的差距证据，也不是删除
工具的依据；若出现 setup/migration 请求才进入 `agent-environment`，出现具体 harness task 和
burden 才重新考虑 `agent-tooling`，出现多 Agent 分工才进入 `agent-delegation`/WorkCell，出现
项目 workflow 失败才交给项目 workflow owner。

## 5. 阶段影响与证据上限

- A1/A2 的 archive candidate review 获得一个明确当前去向：本记录关闭一个当前没有 consumer
  的 `candidate-next` 激活提案，但不改变历史方法的未来 reopen 条件。
- 不创建 `.agents/skills/agent-tooling/`，不移动 archive，不运行 tooling probe，不读取或修改
  用户 secrets/local state，不改变 Codex/CLI 配置。
- 本记录没有修改现有 incubating skills，也不改变 WorkCell、DeepSeek Harness、base/runtime 和用户
  harness 构想的冻结。
- 本记录的 evidence standing 仅为 `source-observed`；没有当前 behavior Run、matched improvement、
  regression-supported、portable acceptance 或 runtime guarantee。

下一项最小实践是由未来真实 consumer 提供上述 task envelope；在此之前保持 `no-proposal-now /
archive-only`，不为了覆盖 archive candidate 而创建 carrier 或假 probe。
