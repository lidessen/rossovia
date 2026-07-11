# Research — Divide and Conquer

**Disposition:** candidate:divide-and-conquer
**Scope:** Determine whether divide-and-conquer supplies a cross-context decision
that P04, P05, P09, P11, and P15 do not already make, and whether it merits a
P22 candidate.
**Source limitations:** Chinese institutional examples are historical analogies
for partition, authority, and recomposition—not a claimed direct lineage to the
modern algorithmic paradigm. Local Sikong and agent-worker anchors are
workspace-local evidence.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

When a complex problem should be divided, what makes the partition legitimate,
and what must return to the parent so the local solutions form one valid whole?

## Distinctions

- Divide-and-conquer is not mere fragmentation or delegation. Its full form is
  division into smaller instances, local solution, and combination into the
  original solution, as [NIST's definition](https://xlinux.nist.gov/dads/HTML/divideAndConquer.html)
  makes explicit.
- It differs from dynamic programming. Divide-and-conquer normally chooses
  independent or nearly independent subproblems; dynamic programming reuses
  overlapping subproblems through cached solutions. P15's dynamic-programming
  root therefore does not itself express the divide-and-combine decision.
- Feudal partition, commandery/county centralization, and the Three Departments
  and Six Ministries are governance analogies, not algorithmic instances. They
  show that partition without authority and recomposition rules produces a
  different system, not that every administrative hierarchy is divide-and-conquer.

## Evidence

- René Descartes's [*Discourse on the Method*](https://www.gutenberg.org/files/59/59-h/59-h.htm)
  states a method of dividing each difficulty into the parts needed for adequate
  solution; it grounds analytical decomposition but does not yet supply an
  integration contract.
- [NIST's divide-and-conquer definition](https://xlinux.nist.gov/dads/HTML/divideAndConquer.html)
  supplies the complete algorithmic form: smaller instances are recursively
  solved and their solutions are combined into the original result.
- Herbert Simon's [*The Architecture of Complexity*](https://www2.econ.iastate.edu/tesfatsi/ArchitectureOfComplexity.HSimon1962.pdf)
  explains the boundary test: in near-decomposable systems, intra-component
  linkages are stronger than inter-component linkages, so local dynamics can be
  treated separately while slower cross-component effects remain explicit.
- In [*Records of the Grand Historian*, “Annals of Qin Shi Huang”](https://ctext.org/shiji/qin-shi-huang-ben-ji/zh),
  the debate over feudal lords versus commanderies and counties turns on whether
  territorial partition remains governable by the whole. This is evidence that
  partition and recomposition/authority cannot be separated.
- The [*Book of Sui*, “Treatise on Officials”](https://ctext.org/wiki.pl?chapter=557592&if=gb)
  records differentiated central offices and six functional departments. It is
  an organizational example of functional partition, not a direct source for the
  algorithmic method.
- [Sikong's dogfood design](/Users/lidessen/workspaces/sikong/design/philosophy/dogfood.md:71)
  defines child-local investigation under a parent target and requires `Combine`
  to integrate accepted child artifacts; its architecture also says to divide by
  evidence surface rather than by file ownership. [agent-worker's matrix
  routing](/Users/lidessen/workspaces/agent-worker/design/decisions/025-agent-matrix-kernel.md:105)
  names collective operations and limits `same-runtime-ab` to measurement rather
  than ordinary work. Both make partition conditional and integration explicit.

## Existing-sequence coverage

- **P04:** identifies the principal contradiction that may determine where to
  split; it does not test whether a boundary makes subproblems locally solvable
  or define a recomposition obligation.
- **P05:** requires concrete analysis of each case; it does not tell the actor
  which relations may be cut or how local results recover global constraints.
- **P09:** layers attention and context; it does not decide whether work can
  proceed as independent parts or what parent contract combines them.
- **P11:** separates durable authority and execution; it does not make a
  subproblem boundary or solve the parent integration problem.
- **P15:** selects the smallest valid transition and may choose not to split. Its
  dynamic-programming root concerns constrained action selection and reuse under
  overlap, not the independent-subproblem-plus-combine form.

## Possible decision delta

Before fanning out, splitting a system, or recursively planning a task, require
the parent to name: the boundary that makes each child locally closable, the
interface and retained whole constraints, the combining/acceptance operation,
and the observation that would show the split caused more coupling than it
removed. If these cannot be named, keep the work whole or choose an overlapping
state/reuse method instead.

## Strongest no-proposal case

P04 can select the leading contradiction, P05 can analyze its parts, P09 can
layer the resulting context, P11 can separate authorities, and P15 can reject an
unnecessary fan-out. Those principles may already derive the same cautious
decomposition in practice. A permanent P22 is justified only if its explicit
boundary-plus-combine test repeatedly changes a choice after that existing team
has been applied.

## Disposition and next evidence

**Disposition:** `candidate:divide-and-conquer`

The cross-context evidence, decision delta, boundaries, and two expression
probes justified a candidate proposal, not adoption. Committee review completed
in [`2026-07-10-divide-and-conquer.md`](../reviews/2026-07-10-divide-and-conquer.md);
P22 remains incubating pending two independent real cases and two completed
expression probes.
