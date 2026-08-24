# Plan

做到这份目录为止，不开始基座实现。哲学基础 / philosophical foundations 指 `theory/philosophy.md` 及其解读，不再叫 Sequence、原则源。

上一版具体在 `archive/v0.5`。完整旧树看那个分支；活树降级文档进 `archive/`。

## 目标树

```text
.
├── README.md
├── LICENSE
├── AGENTS.md
├── theory/
│   ├── philosophy.md
│   ├── philosophy/
│   │   ├── P01.md … P16.md
│   │   └── draft/
│   ├── harness/
│   └── research/
├── design/
├── planning/
│   ├── roadmap.md
│   └── plan.md
├── archive/
│   ├── README.md
│   ├── theory/
│   ├── design/
│   └── planning/
├── skills/
└── .agents/
    └── skills/
```

`design/` 只放仍约束下一版形状的文件。`.agents/skills/` 是本项目技能源；其它 harness 若还要技能目录，只链到这里，不链 `skills/`。

## 完成条件

活树就是上面这棵（空的 `design/` / `research/` / `archive/` 子栏可以等有文件再出现）。`theory/philosophy.md` 仍是一行一条。基座代码还没开始。

## 已完成

- 冻 `archive/v0.5`
- 清掉活树上的旧目录
- 建立 `planning/roadmap.md` 和本文件

## 还要做

- 迁入 `theory/philosophy.md` 和 `theory/philosophy/Pxx.md`；未采纳候选进 `draft/`
- 迁入 harness 理论到 `theory/harness/`
- 按 keep/archive 门迁仍要用的成形文件到 `design/`，其余留在归档分支或进 `archive/`
- 可移植 skills 进 `skills/`，本项目 skills 进 `.agents/skills/`
- 写 `AGENTS.md`，并让 `README.md` 指向哲学基础
