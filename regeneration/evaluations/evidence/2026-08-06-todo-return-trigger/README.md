# Todo return-trigger transfer probe

**Status:** development packet freeze-ready; mechanical calibration,
delivery action probes, and arm-runner preflight passed; no external run
authorized
**Source practice:** [invalid Todo obligation-carrier development
run](../2026-08-06-todo-obligation-carrier/RESULT.md)
**Question:** does one event-timed re-presentation of an already-open companion
obligation improve return after a salient implementation branch?

This is the next smallest practice for H4 in the
[Agent harness control-debt inquiry](../../../../principles/research/agent-harness-control-debt-and-guided-recovery.md#h4--a-task-list-is-an-attention-carrier-not-a-universal-workflow).
It is not a prepared model fixture, an authorization request, or a claim that
periodic reminders are generally useful.

## What changed after the first run

The failed clinic probe bundled obligation wording, reopen conditions,
whole-task reconciliation, and mandatory Todo reads and writes. Its observer
also treated provider-shaped `rawSteps` as a stable protocol even though Work
Cell declares them as `unknown[]`.

The next comparison removes those two mistakes:

- Todo maintenance behavior is observed, not used as a semantic-admission gate;
- host-owned `record.trace` is the load-bearing action surface;
- the treatment changes one event only; and
- semantic completion remains an independent artifact judgment.

## Causal object

### Invariants

Use a materially different repository-maintenance task with:

- one salient adapter implementation repair;
- one non-adjacent conformance-fixture obligation that is easy to forget after
  the adapter works;
- the same pre-created external Todo in both arms, naming the concrete primary
  and companion obligations and their completion conditions;
- the same worker-visible task, model route, inference policy, tools,
  permissions, budget, workspace, initial Todo bytes, and settlement contract;
  and
- no required Todo read, update, checkbox transition, or terminal
  reconciliation.

The worker fixture is the bundled offline Northstar event-adapter maintenance
task under [`fixture/`](fixture/). Its exact candidate identity is recorded in
[`fixture.sha256`](fixture.sha256). The exposed clinic fixture is not reused.

### Independent variable

After the first mechanically successful, host-recorded write to the declared
primary implementation file:

- **treatment:** the harness emits one host-owned return-trigger event and
  re-presents the unchanged open companion obligation once;
- **control:** execution continues without that event.

The reminder must not add a new answer, stronger acceptance criterion, or
different Todo content. It only retrieves state already available to both arms.

### Primary outcome

The primary outcome is binary independent acceptance of the companion
conformance artifact against held-out source or protocol criteria. Primary-file
success, Todo wording, Todo completion, reminder acknowledgement, verbosity,
and style receive no credit.

Secondary observations may include Todo reads and writes, time and steps from
the primary write to the companion write, total usage, unsettled runs, and
artifact reconciliation. They describe a possible mechanism; they do not
replace the primary outcome.

### Protocol-validity boundary

Invalidate a run only when:

- execution identity or fixture identity is unmatched;
- a qualifying primary write occurred and the treatment event is then missing,
  duplicated, or delivered outside its declared position;
- the control receives the treatment event;
- the host observer cannot recognize its declared trace version; or
- an artifact that the Agent produced is lost by host retention, leaving the
  semantic reviewer without the candidate bytes.

Never reaching the qualifying primary write, ignoring the reminder,
independently reading or updating Todo, crossing over to the companion before
the trigger, failing to produce an artifact, producing a bad artifact, or
settling early are behavioral outcomes. Widespread spontaneous crossover may
make the field non-discriminating, but it does not retroactively invalidate
individual runs.

### Falsifier

Repeated matched runs weaken the explicit-trigger mechanism when the treatment
does not materially improve independently accepted companion completion beyond
within-arm variation, or when it materially increases interference, unsettled
runs, or completion burden. One transfer field cannot settle the broader H4.

## Observer contract

Deterministic code may verify only:

- launch, fixture, and execution identity;
- ordered host-owned tool starts and outcomes;
- read/write paths and declared trigger position;
- artifact existence and recorded hashes;
- settlement shape;
- byte-exact equality and equality after removing exactly one terminal LF as
  separate facts; and
- whether an external judge actually ran, rather than merely being configured.

An independent reviewer judges artifact truth, completeness, conformance,
cross-artifact consistency, and companion-obligation acceptance. Code must not
encode those semantic decisions as keyword or phrase predicates.

The observer fails visibly on an unknown or absent required trace surface. It
does not silently fall back to zero events or reinterpret provider `rawSteps`.

## Prepared fixture and delivery

The primary obligation repairs `src/adapters/northstar-job-event.ts`. Two of
four bundled tests initially fail because the adapter collapses non-retryable
failure and cancellation into success. The sole companion obligation repairs a
non-adjacent `case-07.json` conformance example that the tests never read. The
example is valid JSON but initially projects that same non-retryable failure as
success.

This is intentionally not a hidden-answer puzzle. The worker sees the short v2
protocol, task, tests, and the identical two-line Todo in both arms. The held-out
[companion rubric](evaluator-only/companion-review.md)
only tells an independent reviewer how to judge semantic agreement; no code
predicate substitutes for that judgment.

The generic AI SDK driver adds one protected identity decorator after a
successful `write_file`. Its default behavior and ordinary result shape are
unchanged. The probe-local [`ReturnTriggerDriver`](return-trigger-driver.ts)
owns all treatment policy:

1. wait for the first successful write to the exact primary path;
2. emit `experiment.todo_return_trigger.delivered` once, retaining only path,
   version, and obligation hash in host trace; and
3. add the unchanged companion obligation to that write's tool result so the
   next model step receives it.

Failed writes, control runs, later writes, and settlement before the primary
write do not deliver the trigger. The order is `agent.tool.started`,
`tool.write_file`, the treatment event, then `agent.tool.finished`.

This seam solves event-timed delivery without a reminder framework, daemon,
run restart, provider-shaped trace parsing, or semantic checking. The
probe-local [`run-arm.ts`](run-arm.ts) now binds an explicit typed arm: control
constructs the unchanged base driver and treatment constructs
`ReturnTriggerDriver`. Both construct one normalized Cell input identity from
the same verified fixture; the arm never enters the initial model input. Do not
replace this with the generic `instruction-carrier` or `execution-profile`
comparison axes, and do not infer an arm from call order or instruction text.

[`packet.json`](packet.json) fixes the runner, delivery driver, shared driver
seam, aggregate Work Cell source-tree identity, fixture manifest, local probes,
model and inference policy, Cell input template, and evaluator-only companion
rubric. `run-arm.ts --preflight` verifies those identities and every fixture
file without constructing a live model driver or making a network call. Each
live invocation repeats the source-tree check, verifies a fresh fixture copy,
and retains the explicit arm, packet hash, observed source-tree hash,
normalized input identity, structured protocol-validity classification, final
candidate bytes, and full Work Cell record. Fixture verification rejects extra
files as well as missing or changed files. A protocol-invalid run is written
before the runner returns a non-zero status, so anomalous trace, usage, and
artifacts survive. The renewed independent [`freeze_ready`
record](FREEZE-REVIEW.md) identifies the corrected packet and explicitly
supersedes the earlier incomplete runtime-identity review. It does not authorize
an external run.

## Local probes

### Retained trace observer

The local probe reads two retained records from the prior run. It proves that
the host trace can distinguish an obligation-arm sequence with a Todo update
between primary and companion writes from a ceremony-arm sequence that groups
those writes. It also proves visible failure for an absent trace, an unknown
file target or outcome, mismatched tool lifecycle names, duplicate finishes, or
divergent lifecycle and operation paths. It then reports settlement equality
without normalizing away the byte difference.

From the repository root:

```bash
cd regeneration/evaluations/evidence/2026-08-06-todo-return-trigger
bun return-trigger-action-probe.ts
bun trace-observer-probe.ts
bun run-arm.ts --preflight
```

The first command proves identical initial model requests containing the same
task and Todo context, one treatment-only post-write re-presentation, unchanged
base-driver control results, one-shot
delivery across a duplicate write, and no delivery after a failed write or
early settlement. It also rejects an extra fixture file and classifies a
protocol-invalid trace without throwing. It
uses a local mock model and makes no network call. The second command retains
the prior host-trace discrimination probe. The third verifies the complete
development packet and reports `externalModelCalled: false`.

Fixture calibration is separate:

```bash
cd regeneration/evaluations/evidence/2026-08-06-todo-return-trigger/fixture
shasum -a 256 -c ../fixture.sha256
bun test
```

The hash check must pass. The candidate defective baseline must then report
exactly two passing and two failing tests. In a disposable copy, changing the
adapter's normalized kind to the declared outcome and reconciling case 07 from
`succeeded` to `failed` yields four passing tests. The repository fixture
remains defective by design.

The shared Work Cell adapter was checked from `packages/work-cell` with
`bun run typecheck` and `bun test test/ai-sdk-driver.test.ts`; typecheck and all
30 focused tests passed.

Passing these probes does not authorize or validate a new model comparison.
Local calibration proves an executable primary repair but cannot prove that the
companion is not already a control ceiling. After independent freeze review and
Principal authorization, run control development calibration first. If
independent companion acceptance is near-universal, retire this fixture before
causal comparison; if primary repair is uncommon, retire it as an execution
floor. Do not weaken either gate after seeing arm results.

An authorized single-arm run has this interface:

```bash
bun run-arm.ts <control|treatment> <absolute-fixture-copy> <absolute-output-json>
```

Use a separate untouched fixture copy for every run. The runner deliberately
does not judge artifact meaning; apply the packet-pinned evaluator rubric in an
independent review after retaining the candidate bytes.

The retained trace observer passed with script SHA-256
`b9b6dd6e20f5f4eb9ffa11dd6a875da0756deee05d9c9a54dc9467a13717835a`.
It distinguished the two known write sequences, rejected empty and malformed
trace shapes—including path divergence—and reported both settlement fields as
byte-unequal but equal after removing exactly one terminal LF. It performed no
semantic judgment or external model call.

The new action probe passed with script SHA-256
`0c447e4167ba74915ee0aef0c7adea08383d6094a6d6995d5589c5fe8ae5bbae`.
The probe-local driver SHA-256 is
`8ca4d3fe7505124f6d55c48523b31e61931523c76dd8354369cf97b0cd377787`.
The shared driver containing the default-identity seam had SHA-256
`00570628047b4d403030476546d219f67158bbb20fb39041c7f2fdc02f519637`
at this checkpoint.
The complete regular-file tree under `packages/work-cell/src` had aggregate
SHA-256
`0925d6883d4d5207b4b5548dc45511089e008eaf9a787d95ec811c3e4b4605bb`;
the runner checks this identity before preflight or execution.

The explicit arm runner SHA-256 is
`349e2c7b6270eaa3c6d65811541b3085ba295e5d6d9c90740107bd9791151dbe`.
Its exact-fixture and protocol-classification contract SHA-256 is
`10683a6111f58dd3dbbc7be137f7ec3023ed34b8693a8f7fd7e42abc12e0c005`.
Its verified packet SHA-256 is
`390eb770044b6e9462105679488e3bc38e955f54d93d36e52cfd85cf4460ad04`.
The packet pins the evaluator-only companion rubric at
`c4a26dd0aadf167133bb5a318586d33374b3951fa1990c296f7edf0679e82bda`.
