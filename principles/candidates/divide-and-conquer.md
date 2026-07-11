# Candidate — Divide and Conquer

**Status:** incubating
**Alternate participation:** not nominated
**Research basis:** [divide-and-conquer research](../research/divide-and-conquer.md)
**Observed in:** classical analytical method, complex-systems theory, governance
partition analogies, and agent-system planning

## Candidate sequence line

P22｜沿可闭合边界分而治之，并在合成中恢复整体约束｜分治法 / 复杂系统

## Recurrence

- [Descartes's method](https://www.gutenberg.org/files/59/59-h/59-h.htm) treats
  adequate solution as requiring a difficulty to be divided into needed parts;
  [NIST's definition](https://xlinux.nist.gov/dads/HTML/divideAndConquer.html)
  adds recursive local solution and combination into the original result.
- [Simon's near-decomposability account](https://www2.econ.iastate.edu/tesfatsi/ArchitectureOfComplexity.HSimon1962.pdf)
  supplies a cross-domain criterion for boundary choice: local interactions are
  stronger than cross-boundary interactions, while global effects remain visible.
- [Sikong's parent/child dogfood contract](/Users/lidessen/workspaces/sikong/design/philosophy/dogfood.md:71)
  keeps authority and acceptance with the parent while children return bounded
  artifacts for combination. [agent-worker's collective-operation map](/Users/lidessen/workspaces/agent-worker/design/decisions/025-agent-matrix-kernel.md:105)
  distinguishes when collective operations produce comparable artifacts rather
  than making fan-out ordinary work.

## Decision consequence

When facing complex work, do not divide by habit, file layout, or available
people. Divide only along a boundary that makes child work locally closable, name
the interface and retained whole constraints before dispatch, and define how
accepted child results combine into the parent result. Otherwise keep the work
whole or use a method for overlapping state rather than pretending the parts are
independent.

## Existing-sequence check

P04 identifies the contradiction that may determine a split; P05 examines the
particular parts; P09 layers context; P11 separates authority; P15 rejects an
unnecessary transition. None alone requires an explicit test of local closure,
interface, recomposition, and retained global constraints. The candidate's
remainder is that structural decision, provided later cases show the existing
combination does not already make it.

## Counterexample / boundary

- Do not split when cross-boundary interaction, merge cost, or shared context is
  greater than the local work saved. A single coherent path can be the minimum
  valid transition.
- Delegating people or assigning files is not divide-and-conquer unless the
  children have bounded problem contracts and the parent has a combining rule.
- Dynamic programming is not a synonym: overlapping subproblems need reuse and
  state management, not independent child closure.
- Partition never transfers parent acceptance, fact, or semantic authority to a
  child; P11 and P13 remain in force.

## Expression probes

- Agent planning: define parent acceptance conditions, child scope/interface,
  and a synthesis task before parallel or recursive dispatch.
- System architecture: establish modules where local interactions dominate,
  expose cross-boundary contracts, and verify integration against global
  invariants rather than merely counting component completion.

## Committee review

See [2026-07-10 divide-and-conquer review](../reviews/2026-07-10-divide-and-conquer.md).
The selected P04/P03/P11/P15 team recommends retaining P01–P16 while preserving
this candidate for two comparative expression probes.

## Trial evidence

No completed alternate trial. The candidate is not nominated and cannot enter a
skill lineage or review team.

## Human decision

**Sequence:** pending human decision — retain P01–P16 recommended
**Alternate:** not nominated
