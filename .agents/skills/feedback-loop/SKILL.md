---
name: feedback-loop
description: 反馈迭代主题 skill——吸收 planning-inbox（capture/登记）、practice-cycle（单次回返）、method-evolution（集中迭代）。模式：①capture 保真记录（thinking-log，references/record-thinking.md）+ 分类登记与路由（feedback-log）②单次回返（一次实践后 settle/continue/route/uncertain）③集中迭代（checkpoint 4.2 协议：冻结 baseline/收拢路由/变更验证/结算/版本）。理论源：theory/harness.md iterative-improvement、theory/thoughts/capture.md、CORR-002。
---

# Feedback Loop（反馈迭代：登记 → 回返 → 集中迭代）

同一"基于反馈迭代"主题下的链：反馈进来先被接住（capture/登记）→ 单次实践后回返（修订理解）→ checkpoint 集中迭代（批量处置 + 版本结算）。三个模式可独立触发。

## 何时使用

- **capture/登记**：用户表达思考/观点/想法（记录到 thinking-log）；应用期出现反馈/问题/纠正（分类登记到 feedback-log 并路由）。
- **单次回返**：一次实践/实验/试用结束后，判断下一步或收敛理解。
- **集中迭代**：checkpoint（组合有实质变更、一轮应用期结束、需集中结算反馈时）。

## 模式 1 · Capture / 登记（吸收 planning-inbox）

### Capture（保真记录）

低摩擦接住想法，忠实保留（可改语法错别字，不改语意/语气/时序；不补全不添加，存疑标注）。细节与纪律见 `references/record-thinking.md`。机械部分：`tools/register.py capture`。记录只是记忆，不构成承诺/计划/优先级/acceptance。

### 登记与路由（process）

反馈分类登记（`tools/register.py feedback`，字段：类型/来源/对象/standing）并路由最小 owner：问题→修 skill/工具/AGENTS.md；新想法→skill-formation 或理论演进；理论意见→理论演进；纠正→Principal correction 闭环（correction → assumption delta → owner routing → stale propagation → re-evaluation → disposition）。

### 优化 work-log

用户要求优化 `notes/work-log.md` 时：润色/规范化（日期/标题），不改语义与结论（`references/optimize-work-log.md`）。

## 模式 2 · 单次回返（吸收 practice-cycle）

给定一次真实实践结果，判断下一项最小实践如何修订或收敛当前理解（P03/P15/P16）。

1. 定位实际对象：观察/推断/候选/未知分开，不混称。
2. 命名活矛盾：阻止下一行动的未知/矛盾。
3. 选一个最小可逆实践：能改变后续判断的最小动作。
4. 由真实 owner 执行观察。
5. 反观察回看：不能改变后续决策的动作不构成学习，不外化。
6. 处置：settle（收敛）/ continue（同一方向下一实践）/ route（交其他 owner）/ uncertain（保留未知，闭环暂停）。

边界：不把重复动作冒充学习；不把格式通过/文件存在/自称完成当接受；Principal 改变目标先废止旧判断。

## 模式 3 · 集中迭代（吸收 method-evolution，即 4.2 协议）

在 checkpoint 集中回顾总结，把登记的应用期反馈变成方法体系改进；保留 baseline/rollback/lineage。

1. **冻结 baseline**：`tools/version.py freeze`（版本号 + 文件指纹，AGENTS.md + skills + theory 整套）。
2. **收拢与路由**：按模式 1 的分类，反馈送回最小 owner（问题→修 skill/工具；新想法→skill-formation 或理论演进；理论意见→理论演进；纠正→Principal correction 闭环）。
3. **变更与验证**：逐项变更后按证据等级验证（format-valid → behavior-observed → boundary-supported → matched-improvement → regression-supported）；先跑系统自检（design/agent-stack.md 4.4.1）确认组合完整；应用观察是非受控的只能产生假设，关键改动升级到受控验证（效果验证，design/test-manual.md）；无 matched baseline 不声称改善。
4. **结算**：acceptance card（接受者/硬约束/重大退化定义/最小证据/成本预算/观察窗口）；处置集合 adopt / adapt-and-retest / retain-baseline / no-proposal / rollback / uncertain；不允许长期未结算（005A）；结果出现后不为通过改写 card。
5. **出新版本**：结算即 `tools/version.py freeze` 出新版本；任何一轮可回退/切换上一版本（回退用 git，版本快照保证知道回退到哪）。

边界：不因"更严格/记录更多/用了更多 Agent"声称改善（process ≠ outcome）；理论修订走理论演进（stable/unstable + 版本）；不造新协调机制。

## 边界

- 本 skill 是反馈迭代链：记录不越界成承诺（capture）；处置不替 owner（评审推荐不授权）；理论修订归理论演进。
- 反复出现的差距 → 沉淀走 `skill-formation`；机制准入 → `mechanism-design-review`。
- 测试/验证细节见 `design/test-manual.md`；编排委派见 `work-orchestration`。

## 参考

`theory/harness.md`（iterative-improvement、Principal correction、证据等级）；`theory/thoughts/capture.md`（记录纪律）；`design/agent-stack.md`（4.2/4.4）；`design/test-manual.md`（效果验证）；`tools/register.py`、`tools/version.py`。
