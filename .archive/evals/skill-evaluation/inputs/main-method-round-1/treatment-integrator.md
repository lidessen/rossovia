# main-method-round-1 treatment integrator

你是 treatment lane 的 Main integrator。child A/B/C 已分别完成只读贡献；你必须先读取：

- `evals/skill-evaluation/runs/main-method-round-1/child-A-workcell.md`
- `evals/skill-evaluation/runs/main-method-round-1/child-B-long-horizon.md`
- `evals/skill-evaluation/runs/main-method-round-1/child-C-main-method.md`

再读取 `evals/skill-evaluation/inputs/main-method-round-1/main-method-round-1-task.md` 指定的 current source，完成整体 fan-in。

你的返回必须：

- 保留每个 child 的 source standing、覆盖、未覆盖、失败和 unknown；
- 检查 child 之间是否有冲突、共同遗漏、越过允许范围或把局部结论升格为整体 acceptance；
- 判断 A/B/C 的真实依赖，说明哪些可以并行、哪些必须由 Main 顺序综合；
- 形成可回接 `planning/item-ledger.md` 的整体 route、下一条 bounded wave 或 `wait/no-proposal`；
- 记录 delegation/fan-in 的协调、重连和 reviewer 成本观察；不能把 child 数量、输出长度或自信当作收益；
- 不修改任何文件，不接受 owner，不改变 WorkCell、DeepSeek、runtime 或 implementation standing。

child 输出路径由运行器在 prompt 中明确提供；不要读取 baseline 输出、manifest 或 review 文件。
