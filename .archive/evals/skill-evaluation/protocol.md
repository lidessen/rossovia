# Skill 评估协议

本文件是 [`theory/harness/iterative-improvement.md`](../../theory/harness/iterative-improvement.md)
的 workflow projection，不是第二份 theory。理论拥有对象、证据和接受关系；本协议只规定本
实验如何冻结、运行、记录和返回这些关系。执行时使用三个相互链接的载体：

- [`trial-manifest.md`](trial-manifest.md)：treatment 前的不可变 `core card` 模板；
- [`trial-ledger.md`](trial-ledger.md)：冻结后的运行、审查、处置、stale/recovery 和 rerun
  追加记录；
- [`holdout-registry.md`](holdout-registry.md)：只有 core card 启用 fresh holdout 时才建立的
  可选 sealed registry。

普通 skill 使用者只消费已内化的方法，不回读 P、theory、research 或本 protocol；维护、诊断和
再生时才沿上述链接追溯。安装、发布、权限升级、跨进程持久化及其他外部效果不在本实验的
证明范围内。

## 已冻结的历史 baseline

- Repository `HEAD`: `2e07004c31ba33361e494f10a9b35370b9cebcd9`
- 当时的工作树已经包含用户改动，因此用内容哈希标识语义来源，不把它描述为干净提交：
  - `theory/philosophy.md`: `0510374b618446899f6ecbabcbfbcfdfbf97d5281ba9ffa9418f1f0ff37af1e3`
  - `theory/gene-expression.md`: `7f390fdf339176bbc92e7427887aca9341e9187aadb819143326691f7c56079f`
  - `theory/harness/theory.md`: `f4087fa0dd09d0989b3aef1194e53049639fbaaac270b656a2cd9834f40f5db8`（仅 canonical path 迁移，正文 hash 未变）
  - `planning/plan.md`: `52a49dd9d3c2cb60fb89ecc539b2d230384b768360d14578a85bc271e8eb4ff9`
  - `AGENTS.md`: `f824b7594caac30cf4385136d2eac611272f6120a33c93203a0d3f9400b892d2`
- 初次清理后，`.agents/skills/` 下没有留下 living skill 载体。

本段是历史身份，不由新 trial 倒写。旧 manifests 和 runs 继续保留；它们不能因本协议更新而
获得新的 standing。

## Trial contract

每个 trial 只比较同一任务、来源、模型、工具、权限、harness、工作区和接受关系下的两次运行：
baseline 不加载候选载体且不发生候选激活；treatment 只额外加载该候选载体并发生一次激活。
候选输入 hash 在冻结时写入 card，baseline/treatment 的运行输出 hash 在 ledger 追加；不要将
两者混为一个 artifact。无法保持或重建匹配条件时，只报告观察到的行为，并在 ledger 记录污染或
unknown，不作 matched 归因。

作者、runner 和语义 reviewer 分离。作者自检、格式检查、路径存在、加载成功、输出更长或激活
发生，都不能替代独立 review、行为观察或接受者决定。card 冻结后，任何规则、候选、任务、来源、
reviewer、接受者或 phase applicability 的改变都开新 round；不能编辑旧 card，运行结果只能追加。

## Core card 与条件模块

运行前复制 [`trial-manifest.md`](trial-manifest.md)，填写一张对象级 core card 并记录 freeze event
与 snapshot hash。core card 一次性选择可用 phase；只需为被裁剪的 phase 记录一次理由，不得把
每个未启用模块展开成逐字段 `N/A`。下列模块只有在 card 选择 `enabled` 时才复制进该 trial 的
记录，未启用模块不出现：

- `discovery`：选择器、可见性、发现试题及选择结果；不把发现路径当作方法 outcome。
- `confirmation / fresh holdout`：冻结后的 baseline/treatment 对照和未见任务；fresh holdout
  只通过 opaque commitment 引用 [`holdout-registry.md`](holdout-registry.md)，结果锁定后才
  reveal/hash。若没有真实封存机制，registry 记录 `unknown`，不得声称 fresh 未泄漏。
- `adoption-window`：采用后窗口、任务范围、逃逸观察、负责人和停止判断。
- `ablation`：可拆组件、固定的局部对照、结果和未知；不可拆组合只能加 `combo-only` qualifier。
- `stale/recovery`：上游边、影响范围、旧快照、恢复锚点、动作、owner 和新 round/rerun。

另有一个按事件启用的可选 projection：`principal-correction`。只有本轮对象确实包含
Principal correction workflow，或冻结后实际收到改变本轮对象/standing/form 的 correction
时才启用并在 ledger 追加；没有 correction 的普通 trial 不出现，也不填写该模块。它不
把 correction 变成 baseline/treatment 的强制 phase，不要求普通 trial 复制巨型 schema。

baseline/treatment 的激活与安装边界属于 core contract；安装、发布、权限和持久化统一写为
`out-of-scope`，交给项目/runtime owner。条件模块的运行输出、哈希、污染、review 和处置不
回写 manifest，而进入 [`trial-ledger.md`](trial-ledger.md)。

## 隔离、证据与污染

card 的 upstream edge list 必须覆盖实际依赖（P、theory、protocol、skill、fixture、rubric、
任务、工具、runner、harness 及结果的关系），并区分 byte hash 与 semantic standing。ledger
追加每次匹配检查和污染事件：模型、来源、任务、权限、workspace、harness、角色、fixture/rubric、
holdout 或输出发生漂移、泄漏、结果后改写或不可重建时，记录影响、责任 owner、修复与 rerun id。
污染不解释为正面或负面效果；最少降为 `behavior-observed`，无法判断时为 `uncertain`。

development 可看结果并调参，但不能继续当 confirmation 或 fresh holdout。confirmation 要在
candidate、card、任务、来源、配置和 reviewer 冻结后运行。regression 只回答既有能力是否保留；
boundary/nearest-owner 只回答边界和交接，不替代目标 outcome。ledger 分别记录 outcome、process
和 balancing cost，不以记录量或事后总分替代它们。

## Standing 与处置

Standing 采用互不组成单一总等级的字段：

- 基础归因只能是 `format-valid`、`behavior-observed` 或 `matched-improvement`；
- 可另外附加 `boundary-supported`、`regression-supported`、`combo-only` qualifier，多个
  qualifier 可并存，也不彼此排序。

没有 `matched-improvement` 仍可记录局部的 boundary 或 regression 观察，但必须注明归因上限：
它们不能被写成候选带来的 matched improvement。`format-valid` 只证明机械格式；`behavior-observed`
只证明实际观察，不能单独证明改善。旧协议曾把 standing 写成线性序列；旧记录保留原文身份，
不得倒写。

每个 round 在 ledger 中且只能选择一个互斥 disposition：`adopt`、`adapt-and-retest`、
`retain-baseline`、`no-proposal`、`rollback`、`uncertain`。它们是证据处置，不是 runtime 状态：
`no-proposal` 是 treatment 前没有候选，`retain-baseline` 是评估后不采纳，`rollback` 是已施加
改变后的恢复，污染或接受关系未成立时用 `uncertain`。接受者仍拥有最终采用权。

## 停止、历史与返回

没有固定轮数、Agent 数、阈值或一致同意门槛。是否停止或采用只回到冻结 card 的对象级目标、
floor、边界/回归、成本和适用窗口；未启用的 phase 不得在结果后补成证据。旧 card、artifact、
run、review 和 disposition 永不倒写；新认识通过 ledger 追加事件并在需要时开新 round，保留
supersedes/stale/recovery/rerun 血统。

ledger 的返回必须让接受者重建：改了什么、两个运行看到了什么、输出和终态 hash、是否污染、
outcome/process/balancing 各观察、review 限制、基础归因与 qualifiers、互斥处置、仍未知和下一
行动。启用 `principal-correction` 时，还须能重建 raw/source revision、authority、可修订
分类、assumption delta、最小 owner、实际依赖 stale、re-evaluation、accepted disposition
与后继 round；若启用 adoption-window，应追加实际 observed/exposed set、escape、recurrence/
reopen、未复查、分子/分母和 balancing cost。没有真实暴露写 `unknown`，不得把零暴露当零复发。
文字不能创造不可变、保密、权限、telemetry 或持久效果；若真实机制未提供或无法核验，记录
`unknown`，不要以 prose 代替机制。上述指标不组成全局总分，也不设全局阈值。
