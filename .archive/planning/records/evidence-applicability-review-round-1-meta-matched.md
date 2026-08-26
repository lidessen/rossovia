# round-1 meta-matched historical evidence applicability review

状态：`historical-chain-observed / source-applicability-uncertain / runtime-applicability-uncertain / independent-review-complete / acceptance-pending`；不是新 Run、matched improvement、skill acceptance、portable move、WorkCell acceptance 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 对象、来源与允许范围

本记录只检查 `evals/skill-evaluation/round-1-meta-matched-*` 的 F1 历史 baseline/treatment/review
是否能从当前工作树恢复 source、candidate、fixture、运行身份和当前适用性。它不重新评估七个 skill，
不修改历史 output/review，不把历史评审的 `boundary-supported` 或 `no-proposal` 提升为当前接受。

历史对象：

- baseline：[`round-1-meta-matched-baseline.md`](../../evals/skill-evaluation/round-1-meta-matched-baseline.md)
- treatment：[`round-1-meta-matched-treatment.md`](../../evals/skill-evaluation/round-1-meta-matched-treatment.md)
- historical review：[`round-1-meta-matched-review.md`](../../evals/skill-evaluation/round-1-meta-matched-review.md)
- shared fixture：[`round-1.md`](../../evals/skill-evaluation/fixtures/round-1.md)
- candidate named by the treatment：`skill-formation`

当前允许效果到 source/lineage/applicability bookkeeping、历史 standing projection 和 reopen
condition；不创建 Run、修改 manifest/fixture/output、重跑模型、移动 skill 或打开 WorkCell/DeepSeek/base。

## 2. Source edge reconciliation

### 2.1 Historical hashes and current observations

| edge | historical record | current observation | current result |
| --- | --- | --- | --- |
| `theory/philosophy.md` | baseline records `0510374b618446899f6ecbabcbfbcfdfbf97d5281ba9ffa9418f1f0ff37af1e3` | current SHA-256 is `0510374b618446899f6ecbabcbfbcfdfbf97d5281ba9ffa9418f1f0ff37af1e3` | `source-edge-match-observed` |
| `theory/gene-expression.md` | baseline records `2dc1e1aad03593c22e7c106d103763bbe6e0044d08a68304f506ad8253b067ff` | current SHA-256 is `cfb81dd540906e43bd3ea722f2cca6360e3ad57beae10056652336f19538a084` | `source-edge-drift-observed` |
| `theory/harness.md` | baseline records `d755383ea024b0bff436ddce13aab171558a3993751918bebfceef85f252aff5` | historical path is absent; `theory/harness/theory.md` exists with SHA-256 `d755383ea024b0bff436ddce13aab171558a3993751918bebfceef85f252aff5` | `path-edge-drift / content-hash-match-observed` |
| shared F1 fixture | historical files cite F1 from the Round 1 fixture family | current `evals/skill-evaluation/fixtures/round-1.md` SHA-256 is `5968f8b7a555f487725aefe2669ee6744e7e17ff22d7757d1c390463cb505b0c` | `fixture-current-edge-not-frozen-in-historical-record` |
| evaluation protocol | historical review cites `protocol.md` but does not preserve a protocol hash | current `evals/skill-evaluation/protocol.md` SHA-256 is `2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e` | `protocol-edge-unreconstructible` |
| candidate | treatment says it loaded `skill-formation`; no candidate hash or activation receipt is recorded | current `.agents/skills/skill-formation/SKILL.md` SHA-256 is `19b55a89021d0b9b046478681e4bb077bbf496f5772f79ce31d668f41fbb2df6` | `candidate-edge-unreconstructible` |

The moved harness path must not be treated as a current applicability proof merely because its content hash
matches the historical value. The missing historical path, changed gene-expression source, absent fixture/protocol
freeze relation and missing candidate hash jointly prevent a current-source claim.

当前三个历史 artifact 文件本身的 SHA-256 为：baseline
`3f47ef9ed217820e3f9ee35d1053c1f22e9ae39be8a70374b7bde1abe4030c5c`、treatment
`12adc821c57691fac76ec5db6c1844b8dd5e347b99fdb5e9264dcc72322d1030`、review
`2b9b395d891ee101b22e061d5094348a4f812c91e5289e2ec67732e9c30dc996`。这些 hash 只能证明当前文件可回读，
不能证明当前文件就是历史运行时读取或生成的 immutable artifact；历史记录没有保存对应的 frozen artifact hash。

此外，当前 protocol 的历史身份段保存的 frozen source 是 `gene-expression =
7f390fdf339176bbc92e7427887aca9341e9187aadb819143326691f7c56079f`、`theory/harness/theory.md =
f4087fa0dd09d0989b3aef1194e53049639fbaaac270b656a2cd9834f40f5db8`；它们都不同于本 round baseline 文本中
记录的 `2dc1…` 与 `d755…`。因此本 round 的 source 关系不仅是当前 source drift，还包括历史 round 与 protocol
冻结身份未能相互重建。`evals/skill-evaluation/trial-manifest.md` 只是模板；当前没有对应的
`round-1-meta-matched` frozen manifest/card。

### 2.2 Artifact and ledger edges

The baseline, treatment and review files are present and readable. The historical record does not provide a
separate run identity containing model, system/developer prompt, harness, tool/permission, workspace, activation
or process-exit evidence. `evals/skill-evaluation/trial-ledger.md` has no dedicated `meta-matched` post-freeze
entry that can reconnect those files to a frozen card and runtime identity.

This supports `historical-chain-observed` at file/content level only. It does not support that the treatment
loaded the current candidate, that baseline and treatment were matched, or that the historical review was run
under the current project authority.

## 3. Historical result and evidence ceiling

The historical review itself reports that both arms selected the same four nearest owners and that the treatment
did not change the core decision. It also reports insufficient matching and recommends `no-proposal` for a
skill-formation design change from that round. Those are historical observations bounded by the old source and
review context.

The current projection is therefore:

```yaml
historical_artifact_chain: present-at-file-level
historical_base_standing: behavior-observed
historical_qualifier: boundary-supported
qualifier_source: round-1-meta-matched-review
attribution_to_skill: not-supported
historical_matched_improvement: not-supported
current_source_applicability: uncertain
runtime_identity: unknown
candidate_activation: unknown
current_skill_acceptance: unknown
portable_promotion: not-supported
```

The historical result cannot be used to claim either that current `skill-formation` is accepted or that it is
invalid. It only closes the stronger claim that this old round can support current matched/portable evidence.

## 4. Current disposition and owner boundary

| object | current disposition | owner / next decision |
| --- | --- | --- |
| historical meta-matched artifacts | `historical-only / hold / no-proposal-now` for current applicability | evidence-maintenance owner `unknown`; preserve artifacts and lineage limitation |
| current `.agents/skills/skill-formation/` carrier | unchanged `retain-incubation / portable-no-proposal` | authority [`planning/index/skill-migration.md`](../index/skill-migration.md:44) records consumer `project Agent discovery / evaluation fixture`, external consumer `unknown`, standing `format-valid / behavior-observed`, matched not established；migration/acceptance owner `unknown` |
| new matched round | not proposed now | named eval/runner owner and current consumer must first restore a reproducible card |

`no-proposal-now` closes only the current applicability/reuse proposal. It does not delete the historical
artifacts, revoke the carrier, or decide the long-term value of the method.

## 5. Reopen and stage-exit conditions

Reopen only when the next decision requires the evidence and all material edges can be rebuilt:

1. a named eval/runner owner and named current consumer;
2. a fresh or superseding card with current source snapshots, candidate hash, fixture hash and protocol hash;
3. full model, harness, tool/permission, workspace and process identity;
4. explicit baseline non-activation and treatment activation proof;
5. a reviewer independent of production, with a current review artifact and acceptance owner;
6. a case whose result can change admission, route, disposition or migration choice.

If any item is missing, retain the historical chain and do not rerun merely to fill the ledger. A future round
must not edit or back-write these historical files; any new interpretation must be recorded in a separate
applicability or ledger record.

The evidence-maintenance stage exit is not “all old runs are current”; it is that each potentially reused round
has an explicit current/stale/historical/uncertain disposition and a source/consumer/owner-based reopen relation.
This record closes that relation for the round-1 meta-matched F1 artifacts while leaving current skill acceptance
pending.

## Independent review

独立 reviewer：`Dewey`（Agent `01a0394d-c4ad-7e10-a91d-68a232d7ba24`），未参与记录生产，也未修改文件；
复读 verdict：`accept`。复核确认三个历史 artifact hash、protocol frozen source 的三方关系、缺失
frozen manifest/card、canonical standing 拆分、current skill-migration 引用和 no-rerun/no-move 边界均可回读。
该 verdict 只接受 applicability bookkeeping，不接受 skill、历史 round、portable move、WorkCell、DeepSeek
Harness 或 implementation。
