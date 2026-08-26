---
kind: review-record
id: planning-inbox-skill-review-round-2
status: settled
disposition: static-accept-adapt-and-retest
---

# Planning Inbox skill review — round 2

## 结论

**静态处置：`accept`。**
**行为状态：`unknown`；后续动作：`adapt-and-retest`。**

本轮是对 `theory/research/planning-inbox-skill-review.md` 两个 blocking 的窄回归，
不是行为测试，也不是对 skill 行为收益的接受。修订后的候选已经足以作为项目内
incubating skill 进入后续 probe；尚不能声称 `behavior-observed`、`matched-improvement`
或 `regression-supported`。

## Blocking 复核

### B1 history append-first / clear：已关闭

候选 `Process mode` 第 54–58 行现在明确规定：若要从 pending clear，必须先把可回读的
raw/source、receipt 和 lineage 追加到当前项目约定的 `planning/inbox-history.md`，确认
当前运行机会可以回读后，才从 `planning/inbox.md` clear；hold/等待澄清留在 pending；
两步中断允许 pending 与 history 同时存在，不声称原子迁移、exactly-once 或恢复保证。

这与当前 [inbox-history.md](/Users/lidessen/workspaces/skills/planning/inbox-history.md)
的外部契约一致，也符合 `agent-expression` 对允许效果、失败范围、返回和未知的要求。
候选第 144–155 行仍要求返回 raw/provenance、receipt 相关结果与失败缺口，不再存在
“只写 disposition 后直接清空”的静态路径。

### B2 `/inbox` 非 host command：已关闭

候选第 21–24 行已把 `/inbox` 定义为当前项目的文本标记和 skill trigger，并明确它
不是已注册的 host command、input hook、后台 scheduler 或可靠 API；host payload、权限、
持久化、重试和唤醒能力不由 skill 提供。候选第 138–140 行再次保留无后台 wake、持久
identity、claim、取消、恢复、exactly-once 和副作用保证的边界。

因此选择 skill 不会被静态文本解释为注册 command、取得写入权限或获得后台运行机会。
若未来 host 真注册 command，仍需独立的 host/tool/runtime contract。

## 窄回归

### 未引入第二 canon：通过

候选继续把 `planning/inbox.md` 作为 capture source，把 history 作为迁移时引用的
receipt/raw/lineage 载体；第 117–121 行明确 inbox 摘要、receipt、review、clear 或
archive 不取得 Plan、goal、Todo、执行、completion 或 acceptance 的第二权威。它没有
复制六条 raw、理论全文、history 正文、下游 schema 或 runtime contract。

候选仍要求目标 source 和真实 owner 保持 canonical 语义，skill 只形成 disposition/
handoff 候选；这与已接受 theory、form-selection 及项目 `AGENTS.md` 一致。

### 未引入 runtime 假保证：通过

history 迁移段明确允许中断后重复，不主张原子迁移、exactly-once 或恢复；active-goal
段明确“没有新的运行机会只能说未复查”，并把身份、并发、取消、恢复、事件游标和
副作用边界归 runtime/base。候选没有把 Markdown、prompt 或 skill trigger 写成调度器、
可靠 input hook、并发 claim 或持久 ledger。

### 未强行拆分 capture/process：通过（暂定组合）

候选第 47–61 行仍把 capture 与 process 作为同一 skill 的两个模式：process 依赖 raw
capture，共享 source、authority、handoff 和失败边界；只需要 capture 时明确停在
capture，不强行进入 process。修订没有新增第二 skill、循环依赖或两个互相竞争的主判断。

这仍是未验证的组合假设，而非回归错误。后续 probe 要分别检查 capture-only、从既有
raw 开始的 process、两者独立失败/owner/上下文成本以及一个 skill 相对于拆分形式的
发现收益；若实际边界独立，再由 `skill-formation` 重新判断拆分。

### 篇幅与 token 保真：通过

候选从 149 行增加到约 158 行，增加内容仅承载两项项目外部契约：history append-first
以及 `/inbox` host 边界。没有引入固定字段、闭合状态机、Todo、ideas/archive、eval
路径或 runtime 协议；raw、authority、candidate/record、clear/complete、safe point、
失败和返回语义仍可重建。当前没有证据表明这些增量造成不必要篇幅或 token 压缩变形。

## 其他静态检查

### 主要判断与触发边界：通过

description 与正文仍围绕一个主要判断：保留可重建 planning source，形成可审查秘书
整理，选择保留/澄清/handoff 的最小去向而不扩张 commitment、priority、goal、owner、
scope、record、execution 或 acceptance。正触发包括项目文本 `/inbox`、整理请求和
active-goal safe point；负触发排除普通笔记、既有 Plan/goal/Todo、实际 research/
experiment/eval record、外部效果和 runtime 工作。

“用户显式使用 `/inbox`”现在被限定为文本约定，不会单独授权超出其 action、scope、
effect boundary 和 reversibility 的动作。capture-only 也不会因为 skill 被加载就自动
process。

### raw / authority / candidate-record / clear-complete：通过

候选保持 raw 可按语义转折拆分但可重建，显式/推断/未知与弱语气边界；explicit instruction
或 bounded delegation 只支持有界可逆本地动作，不偷渡 commitment、priority、owner、
acceptance 或外部效果；research/experiment/incubation candidate 与实际 record/Run/Cell
standing 分离；`想试 A` 不冒充实际运行；consume、clear、archive、complete 和 acceptance
不互相冒充。

## 后续 probes

静态接受后仍需按 `skill-formation` 与 `evals/skill-evaluation/protocol.md` 执行：

1. 发现探针：项目文本 `/inbox`、等价 capture 请求、整理请求和普通笔记/Plan/record 的
   选择差异；确认无 host command 假设。
2. capture/process 分离探针：capture-only 不整理；process 从已有 raw 开始；比较同 skill
   与潜在拆分的发现、上下文成本、失败和 owner 路由。
3. history 迁移探针：append-first、history 暂时重复、hold 保留 pending、用户修订/撤回、
   重放与 lineage；不把重复或成功写入解释成 exactly-once。
4. authority 与最近邻探针：explicit instruction、bounded delegation、suggestion，
   以及 research candidate、experiment candidate、实际 Run/Cell、Plan/Todo 的反例。
5. active-goal 与 runtime 边界探针：safe point、无运行机会、第二 writer、进程中断、
   外部不可逆效果和恢复要求；没有 runtime 证据时只报告 unknown/缺口。
6. baseline/review：与项目指令 alone、现有 skills 组合和候选 treatment 比较，区分
   skill discovery、激活后行动、outcome 与维护成本。

直到这些 probe 形成相称证据，skill 的行为主张保持 `unknown / adapt-and-retest`；本次
静态 `accept` 只确认候选表达没有保留已指出的两个 blocking 或引入窄回归问题。

## Main 综合处置

**处置：接受为项目内 incubating candidate；行为 `unknown / adapt-and-retest`。**
Main 接受当前 skill 进入隔离行为试验，但不接受其为 portable `skills/` 载体，也不把
静态 review、格式通过或文件存在写成行为收益。后续是否保留、改写、拆分、降级或晋升，
只由预注册 probe、独立 review 和实际 balancing cost 决定。
