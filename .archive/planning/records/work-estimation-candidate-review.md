# `work-estimation` 当前 planning consumer 形成回返

状态：`candidate-review / behavior-observed / attribution-uncertain / independent-review-complete / acceptance-pending`；不是
资源报价、预算批准、portable promotion、WorkCell/DeepSeek 实现授权或新的 planning queue。

本记录 review 已有的项目内 `work-estimation` carrier，不创建第二个载体。它判断当前真实 planning
consumer 是否仍需要这个可选择加载的方法、它是否与 `practice-cycle`、`skill-formation`、`form-selection`
和 planning authority 保持边界，以及下一项最小 probe 应是什么。

## 1. 来源、对象与 owner

- **candidate：** [`.agents/skills/work-estimation/SKILL.md`](../../.agents/skills/work-estimation/SKILL.md)，当前
  candidate SHA-256 为 `7cbf9b307702c1ef37a3b4f584cf16dfbb650e1811358b85f4641341078def9f`。
- **语义来源：** archive `work-estimation`、当前 living theory 和项目 planning owner；archive 只作历史
  来源，carrier 只作 `.agents/skills/` incubation。
- **当前使用关系：** [`whole-planning-work-estimate.md`](../index/whole-planning-work-estimate.md) 及本 goal 的
  planning/design 分支是 Main 的 project-local planning use / consumer-candidate；尚不是 named consumer、
  portable consumer 或资源/预算 owner。
- **相关当前 case：** [`workcell-spec-identity-boundary-review.md`](workcell-spec-identity-boundary-review.md)
  已将 WorkCell `spec` inline/reference、RunRecord identity、digest/retention 与 registry 关系拆成
  bounded review，且因 owner 缺失保持 acceptance-pending；它是 Main 的 self-application observation，
  不是 named record consumer、carrier-specific failure 或真实 Run。
- **owner boundary：** Main/planning owner 负责当前 item standing 和下一行动；`work-estimation` 只恢复
  状态转移、必要工作图、发现分支和决策粒度；`practice-cycle` 负责结果改变下一实践；`skill-formation`
  决定是否继续形成 carrier；`form-selection` 决定 skill、reference、项目指令或其它形式；资源、
  runtime enforcement 和 acceptance 归各自 owner。具体 acceptance owner 仍 `unknown`。

## 2. 可重复的当前观察

当前 work-estimation 方法已在同一个主 goal 的多个 planning branch 中被 Main 自用；这些是 project-local
planning observations，不是已命名的外部或独立 consumer：

- 初始 whole-planning work graph 把 A–R 分支、依赖、决策容忍度和不授权边界分开；
- living skills applicability、历史 evidence closure、P15/P16、attention-management 等回返都保留
  discovery branch、unknown 和不需要的数字估算；
- 最新 WorkCell Spec identity case 将“继续增加字段”“等待 owner”“转向 Stage A 方法形成”和
  “提前设计 DeepSeek”作为不同候选，确认当前只需选择下一有界 planning contribution，不需 token/time/money
  估算；
- 这些结果由 Main 综合并写入 planning records，尚没有 matched baseline/treatment 可以把差异归因于
  carrier，也没有 adoption/regression 或 named external consumer。

因此只能保留一个低强度、由 Main 生产的 `behavior-observed`：这些规划记录反复出现“目标状态 →
最小工作图 → discovery branch → 当前决策容忍度 → owner route”的结构；不能写成 named consumer、
估算准确性、资源预测能力或 carrier-specific improvement。若没有独立 consumer，重复 Main 自用本身
不能继续抬高证据等级。

## 3. 当前 case 的最小工作图

### 当前状态

```text
WorkCell protocol candidate
  → Spec identity review completed
  → owner/consumer/digest/retention acceptance still unknown
  → WorkCell and DeepSeek implementation remain frozen
```

### 目标状态转移

```text
current WorkCell self-application
  → project-local use / named-consumer absence / carrier standing separated
  → current-use probe settled with an exact disposition
  → next return requires a named consumer and a decision-changing case
```

### 可选下一步比较

| branch | dependency | 最小工作 | acceptance observation | discovery open/close observation | disconfirming observation | next owner |
| --- | --- | --- | --- | --- | --- | --- |
| 继续堆 WorkCell 字段 | named protocol/record/host owner、新反例 | 只做 owner-return 或 bounded contract review | owner-backed decision 可回读；没有则不改变 standing | owner/consumer 出现时 open；连续无 owner 时 close 为 wait | 新字段不能改变任何 owner/consumer/unknown 关系 | protocol/record/host owner；当前 unknown |
| 提前设计 DeepSeek 工作系统 | WorkCell design acceptance | 只能保留 system-layer question，不形成 runtime | WorkCell accepted exit 与 system owner 可回读 | acceptance 成立时 open；当前前置缺失时 close | system object 反向改变 WorkCell core | system owner；当前 unknown |
| 开 practice-cycle matched round | named runner、完整 identity、activation proof、schema、card | 先 owner discovery；前置齐后才可冻结/运行 | matched/review evidence 可回读；否则保持 behavior-only | 前置齐时 open；任一承重字段缺失时 close/no-rerun | 重复 Main 自评或不同 runner 不能证明 matched | eval/runner owner；当前 unknown |
| 继续 Stage A 方法形成 | planning authority 选择继续方法形成；carrier boundary 仍 unknown | 复核已有 project-local use，形成独立 review 与下一 probe | 只能证明当前 case 的 boundary/standing，不证明 carrier acceptance | named consumer **且** decision-changing case 出现时 open；Main-only case 不重新打开 carrier evidence probe | 工作图不改变下一 branch，或现有 plan/ledger 已足够 | Main/planning authority 选择；skill-formation 决定 carrier |
| 重开历史 evidence | source/Run/consumer/owner 可恢复 | 只做 applicability audit 或 route | current standing 能由 artifact chain 重建 | source/owner 恢复时 open；仅为填 ledger 时 close | 没有可回读 source edge 或不能改变当前决定 | eval/evidence owner；当前 unknown |

### 选择结果

当前决策只需要知道：WorkCell owner 未出现、DeepSeek 前置未成立、matched probe 前置不齐，且 Stage A
仍是主序列优先项。所需粒度到 branch/owner/停止观察即可；不需要把任何节点换算成 token、时间、金钱、
executor capacity 或 deadline。

Main/planning authority 选择 **Stage A 的 `work-estimation` current-use review**。`work-estimation`
只提供上述 branch 比较和工作图，不拥有“选择 Stage A”这一战略/standing 决定；`skill-formation` 决定
carrier 是否继续存在。该 case 是 Main self-application，不足以宣称 carrier 已被接受，只能检查当前
表达是否保留清楚的 owner、discovery 和停止边界。

## 4. Skill-formation 判断

| 关系 | 当前观察 | 当前处置 |
| --- | --- | --- |
| 独立主要判断 | “需要多少工作”被收窄为状态转移、必要节点、发现分支和决策分辨率；不作预算批准 | 保留 candidate |
| 重复性 | whole-planning、evidence applicability、P15/P16 的 Main 自用记录重复出现；当前 WorkCell case 只是一次新的 self-application | `behavior-observed`；named consumer、matched attribution 均未知 |
| 最近邻 | `practice-cycle` 选结果后的下一实践；`form-selection` 选载体；planning owner 保存 standing；runtime/资源 owner 负责强制属性 | 边界目前可写清，继续观察 |
| 形式 | 可选择加载的 Agent-facing carrier 已存在；语义 theory、planning record 和资源 owner 仍各自拥有自己的部分 | 不新建 reference/第二 skill |
| 行为归因 | 当前规划结构可能来自 Main、现有 planning records、AGENTS 和 carrier 的共同作用 | `attribution-uncertain` |
| 迁移/portable | 未发现外部 consumer；项目 boundary 仍是事实依赖 | 留在 `.agents/skills/` |

当前最小 disposition：

```yaml
candidate: work-estimation
carrier_disposition: retain-incubation / adapt-and-retest
current_case_disposition: no-proposal-now
carrier_change: none
current_use: whole-planning and WorkCell planning review / Main self-application
named_consumer: unknown
evidence: behavior-observed / attribution-uncertain
matched: unknown
acceptance: pending / owner unknown
portable_move: no-proposal-now
implementation_authorized: false
```

这不把 `work-estimation` 变成 planning preflight、总 workflow、预算系统或 runtime guarantee；也不把
“工作图完整”写成工作已执行。

## 5. 下一 probe 与停止边界

下一次真正有区分度的 probe 需要一个能改变计划选择、且不只是 Main 重复自用的 named planning/design
consumer，并同时包含：

1. 一个一步、可逆、无需比较的任务，预期不制造 work graph；
2. 一个需要比较方案或发现分支的任务，预期恢复最小工作图；
3. 一个最近邻任务，预期 route 给 `practice-cycle`、`form-selection`、domain owner 或 runtime owner；
4. 一个独立 reviewer 能检查的反证：如果工作图没有改变下一决策，候选不应被保留为该 case 的必要形式。

在 runner/model/harness/workspace、candidate activation、schema、reviewer 和 source snapshot 无法
共同冻结前，不启动新的 matched Run；只记录 planning-level observation。若新 case 显示现有 plan/ledger
已经足够，返回 `no-proposal` 或降级为 reference；若方法只对所有 planning 都应常驻，则回交
`form-selection`/项目 instruction，不保留兼容壳。当前 named consumer 缺失，因此本 current-use probe
明确关闭为 `no-proposal-now`；这不影响 carrier 总体 `retain-incubation / adapt-and-retest`。只有 named
consumer 且 case 改变下一决策时，才重新打开 carrier evidence probe，不继续累积同类 Main-only evidence。

## 6. Evidence standing 与 return

- `format-valid`：由当前 skills validator 支持；这只证明 carrier 格式和本地 link。
- `behavior-observed`：多个当前 planning/design 使用记录支持方法关系重复出现；由 Main 生产，不能单独
  归因于 carrier，也不能把当前 WorkCell case计为 named consumer evidence。
- `boundary-supported`：当前 owner/最近邻和不授权边界可由本记录重建；尚未由独立 reviewer 复核。
- `matched-improvement`、`regression-supported`、portable acceptance：均未成立。
- **下一 return：** 独立 reviewer 检查当前 case 是否确实改变下一选择、是否与 practice-cycle/form-selection
  分开，以及是否把重复 planning prose 误升为 skill evidence；review 之后同步 projections，但不修改
  carrier，除非出现明确的表达缺口。

## Independent review

独立 reviewer `Kepler` 初轮要求收窄“真实 consumer”表述，并补齐每个节点的 dependency、acceptance
observation、discovery 开关、反证和 next owner；随后 `Meitner`（Agent `01a03947-bfd5-7872-b955-736b47992328`）
独立复读确认：current→target 状态转移已明确；Stage A 只有 named consumer 且 decision-changing case
才重开；当前 case 的 `no-proposal-now` 与 carrier 总体 incubation 已分离；没有越过 skill、WorkCell、
DeepSeek、runtime 或 implementation acceptance。本 review 只覆盖 `work-estimation` 当前 project-local
use 与 skill-formation 处置，不取得 carrier acceptance、portable move、资源承诺、WorkCell/DeepSeek 设计
接受或实现授权。
