# Living skills 全局审计（round 1）

## 审计范围与结论 standing

- 日期：2026-08-24；审计模型：`gpt-5.6-luna`。
- 只读检查：`AGENTS.md`、`theory/gene-expression.md` 的术语节、`theory/harness/`、现行理论与研究记录、`.agents/skills/*/SKILL.md`、`skills/`、`scripts/validate-skills.rb`，以及现有专项评估与综合记录。
- 本报告只新增到 `evals/project-audit/`，没有修改被审 skill、理论、protocol 或历史记录。
- 当前最小处置：8 个 skill 均 `retain / no-proposal`；不提出 merge、split、rewrite、downgrade 或 delete。它们仍是候选，不能据此宣称长期接受或普适有效。

机械结果为 `format-valid`：`ruby scripts/validate-skills.rb` 输出 `validated 8 skills`；`git diff --check` 通过。证据 standing 需按当前 protocol 的两个维度报告：基础归因是 `format-valid`、`behavior-observed` 或 `matched-improvement`，另可附加并存的 `boundary-supported`、`regression-supported`、`combo-only` qualifier，不能把它们排成单一线性等级（`evals/skill-evaluation/protocol.md:80-96`）。本项目现有 planning-inbox round 2 已达到“同一请求配置下的 `behavior-observed` + output-level `boundary-supported` 观察”，但不是 `matched-improvement`、稳定泛化或因果归因（`evals/skill-evaluation/reviews/planning-inbox-round-2-synthesis.md:22-36`）；round 3 是 old/new 的有限 `behavior-observed` retain，仍不支持 matched 或 regression 主张（`evals/skill-evaluation/reviews/planning-inbox-round-3-synthesis.md:3-13,17-25`）。既有下游审查也明确：新 living theory 没有改变七个既有 skill 的对象、主要判断或普通激活自足性（`evals/skill-evaluation/reviews/post-iterative-theory-skill-impact.md:19-24,44`）。

## Blocking

没有发现必须阻止当前 incubating 使用的 skill 设计缺陷。

## Nonblocking

### 1. 目录落点：当前保持 `.agents/skills/` 合理，`skills/` 暂不晋升

当前工作树没有 `skills/` 目录或 portable skill。8 个载体都位于 `.agents/skills/`，其中 `planning-inbox` 明确依赖本仓库的 `planning/`、goal/Plan 约定和项目 authority，因此只能是 project-local incubating candidate（`.agents/skills/planning-inbox/SKILL.md:13-15`）。其余 7 个对象在内容上有可移植方法的候选形态，但现有评估尚未提供足以证明“脱离本仓库事实后仍独立可用、且值得晋升”的证据；round 3 对 planning-inbox 明确不接受 portable 晋升，round 2 的其他载体也多只有 `behavior-observed` 且 matched 条件未核实。

因此本轮不创建 `skills/`，也不复制任何正文。待某个 skill 的项目依赖、消费者、外部契约和可移植边界被实际确认，并有相称验证后，按 `AGENTS.md` 的单一 canonical 规则 move/promote；在此之前保持当前落点最小。目录问题已覆盖，但不升级为主线结构重构。

### 2. 普通激活的 theory/P 隔离与方法内化：设计上成立，行为上仍有限

7 个通用 skill 都明确把 P 作为生成血统、living theory 作为语义来源、research 作为生成证据、protocol 作为评估契约，并明确普通激活不要求回读这些材料；planning-inbox 也直接声明同一边界（例如 `.agents/skills/planning-inbox/SKILL.md:13-15`）。各载体没有把 P 编号当运行时条件，也没有把理论链接替代方法正文。

逐项检查还看到各 skill 都有：主要判断、正/负触发或最近邻、行动方法、权威与效果边界、unknown/失败处理、返回关系和行为探针。`agent-delegation` 的贡献契约、独立评审、综合与 runtime 边界尤其完整（`.agents/skills/agent-delegation/SKILL.md:68-89,91-119,121-154`）；`agent-expression`、`concept-articulation`、`dual-audience-expression`、`form-selection`、`human-writing`、`skill-formation` 也分别在其正文中声明相同承重关系。现有专项 review 支持“本次 treatment 没有表现出必须回读 P/theory 才能行动”的局部观察，但同时限制证据等级为 `behavior-observed`（如 `round-2-agent-expression-review.md:24-37`、`round-2-concept-articulation-review.md:34-40`、`round-2-dual-audience-expression-isolated-review.md:23-34`）。

最小处置是 retain，不继续在每个 skill 中重复理论或 protocol。后续真实使用/新环境出现回读依赖时，再以行为差距重开 `skill-formation`，而不是先加说明文字。

### 3. 8 个 skill 的边界和重叠

未发现应合并或拆分的真实重叠。相邻关系是互补且在正文中显式转交：

| skill | 主要判断 | 已检查的相邻边界 |
|---|---|---|
| `agent-delegation` | 是否委派有界贡献、采用何种拓扑、如何将带 standing 的返回接回整体 | 不编写单任务契约；交 `agent-expression`；不承担 runtime 强制 |
| `agent-expression` | 把既定语义表达成 Agent 可判断、行动、失败和返回的任务/方法内容 | 不定义概念、不选形式、不设计委派拓扑、不写人类文章 |
| `concept-articulation` | 从对象证据和用途形成可区分概念、定义和正式指称，并做行动检验 | 不润色、不选载体、不拥有 skill 生命周期 |
| `dual-audience-expression` | 一个语义核的人类视图、Agent 视图、唯一权威、派生同步与语义回归 | 不定义概念、不写单一受众内容、不制造 runtime 保证 |
| `form-selection` | 在文档、任务表达、skill、工具/runtime、projection、有限计划等形式间作最小真实取舍 | 不代写内容、不定义概念、不决定 skill 是否准入 |
| `human-writing` | 按具体读者、目的、场合和媒介写出可理解、可判断、可行动的人类表达 | 不定义概念、不选形式、不编写 Agent 契约、不维护双受众同步 |
| `planning-inbox` | 忠实接收/整理 raw，保持 source 与 authority，提出 disposition/handoff 而不扩张承诺 | 不接管 Plan/goal、research/run/eval、执行/接受或 runtime |
| `skill-formation` | 判断重复行为差距是否值得选择性 skill 载体，并决定生命周期处置 | 不保存理论知识、不代替一次性任务、不承诺 runtime |

这组分工与既有 theory-to-skill 审查一致：`skill-formation` 负责载体准入和生命周期，`form-selection` 负责形式，`agent-expression` 负责 Agent 表达，`concept-articulation` 负责对象/定义/最近邻（`post-iterative-theory-skill-impact.md:11-14`）。因此本轮 `no-proposal`，不因共享“来源、边界、返回”等词就合并。

### 4. 中文与机器标识

8 个 frontmatter 的 `name` 均为与目录一致的稳定英文机器标识，并通过 validator 的 lowercase/internal-hyphen 规则；8 个 `description` 与正文均以中文为主，必要的 Agent、skill、runtime、source、owner、unknown 等是项目已经定义的技术标识，不构成语言不一致。手工检查没有发现现行 skill 使用旧的 `Sequence`、`原则源` 或 `theory/philosophy/Pxx.md` 作为运行时路径；`form-selection` 中对 `archive/` 的提及是历史设计边界说明，不是现行引用。

### 5. 评估引用与当前 protocol 状态

skill 中对 `evals/skill-evaluation/protocol.md` 的链接均有效，且普通使用不会读取它。重新直接核验当前 source 后，未发现此前历史审查所说的 protocol 陈旧状态仍存在：当前 protocol 已明确 protocol 是 theory 的 workflow projection、普通 skill 用户不回读 protocol、core card 与条件 phase、fresh holdout、adoption-window、ablation/combo-only、stale/recovery、principal-correction、outcome/process/balancing cost、六种互斥 disposition，以及“没有固定轮数/Agent 数/阈值/一致同意门槛”（`evals/skill-evaluation/protocol.md:3-15,43-65,67-78,80-112`）。现行 `trial-manifest.md` 也已包含 object-level acceptance/owner、known-good baseline、ceiling/floor、phase applicability、fresh holdout、adoption window、stale/recovery 和 freeze identity（`evals/skill-evaluation/trial-manifest.md:1-9,11-88,90-148`）；`trial-ledger.md` 已规定 append-only run/review/outcome/process/balancing、correction、stale/recovery/rerun、exposure 分母和未知边界（`evals/skill-evaluation/trial-ledger.md:1-18,20-57,59-143`）。

因此本轮撤销“当前 protocol `semantic-stale`”这一结论，改为 `no-proposal`。历史 `post-iterative-theory-skill-impact.md` 只能作为当时发现与修复来源，不能继续作为当前状态证据。仍需保留的 unknown 是：各旧 round 的冻结 card/manifest 是否已经按现行 protocol 重发，以及历史 run 是否具备新的 card/ledger 记录；这属于旧证据 standing 和是否重跑的问题，不是当前 protocol 设计缺口，也不是把 protocol 语义复制进 8 个 skill 的理由。

## Unknown

- **实际激活是否在所有入口都自足：** 当前 run 只能支持有限行为观察；模型、harness、权限、workspace、完整上下文和载体激活隔离并未在所有专项中独立核实。不能把“本次输出未回读 P/theory”推广为所有安装/加载环境的永久保证。
- **portable 晋升条件：** 尚无某个通用 skill 已满足稳定的脱项目可用性、外部消费者契约和匹配行为收益证据；因此 `skills/` 为空是当前证据下的保守状态，不是“永不晋升”的决定。
- **生命周期净收益：** 现有专项评估没有为 7 个通用载体建立统一的 matched improvement 或长期回归结论；planning-inbox round 2 有 output-level `boundary-supported` qualifier，round 3 的结果是 `retain as project-local incubating / behavior-observed / adapt-and-observe`，而不是普适接受（`planning-inbox-round-2-synthesis.md:34-36`；`planning-inbox-round-3-synthesis.md:5-13,17-25`）。
- **理论与研究引用的未来漂移：** 当前链接和 standing 可重建，但理论、protocol 或目录变更后仍需按迭代闭环标记 stale、重新 review 和按风险重跑；不能仅凭现有 hash/validator 假设语义仍未变。

## 最小后续建议

1. 保持 8 个正文的单一 canonical 位置在 `.agents/skills/`，不要创建镜像 `skills/` 副本。
2. 保持当前 protocol/manifest/ledger 作为现行投影；由 workflow owner 为旧 round 判断是否需要按当前 card/ledger 规则重发或重跑，再为需要晋升的候选建立脱项目事实的 portability probe、matched baseline、边界和回归证据；在此之前对 `skills/` 保持 `no-proposal`。
3. 真实 dogfood 优先观察 `planning-inbox` 的 source 保真、history-before-clear、owner unknown、候选路由不冒充 owner/record、hold 与 active goal safe point；任何复发先回到该 skill 的最小 delta，不自动扩大 theory 或目录结构。
4. 继续用 validator 和 `git diff --check` 做机械门槛，但不把它们提升为 skill 行为或接受证据。
