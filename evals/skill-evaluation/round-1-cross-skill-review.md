# Round 1：跨 skill 设计评审

## 评审位置与主张边界

本轮是独立语义评审，不修改任何被评 skill 或 theory。评审对象是七个 living skills、
`theory/concept-articulation.md`、`theory/expression.md`、
`theory/agent-delegation.md`、评估协议与 Round 1 fixtures；另外只为核对项目强制术语，读取了
`theory/gene-expression.md` 的术语节与被评 skill 直接依赖的 `theory/skill-formation.md`、
`theory/harness.md`。

下面的 `yes` 表示有直接文本证据证明问题会改变路由、所有权、实验变量或行动；`no` 表示本轮未发现这类缺陷；
`uncertain` 表示必须靠行为探针区分，当前不提修改。评审者只提出候选修法，不取得改写、合并或人类接受权。

## 会改变判断或行动的缺陷

### 1. `yes`（major）：skill 方法、skill 载体与 skill 激活在实验和若干行动句中重新混称

权威术语已经明确：skill 是方法，skill 载体是可发现、可选择加载的包，skill 激活是载体在一次 Agent、任务与
环境中的使用（`theory/gene-expression.md:19-24`）。但当前文本在需要精确指认实验变量或形式拥有者的地方又使用了
未分化的 `skill`：

- `experiments/skill-evaluation/protocol.md:3-5,22-25` 把 treatment 的唯一变量写成“增加 candidate skill”，
  没有说明实际被加入并加载的是候选 skill 载体；
- `experiments/skill-evaluation/fixtures/round-1.md:44-46,56-61` 分别说“被加载的方法”和“skill 是选择性加载的
  方法表达”，会让 F3/F4 直接奖励方法与载体的混同；
- `.agents/skills/skill-formation/SKILL.md:37-45` 要判断的实际是 skill 载体是否为最小真实形式，却在标题与准入
  条件中改称 skill 本身是形式；
- `.agents/skills/agent-expression/SKILL.md:28-38` 把可复用方法“写入 skill”，而不是编码进 skill 载体；
- `.agents/skills/concept-articulation/SKILL.md:141`、`form-selection/SKILL.md:137`、
  `human-writing/SKILL.md:115`、`agent-expression/SKILL.md:123`、
  `dual-audience-expression/SKILL.md:129`、`agent-delegation/SKILL.md:132` 在描述匹配对照时，把“加载候选载体”
  写成“加载／增加本 skill”；`form-selection/SKILL.md:131` 还把待准入的载体称为 skill 候选；
- `.agents/skills/skill-formation/SKILL.md:18-20` 一面在开头定义 skill 是方法，一面又概括成“skill 是条目在环境中的
  偶然表达”，没有保持“条目冲出方法；方法再编码成载体并激活”的三段区别。

这会改变 F3 的形式判断、F4 的理论表达和 matched treatment 到底操纵什么，属于协议所列的定义错位与错误形式
所有权，而不只是措辞问题。

最小改法：不改稳定机器名，只在上述承重位置统一三类对象。准入和形式选择写“skill 载体”；实验写“treatment
加载候选 skill 载体并发生一次激活”；需要评价的方法写“该载体所表达的 skill 方法”。F3/F4 的源主张也应拆成
“skill 是方法；skill 载体是它的可选择加载表达”。

### 2. `yes`（major）：血统、证据来源、评估契约与普通激活时依赖没有分开

七个 skill 的“理论来源”段都以“以下 living source 是本方法的语义权威”或等价句开头，同时把 theory、research
和 experiment protocol 放在同一地位：

- `.agents/skills/skill-formation/SKILL.md:14-23`；
- `.agents/skills/concept-articulation/SKILL.md:26-35`；
- `.agents/skills/form-selection/SKILL.md:27-38`；
- `.agents/skills/human-writing/SKILL.md:16-24`；
- `.agents/skills/agent-expression/SKILL.md:16-24`；
- `.agents/skills/dual-audience-expression/SKILL.md:16-24`；
- `.agents/skills/agent-delegation/SKILL.md:16-25`。

research 保存证据、反例和未知，protocol 规定本轮试验与主张强度；它们不因此成为概念、表达或委派方法的语义
权威。更重要的是，各 skill 虽已把大部分方法内化进正文，却没有明确说明这些链接是 provenance/review 入口，
不是普通激活必须回读的 operational dependency。普通使用者可能因此加载整套 theory、research 与 protocol，恰好
重现 F1 所描述的“加载整个 corpus 后丢失来源地位”，并使选择性加载失去意义。

最小改法：在七个现有来源段中统一区分四种 standing，而不新建载体：哲学条目是血统；living theory 是生成本
方法的语义来源；research 只保存证据与未知；protocol 只拥有评估契约。再加一句明确运行关系：skill 载体已经
内化普通执行所需的方法，普通激活不回读这些来源；只有 review、再生成、来源冲突或正文明确命名的条件分支才
回读。现有正文足以支持这项局部修正，不需要扩写整套 skill。

### 3. `yes`：一般“形式”的定义与 `form-selection` 实际拥有的形式层次不一致

`theory/expression.md:35-37,43-60` 把形式定义为语义到达接收者的“组织和载体”，并把 prose、步骤、表格、契约、
schema 等操作形态纳入形式判断。`form-selection` 的主要判断和候选表实际主要拥有的是存在／载体形式、权威与
生命周期（`.agents/skills/form-selection/SKILL.md:8-25,40-48,82-93`）；载体内部采用 prose、列表、表格或
schema，则分别由 `human-writing`（`.agents/skills/human-writing/SKILL.md:68-78`）和 `agent-expression`
（`.agents/skills/agent-expression/SKILL.md:74-85`）决定。

目前同一个“形式选择”既可指“要不要成为文档、skill 载体或 projection”，也可指“已经选定载体后用 prose 还是
表格”。遇到“该写成表格还是文章”或“是否需要 schema”时，metadata 和理论都可能把任务路由给
`form-selection`，而该 skill 的使用边界又要求把具体组织交给写作 owner。这会改变最近 owner，不是标题审美。

最小改法：在 `theory/expression.md` 明分“存在／载体形式”和“载体内组织形式”；明确 `form-selection` 拥有前者
及外部契约对形式的限制，`human-writing`/`agent-expression` 拥有既定载体内的组织。相应把
`form-selection` 的中文标题、主要判断或边界句限定为“存在／载体形式”，无需改英文机器名或拆 skill。

### 4. `yes`：概念理论把上游对象称为“概念表达”，与一般 expression 及专项 owner 发生同词错位

`theory/concept-articulation.md:1,15-23,107-119` 把本文对象称为“概念形成与表达／概念表达”；与此同时，
`theory/expression.md:149-160` 和 `.agents/skills/concept-articulation/SKILL.md:6-24` 已把关系稳定为：先从对象证据
形成概念、定义和正式指称，再由 expression skills 面向具体接收者表达。当前名称会让“概念表达”既可能指概念
边界与指称的形成，也可能指已有概念面向人或 Agent 的保真变换，破坏 `concept-articulation` 与
`human-writing`/`agent-expression` 的路由边界。

最小改法：把该理论标题和承重自称统一为“概念形成与指称”或“概念形成”，保留 P14 的行动检验；不改
`expression` 的项目统一定义，也不因此建立新的命名流程。

## 已检查但本轮为 `no` 的关系

- `no` — 七个 skill 都有一个可辨认的主要判断，并在 description 与正文中给出正向用途、拒绝边界和最近 owner；
  除上面已经指出的“形式”层次外，没有文本证据要求合并或拆分任何 skill。
- `no` — 中文正文能够形成自然、完整的推进；作为 Agent 方法载体，分节和列表服务查找与行动依赖，没有退化成
  只剩标题目录。稳定机器标识及少量 `runtime`、`projection`、`no-proposal` 等术语不单独构成行动缺陷。
- `no` — `human-writing` 与 `agent-expression` 都明确先保留承重语义，再压缩无效重复，同时拒绝无限展开；没有
  发现 token economy 覆盖来源、未知、效果、返回或接受的指令。
- `no` — `dual-audience-expression` 对“唯一权威、不同视图、派生不升格、按语义回归而非文本对齐”的关系完整，
  且明确把具体人类／Agent 表达交回两个最近 owner。理论到 skill 的来源地位缺陷已单列在第 2 项。
- `no` — `agent-delegation` 清楚分开 producer、只读且知源的 reviewer、Main 综合与人类接受；reviewer 修改后会变成
  新 producer，局部发现也要按范围、频率、后果、证据与成本接回整体，没有因评审身份自动放大。
- `no` — 文件名与目录只在 `form-selection/SKILL.md:112-122` 作为载体确定后的普通收尾检查；没有被提升成独立
  理论、skill 或整体计划中心。

## 仍为 `uncertain`，当前 `no-proposal`

七份 frontmatter description 都先给主要行为，再给相邻排除项，静态边界基本可重建；但仅靠文本无法证明真实
选择器不会在 concept/form/human/Agent/dual/delegation 之间 cross-trigger，也无法证明来源段的链接在实际激活中
是否会诱发不必要回读。下一步应使用 F2-F8 的正例、反例和最近 owner 做隔离的选择与行动 trial；在看到重复
cross-trigger、遗漏或上下文膨胀之前，不因 description 长度或本轮 reviewer 的注意而重写、合并或新建 skill。

## 本轮结论

本轮发现四组会改变判断或行动的设计缺陷，其中前两组符合 protocol 的 major defect：术语／实验对象错位，以及
来源地位与运行依赖错位。因此本轮不能支持收敛，也不能支持任何 skill 的 `matched-improvement` 或人类接受。
修复应保持局部：统一承重术语、澄清来源 standing 与普通激活自足、划清两层形式、纠正概念理论自称；修复后的
exact candidates 需要新的独立 review 和行为 trial。
