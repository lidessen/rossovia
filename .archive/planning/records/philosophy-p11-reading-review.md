# P11 reading candidate 的 source / boundary review

状态：`source-current / reading-candidate / independent-review-complete / research-open / acceptance-pending`；
本记录不是 P11 acceptance、WorkCell acceptance、runtime cost policy 或实现授权。

## 1. Review object

- **source：** `theory/philosophy.md` 的 `P11｜治大国若烹小鲜｜解决·成本`；source line 不可由本记录修改。
- **reading：** [`theory/philosophy/P11.md`](../../theory/philosophy/P11.md)；这是 source-bound candidate，不是 living source 或 runtime input。
- **关系：** P11 是解决阶段的执行扰动/代价；P06 是分析删减；P10 是介入时机；P09 是主要冲突；P04 是 unknown/证据诚实；P15 是实践检验。
- **固定设计关系：** WorkCell 中 event/replay/lineage consumer、owner 和 contract 未命名的候选机制关系，沿 P06/P11 boundary review 的 F1→F2 条件性变化；具体 runtime object、accepted effect 和成本 identity 仍 unknown。

## 2. Candidate contract to review

P11 的最小候选定义是：在外部已经给出相称对象、已接受或待比较的解决方案、允许效果、硬约束、
owner 和接受边界时，只比较不同执行路径的必要动作、扰动、协调和风险代价，减少不改变当前解决
目标的反复翻动，同时保留为安全、证据、可逆性或必要组合所承重的动作。

Review 必须检查：

1. “成本/扰动”是否真正改变执行路径、失败暴露、回退或下一处置，而不是只数表面动作；
2. P06 的“分析保留/删除”是否仍与 P11 的“解决如何执行”可区分，且案例保持同一候选关系而非假定同一 runtime object；
3. P10 的时机、P09 的主次、P04 的 unknown 和 P15 的检验是否没有被 P11 吞并；
4. hypothetical owner/contract/effect/environment 是否明确保持条件性，不被写成当前事实；
5. 排除项是否挡住全局预算器、token/time/money threshold、固定调用次数、retry 上限和 runtime optimization policy；
6. 安全、证据、硬约束、unknown、回退和 owner 是否保留为承重关系；
7. 案例是否仍只是 source/设计观察，未被写成 behavior Run、matched、regression 或 acceptance。

## 3. Evidence and return

- 当前证据只支持 `source-current / reading-candidate / independent-review-complete / research-open / acceptance-pending`。
- [`planning/records/philosophy-p06-p11-boundary-review.md`](philosophy-p06-p11-boundary-review.md) 已有独立 review
  的 F1/F2/F3，但它只证明 P06/P11 阶段边界可观察，不能替 P11 reading review 或 acceptance。
- 若 P11 定义在真实 host case 中不能改变 owner、失败方式、回退或下一动作，回修 P11 或返回
  `no-proposal`；不为填满 P01–P16 而创建成本策略、skill 或新 source。
- 若通过 source/boundary review，standing 仍是 `acceptance-pending / research-open`；下一 return
  是相称的 domain/use case 或保持 candidate，不是实现 WorkCell。

## Independent review

独立 reviewer：`Tesla`（Agent `01a03813-7ef8-70e2-8fa6-cef9e385fa6c`）完成两轮只读复核。初轮指出
P06/P11 fixture 的 runtime 对象连续性歧义与 projection 缺口；Main 修订后，二轮确认 source、最近邻、
条件性对象边界、成本/实现越权和 current projection 成立。该 review 未修改文件，也未取得 reading acceptance。
