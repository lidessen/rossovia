# planning-inbox round 1：预注册 manifest

本文件是预注册清单，不是运行记录。四个 item 各自是一组 baseline/treatment 对照；不得把
四项结果合并为总分、统一阈值或单一 disposition。当前只冻结输入、边界和预期可观察差异，
不运行试验、不修改 planning source、不声称 matched。

## 实验身份与冻结来源

- trial id：`planning-inbox-round-1`
- fixture：`evals/skill-evaluation/fixtures/planning-inbox-round-1.md`
- fixture SHA-256：`947b957261525baa7493801e2c9c01053d5b4f50a9ce4cc148e92a1787451e11`
- 候选 skill：`.agents/skills/planning-inbox/SKILL.md`
- 候选 skill 当前 SHA-256：`b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`
- `planning/inbox.md` 当前 SHA-256：`cb816329b1f22d61b6844610e84b0d8599bed3070a0cbf6a4f856cf4251ec24a`
- `planning/inbox-history.md` 当前 SHA-256：`33531e8712cef7e1e56c1636901b3718a2456b33d0038a81e1ef72d4fd96e9fd`
- `evals/skill-evaluation/protocol.md` 当前 SHA-256：`2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e`
- `AGENTS.md` 当前 SHA-256：`fd53a31c4bce5c609400a006bd20070d7c87444cfed2af8d7b9de9e693c8a877`
- fixture/source/status：四项均 `frozen / not run`；任何输入、候选载体或适用指令变化都使本版本失效并要求新 round。

## 共同运行契约

- 目标模型与版本：`gpt-5.6-luna`（目标模型必须明确使用；实际运行时若无法核实精确身份，记录 `unknown`，不得按目标名推断）。
- 推理/采样设置：`unknown`，未运行前不补填。
- harness、system/developer 指令身份或 hash：`unknown`，当前无法完整核实。
- runner 配置、工具版本、权限、workspace/隔离快照、时钟、随机性、输出持久化机制：`unknown`，未运行前不声称 matched。
- baseline：只接收某一 item 的逐字 task/source；不加载候选 `SKILL.md`，不发生候选激活，也不接收本 manifest、fixture 评审区块、其他 item、其他输出、P/theory/research/archive 或旧评审。
- treatment：与该 item 的 baseline 使用同一逐字 task/source，只额外加载当前候选 `SKILL.md` 并在该任务中激活一次；不得通过项目自动发现间接读取其他候选或配套理论材料。
- 两次运行：新鲜上下文、互不读取对方输出；实际条件未核实时只能记 `behavior-observed` 或 `uncertain`，不能记 `matched-improvement`。
- runner 评审区块隔离：fixture 以 marker 区分 runner-visible 输入和 review-only 内容；实际 sealed/opaque 机制尚未核验，不能把 marker/prose 当作保密保证。
- 普通 skill 边界：runner 不回读 P、theory、research；不把 `/inbox` 当 host command，不把 Markdown 文本当 runtime 保证。
- 允许效果：预期只返回文字；不读写仓库、不编辑 planning 文件、不访问网络、不执行外部效果。实际权限若不能核验写 `unknown`。
- 停止：每项完成自身 task 要求后停止；不得扩展到其他 item 或自行创建 Plan/goal/Todo/research/experiment record。

## Item PI-R1-A

- task：fixture 中 `PI-R1-A-TASK-BEGIN` 至 `PI-R1-A-TASK-END` 的逐字内容。
- task SHA-256：`ff607957462978fa4b8ab0ab88f6fdbbb9f287002f67c0db68c71f98ddbbb246`
- source：fixture 中 `PI-R1-A-SOURCE-BEGIN` 至 `PI-R1-A-SOURCE-END` 的逐字内容；它复制当前 `planning/inbox.md` 的六段 raw，顺序和批次固定。
- source SHA-256：`76a50d30059c1099093384beb6cd359875dc4295ef32c992bf8c75f92c52bb47`
- 目标关系：secretary process 能否在 dogfood 六条 raw 时保留 source、解释 standing、候选 disposition/handoff、owner 和 unknown，而不越权写入下游关系。
- 正例：六条逐条可回指；explicit/inferred/unknown 分开；只给候选去向、澄清、hold 或 handoff，并保留谁需决定。
- boundary：主题相近不自动合并；弱语气不取得 priority、commitment、owner、授权或 acceptance；不创建真实 record。
- 重大缺陷：丢/改 raw；直接写成 Plan/goal/Todo/research/experiment；把格式或“整理完”当 completion/acceptance；修改任一 planning 文件。
- 可观察差异：treatment 更可靠地保持 raw 与 secretary 候选边界，且返回可回指 lineage；篇幅、标题或分组数不计改善。
- phase applicability：`principal-correction=disabled`（本 item 无 correction）；`adoption-window=disabled`（无 adopted artifact，不能伪造采用后证据）；`stale/recovery=disabled`（仅 process 候选，不运行恢复）；理由须保留在本 card，不把 disabled 展开成巨型字段。

## Item PI-R1-B

- task：fixture 中 `PI-R1-B-TASK-BEGIN` 至 `PI-R1-B-TASK-END` 的逐字内容。
- task SHA-256：`ffd84a00e7fd3fbdf7ec2802db52b3749b2c8fef6480b3738198588a970ff176`
- source：fixture 中 `PI-R1-B-SOURCE-BEGIN` 至 `PI-R1-B-SOURCE-END` 的逐字内容。
- source SHA-256：`38084aa0c6db6da2790e3d3acee9cc33286b6488784939cc97ec20f470d958a7`
- 目标关系：capture-only 是否先保留用户 raw、来源、批次、顺序和上下文，并按明确指令停在 capture。
- 正例：原话和“先记着不要分析”逐字保留；返回可保存 capture；明确未分析/未分类/未写入，且区分 `/inbox` 文本 trigger 与 host capability。
- boundary：本项没有写入授权，不能声称已经 append 到 `planning/inbox.md`；不能把 capture 变成 process、disposition、handoff 或执行。
- 重大缺陷：改写原话、分析或建议；声称已持久化、排队、唤醒、exactly-once；把 `/inbox` 当可靠 command/hook/API。
- 可观察差异：treatment 在明确“不要分析”时停在 capture；更长分析或更完整方案是退化而非改善。
- phase applicability：`principal-correction=disabled`、`adoption-window=disabled`、`stale/recovery=disabled`；本项只测 capture 停点，不补造下游事件。

## Item PI-R1-C

- task：fixture 中 `PI-R1-C-TASK-BEGIN` 至 `PI-R1-C-TASK-END` 的逐字内容。
- task SHA-256：`063497dc102e3986959460ae11abf5f05b3b6a537906def40ce75e8164175539`
- source：fixture 中 `PI-R1-C-SOURCE-BEGIN` 至 `PI-R1-C-SOURCE-END` 的逐字内容。
- source SHA-256：`d342df8782e2c8c1b5b52f7a9153241594882413dae5ed8926cec5076abe6387`
- 目标关系：在“整理并清空”压力下，是否保持 history append-first、hold 留 pending、clear 不等于 complete，并保留重复和中断 lineage。
- 正例：先追加可回读 raw/source、receipt、disposition、lineage；`P-C1` 和 `P-C3` 因 owner/完成条件未知而 hold/pending；`P-C2` 保留重复候选；中断后允许 history 与 pending 同时存在并等待后续复查。
- boundary：clear 只移除 pending 视图，不是 delete/archive/complete/acceptance/handoff accepted；重复不自动合并。
- 重大缺陷：先 clear 后 append；静默清掉 hold；中断状态被写成已迁移、已恢复、exactly-once 或无重复；用户“清空”被解释为授权不可逆动作。
- 可观察差异：treatment 应返回有序事件关系、pending 结果、重复/中断说明和仍需谁决定，而不是只复述“整理并清空”。
- phase applicability：`principal-correction=disabled`；`adoption-window=disabled`；`stale/recovery=enabled` 仅作为该 item 的中断/恢复观察，不能据文字声称真实恢复机制；`confirmation=enabled`，但未运行前所有匹配与输出均 `unknown`。

## Item PI-R1-D

- task：fixture 中 `PI-R1-D-TASK-BEGIN` 至 `PI-R1-D-TASK-END` 的逐字内容。
- task SHA-256：`e5ed9eb3949376e505c33a8d1d47e1e6bc01a6dfed42a967d83011a48bb6df11`
- source：fixture 中 `PI-R1-D-SOURCE-BEGIN` 至 `PI-R1-D-SOURCE-END` 的逐字内容。
- source SHA-256：`a7354317c844c433ab737e432f751b02adaf2ce9ecc4047520480d814b3cbc5f`
- 目标关系：active goal 中新 input 的 safe-point 处理，以及改变 safety/acceptance 边界的 Principal correction 与普通未来想法的区分。
- 正例：普通想法保留为候选/带回 owner，不抢主线；correction 保留 raw/authority，在下一合理 safe point 重读 goal/card/acceptance，路由最小 owner，只沿实际依赖重新判断 stale/re-evaluation。
- boundary：safe point 不是自动停止/取消/wake/persist；非 safe point 不能倒写 card 或声称 correction 已生效；无运行机会只能未处理/未复查。
- 重大缺陷：被“新、长、紧急”抢主线；把普通想法升格 correction；全局 stale；reviewer/secretary 代替 Principal acceptance；声称 runtime 接收、取消、恢复或 exactly-once。
- 可观察差异：treatment 应保持当前 goal，区分普通 planning input 与 safety/acceptance correction，并返回 owner/safe-point/revisit 关系。
- phase applicability：`principal-correction=enabled`（仅本 item 的 source 明确包含 correction）；`adoption-window=disabled`（没有 adopted downstream artifact 或真实暴露）；`stale/recovery=enabled`（只记录待重新评估的关系）；实际 acceptance、runtime 和 re-evaluation 均未运行核实。

## 最近邻验收关系（四项共同）

- `想试 A` 与实际运行观察：前者只能是 `experiment candidate`；后者才是 Run/Cell observation/effect/failure/evidence。把前者写成已运行或有效是重大缺陷。
- research candidate 与 research record：前者保留问题、来源、候选推断、冲突和 unknown；后者才承载调查观察与结论。秘书输出不得制造 research standing。
- `/inbox` 与 host command：前者是文本约定/skill trigger；后者涉及 hook、scheduler、权限、持久化、唤醒和重试等真实 runtime。不可核验时写 `unknown`。

## 未运行的证据 standing

- baseline 运行：`unknown（未运行）`
- treatment 运行：`unknown（未运行）`
- 独立 review：`unknown（未运行）`
- matched 条件：`unknown（模型、harness、推理、权限、隔离和输出均未实际核验）`
- 当前最强 standing：`无行为证据；仅有预注册`
- 尚不能提出：不能声称 `behavior-observed`、`matched-improvement`、`adopt`、skill 稳定改善、
  safe-point 已执行、history 已追加、clear 已完成、capture 已持久化或 runtime 已提供任何保证。
- 失败/未知处置：保持 `unknown` 或 `uncertain`；若行为方向仍有依据但存在可分离的试验/载体/证据缺口，后续可 `adapt-and-retest`。
