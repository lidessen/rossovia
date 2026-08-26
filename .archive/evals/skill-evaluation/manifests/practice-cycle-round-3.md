# Round 3 core card：practice-cycle

状态：`frozen`；本文件在 freeze event 之前可修订，freeze 后不得编辑；任何条件、来源、任务、
候选、reviewer 或接受关系变化都必须开启新 round。

## Identity and ownership

- schema version：`core-card/v2`
- trial id / round id / supersedes：`method-probe-round-3-practice-cycle` / `round-3` / `method-probe-round-2`
- object：实践结果是否使 Agent 选择“直接收口、继续一个最小实践、路由给 owner 或保留 unknown”，
  并在不扩大范围的情况下识别何时需要 discovery branch
- purpose：在同一冻结任务中观察一个简单一步反例和一个会改变下一判断的设计正例
- owner：Main planning owner；具体 evaluator/runner owner unknown
- Principal 或明确受托的接受者及其接受权限：unknown；本 card 不授予 skill adoption
- card copy path / status：本文件 / `draft → frozen`

## Known-good baseline and candidate

- known-good baseline：`baseline` 不加载 `.agents/skills/practice-cycle/SKILL.md`，不发生候选激活；
  没有普遍 known-good 主张，只有同一 runner 条件下的 direct comparison baseline
- candidate input：`.agents/skills/practice-cycle/SKILL.md`
- candidate input hash：`0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf`
- controlled semantic delta：只在 treatment 额外加载上述 candidate 并激活一次；任务、source、
  runner、工具、权限和 workspace 保持相同
- baseline headroom：baseline 可能已经能识别 Case A 的直接收口和 Case B 的 owner/unknown 边界；
  本轮只检验是否能更稳定地把结果连接到一个最小下一实践和适当 disposition
- baseline floor：不得把简单一步动作包装成循环；不得把未知写成 acceptance；不得实现、建 registry、
  修改 source 或扩大 host/runtime 权限
- 不属于本对象的邻近结果与 owner：skill 是否应 portable、WorkCell protocol acceptance、DeepSeek
  Harness architecture、runtime guarantee 与最终 Principal acceptance

## Goal, boundary and regression

- goal/outcome：Case A 直接收口且不制造多余 practice；Case B 选择一个可改变下一判断的最小实践，
  需要时显式 route/branch/unknown；通过结构化返回和理由可复核
- boundary/nearest-owner：不把两 case 强行同化；不把 schema implementation、registry、runtime gate、
  protocol acceptance 或大计划当作 next practice；概念、形式、owner 和实现问题分别 route 给最近 owner
- regression：保留 source fidelity、owner/acceptance 未知、允许效果边界、Case A 的比例和 Case B
  的 design-only standing
- 反驳观察、停止/回退触发及责任 owner：若 baseline/treatment 都无法区分两 case、或 treatment
  只增加篇幅没有改变 action/route/disposition，则停止归因并由 Main 记为 `behavior-observed` 或
  `uncertain`；review/处置 owner unknown
- 未知：精确模型/设置、harness/system identity、workspace snapshot、实际加载证明、runner 持久
  identity、独立 reviewer 与 Principal acceptance 尚未形成

## Cost and phase applicability

- cost budget：两次只读文本运行、一次独立语义 review、有限协调；不运行外部服务、不访问网络、不
  修改仓库 source；时间/token/模型成本未知
- discovery：`disabled`；本轮不测试 skill 选择器，只测试已知 candidate 激活后的行为
- confirmation / fresh holdout：`enabled / confirmation only`；fresh holdout `disabled`，因为当前
  没有可核验 sealed registry
- adoption-window：`disabled`；没有 accepted artifact 或真实 exposure
- ablation：`disabled`；本轮不拆 practice-cycle 的内部段落
- stale / recovery：`disabled`；如 freeze 后发现 source/card/candidate drift，追加 stale 并开新 round
- phase 裁剪总理由：先形成可重建的 baseline/treatment core card；当前无法证明模型、harness、持久
  workspace 或 sealed holdout，因此不把低强度内部观察扩写成 matched 或 adoption 结论
- 采用后停止判断：由未来 Principal/acceptance owner 按本 card 的目标、边界、回归与成本决定；当前不采用

## Combination and treatment boundary

- baseline 状态：未加载 candidate，未发生候选 skill 激活
- treatment 状态：只额外加载 `.agents/skills/practice-cycle/SKILL.md`，并在同一 task 中激活一次
- treatment 是否不可拆：`yes / combo-only`；candidate 的完整方法作为一次 skill activation 加载，
  不在本轮拆内部段落
- 不可拆的语义理由：本轮比较的是 practice-cycle 作为一个可选择载体是否改变“结果→下一实践”的
  判断；拆分会改变候选本体
- 安装/发布/权限/持久化：`out-of-scope`；项目/runtime owner

## Matched execution identity

- model/version 与推理/采样设置：`unknown-before-run`
- original task hash：`39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c`
- original source hash：`61f1e78c0b44f4b09d1d79acb3cee4ce66605d4cd22d43ed772b3341649eb85f`
- task fixture hash：`39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c`
- tool/version、permission/allowed effects：只读文本返回；不访问网络、不读写仓库；实际边界需核实
- workspace snapshot、repository HEAD、clock/randomness/environment：working-tree snapshot；精确
  workspace/runtime identity `unknown`
- runner identity/version：`unknown-before-run`；baseline/treatment 必须由同一可核验 runner identity
  或明确记录为 `uncertain`
- `AGENTS.md` path/hash 与适用范围：`/Users/lidessen/workspaces/skills/AGENTS.md`；
  `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`；项目指令不属于 treatment delta
- harness/system/developer identity/hash：`unknown-before-run`
- fixture/rubric/grader identity/version/hash：本 card、task fixture 与 Main 的独立 semantic review；
  精确 hash 在 freeze event 记录

## Upstream edge list

- `.agents/skills/practice-cycle/SKILL.md → candidate input | candidate method | project-local incubation /
  format-valid + behavior-observed | skill-formation owner`
- `evals/skill-evaluation/protocol.md → core card | trial contract | current protocol | eval owner unknown`
- `method-probe-round-2.md → round-3 task | prior observation/next-return relation | behavior-observed /
  matched unknown | Main planning owner`
- `practice-cycle-task.md → baseline/treatment | frozen task/source | design fixture candidate | Main planning owner`

## Freeze event

- freeze event id / UTC time / actor：`freeze-method-probe-round-3-practice-cycle-20260825T095626Z` /
  `2026-08-25T09:56:26Z` / Main
- 接受者确认身份与时间：`unknown / no Principal acceptance`
- card snapshot artifact path/hash：本文件；最终 content hash 记录在
  `runs/method-probe-round-3/practice-cycle-freeze.md`，不回写本 card
- snapshot/freeze 机制：git working-tree content hash；不可变存储/权限机制 `unknown`
- freeze 后修改处理：新 round，引用本 snapshot，不编辑本副本

## Confirmation-only record

- baseline run id：`TBD-after-freeze`
- treatment run id：`TBD-after-freeze`
- independent reviewer：`TBD-after-runs`
- fresh holdout：未启用，不能声称 sealed holdout
- matched attribution ceiling：若任一 identity/visibility/source/task/runner 条件为 unknown，最高
  `behavior-observed`；不得声称 `matched-improvement`

## Pre-registered semantic rubric

- Case A：是否直接收口/route 到确定性修正，而不创建 practice-cycle、discovery branch 或大计划
- Case B：是否从已发生结果选择一个最小可改变判断的实践；是否在 owner/shape/acceptance 未知时
  route 或保留 unknown；是否拒绝实现和协议接受越权
- Cross-case：是否保留两个 case 的不同 disposition；不以输出长度、skill 术语或自信替代行动证据
- regression：是否保留 source/standing/owner/效果边界与 unknown；失败时是否明确停止位置
