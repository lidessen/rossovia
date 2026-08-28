# Agent entry

This is the incubation living tree. Do not treat `archive/v0.5` or `main` as this branch's layout.

## Sources

- 哲学基础 / philosophical foundations: `theory/philosophy.md` (one line each; do not add commentary there)
- 术语统一（全项目沿用）: `theory/gene-expression.md` 的「术语」节 — 哲学序列/philosophical sequence（清单本体）、条目/entry（一条）、极/pole、属/dimension、表达/expression、冲/clash 等
- Planned readings: `theory/philosophy/Pxx.md` — the current tree has source-bound `reading-candidate` files for all 16 living entries; none is accepted as a source or living theory, archive interpretations are not current, and readings cannot change the source lines
- Harness theory: `theory/harness/theory.md` — design theory only; it does not implement or authorize the base
- Unadopted candidates: `theory/philosophy/draft/`
- Long direction: `planning/roadmap.md`
- Pre-implementation plan: `planning/plan.md`
- Current planning working indexes: `planning/index/` — navigation and bounded analysis views, not a second authority
- Low-friction planning capture: `planning/inbox.md` — raw input first; capture is not commitment, priority, execution, completion, or acceptance
- Inbox processing history: `planning/inbox-history.md` — source-native receipt and lineage; it is not a task queue, completion record, or acceptance source
- Bounded planning process evidence: `planning/records/` — review/disposition/lineage records; it is not a second current ledger
- Evaluation artifacts: `evals/` — protocols, fixtures, runs, reviews, ledgers, and evidence standing
- Experimental implementations and prototypes: `experiments/` — not evaluation records or research conclusions

`archive/` is a v0.5 historical source, not current design. A material moves only after its current planning
item has a source/consumer/boundary review and an explicit move disposition; `archive-only`, `absorbed`,
evaluation, legacy and package-fixture materials remain historical. When a move is authorized, move the
material into the living path before editing it; mere presence in `archive/` is not a migration commitment.

`theory/research/` records investigation, sources, inference, contradiction, and unknowns. A research candidate, an experiment/evaluation candidate, and an actual run/evidence record have different standing; do not use one as another.

## Names

Do not call the source Sequence, 原则源, or `principles/SEQUENCE.md`. That path exists only on `archive/v0.5` and as a historical copy that has already left `archive/`. 现行清单名是「哲学序列 / philosophical sequence」（见 `theory/gene-expression.md` 术语节），与 v0.5 的 Sequence 无关。

## Skill documents

Living skill 的目录名和 frontmatter `name` 使用稳定的英文机器标识；`description` 与 `SKILL.md` 正文先用中文，便于现阶段的人类 review。研究记录可以保留来源语言。

## Skill locations

- `.agents/skills/` 是本项目的可发现入口：放仍在孵化的载体，以及依赖本仓库路径、项目 authority 或工作约定的项目 skill。
- `skills/` 只放经过相称验证、脱离本仓库事实仍可独立使用的可移植 skill；当前先在 `.agents/skills/` 孵化，再判断是否晋升。
- 同一方法不得在两处复制成两个 canonical 正文。若通用方法与项目 adapter 都有真实独立边界，分别命名并声明依赖；否则用 move、明确引用或删除旧载体保持单一权威。

## Implementation boundary

Living harness theory and incubating project skills may exist under `theory/` and `.agents/skills/`. Historical design and skills under `archive/` are not current design. Do not implement the harness base on this branch.

## Current project bootstrap and next-generation seed

- 当前优先级：用当前项目孵化下一代项目开发种子；入口见 [`bootstrap/AGENTS.md`](bootstrap/AGENTS.md)，设计见 [`design/project-bootstrap.md`](design/project-bootstrap.md)。上一版 workflow 只是设计前综合稿，WorkCell 暂停，设计和实现都不推进。
- 先记录用户表达，再恢复问题、场景、authority、复杂度、允许效果和未知；不等待“正式文档”才开始实践。
- 多步骤/多任务必须由 Plan/Todo/work map 驱动；简单低风险动作可直接做，中高复杂度先做问题分析、工具准备和回退设计。
- Main 保留整体、source、跨贡献约束、fan-in、checkpoint 和最终接受关系；sub-agent 只承接来源有界、可独立返回的贡献。
- 只有真实独立贡献值得并行；共享写面或真实依赖时顺序处理。实践后检查 decision delta、未知、成本和应删除/降级的内容。
- bootstrap 是旧项目 authority、经验、工具和失败路径向下一代开发入口与 skills 的受控转译面；它不是角色组建资料目录、第二 authority 或第二套 plan/ledger。
- [`AGENTS.md`](AGENTS.md) 只保留本摘要；启动条件见 [`planning/transition-package.md`](planning/transition-package.md)，bootstrap seed 入口见 [`bootstrap/AGENTS.md`](bootstrap/AGENTS.md)，bootstrap 设计见 [`design/project-bootstrap.md`](design/project-bootstrap.md)，工作流设计前综合稿见 [`design/harness-workflow.md`](design/harness-workflow.md)。孵化历史按明确 lineage 保留归档。
