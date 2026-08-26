---
kind: planning-record
id: plan-current-only-reconstruction-2026-08-26
status: settled
disposition: current-only-carrier-rebuilt-and-cold-read
source: planning/plan.md
consumer: normal-project-workflow
---

# `plan.md` current-only 重建回执（2026-08-26）

## 目的

本波次把 `planning/plan.md` 从“当前计划、旧阶段方案、未来设计投影和历史档案的混合物”恢复成唯一的
current plan carrier。它不创建 `plan-current.md` / `plan-history.md` 两个并列权威，也不改变 item ledger、
roadmap、phase exit 或各 canonical source 的职责。

## 原始快照

收缩前的完整文件已保存为历史快照：
[`archive/legacy/planning/plan-2026-08-26-pre-current-only.md`](../../archive/legacy/planning/plan-2026-08-26-pre-current-only.md)

- SHA-256：`6a98c667317bed51a65cda32918c9692594bad4742a47c1fcaca723283ed174d`
- 规模：1066 行，89832 bytes
- standing：历史来源，不是当前 plan、standing、执行队列或实现授权

## 保留与移出原则

`plan.md` 只保留当前过渡/工作波次、顺序、依赖、允许效果、非目标、交接、回落和下一次重规划条件。
旧 workflow-reconstruction 主体、已完成阶段摘要、WorkCell/DeepSeek 未来阶段细节、gate 证据索引和 dated
projection 不再进入普通 plan 读取面；需要追溯时从本回执或原始快照按需进入。

## 验证出口

- `plan.md` 不包含 dated history heading 或 `<details>` 历史区；
- README 明确 `plan.md` 是 current-only carrier，历史通过明确 record/快照链接读取；
- records 不取得当前顺序、standing 或 acceptance；
- 所有 living links 和 planning validator 通过；
- 冷启动 Agent 只读取当前入口即可恢复下一项工作，不依赖全文历史。

如果任一出口失败，保留当前快照并回退本次收缩；不删除历史、不用目录数量证明成功。

## 实践观察

过渡点火后的正常入口冷启动测试已完成。Agent 未读取旧 plan 快照或历史区，能够恢复当前目标、最近完成的
current-only 波次、下一波尚未打开、允许效果、禁止事项、交接位置和回落条件；它只指出 plan 与 item ledger
之间“最近完成波次 / no-open-wave”的投影差异，Main 已将 plan 修正为“最近完成波次”。

该观察支持 `behavior-observed / current-only-carrier-rebuilt`，不证明 workflow adoption、matched improvement
或长期回归。
