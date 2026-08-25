# Agent entry

This is the incubation living tree. Do not treat `archive/v0.5` or `main` as this branch's layout.

## Sources

- 哲学基础 / philosophical foundations: `theory/philosophy.md` (one line each; do not add commentary there)
- 术语统一（全项目沿用）: `theory/gene-expression.md` 的「术语」节 — 哲学序列/philosophical sequence（清单本体）、条目/entry（一条）、极/pole、属/dimension、表达/expression、冲/clash 等
- Planned readings: `theory/philosophy/Pxx.md` — currently absent and to be rebuilt from the living 16 entries; archive interpretations are not current, and readings cannot change the source lines
- Harness theory: `theory/harness/theory.md` — design theory only; it does not implement or authorize the base
- Unadopted candidates: `theory/philosophy/draft/`
- Long direction: `planning/roadmap.md`
- Pre-implementation plan: `planning/plan.md`
- Low-friction planning capture: `planning/inbox.md` — raw input first; capture is not commitment, priority, execution, completion, or acceptance
- Inbox processing history: `planning/inbox-history.md` — source-native receipt and lineage; it is not a task queue, completion record, or acceptance source
- Evaluation artifacts: `evals/` — protocols, fixtures, runs, reviews, ledgers, and evidence standing
- Experimental implementations and prototypes: `experiments/` — not evaluation records or research conclusions

`archive/` is a v0.5 document dump. It is not current design. Move files out of it into the living path, then edit.

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
