# Scale-Controlled Review Partitioning

Partition a review to keep every packet inside a scale where one reviewer can
form a coherent model, investigate the relevant relations, verify material
claims, and submit a bounded report. The objective is stable local performance,
not reviewer count or maximum parallelism.

## Detect scale pressure

Prefer one whole-change review while it remains coherent. Consider partitioning
when observed or estimated work has several of these properties:

- governing design, changed code, callers, and verification evidence cannot
  remain available together without material context eviction;
- the change crosses several independent state, effect, lifecycle, protocol, or
  capability owners;
- investigation branches have locally testable outcomes and little shared
  volatile state;
- navigation consumes the turns needed for reasoning and verification;
- one report would be too large to inspect or synthesize without hiding its
  source relations; or
- comparable retained runs show incomplete models, forced recovery, or large
  variance at this scale.

Do not infer the stable envelope from model prestige, a raw token limit, or file
count. Use the work's relation structure and comparable execution observations.
If no baseline exists, make the first partition conservative and retain what
would justify merging or splitting packets next time.

## Partition by semantic closure

Choose boundaries that let one packet answer a consequential question and
verify it locally. Useful cuts include:

- one public contract and its producers/consumers;
- one end-to-end causal path;
- one state or effect owner and its lifecycle;
- one compatibility or migration boundary; or
- one verification surface tied to a concrete failure class.

Do not split by equal file counts, diff line ranges, or arbitrary directory
chunks when behavior crosses those cuts. Duplicate a small boundary contract in
two packets when that overlap is necessary to test both sides independently.

## Packet contract

Every packet carries enough of the whole to remain interpretable:

```text
Shared intent and exact source revision:
Whole system at low resolution:
Packet question and detailed scope:
State/effect or contract owner:
Source anchors and available checks:
Incoming relations:
Outgoing relations:
Deliberate overlap with other packets:
Hard constraints and local acceptance:
Required compact model/report shape:
```

Maintain a coverage ledger from changed behaviors and load-bearing relations to
packet IDs. A path outside one packet is a named outgoing relation, not evidence
that the path is safe or missing, and not permission for the Cell to expand its
authority.
Type every boundary relation explicitly. At minimum distinguish semantic
authority, licensed derivation, contextual expression, reconstructible
projection, causal dependency, execution evidence, and acceptance authority.
"Downstream of" does not imply "reconstructible from": synthesis must not
normalize these relation types merely because several packets describe the same
artifacts.

When the source/projection distinction can change synthesis, do not use a lone
`Projection?` flag. Make the packet result contract retain this minimum test:

```text
Artifact or edge:
Relation type:
Source anchor:
Reconstruction source, or none:
Meaning lost if rebuilt from that source:
```

Only `reconstructible projection` may name a reconstruction source without
losing decision-relevant meaning. A source may constrain a licensed derivative
or contextual expression without being able to regenerate it.

## Release and adapt

The partition plan does not launch work. Give prepared packets to the caller or
orchestration carrier, which chooses concurrency and retains independent
settlements. If a Cell reports that its packet still exceeds its working scale,
retain that result and let the caller repartition; the Cell does not schedule
its own descendants.

Treat these as observed scale-pressure signals even when the mechanical run
passes: terminal recovery contradicts retained reads, the report claims no
evidence after a large investigation, repeated context dominates usage, or a
packet cannot state its outgoing relations. Repartition only the failing packet
and compare the replacement's completion, evidence quality, and work usage with
the retained failure.

Do not add reviewer personas merely to make siblings sound different. Keep the
review method constant unless the caller is running an explicit differentiation
treatment. A proposed shape such as rigorous, deliberative, adversarial, or
exploratory must name an observable behavior and local acceptance measure; prose
variance alone is not evidence that the Cell inspected or judged differently.

Differentiate in this order: local question, semantic scope, evidence access,
acceptance condition, result contract, then—only if still necessary—one compact
attention bias. The first five make a Cell's work function concrete. A role
description competes with that work for finite attention and may redirect source
order without improving judgment.

Concurrency controls resource pressure across packets. Partitioning controls
cognitive and verification scale inside each packet. They are related but not
interchangeable: lowering concurrency cannot make an oversized Cell coherent,
and making packets smaller does not authorize unbounded release.

## Reconstruct the whole

A later synthesis packet receives the coverage ledger and compact source-linked
records. It checks:

1. every load-bearing relation is covered;
2. duplicated boundaries agree or retain an explicit conflict;
3. local findings remain reachable when reconnected to external callers;
4. no packet's missing context was silently converted into safety; and
5. the combined result still answers the original acceptance question.

Also verify that relation types survive reconnection. In particular, a semantic
source may constrain a licensed interpretation or contextual method without
making either one a reconstructible projection.

The synthesis may reveal a new cross-packet relation. That is a reason for one
targeted follow-up packet, not a reason to rerun every Cell automatically.
Evaluate a large synthesized model with the same scale discipline: partition
independent question families when one evaluator cannot retain candidate
reports, authoritative sources, and all disconfirming checks coherently.
