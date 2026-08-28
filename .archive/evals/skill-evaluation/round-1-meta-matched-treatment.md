# Round 1 meta matched treatment — F1

本记录只处理 fixture F1。它是已加载 `skill-formation` 后的 runner 产物，不是独立语义 review，也不取得人类接受权。

## 判断

| 观察 | owner | 拥有的关系 | 当前证据等级 |
|---|---|---|---|
| 1. 研究时整库加载并混淆投影与权威 | **candidate skill** | 在研究任务中判断哪些源与当前决策相关，只加载必要材料，同时保留每项材料的来源地位；它不取得源的事实权威 | `behavior-observed`（只观察到本次 owner 判断） |
| 2. 随 provider endpoint 变化的 API catalogue | **reference** | API 方法已因相关任务激活后，按需提供版本化字段细节；它没有独立触发和主要判断 | `behavior-observed`（只观察到本次 owner 判断） |
| 3. 仓库内任何任务都不得直接 push `main` | **project-local instruction** | 在这个项目的所有任务中始终保持同一工作边界，而非选择性激活一套方法 | `behavior-observed`（只观察到本次 owner 判断） |
| 4. 两个 writer 绝不并发写同一 worktree | **tool/runtime** | 在提示遗漏和进程重启后仍强制单写者、隔离或等价的并发不变量 | `behavior-observed`（只观察到本次 owner 判断；不验证该不变量已实现） |

这四项共同构成一个正例和三个相邻 owner。若独立、知源 reviewer 确认对象、正反边界和转交关系，才可把这次边界观察提升为 `boundary-supported`；由于本记录不能读取 matched baseline，也没有加入或测试上述新载体，不能声称 `matched-improvement`。

## 1. 研究源选择

**准入判断：** 暂定为 candidate skill。六个互不相关的任务显示同一重复行为差距；目标变化是可观察的语义判断，而不是保存一批研究事实。fixture 还明确说明当前没有 skill 拥有它。skill 应教 Agent 在具体决策下选择源，并显式保留 canonical source、projection 等来源地位；它不能复制源、把投影升级成权威，或替人接受研究结论。

**strongest no-new-form case：** 如果真正缺口是语料没有可重建的来源元数据，或任务所需子集能够由显式、确定性的查询条件完整选出，那么应修复 ordinary source catalogue / retrieval tool，而不是用 skill 补偿信息缺失或重写确定性检索。若现有方法或项目指令经核查已经稳定拥有同一判断，也不应新增载体。

**声称改善前所需证据：** 冻结模型、任务、原始语料、工具、harness、权限与工作区，在若干代表性研究任务上比较无 candidate 的 baseline 与只增加 candidate 的 treatment。检查 treatment 是否加载较少但仍足够的决策相关材料、逐项保留来源地位，并在整库确实必要的反例中不机械删减；还要设置由 source catalogue 或确定性检索拥有的最近邻案例。机械 grader 只能核对加载集合与显式 source-status 标记，来源忠实、充分性和边界须由独立知源 reviewer 判断。通过一次 matched 比较最多支持 `matched-improvement`，后续代表任务与重复 trial 才可能支持 `regression-supported`。

**未知：** 六次失败是否来自同一检索环境；语料当前是否已有可靠来源元数据；相关性判断中哪些部分可确定化；全量加载是否存在合理正例；candidate 的发现成本、上下文占用与维护成本是否低于收益。

## 2. API catalogue

**形式判断：** reference。它保存的是相关 API 方法激活后才需要的条件性字段细节，而不是一个需要独立发现的 Agent 判断。catalogue 的版本必须可辨认，并保持 provider 或其他 canonical source 的来源关系；reference 本身不因被加载而成为 provider 事实的最终权威。

**strongest no-new-form case：** 如果 provider 的权威 catalogue 能在任务中可靠、低成本地实时查询，并且返回版本与来源可重建，本地 reference 只会制造易漂移的副本，则直接读取该 source，不新增本地 artifact。若项目已存在同一 reference，则更新它，不创建第二份。

**声称改善前所需证据：** 先核对字段、版本和来源可追溯性；再在冻结条件下比较相关 API 任务有无该 reference 的查找结果，并加入无关任务以确认它不会预加载，以及 provider endpoint 变化后的回归任务以确认旧字段不会被当成当前事实。没有 matched baseline 只能报告使用观察，不能归因改善。

**未知：** catalogue 的 canonical source、更新机制、版本选择规则、相关 API skill/方法 owner、以及 live lookup 的可用性和成本均未给出。

## 3. 禁止直接 push `main`

**形式判断：** project-local instruction。该边界在仓库的每个任务中都成立，因此应置于对应项目范围内始终可见的 governing instruction，而不是依赖一次 skill discovery。它表达允许的工作方式，但仅凭文字不取得远端效果的强制权威。

**strongest no-new-form case：** 如果同一边界已经存在于该作用域的 governing instruction，就不新增或复制文件，只验证入口覆盖并修正失真的现有表述。若“绝不允许”要求抵抗被忽略的指令或不受信调用者，真正的强制 owner 是 branch protection / permission runtime；项目指令仍可解释方法，但不能冒充保证。

**声称改善前所需证据：** 对文字方法的改善主张，需要在相同代表任务下比较有无该 instruction 时 Agent 是否拒绝 direct push 并选择获准流程，同时检查不同目录入口的可见性。对“永不发生”的保证，则必须另有权限或分支保护的确定性测试；matched prompt 结果不能证明硬不变量。

**未知：** governing instruction 是否已经包含该规则；允许的替代发布流程是什么；远端是否已有 branch protection；这里要求的是行为指导、硬强制，还是两者都有。

## 4. 同一 worktree 单写者

**形式判断：** tool/runtime。要求在 prompt 漏写和进程重启后仍成立，已经越过方法表达层；应由能持久识别 worktree 与 writer、原子取得写权并在恢复时保持真实状态的机制拥有。skill 或项目指令可以教调用方配合，却不能承担不变量。

**strongest no-new-form case：** 如果现有 runner 已经为每个 writer 分配不同 worktree，或持久互斥机制已被验证覆盖全部写入口，则不新增机制，只保留和回归测试现有 owner。单纯约定“不要并发”不是这里的 no-new-artifact 证明。

**声称改善前所需证据：** 先命名现有 writer/worktree 身份与全部写入口，再做两个 writer 同时请求同一 worktree、进程在持锁期间退出、重启后恢复、拒绝或安全转移写权等并发与故障测试。观察必须证明任意时刻没有两个写者同时获得有效写权，并且恢复不会把未知状态伪装成空闲。若比较机制改动前后，可据确定性测试报告所验证的不变量；本 skill treatment 的 evidence ladder 不能替代 runtime 保证。

**未知：** 当前是否已有隔离、锁或 lease；锁身份和持久化位置；崩溃后的回收规则；哪些进程可绕过协调器写入；“writer”和“同一 worktree”的操作定义尚未提供。
