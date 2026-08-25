# Round 1 meta matched 独立评审 — F1

## 评审边界

本评审只比较 [`round-1-meta-matched-baseline.md`](round-1-meta-matched-baseline.md) 与 [`round-1-meta-matched-treatment.md`](round-1-meta-matched-treatment.md)，依据 [`protocol.md`](protocol.md) 和 fixture F1。评审对象是两次 runner 输出中的判断关系，不把篇幅、标题数量、术语复述或文字精细度当作改善证据；本评审也不取得人类接受权。

## Matched 条件

**输入边界足够 matched：no。**

baseline 记录了 F1、protocol 及三份语义源的内容哈希，并明确指出其中两份已不同于 protocol 的冻结哈希。treatment 只说明处理 F1 且加载了 `skill-formation`，没有记录模型、原始语料及其哈希、工具、权限、harness、workspace state 或 skill 版本。因而：

- 两次运行实际上是否保持这些条件一致：**uncertain**；
- 现有记录是否足以确认 matched：**no**；
- 是否能把输出差异归因于 `skill-formation`：**no**。

这不否定 treatment 的边界判断，只限制可提出的因果主张。下一次若要形成 matched 证据，应为 baseline 与 treatment 共用一份 trial manifest，逐项记录冻结输入；treatment 只比 baseline 多出待测 skill 及其内容哈希。

## 逐项判断

| 关系 | baseline | treatment | 独立判断 |
|---|---|---|---|
| Source fidelity | **yes** | **yes** | 两者都从 F1 的四项观察恢复了对应对象，没有把 projection、reference、instruction 或 runtime 重新宣称为事实权威；超出 packet 的机制例子均以条件、候选或未知表达，没有伪装成已知事实。 |
| Owner / refusal boundary | **yes** | **yes** | 两者都选择 `candidate skill`、`reference`、`project-local instruction`、`tool/runtime`，并为每项给出可拒绝新增载体的情形。treatment 对 deterministic retrieval、branch protection 等最近邻的展开更明确，但没有修正 baseline 的 owner 或 refusal 错误。 |
| Material unknowns | **yes** | **yes** | 两者都保留了成因、现有 owner/机制、来源可用性、替代路径、恢复语义及迁移范围等未知。treatment 额外显式列出发现成本、上下文成本和维护成本，提升了可审计性，但不构成判断改变。 |
| Proportionality | **yes** | **yes** | 两者都只为重复且当前无 owner 的方法判断保留 skill candidate，并把三个相邻问题交还更小或更强制的 owner；没有因问题醒目或后果严重就把所有项升级为 skill、理论或 runtime。 |
| Intended judgment/action changed | **no** | **no** | 四项 owner、主要拒绝关系和改善前所需证据在两份输出中实质相同。treatment 的组织和解释更完整，不等于 Agent 改变了准入、拒绝或转交动作。 |
| Attributable improvement | **no** | **no** | matched 输入未得到确认，且没有观察到意图判断或行动的实质变化；因此不能将 treatment 的额外说明归因为 skill 带来的行为改善。 |

## 证据等级与处置

**最强证据等级：`boundary-supported`。** 作为独立且知源的 reviewer，本评审确认 treatment 在 F1 的一个正例和三个最近邻案例中选择了正确 owner，也保留了 refusal 和 authority 边界。这可以把该次边界观察提升到 `boundary-supported`，但不支持 `matched-improvement`；当前也没有重复回归可以支持 `regression-supported`。

**设计处置：`no-proposal`。** F1 没有暴露需要 rewrite 的重大设计缺陷，但这组记录也没有建立足以支持 retain 的可归因净收益。当前不改 skill 设计；先修复下一轮实验的 matched 记录边界，并使用更有区分力、不能直接从题面 owner 提示映射答案的 probe。只有 treatment 改变了准入、拒绝或转交判断，且没有破坏相邻 owner，才据此重新判断 retain 或 rewrite。

