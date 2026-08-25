# Living tree 全局审计（round 1）

**审计日期：** 2026-08-24  
**范围：** `AGENTS.md` 规定的 living tree、`theory/`、`planning/`、`evals/`、`experiments/`、`.agents/skills/` 与 `archive/` 边界。  
**方法：** 只读检查文件、目录、现行引用、standing 与目标树；未修改被审文件。文件名/目录只按普通落地问题检查，不把目录数量或单个命名问题升级为理论问题。

## 结论摘要

- `theory/philosophy.md` 当前有 16 条可识别的 `Pxx｜句子｜属` 源行，行形通过检查；现行理论和研究也把它保持为唯一理论生成源。
- `theory/harness/` 已自然承载 harness 设计理论；当前目录内是理论文档，没有发现 harness base/runtime 实现。`theory/harness/theory.md` 明确不授权 base 或运行时效果。
- `evals/`、`experiments/`、`theory/research/` 的当前 README/入口 standing 已分开；旧 `experiments/skill-evaluation/` 只作为迁移历史出现。
- 当前真正阻塞树契约的是：`AGENTS.md`、`planning/plan.md` 和目标树都约定存在 `theory/philosophy/Pxx.md` readings，但这些文件已经不在该路径，当前实际只有 `draft/`，旧 Pxx 解读位于 `archive/principles/interpretations/`。
- 另有两类非阻塞陈旧记录：结构迁移研究仍在若干段落使用已不存在的 `theory/harness.md`；未采纳 draft/研究日志保留旧 `Sequence` 术语和历史链接。这些不应被当作现行 authority，但应在后续审计轮修正或明确标注。

## Blocking

### B1 — Pxx readings 的当前树契约与实际树不一致

**证据：**

- `AGENTS.md:9` 把 `theory/philosophy/Pxx.md` 列为 Readings，并规定它们不能改变源行。
- `planning/plan.md:17,53,60` 把 `theory/philosophy/P01.md … P16.md` 放入目标树、写成已经迁入，又列为待按基因重写。
- `theory/research/theory-structure.md:26-30,38-40,52-54` 仍按该路径定义 readings standing。
- 实际 `theory/philosophy/` 当前只有 `draft/`；`theory/philosophy/P01.md` 与 `P16.md` 均不存在。旧解读在 `archive/principles/interpretations/`，这是历史位置。

**影响：** 当前哲学源本身仍可读，普通 skill 激活也不应回读 P/theory；但“源行—readings—生成/审计”的承诺无法从当前树重建，且 `plan` 的完成/待办状态互相矛盾。这是树契约阻塞，不是 harness base 阻塞。

**最小改法（二选一，需明确 owner）：**

1. 按现行 16 条源行重建 `theory/philosophy/P01.md … P16.md`，每份只做对应 reading，保留“不得修改 `philosophy.md` 源行、普通激活不回读”的边界；或
2. 若 readings 有意延期，则同步修改 `AGENTS.md`、`planning/plan.md`、`theory/research/theory-structure.md`，明确“当前缺失、按计划重建”，不要再写成已迁入/当前存在。

在 owner 明确前，不应把 archive 中的旧 Pxx 解读直接当作现行 readings，也不应让普通 skill 使用者承担回读 P/theory 的依赖。

## Nonblocking

### N1 — harness 结构研究记录保留迁移前路径

`theory/research/theory-structure.md:11,13-16,41,74,88,112,118` 仍以 `theory/harness.md` 作为当前/提议路径；同一文件 `:128-134` 已记录迁移完成，实际 canonical 文件是 `theory/harness/theory.md`。这是研究记录内部的时间层混写，且部分代码引用目标不存在，但不构成现行理论第二权威。

**最小改法：** 在旧段落上加“迁移前快照”标记，并在当前处置段提供唯一现行链接；将仍表示当前约束的 `theory/harness.md:45-57` 改为 `theory/harness/theory.md:...`。保留历史事实，不静默改写旧评估记录。

### N2 — 哲学序列研究日志的状态滞后

`theory/research/philosophy-gene-one.md:5` 写“十五环节新序列已落源”，而 `:341-344,396` 又写 `theory/philosophy.md` 仍是旧十六条；当前实际源文件是 16 条，且与该日志多个阶段的草稿不同。该文件自身声明 `Disposition: open`，属于研究账本，不是源权威，因此暂不阻塞普通使用。

**最小改法：** 在文件末尾追加一条带日期的 superseding status，明确哪些段落是历史审查快照、当前源以 `theory/philosophy.md` 为准；不要回写历史段落，也不要让研究记录改动源行。

### N3 — 未采纳 draft 与研究记录保留旧术语/历史链接

以下内容属于未采纳候选或历史证据，保留 `archive/v0.5` URL 作为来源本身是合理的，但仍可能让读者误认现行术语：

- `theory/philosophy/draft/bounded-autonomy.md:6,8,39,109,124`
- `theory/philosophy/draft/controlled-exploration.md:15,81,93`
- `theory/philosophy/draft/divide-and-conquer.md:5,68,79`
- `theory/philosophy/draft/parsimony-decision-delta.md:53,57,81,87,90`
- `theory/philosophy/draft/seeded-regeneration.md:78,85,104,106,114,118`
- 历史来源性更明确的 `theory/research/archive-skill-experience.md:9,29,73,206`、`theory/research/philosophy-gene-one.md:12,306,331`。

**最小改法：** 对 draft 加“未采纳/历史术语”说明；凡描述当前源的文字改为“哲学序列”，历史 URL 和引用内容保留。无需为了术语整批重写 archive。

### N4 — `skills/` 尚无可移植 skill，但没有形成双 canonical

当前 `skills/` 目录不存在，8 个 living skill 都在 `.agents/skills/`。这符合 `AGENTS.md:28-32` 的“先在项目入口孵化，经过相称验证再晋升”规则；`planning/plan.md:37-42` 的目标树把两处都预留，但不要求此刻已有 portable skill。

**最小改法：** 暂不为填目录而复制 skill。待某个 skill 脱离本仓库事实仍有独立使用边界且验证相称时，执行一次 move/promote，并保持单一 canonical 正文；在此之前可在 plan/roadmap 记录“暂无已晋升项”，避免把空目录误报为遗漏。

## Unknown / 需后续确认

### U1 — Pxx 缺失是有意延期还是迁移遗漏

git 状态显示原 `theory/philosophy/P01.md … P16.md` 迁移到了 `archive/principles/interpretations/`，但仅凭当前文件无法判断这是用户已接受的“暂不重建”，还是未完成的 living migration。需要 Main/人类明确选择 B1 的两种最小改法。

### U2 — 未来 harness 是否需要更多子理论

当前 `theory/harness/` 有 `theory.md`、`iterative-improvement.md`、`planning-inbox.md`，均为理论/方法边界文档。没有证据要求在此预建 `base/`、`runtime/`、`adapter/` 或协议目录；未来是否出现独立 owner/lifecycle 的子理论仍未知。现阶段保持目录克制即可。

### U3 — 历史 generated 产物的完整来源链不充分

`evals/README.md:14-15` 已明确 `evals/kb-representation-evaluation/` 与 `evals/human-agent-visualization/` 只有历史 generated 产物、缺少完整 protocol，文件存在不提升证据 standing。它们不应被当作当前 eval 结论；若未来要复用，需重新建立 fixture、protocol、run identity 和 review，而不是从 generated 文件推断有效性。

## 已通过的边界检查

### 哲学源是改进源头

`theory/philosophy.md` 共有 16 个符合 `P[0-9][0-9]｜句子｜属` 的条目行，没有发现把 commentary 塞进源条目的情况。`theory/harness/iterative-improvement.md:3`、`theory/research/iteration-process-audit.md:28-31`、`theory/research/skill-practice-synthesis.md:11,17-18` 都把它保持为理论生成/修订源，研究、skill 和评估只能提供反例、证据或触发重新形成，不能自动取得源权威。

### harness theory 与 base implementation 边界

`theory/harness/theory.md:3-5,24-40` 明确该文件是设计理论、不是哲学条目、不是运行时协议，且用 ownership test 区分方法表达与 base。`theory/harness/` 当前仅见 Markdown 理论文件；`planning/plan.md:3,46` 也明确本阶段不开始基座实现。目录结构因此是“理论承载”而非“实现已存在”。

### research / evals / experiments standing

`evals/README.md:3-8` 把 protocol、fixture、run、review、ledger 与 evidence standing 归入 `evals/`，把调查归入 `theory/research/`，把实现/原型归入 `experiments/`；`experiments/README.md:3-8` 作了相同反向边界。`evals/README.md:10-12` 对从旧 `experiments/skill-evaluation/` 的迁移保留历史事实，不把旧路径倒写成当前入口。

### archive 边界

`archive/README.md:3-5,13-24` 明确 archive 是 v0.5 文档暂存、没有事实 authority，剩余内容待迁移或作为证据；当前 living 文件对 archive 的引用主要是研究来源或历史反例。没有发现把 archive 目录直接当作当前 design/skill/runtime 入口的有效主张。

### skills 位置

项目发现入口是 `.agents/skills/`；可移植 `skills/` 只在验证后晋升。当前 8 个 skill 均只有一个 living 正文位置，未发现 `.agents/skills/` 与 `skills/` 的复制双权威。该项是“暂无晋升项”，不是结构错误。

## 验证记录

- `git diff --check`：通过，无 whitespace error。
- 本报告不改变 `theory/philosophy.md`、`theory/harness/`、`planning/` 或其它被审文件。

