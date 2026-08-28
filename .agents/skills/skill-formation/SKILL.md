---
name: skill-formation
description: 判断反复出现的 Agent 判断/行动差距是否应编码为可选择性加载的 skill 载体，并决定保留/改写/拆分/合并/降级/删除：七关系准入（对象可指认/差距有现实来源/关系可重复/触发可分辨/方法可由表达改变/生成关系已内化/结果可观察）、形成候选、Review 六面、证据等级 format-valid→behavior-observed→boundary-supported→matched-improvement→regression-supported。一次性工作/项目规则/持久知识各有真实形式，不强行造 skill（theory/harness.md：skill-formation）。
---

# Skill Formation（Skill 形成）

判断反复出现的判断/行动差距是否沉淀为可选择性加载的 skill 载体，并管其生命周期（theory/harness.md：skill-formation；skills.md 方法要点）。

## 何时使用

- 同一判断差距跨任务重现、已有 skill 失效/超载、或要决定某方法放哪一层时。

## 核心方法

1. **从差距开始**：哪个 Agent 在什么环境对什么对象缺哪类判断/行动；已观察差距、重复性、预期改变。
2. **七关系准入**：① 对象可指认 ② 差距有现实来源（真实任务/纠正/失败轨迹/可复现 baseline）③ 关系可重复（跨任务重现）④ 触发可分辨（正例/反例/最近邻有可表达边界）⑤ 方法可由表达改变（提示外硬属性不属 skill）⑥ 生成关系已内化（激活后无需回读条目即可恢复主要判断）⑦ 结果是较小的真实形式且可观察。
3. **形成候选**：可发现身份（name + description）／ 一个主要判断 ／ 来源地位与血统 ／ 触发边界 ／ 行动方法 ／ 权威与效果 ／ 返回关系 ／ 行为探针。
4. **Review 六面**：成立性、对象与边界、形式与上下文、Agent 表达、行为与回归、体系关系；设计（应否存在）与表达（文字如何优化）分开判断。
5. **证据等级**：`format-valid → behavior-observed → boundary-supported → matched-improvement → regression-supported`；没有 matched baseline 不声称因果改善，没有反例不声称边界成立，没有长期观察不声称稳定。
6. **生命周期**：创建（候选，非权威）→ 改写 / 拆分（独立触发/失败/验证）→ 合并（同一对象/触发/成功关系）→ 降级（知识归文档、常量归指令、变换归工具、硬属性归 runtime）→ 删除（差距消失/被覆盖/无净收益）。

## 边界

- 一次性工作 → 任务表达；项目规则 → 局部指令；持久知识 → 文档/reference；确定性变换 → 工具；强制/权限 → runtime——各有真实形式，不强行造 skill。
- 差距未知时返回研究或 no-proposal；不创建兼容壳；skill 不因"内容像文档"而转移所有权。
- 反复出现的差距先用 `feedback-loop` 单次回返观察足够轮次，再决定形成。

## 返回

处置（形成候选 / 保留 / 改写 / 拆分 / 合并 / 降级 / 删除）+ 依据 + 行为探针。
