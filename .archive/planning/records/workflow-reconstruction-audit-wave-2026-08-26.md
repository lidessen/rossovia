---
kind: planning-record
id: workflow-reconstruction-audit-wave-2026-08-26
status: settled
disposition: workflow-draft-revised-independent-review-complete
evidence: multi-agent-read-only-audit-and-independent-review
settlement_route: independent-review-and-real-dogfood
owner: user
consumer: project-workflow-reconstruction
review_at: workflow-draft-review
---

# 工作流重建审计波次（2026-08-26，已被过渡问题打回）

## 1. 目的与边界

本波次由用户明确要求触发：暂时暂停 WorkCell，先回顾已有成果和历史，形成一套本项目可以先实践、再
修正的工作流；在该工作流上重新整理项目结构、skills 和文档，达到条件后再重新设计和实现 WorkCell。

本记录保存本轮多 agent 审计的来源、综合结果和 decision delta。它不是工作流正文、当前 plan 的第二份版本，
也不接受 WorkCell、DeepSeek Harness 或任何实现。用户随后指出本轮遗漏了 bootstrap/transition layer；因此
本记录只保留为上一版路线的历史审计，不再作为当前阶段出口依据。

## 2. Agent 拓扑与实际贡献

Main 保留整体、权威、跨贡献不变量、fan-in、最终写面和用户 review。四个只读 agent 分别处理互不相同的输入面：

| agent | 有界贡献 | 返回内容 |
| --- | --- | --- |
| A | 当前成果、历史、authority、重复 projection 和真正影响下一阶段的未知 | 成果分组、过度流程、版本化缺口和 Main 建议 |
| B | 实践优先工作流与 harness theory/research/skill 边界 | 可承重原则、重复闭环和最小工作流建议 |
| C | `.agents/skills/`、portable `skills/`、theory/harness、design、records 的 ownership 和重复 | skill inventory、边界、保留/窄化/降级条件和加载路由 |
| D | pre-WorkCell 阶段 plan、迁移拓扑、agent 分工和 WorkCell reopen 条件 | 阶段序列、并行/顺序边界、迁移安全策略和出口 |

四个 agent 均只读工作树，没有修改共享文件、创建 Run、接受对象或授权 WorkCell。随后由未参与生产的
独立 reviewer 做只读复核，返回 `REVISE`；该 verdict 不是用户 acceptance，也不取得修改、接受或实现授权。

## 3. Main fan-in 结果

### 已观察的成果

- 项目已经形成较完整的 authority map、living/archive 边界、harness task-engineering 理论、WorkCell Draft、
  project-local skills、research/eval standing 和多条设计边界。
- 这些成果多数已经完成“调查、整理、review 或 disposition”这一层，但不等于 semantic acceptance、activation、
  adoption、regression 或 implementation authorization。
- 当前 11 个 skills 位于 `.agents/skills/` incubation；portable `skills/` 没有相称接受，不应批量复制。
- WorkCell 已有唯一 Draft 设计正文，但用户现在要求把它放到后续阶段，当前不继续窄 review。

### 主要问题

- 同一工作流被分别写入 harness theory、迭代理论、自治/owner-facing candidate、实验设计、研究结算、planning、
  records 和多个 skill；审计区分成立，但日常使用入口不清，维护成本过高。
- `plan`、`roadmap`、`item-ledger`、bounded records 和 dated projection 之间存在重复 current wording，容易
  把 review-complete、settled、observed 和 accepted 混读。
- 成果形成速度超过版本化 checkpoint、named owner、真实 consumer 和 adoption evidence；当前主要缺口不是继续
  生产更多分析，而是把已有成果转成可用、可试、可回退的工作面。
- 第一阶段定义过宽时，reading acceptance、关系 fixture、方法采用和 WorkCell 前置会互相阻塞；应把“能否进入
  WorkCell design review 的最低材料”与长期 adoption obligation 分开。

### 稳定的工作流判断

1. 实践不等待正式化：idea、Draft、trial 和 formal 方法都可以在有界问题中先使用；实践结果决定回写、修订、
   保留、降级、回退或 no-proposal。
2. 记录首先是记忆保全，不是成熟度 gate；capture、试行和正式采用是不同关系。
3. 多步骤/多任务必须由 Plan/Todo/work map 驱动；复杂度决定准备、工具和委派强度。
4. Main 保留整体，child 只承接来源有界、可独立返回的贡献；并行只适用于真实独立输入/写面，共享写面和
   真实依赖必须顺序处理。
5. 初始设计 review 和实践后 checkpoint 都要做回落/修剪；不能承重的字段、状态、角色、record 或工具降级，
   不因流程完整而保留。

## 4. 已产生的 decision delta

- WorkCell 被标记为当前 `paused-by-priority / design-review-deferred / implementation-not-authorized`，不再是当前工作波次。
- 新增唯一的本项目详细工作流 Draft：[`design/harness-workflow.md`](../../design/harness-workflow.md)；不把它当作跨项目规范。
- 在 [`AGENTS.md`](../../AGENTS.md) 增加极简默认工作规则；详细论证不复制到 AGENTS。
- [`planning/plan.md`](../plan.md) 的当前主序列改为：工作流重建 → 结构/skills 收敛 → WorkCell 设计 → DeepSeek 系统设计 → 实现 → 用户构想。
- `planning/README.md` 增加工作流入口；不改变 theory、WorkCell protocol 或 runtime。
- 尚未执行文件迁移、skill 合并/降级或 WorkCell 设计修改；这些必须等 workflow Draft 的 review 和真实 dogfood。

## 5. 证据上限与未知

当前支持：`source-observed / multi-agent-planning-synthesis`。这证明本波次完成了有界只读审计和 Main fan-in，
不证明工作流已被实践、改善、接受或稳定。

仍未知：

- 新工作流能否减少真实任务的恢复、重复和协调成本；
- 新的文档边界是否能让冷启动 reader 直接找到 design 和 plan；
- 哪些现有 skills 会在真实 consumer 中改变行为，哪些应降级为 reference 或项目规则；
- 当前未提交 living tree 应如何形成可恢复的 Git checkpoint；
- 用户是否接受当前 Draft 的阶段出口和 WorkCell reopen 条件。

## 6. Independent review

独立 reviewer 的主要 decision delta 是：

- 清除 README 与 plan 中“WorkCell 暂停”与旧 `active-after-prerequisite` 的冲突投影；
- 把本次 Main + 4 的实际拓扑保留为历史事实，不写成默认人数或角色枚举；
- 把 research/experiment 结算改成按实际 consumer、后果和回返需要选择，不设所有实践必须经过的固定 gate；
- 为下一波真实 dogfood 指定现有 work-map carrier、consumer、baseline、单一假设、允许效果、观察和回退；
- 分开 pre-dogfood 独立 review 与实践后的整体 checkpoint；迁移和 skill 形成不由工作流正文自动授权。

Main 已据此修订 `planning/README.md`、`planning/roadmap.md`、`planning/plan.md` 和本工作流 Draft。当前
结论仍是 `REVISE` 后可进入真实 dogfood，不是 workflow accepted。

## 7. 下一步

1. 在一个真实多步骤 planning/design wave 中 dogfood，使用现有 `planning/plan.md` 作为 work-map carrier，
   不制造 synthetic Run。
2. 记录实际 decision delta、成本、未知、回落和下一步；没有 delta 时返回 `no-proposal` 或回退。
3. 完成整体 checkpoint 后，再决定单对象迁移、skill 形成/窄化和是否 reopen WorkCell design review。
