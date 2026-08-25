# Living tree 全局审计（round 2）

**审计日期：** 2026-08-24  
**前轮：** [`living-tree-round-1.md`](living-tree-round-1.md)  
**范围：** 复核 B1、N1–N3 的最小修复，并检查 `IN-2026-08-24-001C` 对 `experiments/` / `evals/` 的分界修订。只读检查；本报告之外未修改被审文件。

## 结论摘要

- Round 1 的 B1 已关闭：当前树明确 `Pxx` readings 尚未重建，archive interpretations 不是现行 readings；`planning/plan.md` 也把它放在待做而不是已完成。
- N2 已关闭：哲学研究日志顶部现在声明现行源是 `theory/philosophy.md` 的 16 条，历史审次不得覆盖该状态。
- N3 已关闭：7 个 draft 都有 v0.5 历史术语/路径边界；残留 `Sequence` 与 archive URL 现在具有明确的历史 standing。
- N1 已部分修复：`theory/research/theory-structure.md` 顶部已把旧 `theory/harness.md` 段落标成迁移前研究快照，且文末记录了已完成迁移；仍有少数当前规则/接受标准段落引用不存在的旧路径，属于非阻塞文档陈旧项。
- `roadmap.md` 对 001C 已明确：未来实验性实现/原型属于 `experiments/`，协议、fixture、Run、review 与 evidence 属于 `evals/`；两者均未被宣称已建立。
- 本轮没有剩余 blocking 项。

## Blocking：已关闭

### B1 — Pxx readings 当前树契约不一致（已关闭）

修复后证据一致：

- `AGENTS.md:9` 现在写明 `theory/philosophy/Pxx.md` “currently absent and to be rebuilt”，并明确 archive interpretations 不是 current。
- `planning/plan.md:53` 写成“旧 Pxx 解读已归档，living Pxx 尚待重写”；`:60` 将 P01–P16 readings 保留在“还要做”。这与目标树 `:17` 的“待建”一致，不再把它们写成已经迁入。
- `theory/research/theory-structure.md:7-10` 明确现行 harness path，以及 Pxx 当前尚未重建、目标 standing 仍为 readings。
- 实际 `theory/philosophy/` 仍只有 `draft/`，没有复制 `archive/principles/interpretations/` 回 living tree。

因此当前树虽然还没有 readings，但它如实表达了“缺失且待重建”的 standing。普通 skill 激活仍不需要回读 P/theory；这不再是树契约矛盾。

## Nonblocking

### N1 — 迁移研究报告仍有少量已退休路径（残留）

`theory/research/theory-structure.md:7-10` 已提供现行状态覆盖，明确 `theory/harness/theory.md` 是 canonical path，且 `:16-23,46,79,89-109` 中的旧路径/提案属于迁移前研究快照。`:133-139` 记录了显式接受、实际迁移和最终 standing，因此这些旧段落不再构成现行 authority。

仍有两处位于当前语气段落的陈旧引用：

- `theory/research/theory-structure.md:117` 在“不要实现 base”的当前规则中仍引用 `theory/harness.md:45-57`；
- `theory/research/theory-structure.md:123` 在接受标准中仍把 `theory/harness.md` 写成待与新路径比较的路径。

**最小改法：** 将当前规则的引用改为 `theory/harness/theory.md` 对应行；把接受标准改成“已确认新路径为唯一 canonical path”，或明确它是迁移前验收条件。不要改写提案段落中用于保存历史的旧路径。

### N4 — `skills/` 仍无已晋升项，但没有形成双 canonical

`AGENTS.md:31-35` 保持“`.agents/skills/` 先孵化，验证后才进入可移植 `skills/`”的规则；当前项目 skill 仍只在 `.agents/skills/`，未发现复制到 `skills/` 的第二份正文。目录为空/不存在表示尚无已晋升项，不是缺失的实现。

**处置：** 保留现状。只有某个方法已经脱离本仓库事实可独立使用并通过相称验证时，才执行 move/promote；不要为了填目录复制 skill。

### N5 — 目标树同时展示当前形状和待建节点

`planning/plan.md:14-22,44-46` 的目标树仍画出 `P01.md … P16.md`，但注释写明“待建”，完成条件也描述整棵目标树。这是计划文档常见的目标/现状并列，不再像 Round 1 那样声称已迁入；但读者仍需结合 `:53,60` 才能判断当前缺口。

**最小改法（可选）：** 在“目标树”标题下加一句“以下是目标形状；带‘待建’者当前不存在”，无需新增目录或空文件。

## 已关闭的非阻塞项

### N2 — 哲学研究日志状态滞后（已关闭）

`theory/research/philosophy-gene-one.md:5-9` 现在明确当前源为 `theory/philosophy.md` 的 16 条，并声明中间审次的旧“当前”不得覆盖顶部状态或源文件。`Disposition: open` 仍表示研究可修订，不表示源未定。`v0.5` 旧材料也被明确排除出现行 authority。

### N3 — draft 的旧术语/历史链接边界不清（已关闭）

7 个 `theory/philosophy/draft/*.md` 均在文件顶部加入同一类边界声明：文件是未采纳的 v0.5 候选研究快照；下文 `Sequence`、P-ID、skill 路径和运行记录仅指历史语境，不取得当前条目或 skill 权威，若重开须从 `theory/philosophy.md` 与当前证据重新形成。保留历史 URL 因而不构成现行路径指引。

## 001C 的 experiments/evals 分界

`planning/roadmap.md:29-32` 已完成所需澄清：

- 受控 Agent 行为工具若形成代码、实验性实现或原型，归 `experiments/`；
- 协议、fixture、Run、review 与 evidence 归 `evals/`；
- 当前两者都尚未建立，本项不是现有评估记录、实验结论或已授权开发任务。

该投影与 `planning/inbox-history.md:135-143` 的 correction 记录一致：修订只澄清候选形式，不倒写原始 receipt，不创建实验/评估记录、实现任务、owner、priority 或 acceptance。`evals/README.md:3-8,10-15` 与 `experiments/README.md:3-8` 也支持同一 standing。

**结果：** 001C 的分界已足够清楚，无 blocking 或新增 nonblocking。

## Remaining unknown

### U1 — Pxx readings 的重建 owner、时间与是否逐条重写

当前 standing 已清楚（absent / to rebuild），但尚未指定何时、由谁、以何种 research 输入重建 `P01.md … P16.md`。这不阻塞哲学源或普通 skill 使用；重建时仍须保持 `philosophy.md` 源行不被 reading 改写。

### U2 — `theory/harness/` 是否会自然分出更多独立子理论

当前 `theory/harness/` 的文件均为理论/边界文档，仍无证据要求预建 base、runtime、adapter 或协议子目录。未来是否出现独立 owner/lifecycle 的子理论未知，暂不改变目录。

### U3 — 受控行为工具何时取得正式 owner

roadmap 只记录 candidate；未来需由真实 goal/Plan、实验 owner 与 eval owner 决定实现和证据的分离。当前没有把 `001C` 偷换成现有 Run 或已授权工程任务。

## 验证记录

- `theory/philosophy.md`：16 条符合 `P[0-9][0-9]｜句子｜属` 的源行。
- `git diff --check`：通过，无 whitespace error。
- 本轮没有复制 archive readings，也没有修改被审文件。

## Final addendum

Main 已完成 Round 2 剩余两项最小修复，复核结论如下：

- **N1 已关闭。** `theory/research/theory-structure.md:117` 的 base 规则现在引用现行 `theory/harness/theory.md:45-57`；`:119-128` 将接受标准明确标为“迁移前”历史，并说明旧 path 已不存在、条件已由文末处置满足。文件中剩余的 `theory/harness.md` 仅出现在迁移前快照、历史处置记录或“当时的 path”语境，不再作为当前入口或未解决验收条件。
- **N5 已关闭。** `planning/plan.md:9` 明确目标树中的“待建”节点当前不存在，不能冒充完成；`:39` 标明 `skills/` 仅在 portable skill 获得相称接受后出现；`:48-50` 进一步说明目标形状与当前 standing 的关系。目标树现在不会把 Pxx 或 portable skills 的缺失误报为已完成。
- `theory/harness.md` 不存在而 `theory/harness/theory.md` 存在，Pxx 仍保持明确的 absent/to-rebuild standing；哲学源仍有 16 条合法源行。

**最终状态：** Round 1 的 B1、N1、N2、N3、N5 均已关闭；当前没有发现 blocking。剩余未知仅是 Pxx 重建的 owner/时机、未来 harness 子理论是否分化，以及受控行为工具何时取得正式 owner，不影响当前 living tree 的 standing 或边界。

**追加验证：** `git diff --check` 通过。
