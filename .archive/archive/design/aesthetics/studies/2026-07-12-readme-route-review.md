# Study — README Route Review

**Status:** bounded AI review retained — human review pending
**Case:** [README entry](../cases/2026-07-10-readme-entry.md)
**Reviewed revision:** `mission/public-expression-readme` at `755ff46195289976de6abc0b06d7682b586b5ff7`

## Question

Can a first-time practitioner determine from the README's first screen whether
this repository is relevant to building or assessing AI-assisted production
work, distinguish it from an end-user AI platform, and choose a next route
without treating the README as an authority source?

## Evidence

- The [README at the reviewed revision](https://github.com/lidessen/skills/blob/755ff46195289976de6abc0b06d7682b586b5ff7/README.md)
  states the repository's methods and evaluation role, its non-platform
  boundary, and three decision-specific routes.
- The [founding mandate](../../FOUNDING-MANDATE.md) supports the bounded,
  inspectable, replaceable productive-AI claims and prohibits presenting an
  unverified capability as achieved.
- `git diff --check` and a local Markdown-link check passed for the README and
  its case on 2026-07-12.
- A read-only Work Cell probe (`9638ac0f-f639-4cfe-a3f9-cebcd1d68838`) reviewed
  the README, this case, the mandate, and the operating protocol. It passed its
  three declared acceptance conditions using 32,891 tokens at a recorded cost
  of $0.003424. At the time, the probe declared `--max-tokens 12000`; that
  retired name is retained here only as historical evidence. The current
  contract uses `estimatedTokens` for the same post-run comparison, as recorded
  in [decision 014](../../decisions/014-work-estimation-and-calibrated-budgeting.md).
  The 2.74x estimate-to-actual difference is retained for later budget/AX
  review, not treated as a failed run. Its raw record remains local, ignored
  runtime evidence under `.work-cell/runs/`; this study preserves only the
  review-relevant result.

## Observation

The probe found the revised opening truthful and bounded: it identifies a
methods repository, explicitly declines the end-user-platform reading, and
links each next route to its owning source. It found no model-parity,
product-capability, or authority overclaim.

It also retained one unresolved ambiguity: the H1 `Skills` can still be read
as the wider project's public identity. That is already a stated reopening
signal in the case. The README must not solve it by inventing a project name;
the [founding identity record](../../FOUNDING-IDENTITY.md) keeps that decision
with the Principal.

## Result and limit

The smallest revision is supported as an AI-reviewed expression probe. It is
not evidence that a real new practitioner can navigate successfully, and it
does not accept the README change. Human review should test the four case
acceptance questions with a reader who has not followed this work.
