# P01/P03 reading candidate review

状态：`main-review-complete / independent-review-complete / acceptance-pending`；不是哲学源接受、theory 接受或
skill/运行时行为证据。P01/P03 父 item 的交叉关系已另行完成独立 review，见
[`philosophy-parent-review.md`](philosophy-parent-review.md)；这不关闭 P01–P16 父 item acceptance。

## Review scope

本轮检查：

- `theory/philosophy.md` 的 P01/P03 source line；
- `theory/philosophy/P01.md`、`P03.md` 两个 candidate；
- `theory/gene-expression.md` 的 entry、dimension、表达和生成边界；
- `theory/research/philosophy-gene-one.md` 的当前状态声明与历史审次分界；
- `theory/harness/iterative-improvement.md` 对 P01/P03 的下游解释。

本轮没有修改哲学源行，也没有把旧 archive interpretation 当作 current reading authority。

## Main source and boundary review

### P01

- **source fidelity：** candidate 指回 P01 当前源行，保留 `认识·来源`，解释为从对象实际
  材料出发寻求可支持的规律；没有把 P01 改写成调查数量、验证协议或权限规则。
- **nearest neighbors：** 已区分 P02 的调查资格、P04 的已知/未知表达和 P15 的实践检验；
  这三个邻居改变的是资格、边界表达和检验手段，不是 P01 的来源关系。
- **越权检查：** WorkCell 例子被标成生成性候选，没有声称协议接受、行为改善或 host authority。
- **当前 disposition：** `retain-candidate`，但仅限 reading candidate；还不能成为 accepted reading。

### P03

- **source fidelity：** candidate 指回 P03 当前源行，保留“实践—认识—再实践—再认识”的
  循环与深化；明确“下一判断因观察改变”，没有把次数、固定轮数、retry 或 runtime state
  当成 P03 本身。
- **nearest neighbors：** 已区分 P01 的来源、P15 的检验手段和 P16 的检验时点；P03 不取得
  acceptance authority，也不把记录数量当作改善。
- **越权检查：** WorkCell review 例子只说明可能生成的 practice-cycle，不是现有系统行为证明；
  `iterative-improvement` 只作为下游 theory owner，不被 P03 reading 取代。
- **当前 disposition：** `retain-candidate`，但仅限 reading candidate；行为 standing 仍为
  `adapt-and-retest`。

### 父 item 关系

P01 和 P03 可以分别形成 reading work package，但不能分别关闭父 item 的所有交叉关系。当前
共同 object identity 与 P01 source→P03 observation 的 scoped relation 已在
[`philosophy-parent-review.md`](philosophy-parent-review.md) 中完成独立 review，仍是
`cross-relation-observed / acceptance-pending`：

- P01 的“实际/来源”必须与 P03 的“实践产生观察”相接；
- P03 的“下一判断改变”必须继续交给 P15/P16 的证据与时点关系检查；
- 两个 reading 都不能取得 `theory/philosophy.md` 的 source authority。

## Evidence and acceptance boundary

- `git diff --check`、尾随空格检查、skill validator 只能支持机械/格式事实；
- Main 的 source/nearest-neighbor review 是生产者自审；本记录后续追加的独立 review 单独标注，
  不与 Main 自审合并；
- 独立 reviewer 已返回第三方 source fidelity 和边界 review，但没有 acceptance authority；
  因此最终 acceptance、named owner 和行为证据仍为 `unknown`；
- 没有行为 Run、匹配对照、采用后窗口或 regression observation，不能声称
  `behavior-observed`、`matched-improvement` 或 `regression-supported`。

本轮总处置为 `uncertain`：保留两个 candidate，不 rollback、不 move、不改源、不创建 skill，
也不把“没有发现 Main 自审缺陷”写成“已证明正确”。

## Return conditions

1. 在 P04/P15/P16 package review 中继续补做 P01/P02/P04 与 P03/P15/P16 的具体成对反例和交叉关系 review；
2. 保持共同 object identity 是 scoped inference，并用固定对象的四段案例展示 P01 source constraint
   如何进入 P03 observation/re-recognition，而不是把 source 直接转化成 observation；
3. 若接受 owner 缺失，继续保持 `acceptance-pending / unknown`；若新 review 发现语义越界，开新 candidate round，
   不倒写当前文件；
4. 只有明确 acceptance 后，才把 candidate 标为 accepted reading；任何下游 skill、WorkCell
   或 runtime 变化仍需各自 owner 和独立 evidence。

## Independent semantic review

reviewer：`Bernoulli`，Agent `01a03774-25f0-7870-8359-be79db614ce0`；未参与 candidate 生产，
未修改文件。该 review 只判断 source fidelity、最近邻、越权、父 item 关系和 disposition，不取得
哲学源、reading、theory、skill 或 runtime acceptance。

### 结论

- P01：`retain-candidate`。source fidelity 和基本边界成立；仍缺“有材料但调查不足”以及
  “材料存在但规律尚未成立”的成对反例，且需继续区分当前设计文本与 canonical fact。
- P03：`retain-candidate`。四段循环、排除重复实践和非-runtime 边界成立；“下一判断或行动
  改变才构成深化”是当前解释的操作化表达，不是 source authority，不能直接升级为通用 acceptance gate。
- P01/P03 父 item：`cross-relation-observed / independent-review-complete / acceptance-pending`。
  scoped object identity、P01 source→P03 observation 的固定案例已经形成并经独立 review；具体
  成对反例、完整 P01–P16 cross-relation 和 acceptance owner 尚未闭合。

### 必须保留的反例

1. 有对象材料但调查不足以取得发言资格；P01 不自动推出 P02；
2. 材料真实存在但规律尚未成立；P01 不自动推出 P04 的“已知”或 P15 的“已检验”；
3. 重复实践而结果和下一判断均未改变；不能称为 P03 深化；
4. 观察改变了判断但没有形成下一次实践；P03 四段关系尚未完成；
5. 检验时点已检查但下一判断没有变化；不能仅凭 P16 声称 P03 成立；
6. source、对象范围或 evidence contract 变化后仍坚持旧定义；应标 stale 并开新 review。

该独立 review 提升了 source/边界 evidence standing，但没有提升 acceptance 或 behavior standing，
也没有产生任何下游实现授权。

## P04 candidate independent source/边界 review

reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`）；只读、未参与 P04 candidate
生产、未修改文件，也没有 acceptance authority。

- **source fidelity：** P04 正确保留 `认识·已知边界`，把对象/关系/结论与当前证据是否足以称为
  已知区分开；没有改写 source，也没有把“知”变成置信度、评分、拒答或权限。
- **最近邻：** P01 的来源、P02 的调查/发言资格、P03 的实践—认识循环、P08 的问题/视域边界、
  P15 的实践检验均可区分；当前足以支持 `retain-candidate`。
- **unknown 边界：** 文本有效阻止万能免责、拒答 gate 和 acceptance rule；但必须明确可回返方向
  只是在需要交接的 planning/evidence context 中附加，不能成为 P04 语义成立的强制行动条件。
  route/stop 仍由下游 owner/protocol 决定；domain/use 的证据充分度与 acceptance owner 的接受
  决定也必须分开。
- **当前 disposition：** `retain-candidate`；standing 为 `source-current / reading-candidate /
  independent-review-complete / research-open / acceptance-pending`。没有 behavior、matched、
  regression 或 acceptance evidence。
- **最小修订与回返：** 上述 unknown/owner 边界已回写 P04；下一步在 P04/P15/P16 的具体成对案例
  中检查已知状态、检验手段、检验时点和下一判断是否混淆；不修改哲学源，不创建拒答机制或 runtime。

## P05 candidate independent source/边界 review

reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`）；只读、未参与 P05 candidate
生产、未修改文件，也没有哲学或 acceptance authority。

- **source fidelity：** P05 正确保留 `分析·特殊性`，将“具体”解释为对象、条件、关系和目的中
  会改变当前分析的差异；没有把它写成背景收集、无限定制或一般规律的否定。
- **最近邻：** P01 的来源、P04 的知识状态、P06 的删减、P07 的入口、P08 的问题边界和 P09
  的主次排序均可区分；P05 不取得 priority、route、acceptance 或 runtime 权。
- **必要修订：** 将“改变处置”改为“使下游 owner/protocol 重新评估处置”；将 WorkCell/replay
  例子标为 `design/fixture observation`；补一项承重条件改变分析、一项背景增加但判断不变的
  成对案例。上述修订已回写 P05。
- **当前 disposition：** `retain-candidate`；standing 为 `source-current / reading-candidate /
  independent-review-complete / research-open / acceptance-pending`。没有 behavior、matched、
  regression 或 acceptance evidence。
- **下一 return：** P05/P07/P09 与 P05/P08 的 C1-C4 父 item boundary review 已另行完成，见
  [`philosophy-p05-p07-p08-p09-boundary-review.md`](philosophy-p05-p07-p08-p09-boundary-review.md)；
  它在当时确认 P07/P08/P09 仍为 reading absent，不把关系 fixture 升格为 candidate；之后 P07/P08/P09
  已分别完成独立 source/reading review，关系 fixture 仍不取得 reading acceptance。后续若新增具体
  案例不能改变分析，回修或返回 `no-proposal`，不创建万能定制载体。
