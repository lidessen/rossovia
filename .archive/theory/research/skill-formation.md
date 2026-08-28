---
kind: research-record
id: skill-formation
status: settled
disposition: no-proposal
---

# Research — Skill 的形成、边界与生命周期

**Disposition:** `no-proposal`

本研究为后续 `theory/skill-formation.md` 提供证据与区分；它不创建 skill，不修改哲学序列，也不授权运行时机制。结论是：现行哲学条目已经足以生成 skill-formation 方法，本轮没有新增或修改哲学条目的理由。

## 问题

需要回答的不是「怎样写一个格式正确的 `SKILL.md`」，而是：

1. 什么重复的 Agent 行为差距值得由一个 skill 承担？
2. skill 与普通文档、局部指令、按需 reference、工具和 runtime 的边界在哪里？
3. 何时创建、review、拆分、合并、降级或删除一个 skill？
4. 什么证据能说明 skill 改变了 Agent 行为；什么时候应保留研究而不提出 skill？

现行术语区分 **skill 方法** 与 **skill 载体**：skill 是条目在环境中生成的方法；skill 载体是在任务相关时被选择性加载、用于表达该方法并改变 Agent 重复判断或行动的 artifact。`SKILL.md` 只是当前载体实现；格式合法不等于方法成立，更不等于行为改善。

## 来源层级与限制

1. **现行语义根：** [`theory/philosophy.md`](../philosophy.md) 的哲学序列，以及 [`theory/gene-expression.md`](../gene-expression.md) 对「二→三」的说明。skill 是条目在具体环境中「冲」出的方法，不是新的条目。
2. **现行边界理论：** [`theory/harness/theory.md`](../harness/theory.md) 区分方法表达与 base：可改方法而不改变 Task、Run、effect、evidence、acceptance 等契约的，留在 skill；必须强制生命周期、权限、并发、恢复或持久证据的，属于 runtime/base。
3. **一手网络材料：** Agent Skills 开放规范只规定载体、元数据、按需加载与渐进披露，并没有证明某个 skill 的领域判断正确；其 validator 也只检查格式约束。[Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) Anthropic 的实践建议从代表性任务中的具体能力差距开始，增量构建并观察真实使用中的触发和轨迹。[Agent Skills: developing and evaluating skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills#developing-and-evaluating-skills)
4. **archive 历史证据：** `archive/skills/` 与 `archive/evaluations/` 只说明 v0.5 曾怎样尝试和验证，不继承其术语、固定 P-ID 血统、目录布局或设计结论。

外部供应商资料只作为其 Agent/载体环境里的经验，不升级为本项目的哲学依据。公开材料也不能回答本项目中新 skill 的实际收益；这必须由本项目的前向行为探针产生。

## 从现行哲学推导

skill-formation 不是从一个孤立条目直接展开，而是几组关系在 Agent 环境中的冲撞：

| 环境中的冲撞 | 相关条目 | 形成的判断 |
|---|---|---|
| 想复用成功经验 × 不能从偏好的文件名倒推真实问题 | P01、P02、P05 | 从实际 Agent 行为和具体环境形成差距，不从「想做一个 skill」开始 |
| 需要稳定方法 × 每次激活都会占用注意和上下文 | P06、P09、P11 | 只保留改变主要判断的最小表达，局部问题不因刚被发现而升级 |
| 概念和触发名必须可被发现 × 名称不能代替对象 | P14 | 先定义行为对象、包含与排除，再命名 skill 和触发 |
| 表达看起来合理 × 行为可能没有改变 | P15 | 用真实任务检验行动与结果，不用文案审美代替行为证据 |
| 一次改善 × 模型、上下文和邻接 skills 会变化 | P03、P16 | 迭代 review，并以回归、降级和删除保持长期一致 |
| Agent 可被提示的方法 × 必须由机制保存的硬属性 | P04、P11、P15 | 诚实声明 skill 能做到什么；提示无法强制的属性归还 runtime/base |

由此得到：**skill 载体的准入对象是可重复、可激活、可由方法表达改变、可通过行为观察检验的 Agent 判断或行动差距。**「有一批知识」「有一个重要问题」「想永久保存一项决定」都不足以推出新的载体。

## 什么重复行为差距值得成为 skill

「重复」指同一类判断关系在多个任务或可合理预期的多次使用中重现，不要求提示词逐字相同。一个真实失败加一组代表性任务可以形成早期候选；单个轶事不能单独建立普遍改善主张。

创建候选 skill 前，以下条件应同时成立：

1. **对象成立。** 能指出谁在什么环境里，对哪个对象做什么判断或行动；不能只说「写得更好」「更智能」。
2. **差距有据。** 有真实任务、用户纠正、失败轨迹或可复现 baseline，显示 Agent 缺少方法、上下文选择或稳定行动路径。
3. **类可复用。** 差距属于一类任务而非一次交付；其共同关系可被说明，而不是把多个主题装进同一目录。
4. **触发可辨。** 正例、反例和最近邻都可以描述；Agent 有机会只看 `name`/`description` 判断是否加载。开放规范把这些元数据置于 discovery 层，因此触发边界本身是行为接口，而非包装文字。[Agent Skills specification: progressive disclosure](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx#progressive-disclosure)
5. **方法可表达。** 改变行为所需的是判断关系、步骤、示例、reference 或可调用脚本；不需要新增生命周期、效果权威、权限或恢复机制。
6. **最小形式成立。** 直接回答、现有 skill、局部指令、普通文档或 reference 不能以更低成本关闭同一差距。增加复杂度必须有可观察收益，而不是因为新形式显得完整。[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents#when-and-when-not-to-use-agents)
7. **结果可检验。** 能预先写出应触发的任务、不应触发或应转交的任务，以及可判定的成功结果。
8. **净收益为正。** 预期收益高于 discovery 噪声、上下文占用、维护漂移、安全风险和与邻接 skill 冲突的成本。

任一承重条件没有证据时，先保留 `open` 或 `no-proposal` 研究；不要为了保存洞见而制造 skill。

## 相邻形式的所有权边界

| 形式 | 它拥有的关系 | 何时优先于 skill | 它不因此拥有 |
|---|---|---|---|
| 直接回答 / 当前任务表达 | 完成一次请求所需的局部上下文和指示 | 不复用，或下次情境很可能不同 | 可复用方法、长期事实 |
| 项目局部指令 | 在整个项目/目录范围始终成立的工作边界和约定 | 规则应始终在场，而不是按任务选择激活 | 领域理论、外部事实、运行时强制 |
| 普通文档 | 人或 Agent 可回读的理论、设计、事实、决定及其来源 | 内容本身是长期语义源或需要完整论证 | 自动触发、执行、接受权威 |
| reference | 某个已激活方法按需读取的细节、变体、格式、API 或例子 | 内容没有独立触发和主要判断，或只在少数分支需要 | 独立 skill 身份、事实权威（除非它本来就是被声明的源） |
| skill | 一类任务中可重复的 Agent 判断/行动，以及选择性加载它的边界 | 方法确实需要跨任务复用且不应始终占据上下文 | 项目事实、长期决定、人类接受、运行时效果 |
| 脚本 / 工具 | 确定性变换或与外部能力的接口 | 结果需要算法可靠性、结构化 I/O 或真实外部操作 | 何时以及为什么调用它的全部语义判断 |
| runtime / base | 生命周期、因果身份、权限、并发、取消、恢复、效果边界和持久证据 | 属性在提示被忽略、模型被替换或进程重启时仍必须成立 | 领域判断质量、人类接受 |

一个 skill 可以引用文档、reference、脚本和工具，但组合不转移所有权：skill 教 Agent 何时怎样判断；脚本执行确定性步骤；runtime 强制硬边界；文档保留语义源。Agent Skills 的渐进披露只说明怎样分层装载上下文，并不允许把 canonical source 隐藏成 skill 的附属副本。[Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx#optional-directories)

## 生命周期判断

### 创建

只有上述八项准入条件都获得足够证据时，才创建 candidate skill 载体。首版只表达最小核心：可发现的触发、一个主要判断或行动关系、明确非范围、必要输入/源、行动路径、返回/完成条件和行为探针。格式校验是提交前机械检查，不是创建理由。

### Review

review 至少分开检查六件事：

1. **成立性：** 真实行为差距是否仍存在，还是已被模型、环境、现有 skill 或工具关闭。
2. **概念与边界：** skill 的对象、名称、正反触发、最近邻和唯一主要判断是否一致。
3. **形式与上下文：** 主路径是否留在 `SKILL.md`；只在特定分支需要的细节是否按需进入 reference；是否复制了外部权威源。
4. **Agent 表达：** 激活后是否给足对象、来源地位、判断标准、允许效果、未知和返回，而不是只列口号或职业角色。
5. **行为与回归：** 在代表性任务中是否改善结果，并拒绝非范围；旧能力是否退化。
6. **体系关系：** 是否与邻接 skill 重叠、矛盾、循环调用，或把自身负责的局部问题过度抬高。

使用 skill 自己 review 自己只能产生修改候选，不能单独证明设计正确；最终判断需要独立 reviewer、matched baseline 或人类接受。

### 拆分

满足下列证据时才拆分：出现两个可独立触发的主要判断；两者需要互斥或很少同时使用的上下文；失败模式与改进方式能够分别验证；拆开后调用者仍能重组结果。仅因文件长、主题多或两个小节可以命名，不足以拆分。长细节优先移入 reference。

### 合并

当两个 skills 面向同一行为对象和触发，拥有同一成功结果，Agent 经常无法区分或必须同时加载，而且没有独立的失败/验证边界时合并。共享若干术语、来源或受众不是合并理由。

### 降级

下列情形把 skill 降为更真实的形式：

- 只剩知识或例子，没有独立判断：降为文档/reference。
- 只对一个项目或目录始终成立：降为局部指令。
- 只处理一次迁移：降为有终点的计划/记录。
- 核心只是确定性转换：降为脚本/工具，并把少量调用说明留给拥有者。
- 需要强制的硬属性：转交 runtime/base 设计；不要用更强措辞伪装机制。

### 删除

当行为差距已消失、被更具体的 owner 覆盖、方法长期不触发或无收益、内容不可安全维护，或 regression 表明移除不会损害目标行为时删除。先更新 living 引用和 discovery 表面；不保留会继续误触发的兼容壳。需要历史时由版本历史或 archive 承担，不复制第二份现行源。

## 行为验证

Anthropic 对 Agent eval 的定义把 task、trial、grader、transcript、harness 分开，并建议把 code、model 和 human grader 用在各自能判断的层面；Agent 输出具有随机性，因此单次 trial 不足以建立稳定性。[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents#the-structure-of-an-evaluation) 本项目据此把 skill 验证分为以下层次。

### 对照与任务集

- **Matched baseline：** 相同模型、harness、任务材料、工具和环境；baseline 不加载目标 skill，treatment 只增加候选 skill。若不能隔离变量，结论写作「行为被观察到」，不写「由 skill 改善」。
- **正向任务：** 真实且足够困难，能暴露目标判断，而不是复述 skill 用词的演示题。
- **边界任务：** 同时包含应触发、不得触发、应由邻接 owner 处理的任务。官方 eval 实践明确指出单边任务会优化出过度触发。[Balanced problem sets](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents#going-from-zero-to-one-a-roadmap-to-great-evals-for-agents)
- **回归任务：** 保留目标 skill 已经能做的代表性任务；capability 通过后转入 regression，防止后续表达优化破坏旧行为。
- **多次 trial：** 对关键任务重复运行，区分偶然成功与稳定成功；环境隔离，避免先前 trial 的文件或历史泄漏。

### 分开验证四个接口

1. **Discovery：** 只提供 skills 元数据时，Agent 是否在正例选择它、在反例不选择它。
2. **Action：** 强制已加载 skill，检查核心判断和结果是否改善；这样可把触发失败与方法失败分开。
3. **Boundary：** 是否拒绝非范围、保持来源/效果/接受权威，并转交正确 owner。
4. **Context：** 是否只读取任务需要的 reference，能否在独立安装或真实项目上下文中恢复必要来源，不因加载过多材料扭曲主要问题。

### Grader 与主张等级

- 机械 grader 检查 frontmatter、文件存在、链接、确定性输出和可判定状态；它快速可复现，但不能判断概念与语义充分性。
- 语义 reviewer 按明确 rubric 比较来源忠实、边界、行动质量和过度设计；开放任务优先评价结果与承重关系，不固定唯一工具调用路径。官方实践也建议尽量 grade 产物而不是过度规定路径。[Design graders thoughtfully](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents#going-from-zero-to-one-a-roadmap-to-great-evals-for-agents)
- 人类负责接受目标、残余风险和是否值得长期维护；Agent reviewer 只能提供有据主张。

证据主张按强度递进：`format-valid` → `behavior-observed` → `boundary-supported` → `matched improvement` → `regression-supported`。不得跨级：一次 forward probe 最多说明相应行为被观察；没有 matched baseline 就不能归因，没有反例就不能声称边界成立。

## Archive 的吸收与拒绝

### 吸收

- [`skill-engineering`](../../archive/skills/skill-engineering/SKILL.md) 的有效核心是：从 Agent action gap 而非 skill 名开始；比较最小形式；测试 trigger、action、boundary、context；没有 comparable baseline 时不声称改善。
- [`form-guidance`](../../archive/skills/form-guidance/SKILL.md) 保留「最强 keep-as-is case」和 form/authority/reconstruction 的比较，提醒创建者先证明不新增形式为何不够。
- [`practice-cycle`](../../archive/skills/practice-cycle/SKILL.md) 保留「实际结果必须改变下一判断」和 routine one-step work 不需要循环的边界，用于 review 后选择最小修订。
- [`principle-cultivation`](../../archive/skills/principle-cultivation/SKILL.md) 保留 `no-proposal`、研究不自动获得语义权威、作者与最终决定分离；这些是抑制为了产出而强造 skill 的有效历史经验。
- 历史 probes 正确区分了 behavior supported 与 causal attribution：[`skill-engineering` harness probe](../../archive/evaluations/2026-07-09-skill-engineering-standalone-harness.md)、[`practice-cycle` / `form-guidance` probes](../../archive/evaluations/2026-07-10-practice-cycle-and-form-guidance-probes.md)、[`principle-cultivation` probes](../../archive/evaluations/2026-07-10-principle-cultivation-v2.md)。

### 修订或拒绝

- 不继承 v0.5 的固定 P-ID 血统、旧术语、portable sequence snapshot 或固定「一个 Primary、至多三个 Supporting」形式；现行血统必须从 `theory/philosophy.md` 和具体环境重新推导。
- 不把所有创建、重写、review、测试命令自动做成永久入口；命令和 reference 只有在真实使用分支需要时才存在。
- 不把「一个 skill 有一个主要判断」解释成一句口号或一个步骤。它约束的是主要行为对象和接受关系；完成该判断可以需要多步，也可以组合别的 skills。
- 不因一次成功 forward probe 声称普遍改善或替代旧方法。历史 eval 自身已经多次标注 attribution unproven，这一诚实边界应保留。
- 不把通用 form selection、实践循环或委员会式 review 全部塞进 skill-formation。它只拥有 skill 方法是否应编码为载体及其载体生命周期；相邻方法可以提供输入，但不形成第二总协调器。

## No-proposal 与待验证问题

对一个候选 skill，以下任一项成立就允许并鼓励 `no-proposal`：没有重复行为证据；现有 skill 已覆盖；局部指令或文档更真实；成功标准不可判定；硬属性属于 runtime；维护/触发成本高于收益；研究只发现了一个概念而未形成 Agent 行动差距。

本研究自己的 disposition 是 `no-proposal`，专指**不提出新的哲学条目**。它支持下一步撰写 `theory/skill-formation.md`，再从该理论创建和验证项目自己的 `skill-formation`；这两个后续产物仍需独立接受，不能由本研究自动授权。

仍待行为研究的问题：

- 不同模型与 harness 对同一 `name`/`description` 的 discovery 差异有多大；中文、英文及双语触发是否需要分别验证。
- 「一个主要判断」在什么复杂度下仍能被 Agent 稳定恢复，何时拆分优于 reference 分层。
- 用新 skills 交叉 review skill-formation 是否带来可归因改善，还是只让文案更整齐。
- 多少 matched trials 足以支持稳定性主张；应按任务后果和方差决定，不预设统一数字。
- 模型能力提升后哪些 guidance 已成为冗余；这需要定期 ablation，而不是凭主观删除。

## 结论

skill 不是保存重要内容的默认容器，而是一个有成本的、选择性激活的方法表达。形成它的最短有效链是：

```text
观察重复的 Agent 行为差距
→ 定义行为对象、触发和边界
→ 比较不新增与其他更小形式
→ 从现行哲学和具体环境推导最小方法
→ 创建 candidate skill
→ 分开验证 discovery / action / boundary / context
→ 独立 review，并按证据保留、改写、拆分、合并、降级或删除
```

没有行为证据时停在研究；没有最小形式优势时不创建；没有 matched baseline 时不归因；需要硬保证时归还 runtime。这个负向出口与创建能力同等重要。
