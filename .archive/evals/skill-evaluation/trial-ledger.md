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

## Round 3 append: practice-cycle

### Freeze / run entries

- entry id：`ledger-method-probe-round-3-practice-cycle-freeze`
- trial / round：`method-probe-round-3-practice-cycle` / `round-3`
- event：`freeze`
- card snapshot：`evals/skill-evaluation/manifests/practice-cycle-round-3.md`，raw-file SHA-256
  `2df7340f84fbc8931230e5e0c482f6da00502ed8b95bb17156ec4d2e52f95479`
- freeze receipt：`evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-freeze.md`
- candidate SHA-256：`0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf`
- task SHA-256：`39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c`
- previous entry hash / append mechanism：`unknown` / `unknown`

- entry id：`ledger-method-probe-round-3-practice-cycle-baseline`
- event：`run-output`
- role / runner：`baseline` / `01a0385a-9174-7132-aa78-f5d76f377d06`
- output artifact：`evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-baseline.md`
- output SHA-256：`11ba07b36f374bdfb14de418b09b25774ca362635f4fe4aaf6feeb7fcd42bd8b`
- observed terminal state：structured return captured; no file/network effect claimed
- model/harness/workspace/activation proof：`unknown`

- entry id：`ledger-method-probe-round-3-practice-cycle-treatment`
- event：`run-output`
- role / runner：`treatment` / `01a0385a-9243-7791-8928-fe8fc8779a11`
- output artifact：`evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-treatment.md`
- output SHA-256：`63bc414892e13d6453d4a658c24969583a2b24e1d05e4b188e54a396a271da81`
- observed terminal state：structured return captured; candidate activation is self-report only; no file/network effect claimed
- model/harness/workspace/activation proof：`unknown`

### Isolation and outcome

- entry id：`ledger-method-probe-round-3-practice-cycle-isolation`
- event：`isolation`
- identity note：`evals/skill-evaluation/runs/method-probe-round-3/run-identity.md`
- task/source hash match：`yes` as recorded in both run artifacts
- model/settings：`uncertain`
- runner/harness/workspace：`no` for same-runner equivalence / `uncertain` for exact runtime identity
- role visibility and candidate loading：`uncertain`; baseline/treatment instructions and treatment self-report exist
- output reconstructibility：`yes` for copied artifacts; process/runtime reconstructibility `unknown`
- contamination/stale event：none observed in returned text; process-level isolation `unknown`
- evidence consequence：base attribution capped at `behavior-observed`; no matched claim

- entry id：`ledger-method-probe-round-3-practice-cycle-outcome`
- event：`outcome`
- Case A：both direct to existing owner and reject extra practice/discovery/large plan
- Case B baseline：narrow owner/authority discovery, `route`
- Case B treatment：broader discovery/owner branch, `continue`
- boundary/regression：both preserve unknown owner/shape/acceptance and reject schema implementation, registry,
  WorkCell implementation, host Run and acceptance claims
- structural defect：`excluded_actions` and top-level unknown field shapes differ between outputs
- basis：`behavior-observed`; attribution `uncertain`; no `matched-improvement` or `regression-supported`

### Independent review and disposition

- entry id：`ledger-method-probe-round-3-practice-cycle-review`
- event：`independent-review`
- reviewer：Parfit / `01a0385c-12bc-7523-9abf-4eb2b6d9e160`
- review artifact：`evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md`
- review artifact raw-file SHA-256：`8e4a89ffaef5f532b1a6e8557259a7d8669b561cfb93d4a5b1c95e1093080088`
- review result：Case A passes boundary; Case B treatment direction is useful but too broad; output schema,
  runner identity and activation proof are insufficient
- review standing：independent review complete; not Principal acceptance

- entry id：`ledger-method-probe-round-3-practice-cycle-disposition`
- event：`disposition`
- disposition：`adapt-and-retest`
- reason：actual Case B action/disposition difference is worth a narrower retest, but matching and activation
  evidence are insufficient and treatment is not minimal enough
- cannot claim：adopt, matched-improvement, regression-supported, portable promotion, acceptance or runtime guarantee
- next action：new round with same verifiable runner/model/harness/workspace if possible, real activation proof,
  identical structured output schema and a narrow Case B owner/authority route; if identity remains unknown,
  preserve `behavior-observed / attribution-uncertain`

## Round 1 historical record and source-drift closure: mechanism-design-review

本节是对已有 frozen round 的 post-freeze evidence closure；不创建新 Run，不编辑 card、candidate、task、
raw output 或既有 review。`previous entry hash` 与真实 append mechanism 当前均不可核验，保留为 `unknown`。

### Applicability / source edge entry

- entry id：`ledger-mechanism-design-review-round-1-applicability`
- trial / round：`mechanism-design-review` / `round-1`
- event：`applicability-review`
- UTC time / appender：`unknown` / `Main`
- entry record hash：`unknown`
- card snapshot：`evals/skill-evaluation/manifests/mechanism-design-review-round-1.md`；SHA-256
  `9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- candidate input：`.agents/skills/mechanism-design-review/SKILL.md`；SHA-256
  `8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`
- task：`evals/skill-evaluation/inputs/mechanism-design-review-round-1/task.md`；SHA-256
  `5c9e6dd9eba43271d2c4b3e7eec179d6c90eb2b8cfda15a1fbd095845890a743`
- planning record/review projection：`planning/records/mechanism-design-review-round-1.md`；SHA-256
  `6b0d758118b9d2460c73b4f40be471e4bca790b4e2908bd4fd3c6c60f38bacd4`
- previous entry hash / append mechanism：`unknown` / `unknown`
- applicability standing：card, task, candidate and output file/hash edges are reconstructible; three upstream
  WorkCell source edges are `stale/uncertain`; acceptance, runtime identity and causal isolation remain unknown

### Run output entries

- entry id：`ledger-mechanism-design-review-round-1-baseline`
- event：`run-output`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`

- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- run id / phase：`mechanism-design-review-round-1-baseline` / `confirmation-disabled`
- role / runner：`baseline` / `Pasteur` (internal runner identity beyond label `unknown`)
- candidate input hash：`8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`
- run configuration hash / terminal-state-log hash：`unknown` / `unknown`
- output artifact：`evals/skill-evaluation/runs/mechanism-design-review-round-1/baseline.md`
- output SHA-256：`404d5fe474c59812fe1c83fac9245f108017c7e130148bcb2c01a5412fbc7604`
- observed terminal state：three case recommendations returned; no workspace/network effect claimed
- actual model/task/source/tool/permission/workspace/runner/AGENTS/harness identity：task/card source refs;
  full runtime identity `unknown`; baseline non-activation proof `unknown`

- entry id：`ledger-mechanism-design-review-round-1-treatment`
- event：`run-output`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- run id / phase：`mechanism-design-review-round-1-treatment` / `confirmation-disabled`
- role / runner：`treatment` / `Kant` (internal runner identity beyond label `unknown`)
- candidate input hash：`8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`
- run configuration hash / terminal-state-log hash：`unknown` / `unknown`
- output artifact：`evals/skill-evaluation/runs/mechanism-design-review-round-1/treatment.md`
- output SHA-256：`06bb51a936c7a8d47bdc6f17f0bd9f9c8381c479b19f339c173d5e73518c8f5b`
- observed terminal state：three case recommendations returned; candidate activation is not independently
  proven; no workspace/network effect claimed
- actual model/task/source/tool/permission/workspace/runner/AGENTS/harness identity：task/card source refs;
  full runtime identity `unknown`; treatment activation proof `unknown`

### Isolation / outcome / process entries

- entry id：`ledger-mechanism-design-review-round-1-isolation`
- event：`isolation`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- matched checks：task and candidate hashes match the frozen card; three upstream source hashes drifted;
  model/settings, full runner/
  harness/workspace identity and activation/non-activation proof are `uncertain`; baseline/treatment runner
  labels differ; discovery, fresh holdout, adoption-window and ablation were disabled
- contamination/stale event：no contamination observed in returned artifacts; source drift is recorded below;
  process-level isolation and immutable storage are `unknown`
- evidence consequence：base standing capped at `behavior-observed`; no matched claim

- entry id：`ledger-mechanism-design-review-round-1-outcome`
- event：`outcome`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- case observation：M1 and M2 recommendations agree at the core level; M3 routes rather than inventing a
  mechanism; treatment expression adds owner/unknown/stop-boundary detail in places
- boundary/nearest-owner：M2 preserves observation-only/no-new-bus-store-registry; M3 routes carrier choice
  to `form-selection`/`skill-formation`; no runtime or acceptance authority was produced
- regression/adoption/fresh-holdout：`unknown` / not enabled
- basis：`behavior-observed`; qualifiers `boundary-supported`; attribution `unknown`; no
  `matched-improvement` or `regression-supported`

- entry id：`ledger-mechanism-design-review-round-1-process`
- event：`process`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- card/phase/artifact/hash reconstructibility：file/hash level `yes`; internal runtime identity and
  append-only mechanism `unknown`
- independent review：recorded in `planning/records/mechanism-design-review-round-1.md`; reviewer Jason did not
  produce the two runs; Principal acceptance not present
- balancing cost：only existing read-only Agent runs and planning review are observed; exact time/token/wait/
  coordination cost `unknown`

### Independent review entry

- entry id：`ledger-mechanism-design-review-round-1-review`
- event：`independent-review`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- reviewer identity / independence：`Jason` / reviewer did not produce baseline/treatment; review was
  recorded in the round planning record
- review artifact/hash：`planning/records/mechanism-design-review-round-1.md` /
  `6b0d758118b9d2460c73b4f40be471e4bca790b4e2908bd4fd3c6c60f38bacd4`
- review result：core recommendations, M2/M3 boundary and unknown/implementation boundary retained;
  runner, activation, source drift, acceptance and adoption limitations retained; not Principal acceptance
- review limitation：the planning record is the available review artifact; a separate eval review artifact is
  `unknown`

- entry id：`ledger-mechanism-design-review-round-1-closure-review`
- event：`independent-review`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- reviewer identity / independence：`Lagrange` / did not produce the round or closure records
- review artifact/hash：`planning/records/evidence-applicability-review-mechanism-design-round-1.md` /
  `e3995869a089b4a6c9981bd49f101f4cc35e4cb2f1c33dcd6034d3083459c9ff`
- review result：accepted after revision; source drift, ledger envelope, full identity/activation/owner
  unknowns and historical-only standing are accurately preserved; not Principal acceptance

### Disposition projection entry

- entry id：`ledger-mechanism-design-review-round-1-disposition`
- event：`disposition`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- card snapshot hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- disposition：`adapt-and-retest` (existing round disposition, copied into ledger closure; not a new
  evaluation decision)
- cites：outcome `ledger-mechanism-design-review-round-1-outcome`; process
  `ledger-mechanism-design-review-round-1-process`; balancing cost recorded in process; review
  `ledger-mechanism-design-review-round-1-review`
- carrier disposition：`rewrite + retain-incubation`
- reason：core and boundary observations are retained, but runner/activation/acceptance evidence is
  insufficient for adoption or matched attribution
- cannot claim：`adopt`, `matched-improvement`, `regression-supported`, portable promotion, acceptance,
  WorkCell protocol acceptance, runtime mechanism or implementation authorization
- next action：recover the drifted source snapshot; obtain a named replay/consumer owner, owner-backed
  normal/duplicate/out-of-order/gap/post-restart fixture, reproducible full model/runner/harness/workspace
  identity, activation/non-activation proof, protocol/record-retention owner, acceptance owner and source/task
  identity; then freeze a separate future round; no rerun merely to fill the ledger

### Stale / recovery entry

- event id：`stale-mechanism-design-review-round-1-upstream-source-drift-20260825`
- event：`stale/recovery`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash：`unknown` / `unknown`
- upstream drift and impact:
  - `design/work-cell-protocol.md`: frozen `25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272` → current `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`
  - `planning/records/workcell-lifecycle-review.md`: frozen `841787451b4c238c357dd1a65aaa2155469c8e44f7ad74ad97aa06093cbff2c5` → current `defd78ec0f8bdaca9a9bad1f8dda96fe33af22a9d01d9f675e91927716ea0c90`
  - `planning/records/workcell-observation-lineage-review.md`: frozen `7b1e9ba2647d0ef9621149dbe51dc534a5edc607898ed62329cc1dd47541dd00` → current `4b7001ce08a3a0e7ae75237e2477e12d844c07baedd04c25f0bd0d3e9181f711`
- unaffected edges：open-relations review and harness theory hashes match frozen card; card/task/candidate/output
  hashes remain reconstructible
- saved artifacts / recovery action：old card, outputs and planning review retained; no rewrite or rerun;
  current applicability marked `stale/uncertain`; recovered source snapshot and new card are required
  before a future round
- owner / rerun id：protocol/record-retention/eval/acceptance owners `unknown`; rerun id `unknown`

## Round 3 post-freeze source-edge applicability record: practice-cycle

- entry id：`ledger-method-probe-round-3-practice-cycle-applicability`
- event：`applicability-check`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash / append mechanism：`unknown` / `unknown` / `unknown`
- card snapshot：`evals/skill-evaluation/manifests/practice-cycle-round-3.md`；current raw SHA-256
  `2df7340f84fbc8931230e5e0c482f6da00502ed8b95bb17156ec4d2e52f95479`，与 freeze record 一致
- candidate edge：`.agents/skills/practice-cycle/SKILL.md`；current raw SHA-256
  `0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf`，与 card 一致
- task edge：`evals/skill-evaluation/inputs/method-probe-round-3/practice-cycle-task.md`；current raw
  SHA-256 `39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c`，与 card/ledger 一致
- AGENTS edge：current raw SHA-256 `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`，
  与 card 一致
- output/review edges：baseline `11ba07b36f374bdfb14de418b09b25774ca362635f4fe4aaf6feeb7fcd42bd8b`、
  treatment `63bc414892e13d6453d4a658c24969583a2b24e1d05e4b188e54a396a271da81`、review
  `8e4a89ffaef5f532b1a6e8557259a7d8669b561cfb93d4a5b1c95e1093080088` 均与当前文件一致
- run identity：artifact present；两 runner identity distinct，exact model/harness/workspace/activation
  identity `unknown`
- observation：source/card/task/output/review edges are reconstructible at file-hash level；runtime
  applicability remains uncertain；schema mismatch、self-reported activation、no adoption/fresh holdout
  和 acceptance owner unknown 保留
- standing：`source-edge-match-observed / runtime-applicability-uncertain / behavior-observed /
  attribution-uncertain / acceptance-pending`
- disposition：existing round `adapt-and-retest`；carrier `retain-incubation`；not
  `matched-improvement`、`adopt`、`regression-supported` 或 portable promotion
- action：no rerun；recover named eval/runner owner、full identity、activation/non-activation proof、统一
  schema、新 narrower card 与 independent review 后再开 separate round；否则只关闭 matched-probe branch
  为 `no-proposal-now`，保留历史 observation 和 candidate

## Round 3 post-freeze source/applicability record: planning-inbox old-vs-new

- entry id：`ledger-planning-inbox-round-3-applicability`
- trial / round：`planning-inbox-round-3` / `round-3`
- event：`applicability-check`
- UTC time / appender：`unknown` / `Main`
- entry record hash / previous entry hash / append mechanism：`unknown` / `unknown` / `unknown`
- manifest：`evals/skill-evaluation/manifests/planning-inbox-round-3.md`；current raw SHA-256
  `369bc1cfa0095dc33a22b229191be059b25907e2f0b025a6beae71a3c1edbefb`；manifest status remains
  `frozen / not run`, while formal run artifacts and reviews exist under the linked round path
- candidate/new snapshot edge：`.agents/skills/planning-inbox/SKILL.md` and
  `evals/skill-evaluation/snapshots/planning-inbox-round-3.md` both current SHA-256
  `53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e`; edge matches
- old snapshot / rollback edge：`evals/skill-evaluation/snapshots/planning-inbox-round-2.md` current SHA-256
  `b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`; edge matches
- fixture/protocol edges：round-3 fixture `fb835264a699e36bee068407959b52ba415cda3fffd55c37f76a4cbe8bd57676`；
  protocol `2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e`；both current hashes match
- input/output/run artifact edges：the ten input hashes, ten formal output hashes, ten JSONL/stderr hashes
  and failed-sandbox separation all match `runs/planning-inbox-round-3/run-identity.md`; run identity current
  SHA-256 `dbf3626de6de111990a1fc97adb74cd83f9a82b24291d0eef9c15b95d2248816`
- review edges：blind review A–C `efbe6f943d834e23802bf9773285d2e271b244bf630be7605afcd418541baa35`、D–E
  `921cdaa72dc3a370c51919755067c88965a53f22f909981580cbb3cfb363480d`、mapping
  `8bd80cad7af27364ce292920c4c0a4890d90ebb1544243700e5758dc2d82510e` and synthesis
  `28b1429e58c4933e0d9082f6e166e0fe0de5488e8ae44e5f5e059597750ca3e4` are present; current review chain is
  hash-reconstructible
- current project source edge：`planning/inbox.md` current SHA-256
  `a599540fb483d76d6b5f5abe4772cc0f64fec40b9fc526ec04f5126db8b43545` and `planning/inbox-history.md`
  current SHA-256 `fb9265fd9301ac3e363d98840265463d963508ee9ec5c30d711f4f1e727ffa4d` were not frozen/recorded
  as round-3 source edges; current-source applicability remains `uncertain`
- runtime identity/activation：served model, full system/developer prompt, harness, permissions, candidate
  activation, fresh context, physical isolation and direct exit remain `unknown`; non-empty outputs and
  `turn.completed` establish artifacts/events, not complete runtime identity
- observation：old/new both preserve semantic floor; A slightly favors old, D slightly favors new, B/C/E tie;
  failed sandbox attempts are excluded; this remains an old-vs-new observation, not baseline/treatment proof
- standing：`source-edge-match-observed / runtime-applicability-uncertain / current-source-applicability-uncertain /
  behavior-observed / boundary-supported / attribution-uncertain / acceptance-pending`
- disposition relation：existing round has project-local disposition `retain-as-project-local-incubating-candidate /
  adapt-and-observe`; applicability remains uncertain. This is not a protocol round disposition and is not
  `matched-improvement`、`adopt`、`regression-supported` or portable promotion
- action：no rerun and no artifact edit；planning-inbox remains `.agents/skills/` incubation. Reopen only with
  named eval/runner owner, reproducible identity, activation/visibility proof, explicit current inbox source
  snapshot, superseding card and independent review; otherwise retain historical source-edge observation and
  current-source uncertainty

### Independent review entry

- entry id：`ledger-planning-inbox-round-3-applicability-review`
- event：`independent-review`
- reviewer identity / independence：`Hubble` / `01a03875-9202-7892-8413-2c6b693b23d3`；未参与本 applicability
  record 或同步 projection 的生产
- review artifact/hash：`planning/records/evidence-applicability-review-planning-inbox-round-3.md` /
  `84d5b5fcf507d989f40d14696847da633ed2d6f6c76c09564509974dd54e1b95`
- review result：`final accept` after adding the two blind-review hashes and normalizing the qualifier to
  canonical `boundary-supported`; project-local retain/adapt-and-observe is explicitly not a protocol round
  disposition
- review limitation：current runtime/source applicability remains uncertain; review does not accept the skill,
  portable move, phase transition, runtime, adoption, regression or implementation
- entry record hash / previous entry hash：`unknown` / `unknown`

## WorkCell design source applicability reconciliation

- entry id：`ledger-workcell-design-source-applicability-20260825`
- event：`applicability-check`
- appender：`Main`
- artifact：`planning/records/evidence-applicability-review-workcell-design.md`
- artifact SHA-256：`7b1dafce4b6ba12ff355daa4a5d945cc9ed0d57b72aa861d819d5f331c46fe66`
- current canonical source：`design/work-cell-protocol.md`
- current source SHA-256：`26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`
- source-edge observation：A/B lifecycle 与 C/D observation/lineage 的 frozen source edges drift；
  open-relations 的 inherited frozen/current edge 同值 `390757...7bcc`；RunRecord binding identity 与
  contract-field review 的 protocol edge match current source
- standing：`source-edge-reconciled / historical-review-drift-observed / acceptance-pending`
- disposition：`retain-design-observation / no-rerun-now / recover-before-current-claim`
- independent review：`Hubble` / `01a03875-9202-7892-8413-2c6b693b23d3` / `final accept`；初轮两处文字
  修订后复核；未参与本记录生产，未取得 protocol、phase、runtime 或 implementation acceptance
- limitation：hash drift 不证明语义变化，hash match 不证明 semantic review/protocol acceptance；旧
  source snapshot、named protocol/record-retention/replay consumer 和 acceptance owner 仍 unknown
- action：保留旧 review 与当前 source，不倒写、不重跑、不创建 synthetic Run、event bus、lineage registry、
  retention service 或实现；由 recovered snapshot、named owner/consumer 或 current-source review card
  出现时分别 reopen
- entry record hash / previous entry hash：`unknown` / `unknown`

## Round 2 living skills family applicability reconciliation

- entry id：`ledger-living-skills-round-2-family-applicability-20260825`
- event：`applicability-check`
- appender：`Main`
- applicability artifact：`planning/records/evidence-applicability-review-living-skills-round-2.md`
- artifact SHA-256：`28588d8985f8db72eb3f55399a39bdd1312515a96ba6ca17edd8e72217689f2e`
- source/protocol：`evals/skill-evaluation/protocol.md`；fixture `evals/skill-evaluation/fixtures/round-2.md`
  SHA-256 `e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`
- object set：round-2 manifests for `agent-delegation`、`agent-expression`、`concept-articulation`、
  `dual-audience-expression`、`form-selection`、`human-writing`、`skill-formation`；对应 run/review 文件
  当前存在，但 manifest execution/output 仍为 `unknown / not run`，七个 round 没有此前可回读的 ledger
  lineage entry
- source edge observation：每个 manifest 中记录的 candidate SHA-256 与当前对应
  `.agents/skills/*/SKILL.md` 不同；完整 manifest file hash、manifest-declared candidate hash、current
  candidate hash、run/review hash 和不成对 artifact 记录在 applicability artifact 中；不是 runtime
  activation 或 card/run identity 证明
- review/standing：对应 reviews 共同把 matched comparison 判为未成立；历史产物最多支持
  `behavior-observed`，current applicability 为 `uncertain`；不能提出 `matched-improvement`、portable
  promotion、regression 或 acceptance
- disposition：`uncertain / historical-only / hold`；carrier 继续 `.agents/skills/` incubation；不编辑
  manifest、Run、review、fixture 或 candidate，不创建 synthetic Run，不重跑，不移动到 `skills/`
- independent review：`Hubble` / `01a03875-9202-7892-8413-2c6b693b23d3`；两轮后 `final accept`；接受
  applicability bookkeeping，不取得 skill、portable、protocol、evidence 或 implementation acceptance
- action：只有 named eval/runner owner、明确 card/run/review lineage、当前 candidate hash、完整 model/
  harness/tool/permission/workspace/activation identity、reviewer 独立性和 acceptance owner 恢复后才开
  新 current round；否则保留历史 observation，并将当前迁移分支标为 `no-proposal-now`
- entry record hash / previous entry hash / append mechanism：`unknown` / `unknown` / append-only ledger

## Planning-inbox round 2 applicability reconciliation

- entry id：`ledger-planning-inbox-round-2-applicability-20260825`
- event：`applicability-check`
- appender：`Main`
- applicability artifact：`planning/records/evidence-applicability-review-planning-inbox-round-2.md`
- artifact SHA-256：`1e54dbff6e5d234c020d6180f57627beafd46cd758be4c7c49b2647aad89139f`
- manifest/fixture/protocol：manifest `0b5d9d0c753af251de2dca47c854f6f3a2d930dae213977055846fa1433d46b2`；fixture
  `fd4311fdc7bc72418ca20de919684d495ab5341c142ca992c9581698c531eeae`；protocol
  `2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e`
- object set：planning-inbox round-2 的五项 payload、baseline/treatment、run identity、A–C/D–E blind review、
  mapping/synthesis 和 fixture static review；manifest 的 `frozen / not run` 保持为预运行登记，旧 artifact
  仍可回读
- artifact/source edge：run identity `6ba63ba39a1c033fd46b076d9ad3334263525b8eb39e3bf849bd5a13ed25dfc9`；
  candidate snapshot recorded `b74cddb8...` 与 current `53c4ad...` 不同；inbox/history/AGENTS digest drift
  记录在 applicability artifact 中；这些是 provenance observations，不是 semantic change proof
- standing：artifact chain `reconstructible-at-file-and-event-level`；runtime/current-source applicability
  `uncertain`；历史最高 `behavior-observed / boundary-supported / attribution-uncertain`；round disposition
  `adapt-and-retest`，不支持 current matched、portable、regression 或 acceptance
- disposition：`historical-chain-observed / source-applicability-uncertain / runtime-applicability-uncertain /
  acceptance-pending`；planning-inbox carrier `retain-incubation`；仅当前 applicability/re-run proposal 为
  `no-proposal-now`；不编辑旧 artifact、不创建 Run、不重跑、不移动到 `skills/`
- independent review：`Plato` / `01a0387b-f544-7aa1-ab7e-bbc7a3290609`；两轮后 `final accept`；不取得 skill、
  portable、WorkCell、DeepSeek 或 implementation acceptance
- action：只有 named eval/runner owner、current source/candidate snapshot、完整 runtime identity/activation、
  fresh/superseding card、独立 reviewer 和 dogfood exposure/acceptance owner 恢复后才开新 round；否则保留历史
  observation 与 incubation placement
- entry record hash / previous entry hash / append mechanism：`unknown` / `unknown` / append-only ledger

## WorkCell executor wording source revision applicability reconciliation

- entry id：`ledger-workcell-executor-wording-revision-applicability-20260825`
- event：`source-revision-applicability-check`
- UTC time / appender / append mechanism：`unknown` / `Main` / `unknown`
- artifact：`planning/records/evidence-applicability-review-workcell-design-revision-2.md`
- artifact SHA-256：`30ed77edd1fa167d18f52062cf74d3f91baff7ee66a8efb4c1851714789447b5`
- current canonical source：`design/work-cell-protocol.md`
- current source SHA-256：`cfe203ba71a3ef1121af7fb2979188da425c609fd48aff632be6d30f20a3a5e3`
- source revision：仅澄清完整 `WorkCellBinding` 的 executor identity 与非 executor comparison constraints；
  未新增 field、mechanism、lifecycle、permission 或 implementation
- source-edge observation：A/B/C/D、RunRecord identity、contract-field review 均保留 pre-revision edge；
  executor candidate 已回写为 wording-only source revision；open-relations 仍是 planning projection
- standing：`source-revision-observed / current-applicability-reconciled / independent-review-complete /
  acceptance-pending`
- disposition：`retain-old-reviews / reconcile-current-source / no-rerun-now`
- independent review：`Dewey` / `01a0394d-c4ad-7e10-a91d-68a232d7ba24` / `ACCEPT`；仅接受 source/
  revision applicability 和 boundary projection，不接受 protocol、eval、provider、runtime 或 implementation
- limitation：canonical equality、digest/canonicalization、named eval consumer/owner、matched Run、
  provider effect attribution 和 WorkCell acceptance 仍 unknown
- action：不编辑旧 review、不重跑、不创建 synthetic Run、registry、event bus、adapter 或 runtime；
  由 named owner/consumer 或新的 source change 触发下一 bounded review
- entry record hash / previous entry hash：`unknown` / `unknown`

## Correction entry: superseded WorkCell source applicability projection

- entry id：`stale-ledger-workcell-design-source-applicability-pre-revision-20260825`
- event：`stale/recovery`
- UTC time / appender / append mechanism：`unknown` / `Main` / `unknown`
- supersedes：`ledger-workcell-design-source-applicability-20260825`
- correction：原 entry 的 `26ec714f…` 是 executor wording revision 前的 current source；其
  `RunRecord binding identity` 与 `contract-field` match 不能继承到当前 source。当前 source 为
  `cfe203ba…`，current applicability 由
  `ledger-workcell-executor-wording-revision-applicability-20260825` 另行记录。
- preserved history：不编辑、不删除原 entry、artifact 或旧 review；原 entry 只保留为 revision 前
  applicability evidence
- standing：`pre-revision-record / superseded-current-edge / current-source-reconciled / acceptance-pending`
- action：不重跑、不创建 synthetic Run；named owner/consumer 或 source change 出现时再开新的
  bounded review
- entry record hash / previous entry hash：`unknown` / `unknown`
