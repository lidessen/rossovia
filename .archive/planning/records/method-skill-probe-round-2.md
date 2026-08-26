# practice-cycle / work-estimation 对照回返：P01/P03 reading parent

状态：`behavior-observed / attribution-limited / acceptance-unknown`；不是 matched eval acceptance、
portable promotion 或实现授权。

本记录是 [`method-skill-probe.md`](method-skill-probe.md) 的第二轮回返。它用一个不同于
WorkCell lifecycle 的真实 planning/design case 检查两个 incubation candidate 是否改变下一步
判断；主 Agent 负责综合，不把内部 Agent 的一次返回写成独立 acceptance。

## 1. 冻结对象与过程边界

- **对象：** 哲学序列 P01–P16 living reading 父 item；P01/P03 是两个 reading work package。
- **任务：** 从当前 source/standing/review 状态判断下一项最小且可回读的 planning/design contribution；
  不修改 source、candidate、plan、ledger，不创建 skill/eval/runtime/WorkCell 实现。
- **输入 fixture：** `evals/skill-evaluation/inputs/method-probe-round-1/p01-p03-task.md`，hash
  `98ee31d3950fb3e494c272eed2956caab32f57ad612e4d3cc08a257958c59b9a`。
- **来源 hash：** `philosophy-reading-review.md`=`b5903d89100c22c827c936ffc9dd016dfa890279df3fb1a5ac248453c67c899d`；
  P01=`14825fa9c03b2e8c311473a4e021efa51fec2ce994f60b2a34ad27d73d5944a2`；
  P03=`c687b1354c28a7777b4e4d6d838d30bc45bb35fec9b33a994154f871b290dad2`；
  coverage=`9b19d6282c479aeddba3f30819d7e6007ed0e8dd5c47443ac57f9f98cc97a467`；
  item ledger=`77e215fda2463f2cf01ed594af1863e6c9609c63872549444aced412087656c8`；
  plan=`4e2ff5a993d90e1b9a47382252d732fe2548278848fc92f48e64a2ffcc04b254`。
- **candidate hash：** `practice-cycle`=`0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf`；
  `work-estimation`=`7cbf9b307702c1ef37a3b4f584cf16dfbb650e1811358b85f4641341078def9f`。
- **控制变量未知：** 内部多 Agent runner 的 served model、完整 system/developer identity、
  sampling/runtime 配置和严格等价的 workspace snapshot 未形成可核验 card；因此不声称
  `matched-improvement`。

外部 `codex exec` runner 曾尝试建立严格输出，但被安全策略拒绝：它会把项目私有文档发送到未
明确授权的模型服务。没有绕过该拒绝；两个零字节 JSONL 也已删除，不作为 eval Run 或失败结果。
随后使用项目已授权的内部多 Agent 只读隔离返回，作为 planning-level behavior observation。

## 2. practice-cycle 对照

### Baseline

内部 Agent `Bohr`（`01a03774-6fa4-7251-a6bc-b983561f994e`）不加载候选方法，恢复出：

- P01/P03 仍是 `source-current / reading-pending / research-open` 的 candidate；父 item 保持
  `active-now`；
- 下一步是独立 source/nearest-neighbor review，并补 P01/P02/P04、P03/P15/P16 父 item 交叉关系；
- 不接受 reading、不改 source、不创建 skill/eval/runtime/WorkCell；owner 和 acceptance 仍未知。

### Treatment

内部 Agent `Peirce`（`01a03774-702e-76d2-8991-a73010c50965`）只加载
`.agents/skills/practice-cycle/SKILL.md`，恢复出相同 baseline，并明确：

- 当前结果已经排除“继续补写、直接接受或开始实现”这些较大动作；
- 下一项最小实践是一次未参与 candidate 生产的独立语义 review；
- review 范围应包含 source fidelity、最近邻、生成性例子是否越权、父 item 交叉关系和 owner；
- 该选择不改变 candidate standing，不构成 acceptance。

### 边界判断

这说明 treatment 输出中出现了与 skill 方法一致的 `observed result → smallest next practice →
route/unknown` 关系；但 baseline 也能给出相近的独立 review 方向。当前只能记为：

```yaml
candidate: practice-cycle
baseline_observation: next-independent-review identified
treatment_observation: next-independent-review narrowed and routed with explicit exclusion/unknown
matched_attribution: unknown
evidence_standing: behavior-observed
boundary: no acceptance, source change, skill creation, runtime or implementation
```

## 3. work-estimation 对照

### Baseline

内部 Agent `Beauvoir`（`01a03775-e22b-7403-b4ee-79d976bfd8d4`）不加载候选方法，仍恢复出一个
有序工作图：保持父 item/work package 边界 → 独立 source review → 父 item cross-relation review
→ acceptance/standing decision → 有真实 consumer 时才进入行为验证；同时列出 owner 缺失、reviewer
未返回、source drift 和 semantic revision 分支。

### Treatment

内部 Agent `Turing`（`01a03775-e39e-75c1-bc5b-931f27d4fa09`）只加载
`.agents/skills/work-estimation/SKILL.md`，给出更显式的状态图：

```text
N0 restore source/boundary
  → N1 independent semantic review ─┐
  → N2 parent cross-relation review ─┴→ N3 acceptance/standing
                                      └─[real consumer]→ N4 behavior/adoption validation
```

它还明确当前只需精确到 source fidelity、nearest-neighbor、cross-relation、acceptance owner
和行为证据 standing，不需要 token/time/money/P50/P80/P95；未知不能误报为 acceptance。

### 边界判断

Baseline 已能恢复大部分必要工作图，故 treatment 的差异不能归因。可以保留一个低强度观察：
候选方法帮助把节点、分支、粒度和省略项写得更结构化，但当前 evidence 仍是：

```yaml
candidate: work-estimation
baseline_observation: necessary graph and discovery branches identified
treatment_observation: graph, acceptance gate, consumer branch and tolerated resolution made explicit
matched_attribution: unknown
evidence_standing: behavior-observed
boundary: no resource estimate, budget approval, runtime or implementation
```

## 4. 独立性、review 与处置

- **生产/运行隔离：** baseline/treatment 分别由不同内部 Agent 只读执行；Main 未把自己的预期
  答案传给它们，但本 round 没有预冻结严格 eval card。独立语义 reviewer 在运行后审查了本记录
  与 standing，未把其审查误写成新的 baseline/treatment 输出。
- **当前 reviewer 判断：** Main 只做了结构差异审查；两组 baseline 都已具备相近的核心判断，
  因此没有足够依据声称候选造成改善。
- **当前 disposition：** 对两个 candidate 均 `adapt-and-retest`，不是 `adopt`、`rollback` 或
  `no-proposal`。理由是边界关系在 treatment 中保持，行为观察有价值，但 attribution、独立 review、
  acceptance owner 和 regression 均缺失。
- **回归状态：** 未启用 adoption window 或 regression phase；不能把“没有观察到回归”写成零回归。
- **下一项最小实践：** 先冻结一份真正的 core card，再选一个更能区分候选的 case：包含一个
  “已有自然下一步但容易过度计划”的反例，以及一个确实需要拆分 discovery branch 的正例；让
  baseline/treatment 使用同一 runner identity，并由未参与生产的 reviewer 盲审。

## 5. 阶段影响

本轮把两个 candidate 从“只有自用 planning probe”推进到“在第二类真实 planning/design case
出现对照行为观察，但归因未知”。它没有改变：

- P01/P03 的 `uncertain / retain-candidate`；
- 两个 skill 的 `retain-incubation` 和 `skills/` 不存在；
- WorkCell 的四项 `retain-unknown` 与 `active-after-prerequisite`；
- DeepSeek Harness 工作系统、base/runtime 和用户 harness 构想的未授权状态。

若下一轮仍无法冻结匹配 card、取得独立 review 或找到清晰可区分 case，两个 candidate 应回到
`behavior-observed / no matched attribution`，并考虑 `no-proposal` 或降级为 reference，而不
继续扩张正文。

## 6. 独立 review 追加

独立 reviewer：`Epicurus`，Agent `01a0377a-a5f6-74f2-b3c6-33acc511dae6`；未参与前面的
baseline/treatment 生产，未修改文件。该 review 只检查本记录的证据 standing、归因上限、边界和
下一项 probe。

- `behavior-observed` 可以保留，但只能表示低强度 planning-level observation；没有可回读 raw
  output、run hash 或严格 card，不能把当前记录当作可重建 eval evidence。
- `matched-improvement` 与 `adopt` 均不成立：runner/model/system/workspace/harness 控制变量
  未形成匹配 card，treatment prompt 还要求了更完整字段，baseline 本身已经恢复核心 review/
  work graph，差异可能只是结构更完整，而不是后续行为改变。
- 两个 candidate 的最诚实处置仍为 `adapt-and-retest`；不是 `no-proposal`，因为仍有可区分的
  最小 probe；不接受 skill，也不改变 P01/P03 reading standing。
- 下一项最小 probe：分别为每个 candidate 冻结真正 core card，固定同一 runner/model/config/
  task/source snapshot/rubric/workspace，只改变候选激活；加入“简单一步任务拒绝过度规划”的
  反例和“观察必须改变下一步/拆出 discovery branch”的正例，由未参与生产的 reviewer 盲审实际
  action、route、branch 和 unknown，而不是篇幅。
- 必须继续保留：raw output 可重建性、来源漂移、匹配控制变量、prompt 泄漏、reviewer 独立性、
  真实 consumer/acceptance owner、regression/adoption window 和 P01/P03 acceptance。

**过程修订：** §1 的 source hash 是对照开始前的 snapshot；随后追加本 round record、ledger 和
plan projection 后，`item-ledger.md` / `plan.md` 当前 hash 已改变。这是本轮未使用不可变 card
的 process finding，不回写成 source drift，也不把它解释为 matched evidence；下一轮必须先冻结
card，再产生任何 treatment/runner 输出。
