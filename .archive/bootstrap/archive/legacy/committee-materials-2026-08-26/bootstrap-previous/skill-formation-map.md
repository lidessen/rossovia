---
kind: workflow-skill-composition-map
id: project-formation-workflow-skill-map-2026-08-26
status: in-progress
owner: Main
consumer: Main
---

# 本项目工作流 skills 组合图

本图回答的是“实际工作流需要哪些可选择的方法”，不是“临时班子有哪些成员”。临时班子的能力面直接取自
根目录 `.agents/skills/` 的 canonical workflow skills；本目录只记录触发关系、贡献边界、不能承接的责任和当前
证据，不复制正文，也不把 skill 名称当成角色、owner、authority 或 acceptance。

下表的每一行首先只表示根 canonical skill 已存在且可发现，即 `carrier-present`；不表示该 skill 已进入本轮
上下文、已激活、已分派、已形成责任覆盖或已被验证。只有真实任务返回相应关系和观察时，才另行记录
`carrier-loaded`、`skill-activated`、`assignment`、`behavior-observed` 或针对具体主张的 `evidence`。

## 工作流组合

| 工作流问题/触发条件 | canonical skill | 临时班子的最小贡献 | 不能承接 | 当前证据/状态 |
| --- | --- | --- | --- | --- |
| 用户提出想法、问题、观察或待办，需要低摩擦保留 | [`planning-inbox`](../.agents/skills/planning-inbox/SKILL.md) | 保留来源语意、适度纠正表达、记录回执和待处理关系 | commitment、priority、owner、completion 或 acceptance | carrier-present；真实激活需绑定 capture 任务 |
| 问题、场景、概念或命名含混，需要形成可区分边界 | [`concept-articulation`](../.agents/skills/concept-articulation/SKILL.md) | 区分对象、特征、关系、最近邻和实际用途 | 自动决定目录、流程或正式术语接受 | carrier-present；真实激活需有边界判断输出 |
| 复杂度、规模、变量、分支和准备工作不明 | [`work-estimation`](../.agents/skills/work-estimation/SKILL.md) | 恢复目标状态和最小工作图，判断并行/顺序及可容忍粒度 | 执行时间、token、成本或结果保证 | carrier-present；真实激活需有工作图或分支判断 |
| 已有语义对象，需要决定放文档、skill、tool、record 或 plan | [`form-selection`](../.agents/skills/form-selection/SKILL.md) | 选择最小真实载体、受众、写面和权威关系 | 让形式本身取得 authority，或凭形式证明有效 | carrier-present；是临时组合的常用核心 skill |
| 任务存在多个有界贡献，需要判断是否委派及如何 fan-in | [`agent-delegation`](../.agents/skills/agent-delegation/SKILL.md) | 判断直接/顺序/并行/嵌套拓扑，隔离生产与评审并重连来源和证据 | 把 sub-agent 当永久角色，或替 Main 做整体接受 | carrier-present；真实激活需返回独立贡献边界 |
| 需要把任务、方法、返回和验收关系表达给 Agent | [`agent-expression`](../.agents/skills/agent-expression/SKILL.md) | 形成来源有界、可行动、可返回的任务契约 | 代替 Main 做目标综合、owner 决策或接受 | carrier-present；真实激活需有任务契约或回传 |
| 同一语义需要供人理解、供 Agent 判断/行动的不同视图 | [`human-writing`](../.agents/skills/human-writing/SKILL.md) / [`dual-audience-expression`](../.agents/skills/dual-audience-expression/SKILL.md) | 分别形成自然表达与 Agent 可判断视图，维护唯一权威和派生关系 | 重新定义概念、事实核验或授予组织权限 | carrier-present；按受众实际触发 |
| 新增状态、记录、队列、门、hook、协议或生命周期机制 | [`mechanism-design-review`](../.agents/skills/mechanism-design-review/SKILL.md) | 判断真实问题对象、现有 owner、必要性、最小处置和回落 | 以形式审查代替 owner 接受，或直接实现未接受机制 | carrier-present；新增机制前优先触发 |
| 已有实践结果、失败或含混观察，需要决定下一项最小实践 | [`practice-cycle`](../.agents/skills/practice-cycle/SKILL.md) | 识别观察、反例、decision delta，修订当前理解并给出下一步 | 把一次结果直接升格为理论、正式设计或普遍改善 | carrier-present；真实实践后触发 |
| 反复出现判断/行动差距，需要判断是否形成或调整 skill | [`skill-formation`](../.agents/skills/skill-formation/SKILL.md) | 检验独立边界、consumer、允许效果、失败边界和相称证据 | 以文件数量、validator 通过或一次筹备证明能力 | carrier-present；形成候选时触发 |

这些 rows 是选择关系，不是必须依次执行的固定阶段。实际任务先由入口和 current plan 判断，再按触发条件加载
最小组合；没有触发条件就不加载，没有独立贡献就不委派。

## 关系不得混用

以下关系分别记录，不合并成一个模糊的“状态”：

- `carrier-present`：载体路径和版本存在、可发现；不表示已读取、已使用、已分派或有效。
- `carrier-loaded`：载体内容进入当前任务上下文；不表示 skill 已激活、行为已改变或责任已承接。
- `skill-activated`：Agent 在指定任务和 subject 中主动选择并使用该方法；不表示成功、改善、稳定或接受。
- `assignment`：某执行主体在范围和期限内承接责任槽位并承诺返回；不表示 carrier 已加载或 skill 已激活。
- `behavior-observed`：观察到具体判断、行动、产物或失败；不表示因果改善、可迁移性或长期稳定。
- `evidence`：来源或观察支持某一个有界主张；它不是角色状态，也不替代 acceptance。

Main、producer、semantic reviewer、mechanical observer、acceptance owner、consumer 和 settlement owner 也分别
记录。未知关系保持 `unknown`，不得用 skill 名称、文件存在或 validator 通过填充。

## 当前缺口

- 正式组织层面的整体协调、责任覆盖、独立复核和接受关系尚未形成可验证 assignment；
- 长时间工作中的任务连续性、回顾触发和方法滚动更新仍缺真实实践证据；
- 临时班子的配置、交接、退出和归档后恢复仍是设计问题，不由某一个 workflow skill 自动承接；
- 多 Agent 并行收益、人机交互成本和 Main 的 fan-in 质量尚未被真实任务验证；
- design、plan、skill、record、eval 和 archive 的单一权威维护仍需在实际工作中观察。

这些是能力缺口，不立即新建 skill。先绑定真实场景、consumer、允许写面和最小探针，再由
`skill-formation` 判断是否值得形成新的项目 adapter 或 portable skill。

## 明确不形成的候选

`bootstrap-committee-assembly` 原本是本次筹备过程中错误生成的元协调候选。它描述如何组装本目录，不能代表
本项目正常工作流的能力；没有独立于 `AGENTS.md`、`form-selection`、`agent-delegation` 和
`skill-formation` 的稳定边界或行为证据。因此本轮结论为 `no-proposal`：已从 active 目录移出，不作为临时班子
skill，不晋升、不复制。后续若真实任务暴露独立且反复的项目适配差距，再重新走 skill 形成判断。

## 形成出口

一个新的 workflow skill 或项目 adapter 至少需要：反复出现的判断/行动差距、明确 consumer、可独立加载的边界、
允许效果和失败边界、与现有 skill 的非重复关系、明确写面，以及相称的真实实践证据。只在一次筹备中出现的
协调动作优先保留为 `AGENTS.md` 规则或筹备记录，不提前固化为 skill。
