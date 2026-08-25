# Research — 开源 Agent skill 的实际实践

**检索日期：2026-08-24。** 本文研究公开仓库中的实际 skill 载体如何组织、触发、加载、分工与评价，并把这些观察带回本项目形成可反驳的问题。它是 research standing：不修改 living theory，不创建或修改 skill，也不把外部仓库、供应商规范、流行做法或本文推断提升为哲学序列或本项目方法的语义来源。

## 直接结论

四个高可见度仓库共享的只是很薄的载体共识：一个目录、一份带 `name` 与 `description` 的 `SKILL.md`，以及可选的 scripts、references、assets。越过这层以后，实践明显分叉：有的把 skill 当成独立方法包，有的把它当成整套开发方法的一节，有的把领域知识、运行时命令和多 Agent 编排一起装入 plugin，有的则把判断、确定性筛选和效果验证拆给 Markdown、脚本与供应商 CLI。

这些分叉提供了三类有用证据：

1. **支持**本项目继续区分方法、载体、reference、工具与 runtime，并分别验证发现和激活后的行为。
2. **挑战**任何仅凭目录规范、frontmatter、正文长度、stars、仓库自评或“已进入某个市场”就判断 skill 正确的做法。
3. **补充**了本项目尚需实测的环境变量：skill 的真实自足边界可能是单目录、plugin 或整个仓库；同一语义进入多 harness 后可能产生 projection 漂移；description 的触发效果会随模型和 harness 改变。

所以，外部实践可以成为反例、工程观察和 probe 设计材料，不能因被复制、流行或由供应商发布而成为本项目理论来源。本文也没有把任何 awesome 列表的收录当作质量证据。

## 研究范围、方法与证据边界

研究优先读取主仓库 README、实际目录、当前 `main` 上的具体 `SKILL.md`、脚本、references、测试或评价说明，以及 GitHub 仓库页面。没有用二手文章支持技术主张。GitHub 网页在部分目录和 raw 文件上偶有加载错误；遇到这种情况，改读同一主仓库的 raw 文件或可访问的目录页，没有用搜索摘要补写缺失内容。

研究对象包括：

- Anthropic 官方 [`anthropics/skills`](https://github.com/anthropics/skills)，具体剖析 [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator)。该具体 skill 自带 [Apache-2.0 license](https://github.com/anthropics/skills/blob/main/skills/skill-creator/LICENSE.txt)；仓库 README 同时说明其中部分 document skills 只是 source-available，因此不能把整个仓库笼统称为同一开源许可。
- Jesse Vincent / Prime Radiant 的社区仓库 [`obra/superpowers`](https://github.com/obra/superpowers)，具体剖析 [`writing-skills`](https://github.com/obra/superpowers/tree/main/skills/writing-skills)，仓库为 [MIT](https://github.com/obra/superpowers/blob/main/LICENSE)。
- Seth Hobson 的社区集合 [`wshobson/agents`](https://github.com/wshobson/agents)，具体剖析 [`task-coordination-strategies`](https://github.com/wshobson/agents/tree/main/plugins/agent-teams/skills/task-coordination-strategies)，仓库为 [MIT](https://github.com/wshobson/agents/blob/main/LICENSE)。
- 作为不同分工形态的补充案例，Vercel Labs 的 [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills)，具体剖析 [`vercel-optimize`](https://github.com/vercel-labs/agent-skills/tree/main/skills/vercel-optimize)。其 README 声称 MIT，但根目录没有独立 LICENSE，GitHub [repository metadata](https://api.github.com/repos/vercel-labs/agent-skills) 在检索日返回 `license: null`；本文不作法律判断，只把许可标识的不完整作为采用限制。

### 动态采用与维护信号

下表数字来自检索日的 GitHub 主仓库页面，只表示关注、派生和仓库活动的动态信号；它们会变化，不等于安装量、活跃用户、满意度、正确性或效果改善。

| 主仓库 | Stars / forks（约数） | 当前页面可见的维护信号 | 能成立的最强主张 |
|---|---:|---|---|
| [`anthropics/skills`](https://github.com/anthropics/skills) | 171.3k / 20.4k | 52 commits；大量 open issues 与 PR；README 明示示例/教育用途并要求在自己的环境中测试 | 官方且高关注，仍在变化；不能推出具体 skill 有效 |
| [`obra/superpowers`](https://github.com/obra/superpowers) | 276.9k / 24.8k | 681 commits；多 harness adapter、tests、贡献流程和外部行为 eval 入口 | 高关注、活跃的社区方法集合；不能推出其强制规则普适 |
| [`wshobson/agents`](https://github.com/wshobson/agents) | 39.1k / 4.2k | 559 commits；93 plugins、181 skills、多 harness 生成与独立 `plugin-eval` 子项目 | 高采用信号和持续扩展；不能推出 181 个 skill 已分别验证 |
| [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills) | 30.4k / 2.7k | 264 commits；README 声称每次 skill 变化发布 immutable artifact | 活跃的供应商实践案例；不能推出 release 即语义正确 |

选择这些来源是为了得到至少两个真正包含 skill 内容、且有明显采用信号的社区仓库，而不是为了做 stars 排名。检索在所需槽位都有一手证据后停止：目录、frontmatter、正文、references/scripts、正负边界、工具/runtime 分工、评价与维护均已覆盖；继续搜更多相似集合不太可能改变当前比较，反而会扩大未经内容审阅的样本。

## 共同载体基线不拥有方法正确性

开放的 [Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) 要求 skill 目录至少包含 `SKILL.md`，frontmatter 必须有 `name` 与 `description`；scripts、references、assets 是可选约定。规范描述三级渐进加载：启动时的 metadata、激活后的完整正文、按需资源，并建议正文低于 500 行、引用保持一层深。规范同时明确 Markdown body 没有结构限制，而 validator 检查的是 frontmatter 与命名约定。

**观察：** 该规范定义可交换的载体与加载接口，没有定义某个领域方法是否真实、边界是否正确、Agent 是否会执行、效果是否安全或结果由谁接受。

**推断：** `format-valid` 最多说明一个包满足载体契约。把 validator、目录形态或 progressive disclosure 当成方法质量，会混淆形式、发现、行动和效果四个不同接口。

## 四个具体 skill 的内容级剖析

### 1. Anthropic `skill-creator`：把 skill 形成变成带人工反馈的实验循环

#### 可核实观察

- [`SKILL.md`](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) 的 description 同时列出创建、修改、eval、benchmark、variance analysis 和触发描述优化等用途。它是“做什么 + 何时用”的宽正触发面，没有在 frontmatter 里列最近邻或不应触发的任务。
- 目录实际含 [`agents/`、`assets/`、`eval-viewer/`、`references/`、`scripts/`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 和独立 LICENSE。正文约 406 行，主流程留在 `SKILL.md`，schema、grader/comparator/analyzer、可视化与确定性聚合按用途移出。
- 正文要求先捕获 intent、触发情境、预期输出、成功标准和依赖，再写测试；它把 scripts 定位为 deterministic/repetitive tasks，把 references 定位为按需进入上下文的文档，把 assets 定位为输出资源。
- 它分别处理 Claude Code、Claude.ai 与 Cowork：无 subagents 时取消 matched baseline 和量化 benchmark，无浏览器时退回静态或对话 review。这里没有声称文字可以创造环境中不存在的并发或 UI 能力。
- 评价流程明确比较 with-skill 与 without-skill/old-skill，记录时间和 token，允许机械 assertion 与人类质性 review 分工，并提供可选 blind comparison。description 优化使用约 20 个正负查询、困难 near-miss、train/test 拆分和每个查询三次 trial，按 held-out test 选择结果。
- [`scripts/`](https://github.com/anthropics/skills/tree/main/skills/skill-creator/scripts) 确实包含 benchmark aggregation、report、description improvement、packaging、validation 和 eval loop 等程序；这比只在正文中宣称“自动评估”多了一层可执行实现。

#### 有边界推断

- 这支持本项目把 discovery 与 action 分开测试，也支持正例、困难反例、matched baseline、重复 trial、机械检查与人类语义 review 分工。
- 它没有证明 `skill-creator` 自身相对 baseline 已产生 matched improvement；正文写的是评价方法，不是该方法的公开结果。作者提供的 viewer、grader 与 analyzer 也不天然构成独立接受。
- “Claude 倾向 undertrigger，因此 description 要 pushy”是特定供应商和当前实现的经验判断。把它复制成本项目的普遍规则会超出证据；本项目需要跨模型和 harness 的 discovery probe。
- 该包的自足单位不是单一 `SKILL.md`，而是整个 skill 目录。离开 scripts、agents 与 assets 后，正文仍能说明概念流程，却不能完成其承诺的完整 eval 工作流。

### 2. Superpowers `writing-skills`：强纪律、明确反例，也暴露自身漂移

#### 可核实观察

- [`SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) 的 description 只写“何时用”：创建、编辑或部署前验证 skill。正文明确要求 description 不要概述 workflow，理由是 Agent 可能把 metadata 当作正文捷径。
- 它给出“应创建”和“不应创建”：跨项目、非直觉且可复用的方法可以成为 skill；一次性解法、已有标准文档、项目局部约定和可机械执行的约束不应成为 skill。机械约束应自动化，判断问题才留给文档。
- [`writing-skills/`](https://github.com/obra/superpowers/tree/main/skills/writing-skills) 采用扁平辅助文件：示例、Anthropic best practices、persuasion、Graphviz 约定、渲染脚本和 subagent 测试方法。正文还依赖 `test-driven-development` 及 `using-superpowers` 的 runtime-specific references；所以它在完整 Superpowers 安装内可恢复，单独复制该目录却不是完全自足。
- 正文以 pressure scenario、no-guidance control、5+ wording repetitions、反例和新鲜上下文建立 RED-GREEN-REFACTOR；不同类型的 skill 分别测试纪律、技术、模式与 reference retrieval。
- 当前正文为 608 行，超过 Agent Skills 规范建议的 500 行，也明显超过它自己给“other skills”写出的 `<500 words` 目标。仓库 README 宣称使用外部 drill eval harness；但当前仓库 [`tests/writing-skills/`](https://github.com/obra/superpowers/tree/main/tests/writing-skills) 可直接看到的只有 Graphviz renderer 的 shell test，未见该具体 skill 的 matched behavior report。
- 正文包含 “NO SKILL WITHOUT A FAILING TEST FIRST”“delete it”“no exceptions”等强制语句，同时在后文承认 prohibition 对 output-shaping 问题可能适得其反，并主张按失败类型选择 recipe、condition 或 prohibition。

#### 有边界推断

- 它为“先观察真实 baseline 差距，再选择表达形式”提供了很强的工程反例库，也提醒本项目不要用作者直觉代替行为 probe。
- 它自己的 608 行与长度规范冲突，说明规则的存在不保证维护者持续遵守；这支持把 drift 与 regression 当成生命周期问题，而不是把一版正文当作永久完成。
- “所有修改必须先有 failing test”适合该仓库选择的纪律模型，却不能从当前公开证据推广为所有 skill 类型、所有修订成本和所有 harness 的普遍准入法。其正文虽区分 skill 类型，最强口号仍会压平比例性。
- 该仓库的高 stars、市场分发与强文风都不能替代每个具体方法的 matched result；强断言本身也不是硬保证。

### 3. `wshobson/agents` 的 `task-coordination-strategies`：在“已经决定用团队”之后很具体，在委派准入之前缺一层

#### 可核实观察

- [`SKILL.md`](https://github.com/wshobson/agents/blob/main/plugins/agent-teams/skills/task-coordination-strategies/SKILL.md) 位于 plugin 内的 `skills/<name>/`，frontmatter description 同时写能力和触发，并使用顶层 `version: 1.0.2`；开放规范把 version 示例放在 `metadata` 内，当前文件没有采用该形式。
- 正文约 150 行，给出按 layer/component/concern/file ownership 分解、dependency graph、任务契约、acceptance criteria、scope boundaries 和 workload rebalancing。主路径在单一正文里基本自足。
- 目录有两个 [`references/`](https://github.com/wshobson/agents/tree/main/plugins/agent-teams/skills/task-coordination-strategies/references) 文件，但 `SKILL.md` 没有链接或说明何时读取它们。仓库文档宣称 progressive disclosure，实际这个具体载体没有给 Agent 明确的按需入口。
- 正文列出何时使用，却没有“何时不要委派”、direct baseline、委派净收益或 Main 如何重连 source standing。它从复杂任务需要 team coordination 的前提开始，重点在团队内分解与负载平衡。
- 正文直接使用 `TaskCreate`、`TaskUpdate`、`TaskList`、`SendMessage`。所依赖的 experimental Agent Teams 开关、tmux/iTerm display 与 plugin 命令写在 [`agent-teams` README](https://github.com/wshobson/agents/tree/main/plugins/agent-teams)，不在 skill 的 compatibility frontmatter 中。
- 仓库提供有 tests 的 [`plugin-eval`](https://github.com/wshobson/agents/tree/main/plugins/plugin-eval) 与 [评价说明](https://github.com/wshobson/agents/blob/main/docs/plugin-eval.md)，混合 static、LLM judge 和 Monte Carlo。其 static 分数使用行数、heading density、references 目录、MUST 密度等代理指标；当前公开材料没有给出 `task-coordination-strategies` 的独立 certificate 或 matched direct-vs-delegated 结果。

#### 有边界推断

- 它证明任务对象、owned files、interface contract、acceptance criteria 和 out-of-scope 对 Agent 协作有实际表达价值；这些字段可以作为待验证关系，不应自动固化为万能模板。
- 它不反驳本项目的 `agent-delegation`，反而暴露一个最近邻缺口：task coordination 是委派已准入后的下游方法，不能替代“是否值得委派”的上游判断。
- 没有正文链接的 references 只能证明资源存在，不能证明渐进加载发生。是否会被 harness 自动发现需要实际 trace，而不是目录推断。
- PluginEval 的存在是维护能力信号，不是 181 个 skills 已分别建立因果证据。用长度、标题数或目录存在给语义质量加分，尤其需要以行为结果反校。

### 4. Vercel `vercel-optimize`：判断留在 skill，确定性 gate 和 verifier 下沉到脚本

#### 可核实观察

- [`SKILL.md`](https://github.com/vercel-labs/agent-skills/blob/main/skills/vercel-optimize/SKILL.md) 用长 description 覆盖 Vercel 成本、性能、框架和具体指标，并在 `metadata.version` 记录版本。正文从“先收 production signals、没有 gate 不读源码”开始。
- 目录含 [`lib/`、`references/`、`scripts/`](https://github.com/vercel-labs/agent-skills/tree/main/skills/vercel-optimize)；正文明确在规则不清、缺 Observability Plus、生成 recommendation、verification、scoring 和 customer voice 等不同分支读取不同 reference。相比“有目录”，这里实际写出了加载条件。
- 正负边界很密：unsupported framework、scope ambiguity、无流量、quota、auth、project not linked 等都要求停止、询问或显式征得 limited audit；scanner-only finding 不得冒充 metric-backed cost recommendation；sub-agent 无法保持 candidate scope 时要 drop 或 abstain。
- [`scripts/`](https://github.com/vercel-labs/agent-skills/tree/main/skills/vercel-optimize/scripts) 包含 signal collection、merge、gate、brief generation、output collection、verification 和 report rendering。实际 [`gate-investigations.mjs`](https://github.com/vercel-labs/agent-skills/blob/main/skills/vercel-optimize/scripts/gate-investigations.mjs) 固定排序、验证 candidate、应用 hard gates、budget 与 dedupe；[`verify-and-regen.mjs`](https://github.com/vercel-labs/agent-skills/blob/main/skills/vercel-optimize/scripts/verify-and-regen.mjs) 验证 claims、区分 abstention、应用 sanitizer/quality floor，并把失败变成结构化 regen plan。
- Agent/sub-agent 只调查 gate 产生的 candidate，并返回受 schema 约束的 recommendation 或 no-change；脚本负责候选顺序、缺失/重复检查、事实/引用/version fit 验证和最终渲染。正文还明确 scripts 不会自己 spawn sub-agents，编排由 host 完成。
- README 声称 `main` 上每次 skill 变化都会发布 immutable discovery index 和 per-skill artifact；这是分发与追溯信号，不是公开的 matched behavior eval。当前 skill 目录也没有展示 direct baseline 或独立人类接受结果。

#### 有边界推断

- 这是四个案例里最直接支持“判断方法、确定性工具、runtime capability 各有 owner”的实例：Agent 处理开放调查，脚本承接可重复 gate、排序、schema 与 verification，host 承接并发和外部效果。
- 这些硬属性只在脚本确实被调用、输入可信且 host 遵守流程时成立；`SKILL.md` 的强措辞不能单独保证脚本运行、权限、并发、恢复或最终效果。
- 大量 references 与脚本降低单次上下文负担，却提高版本耦合、安装完整性和维护成本。其净收益需要在真实 Vercel audit 上测量，不能从工程复杂度反推正确。
- 把 customer voice 独立成 reference 展示了受众差异，但仍是单一工作流里的派生表达；它不能仅凭文件位置证明双受众语义同步。

## 横向比较：观察与解释不要混写

| 维度 | Anthropic `skill-creator` | Superpowers `writing-skills` | `task-coordination-strategies` | Vercel `vercel-optimize` |
|---|---|---|---|---|
| 实际包边界 | 单 skill 目录，含 agents/scripts/assets/viewer | 依赖整个 Superpowers skills 图和 harness adapter | plugin 内 skill，依赖 Agent Teams runtime | 单 skill 目录 + Vercel CLI + host sub-agents |
| description 策略 | 做什么 + 多个触发；刻意 pushy | 只写触发，不概述 workflow | 做什么 + 何时用 | 做什么 + trigger + 前置 doctrine |
| 正负边界 | 正触发宽；负边界主要进入 eval set 和安全原则 | 明写 create / don't create，纪律性反例丰富 | 正触发清楚，委派拒绝边界缺失 | stop、ask、limited、drop、abstain 都是主路径 |
| 正文自足性 | 方法可读，完整执行依赖同目录资源 | 在完整 plugin 中成立，单目录不足 | 主路径可读，references 未接入正文 | 主路径是 orchestrator，细节条件性下沉 |
| 渐进加载 | 明示何时读 schemas/agents/assets/scripts | sibling docs 与跨 skill reference 混合 | 宣称 progressive，具体 references 无入口 | 多个 reference 有明确分支条件 |
| 工具/runtime 分工 | scripts 聚合/打包/优化；环境决定并发/UI | 机械约束应自动化；正文主要施加纪律 | tool 名和团队 runtime 混入正文 | scripts gate/verify/render；host 承担 sub-agents 与 CLI effect |
| 评价证据 | 设计了 matched、held-out、重复和 human review；未见自证结果 | 设计 pressure/control；具体 in-repo behavior result 未见 | 有通用 eval framework；具体 skill certificate 未见 | 有确定性 verifier；matched action eval 未见 |

由此可成立的横向观察是：

1. **描述没有单一最佳配方。** 开放规范要求“做什么 + 何时用”，Superpowers 则基于一次内部失败把 workflow 从 description 排除；Anthropic 当前 `skill-creator` 又把能力和触发都写进去。哪一种在本项目环境中更可靠只能实测。
2. **自足性必须说明单位。** “self-contained”可能指一份正文、一个 skill 目录、一个 plugin 或连同 host/CLI 的安装。只说 skill 自足会隐藏依赖。
3. **渐进披露是运行关系，不是目录装饰。** reference 要有可发现入口、真实条件分支和读取 trace；空有 `references/` 不能证明上下文更省或判断更好。
4. **负边界决定 abstention 与转交。** 高质量候选不仅列 use cases，还要让 Agent 知道何时不加载、不继续、不扩大范围或交给邻近 owner。四个案例在这点上的成熟度差异最大。
5. **脚本适合承接可机械判定的变换与 gate。** 但脚本存在不等于被调用，调用成功不等于语义建议正确，skill 文字也不能替 runtime 强制 hard property。
6. **公开评价框架多于公开 matched 结果。** 三个仓库都能说明如何测试或提供 evaluator，本文没有在被剖析的具体 skill 页面找到足以支持普遍改善的 matched、重复、独立接受结果。
7. **多 harness 分发增加 projection 问题。** `wshobson/agents` 明示从一个 source 生成多种 harness-native artifacts，Superpowers 也维护多个 adapter。可移植性不是相同 Markdown 能被复制，而是触发、工具、效果和回归在每个 host 中仍成立。

## 映射回本项目现行 skills

以下只是外部证据对现行方法的支持、挑战或补充，不是修改建议，也不拥有 living theory。

| 本项目 owner | 支持 | 挑战或反证压力 | 可吸收为 probe 的补充 |
|---|---|---|---|
| `skill-formation` | Anthropic 与 Superpowers 都从真实任务、baseline、重复用途和触发测试出发；多个仓库都把机械工作交给 scripts | 高采用仓库仍混用 skill、reference、知识包、纪律和 plugin workflow；流行生态并不遵守“一个主要判断” | 把“安装单位是否完整”“跨 harness 发现差异”“references 是否真的按需读取”加入生命周期 review |
| `concept-articulation` | 规范要求目录名与 `name` 一致，所有生态都把 name/description 当 discovery identity | 高 stars、可记名称和丰富关键词没有提供对象、定义、外延或最近邻证据；catalog label 容易把 designation 当 concept | 用 hard near-miss trigger set 检验名称是否真的改善路由，而不靠命名偏好 |
| `form-selection` | 四个案例真实展示了任务说明、skill、reference、script、plugin、CLI/runtime 和 projection 的差异 | 社区常把 reference skill 与方法 skill 放在同一 discoverable namespace；外部约定不能替本项目完成最小形式判断 | 把 distribution/installation boundary、immutable artifact 与 generated projection 纳入形式成本和退役检查 |
| `human-writing` | `skill-creator` 按用户技术熟悉度调整措辞，Vercel 把 customer voice 与内部字段分开 | 固定报告模板、禁词和 verbatim copy 可能只改善表面一致；没有读者理解结果就不能声称写作有效 | 在 skill 产物 eval 中让真实读者判断依据、范围与未知，而不只给 LLM style score |
| `agent-expression` | task template 的 objective、owned files、interface、acceptance、out-of-scope，以及 Vercel 的失败/返回 schema，都证明承重关系需要显式表达 | 固定字段会诱使作者把 schema 完整误当任务完整；强 MUST 也不能产生权限或 runtime effect | 用缺权限、工具缺失、partial result 和 abstention fixtures 检查失败与返回是否可重建 |
| `dual-audience-expression` | `wshobson/agents` 的 one-source/multi-harness 声明和 Vercel 内部 evidence 到 customer copy 的变换，提供了真实双视图场景 | “single source of truth”或生成成功不证明各 projection 语义一致；本文未见逐 skill 的跨 harness semantic regression | 改变一个共享硬约束后生成各 host 视图，检查来源、触发、权限和失败语义是否共同更新 |
| `agent-delegation` | Wshobson 的 dependency/file ownership/task contract 与 Vercel 的 bounded brief、no-change、collector 和 verifier 支持贡献边界与证据重连 | team size、3+ briefs fan-out、wide graph 等都是局部 heuristic；没有 direct baseline 时不能证明委派净收益，`task-coordination` 也缺拒绝委派的上游判断 | 对同一整体做 direct/sequential/parallel matched trials，测延迟、质量、冲突、Main 返工、共同遗漏和 token 成本 |

两个额外边界需要保留：

- **复制不产生血统。** 即使把外部 skill 原文复制进 `.agents/skills/`，也只改变本地载体内容；它不会让供应商经验自动变成本项目哲学或 living theory 的生成来源。
- **流行不等于正确。** Stars 可以帮助选择值得审阅的样本，却不能证明触发准确、方法真实、工具安全、读者理解、Agent 行为改善或效果被接受。相反，高采用载体里的内部冲突和缺失边界是很有价值的反例。

## 可验证 probes

这些 probes 用于区分候选主张，不预设应照搬任何外部实现。除明确的 mechanical check 外，结果应沿本项目现有证据等级报告。

### Probe A：description discovery 的跨环境边界

- 固定同一 skill body，比较三种 metadata：`what + when`、trigger-only、pushy trigger。
- 任务集至少包含正例、同关键词 near-miss、最近邻 owner、简单一步任务和复杂多步任务；不使用固定短语匹配作 grader。
- 在至少两个模型或 harness 上重复 trial，记录是否加载、误触发、漏触发及理由。
- 只在有反例和重复结果时报告 `boundary-supported`；单环境胜出不能产生通用 description 规则。

### Probe B：激活后的 matched action

- 冻结任务、来源、模型、工具、工作区和接受 rubric；baseline 不加载 candidate，treatment 只增加一次 candidate 激活。
- 对判断型、纪律型、reference 型和 tool-using 型 skill 分别取样，不把同一种测试推广到所有类型。
- 机械 grader 只判 schema、文件、退出状态与可复现事实；独立 reviewer 判来源忠实、边界、行动和比例。
- 同时读 transcript 与最终产物，检查 skill 是否增加无效步骤或诱发过度执行。

### Probe C：真实自足边界与渐进加载

- 分别只安装 `SKILL.md`、完整 skill 目录、完整 plugin，运行同一任务；故意移除一个 sibling reference 或 script。
- 记录 Agent 实际读取的资源、缺失时的失败语义、是否偷偷依赖仓库外上下文，以及不同安装单位的结果差异。
- 对无需 reference 的任务验证其不被加载，对需要 reference 的分支验证它可被正文入口发现。
- 这能区分“目录存在”“链接可达”“按需读取”和“读取改善结果”四个逐步增强的主张。

### Probe D：skill、脚本与 runtime 的故障注入

- 选一个类似 Vercel gate 的复合流程，分别跳过 script、篡改 script output、让 host 不支持 subagents、让 CLI 返回权限/配额错误。
- 检查哪些性质由正文判断保持，哪些由 deterministic script 拒绝，哪些只有 runtime 能保证。
- 验证 script success 不会被报告为语义接受，skill 强措辞也不会被报告为 hard enforcement。

### Probe E：双受众与多 harness projection 回归

- 指定唯一 canonical source，生成一个人类说明、一个 Agent skill 视图和两个 harness adapter。
- 只改变一个共享硬约束，再检查所有受影响视图是否更新；只改变人类背景时，Agent 视图不应无关变化。
- 故意制造一个更新更晚但与 source 冲突的 projection，检查系统是否拒绝按新旧或详略自动裁决。

### Probe F：委派净收益而非 Agent 数

- 为同一任务设置 direct、sequential 和 parallel 三个 treatment，保持来源、模型档、总工具能力和完成 rubric 可比。
- 任务同时包含可分只读研究、真实顺序依赖和共享 mutable surface 三种 fixture。
- 记录 wall time、token、覆盖、冲突、Main 重读/返工、共同遗漏、失败重连和最终质量。
- 只有 delegated treatment 在匹配条件下产生净收益，才能把改善归因于委派；多一份输出或多个 Agent 一致不计作改善。

### Probe G：采用信号与质量是否相关

- 从高 stars 与低 stars 仓库各抽取用途相近、规模相当的 skills，隐藏来源和名气做 blind matched eval。
- 同时测 discovery、action、context cost、boundary 和 regression，不用 awesome 收录或 static style score做代理结论。
- 若相关性弱或方向不稳定，就把 stars 继续限制为 discovery signal；即使相关，也不能让相关性代替单个候选的来源审计。

## 限制与当前未知

- GitHub `main` 和仓库数字是动态的；链接后的内容可能晚于本文快照。本文没有固定 commit SHA，因此后续复核应重新记录日期与 head。
- Stars/forks 不是安装量。Superpowers 自己也在 README 中说明 skill/plugin 缺少直接反馈，另有可选 telemetry；本文没有可核实的跨仓库活跃使用数据。
- 本轮检查了公开目录、正文、关键脚本与评价说明，没有实际安装四个生态、运行其 harness 或复现作者的 benchmark。对行为效果的最强结论仍是“评价机制或工程分工可观察”，不是 matched improvement。
- `wshobson/agents` 和 Superpowers 声称支持多个 harness；本文没有逐一生成并 diff 所有 adapter。跨 harness 一致性仍是 probe，不是已确认事实。
- Vercel 案例的 repository license 标识不完整；在许可澄清前，不应把“README 写 MIT”误报为已经完成的法律核验。

这些限制不阻止当前用途：外部实践已经足以支持载体与机制的比较、暴露反例，并形成可验证 probes；它们不足以授权 living theory 变化或直接照搬任何 skill。
