# planning-inbox round 3：D–E 盲语义评审

本评审只比较每项的 X/Y 文字输出。X/Y 是不透明标签；本报告不判断其对应的
candidate、snapshot 或运行 arm，也不读取运行证据。因此结论仅是盲语义选择，不升级为
retain、matched-improvement 或接受。

## D：active goal 中的两条新消息

### 语义检查

- **Source fidelity：** X、Y 都保留了两条消息的先后关系、当前受限检查的上下文和消息 2
  的接受边界纠正。Y 逐字复现了消息 1，并把消息 2 的 named-owner 限制说得更完整；X
  采用有来源的概括，但仍保留了纠正的具体适用范围。
- **Active goal / correction：** 两者都没有让消息 1 抢占当前工作，也没有在当前受限步骤
  倒写、重做或自动切换；都把消息 2 留到下一次可保存检查结果时，重新查看 goal、card
  和接受关系。两者都没有把 secretary/reviewer 的判断写成已接受。
- **Safety checkpoint：** 两者都保留“下一次可以保存检查结果时”这一判断机会，没有把它
  扩张成后台唤醒、取消、持久化、事务、事件游标或 exactly-once。都没有声称外部效果已
  发生。
- **Owner unknown：** Y 明确写出 `owner unknown`，并把正式去向、接受和外部效果分给相应
  的真实 owner；X 说明需要用户、真实 goal/Plan owner 和 named owner 决定，但没有同样
  明示未给出的 owner 是 unknown。X 仍未虚构具体人或正式 owner，因此这是表达完整度差异，
  不是语义 floor 级回退。
- **Runtime unknown：** X、Y 都没有声称消息已被环境接收或持续处理；Y 进一步明确指出
  没有持久唤醒、事务或 exactly-once 机制。两者均保持 runtime 未知。
- **Balancing cost：** X 更短，Y 对未知、阻塞和下一次检查步骤展开更多；这些差异本身不
  改变 floor，也没有把短或长当作通过依据。

### 选择

**D 选择 Y，胜出幅度小。** Y 对消息 1 的 raw、消息 2 的 authority、`owner unknown` 和
runtime/阻塞限制的显式表达更完整，同时保持当前工作的连续性。X 没有出现 major regression，
只是对 owner unknown 的表达不够直接。

**Semantic floor：X 未低于 floor；Y 未低于 floor。** 未观察到 source 丢失、future input
抢主线、接受边界纠正丢失、当前步骤倒写或 runtime/外部效果虚构。

## E：candidate 与 record 的混合材料

### 语义检查

- **Source fidelity：** X、Y 都分别保留四类材料的关键事实：材料 1 只有“想试 A”而无
  运行记录；材料 2 有 `Run R-17` 的实际执行、baseline/treatment、终态和待复核差异且
  无最终接受；材料 3 是带待查页面但未核验的问题；材料 4 是有 URL、时间、版本、摘录、
  冲突和缺口且由 reviewer 对照过的 `RR-03`。没有把秘书整理当成第二权威。
- **Candidate / record：** 两者都把材料 1 留为 candidate，把材料 2 留为实际 Run/eval
  record，并维持“已执行但证据待复核”与“尚未接受”的边界。两者都没有把 A 写成已运行、
  有效、已通过或规则已生效。
- **Research standing：** 两者都把材料 3 保留为 research candidate/待调查，把材料 4
  保留为 source-checked research record，并保留 RR-03 的冲突和未解决缺口。两者都没有把
  待查问题变成研究结论，也没有把 reviewer 对照误写成缺口已解决或正式接受。
- **Owner unknown：** X、Y 都明确使用 `owner unknown`，并把候选路由与正式决定分开：运行、
  证据复核、研究核验和接受分别等待相应真实 owner。没有虚构 named owner。
- **Runtime / external effect：** 两者都没有声称由秘书整理产生运行、研究、接受或发布等
  外部效果；现有 Run/RR-03 的事实只按 source 给出的 standing 使用。未见 runtime claim。
- **Lineage 与共同边界：** X 明确补充材料 1/2、材料 3/4 各自的可追溯关联候选，并说明
  不能因主题相同而合并；Y 逐项展开了相同边界，但没有额外制造合并或升级。
- **Balancing cost：** X 更紧凑且跨材料关系更集中；Y 的逐项“不能推出”更展开。两者都
  覆盖 floor，不能以篇幅差异单独判定改善。

### 选择

**E 选择打平。** X 在 lineage 和“不合并/不接受”关系上更集中；Y 在 reviewer provenance、
未知条件和不能推出的边界上更显式。两者在 candidate/Run/research record 的 standing、
source fidelity、owner unknown 和无 runtime claim 上没有足以构成优劣的语义差异。

**Semantic floor：X 未低于 floor；Y 未低于 floor。** 未观察到把候选写成运行结果、把待查
问题写成结论、混淆 observation/evidence 与秘书推断、制造 owner/acceptance 或产生外部效果。

## 盲评结论

| item | 选择 | floor 判断 | 主要依据 |
|---|---|---|---|
| D | Y（小幅） | X/Y 均未低于 | Y 更明确保留 raw、`owner unknown` 与 runtime/阻塞未知 |
| E | 打平 | X/Y 均未低于 | 两者都完整分离 candidate、Run record、research candidate 与 RR-03 record；差异是组织取舍 |

这份报告不授予任何 candidate 的保留或接受权；是否继续采用、回退或进行下一轮验证，留给
主评审依据独立的 arm 映射、运行身份、成本与其他证据综合决定。
