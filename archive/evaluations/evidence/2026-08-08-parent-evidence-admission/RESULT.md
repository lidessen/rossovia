# Parent evidence-admission treatment result

**Status:** one mechanically comparable parent-only treatment and independent
semantic review complete
**Packet:** `9ba88eafa2bf9c16e7dcf5208fed6e210e5c233970788c285c3f7e2e6fa5ebf8`
**Scope:** one treatment of parent evidence-admission wording over a frozen
child output; not native re-delegation or durable policy evidence

## Result

The treatment parent recovered the exact case-07 relation and passed the
independent semantic rubric. The control nested parent from the prior run had
omitted that relation. Mechanical preflight proved that the model-visible
parent contract was unchanged after normalizing only the fourth instruction;
runtime/workspace IDs and context-policy labels were separately masked as
non-semantic identifiers.

| Measure | Direct baseline | Control nested | Treatment nested |
| --- | ---: | ---: | ---: |
| Semantic disposition | accepted | rejected | accepted |
| Total tokens | 14,848 | 29,645 | 27,346 |
| Duration | 42,770 ms | 58,443 ms | 67,580 ms |
| Estimated API cost | $0.00261344 | $0.00402943 | $0.00379809 |

Relative to direct, the reconstructed treatment nested arm used 1.84× tokens,
1.58× serial duration, and 1.45× estimated API cost. Relative to the control
nested arm, it used 7.8% fewer tokens and 5.7% less estimated cost, but took
15.6% longer. It restored semantic completeness without establishing an
efficiency advantage for this task.

The treatment parent alone used 20,457 tokens, 53,602 ms, and an estimated
$0.00288662. Its 4,000-token forecast was low by 5.11×. It completed four
execution steps and one structured-settlement step without a budget decision
or settlement retry.

## Integrity

The packet pins the old direct, child, and control-parent records, old packet
and result identities, child output, fixture, Work Cell source tree, new runner,
rubric, route, budget, and treatment wording. Preflight reconstructed old and
new parent inputs and produced the same normalized contract SHA-256:

`78d59f98be731650403d2b21549375a53ad1ac30159432f0f33d4ca03e6bd33a`

The only model-visible semantic difference was instruction four. The treatment
used the same observed route and backend fingerprint as the frozen baseline,
produced schema-valid output, and retained identical before/after workspace
tree hashes. Raw evidence is under [`development-01/`](development-01/), and
the independent disposition is in
[`SEMANTIC-REVIEW.md`](SEMANTIC-REVIEW.md).

## Revised judgment

This repetition supports evidence admission as a real handoff design variable:
explicitly telling the parent how a schema-valid retained child report may be
used as bounded evidence recovered a relation that the control parent had
downgraded to merely plausible. The same instruction also preserved source
uncertainty and final parent authority.

One repetition cannot separate treatment effect from provider variance, and it
does not show that this handoff is worthwhile for a small densely related task.
The direct Cell remained cheaper and faster. Do not convert the wording into a
general rule or advance to the harder fixture yet.

An exact treatment-only replication could test stability, but it could not
separate the instruction effect from the live possibility that a repeated
control would also succeed. The next causal probe therefore requires one
matched control-plus-treatment parent pair over the same frozen child output,
raw partition, route, and contracts, with order retained and semantic outputs
reviewed under masked variant labels. Until then, evidence admission remains a
treatment hypothesis rather than provisional delegation guidance.
