# Plan

做到这份目录为止，不开始基座实现。哲学基础 / philosophical foundations 指 `theory/philosophy.md` 及其解读，不再叫 Sequence、原则源。

上一版具体在 `archive/v0.5`。完整旧树看那个分支。活树 `archive/` 是文档暂存：先整包放进来，再 `git mv` 到目标路径后修改。还在 `archive/` 里的，就是还没迁进活位置的。

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
├── archive/                      # v0.5 文档暂存；迁出后再改
│   ├── README.md
│   ├── principles/
│   ├── design/
│   ├── skills/
│   └── …
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
- 迁入 `theory/philosophy.md`、`theory/philosophy/Pxx.md` 和 `draft/`
- `README.md` / `AGENTS.md` 指向哲学基础
- 把 v0.5 文档（含 skills）放进活树 `archive/`

## 还要做

- 哲学基础按「一」梳理基因名单（`theory/research/philosophy-gene-one.md`）。未选定前不改 `theory/philosophy.md`。

从 `archive/` 移出后再改，不要直接改暂存副本：

- `archive/design/harness/` 等 → `theory/harness/`
- 仍约束下一版的成形文件 → `design/`；其余留在 `archive/design/`
- `archive/principles/research/` 等 → `theory/research/` 或继续留在 `archive/`
- 可移植 skills：`archive/skills/` → `skills/`
- 本项目 skills → `.agents/skills/`
