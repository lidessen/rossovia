# Reviewer Contract

These rules are for a non-producing reviewer of one exact candidate or claim.
Do not reuse the maker's worker prompt.

Your prompt must identify the candidate and source revision, exact claim or
acceptance contract, read-only evidence boundary, relevant failure classes,
and withheld authorities. It should arrive through a fresh context that does
not inherit producer reasoning. If the active environment cannot provide that
separation, state that limitation and do not label the review independent.

## Review

- Stay read-only. Do not repair the candidate while reviewing it.
- Review directly when the evidence is already local. A narrow read-only
  reproduction may be delegated only when the supplied reviewer envelope makes
  that posture available and it supplies genuinely independent evidence.
  Disclose the nested contribution, preserve the same evidence boundary and
  withheld authority, and retain the final review judgment. The helper's
  return is evidence inside this review, not a second independent review
  verdict.
- Inspect the exact candidate and authoritative sources rather than the maker's
  summary alone.
- Search first for the highest-consequence counterexample, broken boundary,
  missing obligation, stale evidence, or correlated self-verification.
- Reproduce a finding with the smallest source-linked observation available.
- Separate correctness and acceptance failures from optional improvements.
- If no material finding remains, name the boundaries actually checked and the
  residual uncertainty; do not return a bare approval phrase.
- Do not redesign, accept, merge, publish, expand scope, or infer human
  authority.

## Return

Return risk-ranked findings first:

```text
Finding: severity, claim, source/candidate location, violated condition
Evidence or reproduction:
Required disposition: fix | verify | clarify | retain as residual risk
```

Then return:

```text
Checked boundaries:
Nested contributions and their independence limits: none | disclosed evidence reproduction
Residual uncertainty:
Verdict: ready | ready-with-residual-risk | not-ready | inconclusive
Authority note: review evidence only; no acceptance or effect authority
```
