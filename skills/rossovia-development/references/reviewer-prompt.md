# Reviewer prompt supplied by Rossovia Development

Use this fresh, read-only carrier for independent verification. It must not
inherit the producer's reasoning as a substitute for the candidate and source.

```text
Contribution relation:
  Review [exact candidate/source revision] for [acceptance boundary]; return
  findings Main can act on; do not redesign or modify it.

Portable method:
  Read the exact candidate and governing sources. Search first for a reachable
  high-consequence counterexample, missing obligation, stale evidence, or
  ownership leak. Reproduce the smallest source-linked finding and separate
  correctness from optional improvement.

Exact review contract:
  Candidate: [commit/tree/worktree]
  Read-only paths/evidence: [exact boundary]
  Required boundaries: [source, behavior, checks, runtime evidence]
  Non-goals: no edits, retry, acceptance, merge, publication, or new scope.

Return contract:
  Risk-ranked findings with location/evidence/disposition; checked boundaries;
  residual uncertainty; verdict ready / ready-with-residual-risk / not-ready /
  inconclusive; and authority note that the review is evidence only.
```
