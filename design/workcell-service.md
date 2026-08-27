# WorkCell 服务设计（任务委托服务平台）v5

> 状态：设计草案（v5），未实现。设计过程/推演处置/评审修正见 `design/workcell-service-log.md`（本文件只含规范主体 + 技术规格）。
> 定位：**任务委托服务平台**——上游（委托人）把有界 agent loop 任务委托给平台执行；平台 = 无编排的有界执行面；
> 委托 = 任务声明 + 执行 + 证据返回，接受权留在委托人。
> 形态：单节点持续运行的服务（task worker 节点）；**harness 由上游构造**（服务不内置 harness/自主决策/owner 通道）。
> 依据：旧协议 Draft（`.archive/design/work-cell-protocol.md`）、v0.5 历史实现（`origin/archive/v0.5` @ b5ecf419）、
> harness 理论（`theory/harness.md`）、本组合（`design/agent-stack.md` / `test-manual.md` / `observability/`）。
> v5 = v4（协议/机制层）+ 技术规格（规格化 sub agent sa_20260827_160919 产出，Main 裁决 7 项冲突后并入）。
> 本设计不构成实现授权（旧 Draft §18：设计评审完成后才进入实现；roadmap 阶段 4-5）。

## 1. 形态与生命周期

- **单节点持续运行** = 长驻进程 + 有界任务队列 + 每任务一个隔离 agent loop 执行单元；不是单任务阻塞，也不是 v0.5 的一次性 CLI 进程。
- **生命周期**：发布（API 收 RunRequest + 任务声明 → taskId/runId，入队）→ admission（取 lease → 物化 Binding，运行期不可变）→ executing（agent loop，事件实时流出）→ completed/failed/cancelled → record finalization → RunRecord 持久化。状态机沿用旧 Draft：`admitting → running → cancelling → draining → cancelled|failed`（queued 为服务层态，见 §9.4）。
- **取消三边界**沿用旧 Draft（cancel requested / draining / record finalization）。取消后已产生的外部效果**不自动回滚**（服务不拥有外部世界）——记入 EffectSummary（已发生效果清单，未确认效果记 unknown）供委托人处置；draining 有 deadline（默认 30s，可配），超时强杀执行单元；record finalization 无条件执行。
- **恢复**：v1 不做原地 resume——继续 = 新 run + `continued-from`；retry = 新 run + `retry-of`（parent 必须存在且终态为 failed/cancelled；换 provider/参数 = 重新 admission，retry 声明可覆盖执行选择层；血缘链记录在 RunRecord lineage）；进程崩溃后活跃 run 以 `host_failure`/`failed` 收尾、未确认效果记 `unknown`。
- **崩溃收尾**：事件日志（append-only）为 run 状态的唯一写源——关键状态变化作为事件落盘；重启后重放事件日志对未终态 run 收尾；无独立状态库、无双写；record finalization 由重启后的服务或显式 reconciliation 完成。
- **服务级控制面**：graceful shutdown（停 admission → 排空 → record finalization → 退出），与崩溃区分（计划停机发 `shutdown` 事件 + draining；崩溃 = `host_failure`）；撤销型配置变更只影响后续 admission（Binding 不可变），紧急撤回 = 委托人显式 cancel（或任务声明可选 `force-cancel` 权限）。
- **并发与 limits**：v1 有限并发（默认 1，可配 ≤4），每任务独立执行单元（进程/线程隔离）；limits 由服务侧 coordinator 硬强制（token/步数/时长/输出字节，超限 terminate → `failed`/`limit_exceeded`），adapter 自检为 fail-fast 补充；cost 硬上限 = 任务声明 `cost-budget`（`cost_exceeded`；standing=unavailable 时降级事后记录 + 审计）。
- 队列/租约/容量/恢复属外层 runtime，不进 WorkCell core。

## 2. 对象模型

- **沿用旧 Draft 核心对象模型**：WorkCellSpec（provider-neutral 声明）/ Binding（host-resolved 授权与效果边界）/ RunRequest（一次启动请求）/ Run + RunRecord（执行态与记录），配套 Event + EvidenceRef。服务形态**只换载体，不换核心语义**（声明 vs 授权 vs 请求 vs 执行 vs 记录分离）。
- **增量**（执行选择层，不进 core）：`WorkItem`（任务身份，关联多次 attempt）+ provider/model 选择。`workerId` 由服务层 TaskDeclaration 承载，core Spec 不放（避免"workerId 进 core"）。
- **agent loop 表达**：任务声明 = **一个 loop 的声明**（objective + prompt + skills + tools + limits），多轮是 loop 内部事实；跨任务多步由外部 work map 驱动。服务**不接受多任务工作流声明**。

## 3. 任务自定义机制

| 维度 | 机制 |
|---|---|
| provider/model | v0.5 ExecutionProfile + WorkerCatalog（workerId 选择，fail-closed）；provider 路由/定价留在 integrations 岛 |
| tools | host 工具面（由 Binding 决定，中立 host 端口）+ 任务自定义工具（schema 声明、服务侧注册、按名引用）；**第一版禁止任务上传可执行代码**；声明永不自授效果 |
| skills | **服务侧注入为唯一权威源**：任务声明按名+digest 引用，服务把 `.agents/skills/*/SKILL.md` 内容**文本注入**执行上下文（不复制不双源，单一语义源）；**默认无白名单**——任务内 agent 按注入基线 AGENTS.md 路由表全量加载 project skills（与当前 harness 一致）；白名单为可选收窄（`skill-whitelist`，声明后为硬边界）；内嵌为显式例外（`inline-skills` + 上游审核）；集群化时才抽象 skill registry（不预建，digest 引用为预留） |
| prompt | 任务声明携带（objective + 入口指令），覆盖基线 AGENTS.md 时显式声明（`baselineOverwrite`） |

**harness 上游构造**：任务内 agent 的自主/请示/纠偏规则由上游注入的 harness 内容（AGENTS.md/skills/prompt）决定，服务**不内置 harness**；任务声明 = 上游构造的执行规格 + harness 内容，随委托注入。admission 校验：skill 名/digest、重名裁决、工具命名空间、prompt 装配顺序、覆盖粒度（整体 vs 入口段）；注入产物进 Binding digest。

## 4. 观测与证据

- **服务事件流即 L1**（工具调用/模型步骤/决策轨迹由服务产生，无需 reasonix `--trajectory`——那是交互会话的观测装置）。
- **双通道**：实时事件流（WorkCellEvent 封闭联合，见 §9.6）+ RunRecord（持久记录）；EvidenceRef（**6 类**，Draft §7.2）+ standing。
- **standing 取值**：`observed` / `unavailable`（必带 reason）/ `summarized`（压缩后证据降级标记）——三值为 v5 刻意扩展（Draft 两值）。
- **对接 test-manual 分层**：L1 = 服务事件流；L2 = snapshot/diff + artifacts；L3 = finalText/output 自报，标注 `self-report`。
- **观测分层**：默认记录低成本结构化事件 + usage；详细轨迹按任务声明 `trace-level` 开启。
- **成本**：usageByPhase + providerFingerprint + standing 纪律；订阅制不下 dollar estimate。

## 5. 扩容路径（单节点 → 集群）

- **预留（协议层，低成本）**：无状态边界（Run 活跃态与 RunRecord/Event 持久分离，spec/binding 引用 + digest 可独立物化）；任务身份（requestId/cellId/runId/taskId 分离 + **idempotencyKey 下沉到 run 层**——同 requestId + idempotencyKey 重投不双跑 + lease 语义）；观测聚合（EvidenceRef.uri 指向共享存储；Event ordering/dedup/replay 为集群化前置决定项）；队列载体替换（durable queue 是同一协议上的另一 carrier）；skill 引用 digest（内容寻址）——集群时 registry 只是把引用解析从本地文件换成注册表。
- **不预建（克制 007A）**：分布式队列/消息总线、集群注册发现/负载均衡、跨节点 live run 迁移、Event 跨进程重放保证、skill registry 服务、共享 mind/投票/synthesis。

## 6. 迁移关系

- **保留（Draft）**：核心对象模型 + 命名表、12 条不变量（Draft §16）、独立版本化、取消三边界、failure code、retry/continued-from、standing、迁移表、验收标准。
- **保留（v0.5）**：中立 host 端口、StepAllowance/Budget（v0.5 为 Budget，无 ResourceLimits）、ExecutionProfile/WorkerCatalog fail-closed、usageByPhase + standing、AI SDK/Pi driver + integrations 岛、031 WorkSource/lease/settlement、snapshot/diff、TaskToolSet 注入。
- **弃掉**：CellInput 大对象（服务 API 不收，仅 adapter 转换）、`status` 混合 `passed`（→ execution.state + checks + 外部 acceptance）、CLI 一次性形态（→ 服务 API，CLI 降为客户端）、trace/rawSteps 作规范化总称、单一 WORK_CELL_RECORD_VERSION、tasks/workerId 进 core。
- **理论承接**：Task 是关系（任务声明含贡献契约五要素）；证据链四层（观测层须支撑 activation observation）；对象论（服务拥有 Run/效果/机械检查，接受权归外部 owner，服务不内建 acceptance）；机制派生准入（007A）；harness 上游构造（任务内行为由注入决定，服务只保证执行边界与证据）。

## 7. 技术选型（候选，可改）

实现期基于 v0.5 遗产（TypeScript + AI SDK/Pi driver）的最低成本方案；候选标注，实现计划阶段可复核调整：

| 维度 | 候选 | 理由 |
|---|---|---|
| 语言/运行时 | TypeScript + Node | v0.5 遗产（contracts/driver/host-port）全部可复用，迁移成本最低 |
| 进程模型 | 主进程 + 每任务 worker（child_process/worker_threads） | 对应 §1 每任务隔离执行单元 |
| 队列 | in-process queue（v1） | 031 已验证；并发 ≤4 无需分布式队列（§5 不预建） |
| 存储 | 文件系统（run.json 模式）+ append-only 事件日志 | 对应 §1 事件日志唯一写源；v0.5 已验证 |
| API 形态 | HTTP（submit/查询/cancel）+ SSE 事件流 | 对应委托五类 API（异步任务 + 事件订阅） |
| provider 层 | 继承 v0.5 AI SDK/Pi driver + WorkerCatalog | provider 抽象已存在，fail-closed 语义保留 |
| 认证 | v1 内部/单租户 + API key | 未知清单 12 的最简实现方案 |

## 8. 边界与未知（待实验/owner 决定）

1. 服务 API 契约细节（§9.3 已给候选，路径/命名待实现确认）；任务并发上限取值与配置入口；
2. skills digest 校验策略（是否必填、失配拒绝 admission？）；
3. Event 跨进程 ordering/dedup/replay（集群化前置；SSE Last-Event-ID 重连语义为推断）；
4. 持久化载体（文件系统 vs 数据库）与队列崩溃恢复（倾向 run.json 模式，未验证）；
5. crash 恢复语义的服务化验证；
6. 长 loop 上下文管理（compaction 触发位置：executor 内 vs 服务侧）；
7. 认证授权（API key 单租户为候选；forceCancel 权限实现）；
8. inline-skills 的"上游审核"流程（谁审核、审核载体）；
9. draining 超时强杀后的终态码（cancelled+flag vs failed）与 drain 超时配置位置；
10. token 上限（maxOutputTokens）服务侧强制落地方式（provider 无 token 预留时如何硬终止）；
11. cost-budget 实时观测前提及 standing=unavailable 降级的审计形态；
12. 实现授权：roadmap 阶段 4-5，旧 Draft §18 要求设计评审完成后才授权实现。

## 9. 技术规格

> 规格化产出（sa_20260827_160919）经 Main 裁决冲突后并入。出处：ⓥ4 = 本文件 §1-§8 定案；Ⓓ = 旧 Draft；⓿ = v0.5 源码。

### 9.1 TaskDeclaration schema（服务层任务声明）

```ts
type TaskDeclaration = {
  format: "work-cell.task-declaration.v1";   // 必填
  taskId: string;                            // 必填；委托人稳定任务身份
  objective: string;                         // 必填；loop 执行目标
  prompt?: {
    entry: string;                           // 可选；入口指令
    baselineOverwrite: "none" | "entry" | "full";  // 默认 "none"；覆盖基线须显式
  };
  skills?: SkillRef[];                       // 可选；按名+digest 引用（服务侧注入为唯一权威源）
  inlineSkills?: InlineSkill[];              // 可选；显式例外（inline-skills，上游审核）
  skillWhitelist?: string[];                 // 可选；收窄即硬边界
  tools?: ToolDeclaration[];                 // 可选；任务自定义工具 schema
  limits: ResourceLimits & { costBudgetUsd?: number };  // 必填
  execution?: { workerId?: string; profileRef?: string };  // 可选；执行选择层（fail-closed）
  traceLevel?: "low" | "detail";             // 默认 "low"
  idempotencyKey?: string;                   // 同 requestId+key 重投不双跑
  retryOf?: { runId: string; overrideExecution?: boolean };  // parent 须存在且终态 failed/cancelled
  forceCancel?: boolean;                     // 默认 false；紧急撤回权限
  metadata?: Record<string, string>;
};
type SkillRef = { name: string; digest?: string };
type InlineSkill = { name: string; content: string };
type ToolDeclaration = { name: string; description: string; inputSchema: JsonSchema; effect: "observe"|"workspace-write"|"command"|"external" };
type ResourceLimits = { maxSteps?: number; maxDurationMs: number; maxToolOutputBytes?: number; maxOutputTokens?: number };
// 约束：v1 禁任务上传可执行代码；声明永不自授效果；admission 校验 skill 名/digest、重名、工具命名空间、prompt 装配/覆盖粒度
```

### 9.2 核心类型

```ts
type RunRequest = { format: "work-cell.run-request.v1"; requestId: string; taskId: string;
  declaration: TaskDeclaration | { ref: string; digest: string }; idempotencyKey?: string;
  parent?: { runId: string; relation: "retry-of"|"continued-from" }; requestedBy?: string };

type Binding = { format: "work-cell.binding.v1"; bindingId: string; taskId: string;
  digest: string;                 // 注入产物整体 digest
  workspace: WorkspaceBinding; toolSurface: ToolGrant[]; effectPolicy: EffectPolicy;
  executor: ExecutorSelection;    // 由 workerId/profile 解析
  injected: { skills: { name: string; digest: string; source: string }[];
              assembledPrompt: { objective: string; entry?: string; baselineOverwrite: "none"|"entry"|"full" };
              registeredTools: string[] };
  limits: ResourceLimits & { costBudgetUsd?: number }; expiresAt?: Timestamp; createdAt: Timestamp };

type Run = { runId: string; requestId: string; taskId: string; cellId: string;
  state: "admitting"|"running"|"cancelling"|"draining"|"completed"|"failed"|"cancelled";
  startedAt?: Timestamp; endedAt?: Timestamp };

type RunRecord = { format: "work-cell.run-record.v1"; runId: string; requestId: string; taskId: string; cellId: string;
  execution: ExecutionOutcome; runtime: RuntimeObservation; responseText?: string; output?: unknown;
  completionChecks: MechanicalCheck[]; effects: EffectSummary;
  usage?: UsageObservation;        // input/output/cached + usageByPhase + providerFingerprint(+standing)
  evidence: EvidenceRef[];         // 6 类（Draft §7.2）
  lineage: { parent?: { runId: string; relation: string }; retryOf?: string };
  selfReport?: boolean; createdAt: Timestamp };

type WorkItem = { itemId: string; taskId: string; requestId: string; declarationRef: string;
  state: "queued"|"admitted"|"done"; attempts: { runId: string; startedAt: Timestamp; outcome?: AttemptOutcome }[];
  ownerRef?: string };

type EffectSummary = { workspaceChangeSet?: { added: string[]; changed: string[]; removed: string[] };
  commands?: { argv: string[]; exitCode?: number; standing: Standing }[];
  network?: { host: string; standing: Standing }[]; external?: { kind: string; ref?: string; standing: Standing }[];
  unknownEffects: { description: string; evidenceRef?: EvidenceRef }[] };  // 未确认效果记 unknown
type Standing = "observed" | "unavailable" | "summarized";
```

### 9.3 API 端点（HTTP + SSE）

| 端点 | 方法/路径 | 请求 | 响应 | 错误码 |
|---|---|---|---|---|
| submit | `POST /v1/tasks` | `RunRequest` | `202 { taskId, runId?, state:"queued" }` | 400 声明校验失败；409 幂等键冲突；422 admission 拒绝（带 failure code）；429 容量满；503 shutdown 中 |
| query | `GET /v1/tasks/{taskId}`；`GET /v1/runs/{runId}`；`GET /v1/runs/{runId}/record` | — | 任务摘要 / Run 态 / RunRecord（未终态 409） | 404 |
| cancel | `POST /v1/tasks/{taskId}/cancel` | `{ reason? }` | `202 { runId, state:"cancelling"\|"cancelled" }`（queued 直接 cancelled；幂等） | 404；409 已终态 |
| subscribe | `GET /v1/tasks/{taskId}/events`（SSE） | `Last-Event-ID?` | 按 append 序推 WorkCellEvent；终态后回放并结束 | 404 |
| artifacts | `GET /v1/evidence/{runId}/{refKind}/{refId}`；`GET /v1/runs/{runId}/artifacts/{path}` | — | 证据/产物 + digest 头；unavailable 返回 404+reason | 404；410 |

要点：幂等（同 requestId+idempotencyKey 重投返回既有结果）；submit 只收一个 loop 声明（多任务工作流 400）；422 带 failure code；v1 产物经委托人传递（artifacts 只出证据/产物，不做语义验收）；订阅制不下 dollar estimate；v1 单租户 + API key。

### 9.4 状态机转移表

queued 为**服务层态**（`WorkItem.state`），不是 Run.state——入队等待 worker 空闲；取消 queued 任务不产生 run。

| from | to | 触发条件 | 产出事件 |
|---|---|---|---|
| admitting | running | Binding 物化成功、执行单元启动 | `run.admitted` → `executor.started` |
| admitting | failed | 校验/解析失败 | `run.terminated{admission_rejected\|capability_missing\|workspace_unavailable}` |
| running | completed | executor 正常返回 + 机械检查 | `run.terminated{completed}` + `check.completed` |
| running | failed | executor 失败 / limits 超限 | `run.terminated{failed; code}` |
| running | cancelling | 收到 cancel | `run.cancel.requested{reason?}` |
| cancelling | draining | 停新工具调用、进入排空 | `drain.started{deadlineMs}` |
| draining | cancelled | 已发起调用排空完成（≤30s 默认） | `drain.completed` + `run.terminated{cancelled}` |
| draining | failed | 排空超时强杀 | `run.terminated`（终态码见未知 9） |
| 任意非终态 | failed | 崩溃恢复重放收尾 | `run.terminated{host_failure}` |

record finalization 不是 state（终态后无条件执行，产出 RunRecord）。

### 9.5 时序（四条）

参与者：委托人 C、API、队列 Q、Coordinator K、Admission A、Executor W、EventLog E（append-only 唯一写源）、RunRecordStore R。

- **正常**：C→submit（幂等登记 → 202 queued）→ Q.enqueue → K 取 lease → A 物化 Binding（注入 skills/装配 prompt/注册工具/digest）→ W 启动（`run.admitted`/`executor.started`）→ W 循环（`skill.loaded`/`model.step`/`tool.*`/`context.compacted`/`decision` 实时流出）→ 返回 → K 机械检查 → `run.terminated{completed}` → finalization → R → C 拉 record/artifacts。
- **取消**：C→cancel → `run.cancel.requested` → cancelling（停新调用）→ draining（等已发起调用 ≤30s）→ cancelled（未确认效果入 EffectSummary.unknownEffects）→ finalization 无条件执行。
- **崩溃恢复**：崩溃（活跃 run 无终态事件）→ 重启 K 重放 E → 未终态 run 收尾 `failed`+`host_failure`、未知效果记 unknown → 缺 RunRecord 由 finalization 补齐；graceful shutdown 区别（停 admission → 排空 → `shutdown` 事件 → 退出）。
- **retry-of**：parent 终态 failed/cancelled → 新 RunRequest（新 requestId/runId，`parent.relation="retry-of"`）→ K 校验 parent → **重新 admission**（换 provider=新 Binding）→ 执行；RunRecord.lineage 记录血缘；不自动重试（重试权在委托人）。

### 9.6 WorkCellEvent（封闭联合，禁字符串事件）

每事件均含 `runId` + `at`：
- 状态转移：`run.admitted`、`executor.started`、`run.cancel.requested`、`drain.started`、`run.terminated`、`record.finalized`
- 工具调用：`tool.requested`、`tool.completed`、`completion.action.received`
- 模型步骤：`model.step`（kind + usage）
- 观测扩展：`skill.loaded`（name/digest/source）、`context.compacted`（scope + standing）、`decision`（summary + uncertainty low/medium/high/unknown + evidence?）、`shutdown`（reason graceful/maintenance + drainingRuns）
- 完成面：`check.completed`、`output.returned`、`effect.observed`

standing 纪律：observed / unavailable（必带 reason）/ summarized（压缩后证据降级）；不允许把 unknown 当零值。EvidenceRef `{kind, uri, digest, mediaType?, standing, unavailableReason?}`。

### 9.7 failure code 集合

`FailureObservation = { code; message?; retryable?: "yes"|"no"|"unknown"; evidence?: EvidenceRef[] }`（retryable 是观测输入，不是自动重试命令）。

| code | 语义 | state |
|---|---|---|
| `admission_rejected` | 声明校验失败（skill 名/digest/重名/命名空间/prompt 装配） | failed |
| `capability_missing` | 要求能力/工具未授予 | failed |
| `workspace_unavailable` | 工作区解析失败 | failed |
| `provider_failure` | provider 调用失败 | failed |
| `tool_failure` | 工具执行失败 | failed |
| `protocol_violation` | 协议违约（未授予工具被调用等） | failed |
| `limit_exceeded` | token/步数/输出超限（服务侧硬强制） | failed |
| `cost_exceeded` | cost-budget 硬上限 | failed |
| `timed_out` | 超过 maxDurationMs | failed |
| `cancelled` | 取消完成 | cancelled |
| `host_failure` | 崩溃收尾 | failed |
| `unknown` | 无法归因 | failed |

命名映射：Draft `resource_limit_exceeded` → `limit_exceeded`；⓿ `capability_mismatch` → `capability_missing`；⓿ `protocol_error` → `protocol_violation`；`cost_exceeded` 为 v5 新增。

### 9.8 服务模块结构（单节点）

```
API 层 (HTTP+SSE) ──submit/query/cancel──► Coordinator
   │  ▲                                    │  │  │
   │  └── SSE fanout ◄─ EventLog 订阅 ─────┘  │  │
   ▼                                        ▼  ▼
Queue(WorkItem, in-process) ◄─lease─ Coordinator ─► Admission ─► WorkerCatalog（fail-closed）
                                                 │
                                                 ▼
                                        ExecutorWorker（每任务隔离）
                                                 │
                                        HostPort（中立 host 端口：文件/命令/snapshot/diff）
                                                 │
EventLog(append-only 唯一写源) ◄── 全部事件写入 ◄──┘
   │  ├─► SSE fanout（实时）
   │  └─► Coordinator 状态机 / 崩溃恢复重放
RunRecordStore(终态投影 run.json + 证据文件) ◄── record finalization（从 EventLog 投影）
```

数据流：请求 `API→Queue→Coordinator lease→Admission(Binding)→ExecutorWorker`；事件 `ExecutorWorker→EventLog→{SSE, 状态机, finalization→RunRecordStore}`；恢复 `启动时 EventLog replay→未终态收尾→补 RunRecord`；产物 `HostPort snapshot/diff→EvidenceRef(uri)→API artifacts→委托人`（v1 产物经委托人传递）。

## 10. 冲突裁决（规格化产出 vs 既有定案）

1. **EvidenceRef 类数**：v4 "7 类"为笔误，Draft 实为 6 类 → **按 6 类**（§4 已改）。
2. **standing 值域**：Draft 两值 vs v5 三值（+summarized）→ **以 v5 三值为准**（刻意扩展，§4）。
3. **failure code 命名**：以 v5 为准 + 保留映射表（§9.7）。
4. **queued 态归属**：服务层态（WorkItem.state），Run.state 不加（§9.4）。
5. **事件名体系**：统一为 §9.6 命名（推断名已标注）。
6. **workerId 位置**：TaskDeclaration（服务层）承载，core Spec 不放（§2）。
7. **v0.5 默认值沿用**（maxDurationMs=300_000、maxToolOutputBytes=64_000、maxSteps 省略=无上限）：标候选沿用（§9.1，可复核）。

## 11. 引用

`.archive/design/work-cell-protocol.md`（Draft 全文 1193 行）；`origin/archive/v0.5` @ b5ecf419 `packages/work-cell/src/*`；`.archive/archive/design/decisions/031、033`；`theory/harness.md`、`theory/theory.md`、`theory/thoughts/workflow.md`；`design/agent-stack.md`、`design/test-manual.md`、`design/observability/reasonix.md`、`AGENTS.md`；规格化产出 sa_20260827_160919（详细出处标注原稿已并入本文）。
