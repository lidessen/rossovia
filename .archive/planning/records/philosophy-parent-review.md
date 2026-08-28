# 哲学序列父 item：P01/P03 交叉关系 review

状态：`source-current / cross-relation-observed / independent-review-complete / acceptance-pending`。
本记录审查 P01 与 P03 在同一哲学序列父 item 中的关系；它不是新的哲学条目、source 行、理论、
skill 载体或 runtime 规则，也不关闭 P01–P16 父 item 的最终 acceptance。

## 对象、来源与用途

- **父 item 对象：** 问题处理领域中，对同一被处理对象/问题连续形成认识的来源—深化关系；
  P01 与 P03 是这个父 item 的两个有顺序差异的 reading work package，不是两个互相替代的
  canonical 对象。
- **P01 source：** [`theory/philosophy.md`](../../theory/philosophy.md) 的
  `P01｜实事求是｜认识·来源`。
- **P03 source：** 同一文件的 `P03｜实践、认识、再实践、再认识｜认识·深化`。
- **关系来源：** [`theory/gene-expression.md`](../../theory/gene-expression.md) 的“认识问题：
  来源 → 证据 → 如实 → 深化 → 已知边界”生成链，以及其中“一”是对象同一性、条目只是对象
  的不同视角的约束；[`theory/harness/iterative-improvement.md`](../../theory/harness/iterative-improvement.md)
  只作下游方法解释，不反向取得哲学 source authority。
- **具体用途：** 判断 P01/P03 是否可以分别保留为 reading candidate，怎样把 P01 的来源关系
  接到 P03 的新观察，又不把“来源、检验、已知、深化”合并成一个泛化的迭代口号；结果供
  `coverage-audit.md`、`philosophy-reading-review.md` 和后续 P04/P15/P16 review 回读。

## 最小关系定义

临时 handle：`认识阶段的来源—深化关系`。这是本轮 review 的工作指称，不提升为哲学序列新
术语或正式条目。

1. **共同 object identity：** 在本 review 的限定范围内，同一问题处理对象先提供实际材料；认识依据材料形成当前规律/模型，
   再由实践回到该对象并产生新观察；对象未改变时，变化的是认识与实践关系，不是凭文字新造
   一个对象。这个共同身份是由 `gene-expression.md` 的“一/同一对象”与 P01/P03 所处环节
   推出的 scoped inference，不是哲学 source 直接宣告 P01/P03 永远共享一个对象。若对象范围
   或用途改变，必须重新问题化，不能沿用本关系。
2. **P01 的位置：** 规定认识从哪里开始——对象实际呈现的来源材料不能被本本、偏好或预设
   结论替代；它不保证材料已经足够、规律已经成立或主张已经检验。
3. **P03 的位置：** 规定认识如何在实践与新观察之间深化——实践产生回到对象的观察，再认识
   修正当前理解，并使下一实践不同于原实践；它不规定固定轮数、自动循环或 acceptance。
4. **P01 → P03 的关系：** P01 提供“观察必须回到实际对象”的来源约束；实践作用于同一对象
   并产生新观察，P03 再规定观察如何修正当前认识并改变下一实践。这里的箭头表示来源约束
   与观察回返关系，不表示 P01 source 直接转化成 P03 observation，也不表示 P01 产生了 P03
   的循环机制。P03 不是“重复执行 P01”，P01 也不是 P03 的一次已完成实例；二者共享对象，
   但主要判断、失败方式和最近邻不同。

这只是 source-backed 的语义关系，不是运行时因果保证，也不是说任何 planning round 都已经
实现 P03。

## 固定对象的生成性四段案例

以下案例只验证“P01 来源约束如何进入 P03 的观察—再认识关系”，不验证 reading acceptance，也
不把下游 WorkCell 设计变成哲学 source。固定对象是：**当前 WorkCell Event 观察面是否因一个
真实跨进程 replay consumer 而需要 replay semantics**。

1. **P01 / source recovery：** 当前 `design/work-cell-protocol.md` 与 C/D review 只支持“Event
   有类型、sequence/duplicate/gap/replay contract 尚未定义、真实 replay consumer 尚未命名”；
   因此当前判断保留 observation surface 与 unknown，不把 event bus、lineage registry 或
   provider session resume 当作事实。
2. **practice：** mechanism round-1 的 M1/M2 是同一设计对象的边界 probe：M1 明确给出跨进程
   replay/recovery consumer 前提，M2 明确没有该 consumer。两案 raw output 都把前提与建议分开，
   不把未来需要写成当前机制。
3. **new observation / re-recognition：** M1 使 durable replay/lineage 成为条件性 mechanism
   candidate，并暴露 consumer、retention、cursor、recovery granularity 和 acceptance owner
   未知；M2 保持 `no-proposal`，说明没有 consumer 时不应新增 bus/store/registry。由此下一判断
   从“是否更可靠就加机制”改为“先命名 consumer/owner，再比较 observation-only 与机制候选”。
4. **next practice：** 若出现 named consumer，则对 normal/duplicate/out-of-order/gap/post-restart
   fixture 做 owner-backed contract review；若仍无 consumer，则继续保留 observation-only contract
   与 unknown，不进入实现。这个下一实践的选择由新观察改变，才是 P03 的生成性使用例。

该案例的 `design observation`、runner 限制与独立 semantic review 见
[`mechanism-design-review-round-1.md`](mechanism-design-review-round-1.md)；它只能支持下游
planning 的 bounded observation，不能反向提升 P01/P03 的哲学 acceptance。

## 包含、排除、最近对照与反例

| 探针 | 关系上应成立的判断 | 越界或失败时的处置 |
| --- | --- | --- |
| 包含 | 有明确对象材料，从材料提出当前理解；实践结果回到同一对象，观察改变下一认识或实践 | 可作为 P01→P03 的生成性例子，但仍不是 reading 的行为 acceptance |
| P01 邻近排除 | 材料存在但调查不足以取得发言资格：P01 不自动推出 P02；材料未支持规律：P01 不自动推出 P04 的“已知”或 P15 的“已检验” | 路由回 P02/P04/P15 的相应 reading/父 item review |
| P03 邻近排除 | 观察改变了认识但没有形成下一实践，或重复实践没有改变下一判断：都不足以称为 P03 深化 | 保留 `incomplete / uncertain`，不以轮数或文字记录补齐 |
| 最近对照 | P01 与 P03 共享“同一问题对象”和认识阶段；P01 的差异特征是来源，P03 的差异特征是实践—认识往复及方向性 | 若差异不能改变路由或解释，考虑合并为 reading 关系；当前证据仍支持分别保留 |
| P03/P15/P16 对照 | P03 关注观察怎样改变下一认识/实践；P15 关注检验手段；P16 关注检验时点；三者不能互相取得 acceptance 或完整回归语义 | 保持父 item 交叉 review，不把 iterative theory 写回哲学源 |
| 反例 | 对象材料、对象范围、实践结果或 evidence contract 发生变化，仍沿用旧关系；或把 P01/P03 的下游生成例子写成 source 事实 | 标记 stale，重建 affected reading/review；不倒写旧 record |

## 当前审查结果

- P01：继续 `retain-candidate`；来源关系可与 P03 相接，但“材料不足”“规律未成立”的边界不
  取得 P01 之外的 authority。
- P03：继续 `retain-candidate`；其四段顺序与“下一判断必须改变”的操作化边界可与 P01 相接，
  但不取得 behavior、acceptance 或 runtime guarantee。
- 父 item 的这一对交叉关系：`cross-relation-observed / independent-review-complete / acceptance-pending`。
  当前没有依据把 P01/P03 标成 accepted reading，也没有依据关闭 P01–P16 父 item。
- 处置：`continue`。具体成对边界案例已补入
  [`philosophy-p01-p03-counterexample-fixture.md`](philosophy-p01-p03-counterexample-fixture.md)，并完成
  fixture-level 独立 review；它支持检验 reading 路由，但不取得 reading acceptance、behavior 或
  runtime guarantee。不是扩写新的哲学条目或创建新 skill。

## 权威、允许范围与未知

- `theory/philosophy.md` 仍是 source authority；本记录只拥有本轮 planning review projection。
- `theory/gene-expression.md` 仍是术语和层级关系 authority；research record 只提供来源历史、
  争议和未知；`P01.md`/`P03.md` 是 candidate readings。
- 允许：source-linked reading、交叉关系 review、反例、下游 owner routing 和 evidence standing
  projection。
- 不允许：修改 P source、把 P01/P03 变成 skill/runtime gate、把 planning round 的格式或成功
  说成哲学接受、替代 P15/P16 的独立 review、或借父关系授权 WorkCell/DeepSeek/base 实现。
- 仍未知：父 item 的 named acceptance owner；P04 及 P15/P16 的完整 cross-relation；该区别对
  Agent reading 选择的行为影响；父 item 的最终接受标准。

## Independent semantic review

reviewer：`Bernoulli`（Agent `01a03774-25f0-7870-8359-be79db614ce0`），未参与本记录生产，未修改
文件。独立 review 确认：共同 object identity 是有来源支撑的 scoped inference，不是 source fact；
P01→P03 是来源约束与观察回返，不是 source 的直接转换；P01/P02/P04/P15 与 P03/P15/P16 的
主要邻近区别成立，但当前反例仍多为抽象关系，不能升格为 accepted reading。

独立 review 的必要修订已吸收：明确 conditional identity、补充固定对象的四段案例、保留
`iterative-improvement` 的下游 authority，并将 M1/M2 只作为生成性 planning observation。当前
standing 仍为 `cross-relation-observed / independent-review-complete / acceptance-pending`，
named acceptance owner 仍 unknown。

## 下一轮 return condition

1. 在 P02/P04/P15/P16 review 中回读并补具体成对边界案例：有材料但调查不足、材料未成规律、观察
   改变认识但没有下一实践、检验时点完成但下一判断不变；P01/P03 fixture 已提供当前相称的
   路由基线，不把它升级为这些 reading 的 acceptance；
2. 若新的 review 发现关系不足，保持 `acceptance-pending` 并在对应 package 中
   追加反例；若发现合并或拆分理由，则开新 candidate round，不改旧记录；
3. 只有 named acceptance owner 依据 source/reading rubric 明确接受后，才更新 P01/P03 和父
   item standing；在此之前继续保留 `retain-candidate`。
