---
kind: research-record
id: theory-structure
status: settled
disposition: structure-proposal-reconciled
---

# Theory 根目录结构审查

**状态：** `research / structure proposal`。本文是结构审查与迁移提案，不是 living theory、harness base、skill 载体或接受决定。

**范围：** 依据 `AGENTS.md`、`theory/philosophy.md`、`theory/gene-expression.md`、现有 living theory、`planning/plan.md`、`planning/roadmap.md` 以及 `theory/research/iterative-improvement.md`、`iteration-process-audit.md`、`skill-practice-synthesis.md`，按对象、语义 owner、生命周期和来源 standing 审查 `theory/` 根目录。没有把 archive 当作现行设计，也没有把文件数量当作分层依据。

**现行状态（取代下文提案阶段的“当前”措辞）：** `theory/harness/theory.md` 已是 harness
theory 的 canonical path，根目录旧 path 不存在；当前已形成
`theory/philosophy/P01.md … P16.md` 共 16 个 source-bound `reading-candidate`。P12/P13/P16
的初轮 reading review 已完成并完成条件性最小修订，修订后 follow-up clean、acceptance 仍 pending；其下游
strategy/practice 仍分别保持 `no-proposal-now`、`no-proposal-now` 和 `hold-cross-boundary-fixture-only`，
完整 readings 的 accepted standing 仍未完成。当前 review 记录见
[`planning/records/philosophy-p12-p13-p16-reading-review.md`](../../planning/records/philosophy-p12-p13-p16-reading-review.md)。
下文关于 `theory/harness.md` 的“当前/提议”
属于迁移前研究快照，最终处置以文末「2026-08-24 显式处置记录」为准。

## 结论

### 1. `theory/harness/` 应成为 harness 理论的命名空间，但只提议最小迁移

当前 `theory/harness.md` 的对象、owner 和生命周期已经不同于根目录的 meta-theory 与表达/概念 theory：它讨论 Agent 任务工程、Task/Run/Cell、效果边界、证据和接受关系，是哲学条目在 Agent 环境中的二→三方法／设计理论；文件自身明确它不是哲学条目、不创建运行时协议、不授权效果（`theory/harness.md:3-5,14-22`）。`planning/plan.md` 的目标树也已经预留 `theory/harness/`（`planning/plan.md:14-20`）。

因此建议接受一个**提案**：把唯一 canonical 文档从
`theory/harness.md` 移到 `theory/harness/theory.md`，保留正文和语义 owner，不复制兼容壳，不实现 harness base。目录在这里承载的是“harness 理论这一组生命周期可能扩展的命名空间”，不是把所有 Agent/skill 主题归入 harness。

这不是本轮已执行的 move。结构候选可以由迭代证据自然提出，但 `accept` 和 `move` 必须由 Main/指定人类显式决定，并记录来源、理由、接受者和时间；研究、review、载体文本和 runtime 结果都不能自动取得 living theory 或哲学序列的权威（`theory/research/iteration-process-audit.md:38-43,92-101`）。

若接受者认为当前单一文档尚不足以抵偿目录维护成本，合法处置是暂缓 move、保留现状并返回 `no-proposal`；不能以“目标树有空目录”自行创造结构。这里的推荐是与已存在的目标树、harness 的独立 owner/lifecycle 和未来分化可能相称的最小结构，不是 harness 实现许可。

### 2. `theory/philosophy.md` 必须保持理论改进源头

`theory/philosophy.md` 是哲学序列的 canonical source，保持“一行一条”；它不是普通 reference、研究摘要、skill 输入或 runtime 配置。哲学序列是条目清单本体，条目是二；理论、方法、载体和激活都不能反向取得 P 的源权威（`theory/gene-expression.md:14-26,78-92`）。

研究、运行结果、review、archive 和 skill 经验可以提供来源、反例、失败、未知或重生成触发，但不能自动改写 `philosophy.md`。要新增、删除、换序或改变一条，必须先形成来源有界的候选，再由显式的人类/指定接受关系采纳；迭代审计已经把这一方向列为必须保留的约束（`theory/research/iteration-process-audit.md:24-43,92-101`）。

### 3. Pxx 是 readings，不是普通 skill 运行依赖

`theory/philosophy/Pxx.md`（存在或按计划重建时）属于哲学条目的 readings/解读材料；它们不能改动 `philosophy.md` 的源行，也不应成为普通 skill 激活的前置阅读。P 编号可用于生成血统、维护审计、诊断和再生；方法一旦生成，普通激活应使用已内化的 skill 方法和任务自身事实源，不为执行方法回读 P/theory（`theory/gene-expression.md:78-82`；`theory/skill-formation.md:52-64,115-120`）。

“Pxx 不是运行依赖”不等于“任务不需要事实来源”：当前任务仍按任务需要读取权威事实、指令和约束。它只排除把哲学源、readings 或生成理论误当成每次运行的输入协议。

## 语义分层与最小目标树

### 分层

| 层 | 当前对象 | 语义 owner | 生命周期与 standing | 不得越权 |
|---|---|---|---|---|
| 哲学源 | `theory/philosophy.md` | 哲学序列的显式人类接受关系 | 稳定源；一行一条；改动需显式接受 | 不被 research、skill、runtime 自动写入 |
| readings | `theory/philosophy/Pxx.md`、`draft/`（按计划存在） | 对应条目解读/候选的维护者；最终受哲学源与接受关系约束 | 解释、候选或阅读材料；不是源行本身 | 不改 P 源行，不成为普通激活依赖 |
| meta-theory | `theory/gene-expression.md` | 哲学基础理论 owner | 解释“道—一—二—三—万物”、术语、P→skill 的生成关系 | 不取代 `philosophy.md`，不变成 harness base |
| harness theory | canonical `theory/harness/theory.md`；旧根路径不存在 | harness theory owner / `theory/` | 任务工程与 Agent 环境的设计理论；可被证据修订 | 不实现 base，不授权效果，不吞并所有 Agent 方法 |
| expression/concept theory | `theory/expression.md`、`theory/concept-articulation.md` | 各自 theory owner | 表达保真、形式边界、概念/定义/指称及行动检验 | 不创设对象、权限、生命周期或 runtime 保证 |
| method/skill formation theory | `theory/agent-delegation.md`、`theory/skill-formation.md` | 各自方法理论 owner | 委派贡献关系、skill 载体准入与生命周期 | 不把方法规则变成 base，不取得整体接受权 |
| research evidence | `theory/research/*.md` | 研究记录与指定 Main/人类处置 | 保存来源、病例、矛盾、未知、候选；不是 living theory | 不自动提升为 P、theory、skill 或 runtime 契约 |
| runtime/base | 当前未实现 | 未来真实机制 owner | 只有被证明必须跨提示、重启、并发或不可信调用保持的硬属性才进入 | 不由理论正文或 prompt 模拟实现 |

### 最小目标树（提案，不是本轮落地）

```text
theory/
├── philosophy.md                  # 哲学序列 canonical source；一行一条
├── philosophy/
│   ├── P01.md … P16.md            # source-bound reading candidates；不得改 source lines
│   └── draft/                     # 未采纳候选
├── gene-expression.md             # meta-theory：哲学基础、术语、生成关系
├── harness/
│   └── theory.md                  # harness theory；现 harness.md 的 canonical move 目标
├── expression.md                  # expression / form theory
├── concept-articulation.md        # concept / definition / designation theory
├── agent-delegation.md            # delegation method theory
├── skill-formation.md             # skill artifact formation/lifecycle theory
└── research/                      # research evidence；不作为运行入口
    └── *.md
```

此树只把已有语义 owner 显露出来：没有把 `agent-delegation`、`skill-formation`、工具、workflow 或项目 Agent skills 机械移入 `harness/`，也没有在 `harness/` 下预建 base、runtime、adapter 或协议目录。未来若出现多个 harness 子理论，仍需各自有对象、来源、生命周期和接受关系；没有这种关系时，继续一份 `theory.md` 即足够。

## theory 根目录现有文件处置

| 文件 | 处置 | 理由与边界 |
|---|---|---|
| `theory/philosophy.md` | **keep** | 哲学序列唯一源；保持一行一条。不得移入 `harness/`，不得由研究或 skill 自动改写。 |
| `theory/gene-expression.md` | **keep** | meta-theory；统一术语并解释 P→skill→activation→phenotype。它是所有下游理论的语义入口，不是 harness 子文档。无 rename proposal。 |
| `theory/harness.md` | **move**（提案目标 `theory/harness/theory.md`） | 对象是 harness theory，已有独立 owner/lifecycle，且计划目标树已预留 namespace。只移动 canonical source，不改正文，不实现 base，不保留第二份 root authority。 |
| `theory/expression.md` | **keep** | 一般表达与形式 theory；`form-selection`、`human-writing`、`agent-expression`、`dual-audience-expression` 的共同语义边界。形式选择不等于 harness 机制。无 rename proposal。 |
| `theory/concept-articulation.md` | **keep** | 概念形成、定义、正式 designation 与行动检验；拥有对象/概念边界，不属于 harness。无 rename proposal。 |
| `theory/skill-formation.md` | **keep** | skill 载体准入、生命周期、证据等级；属于方法/skill artifact theory。它明确区分 skill 与 runtime/base，不应随“Agent”一词搬入 harness。无 rename proposal。 |
| `theory/agent-delegation.md` | **keep** | 委派的真实贡献、拓扑、证据重连和 Main 综合；是 harness 相邻的方法理论，不拥有 child Run、并发、取消、恢复或接受权威。无 rename proposal。 |

`theory/research/` 不是 theory 根文件，但整体 **keep in research**：`iterative-improvement`、`iteration-process-audit`、`skill-practice-synthesis` 及其他记录保存 evidence standing。它们可以提出结构候选、记录 move 依赖和反例，不能因为记录了一个候选就成为 theory 或 runtime。

## 迁移依赖与必须更新的引用

以下是**接受 move 之后**的最小依赖顺序；本轮不执行：

1. Main/指定人类显式接受 `theory/harness/` namespace 和 `theory/harness/theory.md` 目标，记录 date、acceptor、理由与 proposal standing。
2. 以单一 controlled delta 移动 canonical 文件（保留内容与历史）；不得先复制新文件再让两份都像现行 source。
3. 同一 delta 更新 living references：相对链接 `harness.md` 改为 `harness/theory.md`，直接路径 `theory/harness.md` 改为 `theory/harness/theory.md`。当前需检查并更新的非 archive 文件集合为：
   - `theory/agent-delegation.md`
   - `theory/skill-formation.md`
   - `theory/research/agent-delegation.md`
   - `theory/research/agent-theory-absorption.md`
   - `theory/research/archive-skill-experience.md`
   - `theory/research/skill-formation.md`
   - `theory/research/skill-practice-synthesis.md`
   - `planning/plan.md`
   - `evals/skill-evaluation/protocol.md`
   - `evals/skill-evaluation/round-1-cross-skill-review.md`
   - `evals/skill-evaluation/round-1-meta-matched-baseline.md`
   - `evals/skill-evaluation/round-1-system-design-review.md`
4. 实验历史记录、旧 round 的 artifact/hash/路径说明不应被静默重写成“当时已经使用新路径”。若当前 protocol 需要继续运行，建立新 manifest/round 记录并保留历史 standing；内容 hash 若未变可复用，但路径与本轮迁移关系要明记。
5. 迁移后做结构验证：旧 canonical path 不再存在；新 path 可读；living `rg` 不再把旧 path 当现行引用；链接与目标树可重建；最后运行 `git diff --check`。这些检查只证明迁移的机械完整性，不证明 harness theory 或未来 base 已被接受。

`archive/` 中的 v0.5 路径和历史材料不应为了这次 move 批量改写；它们是历史来源，除非另有明确的 archive 维护任务。

## 不应发生的结构膨胀

- 不把 `theory/agent-delegation.md`、`theory/skill-formation.md` 或所有带 Agent/skill 字样的文件搬进 `harness/`；对象和 owner 已经不同。
- 不把 `theory/research/` 变成理论正文、skill runtime dependency 或第二个 source of truth。
- 不把 Pxx readings 打包进普通激活上下文；普通激活需要的是内化方法和当前任务事实源。
- 不把 harness theory 的 `Task`、`Run`、`Cell`、effect、evidence、acceptance 术语当成已经存在的实现协议。
- 不因为一个目录、更长文本、静态 review 或一次 prompt 失败就实现 base。只有跨环境稳定缺口且现有 owner 无法保持的硬属性，才足以触发后续 base 研究（`theory/harness/theory.md:45-57`；`theory/research/skill-practice-synthesis.md:40-49`）。

## 迁移前接受标准与剩余未知（历史）

本提案只有在以下关系被接受后才可变成结构变更：

- 迁移前须确认 `theory/harness/theory.md` 与当时的 `theory/harness.md` 指向同一个理论对象，
  不形成第二权威；该条件已由文末处置满足，旧 path 现已不存在；
- directory 生命周期确实服务未来 harness theory 分化，维护成本不高于继续 root 单文件；
- 所有 living 引用、实验新入口和历史 standing 的边界都能被重建；
- move 不改变哲学源、Pxx readings 的 standing，也不把 harness theory 变成普通 skill 运行依赖；
- 迁移完成后仍明确“理论改进源头是 `theory/philosophy.md`，接受与移动由显式 owner 决定”。

当前仍未知：是否会很快出现多个 harness 子理论、`theory/harness/` 是否需要 `README`/index 之外的稳定子对象、以及真实 workflow 是否证明现有理论边界无法承载某个硬属性。这些未知只影响 move 的时机与后续 namespace 形状，不授权本轮扩张。

**处置：** `theory/harness/` = `proposal: move-on-explicit-acceptance`；其他根文件 = `keep`；harness base/runtime implementation = `no-proposal`。

## 2026-08-24 显式处置记录

Main 依据用户明确提出“`theory/` 应引入 `harness/` 子目录”并要求实施计划，接受本报告的最小迁移提案。接受理由限于 harness theory 已有独立对象、owner 与生命周期，且目标树已预留该命名空间；这不授权扩大 harness 范围或实现 base。

已执行单一结构变化：canonical source 从 `theory/harness.md` 移到 `theory/harness/theory.md`，正文未改，根目录未保留兼容副本；现行 living theory、skills、research、planning、AGENTS 与当前评估协议的引用已随同更新。Round 1 历史实验记录保留当时路径，不倒写历史。机械检查确认新路径存在、旧 canonical path 不存在且 `git diff --check` 通过。

处置后的 standing：`theory/harness/` = `accepted structure`；`theory/harness/theory.md` = 原 living theory 的新 canonical path；其他根文件 = `keep`；harness base/runtime implementation = `no-proposal`。后续若新增子理论，仍须分别证明对象、owner、生命周期与净收益。
