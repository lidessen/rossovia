# Observability 索引（harness 工具的观察机制）

> 目的：证据分层原则（L1 宿主观测 / L2 产物 / L3 自报，见 `design/agent-stack.md` 4.4）是 harness 无关的通用设计；
> 但"怎么观测"随 harness 工具不同。本目录每工具一篇，集中索引，未探明的标 `unknown`。

## 索引

| harness 工具 | 文档 | 状态 |
|---|---|---|
| Reasonix | `design/observability/reasonix.md` | 已探明（hooks，11 事件） |
| DeepSeek Harness | — | unknown |
| Claude Code | — | unknown |
| 其他（遇到时补） | — | unknown |

## 约定

- 只在**实际使用**某 harness 做集成测试时探明并补文档，不预造（007A）。
- 每篇统一结构：观察机制 → 能观测到什么 → 怎么接入 4.4 测试手册 → 局限与回退。
- 文档只记录机制事实，不编造未验证的能力；探明过程留证据（实际 hook 配置/日志样例）。
- 换 harness 时先查本索引；无文档的先探明再测，探明结果补回索引（走反馈登记 → 集中迭代闭环）。
