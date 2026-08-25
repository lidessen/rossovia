# Round 2：修订后 skill 系统设计独立 review

## Review 边界与主张

本轮 reviewer 未参与七个候选 skill 载体的作者工作和本轮修订，只检查现行文本，不修改
skill、theory 或评估协议，也不取得接受权。检查对象为：

- 七个 living `SKILL.md`；
- `theory/gene-expression.md`、`theory/skill-formation.md`、
  `theory/expression.md` 与 `theory/concept-articulation.md`；
- [`protocol.md`](protocol.md)、[`round-1-cross-skill-review.md`](round-1-cross-skill-review.md)
  与 [`round-1-system-design-review.md`](round-1-system-design-review.md)。

本轮用 `yes / no / uncertain` 回答明确命名的关系。静态文本可以支持“边界在语义上可恢复”，
不能证明 selector 会正确发现载体、激活会改善行为或改善可归因于载体。当前没有行为 trial，
因此本文不提出 `matched-improvement`、`regression-supported`、系统收敛或人类接受主张。

## Round 1 四项缺陷复核

下表的判断回答“该缺陷在现行设计与行动契约中是否已修复”。

| Round 1 缺陷 | 判断 | 现行证据 |
|---|---|---|
| skill 方法、skill 载体与 skill 激活混称 | **yes** | 权威术语明确区分三者（`theory/gene-expression.md:19-24`）；`skill-formation` 的准入对象和同一性明确是载体及其所表达的方法（`theory/skill-formation.md:9-12,24-39`；`.agents/skills/skill-formation/SKILL.md:8-10`）；protocol 的实际变量已经是“加载候选 skill 载体并发生一次激活”，评价对象是载体所表达的方法（`protocol.md:3-6,21-24`）。`agent-expression` 也改为“把方法编码进 skill 载体”（`.agents/skills/agent-expression/SKILL.md:30-34`）。承重的准入、加载、实验与表型关系不再混同。 |
| P、living theory、research、protocol 的 standing 与普通激活自足性混在一起 | **yes** | 七个载体均把 living theory、research、protocol 分列为语义来源、生成证据和评估契约，并逐一明确：P 只记录生成血统，普通激活不以前置回读这些文件为条件，维护、诊断或再生成时才沿链接审计（`skill-formation:16-26`、`concept-articulation:28-37`、`form-selection:29-40`、`human-writing:18-26`、`agent-expression:18-26`、`dual-audience-expression:18-27`、`agent-delegation:18-28`）。`theory/skill-formation.md:54-56,117-118` 和 `protocol.md:66-69` 也把“生成关系必须内化、普通激活不得要求回读 P/theory”写成准入与重大缺陷标准。任务自身的事实来源仍须按任务读取，没有把“skill 自足”误写成“无需事实来源”。 |
| 存在／载体形式与载体内组织形式由同一个 owner 统包 | **yes** | `theory/expression.md:23-47` 已明确分成两层：`form-selection` 拥有存在／载体形式，`human-writing` 与 `agent-expression` 分别拥有既定载体内的人类／Agent 组织；`theory/expression.md:164-173` 再次固定专项 owner。`form-selection` 的主要判断和候选表只比较载体、权威、生命周期与外部契约，并在边界中拒绝代写内容（`.agents/skills/form-selection/SKILL.md:8-22,44-55,84-99`）；prose、列表、表格和 schema 的载体内组织留在两个写作 skill（`human-writing:68-80`；`agent-expression:78-88`）。外部 schema 可以限制两层，但不使它们合并。 |
| 概念形成、定义与正式指称被称为一般“概念表达” | **yes** | 理论和 skill 均已统一为“概念形成与指称”，生成关系是对象证据→概念关系→定义→正式 designation→行动检验（`theory/concept-articulation.md:1-35`；`.agents/skills/concept-articulation/SKILL.md:6-23`）。一般 expression 明确只在概念形成之后为接收者做保真变换（`theory/expression.md:158-169`），写作 owner 不得为了流畅改写概念边界（`theory/concept-articulation.md:107-115`）。 |

### 非重大残余

`yes` — 在本轮所评的行动契约中，四项缺陷都已修复。仓库中仍有少量非承重的旧式简称：
`theory/skill-formation.md:100-101` 在载体生命周期的“合并”处写“两个 skills”，
`theory/skill-formation.md:142` 在 matched comparison 中写“目标 skill 不同”；作为生成证据而非现行语义 owner 的
`theory/research/skill-formation.md:120,129` 也写“增加候选 skill”“已加载 skill”。这些句子所在上下文
可以恢复其实际所指，且现行 protocol 已精确规定实验变量，所以本轮把它们判为局部维护残余，**不**提升为
新的重大设计缺陷，也不据此要求 skill 重写或结构调整。

## 七个主要判断与 continued-existence 边界

| Skill | 一个主要判断 | 最近 owner 与拒绝边界 | 普通激活自足 | 独立载体的净收益／继续存在 |
|---|---|---|---|---|
| `skill-formation` | **yes** — 判断重复方法是否应编码为选择性加载载体，并在同一生命周期判断中决定处置（`SKILL.md:8-12,83-104`）。 | **yes** — 一次任务、项目指令、文档、reference、工具与 runtime 均有出口（`SKILL.md:40-66`）。 | **yes** — 方法正文提供准入、形成、review、验证与返回，不要求回读 P/theory（`SKILL.md:26,68-137`）。 | **uncertain** — 静态文本不能证明相对当前模型能力和直接任务表达仍有净收益。 |
| `concept-articulation` | **yes** — 从对象证据形成可区分概念和定义，再正式指称并做行动检验；这些环节共享一个区别判断（`SKILL.md:8-23`）。 | **yes** — 文风、载体、审美命名、skill 准入、Agent 任务契约与 runtime 均明确转交（`SKILL.md:41-57`）。 | **yes** — 对象、关系、包含／排除、定义、临时 handle、指称、检验与返回均已内化（`SKILL.md:60-165`）。 | **uncertain** — 未有 target-skill trial 证明独立选择性载体改善概念行为。 |
| `form-selection` | **yes** — 为已确立语义对象选择最小真实的存在／载体形式（`SKILL.md:8-22`）。 | **yes** — 概念、具体写作、skill 准入与 runtime 强制分别归最近 owner（`SKILL.md:44-55,106-108`）。 | **yes** — 使用关系、候选形式、最小性、落地检查、验证与返回足以独立判断（`SKILL.md:58-158`）。 | **uncertain** — 未证明该载体相对直接形式判断有净行为收益。 |
| `human-writing` | **yes** — 在既定媒介内按具体读者、目的与场合形成完整自然的人类表达（`SKILL.md:8-13`）。 | **yes** — 概念、载体、Agent 任务和双受众同步均明确转交（`SKILL.md:30-40`）。 | **yes** — 来源、读者、主张、整体推进、例证、未知、压缩、接收检验与交付都在正文（`SKILL.md:43-129`）。 | **uncertain** — 当前无 matched treatment 区分它与模型原有写作能力。 |
| `agent-expression` | **yes** — 把既定任务或方法表达成 Agent 能判断、行动、失败并返回的内容（`SKILL.md:8-13`）。 | **yes** — 概念、形式、人类写作、双受众、委派拓扑和 runtime 强制均有稳定出口（`SKILL.md:30-48`）。 | **yes** — 对象、来源、上下文、效果、验收、失败、返回与 token 压力下的删减标准已内化（`SKILL.md:51-139`）。 | **uncertain** — 没有只改变本载体的行为 trial。 |
| `dual-audience-expression` | **yes** — 维护一个权威语义核下的人类／Agent 不同视图及其同步和语义回归（`SKILL.md:8-14`）。 | **yes** — 单受众、概念、载体、具体写作、runtime 和委派分别转交（`SKILL.md:31-49`）。 | **yes** — 共享核、派生、变化顺序、冲突可见性、回归与交付关系均已内化（`SKILL.md:52-140`）。 | **uncertain** — 尚无真实漂移或 matched treatment 证明独立载体的增量价值。 |
| `agent-delegation` | **yes** — 判断是否委派、让拓扑服从真实依赖，并把有 standing 的贡献重连回 Main 整体（`SKILL.md:8-13`）。 | **yes** — 单任务表达归 `agent-expression`，概念、载体、双受众和 runtime 强制均有 owner；短小或紧耦合工作会拒绝委派（`SKILL.md:30-48,81,117-122`）。 | **yes** — 整体、贡献、拓扑、契约边界、独立 review、综合、比例、runtime 边界与返回均已内化（`SKILL.md:30-154`）。 | **uncertain** — 还没有 direct baseline 与 delegated treatment 的匹配比较。 |

## 相邻 owner、循环依赖与体系关系

| 检查关系 | 判断 | 依据 |
|---|---|---|
| `form-selection` 与 `skill-formation` 是否互相夺取准入 | **no** | 前者只把 skill 载体列为候选并明确交回准入（`form-selection:52,90,133`）；后者拥有特定的载体准入与生命周期。一般形式可先暴露候选，最终 skill 处置仍有一个 owner。 |
| `concept-articulation` 与一般 expression 是否循环定义对象 | **no** | 概念 owner 先由对象证据形成边界和指称；expression 可以暴露上游不稳并退回，但不能创造或改写概念（`theory/expression.md:166`）。反馈可回返，不构成权威循环。 |
| `dual-audience-expression` 与两个单受众写作 skill 是否循环 | **no** | 双受众 skill 拥有共享核、派生、同步和回归；两个单受众 skill 只拥有各自视图内部的表达（`dual-audience-expression:41-49,74`）。从单受众任务转交双受众 owner，和双受众 owner 调用单视图写作，是按对象层次分开的顺序关系。 |
| `agent-delegation` 与 `agent-expression` 是否循环 | **no** | 前者决定贡献是否分出、拓扑与证据重连；后者只把已经确定的贡献边界写成接收 Agent 可用内容（`agent-delegation:81`；`agent-expression:43`）。 |
| `skill-formation` 对其他 skills 的 review 是否形成自证 | **no** | 理论明确允许方法互相检查，但自我应用只能产生修改候选；独立 reviewer、行为证据和人类接受保持分离（`theory/skill-formation.md:110-125`）。 |
| 共享“来源、runtime、证据等级”段落是否已经形成应拆出的共同 owner | **uncertain** | 当前没有观察到矛盾、错误加载或上下文成本，不能因重复和篇幅推导新 reference、merge 或 split。 |

## 中文可用性、token 完整性与比例

| 关系 | 判断 | 依据 |
|---|---|---|
| 七个载体是否可用中文 review 和执行 | **yes** | 七个 `description` 和正文均以中文给出主要动作、对象、非用途与方法；英文 `name` 只作稳定机器标识。`runtime`、`projection`、`designation`、`standing` 等少量词在上下文中具有明确区分，不形成必须猜测的行动缺口。 |
| 静态文本是否保留了承重语义 | **yes** | 人类和 Agent 写作均要求先保留对象、来源、范围、效果、失败、返回与接受，再删除无效重复（`human-writing:90-113`；`agent-expression:91-118`）；concept、dual 与 delegation 对边界、未知和证据也有同样删除检验。未发现以 token economy 覆盖必要含义的指令。 |
| 是否把“正常完整表达”解释成无限展开 | **no** | 各 skill 都同时承认注意、冲突、截断和维护成本；例如 `human-writing:107-113`、`agent-expression:108-118`、`dual-audience-expression:119-128`、`agent-delegation:102-115`。 |
| 是否因最近发现的问题改变整体主次 | **no** | 文件名与目录仍只是载体确定后的普通检查（`form-selection:116-124`；`theory/expression.md:150-156`）；`skill-formation:104` 和 `agent-delegation:102-115` 要求按频率、后果、证据、修复及协调成本恢复比例。上面的旧式简称因此只被判为局部残余。 |
| 实际激活时的上下文成本是否合适 | **uncertain** | 静态文本拒绝无限展开，但没有 treatment transcript、token 记录或任务结果证明七份载体在真实激活中都保持了有效注意。不能由篇幅直接判定。 |

## 机械检查、重大缺陷与 disposition

- `ruby scripts/validate-skills.rb`：**yes**，成功验证 7 个载体；只支持 `format-valid`。
- `git diff --check`：**yes**，没有 whitespace error。
- 本轮是否观察到新的重大设计缺陷：**no**。现行候选没有来源失真、承重约束丢失、
  定义与名称错位、虚假权威、无法重建的委派、形式 owner 错误，或要求普通激活回读 P/theory。
- 七个候选是否已经证明应长期保留或被接受：**uncertain**。一个主要判断和静态边界成立，
  不等于相对 baseline 有净行为收益。
- 当前 exact candidates 的系统证据是否达到 `matched-improvement`：**no**。本轮没有行为 trial，
  不能把静态 review 提升为行为归因。
- 是否已经满足收敛条件：**no**。protocol 还要求相关回归、连续有新证据的轮次，以及继续修改
  没有可观察收益；本轮只完成修订后的独立设计复核。

本轮的最小 disposition 是：四项 Round 1 设计缺陷在承重位置已经修复，七个载体继续作为
**候选**进入行为验证；静态设计不支持新的 skill rewrite、split、merge、demote 或 delete，也不支持
retain／接受结论。少量旧式简称留在其精确位置，不因本轮 reviewer 的注意被提升为系统主线。
