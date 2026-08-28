# 概念碎片式输出 experiment candidate：当前定义与处置

状态：`source-backed / candidate-definition-observed / hold / independent-review-complete / acceptance-pending`；不是
experiment Run、eval card、内部思维结论、skill、WorkCell/DeepSeek 设计或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录只把用户提出的“让 Agent 输出一个概念一个概念蹦出来，而不是完整句子”收敛为一个可观察的
experiment candidate 定义。它不接受“未经语言模块处理的原始想法”这一内部机制解释，也不因为候选
具有名称就创建实验或评估记录。

## 1. 来源、对象与用途

| 字段 | 当前值 |
| --- | --- |
| source | [`planning/inbox-history.md`](../inbox-history.md) 的 `IN-2026-08-24-001D`；[`planning/roadmap.md`](../roadmap.md) 的“概念碎片式输出实验”候选 |
| source standing | raw user hypothesis + roadmap experiment candidate；不是研究结论、实验结果或接受决定 |
| current object | 在固定任务与上下文下实际发出的外显文本，以及其中可回读的输出单元边界、顺序和任务完成关系 |
| temporary handle | `概念碎片式输出`；当前只作局部 working designation，不是已接受术语或内部状态名 |
| intended use | 未来实验 owner 判断一个 prompt/treatment 是否改变外显输出的分段形式，并检查这种变化是否损害任务完成、可理解性或其它明确约束 |
| current consumer / owner | experiment/eval consumer 未命名；实验 owner、protocol owner、输出接受 owner 均 `unknown` |

当前能成立的最小主张是：用户提出了一个关于**外显输出形式**的可研究问题。当前不能成立的主张是：
输出片段等于 Agent 的未语言化内部思维，或 prompt 能直接访问、复制或验证某种内部意识过程。

## 2. 概念边界

### 2.1 暂定候选定义

在本实验候选的局部范围内，`概念碎片式输出`暂指：

> 在同一任务和允许上下文中，外部接收到的一段输出被组织成多个有可见边界的短输出单元；每个单元
> 能在该任务范围内被识别、排序或比较，但不因此声称它是 Agent 内部未经语言处理的思想单元。

该定义保留三个承重关系：对象是外显输出；区别在于可观察的单元边界与组织方式；判断用途是比较输出
形式是否发生变化。它没有规定固定 token 数、固定字符长度、固定轮数或某种内部生成机制。

### 2.2 包含、排除与最近对照

| 探针 | 当前候选中的判断 | 最容易发生的误判 |
| --- | --- | --- |
| 包含 | 输出由若干显式分隔、可独立标记的短单元组成，且可按任务记录其顺序和是否覆盖目标 | 把“短”本身当成碎片，不检查单元是否可观察、可分辨 |
| 排除 | 普通完整句子、为了排版而分行的段落、传输层 token streaming、日志 chunk | 把任何短句、换行或流式 token 都计为概念碎片 |
| 最近对照 | bullet/list 是一种载体或排版形式；概念碎片候选要比较的是输出单元的边界与任务中的作用，不是项目符号本身 | 把列表格式直接当成实验效果 |
| 最近对照 | 多轮对话把内容分散到多次消息，是交互时序；它不自动说明单次输出的语义单元被拆分 | 把 session/turn 数量当成输出粒度 |
| 反例 | 若去掉候选名称、只给输出样本与任务关系，仍无法一致标出单元边界；或边界改变不影响任何预期判断 | 回到对象、定义或 `no-proposal`，不靠命名维护候选 |

“内部思维”“未经过语言模块处理”“统一自我”等说法在当前 source 中没有可观察定义，不能进入本候选
的 measured outcome。若未来要研究它们，必须另建对象、来源、伦理/风险、可观察替代指标和接受关系，
不能从本候选外推。

## 3. 未来 experiment candidate 的最小形状

以下是未来可冻结的 card 入口，不是当前 card 或 Run：

| 关系 | 候选内容 | 当前 standing |
| --- | --- | --- |
| baseline | 在固定任务、模型、harness、权限和 workspace 下，使用普通回答指令的外显输出 | 未冻结 |
| treatment | 只增加要求输出单元边界/分段形式的 prompt 或 skill treatment | 未冻结；具体文字不能由本记录预先授权 |
| primary observation | 单元边界是否可回读、是否满足预先定义的输出形式、是否改变任务结果或下一行动 | candidate metric；rubric 未定 |
| balancing observations | 任务覆盖、可理解性、遗漏/重复、延迟/成本等与具体用途相关的副作用 | 只在 named consumer 指定后选择 |
| negative boundary | 短句、列表、streaming token、换行和多轮消息不能仅凭形式被计入目标效果 | 当前 definition boundary |
| evidence | 冻结 card、可重建运行 identity、输出样本、独立 review 和接受关系 | 当前不存在 |

只有 primary observation 的定义能改变未来实验选择，且 baseline/treatment、变量、owner 和接受关系可
重建时，才允许把本候选转入 `experiments/` 原型或 `evals/` card/Run。实验性实现归 `experiments/`；
protocol、fixture、Run、review 和 evidence 归 `evals/`，两者不互相冒充。

## 4. 当前处置、依赖与允许范围

| 字段 | 当前值 |
| --- | --- |
| dependency | `IN-2026-08-24-001D` 的 raw hypothesis、roadmap experiment boundary、现行 eval protocol、未来 named consumer 与接受关系 |
| allowed scope | 固定外显对象、形成暂定定义、最近邻/反例、记录未来 card 需要的关系、路由给 experiment/eval owner |
| prohibited effect | 不运行 prompt/model 对照，不推断内部思维或意识，不创建 Run/验证器/评分器，不创建 skill，不修改 WorkCell protocol，不打开 DeepSeek Harness/base/runtime |
| evidence standing | `source-backed / candidate-definition-observed`；无 behavior、matched、regression、adoption 或 acceptance evidence |
| disposition | `retain-candidate / hold-no-run / no-proposal-now-for-execution` |
| stage exit | 独立复核确认对象、定义、最近邻和实验边界；这只能关闭本次 definition ambiguity，不等于实验接受或 phase completion |
| revisit | 出现 named experiment/eval consumer、固定任务与变量、可重建 runner/model/harness/workspace identity、独立 reviewer、接受 owner，或定义反例改变下一判断时重开 |

PL-12“冲突角色整合/统一自我”继续依赖本候选，但依赖的是一个已定义且可观察的 PL-11 输出对象，
不是本记录中用户对意识的解释。PL-12 仍为 `hold / dependent-experiment-candidate`，不因本记录形成而打开。

## 5. 独立 review

独立 review 的检查范围：

1. `概念碎片式输出` 是否只指外显输出对象，没有偷带内部思维或意识结论；
2. 最近邻是否足以排除短句、列表、streaming token 和多轮交互的混淆；
3. candidate definition、未来 experiment/eval 形式与当前 no-run 边界是否分开；
4. PL-12 的依赖是否保持为“先有可观察对象”，没有提前形成统一自我实验。

`Halley`（Agent `01a0389c-f0c7-7200-bca2-6ae35783bd6d`）独立只读复核并 `ACCEPT`：确认对象只涵盖外显输出
及其可见边界，短句/列表/streaming token/多轮交互等最近邻没有被偷计为目标效果；确认未来 experiment/eval
card 与当前 no-run 边界分开，PL-12 仍依赖可观察的 PL-11 前置。该 verdict 只接受 candidate-definition
bookkeeping，不取得 experiment/eval、skill、WorkCell、DeepSeek 或实现 acceptance 权。若 reviewer 发现定义
不能改变任何未来判断，处置应回到 `no-proposal-now / archive-only`，而不是继续扩写指标。
