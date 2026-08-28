---
kind: research-candidate
id: research-reading-candidate-jitrl
status: settled
disposition: no-proposal-now
evidence: source-read
consumer: future-memory-experience-system
---

# JitRL 研究候选（窄读已完成）

lifecycle：`settled`
record kind：`research-reading-candidate`
evidence：`source-read`
applicability：`reconciled`
acceptance：`pending`；当前处置为 `no-proposal-now`。

本记录只保存一项待阅读研究输入及其后续回返问题，不是论文全文研究记录、实验/eval Run、方法采用
决定或 WorkCell/DeepSeek Harness 实现授权。

## 来源

- 原文：<https://arxiv.org/abs/2601.18510>
- 标题：Just-In-Time Reinforcement Learning: Continual Learning in LLM Agents Without Gradient Updates
- arXiv 当前核对版本：v3，2026-06-08；2026-08-25 已窄读论文 HTML 中的方法、理论假设、实现、
  实验对照和限制段落，并阅读公开仓库 README；未审计代码、未复现实验。
- 论文作者、方法主张、实验数值、成本数值和理论证明现已可与论文正文对照，但仍属于论文报告，
  不是本项目的 evidence 或 evaluation Run。ICML 2026 Spotlight 是仓库 README 的项目自述，未在
  本记录中把它当作本项目结论。
- 来源 lineage：用户在 2026-08-25 对话中提出；相关上下文与原始长摘要保留在当前对话。

## 用户提供的摘要

1. JitRL 是免训练的测试时策略优化方法：模型权重冻结，通过检索经验记忆估计动作优势值，
   直接调制模型输出 logits，不做梯度更新。
2. 它针对部署后权重冻结、持续适应困难、传统强化学习成本高和灾难性遗忘，以及纯提示词
   上下文学习的长度与技能表达限制。
3. 推理时检索相似历史轨迹、估计优势值、调整 logits 后选动作；任务结束后由评估器模型进行
   步级奖励归因，折扣累加成回报，将状态、动作、回报三元组写入记忆库。
4. 状态价值由相似邻居回报估计，动作价值由同动作邻居回报估计，二者之差形成优势值；未见
   动作按不确定则乐观的原则给予探索加成，并随记忆增加而减小。
5. 摘要声称，原 logits 加 beta 倍优势值是 KL 约束策略优化目标的精确闭式解；记忆积累后，
   检索估计逼近真实价值，策略逼近 KL 正则最优策略。
6. 有 logprob 接口的模型使用 token logprob；黑盒模型使用自报置信度换算的 verbalized logit；
   摘要称 Gemini、GPT、DeepSeek 等 API 模型都可使用。
7. 用户摘要记录了 WebArena、留出测试集和 Jericho/Zork1 的具体比较数字，需全文、代码和
   evaluation setup 复核后才能引用。
8. 用户摘要记录了 WebRL 与 JitRL 的 H200/API 成本和三十倍以上差异，需核对成本口径、模型、
   token、重复次数和是否包含评估器调用。
9. 用户将它与 EvolveR、ProcMEM、GAM 比较：JitRL 保留原始状态-动作-回报记忆，不蒸馏为文字原则
   或可调用技能，且主要作用在输出侧动作概率而非输入侧上下文选择。

## 2026-08-25 原文窄回读

来源：论文 [arXiv v3 HTML](https://arxiv.org/html/2601.18510v3) 与公开的 [JitRL repository](https://github.com/liushiliushi/JitRL)。

### 已由来源支持的观察

- 方法链是：把环境状态与有效动作历史压缩成结构化表示，检索相似记忆，构造 LLM 候选动作与记忆中动作的联合候选集，再将归一化优势值加入候选动作的 base logit；回合结束后由 LLM evaluator 做步级奖励归因并回写记忆。
- 对未见动作，方法使用随记忆量变化的探索加成；这属于策略选择信号，不是执行结果、事实证据或 acceptance 判断。
- 理论收敛不是无条件保证。论文明确依赖状态正则性、噪声、kNN 覆盖、动作频次、策略漂移速度和策略正则性等假设；工程上不能把“优势值估计”直接当作真实价值。
- 论文报告 WebArena、Jericho/Zork1、跨 backbone（包括 DeepSeek-V3.2）和 prompt-update 对照结果；这些数字的地位是论文实验结果，尚未成为本项目可复用的 benchmark evidence。
- 论文报告检索开销在其设置和记忆规模下相对 LLM 推理较小，但 JitRL 仍引入回合后 evaluator、记忆写入和推理时检索；该开销结论不能直接外推到本 harness 的 wall-clock。
- 论文自己列出的限制包括 base model/候选动作集依赖、evaluator 误归因、文本状态对空间或时间序列信息的弱表达，以及记忆中潜在的敏感用户信息。仓库 README 还提示旧 Gemini snapshot 的复现数字可能因模型退役而变化。

### 对本项目的适用性对账

- **WorkCell：不改变 canonical protocol。** JitRL 的 memory、return、advantage 和 policy modulation 属于策略适应层；WorkCell 仍只应记录可观察的执行事实、效果、失败、未知和独立审查结果，不授予回报或 evaluator 以执行/acceptance authority。
- **可能的后续设计启发：保留为独立 system-layer candidate。** 如果未来出现真实 consumer，可另行研究 typed experience projection，例如 `{stateRef, actionRef, return, evaluator, basis, confidence, validity}`；这不是 WorkCell 字段，也不是当前接受的协议或生命周期。
- **Throughput：不改变当前 standing。** 论文的检索延迟不能回答当前 harness 的端到端执行慢问题；它反而提醒我们把 evaluator、retrieval、memory write 分别计入 trace，不能只看单次模型响应时间。当前 throughput 仍是 design-only / trace-schema-formed / independent-review-complete / owner-gated / current wave closed。
- **DeepSeek Harness：不解除前置条件。** DeepSeek-V3.2 只说明该论文做过一个跨 backbone 的 policy 适配实验，不等于存在 DeepSeek harness 工作系统、provider-neutral memory contract 或可直接迁移的实现方案。
- **安全与保留：保留为未来系统层问题。** 原始轨迹和状态可能含敏感信息；若未来形成 consumer，必须另行定义 retention、访问、纠正和失效规则，不能由 WorkCell 记录默认承担。

## 待读问题与对本项目的可能启发

以下是候选问题，不是当前结论：

- 经验记忆是否应被视为 WorkCell observation/evidence 之外的策略适应层，还是会混淆事实、
  评估、策略和 acceptance authority？
- 非参数优势值、探索/利用信号和回报记忆，如何与 WorkCell 的 effect、failure、unknown、
  semantic review 和 acceptance 分界？
- 黑盒 verbalized confidence 是否足以支持可比较的动作调制；它的误差、校准、provider
  差异和不可用情况如何表示？
- 对 DeepSeek Harness，是否有关于实时记忆、任务后评估回路、经验保留和 provider-neutral
  adapter 的可迁移设计启发？
- 这条路线是否与当前 harness theory 的“把方法与事实/效果/接受权威分开”要求相容，还是
  需要新对象、新生命周期或新 owner；只有后者成立时才可进入 WorkCell/system design review。

## 处理边界

- explicit：以后阅读，并检查对 WorkCell、DeepSeek Harness 工作系统和 harness 设计的启发。
- inferred：非参数经验记忆、测试时策略适应、输出侧动作调制、探索/利用和不依赖梯度的成本
  结构可能是相关观察维度。
- unknown：代码级复现、实验环境与成本口径、evaluator 归因误差、verbalized confidence 的校准与
  provider 可比性、经验的 retention/纠正规则、真实 consumer、owner 和 acceptance。
- evidence standing：source-read / method-observed / applicability-reconciled / no-project-run /
  acceptance-pending。
- disposition：保留为 research-reading candidate；本轮不创建实验、不修改 WorkCell 协议、不实现
  DeepSeek Harness、不把论文数字写入 evidence，也不改变 throughput 或 DeepSeek 的 planning
  standing。
- next return：只有出现真实 memory/experience consumer，或系统设计卡明确要求比较“检索经验 +
  evaluator”与 prompt/context baseline 时，才定义独立 system-layer object 并安排 bounded experiment；
  否则不重复阅读、不自发扩展架构。
