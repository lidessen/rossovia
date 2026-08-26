---
kind: research-candidate
id: research-reading-candidate-foreagent
status: settled
disposition: no-proposal-now
evidence: source-read
consumer: candidate-search-system
---

# FOREAGENT 研究候选（来源核对完成）

lifecycle：`settled`
record kind：`research-reading-candidate`
evidence：`method-observed`（source-read）
applicability：`reconciled`
execution：`no-project-run`
acceptance：`pending`；当前处置为 `no-proposal-now`。

本记录保存一项外部研究输入及其后续回返问题，不是论文全文研究记录、实验/eval Run、方法采用
决定或 WorkCell/DeepSeek Harness 实现授权。

## 来源

- 原文：[ACL Anthology 2026.acl-long.182](https://aclanthology.org/2026.acl-long.182/)
- 题目：`Can We Predict Before Executing Machine Learning Agents?`
- 作者：Jingsheng Zheng、Jintian Zhang、Yujie Luo、Yuren Mao、Yunjun Gao、Lun Du、Huajun Chen、Ningyu Zhang。
- 出版信息：ACL 2026 Long Papers，页码 3941–3974；论文页面、PDF 正文与附录于 2026-08-26 核对。
- 官方实现与数据：[zjunlp/predict-before-execute](https://github.com/zjunlp/predict-before-execute)；仓库包含
  `prepare_bench_subset/`、`grade/`、`mle-bench/` 三条入口，并链接 Preference Corpus 与运行数据包。
- 来源状态：ACL PDF 正文/附录和官方仓库 README 已读；没有下载、代码审计、环境安装或本地复现。
- 来源 lineage：用户在 2026-08-26 对话中先提供摘要；下列“论文观察”只取自正式 PDF/官方仓库，用户摘要保留为输入 lineage，不替代来源证据。

## 用户提供的摘要

1. FOREAGENT 在机器学习 Agent 生成候选方案后、真正运行训练与评测前，先根据数据报告和代码预测哪些候选更值得执行。
2. 它针对 Generate-Execute-Feedback 循环中的执行瓶颈，把 Data-centric Solution Preference 作为候选方案相对偏好的预测任务。
3. Verified Data Analysis Report 通过生成剖析代码、沙箱执行并人工核验日志、把统计量转成建模含义，为候选比较提供数据依据。
4. 摘要记录了 AIDE 与 AutoMind 方案筛选、18,438 对真实执行比较，以及 DeepSeek-V3.2-Thinking、GPT-5.1 等模型的预测结果；具体数字待正文核对。
5. 论文据摘要使用置信门槛、候选筛选和只执行 Top-1 的 Predict-then-Verify 闭环；全局排序、内部验证分数和预测置信度并非完美信号。
6. 用户摘要记录了 5 个 AI4Science 任务、12 小时预算下的收敛速度、搜索节点和 Beat Ratio 改善，以及与 MLEvolve、TuneAhead 的位置关系；这些结果和比较口径待核对。

## 论文正文与官方仓库核对（2026-08-26）

### 研究对象与数据血缘

- 论文把任务定义为 Data-centric Solution Preference：给定任务说明、数据分析表示、两个候选代码和偏好标签，预测哪一个候选更可能胜出，并输出选择、理由和 `[0,1]` 置信度。主任务是 pairwise preference，不是直接预测绝对分数。
- 语料来自 AIDE 与 AutoMind 在 MLE-Bench 上的真实轨迹：1,329 个有效方案经清理、去重、分类和专家抽样后保留 895 个方案，形成 18,438 个 pairwise comparison；论文说明了胜者位置平衡和歧义过滤。这个数据处理链本身包含人工/规则选择，不是自然产生的无偏运行日志。
- Verified Data Analysis Report 有三个步骤：LLM 生成隐藏标签的数据剖析脚本；沙箱执行并由人严格核验 stdout 是否有效；另一个 LLM 把数值事实转成建模语义。它是候选比较的输入条件，也是一项有模型、沙箱和人工成本的预处理，不应被当作零成本上下文。

### 预测能力与边界

- 主 pairwise 结果为 DeepSeek-V3.2-Thinking 61.5%、GPT-5.1 58.8%，高于随机 50.0% 和复杂度启发式 50.8%。数据表示消融支持“语义化数据理解”比单纯代码复杂度更重要；论文还报告自报 confidence 与准确率相关，并据此使用 confidence gate。
- 预测能力不是全局排序能力：list size 从 2 增加到 5 时，Accuracy@1 从约 61.3% 降到 31.1%，Spearman 约 0.22–0.25。因而 pairwise 预测结果不能直接组合成一致的全局排序，候选池变大时要保留验证和探索回退。
- 论文还报告内部验证分数对留出测试赢家的命中率为 72.2%，而 LLM pairwise 预测为 61.5%；这更像当前设置下的 noisy proxy 上限/参照，不是“静态预测已超过真实执行”的证明。
- 局限包括任务与领域分布不均、CV/NLP 部分依赖 metadata、multimodal profiling 尚未覆盖，以及 FOREAGENT 只采用较保守的“一次预测、一次执行”路径，未穷尽 selector 变体和超参数。因此 0.7 gate、10 候选、Top-1 执行应视为论文 treatment，不是通用默认值。

### FOREAGENT 的实际闭环与成本口径

- MLE-Bench 集成按轮并行生成 `m=10` 个候选，用 `c=0.7` confidence gate 筛选，再只执行 `k=1` 个 Top candidate；论文实验使用 5 个 AI4Science 任务、12 小时预算和每任务 3 次独立运行，报告平均 Beat Ratio。
- 论文报告约 6× 更快收敛、约 3.2× 更多搜索节点和约 +6% Beat Ratio；附录另报告 Test Improve Rate 53.49%（AIDE 执行-only 为 30.39%）及 Val-Test Agreement 75.23%。这些都是论文实验中的 treatment 对比，不是本项目证据。
- 官方仓库显示预测 benchmark 支持 pairwise/listwise、并行 runner、checkpoint 和 interaction logs；语料构建包括清理/修复、Docker 批量执行、评分和比较组构建。FOREAGENT 集成依赖 MLE-Bench、Docker、Kaggle 数据与模型 API。
- 论文披露的主要 benchmark 运行环境是 6 个 RTX 3090、6 个并发 worker、每任务隔离 GPU；语料构建约 78.5M tokens，分析/消融约 9.6M tokens。故 6× 主要是固定 12 小时实验中的收敛/搜索效率比较，不能直接解释成端到端 wall-clock、API 成本或任意 harness 的吞吐提升；预测报告、并发排队、失败重试和执行节省必须放在同一成本账上。

## 研究对象与最近邻

当前研究对象是：**昂贵执行发生前，对同一任务中的候选方案做相对选择，并用少量真实执行验证预测**。

它不是：

- 通用 Agent runtime 或自主性本身；
- WorkCell 的核心协议、Run/RunRecord 字段或 acceptance authority；
- 通用 evaluator、执行前事实证明或对候选质量的无条件保证；
- 单纯的模型 confidence 展示；置信度必须与选择效果、校准和漏掉优质候选的代价一起核验。

相邻但不等同的对象：

- **JitRL：** JitRL 从已发生的经验估计动作优势并在推理时调制输出；FOREAGENT 在候选尚未执行时预测相对胜者。两者都可能减少或重排昂贵动作，但 memory-based value estimation 与 pre-execution candidate preference 不是同一方法。
- **Agent harness throughput：** FOREAGENT 可能减少真实执行和搜索节点，但预测调用、数据报告生成、候选比较、错误筛选和重试也属于总成本；不能把“少执行”直接等同于端到端加速。
- **受控 Agent 行为评估设施：** candidate selector 是未来可能的 treatment/runner strategy 或 consumer，不是评估设施自身；它必须在冻结 card、候选 identity、预算和质量 guard 后再被评估。
- **Agent 主观能动性：** FOREAGENT 改变候选选择和执行预算，不证明 Agent 具有主动性，也不能替代 goal-linked action loop 的目的承接、后果归因与反馈纠偏问题。
- **WorkCell：** 若未来采用，预测属于策略/编排或 eval 层；WorkCell 只记录可观察执行事实、效果、失败、未知和独立审查，不授予预测器执行或接受权威。

## 剩余未知与可复核问题

以下仍未因本次来源阅读而闭合，也不是当前结论：

- Data-centric Solution Preference 的输入、输出和标签是否在不同任务间可重建；候选代码、数据报告和执行结果的 identity 如何关联？
- Verified Data Analysis Report 的生成、沙箱执行、人工核验和报告成本是否计入总预算；它是否只提供数据适配信息，还是混入了候选方案评价？
- 置信度门槛如何校准；错误的 false negative 是否会永久丢失潜在最优候选，是否有保留探索或校准回退？
- Top-1 执行、并行生成 10 个候选和相对排序之间的关系是什么；候选多样性、重复候选、数据泄漏和内部验证偏差如何处理？
- 论文报告的加速主要是固定预算下的收敛/搜索比较；逐请求 wall-clock、LLM call、队列等待、全部数据报告开销和失败重试如何合并，仍需代码/运行数据审计。
- 对当前吞吐研究，是否能形成 `T_useful / C_total / Q_guard` 下的“预测开销换执行节省”决策面；若质量 guard 不成立，是否应关闭 prediction treatment？这只能由真实 consumer 的 paired trace 决定。
- 对 DeepSeek Harness，是否只需 provider-neutral 的候选比较 adapter，还是需要新的经验、置信、回退和审计对象；在没有真实 consumer 前不预设架构。
- 预测结果应作为 proposal、selection signal、observation 还是 evidence projection；它不能未经独立验证进入 acceptance。

## 项目适用性对账

- **throughput：** FOREAGENT 提供一个可检验的 treatment 假设：用并行候选生成与廉价相对筛选，换取更少的昂贵执行。但项目应记录预测调用、报告生成/验证、排队、执行、失败重试、达到目标的 useful time 和质量 guard；只有 `T_useful / C_total / Q_guard` 同时改善，才称为吞吐收益。
- **WorkCell：** 候选生成和预测选择属于未来 strategy/orchestration 或 eval treatment。若真实 consumer 出现，候选应有稳定 identity，预测应作为 selection observation/proposal 保留，实际执行才形成 WorkCell Run/RunRecord；预测器不能授予执行权、完成权或 acceptance authority。
- **DeepSeek Harness：** 目前只得到 provider-neutral 的研究问题：是否需要一个可替换的 candidate-comparison adapter，以及 confidence、回退、漏选和审计记录。没有真实 consumer 前不把 DeepSeek 模型名、0.7、10 或 Top-1 写成系统协议。
- **JitRL：** 两者都是执行前减少浪费的思路，但 JitRL 用历史经验估计动作优势并调制输出，FOREAGENT 用数据报告和代码在候选级别做 pairwise preference；不能合并成一个“memory/selector”机制。
- **主要 failure guards：** false negative 丢失优质候选、confidence 失校准、pairwise 非传递、候选多样性不足、报告/标签泄漏、领域迁移、provider 差异，以及预测预处理成本超过执行节省。任何质量或 unknown 回归都应关闭 treatment，保留真实执行回退。

## 当前处置

- `explicit`：以后阅读原文，并核对它对 harness 吞吐、候选流程、WorkCell 边界和后续 DeepSeek Harness 设计的启发。
- `inferred`：执行前相对筛选、数据对齐的候选比较、预测置信度和 Predict-then-Verify 可能是降低昂贵执行次数的研究维度。
- `unknown`：代码实现与运行数据尚未审计，端到端成本与校准阈值的可迁移性、候选 identity 的项目映射、provider 差异、真实 consumer、owner 和 acceptance。
- `evidence standing`：`source-read / method-observed / applicability-reconciled / no-project-run / acceptance-pending`；这是来源观察，不是项目 evidence 或 Run。
- `disposition`：保留为 research-reading candidate；本轮不创建实验、不修改 WorkCell 协议、不实现 selector 或 DeepSeek Harness，不把摘要数字写入 evidence，也不改变 throughput/initiative/JitRL 的 current standing。
- `next return`：只有出现真实候选搜索 consumer 或明确的 throughput comparison 问题，才定义独立 system/eval-layer object 并安排 bounded comparison；否则保持 research candidate，不自发扩展架构。
