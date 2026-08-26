# 下一代项目开发种子

本目录是用旧项目孵化下一代项目的当前仓库内 seed。它提供 Agent 开发本项目时的最小入口和可选择方法，不取得
旧项目的 source、goal、plan、ledger、owner、acceptance 或 runtime authority。先读仓库根 [`../AGENTS.md`](../AGENTS.md)；
冲突时以根入口和当前 owner 的 source 为准。

当前 seed 是 **in-repo 模式**：`bootstrap/.agents/skills/` 的链接依赖本仓库根 `.agents/skills/`，不能把
`bootstrap/` 单独复制出去就声称可移植。交给下一代项目时，必须重新解析/复制 skills，并重建 source、owner、review、
evidence 和写面关系。

## 开发默认动作

1. 从当前 source 恢复问题、真实场景、目标状态、允许效果、owner、写面和 unknown；不要从文件名或形式倒推问题。
2. 先判断复杂度、依赖、不可逆风险和主要矛盾：简单、单步、可逆任务直接处理；中高复杂度任务先形成最小
   plan/todo/work map、工具准备和回落点。
3. 按下表的触发条件加载最小 skill；已有载体足够就复用，只有真实缺口才创造工具或 project adapter。
4. 多步骤/多任务必须由当前项目已有的 plan、todo 或 work map 驱动；有真实独立贡献且协调收益为正时才委派/并行，
   否则 Main 直接或顺序处理。
5. 执行最小可观察动作，分别记录实际加载、激活、assignment、behavior observation、decision delta、unknown 和
   failure；不把其中任何一项自动写成改善、接受或长期稳定。
6. 在 safe point 回顾并修剪：继续、修订、回退、hold、`no-proposal` 或归档；新增状态、队列、hook、协议、重试或
   生命周期机制前，先触发 `mechanism-design-review`。

## 可选择的开发 skills

这些是下一代项目实际开发工作流的方法，不是角色或组织成员；入口只提供路由，具体方法在对应 `SKILL.md`。不默认
全量加载，也不因为列在这里就表示已激活或已验证。

| 任务信号 | skill |
| --- | --- |
| 新想法、观察、疑问或待办尚未做 source-faithful capture | [`planning-inbox`](.agents/skills/planning-inbox/SKILL.md) |
| 问题、场景、概念、命名或边界会改变判断 | [`concept-articulation`](.agents/skills/concept-articulation/SKILL.md) |
| 复杂度、规模、依赖、工作量或工具准备会改变策略 | [`work-estimation`](.agents/skills/work-estimation/SKILL.md) |
| 需要选择/迁移文档、skill、tool、record、projection 或写面 | [`form-selection`](.agents/skills/form-selection/SKILL.md) |
| 存在多个可独立返回的贡献，需要判断 direct/sequential/parallel/delegate | [`agent-delegation`](.agents/skills/agent-delegation/SKILL.md) |
| 已决定委派，需表达 Agent 的 source、subject、范围、返回和失败边界 | [`agent-expression`](.agents/skills/agent-expression/SKILL.md) |
| 需要面向人表达，或维护人类/Agent 两种独立视图 | [`human-writing`](.agents/skills/human-writing/SKILL.md) / [`dual-audience-expression`](.agents/skills/dual-audience-expression/SKILL.md) |
| 准备引入状态、记录、队列、门、hook、协议、锁、重试或生命周期 | [`mechanism-design-review`](.agents/skills/mechanism-design-review/SKILL.md) |
| 已有真实实践结果，需要决定下一项最小行动 | [`practice-cycle`](.agents/skills/practice-cycle/SKILL.md) |
| 同一判断/行动差距反复出现，需要形成、拆分、合并、降级或删除 skill | [`skill-formation`](.agents/skills/skill-formation/SKILL.md) |

静态阅读、预期、模拟和 validator 通过不等于真实实践；没有真实独立贡献时，不为形式继续加载委派相关 skills。

## Authority、写面与交接

- 根 `AGENTS.md`、current goal、`planning/plan.md`、`planning/item-ledger.md` 和各自 canonical source 继续拥有旧项目
  authority；bootstrap 只能在任务授权内引用、选择、转译和提出候选。
- 修改 bootstrap seed 自身只写 `bootstrap/**`；开发下一代项目产物时，可以写入任务明确授权的 `planning/`、`design/`、
  `theory/`、`research/`、`evals/` 或其它 canonical surface，但不得借 bootstrap 绕过 owner、source、review 或 acceptance。
- `bootstrap/.agents/skills/` 当前只是根 canonical skills 的选择性链接；不要在此复制同一 canonical 正文。只有有独立边界、
  consumer、允许效果、失败边界和相称证据时，才形成 project adapter。
- `archive/legacy/` 只用于 lineage、失败回溯和历史审计，正常启动不得默认读取；它不反向覆盖当前 source。
- 返回至少说明 source、subject、实际加载/激活的 skill、assignment、产物和精确写面、观察、review、acceptance owner、
  consumer、evidence standing、decision delta、unknown、下一步和回落。未知关系保持 `unknown`。

## 统一回落

- 根 source 或被触发的 skill 不可读/链接失效：停止扩展，保留 unknown，`hold`，回到最近可靠 source；
- 没有 current plan/todo/work map 或当前 execution wave 未打开：不自行扩大范围，回到真实 owner 或 `no-proposal`；
- 没有真实独立贡献、sub-agent 不可用或协调成本超过收益：Main 直接/顺序处理；
- 无法确认 owner、consumer、review 或 acceptance：只交付 candidate/observation，不晋升、不接受；
- 产生不可逆风险、权限升级或冻结范围冲突：停止并回落，不以增加文件、状态或机制掩盖缺口。

bootstrap 结算时保留 seed、skill 依赖、来源、实践观察、失败路径和处置记录；稳定且有相称证据的内容才由真实
owner 交给下一代项目或正式 surface。当前不实现 WorkCell、DeepSeek Harness、runtime 或其它冻结范围。
