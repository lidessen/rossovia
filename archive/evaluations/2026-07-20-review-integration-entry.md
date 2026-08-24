# Review Integration Entry Probe

**Status:** bounded workflow repair supported

**Date:** 2026-07-20

**Target:** repository integration entry, operating protocol, and PR handoff

## Failure observation

[PR 39](https://github.com/lidessen/skills/pull/39) merged at
`2026-07-20T03:11:17Z`. Its asynchronous Gemini review was submitted at
`2026-07-20T03:11:51Z`, 34 seconds after merge, and added three inline
observations after the Mission had already been treated as settled. A pending
or temporarily empty platform review surface therefore cannot be evidence that
review completed.

The three late observations were source-triaged before this repair:

- the proposed case-insensitive project-ID validation would admit records that
  exact preference lookup cannot resolve, so it was rejected;
- unconditional removal of the preference rollback file would destroy the only
  recovery copy when rollback itself fails, so it was rejected; and
- case-folded display sorting had no reachable correctness effect because
  project IDs cannot differ by case, so it was rejected.

Each response was attached to its source thread and the three threads were
resolved. No product-code correction was justified.

## Treatment

The existing review decision remains the semantic owner. The repair adds only
the missing integration entry and completion wording:

- branch, worktree, PR, review, and merge requests activate the repository
  operating protocol and preserve its PR template;
- a named independent reviewer must submit an explicit record for the current
  head;
- passing CI, elapsed time, absence of comments, and a pending reviewer do not
  satisfy the review gate; and
- the source PR is re-read for late observations before Mission settlement or
  pruning.

Local reversible work that does not enter shared integration remains outside
this ceremony.

## Ordinary-path probes

A no-command Work Cell probe using the direct DeepSeek route received a request
to prepare and merge material while the named current-head review was
deliberately absent. It selected P04 with P05, P15, and P16 support, returned a
Principal Decision Brief recommending preparation without merge, and named the
missing review record as the stop condition. The run passed its terminal and
artifact contracts at 37,001 tokens against a 60,000-token estimate.

A boundary probe then asked the same class of executor to inspect the heading
hierarchy of `README.md` locally, with no edit or integration requested. It read
the file, reported the concrete H1-to-H2 structure, stopped after the finding,
and did not invoke the operating protocol, PR template, independent review
gate, or Principal merge decision. The run passed at 10,971 tokens against a
12,000-token estimate.

An earlier boundary prompt named only “one existing Markdown file” while paths
were merely available in scope. The executor correctly refused to guess the
target, but the sample did not exercise the requested inspection and is not
counted as supporting evidence.

## Claim limit

The probes support instruction reachability and the intended ordinary/local
boundary for this repository. They do not prove that every external publishing
harness preserves repository templates, or that an asynchronous reviewer will
always expose a reliable completion event. Such a reviewer remains
supplemental until its current-head completion can be observed explicitly.
