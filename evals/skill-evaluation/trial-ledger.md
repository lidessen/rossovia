# Trial ledger：post-freeze append-only records

本 ledger 只接收已冻结 core card 之后的运行、观察、审查、处置、stale/recovery 和 rerun。它
通过 trial id、round id 和 card snapshot hash 链接 [`trial-manifest.md`](trial-manifest.md)；不回写
或覆盖 card，也不把旧记录改成新结论。

## 追加与不可变边界

每条 entry 追加以下 envelope：

- entry id / trial id / round id / event type / UTC time / appender：
- previous entry hash：
- entry record hash：
- append mechanism 与可验证 artifact/log/权限证据：没有真实机制或无法核验写 `unknown`：
- card snapshot hash：

“append-only”是语义要求；prose 禁止编辑不能创造不可变性。若机制为 `unknown`，保留记录但
相应 process 与归因 standing 不得假设历史不可变。

## Principal correction entry（按事件启用）

本 entry 不是每个 trial 的必填模块。只有 card 启用了 `principal-correction`，或 freeze 后
实际收到改变本轮对象、standing 或 form 的 Principal correction 时才追加；没有 correction
不填写。freeze 后不回写 card、run、review 或旧 entry；若 correction 改变规则、对象、接受者
或 phase applicability，追加 stale/uncertain 并开启新 round。

- correction event id / trial id / round id / UTC time / recorder：
- raw source artifact/path/hash、source revision、上下文与来源 authority；无法核验写 `unknown`：
- 当前可修订分类（`correction` / `new-requirement` / `preference` / `noise` / `unknown`）、
  分类依据、冲突与未知；分类不是固定分类器，Agent/ reviewer 不能以语气自授 authority：
- 指向的 object/run/card snapshot、assumption delta、未改变的旧 baseline 与仍未知：
- 最小 owner、routing history、Principal/明确受托接受者及其权限：
- 实际依赖 edge（`from → to | relation | artifact/hash | standing | owner`）、受影响 artifact/
  snapshot/phase、stale 范围与不受影响边的理由：
- re-evaluation/review/rerun artifact 与 owner、新 round id（如有）、历史保留关系：
- Principal accepted disposition、决定/身份/时间；review 或 receipt 不得冒充 Principal acceptance：

该 entry 记录来源关系与处置，不默认修改 theory、skill、runtime 或接受结果；无足够 authority
或证据时保留 `unknown`、hold 或改判为新需求/偏好/噪声。

## Principal correction adoption-window observation（仅相应对象启用时）

只有当 core card 同时启用 `principal-correction` 与 `adoption-window`，才追加本节；普通
adoption-window 或普通 trial 不必填写。观察必须引用冻结的观察对象、窗口、实际 exposure
范围/纳入排除规则和 owner，不在结果出现后改写这些关系。

- correction event / accepted disposition / adopted artifact 或新 downstream artifact：
- observation window、观察对象、owner、实际 `exposed set` 与 `observed set`（artifact/hash 或
  可回读范围），未暴露/丢失/未复查集合及原因：
- correction escape、recurrence/reopen、等价复现、以及与新需求/偏好/噪声/unknown 的改判：
- 每个指标的观察定义、numerator、denominator、暴露范围和窗口；无真实 exposure 时全项写
  `unknown`，不得将零暴露、零观察或空集合解释为零 escape/recurrence：
- 实际时间 / token / 等待 / 协调 / 维护 / 必要外部成本，以及是否改变下一行动：
- 观察限制、独立 review、仍未知和后继 rerun/new round：

escape、recurrence/reopen、latency、coverage、误分类和负担分别保留，不组成全局分数或
统一阈值；本节也不提供 telemetry、唤醒、取消、持久化、exactly-once 或回滚保证。

## Run output entry（baseline / treatment）

每次运行追加一条，不把 candidate input hash 当成 run output hash：

- run id / role（`baseline` 或 `treatment`）/ phase：
- candidate input hash（应与 card 一致）与 run configuration hash：
- output artifact hash、terminal-state/log hash、开始/结束时间：
- 实际模型、任务、来源、工具、权限、workspace、runner、AGENTS、harness identity/hash：
- activation/discovery evidence（若对应 module 已启用）：
- 未完成、失败、停止原因和仍有效的部分观察：

## Isolation and contamination entry

- matched checks（逐项引用 card identity）：model/settings、task、source、tool/permission、
  workspace、runner/harness、role visibility、fixture/rubric、holdout、output reconstructibility：
- 每项状态：`yes` / `no` / `uncertain`；
- contamination/stale event id、发现者、责任 owner、观察与来源：
- 影响 phase、artifact、比较关系和证据 standing：
- 隔离修复、回退/恢复动作及 rerun id：
- 结论：保留行为观察；matched 归因至少降为 `behavior-observed`，无法判断为 `uncertain`：

## Outcome / process / balancing entry

三类向量分别记录，不用一个分数或“记录更多”替代：

### outcome

- baseline 与 treatment 的 goal/outcome 观察及证据 hash：
- boundary/nearest-owner 观察及证据 hash：
- regression 观察及证据 hash：
- adoption-window/fresh-holdout 观察（若启用）：
- 重大缺陷、硬约束、未知和 reviewer 分歧：
- 基础归因（`format-valid` / `behavior-observed` / `matched-improvement`）：
- qualifier（可并存：`boundary-supported` / `regression-supported` / `combo-only`）：
- 若没有 `matched-improvement`，局部观察的归因上限：

### process

- card、phase、artifact、hash、运行终态可重建性：
- 独立性、隔离、污染识别和 reviewer 分歧：
- 规则遵守、失败处理、stale 传播和恢复血统：

### balancing cost

- 实际时间 / token / 等待 / 协调 / 运行次数：
- 维护与必要外部成本：
- 与 card budget 的关系及是否改变下一行动：

## Independent review entry

- reviewer identity、独立性边界及是否看见 candidate production/调参：
- review artifact/hash、可见来源与 snapshot hash：
- review 判断、覆盖、反例、限制、未知和建议处置：
- review 不能替代 Principal 的最终接受：

## Disposition entry（每个 round 互斥一个）

- disposition：`adopt` / `adapt-and-retest` / `retain-baseline` / `no-proposal` /
  `rollback` / `uncertain`
- 引用的冻结 card、outcome/process/balancing entry：
- 处置理由、接受者决定/身份/时间：
- 基础归因与 qualifiers，以及尚不能提出的主张：
- 后继 round、rerun 或恢复锚点（如适用）：

`no-proposal` 只能表示 treatment 前未提出 candidate；`retain-baseline` 是评估后不采纳；
`rollback` 是已施加改变后的恢复。不得同时写多个 disposition，也不得把它们当 runtime 状态。

## Stale / recovery / rerun entry

- event id / 触发时间 / 发现者 / 责任 owner：
- upstream edge/hash 变化及受影响 card snapshot、artifact、phase、standing、旧结论：
- 保存的历史 artifact/result、baseline 恢复锚点与实际恢复动作：
- 新 round id、新 card snapshot、独立 review owner、fresh holdout 刷新关系：
- rerun id、输入/output hash、污染清除证据与仍未知：
- 旧 entry 保留；本 entry 只建立追加的 stale、recovery 或 rerun 关系：

## 返回与未知

一次 ledger 交付应能重建改动、两次运行、输出和终态 hash、隔离/污染、三类向量、review、基础
归因、qualifiers、互斥处置和下一行动；启用 correction workflow 时还要重建 correction
source、revision、authority、分类、delta、owner、实际 stale/re-evaluation 和 Principal
disposition；启用采用后观察时还要重建 observed/exposed set、escape、recurrence/reopen、
未复查、分子/分母和成本。缺少机制、访问记录、真实 exposure、独立 reviewer、匹配条件或
可重建输出时写明 `unknown` 及其归因上限；不以完成模板、格式通过或 prose 保密替代真实
证据。
