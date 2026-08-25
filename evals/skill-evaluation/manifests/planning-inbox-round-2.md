# planning-inbox round 2：预注册 manifest

本文件是 round-2 的冻结清单，不是运行记录。它不回写 round-1；本轮五个 item 各自形成
独立 baseline/treatment 对照，不合并总分、不设全局阈值、不运行试验。

## Frozen identity

- trial id：`planning-inbox-round-2`
- fixture：`evals/skill-evaluation/fixtures/planning-inbox-round-2.md`
- fixture SHA-256：`fd4311fdc7bc72418ca20de919684d495ab5341c142ca992c9581698c531eeae`
- payload directory：`evals/skill-evaluation/payloads/planning-inbox-round-2/`
- payload byte algorithm：对每个 payload 的完整文件字节计算 SHA-256；文件编码 UTF-8，换行为 LF；不做 marker 提取、trim、换行转换或脱敏。
- payload delivery boundary：runner 实际只能收到所选 payload 的完整字节内容；不得收到本 fixture、manifest、review-only 判据、候选 skill 文件、其他 payload、其他输出或 theory/research。该物理隔离机制在运行前未核验，不能以目录/命名 prose 代替。
- round status：`frozen / not run`
- round-1 relation：`adapt-and-retest`；round-1 文件保留，不修改、不回写、不复用其 task/source hash。

## Shared execution contract

- target model/version：`gpt-5.6-luna`（目标明确；若实际运行时精确身份不可核验，记录 `unknown`）。
- inference/sampling settings：`unknown`
- harness/system/developer identity/hash：`unknown`
- runner configuration/version：`unknown`
- fresh context：baseline 与 treatment 各使用 fresh ephemeral context，互不读取对方输出；实际 context 机制未核验，保持 `unknown`。
- baseline：只接收一个 payload，不加载 candidate，不发生 candidate activation。
- treatment：只在同一 payload 基础上额外加载当前 `.agents/skills/planning-inbox/SKILL.md` 的 frozen snapshot，并在本 item 激活一次；不得加入 theory、research、archive、其他 skill 或 review。
- candidate SKILL snapshot SHA-256：`b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`
- permission/effect boundary：只返回文字，不改文件、不访问网络、不产生外部效果；实际强制权限、workspace、runner、工具版本和输出重建均 `unknown`。
- ordinary usage boundary：runner 不回读 P/theory/research；文字不能创造 host command、后台机制、持久化、接受或恢复保证。
- evidence standing before run：无行为证据，仅预注册；不能声称 `behavior-observed`、`matched-improvement`、`adopt` 或 skill 稳定改善。

## Payload locks

| item | payload | SHA-256 | source/task lock | review-only oracle |
|---|---|---|---|---|
| A | `payloads/planning-inbox-round-2/A.md` | `d920d43f4a7c3562d9de1583793ea48891c3ccf97d8ca149e169d63d6b863078` | 完整文件字节，含当前六段 raw；A 不是 fresh holdout | `fixtures/planning-inbox-round-2.md#pi-r2-a` |
| B | `payloads/planning-inbox-round-2/B.md` | `9a60494a01b5f0a0d3aba64eb956096a43e69f920dda19bb04590ad9a16768b4` | 完整文件字节，含“先记着不要分析”原话 | `fixtures/planning-inbox-round-2.md#pi-r2-b` |
| C | `payloads/planning-inbox-round-2/C.md` | `f9574a759a6a42d8c361916c20d04a7905670d1573e658889803752ace936f8b` | 完整文件字节，含 pending/history/中断事实 | `fixtures/planning-inbox-round-2.md#pi-r2-c` |
| D | `payloads/planning-inbox-round-2/D.md` | `37ae8a6e87fc640667022892f0f0f221226cef85fe88c0da599e5071feaef56e` | 完整文件字节；source 不标目标概念 | `fixtures/planning-inbox-round-2.md#pi-r2-d` |
| E | `payloads/planning-inbox-round-2/E.md` | `13458edde1ccc248ae98ef208722d801489515d52253a2133df019713a59e497` | 完整文件字节，含想法、Run observation、调查提议和 source-checked research record | `fixtures/planning-inbox-round-2.md#pi-r2-e` |

每个 item 的 baseline/treatment 必须收到相同的 payload hash；任一字节变化、上下文混入、
评审区块可见、候选 skill hash 变化或额外输入进入 treatment，均不得按本 card 声称 matched，
应另开 round 或降级为 `behavior-observed`/`uncertain`。

## Item-specific phase applicability

- A：`adoption-window=disabled`（dogfood，无 adopted artifact）；`principal-correction=disabled`；`stale/recovery=disabled`。目标是 secretary process，不补造下游运行。
- B：`adoption-window=disabled`；`principal-correction=disabled`；`stale/recovery=disabled`。目标是用户要求的暂存处理，不声称写盘或唤醒。
- C：`adoption-window=disabled`；`principal-correction=disabled`；`stale/recovery=enabled` 仅用于观察给定中断事实的陈述与后续建议，不提供恢复机制。
- D：`adoption-window=disabled`；`principal-correction=enabled` 仅作为 review 对象关系；`stale/recovery=enabled` 仅记录待重新判断的实际依赖，不能代替 acceptance 或 runtime。
- E：`adoption-window=disabled`；`principal-correction=disabled`；`stale/recovery=disabled`。候选与实际 record 的 standing 区分由 review-only oracle 判断。

上述裁剪理由是预注册关系，不是 runner 指令；未启用 phase 不在 payload 中展开字段。

## Hashes of current source dependencies

- `.agents/skills/planning-inbox/SKILL.md`：`b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`
- `planning/inbox.md`：`cb816329b1f22d61b6844610e84b0d8599bed3070a0cbf6a4f856cf4251ec24a`
- `planning/inbox-history.md`：`33531e8712cef7e1e56c1636901b3718a2456b33d0038a81e1ef72d4fd96e9fd`
- `evals/skill-evaluation/protocol.md`：`2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e`
- `AGENTS.md`：`fd53a31c4bce5c609400a006bd20070d7c87444cfed2af8d7b9de9e693c8a877`

## Review and disposition boundary

- independent reviewer：`unknown（未运行）`
- runner-visible extraction audit：`unknown（未运行；必须核验实际只传 payload）`
- baseline/treatment matching：`unknown（未运行）`
- output/terminal reconstruction：`unknown（未运行）`
- current standing：`pre-registered only`
- next disposition if behavior evidence is still missing：`unknown`；若方向有依据但输入隔离、
  载体或证据存在可分离缺口，可 `adapt-and-retest`，不能把 round-1 的失效修正写成 round-2 的成功。
