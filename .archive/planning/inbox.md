# Inbox

> 这是现行低摩擦 pending raw capture 面。这里的内容只表示用户输入的语义保真 capture 已被记录，
> 不表示已经解释、纳入计划、确定优先级、授权执行、完成或接受。pending 清除前，
> 必须在 `planning/inbox-history.md` 留下可回指 source 与来源的处理回执。

记录的首要目的，是保留用户已经表达过的观点、想法和思辨，避免用户以后因没有记录而重复表达。
是否成熟、正式、值得研究或应进入设计，不是 capture 的前置条件；这些只影响后续处置，不影响先记录。

## 未整理

当前有 12 条 pending raw。批次 `IN-2026-08-24-001` 已在
`planning/inbox-history.md#rcpt-2026-08-24-001六条长期方向的秘书处理` 保存逐字 raw、
处理回执与 lineage，并以独立 clear 事件从本视图移除；这不表示候选已完成或接受。

### IN-2026-08-26-014A

来源：当前对话；这是对文档组织、设计流程和审计边界的观点性输入，尚未形成正式的信息架构方法或接受决定。

原文（按语意修正断句）：

> 设计 review 应直接看 design 文档；要看怎么 plan 就看 plan 文档。现在的文档管理仍然乱且复杂。
> 设计文档就应该放在 design 目录下；如果还不是最终稿，可以用前缀或其它清晰标记标出，而不是引入一大套
> candidate 流程。流程设计主要考虑两个方面：一是实用、好用、有效；二是是否有审计需要。每种形式和步骤
> 都应该有明确目的；如果只是因为“可能大概应该这样”或因为别的系统这么做，就很容易变成形式主义和繁文缛节。

当前 disposition：`raw-capture / design-method-and-information-architecture-input / process-pending`。

当前未知：设计正文、执行计划、研究材料、审计回执和历史资料的最小边界；Draft/正式稿/替代稿的最小标记；
哪些审计关系不可由正文或版本历史重建；当前 records、index、readiness 和 candidate 载体中哪些需要保留、
合并、降级或归档。该输入不自动接受现有 layout，也不授权批量迁移或删除。

### IN-2026-08-26-015A

来源：当前对话；这是对 planning inbox 使用范围的通用规则输入，尚未形成正式 harness/runtime 机制。

原文（按语意修正语法）：

> 以后类似的、带观点性质的、想法性的和思辨性的内容，都要先记录下来。

当前 disposition：`raw-capture / capture-practice-input / process-pending`。

记录目的：先保留表达，避免用户以后重复说明；不以内容成熟度、正式性或是否已有去向决定是否 capture。

当前未知：哪些内容算“类似”、记录的最小粒度、何时从 raw capture 进入 theory/design/research/plan，以及如何
避免“先记录”本身变成无边界的永久资料堆。当前只记录为低摩擦 capture 规则，不创建新的全局 registry、状态机
或强制 runtime hook。

### IN-2026-08-26-016A

来源：当前对话；这是对“记录”目的和 capture/处置边界的直接纠正。

原文（按语意修正语法）：

> 我的观点让你记录，不是要你先考虑它成熟不成熟、正式不正式；我担心的是已经说过的内容没有任何记录，
> 以后还得再说一遍。记录首先是为了保留记忆，后续是否成熟、正式、进入理论或计划是另一件事。

当前 disposition：`raw-capture / memory-preservation-rule / process-pending`。

明确边界：capture 不以成熟度、正式性、优先级、owner、接受关系或是否已有 canonical 去向为前置条件；
这些关系只在后续整理、研究、设计或计划 handoff 时判断。当前不因此创建新的全局 registry、状态机或 runtime hook。

### IN-2026-08-26-017A

来源：当前对话；这是对当前项目优先级、工作流重建和 WorkCell 阶段边界的总要求。

原文（按语意修正断句）：

> 暂时不推进 WorkCell。当务之急是对目前已有的工作成果和之前的工作历史做总结、回顾和改进；当前成果
> 还没有达到满意程度，需要先梳理一套更合理的工作流。
>
> 不管工作流是正式的、试行的，还是只停留在想法阶段，都要坚持“实践出真知，实践是检验真理的唯一标准”。
> 这意味着不要等形成正式文档后才推行，可以边实践边修正；敏捷开发取代瀑布式开发的道理也在这里。
>
> 需要发动多个 agent，全面整理更合理的工作流：把简要版本放在 `AGENTS.md`，详细版本放在 harness 文档；
> 再整理这条工作流上的 skills，明确 skills、harness 文档和理论文档的边界；基于这套工作流重新设计项目结构，
> 迁移文件、形成更多 skills 和文档，之后再设计并实现 WorkCell。
>
> 需要先为“到 WorkCell 设计和实现之前”的工作规划一个 plan，包括 agent 数量、分工和推进方式；这是第一阶段，
> 第一阶段的目标是梳理下一阶段可用的工作流。

当前 disposition：`raw-capture / workflow-reconstruction-and-pre-workcell-plan / process-pending`。

明确边界：WorkCell 设计和实现暂不推进；本输入只要求形成并实践第一阶段工作流，不自动接受现有结构、skills、
理论或 harness 文档的当前归属，也不直接授权批量迁移、创建 skill 或实现 WorkCell。

### IN-2026-08-26-006A

来源：当前对话；这是对信息管理、文档生命周期和 archive 价值的新 research input，尚未形成正式方法、
生命周期协议或接受决定。

原文（按语意修正断句）：

> 需要一个信息管理方法：归档的文档不是遗忘了，还是有它的价值的；需要研究如何发挥归档文档的价值，
> 还有进行中的文档、过时的文档，如何保鲜、保证时效性。这是一个值得研究但是不紧急的话题。

当前 disposition：`raw-capture / research-candidate / user-marked-non-urgent / process-pending`。

当前未知：archive 的发现、引用、复用和失效边界；进行中、current、stale、superseded、archived 的最近邻；
时效性由谁判断、以什么 source/revision/trigger 回写、何时重审或归档；真实 consumer、owner、证据和最小研究
范围均未知。用户明确标记为值得研究但不紧急，不因此进入当前执行波次。

### IN-2026-08-26-008A

来源：当前对话；这是对信息表达浓度、归档和不同使用场景的新概念输入，尚未形成正式理论、方法、字段或
接受决定。

原文（按语意修正断句）：

> 可以把信息的“干燥/湿润”理解为信息的脱水/补水。信息用于不同场景时，所需的干燥程度不同：面向人
> 阅读时需要比较湿润，可能需要修辞、上下文和更完整的表达；归档时不一定要保留原始表达，只要保留
> 信息本身，就可以进行干燥、脱水处理，以减轻项目重量。

当前 disposition：`raw-capture / candidate-concept / process-pending`。

候选最近邻（推断，不是用户已接受的归属）：`form-selection`、`dual-audience-expression`、`human-writing`、
`agent-expression`、`planning-information-architecture`，以及 archive/freshness 信息管理研究。

当前未知：干燥处理与有损删减的边界；哪些 source、lineage、authority、限定和不确定性必须保留；归档后的
信息能否按需重新“补水”到不同受众/任务视图；干燥程度应作为形式选择中的连续判断、生命周期策略，还是
两者的组合；压缩后的检索、复用、时效和纠错成本如何验证。当前不创建 `dryness` 字段、枚举、压缩器或
归档 runtime。

### IN-2026-08-26-018A

来源：当前对话；这是对前一版 workflow 设计及其启动方式的直接否定与重新建模提示。

原文（按语意修正断句）：

> 打回重来。现在遇到的问题类似“引火”或“引信”问题：就像氢弹需要原子弹引爆；更接近的例子是，
> 中华人民共和国建国需要一个临时的筹备委员会或过渡政府。

当前明确输入：不能直接把最终 workflow design 当作当前工作方式；需要先寻找一个能够把已有成果组织起来、
启动第一轮实践、承担临时协调与边界控制，并在条件成熟后向正式结构交接的过渡机制。

当前 disposition：`raw-capture / workflow-bootstrap-and-transition-layer / process-pending`。

候选解释（Agent 推断，不是用户已接受的正式命名或设计）：该机制可能承担成果盘点、临时编组、启动实践、
最小授权、反馈收敛和交接退出；它不应自动变成永久 workflow、总控 Agent、scheduler、runtime 或第二份
canonical authority。

当前未知：过渡机制的真实对象和 owner；它与现有 goal/plan、Main、sub-agent、records 和最终 workflow 的
最小边界；何种实践结果足以触发交接；如何防止过渡层临时存在后固化、膨胀或成为新的流程负担。该输入要求
打回上一版工作流方案重新建模，不自动接受现有 `design/harness-workflow.md` 或 `planning/plan.md` 的当前
启动结构。

### IN-2026-08-26-019A

来源：当前对话；这是对过渡层、临时委员会、正式 design 和 skill 前置关系的直接纠正。

原文（按语意修正断句）：

> 启动的点火装置设计得还是有问题。临时委员会本来就是照着正式形式去组织设计的，现在显然没有任何设计
> 和 skill 指导，所以出现了不少问题。比如 `harness-workflow` 的设计问题就比较多。它能算正式 design
> 吗？为什么 design 里面会有“为什么这次要重写”之类的表述？即使要写，也应该放在背景介绍部分。由此
> 可以判断，前置的筹备工作实际上没有做好。

明确纠正：临时委员会不是免设计的临时拼装，而是正式组织形态的受限、可退出实例；临时只描述生命周期、
授权和适用范围，不取消角色、对象、权责、流程、交接和 skill 指导。正式 design 应保持干净的规范性主体；
历史、重写原因、审计过程和证据回顾应进入背景、research 或 records，不混入 design contract。

当前 disposition：`raw-capture / provisional-organization-design-and-skill-preparation-correction / process-pending`。

当前未知：正式组织形态的目标对象、角色/权责、skill 边界、临时实例与正式形态的继承/裁剪关系、设计接受者、
试行配置、退出和回滚条件。该输入要求重新做 design brief、概念与边界分析、skill 形成前置和正式 design 草案；
不接受当前 `design/harness-workflow.md` 为正式 design，也不授权 WorkCell 实现。

### IN-2026-08-26-020A

来源：当前对话；这是对临时筹备项目的组织形态、素材组建和生命周期的补充要求。

原文（按语意修正断句）：

> 我的建议是在一个临时筹备目录下组织你需要的东西。当然，这个临时筹备目录最后是要保留归档的。
> 这个筹备项目应该是从现有的所有素材中拼凑出一套完整的班子。

明确要求：临时筹备目录不是零散资料夹或用完即删的临时区，而是一个有边界、有 owner、有交接和归档出口的
临时筹备项目。它要盘点现有理论、文档、skills、脚本、评审结果和可用 Agent 能力，按正式组织所需的角色、
职责和相互制约关系形成一套能够实际工作的临时班子；“完整”指任务所需责任覆盖完整，不指把所有素材都纳入。
筹备项目结算后保留为只读归档，供复盘、来源解释和失败路径恢复，但不再作为当前 authority。

当前 disposition：`raw-capture / temporary-organization-assembly-and-retained-archive / process-pending`。

当前未知：正式组织的最小角色槽位、各角色的权责与独立性、现有素材到角色的承接关系、能力缺口、临时班子的
组成与验证方法、正式设计的交接条件，以及归档后哪些内容可被按需读取。该输入不授权把全部素材复制进筹备目录，
也不授权 WorkCell 实现。

### IN-2026-08-26-021A

来源：当前对话；这是对“临时班子”实际载体的直接纠正。

原文（按语意修正断句）：

> 临时班子的内容实际应该是 skills、`AGENTS.md` 之类的东西。

明确纠正：组建图、设计简报和盘点表只是筹备项目的后台材料，不能被当成班子本身。临时班子应由能够被
Agent 实际加载和执行的载体组成，至少包括临时项目自己的 `AGENTS.md`、选定的 `.agents/skills/`、必要的
脚本/工具及其边界说明；这些载体要按正式组织的角色和权责组成可运行配置，不能只在文档中描述“应该有谁”。
临时载体可以是现有 canonical skill 的有界项目适配或真实的新 incubation skill，但必须保留来源、依赖、
允许效果、失败边界和归档/晋升关系，不得无理由复制 canonical 正文。

当前 disposition：`raw-capture / executable-temporary-committee-carriers / process-pending`。

当前未知：临时 `AGENTS.md` 的最小指令、需要实际加载的 skill 集合、哪些已有 skill 直接复用或需要项目 adapter、
必要工具的最小集合、临时载体和正式载体的单一权威关系，以及如何在归档后按需恢复而不污染当前入口。

### IN-2026-08-26-022A

来源：当前对话；这是对临时班子工作单元位置的直接纠正。

原文（按语意修正断句）：

> 临时班子目录放在根目录。

明确纠正：临时班子不是 planning 的子资料面，而是项目根目录下能够被 Agent 作为一个临时项目进入、加载和
执行的工作单元。其实际载体仍是临时 `AGENTS.md`、skills、必要工具和工作材料；`planning/` 只保留当前 plan、
standing、过渡触发和审计记录。筹备项目结算后，从根目录整体转入保留归档。

当前 disposition：`raw-capture / root-level-temporary-project-boundary / process-pending`。

当前未知：根目录临时项目的最终机器命名、与根 `AGENTS.md` 的指令叠加关系、归档后的重新进入方式，以及多轮
设计期间哪些临时载体应保留、晋升、降级或只留在归档。

### IN-2026-08-26-023A

来源：当前对话；这是对临时班子 skill 组成的直接纠正。

原文（按语意修正断句）：

> 临时班子的 skills 设计明显是不对的，难道不应该是工作流中会用到的 skills 吗？

明确纠正：临时班子的 skills 不应是“组装临时班子”的元 skill 或筹备过程自我解释，而应直接装配本项目正常
工作流实际会用到的 skills，例如 capture、问题/概念、复杂度与工作量、形式选择、委派、Agent 表达、机制复核、
实践回返、skill 形成等。`bootstrap/AGENTS.md` 只负责入口、边界和按触发条件选择 workflow skills；实际 skill
语义继续由根 `.agents/skills/` 的 canonical carriers 拥有。原 `bootstrap-committee-assembly` 候选不进入实际
班子，按 `no-proposal`/归档候选处置。

当前 disposition：`raw-capture / workflow-skill-composition-correction / process-pending`。

当前未知：本项目正常 workflow 的最小 skill 集合、各 skill 的触发/排除条件、哪些 workflow skill 需要项目 adapter、
skills 与 `AGENTS.md` 的分工、按任务如何选择最小 pack，以及真实任务中 skill 激活和责任承接的证据边界。

### IN-2026-08-26-024A

来源：当前对话；这是对 `bootstrap` 对象和形式的根本纠正。

原文（按语意修正断句）：

> `bootstrap` 的内容和形式完全不对。可以理解成 `bootstrap` 里面主要就是 `AGENTS.md` + skills，就是 Agent 怎么去开发这个项目的；可以理解成这是用老的项目孵化下一代项目。

明确纠正：根目录 `bootstrap/` 不是“临时班子设计资料目录”，也不是由 brief、inventory、composition map 和
迭代日志组成的后台组织分析面。它应是一个可进入、可加载、可执行的下一代项目孵化工作单元，主体是指导 Agent
开发本项目的 `AGENTS.md` 与 workflow/development skills；旧项目现有的理论、经验、约束和工具是其来源。筹备
分析材料如果需要保留，应与可执行载体分离，不得冒充 bootstrap 的主体或运行入口。

当前 disposition：`raw-capture / bootstrap-as-next-generation-project-seed / process-pending`。

当前未知：下一代项目的最小 `AGENTS.md` 指令、skills 与项目 authority 的继承边界、哪些现有 skills 直接复用或
需要 adapter、bootstrap 的最小目录形态、旧项目到下一代项目的来源/迁移关系、辅助设计记录的归宿，以及何时能够
由孵化载体进入正式项目结构。该输入要求先重新设计 bootstrap，再决定现有错误结构的迁移、归档或删除；不授权
继续扩展当前 maps/brief/committee 形式，也不授权 WorkCell 实现。
