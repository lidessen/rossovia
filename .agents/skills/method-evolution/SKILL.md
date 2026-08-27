---
name: method-evolution
description: 执行集中迭代协议（design/agent-stack.md 4.2）：在 checkpoint 回顾总结、肯定好的改进差的，滚动更新 AGENTS.md/skills/theory；冻结 baseline、变更验证、结算出处置、出新版本并可回退（009A）。保留 baseline/rollback/lineage 与独立 review；不允许长期未结算（005A）。
---

# Method Evolution（方法迭代）

在 checkpoint 集中回顾总结，把应用期积累的反馈（design/agent-stack.md 4.1）变成对方法体系的改进；保留 baseline/rollback/lineage（009A：工作到达一定程度时回顾总结，好的肯定、差的改进）。本 skill 的方法主体即集中迭代协议，见 `design/agent-stack.md` 4.2。

## 何时使用

- checkpoint 触发（语义边界决定，不是固定轮数）：组合有实质变更、一轮应用期结束、或需要集中结算反馈时。

## 核心方法（即 4.2 集中迭代协议）

1. **冻结 baseline**：`tools/version.py freeze --note "..."`（版本号 + 文件指纹，AGENTS.md + skills + theory 整套）。
2. **收拢与路由**：按 4.1 分类，把反馈送回最小 owner（问题→修 skill/工具；新想法→skill-formation 或理论演进；理论意见→理论演进；纠正→Principal correction 闭环）。
3. **变更与验证**：逐项变更后按证据等级验证（format-valid → behavior-observed → boundary-supported → matched-improvement → regression-supported）；先跑系统自检（design/agent-stack.md 4.4.1）确认组合完整；应用观察是非受控的，只能产生假设，关键改动升级到受控验证（效果验证，design/agent-stack.md 4.4.2）；无 matched baseline 不声称改善。
4. **结算**：acceptance card（接受者/硬约束/重大退化定义/最小证据/成本预算/观察窗口）；处置集合 `adopt / adapt-and-retest / retain-baseline / no-proposal / rollback / uncertain`；不允许长期未结算；结果出现后不为通过改写 card。
5. **出新版本**：结算即 `tools/version.py freeze` 出新版本；任何一轮可回退/切换到上一版本（回退用 git，版本快照保证知道回退到哪）。

## 边界

- 不因"更严格/记录更多/用了更多 Agent"就声称改善（process 观察 ≠ outcome 改善）。
- 理论修订走理论演进规则（stable/unstable + 版本，见 4.3），本 skill 只执行迭代流程，不替理论 owner 改理论。
- 不造新的协调机制/任务板；复用既有载体。

## 返回

本轮处置清单（每项：对象、处置、证据）、新版本号、遗留 unknown/未决项。
