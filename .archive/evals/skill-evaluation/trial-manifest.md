# Trial manifest：pre-run core card

这是 [`protocol.md`](protocol.md) 的冻结前模板，不是运行结果表。复制后只填一张对象级 core
card；treatment、结果暴露或调参开始前记录 freeze event 和 snapshot hash。冻结副本不可编辑、
删除或覆盖；任何规则、输入、接受者或 phase applicability 改变都开新 round。冻结后的输出、
污染、review、处置、stale/recovery 和 rerun 只追加到 [`trial-ledger.md`](trial-ledger.md)。

本模板中的 conditional module catalog 不是每个 trial 的必填字段：core card 一次性选择 phase，
复制副本时只保留被选为 `enabled` 的模块；disabled 模块不出现，不逐字段填写 `N/A`。

## Core card（treatment 前一次性填写）

### Identity and ownership

- schema version：`core-card/v2`
- trial id / round id / supersedes：
- object（正在改变或检验的行为关系）：
- purpose（本轮可观察目标）：
- owner（执行/证据 owner）：
- Principal 或明确受托的接受者及其接受权限：
- card copy path / status：`draft` → `frozen`

### Known-good baseline and candidate

- known-good baseline artifact path、artifact hash、可恢复锚点：
- baseline 被称为 known-good 的已有依据与适用范围（不是普遍正确）：
- candidate input path、candidate input hash（运行输出另记 ledger）：
- controlled semantic delta（主要因果改变及不可拆的部分）：
- baseline headroom / ceiling（当前已覆盖能力与可观察改善空间）：
- baseline floor（硬约束、来源保真、权限/效果边界及重大退化触发）：
- 不属于本对象的邻近结果与 owner：

### Goal, boundary and regression

- goal/outcome：目标行动、正例范围和最小可观察证据：
- boundary/nearest-owner：不应发生的行动、边界例和最小证据：
- regression：必须保留的既有行为、来源与最小证据：
- 反驳观察、停止/回退触发及责任 owner：
- 未知（会改变本轮判断、归因或下一行动的缺口）：

### Cost and phase applicability

- cost budget：时间 / token / 等待 / 协调 / 维护 / 必要外部成本：
- phase applicability（冻结时一次选择 `enabled` 或 `disabled`；disabled 只写一次裁剪理由）：
  - discovery：
  - confirmation / fresh holdout：
  - adoption-window：
  - ablation：
  - stale / recovery：
- phase 裁剪总理由（风险、可逆性、效果边界、方差和接受关系）：
- 采用后停止判断（只引用本 card，不另设全局门槛）：

### Combination and treatment boundary

- baseline 状态：未加载候选载体，未发生候选 skill 激活：
- treatment 状态：只额外加载 candidate input，并在本任务中发生一次激活：
- treatment 是否不可拆：
- 不可拆的语义理由与组合边界：
- 不可拆时的 `combo-only` 归因限制：
- 若可拆，ablation 的范围、顺序和成功/失败判定（仅启用 ablation module 时展开）：
- installation / publishing / permission / persistence：`out-of-scope`；项目/runtime owner：

### Matched execution identity

- model/version 与推理/采样设置：
- original task hash 与 original source list/hash：
- tool/version、permission/allowed effects：
- workspace snapshot/隔离身份、repository HEAD、clock/randomness/environment：
- runner identity/version：
- `AGENTS.md` path/hash 与适用范围：
- harness/system/developer identity/hash：
- fixture/rubric/grader identity/version/hash：

### Upstream edge list

每条边写为 `from → to | relation | artifact/hash | semantic standing | owner`；不得用自由文本
血统图替代边列表。

- edge list：
  -

### Freeze event

- freeze event id / UTC time / actor：
- 接受者确认身份与时间：
- card snapshot artifact path/hash：
- snapshot/freeze 机制（不可变存储、权限或提交身份）；无法核验写 `unknown`：
- freeze 后修改处理：新 round，引用本 snapshot，不编辑本副本：

## Conditional module catalog（复制副本时只保留 enabled 模块）

### discovery（仅 core card 选择 enabled 时出现）

- selector/选择器 identity 与版本：
- discovery 试题、可见性和选择结果 artifact/hash：
- 未向 activation 试题泄漏的隔离观察：
- discovery 结果只作发现/选择观察，不作 method outcome：

### confirmation / fresh holdout（仅 core card 选择 enabled 时出现）

- confirmation card/candidate/task/source/config identity：
- baseline run id、treatment run id、独立 reviewer identity：
- fresh holdout registry id、opaque commitment、selection rule、owner：
- 结果锁定前的可见性与访问者（题目 identity 留在 registry）：
- confirmation/fresh holdout 使用时点及污染后 rerun 关系：

### adoption-window（仅 core card 选择 enabled 时出现）

- window start/end、任务范围和观察 owner：
- adopted artifact/card snapshot 与采用后输出 hash：
- escape/regression 观察、停止判断和未知：
- 若本 card 的对象同时启用 `principal-correction`：冻结 correction 观察对象、窗口、
  实际 exposure 范围/纳入排除规则和 owner；具体 observed/exposed set、escape、
  recurrence/reopen、未复查、分子/分母及成本只在 ledger 追加，不在 freeze 后回写本 card：

### ablation（仅 core card 选择 enabled 时出现）

- 可拆组件及固定局部对照：
- 每个 ablation 的 input/run/reviewer hash：
- 结果、边界/回归、未知及是否仍只能 `combo-only`：

### stale / recovery（仅 core card 选择 enabled 时出现）

- 触发的 upstream edge/hash 与发现 event：
- 受影响 snapshot、artifact、phase、standing 和旧结论：
- 保留的历史路径、baseline 恢复锚点与实际动作：
- 修复/再生/review/rerun owner、新 round id、新 card 和 holdout 刷新关系：

### principal-correction（仅 correction workflow 对象选择 enabled 时出现）

本模块不是普通 trial 的必填项；没有 correction 时不出现。若 correction 在 freeze 后才
到达，不编辑本 card，使用 ledger 的 correction entry；若它改变本轮对象、规则、接受者
或 phase applicability，开启新 round 并引用本 snapshot。

- correction workflow 的对象、scope、source/authority 边界与 owner：
- 预计可接收的 correction source revision 与可修订分类边界（不把分类写成固定分类器）：
- assumption delta、最小 owner、实际依赖 edge 范围与 stale/re-evaluation 责任：
- Principal/明确受托接受者及其接受权限；reviewer 只能建议：
- correction 到达后的新 round、处置和历史保留关系：
- 若同时启用 `adoption-window`：观察对象、窗口起止、实际 exposure 范围/纳入排除规则、
  观察 owner，以及无真实暴露时报告 `unknown` 的规则：

## 交付关系

冻结副本只表达运行前承诺；它不声明运行已发生、review 已独立、holdout 已保密、候选已改善
或可以 adopt。请在 [`trial-ledger.md`](trial-ledger.md) 追加这些观察与未知；若需要 sealed
holdout，使用 [`holdout-registry.md`](holdout-registry.md) 并在本 card 只保留 opaque commitment、
选择规则和 owner。
