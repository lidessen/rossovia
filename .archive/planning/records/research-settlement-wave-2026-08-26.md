---
kind: planning-record
id: research-settlement-wave-2026-08-26
status: settled
disposition: wave-complete
evidence: source-observed
settlement_route: settle-or-archive
owner: "unknown"
consumer: planning-maintenance
review_at: reopen-on-active-surface-growth
---

# Research settlement wave：active inventory 与第一项结算

wave：`bounded`
inventory：`frozen`
review：`independent-inventory-complete`
settlement：`wave-settled`
checkpoint：`complete`。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本 record 是一次有限的 planning maintenance wave，用来把“research 不能长期未结算”从规则推进到实际
处置。它只处理当前 frontmatter 标记为 `active` 的 research/experiment surface，不重写历史 body、
不批量删除、不开新的研究综述，也不进入 WorkCell、DeepSeek Harness、base/runtime 或任何实现。

## 1. Frozen decision question

当前 active inventory 是否能对每项恢复：真实对象、source/standing、consumer/owner、下一 action、
settlement route、evidence limit 和 reopen condition；其中已有足够 evidence 的项，是否可以在不偷换
acceptance 的前提下从 `active` 结算为 `canonical-proposal`、`bounded-trial-ready`、有限 `owner-gated hold`
或 `archive-*`？

本 wave 的成功不是“active 数量越少越好”，而是每项都有诚实去向；如果结算规则制造更多无意义 metadata、
重复 review 或 owner burden，则对 closure candidate 返回 `archive-inconclusive`。

## 2. Frozen scope and source

- source：`theory/research/*.md` 与 `planning/records/*.md` 的 frontmatter；正文、item ledger、canonical
  source、pilot raw output 和 current plan/roadmap 是回读依据。
- population：wave 开始时冻结的 research/experiment population 为 11 个；新 long-horizon card 在 wave 中
  作为独立 candidate 加入；在 wave 的结算快照中，已结算 5 个，wave-open remainder 为 7 个，另加
  本 settlement record 自身为 active planning record（当时 frontmatter 总 active 数 8）。这些是阶段快照，不是
  当前 active 计数；`settled`/`archived`
  不重新综述，inbox pending raw 不偷升为 active research。
- output：一份 inventory table、每项当前证据上限、第一结算建议、缺失关系和 reopen condition；至少选择
  一项 evidence 充分的 substantive candidate 完成结算。
- exclusions：不修改 `theory/philosophy.md`、WorkCell canonical design，不实现运行时机制，不把 reviewer、
  sub-agent 或 frontmatter 当 acceptance owner。

## 3. Todo work map

```text
- [x] freeze source population and decision question
  reminder: research-open is temporary; every active row needs a destination or explicit return
  source: this record + research-settlement-and-closure.md
  return: frozen inventory scope and no-implementation boundary

- [x] independent inventory lane
  reminder: inspect standing and evidence, not file age or status wording alone
  source: theory/research frontmatter + linked body/current ledger
  return: row-level route, missing relation, evidence limit, reopen condition; no file edits

- [x] Main settlement lane
  reminder: settled is not accepted; only move the research record's current relation
  source: independent inventory + canonical source + item ledger
  return: one or more destination updates with reason, lineage and owner/consumer unknowns

- [x] checkpoint and regression
  reminder: closure must reduce unresolved surface without erasing value
  source: validators + current planning authority
  return: active count, settled/archive count, changed authority, next wave or no-proposal
```

## 4. Delegation boundary

Main owns the whole wave, source population, conflict reconciliation, settlement decision and current projection.
The independent lane may classify and recommend from the frozen source, but cannot edit, assign owner, accept a
candidate, or decide that an unknown has no value. This is a bounded read-only contribution because it has an
independent evidence surface and a compact row-level return; any shared semantic correction returns to Main.

## 5. Settlement rules for this wave

1. A research record may become `settled / canonical-proposal` when its result has already been handed to a named
   canonical design/plan/skill consumer, while acceptance remains pending there.
2. A concept may become `settled / canonical-proposal` when its boundary and nearest-neighbor distinctions are
   formed and no additional research action is currently justified; a future trial reopens it with a new card.
3. A record stays `active` only when it has a real next action, consumer/route, review point and a decision-changing
   evidence gap; owner-gated hold is temporary.
4. A record becomes `archived` only with a reason, evidence limit, lineage and reopen trigger; lack of attention alone
   is not an archive reason.
5. A frontmatter edit must be accompanied by a body/ledger/receipt projection update when it changes current route;
   metadata never overrides canonical standing.

## 6. Independent inventory return

只读独立 lane `01a03dff-4b33-7f83-8c65-ed0018e9f84e` 已按 frozen population 返回逐项建议。它只提供
分类、证据上限、缺失关系和 reopen condition，不取得 owner 或 acceptance：

| item | current route recommendation | missing relation / reopen |
| --- | --- | --- |
| `controlled-experiment-design-pilot` | `settled / archive-inconclusive`；即时 carrier observation 保留 | 不再重复同一 reminder card；若要重开必须有长时遗忘问题、独立任务实例和 primary outcome |
| `controlled-experiment-design` | `active / keep for one discriminating retest` | 需要 named experiment/evidence owner、long-horizon card、matched unit、acceptance relation；新 card 已形成 |
| `agent-harness-throughput` | `owner-gated hold`；无 return 则 `archive-inconclusive` | 缺 named eval/runner、冻结 identity/card、clock/schema/telemetry |
| `harness-agent-initiative` | `owner-gated hold`；无 return 则 archive | 缺真实 consumer、owner、matched baseline/treatment 和 runner |
| `main-agent-project-work-method` | `active / adapt-and-retest / planning-dogfood-observed`；本 wave 提供了 bounded process observation | 仍缺 direct comparison、协调/重连成本、named acceptance 和 adoption/regression |
| `planning-information-architecture` | `settled / canonical-proposal`；六层结构和 path projection 已交给 planning current surface | adoption/discovery evidence 仍未知；出现新 decision delta 才 reopen |
| `provisional-adoption` | `settled / canonical-proposal` concept；不建立全局 enum/gate | 实际 bounded trial 仍需另建 record，具备 candidate、scope、owner、期限、rollback 和 acceptance |
| `research-settlement-and-closure` | 保持 active 至本 checkpoint 后再结算 | 需要逐项 destination、lineage、reopen 和“减少 unresolved surface”的证据 |
| `iterative-improvement` | `active / adapt-and-retest`；保留为闭环方法 source，不新建总 workflow skill | 需要真实 project-scale behavior、独立 review、adoption window 或明确 no-proposal |
| `iteration-process-audit` | `settled / canonical-proposal`；流程边界与风险已交给 `iterative-improvement`/Main method | 新 workflow counterexample、decision-changing consumer 或可重建对照出现时 reopen |
| `philosophy-gene-one` | `settled / canonical-proposal`；总研究已形成 16 条 source-bound proposal，逐项关系交给 P01–P16 package | 只有 source revision、人类点名定稿或新的 reading/use-case decision delta 才 reopen；package acceptance 仍独立 |
| `long-horizon-agent-forgetting-design` | `active / design-candidate / mechanism-review-formed`；task continuity relation 已与 chat history、memory、notification、Todo、WorkCell 和 base/runtime 分层 | 需要连续性机制、long-horizon task consumer、runner identity、重复/精度计划和独立 review |

独立 lane 还指出：`research-open` 的存在时间和文件年龄不是结算理由；当前首先应结算已经有明确
证据上限的 pilot，再把新的 long-horizon card 作为单独 active candidate，不把两个对象合并。

## 7. Main settlement result

Main 已按用户的 problem-first correction 结算 reminder pilot：它从 `status: active` 移为
`status: settled / disposition: archive-inconclusive`，理由是它没有测试长时间执行中的遗忘；raw output、
有限的 carrier/readability 观察和 lineage 保留。新的
[`long-horizon-agent-forgetting-design.md`](long-horizon-agent-forgetting-design.md) 作为 active design
candidate 接替主实验设计，但尚未执行、接受或授权实现。

因此本 wave 已完成五项 inventory substantive record 的诚实结算，并把 closure rule 自身交给
`canonical-proposal`；其余 active item 已逐项保留真实 route、证据上限、consumer/owner unknown 和 reopen
condition。没有研究被删除、正式接受、实际采用、移动或转成 WorkCell/DeepSeek/base/runtime 实现。

## 8. Checkpoint and regression

- wave-open research/experiment population：11；wave 中新增 long-horizon forgetting design candidate 1；
  current research/experiment active remainder：6；本 planning record 已结算，frontmatter active total 不再
  包含本 wave。
- 已结算：Todo reminder pilot → `archive-inconclusive`；planning information architecture →
  `canonical-proposal`；bounded trial adoption → `canonical-proposal`；iteration-process-audit →
  `canonical-proposal`；philosophy-gene-one → `canonical-proposal`；research settlement and closure →
  `canonical-proposal`。
- 未取得：任何 candidate 的正式 acceptance、bounded-trial adoption、matched improvement、长期 regression、
  WorkCell/DeepSeek/base/runtime implementation 或 provider choice。
- 重新打开条件：新 source、真实 consumer/owner、decision-changing counterexample、active surface growth，
  或当前结算关系导致 authority/证据/维护成本退化；否则不重复创建同层 research。

本 wave 已完成并可从 current execution surface 移除；下一条 bounded wave 必须重新由 item ledger 选择，
不能因为本 record 的历史存在而自动继续运行。
