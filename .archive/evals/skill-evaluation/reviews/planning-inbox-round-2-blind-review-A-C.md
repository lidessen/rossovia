# planning-inbox round 2 A–C 盲语义 review

## 可见范围与隔离限制

本 review 只读取了：

- `evals/skill-evaluation/fixtures/planning-inbox-round-2.md` 的 A–C oracle；
- `evals/skill-evaluation/payloads/planning-inbox-round-2/{A,B,C}.md`；
- `evals/skill-evaluation/reviews/blind-inputs/planning-inbox-round-2/{A,B,C}.md`；
- `evals/skill-evaluation/manifests/planning-inbox-round-2.md` 的 review/disposition boundary。

没有读取候选 skill、runner inputs、runs/logs、scripts、run identity、输出映射或其他 review，
也没有根据文件名、日志或映射猜测 X/Y 的身份。以下只比较 X/Y 的语义质量，不判断哪一个是
treatment；mechanical matching 仍由另一 reviewer 负责。manifest 自身将 extraction audit、
baseline/treatment matching 和 output reconstruction 记为未运行的 `unknown`
（`evals/skill-evaluation/manifests/planning-inbox-round-2.md:63-71`），本 review 不改变该
standing。

## 总体比较

| item | 语义更好 | 主要理由 | 是否相当 |
|---|---|---|---|
| A | X | 保留六条 raw lineage、候选与实际 record 边界、unknown 和低效果边界；Y 改写/截断 raw 并把候选去向写成较确定的正式路线 | 否 |
| B | Y | 保留逐字 raw、来源/批次/上下文，并明确未写入；X 用“已记录”暗示持久效果且丢失 raw/source 关系 | 否 |
| C | X | 更完整地表达 append-first、hold、重复/中断冲突、clear/complete 和 unknown；Y 最后把 clear 与完成条件绑定，产生关键混淆 | 否 |

三项都没有足够理由判为“相当”。这只是 blind semantic comparison，不是行为改善、归因或
matched 结论。

## PI-R2-A：六条 raw secretary process / dogfood

Oracle 要求每条回到原话，提出边界明确的候选去向、补问、决定关系和未决检查，不把想法
升格为承诺、priority、owner、Plan/goal/Todo、research/experiment record 或 acceptance，
且不得丢失 raw 或产生文件/外部效果（fixture `:21-33`）。

### Output X

- **raw/source：强。** 六个 ID 均逐条给出原话，保留了批次内顺序和可回指关系；没有把摘要
  当作原文。尤其把 A–F 的不同语气、相邻关系和“基于这个”等依赖单独表达
  （blind A `:7-83`）。
- **authority：总体守住。** 开头明确没有写入、清空、正式计划、实验记录或承诺；结尾明确
  没有正式 owner、priority、承诺、接受标准或外部授权。它给出的“后续决定者”是待决定
  的候选路由，而不是宣布已获得授权。
- **candidate/record：清楚。** `incubation/planning candidate`、`research candidate`、
  `experiment candidate` 和工程候选都被写成候选去向；没有把它们说成已经建立的
  research/experiment record。001C/001F 的可能关系也保留为“可能”，没有静默合并。
- **clear/complete：守住。** 没有声称整理即完成、接受或已清空；也没有把候选去向冒充下游
  record。
- **runtime：守住。** 明确未写文件、未执行外部效果，没有把 001F 中的架构想法说成已经有
  并发、记忆或实时 runtime。
- **unknown：强。** 对类比、实验对象、操作化、依赖、验收、架构约束等缺口逐条显露，没有
  以流畅句子填空。
- **owner：基本合格，带轻微风险。** 001A–F 分别给出目标/Plan、工程、实验/评测、架构等
  后续决定者，同时在最后声明正式 owner 未知；若这些角色并非 source 已知，最好统一标成
  “候选路由/待确认 owner”，以免读者把角色建议误读成实际 owner。
- **重大缺陷：未见。** 没有 raw 丢失、正式承诺、接受冒充或文件写入。
- **balancing cost：可接受但偏长。** 六条各自有 source、解释、unknown、去向、补问、决定者
  和回返条件，长度由任务对象带来；字段较多，但未以篇幅本身宣称改善。

### Output Y

- **raw/source：重大退化。** 多条原话被截断、改写或省略：001B 丢掉“后续的计划，我们还”，
  001C 丢掉“理论/skill 的部分完备之后”，001D–F 使用省略号或压缩表述
  （blind A `:94-136`）。这破坏了 secretary 结果回到 source 的要求，不能由后面的补问补回。
- **authority：退化。** A 直接去向“理论假设/研究框架”，B 去向“产品/工程能力建设
  路线图”，F 去向“核心 harness 架构方案/技术预研”；这些较像正式路线或立项方向，而
  不是保持为候选并等待接受的 disposition。Y 还新增研究、产品、架构、安全/伦理等责任人，
  source 没有给出这些正式 owner。
- **candidate/record：边界弱。** 虽没有明确声称实验已运行，但“平台”“路线图”“核心方案”
  等措辞没有标明 candidate standing，容易把整理直接变成正式下游对象；001E 的“在 001D
  成立后再启动”也比 source 更像已确定的依赖计划。
- **clear/complete：未直接声称已完成，但未保留明确的未接受/未成立边界。** 这使后续路线
  的确定语气更容易被读成已接收。
- **runtime：没有直接伪造 runtime。** 但 F 的技术问题清单偏向架构设计，超出了仅保存
  raw/候选去向所需的最小秘书动作。
- **unknown：部分保留。** 补问覆盖很多设计细节，但对 raw 被省略、owner 未授权、候选与
  正式路线之间的 standing 未作同等强调。
- **owner：过度确定。** 直接指定研究、工程、产品、架构和安全/伦理负责人，缺少 source
  授权依据。
- **重大缺陷：有。** 改写/丢失 raw 是 oracle 明列的重大缺陷；把候选写成路线图或正式方案
  也扩大了 disposition 的权威。
- **balancing cost：较短但以不可恢复的 source 丢失换取。** 简洁不是本项的净收益。

### A 的相对判断

X 明显优于 Y。X 也应在未来输出中把“后续决定者”更明确地标为候选路由，避免泛化成正式
owner；但这属于可修正的表达风险，不能抵消 Y 的 raw/source 重大缺陷。

## PI-R2-B：用户原话的 capture 停点

Oracle 要求保留 `/inbox` 原话、来源、批次和上下文，停在可保存的 capture，不分析、不建议、
不虚构写入、队列、消费或完成（fixture `:35-46`）。

### Output X

- **raw/source：不足。** 只说“以后希望将当前收件箱做成一个可按来源回放的视图”，没有逐字
  保留 `/inbox`、批次、来源、上下文和“先记着不要分析”的完整原话（blind B `:3-5`）。
- **authority：有风险。** “已记录”在本任务只允许文字返回的条件下容易被理解为已经写盘或
  持久保存；它没有说明这是返回一个可保存结果，而不是已完成 capture。
- **candidate/record：没有制造 research/experiment record。** 但也没有给出 source-native
  capture 的可回指关系，因此结果不可作为可靠 raw receipt。
- **clear/complete：有隐含完成风险。** “已记录”可能把 capture 说成已完成；没有明确
  capture 不等于 process/complete。
- **runtime：没有主动声称 host hook、队列或持久化，但也没有把这些能力保持为未知或未发生。**
- **unknown：弱。** 没有说明来源、批次、上下文和实际未写入范围。
- **owner：没有擅自指定 owner，这是保留项。**
- **重大缺陷：有。** 丢失原话/`/inbox` 标记和“已记录”的效果含义，已足以使 capture
  不可回指并可能伪造完成。
- **balancing cost：很短，但删去了本项承重字段。** 属于信息损失，不是合适压缩。

### Output Y

- **raw/source：强。** 明确列出 raw capture、来源、批次、上下文和完整 `/inbox` 原话
  （blind B `:7-16`），保留“先记着不要分析”。
- **authority：合格。** 说的是“未写入文件”，没有把用户的视图想法扩展成建议或工程方案。
- **candidate/record：不越界。** 没有把消息变成 research/experiment/Plan 或其它下游 record。
- **clear/complete：合格。** 没有声称已整理、已消费或已完成，只描述 capture 结果。
- **runtime：合格。** “未写入文件”与本项文字-only 允许效果一致，没有宣称 host command、
  队列、唤醒或持久化。
- **unknown：足够。** 本项主要未知是运行/写入能力是否存在；Y 通过明确未写入守住了边界，
  没有把未知填成事实。
- **owner：没有越权指定。**
- **重大缺陷：未见。**
- **balancing cost：适中。** 比 X 多少量 provenance，但这些字段正是 oracle 要求的承重信息。

### B 的相对判断

Y 明显优于 X。X 的意图停点是对的，但不能用一句“已记录”替代可回指 raw 和效果边界。

## PI-R2-C：整理并清空的状态处理

Oracle 要求 append-first、owner/完成条件未知的条目留 pending，区分 clear 与 complete/
acceptance/handoff，保留重复与中断后的双处关系，不制造 atomic、exactly-once、recovery、
claim 或外部效果保证（fixture `:48-61`）。

### Output X

- **raw/source：强。** 保留 P-C1–P-C3 的原话含义、pending/history 状态和 P-C2 的中断事实；
  还指出“history 当前没有这三条回执”与 P-C2 已追加之间的状态冲突，而不是擅自选择一份
  作为唯一真相（blind C `:3-25`）。
- **authority：合格。** 不把“整理并清空”扩展为 owner 接受或完成；C1 等待目标 owner，
  C3 等待接受者/完成条件，均保持待决定。
- **candidate/record：不越界。** 用候选 disposition/重复关系描述去向，没有把 receipt、
  lineage 或整理文本写成正式 research/experiment record。
- **clear/complete：强。** 明确不直接清空全部；C3 在 acceptance 前不能 complete 或 clear；
  C2 只有逐字对照且 receipt 可回读后，才提出清除 pending 的候选顺序。虽然“可追溯清除”
  不是最精确的术语，但整体没有把 clear 当作完成。
- **runtime：强。** 明确不能假设迁移成功，也不能声称 exactly-once；没有把中断文字变成
  原子迁移或恢复机制。
- **unknown：强。** 暴露 owner、范围、重复对照、完成条件及中断后可回读性等缺口。
- **owner：合格。** 只返回仍需谁决定，没有宣布 owner 已接受 handoff。
- **重大缺陷：未见。** 方案是文字-only 的候选顺序，没有实际文件操作。
- **balancing cost：适中偏长。** 逐条列出状态和四个确认点，但这些内容直接支撑中断、重复
  和完成边界；比只复述“整理并清空”更有用。

### Output Y

- **raw/source：基本保留语义，但 provenance 较弱。** P-C1–P-C3 的原话和状态都被准确概括，
  没有像 A 的 Y 那样截断主要 source；不过没有明确指出“history 当前没有三条回执”与
  P-C2 已追加之间的整体冲突，只处理了 P-C2 的一侧状态（blind C `:27-43`）。
- **authority：部分合格。** 没有声称三条已完成，也承认需要确认；但“修复 P-C2”“补齐
  迁移状态”偏向把秘书方案当成可执行迁移动作，仍需更明确限定为候选计划。
- **candidate/record：大体不越界。** 没有制造 research/experiment record；“规范记录”
  和“完成记录”用语却可能让 receipt/summary 看起来拥有新的权威。
- **clear/complete：有重大混淆。** 最后说“只有已有明确回执、来源链和完成条件的条目才能从
  pending 移除”（blind C `:43`）。这把 pending clear 绑定到 completion 条件，违背 oracle
  要求 clear 只是视图移除、不能等同 complete/acceptance；C1/C3 可能可以在另一种明确
  disposition 下清除，但不能因此要求它们已经完成。
- **runtime：大体守住，但表达有越界风险。** 说明不能证明 atomic，且要求“迁移待恢复”；
  “修复/恢复”措辞应改成后续人工或工具 owner 的候选动作，不能暗示文字已提供恢复能力。
- **unknown：中等。** C3 的目标/接受条件未知写得清楚；P-C2 的重复未知也有写出；但对
  history 与 pending 的整体冲突、clear/complete 独立性和真实 recovery 缺口不够完整。
- **owner：部分合格。** 要求确认谁验收，但没有把 owner 接受说成已发生；仍可更明确返回
  “由真实 owner 决定”。
- **重大缺陷：有。** clear 与完成条件绑定是本项的核心边界错误；“清空会造成信息丢失”
  的风险判断不应替代对 clear 仅为 view operation 的精确表达。
- **balancing cost：较短、可读，但省略了关键 standing 区分。** 结尾增加“待确认/阻塞区”
  这一新去向，也扩大了形式而没有 source 授权。

### C 的相对判断

X 优于 Y。两者都没有声称已实际编辑文件或 exactly-once；决定性差异是 X 维持了中断冲突、
unknown 和 clear/complete 边界，而 Y 在最后的清除条件中把完成关系重新混在一起。

## 语义 standing 与后续限制

本报告只支持以下静态比较：A 的 X、B 的 Y、C 的 X 在各自 oracle 关系上更完整；它不支持
哪一组加载了候选 skill、是否存在行为改善、是否有 baseline/treatment matching，或任何
mechanical terminal/output 结论。若后续 reviewer 需要行为 standing，至少还要保持 manifest
所列的实际 payload extraction、fresh context、权限和输出重建检查为独立可核验事项；在那些
条件未确认前，本报告的语义优劣不能升级为因果归因。

