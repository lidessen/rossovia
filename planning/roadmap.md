# Roadmap

从理论重新生长下一版，而不是把现在的运行时迁完。基座和 harness 都可以大改；现在最值钱的是理论，系统要在理论和 skills 齐了之后再设计。

## 要长成的形状

- **理论与设计。** 哲学基础（理论：`theory/gene-expression.md`，源：`theory/philosophy.md` 与解读）、harness 理论、研究记录，以及仍约束下一版的成形文件。
- **方法。** `skills/` 放可独立使用的抽象方法；`.agents/` 放本项目自己的 skills。
- **基座。** 1+N：一个入口，N 个模块，例如任务、git/worktree，可以基于 DeepSeek Harness。
- **软件层。** 相对基座的 harness 方法层（当时说的后训练）：skills、prompt、任务表达骑在基座上，不靠改权重。
- **整合。** 入口把基座和软件层收成一次能用的整体。这一层还没有想好。

## 仍开放

- N 具体是哪些模块
- DeepSeek Harness 是载体还是内核
- 基座和软件层怎么合成，而不另造一套平行系统

## 来自 inbox 的候选方向

以下内容来自 `IN-2026-08-24-001`，只取得 roadmap candidate 地位；它们没有进入当前
`planning/plan.md`，没有优先级、承诺、正式 owner 或接受关系。逐字来源与处理 lineage
保存在 `planning/inbox-history.md` 的 `RCPT-2026-08-24-001`。

- **迭代学习类比。** 调查当前 theory→skill→eval→再生循环与“无监督学习”的相似点和
  不同点；目前只是 research/theory candidate，不是已经确立的理论结论。
- **开发生命周期 skills 套组。** 在当前理论与 skills 阶段之后，候选覆盖需求确认、设计、
  文档、开发、测试、验证和改进；套组边界、复用范围和接受条件尚未决定。
- **受控 Agent 行为评估工具。** 在理论/skill 部分达到另行接受的阶段后，候选实现能够控制
  变量、比较 prompt/skill 效果与模型能力的工具。若形成实验性实现或原型，归
  `experiments/`；协议、fixture、Run、review 与 evidence 归 `evals/`。当前两者都尚未建立，
  本项不是现有评估记录、实验结论或已授权开发任务。
- **概念碎片式输出实验。** 候选验证 prompt 能否改变可观察输出，使其更接近逐个概念出现
  而非完整句子；只检验外显行为，不把文本风格冒充未经语言处理的内部思维。
- **冲突角色整合实验。** 依赖上一候选的定义与证据，候选研究多个相互冲突的角色/人格表达
  能否形成持续、可观察的统一 Agent 行为；“意识”“统一自我”和成功条件仍待定义。
- **实时、多来源 harness 基座。** 作为现有 1+N / DeepSeek Harness 方向的架构候选，保留
  单主 Agent 或 Agent team、单会话、实时记忆/聊天记录、通知输入、多来源处理、todo 轮询
  并发和即时双向对话等设想；是否无 compact、怎样隔离双侧输出、并发与恢复语义都仍开放。
  当前分支只保存 harness theory 与候选方向，不实现 base。

这些候选的真实 owner 均为 `unknown`。进入 Plan、research record、experiment/eval Run、
实现或 acceptance 前，分别由当时真实的 goal/Plan、研究、实验、工程或接受 owner 决定。

## Replan when

- 理论不再是生长源
- 基座被规定必须继承当前运行时
- 1+N 或「基座 + 软件层」不再是目标形状
