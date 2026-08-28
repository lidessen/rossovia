### FB-2026-08-26-001
- 类型: 问题
- 来源: fixture F2
- 对象: AGENTS.md §6 结构速查
- standing: stable
- 日期: 2026-08-26
- 内容: AGENTS.md §6 结构速查只列 thinking-log/work-log，未收录 tools 生成的 feedback-log/evidence-log（fixture F2 发现）

### FB-2026-08-27-001
- 类型: 问题
- 来源: 首轮对照回看
- 对象: test-manual 步骤 7 偏差诊断 + F1 fixture
- standing: stable
- 日期: 2026-08-27
- 内容: 首轮对照偏差诊断：预期组合组保真纪律在复杂输入上更强，但 F1 输入无歧义（原话直抄），保真度无差异 → 判定为测试设计问题（fixture 未制造压力场景，保真纪律机制未被检验），非假设问题；改进：下轮 fixture 用歧义/口语填充/带否定时序的输入

### FB-2026-08-27-002
- 类型: 问题
- 来源: 第二轮对照回看
- 对象: test-manual 步骤 7 偏差诊断 + F1b fixture
- standing: stable
- 日期: 2026-08-27
- 内容: 第二轮对照偏差诊断：预期裸组清洗/组合组保留，实际两者都保真（裸组逐字保留含衬词；组合组按纪律删衬词但保留全部语意：疑问/商量/双重不确定/否定/自我怀疑/指示/顺序）——差异方向与预期相反 → 测试设计问题（对照差异维度设错：本输入含'别改我的意思'使裸组保守，保真纪律差异需用语意歧义输入检验）；组合组 capture 纪律行为正确（有界润色、未补全未添加、程序化编号）。改进：下轮用自相矛盾/残缺/需标注 unknown 的输入测保真纪律

### FB-2026-08-27-003
- 类型: 问题
- 来源: 第三轮对照回看
- 对象: test-manual 步骤 7 偏差诊断 + F1c fixture
- standing: stable
- 日期: 2026-08-27
- 内容: 第三轮对照偏差诊断：预期裸组在残缺/矛盾处补全/合理化，实际裸组也原样保留（受'你先记着'指示 + 任务描述泄露测试意图双重影响）→ 测试设计问题（fixture 描述不应提示输入性质）；并观察到裸组三轮均保守——若干净对照后仍无差异，则保真维度组合无显著改善（retain-baseline：保真靠 LLM 默认），组合价值在结构/编号/轨迹维度（已两轮稳定差异）。改进：裸组描述只给输入+记录要求，不含任何性质提示

### FB-2026-08-27-004
- 类型: 问题
- 来源: 用户 2026-08-27
- 对象: owner-facing-progress / ask 使用纪律
- standing: stable
- 日期: 2026-08-27
- 内容: 工作方法反馈：技术选型（可逆、局部、有安全默认=继承 v0.5 遗产）被抛回给用户 ask——违反『默认自治+事后纠偏』（owner-facing-progress 六步判断：局部可逆低影响应自主继续）。改进：设计内部决策（技术选型/命名/结构）自主决定并标注候选可改；ask 只留给改变方向/价值/权限/共享基线/不可逆后果的决策

### FB-2026-08-27-005
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: agent-delegation / 委托 prompt 最小化
- standing: stable
- 日期: 2026-08-27
- 内容: 工作方法信号：委托 sub agent 时，若 harness（AGENTS.md 路由 + skills 方法 + 返回定义）设计良好，prompt 应只需『任务 + 背景』，不需要额外 instruction（怎么找路由/怎么执行/怎么返回）。近期委托 prompt 塞了大量方法性 instruction——要么 harness 对 sub agent 冷启动的支撑不足（sub agent 不会自动加载 AGENTS.md），要么委托方式重复了 harness 已承担的职责。改进方向：委托 prompt 最小化（对象与目标、来源/背景、允许效果边界、返回关系——若 skill 已定义返回则不重复）；若 harness 不足则补 harness 而非补 prompt instruction

### FB-2026-08-27-006
- 类型: 新想法
- 来源: 用户指引 + mixed-agent-attention-surface
- 对象: reviewer-generation skill
- standing: stable
- 日期: 2026-08-27
- 内容: reviewer-generation 吸收 mixed-agent-attention-surface 风格库：4 种风格（xNTJ/xNTP/xSTJ/xSFP）+ P-ID 透镜 + aside 结构 + Main 综合纪律（不投票/不写效果/选择性吸收）。风格库源自 open 研究（POC uncertain），作为候选使用；研究提示其可能只是 practice-cycle/agent-delegation 的隐喻，需使用后验证决策价值

### FB-2026-08-27-007
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: agent-delegation / reviewer-styles
- standing: stable
- 日期: 2026-08-27
- 内容: skill-formation 合并处置：reviewer-generation 并入 agent-delegation（评审人委派模式 + references/reviewer-styles.md 风格库）——评审人生成本质是 delegation 的子场景（生成多评审人 prompt→并行委派→收集→Main 综合），同一触发/成功关系，独立 skill 是过度拆分

### FB-2026-08-27-008
- 类型: 新想法
- 来源: skill 测试 2026-08-27
- 对象: agent-delegation/references/reviewer-styles.md
- standing: stable
- 日期: 2026-08-27
- 内容: reviewer-styles 最小测试结论：同一刺激（一段设计陈述）下 4 风格（审计员/探索者/体验者/克制者）产生 4 个不同角度看法，关注面/追问类型/第一反应三项对照物全满足，零雷同 → 风格区分度验证通过，skill 有效。两个改进已验证：①标签（xSTJ）与 P 编号（P07）必须翻译成角色描述/操作含义，纯角色描述即可产生差异；②区分度用最小测试（同一刺激问看法）而非完整评审。另发现：评审人'只读不修改'纪律 2/4 未遵守（2 个评审人把意见落盘），已强化公共纪律措辞（意见直接返回、留档归 Main）

### FB-2026-08-27-009
- 类型: 新想法
- 来源: practice-cycle 2026-08-27
- 对象: skills 层回看
- standing: stable
- 日期: 2026-08-27
- 内容: practice-cycle 结果：近期实践回看 12 skills——更新 3 个：agent-delegation（评审人委派+prompt 最小化）、owner-facing-progress（ask 纪律）、reviewer-styles（角色翻译/最小测试/只读纪律）已于信号发生时更新；本轮补 human-writing（019A 设计文档纪律：规范主体 vs 过程/审计分离，workcell v4 重构验证）与 agent-expression（接收者方法由 harness 承担）。其余 7 个（planning-inbox/concept-articulation/work-estimation/practice-cycle/method-evolution/skill-formation/mechanism-design-review）检查后无实践缺口

### FB-2026-08-27-010
- 类型: 新想法
- 来源: 用户反馈 + harness.md
- 对象: owner-facing-progress / reviewer-styles
- standing: stable
- 日期: 2026-08-27
- 内容: owner-facing-progress 'ask 使用纪律' 从规则清单改为方法式表达（ask 的使用：判断决策性质——可逆/局部/有默认偏向自主，方向/价值/权限/不可逆/owner 独占信息才打扰）。理论依据：theory/harness.md 行为模式不机制化——方法是条件的、规则列不全、机制不能制造语义判断；三问+穷举式'只有 X 才 ask'是把行为机制化。同步软化 reviewer-styles 差异判定（去'三者至少两者'机械阈值）

### FB-2026-08-27-011
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: harness-review skill
- standing: stable
- 日期: 2026-08-27
- 内容: 新增 harness-review skill：对 AGENTS.md+skills+工具做系统 review——三模式（局部逐 skill/整体组合/结合工作日志）、理论分散成小 group 按血统分配给评审人（每评审人只读相关组）、风格复用 reviewer-styles。设计要点：复用 agent-delegation 评审机制不重复造；skill 表达按方法式检查（规则化表达是待挑问题）；处置走闭环（改 harness→check→version）

### FB-2026-08-27-012
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: harness-review skill
- standing: stable
- 日期: 2026-08-27
- 内容: harness-review 评审人阵容重构：三种角色——①工作流设计角色（整体工作流设计质量：路由/最小回路/work map/自治边界/分层）②复盘角色（结合 notes 工作日志复盘实践 vs 设计）③2-4 个性格风格角色（复用 reviewer-styles，局部逐 skill）。理论参考改为每个角色选部分（按血统/对象，不读全部 theory）。替代原先'三模式×风格'矩阵——评审人按角色组织更聚焦

### FB-2026-08-27-013
- 类型: 新想法
- 来源: harness-review 首轮
- 对象: harness 装置
- standing: stable
- 日期: 2026-08-27
- 内容: harness-review 首轮执行效果：4 角色（工作流设计/复盘/审计员/克制者）产出 12 个 aside，发现真实问题。一致意见（多评审人同指）：版本/权威标注漂移（AGENTS.md 引 v3 vs agent-stack v4、harness-review 未入设计清单）、skill 内容重复/不一致（agent-expression §6 拷贝 agent-delegation §8、agent-delegation 声称 xNTJ 与 reference 不符）、0_scribe stale 引用（thinking-log/work-log 头部）。独见：work map 持久落点未定义、路由表无 no-match 兜底、THINK-2026-08-26-001 声称存在但 thinking-log 缺失（沙盒污染 evidence-log）、work-log 空转、dual-audience 三处定位不一致、harness-review 可降级 reference、三套准入清单同构。已修 4 项高置信低风险，其余待裁

### FB-2026-08-27-014
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: work-orchestration skill
- standing: stable
- 日期: 2026-08-27
- 内容: harness-review 升级为 work-orchestration（工作编排）：主 agent 自适应工作组织——按任务规模（单步直接/多步 work map/并行深调查委派）与任务类型（评审/深调查/核验/设计/一般执行 → 参考角色组合）编排 sub agents；Review 模式吸收原 harness-review（工作流设计角色+复盘角色+风格角色阵容）。边界：不替代 agent-delegation（委派机制）与 work-estimation（规模估算），本 skill 是角色与编排决策层；方法式表达（角色组合是参考判断非规则清单）

### FB-2026-08-27-015
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: AGENTS.md 第2章 / work-orchestration
- standing: stable
- 日期: 2026-08-27
- 内容: AGENTS.md 新增『主 agent 角色与上下文纪律』：主 agent 有能力了解但自律地不装细节——上下文是注意力资源（attention 四耦合），只持有整体目标/约束/依赖/接受关系/带 standing 的局部结果与证据指针，细节留在子 agent 隔离上下文与工作区按需查询（Agent as tool：父收紧凑结果保留重建责任）。work-orchestration 规模判断补『上下文保护也是委派收益』。用户意图：主 agent 塑造成能理解『不应让任务细节污染自己上下文』的角色

### FB-2026-08-27-016
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: work-orchestration skill
- standing: stable
- 日期: 2026-08-27
- 内容: work-orchestration 新增两个工作角色：拆分者（把大问题切成有界部分：边界/依赖/拓扑，用于任务分解/work map/委派）与整合者（把碎片拼回整体：共性/矛盾/缺口，用于多路径综合/意见汇总/重连）；主 agent 定位为全面综合者——不偏科（能拆能合）且是最终综合者（拆分/整合可委派做中间层，最终综合与接受判断归 Main，综合是恢复关系不是拼接）。区分：评审风格（reviewer-styles）是评审视角，工作角色是处理任务的方式

### FB-2026-08-27-017
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: AGENTS.md / work-orchestration
- standing: stable
- 日期: 2026-08-27
- 内容: 主 agent 判断强化：辩证（能看到每个方案/判断的对立面，在对立中找统一——道-一-二-三-万物）与主要矛盾（P09：冲突意见先排序主次，不被新近/具体/重复报告的局部带偏——harness.md 比例）；难以抉择场景给出有界判断（基于证据与权衡、标注 uncertain、可回退、事后纠偏兜底），不无限发散、不把可判断决策无限抛回 owner、不假装确定（P04）。已写入 AGENTS.md 主 agent 判断条目 + work-orchestration 主 agent 全面综合者

### FB-2026-08-27-018
- 类型: 新想法
- 来源: review 第二轮 2026-08-27
- 对象: harness 装置
- standing: stable
- 日期: 2026-08-27
- 内容: 新角色配置 review（拆分者/整合者/审计员/克制者）+ 模拟场景走查：发现①评审人数量口径冲突（3-6 vs 2-4）、契约字段三层无映射、xNTJ 悬空；②理论引用失真（'attention 四耦合'非 harness.md 原文、'辩证'theory 无出处、P04/P09 引用不精确）；③克制者质疑新角色概念堆砌。Main 辩证综合：角色真实压力用模拟场景验证——走查证实 work-orchestration 内容层有独立作用（角色编排层，非概念堆砌），但挂载断点（路由缺日常行/work-estimation 无指针/评审双定义/check 不查挂载）。已修：路由表日常行、work-estimation 下一站指针、Review 模式去重引用 agent-delegation、check.py 挂载检查、新增丢弃者角色（用户经验：维护成本>潜在价值直接扔，先筛后合）。沉淀：skill 与 workflow 搭配 review + 模拟场景方法。待裁：理论引用回填/契约字段映射/角色字段结构

### FB-2026-08-27-019
- 类型: 新想法
- 来源: 用户 2026-08-27
- 对象: skills 体系整合
- standing: stable
- 日期: 2026-08-27
- 内容: skills 整合 A+B（12→7）：expression 吸收 concept-articulation/form-selection/human-writing/agent-expression（概念→载体→表达链 + dual-audience reference）；feedback-loop 吸收 planning-inbox/practice-cycle/method-evolution（capture/登记→单次回返→集中迭代 + record-thinking/optimize-work-log references）。保留：work-estimation/work-orchestration/owner-facing-progress/mechanism-design-review/skill-formation。路由表与全部引用更新（AGENTS.md/design/agent-stack/test-manual/各 skill），check 7 引用全挂载。依据：用户整合标准（同工作链环节、同主题子操作）

