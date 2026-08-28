---
kind: preparation-record
id: temporary-committee-design-iterations-2026-08-26
status: active
owner: Main
consumer: Main
retention: archive-with-bootstrap-project
---

# 临时班子多轮设计迭代记录

本记录只记录本次临时班子设计的迭代观察、decision delta、unknown 和修剪依据，不是 current plan、角色 registry、
状态机或正式 design。实际班子仍由根目录 `AGENTS.md`、临时 skills、选定的 canonical skills 和必要工具组成。

`status: active` 仅表示这份记录仍在维护，不表示某个工作流正在运行；文中的“出口”仅表示本次 bounded design pass
的 disposition，不是永久状态或固定生命周期阶段。

## 迭代原则

- 每轮只解决一个可区分的设计问题，并由独立贡献返回反例、缺口和最小修订；
- Main 负责跨轮综合和共享写面，生产者不因提出候选而获得接受权；
- 先设计正式组织的责任，再设计临时实例；临时只裁剪范围、期限和授权；
- 每轮都要有删减出口，不能用更多角色、skill、字段或文档掩盖未决问题；
- 轮次不是正式生命周期，也不构成“轮数越多越成熟”；能改变判断的观察才进入下一轮；
- 结算时本记录随整个根级 `bootstrap/` 目录只读归档。

## 迭代单位

这里不预设 Round 1/2/3/4 的必经阶段，也不把轮数写成成熟度。每次只因一个会改变设计判断的矛盾启动一次
bounded design pass；如果没有新的 decision delta，就停止、合并或 `no-proposal`。

| 触发的设计问题 | 最小独立贡献 | 可能写面 | 出口 |
| --- | --- | --- | --- |
| 正式责任、角色槽位和 authority 混淆 | role/authority review；最近邻和反例 | `AGENTS.md`、`composition-map.md`、`design-brief.md` | responsibility-supported / gap-retained / revise |
| carrier、skill、activation、assignment 混淆 | carrier/activation review；最小加载探针 | `AGENTS.md`、`.agents/skills/`、`skill-formation-map.md` | carrier-backed / adapter-needed / no-proposal |
| 组织配置过度、写面或归档关系不必要 | mechanism/minimality/archive review | `AGENTS.md`、`README.md`、归档约束 | retain / prune / hold / settle |
| 冷启动或整体回读暴露结构缺口 | independent cold-start/whole review | review record 与上述唯一写面 | trial-ready / revise / no-proposal |

## 已完成的前置观察

根目录临时入口已经通过一次冷启动可加载性观察：Agent 能从 `bootstrap/AGENTS.md` 找到根 canonical workflow
skills、允许/禁止效果、返回、交接和回落关系。此前被读取的 `bootstrap-committee-assembly` 经本轮纠正确认不是
工作流 skill；该载体不再属于 active 组合，观察不能证明责任覆盖、行为改善或正式接受。

## 当前 design pass：责任与 authority（2026-08-26）

当前问题：角色槽位是否按正式组织的责任建立，还是仍然把 Main、Agent、skill、文档和临时配置混成一层？

当前必须回答：整体 owner、source owner、producer、independent reviewer、mechanical observer、record/retention、
下游 consumer、acceptance owner 和临时筹备 coordinator 的区别；哪些是责任角色，哪些只是本轮执行者或 carrier；
临时班子在没有正式 acceptance 的情况下可以做什么、不能做什么。

本次 pass 的结果：`gap-retained / revise`。审查发现责任类型需要拆开，但真实 producer/effect owner、mechanical
observer、独立 reviewer、formal acceptance owner、consumer 和 settlement owner 尚未形成可验证 assignment；
不增加角色或机制填空，先保留 unknown，并把下一次 pass 限定为 carrier/activation 与最小临时配置。

本次实际修订同时确认：`bootstrap-committee-assembly` 暂不作为默认 skill；`README`、inventory、skill map 和本日志
不进入普通冷启动的默认读取面；“完整班子”不等于全量加载素材；固定四轮不构成必经阶段。若没有新的可观察矛盾，
下一次 pass 应直接 `hold`，不继续堆 carrier。

## 当前 design pass：workflow skill 组合纠正（2026-08-26）

当前问题：临时班子的 skill 是否来自实际工作流，还是错误地把筹备过程中的元协调动作当成了工作流能力？

本次 decision delta：确认实际班子应由根目录 canonical workflow skills 按触发条件组成，覆盖 capture、问题/概念、
复杂度评估、形式选择、委派、Agent 表达、人类/双受众表达、机制复核、实践回返和 skill 形成；不全量加载，也不
新增“组装班子”skill。`bootstrap-committee-assembly` 记为 `no-proposal` 并移出 active 目录，根 skills 保持单一
权威。

本次出口：`composition-corrected / gap-retained`。当前仍只有可读性和结构修订证据，没有 skill 激活、责任覆盖、
行为改善或正式接受证据。下一项最小探针必须绑定真实多步骤任务，且与 Main baseline 对照；若没有独立贡献则回落
直接处理，不继续堆 carrier。
