# Round 2 `dual-audience-expression` 隔离对照复核

## 复核身份与范围

- 独立裁定者：新的 `codex-cli 0.149.1` session，`gpt-5.6-luna`，reasoning effort `none`。
- 裁定者只收到 R2-DA 的任务/来源关系、预注册判断、成对输出与运行披露；没有读取候选 skill、P、theory、research、protocol 或仓库文件。
- baseline 与 treatment 都由新的 Luna session 在同一隔离临时目录、read-only、`--ignore-user-config --ignore-rules` 下产生；treatment 唯一显式多读候选 `SKILL.md`。
- 两次运行均出现未使用的 Cloudflare MCP `AuthRequired`；hidden harness identity 仍未完全取得。因此本报告不能建立 `matched-improvement`。

## 逐项判断

| 判断关系 | baseline | treatment | 复核 |
|---|---|---|---|
| `theory/approval.md` 是唯一权威 | yes | yes | treatment 更明确称其为共享语义核并否认第二权威，但 baseline 已保留核心关系。 |
| 人类与 Agent 两种受众视图 | yes | yes | baseline 已按用途区分；treatment 进一步明确派生视图 standing。 |
| 先改 source、再同步视图 | yes | yes | 两者均为 source-first。treatment 的“先修改并接受 source”可能混淆文档变更接受与任务指定负责人对发布的接受。 |
| 旧投影在同步完成前失效 | uncertain | yes | baseline 只搜索旧表述，没有明确旧投影的可用性；treatment 明确暂停以旧 Agent 视图发布。 |
| semantic regression | uncertain | yes | baseline 只覆盖接受/未接受两端；treatment 还覆盖负责人替换、reviewer 越权、视图回源与人类解释。 |
| 形式与成本相称 | yes | uncertain | treatment 没有引入生成器或新文件，但“同步状态/暂停”若被误做成正式状态系统，会增加未经验证的维护成本。 |

实际行为差异集中在两个承重关系：treatment 明确了 stale projection 的处置，并把回归从两端检查扩为负责人、reviewer、发布与回源的语义矩阵。它也更长；篇幅本身不计改善。baseline 已正确完成唯一权威、两种用途、source-first 与发布接受边界，存在明显 ceiling。

## 载体自足与 grader defect

treatment 披露只读取候选 `SKILL.md`，未回读 P/theory/research/protocol，并据此完成本题要求的维护安排；这支持“普通激活可执行方法”的一次行为观察，但不能证明所有安装形态或未来环境都自足。

独立裁定者把“未展示真实文件修改和测试结果”判成载体不自足。R2-DA 任务只要求安排维护关系，不授权修改真实文件，因此这项判定混淆了**方法是否可执行**与**方案是否已经实施**。Main 将它记录为 grader/rubric defect，不据此改写 skill；这不影响裁定者对成对输出语义差异的其他观察。

## 处置

- 最强证据等级：`behavior-observed`。
- 不能提出：`matched-improvement`、`regression-supported` 或稳定净收益。
- 对当前 skill 载体：`retain / no-proposal`。treatment 展示了有意义的边界增量，但一次未完全冻结的运行不足以支持改写；输出中的“接受 source”措辞是本次答案的局部歧义，不等于载体中存在同一缺陷。
- 后续确认需要：完整冻结 harness/config；新的 boundary 与 source-only holdout；把“安排方案”与“实施文件”明确分开评分；重复观察 stale projection 与语义回归是否稳定改变行动，并记录额外维护成本。
