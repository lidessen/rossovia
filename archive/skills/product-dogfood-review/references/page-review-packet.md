# Page Review Packet

Use this small record for one cross-page dogfood review. Keep evidence links
close to the claim they support. A packet may contain many coverage rows, but
its ranked findings contain no more than three decision-changing items.

```text
# Product dogfood review

## Identity
Object and audience:
User outcome/task family:
Review boundary and exclusions:
Runtime instance and revision:
Reviewer/evaluator and independence:
Review contract and task sources:
Safe fixture/effect boundary:

## Coverage
| Page or entry point | Reachable states/transitions | Task or smoke probe | Viewport(s) | Standing |
|---|---|---|---|---|
| ... | ... | ... | ... | covered | deferred | blocked |

Deferred combinations and why:
Neighboring surfaces checked for continuity:

## Session evidence
For each task:
- task, starting state, route, viewport, and expected outcome;
- actions actually performed and the decisive state transition;
- mechanical evidence: render/interaction/state/request/console/accessibility
  observation, with source or browser trace where available;
- experience observation: orientation, action, comprehension, effort, or
  recovery consequence;
- screenshot or other artifact path at the decisive transition;
- what remains unverified.

## Findings (maximum three)
### F-1 — severity and consequence
Claim and affected user task:
Evidence provenance (runtime revision, route/state/viewport, trace/artifact):
Observed mechanical fact:
Observed experience consequence:
Real owning layer/owner:
Invariant to preserve:
Variation permitted:
Smallest next probe:
Disconfirming observation:
Required disposition: fix | verify | clarify | retain as residual risk

### F-2 / F-3
Use the same fields only when each changes a separate decision.

## Unresolved and acceptance
Questions for the designated human or product owner:
Claims blocked by runtime/browser evidence:
Preference or visual-direction questions routed elsewhere:
No-change cases (what was checked and why no change is warranted):

## Handoff
Status: ready | ready-with-residual-risk | blocked | inconclusive
Next owner and exact bounded task:
Evidence that must be rechecked at settlement:
Authority note: review evidence only; no code, data, publication, or merge
authority was exercised.
```

Do not fill an absent fact with a likely implementation. If a route is
unreachable, distinguish “route/runtime unavailable” from “product route is
broken”; the latter needs a reproduced live observation. If a finding is only
an aesthetic preference, leave it in `Unresolved and acceptance` or route it
to the owning visual review rather than ranking it as a usability defect.

## Compact finding admission rule

Admit a finding only when all of these are present:

1. a real task or user consequence;
2. a direct observation at a named runtime revision, route/state, and
   viewport;
3. evidence that separates browser/fixture failure from product behavior;
4. a named owning layer and affected surface;
5. a smallest next probe that could prove the diagnosis wrong.

Coverage is not a finding. A preference without a task consequence is not a
finding. A source hypothesis without a live observation is not a finding.
