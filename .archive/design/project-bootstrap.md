---
kind: design
id: project-bootstrap-seed-2026-08-26
status: draft
scope: current-project-next-generation-seed
owner: Main
consumer: Main
acceptance_owner: unknown
---

# 本项目下一代开发种子设计

## 1. 设计对象

`bootstrap/` 是用当前项目孵化下一代项目的开发种子。它不是临时班子说明书、角色组建表、资料汇编或第二份
planning；它的 active surface 主要由：

```text
bootstrap/AGENTS.md
bootstrap/.agents/skills/<workflow-or-development-skill>/SKILL.md
```

组成。Agent 进入这个工作单元后，依靠 `AGENTS.md` 和按任务选择的 skills，实际开发、整理、验证和改进当前
项目的下一代工作结构。这里的“下一代”首先指更合理的 project entry、workflow、skills、文档结构和验证闭环，
不意味着现在已经授权 WorkCell、DeepSeek Harness 或 runtime 实现。

## 2. 为什么需要它

当前项目已经积累了理论、工作方法、skills、脚本、研究和失败记录，但入口、工作流和信息结构曾多次混在一起。
直接在旧结构上继续堆叠，会把历史解释、设计分析、运行规则和候选机制再次混成一个入口。

需要一个受控的孵化面，把旧项目中已有的有效认识转译成下一代 Agent 开发项目可以直接加载和执行的最小入口与
skills；同时保留来源、未知、失败和未接受内容，避免把一次孵化结果伪装成正式设计或普遍有效的 harness。

## 3. 三个对象的关系

```text
旧项目（当前 repository）
  ├─ source authority：根 AGENTS.md、theory、current plan、现有 canonical skills、records、evals
  └─ 孵化输入：有效方法、实践证据、失败路径、工具和待解决差距
        ↓ 有来源的选择、转译、试行与复核
bootstrap/（下一代项目开发种子）
  ├─ AGENTS.md：下一代开发入口和默认工作方法
  └─ .agents/skills/：下一代开发所需的可选择 workflow/development skills
        ↓ 由 Agent 真实开发和验证
下一代项目结构/载体
  ├─ design / theory / planning / research / evals / experiments
  └─ 稳定后再按 acceptance 与 disposition 进入当前项目的正式位置
```

旧项目是来源和当前 authority；`bootstrap/` 是受范围、写面和授权约束的孵化载体；下一代产物是否成为正式
项目内容，必须另有 source、review、consumer 和 acceptance 关系。bootstrap 不因位于根目录就取得根 authority，
也不因生成了文件就取得 acceptance。

## 4. active surface 与非 active 内容

### 4.1 active surface

- `bootstrap/AGENTS.md`：只写 Agent 每次进入孵化项目都需要知道的对象、来源、默认动作、工作边界、选择 skills、
  写面、回传、复核、回落和停止条件；
- `bootstrap/.agents/skills/`：只放下一代开发实际需要的 skills 或具有独立边界的 project adapter；
- 必要的确定性工具可以被 skill 明确引用，但不把工具目录扩展成第二套运行系统。

### 4.2 非 active 内容

问题简报、素材盘点、责任分析、skill crosswalk、设计 pass 记录和历史冷启动回执不是 bootstrap 的运行入口。
它们应放在当前项目的 `design/`、`planning/records/` 或 `archive/`，依据其用途和证据 standing 保留。它们可以被
bootstrap 的 Agent 按需读取，但不能因为位于 `bootstrap/` 下就获得运行 authority。

本轮已产生的旧版 `README.md`、`design-brief.md`、`material-inventory.md`、`composition-map.md`、
`skill-formation-map.md` 和 `design-iteration-log.md` 属于旧筹备形态的设计/审计材料，当前已由 producer 保留在
`bootstrap/archive/legacy/committee-materials-2026-08-26/`，不属于 active bootstrap surface；迁移处置和 lineage
由同目录 `DISPOSITION.md` 说明。

## 5. skills 组成原则

bootstrap 的 skills 不是“组装 bootstrap 的 skill”，而是下一代项目开发中实际会用到的方法。初始候选来自旧项目
已经孵化的 workflow skills，按触发条件选择，不全量灌入每次上下文：

- 输入与规划：`planning-inbox`、`concept-articulation`、`work-estimation`；
- 形式与协作：`form-selection`、`agent-delegation`、`agent-expression`；
- 表达与审查：`human-writing`、`dual-audience-expression`、`mechanism-design-review`；
- 实践与能力演化：`practice-cycle`、`skill-formation`。

根 `.agents/skills/` 是当前项目这些方法的 canonical source。bootstrap 可以直接依赖它们，也可以在确有下一代
项目独立边界、独立 consumer、允许效果、失败边界和相称实践证据时，形成自己的 project adapter；相同方法不复制
成两个无边界的 canonical 正文。`bootstrap-committee-assembly` 不属于这个集合。

## 6. 下一代开发的最小工作回路

这不是固定阶段机，而是按任务复杂度缩放的判断回路：

1. 从旧项目 authority 和当前任务恢复问题、真实场景、目标状态和 unknown；
2. 判断任务是否简单可逆，或是否需要 plan/todo、工具准备、委派和独立复核；
3. 按触发条件加载最小 skill pack，必要时创造有边界的 project adapter 或工具；
4. 在明确的 current plan、write surface 和允许效果内执行一个最小可观察动作；
5. 记录结果、失败、decision delta、未承重内容和回落点；
6. 由 Main 综合并将稳定语义写回正确的 current design、theory、plan、skill、record 或 eval owner；
7. 经过相称 review 后，决定继续孵化、修订、晋升、降级、`no-proposal` 或保留归档。

多步骤/多任务必须由 current plan、todo 或 work map 驱动；只有存在真实独立贡献时才委派或并行。bootstrap 不
建立第二份 goal、plan、ledger、registry、scheduler 或 runtime。

## 7. 继承、写面与权限

- 根 `AGENTS.md`、当前 goal、`planning/plan.md`、`planning/item-ledger.md` 和各 canonical source 继续是旧项目
  的 authority；bootstrap 只能在明确的任务和写面内引用、转译和提出候选；
- `bootstrap/AGENTS.md` 是 bootstrap 作用域的 operational entry，不能覆盖根入口；
- skill 是判断/行动方法，不是角色、owner、consumer 或 acceptance authority；
- bootstrap 的 Agent 可以准备下一代 project artifacts，但不能从“孵化输出”自动推出正式接受、portable adoption、
  owner 决策或实现授权；
- producer、reviewer、Main 的 subject 和 write surface 需要分离；mechanical validator 只提供机械观察；
- 不可逆外部 effect、权限升级、共享基线变更和 WorkCell/DeepSeek Harness/runtime 实现保持在当前冻结边界之外。

## 8. 设计出口与证据上限

本设计只有在以下问题获得足够回答后，才可把新 bootstrap 载体作为真实开发种子试行：

- `AGENTS.md` 是否足够小而能指导行动，又没有把历史/分析塞入入口；
- active skills 是否确实来自下一代开发工作流，而不是元协调或形式装饰；
- 旧项目 authority、bootstrap 载体和下一代产物之间的继承与写面是否不混淆；
- 辅助材料迁出后，Agent 是否仍能在需要时恢复来源和 lineage；
- 一个真实 bounded planning/design 任务中，skill 是否被实际激活，是否改变判断或交接，以及成本是否值得。

当前这份设计是 `draft`，`acceptance_owner` 未知。现有静态 validator、可读性观察和设计 review 只能支持结构候选
和载体可发现，不能支持 skill activation、责任覆盖、matched improvement、正式 workflow 接受或 WorkCell 开放。
