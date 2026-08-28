# R2-DA isolated treatment — Luna

最小可维护安排是保留现有三处职责，但明确唯一权威：

- `theory/approval.md`：共享语义核与唯一权威。记录当前规则：请求中指定的人类负责人接受后才可发布；语义 reviewer 只能提出建议，不能代替负责人接受。
- 维护者指南：人类视图。引用该权威，补充规则来龙去脉、为何 reviewer 不能自行发布，以及 Ming 缺席导致误发布的失败案例。
- Agent 任务说明：Agent 视图。不要复制历史理由，只保留行动所需内容：识别当次请求指定的负责人；返回 reviewer 建议；未获得该负责人接受时拒绝发布并等待。它应标明自己是 `theory/approval.md` 的派生表达，而非另一权威。

当前没有生成器时，先采用人工维护，不新增文件。每次共享规则变化都必须同时检查维护者指南和 Agent 说明；未来只有在实际测量后，生成成本低于漂移风险时，才考虑从 `theory/approval.md` 生成 Agent 视图或两种视图。

规则变更应按以下顺序完成：

1. 先修改并接受 `theory/approval.md` 中的权威规则。
2. 根据新规则分别修订维护者指南和 Agent 说明；不能只搜索替换 “Ming”，还要重新检查“谁能接受”和“谁能发布”的行动边界。
3. 在两种视图中标明来源及同步状态；在同步完成前，旧的 Agent 说明视为过期，发布动作必须暂停。
4. 运行语义回归，而不是只做文本 diff。

至少检查这些行为：

- 请求指定 Ming，Ming 未接受：Agent 必须等待并拒绝发布。
- 请求指定另一名负责人，Ming 未参与：Agent 仍必须等待该指定负责人，不能把 Ming 缺席解释为无需等待。
- reviewer 已提出建议但负责人未接受：Agent 必须返回建议，但拒绝越权发布。
- 指定负责人已接受：才允许进入发布流程。
- 人类视图能解释规则变化、reviewer 的权限边界和此前误发布的原因。
- 两种视图都能回到 `theory/approval.md`，且没有任何派生文字把 Ming 重新变成固定负责人。

因此，本次修复的完成标准不是“两份文字相同”，而是权威、两种受众视图和上述行动结果重新一致。

## 运行披露

- runner：`codex-cli 0.149.1`
- model：`gpt-5.6-luna`
- reasoning effort：`none`
- workdir：与 baseline 同一隔离临时目录，使用新 session
- sandbox：`read-only`
- user config / project rules：`--ignore-user-config --ignore-rules`
- 唯一显式附加目录：`.agents/skills/dual-audience-expression`
- 候选载体：读取其 `SKILL.md`，未沿链接读取 P、theory、research、protocol 或其他 skill
- 输入：与 baseline 相同的 task/source，并额外要求读取候选载体；未提供评审预注册
- 已知偏差：启动时无关 Cloudflare MCP 报告 AuthRequired；hidden harness identity 仍未完全取得

