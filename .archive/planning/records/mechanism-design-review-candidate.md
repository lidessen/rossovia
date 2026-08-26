# mechanism-design-review candidate review

状态：`candidate-review-round-1 / rewrite-applied + retain-incubation`；不是 portable acceptance、WorkCell
协议 acceptance、runtime gate 或实现授权。

## 对象与来源

- **candidate：** [`.agents/skills/mechanism-design-review/SKILL.md`](../../.agents/skills/mechanism-design-review/SKILL.md)
- **历史来源：** `archive/skills/mechanism-design-review/SKILL.md` 及其 references；archive 只作历史
  来源，不是 living canonical。
- **living 语义来源：** `theory/skill-formation.md`、`theory/gene-expression.md`、
  `theory/harness/theory.md`；当前项目 consumer/evidence 由 planning records 投影。
- **first consumer：** `design/work-cell-protocol.md`；WorkCell 仍是 design candidate，不是已接受协议。
- **review unit：** 一个具体 mechanism proposal，或一个设计 item 中由同一压力产生的一组紧密提案；
  不把多个互不相关的压力混成一轮。

## 独立 review

reviewer：`Jason`，Agent `01a03787-cf5d-7383-9110-b1941e3670a3`；只读、未修改文件，未参与
candidate 生产。该 review 区分 mechanical format、source fidelity、planning behavior、matched
attribution、semantic acceptance 和 adoption regression。

| 维度 | 当前 standing |
| --- | --- |
| format | `format-valid`；`ruby scripts/validate-skills.rb` 已通过 11 个 skill |
| source | `source-backed`；核心判断与 archive source 基本一致，但 lineage/表达仍需补齐 |
| behavior | 仅 `planning-level behavior-observed`；作者归因未独立隔离 |
| matched | 未成立；没有冻结 baseline/treatment 和 candidate activation |
| acceptance | 未成立；没有 acceptance owner 或 adoption window |

### 已成立的关系

- 主要判断可指认：针对一个具体设计压力，判断新增机制是否必要，并选择保留硬约束的最小处置；
  同时比较 prompt、已有 owner、确定性边界和新机制的全生命周期负担。
- Identity / Origin / Destination、prompt-first、已有 owner 优先、observation/review/acceptance/
  next action 分离均被正确吸收。
- 当前载体没有直接创建 runtime state、registry、queue、gate、retry controller 或 acceptance
  authority；没有把 WorkCell、DeepSeek 或 base 实现写成授权。
- WorkCell planning probe 的四个真实设计压力是可复述的：bounded drain/unknown effect、Binding
  expiry/revocation、Event 顺序/去重/重放、retry/continue lineage。

### 必须修订的关系

- 明确 review unit，并要求每个结论绑定 observed case、失败后果和当前 owner；区分 observed 与
  hypothetical、覆盖与未覆盖。
- 增加最近邻路由：`form-selection`、`skill-formation`、`concept-articulation`、
  `agent-expression`、`practice-cycle`、`work-estimation`，避免把载体选择、概念不稳、表达失败
  或下一步实践误送进机制审查。
- 补 source lineage：archive 是历史来源，living theory 是语义来源，planning record 是当前
  consumer/evidence projection，`.agents/skills` 是 incubating carrier。
- 返回关系要包含下游接收 owner、失败停止位置、没有产生的 effect，以及 `route`、`no-proposal`、
  `rewrite` 的触发条件。
- 当前 WorkCell 事实必须保持 project adapter/projection 地位，不能让 skill 正文成为第二事实源。

## 初始处置（2026-08-24；已由后续 rewrite reconciliation 收窄）

`rewrite + retain-incubation`。

不是 `no-proposal`：主要判断独立，且已有真实设计 consumer。不是 `demote`：它不只是普通文档
整理或载体选择。暂不 `keep-as-is`：review unit、case evidence、最近邻路由、source lineage 和
return contract 还不足以支持稳定可重复的 probe。

## 下一项最小 probe

冻结同配置、只读的 baseline/treatment：

1. **正例：** 有明确跨进程 replay/recovery consumer，提出 durable event/lineage mechanism；
2. **反例：** 没有 replay consumer，只有 typed Event 与 RunRecord，预期 `keep/simplify/unknown`，
   不提出 event bus 或 registry；
3. **最近邻：** 判断问题应成为 skill、reference、projection 还是 runtime，预期路由到
   `skill-formation`/`form-selection`；
4. treatment 只加载修订后的 candidate，blind reviewer 判断 object、trigger、owner、最小处置、
   越权和 unknown；
5. 先记 `behavior-observed`，不宣称 matched 或 acceptance；只有独立 review 与 adoption/regression
   证据成立后，才重新判断 candidate 是否继续存在。

`planning/records/design-development-review.md`、`planning/index/skill-migration.md` 与 `item-ledger.md` 负责
投影当前处置；它们不因此获得 skill 方法的 canonical authority。`skills/` 仍不存在，archive 不
移动，WorkCell/DeepSeek/base 不实现。

## Round 1 实际回返

详见 [`mechanism-design-review-round-1.md`](mechanism-design-review-round-1.md)。本轮已冻结同一
task/source/candidate 的 baseline/treatment，并保留 raw outputs 与 hash。M1（有真实跨进程 replay
consumer）、M2（无 replay consumer）和 M3（机制/载体尚未稳定）的三项 recommendation 分别在
两次运行中保持 `mechanism-candidate`、`no-proposal`、`route-unknown` 一致；treatment 对 owner、
硬关系、nearest-owner route 和 stop/effect boundary 的表达更明确，但运行 identity 不足以支持
candidate-specific matched attribution。

当前 round disposition：`adapt-and-retest`；standing：`behavior-observed`，局部
`boundary-supported`，matched/acceptance/adoption `unknown`。载体仍为
`rewrite + retain-incubation`。独立 reviewer 进一步确认 M1 只是 fixture-stipulated 的条件性机制
观察，M2 negative boundary 成立，M3 应补 `skill-formation` 路由；下一轮需补 named replay
consumer、record/retention owner、重启 fixture 和可重建 runner identity，同时保留 M2/M3 的
negative/nearest-owner 边界。

## 2026-08-25 round-1 rewrite reconciliation

本次只对 incubating carrier 做一项语义收窄，不重开 round-1、不修改 frozen card/Run/review，也不改变
WorkCell canonical protocol。当前 carrier SHA-256 为
`13255f26f3c48a1693ca19d98fd7f2b64eaa71d13258dfbf945918ff09c5efb0`；round-1 frozen candidate hash
`8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb` 继续保留为历史 source edge。

修订对应 round-1 的单一缺口：当 consumer、owner、重启场景或失败后果只是 fixture 为条件性正例写入
的前提时，carrier 现在要求显式标为 `fixture-stipulated`，不得把它写成真实外部 consumer、重复生产
证据、采用关系或 acceptance。只有能由当前来源和实际关系独立回读的 consumer/owner，才可承担机制
必要性的事实地位；否则返回 `hypothetical`、`unknown` 或 `no-proposal`。

该改变只收窄 evidence standing 和 nearest-owner 判断，不新增机制、字段、队列、registry、runtime
state、review authority 或实现授权。当前处置更新为：

```yaml
carrier_disposition: rewrite-applied / retain-incubation
round_1_disposition: adapt-and-retest
evidence: format-valid / source-backed / behavior-observed / boundary-supported
matched: unknown
acceptance: unknown
next_return: named replay consumer + record/retention owner + restart fixture + reproducible runner identity
new_run: false
implementation_authorized: false
```

本 reconciliation 只接受 carrier source 的窄修订；是否继续存在、是否重跑以及是否可移植，仍须按
named consumer、可重建 identity、独立 review 和 adoption/regression 关系另行决定。
