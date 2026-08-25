# planning-inbox round 1 fixture / manifest 独立静态 review

## 结论

静态结论：`revise`。行为结论：`unknown`；本轮未运行，不能给出
`behavior-observed`、`matched-improvement` 或 skill 采用结论。

四项的对象边界基本可分，A 也确实使用当前 inbox 的六条 raw 做 dogfood；但当前
runner-visible task 已经把候选 skill 的主要方法和正例答案交给 baseline。即使 review-only
区块确实未泄漏，baseline 也能凭 task 完成大部分 rubric，因此不能把当前输入视为有足够
headroom 的 baseline/treatment 对照。

## Blocking

### B1：task 把候选方法写成了 baseline 可见的指令

manifest 明确规定 baseline 与 treatment 都接收同一逐字 task/source，只有 treatment 额外加载
候选 skill（`evals/skill-evaluation/manifests/planning-inbox-round-1.md:26-28`）。因此以下不是
只给 reviewer 的验收标准，而是 baseline 的提示：

- A task 直接要求 `disposition`、`handoff`、`explicit/inferred/unknown`、owner、接受和复查，
  并列出不得生成的 Plan/goal/Todo/research/experiment/acceptance
  （`evals/skill-evaluation/fixtures/planning-inbox-round-1.md:19-23`）。这已经规定了秘书
  解释的字段、standing 边界和主要负例。
- B task 直接规定 capture-only、逐字回放字段、未分析/未分类/未排序/未承诺/未 handoff/未
  执行，以及 `/inbox` 不是 host command（同文件 `:73-76`）。这不是单纯的用户目的，而是
  候选 skill 要带来的 capture/process 与文本 trigger/runtime 区分。
- C task 直接给出 append-first、pending hold、clear 与 complete 的区分、重复/中断处理，
  以及不得宣称 atomic/exactly-once/recovery/claim/handoff（同文件 `:105-109`）。
- D task 直接给出 non-safe-point、safe point 重读 goal/card/acceptance、主线不被抢占、不可
  声称 runtime 接收/持久化/恢复（同文件 `:143-146`）。

这会使 baseline 不加载 skill 也能复述候选的关键答案，显著压低 headroom，且不再能把
treatment 的差异归因于候选载体。最小修法是开新 round，保留每项用户目的、事实包和允许
效果，但把上述方法词、预期字段、正确事件顺序和负例从 runner task 移到 review-only
rubric。例如 task 只要求“根据事实包返回可审查的处理结果、依据、未决关系和下一步需要
谁决定；只返回文字，不修改文件或产生外部效果”，具体的 raw/interpretation、clear/
complete、safe point/runtime 边界留给候选与 reviewer 判定。修改后必须重算 fixture 与各
item task hash；不能回写本冻结 round（协议要求变更开新 round，见
`evals/skill-evaluation/protocol.md:39-41`）。

### B2：review-only 区块只有 marker/prose，隔离没有可核验的封存机制

fixture 自己承认评审区块隔离尚未运行核验（`evals/skill-evaluation/fixtures/planning-inbox-round-1.md:7-12`），
manifest 也只记录 marker 区分、没有 sealed/opaque 机制（同 manifest `:26-30`）。然而这些
区块包含 A–D 的正例、边界和重大缺陷（fixture `:56-66`, `:88-98`, `:125-136`, `:165-179`）。
如果 runner 只是把整份 Markdown 传给模型，baseline/treatment 都会获得 rubric；如果仅凭
marker 文字断言未泄漏，则是伪保密。

最小修法是让 runner 使用可审计的 opaque extraction/sealed registry，仅将 task/source
payload 传入上下文，并在冻结 card 中记录提取规则、输入快照和隔离检查结果；没有这种真实
机制时，结果只能保持 `unknown/uncertain`，不能升级为 matched。现有 protocol 对 fresh
holdout 也要求真实 opaque commitment，不能以 prose 代替（`evals/skill-evaluation/protocol.md:50-53`）。

### B3：D 的 source 仍以目标语义标签提示答案

即使删除 D task 的方法指令，D source 仍把事实标成“不可安全插入”“safe point”“Principal
correction”，并预先说明“接受边界”与没有 runtime 证据
（`evals/skill-evaluation/fixtures/planning-inbox-round-1.md:152-162`）。其中当前 goal、
用户原话和权限事实是必要 source；但这些标签本身正是要观察 Agent 是否能区分的概念，减少
了 source-neutral 的比较空间。

最小修法是保留原始用户话语、当前任务状态和 authority 事实，把“Principal correction”/
“non-safe-point”这类评审命名移到 review-only；用中性状态描述代替方法标签。若项目决定
这些标签就是 source-native 原话，必须在 card 中明确它们是给两组都可见的事实并相应下调
该 item 的 headroom，不应再把它当作无提示的发现。

## Non-blocking / 可保留处

### 四项确实覆盖不同最近邻

| item | 主要观察对象 | 与其他项的可分性 | 静态判断 |
|---|---|---|---|
| A | 六条真实 pending raw 的 secretary process / dogfood | 解释与候选去向，区别于 B 的 capture-only | 保留；是真实 inbox dogfood，但不是独立 holdout，也不证明泛化 |
| B | 明确“先记着不要分析”的 capture 停点 | capture 与 process、文本 trigger 与 host capability | 保留；source 足够，主要问题是 task 泄漏 |
| C | history receipt、重复、append/clear 顺序和中断状态 | migration/history lifecycle，区别于 A/B 的 capture/process | 保留；source 给出了模拟中断状态，不等于把规则写成正例；task 仍需去提示 |
| D | active goal 中普通未来输入与改变 safety/acceptance 的 correction | safe-point、authority 和主线插入，区别于 C 的 history migration | 保留；需要按 B3 中性化 source 标签 |

A/B 的相邻性是有意的：一个测“处理”，一个测“只捕获”；C 测可见历史与清空关系；D
测 active goal 插入与 authority correction。当前没有证据要求删项或合并项，四项也不应汇总
成总分（fixture `:181-192`；manifest `:86-90`）。

### source 的充分性与不应扩大之处

- A source 是当前 `planning/inbox.md` 六条 raw 的逐字复制，保留批次和顺序，足以做 dogfood；
  manifest 也明确其来源关系（`evals/skill-evaluation/manifests/planning-inbox-round-1.md:38-40`）。
  但因为候选设计已见过这批 raw，A 只能是生态真实性/流程观察，不能冒充 fresh holdout。
- B source 仅含当前用户输入及其明确“先记着不要分析”，足以观察停点；不应再在 task 中告诉
  runner 要输出哪些边界。
- C source 给出三条 pending、history 无 receipt，以及 P-C2 已 append 后 clear 前中断，足以
  观察事实状态；它没有提供真实 atomic/recovery 能力，manifest 正确将这类能力留为 unknown。
- D source 给出 active goal、当前限制、普通想法、用户 correction 和无 runtime 证据，足以
  做 authority/插入判断；需要删除或下沉语义标签，而非删除这些事实。

### 最近邻没有重复同一检查

manifest 的三组共同关系（`想试 A` vs 实际 Run/Cell、research candidate vs research
record、`/inbox` 文本 vs host command）是边界回归，不是把候选写成 record 或 runtime。A–D
的具体 source 又分别承载四种不同状态，因此在修掉 runner 泄漏后仍有区分度。四项都只返回
文字、不写仓库的限制也与允许效果契约一致（manifest `:30-32`）。

## Hash、模型与读取边界

截至本 review，下面的当前 SHA-256 与 manifest 一致：fixture、候选
`.agents/skills/planning-inbox/SKILL.md`、`planning/inbox.md`、`planning/inbox-history.md`、
protocol、`AGENTS.md`（manifest `:11-18`）。逐项用 UTF-8/LF、排除 begin/end marker、保留
区块内原始字节重算后，A–D 的 task/source hash 也分别吻合 manifest `:36-39`, `:49-52`,
`:62-65`, `:75-78`。因此当前冻结输入可重建；但 manifest 没有写明“区块 hash 的字节抽取
与换行规范”，建议在下一 round 记录该算法，避免不同 runner 得出不同 hash。任何 task/source
脱敏都会改变这些 hash，必须生成新 round。

目标模型明确为 `gpt-5.6-luna`（manifest `:22`），这一点静态通过；精确模型身份、采样、
harness、权限、runner 和隔离运行条件仍按 manifest `:23-31` 保持 `unknown`，不能由名称或
预注册文字推断。

manifest 要求 baseline/treatment 不回读 P、theory、research（`:26-30`），符合“普通 user
不回读 theory”的边界；但这不能抵消 task 自身已经泄漏方法。未运行前也不能宣称 skill 行为
有效，当前最强 standing 仍是“无行为证据；仅有预注册”（manifest `:92-101`）。

## 最小修订后 probe

1. 用新 round 的中性 task/source 做一次真实 parser/runner dry run，记录 baseline 与 treatment
   实际可见字节，特别确认 review-only rubric 不在上下文。
2. 对 A–D 分别检查 baseline 是否在没有候选 skill 时自发保持目标边界；不能用“答出了 rubric”
   作为 treatment 改善，需由独立 reviewer 按冻结 rubric 判断。
3. 对 C 的中断只评估 Agent 对给定状态的陈述与后续建议，不把文字当作 atomic、exactly-once
   或恢复能力；对 D 只评估返回的 authority/safe-point 关系，不声称 runtime 已接收。

## Main 综合处置

**处置：`adapt-and-retest`，round 1 保留为失效预注册。** Main 接受 B1–B3，并补充
D source 中“用户明确要求马上切换”与预注册“不切换主线”互相矛盾，不能靠 skill 解释消除。
因此不运行、不倒写本 round；新 round 将使用中性任务、物理分离的 runner payload，并把
普通未来想法与有 authority 的接受边界纠正重新构造为不矛盾的 source。行为 standing 仍为
`unknown`。
