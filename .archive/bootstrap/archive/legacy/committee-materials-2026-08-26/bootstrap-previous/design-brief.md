---
kind: design-brief
id: project-formal-organization-design-brief-2026-08-26
status: in-progress
owner: Main
consumer: unknown
intended_consumer: formal-project-design-review
---

# 正式工作组织与工作流设计简报

本简报是临时筹备项目的前置材料，不是正式 design。它只固定问题、场景、约束和设计出口，避免直接从旧
workflow 或文件布局拼出一个未经分析的方案。

## 要解决的问题

本项目需要一种能够持续处理项目级及更大规模任务的工作组织：能够从用户输入恢复问题和真实场景，利用现有
理论、文档、skills、脚本和 Agent 能力，进行必要的准备、有限委派、执行、观察、纠偏、记录和交接，同时尽量
减少人机交互成本。

当前无法可靠自举的原因尚未完全定论，但已有直接信号：工作流设计混合了背景和规范内容，临时启动层没有按
正式组织形态设计，角色/权责/skill 指导缺失，筹备材料和正式 design 的边界不清。因此不能把现有
`design/harness-workflow.md` 直接当作正式 design。

## 真实场景

- Main 处理一个持续时间较长、可能包含多个子任务和多种工具的项目级目标；
- 用户希望极少数大事事先请示，小事先推进、事后纠偏；
- 任务复杂度、未知、依赖、风险和可逆性不同，处理强度不能固定；
- 可用能力分散在理论、文档、skills、脚本、评审结果、模型和外部工具中；
- 工作需要可被冷启动 Agent 接手，也需要在阶段性回顾中修剪、改进和回落；
- 当前阶段不包括 WorkCell、DeepSeek Harness 或任何 runtime/implementation。

## 目标组织需要回答的设计问题

1. 正式工作组织的真实对象、使命、边界和最小责任集合是什么？
2. 哪些角色槽位必须存在，分别负责什么输入、输出、权限、独立性、复核和交接？
3. Main、sub-agent、reviewer、记录者、工具/skill 形成者之间是什么关系，哪些不能由同一方同时决定？
4. 现有素材和能力哪些可以承接这些责任，证据地位是什么，缺口如何补齐？
5. 哪些判断/行动应该形成 skill，哪些只需保留为文档、工具、项目约定或一次性筹备材料？
6. 临时班子如何继承正式组织的角色与权责，又如何限制范围、期限、授权并最终交接或回落？
7. 怎样通过真实任务验证责任覆盖、交接质量、协调成本、决策变化和纠偏能力，而不是用文件数量或流程完整度
   作为成功指标？

## 责任关系链

正式设计前，至少把以下链条逐项绑定到 source、允许效果和 owner；未知关系必须保留，不能由文件存在或名称补齐：

```text
source
  → work / external effect
  → mechanical observation
  → semantic review
  → acceptance
  → consumer
  → next action / canonical record
```

临时班子可以准备和执行有界的 `work`，但不能取得正式 acceptance；没有独立 reviewer 时不能宣称 review 成立，
没有 acceptance owner 时不能宣称 design 或 skill 已接受。`owner`、`consumer`、`acceptance_owner`、`source`
和 `evidence` 是不同关系。

## 不变约束

- 当前 authority 仍由项目入口、current plan、item ledger 和各 canonical source 拥有；筹备材料不能自封为
  正式设计或接受决定。
- 捕获用户观点和形成设计结论是两件事；用户输入先保留，设计判断必须有明确来源和证据边界。
- 临时不等于低规格：正式组织的结构性责任必须先被设计，再按临时范围裁剪实例。
- 多步骤任务使用 Plan/Todo/work map；并行只在存在真实独立贡献且 Main 能综合时使用。
- 设计、理论、skill、research、experiment、record 和 archive 不因相似内容而互相替代。
- WorkCell 设计和实现冻结。

## 设计出口

本简报只有在以下信息足够明确后，才允许写正式 design 草案：目标组织和真实 consumer、角色/权责/接口、
临时实例关系、skill 边界、失败/回落/交接、最小验证方案和未决 owner 选择。若关键问题无法回答，应输出
带 unknown 的 design-preparation 结论或 `no-proposal`，不能用命名、状态或更多文件掩盖缺口。
