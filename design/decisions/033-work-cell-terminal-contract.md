# 033 — Work Cell Terminal Contract

**Status:** implemented and verified
**Date:** 2026-07-15; Task system replacement 2026-07-21
**Approved by:** principal

## Concrete pressure

A Work Cell may declare caller-defined `terminalTools`, an `outputSchema`, and
required artifacts as independent work-proof conditions. It may also seed a
small host-owned Task set as execution memory.
The AI SDK driver
previously asked for another free-text response after every terminal call and,
when the main loop exhausted its steps, started a recovery loop with only the
empty final text rather than the accumulated tool context.

An independent review rehearsal exposed both failures. A reviewer used every
main-loop step for investigation, so recovery invoked `submit_review` without
the evidence it had gathered. The terminal payload correctly reported an
incomplete review, while the following free-text step invented findings against
files that did not exist. The Cell was mechanically marked passed even though
the readable report contradicted its authoritative terminal action.

## Decision

Keep the work-proof declaration flat and give each condition one clear runtime
meaning. Do not add a `resultContract`, `workProof`, or review-pack wrapper:

- `terminalTools` declares a one-of action contract. Exactly one declared tool
  must be called. Its caller-defined input is retained in the trace and is not
  silently reinterpreted as `outputSchema`.
- Without `outputSchema`, a valid terminal call ends the model loop immediately.
  The driver creates only a deterministic readable summary when the provider
  emitted no text; it does not ask the model to narrate or revise the action.
- With `outputSchema`, the terminal call satisfies only the action contract. One
  tool-free step may then produce the independently validated logical output.
- Artifacts remain workspace evidence verified by `runCell`; neither a terminal
  input nor a structured output implies that a file exists.
- `tasks` optionally seeds concrete `{ subject, description }` work. The host
  assigns stable IDs and owns full Task state: `pending | in_progress |
  completed`, optional owner, and dependency IDs. The common Task kernel exposes
  `task_create`, `task_update`, `task_list`, and `task_get` through a host-chosen
  projection. A manager may use all four, an assigned executor may read shared
  task context but update only its own status, and a reviewer may only read.
  Forbidden actions are absent from
  both the tool set and update schema; prompts are explanatory, not authoritative.
  Once a Cell has tasks, it settles only when none remain pending or in progress.
  Do not mirror every instruction or acceptance condition into tasks, and do not
  make simple work manufacture a task list.

These checks answer only **whether a declared observable is present**: a tool
was called, an output has the declared shape, a file was created or changed, or
an activated Task cycle settled. A `passed` Cell record means this mechanical
work proof passed. It does not mean the action, output, artifact, or Task claim
is correct.

Task settlement is low-cost process evidence within that proof, not evidence
that the underlying work occurred or is correct. [Eve's replaceable todo
projection](https://github.com/vercel/eve/blob/main/packages/eve/src/runtime/framework-tools/todo.ts)
and [Codex's short plan/status tool](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/plan_tool.rs)
show why visible work reduces omission risk. [Claude Code's Task
tools](https://code.claude.com/docs/en/agent-sdk/todo-tracking) show how stable
IDs, dependencies, ownership, and separate create/update/list/get operations
extend that value into multi-agent coordination. This project uses one Task
kernel in both Cell and Mission layers, while each host projects only the tools
that role is allowed to use. Task state cannot admit a delegate by itself or
prove correctness; it remains coordination and process evidence.

Correctness belongs to a separate Agent judgment against the task, sources,
acceptance, and retained evidence. The generic runtime neither encodes that
judgment in a schema nor requires a universal review packet. A domain reviewer
may return the smallest useful finding or disposition through the same simple
tool/output/artifact mechanisms; partitioned review packets remain optional
domain evidence for changes whose scale actually requires reconstruction.

The main loop reserves one final action step for a terminal-only Cell and a
second tool-free result step when `outputSchema` is also declared. Ordinary
tools are disabled during that phase, and a sole terminal tool is explicitly
selected rather than merely requesting an unspecified tool. If a provider
still repeats a previously visible ordinary tool or the main loop otherwise
ends without the action, a bounded recovery loop receives a compact projection
of every successful tool result from the original trace, retains the prepared
task instructions and context that give those results meaning, and exposes only
the declared terminal tools. It does not replay old tool-call messages that the
provider could imitate, and it folds exact duplicate tool results without
discarding distinct partial reads. A rejected late action does not erase earlier
evidence; the recovery must not restart the task from an empty summary, invent a
new meaning for the terminal schema, or claim that retained reads never occurred.
The original trace and Cell input remain the evidence sources; the recovery
context is their rebuildable action-oriented projection.

This is presence proof, not semantic acceptance. A `submit_review` payload or a
completed Task may still be unsupported or false; the designated Agent reviewer
must judge it against the evidence before a host or human accepts the result.

## Rejected alternatives

- **Hardcode `submit_result` or `final_output`.** Tool names and input schemas
  belong to the caller; the generic driver only enforces the declared one-of
  contract.
- **Make terminal input equal structured output.** Some terminal tools are
  actions such as approve, reject, or escalate, while the logical result is a
  separate report. Coupling them removes valid combinations.
- **Trust a prompt to make the model stop.** Two live review attempts consumed
  every allowed step without submitting. A protocol cannot depend on the model
  voluntarily following a prose reminder.
- **Accept any terminal tool calls.** Calling both approve and reject is not a
  valid one-of disposition and now fails the Cell protocol.
- **Reference a separate named result contract.** The actual flat Cell fields
  are already inspectable and enforceable; an opaque reference duplicates them
  without proving anything.
- **Require a generic review pack for correctness.** Correctness is a semantic
  Agent judgment whose smallest useful evidence depends on the domain and risk.
  A mandatory pack adds production and reading cost without improving the
  mechanical proof.

## Verification

- A deterministic driver probe shows that the sole terminal tool is explicitly
  selected during the action phase, an attempted late read is not executed, and
  the loop stops immediately after the terminal call.
- An AI SDK probe calls two terminal tools in one step and observes an immediate
  failure plus `terminal.contract.violation` evidence. An independent generic
  driver returns both calls and `runCell` settles `protocol_error`, confirming
  that final contract authority does not belong to the adapter.
- Input validation rejects duplicate terminal names, and the AI SDK adapter
  rejects a terminal name that collides with an ordinary execution tool before
  model dispatch.
- Existing recovery and simultaneous `terminalTools + outputSchema` probes pass
  while retaining usage from both loops.
- Deterministic and AI SDK probes show that Task seeds receive stable IDs, an
  unseeded Cell can create and settle tasks, simple work can omit them, and an
  unsettled task fails mechanical work proof. A restricted execution probe sees
  list/get/update but no create tool, and its update schema cannot mutate task
  content, owner, or dependencies. A delegate-loop probe creates a Task before
  delegation, checkpoints its binding, and completes it after child settlement.
- A provider-behavior probe repeats an ordinary read despite a terminal-only
  final tool surface. The read is not executed, recovery retains the three
  earlier successful results, and the terminal action settles from that
  evidence instead of reporting an empty investigation.
- A live terminal-only review retained a valid tool payload but AI SDK's absent
  structured-output getter raised `No output generated`. The adapter now reads
  structured output only when `outputSchema` is declared; a live replay settles
  the same terminal form as passed without inventing another output contract.
- The [independent review record](../../regeneration/evaluations/2026-07-15-work-cell-orchestration-independent-review.md)
  retains the failed forms and fabricated findings, then a stronger-model
  correction review that submitted `ready` from the primary loop without
  recovery.
- The [cognitive-modeling evaluation](../../regeneration/evaluations/2026-07-15-code-review-cognitive-modeling.md)
  retains the terminal projection failure, its source payload, and the corrected
  provider replay.

Reopen this decision if a provider cannot reliably express an explicit tool
choice, if preserving response messages makes recovery exceed a real context
boundary, or if a caller needs terminal payloads promoted into a typed public
record rather than retained in trace evidence.

## Sequence expression

- **P16:** completion form must let the executor perform the promised action;
  prose that merely asks it to stop is not a functioning protocol.
- **P14:** the terminal call and its payload are retained source evidence;
  readable final text and verification summaries remain projections.
- **P15 / P08:** change only the failing closure path and keep disconfirming
  probes for late ordinary actions, double termination, and contextless recovery.
