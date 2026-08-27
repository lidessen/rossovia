# Observability: Reasonix

> 状态：已探明（2026-08-27，依据内置 `reasonix-guide` skill）。用于 `design/agent-stack.md` 4.4 集成测试的 L1 观测。

## 观察机制：Hooks（11 个事件）

配置位置：项目 `<workspace>/.reasonix/settings.json`（自动加载）或全局 `<Reasonix home>/settings.json`。
匹配规则：`match` 是 **anchored** 正则（`file` 不匹配 `read_file`，需 `.*file` 或 `*`）；
timeout 单位毫秒（gating 默认 5s、其他默认 30s）。检查：`/hooks`、Settings → Hooks、Diagnostics → Hooks。

事件列表：

| 事件 | 触发时机 | 阻塞 | 测试用途 |
|---|---|---|---|
| `PreToolUse` | 工具调用前 | 是（exit 2 可门控） | 门控/确认行为 |
| `PostToolUse` | 工具调用后 | 否 | **L1 核心**：sub agent 工具调用 trace（读了哪些文件、跑了什么命令、skill 加载调用） |
| `PermissionRequest` | 权限请求时 | 否 | 授权行为观测 |
| `UserPromptSubmit` | 用户消息提交 | 是 | 输入边界 |
| `Stop` | agent 停止 | 否 | 完成边界 |
| `PostLLMCall` | 模型调用后 | 否 | 模型输出/token 佐证 |
| `SessionStart` / `SessionEnd` | 会话开始/结束 | 否 | 场景隔离边界 |
| `SubagentStop` | sub agent 结束 | 否 | **L1 核心**：sub agent 回执与产出 |
| `Notification` | 通知 | 否 | 事件佐证 |
| `PreCompact` | 上下文压缩前 | 否 | 防证据丢失（长任务） |

## 能观测到什么（接入 4.4 的对应环节）

- **行为层（L1）**：`PostToolUse` 记录 sub agent 全部工具调用（含 `run_skill`/`use_capability` 的 skill 加载）；
  `SubagentStop` 记录 sub agent 结束状态与产出。hook 输出 append 到观察日志（如 `.reasonix/hooks/`，按测试场景分文件）。
- **机械层**：产物由一致性检查脚本断言（不在 hooks 范围内）。
- **语义层**：主 agent 判断（hooks 不参与）。

## 局限与回退

- 无专门的"skill 加载"事件——skill 经工具调用（`run_skill`/`use_capability`）加载时可见于 `PostToolUse`；
  内联 skill（如 `reasonix-guide`）直接 pin 进上下文、不经工具调用，观测不到 → 回退：委派契约要求 sub agent
  的方法加载走工具，或接受 L3 自报并交叉验证。
- hooks 只记录事件，不记录思考过程 → 思考类证据归 L3 自报，标注 `self-report`。
- 项目级 hooks 不生效时：检查 workspace 路径与重启（reasonix-guide：Symptom → cause → fix）。
