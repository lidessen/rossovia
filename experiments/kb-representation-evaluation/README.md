# KB representation evaluation

这个实验研究关系图在 Agent 记忆系统中的两种不同角色：承载事实，或触发联想召回。
实际目标是后者。recall 时，系统针对当前问题生成或选取一张带 source ID／路径的联想
激活图；Agent 从中找到可能相关的原始记忆，再打开来源、核对证据并形成引用。图可以是
有损投影；事实权始终属于原始记忆和证据。

因此验收重点不是完整恢复每一条边，而是相关来源能否进入有限候选集，以及 Agent 回源后
能否正确引用。图中的误报主要消耗阅读预算，漏掉关键来源则直接造成 recall 失败。

本轮没有执行这条端到端 recall 链路，也没有给文本条件配搜索工具；文本只是完整附件控制组。
现有结果只能描述图的关系可读性，不能直接量化真实 `activation graph → source → citation`
或 `search → top-k` 的命中率和成本。

当前状态是 `probe`。第一轮先回答一个较低层的问题：Agent 能否恢复图片里的
复杂连线？`fixtures/image-diagnostic/` 固定相同的 15 个节点与布局，把边数从 13、22
增加到 34；每档用 8 个机械题检查边存在、方向、负例、关系标签、四段关系链、出边集合
和入度。它用于发现视觉读取边界，不再充当 recall 方案的否决门槛。

第一轮实测已经完成，结论和证据边界见[实验报告](./REPORT.md)：完整文本控制组为
72/72，完整图像从 sparse 的 24/24 降到 dense 的 18/24，错误集中在复杂相邻边的
完备枚举；局部边、关系标签和四跳路径保持正确。这组信号足以继续测试联想召回，但尚未
证明它能达到可用的 source hit 或最终引用成功率。

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
bun test
bun run check
```

需要 PNG 输入时，用 Chrome/Chromium 从受控 SVG 生成本地投影：

```sh
bun run render
```

脚本默认查找 macOS 上的 Chrome/Chromium；其他安装位置通过 `KB_PROBE_CHROME` 指定。

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
