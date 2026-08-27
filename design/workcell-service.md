# WorkCell 服务设计（任务委托服务平台）v2

> 状态：设计草案（v2），未实现。v0：隔离 sub agent 设计要点 + Main 综合（sa_20260827_133308）。
> v0 → v1：5 组假想演练（A 执行/自定义、B 并发/取消/失败/崩溃、C 边界/安全/扩容/观测、
> D 长任务/协作/运维、E 上游调用视角）共 70+ 问题，处置为必答决策清单 / 规范补充 / 实验待定 / 已确认正确。
> v1 → v2：形态确认（单节点持续运行服务 + harness 由上游构造，服务不内置 harness）；
> 8.1 必答设计决策 11 项全部定案。
> 定位（用户指导）：WorkCell = **任务委托服务平台**——上游（委托人）把有界 agent loop 任务委托给
> 平台执行；平台 = 无编排的有界执行面；委托 = 任务声明 + 执行 + 证据返回，接受权留在委托人。
> 形态变化（用户指定）：单节点持续运行的服务（task worker 节点）——可发布 agent loop 任务执行，
> 任务自定义 provider/tools/skills/prompt，是基础设施服务，将来可扩容成集群。
> 依据：旧协议 Draft（`.archive/design/work-cell-protocol.md`）、v0.5 历史实现（`origin/archive/v0.5` @ b5ecf419）、
> harness 理论（`theory/harness.md`）、本项目组合（`design/agent-stack.md` / `test-manual.md` / `observability/`）。
> 本设计是迁移输入，不构成实现授权（旧 Draft §18：设计评审完成后才进入实现；roadmap 阶段 4-5）。

## 1. 服务形态与生命周期

- **单节点持续运行** = 长驻进程 + 有界任务队列 + 每任务一个隔离 agent loop；不是单任务阻塞，也不是 v0.5 的一次性 CLI 进程。依据：031 决策已验证 in-process queue（"producer may submit Cells while execution is running"），服务 = 该 kernel 的常驻化。
- **生命周期**：发布（API 收 RunRequest + 自定义声明 → taskId/runId，入队）→ admission（取 lease → 物化 Binding，运行期不可变）→ executing（agent loop，事件实时流出）→ completed/failed/cancelled → record finalization → RunRecord 持久化。状态机沿用旧 Draft：`admitting → running → cancelling → draining → cancelled|failed`。
- **取消三边界**沿用旧 Draft（cancel requested / draining / record finalization）。
- **恢复**：v1 不做原地 resume——继续 = 新 run + `continued-from`；retry = 新 run + `retry-of`；进程崩溃后活跃 run 以 `host_failure`/`failed` 收尾、未确认效果记 `unknown`，不设计跨崩溃续跑。
- 队列/租约/容量/恢复属外层 runtime，不进 WorkCell core。

## 2. 对象模型

- **沿用旧 Draft 四对象**：WorkCellSpec（provider-neutral 声明）/ Binding（host-resolved 授权与效果边界）/ RunRequest（一次启动请求）/ Run + RunRecord（执行态与记录）+ Event + EvidenceRef。服务形态**只换载体，不换核心语义**（声明 vs 授权 vs 请求 vs 执行 vs 记录 分离）。
- **增量**（执行选择层，不进 core）：`WorkItem`（任务身份，关联多次 attempt）+ provider/model 选择（旧 Draft 明确 Spec 不含 provider）。
- **agent loop 表达**：任务声明 = **一个 loop 的声明**（objective + prompt + skills + tools + limits），多轮是 loop 内部事实；跨任务多步由外部 work map 驱动。服务**不接受多任务工作流声明**。

## 3. 任务自定义机制

| 维度 | 机制 |
|---|---|
| provider/model | v0.5 ExecutionProfile + WorkerCatalog（workerId 选择，fail-closed）；provider 路由/定价留在 integrations 岛 |
| tools | host 工具面（由 Binding 决定，中立 host 端口）+ 任务自定义工具（schema 声明、服务侧注册、按名引用）；**第一版禁止任务上传可执行代码**；声明永不自授效果 |
| skills | **服务内复用文件系统 skills 为主**（任务声明 skill 名 + 可选 revision，服务注入 `.agents/skills/*/SKILL.md`，不复制不双源——单一语义源）；内嵌为显式例外；任务内 agent **不全量自动发现宿主 skills**——显式白名单 + 入口指令（默认引用基线 AGENTS.md，可被任务覆盖）；集群化时才抽象 skill registry（不预建） |
| prompt | 任务声明携带（objective + 入口指令），覆盖基线 AGENTS.md 时显式声明 |

**harness 上游构造**（用户确认）：任务内 agent 的自主/请示/纠偏规则由上游注入的 harness 内容（AGENTS.md/skills/prompt）决定，服务**不内置 harness**；任务声明 = 上游构造的执行规格 + harness 内容，随委托注入。

## 4. 观测与证据

- **双通道**：实时事件流（WorkCellEvent 封闭联合）+ RunRecord（持久记录）；EvidenceRef（7 类）+ standing（observed/unavailable）。
- **对接 test-manual 分层**：L1 = 事件流（工具调用/模型步骤/决策，对应 reasonix `--trajectory`）——**建议新增 `skill.loaded` 事件**（现有观测缺口）；L2 = snapshot/diff + artifacts；L3 = finalText/output 自报，标注 `self-report`。
- **成本**：usageByPhase + providerFingerprint + standing 纪律；订阅制不下 dollar estimate。
- **观测分层**：默认低成本结构化事件 + usage；详细轨迹按任务声明开启（traceLevel）——"观测装置不常驻"在服务形态下由任务声明控制（按需开/关，不默认全量）。

## 5. 扩容路径（单节点 → 集群）

- **预留（协议层，低成本）**：无状态边界（Run 活跃态与 RunRecord/Event 持久分离，spec/binding 引用 + digest 可独立物化）；任务身份（requestId/cellId/runId/taskId 分离 + idempotencyKey）；观测聚合（EvidenceRef.uri 指向共享存储；Event ordering/dedup/replay 为集群化前置决定项）；队列载体替换（durable queue 是同一协议上的另一 carrier）。
- **不预建（克制 007A）**：分布式队列/消息总线、集群注册发现/负载均衡、跨节点 live run 迁移、Event 跨进程重放保证、skill registry 服务、共享 mind/投票/synthesis。

## 6. 迁移关系

- **保留（Draft）**：四对象 + 命名表、16 条不变量、独立版本化、取消三边界、failure code、retry/continued-from、standing、迁移表、验收标准。
- **保留（v0.5）**：中立 host 端口、StepAllowance/ResourceLimits、ExecutionProfile/WorkerCatalog fail-closed、usageByPhase + standing、AI SDK/Pi driver + integrations 岛、031 WorkSource/lease/settlement、snapshot/diff、TaskToolSet 注入。
- **弃掉**：CellInput 大对象（服务 API 不收，仅 adapter 转换）、`status` 混合 `passed`（→ execution.state + checks + 外部 acceptance）、CLI 一次性形态（→ 服务 API，CLI 降为客户端）、trace/rawSteps 作规范化总称、单一 WORK_CELL_RECORD_VERSION、tasks/workerId 进 core。
- **理论承接**：Task 是关系（任务声明含贡献契约五要素）；证据链四层（观测层须支撑 activation observation）；对象论（服务拥有 Run/效果/机械检查，接受权归外部 owner，服务不内建 acceptance）；机制派生准入（007A）。

## 7. 边界与未知（待实验/owner 决定）

1. 服务 API 契约（推断异步任务 + 事件流）与任务并发模型（单节点同时几个 loop、隔离程度）；
2. skills 注入的版本固定（digest/revision）与白名单默认策略；
3. Event 跨进程 ordering/dedup/replay（集群化前置）；
4. 服务持久化载体（文件系统 vs 数据库）与队列崩溃恢复（倾向 v0.5 run.json 模式，未验证）；
5. crash 恢复语义的服务化验证；
6. 长 loop 上下文管理（compaction / focus refresh，v0.5 无，reasonix 有 PreCompact）；
7. 任务内自治边界（是否继承"默认自治 + 事后纠偏"）；
8. 实现授权：roadmap 阶段 4-5，旧 Draft §18 要求设计评审完成后才授权实现。

## 8. 假想演练发现与处置（5 组 70+ 问题）

5 组并行推演（A 执行/自定义 12、B 并发/取消/失败/崩溃 21、C 边界/安全/扩容/观测 23、D 长任务/协作/运维 15、E 上游调用视角），推演者：sa_20260827_135852 / 140109 / 140620 / 140943 / 141335。

### 8.1 必答设计决策（已全部定案）

1. **注入载体与单一语义源（定案）**：**服务侧注入为唯一权威源**——任务声明只允许**引用**（skill 名 + 可选 revision/digest），不允许内嵌 skill 内容；注入语义 = 服务把被引用 skill 的 SKILL.md 内容注入执行上下文（文本注入），不传路径；上游工作区不是注入源（服务与上游工作区解耦）。内嵌为显式例外：需任务声明标记 `inline-skills` + 上游审核，且内嵌内容不取得与文件系统 skill 同等的权威（单一语义源，theory/theory.md）。
2. **默认基线 vs 白名单（定案）**：**默认无白名单**——任务内 agent 按注入的基线 AGENTS.md 路由表全量加载 project skills（与当前 harness 行为一致，harness 由上游构造）；白名单是**可选收窄**（任务声明 `skill-whitelist` 限制加载集）；声明了白名单时**白名单是硬边界**——入口指令/路由表不得加载白名单外 skill。默认与收窄两种模式都明确，无冲突。
3. **harness 由上游构造，服务不内置**（已定案，见上）。
4. **服务级控制面（定案）**：提供服务级 graceful shutdown——drain 流程（停 admission → 排空进行中 run → record finalization → 退出），与崩溃区分（计划停机发 `shutdown` 事件 + draining；崩溃 = `host_failure`）。撤销型配置变更（如 skill 撤回）：**只影响后续 admission**，运行中 run 按 admission 快照继续（Binding 运行期不可变），不强制终止。
5. **崩溃收尾与落盘（定案）**：**事件日志（append-only）为 run 状态的唯一写源**——关键状态变化（admitted/running/cancelling/completed/failed/cancelled）作为事件落盘；进程重启后重放事件日志对未终态 run 收尾（`host_failure`/`unknown`）；无独立状态库、无双写（旧进程无补写终态路径）；record finalization 由重启后的服务或显式 reconciliation 完成，非原子写但以事件日志为准。
6. **并发隔离与 limits 执行层（定案）**：v1 **有限并发**——默认 1（顺序），可配置小并发数（如 ≤4）；每任务独立 agent loop 执行单元（进程/线程隔离，一个任务失控不影响其他）；**limits 由服务侧 coordinator 硬强制**（token/步数/时长/输出字节，超限即 terminate → `failed`/`limit_exceeded`），adapter 自检为 fail-fast 补充；**cost 硬上限** = 任务声明 `cost-budget`，超出即终止（`cost_exceeded`）。
7. **取消副作用与 draining 有界性（定案）**：取消后已产生的外部效果**不自动回滚**（服务不拥有外部世界）——记入 EffectSummary（已发生效果清单）供委托人处置；draining 有 deadline（默认 30s，可配），超时强杀执行单元；record finalization 无条件执行（强杀后也完成）。
8. **retry 血缘（定案）**：retry = 新 run + `retry-of` 指向原 runId；**parent 校验**（parent 必须存在且终态为 failed/cancelled 才允许 retry）；换 provider/参数 = 重新 admission（新 Binding），retry 声明可覆盖执行选择层；血缘链记录在 RunRecord（lineage）。
9. **skills 分发与扩容（定案）**：**v1 不预建 registry/分发**——任务声明的 skill 引用带 **digest**（内容寻址），未来集群时 registry 只是把"引用解析"从本地文件换成注册表（预留点，不实现）；durable queue 双跑防护：**idempotencyKey 下沉到 run 层**（同 requestId + idempotencyKey 重投不双跑）+ lease 语义。
10. **服务形态的 L1 观测（定案）**：**服务事件流即 L1**（工具调用/模型步骤/决策轨迹由服务产生，无需 reasonix --trajectory——那是交互会话的观测装置）；补事件类型 `skill.loaded`、`context.compacted`、`decision`（任务内关键决策点，含 uncertainty 标注）；standing 补 `summarized`（压缩后证据降级标记）；详细轨迹按任务声明 `trace-level` 开启（默认结构化事件 + usage，观测装置按需纪律由任务声明表达）。
11. **任务内自治边界（上移至上游 harness）**（已定案，见上）。

### 8.2 规范补充（中严重度）

- 任务声明校验与注入规范：admission 校验清单（skill 名/revision digest/重名裁决/工具命名空间）、prompt 装配顺序、覆盖粒度（整体 vs 入口段）、注入产物进 Binding digest。
- EffectSummary 三场景规则（取消/失败/成功）一并冻结；record finalization 原子性。
- 中间产物传递通道：明示"产物经委托人传递"或 EvidenceRef.uri 共享存储最小版。
- 整链取消/批量查询 API（多任务链）；RunRecord 格式版本冻结在 admission；skill 注入 revision/digest 记入 RunRecord（可审计）。
- 默认 provider/limits/白名单策略（原未知项 2 转规范）。

### 8.3 实验待定（保留 unknown，进实验清单）

并发上限取值、持久化载体（文件系统 vs 数据库）、事件 retention、crash 恢复语义验证、长 loop 上下文管理（compaction 触发位置）、认证授权、队列崩溃恢复。

### 8.4 已确认正确（推演未发现问题）

外部 work map 驱动（服务无编排）、crash=host_failure 取舍、Binding admission 快照、独立版本化、接受权外部化（服务不内建 acceptance）、取消三边界、fail-closed、委托语义（Task 是关系、上游唯一编排者）、**harness 上游构造、服务不内置**（用户确认：WorkCell=底层基础服务，harness 由上游构造注入——任务内自主规则属上游 harness，非服务属性）。

### 8.5 定位与上游使用模式（用户指导，必答前置）

WorkCell = **任务委托服务平台**（见头部定位）。上游使用模式由"未知"升级为**显式假设清单**（API 五类）：委托 submit / 状态查询 / 取消 / 事件订阅 / 产物与证据获取；上游是唯一编排者（A→B→C 链由上游逐个委托），服务是无编排的有界执行面。

## 引用

`.archive/design/work-cell-protocol.md`（Draft 全文 1193 行）；`origin/archive/v0.5` @ b5ecf419 `packages/work-cell/src/{contracts,driver,host-port,cli,index}.ts` + README；`.archive/archive/design/decisions/031、033`；`theory/harness.md`、`theory/theory.md`、`theory/thoughts/workflow.md`；`design/agent-stack.md`、`design/test-manual.md`、`design/observability/reasonix.md`、`AGENTS.md`。
