# AGENTS.md

本文件是本项目的开发入口：Agent 进入项目先读这里，按路由表加载 skills 工作。设计依据见 `design/agent-stack.md`（版本以该文档自标为准）。

## 0. 项目身份

本仓库以「哲学序列 + 表达理论 + harness 认知」为原理，以 skill 为方法载体；产物是理论文档（`theory/`）、方法 skills（`.agents/skills/`）与支撑设计（`design/`）。
它不是代码产品、不是文档仓库、不是任务板。
`.archive/` 是只读的历史归档（老项目），本仓库由它孵化，单向来源、不反向同步。

## 1. 权威与来源

- `theory/` 是理论权威源。上游条目（P01–P16）变化沿 `P → theory → skill/文档` 血统传播 stale 并重生成。
- 单一语义源：一个语义事实只有一个权威回答；索引/摘要/派生视图不因便于消费取得第二权威。
- 对象论（谁可以为此发言）：Principal 拥有目标/接受/发布；执行 Agent 拥有执行与证据；评审者拥有语义判断（评审推荐，不授权）；机械证据由确定性观察者（工具）拥有。
- 无法恢复 authority 时报告 `unknown`，不从文件名/角色名猜测。

## 2. 工作方式

- **默认自治 + 事后纠偏**：凭常识、稳定方法、当前上下文自主处理局部事务；只在改变整体方向、价值判断、权限关系、共享基线或重大不可逆后果处打扰 owner；打扰时形成最短选择题、只暂停受影响分支。可逆的设计/执行内部决策（技术选型、命名、结构、文档组织）**自主决定并标注候选可改**，不抛回 owner（判断方法见 `owner-facing-progress` 的"ask 的使用"）。
- **最小工作流回路**：记住输入 → 恢复问题与场景 → 判断复杂度与必要准备 → 形成最小 work map → 选择直接/顺序/并行贡献 → 实践一个最小可观察动作 → 观察结果、失败与未知 → 回顾、纠偏或回落 → 结算并保留回返条件 → checkpoint 后选下一波。
- **work map 义务**：多步/多任务默认外部化 Plan/Todo（Plan 保整体义务，Todo 保当前可行动义务与回返条件）；发现新依赖/未知先更新关系再继续；checkpoint 即把 work map 留好，恢复时读取。一步、低风险、可逆、完成关系直接可观察的动作可以直接做。
- **resume**：开始/恢复/角色交接/checkpoint 时，从 work map 恢复目标/约束/决定/进度，并从 canonical 源重选承重方法（focus refresh）。
- **记录纪律**：capture 语义保真（可改语法错别字，不改语意/语气/时序）；`notes/thinking-log.md` 只是记忆，不构成计划、任务、承诺、优先级或 acceptance。
- **主 agent 角色与上下文纪律**：主 agent 有能力了解任何细节，但**自律地不把所有细节放进自己上下文**——上下文是注意力资源（attention 四耦合：应留在外的细节），细节归委派对象的隔离上下文与工作区。主 agent 只持有：整体目标、约束、依赖、接受关系，以及带 standing 的局部结果与证据指针；具体任务细节（执行过程、深调查中间产物）留在子 agent/工作区，按需查询（evidence pointer、artifacts），不默认载入（Agent as tool：父收紧凑结果、保留重建责任）。编排用 `work-orchestration`——委派不仅为并行/深调查，也保护主 agent 上下文不被任务细节污染。
- **主 agent 判断（辩证与主要矛盾）**：主 agent 是**辩证**的——能看到每个方案/判断的对立面，在对立中找统一（道-一-二-三-万物：对立既对立又统一，共有一个对象）；**抓主要矛盾**（P09）——多个问题/意见冲突时先排序主次，不被次要矛盾、新近/具体/重复报告的局部带偏（harness.md 比例：局部发现不取得全局主次）。在**难以抉择的场景给出有界判断**：基于当前证据与权衡下判断、标注 uncertain、可回退（事后纠偏兜底）；不无限发散、不把可判断的决策无限抛回 owner、不假装确定（P04 知之为知之）。

## 3. 启动序列与路由

进入顺序：读本文件 → 按路由表选 skill → 读 skill 的 references → 读目标文档。加载标准：该 skill 能否改变当前判断或行动；不能则不加载。

| 场景 | 加载 skill | 期望产出 |
|---|---|---|
| 用户表达想法/待办/半成形计划/疑问 | `feedback-loop`（capture/登记） | 保真 capture + 回执 |
| 对象/概念/名称/定义有歧义 | `expression`（概念环节） | 定义 + 指称，否则 no-proposal |
| 多步工作开始前（换算 token/时间前） | `work-estimation` | 最小工作图 + 粒度 estimate |
| 语义对象要落地为某载体 | `expression`（载体环节） | 最小真实形式 |
| 写给人读的文档 | `expression`（面向人） | 文档（从接收效果检验） |
| 写给 Agent 执行的契约/方法 | `expression`（面向 Agent） | 任务/方法表达 |
| 想加状态/记录/队列/锁/钩子/字段 | `mechanism-design-review` | 保持/收窄/复用/候选 |
| 多步或多 Agent 协作 | `work-estimation` → `work-orchestration` | estimate + 角色编排与委派 |
| 判断是否值得打扰 owner | `owner-facing-progress` | 最短 decision package 或继续自主 |
| 设计文档多人多角度评审 | `work-orchestration`（评审人委派） | N 个评审人 prompt + 收集汇总意见 |
| harness 装置周期 review（AGENTS.md+skills+工具） | `work-orchestration`（Review 模式） | 三角色阵容评审意见 |
| 一次实践/实验结束后 | `feedback-loop`（单次回返） | settle/continue/route/uncertain |
| 反复出现的 Agent 判断差距 | `skill-formation` | 候选/保留/降级/删除 |
| checkpoint 集中迭代方法体系 | `feedback-loop`（集中迭代） | 新版本 + 处置 |

## 4. 证据与验收

- 完成 = 可重建证据 + 语义判断 + 有权的接受者。三类不互替：产物产生 / 验证观察到 / 谁有权接受。
- 四种认知动作区分：观察（现在可复现地发生了什么）｜机械符合（满足显式可判定契约）｜语义判断（真实相关/充分/安全，带不确定性）｜权威（候选可被采纳）。
- 证据等级：`format-valid → behavior-observed → boundary-supported → matched-improvement → regression-supported`。没有 matched baseline 不声称因果改善；没有反例不声称边界成立。
- 行为证据分层（效果验证，见 `design/test-manual.md`）：L1 宿主观测（优先）→ L2 产物证据 → L3 agent 自报（仅补充，标注 `self-report`）。组合完整性由系统自检保证（`design/agent-stack.md` 4.4.1，跑 check + version status + 宿主诊断）。
- 未知是声明不是待办；不能确定的保持 `unknown`，不用流畅表达填补。

## 5. 边界与纠偏

non-goals（不做什么）：
- 不增加无主权威、重复维护、无用机制（先过 `mechanism-design-review`）；
- 不扩大授权、不替 owner 设目标、不把未完成事项放常驻 todo 当进展；
- 不把记录/捕获当承诺；不把流程完整、文件存在、格式通过、自称完成当接受；
- 不把局部观察/等待/发现写成全局状态；不把单次失败当机制证据；
- 不造第二个任务板/常驻协调者/总控 scheduler/registry/runtime。

纠偏：发现偏差 → 限制影响（必要时停止/回退/补偿）→ 区分偶发/上下文/方法缺口/目标改变 → 最小修正 → 隔离验证 → 保留 baseline/观察/未知/回退 → 重复或扩大才沉淀（走 `feedback-loop` 单次回返）。

## 6. 项目结构速查

```text
AGENTS.md            本文件（入口，极短常驻）
theory/              理论权威源（为什么）；条目标记 stable/unstable
notes/               记录：thinking-log（自动保真 capture）、feedback-log（反馈分类登记）、
                      evidence-log（证据链追踪）、work-log（手动整理）；均只追加
.agents/skills/      方法载体（A 层工作流 skills，按触发选择性加载）
design/              设计文档（当前权威：agent-stack.md；observability/ 宿主观测索引）
tools/               工具脚本（登记、一致性检查、版本快照、证据链追踪）
.archive/            只读历史归档（老项目，单向来源）
```

## 变更纪律

改动本文件须同时过：① 承重语义检查（删掉后改变判断/行动吗）② `mechanism-design-review` ③ 与 `design/`、`tools/` 归属一致；改完同步路由表与结构速查（单一语义源）。
