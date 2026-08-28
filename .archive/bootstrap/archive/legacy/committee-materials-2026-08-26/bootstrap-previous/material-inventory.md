---
kind: preparation-inventory
id: project-formation-material-inventory-2026-08-26
status: in-progress
owner: Main
consumer: Main
---

# 现有素材与能力盘点

这是一张筹备项目的候选素材盘点，不是复制清单、任命清单或接受清单。素材只有在能承接某个明确责任、来源
地位可说明、并有相称证据时，才可能进入临时班子。

## 盘点规则

对每项素材至少记录：canonical source、来源地位、能够承接的判断/行动、候选角色槽位、现有证据、未知、
写面/权限和回落方式。`存在文件`、`可被读取`、`可以执行`、`已经验证`和`适合成为通用 skill` 不得混为
同一关系。

## 当前素材面

| 素材类别 | 当前 canonical/入口 | 可贡献的关系 | 不能直接推出 |
| --- | --- | --- | --- |
| 项目边界 | [`AGENTS.md`](../AGENTS.md) | 项目 authority、目录边界、实现冻结 | 完整组织设计、角色任命 |
| 哲学与术语 | [`theory/philosophy.md`](../theory/philosophy.md)、[`theory/gene-expression.md`](../theory/gene-expression.md) | 价值方向、术语和概念约束 | 某个具体 workflow 或 runtime |
| Harness 理论 | [`theory/harness/theory.md`](../theory/harness/theory.md) | 跨场景的 harness 语义和设计问题 | 本项目正式组织已被接受 |
| 当前规划 | [`planning/plan.md`](../planning/plan.md)、[`planning/item-ledger.md`](../planning/item-ledger.md) | 当前顺序、standing、边界和回写路线 | 正式 design 的角色结构 |
| 用户观点与来源 | [`planning/inbox.md`](../planning/inbox.md)、[`planning/inbox-history.md`](../planning/inbox-history.md) | 保留问题、偏好、纠正和来源 lineage | 自动变成结论或授权 |
| 过渡入口 | [`planning/transition-package.md`](../planning/transition-package.md) | 当前启动约束、点火和回落 | 永久组织或正式 workflow |
| 既有设计 | [`planning-artifact-organization.md`](../design/planning-artifact-organization.md) | 旧候选、问题线索和可复用片段 | 当前正式 design；`harness-workflow` 明确是前综合稿 |
| Incubating skills | [`agent-delegation/SKILL.md`](../.agents/skills/agent-delegation/SKILL.md) | 已形成的局部判断/行动载体候选 | 整体协调、正式接受或 runtime 保证 |
| 项目脚本 | [`scripts/README.md`](../scripts/README.md) | 验证规划/skill 结构的机械检查 | 语义判断、组织协调或质量证明 |
| 评审与实践 | [`records/README.md`](../planning/records/README.md)、[`evals/README.md`](../evals/README.md)、[`experiments/README.md`](../experiments/README.md) | 观察、反例、证据和 lineage | 单次观察自动成为正式规则 |
| 可用 Agent 能力 | 当前运行环境的 sub-agent 和 Main | 来源有界的独立贡献、复核和综合 | 永久角色、固定成员或自动接受权 |

## 仍需盘点的内容

- 每个 incubating skill 的真实边界、输入、输出、失败和 evidence standing；
- 现有 design/research/record 中已经形成但没有 carrier 的责任；
- 当前脚本和外部工具能否支持真实任务，缺口和安全边界是什么；
- 可用 Agent 的模型、工具、隔离和写面差异，以及它们在何种贡献上才有真实独立性；
- 哪些素材在正式组织中应成为 role method、skill、reference、tool、record 或 archive，而不是继续复制。

盘点完成的标准不是“列完所有文件”，而是 composition map 能解释每个正式责任由谁暂时承接、证据是什么、缺口
如何验证，以及为什么没有把其余素材塞进班子。
