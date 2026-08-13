# Supervised Autonomy Experiment

`@rosso/autonomy` is the project-local mechanism experiment for a supervised,
continuously steerable Mission. It preserves ordered human input, bounded Agent
turns, delegation evidence, interruption, reconciliation, and recovery without
granting the runtime semantic, acceptance, or publication authority.

Supervision is a transitional capability, not Rossovia's final operating form.
The Principal-directed draft
[autonomous collective-intelligence
program](../../design/AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md) investigates fully
autonomous collective operation with natural human interaction. This package
supplies evidence about sustained loops and recovery; it does not define that
future system by extending today's manual control surface.

**Current status:** the
[first-slice settlement](../../design/organization/sessions/2026-07-26-supervised-autonomy-first-slice-settlement.md)
recognizes this implemented and mechanically verified first slice as an active,
bounded experimental capability. The ordinary Rossovia operating mode remains
human-initiated.

## Ownership boundary

| This package owns | It does not own |
|---|---|
| append-only Mission input, turn, reconciliation, delegation, and recovery records | project purpose, doctrine, task discovery, or Mission eligibility |
| a local detached runner and its rebuildable status projection | remote or multi-user authentication, deployment, or a permanent manager service |
| stale-turn withholding, pause/stop propagation, quiescence waiting, and explicit recovery choices | arbitrary reversal of an in-flight tool effect |
| validation and lowering of already-prepared delegated contributions | semantic decomposition, Task Shape admission, provider policy, or result acceptance |
| one explicitly admitted isolated-worktree writable trial, its exclusive lease, safe tool projection, patch evidence, and independent-verification record | shared-worktree mutation, arbitrary commands, commit, merge, publication, or automatic acceptance |
| adapter-side validation and one-use consumption of an already-issued local execution receipt | Principal authentication, proposal authorship, choice collection, or receipt issuance |
| guarded settlement of one retained live-carrier anchor-migration proposal after receiving an exact ADOPT decision | interpreting conversational approval, offline carrier-death proof, reconciliation, or renewed semantic execution |
| one-use execution of an exact retained reconciliation-action decision through separate proposal and verification Cells, retained full-run evidence, and the guarded live runner commit | collecting the Principal reply, selecting provider policy, retrying an uncertain commit, or granting later product and integration authority |
| a project-specific adapter over Work Cell execution and orchestration | changes to the generic Work Cell contract |

## Capability-described workers

A host may enable `DelegateLoopSession` with `workerCatalog` instead of the
legacy `createDriver` path. That mode exposes one scheduling surface:

- `worker_list({ requiredLabels })` filters runnable cards by every hard factual
  label and returns provider/model identity, capability description,
  availability, and configured execution-profile ID. It never auto-selects.
- `worker_spawn({ workerId, ...semanticContribution })` explicitly selects one
  worker while preserving the existing semantic contribution. Listing first is
  optional. The host verifies that the selected card carries the contribution's
  `capabilityNeed`, preparation retains `workerId` on the Cell, ordinary
  admission checkpoints it, and Work Cell resolves the matching driver.
- `worker_spawn` may additionally carry `imagePaths`, an explicit list of
  workspace-relative local images. Their presence automatically requires a
  `vision` worker; the prepared Cell retains the paths, and Work Cell applies
  its declared read scope and post-`realpath` containment before constructing
  the model request.

Catalog mode does not expose `delegate` or `delegate_file`; legacy mode remains
unchanged. Current cards are host policy in `src/worker-policy.ts`; the generic
catalog mechanism lives in Work Cell.

The current host policy gives the Kimi Coding card a `vision` label and
describes image-plus-code work, while the DeepSeek Flash card remains text/code
only and has no `vision` label. `createCurrentWorkerCatalog` is a helper a host
may choose to install; this contract does not claim that the Rossovia CLI wires
it automatically. The bounded Kimi `k3` image-transport smoke is recorded in
[Work Cell's local image-input evidence](../../packages/work-cell/README.md#local-image-input-evidence).

`actorRef` and `sourceRef` retain attribution supplied by the host. They are not
independent authentication. Git, worktree, pull-request, and other external
effects require separate adapters and human gates; this package carries no
model-owned merge or publication credential.

## Supported first slice

The retained evidence supports these bounded mechanism claims:

- a detached local Mission can execute one prepared read-only contribution and
  retain parent/child settlement evidence;
- an explicitly selected trial may execute exactly one guarded writable Cell
  in a clean disposable linked Git worktree, using scope-bound `write_file`
  only and no model-controlled commands;
- before that writer starts, the host retains its base HEAD, clean-baseline
  digest, exact write scope, withheld authority, and a Workbench-home-wide
  exclusive lease; after quiescence it retains the full candidate patch,
  changed paths, before/after file hashes, outside-scope verdict, and Work Cell
  verification separately from independent and Principal acceptance;
- new external input advances an ordered watermark, withholds stale work at a
  safe point, drains an active child to actual settlement, and requires
  reconciliation before a successor turn;
- a graceful carrier restart preserves a partially reconciled input backlog;
- interrupted turns expose only the recovery actions explicitly supported by
  the selected runtime; `abandon` remains a runner capability, while `resume`
  and `replace` are never inferred merely because a runtime module exists;
- the Blog publication runtime supports only a settlement-only form of
  `resume`: it requires one already child-settled direct batch and one settled,
  launch-bound Git effect whose current HEAD, paths, file hashes, and patch
  still reproduce the retained evidence. It reconstructs a
  `needs-attention` turn settlement without invoking the parent model, child
  driver, or writer. Prepared, active, uncertain, or effect-only interruption
  remains unrecoverable;
- a guarded Principal action carries the expected runner identity and state
  into the same serialized runner request that records the input or recovery,
  so a replacement carrier cannot receive an action authorized for its
  predecessor;
- a bounded activity projection reports ordered Mission, turn, delegation, and
  writable-effect phase/tool/scope/diff/verification facts without copying
  file contents, contribution text, result text, or hidden model reasoning; it
  derives `intentLineage` from the complete Mission timeline before mixing in
  bounded turn activity, so `legacy-unanchored` carries the exact prior Mission
  event count and timeline digest required by guarded adoption rather than
  inferring lineage from cached runner state or `recentEvents`;
- the Blog runtimes retain the consumed execution authorization ID, proposal
  digest, and canonical claim reference as one structured launch reference on
  both the Mission turn and its prepared writable effect; a task-launched Blog
  publication also binds the same task-local context reference into the
  consumption claim and Mission turn, so a same-Mission task cannot reuse that
  lineage. Activity rejects a missing-one-side or mismatched pair and exposes
  matching evidence for an exact external join, while legacy descriptive
  `sourceRefs` remain execution-unproven;
- the Blog publication turn additionally retains digest-backed
  `guidanceRefs` for the exact Workbench corrections supplied at launch.
  Activity exposes only their identities and digests; Workbench can therefore
  distinguish launch guidance from a later correction without copying its
  text into runtime activity;
- a settled writable effect exposes `currentVerifiedResult` only as a
  runtime-owned selector after mechanical and independent verification pass,
  the independent report binds a subject, the changed bytes remain current,
  scope is clear, and uncertainty is absent. The selector retains the exact
  effect and `effect-verified` event IDs; arbitrary evidence-reference text,
  a low-level passed verdict without a subject, or stale bytes cannot form it.
  This projection grants no task acceptance, commit, merge, publication, or
  product authority;
- one proposal-only legacy migration brief may be retained beside the runner
  projection after binding a committed Mission source, candidate anchor, exact
  runner identity/state/liveness, and complete-history count/digest; activity
  marks target or history drift stale, while the brief carries no
  `authorityRef` and cannot be parsed as an adoption request;
- after a separately retained exact ADOPT decision, a current-protocol carrier
  can append that proposal-bound adoption and irrevocably enter shutdown in one
  serialized request before a status-proven no-runtime replacement starts;
- a proposal explicitly bound to a pre-upgrade carrier may instead authorize
  one disclosed compatibility saga: durably retain one proposal/decision/target
  attempt before any carrier observation or shutdown effect, request the old
  unguarded shutdown, verify its exact runner/PID/start/socket response after
  the effect, wait for that socket to disappear, retain attempt-bound retirement
  evidence, start a new no-runtime carrier, then submit a guarded adoption; an
  attempt without exact retirement or adoption permanently invalidates that
  proposal and decision, and reconciliation plus every external or integration
  authority remain withheld;
- a separately retained reconciliation-action proposal can bind one exact live
  runner, active anchor, next correction input, byte-addressed passed report,
  committed Mission source, explicit model/disclosure plan, conditional
  settlement, and three-choice Principal reply key without running a model;
  after one exact retained decision, the executor rechecks all five bindings,
  consumes one execution attempt, runs proposal and independent-verification
  Cells in different disposable read-only workspaces, retains their full passed
  records by digest plus every started failed Cell record in a separate
  immutable action-evidence store, and submits a guarded commit only for
  `continue` plus `verified-transition`; every other result returns to the
  Principal without advancing the watermark, while an uncertain commit response
  is reported as uncertain and never replayed automatically; a consumed attempt
  with no retained outcome projects as consumed rather than falsely returning
  to `authorized-awaiting-execution`, and a `reconciled` outcome is admitted
  only after re-reading its exact timeline event;
- a parent may reconstruct from one settled child's size-bounded semantic
  projection by batch and contribution key; a finished parent turn retains the
  read as a digest receipt and grants no general filesystem access; and
- delegate admission rejects invalid scope, dependencies, ownership, Task Shape
  evidence, and nested spawning before child execution begins.

See the
[read-only Mission probe](../../regeneration/evaluations/2026-07-21-flash-readonly-mission-runtime-probe.md),
[live-input probe](../../regeneration/evaluations/2026-07-21-live-mission-input-reconciliation-probe.md),
[queue/recovery probe](../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md),
[child-result reconstruction prerequisite](../../regeneration/evaluations/2026-07-26-autonomy-child-result-reconstruction.md),
and [independent PR 48 review](../../regeneration/evaluations/2026-07-21-pr48-independent-review.md).

## Claims not admitted

The current evidence does not establish:

- writable effects in a shared or non-disposable worktree, arbitrary
  model-controlled commands, automatic publication, or autonomous merge;
- replay or automatic cleanup of an effect left uncertain by process loss;
- automatic retry or adjudication of a reconciliation action whose one-use
  attempt or commit outcome is uncertain;
- automatic task discovery, semantic Mission completion, or fact admission;
- reliable recovery from an arbitrary process kill during a state transition;
- settlement of an unreachable legacy carrier without same-host verified
  carrier-death evidence;
- remote or multi-user operation;
- a generally reliable Flash-class primitive for formation, verification, or
  reconstruction; or
- lower cost or higher quality than an ordinary human-initiated Agent session
  on representative production work.

These are explicit non-capabilities, not missing details that a caller may
silently infer.

## Operator surface

From this package directory, the CLI is an experimental local operator surface:

```bash
bun src/cli.ts runner start <mission-id> \
  [--runtime <module-path>] [--anchor <seed.json>] [--home <path>]
bun src/cli.ts runner status <mission-id> [--home <path>]
bun src/cli.ts runner activity <mission-id> [--home <path>]
bun src/cli.ts runner shutdown <mission-id> [--home <path>]
bun src/cli.ts effect verify <mission-id> <effect-id> <verification.json> \
  [--home <path>]

bun experiments/agent-era-blog-effect-verifier.ts \
  principal-workbench-dogfood <effect-id> --home <path>

bun src/cli.ts mission input <mission-id> <text> \
  [--id <id>] [--actor <ref>] [--source <ref>] [--home <path>]
bun src/cli.ts mission prepare-anchor-migration <mission-id> <proposal.json> \
  --expected-runner <runner-id> --expected-state <runner-state> \
  [--expected-proposal-digest <sha256>] [--home <path>]
bun src/cli.ts mission settle-anchor-migration <mission-id> <decision.json> \
  --mission-source-root <git-root> [--home <path>]
bun src/cli.ts mission adopt-anchor <mission-id> <adoption.json> \
  --expected-runner <runner-id> --expected-state <runner-state> \
  [--home <path>]
bun src/cli.ts mission reconcile <mission-id> <commit.json> \
  --expected-runner <runner-id> --expected-state <runner-state> \
  [--home <path>]
bun src/cli.ts mission control <mission-id> <pause|resume|stop|approve-effect> \
  [--id <id>] [--actor <ref>] [--source <ref>] [--home <path>]
bun src/cli.ts mission recover <mission-id> <resume|replace|abandon> \
  [--id <id>] [--actor <ref>] [--source <ref>] [--home <path>]

bun run settle:agent-era-blog-reconciliation -- \
  --home <path> \
  --mission <mission-id> \
  --mission-source-root <git-root> \
  --project-id <stable-project-id> \
  --proposal-digest <sha256> \
  --choice <SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD> \
  --authority-ref principal:<identity> \
  --source-ref <kind>:<reference>
```

A trusted runtime module is selected by the operator at runner start. It is not
loaded from model-authored Mission input or a general plugin registry.
Semantic execution requires an authorized initial anchor. A runtime-bearing
carrier with no existing or supplied anchor fails before opening a turn. A
no-runtime carrier may remain `anchor-pending` only to expose status, shut
down, or accept one guarded legacy adoption. After adoption it becomes `idle`
when no input is pending; otherwise it exposes the applicable pending state.
`idle` means the carrier is reachable but has no runtime or current executor.
The adoption request must bind the exact prior event count and timeline digest,
start at watermark `0`, and pass the retained-history guards. It appends an
auditable adoption event and never rewrites the legacy events into a false
genesis.

`prepare-anchor-migration` writes only a local proposal beside the Mission
runner projection; it does not write the timeline, start or stop a carrier, or
mint adoption authority. The proposal's target includes observed liveness so
an unreachable-socket result cannot silently become a live-target decision.
When an exact proposal is superseded after drift, the caller must bind the
retained proposal digest with `--expected-proposal-digest`; an unrelated
proposal is never overwritten. Socket reachability must be observed from the
intended host boundary: a sandbox-denied socket request is environment
evidence, not proof that the carrier is dead.

`settle-anchor-migration` is a mechanical consumer of one exact ADOPT decision;
it does not infer the choice from a chat message or the proposal recommendation.
The decision binds the proposal digest and committed Mission source. The
operator rechecks that source path at the recorded Git `HEAD`, retains one
immutable decision per proposal, and rejects a different replay.

`ADOPT` is the retained internal anchor-migration protocol value, not a
Principle Sequence decision. The human-facing Workbench asks for
`AUTHORIZE MIGRATION`; only a trusted supervisor may normalize that exact reply
to `ADOPT` for the currently displayed proposal ID and digest. A principle
proposal or adoption remains outside this operator surface.

A proposal bound to `atomic-adopt-retire-v1` makes the exact old runner append
the adoption and retire in one serialized request before the operator starts a
replacement. A proposal bound to
`legacy-response-verified-shutdown-v1` is a different, explicitly non-atomic
five-step saga: the pre-upgrade carrier accepts only an unguarded shutdown, so
the executor first retains a no-clobber, fsynced one-use attempt bound to the
proposal, decision, protocol, and exact target. Only the process that created
that attempt may issue shutdown. It then verifies the exact runner ID, PID,
start time, socket, and stopped response after the shutdown effect, waits for
that exact socket to disappear, and retains deterministic retirement evidence
bound to the attempt digest before rechecking the unchanged timeline, starting
a carrier reporting `runtimeMode: "none"`, and submitting guarded adoption.
An orphan attempt, missing or mismatched response, socket uncertainty, target
drift, or timeline drift durably invalidates the proposal and decision; later
environment recovery cannot revive them. Only exact attempt-bound retirement
or exact adoption evidence permits crash recovery. A Mission-local settlement
lease prevents concurrent executors from creating duplicate replacements or
adoptions.

A retry accepts only the same decision, adoption, retirement evidence, and
status-proven no-runtime replacement. The command refuses an unproven offline
branch. Its result does not reconcile retained input or authorize a runtime,
disclosure, candidate write, commit, merge, publication, or product acceptance.

`settle:agent-era-blog-reconciliation` is the trusted project adapter for one
already displayed reconciliation proposal and one separately supplied exact
Principal reply. It rechecks the current proposal digest and committed Mission
source, including that its canonical root is the Workbench-registered primary
workspace rather than another same-HEAD worktree. A first `SETTLE_CONTINUE`
resolves the declared Codex path and compatible app-server version, then
re-observes the exact live runner, anchor, correction input, and passed report
before retaining the decision; the one-use executor repeats those live-state
checks before each Cell, disclosure, and commit. Each invocation uses the
app-server in a fresh minimal `CODEX_HOME`, a separate empty cwd, empty thread and turn
`environments`, empty dynamic tools and workspace roots, no provider fallback,
disabled web search, empty MCP configuration, and no attached environment-bound
shell or file tools. Browser, computer, app/plugin, multi-agent, and
image-generation features are disabled in the one thread policy rather than
duplicated in launcher flags. The runtime rejects early protocol EOF, bounds
shutdown with TERM-to-KILL escalation, drains and validates late messages
before terminal authority, and asserts that no instruction source, workspace
root, environment connection, server request, or undeclared item appears.
Codex's non-I/O plan tool remains built in, so the policy is
`app-server-no-environment-structured-output-plan-only-v1`, not tool-free or
terminal-only. The disclosed task packet contains the Cell ID, intent,
instructions, declared capabilities, context, acceptance criteria, terminal
contracts, and execution profile; it excludes the disposable workspace policy
and host budgets. The fixed system/developer instructions and output schema are
also disclosed. The final message is output-schema constrained; intermediate
reasoning is not. The allowlisted launcher environment and temporary auth copy
are process inputs but are unavailable to the model because environment access
is disabled. `HOLD` and `RECLASSIFY_CORRECTION` do not inspect the source or
runner, construct a Cell, or disclose data. Repeating the same decision returns
its retained outcome; a different replay is rejected. `authority-ref` and
`source-ref` preserve attribution but do not authenticate the Principal.

Workbench-originated mutations additionally supply paired
`--expected-runner` and `--expected-state` guards. The runner checks both in
its serialized request queue before retaining the mutation. A control `resume`
only releases the durable pause; the unreconciled pause and resume inputs leave
the Mission `input-pending` rather than proving production resumed.

The repository's first real writable adapter is
[`experiments/agent-era-blog-mission-runtime.ts`](experiments/agent-era-blog-mission-runtime.ts).
It requires the operator to supply `ROSSO_BLOG_EFFECT_ROOT` as one already
created, clean, detached linked worktree and
`ROSSO_BLOG_AUTHORIZATION_RECEIPT` as the absolute path to one strict local
execution-authorization receipt. `ROSSO_BLOG_PROJECT_ID` supplies the
environment-owned registered project identity; the portable runtime retains no
concrete deployment or local registration ID. Before creating a model driver
or writable effect, the runtime binds that receipt to the exact project,
Mission source, proposal digest, candidate `HEAD`, declared external
disclosure, choices, scope, budget, and the SHA-256 digest of the loaded
supervisor-owned runtime source, then atomically consumes its authorization ID under
`ROSSO_HOME/state/execution-authorization-claims/`; the immutable receipt remains
under `ROSSO_HOME/receipts/`, and the runtime never falls back to an
unreceipted run. The runtime records the resulting structured authorization
reference on its Mission turn and passes the same value into the prepared
effect journal; the activity projection fails closed if only one side is
present or their fields differ. Older turns whose free-form `sourceRefs`
mention an authorization are not upgraded into exact lineage. The worktree
variable selects location only; the runtime still fixes source, write scope,
task, acceptance, provider route, and withheld integration authority. Starting
it sends the declared Blog sources and bounded task context to its configured
external model provider. The effect journal never turns mechanical or
independent verification into commit, merge, publication, or product
acceptance.

After that Cell settles, the Blog-specific verifier derives the candidate
worktree, base HEAD, patch, manifest, and changed paths from the effect journal;
it does not accept those facts as caller arguments. It rechecks the retained
file hashes and reconstructed patch, discovers one installed sibling worktree
with the unchanged base package lock, and runs build, Drizzle migration, and
the [declared content-model contract](../../experiments/agent-era-blog/DESIGN.md#first-content-model-contract)
in a disposable snapshot. It checks the candidate again before appending its
own `effect-verified` event, which binds the verified Git HEAD and changed-file
hashes. A later same-path edit therefore makes the activity projection stale
instead of leaving a historical pass attached to new bytes. A pass admits only
`content-model-ready-for-next-slice`; it does not admit the reader/studio UI,
D1 runtime behavior, publication, or product acceptance. The generic
`effect verify` command remains a low-level journal operation and must not
replace this evidence-producing verifier for the Blog trial.

The next Blog slice uses
[`experiments/agent-era-blog-publication-runtime.ts`](experiments/agent-era-blog-publication-runtime.ts)
and its separately scoped verifier:

```text
bun experiments/agent-era-blog-publication-effect-verifier.ts \
  <mission-id> <effect-id> --home <ROSSO_HOME> \
  --browser-evidence <browser-evidence.json>
```

The verifier reuses the effect-owned worktree, manifest, patch, and
before/after byte checks, then requires the exact publication-v2 changed-path
scope, build, test, migration, and author-reader contract probes. Browser
evidence must cover anonymous desktop and mobile reading, protected studio
access, and exact-revision view continuity, and must bind the candidate HEAD
plus every current changed-file digest. Missing, malformed, or stale browser
evidence returns `unverifiable` and appends no `effect-verified` event. A pass
admits only `seeded-publication-roundtrip-ready-for-principal-review`; it still
withholds commit, merge, deployment, production publication, and product
acceptance.

The strict receipt reader accepts the current supervisor-mediated v1 contract
and the current Workbench-UI v2 contract. Both require `runtimeDigest`; an older
same-version record without it is malformed and cannot launch. V2 additionally
retains the local UI request and three acknowledgements with
`unverified-local-interaction`; neither version turns actor/source attribution
into Principal authentication.

## Verification

```bash
bun run typecheck
bun test
```

The Unix-socket runner tests require an environment that permits local socket
listening. A sandbox `EPERM` at `server.listen` is an environment limitation;
rerun the same tests in the intended local execution boundary before judging
the package. The same boundary applies to liveness probes: a socket unavailable
only inside a restricted harness is reported as unverified, not `live: false`.
Only an absent exact socket or a refused connection proves the carrier
unreachable; start, mutation, and migration remain fail-closed when
reachability cannot be verified.
