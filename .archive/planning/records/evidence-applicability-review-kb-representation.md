# kb-representation generated artifact applicability review

状态：`historical-only / hold / archive-only / no-proposal-now / acceptance-pending`；本记录不是
当前 eval、Run、experiment 结论、skill acceptance、WorkCell acceptance 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象与 bounded practice

本次只审查一个历史 generated artifact：

`evals/kb-representation-evaluation/generated/recall-v1/activation.png`

它是 1600×1340 的 PNG，当前文件 SHA-256 为
`5e67958683d8d63090d65c56fd0259c80e1742257645fad0afc32dcd50db624e`，由 git 在历史提交
`97106e0473ebad8105f99d084ca31ea47b92451c` 中作为二进制文件记录。图面标题为
“Shilu associative recall · candidate source activation”，并展示若干 source/activation 节点和
关系线；这只是 artifact 内容观察，不证明图中的 source、关系或“activation”语义当前成立。

历史 git 对象中另有一条旧的实验链：`d3676ba` 在
`experiments/kb-representation-evaluation/fixtures/recall-v1/` 保存过 manifest、12 个
`SHILU-S01`–`S12` source、生成脚本和 fixture；`fb79857` 保存过该实验的 inputs、sessions、
evidence、REPORT 和 development probe 结果。旧 fixture 的 `activation.png` SHA-256 为
`e9392541a1fcae5403e47857f40d3c247322e253a0d59272d2861cbe7581711d`、git blob size 为
291052 bytes，与当前 generated PNG 的 digest 不同。因此历史实验链是可观察的历史来源，
但当前 PNG 是否由同一 fixture、同一脚本和同一输入生成，仍是 exact lineage unknown。

本次实践的目标是判断：这个 artifact 是否能被当前 planning/evidence 链直接适用，是否需要
补 card/Run，还是只能保留历史图并关闭当前重开提案。允许范围是只读检查文件、git provenance、
同目录对象和 living tree 中可回读的 source/consumer 线索；不修改 PNG，不修复旧 sourceRef，
不创建 Run，不运行模型或实验。

## 2. 来源与观察

### 当前可回读的事实

- 当前 living `evals/kb-representation-evaluation/generated/` 只有四个 generated PNG：
  `image-diagnostic/{sparse,medium,dense}/graph.png` 与本次对象；其中
  `generated/recall-v1/` 只有本次一个 PNG。当前路径下没有 README、protocol、manifest、task
  fixture、source snapshot、review 或 acceptance record。
- 历史 git 对象中确实存在旧实验的 README、manifest、fixture、生成/评分脚本、inputs、sessions
  与 report；这些文件属于历史 `experiments/kb-representation-evaluation/` 路径，不是当前
  `evals/.../generated/` 的 living source。历史 report 将该实验保持为 `probe`，并明确 development
  signal、引用合同 defect、重复/held-out 验证不足和未取得采用结论。
- 在 living tree（排除该 generated 目录和 archive）中，没有找到 `SHILU`、`associative recall`、
  `candidate source activation` 或 `S01`–`S11` 的对应 source/consumer 文档。这个搜索只支持本次
  bounded absence observation，不声称整个仓库或外部环境不存在相关材料。
- 当前 `planning/index/evidence-maintenance-review.md` 与 `coverage-audit.md` 已把该目录归入
  generated-only / incomplete historical eval；本记录补上这个具体对象的 applicability check，
  不改变其历史身份。

### 未能恢复的关系

| 关系 | 当前 standing | 为什么不能进入 current evidence |
| --- | --- | --- |
| canonical source / source snapshot | historical source chain observed; current exact linkage unknown | 旧实验 manifest 记录了 Shilu source commit 和 source IDs，但当前 PNG 未证明由该链生成 |
| hypothesis / target outcome | historical `probe` only; current applicability unknown | 旧 README/report 有 recall hypothesis 和 target，但不能自动转移给当前 PNG |
| task / fixture / baseline | historical fixture observed; current artifact linkage unknown | 旧 fixture、questions、inputs 和 scorer 存在于历史 commit，当前 generated path 没有对应 card |
| consumer / owner | current consumer/owner unknown | 历史实验有研究对象，但没有当前 living consumer、evidence owner 或 acceptance owner |
| Run / runner / model / workspace | historical Run evidence observed; current artifact linkage unknown | 旧 report/evidence 记录过执行画像，但不能证明它对应当前 PNG 或当前 planning consumer |
| independent review / acceptance | historical probe report; current acceptance absent | 历史 report 仍是 development probe，当前没有 acceptance、adoption 或 regression decision |

因此，图的存在和可视化内容不能支持当前 `current-applicable`、`matched-improvement`、
`regression-supported`、系统设计或实现主张。历史 report 的 `probe` / development signal
只保留在历史实验链上，不提升当前 PNG 的 standing。

## 3. Practice-cycle 处置

当前活矛盾不是“图是否值得修好”，而是没有任何可回读关系能说明修图或重跑会改变当前
planning 决定。最小处置是：

- `settle` 当前 applicability check：该对象在当前 living evidence 链中保持 `historical-only /
  hold / archive-only`；历史实验链单独保留为 `historical probe`，不倒写为当前适用；
- `route` 未来若出现真实 source、hypothesis、consumer 和 evidence owner，再由 evidence/eval
  owner 决定是否新建 card；
- 不把 `no-proposal-now` 解释成删除 artifact、否定历史生成或禁止未来重开；它只关闭当前
  generated-only 对象与 living planning 的重接、重跑/修补提案，不关闭历史实验本身的回读。

## 4. 若未来重开所需的最小入口

只有下列关系能够一起恢复时，才进入新的 applicability review 或 eval round：

1. 先完成 lineage reconciliation：确认当前 PNG 与历史 fixture 的生成脚本、输入 source、布局/
   渲染条件和 content hash 关系；若不能确认，就按新 artifact 处理，不继承旧 evidence；
2. named source 与 immutable snapshot/digest；
3. 可观察 hypothesis、target outcome 和反例；
4. task/fixture、baseline、controlled semantic delta 和允许效果；
5. named consumer、evidence owner 与 independent reviewer；acceptance owner 可以暂时 unknown，
   但必须显式保持 `acceptance-pending`；
6. model/harness/runner/workspace identity、输出 capture 和 current protocol card；
7. 由新 card 产生的新 Run、独立 review 和 disposition，不倒写该历史 PNG。

如果只能找到图的 source 或作者，却不能恢复 target outcome、consumer 和接受关系，仍保持
`historical-only / hold`，不因为 provenance 变得更完整就升格为 evidence。

## 5. 阶段与授权影响

- 不改变 `evals/` 与 `experiments/` 的对象边界：generated artifact 仍不是 Run 或 experiment
  conclusion。
- 不改变任何 skill 的 standing、portable move 或 A4 的 owner-return。
- 不改变 WorkCell design candidate、DeepSeek Harness system candidate、base/runtime 或用户
  harness 构想的冻结；本记录不产生 adapter、executor、queue、registry、runtime 或实现授权。
- 当前 planning 的 evidence-maintenance 支线获得一个已逐项检查的 bounded object；该对象不再
  作为“尚未检查的历史目录”重复进入下一轮候选选择。

## 6. Evidence standing 与复核边界

- 本记录的 mechanical observations：文件类型、尺寸、digest、git provenance、目录成员和
  bounded living-tree search。
- 本记录的 semantic disposition：`historical-only / hold / archive-only / no-proposal-now`，
  基于缺失的 source/consumer/card/Run/review/acceptance 关系；不是 artifact 本身的效果判断。
- 当前 evidence standing：`historical-chain-observed / current-applicability-unknown /
  applicability-reviewed / independent-review-pending / acceptance-pending`。
- 独立 reviewer 应检查：对象范围是否没有偷偷扩大、图内容是否没有被写成结论、bounded absence
  是否被过度表述、future reopen entry criteria 是否完整，以及实现冻结是否保持。
- 下一 return：若无新的 source/hypothesis/consumer/owner 或 lineage reconciliation 证据，不再
  重复检查或重跑；若这些关系出现，先决定是接回历史链还是按新 artifact 新建 card/Run lineage，
  保留本记录和当前 PNG 不变。
