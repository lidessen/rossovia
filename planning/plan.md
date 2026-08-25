# Plan

做到这份目录为止，不开始基座实现。哲学基础 / philosophical foundations 指 `theory/philosophy.md` 及其解读，不再叫 Sequence、原则源。

上一版具体在 `archive/v0.5`。完整旧树看那个分支。活树 `archive/` 是文档暂存：先整包放进来，再 `git mv` 到目标路径后修改。还在 `archive/` 里的，就是还没迁进活位置的。

## 目标树

以下是目标形状；标有“待建”的节点当前不存在，不能因目标树出现而冒充已完成。

```text
.
├── README.md
├── LICENSE
├── AGENTS.md
├── theory/
│   ├── philosophy.md
│   ├── philosophy/
│   │   ├── P01.md …         # 按基因重写的解读（待建）
│   │   └── draft/
│   ├── harness/
│   │   ├── theory.md          # harness 理论；不是 base 实现
│   │   └── planning-inbox.md  # planning inbox 的语义边界；不是 runtime
│   └── research/
├── design/
├── planning/
│   ├── inbox.md              # 低摩擦 raw capture；不是任务或完成权威
│   ├── inbox-history.md      # 处理回执、raw 保留与 lineage；不是执行 ledger
│   ├── roadmap.md
│   └── plan.md
├── evals/                    # 评估协议、fixtures、runs、reviews、ledger
├── experiments/              # 实验性实现与原型，不放 eval 记录
├── archive/                      # v0.5 文档暂存；迁出后再改
│   ├── README.md
│   ├── principles/
│   ├── design/
│   ├── skills/
│   └── …
├── skills/                    # 仅在 portable skill 获得相称接受后出现
└── .agents/
    └── skills/
```

`design/` 只放仍约束下一版形状的文件。`.agents/skills/` 是本项目技能源；其它 harness 若还要技能目录，只链到这里，不链 `skills/`。

## 完成条件

活树保持上面的 owner 与 standing 关系；空的 `design/` / `research/` / `archive/` 子栏可以等
有文件再出现，`skills/` 也可以在没有已接受 portable skill 时为空或不存在，不为目录形状复制
`.agents/skills/`。`theory/philosophy.md` 仍是一行一条。基座代码还没开始。

## 已完成

- 冻 `archive/v0.5`
- 清掉活树上的旧目录
- 建立 `planning/roadmap.md` 和本文件
- 迁入 `theory/philosophy.md` 和 `draft/`；旧 Pxx 解读已归档，living Pxx 尚待重写
- `README.md` / `AGENTS.md` 指向哲学基础
- 把 v0.5 文档（含 skills）放进活树 `archive/`
- 哲学基础按「一」落地现行 P01–P16 哲学序列；v0.5 的 16 条与解读归档 `archive/principles/`
- 建立 skill 形成、概念形成、表达/写作、形式选择与委派 living theory，并由其生成、互评
  7 个方法 skill；普通 skill 激活不回读 P/theory
- 建立 `theory/harness/`，承载 harness、迭代改进和 planning inbox 理论；没有实现 base
- 建立 `evals/` 的评估协议、card/ledger、隔离运行与 review，并把原型实现留在
  `experiments/`
- 建立项目内 `planning-inbox` 候选 skill，完成一次真实 history-before-clear dogfood；当前
  8 个 skill 均留在 `.agents/skills/` 孵化，没有 portable 晋升

## 还要做

- 哲学序列（16 条）已落源；按基因重写 `theory/philosophy/P01.md … P16.md` 解读（旧解读在 `archive/principles/interpretations/`）。
- 后续只有在脱离本仓库事实仍有真实 consumer、边界与相称验证时，才把单个候选 move/promote
  到 `skills/`；当前 `no-proposal`，不为填目录复制正文。

从 `archive/` 解构吸收（archive 保留，活树产出重写）：

- `archive/design/harness/` 等 → 已重写为 `theory/harness/theory.md`（吸收记录 `theory/research/agent-theory-absorption.md`）
- 仍约束下一版的成形文件 → `design/`；其余留在 `archive/design/`
- `archive/principles/research/` 等 → `theory/research/`（吸收式，非搬运）
- 可移植 skills：`archive/skills/` → `skills/`（吸收式重写；先在 `.agents/skills/` 孵化并验证，再判断是否可移植）
- 本项目 skills → `.agents/skills/`
