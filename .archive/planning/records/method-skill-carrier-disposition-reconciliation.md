# `practice-cycle` / `work-estimation` carrier disposition reconciliation

状态：`carrier-disposition-reconciled / independent-review-complete / acceptance-pending`；不是 skill
semantic acceptance、portable promotion、文件 move、资源承诺、WorkCell/DeepSeek 实现授权或新的 eval Run。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

本记录只解决一个 projection 问题：早期 `design-development-review.md` 仍把
`practice-cycle` 与 `work-estimation` 写成 `candidate-next`，而当前 round/applicability evidence 已经
足以区分“carrier 继续保留”与“当前具体 probe/consumer 是否继续”。本记录不重新评估正文语义，不
启动 round 4，不把 Main 自用变成 named consumer，也不把两个方法合并成万能 development skill。

## 1. 来源与对象

| 项目 | 当前事实 |
| --- | --- |
| `practice-cycle` carrier | [`.agents/skills/practice-cycle/SKILL.md`](../../.agents/skills/practice-cycle/SKILL.md)，SHA-256 `0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf` |
| `work-estimation` carrier | [`.agents/skills/work-estimation/SKILL.md`](../../.agents/skills/work-estimation/SKILL.md)，SHA-256 `7cbf9b307702c1ef37a3b4f584cf16dfbb650e1811358b85f4641341078def9f` |
| 主要 planning sources | [`design-development-review.md`](design-development-review.md)、[`skill-migration.md`](../index/skill-migration.md)、[`method-skill-probe-round-4-precondition-review.md`](method-skill-probe-round-4-precondition-review.md)、[`practice-cycle` round 3](method-skill-probe-round-3.md)、[`work-estimation` current-use review](work-estimation-candidate-review.md) |
| 共享环境 | 当前项目 planning/design review；没有已命名的外部 consumer、portable consumer 或 resource owner |
| 形式问题 | 是否继续作为可选择加载的 project-local skill carrier；不判断理论、planning ledger 或 runtime 是否应复制进 carrier |

这两个 carrier 的 hash 只能证明当前文件 identity；round 3/round 4 的 frozen card、Run、review 和
source-edge 仍由各自记录拥有，不由本记录重新生成。完整 lineage 通过以下关系回读：

| source/record | owner of relation | 本记录使用的边界 |
| --- | --- | --- |
| `practice-cycle` carrier 与 round 3 candidate/card/task/output/review | `method-skill-probe-round-3.md`、`practice-cycle-round-3` manifest/freeze/run/review | 只使用其 `behavior-observed / attribution-uncertain` 与 Case A/B boundary；不重算 matched |
| round 4 precondition | `method-skill-probe-round-4-precondition-review.md` | 只使用四项硬前置未齐、E0 owner discovery 和 no-rerun 结论 |
| round 3 current applicability | `evidence-applicability-review-practice-cycle-round-3.md` | 只使用 source-edge 可回读但 runtime identity/activation/schema/acceptance 仍 unknown |
| `work-estimation` current use | `work-estimation-candidate-review.md`、`work-estimation-evidence-closure.md` | 只使用 Main-only observation、current case no-proposal 和 named-consumer return |
| carrier placement/migration | `skill-migration.md`、`living-skill-placement-review.md` | 只决定 project-local incubation 与 portable move 不成立，不替代 candidate behavior evidence |

因此本 record 的 provenance standing 是 `source-linked / bounded-reconstruction / acceptance-pending`；它不
声称拥有 round artifact 的 canonical hash、Run identity 或 eval protocol。

## 2. 当前观察与差距

### `practice-cycle`

- 主要判断仍清楚：给定真实实践结果，选择会改变理解的下一项最小实践，或 `settle` / `route` / 保留
  `uncertain`；它不创建总计划、队列、自动 retry 或接受权。
- round 3 Case A/B 提供了真实的行为差异观察：一步修正不制造循环；WorkCell Case B 中 baseline 的窄
  owner route 与 treatment 的较宽 `continue` 不同。
- 这只能支持 `behavior-observed / attribution-uncertain`：runner、model、harness、workspace、权限、
  activation 和输出 schema 未形成可重建 matched contract。
- round 4 前置审查已明确四项硬缺口；当前 matched-probe branch 不能启动新 Run。它的下一 return 是
  named eval/runner owner 和可核验 activation/schema，而不是重复 Main 自评。

### `work-estimation`

- 主要判断仍清楚：恢复目标状态、必要工作图、discovery branch 和当前决策所需粒度；不把节点换算成
  token、时间、金钱或 runtime budget。
- whole-planning、evidence applicability、P15/P16 和 WorkCell review 中反复出现同一结构，但这些是
  Main 的 project-local self-application，不是 named external consumer，也不能证明 carrier-specific
  accuracy。
- `work-estimation-candidate-review.md` 已把当前 WorkCell Spec identity case 收敛为
  `current_case_disposition: no-proposal-now`：继续堆字段、提前 DeepSeek、启动不可归因 matched round
  都不能在当前 owner/前置缺失时改变选择。
- carrier 仍可保留为 planning method candidate；但不能因多个 Main-only 记录而继续累积同类 evidence。

## 3. 对象与最近邻边界

两者不合并：

```text
practice-cycle
  实际结果 → 下一项最小实践 / settle / route / uncertain

work-estimation
  当前目标状态 → 必要工作图 / discovery branch / 决策所需粒度
```

`practice-cycle` 的正触发是结果会改变下一项实践；一步可逆且不改变后续判断的工作回到普通任务。
`work-estimation` 的正触发是粒度、替代方案、资源承诺或 discovery 分支会改变当前选择；无需比较的
一步工作不制造 work graph。`form-selection` 拥有 carrier/reference/project-instruction 的形式判断，
planning owner 拥有 standing/priority，domain owner 拥有具体语义，runtime/WorkCell owner 拥有强制
属性，acceptance owner 拥有接受。

共享“下一步”词汇不是合并证据：前者消费实践结果，后者在资源换算前恢复工作图；它们的触发、失败和
返回关系不同，当前没有产生第二个万能 development carrier。

## 4. 最小 disposition

### `practice-cycle`

```yaml
carrier_disposition: retain-incubation / adapt-and-retest
current_case_disposition: no-proposal-now
next_action: route-to-owner
portable_review_disposition: no-proposal-now (carrier-level; independent of current case disposition)
evidence: format-valid / behavior-observed / attribution-uncertain
named_consumer: unknown
next_return: named eval/runner owner discovery, then runner/model/harness/workspace identity + activation proof + unified schema + narrow Case B
```

这关闭的是当前不可归因的 matched branch，不删除 carrier、不抹掉 round 3 observation，也不取得
candidate acceptance。四项前置任一缺失时不启动 Run。

### `work-estimation`

```yaml
carrier_disposition: retain-incubation / adapt-and-retest
current_main_only_case: no-proposal-now
next_action: wait-for-named-consumer-and-decision-changing-case
portable_review_disposition: no-proposal-now (carrier-level; independent of current Main-only case disposition)
evidence: format-valid / behavior-observed / attribution-uncertain
named_consumer: unknown
next_return: named planning/design consumer discovery, then decision-changing comparison or discovery case + independent review
```

这关闭的是当前 Main-only self-application probe，不否定方法方向；没有 named consumer 和 decision-
changing case 时，不继续累积相同的 Main-only evidence，不把工作图完整写成估算准确或资源承诺。

## 5. 形式、权限与证据边界

当前最小真实形式仍是两个 `.agents/skills/` project-local incubation carrier，加上已有 planning/eval
records；不创建第二 carrier、不复制到 `skills/`、不把 method prose 写回 canonical theory 或 runtime。

允许效果：

- 将两个 carrier 的生命周期 disposition 与当前 probe disposition 分开；
- 在 `skill-migration`、`design-development-review` 和主 planning projections 中修正 stale
  `candidate-next` 表达；
- 记录 named consumer、匹配 identity、activation、schema、decision-changing case 出现时的 revisit。

禁止效果：

- 不启动 round 4 或新的 matched Run；
- 不把 `behavior-observed` 写成 `matched-improvement`、`regression-supported`、adoption 或 acceptance；
- 不把这两个 skill 变成 planning preflight、总工作流、预算系统或 runtime guarantee；
- 不移动到 portable `skills/`，不授权 WorkCell、DeepSeek Harness、base/runtime 或任何实现。

## 6. 阶段出口与回返

本 round 的出口是：

1. carrier-level `retain-incubation` 与 case-level `no-proposal/route` 可以分开回读；
2. 两个方法的主要判断、正负触发、最近邻 owner 和不授权边界没有被合并；
3. `practice-cycle` 的 round 4 前置与 `work-estimation` 的 named-consumer 前置都能被具体恢复；
4. stale `candidate-next` projection 不再遮蔽当前 carrier-level `retain-incubation / adapt-and-retest` 与
   case-level `no-proposal-now / route-to-owner` 事实。

以下变化时 reopen：named consumer、可核验 runner/activation/schema、decision-changing case、真实
accepted-intent code/design consumer、匹配 baseline、独立 review、采用后 regression 或 source/边界
变化。没有这些变化时保持当前 disposition，不重复同一 self-application。

## Independent review

`Meitner`（Agent `01a03947-bfd5-7872-b955-736b47992328`）完成两轮只读复核并最终 `ACCEPT`。复核确认：

- carrier-level `retain-incubation / adapt-and-retest` 与 current-case `no-proposal-now`、`route-to-owner`
  已分开；portable review disposition 也明确是独立的 carrier-level 关系；
- round 4 不能启动的四项前置、named eval/runner owner discovery、source provenance owner 链和 evidence
  上限可回读；
- 两个 skill 的主要判断、触发、最近邻和失败边界不能仅因共享 planning context 而合并；
- portable、acceptance、runtime、WorkCell、DeepSeek 和 implementation freeze 没有被扩大。

该 `ACCEPT` 只覆盖本 disposition reconciliation record，不取得任一 carrier 的 semantic acceptance、
portable promotion、move、资源承诺或实现授权。
