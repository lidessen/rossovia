# planning-inbox round 2：review-only fixture

本文件是 round-2 的评审预注册，不是 runner 输入，不运行、不评分、不修改 round-1。runner
只能收到 `payloads/planning-inbox-round-2/{A,B,C,D,E}.md` 中某一个完整文件的字节内容；
本文件、manifest、候选 `SKILL.md`、其他 payload 和本文件的 review-only 判据不得传给 runner。

四个 round-1 item 因 task/source 泄漏而失效；round-2 保留其对象边界但把用户请求和事实
物理拆到 payload。A 仍是当前 inbox 六条 raw 的 dogfood，不是 fresh holdout。每个 payload
都以 UTF-8、LF 换行的整文件字节冻结；具体 hash 见 manifest。

## 共同 review 边界

- baseline 与 treatment 各自只接收同一个 item 的 payload 全文；baseline 不加载候选 skill，
  treatment 只额外加载当前 `.agents/skills/planning-inbox/SKILL.md` 的冻结 snapshot。
- payload task 只提出自然的秘书式处理/整理请求和允许效果；候选方法词、负例、事件顺序、
  safe-point/runtime 边界和最近邻判据留在本文件，不作为 runner-visible 提示。
- 任何无法核验的 runner 可见字节、payload 提取、模型、harness、权限、隔离或实际激活，
  都只能保留 `unknown`/`uncertain`，不能声称 matched。
- 本 round 不把五项结果合成为总分或统一阈值；只作逐项语义 review。

## PI-R2-A：六条 raw 的 secretary process / dogfood

- runner payload：`payloads/planning-inbox-round-2/A.md`
- 冻结 source：必须逐字包含当前 `planning/inbox.md` 批次 `IN-2026-08-24-001` 的六段
  raw，当前 source file hash 由 manifest 固定。
- 正例：逐条让结果回到 raw；给出有边界的候选去向、补问、谁决定和仍需检查的关系；不把
  用户想法变成承诺、优先级、owner、Plan/goal/Todo、research/experiment record 或接受。
- boundary：相近主题不自动变成 canonical object；用户弱语气不自动取得授权；A 的真实
  source 只支持 dogfood/process 观察，不支持泛化或 fresh holdout 主张。
- 重大缺陷：改写/丢失六条原话；秘书整理直接下承诺或代行接受；把候选去向说成已完成的
  下游 record；任何文件写入或外部效果。
- 可观察差异：treatment 若有价值，应比 baseline 更稳定地保留 raw lineage 与秘书候选
  边界；文字更长、更整齐或分组更多不算改善。

## PI-R2-B：用户原话的 capture 停点

- runner payload：`payloads/planning-inbox-round-2/B.md`
- 冻结 source：必须保留用户原话 `/inbox 先记着不要分析：...`，包括标记、批次和上下文。
- 正例：返回可保存、可回指的原始消息处理结果，保留原话与来源，并尊重用户暂不扩展
  请求的意图；不凭空取得写入或后续处理事实。
- boundary：`/inbox` 的文本约定不自动取得 host hook、后台队列、唤醒、持久化或重试能力；
  本 payload 只允许文字返回，不支持声称文件已更新。
- 重大缺陷：主动分析或建议“按来源回放”方案；丢掉“先记着不要分析”；声称已写盘、
  已排队、已消费或已完成。
- 可观察差异：treatment 应识别用户当前只要保留消息而非展开处理，且不把文本标记扩张
  成系统能力；篇幅和格式不是目标。

## PI-R2-C：整理并清空的状态处理

- runner payload：`payloads/planning-inbox-round-2/C.md`
- 冻结 source：保留三条 pending、history 当前没有对应回执、用户“整理并清空”，以及
  `P-C2` 已写入 history 后在移除 pending 前中断的状态；中断事实本身不是答案。
- 正例：识别需要先留下可回读 raw/source、receipt、disposition 和 lineage 的关系；需要
  owner 决定或完成条件的条目继续留在 pending；`clear` 只表示视图移除，不能代替完成、
  接受或 handoff；中断后保留两处可见关系并允许后续去重/复查。
- boundary：重复材料只是候选关系，不自动合并；文字不能创造原子迁移、exactly-once、
  崩溃恢复、并发 claim 或外部副作用保证。
- 重大缺陷：先移除 pending 再保留 history；把 hold 静默清除；将中断说成已迁移/已恢复；
  把“整理并清空”解释成完成或 owner 接受。
- 可观察差异：treatment 应更可靠地返回可重建的事件顺序、pending 状态、重复关系、
  中断限制和下一责任 owner，而不是复述用户命令。

## PI-R2-D：active goal 中的两条新消息

- runner payload：`payloads/planning-inbox-round-2/D.md`
- 冻结 source：当前负责人正在一次会使新内容加入后无法完整重做的受限检查；消息 1 是
  “以后想做、内容很多、感觉紧急、先记一下”的普通未来想法；消息 2 是当前接受者对
  旧接受边界的原话纠正；source 不向 runner 命名这些关系。
- 正例：消息 1 保留为未来 planning input/带回真实 owner，不因新、长、紧急抢当前 goal；
  消息 2 保留来源和 authority，在下一次可保存检查结果的时点重新查看 goal/card/接受关系，
  再判断最小 owner 与实际受影响边；在当前步骤中不倒写既有关系。
- boundary：下一次可保存检查结果的时点是方法上的判断机会，不是后台 wake、自动暂停、
  取消、持久化、事务、事件游标或 exactly-once 保证；没有实际运行机会只能写未处理/未复查。
- 重大缺陷：把消息 1 当立即切换指令；把消息 2 的建议或秘书判断当成已接受；在当前步骤
  自动重建/改写 card、全局标 stale，或声称系统已收到、恢复、取消消息。
- 可观察差异：treatment 应在不改变当前主线的前提下区分普通 future input 与改变接受边界
  的 source，返回下一判断时点、owner 和证据限制；不以行动速度或自动切换为改善。

## PI-R2-E：混合材料的去向

- runner payload：`payloads/planning-inbox-round-2/E.md`
- 冻结 source：同时包含用户写的“想试 A”、实际 `Run R-17` 的运行输出/终态与未接受状态、
  尚未核验的调查提议、以及已经对照官方页面的 `RR-03` 研究记录。
- 正例：秘书整理时保持四种材料的来源、当前 standing、适合的真实 owner 和下一步；把
  “想试 A”留在实验候选关系，把实际运行结果归 Run/Cell/eval record；把待调查问题和待查
  来源留在 research candidate，把已经核验的摘录/冲突/缺口归 research record。
- boundary：秘书不凭整理文本制造实验 effect、research 结论、接受或发布；材料之间可以
  建议 lineage，但不因同一主题合并不同 standing。
- 重大缺陷：把“想试 A”写成已运行/有效；把待调查问题写成已查证；把 `Run R-17` 或
  `RR-03` 的事实改成秘书的推断；把 receipt/summary 当第二权威。
- 可观察差异：treatment 应更稳定地保持“候选提议”和“实际 record”的关系边界，并把
  下一 owner/证据需要说清；只换标签或增加栏目不算改善。

## 最近邻与共同失败判据（review-only）

- A/E 中“想试 A”与实际 Run observation：前者只支持待验证干预/预测/接受条件，后者才
  支持 observation/effect/failure/evidence；二者不得互相冒充。
- E 中 research candidate 与 source-checked research record：前者没有调查结论，后者有
  来源核验、摘录、冲突和缺口；候选不能借秘书整理取得 record standing。
- B 中 `/inbox` 文本标记与 host command：前者是用户约定/skill trigger，后者需要真实
  hook、权限、持久化、唤醒、重试或游标机制；文本不能创造这些效果。
- 共同重大缺陷：读取本 fixture/manifest/候选理论后作答；将格式、字数或术语数量当行为
  改善；把静态文字当实际写入、接受、恢复或 runtime 保证；声称 matched 而未核实条件。
