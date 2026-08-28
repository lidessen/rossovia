# WorkCell `CommandGrant.argumentShape` 边界回返

状态：`design-boundary-candidate / source-applicability-limited / independent-review-complete / acceptance-pending`；
不是 canonical protocol acceptance、host security policy、runtime enforcement、eval Run 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 1. 本轮对象与来源

本记录只处理 WorkCell §17.2 明确留下的窄问题：`CommandGrant.argumentShape` 应如何区分
需求、宿主授予、实际调用和拒绝/未知。它不试图一次决定完整 command sandbox、shell policy、
argv canonicalization、子进程效果或安全接受。

- canonical design candidate：[`design/work-cell-protocol.md`](../../design/work-cell-protocol.md) §4.2、§5.1、§5.2、§6.4、§9.1、§17.2、§18.7；
  当前只定义了 `CommandRequirement.argumentShape` 的需求位置，`EffectPolicy.command` 中的
  `CommandGrant` 形状仍未定。
- 相邻 planning source：[`workcell-contract-field-boundary-review.md`](workcell-contract-field-boundary-review.md)、
  [`workcell-design-acceptance-readiness.md`](workcell-design-acceptance-readiness.md)。前者已区分
  declaration、grant、executor return、host observation 和 record，但把 argument shape 留给
  host/security owner；后者把它列为 §17.2 的 owner decision。
- historical source：[`archive/packages/work-cell/README.md`](../../archive/packages/work-cell/README.md)
  中的 exact-argv/no-shell 旧实现说明；它只提供历史约束和反例，不是 current protocol authority。
- owner class：host/security（grant、argv/shell policy、host effect boundary）、protocol/record/evidence
  （call/event/observation shape、failure/standing、retention）和 acceptance owner；具体 named owner
  当前均 `unknown`。

## 2. 当前对象关系

| 层 | 当前对象 | 它能说明什么 | 它不能取得的权威 |
| --- | --- | --- | --- |
| declaration | `WorkspaceScope.commandRequirements` / `CommandRequirement.argumentShape` | 调用方希望具备哪类命令入口和参数形状 | 不授予 executable、shell、workspace、network 或 secret effect |
| host grant / tool surface | `WorkCellBinding.toolSurface` / `ToolGrant` 与 `WorkCellBinding.effectPolicy.command` / `CommandGrant` | host 在 admission 后实际暴露哪类受控工具和命令调用 | 不由 Spec、executor 或自然语言自行扩大 |
| transport / call request | `WorkCellExecutionContext.requestTool(call)` 或等价的 typed call request | executor 如何请求受控 host action | 不等于 command authorization、host 接受或已发生 effect |
| actual host call observation | 当前命名的 `ToolCallObservation`、`WorkCellEvent` 和 `EffectObservation`；accepted/started/ended/unconfirmed 的最小 shape 仍未定 | host/coordinator 实际接受、启动、结束或无法确认了什么 | 不由 executor return 自报，也不把 shape match 当作效果确认 |
| observation/record | `EffectSummary`、`EvidenceRef` 和 RunRecord 的 command/effect projection | host 看到了什么、哪些事实 unavailable、如何保留证据 | 不把 provider return 变成 host fact、semantic review 或 acceptance |
| mechanical check | command/argument policy match | 调用是否符合已接受的 grant shape | 不证明脚本没有额外文件、网络或子进程效果 |

当前最重要的边界是：`argumentShape` 只能约束调用的结构和可接受参数集合；即使 exact argv
匹配，也不能把命令本身当成 filesystem confinement 或“没有其它 effect”的证明。命令可能执行
脚本、测试、package hook 或子进程；这些效果仍属于 host effect policy 和 observation。

## 3. 最小设计候选

### 3.1 只冻结边界，不冻结完整 schema

本轮只保留以下 wording-level candidate，供 host/security owner 选择或否决：

```ts
type CommandGrantCandidate = {
  executable: ExecutableIdentity;
  invocation: {
    mode: "argv";
    argumentShape: StructuredArgumentShape;
  };
};
```

其中 `ExecutableIdentity`、`StructuredArgumentShape` 的字段、值约束、path relation、digest 和
canonicalization 都仍是 owner unknown；这段不是 `design/work-cell-protocol.md` 的新 canonical
schema。

当前候选只作三项最小承诺：

1. command authorization 以结构化 argv/invocation 表达，不以可插值的 shell command string
   作为隐含权限；若未来允许 shell，必须成为另一个显式 host/security decision，不能由 `argv`
   形状静默推出。
2. requirement 与 grant 分开，并区分 failure code 与 observation standing：缺 grant 进入
   `capability_missing` / `admission_rejected`；shape mismatch 进入 owner 定义的
   `protocol_violation` 等 failure；host 无法确认调用或效果时，保留 `observed: unavailable`、
   事实 `unknown` 和原因，不自动归为 failure code `unknown`，也不静默降级成另一个命令。
3. actual argv、exit、child-process、workspace、network 和 secret effect 分开记录；shape match
   只是一项 mechanical observation，不是效果确认或 acceptance。

`WorkCellEvent` 只是类型化事件封套：`tool.requested` 表示 request/observation 的一个事件，不等于
host 已执行；只有相应的 completed/effect observation 才能支持实际 host fact，具体 accepted、started、
ended、unconfirmed 的 shape 仍由 protocol/record/evidence owner 决定。

这三项仍可能被 host/security owner 收窄或推翻；本轮不决定 exact argv、option allowlist、path
template、shell availability、environment、working directory、timeout 或 child-process policy。

### 3.2 被拒绝的更简单或更危险替代

| 替代 | 当前处置 | 原因 |
| --- | --- | --- |
| 保持 `CommandGrant` 未定义，所有解释留给 adapter | `retain-unknown` 但不足以作为最终 contract | 会让不同 adapter 自行解释同一个 grant，无法比较拒绝、调用和 effect standing |
| 用自由文本 `command` / regex / shell string 表达授权 | `reject` | 语义边界不可稳定重建；还会把解释器语义和权限扩大混在一起；load-bearing 判断不能靠固定字符串或 pattern |
| 只把 `argumentShape` 当工具 input schema | `reject` | transport validation 不等于 host-owned capability grant；会把 executor request 与 admission authority 混淆 |
| 直接把历史 exact argv 复制为 v1 全部规则 | `historical candidate only` | exact argv 可提供窄边界，但不能自动解决 executable identity、子进程、workspace/network effect、版本和跨 host 适用性 |
| 以 exact argv match 推出 filesystem confinement | `reject` | 旧 source 自己也区分命令选择与 filesystem effect；脚本或测试仍可能产生额外效果 |

## 4. 最小反例组

这些是设计 review fixture，不是当前 host Run，也不授权执行命令。

### C1：需求不等于授予

- `CommandRequirement` 请求一个结构化的 `tool-x check --format json` 入口；
- host 只授予 `tool-x inspect`，或根本没有对应 `CommandGrant`；
- executor 不能把 requirement 当成 grant，也不能静默换成 `inspect`；
- 最小结果是结构化 admission/capability 缺失关系，且 owner/record 能回读“未执行”。

### C2：额外参数不应静默通过

- grant 允许某个 `tool-x check --format json` 的窄 argv shape；
- executor 请求同一 executable 但增加写入、网络或其它未声明参数；
- shape mismatch 应在 host-owned boundary 被识别；若 host 未能判断，必须保留 `unknown`，不能把
  executor return 当作成功执行；
- 即使 shape match，仍不能推断 command 没有子进程或 workspace effect。

### C3：shell 解释器不是 argv 的隐含别名

- executor 将一段 command string 或 `sh -c` 形式的复合命令提交给只允许 argv 的 grant；
- 当前候选不把它当作同一 invocation；必须拒绝、路由或保留 owner-defined unknown；
- 如果未来确需 shell，必须另有显式 invocation mode、host/security owner、effect policy 和
  counterexample，不得由 `argumentShape` 的宽松表达自动打开。

### C4：exact argv 不是隔离证明

- host 接受了一个表面匹配的 executable/argv，但该 executable 是脚本或触发 package hook；
- 发生 workspace、command、network 或 secret effect；
- record 必须分别保存 effect observation/unavailable 和 shape check；不能写成“argv 合法所以
  effect 安全”或“没有 workspace diff 所以没有 effect”。

## 5. 当前处置与出口

- 当前处置：`retain-boundary-candidate / route-to-owner`。
- 当前 evidence standing：`source-backed design observation / historical-support-limited`；没有
  current host consumer、host Run、security acceptance、matched adapter comparison 或 implementation
  evidence。
- 允许效果：更新 readiness matrix、plan、roadmap、item ledger 和本 review 的 wording；若 owner
  决定改变 canonical protocol，另开 source revision、影响范围和 applicability reconciliation。
- 禁止效果：不回写 `design/work-cell-protocol.md` 的 canonical shape，不实现 command runner、shell
  sandbox、argv parser 或 policy registry，不启动 provider comparison，不把历史 exact argv 当作
  当前安全保证。

本项关闭本轮 bounded review 的条件是：host/security owner 对 grant、argv/shell policy 和 host effect
boundary，protocol/record/evidence owner 对 call/event/observation shape、failure/standing 和 retention，
分别在 C1–C4 上作出可回读的 `accept-planning-boundary-candidate`、`retain-unknown`、`no-proposal`
或明确延期；acceptance owner 仍只作为未决关系保留。各 owner 还要说明 executable identity、invocation
mode、argument shape、拒绝/不可确认结果、actual host call/effect observation 和证据保留边界。
这里的 `accept-planning-boundary-candidate` 只关闭本 planning review 的边界判断，不接受
`CommandGrant` canonical schema、host security policy、runtime enforcement 或 implementation。若
任一 owner 未命名或不能区分关系，则保持 `route-to-owner`，不通过增加字段制造收敛。

## 6. 下一 return

向 owner 交回以下最小问题：

1. `CommandGrant` 是否只允许 argv，还是允许显式 shell mode；若允许，怎样独立表达其 effect 和
   failure boundary？
2. executable identity 是 host-resolved path、稳定工具 identity、digest、还是其它结构化引用？
3. `StructuredArgumentShape` 需要 exact argv、位置/选项约束、值类型/枚举、workspace-relative
   path relation 中哪些最小字段？
4. shape mismatch、missing grant、host unavailable 和 command effect unavailable 分别由哪一层
   记录、用什么结构化 code 表达？
5. host/security owner 与 protocol/record/evidence owner 分别拥有哪一部分？actual argv、environment、
   working directory 和 child-process evidence 的 retention/privacy 边界是什么？

如果这些问题不能由当前 owner 回答，下一项应返回 `retain-unknown`；不因为未来要执行 shell 或
 需要安全就提前增加 runtime mechanism。

## 7. 独立 review

`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）已独立复读并 `ACCEPT`：确认 requirement、host
grant/tool surface、transport request、actual host observation、record 与 mechanical check 已分层；
`tool.requested` 不被当作 host execution，failure code 与 `observed: unavailable` / factual `unknown`
已分开；host/security、protocol/record/evidence 与 acceptance owner 的职责可回读。C1–C4、历史
exact-argv 的 authority/standing、shell/argv 的未决边界和禁止效果均相称。

该结论只接受本 planning boundary review，不构成 `CommandGrant` canonical schema、host security
policy、runtime enforcement、protocol acceptance 或 implementation acceptance。
