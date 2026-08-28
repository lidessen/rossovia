# Planning records

这里保存 planning 的 bounded process records：review、disposition、reconciliation、applicability
check、candidate review 和一次性 evidence return。

本目录是审计附录，不是日常 review 入口。看设计直接看 `design/`，看当前怎么推进直接看
`planning/plan.md`；不要要求读者先理解本目录的流程才能理解设计或计划。

它们不构成第二份 planning authority，也不构成一套必须逐项经过的 candidate 流程。当前跨 item standing 回到 [`../item-ledger.md`](../item-ledger.md)，长期方向回到
[`../roadmap.md`](../roadmap.md)，实现前顺序和冻结边界回到 [`../plan.md`](../plan.md)。具体语义、来源、证据和
接受关系仍由对应的 theory、design、research、eval 或 skill source 拥有。

`plan.md` 只保存 current plan；旧 plan 正文只能作为 lineage 保存在明确的历史快照或本目录的拆分回执中。
records 不产生当前 plan、standing、执行顺序或接受关系；普通 Agent 不通过读取 plan 历史来恢复工作。

## 读取方式

普通任务先读 [`../README.md`](../README.md) 和 item ledger 的当前部分；只有选定 item、需要恢复
source/applicability、review、unknown 或 lineage 时，才沿根入口或 item ledger 中的 record 链接读取。
本页只拥有 records 的角色与维护边界，不维护一张与 item ledger 竞争的 record 总表。

目录分组只改善发现路径，不表达 standing、优先级、owner、完成或接受。记录可以是当前可回返的
candidate，也可以只是历史 lineage；以正文和 canonical source 为准。

## 状态与字段形态

新建或重新打开的 record 使用 frontmatter 提供检索投影：`status` 只表示记录自身的粗粒度生命周期，
`disposition`、`evidence`、`owner`、`consumer`、`settlement_route` 和 `review_at` 各自表达独立关系。
它们不是一个组合 enum；开放的描述性信息使用 `labels`，已发生的 review、reconciliation、preparation
和 correction 写入带来源的事件/lineage。

正文中的当前摘要也按这些关系分行表达。旧记录若仍有 `状态：A / B / C` 形式，视为 legacy standing
摘要，不是可解析的 current status、公共 enum 或状态机；在该 record 下一次被真正 reopen、回写或采用时，
才把它转换为独立字段，并保留原摘要作为历史 lineage。不得为了统一外观批量删除旧摘要，也不得从旧摘要
反推出 acceptance、权限、执行或阶段转换。

`research` 的结算与下游 harness 采用是两条不同关系：关闭 research record 不会自动关闭 application obligation。
面向实际系统的结果还要分别回读 semantic handoff、carrier handoff、activation observation 和 adoption/reopen
evidence；有价值但未完成交接的结果保留目标 item 的 `integration pending`，不能仅因研究文件已处理就归档。
只有无价值、无 proposal、被明确 successor 取代，或应用义务已有独立关闭回执的记录，才可安全离开当前应用面。

本轮只引入一层 `records/`，暂不按 WorkCell、philosophy、evidence 或 methods 再拆子目录。只有
稳定的独立 consumer、owner 和 lifecycle 关系出现，才重新评估更细的物理分组。

## 维护边界

- 新记录必须对应已有 item、source applicability、不可由正文/版本历史重建的审计关系，或明确的
  decision-changing unknown；不能因目录存在、字段存在或流程看起来更完整而补建。
- 已有记录优先原地更新 current projection；dated observation 留在记录或 ledger history，不复制到多个入口。
- 移动记录只改变路径，不改变其 source、standing、owner、evidence、acceptance 或实现冻结。
- 没有新的 decision delta 时，使用现有记录的 `done-for-now`、`hold`、`wait` 或 `no-proposal`，不要再开 sibling record。
