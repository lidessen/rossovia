# planning-inbox round 3 evidence applicability review

状态：`source-edge-match-observed / runtime-applicability-uncertain / current-source-applicability-uncertain /
independent-review-complete / acceptance-pending`；不是新 Run、matched improvement、portable move、skill
acceptance 或实现授权。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

## 1. 目的与范围

本记录只检查已有 `planning-inbox-round-3` old-vs-new candidate comparison 是否能从当前工作树回读
其 fixture、old/new snapshot、candidate、输入、运行产物、run identity、盲评、synthesis 与 protocol
关系。它不编辑 frozen manifest、snapshot、candidate、input、output、review 或当前 inbox source，
不启动新 Run。

round 3 本身不是 baseline/treatment；其 manifest 明确将 old snapshot 作为 rollback anchor，review
将当前处置写为 project-local incubation 的 `behavior-observed / adapt-and-observe`。本记录只补
post-freeze source/lineage/applicability projection，不改写该 round 的语义结果。

## 2. Frozen-to-current identity edges

| edge | recorded relation | current observation | result |
| --- | --- | --- | --- |
| candidate / new snapshot | `.agents/skills/planning-inbox/SKILL.md` 与 `evals/skill-evaluation/snapshots/planning-inbox-round-3.md`；recorded SHA-256 `53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e` | 两个 current raw file 均为 `53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e` | `source-edge-match-observed` |
| old snapshot | `evals/skill-evaluation/snapshots/planning-inbox-round-2.md`；manifest recorded `b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e` | current raw SHA-256 matches | `rollback-anchor-edge-match-observed` |
| round fixture | `evals/skill-evaluation/fixtures/planning-inbox-round-3.md`；manifest recorded `fb835264a699e36bee068407959b52ba415cda3fffd55c37f76a4cbe8bd57676` | current raw SHA-256 matches | `fixture-edge-match-observed` |
| protocol | `evals/skill-evaluation/protocol.md`；manifest recorded `2ebf8a54b51b968501c951fdae8d4a6d817c5b4e873f19dfdf65750e06afbf4e` | current raw SHA-256 matches | `protocol-edge-match-observed` |
| round2 source relation | round2 fixture and synthesis are referenced as old-arm lineage | current round2 fixture SHA-256 `fd4311fdc7bc72418ca20de919684d495ab5341c142ca992c9581698c531eeae` and synthesis SHA-256 `0f4421c49d4db46515bd8363ea4510991ac1bb37e9cb648b1ffce00a9e213f4e` match the round-3 manifest references | `historical-edge-match-observed` |
| old/new input artifacts | `inputs/planning-inbox-round-3/{A..E}-{old|new}.md`；run identity records ten input SHA-256 values | all ten current input hashes match the run identity table | `input-edge-match-observed` |
| old/new output artifacts | `runs/planning-inbox-round-3/{A..E}-{old|new}.md`；run identity records ten output SHA-256 values | all ten current output hashes match the run identity table | `output-edge-match-observed` |
| events and stderr | `runs/planning-inbox-round-3/logs/{A..E}-{old|new}.{jsonl,stderr.log}` | all ten JSONL and ten stderr artifacts are present and hash-match the run identity report; failed sandbox attempts remain separate | `run-artifact-edge-match-observed` |
| run identity | `evals/skill-evaluation/runs/planning-inbox-round-3/run-identity.md` | current raw SHA-256 `dbf3626de6de111990a1fc97adb74cd83f9a82b24291d0eef9c15b95d2248816`; file is present | `identity-record-present / runtime-identity-uncertain` |
| blind reviews | `reviews/planning-inbox-round-3-blind-review-A-C.md` SHA-256 `efbe6f943d834e23802bf9773285d2e271b244bf630be7605afcd418541baa35`; `...-D-E.md` SHA-256 `921cdaa72dc3a370c51919755067c88965a53f22f909981580cbb3cfb363480d` | both current review files and their mapping/synthesis are present and hashable | `review-edge-match-observed` |
| mapping / synthesis | `reviews/planning-inbox-round-3-mapping.md` SHA-256 `8bd80cad7af27364ce292920c4c0a4890d90ebb1544243700e5758dc2d82510e`; synthesis SHA-256 `28b1429e58c4933e0d9082f6e166e0fe0de5488e8ae44e5f5e059597750ca3e4` | current raw hashes match these recorded values | `review-edge-match-observed` |

The manifest itself is current SHA-256 `369bc1cfa0095dc33a22b229191be059b25907e2f0b025a6beae71a3c1edbefb`;
its status remains `frozen / not run`, while the run artifacts and reviews exist under the linked round
path. This is a pre-registered manifest state, not evidence that the manifest was updated after execution.
There is no separate freeze receipt recorded for this round; freeze immutability and append mechanism remain
`unknown`.

## 3. Current-source and runtime applicability

### Supported at file/artifact level

- The current candidate is byte-identical to the new-arm snapshot, and the old rollback snapshot remains
  byte-identical to the recorded old-arm value.
- Fixture, protocol, all ten input artifacts, all ten formal outputs, all ten event/stderr artifacts, run
  identity and the blind-review/mapping/synthesis chain are present and hash-reconstructible at file level.
- The failed sandbox attempts are distinguishable from the ten formal samples and are not mixed into the
  behavior or cost observations.
- The returned semantic observation can still be read: old/new both preserve the semantic floor; A is
  slightly old-favored, D slightly new-favored, and B/C/E are tied in the revealed blind mapping.

### Not supported

- The exact served model is not exposed; `gpt-5.6-luna` is only the request value. Full system/developer
  prompt, actual harness, permissions, candidate activation, fresh-context isolation, physical workspace
  isolation and direct process exit are unknown.
- The non-empty JSONL, `turn.completed` events and stderr sidecars establish artifact/process observations,
  not complete runtime identity or semantic activation.
- The current `planning/inbox.md` SHA-256 is `a599540fb483d76d6b5f5abe4772cc0f64fec40b9fc526ec04f5126db8b43545` and
  `planning/inbox-history.md` SHA-256 is `fb9265fd9301ac3e363d98840265463d963508ee9ec5c30d711f4f1e727ffa4d`;
  neither was recorded as a frozen round-3 source edge, so current-project source applicability is uncertain.
- `AGENTS.md` was recorded at SHA-256 `285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`,
  while the current raw SHA-256 is `1075e5f3e84003ee1fecb78db351fd01a168f3d18dd7611ff1db70057c4d499a`;
  the round manifest/run identity does not establish that the complete project instruction was visible or
  equal in both formal arms.
- The synthesis accepts project-local retain as a bounded planning disposition; it does not establish
  matched improvement, stable cost reduction, portable acceptance, adoption or regression.

Therefore the strongest current projection is:

```yaml
source_edges: match-observed-for-recorded-artifacts
artifact_chain: reconstructible-at-file-hash-and-event-level
runtime_applicability: uncertain
current_project_source_applicability: uncertain
behavior_standing: behavior-observed
boundary_qualifier: boundary-supported
attribution: uncertain
project_local_disposition: retain-as-project-local-incubating-candidate / adapt-and-observe
matched_improvement: not-supported
adoption: not-started
regression: unknown
acceptance: unknown
```

`source-edge-match-observed` is not `matched-improvement`; the file chain does not prove that the new
snapshot caused the observed old/new differences. `boundary-supported` is the protocol qualifier for the
limited semantic-floor/boundary observations; `retain-as-project-local-incubating-candidate / adapt-and-observe`
is a project-local planning disposition, not a protocol round disposition or acceptance.

## 4. Ledger and authorization boundary

- This is a post-freeze applicability record. It does not edit the manifest, snapshots, candidate, input,
  output, logs, stderr, run identity or reviews.
- No new Run is created. A new comparison requires a fresh card or explicitly superseding card, a named
  eval/runner owner, exact model/harness/workspace identity, activation/non-activation evidence, explicit
  source/inbox snapshot relation, and an independent reviewer.
- The round's existing project-local retain and `adapt-and-observe` disposition remain unchanged. This
  record does not convert them into `adopt`, `matched-improvement`, `regression-supported` or portable
  promotion.
- `planning-inbox` remains an incubating `.agents/skills/` candidate. There is no move to portable
  `skills/`, no new runtime command, no history clear, no goal/owner/priority expansion and no implementation
  authorization.
- If current-project source relation cannot be recovered, retain the historical round as source-edge
  observed plus current-applicability uncertain; do not rerun merely to make the ledger complete.

## 5. Return conditions

Reopen only when the next decision requires it and the following relations can be recovered:

1. named eval/runner owner and reproducible model/harness/workspace identity;
2. independent activation/non-activation proof and explicit visibility/isolation boundary;
3. frozen `planning/inbox.md` / `inbox-history.md` source snapshot or a new task source whose relation to
   current planning is explicit;
4. a fresh or superseding card that preserves old rollback lineage and separates old/new comparison from
   baseline/treatment claims;
5. an independent reviewer not involved in candidate production; and
6. a real dogfood exposure window before any adoption/regression claim.

If these do not appear, retain `behavior-observed / boundary-supported / attribution-uncertain`
and keep the candidate project-local. A later real inbox dogfood is the next semantic observation window;
cost non-improvement alone is not a semantic rollback.

## 6. 2026-08-25 current project-instruction drift correction

The current `AGENTS.md` differs from the round-3 recorded instruction snapshot. This confirms the existing
`current-project-source-applicability-uncertain` qualifier; it does not add a new semantic finding because
this round already separated recorded artifact edges from current project-source applicability. The correction
is bookkeeping only: retain the historical round, do not edit frozen artifacts, do not rerun, and do not treat
the prior `Hubble` final accept as acceptance of this later source observation. Reopen only with a fresh or
superseding card that freezes the current instruction and restores the runtime/activation/owner prerequisites.

## Independent review

`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）未参与本 applicability record 或其同步投影的生产，
完成两轮只读复核；最终结论为 `final accept`。复核确认 blind review hashes、`boundary-supported` canonical
qualifier、project-local disposition 与 protocol round disposition 的区分，以及 no-rerun/no-move/no-acceptance
边界均已修正。该 review 只接受 applicability record 的证据边界，不接受 skill、portable move、phase、runtime
或 implementation。

---
