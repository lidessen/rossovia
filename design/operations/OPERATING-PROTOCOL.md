# Human-Initiated Operating Protocol

**Status:** preparation protocol
**Authority:** [decision 015](../decisions/015-human-initiated-formal-operations.md)
**Active trigger:** a human-authorized Codex or comparable agent session

## Operative boundary

This protocol starts only after the principal asks an agent to act in the
repository. The agent begins from `AGENTS.md`, accepted design, current
evidence, [the founding mandate](../FOUNDING-MANDATE.md), and the smallest
relevant skills. It may form a temporary working team; it does not become a
resident manager or poll for work.

Scheduled jobs, GitHub Issues, comments, webhooks, and other future events are
intake proposals only until separately designed and shadow-tested. They cannot
cause acceptance, budget release, merge, or a change to accepted design.

## Mission route

| Movement | Minimum input | Responsible seat | Required output | Stop / handoff |
|---|---|---|---|---|
| Mandate | human request, scope, hard constraints | Principal | mission mandate and named decision | insufficient scope returns to principal |
| Formation | mandate plus source evidence | Session convener | selected skills/roles and handoff fields from decision 012 | no universal preflight |
| Plan when material | settled phase or choice with different commitments | strategic/work-estimation advisers | proposed Strategy Case or Work Estimate with envelope/continuation boundary | human approval before executable mission |
| Execute | approved mission, acceptance, branch/worktree bounds | Execution owner | branch-local diff, Work Cell trace where used, and check results | unresolved work remains explicit |
| Verify | proposed diff and acceptance | independent AI reviewer | mechanical result plus traceable AI review packet | failure returns to execution or principal |
| Integrate | accepted review and human decision | Integration steward + Principal | merged PR, rejected/closed PR, or return-to-work record | only principal decides merge |
| Learn | a traceable failed check, drift, or phase result | correction formation | smallest routed next practice and reopening observation | no automatic protocol/skill amendment |

At every material human gate, the producing role delivers a
[Principal Decision Brief](DECISION-BRIEF.md): recommendation, consequential
options, immediate result of each option, tradeoff/reopening signal, and a
compact reply key. It must not send a bare approval request that requires the
Principal to reconstruct the available choices. The brief is presentation; the
named source and human authority remain unchanged.

For a small, reversible local edit, the principal may declare that it remains
outside shared integration. The moment work must survive a session, affect an
accepted source, involve another reviewer, or be shared remotely, use the
branch/PR path below.

For a material mission that can survive multiple sessions or fork into more
than one line of work, create one Git-tracked [Mission Record](../../operations/missions/README.md)
before opening the first side branch. It records the mainline contradiction,
acceptance, and each branch's source, return condition, and eventual mainline
delta. It is not required for the local edit above and does not create a task
queue.

## Worktree and branch protocol

1. Start from an updated `main` in a **clean integration worktree**. Do not
   make a new mission worktree from the current founding-dirty checkout.
2. Name one bounded branch `mission/<slug>` (or `founding/<slug>` during the
   campaign) and create one sibling worktree, for example:

   ```text
   git worktree add -b mission/<slug> ../skills-worktrees/<slug> origin/main
   ```

3. Record the mandate, branch, worktree path, acceptance, verifier, and
   proposed budget/continuation gate in the PR template or its linked durable
   record. One active agent writes one branch at a time.
4. Run the declared local checks before opening a PR. Push only the mission
   branch; never use an agent session to push `main`.
5. Open a PR into `main`, preserve failed checks and review observations, obtain
   independent AI review evidence, and present its compact packet to the
   Principal for confirmation. A green check is necessary evidence, not
   acceptance; see [decision 023](../decisions/023-ai-review-evidence-and-principal-confirmation.md).
6. After merge, rejection, or explicit abandonment, retain the PR and any
   promoted evidence, then remove the merged/abandoned worktree:

   ```text
   git worktree remove ../skills-worktrees/<slug>
   git worktree prune
   ```

No two mission worktrees may edit the same accepted source without an explicit
scope split and named integration order. If that split cannot be stated, keep
the work serial.

## Mission continuity safe points

After a material branch settles, before switching to another branch, and before
presenting a phase-complete or merge decision, inspect the active record:

```text
python3 scripts/mission-record.py status <mission-id>
python3 scripts/mission-record.py check <mission-id> --git
```

A branch returns only through `integrate`, `no-change`, or `abandon`, each with
a recorded mainline delta. A useful but unfinished branch stays `suspended`
with a reactivation signal. Do not call a material mission complete while an
open, integrating, or suspended branch remains. When the record's final settled
state is committed, prune it rather than retaining a permanent task archive.

## Planning, naming, and budget

Use `strategic-advisory` only when a settled phase or material condition needs
a multi-horizon human choice. Its long direction begins from the founding
mandate and must return to a bounded production condition rather than a slogan.
Use `work-estimation` before any material model, time, or money envelope. A
Work Estimate describes necessary work; an execution projection is uncertain
and profile-specific; a Budget Envelope is a human control, never an agent's
self-granted allowance.

A project or public concept name needs a shared-decision contrast and an
operative definition. Until the founding naming record is accepted, do not
rename the repository, package, or public identity merely to make the
operations documents look complete.

## Self-correction

| Signal retained in evidence | First route | What may change only after review |
|---|---|---|
| an acceptance/check failure or a forecast-envelope miss | `practice-cycle` | later practice or continuation decision |
| a decision-changing anomaly retained in the Chronicle | [event-triggered reflection sidecar](../decisions/019-event-triggered-reflection-sidecar.md) | one routed next practice; never an automatic retry or self-amendment |
| a recurring decision has no truthful carrier | `form-guidance` | a new artifact, skill, or runtime |
| an agent repeatedly misuses a method | `skill-engineering` | the owning Skill expression |
| context omits a governing boundary | `context-engineering` | context delivery; not source doctrine or runtime mechanics |
| source, lifetime, or projection is confused | `artifact-organization` | carrier layout or campaign transition |
| a phase settles or conditions materially change | `strategic-advisory` | proposed direction/capability/mission |
| existing P-IDs cannot bear a necessary decision | `principle-cultivation` | Sequence, by human adoption only |

The system senses retained observations, not agent self-descriptions. A single
signal starts a probe or routes a decision; it never automatically rewrites
the protocol, a Skill, or the Sequence. The reflection sidecar consumes only
the attention required to retain and route one anomaly after a main-task safe
point; it is not a standing self-analysis loop.
