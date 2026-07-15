# Formal Operations Preparation Campaign

**Status:** active — reconvened for stage convergence and formal disposition
**Authority:** [decision 015](../../decisions/015-human-initiated-formal-operations.md)
**Principal contradiction:** the collection has enough methods and evidence to
undertake shared work, but its current large uncommitted transition cannot yet
serve as an inspectable integration baseline.

## Mandate

Prepare a human-initiated formal operating mode without creating a permanent
agent hierarchy. The campaign owns only the migration from the present dirty
checkout to a reviewable baseline and shadow-tested Git/PR protocol. It ends
when its exit gates pass; the operating protocol then survives, not this
campaign.

The principal approved the operating design on 2026-07-10. This approves the
protocol and its authority boundaries; it does not select the first founding
tranche, create a worktree, open a PR, merge, or apply a remote setting.

## Preparatory formation

| Seat | Initial responsibility | Boundary |
|---|---|---|
| Principal | select founding tranche, approve name and remote settings, merge | cannot delegate acceptance by implication |
| Convener | turn audit evidence into a tranche brief and route roles | no self-merge or autonomous queue |
| Naming adviser | distinguish a project identity from the `skills` directory handle | no public rename without approval |
| Strategy/work adviser | identify the first baseline and shadow missions; estimate material work | no resource commitment |
| Execution owner | make one branch-local tranche at a time | no acceptance or merge |
| Independent verifier | check protocol use and review the result | no scope expansion |
| Integration steward | preserve PR disposition and worktree cleanup evidence | no automatic remote action |

## Founding gates

| Gate | Required evidence | Owner of decision | Failure route |
|---|---|---|---|
| F0 — inventory | current change set is divided into coherent founding tranches with source/status and explicit exclusions | Principal | `artifact-organization` or ordinary scope review |
| F1 — naming | a naming-and-articulation record states whether a public project name is needed; no accidental rename | Principal | leave descriptive handle in place |
| F2 — first baseline | one clean `founding/regenerated-baseline` worktree produces one founding baseline PR into `main`, containing every retained current change in declared review partitions, with checks and reviewer observation | Principal | return to execution; do not bulk-stage dirty root |
| F3 — shadow operations | two small `mission/<slug>` PRs demonstrate the branch/worktree/template route, including one correction or return-to-work observation | Principal | `practice-cycle` on observed gap |
| F4 — remote rule | principal applies and records the limited GitHub rule in `operations/GITHUB-SETTINGS.md` | Principal | retain manual PR discipline |
| F5 — formal disposition | principal declares the protocol active and archives this campaign | Principal | keep campaign active with one named missing gate |

## First next transition

**F0 inventory is complete:** see the source-bearing
[founding-tranche ledger](2026-07-10-founding-tranche-ledger.md). It separates
accepted-design material, implementation runtime material, legacy/archive
moves, generated/tool residue, and unresolved choices without staging,
committing, pushing, renaming, or deleting anything.

**F1 naming record is prepared:** see
[Founding Identity](../../FOUNDING-IDENTITY.md). The Principal's name/defer
decision is pending; it does not block F2 unless a public founding release is
required to carry the name.

**F2 baseline shape is corrected:** the inventory originally described separate
tranches as prospective PRs. A dependency check found that the root README,
design carriers, verification workflow, and later methods cross-reference one
another, so an intermediate tranche would not be a truthful project state. The
tranches remain review and commit partitions, but every retained current change
must enter one `founding/regenerated-baseline` PR. This protects review without
making a partial architecture the accepted baseline.

The Principal selected this founding baseline route. A clean sibling worktree
may now be created from `origin/main`, populated only with the ledger's retained
contents, checked, and prepared as a PR. It does not authorize a push to
`main`, merge, remote setting change, or unreviewed scope expansion.

## 2026-07-15 reconvening

The founding baseline transition above completed through
[PR #13](https://github.com/lidessen/skills/pull/13), and its
[Mission Record](../../../operations/missions/founding-baseline.json) is
settled. [PR #14](https://github.com/lidessen/skills/pull/14) and
[PR #15](https://github.com/lidessen/skills/pull/15) subsequently used bounded
`mission/*` branches and passed the remote `verify` workflow. They are candidate
evidence for F3, not an implicit gate disposition; the preparation group must
still record whether the separate-worktree, PR-template, correction, and return
requirements were actually met.

The Principal reconvened the preparation group after the project accumulated a
new 12-commit experiment, open PR #16, and a separate dirty worktree containing
material not represented by either line. The agent staged that worktree's 129
entries as a recovery checkpoint without committing, pushing, accepting, or
mixing them into PR #16. The accepted convergence direction and evidence cutoff
are retained in the
[formal-operations transition Strategy Case](2026-07-15-formal-operations-transition-strategy-case.md);
the active return obligations live in the
[`formal-operations-transition` Mission Record](../../../operations/missions/formal-operations-transition.json).

The current order is: review and disposition the coherent current stage;
return PR #16 against that settled substrate; partition the staged legacy
experiments without bulk promotion; then present F4 and F5 to the Principal.
No new capability line, remote rule, merge, or worktree deletion is authorized
by reconvening alone.

## Exit and disconfirmation

The campaign is invalid if the current changes cannot be split into a coherent
baseline without a new unreviewed architecture decision. In that case, stop the
release transition and route the concrete gap to strategy, form guidance, or
artifact organization rather than hiding it in a founding commit.

When F5 passes, promote only the stable operating status into the relevant
design record and change this file to archived with links to the baseline and
shadow PRs. Do not retain an operations-preparation committee.
