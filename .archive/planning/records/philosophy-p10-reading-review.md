# P10 reading candidate 的 source / boundary review

状态：`source-current / reading-candidate / independent-review-complete / research-open / acceptance-pending`；
本记录不是 P10 acceptance、WorkCell acceptance、runtime policy 或实现授权。

## 1. Review object

- **source：** `theory/philosophy.md` 的 `P10｜为之于未有，治之于未乱｜解决·时机`；source line 不可由本记录修改。
- **reading：** [`theory/philosophy/P10.md`](../../theory/philosophy/P10.md)；这是 source-bound candidate，不是 living source 或 runtime input。
- **关系：** P10 是解决阶段的介入窗口；P07 是分析入口；P09 是同范围内的局部主次；P11 是已接受方案的执行扰动/成本；P04 保持状态与未知诚实；P16 保持检验时点覆盖。
- **固定设计关系：** WorkCell 中同一条候选 Binding expiry/revocation 关系，沿 P07/P10 boundary review 的 F1→F2 条件性设计/standing 演化；具体 Binding identity 仍 unknown，不声称是同一 runtime object 的状态迁移，也不是把两个无关对象拼成一项证据。

## 2. Candidate contract to review

P10 的最小候选定义是：在外部已经给出相称对象、状态窗口、风险暴露、允许效果、owner 和接受边界
的前提下，只比较何时介入能够避免问题进入更难处理或更高风险的状态；“未有/未乱”是相对于当前
候选关系和可观察状态而言，不是普遍越早越好，也不跳过 source 或 effect boundary。

Review 必须检查：

1. “时机”是否真正改变当前介入窗口、可逆性、风险或下一处置，而不是只说“先做”；
2. P07 的“从哪里开始”是否仍与 P10 的“何时介入”可区分，且案例保持同一候选关系而不是假定同一 Binding 对象；
3. P09 的主次、P11 的执行扰动/成本、P04 的 unknown 和 P16 的检验时点是否没有被 P10 吞并；
4. hypothetical owner/protocol/effect/state window 是否明确保持条件性，不被写成当前事实；
5. 排除项是否挡住 fixed lead time、deadline、timeout、scheduler、cutoff、revocation policy 和自动 effect；
6. 案例是否仍只是 source/设计观察，未被写成 behavior Run、matched、regression 或 acceptance。

## 3. Evidence and return

- 当前证据只支持 `source-current / reading-candidate / research-open / acceptance-pending`。
- [`planning/records/philosophy-p07-p10-boundary-review.md`](philosophy-p07-p10-boundary-review.md) 已有独立 review
  的 F1/F2/F3，但它只证明 P07/P10 阶段边界可观察，不能替 P10 reading review 或 acceptance。
- 若 P10 定义在真实 host case 中不能改变 owner、失败方式或下一动作，回修 P10 或返回 `no-proposal`；
  不为填满 P01–P16 而创建调度机制、skill 或新 source。
- 若通过 source/boundary review，standing 仍是 `acceptance-pending / research-open`；下一 return
  是相称的 domain/use case 或保持 candidate，不是实现 WorkCell。

## Independent review

独立 reviewer：`Einstein`（Agent `01a03808-8ba7-7e02-b35e-1288c7ea6dae`）完成两轮只读复核。初轮指出
source anchor、P10 authority、候选关系/具体 Binding identity 和案例条件性四个缺口；Main 修订后，
二轮确认 source、最近邻、条件性边界、当前 projection 与实现冻结成立。该 review 未修改文件，也未
取得 reading acceptance。
