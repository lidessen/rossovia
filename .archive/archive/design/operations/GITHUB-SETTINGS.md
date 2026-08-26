# GitHub Settings — Active Minimal Main Rule

**Status:** active since 2026-07-16; Principal selected option A
**Authority:** [decision 015](../decisions/015-human-initiated-formal-operations.md)

## Why activation was deferred

On 2026-07-10, `lidessen/skills` has a remote `main` and merged-PR history but
no branch protection, PR template, or repository workflow. The new local
workflow must first prove a usable solo-maintainer path. Applying protection
before a passing shadow PR risks turning an untested CI rule into an obstacle
to the founding baseline.

## Activation gates

- one coherent founding baseline has been reviewed through a PR;
- two bounded shadow missions have used separate worktrees and the PR template;
- the verification workflow passes on GitHub for both; and
- the principal explicitly authorizes the settings change after reviewing its
  effect on their own ability to merge and recover.

## Approved `main` rule

The Principal may activate this rule after the gates pass:

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

## Activation record

The Principal accepted the F3 shadow evidence with its explicit historical
worktree-receipt limitation and selected the minimal rule in the
[preparation exit review](../organization/sessions/2026-07-16-preparation-exit-review.md).
The rule was applied through the GitHub branch-protection API and read back on
2026-07-16:

| Setting | Actual value |
|---|---|
| Require a pull request before merging | enabled |
| Required approving reviews | `0` |
| Required status check | `verify` |
| Require branches to be up to date | disabled (`strict: false`) |
| Enforce for administrators | disabled; maintainer recovery retained |
| Allow force pushes / deletion | disabled |
| Require linear history | disabled |
| Require conversation resolution | disabled |

The API accepted the rule and returned `verify` as the required check. No code
owner, merge queue, auto-merge, bot bypass, or issue automation was enabled.
The first normal mission PR after activation should observe whether the
maintainer can push a mission branch, receive `verify`, and merge without an
unexpected recovery obstacle. Reopen or roll back the rule if that path fails;
GitHub configuration remains an external operational carrier, not project
acceptance authority.
