# Protocol projection 独立审查：第二轮

**审查模型：** gpt-5.6-luna
**审查日期：** 2026-08-24
**审查身份：** 未参与协议修订或第一轮审查的独立静态 reviewer
**审查性质：** 只审查语义投影、记录边界和 standing；不运行 trial，不把字段存在当作行为证据。

## 范围与结论

本轮完整读取 `AGENTS.md`、`theory/harness/iterative-improvement.md`、
`experiments/skill-evaluation/protocol.md`、`trial-manifest.md`、`trial-ledger.md`、
`holdout-registry.md` 和第一轮 `reviews/protocol-projection-review.md`。第一轮报告提出的
四类缺陷见 `reviews/protocol-projection-review.md:43-90`。

**静态处置：`accept`。** 当前协议已把 living theory 的条件性语义投影成 core card、条件模块、
sealed registry 和追加 ledger；四类第一轮缺陷均有对应的结构性修订。这里的 `accept` 只表示
作为 workflow projection 的静态形式可以接受，不表示协议已经执行可靠、记录真的不可变、holdout
真的未泄漏，或任何 skill 已有行为改善。

**行为处置：`adapt-and-retest`。** 仍需用真实低风险与高风险 trial 验证裁剪比例、封存访问、
冻结时点、standing 处置和普通 skill 自足。当前文档不能推出 `matched-improvement`、收敛、采纳
或 runtime 效果。

## 第一轮四类缺陷复核

| 缺陷 | 静态判断 | 当前证据 | 遗留未知 |
|---|---|---|---|
| 1. 低风险试验被巨型 schema 仪式化 | **yes / uncertain** | `protocol.md:43-60` 将 core card 与 discovery、confirmation/fresh holdout、adoption-window、ablation、stale/recovery 分成条件模块；只在 card 选择 `enabled` 时复制模块，disabled 模块不出现，也不逐字段写 `N/A`。`trial-manifest.md:3-9,41-51` 规定冻结时一次选择 phase，裁剪只记录一次理由。这实现了理论要求的风险裁剪，而非把“记录较少”改成大量空表。 | 未知真实操作者是否仍把模板全量复制，或接受者是否用成本预算实际裁剪；需要相称风险等级的实际 card 样本。 |
| 2. holdout 身份与操作者缺少真实封存边界，不能靠 prose 假装保密 | **yes / uncertain** | 主 card 只保留 opaque commitment、选择规则和 owner，题目 identity 留在独立 registry（`protocol.md:50-53`; `trial-manifest.md:99-105,126-131`; `holdout-registry.md:1-6`）。registry 明确 prose 不能强制保密、不可见或不可变；封存、访问控制、审计和锁定必须由真实机制提供，不能核验时写 `unknown`，不得以自报未见支持 fresh 或 matched 泛化（`holdout-registry.md:8-12,14-24`）。结果锁定后才 reveal/hash，并保留访问、泄漏、作废与 rerun 关系（`:26-45`）。 | 当前没有行为证据证明存储/权限/runner 真正封存、操作者无法读取 identity，或访问日志覆盖完整；机制未知时只能保持 `unknown`，不可升级 standing。 |
| 3. acceptance card、运行后历史、输入/输出 hash 时点混淆 | **yes / uncertain** | pre-run manifest 是冻结前一次性 core card，treatment、结果暴露或调参前记录 freeze event 与 snapshot hash；冻结副本不可编辑，规则或 phase applicability 改变须开新 round（`trial-manifest.md:1-9,11-21,82-88`）。协议明确 candidate input hash 在冻结时写 card，baseline/treatment output hash 只能在 ledger 追加，二者不能混为 artifact（`protocol.md:31-41`）。ledger 只接收冻结后的事件并用 card snapshot hash 链接；entry 有 event/time/appender、previous hash、record hash 和 append mechanism，机制不能核验则写 `unknown`（`trial-ledger.md:1-18`）。运行 entry 进一步分开 candidate input、run configuration、output artifact、terminal-state/log hash（`:20-29`）。 | 文本无法证明快照存储真的不可写、append mechanism 真的 append-only，或 appender/权限不会回写历史；这些未知会限制 process 与归因 standing，但协议已禁止把 prose 当机制。 |
| 4. standing 被误写成 `format → behavior → matched improvement` 线性链 | **yes / uncertain** | `protocol.md:75-86` 把基础归因限制为 `format-valid`、`behavior-observed`、`matched-improvement`，把 `boundary-supported`、`regression-supported`、`combo-only` 作为可并存且不排序的 qualifiers；明确局部 boundary/regression 可存在而无 matched improvement，format 只证明机械格式，behavior 只证明观察。旧协议的线性写法只保留为历史身份，不倒写。 | 实际 reviewer/ledger appender 是否仍按旧直觉排序，需行为 probe；没有 trial 证据证明 qualifier 未被错误升级为净改善。 |

**四项结论：** 第一轮的静态缺陷均已关闭；四项的行为成立性均为 `uncertain`，不是文档 `yes`。

## 其他要求

| 审查项 | 判断 | 证据与评价 |
|---|---|---|
| 与 living theory 的投影关系 | **yes / uncertain** | `protocol.md:3-11` 明确本文件是 `iterative-improvement.md` 的 workflow projection，不是第二份 theory；理论拥有对象、证据和接受关系，协议只冻结、运行、记录和返回。理论明确字段/存储属于 protocol，低风险对象可裁剪 phase（`theory/harness/iterative-improvement.md:23-25,107-109,122-124`）。但协议与理论仍有必要的语义重述，未来仍有漂移风险，须由行为与版本检查维护单向关系。 |
| 普通 skill 使用是否自足 | **静态 yes / 行为 uncertain** | `protocol.md:13-15` 明确普通使用者只消费已内化方法，不回读 P、theory、research 或 protocol；维护、诊断和再生才沿链接追溯。安装、发布、权限升级、跨进程持久化等不被本实验冒充为证明。协议也把 baseline/treatment 的一次激活与安装/权限/持久化边界分开（`:31-37,58-60`; `trial-manifest.md:53-61`）。 | 尚未知每个普通 skill 激活都实际不回读上游，需独立的 fresh-agent 行为 probe；文档声明不是行为证据。 |
| 历史记录与当前协议是否区分 | **yes / uncertain** | 历史 baseline 明确是当时来源身份；旧 manifests/runs 继续保留，不能因协议更新取得新的 standing（`protocol.md:17-29`）。冻结 card、artifact、run、review、disposition 不倒写，新认识追加 ledger 并保留 supersedes/stale/recovery/rerun 血统（`:93-103`；`trial-manifest.md:1-6,126-131`；`trial-ledger.md:3-5,87-100`）。旧 standing 的线性写法也只作为历史身份保留（`protocol.md:83-86`）。 | 未知历史文件是否真的受到文件权限/提交边界保护、未来 reviewer 是否会误把旧记录当当前 evidence；须靠 history-facing review 和实际追加检查验证。 |
| acceptance card 与采用权威 | **yes / uncertain** | core card treatment 前记录 Principal/受托接受者及权限（`trial-manifest.md:13-21`），结果和处置进入 ledger；协议明确接受者仍拥有最终采用权，review 不能替代 Principal（`protocol.md:75-91`; `trial-ledger.md:68-85`）。 | 未知接受者是否在结果可见前实际冻结 card、以及是否在 card 外另设门槛；若发生，必须新 round 或 `uncertain`。 |
| 污染、stale、recovery 与证据降级 | **yes / uncertain** | upstream edge list 要求覆盖 P/theory/protocol/skill/fixture/rubric/任务/工具/runner/harness/结果并区分 byte hash 与 semantic standing（`protocol.md:62-68`; `trial-manifest.md:63-80`）。ledger 记录匹配逐项状态、责任 owner、影响、修复和 rerun，并把污染至少降为 `behavior-observed`，无法判断为 `uncertain`（`trial-ledger.md:31-39`）。stale/recovery entry 保留旧 entry、恢复锚点、新 card、fresh 刷新和 rerun（`:87-94`）。 | 当前只证明记录关系被声明；未知实际 edge 覆盖、污染发现延迟、恢复顺序和旧结论是否真正 stale。 |
| outcome/process/balancing 区分 | **yes / uncertain** | protocol 要求 ledger 分别记录三类向量，不以记录量或事后总分代替（`protocol.md:62-73`）；ledger 有分开的 outcome、process、balancing 区段（`trial-ledger.md:41-66`）。 | 未知 trial 是否真的记录目标行为、边界/回归、成本和 reviewer 分歧，而非只填格式字段。 |
| disposition 与 standing 的关系 | **yes / uncertain** | disposition 在协议中是互斥证据处置而非 runtime 状态，接受者拥有最终采用权（`protocol.md:88-91`；`trial-ledger.md:75-85`）。standing 是基础归因加独立 qualifiers，不能用格式、边界或回归自动代替 matched improvement（`protocol.md:75-86`）。 | 未知实际 appender 是否只写一个 disposition，或在 matched 缺失时仍错误 adopt；需污染与负结果 probe。 |

## 非阻塞改进与保留边界

1. 条件模块目前已解决比例问题；后续应保留“disabled 模块不出现”的约束，避免新模板再次扩张成
   全量 schema。若某个对象的 phase 适用性改变，必须引用旧 snapshot 开新 round，而不是在原 card
   内把模块从 disabled 改为 enabled。
2. sealed registry 的 `unknown` 分支是必要的诚实边界，不应为了获得 `fresh` 名称而补写假封存机制。
   只有真实存储、权限、审计和 runner 证据出现后，才可提高 holdout standing。
3. candidate input hash、run output hash、terminal-state/log hash 现在按时点分开；未来新增 hash 字段
   仍需注明是 treatment 前身份、运行中配置还是运行后结果，避免恢复第一轮歧义。
4. standing 的非线性表达应保持为结构化字段而非 prose 同义词；不要再把 qualifier 组合成总等级。
5. 普通 skill 的上游不回读边界与评估维护追溯边界要继续分开：普通激活只消费已内化方法和任务事实，
   protocol/ledger 仅供维护、诊断和再生使用。

## 静态证据上限

静态审查最多支持：

- 当前协议是 living theory 的 workflow projection，而不是第二份 theory；
- 低风险 trial 可以只保留 core card，条件 phase 可按对象风险启用；
- holdout 的身份、封存机制和结果 reveal 在结构上分离，且无法核验时明确 `unknown`；
- acceptance card、运行 output、历史 event、stale/recovery 和 rerun 具有不同载体与 hash 时点；
- standing 由基础归因与可并存 qualifier 表达，不预设线性升级；
- 普通 skill 不被当前协议要求回读 P/theory，历史记录不因当前协议自动获得新 standing。

静态审查不能支持：

- 真实 card 确实在 treatment 前冻结且不可编辑；
- 真实 registry 确实封存、访问者没有看见 holdout identity、日志没有缺失；
- input/output hash 与历史追加确实由不可变机制保护；
- reviewer、runner、appender 真正遵守角色隔离和非线性 standing；
- 普通 skill 实际激活自足，或任何 candidate 产生 matched improvement、收敛、adopt 或 runtime 效果。

因此，行为证据的最高当前 standing 仍是可检验的 protocol projection；不得把字段完整、结构通过或
本报告本身写成行为有效性。

## 最终建议

**静态 projection：`accept`。** 第一轮四类缺陷已在当前协议、manifest、ledger 和 optional sealed
registry 中获得对应修订，暂无静态阻塞项。
**行为有效性：`adapt-and-retest`。** 后续以不同风险级别的实际 card、真实封存/不可封存分支、污染和
历史追加、非线性 standing 处置及 fresh-agent skill 激活做独立 probe；在这些 probe 通过前，不得
声称匹配改善、长期收敛、接受或 runtime 保证。

## Main 接受记录

**接受时间：** 2026-08-24  
**处置：** `accept` 当前 protocol projection；行为仍为 `adapt-and-retest`。

Main 接受本报告对静态投影的有限结论：第一轮四项结构缺陷已经关闭，当前
`protocol.md`、`trial-manifest.md`、`trial-ledger.md` 与 `holdout-registry.md` 可作为下一轮试验的
现行记录方法。该接受不倒写历史 trial，不声称真实冻结、封存、独立性、matched improvement、收敛或
runtime 性质；这些主张仍须由相称的实际试验和独立评审建立。
