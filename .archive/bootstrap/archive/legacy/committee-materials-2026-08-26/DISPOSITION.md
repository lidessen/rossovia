---
kind: bootstrap-legacy-disposition
id: bootstrap-previous-materials-disposition-2026-08-26
status: retained-read-only
source: previous-bootstrap-tree
authority: none
---

# 旧 bootstrap 材料处置

这些材料是 producer 开始前 `bootstrap/` 中已有的筹备/委员会方向产物。它们不是本次 brief，也不是当前入口、
authority、运行规则或下一代项目的 active surface。为避免静默丢弃，原目录结构和文件内容保留在
`bootstrap-previous/` 下，作为只读历史快照；它们的内部链接和旧结论不再维护。

本次重组的理由是对象发生了纠正：`bootstrap/` 应是“用旧项目孵化下一代项目”的开发种子，而不是临时班子分析资料
夹。因此旧 README、brief、inventory、composition map、skill map 和迭代日志不继续作为入口。它们只能作为设计历史、
反例和回顾素材，不能反向覆盖根 `AGENTS.md`、current plan/ledger 或本次 active skills。

原 `bootstrap/.agents/skills/bootstrap-committee-assembly/SKILL.md` 在 producer 开始时已不存在；其空目录被保留于
历史快照位置，并另有 `DISPOSITION.md` 说明。该名称按 brief 的要求作 `no-proposal`，不恢复到 active surface。

若未来需要恢复其中任何材料，必须由真实 owner 重新检查 source、consumer、边界、证据和写面，明确新的 disposition，
再从历史快照中有选择地提取；不得整目录回滚为入口。
