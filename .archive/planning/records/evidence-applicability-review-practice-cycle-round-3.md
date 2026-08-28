# practice-cycle round 3 evidence applicability review

状态：`source-edge-drift-observed / runtime-applicability-uncertain /
current-project-instruction-applicability-uncertain / historical-independent-review-complete /
correction-acceptance-pending`；不是新 Run、matched improvement、regression、skill acceptance、portable
move 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 目的与范围

本记录只检查已有 `method-probe-round-3-practice-cycle` frozen comparison 是否仍能从当前工作树
回读其 card、candidate、task、AGENTS、baseline/treatment、run identity、review 和既有 ledger
关系。它不修改 frozen card、skill、Run output、review 或 source，也不启动 round 4。

当前 round 的语义结果仍由 [`method-skill-probe-round-3.md`](method-skill-probe-round-3.md) 和
[`method-skill-probe-round-4-precondition-review.md`](method-skill-probe-round-4-precondition-review.md)
拥有；本记录只补 applicability/lineage projection。

## 2. Frozen-to-current identity edges

| edge | frozen / ledger reference | current observation | result |
| --- | --- | --- | --- |
| candidate | `.agents/skills/practice-cycle/SKILL.md`；frozen raw SHA-256 `0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf` | current raw SHA-256 `0bbfc4294e8452b338ce7d759a0f97c1c4fcec6609577e6d96d1cff234bb21cf` | `source-edge-match-observed` |
| core card | `evals/skill-evaluation/manifests/practice-cycle-round-3.md`；recorded SHA-256 `2df7340f84fbc8931230e5e0c482f6da00502ed8b95bb17156ec4d2e52f95479` | current raw SHA-256 `2df7340f84fbc8931230e5e0c482f6da00502ed8b95bb17156ec4d2e52f95479` | `card-edge-match-observed` |
| task fixture | `evals/skill-evaluation/inputs/method-probe-round-3/practice-cycle-task.md`；card/ledger `39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c` | current raw SHA-256 `39f09f155ad0fb02cca61f268d2b186a437ce2b1a65d811ee56b312d56dbc15c` | `task-edge-match-observed` |
| project instruction | `AGENTS.md`；card recorded SHA-256 `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379` | current raw SHA-256 `1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a` | `instruction-edge-drift-observed / current-applicability-uncertain` |
| freeze receipt | `evals/skill-evaluation/runs/method-probe-round-3/practice-cycle-freeze.md` | artifact exists; current raw SHA-256 `1c12868ea8098c647978ed5d2d590f9b4dadf91bfc86ac8878d12097a33ee1d7` was not recorded as a prior ledger snapshot | `artifact-present / immutable-freeze-unknown` |
| baseline output | `.../practice-cycle-baseline.md`；ledger SHA-256 `11ba07b36f374bdfb14de418b09b25774ca362635f4fe4aaf6feeb7fcd42bd8b` | current raw SHA-256 matches ledger | `output-edge-match-observed` |
| treatment output | `.../practice-cycle-treatment.md`；ledger SHA-256 `63bc414892e13d6453d4a658c24969583a2b24e1d05e4b188e54a396a271da81` | current raw SHA-256 matches ledger | `output-edge-match-observed` |
| run identity | `.../run-identity.md` | current raw SHA-256 `f794586c03f2250c21b6d56d3b09eebc0d5fee29459fb12fece5f5f49f208047`; file records distinct internal runners and exact runtime identity `unknown` | `record-present / runtime-identity-unknown` |
| independent review | `.../method-probe-round-3-practice-cycle-review.md`；ledger SHA-256 `8e4a89ffaef5f532b1a6e8557259a7d8669b561cfb93d4a5b1c95e1093080088` | current raw SHA-256 matches ledger; review standing is independent but not acceptance | `review-edge-match-observed` |
| planning projection | [`method-skill-probe-round-3.md`](method-skill-probe-round-3.md) and round-4 precondition review | current records retain `behavior-observed / attribution-uncertain / adapt-and-retest`; they are current planning projections, not frozen Run evidence | `projection-current / acceptance-pending` |

## 3. Applicability result

### What is supported

- Candidate, card and task source edges still match the recorded frozen values; the project-instruction edge
  no longer matches and is now separately marked as current-applicability uncertain.
- Baseline/treatment output artifacts and the independent review artifact are present and hash-match the
  existing ledger entries.
- The existing returned behavior can still be read: Case A both routes to direct closure; Case B baseline
  chooses a narrower route while treatment chooses a broader continue/discovery branch.
- The existing round disposition remains `adapt-and-retest`; the carrier remains project-local
  `retain-incubation`.

### What is not supported

- The current checks do not prove same runner/model/harness/workspace identity: the two runner identities are
  distinct, and exact runtime identity remains `unknown`.
- Candidate activation and baseline non-activation are recorded as instructions/self-report, not runtime
  proof; process-level role visibility and isolation remain `unknown`.
- `excluded_actions` and top-level unknown field shapes differ between outputs; the existing review correctly
  treats this as a schema defect, not a semantic match.
- Freeze immutability/append-only ledger mechanism, acceptance owner, adoption exposure, fresh holdout and
  regression window remain `unknown` or disabled.

Therefore the strongest current conclusion is:

```yaml
source_edges: recorded-card-candidate-task-output-edges-match
project_instruction_edge: drift-observed
artifact_chain: reconstructible-at-file-hash-level
runtime_applicability: uncertain
current_project_source_applicability: uncertain
behavior_standing: behavior-observed
attribution: uncertain
round_disposition: adapt-and-retest
carrier_disposition: retain-incubation
matched_improvement: not-supported
adoption: not-started
regression: unknown
acceptance: unknown
```

`source-edge-match-observed` is not `matched-improvement` and does not establish that the treatment caused
the Case B difference.

## 4. Ledger / disposition boundary

- This is a post-freeze applicability record; it does not edit the card, candidate, task, raw outputs or
  prior review.
- No new Run is created. A rerun only becomes eligible after a named eval/runner owner supplies exact
  model/harness/workspace identity, activation/non-activation proof, a unified schema and a fresh card.
- The existing `adapt-and-retest` remains the round disposition. The current applicability check does not
  change it to `adopt`, `retain-baseline`, `rollback` or `no-proposal`.
- `practice-cycle` remains `.agents/skills/` incubation. There is no portable move, acceptance, adoption or
  implementation authorization.
- The planning owner may route the preconditions to an eval/runner owner; it may not fill those fields with
  Main self-report.

## 5. Return conditions

Reopen only when all decision-changing prerequisites are recoverable:

1. named eval/runner owner and reproducible runner/model/harness/workspace identity;
2. treatment activation and baseline non-activation evidence independent of self-report;
3. one schema version with identical field names/types and explicit missing-value semantics;
4. a narrower Case B and a fresh card that supersedes, rather than edits, round 3;
5. independent reviewer not involved in production; acceptance owner may remain `unknown`, but then the
   result remains `acceptance-pending` and cannot enter adoption/regression;
6. after acceptance, a real exposure set/window for regression; absence of exposure is `unknown`, not zero
   regression.

If these prerequisites cannot be supplied, retain the current behavior observation and close only the
matched-probe branch as `no-proposal-now`; do not delete the candidate or historical evidence.

## 6. Independent review

`Lagrange`（Agent `01a0388c-2464-7191-b316-3315649d9228`）未参与 round 3 production、ledger entry
production 或本记录生产，完成独立 review，结论为 `accept`：未发现 SHA-256、source-edge 与
matched/causal attribution 区分、unknown、disposition/no-rerun 或授权边界问题。

reviewer 不拥有 skill acceptance、adoption、regression、phase transition 或 implementation authorization。

## 7. 2026-08-25 current project-instruction drift correction

当前 `AGENTS.md` 的 raw SHA-256 是
`1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`，而 frozen round 3 card 记录的是
`285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`。当前 diff 改变了 planned-reading
inventory 的描述，以及 archive 迁移/move 的 source、consumer、boundary review 约束；因此不能继续把
project-instruction edge 写成当前 match。这只改变本记录的 current applicability projection，不重写 frozen
card、freeze receipt、Run、review 或既有行为观察，也不证明该 round 的语义行为已经改变。

本次 correction 的处置为：`source-edge-drift-observed / retain-historical-round / no-rerun-now /
route-to-owner`。允许更新本记录及相关 current planning projection；禁止编辑 frozen artifacts、重跑旧
round、将 drift 提升为 matched/adoption/regression，或以本 correction 取得 acceptance。原有
`Lagrange` review 只覆盖 source edge 尚未漂移时的 applicability record；不覆盖本节 correction。

只有新或 superseding card 重新冻结当前 `AGENTS.md`、并同时恢复 named eval/runner owner、runner/model/
harness/workspace identity、activation proof、统一 schema 和独立 reviewer 后，才可重新判断当前适用性。
