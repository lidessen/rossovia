# Rossovia — Skills

[English](README.md)

> **Rossovia** 致力于让生产性 AI 成为共同、开放、可替换的能力；
> 本仓库收录其当前方法。

“Rossovia”是[当前采用、仍可修订的项目名称](design/FOUNDING-IDENTITY.md)；`rossovia` 仓库仍只是它的一个
工作界面。本仓库包含用于 AI 辅助开发的 [Agent Skills](https://agentskills.io) 和实验性
Work Cell。它只是项目的一个工作界面，而不是整个项目、模型提供商或不透明的
AI 平台。它的语义根是单行的[原则序列](principles/SEQUENCE.md)；每个 P-ID
都有一份持续演进、来源可追溯的[解读](principles/interpretations/)，每个
skill 则是在具体语境中对所选条目的表达。

项目的[生成系统模型](design/decisions/043-generative-system-and-human-governed-autonomy.md)
把这些部分理解为“现实与实践 → 原则 → 通用方法 → 具体情境中的临时组织 →
实际工作与效果”，再由经验证的实践返回认知与修正。它的长期方向是受人治理的
运行自治：Agent 最终可以在已接受的边界内感知、提议、组织和执行，但不能为
自己授予目的、权力、事实采纳权或重大结果的验收权。

项目的[创始使命](design/FOUNDING-MANDATE.md)是使生产性 AI 成为广泛可及、
开放、可替换的公共能力：让普通人能以经济的开源模型工程系统完成有边界的
生产性工作，并以具体证据而非对不透明平台主张的依赖来证明能力。它的伦理
边界是解放而非攫取：人和 AI 的能力都不得被组织成不受问责的剥削来源。

从[创始使命](design/FOUNDING-MANDATE.md)开始，可以理解项目为何存在；阅读
[运行协议](design/operations/OPERATING-PROTOCOL.md)，可以了解经人授权的工作
如何推进；也可以直接从下方活跃 skills 中选择一种具体方法。

## 使用 Rossovia

- 在本仓库中完整实践项目的运行、验证与演进体系；
- 向其他项目独立安装一个 Skill，针对性采用一种方法；
- 用 coding agent 打开本仓库，把它作为进入其他项目的工作台。

使用工作台时，直接告诉 Agent：

```text
初始化 Rossovia 工作台，我的日常工作区在 ~/workspaces。
把 ~/client-work 加为另一个工作区根目录。
登记 ~/workspaces/meowask，并保留 meowask 和 survey 两个口头别名。
记住：跨项目遇到稳定、有边界的任务时，优先考虑 Work Cell。
仅在本机，原生 sub-agent 提供必要订阅能力时优先使用它。
显示适用于 survey 的偏好。
继续 survey。
显示所有已登记项目中正在进行的工作。
```

仓库指引会把这些意图转换为有边界的 `scripts/rosso.py` 操作。登记时如果无法
从仓库提供方验证稳定身份，Agent 只追问这个缺失值。它不会扫描未明确给出的
主目录，不会自动登记扫描到的仓库，也不要求使用者记住命令参数。

如果旧版本已初始化 `~/.atthis`，可以直接让 Agent“迁移 Rossovia 工作台”，或在
普通初始化前运行 `python3 scripts/rosso.py migrate`。迁移会保留旧来源并写入
回执，不会维持两个可写 home。

在自动化、调试或没有 Agent 的环境中，仍可使用等价的手动入口：

```sh
python3 scripts/rosso.py init --workspace-root ~/workspaces
python3 scripts/rosso.py root add ~/client-work
python3 scripts/rosso.py project list
python3 scripts/rosso.py resolve survey
python3 scripts/rosso.py preference list --project survey
```

工作台将稳定项目身份与仓库名、口头别名和本机路径分开。它不会把本仓库变成
全局任务板，也不会仅凭定位结果取得另一个项目的执行权。显式个人偏好与项目
共同约束、本机覆盖分别保存；未经人确认，推断出的 memory 不会成为生效偏好。

## 仓库地图

| 路径 | 负责 | 不负责 |
|---|---|---|
| [`principles/`](principles/) | 单行原则序列、解读、研究、候选及审议/采纳证据 | skill 工作流或项目执行 |
| [`skills/`](skills/) | 当前可安装的方法论与行为表达 | 它们所表达的语义来源 |
| [`packages/work-cell/`](packages/work-cell/) | 通用的有边界 Agent 运行时、可选适配器与实验性研究实现 | 规划、理论或人的验收 |
| [`packages/cognition/`](packages/cognition/) | 领域声明的渐进形成、来源与认知工件谱系、采纳证据和可重建检索投影 | 通用固定认知层、领域解释、模型执行或采纳权威 |
| [`scripts/rosso.py`](scripts/rosso.py) | 可迁移的项目身份、经验证的本机工作区定位与显式分域个人默认 | 任务调度、推断偏好、目标项目事实或执行权 |
| [`site/`](site/) | 静态公共主页和可复现的文档投影 | 源事实、项目身份或托管权威 |
| [`design/`](design/) | 已接受的架构、决策、运行设计和保留的设计研究 | 实时任务状态或原始运行证据 |
| [`regeneration/evaluations/`](regeneration/evaluations/) | 持久的行为与边界评估 | 治理设计或原始运行权威 |
| [`chronicle/`](chronicle/) | 保留来源的观察回执与纠正链 | 主张、决策或通用活动日志 |
| [`operations/missions/`](operations/missions/) | 活跃跨会话任务的返回义务 | 待办列表、调度器或 Git 历史副本 |
| [`development-log/`](development-log/) | 经整理的开发检查点摘要与方法反馈 | 一手验证证据 |
| [`archive/`](archive/) | 以只读为主的历史载体与已取代方法 | 当前安装目标或治理指导 |

## 活跃 Skills

| Skill | 命令 | 用途 |
|-------|------|------|
| [principle-cultivation](skills/principle-cultivation/SKILL.md) | `/principle-cultivation` | 原则序列的自身验证守护者。先保留带引文的研究，再提出候选、召开选择性的 P-ID 审议，并试行由人指定的替代项；只有经人批准的采纳才能进入核心。 |
| [context-engineering](skills/context-engineering/SKILL.md) | `/context-engineering` | 依据真实运行时，判断权威项目信息如何在能够改变行动的时刻抵达 Agent，而不预设固定层级或文件名约定。 |
| [improve-agent-workflow](skills/improve-agent-workflow/SKILL.md) | `/improve-agent-workflow` | 定位现有项目中真实的 Agent 工作失败，修改最小的责任界面，并通过日常 Agent 入口验证改进。 |
| [skill-engineering](skills/skill-engineering/SKILL.md) | `/skill-engineering` | 设计、改写、审查和测试能改善重复性 Agent 行动的 skills。为每个目标 skill 形成所选的原则序列表达小组，携带可单独安装的序列快照，并要求行为证据而非提示词修辞。 |
| [disciplined-development](skills/disciplined-development/SKILL.md) | `/disciplined-development` | 在开发任务之下应用轻量的证据、范围与测试价值纪律，而不另建一套方法论工作流。 |
| [practice-cycle](skills/practice-cycle/SKILL.md) | `/practice-cycle` | 将一次已观察到的非平凡实践转化为已定结论、下一项最小测试，或转交给尚未解决判断的责任方。 |
| [form-guidance](skills/form-guidance/SKILL.md) | `/form-guidance` | 在实施前判断一个重复性需求应以 skill、决策记录、运行时、投影、有限期任务还是无需新增形式来存在。 |
| [naming-and-articulation](skills/naming-and-articulation/SKILL.md) | `/naming-and-articulation` | 为共享项目概念命名，定义其可操作边界，将解释放在正确的来源处，并拒绝不必要的术语。 |
| [work-estimation](skills/work-estimation/SKILL.md) | `/work-estimation` | 在将任务转换为模型预算、时间或成本前，恢复必要工作及其探索分支。 |
| [model-evaluation](skills/model-evaluation/SKILL.md) | `/model-evaluation` | 通过条件匹配的重复真实任务，形成带证据、特定于任务的能力画像，不把模型名称或单次结果当成事实。 |
| [task-shaping](skills/task-shaping/SKILL.md) | `/task-shaping` | 判断单项任务是否适合保守的 Agent 执行包络、需要保护、能够在不丢失整体的情况下转换，或应当升级处理。 |
| [systems-engineering](skills/systems-engineering/SKILL.md) | `/systems-engineering` | 在具体约束和可接受剩余风险下，把会犯错的人、Agent、软件与组织部件组成并持续修正为足够可靠的整体。 |
| [strategic-advisory](skills/strategic-advisory/SKILL.md) | `/strategic-advisory` | 基于阶段证据准备供人审议的 Strategy Case；它连接长期方向、中期能力和短期任务候选，但不自行作出承诺。 |
| [artifact-organization](skills/artifact-organization/SKILL.md) | `/artifact-organization` | 审计工件的角色和路径是否仍体现已接受的设计；只有存在实质缺口时才执行一次最小的组织转换。 |
| [structural-refactoring](skills/structural-refactoring/SKILL.md) | `/structural-refactoring` | 在保留已声明行为、调用方影响和验证权威的前提下，跨有意义的边界重新组织代码。 |
| [visual-design](skills/visual-design/SKILL.md) | `/visual-design` | 从内容、受众和行动出发设计或审查视觉工作；继承或形成项目方向，但不强加可移植的固定风格，也不声称已经得到人的验收。 |
| [code-review](skills/code-review/SKILL.md) | `/code-review` | 对照已接受意图和实际影响范围审查代码变更，只报告有来源支撑的失败路径，并将编排与合并权留在外部。 |
| [project-cognition](skills/project-cognition/SKILL.md) | `/project-cognition` | 当后续重大任务需要复用项目理解时，建立或选择性刷新带来源、无事实权的工作模型。 |
| [agent-environment](skills/agent-environment/SKILL.md) | `/agent-environment` | 跨设备和工具审计、建立、调和、验证或迁移个人的非敏感用户级编码 Agent 工作流，不复制不透明的机器状态。 |

## 实验性运行时

[`packages/work-cell`](packages/work-cell/README.md) 是本集合独立的实践与评估
单元。其核心会运行一个由调用方准备的、有边界的 Agent 任务，并保留已声明的
输出工件、结构化输出、终结证据、用量、成本和工作区差异。可选适配器会将原则
序列表达、实验、模型评测和审议转换为符合这一通用契约的形式；研究性实现则留在稳定运行时界面
之外。它是基础设施，不是可直接调用的方法论 skill，也没有规划、语义或验收权。

对于携带原则序列的仓库，只读 `probe` 适配器会发现宿主序列，选择并加载任务
表达，准备一个通用 Cell，并呈现可审查的理由链。精确的 JSON 接口仍保留，
用于通用运行、适配器 fixtures、配对评估和有边界的审议；参见
[决策 027](design/decisions/027-general-work-cell-core-and-sequence-adapter.md)。

[`packages/cognition`](packages/cognition/README.md) 是第一版通用渐进认知机制实验。
领域定义的形成方案把不可变来源材料经过显式、可验证的层次形成认知工件，也能
让实践结果回到较早层次重新认识。目录只是可重建的检索投影；项目、工作区、
Git、prompt、模型和任务定位都不进入核心。项目认知和 Rossovia 恢复入口是其上的
后续领域方法，而不是它的定义性 schema；参见
[决策 039](design/decisions/039-general-cognition-experiment.md)。

## 何时使用哪个 Skill？

| 如果你正在…… | 使用 |
|---|---|
| 研究重复出现的证据是否足以形成可复用的核心原则 | `/principle-cultivation research` |
| 设计、审计或验证项目上下文如何抵达 Agent | `/context-engineering` |
| 在现有项目中安装一个入口，以便从已观察行为出发改进 Agent skills、指令、工具、验证或交接 | `/improve-agent-workflow` |
| 创建、改写或进行行为测试一个 Agent skill | `/skill-engineering` |
| 为日常开发应用轻量的证据、范围、完成条件或有意义的测试纪律 | `/disciplined-development` |
| 将已完成或失败的非平凡尝试转化为下一项有边界的实践 | `/practice-cycle` |
| 判断一项能力需要 skill、记录、运行时、投影，还是无需新增形式 | `/form-guidance` |
| 为共享概念命名、定义术语，或决定解释应放在哪里 | `/naming-and-articulation` |
| 比较替代方案的真实工作、选择估计精度，或在预算前设定误差容忍度 | `/work-estimation` |
| 在代表性的真实任务上比较模型、provider、套餐、harness 或 prompt/tool 执行画像 | `/model-evaluation` |
| 判断任务对 Flash 级 Agent loop 是否可靠、是否需要验证保护、能否在保全整体的前提下转换，或应当升级处理 | `/task-shaping` |
| 设计端到端工作系统，使其在人、Agent、工具和审查部件都会犯错时仍能达到足够可靠的整体结果 | `/systems-engineering` |
| 从已完成阶段的已验证证据中准备战略方向 | `/strategic-advisory` |
| 检查项目布局是否仍符合既定设计 | `/artifact-organization audit`；仅在有实质缺口时使用 `transition` |
| 拆分模块、抽取职责或解开依赖，同时不改变预期行为 | `/structural-refactoring` |
| 为界面、文档、插图或相关产品族建立、塑造、实施或审查视觉方向 | `/visual-design` |
| 为后续重大任务建立或刷新可复用、带来源的项目认知 | `/project-cognition bootstrap` 或 `/project-cognition refresh` |
| 建立、持续更新或迁移个人 Codex、Cursor、Claude Code、skills、指令及相关工作流配置 | `/agent-environment setup`、`/agent-environment reconcile` 或 `/agent-environment migrate` |
| 审计多个已建立方法如何协作 | 先阅读项目的组织运行模型；使用拥有已观察扰动的角色，而不是新建一个通用总控 skill |

原则序列是根，`principle-cultivation` 负责维护它。**Context-engineering** 选择并
验证上下文传递，**Skill-engineering** 再生并测试 skill 表达，
**Artifact-organization** 设计项目根据地与活动架构；“整理”是一次运动，而不是
该 skill 的名称。请参阅各个 SKILL.md 了解交接信号。
[组织运行模型](design/decisions/012-bounded-adaptive-organization.md)规定这些角色
如何条件化协作；它是一份由人治理的设计契约，而不是另一个命令或中心 Agent。

## 归档

重构前的方法 skills（`design-driven`、`goal-driven`、`evidence-driven`、`reframe`、
写作 skills）、旧的 `setup-lidessen-skills` 宿主适配器、重构工作笔记、已完成
蓝图、文章和幻灯片都保存在 [`archive/`](archive/README.md)。它们是保留的证据，
而不是安装目标。仓库不再维护根目录的 `blueprints/` 任务编排工作流。此仓库的
`CLAUDE.md` / `AGENTS.md` 中 L1 指引已内联；若该投影发生改变，请编辑
[`archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md`](archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md)
并手动同步标记。

## 安装

> 维护者：不要在此 checkout 中运行 `npx skills add .` 来测试安装。它的本地
> Agent skill 路径会指向源树。请使用
> `python3 scripts/probe-skill-installation.py <skill-name>` 创建一次性、经过哈希
> 检查的打包探针。

选择前，先列出本仓库中的 skills：

```bash
npx skills add lidessen/rossovia --list
```

将一个 skill 安装到当前项目（默认作用域）：

```bash
npx skills add lidessen/rossovia --skill improve-agent-workflow
```

添加 `-g` 可进行跨项目可用的个人安装；当目标不是自动探测 Agent 时，可添加
`-a codex`（或其他受支持的 Agent）。默认的项目安装可以提交并与项目共享。
Agent 名称、安装方式、更新和移除请参阅最新的
[`skills` CLI 参考](https://www.skills.sh/docs/cli)。

## 日常使用

Skills 通常依据用户意图来选择：安装后，用自然语言向 Agent 说明所需结果即可。
内部操作名是可选控制项，不是用户必须记忆的工作流。例如：

```text
重新设计这个设置页面，让账户状态和主要操作清晰可见。
审查渲染后的文档网站，解释为什么各页面感觉不一致。
在实施新产品网站前，先建立其视觉方向。
我们的编码 Agent 总是遗漏这个仓库的范围边界。检查真实路径，并作出最小的、经过验证的改进。
这个项目 skill 产生的输出看似合理，却忽略了验证来源。修复责任界面，并通过普通 Agent 入口测试它。
在保留的真实任务上比较这两个模型执行画像，并形成有边界的能力主张；不要生成通用总分。
判断这项全仓库审计是否适合我们的 Flash 级参考 Agent；如果不适合，把它转换成不丢失整体覆盖的可靠任务原语。
```

在 Codex 中显式激活时，用 `$` 指定 skill，并可选地说明操作：

```text
$visual-design redesign this settings page and verify it in the browser
$visual-design review the rendered docs experience; do not edit yet
$visual-design cultivate a reusable direction for this new product
$improve-agent-workflow audit why agents miss this project instruction
$improve-agent-workflow improve this repository's release-note skill and verify it
$model-evaluation compare these two execution profiles for repository review work
$task-shaping decide whether this task is reliable, guarded, transformable, or should escalate
```

其他 Agent 可能通过斜杠命令、提及、菜单或仅由模型选择来提供显式激活。调用形式
属于 Agent，而不属于本仓库的可移植命令协议。如果新安装的 skill 在已有会话中
未被发现，请启动新的 Agent 会话。

在 `visual-design` 中，`design` 和 `review` 是常用途径；`cultivate` 是低频的项目
形成路径；需要方向但不实施时，可使用 `shape`。只有宿主 Agent 提供浏览器、渲染、
图像和无障碍工具时，该 skill 才会使用它们；它不会把文字描述冒充为已经渲染或
测试的工件。

## 高级操作控制

下列形式描述 skill 参数约定。请将 `/` 替换成所选 Agent 支持的显式激活形式，
或者用自然语言表达同样的意图。

```text
/context-engineering design # 设计一条从来源到 Agent 的上下文传递路径
/context-engineering audit  # 对照真实运行时审计上下文传递
/context-engineering verify # 证明任务接收并使用了上下文

/skill-engineering create   # 创建一个能改变行为的 skill
/skill-engineering rewrite  # 重新构成一个继承而来的 skill
/skill-engineering review   # 审计一个 skill 的表达与证据
/skill-engineering test     # 以行动和边界探针测试一个 skill
/skill-engineering sync-sequence-snapshot # 重新生成打包的序列快照

/improve-agent-workflow audit   # 对一个 Agent 工作缺口进行只读定位
/improve-agent-workflow improve # 应用并验证最小的责任方修改

/artifact-organization audit
/artifact-organization transition

/structural-refactoring       # 保持行为不变的结构性代码修改

/visual-design design    # 常用：创建或重新设计真实工件/系统
/visual-design review    # 常用：审查渲染后的整体
/visual-design cultivate # 低频：建立临时项目方向
/visual-design shape     # 高级：形成方向但不实施

/principle-cultivation research <question|paths>
/principle-cultivation propose <research-note>
/principle-cultivation review <candidate|sequence>
/principle-cultivation adopt <candidate>
```

开发评估运行时时，可直接运行 Work Cell 包：

```bash
cd packages/work-cell
bun install
bun run typecheck
bun test
bun run live:p23 # 需要 DEEPSEEK_API_KEY

# 从本仓库或任一子目录运行
bun src/cli.ts probe "Inspect a bounded project question" \
  --accept "Return traceable evidence" \
  --scope packages/work-cell
```

## 许可证

[MIT](LICENSE)
