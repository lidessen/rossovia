# Matched parent evidence-admission result

**Status:** mechanically comparable matched pair and label-masked independent
semantic review complete
**Packet:** `d79607a12fcc334117c62f6115eeef98609235f894c372980b98468538d1cffa`
**Execution order:** treatment, then control
**Semantic key:** A = control, B = treatment

## Result

The fresh control and treatment parents both found the principal adapter
defect. Only the treatment fully recovered the exact case-07 relation: failed
plus non-retryable requires expected `kind: "failed"` while retry remains
`"none"`. The control treated the child claim conditionally and omitted the
unchanged retry relation. The independent reviewer selected treatment with
high confidence (`0.97`).

This paired observation supports explicit bounded evidence admission as a
decision-changing parent instruction. It does not establish a stable general
policy: the fresh control did better than the old control, showing provider-run
variance remains material, and one pair cannot estimate a reliable effect
rate.

| Measure | Direct baseline | Reconstructed control | Reconstructed treatment |
| --- | ---: | ---: | ---: |
| Semantic disposition | accepted | partial | accepted / preferred |
| Total tokens | 14,848 | 30,944 | 35,731 |
| Serial duration | 42,770 ms | 64,690 ms | 82,151 ms |
| Estimated API cost | $0.00261344 | $0.00384772 | $0.00460475 |

The reconstructed treatment used 2.41× the direct tokens, 1.92× the duration,
and 1.76× the cost. Relative to reconstructed control, treatment used 15.5%
more tokens, 27.0% more duration, and 19.7% more cost. The stronger instruction
improved semantic completeness but did not make delegation efficient for this
small, densely related task.

The two new parent calls together consumed 52,897 tokens, 118,885 ms, and an
estimated $0.00662953. That was 22.4% above the 43,213-token historical planning
forecast. The contract's summed 8,000-token estimate was retained only as an
audit field and was not treated as a credible forecast.

## Integrity

Preflight hash-pinned the fixture, frozen child output, old control and
treatment records, current runner and rubric, and Work Cell source tree. After
masking instruction four and non-semantic runtime/workspace identifiers, both
fresh parent contracts had the same SHA-256:

`67d915b60eab086165d2a2985f8763a850182b1208bdb455e6fe55e0aa465613`

The runner persisted randomized order before either call. Both arms used
`ai-sdk-v7/deepseek/deepseek-v4-flash`, reported the same backend fingerprint,
produced schema-valid output, and left identical before/after read-only
workspace trees. It emitted a review packet only after both passed mechanical
admission. Raw records are under [`development-01/`](development-01/), and the
independent disposition is in
[`SEMANTIC-REVIEW.md`](SEMANTIC-REVIEW.md).

## Revised judgment

The evidence supports a narrow mechanism: when a parent must integrate an
exact claim from raw sources intentionally delegated out of its context, the
handoff needs an explicit evidence status. “Bounded source report” alone may
leave the claim as a lead to be rechecked; explicitly admitting exact retained
source claims lets the parent use them as premises while still withholding
semantic verification and acceptance authority.

Do not promote the current wording as a universal incantation. Preserve the
relation instead: source scope and lineage, which exact claims are admissible,
what uncertainty remains, and who retains judgment. Prefer direct inspection
when the source set is small and densely coupled. A future replication is
useful only if durable guidance needs an effect-rate estimate or a different
fixture tests whether the relation generalizes; it is not required to add more
harness machinery now.
