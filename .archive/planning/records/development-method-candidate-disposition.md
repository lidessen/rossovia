# 设计/开发方法候选当前处置

状态：`current-branch-disposition / activation-deferred / independent-review-complete / acceptance-pending`；
不是 skill acceptance、portable promotion、实现授权或 WorkCell/DeepSeek Harness 开工许可。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

本记录处理 [`design-development-review.md`](design-development-review.md) 中的
`code-review` 与 `structural-refactoring` 两个候选。它们共享“未来真实代码消费者”这一前提，
但对象、触发、保存的约束和验收关系不同，故这里只做并列处置，不合并成一个 development skill。

## 1. 来源与当前事实

| 项目 | `code-review` | `structural-refactoring` |
| --- | --- | --- |
| 历史来源 | [`../archive/skills/code-review/SKILL.md`](../../archive/skills/code-review/SKILL.md) | [`../archive/skills/structural-refactoring/SKILL.md`](../../archive/skills/structural-refactoring/SKILL.md) |
| 单一主要判断 | 已提出的代码变更相对于 accepted intent、现行 contract 与实际影响面，是否引入会改变决定的缺陷或残余风险 | 已存在代码在保持命名的行为与硬约束下，怎样选择最小结构边界、迁移 checkpoint 与验证关系 |
| 当前 living consumer | 未观察到 accepted-intent code diff、已接受 base implementation 或待 merge 的真实代码变更 | 未观察到主线中已接受、行为保持目标明确且具有结构压力的真实 refactor |
| 当前 owner | 未来真实 code-change review 的独立 review owner；acceptance/merge 仍由外部 owner 持有 | 未来实现阶段的结构迁移 owner；最终 acceptance 仍由外部 owner 持有 |
| 最近邻 | 普通实现、未接受架构决策、`mechanism-design-review`、`disciplined-development` | routine cleanup、feature work、未决架构、`code-review` |
| 当前证据上限 | archive source-backed；当前 branch 没有 matched improvement、fresh review run 或 acceptance | archive source-backed；当前 branch 没有行为保持 refactor、caller/state regression 或 transfer evidence |

当前检查还确认：正常 living path 下可见的是文档、planning、skill、eval、实验产物和脚本；实验
生成产物与历史 archive 不构成当前代码消费者。该观察只证明“当前没有足以激活候选的消费者”，
不证明项目未来不需要这两个方法，也不把文件扩展名清单当成 acceptance evidence。

## 2. 边界判断

两者的最小关系仍是顺序关系，而不是同一个 carrier：

```text
accepted intent + consequential proposed code change
  -> code-review: 恢复契约、影响面和可达失败路径，报告决策性缺陷
  -> 若缺陷之外仍需要行为保持的结构迁移：structural-refactoring
  -> ordinary development / focused verification
  -> external acceptance
```

- `code-review` 的对象是“这次代码变更是否改变接受决定”；它不实现修复、不接受 merge，也不把
  未接受架构疑问当成代码缺陷。
- `structural-refactoring` 的对象是“已接受的行为保持结构变更怎样安全完成”；它不创造产品行为、
  不以文件变短或 AST/Agent 数量自动证明边界，也不接受自身结果。
- 两者都可以在 Work Cell 中执行，但 Work Cell 只是 carrier/evidence source，不是这两个方法的
  owner 或激活条件。
- `disciplined-development` 仍是未来普通实现的邻近候选；它不能由这两个尚未激活的候选反向
  证明自己已经形成，也不能作为本记录的替代 owner。

## 3. 当前处置

本轮不创建 `.agents/skills/code-review/` 或 `.agents/skills/structural-refactoring/`，不把正文
从 archive move 到 living path，不制作 fake implementation、fake diff、fake refactor 或 synthetic
acceptance。

| candidate | 当前 branch disposition | 保留内容 | 不允许的推断 | 重开条件 |
| --- | --- | --- | --- | --- |
| `code-review` | `no-proposal-now / activation-deferred / retain-archive-source`；候选生命周期仍为 `candidate-next` | 保留 accepted intent、review target、impact field、finding contract、外部 acceptance 边界 | 不能把 planning/design review、文档 diff、实验 build 产物或 archive 自评当作代码 review consumer | 真实 accepted-intent code diff + 命名 acceptance/merge owner + 可回读 baseline/contract + positive finding case 或 no-finding/false-positive boundary + independent review + external acceptance |
| `structural-refactoring` | `no-proposal-now / implementation-gated / retain-archive-source`；候选生命周期仍为 `candidate-next` | 保留 preservation contract、impact field、最小边界、checkpoint、caller/state/regression 验证关系 | 不能把文档整理、目录搬移、局部 rename、未决架构设计或生成产物组织当作结构重构 consumer | 真实 accepted-intent behavior-preserving refactor + named structural pressure + no-refactor alternative + caller/state/error/concurrency regression surface + independent verification + external acceptance |

这里的 `no-proposal-now` 是“当前阶段不提出新 carrier/不激活”，不是删除候选或断言方法无效；
`candidate-next` 是未来可以重新恢复 consumer/boundary 的生命周期状态。若重开后发现判断只
是所有开发任务的常驻纪律，应由 `form-selection` 路由到项目指令或普通 reference；若出现独立
触发、失败关系、可选择加载的净收益和回归证据，再由 `skill-formation` 另行形成 carrier。

## 4. 下一项最小实践与阶段影响

下一次不要为了验证方法而先写实现。候选重开时，固定真实任务、source、workspace、runner 和
acceptance relation，分别建立：

1. `code-review`：一个会改变接受决定的正例，再加一个无 finding 或可证伪 false-positive 的边界；
2. `structural-refactoring`：一个有真实结构压力的 consequential refactor，再加一个最强
   `no-refactor` 或局部 rename 对照，并覆盖 caller/state/error/concurrency 中实际相关的关系；
3. 两者都记录 source-backed observation、inference、unknown、执行过的检查和外部接受结果，
   不把 review verdict 写成 merge/acceptance authority。

在这些前提出现前：

- `planning/index/skill-migration.md` 只登记 archive candidate，不增加 living carrier 或 portable move；
- `planning/records/design-development-review.md` 的 owner map、边界和“有真实代码变更后再恢复”顺序继续
  有效；本记录作为当前处置的更窄 projection；
- phase 1 仍是 `phase-complete = not-established / continue`；
- WorkCell 仍只进行设计澄清、fixture、record/lifecycle boundary review，不进入实现；
- DeepSeek Harness 仍等待 WorkCell 设计接受，不提前展开系统实现。

本记录不新建任务队列、不指定 owner、不替用户接受候选，也不改变总 planning 的优先级；它只把
两个可突进但当前缺少真实消费者的 planning item 收敛到可回读的等待状态和明确重开条件。

## 5. 独立语义审阅

独立 reviewer：`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）；只读审阅，未修改文件，
未取得 skill acceptance、portable promotion、实现或 runtime 权。

审阅结论：`final accept`（仅针对本 planning disposition record）。审阅确认 source/standing、两个
候选的对象与边界、`no-proposal-now` / `activation-deferred` / `implementation-gated` 的限定、
真实 consumer 重开条件以及与 `design-development-review.md`、`AGENTS.md` 的一致性均成立；未发现
高、中或低严重度问题，也未要求最小修订。

该结论不改变以下事实：两个候选尚未成为 living skill，没有 portable promotion 或行为改善结论，
WorkCell、DeepSeek Harness、base/runtime 和任何实现仍未授权。后续 projection 只应保持当前等待
状态，直到真实 accepted-intent code change 或 behavior-preserving refactor 提供新的 consumer 与
相称证据。
