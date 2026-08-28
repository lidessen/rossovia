# mechanism-design-review round 1：evidence applicability closure

状态：`source-drift-detected / historical-run-observed / partial-closure / independent-review-complete /
acceptance-pending`；不是新 Run、matched improvement、regression、candidate acceptance 或实现授权。

## 1. Scope and source edge

本记录检查已冻结的 `mechanism-design-review / round-1` 是否能按当前 trial protocol 完成历史
post-freeze ledger record，并检查 frozen upstream source 是否仍适用。它不修改 frozen card、candidate、
task、baseline、treatment 或既有 review，也不重跑模型。

| edge | 当前 artifact | 当前 hash / standing |
| --- | --- | --- |
| candidate → treatment | `.agents/skills/mechanism-design-review/SKILL.md` | `8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`；project-local candidate |
| task → baseline/treatment | `evals/skill-evaluation/inputs/mechanism-design-review-round-1/task.md` | `5c9e6dd9eba43271d2c4b3e7eec179d6c90eb2b8cfda15a1fbd095845890a743`；frozen task |
| card → round | `evals/skill-evaluation/manifests/mechanism-design-review-round-1.md` | `9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`；frozen |
| baseline output | `evals/skill-evaluation/runs/mechanism-design-review-round-1/baseline.md` | `404d5fe474c59812fe1c83fac9245f108017c7e130148bcb2c01a5412fbc7604`；output exists |
| treatment output | `evals/skill-evaluation/runs/mechanism-design-review-round-1/treatment.md` | `06bb51a936c7a8d47bdc6f17f0bd9f9c8381c479b19f339c173d5e73518c8f5b`；output exists |
| round review/projection | `planning/records/mechanism-design-review-round-1.md` | `6b0d758118b9d2460c73b4f40be471e4bca790b4e2908bd4fd3c6c60f38bacd4`；independent review recorded |
| frozen upstream protocol source | `design/work-cell-protocol.md` | frozen `25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272` → round-time current `26ec714f4e2eab0f7f80432b0c0d4a58211458a4016ef06ecd73315153e9640e`；该 edge 现为 pre-contract historical，`stale/uncertain` |
| frozen upstream lifecycle review | `planning/records/workcell-lifecycle-review.md` | frozen `841787451b4c238c357dd1a65aaa2155469c8e44f7ad74ad97aa06093cbff2c5` → current `defd78ec0f8bdaca9a9bad1f8dda96fe33af22a9d01d9f675e91927716ea0c90`；`stale/uncertain` |
| frozen upstream observation review | `planning/records/workcell-observation-lineage-review.md` | frozen `7b1e9ba2647d0ef9621149dbe51dc534a5edc607898ed62329cc1dd47541dd00` → current `4b7001ce08a3a0e7ae75237e2477e12d844c07baedd04c25f0bd0d3e9181f711`；`stale/uncertain` |
| frozen upstream open-relations review | `planning/records/workcell-open-relations-review.md` | frozen/current `39075760b3f1fcd96267cd230c47d10535d252ac45bc0957cd81d32ce4057bcc`；no drift observed |
| frozen theory source | `theory/harness/theory.md` | frozen/current `d755383ea024b0bff436ddce13aab171558a3993751918bebfceef85f252aff5`；no drift observed |

## 2. Applicability result

| protocol relation | current observation | closure consequence |
| --- | --- | --- |
| frozen card and candidate/task hash | recorded hashes match current files | round identity remains reconstructible at card/task/candidate file level |
| upstream source hash | protocol, lifecycle and observation review source hashes drifted; open-relations and theory hashes match | historical source edge is `stale/uncertain`; current applicability is not closed |
| baseline/treatment output | both artifacts exist and hashes are recorded | outcome can be cited; no output rewrite needed |
| model, system, runner, harness and full workspace identity | not independently verifiable; baseline/treatment used separate internal runners | base standing capped at `behavior-observed`; no matched attribution |
| activation / non-activation proof | treatment activation and baseline non-activation are not independently evidenced beyond run record/task context | candidate-specific causal claim remains `attribution-unknown` |
| discovery / fresh holdout / adoption-window / ablation | disabled in frozen card | no fresh, adoption or ablation claim may be added retrospectively |
| independent review | Jason review is recorded in the round planning record; reviewer did not produce runs | historical review standing is complete for bounded semantic review, not Principal acceptance |
| append-only mechanism / immutable storage | not independently verifiable for current ledger | ledger closure records `unknown`; prose does not create immutability |

## 3. Evidence closure

The round can be recorded as a historical post-freeze record with these bounded claims:

- baseline and treatment both returned the three case-level recommendations; M2/M3 preserve useful
  negative/nearest-owner boundaries, while treatment expression is more complete in places;
- the result supports `behavior-observed` and local `boundary-supported`, with `attribution-unknown`;
- round disposition remains `adapt-and-retest`; carrier disposition remains `rewrite + retain-incubation`;
- no `matched-improvement`, `regression-supported`, adoption, Principal acceptance, WorkCell acceptance,
  runtime mechanism, registry, queue, permission change or implementation authorization follows;
- the next return remains source recovery or a separately controlled future round with named consumer/
  owner-backed fixture, not a retrospective claim about the existing round.

This is `historical-run-observed / source-drift-detected`, not `current-applicability-closed` or
`current-behavior-accepted`: the historical artifacts are present, but three upstream source edges, runtime
identity and causal isolation are incomplete.

## 4. Disposition and reopen

| field | value |
| --- | --- |
| ledger closure disposition | historical record + `stale/recovery` entry; existing round `adapt-and-retest` is preserved, not a new evaluation decision |
| current candidate disposition | `rewrite + retain-incubation` |
| acceptance owner | `unknown` |
| next round trigger | recovered source snapshot plus named replay/consumer owner, owner-backed normal/duplicate/out-of-order/gap/post-restart fixture, reproducible full runner/model/harness/workspace identity, activation/non-activation proof, protocol/record-retention owner and independent review |
| stale trigger | the three observed upstream hash drifts, or any further candidate/card/task/source interpretation change; retain old artifacts and open a new recovery/round relation |
| prohibited action | no rerun merely to fill ledger, no edit of old card/Run/review, no WorkCell/DeepSeek/base implementation |

## 5. Stale/recovery relation

The observed drift affects the interpretation edge `upstream WorkCell source → frozen task/card → baseline /
treatment`; it does not rewrite the historical output hashes or Jason review. Until a recovered source snapshot
and new card are frozen, the old round remains historical evidence with `behavior-observed / boundary-supported /
attribution-unknown`, not current applicability evidence.

## 6. Independent review boundary

## 6. Independent review

reviewer：`Lagrange`（Agent `01a0388c-2464-7191-b316-3315649d9228`），未参与本记录生产，未修改文件，
未运行评估。初轮指出三条 upstream source drift、ledger envelope 缺口和 next owner 不完整；修订后
复读接受。复核确认 hash/source edge 的 stale/recovery、`behavior-observed` 与 `attribution-unknown`
分开、旧 `adapt-and-retest` 未被改写成新 acceptance，以及 append/immutability 的 unknown 均被保留。
reviewer 不拥有 Principal acceptance、candidate move 或 implementation authorization。
