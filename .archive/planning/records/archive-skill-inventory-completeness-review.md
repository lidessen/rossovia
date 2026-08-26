# Archive skill inventory completeness review

状态：`inventory-set-match-observed / independent-review-complete / acceptance-pending`；不是 skill
semantic acceptance、portable promotion、move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 对象与来源

本记录只检查 `archive/skills/` 的实际载体是否全部进入当前逐项迁移清单，不判断任何历史 skill
是否仍有真实行为差距，也不替代逐项 source/consumer/boundary review。

- 实际目录来源：`archive/skills/*/SKILL.md`
- 清单来源：[`archive-skill-inventory.md`](archive-skill-inventory.md) 的逐项表
- 方法边界：[`skill-formation` candidate](../../.agents/skills/skill-formation/SKILL.md)、
  [`skill-migration.md`](../index/skill-migration.md)
- 关联 living carrier：`.agents/skills/`；它不是本次 archive set 的隐含补集

## 检查与观察

本轮以只读 set comparison 对账：

1. `find archive/skills -mindepth 2 -maxdepth 2 -name SKILL.md` 得到 29 个实际 archive skill 载体；
2. 从 inventory 的逐项表提取 skill 标识，得到 29 个唯一条目；
3. 两个集合的缺失集与多余集均为空；实际名称与清单名称逐项相同。

因此当前没有发现 archive skill 漏记、重复登记或因清单缺口产生的迁移分支。`.agents/skills/`
当前的 11 个 carrier 不因此获得 archive migration standing；archive 与 living carrier 的重叠、
吸收关系和候选处置仍由原有逐项 review 拥有。

## Standing、处置与边界

- current standing：`inventory-set-match-observed`
- consumer / owner：迁移 planning owner、逐项 semantic owner、portable acceptance owner 均
  `unknown`
- 依赖：archive source identity、inventory row identity、逐项 source/consumer/boundary review、
  `skill-formation` 的形式判断
- 允许效果：补充 inventory completeness provenance，更新 plan/roadmap/item-ledger 的当前投影；
  保留现有逐项 disposition
- 禁止效果：不创建新 `.agents/skills/` carrier，不创建 `skills/`，不移动或删除 archive，不把
  29/29 set match 写成 skill 有效、portable 或 accepted
- 证据上限：只支持目录—清单的机械完整性观察；不支持 behavior、matched improvement、regression、
  adoption 或 acceptance
- 当前处置：`retain-inventory / no-new-migration-proposal`

## 出口与 revisit

本项在独立 review 确认集合对账、对象边界和不越权处置后关闭本次 completeness check；它不关闭
整个 migration item。以下任一变化时重新对账：archive 新增/删除/改名、inventory 表结构变化、
living carrier 迁移、出现新的 external consumer，或逐项 source/standing 关系发生变化。只有逐项
候选取得真实 consumer、边界、相称行为证据、独立 review 和 acceptance，才可另开 portable review；
目录集合相等本身不会触发 move。

## 独立 review

`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）只读复核并 `ACCEPT`：确认命令范围只覆盖
`archive/skills/*/SKILL.md`、29/29 的集合结论可回读、字段和 projections 一致，并确认本记录没有把
机械 inventory 对账升级为 semantic、portable、move 或实现 acceptance。该 review 不取得 skill、
portable、move 或实现权。

## 2026-08-25 source-scope addendum

本 record 的命令范围仍严格是 `archive/skills/*/SKILL.md`。宽扫描 `find archive -name SKILL.md` 得到
76 个文件，其中 29 个来自 canonical `archive/skills`，其余 47 个来自 evaluation fixtures/results、
legacy skills 和 package fixtures；它们不是本 record 的 inventory source。该事实已另记于
[`archive-skill-source-scope-reconciliation.md`](archive-skill-source-scope-reconciliation.md)，不改变本
record 的 29/29 set-match standing，也不把宽扫描结果升级为迁移候选集合。
