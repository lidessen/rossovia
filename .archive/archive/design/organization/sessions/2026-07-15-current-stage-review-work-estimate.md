# Work Estimate — Current Stage Independent Review

**Status:** completed — corrected rerun retained and preparation-verified
**Decision horizon:** mission
**Current state and sources:** [review packet](2026-07-15-current-stage-review-packet.md)
at target `d66a125`; deterministic checks pass, semantic review remains open
**Target state / decision:** enough independent evidence to decide whether to
open one integration PR or return a named partition
**Estimator:** work-estimation in the authorized preparation session
**Human approver if an external model run follows:** Principal

## Principal Decision Brief

**Recommendation: A — run one full-scope, read-only Work Cell reviewer, then
commission a second targeted reviewer only if a material finding or coverage
gap names the need.** This preserves cross-partition context without paying for
several identical full-repository reads.

| Key | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|
| **A — one full review, targeted follow-up** | Execute one schema-bound reviewer over the packet and target repository; audit actual use afterward. | One perspective may miss a defect; open a second review only when the first report, low read coverage, or verification identifies a concrete blind spot. |
| B — three full reviewers now | Run separate runtime, methods, and public/operations reviewers, then synthesize. | Higher perspective diversity but repeats shared context and substantially increases token use before a disagreement exists. |
| C — no external reviewer yet | Retain the present self-review and mechanical evidence only. | No additional model cost, but the integration mission cannot claim independent AI review readiness. |

**Your reply:** `A`, `B`, `C`, or `explain <key>`.

The Principal selected **A** on 2026-07-15. The first invocation was spent but
did not settle W2; it is retained as a failed run observation rather than
silently treated as either a review or a zero-cost attempt. After the runtime
repair and revised conversion estimate, the Principal authorized one corrected
rerun. That run settled W2, and the preparation group completed W3 by verifying
or rejecting every material claim.

## Necessary work graph

| Node | Required transition | Depends on | Acceptance observation | Omit only if |
|---|---|---|---|---|
| W1 packet | Turn the 202-file stage into four source-linked review partitions with explicit impact routes and exclusions. | fixed target SHA and branch/worktree audit | reviewer can locate owners and inspect beyond the diff without broad enumeration | never for this stage; completed by the linked packet |
| W2 independent content review | Test design/runtime/method/public coherence and produce exact risk-ranked findings. | W1, read-only repository access, structured completion | required output is submitted with source locations, partition dispositions, and limitations | Principal explicitly accepts option C |
| W3 preparation verification | Reproduce every material finding, map it to current checks/PR gates, and reject unsupported reviewer claims. | W2 | every finding has confirmed evidence or an explicit rejected/uncertain disposition | no findings and coverage evidence is adequate |
| W4 correction branch | Change only a named owner and rerun affected plus baseline checks. | a confirmed blocking W3 finding | defect no longer reproduces and no new partition drift appears | no confirmed blocker |
| W5 integration brief | Present open-PR / return / hold options without granting merge authority. | W2–W4 settled | Principal can choose the immediate PR action without reconstructing evidence | mission returns before PR preparation |

## Discovery branches

| Branch | Smallest discovery work | Opens when | Closes when | Later work made eligible |
|---|---|---|---|---|
| D1 targeted second review | Give one new reviewer only the disputed partition plus its named upstream/downstream routes. | first reviewer reports a material uncertainty, misses a required partition, or its read evidence is too shallow | the disputed claim has an independent disposition | W3/W4 or confident integration brief |
| D2 supply-chain follow-up | Inspect the two npm install-script packages and current npm policy. | reviewer or CI evidence shows the warning changes reproducibility/security decision | explicit allow/deny/no-change evidence exists | a separate dependency-policy correction |
| D3 CLI AX correction | Reproduce and define the desired subcommand-help contract. | the current integration depends on discoverable subcommand help or repeated user failure appears | one public behavior and test are accepted | later bounded CLI mission |

## Resolution and tolerances

- **Structural tolerance:** every partition and its cross-partition route must be
  covered; individual research files may remain unread when their owning
  boundary and representative callers/tests are inspected.
- **Forecast tolerance:** no calibrated P50/P80/P95 exists. Use a broad execution
  estimate, then audit actual input/output/read volume; do not treat variance as
  runtime failure.
- **Decision tolerance:** one reviewer is enough to decide whether a targeted
  second view is necessary, but not enough to claim universal correctness.
- **Control tolerance:** no task-time token hard cap is proposed. Provider
  context, step, duration, read-only workspace, and required terminal submission
  remain execution bounds; continuation after failure returns to the Principal.
- **Calibration tolerance:** compare only with prior repository review/skill
  probes, whose tasks and loader surfaces differ materially.

## Conversion handoff

- **Required executor profile:** one economical model capable of repository
  reasoning, structured output, tool use, and a context window large enough for
  selective inspection; `deepseek-v4-flash` through the existing AI SDK driver
  is the prepared default.
- **Comparable observations and limits:** recent selective design probes used
  roughly 34k–60k total tokens; a natural-trigger workflow probe reported 207k
  input tokens but was polluted by global-skill loading. Neither is a calibrated
  reference class for this 202-file review.
- **Execution projection:** start with `estimatedTokens: 90000` and a declared
  `estimatedTokensTolerance: 1.0` for audit. This is not a hard cap or a promise;
  a material overrun triggers context-path analysis before any rerun.
- **Execution shape:** one read-only Cell with the review packet, full target
  repository read access, a strict output schema, and a required
  `submit_review` terminal tool. Do not expose write paths or commands.
- **Budget Envelope authority:** Principal. The first invocation and one
  corrected rerun were separately authorized. D1 still requires a new
  evidence-based continuation decision and was not opened.

## First-invocation audit

The [failed-run observation](../../../chronicle/records/2026/07/obs-20260715-current-stage-review-output-recovery-failure.json)
reconciles the source run record with its trace:

| Observation | Result |
|---|---:|
| Main-loop steps | 40 |
| Files read / listings | 69 / 10 |
| Reconstructed input | 3,273,963 tokens |
| Cached input | 3,029,760 tokens |
| Output | 7,469 tokens |
| Reconstructed total | 3,281,432 tokens |
| Forecast variance | 36.4604× the 90,000-token estimate |
| Estimated cost at retained price revision | USD 0.044763 |
| Retained review | no |

The material variance is explained: the 90k projection treated repository
context approximately as a one-time amount, while a tool loop bills the growing
prompt again on every step. DeepSeek cache hits kept the monetary conversion
small, but cache does not make cumulative input disappear from the audit. A
runtime defect then read structured output from the main loop after the
recovery loop had called `submit_review`; because the parse error happened
outside the usage-carrying boundary, the settlement record incorrectly showed
zero tokens. Commit `d66a125` makes recovery inherit the output schema, selects
the recovery output, and retains observed usage on final parsing failure. The
full Work Cell suite now passes 69 tests and 300 assertions.

For an unchanged rerun shape, use the observed **3.3M cumulative tokens**, about
**100 seconds**, and roughly **USD 0.045** as the single-observation conversion
baseline—not as a hard cap. The underlying review workload has not become 36×
larger; the corrected number accounts for iterative context transport.

## Corrected-rerun audit

The Principal-authorized corrected rerun settled `passed` with both terminal
and structured-output verification:

| Observation | Result |
|---|---:|
| Main-loop steps | 25 |
| Files read / listings | 59 / 8 |
| Input / cached input | 1,626,189 / 1,412,864 tokens |
| Output / total | 7,654 / 1,633,843 tokens |
| Revised-estimate ratio | 0.495104 of 3.3M |
| Duration | 79.272 seconds |
| Estimated cost | USD 0.035965 |

The [successful-run receipt](../../../chronicle/records/2026/07/obs-20260715-current-stage-independent-review-rerun.json)
also preserves the report's limitations. Four of six findings retracted
themselves, the alleged partition-C blocker was false, and the raw final
recommendation conflicted with its partition disposition. Preparation
verification rejected the blocker through target-tree evidence and a fresh
site build, confirmed one low-risk CLI AX residual, and found no
decision-changing defect. W4 is therefore omitted; W5 is now eligible.

## Reopening observation

Re-estimate if a later reviewer cannot inspect all four partitions within its
context, if a confirmed finding requires code changes across more than one
partition, or if an altered execution shape changes the observed cumulative
context transport. No further reviewer is presently required or authorized;
D1 remains closed because direct verification resolved the disputed claim.
