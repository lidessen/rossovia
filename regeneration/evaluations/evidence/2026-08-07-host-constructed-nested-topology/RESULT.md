# Host-constructed nested topology development result

**Status:** one mechanically comparable repetition and independent
label-masked semantic review complete
**Packet:** `9148029ebc2a4bd792b804505482a98c272f9e8b47f169c66ce8d348d50dd919`
**Scope:** information topology and reconstruction cost, not native autonomous
re-delegation or a general comparison of single- and multi-Agent systems

## Result

The direct Cell passed semantic review. The nested parent did not: it repaired
the adapter relation correctly but failed to carry the exact case-07 defect
from the child report into its final findings.

| Measure | Direct | Nested child + parent | Nested / direct |
| --- | ---: | ---: | ---: |
| Label-masked semantic disposition | accepted | rejected | not equivalent |
| Duration | 42,770 ms | 58,443 ms | 1.37× |
| Input tokens | 9,147 | 21,853 | 2.39× |
| Output tokens | 5,701 | 7,792 | 1.37× |
| Total tokens | 14,848 | 29,645 | 2.00× |
| Cached input tokens | 1,920 | 8,832 | 4.60× |
| Estimated API cost | $0.00261344 | $0.00402943 | 1.54× |

The complete three-Cell repetition used 44,493 tokens and an estimated
$0.00664287. The packet forecast 12,000 tokens across all three Cells, so the
actual total was 3.71× the forecast. Every per-Cell forecast also exceeded its
declared ±100% audit tolerance: direct 2.97× forecast, child 2.30×, and parent
5.69×. No budget decision point fired because estimated tokens are audit data,
not a stop condition, and the Cells remained within their step/time budgets.

The parent needed two structured-settlement attempts after omitting the
required per-finding `smallestCorrection` field in its first payload. That
repair contributed to cost, but it does not explain the semantic rejection:
the final schema-valid result still omitted the exact case-07 defect.

## Mechanical validity

All three Cells:

- used `ai-sdk-v7/deepseek/deepseek-v4-flash` with backend fingerprint
  `fp_a18b46594c_prod0820_fp8_kvcache_20260402`;
- produced schema-valid structured output;
- left Work Cell diffs empty; and
- retained identical host-side before/after workspace-tree hashes.

The raw run is under [`development-02/`](development-02/), and the independent
disposition is in
[`LABEL-MASKED-REVIEW.md`](LABEL-MASKED-REVIEW.md). The earlier
[`development-01`](development-01/summary.json) transport failure used zero
tokens and did not start the nested arm.

## What failed

The source split itself was mechanically sound: child and parent raw-source
sets were disjoint and covered the direct Cell's nine files exactly. The child
returned the protocol and case relation. The parent, however, was instructed to
reconstruct claims against parent-visible implementation evidence while the
two raw child sources were intentionally absent. It therefore treated the
case-07 claim as merely plausible and withheld it from the material findings.

The failed relation is not simply “nested delegation.” It is **evidence
admission across a compressed handoff**: a child report that is schema-valid
but not explicitly admissible as source evidence may remain conversational
context rather than become a load-bearing premise in the parent's whole-task
judgment.

## Bounded conclusion

For this small, densely related compatibility task, direct inspection dominated
the tested nested topology on semantics, tokens, duration, and estimated cost.
Do not advance this exact topology to the harder migration fixture, and do not
infer that all nested delegation is harmful from one repetition.

The next discriminating probe should reuse the frozen child output and direct
baseline, then run one parent-only treatment of the hypothesis that explicitly
describing how a schema-valid retained child report may serve as bounded
evidence—while still requiring exact source claims, hashes or source paths,
uncertainty, and final parent ownership—will preserve the missing relation.
This is not yet a requirement. If that parent still omits case 07, the report
form or source partition—not merely the admission wording—is the next suspected
cause. If it recovers the case without approaching direct cost, repeat before
changing durable guidance.
