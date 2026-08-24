---
name: agent-tooling
description: >-
  Operate and tune the tool layer around coding agents such as Codex, Claude
  Code, and Cursor. Use when an agent must run a harness interactively or
  headlessly, select structured output and permissions, inspect the effective
  skills, hooks, MCP servers, plugins, rules, memories, or tools, cache
  version-specific capability evidence, compare normal and lean profiles, or
  remove tooling that makes agent work worse. Also use for requests about
  codex exec, claude -p, cursor-agent -p, coding-agent CLI automation, or agent
  setup bloat. Do not use for raw model API integration, multi-agent
  orchestration, portable cross-device setup, or a project workflow problem
  whose owning surface is still unknown.
---

# Agent Tooling

## Principle expression

**Primary:** P16
**Supporting:** P02, P09, P15

## Scope

Own one judgment: **for a concrete task and installed coding-agent harness,
which execution surface and tooling configuration lets the agent act with
sufficient capability and the least avoidable burden?**

The tool layer includes interactive and headless CLI entry points, effective
instructions and rules, skills, hooks, MCP servers, plugins, built-in tools,
permissions, profiles, generated memory, and the evidence exposed by the
harness. This skill may inspect, invoke, constrain, compare, or tune those
surfaces. Removing surplus tooling is one path, not the skill's whole purpose.

This package is independently usable. It carries a Sequence snapshot and a
zero-dependency local evidence script; it does not require Rossovia Workbench.
It does not create a universal wrapper around vendor CLIs or make one tool's
flags a cross-tool standard.

## Principle source

Use a host `principles/SEQUENCE.md` and matching interpretations when the host
declares them. Otherwise use `references/sequence.md`. Read exactly P16, P02,
P09, and P15 from the same source before a material invocation or tuning
decision.

## Start

Recover the actual action before choosing a tool form:

```text
Actor, task, workspace, and acceptance condition:
Installed harness, version, auth carrier, and ordinary entry:
Required tools, context, output, continuation, and permissions:
Effective skills, hooks, MCP, plugins, rules, and memory:
Observed failure, burden, or missing capability:
Human or managed-policy authority:
Smallest safe invocation or configuration change:
Observation that would reject it:
```

For a read-only request, stop after the capability or burden report. Do not
change user, project, or managed tooling without authority.

## Current capability evidence

When an exact command, flag, event, path, or configuration behavior matters,
read `references/tool-surfaces.md`. Check the installed CLI help and current
official documentation instead of relying on recalled vendor behavior.

Run the bundled script from this skill directory:

```text
node scripts/tooling-cache.mjs probe <codex|claude|cursor>
node scripts/tooling-cache.mjs show <codex|claude|cursor>
node scripts/tooling-cache.mjs put <tool> <capabilities.json>
node scripts/tooling-cache.mjs list
```

Use `--cache-dir <path>` only when an explicit cache location is needed. The
script otherwise selects the platform user-cache directory. It records raw
version/help evidence and validates a compact capability projection; it does
not infer semantic support from phrases in help output.

After consulting official documentation, write a small capabilities file using
the shape in `references/tool-surfaces.md`, then pass it to `put`. Never cache
credentials, authentication material, sessions, transcripts, repository
content, prompts, or user data. Treat a version mismatch or unrevalidated
documentation as stale evidence.

If the script or cache is unavailable, continue with activation-local help and
official sources. The cache improves repeated work but never becomes a
prerequisite or a second source of vendor truth.

## Choose the operating form

Select the smallest form that preserves the task:

| Form | Prefer when | Main caution |
|---|---|---|
| Interactive session | human steering, clarification, or iterative inspection is integral | accumulated context and discovered surfaces may confound a probe |
| Fresh headless run | one bounded task needs machine-readable completion | non-interactive mode may still retain write and shell capability |
| Resumed headless run | the next step genuinely depends on one prior harness session | session history can import irrelevant context and hidden state |
| Clean or bare diagnostic | testing whether discovered tooling causes a failure or cost | absence of project guidance is not proof that it is unnecessary |
| Isolated profile or workspace | comparing permissions, configuration, or mutations safely | the comparison must keep task, model, auth, and inputs equivalent |

Do not choose headless execution merely because it is automatable. Do not drive
an interactive TUI through a PTY when the installed harness exposes a supported
non-interactive surface that preserves the needed behavior.

## Core method

1. **Declare the real task envelope.** Name the workspace, input, required
   capabilities, output or artifact, authority, and failure consequence. Select
   a representative task rather than optimizing an empty harness.
2. **Observe the installed harness.** Establish version, auth carrier, effective
   configuration scopes, active surfaces, available entry points, and current
   failure evidence. Files on disk do not prove model-visible context or
   runtime capability.
3. **Select an operating form.** Choose interactive, fresh headless, resumed,
   clean, or isolated execution from the task envelope. Preserve the harness's
   own agent loop; a raw model API is not an equivalent substitute.
4. **Shape only the necessary surface.** Constrain workspace, tools, context,
   permissions, output, persistence, and continuation using current supported
   mechanics. Prefer argument vectors and files over interpolated shell
   strings. Keep credentials in the harness's existing auth path.
5. **Execute through the ordinary carrier.** Start read-only or in a disposable
   workspace unless mutation is required and authorized. Capture exit state,
   structured events, final output, artifacts, session identity, usage, and
   errors that the harness actually exposes.
6. **Interpret evidence without crossing authority.** Mechanical evidence can
   prove that a command ran, a file exists, or a schema matches. An agent or
   human judges whether the result is correct; the harness does not accept its
   own work.
7. **Tune from observed burden.** When skills, hooks, MCP, plugins, rules,
   memory, or tools interfere, follow the reduction path below. When the tool
   surface is insufficient, add or enable only the capability needed by the
   named task.
8. **Verify the resulting form.** Re-run the representative task and one
   boundary task through the intended ordinary entry. Record the capability
   retained, burden changed, residual uncertainty, rollback, and any current
   vendor fact that should remain only in the machine-local cache.

## Reduce net-negative tooling

Do not use installed count as evidence. For each candidate surface, record:

- the task it enables and when it reaches the agent;
- recent or reproducible value;
- context or choice interference;
- latency, failures, permission expansion, and maintenance cost; and
- removal risk and recovery path.

Choose among: keep available, keep always active, narrow or make on-demand,
disable reversibly, and delete. Unknown value is an investigation state, not
evidence for deletion. Prefer scope narrowing, profiles, allowlists, or
reversible disablement before removal.

For a material claim, run the same task, workspace state, model class, auth
carrier, permissions, input, and acceptance condition through normal and lean
variants. Compare correctness, missed capability, wrong tool or skill choice,
context, latency, token or cost evidence, hook failures, prompts, and recovery
effort. Fewer files or tokens alone do not prove a better agent.

## Boundaries

- `agent-environment` owns non-secret desired setup, cross-device migration,
  and reconciliation. This skill operates and tunes the installed tool layer.
- A project agent-workflow diagnostic owns a recurring task failure while its
  responsible surface is unknown. Enter this skill once tooling is the named
  owner.
- Context engineering owns the general timing and delivery of authoritative
  information; this skill applies the current harness mechanics for a concrete
  operation.
- Work Cell or another orchestrator owns task delegation and multi-agent
  composition. A headless harness invocation is an execution carrier, not an
  orchestration method.
- Model evaluation owns reusable claims about model or execution-profile
  capability. One successful CLI run is only task-local evidence.
- Tool-specific flags and precedence are volatile adapter facts. Check them
  live and keep reusable observations in the local cache, not in stable
  doctrine.

## Completion standard

The result is ready when it names the task envelope, installed harness and
version evidence, selected operating form, effective tooling surface,
permissions, invocation or tuning decision, observed completion evidence,
semantic verifier, boundary probe, rollback, and stale facts. A result that
merely lists commands, removes files, or shortens context without improving the
named action remains incomplete.
