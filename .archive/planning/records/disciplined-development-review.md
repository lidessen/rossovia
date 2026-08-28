# `disciplined-development` skill 形成回返

状态：`current-proposal-closed / no-proposal-now / activation-deferred / independent-review-complete / acceptance-pending`；
不是新的 skill 载体、portable promotion、开发流程授权或实现计划。

本记录回返 [`design-development-review.md`](design-development-review.md) 中的
`disciplined-development` candidate，判断它是否应从 archive 迁入 `.agents/skills/`，或当前更
适合由项目指令、现有 skill 和普通开发 reference 分担。archive 正文是历史来源，不是当前
authority。

## 1. 来源、对象与当前事实

- **历史来源：** [`../archive/skills/disciplined-development/SKILL.md`](../../archive/skills/disciplined-development/SKILL.md)。
  其主要判断是：基于实际证据选择最小有效改变，在声明完成前检查可证伪条件，并把未知保留为未知。
- **当前相关 authority：** 项目 [`../AGENTS.md`](../../AGENTS.md) 部分覆盖实际状态、边界修改和风险
  验证；`practice-cycle`、`work-estimation`、`mechanism-design-review` 分别拥有结果→下一实践、
  工作图/发现分支、机制必要性判断；`skill-formation` 判断是否值得形成 skill，`form-selection`
  判断应使用项目指令、reference、skill carrier 或其它形式。这些 owner 都没有被本记录替代。
- **当前 consumer/context：** 本轮主线提供了 planning/design review context，但这不是
  `disciplined-development` 已被采用的行为 consumer；当前没有已接受的 WorkCell、DeepSeek 或
  base implementation，也没有可以作为 `code-review` / `structural-refactoring` consumer 的
  accepted-intent code diff。
- **当前观察：** [`whole-planning-work-estimate.md`](../index/whole-planning-work-estimate.md)、
  [`workcell-lifecycle-review.md`](workcell-lifecycle-review.md)、
  [`workcell-observation-lineage-review.md`](workcell-observation-lineage-review.md)、
  [`phase-1-exit-review.md`](../phase-1-exit-review.md) 和方法 probe records 中，确实反复出现“先读
  source、缩小 semantic delta、保留 unknown、验证后再声明”的 planning-level observation；这些
  结果同时受到项目指令、planning records、上述候选 skills 和 Main 综合影响，不能归因给一个尚未
  创建的 `disciplined-development` carrier。

## 2. 载体候选与最近邻

| 关系 | `disciplined-development` 的候选判断 | 当前 owner / 最近邻 |
| --- | --- | --- |
| 主要对象 | 开发或设计行动中，选择最小可证实改变并在完成声明前检查反证 | 当前项目 instruction + 具体 domain owner |
| 正触发 | 发现 overengineering、猜测、未验证完成声明或 test 失去决策价值的重复行为差距 | 需要真实 task 与重复 gap；当前只有历史/规划观察 |
| 负触发 | 一次性小改动、已有 domain method 拥有的判断、纯格式修复 | `practice-cycle`、`work-estimation`、`mechanism-design-review` |
| 最接近形式 | 始终加载的项目行为边界、普通 development reference，或未来的 code-review/refactor method | `AGENTS.md`、`form-selection`、`code-review`、`structural-refactoring` |
| 不能拥有 | 生命周期、权限、并发、恢复、测试强制、merge/acceptance 或资源承诺 | runtime/base、acceptance owner、对应工程 owner |

当前最关键的区别尚未在真实 code consumer 中成立：候选 skill 可能只是把项目应始终遵守的
一般纪律重新包装成可选择载体，也可能在具体开发任务中形成一个独立的“证据—最小改变—反证
检查”方法。当前 AGENTS 和现有 skills 只支持部分重叠，尚不能证明它们已经覆盖完整方法；
没有前者/后者的可观察区分，不迁移正文。

## 3. 有界处置判断

### 保留的候选价值

- archive 正文提供了比普通“认真一点”更具体的行动关系，包括 source-first、最小 semantic delta、
  falsifiable acceptance、证据等级和测试决策价值；它仍值得作为后续 review 的 historical source。
- `code-review` 与 `structural-refactoring` 尚未有真实实现 consumer，因此不能用它们的未来存在
  反向证明当前需要一个通用前置 skill。

### 当前不迁移的理由

- 没有当前 accepted development task、真实 code diff 或重复的 failure gap，无法建立候选 carrier
  的 baseline/treatment 与边界 evidence。
- 主要内容可能部分覆盖项目 `AGENTS.md` 的常驻约束，或与 `practice-cycle`、`work-estimation`、
  `mechanism-design-review` 的局部判断重叠；增加一个广泛激活的 carrier 可能产生 context cost、
  trigger ambiguity 和第二套开发纪律。是否应选 skill、reference 或项目指令，交由
  `form-selection`；是否值得形成载体，交由 `skill-formation`。
- 将其放入 `.agents/skills/` 只能证明文件可加载，不能证明它改变 Agent 行为；当前没有 portable
  consumer，也没有 move/acceptance 条件。

因此本轮的最小处置是：

```yaml
candidate: disciplined-development
source: archive historical skill + current AGENTS/skill owner map
disposition: no-proposal-now / activation-deferred / retain-archive-source
new_carrier_created: false
portable_promotion: false
current_consumer: no accepted development or code-change consumer
evidence_standing: source-backed candidate; current behavior attribution unknown
implementation_or_runtime_authorized: false
```

这不是删除，也不是断言它没有价值；它表示当前还不能证明 skill 载体是比常驻项目指令、普通
reference 或未来具体开发方法更真实的形式。

当前提案在本阶段关闭为 `no-proposal-now`；archive 的 `candidate-next` 只保留为未来 reopen
条件，不是当前迁移队列或待执行任务。

## 4. 下一项最小实践与关闭条件

单次事件只支持一次 probe 机会，不支持重复 gap 或 skill 准入结论。只有出现以下真实 consumer，
才开启一轮 candidate probe：

1. 一个 accepted intent 下的真实 code/design change；
2. 一个可观察的 overengineering、未验证完成声明或测试决策价值缺失的 baseline gap；
3. 一个不由 `practice-cycle`、`work-estimation`、`mechanism-design-review` 或 `code-review`
   单独拥有的判断；
4. 一个能由独立 reviewer 检查的反例和 falsifiable acceptance observation。

probe 应固定同一 task/source/workspace/runner，只比较不加载候选与加载候选的行动；若 baseline 与
treatment 无法隔离，返回 `behavior-observed / attribution-unknown`，不创建 carrier。

- **转为 skill candidate：** 独立触发、成功/拒绝/route 行为和最近邻边界均得到支持，且可选择
  加载的形式确实比常驻指令或 reference 更小、更真实；再由 `skill-formation` 另行形成载体。
- **降级为 reference / 项目指令：** 只能作为所有开发任务的共同约束，或没有独立触发与失败关系。
- **no-proposal：** 重复 gap 消失、现有 owner 已足够，或 probe 不能改变任何后续决定。

在上述条件出现前，本记录的当前 projection 保持 `no-proposal-now / activation-deferred`；archive
初筛中的 `candidate-next` 只保留为历史/未来 reopen 标签。本记录不新增 `.agents/skills/` 文件，
不改变 phase 1、WorkCell 或 DeepSeek standing。

## 5. Independent semantic review

独立 reviewer：`Kant`（Agent `01a03792-3537-7960-a2cb-ea1ab05fd389`）；未修改文件，未取得
skill acceptance、portable promotion、实现或 runtime 权。

- 确认当前 `candidate-next / activation-deferred / retain-archive-source` 处置基本合理，没有
  遗漏已接受的 code consumer；
- 要求把 planning/design 标为 review context 而不是 adopted behavior consumer；已修订；
- 要求弱化 AGENTS/现有 skills 已覆盖完整方法的表述，并补 `skill-formation` 与 `form-selection`
  路由；已修订；
- 要求列出 current planning-level observation 的具体记录，并把单次事件与重复 gap 区分；已修订；
- 确认当前没有 matched、regression 或 acceptance evidence。

因此初始 review 的 standing 为 `candidate-review / activation-deferred / independent-review-complete /
acceptance-pending`。该 review 不把 archive source、planning-level observation 或 record 完整度
升级为 skill behavior acceptance。

## 6. Evidence standing

- source/nearest-neighbor review：Main 形成记录，Kant 完成独立 semantic review；
- behavior：历史 archive-backed observation，当前 carrier attribution `unknown`；
- mechanical / matched / regression / acceptance：均未取得；
- owner：skill/方法 owner 与未来 code consumer `unknown`；
- return：出现真实 development consumer 后重新打开，否则保留 archive-only source 和当前处置。

## 7. 2026-08-25 当前提案关闭

本次回读确认没有新的 accepted development task、真实 code diff、重复 failure gap 或可归因的
carrier behavior。planning/design 仍只是 review context；`AGENTS.md`、现有 skills、domain owner
和普通 development reference 仍是相邻形式/owner。

```yaml
current_disposition: no-proposal-now / activation-deferred / retain-archive-source
future_reopen: real development consumer + repeatable failure gap + independent boundary/acceptance observation
new_carrier: false
portable_promotion: false
matched: unknown
regression: unknown
acceptance: unknown
implementation_authorized: false
```

该 projection 只关闭当前迁移提案，不删除 archive source，也不把 `disciplined-development` 判定为
无价值；真实 consumer 出现后，重新从 source/consumer/boundary probe 开始。
