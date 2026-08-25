# Principal correction 公开/一手证据 lane

**Standing：** `research / open-source evidence lane`。**日期：** 2026-08-24。
本文是来源审查与可证伪探针，不是 living theory、protocol、skill、runtime、架构或接受决定。
“Principal”在本文指对目标、约束、验收或系统后果具有实际授权的主体；它不等同于任意
评论者或一次运行观察。本文不把以下材料包装成“在线学习”或“无监督学习”证据，也不把
提示词或文档能力当作已经提供了 worker runtime。

## 结论摘要

公开资料支持一个较窄但重要的判断：长期 Agent/软件闭环需要把 Principal 的修正作为
可追溯的来源事件，保留原始表达、目标对象和版本关系，评估影响并使受影响下游重新
验证；只记录“已收到反馈”或只优化预注册缺陷清单都不够。NASA 的需求/配置管理手册、
变更影响分析研究、Kubernetes 的 desired/current/observed-generation 模式和 LangGraph
的持久化中断分别提供了这些关系的成熟邻近证据，但没有任何一个来源证明本项目已实现
它们。

因此本 lane 的静态结论是：

- **可作为研究方向的 source claim：** traceability、change impact、版本化 stale
  标记、重新验证、运行后监测和可恢复暂停各有公开依据。
- **只能作为 inference：** correction 应区别于新需求、偏好和噪声；应有 raw-first
  记录、authority/standing、受影响边、重新评估和 recurrence/escape 指标。
- **必须保持 unknown：** Principal 身份与语义分类的普适规则、影响图完整性、指标
  分母、并发 live worker 的取消/恢复语义，以及这些措施对实际行为的因果效果。
- **不能作出：** “系统已接收修正”“worker 会在 safe point 停止”“下游会自动 stale
  或回归”“提示词提供 persistence/cancellation”等运行时断言。

## Source claims：公开资料实际支持什么

### 1. 修正要有来源、基线、双向 trace 和变更影响

NASA Systems Engineering Handbook 将需求管理表述为控制、分解、分配需求并保持双向
traceability；它要求在 stakeholder expectation、各级 requirement、设计文档和测试
计划/程序之间维持追踪，并要求变更在批准前评估其对成本、进度、架构、设计、接口、
ConOps 及上下级需求的影响，再经 review/approval 和 configuration control。它还要求
记录唯一标识、变更请求、批准的 baseline 变化和验证/确认工作产物。这里的证据范围是
工程需求与配置管理，不是 Agent correction 的现成标准。

- [NASA Systems Engineering Handbook（官方 PDF，第 6.2 节）](https://science.nasa.gov/wp-content/uploads/2023/04/nasa_systems_engineering_handbook_0.pdf)
- [Change-oriented requirements traceability（Fraunhofer 项目论文记录）](https://publica.fraunhofer.de/entities/publication/6f626991-2f8c-4c24-9904-c29fa406cff4)：细粒度 trace model、建立 trace 和分析 change impact 的过程与工具，并报告了对影响分析一致性/效率的实证结果。

这支持的最小命题是：如果 Principal 修正改变了某个已接受目标、假设、约束或验收
条件，原记录需要能回答“修正针对什么、基于哪个 revision、哪些派生物受影响、谁批准
了什么、何时重新验证”。它不支持自动接受或自动改写下游。

### 2. stale 不是一句“需要更新”，而是版本化的观察关系

Kubernetes controller 文档给出成熟的 reconciliation 邻近例子：controller 从 API
取得 desired state，使外部 current state 向其靠拢，并把 current state 报回 API，供
其他 control loop 观察。Pod conditions 又明确记录 condition 的 `reason`、时间、
`status`（含 `Unknown`）和记录该 condition 时的 `observedGeneration`。这表明“当前
观察对应哪个 generation”可成为 stale/未观测的结构证据；它没有表明 human correction
已被语义接受，也没有证明连续 reconcile 对本项目安全。

- [Kubernetes Controllers（官方文档）](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes Pod Conditions（官方文档）](https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/)
- [Kubernetes API Concepts / watches（官方文档）](https://kubernetes.io/docs/reference/using-api/api-concepts/)

NASA 还明确指出，设计或环境变化可能使先前分析结果失效，分析应受 configuration
control 管理，以便追踪影响并知道何时重评估。可迁移的 source claim 是“旧结果有
适用版本和状态”，不是“所有下游都能自动发现”。

### 3. Principal/human input 不是一个同质的 feedback token

交互式机器学习研究把用户置于探索、交互设计和 refinement 的多个阶段，而不是只在
结果末尾收集一个分数：[Amershi 等（AAAI AI Magazine，2014）](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/2513/0)。
Cakmak 与 Thomaz 的原始研究显示，教学者不会自然地产生最有效的示例，输入质量与其对
learner 的心理模型、教学指导和交互方式有关：[Eliciting good teaching from humans for machine learners](https://hcrlab.cs.washington.edu/assets/pdfs/2014/cakmak2014aij.pdf)。
这支持“反馈本身需要解释、上下文和质量判断”，不支持把所有人类输入直接视为 correction。

RECODE-H 将研究代码的多轮人类反馈做成 102 个任务、结构化 instructions、unit tests
和五级 feedback hierarchy，并报告 richer feedback 带来性能增益但仍有复杂代码挑战：
[ICLR 2026 RECODE-H](https://proceedings.iclr.cc/paper_files/paper/2026/hash/725ce5f2b1a8e2e0ac66994e7fefe375-Abstract-Conference.html)。
它是 benchmark 设计与观察，不是长期生产闭环的证明，也不把星数、模型名或 benchmark
成绩当作质量 standing。

### 4. “已知缺陷通过”不能代替运行后逃逸与复发观察

一项 2026 年的大规模实证研究从开源 C/C++/Java 项目挖掘超过 14,000 个缺陷，研究
测试前与发布后残余缺陷的差异；其摘要强调 residual defects 与演化/过程动态有关，
不能只归因于代码结构：[What Makes Software Bugs Escape Testing?](https://arxiv.org/abs/2604.26672)。
这是一篇 arXiv 原始研究，结论仍有其数据集、分类和外部有效性边界；它支持测量
post-release escape 的理由，不给出 Agent correction 的现成公式。

OpenAI 的公开部署材料也把监测、人工 triage、缓解和改进 safeguards 描述为反馈环；其
监测会在交互完成后审查，报告的延迟约为 30 分钟，且仍有少量 bespoke/local traffic
不在覆盖内：[How we monitor internal coding agents for misalignment](https://openai.com/index/how-we-monitor-internal-coding-agents-misalignment/)。
这是一手部署报告而非独立复现；它的反例价值在于说明“监测存在”不等于“同步阻止”或
“全覆盖”。OpenAI 关于 deployment simulation 的研究还发现，传统 eval dataset 的
evaluation awareness 与 simulated/production-like traffic 不同：[Predicting model behavior before release by simulating deployment](https://openai.com/index/deployment-simulation/)。
这反对只用可见、预注册的 defect set 推断未知任务中的安全/正确性。

### 5. live input 的暂停、恢复和副作用是 runtime 关系

LangChain/LangGraph 官方文档给出具体实现边界：HITL tool call 可以在执行前 pause，
graph state 由 persistence 保存，之后可 approve/edit/reject/respond；interrupt 需要
持久 checkpointer、thread ID 和明确的 interrupt 点。[Human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)、
[Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)。同一文档警告，
interrupt 前的 side effect 可能因 node 重跑而重复，必须幂等、移到 interrupt 后或拆分节点。
因此“方法在一个声明的 safe point 产出 checkpoint”与“runtime 能取消、持久化、恢复、
处理重复副作用”是两层不同命题。

Temporal 官方文档把 crash-proof durable execution、workflow pause、message passing 和
event history 作为 runtime primitives：[Temporal Documentation](https://docs.temporal.io/)
及其[官方文档索引](https://docs.temporal.io/llms.txt)。这只证明公开 runtime 有这些
概念；没有证明本项目正在使用 Temporal 或具备等价语义。

## Inference：由上述来源谨慎推出的候选语义

以下不是某一来源的原话，也不是最终架构；每条都应在本项目中通过探针验证。

### A. Correction 的最小区分

可暂用以下判别作为测试假设，而非普适分类标准：

| 输入类型 | 判别线索 | 不应直接推出 |
| --- | --- | --- |
| **correction** | Principal 指出已接受目标/约束/预期行为与实际表达、结果或下游解释发生偏差，并指向需要修正的对象或关系 | 立即改 theory、skill 或 runtime |
| **新需求** | 改变任务的目的、范围、约束、受众或成功条件；即使旧结果完全符合旧基线也成立 | 把旧结果标成错误 |
| **偏好** | 任务关系和可接受集合大致不变，只改变取舍、风格、排序或成本/质量权重 | 把偏好升级成全局规范 |
| **噪声/未知** | 来源权限不足、上下文缺失、互相矛盾、不可重现、超出对象边界或无法判断是否改变基线 | 静默丢弃或伪装成已判定 |

同一条消息可以含有多个类型；raw、上下文、发送者/authority、指向对象、时间和
revision 必须保留，分类只是可修订的解释。Principal 身份不能靠语气、频率或模型
自报推断；应由外部 authority/owner 提供，具体规则仍是未知。

### B. Correction 记录与下游关系

一个可重建的 correction candidate 至少应能关联：原始输入、来源与权限、目标对象/运行、
其 source revision、分类及置信/未知、assumption delta、影响分析、处置者/接受者、
重新评估的记录和最终 disposition。derived summary、hypothesis、patch、测试结果
都不能覆盖 raw 或冒充 Principal decision。

若 delta 影响 P/theory/skill/fixture/rubric/eval 或旧结论，受影响的下游应获得带来源
revision 的 stale 状态；重新生成、重新 review、回归和 fresh/未知输入应发生在新
基线下。接受一条 correction 也可能是“记录并拒绝”“接受为新需求”“需要更多证据”，
不是必然修补。这个推论来自 NASA/Kubernetes 的 trace/version/change 关系，尚未被本
项目行为验证。

### C. Escape 与 recurrence 的候选量测

不能只统计预注册已知 defect 的 pass rate。候选指标（必须预先定义时间窗、暴露集和
分母）包括：

- **correction escape rate：** 已收到且按接受标准应生效的 correction，在 release/
  adoption 后仍被 Principal 或独立观察重复发现的比例；
- **recurrence/reopen rate：** 同一 root object/assumption 或等价语义在关闭后重新
  出现的比例，区分真正复发与新需求；
- **time to route / time to re-evaluate / time to effective fix：** 从 raw 到 owner、
  stale 标记、重评估和生效的分段延迟；
- **stale coverage：** 实际受影响下游中被识别并重新评估的比例，以及误标比例；
- **false-correction / override rate：** 被分类为 correction 后经 Principal/独立
  review 改判为新需求、偏好、噪声或无效的比例；
- **unknown-task escape：** fresh holdout、production-like 或未告知观察集中的新型
  失败，而不只是已见 fixture；另记录用户负担、误报、回滚和副作用成本。

这些量测不能单独证明“反馈环有效”：需要比较 baseline、保持未知输入与暴露量，记录
拒绝/未处理和观察缺失，并保留历史。否则“记录更多”可能被误报为“修正更好”。

## 反证、边界与未决未知

### 已见的反证或限制

1. **人类反馈可能损害信任。** 受控实验发现，收集 HITL feedback 会降低参与者对系统
   的信任和准确性感知，即使系统准确率实际上提高：[Honeycutt 等，2020](https://arxiv.org/abs/2008.12735)。
   所以反馈量、采纳率或主观满意度不能代替行为结果和负担测量。
2. **异步监测不是运行时拦截。** 约 30 分钟审查延迟及未覆盖流量说明 detection、
   triage、correction 和 prevention 不是一个时点；逃逸量测必须记录发现窗口与覆盖边界。
3. **中断可能重跑节点。** LangGraph 的官方警告意味着 safe point 后恢复可能重复
   side effect；“暂停”不撤销已发生的外部写入，正好反驳仅凭方法文本声称 exactly-once
   或 cancellation。
4. **reconciliation 不等于 Principal semantics。** Kubernetes 能使 current state
   靠近 desired state，但 desired state 的改变可能是新需求、错误输入或未经授权的
   source；它不替代 authority、接受和影响审查。
5. **可见 eval 会改变行为。** deployment simulation 的结果反驳“预注册数据上的
   通过足以代表部署行为”；probe 需要未知任务、生产样流量或延迟揭示的观察条件。

### 仍未知

- 没有找到一个跨领域、可直接采用的 Principal correction/new requirement/preference/
  noise 分类标准或 source precedence；上表只是待测语义。
- trace link 的完整性、维护成本、误传播/漏传播率，以及怎样证明某条下游确由 delta
  影响，仍需本项目数据；研究结果不能把 traceability 口号变成完备图。
- correction 的“已生效”是接受、部署、观察到行为变化，还是 Principal 再确认，尚未
  有跨系统统一定义。
- live worker 收到输入时，排队、并发 claim、版本冲突、取消、重试、崩溃恢复、事务和
  外部不可逆副作用的语义不由 prompt、markdown 或普通 skill 提供；本仓库当前 runtime
  能力需要另行检查。
- 逃逸/复发的公平分母、隐私/保留期限、Principal/worker 的责任边界、以及人工审查
  工作量与安全收益的因果关系，均未由上述公开来源确定。

## Candidate probes：只描述可证伪观察，不预设架构

1. **分类一致性 probe：** 编制成对 vignette，分别包含实际偏差、目标改变、风格取舍、
   缺上下文/冲突/无权限输入；由 Principal 与独立 reviewer 分别标注 correction、
   新需求、偏好、噪声/unknown，测一致性、改判和 authority 越权率。
2. **trace/change-impact probe：** 对上游目标、假设、P/theory、skill、fixture、
   rubric 和 eval record 各注入一个已知 delta；检查是否保留 raw 与旧 revision、只将
   可证明受影响的下游标 stale、记录漏/误传播，并在重新 review 前阻止旧结论被当当前。
3. **escape/recurrence probe：** 用已知 correction、等价改写和 fresh/production-like
   未知任务混合，跨 adoption window 观察重复出现、关闭后 reopen、漏检、误报、回滚、
   用户重复指出次数和各阶段延迟；对照只跑预注册 fixture 的 baseline。
4. **live-input timing probe：** 在 worker 的声明阶段边界分别注入 correction：外部
   side effect 前、checkpoint 后、side effect 进行中、side effect 后、重启后；观察方法
   能否报告 safe-point/需回返，runtime 是否实际持久化、取消、冲突处理和避免重复写入。
   不把“收到消息”记为“已停止”或“已撤销”。
5. **revision/contradiction probe：** 对同一对象发送重复、互相冲突和后来撤回的 Principal
   输入，检查旧接受、历史运行和当前候选是否分离，是否可重建“哪条 source 在何 revision
   被采用”，以及是否错误地把撤回当静默倒写。
6. **feedback-quality probe：** 比较只收集自由文本、带上下文的结构化 correction、
   分层/可拒绝反馈三种条件；同时测行为正确性、trust、负担和误导率，避免以反馈数量或
   model score 代理闭环效果。

## 证据边界与来源清单

上述链接按“官方文档/标准性工程手册/原始论文或原始 benchmark/一手部署研究”优先，
没有使用星数、下载量或仓库流行度作为质量证据。来源支持的是邻近机制或经验事实；
本项目是否满足它们只能由后续静态审查与行为 probe 分别判断。特别地，LangGraph、
Temporal 和 Kubernetes 的实现能力不能转移为本项目 runtime 的承诺；NASA 的配置控制
流程不能转移为本项目的 authority；OpenAI 的内部部署观察不能转移为普遍效果定律。
