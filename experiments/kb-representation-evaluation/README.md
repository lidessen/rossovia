# KB representation evaluation

这个实验研究关系图在 Agent 记忆系统中的两种不同角色：承载事实，或触发联想召回。
实际目标是后者。recall 时，系统针对当前问题生成或选取一张带 source ID／路径的联想
激活图；Agent 从中找到可能相关的原始记忆，再打开来源、核对证据并形成引用。图可以是
有损投影；事实权始终属于原始记忆和证据。

因此验收重点不是完整恢复每一条边，而是相关来源能否进入有限候选集，以及 Agent 回源后
能否正确引用。图中的误报主要消耗阅读预算，漏掉关键来源则直接造成 recall 失败。

第一轮没有执行端到端 recall 链路，也没有给文本条件配搜索工具；当时的文本只是完整附件
控制组。第二轮执行了单次
`activation graph/search → selected source → proposition + citation` development probe。
第三轮 v2 修正引用合同后，先用旧题做一次 development treatment，再用 4 个新题各重复
两次 question-held-out confirmation。它仍不能形成跨语料、跨图或跨模型结论。

当前状态是 `probe`。第一轮先回答一个较低层的问题：Agent 能否恢复图片里的
复杂连线？`fixtures/image-diagnostic/` 固定相同的 15 个节点与布局，把边数从 13、22
增加到 34；每档用 8 个机械题检查边存在、方向、负例、关系标签、四段关系链、出边集合
和入度。它用于发现视觉读取边界，不再充当 recall 方案的否决门槛。

第一轮实测已经完成，结论和证据边界见[实验报告](./REPORT.md)：完整文本控制组为
72/72，完整图像从 sparse 的 24/24 降到 dense 的 18/24，错误集中在复杂相邻边的
完备枚举；局部边、关系标签和四跳路径保持正确。这组信号足以继续测试联想召回，但尚未
证明它能达到可用的 source hit 或最终引用成功率。

第二轮 development probe 已冻结在 `fixtures/recall-v1/` 并完成一次执行。它取自
Shilu commit `1cac9bbf3e2e10bfdb3178838fefc406236b652e` 的 12 个来源片段，用 6 个不暴露
source ID／路径的场景化合成问题比较两个完整画像：

- image：先以不读取 evaluator gold 的固定 BM25 policy 从语料派生概念—来源关系，再为
  每个 query 激活 3 个概念并生成有损子图，Agent 从中选择最多 5 个来源；
- search：确定性 BM25 先返回只含 ID 和中性标题的 top-5，Agent 再选择最多 5 个来源。

两者随后都启动全新 session，只附加被选中的来源片段，再回答并给出 source ID 和精确
anchor。路由 artifact 不会进入回答 session；每个阶段使用独立 cwd，其中只复制本阶段
附件和 `permission: deny` 的 worker 配置。预冻结指标包括
source recall@1/@3/@5、MRR、全部必要来源命中、逐 claim 的互斥 proposition key、引用
precision／coverage、grounded success、打开来源数、来源字节、时延与观测成本。严格 schema
不允许再附加可能自相矛盾的自由文本；它提高机械可判定性，但仍不等于开放式语义评审。
本轮两个画像都由 query 驱动，但图还多了一层概念扩展和视觉布局，
因此结果只能归因于两个整体画像，不能归因于裸“图片 vs 文本”。

第二轮 6 组配对问题的主要路由结果如下：image/search 的 source recall@3 分别为
0.833/0.750，recall@5 为 0.917/0.833，MRR 为 0.783/0.639；image 在 Q2、Q4 的
recall@5 更高，search 在 Q3 更高，其余三题持平。image route 总时延 168.3 秒、观测成本
$0.08488，search route 为 103.6 秒、$0.07640。单次小样本只说明联想图值得继续测试，
没有证明它优于搜索。

预注册 scorer 的 grounded success 两边都为 0，但不能解释成 12 次回答均未回源：11 个可
解析 answer 的 22/22 proposition key 均正确；image 的 aggregate accuracy 之所以只有
0.833，是因为 Q2 的整个两-claim JSON 格式错误、无法解析。主要问题是 worker 把 source packet 中的
`path#anchor (blob ...)`、单独 anchor 和组合 anchor 混合返回，而 scorer 只接受一个 exact
anchor 字符串；另有多次把相关但不在该 claim 预注册 allowlist 的来源一并引用。这些
citation failure 既包含非穷尽 allowlist 造成的 false negative，也包含真正非该 claim 的
过度引用。原始分数保持不改；下一版应提供独立、不可变的 `anchorId`，把“允许支持来源”和
“必要 evidence group”分开，并继续分别计算 citation precision 与 coverage。

第三轮 v2 已执行完成。它与 v1 并列，不重算或改写既有证据：每个可引用 passage 使用不从
path、heading 或正文派生的 opaque `anchorId`；evaluator 分别保存 retrieval relevance、
claim 的 allowed support 和 required evidence groups；worker 只看到问题的互斥选项，以及
打开来源中的 `sourceId + anchorId + passage`。真实但冗余的补充引用不降低 precision；
coverage 只由必要 evidence group 是否满足决定。

旧 Q1–Q6 的一次 development treatment 中，两个条件合计 24/24 proposition key 正确，
grounded success 均为 4/6；合同没有再出现 parse、unknown-anchor 或 tool-protocol failure，
因此按预注册 gate 进入确认。4 个新题各重复两次的 confirmation 结果为：

| 条件 | recall@3 | recall@5 | MRR | answer | citation precision / coverage | grounded |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| image graph | 0.688 | 0.938 | 0.671 | 16/16 | 0.810 / 0.944 | 5/8 |
| BM25 search | 0.875 | 1.000 | 0.917 | 16/16 | 1.000 / 0.889 | 6/8 |

这组确认不支持“图优于搜索”：search 的检索排序和最终 grounded success 都更高；image
在一个问题上两次出现不同形式的支持遗漏或过度引用，在另一题的一次 repetition 中增加了
同来源错误 anchor。search 也不是端到端全通过：一个题两次都在正确路由和正确答案后，
没有把已用于前一 claim 的 operation-order passage 同时绑定到后一 claim，说明 claim-local
evidence use 是独立于 retrieval 的失败层。两轮 v2 实际观测成本
合计 `$0.73914756`（development `$0.30989986`，confirmation `$0.42924770`）。

确认题仍复用同一批 12 个 passage、概念图和模型路线，最多是 question/proposition-level
holdout 加两次重复；它不是 held-out corpus/graph，也不是跨模型泛化。图像画像目前只能
保留为可进一步研究的 alternate/hybrid recall 候选，不能取代这个 fixture 上更稳的搜索基线。
完整解释与逐题失败见[实验报告](./REPORT.md)。

仓库还保留了一个未执行的综合轮候选 fixture：固定 15 个节点、22 条边和 7 个机械评分
问题，覆盖直接查找、多跳路径和全局拓扑。`fixtures/round1/graph.txt` 与 `graph.svg`
来自同一个
[`src/fixture.js`](./src/fixture.js)；节点 ID、中文标签和关系完全一致。图像布局是图表示
的组成部分，因此结论只能归因于完整的“文本关系附件”与“渲染关系图附件”画像，不能
归因于裸模态。当前 `probe:image` 和 `probe:text` 不运行这个候选 fixture，它也不支持
本轮报告中的实测结论。

## 构建与验证

```sh
bun run build
bun run render
bun run render:recall:v2
bun test
bun run check
```

需要 PNG 输入时，用 Chrome/Chromium 从受控 SVG 生成本地投影：

```sh
bun run render
```

脚本默认查找 macOS 上的 Chrome/Chromium；其他安装位置通过 `KB_PROBE_CHROME` 指定。
`render:recall:v2` 只重建 v2 的 PNG，不改写 v1 输入。

`generated/` 与 `runs/` 被忽略；正式研究记录必须保留所用 SVG、PNG hash、执行画像、
任务顺序、原始回答、机械评分、wall-clock 观察和可获得的 usage。若执行环境不能提供
精确 token/计费，只能记录输入字节与基于官方规则的成本估算，并保持 `probe`，不能
伪装成实测账单。

## Worker packet

当前 probe 每次只给 Agent 一个表示，并使用
`image-diagnostic/{sparse,medium,dense}` 对应的 `questions.json`：

- text condition：只附加 `fixtures/image-diagnostic/<tier>/graph.txt`；
- image condition：只附加由同档 `graph.svg` 生成并校验 hash 的 PNG；
- 两者都按 `[{"id":"...","answer":"..."}]` 返回，不展示 answer key；
- 每个档位在每个 condition 下运行三次，两个 condition 使用相同的预注册档位顺序；
  失败与超时同样保留。

在已授权实际模型调用与费用后运行匹配画像：

```sh
bun run probe:image
bun run probe:text
```

执行第二轮两阶段 recall development probe：

```sh
bun run probe:recall
```

该命令交错执行 6 个问题的 image/search 条件，每个条件一次，共最多 12 个 route call 和
12 个 answer call。正式调用前必须先提交冻结的 fixture、scorer、runner 和实际 PNG；默认
evidence ID 已存在时命令会拒绝覆盖。现有默认 evidence ID 已执行，因此直接复跑会被拒绝；
如需预注册新 repetition，必须显式设置新的 `KB_PROBE_ID`。第一次运行只提供 development
signal，不形成稳定性或跨模型能力结论。

v2 已按下面的冻结参数执行并保留证据；现有 evidence ID 会拒绝覆盖。下面命令只用于复核
执行画像，不应直接重跑：

```sh
KB_PROBE_ID=2026-08-06-qwen37-associative-recall-v2-development \
KB_PROBE_CASESET=development \
KB_PROBE_REPETITIONS=1 \
bun run probe:recall:v2
```

development 通过 gate 后执行的新题确认是：

```sh
KB_PROBE_ID=2026-08-06-qwen37-associative-recall-v2-confirmation \
KB_PROBE_CASESET=confirmation \
KB_PROBE_REPETITIONS=2 \
bun run probe:recall:v2
```

runner 串行执行每个 route→answer 链路，第二次 repetition 反转题序并翻转 condition-first
位置；route failure、answer parse failure、usage、时延和原始事件都保留。开发轮与确认轮的
[`summary.json`](./evidence/2026-08-06-qwen37-associative-recall-v2-development/summary.json)
和
[`summary.json`](./evidence/2026-08-06-qwen37-associative-recall-v2-confirmation/summary.json)
是当前结果的机械汇总。任何新执行仍需新的 evidence ID 和明确的外部调用／费用授权。

重算第二轮明确标注的 post-hoc source-only 与 resource 诊断（不会改写 `summary.json`）：

```sh
bun run analyze:recall 2026-08-06-qwen37-associative-recall-v1
```

两个 probe 会在不向 worker 暴露答案的情况下自动评分并保留结果。下列独立 evaluator
只适用于尚未执行的 `round1` 候选 fixture：

```sh
bun run scripts/score.js path/to/answers.json
```

重算已保留证据的汇总：

```sh
bun run summarize evidence/2026-08-05-qwen37-image-gate evidence/2026-08-05-qwen37-text-gate
```

第一轮若暴露格式或清晰度问题，它就是 development case；修改后的表示必须用另一张
未参与调优的图确认，不能把同一题上的改进称为泛化。
