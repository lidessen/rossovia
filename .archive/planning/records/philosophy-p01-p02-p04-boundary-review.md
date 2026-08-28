# 哲学序列父 item：P01/P02/P04 交叉边界 review

状态：`source-current / design-boundary-observed / independent-review-complete / acceptance-pending`；
不是新的哲学条目、source 行、reading acceptance、拒答规则或 runtime gate。

本记录承接 [`philosophy-parent-review.md`](philosophy-parent-review.md) 和
[`philosophy-p02-reading-review.md`](philosophy-p02-reading-review.md)，只处理认识阶段中三个
相邻关系：P01 的来源、P02 的调查资格、P04 的已知/未知。它不关闭 P01–P16 父 item 的最终接受。

## 1. 对象、来源与用途

- **父 item 对象：** 针对同一被处理对象或问题，分别判断认识从何处取得来源、何时取得证据性
  发言资格、以及当前哪些关系可以称为已知；三条 source line 是不同判断，不是三个互相竞争的
  对象。
- **P01 source：** `theory/philosophy.md` 的 `P01｜实事求是｜认识·来源`。
- **P02 source：** 同一文件的 `P02｜没有调查，没有发言权｜认识·证据`。
- **P04 source：** 同一文件的 `P04｜知之为知之，不知为不知｜认识·已知边界`。
- **关系来源：** `theory/gene-expression.md` 的“来源 → 证据 → 如实 → 已知边界”认识生成链；
  `theory/research/philosophy-gene-one.md` 对 P02 的 `察→断` 与三条不可约差异记录；reading
  files 只提供 candidate interpretation，不取得 source authority。
- **用途：** 判断一个 planning/evidence claim 在只知道 source 存在、已经调查但关系未定、或已有
  足够支持时应如何表述和路由；避免把三者压成“只要有材料就已知”或“未知就不得发言”。

## 2. 最小关系定义

临时 handle：`认识阶段的来源—资格—状态边界`。这是本轮 review 的 working designation，不提升
为哲学序列新术语。

1. **P01：来源。** 对象和相关材料必须被指认，认识从实际对象出发；这不保证材料已被调查、
   规律已成立或主张已检验。
2. **P02：证据资格。** 与当前断言相关的调查材料尚未取得、来源不明或调查不足时，只能报告
   局部观察、问题、假设或 unknown，不能把未经调查的结论作为证据性发言；这不禁止提问，也
   不取得权限或 acceptance。
3. **P04：认识状态。** 对象、关系或结论是否已被当前证据支持，决定它可以称为已知还是必须
   保留未知；这不决定调查资格，也不规定下一步、拒答或接受。
4. **关系方向：** P01 提供“正在谈什么、来源在哪里”的对象约束；P02 判断调查是否使某项
   断言获得相称资格；P04 再判断该断言在现有证据下属于已知还是未知。方向表示 source-backed
   reading inference，不是自动流程、严格 gate 或 runtime 因果保证。

## 3. 固定对象的 boundary fixtures

固定对象：**当前 WorkCell protocol 是否已经支持“Event 可重放”这一断言**。所有案例只使用
`design observation`，不把协议设计 candidate 当作 accepted protocol。

### F1：source 存在，但尚未调查

- **观察：** `design/work-cell-protocol.md` 文件存在；reviewer 尚未读取 Event 章节、当前 hash
  算法或真实 replay consumer 关系。
- **P01：** 可以指认 canonical design source 的存在；不能由文件存在推出其中具体 contract。
- **P02：** 尚未取得对“可重放”断言相关的调查资格；可以报告“需要核对 Event contract”。
- **P04：** “Event 是否可重放”保持 unknown；“文件存在”是局部观察，不是该关系已知。
- **排除误判：** 不把 archive 旧记录、文件名或 provider session 当作当前 protocol fact。

### F2：已经调查，但关系仍未成立

- **观察：** 已读取当前 Event 类型和相关章节，确认 typed observation 存在，但没有稳定 event
  identity、sequence、duplicate、gap、restart recovery contract，也没有 named replay consumer。
- **P01：** 实际 source 与当前设计缺口已被指认。
- **P02：** 取得了“当前 source 支持什么/未支持什么”的调查资格，可以断言 typed observation
  存在、replay contract 未定义；不能断言可重放。
- **P04：** “typed Event 存在”在该范围内可称为已观察/已支持事实；“Event 可重放”仍为 unknown。
- **排除误判：** 不把调查完成等同于结论已知，也不把 unknown 变成拒答或实现阻止门。

### F3：未来 contract fixture：调查与证据足以支持受限结论

- **对象状态：** F3 不是当前 WorkCell protocol 的事实，而是未来 contract 的条件性 fixture；当前
  仍没有 accepted replay contract 或 replay consumer。
- **观察：** 假设未来有 owner-backed replay contract、匹配 fixture 和独立 review，且它们明确
  支持某一限定 consumer、sequence、dedup、gap 和 restart scope。
- **P01：** 当前只能指回现有 source；若未来 contract 被正式采纳，限定结论还必须指向该 accepted
  contract，而不是只指向 provider trace。
- **P02：** 假设中的调查已足以取得该限定断言的证据性发言资格；这不等于访问权、权限、拒答或
  acceptance gate。
- **P04：** 只有在该 contract 被接受且匹配证据在范围内成立时，才可称为“该 consumer、该版本和
  该 scope 下支持 replay”；在此之前只能保留条件性 evidence-qualified claim，不能扩成所有
  consumer、永久 retention 或 runtime guarantee。
- **排除误判：** hypothetical fixture 只说明未来所需条件，不提升当前 WorkCell acceptance。

## 4. 最近对照与失败反例

| 对照 | 共享关系 | 真正改变判断的差异 | 失败处置 |
| --- | --- | --- | --- |
| P01 / P02 | 都涉及认识材料 | P01 问“材料/对象从何处来”，P02 问“调查是否足以取得断言资格” | 回到 source 或 evidence review，不把 P01 自动推出 P02 |
| P02 / P04 | 都处理证据不足 | P02 是资格，P04 是当前状态；调查完成仍可能留下 unknown | 分开记录 `investigated` 与 `known/unknown` |
| P01 / P04 | 都可能提到当前事实 | source 被正确指认不等于关系或规律已被证实 | 不把 canonical source 存在写成 accepted fact |
| P02 / P15 | 都可能要求调查/实践 | P02 判断发言资格，P15 判断实践检验手段 | 不把调查 review 写成真理检验或 acceptance |
| P04 / P08 | 都可能表达限制 | P04 是证据支持的认识状态，P08 是对象/问题视域边界 | 不把 scope 未定写成“我不知道”已解决 |

**反例：** 若 F1/F2/F3 互换后仍不能改变 claim strength、owner route 或下一行动，说明当前
定义仍没有承重区分；若只凭调查次数、文件存在或自然语言 confidence 改变已知状态，说明边界
被击穿；若 owner-backed contract 未来改变却沿用旧结论，应标记 affected reading stale 并回返。

## 5. 当前结果与允许范围

- P01、P02、P04 继续分别保留为 reading candidate；P02 的独立 source/边界 review 已完成。
- 本组关系当前为 `design-boundary-observed / acceptance-pending`；它不形成 P01/P02/P04 的
  reading acceptance，也不关闭父 item。
- 允许：source-linked reading、父关系 fixture、claim strength/unknown/owner route 的 planning
  projection；不允许：修改 P source、创建拒答 gate、调查队列、权限、runtime 或 acceptance
  机制。
- 仍未知：不同 domain/use 的“相关调查”最小范围、直接/间接证据的权重、冲突证据的处理、named
  acceptance owner，以及该关系对 Agent 行为选择的独立效果。

## 6. Independent semantic review

独立 reviewer：`Pasteur`（Agent `01a03792-35c1-72c2-9871-07b9b2d108a3`）；未修改文件，也未取得
哲学 source、reading、theory、skill、协议或 acceptance 权。

- F1/F2 确认 P01=source、P02=有限证据性发言资格、P04=known/unknown 的区分；
- 确认 P02 没有被写成拒答、权限或 acceptance gate，P15/P08 最近邻仍然分开；
- 指出 F3 需要保持当前对象身份，不能把 future contract 当作当前 authority；修订后 F3 已明确为
  条件性未来 fixture，并区分 evidence-qualified claim 与 accepted contract scope 内 known；
- 确认没有新增机制、拒答规则、权限、runtime 或 acceptance。

当前关系 standing 为 `design-boundary-observed / independent-review-complete / acceptance-pending`。

## 7. Evidence standing 与下一 return

当前证据仅为 `design-boundary-observed`；F1/F2 是当前 source-linked planning fixture，F3 是
条件性未来 contract fixture。没有 behavior Run、匹配对照、regression 或哲学 acceptance。

下一项最小实践：由独立 reviewer 检查 F1–F3 是否保持三条关系的身份与状态边界；随后在一个
真实 domain/evidence case 中观察“调查完成但结论仍 unknown”是否改变 claim strength 或 owner
route。若不能改变实际判断，回修 P02 或返回 `no-proposal`；若能改变，再补具体 domain/use 的
证据范围，不把它扩成全局调查流程。
