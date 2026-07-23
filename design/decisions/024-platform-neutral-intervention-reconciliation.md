# Decision 024 — Platform-neutral intervention reconciliation

**Status:** first shadow/assist binding implemented; guarded-write remains proposed
**Date:** 2026-07-12

## Context

Recent design work exposed a repeated failure: a Principal correction can
invalidate a live assumption, but the next implementation can treat it as a
local patch rather than a new hard constraint. The effect is visible when
independent contracts become coupled, a dependency is added before the existing
capability is checked, or rejected compatibility paths survive a repair.

[`practice-cycle`](../../skills/practice-cycle/SKILL.md) already owns the
judgment after an observed practice changes what should happen next. It does
not own lifecycle interception, tool configuration, or session state. A coding
tool's hooks can provide some mechanical boundaries, but their event names,
configuration syntax, trust model, and coverage vary by tool and release. For
example, [Codex hooks](https://learn.chatgpt.com/docs/hooks) currently provide
user-prompt observation, context injection, named-tool interception, and stop
continuation, but also state that only command handlers execute today and that
interception is incomplete.

The needed design is not a Codex configuration recipe. It is a portable
contract bound to a current tool only after consulting that tool's official
documentation.

The first binding is project-local and intentionally limited to
`prompt_observation` and `context_injection`. Its portable state commands live in
[`operations/workbench`](../../operations/workbench/src/interventions.ts); the
Codex projection at [`.codex/hooks.json`](../../.codex/hooks.json) and its thin
Bun adapter retain the current platform-specific lifecycle shape. The binding
stores a prompt SHA-256 and byte count, not prompt text, under session-local
state outside the repository. Its direct tests cover state, receipt shape, and
adapter context injection; they do not claim that Codex has yet trusted or run
the project hook in a live session.

Session identity and state ownership are separate. A platform adapter supplies
the former; Rossovia Workbench owns the latter under
`$ROSSO_HOME/state/interventions/`. A binding must not place Rossovia state in a
vendor configuration directory merely because that vendor emitted the session
identifier. When a sandboxed runtime needs access, its projection grants the
smallest supported writable root instead of moving the state to a vendor home.

## Decision

Adopt an **intervention-reconciliation contract** as a runtime-facing
projection of the existing practice-cycle method.

It has no semantic authority, does not classify human intent as fact, and does
not accept work. It retains only the state needed to ensure a material
correction is reconciled before a mutation claims to implement it.

### Portable capability contract

The portable layer names capabilities, never vendor event names or config
syntax:

| Capability | Required effect | Fallback when absent |
|---|---|---|
| `prompt_observation` | observe a new Principal message with session/turn identity | agent evaluates normal conversation context |
| `context_injection` | place a pending-reconciliation reminder in agent context | ordinary agent instruction only |
| `mutation_gate` | prevent a declared mutation while a receipt is incomplete | advisory warning; never claim enforcement |
| `stop_continuation` | request another pass when a mutation leaves a receipt incomplete | retain explicit unresolved state for the next turn |
| `session_state` | retain active anchor and receipt status outside project source | session-local ephemeral state |

No platform is assumed to implement every capability. A binding states its
effective guarantee: `advisory`, `guarded-write`, or `full-lifecycle`. A missing
capability lowers the guarantee; it never authorizes an invented substitute.

### Reconciliation state

```text
active task context → observed intervention → correction receipt | unresolved
```

An accepted receipt contains only:

```json
{
  "rejected_assumption": "what is no longer valid",
  "new_invariant": "what may no longer be violated",
  "affected_surfaces": ["contract", "runtime", "test", "document"],
  "next_probe": "smallest observation that could show the new reading is wrong"
}
```

This is a trace of a changed task constraint, not a new decision source. The
Principal message remains authority; later summaries are projections. The
assist-only binding does not duplicate the active task as a second persisted
anchor or materialize candidate/settled workflow states. The active Agent owns
the semantic comparison; the runtime stores only privacy-preserving observation
evidence and explicit receipts.

### Role boundary

| Role | Owns | Does not own |
|---|---|---|
| Principal | correction, target, acceptance | mechanical state bookkeeping |
| Context-equipped agent | semantic comparison of active anchor and new message; invoking `practice-cycle continue` | self-acceptance of changed work or ownership of context delivery mechanics |
| `practice-cycle` | receipt, next smallest practice, disconfirming observation | hooks or tool configuration |
| Rossovia Workbench | state location, privacy-preserving observation record, receipt persistence | platform lifecycle, interpretation, acceptance |
| Hook binding | platform session identity, observation delivery, context injection, conditional mutation gate | choosing Rossovia state location, interpreting corrections, accepting design |
| Verifier | checks resulting change against the receipt | changing the Principal constraint |

The hook must not use fixed phrases as the definition of a correction. It may
classify a message as a **candidate** only. The agent has the active task
context and performs the comparison; uncertainty routes to clarification or an
advisory receipt rather than a silent hard block.

### Platform bindings

Each coding tool receives a short binding record produced at configuration
time, not shipped as core doctrine:

```text
platform and checked version
official documentation entry points and checked date
available portable capabilities and effective guarantee
state access mechanism and trust model
local configuration projection path
known coverage gaps
```

The stable collection retains only documentation entry points and capability
questions. It must not retain copied event names, payload fields, TOML/JSON
shapes, or examples as portable behavior. The binder consults current official
documentation, creates a local configuration projection, and records the
observed capability result.

For Codex, the current starting sources are the [Hooks guide](https://learn.chatgpt.com/docs/hooks)
and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
They are entry points for a later binding, not a claim that another tool has
the same lifecycle surface. The current binding requires an accepted user-level
`sandbox_workspace_write.writable_roots` grant or a per-session `--add-dir`
launch option for the Rossovia home. The repository projection does not grant
access to a user home on the user's behalf.

### Deployment order

1. **Shadow:** record candidate corrections and receipts; never block a tool.
2. **Assist:** inject a context reminder for a candidate correction and require
   a receipt before the agent claims design completion.
3. **Guarded write:** only after replay evidence shows acceptable false-positive
   and false-negative rates, block configured mutation tools while a material,
   acknowledged receipt is incomplete.
4. **Full lifecycle:** add stop continuation only when a binding proves it can
   avoid loops when the correct next action is to ask the Principal a question.

An optional low-cost model classifier may assist the observer only after the
shadow record supplies labeled false-positive and false-negative evidence. It
never replaces the active agent's semantic comparison, and classifier failure
must lower the guarantee to advisory rather than block work.

## Principle expression

- **P02:** a binding checks current tool documentation instead of inferring
  feature parity from another coding agent.
- **P03:** a Principal correction changes the next practice through an explicit
  receipt rather than merely adding another message to history.
- **P11 / P13:** a hook may enforce a mechanical precondition but cannot
  interpret, accept, or commit corrected work.
- **P14:** tool configuration is a rebuildable projection of official
  documentation, not a second method source.
- **P15 / P16:** begin with the smallest interoperable contract and use an
  adapter only where it lets the actual coding agent act without vendor plumbing
  becoming doctrine.

## Alternatives rejected

| Alternative | Why it is not selected |
|---|---|
| Put Codex hook configuration in `practice-cycle` | Couples a portable judgment to one volatile runtime. |
| Create a new correction skill | The judgment belongs to `practice-cycle`; the gap is lifecycle enforcement. |
| Use fixed correction phrases | Natural corrections vary and phrases create misses and ceremony. |
| Start with a model hook that blocks writes | It has no calibration evidence and can deadlock clarification turns. |
| Keep it in conversation only | It cannot survive compaction or guard a known unresolved correction. |

## Acceptance and reconsideration

The first binding is ready for review only when it proves:

- a material correction produces a receipt before a guarded mutation;
- an ordinary execution request does not create a receipt or block work;
- a platform missing `mutation_gate` reports `advisory`, not enforcement;
- a platform adapter obtains its state path from Workbench, and a separated
  vendor home receives no Rossovia intervention state;
- its platform record links current official documentation and keeps vendor
  configuration outside the portable method;
- stop behavior does not loop when the agent correctly needs a Principal reply.

Reopen this decision if two bindings cannot share the capability vocabulary, if
replay evidence shows the active-agent comparison misses material corrections,
or if a durable cross-session correction source becomes necessary. The last
case requires a separate form decision; this contract keeps session state
ephemeral.
