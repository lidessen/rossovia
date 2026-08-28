---
kind: planning-record
id: workflow-design-prework-reclassification-2026-08-26
status: settled
disposition: reclassified-as-pre-design-and-bootstrap-required
evidence: user-correction-and-independent-review
owner: Main
consumer: project-formal-design-review
---

# `harness-workflow` 正式性复核与筹备项目重建

## 结论

当前 [`design/harness-workflow.md`](../../design/harness-workflow.md) 不能算正式 design。它是项目专用的
`pre-design-synthesis`：保留了旧候选、有限实践观察和待验证的工作关系，但没有先完成 design brief、正式
组织的角色/权责、skill 形成前置、consumer/acceptance owner、失败回落和临时实例边界。

“为什么这次要重写”这类内容属于背景、来源或审计 lineage，不属于正式 design 的规范主体。当前文件已明确
降级为设计前综合稿；后续正式 design 应保持规范主体干净，并将历史/原因/证据通过明确链接放在背景或 records。

## 用户纠正带来的 decision delta

临时委员会不是无设计的过渡拼装，而是正式组织形态的受限、可退出实例。临时只约束范围、生命周期和授权，
不取消正式组织必须具备的角色、责任、接口、制约、skill 指导、验证、交接和回落。

临时筹备也不是一组描述班子的 planning 文档。实际班子必须由可加载、可执行和可交接的 `AGENTS.md`、选定
skills、必要工具/脚本及其边界组成；brief、inventory、composition map 和 skill map 只是组建依据和审计材料。
筹备项目结算后保留完整目录为只读归档，归档可用于复盘和恢复，但不再拥有当前 authority。

## 已采取的最小处置

- 建立根目录 [`bootstrap/`](../../bootstrap/AGENTS.md) 临时筹备项目；
- 为筹备项目增加实际入口 [`bootstrap/AGENTS.md`](../../bootstrap/AGENTS.md)；
- 曾试探性增加一个有明确项目边界的临时 skill `bootstrap-committee-assembly`；本轮用户纠正和复核确认它是把
  筹备元协调误当成工作流能力，已从 active 目录移出并按 `no-proposal` 保留处置记录；
- 增加 design brief、素材盘点、角色组建图和 skill 形成图；
- 更新 root `AGENTS.md`、planning 入口、transition package 和 current plan，使它们把筹备项目当作临时工作面，
  而不是把现有 workflow 综合稿当作正式入口；
- 完成一次从临时 `AGENTS.md` 进入的冷启动可加载性观察；
- 保持 WorkCell、DeepSeek Harness、runtime 和任何 implementation 冻结。

这些动作只建立筹备入口和前置材料，不接受正式 design，不产生永久角色、第二 plan/ledger、全局 registry 或
runtime 机制。

## 证据上限与下一步

现有两次入口冷启动观察、本次临时班子可加载性观察和本次独立 review 只支持 transition/plan-entry 的 bounded
observation，以及“需要正式前置筹备”和“临时载体可被加载”的判断；不支持正常 workflow 的正式接受、skill
改变行为、责任在真实任务中覆盖、跨任务改善、skill adoption、长期回归或 WorkCell 重新开放。

下一项由 [`bootstrap/AGENTS.md`](../../bootstrap/AGENTS.md) 驱动：从真实问题和场景出发，完成责任槽位、
现有素材/能力承接、缺口、临时配置和独立复核，再选择一个真实 bounded planning/design 实践。实践结果要么
进入正式 design review，要么形成修订、hold、no-proposal 或归档结论；不能用增加文件或状态替代证据。
