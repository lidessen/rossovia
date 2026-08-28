---
kind: research-record
id: agent-theory-absorption
status: settled
disposition: absorbed-to-living-theory
---

# Research — Agent harness 理论解构与吸收清单

**任务**：解构 archive（v0.5）agent 相关理论，按新哲学序列（16 条）做"保留 / 映射 / 废弃"三栏拆解，为现行 `theory/harness/theory.md` 的重写提供依据。archive 原样保留；本笔记只记录吸收决策。

**来源**：
- `archive/design/harness/THEORY.md`（已全文过目；640–968 段为细节补读，结论已并入）
- `archive/design/DESIGN.md`（harness 相关部分）
- `archive/principles/research/agent-harness-control-debt-and-guided-recovery.md`
- `archive/principles/research/agent-attention-disposition-and-habit.md`
- `archive/principles/research/mixed-agent-attention-surface.md`

## (A) 核心论点清单（保留候选）

| # | 论点 | 原文位置 |
|---|---|---|
| 1 | 定位：项目级工作理论；不创建运行时协议、不授权效果、不修订序列；序列（哲学序列）是唯一语义根 | THEORY.md:3-29 |
| 2 | 论题：harness = 面向 Agent 的任务工程——重建真实任务 → 重表达 → 构建环境 → 拆分/保持整体 → 重组不丢约束 | :33-37 |
| 3 | 可靠性 = 可观察、可包含、可纠正的分辨力，不是门数或正确中间态；简单 harness 可能比全面貌的更可靠 | :47-52 |
| 4 | base vs method-expression 划分（ownership test）：方法可变而 Task/Run/Cell/effect/evidence/acceptance 契约不变 → 方法层；需新生命周期/并发/证据 → base | :65-99 |
| 5 | 行为模式不机制化（四理由：条件性/演化快/机制不能制造语义判断/耦合掩盖替换失败）；判定用 yes/no/uncertain | :123-152 |
| 6 | Task 是关系（意图×对象×约束×环境×效果×证据×接受者）；Plan 是义务，拓扑（direct/sequential/parallel/nested）是可替换方法；分解只发生在真实边界；重组不是拼接/投票 | :154-233, 201-207 |
| 7 | 多轮实践（multi-round practice）：记录学到什么、仍未知、最小改变的下一次；重复同一尝试不算迭代 | :236-（节） |
| 8 | 注意架构：认知/注意/行动/证据四关系 + 七条构建准则；注意、认识论、效果权威三轴耦合不可归约 | :295-358, 536-554 |
| 9 | 对象论：第一个设计动作是本体的——每个对象有 unit/source/authority/terminal condition/易混淆邻居；对象所有权表（Intent/Task、Run、Cell、Adapter、Mechanical evidence、Candidate、Semantic review、Acceptance、Projection 各有真主人与"必须不得建立"） | :634-659 |
| 10 | 四种认知动作（Observation / Mechanical conformance / Semantic judgment / Authority）：不是同一验证的四个阶段，回答不同问题、需要不同主人；review 推荐，不授权 | :661-693 |
| 11 | 效果与因果同一性：潜在不可逆外部效果用严格因果所有权；UI 可投影 live/terminal/unknown，不得自造 liveness 权威 | :838-1001 |
| 12 | 机制派生：从累加机制改为派生（mechanism admission check）；生成性 = 结论可从无例外表推出的能力 | :929-1008 |

## (B) 与 16 条哲学序列的映射

| 论点 | 十六序列条目 | 归属说明 |
|---|---|---|
| 2 任务工程 | P01（认识·来源）+ P05（分析·特殊性） | 写入现行 theory/harness/theory.md 的 thesis |
| 3 可靠性 | P15（检验·手段）+ P16（检验·时点） | "可观察可纠正"是检验的执行表述 |
| 9 对象论 | P02（证据）/ P04（边界）/ P13（对抗·应）/ P15 | object 所有权表是"谁可发言"的架构化，属二→三的设计展开 |
| 10 四种认知动作 | P02（凭什么说）/ P04（知道多少）/ P15（检验）/ P13（谁授权） | 认知动作分离 = 序列的架构级展开 |
| 4/5 base 划分与不机制化 | P06（简化）+ P11（成本） | ownership test 与不机制化论证挂"日损/少动" |
| 8 注意架构 | P09（主要矛盾）+ P10（时机） | 旧 P09"注意力分层"语义整体迁移到新 P09 邻域；三轴耦合进"设计"层 |
| 6 Plan/拓扑 | P07（入手点）+ P09（主次）+ P13（对抗·应） | 拓扑选择 = 从 Plan 实际关系推，不预设 |
| 7 多轮实践 | P03（认识·深化） | "最小改变的下一次"是循环的写作化 |
| 11 效果/投影 | P02（证据）/ P04（边界） | 权威与投影语义在新序列无独立条目——由解读/设计层承载，明确标注 |

**旧血统整体失效**：旧 P15"最小有效跃迁"→ 新序列为 P07+P10+P11 组合；旧 P04 → P01；旧 P16 → P14；旧 P09 → P09（重命名迁移）；旧 P11"权威"、旧 P14"投影"→ 新 16 条无直接条目，明确归**解读/设计层**。

## (C) v0.5 专属 / 过时项

- THEORY.md:10-21 旧 P-ID 血统段（旧 P15/P04/P09/P13/P16/P11/P14 旧语义）——必须废除
- 旧原则引用写法（`principles/SEQUENCE.md`、`interpretations/Pxx.md` 链）——改为指向哲学序列与对应条目
- attention / mixed-agent 研究中的"Existing-sequence coverage"表（按旧 P 语义）——标注过时
- 三 dogfood 线、Decision 055、evaluation 引用——属项目设计层，从 theory 本体剥离到"项目应用"节
- "Semantic gate""四 ownership 层"等表述——有效，但重述为解读/设计层内容，不占序列话语

## (D) 重写建议（供 phase 3）

1. 血统节重写：主对象 = P01（认识·来源）+ P15（检验·手段），支持 P05/P07/P09/P10/P11/P13；删除全部旧 P-ID。
2. 头部定位：theory/harness/theory.md 是哲学条目在 Agent 环境中生成的二→三方法／设计理论，不是条目本身；与"序列是唯一语义根"共存。
3. 保留主体：不机制化（:123-152）、四种认知动作（:661-693）、对象论（:634-659）——这三块最稳，仅换挂点。
4. "为什么行为模式不机制化"强化挂 P06（日损）+ P11（少动）。
5. 附录附迁移表（旧 P-ID → 新条目/解读层），供对照。

**未核/待注意**：THEORY.md 640-968 段的案例与证据细节未逐句保留（本清单采结论性吸收）；`archive/design/harness/README.md` 未单列（结论并入 DESIGN.md 相关部分），重写时以 THEORY.md 为主。

## (E) Agent 相关 skill 吸收表（7 个）

全量来源：`archive/skills/{skill-engineering, agent-delegation, context-engineering, naming-and-articulation, improve-agent-workflow, agent-tooling, agent-environment}/SKILL.md`（只读其 Principle/Scope/description；原文不迁移）。

| skill | 核心判断（Own one judgment） | 新序列支撑 | 二/三 | 落点 |
|---|---|---|---|---|
| skill-engineering | 同一重复行动差距且 skill 是最小可关闭它的形式时,工程化 agent-facing 表达;目标不是格式化 prompt,而是 agent 在真实上下文约束下做出判断与行动 | P06(简化)+P11(成本·最小形式)+P14(表达)+P15/P16(检验) | 三 | 重做为 skill 形成理论及 `skill-formation`；旧 skill 只作研究样本 |
| agent-delegation | 哪些有界贡献该委派、每角色得到什么上下文与效果边界、证据如何重连整体;子不负全整,Main 保留整体 | P09(主次·委派哪部分)+P12/P13(对抗·边界)+P07(入手·有界贡献)+P15(检验·证据重连) | 三 | 重做为委派理论及独立 `agent-delegation` |
| context-engineering | 命名 agent 动作时,决策相关源信息何时到达、最小 runtime 证据化投递路径,且保持源权威;管投递,不管内容 | P02(证据·源权威)+P09(主次·决策相关)+P14(表达·投递) | 三 | 按拥有判断分别进入 Agent 表达或委派，不保留独立旧 skill |
| naming-and-articulation | 给定对象、受众、被阻塞决策,取最小名字/操作定义/解释/源位置;不把标签当对象,不造多余分类 | P14(名正·名不为实)+P06(日损·最小标签)+P04(边界·名实相副) | 三 | 重做为概念表达理论及 `concept-articulation` |
| improve-agent-workflow | 从观察到的项目证据出发,改最小的拥有面(项目 skills/AGENTS/prompt/上下文/工具/hooks/验证/交接),经 agent 常规入口验证行为 | P11(成本·最小改变)+P07(入手·最小面)+P15(检验·常规入口验证) | 三 | 保留为迭代中的最小拥有层判断，不并入单一大 skill |
| agent-tooling | 操作调优工具层(结构化输出/权限/hooks/MCP/记忆),缓存版本能力证据,比较 normal/lean,移除使 agent 更差的工具 | P02(证据·能力证据)+P11(成本·lean)+P15(检验) | 三 | 不并入第一个 skill;保留为候选独立 skill(设计层) |
| agent-environment | skill/能力是用户级 setup/migration 的对象;已安装副本是目标证据不是源;缺源先 NEEDS_INPUT;永不读 secret | P04(边界·源/副本)+P02(证据)+P07(入手·先问) | 三 | 不并入;保留为候选独立 skill |

**本轮复议**：7 个仍均属**三**（方法），无一进入哲学序列；但把 skill 形成、委派、上下文、命名和 workflow 诊断合并为一个 `agent-communication`，使一个 skill 同时拥有多个不同判断，正文与触发边界也无法一致。该实现已删除。后续先从现行哲学分别写理论，再生成边界独立的 skills；旧材料只提供可反驳的历史证据，不是模板或兼容契约。agent-tooling / agent-environment 继续留在 archive，作为后续独立候选。

## (F) 补读 observation-chronicle.md

核心：观察日志是 append-only 受据 + 溯源指针；raw source、解读、决议、可重建投影各自保留权威；投影无事实权威；纠错是追加新陈述不擦除旧记录。**吸收结论**：全部并入现行 `theory/harness/theory.md` 证据/投影节（Projection 行已有"不得建立独立事实/活性/权威"）+ 四种认知动作观察项；无新增条目。已随本轮解构纳入通读范围。
