# Todo obligation-carrier development probe

**Status:** prepared; live development run pending  
**Hypothesis:** an external todo helps long work when it preserves concrete
obligations and return conditions, not merely because a checklist exists  
**Frozen repository baseline:** `83f210891e8e08777dc789213ef746e81c0ed327`
plus the probe-declared Work Cell runtime diff identity below  
**Execution mechanism:** Work Cell model-evaluation v3 instruction-carrier axis
through a probe-local driver factory that fixes Task tools to read-only

This is a development probe of one mechanism proposed in the
[Agent harness control-debt inquiry](../../../principles/research/agent-harness-control-debt-and-guided-recovery.md#todo-or-task-state).
It does not establish that every task needs a todo, that Work Cell Task state is
semantically correct, or that one carrier generalizes across models and tasks.

## Question

With the same model, route, task, visible obligations, tools, budget, workspace,
number of todo items, and todo-update cadence, does a todo that names actual
work obligations and reopen conditions improve return from a salient primary
artifact to a companion obligation compared with a todo that records only
generic phases?

The comparison is deliberately not `todo versus no todo`. Both arms externalize
three items and must revisit them after each artifact write. The independent
variable is whether the carrier preserves the task's governing obligations or
only process ceremony.

## Fixture

The fixture reuses the source and draft from the retained
[clinic-notice document-writing evidence](../../2026-07-23-document-writing-probe.md#held-out-clinic-notice)
and adds a stale `appointments-index.md`. The promotional draft is the salient
depth-first branch. The companion index is the observable return obligation.

Both arms may change only `draft.md`, `appointments-index.md`, and `todo.md`.
The evaluator checks source fidelity and agreement between the first two; it
does not score todo wording, completion markers, Task API use, verbosity, or
style.

## Carriers

The [semantic audit](semantic-audit.md) records the shared mechanics and the
single intended difference:

- `arm-obligation` names the primary artifact, companion return obligation,
  whole-task reconciliation, and their reopen conditions;
- `arm-ceremony` names Prepare, Execute, and Finish with the same create,
  revisit, and status-update cadence.

The fixture, carriers, evaluator-only criteria, and failure classes are frozen
in [`model-evaluation.json`](model-evaluation.json). The
[`run-development-probe.ts`](run-development-probe.ts) entry uses the ordinary
model-evaluation runtime but supplies one probe-local driver policy:
`taskToolSet: "read-only"`. This prevents either arm from manufacturing a second
Task carrier while leaving the generic Work Cell and model-evaluation contracts
unchanged. Work Cell pins the fixture snapshot, alternates arm order across four
repetitions, retains route and backend observations, and withholds carrier
identity from the blind judge packet.

The instruction-carrier runtime is not yet part of the frozen Git baseline. The
runner therefore fails before a model call unless all of these identities hold:

- repository `HEAD` is
  `83f210891e8e08777dc789213ef746e81c0ed327`;
- the only tracked changes under `packages/work-cell/src` are
  `adapters/model-evaluation/runtime.ts` and
  `adapters/model-evaluation/judge.ts`; and
- their binary Git diff from that baseline hashes to
  `a2f6ad23063067fd068832e8b87dab08cdff642a42647ba713a704769c228d20`.

It also verifies every load-bearing packet hash declared in
[`launch-identity.json`](launch-identity.json) and recomputes the actual composite
fixture digest instead of trusting the manifest declaration.

Before the first external model call, the runner writes the exact
`runtime.patch` and observed launch identity into a unique `results/launch-*`
directory. After execution it copies both beside the Work Cell record. The
baseline plus that patch reconstructs the mechanism used by the run. Any later
source change requires a new review and identity; the runner must not silently
bless it.

The ordinary model-evaluation judge is locally deferred. After all workers
finish, the runner reads the actual final artifacts, checks that settlement
strings equal their bytes, and checks the neutral Todo protocol: one initial
three-checkbox carrier followed by a Todo read and update after every requested
artifact write. Invalid runs become `inconclusive`. Only then does the semantic
judge receive a neutral packet containing only the final notice, index, and
protocol validity; it receives no worker final prose, settlement prose, Todo
path, Todo hash, carrier identity, or Todo content.

## Interpretation contract

- **Strengthen:** the obligation carrier repeatedly completes both artifacts
  faithfully while the ceremony carrier exhibits branch-only or cross-artifact
  failure, without materially higher unsettled runs or semantic invention.
- **Weaken:** actual completion and return behavior are materially tied while
  obligation-specific upkeep is higher, or the ceremony carrier performs
  better.
- **Leave open:** both arms hit ceiling or floor, execution identity differs,
  results differ only in todo language or status, or unsettled runs prevent a
  valid comparison.

One development comparison cannot confirm the general Todo hypothesis. A
separating result must later transfer to a different task field. A ceiling
result retires this fixture rather than inviting verdict-shopping reruns.

## Run

From `packages/work-cell`:

```bash
cd ../../evaluations/evidence/2026-08-06-todo-obligation-carrier
shasum -a 256 -c fixture-files.sha256
shasum -a 256 semantic-audit.md
bun run-development-probe.ts --preflight
bun run-development-probe.ts
```

Raw records are written to `results/`. They remain candidate evidence until an
independent source-aware review compares the generated artifacts with the
fixture. The model judge is review evidence, not acceptance authority.

Do not replace the probe-local runner with the general `model evaluate` CLI for
this comparison. The current CLI does not project the manifest's descriptive
`toolSurface` field into `taskToolSet`; its default `manage` surface would permit
a second Task carrier and change the tested object.
