# Preparation Exit Review

**Date:** 2026-07-16
**Status:** completed — option A integrated through PR #23
**Authority:** [decision 015](../../decisions/015-human-initiated-formal-operations.md)
**Mission:** [`formal-operations-transition`](../../../apps/missions/formal-operations-transition.json)

## Question

Can the temporary preparation campaign retire now, and what limited remote rule,
if any, should survive as part of normal formal operation?

## F3 — shadow-operation evidence

The two proposed shadow missions produced these retained observations:

| Requirement | Retained evidence | Disposition |
|---|---|---|
| Two bounded mission branches and PRs | [PR #14](https://github.com/lidessen/skills/pull/14) used `mission/post-merge-settlement`; [PR #15](https://github.com/lidessen/skills/pull/15) used `mission/work-cell-estimate-audit`. Both merged into `main`. | supported |
| Remote verification | Both PRs retain a completed `verify` check with conclusion `SUCCESS`. | supported |
| Reviewable mission scope | PR #14 states its two closed return obligations and checks. PR #15 states change, reason, validation, and residual calibration boundary. | supported |
| Correction or return-to-work | PR #14 is the explicit post-merge return that settles the earlier review mission. PR #15 is a bounded correction to the token-estimate contract and retains the observed estimate variance that motivated it. | supported |
| PR-template route | Both PR bodies retain mission, evidence, checks, and decision boundaries, but neither preserves the template verbatim. | behavior supported; literal use not recoverable |
| Isolated worktrees | The retained Git and GitHub records prove separate branches, not the local filesystem carrier used while each branch was developed. Removed worktree metadata is not recoverable from those sources. | unverified historical carrier |

The missing historical worktree receipt is an observability gap, not evidence
that either change contaminated `main`: both changes crossed a separate branch,
PR, successful remote check, and human merge. Repeating an otherwise artificial
mission solely to recreate a deleted local path would test recordkeeping more
than the operating route.

**Recommended F3 disposition:** accept the demonstrated branch/PR/verification/
correction behavior with one retained limitation. Future material Mission
Records should name the branch and worktree when the worktree is created; the
path remains operational evidence and does not become semantic authority.

## F4 — current remote state and choice

Read-only inspection on 2026-07-16 found no repository ruleset and no branch
protection on `main`. The shadow checks therefore prove that `verify` works, but
GitHub does not currently require the PR route or that check.

The smallest supported remote rule is:

- require a pull request before merging;
- require the `verify` status check with strict up-to-date disabled;
- require zero approving reviews initially;
- disallow force pushes and branch deletion;
- retain the maintainer recovery/bypass path;
- do not enable code owners, merge queue, auto-merge, linear history, or bot
  bypass policy.

This rule makes the already-practiced integration boundary mechanically visible
without transferring human acceptance to GitHub. Deferring it remains valid if
the principal prefers manual discipline for a solo-maintainer repository.

## F5 — exit assessment

The baseline, return, legacy-carrier, and current-stage branches of the
transition Mission are settled. The operating protocol, PR template, verifier,
Mission Record convention, Chronicle, and human merge authority now survive
without a preparation committee. No remaining capability requires the
temporary formation.

Subject to the Principal's F3/F4 choice, the campaign can be archived. The next
major capability should then receive its own Mission rather than extending this
campaign.

## Principal Decision Brief

**Recommendation:** A — accept F3 with the explicit historical-carrier
limitation, apply the minimal `main` rule, and archive preparation. This is the
smallest setting that turns the proven PR/check practice into a durable boundary
while retaining a viable solo-maintainer recovery path.

| Key | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|
| **A — activate and archive** | Accept F3 as above; apply the minimal `main` rule; record its observed effect; archive the campaign and close the Mission. | Reopen the rule if it blocks maintainer recovery or the normal PR merge path. |
| **B — manual and archive** | Accept F3 as above; retain manual PR discipline with no remote rule; archive the campaign and close the Mission. | Reopen F4 after a direct-push mistake or repeated missing-check integration. |
| **C — one more shadow** | Keep preparation active; run one small mission whose creation record explicitly retains worktree and template evidence before deciding F4/F5. | Costs another PR and preserves temporary organization to close an evidence-only gap. |

**Principal reply:** `A`, `B`, `C`, or `explain <key>`.

## Principal disposition

The Principal selected **A** on 2026-07-16. F3 is accepted with the stated
historical-carrier limitation. The minimal `main` protection was then applied
and read back through the GitHub API:

- pull requests are required;
- `verify` is required with strict up-to-date disabled;
- zero approving reviews are required;
- administrator enforcement is disabled, preserving the maintainer recovery
  path; and
- force pushes, branch deletion, and linear-history enforcement remain
  disabled.

The remote action succeeded. [PR #23](https://github.com/lidessen/skills/pull/23)
then passed the newly required `verify` check and merged as
`e70572fe0b71b456cba75d5eb18bdd70d715d7d9`. This confirms the normal mission
PR remained mergeable under the rule and completes the archive integration.
