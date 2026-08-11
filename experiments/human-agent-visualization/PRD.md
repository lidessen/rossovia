# Project Lens：项目现状与变更影响

**状态：** Draft  
**首个使用对象：** Rossovia 当前仓库  
**首要用户：** 需要持续掌握项目整体的 Principal／项目负责人  
**产品顺序：** 先建立可信的项目现状，再解释变更影响

本文件记录新的产品目标与验收顺序；[DESIGN.md](./DESIGN.md)仍描述当前已实现切片及其
设计边界。两者不一致之处是后续设计需要显式处理的产品差距，不表示现有实现已经满足本 PRD，
也不使本文件自动获得 accepted architecture 的权威。

## 为什么现在要做

项目持续由人和 Agent 修改，但人的认知并不会随代码、设计文档和运行证据自动更新。
一次对话能够解释局部问题，目录树能够显示文件，设计文档能够说明意图；三者都不能单独回答：

> 这个项目现在是什么，它由哪些系统构成，各自负责什么，实现和验证到了哪里？

当这个问题没有稳定答案时，变更影响也无从判断。文件发生变化不等于架构发生变化；
反过来，一处很小的代码修改也可能改变责任、接口或验证边界。因此，产品必须先形成一个
可追溯的当前项目模型，再在这个模型上解释变化。

Rossovia 已经分别保留了项目目的、原则、架构、实现和证据：

- [Founding Mandate](../../design/FOUNDING-MANDATE.md) 和
  [Principle Sequence](../../principles/SEQUENCE.md)说明项目为什么存在以及通用方法根；
- [accepted design](../../design/DESIGN.md) 和
  [decisions](../../design/decisions/)说明稳定的责任、权威、状态和反馈关系；
- Skills、packages 和 operations 承载方法与实现；
- evaluations、Chronicle 和测试承载不同范围的证据；
- [现有 Project Lens](./DESIGN.md#project-lens)已经能把来源、确定性投影和
  Agent 解释分层展示，但它仍是一次性项目介绍，不是项目整体认知界面。

本 PRD 不建立新的项目事实源。它定义一个从上述来源重建、可检查、可失效的产品投影。

## 产品目标

Project Lens 使项目负责人能够：

1. 快速恢复对当前项目整体的正确认知；
2. 从整体逐层进入一个系统、责任、运行路径及其代码和证据；
3. 区分项目声明、代码观察、验证结果、Agent 判断和未知项；
4. 在现状认知成立后，理解一次变更影响了哪些责任和关系；
5. 从任何重要结论返回其来源、revision、观察时间和可推翻条件。

首个闭环只要求实现第 1～3 项。变更影响是第二阶段，不得倒置为产品首页或阻塞现状视图。

## 不追求什么

首个版本不是：

- 自动生成并拥有架构真相的图数据库；
- 展示整个目录或全部 import 的无限关系图；
- 通用的软件架构 ontology；
- 实时代码监控、运行时控制面或 Workbench 后端；
- 通过颜色、节点大小或中心性自动判断模块重要性；
- 允许在可视化中直接修改设计、接受事实或批准变更的编辑器；
- 代替 README、accepted design、ADR、测试或代码导航的第二套文档系统。

## 产品模型

### 一条认知轴

用户沿同一对象逐层深入：

```text
项目目的
  → 系统与能力
  → 责任和边界
  → 一条代表性运行路径
  → 代码与验证证据
```

层级是一种阅读路径，不是新的项目模块分类。它吸收
[C4 的分层缩放思想](https://c4model.com/diagrams)，但系统、责任和路径必须来自
Rossovia 的实际设计，不能机械套用外部模型的术语。

### 三种认知材料

每一层都必须保留现有设计定义的三类材料：

| 材料 | 示例 | 产品中的地位 |
|---|---|---|
| 来源与观察 | accepted design、代码、测试结果、Git revision | 保留其各自的权威、范围和新鲜度 |
| 确定性投影 | 文件存在、manifest 命令、精确 import、revision diff | 可从来源重建，不拥有事实权 |
| Agent 解释 | “这些文件共同实现某项责任”“这次修改可能影响某接口” | 明确标为建议、待确认或不可用 |

Project Lens 不把三类材料压成一个真假状态，也不生成项目总分。用户看到的是具体关系及其
standing。

### 两个产品视图

#### 现状

默认入口，回答“项目现在是什么”。它不要求存在历史基线。

#### 变更影响

第二入口，回答“相对一个明确基线，哪些已知关系发生了变化”。只有当前状态和基线能够
兼容比较时才可用。无法比较时说明原因，不把生成器变化、主体变化或证据缺失显示为项目漂移。

## 首个对象：Rossovia 当前仓库

Rossovia 的“现状”首屏由以下七个认知区域组成。这是当前仓库的项目特定划分，不是
Project Lens 对所有仓库的固定分类。

| 区域 | 首要问题 | 主要来源 |
|---|---|---|
| 目的与原则 | 为什么存在，哪些方法根保持稳定？ | Founding Mandate、Principle Sequence |
| 架构与决策 | 哪些责任、权威、状态和反馈关系已经接受？ | `design/DESIGN.md`、`design/decisions/` |
| Skills | 哪些可复用判断已形成，表达和行为证据到哪里？ | `skills/`、相关 evaluations |
| Missions 与 Workbench | 当前持续工作和人类任务由谁持有？ | `operations/missions/`、`operations/workbench/` |
| 执行与认知机制 | Work Cell、Cognition、Autonomy 分别执行或保留什么？ | `packages/`、`operations/autonomy/` |
| 证据回路 | 哪些观察、测试和评估支持当前说法？ | tests、`regeneration/evaluations/`、`chronicle/` |
| 人类投影 | 人如何看到、质疑和纠正系统？ | Workbench UI、site、Human-Agent Visualization |

每个区域至少显示：

- 一句话职责；
- `owns` 与 `does not own`；
- 上下游责任关系；
- 设计来源；
- 实现入口；
- 验证或证据入口；
- 当前无法证明、已经过期或存在冲突的关系。

## 核心用户流程

### 30 秒：恢复整体

用户打开 Project Lens 后首先看到：

- 项目目的和核心循环；
- 当前 Git revision、工作树状态和生成时间；
- 七个认知区域及其职责摘要；
- 明确的未知、冲突或待复核数量；
- 当前页面是否仍对应可检查的仓库状态。

首屏默认不展示文件树、完整关系图、历史 diff 或 Agent 长篇总结。

### 3 分钟：理解一个系统

用户选择一个认知区域后看到：

- 它在项目整体中的位置；
- 负责和不负责的事项；
- 与相邻系统的输入、输出、权威或验证关系；
- 对应设计段落、实现目录和测试；
- 每个关系是声明、观察、验证、Agent 解释还是不可用。

选择任一关系会打开证据抽屉。用户可以查看来源路径、revision、摘录、观察时间、standing
以及什么情况会推翻当前判断。

### 15 分钟：沿路径检查

用户从选中的系统进入一条有意义的代表性路径，例如：

```text
实践问题 → Principle → Skill → Mission / formation
→ Agent / Work Cell → verification → cognition / design revision
```

路径一次只展开一跳。代码层只展示支持当前问题的模块、符号和测试，不把全部代码关系带入
活动视野。

## 功能需求

### P0：当前项目现状

1. **精确主体**
   - 页面绑定仓库根、HEAD、完整可检查文件树 revision 和 dirty 状态。
   - 仓库变化后，旧投影不得继续伪装成当前状态。

2. **项目整体视图**
   - 支持项目目的、认知区域及核心关系的低分辨率展示。
   - 区域顺序和视觉中心性不得被解释为事实权或重要性排名。

3. **区域下钻**
   - 每个区域连接职责、边界、设计、实现和证据。
   - 缺少来源支持的关系显示 `unavailable` 或 Agent proposal。

4. **证据检查**
   - 用户能够从节点和关系到达仓库内实际来源。
   - 来源展示 revision、freshness、standing 和 disconfirming condition。

5. **认知层控制**
   - 保留来源、确定性投影和 Agent 解释的独立显示控制。
   - source-only 模式删除所有推断后，页面仍能说明已知内容和未知边界。

6. **刷新**
   - 用户可显式重新扫描当前仓库并生成新的现状投影。
   - 首版不要求常驻 watcher；刷新成功必须生成新的 binding。

### P1：变更影响

1. 用户明确选择当前状态与基线 revision；系统不得从“最近一次运行”静默推断接受基线。
2. 比较只在主体、关系契约和 builder 兼容时成立。
3. 确定性变化与语义影响分开：
   - 文件、符号、精确依赖和测试变化可以确定性展示；
   - 责任、契约、架构和行为影响由来源声明、验证证据或 Agent proposal 分别表达。
4. 影响按认知区域和关系归并，而不是按文件数量排序。
5. 每个影响项回答：发生了什么、为什么可能重要、证据在哪里、还需什么验证。
6. 一个已接受的设计变化可以更新后续现状来源；一次 Agent 比较不能自行修改设计。

## 数据与权威边界

首版继续使用现有 revision-bound evidence bundle，不引入图数据库。bundle 至少需要表达：

```text
subject and revision
project-specific facets
source-backed responsibilities
observed implementation and verification references
typed relations with derivation kind
standing, freshness, uncertainty, and disconfirming condition
builder identity and binding
```

项目特定的责任映射必须能够指向 accepted design。它可以由人工声明、Agent 提议和独立复核
逐步形成，但保存为 Project Lens bundle 后仍只是投影。若以后需要机器可读的架构来源，必须
由项目设计另行决定其语义所有权，不能让本产品在实现过程中顺手制造第二个 canon。

这与 [Cognition 的来源／投影边界](../../packages/cognition/README.md)一致，也与
[Backstage 对 catalog graph 的定位](https://backstage.io/docs/features/software-catalog/creating-the-catalog-graph/)
相符：目录和关系图服务人的系统认知，但不应成为现实的终极事实源。

## 更新循环

现状和变更影响使用三个不同速度的循环：

1. **结构刷新**：显式刷新时重新观察文件、manifest、符号、精确依赖、测试入口和 revision。
2. **语义协调**：任务检查点或合并前，Agent 只复核被结构变化触达的责任关系，输出带来源的
   proposal 或 unresolved relation。
3. **设计更新**：只有实际实践表明设计需要改变，并经过项目接受过程后，才更新 accepted
   design 或 decision；下一次现状刷新再投影该变化。

结构刷新失败不得清除上一次可识别的投影，但旧投影必须显著标记为 stale。语义协调失败不得
阻塞无关区域的现状展示。

## 成功标准

### P0 验收

针对 Rossovia 当前同一 revision，将 Project Lens 与直接阅读 README、design 和聊天解释
进行对比。使用 Project Lens 后，Principal 应能够：

1. 在三分钟内正确说明项目目的和至少五个主要认知区域；
2. 对选定区域正确说明其一项 `owns` 和一项 `does not own`；
3. 找到该区域的一处 accepted design 来源、一处实现入口和一处验证或证据入口；
4. 指出至少一个当前 `unavailable`、未验证或冲突的关系；
5. 区分 source-declared、deterministic observation 和 Agent explanation；
6. 识别当前页面对应的 revision，以及工作树是否含未提交修改。

若页面让用户把目录、import、视觉中心性或 Agent 解释误认为已接受架构，即使任务完成得更快，
P0 也不通过。

### P1 验收

在 P0 通过后，选择一个包含设计、实现和测试变化的真实 revision pair。Principal 应能够：

1. 找到被影响的认知区域和责任关系；
2. 区分确定性代码变化与待验证的语义影响；
3. 沿来源理解为什么一个影响项出现；
4. 说明还需要执行什么验证或做出什么设计决定；
5. 在比较不兼容时，不把工具或主体变化误判为项目漂移。

## 交付阶段

### 阶段一：现状可理解

- 扩展现有 Project Lens bundle，使其表达 Rossovia 的项目特定认知区域；
- 实现项目整体首屏和一个区域的完整下钻；
- 保留 revision binding、证据抽屉、三层开关和 source-only 模式；
- 用真实当前仓库完成一次 P0 理解测试。

### 阶段二：现状覆盖扩展

- 补齐七个区域的职责、实现和验证映射；
- 对缺失、冲突和陈旧关系形成可操作的 unresolved 列表；
- 验证整体视图不会退化为目录浏览器或大而无当的关系图。

### 阶段三：变更影响

- 增加显式基线和兼容比较；
- 实现按责任关系归并的影响视图；
- 用真实变更完成 P1 理解测试。

在阶段一通过前，不开始实时索引、通用 Code Lens、全量调用图、运行时监控或可视化编辑。

## 当前实现 checkpoint 与 todo 主线

Project Lens 仍以“当前项目现状”为默认模式。当前功能 checkpoint 在同一 Lens 内增加紧邻的
“变更影响”模式，用显式 base revision 检查一条 Agent 选定、可回到设计段落的责任范围；
变更模式按 current/base/dirty/generated/compatibility、changed/disputed responsibility、
unresolved 的顺序呈现，且不能把目录变化自动解释为架构变化。这一 checkpoint 用于验证
revision comparison 和移动端阅读契约，不把 P1 提升为产品默认入口。

后续 todo 主线仍是阶段一的当前现状闭环：

> 从 Rossovia 当前 revision 重建项目目的和七个认知区域；首屏展示整体，点击“执行与认知机制”
> 后能够看到 Work Cell、Cognition 与 Autonomy 的职责边界、实现入口、验证证据和未知关系；
> Principal 能从任何结论返回来源。

在该现状基线完成人类理解测试前，不扩建全量责任映射、关系图、实时索引或通用代码影响分析。
