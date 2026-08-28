# Archive Skills Inventory

状态：initial triage + two-batch candidate review + attention applicability return；不是最终 acceptance、portable move 或 archive deletion 决定。

关联：`planning/item-ledger.md` 的“archive 文档/skills 价值筛选”与当前 main planning goal。

来源：`archive/skills/*/SKILL.md`、`theory/research/agent-theory-absorption.md`、
`theory/research/archive-skill-experience.md`、`theory/research/skill-formation.md`。
第一批 review：[`planning/records/design-development-review.md`](design-development-review.md)。
第二批 review：[`planning/records/next-candidate-review.md`](next-candidate-review.md)。

## 状态归属

- 本文件只拥有 archive skill 的来源集合、初筛类别和初筛理由；它不是当前迁移队列、portable
  acceptance source，也不授权移动或删除 archive 文件。
- 当前载体和 branch 处置以 [`skill-migration.md`](../index/skill-migration.md) 的逐项登记及其 candidate
  record 为准；`candidate-next` / `candidate-later` 仅表示初筛后值得保留的方向，不能直接解释为
  “现在应迁移”。
- 当前盘点是：archive canonical source 29 个、`.agents/skills/` 实际载体 11 个、可移植
  `skills/` 0 个；没有批量迁移决定。初筛历史与当前处置冲突时，保留初筛作为 lineage，返回
  `skill-migration.md` 和对应 review record 判断当前状态。

## 处置类别

- `absorbed-current`：核心判断已经被 living theory/skill 吸收；不再把 archive 正文迁成第二份 canonical。
- `absorbed-no-independent-proposal`：有效经验已被多个现行 owner 分担，旧载体不再独立提出。
- `candidate-next`：仍可能形成独立设计/开发方法，下一步需恢复差距、consumer 和行为探针。
- `candidate-later`：方向有价值，但依赖 WorkCell、系统设计、产品环境或其他前置。
- `hold`：方向或历史价值尚在，但当前没有足够真实 consumer、owner 或 decision delta 继续推进。
- `archive-only`：当前只作为历史证据、反例或来源，不进入 living tree。
- `triage-unknown`：当前材料不足以区分以上处置。

## 初筛清单

| archive skill | 初筛处置 | 当前理由 | 下一步 |
| --- | --- | --- | --- |
| `agent-delegation` | `absorbed-current` | 已有 living `agent-delegation`，旧载体只作历史来源 | 仅在新差距/回归时重开 |
| `agent-environment` | `candidate-later` | 用户级 setup/migration 仍是独立候选；当前没有用户 source、target 或 setup request | 等 desired source/target/授权，再做 source/secret boundary review |
| `agent-tooling` | `no-proposal-now / archive-only` | 已有独立的 harness execution-surface / burden 判断和历史局部 probe，但当前没有主线 tooling consumer；详见 [`agent-tooling-disposition.md`](agent-tooling-disposition.md) | 只有 named tooling consumer、具体 task envelope 和可观察 burden/gap 出现时重开；不把 vendor flags 写成 doctrine |
| `artifact-organization` | `candidate-later` | 项目 artifact layout 的组织判断，与当前 protocol 设计相邻但非同一对象 | 需要真实结构变更案例 |
| `attention-management` | `no-proposal-now / archive-only` | 当前只观察到一次 scope 偏窄修正，没有第二个独立 drift 实例、重复失败或 attention-specific 对照；`plan`、`item-ledger`、`practice-cycle`、`agent-delegation` 与 `planning-inbox` 已拥有相邻判断 | 第二个独立 drift 实例，或现有 owner 无法区分 `switch` 与 `retain/return` 并改变下一行动时重开；不创建 living carrier |
| `code-review` | `candidate-next` | 开发生命周期中有清晰的独立 review 判断 | 选真实 diff/acceptance 案例验证边界 |
| `context-engineering` | `absorbed-no-independent-proposal` | 核心已分配给 Agent 表达、委派和 context delivery 关系；不保留旧大 skill | 新差距出现时按实际 owner 重开 |
| `disciplined-development` | `candidate-next / activation-deferred` | 证据、最小变更、测试后声明是设计开发阶段候选；独立回返见 [`disciplined-development-review.md`](disciplined-development-review.md) | 先在真实 code/design consumer 中证明不是一般项目指令或 agent-expression/form-selection 重复，再决定是否形成 carrier |
| `document-writing` | `absorbed-current` | 核心已由 living `human-writing` 承载 | 旧正文只作写作研究证据 |
| `dogfood` | `candidate-later` | Rossovia/local dogfood 依赖实际 runtime 和项目环境 | 等工作系统/consumer 明确后再 review |
| `form-guidance` | `absorbed-current` | 核心已由 living `form-selection` 承载 | 旧 matrix 只作形式研究证据 |
| `improve-agent-workflow` | `absorbed-no-independent-proposal` | 已被迭代改进和 owner 路由吸收，不再保留宽泛第二协调层 | 发现跨 surface gap 时回到 owner routing |
| `iterative-product-improvement` | `candidate-later` | 面向真实产品/UI，当前 repo experiments 不是本 planning 主线 | 有 running product 和代表性任务后再 review |
| `mechanism-design-review` | `candidate-next → project-local incubation` | 已形成 `.agents/skills/` candidate；可支撑 WorkCell/工作系统设计的机制边界审查 | 用正例、prompt/owner 足够反例、最近邻路由和 adoption/regression probe 复核；不进入 portable `skills/` |
| `model-evaluation` | `candidate-later` | 评估模型/provider/harness 的候选方法，依赖冻结 baseline 和 eval owner | 等 WorkCell contract 与 eval owner 明确 |
| `naming-and-articulation` | `absorbed-current` | 核心已由 living `concept-articulation` 承载 | 旧载体只作概念研究证据 |
| `practice-cycle` | `candidate-next` | 仅保留“观察结果改变下一实践”的窄判断；总迭代闭环由现行 theory 与各 owner 承载 | 做窄方法的正反例与最近邻 probe，不创建第二套闭环协议 |
| `principle-cultivation` | `absorbed-no-independent-proposal` | 现行哲学序列和 theory/research 已拥有原则来源与候选边界 | 仅在哲学治理出现新 gap 时重开 |
| `product-dogfood-review` | `candidate-later` | 依赖真实运行产品、浏览器和产品 owner | 当前 experiments 不取得该 standing |
| `project-cognition` | `no-proposal-now / archive-only` | 历史价值存在，但当前没有命名的 later actor、重复 consumer、重建成本或 item-ledger 之外的 decision delta；现有 planning projection 已拥有当前 standing | 只有 named later actor、真实重复重建/遗漏观察、decision delta、external verifier/retention owner 和接受关系共同出现时重开 |
| `rossovia-development` | `candidate-later` | 依赖 Rossovia runtime/consumer 和自我开发效果 | 工作系统实现后再判断 |
| `skill-engineering` | `absorbed-current` | 核心已重写为 living `skill-formation` | 旧版本只作准入/评估历史证据 |
| `strategic-advisory` | `candidate-later` | 面向阶段战略 synthesis，不应接管普通 planning 或自动 portfolio | 需要明确 Principal 和策略接受关系 |
| `structural-refactoring` | `candidate-next` | 开发阶段有明确的行为保持结构变更判断 | 需要真实代码变更与 regression evidence |
| `systems-engineering` | `candidate-later` | whole-system reliability 判断有历史边界证据，但需具体 disturbance/residual-risk consumer；不能提前倒灌 WorkCell core | 后续 DeepSeek 工作系统设计出现具体 whole behavior 后再 review |
| `task-shaping` | `candidate-later` | task envelope / direct-guarded-transform 判断有历史 provisional evidence，但需稳定 reference profile 和真实 task consumer | 等 WorkCell/system carrier 与 domain-owner handoff 条件明确 |
| `visual-design` | `candidate-later` | UI/视觉系统方法有独立领域，但不支撑当前 WorkCell 主线 | 有明确产品 consumer 后再 review |
| `visualization` | `candidate-later` | Project Lens visualization 依赖特定 host capability | 先确认 host capability 和真实 consumer |
| `work-estimation` | `candidate-next` | 设计/开发 planning 需要估算和误差边界，但不能替代战略选择 | 以当前 planning item 为低风险 probe |

## 初筛表与当前处置的关系

上表是 archive inventory 建立时的 **initial triage snapshot**，保留当时的候选集合、理由和回返方向；
它不是逐项 carrier 的 current disposition authority。后续 review 或 reconciliation 形成的新 standing，
以 [`skill-migration.md`](../index/skill-migration.md) 的逐项表、对应 candidate disposition record 和较晚的
dated projection 为准，不应把上表的 `candidate-next` 直接读取为“尚未判断”或把 `candidate-later` 读取为
“当前应迁移”。

截至 2026-08-25，容易混淆的四项 current overlay 是：

- `practice-cycle` 与 `work-estimation` 的 carrier-level 都是 `retain-incubation / adapt-and-retest`；
  当前 matched/Main-only branch 分别是 `no-proposal-now / route-to-owner` 与
  `no-proposal-now / wait-for-named-consumer-and-decision-changing-case`；
- `mechanism-design-review` 已有 `.agents/skills/` project-local incubation carrier，仍是
  `rewrite + retain-incubation`，没有 portable acceptance；
- `code-review` 与 `structural-refactoring` 的 current proposal 分别是
  `no-proposal-now / activation-deferred` 与 `no-proposal-now / implementation-gated`，仍保留
  archive candidate 生命周期，不因没有真实 code consumer 而伪造验证。
- `disciplined-development` 当前提案已由后续 review 收敛为
  `no-proposal-now / activation-deferred / retain-archive-source`；archive `candidate-next` 只保留为
  future reopen 标签。planning/design 观察不算 adopted development consumer，只有真实
  accepted-intent code/design change、重复 gap、最近邻区分和独立 review 同时出现时才重开。

这项 overlay 只修正 status locus，不改变 29 项 archive inventory、11 个 project-local carrier、`skills/`
为空的 placement decision，也不创建第二份 canonical skill 正文。若本表与后续逐项 record 冲突，应回到
较晚 record 的来源、standing、consumer/owner 和 revisit 条件重新审计，而不是按目录状态猜测迁移完成度。

## 初始批次选择（历史）

第一批不迁移正文，而推进以下 bounded contribution（review 记录见
[`design-development-review.md`](design-development-review.md)）：

1. 从 `candidate-next` 中选 `disciplined-development`、`code-review`、`structural-refactoring`、
   `mechanism-design-review`、`practice-cycle`、`project-cognition`、`work-estimation` 做
   设计开发方法候选的 source/consumer/boundary review；
2. 将 `agent-tooling`、`agent-environment`、`task-shaping`、`systems-engineering` 保留为后续
   候选，先不生成正文；`agent-tooling` 当前 branch 已另行收敛为 `no-proposal-now / archive-only`；
3. 对 `absorbed-current` 和 `absorbed-no-independent-proposal` 保持 archive-only，避免重复
   迁移和第二 canonical；
4. 对 `candidate-later` 只记录依赖和回返条件，不因目录数量产生新承诺。

第二批已完成初版 review（见 [`next-candidate-review.md`](next-candidate-review.md)）：

- `agent-tooling` 当前处置为 `no-proposal-now / archive-only`；只有 named tooling consumer、具体
  task envelope 和可观察 burden/gap 出现时，才先重开 proposal，再决定是否冻结无写入 ordinary/lean
  对照；
- `agent-environment`、`task-shaping`、`systems-engineering` 保持 `candidate-later`，分别等待
  desired source/target、reference profile/domain handoff、具体 whole-system consumer；
- 四者均不迁移、不创建 `.agents/skills/` 新载体。

## 本轮证据边界

- 当前判断主要来自历史吸收记录、archive description 和 living owner map；
- 第一批已完成 source/consumer/boundary review；`mechanism-design-review` 另已在 WorkCell 上完成
  planning-level probe 并形成项目内 candidate，但只能称 `behavior-observed`，不能写成 accepted behavior；
- 未创建 `skills/`，未移动 archive 文件，未宣称任何候选已接受；
- 进入 `.agents/skills/` 只表示 candidate-incubation；仍必须另有行为证据、独立 review 和接受关系，
  才能考虑 portable move。
- 第二批历史 action/boundary/provisional 证据不能替代当前 consumer、matched round 或
  regression-supported acceptance；其中 agent-environment 在缺少 desired source 时不能触发 setup。

## 重新打开条件

当出现真实 consumer、重复行为差距、现有 living skill 无法承载的边界、独立评估机会或 WorkCell
设计产生新的 owner 需求时，回到对应候选；若新证据显示已有 owner 足够，则记录 `absorbed` 或
`no-proposal`，不继续迁移。`hold` 项还必须先满足它自己的 named consumer 与 decision-delta
回返条件。

### 2026-08-25：attention-management applicability return

- **来源与对象：** [`archive/skills/attention-management/SKILL.md`](../../archive/skills/attention-management/SKILL.md)
  的候选判断是：在 Agent 决策边界恢复当前 governing relation；它明确不拥有 planning、delegation
  或下一实践选择。历史 H2 development probe 只提供 archive-backed execution observation；其独立
  post-run audit 判定 semantic pass 为 false positive，不能作为当前行为接受或归因证据。
- **当前 consumer 检查：** 本项目只有一次可回读的 scope correction——目标从 skills 迁移扩展到整个
  planning；它已由 [`planning/item-ledger.md`](../item-ledger.md) 记录，但没有第二个独立任务、重复失败
  或 matched baseline/treatment，因而不足以证明独立的 attention gap。
- **最近邻 owner：** 当前 scope/standing 由 `plan.md`/`item-ledger.md` 承载；结果到下一实践由
  `practice-cycle` 承载；贡献是否离开 Main 由 `agent-delegation` 承载；active-goal input、保留与回返由
  `planning-inbox` 承载。独立只读 review 确认这些相邻边界，未取得 acceptance 权。
- **处置：** `no-proposal-now / archive-only`。不创建 `.agents/skills/attention-management/`，不新增
  Run 或评估，不移动 archive；这不表示方法永久无价值，也不表示现有 owner 能保证 Agent 注意力正确。
- **回返条件：** 出现第二个独立 drift 实例，或现有 owner 无法区分 `switch` 与 `retain/return` 且该
  差异改变下一行动时，才重新做 source/consumer/boundary review。

### 2026-08-25：archive skill inventory completeness check

新增 [`archive-skill-inventory-completeness-review.md`](archive-skill-inventory-completeness-review.md)，
只读对账 `archive/skills/*/SKILL.md` 与本文件逐项表：实际 29 个载体、清单 29 个唯一条目，缺失集与
多余集均为空。该结果只支持 inventory set completeness，不支持任何 skill 的 behavior、matched、
portable、regression 或 acceptance standing。

当前处置为 `retain-inventory / no-new-migration-proposal`；不创建 carrier、不创建 `skills/`、不移动
或删除 archive。逐项 source/consumer/boundary review 与原有 `candidate-next`、`candidate-later`、
`no-proposal`、`absorbed` 处置保持不变。该检查由 `skill-formation` 方法复核其准入边界，并由
`Halley`（`01a0389c-f0c7-7200-bca2-6ae35783bd6d`）独立 `ACCEPT`；该接受只覆盖 completeness
bookkeeping，不覆盖 skill semantic、portable、move 或实现。archive 新增/删除/改名、inventory 变化
或真实 consumer 出现时 reopen。

### 2026-08-25：archive `SKILL.md` source-scope reconciliation

宽扫描 `find archive -name SKILL.md` 当前得到 76 个文件，但这不是 76 个 migration candidate：
其中 `archive/skills/*/SKILL.md` 为 29 个 canonical inventory source；`archive/evaluations/**/SKILL.md`
为 37 个历史 evaluation fixture/served material，`archive/legacy/skills/*/SKILL.md` 为 9 个 legacy
历史材料，`archive/packages/**/SKILL.md` 为 1 个 WorkCell package fixture。新增的
[`archive-skill-source-scope-reconciliation.md`](archive-skill-source-scope-reconciliation.md) 记录了该
path-class boundary。

因此 inventory 继续是 29 项；宽路径下的另外 47 个文件不自动进入 migration、carrier 或 portable
source。该 scope reconciliation 只修正 provenance 和审计命令的读取方式，不复制、移动或删除历史
文件，也不改变 29 项的逐项 disposition、11 个 project-local carrier、`skills/` placement 或实现冻结。
