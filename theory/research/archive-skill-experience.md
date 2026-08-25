# Archive 旧理论与 skills 经验审计

**Disposition:** `no-proposal`

**Scope:** 把 `archive/` 当作历史证据，检查旧理论、设计、skills 与评估中对理论生成、skill 形成、概念与命名、形式、面向人和 Agent 的表达、双受众、委派、review 与验证已经处理过的真实问题；判断哪些关系已被 living theory 和现行七个 skills 吸收，哪些仍值得形成回归探针。

**Source limitations:** 本记录只审计仓库内的 archive 材料。它不重新评估当前开源社区的项目活跃度、用户评价或最新实现，也没有找到旧 `.agents/skills/agent-communication` 的历史载体本身，因此对它的判断只能依据现有研究记录与 archive 中各独立 owner 的边界作有限重建。archive 自己已经声明这些材料在本分支没有事实权威（[`archive/README.md` L1–3](../../archive/README.md#L1-L3)）。

> 本记录不恢复旧 Sequence、旧目录、旧 skill 包或旧 runtime，也不把 archive 变成现行模板。它只保存可反驳的历史经验。

## 调查方法

先用 `rg` 和文件清单定位与 `skill`、`expression`、`naming`、`writing`、`source/projection`、`delegation`、`review`、`evaluation`、`runtime` 有关的材料，再选择能改变现行判断的文件逐行核对。文件数量和篇幅不作为重要性依据；同一关系被复制到多个旧 skill 包，也不自动算作多份独立证据。

重点比较了：

- `skill-engineering` 的准入、表达层、血统选择与行为评估；
- `naming-and-articulation`、`form-guidance`、`document-writing`、`context-engineering` 与 `agent-delegation` 的相邻所有权；
- writing、delegation、project cognition 和模型/skill 评估的实际 probe；
- human-agent visualization 中 source、projection 与 Agent explanation 的关系；
- 已归档 writing suite 中后来被吸收或被否定的实践细节。

## 核心发现一：P 血统应进入生成，不应成为普通激活的阅读依赖

旧 `skill-engineering` 同时保存了两个互相冲突的方向。

一方面，它正确要求 skill 从真实、重复的 Agent 行动差距出发，而不是从名称和格式出发；目标是改变判断与行动，不是得到一份好看的 prompt（[`skill-engineering/SKILL.md` L23–32](../../archive/skills/skill-engineering/SKILL.md#L23-L32)）。它还要求选出的 P 必须真正改变核心方法，装饰性血统应被删除（[`skill-engineering/SKILL.md` L70–87](../../archive/skills/skill-engineering/SKILL.md#L70-L87)）。

另一方面，它把血统追溯做成了普通执行路径：先解析 host 或 packaged Sequence，再读取选中的 interpretations；`create` 和 `review` 命令也要求执行 Agent 回读 P 文件（[`skill-engineering/SKILL.md` L50–66](../../archive/skills/skill-engineering/SKILL.md#L50-L66)，[`commands/create.md` L6–16](../../archive/skills/skill-engineering/commands/create.md#L6-L16)，[`commands/review.md` L5–15](../../archive/skills/skill-engineering/commands/review.md#L5-L15)）。当时的 standalone probe 把 packaged P snapshot 能被读取视为成功（[`2026-07-09-skill-engineering-standalone-harness.md` L13–30](../../archive/evaluations/2026-07-09-skill-engineering-standalone-harness.md#L13-L30)）。这种设计改善了可追溯性，却把“生成与审计依赖”误成了“普通使用依赖”。

Archive 自己在委派领域已经给出更合适的关系：Main 读取上游方法，为 child 形成完整 task/return contract，并把必要约束内联；不能让 child 再去发现 skill-relative 文件（[`agent-delegation/SKILL.md` L113–125](../../archive/skills/agent-delegation/SKILL.md#L113-L125)，[`delegation.md` L79–108](../../archive/skills/agent-delegation/references/delegation.md#L79-L108)）。同一个关系可以类推到 P → theory → skill：

1. skill 作者或再生者读取相关 P、interpretation、living theory、research 和实践证据；
2. 条目之间在具体问题中的冲撞必须变成 skill 内部可执行的主要判断、边界、行动和返回关系；
3. skill 可以记录 P 编号与来源链接，供血统审计、漂移诊断和重新生成；
4. 普通使用者只需读取 skill 载体和当前任务自己的事实来源，不应为了执行方法再回读 P 或 theory；
5. 若删去 P 链接后普通激活便无法行动，问题不是“用户少读了文件”，而是生成关系没有被 skill 内化。

这项修正已经进入现行 `theory/gene-expression.md`、`theory/skill-formation.md` 和七个 living `SKILL.md` 的理论来源段。它仍需要一个明确回归 probe：把 P 与 theory 路径从普通使用者的可见上下文中拿掉，目标 Agent 仍应能恢复主要判断、正负边界、必要行动、未知、效果和返回；维护者则仍能沿链接审计方法如何生成。

## 核心发现二：先形成对象，再选择能生成方法的哲学关系

旧研究发现过一种顺序倒置：先因为任务需要“给建议”而选择 P15/P13/P11 之类的下游约束，再用选中的词汇解释对象。这样可以得到安全、克制的下一步，却可能完全错过对象究竟是什么（[`theory-generativity-and-expression-selection.md` L71–93](../../archive/principles/research/theory-generativity-and-expression-selection.md#L71-L93)）。历史 naming probe 中，intent-first 与 object-first 两组都停在“增加直接 baseline”，只有被约束到 P07/P16 的读取才发现 archive 中间材料还不是面向受众的命名对象（同文件 [`L36–69`](../../archive/principles/research/theory-generativity-and-expression-selection.md#L36-L69)）。

当时的有效修正是：先形成实际对象、主体、历史与关系，诊断组织它们的冲突，再选择会改变解释或转化的 P；P15、权威和验证边界放到下游真正需要的位置（同文件 [`L87–128`](../../archive/principles/research/theory-generativity-and-expression-selection.md#L87-L128)）。修正后的 replay 确实改变了 lead 与决策路径，但仍未完整恢复人的后来纠正，因此 generic selector 不能替代具体 domain method（同文件 [`L130–151`](../../archive/principles/research/theory-generativity-and-expression-selection.md#L130-L151)）。

现行 theory 已吸收“对象先于名称、载体和 P 标签”的顺序。仍应保留一个反向 probe：给 Agent 一个很诱人的 P 标签或旧 skill 名称，但提供一个与该标签不一致的实际对象；若它围绕标签填充材料，而不是修改或拒绝初始血统选择，则生成顺序仍然失真。

## 核心发现三：一个 skill 拥有一个主要判断，宽入口只能诊断并转交

Archive 中几个成熟 skill 已经分别写清了不同 owner：

- `naming-and-articulation` 只拥有“对象、受众和受阻判断需要怎样的名称、操作定义与解释”，明确排除普通写作和 skill 表达工程（[`naming-and-articulation/SKILL.md` L20–31](../../archive/skills/naming-and-articulation/SKILL.md#L20-L31)）；
- `document-writing` 只拥有来源意义怎样在真实 writer-reader-situation 关系中成为文档（[`document-writing/SKILL.md` L20–29](../../archive/skills/document-writing/SKILL.md#L20-L29)）；
- `context-engineering` 只拥有来源信息何时、怎样到达 Agent，不拥有内容、任务形式、工具和返回契约（[`context-engineering/SKILL.md` L20–39](../../archive/skills/context-engineering/SKILL.md#L20-L39)）；
- `agent-delegation` 只拥有有界贡献、拓扑和证据重连，不拥有 domain truth、provider、retry、concurrency 或 durable state（[`agent-delegation/SKILL.md` L27–54](../../archive/skills/agent-delegation/SKILL.md#L27-L54)）；
- `skill-engineering` 只应处理已定位到 skill 的重复行为差距和表达，不处理一次性请求或其他更真实形式（[`skill-engineering/SKILL.md` L23–32](../../archive/skills/skill-engineering/SKILL.md#L23-L32)）。

Archive 也保留了一种合法的宽入口：`improve-agent-workflow` 可以在 owner 未知时横跨 instruction、context、skill、tool、verification 和 handoff 做诊断，但一旦找到 owner 就必须转交，不能保持第二协调层（[`improve-agent-workflow/SKILL.md` L31–49](../../archive/skills/improve-agent-workflow/SKILL.md#L31-L49)）。

没有在 archive 中找到旧 `agent-communication` 的实际载体，因此不能把其具体段落当作已核实事实。但现有证据足以解释“为什么把它做成总容器会过宽”：如果一个 skill 同时拥有概念形成、形式选择、人类写作、Agent task contract、双受众同步、skill 准入和委派拓扑，它就同时拥有不同对象、触发、上下文、失败方式和验收关系。激活任何一项都要携带大量无关规则，review 也无法判断究竟哪个主要行为改变了。它最多可以成为临时诊断路由器，并在定位后停止；不应成为这些 domain methods 的共同 owner。

现行七个 skills 的拆分方向与 archive 证据相符。回归 probe 不应只数目录或标题，而应给出相邻任务，观察每个 skill 是否：只接纳自己的主要判断、准确转交最近 owner、不会因共享“表达/Agent”词汇而互相吞并。

## 七个现行 skills 的历史经验对照

### `skill-formation`

**真实问题。** 旧系统已经识别“写出漂亮 prompt”不等于 skill 成立；需要重复行动差距、最小形式、distinct trigger/judgment 与行为证据（[`skill-engineering/SKILL.md` L68–118](../../archive/skills/skill-engineering/SKILL.md#L68-L118)）。旧 `rewrite` 还要求先恢复完整旧 surface，再把函数与名称、阶段数、目录和历史规则分开；同样行为不存在时应合并、删除或降级，而不是原地润色（[`commands/rewrite.md` L1–24](../../archive/skills/skill-engineering/commands/rewrite.md#L1-L24)）。

**已吸收。** 现行 skill 已包含 action-gap 准入、相邻形式、一个主要判断、拆分/合并/降级/删除、runtime 边界和分级证据。

**矛盾或失败。** 旧版把 exactly one Primary + at most three Supporting P-IDs 变成固定设计程序，并把 packaged Sequence/interpretations 作为便携包组成（[`expression-team.md` L31–54](../../archive/skills/skill-engineering/references/expression-team.md#L31-L54)）。固定数量和运行时回读都不是 skill 成立条件；真正条件是每一条生成关系是否进入方法并改变行为。

**回归 probe。** 给出一个写得很差但行为有效的 skill，和一个写得漂亮、血统齐全却没有独立行为差距的候选。方法应优先保留前者、拒绝或降级后者，而不是按格式和 P 数量评分。

### `concept-articulation`

**真实问题。** 旧 skill 已把 name、operative definition、explanation、audience projection 分开，并明示这些不是必填文档模板；只保留会改变行动或恢复的层（[`articulation-layers.md` L1–12](../../archive/skills/naming-and-articulation/references/articulation-layers.md#L1-L12)）。其方法顺序是先对象和关系，再最近邻 contrast，再少量候选，最后用实际决策测试；无实际 contrast 时停止命名（[`naming-and-articulation/SKILL.md` L39–81](../../archive/skills/naming-and-articulation/SKILL.md#L39-L81)）。

**已吸收。** 现行 skill 已覆盖对象证据、定义、包含/排除/最近邻、临时 handle、正式指称、no-proposal 与行动检验。

**仍值得保留的细节。** 候选名的 status 不能暗中把 provisional/proposed 升为 accepted/verified；定义位置必须由未来决策的真实 owner 决定（[`articulation-layers.md` L23–37](../../archive/skills/naming-and-articulation/references/articulation-layers.md#L23-L37)）。现行 skill 已表达大意，评估时仍应单独观察 status 泄漏，而不是只看定义是否顺口。

**回归 probe。** 给出一个有吸引力但暗示“已经接受”的名称，而来源只支持候选；要求 Agent 选择是否保留 provisional handle、怎样定义，以及何种证据才能转正。

### `form-selection`

**真实问题。** 旧 form matrix 区分无新形式、局部 instruction、skill、durable decision、runtime、projection 与 bounded campaign，并要求每个组合成员分别证明 actor、cadence、authority、lifetime、source、capability 和 omission risk（[`form-matrix.md` L1–34](../../archive/skills/form-guidance/references/form-matrix.md#L1-L34)）。旧主 skill 也明确：form decision 不能顺手写 domain doctrine，必须在选择 owner 后停止（[`form-guidance/SKILL.md` L22–32](../../archive/skills/form-guidance/SKILL.md#L22-L32)，[`L78–96`](../../archive/skills/form-guidance/SKILL.md#L78-L96)）。

**已吸收。** 现行 skill 已扩展到当前任务表达、项目局部指令、普通文档、reference、skill 载体、工具/runtime、projection 和有限计划，并把文件名与目录作为普通落地检查而不是主线。

**矛盾或失败。** 旧矩阵可帮助比较，但一旦被当作强制枚举或固定栈，就会让形式先于真实消费关系。旧文件自己已写明“只有每一层通过不同 gate 才能组合”，所以不应把表格升级成 schema。

**回归 probe。** 让 Agent 处理一个用户明确要求“创建 skill”的一次性问题，以及一个真的需要选择性加载方法的重复问题；它应能拒绝请求中的预设产物，并且不因目录已存在而维持形式。

### `human-writing`

**真实问题。** 旧研究把 AI 写作的主要缺陷定位为先写文字、后补关系：模型在没有 writer-reader-occasion-purpose 和 source boundary 时，以 generic assistant 身份补造连接意义（[`ai-document-expression.md` L1–16](../../archive/design/research/ai-document-expression.md#L1-L16)）。situated writing relation 确实减少了目录式结构，却同时增加了未经来源支持的意图和因果连接，因此“关系”必须被 source boundary 约束（同文件 [`L103–141`](../../archive/design/research/ai-document-expression.md#L103-L141)）。held-out probe 也只支持保留来源缺失项、减少部分 instruction-to-content 泄漏和一组因果改善，不支持普遍文笔优越或确定性语义保真（[`2026-07-23-document-writing-probe.md` L29–83](../../archive/evaluations/2026-07-23-document-writing-probe.md#L29-L83)）。

**已吸收。** 现行 skill 已包含 source standing、具体读者/目的/场合/媒介、整体推进、连接性主张、例证与反例、未知、late surface diagnosis、token 压力和来源/接收双侧检验。

**不应恢复。** 旧 `writing-profile` 把七维画像、持久用户状态、类型标签和机械 anti-AI 清单变成普通 writing 的上游依赖（[`writing-profile/SKILL.md` L14–22](../../archive/legacy/skills/writing-profile/SKILL.md#L14-L22)，[`L189–215`](../../archive/legacy/skills/writing-profile/SKILL.md#L189-L215)）。Archive 后来的研究已经把它判断为负担过重，并改用 task-local voice evidence（[`ai-document-expression.md` L68–93](../../archive/design/research/ai-document-expression.md#L68-L93)）。

**可保留为领域例子、不能升为通则的细节。** 旧 technical-article 方法对 argumentative article 有用：先形成可争论的 core claim 和 reasoning chain（[`technical-article-writing/SKILL.md` L26–47](../../archive/legacy/skills/technical-article-writing/SKILL.md#L26-L47)，[`L79–110`](../../archive/legacy/skills/technical-article-writing/SKILL.md#L79-L110)）；title 与 first sentence 在正文稳定后单独修订（同文件 [`L133–140`](../../archive/legacy/skills/technical-article-writing/SKILL.md#L133-L140)）；过度压缩会失去阅读呼吸（同文件 [`L152–168`](../../archive/legacy/skills/technical-article-writing/SKILL.md#L152-L168)）。这些只适合论证型技术文章，不应被塞回通用 human-writing 的固定阶段。

**回归 probe。** 同一 skill 分别处理 argument、tutorial、reference、短 UI copy；只有 argument 应要求连续 reasoning chain，其他媒介不能被强制文章化。

### `agent-expression`

**真实问题。** 旧 context skill 已把 source delivery 与 task、workspace、tools、effects、verification、return contract 分开；delivery 只拥有选择、时机与 receiver-facing source expression（[`context-engineering/SKILL.md` L22–39](../../archive/skills/context-engineering/SKILL.md#L22-L39)）。它还用 fresh Agent restatement 测试对象、边界、effects、non-goals、verification 和 return 是否能从交付上下文恢复，但明确说复述成功不等于语义正确或接受（同文件 [`L102–115`](../../archive/skills/context-engineering/SKILL.md#L102-L115)）。旧 delegation contract 则提供了 contribution、source/effect boundary、stop、evidence 与 return 的实际表达关系（[`delegation.md` L40–108](../../archive/skills/agent-delegation/references/delegation.md#L40-L108)）。

**已吸收。** 现行 skill 已把这些关系从委派和 context 中抽成独立的 Agent-facing expression 方法，同时明确不拥有委派拓扑、双受众同步或 runtime 强制。

**矛盾或失败。** 旧方法经常以固定字段 packet 表达正确关系。字段可以作作者检查，却不能成为所有任务的输出模板；机械 schema 合格也不能证明 Agent 理解。旧 delegation 自己要求 receiver 得到完整内联内容，而不是被迫追索 parent-relative references，这一点应继续作为 task-expression 约束。

**回归 probe。** 给出内容相同的两份任务：一份用完整自然语言按依赖组织，另一份填满字段但把来源地位和 acceptance 藏在远处。观察 Agent 是否在后者误把候选当事实或把检查通过当接受，避免 grader 只数字段。

### `dual-audience-expression`

**真实问题。** 旧 expression layers 已区分 Agent action、domain doctrine、human audience projection 和 public index，并要求 audience projection 永远不是第二 canon（[`expression-layers.md` L7–20](../../archive/skills/skill-engineering/references/expression-layers.md#L7-L20)）。human-agent visualization 又把 durable/observed sources、rebuildable projections 和 ephemeral Agent explanation 分开；可视化更有说服力不会增加权威（[`human-agent-visualization/DESIGN.md` L10–45](../../archive/experiments/human-agent-visualization/DESIGN.md#L10-L45)）。

**已吸收。** 现行 skill 已拥有共享语义核、唯一权威、两种接收关系、派生与同步、冲突与语义回归，并将具体文字交给 `human-writing` 和 `agent-expression`。

**仍值得保留的实践细节。** 旧 visual design 的 source-only mode 会移除 projection 和 Agent explanation，以检查人能否仍从来源重建；只有 subject、task context、contract 和 builder revision 兼容时才显示 drift（[`human-agent-visualization/DESIGN.md` L139–165](../../archive/experiments/human-agent-visualization/DESIGN.md#L139-L165)）。这不是所有双受众工件都必须实现的 UI，但可以抽成两个 probe：去掉某个派生视图仍能回到权威源；比较两版视图前先确认它们确实表达同一对象与来源版本。

**回归 probe。** 让较新的 Agent 视图与较旧的 canonical source 冲突；方法应暴露冲突并回到 source owner，不能按时间、新颖度、详略或“更靠近执行”自动裁决。

### `agent-delegation`

**真实问题。** 旧 contribution gate 只在独立来源、分离效果、Main 注意负担或独立 reviewer 真实存在时委派；共享 contract/state 要保持一个 writer（[`delegation.md` L7–38](../../archive/skills/agent-delegation/references/delegation.md#L7-L38)）。它把 producer 与 fresh reviewer 隔离，并要求 reviewer 不接收 maker 的 desired verdict 或 hidden reasoning（同文件 [`L110–139`](../../archive/skills/agent-delegation/references/delegation.md#L110-L139)）。实践 probe 证明 read-only partition 有用，也证明即使用户要求并行，共享 field semantics 仍应由一个 writer 持有（[`2026-08-03-agent-delegation-first-use.md` L9–57](../../archive/evaluations/2026-08-03-agent-delegation-first-use.md#L9-L57)）。

更强的历史反例是：compact child result、schema validity、lineage 与 source path 都不能自动让 child claim 成为 parent 的承重前提；在密集耦合的小 source set 上，nested arm 成本更高且语义更差。加入 source scope、可作为 premise 的 exact claim、uncertainty 和 retained judgment 后 parent 才改善，但 direct 仍可能更便宜（[`agent-delegation-and-dynamic-workflows.md` L236–291](../../archive/design/research/agent-delegation-and-dynamic-workflows.md#L236-L291)）。

**已吸收。** 现行 skill 已包含 whole/contribution、净收益、direct/sequential/parallel/nested、one writer、source standing、coverage、review isolation、Main synthesis、局部问题比例和 runtime 边界。

**尚未明确内化、值得先 probe 的两个实践细节。** 旧 steering 规定 Main 只有在下一项有用行动确实依赖 child 结果时才等待（[`delegation.md` L141–159](../../archive/skills/agent-delegation/references/delegation.md#L141-L159)）；scale-control 实验要求只重新切分失败 packet，不默认重跑成功 siblings（[`2026-07-15-project-cognition-scale-control.md` L160–175](../../archive/evaluations/2026-07-15-project-cognition-scale-control.md#L160-L175)）。它们可能降低空等和重复劳动，但是否进入核心方法，应先观察现行 agent 是否反复犯这两类错误，而不是仅凭 archive 句子添加规则。

**回归 probe。** 一个 child 运行期间 Main 仍有独立综合准备可做；另一个多贡献运行中只有一项失败。观察 Main 是否立即无条件等待，或重启全部贡献；若没有行为差距，就保持现状。

## Review 与验证经验

Archive 对现行评估协议最有价值的不是更多 grader，而是对主张强度的限制：

1. action、boundary 和 context probe 只证明相应表面；声称“改善”必须有 fresh evaluator 和 matched baseline，否则只能说 compatible/observed（[`skill-engineering/evaluation.md` L1–27](../../archive/skills/skill-engineering/references/evaluation.md#L1-L27)）。
2. prompt 或 skill 的作用不能归因于显眼的 role、P 标签、格式或长度；需要保持 task、tools、authority 与 acceptance 不变，对可能承重的 carrier 做 ablation，并把决策/边界变化与词汇/风格变化分开（同文件 [`L29–70`](../../archive/skills/skill-engineering/references/evaluation.md#L29-L70)）。
3. baseline 到达 ceiling 或 floor 时，probe 不能归因；失败与 inconclusive 必须保留，而不是换题后把旧结果抹掉（同文件 [`L47–64`](../../archive/skills/skill-engineering/references/evaluation.md#L47-L64)）。
4. development case 与 confirmation case 必须分开；用来修改 instructions/skills 的案例已经不再 held out（[`model-evaluation/SKILL.md` L101–145](../../archive/skills/model-evaluation/SKILL.md#L101-L145)）。
5. mechanical pass、semantic review 和 final acceptance 是不同 standing；旧 writing probe 的 blind judge 就漏掉了重复 year completion，证明 reviewer 也是证据而不是权威（[`2026-07-23-document-writing-probe.md` L29–45](../../archive/evaluations/2026-07-23-document-writing-probe.md#L29-L45)）。

现行 `evals/skill-evaluation/protocol.md` 已吸收 matched variable、作者/runner/reviewer 分离、正例/边界/最近 owner、证据等级与连续回归。仍可补做而不必立即改协议的 probe 是：

- 在运行 treatment 前检查 baseline 是否有 headroom；
- 明示某 fixture 是 development 还是 confirmation；
- 当一个 task ceiling/floor 时保留记录并停止归因，不因输出更长或更像预期就算 improvement；
- 对中文 skill 使用自然中文 matched packet，不把逐字翻译效应混入方法效应。

## 对旧 `agent-communication` 的有限结论

### 已能确认

- 现有 archive 证据把概念、形式、writing、context delivery、task expression、delegation 和 skill engineering 视作不同主要判断；共享“Agent communication”主题不能抹掉这些差异。
- 宽诊断入口只有在发现 owner 后转交并停止时才不形成第二 owner。
- 将这些方法塞入一个载体会让触发边界、按需加载、行为归因和独立 review 同时失真；这是设计关系结论，不依赖文件长度。

### 不能确认

- archive 中没有旧 `.agents/skills/agent-communication/SKILL.md`，也没有对应提交历史，所以不能逐段确认它当时究竟聚合了哪些规则、是否存在尚未迁出的独有内容。
- 现行研究对它的“合并 skill formation、delegation、context、naming 与 workflow diagnosis”描述可以作为定位线索，但本记录不把该描述升级为 archive 事实。

### 回归处理

不恢复同名 compatibility shell。用七个独立 skill 的相邻触发 probe 检查是否有任务无 owner；若真的存在重复、跨域且不可由现有 methods 组合生成的行为差距，再从该差距重新形成概念和形式，而不是先重建总容器。

## 结论分层

### Adopted evidence

- 从真实对象和重复行为差距开始；名称、P 标签、目录和模板不能先行决定方法。
- P 与 living theory 是 skill 的生成血统、审计和再生入口；普通激活使用已经内化的方法，不回读 P/theory。
- 一个 skill 拥有一个主要判断；宽入口只诊断 owner，定位后转交。
- 名称在定义与 contrast 之后；形式在对象、受众、使用关系和 authority 之后。
- human writing 需要 source boundary、具体 writing relation 与整体 movement；surface lint 是末端诊断。
- Agent expression 必须保留 source standing、effect、failure、return 与 acceptance，但不把固定字段当理解证据。
- 双受众是一个权威语义关系下的不同接收视图，不是两份 canon。
- 委派按真实贡献与净收益决定；Main 保留整体，producer/reviewer 分离，child claim 带 standing 回来。
- behavior evidence、semantic review 与 human acceptance 分层；matched improvement 不能由格式、长度、自评或一次成功推出。

### Contradiction

- 旧 skills 一面说 projection 不是第二 source，一面又把 P snapshots 与 interpretations 复制到几乎每个包并要求普通执行者读取；前者保留，后者废止。
- 旧 skill engineering 要求 P 必须改变方法是有效的；固定 `1 primary + <=3 supports` 和运行时 resolver 不是普遍成立的载体契约。
- 旧 writing 的 task-local relation 与 source fidelity 有证据；持久七维人格画像和机械 anti-AI 清单不应重新成为普通写作依赖。
- 旧 delegation 的 source/evidence/whole 关系可复用；Mission、Run、persistent child timeline、specific carrier mechanics 不属于 portable skill 方法。
- 旧 packet、matrix、layer map 和 return template 可作作者检查或局部外部契约，不能升为所有任务的强制形式。

### Unknown

- 旧 `agent-communication` 载体本身未找到，不能声称已经穷尽其独有实践细节。
- 本轮没有验证当前开源 skills 的 star、活跃度、实际用户反馈或最新设计；这需要单独的在线研究，并应把流行度与行为证据分开。
- “Main 不应提前等待”和“只重跑失败 contribution”虽有 archive 实践支持，现行 Agent 是否存在重复行为差距尚未观察。
- 七个现行 skills 目前是否形成 matched improvement 或 regression-supported standing，要由现行评估轮次而不是本历史审计决定。

### No-proposal

本轮不提出新哲学条目、不恢复旧 Sequence、不恢复旧 skill suite、不重建 `agent-communication`、不增加 harness/runtime，也不因 archive 中有模板、字段或实现就修改现行目录。最小后续动作是把上述未决实践细节加入有区分力的 probe；只有观察到稳定行为差距，才由现行 theory 和 skills 重新生成修改。
