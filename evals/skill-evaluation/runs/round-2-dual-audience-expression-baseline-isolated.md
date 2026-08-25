# R2-DA isolated baseline — Luna

最小可维护安排：不新增文件，明确现有内容的职责。

- `theory/approval.md`：唯一规范来源，只写当前规则及术语定义：“请求中指定的人类负责人接受后才可发布。”
- 维护者指南：不复制规范句作为独立依据；改为引用规范来源，并保留来龙去脉、越权原因和失败案例。
- Agent 任务说明：作为执行投影，只保留行动约束：识别本次请求指定的人类负责人；返回 reviewer 建议；在该负责人明确接受前等待，禁止发布。

这样维护者读指南即可理解理由，Agent 获得足够的行动信息；任何重复文字都被视为派生内容，不能自行演化成第二套规则。

一次规则变更应按以下顺序完成：

1. 先修改 `theory/approval.md`。
2. 检查维护者指南是否仍描述旧负责人或旧流程，更新其解释和失败案例。
3. 更新 Agent 说明中的执行条件，明确负责人来自“当前请求”，而不是固定姓名。
4. 全局搜索旧表述，至少检查 `Ming`、`接受后才可发布` 等残留。
5. 做一次行为检查：构造“负责人未在场、reviewer 已建议、无人接受”的请求；Agent 必须识别负责人、返回建议并拒绝发布。
6. 再构造“负责人明确接受”的请求；此时才允许发布。

如果以后引入生成器，应让 Agent 说明和维护者指南中可机器生成的部分都从规范来源生成；在成本收益未测量前，不应为了生成而新增文件或复制更多规则。

## 运行披露

- runner：`codex-cli 0.149.1`
- model：`gpt-5.6-luna`
- reasoning effort：`none`
- workdir：隔离临时目录 `/private/tmp/skill-eval.DsEdLA`
- sandbox：`read-only`
- user config / project rules：`--ignore-user-config --ignore-rules`
- 候选载体：不可见、未读取、未激活
- 输入：本项 task/source 事实；未提供评审预注册
- 已知偏差：启动时无关 Cloudflare MCP 报告 AuthRequired；任务未使用 MCP，hidden harness identity 仍未完全取得

