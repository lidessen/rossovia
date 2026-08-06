# 联想激活图：关系可读性与两阶段 recall 实验报告

状态：`probe`  
执行日期：第一轮 2026-08-05，第二轮 2026-08-06（America/Los_Angeles）

执行画像：OpenCode 1.18.13，`opencode-go/qwen3.7-plus`，每次新 session，默认模型
variant，`--pure --format json`，只附加一种表示，不请求文件系统或工具。

## 修正后的结论

第一版结论把实验对象理解得过重：它要求完整关系图像像事实数据库一样，不漏掉任何边。
实际对象是 Shilu 式的两阶段记忆唤起：**图只负责激活联想并把 Agent 路由到原始记忆；
原始来源负责提供事实和引用。** 在这个对象里，较高的命中率比拓扑完备性重要。

本轮图像条件中，直接边、反向负例、不存在的边、关系标签
和四跳关系链全部答对。问题出现在高密度图的完备枚举：相同的 15 个节点下，图像准确率
随边数从 13、22 到 34 条，由 100% 降到 87.5% 和 75%；中密度开始持续漏算入边，
高密度又持续漏掉一条出边。这会否定“图片独自承载全部事实”，但不会否定“图片提供足够
线索，使相关来源进入 top-k 候选”。

文本条件在同题、同模型、同顺序的 9 次运行中为 72/72。但它是“完整文本附件”控制组，
还不是带搜索工具的真实 retrieval 画像。本轮也没有让图中的节点携带真实 source anchor，
更没有执行“选中来源 → 打开原文 → 形成引用”。因此当前证据既不能证明也不能否定联想图
在 recall 场景中的实际价值；它只说明模型获得了可继续利用的局部关系信号，同时会漏掉
高密度区域的部分 incident edge。

## 第二轮：两阶段 recall development probe

第二轮已经在冻结 revision `c91e3e93e55483a8c53ff40b53cedbef6cdab6cf` 上执行。语料来自
Shilu commit `1cac9bbf3e2e10bfdb3178838fefc406236b652e` 的 12 个 curated source
passage；执行画像仍为 OpenCode 1.18.13 与 `opencode-go/qwen3.7-plus`。每个 stage 使用
全新 session，cwd 中只有该 stage 的附件和 `permission: deny` 配置；12 个 route 均解析
成功，没有 tool event。每题每个条件只执行一次，所以以下仍是 development signal。

两个条件都先路由、再以全新 session 打开最多 5 个来源：

- image：固定 policy 先从语料独立派生概念—来源关系，再按 query 激活 3 个概念并渲染 PNG；
- search：确定性 BM25 返回只含 source ID 与中性标题的 top-5 locator，Agent 再排序选择。

二者不是裸模态对照。image 多了概念扩展、子图选择、布局和视觉读取；search 包含 BM25
tokenization、ranking 和文本结果格式。只能比较整个执行画像。

### 路由结果

| 条件 | recall@1 | recall@3 | recall@5 | all-required@5 | MRR | 平均打开来源 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| image graph | 0.333 | 0.833 | 0.917 | 5/6 | 0.783 | 5.00 |
| BM25 search | 0.167 | 0.750 | 0.833 | 4/6 | 0.639 | 4.83 |

两边的 hit@5 都是 1，但这只表示“至少一个相关来源”出现；多来源问题仍可能不完整。按
recall@5 配对看，image 在 Q2、Q4 更高，search 在 Q3 更高，Q1、Q5、Q6 持平。具体漏召为：

- image Q3 漏掉 `SHILU-S06`，recall@5 为 0.5；
- search Q2 漏掉 `SHILU-S09`，recall@5 为 0.5；
- search Q4 漏掉 `SHILU-S12`，recall@5 为 0.5。

这是一条正向但很弱的候选信号：联想图在本 fixture 中没有被 search 完全支配，而且在两个
问题上补到了 search 漏掉的来源；但只有 6 题、1 次运行，不能称为稳定优势。

### 回源答案与引用

search 的 12/12 proposition key 正确；image 的 10/12 正确，唯一损失来自 Q2 answer JSON
格式错误、整个两-claim answer 无法解析。也就是说，11 个可解析 answer 的 22 个 proposition
key 全部正确。

预注册 summary 中两边 `groundedSuccessRate` 都是 0，但这不能解释为 12 次均未从来源得到
正确答案。这个指标同时要求 answer 全对、citation precision=1、coverage=1，而首版引用
协议暴露了两个 development defect：

1. source packet 展示 `path#anchor (blob ...)`，prompt 却要求“exact Location anchor”；模型
   分别返回了裸 anchor、`path#anchor`、带 blob 的完整 Location 和组合 anchor 的子项，scorer
   只接受一个裸字符串；
2. claim 的 support allowlist 被当成穷尽集合。多个来源实际支持同一 claim，例如 Q5 的
   `SHILU-S01` 也明确说明 core validates/commits，但因为不在该 claim 的窄 allowlist 中，
   合理的补充引用反而降低 precision。

原始预注册分数保持不改。作为明确标注的 post-hoc source-only 诊断，忽略 anchor 格式但仍
要求来源已打开且属于预注册的 claim support allowlist 后，image 的 micro citation
precision/coverage 为 0.600/0.750，search 为 0.579/0.833；两边各有 1/6 trial 达到严格全
claim grounding。由于 allowlist 本身并非穷尽的语义支持判断，这个诊断仍偏保守，不能替代
冻结 scorer，只用于定位失败层。

仍有两个较明确的真实来源不足：search Q2 没有实现来源 `SHILU-S09`，无法用实现证据支持
human exemption；search Q4 没有 `SHILU-S12`，所开来源不能证明双向 supersession fields。
image Q3 虽漏掉 gold `SHILU-S06`，但打开的 `SHILU-S02` 与 `SHILU-S07` 仍能共同支持
provenance boundary 与 copy primitive；这也说明相关来源 gold 与 claim support group 需要
分开表达。

### 时延、成本与读取预算

| 条件 | route 时延 | route 成本 | 全链路时延 | 全链路成本 | 平均 source bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| image graph | 168.3 s | $0.08488 | 307.1 s | $0.17059 | 5,499 |
| BM25 search | 103.6 s | $0.07640 | 211.1 s | $0.15963 | 6,206 |

整轮实际观测成本为 `$0.3302213`。image 输入 PNG 为 144–165 KB，search locator 文件只有
438–483 bytes；image route 在本轮更慢且略贵。反过来，image 选出的 source packet 平均更小，
但这是来源组合不同造成的，不能归因于图像压缩。两边都接近总是打开 5 个来源，当前图没有
节省 source count。

### 第二轮结论与下一修正

本轮支持的最强表述是：**在这组冻结的合成 fixture 和单次执行中，query-conditioned graph
让全部必要来源进入 top-5 的题数为 5/6，search 为 4/6，并观察到更高 MRR；可解析 answer
均选对结构化 proposition。** 它不支持稳定的 graph-over-search 优势，也没有验证完成版引用
grounding、模型级视觉能力或一般性的成本优势。

下一版不应在同一输出上放宽 scorer，而应先冻结新的引用合同：

1. 每个可引用段落提供独立、不带 path 或展示文本的 opaque `anchorId`；
2. evaluator 把“检索相关来源集合”“每个 claim 的必要 evidence group”和“允许的支持来源”
   分开，补充但真实的引用不算错；
3. 要求每个 claim 只引用最小充分证据，同时保留 precision 与 coverage；
4. 修正后用新 case，或把旧 case 复跑明确标成 development treatment，至少重复两次再讨论
   稳定性。

第二轮没有证伪联想图候选，因为 image 在两个配对 case 上 recall@5 更高，而且平均读取 bytes
没有更差；但它也远未达到可采用结论。

## 系统对象

联想激活图不是第二份知识库，而是可由来源重建的有损索引：

```text
原始记忆／代码／文档
        ↓ 派生
概念 + 关系 + source ID／path／anchor
        ↓ 当前 recall query 选择／激活
问题相关的联想激活图
        ↓ Agent 选择候选来源
读取原文 → 核验证据 → 形成引用
```

各层承担不同验收责任：

| 层 | 责任 | 主要失败 |
| --- | --- | --- |
| 原始来源 | 保存可引用事实 | 来源不存在或无法定位 |
| 联想图 | 让相关来源进入有限候选集 | 关键来源未被激活 |
| Agent recall | 打开来源并核验证据 | 选错来源、未回源或错误引用 |

因此图的评价应偏向 recall 而不是 precision：允许少量无关候选，前提是没有把阅读预算耗尽；
图上的边和摘要只能触发查找，不能直接成为最终回答的证据。

## 实验设计

三个档位固定 15 个节点、固定布局与中文标签，仅增加有向带类型边：

| 档位 | 边数 | 每轮问题 |
| --- | ---: | --- |
| sparse | 13 | 直接边、方向负例、不存在的边、关系名、四跳链、全部出边、入度、干扰边 |
| medium | 22 | 同上 |
| dense | 34 | 同上 |

每个档位重复三次，顺序固定为
`sparse, medium, dense, dense, medium, sparse, medium, sparse, dense`。问题不含答案；
答案由确定性 evaluator 评分。文本与 PNG 来自同一个图事实源，实际输入连同 SHA-256
保存在各自 evidence 目录中。

## 结果

| 条件 | sparse | medium | dense | 总准确率 | 平均时延 | 观测成本合计 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 完整 PNG 图像 | 24/24 | 21/24 | 18/24 | 63/72（87.5%） | 18.42 s | $0.1215691 |
| 完整文本关系 | 24/24 | 24/24 | 24/24 | 72/72（100%） | 19.94 s | $0.11027406 |

图像的 9 个错误全部集中在 incident-edge 完备性：

- medium：三轮都把 N02 的入度 `5` 少算为 `3`、`4`、`3`；
- dense：三轮都漏掉 N14 到 N10 的出边；N02 入度 `7` 被答为 `4`、`5`、`5`；
- 其余六类问题，包括四段有向关系链，54 个题目-轮次组合全部通过。

按任务族重算后，图像的 edge 为 45/45、multihop 为 9/9、incident 为 9/18；文本分别为
45/45、9/9、18/18。72 个评分位是三张图上重复提问的结果，不是 72 个独立样本。

因此更准确的能力描述是：这个执行画像能可靠读取清晰的局部关系，也能沿指定关系做多跳
追踪；但随着连线拥挤，无法可靠证明“已经枚举完所有相邻边”。

## 效率与成本解释

| 条件 | 输入文件大小（sparse → dense） | 运行时报告 token | cache write/read |
| --- | --- | ---: | ---: |
| PNG | 63,851 → 123,439 bytes | 229,179 | 222,775 / 0 |
| 文本 | 641 → 1,092 bytes | 224,070 | 192,981 / 23,009 |

不能把这组 token 直接解释成图事实本身的编码成本：每轮仅报告 6 个普通 input token，绝大
部分都记在 OpenCode/模型路线的 cache 字段中，明显包含执行器画像和系统上下文。文本最后
一轮出现 23,009 cache-read token，使该轮成本降到 $0.00340436；图像没有对应 cache hit。
所以表中的美元数是这 18 次实际调用的路线观测，不是严格隔离后的“每种表示边际价格”。
时延也受输出生成影响；本轮文本更慢，不能据此推断一般性的视觉速度优势。

构建成本上，文本是约 1 KB 的确定性序列化；PNG 还需要布局、字体、分辨率和渲染器。
本仓库的 `bun run render` 已验证能重建与实际输入 SHA-256 完全一致的三张 PNG，但换布局
或渲染器可能改变模型表现，不能把图片字节数或一次渲染结果外推为普遍成本。

## 与已有研究的关系

[GraphTMI（NAACL Findings 2024）](https://aclanthology.org/2024.findings-naacl.34/)
说明图像在 token 限制与图结构保留之间可能有优势，但研究任务和模型条件与本实验不同；
它不能直接回答来源召回与最终引用是否成功。
[GITA（NeurIPS 2024）](https://proceedings.neurips.cc/paper_files/paper/2024/hash/00295cede6e1600d344b5cd6d9fd4640-Abstract-Conference.html)
显示图文结合与布局增强能够改善图推理，反过来也说明布局是能力画像的一部分，而不是可忽略
的展示细节。
[MuSe（ACL 2026）](https://aclanthology.org/2026.acl-long.476/)
直接指出把较大的图一次渲染为整图会产生重叠、遮挡和干扰，并改用任务相关子图的渐进式
可视化。这与本轮“边密度提高后完备枚举先失效”的观察方向一致。

[DeepSeek-OCR（2025）](https://arxiv.org/abs/2510.18234)
研究的则是另一件事：把长文本排版成二维图片，用专门训练的 DeepEncoder 把它压缩成较少
的视觉 token，再解码回文本。论文报告在文本 token 不超过视觉 token 约 10 倍时，OCR
解码精度约 97%，到 20 倍压缩时约为 60%。这证明图片可以成为光学上下文压缩介质，但其
指标是专用模型的文本恢复精度，不是通用 Agent 的关系推理正确率；不能拿它反证本轮复杂
连线漏检。

这些论文和本地实验共同支持一种分层，而不是二选一：原始文本、代码和结构化记录保存事实；
联想图负责唤起和路由；Agent 最终回到来源形成引用。图不需要成为唯一事实源，才可能成为
有效的 recall 索引。

DeepSeek-OCR 还提示出一个此前缺失的第三实验臂：把同一份线性关系文本渲染成紧凑的“文档
图片”，而不是把关系画成拓扑连线图。它能把“视觉 token 压缩”与“空间连线识别”拆开测试。

## 第一轮证据边界与当时的下一轮要求

本轮只覆盖一个模型路线、一组人工图、一个固定布局和每档三次重复，仍是 development case，
不能升级成跨模型事实。图像在本轮开始前还经过了箭头端点和标签可读性修正，因此下一轮必须
使用未参与调优的新图。两个 condition 还按块顺序执行，并非逐题交错；路线级 cache 因而
形成了可见混杂。`qwen3.7-plus` 也是提供方别名而非不可变模型快照，未来复跑必须重新记录
实际日期与路线状态。本轮在创建 Git checkpoint 之前执行；当前 runner 已统一 image/text
记录字段，而原始 image trial 仍保留执行时的 `image` 字段且没有 `condition`。因此原始事件
和输入是可审计的，但不存在一个可指向的“执行时源码 commit”；这也是下一轮必须先冻结
commit 再调用模型的流程修正。

第一轮结束时预注册的后续要求如下。第二轮完成了 1–5；6–7 仍未完成：

1. 冻结一组原始记忆，为每份来源分配稳定的 source ID、path 和段落 anchor；
2. 构造不直接透露来源 ID 的真实 recall 问题，并冻结每题的相关来源集合；
3. 在调用模型前冻结 scorer 和阅读预算：source hit 要求候选中出现预先标注的相关来源；
   引用正确要求 source ID／anchor 可定位且原文支持对应主张；联想图本身不能充当证据；
4. 让 Agent 只看联想图先返回 top-k source ID，再允许读取被选来源并回答、引用；
5. 与 `search → top-k 文本关系` 做配对，记录 source recall@1/@3/@5、MRR、最终引用
   正确率、打开来源数、token、时延和成本；
6. 把关系文本渲染成文档图的 optical-compression 条件作为独立第三臂，不与拓扑联想图
   混为一种机制；
7. 用未参与调图的 held-out 记忆图和至少第二个多模态模型验证结果。

是否“可用”仍应由端到端 source hit 和最终引用相对文本基线的表现决定，而不是要求图像边
恢复达到 100%。第二轮已得到 source-hit signal，但引用合同出现 development defect，且尚无
重复与 held-out 验证，因此结论继续保持 `probe`；第一轮也不再被解释为对联想图方案的否决。

## 可复核证据

- 图像执行画像与汇总：[`evidence/2026-08-05-qwen37-image-gate/summary.json`](./evidence/2026-08-05-qwen37-image-gate/summary.json)
- 文本执行画像与汇总：[`evidence/2026-08-05-qwen37-text-gate/summary.json`](./evidence/2026-08-05-qwen37-text-gate/summary.json)
- 每次调用：相应 evidence 目录下的 `trial-*.json`，包含原始 JSONL events、答案、评分、
  wall-clock、usage、输入 hash 与字节数；
- 实际输入：相应 evidence 目录下的 `inputs/`；
- 机械汇总：`bun run summarize evidence/2026-08-05-qwen37-image-gate evidence/2026-08-05-qwen37-text-gate`。
- 第二轮执行画像与冻结 identity：[`evidence/2026-08-06-qwen37-associative-recall-v1/environment.json`](./evidence/2026-08-06-qwen37-associative-recall-v1/environment.json)；
- 第二轮预注册原始汇总：[`evidence/2026-08-06-qwen37-associative-recall-v1/summary.json`](./evidence/2026-08-06-qwen37-associative-recall-v1/summary.json)；
- 第二轮明确标注的 post-hoc 诊断：[`evidence/2026-08-06-qwen37-associative-recall-v1/posthoc-analysis.json`](./evidence/2026-08-06-qwen37-associative-recall-v1/posthoc-analysis.json)；
- 第二轮每个 `trial-*.json` 保留 route、selected-source packet、answer、raw events、机械评分、
  时延与 usage；`inputs/` 保留实际 PNG/search locator 和每次只读的 selected sources。
