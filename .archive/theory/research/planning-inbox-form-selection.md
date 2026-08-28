---
kind: research-record
id: planning-inbox-form-selection
status: settled
disposition: canonical-proposal
---

# Planning Inbox form selection

## 决定

**形式结论：`accept`。**

当前最小真实形式是两份逻辑分离、低并发单写者 Markdown：

```text
planning/inbox.md
  = pending raw capture source

planning/inbox-history.md
  = source-native processing receipt and retained history
```

本报告只选择形式，不创建 `planning/inbox-history.md`，不创建 Todo、ideas、archive
子目录，也不准入 skill 或注册 host command。当前行为仍是 `unknown`；raw 保真、批量
澄清、safe-point 插入、重放、迁移顺序、并发边界和长期恢复需后续
`adapt-and-retest`。理论来源是已接受的 `theory/harness/planning-inbox.md`，三轮
review 已将对象、authority、candidate/record standing 与 runtime 边界稳定下来。

## 使用关系

### 语义对象与当前 source

待承载的对象仍是：

```text
source capture → secretary interpretation → disposition
               → optional/explicit handoff + provenance
```

它不是一个列表行、Todo、Plan、goal、Run/Cell、eval record 或 completion 状态。
`planning/inbox.md` 当前已经作为 provisional raw capture 使用：现有 6 条输入按语义
转折拆分，但以批次、顺序、逐字原文、来源和上下文保持可重建关系。该文件承载
pending 入口，不拥有秘书推断、优先级、承诺、执行、完成或 acceptance。

`planning/inbox-history.md` 的候选目的不是另建一个万能 ledger，而是把处理尝试及
其结果留成 source-native receipt：原始快照或可回指的 raw、处理时间/来源、解释的
explicit/inferred/unknown standing、disposition reason、handoff target/owner、未解决
关系、修订/重复/合并 lineage。它不因此取得目的地对象的权威，也不等于 execution
history、eval ledger 或 completion record。

### Audience / purpose / action / medium

| 形式 | 受众与目的 | 预期行动 | 媒介与生命周期 | 唯一 accountable owner | 它不拥有 |
|---|---|---|---|---|---|
| `planning/inbox.md` | 人类低摩擦输入者与秘书 Agent；接住原话并让 pending 输入可回读 | 人追加 raw、Agent 读取/批量整理，人检查原话 | 普通 Markdown；pending 期间 active，clear 后 raw 由 history receipt 保留 | capture source/保存者 | interpretation、priority、commitment、Plan、goal、执行、完成、接受 |
| `planning/inbox-history.md` | 人类审查者、秘书 Agent、后续 owner；恢复处理事实与 lineage | 追加 receipt、回看 disposition/handoff、纠正或追踪未决关系 | 追加式 Markdown；跨 pending 迁移长期保留，按 retention 可退役 | inbox source-native processing/retention recorder | canonical obligation、Plan、goal、Todo、research conclusion、experiment/eval evidence、runtime liveness、acceptance |
| 目的地既有 source（按关系选择） | 目标 owner；接收已授权或已接受的关系 | 创建/更新自身 canonical candidate、Plan、record 或接受结果 | 由目标 owner 决定；不由 inbox 形式预定路径 | 目标关系的 owner/acceptance owner | 不回写 inbox 的 raw 权威，不把 receipt 当执行证据 |

这里的“唯一 owner”是每份形式的语义责任边界，不要求只能有一个写入进程；在当前
低并发单写者条件下，实际维护者可由项目另行委派。若出现第二 writer、原子 claim、
跨 store 事务、可靠 cursor、并发恢复或不可逆外部效果，Markdown 形式必须重新评估，
不能靠增加标题或字段取得 runtime 能力。

## 相邻形式比较

### 仅 `planning/inbox.md`

这是当前 capture-only baseline，适合先接住用户的想法、观察、疑问、Todo 和半计划。
它最轻，也最符合 P07 的低摩擦，但一旦秘书消费并清除 pending，就缺少一个独立的
可回读 receipt/history 位置；把处理记录混回 raw 区会混淆 source 与 interpretation，
直接删除则无法保证 raw 不丢。因此它不足以承载“秘书整理 + clear 但可恢复”的完整
使用关系，只应作为两文件形式的第一阶段入口，而不是最终最小形式。

### `inbox.md` + `inbox-history.md`（当前选择）

这是第一个同时满足以下关系的最小组合：低摩擦 append、raw 可重建、处理事实可审查、
clear 不等于 delete、handoff 可追溯、没有第二个任务队列或执行 ledger。两个文件拥有
不同但明确的 source/receipt 生命周期；它们之间通过 capture ID/batch、source link
或等价 lineage 关联，不通过复制一份“更正确”的摘要建立第二 canon。

它仍不提供 exactly-once 或原子移动。单写者方法应先在 history 追加完整 receipt/原始
快照并确认可回读，再从 pending inbox 移除；若中断发生在两步之间，允许出现 pending
与 history 的重复，不能为了视觉清空先删除 raw。重复消费由 lineage、修订和 receipt
说明处理，不宣称幂等保证。

### `inbox.md` + receipt/history + `todo.md`

当前不选择。Todo 是 canonical obligation 或执行者的局部 return condition，不是
秘书收件箱的自然第三层。新增 `planning/todo.md` 会立即引入 owner、priority、依赖、
claim、完成、重开、接受和长期清理等生命周期；项目现有 `planning/plan.md` 是
pre-implementation plan，不应悄然改造成全局 Todo queue。已有 explicit instruction
或 bounded delegation 允许的局部 Todo，可以留在当前 task/Plan 或目标 owner 的既有
形式中；不需要先建一个全局 Todo 文件。

只有当重复使用证明 Todo 有独立受众、独立 owner、跨 capture 的 canonical obligation
生命周期，且确实需要长期查询、依赖/优先级门控、claim、恢复或 acceptance 时，才
重新进行 form selection；其中硬属性可能直接要求 tool/runtime，而非第三份 Markdown。

### 额外 `ideas/` 或 `archive/` 子目录

当前不选择。未承诺的想法已有 `inbox` raw 与 `incubation/planning candidate` 的
disposition 语义；先建 `ideas/` 会把“想法”误升格为持久分类或第二入口。只有当
ideas 有与 pending raw 不同的受众、检索/回读目的、生命周期和 owner，并且实际
失败显示 inbox 不足时，才增设独立形式。

`archive/` 更不应作为当前 inbox 的默认去向：仓库 `archive/` 是 v0.5 历史文档暂存，
不是现行设计或个人收件箱归档。只有当 inbox-history 的 retention、访问权限、体积、
审计或退役周期已经与 processing receipt 分离，且有明确 source/retention owner 时，
才另选 archive 形式。当前 history 已足以保留 raw 快照和处理 lineage，不需要再造
archive 子树。

## pending → disposition/handoff → history

推荐的最小迁移关系不是固定状态机，而是按语义顺序执行：

```text
用户输入 / `/inbox` 文本
        ↓
planning/inbox.md：追加 raw pending（保留批次、顺序、上下文）
        ↓
秘书获得运行机会：形成可回指 raw 的 interpretation 与 disposition receipt
        ↓
追加 planning/inbox-history.md：原始快照/来源 + reason + unknown + authority
        ↓
若仍 hold：pending 保留；若已 clear：确认 history 可回读后再从 inbox pending 移除
        ↓
若有 handoff：由目标 owner 在其 canonical source 中接受/创建相应关系
```

几个边界必须保持：

- `hold` 或等待澄清可以有 receipt，但不从 pending 清除；receipt 记录 revisit/return/
  owner-escalation 关系，不伪装后台复查。
- disposition/handoff receipt 不是 acceptance、completion、execution evidence 或
  research/eval/experiment record；目标 owner 的实际记录按 `AGENTS.md`、`evals/README.md`
  和 `experiments/README.md` 的 standing 分别进入相应 owner 形式。
- `research candidate` 只进入研究候选关系；实际研究记录仍是 research record。
  `experiment candidate` 只承载预期/所需证据关系；实际 Run/Cell observation/evidence
  进入 experiment/eval owner 的记录。`incubation/planning candidate` 不取得研究或
  实验 evidence standing。
- 后续用户纠正、拒绝、重复、合并、撤回或重新路由，都追加 correction/lineage receipt，
  不覆盖原始快照；history 的副本是 source preservation/receipt，不是第二个解释 canon。

## 如何清空而不丢 raw

在当前单写者 Markdown 外部契约下，清空只能是视图迁移，不是 source 删除：

1. 给 capture 保留一个可人工回指的 ID/batch/revision 标识；这不是 runtime identity，
   也不提供 exactly-once，只服务人类重建与重复说明。
2. 先把原文或足以逐字重建的快照、来源、上下文和 receipt 追加到 history；不得先用
   秘书摘要替代原文。
3. 确认 history 条目在当前工作机会中可读后，才把已明确处理的 pending 从 inbox
   视图移除。这里的 clear 是从 pending 视图消失，不是 delete、purge、complete 或
   acceptance。
4. 若两步之间中断，保留 pending 与 history 的重复，下一次按 lineage 处理；不主张
   原子迁移、无重复消费或崩溃恢复。
5. 若 source 被用户撤回或 retention 要求删除，应由 source/retention owner 明确
   处理，不能由普通 clear 暗示授权；history 是否还保留 receipt 也需显式决定。

这套顺序在低风险、单写者、人工可 review 的 Markdown 范围内是最小可用形式判断，
不是可靠存储协议。若“不丢 raw”升级成跨进程、合规、不可逆删除、事务或 exactly-once
要求，应停止扩充 Markdown，转交 tool/runtime/base。

## `/inbox` 的外部契约

当前不能把 `/inbox` 说成已注册的 host command。现阶段最诚实的定义是：

- 它是项目约定的文本标记/意图入口：用户在对话中以 `/inbox` 表示“将后续内容按
  raw capture 记录到 `planning/inbox.md`”；Agent 只有在获得一次运行机会时才能
  读取和整理。
- 它可以作为未来项目 skill 的 trigger convention，但本报告不决定 skill admission，
  也不因名称自动加载 `.agents/skills` 或获得写入权限。
- 它不是 host command、事件订阅、后台 scheduler、持久 inbox API 或可靠 input hook。
  当前未见 host 注册、payload contract、权限、重试、身份、持久化和错误语义；不能
  通过 Markdown 或 prompt 假装这些契约存在。
- 若未来 host 真正注册 `/inbox`，host contract 必须另行拥有 invocation、payload、
  identity、permission、persistence、failure/retry 和 effect boundary；这会触发
  tool/runtime form review，不改变当前 raw/receipt 的语义 owner。

## `.agents/skills` 与 `skills` 的实现外部契约

当前不创建 inbox skill。若后续 `skill-formation` 证明存在可重复且会改变 Agent 行动的
秘书方法：

- 依赖本仓库路径、`planning/inbox.md`、`inbox-history`、项目 authority、`evals/`、
  `experiments/` 或其他本项目工作约定的 adapter，应放在 `.agents/skills/`，这是项目
  可发现入口和孵化位置。
- 只有脱离本仓库事实仍可独立使用、并经过相称验证的抽象方法，才有候选资格进入
  `skills/`。目录位置本身不证明 skill admission 或行为有效。
- 同一方法不得在两处复制成两个 canonical 正文；若通用方法与项目 adapter 有真实
  独立边界，分别命名并声明依赖，否则引用、move 或删除旧载体以保持单一权威。

这只是形式的外部契约，不替 `skill-formation` 决定是否形成、拆分、合并或拒绝 skill。
人类视图和 Agent 视图当前都能从 raw/history 回读同一来源，尚无必须预建独立
Agent-facing projection 的证据；若未来确有独立组织、复制、生成和漂移风险，再用
`dual-audience-expression` 选择派生视图，且不让它成为第二 canon。

## Unknown 与 alternatives

### 当前 unknown

- 实际 host 是否会提供 `/inbox` 注册、事件身份或输入持久化；当前文件只能把它当
  项目约定。
- 单写者下 append-first 再 clear 的操作是否足以满足真实使用负载；尚未有中断、重放、
  多来源或用户撤回 probe 结果。
- history 何时会因体积、查询、retention、敏感访问或审计需求需要单独 archive/
  runtime；当前没有证据提前选择。
- 人类与 Agent 是否会形成需要不同结构、选择性加载和语义同步的独立视图；目前共读
  raw/history 即可，不应预建 projection。
- 目标 owner 对 Plan、local Todo、research candidate、experiment/eval candidate 和
  actual record 的具体现行路径；本形式只保留 handoff/provenance，不替目标 owner
  选路径或 schema。

### 可接受 alternatives

- **A：暂时只用 `planning/inbox.md`。** 作为 capture-only 实验可接受；一旦要求
  clear 不丢 raw 或记录 disposition，应升级到当前两文件形式。
- **B：两文件，但 history 先与 inbox 同一物理文件的附录试运行。** 只有在单写者、
  低体积、人工可 review 且明确区分 raw/pending 与 receipt/history owner 时可作为
  临时形式；若语义 owner 或生命周期混淆，回到两文件。它不能成为长期 schema 默认。
- **C：receipt 后增加 Todo。** 仅当真实使用探针显示存在独立 canonical obligation
  lifecycle，并且 owner、依赖、priority、claim、完成和接受关系已获得外部契约时
  才重新选择；不因“秘书能整理 Todo”自动创建。
- **D：ideas/archive 子目录。** 只有在独立 audience、retention、访问、查询或退役
  关系被实际证明后才提出；当前 `inbox-history.md` 已是更小形式。

若未来无法确定 raw 的 retention owner、receipt 的消费关系或目标 owner 的外部契约，
应对新增形式返回 `no-proposal`，继续使用 capture-only inbox，不用万能文件填补未知。

## 形式验收边界

本选择可接受的依据是：`planning/inbox.md` 已有真实低摩擦 raw 使用、项目治理已经
区分 theory/research、evals、experiments 与 planning、当前是低并发单写者、且 inbox
理论明确要求 clear 与 complete 分离并保留 lineage。它只建立 `format/form decision`，
不建立行为证据。

后续形式 probe 应检查：append-first 清空顺序、重复 receipt 的可解释性、raw 语义拆分
重建、hold 保留、candidate/record 路由、用户修订、敏感 retention、history 规模与
第二 writer 边界。任何 probe 若显示两文件仍产生第二权威、raw 丢失或迁移关系不能
重建，应回到 form-selection，而不是靠增加字段、Todo、ideas/archive 或 skill trigger
掩盖问题。
