# Owner-facing progress and situated decision preparation

> 当前通用 harness design candidate。临时总 handle：`owner-facing-progress`；其中的设身处地方法暂用
> `situated-decision-preparation`，生成的短期视角投影暂用 `perspective-frame`。这些名称和载体仍待真实
> consumer、反例与独立 review 收敛；本文件不是运行时协议、owner registry、权限机制或实现授权。

## 定位与适用范围

很多 harness 在遇到未决问题时会把“等待 owner”误解为“整个工作停止”，或者为了推进而由 Agent 偷替
owner 做决定。本候选描述的是 [`default-autonomy-with-correction.md`](default-autonomy-with-correction.md)
中的一个例外通道：只有当 owner 的选择本身重大、会改变共享关系，或确实能解锁关键安全行动时，Agent
才准备 decision package；普通局部问题优先凭已有常识自主处理并在事后纠偏。

它适用于 planning、WorkCell、coding、research、support/chat、evaluation、multi-agent coordination
以及其它 harness。planning 不是它的语义拥有者，只是当前第一个 dogfood consumer。

主观能动性研究进一步限定了本候选的位置：owner-facing 是重大选择的例外通道，不是 Agent 获得行动
动力的来源，也不是普通不确定性的统一出口。独立运行应先由 activation/wake 暴露机会，再由 Agent 在
已有 authority 和效果边界内判断、行动和纠偏；只有影响方向、权限、共享基线或不可逆后果时才形成
decision package。owner-facing 的作用是保护局部行动回路的边界和选择权，不是把普通不确定性重新变成
事前审批。

这里的 **decision owner** 是对某个具体选择、接受或不可逆效果拥有权威的主体；它可以是 Principal、
协议 owner、record/evidence owner、下游 consumer 或明确委派的接受者。它不等于执行者、提出方案者、
当前对话用户界面里的“负责人”或拥有某个文件的人。owner 身份与 authority 必须由 source、contract 或
明确委派恢复；缺失时保持 `unknown`。

## 问题边界

### 它要解决的关系

```text
pending decision/effect boundary
          │ source + authority + scene recovery
          ▼
 owner-facing decision package ──┐
          │                       │ owner chooses / revises / defers
          ▼                       │
 independent work continues       │
          └─────── owner return ──┘
```

目标不是让 Agent 自动获得更多权力，而是把人的注意力保留给少数重大选择，并减少决策拥有者重新恢复
上下文、事实、未知和取舍的成本。“只等待”不是默认的推进方法；“自行决定重大事项”也不是默认的
加速方法。

### 最近邻与排除

| 邻近对象 | 本候选的区别 |
| --- | --- |
| 普通等待/blocked 状态 | 本候选可以让一个分支等待，但要求先准备决策包；分支等待不推出全局停止 |
| delegation / task assignment | delegation 改变执行贡献的归属；本候选不猜 owner、不转移 acceptance 或权限 |
| 角色扮演、persona、模拟意识 | 第一视角只是恢复观察与后果的工具，不声明人格、真实身份或主观意识 |
| prompt/context stuffing | 视角帧是按风险和变化选择的最小 projection，不是把所有背景复制到每次调用 |
| memory / record | 决策包引用 source 和 unknown，但不是新的事实权威或长期记忆协议 |
| planning / queue / workflow | 它描述判断与返回关系；不规定队列、worker、固定状态机或全局调度 |
| runtime identity / permission | role lens 说明责任视角；不产生认证身份、授权、acceptance 或 effect capability |
| review / acceptance | decision package 是给 owner 的候选与问题；review 不等于接受，推荐不等于授权 |

## 两个层次和一个投影

### 1. Owner-facing progress：总方法

这是跨 harness 的推进方法，不要求每个系统都实现同样的界面或状态字段。遇到未决边界时，主 Agent
按当前 source 和 authority 进行最小判断：

1. **识别边界：** 明确正在等待的是哪一个 decision、acceptance、effect、source 或 consumer，而不是
   只写“等 owner”。
2. **恢复 authority：** 查找谁有权选择、接受、拒绝或授权不可逆效果；owner 不可恢复时报告未知，
   不从文件名、角色名、最后发言者或默认层级猜测。
3. **先做有界调查：** 在不改变未授权语义或效果的范围内，恢复目标、约束、source、已有观察、未知、
   失败/恢复关系和下游影响。
4. **判断是否值得打扰 owner：** 如果问题局部、可逆、低影响，直接采用已有常识和方法继续，并把
   观察留给事后纠偏；只有重大方向、权限、共享基线、不可逆后果，或确实阻塞关键安全行动时，才
   进入下一步。
5. **设身处地形成决策包：** 仅在需要请示时，以决策者或实际 consumer 的第一视角重建其需要看到和
   回答的问题，给出一个或多个可比较方案、取舍、风险和回返条件。
6. **保留选择权并继续独立工作：** 把明确问题和候选交给 decision owner，标出 recommendation 只是
   建议；不把准备写成 acceptance、priority、scope、协议字段或 runtime authorization。只局部暂停受
   影响分支，其它不依赖该决定的贡献仍可推进。新 source、owner response 或 decision-changing
   evidence 到来后再回接、重排或关闭分支。

这是一组判断关系，不是要求把六步写成固定工作流。若当前边界可以由已有 authority 直接完成，就直接
完成；若没有真实 owner、consumer 或 source，最小正确结果可以是调查后的 `unknown`、`no-proposal`
或请求补充 authority。

### 2. Situated decision preparation：通用方法表达

“设身处地”不是泛泛地想象某个人，而是把自己放到一个有来源边界的目标场景里，第一视角地检查：
这个主体现在试图完成什么、看到了什么、还缺什么、能承担什么后果、需要谁作哪一个决定。

它只改变观察和表达视角，不改变事实、authority、效果、接受关系或任务目标。场景事实不足时保留
`unknown`；第一视角不能把推测伪装成主体的真实内在状态。

### 3. Perspective frame：短期 projection

临时 projection `perspective-frame` 由三层组成：

```text
stable anchors
  + role lens
  + scene frame
  → current perspective projection
```

- **stable anchors：** 当前 goal/scope、canonical authority、non-goal、接受/效果边界、实现冻结和
  跨角色必须保持的不变量；来自当前 source，不由角色叙述生成。
- **role lens：** 该主体在此任务中的观察责任、可提出/可选择的决定、不可选择的决定、关注风险、
  输入和下游交接；它描述责任视角，不授予实际权限。
- **scene frame：** 当前事件/阶段、对象、具体目标、约束、source-backed facts、unknown、允许效果、
  可能后果和下一动作；场景变动时优先刷新这一层。

最小表达要能回答：“我现在处在什么场景，承担什么责任，必须回答什么问题，哪些事实有来源，什么仍
未知，能做和不能做什么，下一步应把什么交给谁？”它是可丢弃、可检查的 context/task projection，
不成为新的事实权威。

`perspective-frame` 可以作为通用 `focus refresh` 的承载视图：共同 anchors 提供当前不可遗忘的目标、
方法和边界，role lens 与 scene frame 提供随角色和场景变化的增量。它不要求复述完整理论或全部历史；
重点应由“遗忘后是否会改变当前判断或造成越界”选择。具体的触发、成本和跳过条件由
[`default-autonomy-with-correction.md`](default-autonomy-with-correction.md) 的“重要方法的复述”一节拥有。

## 视角的变化、组合与成本

默认选择一个当前最有用的 **primary role**。只有存在共享 contract、不可逆后果、owner decision、
下游损失或明显冲突时，才加入一个最有价值的 **counter-role** 或 **downstream-role**；不因角色数量
穷举全部视角。

role lens 变化时只刷新 role delta，scene frame 变化时只刷新 scene delta，共同 anchors 不重复倾倒。
不同角色的冲突保持为分别可读的 projection，再由拥有整体关系的 Agent 综合；不能平均成含义不清的
“统一角色”。token 成本随当前风险和视角差异增加，而不是随角色总数线性增加。

适合刷新视角的边界包括真实的 scene/role 变化、明显 scope drift、重大 review/decision、checkpoint、
context handoff 和纠偏恢复。
普通 start/stop 或工具调用不重复全文；稳定常识不因换一次任务就重新倾倒。必要时只复述与当前风险
直接相关的最小 delta。

## Decision package 的最小语义

下面是内容契约，不是要求所有 harness 采用同一 JSON schema、字段名或持久记录。只有确认需要请示时，
一个可回读的 decision package 通常需要：

- 待决定的对象、边界与为何现在需要选择；
- decision owner、其 authority 来源和仍无法恢复的部分；
- 由 perspective frame 恢复的目标场景与 first-person question；
- source-backed facts、观察范围、unknown、失败/恢复和下游影响；
- 至少一个可行方案；如有需要，包含 retain-unknown、defer 或 no-proposal；
- 各方案的收益、代价、风险、可逆性、允许效果和需要新增的证据；
- 有界 recommendation（若有）及其不是 acceptance/authorization 的说明；
- 需要 owner 明确回答的问题、返回路径、owner 回来前能继续的工作与停止条件。

包可以很短，也可以只说明“调查后没有可信方案”。没有真实 consumer 或 decision delta 时，不为了看起来
完整而新建包、registry、队列或兼容层。

## 与 harness 的接合和机制边界

通用接合关系是：

```text
task + source + authority + current scene
                    │
                    ▼
      perspective / decision projection
                    │
                    ▼
       agent task expression and bounded action
                    │
                    ▼
       evidence + unknown + owner-facing return
```

它可以落在 task expression、prompt/context projection、project-local skill、review practice 或已有
planning/workcell 方法中。只有当跨重启、并发、不可信 caller、通知、队列、取消、恢复或效果控制本身成为
真实硬约束时，才另行评估 runtime/base/adapter 机制；本候选不因为“owner 等待”自动创建 owner registry、
role registry、全局 blocked 状态或生命周期字段。

机制准入仍遵循 harness theory：先证明已有方法无法保持某个必须真实的关系，再引入最小硬机制；单次
prompt 失败只证明需要方法/上下文探针，不证明需要 runtime。

## 当前检验问题与 standing

通用候选要回答的不是“有没有写出第一视角”，而是：

1. 同一 harness 在 owner、role 或 scene 改变时，只有相关 projection 改变，共同 anchors 不漂移；
2. role label 不能扩大 authority，first-person 不能制造事实、permission、acceptance 或 priority；
3. owner 缺失时，Agent 能产生有来源、可比较且保留 unknown 的包，而不是偷替决定或无限等待；
4. owner-gated branch 暂停时，不依赖它的工作仍能推进，owner 回来后能按 evidence 重连；
5. 高风险场景会增加最有价值的 counter/downstream view，低风险场景不会因仪式而膨胀；
6. focus refresh 能减少 scope drift 或错误路由，且成本没有超过当前风险收益；没有收益时能够跳过，
   角色或场景变化时只刷新相关 delta。

当前 standing：`design-candidate / source-bounded / concept-boundary-observed / behavior-unverified /
acceptance-pending / carrier-not-selected`。现有 planning 与 WorkCell 文档只能证明有限的 project-local
dogfood 和设计准备，不证明跨 harness 改善、skill 可移植性、runtime guarantee 或协议接受。

## 当前 consumer 与下一最小实践

- planning：[`planning/index/whole-work-coordination-candidate.md`](../../planning/index/whole-work-coordination-candidate.md)
  将 owner-decision preparation 和 perspective frame 作为整体工作协调的应用投影。
- WorkCell：[`planning/records/workcell-design-acceptance-readiness.md`](../../planning/records/workcell-design-acceptance-readiness.md)
  将其用于 RunRecord identity 的 owner decision preparation；这不修改协议。
- 后续跨 harness probe：选择一个与 planning 不同、具有真实 owner-gated boundary 的 research/coding/eval
  consumer，比较只等待、无界自行决定和本候选三种处理，记录 authority、unknown、恢复成本、独立工作和
  回接证据。没有真实 consumer 前，不创建独立 skill；如未来需要 carrier，先按 skill-formation 的
  重复行为、正反例、最近邻和 matched evidence 检验。
