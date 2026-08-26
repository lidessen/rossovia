# 027 — General Work Cell Core and Sequence Adapter

**Status:** implemented and verified
**Date:** 2026-07-14
**Approved by:** principal

## Concrete pressure

The first Work Cell proved useful by differentiating every task through the
project Principle Sequence before execution. That concrete lineage made
`genome`, `dna`, gene selection, and loaded interpretations mandatory parts of
the supposedly general `CellInput`, `CellDriver`, and `runCell` lifecycle.
Meanwhile experiment treatments and deliberation allocation vocabulary also
entered the core contract, although neither was consumed as a cross-context
execution invariant.

This contradicted the accepted goal that prompts, skills, tools, and adapters
differentiate a general Work Cell. It also made a Cell impossible to use in a
project with no Sequence and made stable general Swarm execution appear less
public than the domain-specific deliberation carrier.

The strongest keep-as-is case was compatibility: the combined lifecycle already
passed deterministic tests and gave every project probe a Sequence expression.
Keeping it would avoid a contract migration. It was rejected because optional
fields or documentation alone could not remove the mandatory dependency from
the driver interface and execution loop.

## Form decision

Reconstitute Work Cell into these one-way layers:

1. The [core contracts](../../packages/work-cell/src/contracts.ts) contain only
   executable instructions, capabilities, prepared context, workspace and
   completion contracts, resource observations, and optional generic
   preparation evidence.
2. The [core driver](../../packages/work-cell/src/driver.ts) executes one
   prepared Cell. It has no gene-selection method and receives no expressed
   genome.
3. The [Sequence adapter](../../packages/work-cell/src/adapters/sequence/runtime.ts)
   owns Sequence discovery input, gene selection, interpretation loading, and
   typed expression evidence. It prepares a generic Cell and then invokes the
   core. A preparation failure becomes a retained failed Cell record so
   deliberation recovery and audit remain possible.
4. The [experiment adapter](../../packages/work-cell/src/adapters/experiment/runtime.ts) owns
   treatment vocabulary and lowers a treatment into prepared instructions.
5. The [deliberation adapter](../../packages/work-cell/src/adapters/deliberation/runtime.ts) owns
   allocation envelopes, roles, positions, tallies, and dissent. These do not
   enter the core input.
6. The [Swarm runtime](../../packages/work-cell/src/swarm.ts) remains a general
   core capability and is exported by the main package barrel. Optional
   Sequence, experiment, and deliberation surfaces are exposed through explicit
   adapter entry points under `src/adapters/`.

Preparation evidence is an opaque, adapter-labelled envelope to the core. The
core may retain its usage and raw steps, but cannot interpret its domain data or
turn it into acceptance authority.

## Contract revision

This decision revises the contract placement in decisions 007 and 008 without
invalidating their evidence or project-facing interaction. `genome`, `dna`, and
gene expression remain valid Sequence-adapter concepts; they are no longer
general Work Cell concepts. Decision 020's core-promotion boundary is preserved
and made concrete. Decision 025's Swarm remains general but now carries prepared
ordinary Cells rather than requiring every Cell to own a genome.

No compatibility parser retains the retired core fields. Callers must either
submit an already-prepared `CellInput` or explicitly use the Sequence adapter.

## Verification

- TypeScript compilation verifies the migrated public and internal call graph.
- [Core and Sequence tests](../../packages/work-cell/test/work-cell.test.ts)
  prove a generic Cell can run without a Sequence, while the adapter still
  selects known P-IDs, loads only selected interpretations, retains phase usage,
  and records preparation failure.
- [Swarm tests](../../packages/work-cell/test/swarm.test.ts) prove 256 generic
  Cells retain bounded concurrency, order, failure isolation, and persistence.
- [Deliberation tests](../../packages/work-cell/test/deliberation.test.ts) prove
  Sequence-backed members still retain dissent and recover a failed preparation
  without moving allocation or vote vocabulary into the core.
- The complete package verification passes 68 tests and 295 assertions after
  the migration.

## Boundaries and reopening

Creative-field, naming, latent-routing, and idea-development mechanisms remain
research artifacts under `packages/work-cell/src/research/`. Their executable
package scripts do not promote them into the main runtime API.

Reopen the boundary if a non-Sequence adapter cannot express necessary runtime
context through instructions, context sections, tools, completion contracts,
and opaque preparation evidence; or if two independent adapters prove a new
execution invariant that cannot truthfully remain at the edge.

## Sequence expression

- **P07:** recover the combined concrete, separate its determinations, and
  reconstitute a general runtime plus explicit adapters.
- **P13:** retain preparation and execution evidence without treating adapter
  claims as settled facts.
- **P15 / P16:** change the smallest load-bearing boundary and make the public
  form tell callers which carrier they are actually using.
