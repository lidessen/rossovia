# Round 1 skill 系统设计独立 review

## Review 边界

本 review 检查当前 7 个 living skill 载体的设计关系，不修改 skill 或 theory，也不取得人类接受权。评审者不是这些候选的作者。检查对象为：

- `.agents/skills/*/SKILL.md` 的 7 个候选；
- `theory/skill-formation.md`、`theory/gene-expression.md` 与 `theory/harness.md`；
- [`protocol.md`](protocol.md)、[`round-1-skill-formation-review.md`](round-1-skill-formation-review.md) 与 [`round-1-meta-matched-review.md`](round-1-meta-matched-review.md)。

`skill-formation` 用于先判断每个载体是否有继续存在的设计理由，再检查主要判断、触发、最近 owner、形式、权威、返回、行为探针及体系关系。`agent-expression` 只用于检查激活后的 Agent 能否恢复来源、判断、行动、效果、未知、返回与验证；表达完整不能代替 skill 成立，也不构成接受证据。

本 review 使用 `yes / no / uncertain`。`yes` 只表示当前文本或已有证据支持命名关系；`uncertain` 保留需要行为观察或匹配对照才能回答的问题。

## 系统级判断

| 关系 | 判断 | 依据 |
|---|---|---|
| 7 个载体是否各有一个可辨认的主要判断 | **yes** | 依次拥有 skill 准入与生命周期、概念区别与指称、形式选择、面向人的写作、面向 Agent 的表达、双视图权威与同步、委派与重连。小节和步骤均服务各自主要判断，没有仅因篇幅长而出现第二个独立 owner。 |
| 正触发、负触发和最近 owner 是否在文本上可分 | **yes** | 每个 description 与正文都给出使用条件、非用途和转交关系；相邻边界不是只靠共享受众或关键词区分。 |
| 这些边界是否已经被行为证据支持 | **uncertain** | `skill-formation` 的 F1 已由独立 review 建立 `boundary-supported`；其余 6 个没有对应 treatment 与独立语义 grading。Round 0 的 F2–F8 只表明未加载目标 skill 的 baseline 已能给出良好答案，不能证明候选有效。 |
| skill 载体是否是每项方法的最小真实形式 | **uncertain** | 文本都给出了跨任务方法对象及相邻形式退出条件，形式在设计上合理；但尚无匹配对照证明选择性加载相对直接任务表达、已有模型能力或普通文档具有净收益。 |
| 来源、效果和接受权是否越界 | **yes** | 7 个候选都把 living theory 作为语义来源，把硬生命周期、权限、身份、并发、恢复与不可绕过效果交还 runtime/base，并把最终接受留给人类或明确受托者。 |
| 返回与诚实失败是否可恢复 | **yes** | 每个载体都要求返回实际决定或产物、来源/依据、验证级别、关键未知及 `no-proposal` 或转交；没有把写完、格式通过或 reviewer 推荐等同于最终接受。 |
| P→skill 后的方法是否足以运行时自足 | **yes** | 7 个正文都已把相关 P 与 living theory 生成的判断、边界、步骤、失败和返回关系写成完整方法；普通激活者不必为了补齐方法本身而回读 P 或 theory。P 与 theory 在这里负责生成、追溯、审计和必要的来源回修，不是普通执行依赖。 |
| “理论来源”措辞是否清楚排除了运行时回读义务 | **no** | 7 个载体都突出列出链接并称其为“语义来源”或“语义权威”，却没有明确说明普通激活应直接执行当前载体，只有审计血统、处理来源冲突或回修方法时才回读。正文实际上自足，但这段措辞仍可能诱导不必要的上下文加载。 |
| 行为探针是否已经命名 | **yes** | 每个载体都列出正例、拒绝或最近 owner 案例，并区分机械校验与语义行为主张。 |
| 行为探针是否已经完成并支持系统回归 | **no** | 当前没有覆盖 7 个 treatment 的匹配对照，也没有两个连续的回归轮次。只写出探针不能建立行为价值或收敛。 |
| 相邻 skills 是否存在未解决的重叠、矛盾或循环权威 | **yes（未见重大缺陷）** | 三组看似双向的关系都按阶段分开：`form-selection` 可把 skill 载体列为候选，最终准入归 `skill-formation`；`dual-audience-expression` 拥有共享核与同步，两个具体视图分别归 `human-writing` 与 `agent-expression`；`agent-delegation` 决定贡献和拓扑，既定贡献契约的文字归 `agent-expression`。迭代 review 会回到 theory、独立 reviewer 与人类接受，不形成 skill 自证。 |
| 是否把局部问题放大成全局结构 | **yes（比例成立）** | `form-selection` 把文件名和目录放在载体选定后的普通检查，`agent-delegation` 明确要求局部发现回到整体按频率、后果、证据与成本重排，其他 skills 也都有直接完成、转交或 `no-proposal` 出口。 |
| 中文 description 是否在语义上可发现 | **yes** | 7 个 description 都先说明所拥有的动作与对象，再给出典型用途和关键非用途；英文 `name` 仅作稳定机器标识。 |
| description 的实际自动发现效果是否成立 | **uncertain** | 尚无只改变 metadata discovery 的选择实验。当前判断只涉及语义可辨认性，不声称 Agent 一定会正确激活。 |

## 各 skill 设计 review

### `skill-formation`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F1 支持一个正例与三个最近 owner 的边界，但两次已有独立 review 都指出 trial 未满足 matched 条件，且 baseline 已作出相同 owner 判断；净行为收益未建立。 |
| 一个主要判断 | **yes** | 围绕“重复判断或行动差距是否应编码为选择性加载的 skill 载体，以及如何在生命周期中处置”展开。创建与 review 是同一存在性判断的不同时间。 |
| 正负触发与最近 owner | **yes** | 正向覆盖新候选及已有载体 review；一次任务、项目局部规则、持久知识、条件 reference、确定性工具与 runtime 硬属性均有明确出口。泛化形式比较与 `form-selection` 相邻，但 skill 最终准入仍由本载体拥有。 |
| 最小形式 | **uncertain** | 方法表达完整且未复制 canonical theory，但尚无 matched improvement 证明新载体的发现与上下文成本获得净回报。 |
| 权威、返回与探针 | **yes** | 不授权效果或接受；返回准入/处置、依据、未知与真实证据等级；探针覆盖发现、已加载行动、正反例和回归。 |
| Agent 表达可恢复性 | **yes** | 可恢复来源、差距、准入标准、相邻 owner、允许处置、诚实失败、返回和验收边界。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 方法正文已经自足；只需明确 P 与 theory 链接服务生成/追溯/审计，普通激活不以回读它们为前置。continued existence 与接受仍是 `no-proposal`，等待更有区分力的 matched probe。 |

### `concept-articulation`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F2 提供了适合该方法的合成对象，但未有 target-skill treatment；baseline 已能区分四个概念。真实重复差距和增量收益仍未建立。 |
| 一个主要判断 | **yes** | 从对象证据与用途形成最近邻可区分的概念和定义，再选择正式指称，并以判断或行动检验区别。定义、命名和检验处于同一生成依赖，不是三个独立 owner。 |
| 正负触发与最近 owner | **yes** | 一词多义、定义失真和邻近概念误判为正触发；文风、载体、审美命名、Agent 任务表达、skill 准入与 runtime 保证均明确转交。 |
| 最小形式 | **uncertain** | 文本避免建设全局 ontology，并允许一次性澄清直接完成；但选择性载体是否胜过模型现有能力尚未有对照。 |
| 权威、返回与探针 | **yes** | 来源不足时保留临时 handle 或 `no-proposal`；返回对象、内涵/外延、包含、排除、反例、定义、指称、未知和接受边界；探针能检查名称是否错误支配概念。 |
| Agent 表达可恢复性 | **yes** | 激活者可以恢复对象来源、用途、概念关系、定义顺序、正式指称条件、失败出口与交付。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 方法本身无需扩写；明确 P 与 theory 是生成/审计血统而非普通运行时依赖。除这项直接来源边界外，没有证据支持 split、merge、demote、delete 或接受。 |

### `form-selection`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F3 是正向 fixture，但只运行过 baseline。候选形式比较的重复差距及载体净收益未被 treatment 观察。 |
| 一个主要判断 | **yes** | 为已确立的语义对象选择保持受众、用途、行动、媒介、权威和生命周期的最小真实形式。普通名称与位置检查只是决定后的收尾。 |
| 正负触发与最近 owner | **yes** | 正向是多个真实载体/所有权之间的取舍；概念未定、具体写作、skill 准入和 runtime 硬保证分别归 `concept-articulation`、写作 owners、`skill-formation` 与 runtime。 |
| 最小形式 | **uncertain** | 候选表包含“不创建新载体”并允许组合形式，不会默认增设结构；但本 skill 载体自身是否值得选择性加载仍缺行为净收益。 |
| 权威、返回与探针 | **yes** | 不把载体变成语义或效果权威；返回被比较候选、决定、生命周期、派生/退役和探针；能诚实返回 `no-proposal`。 |
| Agent 表达可恢复性 | **yes** | 可恢复语义对象、canonical source、consumer、外部契约、判断顺序、普通落点检查及转交 owner。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 明确普通形式判断直接使用已内化的方法，不需先回读 P/theory。与 `skill-formation` 的相邻关系已按“候选形式→最终准入”分开，不需因共享形式比较而合并；其他处置为 `no-proposal`。 |

### `human-writing`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F4 baseline 已能写出有论证和未知的短文，尚无只加载本 skill 的 treatment。用户关于 token 压缩扭曲表达的观察构成研究方向，但当前评估记录未建立跨任务改善。 |
| 一个主要判断 | **yes** | 在既定语义和媒介中，按具体读者、目的与场合形成准确、自然且完整的理解推进。 |
| 正负触发与最近 owner | **yes** | 人类文章、说明、理由、教程与界面文字为正触发；概念、形式、Agent 任务、双受众同步、事实调查和 runtime 均有 owner。 |
| 最小形式 | **uncertain** | 方法明确允许低风险句子直接完成，不强制文章模板；但是否需要独立选择性 skill 而非模型固有写作能力仍需 matched probe。 |
| 权威、返回与探针 | **yes** | 不补造来源连接或接受权；默认返回可直接给读者使用的成品，并说明材料限制与验证级别；探针覆盖长短媒介、未定义对象、Agent 任务转交和 brevity 压力。 |
| Agent 表达可恢复性 | **yes** | 激活者可以恢复来源状态、读者起点、目的、场合、媒介、主张强度、自然表达与删减标准。面向人的接收效果被如实当作预期效果，而非已证明事实。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 正文已内化写作方法，只需排除把 P/theory 链接当普通执行前置的误读。未证明相对 baseline 的增量价值；正文长度本身不是拆分或降级依据。 |

### `agent-expression`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F5 baseline 已在 brevity 压力下保住来源、非目标、效果、未知、返回与停止条件；尚无 target treatment，无法判断候选是否改善易错任务。 |
| 一个主要判断 | **yes** | 把已经形成、来源有界的任务或方法表达成 Agent 能判断、行动、失败和返回的内容。 |
| 正负触发与最近 owner | **yes** | Agent 任务、方法和 skill 的行动表达为正触发；概念、形式、面向人的写作、双受众同步、委派拓扑和 runtime 强制均明确排除。贡献边界已定后本 skill 写任务；是否分出贡献仍归 `agent-delegation`。 |
| 最小形式 | **uncertain** | 方法允许上下文充分的小任务保持简短，不强制七字段模板；独立载体的净收益仍没有对照。 |
| 权威、返回与探针 | **yes** | 区分 prompt 指令与真实权限、产物/验证/接受，要求诚实失败和可重建返回；探针覆盖 brevity、缺授权、单受众、双受众和 runtime owner。 |
| Agent 表达可恢复性 | **yes** | 作为对自身主要对象的表达，它完整保留对象与目标、来源状态、上下文、允许效果、判断与验收、未知与失败及返回。没有用固定 schema 代替关系。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 行动方法无承重遗漏；来源段需要说明普通激活无需回读 P/theory，审计、冲突或回修时才沿血统返回。baseline ceiling 与缺少 treatment 仍阻止接受或 retain 主张。 |

### `dual-audience-expression`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F6 baseline 已正确给出唯一权威、两种视图与回归关系；没有 treatment 或真实漂移任务证明选择性方法带来增益。 |
| 一个主要判断 | **yes** | 维护一个语义权威下的人类视图、Agent 视图、派生/同步和语义回归。双视图的具体写作不是本 skill 的第二主要判断。 |
| 正负触发与最近 owner | **yes** | 真实双受众且存在独立演化/漂移为正触发；单一受众、一次转述、来源未稳、概念/形式未定和 runtime 强制均排除。人类与 Agent 视图分别交给对应写作 owner。 |
| 最小形式 | **uncertain** | 明确“一个语义源”不是单文件要求，也不预建两套视图；但是否存在足够重复的同步判断差距尚未由行为观察建立。 |
| 权威、返回与探针 | **yes** | 不允许派生视图成为第二 canon，冲突不按新旧/详略裁决；返回视图、来源、同步、回归、冲突和接受者；探针覆盖共享变化、受众独有变化和单受众拒绝。 |
| Agent 表达可恢复性 | **yes** | 可恢复共享核、权威、两种接收关系、派生方式、变化顺序、冲突、失败可见性、回归与交付。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 共享核与同步方法已内化，只需澄清血统链接不构成普通执行依赖。与两个单受众 skill 的 owner 关系明确，不支持 merge；缺少行为收益也不支持接受。 |

### `agent-delegation`

| 检查项 | 判断 | 依据 |
|---|---|---|
| Continued existence / admission | **uncertain** | F7 baseline 已正确选择并行只读研究、顺序综合和单写者关系。当前这次独立 review 展示了一个有界委派实例，但父任务已经明确给出贡献契约，不能把结果归因于本 skill。 |
| 一个主要判断 | **yes** | 判断是否委派、选择服从真实依赖的拓扑，并把带 standing 的局部贡献重连到 Main 保留的整体。准入、拓扑、契约边界和综合共同服务一个委派关系。 |
| 正负触发与最近 owner | **yes** | 可分来源/效果/独立评审贡献为正触发；短小、紧耦合、接口未稳、几乎携带全部整体和协调成本过高均拒绝。具体任务措辞归 `agent-expression`，硬并发/身份/恢复归 runtime。 |
| 最小形式 | **uncertain** | 明确允许 direct、sequential、parallel、nested，并要求额外 Agent 挣得净收益；但独立载体相对现有系统委派指导的增量价值尚未隔离。 |
| 权威、返回与探针 | **yes** | Main 保留整体和综合，reviewer 不取得写入或接受权；返回 source standing、覆盖、证据、未知和采用判断；探针覆盖拒绝并行、同写面、嵌套、独立 review、共同遗漏和比例。 |
| Agent 表达可恢复性 | **yes** | 可恢复整体、局部变换、来源、依赖、non-goals、允许效果、失败、返回和 Main 的综合/接受关系。 |
| 最小处置 | **`rewrite`（仅来源说明）** | 委派方法本身可独立执行；来源段应明确 P/theory 只供生成、追溯与审计。与 `agent-expression` 是“先决定贡献关系、再写具体契约”的顺序依赖，不是循环 owner；当前无证据要求拆分或合并。 |

## 相邻关系与回归风险

当前没有观察到重大 overlap、矛盾或循环依赖，但下一轮应优先用行为而不是继续润色来检验三条最容易交叉触发的边界：

1. `form-selection` 只判断一般形式，`skill-formation` 才准入或处置 skill 载体；测试一个诱人的新 skill 请求，看前者是否直接越权准入，后者是否把所有形式问题都收归自己。
2. `dual-audience-expression` 只拥有共享语义核、派生与同步；测试只有一个真实受众和仅有偶发第二读者的案例，看它是否退回 `human-writing` 或 `agent-expression`。
3. `agent-delegation` 决定贡献与拓扑，`agent-expression` 表达已经确定的贡献；测试“请写一个 Agent 任务”和“这项工作是否应委派”两类近邻请求，看两者是否发生往返路由。

共同段落（来源、runtime 边界、token 完整性、证据等级）存在重复，但目前没有上下文成本或冲突行为证明它们应抽到 reference。仅凭篇幅、重复观感或 token 数做降级会违反本项目自己的承重语义检验。若后续观察到激活噪声、相互矛盾或维护漂移，再按实际影响改写最小拥有层。

有一个直接得到现行人类要求支持、且不依赖行为归因的有界表达修订：每个 skill 的来源段应说明，相关 P 已由作者内化为当前完整方法；P 与 living theory 链接只用于生成、追溯、审计、处理来源冲突或回修方法，普通激活不以回读这些文件为前置。这个修订不要求删掉血统、不改变 theory 权威，也不授权把 P 复制进 skill；它只消除“来源权威等于运行时依赖”的歧义。

## 重大缺陷、证据等级与 disposition

- **重大缺陷：未观察到。** 当前文本没有出现来源扭曲、承重约束丢失、定义与名称错位、虚假权威、不可重建委派、错误形式 owner，或因 token 经济截断必要意义。“理论来源”段没有明确排除普通运行时回读，是一个系统性但有界的表达歧义；方法正文已经自足，因此当前不把它升级为方法缺失或结构缺陷。
- **系统载体最强证据：`format-valid`。** `ruby scripts/validate-skills.rb` 成功验证 7 个载体；这只证明 frontmatter、目录名、占位文本、重名和本地链接等机械关系。
- **单项最强语义证据：`skill-formation` 为 `boundary-supported`。** 两个已有独立 review 均确认 F1 的正例与最近 owner 边界，同时均拒绝 `matched-improvement`。
- **其余 6 项：没有高于 `format-valid` 的 target-skill 证据。** Round 0 是 baseline 的 `behavior-observed`，不能转移给尚未运行的候选。
- **本轮总处置：7 项均做一次有界 `rewrite`，只澄清 P/theory 是生成与审计血统而非普通运行时依赖。** 这项修改由现行来源边界直接支持，不依赖改善归因；除它以外，continued existence、接受、split、merge、demote、delete 或稳定 retain 均为 `no-proposal`。随后最小证据行动仍是按相同 manifest 完成有区分力的 matched boundary probes，并由新 reviewer 判断，不能用这次措辞澄清替代行为证据。

作者、runner、reviewer 和人类接受者仍然分离。本 review 只能把当前候选交回 Main 与人类拥有者，不能宣布它们已被接受或系统已经收敛。
