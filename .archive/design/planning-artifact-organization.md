# Planning 文档组织设计（Draft）

状态：`Draft`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本文件是文档组织的唯一设计正文，供人直接 review。它不创建第二份 planning authority、新 skill 或实现
授权。此前的路径整理、candidate 分类和 review 波次只作为本文末尾的审计附录保留；它们不是日常阅读入口，
也不要求 review 者理解其流程。

## 当前设计：两类日常入口

日常使用只需要记住两条关系：

| 要看什么 | 唯一入口 | 入口负责什么 |
| --- | --- | --- |
| 设计是什么、为什么这样设计、有哪些未决设计问题 | `design/<design>.md` | 设计正文；人类 review 直接看这里 |
| 接下来怎么做、顺序是什么、当前不做什么 | `planning/plan.md` | 当前执行计划；计划 review 直接看这里 |

长期方向看 [`planning/roadmap.md`](../planning/roadmap.md)。原始想法进入
[`planning/inbox.md`](../planning/inbox.md)。其它文件都不是这两类日常 review 的替代入口。

### 最小目录契约

```text
design/
  <design>.md                 # 当前设计正文；未定稿时在标题处标记 Draft

planning/
  plan.md                     # 当前怎么推进
  roadmap.md                  # 长期为什么推进、阶段顺序
  inbox.md                    # 原始想法入口
  inbox-history.md            # 必要时的原始处理回执
  records/                    # 稀疏审计附录，不是 review 入口
```

`planning/index/` 可以保留给 Main 的临时检索视图，但不进入普通 review 路径；没有实际读取问题时不打开。
`theory/`、`evals/`、`experiments/` 和 `.agents/skills/` 继续由各自的语义、证据或载体 owner 负责。

### Draft 与正式稿

- 未定稿的设计只有一个正文，标题或首行使用 `Draft` 标记；不创建 `candidate-1`、`candidate-2` 或
  一串并列 candidate 文档。
- 设计接受后，去掉 `Draft` 标记，原正文成为当前正式设计；不复制一份“accepted design”。
- 被替代的设计进入历史归档，并在原处或 successor 处保留替代关系；不通过多份 current projection
  维持可发现性。
- `candidate` 只在必要的审计语境中描述“尚未决定的对象”，不作为用户日常导航、文件层级或流程主线。

### Records 什么时候才成立

Record 只有在它保存一种日后无法从当前设计或计划重建的审计关系时才创建，例如：

- 独立 review 的输入、反例和结论；
- 实验/eval 的不可替代证据；
- 迁移、回滚、reconciliation 或 source applicability 的事实回执；
- 一个已发生但未能进入设计正文的失败、unknown 或决定变化。

以下情况不创建 record：一次普通讨论、每个字段的单独候选、没有 decision delta 的重复 review、为了
显示“流程完整”而增加的 acceptance-readiness、状态组合或 sibling candidate。它们应直接写回设计、plan，
或不留新载体。

### Review 规则

1. Review design：只读对应 `design/<design>.md`；必要的审计 record 由设计正文链接，但不承担正文内容。
2. Review plan：只读 `planning/plan.md`；roadmap 只在需要确认长期顺序时读取。
3. Review audit：只有在要核对某个决定的来源、证据、反例或回滚关系时，才打开对应 record。
4. 如果读者必须先理解多个 record 才能理解设计或 plan，说明 canonical 正文没有写完整，应回写正文，
   而不是继续增加流程载体。

### WorkCell 当前落点

[`work-cell-protocol.md`](work-cell-protocol.md) 是唯一的 WorkCell 设计正文，当前处于 Draft。WorkCell
的 review family、readiness projection 和 harness 试行计划只用于审计和规划回读；它们不能取代该正文，
也不能把设计接受或实现授权拆散到多个文件中。

---

## 审计附录：此前结构整理的来源与回执

以下内容保留是为了让未来能够回答“为什么曾经这样组织、哪些路径已经移动、是否需要回滚”，不是当前设计
的必读部分。它不能覆盖上面的当前设计，也不要求日常 review 按其步骤执行。

此前的当前跨 item authority 仍是
[`planning/item-ledger.md`](../planning/item-ledger.md)，长期方向和实现前顺序仍分别由
[`planning/roadmap.md`](../planning/roadmap.md) 与 [`planning/plan.md`](../planning/plan.md) 拥有。

## 1. 要解决的对象

本设计只处理 planning artifact 的发现与生命周期表达：让读者能区分当前 authority、长期/阶段
projection、低摩擦输入和 bounded process record，同时保持每类 artifact 的来源、owner、standing、
lineage 与可重建关系。

它不处理：

- WorkCell 协议字段、runtime、host effect 或实现；
- DeepSeek Harness 工作系统、provider 选择或 base/kernel；
- 哲学源、reading 语义或 theory 结构；
- 是否形成 `artifact-organization` skill；
- 一次性删除噪声、文件名审美或无目标的目录清理。

## 2. 当前来源与观察

当前来源关系：

- [`AGENTS.md`](../AGENTS.md) 规定 living source、archive standing、skill placement 和实现边界；
- [`planning/README.md`](../planning/README.md) 是发现入口，拥有读取顺序和 route boundary；
- [`planning/item-ledger.md`](../planning/item-ledger.md) 拥有当前跨 item standing、可推进部分、出口和
  revisit projection；
- `roadmap.md` 拥有长期方向，`plan.md` 拥有 pre-implementation 顺序；
- `inbox.md` 与 `inbox-history.md` 分别拥有 raw capture 和 source-native processing lineage；
- 各 item 的 child/review record 拥有具体 source applicability、观察、review、处置和未知。

当前 tree 观察：

- 本候选较早回读时，`planning/` 的 Markdown 文件都在同一层；87/68、89 等数字是历史快照，不是
  当前计数，也不是迁移目标或 acceptance evidence。2026-08-26 的两轮 transition 后，根目录保留
  7 个稳定入口/authority，`planning/index/` 保存 8 个 working view 和一个入口，`planning/records/`
  保存 81 个 bounded process records 及其入口，全部 planning Markdown 共 98 个；
- orientation、current authority、direction/commitment、intake/lineage、working index 和 process
  evidence 已有可见的读取层次；它们的语义仍由各自 canonical source 拥有；
- `planning/README.md` 已提供读取顺序和按目的路由，因此当前不是“找不到 authority”，而是
  “process record 数量和生命周期在物理布局上不易区分”；
- target layout、named organization owner 和长期 acceptance 仍未成立；本轮路径 transition 的授权
  来自用户对“planning 目录仍然很乱”的明确纠正，执行范围限制在根入口与 bounded records 的发现路径。

这些观察证明 layout pressure，不证明任何特定 move 已被接受。

## 3. 设计目标与不变量

### 目标

1. 读者先能找到当前 authority，再按 item/domain 找到 bounded record；
2. 目录位置表达生命周期和 owner 关系，而不是重新定义 standing；
3. 任一 process record 仍能回到 canonical source、当前 item、review/acceptance boundary 和 lineage；
4. 移动不会复制第二份正文、制造第二份 authority 或把 dated history 伪装成 current state；
5. 组织变化可分批、可验证、可回滚，并且不改变 planning item 的语义 standing。

### 不变量

- `archive/` 仍是历史 source；不因目录整理变成 current design；
- `skills/` 继续为空，除非有独立 portable acceptance 和 move disposition；
- `.agents/skills/` 继续是项目内 incubation entry；
- `theory/`、`design/`、`evals/`、`experiments/` 的 authority 不由 planning 目录重组接管；
- `README`、`item-ledger`、`roadmap`、`plan` 和各 canonical source 的 standing 不由路径名称推导；
- `independent-review-complete`、`acceptance-pending`、`unknown`、`not-authorized` 等语义不能靠
  目录或文件名省略；
- 不使用兼容副本、旧路径壳或同步的双 canonical 正文维持可发现性。

## 4. 候选形状比较

### A. 保持根目录平铺，只改 README

优点是零迁移风险，现有链接不变。缺点是无法让物理 layout 表达 authority 与 process lifecycle
的差异；随着 bounded records 增加，读者仍需先穿过同层级的大量 review/disposition 文件。

它仍是当前安全 baseline，但不足以回应已观察到的 layout pressure。

### B. 根目录保留 authority，process records 进入 `planning/records/`

这是当前的 design candidate：

```text
planning/
  README.md                 # discovery entry
  item-ledger.md            # current cross-item authority
  roadmap.md                # long direction
  plan.md                   # pre-implementation order
  phase-1-exit-review.md    # phase exit authority
  inbox.md                  # raw capture
  inbox-history.md          # source-native processing lineage
  <other current ledgers>   # only when they own a cross-item/current relation
  records/                  # bounded review, disposition, reconciliation, applicability records
    <record>.md
```

`records/` 首先只表达“process artifact”，不提前再造 methods、domain 或 lifecycle taxonomy。
只有当某个子类出现稳定 consumer、独立 owner 和发现成本时，才另行评估 `records/<domain>/`；
不在第一次 transition 中同时引入多层目录。

### C. 按 domain 建立多层 planning 子目录

例如 `planning/workcell/`、`planning/philosophy/`、`planning/skills/`、`planning/evidence/`。
这可能改善局部浏览，但当前会同时引入 domain taxonomy、路径迁移、索引同步和新的 authority
误读风险；现有证据还不能证明这些 domain 目录应成为稳定的 owner 边界。因此暂不选作第一 wave。

当前选择：**B 作为待接受的目标形状，A 作为未迁移前的 baseline，C 保留为后续探针而非当前承诺。**

### 4.1 信息层比“根目录 / records”二分更小

第一轮 B 只解决了 process record 的发现路径，没有解决根目录内 supporting index 与 canonical
authority 混在同一信息平面的问题。结合 [`planning-information-architecture.md`](../theory/research/planning-information-architecture.md)
的 source-backed research，当前把 layout 重新表达为六层：

```text
orientation       planning/README.md
current authority planning/item-ledger.md
direction         planning/roadmap.md + planning/plan.md + phase-1-exit-review.md
intake/lineage    planning/inbox.md + planning/inbox-history.md
working indexes   planning/index/*.md
process evidence  planning/records/*.md
```

这不是六份新 authority。只有前四层中的对应 canonical source 拥有当前语义；`index/` 只提供当前工作
视图、覆盖/迁移/估计/候选导航；`records/` 只提供 bounded evidence 和 lineage。一个 index 可以引用
多个 source，但不能反向覆盖 `item-ledger`、`plan`、`roadmap` 或各 domain source。

### 4.2 第二轮 bounded transition（已执行，采用观察未闭合）

本轮从根目录移入 `planning/index/` 的 supporting files：

```text
candidate-consolidation.md
coverage-audit.md
evidence-maintenance-review.md
item-ledger-field-audit.md
item-loop-coverage-audit.md
skill-migration.md
whole-planning-work-estimate.md
whole-work-coordination-candidate.md
```

它们共同的主要使用关系是“帮助当前 planning 选择、解释或回读工作”，而不是稳定 canonical authority，
也不是一次性 process evidence。本轮只把这 8 个文件移动到 `planning/index/`，更新入口和相对链接，
不改正文 standing、owner、source、acceptance、lineage 或内容语义；不创建 `index` 下的 domain 子目录。

根目录因此只保留 7 个稳定入口/authority 文件；`index/` 保留 supporting working views；`records/`
保留 bounded process records。这个 transition 仍需 adoption review，不能从物理路径推出任何 item 完成或接受。

## 5. Authority 与生命周期映射

| artifact role | 当前/目标 authority | 当前目标位置 | 允许的组织效果 |
| --- | --- | --- | --- |
| discovery entry | `planning/README.md` | `planning/README.md` | 保持稳定入口，增加 records 路由和根目录保留清单 |
| current cross-item authority | `planning/item-ledger.md` | 根目录 | 不降级为 process record，不复制 |
| long direction | `planning/roadmap.md` | 根目录 | 不因 dated history 迁移而改变 current standing |
| pre-implementation order | `planning/plan.md` | 根目录 | 继续拥有阶段顺序与实现冻结边界 |
| phase exit | `planning/phase-1-exit-review.md` | 根目录 | 保持作为阶段出口 authority，具体 evidence 仍由 child record 拥有 |
| raw input / processing lineage | `inbox.md` / `inbox-history.md` | 根目录 | 保持低摩擦入口和 source-native lineage，不并入普通 records |
| working index | `planning/index/README.md` 与 8 个 view | `planning/index/` | 提供 scent、交叉索引和当前分析，不取得 authority |
| cross-item ledger | 由各文件当前声明拥有 | 根目录候选保留 | 只有实际拥有 current cross-item relation 的 ledger 才留在根目录 |
| bounded review/disposition/reconciliation | 对应 item/source record | `planning/records/` 候选 | 移动只改变 discovery path，不改变 semantic standing 或 acceptance |

“根目录保留清单”本身是 design proposal，不能在未接受前被当作当前 authority 清单；最终清单应由
owner decision 产生，并在 transition 前冻结。

### 5.1 当前树的最小分类（观察，不是迁移 manifest）

本轮 transition 前的分类将稳定入口、current cross-item index 与 bounded process records 分开；
transition 后的实际布局是根目录 7 个稳定入口/authority，`index/` 目录 8 个 working view 加一个
index 入口，`records/` 目录 81 个 process records 加一个 records 入口。这个分类只改善发现路径，
不从目录名推导 standing、owner 或 acceptance。

当前可直接确认的根入口是：

- `README.md`、`item-ledger.md`、`roadmap.md`、`plan.md`、`phase-1-exit-review.md`；
- `inbox.md` 与 `inbox-history.md`，分别保留 raw capture 和 source-native lineage。

以下 8 个文件现在按 supporting working index 处理，而不再与根级 authority 混列：
`candidate-consolidation.md`、`coverage-audit.md`、`evidence-maintenance-review.md`、
`item-ledger-field-audit.md`、`item-loop-coverage-audit.md`、`skill-migration.md`、
`whole-planning-work-estimate.md`、`whole-work-coordination-candidate.md`。
判断依据不是“是否很长”，而是主要 consumer 是否需要当前工作视图、是否有独立 semantic authority；当前
回读结果是它们都引用或服务根级 authority，而不取代它们。

因此第二轮按“根级 canonical / working index / process evidence”三类执行最小 transition；没有引入
domain 子目录，没有复制旧路径壳，也没有把物理位置写入 standing、owner 或 acceptance。它的设计目的
是减少“每个 supporting view 都像根级 current authority”的误读；是否长期保留仍需 adoption review。

## 6. 最小 transition 与验证

第一 wave 已按用户明确的目录整理指示执行，实际只做以下一件事：

1. 冻结根目录保留清单与待移动的 process-record manifest；
2. 将 manifest 中的 process records 各移动一次到 `planning/records/`；
3. 更新 living links、README 路由和必要的相对路径；
4. 保留每个 record 的内容、source fingerprint、review/acceptance standing 和 lineage；
5. 用旧/新路径对账和 link/read-order check 验证，不创建旧路径副本；
6. 记录 transition 的路径对账与未解决的 owner/unknown；这不是 target layout acceptance，若后续 review
   证明发现、链接或 lineage 变差，可按 manifest 回滚到 transition 前路径。

第一 wave 不做：

- 按 domain 再拆子目录；
- 改写所有 process record 的正文或 status vocabulary；
- 把 dated record 合并进 item-ledger；
- 迁移 archive、`.agents/skills/` 或 `skills/`；
- 修改 theory、WorkCell protocol 或任何 runtime/base。

第二 wave 已完成一项：将 8 个已列明的 supporting working view 移入 `planning/index/`，并更新 README、
AGENTS、current authority 引用、脚本校验和必要的相对链接。验证已通过；若采用观察发现 index 反而降低
scent、增加回读跳转或产生 authority 误读，则按 manifest 回滚，不继续增加目录层级。

## 7. Owner、consumer 与接受条件

| 关系 | 当前值 |
| --- | --- |
| primary consumer | 人类 planning reader、Main/Agent 的 planning discovery；已知但未命名具体维护者 |
| organization design owner | `unknown` |
| transition executor | 本轮由 Main 按用户明确纠正执行 bounded path transition；长期维护 owner 仍 `unknown` |
| semantic authority owner | 继续由各 canonical source 持有，不因 move 改变 |
| acceptance owner | `unknown` |

本候选不能取得长期 organization/acceptance owner。后续接受前仍需明确：谁批准 target layout、谁验收
authority/link/lineage 不变；否则保持 `design-candidate / acceptance-pending`。

建议的阶段出口是：

- owner/acceptance relation 已命名；
- 根目录保留清单和 process-record manifest 已冻结；
- 每个移动对象都有 canonical source、current item、lineage 和 rollback path；
- transition 后 README 默认读取顺序仍可回读，所有 living links 不断；
- 独立 review 确认没有新增 authority、standing、owner 或实现授权；
- 外部接受者确认 layout 解决的是 discovery/lifecycle 问题，而不是 cosmetic cleanup；
- 采用后观察窗口能确认读者发现成本下降，或能明确返回 baseline/改写候选。

## 8. 当前处置与回返

当前处置：`retain-design-candidate / classification-model-formed / wave-1-applied / wave-2-applied /
main-dogfood-observed / independent-review-complete / acceptance-pending / adoption-review-pending`。

本 candidate 的 existence 不改变 [`planning/records/artifact-organization-disposition.md`](../planning/records/artifact-organization-disposition.md)
对 archive skill 的 `no-proposal-now / route-to-design` 判断；它只是把“route-to-design”具体化为
一个待审查的 target proposal。若 owner、目标形状或 acceptance relation 不能形成，回到 baseline A，按已
保留的 manifest 回滚路径，而不是继续扩展目录层级。

回返条件：

- accepted target layout、owner 或外部契约变化；
- 新的独立 layout drift 或 discovery/authority regression；
- manifest 暴露出某类 record 有独立 lifecycle/consumer，足以支持后续 domain subdirectory；
- transition 试运行显示 link、lineage、authority 或发现成本没有改善；
- WorkCell、哲学 reading、skills migration 等 canonical source 发生会改变路径/owner 的关系。

在接受这些关系前，本文件只是一份 design candidate；当前 planning path、archive、skills placement
和所有实现冻结边界保持不变。

## 9. 采用后最小观察（2026-08-26）

本节记录一次由 Main 使用当前 worktree 完成的 bounded dogfood，不把它写成独立 reader、matched
baseline、layout acceptance 或 adoption regression。它的目的只是检验第二轮 transition 后，入口、
working index 和 current authority 的关系能否在真实 planning 读取中保持可回读。

### 实践与观察

使用同一当前 source snapshot，沿 `planning/README.md` 的默认入口分别恢复三个真实问题：

1. **当前 WorkCell standing：** 从 README 的默认顺序进入 `item-ledger` 当前快照，再进入 WorkCell
   readiness record；没有把 `planning/index/` 当成协议 authority，也没有把 readiness projection 当成
   acceptance。
2. **skills placement / migration：** 从 README 的“按目的找记录”进入 `index/skill-migration.md`，再
   回到 archive inventory / candidate record；没有把 `.agents/skills/` 误读成“尚未纠正的错放”，也没有
   把 portable `skills/` 为空读成迁移失败。
3. **下一步路由：** 从 README 的当前执行面回到 `item-ledger` 的 bounded-wave 规则和整体工作图；没有
   把 `continue`、working index 或 validator 通过误读成并行队列、完成证明或实现授权。

这次读取未观察到 broken link、current authority 误读或因 index 目录产生的额外 authority；当前路径也
能把 supporting view 与 process evidence 分开。可观察的读取包是 3–4 份文档，说明默认路线具有足够的
information scent，但这不是 wall-clock、token、质量或用户发现成本测量。

### 结果与反观察

- **实际改变：** 从“物理层混杂导致的潜在误读”收窄为“当前路线可回读，但采用收益尚未被独立验证”。
- **仍未确认：** Main 对目录和历史非常熟悉；没有盲读者、独立 Agent、旧布局的 matched baseline、
  任务完成时间、展开次数、authority 误读计数或 Todo focus-anchor 遗漏计数。因此不能宣称 layout
  adoption、discovery cost 下降或 reminder 比 repeat 更可靠。
- **最强反观察：** 即使本次 Main route 顺畅，用户或新 Agent 仍可能认为目录层级/记录数量过重；如果
  冷启动读取仍需展开大量历史，问题应回到入口 scent 或 progressive disclosure，而不是继续增加目录。

### 冻结的 matched probe 契约

在执行下一项实践前冻结以下三张 task card。两条 lane 都只读当前 worktree，不修改文件、不运行 validator、
不提交、不实现 WorkCell/DeepSeek/runtime；返回的是局部观察，不是 planning layout 的接受。Main 负责把
返回按 source standing、覆盖、未知和下一步关系接回本节与 item ledger。

| card | 要恢复的判断 | treatment 读取边界 | baseline 读取边界 |
| --- | --- | --- | --- |
| C1 | 当前 WorkCell standing、当前允许的下一步，以及未授权的动作 | 必须从 `planning/README.md` 开始，遵守 `README → current authority → 仅必要的 canonical source/record` | 不先读 README；可用普通文件搜索和文件列表自行发现来源 |
| C2 | skills placement/migration 当前 standing、是否已有 portable move 授权，以及下一步 | 同上 | 同上 |
| C3 | 当前是否可以打开新的 bounded planning wave、允许动作和 non-goals | 同上 | 同上 |

每条 lane 必须返回同一结构：`condition`、每张 card 的 `answer/source/standing/next_action/not_authorized`、
`first_files`、`authority_choices`、`unnecessary_expansion`、`authority_errors`、`next_action_choices`、
`reminder_used_or_omitted`、`unknowns`。额外记录是否真正读取了当前 Todo 的 action-local `reminder`，不能
用自我声明替代文件路径证据。

比较只观察方向性差异：首次读取文件数与顺序、是否选择正确 authority、是否展开无关 index/records、是否
选对下一步、是否遗漏当前 reminder。它不声称测得 token、wall-clock、质量或长期 adoption；如果两条 lane
的任务答案、来源或环境身份不具可比性，结果降级为 `uncertain`，不得宣称 `matched-improvement`。

### 结果（2026-08-26）

两条 lane 使用同一当前 worktree、同一模型和同一组 card 完成只读回读。treatment 报告的 planning 首读
路径为 5 个文件：`README.md → item-ledger.md → WorkCell readiness record → index/skill-migration.md
→ work-cell-protocol.md`；baseline 报告的首读路径为 9 个文件，先发现 `item-ledger.md`，随后展开了
`plan.md`、`roadmap.md`、`phase-1-exit-review.md`、skill placement/archive records 和 WorkCell source。
baseline 的第一项 `.agents/skills/agent-delegation/SKILL.md` 是该 Agent 的方法启动文件，不计作 planning
artifact；planning 路径仍比 treatment 更宽。

两条 lane 对 C1–C3 的 standing、authority、下一步和未授权动作均基本一致，且均没有 authority error。
treatment 未展开无关历史、archive 或完整 records；baseline 也未递归扫描整个目录，但多读取了当前 card
不需要的 direction/phase/placement 资料。这个结果支持有限的 `matched-read-probe-observed`：读取契约可能
减少首轮 planning 展开，而不是支持 layout 的 `matched-improvement`、token/时间收益或长期 adoption。

两条 lane 都返回 `reminder_used_or_omitted = omitted`，没有读取当前 Todo 的 action-local `reminder`。
这不是 reminder 失效的强结论，却是一个真实的设计缺口：当前 reminder 只作为可携带字段存在，没有在这组
冷读任务的 action selection 前形成可发现的当前 Todo carrier。故当前追加 `reminder-omission-observed /
reminder-reliability-unknown`，下一项实践应先让同一组 card 显式通过 Todo action 进入，再比较有/无 reminder，
不应继续靠重复全文或扩大目录来补救。

原始返回保留在本轮外部只读执行的临时输出中；本设计记录只保留可重连的 source、路径、差异、限制和
下一步，不把 Agent 自报的完成语气升级为接受。

### 独立 review 回返

只读独立 reviewer `01a03ddb-8867-70f3-b9a2-04b975cb3ea7` 返回 `ACCEPT`，接受范围仅包括：本节没有把
Main dogfood 写成 adoption/matched/acceptance/runtime 证据；当前路径计数和 standing 与 README、item
ledger、研究记录一致；记录实践、反观察、限制和下一项 cold-reader probe 足以作为 bounded return。
该 review 不接受 target layout、长期 adoption、discovery-cost 改善、reminder 可靠性或任何实现授权。
它保留的 unknown 是：没有独立 cold reader、没有旧布局 matched baseline，也没有 discovery/展开/误读/
token/时间或 reminder omission 测量。

当前处置为 `retain-design-candidate / matched-read-probe-observed / adoption-unknown /
reminder-reliability-unknown`。下一项最小实践不是继续加目录，而是复用同一组 card 和同一条 bounded
wave Todo：让 action 在执行前显式读取 `reminder + source + return`，再与同一 action 的 reminder-omitted
对照，记录 reminder 是否改变 authority、下一步、遗漏和回接。该实践不创建新目录、不改变 standing、不进入
WorkCell/DeepSeek/runtime；若 reminder 仍不被读取，则把问题回退到 Todo carrier 的形式/入口，而不是新增
周期 scheduler 或 memory registry。
