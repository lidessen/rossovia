# Main project-work method round 1：direct vs delegated planning wave

本文件是运行前冻结 card，不是结果记录、方法接受或实现授权。

## 1. 决策问题

在同一个当前 planning worktree 上，面对三个互相可分但最终需要 fan-in 的 planning contributions，
`Main 直接处理` 与 `Main 委派三个只读 child、再由 Main 综合` 是否产生可重建的覆盖/decision delta，
以及这些增量是否抵偿交接、协调和综合成本？

本轮不声称测试总体工程速度、模型质量、WorkCell 效果或 provider 优劣；wall-clock、token 和输出长度
只作为 balancing observation。

## 2. 冻结条件

- trial id：`main-method-round-1`
- source snapshot：当前 `/Users/lidessen/workspaces/skills` worktree；两条 lane 只能读取指定
  `planning/item-ledger.md`、WorkCell readiness、long-horizon card、Main method card 及其直接链接。
- task：同一个 `main-method-round-1-task.md` 中的 bounded planning route 问题。
- model / reasoning：两条 lane 及所有 child/integrator 使用同一 CLI/model/config；实际身份以
  `run-identity.md` 回填，无法核实时保持 unknown。
- workspace / effect：read-only；不得修改 canonical source、planning、design、eval、experiment 或
  skill；输出只能写入本 round 的 run directory。
- contamination：baseline 不读取 treatment child 输出；child 不读取其它 child 输出；integrator 只读取
  三份 child 输出和指定 current source；所有 lane 都不得读取本 manifest、review 或另一 lane 的结果。

## 3. 唯一处理变量

- baseline：一个 Agent 直接读取三项 source，完成全部局部判断、整体路由和返回。
- treatment：三个 child 分别处理 A/B/C 单项只读贡献；一个 integrator 读取 child 返回和共同 current
  source，完成 fan-in、冲突/共同遗漏检查、整体路由和返回。
- 两条 lane 都必须回答：source/standing、consumer/owner、依赖、允许范围、evidence limit、disposition、
  next return、unknown、是否适合并行以及 Main 保留的整体义务。

## 4. Child 边界

| child | 对象 | 允许效果 | 不负责 |
| --- | --- | --- | --- |
| A | WorkCell design acceptance readiness | 只读恢复 current standing、重大 owner package、下一允许 move 和未知 | 不改 protocol、不接受 owner、不比较 provider、不实现 |
| B | long-horizon agent forgetting design | 只读恢复主问题、task continuity relation、primary outcome、前置条件和停止边界 | 不运行实验、不选择 provider、不创建 memory/runtime |
| C | Main project-work method | 只读恢复当前 evidence standing、direct-vs-delegated 下一实践、贡献/审查/settlement 边界 | 不把本轮结果写成 accepted method、不代 Main fan-in |

## 5. 输出与验收

每条局部返回必须保留精确 source path、source standing、覆盖、未覆盖、unknown 和建议 disposition。
Integrator/直接 Agent 还必须检查：

1. 没有把 review 变成 acceptance、把 candidate 变成实现授权；
2. 没有两个 canonical writer 或共享写面；
3. WorkCell、long-horizon、Main method 的依赖关系没有被互相混淆；
4. 没有把 child 数量、输出长度或自信替代 decision delta；
5. 返回能够接回 `item-ledger.md`，并能说明下一条 bounded wave 或 `wait/no-proposal`。

最终 standing 只能从 `behavior-observed` 起步；没有相同 identity、完整事件/成本和独立 review，不能
写成 `matched-improvement`、`regression-supported`、adoption 或 acceptance。

