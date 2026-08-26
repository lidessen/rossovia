---
kind: research-candidate
id: planning-information-architecture
status: settled
disposition: canonical-proposal
evidence: behavior-observed
settlement_route: bounded-trial-or-archive
owner: "unknown"
consumer: planning-read-model
review_at: reopen-on-discovery-or-authority-evidence
---

# Planning 信息结构研究

lifecycle：`settled`
disposition：`canonical-proposal`
evidence：`behavior-observed`
project observation：`reconciled`
adoption：`unknown`
这表示信息结构 proposal 已结算，不表示长期 adoption、发现成本改善或 authority 接受已经得到证明。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 研究问题与范围

本研究回答两个相连的问题：

1. planning 的信息如何按 authority、生命周期、使用目的和下一行动分层，减少发现成本、上下文负担和
   current/history 混淆；
2. 多步骤 work map 中的 Todo 是否可以承载与当前行动绑定的 reminder，使重要方法在真正需要时出现，
   而不是靠脱离场景的重复复述。

范围是当前 planning 目录、Main/Agent 的读取与执行关系和通用 harness 方法。它不把信息结构研究
升级为 WorkCell、DeepSeek Harness、base、runtime loader 或强制提醒机制，也不把理论文献直接当成本项目
性能证据。

## 2. 当前项目观察

第一轮 `planning/records/` transition 已把 bounded process records 与根级入口分开，但当前根目录仍
混合了三类不同关系：

- canonical orientation/authority：`README.md`、`item-ledger.md`、`roadmap.md`、`plan.md`、
  `phase-1-exit-review.md`；
- intake/lineage：`inbox.md`、`inbox-history.md`；
- current supporting indexes、audit、estimate 和 candidate：`candidate-consolidation.md`、
  `coverage-audit.md`、`evidence-maintenance-review.md`、`item-ledger-field-audit.md`、
  `item-loop-coverage-audit.md`、`skill-migration.md`、`whole-planning-work-estimate.md`、
  `whole-work-coordination-candidate.md`。

因此当前问题不是单纯“文件太多”，而是同一物理层同时承担了不同的信息功能；读者不能仅凭路径判断
这是一份当前权威、可选工作索引，还是过程证据。`records/` 也不能承接这些 supporting indexes，
因为它们的使用关系不是一次性历史回执。

## 3. 理论证据与可用边界

| 理论/来源 | 它实际支持的关系 | 对 planning 的可用推论 | 不能推出的结论 |
| --- | --- | --- | --- |
| Shannon 的通信理论（1948） | 用熵描述来源不确定性，并讨论统计结构、冗余与编码成本对通信的影响；见 [原始论文](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x) | 可以把 planning 读取视为“在有限读取成本下减少当前决策不确定性”的编码问题：重复 authority 会增加噪声，缺少 source/next-action cue 会增加解码不确定性 | 不能把文件字节数直接等同信息量，也不能从 Shannon 熵直接推出目录树或最优文件数量 |
| Pirolli & Card 的 information foraging（1995/1999） | 信息寻求会在信息价值与取得成本之间选择；近端线索（information scent）影响是否继续深入；见 [CHI'95 论文](https://doi.org/10.1145/223904.223911) 和 [1999 理论论文](https://doi.org/10.1037/0033-295X.106.4.643) | 入口、目录名、摘要、链接和下一步说明要提供足够 scent；顶层不能只是文件堆，而要让读者预测“这里能解决什么问题、下一跳去哪” | 不能用一次链接点击或单个用户路径证明 layout 改善，也不能把“更明显”当成 authority 正确 |
| Bates 的 berrypicking（1989） | 信息需求会在检索过程中变化，搜索不是一次性沿固定树走完；见 [论文记录](https://doi.org/10.1108/EB024320) | 不能把一个静态 taxonomy 当成唯一入口；应保留按当前、item、source、证据、owner/consumer 等关系的多条可回读路径，但这些路径都回到同一 canonical source | 不能因此复制多份正文或建立多个 current authority |
| 层级菜单与地图研究（Billingsley 1982；Norman & Chin 1988） | 层级结构会影响搜索；可见的结构地图可改善检索表现，树形结构的分支方式也改变不确定性；见 [Billingsley](https://doi.org/10.1177/154193128202600125) 和 [Norman & Chin](https://doi.org/10.1080/01449298808901862) | planning 需要一个轻量“结构地图/读取契约”，并限制每一层的语义角色；目录层级不是越深越好，关键是分支能否降低当前选择的不确定性 | 不能把固定层数或固定宽度写成普适规则 |
| Sweller 的认知负担研究（1988） | 解决问题本身会占用处理容量；已有 schema 能降低无关处理负担；见 [原始论文](https://doi.org/10.1207/s15516709cog1202_4) | 采用 progressive disclosure：先给当前 anchor、下一行动和最小 source pack，只有决策需要时再展开历史、邻近和证据；Todo reminder 应在行动边界出现，而不是每轮重复全文方法 | 不能把“少读”直接当作更好；删除承重语义会损害判断和验收 |
| Miller 的工作记忆论文（1956） | 提供人类短时处理容量的经典实验讨论；见 [论文记录](https://doi.org/10.1037/h0043158) | 只可作为“不要把顶层导航做成无结构长清单”的提醒 | 不采用“7±2”作为目录宽度、Todo 数量或 token 阈值；它不是本项目的硬设计常数 |

### 信息论的正确使用方式

这里使用的不是“给每份文档算一个神奇信息分数”，而是三个工程化问题：

1. **不确定性：** 读者读完当前层后，是否更清楚 authority、standing、下一行动和停止条件？
2. **冗余：** 同一关系是否在多个文件被当成 current authority 重复表达？有意重复的导航 cue 是否清楚
   标成 projection/索引，而不是第二事实？
3. **编码成本：** 当前入口是否用足够短且可预测的标签，把读者带到能改变判断的 source；如果仍需全文
   扫描，问题是结构/线索不足，而不只是文本长度。

因此可用的局部目标是：

```text
useful decision information per read cost
  = uncertainty reduction + reliable next-action cue
    - duplicate/conflicting authority - irrelevant context cost
```

这是设计启发式和未来可测量的假设，不是 Shannon 定理，也不是当前性能结论。

## 4. 信息层次候选

当前建议将 planning 分成六个信息层，而不是按主题继续扩展目录：

1. **Orientation：** 入口、默认读取顺序、停止边界和当前 goal；由 `README.md` 承载。
2. **Current authority：** 当前跨 item standing、可推进部分、依赖、出口、revisit；由 `item-ledger.md`
   承载。
3. **Direction/commitment：** 长期方向、pre-implementation 顺序、阶段出口和实现冻结；由
   `roadmap.md`、`plan.md`、`phase-1-exit-review.md` 承载。
4. **Intake/lineage：** raw capture 与处理回执；由 `inbox.md`、`inbox-history.md` 承载。
5. **Working indexes：** 为当前 planning 读取提供的 candidate、coverage、evidence、estimate、
   migration 和 coordination 视图；它们可被索引但不取得 item ledger 的 authority。
6. **Process evidence：** review、disposition、applicability、source reconciliation 和历史 lineage；
   由 `records/` 承载。

物理目录只在层次确实改变发现行为时表达它；层次本身首先由 README 和链接契约声明。当前已把第 5 层
从根目录移入 `planning/index/`，不再把它们与第 2/3 层混在同一平面；下一步是采用观察和独立 reader
回返，不是继续增加目录。仍不按 WorkCell/philosophy/skills 建 domain 子目录，也不把 index 当作第二
authority。

## 5. Todo reminder 候选

### 概念区分

- **repeat**：在没有明确行动边界时再次复述方法或原则；它可能增加 token，但不保证当前判断会用到。
- **reminder**：与一个当前 Todo action、decision boundary 或 return condition 绑定的最小提示；它的
  作用是让执行者在行动前恢复一条会改变判断的关系。
- **focus refresh**：选择何时、针对哪个 role/scene 恢复哪些 reminder 的方法；它不等于把全文重复。

### 最小形式

Todo 可以保持一个动作及其承重上下文；当前把 `reminder` 作为面向载体的暂定字段名，把通用语义称为
action-local `focus anchor`，避免把它误解为调度或周期提醒：

```text
- [ ] reconcile planning information layers
  reminder: 当前 authority 只回到 item-ledger；index 是导航/工作视图，不是第二总表
  source: theory/research/planning-information-architecture.md §4
  return: update README/index links and verify standing unchanged
```

`reminder` 是 Todo 的附属载体语义，不是新的 authority、周期调度器或独立 memory registry；它不能用固定
短语扫描触发，也不能替代 source、证据、完成观察或 acceptance。

它比脱离任务的 repeat 更有希望可靠，原因是它具有 action locality、source linkage 和 completion/return
回接；但只有 Todo 本身被持久化、在 action 选择前被读取，并在失败/完成时写回，才能形成行为证据。
如果只是把 reminder 写在一份 Agent 不会加载的文件里，可靠性不会因字段名改变。

## 6. 当前未知与最小验证

- 人类 reader 和 Agent 是否都能从六层读取契约更快找到当前 authority，尚无 matched baseline；
- `planning/index/` 是否比根目录 supporting files 减少误读，尚无 adoption window；
- Todo reminder 是否比无 reminder 或脱离 action 的 focus repeat 减少漏用方法，尚无行为对照；
- 需要比较的最小 treatment 是：同一 bounded wave、同一 source/effect boundary，仅改变 index 结构和
  action-linked reminder；记录 discovery cost、错误 authority 读取、下一行动选择、遗漏提醒、回接和
  context/token cost；
- 若需要跨进程重启、并发或不可信调用仍保证提醒出现，必须另有 runtime/host mechanism，不能由 Markdown
  或 prompt 宣称保证。

当前处置：本记录现结算为 `settled / canonical-proposal`。六层信息结构、`planning/index/` path transition
和 source-linked Todo 入口已交给当前 planning projection；已有 Main dogfood、cold-reader 和 reminder
观察只支持 `behavior-observed / adoption-unknown`，不支持 matched improvement、长期 layout acceptance、
skill acceptance 或 runtime guarantee。若未来要继续验证 discovery cost、authority 误读或 reminder 的
实际长时作用，必须以新的 frozen card/research round 重开，不在本记录上无限追加。

## 来源与证据边界

## 2026-08-26：frontmatter 设计后的回落与修剪应用

这次应用把“设计完成后的 review 也要克制”补进信息结构方法。修剪不是等系统运行很久以后才做的清理，
而是两个时点都要发生：

1. **初始设计 review：** 字段刚形成时，逐字段问它是否有真实接收者、改变哪一个判断或行动、是否不能从
   source/正文/其它字段可靠派生，以及谁负责在何时复核。只有回答能闭合的字段进入当前设计；其余字段进入
   未决说明、候选或正文，而不是先占据公共 schema。
2. **实践后的回落：** 在真实 wave、source revision 或信息层变化后，检查字段是否仍承重、是否变成派生
   projection、是否与其它字段重复、是否只保留了旧流程痕迹。结果可以是 `retain`、合并、降为正文/历史
   projection、归档或 `no-proposal`；不能因为字段“暂时没有被用到”就直接证明它应删除。

### 本次字段盘点与设计决策

对当前 `theory/research/*.md` 与 `planning/records/*.md` 做了静态盘点：共 125 份记录，其中 46 份已有
YAML frontmatter；在这 46 份中，`kind`、`id`、`status`、`disposition` 各出现 46 次，`consumer` 出现
18 次，`evidence`、`owner`、`review_at`、`settlement_route` 各出现 16 次。这个结果只证明当前字段形态和
使用分布，不证明 parser、行为改善、长期 adoption 或字段设计已经被接受。

据此，当前 frontmatter 的最小设计判断是：

- 保留 `kind`、`id`、`status`、`disposition` 作为稳定的检索/记录核心；其中 `status` 只表达粗粒度生命周期，
  `disposition` 表达证据处置，两者不合并；
- 记录确实处在研究、实验或评估决策面时，才保留 `evidence`，用于标明证据上限；
- 只有当 `consumer`、`owner`、`settlement_route` 或 `review_at` 会改变路由、重开、结算或责任归属时才放入
  frontmatter，不把它们扩成每份记录必填字段；
- `labels` 只作开放描述和检索辅助；事件、复核、reconciliation、preparation 和修剪过程写入正文/lineage，
  不把每次事件编码成新状态；
- 不新增 `dryness`、字段数量、版本状态、字段 registry 或自动 pruner。字段的干燥/湿润是面向受众和任务的
  form-selection 判断，不是公共枚举。

逐字段的修剪检查可以压缩成一个 review 问题：**它是否有当前 consumer，能改变决策，不能可靠派生，并且有
明确的 owner/revisit 关系？** 若答案是否定的，先降级到正文或 derived projection；只有 source、lineage、
unknown 和历史回读关系仍被保留，并经过相称 review，才可以合并、归档或移除。旧的组合状态串只作为历史
standing 保留，重开或重写记录时再按这一规则迁移，不做破坏性批量清理。

当前这次应用的 standing 是 `design-validation-observed / adoption-unknown`：它验证了“设计后先修剪”的
判断可以约束 frontmatter 设计，并发现了当前字段的最小核心，但尚未证明读者发现成本、维护成本或长期行为
已经改善。下一次相称回返是出现第二个独立 consumer、字段漂移/重复的反例，或一次真实记录重开时；届时应保留
baseline、修剪候选和 lineage，再由独立 review 判断，而不是自动改写全库。

上述论文支持的是信息寻找、编码成本、层级导航和认知负担的关系；“六层 planning”、`action-linked
reminder` 和这里的 frontmatter 修剪规则，是基于这些来源和当前 worktree 的设计推论，仍须用本项目
bounded observation 验证。外部论文不能替代当前 source、owner、standing 或 acceptance。
