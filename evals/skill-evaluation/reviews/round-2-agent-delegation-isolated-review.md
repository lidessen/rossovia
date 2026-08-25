# Round 2 `agent-delegation` 隔离对照复核

## 复核身份与证据上限

- 独立裁定者：新的 `codex-cli 0.149.1` session，`gpt-5.6-luna`，reasoning effort `none`。
- 裁定者只收到 R2-AD 的任务/来源、预注册判断、成对输出与运行披露；未读取候选 skill 或仓库文件。
- baseline 与 treatment 都由新的 Luna session 在同一隔离临时目录、read-only、`--ignore-user-config --ignore-rules` 下运行；treatment 唯一显式多读候选 `SKILL.md`。
- 两次都出现未使用的 Cloudflare MCP `AuthRequired`，hidden harness identity 未完全取得。最强证据等级因此为 `behavior-observed`，不能建立 `matched-improvement`。

## 逐项判断

| 关系 | baseline | treatment | 实际差异 |
|---|---|---|---|
| 三组独立只读调查并行 | yes | yes | 两者都成立；treatment 更明确返回 source standing、覆盖和未覆盖，成本是额外表达与协调。 |
| 一组不可用不阻塞另两组 | yes | yes | 方案均符合，但未做真实失败注入。 |
| 单一综合者保持中心论点、术语和验收 | yes | yes | 两者都保留 Main/负责人整体，不投票或拼接。 |
| 核心定义先于依赖它的例子 | yes | yes | 两者都选择顺序关系。 |
| 避免两个 writer 并发改同一语义链和文件 | yes | yes | baseline 已拒绝并发；treatment 进一步把 writer 改成候选/patch 返回，由单一写入者落盘。 |
| 六行机械替换不委派 | yes | yes | 两者均保持比例。 |
| 返回来源、主张、证据、分歧、未知 | yes | yes | treatment 增加 source standing、覆盖、反对与未覆盖；这是可重建性增量，不按术语数量加分。 |
| 方法仅凭候选载体可执行 | n/a | yes | treatment 未回读 P/theory/research/protocol，完成了本题方法；不等于真实调查和文件修改已完成。 |
| 最终结果优于 baseline | uncertain | uncertain | 本题只产出安排，没有真实理论小节、来源正确性、冲突化解质量、README 或验收结果。 |
| 额外 skill 激活产生净收益 | n/a | uncertain | treatment 更明确写入和证据边界，但 baseline 核心行动已成立，存在 ceiling，且 token/延迟/协调成本未测。 |

## 处置

- 当前 skill 载体：`retain`。
- rewrite / 新 skill：`no-proposal`。一次隔离观察不支持因术语更完整而重写；后续修改必须由真实失败、边界遗漏或重复回归驱动。
- 不能提出：因果改善、`boundary-supported`、`matched-improvement`、`regression-supported` 或稳定净收益。

## 评估缺口与后续探针

本轮没有验证 URL、来源 standing 或实际主张正确性，没有比较最终理论一致性、README 结果和负责人验收，也没有测 token、延迟与协调成本。尚未故障注入“一组资料不可用”，未真实制造多 writer 冲突、patch 合并或单写入者落盘。当前 grader 能区分方法遵守与结果质量，但 hidden harness identity 仍使控制条件不完整。

后续 confirmation 应使用新鲜 fixture，分别测试失败 lane 不阻塞、依赖写作的顺序重连、共享写面的真实效果隔离、局部失败只重跑相应贡献，以及 Main 是否在最终产物中真正恢复跨来源张力。development fixture R2-AD 不能继续冒充 holdout。
