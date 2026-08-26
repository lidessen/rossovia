---
name: work-estimation
description: 在把工作换算成 token、时间或金钱前，依据具体目标状态和证据恢复最小必要工作图、发现分支及当前决策能容忍的粒度；用于比较方案、规划探针和判断“真实需要多少工作”，不用于报价、预算批准或执行保证。
---

# 工作量判断

状态：项目内 incubation candidate。本文表达一个可选择加载的方法，不取得预算批准、资源
分配、runtime 强制、执行权或验收权。

主要判断：

> 给定具体目标状态和证据，必要工作图的最小形状是什么；当前决策需要多细的估算；哪些仍是发现分支而非承诺工作？

## 何时使用

使用于：

- 比较实现、设计或调查方案；
- 选择估算粒度或误差容忍度；
- 计划一个会改变后续决策的 discovery probe；
- 用户询问“真实需要多少工作”或需要为后续 actor 恢复依赖和省略项。

不使用于：

- 一步、可逆、无需比较或批准资源承诺的工作；
- 发明 token 价格、person-days、金钱或时间点预测；
- 批准预算、分配子 Cell、执行工作或替代战略选择；
- 用固定的 investigate/design/build/test 序列填充所有任务。

## 开始前恢复

```text
当前状态与来源证据：
要改变的目标状态或决策：
实际 actor 与决策时限：
硬约束和不可逆面：
现有方案、依赖与未知：
如果不用估算或只用更粗粒度，最强理由是什么：
```

先确认对象、owner、接受边界和证据；executor 声称“很快”或历史平均不能替代必要工作图。

## 方法

1. **恢复状态转移。** 说明从什么当前状态到什么目标状态；区分已观察工作、必要工作和希望的
   实现，不把 Cell、Agent 或 token 直接当成工作节点。
2. **构造最小工作图。** 只有在节点会改变必要状态、解决 decision-changing unknown、验证硬约束
   或保留后续 settle 所需关系时才加入；为每个节点写依赖和接受观察。
3. **分开承诺与发现。** discovery branch 只用于决定后续是否需要工作，写明开启和关闭它的观察，
   不把隐藏 contingency 伪装成承诺。
4. **按决策选择粒度。** 只估算到足以区分当前选项的分辨率；若两种方案在容忍误差内不可区分，
   选择一个有界 probe，而不是制造精确数字。
5. **返回 Work Estimate。** 返回状态转移、必要节点、分支、依赖、粒度/容忍度、明确省略的工作、
   反证观察和证据 standing。只有真实需要资源 projection 时，才说明后续需要何种 executor profile
   与观测；不要伪造 P50/P80/P95 或硬 cap。
6. **路由下一 owner。** 资源换算和 hard enforcement 交给 Work Cell/runtime policy；多方案战略
   方向交给 strategic owner；执行后校准交给 `practice-cycle`；载体取舍交给 `form-selection`；
   语义不足交给对应 domain owner。

## 返回

至少返回：

- concrete state transition 与 source/owner；
- 必要工作节点、依赖和每个节点的接受观察；
- discovery branches 及其开关观察；
- 当前决策需要的 resolution/tolerance；
- 不估算或省略的工作及理由；
- disconfirming observation、未知、下一 owner 和证据等级。

把 `format-valid`、`behavior-observed`、`boundary-supported`、`matched-improvement` 和
`regression-supported` 分开；工作图完整不等于工作已经执行或被接受。

## 边界与行为探针

- 不把工作节点直接映射成 Work Cell、person-day、token 或价格；不同 executor 可以合并或拆开节点。
- 不用一个百分比 buffer 隐藏 discovery branch；会改变决策的未知必须单独保留。
- 不把 forecast overlap 当作方案等价；无法区分时转交 bounded discovery practice。
- 正例：粗粒度“完成设计”被拆成能改变决策的关系 review；反例：一步可逆小改动不制造 work graph；
  最近邻：策略方向、形式选择、实践后校准和 runtime 资源 enforcement 交回对应 owner；回归：新
  estimate 不抹掉旧依赖、未知或已产生的事实。

当前最强主张是 `behavior-observed`；没有 matched alternatives、独立 review 和校准回归，
不能声称估算准确或产生资源承诺。
