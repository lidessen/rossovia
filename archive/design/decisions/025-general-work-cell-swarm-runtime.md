# 025 — General Work Cell Swarm Runtime

**Status:** implemented and verified
**Date:** 2026-07-13
**Approved by:** principal

Decision [031](031-extensible-work-cell-orchestration.md) later preserves this
Swarm contract while moving its shared dispatch and settlement mechanics into
the general orchestration runtime.

## Concrete need

The activation-field experiment executed 256 independent model calls with
bounded concurrency, stable result ordering, per-call failure retention, and
post-run usage evidence. Creative emergence was not established, but the
execution mechanism proved independently useful. The same package currently
duplicates private concurrent-map implementations in activation field,
candidate field, and residual readout while the normal Work Cell CLI can start
only one complete Cell at a time.

The useful capability is not an activation field, committee, or creative
method. A caller or domain method first decomposes work that exceeds one Cell's
stable operating scale into already-defined Cells. The runtime then needs to
release those Cells under one bounded Swarm and return one retained result for
every input without completion order changing identity or a failed Cell
silently cancelling unrelated work.

The strongest keep-as-is case is to leave concurrency inside each specialized
adapter. That avoids a new surface, but it makes every adapter reimplement
limits, ordering, cancellation, failure isolation, and persistence. It also
cannot execute arbitrary Cells differentiated by their own prepared instructions,
context, skills, tools, workspace, and acceptance contract.

## Evidence boundary

The live 256-node run proves provider-facing lightweight concurrency at this
scale. It does **not** prove that 256 complete Work Cells can safely share local
files, commands, drivers, timeouts, or persistence. Full-Cell scale remains an
implementation claim that must be tested separately.

## Form decision

Select a **runtime capability** with a **CLI projection**, named **Work Cell
Swarm**:

1. `startSwarm` accepts one versioned Swarm input containing independent
   ordinary `CellInput` values, an explicitly declared concurrency value from 1
   through 256, and no domain-specific role or synthesis schema. It returns an
   in-process cancellable settlement handle after admission. `runSwarm` is the
   convenience projection that starts the same carrier and awaits its settlement.
2. The runner creates a fresh `CellDriver` per Cell, starts at most the declared
   concurrency, preserves manifest order in the retained records, and lets every
   started Cell settle independently.
3. An external cancellation signal may stop the Swarm. One Cell's failed,
   cancelled, protocol-error, capability-mismatch, or verification-failed status
   remains that Cell's result and does not become an exception that erases sibling
   records.
4. Every writable Cell must use a distinct workspace root in the first slice.
   Cells may share one root only when all of them are read-only. Disjoint write
   scopes within one root are not inferred or scheduled yet.
5. Each `CellRunRecord` remains the execution evidence source. The Swarm's
   counts, aggregate usage, estimate audit, and record index are projections over
   those records and have no semantic acceptance authority.
6. File transport is an adapter, not a second Swarm contract. `startSwarmFromFile`
   accepts only a relative file reference inside a host-owned root, validates and
   digests the ordinary `SwarmInput`, then returns fixed `status.json` and
   `index.json` paths while execution continues. The adapter persists one record
   per Cell plus a compact index; it does not print or inject all child outputs
   into an agent context by default.

The name denotes bounded concurrent release, not autonomous collective
intelligence. This capability belongs in `packages/work-cell`; it is not an
installable Skill.
Prompt, skills, tools, output schemas, and workspace policies continue to
differentiate each Cell through the existing `CellInput` contract.

The Swarm system controls scale in two distinct places. A domain method owns
semantic decomposition so each Cell receives a coherent, locally verifiable
unit of work; the runtime owns resource-scale control through bounded admission,
failure isolation, and compact retained records. The runtime cannot infer a
sound decomposition from file count or prompt text, so `runSwarm` still accepts
only prepared Cells and never invents or splits them.

Input, memory, and retained evidence are separate contracts. The external input
has its own version and Zod schema. The in-memory run contains only execution
facts, uses `Date` values, and carries neither an input version nor a stored
summary. Each persisted Cell outcome and the compact index have their own
strict, versioned Zod schemas; the summary is generated only as a rebuildable
projection during presentation or persistence.

## Boundaries

The Swarm runtime does not:

- invent, split, prioritize, or retry tasks;
- create a durable queue, daemon, scheduler, worker identity, or task tree;
- allow Cell-to-Cell messaging or shared hidden memory;
- merge outputs, vote, form consensus, or select a winner;
- resolve write conflicts or allocate Git worktrees automatically;
- impose a shared hard token limit or stop useful work because an estimate was
  exceeded; or
- accept the semantic quality of any Cell result.

Despite its name, a Work Cell Swarm has no queen, leader, shared mind, internal
society, or emergent authority. `Swarm` is the compact handle for many
independent Cells moving concurrently under one caller-defined boundary. If a
future mechanism adds coordination or self-organization, it requires a separate
decision rather than silently expanding this definition.

Deliberation remains a domain adapter with its own human-authorized allocation
and projection. Activation-field integration, candidate archives, and creative
readout remain experiments. They may reuse a low-level concurrency utility, but
their semantic stages do not enter `runSwarm`.

## Minimum transition

Implement one Swarm module, one `swarm <manifest.json>` CLI command, and only
tests that protect real Swarm failure stories:

1. a 256-Cell deterministic runtime probe verifies the concurrency ceiling,
   fresh drivers, exact-once execution, and input-order retention;
2. a multi-Cell integration probe verifies that one failed Cell does not erase
   passing siblings or their usage;
3. a workspace-boundary probe rejects writable Cells sharing a root while
   allowing a shared read-only root; and
4. a persistence probe verifies per-Cell records plus a rebuildable index rather
   than one context-heavy aggregate output.

## Acceptance and disconfirmation

The form is supported when an ordinary caller can release heterogeneous Cells with
one command, recover every retained record independently, observe bounded peak
concurrency, and cannot accidentally authorize shared writes through the Swarm
carrier.

Reopen or reject the form if the generic manifest needs activation, voting,
creative, organizational, or scheduling vocabulary; if result identity depends
on completion order; if 256 lightweight executor jobs cannot settle without
loss; or if safe real use requires a durable queue rather than one bounded
invocation.

## Implementation evidence

- [`startSwarm` and `runSwarm`](../../packages/work-cell/src/swarm.ts) validate
  one portable manifest, create one fresh driver per Cell, enforce the
  shared-workspace boundary before execution, and retain sibling outcomes
  independently. The start form exposes asynchronous settlement and
  cancellation; the run form awaits the same handle.
  `projectSwarm` derives the non-authoritative aggregate only for consumers that
  need it.
- [`mapConcurrent`](../../packages/work-cell/src/concurrency.ts) supplies the
  small stable-order, bounded-concurrency mechanism without introducing a
  scheduler or queue vocabulary.
- [Swarm runtime tests](../../packages/work-cell/test/swarm.test.ts) exercise
  256 complete Cells crossing one concurrency barrier with 256 fresh drivers,
  exact manifest-order retention, sibling survival after a runner error,
  workspace rejection before execution, and independently hashed record files.
- The complete Work Cell suite passes 68 tests and 295 assertions after the
  [general-core refactor](027-general-work-cell-core-and-sequence-adapter.md). A four-Cell
  live `deepseek-v4-flash` CLI smoke also passed all four Cells and persisted a
  compact index beside their independently schema-validated records. The latest
  schema-bound run observed 45,851 total
  tokens against a 20,000-token estimate, so the retained audit correctly
  exposed a 129.255% relative error without interrupting useful work.

The deterministic probe establishes the 256-complete-Cell runtime property; the
live smoke establishes the real adapter and persistence path at concurrency
four. This evidence does not claim that 256 simultaneous provider calls have
been exercised through the full Cell lifecycle.
