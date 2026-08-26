# Plan

本文件是本项目唯一的当前 plan carrier，只拥有当前工作顺序、依赖、允许效果、非目标、交接、回落和
下一次重规划条件。它不复制 item standing、理论正文、设计正文或历史档案。

## Authority 与最小读取路径

- 项目边界与默认动作：[`../AGENTS.md`](../AGENTS.md)
- 当前过渡入口：[`transition-package.md`](transition-package.md)
- 跨 item 当前 standing：[`item-ledger.md`](item-ledger.md)
- 长期方向：[`roadmap.md`](roadmap.md)
- 阶段出口：[`phase-1-exit-review.md`](phase-1-exit-review.md)
- 具体设计、理论、research、eval 和 skill：回到各自 canonical source
- 历史 plan 快照与本次拆分回执：[`records/plan-current-only-reconstruction-2026-08-26.md`](records/plan-current-only-reconstruction-2026-08-26.md)

普通 Agent 不读取 plan 的历史区，因为本文件不再保存历史区。只有当前 source 无法解释一个冲突、或明确
需要 provenance 时，才从对应 record/历史快照按需回读。

## 当前目标与边界

当前 goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。目标是让本项目的 planning、理论、设计、skills 和
harness 工作形成可实践、可回退、可持续改进的工作面；目标的完整描述和跨 item standing 不在本文件重复。

当前优先级：先重新设计根目录 `bootstrap/` 这个“用旧项目孵化下一代项目”的工作单元，使其主体成为指导 Agent
开发本项目的 `AGENTS.md` 与 workflow/development skills，再用真实 bounded work 验证。现有 bootstrap 下的
maps/brief/inventory/log 不是目标形态，不能继续作为班子运行主体。WorkCell 设计、DeepSeek Harness 系统和所有
实现继续暂停，不能由本计划越过授权边界。

## 最近完成波次：plan current-only 重建

### 目的

把 `plan.md` 从当前计划与历史/未来投影的混合物恢复成可直接读取的 current plan，同时保留历史可回读性。
这是一项真实 planning 结构修正，不是完整 planning 清理，也不是新 workflow 的接受。

### 已完成动作

1. 保存原始 `plan.md` 快照和可回读回执；不依赖 Git 回退作为唯一恢复方式。
2. 将当前 plan 收缩为本文件，只保留当前 authority、边界、出口和下一步。
3. 更新 README、records 路由和 validator：current plan 与历史物理分离，不依赖 HTML 折叠。
4. 让两个无本轮对话记忆的冷启动 Agent 分别验证过渡入口和正常入口；两次均无需读取旧 plan 快照即可
   恢复目标、边界、下一步、回写位置和回落条件。

### 允许效果

- 修改 `planning/plan.md` 当前 carrier、必要入口、validator 和本波次回执；
- 保留历史快照、source、lineage 和现有 authority；
- 记录冷启动观察、decision delta、unknown、回落和下一步。

### 明确不做

- 不建立第二份 current plan、历史 plan、全局 todo、queue、registry 或 scheduler；
- 不批量迁移、删除或复制其它 planning、theory、design、research、eval 或 skill；
- 不把历史记录重新写成当前 standing；
- 不接受 workflow、WorkCell、DeepSeek Harness 或任何 runtime/implementation；
- 不以文件数量、行数、validator 通过或 Agent 数量作为成功标准。

### 交接与回落

本波次已达到交接条件：current plan 无 dated history、入口职责不冲突、历史有唯一回读路线、冷启动 Agent 能独立
恢复下一项真实工作，且 Main 能说明结果回写位置和失败回落点。交接只表示可以进入正常 bounded wave，
不表示 workflow 或阶段已经正式接受。

若发现当前 plan 仍需全文历史才能解释下一步、authority 出现冲突、冷启动无法接手或改动影响超出允许范围，
停止扩张，保留观察和 unknown，按 [`records/plan-current-only-reconstruction-2026-08-26.md`](records/plan-current-only-reconstruction-2026-08-26.md)
回到原始快照，不继续堆加字段、record 或目录。

## 下一波：重设计 bootstrap 作为下一代项目种子

当前没有已打开的正常 execution wave；但最新用户纠正授权一项有界的设计筹备动作。入口是
[`bootstrap/AGENTS.md`](../bootstrap/AGENTS.md)，不是另建一份 plan。目标不是描述一个“临时班子”，而是形成
下一代项目可直接使用的开发入口和 skills：旧项目的 theory、current authority、经验、工具和失败记录是来源，
`bootstrap/AGENTS.md` 与 active workflow/development skills 是执行载体，辅助设计/迁移记录另行保留。

bootstrap 重设计的当前交付关系是：

1. 先确定下一代项目种子的对象、继承边界、最小目录和允许效果；
2. 只把指导 Agent 开发本项目所需的 workflow/development skills 组成 active 面，按触发条件选择；
3. 重新写一份最小、可执行的 `bootstrap/AGENTS.md`，不把分析材料、角色表或历史解释塞进运行入口；
4. 将现有错误形态中的 useful source 与历史保留到合适的 planning record/archive，不让它们继续冒充 bootstrap 主体；
5. 设计复核通过后，才用一个真实 bounded planning/design 任务试行，并依据实践修订、保留或回退。

当前只支持设计和载体重组准备，不支持 bootstrap 已可运行、skill 已激活、责任已覆盖或正式 workflow 已接受。
在新 bootstrap 设计完成前，不继续扩展现有 maps/brief/committee 形式，也不打开 WorkCell 或实现工作。

### 当前有界任务：生成 bootstrap seed 候选

任务需求由 [`records/bootstrap-seed-task-requirements-2026-08-26.md`](records/bootstrap-seed-task-requirements-2026-08-26.md)
拥有；producer sub-agent 已在 `bootstrap/**` 写面内生成下一代开发种子的候选 `AGENTS.md + skills`，并将旧委员会
材料保留为 `bootstrap/archive/legacy/` 快照。Main 已检查来源、边界、旧材料处置、skill 选择和回退，并完成两次
独立 review；当前结论是 `candidate / review-pending`，不是当前正式入口或接受结果。下一步是用户 review，之后
才决定是否进行一个真实 bounded planning/design 试行；不打开 WorkCell 或实现工作。

`design/harness-workflow.md` 当前是设计前综合稿，只能提供输入，不能自动成为正式 design 或 workflow 入口。

筹备和实践结果再决定：

- 本项目 workflow 保留、修订、拆分或降级哪些部分；
- 哪些内容应留在 design、theory、records、evals 或 `.agents/skills/`；
- 哪些迁移或 skill 形成有真实 consumer 和相称证据；
- 是否具备重新 review WorkCell design 的条件。

WorkCell 只有在 workflow 实践、结构收敛和整体 checkpoint 形成足够 decision delta 后，才重新打开 design
review；即使重新打开，也不授权实现。

## 历史与重新规划

历史不进入普通 plan 读取面。旧 plan 的完整快照位于
[`../archive/legacy/planning/plan-2026-08-26-pre-current-only.md`](../archive/legacy/planning/plan-2026-08-26-pre-current-only.md)，
本次 current-only 拆分的观察、来源和回退关系位于
[`records/plan-current-only-reconstruction-2026-08-26.md`](records/plan-current-only-reconstruction-2026-08-26.md)。

出现用户主线纠正、当前入口不可信、重大 authority 冲突、长期中断或下一波结果改变顺序时，重新建立一个
有界 current wave；不要把历史追加回本文件，也不要让一次过渡自动变成永久流程。
