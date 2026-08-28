---
kind: task-requirements
id: bootstrap-seed-task-requirements-2026-08-26
status: candidate-generated
source: user-conversation-bootstrap-corrections
owner: Main
consumer: bootstrap-design-producer
acceptance_owner: unknown
---

# Bootstrap 下一代项目开发种子：任务需求

这份 brief 是给 producer sub-agent 的任务需求，不是 bootstrap 目录的运行入口，也不是正式 design。它从用户提出
“临时筹备/孵化”开始整理最近的原始要求，保留关键原话；语句只做必要的断句和语法整理，不改变语意。producer
应以本 brief、根 `AGENTS.md` 和当前项目 source 为依据重新生成 `bootstrap/`，不能把当前 bootstrap 中已有的错误
maps/brief/committee 形式当作需求或 authority。

## 一、用户原始要求（按时间顺序整理）

### 1. 先打回，重新设计点火装置

> 打回重来，我来抛砖引玉，现在遇到的问题类似引火，或者引信问题，就像氢弹需要原子弹引爆，更接近的例子是中华人民共和国建国需要一个临时的筹备委员会/过渡政府。

> 继续。

> 我觉得你的启动的点火装置设计得还是有问题，首先临时委员会本来就是照着正式形式去组织设计的，现在显然没有任何的设计和 skill 指导，所以我看到不少问题，比如这个 harness-workflow 的设计问题就比较多，这个能算正式 design 吗？为什么这个 design 里面会有类似为什么这次要重写之类的表述，我觉得即使有，也是背景介绍的部分，所以我判断前置的筹备工作实际上没做好。

含义：需要一个有设计、有 skill 指导的过渡/孵化装置；“临时”不意味着随意拼装，也不意味着可以用没有设计的
目录和文档代替组织本身。正式 design 的背景、原因和历史不能混进规范主体。

### 2. 设立临时筹备目录，并保留归档

> 我的建议是在一个临时筹备目录下组织你需要的东西。

> 当然这个临时筹备目录最后是要保留归档的。

含义：需要一个有边界的筹备/孵化工作单元；结束后保留完整历史和失败路径，不能用完删除或让历史消失。

### 3. 从旧项目素材中孵化可工作的班子

> 这个筹备项目应该是从现有的所有素材中拼凑出一套完整的班子。

> 临时班子的内容实际应该是 skills agentsmd 之类的东西。

> 现在先多轮设计和迭代临时班子。

> 临时班子目录放在根目录。

含义：筹备项目不是资料汇编；它要从旧项目已有的理论、文档、skills、工具、经验和失败中形成一套能够实际被
Agent 加载、执行和交接的开发能力。其主体载体应是根目录下的 `AGENTS.md`、skills 以及必要的执行工具，而不是
只描述“应该有哪些角色”的分析表。需要经过多轮设计、复核、修剪和迭代。

### 4. skill 必须是工作流真正会用到的能力

> 临时班子的 skills 设计明显是不对的，难道不应该是工作流中会用到的 skills 吗？

含义：不能创建一个“组装临时班子”的元 skill 来代表班子能力。应直接装配本项目工作流实际会用到的 skills，例如
接收输入、问题/概念澄清、复杂度和工作量判断、形式选择、委派、Agent 任务表达、机制复核、实践回返、skill
形成等；skills 与角色、owner、authority、acceptance 分开。

### 5. 最新根本纠正：bootstrap 是用旧项目孵化下一代项目

> bootstrap 的内容和形式完全不对，你可以理解成 bootstrap 里面主要就是 AGENTSmd + skills，就是 agent 怎么去开发这个项目的，可以理解成这是用老的项目孵化下一代项目，你能明白吗？

含义：`bootstrap/` 不是“临时班子设计资料目录”，不是 brief、inventory、composition map 和迭代日志的集合，
也不是一套描述筹备过程的后台组织分析面。它是一个可进入、可加载、可执行的下一代项目开发种子：用旧项目的
理论、经验、约束、工具和失败记录，形成指导 Agent 如何开发本项目下一代结构的 `AGENTS.md` 与 workflow/development
skills。

## 二、producer 必须实现的目标

在 producer 的 fork workspace 中，直接重新生成 `bootstrap/` 的目标内容，使其满足：

1. **对象正确：** `bootstrap/` 是下一代项目开发种子，不是临时班子分析资料夹；它指导 Agent 开发和改进当前项目。
2. **载体正确：** active surface 以 `bootstrap/AGENTS.md` 和 `bootstrap/.agents/skills/` 为主体；必要工具只能
   在确有任务需要时加入，不得用 maps、brief、registry 或复杂状态系统替代运行载体。
3. **能力正确：** active skills 来自实际工作流和项目开发工作，不是“如何组装 bootstrap”的元 skill；按触发条件
   选择最小组合，不默认全量加载。
4. **来源正确：** 旧项目的 root `AGENTS.md`、theory、current plan/ledger、现有 skills、records、evals、experiments
   和可用工具是来源；bootstrap 不取得旧项目 authority，不把孵化输出自动写成正式接受结果。
5. **开发正确：** Agent 能从 bootstrap 入口知道如何识别问题和真实场景、判断复杂度、使用 plan/todo/work map、选择
   或创造工具、委派真实独立贡献、执行最小可观察动作、复盘和回落，并将稳定结果写回正确的 project surface。
6. **结构正确：** `AGENTS.md` 保持小而可执行，不塞入历史、长篇背景、候选角色表或每轮审计；详细设计和历史应放在
   当前项目的 `design/`、`planning/records/` 或 `archive/`，按需读取。
7. **可持续正确：** 允许边实践边修正；有删减、降级、`no-proposal`、回退和归档出口；不以一次生成、validator
   通过或文件数量证明有效。

## 三、必须遵守的边界

- 不实现 WorkCell、DeepSeek Harness、runtime 或其它当前冻结的系统；
- 不修改根 canonical skills 作为本次 bootstrap 生成的捷径；重复方法必须有明确独立边界和 lineage，否则引用/复用；
- 不创建第二份 goal、plan、ledger、registry、scheduler 或固定永久 Agent 编制；
- 不把角色、skill、carrier、assignment、owner、consumer、authority、evidence 和 acceptance 混成一个状态；
- 不把 bootstrap 的存在、skill 被加载、静态检查通过或一次冷启动观察写成 skill 已激活、行为改善、责任覆盖或正式接受；
- 不静默删除现有材料。若当前 bootstrap 中的旧筹备材料不应继续属于 active surface，应给出明确的保留、迁移、归档
  或 `no-proposal` 处置和 lineage；不得让历史丢失；
- 当前设计仍需 review。producer 可以直接生成 bootstrap 候选内容，但不能宣称它已经是正式项目入口或已被接受。

## 四、期望交付

producer 应在 fork workspace 中：

1. 读取本 brief、根 `AGENTS.md` 和完成任务所需的最小当前 source；
2. 直接生成/修订 `bootstrap/AGENTS.md` 及其 active skills；
3. 对现有错误结构给出最小、可恢复的处置，不扩大到 WorkCell 或正式实现；
4. 返回：目标与场景、读取的 source、生成/修改的路径、每个 active skill 的触发边界和非目标、继承与写面、未决
   问题、证据上限、建议的独立 review 和失败回落。

返回中的“已生成”只表示 producer 在 fork 中形成了候选文件，不表示 Main 已合并或用户已接受。
