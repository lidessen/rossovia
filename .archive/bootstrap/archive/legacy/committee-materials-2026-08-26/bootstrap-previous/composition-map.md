---
kind: temporary-composition-map
id: project-formation-composition-map-2026-08-26
status: in-progress
disposition: gap-retained
owner: Main
consumer: Main
---

# 正式责任到临时配置的组建图

本表是候选责任槽位与本轮临时配置的只读责任分析 projection，不是正式角色枚举、成员 registry、assignment
清单或永久组织的接受结果；它不产生角色任命、authority 或 acceptance。角色槽位
先用责任描述，待概念和边界稳定后再决定正式命名；同一临时成员可以承接多个槽位，但不能因此取消独立复核和
接受边界。

“候选素材/能力”不是 `assignment`。只有实际配置写明执行主体、任务范围、期限、允许效果、写面和返回关系后，
才构成临时 assignment。skill/carrier 只提供判断或行动方法，不是 actor、角色、owner 或 acceptance authority。

正式 acceptance owner、独立 reviewer 和本筹备项目 settlement owner 当前均为 `unknown`；Main 只承担临时综合、
记录、路由和交接准备，不从这些责任中推出接受权。

本记录 frontmatter 的 `owner: Main` 只表示记录维护者，`consumer: Main` 只表示当前阅读/综合接收者；二者都不是
表中候选责任槽位的 owner，也不是 formal acceptance owner。

| 候选责任槽位 | 正式责任边界 | 临时 assignment / 执行主体 | source / operational authority / 写面 | 输出 / consumer | independent reviewer / acceptance owner | 范围、回落与当前缺口 |
| --- | --- | --- | --- | --- | --- | --- |
| 整体目标与临时综合 | 保留整体目标、source、跨贡献不变量、允许效果、fan-in 和临时整合写面；不拥有正式接受 | Main（本轮临时配置，非永久角色） | 根 `AGENTS.md`、goal、current plan/ledger；仅写 bootstrap 授权面 | design-preparation package；consumer unknown（意向为 formal design review） | reviewer unknown；acceptance owner unknown | 仅限本筹备项目；authority 冲突即 hold |
| 问题/场景与复杂度判断 | 恢复真实问题、主要矛盾、风险、可逆性和工具准备强度 | Main 或来源有界 producer；尚未形成具体 assignment | `concept-articulation`、`work-estimation`；写 design brief/局部 map | 问题/场景判断；Main 临时综合 | reviewer unknown；acceptance owner unknown | 需真实任务验证是否改变准备决策 |
| 工作图与委派编组 | 将多步骤目标拆成可返回 Task/Todo，选择直接/顺序/并行并维护 fan-in | Main；`agent-delegation` 只提供方法，不是执行主体 | current `planning/plan.md`；临时 work map，不建第二 plan | bounded contribution map；Main | reviewer unknown；acceptance owner unknown | current ledger 无 open wave 时不得自选执行 |
| 来源约束的表达与产出 | 把已确定语义写成人和 Agent 可理解、可行动的候选材料 | 临时 producer unknown；skills 只提供方法 | canonical source 只读引用；bootstrap 局部写面 | brief/map/候选 design；consumer unknown（意向为 formal design review） | independent reviewer unknown；acceptance owner unknown | 不把 skill 名称当 writer/owner |
| work / 外部效果 | 明确实际执行者、允许效果、权限、停止和失败边界 | 当前 unknown；本轮默认不产生外部 effect | 由具体 source/授权决定；不推导 runtime 权限 | 有界 work result；consumer unknown | mechanical observer unknown；semantic reviewer unknown | 未明确 owner 时不执行 |
| mechanical observation | 记录存在性、格式、digest 或其它确定性事实，不判断语义质量 | `validate-planning.rb`/`validate-skills.rb` 只能做机械检查；执行主体仍需明确 | 脚本输出/记录面；不改 canonical 语义 | mechanical observation；Main | semantic reviewer unknown；acceptance owner unknown | validator 通过不等于行为、review 或接受 |
| 机制与设计复核 | 检查新增机制是否有真实对象、owner、最小处置和回落边界 | reviewer unknown；`mechanism-design-review` 是方法 carrier | 候选材料只读；review 只写 review return | review return；Main/正式 review consumer | reviewer identity/independence unknown；acceptance owner unknown | 生产者不能复核自己的产物 |
| 实践回顾与下一行动 | 从真实结果提取 decision delta、反例、修剪和下一项最小实践 | Main；`practice-cycle` 是方法 carrier | existing record/plan owner；不创建万能循环 | next-practice recommendation；Main | reviewer unknown；acceptance owner unknown | 没有改变判断的动作不产生新机制 |
| skill 形成与工具准备 | 分开判断是否值得形成 skill 与准备确定性工具，不取得晋升/接受权 | skill owner unknown；`skill-formation`/scripts 是候选 carriers | 临时 adapter 写面；根 canonical skill 不改 | 保留/改写/降级/`no-proposal` 建议；consumer unknown（意向为 formal skill review） | reviewer unknown；acceptance owner unknown | 证据不足时不创建新 skill |
| 记录、lineage 与归档 | 保留来源、decision delta、unknown、失败路径、交接和只读归档关系 | Main 先准备；正式 retention owner unknown | records/bootstrap archive；不成为 current authority | record/exit package；consumer unknown | reviewer unknown；settlement owner unknown | 不静默删除；归档后不可覆盖 current |

## 当前组建判断

Round 1 只达到 `gap-retained`：责任类型已经拆开，但真实 producer/effect owner、mechanical observer、独立 reviewer、
formal acceptance owner、consumer 和 settlement owner 尚未形成可验证 assignment。不要增加角色或机制来填空，先
保留 unknown，并让下一轮只验证 carrier/activation 与最小临时配置。

## 临时配置原则

每次实际配置至少写明：责任槽位、执行主体、source、assignment 范围/期限、允许效果、写面、返回、consumer、
independent reviewer、acceptance owner、evidence standing、失败回落和交接对象。没有证据支持的候选关系保持
unknown；不能因为某个 skill 名称相近就任命它承接整体协调或接受权限。

正式角色是否由不同 Agent、同一 Agent 的不同工作段或人工承担，是临时配置问题，不改变正式角色之间的责任边界；
但不同工作段不自动构成独立复核。
