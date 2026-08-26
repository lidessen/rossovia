# method-skill-probe round 3：practice-cycle

状态：`behavior-observed / attribution-uncertain / adapt-and-retest / acceptance-pending`；不是
matched improvement、portable promotion 或实现授权。

## 1. 本轮对象与最小实践

本轮只检验 `.agents/skills/practice-cycle/SKILL.md` 是否改变“实践结果 → 下一项最小实践”的
判断。按上一轮回返，冻结了一个同时包含两类 case 的 core card：

- Case A：确定性的一步文档修正，要求拒绝制造 practice-cycle、discovery branch 或大计划；
- Case B：WorkCell 字段边界审查结果确实改变了下一判断，要求选择窄的下一实践、owner route 和
  unknown，而不是补 schema 或实现。

冻结记录与 hash 由 [`practice-cycle-round-3.md`](../../evals/skill-evaluation/manifests/practice-cycle-round-3.md)
和 [`practice-cycle-freeze.md`](../../evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-freeze.md)
拥有；本记录不成为第二份 eval protocol。

## 2. 运行与观察

- baseline 与 treatment 都完成了两个 case，并保留了实现冻结、owner/shape/acceptance unknown 和
  不新增 registry 的边界。
- Case A 两组都直接收口，未制造循环；这是共同 boundary observation。
- Case B baseline 选择较窄的 owner/authority discovery 并 `route`；treatment 选择
  `continue`，并扩大为完整关系 map 的 discovery branch。
- 差异改变了下一行动和 disposition，因此可记录 `behavior-observed`；但 treatment 是否由
  practice-cycle 造成无法归因。

完整原始返回、hash 和 isolation unknown 见：

- [`practice-cycle-baseline.md`](../../evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-baseline.md)
- [`practice-cycle-treatment.md`](../../evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-treatment.md)
- [`run-identity.md`](../../evals/skill-evaluation/runs/method-probe-round-3/run-identity.md)
- [`method-probe-round-3-practice-cycle-review.md`](../../evals/skill-evaluation/reviews/method-probe-round-3-practice-cycle-review.md)

## 3. 证据边界

当前最高 standing 是 `behavior-observed`，并带 `attribution-uncertain`。原因：

- 两个 runner identity 不同；
- model、harness、workspace、权限和 role visibility 未核验；
- candidate activation 只有 self-report；
- baseline/treatment 输出 schema 不一致（数组/字符串、英文/中文字段）；
- 没有 adoption window、regression-supported evidence 或 Principal acceptance。

因此不能写成 `matched-improvement`、`regression-supported`、adoption、acceptance 或 portable
candidate。

## 4. 闭环处置

- **baseline：** 作为同一任务下的 direct observation，Case A 与 Case B 的窄 route 可回读；不把
  baseline 自身当作 known-good 普遍真理。
- **treatment：** 方向保留价值，但 Case B 过宽，且运行隔离不足。
- **disposition：** `adapt-and-retest`；不 adopt、不 rollback、不删除、不移动到 `skills/`。
- **下一实践：** 新 round 固定可核验的 runner/model/harness/workspace identity，保留同一任务
  或另开明确 card；补真实 activation proof，强制统一结构化 output schema，并把 Case B 限制为
  一次窄 owner/authority route 或最小 discovery。
- **停止条件：** 若 identity/activation 仍不可核验，保留 `behavior-observed / attribution-uncertain`
  并考虑 `no-proposal` 或 demote；不因重复运行次数制造 matched 结论。
