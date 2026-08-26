# planning-inbox round 3：old-vs-new candidate manifest

本文件是 round-3 的冻结前 manifest，不运行、不改写 round2。五项 A–E 复用 round2 payload
完整字节，比较 old candidate 与 new candidate；本轮不是 baseline/treatment，也不产生
matched-improvement 主张。

## Frozen identity

- trial id：`planning-inbox-round-3`
- fixture：`evals/skill-evaluation/fixtures/planning-inbox-round-3.md`
- fixture SHA-256：`fb835264a699e36bee068407959b52ba415cda3fffd55c37f76a4cbe8bd57676`
- old arm snapshot：`evals/skill-evaluation/snapshots/planning-inbox-round-2.md`
- old arm snapshot SHA-256：`b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`
- new arm snapshot：`evals/skill-evaluation/snapshots/planning-inbox-round-3.md`
- new arm snapshot SHA-256：`53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e`
- old rollback anchor：保留 old snapshot path/hash，不改 round2 运行记录、manifest 或输出。
- round2 synthesis SHA-256：`0f4421c49d4db46515bd8363ea4510991ac1bb37e9cb648b1ffce00a9e213f4e`
- round2 fixture SHA-256：`fd4311fdc7bc72418ca20de919684d495ab5341c142ca992c9581698c531eeae`
- round2 prior standing：`behavior-observed` with `boundary-supported` observations; no
  `matched-improvement` or stable skill acceptance。
- protocol SHA-256：`2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e`
- status：`frozen / not run`

## Arm contract

- target model/version：`gpt-5.6-luna`；实际 served model 不可核实时写 `unknown`。
- inference/sampling：`unknown`。
- system/developer prompt、harness、runner、权限、workspace、fresh-context 隔离、candidate
  激活和直接 exit：均为 `unknown`，未运行前不补填。
- fresh context：old 与 new 各用 fresh ephemeral context，互不读取对方输出；具体机制未核验。
- old arm：只额外加载 old snapshot，随后接收一个 round2 payload；不得加入 new snapshot、
  round2/round3 fixture、manifest、review、theory、research 或其他 skill。
- new arm：只额外加载 new snapshot，随后接收同一 item 的同一 payload；不得加入 old snapshot、
  fixture、manifest、review、theory、research 或其他 skill。
- payload delivery：每臂收到所选 payload 的完整字节；不做 trim、marker 提取、换行转换、
  脱敏或重排。实际物理隔离未运行核验，保持 `unknown`。
- allowed effects：只返回文字，不改文件、不访问网络、不产生外部效果；实际权限仍 `unknown`。

## Payload locks

| item | reused payload | SHA-256 | old arm | new arm | review-only delta |
|---|---|---|---|---|---|
| A | `payloads/planning-inbox-round-2/A.md` | `d920d43f4a7c3562d9de1583793ea48891c3ccf97d8ca149e169d63d6b863078` | old snapshot only | new snapshot only | ID/path/lineage、批次共同边界、owner unknown；raw floor 不变 |
| B | `payloads/planning-inbox-round-2/B.md` | `9a60494a01b5f0a0d3aba64eb956096a43e69f920dda19bb04590ad9a16768b4` | old snapshot only | new snapshot only | 必须逐字 capture；任何 source 丢失即 major regression |
| C | `payloads/planning-inbox-round-2/C.md` | `f9574a759a6a42d8c361916c20d04a7905670d1573e658889803752ace936f8b` | old snapshot only | new snapshot only | 稳定事实可回指；clear/history 前 raw floor 不变、owner unknown |
| D | `payloads/planning-inbox-round-2/D.md` | `37ae8a6e87fc640667022892f0f0f221226cef85fe88c0da599e5071feaef56e` | old snapshot only | new snapshot only | goal/messages/共同边界回指、owner unknown；不改变 safe-point/runtime floor |
| E | `payloads/planning-inbox-round-2/E.md` | `13458edde1ccc248ae98ef208722d801489515d52253a2133df019713a59e497` | old snapshot only | new snapshot only | ID/lineage 与共同边界；candidate/record floor 不变、owner unknown |

## Semantic floor 与 disposition

- 评审 oracle：完整继承 `fixtures/planning-inbox-round-2.md` 的 A–E floor，并在
  `fixtures/planning-inbox-round-3.md` 复述本轮唯一 delta 和每项 regression probe。
- new arm 的必要条件：保留 round2 的 source fidelity、capture-only、history/clear/complete、
  active-goal/authority、candidate/record、research standing 与无 runtime claim；同时只在
  可稳定回指处减少机械展开，并对 source 未给出的 owner 明写 `owner unknown`/候选路由。
- major regression：任一 floor 退化即否决 new，不以输出更短、token 更低或术语更少抵销。
- balancing cost：记录 input/output/reasoning token、时间、等待和协调差异，但没有硬 token
  阈值、总分或统一通过线。
- 当前 standing：`pre-registered only`；不能声称 old/new 行为改善、matched、adopt、retain
  或接受。若新候选失败，old snapshot 是明确回退锚点；若新候选通过语义 review，也仍需
  独立接受者决定。
