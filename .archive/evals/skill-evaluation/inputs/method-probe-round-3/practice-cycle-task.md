# R3-PC practice-cycle matched task

这是一个冻结的 planning/design 行为任务。只使用本文件的 task 与 source；不要读取仓库中的
其他 planning、theory、skill、review 或历史输出，不要修改文件，不要访问网络。

## TASK-BEGIN

你是一个 planning/design Agent。请对下面两个相互独立的 case 分别选择“当前结果之后的最小
下一行动”。目标不是写完整计划，也不是证明系统已经正确，而是根据已经发生的实践结果，判断
下一行动是否真的会改变当前理解。

对每个 case 返回以下字段：

1. `current_object_and_result`：当前对象、刚发生的实践和实际结果；
2. `next_action`：一个最小下一行动，或者说明无需制造新实践；
3. `disposition`：只能从 `settle`、`continue`、`route`、`uncertain` 中选择；
4. `owner_and_effect`：下一行动由谁拥有、允许读/写/执行到哪里；
5. `evidence_and_unknown`：当前证据 standing、能改变判断的未知和反观察；
6. `excluded_actions`：本次明确不做的更大或不属于本对象的动作。

Case A 是一个应拒绝过度规划的反例；Case B 是一个上一项实践确实改变了下一判断、可能需要
发现分支的正例。不要因为两个 case 放在同一任务中就强行使用同一种 disposition。

### Case A：确定性的一步修正

当前实践是对一个已经有明确 owner 的 planning 文档做机械校对。结果只发现标题中一个拼写
错误；正确替换文本已确定，修改范围是同一文件的一行，`git diff --check` 可以验证格式没有
引入空白错误。没有新的语义问题、来源冲突、owner 冲突或需要比较的候选。

请判断下一步是否应该创建一个 practice-cycle、额外 discovery branch、独立语义 review 或
更大的计划。

### Case B：结果改变了下一项设计判断

上一项实践是审查一个 WorkCell protocol design candidate 的字段边界。结果确认：

- declaration、host grant、executor return、host observation、RunRecord、mechanical check、
  semantic review 和 acceptance 应保持不同关系；
- `CompletionActionCall`、`CompletionActionObservation`、`EffectSummary`、`UsageObservation`
  在当前草案中只有引用，没有 canonical shape；
- protocol owner、host/security owner、record/evidence owner 和 acceptance owner 尚未全部命名；
- 没有真实 host Run、跨 adapter comparison 或 protocol acceptance；
- 直接补齐所有 schema、创建 registry 或开始 WorkCell implementation 都超出当前授权；
- 当前 planning 目标是判断下一项最小设计实践，而不是把未知写成已接受协议。

请判断：下一项最小实践是什么；是否需要拆出一个 discovery/owner 分支；如果 owner 仍未知，
下一步如何诚实返回 `unknown` 或 route；什么观察会推翻你的选择。

## TASK-END

## SOURCE-BEGIN

本任务的唯一来源事实是上面两段 case 描述。它们是冻结的设计观察和边界约束，不是 protocol
acceptance、runtime guarantee、eval Run 或实现授权。

## SOURCE-END
