# 规划收件箱

**定位。** 本文是 harness 的 living theory 子理论，表达一种处理 planning
inbox 的最小语义方法；它不是 `planning/inbox.md` 的文件规范、不是 `/inbox`
命令实现、也不预先决定是否需要独立 skill；它不是 harness base 或 runtime 协议。
未来项目意图是让
用户以低摩擦方式记录想法、观察、疑问、todo 和半成形计划，并让秘书型 Agent
忠实整理、批量暴露歧义、把具有相应 authority 的关系交给适当的 plan、todo、
research candidate、experiment candidate、incubation/planning candidate、合并、
拒绝或归档去向。该意图不构成当前行为已经存在的事实。

普通使用者和未来 skill 不需要回读 P 或本理论。P→theory 链只负责生成、审查和
修订本方法；本文件运行时不自动取得哲学序列、研究报告或 archive 的权威。

## 对象和边界

planning inbox 的对象不是一个列表、一个 checkbox、一条 Todo、一份计划或一次
Agent 回复，而是一个有边界的处理关系：在给定来源、上下文和权限内，接住一个
或一组任意语言输入，保留可重建的用户表达语义、顺序、来源与上下文，形成可审查的秘书
解释，作出可追溯的 disposition，并在适当时把关系交给目标 owner；capture 本身
不能被偷换成承诺、优先级、owner、授权、执行、完成或接受。

这段 inbox 关系至少要能回答：

- 原话或原始表达是什么，来自谁、何时、在什么上下文中，source 是否仍可回读；
- 哪些是用户明确表达，哪些是 Agent 的推断，哪些仍未知或相互冲突；
- 当前只是保留、等待澄清、候选路由、合并、拒绝、归档或其他 disposition，还是
  已经由真实 owner 接受为 canonical 对象；
- 是否有 optional/explicit handoff、handoff 的目标与 owner，以及如何回指原始输入；
- 后续纠正、重复消费、插入或合并是否保留 provenance，而不是覆盖历史。

这些是必须保持的语义关系，不是要求每个项目使用的固定字段。`raw`、`explicit`、
`inferred`、`unknown` 是可恢复和可审查的区分，不是字段合同。`raw` 在这里是语义保真的
source capture，不要求逐字记录；记录员可以修正语法、错别字和不通顺表达，但不得改变
actor、范围、否定、模态、时序、因果或不确定性。若修正可能改变语义，应保留歧义并标记
unknown 或请求澄清。一个 raw 可以有多个解释候选，但候选不因此
成为多个已接受承诺；多个 raw 可以合并到一个 canonical 对象，但所有来源、冲突
和未解决未知必须仍可追溯。相似主题、相同文件名或相同措辞不足以证明对象同一。

### 最近邻及 owner

为避免一个“inbox item”承担所有语义，至少作如下区分。下表中 handoff 以前的
四项构成 inbox 处理关系；其余是可关联的邻近对象或记录，不是对象同一性的必要
部分：

| 对象 | 它保留的判断 | 语义 owner |
|---|---|---|
| raw capture/source | 用户实际写了、说了或提交了什么，以及 source standing | 输入来源和 source 保存者 |
| secretary interpretation | 原话可能指向的对象、关系、主题、风险或问题 | Agent 作为候选解释的生产者 |
| triage disposition | 保留、澄清、路由、合并、拒绝或归档等当前处理判断 | 当前 workflow；改变承诺时须回到用户/目标 owner |
| canonical obligation | 谁要承担何种未完成义务以及何时回返 | 任务或项目的责任/接受关系 |
| Plan | 整体目标关系、义务、约束、依赖、证据和接受 | 目标任务/项目及其接受者 |
| local Todo | 执行中的局部动作或返回条件 | 当前执行方法或任务 owner |
| goal | 长期方向、成功关系、invariant 与 non-goal | Principal 或明确 goal owner |
| active execution | 某个 Run/Cell 实际做了什么及其效果边界 | runtime、Work Cell 或编排 owner |
| evidence/completion | 观察到的事实和局部 terminal condition | 观察者、Cell 或任务 owner |
| acceptance | 是否采纳候选、剩余风险由谁承担 | Principal 或明确接受者 |
| receipt/record | 输入被看到、决定被记录或效果被观察的事实 | source-native recorder |
| archive | 非 active 材料的保留、回读和纠正记录 | source/retention owner |

Agent 的解释、triage 或 receipt 不拥有 canonical obligation、Plan、goal、执行、
completion 或 acceptance；它们只能形成 optional/explicit handoff 及 provenance。
机械完成也不自动等于语义完成；review、推荐、消费和记录也不自动等于授权。

## 原始输入和秘书整理

### 语义捕获先行，解释另存

收到任意语言后，首先保留可回读的 source-faithful capture。记录员可以在不改变语意的
前提下修正语法、错别字、断句和不通顺表达；也可以按语义转折拆成片段，但要保留批次、
顺序、来源与上下文，使用户表达的语义可重建。秘书可以做轻量的转述、分段、聚类、
提取问题和标记可能的关系，但不得用摘要覆盖、添加意图或无标记地改写语义。若 source
后来被用户修改、撤回或纠正，应保留
前后关系及修订原因；不能因为新解释更整齐就抹掉旧 source。

解释中应能审查地区分下列三类语义；实现不必用这些词作为固定字段：

- **明确（explicit）：** 用户直接说出的状态、限制、请求或决定，或有可核对的
  外部 source 直接支持的事实；原话或 source 链接优先于 Agent 的概括。
- **推断（inferred）：** Agent 为了帮助整理而提出的候选对象、关系、分类、下一
  步或相似性；必须标为推断并能回到支持它的原话，不能伪装成用户意图。
- **未知（unknown）：** 无法由现有 source 判断的目标、优先级、owner、时限、
  授权、依赖、事实或接受条件；未知可以保持未知，也可以转为一组低打扰澄清。

“应该”“紧急”“以后做”“看起来像”“顺便”等语气不足以单独证明承诺、priority、
blocker、owner 或授权。秘书应忠实呈现弱语气，而不是替用户增强它；语言变得通顺不等于
语义变得更确定。用户明确
拒绝、暂缓、非任务或仅供记录时，解释不得把它升级为待办。不能判断时宁可保留
unknown 或 hold，也不要用通顺的句子填空。

### Authority 与 fresh confirmation

低摩擦不等于每条 raw 都必须重新打断用户。explicit user instruction 仍须按指令
自身的 action、scope、effect boundary 与 reversibility 解读；或既有
委派中已经明定范围、可逆性和副作用边界的 bounded delegation，可以直接授权
保存 raw、按语义转折拆分并保留可重建关系、可逆本地整理或链接、建立局部 todo、
提出合并/重复建议和执行有界检查。这些动作不需要逐条 fresh confirmation。

同一 authority 不得扩张为新的 commitment、priority、goal、owner 或 scope，
不得代行 acceptance，也不得偷渡外部或不可逆效果；需要更强语义时应回到用户、
目标 owner 或 acceptance owner。mere suggestion 或 secretary inference 只能
形成候选解释、disposition proposal、问题或 hold，不能单独授权上述更强动作。

“未确认”表示形成某种较强语义所需的 authority 或 evidence 尚缺，不表示本轮
没有再次询问用户。secretary 负责忠实解释和 disposition；destination owner 负责
canonical obligation、主线变更和语义接受；runtime/base 负责真实的 identity、
claim、并发、恢复和外部效果。

### 可合并，但不强制归一

秘书可以把多个 raw 聚成一个待澄清主题，或建议它们可能是同一个 canonical
对象；只有在对象身份和关系确实一致时才应建议合并。合并须保留每个 raw 的
来源、版本、不同语气、冲突和未解决部分，并明确“建议合并”与“已由 owner 接受
为一个对象”的差别。无法证明同一时，宁可并列或标为可能重复，不要静默去重。

### 批量澄清和低打扰

当多个输入共享同一个会改变去向的决策关系时，可以批量提出澄清。批量按 owner、
影响、承诺关系、依赖或接受条件聚集，而不是只按词面主题聚集。每组应让用户能
看到：相关原话、当前候选解释、明确/推断/未知的边界、冲突、有限的回答选项或
继续 hold 的选择，以及回答会改变什么。没有默认答案时不能用批量形式隐含默认。

低风险、可延后的内容应尽量少打断主线；高影响或会改变 acceptance、外部效果、
权限、优先级、owner 的歧义则应在合适 safe point 暴露。低打扰不是静默替用户
决定，也不是把一批未回答的输入标成已处理。

## 去向和可追溯交接

一次 triage 只说明当前处理判断，不说明目标已经完成。它可以建议或记录“留在
inbox”“需要澄清”“候选进入 Plan”“局部 todo”“research candidate”“experiment
candidate”“incubation/planning candidate”“建议合并”“可能重复”“不纳入当前范围”
“归档”等去向；这些是开放的语义例子，不是闭合枚举、
固定状态机或产品 schema。真正的去向必须由对应 owner 和其接受关系赋予意义。

当一项内容离开 inbox 的当前视图时，至少保留能够回到 raw 的来源、决定或转换
记录。改写、合并、重复、拒绝、澄清回答、移交和归档都应能解释“从哪来、为何
改变、现在由谁负责、未解决什么”。目标 source 的 canonical 语义优先于 inbox
中的便利摘要；projection、索引或记忆不能成为第二权威。若不存在覆盖该动作的
explicit instruction 或 bounded delegation，inbox 只能保留候选、待确认或 hold，
不得预先写成已授权 obligation。已有有界 authority 覆盖的可逆本地整理、链接、
局部 todo 或检查不必再次逐条确认；它们仍不能代替目标 owner 的 canonical 语义。

### Research、experiment 与 incubation candidate

这些去向不是一个含糊的“研究/孵化”桶。research candidate 只承载待调查的问题、
已有来源、候选推断、矛盾、unknown 与所需证据；experiment candidate 只承载待验证
的干预、baseline、controlled variables、configuration candidate、预期观察/证据
条件与接受条件；incubation/planning candidate 只表示尚未形成正式 research 或
experiment 关系的方向性计划，不取得 research/experiment standing。实际 research
record 的调查观察、来源核验与结论由 record/source owner 负责；实际 Run/Cell 的
observation、effect、failure、evidence 由 experiment record、runtime/Cell 与
evidence owner 分别负责。inbox 只作 disposition/handoff，不因去向名称创建实际
record 或接受结果。最小反例是：`想试 A` 可以成为 experiment candidate；实际跑 A
的观察才是 experiment/eval record，前者不能冒充后者。本文不规定评估记录的载体、
路径或 schema。每个去向的 owner 和 standing 仍由其目标关系决定。

这些去向都不能掩盖待确认承诺、绕过项目范围、接受者或权限。拒绝/不纳入和归档
同样要区分：前者是当前不承担该关系的判断，后者是材料转入非 active 的保留位置；
二者都不等于 source 被删除。

### Hold、延期与重新可见

每个仍非终结的 hold 或 deferral 都必须有可见的 reason，以及至少一种可重新看见
它的关系：依赖的 owner decision、目标 safe point、明确 return condition、下一次
获得运行机会时的 review eligibility，或 owner-defined escalation 条件。无理由地
静默延后不能算已处理。这里不规定 scheduler、轮询频率或唤醒保证；如果没有新的
运行机会，只能说该内容尚未复查，不能声称正在持续检查。

## 清空、消费、归档和完成

这些词不能互换：

- **消费（consume）：** 某个读取者看到了输入、取得了 receipt，或将其作为一次
  处理尝试的输入。它不证明路由正确、义务完成或用户接受。
- **清空（clear）：** 当前视图不再显示某项，可能只是移到另一视图或被 projection
  过滤。清空不证明 source、canonical 关系或未决问题已终止。
- **归档（archive）：** 材料不再 active，但仍按 retention 和权限可回读、纠正或
  恢复。归档不等于 complete，也不等于 purge。
- **完成（complete）：** 目标关系满足其定义的 terminal condition，并有相称证据；
  对需要人接受的关系，仍须单独取得 acceptance。
- **删除/清除（delete/purge）：** 破坏 source 或历史的动作，需要明确的权限、
  范围和保留判断，不能由通用的“清空 inbox”暗示授权。

因此“inbox zero”最多是一个视图或处理负载观察，不能直接作为项目完成、goal
完成或 acceptance 的信号。关闭、重开、取消、拒绝和已完成也必须由其拥有的
canonical 关系定义，而不是由 item 是否还在 inbox 决定。

## 计划、目标、执行记录和接受不可合并

用户可以先写一个愿望，也可以在后续明确形成目标、Plan 或局部 Todo；这不是同
一语义的不同标签：

- goal 维护长期方向和不变量；它不因一次 capture 自动改变，也不替代具体 Plan。
- Plan 维护为达到某一目标需要履行的整体义务、约束、依赖、证据和接受关系；
  它不是待处理输入队列，也不是执行拓扑。
- local Todo 只携带当前执行者的局部动作或回返条件；checkbox、转移或自报不
  能替代整个义务的完成判断。
- execution record 只记录 Run/Cell 的实际观察、效果和失败；它不产生 goal、
  obligation 或 acceptance。
- evidence/completion 说明观察到的证据和某个终止条件；acceptance 由 Principal
  或明确的接受者作出，并承担采纳及残余风险。

一个 raw 可以仍停留在 inbox，同时作为某个既有 Plan 的新证据；它也可以被确认
为新的局部 Todo，而不改变 goal。若输入会改变整体接受关系、重要约束或主线，
应把它带回 Plan/goal owner 判断，而不能由秘书的排序或最近一次写入暗中改主线。

## Active goal 中的插入和 safe point

用户可以在 active goal 处理期间继续写入 inbox。新输入到达时，当前执行者在一
个合理的 safe point 重新检查当前 goal、Plan、接受关系和新 source，判断它是：

- 保留在 inbox，带有可见 reason 和后续 revisit/return/owner escalation 关系；
- 作为不改变主线的旁证、局部 todo 或未来回返条件记录；
- 需要把某个未解决冲突带回 owner 或 acceptance 判断；
- 由用户明确切换为新的主线，形成新的 anchor；
- 因资源、权限、风险或过时条件停止、回退或请求澄清。

这些是判断关系，不是固定阶段或必须展示给用户的状态机。新输入默认不因新、
长、情绪强或词面紧急而自动抢主线；只有明确的用户切换或会改变当前接受/安全
边界的事实，才有理由重新排序或暂停。若当前执行已经进行不可逆外部效果，safe
point 还必须尊重其现有 owner、回滚能力和接受边界。

“active goal 下反复检查”在这里仅是 Agent 方法表达：当 Agent 再次获得运行
机会时，可以在约定的边界重新读 source、识别新增或修订、重建解释并记录决定；
没有新的运行机会时，只能报告未复查。hold 的 reason 与 revisit/return/owner
escalation 关系使延期可见，但不提供调度保证。这句话不声称系统会后台唤醒、拥有
持久 identity、实现 exactly-once、原子并发 claim、可靠 lease、崩溃恢复、事件游标
或不重复外部副作用；这些是未来 base/runtime 候选，当前分支不实现，也不能由本
理论的措辞提供。

## 方法、项目指令、文件、脚本和 runtime 的分界

本方法可以表达“何时捕获、怎样保留 raw、怎样标记解释、何时批量问、怎样在 safe
point 重新判断和怎样交回 owner”。不同载体的真实能力不同：

| 载体 | 能表达或承担 | 不能凭文字取得的能力 |
|---|---|---|
| 方法表达 | 判断、取舍、unknown、澄清、路由和回返原则 | 强制执行、唤醒、权限、原子性、恢复 |
| 项目指令 | 本项目选择的 source、受众、范围和授权入口 | 跨进程锁、持久 identity、外部效果安全 |
| Markdown/document | 人可读的 raw、解释、决定、来源和 receipt | 并发 claim、事务、exactly-once、可靠 checkpoint |
| script/adapter | 确定性解析、校验、哈希、投影或报告 | 自动取得语义真相、用户意图、acceptance 或 runtime liveness |
| tool/runtime/base | identity、生命周期、权限、写入原子性、并发、恢复、效果、证据持久化 | 仅因实现这些硬属性就替用户作语义决定 |

在低风险、单人单写者、人工可 review、低并发、低后果、source 可直接回读的
Markdown 边界内，可以把未来 `planning/inbox.md` 作为简洁的语义保真 capture 或其
可审阅记录。即使如此，解释也不能覆盖 raw，canonical 目标也不能只靠 inbox
视图取得第二权威。不在此处预先规定字段、标题、标识符、文件拆分或命令语法。

出现下列任一情况，Markdown 适用性就必须重新检验并考虑 tool/runtime 或结构化
存储：第二个 writer/process/Agent；需要原子 claim、lease 或事务；深层依赖、
优先级门控或跨 store 交接；长历史和增量查询；持久身份、游标、checkpoint、
重启/崩溃恢复；后台 scheduler/wake；外部不可逆效果；敏感 retention/access；
或 exact-once/idempotency、审计、合规、可靠通知成为真实要求。升级是基于风险和
可观测失败的选择，不是因为 Markdown 在形式上“不够专业”；升级后仍需保留 raw、
解释、unknown 和 canonical owner 的语义分离。

## 修订纪律和行为探针

本理论不是行为已成立的证明。格式正确、存在 source capture、一次成功整理、checkbox 全勾、
receipt 存在或视图被清空，都只能说明某个局部输出存在，不能宣称忠实、匹配改进、
完成或接受。修订时：

1. 若重复的代表性案例显示对象同一、owner、终态或去向边界判断错误，先回到
   source standing 和最近邻关系，修订本理论的最小语义；
2. 若只是某个 prompt、措辞、skill adapter 或视图使 Agent 漏标 unknown，修订
   对应方法表达或适配器，不凭一例增加全局状态机；
3. 若缺的是身份、权限、原子写入、并发、恢复、唤醒、效果幂等或证据持久化，
   记录为 runtime/base 研究，不把硬保证写进理论；
4. 若新的载体只是为了方便查看，保持 projection 与 source 的单一权威；skill/form
   是否成立由 `skill-formation`/`form-selection` 独立判断，本理论不以文件存在
   或一次行为 gap 预判；
5. 每次修订都要回看 P 生成关系、living harness theory、研究 standing 和
   archive 的历史范围，不能把 archive 病例直接升格为现行模板。

最小行为探针包括：

- 混合想法、观察、疑问、todo、半计划和明确命令，检查 semantic fidelity 以及
  explicit/inferred/unknown 是否清楚，且未自动生成承诺、priority、owner 或授权；
- 对含语法错误、错别字和不通顺表达的 capture，检查轻度规范化提升可读性但不改变 actor、
  范围、否定、模态、时序、因果、不确定性或 disposition；
- 分别给予 explicit user instruction、既有 bounded delegation 和普通 suggestion，
  检查可逆本地整理、链接、局部 todo 和有界检查无需逐条 fresh confirmation，且
  不会扩张 commitment、priority、goal、owner、scope、acceptance 或外部不可逆效果；
- 对有共同决策关系的一批输入比较逐条澄清、批量澄清和仅保留 unknown，测打扰、
  遗漏、误升格、等待和最终接受；
- 重放相同或冲突的 capture，检查不会覆盖 raw、重复生成 canonical，也能保留
  合并、重复、修订、拒绝和归档的 lineage；
- 在处理期间插入、修订或切换 goal，检查 safe point 不漏项、不静默覆盖后写入，
  且新输入不自动抢主线；每个 hold 都有可见 reason 与 revisit/return/owner
  escalation 关系；没有运行机会时报告未复查；
- 分别测试 consume、clear、archive、decline、accept-to-plan、complete 和
  delete/purge，检查它们对 source、下游触发、恢复和接受的不同影响；
- 从单写者低风险 Markdown 逐步加入第二 writer、claim、依赖、长历史、重启、
  外部效果和敏感权限，观察何时必须升级到真实 runtime/base；
- 在 idle、打断、工具失败、进程重启和用户新 goal 后观察是否会重复危险效果、
  丢失 source 或误用旧解释；没有对应 runtime 证据时，不声称已支持持续执行。

探针结果应以可回读的 source、观察、失败和接受记录为准；静态理论只能规定待
检验的判断边界，不能把这些探针预先写成通过。
