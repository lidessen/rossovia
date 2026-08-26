---
kind: temporary-preparation-project
id: project-formation-bootstrap-2026-08-26
status: active
disposition: gap-retained
owner: Main
consumer: unknown
intended_consumer: formal-project-design-review
acceptance_owner: unknown
settlement_owner: unknown
retention: archive-after-settlement
---

# 临时筹备项目：正式工作组织组建

这里是本项目当前的临时筹备项目，不是资料堆，也不是第二份 `plan`、`item-ledger`、队列、registry 或永久
workflow。它的任务是从现有素材和能力中，组建一套能够实际执行和交接的完整临时班子，并为正式组织设计提供
足够的前置依据。frontmatter 中 `owner` 只表示本筹备材料的维护 owner，`consumer` 只表示下游接收关系；两者
都不表示正式 design 的 acceptance，当前 `acceptance_owner` 和 `settlement_owner` 保持未知。

## 实际班子与运行载体

临时班子不是一组文件，也不是一组 skills。它是以下关系的有界配置：

```text
目标组织的候选责任槽位
  → 本轮临时 assignment（由哪个执行主体在什么范围/期限内承担）
  → 选择性加载的 carrier（AGENTS.md、skill、adapter、工具）
  → 允许效果、写面、独立复核、交接和回落
```

真正可被 Agent 加载和执行的运行载体是：

- [`AGENTS.md`](AGENTS.md)：本临时项目的入口、使命、边界、组建方式、返回和交接规则；
- 根目录 [`../.agents/skills/`](../.agents/skills/README.md)：本项目工作流中按触发条件选择的 canonical skills；
- 必要时增加本目录下有明确 owner、用途、失败边界和回退方式的项目 adapter 或工具/脚本；当前本地 skill 目录
  没有 active skill。

以下是后台材料，不是默认运行载体或第二 authority：

- 本 README：筹备背景、使用说明和审计回执；
- `design-brief.md`、`material-inventory.md`、`composition-map.md`、`skill-formation-map.md`：分别提供问题简报、
  来源索引、责任分析 projection 和 workflow skill 组合分析；
- `design-iteration-log.md`：记录本次设计 pass 的观察、decision delta、unknown 和 disposition。

实际路径为 `.agents/skills/`，其能力面直接采用本项目工作流中的 canonical skills，例如 capture、问题/概念、
复杂度评估、形式选择、委派、Agent 表达、机制复核、实践回返和 skill 形成；它不是另造一个“组装班子”的
skill。临时载体可以引用现有 canonical skill，也可以在确有独立项目边界时形成 incubation adapter；不得把同一
方法无说明地复制成两个 canonical 正文。carrier 不是 actor、角色、owner、authority 或 evidence；skill 被加载
也不等于 skill 已激活、角色已承接或行为已改善。

## 可加载性观察（2026-08-26）

此前一次冷启动曾读取筹备专用的 `bootstrap-committee-assembly`，但本轮设计复核确认它不是工作流 skill，已从
实际加载面撤出并记为 `no-proposal`。因此那次观察最多只支持筹备入口和若干载体“可读”，不能证明临时班子的
workflow skill 组合已经激活、责任已经承接、行为已经改变、协调成本下降、matched improvement、长期回归或
正式接受。

当前可验证的能力假设是：临时班子按真实任务触发，选择根 `.agents/skills/` 中最小的 workflow skill 组合；
下一项最小实践应以真实多步骤 planning/design 任务为对象，与 Main 直接处理的 baseline 对照，记录哪些 skill
被加载、哪些实际激活、产生了什么可观察行为和 decision delta。没有独立贡献时返回 `no-proposal` 并回到直接处理。

## 组建目标

“完整”不是把所有文档、skill、脚本和 Agent 都塞进来，而是让目标工作场景所需的责任覆盖完整，并且有：

- 清楚的角色槽位、责任、输入、输出和权限边界；
- 现有素材或能力对每个槽位的候选承接关系；
- 独立复核、记录回写、失败回落和交接关系；
- 已知缺口、未知和验证方法；
- 临时配置相对于正式组织的范围、期限、授权和退出条件。

临时只修饰生命周期、范围和授权，不降低正式组织应有的角色、权责、接口、制约、skill 指导和验收要求。
当前更准确的说法是：临时班子是对目标责任边界的一次有范围、期限和授权限制的配置；在目标正式组织对象和
acceptance 关系尚未确定前，不宣称它已经实例化或继承了正式 authority。

## 当前工作面

- [`design-brief.md`](design-brief.md)：问题、真实场景、目标组织和设计出口；尚不是正式 design。
- [`material-inventory.md`](material-inventory.md)：现有素材、能力和来源地位的盘点；不把盘点等同于任命。
- [`composition-map.md`](composition-map.md)：正式角色槽位、候选承接者、缺口和临时编组；不产生永久角色。
- [`skill-formation-map.md`](skill-formation-map.md)：角色需要的判断/行动能力与现有 skill 的映射；不自动创建 skill。

四份材料共同构成筹备项目的后台工作面，实际执行以本目录的 `AGENTS.md` 和 `.agents/skills/` 为准。具体设计
正文仍由 `design/` 拥有；临时 skill 只有在形成判断确认真实边界、consumer 和相称验证后，才可能晋升为正式
项目 skill 或 portable skill。

## 权威和允许效果

`AGENTS.md`、`planning/item-ledger.md`、`planning/plan.md` 以及各自 canonical source 仍是当前 authority。这里
至少区分四种关系：source authority 决定语义，operational authority 决定允许的执行/写面，acceptance authority
决定接受/结算，evidence 只支持某个具体主张。本筹备项目可以：

1. 盘点和引用现有素材，不复制全部历史；
2. 形成角色/权责/skill 的候选关系；
3. 安排来源有界、可返回的独立贡献，并由 Main 做综合；
4. 执行一个有界的设计前置实践，记录 decision delta、unknown 和回落；
5. 在交接前形成正式 design 草案和 skill 形成建议。

它不能接受正式 design、改变 goal 或 owner、替代 current plan/ledger、授权 WorkCell/DeepSeek Harness/runtime
实现，或把临时编组固化成永久机制。

根目录 [`../AGENTS.md`](../AGENTS.md) 是项目级 source/operational authority；本文件 [`./AGENTS.md`](AGENTS.md)
只是 `bootstrap/` 作用域的 operational entry，不能覆盖根入口。`formal-project-design-review` 是下游 consumer，
不是 acceptance owner。当前正式 design、skill 晋升和本筹备项目
结算的 acceptance owner 均为 `unknown`；没有明确 owner 时，结果只能停在 design-preparation、`hold` 或
`no-proposal`。

## 组建顺序

1. 先从真实问题和场景恢复目标，不从现有文件名倒推组织。
2. 推导正式组织必须覆盖的责任和相互制约，形成候选角色槽位。
3. 从现有理论、文档、skills、脚本、评审结果和 Agent 能力中寻找候选承接者。
4. 区分“有素材”“有可执行能力”“有证据支持”三种不同关系，标出缺口和未知。
5. 形成临时班子配置：谁承担什么、允许做什么、结果交给谁、谁独立复核、失败如何回落。
6. 用一个真实的多步骤 planning/design 任务试行，观察责任覆盖、交接、协调成本和决策变化。
7. 依据实践结果修剪、补缺或回退，再把稳定部分交给正式 design 和对应 skill owner。

这里的顺序是筹备工作的依赖关系，不是对所有任务强制执行的公共阶段机；实际执行仍由当前 plan、standing、
授权和任务复杂度决定。

## 结算、交接和归档

筹备项目只有在以下出口之一成立时结算；目前没有已授权的 settlement owner，Main 只能准备结算材料：

- 形成足够完整的正式组织设计输入，临时班子及其缺口已交给正式 design review；
- 经过实践证明当前设想不能承重，形成 `no-proposal` 或回退结论，并保留反例和未知；
- 目标被明确替代，形成可回指 successor 和应用义务的结算记录。

结算时保留本目录的完整内容、来源、组建图、实践观察和失败路径，转为只读归档，预定归档位置为
`archive/legacy/bootstrap/project-formation-bootstrap-2026-08-26/`。归档后它仍可用于复盘、来源解释和
恢复，但不再是普通入口，也不能反向覆盖当前 design、plan、ledger 或 skill。

如果组建过程中出现目标冲突、authority 不明、责任无法覆盖、协调成本超过收益或必须猜测 owner 决策，应停止
继续堆素材，保留当前结果和 unknown，回到最近可靠 source；不以增加文件、角色或状态来掩盖缺口。
