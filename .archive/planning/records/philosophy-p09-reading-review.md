# P09 reading candidate：source/边界 review

状态：`main-review-complete / independent-review-complete / acceptance-pending`；不是哲学源接受、
theory 接受、skill 行为证据、全局 priority、资源分配或 runtime scheduler。

## Review scope

本轮检查：

- `theory/philosophy.md` 的 P09 源行；
- [`theory/philosophy/P09.md`](../../theory/philosophy/P09.md) reading candidate；
- `theory/gene-expression.md` 中解决阶段的“主次”坐标及 P05/P07/P08/P10/P11 最近邻；
- 当前 WorkCell planning/design observation 中 consumer、contract、lineage、owner 和回返条件
  的局部冲突。

本轮没有修改哲学源行，也没有把 P09 写成全局 priority queue、任务排序、owner 路由、资源分配、
deadline、runtime scheduler 或 acceptance gate。

## Main source and boundary review

- **source fidelity：** P09 保留 `解决·主次`，解释为在同一对象、目标、范围和约束内识别会改变
  其他冲突、关键约束或下一项判断的承重冲突；主要性是局部、条件性的。
- **最近邻：** P05 判断特殊条件，P07 选择可行入口，P08 界定适用范围，P10 判断介入时机，P11
  判断执行扰动/协调成本；P09 不取得这些关系的 owner 或 authority。
- **生成性案例：** 当前 WorkCell 例子只说明局部冲突可能影响 contract shape 或下一项 design
  判断，保留非主要冲突的 unknown、owner、风险和回返条件，不证明 priority policy、协议接受或实现。
- **当前 disposition：** `retain-candidate`；保留 P09 reading，不修改 source、不创建 P09 skill，
  不把它作为所有 planning、delegation 或 runtime 的强制前置。

## Independent semantic review

独立 reviewer：`Heisenberg`（Agent `01a037f0-533d-7f00-bbf1-23dea342bafe`）；未参与 P09 candidate
生产，未修改文件，也没有哲学、reading、theory、skill 或 acceptance authority。

- 确认 source fidelity 和局部/条件性主要矛盾定义成立；
- 确认 P05/P07/P08/P10/P11 最近邻可区分；
- 确认没有越权为全局 priority、排序、路由、资源、deadline、scheduler 或 acceptance gate；
- 确认案例和 `independent-review-complete / acceptance-pending` standing 诚实；
- 未提出具体修订。

## Evidence and return

当前 evidence standing 为 `source-current / reading-candidate / independent-review-complete /
research-open / acceptance-pending`；没有 P09 behavior Run、匹配对照、regression 或 acceptance。

下一项 return 是在 P05/P07/P08/P09 的现有同对象 fixture 上回读 P09：检查哪项冲突会改变其他
冲突、关键约束或下一项解决判断，同时保留非主要项的回返条件；若不能区分，回修 P09 或返回
`no-proposal`，不创建万能 priority 机制。
