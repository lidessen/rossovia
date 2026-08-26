# 文档迁移状态 projection reconciliation

状态：`source-current / artifact-standing-reconciled / source-native-reconstruction-observed / projection-corrected / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending`；不是新
reading、哲学源修改、portable skill move、阶段转换或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象、来源与范围

本记录只处理“文档是否已经迁移/形成”的当前状态在不同 planning 与 research 视图中的一致性。
共享语义核由以下权威关系组成：

- `theory/philosophy.md` 是 16 条哲学序列的唯一 source；本轮不改动任何 source line。
- `theory/philosophy/Pxx.md` 是 reading candidate 的派生 reading；文件存在不等于 reading acceptance。
- `AGENTS.md` 只拥有项目入口约定；它必须与当前 artifact standing 和逐项 migration disposition 对齐，不能
  用“仍在 archive”或“文件存在”单独推出迁移承诺。
- `planning/records/philosophy-remaining-reading-disposition.md` 拥有 P12/P13/P15/P16 的当前 bounded disposition；
  `planning/index/coverage-audit.md` 和 `planning/item-ledger.md` 承载它们的结构化 planning projection。
- `theory/harness/theory.md` 是当前 harness theory canonical path；旧根路径
  `theory/harness.md` 不再是现行路径。

本轮修正项目入口与派生视图的 stale claim：`AGENTS.md` 中 Pxx 的旧 absent 概括及 archive 的宽泛迁移
表述，`planning/plan.md`“还要做”中的 Pxx 概括，以及 `theory/research/theory-structure.md` 的现行状态
摘要与当前结构表；同时同步 P04/P05 artifact 的 review standing，并将结果投影到 `item-ledger.md`。
本轮进一步按项目入口约定为 P12/P13/P16 建立 source-bound reading candidate，并把下游 no-proposal/hold
与 reading standing 分开投影；旧的 13/3 分法只保留为下文历史记录。

## 2. 当前可回读事实

当前存在 16 个 source-bound reading candidate 文件：`P01`–`P16`。P12/P13/P16 的初轮 reading review
已完成并完成条件性最小修订，修订后 follow-up 已 clean、acceptance 仍未完成；下游 strategy/practice 继续分别保持
no-proposal/hold，这不是把 candidate 写成接受：

| package | 当前 standing | 文件处置 | 本轮允许效果 |
| --- | --- | --- | --- |
| P01–P11、P14 | `source-current / reading-candidate / independent-review-complete / acceptance-pending`（各自细节以对应 review 为准） | 保留现有 candidate 文件 | 只校正状态引用，不把 candidate 写成 accepted |
| P12 | `source-current / reading-candidate / research-open / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending` | 保留 `theory/philosophy/P12.md` | 已完成初轮 review 与最小修订，follow-up clean；只有 adversarial consumer、effectful host case 和接受关系出现时才打开下游 strategy/behavior |
| P13 | `source-current / reading-candidate / research-open / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending` | 保留 `theory/philosophy/P13.md` | 已完成初轮 review 与最小修订，follow-up clean；只有 distinct response effect、资源约束和接受关系出现时才打开下游 strategy/behavior |
| P15 | `source-current / reading-candidate / independent-review-complete / acceptance-pending`，另有 P15-U1 use-case candidate | 保留现有 candidate 文件 | 不把 round-3 behavior observation 写成 reading acceptance |
| P16 | `source-current / reading-candidate / research-open / independent-review-complete / conditional-revision-applied / follow-up-clean / acceptance-pending / cross-boundary-fixture-only` | 保留 `theory/philosophy/P16.md` | 已完成初轮 review 与最小修订，follow-up clean；只有 adoption/time-window consumer、相称 evidence 和接受关系出现时才打开下游实践 |

因此“16 条 source 已落源”“16 个 reading candidate 文件已形成”和“reading 已被接受”必须分开表达。
文件清单只能证明 artifact presence；standing、接受和阶段出口仍由对应 review/projection 决定。

## 3. 最小改变与双受众同步

- 人类阅读视图：`plan.md` 明确 16 个已形成 candidate 与 P12/P13/P16 的下游处置原因，避免把
  “candidate 文件存在”理解为全部已经接受。
- 研究/结构视图：`theory-structure.md` 的现行摘要改为同一 16-package standing，并把 harness theory 的
  canonical path 改为现行路径；其下保留的迁移前提案段落仍标明为历史研究快照，不把它们重写成当前事实。
- 项目入口视图：`AGENTS.md` 明确 16 个 reading candidate 与 P12/P13/P16 的 follow-up-clean/downstream
  disposition，并把 archive-only、absorbed、evaluation/legacy/package-fixture 材料与待迁移 candidate 分开。
- Agent 可判读的 planning projection：`coverage-audit.md`、`item-ledger.md`、
  `philosophy-remaining-reading-disposition.md` 和本轮 review record 的 P12/P13/P15/P16 standing
  作为共享语义核；P12/P13/P16 的初轮 review、条件性修订和 follow-up clean 必须保持一致。

本轮生成了 P12/P13/P16 source-bound reading candidate，没有修改 `theory/philosophy.md`，没有移动
archive/skill，没有创建 `skills/` portable carrier，也没有打开 WorkCell、DeepSeek Harness 或 base/runtime 实现。

独立 review 发现 P04/P05 reading 文件的顶层与 evidence standing 仍停在未完成 source/边界 review，
而对应 planning projection 已标为 `independent-review-complete`。本轮已将两份 artifact 同步到该
standing，并保留 `acceptance-pending`；这不是把 reading 标成 accepted，也不是重复创建 review。

## 4. item contract

| 字段 | 当前值 |
| --- | --- |
| source / identity | 当前 worktree 的 source、`AGENTS.md` 项目入口、16 个 reading artifact、P12/P13/P15/P16 disposition 与结构 projection |
| consumer / owner | 人类 planning reader、Agent planning/review consumer；reading acceptance owner `unknown` |
| dependency | `theory/philosophy.md`、`theory/gene-expression.md`、各 P review、coverage/ledger projection |
| allowed scope | 修正项目入口与派生状态表达、保留 unknown、建立 source-bound candidate、但不改 source、不移动 archive |
| evidence standing | `source-current / artifact-inventory-observed / artifact-standing-reconciled / projection-corrected` |
| disposition | `retain-current-projection / source-native-reconstruction-observed / no-new-downstream-strategy-proposal` |
| stage exit | 所有承重状态视图都能回读 16 个 candidate、P12/P13/P16 的初轮 review/条件性修订/follow-up clean 与下游处置；不等于 phase 1 complete |
| revisit | source、Pxx artifact、reading review、harness path、standing 或 acceptance relation 改变时重新 reconciliation |

## 5. 验证边界

本记录可证明当前文件清单与状态投影已经对齐；不能证明：

- 任一 reading 已取得最终 acceptance；
- P12/P13/P16 永久无价值；
- archive 文档已全部处理完毕；
- skills 已具备 portable standing；
- phase 1、WorkCell、DeepSeek Harness 或实现已经开放。

下一步不再重复 P12/P13/P16 的 reading review；之后只有 source/standing 发生真实变化或下游 reopen
条件出现时，才继续生成相称 evidence/strategy；不为填补目录形状重复制造内容。

## Historical independent review 与当前待复核

此前独立 reviewer 初轮确认历史 13/3 inventory、唯一 source、派生关系和未授权边界，并发现 P04/P05 artifact
standing 漂移；Main 已修正 P04/P05 的顶层/evidence standing，最终复核已确认同步成立。本轮没有把
projection 纠正写成 reading migration、phase completion 或实现授权。

`Chandrasekhar`（Agent `01a03956-a4e0-7711-9b9d-5ac406b69b90`）完成最终只读 review，结论为
`accept`：确认 P04/P05 的 `independent-review-complete / acceptance-pending`、历史 13/3 inventory、
projection scope 与未授权边界一致。该 verdict 只接受本次 bookkeeping，不取得 reading acceptance、
phase transition、WorkCell、DeepSeek Harness、base/runtime 或实现授权。

该历史 verdict 不覆盖本轮 P12/P13/P16 source-native reconstruction；当前记录随后通过独立 review
发现并修订了三份 candidate 的边界问题，修订后的窄 follow-up 已 clean。下一项由 acceptance/consumer
关系决定，而不是把历史 13/3 review 自动扩展为当前接受。

## 6. Round 2：P01/P03 artifact standing reconciliation

全量回读发现 P01/P03 的正文与 `coverage-audit.md`、`item-ledger.md`、`plan.md`、`roadmap.md` 已记录
`independent-review-complete / acceptance-pending`，但两个 reading 文件的顶层状态仍只有
`reading-candidate`。`planning/records/philosophy-reading-review.md` 与 `planning/records/philosophy-parent-review.md`
已提供 source/边界与父关系的独立 review evidence；因此本轮只把 P01/P03 顶层 standing 与其已有
evidence standing 对齐，保留 `acceptance-pending`，不修改 source、定义、反例或父关系接受。

本轮允许效果：修正 P01/P03 artifact status projection。禁止效果：不把 candidate 变成 accepted reading，
不把父关系变成 accepted、不启动行为 Run、不移动 skill、不打开 WorkCell/DeepSeek/base/runtime。

`Chandrasekhar`（Agent `01a03956-a4e0-7711-9b9d-5ac406b69b90`）完成 round-2 最终只读复核并
`accept`：确认 P01/P03 artifact standing 与 planning evidence 一致，仍为 candidate/
`independent-review-complete / acceptance-pending`。该 verdict 只接受 artifact bookkeeping，不取得
reading acceptance、父关系 acceptance、phase transition、WorkCell、DeepSeek Harness 或实现授权。
