# Relational verification and systemic design

> 中文工作指称：系统性验证与关系设计。当前为通用 harness design candidate，不是集中式验证服务、
> 全局 graph、固定 review gate 或 runtime orchestration。它规定设计时的观察方法：局部 candidate 是
> 验证系统中的一个有边界投影，不能因为载体局部就把相关关系当成不存在。

## 核心原则

Harness 的 theory、method、skill、task expression、WorkCell、evidence、review、acceptance 和
correction 不是彼此孤立的产品。它们是同一个验证系统中不同对象、关系、时间片或受众视图：

```text
goal / source / authority
          ↓
 task / method / execution
          ↓
 effect / observation / evidence
          ↓
 review / acceptance / correction
          ↺ 重新影响后续设计与运行
```

一次设计可以只改变其中一小段，但必须知道它与其它段的关系。局部化是控制复杂度和保护归因的手段，
不是把上下游、横向 owner 或采用后结果从问题中删掉。

因此设计的默认问题不应只有“这个文件/skill/协议字段是否合理”，还应包括：

- 它从哪个目标、source、authority 和已有 baseline 派生？
- 它与哪些相邻对象共享 identity、约束、owner、效果或接受关系？
- 哪些下游 consumer、evidence、review、runtime 或 correction 会受到影响？
- 它声称保持了什么不变量，哪些关系仍然 unknown？
- 如果局部 candidate 被采用、回退、重命名或废止，哪些关系会随之 stale 或需要重评？

对独立运行 harness，还要把“机会进入视野”和“判断值得推进”分开检查：activation/wake 只说明系统
获得了观察机会，不能替 initiative judgment、目标/场景恢复、行动 affordance、后果归因、反馈或纠偏。
只有这些关系能回成 `goal-linked action loop` 时，才有资格讨论主动推进；否则增加唤醒频率、并行 lane
或上下文长度，很容易被误报成主观能动性提升。

## 不是“所有东西一次性整体设计”

系统性不等于大而全，也不要求每次把整个仓库、全部理论和所有角色装进 context。应同时保持两点：

1. **局部工作：** 每次只选当前真实 pressure、最小对象和最小改变，控制 token、协调和归因成本；
2. **系统回看：** 在改变判断的边界处检查必要的上游、横向、下游、时间和证据关系，防止局部正确
   破坏整体关系。

只有会改变当前决定的关系才进入本次 context；其余关系可以通过 canonical source、projection、lineage
   或 revisit 条件按需回读。联系广泛不意味着复制广泛。

## 验证系统的关系面

一个局部设计至少按实际风险检查以下关系面；不是固定字段表，也不是每次机械填写：

| 关系面 | 要恢复的问题 | 常见局部错放 |
| --- | --- | --- |
| 上游语义 | 目标、source、约束、non-goal、当前 baseline 从哪里来？ | 把局部偏好写成目标或理论 |
| 权威与责任 | 谁拥有事实、效果、review、acceptance、priority 或下一决定？ | 让文件、skill 或 reviewer 偷得权威 |
| 横向边界 | 哪些 sibling、最近邻 owner、adapter 或替代方案共享关系？ | 把相似名称误当成同一对象，或重复造 carrier |
| 下游使用 | 谁消费结果，会产生什么 effect、记录、决策或失败？ | 只看生产者，不看 consumer 和接受条件 |
| 时间与纠偏 | 采用、回退、重启、重开、correction 和 stale 如何影响它？ | 把一次观察写成永久结论，或倒写历史 |
| 证据与验证 | 什么能证明局部成立，什么仍未知，如何回接整体？ | 把格式通过、review 或单次成功当成全局接受 |

具体设计不需要对所有关系面都展开；不适用时说明理由。风险越高、生命周期越长、影响越跨边界，
越需要扩大关系视图。

## 字段形态也是关系判断

字段不是脱离对象、消费者和生命周期的命名装饰。选择 `label`、`enum`、属性组合、派生投影或变体，
要先回到 [`theory/expression.md`](../expression.md) 的字段表达规则，再检查它是否会进入权限、路由、
生命周期、验收或运行时契约。`label` 适合开放、可扩展的描述与分组；`enum` 只适合语义、范围、owner
和兼容关系足够长期稳定且有机械消费者的值域；彼此独立变化的维度应保持属性组合；仅是视图分类则不
新增事实字段；结构、约束或动作不同才考虑变体/判别联合。

这条规则的系统性边界是：expression 只拥有语义到字段形态的保真表达，concept articulation 仍判断
分类是否真实稳定，mechanism review 仍判断字段是否已经承载硬机制关系。不能因为字段使用了 enum 就
自动产生状态、权限、接受或执行保证，也不能用一个总分类字段替代下游真正需要的正交关系。

## Work map 也是系统关系的投影

多步骤或多任务工作应把 Plan、Task、Todo 作为同一 work map 的不同关系视图来检查：Plan 保留整体义务，
Task 保留有界贡献，Todo 保留当前执行者的下一步与回返。检查重点不是是否存在三个文件，而是下一行动
是否可从当前 authority、依赖、允许效果、完成观察和返回关系中重建；并行是否有真实分离边界；fan-in 是否
回到既有 owner；局部等待是否没有冻结无关 item。它是方法层约束，不自动成为全局队列、scheduler、
runtime gate 或第二份 planning authority。

## 局部 candidate 的系统性设计过程

1. **定位局部对象：** 说明本次设计改变的是方法、skill、projection、协议、runtime、evidence、
   review 还是 domain decision；不要从文件名推断对象。
2. **恢复来源和 baseline：** 识别上游目标、source standing、已有约束、当前采用关系和未知。
3. **描出关系 delta：** 明确本 candidate 新增、删除或重新解释哪些关系，以及明确保持哪些关系。
4. **找最近的系统压力：** 优先检查最可能被改变的 owner、consumer、effect、evidence 和 acceptance；
   不因“系统性”而建立全局 ontology。
5. **提出最小 candidate：** 让局部改变能够被独立观察，同时保留真实不能拆开的组合边界。
6. **做关系性探针：** 除了本地正例，也检查最近邻、下游使用、边界/越权、回退/重开和证据回接；
   只让结果改变相应的 decision。
7. **回接当前 authority：** 采用、保留、回退、降级或标记 unknown；只把有证据支持的受影响关系
   标 stale，不把整个系统自动标 stale。
8. **在 checkpoint 整体回看：** 当 canonical source、owner、阶段、重大 correction 或采用关系
   改变时，重新检查局部 candidate 是否仍属于原对象和原载体。

这是一种设计方法，不要求每个局部工作创建系统图、review record、queue 或新的 metadata schema。

## 局部成立与系统成立

必须严格区分三种主张：

- **局部观察：** candidate 在指定对象、consumer、环境和边界中产生了预期变化；
- **关系支持：** 它没有破坏已声明的上游、横向、下游、时间或证据不变量，或残余未知已被明确保留；
- **系统采用：** 该改变已经由相应 owner 采纳，影响范围、回退关系、采用后观察和接受 standing 可回读。

局部 review 不能自动取得全局 acceptance。相反，系统性 review 也不能替代局部对象真正需要的
semantic review、runtime guarantee 或 owner decision。

## 与默认自治和事后纠偏的关系

系统性设计为默认自治提供判断背景：低影响的局部 candidate 可以自主试验；是否需要人工介入，要看
它沿关系网络可能改变的目标、权威、共享基线、下游效果和不可逆性，而不是看它是否“不确定”。

事后纠偏也必须是关系性的：纠正一个局部错误后，检查它是否只是当前任务问题，还是暴露了 method、
skill、fixture、protocol、runtime、owner 或 acceptance 的上游缺口；只在重复或跨边界时上移，不把
一次修复直接泛化为全局规则。

相关通用候选：

- [`default-autonomy-with-correction.md`](default-autonomy-with-correction.md)：默认自主运行与重大事项
  例外请示；
- [`owner-facing-progress.md`](owner-facing-progress.md)：重大 owner decision 的场景恢复与选择包；
- [`iterative-improvement.md`](iterative-improvement.md)：baseline、candidate、证据、纠偏和采用后的
  防退化闭环。

## 最近邻与排除

| 最近邻 | 本候选不等于它 |
| --- | --- |
| 全局架构设计 | 不要求一次设计所有对象，也不以系统图代替局部 owner |
| 集成测试或 E2E | 不只在实现结束后测试；设计阶段就检查会改变的关系 |
| 知识图谱/ontology | 不建立穷尽类别或把所有链接持久化；只恢复会改变当前判断的关系 |
| project management / planning | 不把关联自动变成任务、队列、priority 或执行授权 |
| 监控/审计 | 不把观察者变成 semantic reviewer、acceptance owner 或 correction owner |
| mechanism design | 先判断是否已有方法和 owner 足够；系统联系本身不是新增 runtime mechanism 的理由 |

## 最小系统性返回

一个局部设计返回时，除本地结论外，至少要让后续 owner 能恢复：

- 局部对象、来源、baseline 和主要 delta；
- 受影响的上游、横向、下游、时间或证据关系；
- 保持的不变量、实际覆盖、冲突与 unknown；
- 对 owner、consumer、effect、review、acceptance 和 correction 的影响；
- 被排除的更简单替代、是否需要扩大 probe，以及回接/重开条件。

它可以是一段设计说明、review 返回、projection 或已有记录的增量，不要求新的统一 schema。

## 当前检验与 standing

最小检验包括：

1. 改变上游目标、下游 consumer 或横向 owner 时，局部设计是否改变相称判断，而不是继续套用孤立结论；
2. 局部 candidate 成立时，是否能指出它没有证明的系统主张；
3. 新的 correction 是否只沿实际依赖传播 stale，而不是全局污染或全局失效；
4. 同一语义换文件名、skill 或 projection 载体时，关系和 authority 是否保持；
5. checkpoint 是否能发现重复 carrier、错放 owner、断开的 evidence 或被局部设计隐藏的下游风险。

当前 standing：`design-candidate / source-bounded / concept-boundary-observed / behavior-unverified /
acceptance-pending / carrier-not-selected`。现有 theory、planning、WorkCell 和 skills 只能提供局部
consumer 观察，不证明整个验证系统已经形成、可自动回接或具有 runtime guarantee。

## 当前应用投影

- [`planning/index/whole-work-coordination-candidate.md`](../../planning/index/whole-work-coordination-candidate.md)：
  将跨 item、wave、fan-in、checkpoint、owner 和阶段回接作为一个 planning 局部 consumer。
- [`planning/records/workcell-design-acceptance-readiness.md`](../../planning/records/workcell-design-acceptance-readiness.md)：
  将 RunRecord identity、协议/记录/evidence/acceptance 关系作为 WorkCell 局部 consumer；不因此取得
  WorkCell protocol acceptance。
