# Living skill placement review

状态：`placement-set-match-observed / form-decision-observed / independent-review-complete / acceptance-pending`；
不是 skill semantic acceptance、portable promotion、move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`

## 对象、来源与用途

本记录判断当前 11 个 living skill carrier 为什么位于 `.agents/skills/`，以及当前是否存在进入
`skills/` 的充分形式关系。它不重新判断每个 skill 的主要语义，也不把目录集合对账升级为行为证据。

- 实际 carrier source：`.agents/skills/*/SKILL.md`
- 逐项 source/standing：[`skill-migration.md`](../index/skill-migration.md)
- 顶层 item contract：[`item-ledger.md`](../item-ledger.md) 的 living skills rows
- 项目落点规则：仓库 `AGENTS.md` 的 Skill locations / Skill documents 条款
- 形式方法：[`form-selection`](../../.agents/skills/form-selection/SKILL.md)；skill 语义准入仍归
  [`skill-formation`](../../.agents/skills/skill-formation/SKILL.md)

## 实际集合与使用关系

只读集合对账得到 11 个实际 carrier，且与 `skill-migration.md` 表中的 11 个唯一 skill 标识完全
相等：

`agent-delegation`、`agent-expression`、`concept-articulation`、`dual-audience-expression`、
`form-selection`、`human-writing`、`mechanism-design-review`、`planning-inbox`、`practice-cycle`、
`skill-formation`、`work-estimation`。

当前使用关系是：

- 受众：本项目 Agent discovery、planning/design review 和局部评估 fixture；
- 目的：在项目 authority 和本仓库 source/边界下选择性加载方法载体；
- 预期行动：恢复项目特定对象、边界、未知、返回与接受关系，并将结果交回真实 owner；
- 媒介/生命周期：`.agents/skills/` 是项目可发现的 incubation entry，随项目 source、AGENTS、评估
  identity 和 owner 关系演化；不是脱离项目即可独立消费的发布包。

### 同名 source 与 current carrier 的区分

当前集合对账还发现 4 个 machine name 同时存在于 `archive/skills/` 与 `.agents/skills/`：
`agent-delegation`、`practice-cycle`、`mechanism-design-review`、`work-estimation`。逐项内容比较
均不是字节级副本：前者是保留的 v0.5 historical source，后者是按当前项目 authority 重写的
project-local carrier；只有 `.agents/skills/` 进入当前项目的 discovery surface，portable `skills/`
仍为空。因此这不是两个 current canonical 正文，也不是 portable move 已发生。若未来出现 exact
duplicate、项目 adapter 与通用方法没有独立边界，或 archive source 不再需要保留，才按单项
`move / reference / delete` 关系重开；本观察尚未取得新的 semantic 或 portable acceptance。

## 形式决定

| 候选形式 | 当前判断 | 依据与不拥有的关系 |
| --- | --- | --- |
| `.agents/skills/` | 选定的 project-local incubation form | 能承载项目 authority、路径依赖、局部 consumer 和仍在演化的 candidate；不拥有 semantic acceptance、portable acceptance 或 runtime guarantee |
| `skills/` | 当前排除，`no-proposal-now` | 尚无逐项 external/portable consumer、脱项目边界、matched/regression evidence 与 acceptance；提前 move 会制造第二个权威或伪装 portable standing |
| `archive/skills/` | 仅 historical source | 保留来源和历史反例；不是 current discovery entry，不作为 living canonical 正文 |
| 普通 living 文档 | 由逐项 `skill-formation` / `form-selection` 判断 | 承载持久事实、决定、设计或论证的回读权威；按项目路径发现，生命周期随 source、decision 或 planning relation 演化。它不能替代已有 carrier 所表达的选择性方法；若候选不需要选择性加载，应由逐项 review 降级 |
| reference | 由父 skill 或文档的逐项 review 判断 | 只承载从属于父载体、在特定条件分支按需加载的知识或条件细节；不拥有独立的主要判断、项目主发现入口或独立 acceptance，退役随父载体或其依赖关系处理 |
| 新 carrier/镜像/兼容壳 | `no-proposal` | 当前集合与清单一致，没有 orphan 或未承载的 placement gap；复制会产生维护和权威漂移 |

因此“仍在 `.agents/skills/`”是已作出的、证据相称的 project-local form decision，不是尚未纠正的
目录错误；同时也不表示 11 个 carrier 已被接受为有效方法或已具备 portable standing。

## Standing、证据与边界

- current standing：`placement-set-match-observed / form-decision-observed`
- consumer / owner：project planning/skill owner、portable acceptance owner、move owner 均 `unknown`；
  项目内 Agent discovery 是 observed consumer，不等于 external consumer。
- 依赖：项目 `AGENTS.md` 落点规则、逐项 skill source/standing、项目 authority、candidate evidence
  和 future portable consumer。
- 允许效果：维护 `.agents/skills/` 的发现入口，更新 placement/projection 记录，逐项重开 semantic
  review 或 portable review。
- 禁止效果：不创建 `skills/`、不移动/复制/删除 carrier，不因 validator 或目录存在宣布 accepted，
  不创建 runtime loader、registry 或权限机制。
- 证据上限：集合/落点与形式判断 observation；不支持 behavior、matched improvement、regression、
  adoption 或 skill acceptance。
- 当前处置：`retain-project-local-incubation / collection-level-portable-placement-no-proposal-now`；这是本记录对
  11 个 carrier 的集合级落点判断，不覆盖或改写 `skill-migration.md` 中每个 skill 自己的 portable
  standing、semantic disposition 或 revisit 条件。

## 出口与 revisit

本项在独立 review 确认实际集合、形式理由与 authority/lifecycle 边界后，关闭本次 placement check；
它不关闭逐项 skill migration item。以下情况 reopen：carrier 新增/删除/改名，项目 authority 或
目录规则变化，某个 skill 获得脱项目 consumer，portable boundary/matched/regression evidence，或
出现需要独立 reference/tool/runtime form 的反例。只有逐项 `skill-formation` 与 portable acceptance
关系成立后，才可能对单个 carrier 产生 move；本记录不批量授权 move。

## 独立 review

`Kepler`（`01a03943-beb2-76b2-b4cd-04e621c8232a`）已独立复核并 `ACCEPT`：确认 11 个实际目录、
frontmatter `name` 与 migration table 相等，`.agents/skills/`、`skills/`、`archive/skills/`、普通
living 文档与 reference 的 form/authority/discovery/lifecycle 边界成立，且集合级 portable 处置不覆盖
逐项 standing/disposition/revisit。该 verdict 只接受 placement review 的文档边界，不构成任何 skill
semantic acceptance、portable move、runtime 或实现授权。

上述同名 source/carrier 的内容差异是本轮 filesystem observation，尚未由该既有 verdict 单独复核；
它不改变当前 placement disposition，也不授权任何 move。
