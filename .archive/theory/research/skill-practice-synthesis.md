---
kind: research-record
id: skill-practice-synthesis
status: settled
disposition: bounded-synthesis-no-proposal
---

# Skill 实践综合：从经验回到哲学序列

**Standing：** `research`，不是 living theory、skill 载体、harness 契约或接受决定。

**范围：** 综合 [`archive-skill-experience.md`](archive-skill-experience.md)、[`open-source-skill-practice.md`](open-source-skill-practice.md)、现行七个 skills/theory 与 Round2 review/run。archive 与开源项目都是有范围的经验材料；流行度、目录存在、供应商发布、作者自评和 archive 复制都不是质量或权威证据。

## 结论

当前不需要新增哲学条目、总 skill、统一 reference 或 harness base，也不应因本综合重写七个 skills。现行设计已经吸收 P → theory → skill 方法/载体的生成关系、一个主要判断、来源与接受边界、形式/工具/runtime 分工、matched 证据等级和双受众唯一 source。Round2 的最强结果是 `behavior-observed`：若干 treatment 比 baseline 更显式地保留未知、拒绝越权准入或减少不必要物化，但共同模型、harness、工具、workspace 和处理隔离未被核实，因此不能声称 `matched-improvement`；agent-expression 与 concept-articulation 的核心行动在 baseline 已成立，未见净改善。

本记录只给出最小 owner 与可区分的 probe。若 probe 发现稳定的重复行为差距，必须以 `theory/philosophy.md` 为理论生成源，重新形成或修订 P→theory→skill；经验只能验证、反驳或触发从 P 重生成，不能自行成为理论条目。

## 已吸收、矛盾与待决关系

| 观察或主张 | 处置与最小 owner | 范围与现有证据 | 反证、holdout 与 no-proposal |
| --- | --- | --- | --- |
| P/theory 应进入生成和审计，不应成为普通激活的阅读依赖 | **已吸收。** `theory/gene-expression.md`、`theory/skill-formation.md` 与七个 `SKILL.md` 由 skill owner 保持；维护/再生时沿链接审计，普通激活只用内化的方法和任务事实源 | archive 明确指出旧 packaged P snapshot/运行时 resolver 的矛盾（`archive-skill-experience.md:23-39`）；Round2 design review 判定七个载体已把关系内化，run 自报未回读 P/theory（`round-2-design-review.md`；各专项 review） | **probe：** 移除 P/theory 可见性，保留 task/source，检查主要判断、未知、返回和边界是否仍可执行。若失败，先回到生成 owner；不新增“普通激活前置阅读”规则。 |
| 哲学序列必须是理论生成源 | **已吸收且不可越权。** `theory/philosophy.md` 是 P 的 canonical source；research 只能提出冲撞、证据和反例，不能修改 P 或直接授权 living theory/skill | `archive-skill-experience.md:175-206` 明确 research/no-proposal 边界；现行 `gene-expression` 定义“道—一—二—三—万物”生成链 | 任何“开源常见”“archive 旧模板”“Round2 treatment 更长”都不能作为新 P。若确需新增条目，先提交来源对象、区别、反例与接受关系，再从 P 重新生成。 |
| 一个 skill 一个主要判断；宽入口只诊断后转交 | **已吸收。** `skill-formation` 拥有载体准入/生命周期；concept、form、human-writing、agent-expression、dual-audience、delegation 各自拥有对象与最近 owner | archive 对宽 `agent-communication` 的限制和七 skill 对照（`archive-skill-experience.md:49-63,67-139`）；Round2 design review 判定七个主要判断与相邻出口可恢复 | **holdout：** 给一个同时含概念、形式、委派和写作词汇的任务，观察是否转交而非激活总方法。无重复跨域差距则 `no-proposal`，不重建 `agent-communication`。 |
| skill 载体应自足 | **收窄为“方法自足、安装边界显式”，不新增 theory。** skill owner 负责正文内化；form-selection 负责载体/安装单位；scripts、reference、plugin、host/runtime 各自保有真实依赖 | 开源案例显示自足单位可为正文、目录、plugin 或 host+CLI，而非一个固定答案（`open-source-skill-practice.md:7-15,64-67,75,127-141`）；Round2 只证明 run 未表现出回读 P 的需要，不能证明真实安装边界 | **Probe C：** 只装 `SKILL.md`、完整目录、完整 plugin，故意移除 sibling reference/script，记录缺失时失败语义和实际读取。未观察到行为差距时保持现状；不要把“自足”写成无事实源、无工具、无 runtime 的万能保证。 |
| 渐进加载是真实运行关系，不是 `references/` 目录装饰 | **保留为 skill/form 的 review 检查，不单独成 skill。** 方法正文给出何时读取 reference/script；reference owner 只承载条件分支，runtime/host 记录 trace | 开源 `vercel-optimize` 有条件入口与 gate/verify scripts，`task-coordination` 的 references 则无正文入口；研究明确空目录不能证明按需读取（`open-source-skill-practice.md:91-102,109-120,130-141`） | **Probe C：** 无需 reference 的任务不得加载它；需要时必须可由正文发现；比较 token、遗漏和行动。只见目录存在或链接可达时 `no-proposal`，不强加统一目录规范。 |
| description discovery 没有单一配方 | **归 `concept-articulation`（身份/最近邻）与 skill-formation（准入/发现评估），不改理论。** description 只承载可发现的对象、正向用途与重要负边界，具体策略由环境试验决定 | 开源实践在 `what+when`、trigger-only、pushy 间分叉（`open-source-skill-practice.md:55,73,127-138`）；研究已提出 discovery/action 分离与 hard near-miss | **Probe A：** 同一 body 比较三种 metadata，在至少两种 model/harness 上用正例、近邻、简单一步与复杂任务重复 trial。单环境胜出、stars 或关键词多不构成规则；无稳定差异则 `no-proposal`。 |
| scripts/runtime 应与方法判断分工 | **已吸收，最小 owner 为 method skill + deterministic script + harness/runtime。** skill 判断是否调用、解释候选和 abstain；script 做确定性 gate、排序、schema、验证/渲染；host/runtime 才能保证权限、并发、恢复、外部效果 | Vercel 案例把 gate/verify/render 下沉 scripts、把 sub-agent/CLI effect 留给 host；archive 与 `theory/harness/theory.md` 明确文字不能创造 hard property（`open-source-skill-practice.md:105-120`；`theory/harness/theory.md`） | **Probe D：** 跳过/篡改 script、CLI 权限错误、host 不支持 subagents，检查各层失败语义。script success 不等于接受，强 MUST 不等于 runtime enforcement；未有确定性差距不新增 harness。 |
| development 与 confirmation 必须分开；baseline ceiling/floor 时不能归因 | **已吸收为证据纪律，最小 owner 是评估 protocol/独立 reviewer，不是某个 skill。** development fixture 不得继续当 held-out confirmation；ceiling/floor 保留为 inconclusive | archive 明确要求 fresh evaluator、headroom、development/confirmation 分离（`archive-skill-experience.md:141-154`）；Round2 reviews 一致把未核实隔离降为 `behavior-observed`，不作因果主张 | 每个新结果必须标明 fixture 地位、headroom 和隔离；baseline 已完成核心判断时，treatment 更长或更整齐是 `no-proposal`。不换题抹除失败，不把一次成功升格。 |
| 双受众应 source-only、单一权威、可重建 | **已吸收。** `dual-audience-expression` 拥有 source/projection/synchronization/regression；human-writing 与 agent-expression 只拥有各自视图，不能成为第二 canon | archive 的 source-only mode 与 drift 条件（`archive-skill-experience.md:119-127`）；Round2 design review 判定双受众 owner 与单受众 owner 不循环 | **Probe E：** 去掉 projection/Agent explanation 仍从 source 重建；只改 source 的一条约束，检查所有视图同步；制造更新更晚但冲突的 projection，必须回到 source owner。没有真实漂移时不增加 UI 或 projection runtime。 |
| Main 不应无条件等待 child；失败时只局部重跑 | **暂不改 living theory，作为 `agent-delegation` 的边界 probe。** owner 只负责等待依赖和失败重连；是否固化规则取决于重复行为差距 | archive 记录两项实践但明确尚未观察现行 Agent 是否反复犯错（`archive-skill-experience.md:129-139,197-206`）；`theory/agent-delegation.md` 已有拓扑、重连、比例边界 | **holdout：** 一项 child 未完成但 Main 有独立综合可做；多贡献运行只有一项失败。比较立即等待/全量重跑与继续独立工作/只重跑失败的延迟、返工、遗漏和证据覆盖。若无稳定差距，`no-proposal`；不把“少等”“少重跑”直接写成普遍规则。 |
| “流行度/采用”可作质量信号 | **拒绝升格。** form-selection 可把安装/分发信号作为成本与样本选择；skill-formation 只接受行为、边界、回归证据 | 开源研究明确 stars、forks、市场收录、immutable artifact 不能推出正确性或改善（`open-source-skill-practice.md:28-39,64-67,114,208-219`） | **Probe G：** 隐藏来源和名气，对高/低采用样本做 blind matched eval；即使相关，也不能替代单个候选审计。无 matched 证据即 `no-proposal`。 |
| archive 中的模板、字段、旧 runtime 是否应恢复 | **拒绝。** archive 只作历史反例；最小 owner 仍由现行 theory/skills 重新判断，不按文件数机械拆分 harness | archive 明确不恢复旧 Sequence、skill suite、runtime 或 compatibility shell（`archive-skill-experience.md:9,158-206`）；开源实践也显示固定字段/目录与语义质量脱钩 | 对每个候选先问是否改变对象、判断、行动或硬属性；若只是格式、长度、目录或复制，`no-proposal`。只有现有 owner 无法承载且有重复差距，才重新形成。 |

## 对现行七个 skills/theory 的最小处置

- `skill-formation`：保留现有准入、生命周期和证据等级；补充 review 时记录安装边界、discovery/action/context 分离、development/confirmation 与 headroom。只加 probe，不因开源案例直接改写。
- `concept-articulation`：保留对象→定义→designation→行动检验；用 description hard near-miss 验证身份是否改善发现，不把关键词密度或名称流行当概念证据。
- `form-selection`：保留最小真实形式与 owner 表；在需要时记录 skill 目录、plugin、host/CLI 和生成 projection 的生命周期，不预设“一个 SKILL.md 必须完整执行”。
- `human-writing`、`agent-expression`：保留来源/未知/效果/返回/接受的承重语义；不要把固定字段、长正文或 style score 误当行为改善。Round2 已显示 baseline 核心关系成立，当前没有 rewrite 提案。
- `dual-audience-expression`：保留唯一 source、派生视图和 semantic regression；source-only 与多 harness 只作为回归 probe，不新增第二 canonical 文档。
- `agent-delegation`：保留真实贡献、净收益、Main 综合、writer/reviewer 分离和 runtime 边界；把等待/局部重跑做成有对照的 probe，不能由 archive 经验直接固化。
- `theory/harness/theory.md` 与其余 living theory：不因经验材料新增条目或机制；若 probe 真的暴露跨任务、跨环境且现有 owner 无法解释的稳定缺口，先回到 `theory/philosophy.md` 形成来源有界的 P 级问题，再生成 theory 与载体。

## 最小 harness 归属建议

不按“每个文件一个 harness”整理。只在硬属性跨提示、重启、并发或不可信调用仍需成立时，才由 harness/runtime 拥有：载体发现与加载记录、工具/权限边界、确定性脚本退出状态、并发/等待/恢复、持久效果与可审计 ledger。method skill 仍拥有何时调用、如何解释、何时 abstain 和怎样返回；`agent-delegation` 拥有拓扑与证据重连；`dual-audience-expression` 拥有 source/projection 关系；人类或明确接受者拥有最终接受。若这些硬属性尚未有真实运行契约，最小建议是 `no-proposal` + 故障注入 probe，而不是新增 base。

## 证据与停止条件

当前综合的最高主张是：现行设计**兼容并部分吸收** archive/开源的有界经验，Round2 观察到若干行为差异，但没有达到可归因改善。继续工作只在以下条件之一成立时推进：

1. discovery、安装自足、渐进加载、source-only、委派等待/局部重跑中的 probe 出现跨重复试验的稳定边界差距；或
2. 故障注入证明某项必须由 runtime/base 保证的硬属性没有 owner。

否则保留现状并返回 `no-proposal`。机械 validator 与 `git diff --check` 只能证明格式，不改变 standing，也不取得人类接受权。
