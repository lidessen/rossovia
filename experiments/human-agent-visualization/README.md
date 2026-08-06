# 人—Agent 可视化 MVP

这是[人—Agent 可视化设计](./DESIGN.md)的三个可运行透镜：

- [Execution Boundary Lens](./index.html)：为什么 `nextActor=agent` 不代表
  Agent 正在执行这个任务？
- [Skill Lens](./skill.html)：为什么 `skill-engineering` 与一个具体 rewrite
  请求相关，它走哪条路径，什么仍未被证明，又必须在哪里停？
- [Project Lens](./project.html)：让 Agent 从任意本地仓库生成带 revision、
  source reference 和不确定性边界的交互式项目介绍。

Execution 与 Skill Lens 使用受控冻结证据包。Project Lens 会在命令执行时
读取指定本地仓库，生成一次性证据包；它不是实时索引、图数据库、编辑器、
Workbench 连接或 runtime 控制面。

## 运行

在本目录执行：

```sh
bun run dev
```

打开 <http://127.0.0.1:4311>。服务器会在监听前以内存重建结果核对受控的
Execution fixture index 与 Skill Lens fixture；如有漂移，先显式运行下方
`build:fixtures` 命令并审查生成 diff。
可以用下面任一方式覆盖端口：

```sh
HUMAN_AGENT_VIS_PORT=4312 bun run dev
bun run dev -- --port 4312
```

运行聚焦检查：

```sh
bun test
bun run check
```

## 让 Agent 介绍一个 repo

最小调用只需要仓库路径：

```sh
bun run introduce -- \
  --repo /absolute/path/to/repo \
  --intent understand \
  --audience "第一次接触项目的维护者" \
  --question "这个项目做什么，应该从哪里开始，哪些结论可以信？"
```

命令会生成被本目录 `.gitignore` 排除的
`generated/project-evidence-bundle.json`，并打印 Project Lens URL。保持
`bun run dev` 运行，在浏览器打开该 URL 即可。repo 的可检查内容发生变化后，
旧 URL 会被服务器拒绝；重新运行同一条 `introduce` 命令并使用新打印的 URL。

当 Agent 已经调查过仓库，应通过 `--focus` 传入逗号分隔的、仓库内的真实
证据路径，让引导路径围绕当前问题，而不是围绕目录树：

```sh
bun run introduce -- \
  --repo /Users/lidessen/workspaces/skills \
  --intent change \
  --audience "准备修改 Skill 的贡献者" \
  --question "原则如何变成可验证的 Skill？" \
  --focus "AGENTS.md,principles/SEQUENCE.md,skills/skill-engineering/SKILL.md,scripts/probe-skill-installation.py" \
  --verify "python3 scripts/probe-skill-installation.py skill-engineering"
```

`--verify` 是 Agent 针对当前问题提出的待执行命令，页面把它保留在解释层；
只有 manifest 或文档中实际声明的命令才显示为确定性验证投影。多个建议命令可在
一个已引用的参数内用 `;;` 分隔。

可以直接这样要求 Agent：

> 使用 `experiments/human-agent-visualization` 的 Project Lens 介绍这个 repo。
> 先调查与我的问题直接相关的权威来源，再把这些相对路径作为 `--focus`
> 生成证据包，启动页面并返回 URL。来源事实、确定性投影和你的解释必须分层，
> 缺少证据的架构关系标记 unavailable。

Project Lens 保留实际读取的 source excerpt、每个来源的完整内容 revision、
可检查 source tree revision／工作树状态、projection digest 和 bundle binding。
CLI 打印的 URL 同时携带生成时的 bundle binding。页面取包时，本地服务器会
核对该 binding，从 bundle 指向的 repo 重新读取完整来源，并确定性重建
subject 与投影；仅仅修改并重新签名 JSON 不能沿用原 URL 伪装成当前扫描结果。
`--focus` 的 realpath 也必须仍在 repo 内。它仍不会证明运行时行为，也不会从
文件名、目录包含或 import 邻近自动宣布组件所有权、真实调用路径或变更影响。

不启动服务器，只重建冻结 JSON fixture：

```sh
bun run build:fixtures
```

## 证据边界

- Execution Lens 的 fixture bundle 会原子绑定精确保留的 snapshot、Principal 任务观察、
  其他 builder 输入、派生 work-item 投影、source identity、主体／任务上下文、
  relation-contract 与 builder revision、artifact digest 和 binding digest。
- current/prior 对比要求两个证据包内部有效，而且主体、任务上下文、关系契约和
  builder revision 完全一致。不兼容的证据包不会产生漂移判断。
- `current-effect-exact` 和 `current-turn-exact` 只在各自标明的粒度建立当前执行。
- `authorization-consumption-verified` 只证明一个启动授权已经消费。
  同一 Mission 的载体仍然是 `execution-unproven`。
- 浏览器会重新验证当前证据包，但 fixture 仍然是本地手写、形似 Workbench 的证据。
  原型不能证明保留的 runner 观察此刻仍然 live。
- Skill Lens 绑定 `skill-engineering` 的当前源码与 retained source-set 修订、
  rewrite command、直接 references、声明的 P-ID lineage，以及一个明确标为
  fixture-authored 的请求。
  已采纳的设计决定只支持这个 Skill 的通用 owner/gate；因为没有保留这个具体
  请求的 recurring failure 与 minimum-form decision，二者只显示为 hypothesis，
  方法状态保持 `eligibility-unproven`。它同时保留 `activation-unavailable` 和
  `behavior-evidence-unavailable`，不会从静态声明推断 runtime 激活、实际加载或行为改善。
- Skill Lens 的四个 standing cue 会直接标明“冻结来源”或“确定性投影”，并显示
  缺少对应证据时的 fallback；颜色不再承担统一的通过／失败语义。
