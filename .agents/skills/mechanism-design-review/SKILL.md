---
name: mechanism-design-review
description: 在准备增加状态、记录、队列、锁、重试、门、hook、registry、协议或生命周期机制时，判断真实对象、现有 owner 与最小充分处置：Review unit 绑定可观察 failure/counterexample 与 owner，三问题（Identity/Origin/Destination），处置顺序（保持设计→澄清 prompt/skill/文字→复用/收窄已有 owner→确定性检查→才提 mechanism-candidate），计算完整负担。"更可靠/更显式/以后可能需要"不是成立理由；假设性风险不单独成 case evidence（theory/harness.md：机制派生与准入；010A/011A 设计克制）。
---

# Mechanism Design Review（机制设计审查）

加机制前先判断真实对象、现有 owner 与最小充分处置，防止把行为模式机制化、为"更独立"反而加出更多门和状态（theory/harness.md：行为模式不机制化、机制派生与准入；用户 010A/011A 设计克制）。

## 何时使用

- 任何"增加机制"的提议：状态、记录、队列、锁、重试、门、hook、registry、协议、生命周期字段。
- 设计 review 时（包括对 AGENTS.md、skills、工具、本仓库自身的变更）。

## 核心方法

1. **Review unit 绑定证据**：先有一个可观察的 failure / counterexample、它的后果与 owner；没有真实压力就没有审查对象。
2. **三问题**：
   - **Identity**：这是什么、谁拥有它？（先不接受名称，名称是声称不是证据）
   - **Origin**：什么真实压力产生它？（从 proposed solution 之外恢复，别让方案自证）
   - **Destination**：什么关系必须变成真？（不是功能愿望）
3. **处置顺序**（逐级尝试，能停就停）：保持设计现状 → 澄清 prompt/skill/文字 → 复用/收窄已有 owner → 确定性检查（工具/脚本）→ 才提 `mechanism-candidate`。
4. **计算完整负担**：概念、schema、记录、状态、迁移、运维、协调成本——机制的全生命周期成本 > 只写下来的成本。
5. **判定用 yes / no / uncertain**，不用数值；单次提示词失败不是机制证据。

## 边界

- "更可靠 / 更显式 / 以后可能需要"不是成立理由；假设性风险不能单独成为 case evidence。
- 设计字段前先选表达形态（label/enum/属性组合/投影）；字段误当机制时回到准入。
- 审查推荐不授权：是否采纳由拥有该压力的 owner 决定。

## 返回

保持设计 / 澄清文字 / 复用 owner / 确定性检查 / mechanism-candidate + 负担清单；或 no-proposal + 缺什么证据。
