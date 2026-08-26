# main-method-round-1 task

你正在为当前项目的 Main 处理一条只读、低风险 planning wave。不得修改任何文件，不得运行 provider、
WorkCell、runtime 或外部效果。

请基于当前 worktree 中的以下 source，恢复并返回一个可回接 `planning/item-ledger.md` 的 bounded route：

- `planning/item-ledger.md`：当前 cross-item standing、执行面和 WorkCell/long-horizon/Main method 条目；
- `planning/records/workcell-design-acceptance-readiness.md`：WorkCell acceptance dimensions、B1–B5 package
  和 owner-facing 边界；
- `planning/records/long-horizon-agent-forgetting-design.md`：长时间执行 Agent 遗忘的设计 candidate；
- `theory/research/main-agent-project-work-method.md`：Main project-scale method candidate。

输出必须包括：

1. A/B/C 各自的 source、current standing、consumer/owner、依赖、允许范围、evidence limit、disposition、
   next return 和 unknown；
2. A/B/C 哪些贡献可以并行、哪些必须由 Main 顺序 fan-in，以及理由；
3. Main 必须保留的整体义务、共同遗漏检查和当前不能推进的边界；
4. 下一条最小 bounded wave 的建议，或明确 `wait / no-proposal`；
5. 所有结论的精确 source path 和是否为 observation、inference、candidate 或 acceptance。

不要创建新的 planning item，不要填写推测性 owner，不要把已有 review、validator 或设计 candidate 写成
acceptance；如果 source 冲突，保留冲突和 unknown。

