---
kind: research-record
id: planning-inbox-open-source
status: settled
disposition: bounded-research-no-proposal
---

# Planning inbox：公开开源证据研究

> 日期：2026-08-24
>
> 范围：公开可访问的一手官方文档、官方项目文档和实际开源 artifact。这里的「inbox」包含快速捕获的 todo、零散想法、观察、疑问和半成形计划，不假设它们已经是承诺、目标、优先级或授权。stars/流行度只用于发现样本，不作为质量证据。本文是证据 lane，不是最终架构，也不创建 skill。

## Source claim（来源事实）

### 1. Capture、clarify 与 raw / interpreted 的分层

- GTD 的官方 workflow map 把 email、想法、文件、电话等「life's random inputs」先汇入 `STUFF`，然后依次问「What's the desired outcome?」和「Is it actionable?」，再分流到 trash、reference、incubate、calendar、next action、waiting for 或 project support。它把输入先当作待澄清材料，而不是直接当作动作或承诺。[GTD Workflow Clarifying and Organizing](https://gettingthingsdone.com/wp-content/uploads/2024/05/GTD_workflow_map.pdf)
- GTD 的 Notes/In 是「trusted, portable inbox for capturing notes and ideas to clarify later」；Next Actions 只放可见、物理的下一步动作；Projects 是需要多于一步的当前结果清单；Project Support 存放思路、细节、计划和后续行动。[Applying GTD to a Paper Organizer](https://gettingthingsdone.com/wp-content/uploads/2019/08/GT_Paper_Organizers_SAMPLE.pdf#page=5)
- GTD 明确把 Someday/Maybe 定义为「可能未来想做、当前没有承诺」的项目或动作；放入它的唯一承诺是定期复查。这提供了低摩擦捕获而不自动升格为 commitment 的正式类别。[Applying GTD to Microsoft Outlook for Web](https://gettingthingsdone.com/wp-content/uploads/2021/04/GTD_Outlook_Web_SAMPLE-A4.pdf#page=7)
- GTD 的「inbox to zero」不是要求每条输入立即执行，而是要对每封邮件决定其含义和下一步：trash/reference/incubate、do/delegate/defer，以及多步事项的 desired outcome；官方还给出两种互斥的提醒来源：email 文件夹本身，或 list manager/calendar。[Getting Your Inbox to Zero](https://gettingthingsdone.com/wp-content/uploads/2014/10/2017-Getting-Your-Inbox-to-Zero.pdf#page=1)
- 同一份 GTD 材料建议每日看 Next Actions、每周批量复查 Next Actions、Waiting For、Someday/Maybe、Projects 和 Project Support，以确认项目仍在推进，而不是每个输入都即时打断人。[Applying GTD to Microsoft Outlook for Web](https://gettingthingsdone.com/wp-content/uploads/2021/04/GTD_Outlook_Web_SAMPLE-A4.pdf#page=8)
- GTD 对日期和提醒给出反向警告：虚构 due date 会侵蚀系统信任，提醒过度会让人麻木。[Applying GTD to Microsoft Outlook for Web](https://gettingthingsdone.com/wp-content/uploads/2021/04/GTD_Outlook_Web_SAMPLE-A4.pdf#page=8)

### 2. GitHub Issues / Projects：intake、triage、canonical work 与关系

- GitHub Issues 用来追踪 ideas 和 work；官方规划指南把 issue templates/forms、issues、sub-issues、dependencies、labels、Projects 放在同一套规划/跟踪工具中。[Tracking your work with issues](https://docs.github.com/en/issues/tracking-your-work-with-issues)；[Planning and tracking work](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/planning-and-tracking-work-for-your-team-or-project)
- GitHub issue forms 可要求结构化输入（text、dropdown、checkbox、file upload），并可通过 `required`、labels、projects、assignees、type 等字段约束或丰富 intake；`blank_issues_enabled: false` 可隐藏普通空白入口，但有权限的维护者仍可看到空白 issue。[Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- GitHub 的 issue dependencies 是方向关系：`blocked by` / `blocking`，在项目板或 Issues 页面显示 Blocked；GitHub CLI 也暴露 `blockedBy` 和 `blocking` 字段。[Creating issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)
- GitHub sub-issues 把大工作分解为层级；父子关系在 Projects 中可用于视图、过滤和分组。官方文档规定最多 100 个子 issue、最多 8 层嵌套。[Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)
- GitHub assignee 的语义是说明「谁正在处理」；一个 issue/PR 支持最多 10 个 assignees，因此 assignee 不等于单一、不可争用的 claim。[Assigning issues and pull requests](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/assigning-issues-and-pull-requests-to-other-github-users)
- GitHub 可以因 bug 修复、反馈已处理或「work is not planned」关闭 issue；关闭原因本身是 workflow 的结果，不等于删除。[Closing an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/closing-an-issue)
- GitHub Projects 是与 Issues/PR/ideas 数据保持更新的可定制集合，支持表格、看板、roadmap、过滤、排序、分组和自定义字段；它是工作数据的组织/投影视图，不强制某一种方法论。[Planning and tracking with Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- GitHub Project archive 会从活动视图移除 item，但保留上下文，且可恢复；删除则从 project 中完全移除。自动归档仍保留自定义字段并可从 archive page 查看或恢复。[Archiving items](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/archiving-items-from-your-project)；[Archiving items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/archiving-items-automatically)
- GitHub 的 issue tasklist 在引用的 issue 关闭后可自动勾选；当前官方文档标注 tasklists 已 retired，sub-issues 是替代物。这说明一个 Markdown checkbox 可能只是旧的视图/投影，并不必然是 canonical task 状态。[About task lists](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-task-lists)
- GitHub 的 issue 页面支持评论、标签、assignee、milestone、依赖和 timeline/history；官方规划指南明确指出 issue history/comments 包含上下文、讨论、决策和未回答问题。[Planning and tracking work](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/planning-and-tracking-work-for-your-team-or-project)

### 3. Linear：把 triage 作为正常 workflow 之外的 inbox

- Linear 把 triage 定义为 review 新 work 并决定下一步；可能包括澄清问题、决定是否跟踪、分配 owner、设置 priority、移入后续 status。[Concepts](https://linear.app/docs/conceptual-model)
- Linear Triage 是特殊 inbox：来自 integration 或非本 team 成员的 issue 先出现在这里，review/update/prioritize 后才进入 team workflow；默认不会出现在普通 views，除非显式包含 Triage filter。[Triage](https://linear.app/docs/triage)
- Triage 的显式动作包括 accept、mark duplicate、decline、snooze。accept 可以留 comment 后移到 team default status；要求更多信息时可留在 Triage 或 snooze；duplicate 会选择 canonical issue 并转为 Canceled 类型；decline 也转为 Canceled；snooze 会在指定时间或新 activity 时回到队列。[Triage](https://linear.app/docs/triage)
- Linear 可要求 issue 在离开 Triage 前设置 priority，也提供 rotating Triage responsibility、assignee notifications，以及基于 team/status/assignee/label/project/priority 的自动化规则。[Triage](https://linear.app/docs/triage)
- Linear 的 issue statuses 从 backlog/todo/in progress 到 done/canceled；duplicate 是系统管理的独立 status。auto-close 与 auto-archive 是不同开关，archive 后仍可搜索和恢复；其文档说明 archive 只支持自动方式。[Issue status](https://linear.app/docs/configuring-workflows)
- Linear 的 issue relations 支持 blocking/blocked/related/duplicate；blocker resolved 后关系移到 Related；duplicate 会合并到 canonical issue，并以 reserved Duplicate status 保留其作为独立 workflow outcome。[Issue relations](https://linear.app/docs/issue-relations)
- Linear 的优先级是可选的 No priority/Low/Medium/High/Urgent；官方解释是过细的优先级会降低价值，必要时应使用 status 或 label。[Priority](https://linear.app/docs/priority)
- Linear 还有显式的背景 Loops，可按 schedule 或 event 触发 agent；这属于产品/runtime 提供的后台机制，不是 issue 文本或 skill prompt 自己产生的保证。[Linear Agent](https://linear.app/docs/linear-agent)；[Introducing Loops](https://linear.app/now/introducing-loops)

### 4. 实际开源 task / agent artifacts

- Beads 是实际公开仓库中的「distributed graph issue tracker for AI agents」。其 README 描述的流程是 create → dependency graph → `bd ready`（无 open blockers）→ `bd update --claim`（atomic claim，写入 assignee + in_progress）→ `bd close`；关闭后释放 blocker，新的任务进入 ready。它还提供 hash-based IDs、Dolt versioned SQL backend、sync、JSON output、audit trail、semantic compaction 以及 `duplicates` / `supersedes` / `replies-to` 等图关系。[Beads repository](https://github.com/gastownhall/beads)
- Beads README 明确要求使用 `bd ready`、`bd show`、`bd update <id> --claim`、`bd close`，并建议不要用 Markdown TODO lists 作为 task tracking；它支持 `--stealth`，可以不写入主仓库，且可在无 git 时使用 Dolt storage。[Beads repository](https://github.com/gastownhall/beads)
- Taskwarrior 的数据模型有稳定 UUID；短 ID 只是 working set 的索引，在完成/删除后会离开 working set 并可能改变，所以跨进程或同步应使用 UUID。[ID Numbers](https://taskwarrior.org/docs/ids/)
- Taskwarrior 的原生表示包括 status（pending/completed/deleted/recurring）、entry、modified、start、end、timestamped annotation、dependency UUID 和 wait；`ready`、`unblocked`、`history`、`information`、`import`、`done`、`purge` 等均是工具命令。`purge` 明确是永久、不可逆、只在本地生效的数据损失。[Task Representation](https://taskwarrior.org/docs/task/)；[task.1](https://taskwarrior.org/docs/man/task.1/)
- Vikunja 是 AGPLv3、可自托管的开源 task manager；task 页面支持 priority、assignee、comments、checklists、日期和关系。关系具有方向和对偶（blocking/blocked by、precedes/follows、duplicate of/duplicates、subtask/parent），并会在另一端自动显示相反关系。[Vikunja](https://vikunja.io/)；[Task Relations](https://vikunja.io/help/task-relations/)；[Tasks](https://vikunja.io/help/tasks/)
- Vikunja 的「Duplicate」会复制 labels、assignees、attachments、relations 等全部属性；这和 Linear/GitHub 的「duplicate 指向 canonical」是不同语义。[Tasks](https://vikunja.io/help/tasks/)
- Org mode 是官方 GNU Emacs plain-text artifact：任何 heading 可用 TODO/HOLD 等状态，agenda 可以跨多个 `.org` 文件聚合、排序和操作，支持 priority、deadline、scheduled、tags 和 clocking。[Org mode Features](https://orgmode.org/features.html)；[The Org Manual](https://orgmode.org/org.html)
- Obsidian Tasks 是公开开源 plugin：从 Markdown checklist 中跨 vault 查询任务，支持 due date、recurrence、done date、filter，并在任意 query/view 中切换状态后回写源文件。[Obsidian Tasks repository](https://github.com/obsidian-tasks-group/obsidian-tasks)
- MD Planner 是公开 GPL-3.0 artifact，以目录中的 plain Markdown 文件作为数据库；每个 entity 一个 `.md`，支持 YAML frontmatter、直接编辑、web UI、WebDAV 和可选 SQLite cache，也提供 read-only mode。它把「可读/可版本控制」和「工具加速索引」并存，而非声称单个 Markdown 文件本身提供并发事务。[MD Planner repository](https://github.com/studiowebux/mdplanner)；[MD Planner](https://mdplanner.dev/)

### 5. Agent runtime：持久化、claim/retry、interrupt、恢复和调度

- LangGraph 的 checkpointer 把 graph state 按 thread 保存为 checkpoints，支持 human-in-the-loop、time travel 和 fault tolerance；`thread_id` 是恢复指针。官方文档明确说 InMemorySaver/MemorySaver 只存在 RAM，进程重启后 checkpoint 丢失，production 应使用持久化 checkpointer。[Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- LangGraph interrupt 会保存状态并无限等待外部输入；恢复时整个 node 会从头重跑，而不是从 interrupt 行继续。因此 interrupt 之前的 side effects 必须幂等，或应移到 interrupt 之后/独立 node；官方错误示例特别指出重复创建 audit record 或 append history 会造成 duplicate。[Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- OpenHands SDK 的 conversation persistence 为每个 conversation ID 保存完整 message/event log、agent configuration、execution status、tool outputs、workspace context、skills 和 agent state；base state 覆盖写，events 按文件追加。文档强调这是为了 crash 后可恢复和高效重放。[Conversation Persistence](https://docs.openhands.dev/sdk/guides/convo-persistence)
- OpenHands TaskToolSet 给子 agent task ID，任务完成后 conversation 持久化；使用同一 ID 的 `resume` 可恢复完整上下文。Task lifecycle 明确分为 creation、running、completion、persistence、optional resumption。[Task Tool Set](https://docs.openhands.dev/sdk/guides/task-tool-set)
- Temporal 是开源 durable-execution platform，官方承诺 workflow 在 crash、network failure 或 infrastructure outage 后可在数秒到数年后恢复；这是由服务持久化 execution state、task queues、retries、signals、timers 提供的 runtime 能力。[Temporal Docs](https://docs.temporal.io/)
- GitHub Actions 的 schedule 是 runtime 触发器，官方说明 schedule 可能因负载延迟、只在 default branch 运行，公开仓库连续 60 天没有 activity 会自动禁用，最短间隔为 5 分钟。这是一个实际反例：存在 schedule 配置不等于无条件的后台保证。[Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

## Inference（基于来源的推断）

1. **Inbox 的最小义务是忠实保留输入，canonical plan/todo/goal/执行 ledger 的义务是可解释地承诺和推进。** GTD 的 Notes/In、Projects、Next Actions、Someday/Maybe 已经把「捕获」「解释」「当前承诺」「未来可能性」分开；Linear 的 Triage 则把 intake 明确放在正常 workflow 之外。因此 raw item 不应直接当成 canonical task 或 goal。
2. **raw 与 interpreted representation 应可并存且可追溯。** 原始想法/观察/疑问需要能原样回看；标题、分类、关系、priority、owner、下一步等应标作 derived interpretation，并保留 unknown/待澄清，而不是覆盖 raw。GitHub issue form、Linear triage 的「review/update」以及 GTD 的 clarify 支持这个方向，但没有来源证明任何 LLM 能始终正确解释语义。
3. **自然语言里的“想做”“也许”“应该”“帮我看看”不应自动等于承诺、优先级、授权或执行触发。** GTD 的 Someday/Maybe 明确允许「无当前承诺」；Linear 甚至可要求 priority 在离开 Triage 前显式设置；因此 prompt 只能提出候选解释，不能凭提示文本授予 side effect 权限。
4. **消费不是单一的 delete/complete。** 证据至少区分：accept→进入 workflow、snooze→延后再现、duplicate→指向 canonical、decline/not planned→有理由地取消、complete/close→工作结果、archive→从活动视图移除但可恢复、purge/delete→不可逆清除。把这些状态折叠为「已消费」会丢失后续行动、历史和审计含义。
5. **幂等、claim、重复消费与并发安全属于工具/runtime 层。** Beads 的 atomic claim、Taskwarrior 的 stable UUID、LangGraph 对重跑前 side effect 必须幂等的规定，都把关键保证落在结构化存储/操作上；skill 可以表达操作顺序、判断标准和失败处理，但不能单靠 prompt 实现原子 compare-and-set、租约、去重键、事务或 crash recovery。
6. **canonical ledger 至少需要稳定 identity、状态转换、依赖关系和 history。** Beads/Taskwarrior/Vikunja/GitHub/Linear 都有稳定 ID 或结构关系；Markdown checkbox 只有在配套 parser/app 承担这些语义时才是可查询状态。纯文本本体无法自动提供多 worker 的 claim、锁、历史事件或恢复 cursor。
7. **长期运行的“持续检查”不是 prompt 的固有属性。** Linear Loops、GitHub Actions schedule、Temporal timers/task queues、OpenHands persistence 都说明持续性来自外部 scheduler/worker/service；prompt 可以规定检查时的行为，但不能保证会被唤醒、不会漏跑、重启后从哪里继续或 side effect 只发生一次。
8. **单文件 Markdown 的合理边界更接近低摩擦 capture、人工可读 projection 或低并发个人 ledger。** Org mode、Obsidian Tasks、MD Planner 证明 plain text 可以有用地承载状态并由工具聚合；Beads、Taskwarrior、LangGraph 说明一旦需要多人/多 agent 原子 claim、依赖解锁、审计、恢复、事件追加或定时执行，就需要 parser/database/runtime 的额外语义。不能把「文件可读」推断成「文件提供事务保证」。
9. **批量澄清是减少用户干扰的 workflow 选择，不是取消澄清。** GTD 的 weekly review 与 Linear 的 triage queue 都允许先收集再集中处理；但没有来源证明批处理总是更优。应测量等待时间、误解释率和用户打断成本，而不是默认每条输入立即追问或默认永不追问。

## Project candidate（项目候选，未采纳的可检验约束）

以下只是从证据抽出的候选约束/设计问题，不能当成已经决定的架构：

- **C1 Raw preservation：** 每条 inbox capture 保留原文、来源、时间和稳定 identity；任何整理结果作为带 provenance 的 interpretation，不覆盖原文。
- **C2 Explicit interpretation boundary：** 每个 derived field（类型、主题、下一步、关系、priority、owner、授权）都能标记 `explicit` / `inferred` / `unknown`；推断不自动写入 canonical commitment。
- **C3 Decision outcome vocabulary：** 至少分别表达 keep-in-inbox、clarify-needed、someday/incubate、reference、accept-to-plan、duplicate-of、declined/not-planned、snoozed、completed/closed、archived、deleted/purged；各状态需说明是否可恢复、是否保留来源和是否触发下游。
- **C4 Canonical handoff：** 从 inbox 到 plan/todo/goal/ledger 的写入应带 source ID 和 decision record；若多个 raw item 合并成一个 canonical item，应保留 all-to-one provenance，而不是静默覆盖或重复创建。
- **C5 Claim and idempotency:** 只要存在多个 worker/agent，候选 task 必须有 stable ID、可重试的 claim/lease 或原子 claim，以及重复消费的判定键；`complete` 需要可重放、可审计，不应以“我记得处理过”作为保证。
- **C6 Dependency/priority conservatism：** blocker、parent/child、duplicate、related、priority 的推断需可回退；只有显式人类决定或规则确认才把想法升格成约束、截止日期、owner 或高优先级。
- **C7 Runtime boundary：** scheduler、wake-up、queue、checkpoint、retry、lease expiry、crash recovery、external side-effect idempotency、audit event 作为工具/runtime probe，不放进单纯 skill prompt 的保证范围。
- **C8 Markdown boundary probe：** 先把单文件 Markdown 作为 capture 或可读 projection 进行测试；当出现多写入者、并发 claim、强依赖图、长时间 history、增量查询或重启恢复要求时，验证是否需要结构化 store，而不是靠更多约定继续堆在文本上。

## Contradiction（来源间的张力/不同语义）

- **“Inbox zero”不是同一个动作。** GTD 的 inbox zero 是对每项输入作解释和去向决定；Linear Triage 的 inbox 可以长期保留、snooze 或等待信息；因此「清空视觉 inbox」不能直接等同「完成工作」。
- **“Duplicate”不是统一语义。** GitHub/Linear 把 duplicate 指向 canonical issue 并保留 duplicate outcome；Vikunja 的 Duplicate 是复制全部属性的新 task；Beads 用 `duplicates` graph link；跨系统同步不能只传一个布尔字段。
- **“Archive”与“close/delete”不一致。** GitHub archive 可恢复且保留项目上下文；Linear auto-archive 仍可搜索/恢复；Taskwarrior `purge` 则不可逆清除；因此消费策略必须明确对象、层级和恢复语义。
- **“Assignee/owner”不一定是独占 claim。** GitHub 允许最多 10 个 assignees，Linear 的 Triage responsibility 负责监控队列，Beads 才明确提供 atomic per-task claim。不能由存在 assignee 字段推断没有重复执行。
- **“Markdown 够不够”没有单一答案。** Org mode、Obsidian Tasks、MD Planner 证明纯文本可作为可用任务介质；Beads README 又明确将依赖图和持久结构化存储作为 Markdown TODO 的替代。差异来自并发、history、依赖、索引和 runtime 要求，而非 Markdown 名称本身。
- **“Skill 能否让 agent 持续运行”取决于载体。** OpenHands 的 skill 是上下文的一部分，TaskToolSet/Conversation persistence 另有 task ID 和持久化；Linear Loops、Temporal、GitHub Actions 才提供 event/schedule/runtime。把 skill 指令当 scheduler/worker 是概念越界。

## Unknown（当前证据不足）

- 没有一手来源能保证 LLM 对零散想法的整理「忠实」到什么阈值，也没有证明其不会把弱意图误升格为承诺、priority、owner 或授权；需要项目自测集和人工验收。
- 没找到一手来源为跨系统 inbox→canonical plan 定义统一的 idempotency key、exactly-once consumption 或跨 store transaction；现有系统的 claim、duplicate、archive、close 都有各自范围。
- 没有证据证明单文件 Markdown 在多进程/多 agent 并发写入时具备可靠 locking、compare-and-set、merge、event history 或 crash-safe append；MD Planner 的可选 SQLite cache 不能被推断为全系统事务保证。
- 没有证据证明任何 schedule/loop 会在所有负载、权限、分支、服务重启和网络分区条件下无漏跑；GitHub schedule 的延迟/禁用限制反而显示需要记录运行健康和遗漏检测。
- 没有统一的 priority 语义：GTD 倾向情境和定期复查，Linear 提供有限等级，GitHub 可由团队自定义字段/标签。跨系统迁移时 priority 可能丢失或改变含义。
- Beads 的 README 是实际公开 artifact 的自述，足以证明其声明的机制存在于项目界面/文档，但没有在本 lane 中独立验证其生产质量、并发故障率或与其他系统的相对优越性；stars、forks 未作质量证据。
- “秘书式批量澄清”应当何时提问、何时只保留 unknown、何时合并近重复，现有官方工具分别提供表单、triage、评论、snooze 等机制，但没有共同的语义 fidelity 标准。

## Probes（建议验证，不是结论）

1. **Raw / interpretation fidelity：** 构造混合样本（想法、观察、疑问、todo、半成形计划、明确命令），要求 agent 输出 raw 引用、derived interpretation、unknown、需要澄清的问题；人工评估是否篡改事实、是否无授权地产生 commitment/priority/owner。
2. **Batch clarification：** 对比逐条追问、定时批处理、只写 unknown 三种策略，测量用户打断数、澄清轮次、误升格率、从 capture 到 canonical 的等待时间和最终完成率。
3. **Duplicate replay：** 在消费前后、外部 side effect 前后、进程崩溃点重复提交同一 raw ID；验证只生成一个 canonical item/一个 side effect，且保留所有 provenance 和重试记录。
4. **Concurrent claim：** 启动两个 worker 同时读取同一 ready item；验证只有一个原子 claim 成功，另一个得到结构化冲突/已占用结果；再测试 lease 过期、worker crash 和人工 reclaim。
5. **Insertion during processing：** 处理一批 inbox 时插入新 item、修改旧 item、把 item 合并到 canonical；验证 cursor/版本策略不会漏项、重复项或覆盖后写入。
6. **Outcome matrix：** 对同一 item 分别执行 accept、snooze、duplicate、decline/not planned、complete/close、archive、delete/purge，检查各动作对 raw、canonical、history、依赖和可恢复性的差异是否可查询。
7. **Dependency and priority conservatism：** 给予明确与含糊的“依赖/紧急”自然语言，验证只有显式证据才创建 blocker/priority；删除 blocker 后检查 ready/unblocked 视图是否同步。
8. **Interrupt idempotency：** 在“已写外部记录但尚未 checkpoint”与“interrupt 后 resume”之间制造 crash；验证 upsert/幂等键不会重复记录，非幂等操作被阻止或进入人工恢复。
9. **Long-running recovery：** 运行 OpenHands/LangGraph 类多步任务，分别在 idle、interrupt、tool failure、process restart、workspace change 后恢复；检查 event log、execution status、tool output、cursor 和用户决定是否足以继续且不重做危险 side effect。
10. **Scheduler health：** 对 event/schedule worker 制造延迟、停机、权限失效、连续失败和重复触发；验证运行 ledger 能报告 missed/delayed/duplicate runs，而不是只依赖“prompt 应该会再次检查”。
11. **Single-file boundary：** 以一个 Markdown 文件实现低并发 capture，再逐步加入双写者、依赖、claim、history、归档恢复和大规模查询；记录何时需要 parser、SQLite/DB、锁或事件存储。比较纯文本、Org/Obsidian plugin、MD Planner 和结构化 task store 的可审计性。
12. **Cross-system translation：** 将同一个 item 在 GTD、GitHub、Linear、Beads、Taskwarrior、Vikunja 之间映射，列出状态/关系/priority/assignee/archive 字段无法一一对应的部分；禁止静默丢弃，要求显式 unknown 或 mapping decision。

## Source list / stopping note

本轮优先采用 GTD、GitHub、Linear、Taskwarrior、Vikunja、Org mode、Beads、OpenHands、LangGraph、Temporal、GitHub Actions 的官方页面或公开仓库；没有使用二手评论来证明机制，也没有以 stars 证明质量。继续检索的边际收益主要会增加相似产品，而不会解决“语义忠实度”“exactly-once 跨系统消费”或“prompt 自带后台保证”这些尚未有统一一手证据的未知，因此在保留上述 unknown 和 probes 后停止。
