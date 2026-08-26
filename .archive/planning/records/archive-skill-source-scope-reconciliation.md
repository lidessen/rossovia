# Archive `SKILL.md` source-scope reconciliation

状态：`source-scope-observed / inventory-scope-reconciled / independent-review-complete / acceptance-pending`；
不是 skill semantic acceptance、portable promotion、move、archive deletion 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 对象与上一状态

上一条 inventory completeness record 只把 `archive/skills/*/SKILL.md` 定义为迁移 inventory source，并
证明了该集合有 29 个载体、清单有 29 个唯一条目。一次从仓库根 `archive` 做的宽扫描返回 76 个
`SKILL.md`，表面上与“29 个 archive skill”冲突；本记录只解决这个 source-scope ambiguity，不把宽扫描
自动变成新的 migration inventory。

## 当前观察

当前 `find archive -name SKILL.md` 的 76 个文件按一级路径归属为：

| source class | count | 当前地位 | 是否属于 current migration inventory |
| --- | ---: | --- | --- |
| `archive/skills/*/SKILL.md` | 29 | archive canonical skill candidates 的历史 source | 是 |
| `archive/evaluations/**/SKILL.md` | 37 | 历史 evaluation fixture、invalid-preflight fixture 与结果 workspace 的 served material | 否 |
| `archive/legacy/skills/*/SKILL.md` | 9 | 更早的 legacy 文档/skill 历史材料 | 否 |
| `archive/packages/**/SKILL.md` | 1 | WorkCell package fixture 中的测试/改写输入 | 否 |

因此当前应同时保留两个事实：`archive` 下共有 76 个历史 `SKILL.md` 文件；migration inventory 的
canonical source set 仍只有 `archive/skills/*/SKILL.md` 的 29 个。其余 47 个不能因为文件名相同就被
当作新的候选、重复 carrier 或 portable source；它们的 source/standing 由 evaluation、legacy 或
package artifact 的上层关系拥有。

路径地位还由 [`archive/evaluations/README.md`](../../archive/evaluations/README.md)、
[`archive/legacy/README.md`](../../archive/legacy/README.md) 和 package fixture 的
[`AGENTS.md`](../../archive/packages/work-cell/fixtures/p23-skill-rewrite/AGENTS.md) 交叉支持；它们分别
把 evaluation、legacy 和 package fixture 与 current migration source 分开。

## 处置与边界

- **当前 disposition：** `retain-canonical-29 / classify-47-as-historical-or-fixture / no-new-migration-proposal`。
- **来源/owner：** archive path 与既有 inventory 负责集合边界；evaluation evidence、legacy history 和
  package fixture 各自的上层 record 负责其内部意义；migration/portable acceptance owner 仍 unknown。
- **允许效果：** 修正 source-scope、inventory provenance、plan/roadmap/ledger/phase/loop 的当前投影；
  让后续审计使用显式 path class。
- **禁止效果：** 不把 76 变成 76 个 migration item；不复制、移动或删除 47 个文件；不创建 carrier、
  `skills/`、Run、fixture、portable promotion、WorkCell/DeepSeek 设计或实现授权。
- **证据上限：** 本次只支持路径分类与 inventory source-scope observation；不支持任何历史文件的
  behavior、matched improvement、regression、adoption 或 acceptance standing。

## 出口与 revisit

本项在独立 reviewer 确认分类命令、source class 边界和不越权处置后，关闭本次 scope ambiguity；
inventory 的 canonical 29 项仍按逐项 source/consumer/boundary review 继续。以下变化时 reopen：
archive path class 改变、evaluation/legacy/package artifact 被重新声明为 current source、`archive/skills`
新增/删除/改名、inventory authority 改变，或真实 consumer 要求读取其中一个非 canonical class。

## 独立复核

`Dewey`（Agent `01a0394d-c4ad-7e10-a91d-68a232d7ba24`）已只读复核并 `ACCEPT`：确认 76 的总数、
29/37/9/1 的 path-class 计数、`archive/skills` inventory source 边界，以及 evaluation/legacy/package
上层关系；同时确认 29 项仍需沿各自 disposition 读取，不能统称为待迁移。该 verdict 只接受
source-scope/provenance bookkeeping，不取得 skill semantic、portable、move、archive deletion 或实现权。
