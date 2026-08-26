# planning-inbox round 2 evidence applicability review

状态：`historical-chain-observed / source-applicability-uncertain / runtime-applicability-uncertain / independent-review-complete / acceptance-pending`；
不是新 Run、不是对旧 manifest/run/review 的修订，也不是 skill acceptance、portable move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 选择与范围

上一项 evidence-maintenance 实践完成了 living skills round-2 family 的历史产物/当前适用性核对。
本轮从 whole-planning 的 A/B/F 分支中选择 `planning-inbox-round-2`：它已经有五项 baseline/treatment
输出、run identity、blind semantic review 和 synthesis，但没有独立的 post-freeze applicability projection。
该选择只补 source、lineage、standing 和 current applicability；不重新评分、不重跑、不把旧 round 改成当前
round。

检查对象：

- 预注册 manifest：`evals/skill-evaluation/manifests/planning-inbox-round-2.md`；
- fixture/payload：`evals/skill-evaluation/fixtures/planning-inbox-round-2.md`、
  `evals/skill-evaluation/payloads/planning-inbox-round-2/`；
- candidate：round-2 记录的 planning-inbox snapshot 与当前 `.agents/skills/planning-inbox/SKILL.md`；
- 输入、输出、events/stderr 和机械 identity：`evals/skill-evaluation/runs/planning-inbox-round-2/`；
- semantic review：A–C、D–E blind review、mapping/synthesis 和 fixture static review；
- current project source：`planning/inbox.md`、`planning/inbox-history.md`、`AGENTS.md`、current protocol。

## 2. Source 与 artifact edge

| edge | round-2 recorded relation | current observation | result |
|---|---|---|---|
| manifest | raw SHA-256 `0b5d9d0c753af251de2dca47c854f6f3a2d930dae213977055846fa1433d46b2`；round status `frozen / not run` | manifest 文件仍可读；该状态是预运行登记，不是对实际产物的否认或更新 | `manifest-edge-observed / pre-run-status-retained` |
| fixture | `fd4311fdc7bc72418ca20de919684d495ab5341c142ca992c9581698c531eeae` | 当前 fixture hash 相同 | `fixture-edge-match-observed` |
| protocol | `2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e` | 当前 protocol hash 相同 | `protocol-edge-match-observed` |
| candidate snapshot | manifest/run identity 记录 `b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e` | 当前 `.agents/skills/planning-inbox/SKILL.md` 为 `53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e` | `candidate-source-drift-observed` |
| inbox source | manifest records `planning/inbox.md` `cb816329b1f22d61b6844610e84b0d8599bed3070a0cbf6a4f856cf4251ec24a` | current `a599540fb483d76d6b5f5abe4772cc0f64fec40b9fc526ec04f5126db8b43545` | `current-source-applicability-uncertain` |
| inbox history | manifest records `planning/inbox-history.md` `33531e8712cef7e1e56c1636901b3718a2456b33d0038a81e1ef72d4fd96e9fd` | current `fb9265fd9301ac3e363d98840265463d963508ee9ec5c30d711f4f1e727ffa4d` | `current-source-applicability-uncertain` |
| AGENTS | manifest records `fd53a31c4bce5c609400a006bd20070d7c87444cfed2af8d7b9de9e693c8a877` | current `1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a` | `instruction-edge-drift-observed` |
| run identity | `evals/skill-evaluation/runs/planning-inbox-round-2/run-identity.md` | current raw SHA-256 `6ba63ba39a1c033fd46b076d9ad3334263525b8eb39e3bf849bd5a13ed25dfc9` | `identity-record-present` |
| semantic synthesis | `planning-inbox-round-2-synthesis.md` | current raw SHA-256 `0f4421c49d4db46515bd8363ea4510991ac1bb37e9cb648b1ffce00a9e213f4e` | `review-edge-present` |

Round-2 的 fixture static review 当前 hash 为 `2122daaae9e04f7d54ba305ac49c43def430e83ddcf6dec0610060abcda8bf98`；
A–C blind review 为 `e3ab5532dd851fb5d603c5e90e4b9ad3d98da0e403a2767f65be433777fab52c`；D–E blind review 为
`4e188507863b393bf4573acef11614e4d5f0d2a78c38336e3761e8e1d3b32353`。完整十个 input/output、JSONL、stderr
和每臂事件 hash 以 run-identity 为准，不在本记录复制第二份 output ledger。

candidate、inbox/history 和 `AGENTS.md` 的 digest 差异在本记录中只是机械 provenance drift；它们不单独
证明内容或指令发生了语义变化，只说明旧 round 的 current applicability 不能直接继承。

`AGENTS.md` 在本记录建立后又从当时观测的
`285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379` 漂移到当前
`1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`；这只修正 current observation，保留
历史 round 的 `instruction-edge-drift-observed / current-source-applicability-uncertain` standing。

## 3. 实际历史链与证据上限

### 已能在文件/事件层面回读

- 五个 baseline input 与对应 payload 逐字节相同；五个 treatment input 逐字节等于固定 wrapper、round-2
  candidate snapshot 和同一 payload；这只证明保存的 input 关系，不证明运行时只看到了这些字节。
- 十次运行均有非空 output、JSONL 和 `turn.completed`；B–E 由固定 runner 生成，A 使用同参数手动运行。
  A 没有单独保存 stderr sidecar，B–E 有 stderr sidecar。
- 可见 JSONL item 全是 `agent_message`，没有 tool/MCP item；B–E 的 stderr 都有相同形式的 Cloudflare
  `AuthRequired` 警告。该警告降低 runtime identity 可核验性，但不能单独解释为语义失败。
- A–C、D–E blind review 与 synthesis 均能回读；fixture static review 只接受预注册输入/payload 设计，
  不接受行为或 matched 结论。

### 仍不能证明

- 精确 served model、完整 system/developer prompt、实际 harness/权限和物理隔离；请求名
  `gpt-5.6-luna` 不能替代 served model identity；
- 直接 process exit artifact（B–E 只有 runner gate/`turn.completed`，A 也无独立 exit artifact）；
- candidate 在运行时确实激活、baseline 确实未加载、runner 实际可见边界和两臂除 candidate 外只有一个变量；
- round-2 frozen candidate/source 是否仍代表 current planning-inbox 与 current project instruction。

Synthesis 的语义结论是：五项 treatment 在 source/authority/owner/standing 边界上均被 blind review 选为较好，
但最强共同 standing 仍为 `behavior-observed`，附有限 `boundary-supported`；round disposition 为
`adapt-and-retest`，不能提出 `matched-improvement`、稳定泛化、adopt、regression 或 portable acceptance。

## 4. Current applicability judgment

当前可支持的不是“round-2 已经评估了当前 planning-inbox skill”，而是：一条历史 artifact chain 在文件和事件
层面可重建到上述程度；其 candidate、inbox/history source 和 AGENTS edge 均已漂移或未与当前 source 冻结，
runtime identity/activation 也未闭合。因此记录为：

```yaml
source_edges: fixture-and-protocol-match-observed; candidate-and-project-source-drift-observed
artifact_chain: reconstructible-at-file-and-event-level
runtime_applicability: uncertain
current_project_source_applicability: uncertain
behavior_standing: behavior-observed
boundary_qualifier: boundary-supported
attribution: uncertain
round_disposition: adapt-and-retest
carrier_disposition: retain-incubation
matched_improvement: not-supported
adoption: not-started
regression: unknown
acceptance: unknown
```

`source-edge-match-observed`、非空 output、`turn.completed` 和 blind review 不能被偷换为 current skill
acceptance；上述 digest drift 也不证明旧 round 的语义一定失效，只说明当前适用性不能直接继承。

## 5. 处置与 return

- 本轮只新增 applicability bookkeeping；不编辑 manifest、payload、input、output、logs、run identity、
  review 或当前 inbox source，不创建新 Run，不重算 semantic score。
- `planning-inbox` 继续作为 `.agents/skills/` incubation candidate；不移动到 `skills/`，不创建 runtime
  command、history clear、persistence、safe-point 或 acceptance mechanism。
- 若未来需要重开，必须同时恢复 named eval/runner owner、当前 candidate/source snapshot、完整
  model/harness/tool/permission/workspace/activation identity、独立 reviewer 和 fresh/superseding card；
  若目标转为真实 dogfood，还需明确 exposure window、consumer 和 adoption/regression owner。
- 若这些关系持续不可恢复，则保留本轮 `behavior-observed / boundary-supported / attribution-uncertain`
  历史记录；`planning-inbox` 继续 `retain-incubation`，仅当前 applicability/re-run 提案保持
  `no-proposal-now`，不为补齐 ledger 直接重跑。

## Independent review

`Plato`（Agent `01a0387b-f544-7aa1-ab7e-bbc7a3290609`）未参与本记录或 projection 的生产，完成两轮只读
复核；初轮要求限定 no-proposal scope，并明确 digest drift 只是机械 provenance drift，修订后 `final accept`。
复核确认 pre-run manifest status、历史 artifact chain、current source drift、runtime unknown 和 semantic
standing 已分开；run-identity 与 synthesis 没有被提升为 current matched/acceptance；`.agents/skills/` incubation
和 no-rerun/no-move 边界成立。该 review 不取得 skill、portable、WorkCell、DeepSeek 或实现授权。
