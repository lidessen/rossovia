# planning-inbox round 2 fixture / payload / manifest 独立静态 review

## 结论

静态结论：`accept`（作为预注册输入与 payload 设计）。行为结论：`unknown`；本轮未运行，
不能声称 `behavior-observed`、`matched-improvement` 或 skill 已改善。runner 实际是否只传
所选 payload、baseline/treatment 是否真的只差候选 skill、模型与权限是否匹配，仍是运行前
未知；这些未知必须阻止任何 matched 主张，而不倒推为 round-2 已成功。

round-1 的 B1–B3 在输入设计层面已关闭：任务改为自然请求并移出 rubric，payload 物理上是
独立文件，D 不再以 `safe point`/`Principal correction` 等评审标签命名 source。五项仍有
足够的静态 headroom，且 E 增加了 candidate 与实际 record 的真实最近邻覆盖。

## B1–B3 回归

### B1：baseline 不再收到候选方法的 task 泄漏 —— 已关闭

round-2 明确让 runner 只收到所选 payload，而候选方法词、负例、事件顺序、runtime 边界和
最近邻判据留在 fixture 的 review-only 区块（`evals/skill-evaluation/fixtures/planning-inbox-round-2.md:3-18`）。
逐一检查 A–E payload 后：

- A 只要求对六条内容做秘书式整理、给出可能去向、补问、决定者并回到原话
  (`payloads/planning-inbox-round-2/A.md:1-7`)；没有 round-1 的 `explicit/inferred/unknown`、
  append 顺序、canonical 合并或 acceptance rubric。
- B 只要求按用户消息返回可保存结果，不扩展请求 (`B.md:1-9`)；未把 capture/process、
  `/inbox` host 边界或持久化规则写成 task 答案。
- C 只给整理方案、下一步、清空压力和中断事实 (`C.md:1-11`)；没有把 append-first、
  hold、clear≠complete 或 exactly-once 拒绝规则写进 task。
- D 只要求依据两条消息说明当前与下一次可保存检查时的处理，并保持连续性
  (`D.md:1-10`)；没有使用 round-1 的 `safe-point` 或 Principal 标签。
- E 只要求混合材料的去向、依据和下一步决定者 (`E.md:1-10`)；材料的事实类型有区分，
  但没有附 evaluator 正例/重大缺陷区块。

“去向”“谁决定”“下一步”等是本次用户请求本身需要的秘书任务目标，不等于候选 skill
的具体答案字段。它们没有预先规定某一 standing、事件顺序或拒绝结论，因此不构成上一轮
级别的 headroom 泄漏。

### B2：review-only 与 payload 的物理内容隔离 —— 静态已关闭，运行核验仍是 blocking gate

五个 payload 只含 `# Task` 与 `# Source`，没有 fixture 的 review-only 正例、boundary、重大
缺陷、最近邻表或 `matched` 判据；也没有候选 `SKILL.md` 正文、fixture/manifest 路径或其它
payload。review oracle 仍只在 fixture 中（`fixture:94-103`），不会随 payload 文件内容发送。

manifest 已从 round-1 的 marker 方案改为完整 payload 字节算法和 delivery boundary：完整文件
字节、UTF-8、LF、不 trim/提取/脱敏（`evals/skill-evaluation/manifests/planning-inbox-round-2.md:11-15`）。
这足以使静态输入可审查；但它同时明确真实物理隔离尚未核验（同 `:12-13`, `:41-43`,
`:65-68`）。因此：

- 静态 payload 设计：通过；没有因 review oracle 内容而阻塞新 round。
- 运行与 matched 归因：仍 blocking/`unknown`，必须实测 runner 实际上下文字节；目录、文件名
  和 manifest prose 不能单独证明隔离。

### B3：D authority 矛盾与语义标签 —— 已关闭

D payload 不再把关系命名为 `Principal correction` 或 `safe point`。它给出中性的当前状态、
普通未来想法和当前接受者的原话：消息 1 只是“以后想做、先记一下”，消息 2 明确要求任何
对外发布、权限变化或不可逆效果都要 named owner acceptance，并要求下一次可保存检查时
重读 goal/card/接受关系；同时 source 说明没有后台机制，也没有证据消息 2 已被运行环境接收
（`evals/skill-evaluation/payloads/planning-inbox-round-2/D.md:5-10`）。

这保留了 Main 补充的 authority 矛盾：普通想法不自动改变主线，而明确的接受边界修正应
保留来源并在下一次可保存检查时重新判断；秘书不能代替 named owner acceptance。它没有把
该判断预先标成评审答案。消息 2 中的 named-owner/runtime 字样是用户 source-native 的
authority 与能力事实，不能为了降低 baseline 信息而删除；否则会改变被测对象，而不是修复
leakage。

## 五个 payload 的对象与 headroom

| item | 独立覆盖 | payload 是否把答案写成 rubric | 静态判断 |
|---|---|---|---|
| A | 当前 inbox 六条 raw 的 secretary process / dogfood | 否；只给整理请求与逐字 source | 保留；是真实 dogfood，不是 fresh holdout |
| B | 明确“先记着不要分析”的 capture 停点 | 否；用户原话本身是 source | 保留；与 A 的 process 不重复 |
| C | pending/history、中断、重复和清空压力 | 否；中断是给定事实，不是“应 append-first”的答案 | 保留；测 lifecycle/lineage，不是 capture |
| D | active goal 中普通 future input 与 authority boundary correction | 否；只保留 source-native correction | 保留；测主线连续性与 authority，不是 C 的 history 迁移 |
| E | candidate 与实际 experiment/research record 的 standing 混合 | 否；四种材料分别提供事实状态 | 保留；覆盖 round-1 未覆盖的真实 nearest-neighbor |

五项不应合并总分或统一阈值；fixture 和 manifest 都保留逐项语义 review
（fixture `:19`, manifest `:3-4`）。当前没有发现因重复而需要删项或合并项的 blocking。

## A exact raw 检查

A payload 的六个 ID、顺序和逐字内容与当前 `planning/inbox.md` 的六条原文一致：
`001A` 至 `001F` 的文本分别匹配 inbox `:12-58`，没有改写、增删或重新排序。payload 另以
“同一批次”说明 provenance，ID 保留 `IN-2026-08-24-001`；它省略了 inbox 展示层的每条
`状态：raw capture，未整理`字段，但没有丢失六条 raw source。manifest 正确将 A 限定为
dogfood，不将它冒充 fresh holdout（`fixture:21-33`; `manifest:35,47`）。

## E candidate ≠ record 检查

E 的四条材料形成了可分的 standing：

1. “想试 A”只有提议，没有运行记录；只能作为 experiment candidate。
2. `Run R-17` 有实际 baseline/treatment 输出、终态日志和待复核差异，但没有最终接受；它是
   实际 Run/Cell/eval record，不是秘书生成的 effect 或 acceptance。
3. “官方资料如何区分……”只有待查问题和页面线索，没有完成核验；它是 research candidate。
4. `RR-03` 有 URL、访问时间、版本、摘录、冲突和缺口，并标明 reviewer 已对照原页面；它是
   source-checked research record。

这些关系直接覆盖候选 skill 对 candidate/record 的边界（`.agents/skills/planning-inbox/SKILL.md:105-118`），
而 payload 没有把上述 standing 概括成 oracle。E 因此是实际覆盖，不是重复 A 的原始秘书整理。

## Hash、编码与可重建性

manifest 的 payload 算法明确，当前实测吻合：fixture SHA、A–E 五个完整 payload SHA、候选
SKILL snapshot SHA，以及 inbox/history/protocol/AGENTS 依赖 SHA 均与
`evals/skill-evaluation/manifests/planning-inbox-round-2.md:8-15,26,35-39,55-61` 相同。
对 fixture 与五个 payload 做 UTF-8 解码及 CR 字节检查，均为 UTF-8、LF-only；没有 CRLF。
因此 round-2 的输入 hash 可按 manifest 的完整文件字节算法重建，不再有 round-1 那种 marker
区域 hash 算法含糊问题。

任何 payload 字节、候选 snapshot、上下文或 delivery 输入改变，都不能继续沿用本 round 的
matched 资格；manifest 已要求新 round 或降级为 `behavior-observed`/`uncertain`
（`:41-43`）。

## baseline/treatment delta、模型与剩余未知

delta 表达正确：两组使用同一 payload；baseline 不加载候选，treatment 只额外加载冻结的
planning-inbox skill 一次，不加入 theory/research/archive/其它 skill
（manifest `:19-28`）。目标模型明确是 `gpt-5.6-luna`（`:19`）。普通使用不回读 P/theory/
research，文字也不能创造 host command、持久化、接受或恢复保证（`:27-29`）。

仍需保持 `unknown` 的不是 fixture 内容而是运行条件：真实模型精确身份、harness/system/
developer、runner 配置、fresh context、权限强制、workspace、candidate 激活和 payload
delivery audit（manifest `:20-28,65-68`）。在这些条件未核验前，headroom 只能说“静态设计
未泄漏”，不能说 treatment 已超越 baseline。

## Non-blocking 与后续 probe

Non-blocking：A 只作为 dogfood、D 保留 source-native authority 原话、C 的中断只作为给定
状态、E 的 `RR-03` 只作为 fixture 中已对照的事实，均与预注册边界一致；没有新增 schema 或
runtime 保证。

行为前的必要 probe：

1. 对实际 runner 做 payload byte/context audit，逐项确认 baseline/treatment 都只收到同一
   payload，且 review oracle、fixture、manifest、candidate 理论没有进入上下文。
2. 在 gpt-5.6-luna 上分别运行 A–E，由独立 reviewer 按 fixture oracle 判断 raw lineage、
   capture 停点、history 状态、authority 关系和 candidate/record standing；不得用术语数、
   篇幅或格式作为改善。
3. 对 C、D、E 特别记录文字是否把 clear/中断、authority correction 或 Run/research record
   说成实际 runtime、接受或新结论；没有相应 owner/evidence 时保持 `unknown`。

## Main 综合处置

**处置：静态 `accept`；进入运行核验。** Main 接受 round-2 的中性 payload、物理内容
分离与五项 oracle。当前接受仅表示可开始实际 runner audit；模型、payload delivery、fresh
context、候选激活、权限和输出终态仍须由运行记录核实，未核实前行为 standing 保持
`unknown`。
