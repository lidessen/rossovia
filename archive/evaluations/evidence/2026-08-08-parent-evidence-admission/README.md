# Parent evidence-admission treatment probe

**Audience:** maintainers and reviewers deciding whether the failed compressed
handoff should be reshaped before testing harder delegation tasks.

**Status:** one mechanically comparable treatment completed and independently
accepted as semantic review evidence. The required
[matched control-plus-treatment follow-up](../2026-08-08-parent-admission-matched-pair/RESULT.md)
also completed and preferred treatment, while retaining one-pair and provider
variance limits.

**Pinned runtime revision:** `c41561db2d2295acec3b59c5581131e09408a02f`

**Question:** when the raw source partition and frozen child output remain
unchanged, does one explicit parent instruction about bounded evidence
admission recover the missing case-07 relation without granting child
acceptance authority?

This is the next smallest practice from the
[host-constructed nested topology result](../2026-08-07-host-constructed-nested-topology/RESULT.md).
It is a parent-only treatment over a frozen child result, not a new child run,
native re-delegation, or a claim that child reports should generally be trusted.

## Single changed relation

The treatment reuses:

- the same seven raw parent files;
- the exact child output with SHA-256
  `9e89f064adb44d9a31f07942ec0d9f0ec51b1083a8ae946d9dc165703cf01972`;
- the accepted direct baseline and its retained runtime identity;
- the same final intent, acceptance, output schema, DeepSeek V4 Flash low
  route, read-only tools, and parent budget.

Only the fourth parent instruction changes. It tells the parent that the
schema-valid retained child report's exact source claims may be used as bounded
integration evidence, while its conclusion remains neither semantic
verification nor durable acceptance. The parent must not pretend to have read
the absent raw protocol and case files.

This tests a hypothesis, not a requirement. Report form and source partition
remain alternative causes if the treatment still omits case 07.

## Evidence and authority boundaries

[`packet.json`](packet.json) pins the prior packet, direct, child, and control
parent records, prior summary and review, fixture, Work Cell source tree,
treatment wording, route, and budget.
[`run-parent-treatment.ts`](run-parent-treatment.ts) verifies those identities
and compares normalized control/treatment parent contracts before constructing
the Cell. It fails unless every field is identical after masking only the
workspace and runtime IDs, context-policy label, and fourth instruction.

The runner may judge only runtime identity, structured-output shape, read-only
workspace preservation, and retained usage/duration. Semantic judgment remains
with a fresh reviewer using [`evaluator-only/review.md`](evaluator-only/review.md).
The reviewer must read the frozen fixture and candidate output; schema validity
does not receive semantic credit.

## Commands

From this directory, the following preflight makes no model call:

```bash
bun run-parent-treatment.ts --preflight
```

The runner was committed after its pinned Work Cell runtime. Use the
[historical preflight reconstruction](../2026-08-07-host-constructed-nested-topology/REPRODUCTION.md)
to combine the exact evidence revision with that runtime; a clean checkout of
either revision alone is insufficient. Any other source-tree digest must fail
closed.

An authorized parent-only run has this interface:

```bash
bun run-parent-treatment.ts --run <absolute-frozen-fixture-directory> <absolute-new-result-directory>
```

The live run discloses the same seven frozen parent files and previously
disclosed child output to DeepSeek. It creates one new parent Cell, no child or
external semantic-judge call, and retains its record, summary, and semantic
review candidate.

The completed run is retained under [`development-01/`](development-01/).
[`SEMANTIC-REVIEW.md`](SEMANTIC-REVIEW.md) records the independent disposition,
and [`RESULT.md`](RESULT.md) compares the accepted treatment with the rejected
control nested parent and accepted direct baseline.

## Decision rule and disposition

- If independent review accepts both adapter and exact case-07 findings without
  false source, test, verification, or authority claims, the treatment recovers
  the missing relation for one repetition. This condition was met.
- If it still omits case 07, investigate report form or partition rather than
  adding more admission wording.
- If semantics recover but reconstructed child-plus-parent cost approaches or
  exceeds direct inspection without reducing attention, keep this task direct.
- The completed matched pair supports evidence status as a decision-changing
  handoff relation, not a universal prompt string or stable general policy. Its
  treatment remained less efficient than direct inspection for this fixture.
