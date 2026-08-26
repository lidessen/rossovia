---
kind: research-candidate
id: harness-engineering-control-and-reliability
status: settled
disposition: canonical-proposal
evidence: source-observed
settlement_route: bounded-application-or-archive
owner: "unknown"
consumer: "harness-system-design (candidate)"
review_at: reopen-on-primary-source-access-or-real-reliability-consumer
---

# Harness 工程控制与可靠性收敛研究候选

lifecycle：`settled`
disposition：`canonical-proposal`
evidence：`source-observed`
system boundary：`formed`
concept boundary：`formed`
application：`not-authorized`
acceptance：`pending`。

本记录承接 inbox [`IN-2026-08-26-007B`](../../planning/inbox.md) 的用户输入。用户建议研究钱学森的
《工程控制论》，借鉴工程手段让 harness 的不稳定环节收敛为可靠系统。本记录先把它定义为待核验的
system-layer research candidate：不把书中概念直接当作本项目结论，不创建控制器、稳定性 gate 或 runtime。

## 1. 研究对象与问题假设

研究对象是 **engineering control of harness reliability**：在 Agent、模型、工具、provider、上下文、
协作、记录和外部环境都存在扰动时，如何建立可观测的状态、反馈、纠偏和回归关系，使目标行为和 guardrail
在目标场景内保持可接受，而不是只依赖 prompt 中的要求。

问题假设可以表达为：

```text
目标/接受关系
  → harness/system 当前状态
  → 扰动与不稳定环节
  → 可观测信号与证据
  → 有边界的控制/纠偏动作
  → 行为结果、残余风险和下一轮调整
```

当前已知的候选扰动包括模型随机性或漂移、provider/tool 失败、上下文和状态缺失、并行/交接污染、
review 延迟、权限与外部环境变化，以及策略或 skill revision 漂移。这些是研究问题和观察入口，不是已
确认的统一根因。

## 2. 来源与最近邻边界

### 2.1 来源地位与 source fingerprint（2026-08-26）

本轮完成了书目和可用性 fingerprint，但仍不是声称已经读完原书：

- `Engineering Cybernetics`，Hsue Shen Tsien / Xuesen Qian，McGraw-Hill，New York，1954，289 pages；
  [Google Books 的书目与目录](https://books.google.com/books/about/Engineering_Cybernetics.html?id=NfgvAAAAIAAJ)
  显示原书并列出 `Feedback Servomechanism` 章节；[WorldCat 目录](https://search.worldcat.org/title/Engineering-cybernetics/oclc/1599599)
  确认英文印刷本、1954 年和 McGraw-Hill 出版信息。
- [Internet Archive 的 1954 英文扫描条目](https://archive.org/details/engineeringcyber0000qian)保留了 289 页、OCR 和
  原版馆藏标识，但当前标为 `Access-restricted-item: true`；[Open Library edition](https://openlibrary.org/books/OL49218199M/Engineering_cybernetics)
  提供借阅入口。因此它证明了原始 artifact 可定位，不证明本次运行已经取得可逐页核读权限。
- Zhiqiang Gao 的 [*Engineering cybernetics: 60 years in the making*](https://doi.org/10.1007/s11768-014-4031-0)
  （*Control Theory and Technology*, 12(2), 97–109, 2014）是可全文回读的学术二手来源。文章明确标出其
  对原书前言 p. vii、分析方法 p. 38 和不确定性/设计原则的回引；相关 [erratum](https://doi.org/10.1007/s11768-016-5146-2)
  还修正了原书 p. 214 的引文归属。这里的内容只能标为 `secondary-source / reported-primary-quote`，不能
  当成我们直接读到的原书文本。
- GitHub 上找到的 [navy2609/cybernetics](https://github.com/navy2609/cybernetics) 是一个控制论资料汇编，仓库
  当前展示了 `[控制论].[工程控制论].pdf`（8.32 MB）以及钱学森、宋健的《工程控制论上、下》（30.6 MB）。
  但仓库只有 3 commits，页面没有给出这两个 PDF 的出版版本、扫描来源、校验指纹或明确的内容授权；它们的
  文件名也指向中文/修订版，而不是可直接确认的 1954 英文原版。因此它是**可访问性线索/候选副本**，不是
  当前 source authority。若后续使用，必须先核对扉页、版次、出版信息、页码、文件 hash 和授权边界。
- GitHub 上的 [zeronesun/cybernetic-your-agent](https://github.com/zeronesun/cybernetic-your-agent) 是一个把前馈、
  积分、层级分离和自监控迁移到 Agent 的教程项目，不是《工程控制论》的版本，也没有对本项目场景的独立
  验证；它可作为相邻设计观察，不能作为原书依据或本项目方法接受证据。
- [中国工程院相关学术文章](https://www.engineering.org.cn/sscae/CN/1160103700859511735) 是二手学术解释，
  将该书定位为面向工程应用、把工程实践中的设计原理组织成工程科学的著作；它可支持研究方向和方法
  线索，但不能替代原书逐章核读。
- [IEEE Control Systems Society 的反馈控制说明](https://ieeecss.org/control-systems-are-ubiquitous) 可作为现代
  控制概念的独立边界来源：反馈需要测量当前行为、与参考/目标比较，并把误差转为作用；扰动、鲁棒性和
  稳定性是不同问题，不能把“有反馈”直接等同于“已稳定”。
- [NASA Systems Engineering Handbook Appendix](https://www.nasa.gov/reference/system-engineering-handbook-appendix/)
  提供工程化的相邻约束：可靠性要求应可测量、可验证，并明确错误检测、报告、处理和恢复；系统工程还要
  记录方法、工具、评审、授权、配置和指标。这些是迁移到 harness 时的工程参照，不是钱学森原书的内容。

因此当前 source standing 分层为：书目和目录事实 `source-observed`；1954 英文原始 artifact 已定位但
`primary-text / access-restricted`；GitHub 中文/修订版副本为 `candidate-copy / provenance-unverified`；工程控制的现代概念和对原书的回引为 `secondary-source / reported-primary-quote`；
将其映射到 Agent/harness 的部分仍是 `inference / applicability-open`。原书前言和关键章节的准确措辞、英文
原版与中文修订版之间的版本关系、以及哪些概念能支持本项目的具体设计，仍需在获得可核读原文后单独记录。
不能以书名、目录关键词或二手口号把任何 harness 反馈动作写成理论保证。

### 2.1.1 已形成但尚未越界的概念线索

以下只记录二手论文对原书的回引，以及可用于下一轮 source/boundary review 的候选，不把它们写成已接受
的 harness 方法：

| 来源线索 | 可回接的研究问题 | 当前不可推出的结论 |
| --- | --- | --- |
| 工程科学应从工程实践抽象设计原则，并以直接工程作用为检验方向 | harness 研究不能只堆抽象概念；每个候选最终要回到真实 workflow、owner 和可观察决策 | 不能因此接受一个“工程控制”skill，或把所有理论都要求立即 productize |
| 工程模型是近似的，未知动态和内部/外部扰动需要被显式处理 | 复杂度/工具准备和可靠性研究都应保留未知、扰动暴露、主要矛盾与 model-limit，而不是假定 harness 已知全貌 | 不能把 Agent 失败统一解释为 disturbance，也不能推出某种自动抗扰 controller |
| 概念化、简化和“工程师直接拥有的信息”会影响方法是否可用 | 回接问题优先设计：先辨识真实问题与主要矛盾，再选择足以改变决策的最小观测和工具 | 不能把“简单模型”误写成真实系统的充分模型，也不能把一次可用简化当作普适性证明 |
| 原书讨论 feedback、stability、uncertainty 等控制主题，现代回顾还联系到后续 ADRC | 为 feedback loop 区分目标、观测、偏差、动作、结果和反馈延迟，并检查作用能力与归因 | ADRC 是后续方法，不是钱学森原书或本项目当前设计；不引入 ADRC 名称、算法或 runtime 机制 |

### 2.2 最近邻

| 最近邻 | 它拥有的关系 | 本候选不替代的部分 |
| --- | --- | --- |
| `iterative-improvement` / `practice-cycle` | 根据结果选择下一项最小实践和结算 | 不自动提供系统状态、扰动或稳定性定义 |
| `default-autonomy-with-correction` | 小事自主、重大事项请示、事后纠偏 | 不等于工程稳定性或可靠性证明 |
| `controlled-experiment-design` | 设计变量、对照、TEVV 和 disposition | 不拥有 harness 的运行控制或硬保证 |
| `agent-harness-throughput` | 编排拓扑、loading、fan-in 和成本/质量面 | 不等于可靠性控制或 failure convergence |
| WorkCell Run/RunRecord | 执行 identity、事实、效果和 evidence | 不自动成为 system controller 或 acceptance gate |
| base/runtime/host | 权限、隔离、重试、持久化、恢复和外部效果 | 文字/skill 不能替 runtime 创造这些保证 |
| SRE/observability | service outcome、指标、error budget 和运维反馈 | 不自动定义 Agent 语义目标或 owner acceptance |

本候选研究的是工程关系和方法，不预先选择 WorkCell、DeepSeek Harness、Vercel AI SDK、Pi、某个 provider
或具体 runtime 作为答案。`systems-engineering` 是 archive 中已有的相邻 candidate-later 方向；本记录不因
词面相近自动晋升或复制它，是否回接由 source、consumer 和 boundary review 决定。

## 3. 初步系统模型

以下是待验证的角色映射，不是已接受协议：

| 控制论/工程角色 | Harness 中的候选对象 | 必须避免的误读 |
| --- | --- | --- |
| reference / desired state | goal、约束、成功标准、acceptance floor | goal 不是一个可自动测量的单一数值 |
| plant / system | Agent + harness method + tools + host/runtime + external context | 不把模型单体当成整个系统 |
| disturbance | stochastic output、provider/tool error、drift、context loss、handoff delay、权限/环境变化 | 扰动要有暴露和影响证据，不能事后把所有失败都归为扰动 |
| sensor / observation | outcome、process trace、identity、review、failure、cost、guardrail | 记录存在不等于状态可观测，日志也不自动是真实语义证据 |
| controller / policy | plan revision、tool choice、delegation topology、review/correction、rollback 或 owner return | 方法文字不能保证执行、权限、锁、恢复或 exactly-once |
| actuator | prompt/skill/config/workflow 的可逆调整，或由 host/runtime 执行的受控动作 | 未经 owner/runtime 授权不能扩大外部效果 |
| output / residual risk | useful progress、continuity、quality、latency、cost、failure 和未解决风险 | “更稳定”必须指向冻结场景、指标和时间窗口 |

尤其需要研究 `observability`、`controllability`、feedback delay、噪声、过度纠偏和振荡：过多检查、重试
或策略切换可能增加成本、造成新污染，甚至掩盖真实失败；反馈存在不等于系统已经稳定。这里先形成四个
可迁移的最小边界：

1. **反馈不是记录本身：** 必须存在目标/参考、可解释的当前观测、偏差或事件判断，以及作用到系统的
   受权动作；单纯增加日志、Todo 或 review 不构成闭环。
2. **可观测性先于纠偏归因：** 如果观测不能区分状态、扰动、动作和结果，只能报告
   `signal-present / attribution-unknown`，不能据此声称收敛或稳定。
3. **稳定/收敛必须绑定模型、场景和时间窗口：** 控制工程中的稳定性有明确系统模型和行为判据；在
   harness 中至少要冻结目标场景、扰动暴露、反馈周期、结果指标和残余风险，不能把一次成功恢复称为
   稳定性。
4. **作用能力是独立前提：** Agent 能观察到问题，不代表它能安全改变产生问题的层；权限、持久化、并发、
   重试、回滚和不可逆外部效果仍由 host/base/runtime 或 owner 提供，method/skill 只能表达建议和边界。

`observability` 与 `controllability` 的精确数学定义属于线性/动态系统模型；本项目当前只借用“能否看到相关
状态”“能否在授权范围内改变相关结果”的工程问题，不把控制论术语伪装成已定义的 harness 类型或指标。

## 4. 研究问题

1. 工程控制论中哪些概念可以严谨映射到 Agent/harness，哪些只是有启发性的类比？
2. harness 的“状态”“扰动”“稳定”“收敛”“可靠”应如何定义为可观察关系，而不是宣传性形容词？
3. 如何区分局部 action correction、wave-level plan/topology correction 和 system/runtime hard guarantee？
4. 反馈周期、观测延迟、重试/回滚、owner return 和策略切换如何影响成本、质量、振荡和残余风险？
5. 哪些 failure signals 足以触发自适应纠偏，哪些必须停止并交给 owner，而不是由 Agent 自行扩大控制范围？
6. 如何将控制回路接回 `practice-cycle`、`default-autonomy-with-correction`、WorkCell evidence、吞吐
   `T_useful / C_total / Q_guard` 和 post-adoption regression，而不创造第二个全局状态机？
7. 在真实 harness 设计中，哪些可靠性关系只能由 host/base/runtime 提供，哪些可以由 method/skill 改善？

## 5. Bounded application candidate

在出现一个有重复失败或明显扰动的真实 harness workflow 后，可建立一张最小 reliability control card：

1. 冻结 intended use、desired outcome、guardrail、暴露窗口和 residual-risk owner；
2. 列出扰动、可观测信号、信号缺口、允许的纠偏动作和必须升级的动作；
3. 先在现有 work map、review、practice-cycle 和 correction 机制上做最小应用，不创建新的 runtime controller；
4. 记录纠偏前后 outcome、成本、失败复发、反馈延迟、误报/漏报、人工负担和回滚情况；
5. 若有 direct baseline、相称重复和独立 review，再讨论 bounded reliability improvement；否则只报告
   `system-boundary-observed / attribution-unknown`。

该 application candidate 不是要求系统实时自动控制，也不是让 Agent 自行修改权限或长期策略。跨重启、
并发、不可逆外部效果、持久化、重试语义等硬性质必须 route 到相应 host/runtime/base owner；尚无 named
consumer、runner、owner、指标、接受阈值或真实暴露窗口，不启动 Run。

## 6. 证据、结算与回返

- **source review：** 已完成书目、原始 artifact 定位和相邻现代控制来源的第一轮核验；Internet Archive
  当前为 access-restricted，下一轮若获得借阅/扫描权限，再逐章回读原书前言和关键章节，记录原文、解释、
  适用边界和反例。现阶段可使用 Gao 论文作为 `secondary-source / reported-primary-quote`，但不能以目录、
  二手口号或未核对的引文替代原书。
- **boundary review：** 对每个控制/反馈映射检查对象、状态、扰动、观测、动作、owner 和失败边界；没有
  可观察关系的概念保留为 analogy，不进入方法规范。
- **application evidence：** 只有真实场景、可重建 identity、相称重复、独立 review 和 guardrail 才能提高
  evidence standing；一次恢复成功不证明稳定性或通用可靠性。
- **结算：** 若映射能改变一个真实设计决策，进入 bounded application/trial；若只提供类比、成本超过收益、
  或无法获得观测/owner，返回 `no-proposal / archive-inconclusive`。
- **回返：** 新的失败复发、反馈延迟、控制振荡、误报/漏报、runtime 边界冲突或真实 consumer 出现时重开；
  不把研究候选长期留在 active 而不结算。

## 7. 2026-08-26 settlement event

本轮将第一阶段的 source fingerprint、最近邻边界和最小 reliability application 关系结算为
`settled / canonical-proposal`：它已经改变了 harness 研究的设计边界——反馈不等于记录，可观测性先于归因，
稳定性必须绑定场景/时间窗口，硬作用能力必须交给 host/base/runtime owner。它尚未完成钱学森原书的逐章核读，
也没有真实重复失败、runner、指标、guardrail 或 reliability Run，因此 proposal 不等于理论接受或可靠性结论。

当前保持 `source-observed / primary-text-access-restricted / applicability-open / application-not-authorized`。
只有取得可核读原书版本、出现真实重复失败/扰动 consumer，或出现改变当前映射的反例时 reopen；否则不继续扩展
文献综述，后续无 owner/consumer 的重复投入按 `archive-inconclusive / no-proposal` 处理。

该结算不创建 `systems-engineering` skill、controller、runtime gate、WorkCell 字段或 DeepSeek system design。
