# 新 living theory 对七个 skill 与评估协议的下游影响审查

## 审查范围与 standing

- 审查模型：`gpt-5.6-luna`；日期：2026-08-24。
- 读取：`AGENTS.md`、`theory/harness/iterative-improvement.md`、
  `theory/research/iterative-theory-review-round-2.md`、
  `theory/research/iterative-improvement-skill-admission.md`、七个现行
  `SKILL.md`、`experiments/skill-evaluation/protocol.md`、`trial-manifest.md`、
  Round-2 design/cross-skill review 及七项专项 review。
- 使用的判断边界：`skill-formation` 负责载体的准入和生命周期；
  `form-selection` 负责最小真实形式；`agent-expression` 负责 Agent 可执行、可返回的
  表达；`concept-articulation` 负责对象、定义、最近邻和指称。它们不能互相取得理论、
  protocol、runtime 或最终接受权。

新理论作为 living semantic theory 已获静态层面接受，但行为有效性、matched improvement、
组件归因、收敛和 runtime 保证仍为 `adapt-and-retest`（`theory/research/iterative-theory-review-round-2.md:23-32,84-126,130-132`）。因此本报告审查的是下游语义是否被改变、哪些评估投影已过期，不把静态审查写成 skill 已接受。

## 结论

新理论没有改变七个 skill 的行为对象、一个主要判断或普通激活自足性。七个载体均保留
`SKILL.md` 中已经内化的来源、边界、未知、允许效果、返回和验收关系；不提出
`rewrite`、`split`、`merge`、`downgrade` 或 `delete`。针对本次理论 delta 的最小处置为
**`no-proposal`（保留现有候选边界，不能等同于 adopt/长期接受）**。

实际受影响的是 `experiments/skill-evaluation/` 的 protocol projection/workflow：现行协议仍
把“两轮无重大缺陷且回归通过”写成收敛条件（`protocol.md:71-79`），而新理论明确收敛不由固定
轮数、Agent 数或一致同意决定，必须回到对象级 acceptance card、采用后窗口和 fresh holdout
（`theory/harness/iterative-improvement.md:50-62,126-130`）。协议和 trial manifest 因而是
**semantic-stale**，但本轮只报告，不修改它们。

## 七个 skill 的逐项判断

| 载体 | 对象/主要判断/触发是否改变 | 普通激活自足与证据主张 | 本次最小处置与 owner |
|---|---|---|---|
| `agent-delegation` | 否。对象仍是判断有界贡献是否委派、选择拓扑并把 source standing 重连回 Main；新理论的 evidence lanes、必要组合和协调成本只是其已存在的来源/比例边界，不形成第二个主要判断。正触发、拒绝机械拆分和 runtime 边界不变。 | 自足仍是 yes；现有正文已有贡献契约、独立 review、综合、成本和返回关系（`SKILL.md:28-39,95-119,121-141`）。Round-2 只有 `behavior-observed`，不能把更显式返回归因成改善（`round-2-agent-delegation-isolated-review.md:14-31`）。 | `no-proposal`；保留现有候选状态。若要检验 combo-only/ablation 或委派 outcome，交 protocol/workflow，不改 skill。owner：`agent-delegation`（局部方法）+ workflow（试验）。 |
| `agent-expression` | 否。对象仍是把来源有界任务/方法表达成可判断、可行动、可失败并可返回的 Agent 内容；acceptance card、change hypothesis 和反驳条件只在表达一项改善任务时作为任务事实，不改变通用触发。 | 自足仍是 yes；对象、来源、效果、验收、失败、未知和返回已经内化（`SKILL.md:51-118`）。Round-2 明确 treatment 更长但没有改变核心行动，最高 `behavior-observed`（`round-2-agent-expression-review.md:26-37`）。 | `no-proposal`；不把理论流程复制进载体。owner：`agent-expression` 负责具体任务表达，protocol 负责 card/证据字段。 |
| `concept-articulation` | 否。新理论引入的 baseline、candidate、净改善、退化、收敛等若在具体任务中含义不稳，已有 skill 的对象证据→定义→最近排除→行动检验触发即可；没有证据表明出现了一个独立、跨任务的新概念载体差距。 | 自足仍是 yes；Round-2 两组都能区分时间状态、接受权和外部效果，treatment 主要增加显式性，未改变交接行动（`round-2-concept-articulation-review.md:30-55`）。因此不提高证据等级。 | `no-proposal`；只在未来反复出现概念边界误判时按 `skill-formation` 重新准入。owner：该 skill 处理局部概念，theory 处理跨环境对象/边界变化。 |
| `dual-audience-expression` | 否。对象仍是一个权威语义核下的人类视图、Agent 视图、同步和 semantic regression。新理论的 `P → theory → skill/fixture/rubric/旧结论` stale 传播是上游生命周期/评估血统，不是双受众第二权威。 | 自足仍是 yes；现有正文已经要求 stale、冲突、生成失败和语义回归可见（`SKILL.md:76-120,128-140`）。隔离 review 观察到 treatment 对 stale projection 有增量，但共同条件不足且有 grader 越权混淆，最高仍 `behavior-observed`，不能归因或改写（`round-2-dual-audience-expression-isolated-review.md:14-34`）。 | `no-proposal`；不要把 theory stale 传播变成双受众状态机。owner：dual skill 维护视图关系；workflow 维护血统失效与复评。 |
| `form-selection` | 否。对象仍是为已确立对象选择任务表达、文档、skill 载体、projection、工具/runtime 或有限计划的最小真实形式。新理论声明 ledger 字段/存储属于 protocol，反而排除新增通用载体。 | 自足仍是 yes；现有候选表已覆盖 projection、finite plan、tool/runtime 和 `no-proposal`（`SKILL.md:58-108,116-158`）。Round-2 的准入降级、保留未知和避免物化属于行为观察，不是因果 matched 证据（`round-2-form-selection-review.md:19-72`）。 | `no-proposal`；ledger、acceptance card 和 trial state 不进入 form-selection。owner：protocol 选择评估记录形式，form-selection 只处理实际载体取舍。 |
| `human-writing` | 否。对象仍是按读者、目的、场合和媒介形成自然的人类表达；outcome/process/balancing 的区分是评估主张约束，不是新的写作触发。 | 自足仍是 yes；已有主张边界、未知、压缩、接收效果和“不能把更长当改善”（`SKILL.md:54-67,96-123`）。Round-2 treatment 仅更显式、更长，未改变判断或行动，且开头扩大了格式证明范围；最高 `behavior-observed`（`round-2-human-writing-review.md:22-29`）。 | `no-proposal`；不为闭环新增人类写作模板。owner：human-writing 写审查理由；workflow 分离 process 与 outcome。 |
| `skill-formation` | 否，但它是最接近的生命周期 owner。对象仍是判断重复 Agent 方法是否值得选择性载体并决定 retain/rewrite/split/merge/downgrade/delete；新理论的六项 round disposition 是证据处置，不替换 skill 生命周期处置。 | 自足仍是 yes；已有准入、review、边界、证据等级和生命周期出口（`SKILL.md:40-137`）。Round-2 明确在共同因果条件未知时应保持 `no-proposal`，而不是先做窄实验载体（`round-2-skill-formation-review.md:13-28`）。 | `no-proposal`；不把 acceptance card、combo-only 或 stale ledger 复制进 skill。owner：skill-formation 只在未来出现跨任务、可匹配且现有 owner 无法承接的差距时重开准入；本轮协议投影由 workflow owner 处理。 |

共同判断是：普通激活仍不回读 P/theory/research/protocol；这不是“不读任务事实来源”。七个载体均已明确 P 是血统、living theory 是生成语义、research 是证据/未知、protocol 是评估契约，且正文内化了普通执行方法。新理论没有改变这一边界；它只要求在维护、再生成或评估时追溯上游。

## protocol projection 的 stale 审查

| 理论关系 | 现行投影 | 影响、风险与最小修复方向 | owner |
|---|---|---|---|
| 对象级收敛而非固定轮数 | `protocol.md:71-79` 用“连续两轮”作为收敛条件。 | 与 `iterative-improvement.md:126-130` 直接冲突；旧结果不能声称 converged。应改为 card 中的对象级观察窗口、fresh holdout 和“无继续可分离净收益”的判断，不能把两轮保留为全局门槛。 | workflow/protocol |
| development 与 confirmation | protocol 只有一次通用 baseline/treatment 和 fixture 说明，没有 development/confirmation 的身份及“调参后不得继续冒充 holdout”的字段。 | 新理论区分 development evidence 与 fresh holdout（`iterative-improvement.md:78-85`）。若不分层，重复看同一 fixture 会污染泛化主张。 | workflow/fixture |
| discovery 与 activation | protocol 规定 baseline 不加载、treatment 加载并激活（`protocol.md:3-6,21-24`），但没有独立记录 selector/发现是否正确，再测激活后的方法行为。 | 载体可发现、被选择、被激活是不同关系；把“加载成功”当作发现改善会奖励路径/提示变化。应把 discovery 与 activation 分开试题、记录和评分。 | workflow/protocol |
| acceptance card 与 baseline ceiling/floor | `trial-manifest.md:42-64` 有预注册判断和硬缺陷，却没有接受者、known-good baseline 理由、硬约束/重大退化、成本预算、组合规则、采用后窗口或 fresh-holdout 刷新规则。 | treatment 前不能重建接受关系，也无法区分 baseline 已足够时的 `no-proposal`。应在 manifest 增加对象级 card；“floor”由硬约束/重大退化定义，“ceiling”由 baseline 已覆盖的核心行动定义，不设全局分数。 | workflow/protocol |
| 条件相位与 `N/A` | protocol/manifest 没有开始、改变前、执行中、结束、采用后相位或不适用理由。 | P16 允许低风险、局部、可逆对象裁剪相位，但必须在前置 card 记录理由（`iterative-improvement.md:23-25,109,128`）。否则会事后删相位或反过来仪式化完整 holdout。 | workflow/protocol |
| 必要组合、`combo-only` 与 ablation | protocol 没有组合不可拆理由、combo-only standing 或局部 ablation 结果字段。 | 组合通过不得归因 theory/skill/fixture/rubric/workflow 单项；可拆应做 ablation（`iterative-improvement.md:64-68`）。缺失会制造错误组件因果。 | workflow/protocol |
| 污染与恢复 | 现行隔离项能在 `no/uncertain` 时阻止 matched 主张（`trial-manifest.md:46-53`），但没有追加式污染 ledger、stale 标记、恢复血统和重跑责任。 | 规则方向正确但不可重建；模型、来源 hash、工作区、角色泄漏、fixture/rubric 改写、holdout 消耗时只能 `behavior-observed` 或 `uncertain`（`iterative-improvement.md:87-89`）。 | workflow/config |
| fresh holdout 与采用后窗口 | protocol 没有窗口、holdout 未见性/刷新和采用后逃逸字段。 | 不能把 development 重复运行当泛化，也不能声称采用后无回归；应进入 card 与 ledger，而不是写入 skill。 | workflow/fixture |
| outcome/process/balancing | protocol 的评分项混合来源、行动、完整性和成本，未单列真实 outcome、process（可重建性/独立性/污染识别）和 balancing cost。 | 记录更多、输出更长或 reviewer 更多只能是 process；只有 outcome 改善、重大回归不增且成本在 card 内才是净改善（`iterative-improvement.md:39-48,122-124`）。 | workflow/protocol |
| 六种 round disposition | protocol 没有 `adopt`、`adapt-and-retest`、`retain-baseline`、`no-proposal`、`rollback`、`uncertain` 的互斥完成字段。 | 必须区分：尚未提出 treatment 的 `no-proposal`、已评估仍留 baseline 的 `retain-baseline`、已施加改变后的 `rollback`、无法归因/接受的 `uncertain`；否则“未运行”“未接受”“拒绝”和“回退”会混称（`iterative-improvement.md:111-120`）。 | workflow/protocol |
| 上游 stale 传播 | protocol/manifest 没有理论/研究/protocol 来源 hash 与 `P → theory → skill/fixture/rubric/旧结论` 影响图。 | 新理论要求上游变化先标 stale，再按依赖重生成、独立 review、正例/边界/回归/fresh holdout 和显式恢复（`iterative-improvement.md:91-105`）。旧结论可保存为历史，但不能继续作当前依据。 | theory/workflow |
| 安装边界 | 当前协议只描述加载候选载体，不描述安装、持久化、权限或外部效果。 | 这是正确的未授权边界：安装与不可绕过的身份/权限/持久效果属于项目契约或 runtime，不由 skill 文本证明；协议应明确试验“不覆盖安装/发布/持久化”，避免把一次 treatment 当安装接受。 | runtime/project + workflow |

## manifest 与 hash 失效清单

### 语义失效

七份 `round-2-*.md` manifest 都引用同一份当前 protocol 关系，且都只有任务、来源、fixture、候选
载体 hash 和普通隔离项；没有 acceptance card、相位/N/A、development/confirmation、
discovery/activation、combo-only/ablation、fresh holdout、采用后窗口、outcome/process/
balancing 或六项 disposition。故七份均须在 protocol projection 修复后重新发版；当前记录可保留
为历史预注册，不能按新理论声称 matched、converged 或 regression-supported。`fixture 文件 SHA-256`
虽相同，不代表 fixture 在上游理论变化后仍是当前 confirmation/holdout；byte hash 与 semantic
standing 必须分开。

此外，manifest 没有记录新 living theory 或 protocol projection 的 hash，无法检测上游依赖变化；
这是 provenance 缺口，不应通过假设“任务/source 没变”补齐。

### 已经发生的载体 hash 不一致

按当前工作树 `shasum -a 256 .agents/skills/*/SKILL.md` 核对：

| manifest | manifest 中的当前候选 hash | 当前文件 hash | 结论 |
|---|---|---|---|
| `round-2-agent-delegation.md` | `35c624a5d78e91027cbe69f486c125ea1df98224a93598252a3f46d5d05b5c5a` | `6add7d9e465c45cec82f18ee3e35e5d4082ca789e97811f9d2a45c7e29373914` | 失效，运行必须重发版 |
| `round-2-form-selection.md` | `1c4a8a6672edf5967118a7e404389a34d8771d24f489e2a3a386b316492bac6b` | `d5b0d5d0cfe8c95b48b688ed763af4409fa405df2e176e307366307c922ac79f` | 失效，运行必须重发版 |
| `round-2-skill-formation.md` | `60e04d161bc84ba049b4d0d86ee2245335bc008c2d3b48dda0ca3dd491ab8eda` | `69e089402c66578f4bb7f30170a31f214c9c30763466b41d1bd129596e8fcfe9` | 失效，运行必须重发版 |

`agent-expression`、`concept-articulation`、`dual-audience-expression`、`human-writing` 四份
manifest 的候选载体 hash 与当前文件相符；这只解决 byte identity，不解决上面的 semantic-stale
和共同条件 `unknown/uncertain`。七份 manifest 中标为“已失效的原预注册载体 SHA-256”的旧值是
历史身份，不应被重新用作 treatment 输入。

## 风险、证据与后续责任

最高 standing：

1. 新 theory：静态 semantic relations 已接受；行为层 `adapt-and-retest`。
2. 七个 skill：现有设计的边界和普通激活自足性得到静态 `yes`；专项运行最多
   `behavior-observed`，没有 matched 因果、边界支持、回归稳定或长期接受证据。
3. protocol/manifest：在新理论下为 projection-stale；旧运行可以作为历史观察，不能继续支撑
   新的收敛或净改善主张。

主要风险是 protocol 的固定“两轮收敛”把过程完成误报为理论要求的对象级收敛；其次是缺失
acceptance card、fresh holdout、combo-only/ablation、污染恢复和六项处置，导致因果、泛化、
回退与接受关系不可重建。对七个 skill 逐一新增文字会扩大重复和漂移，违反
`skill-formation` 的最小 delta 与 `form-selection` 的形式所有权，因此本轮不改 skill。

最终结论：**七个 skill：`no-proposal`（不提出载体变更，保留现有候选边界）；评估协议：
`adapt-and-retest`（由 workflow/protocol owner 先重建投影与 manifest，再重跑相称的 discovery、
activation、边界、回归和 fresh holdout）；安装/持久效果：不属于 skill 或 protocol 的证明范围，
交 runtime/project owner。**
