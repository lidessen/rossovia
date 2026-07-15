# Formal Operations Transition — Strategy Case

**Status:** approved — Principal accepted reconvening and mainline return on 2026-07-15
**Human mandate:** resume the preparation group, converge accumulated work, and
complete the transition to ordinary formal operation without losing side lines
**Decision requested:** choose whether to converge the present stage before
opening more capability work
**Approver:** Principal
**Evidence cutoff:** repository, worktree, PR, and GitHub settings inspected at
2026-07-15T13:29:02Z

## Principal Decision Brief

**Recommendation: A — reconvene the preparation group and converge the current
stage before opening another capability line.** The Principal accepted A in the
authorizing session. This authorizes preparation, inventory, and review routing;
it does not authorize a push, merge, remote-rule change, or disposal of retained
work.

| Key | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|
| **A — converge and transition** | Preserve every active line, prepare the current experiment as one reviewable integration, return PR #16 and the staged legacy experiments explicitly, then present F4/F5 decisions. | New capability work waits until the accumulated state is inspectable; reopen if the current branch cannot form a coherent review object. |
| B — keep extending the experiment | Continue adding runtime, skill, and site capabilities on the existing branch. | Avoids near-term integration work but enlarges the unreviewed state and keeps the temporary preparation formation alive. |
| C — hold without convergence | Preserve all branches and make no integration movement. | Avoids immediate remote change but leaves 12 committed stage changes and a 129-entry staged side worktree without a return route. |

## Concrete situation

| Statement | Classification | Source and exact status | Verification gap |
|---|---|---|---|
| The first founding baseline is integrated. | fact | [founding mission record](../../../operations/missions/founding-baseline.json) is `settled`; [PR #13](https://github.com/lidessen/skills/pull/13) is merged. | Does not settle the later preparation gates. |
| Two later mission PRs completed with passing remote verification. | fact | [PR #14](https://github.com/lidessen/skills/pull/14) and [PR #15](https://github.com/lidessen/skills/pull/15) are merged; each `verify` check passed. | The preparation campaign has not yet recorded whether their worktree/template evidence formally satisfies F3. |
| The preparation campaign has not exited. | fact | [campaign](2026-07-10-formal-operations-preparation.md) remains active; [GitHub settings record](../../operations/GITHUB-SETTINGS.md) remains deferred. | F4 still needs a Principal choice and F5 needs a final disposition. |
| The current experiment is a large coherent candidate, not accepted mainline. | fact | `experiment/activation-field-scale` at `0099a51` is 12 commits ahead of `origin/main`, touches 199 files, and is clean locally. | It still needs content review, operational review, current CI, and Principal PR disposition. |
| PR #16 is a separate accepted-looking change surface. | fact | [PR #16](https://github.com/lidessen/skills/pull/16) is open, mergeable, and has a passing `verify` check at `84346d6`. | Its README and Sequence projections overlap the later experiment and must be rebased or returned after the larger stage settles. |
| The PR #16 worktree also contains material not represented by its PR. | fact | Its own index now preserves 129 staged entries: 18 differ from the current experiment and 107 paths are absent there, chiefly naming and contended-loop research/evaluation material. | Staging protects recovery; it does not establish quality, integration fitness, or a single coherent mission. |

## Principal contradiction and preservation case

- **Principal contradiction:** capability production has advanced faster than
  the accepted integration carrier. More implementation now increases the
  number of unreviewed relations and delays the temporary preparation group's
  exit.
- **Why resolution changes the remaining choices:** once the present stage is
  reviewed and integrated or returned, PR #16 can be rebased against a stable
  substrate, the legacy experiment material can be partitioned by actual value,
  and F3/F4/F5 can be decided from current evidence.
- **Strongest preservation case:** leave all branches untouched because every
  change is recoverable. This preserves bytes but not obligations: no durable
  source would state which line returns first or when preparation ends.
- **Hard constraints:** no direct write to `main`; no self-acceptance or
  self-merge; no deletion of the staged side worktree; no remote-rule change
  without Principal approval; no model call implied by this strategy.

## Alternatives

| Alternative | Capability cost | Irreversible surface | Evidence gap | Defeating condition |
|---|---|---|---|---|
| Preserve / hold | low immediate work, growing coordination cost | none | leaves all return obligations open | a reason that current review cannot be bounded |
| Integrate PR #16 first | small immediate PR | changes README/Sequence baseline before the larger branch | later experiment conflicts with or supersedes its projections | direct diff shows no meaningful overlap or current branch is rejected |
| **Integrate the current stage first** | substantial review, ordinary Git/CI work | one Principal-approved PR merge | whether 199 files form one coherent stage | committee or preparation review finds an inseparable unresolved contradiction |
| Mix staged legacy experiments into either PR | highest context and review cost | promotes unreviewed research/runtime together | no partition or current behavioral review | none; reject unless a named dependency proves it necessary |

## Rolling horizons

### Long direction

Operate the project through human-authorized, reviewable missions in which
direction, execution, verification, and commitment remain separated, while the
temporary founding apparatus has actually retired.

### Medium capability hypotheses

| Capability | Enables long direction | Dependencies | Evidence gap | Revision signal |
|---|---|---|---|---|
| Reviewable stage integration | makes accumulated capability an inspectable common substrate | coherent diff partitions, current checks, committee and preparation review | semantic impact across Work Cell, skills, and site | review finds a material coupling with an unresolved legacy experiment |
| Explicit side-line return | prevents PR/worktree residue from becoming hidden project state | Mission Record and preserved indexes | value and destination of 129 staged entries | unique material proves load-bearing for the current stage |
| Formal-operation settlement | replaces preparation with the stable operating protocol | F3 disposition, F4 Principal choice, F5 record | practical effect of the proposed `main` rule | settings would obstruct the solo-maintainer recovery path |

### Short mission candidates

| Mission | Decision delta beyond this Case | Linked capability | Linked direction | Acceptance evidence | Envelope after approval | Execution owner |
|---|---|---|---|---|---|---|
| **Current-stage integration review** | determines whether the 12-commit experiment is fit for one PR or must return for partition | reviewable stage integration | inspectable formal operation | current deterministic checks, content committee report, preparation operational report, Principal PR disposition | ordinary local/CI work; no model budget implied | preparation group and integration steward |
| PR #16 return | determines rebase, integrate, or abandon after the stage substrate settles | explicit side-line return | no forgotten branch obligations | direct post-stage diff and explicit PR disposition | ordinary Git work | integration steward |
| Legacy-experiment triage | determines which staged materials become later missions, durable research, or abandoned evidence | explicit side-line return | no hidden operational state | source/value/verification partition with every entry covered | estimate only if a retained implementation mission is proposed | temporary review formation |
| F3/F4/F5 settlement | determines whether preparation can retire and which remote rule, if any, becomes active | formal-operation settlement | temporary apparatus has retired | recorded gate audit, Principal F4 choice, archived campaign or one named missing gate | no model budget implied | preparation group; Principal decides F4/F5 |

## Minimum recommendation

- **Approved commitment now:** preserve all lines and prepare the current-stage
  integration review; do not add another capability line.
- **Conditional next action:** push/open/revise a PR only after the local review
  packet and mission record are present; merge remains a separate Principal
  decision.
- **Replan trigger:** the committee identifies an unresolved design dependency,
  the preparation group cannot partition the review coherently, or current
  deterministic checks fail.
- **Non-scope:** no forced merge, no branch deletion, no automatic GitHub
  settings change, no naming decision, and no promotion of staged experiments.

## Authority and disposition

- **Proposal prepared by:** strategic advisory in the authorized Codex session.
- **Independent verification needed:** content committee review, preparation
  operational review, local/remote checks, and the later Principal PR decision.
- **Human decision:** Principal accepted reconvening and mainline convergence on
  2026-07-15.
- **Accepted execution owner:** the temporary preparation group under the
  [operating protocol](../../operations/OPERATING-PROTOCOL.md).
