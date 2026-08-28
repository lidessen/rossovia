# practice-cycle / work-estimation 方法候选探针

状态：`candidate-incubation / behavior-observed`；第二轮对照记录见
[`method-skill-probe-round-2.md`](method-skill-probe-round-2.md)；不是 skill acceptance、portable
promotion、资源承诺或实现授权。

本记录是对 archive 中 `practice-cycle` 与 `work-estimation` 的第一轮当前 branch probe。它只
判断两个窄方法是否有独立 Agent-facing 载体，并把实际 planning 行动作为行为观察；不把一次
planning 文档写完整误报为 matched improvement。

## 1. 来源、对象和载体判断

- **来源：** `archive/skills/practice-cycle/SKILL.md`、`archive/skills/work-estimation/SKILL.md`、
  `theory/harness/iterative-improvement.md`、`planning/item-ledger.md` 和当前 WorkCell A/B/C/D
  review records。
- **真实对象：** `practice-cycle` 判断“实际结果如何改变下一项最小实践”；`work-estimation`
  判断“当前决策需要的最小必要工作图、发现分支和估算粒度”。
- **当前 consumer：** 本项目的 planning/design review；外部 portable consumer unknown。
- **形式比较：** theory 保存持久语义；item ledger/review record 保存 planning projection 和
  lineage；`practice-cycle`、`work-estimation` 面向 Agent 的选择性方法表达；二者都不是 runtime、
  event bus、预算系统或 acceptance authority。
- **载体决定：** 两者分别进入 `.agents/skills/` incubation candidate；不进入 `skills/`，不复制
  archive 正文，不创建一个全生命周期万能 skill。

## 2. 当前 planning probe

### 2.1 Practice-cycle probe

**baseline：** WorkCell 先前只有“四个开放关系”的粗粒度计划，下一步容易退化为继续泛化协议或
直接实现；没有明确从一个 review 结果选择下一项最小实践。

**最小实践和观察：** 先对 A/B 做 bounded lifecycle review，再对 C/D 做 observation/lineage
review。A/B 的结果暴露 host cutoff、late effect、active revocation 和 binding identity 缺口；
C/D 的结果进一步区分 Event observation/replay 与 parent pointer/causal recovery。每轮结果都
改变了下一轮对象和 owner return condition，而不是重复同一份总计划。

**边界：** 没有结果改变的一步格式修复不需要 cycle；概念、载体、协议字段、runtime 和接受
矛盾仍 route 给各自 owner；review record 只保留决策变化，不创建 round counter 或自动 retry。

**当前判断：** `practice-cycle` 的主要判断在多个当前 planning round 中重复出现，正例、反例
和最近邻可以区分；当前证据为 `behavior-observed`，还没有 baseline/treatment 匹配归因、独立
semantic review 或回归支持。

### 2.2 Work-estimation probe

**baseline：** “完成 WorkCell 设计”是过粗的工作节点，无法说明四个开放关系、owner 缺口、
consumer 缺口和实现门槛之间的依赖；若直接按 token/time 估算，会把未知藏进数字。

**最小必要工作图：**

```text
恢复协议 baseline
  ├─ A/B lifecycle boundary review
  ├─ C/D observation and lineage review
  └─ owner/consumer return
       ├─ owner/consumer 出现：进入字段/consumer contract review
       └─ 仍缺失：保留 retain-unknown，不进入实现
```

当前决策只需要按四个关系拆分到 review record 的粒度，不需要 token、时间、金钱或 executor
产能估计。若以后出现真实 consumer，才另行增加 replay、retention 或 host contract 的 discovery
分支；这些不是当前承诺工作。

**当前判断：** `work-estimation` 具有独立的“状态转移/必要工作图/发现分支/决策粒度”判断，
不能合并到 `practice-cycle`；当前证据同样为 `behavior-observed`，没有准确性、matched alternative
或 calibration evidence。

## 3. skill-formation review

| 关系 | `practice-cycle` | `work-estimation` |
| --- | --- | --- |
| 正触发 | 实际结果必须改变下一实践 | 方案/分辨率/资源承诺需要工作图或 discovery branch |
| 负触发 | 一步可逆工作、已由 domain owner 拥有的矛盾 | 一步工作、无需比较或资源决定的工作 |
| 最近邻 | iterative-improvement theory、domain method、acceptance owner | strategy、practice-cycle、form-selection、runtime policy |
| Agent 行为改变 | 从观察选择最小 next practice 或 route | 不把未知藏在数字，选择能区分决策的最小图和粒度 |
| 非 skill 权威 | 不创建持久循环或接受 | 不批准预算、分配资源或强制执行 |

二者不合并：触发时序、主要判断、失败方式和验证关系不同。二者也不取代现有 canonical：
iterative-improvement theory 仍拥有语义 theory，item ledger 仍拥有 planning standing，
`skill-formation` 仍拥有载体准入判断。

## 4. 处置、证据和回返

- **处置：** `retain-incubation`；两个新载体已创建为 project-local candidate，未 portable promote。
- **机械验证：** `format-valid`，须由仓库 validator 和各自 quick validator 复核。
- **语义证据：** `behavior-observed`；本 probe 是同一规划主 goal 中的真实使用观察，不是独立
  baseline/treatment，也不是接受决定。
- **独立性：** Main 同时设计并执行 probe，尚无独立语义 reviewer 或人类 acceptance owner。
- **回归风险：** 载体若被误用为强制 preflight、万能 planning、预算批准、runtime 保证或第二份
  closure protocol，应回退正文；若现有 theory/ledger 已足够且没有独立 consumer，应返回
  `no-proposal` 或降级为 reference，而不是保留兼容壳。
- **下一轮：** 用一个与 WorkCell 不同的真实 planning/design case 做 baseline/treatment；至少
  包括正例、反例、最近邻、低风险一步任务和回归任务，并由独立 reviewer 判断是否改变核心
  判断。若无法隔离变量，只保留 `behavior-observed`。
- **阶段影响：** phase 1 获得两个可加载的 incubation method candidates；portable `skills/`
仍不存在，WorkCell、DeepSeek Harness、base/runtime 和用户 harness 构想实现仍未授权。

第二轮已在 P01/P03 reading parent 上完成内部只读对照；其严格归因、runner 限制和下一轮条件见
[`method-skill-probe-round-2.md`](method-skill-probe-round-2.md)。
