# Round 3 practice-cycle 独立语义评审

状态：`behavior-observed / attribution-uncertain / review-complete / acceptance-pending`；
本记录不是 matched improvement、regression acceptance、portable promotion 或 Principal acceptance。

## 1. 评审输入与证据身份

- **冻结 card：** [`practice-cycle-round-3.md`](../manifests/practice-cycle-round-3.md)，freeze receipt
  [`practice-cycle-freeze.md`](../runs/method-probe-round-3/practice-cycle-freeze.md)。
- **任务：** [`practice-cycle-task.md`](../inputs/method-probe-round-3/practice-cycle-task.md)，raw-file
  SHA-256 `39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c`。
- **baseline：** [`practice-cycle-baseline.md`](../runs/method-probe-round-3/practice-cycle-baseline.md)，
  raw-file SHA-256 `11ba07b36f374bdfb14de418b09b25774ca362635f4fe4aaf6feeb7fcd42bd8b`。
- **treatment：** [`practice-cycle-treatment.md`](../runs/method-probe-round-3/practice-cycle-treatment.md)，
  raw-file SHA-256 `63bc414892e13d6453d4a658c24969583a2b24e1d05e4b188e54a396a271da81`。
- **runner identity：** baseline `01a0385a-9174-7132-aa78-f5d76f377d06`，treatment
  `01a0385a-9243-7791-8928-fe8fc8779a11`；两者不同。精确 model、harness、workspace、权限和
  process-level visibility 仍 unknown，见 [`run-identity.md`](../runs/method-probe-round-3/run-identity.md)。
- **独立 reviewer：** Parfit（agent `01a0385c-12bc-7523-9abf-4eb2b6d9e160`），未参与 candidate
  写作、baseline/treatment 生产或调参；本 review 不取得 Principal acceptance。

## 2. 逐项观察

### Case A：简单一步修正

baseline 与 treatment 都选择既有 owner 完成单行替换并运行 `git diff --check`，都拒绝创建
practice-cycle、discovery branch、独立语义 review 或更大计划。`settle` 在这里表示“不制造新
实践循环”，不表示拼写修正已经实际执行。

该 case 的 action、owner、允许效果和 disposition 没有实质差异；只能作为反过度规划的边界观察，
不能证明 treatment 改善。

### Case B：结果改变下一判断

baseline 选择较窄的 owner/authority discovery 并 `route`；treatment 选择 `continue`，拆出
discovery/owner branch，并把 declaration、grant、return、observation、record、check、review、
acceptance 的完整 map 再次纳入发现。

两者都保留 canonical shape、owner、host、adapter、acceptance unknown，并拒绝补 schema、建
registry、执行 host Run、开始 WorkCell implementation 或声称 acceptance/runtime guarantee。

但是 treatment 的 discovery 比“当前已确认关系之后的最小 owner route”更宽，不能直接判为更好。

## 3. 结构与隔离问题

- baseline 的 `excluded_actions` 是数组，treatment 是字符串；baseline 顶层为
  `limitations_and_unknowns`，treatment 使用中文字段 `限制与未知`。这违反了 task 所要求的稳定
  结构化返回，成为 process/measurement defect。
- treatment 的 candidate activation 只有 runner self-report；baseline 的“不加载”也没有 runtime
  proof。
- 两个 runner identity 不同，model、harness、workspace、工具权限和 role visibility 未核验；
  因此唯一变量未成立。
- task/source hash 在两份输出中一致；没有发现已记录的 task/source drift。

## 4. Standing、处置与停止边界

- **基础 evidence standing：** `behavior-observed`。Case B 的下一行动和 disposition 确有差异，
  但不能归因给 candidate；Case A 只有共同的 boundary behavior。
- **可附加 qualifier：** 当前不附加 `matched-improvement` 或 `regression-supported`；可把“Case A
  反过度规划边界”和“Case B 保留 unknown/实现冻结”作为局部观察，不把它们写成 candidate-specific
  improvement。
- **互斥 disposition：** `adapt-and-retest`。
- **不选择：** 不 `adopt`（treatment 的 Case B 不够最小，且隔离/激活未核实）；不 `retain-baseline`
  （treatment 出现了实际 route/continue 差异）；不 `no-proposal`（仍有可区分的下一 probe）；不
  `rollback`（没有施加到项目 runtime 的改变）；不 `uncertain` 作为唯一处置（局部 behavior observation
  仍成立，但 attribution uncertain 必须单独记录）。
- **不能声称：** `matched-improvement`、`regression-supported`、adoption、acceptance、protocol
  acceptance 或 runtime guarantee。

## 5. 下一项最小实践

不修改本 round 的 frozen card、task 或 candidate。下一 round 应：

1. 使用同一可核验的 runner/model/harness/workspace identity；若不能建立，继续把归因上限保持为
   `behavior-observed / attribution-uncertain`；
2. 记录真实 candidate activation proof；
3. 强制 baseline/treatment 使用完全一致的结构化 output schema；
4. 将 Case B 的 target 限定为一次窄的 owner/authority route 或最小 discovery，不重复展开已确认
   的全部关系；
5. 由未参与生产的 reviewer 重新判断 action、route、disposition、边界和 regression。

如果下一 round 仍无法建立匹配 identity 或候选激活证据，skill 继续 `retain-incubation / adapt-and-retest`，
不得 portable promote 或 adopt。
