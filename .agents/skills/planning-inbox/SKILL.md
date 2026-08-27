---
name: planning-inbox
description: 低摩擦接住任意想法、观察、疑问、待办与半成形计划。capture 模式：对话中保真记录用户的思考、观点、灵感片段（追加 notes/thinking-log.md，机械部分用 tools/register.py）；process 模式：把反馈/想法按类型/来源/对象/standing 分类登记（notes/feedback-log.md）。记录只是保留记忆，不构成计划、任务、承诺、优先级或 acceptance。本 skill 合并了原 0_scribe 的记录职责。
---

# Planning Inbox（规划收件箱）

低摩擦接住任意想法、观察、疑问、待办与半成形计划，忠实保留并秘书式整理；capture 与 process 分离，不把记录偷换成承诺、优先级、owner 或 acceptance。

## 何时使用

- **capture**：用户表达了一段思考、观点、想法、灵感、判断、类比或思辨（即使语焉不详、半成形），或显式要求「记一下」「记录下来」。无法判断是否该记录时，倾向记录（低摩擦）。
- **process**：应用期出现问题、新想法、理论意见或纠正（design/agent-stack.md 4.1），需要分类登记并路由到最小 owner。
- **优化 work-log**：用户要求优化 `notes/work-log.md`（润色表达、理顺结构，不改变语义与结论），细节见 `references/optimize-work-log.md`。
- 不使用：明确的任务执行指令（改代码/查文件/跑命令）；纯寒暄；需要整理、归类、计划或承诺（那是其他 skill/流程的职责）。

## 核心原则（两个模式共享）

- **忠实还原**：保留语义、语气强弱、范围、否定、不确定性和顺序。
- **润色有界**：可修正语法、错别字、不通顺，不得借润色加入、删除或改变原意。
- **不补全**：意图不明时保留原样或标注存疑，不用流畅句子补全。
- **不添加**：正文只含用户的话/内容；必要上下文放独立标注的注记，不混入正文。

## 使用方法

1. **capture 模式**：判断该记录 → 用 `tools/register.py capture "内容"` 追加到 `notes/thinking-log.md`（脚本自动编号 THINK-YYYY-MM-DD-NNN、防覆盖）。细节见 `references/record-thinking.md`。
2. **process 模式**：判断反馈类型（问题/新想法/理论意见/纠正）→ 用 `tools/register.py feedback "内容" -t 类型 -s 来源 -o 对象 [-g standing]` 追加到 `notes/feedback-log.md` → 按路由表送回最小 owner（问题→修 skill/工具；新想法→skill-formation 或理论演进；理论意见→理论演进；纠正→Principal correction 闭环，见 design/agent-stack.md 4.1）。
3. **不越界**：capture 是记忆保留；process 只做分类登记与路由，不替 owner 做处置决定。

## 边界

- 记录只是保留原始想法，不自动成为计划、任务、承诺、优先级、owner、研究结论或 acceptance。
- consume / clear / archive / complete / delete 不互换；写入失败或位置不明时把文本返回给用户并说明阻塞，不声称已写入。
- 本 skill 只记录与整理登记；处置（disposition）与 handoff 归对应 owner/流程。

## 返回

- capture：条目 id + 写入位置 + 一句话摘要。
- process：条目 id + 分类 + 路由去向。
- 未完成：返回原因，不声称完成。
