# planning-inbox round 3 fixture / manifest 独立静态 review

## 结论

静态结论：`accept`（作为 old-vs-new 语义比较的预注册输入）。行为结论：`unknown`；本轮
未运行，不能声称 new 保留、改善、matched、adopt 或应 retain。

round-3 的 old/new 对象、唯一 delta、semantic floor、B 负向 probe、major-regression 处置、
old rollback anchor、模型/未知边界和 round2 payload 复用关系整体成立。执行时仍有承重的
`unknown`：served model、runner/harness、fresh-context 隔离、candidate activation、权限和
payload 物理可见边界。它们是行为证据门槛，不是本静态 fixture 的内容 blocking。

## 可见依据与比较边界

本 review 读取并相互核对了 round-3 fixture、round-3 manifest、round-2/round-3 snapshots、
round-2 payload locks、round-2 synthesis 和 protocol；没有运行 old/new，也没有改写 round2
或 round3 文件。比较对象是同一 round2 payload 上加载 old snapshot 与 new snapshot 的两臂，
不是 round2 的 baseline/treatment。fixture 明确要求两臂不读取 review-only 判据
（`evals/skill-evaluation/fixtures/planning-inbox-round-3.md:1-12`），manifest 也没有把本轮
写成 matched trial（`evals/skill-evaluation/manifests/planning-inbox-round-3.md:1-5,59-61`）。

## 唯一 delta 是否准确

逐字 diff old/new snapshot 后，实际变化只有三组，且与 fixture `:32-45`、round2 synthesis
`:71-78` 一致：

1. 在 source 稳定可回指且当前不 clear 时，允许用 ID/path/lineage 回指，减少机械重抄；
2. 只展开会改变 disposition、authority、owner 或下一行动的 explicit/inferred/unknown，
   共享边界说一次并回指；
3. source 未提供正式 owner 时明写 `owner unknown`，工程/实验/研究只作为候选路由或 owner
   类型。

新 snapshot 的对应位置为 `evals/skill-evaluation/snapshots/planning-inbox-round-3.md:72-79`
和 `:125-128`；其余方法、触发、效果、runtime 边界与 old snapshot 保持不变。

有一项需要保留语义说明：new 在 clear 前明确要求把“逐字 raw”与可回读 source 一起写入
history（new `:54-58`），并在回指压缩规则中再次声明 capture/clear 前不能省略逐字 raw
（`:78-79`）。old 的 `可回读 raw/source` 表述较含混，但 round2 synthesis 已把这一点列为
“不回到 baseline 信息损失”的 floor（synthesis `:71-74`），round3 fixture 也明确把它列入
C 的 semantic floor（fixture `:22-24,65-73`）。因此它可接受为既有 floor 的明确化，不应在
结果中被计算成 new 的独立 outcome 收益；若未来把它当作 new 才新增的语义能力，应另开对象
或修订预注册。

没有发现额外目标、owner、runtime 能力、接受权、理论回读或新的行为对象。`owner unknown`
不是授予 owner，而是限制错误的正式 owner 推断。

## Semantic floor 与 major regression

floor 覆盖了短输出最可能丢失的承重关系，并且 fixture 逐项提供回退条件：

| item | floor 保留 | major regression 防线 | 静态判断 |
|---|---|---|---|
| A | 六条 raw 的逐字内容、顺序、批次、可回指 lineage、候选去向/补问/authority 与正式 record/承诺边界 | 丢/改任一 raw、ID 无法回指、候选变成路线/owner/acceptance，或用户无法恢复逐条关系（fixture `:49-56`） | 足够；允许共享边界回指，不允许语义丢失 |
| B | 用户原话、`/inbox`、批次、来源和“先记着不要分析”，停在 capture，不声明 host/写入 | 任一 source 丢失或主动 process/分析（fixture `:58-63`） | 负向 probe 明确且有效，能拦住为短而压缩 capture |
| C | history 先于 pending clear、hold、clear≠complete、重复/中断双存 lineage，以及无 atomic/runtime claim | 省略 append-before-clear、移除 hold、伪造迁移/恢复或丢失 C2 双存事实（fixture `:65-73`） | 足够；清楚把回指压缩限定在不 clear 或 floor 已保留时 |
| D | 普通 future input 不抢主线，authority correction 在下一可保存检查时重读，不能倒写/后台接收 | 抢主线、丢 correction、倒写当前步骤或声称 wake/persist/recover/cancel（fixture `:75-83`） | 足够；共同失败边界可回指但 safe-point/runtime 不能被压缩掉 |
| E | experiment/research candidate 与实际 Run/research record 的 standing 分离，不能生成 effect/conclusion/acceptance | 把“想试 A”写成已运行，把待查写成结论，或混淆 Run/RR evidence 与秘书推断（fixture `:85-92`） | 足够；ID/lineage 回指不会取得 record standing |

floor 还明确规定任一重大回退否决 new，不能由更短、更少 token 或更少术语抵销
（fixture `:14-30`；manifest `:49-58`）。这使 balancing cost 与 semantic correctness 分开，
没有把“压缩成功”偷换成“行为通过”。

## B capture-only 负向 probe

B 是本轮最重要的负向 probe，不允许把一般 process 压缩方法泛化到 capture：fixture 要求
逐字保留用户消息、`/inbox`、批次、来源和暂不展开意图，且任一 source 丢失或主动分析即
major regression（`:58-63`）。new snapshot 的回指规则只在 source 稳定、当前不 clear 时
生效（snapshot3 `:78-79`），而 capture mode 仍明确要求逐字、批次、来源和上下文可重建
（`:38-45`）。因此 B 的负向边界与唯一 delta 相容，不能被一句“共同边界说一次”绕过。

## Old rollback anchor 与处置

manifest 保留 old snapshot path/hash，并明确不改 round2 manifest、运行记录或输出
（`evals/skill-evaluation/manifests/planning-inbox-round-3.md:12-18`）；old hash
`b74c…06f87e` 与 round2 snapshot 当前字节一致，new hash `53c4…5c79e` 与 round3 snapshot
一致。fixture 规定 semantic major regression 时只能保留 old 或回退，不能用 cost 覆盖
（`fixture:106-115`）。

这构成可重建的 artifact rollback anchor，不是 runtime 的自动 rollback 保证；该区分符合
protocol 对旧 card/artifact 不倒写、通过新 round/ledger 追加恢复血统的边界
（`evals/skill-evaluation/protocol.md:39-41,98-103`）。静态上无 blocking；实际施加 rollback
仍属于项目/runtime owner 的另行行动。

## Model、unknown 与 arm contract

manifest 明确目标模型为 `gpt-5.6-luna`，若 served identity 不可核验则写 `unknown`
（`:24-30`）。old/new 各自只加载对应 snapshot，同一 item 使用同一 payload，禁止读 fixture、
manifest、review、theory、research 或另一 snapshot；允许效果限于文字返回
（`:30-37`）。这些 delta 足以定义比较关系，但没有伪造执行保证。

以下仍必须保持 `unknown`，不能从静态文件补填：served model 的精确身份、inference/sampling、
system/developer prompt、harness/runner、权限、workspace、fresh context 实际隔离、snapshot
激活和物理 payload delivery。manifest 已逐项列出这些未知（`:26-37`），fixture 也禁止把
token、等待或协调成本变成阈值（`fixture:106-111`）。protocol 同样要求无法重建匹配条件时
只报告观察并记录 unknown，不作 matched 归因（`protocol:31-37,67-78`）。

## Round2 payload 复用与 hash

round3 没有重新生成或悄悄改变任务/source；fixture 的 payload lock 表逐项复用 round2
payload 与 SHA（`fixture:94-104`），manifest 再次列出 A–E 相同路径与 hash
（`manifest:39-47`）。当前重算结果与 manifest 全部吻合：

- A `d920d43f…d6b863078`
- B `9a60494a…9a16768b4`
- C `f9574a75…ace936f8b`
- D `37ae8a6e…1feaef56e`
- E `13458edd…3a59e497`

fixture/manifest 也保持完整文件字节、UTF-8、LF、无 trim/提取/换行转换/脱敏的算法；因此
复用关系可重建，而不是以内容相似代替 hash identity。round3 manifest 的 fixture、old/new
snapshot、round2 synthesis 和 protocol hash 也分别与当前文件一致（`manifest:9-22`）。

## Blocking / non-blocking

### Blocking（行为阶段）

- 未核验真实 runner 是否只给每臂所选 payload，是否真的隔离另一 snapshot、fixture、review 和
  theory/research；若不能核验，只能 `unknown/uncertain`，不能因本静态 accept 而归因。
- 未核验 served `gpt-5.6-luna`、fresh context、candidate activation、权限和直接退出；这些
  条件不成立或不可重建时，不能写 new 保留/改善或 matched。

### Non-blocking（静态阶段）

- clear 前逐字 raw 的新措辞是 synthesis 已要求的 floor clarification；只需在后续结果中
  不把它计为 new 的额外 outcome。
- old rollback anchor 是 path/hash artifact，已保留且可重建；它不提供自动 rollback，但本轮
  没有声称提供这种 runtime 能力。
- 五项仍是同一 payload 上的 old/new semantic comparison，不是 fresh holdout；fixture 已明确
  这一点（`:1-12`）。

综合而言，没有需要修改 fixture/manifest 才能成立的静态 blocking；round3 可进入独立 old/new
语义 review，但行为 standing 仍只能在真实运行和独立 review 后更新。

## Main disposition

接受本静态 review 的 `accept / behavior unknown` 结论，允许进入冻结 old/new snapshot 的行为
运行。clear 前逐字 raw 只按既有 semantic floor 计算，不作为 new 的新增收益；任一 floor 的
重大回退仍直接否决 new。运行后另做机械身份核验与盲评，本处不预授予 retain 或 rollback。
