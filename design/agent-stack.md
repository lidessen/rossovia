# Agent 组合方案：AGENTS.md + Skills + 工具

> 状态：方案草案，未实施。
> 版本：v3（v0 → v1：新增"应用 → 集中迭代 → 理论演进"闭环，移除候选区，采纳 stable/unstable + 版本机制；
> v1 → v2：设计修剪——工具 9→5 合并，method-evolution 与 4.2 迭代协议合一，纠偏闭环归入 practice-cycle，
> focus refresh 并入 resume；
> v2 → v3：新增 4.4 基础集成测试（测试手册给主 agent，证据分层 L1/L2/L3），观察机制按宿主适配，
> 集中索引见 `design/observability/`）。
> 依据：`theory/` 最新整理内容。
> 目标：让 agent 走得更远（长任务持续推进 + checkpoint 回返）、更独立（默认自治 + 事后纠偏）、
> 主观能动性更强（从目标与现实产生有价值的下一候选、采取有界行动、按结果改变后续判断）。

## 分层

`theory/`（为什么）→ `AGENTS.md`（入口/宪章，极短常驻）→ `skills/`（方法，按触发选择性加载）→
harness 文档（详细版）→ `notes/`（记录）→ `.archive/`（只读）。
工具属 base/runtime 层，承接文字做不到的强制、权限、原子性、恢复与观测。

## 1. AGENTS.md 放什么

1. **目的与边界**：accepted purpose、objective、non-goals、canonical authority、接受权归属（能动性的"目的锚"）。
2. **自治契约（核心）**：默认自主处理局部事务；必须请示四类事——改变整体方向 / 价值判断 / 权限关系 / 共享基线 / 重大不可逆后果；请示形成最短选择题、只暂停受影响分支；小错走事后纠偏，不逐点请示。
3. **work map 约定**：多步/多任务默认外部化 Plan/Todo（Plan 保整体义务、Todo 保当前可行动义务）；发现新依赖/未知先更新关系再继续；checkpoint 即把 work map 留好，恢复时读取（回返条件随状态保存）。
4. **运行机制锚点**：开始/恢复/角色交接/checkpoint 时做 resume——从 work map 恢复目标/约束/决定/进度，并从 canonical 源重选承重方法（focus refresh 是 resume 的子动作）；偏差走 practice-cycle 纠偏（发现 → 限制 → 区分 → 最小修正 → 隔离验证 → 沉淀或回退）。
5. **skill 索引与触发**：指向 skills、每个 skill 何时加载、关键参考文档位置（不把全部 doctrine 复制进常开 context）。
6. **禁止写**：不写"要主动/要更积极"口号；不承诺文字无法执行的东西（强制/权限/唤醒属 runtime/base）；不建第二任务板或常驻协调者。

## 2. Skills 设计（四组 11 个 + 可选 2）

### 自主推进组
- `planning-inbox`：低摩擦接住任意想法/观察/待办，保真 capture、capture 与 process 分离，不偷换成承诺（open gaps 来源）。
- `work-estimation`：恢复最小工作图与分支，只估算到能区分当前决策的粒度。
- `practice-cycle`：从一次真实实践结果判断下一最小实践，用反观察修订理解（反馈改变判断的闭环）。
- `method-evolution`：执行集中迭代协议（方法主体见 4.2）——checkpoint 回顾总结、肯定好的改进差的，滚动更新方法体系，保留 baseline/rollback/lineage（009A）。

### 边界与协同组
- `owner-facing-progress`：判断是否值得打扰 owner，设身处地形成最短 decision package，保留选择权继续独立工作（自治的边界控制）。
- `agent-delegation`：判断真实有界贡献是否/如何交给另一 Agent，表达贡献边界并把带 standing 的结果重连回整体。

### 判断与表达组
- `concept-articulation`：从证据形成足以区分最近邻的概念与正式指称，先定义后命名。
- `form-selection`：为来源有界的语义对象选最小真实形式（载体判断）。
- `agent-expression`：把任务/方法表达成 Agent 能正确判断、行动并返回的内容。
- （可选）`human-writing`、`dual-audience-expression`：面向人/双受众的写作与同步。

### 沉淀与克制组
- `skill-formation`：判断反复出现的差距是否沉淀为可选择性加载的 skill，管生命周期（创建/改写/拆分/合并/降级/删除）。
- `mechanism-design-review`：加机制前判断真实对象与最小处置，防止把行为模式机制化。

## 3. 组合关键机制

1. **分层选择性加载**：AGENTS.md（宪章，极短常驻）→ skills（按触发加载）→ harness 文档（详细版）；base/runtime 管强制与权限；防承重方法被稀释。
2. **默认自治 + 事后纠偏作总开关**：AGENTS.md 给自治权限与请示标准，`owner-facing-progress` 判边界，`practice-cycle` 跑纠偏闭环，`skill-formation`/`method-evolution` 沉淀经验——自治是可观察、可限制、可回退的循环，不是权限膨胀。
3. **能动性三回路**：目的锚（AGENTS.md）→ 行动回路（`work-estimation` 选下一步、`agent-delegation` 有界分派）→ 反馈回路（`practice-cycle` 用结果改变后续判断）→ 记忆回路（`skill-formation`/`method-evolution` 沉淀 correction）→ 回到目的。
4. **work map 外部化驱动**：Plan 保义务、Todo 保行动、checkpoint 保回返；例外仅限一步完成、低风险可逆——长任务连续性的机制解。
5. **四层证据链**防"处理了没走到最后"（012A/013A）：semantic handoff → carrier handoff → activation observation → adoption evidence；`archive-*` 不吞应用义务。
6. **表达纪律贯穿**：面向 Agent 的表达显露改变判断和行动的条件（来源状态/允许效果/验收/返回）；承重语义先于 token 经济；单一语义源；最小真实形式。
7. **克制机制**：`mechanism-design-review` 作准入检查，防止为"更独立"反而加出更多门和状态。

## 4. 应用 → 集中迭代 → 理论演进（闭环）

这套系统自身的迭代方式：实现并应用 skills+工具 → 应用期产生问题/新想法/理论意见/纠正 → 登记分类 →
集中基于新结果迭代 AGENTS.md+skills → 理论随版本积累进化。

### 4.1 反馈登记与路由

应用期的反馈性质不同，登记时先分类（机械字段：类型/来源/对象/standing，语义判断归 LLM）：

| 类型 | 例子 | 路由（最小 owner） |
|---|---|---|
| 问题/缺陷 | skill 失效、工具缺口 | 修 skill / 工具 / AGENTS.md / runtime |
| 新想法 | 方法候选、机制候选 | 沉淀到 `skill-formation` 或理论演进入口（见 4.3） |
| 理论意见 | 改变假设、质疑条目 | 理论演进（见 4.3） |
| 纠正 | Principal 改变已有假设/范围/owner | Principal correction 闭环（见下） |

**Principal correction 闭环**：纠正不是评论或局部文字修订，是改变既有假设与下游有效性的来源事件。
`correction → assumption delta → owner routing → stale propagation → re-evaluation → accepted disposition`。
必须保留 raw、来源与 authority、指向的对象与 revision；不因语气/频率/自报取得 Principal 身份。

### 4.2 集中迭代协议（即 method-evolution 的方法主体）

一轮迭代（由 checkpoint 触发，语义边界决定，不是固定轮数）：

1. **冻结 baseline**：打版本号 + 文件指纹（AGENTS.md + skills + theory 整套）；diff 与回退点据此建立。
2. **收拢与路由**：按 4.1 的登记分类，送回最小 owner。
3. **变更与验证**：变更后按证据等级验证（format-valid → behavior-observed → boundary-supported → matched-improvement → regression-supported）；应用观察是非受控的，只能产生假设，关键改动升级到受控验证（eval，Phase 2）；无 matched baseline 不声称改善。
4. **结算**：acceptance card（接受者/硬约束/重大退化定义/最小证据/成本预算/观察窗口）；处置集合 `adopt / adapt-and-retest / retain-baseline / no-proposal / rollback / uncertain`；不允许长期未结算（005A）。结果出现后不为通过改写 card。
5. **出新版本**：结算即出新版本号；任何一轮可回退/切换到上一版本。

### 4.3 理论演进（stable/unstable + 版本）

**不做候选区、不做多级 standing——只标记稳定/不稳定，靠版本提供回退/切换。**

- `thoughts/`：只追加的原始想法，不承诺稳定（新想法的天然存放处，零新增步骤）。
- `theory/` 权威源：只收录已采纳、稳定的主张，每条标记 `stable`（默认）。
- 被应用结果/纠正质疑的主张：原地改标 **`unstable`**，不移动、不另建区；出路只有两条——修订后重新 `stable`，或回退（005A：不长期挂着）。
- `unstable` 触发下游 stale 检查（谁引用了它：skill/文档/AGENTS.md），生成 stale 清单并重生成（血统传播 `P → theory → skill/文档` 的实操）。
- **provenance**：每条主张一行注记指向来源（thoughts 条目 id、应用观察、纠正、eval 结果），证据链可回读。
- 理论进化 = 版本的积累 + 个别条目的稳定度标记；无候选区、无状态机。

### 4.4 基础集成测试（测试手册，给主 agent）

**定位**：验证组合（AGENTS.md + skills + 工具）是否让 agent 独立走完真实任务并返回可重连证据；
组合有实质变更时运行（每次迭代结算前，即 4.2 第 3 步"变更与验证"的受控部分）。
这是"实践是检验真理的唯一标准"（P15）的落地，也是 eval 脚手架（第 5 章第三批）的种子。

**角色分工**：主 agent 是编排者与评估者；sub agent 是隔离冷启动的执行者（Agent as tool，无上下文，
只给任务 + 项目文件——同时测发现层与路由层）；执行者不评估自己（producer/reviewer 分离）。

**步骤**（主 agent 按手册执行）：
1. 冻结环境：组合版本快照、fixture 集冻结。
2. 选场景：2-3 个代表性端到端 fixture（想法处理 / 概念设计 / 迭代纠偏）+ 1 个回归集（已支持行为）。
3. 委派执行：每个 fixture 作为有界任务发给隔离 sub agent（贡献契约：对象/允许效果/返回 trace；
   事实操作一律走工具，便于观测）。
4. 收证据：从观测层与 sub agent 回执收集执行记录（读了什么、加载了什么 skill、产物、声明的未知）。
5. 三层评估：机械（产物格式/契约，脚本断言）→ 行为（路由与 skill 加载是否符合预期，观测 trace）→
   语义（目标关系是否真的改变、返回可否重连，主 agent 判断；关键项可再委派独立评审）。
6. 对照与回归：裸 agent vs 组合（matched-improvement 的来源）；回归集确认已支持行为未丢。
7. 处置：adopt / adapt-and-retest / retain-baseline / rollback / uncertain → 结果进证据链追踪，与版本绑定。
8. 防污染：fixture 结果出现后不改、holdout 场景主 agent 未见、记录随版本快照。

**证据分层**（行为证据的可靠度排序，判定只能建立在 L1/L2 之上）：
- **L1 宿主观测**（优先，机械证据，确定性观察者）：工具调用 trace、事件记录、会话日志。
- **L2 产物证据**：文件写入、git diff（确定性但间接）。
- **L3 agent 自报**（回退，降级）：无观测可用时让 agent 生成 trace，但必须标注 `self-report`、
  证据等级降级，且与 L1/L2 交叉验证；自报永远只作补充，不作行为证据。

**观察机制按宿主适配**：不同 harness 工具的观测方式不同（hooks、会话日志、插件接口等），
具体机制不写进本手册——每工具一篇文档，集中索引见 `design/observability/`；未探明的工具标
`unknown`，实际使用该 harness 时现场探明后补文档。

## 5. 工具（工欲善其事，007A：按问题复杂度准备；不造与既有载体重复的工具）

### 第一批：小而即用（先做）
- **登记脚本**：capture 模式（thinking-log 编号/追加、防覆盖，机械部分归确定性脚本，LLM 只做语义保真）+ process 模式（反馈分类登记：类型/来源/对象/standing，4.1 的机械部分）。
- **一致性检查脚本**：skill frontmatter、引用链接、条目编号、standing 失效引用（link + stale 一体；机械证据归确定性观察者）。
- （checkpoint 由 work map 承担——checkpoint 时把 Plan/Todo 留好、恢复时读取，不单列模板。）

### 第二批：闭环支撑（Phase 1 后段）
- **版本快照脚本**（核心）：迭代前冻结 baseline（版本号 + 文件指纹）、结算出新版本、回退/切换版本。
- **证据链追踪**：一张表记录四层证据（semantic handoff / carrier handoff / activation observation / adoption evidence）；skill 激活日志与应用义务追踪是其输入与字段，不单独设工具。

### 第三批：Phase 2 再做
- **eval 脚手架**：baseline vs treatment 对照、holdout 管理（001C/004A）；落地形态与方法见 4.4，等有真实行为可测再建。

## 6. 边界（不做什么）

- 不造第二个任务板/常驻协调者；不造总控 scheduler/registry/runtime（006B）。
- 不设理论候选区、不做多级 standing 状态机（stable/unstable + 版本已够）。
- 不为"以后可能需要"预造工具——同一摩擦出现第二次才造（007A）；不造与既有载体重复的工具（checkpoint 归 work map、激活日志/应用义务归证据链追踪）。
- 不把文字当强制/权限/唤醒（属 base/runtime）；不把记录当承诺；不把流程完整当完成。

## 7. 一句话总结

AGENTS.md 给"目的 + 自治权限 + 边界 + 入口"，skills 给"推进、边界、表达、沉淀"四组可选择性加载的方法，
工具承接文字做不到的机械、版本与恢复——靠"默认自治纠偏 + 能动性三回路 + work map 外部化 + 四层证据链"
接成闭环；系统自身靠"反馈登记 → 集中迭代（版本冻结/结算/回退）→ 理论 stable/unstable 演进"滚动进化，
让 agent 自主走远、越走越强。
