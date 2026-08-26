# Work Cell 执行协议设计

状态：Draft（当前唯一的 WorkCell 设计正文）

Review 入口：本文件。WorkCell 的 review record、readiness projection 和试行 plan 只保存审计或规划关系，
不替代本设计正文。

日期：2026-08-24

范围：living tree 的下一版 Work Cell 协议；本文件用于约束后续讨论和实现形状，尚未成为已采纳规范，也不授权开始实现 harness 基座。

参考：当前 living theory、planning 文档，以及 `origin/archive/v0.5` 在 `b5ecf41915983269f19c9461967d8a0248924054` 的历史实现。历史实现只作为迁移输入，不作为当前设计权威。

## 1. 设计结论

Work Cell 应定义为：一次有边界、可观察、可复核的 Agent 工作执行单元。

它不是：

- 一个泛化的 `Input` 对象；
- 一个 Agent session；
- 一个领域任务本身；
- 一个 provider 或 harness 的名称；
- 一个语义验收器；
- 一个自动重试或调度策略。

下一版不再使用一个同时承载声明、宿主绑定、运行参数、模型选择、任务树、验收和运行结果的 `CellInput`。协议拆成以下生命周期对象：

```text
WorkCellSpec
    │  provider-neutral declaration
    ▼
WorkCellBinding
    │  host-resolved authority and effect boundary
    ▼
WorkCellRunRequest
    │  one request to start an execution
    ▼
WorkCellRun
    │  live execution state
    ▼
WorkCellRunRecord
    │  retained execution facts and mechanical checks
    ├── EvidenceRef / RunEvidence
    └── external SemanticReview / AcceptanceDecision
```

核心决策：

1. `WorkCellSpec` 是可持久化、可比较、与 provider 无关的声明。
2. `WorkCellBinding` 是宿主实际授予的资源和效果边界；声明本身不授予任何效果。
3. `WorkCellRunRequest` 只是启动消息，不重复定义规范。
4. `WorkCellRun` 表示一次实际执行；`WorkCellRunRecord` 表示可以长期保留和比较的事实投影。
5. 执行事实、机械检查、语义判断、权威验收分开保存、分开命名、分开负责。
6. Vercel AI SDK、Pi、DeepSeek Harness 都只能作为 `WorkCellExecutor` 的实现或适配器，不进入 Work Cell 核心语义。
7. 核心协议不包含 Sequence、哲学序列、genome、角色、treatment、swarm mind 或共享任务树等领域概念。

## 2. 需要解决的边界问题

0.5 版本的 `CellInput` 已经覆盖了许多真实需求，但它把不同所有权和不同生命周期的对象放在了一起：

| 现有内容 | 实际含义 | 问题 |
| --- | --- | --- |
| `intent`、`instructions`、`context` | 执行声明 | 容易和上游领域任务混淆 |
| `workspace`、`capabilities` | 宿主资源和权限 | 声明字段看起来像可以直接授予效果 |
| `workerId`、`executionProfile` | 调度或运行时选择 | 不是 Cell 的工作语义 |
| `tasks` | Agent 内部过程状态或调度任务 | 不是通用完成证明 |
| `acceptance` | 语义验收要求 | Cell 只能执行和报告，不能代替验收权威 |
| `terminalTools`、`outputSchema`、`artifacts` | 完成协议的不同部分 | 应保留正交关系 |
| `budget`、`workEstimate` | 限额和计划估算 | 实际消耗与事前估算混在同一边界 |
| `rawSteps`、`trace`、`workspaceDiff` | 运行证据 | 原始证据、规范化记录、工作区效果没有分层 |
| `status` | 执行、检查、验收的混合状态 | `passed` 容易被误解为语义正确 |

本设计的目标不是把旧字段机械地改名，而是让每个字段只有一个主要含义、一个主要 owner 和一个生命周期位置。

## 3. 术语和命名规则

### 3.1 命名原则

1. 用名词表示稳定对象，用 `Request` 表示一次请求，用 `Run` 表示一次实际运行，用 `Record` 表示保留的事实记录。
2. 不用 `Input` 作为 canonical 协议名。`Input` 只可在某个具体函数的局部参数中使用。
3. 不用 `Result` 表示整个运行记录。`Result` 只适合表示 executor 返回给协调层的局部返回值。
4. 不用 `Status` 作为跨层万能字段；状态必须带有层次，例如 `executionState`、`checkStatus`、`acceptanceState`。
5. 不用 `passed` 表示 Cell 成功。机械检查通过不等于目标语义正确。
6. 不用 `capabilities` 同时表示“需要什么”和“被授予什么”。分别使用 `requirements`、`toolSurface`、`effectPolicy` 或 `capabilityGrants`。
7. 不用 `trace` 作为规范化证据的总称。规范化事件叫 `WorkCellEvent`，原始 provider 记录叫 `adapterEvidence`，引用叫 `EvidenceRef`。
8. 不用 `settlement` 表示语义结论。调度源只记录执行结果，使用 `recordOutcome`；语义结论使用 `AcceptanceDecision`。
9. 不用 `task` 表示所有层的工作对象。上游领域工作叫 `Task`，一个执行单元叫 `WorkCell`，调度中的稳定条目叫 `WorkItem`。
10. 所有会改变权限、路由、验收或语义判断的字段都必须有结构化契约，不能靠正则、`includes` 或固定短语推断。
11. `label`、`enum`、属性组合和派生分类按 [`theory/expression.md`](../theory/expression.md) 选择：开放可扩展描述优先用 `label`，只有长期稳定且有真实机械消费者的语义值域才用 `enum`，正交维度保持组合；字段形态本身不产生状态、权限、验收或执行保证。
12. 多步骤或多任务执行默认由上游 Plan/Task/Todo work map 驱动；WorkCell 只接收一个有界执行单元并返回事实和证据，不把 Todo 清单、全局 priority、队列或 scheduler 偷塞进 WorkCell 核心。

### 3.2 Canonical 名称表

| Canonical 名称 | 中文含义 | 用途 | 不建议的替代名 |
| --- | --- | --- | --- |
| `WorkCellSpec` | Work Cell 规范 | 描述一次工作应如何被执行 | `CellInput`、`CellConfig` |
| `WorkCellBinding` | Work Cell 宿主绑定 | 描述实际 workspace、工具和效果权限 | `CellContext`、`Capabilities` |
| `WorkCellRunRequest` | Work Cell 运行请求 | 请求开始一次执行 | `CellInput`、`RunInput` |
| `WorkCellExecutionContext` | 执行上下文 | executor 可使用的受控运行时接口 | `DriverContext` |
| `WorkCellExecutor` | Work Cell 执行器 | 执行 provider/harness 适配后的工作 | `CellDriver` |
| `WorkCellExecutionReturn` | 执行器返回值 | executor 返回执行事实，不做验收 | `DriverResult`、`CellResult` |
| `WorkCellRun` | Work Cell 运行 | 一次活跃执行及其生命周期 | `Session`、`Attempt` |
| `WorkCellRunRecord` | Work Cell 运行记录 | 持久化的运行事实投影 | `CellResult`、`ExecutionResult` |
| `WorkCellEvent` | Work Cell 事件 | 规范化、类型化的运行事件 | `TraceEvent`、`RawStep` |
| `RunEvidence` | 运行证据集合 | 事件、原始记录和效果证据的索引 | `Trace` |
| `EvidenceRef` | 证据引用 | 指向大体积或 provider-specific 证据 | `LogRef` |
| `MechanicalCheck` | 机械检查 | 可重复运行的结构或文件谓词 | `Verification` |
| `SemanticReview` | 语义审查 | 人或 Agent 对目标质量的判断 | `Verification`、`Acceptance` |
| `AcceptanceDecision` | 验收决定 | 由指定 authority 作出的最终决定 | `passed`、`success` |
| `CompletionContract` | 完成契约 | 规定完成动作、输出和 artifacts | `TerminalConfig` |
| `CompletionAction` | 完成动作声明 | Spec/caller 声明的结构化动作；Agent/executor 可据此提交调用 | `TerminalTool` |
| `ResourceLimits` | 资源限额 | 运行前的硬边界 | `Budget` |
| `UsageObservation` | 实际使用观测 | 运行后的实际消耗 | `Usage` |
| `WorkspaceScope` | 工作区范围 | 声明允许访问的相对路径边界 | `WorkspacePolicy` |
| `WorkspaceBinding` | 工作区绑定 | 宿主解析出的实际工作区句柄 | `HostWorkspace` |
| `WorkspaceChangeSet` | 工作区变更集 | 文件和工作区效果的规范化摘要 | `WorkspaceDiff` |
| `WorkItem` | 调度工作条目 | 上游稳定身份和一次或多次运行的关联 | `Task` |
| `WorkLease` | 调度租约候选 | system layer 中待确定 issuer、consumer 和 authority 的 lease 对象 | `Dispatch` |
| `AttemptOutcome` | 执行尝试结果 | 调度源接收的事实结果 | `Settlement` |
| `CellBatch` | Work Cell 批次候选 | system layer 中待确定 consumer、隔离 owner 和接受关系的一组 Cell | `Swarm` |

### 3.3 `CellInput` 的处理决定

`CellInput` 不进入下一版 canonical 协议。

如果某个 adapter 必须接收旧形状，可以在边界写一个明确的转换函数：

```text
LegacyCellInput -> WorkCellSpec + WorkCellRunRequest -> host binding
```

这个名称可以在迁移期保留在 adapter 内部，但不能出现在核心接口、持久化记录或跨进程协议中。

## 4. 分层模型

### 4.1 `WorkCellSpec`：声明层

`WorkCellSpec` 是调用方声明“这次 bounded work 应该具备什么条件”的对象。它不包含宿主绝对路径、不包含已授予的 secret、不包含 provider session，也不包含运行结果。

建议结构：

```ts
type WorkCellSpec = {
  format: "work-cell.spec.v1";
  cellId: string;

  // WorkCell 要完成的执行目标；不是上游 Task 的全部语义。
  objective: string;
  instructions?: InstructionBlock[];
  context?: ContextItem[];

  workspace: WorkspaceScope;
  requirements?: ExecutionRequirements;
  limits: ResourceLimits;
  completion?: CompletionContract;

  metadata?: Record<string, string>;
};
```

字段语义：

- `cellId` 是调用方稳定定义的 Cell 身份；一次运行另有 `runId`。
- `objective` 是给 executor 的工作目标。它不自动产生语义验收权。
- `instructions` 是执行说明；不得把验收结果、权限提升或隐含的 retry 指令塞进自然语言中。
- `context` 是已准备的上下文；每个条目应标明来源、用途和是否为只读事实。
- `workspace` 只声明相对范围和需要的效果类型；实际根目录由 Binding 决定。
- `requirements` 描述运行所需条件，不代表条件已经被满足。
- `limits` 是运行硬边界，不是成本估算。
- `completion` 描述可观察的完成协议，不代表最终语义正确。

`WorkCellSpec` 不放入以下字段：

- `provider`、`model`、`reasoningEffort`、Pi session id；这些属于运行选择或适配器观测。
- `workerId`；它属于调度身份或上游 owner。
- `acceptance`；验收属于指定的 Principal 或 acceptance owner。
- `tasks`；任务树不是通用 Cell 语义，若需要，应由具体 adapter 或 orchestrator 建模。
- 绝对 `root`、secret、token、可直接执行的 host object。
- `estimatedCost`、`estimatedTokens`；事前估算应属于 plan/evaluation，不应伪装成运行限额。

### 4.2 `WorkspaceScope`：范围声明

工作区范围必须使用结构化路径和效果边界：

```ts
type WorkspaceScope = {
  readPaths: RelativePath[];
  writePaths: RelativePath[];
  excludePaths?: RelativePath[];
  commandRequirements?: CommandRequirement[];
};

type CommandRequirement = {
  executable: string;
  purpose?: string;
  argumentShape?: StructuredArgumentShape;
};
```

约束：

1. `RelativePath` 必须在规范化后仍位于 Cell 的逻辑工作区内。
2. `readPaths`、`writePaths` 和 `excludePaths` 是范围声明，不是 host 授权。
3. `commandRequirements` 说明需求，不允许以任意 shell 字符串作为权限表达。
4. 具体的 executable、参数、环境变量、网络和 secret 授权由 `WorkCellBinding` 解析。
5. 不能通过自然语言说“可以顺便访问别的目录”来扩大范围。

### 4.3 `ExecutionRequirements`：需求声明

需要 provider 或工具条件时，使用需求而不是把具体实现写入核心协议：

```ts
type ExecutionRequirements = {
  tools?: ToolRequirement[];
  features?: FeatureRequirement[];
  isolation?: "required" | "preferred";
  interactiveInput?: "forbidden" | "allowed" | "required";
};
```

`features` 表示能力类别，例如 `structured-output`、`workspace-edit`、`completion-action`。它不表示某个特定 SDK 的类名。调度器可以用它选择 executor，但 executor 选择结果仍记录在运行观测中。

### 4.4 `ResourceLimits`：限额而非预算

```ts
type ResourceLimits = {
  maxSteps?: number;
  maxDurationMs: number;
  maxToolOutputBytes?: number;
  maxOutputTokens?: number;
};
```

`ResourceLimits` 只表达运行期间的硬限制。以下内容不属于核心限额：

- 成本预估；
- 工作量预估；
- 计划中的节点数；
- 业务优先级；
- 是否自动重试。

这些信息可以出现在 `WorkItem`、plan 或 evaluation fixture 中，并通过 `metadata` 或独立记录关联，但不能改变 Cell 的限额语义。

### 4.5 `CompletionContract`：三种完成信号保持正交

```ts
type CompletionContract = {
  actions?: CompletionAction[];
  output?: OutputContract;
  artifacts?: ArtifactRequirement[];
};

type CompletionAction = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  required?: boolean;
  maxCalls?: number;
};

type OutputContract = {
  schema: JsonSchema;
  required?: boolean;
};

type ArtifactRequirement = {
  path: RelativePath;
  required: boolean;
  observableProperties?: ArtifactProperty[];
};
```

三者含义不同：

| 部分 | 它回答的问题 | 它不能证明什么 |
| --- | --- | --- |
| `CompletionAction` | caller/Spec 是否声明了可用的结构化完成动作？ | 目标内容是否正确；运行时提交须另由 `CompletionActionCall` 表达 |
| `output` | 返回值是否符合机器可读形状？ | 文件效果或语义质量 |
| `artifacts` | 指定文件是否存在并满足机械属性？ | 文件内容是否符合业务意图 |

`CompletionAction` 是 caller/Spec 的动作声明，不是运行时事实，也不是 `AcceptanceDecision`。运行时由
executor 通过 `CompletionActionCall` 提交，host/coordinator 产生 `CompletionActionObservation`。若一个
Cell 没有完成动作，也可以仅通过 output 或 artifact 完成；若三者都存在，也仍然需要外部语义验收。

本轮设计基线允许 `actions` 中声明多个完成动作。每个动作独立按自己的 `required` 和
`maxCalls` 检查；多个 required action 不隐含顺序、事务性或语义上的“全部目标已完成”。
如果调用方需要顺序或原子性，必须在上游 Task/流程协议中另行表达。

## 5. 宿主绑定和效果边界

### 5.1 `WorkCellBinding`

`WorkCellBinding` 把声明解析成某个运行时可以实际执行的授权边界：

```ts
type WorkCellBinding = {
  format: "work-cell.binding.v1";
  bindingId: string;
  cellId: string;

  workspace: WorkspaceBinding;
  toolSurface: ToolGrant[];
  effectPolicy: EffectPolicy;
  executor: ExecutorSelection;
};

type WorkspaceBinding = {
  handle: OpaqueWorkspaceHandle;
  rootKind: "isolated" | "shared-readonly" | "host-provided";
  readPaths: RelativePath[];
  writePaths: RelativePath[];
  excludePaths: RelativePath[];
};

type ToolGrant = {
  name: string;
  inputSchema: JsonSchema;
  effect: "observe" | "workspace-write" | "command" | "external";
};

type EffectPolicy = {
  command?: CommandGrant[];
  network?: NetworkGrant;
  secrets?: SecretGrant[];
};

type ExecutorSelection = {
  executorId: string;
  adapterVersion: string;
  modelRef?: string;
};
```

`executor` 是 admission 时记录的 executor 选择维度，属于 Binding snapshot 的 identity，但不是
额外的 capability grant。因而在比较两个 executor 时，不能要求两个变体共享同一个完整
`WorkCellBinding`；每个变体应有自己的 immutable Binding identity，比较固定的是由 eval/protocol
owner 明确列出的非 executor workspace、tool surface 和 effect policy 约束。

本轮设计基线采用“运行前物化、运行期间不可变”的 Binding：host 在 admission 阶段根据
Spec 和 host policy 生成一个带 `bindingId` 与 digest 的绑定快照；运行期间 executor 只能
使用该快照；运行记录只保存引用和观测，不把可变的 host object 序列化进协议。Binding
可以带 host 定义的过期时间，过期后必须重新 admission，不能静默沿用旧权限。

Binding 的 owner 是 host/orchestrator，而不是 Agent。Binding 解决的是“实际能做什么”，Spec 解决的是“希望具备什么条件”。两者不一致时，运行必须在执行前以结构化的 `capability_missing` 或 `admission_rejected` 结束，而不是让 executor 自行猜测或静默降级。

### 5.2 Host 不下沉到 provider adapter

Host 负责：

- 解析真实 workspace 根和路径范围；
- 创建或选择隔离 workspace；
- 注入工具并执行工具调用；
- 强制命令、网络、secret 和输出限制；
- 记录 workspace 和外部效果；
- 处理取消、停止新调用和已发起效果的排空；
- 生成规范化事件和机械检查输入。

Executor/adapter 负责：

- 把 WorkCell 上下文转换成 provider/harness 能理解的 prompt/session；
- 驱动模型或 worker loop；
- 请求 host 工具；
- 把 provider 返回转换成 `WorkCellExecutionReturn`；
- 保留 provider-specific 的原始证据。

Executor 不得：

- 通过自身配置绕过 Binding；
- 自己决定 workspace 绝对根；
- 把 provider 的 session 状态当作 WorkCell 的生命周期权威；
- 把模型说“完成了”转换成 `AcceptanceDecision`；
- 在核心层隐式重试一次失败运行。

## 6. 运行请求、运行态和运行记录

### 6.1 `WorkCellRunRequest`

```ts
type WorkCellRunRequest = {
  format: "work-cell.run-request.v1";
  requestId: string;
  cellId: string;

  spec: WorkCellSpec | { specRef: string; digest: string };
  bindingRef: { bindingId: string; digest: string };
  idempotencyKey?: string;

  parent?: { runId: string; relation: "retry-of" | "continued-from" };
  requestedBy?: string;
};
```

规则：

- `requestId` 标识启动消息；`runId` 由运行协调层生成并标识一次真实执行。
- `spec` 可以 inline，也可以引用不可变版本；引用必须带 digest。
- `bindingRef` 引用已解析的宿主边界，不把绑定对象隐式复制进请求。
- `idempotencyKey` 只解决请求重放识别，不承诺自动重试。
- `retry-of` 和 `continued-from` 是跨 Run 的执行因果关系，不允许把两次执行压扁成同一个 `runId`。
- generic Task/WorkItem derivation 不由 WorkCell core 的 `parent.relation` 表达；若未来需要新的跨 Run
  relation，必须先有真实 consumer、owner 和独立 contract review。

### 6.2 `WorkCellRun`：活跃运行

```ts
type WorkCellRun = {
  runId: string;
  requestId: string;
  cellId: string;
  state:
    | "admitting"
    | "running"
    | "cancelling"
    | "draining"
    | "completed"
    | "failed"
    | "cancelled";
  startedAt?: Timestamp;
  endedAt?: Timestamp;
};
```

`WorkCellRun.state` 只描述运行生命周期。它不包含 `passed`、`verification_failed` 或 `accepted`。这些是后续层的事实或决定。

本轮设计基线将 `WorkCellRun` 作为 coordinator 内部的活跃生命周期对象，而不是跨进程
持久化对象。外部消费者通过 `runId`、类型化 `WorkCellEvent` 和最终的
`WorkCellRunRecord` 观察运行；实现若需要本地操作句柄，可以提供非 canonical 的 SDK
wrapper，但不得再产生一份独立的运行语义。

建议的状态转移：

```text
admitting -> running
admitting -> failed
running -> cancelling -> draining -> cancelled | failed
running -> failed
running -> completed
```

终止后的 usage、effects、checks 和 evidence 由 coordinator 进行 record finalization，再形成
`WorkCellRunRecord`；record finalization 不是 `WorkCellRun.state` 的公共状态，也不引入新的
WorkCell core state。即使 executor 已经报错，也要尽量完成安全的记录和排空；不能因为执行已经
进入 terminal state 就把未确认的 effect 写成 absent。若未来需要跨进程观察“执行已终止但记录
尚未可消费”，应由 protocol/record/evidence owner 另行定义 record availability contract。

### 6.3 `WorkCellExecutionContext`

```ts
interface WorkCellExecutionContext {
  readonly runId: string;
  readonly spec: Readonly<WorkCellSpec>;
  readonly binding: Readonly<WorkCellBinding>;
  readonly workspace: WorkspaceHandle;
  readonly toolSurface: Readonly<ToolSurface>;
  readonly limits: Readonly<ResourceLimits>;
  readonly signal: AbortSignal;

  observe(event: WorkCellEvent): void;
  requestTool(call: ToolCall): Promise<ToolReturn>;
  submitCompletionAction(action: CompletionActionCall): Promise<void>;
}
```

这里的接口只是设计形状。实际实现必须确保 `workspace`、`requestTool` 和 `submitCompletionAction` 都由 host/coordinator 提供受控实现，而不是将任意 host object 直接暴露给 adapter。

### 6.4 `WorkCellExecutor` 和 `WorkCellExecutionReturn`

```ts
interface WorkCellExecutor {
  readonly descriptor: ExecutorDescriptor;
  run(context: WorkCellExecutionContext): Promise<WorkCellExecutionReturn>;
}

type WorkCellExecutionReturn = {
  responseText?: string;
  output?: unknown;
  completionActionCalls: CompletionActionCall[];
  usage?: UsageObservation;
  adapterEvidence: EvidenceRef[];
};
```

executor 返回的是它提交的局部调用和其他执行产物；host/coordinator 的
`CompletionActionObservation` 不由该局部返回值直接产生。executor 不返回：

- `passed`；
- `accepted`；
- `verification_failed`；
- “任务已正确完成”的自然语言判断。

协调层根据返回值、host 观测和 `CompletionContract` 生成机械检查。语义判断由外部 owner 处理。

### 6.5 `WorkCellRunRecord`：事实记录

```ts
type WorkCellRunRecord = {
  format: "work-cell.run-record.v1";
  runId: string;
  requestId: string;
  cellId: string;

  execution: ExecutionOutcome;
  runtime: RuntimeObservation;
  responseText?: string;
  output?: unknown;

  completionChecks: MechanicalCheck[];
  effects: EffectSummary;
  usage?: UsageObservation;
  evidence: EvidenceRef[];

  createdAt: Timestamp;
};

type ExecutionOutcome = {
  state: "completed" | "failed" | "cancelled";
  failure?: FailureObservation;
};

type RuntimeObservation = {
  executor: ExecutorObservation;
  toolCalls: ToolCallObservation[];
  completionActions: CompletionActionObservation[];
};
```

这里的 `EffectSummary`、`UsageObservation` 是 RunRecord 的命名槽位；本协议当前只固定它们的
run-bound 事实投影关系，不在此处冻结完整字段 shape、来源 authority、retention 或 correction 语义。
这些 shape 仍须由 protocol/host/coordinator/record-evidence owner 从相称 contract review 中接受或
明确保留为 unknown。

运行记录的最重要语义是“发生了什么”，不是“业务上是否正确”。如果执行自然结束但 output schema 不符合，记录可以是：

```text
execution.state = completed
completionChecks[output].status = failed
acceptance = not-present
```

如果 executor 因 provider 错误中止，但在 workspace 中已经产生文件，记录仍必须保留：

```text
execution.state = failed
effects = an observed workspace effect (exact EffectSummary shape remains open)
completionChecks = pass | fail | not-run
```

这比把所有情形压缩成一个 `status` 更能支持比较、恢复和审查。

## 7. 事件和证据模型

### 7.1 规范化事件

核心事件使用封闭的结构化联合类型，不允许以任意字符串事件作为 load-bearing 协议：

```ts
type WorkCellEvent =
  | { type: "run.admitted"; runId: string; at: Timestamp }
  | { type: "executor.started"; executor: ExecutorObservation; at: Timestamp }
  | { type: "tool.requested"; call: ToolCallObservation; at: Timestamp }
  | { type: "tool.completed"; callId: string; result: ToolReturnObservation; at: Timestamp }
  | { type: "completion.action.received"; action: CompletionActionObservation; at: Timestamp }
  | { type: "output.returned"; outputDigest: string; at: Timestamp }
  | { type: "effect.observed"; effect: EffectObservation; at: Timestamp }
  | { type: "run.cancel.requested"; reason?: string; at: Timestamp }
  | { type: "run.terminated"; outcome: ExecutionOutcome; at: Timestamp }
  | { type: "check.completed"; check: MechanicalCheck; at: Timestamp };
```

`effect.observed` 只表明事件层引用了一个命名的 `EffectObservation`；其完整 envelope、host
confirmation、unavailable reason、dedup/replay 和 retention 关系仍是开放 contract，不由事件名称
或 provider return 自动推出。

如果需要增加事件，必须增加版本化的事件类型和 schema，不应让调用方靠字符串匹配判断运行是否完成、是否有权限或是否可以接受。

### 7.2 `EvidenceRef` 和 `RunEvidence`

规范化记录只保留适合索引和比较的摘要；大体积或 provider-specific 内容通过引用保存：

```ts
type EvidenceRef = {
  kind:
    | "normalized-events"
    | "adapter-record"
    | "tool-output"
    | "workspace-snapshot"
    | "workspace-change-set"
    | "provider-usage";
  uri: string;
  digest: string;
  mediaType?: string;
  standing: "observed" | "unavailable";
  unavailableReason?: string;
};

type RunEvidence = {
  runId: string;
  refs: EvidenceRef[];
};
```

命名迁移：

- 规范化事件不叫 `rawSteps`；
- provider 原始 session 不叫 WorkCell 的 canonical trace；
- `rawSteps` 可以作为 adapter evidence 中的历史兼容字段；
- `workspaceDiff` 不足以覆盖命令、网络和 secret 使用，统一归入 `EffectSummary`，其中可以有 `workspaceChangeSet`。

### 7.3 观测 standing

任何运行指标都要区分：

- `observed`：实际观测到；
- `unavailable`：本次实现无法提供，并记录原因；
- 不允许把未知当作零值或成功。

这条规则尤其适用于 provider usage、cached tokens、模型 fingerprint、网络效果和 adapter session identity。

## 8. 机械检查、语义审查和验收

### 8.1 `MechanicalCheck`

机械检查是可重复的结构、范围或文件谓词：

```ts
type MechanicalCheck = {
  checkId: string;
  kind: "schema" | "artifact" | "workspace" | "completion-action" | "resource-limit" | "protocol";
  status: "pass" | "fail" | "not-run" | "unknown";
  observedAt: Timestamp;
  evidence?: EvidenceRef[];
  reason?: string;
};
```

示例：

- output 是否符合声明的 JSON schema；
- 必需 artifact 是否存在；
- artifact 是否位于允许的 write path；
- 是否超过 maxDuration；
- completion action 是否符合 input schema；
- 是否调用了未授予的工具。

机械检查不得声称“内容正确”“设计合理”“用户满意”。

### 8.2 `SemanticReview`

语义审查属于另一个对象和另一个 owner：

```ts
type SemanticReview = {
  reviewId: string;
  runId: string;
  reviewer: ReviewerRef;
  rubricRef: string;
  state: "pending" | "complete" | "blocked";
  findings: StructuredFinding[];
};
```

审查可以使用 `WorkCellRunRecord` 和 `RunEvidence`，但不能回写执行事实。若需要重做，应产生新的
`WorkCellRunRequest`，并通过 `parent.relation = "retry-of"` 或 `"continued-from"` 关联。

### 8.3 `AcceptanceDecision`

最终验收由上游 Task 或明确的 acceptance owner 作出：

```ts
type AcceptanceDecision = {
  decisionId: string;
  subject: { runId: string; taskId?: string };
  authority: string;
  state: "accepted" | "rejected" | "deferred";
  basis: string[];
  decidedAt: Timestamp;
};
```

核心规则：

```text
execution facts != mechanical checks != semantic review != acceptance decision
```

## 9. 失败、取消和恢复

### 9.1 失败分类

统一使用结构化 failure code：

```ts
type FailureObservation = {
  code:
    | "admission_rejected"
    | "capability_missing"
    | "workspace_unavailable"
    | "provider_failure"
    | "tool_failure"
    | "protocol_violation"
    | "resource_limit_exceeded"
    | "timed_out"
    | "cancelled"
    | "host_failure"
    | "unknown";
  message?: string;
  retryable?: "yes" | "no" | "unknown";
  evidence?: EvidenceRef[];
};
```

`retryable` 是观测或策略输入，不是核心自动重试命令。Core 不根据 code 自动生成下一次运行。

### 9.2 取消语义

取消至少分为三个边界：

1. `cancel requested`：收到取消请求，不再接收新的非必要工作。
2. `draining`：等待已发起的 host 工具调用按安全规则结束或标记未知。
3. **record finalization**：在执行进入 terminal state 后，记录已产生的效果、usage、failure 和
   evidence；这一收尾关系不成为 `WorkCellRun.state` 的公共状态。

取消后不应把所有未返回的调用伪装成“没有发生”。对于无法确认的外部效果，记录 `unknown`，并保留 host evidence。

### 9.3 重试语义

默认不自动重试。若 orchestrator 决定重试：

- 必须生成新的 `requestId` 和 `runId`；
- 保留原运行记录；
- 在 `parent` 中声明 `retry-of`；
- 重新解析或明确复用 Binding；
- 不把两次 workspace 效果合并成一个不可区分的 diff；
- 是否重试由调度策略或领域 owner 决定，不由 executor 自己决定。

## 10. 调度和批次边界

Work Cell 核心只定义一次执行。需要持续生产、租约、容量和并发时，由 orchestration 层负责。

### 10.1 公共调度形状

沿用 `WorkSource` / `WorkLease` 的候选概念，但把 `settle` 改成不带验收含义的 `recordOutcome`。
`WorkLease` 的 issuer、consumer 和 authority 当前均 `unknown`；它不等于 `WorkCellBinding` 的
host effect grant，也不单独建立派发授权：

```ts
interface WorkSource {
  next(signal: AbortSignal): Promise<WorkLease | null>;
  recordOutcome(outcome: AttemptOutcome): Promise<void>;
}

type WorkLease = {
  leaseId: string;
  item: WorkItem;
  expiresAt?: Timestamp;
};

type WorkItem = {
  itemId: string;
  cellRequest: WorkCellRunRequest;
  ownerRef?: string;
};

type AttemptOutcome = {
  leaseId: string;
  runId: string;
  recordRef: string;
};
```

`recordOutcome` 只表示“这次执行记录已经产生并可被 source 消费”。它不表示任务已验收，也不表示 source 必须继续、重试或停止。

### 10.2 `ExecutionCoordinator`

对外建议使用 `ExecutionCoordinator`，而不是把一个实现细节暴露成 `Kernel`。`kernel` 可以作为内部实现称呼，但公共设计应突出它协调什么：

- admission；
- capacity；
- lease dispatch；
- run lifecycle；
- cancellation；
- record/evidence；
- effect boundary。

它不负责：

- 语义计划；
- 自动判断任务是否解决；
- review rubric；
- acceptance；
- 依据自然语言猜测 retry 条件。

### 10.3 `CellBatch`，不使用 `Swarm` 作为核心名称

`CellBatch` 仍只是 system-layer candidate。只有在真实 batch consumer、隔离 owner 和接受关系成立
后，才可决定它是否表达一组彼此独立的 Cell：

```ts
type CellBatch = {
  batchId: string;
  runs: WorkCellRunRequest[];
  ordering: "input-order" | "completion-order";
  isolation: "required";
};
```

这里的 `isolation: "required"` 只是待验证的设计假设，不是 runtime guarantee。以下是需要由真实
consumer、owner 和 evidence 验证的候选条件，而不是当前协议已承诺的保证：

- 每个 Cell 有独立的 run identity；
- 每个 Cell 的 write scope 可区分；
- sibling failure 不隐式取消其他 Cell；
- 输出顺序规则明确；
- 不共享隐含的 mind、todo tree、投票或 synthesis authority。

`Swarm` 可以作为历史实验名称，但不作为核心协议对象，因为它暗示了协议没有承诺的群体智能语义。

## 11. Provider 和 Harness 适配

### 11.1 核心原则

Work Cell 不选择“Vercel AI SDK 还是 DeepSeek Harness”作为协议层面的二选一。正确的分层是：

```text
同一个 WorkCellSpec + 相同的非 executor Binding 约束
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
各自物化 WorkCellBinding   各自物化 WorkCellBinding
executor = Vercel/Pi       executor = DeepSeek Harness
       │                     │
       └──────────┬──────────┘
                  ▼
        同一类 WorkCellRunRecord + Evidence
```

由于 `WorkCellBinding` 本身包含 `executor`，上图的“相同约束”不表示共享完整 Binding、相同
`bindingId` 或相同 digest；它表示由 eval card 固定的非 executor admission 条件相同。这样测试
才可以回答“executor/harness 对结果有什么影响”，而不是把 Binding identity 差异误当成 harness
差异。canonical equality、digest/canonicalization 和具体固定变量仍由真实 eval/protocol owner
决定，不在本协议中新增比较对象。

### 11.2 适配器职责

建议的候选实现名仅作为 adapter 名，不进入 core：

- `VercelAiSdkWorkCellExecutor`：使用 Vercel AI SDK、Pi 或相关 HarnessAgent 驱动模型循环。
- `DeepSeekHarnessWorkCellExecutor`：使用 DeepSeek Harness 的 session/工具循环。
- `DeterministicWorkCellExecutor`：用于协议、host、机械检查和失败恢复测试，不依赖模型。

适配器都必须对外提供同样的：

- 工具调用边界；
- completion action 观察；
- output 返回；
- usage observation；
- execution failure；
- evidence references。

适配器可以额外保留：

- provider request/response；
- session identity；
- provider-specific token breakdown；
- native task projection；
- provider tool call id；
- 原始 transcript。

这些只能放在 `adapterEvidence`，不能改变 WorkCell 的生命周期或验收语义。

### 11.3 0.5 迁移中的明确判断

历史 0.5 的普通 DeepSeek worker 路径实际使用的是 Vercel AI SDK + HarnessAgent/Pi adapter + host-owned tools；它不是“WorkCell 天然等于 DeepSeek Harness”。因此下一版应把这两种路径都当作可替换 executor，用同一协议做对照测试，而不是把某个历史 driver 直接升格为核心。

## 12. Harness 效果评估设计

为了测试 harness 效果，评估对象应是“相同 Cell 合同下的 executor 行为”，而不是两个未对齐的完整应用。

### 12.1 最小评估对象

```ts
type HarnessTrial = {
  trialId: string;
  fixtureRef: string;
  executorRef: string;
  modelRef?: string;
  bindingRef: string;
  runRequest: WorkCellRunRequest;
  comparisonGroup: string;
};
```

### 12.2 固定变量

比较 Vercel AI SDK/Pi 与 DeepSeek Harness 时，尽量固定：

- 同一 `WorkCellSpec`；
- 同一 workspace fixture 和初始快照；
- 同一 host tool schema 和 tool effect policy；
- 同一 completion contract；
- 同一模型、temperature/seed（若可控）；
- 同一 resource limits；
- 同一取消和超时条件；
- 同一 mechanical checks。

由于每个 executor 变体有自己的 Binding，比较只允许 executor selection 和必要的 adapter
translation 不同；workspace、tool surface、effect policy、prompt、model、fixture 等固定变量必须
由 eval card 明确列出。若其中任一项不同，必须把它们记录为 confounder，不能直接归因于 harness。

### 12.3 共同指标

记录而不是预先裁判：

- admission 是否通过；
- execution state；
- completion action 规范符合度；
- output schema 通过率；
- artifact 和 workspace effect；
- tool call 数、失败数、重复调用；
- steps、duration、usage；
- cancellation drain 是否完整；
- evidence 是否可重放或可核查；
- semantic review 的结构化结果。

其中 semantic review 只能作为独立评价层。机械指标可以快速筛查，但不能替代目标质量判断。

### 12.4 评估文件归属

- fixture、protocol、trial definition：`evals/`；
- 试验性 executor 或 adapter：`experiments/`；
- 运行结果、review 和 evidence standing：`evals/`；
- 通用协议和语义设计：`design/`、`theory/`；
- 本文件不保存具体运行结论。

## 13. 版本和兼容性

不同生命周期对象分别版本化：

```text
work-cell.spec.v1
work-cell.binding.v1
work-cell.run-request.v1
work-cell.event.v1
work-cell.run-record.v1
```

不要再用一个 `WORK_CELL_RECORD_VERSION` 覆盖所有形状。原因是：声明可以稳定而运行记录扩展，事件可以增量演进而不改变 Spec，adapter evidence 可以独立升级。

版本规则：

1. 破坏字段语义、删除字段或改变 owner 时升级主版本。
2. 增加可选观测字段可以在兼容版本中完成，但必须明确 unknown/unavailable 行为。
3. 核心 schema 对未知字段的处理要在协议层明确；不能由不同 adapter 自由解释同一个字段。
4. provider-specific 字段只能出现在 adapter envelope/evidence 中，不得污染 core record。
5. 旧 `CellInput` 只通过显式 migration adapter 转换，不能以“兼容读取”名义继续扩张其语义。

## 14. 从 0.5 到下一版的迁移表

| 0.5 字段/对象 | 下一版位置 | 迁移说明 |
| --- | --- | --- |
| `CellInput.intent` | `WorkCellSpec.objective` 或上游 `Task` | 先判断它是执行目标还是领域意图，不能盲目一对一复制 |
| `instructions` | `WorkCellSpec.instructions` | 保留为执行说明 |
| `context` | `WorkCellSpec.context` | 增加来源和 standing |
| `workspace` | `WorkspaceScope` + `WorkCellBinding.workspace` | 逻辑范围和实际 root 分开 |
| `capabilities` | `ExecutionRequirements` / `ToolGrant` / `EffectPolicy` | 依据“需要”还是“已授予”拆分 |
| `terminalTools` | `CompletionContract.actions` | terminal tool 改名为 completion action，避免和通用 tool 混淆 |
| `outputSchema` | `CompletionContract.output.schema` | 与 action、artifact 保持正交 |
| `artifacts` | `CompletionContract.artifacts` | 只表达机械可观测要求 |
| `budget` | `ResourceLimits` | 实际使用移到 `UsageObservation` |
| `workEstimate` | plan/evaluation/上游 WorkItem | 不进入 core execution contract |
| `executionProfile` | `ExecutorSelection` + `ExecutorObservation` | 请求选择和实际观测分开 |
| `workerId` | `WorkItem.ownerRef` 或调度身份 | 不放入 Cell 语义 |
| `tasks` | adapter evidence 或 orchestrator domain object | 不宣称任务完成等于 Cell 正确 |
| `CellHost` / `HostWorkspace` | `WorkCellBinding` + `WorkspaceHandle` | host 继续拥有实际效果边界 |
| `CellDriver` | `WorkCellExecutor` | driver 不再拥有验收或通用 lifecycle 权威 |
| `DriverResult` | `WorkCellExecutionReturn` | 只返回执行产物和观测 |
| `rawSteps` / `trace` | `WorkCellEvent` + `EvidenceRef` | 规范化事件和原始记录分开 |
| `workspaceDiff` | `EffectSummary.workspaceChangeSet` | 扩大为可区分的效果摘要 |
| `status` | `execution.state` + `completionChecks` + 外部 acceptance | 消除 `passed` 的混合含义 |
| `preparation` | 上游准备记录或 `context` evidence | 不把 adapter 准备和运行混在一个结果里 |

## 15. 一个最小完整例子

下面的例子展示的是协议边界，不是最终 TypeScript schema：

```json
{
  "format": "work-cell.run-request.v1",
  "requestId": "req_01",
  "cellId": "format-report",
  "spec": {
    "format": "work-cell.spec.v1",
    "cellId": "format-report",
    "objective": "将输入目录中的报告整理为指定的 Markdown 结构。",
    "instructions": [
      {
        "kind": "execution",
        "text": "只修改允许的输出文件，并保留无法确认的事实。"
      }
    ],
    "context": [
      {
        "kind": "source",
        "ref": "fixture://report-input",
        "standing": "observed"
      }
    ],
    "workspace": {
      "readPaths": ["input/"],
      "writePaths": ["output/report.md"],
      "excludePaths": [".git/"]
    },
    "requirements": {
      "features": ["workspace-edit", "completion-action"]
    },
    "limits": {
      "maxSteps": 40,
      "maxDurationMs": 300000,
      "maxToolOutputBytes": 65536
    },
    "completion": {
      "actions": [
        {
          "name": "complete",
          "description": "报告已整理并可供检查。",
          "inputSchema": {
            "type": "object",
            "properties": {
              "summary": { "type": "string" }
            },
            "required": ["summary"]
          },
          "required": true,
          "maxCalls": 1
        }
      ],
      "artifacts": [
        {
          "path": "output/report.md",
          "required": true
        }
      ]
    }
  },
  "bindingRef": {
    "bindingId": "binding_fixture_01",
    "digest": "sha256:..."
  },
  "idempotencyKey": "fixture-format-report-01"
}
```

运行结束后，调用方可能得到：

```json
{
  "format": "work-cell.run-record.v1",
  "runId": "run_01",
  "requestId": "req_01",
  "cellId": "format-report",
  "execution": {
    "state": "completed"
  },
  "completionChecks": [
    {
      "checkId": "artifact.output.report",
      "kind": "artifact",
      "status": "pass"
    },
    {
      "checkId": "action.complete",
      "kind": "completion-action",
      "status": "pass"
    }
  ],
  "effects": {
    "workspaceChangeSet": {
      "filesCreated": ["output/report.md"],
      "filesModified": [],
      "filesDeleted": []
    }
  },
  "evidence": [
    {
      "kind": "normalized-events",
      "uri": "evidence://run_01/events",
      "digest": "sha256:...",
      "standing": "observed"
    }
  ]
}
```

这个记录仍然没有 `accepted: true`。报告内容是否满足业务要求，要由外部 `SemanticReview` 或 `AcceptanceDecision` 决定。

## 16. 设计不变量

后续实现和评审应把以下内容当作必须保持的协议不变量：

1. Spec 不授予效果；Binding 才是实际 host authority。
2. 一个 `runId` 只对应一次真实执行，不复用来表示 retry。
3. 运行状态不表示语义验收。
4. completion action、output 和 artifact 是三个正交完成面。
5. MechanicalCheck 不得升级为 SemanticReview 或 AcceptanceDecision。
6. provider/harness 替换不能改变 core object 的含义。
7. 所有工具、命令和 workspace 效果都必须经过 host-owned boundary。
8. 取消必须区分请求、排空和记录；未知效果不得被伪装成无效果。
9. 核心语义不得由 regex、固定短语或自由文本包含关系驱动。
10. 记录必须能表达执行失败但已有部分效果，也必须能表达执行完成但机械检查失败。
11. `CellBatch` 不隐含共享 mind、共享任务树、投票或语义 synthesis。
12. 没有明确的 authority，就只能记录 observation，不能生成 acceptance。

## 17. 本轮收敛和仍开放的事项

### 17.1 已形成的设计基线

以下事项不再作为本轮 plan 的无主不确定因素；它们仍需最终设计评审，但后续讨论应以此
为 baseline，除非提出具体反例：

1. Binding 在 admission 阶段由 host 物化，运行期间不可变，以引用、digest 和 host evidence
   关联运行记录。
2. `WorkCellRun` 是 coordinator 内部活跃对象；跨进程公共观察面是 Event + RunRecord。
3. `CompletionContract.actions` 可以有多个声明；每个 action 独立检查，不隐含顺序或事务性。
4. `Attempt` 不进入 Work Cell core 的公共协议；调度层只对外保留 `WorkItem`、`WorkLease`、
   `AttemptOutcome` 等必要关系。
5. v1 不做 provider session 的原地 resume。继续执行必须建立新的 run，并用
   `continued-from` 关联；retry 同样建立新 run，但使用 `retry-of`。
6. semantic review 的载体和 reviewer authority 不由 Work Cell core 规定；core 只提供运行事实、
   checks 和 evidence 引用。
7. Vercel AI SDK/Pi 与 DeepSeek Harness 的协议位置已经确定为可替换 executor/adapter；
   对照变体各自拥有 immutable Binding，比较固定非 executor 约束；哪一个在效果、成本或恢复性上
   更好，不由协议命名预先决定。

### 17.2 仍需后续决定或验证

这些是真正尚未有足够来源或需要外部 owner 决定的事项：

- `WorkCellRunRequest.spec` 默认 inline，还是默认引用不可变 spec registry；
- `CommandGrant.argumentShape` 的最小结构和 host argv policy；这属于安全/host owner 的
  具体授权规则，不能由 WorkCell 语义层猜定；
- semantic review 的具体载体、rubric 和 reviewer authority；
- `draining` 遇到不合作的 executor 或 host 调用时的有界终止关系：何时停止等待、哪些外部
  效果转为 `unknown`、谁负责完成最后的记录；不能让“尽量排空”成为无界生命周期；
- Binding 在运行中到期、host policy 变化或权限需要撤销时，活动 run 是继续使用 admission
  快照、被取消，还是以哪一种结构化结果结束；不能同时宣称不可变和静默继续旧权限；
- `WorkCellEvent` 对跨进程消费者是否提供顺序、去重和重放关系；若不提供，公共观察面应明确
  只保证 RunRecord 事实而不保证事件流重建；若提供，则需要 owner 和可检验的序列/幂等语义；
- `retry-of` / `continued-from` 的 lineage 是否能只从保留的 request/run record 恢复；若 parent
  request 不可用，不能靠自然语言或 provider session 猜回因果关系；
- DeepSeek Harness 与 Vercel AI SDK/Pi 是否能在同一 tool surface、模型和 fixture 下达到
  足够可比的实验条件；这是 eval 的 empirical unknown，不是协议缺口；
- 1+N 基座的模块集合、DeepSeek Harness 是 carrier 还是 kernel，以及基座与软件层的整合；
  这些属于 roadmap 层，不由 Work Cell design 单独决定；
- 当前工作的正式 owner、priority 和 acceptance owner；来源没有给出，必须保留 unknown。

每个仍开放项都要在进入实现前获得对应 owner 的决定或证据；在此之前只能保持 design
baseline、hold 或 evaluation candidate，不能借 adapter 实现习惯代替决定。

## 18. 实现前的设计验收标准

本设计可以进入实现准备阶段的前提是，评审者能够用不超过一句话区分：

- `WorkCellSpec` 与 `WorkCellRunRequest`；
- `WorkCellBinding` 与 `WorkCellExecutionContext`；
- `WorkCellRun` 与 `WorkCellRunRecord`；
- `WorkCellExecutionReturn` 与 `AcceptanceDecision`；
- `WorkCellEvent` 与 `EvidenceRef`；
- `MechanicalCheck` 与 `SemanticReview`；
- `ResourceLimits` 与 `UsageObservation`；
- `WorkItem` 与 `WorkCell`。

同时还应通过以下反例检查：

1. 删除 provider 字段后，Spec 仍能表达完整的 bounded work。
2. 在固定同一 Spec 与非 executor Binding 约束的前提下，各自使用 Vercel AI SDK 或 DeepSeek Harness
   executor 后，调用方仍能消费同一类 RunRecord。
3. 没有 `acceptance` 字段时，系统仍能记录执行事实和机械检查。
4. executor 失败但已经写文件时，记录不会丢失 workspace effects。
5. output schema 失败时，系统不会把整个语义结果误报为“Cell 没有运行”。
6. 取消时存在未确认外部效果时，记录可以表达 `unknown`。
7. 通过自由文本说“可以访问更多目录”不能扩大 Binding。
8. 单独拿出 `CellBatch` 时，不能推导出共享 mind 或 synthesis authority。
9. 不合作的 executor 在取消后不会让 `draining` 无界挂起；在安全截止后，未确认效果会以
   `unknown` 保留，并仍能产生可消费的 RunRecord。
10. Binding 到期或撤销的活动 run 有明确的 host-owned 结果，不会静默获得新权限，也不会以
    自由文本猜测继续或停止。
11. 若 Event 声称支持跨进程重放，顺序、重复和缺口都有可检验语义；若不支持，调用方不会把
    Event 当作完整事实源，RunRecord 才是公共事实投影。
12. 只保留必要的 request/run record 时，`retry-of` 与 `continued-from` 仍能恢复真实因果；
    provider session 或自然语言不能成为 lineage authority。

完成这些设计评审后，才进入 adapter contract、host fake、deterministic executor 和 eval fixture 的实现；本文件本身不包含实现授权。
