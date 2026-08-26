# Protocol projection 独立审查

**审查模型：** gpt-5.6-luna
**审查日期：** 2026-08-24
**审查性质：** 未参与协议修订的静态 reviewer；不运行 trial，不把字段存在当作行为证据。

## 范围与总判定

本审查读取了 `AGENTS.md`、`theory/harness/iterative-improvement.md`、
`theory/harness/theory.md`、`experiments/skill-evaluation/protocol.md`、
`experiments/skill-evaluation/trial-manifest.md`、
`experiments/skill-evaluation/reviews/post-iterative-theory-skill-impact.md` 和
`theory/research/iterative-theory-review-round-2.md`。当前清单为 232 行左右的 exact schema；
评估重点不是字段数量，而是一个具体 trial 是否能在相称成本下真实填写、冻结、隔离并恢复。

**总判定：`adapt-and-retest`。** 当前 projection 的语义方向大体正确，但 exact schema
尚不能静态接受为比例相称、可冻结、可保密和可追加的执行记录。最重要的不是再增加字段，
而是把强制关系缩到对象真正需要的范围，并分离会在不同时间、不同可见性下产生的记录。

这不是对 `iterative-improvement.md` 的否定，也不是对任何 skill 的行为接受。该理论明确说
低风险对象可以裁剪相位并记录较少关系（`iterative-improvement.md:21-25,107-109`）；当前
manifest 的“每项都填、空项写 `unknown`/`N/A`”却把这个条件性裁剪重新变成近乎全量仪式。

## 逐项审查

| 项目 | 静态判断 | 结论与证据 |
|---|---|---|
| 固定轮数是否移除 | **yes** | `protocol.md:55-57,144-147` 明确 round 是血统单位，不是固定轮数，也没有固定 Agent 数、阈值或一致同意门槛。旧审查中关于“连续两轮收敛”的说法已与当前文件不符，不能倒用为现行判断。是否真实执行仍是未知。 |
| card 是否前置且不可倒写 | **语义 yes；schema uncertain** | `protocol.md:41-57` 和 `trial-manifest.md:70-92` 要求 treatment 前冻结并禁止改写。可是 card 只是同一份可编辑 Markdown 中的字段，没有冻结快照 hash、冻结事件的不可变 artifact 或追加式变更记录；“不得倒写”目前是声明，不是记录结构能够检查的事实。 |
| development / confirmation / holdout | **语义 yes；schema uncertain** | `protocol.md:59-76` 区分三者及 regression，manifest 也有四个登记区。问题是 fresh holdout 的 identity、来源 hash 和选择 owner 被放进普通清单（`trial-manifest.md:135-142`），只有一个事后填写的“是否结果前未见”字段，没有 sealed registry、commitment 或可审计的可见性边界。记录“未见”不能证明未泄漏。 |
| ceiling / floor | **yes / uncertain** | `protocol.md:45-50`、`trial-manifest.md:39-52,72-80` 已把 ceiling 定为 baseline 已覆盖的对象级能力，把 floor 定为硬约束和重大退化边界，也支持 baseline 已足够时 `no-proposal`。仍需在每张 card 写成可观察的核心行动和禁行触发；否则两个名词可能只是目标 outcome 与 defect 的重复，行为上不能证明可判定。 |
| discovery / activation / installation | **yes / uncertain** | `protocol.md:78-89` 和 `trial-manifest.md:94-105` 正确分开 discovery/selection、activation/method behavior 与 installation/persistence；后者明确 out-of-scope，不能由加载成功替代。仍缺对 discovery 试题、selector 和 activation 试题之间的严格隔离机制；若 discovery 额外改变可见 prompt 或任务，唯一处理变量就不再清楚。应只在 discovery 是本对象问题时启用该 phase。 |
| combo-only / ablation | **yes / uncertain** | `protocol.md:91-97`、`trial-manifest.md:85-89` 已禁止从不可拆组合归因到单个组件，并要求可行时做局部 ablation。方向正确；但单 skill、低风险或明确不可 ablate 的 trial 仍被要求填写整组组合字段，且“可行”没有相称成本/接受者判定栏，容易以形式完整掩盖未知。 |
| 污染 / stale / 恢复 | **yes / uncertain** | `protocol.md:99-110` 与 `trial-manifest.md:144-171,219-232` 覆盖 matched 条件、污染降级、stale 传播、历史保存、恢复锚点和 rerun。缺口在于 card 与 stale 状态本身没有不可变事件链，且上游血统图是自由文本；因此可读的规则存在，但污染发生后能否重建影响边界和恢复顺序尚未由 schema 保证。 |
| outcome / process / balancing | **yes / uncertain** | `protocol.md:112-128`、`trial-manifest.md:173-204` 将真实行为、可重建/独立/污染等 process 与时间/token/协调等 balancing cost 分开，这是必要的。`format-valid → ... → regression-supported` 的箭头又像单一递进等级；`regression-supported` 与 `matched-improvement` 不是必然的先后级别，最好改成可组合 standing/qualifier，避免把回归证据误当更高的净改善证据。 |
| disposition | **yes** | `protocol.md:130-140`、`trial-manifest.md:206-217` 给出互斥的 `adopt`、`adapt-and-retest`、`retain-baseline`、`no-proposal`、`rollback`、`uncertain`，并区分 treatment 前未提案、评估后保留、已施加改变后的回滚和无法归因。实际接受者是否只写一个值仍须运行检查。 |
| 上游 hash | **yes / uncertain** | manifest:21-37 已包含 P、living theory、research/review、protocol、fixture、rubric、artifact 和血统图，且声明 byte identity 不等于 semantic standing。仍缺明确的 schema/runner artifact 版本，以及可机器检查的边列表；`harness / system / developer`（`:62`）也未明确是否涵盖 `AGENTS.md` 和实际 runner。hash 字段足以成为起点，不能单独证明 stale 传播完整。 |
| 普通 skill 自足 | **静态 yes；行为 uncertain** | `protocol.md:19-29` 明确普通 skill 使用者不回读 P、theory、research 或 protocol，安装/权限/持久效果也不由本实验证明。这保持了 theory 的 owner 边界；但文档声明不能证明每个 skill 的普通激活实际自足，也不能证明没有隐式回读。 |
| 历史不倒写 | **语义 yes；schema uncertain** | `protocol.md:149-151`、`trial-manifest.md:36-37,219-232` 要求旧 artifact/结果保留、追加新 round、不得覆盖或倒写。manifest 虽有 `supersedes` 和 stale 字段，却没有冻结版快照、事件 id/时间的通用追加记录；若同一文件被直接编辑，历史可被形式上破坏。 |

## 重大缺陷

### 1. Exact schema 把 P16 的条件相位重新仪式化

这是当前最主要的比例缺陷。manifest 规定每个 trial 都要登记各 phase，且空字段必须写
`unknown` 或带对象理由的 `N/A`（`trial-manifest.md:6-7,107-110`）；即使是局部、低风险、
可逆的 skill trial，也会被迫填写 discovery、selection、activation、confirmation、
regression、fresh-holdout、adoption-window、污染 ledger、stale/恢复、三个结果向量、
组合/ablation 和 disposition。`N/A` 只是把必填表格改成必填解释，并没有实现“记录较少关系”。

这会产生两个相反风险：低风险对象花费大量 token 生产礼仪性理由；或为了满足模板而给不适用
相位编造看似合理的理由。两者都违背 P05/P06/P11 的具体性、删减和低扰动要求。**最小修复：**
保留一个始终必填的 core card（对象、owner、baseline、delta、目标、floor、最小 boundary/
regression、成本和处置）；把 discovery、confirmation、fresh holdout、adoption-window、
ablation、stale/recovery 变成由 card 的风险/效果边界触发的可选附录。裁剪时只需在 core card
记录一次 phase applicability 与理由，不要求每个附录继续填整套 `N/A`。

### 2. fresh holdout 的未见性与同一清单互相牵制

card 要求 fresh holdout 在结果锁定前未见；但 exact schema 又要求填写 holdout identity、来源
hash、选择责任 owner 和暴露结果（`trial-manifest.md:90-91,135-142`）。如果候选作者、调参者、
runner 和 reviewer 能读取同一清单，holdout 的身份本身就是泄漏面；如果他们不能读取，就必须
有 schema 外的权限/封存机制，而当前 schema 没有记录该机制。`是否结果前未见` 是自报字段，
不是证明。

**最小修复：** 将 holdout 拆到独立 sealed registry；运行前只在主 manifest 留 commitment/
opaque id、选择规则和责任 owner，结果锁定后再追加 reveal、hash、污染和 rerun 关系。低风险
对象若 card 明确 `N/A`，整个 sealed registry 不出现。

### 3. card 冻结和历史追加没有可检查的不可变边界

`protocol.md:55-57` 的冻结语义是正确的，但 manifest 同时承载 treatment 前 card、运行身份、
运行结果和 stale/recovery。没有 `card snapshot artifact/hash`、freeze event、append-only
ledger 或“修改只产生新 round”的机械身份。相同问题出现在 `trial-manifest.md:11-19` 的产物
字段：`protocol.md:33-36` 要求运行前固定 hash，而 baseline/treatment/reviewer 的产物路径和
hash 可能只有运行后才存在；若“产物”指候选输入则命名误导，若指运行输出则 treatment 前
不可填写。

**最小修复：** 分成不可变 pre-run card、运行结果追加记录和 stale/recovery 事件；每一部分有
artifact/hash 与 event id。把候选 artifact hash 与运行输出 hash 分成不同字段，并明确各自
冻结时点。任何 card 规则变更只能通过新 round 引用旧 snapshot。

### 4. evidence standing 的线性写法可能错误升级结论

`protocol.md:122-128` 与 manifest:201-204 把 `regression-supported` 接在
`matched-improvement` 后面，容易被填写者理解为更高等级。可是 outcome 改善、边界支持、回归
保留和污染/归因是不同问题；一个结果可以 regression-supported 而没有 matched improvement，
也可以有 matched improvement 但 regression 未满足。**最小修复：** 保留这些名称，但把 standing
写成互不替代的维度（例如基础观察等级 + `boundary`/`regression`/`combo-only` qualifier），
不要用单一箭头暗示总排序。

## theory 与 protocol 的权威关系

当前没有直接的“第二份 theory”声明冲突：`protocol.md:19-25,149-151` 说自己是
`iterative-improvement.md` 的 workflow projection，exact fields 由 manifest 持有；理论也说
具体字段和存储属于 protocol（`iterative-improvement.md:107-109,122-124`）。在这一层面判定
**static yes**。

但两者仍逐字重复四类 evidence、污染降级、六项 disposition、fresh holdout、成本与停止关系。
这构成维护上的 **uncertain / drift risk**：未来任一文件改名、增删值或改变条件，读者无法只靠
文件位置判断哪一处拥有定义。它不是因为字段多就自动拒绝，而是因为 exact schema 目前把跨载体
语义、执行字段和验收状态都再次规定了一遍。

**最小形式选择：** `retain` theory 中跨载体不可破坏的意义；`retain` protocol 中执行顺序、
字段、状态和失败降级；`prune` manifest 内对这些意义的长篇再定义，改为字段引用和约束；必要
时 `split` 出 schema/reference 与 append-only ledger。不要让 theory 和 protocol 各自成为可
独立修改的值域权威。

## 最小修订组合

1. **retain：** 无固定轮数、treatment 前 card、development/confirmation/regression 的
   区分、discovery/activation/installation 边界、combo-only 禁止单项归因、三向量、六项
   disposition、stale 与历史不倒写的语义。
2. **prune：** 删除 exact schema 中重复的长篇解释和在每个低风险对象上强制出现的空 phase；
   不删除真正改变归因、边界、回退和接受的 core 字段。
3. **split：** pre-run immutable card、运行 outcome/process/cost ledger、sealed holdout registry、
   stale/recovery append log。每个部分只对能看见它的角色开放。
4. **conditional：** discovery、fresh holdout、adoption-window、ablation 与长期观察按 card
   的风险/效果边界启用；N/A 作为一次 phase-level 选择，而不是整张表的逐字段义务。
5. **补足身份：** 加入 schema version、runner/AGENTS 适用身份、card snapshot hash、
   candidate-input 与 run-output 的分离 hash，以及结构化的 upstream edge list。

上述修订不会改变普通 skill 的自足边界，也不应把新的流程文字复制进 skill 载体。

## 接受边界

**当前 projection：`adapt-and-retest`。** 静态文字足以说明方向正确，但比例、holdout 保密、
card 不倒写和字段可填写性仍有重大缺陷；修复 exact schema 后可重新做静态 review。

**不能由本审查证明：** baseline/treatment 真正只有一个变量、card 在结果前确实冻结、reviewer
确实独立、fresh holdout 未泄漏、污染被发现并正确降级、stale 传播覆盖全部下游、ablation 实际
完成、候选产生 matched improvement、存在净改善、已经收敛、可以 adopt、或安装/权限/持久化
和任何 runtime 效果成立。`git diff --check` 只能证明本报告的机械格式，不改变这些 standing。
