### EV-2026-08-26-001
- level: activation
- object: planning-inbox（fixture F1）
- date: 2026-08-26
- ref: sa_20260827_052751
- note: F1: 路由 planning-inbox，register.py capture → THINK-2026-08-26-001，行为符合手册预期

### EV-2026-08-26-002
- level: activation
- object: concept-articulation+form-selection（fixture F2）
- date: 2026-08-26
- ref: sa_20260827_052814
- note: F2: 来源不足正确 no-proposal，provisional 三边界，form-selection 载体判断 → notes/concepts.md

### EV-2026-08-26-003
- level: adoption
- object: 组合 vs 裸 agent 对照（F1 同输入）
- date: 2026-08-26
- ref: sa_20260827_052751 / sa_20260827_053926
- note: 裸组：原话纯文本追加（107B，无编号/结构）；组合组：register.py 生成 THINK-2026-08-26-001（编号+引用块+保真纪律）。行为差异已观察（behavior-observed）；matched-improvement 待多 fixture+holdout。局限：裸组任务显式告知无规范且禁读工作区

### EV-2026-08-27-001
- level: semantic
- object: 测试预期与偏差归因（positive/boundary/regression/对照差异 + 测试设计问题 vs 假设问题）
- date: 2026-08-27
- ref: theory/harness.md iterative-improvement + FB-2026-08-27-001
- note: 首轮对照回看沉淀：预期先行、偏差二分归因、归因需证据、不可硬结；与 CORR-002 同源

### EV-2026-08-27-002
- level: activation
- object: planning-inbox 压力输入（F1b 组合组）
- date: 2026-08-27
- ref: sa_20260827_104353
- note: 路由 planning-inbox，register.py capture → THINK-2026-08-27-001；保真语意、有界润色、未补全未添加（behavior-observed）

### EV-2026-08-27-003
- level: adoption
- object: concept-articulation 回归（F2）
- date: 2026-08-27
- ref: sa_20260827_104540
- note: 回归通过：路由正确、no-proposal 与 skill 边界一致、事实声称独立核实为真（regression 保留）

### EV-2026-08-27-004
- level: adoption
- object: 保真维度干净对照（F1d）
- date: 2026-08-27
- ref: sa_20260827_110824 / sa_20260827_111042
- note: 分支 B 成立：裸组零提示仍逐字（cmp IDENTICAL），组合保真纪律在该场景无额外增益 → 保真维度 retain-baseline；组合价值定位在结构/编号/轨迹维度

### EV-2026-08-27-005
- level: activation
- object: planning-inbox 保真（F1d 组合）
- date: 2026-08-27
- ref: sa_20260827_110824
- note: 路由正确；diff 机械证明条目正文与原话逐字一致（IDENTICAL）

### EV-2026-08-27-006
- level: activation
- object: tools 四件套（F3 工具组）
- date: 2026-08-27
- ref: sa_20260827_111129
- note: check 全过、version freeze/list/status 正常、track/register --help 可调用（behavior-observed）

### EV-2026-08-27-007
- level: semantic
- object: 任务内 owner 交互：默认自主+事后纠偏，请示为异步例外（workcell-service.md 决策 3/11）
- date: 2026-08-27
- ref: theory/harness.md default-autonomy-with-correction / owner-facing-progress
- note: 用户确认装置目的即尽可能自主决策；决策方向从『二选一 owner 通道』改为『自主优先 + 异步例外 + 事后纠偏』

### EV-2026-08-27-008
- level: semantic
- object: WorkCell 形态确认：单节点持续运行服务 + harness 上游构造（workcell-service.md 决策 3/11/§3 修正）
- date: 2026-08-27
- ref: 用户澄清（2026-08-27）
- note: 修正 EV-2026-08-27-007 方向：任务内自主规则属上游 harness 而非服务属性；服务不内置 harness 决策、不设任务内 owner 通道

