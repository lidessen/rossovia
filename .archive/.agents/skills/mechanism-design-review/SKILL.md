---
name: mechanism-design-review
description: 在 Agent harness、runtime、编排或工作流设计准备增加状态、记录、队列、锁、重试、门、hook、registry、协议或生命周期机制时，判断问题的真实对象、现有 owner 与最小充分处置；不用于已接受机制的普通实现或代码缺陷 review。
---

# 机制设计审查

状态：项目内 incubation candidate；当前 disposition 为 `rewrite-applied + retain-incubation`。这个载体
表达一种设计判断，不是 mechanism-admission 机制、runtime gate、review queue、实现授权或
acceptance source；当前不能因为本文件存在就宣称方法已被接受或可移植。

## 来源与载体身份

核心方法来自 archive 中的历史 `mechanism-design-review`，living 语义约束来自
`theory/skill-formation.md`、`theory/gene-expression.md` 和 `theory/harness/theory.md`；其
主要血统是 P15，并受 P04、P13、P16 的证据、边界和回归关系约束。archive 只是历史来源，
planning review records 是当前 consumer/evidence projection，本文件只是项目内 incubating
carrier；三者不互相取得 authority。

## 主要判断

判断一个观察到的 Agent/系统设计问题，是否真的需要新增机制，以及在保留硬约束的前提下，什么是
最小能改变问题的处置。机制包括会新增可强制、可排序、可持久化或可恢复关系的 state、record、
queue、lock、retry controller、gate、hook、registry、daemon、protocol 或 mandatory workflow。

“更可靠”“更显式”“以后可能需要”不是机制成立的理由。先恢复对象、来源和目标，再比较 prompt/
skill、已有 owner、确定性边界和新机制的全生命周期负担。

## 什么时候使用

在以下情形使用：

- 设计准备增加状态、记录、队列、锁、重试、恢复、审核门、registry 或新的生命周期阶段；
- `verification`、`review`、`acceptance`、`retry`、`continue`、`recovery` 或 `success` 的
  含义被混在一起；
- prompt、skill、policy、adapter、已有 owner 与新机制的责任边界不清；
- 为了“防止 Agent 做错”而要增加永久结构，却还没有具体失败、后果和控制关系。

不要用于已接受机制的普通实现、局部代码缺陷 review、一般任务拆分或单纯的文档润色；分别交给
实现 owner、`code-review`、`task-shaping` 或 `human-writing`。

## Review unit 与三个问题

一次 review 的 unit 是“一个具体 mechanism proposal 或一个设计 item 中由同一压力产生的一组
紧密提案”。它必须绑定一个可观察的 failure/counterexample、后果和当前 owner；若提案包含多个
互不相关的压力，先拆成多个 review unit。假设性风险、文件数量或“未来可能需要”不能单独成为
case evidence。

如果 consumer、owner、重启场景或失败后果只是 fixture 为了形成条件性正例而写入的前提，明确标为
`fixture-stipulated`；它只能支持“在该前提下如何判断”的局部观察，不能被写成真实外部 consumer、
重复生产证据、采用关系或 acceptance。只有能由当前来源和实际关系独立回读的 consumer/owner，才可
作为机制必要性的事实依据；否则保持 `hypothetical`、`unknown` 或 `no-proposal`。

### 1. Identity：这是什么，谁拥有它？

先不接受提案里的名称，明确：

- 对象是 mechanism、policy、adapter、prompt/skill judgment、durable fact、projection、
  evidence、semantic review 还是 domain decision；
- 它的 unit、cardinality、开始、结束和删除关系；
- effect、事实、验证、语义判断和 acceptance 分别由谁拥有；
- 它最容易和哪个现有对象混淆。

如果一个提案需要多个互不相干的 owner 或终止条件，先拆对象或退回 owner 修复，不直接增加
状态和动作。

### 2. Origin：什么真实压力产生了它？

从 proposed solution 之外恢复：

- 具体失败/反例、发生条件、后果和可观察证据；
- 现在已有哪个 instruction、policy、adapter、record 或机制触及该失败；
- 哪些是硬约束，哪些只是历史实现、框架仿制或对未来的担忧；
- 这是重复问题，还是一次性任务特有上下文；
- 哪个矛盾一旦解决，会改变其他问题的处置。

没有真实差距、重复性或可观察后果时，返回 `research-needed` 或 `no-proposal`，不以“Agent
可能做错”补齐证据。结论必须标出哪些是 observed case、哪些只是 hypothesis，以及当前覆盖和
未覆盖范围。

### 3. Destination：什么关系必须变成真？

描述干预后的目标关系，而不是功能愿望：

- 哪个确切事实、效果、机械属性或 owner 边界必须成立；
- 需要的是更好的判断、policy、已有 owner 修复、确定性检查，还是新状态/新控制；
- effect、observation、semantic review、acceptance 和 next action 如何分开；
- 终止、失败、恢复和删除由谁拥有；
- 哪些精度对安全、并发、不可逆效果或因果 identity 是必要的，哪些可以诚实返回 `unknown`。

目标不是最大鲁棒性，而是化解当前矛盾并保留硬约束的最小有效跃迁。

## 比较处置

按以下顺序比较，并记录被拒绝的更简单替代：

1. 保持设计，只修复局部误解；
2. 澄清 prompt、skill、设计文字或 policy；
3. 复用、收窄、合并或修复已有 owner；
4. 在已有 owner 的边界增加确定性检查；
5. 只有当 judgment 和已有 owner 无法保持唯一属性时，才提出 `mechanism-candidate`。

计算完整负担：概念、schema、记录、状态转换、caller、adapter、测试、运维、失败、恢复、迁移、
兼容与未来解释成本。新机制必须只有一个不能由已有 owner 承担的工作，并说明撤退/退休条件。

prompt/skill 或现有 owner 通常足够的条件是：目标行为是上下文判断；错误在不可逆 effect 逃逸前
可见；调用者没有绕过要求的并发、不可信边界或 crash-surviving obligation；且实际执行 profile
没有显示该指导被反复忽略。不能因为 prompt 不具备强制力就自动提出机制，也不能因为机制更便宜
就跳过对象和后果诊断。

### 设计字段前先选表达形态

字段形态选择遵循 [`theory/expression.md`](../../../theory/expression.md) 的语义表达规则，并在本
审查中检查它是否被误当成机制：

- 开放、可扩展、主要用于描述/检索/分组的维度，优先使用 `label`；它不能单独成为权限、路由、验收或
  生命周期依据。
- 只有当语义、范围、owner、兼容关系和未知/扩展处理足够长期稳定，并且存在真实机械消费者时才使用
  `enum`；当前样本有限、语言/框架方便或 provider 列表本身不足以支持枚举。
- 独立变化的维度保留独立属性；不要把属性笛卡尔积压成产品枚举，也不要用互相冲突的布尔值堆出隐含
  状态。结构、约束或动作不同才使用变体/判别联合。
- 仅为展示、筛选或统计产生的分类优先作为派生投影；历史分类要保留来源与时间，不另造一个会漂移的
  canonical 事实字段。

本段只帮助选择语义表达和最小契约，不创建状态机、registry、权限表、执行门或接受机制。字段一旦
影响这些关系，另按本 skill 的机制准入检查恢复真实 owner、失败和不可绕过的边界。

## 分离证据、判断、权威和动作

不要用一个 `verify`、`success` 或 `retry` 状态承载不同关系：

- **mechanical observation**：直接可复现的存在性、digest、schema、格式或确定性断言；只证明
  该事实，不证明语义质量；
- **semantic review**：独立判断设计/产物是否满足目标；review 不取得 acceptance；
- **acceptance**：由指定 Principal/acceptance owner 授权采用；不能从 pass 或 reviewer 信心推得；
- **next action**：根据失败、unknown、review 或 owner 决定下一次行动；不是 runtime 自动 retry。

按 effect 分类公共动作：

- `observe`：观察已有 subject，不改变 producer result；
- `run`：从明确 input 开始新的 execution 和新的 causal identity；
- `control`：只控制 owner 支持的、明确识别的 live execution。

`retry`、`continue`、`rerun`、`review` 通常是新 execution 的 reason 或 lineage，不是新的 peer
effect；correction、acceptance、settlement、reconciliation 归各自 domain/lifecycle owner。
如果所谓 checker 会修改 source、workspace、database 或外部系统，它是 execution，不是 observation。

## 返回

返回一份能让 design owner 直接判断的解释，而不是只给 finding 或代码链接：

1. 结论与建议：`keep`、`prompt`、`reuse`、`simplify` 或 `mechanism-candidate`；
2. 对象、unit、owner、正常路径和常见混淆对象；
3. 观察到的压力、来源、硬约束和当前 owner；
4. 目标关系、失败/恢复边界以及最强的更简单替代；
5. 当前到目标的最小改变、增加与移除的复杂度、故意保留的 unknown；
6. mechanical observation、semantic review、acceptance 和 next action 各自的 owner；
7. 支持结论的来源、反例、证据 standing、会推翻结论的观察和下一步。

同时明确：本次 review 的 input/unit、observed 与 hypothetical 的区分、覆盖/未覆盖、每项结果的
下游接收 owner、失败时停止位置、没有产生的 effect，以及 `route`、`no-proposal`、`rewrite` 的
触发条件。若没有足够 evidence，明确返回 `unknown`、`research-needed` 或 `no-proposal`；不要
因为 review 完整、格式通过或一次设计成功就接受机制。

## 所有权与硬边界

- `task-shaping` 负责 work unit；`agent-delegation` 负责委派拓扑；`code-review` 负责已提出
  code change 的缺陷；`systems-engineering` 负责具体 whole-system reliability；它们的结果是
  本审查的输入，不由本 skill 取代。
- 本 skill 可以提出设计候选和记录关系，不能创建 registry、queue、gate、runtime state、retry
  controller、review process 或新的 acceptance authority。
- 生命周期、身份、权限、并发、恢复、持久效果和外部 effect 的强制保证属于 runtime/base 或
  现有 effect owner；本 skill 不能用文字假装获得这些能力。
- WorkCell 中的机制候选必须回到 `design/work-cell-protocol.md`、host/security、protocol/
  record/evidence owner；不能用 provider、Vercel AI SDK、Pi 或 DeepSeek adapter 的习惯代定 core。

## 项目 adapter 与证据边界

当前 consumer、WorkCell probe、evidence standing 和 revisit 关系由
`planning/design-development-review.md`、`planning/skill-migration.md`、`planning/item-ledger.md`
及对应 review record 拥有；它们是可变化的项目 projection，不是本方法正文。读取这些记录是为了
恢复当前 case，不是为了把 WorkCell 事实内化成通用方法。

行为探针应覆盖：一个确有新增机制压力的正例、一个由 prompt/已有 owner 足够处理的反例、一个应
路由给最近邻 owner 的案例，以及一次 adoption/regression unknown 检查。探针是证据计划，不是
强制 gate；若没有真实 consumer，应返回 `no-proposal` 或保留 candidate。当前证据最多支持
`source-backed / planning behavior-observed`，没有 matched baseline、独立 skill semantic
acceptance、portable consumer 或 regression；不得 move 到 `skills/`，不得据此开始 WorkCell、
DeepSeek Harness 或 base 实现。
## 最近邻路由

机制问题未必应留在本 skill：

- 选 document、skill、reference、projection、tool 或 runtime 这种形式：转给 `form-selection`；
- 判断某个反复差距是否值得形成或保留 skill 载体：转给 `skill-formation`；
- 对象、名称或相邻概念尚未稳定：转给 `concept-articulation`；
- 对象已稳定但 Agent-facing 表达没有可靠传达：转给 `agent-expression`；
- 审查结果需要选择下一项最小实践：转给 `practice-cycle`；
- 复杂度/替代方案的粒度改变当前计划选择：转给 `work-estimation`；
- work unit、委派拓扑、已接受代码缺陷或 whole-system reliability：分别转给
  `task-shaping`、`agent-delegation`、`code-review` 或 `systems-engineering`。

若路由本身未稳定，返回 `route-unknown`，不要为了保留本 skill 而扩大机制审查范围。
