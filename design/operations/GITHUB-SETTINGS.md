# GitHub Settings — Deferred Activation Record

**Status:** do not apply before the founding shadow gates pass
**Authority:** [decision 015](../decisions/015-human-initiated-formal-operations.md)

## Why this is deferred

On 2026-07-10, `lidessen/skills` has a remote `main` and merged-PR history but
no branch protection, PR template, or repository workflow. The new local
workflow must first prove a usable solo-maintainer path. Applying protection
before a passing shadow PR risks turning an untested CI rule into an obstacle
to the founding baseline.

## Apply only when all gates are true

- one coherent founding baseline has been reviewed through a PR;
- two bounded shadow missions have used separate worktrees and the PR template;
- the verification workflow passes on GitHub for both; and
- the principal explicitly authorizes the settings change after reviewing its
  effect on their own ability to merge and recover.

## Proposed `main` rule

Configure this manually in GitHub after the gates pass:

| Setting | Proposed value | Purpose |
|---|---|---|
| Require a pull request before merging | enabled | make shared integration reviewable |
| Required approving reviews | `0` initially | preserve a viable single-maintainer path; human disposition remains required by protocol |
| Require status checks | enabled, require `verify` once its shadow runs pass | retain mechanical evidence at merge |
| Require branches to be up to date | disabled initially | avoid converting a small solo repository into merge-queue ceremony |
| Allow force pushes / deletion | disabled | preserve recoverability |
| Require linear history | deferred | decide only if actual merge history makes it material |
| Do not allow bypassing | deferred | test recovery and maintainer merge behavior before making this irreversible |

Do not enable code-owner review, auto-merge, merge queue, issue auto-close,
or bot bypass from this record. They require their own evidence and authority
decision. Record the actual settings, date, principal, and observed effect in
the founding campaign when applied.
