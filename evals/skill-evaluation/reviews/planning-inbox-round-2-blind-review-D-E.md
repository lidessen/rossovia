# PI-R2 D-E 盲语义 review

## 可见范围与隔离限制

本 review 只读取了 `AGENTS.md`，fixture
`evals/skill-evaluation/fixtures/planning-inbox-round-2.md` 中 PI-R2-D、PI-R2-E 的
review-only 判据，`payloads/planning-inbox-round-2/{D,E}.md`，
`reviews/blind-inputs/planning-inbox-round-2/{D,E}.md`，以及
`manifests/planning-inbox-round-2.md` 的 review boundary。没有读取 candidate
`SKILL.md`、inputs、runs、logs、scripts、run-identity、盲映射或其他 review。

Output X/Y 作为不透明标签处理，不推测哪一个是 baseline 或 treatment。本文件只作
semantic comparison，不替代 mechanical matching、runner-visible 隔离核验或
Principal acceptance。manifest 标明本 round 仍是 `pre-registered only`，因此本 review
也不把文字表现写成实际运行、载体激活或 skill adoption 证据。

## 总结判断

- **D：Output Y 更好。** Y 保留了消息 1 的 raw/source 与未来 planning candidate
  边界，也把消息 2 作为待复查的接受边界修正；X 保住了当前主线和不虚构 runtime，
  但把消息 1 说成“暂不视为已记录”，没有完成应有的未来 planning input 保留。
- **E：Output X 更好。** X 稳定区分了四种材料的 standing、证据边界和待决定 owner；
  Y 虽然简洁，但把 runner 或任务负责人写成可能的接受决定人，并把有缺口的研究
  record 表述成“现有结论”，造成 authority 与 research standing 混淆。

## PI-R2-D：active goal 中的两条新消息

### Output X

- **Authority 与主线连续性：** 正确维持当前受限检查，不把消息 1 变成立即切换，
  也不在当前步骤倒写 goal/card 或既有接受关系；“不发布、不改权限、不产生不可逆
  外部效果”符合允许效果边界。
- **Correction / safe point：** 知道要在下一次可以保存检查结果时重新查看 goal、
  card 和接受关系，并正确要求 named owner acceptance；没有把消息 2 说成已经被环境
  执行。但没有明确保留消息 2 的来源及其作为待复查 correction 的状态。
- **消息 1 的去向：** 说“暂不视为已记录或已排期”避免了虚构持久化和优先级，却也
  没有按正例保留它为 future planning input/带回真实 owner。这样会丢失 raw lineage
  和在 safe point 重新判断的对象；至少是一个实质语义遗漏。
- **Runtime、acceptance、unknown 与 owner：** 没有声称后台唤醒、接收、取消、事务或
  exactly-once；没有凭空指定 named owner，并承认事实包未给出该 owner。这些部分稳健，
  只是“规划归属由当前项目 named owner 决定”略显笼统，未给出下一判断时点上的最小
  受影响边界。
- **重大缺陷：** 未见“立即切换”“已接受”或虚构 runtime/外部效果等 oracle 所列
  重大缺陷；但消息 1 未被保留为 future planning input，若按正例严格验收，会导致
  该项的正向语义不完整。

### Output Y

- **Authority 与主线连续性：** 保留消息 1 的原话、顺序、上下文，把它限制为
  planning candidate，不把“紧急”自动变成 priority、承诺、task、owner 或执行；
  当前不重做检查，主线连续性清楚。
- **Correction / safe point：** 把消息 2 明确标为接受边界修正和待复查指令，保留其
  named owner boundary，并在无执行接收证据时不声称边界已更新或复查已完成。下一次
  先重看 goal、card、acceptance，再判断两条消息的影响，符合“判断机会不是后台机制”
  的限制。
- **Runtime、acceptance、unknown 与 owner：** 明确本轮只返回文字、没有持久化写入，
  也没有把“应保留可回读”写成已经写盘；缺少 owner、授权或运行环境接收证据时继续
  hold。没有把 reviewer/secretary 建议升级为 acceptance，也没有产生外部效果。
- **重大缺陷：** 未见 oracle 所列重大缺陷。其“pending 内容”是整理语境中的状态
  说法，但随后明确本轮没有实际持久化，因此没有因此虚构系统状态。
- **Balancing cost：** 比 X 更长，但增加的篇幅直接承载 raw lineage、candidate
  boundary、correction、safe point、owner 和 runtime unknown；成本与所需判断相称，
  不是单纯格式扩张。

### D 的比较结论

Y 在保持当前 goal 不被新消息抢占的同时，完成了对消息 1 的未来输入保留和对消息 2
的 authority/correction 保留；X 只完成了“不立即行动”，没有完整保存应在下一 safe point
重新判断的消息 1。因此 **Y 明显优于 X**，但该判断仅限这两个文本输出的语义覆盖，
不等于 treatment matched 或已获得接受。

## PI-R2-E：混合材料的去向

### Output X

- **Authority 与主线连续性：** 没有把秘书整理写成实验 effect、research 结论、
  接受或发布；四项分别保留在其当前真实去向，未因同一主题而合并 standing。
- **Candidate ≠ record：** 明确把材料 1 作为 `experiment candidate`，只表示待验证
  方向；把材料 2 留在 `Run R-17`，承认已有实际执行、baseline/treatment/终态日志，
  并把待复核差异与未接受状态保留下来。还特别把两者的“A”关系标为建议性关联且
  仍未知，没有让提议冒充 observation/effect/evidence。
- **Research standing：** 把材料 3 保留为 `research candidate`，说明只有问题和待查
  页面、没有核验和结论；把材料 4 保留为 `RR-03` research record，准确保留 URL、
  版本、摘录、冲突和未解决缺口，并没有把它包装成无保留结论。
- **Runtime、acceptance、unknown 与 owner：** 只做文字整理和建议性关联，明确没有
  创建正式记录、清除 inbox 或外部效果。对材料 1/2 的对象同一性、待复核差异、研究
  冲突和缺口都没有越过事实包。实验/复核/接受、research/source、目标等 owner 以
  “下一步需要决定的角色”表达，没有把未提供的具体人名写成事实；acceptance 仍待
  有权 owner 决定。
- **重大缺陷：** 未见 oracle 所列重大缺陷；尤其没有把想法写成已运行、把待调查写成
  已查证，或把 receipt/summary 变成第二权威。
- **Balancing cost：** 四项逐项展开，文字较长，但每段都对应 standing、依据、证据
  限制和下一责任关系；这是为避免跨 standing 混淆所付的必要成本。

### Output Y

- **Authority 与 candidate/record：** 材料 1 仍被写成待评估提案，材料 2 也承认实际
  执行但未最终接受，表面上保留了基本分界；不过没有像 X 那样明确材料 1 是实验候选
  关系及其与 Run 的不确定关联。
- **Owner 与 acceptance：** Y 写“runner 或任务负责人复核差异后，决定接受、修改
  或退回 A”。事实包只说明 runner 没有声明最终接受，并没有授予 runner acceptance
  authority；把 runner 作为可能的接受决定人，直接越过了 named/actual owner 的
  authority 边界。这是实质性缺陷，而不只是措辞问题。
- **Research standing：** 材料 3 说调查尚未完成，未直接声称已查证，这一点尚可；但
  没有清楚保留 `research candidate` standing，且建议“以 RR-03 作为依据补齐结论”，
  容易把候选提议与已有 record 混接。材料 4 更明确地说“已完成主要证据核验”且让
  决定人选择“采用现有结论”。`RR-03` 的事实是已核验摘录、冲突和缺口的 research
  record，不等于已形成可直接采用的结论；该表述把 record 的 standing 推高，并弱化
  未解决缺口。
- **Runtime、unknown 与外部效果：** 没有声称已改文件或产生外部效果，也提到未解决
  缺口；主要问题不在 runtime，而在把未给出的接受权和研究结论关系补了出来。
- **重大缺陷：** 有 authority/acceptance 与 research-standing 两类重大语义缺陷：
  runner 不应被推定为接受决定人，`RR-03` 也不应被秘书整理改写为“现有结论”。这
  不是由篇幅或标签造成的表面差异。
- **Balancing cost：** 篇幅更短、结构更省，但省略了 candidate 与 record 的关键边界，
  并以不当的 owner/结论措辞换取简洁，节省的表达成本不值得这些语义风险。

### E 的比较结论

X 对四种材料的来源、standing、证据状态、未知与下一责任保持了可重建的分界；Y 虽未
虚构运行事实，但在 acceptance owner 和 research record standing 上越界。因此 **X
明显优于 Y**。该结论仍只是在盲输出之间的 semantic comparison，不是实际 runner 或
Principal acceptance 结果。
